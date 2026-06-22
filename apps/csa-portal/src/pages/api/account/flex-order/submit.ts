/**
 * POST /api/account/flex-order/submit   (flex member only)
 *
 * Places (or replaces) the member's flex order for a week. The heavy lifting
 * — ownership re-check, restock-prior-pending, oversell guard, over-balance
 * cap, decrement + insert — happens atomically inside the SECURITY DEFINER
 * RPC `place_flex_order` (migration 0037). This handler:
 *
 *   1. CSRF + auth (isSameOriginPost + a logged-in user).
 *   2. Resolves the caller's flex member for the target week.
 *   3. Enforces the order WINDOW (server-side, gap research M7/G10):
 *      writable only between OPEN (prior Fri 00:00 ET) and CLOSE (Tue
 *      08:00 ET, every week incl. Week 1 '2026-06-08'). Outside it, the
 *      week is read-only.
 *   4. Resolves the LIVE flex balance (Shopify store credit) → cents.
 *   5. Parses the cart lines and calls the RPC.
 *   6. Translates the RPC result into a redirect with ok/error code.
 *
 * Body (multipart/form-data):
 *   - member_id      UUID
 *   - week_starting  YYYY-MM-DD (cycle Monday)
 *   - lines          JSON string: [{ "flex_item_id": uuid, "qty": int }, ...]
 *
 * Redirects: 303 → /account/flex-order?ok=submitted | ?error=<code>
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { RESEND_API_KEY, RESEND_FROM_EMAIL } from 'astro:env/server';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { isYMD, isPastCutoff, isBeforeOpen, prettyWeek, closeLabel } from '../../../../lib/flex-order';
import { getFlexBalance } from '../../../../lib/flex';
import {
  getCustomerGidByEmail,
  getStoreCreditAccount,
  debitStoreCredit,
  issueStoreCreditDelta,
} from '../../../../lib/shopify';
// Service-role client for the flex_transactions ledger: RLS lets members READ
// their own rows but only admins INSERT, so the debit/refund audit rows must be
// written with the service role (the member-scoped client's insert is rejected).
import { supabaseAdmin } from '../../../../lib/supabase';
import { resolveMemberPickup, resolveFlexMemberPickupDay } from '../../../../lib/account';
import { sendFlexOrderConfirmation, type FlexOrderEmailLine } from '../../../../lib/flex-order-email';

export const prerender = false;

const LineSchema = z.object({
  flex_item_id: z.uuid(),
  qty: z.number().int().positive().max(100000),
});

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
  const linesRaw = String(form.get('lines') ?? '').trim();

  if (!z.uuid().safeParse(memberId).success || !isYMD(week)) {
    return redirect(back('error', 'invalid_input'), 303);
  }

  // ── Pickup-day-aware cutoff (Todd 2026-06-12). Resolve THIS caller's flex
  //    member pickup day (RLS-scoped to their own row). Weekend-market members
  //    (Sat/Sun pickup) order until Wed 23:59:59 ET; Wed/home members keep the
  //    Tue 08:00 ET cutoff. A lookup miss → null → conservative Tue cutoff. ──
  const pickupDay = await resolveFlexMemberPickupDay(locals.supabase, memberId);

  // ── Window guard (gap research M7/G10): the week is writable only between
  //    OPEN (prior Fri 00:00 ET) and CLOSE — Tue 08:00 ET (every week incl.
  //    Week 1 '2026-06-08'), or Wed 23:59:59 ET for weekend-market members.
  //    Before open or after that member's close the week is read-only. ──────
  if (isBeforeOpen(week) || isPastCutoff(week, Date.now(), pickupDay)) {
    return redirect(back('error', 'window_closed'), 303);
  }

  // ── Parse + validate the cart lines. ────────────────────────────────
  let parsedLines: Array<{ flex_item_id: string; qty: number }>;
  try {
    const arr = JSON.parse(linesRaw);
    const result = z.array(LineSchema).min(1).max(100).safeParse(arr);
    if (!result.success) {
      return redirect(back('error', 'empty'), 303);
    }
    // Collapse duplicate item ids (defensive — sum their qty).
    const byId = new Map<string, number>();
    for (const l of result.data) {
      byId.set(l.flex_item_id, (byId.get(l.flex_item_id) ?? 0) + l.qty);
    }
    parsedLines = Array.from(byId.entries()).map(([flex_item_id, qty]) => ({ flex_item_id, qty }));
  } catch {
    return redirect(back('error', 'invalid_input'), 303);
  }

  if (parsedLines.length === 0) {
    return redirect(back('error', 'empty'), 303);
  }

  // ── Verify caller owns this flex member (RLS-scoped read). The RPC
  //    re-checks too, but failing fast here gives a cleaner error. ──────
  type MemberRow = { id: string; share_type: string; status: string };
  const { data: member, error: memberErr } = await locals.supabase
    .from('members')
    .select('id, share_type, status')
    .eq('id', memberId)
    .maybeSingle()
    .overrideTypes<MemberRow, { merge: false }>();

  if (memberErr) {
    console.error('[api/account/flex-order/submit] member read failed:', memberErr.message);
    return redirect(back('error', 'invalid_input'), 303);
  }
  if (!member) return redirect(back('error', 'forbidden'), 303);
  if (member.share_type !== 'flex') return redirect(back('error', 'not_flex'), 303);

  // ── Live flex balance → cents (cap input). ─────────────────────────
  // getFlexBalance returns LIVE Shopify store-credit dollars. We DEBIT at order
  // (below), so an EDIT must add back what was already charged for THIS
  // (member, week) — otherwise editing UP would be wrongly capped. `priorNet`
  // = net already debited for this order (debits − refunds), from our ledger.
  const orderRef = `flexorder:${memberId}:${week}`;
  const balance = await getFlexBalance(user.email);
  const { data: priorTxns } = await supabaseAdmin
    .from('flex_transactions')
    .select('type, amount')
    .eq('order_id', orderRef);
  const priorNet = (priorTxns ?? []).reduce(
    (s: number, t: { type: string; amount: number | string }) =>
      s + (t.type === 'debit' ? Number(t.amount) : -Number(t.amount)),
    0,
  );
  const balanceCents = Math.round(((balance ? balance.total : 0) + priorNet) * 100);

  // ── Place the order atomically. ─────────────────────────────────────
  const { data: rpcData, error: rpcErr } = await locals.supabase.rpc('place_flex_order', {
    p_member_id: memberId,
    p_week_starting: week,
    p_lines: parsedLines,
    p_balance_cents: balanceCents,
  });

  if (rpcErr) {
    console.error('[api/account/flex-order/submit] rpc failed:', rpcErr.message);
    return redirect(back('error', 'submit_failed'), 303);
  }

  const result = rpcData as unknown as
    | { ok: true; total_cents: number; items: number }
    | { error: string };

  if (result && 'error' in result) {
    // Map RPC error codes to the page's flash codes (1:1 except generic).
    const code = result.error;
    const known = new Set([
      'invalid_input', 'forbidden', 'not_flex', 'empty',
      'item_unavailable', 'oversold', 'over_balance', 'window_closed',
    ]);
    return redirect(back('error', known.has(code) ? code : 'submit_failed'), 303);
  }

  // ── DEBIT store credit to match the cart total (Todd 2026-06-18) ────
  // The order is placed PENDING (pending already packs — labels/manifest/
  // pack-check all include it). Historically the balance was only CAPPED, never
  // debited, so balances never dropped. We debit AT ORDER (assume fulfillment;
  // unfulfilled → reverse). We do NOT lock — locking would break the RPC's
  // pending-restock edit flow. RECONCILE to the current total so net charged
  // for (member, week) always == the current cart → edits/re-submits are
  // idempotent (no double-charge). Fail-soft: a Shopify hiccup must not turn a
  // placed order into an error; the backfill/retry reconciles.
  const targetDollars = Math.round((rpcData as { total_cents?: number }).total_cents ?? 0) / 100;
  const delta = Math.round((targetDollars - priorNet) * 100) / 100;
  if (Math.abs(delta) >= 0.01) {
    try {
      const gid = await getCustomerGidByEmail(user.email);
      const account = gid ? await getStoreCreditAccount(gid) : null;
      if (gid && account) {
        if (delta > 0) {
          await debitStoreCredit(account.accountId, delta);
          await supabaseAdmin.from('flex_transactions').insert({
            member_id: memberId, email: user.email, type: 'debit',
            amount: delta, reason: `Flex order — week of ${week}`, order_id: orderRef,
          });
        } else {
          await issueStoreCreditDelta(gid, -delta);
          await supabaseAdmin.from('flex_transactions').insert({
            member_id: memberId, email: user.email, type: 'refund',
            amount: -delta, reason: `Flex order reduced — week of ${week}`, order_id: orderRef,
          });
        }
      } else {
        console.error('[flex submit] no store-credit account for', user.email, '— debit skipped');
      }
    } catch (e) {
      console.error('[flex submit] store-credit reconcile failed:', e instanceof Error ? e.message : e);
    }
  }

  // ── Confirmation email (Tony 2026-06-12: "I didn't get a confirmation
  //    email"). Best-effort + fail-soft — the order is already placed; nothing
  //    below may block or change that. We re-query the now-PENDING order joined
  //    to the catalog for accurate names/prices, resolve the member's pickup
  //    stop, and hand it all to the Resend helper (which itself never throws).
  //    Wrapped in its own try/catch as a final belt-and-suspenders so a query
  //    hiccup can't turn a successful order into an error redirect. ──────────
  try {
    // Use the ORDER row's stored money (unit_price_cents/total_cents) — the
    // price actually charged — and join the catalog only for the item NAME.
    type PlacedLineRow = {
      qty: number;
      unit_price_cents: number | null;
      total_cents: number | null;
      flex_inventory: { name: string; price_cents: number } | null;
    };
    const { data: placedRows } = await supabaseAdmin
      .from('flex_orders')
      .select('qty, unit_price_cents, total_cents, flex_inventory:flex_inventory ( name, price_cents )')
      .eq('member_id', memberId)
      .eq('cycle_code', 'WEEKLY')
      .eq('week_starting', week)
      .eq('status', 'pending')
      .overrideTypes<PlacedLineRow[], { merge: false }>();

    const emailLines: FlexOrderEmailLine[] = (placedRows ?? [])
      .filter((r) => r.flex_inventory)
      .map((r) => {
        const unit = r.unit_price_cents ?? r.flex_inventory!.price_cents;
        const lineCents = r.total_cents ?? unit * r.qty;
        return { name: r.flex_inventory!.name, qty: r.qty, lineCents };
      });

    if (emailLines.length > 0) {
      const totalCents = emailLines.reduce((sum, l) => sum + l.lineCents, 0);

      // Resolve the member's pickup stop into one short member-facing line.
      const pickup = await resolveMemberPickup(locals.supabase);
      let pickupLine: string | null = null;
      if (pickup.kind === 'delivery') {
        pickupLine = 'Home delivery';
      } else if (pickup.kind === 'pickup' && pickup.locationName) {
        const bits = [pickup.locationName];
        if (pickup.dayLong || pickup.timeRange) {
          bits.push([pickup.dayLong, pickup.timeRange].filter(Boolean).join(' '));
        }
        pickupLine = bits.filter(Boolean).join(' · ');
      }

      await sendFlexOrderConfirmation({
        to: user.email,
        lines: emailLines,
        totalCents,
        weekLabel: prettyWeek(week),
        cutoffLabel: closeLabel(week, pickupDay),
        pickupLine,
        resendApiKey: RESEND_API_KEY,
        resendFromEmail: RESEND_FROM_EMAIL,
      });
    }
  } catch (e) {
    console.error('[api/account/flex-order/submit] confirmation email step threw (swallowed):', e);
  }

  return redirect(back('ok', 'submitted'), 303);
};
