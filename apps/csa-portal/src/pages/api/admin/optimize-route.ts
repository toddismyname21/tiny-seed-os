/**
 * POST /api/admin/optimize-route — optimize a chosen set of delivery stops into
 * the least-drive-time depot loop (farm → stops → farm), time-window aware.
 *
 * The admin route-plan page gathers the day's candidate stops (already geocoded)
 * and posts the SELECTED ones here (so toggling a stop off is just not sending
 * it). We run the Routes-API matrix + solver and return the ordered route with
 * ETAs + a one-tap full-route Google Maps link. Admin-gated + same-origin.
 */
import type { APIRoute } from 'astro';
import { GOOGLE_MAPS_API_KEY } from 'astro:env/server';
import { requireAdmin } from '../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';
import { optimizeStops, type RouteStop } from '../../../lib/route-optimizer';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) return json({ error: 'forbidden' }, 403);
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;
  if (!GOOGLE_MAPS_API_KEY) return json({ error: 'maps_key_missing' }, 500);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }

  const raw = Array.isArray(body?.stops) ? body.stops : null;
  if (!raw) return json({ error: 'no_stops' }, 400);

  // Trust only the shape we expect (admin tool, but validate anyway).
  const stops: RouteStop[] = raw
    .filter((s: any) =>
      s && typeof s.lat === 'number' && typeof s.lng === 'number' &&
      typeof s.serviceSec === 'number' && typeof s.name === 'string')
    .map((s: any) => ({
      key: String(s.key ?? ''),
      name: String(s.name),
      lat: s.lat,
      lng: s.lng,
      kind: s.kind === 'home' || s.kind === 'wholesale' ? s.kind : 'csa',
      serviceSec: Math.max(0, Math.min(3600, s.serviceSec)),
      windowEndSec: typeof s.windowEndSec === 'number' ? s.windowEndSec : undefined,
      detail: typeof s.detail === 'string' ? s.detail : undefined,
    }));

  if (stops.length === 0) return json({ error: 'no_valid_stops' }, 400);
  if (stops.length > 24) return json({ error: 'too_many_stops', detail: 'Max 24 stops per route (Routes matrix limit).' }, 400);

  const startSec = typeof body.startSec === 'number' ? body.startSec : undefined;

  try {
    const result = await optimizeStops(stops, GOOGLE_MAPS_API_KEY, startSec);
    return json({ ok: true, ...result }, 200);
  } catch (e) {
    console.error('[api/admin/optimize-route] failed:', (e as Error)?.message);
    return json({ error: 'optimize_failed', detail: (e as Error)?.message }, 500);
  }
};
