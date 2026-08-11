/**
 * /api/admin/route-manual-stops — ad-hoc "manual stops" for the route planner.
 *
 * POST { route_date, leg, name, address, note? }
 *   → server-side geocode the address with GOOGLE_MAPS_API_KEY (the SAME
 *     geocoder gatherDayStops uses), insert a route_manual_stops row, return the
 *     created stop. A stop that fails to geocode is still saved (lat/lng NULL)
 *     so Todd sees it and can fix the address; it just won't route until fixed.
 *
 * DELETE { id }  → soft-delete (is_active = false). Never hard-deletes, so a
 *   manual stop already referenced by a saved delivery_stops row keeps its FK.
 *
 * Admin-gated + same-origin — identical guard to /api/admin/optimize-route.
 * Manual stops flow through the whole pipeline (gather → optimize → save →
 * driver view → pack/load order) with key 'manual:<id>' and target
 * delivery_stops.manual_stop_id (migration 0084).
 */
import type { APIRoute } from 'astro';
import { GOOGLE_MAPS_API_KEY } from 'astro:env/server';
import { requireAdmin } from '../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';
import { geocodeAddress } from '../../../lib/route-optimizer';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/** Trim + hard-cap a user string (defense-in-depth; DB has no length cap). */
function clean(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/** Same-origin guard for any method (isSameOriginPost only enforces on POST, so
 *  a DELETE would otherwise be un-checked). Requires Origin OR Referer to match
 *  the portal origin. */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (origin) return origin === PORTAL_ORIGIN;
  const referer = request.headers.get('referer');
  if (!referer) return false;
  try { return new URL(referer).origin === PORTAL_ORIGIN; } catch { return false; }
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) return json({ error: 'forbidden' }, 403);
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;
  const sb = locals.supabase;

  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }

  const route_date = clean(body?.route_date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(route_date)) {
    return json({ error: 'bad_date', detail: 'route_date must be YYYY-MM-DD.' }, 400);
  }
  const leg = body?.leg === 'B' ? 'B' : 'A';
  const name = clean(body?.name, 120);
  const address = clean(body?.address, 300);
  const note = clean(body?.note, 500) || null;
  if (!name) return json({ error: 'missing_name', detail: 'A stop name is required.' }, 400);
  if (!address) return json({ error: 'missing_address', detail: 'A street address is required.' }, 400);

  // Geocode with the same Google Geocoding call gatherDayStops uses. Fail-soft:
  // a stop that doesn't resolve is still saved (lat/lng NULL) and surfaces as a
  // "skipped (no coordinates)" stop on the planner so Todd can fix it.
  let lat: number | null = null;
  let lng: number | null = null;
  let geocoded = false;
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const g = await geocodeAddress(address, GOOGLE_MAPS_API_KEY);
      if (g) { lat = g.lat; lng = g.lng; geocoded = true; }
    } catch (e) {
      console.error('[route-manual-stops] geocode failed:', (e as Error)?.message);
    }
  }

  const { data, error } = await sb
    .from('route_manual_stops')
    .insert({ route_date, leg, name, address, lat, lng, service_sec: 180, note } as any)
    .select('id, route_date, leg, name, address, lat, lng, service_sec, note, is_active')
    .single();
  if (error || !data) {
    console.error('[route-manual-stops] insert failed:', error?.message);
    return json({ error: 'insert_failed', detail: error?.message }, 500);
  }

  return json({ ok: true, geocoded, stop: data }, 200);
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!isSameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;
  const sb = locals.supabase;

  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const id = clean(body?.id, 40);
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) return json({ error: 'bad_id' }, 400);

  const { error } = await sb.from('route_manual_stops').update({ is_active: false } as any).eq('id', id);
  if (error) {
    console.error('[route-manual-stops] soft-delete failed:', error.message);
    return json({ error: 'delete_failed', detail: error.message }, 500);
  }
  return json({ ok: true, id }, 200);
};
