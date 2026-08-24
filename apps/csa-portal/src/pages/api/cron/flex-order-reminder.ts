/**
 * GET|POST /api/cron/flex-order-reminder   (cron-triggered, NOT user-facing)
 *
 * MONDAY nudge to Farm Flex members who have a positive balance but have NOT yet
 * placed a flex order for the week they can currently order for. Encourages them
 * to spend down their prepaid store credit before the window closes.
 *
 * Per active flex member:
 *   - resolve their pickup day → the week their order window is currently OPEN
 *     for (lib/flex-order currentOrderWeek, pickup-day-aware). If no window is
 *     open for them right now, skip (a "go order" nudge only makes sense while
 *     the window is open).
 *   - skip if they've already placed a (non-cancelled) flex order for that week.
 *   - skip if they've opted out of newsletters, or are a test address.
 *   - skip if their live Farm Flex balance (Shopify store credit) is ≤ 0.
 *   - otherwise send the reminder, with pickup-day-aware close wording
 *     (weekend-market members get a later cutoff).
 *
 * GATED: reads portal_settings 'flex_reminder_enabled'. Until 'true' the endpoint
 * returns { ok:true, skipped:'disabled' } WITHOUT sending — deploy-safe before
 * Todd approves the copy + arms the flag.
 *
 * COPY/TIMING — RESOLVED 2026-08-22 (verified by RUNNING the code, not reading
 * it). An older note here warned the copy said "closes Tuesday 8 AM" while the
 * real cutoff was Monday 7 AM. That is NO LONGER TRUE and the warning itself
 * caused a false alarm, so it is replaced with the verified behaviour:
 *
 *   - The copy is not hardcoded. Subject + body both interpolate
 *     `closeLabel(week, pickupDay)`, which returns "Monday 7 AM" for the
 *     Wednesday run and "Thursday 7 AM" for weekend-market members. The stated
 *     deadline therefore cannot drift from lib/flex-order's real cutoff.
 *   - It never nudges after the window shuts. Simulated Mon 08:00 ET (past the
 *     07:00 cutoff): `currentOrderWeek` rolls to the FOLLOWING week and
 *     `isWindowOpen` returns false, so the member is skipped (skippedWindow).
 *     At Mon 06:00 ET the window is still open and the send proceeds.
 *
 * If you change the cutoff, change it in lib/flex-order — both the gate and the
 * wording read from there, so they stay in step automatically.
 *
 * Auth: Bearer CRON_SECRET. Resend send is fail-soft; a notification_log row
 * records each member's outcome.
 */
import type { APIRoute } from 'astro';
import { CRON_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL } from 'astro:env/server';
import { supabaseAdmin } from '../../../lib/supabase';
import type { Database, Json } from '../../../lib/database.types';
import { currentOrderWeek, isWindowOpen, isWeekendMarket, closeLabel, type PickupDay } from '../../../lib/flex-order';
import { getFlexBalance, formatFlexMoney } from '../../../lib/flex';
import { TEST_EXCLUDES } from '../../../lib/campaign';

export const prerender = false;

const ADMIN_ORIGIN = 'https://csa.tinyseedfarm.com';
const FLEX_LINK = `${ADMIN_ORIGIN}/account/flex-order`;
const REPLY_TO = ['todd@tinyseedfarmpgh.com', 'tinyseedfleurs@gmail.com'];

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

async function readFlag(key: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('portal_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) {
    console.error(`[flex-order-reminder] portal_settings read failed (${key}):`, error.message);
    return false;
  }
  return (data as { value: string | null } | null)?.value === 'true';
}

/* ── EXACT COPY (Todd-approved; weekend variant swaps the close/delivery phrase) ── */
function subjectFor(weekend: boolean, week: string): string {
  return weekend
    ? `Your Farm Flex window closes ${closeLabel(week, 'Sat')} this week`
    : `Your Farm Flex window closes ${closeLabel(week, null)} this week`;
}
function bodyText(balanceStr: string, weekend: boolean, week: string): string {
  const openLine = weekend
    ? `Hi! This week's Farm Flex list is open — orders close ${closeLabel(week, 'Sat')} for this weekend's market pickup.`
    : `Hi! This week's Farm Flex list is open — orders close ${closeLabel(week, null)} for Wednesday delivery.`;
  return (
    `${openLine}\n\n` +
    `You have ${balanceStr} available.\n\n` +
    `Browse this week's list: ${FLEX_LINK}\n` +
    '— Tiny Seed Farm'
  );
}
function bodyHtml(balanceStr: string, weekend: boolean, week: string): string {
  const openLine = weekend
    ? `Hi! This week's Farm Flex list is open — orders close ${closeLabel(week, 'Sat')} for this weekend's market pickup.`
    : `Hi! This week's Farm Flex list is open — orders close ${closeLabel(week, null)} for Wednesday delivery.`;
  return (
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;line-height:1.6;font-size:15px">` +
    `<p style="margin:0 0 14px">${escapeHtml(openLine)}</p>` +
    `<p style="margin:0 0 14px">You have <b>${escapeHtml(balanceStr)}</b> available.</p>` +
    `<p style="margin:0 0 14px">Browse this week's list: <a href="${FLEX_LINK}" style="color:#166534;font-weight:600">${FLEX_LINK}</a></p>` +
    `<p style="margin:0">— Tiny Seed Farm</p>` +
    `</div>`
  );
}

async function sendOne(to: string, text: string, html: string, subject: string): Promise<{ ok: boolean; detail: string; messageId?: string }> {
  try {
    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) return { ok: false, detail: 'resend_not_configured' };
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: [to], reply_to: REPLY_TO, subject, text, html }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(`[flex-order-reminder] Resend failed (HTTP ${resp.status}): ${detail.slice(0, 200)}`);
      return { ok: false, detail: `resend_http_${resp.status}` };
    }
    // Capture the Resend message id so DELIVERY (not just acceptance) can be
    // audited later via the Resend API — added 2026-07-26 after a verizon.net
    // member reported never receiving flex emails and the log rows had no
    // provider_message_id to trace (Kathleen Ganster case).
    let messageId = '';
    try {
      const data = (await resp.json()) as { id?: string };
      messageId = data.id ?? '';
    } catch { /* body already consumed or not json — id stays '' */ }
    return { ok: true, detail: 'sent', messageId };
  } catch (e) {
    console.error('[flex-order-reminder] sendOne threw (swallowed):', e);
    return { ok: false, detail: 'threw' };
  }
}

async function logRow(
  memberId: string,
  customerId: string,
  recipient: string,
  status: 'sent' | 'failed',
  detail: string | null,
  metadata: Record<string, unknown>,
  providerMessageId?: string
): Promise<void> {
  try {
    await supabaseAdmin.from('notification_log').insert({
      member_id: memberId,
      customer_id: customerId,
      channel: 'email',
      notification_type: 'flex_order_reminder',
      recipient,
      status,
      provider: 'resend',
      provider_message_id: providerMessageId || null,
      subject: 'Farm Flex order reminder',
      template: 'flex-order-reminder',
      error_message: detail,
      metadata: metadata as unknown as Json,
    });
  } catch (e) {
    console.error('[flex-order-reminder] notification_log insert threw (swallowed):', e);
  }
}

async function handle(request: Request): Promise<Response> {
  const denial = checkAuth(request);
  if (denial) return denial;
  const ranAt = new Date().toISOString();

  if (!(await readFlag('flex_reminder_enabled'))) {
    return jsonResponse({ ok: true, skipped: 'disabled', ran_at: ranAt });
  }

  const now = Date.now();

  // Active flex members + customer + pickup day.
  type MemberRow = {
    id: string;
    customer_id: string;
    customer: { email: string | null; contact_name: string | null; is_active: boolean } | null;
    pickup_location: { day_of_week: PickupDay } | null;
  };
  const { data: memberData, error: mErr } = await supabaseAdmin
    .from('members')
    .select(`
      id,
      customer_id,
      customer:customers!inner ( email, contact_name, is_active ),
      pickup_location:pickup_locations ( day_of_week )
    `)
    // KNOWN GAP (2026-08-21): flex ELIGIBILITY is now "store credit > 0 OR a
    // live flex share row" (lib/flex-order.ts `decideFlexEligibility`), but
    // this reminder still only emails members with a flex SHARE row. A member
    // who holds Farm Flex credit without one CAN order — they just don't get
    // the weekly nudge. Closing this needs a cheap way to list credit holders:
    // credit lives in Shopify, and resolving it per member here would mean one
    // Shopify round-trip per candidate on every cron run. `flex_transactions`
    // is not a usable proxy — it records the loyalty-bonus split and debits,
    // not principal, so several real credit holders have no row at all.
    .eq('share_type', 'flex')
    .eq('status', 'active')
    .overrideTypes<MemberRow[], { merge: false }>();
  if (mErr) {
    console.error('[flex-order-reminder] members query failed:', mErr.message);
    return jsonResponse({ ok: false, error: 'members_query_failed', detail: mErr.message }, 500);
  }
  const members = (memberData ?? []).filter((m) => m.customer && m.customer.is_active !== false);
  const memberIds = members.map((m) => m.id);

  // Opt-out set (newsletter_opt_in=false on the member's preferences row).
  const optedOut = new Set<string>();
  if (memberIds.length > 0) {
    const { data: prefRows } = await supabaseAdmin
      .from('member_preferences')
      .select('member_id, newsletter_opt_in')
      .in('member_id', memberIds);
    for (const p of (prefRows ?? []) as Array<{ member_id: string; newsletter_opt_in: boolean }>) {
      if (p.newsletter_opt_in === false) optedOut.add(p.member_id);
    }
  }

  // Compute each member's current order week; collect the distinct weeks so we
  // can batch the "already ordered?" lookup.
  const memberWeek = new Map<string, string>();
  const weekSet = new Set<string>();
  for (const m of members) {
    const pickupDay = m.pickup_location?.day_of_week ?? null;
    const week = currentOrderWeek(now, pickupDay);
    memberWeek.set(m.id, week);
    weekSet.add(week);
  }

  // Members who already have a non-cancelled flex order for their week.
  const orderedKey = new Set<string>(); // `${member_id}|${week}`
  if (memberIds.length > 0 && weekSet.size > 0) {
    const { data: orderRows } = await supabaseAdmin
      .from('flex_orders')
      .select('member_id, week_starting, status')
      .in('member_id', memberIds)
      .in('week_starting', Array.from(weekSet));
    for (const o of (orderRows ?? []) as Array<{ member_id: string; week_starting: string; status: string }>) {
      if (o.status !== 'cancelled' && o.status !== 'refunded') {
        orderedKey.add(`${o.member_id}|${o.week_starting}`);
      }
    }
  }

  let sent = 0;
  let failed = 0;
  let skippedWindow = 0;
  let skippedOrdered = 0;
  let skippedOptOut = 0;
  let skippedNoBalance = 0;
  let skippedNoEmail = 0;

  for (const m of members) {
    const email = (m.customer?.email ?? '').trim();
    if (!email) { skippedNoEmail += 1; continue; }
    if (TEST_EXCLUDES.has(email.toLowerCase())) { skippedNoEmail += 1; continue; }
    if (optedOut.has(m.id)) { skippedOptOut += 1; continue; }

    const pickupDay = m.pickup_location?.day_of_week ?? null;
    const week = memberWeek.get(m.id)!;

    // Only nudge while the member's window is actually open.
    if (!isWindowOpen(week, now, pickupDay)) { skippedWindow += 1; continue; }
    // Already ordered for that week → no nudge.
    if (orderedKey.has(`${m.id}|${week}`)) { skippedOrdered += 1; continue; }

    // Live Farm Flex balance (Shopify). Only email members with money to spend.
    const balance = await getFlexBalance(email);
    if (!balance || balance.total <= 0) { skippedNoBalance += 1; continue; }

    const weekend = isWeekendMarket(pickupDay);
    const balanceStr = formatFlexMoney(balance.total, balance.currency);
    const outcome = await sendOne(email, bodyText(balanceStr, weekend, week), bodyHtml(balanceStr, weekend, week), subjectFor(weekend, week));
    if (outcome.ok) sent += 1; else failed += 1;
    await logRow(m.id, m.customer_id, email, outcome.ok ? 'sent' : 'failed', outcome.ok ? null : outcome.detail, {
      ranAt, week, weekend, balance: balance.total,
    }, outcome.messageId);
  }

  return jsonResponse({
    ok: true,
    flex_members: members.length,
    sent,
    failed,
    skipped_window_closed: skippedWindow,
    skipped_already_ordered: skippedOrdered,
    skipped_opted_out: skippedOptOut,
    skipped_no_balance: skippedNoBalance,
    skipped_no_email: skippedNoEmail,
    ran_at: ranAt,
  });
}

export const GET: APIRoute = ({ request }) => handle(request);
export const POST: APIRoute = ({ request }) => handle(request);
