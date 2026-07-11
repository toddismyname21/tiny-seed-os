/**
 * POST /api/admin/wholesale/fresh-sheet/confirm   (admin only)
 *
 * The CONFIRM half of the wholesale fresh-sheet REVIEW → CONFIRM → SEND gate
 * (Todd, 2026-07-10: "I should get a reminder and be able to update and confirm
 * before send."). Called by the two buttons on /admin/wholesale/fresh-sheet:
 *
 *   - "Confirm — send on schedule"  → send_now = false
 *       Marks THIS period's list confirmed for the current target delivery date
 *       by upserting portal_settings `fresh_sheet_confirmed_<period>` = that
 *       date. The cron then sends on schedule (it only mails chefs when this
 *       key == its computed target date AND the enabled flag is on).
 *
 *   - "Confirm & send NOW"          → send_now = true
 *       Marks confirmed AND fires the send immediately through the SHARED
 *       lib/fresh-sheet.ts sendFreshSheet — the exact same audience, copy,
 *       per-account logging, and double-send guard the cron uses. Because chef
 *       sends stay gated by BOTH the enabled flag AND confirmation, send-now
 *       also respects the enabled flag: if sending is turned off it confirms but
 *       does not mail (redirect ?sent=disabled), so Todd flips the flag first.
 *
 * The send uses the SERVICE-ROLE client (account/contact tables are admin-only
 * RLS, and the send loop mirrors the cron exactly). The portal_settings write
 * also goes through the service-role client — the endpoint is already
 * requireAdmin + isSameOriginPost gated.
 *
 * On success: 303 → /admin/wholesale/fresh-sheet?period=<>&confirmed=1[&sent=<>]
 * On failure: 303 → /admin/wholesale/fresh-sheet?period=<>&error=<code>
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../../lib/onboarding';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { isYMD } from '../../../../../lib/wholesale-order';
import { PERIOD_CONFIG, isPeriod, readFlag, sendFreshSheet, type Period } from '../../../../../lib/fresh-sheet';

export const prerender = false;

function backTo(period: string, params: Record<string, string>): string {
  const qs = new URLSearchParams({ period, ...params }).toString();
  return `/admin/wholesale/fresh-sheet?${qs}`;
}

const Body = z.object({
  period: z.string().refine(isPeriod, 'invalid_period'),
  delivery_date: z.string().refine(isYMD, 'invalid_date'),
  send_now: z.boolean(),
});

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirect(backTo('wed', { error: 'invalid_input' }), 303);
  }

  const parsed = Body.safeParse({
    period: String(form.get('period') ?? '').trim(),
    delivery_date: String(form.get('delivery_date') ?? '').trim(),
    send_now: String(form.get('send_now') ?? '') === 'true',
  });
  if (!parsed.success) {
    const period = String(form.get('period') ?? 'wed').trim();
    return redirect(backTo(isPeriod(period) ? period : 'wed', { error: 'invalid_input' }), 303);
  }
  const { period, delivery_date, send_now } = parsed.data as { period: Period; delivery_date: string; send_now: boolean };
  const cfg = PERIOD_CONFIG[period];

  // Guard against a stale page: only confirm the CURRENT target delivery date.
  const target = cfg.nextDeliveryDate();
  if (delivery_date !== target) {
    return redirect(backTo(period, { error: 'stale_date' }), 303);
  }

  // Mark confirmed (idempotent upsert; portal_settings PK = key).
  const { error: upsertErr } = await supabaseAdmin
    .from('portal_settings')
    .upsert({ key: cfg.confirmKey, value: target, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (upsertErr) {
    console.error('[fresh-sheet/confirm] portal_settings upsert failed:', upsertErr.message);
    return redirect(backTo(period, { error: 'confirm_failed' }), 303);
  }

  if (!send_now) {
    return redirect(backTo(period, { confirmed: '1' }), 303);
  }

  // Send now — chef sends stay gated by the enabled flag too.
  if (!(await readFlag(supabaseAdmin, cfg.gateFlag))) {
    return redirect(backTo(period, { confirmed: '1', sent: 'disabled' }), 303);
  }

  let sentStatus = 'ok';
  try {
    const outcome = await sendFreshSheet(supabaseAdmin, period);
    if ('skipped' in outcome) sentStatus = outcome.skipped; // already_sent | no_active_products
  } catch (e) {
    console.error('[fresh-sheet/confirm] sendFreshSheet threw:', e);
    sentStatus = 'error';
  }
  return redirect(backTo(period, { confirmed: '1', sent: sentStatus }), 303);
};
