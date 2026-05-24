/**
 * Delivery tracking — V2 native Supabase (Day 9, 2026-05-11).
 *
 * Replaces the Apps Script bridge that shipped in V1. The wholesale
 * driver app never landed a write to `SALES_DeliveryStops` (0 rows live
 * as of 2026-05-11), so there was nothing to bridge to. Per Todd's
 * 2026-05-11 decision, we now read directly from the new Supabase
 * tables `delivery_routes` + `delivery_stops` (migration 0019).
 *
 * The module:
 *   - Exposes the canonical DeliveryStatus shape consumed by
 *     <DeliveryTracker.astro>.
 *   - Provides `deriveState(stop, route, allStops)` — PURE function
 *     that maps a (stop, route, route-stop-list) triple into one of
 *     seven widget states.
 *   - Provides `fetchDeliveryStatus(supabase, customerId, now)` — does
 *     the Supabase queries and returns a DeliveryStatus ready for SSR.
 *   - Keeps `shouldShowTracker` semantically unchanged so dashboard.astro
 *     can keep its existing gate logic.
 *
 * The Apps Script export `APPS_SCRIPT_URL` is REMOVED — this module has
 * zero Apps Script dependencies per the V2 spec.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { supabaseAdmin } from './supabase';
import { signProofUrl } from './delivery-proof';

/* ──────────────────────────────────────────────────────────────────
 * Public types
 * ────────────────────────────────────────────────────────────────── */

/**
 * The seven states the dashboard widget can be in. Maps 1:1 to the
 * "States (7)" table in the spec:
 *   not_today        → caller filters; we render 'none' when the gate
 *                      hides the widget. (Compat with V1 'none'.)
 *   packed           → delivery day, route exists but planned/not started.
 *   out_for_delivery → route in_progress, this stop pending/out_for_delivery.
 *   near_you         → next 1-2 stops on an in-progress route.
 *   arrived          → driver is physically at this stop.
 *   delivered        → stop.status === 'completed'.
 *   exception        → stop.status === 'exception'.
 *
 * V1 also had 'issue' — we keep that as an alias for 'exception' on the
 * client wire format so the existing widget JSX doesn't need to learn a
 * new state name. The component renders 'exception' the same way it
 * used to render 'issue'.
 */
export type DeliveryState =
  | 'none'
  | 'packed'
  | 'out_for_delivery'
  | 'near_you'
  | 'arrived'
  | 'delivered'
  | 'exception';

/**
 * Normalized status snapshot for one member's delivery on one day.
 * Output contract of this module — what the widget consumes.
 */
export interface DeliveryStatus {
  state: DeliveryState;
  /** Stop id (for Realtime subscription filtering). Null when state='none'. */
  stop_id: string | null;
  /** Route id (for Realtime subscription filtering). Null when state='none'. */
  route_id: string | null;
  /** ISO-8601 timestamp OR HH:MM string. */
  eta: string | null;
  /** First-name only — e.g. "Todd", never "Todd Wilson". */
  driver_name: string | null;
  /** ISO timestamp when admin tapped Delivered. */
  completed_at: string | null;
  /**
   * Short-lived SIGNED Storage URL for the proof-of-delivery photo, or
   * null. The bucket is PRIVATE (migration 0025): proof_photo_url stores
   * an object PATH which fetchDeliveryStatus signs server-side (after the
   * RLS-scoped stop read proves the member owns the stop). Never a public
   * URL.
   */
  photo_url: string | null;
  /** Free-text notes when state === 'exception'. */
  issue_notes: string | null;
  /** ISO timestamp of this fetch, for "Updated 12s ago" rendering. */
  last_updated: string;
}

/* ──────────────────────────────────────────────────────────────────
 * Pure helpers
 * ────────────────────────────────────────────────────────────────── */

/** Pittsburgh-local YYYY-MM-DD for "today". */
export function todayET(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Three-letter weekday in America/New_York: 'Sun'..'Sat'. */
export function todayWeekdayET(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
  }).format(now);
}

/** First whitespace-separated token, used to never leak last names. */
export function firstNameOf(fullName: string | null | undefined): string | null {
  if (!fullName) return null;
  const trimmed = String(fullName).trim();
  if (trimmed.length === 0) return null;
  const first = trimmed.split(/\s+/)[0];
  return first ?? null;
}

/**
 * Self-pickup-farm members walk up to the farm — no driver, no
 * tracking. We match defensively by case-insensitive name keywords
 * (so future renames of the "Tiny Seed Farm Pickup — Rochester" stop
 * don't accidentally start showing the widget).
 */
export function isFarmPickup(pickupLocationName: string | null | undefined): boolean {
  if (!pickupLocationName) return false;
  const n = pickupLocationName.toLowerCase();
  return n.includes('rochester') && (n.includes('farm') || n.includes('pickup'));
}

/* ──────────────────────────────────────────────────────────────────
 * State derivation — pure
 * ────────────────────────────────────────────────────────────────── */

/**
 * The minimum stop shape needed for state derivation. We don't take
 * the full DB Row type here so deriveState is reusable from both SSR
 * (full row) and client Realtime (partial change payload).
 */
export interface DerivableStop {
  id: string;
  status: 'pending' | 'out_for_delivery' | 'arrived' | 'completed' | 'exception';
  stop_order: number;
}

export interface DerivableRoute {
  id: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
}

/**
 * deriveState — single source of truth for "what does this stop look
 * like to the member?".
 *
 * Order of checks matters:
 *   1. exception / completed are terminal — return first.
 *   2. arrived is terminal-ish (next state will be completed).
 *   3. If route is planned/cancelled (not yet started) → 'packed'.
 *   4. If route in_progress + stop is one of the next 2 pending/
 *      out_for_delivery stops → 'near_you'.
 *   5. Otherwise route in_progress → 'out_for_delivery'.
 *
 * @param stop      THIS member's stop row.
 * @param route     The route this stop belongs to.
 * @param allStops  Every stop on the route in stop_order. Used to
 *                  decide whether this stop is "next 1-2".
 */
export function deriveState(
  stop: DerivableStop | null | undefined,
  route: DerivableRoute | null | undefined,
  allStops: ReadonlyArray<DerivableStop>
): DeliveryState {
  if (!stop || !route) return 'none';

  // Terminal states — check first.
  if (stop.status === 'exception') return 'exception';
  if (stop.status === 'completed') return 'delivered';
  if (stop.status === 'arrived') return 'arrived';

  // Route not started yet → packed regardless of per-stop state.
  // 'cancelled' is rare admin action; treat as packed (widget says
  // "your box is being packed"; member never sees the cancellation
  // copy — admins will email separately).
  if (route.status === 'planned' || route.status === 'cancelled') {
    return 'packed';
  }

  // Route in_progress. Decide near_you vs out_for_delivery by looking
  // at the ordered list of stops that are NOT yet completed/exception
  // (i.e. the remaining route). If THIS stop is one of the next 2 in
  // that list, it's "near you".
  const remaining = [...allStops]
    .filter(
      (s) =>
        s.status === 'pending' ||
        s.status === 'out_for_delivery' ||
        s.status === 'arrived'
    )
    .sort((a, b) => a.stop_order - b.stop_order);

  const indexInRemaining = remaining.findIndex((s) => s.id === stop.id);

  if (indexInRemaining >= 0 && indexInRemaining < 2) {
    return 'near_you';
  }
  return 'out_for_delivery';
}

/* ──────────────────────────────────────────────────────────────────
 * Server-side Supabase fetch — for SSR + the /api/delivery/today
 * endpoint
 * ────────────────────────────────────────────────────────────────── */

/**
 * Look up the member's stop on today's route, derive the state, and
 * return the full DeliveryStatus payload. Fail-soft: any error path
 * returns { state: 'none', ... } so the widget hides cleanly.
 *
 * Assumptions:
 *   - The caller has already verified the user is authenticated.
 *   - The Supabase client is RLS-scoped to the member (cookie-aware).
 *   - One route per day. If multiple exist (multi-driver future),
 *     this picks the most recently created one.
 *
 * RLS does the bulk of the filtering for us: a member can SELECT
 * their own customers row, the members rows tied to that customer,
 * and ONLY the delivery_stops rows whose pickup_location_id is in
 * their member set (host stop) OR whose member_id matches one of
 * their member rows (home delivery).
 */
export async function fetchDeliveryStatus(
  supabase: SupabaseClient<Database>,
  now: Date = new Date()
): Promise<DeliveryStatus> {
  const nowISO = now.toISOString();
  const empty: DeliveryStatus = {
    state: 'none',
    stop_id: null,
    route_id: null,
    eta: null,
    driver_name: null,
    completed_at: null,
    photo_url: null,
    issue_notes: null,
    last_updated: nowISO,
  };

  const today = todayET(now);

  // 1. Today's route. There's typically one. RLS allows all members to
  //    SELECT delivery_routes (no PII at route level).
  type RouteRow = {
    id: string;
    driver_name: string;
    status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  };
  const { data: routes, error: routeErr } = await supabase
    .from('delivery_routes')
    .select('id, driver_name, status')
    .eq('route_date', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .overrideTypes<RouteRow[], { merge: false }>();

  if (routeErr) {
    console.error('[delivery] route fetch failed:', routeErr.message);
    return empty;
  }
  const route = routes?.[0] ?? null;
  if (!route) return empty;

  // 2. THIS member's stop. RLS narrows the result set to either the
  //    host stop matching the member's pickup_location_id, OR the
  //    home-delivery stop whose member_id matches one of theirs.
  //    There SHOULD be at most one per route — XOR check ensures a
  //    given stop is host XOR member, and member RLS narrows further.
  type StopRow = {
    id: string;
    status: 'pending' | 'out_for_delivery' | 'arrived' | 'completed' | 'exception';
    stop_order: number;
    eta: string | null;
    completed_at: string | null;
    proof_photo_url: string | null;
    exception_notes: string | null;
  };
  const { data: myStops, error: myStopErr } = await supabase
    .from('delivery_stops')
    .select('id, status, stop_order, eta, completed_at, proof_photo_url, exception_notes')
    .eq('route_id', route.id)
    .order('stop_order', { ascending: true })
    .limit(2)
    .overrideTypes<StopRow[], { merge: false }>();

  if (myStopErr) {
    console.error('[delivery] my-stop fetch failed:', myStopErr.message);
    return empty;
  }
  const myStop = myStops?.[0] ?? null;
  if (!myStop) {
    // Member exists, route exists today, but RLS returned nothing —
    // this member's stop isn't on this route. Common: they're on a
    // different pickup day, or they're a self-pickup-farm member. Hide.
    return empty;
  }

  // 3. ALL stops on the route — required to derive "near_you" (we
  //    need to know how this stop ranks in remaining stop_order).
  //    Members can ONLY see their own stop via RLS, so this query
  //    returns just their stop set (1 row typically). We cope: when
  //    `allStops` is the just-this-member's-stop, near_you reduces to
  //    "true if this stop is pending/out_for_delivery". Members never
  //    see the FULL route; that's intentional (privacy).
  //
  //    For "next 1-2" semantics to be correct we'd ideally know the
  //    relative ordering. But since members only see their own stop,
  //    we treat near_you as "any non-terminal stop on an in_progress
  //    route" — which is conservative but accurate as a member signal.
  //    The admin UI uses the unrestricted view to set scheduled_time/
  //    eta, and members can read those fields on their own stop.
  //
  //    TODO Phase 2: expose route progress (X of Y stops done) as a
  //    public view so members get true near_you semantics.
  const stopsForDerivation: DerivableStop[] = (myStops ?? []).map((s) => ({
    id: s.id,
    status: s.status,
    stop_order: s.stop_order,
  }));

  const state = deriveState(
    { id: myStop.id, status: myStop.status, stop_order: myStop.stop_order },
    { id: route.id, status: route.status },
    stopsForDerivation
  );

  // The proof photo lives in the PRIVATE delivery-proofs bucket (0025);
  // proof_photo_url is an object PATH. The read above was RLS-scoped to
  // THIS member's own stop, so the member is authorized — sign a short-
  // lived URL with the service-role client for display. Only sign when
  // there's actually a delivered photo to show (avoids a needless call).
  const photoUrl =
    myStop.proof_photo_url
      ? await signProofUrl(supabaseAdmin, myStop.proof_photo_url)
      : null;

  return {
    state,
    stop_id: myStop.id,
    route_id: route.id,
    eta: myStop.eta,
    driver_name: firstNameOf(route.driver_name),
    completed_at: myStop.completed_at,
    photo_url: photoUrl,
    issue_notes: myStop.exception_notes,
    last_updated: nowISO,
  };
}

/* ──────────────────────────────────────────────────────────────────
 * Dashboard gate
 * ────────────────────────────────────────────────────────────────── */

/**
 * Should the dashboard render <DeliveryTracker> today?
 *   1. Member has an active membership (caller passes the flag).
 *   2. Today is the member's pickup day.
 *   3. Pickup is NOT the farm self-pickup (Rochester).
 *
 * For home-delivery members (no pickup_location_id, has delivery_address)
 * we always show on the canonical Wed day — they're on the route.
 */
export interface TrackerGateInput {
  pickup_day: string | null;
  pickup_location_name: string | null;
  pickup_location_day: string | null;
  is_home_delivery: boolean;
  is_active_status: boolean;
}

export function shouldShowTracker(input: TrackerGateInput, now: Date = new Date()): boolean {
  if (!input.is_active_status) return false;

  // Farm pickup → no driver, no tracking.
  if (!input.is_home_delivery && isFarmPickup(input.pickup_location_name)) {
    return false;
  }

  // Resolve pickup-day-of-week. pickup_locations.day_of_week wins
  // (most authoritative). Fall back to members.pickup_day, then to
  // Wednesday (the canonical CSA day).
  const pickupDay = input.pickup_location_day ?? input.pickup_day ?? 'Wed';
  return todayWeekdayET(now) === pickupDay;
}
