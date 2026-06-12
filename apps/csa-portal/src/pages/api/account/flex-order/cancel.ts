/**
 * POST /api/account/flex-order/cancel   (flex member only)
 *
 * Cancels the member's PENDING flex order for a week. Removing all items
 * from the cart only disables the submit button — it does not undo an
 * already-submitted order — so this is the explicit "Cancel my order this
 * week" action (FLEX_ORDERING_AUDIT_FIX_2026-06-08 polish).
 *
 * The restock-and-cancel happens atomically inside the SECURITY DEFINER RPC
 * `cancel_flex_order` (migration 0038): it re-checks the caller owns the
 * flex member, adds each pending line's qty back to remaining_qty, and flips
 * the rows pending→cancelled — all in one transaction so stock can't strand.
 *
 * This handler mirrors submit.ts:
 *   1. CSRF + auth (isSameOriginPost + a logged-in user).
 *   2. Window guard — cancellation is only meaningful while the week is
 *      still OPEN (before that week's cutoff). After cutoff the order is
 *      effectively locked; we refuse with window_closed so a member can't
 *      yank stock the farm is already harvesting.
 *   3. Ownership re-check (fail fast; the RPC re-checks too).
 *   4. Call the RPC, translate the result into a redirect.
 *
 * Body (multipart/form-data):
 *   - member_id      UUID
 *   - week_starting  YYYY-MM-DD (cycle Monday)
 *
 * Redirects: 303 → /account/flex-order?ok=cancelled | ?error=<code>
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
  //    (Sat/Sun pickup) may cancel until Wed 23:59:59 ET; Wed/home members
  //    keep the Tue cutoff. Resolved RLS-scoped to the caller's own row;
  //    a lookup miss → null → conservative Tue cutoff. ──────────────────
  const pickupDay = await resolveFlexMemberPickupDay(locals.supabase, memberId);

  // ── Window guard: cancellation is only allowed while the week is open
  //    (before that member's cutoff). After cutoff the order is locked in
  //    for harvest. ─────────────────────────────────────────────────────
  if (isPastCutoff(week, Date.now(), pickupDay)) {
    return redirect(back('error', 'window_closed'), 303);
  }

  // ── Verify caller owns this flex member (RLS-scoped read). The RPC
  //    re-checks too, but failing fast here gives a cleaner error. ──────
  type MemberRow = { id: string; share_type: string };
  const { data: member, error: memberErr } = await locals.supabase
    .from('members')
    .select('id, share_type')
    .eq('id', memberId)
    .maybeSingle()
    .overrideTypes<MemberRow, { merge: false }>();

  if (memberErr) {
    console.error('[api/account/flex-order/cancel] member read failed:', memberErr.message);
    return redirect(back('error', 'invalid_input'), 303);
  }
  if (!member) return redirect(back('error', 'forbidden'), 303);
  if (member.share_type !== 'flex') return redirect(back('error', 'not_flex'), 303);

  // ── Cancel + restock atomically. ────────────────────────────────────
  const { data: rpcData, error: rpcErr } = await locals.supabase.rpc('cancel_flex_order', {
    p_member_id: memberId,
    p_week_starting: week,
  });

  if (rpcErr) {
    console.error('[api/account/flex-order/cancel] rpc failed:', rpcErr.message);
    return redirect(back('error', 'cancel_failed'), 303);
  }

  const result = rpcData as unknown as
    | { ok: true; cancelled: number; restocked_cents: number }
    | { error: string };

  if (result && 'error' in result) {
    const code = result.error;
    const known = new Set(['invalid_input', 'forbidden', 'not_flex']);
    return redirect(back('error', known.has(code) ? code : 'cancel_failed'), 303);
  }

  return redirect(back('ok', 'cancelled'), 303);
};
