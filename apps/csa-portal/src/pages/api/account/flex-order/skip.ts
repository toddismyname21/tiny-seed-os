/**
 * POST /api/account/flex-order/skip   (flex member only)
 *
 * Member-facing "Skip this week" — a one-tap way to sit a week out WITHOUT
 * being forced to fake a one-item order (real member complaint, Amy H.,
 * 2026-06-12: had to order a single item just to "skip"). It must work
 * whether or not the member already has a pending order:
 *
 *   - PENDING order exists  → cancel + restock it (flex_orders pending→
 *     cancelled, qty added back) via the SAME idempotent `cancel_flex_order`
 *     RPC the explicit cancel button uses. Balance is untouched (nothing was
 *     ever charged — store credit only debits at fulfillment).
 *   - NO pending order       → nothing to cancel; the RPC returns ok with
 *     cancelled=0 and we simply confirm "you're skipped".
 *
 * Either way the member lands on ?ok=skipped with reassuring copy. We do NOT
 * invent a new table or status: "skipped" is the natural state of a flex
 * member with no pending/locked order for the week (non-submitters skip — see
 * flex-order.astro header). This route just makes that state reachable in one
 * tap, and tears down any stranded pending order so stock isn't held.
 *
 * Mirrors cancel.ts's CSRF + auth + window-guard + ownership contract.
 *
 * Body (multipart/form-data):
 *   - member_id      UUID
 *   - week_starting  YYYY-MM-DD (cycle Monday)
 *
 * Redirects: 303 → /account/flex-order?ok=skipped | ?error=<code>
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { isYMD, isPastCutoff } from '../../../../lib/flex-order';
import { resolveFlexMemberPickupDay } from '../../../../lib/account';

export const prerender = false;

function back(key: 'ok' | 'error', val: string): string {
  return `/account/flex-order?${key}=${val}`;
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }
  const user = locals.user;
  if (!user || !user.email) {
    return redirect('/login', 303);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirect(back('error', 'invalid_input'), 303);
  }

  const memberId = String(form.get('member_id') ?? '').trim();
  const week = String(form.get('week_starting') ?? '').trim();

  if (!z.uuid().safeParse(memberId).success || !isYMD(week)) {
    return redirect(back('error', 'invalid_input'), 303);
  }

  // ── Pickup-day-aware cutoff (Todd 2026-06-12): weekend-market members
  //    (Sat/Sun pickup) may skip until Wed 23:59:59 ET; Wed/home members keep
  //    the Tue cutoff. RLS-scoped to the caller's own row; miss → null → Tue. ─
  const pickupDay = await resolveFlexMemberPickupDay(locals.supabase, memberId);

  // ── Window guard: skipping (which cancels any pending order) is only
  //    meaningful while the week is still OPEN (before that member's cutoff).
  //    After cutoff the order is locked for harvest — refuse so a member
  //    can't yank stock late. ──────────────────────────────────────────────
  if (isPastCutoff(week, Date.now(), pickupDay)) {
    return redirect(back('error', 'window_closed'), 303);
  }

  // ── Verify caller owns this flex member (RLS-scoped read). ───────────
  type MemberRow = { id: string; share_type: string };
  const { data: member, error: memberErr } = await locals.supabase
    .from('members')
    .select('id, share_type')
    .eq('id', memberId)
    .maybeSingle()
    .overrideTypes<MemberRow, { merge: false }>();

  if (memberErr) {
    console.error('[api/account/flex-order/skip] member read failed:', memberErr.message);
    return redirect(back('error', 'invalid_input'), 303);
  }
  if (!member) return redirect(back('error', 'forbidden'), 303);
  if (member.share_type !== 'flex') return redirect(back('error', 'not_flex'), 303);

  // ── Cancel + restock any pending order atomically. The RPC is idempotent:
  //    with no pending rows it returns ok with cancelled=0, which IS the
  //    skip state — so a "skip" with nothing in the cart is a clean no-op. ─
  const { data: rpcData, error: rpcErr } = await locals.supabase.rpc('cancel_flex_order', {
    p_member_id: memberId,
    p_week_starting: week,
  });

  if (rpcErr) {
    console.error('[api/account/flex-order/skip] rpc failed:', rpcErr.message);
    return redirect(back('error', 'submit_failed'), 303);
  }

  const result = rpcData as unknown as
    | { ok: true; cancelled: number; restocked_cents: number }
    | { error: string };

  if (result && 'error' in result) {
    const code = result.error;
    const known = new Set(['invalid_input', 'forbidden', 'not_flex']);
    return redirect(back('error', known.has(code) ? code : 'submit_failed'), 303);
  }

  return redirect(back('ok', 'skipped'), 303);
};
