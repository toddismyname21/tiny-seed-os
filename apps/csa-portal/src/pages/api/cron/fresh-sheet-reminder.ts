/**
 * GET|POST /api/cron/fresh-sheet-reminder?period=wed|fri  (cron-triggered)
 *
 * The REMINDER half of the wholesale fresh-sheet REVIEW → CONFIRM → SEND gate
 * (Todd, 2026-07-10: "I should get a reminder and be able to update and confirm
 * before send."). ~4 PM ET the DAY BEFORE each list's scheduled chef send, this
 * emails TODD ONLY a nudge to review + confirm this week's list, with the live
 * freshness line (active product count + last product change) and a deep link
 * to the review page.
 *
 *   ?period=wed  → THURSDAYS 20:00 UTC (~4 PM ET). The Wednesday-period fresh
 *                  sheet goes to chefs FRIDAY 8:30 AM ET (the next day).
 *   ?period=fri  → MONDAYS 20:00 UTC (~4 PM ET). The Friday-period fresh sheet
 *                  goes to chefs TUESDAY 10:00 AM ET (the next day).
 *
 * This SUPERSEDES the old /api/cron/friday-list-reminder (Mon 19:30 UTC), whose
 * pg_cron job migration 0082 unschedules.
 *
 * Purely operational OWNER reminder — like the old friday-list-reminder it emails
 * only todd@tinyseedfarmpgh.com, so there is NO gating flag (no member-facing
 * copy to approve). Fail-soft Resend; a notification_log row (fresh_sheet_
 * reminder_<period>) records each fire — the admin-home TodayFlow reads it.
 *
 * Auth: same Bearer CRON_SECRET guard as the other crons. pg_cron sends the
 * bearer from Supabase Vault (migration 0082).
 */
import type { APIRoute } from 'astro';
import { CRON_SECRET } from 'astro:env/server';
import { supabaseAdmin } from '../../../lib/supabase';
import {
  PERIOD_CONFIG, isPeriod, lastProductChange, fetchActiveProducts,
  freshnessLine, reviewPageUrl, sendOwnerEmail, logOwnerRow, escapeHtml,
} from '../../../lib/fresh-sheet';
import { prettyDeliveryDate } from '../../../lib/wholesale-order';

export const prerender = false;

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

async function handle(request: Request): Promise<Response> {
  const denial = checkAuth(request);
  if (denial) return denial;

  const periodParam = new URL(request.url).searchParams.get('period') ?? '';
  if (!isPeriod(periodParam)) {
    return jsonResponse({ ok: false, error: 'invalid_period', hint: 'period must be wed or fri' }, 400);
  }
  const cfg = PERIOD_CONFIG[periodParam];
  const ranAt = new Date().toISOString();

  const deliveryDate = cfg.nextDeliveryDate();
  const label = prettyDeliveryDate(deliveryDate);
  const [products, change] = await Promise.all([
    fetchActiveProducts(supabaseAdmin).catch(() => []),
    lastProductChange(supabaseAdmin),
  ]);
  const fresh = freshnessLine(products.length, change);
  const link = reviewPageUrl(periodParam);
  const dayWord = cfg.weekdayWord; // 'Wednesday' | 'Friday'

  const subject = `Review & confirm the ${dayWord} fresh sheet`;
  const text = [
    `The ${dayWord} fresh sheet goes to chefs tomorrow (${cfg.sendWhenLabel} ET).`,
    ``,
    `Delivery: ${label}. Ordering closes ${cfg.cutoffLabel} ET.`,
    fresh,
    ``,
    `Review & confirm (or update the list first): ${link}`,
    ``,
    `If you don't confirm, the list will NOT be sent — you'll get a heads-up instead.`,
    ``,
    '— Tiny Seed CSA',
  ].join('\n');
  const html =
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6">` +
    `<p style="font-size:18px;font-weight:700;margin:0 0 6px;color:#15803d">${escapeHtml(subject)}</p>` +
    `<p style="margin:0 0 12px">The <b>${escapeHtml(dayWord)}</b> fresh sheet goes to chefs <b>tomorrow (${escapeHtml(cfg.sendWhenLabel)} ET)</b>.</p>` +
    `<p style="margin:0 0 4px">Delivery: <b>${escapeHtml(label)}</b>. Ordering closes <b>${escapeHtml(cfg.cutoffLabel)} ET</b>.</p>` +
    `<p style="margin:0 0 14px;color:#4b5563">${escapeHtml(fresh)}</p>` +
    `<p style="margin:0 0 8px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Review &amp; confirm →</a></p>` +
    `<p style="margin:12px 0 0;color:#6b7280;font-size:13px">If you don't confirm, the list will NOT be sent — you'll get a heads-up instead.</p>` +
    `<p style="color:#6b7280;font-size:13px;margin-top:18px">Automated from /api/cron/fresh-sheet-reminder?period=${escapeHtml(periodParam)}.</p>` +
    `</div>`;

  const outcome = await sendOwnerEmail(subject, text, html);
  await logOwnerRow(
    supabaseAdmin, cfg.reminderMarker, cfg.template, subject,
    outcome.ok ? 'sent' : 'failed', outcome.ok ? null : outcome.detail,
    { ranAt, period: periodParam, delivery_date: deliveryDate, active_products: products.length },
  );

  return jsonResponse({
    ok: true, period: periodParam, delivery_date: deliveryDate,
    active_products: products.length, email_outcome: outcome, ran_at: ranAt,
  });
}

export const GET: APIRoute = ({ request }) => handle(request);
export const POST: APIRoute = ({ request }) => handle(request);
