/**
 * POST /api/admin/wholesale/pack   (admin only, JSON)
 *
 * Mark a wholesale order PACKED and record what was ACTUALLY packed per line.
 * This is the write behind the interactive controls on /admin/wholesale/pack —
 * the first half of the PACK → DELIVER → INVOICE lifecycle migration 0088 opened
 * up (before it, 0 of 71 orders had ever reached 'packed', so nobody could say
 * what a chef actually received and $6.5k sat uninvoiced).
 *
 * ── THE ONE-TAP DEFAULT (Todd, 2026-08-16) ───────────────────────────────────
 * The overwhelmingly common case is "we packed exactly what they ordered". So
 * omitting `items` entirely copies qty → qty_packed for EVERY line on the order:
 * one tap, no per-line fiddling. The crew only sends `items` when reality
 * differed, and even then every line they DIDN'T mention is still packed as
 * ordered — a short line never leaves its neighbours stuck at 'pending'.
 *
 * Body (zod-validated):
 *   { order_id: uuid, items?: [{ item_id: uuid, qty_packed: number >= 0 }] }
 *
 * ── INVARIANTS ───────────────────────────────────────────────────────────────
 *  • MONEY IS NEVER TOUCHED. unit_price_cents / line_total_cents / total_amount
 *    are the server-side priced source of truth and this route only writes
 *    quantities. Invoicing reads qty_packed later.
 *  • fulfillment_status is a GENERATED column (0088) — we never write it, only
 *    read it back. (database.types.ts Omit-s it from Insert/Update so an attempt
 *    is a compile error, not a runtime 428C9.)
 *  • IDEMPOTENT: re-posting for an already-'packed' order updates the quantities
 *    and re-stamps packed_at/packed_by (a re-pack is a real event worth dating).
 *  • A 'delivered' or 'cancelled' order is CLOSED — 409, never silently
 *    regressed back to 'packed'. Delivered orders may already be invoiced, and
 *    rewriting their quantities would rewrite what a chef was billed for.
 *
 * Returns 200 { ok:true, order, items[], shortfalls[], counts } or
 *         { ok:false, error, message } with 400/403/404/409/500.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { supabaseAdmin } from '../../../../lib/supabase';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const uuid = z.uuid();

const ItemOverride = z.object({
  item_id: uuid,
  // >= 0: 0 is the meaningful "couldn't fulfil this at all" value. Negatives are
  // nonsense and are rejected rather than clamped.
  qty_packed: z.number().finite().nonnegative().max(100_000),
});

const Body = z.object({
  order_id: uuid,
  // Absent / empty === "packed exactly as ordered" (the one-tap default path).
  items: z.array(ItemOverride).max(200).optional(),
});

/** Statuses that are terminal for packing — never regressed by this route. */
const CLOSED_STATUSES = new Set(['delivered', 'cancelled']);

type OrderRow = {
  id: string;
  status: string;
  delivery_date: string;
  account_id: string | null;
  packed_at: string | null;
  packed_by: string | null;
};

type ItemRow = {
  id: string;
  order_id: string | null;
  product_name: string | null;
  qty: number | null;
  qty_packed: number | null;
  fulfillment_status: 'pending' | 'packed' | 'short' | 'unavailable';
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;
  const packedBy = auth.ctx.user.email ?? null;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_body', message: 'Could not read the request.' }, 400);
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    // A negative qty_packed lands here — surface it plainly rather than as a
    // generic validation blob, because it is the one input the crew can send by
    // hand (a typo'd minus sign in the actual-quantity box).
    const negative = parsed.error.issues.some(
      (i) => i.path.includes('qty_packed') && i.code === 'too_small',
    );
    return json(
      {
        ok: false,
        error: negative ? 'negative_qty' : 'invalid_input',
        message: negative
          ? 'A packed quantity cannot be negative. Use 0 for "could not fulfil".'
          : 'That request was not valid.',
        detail: parsed.error.issues,
      },
      400,
    );
  }
  const { order_id } = parsed.data;
  const overrides = parsed.data.items ?? [];

  // Duplicate item_ids would make the result order-dependent — reject instead of
  // silently letting the last one win.
  const overrideById = new Map<string, number>();
  for (const o of overrides) {
    if (overrideById.has(o.item_id)) {
      return json(
        { ok: false, error: 'duplicate_item', message: 'The same line was sent twice.' },
        400,
      );
    }
    overrideById.set(o.item_id, o.qty_packed);
  }

  // ── 1) Load the order. Must exist and must not be closed. ──────────────────
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('wholesale_orders')
    .select('id, status, delivery_date, account_id, packed_at, packed_by')
    .eq('id', order_id)
    .maybeSingle<OrderRow>();

  if (orderErr) {
    console.error('[wholesale/pack] order fetch failed:', orderErr.message);
    return json({ ok: false, error: 'fetch_failed', detail: orderErr.message }, 500);
  }
  if (!order) {
    return json({ ok: false, error: 'not_found', message: 'That order no longer exists.' }, 404);
  }
  if (CLOSED_STATUSES.has(order.status)) {
    return json(
      {
        ok: false,
        error: 'order_closed',
        status: order.status,
        message:
          order.status === 'delivered'
            ? 'That order is already delivered — it may already be invoiced, so its packed quantities are locked.'
            : 'That order is cancelled and cannot be packed.',
      },
      409,
    );
  }

  // ── 2) Load its lines. ─────────────────────────────────────────────────────
  const { data: itemRows, error: itemsErr } = await supabaseAdmin
    .from('wholesale_order_items')
    .select('id, order_id, product_name, qty, qty_packed, fulfillment_status')
    .eq('order_id', order_id)
    .overrideTypes<ItemRow[], { merge: false }>();

  if (itemsErr) {
    console.error('[wholesale/pack] item fetch failed:', itemsErr.message);
    return json({ ok: false, error: 'fetch_failed', detail: itemsErr.message }, 500);
  }
  const items = itemRows ?? [];
  if (items.length === 0) {
    return json(
      { ok: false, error: 'no_items', message: 'That order has no line items to pack.' },
      400,
    );
  }

  // Every override must name a line ON THIS ORDER — a stale/foreign item_id is a
  // client bug we refuse rather than ignore.
  const knownIds = new Set(items.map((i) => i.id));
  for (const id of overrideById.keys()) {
    if (!knownIds.has(id)) {
      return json(
        { ok: false, error: 'unknown_item', item_id: id, message: 'That line is not on this order.' },
        400,
      );
    }
  }

  // ── 3) Resolve the target qty_packed for EVERY line. ───────────────────────
  // Overridden lines take the supplied number; every other line is packed as
  // ordered. That second half is what keeps a partial submission complete.
  const targets = new Map<string, number>();
  for (const it of items) {
    const override = overrideById.get(it.id);
    targets.set(it.id, override !== undefined ? override : Number(it.qty) || 0);
  }

  // Write grouped by value: an order of N lines usually has only a handful of
  // distinct quantities, so this is a few statements, not N.
  const idsByValue = new Map<number, string[]>();
  for (const [id, value] of targets) {
    const bucket = idsByValue.get(value) ?? [];
    bucket.push(id);
    idsByValue.set(value, bucket);
  }
  for (const [value, ids] of idsByValue) {
    const { error: updErr } = await supabaseAdmin
      .from('wholesale_order_items')
      .update({ qty_packed: value })
      .in('id', ids)
      .eq('order_id', order_id); // belt-and-suspenders: never touch another order
    if (updErr) {
      console.error('[wholesale/pack] item update failed:', updErr.message);
      return json(
        { ok: false, error: 'save_failed', message: 'Could not save the packed quantities.', detail: updErr.message },
        500,
      );
    }
  }

  // ── 4) Stamp the order. ────────────────────────────────────────────────────
  const packedAt = new Date().toISOString();
  const { error: orderUpdErr } = await supabaseAdmin
    .from('wholesale_orders')
    // updated_at is owned by the wholesale_orders_updated_at BEFORE UPDATE
    // trigger (set_updated_at) — we deliberately do not write it here.
    .update({
      status: 'packed',
      packed_at: packedAt,
      packed_by: packedBy,
    })
    .eq('id', order_id)
    // Re-assert the guard at write time: if the order flipped to delivered/
    // cancelled between our read and this write, match zero rows rather than
    // regress it.
    .not('status', 'in', '("delivered","cancelled")');

  if (orderUpdErr) {
    console.error('[wholesale/pack] order update failed:', orderUpdErr.message);
    return json(
      { ok: false, error: 'save_failed', message: 'Saved the quantities but could not mark the order packed.', detail: orderUpdErr.message },
      500,
    );
  }

  // ── 5) Read back the generated fulfillment_status + the order's new state. ─
  const { data: afterRows, error: afterErr } = await supabaseAdmin
    .from('wholesale_order_items')
    .select('id, order_id, product_name, qty, qty_packed, fulfillment_status')
    .eq('order_id', order_id)
    .overrideTypes<ItemRow[], { merge: false }>();

  if (afterErr) {
    console.error('[wholesale/pack] read-back failed:', afterErr.message);
    return json({ ok: false, error: 'fetch_failed', detail: afterErr.message }, 500);
  }

  const { data: afterOrder } = await supabaseAdmin
    .from('wholesale_orders')
    .select('id, status, delivery_date, account_id, packed_at, packed_by')
    .eq('id', order_id)
    .maybeSingle<OrderRow>();

  const outItems = (afterRows ?? []).map((r) => ({
    item_id: r.id,
    product_name: r.product_name,
    qty: r.qty,
    qty_packed: r.qty_packed,
    fulfillment_status: r.fulfillment_status,
  }));
  const shortfalls = outItems.filter(
    (r) => r.fulfillment_status === 'short' || r.fulfillment_status === 'unavailable',
  );

  return json({
    ok: true,
    order: {
      id: order_id,
      status: afterOrder?.status ?? 'packed',
      delivery_date: afterOrder?.delivery_date ?? order.delivery_date,
      packed_at: afterOrder?.packed_at ?? packedAt,
      packed_by: afterOrder?.packed_by ?? packedBy,
    },
    items: outItems,
    shortfalls,
    counts: {
      total: outItems.length,
      packed: outItems.filter((r) => r.fulfillment_status === 'packed').length,
      short: outItems.filter((r) => r.fulfillment_status === 'short').length,
      unavailable: outItems.filter((r) => r.fulfillment_status === 'unavailable').length,
    },
  });
};
