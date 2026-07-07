/**
 * POST /api/admin/wholesale/orders/update   (admin only, JSON)
 *
 * Edit ANY wholesale order. Replaces the order's line items and recomputes the
 * total through the SAME RPC as /create (place_wholesale_order_admin, migrations
 * 0065 + 0079) — passing p_order_id switches the RPC into "replace this order's
 * items" mode, so the pricing math is byte-for-byte identical to a fresh order
 * (no forked logic).
 *
 * WHY any order (Todd 2026-07-06): accuracy edits are needed on imported /
 * chef-portal orders too (a chef phones a correction, a vendor PDF had a wrong
 * qty). 0079 relaxed the RPC's edit guard from source='manual' to "any existing
 * order", and — critically — the edit path PRESERVES the order's `source`
 * (provenance is never rewritten by an edit). We no longer pre-check source
 * here; we only confirm the order EXISTS (below) before calling the RPC.
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
  // CRITICAL: call rpc as a MEMBER of the client — assigning the method to a
  // variable detaches `this`, and supabase-js's rpc() reads `this.rest`
  // internally, crashing with "Cannot read properties of undefined (reading
  // 'rest')" (empty 500 → the browser's "Unexpected end of JSON input").
  // Found in prod 2026-07-07 when Todd's first order edit crashed.
  const client = supabaseAdmin as unknown as {
    rpc(
      fn: string,
      params: Record<string, unknown>,
    ): Promise<{ data: unknown; error: { message: string } | null }>;
  };
  return client.rpc('place_wholesale_order_admin', args);
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

  // ── Load the existing order: must exist (ANY source is editable now), and
  //    gives us the account + source + fallbacks for delivery_date / status. ──
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

  // p_source is IGNORED on the edit path (0079 preserves the row's existing
  // source), but we pass the order's real source for clarity rather than
  // forcing 'manual' — an edit must never rewrite a chef/import order's
  // provenance.
  const { data, error } = await callPlaceOrderAdmin({
    p_account_id: existing.account_id,
    p_lines: lines,
    p_delivery_date: delivery_date,
    p_status: status,
    p_source: existing.source ?? 'manual',
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
