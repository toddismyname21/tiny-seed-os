/**
 * POST /api/admin/route/[id]/location — driver GPS heartbeat.
 *
 * The driver route page ([id].astro) calls this every ~45s (throttled
 * watchPosition) while the route is in_progress. Writes the fix onto the
 * route row (driver_lat/driver_lng/driver_loc_at — migration 20260928132342)
 * so the member tracker can draw the van on a map.
 *
 * Guardrails:
 *   - requireAdmin + same-origin (same gate as every driver action).
 *   - Only routes with status='in_progress' accept fixes — a parked or
 *     completed route never shows a wandering van.
 *   - Lat/lng validated to WGS84 ranges; junk is dropped silently (a bad GPS
 *     blip must never 500 the driver's screen).
 *
 * Body (JSON): { lat: number, lng: number }
 * Returns: { ok: true } always on accepted auth (fire-and-forget client).
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../../lib/onboarding';

export const prerender = false;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ params, request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) return json({ error: 'forbidden' }, 403);
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  const id = params.id ?? '';
  if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: 'bad_id' }, 400);

  let body: { lat?: unknown; lng?: unknown };
  try { body = await request.json(); } catch { return json({ ok: true }); }
  const lat = Number(body.lat); const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
      Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return json({ ok: true }); // junk fix: drop silently
  }

  await locals.supabase
    .from('delivery_routes')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- live
    // columns (migration 20260928132342) not yet in the locked generated types.
    .update({ driver_lat: lat, driver_lng: lng, driver_loc_at: new Date().toISOString() } as any)
    .eq('id', id)
    .eq('status', 'in_progress');

  return json({ ok: true });
};
