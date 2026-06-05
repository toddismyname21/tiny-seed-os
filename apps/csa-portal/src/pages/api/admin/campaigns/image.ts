/**
 * POST /api/admin/campaigns/image   (admin only)
 *
 * Accepts a single image upload (multipart/form-data, field name `image`)
 * from the rich-text composer (Feature 4), stores it in the PUBLIC
 * `campaign-images` Supabase Storage bucket (migration 0035), and returns
 * the absolute PUBLIC URL so the editor can insert
 * <img src="..." style="max-width:100%">.
 *
 * Why a public URL (not a signed one, unlike delivery-proofs):
 *   Campaign images are embedded in outbound EMAIL. Email clients fetch
 *   <img src> with no auth header and cannot follow a short-lived signed
 *   URL — the image must live at a stable, credential-free URL or it
 *   renders broken in every member's inbox. The bucket is intentionally
 *   public (see migration 0035). We persist nothing in the DB here: the
 *   URL is embedded directly in the campaign body_html the admin saves.
 *
 * Path convention: `{yyyy}/{mm}/{uuid}.{ext}` — date-foldered so the
 * bucket stays browsable, randomized filename so uploads never collide
 * or leak the original filename.
 *
 * Limits: 5 MB, image MIME allow-list (png/jpeg/gif/webp) — enforced
 * here AND at the bucket level (migration 0035).
 *
 * Authorization: requireAdmin + isSameOriginPost (same CSRF guard as
 * every other admin POST).
 */
import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { supabaseAdmin } from '../../../../lib/supabase';

export const prerender = false;

const BUCKET = 'campaign-images';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES: ReadonlySet<string> = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
]);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function extFor(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
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
  if (!(file instanceof File)) {
    return json({ ok: false, error: 'missing_image' }, 400);
  }
  if (file.size === 0) {
    return json({ ok: false, error: 'empty_file' }, 400);
  }
  if (file.size > MAX_BYTES) {
    return json({ ok: false, error: 'file_too_big', max_bytes: MAX_BYTES }, 413);
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return json(
      { ok: false, error: 'bad_mime', got: file.type, allowed: Array.from(ALLOWED_TYPES) },
      415
    );
  }

  // Path: {yyyy}/{mm}/{uuid}.{ext}
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const ext = extFor(file.type);
  const path = `${yyyy}/${mm}/${randomUUID()}.${ext}`;

  // Service-role upload (binary via cookie-aware @supabase/ssr client can
  // be flaky for multipart — same rationale as the proof uploader). The
  // admin gate above is the auth boundary.
  const bytes = await file.arrayBuffer();
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: file.type,
      upsert: false,
      cacheControl: '31536000', // 1 year — images are immutable (random name)
    });

  if (uploadErr) {
    console.error('[api/admin/campaigns/image] upload failed:', uploadErr.message);
    return json({ ok: false, error: 'upload_failed', detail: uploadErr.message }, 500);
  }

  // Public URL — stable, credential-free (bucket is public per 0035).
  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  if (!pub?.publicUrl) {
    return json({ ok: false, error: 'url_failed' }, 500);
  }

  return json({ ok: true, url: pub.publicUrl, path });
};
