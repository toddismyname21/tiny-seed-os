/**
 * load-order.ts — TRUCK LOAD NUMBERING for pack day (Todd 2026-07).
 *
 * Todd's pack-day flow (CSA day = Wednesday): optimize route → auto-save → print
 * box labels → pack sheet → pack check → truck sheet. He needs the stops NUMBERED
 * in REVERSE route order so the crew can LOAD each truck LIFO:
 *   - the LAST stop of a leg's delivery route is loaded FIRST (deepest);
 *   - the FIRST stop of the leg is loaded LAST (nearest the door, first out).
 *
 * This module turns the week's SAVED, optimized route(s) — the same
 * delivery_routes / delivery_stops the planner's optimize+save writes, read via
 * saved-route.ts `loadWeekRoutes` — into a numbered LOAD ORDER that every pack
 * surface shares (labels, pack-sheet, pack-check, pack-load truck sheets, and
 * the wholesale crate labels). WHOLESALE stops are included in the numbering so
 * the crew knows where the Monday-printed wholesale boxes go on the truck.
 *
 * ── PER-LEG numbering (Todd 2026-07, supersedes the earlier global run) ───────
 * A week can hold two route legs ('A' and 'B' — two trucks / two runs). Each
 * truck LOADS INDEPENDENTLY, so each leg is numbered on ITS OWN:
 *   - routeSeq: the leg's drive order   (1 = the leg's FIRST drive stop).
 *   - loadSeq:  the leg's LOAD order    (1 = load FIRST = the leg's LAST drive
 *               stop). loadSeq = legTotal - (routeSeq - 1)  — reverse WITHIN the
 *               leg, NOT across legs.
 * So leg A is 1..n and leg B restarts at 1..m. Every surface reads these same
 * per-leg numbers, so a box's "🚚 A-3" pill, its pack-check sheet, its pack-sheet
 * row, and its slot on the Route A truck sheet all agree — ONE numbering truth.
 *
 * The shared `stops` list is ordered LEG-then-LOAD (leg A load-first … load-last,
 * then leg B): exactly the order the crew packs+stacks across the whole day (each
 * truck's pile built LIFO in turn). `legGroups` exposes the same, split per leg,
 * for the truck sheet's one-page-per-leg print.
 *
 * Fail-soft: NO saved route for the week → buildLoadOrder/getLoadOrder return
 * null, and every surface renders exactly as before. The load numbers are a pure
 * ADDITIVE overlay.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { loadWeekRoutes, type WeekRoutes } from './saved-route';

/** Stop kind, mirrored from saved-route (pickup location / home member /
 *  wholesale restaurant / ad-hoc manual stop). */
export type LoadStopKind = 'pickup' | 'home' | 'wholesale' | 'manual';

export interface LoadStop {
  /** The saved-route orderKey — the join key every surface maps to:
   *    pickup    → 'pl:'     + pickup_location_id
   *    home      → 'cust:'   + customer_id
   *    wholesale → 'wc:'     + wholesale customer_id (customers.id)
   *    manual    → 'manual:' + route_manual_stops.id */
  key: string;
  name: string;
  kind: LoadStopKind;
  address: string | null;
  /** 'A' | 'B' — which route leg this stop belongs to. */
  leg: string;
  /** 1 = the leg's FIRST drive stop (restarts per leg). */
  routeSeq: number;
  /** 1 = load FIRST within this leg (= the leg's LAST drive stop); reverse of
   *  routeSeq WITHIN the leg. Restarts per leg. */
  loadSeq: number;
  /** Number of numbered stops in THIS stop's leg (the N in "of N"). */
  legTotal: number;
}

/** One route leg's stops, ordered LOAD-FIRST first — the truck sheet prints one
 *  page per leg from this. */
export interface LoadLeg {
  leg: string;
  /** Stops in this leg, ordered by loadSeq ASC (load-first at top). */
  stops: LoadStop[];
  /** Number of stops in the leg. */
  total: number;
}

export interface LoadOrder {
  /** All stops sorted LEG-then-LOAD (leg A load-first…load-last, then leg B).
   *  This is the order the crew packs boxes across the whole day. */
  stops: LoadStop[];
  /** Per-leg groups (each load-first first). pack-load prints one page per leg. */
  legGroups: LoadLeg[];
  /** Total numbered stops across all legs (grand total). Per-leg surfaces use
   *  each stop's `legTotal` instead. */
  total: number;
  /** Distinct leg letters present, sorted (e.g. ['A'] or ['A','B']). */
  legs: string[];
  /** Convenience: legs.length. When > 1, surfaces show the leg letter. */
  legCount: number;
  /** orderKey → LoadStop, for direct lookups by any surface. */
  byKey: Map<string, LoadStop>;
  /** Lookup a CSA pickup stop by its pickup_location_id. */
  pickup(pickupLocationId: string): LoadStop | null;
  /** Lookup a home-delivery stop by the member's customer_id. */
  home(customerId: string): LoadStop | null;
  /** Lookup a wholesale stop by the restaurant's linked customers.id. */
  wholesaleCustomer(customerId: string): LoadStop | null;
  /** A single monotonic sort value for a stop key that respects LEG-then-LOAD
   *  order: legRank * 1e6 + loadSeq. Absent keys → +Infinity (sort to the end).
   *  Every ordering surface (labels, pack-sheet, pack-check) sorts by this so
   *  they share ONE sequence. */
  orderValue(key: string): number;
}

/**
 * Build a LoadOrder from an already-loaded WeekRoutes (no extra query). Surfaces
 * that already call loadWeekRoutes (e.g. /admin/labels) use this to avoid a
 * second read; everything else uses getLoadOrder below.
 *
 * Returns null when there is no saved route OR the route has zero stops.
 */
export function buildLoadOrder(routes: WeekRoutes): LoadOrder | null {
  if (!routes.hasSavedRoute) return null;

  // Flatten every leg's stops in route order (route_date → leg → stop_order,
  // already applied by loadWeekRoutes), deduped by orderKey keeping the FIRST
  // occurrence — matches saved-route's orderOf semantics. Group by LEG LETTER so
  // each truck is numbered independently. (Two dates sharing a leg letter, e.g.
  // Wed-A + Sat-A, merge into one 'A' pile — consistent with the A/B mental
  // model every surface already shows.)
  const seen = new Set<string>();
  const perLeg = new Map<string, Array<{ key: string; name: string; kind: LoadStopKind; address: string | null }>>();
  const legOrder: string[] = []; // first-seen leg order (already A before B)
  for (const leg of routes.legs) {
    let bucket = perLeg.get(leg.leg);
    if (!bucket) { bucket = []; perLeg.set(leg.leg, bucket); legOrder.push(leg.leg); }
    for (const s of leg.stops) {
      if (seen.has(s.orderKey)) continue;
      seen.add(s.orderKey);
      bucket.push({ key: s.orderKey, name: s.name, kind: s.kind, address: s.address });
    }
  }

  // Number each leg on its own: routeSeq 1..n (drive order); loadSeq = legTotal -
  // i (reverse within the leg → 1 loads first/deepest, legTotal loads at door).
  const legGroups: LoadLeg[] = [];
  const allStops: LoadStop[] = [];
  const sortedLegs = legOrder.slice().sort((a, b) => a.localeCompare(b));
  for (const legLetter of sortedLegs) {
    const items = perLeg.get(legLetter) ?? [];
    const legTotal = items.length;
    if (legTotal === 0) continue;
    const legStops: LoadStop[] = items.map((o, i) => ({
      key: o.key,
      name: o.name,
      kind: o.kind,
      address: o.address,
      leg: legLetter,
      routeSeq: i + 1,
      loadSeq: legTotal - i,
      legTotal,
    }));
    const byLoad = legStops.slice().sort((a, b) => a.loadSeq - b.loadSeq);
    legGroups.push({ leg: legLetter, stops: byLoad, total: legTotal });
    allStops.push(...legStops);
  }

  const total = allStops.length;
  if (total === 0) return null;

  const byKey = new Map<string, LoadStop>();
  for (const s of allStops) byKey.set(s.key, s);

  const legs = legGroups.map((g) => g.leg);
  const legRank = new Map<string, number>();
  legs.forEach((l, i) => legRank.set(l, i));

  // Shared list, LEG-then-LOAD (each legGroup is already load-first-first).
  const shared = legGroups.flatMap((g) => g.stops);

  const orderValue = (key: string): number => {
    const s = byKey.get(key);
    if (!s) return Number.POSITIVE_INFINITY;
    return (legRank.get(s.leg) ?? 0) * 1_000_000 + s.loadSeq;
  };

  return {
    stops: shared,
    legGroups,
    total,
    legs,
    legCount: legs.length,
    byKey,
    pickup: (id) => byKey.get('pl:' + id) ?? null,
    home: (id) => byKey.get('cust:' + id) ?? null,
    wholesaleCustomer: (id) => byKey.get('wc:' + id) ?? null,
    orderValue,
  };
}

/**
 * Read the week's saved optimized route(s) and return the shared LOAD ORDER, or
 * null when no route is saved (fail-soft — surfaces render unchanged).
 */
export async function getLoadOrder(
  supabase: SupabaseClient<Database>,
  weekStarting: string,
): Promise<LoadOrder | null> {
  const routes = await loadWeekRoutes(supabase, weekStarting);
  return buildLoadOrder(routes);
}

/** Format a load range for a multi-stop section (e.g. a live pack-load home card
 *  that spans several individually-numbered truck positions): "#3" when a single
 *  position, "#3–9" across a span. Only meaningful WITHIN one leg (loadSeq
 *  restarts per leg). */
export function formatLoadRange(loadSeqs: number[]): string | null {
  if (loadSeqs.length === 0) return null;
  const lo = Math.min(...loadSeqs);
  const hi = Math.max(...loadSeqs);
  return lo === hi ? `#${lo}` : `#${lo}–${hi}`;
}

/** The pack-day pill/badge text for a stop: "A-3" (leg letter + the leg's own
 *  load number). Used on labels + wholesale crate labels so a box's pill matches
 *  its slot on the Route A/B truck sheet. */
export function loadTag(stop: LoadStop): string {
  return `${stop.leg}-${stop.loadSeq}`;
}
