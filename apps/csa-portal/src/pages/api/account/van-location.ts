/**
 * GET /api/account/van-location — live van position for Track My Box.
 *
 * Polled (~60s) by /account/track while the member watches delivery
 * morning. Returns the driver's latest GPS fix for TODAY's route that the
 * SIGNED-IN member is actually on, plus the member's own stop coordinates
 * so the map can show both pins.
 *
 * Privacy: mirrors the track page's RLS posture exactly — the member's own
 * cookie client resolves "my route/my stop" (RLS shows members ONLY their
 * own delivery_stops row), and the response contains ONLY the van fix +
 * the member's own stop coordinates. No other member's anything.
 *
 * Response: { ok, live, van?: {lat,lng,at}, stop?: {lat,lng,name} }
 *   live=false when: no route today, member not on it, route not
 *   in_progress, or no GPS fix in the last 5 minutes (stale = hide the van
 *   rather than show it parked somewhere it isn't).
 */
import type { APIRoute } from 'astro';

export const prerender = false;

const FRESH_MS = 5 * 60 * 1000;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });

function todayET(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) return json({ ok: false, error: 'signed_out' }, 401);
  const supabase = locals.supabase;

  // NOTE: driver_lat/lng/loc_at are live columns (migration 20260928132342)
  // that the generated database.types.ts (shared-kernel, locked) doesn't know
  // yet — hence the explicit row typing here.
  type VanRouteRow = {
    id: string; status: string;
    driver_lat: number | null; driver_lng: number | null; driver_loc_at: string | null;
  };
  const { data: routesRaw } = await supabase
    .from('delivery_routes')
    .select('id, status, driver_lat, driver_lng, driver_loc_at')
    .eq('route_date', todayET());
  const routes = (routesRaw ?? []) as unknown as VanRouteRow[];

  for (const r of routes) {
    // Am I on this route? (RLS: this select returns only MY stop.)
    const { data: stops } = await supabase
      .from('delivery_stops')
      .select('id, pickup_location_id, pickup_location:pickup_locations(name, coordinates_lat, coordinates_lng)')
      .eq('route_id', r.id)
      .limit(1);
    const s = stops?.[0] as
      | { pickup_location: { name: string; coordinates_lat: number | null; coordinates_lng: number | null } | null }
      | undefined;
    if (!s) continue;

    const stop = s.pickup_location?.coordinates_lat != null
      ? { lat: Number(s.pickup_location.coordinates_lat), lng: Number(s.pickup_location.coordinates_lng), name: s.pickup_location.name }
      : null;

    const fresh = r.status === 'in_progress'
      && r.driver_lat != null && r.driver_loc_at != null
      && Date.now() - Date.parse(r.driver_loc_at) < FRESH_MS;

    return json({
      ok: true,
      live: fresh,
      van: fresh ? { lat: r.driver_lat, lng: r.driver_lng, at: r.driver_loc_at } : null,
      stop,
    });
  }
  return json({ ok: true, live: false, van: null, stop: null });
};
