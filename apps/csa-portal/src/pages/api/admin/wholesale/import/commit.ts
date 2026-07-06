/**
 * POST /api/admin/wholesale/import/commit   (admin only, JSON)
 *
 * Step 2 of the wholesale order importer. Takes the (possibly edited) parsed
 * order from the review UI and writes it into wholesale_orders +
 * wholesale_order_items so /admin/wholesale/pack and /labels pick it up.
 *
 * Sequence:
 *   1. Remember mappings: for every line that carries a product_id, upsert
 *      vendor_product_map(vendor, vendor_key, product_id, product_name) so the
 *      NEXT import of that SKU/name auto-resolves.
 *   2. Resolve the vendor's wholesale_accounts row (find by restaurant_name =
 *      vendor_display; create with a random order_token if missing).
 *   3. Idempotency: an order is keyed by (account_id, delivery_date,
 *      external_ref). On re-import we DELETE the existing items and reuse the
 *      order row (so re-uploading a corrected PDF replaces, never duplicates).
 *   4. Insert wholesale_order_items (product_id nullable — the pack page renders
 *      off product_name, so unmapped lines are fine).
 *
 * Body shape (validated with zod):
 *   { vendor, vendor_display, delivery_date, external_ref,
 *     lines:[{ vendor_key, product_id|null, product_name, qty,
 *              unit_price_cents|null }] }
 *
 * Returns JSON: { ok:true, order_id, redirect } or { ok:false, error, ... }.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../../lib/onboarding';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { commitWholesaleImport } from '../../../../../lib/wholesale-import-commit';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const uuid = z.string().uuid();

const Body = z.object({
  vendor: z.enum(['harvie', 'market_wagon']),
  vendor_display: z.string().trim().min(1).max(120),
  delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'delivery_date must be YYYY-MM-DD'),
  external_ref: z.string().trim().max(120).nullable().optional(),
  lines: z
    .array(
      z.object({
        vendor_key: z.string().trim().min(1).max(200),
        product_id: uuid.nullable().optional(),
        product_name: z.string().trim().min(1).max(300),
        qty: z.number().finite().min(0).max(1_000_000),
        unit_price_cents: z.number().int().min(0).max(10_000_000).nullable().optional(),
      })
    )
    .min(1, 'at least one line is required')
    .max(500),
});

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
  const { vendor, vendor_display, delivery_date } = parsed.data;

  // The write path (mapping upserts → account resolution → idempotent order +
  // items) lives in the shared lib so the auto-ingest cron reuses it verbatim.
  // Admin keeps its ORIGINAL behavior: onExisting:'replace' (re-upload of a
  // corrected PDF replaces the prior items, never duplicates).
  const result = await commitWholesaleImport(
    supabaseAdmin,
    {
      vendor,
      vendor_display,
      delivery_date,
      external_ref: parsed.data.external_ref ?? null,
      lines: parsed.data.lines,
    },
    { onExisting: 'replace' }
  );

  if (!result.ok) {
    // Same error codes + 500 status the endpoint returned before the refactor.
    return json({ ok: false, error: result.error, detail: result.detail }, 500);
  }

  return json({
    ok: true,
    order_id: result.order_id,
    redirect: `/admin/wholesale/pack?date=${delivery_date}`,
  });
};
