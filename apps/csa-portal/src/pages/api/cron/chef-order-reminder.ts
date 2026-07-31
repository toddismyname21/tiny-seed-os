/**
 * GET|POST /api/cron/chef-order-reminder   (cron-triggered, NOT user-facing)
 *
 * MONDAY nudge to wholesale (chef) accounts that have NOT yet placed an order
 * for this Wednesday's delivery. The ordering cutoff is Tuesday 7 AM ET
 * (lib/wholesale-order CUTOFF_LABEL), so a Monday-morning reminder gives chefs
 * a full day to order before it closes.
 *
 * Recipients (per account):
 *   - resolved via resolveOrderRecipients(contacts, account.email): every
 *     wholesale_account_contacts row flagged receives_orders, else the legacy
 *     account email. An account with NO order recipient is skipped (this also
 *     naturally excludes the vendor accounts — Harvie / Market Wagon — created
 *     by the PO importer, which carry no order contacts).
 *   - EXCLUDING accounts that already have a wholesale_orders row for this
 *     Wednesday (they've ordered — no nudge).
 *   - EXCLUDING test addresses (TEST_EXCLUDES) and the known vendor display
 *     names, defensively.
 * One email per account (all its order recipients on a single send).
 *
 * GATED: reads portal_settings key 'chef_reminder_enabled'. Until it is 'true'
 * the endpoint returns { ok:true, skipped:'disabled' } WITHOUT sending, so this
 * can deploy safely before Todd approves the copy + flips the flag.
 *
 * Auth: same Bearer CRON_SECRET guard as the other crons. Resend send is
 * fail-soft; a notification_log row records each account's outcome.
 */
import type { APIRoute } from 'astro';
import { CRON_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL } from 'astro:env/server';
import { supabaseAdmin } from '../../../lib/supabase';
import type { Database, Json } from '../../../lib/database.types';
import { currentDeliveryWednesday } from '../../../lib/wholesale-order';
import { resolveOrderRecipients, type WholesaleContact } from '../../../lib/wholesale-contacts';
import { TEST_EXCLUDES } from '../../../lib/campaign';

export const prerender = false;

const ADMIN_ORIGIN = 'https://csa.tinyseedfarm.com';
/** Replies land in a monitored human inbox (Todd + the CSA staff inbox). */
const REPLY_TO = ['todd@tinyseedfarmpgh.com', 'tinyseedfleurs@gmail.com'];
/** Vendor accounts the PO importer creates — never a chef-reminder recipient. */
const VENDOR_ACCOUNT_NAMES = new Set(['harvie', 'market wagon']);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function checkAuth(request: Request): Response | null {
  const expected = CRON_SECRET;
  if (!expected) return jsonResponse({ ok: false, error: 'cron_secret_not_configured' }, 500);
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

/** Read a portal_settings flag; true only when the stored value === 'true'. */
async function readFlag(key: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('portal_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) {
    console.error(`[chef-order-reminder] portal_settings read failed (${key}):`, error.message);
    return false;
  }
  return (data as { value: string | null } | null)?.value === 'true';
}

/* ── EXACT COPY (Todd-approved; do not improvise) ──────────────────────── */
const SUBJECT = 'Ordering for Wednesday closes Tuesday 7 AM';
function bodyText(orderUrl: string): string {
  return (
    "Good morning — a quick reminder that orders for this Wednesday's delivery close Tuesday at 7 AM.\n\n" +
    `Your order page: ${orderUrl}\n\n` +
    'Reply to this email with any questions.\n' +
    '— Tiny Seed Farm'
  );
}
function bodyHtml(orderUrl: string): string {
  return (
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;line-height:1.6;font-size:15px">` +
    `<p style="margin:0 0 14px">Good morning — a quick reminder that orders for this Wednesday's delivery close Tuesday at 7 AM.</p>` +
    `<p style="margin:0 0 14px">Your order page: <a href="${escapeHtml(orderUrl)}" style="color:#166534;font-weight:600">${escapeHtml(orderUrl)}</a></p>` +
    `<p style="margin:0 0 14px">Reply to this email with any questions.</p>` +
    `<p style="margin:0">— Tiny Seed Farm</p>` +
    `</div>`
  );
}

async function sendOne(to: string[], text: string, html: string): Promise<{ ok: boolean; detail: string }> {
  try {
    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) return { ok: false, detail: 'resend_not_configured' };
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM_EMAIL, to, reply_to: REPLY_TO, subject: SUBJECT, text, html }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(`[chef-order-reminder] Resend failed (HTTP ${resp.status}): ${detail.slice(0, 200)}`);
      return { ok: false, detail: `resend_http_${resp.status}` };
    }
    return { ok: true, detail: 'sent' };
  } catch (e) {
    console.error('[chef-order-reminder] sendOne threw (swallowed):', e);
    return { ok: false, detail: 'threw' };
  }
}

async function logRow(recipient: string, status: 'sent' | 'failed', detail: string | null, metadata: Record<string, unknown>): Promise<void> {
  try {
    await supabaseAdmin.from('notification_log').insert({
      channel: 'email',
      notification_type: 'chef_order_reminder',
      recipient,
      status,
      provider: 'resend',
      subject: SUBJECT,
      template: 'chef-order-reminder',
      error_message: detail,
      metadata: metadata as unknown as Json,
    });
  } catch (e) {
    console.error('[chef-order-reminder] notification_log insert threw (swallowed):', e);
  }
}

async function handle(request: Request): Promise<Response> {
  const denial = checkAuth(request);
  if (denial) return denial;
  const ranAt = new Date().toISOString();

  // GATE — deploy-safe until Todd approves the copy + arms the flag.
  if (!(await readFlag('chef_reminder_enabled'))) {
    return jsonResponse({ ok: true, skipped: 'disabled', ran_at: ranAt });
  }

  const deliveryDate = currentDeliveryWednesday();

  // Accounts + which already ordered for this Wednesday + their contacts.
  //
  // AUDIENCE (Todd's explicit call, 2026-07-06): "the overall list — anyone
  // who has not ordered yet." Every account with an order token, minus those
  // that ALREADY have an order for this delivery date (excluded further down
  // via skipped_already_ordered), minus vendor + test accounts.
  // NOTE: no `.eq('status','active')` — 55 of 56 prod accounts are
  // status='draft' (the field was never used operationally), so filtering on
  // it made the first armed run consider 0 accounts.
  type Acct = { id: string; restaurant_name: string; email: string | null; order_token: string | null; status: string };
  const { data: acctData, error: acctErr } = await supabaseAdmin
    .from('wholesale_accounts')
    .select('id, restaurant_name, email, order_token, status')
    .not('order_token', 'is', null)
    .overrideTypes<Acct[], { merge: false }>();
  if (acctErr) {
    console.error('[chef-order-reminder] accounts query failed:', acctErr.message);
    return jsonResponse({ ok: false, error: 'accounts_query_failed', detail: acctErr.message }, 500);
  }
  const accounts = (acctData ?? []).filter(
    (a) => a.order_token && !VENDOR_ACCOUNT_NAMES.has(a.restaurant_name.trim().toLowerCase())
  );
  const accountIds = accounts.map((a) => a.id);

  // Accounts that already have an order for this Wednesday (any non-cancelled).
  const orderedSet = new Set<string>();
  if (accountIds.length > 0) {
    const { data: ordRows } = await supabaseAdmin
      .from('wholesale_orders')
      .select('account_id, status')
      .eq('delivery_date', deliveryDate)
      .in('account_id', accountIds);
    for (const o of (ordRows ?? []) as Array<{ account_id: string | null; status: string }>) {
      if (o.account_id && o.status !== 'cancelled') orderedSet.add(o.account_id);
    }
  }

  // Contacts by account.
  const contactsByAccount = new Map<string, WholesaleContact[]>();
  if (accountIds.length > 0) {
    const { data: contactRows } = await supabaseAdmin
      .from('wholesale_account_contacts')
      .select('account_id, email, name, receives_orders, receives_invoices')
      .in('account_id', accountIds);
    for (const c of (contactRows ?? []) as Array<{
      account_id: string | null; email: string; name: string | null;
      receives_orders: boolean; receives_invoices: boolean;
    }>) {
      if (!c.account_id) continue;
      const list = contactsByAccount.get(c.account_id) ?? [];
      list.push({ email: c.email, name: c.name, receives_orders: c.receives_orders, receives_invoices: c.receives_invoices });
      contactsByAccount.set(c.account_id, list);
    }
  }

  let sent = 0;
  let failed = 0;
  let skippedOrdered = 0;
  let skippedNoRecipient = 0;
  const results: Array<{ account: string; to: string[]; outcome: string }> = [];

  for (const acct of accounts) {
    if (orderedSet.has(acct.id)) { skippedOrdered += 1; continue; }

    const recipients = resolveOrderRecipients(contactsByAccount.get(acct.id) ?? [], acct.email)
      .filter((e) => !TEST_EXCLUDES.has(e.trim().toLowerCase()));
    if (recipients.length === 0) { skippedNoRecipient += 1; continue; }

    const orderUrl = `${ADMIN_ORIGIN}/order/${acct.order_token}`;
    const outcome = await sendOne(recipients, bodyText(orderUrl), bodyHtml(orderUrl));
    if (outcome.ok) sent += 1; else failed += 1;
    await logRow(recipients.join(','), outcome.ok ? 'sent' : 'failed', outcome.ok ? null : outcome.detail, {
      ranAt, account_id: acct.id, restaurant_name: acct.restaurant_name, delivery_date: deliveryDate,
    });
    results.push({ account: acct.restaurant_name, to: recipients, outcome: outcome.detail });
  }

  return jsonResponse({
    ok: true,
    delivery_date: deliveryDate,
    accounts_considered: accounts.length,
    sent,
    failed,
    skipped_already_ordered: skippedOrdered,
    skipped_no_recipient: skippedNoRecipient,
    results,
    ran_at: ranAt,
  });
}

export const GET: APIRoute = ({ request }) => handle(request);
export const POST: APIRoute = ({ request }) => handle(request);
