/**
 * POST /api/admin/products/image   (admin only)
 *
 * The MASTER product photo upload. Accepts a `product_library` id + an
 * image file (multipart/form-data: `id` + `image`), uploads the bytes to
 * the PUBLIC `flex-images` Storage bucket at
 * `library/<slug>-<6hex>.jpg`, and sets `product_library.photo_url` to the
 * resulting public URL.
 *
 * Because every channel now reads the photo LIBRARY-FIRST
 * (`product_library.photo_url ?? own.photo_url` — see the flex member
 * catalog, the chef order page, the box list, and both admin boards), a
 * photo set here PROPAGATES everywhere the product appears. This is the
 * single place to set a product's canonical photo.
 *
 * Storage details (mirrors /api/admin/flex-inventory/image):
 *   - PUBLIC `flex-images` bucket (migration 0036). Same bucket the flex
 *     editor uses, so admin photos live together.
 *   - Path `library/<slug>-<6hex>.jpg`-style: slug derived from the product
 *     NAME (read from the DB, never client-supplied → no path traversal),
 *     plus 6 random hex for collision-free immutability. The extension
 *     follows the upload MIME (png/gif/webp/jpg).
 *   - 5 MB cap + image MIME allow-list, enforced here AND at the bucket.
 *
 * Service-role for the STORAGE upload (cookie-aware multipart is flaky; the
 * admin gate is the auth boundary), but the product_library WRITE goes
 * through the cookie-aware RLS client (lib_staff) so the canonical photo can
 * only be set by an admin/staff session — defense in depth.
 *
 * Returns JSON: { ok:true, url, path } or { ok:false, error, ... }. The
 * admin page sets the live preview from `url` and the row already has its
 * photo (the DB write happened here), so no extra save step is needed.
 */
import type { APIRoute } from 'astro';
import { randomBytes } from 'node:crypto';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { supabaseAdmin } from '../../../../lib/supabase';

export const prerender = false;

const BUCKET = 'flex-images';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES: ReadonlySet<string> = new Set([
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
]);

/** RFC 4122 UUID — validate the product id before we read/write by it. */
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

/** name → storage-safe slug ('King Spring Mix' → 'king-spring-mix'). */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'product';
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

  const id = String(form.get('id') ?? '').trim();
  if (!UUID_RE.test(id)) return json({ ok: false, error: 'missing_id' }, 400);

  const file = form.get('image');
  if (!(file instanceof File)) return json({ ok: false, error: 'missing_image' }, 400);
  if (file.size === 0) return json({ ok: false, error: 'empty_file' }, 400);
  if (file.size > MAX_BYTES) return json({ ok: false, error: 'file_too_big', max_bytes: MAX_BYTES }, 413);
  if (!ALLOWED_TYPES.has(file.type)) {
    return json({ ok: false, error: 'bad_mime', got: file.type, allowed: Array.from(ALLOWED_TYPES) }, 415);
  }

  // Read the product NAME from the DB (cookie-aware → lib_staff/lib_read) so
  // the slug is server-trusted, not attacker-controlled, and to confirm the
  // product exists before we spend an upload.
  type Lib = { name: string };
  const { data: lib, error: readErr } = await locals.supabase
    .from('product_library')
    .select('name')
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<Lib, { merge: false }>();
  if (readErr) {
    console.error('[api/admin/products/image] library read failed:', readErr.message);
    return json({ ok: false, error: 'read_failed' }, 500);
  }
  if (!lib) return json({ ok: false, error: 'not_found' }, 404);

  const slug = slugify(lib.name);
  const hex6 = randomBytes(3).toString('hex'); // 6 hex chars
  const ext = extFor(file.type);
  const path = `library/${slug}-${hex6}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: file.type,
      upsert: false,
      cacheControl: '31536000', // 1 year — random name => immutable
    });
  if (uploadErr) {
    console.error('[api/admin/products/image] upload failed:', uploadErr.message);
    return json({ ok: false, error: 'upload_failed', detail: uploadErr.message }, 500);
  }

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  if (!pub?.publicUrl) return json({ ok: false, error: 'url_failed' }, 500);

  // Set the canonical photo on the library row (cookie-aware → lib_staff).
  // This is the propagation point: all channels read library-first.
  const { error: setErr } = await locals.supabase
    .from('product_library')
    .update({ photo_url: pub.publicUrl, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (setErr) {
    console.error('[api/admin/products/image] photo_url set failed:', setErr.message);
    return json({ ok: false, error: 'save_failed', detail: setErr.message }, 500);
  }

  return json({ ok: true, url: pub.publicUrl, path });
};
