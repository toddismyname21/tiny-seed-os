/**
 * POST /api/admin/products/save   (admin only)
 *
 * The MASTER product editor's save endpoint. One product = one
 * `product_library` row (the single source of truth for name / category /
 * unit / description / photo) PLUS an optional STANDING listing in
 * `wholesale_products` linked by `library_id`.
 *
 * Two ops, selected by the `op` form field:
 *
 *   - op=create   Insert a new `product_library` row (name required;
 *                 id generated server-side so we can immediately scope the
 *                 wholesale link by it). Then apply the wholesale link.
 *   - op=update   Update an existing `product_library` row's identity
 *                 fields, then apply the wholesale link.
 *
 * Wholesale link (both ops), driven by the `list_wholesale` checkbox:
 *   - ON  → upsert (find-by-library_id → update, else insert) a
 *           `wholesale_products` row. name/category/unit are mirrored FROM
 *           the library identity (the library is the source of truth);
 *           price_cents comes from the form; the optional wholesale unit
 *           override falls back to the library unit; is_active=true.
 *   - OFF → if a linked row exists, set is_active=false (NEVER delete — it
 *           keeps sort_order / compare_at / history; Todd can re-list it
 *           later by toggling the box back on).
 *
 * `wholesale_products.library_id` has NO unique constraint (migration 0045
 * only adds the FK), so we can't use a Postgres on-conflict upsert — we
 * read-then-update/insert within the request, scoped by library_id.
 *
 * Photos are NOT handled here — the upload + product_library.photo_url write
 * lives in /api/admin/products/image (multipart). This endpoint is the text
 * + wholesale-link save only.
 *
 * Authorization: requireAdmin + isSameOriginPost — the same CSRF guard as
 * every other admin POST. Writes go through the cookie-aware RLS client
 * (lib_staff on product_library, wholesale_products_staff on the listing),
 * consistent with /api/admin/wholesale/save.
 *
 * On success: 303 → /admin/products?ok=<code>
 * On failure: 303 → /admin/products?error=<code>
 */
import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { dollarsToCents } from '../../../../lib/flex-order';

export const prerender = false;

const BASE = '/admin/products';

function back(key: 'ok' | 'error', val: string, anchor?: string): string {
  const a = anchor ? `#${anchor}` : '';
  return `${BASE}?${key}=${val}${a}`;
}

function strOrNull(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

/** name → URL/storage-safe slug ('King Spring Mix' → 'king-spring-mix'). */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'product';
}

/** Identity fields shared by create + update (the product_library row). */
const Identity = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().max(80).nullable(),
  unit: z.string().trim().min(1).max(40),
  description: z.string().trim().max(2000).nullable(),
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
  if (op !== 'create' && op !== 'update') {
    return redirect(back('error', 'invalid_input'), 303);
  }

  const id = strOrNull(form.get('id'));
  const anchorFor = (libId: string | null): string =>
    op === 'update' && libId ? `p-${libId}` : 'add';

  const supabase = locals.supabase;

  // ── Identity validation (the product_library row) ─────────────────
  const identity = Identity.safeParse({
    name: String(form.get('name') ?? '').trim(),
    category: strOrNull(form.get('category')),
    unit: String(form.get('unit') ?? '').trim(),
    description: strOrNull(form.get('description')),
  });
  if (!identity.success) {
    return redirect(back('error', 'invalid_input', anchorFor(id)), 303);
  }
  const d = identity.data;

  // ── Wholesale link inputs ─────────────────────────────────────────
  const listWholesale = form.get('list_wholesale') === 'true';
  // The wholesale unit may override the library unit (e.g. library "each",
  // wholesale "case"); blank → mirror the library unit.
  const wholesaleUnit = strOrNull(form.get('wholesale_unit')) ?? d.unit;
  // Price is only required when listing in wholesale.
  let priceCents = 0;
  if (listWholesale) {
    const parsed = dollarsToCents(strOrNull(form.get('price_dollars')));
    if (parsed === null) {
      return redirect(back('error', 'invalid_price', anchorFor(id)), 303);
    }
    priceCents = parsed;
  }

  // ── 1. Create or update the product_library identity ──────────────
  let libraryId: string;

  if (op === 'create') {
    // Generate the id server-side (id has a gen_random_uuid() default, but
    // generating here lets us scope the wholesale link in the same request).
    libraryId = randomUUID();
    const { error } = await supabase.from('product_library').insert({
      id: libraryId,
      name: d.name,
      slug: slugify(d.name),
      category: d.category,
      description: d.description,
      // NOTE: product_library has no `unit` column — unit lives on the
      // channel listings. We persist the chosen unit onto the wholesale
      // listing below (and the form keeps it for the next edit via that row).
    });
    if (error) {
      // name is UNIQUE — surface the friendly duplicate message.
      if (error.code === '23505') {
        return redirect(back('error', 'duplicate_name', 'add'), 303);
      }
      console.error('[api/admin/products/save] library insert failed:', error.message);
      return redirect(back('error', 'save_failed', 'add'), 303);
    }
  } else {
    // op === 'update'
    if (!id) return redirect(back('error', 'not_found'), 303);
    libraryId = id;
    const { error } = await supabase
      .from('product_library')
      .update({
        name: d.name,
        slug: slugify(d.name),
        category: d.category,
        description: d.description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', libraryId);
    if (error) {
      if (error.code === '23505') {
        return redirect(back('error', 'duplicate_name', `p-${libraryId}`), 303);
      }
      console.error('[api/admin/products/save] library update failed:', error.message);
      return redirect(back('error', 'save_failed', `p-${libraryId}`), 303);
    }
  }

  // ── 2. Apply the standing wholesale link, scoped by library_id ────
  // Find the existing linked row (if any) so we update-or-insert. There is
  // no unique constraint on library_id, so a manual find-then-write is the
  // correct upsert here.
  type LinkRow = { id: string };
  const { data: linkRow, error: linkReadErr } = await supabase
    .from('wholesale_products')
    .select('id')
    .eq('library_id', libraryId)
    .maybeSingle()
    .overrideTypes<LinkRow, { merge: false }>();

  if (linkReadErr) {
    console.error('[api/admin/products/save] wholesale link read failed:', linkReadErr.message);
    return redirect(back('error', 'wholesale_failed', anchorFor(libraryId)), 303);
  }

  const nowIso = new Date().toISOString();

  if (listWholesale) {
    if (linkRow) {
      // Update the existing listing: mirror identity FROM the library, set
      // the price + wholesale unit, and (re-)activate it.
      const { error } = await supabase
        .from('wholesale_products')
        .update({
          name: d.name,
          category: d.category,
          unit: wholesaleUnit,
          price_cents: priceCents,
          description: d.description,
          is_active: true,
          updated_at: nowIso,
        })
        .eq('id', linkRow.id);
      if (error) {
        console.error('[api/admin/products/save] wholesale update failed:', error.message);
        return redirect(back('error', 'wholesale_failed', anchorFor(libraryId)), 303);
      }
    } else {
      // Insert a fresh standing listing linked to this library item.
      const { error } = await supabase.from('wholesale_products').insert({
        name: d.name,
        category: d.category,
        unit: wholesaleUnit,
        price_cents: priceCents,
        description: d.description,
        is_active: true,
        library_id: libraryId,
      });
      if (error) {
        console.error('[api/admin/products/save] wholesale insert failed:', error.message);
        return redirect(back('error', 'wholesale_failed', anchorFor(libraryId)), 303);
      }
    }
  } else if (linkRow) {
    // De-list (never delete): keep sort_order / compare_at / history.
    const { error } = await supabase
      .from('wholesale_products')
      .update({ is_active: false, updated_at: nowIso })
      .eq('id', linkRow.id);
    if (error) {
      console.error('[api/admin/products/save] wholesale deactivate failed:', error.message);
      return redirect(back('error', 'wholesale_failed', anchorFor(libraryId)), 303);
    }
  }

  const okCode = op === 'create' ? 'created' : 'saved';
  // On create, land back at the top (no per-row anchor — the new row sorts
  // by category/name). On update, jump back to the row just edited.
  const anchor = op === 'update' ? `p-${libraryId}` : undefined;
  return redirect(back('ok', okCode, anchor), 303);
};
