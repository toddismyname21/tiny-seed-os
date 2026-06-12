/**
 * POST /api/admin/flex-inventory/image   (admin only)
 *
 * Accepts a single item-photo upload (multipart/form-data, field name
 * `image`), stores it in the PUBLIC `flex-images` Supabase Storage bucket
 * (migration 0036), and returns the absolute PUBLIC URL so the admin form
 * can set the item's `photo_url`.
 *
 * Mirrors /api/admin/campaigns/image (the established upload pattern):
 *   - PUBLIC bucket (photos shown in-portal + may be embedded in member
 *     email; no privacy expectation).
 *   - Path convention `{yyyy}/{mm}/{uuid}.{ext}` — date-foldered, random
 *     filename (no collision, no original-name leak).
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

const BUCKET = 'flex-images';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES: ReadonlySet<string> = new Set([
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
]);

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

  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const ext = extFor(file.type);
  const path = `${yyyy}/${mm}/${randomUUID()}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: file.type,
      upsert: false,
      cacheControl: '31536000', // 1 year — random name => immutable
    });

  if (uploadErr) {
    console.error('[api/admin/flex-inventory/image] upload failed:', uploadErr.message);
    return json({ ok: false, error: 'upload_failed', detail: uploadErr.message }, 500);
  }

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  if (!pub?.publicUrl) return json({ ok: false, error: 'url_failed' }, 500);

  return json({ ok: true, url: pub.publicUrl, path });
};
