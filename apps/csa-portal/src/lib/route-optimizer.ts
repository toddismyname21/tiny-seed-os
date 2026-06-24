/**
 * route-optimizer.ts — automatic delivery-route optimization.
 *
 * Single vehicle, depot loop (farm → stops → farm), least total DRIVE TIME with
 * no backtracking, time-window aware (e.g. Black Radish must be delivered by
 * 3 PM). Uses the Google Routes API `computeRouteMatrix` for REAL Pittsburgh
 * road drive-times (rivers/bridges make straight-line useless here), then a
 * nearest-neighbor + 2-opt solver — optimal-grade at this stop count (~15-25),
 * single REST call, ~$0.002/run.
 *
 * Auth: the Routes + Geocoding APIs accept the API KEY (the Route Optimization
 * VRP product does NOT — it needs a service account; we don't use it). Key is
 * read from astro:env/server by the caller and passed in.
 *
 * Stops on a day = CSA pickup locations (1 waypoint each, already geocoded) +
 * each home-delivery member (their address) + each wholesale restaurant
 * (their address). Home + wholesale are geocoded on the fly (cheap, cached by
 * Google). The depot (the farm) is always index 0.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { resolveCycle } from './cycle';

/** The farm — start AND end of every route (Rochester, confirmed by Todd). */
export const DEPOT = { name: 'Farm (Rochester)', lat: 40.7456252, lng: -80.1610368 };

export type StopKind = 'csa' | 'home' | 'wholesale';

export interface RouteStop {
  /** Stable key for toggling a stop off: pickup stop_id | customer_id | account_id. */
  key: string;
  name: string;
  lat: number;
  lng: number;
  kind: StopKind;
  /** Unload/service time at this stop, seconds. */
  serviceSec: number;
  /** Hard "deliver by" cutoff in seconds-from-midnight, if any (e.g. 3 PM = 54000). */
  windowEndSec?: number;
  /** Short detail for the UI (box counts, etc.). */
  detail?: string;
  /** The delivery_stops target FK this stop saves to (for "Save & send to
   *  driver"). Exactly one column per the delivery_stops_target_xor CHECK. */
  ref?: { col: 'pickup_location_id' | 'member_id' | 'wholesale_customer_id'; id: string };
}

export interface OptimizedStop extends RouteStop {
  /** Drive seconds from the previous stop. */
  legSec: number;
  /** Cumulative arrival time (seconds from the route start time). */
  arrivalSec: number;
  /** True if a windowEndSec exists and arrival is AFTER it. */
  windowViolated: boolean;
}

export interface OptimizeResult {
  stops: OptimizedStop[];
  totalDriveSec: number;
  totalServiceSec: number;
  /** A Google Maps directions URL covering the whole loop (one-tap nav). */
  mapsUrl: string;
  warnings: string[];
  /** Drive-time matrix (seconds) over [depot, ...inputStops] so the client can
   *  recompute ETAs/totals instantly on a MANUAL drag-reorder — no re-call. */
  matrix: number[][];
  /** keys[0] = '__depot__'; keys[i] = the stop.key at matrix index i. */
  keys: string[];
}

const SERVICE = { csa: 300, home: 60, wholesale: 300 }; // 5 min / 1 min / 5 min
const DEFAULT_START_SEC = 9 * 3600; // 9:00 AM

// ─── Google calls (API key) ─────────────────────────────────────────
async function geocode(address: string, key: string): Promise<{ lat: number; lng: number } | null> {
  const r = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`,
  );
  const d: any = await r.json();
  if (d.status !== 'OK' || !d.results?.[0]) return null;
  const l = d.results[0].geometry.location;
  return { lat: l.lat, lng: l.lng };
}

/** NxN drive-time matrix (seconds) for [depot, ...stops] via the Routes API. */
async function computeMatrix(
  pts: { lat: number; lng: number }[],
  key: string,
): Promise<number[][]> {
  const wp = (p: { lat: number; lng: number }) => ({
    waypoint: { location: { latLng: { latitude: p.lat, longitude: p.lng } } },
  });
  const r = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
    method: 'POST',
    headers: {
      'X-Goog-Api-Key': key,
      'Content-Type': 'application/json',
      'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,condition',
    },
    body: JSON.stringify({ origins: pts.map(wp), destinations: pts.map(wp), travelMode: 'DRIVE' }),
  });
  const d: any = await r.json();
  if (!r.ok) throw new Error('Routes matrix failed: ' + JSON.stringify(d).slice(0, 300));
  const n = pts.length;
  const m = Array.from({ length: n }, () => Array(n).fill(Infinity));
  for (const e of d) {
    const sec = e.duration ? parseInt(String(e.duration).replace('s', ''), 10) : Infinity;
    m[e.originIndex][e.destinationIndex] = e.condition === 'ROUTE_EXISTS' ? sec : Infinity;
  }
  for (let i = 0; i < n; i++) m[i][i] = 0;
  return m;
}

// ─── Solver (time-window-aware NN + 2-opt) ───────────────────────────
// Cost of an order = total drive seconds + a heavy penalty for any stop whose
// arrival (start time + cumulative drive + service of earlier stops) is AFTER
// its hard window. This makes 2-opt honor "deliver by 3 PM" while otherwise
// minimizing drive time. Matrix index 0 = depot; `order` lists stop indices
// (1..n-1) in visit order; the loop returns to depot at the end.
const WINDOW_PENALTY = 1e7;

function orderCost(
  order: number[],
  m: number[][],
  stops: RouteStop[],
  startSec: number,
): number {
  let drive = 0;
  let t = startSec;
  let prev = 0;
  let penalty = 0;
  for (const i of order) {
    const leg = m[prev][i];
    drive += leg;
    t += leg;
    const s = stops[i - 1];
    if (s.windowEndSec != null && t > s.windowEndSec) penalty += WINDOW_PENALTY + (t - s.windowEndSec);
    t += s.serviceSec;
    prev = i;
  }
  drive += m[prev][0];
  return drive + penalty;
}

function solve(m: number[][], stops: RouteStop[], startSec: number): number[] {
  const n = m.length;
  // Nearest-neighbor seed from the depot.
  const unvisited = new Set<number>();
  for (let i = 1; i < n; i++) unvisited.add(i);
  let order: number[] = [];
  let cur = 0;
  while (unvisited.size) {
    let best = -1;
    let bd = Infinity;
    for (const j of unvisited) if (m[cur][j] < bd) { bd = m[cur][j]; best = j; }
    order.push(best);
    unvisited.delete(best);
    cur = best;
  }
  // 2-opt to convergence.
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 1000) {
    improved = false;
    for (let i = 0; i < order.length - 1; i++) {
      for (let k = i + 1; k < order.length; k++) {
        const cand = order.slice(0, i).concat(order.slice(i, k + 1).reverse(), order.slice(k + 1));
        if (orderCost(cand, m, stops, startSec) < orderCost(order, m, stops, startSec) - 1e-6) {
          order = cand;
          improved = true;
        }
      }
    }
  }
  return order;
}

/** A Google Maps directions deep-link for the full loop (one tap on the phone). */
export function googleMapsRouteUrl(ordered: { lat: number; lng: number }[]): string {
  const o = `${DEPOT.lat},${DEPOT.lng}`;
  const waypoints = ordered.map((p) => `${p.lat},${p.lng}`).join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${o}&travelmode=driving&waypoints=${encodeURIComponent(waypoints)}`;
}

// ─── Gather the stops for a delivery day ─────────────────────────────
/**
 * Build the stop list for a delivery day from the resolved cycle:
 *   - CSA pickup locations active that day (already geocoded);
 *   - home deliveries (Wed) — one per household, geocoded from delivery_address;
 *   - wholesale restaurants with an order that day — geocoded from address.
 * Black Radish gets a hard 3 PM window. Stops with no resolvable coordinates
 * are dropped and reported.
 */
export async function gatherDayStops(
  supabase: SupabaseClient<Database>,
  weekStarting: string,
  day: 'Tue' | 'Wed' | 'Sat',
  key: string,
): Promise<{ stops: RouteStop[]; skipped: string[] }> {
  const cycle: any = await resolveCycle(supabase, weekStarting);
  const stops: RouteStop[] = [];
  const skipped: string[] = [];
  const deliveryDate: string = cycle.distribution_dates[day];

  // 1) CSA pickup locations (coords already in the table).
  const { data: locs } = await supabase
    .from('pickup_locations')
    .select('id, name, coordinates_lat, coordinates_lng');
  const locById = new Map((locs ?? []).map((l: any) => [l.id, l]));
  for (const s of cycle.activeStops) {
    if (s.day_of_week !== day) continue;
    if (s.stop_id === 'home_delivery' || s.stop_id === 'no_pickup_set') continue;
    const L: any = locById.get(s.stop_id);
    if (!L?.coordinates_lat) { skipped.push(`${s.stop_name} (no coordinates)`); continue; }
    stops.push({
      key: s.stop_id,
      name: s.stop_name,
      lat: +L.coordinates_lat,
      lng: +L.coordinates_lng,
      kind: 'csa',
      serviceSec: SERVICE.csa,
      detail: `${s.boxes_small + s.boxes_large} boxes`,
      ref: { col: 'pickup_location_id', id: s.stop_id },
    });
  }

  // 2) Home deliveries (the resolver buckets these as the 'home_delivery'
  //    pseudo-stop on Wed). One waypoint per household.
  if (day === 'Wed') {
    const hd: any[] = cycle.byStop.get('home_delivery') ?? [];
    const seen = new Set<string>();
    for (const m of hd) {
      if (seen.has(m.customer_id)) continue;
      seen.add(m.customer_id);
      if (!m.delivery_address) { skipped.push(`${m.contact_name} (home, no address)`); continue; }
      const g = await geocode(m.delivery_address, key);
      if (!g) { skipped.push(`${m.contact_name} (home, geocode failed)`); continue; }
      stops.push({
        key: m.customer_id,
        name: `🏠 ${m.contact_name}`,
        lat: g.lat,
        lng: g.lng,
        kind: 'home',
        serviceSec: SERVICE.home,
        detail: 'home delivery',
        ref: { col: 'member_id', id: m.id },
      });
    }
  }

  // 3) Wholesale restaurants with an order this delivery date.
  const { data: orders } = await supabase
    .from('wholesale_orders')
    .select('account_id')
    .eq('delivery_date', deliveryDate);
  const acctIds = Array.from(new Set((orders ?? []).map((o: any) => o.account_id).filter(Boolean)));
  if (acctIds.length) {
    const { data: accts } = await supabase
      .from('wholesale_accounts')
      .select('id, restaurant_name, address, customer_id')
      .in('id', acctIds);
    for (const a of accts ?? []) {
      if (!a.address) { skipped.push(`${a.restaurant_name} (wholesale, no address)`); continue; }
      const g = await geocode(a.address, key);
      if (!g) { skipped.push(`${a.restaurant_name} (wholesale, geocode failed)`); continue; }
      const isBlackRadish = /black radish/i.test(a.restaurant_name);
      stops.push({
        key: a.id,
        name: `🍽 ${a.restaurant_name}`,
        lat: g.lat,
        lng: g.lng,
        kind: 'wholesale',
        serviceSec: SERVICE.wholesale,
        windowEndSec: isBlackRadish ? 15 * 3600 : undefined, // 3 PM hard for Black Radish
        detail: 'wholesale' + (isBlackRadish ? ' · by 3 PM' : ''),
        // Driver-route stops reference customers.id (the wholesale account's
        // linked customer). Skip the FK if unlinked (still routable, just not
        // saveable to a driver route).
        ref: a.customer_id ? { col: 'wholesale_customer_id', id: a.customer_id } : undefined,
      });
    }
  }

  return { stops, skipped };
}

/** Optimize a chosen set of stops into the least-drive-time depot loop. */
export async function optimizeStops(
  stops: RouteStop[],
  key: string,
  startSec: number = DEFAULT_START_SEC,
): Promise<OptimizeResult> {
  const warnings: string[] = [];
  if (stops.length === 0) {
    return { stops: [], totalDriveSec: 0, totalServiceSec: 0, mapsUrl: googleMapsRouteUrl([]), warnings: ['No stops selected.'], matrix: [], keys: [] };
  }
  const pts = [DEPOT, ...stops];
  const m = await computeMatrix(pts, key);
  const order = solve(m, stops, startSec);

  const out: OptimizedStop[] = [];
  let t = startSec;
  let prev = 0;
  let totalDrive = 0;
  let totalService = 0;
  for (const i of order) {
    const leg = m[prev][i];
    totalDrive += leg;
    t += leg;
    const s = stops[i - 1];
    const arrivalSec = t;
    const violated = s.windowEndSec != null && arrivalSec > s.windowEndSec;
    if (violated) warnings.push(`${s.name} arrives after its ${fmtClock(s.windowEndSec!)} cutoff — no order can hit it; check the stop set.`);
    out.push({ ...s, legSec: leg, arrivalSec, windowViolated: violated });
    t += s.serviceSec;
    totalService += s.serviceSec;
    prev = i;
  }
  totalDrive += m[prev][0]; // return to depot
  return {
    stops: out,
    totalDriveSec: totalDrive,
    totalServiceSec: totalService,
    mapsUrl: googleMapsRouteUrl(out.map((s) => ({ lat: s.lat, lng: s.lng }))),
    warnings,
    matrix: m,
    keys: ['__depot__', ...stops.map((s) => s.key)],
  };
}

export function fmtClock(sec: number): string {
  const h24 = Math.floor(sec / 3600) % 24;
  const mm = Math.floor((sec % 3600) / 60);
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
}
