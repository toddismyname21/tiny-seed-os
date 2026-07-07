/**
 * load-order.ts — TRUCK LOAD NUMBERING for pack day (Todd 2026-07).
 *
 * Todd's pack-day flow (CSA day = Wednesday): optimize route → print box labels
 * → pack sheet → pack check → notices. He needs the stops NUMBERED in REVERSE
 * route order so the crew can LOAD the truck LIFO:
 *   - the LAST stop of the delivery route is loaded FIRST (deepest in the truck);
 *   - the FIRST stop of the route is loaded LAST (nearest the door, first out).
 *
 * This module turns the week's SAVED, optimized route(s) — the same
 * delivery_routes / delivery_stops the planner's "Save & send to driver" writes,
 * read via saved-route.ts `loadWeekRoutes` — into a single, numbered LOAD ORDER
 * that every pack surface shares (labels, pack-sheet, pack-check, pack-load, and
 * the wholesale crate labels). WHOLESALE stops are included in the numbering so
 * the crew knows where the Monday-printed wholesale boxes go on the truck.
 *
 * ── routeSeq: the drive order (1 = first stop the driver reaches). ────────────
 * ── loadSeq:  the LOAD order  (1 = load FIRST = the LAST drive stop). ─────────
 *   loadSeq = total - routeSeq + 1  (a global reverse of routeSeq).
 *
 * ── TWO-LEG (A/B) CHOICE — documented ─────────────────────────────────────────
 * A week can hold two route legs (delivery_routes.leg 'A' and 'B' — e.g. two
 * trucks or two runs). saved-route already orders stops route_date → leg →
 * stop_order, so we CONTINUE the numbering across legs: leg A gets routeSeq
 * 1..n, leg B gets n+1..m. The LOAD order is then the single global reverse of
 * that continuous sequence: loadSeq 1 = leg B's LAST stop (loaded first/deepest),
 * loadSeq m = leg A's FIRST stop (loaded last/at the door). Each LoadStop also
 * carries its `leg`, so a crew running two physical trucks can still read the
 * leg letter on every row and split the pile. We deliberately do NOT reset the
 * count per leg: Todd wanted ONE numbered sequence ("so we know where they are
 * going"), and a single 1..m run is unambiguous when calling out box positions.
 *
 * Fail-soft: NO saved route for the week → getLoadOrder returns null, and every
 * surface renders exactly as before with a "optimize + save the route to get
 * load numbers" hint. The load numbers are a pure ADDITIVE overlay.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { loadWeekRoutes, type WeekRoutes } from './saved-route';

/** Stop kind, mirrored from saved-route (pickup location / home member /
 *  wholesale restaurant). */
export type LoadStopKind = 'pickup' | 'home' | 'wholesale';

export interface LoadStop {
  /** The saved-route orderKey — the join key every surface maps to:
   *    pickup    → 'pl:'   + pickup_location_id
   *    home      → 'cust:' + customer_id
   *    wholesale → 'wc:'   + wholesale customer_id (customers.id) */
  key: string;
  name: string;
  kind: LoadStopKind;
  address: string | null;
  /** 'A' | 'B' — which route leg this stop belongs to. */
  leg: string;
  /** 1 = first drive stop; continues across legs (A 1..n, B n+1..m). */
  routeSeq: number;
  /** 1 = load FIRST (= the LAST drive stop); global reverse of routeSeq. */
  loadSeq: number;
}

export interface LoadOrder {
  /** All stops sorted by loadSeq ASC — i.e. LOAD-FIRST at the top. This is the
   *  order the crew places boxes into the truck. */
  stops: LoadStop[];
  /** Total numbered stops across all legs (the N in "of N"). */
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
  // already applied by loadWeekRoutes). Dedupe by orderKey keeping the FIRST
  // (earliest) occurrence — matches saved-route's orderOf semantics, so a stop
  // that somehow appears twice keeps one stable position in the numbering.
  const seen = new Set<string>();
  const ordered: Array<{ key: string; name: string; kind: LoadStopKind; address: string | null; leg: string }> = [];
  for (const leg of routes.legs) {
    for (const s of leg.stops) {
      if (seen.has(s.orderKey)) continue;
      seen.add(s.orderKey);
      ordered.push({ key: s.orderKey, name: s.name, kind: s.kind, address: s.address, leg: leg.leg });
    }
  }

  const total = ordered.length;
  if (total === 0) return null;

  // routeSeq = i + 1 (drive order). loadSeq = total - i (global reverse): the
  // first drive stop (i = 0) loads LAST (loadSeq = total, at the door); the last
  // drive stop (i = total - 1) loads FIRST (loadSeq = 1, deepest).
  const stops: LoadStop[] = ordered.map((o, i) => ({
    key: o.key,
    name: o.name,
    kind: o.kind,
    address: o.address,
    leg: o.leg,
    routeSeq: i + 1,
    loadSeq: total - i,
  }));

  const byKey = new Map<string, LoadStop>();
  for (const s of stops) byKey.set(s.key, s);

  const legs = Array.from(new Set(stops.map((s) => s.leg))).sort((a, b) => a.localeCompare(b));

  // The shared list is ordered LOAD-FIRST first (loadSeq ascending).
  const byLoad = stops.slice().sort((a, b) => a.loadSeq - b.loadSeq);

  return {
    stops: byLoad,
    total,
    legs,
    legCount: legs.length,
    byKey,
    pickup: (id) => byKey.get('pl:' + id) ?? null,
    home: (id) => byKey.get('cust:' + id) ?? null,
    wholesaleCustomer: (id) => byKey.get('wc:' + id) ?? null,
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

/** Format a load range for a multi-stop section (e.g. the home-delivery bucket,
 *  which spans several individually-numbered truck positions): "#3" when a
 *  single position, "#3–9" across a span. */
export function formatLoadRange(loadSeqs: number[]): string | null {
  if (loadSeqs.length === 0) return null;
  const lo = Math.min(...loadSeqs);
  const hi = Math.max(...loadSeqs);
  return lo === hi ? `#${lo}` : `#${lo}–${hi}`;
}
