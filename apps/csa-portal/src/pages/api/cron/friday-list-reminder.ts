/**
 * GET|POST /api/cron/friday-list-reminder   (cron-triggered, NOT user-facing)
 *
 * MONDAY afternoon nudge to TODD (and Todd only) to send the Friday wholesale
 * availability list to chefs. Friday-delivery ordering closes Thursday 7 AM ET
 * (lib/wholesale-order CUTOFF_LABEL_FRIDAY), so a Monday-afternoon reminder gives
 * chefs the whole window to order off the list Todd sends.
 *
 * This is a purely OPERATIONAL owner reminder — the SAME shape as
 * /api/cron/flex-list-reminder: one short Resend email to
 * todd@tinyseedfarmpgh.com, fail-soft, with a notification_log audit row. There
 * is NO gating flag (unlike the chef/flex member reminders in migration 0074) —
 * it only ever emails Todd, so there is no member-facing copy to approve first.
 *
 * The email carries the CURRENT Friday-delivery order count (wholesale_orders
 * where delivery_date = nextDeliveryFriday()), links to the chef orders page for
 * that Friday, and links to the wholesale hub (where Todd manages the pricing +
 * availability chefs see, and sends the list from).
 *
 * The Monday Ops page (/admin/monday, step 8a) queries the notification_log row
 * this writes (notification_type='friday_list_reminder') to show whether the
 * reminder has already fired today.
 *
 * Auth: same `Authorization: Bearer <CRON_SECRET>` guard as the other crons. The
 * pg_cron schedule (migration 0076) sends the bearer from Supabase Vault every
 * Monday at 19:30 UTC (~3:30 PM ET).
 */
import type { APIRoute } from 'astro';
import { CRON_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL } from 'astro:env/server';
import { supabaseAdmin } from '../../../lib/supabase';
import type { Json } from '../../../lib/database.types';
import { nextDeliveryFriday, prettyDeliveryDate, CUTOFF_LABEL_FRIDAY } from '../../../lib/wholesale-order';

export const prerender = false;

/** Owner-only operational nudge. Hardcoded — never member-facing. */
const REMINDER_TO = 'todd@tinyseedfarmpgh.com';
const ADMIN_ORIGIN = 'https://csa.tinyseedfarm.com';
/** Vendor accounts the PO importer creates — not chef orders, excluded from the count. */
const VENDOR_SOURCES = new Set(['harvie', 'market_wagon']);

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

/** Count the CHEF orders already placed for this Friday's delivery (exclude the
 *  Harvie / Market Wagon vendor imports and cancelled rows). Fail-soft → 0. */
async function countFridayOrders(deliveryDate: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('wholesale_orders')
    .select('id, source, status')
    .eq('delivery_date', deliveryDate);
  if (error) {
    console.error('[friday-list-reminder] order count query failed:', error.message);
    return 0;
  }
  return (data ?? []).filter(
    (o) => o.status !== 'cancelled' && !VENDOR_SOURCES.has((o.source ?? '').toLowerCase())
  ).length;
}

async function sendReminderEmail(
  fridayDate: string,
  orderCount: number,
): Promise<{ ok: boolean; detail: string }> {
  try {
    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
      return { ok: false, detail: 'resend_not_configured' };
    }

    const pretty = prettyDeliveryDate(fridayDate);
    const dateStr = new Intl.DateTimeFormat('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      timeZone: 'America/New_York',
    }).format(new Date());

    const ordersUrl = `${ADMIN_ORIGIN}/admin/wholesale/orders?date=${fridayDate}`;
    const hubUrl = `${ADMIN_ORIGIN}/admin/wholesale?date=${fridayDate}`;

    const subject = 'Send the Friday wholesale list';

    const text = [
      'Good afternoon Todd — time to send the Friday wholesale availability list to chefs.',
      '',
      `Friday delivery: ${pretty}. Ordering closes ${CUTOFF_LABEL_FRIDAY} ET.`,
      `So far ${orderCount} chef order${orderCount === 1 ? '' : 's'} for that Friday.`,
      '',
      `Update availability + send from the wholesale hub: ${hubUrl}`,
      `See who has ordered: ${ordersUrl}`,
      '',
      `— Tiny Seed CSA (${dateStr})`,
    ].join('\n');

    const html =
      `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;line-height:1.6">` +
      `<p style="font-size:18px;font-weight:700;margin:0 0 4px;color:#15803d">${escapeHtml(subject)}</p>` +
      `<p style="color:#6b7280;font-size:14px;margin:0 0 16px">${escapeHtml(dateStr)} · America/New_York</p>` +
      `<p style="margin:0 0 14px">Good afternoon Todd — time to send the Friday wholesale availability list to chefs.</p>` +
      `<p style="margin:0 0 6px">Friday delivery: <b>${escapeHtml(pretty)}</b>. Ordering closes <b>${escapeHtml(CUTOFF_LABEL_FRIDAY)} ET</b>.</p>` +
      `<p style="margin:0 0 14px;color:#4b5563">So far <b>${orderCount}</b> chef order${orderCount === 1 ? '' : 's'} for that Friday.</p>` +
      `<p style="margin:0 0 8px">` +
      `<a href="${escapeHtml(hubUrl)}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:8px 16px;border-radius:6px;font-weight:600;font-size:14px;margin-right:8px">Update availability &amp; send →</a>` +
      `<a href="${escapeHtml(ordersUrl)}" style="display:inline-block;color:#15803d;text-decoration:none;padding:8px 4px;font-weight:600;font-size:14px">See chef orders →</a>` +
      `</p>` +
      `<p style="color:#6b7280;font-size:13px;margin-top:24px">Automated weekly reminder from /api/cron/friday-list-reminder.</p>` +
      `</div>`;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: [REMINDER_TO], subject, text, html }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(`[friday-list-reminder] Resend send failed (HTTP ${resp.status}): ${detail.slice(0, 300)}`);
      return { ok: false, detail: `resend_http_${resp.status}` };
    }
    return { ok: true, detail: 'sent' };
  } catch (e) {
    console.error('[friday-list-reminder] sendReminderEmail threw (swallowed):', e);
    return { ok: false, detail: 'threw' };
  }
}

async function handle(request: Request): Promise<Response> {
  const denial = checkAuth(request);
  if (denial) return denial;

  const ranAt = new Date().toISOString();
  const fridayDate = nextDeliveryFriday();
  const orderCount = await countFridayOrders(fridayDate);
  const emailOutcome = await sendReminderEmail(fridayDate, orderCount);

  // Best-effort audit row — the Monday Ops page (step 8a) reads this to show
  // whether the reminder has already fired today. Fail-soft.
  try {
    await supabaseAdmin.from('notification_log').insert({
      channel: 'email',
      notification_type: 'friday_list_reminder',
      recipient: REMINDER_TO,
      status: emailOutcome.ok ? 'sent' : 'failed',
      provider: 'resend',
      subject: 'Send the Friday wholesale list',
      template: 'friday-list-reminder',
      error_message: emailOutcome.ok ? null : emailOutcome.detail,
      metadata: {
        ranAt,
        friday_date: fridayDate,
        order_count: orderCount,
      } as unknown as Json,
    });
  } catch (e) {
    console.error('[friday-list-reminder] notification_log insert threw (swallowed):', e);
  }

  return jsonResponse({
    ok: true,
    friday_date: fridayDate,
    order_count: orderCount,
    email_outcome: emailOutcome,
    ran_at: ranAt,
  });
}

export const GET: APIRoute = ({ request }) => handle(request);
export const POST: APIRoute = ({ request }) => handle(request);
