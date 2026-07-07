/**
 * POST /api/admin/wholesale/orders/create   (admin only, JSON)
 *
 * MANUAL wholesale order entry — key in an order a chef phoned/texted/emailed,
 * or add one past the cutoff. Writes into wholesale_orders + wholesale_order_items
 * via the SECURITY DEFINER RPC place_wholesale_order_admin (migration 0065), so
 * pricing is computed SERVER-SIDE and is byte-for-byte identical to the edit path
 * (/update, which calls the same RPC with p_order_id).
 *
 * Trust model: this is authenticated staff, so an admin-set line price is
 * legitimate (a negotiated one-off / off-catalog item). The RPC's rule:
 *   - catalog line with price_cents  → use it verbatim (admin override)
 *   - catalog line without price_cents → server-price = product.price_cents × (1 − tier discount)
 *   - custom line (product_id null)   → MUST supply product_name + price_cents
 *
 * Body shape (validated with zod):
 *   { account_id, delivery_date (YYYY-MM-DD), status?, source?,
 *     lines:[{ product_id?|null, product_name?, qty, price_cents? }] }
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

/** A single order line: either a catalog line ({product_id}) or a custom
 *  off-catalog line ({product_name, price_cents}). Enforced by the refines. */
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
  account_id: uuid,
  delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'delivery_date must be YYYY-MM-DD'),
  status: z.enum(['draft', 'submitted', 'confirmed', 'packed', 'delivered', 'cancelled']).optional(),
  source: z.string().trim().min(1).max(40).optional(),
  lines: z.array(Line).min(1, 'at least one line is required').max(200),
});

/** Human-readable messages for the RPC's soft-error codes. */
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

/** Call the admin place-order RPC. The RPC name isn't in the hand-maintained
 *  database.types Functions map (that file is out of scope for this feature),
 *  so we type the call locally without `any`. */
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
  const { account_id, delivery_date, status, source } = parsed.data;

  // Normalise lines for the RPC: drop absent optional keys so the RPC's
  // `? 'price_cents'` / product_id typeof checks see exactly what was supplied.
  const lines = parsed.data.lines.map((l) => {
    const out: Record<string, unknown> = { qty: l.qty };
    if (l.product_id != null) out.product_id = l.product_id;
    if (l.product_name != null && l.product_name.length > 0) out.product_name = l.product_name;
    if (l.price_cents != null) out.price_cents = l.price_cents;
    return out;
  });

  const { data, error } = await callPlaceOrderAdmin({
    p_account_id: account_id,
    p_lines: lines,
    p_delivery_date: delivery_date,
    p_status: status ?? 'confirmed',
    p_source: source ?? 'manual',
  });

  if (error) {
    console.error('[orders/create] rpc failed:', error.message);
    return json({ ok: false, error: 'rpc_failed', detail: error.message }, 500);
  }

  const result = data as { ok?: true; order_id?: string; error?: string } | null;
  if (!result || result.error || !result.order_id) {
    const code = result?.error ?? 'unknown';
    return json({ ok: false, error: code, message: RPC_ERRORS[code] ?? 'Could not create the order.' }, 400);
  }

  return json({
    ok: true,
    order_id: result.order_id,
    redirect: `/admin/wholesale/orders?date=${delivery_date}`,
  });
};
