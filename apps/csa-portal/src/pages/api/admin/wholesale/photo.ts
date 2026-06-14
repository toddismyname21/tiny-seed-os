/**
 * POST /api/admin/wholesale/photo   (admin only)
 *
 * Accepts a single image upload (multipart/form-data, field name `image`)
 * for a wholesale product — either the product's catalog photo OR a
 * real-time "today's quality" update photo. Stores it in the PUBLIC
 * `wholesale-photos` Supabase Storage bucket (migration 0044) and returns
 * the absolute PUBLIC URL so the admin page can set `photo_url` on the
 * product or a new `wholesale_product_updates` row.
 *
 * Mirrors /api/admin/flex-inventory/image (the established upload pattern),
 * with a product-scoped path so a product's photos live together:
 *   - PUBLIC bucket (catalog photos shown in-portal + to chefs).
 *   - Path convention `products/{productId}/{uuid}.{ext}` when a productId
 *     is supplied; falls back to `products/_unassigned/{uuid}.{ext}` when
 *     the photo is captured before the product is created (the Add flow).
 *   - 5 MB cap + image MIME allow-list, enforced here AND at the bucket.
 *   - Authorization: requireAdmin + isSameOriginPost (same CSRF guard as
 *     every other admin POST). Service-role upload (the admin gate is the
 *     auth boundary; cookie-aware multipart is flaky).
 *
 * Returns JSON: { ok:true, url, path } or { ok:false, error, ... }.
 */
import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { supabaseAdmin } from '../../../../lib/supabase';

export const prerender = false;

const BUCKET = 'wholesale-photos';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES: ReadonlySet<string> = new Set([
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
]);

/** RFC 4122 UUID — used to validate the optional productId path segment so
 *  a caller can't smuggle arbitrary path traversal into the storage key. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function extFor(mime: string): string {
  switch (mime) {
    case 'image/png': return 'png';
    case 'image/gif': return 'gif';
    case 'image/webp': return 'webp';
    default: return 'jpg';
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'bad_body' }, 400);
  }

  const file = form.get('image');
  if (!(file instanceof File)) return json({ ok: false, error: 'missing_image' }, 400);
  if (file.size === 0) return json({ ok: false, error: 'empty_file' }, 400);
  if (file.size > MAX_BYTES) return json({ ok: false, error: 'file_too_big', max_bytes: MAX_BYTES }, 413);
  if (!ALLOWED_TYPES.has(file.type)) {
    return json({ ok: false, error: 'bad_mime', got: file.type, allowed: Array.from(ALLOWED_TYPES) }, 415);
  }

  // Optional product scope — must be a valid UUID or we drop it. A photo
  // taken in the Add-product flow (before the row exists) lands under
  // _unassigned and is referenced by URL only.
  const productIdRaw = String(form.get('productId') ?? '').trim();
  const productSeg = UUID_RE.test(productIdRaw) ? productIdRaw : '_unassigned';

  const ext = extFor(file.type);
  const path = `products/${productSeg}/${randomUUID()}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: file.type,
      upsert: false,
      cacheControl: '31536000', // 1 year — random name => immutable
    });

  if (uploadErr) {
    console.error('[api/admin/wholesale/photo] upload failed:', uploadErr.message);
    return json({ ok: false, error: 'upload_failed', detail: uploadErr.message }, 500);
  }

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  if (!pub?.publicUrl) return json({ ok: false, error: 'url_failed' }, 500);

  return json({ ok: true, url: pub.publicUrl, path });
};
