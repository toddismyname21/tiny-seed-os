/**
 * POST /api/admin/route/[id]/stops/[stopId]/proof   (admin only)
 *
 * Accepts a single image upload (multipart/form-data, field name `photo`)
 * and stores it in the PRIVATE `delivery-proofs` Supabase Storage bucket
 * at the path `{route_date}/{stop_id}.{ext}`. Saves the OBJECT PATH (not
 * a URL) on `delivery_stops.proof_photo_url`.
 *
 * Privacy (migration 0025): the bucket is PRIVATE. We deliberately store
 * the storage object PATH here — never a public URL — because public URLs
 * to porch/front-door photos leak members' homes to anyone with the link.
 * Display is done via short-lived SIGNED URLs minted server-side only
 * after the caller is proven authorized:
 *   - admin route page → src/pages/admin/route/[id].astro (admin verified)
 *   - member tracker   → src/lib/delivery.ts (member's own stop RLS-scoped
 *                        before signing). See lib/delivery-proof.ts.
 *
 * Client expectations:
 *   - JPEG preferred (the admin UI resizes to max 1200px wide via
 *     Canvas and re-encodes JPEG @0.85 before upload, typically
 *     200-400 KB). PNG/webp also accepted.
 *   - Hard limit: 5 MB (Supabase bucket-level + we double-check here).
 *
 * Authorization: requireAdmin + isSameOriginPost.
 *
 * Storage RLS: delivery_proofs_admin_write permits the cookie-aware
 * client to upload (bucket-level policy gates on is_admin_caller()).
 *
 * Idempotency: re-uploading the same stop overwrites in place
 * (Supabase Storage with `upsert: true`). The DB column (the path) is
 * stable across re-uploads; each display request signs a fresh URL, so
 * there is no stale-URL caching concern.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../../../../lib/onboarding';
import { supabaseAdmin } from '../../../../../../../lib/supabase';
import { PROOF_BUCKET, PROOF_SIGNED_URL_TTL_SECONDS } from '../../../../../../../lib/delivery-proof';

export const prerender = false;

const BUCKET = PROOF_BUCKET;
const MAX_BYTES = 5 * 1024 * 1024;  // 5 MB
const ALLOWED_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
]);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function extFor(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

export const POST: APIRoute = async ({ request, params, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return jsonResponse({ ok: false, error: 'forbidden' }, 403);
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  const routeId = String(params.id ?? '').trim();
  const stopId = String(params.stopId ?? '').trim();
  if (!routeId || !stopId) {
    return jsonResponse({ ok: false, error: 'missing_ids' }, 400);
  }

  // Parse multipart form.
  let form: FormData;
  try {
    form = await request.formData();
  } catch (e) {
    return jsonResponse({ ok: false, error: 'bad_body' }, 400);
  }

  const file = form.get('photo');
  if (!(file instanceof File)) {
    return jsonResponse({ ok: false, error: 'missing_photo' }, 400);
  }
  if (file.size === 0) {
    return jsonResponse({ ok: false, error: 'empty_file' }, 400);
  }
  if (file.size > MAX_BYTES) {
    return jsonResponse({ ok: false, error: 'file_too_big', max_bytes: MAX_BYTES }, 413);
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return jsonResponse(
      { ok: false, error: 'bad_mime', got: file.type, allowed: Array.from(ALLOWED_TYPES) },
      415
    );
  }

  // Load route_date for path prefix + verify stop belongs to route.
  type StopRow = {
    id: string;
    route_id: string;
    route: { route_date: string } | null;
  };
  const { data: stop, error: sErr } = await locals.supabase
    .from('delivery_stops')
    .select('id, route_id, route:delivery_routes(route_date)')
    .eq('id', stopId)
    .maybeSingle()
    .overrideTypes<StopRow, { merge: false }>();

  if (sErr) {
    console.error('[api/admin/route/.../proof] stop fetch failed:', sErr.message);
    return jsonResponse({ ok: false, error: 'fetch_failed' }, 500);
  }
  if (!stop) {
    return jsonResponse({ ok: false, error: 'stop_not_found' }, 404);
  }
  if (stop.route_id !== routeId) {
    return jsonResponse({ ok: false, error: 'stop_route_mismatch' }, 400);
  }
  const routeDate = stop.route?.route_date;
  if (!routeDate) {
    return jsonResponse({ ok: false, error: 'route_date_missing' }, 500);
  }

  // Upload. Path: `{route_date}/{stop_id}.{ext}`.
  const ext = extFor(file.type);
  const path = `${routeDate}/${stopId}.${ext}`;

  // We use the service-role admin client for the upload because the
  // multipart body handling via the cookie-aware @supabase/ssr client
  // can be flaky for binary uploads. Auth + admin role check already
  // passed above; the service-role usage here is server-only and is
  // gated by the same admin check, so this is safe.
  const bytes = await file.arrayBuffer();
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
      cacheControl: '3600',
    });

  if (uploadErr) {
    console.error('[api/admin/route/.../proof] upload failed:', uploadErr.message);
    return jsonResponse({ ok: false, error: 'upload_failed', detail: uploadErr.message }, 500);
  }

  // Save the OBJECT PATH on the stop row (cookie-aware client → audit
  // trigger captures Todd's email). The bucket is PRIVATE (migration
  // 0025), so we NEVER persist a URL — display paths sign a fresh,
  // short-lived URL on demand from this path.
  const { error: updErr } = await locals.supabase
    .from('delivery_stops')
    .update({ proof_photo_url: path })
    .eq('id', stopId);

  if (updErr) {
    console.error('[api/admin/route/.../proof] stop update failed:', updErr.message);
    return jsonResponse({ ok: false, error: 'update_failed', detail: updErr.message }, 500);
  }

  // Return a signed URL too, so a caller that wants to show the photo
  // immediately (without a reload) can. The admin UI currently reloads,
  // which re-signs server-side, but returning it keeps the contract
  // useful and self-documenting. Service role can always sign.
  const { data: signed } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, PROOF_SIGNED_URL_TTL_SECONDS);

  return jsonResponse({ ok: true, photo_url: signed?.signedUrl ?? null, path });
};
