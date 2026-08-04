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
  /** Street address for the UI — lets the planner SEE where a stop is when
   *  deciding Route A vs B (Todd 2026-06-24). Home + wholesale + pickup. */
  address?: string;
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

// ─── Solver (time-window-aware NN + 2-opt + Or-opt) ─────────────────
// Cost of an order = total drive seconds + a heavy penalty for any stop whose
// arrival (start time + cumulative drive + service of earlier stops) is AFTER
// its hard window. This makes the local search honor "deliver by 3 PM" while
// otherwise minimizing drive time. Matrix index 0 = depot; `order` lists stop
// indices (1..n-1) in visit order; the loop returns to depot at the end.
const WINDOW_PENALTY = 1e7;

/** Exported for the unit test. `endIndex` = matrix index the route must END at
 *  (0 = the depot loop; an OPEN route ends at e.g. the driver's home). */
export function orderCost(
  order: number[],
  m: number[][],
  stops: RouteStop[],
  startSec: number,
  endIndex = 0,
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
  drive += m[prev][endIndex];
  return drive + penalty;
}

/**
 * Solve the route order: multi-start local search with 2-opt + Or-opt.
 *
 * WHY Or-opt (added 2026-08-04, Todd): 2-opt only REVERSES segments — it is
 * structurally unable to RELOCATE a stop out of the middle of the route in
 * many configurations. The classic symptom of that gap is exactly what the
 * driver reported: "we drove PAST a stop, then doubled back to it later."
 * Or-opt tries moving every 1-, 2-, and 3-stop segment to every other
 * position (both orientations — the drive-time matrix is asymmetric on real
 * Pittsburgh roads), which repairs precisely that pattern.
 *
 * WHY multi-start: local search is path-dependent — a different move order can
 * land in a different (occasionally worse) local optimum. We therefore run the
 * combined 2-opt+Or-opt search from several starts and keep the best:
 *   1. the pure-2-opt-converged order (the OLD solver's exact result, then
 *      polished — mathematically guarantees we are never worse than before);
 *   2. the raw nearest-neighbor seed;
 *   3. three deterministic shuffles (seeded PRNG — same input, same output).
 * At our stop counts (~15–25) each search is milliseconds.
 *
 * Exported for the unit test (route-optimizer.test.ts verifies brute-force
 * optimality on small asymmetric instances + the corridor double-back case).
 */
export function solve(m: number[][], stops: RouteStop[], startSec: number, endIndex = 0): number[] {
  const cost = (o: number[]): number => orderCost(o, m, stops, startSec, endIndex);

  // Nearest-neighbor seed from the depot. Visit ONLY the stop indices
  // (1..stops.length) — the matrix may carry a trailing END node (open route)
  // which is a destination, never a stop.
  const unvisited = new Set<number>();
  for (let i = 1; i <= stops.length; i++) unvisited.add(i);
  const nn: number[] = [];
  let cur = 0;
  while (unvisited.size) {
    let best = -1;
    let bd = Infinity;
    for (const j of unvisited) if (m[cur][j] < bd) { bd = m[cur][j]; best = j; }
    nn.push(best);
    unvisited.delete(best);
    cur = best;
  }

  // One full 2-opt sweep; returns [order, improved].
  const twoOptPass = (order: number[], c0: number): [number[], number, boolean] => {
    let order2 = order;
    let c = c0;
    let improved = false;
    for (let i = 0; i < order2.length - 1; i++) {
      for (let k = i + 1; k < order2.length; k++) {
        const cand = order2.slice(0, i).concat(order2.slice(i, k + 1).reverse(), order2.slice(k + 1));
        const cc = cost(cand);
        if (cc < c - 1e-6) { order2 = cand; c = cc; improved = true; }
      }
    }
    return [order2, c, improved];
  };

  // One full Or-opt sweep (relocate 1–3-stop segments, both orientations).
  const orOptPass = (order: number[], c0: number): [number[], number, boolean] => {
    let order2 = order;
    let c = c0;
    let improved = false;
    for (let segLen = 1; segLen <= 3 && segLen < order2.length; segLen++) {
      for (let i = 0; i + segLen <= order2.length; i++) {
        const seg = order2.slice(i, i + segLen);
        const rest = order2.slice(0, i).concat(order2.slice(i + segLen));
        const variants = segLen > 1 ? [seg, [...seg].reverse()] : [seg];
        for (let j = 0; j <= rest.length; j++) {
          for (const s of variants) {
            if (j === i && s === seg) continue;
            const cand = rest.slice(0, j).concat(s, rest.slice(j));
            const cc = cost(cand);
            if (cc < c - 1e-6) { order2 = cand; c = cc; improved = true; }
          }
        }
      }
    }
    return [order2, c, improved];
  };

  const converge2opt = (start: number[]): number[] => {
    let order = start;
    let c = cost(order);
    for (let guard = 0; guard < 1000; guard++) {
      const [o2, c2, imp] = twoOptPass(order, c);
      order = o2; c = c2;
      if (!imp) break;
    }
    return order;
  };

  const convergeCombined = (start: number[]): number[] => {
    let order = start;
    let c = cost(order);
    for (let guard = 0; guard < 1000; guard++) {
      const [o2, c2, imp2] = twoOptPass(order, c);
      const [o3, c3, imp3] = orOptPass(o2, c2);
      order = o3; c = c3;
      if (!imp2 && !imp3) break;
    }
    return order;
  };

  // Deterministic PRNG for reproducible shuffle starts (mulberry32).
  let seed = 0x9e3779b9 ^ stops.length;
  const rand = (): number => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const shuffled = (): number[] => {
    const a = [...nn];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const starts: number[][] = [converge2opt([...nn]), [...nn], shuffled(), shuffled(), shuffled()];
  let best: number[] = starts[0];
  let bestCost = Infinity;
  for (const s of starts) {
    const o = convergeCombined(s);
    const c = cost(o);
    if (c < bestCost) { best = o; bestCost = c; }
  }
  return best;
}

/** A Google Maps directions deep-link for the full loop (one tap on the phone). */
export function googleMapsRouteUrl(
  ordered: { lat: number; lng: number }[],
  end?: { lat: number; lng: number },
): string {
  const o = `${DEPOT.lat},${DEPOT.lng}`;
  const dest = end ? `${end.lat},${end.lng}` : o;
  const waypoints = ordered.map((p) => `${p.lat},${p.lng}`).join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${dest}&travelmode=driving&waypoints=${encodeURIComponent(waypoints)}`;
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
    .select('id, name, address, city, coordinates_lat, coordinates_lng');
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
      address: [L.address, L.city].filter(Boolean).join(', ') || undefined,
      ref: { col: 'pickup_location_id', id: s.stop_id },
    });
  }

  // 2) Home deliveries (the resolver buckets these as the 'home_delivery'
  //    pseudo-stop on Wed). One waypoint per household.
  if (day === 'Wed') {
    const hd: any[] = cycle.byStop.get('home_delivery') ?? [];
    // A household can have SEVERAL rows in the home_delivery bucket: the box
    // (summer_veg) row that carries the delivery_address, PLUS any add-ons that
    // ride to the same stop. Add-on rows carry a null delivery_address. So we
    // must NOT dedupe by "first row seen per customer" — if a null-address
    // add-on came first, the whole household was wrongly skipped as "(home, no
    // address)" even though the box row has the address (Todd 2026-06-24:
    // Martina/Stephanie/Carla). Group by customer and pick the row that
    // actually HAS an address (prefer the box row), only reporting "no address"
    // when NO row for that household carries one.
    const rowsByCustomer = new Map<string, any[]>();
    for (const m of hd) {
      const arr = rowsByCustomer.get(m.customer_id);
      if (arr) arr.push(m);
      else rowsByCustomer.set(m.customer_id, [m]);
    }

    // ── Not-routable exclusion (migration 0062) ──────────────────────
    // A home-delivery customer can be flagged customers.routable = false to
    // mean "deliver by hand, NOT optimized" (ungeocodable spot, one-off, etc.).
    // We drop those from the optimizer's stop set here — STRICTLY additive:
    // every existing customer defaults to routable = true, so with no flags set
    // this query removes nothing and the stop set is identical to before. Only
    // a customer explicitly set to false is excluded. They still appear on the
    // route planner as a manual / not-routable stop (rendered separately).
    const customerIds = Array.from(rowsByCustomer.keys());
    const notRoutable = new Set<string>();
    if (customerIds.length) {
      const { data: flags } = await supabase
        .from('customers')
        .select('id, routable')
        .in('id', customerIds)
        .eq('routable', false);
      for (const c of flags ?? []) notRoutable.add(c.id);
    }

    for (const [customer_id, rows] of rowsByCustomer) {
      if (notRoutable.has(customer_id)) continue; // manual stop, not optimized
      const rep =
        rows.find((r) => r.delivery_address && r.share_type === 'summer_veg') ??
        rows.find((r) => r.delivery_address) ??
        rows[0];
      if (!rep.delivery_address) { skipped.push(`${rep.contact_name} (home, no address)`); continue; }
      const g = await geocode(rep.delivery_address, key);
      if (!g) { skipped.push(`${rep.contact_name} (home, geocode failed)`); continue; }
      stops.push({
        key: customer_id,
        name: `🏠 ${rep.contact_name}`,
        lat: g.lat,
        lng: g.lng,
        kind: 'home',
        serviceSec: SERVICE.home,
        detail: 'home delivery',
        address: rep.delivery_address,
        ref: { col: 'member_id', id: rep.id },
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
        address: a.address,
        // Driver-route stops reference customers.id (the wholesale account's
        // linked customer). Skip the FK if unlinked (still routable, just not
        // saveable to a driver route).
        ref: a.customer_id ? { col: 'wholesale_customer_id', id: a.customer_id } : undefined,
      });
    }
  }

  return { stops, skipped };
}

// ─── Manual / not-routable stops (reference only — NOT optimized) ────
/** A hand-delivered stop shown on the planner but never fed to the optimizer. */
export interface ManualStop {
  /** customers.id | wholesale_accounts.id — for the routable toggle. */
  id: string;
  kind: 'home' | 'wholesale';
  name: string;
  address: string;
  phone: string | null;
  /** Only home/customer manual stops can be toggled back to routable. */
  toggleable: boolean;
}

/**
 * Build the MANUAL / not-routable stops list for the route planner. These are
 * deliberately EXCLUDED from the optimizer and shown so the driver still sees
 * them (deliver by hand):
 *   (a) customers flagged routable = false who are active home-delivery members
 *       (delivery_address set, no pickup_location) — toggleable back to routable;
 *   (b) wholesale accounts that have an address (e.g. EYV @ 424 E Ohio St) —
 *       these are inherently off the CSA optimizer (it only routes wholesale
 *       accounts that have an ORDER on the delivery date) but the driver may
 *       still hand-deliver. Reference only, not toggleable.
 *
 * Pure reference: this NEVER feeds optimizeStops — it's a separate read.
 */
export async function gatherManualStops(
  supabase: SupabaseClient<Database>,
): Promise<ManualStop[]> {
  const out: ManualStop[] = [];

  // (a) Home-delivery customers explicitly flagged not-routable.
  const { data: notRoutable } = await supabase
    .from('customers')
    .select('id, contact_name, address, phone, routable')
    .eq('routable', false);
  const flaggedIds = (notRoutable ?? []).map((c) => c.id);
  if (flaggedIds.length) {
    // Confirm each flagged customer is actually an active home-delivery member
    // (has a delivery_address + no pickup_location) — those are the ones the
    // optimizer would otherwise have routed. Prefer the member's
    // delivery_address; fall back to the customer's own address.
    const { data: mems } = await supabase
      .from('members')
      .select('customer_id, delivery_address, pickup_location_id, status')
      .in('customer_id', flaggedIds)
      .eq('status', 'active');
    const homeAddrByCustomer = new Map<string, string>();
    for (const m of mems ?? []) {
      if (m.delivery_address && !m.pickup_location_id && !homeAddrByCustomer.has(m.customer_id)) {
        homeAddrByCustomer.set(m.customer_id, m.delivery_address);
      }
    }
    for (const c of notRoutable ?? []) {
      const addr = homeAddrByCustomer.get(c.id) ?? c.address ?? '';
      if (!homeAddrByCustomer.has(c.id)) continue; // not an active home-delivery member
      out.push({
        id: c.id,
        kind: 'home',
        name: c.contact_name,
        address: addr,
        phone: c.phone,
        toggleable: true,
      });
    }
  }

  // (b) Wholesale accounts with an address (inherently off the CSA optimizer).
  const { data: accts } = await supabase
    .from('wholesale_accounts')
    .select('id, restaurant_name, address, phone')
    .not('address', 'is', null);
  for (const a of accts ?? []) {
    const addr = String(a.address ?? '').trim();
    if (!addr) continue;
    out.push({
      id: a.id,
      kind: 'wholesale',
      name: a.restaurant_name,
      address: addr,
      phone: a.phone,
      toggleable: false,
    });
  }

  out.sort((x, y) => (x.kind === y.kind ? x.name.localeCompare(y.name) : x.kind === 'home' ? -1 : 1));
  return out;
}

/** Optimize a chosen set of stops into the least-drive-time depot loop. */
export async function optimizeStops(
  stops: RouteStop[],
  key: string,
  startSec: number = DEFAULT_START_SEC,
  /** Optional OPEN-route end address (e.g. the driver keeps the truck at home
   *  overnight — Todd 2026-08-04, Route A ends at the driver's house in
   *  Lawrenceville instead of looping back to the farm). Geocoded on the fly;
   *  when unset the route is the classic farm→stops→farm loop. */
  endAddress?: string,
): Promise<OptimizeResult> {
  const warnings: string[] = [];
  if (stops.length === 0) {
    return { stops: [], totalDriveSec: 0, totalServiceSec: 0, mapsUrl: googleMapsRouteUrl([]), warnings: ['No stops selected.'], matrix: [], keys: [] };
  }
  let endPt: { lat: number; lng: number } | null = null;
  if (endAddress) {
    endPt = await geocode(endAddress, key);
    if (!endPt) warnings.push(`Couldn't geocode route end "${endAddress}" — falling back to the farm loop.`);
  }
  const pts = endPt ? [DEPOT, ...stops, endPt] : [DEPOT, ...stops];
  const m = await computeMatrix(pts, key);
  const endIndex = endPt ? pts.length - 1 : 0;
  const order = solve(m, stops, startSec, endIndex);

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
  totalDrive += m[prev][endIndex]; // close the route: farm loop OR the open end
  if (endPt && endAddress) warnings.push(`Route ends at ${endAddress} (open route — no return to the farm).`);
  return {
    stops: out,
    totalDriveSec: totalDrive,
    totalServiceSec: totalService,
    mapsUrl: googleMapsRouteUrl(out.map((s) => ({ lat: s.lat, lng: s.lng })), endPt ?? undefined),
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
