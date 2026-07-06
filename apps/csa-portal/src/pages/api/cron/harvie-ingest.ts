/**
 * GET|POST /api/cron/harvie-ingest   (cron-triggered, NOT user-facing)
 *
 * MONDAY auto-import of the weekly Harvie purchase order out of Gmail.
 *
 * Every Monday the Harvie PO email lands ~11:00–12:00 ET (sender
 * noreply@procurementexpress.com, subject "New Purchase Order <n> | Harvie
 * Pittsburgh …") with the PO PDF attached. Today Todd downloads it and uploads
 * it by hand at /admin/wholesale/import. This cron does that automatically:
 *
 *   1. Refresh a Gmail access token (OAuth refresh-token grant) and search the
 *      mailbox for the recent Harvie PO messages that carry a PDF attachment.
 *   2. Download each PDF, extract its text (unpdf — the SAME extraction the
 *      manual importer uses) and parse it (parseWholesalePdf → vendor 'harvie').
 *   3. Resolve product mappings from vendor_product_map (mapped lines get their
 *      product_id; unmapped lines commit with product_id NULL — the pack page
 *      renders off product_name either way).
 *   4. Commit via the SHARED lib with onExisting:'skip' — if an order already
 *      exists for that (account, delivery_date, PO#) it is LEFT UNTOUCHED. An
 *      automated job must never silently overwrite an order Todd may have
 *      hand-edited; the manual /admin/wholesale/import stays the deliberate
 *      "replace" path. Only genuinely NEW POs import.
 *   5. Notify Todd (Resend, fail-soft): a summary email when something imported
 *      (flagging any unmapped lines), a FAILED email when a hard error occurred,
 *      and NOTHING (log only) when nothing new was found — so a quiet Monday is
 *      quiet.
 *
 * FAIL-SOFT CONTRACT: a Gmail outage, a token-refresh failure, or one bad PDF
 * must NOT 500 the cron. Everything is caught; the run logs, best-effort
 * notifies, writes a notification_log row, and returns a 200 JSON summary. The
 * manual upload path is always available as the fallback.
 *
 * Auth: same `Authorization: Bearer <CRON_SECRET>` guard as
 * /api/cron/flex-list-reminder. The pg_cron schedule (migration 0074) sends the
 * bearer from Supabase Vault; running it 3× on Monday (11:45/12:45/1:45 ET) is
 * safe precisely because step 4 skips any PO that already imported.
 */
import type { APIRoute } from 'astro';
import {
  CRON_SECRET,
  RESEND_API_KEY,
  RESEND_FROM_EMAIL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN,
} from 'astro:env/server';
import { supabaseAdmin } from '../../../lib/supabase';
import type { Database, Json } from '../../../lib/database.types';
import { parseWholesalePdf, normalizeVendorKey, type ParsedOrder } from '../../../lib/wholesale-import';
import { commitWholesaleImport, type CommitLine } from '../../../lib/wholesale-import-commit';

export const prerender = false;

/** Where the import summary / failure alert goes. Operational, not member-facing. */
const NOTIFY_TO = 'todd@tinyseedfarmpgh.com';
const ADMIN_ORIGIN = 'https://csa.tinyseedfarm.com';
const ORDERS_LINK = `${ADMIN_ORIGIN}/admin/wholesale/orders`;
const MANUAL_IMPORT_LINK = `${ADMIN_ORIGIN}/admin/wholesale/import`;

/** Gmail search: recent Harvie PO messages that carry an attachment. */
const GMAIL_QUERY = 'from:procurementexpress.com subject:"Purchase Order" has:attachment newer_than:3d';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function checkAuth(request: Request): Response | null {
  const expected = CRON_SECRET;
  if (!expected) {
    return jsonResponse({ ok: false, error: 'cron_secret_not_configured' }, 500);
  }
  const header = request.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(header);
  const provided = m?.[1]?.trim() ?? '';
  if (provided.length === 0 || provided !== expected) {
    return jsonResponse({ ok: false, error: 'unauthorized' }, 401);
  }
  return null;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

function formatUsd(dollars: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(dollars);
}

/* ────────────────────────────────────────────────────────────────────
 * Gmail (OAuth refresh-token flow) — server-only, tokens never leave here.
 * ──────────────────────────────────────────────────────────────────── */

/** Exchange the long-lived refresh token for a short-lived access token. */
async function getGmailAccessToken(): Promise<string> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new Error('gmail_not_configured');
  }
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: GMAIL_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`token_refresh_failed_${resp.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await resp.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('token_refresh_no_access_token');
  return data.access_token;
}

interface GmailPart {
  mimeType?: string;
  filename?: string;
  body?: { attachmentId?: string; size?: number; data?: string };
  parts?: GmailPart[];
}
interface GmailMessage {
  id: string;
  payload?: GmailPart;
}

/** List message ids matching the Harvie query (most recent first). */
async function gmailSearch(accessToken: string): Promise<string[]> {
  const url =
    `https://gmail.googleapis.com/gmail/v1/users/me/messages` +
    `?q=${encodeURIComponent(GMAIL_QUERY)}&maxResults=25`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`gmail_search_failed_${resp.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await resp.json()) as { messages?: Array<{ id: string }> };
  return (data.messages ?? []).map((m) => m.id);
}

/** Fetch a full message (to walk its MIME tree for the PDF part). */
async function gmailGetMessage(accessToken: string, id: string): Promise<GmailMessage> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`gmail_message_failed_${resp.status}: ${detail.slice(0, 200)}`);
  }
  return (await resp.json()) as GmailMessage;
}

/** Depth-first find the FIRST application/pdf part that has an attachmentId. */
function findPdfAttachment(part: GmailPart | undefined): { attachmentId: string; filename: string } | null {
  if (!part) return null;
  const isPdf =
    (part.mimeType === 'application/pdf' ||
      (part.filename ?? '').toLowerCase().endsWith('.pdf')) &&
    part.body?.attachmentId;
  if (isPdf) {
    return { attachmentId: part.body!.attachmentId!, filename: part.filename ?? 'attachment.pdf' };
  }
  for (const child of part.parts ?? []) {
    const hit = findPdfAttachment(child);
    if (hit) return hit;
  }
  return null;
}

/** Download a specific attachment's bytes (base64url → Uint8Array). */
async function gmailGetAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string
): Promise<Uint8Array> {
  const url =
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}` +
    `/attachments/${attachmentId}`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`gmail_attachment_failed_${resp.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await resp.json()) as { data?: string };
  if (!data.data) throw new Error('gmail_attachment_empty');
  return new Uint8Array(Buffer.from(data.data, 'base64url'));
}

/* ────────────────────────────────────────────────────────────────────
 * Mapping resolution — mirror /import/parse.ts so mapped lines get a
 * product_id and unmapped lines commit with product_id NULL.
 * ──────────────────────────────────────────────────────────────────── */

async function resolveLines(parsed: ParsedOrder): Promise<CommitLine[]> {
  const { data: mapRows } = await supabaseAdmin
    .from('vendor_product_map')
    .select('vendor_key, product_id, product_name')
    .eq('vendor', parsed.vendor);
  const byNorm = new Map<string, { product_id: string | null; product_name: string | null }>();
  for (const r of (mapRows ?? []) as Array<{
    vendor_key: string; product_id: string | null; product_name: string | null;
  }>) {
    byNorm.set(normalizeVendorKey(r.vendor_key), { product_id: r.product_id, product_name: r.product_name });
  }

  const { data: prodRows } = await supabaseAdmin
    .from('wholesale_products')
    .select('id, name');
  const prodNameById = new Map(
    ((prodRows ?? []) as Array<{ id: string; name: string }>).map((p) => [p.id, p.name])
  );

  return parsed.lines.map((ln) => {
    const hit = byNorm.get(normalizeVendorKey(ln.vendor_key));
    const product_id = hit?.product_id ?? null;
    const product_name = product_id
      ? (prodNameById.get(product_id) ?? hit?.product_name ?? ln.raw_description)
      : ln.raw_description;
    return {
      vendor_key: ln.vendor_key,
      product_id,
      product_name,
      qty: ln.qty,
      unit_price_cents: ln.unit_price_cents,
    };
  });
}

/* ────────────────────────────────────────────────────────────────────
 * Per-PO outcome tracking + notification.
 * ──────────────────────────────────────────────────────────────────── */

interface ImportedPo {
  external_ref: string | null;
  delivery_date: string;
  total_amount: number;
  line_count: number;
  unmapped_count: number;
  unmapped_names: string[];
}

async function sendResend(subject: string, text: string, html: string): Promise<{ ok: boolean; detail: string }> {
  try {
    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) return { ok: false, detail: 'resend_not_configured' };
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: [NOTIFY_TO], subject, text, html }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(`[harvie-ingest] Resend send failed (HTTP ${resp.status}): ${detail.slice(0, 300)}`);
      return { ok: false, detail: `resend_http_${resp.status}` };
    }
    return { ok: true, detail: 'sent' };
  } catch (e) {
    console.error('[harvie-ingest] sendResend threw (swallowed):', e);
    return { ok: false, detail: 'threw' };
  }
}

function buildImportedEmail(imported: ImportedPo[], errors: string[]): { subject: string; text: string; html: string } {
  const totalLines = imported.reduce((n, p) => n + p.line_count, 0);
  const totalAmount = imported.reduce((n, p) => n + p.total_amount, 0);
  const refs = imported.map((p) => p.external_ref).filter(Boolean).join(', ') || '—';
  const subject =
    imported.length === 1
      ? `Harvie order imported — ${totalLines} lines, ${formatUsd(totalAmount)} (PO ${refs})`
      : `Harvie orders imported — ${imported.length} POs, ${totalLines} lines, ${formatUsd(totalAmount)}`;

  const textLines: string[] = ['A new Harvie purchase order imported automatically.', ''];
  const htmlBlocks: string[] = [];
  for (const p of imported) {
    textLines.push(`PO ${p.external_ref ?? '—'} · delivery ${p.delivery_date} · ${p.line_count} lines · ${formatUsd(p.total_amount)}`);
    let block =
      `<p style="margin:0 0 4px;font-weight:700">PO ${escapeHtml(p.external_ref ?? '—')} · delivery ${escapeHtml(p.delivery_date)}</p>` +
      `<p style="margin:0 0 8px;color:#4b5563;font-size:13px">${p.line_count} lines · ${escapeHtml(formatUsd(p.total_amount))}</p>`;
    if (p.unmapped_count > 0) {
      textLines.push(`  ⚠ ${p.unmapped_count} unmapped line(s): ${p.unmapped_names.join(', ')}`);
      textLines.push('    (they packed by name — map them on next manual import to remember.)');
      block +=
        `<p style="margin:0 0 8px;color:#b45309;font-size:13px">⚠ ${p.unmapped_count} unmapped line(s): ` +
        `${escapeHtml(p.unmapped_names.join(', '))} — packed by name; map them on the next manual import to remember.</p>`;
    }
    htmlBlocks.push(block);
    textLines.push('');
  }
  if (errors.length) {
    textLines.push('Some messages could not be processed:');
    for (const e of errors) textLines.push(`  • ${e}`);
    textLines.push('');
  }
  textLines.push(`Review: ${ORDERS_LINK}`);

  const html =
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6">` +
    `<p style="font-size:18px;font-weight:700;margin:0 0 12px;color:#15803d">${escapeHtml(subject)}</p>` +
    `<p style="margin:0 0 14px">A new Harvie purchase order imported automatically.</p>` +
    htmlBlocks.join('') +
    (errors.length
      ? `<p style="margin:14px 0 4px;font-weight:700;color:#b91c1c">Some messages could not be processed:</p><ul style="margin:0 0 12px;padding-left:20px">` +
        errors.map((e) => `<li style="color:#b91c1c;font-size:13px">${escapeHtml(e)}</li>`).join('') +
        `</ul>`
      : '') +
    `<a href="${ORDERS_LINK}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:8px 16px;border-radius:6px;font-weight:600;font-size:14px;margin-top:8px">Review wholesale orders →</a>` +
    `<p style="color:#6b7280;font-size:13px;margin-top:24px">Automated from /api/cron/harvie-ingest.</p>` +
    `</div>`;

  return { subject, text: textLines.join('\n'), html };
}

function buildFailedEmail(reason: string): { subject: string; text: string; html: string } {
  const subject = 'Harvie auto-import FAILED — action needed';
  const text =
    `The Monday Harvie auto-import could not complete.\n\n` +
    `Reason: ${reason}\n\n` +
    `Please import the PO manually — it still works: ${MANUAL_IMPORT_LINK}\n`;
  const html =
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6">` +
    `<p style="font-size:18px;font-weight:700;margin:0 0 12px;color:#b91c1c">${escapeHtml(subject)}</p>` +
    `<p style="margin:0 0 8px">The Monday Harvie auto-import could not complete.</p>` +
    `<p style="margin:0 0 14px;color:#4b5563"><b>Reason:</b> ${escapeHtml(reason)}</p>` +
    `<p style="margin:0 0 14px">Please import the PO manually — it still works:</p>` +
    `<a href="${MANUAL_IMPORT_LINK}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:8px 16px;border-radius:6px;font-weight:600;font-size:14px">Open manual import →</a>` +
    `<p style="color:#6b7280;font-size:13px;margin-top:24px">Automated from /api/cron/harvie-ingest.</p>` +
    `</div>`;
  return { subject, text, html };
}

async function logRun(
  status: 'sent' | 'failed',
  outcome: 'imported' | 'nothing' | 'error',
  detail: string | null,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await supabaseAdmin.from('notification_log').insert({
      channel: 'email',
      notification_type: 'harvie_auto_import',
      recipient: NOTIFY_TO,
      status,
      provider: 'resend',
      subject: `Harvie auto-import (${outcome})`,
      template: 'harvie-ingest',
      error_message: detail,
      metadata: metadata as unknown as Json,
    });
  } catch (e) {
    console.error('[harvie-ingest] notification_log insert threw (swallowed):', e);
  }
}

/* ────────────────────────────────────────────────────────────────────
 * Handler.
 * ──────────────────────────────────────────────────────────────────── */

async function handle(request: Request): Promise<Response> {
  const denial = checkAuth(request);
  if (denial) return denial;

  const ranAt = new Date().toISOString();
  const imported: ImportedPo[] = [];
  const skipped: string[] = [];       // PO refs already present
  const perMessageErrors: string[] = [];

  try {
    // 1. Gmail access + search.
    const accessToken = await getGmailAccessToken();
    const messageIds = await gmailSearch(accessToken);

    // 2. Process each message independently — one bad PDF must not abort the run.
    for (const id of messageIds) {
      try {
        const message = await gmailGetMessage(accessToken, id);
        const attachment = findPdfAttachment(message.payload);
        if (!attachment) {
          perMessageErrors.push(`Message ${id}: no PDF attachment found`);
          continue;
        }
        const bytes = await gmailGetAttachment(accessToken, id, attachment.attachmentId);
        const parsed = await parseWholesalePdf(bytes);

        // We only auto-ingest Harvie POs from this mailbox flow.
        if (parsed.vendor !== 'harvie') {
          perMessageErrors.push(`Message ${id} (${attachment.filename}): not a Harvie PO (detected ${parsed.vendor})`);
          continue;
        }
        // Idempotency needs a delivery_date; the (account, date, PO#) key needs it.
        if (!parsed.delivery_date) {
          perMessageErrors.push(`PO ${parsed.external_ref ?? '?'} (${attachment.filename}): no delivery date parsed`);
          continue;
        }

        const lines = await resolveLines(parsed);
        const result = await commitWholesaleImport(
          supabaseAdmin,
          {
            vendor: 'harvie',
            vendor_display: parsed.vendor_display,
            delivery_date: parsed.delivery_date,
            external_ref: parsed.external_ref,
            lines,
          },
          { onExisting: 'skip' }
        );

        if (!result.ok) {
          perMessageErrors.push(`PO ${parsed.external_ref ?? '?'}: commit ${result.error}${result.detail ? ` (${result.detail})` : ''}`);
          continue;
        }
        if (result.skipped) {
          // Already imported (a prior run this Monday, or a manual upload). No-op.
          skipped.push(parsed.external_ref ?? parsed.delivery_date);
          continue;
        }

        const unmappedNames = lines.filter((l) => !l.product_id).map((l) => l.product_name);
        imported.push({
          external_ref: parsed.external_ref,
          delivery_date: parsed.delivery_date,
          total_amount: result.total_amount,
          line_count: lines.length,
          unmapped_count: result.unmapped_count,
          unmapped_names: unmappedNames,
        });
      } catch (perMsg) {
        const reason = perMsg instanceof Error ? perMsg.message : String(perMsg);
        console.error(`[harvie-ingest] message ${id} failed (continuing):`, reason);
        perMessageErrors.push(`Message ${id}: ${reason}`);
      }
    }
  } catch (fatal) {
    // Gmail outage / token refresh failure / search failure — fail-soft.
    const reason = fatal instanceof Error ? fatal.message : String(fatal);
    console.error('[harvie-ingest] fatal (fail-soft, notifying):', reason);
    const mail = buildFailedEmail(reason);
    const outcome = await sendResend(mail.subject, mail.text, mail.html);
    await logRun('failed', 'error', reason, { ranAt, stage: 'fatal', email_outcome: outcome.detail });
    return jsonResponse({
      ok: true, // fail-soft: do not 500 the cron
      error: reason,
      imported: 0,
      skipped: 0,
      message_errors: perMessageErrors,
      email_outcome: outcome,
      ran_at: ranAt,
    });
  }

  // 3. Notify + log based on what happened.
  const metaBase = {
    ranAt,
    imported_refs: imported.map((p) => p.external_ref),
    skipped_refs: skipped,
    message_errors: perMessageErrors,
  };

  if (imported.length > 0) {
    const mail = buildImportedEmail(imported, perMessageErrors);
    const outcome = await sendResend(mail.subject, mail.text, mail.html);
    await logRun(outcome.ok ? 'sent' : 'failed', 'imported', outcome.ok ? null : outcome.detail, {
      ...metaBase, email_outcome: outcome.detail,
    });
    return jsonResponse({
      ok: true,
      imported: imported.length,
      skipped: skipped.length,
      imported_detail: imported,
      message_errors: perMessageErrors,
      email_outcome: outcome,
      ran_at: ranAt,
    });
  }

  if (perMessageErrors.length > 0) {
    // Nothing imported, but at least one message errored → surface it.
    const reason = perMessageErrors.join('; ');
    const mail = buildFailedEmail(reason);
    const outcome = await sendResend(mail.subject, mail.text, mail.html);
    await logRun('failed', 'error', reason, { ...metaBase, email_outcome: outcome.detail });
    return jsonResponse({
      ok: true,
      imported: 0,
      skipped: skipped.length,
      message_errors: perMessageErrors,
      email_outcome: outcome,
      ran_at: ranAt,
    });
  }

  // Nothing new (either no Harvie mail yet, or every PO already imported) → log only, no email noise.
  await logRun('sent', 'nothing', null, metaBase);
  return jsonResponse({
    ok: true,
    imported: 0,
    skipped: skipped.length,
    message_errors: [],
    email_outcome: { ok: true, detail: 'no_email_nothing_new' },
    ran_at: ranAt,
  });
}

export const GET: APIRoute = ({ request }) => handle(request);
export const POST: APIRoute = ({ request }) => handle(request);
