/**
 * POST /api/admin/wholesale/save   (admin only)
 *
 * One endpoint, four flex-style operations against `wholesale_products`,
 * selected by the `op` form field:
 *
 *   - op=create   Insert a new product (name required; sensible defaults).
 *   - op=update   Edit an existing product's fields (price/qty/desc/etc.).
 *   - op=toggle   Flip is_active ON/OFF only — the prominent board toggle.
 *   - op=photo    Set the product's catalog photo_url (after upload).
 *
 * Splitting these by `op` keeps each row's inline form tiny + lets the
 * ON/OFF toggle POST a single hidden field (id + next state) — exactly the
 * flex-inventory on/off UX, but mobile-first for Todd in the field.
 *
 * Form fields (multipart/form-data):
 *   - op              one of create|update|toggle|photo (required)
 *   - id              UUID — required for update/toggle/photo
 *   - is_active       'true'|'false' (toggle: the NEXT state)
 *   - name            create/update — required on create, 1–160 chars
 *   - category        create/update — optional
 *   - unit            create/update — required, defaults 'unit'
 *   - price_dollars   create/update — dollars (>= 0) → price_cents
 *   - available_qty   create/update — integer >= 0, OR blank = unlimited (null)
 *   - description     create/update — optional
 *   - sort_order      create/update — integer, defaults 0
 *   - photo_url       photo — absolute URL from /api/admin/wholesale/photo
 *
 * available_qty semantics: 0 = out of stock, null (blank) = unlimited.
 *
 * Authorization: requireAdmin + isSameOriginPost. Writes go through the
 * cookie-aware RLS client (the wholesale_products_staff policy), consistent
 * with every other admin mutation in this codebase.
 *
 * On success: 303 → /admin/wholesale/products?ok=<code>
 * On failure: 303 → /admin/wholesale/products?error=<code>
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { dollarsToCents } from '../../../../lib/flex-order';

export const prerender = false;

const BASE = '/admin/wholesale/products';

function back(key: 'ok' | 'error', val: string, anchor?: string): string {
  const a = anchor ? `#${anchor}` : '';
  return `${BASE}?${key}=${val}${a}`;
}

function strOrNull(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

/** Parse available_qty: blank/absent => null (unlimited); else int >= 0. */
function parseQty(v: FormDataEntryValue | null): number | null | 'invalid' {
  const s = strOrNull(v);
  if (s === null) return null; // unlimited
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n < 0 || String(n) !== s) return 'invalid';
  return n;
}

const Fields = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().max(80).nullable(),
  unit: z.string().trim().min(1).max(40),
  price_cents: z.number().int().nonnegative().max(10_000_000),
  available_qty: z.number().int().nonnegative().max(1_000_000).nullable(),
  description: z.string().trim().max(2000).nullable(),
  sort_order: z.number().int().min(-100_000).max(100_000),
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
    return redirect(back('error', 'invalid_input'), 303);
  }

  const op = String(form.get('op') ?? '').trim();
  const id = strOrNull(form.get('id'));
  const supabase = locals.supabase;

  // ── TOGGLE (the ON/OFF board switch) ──────────────────────────────
  if (op === 'toggle') {
    if (!id) return redirect(back('error', 'not_found'), 303);
    const next = form.get('is_active') === 'true';
    const { error } = await supabase
      .from('wholesale_products')
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('[api/admin/wholesale/save] toggle failed:', error.message);
      return redirect(back('error', 'save_failed'), 303);
    }
    return redirect(back('ok', next ? 'turned_on' : 'turned_off', `p-${id}`), 303);
  }

  // ── PHOTO (set catalog photo_url) ─────────────────────────────────
  // This is the MAIN product photo path only. The separate "today's quality
  // update" (→ wholesale_product_updates) lives in /api/admin/wholesale/update
  // and is intentionally left untouched — it's a transient per-week note, not
  // the canonical product photo.
  if (op === 'photo') {
    if (!id) return redirect(back('error', 'not_found'), 303);
    const urlParsed = z.url().max(2000).safeParse(strOrNull(form.get('photo_url')));
    if (!urlParsed.success) return redirect(back('error', 'invalid_input'), 303);

    // Read the product's library link so we can propagate the photo UP to the
    // shared product_library (the single source of truth that flex + box + the
    // chef order page all read first).
    type Cur = { library_id: string | null };
    const { data: cur } = await supabase
      .from('wholesale_products')
      .select('library_id')
      .eq('id', id)
      .maybeSingle()
      .overrideTypes<Cur, { merge: false }>();

    const { error } = await supabase
      .from('wholesale_products')
      .update({ photo_url: urlParsed.data, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('[api/admin/wholesale/save] photo set failed:', error.message);
      return redirect(back('error', 'save_failed'), 303);
    }

    // ── PROPAGATE to product_library (single source). Additive + best-effort:
    // a failure here never fails the product photo save (the product already
    // has its own photo_url as a fallback). Only when the product is linked. ──
    if (cur?.library_id) {
      const { error: libErr } = await supabase
        .from('product_library')
        .update({ photo_url: urlParsed.data, updated_at: new Date().toISOString() })
        .eq('id', cur.library_id);
      if (libErr) {
        console.error('[api/admin/wholesale/save] library photo propagate failed:', libErr.message);
      }
    }

    return redirect(back('ok', 'photo_set', `p-${id}`), 303);
  }

  // ── CREATE / UPDATE (full fields) ─────────────────────────────────
  if (op !== 'create' && op !== 'update') {
    return redirect(back('error', 'invalid_input'), 303);
  }

  const priceCents = dollarsToCents(strOrNull(form.get('price_dollars')));
  if (priceCents === null) {
    return redirect(back('error', 'invalid_price', op === 'update' && id ? `p-${id}` : 'add'), 303);
  }

  const qty = parseQty(form.get('available_qty'));
  if (qty === 'invalid') {
    return redirect(back('error', 'invalid_qty', op === 'update' && id ? `p-${id}` : 'add'), 303);
  }

  const sortRaw = strOrNull(form.get('sort_order'));
  const sortOrder = sortRaw === null ? 0 : Number.parseInt(sortRaw, 10);

  const parsed = Fields.safeParse({
    name: String(form.get('name') ?? '').trim(),
    category: strOrNull(form.get('category')),
    unit: String(form.get('unit') ?? 'unit').trim() || 'unit',
    price_cents: priceCents,
    available_qty: qty,
    description: strOrNull(form.get('description')),
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
  });

  if (!parsed.success) {
    return redirect(back('error', 'invalid_input', op === 'update' && id ? `p-${id}` : 'add'), 303);
  }
  const d = parsed.data;

  if (op === 'create') {
    const { error } = await supabase.from('wholesale_products').insert({
      name: d.name,
      category: d.category,
      unit: d.unit,
      price_cents: d.price_cents,
      available_qty: d.available_qty,
      description: d.description,
      sort_order: d.sort_order,
      // New products land OFF — Todd turns them on when harvested/ready.
      is_active: form.get('is_active') === 'true',
    });
    if (error) {
      console.error('[api/admin/wholesale/save] insert failed:', error.message);
      return redirect(back('error', 'save_failed', 'add'), 303);
    }
    return redirect(back('ok', 'created'), 303);
  }

  // op === 'update'
  if (!id) return redirect(back('error', 'not_found'), 303);
  const { error } = await supabase
    .from('wholesale_products')
    .update({
      name: d.name,
      category: d.category,
      unit: d.unit,
      price_cents: d.price_cents,
      available_qty: d.available_qty,
      description: d.description,
      sort_order: d.sort_order,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) {
    console.error('[api/admin/wholesale/save] update failed:', error.message);
    return redirect(back('error', 'save_failed', `p-${id}`), 303);
  }
  return redirect(back('ok', 'saved', `p-${id}`), 303);
};
