/**
 * POST /api/admin/products/create-quick   (admin only)
 *
 * The box-content editor's "➕ Add new item…" escape hatch. Creates a
 * minimal `product_library` row (name + optional category) so Todd is never
 * blocked mid-week by a crop that isn't in the master catalog yet, and
 * returns the new row as JSON so the editor can select it inline WITHOUT a
 * full page reload (which would discard the rest of the unsaved box).
 *
 * This is the JSON sibling of /api/admin/products/save (op=create): same
 * auth (requireAdmin + isSameOriginPost), same slugify, same UNIQUE-name
 * handling. It intentionally does NOT touch wholesale_products — this is the
 * bare identity record; Todd fleshes out photo / wholesale later from
 * /admin/products. The library is the single source of truth, so the new
 * item immediately appears in flex, box, and wholesale catalog pickers.
 *
 * Request body (application/x-www-form-urlencoded or multipart/form-data):
 *   - name       required, 1–160 chars
 *   - category   optional, ≤80 chars (free text; the editor offers the
 *                shared category datalist)
 *
 * Responses (always JSON):
 *   200 { ok: true, product: { id, name, category } }
 *   400 { ok: false, error: 'invalid_input' }
 *   409 { ok: false, error: 'duplicate_name' }  — name already in catalog
 *   403 (plain) — same-origin guard tripped
 *   401/403 (from requireAdmin) — not an admin
 *   500 { ok: false, error: 'save_failed' }
 */
import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';

export const prerender = false;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/** name → URL/storage-safe slug ('King Spring Mix' → 'king-spring-mix').
 *  Matches /api/admin/products/save exactly so quick-created items slug
 *  identically to catalog-created ones. */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '') // strip diacritics
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'product'
  );
}

const QuickProduct = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().max(80).nullable(),
});

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
    return json(400, { ok: false, error: 'invalid_input' });
  }

  const rawCategory = String(form.get('category') ?? '').trim();
  const parsed = QuickProduct.safeParse({
    name: String(form.get('name') ?? '').trim(),
    category: rawCategory.length === 0 ? null : rawCategory,
  });
  if (!parsed.success) {
    return json(400, { ok: false, error: 'invalid_input' });
  }
  const { name, category } = parsed.data;

  const id = randomUUID();
  const { error } = await locals.supabase.from('product_library').insert({
    id,
    name,
    slug: slugify(name),
    category,
  });

  if (error) {
    // product_library.name is UNIQUE — surface a friendly duplicate signal so
    // the editor can tell Todd the item already exists (and offer it in the
    // dropdown instead of creating a clashing row).
    if (error.code === '23505') {
      return json(409, { ok: false, error: 'duplicate_name' });
    }
    console.error('[api/admin/products/create-quick] insert failed:', error.message);
    return json(500, { ok: false, error: 'save_failed' });
  }

  return json(200, { ok: true, product: { id, name, category } });
};
