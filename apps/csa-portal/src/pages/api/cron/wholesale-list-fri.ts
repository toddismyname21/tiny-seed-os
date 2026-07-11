/**
 * GET|POST /api/cron/wholesale-list-fri   (cron-triggered, NOT user-facing)
 *
 * The FRIDAY-period twin of /api/cron/wholesale-list-wed — the same "the list is
 * open" fresh-sheet email but for FRIDAY delivery (cutoff Thursday 7 AM ET), with
 * every order link carrying ?day=fri so chefs land in the Friday-delivery flow.
 * Scheduled Tuesdays 14:00 UTC (~10:00 AM ET) per migration 0081, right after
 * the Wednesday cutoff clears.
 *
 * REVIEW → CONFIRM → SEND GATE (Todd, 2026-07-10): sends to chefs ONLY when BOTH
 *   1. the enabled flag `wholesale_list_fri_enabled` == 'true', AND
 *   2. Todd CONFIRMED this week's list: `fresh_sheet_confirmed_fri` == the
 *      computed target delivery date (set from the review page).
 * Enabled-but-unconfirmed at send time → no chef mail; email TODD ONLY with the
 * review link, log it, return { skipped:'unconfirmed' }.
 *
 * The email body + audience + send loop + audit + double-send guard live in the
 * SHARED lib/fresh-sheet.ts, so the copy is byte-identical to the review-page
 * preview and to "Confirm & send now". A cron run after a manual send-now is a
 * no-op (skipped:'already_sent').
 *
 * Auth: same Bearer CRON_SECRET guard; all emails fail-soft; notification_log
 * per outcome.
 */
import type { APIRoute } from 'astro';
import { CRON_SECRET } from 'astro:env/server';
import { supabaseAdmin } from '../../../lib/supabase';
import {
  PERIOD_CONFIG, readFlag, readSetting, sendFreshSheet,
  sendOwnerEmail, logOwnerRow, freshnessLine, lastProductChange, fetchActiveProducts,
  reviewPageUrl, escapeHtml,
} from '../../../lib/fresh-sheet';
import { prettyDeliveryDate } from '../../../lib/wholesale-order';

export const prerender = false;

const CFG = PERIOD_CONFIG.fri;

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

/** Email Todd (only) that the list was NOT sent because it wasn't confirmed. */
async function alertUnconfirmed(deliveryDate: string): Promise<void> {
  const label = prettyDeliveryDate(deliveryDate);
  const link = reviewPageUrl('fri');
  const [products, change] = await Promise.all([
    fetchActiveProducts(supabaseAdmin).catch(() => []),
    lastProductChange(supabaseAdmin),
  ]);
  const fresh = freshnessLine(products.length, change);
  const subject = 'Fresh sheet NOT sent — Friday list unconfirmed';
  const text = [
    `Heads up — the Friday fresh sheet did NOT go to chefs.`,
    ``,
    `You hadn't confirmed this week's list for ${label} delivery.`,
    fresh,
    ``,
    `Review + send now: ${link}`,
    ``,
    '— Tiny Seed CSA',
  ].join('\n');
  const html =
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6">` +
    `<p style="font-size:18px;font-weight:700;margin:0 0 6px;color:#b45309">${escapeHtml(subject)}</p>` +
    `<p style="margin:0 0 12px">The Friday fresh sheet did <b>not</b> go to chefs — you hadn't confirmed this week's list for <b>${escapeHtml(label)}</b> delivery.</p>` +
    `<p style="margin:0 0 14px;color:#4b5563">${escapeHtml(fresh)}</p>` +
    `<p style="margin:0 0 8px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#166534;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Review &amp; send now →</a></p>` +
    `<p style="color:#6b7280;font-size:13px;margin-top:22px">Automated from /api/cron/wholesale-list-fri.</p>` +
    `</div>`;
  const outcome = await sendOwnerEmail(subject, text, html);
  await logOwnerRow(
    supabaseAdmin, CFG.unconfirmedMarker, CFG.template, subject,
    outcome.ok ? 'sent' : 'failed', outcome.ok ? null : outcome.detail,
    { delivery_date: deliveryDate, active_products: products.length },
  );
}

async function handle(request: Request): Promise<Response> {
  const denial = checkAuth(request);
  if (denial) return denial;
  const ranAt = new Date().toISOString();

  // GATE 1 — deploy-safety enabled flag.
  if (!(await readFlag(supabaseAdmin, CFG.gateFlag))) {
    return jsonResponse({ ok: true, skipped: 'disabled', ran_at: ranAt });
  }

  const deliveryDate = CFG.nextDeliveryDate();

  // GATE 2 — Todd must have CONFIRMED this exact delivery date's list.
  const confirmedFor = await readSetting(supabaseAdmin, CFG.confirmKey);
  if (confirmedFor !== deliveryDate) {
    await alertUnconfirmed(deliveryDate);
    return jsonResponse({ ok: true, skipped: 'unconfirmed', delivery_date: deliveryDate, ran_at: ranAt });
  }

  // Both gates pass → the SHARED send (also enforces the double-send guard).
  const outcome = await sendFreshSheet(supabaseAdmin, 'fri');
  return jsonResponse(outcome);
}

export const GET: APIRoute = ({ request }) => handle(request);
export const POST: APIRoute = ({ request }) => handle(request);
