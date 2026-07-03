/**
 * POST /api/admin/wholesale/orders/update   (admin only, JSON)
 *
 * Edit a MANUAL wholesale order (one keyed in via /create). Replaces the order's
 * line items and recomputes the total through the SAME RPC as /create
 * (place_wholesale_order_admin, migration 0065) — passing p_order_id switches
 * the RPC into "replace this order's items" mode, so the pricing math is
 * byte-for-byte identical to a fresh order (no forked logic).
 *
 * Only a source='manual' order may be edited here. The RPC re-checks this, and
 * we ALSO check it up-front (defense in depth) so a chef_portal / import order
 * can never be rewritten through the admin manual path.
 *
 * Body shape (validated with zod):
 *   { order_id, delivery_date? (YYYY-MM-DD), status?,
 *     lines:[{ product_id?|null, product_name?, qty, price_cents? }] }
 * delivery_date / status default to the order's existing values when omitted.
 *
 * Returns JSON: { ok:true, order_id, redirect } or { ok:false, error, ... }.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../../lib/onboarding';
import { supabaseAdmin } from '../../../../../lib/supabase';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const uuid = z.uuid();

const Line = z
  .object({
    product_id: uuid.nullable().optional(),
    product_name: z.string().trim().min(1).max(300).optional(),
    qty: z.number().finite().positive().max(100_000),
    price_cents: z.number().int().min(0).max(10_000_000).optional(),
  })
  .refine((l) => l.product_id != null || (l.product_name != null && l.product_name.length > 0), {
    message: 'each line needs a product_id or a product_name',
  })
  .refine((l) => l.product_id != null || l.price_cents != null, {
    message: 'a custom (off-catalog) line must supply price_cents',
  });

const Body = z.object({
  order_id: uuid,
  delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'delivery_date must be YYYY-MM-DD').optional(),
  status: z.enum(['draft', 'submitted', 'confirmed', 'packed', 'delivered', 'cancelled']).optional(),
  lines: z.array(Line).min(1, 'at least one line is required').max(200),
});

const RPC_ERRORS: Record<string, string> = {
  invalid_account: 'That chef account no longer exists.',
  invalid_status: 'Invalid order status.',
  invalid_delivery_date: 'A delivery date is required.',
  empty: 'Add at least one item.',
  too_many_lines: 'Too many line items (max 200).',
  no_valid_items: 'No valid items — check quantities and that products are still active.',
  not_editable: 'That order cannot be edited here.',
  custom_line_needs_name: 'A custom item needs a name.',
  custom_line_needs_price: 'A custom item needs a price.',
};

async function callPlaceOrderAdmin(args: Record<string, unknown>): Promise<{
  data: unknown;
  error: { message: string } | null;
}> {
  const rpc = supabaseAdmin.rpc as unknown as (
    fn: string,
    params: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  return rpc('place_wholesale_order_admin', args);
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_body' }, 400);
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return json({ ok: false, error: 'invalid_input', detail: parsed.error.issues }, 400);
  }
  const { order_id } = parsed.data;

  // ── Load the existing order: must exist, must be source='manual', and gives
  //    us the account + fallbacks for delivery_date / status. ────────────────
  type OrderRow = {
    account_id: string | null;
    source: string | null;
    delivery_date: string;
    status: string;
  };
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('wholesale_orders')
    .select('account_id, source, delivery_date, status')
    .eq('id', order_id)
    .maybeSingle<OrderRow>();

  if (fetchErr) {
    console.error('[orders/update] order fetch failed:', fetchErr.message);
    return json({ ok: false, error: 'fetch_failed', detail: fetchErr.message }, 500);
  }
  if (!existing) {
    return json({ ok: false, error: 'not_found', message: 'That order no longer exists.' }, 404);
  }
  if (existing.source !== 'manual') {
    return json(
      { ok: false, error: 'not_editable', message: 'Only manually-entered orders can be edited here.' },
      403,
    );
  }
  if (!existing.account_id) {
    return json({ ok: false, error: 'no_account', message: 'That order is not linked to a chef account.' }, 400);
  }

  const delivery_date = parsed.data.delivery_date ?? existing.delivery_date;
  const status = parsed.data.status ?? existing.status;

  const lines = parsed.data.lines.map((l) => {
    const out: Record<string, unknown> = { qty: l.qty };
    if (l.product_id != null) out.product_id = l.product_id;
    if (l.product_name != null && l.product_name.length > 0) out.product_name = l.product_name;
    if (l.price_cents != null) out.price_cents = l.price_cents;
    return out;
  });

  const { data, error } = await callPlaceOrderAdmin({
    p_account_id: existing.account_id,
    p_lines: lines,
    p_delivery_date: delivery_date,
    p_status: status,
    p_source: 'manual',
    p_order_id: order_id,
  });

  if (error) {
    // The RPC RAISEs on an edit that ends with zero valid items (rolls back so
    // the order keeps its prior items) — surface that as a clean message.
    const msg = error.message || '';
    const code = msg.includes('no_valid_items') ? 'no_valid_items' : 'rpc_failed';
    console.error('[orders/update] rpc failed:', msg);
    return json(
      { ok: false, error: code, message: RPC_ERRORS[code] ?? 'Could not update the order.', detail: msg },
      code === 'no_valid_items' ? 400 : 500,
    );
  }

  const result = data as { ok?: true; order_id?: string; error?: string } | null;
  if (!result || result.error || !result.order_id) {
    const code = result?.error ?? 'unknown';
    return json({ ok: false, error: code, message: RPC_ERRORS[code] ?? 'Could not update the order.' }, 400);
  }

  return json({
    ok: true,
    order_id: result.order_id,
    redirect: `/admin/wholesale/orders?date=${delivery_date}`,
  });
};
