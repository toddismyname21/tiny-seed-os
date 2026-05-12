/**
 * POST /api/admin/route   (admin only)
 *
 * Creates today's route + auto-seeds stops from the active
 * `pickup_locations` matching the current weekday.
 *
 * Seeding rules (per spec):
 *   - `is_delivery_zone = true AND host_name IS NOT NULL`
 *       → one stop per location with `pickup_location_id` set.
 *   - `is_delivery_zone = true AND host_name IS NULL`
 *       → one stop per ACTIVE member at that "home delivery"
 *         pickup_location with `member_id` set. (No, wait — home
 *         delivery members typically have NO pickup_location_id at
 *         all. We handle both legacy and modern shapes below.)
 *   - `is_delivery_zone = false` → SKIP (self-pickup at farm).
 *
 * In our current data set:
 *   - 12 pickup_locations exist; 9 Wed hosts + 3 weekend markets.
 *   - The "Tiny Seed Farm Pickup — Rochester" location has
 *     `is_delivery_zone = false` (it's farm self-pickup) and is
 *     skipped.
 *   - Home-delivery members typically have `pickup_location_id = NULL`
 *     and a `delivery_address` populated. We seed ONE STOP PER such
 *     ACTIVE member on Wednesdays.
 *
 * Idempotency:
 *   - If a route for `today` already exists, the endpoint returns 409
 *     with the existing route id in the body. NO rows are touched
 *     (auto-seed is INSERT-only).
 *
 * Authorization:
 *   - requireAdmin (cookie session → customers.role check)
 *   - isSameOriginPost CSRF
 *
 * Audit:
 *   - All inserts go through the cookie-aware client so the audit
 *     trigger captures Todd's email.
 *
 * Response on success (200):
 *   { ok: true, route: { id, route_date, status, ... }, stops_created: N }
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { todayET, todayWeekdayET } from '../../../../lib/delivery';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../lib/database.types';

export const prerender = false;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/* ──────────────────────────────────────────────────────────────────
 * GET — list past 30 days of routes + today's route (or null)
 * ────────────────────────────────────────────────────────────────── */

export const GET: APIRoute = async ({ locals }) => {
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  const today = todayET();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  type RouteRow = Database['public']['Tables']['delivery_routes']['Row'];
  const { data, error } = await locals.supabase
    .from('delivery_routes')
    .select('id, route_date, driver_name, status, total_stops, completed_stops, started_at, completed_at')
    .gte('route_date', thirtyDaysAgo)
    .order('route_date', { ascending: false })
    .overrideTypes<RouteRow[], { merge: false }>();

  if (error) {
    console.error('[api/admin/route] list failed:', error.message);
    return jsonResponse({ ok: false, error: 'fetch_failed' }, 500);
  }

  const routes = data ?? [];
  const todays = routes.find((r) => r.route_date === today) ?? null;

  return jsonResponse({ ok: true, today, today_route: todays, routes });
};

/* ──────────────────────────────────────────────────────────────────
 * POST — create today's route + seed stops
 * ────────────────────────────────────────────────────────────────── */

interface SeedPlan {
  hostStops: Array<{ pickup_location_id: string; scheduled_time: string | null }>;
  homeDeliveryStops: Array<{ member_id: string }>;
}

/**
 * Build the seed plan from active pickup_locations + active members
 * for the current weekday. Pure-ish — runs DB SELECTs but no writes.
 */
async function buildSeedPlan(
  supabase: SupabaseClient<Database>,
  weekday: string
): Promise<SeedPlan | { error: string }> {
  // 1. Host stops: active, delivery-zone pickup_locations on this
  //    weekday with a host_name. Sort by time_start so the seed
  //    stop_order matches the driver's natural route flow.
  type LocRow = {
    id: string;
    name: string;
    day_of_week: string | null;
    is_delivery_zone: boolean;
    host_name: string | null;
    time_start: string | null;
    is_active: boolean;
  };
  // The enum in TS is narrowed to ('Sun'|'Mon'|...|'Sat'); todayWeekdayET
  // returns a string. Cast — runtime safety is guaranteed by the
  // Intl.DateTimeFormat output domain.
  type Weekday = NonNullable<Database['public']['Tables']['pickup_locations']['Row']['day_of_week']>;
  const { data: locs, error: locErr } = await supabase
    .from('pickup_locations')
    .select('id, name, day_of_week, is_delivery_zone, host_name, time_start, is_active')
    .eq('day_of_week', weekday as Weekday)
    .eq('is_delivery_zone', true)
    .eq('is_active', true)
    .overrideTypes<LocRow[], { merge: false }>();

  if (locErr) {
    console.error('[api/admin/route] location fetch failed:', locErr.message);
    return { error: 'fetch_failed' };
  }

  const hostLocs = (locs ?? []).filter((l) => l.host_name && l.host_name.trim().length > 0);
  hostLocs.sort((a, b) => {
    // Sort by time_start ASC, NULL-last, then by name as a tiebreaker.
    if (a.time_start && b.time_start) return a.time_start.localeCompare(b.time_start);
    if (a.time_start && !b.time_start) return -1;
    if (!a.time_start && b.time_start) return 1;
    return a.name.localeCompare(b.name);
  });
  const hostStops = hostLocs.map((l) => ({
    pickup_location_id: l.id,
    scheduled_time: l.time_start,
  }));

  // 2. Home-delivery stops: active members with NO pickup_location_id
  //    AND a delivery_address. We don't filter by weekday for these —
  //    home deliveries happen on the canonical CSA delivery day (Wed)
  //    regardless of member.pickup_day. If you're a home-delivery
  //    member, you're on Wednesday's route.
  //
  //    We do, however, only seed on Wednesday (the canonical day) so
  //    a Saturday admin-tap doesn't accidentally create a delivery
  //    route for home-delivery members. Driver app supports other
  //    days too but only via explicit Mon/Thu wholesale flows.
  let homeDeliveryStops: Array<{ member_id: string }> = [];
  if (weekday === 'Wed') {
    type MemberRow = {
      id: string;
      legacy_id: string | null;
      delivery_address: string | null;
      pickup_location_id: string | null;
      status: string;
    };
    const { data: hd, error: hdErr } = await supabase
      .from('members')
      .select('id, legacy_id, delivery_address, pickup_location_id, status')
      .eq('status', 'active')
      .is('pickup_location_id', null)
      .not('delivery_address', 'is', null)
      .overrideTypes<MemberRow[], { merge: false }>();

    if (hdErr) {
      console.error('[api/admin/route] home-delivery member fetch failed:', hdErr.message);
      return { error: 'fetch_failed' };
    }
    // Defensive: require delivery_address to actually have content.
    homeDeliveryStops = (hd ?? [])
      .filter((m) => m.delivery_address && m.delivery_address.trim().length > 0)
      .sort((a, b) => (a.legacy_id ?? a.id).localeCompare(b.legacy_id ?? b.id))
      .map((m) => ({ member_id: m.id }));
  }

  return { hostStops, homeDeliveryStops };
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return jsonResponse({ ok: false, error: 'forbidden' }, 403);
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  const today = todayET();
  const weekday = todayWeekdayET();
  const supabase = locals.supabase;

  // 1. If today's route already exists, return 409 with the existing id.
  //    We DO NOT touch existing rows — auto-seed is INSERT-only.
  type ExistingRoute = { id: string; status: string; total_stops: number };
  const { data: existing, error: existErr } = await supabase
    .from('delivery_routes')
    .select('id, status, total_stops')
    .eq('route_date', today)
    .limit(1)
    .maybeSingle()
    .overrideTypes<ExistingRoute, { merge: false }>();

  if (existErr) {
    console.error('[api/admin/route] existence check failed:', existErr.message);
    return jsonResponse({ ok: false, error: 'fetch_failed' }, 500);
  }
  if (existing) {
    return jsonResponse(
      { ok: false, error: 'route_exists', route_id: existing.id, status: existing.status },
      409
    );
  }

  // 2. Build the seed plan from active pickup_locations + members.
  const plan = await buildSeedPlan(supabase, weekday);
  if ('error' in plan) {
    return jsonResponse({ ok: false, error: plan.error }, 500);
  }
  const totalStops = plan.hostStops.length + plan.homeDeliveryStops.length;

  if (totalStops === 0) {
    return jsonResponse(
      {
        ok: false,
        error: 'no_stops_for_weekday',
        weekday,
        message: `No active host or home-delivery stops for ${weekday}.`,
      },
      400
    );
  }

  // 3. Insert the route header.
  const driverName = locals.user?.email === 'todd@tinyseedfarmpgh.com' ? 'Todd' : 'Driver';
  type RouteRow = Database['public']['Tables']['delivery_routes']['Row'];
  const { data: newRoutes, error: routeErr } = await supabase
    .from('delivery_routes')
    .insert({
      route_date: today,
      driver_id: locals.user?.id ?? null,
      driver_name: driverName,
      status: 'planned',
    })
    .select('id, route_date, driver_name, status, total_stops, completed_stops')
    .overrideTypes<RouteRow[], { merge: false }>();

  if (routeErr || !newRoutes || newRoutes.length === 0) {
    console.error('[api/admin/route] route insert failed:', routeErr?.message);
    return jsonResponse({ ok: false, error: 'insert_failed' }, 500);
  }
  const route = newRoutes[0]!;

  // 4. Insert stops in order. We do a single batch INSERT so the
  //    audit trigger fires once per row + the recompute_route_totals
  //    trigger only does N+1 work (better than N round-trips).
  //
  //    We pre-validate the XOR invariant client-side so a malformed
  //    plan can't waste a DB round trip.
  type StopInsert = Database['public']['Tables']['delivery_stops']['Insert'];
  const rows: StopInsert[] = [];
  let order = 1;
  for (const h of plan.hostStops) {
    rows.push({
      route_id: route.id,
      pickup_location_id: h.pickup_location_id,
      stop_order: order++,
      scheduled_time: h.scheduled_time,
      status: 'pending',
    });
  }
  for (const hd of plan.homeDeliveryStops) {
    rows.push({
      route_id: route.id,
      member_id: hd.member_id,
      stop_order: order++,
      status: 'pending',
    });
  }

  // Belt-and-suspenders XOR check before INSERT.
  for (const r of rows) {
    const hasLoc = !!r.pickup_location_id;
    const hasMem = !!r.member_id;
    if (hasLoc === hasMem) {
      console.error('[api/admin/route] XOR violation in plan:', r);
      // Roll back the route insert — if this happens, the DB CHECK
      // would catch it too, but we'd rather catch here cleanly.
      await supabase.from('delivery_routes').delete().eq('id', route.id);
      return jsonResponse({ ok: false, error: 'invalid_plan_xor' }, 500);
    }
  }

  const { error: stopsErr } = await supabase.from('delivery_stops').insert(rows);
  if (stopsErr) {
    console.error('[api/admin/route] stops insert failed:', stopsErr.message);
    // Roll back the route — leave the DB clean.
    await supabase.from('delivery_routes').delete().eq('id', route.id);
    return jsonResponse({ ok: false, error: 'stops_insert_failed' }, 500);
  }

  return jsonResponse({
    ok: true,
    route,
    stops_created: rows.length,
    host_stops: plan.hostStops.length,
    home_delivery_stops: plan.homeDeliveryStops.length,
  });
};
