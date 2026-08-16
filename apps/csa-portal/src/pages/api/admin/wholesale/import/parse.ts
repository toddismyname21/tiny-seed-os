/**
 * POST /api/admin/wholesale/import/parse   (admin only, multipart)
 *
 * Step 1 of the wholesale order importer. Accepts a vendor order PDF (field
 * `file`) — a Harvie purchase order or a Market Wagon fill ticket — parses it
 * into normalized lines, then resolves each line against vendor_product_map so
 * the admin sees a pre-filled product mapping in the review UI.
 *
 * READ-ONLY: this endpoint performs NO database writes. It returns the parsed
 * lines (with any remembered mapping) plus the full product catalog so the UI
 * can offer a per-line dropdown. The admin confirms/edits, then POSTs to
 * /import/commit which performs the writes.
 *
 * Mapping resolution: Harvie SKUs extract with stray hyphens (e.g.
 * "TSF-SOMETH-SALAD") that won't equal a seed row keyed "TSFSOMETHSALAD", so we
 * match on the FULLY-normalized key (uppercased, non-alphanumerics stripped) on
 * both sides — see normalizeVendorKey. The exact stored vendor_key is preserved
 * and echoed back so commit re-uses it verbatim.
 *
 * Returns JSON: { ok, vendor, vendor_display, delivery_date, external_ref,
 *   lines:[{ vendor_key, raw_description, qty, unit_price_cents,
 *            mapped_product_id|null, mapped_product_name|null }],
 *   products:[{ id, name, unit }] }
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../../lib/onboarding';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { parseWholesalePdf, normalizeVendorKey } from '../../../../../lib/wholesale-import';

export const prerender = false;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'bad_body' }, 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) return json({ ok: false, error: 'missing_file' }, 400);
  if (file.size === 0) return json({ ok: false, error: 'empty_file' }, 400);
  if (file.size > MAX_BYTES) {
    return json({ ok: false, error: 'file_too_big', max_bytes: MAX_BYTES }, 413);
  }
  if (file.type && file.type !== 'application/pdf') {
    return json({ ok: false, error: 'bad_mime', got: file.type }, 415);
  }

  let parsed;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    parsed = await parseWholesalePdf(bytes);
  } catch (err) {
    return json(
      { ok: false, error: 'parse_failed', detail: err instanceof Error ? err.message : String(err) },
      422
    );
  }

  // Remembered mappings for this vendor.
  const { data: mapRows } = await supabaseAdmin
    .from('vendor_product_map')
    .select('vendor_key, product_id, product_name')
    .eq('vendor', parsed.vendor);

  // Index by fully-normalized key so "TSF-SOMETH-SALAD" matches "TSFSOMETHSALAD".
  const byNorm = new Map<string, { product_id: string | null; product_name: string | null }>();
  for (const r of (mapRows ?? []) as Array<{ vendor_key: string; product_id: string | null; product_name: string | null }>) {
    byNorm.set(normalizeVendorKey(r.vendor_key), { product_id: r.product_id, product_name: r.product_name });
  }

  // Full catalog for the UI dropdown.
  const { data: prodRows } = await supabaseAdmin
    .from('wholesale_products')
    .select('id, name, unit')
    .order('name', { ascending: true });
  const products = (prodRows ?? []) as Array<{ id: string; name: string; unit: string | null }>;
  const prodNameById = new Map(products.map((p) => [p.id, p.name]));

  const lines = parsed.lines.map((ln) => {
    const hit = byNorm.get(normalizeVendorKey(ln.vendor_key));
    const mapped_product_id = hit?.product_id ?? null;
    const mapped_product_name = mapped_product_id
      ? (prodNameById.get(mapped_product_id) ?? hit?.product_name ?? null)
      : (hit?.product_name ?? null);
    return {
      vendor_key: ln.vendor_key,
      raw_description: ln.raw_description,
      qty: ln.qty,
      unit_price_cents: ln.unit_price_cents,
      mapped_product_id,
      mapped_product_name,
    };
  });

  return json({
    ok: true,
    vendor: parsed.vendor,
    vendor_display: parsed.vendor_display,
    delivery_date: parsed.delivery_date,
    external_ref: parsed.external_ref,
    lines,
    products,
  });
};
