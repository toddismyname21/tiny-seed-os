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
import { todayET, todayWeekdayET, isFarmPickup } from '../../../../lib/delivery';
import { routeRank, extractZip } from '../../../../lib/route-order';
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

/**
 * One ordered stop in the seed plan. Either a host pickup stop
 * (pickup_location_id set) XOR a home-delivery member stop (member_id set) —
 * never both. `zip` is the farm-loop sort key (extracted from the location or
 * member address); `tiebreak` is a deterministic final sort label.
 */
interface SeedStop {
  pickup_location_id: string | null;
  member_id: string | null;
  scheduled_time: string | null;
  zip: string;
  tiebreak: string;
}

interface SeedPlan {
  /** Host + home-delivery stops, ALREADY ordered in farm-loop sequence. */
  stops: SeedStop[];
  /** Counts for the response payload (host vs. home delivery). */
  hostCount: number;
  homeCount: number;
}

/**
 * Build the seed plan from active pickup_locations + active members for the
 * current weekday. Pure-ish — runs DB SELECTs but no writes.
 *
 * ORDER: host stops and home-delivery member stops are merged into ONE list
 * and sorted by the CURATED FARM-LOOP sequence (lib/route-order.routeRank) —
 * the SAME order the printable route sheet (/admin/route-sheet) uses — so the
 * driver app and the printed sheet agree on stop order. We sort the COMBINED
 * list (not hosts-then-homes) so a home stop in New Brighton precedes a host
 * stop in Squirrel Hill, matching the actual drive.
 */
async function buildSeedPlan(
  supabase: SupabaseClient<Database>,
  weekday: string
): Promise<SeedPlan | { error: string }> {
  // 1. Host stops: active, delivery-zone pickup_locations on this weekday with
  //    a host_name. We pull address/city/zip so we can rank each by its
  //    farm-loop position; keep time_start as the stop's scheduled_time.
  type LocRow = {
    id: string;
    name: string;
    day_of_week: string | null;
    is_delivery_zone: boolean;
    host_name: string | null;
    time_start: string | null;
    is_active: boolean;
    address: string | null;
    city: string | null;
    zip: string | null;
  };
  // The enum in TS is narrowed to ('Sun'|'Mon'|...|'Sat'); todayWeekdayET
  // returns a string. Cast — runtime safety is guaranteed by the
  // Intl.DateTimeFormat output domain.
  type Weekday = NonNullable<Database['public']['Tables']['pickup_locations']['Row']['day_of_week']>;
  const { data: locs, error: locErr } = await supabase
    .from('pickup_locations')
    .select('id, name, day_of_week, is_delivery_zone, host_name, time_start, is_active, address, city, zip')
    .eq('day_of_week', weekday as Weekday)
    .eq('is_delivery_zone', true)
    .eq('is_active', true)
    .overrideTypes<LocRow[], { merge: false }>();

  if (locErr) {
    console.error('[api/admin/route] location fetch failed:', locErr.message);
    return { error: 'fetch_failed' };
  }

  const hostStops: SeedStop[] = (locs ?? [])
    // Must have a host_name (drop home-delivery placeholder zones) AND must
    // NOT be the farm itself — Rochester farm pickup is the ORIGIN, not a
    // truck stop (its members come TO the farm). Mirrors the route sheet.
    .filter((l) => l.host_name && l.host_name.trim().length > 0 && !isFarmPickup(l.name))
    .map((l) => {
      // Prefer the location's explicit zip column; fall back to a zip parsed
      // out of the street address (route-order's routeRank also accepts a raw
      // address, but resolving the zip here keeps the tiebreak deterministic).
      const zip = (l.zip ?? '').trim() || extractZip(l.address);
      return {
        pickup_location_id: l.id,
        member_id: null,
        scheduled_time: l.time_start,
        zip,
        tiebreak: l.name,
      } satisfies SeedStop;
    });

  // 2. Home-delivery stops: active members with NO pickup_location_id AND a
  //    delivery_address. We don't filter by weekday for these — home
  //    deliveries happen on the canonical CSA delivery day (Wed) regardless of
  //    member.pickup_day. If you're a home-delivery member, you're on
  //    Wednesday's route.
  //
  //    We only seed these on Wednesday (the canonical day) so a Saturday
  //    admin-tap doesn't accidentally create a home-delivery route. The driver
  //    app supports other days too but only via explicit Mon/Thu wholesale
  //    flows.
  let homeStops: SeedStop[] = [];
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
    // Defensive: require delivery_address to actually have content. Rank each
    // home stop by the zip parsed from its delivery_address so it interleaves
    // with host stops in farm-loop order. legacy_id is the final tiebreak so
    // two members with the same zip stay in a stable, deterministic order.
    homeStops = (hd ?? [])
      .filter((m) => m.delivery_address && m.delivery_address.trim().length > 0)
      .map((m) => ({
        pickup_location_id: null,
        member_id: m.id,
        scheduled_time: null,
        zip: extractZip(m.delivery_address),
        tiebreak: m.legacy_id ?? m.id,
      } satisfies SeedStop));
  }

  // 3. Merge BOTH kinds into one list and sort by the farm-loop sequence.
  //    routeRank maps a zip to its loop position; unknown / missing zips rank
  //    after every known zip (they land at the end of the loop, never first).
  //    Ties (same rank) fall back to zip-ascending then the tiebreak label so
  //    the order is deterministic run-to-run.
  const stops = [...hostStops, ...homeStops];
  stops.sort((a, b) => {
    const ra = routeRank(a.zip);
    const rb = routeRank(b.zip);
    if (ra !== rb) return ra - rb;
    if (a.zip !== b.zip) {
      if (!a.zip) return 1;
      if (!b.zip) return -1;
      return a.zip < b.zip ? -1 : 1;
    }
    return a.tiebreak.localeCompare(b.tiebreak);
  });

  return { stops, hostCount: hostStops.length, homeCount: homeStops.length };
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
  const totalStops = plan.stops.length;

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
  //    plan.stops is ALREADY ordered in farm-loop sequence (hosts + home
  //    deliveries interleaved by zip), so stop_order is just the index + 1.
  type StopInsert = Database['public']['Tables']['delivery_stops']['Insert'];
  const rows: StopInsert[] = [];
  let order = 1;
  for (const s of plan.stops) {
    rows.push({
      route_id: route.id,
      pickup_location_id: s.pickup_location_id,
      member_id: s.member_id,
      stop_order: order++,
      scheduled_time: s.scheduled_time,
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
    host_stops: plan.hostCount,
    home_delivery_stops: plan.homeCount,
  });
};
