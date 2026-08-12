/**
 * track.ts — pure ETA / delay math for the member-facing "Track My Box" page
 * (/account/track).
 *
 * This module is deliberately FREE of Supabase, Astro, and I/O so the honest
 * ETA math can be unit-tested in isolation (see track.test.ts). The page
 * (/account/track.astro) does the RLS-scoped reads (member's own stop via the
 * cookie client, route + PII-free stop counts/times via the service client),
 * then hands primitives to `computeTrackingState`.
 *
 * The four member-facing states, per the feature spec:
 *   - 'no_route'   → not a delivery day / no route yet. "Your box arrives …"
 *   - 'planned'    → route exists but not started ("truck being loaded").
 *   - 'in_progress'→ route started, my stop not done. "🚚 N stops away" + ETA.
 *   - 'delivered'  → my stop completed/exception. "✅ Delivered at …".
 *
 * HONEST ETA MODEL (spec §C.2, kept simple + honest):
 *   delay = max(0, latestCompleted.completed_at − latestCompleted.scheduled_time)
 *   if the route is paused NOW: delay += (now − paused_at)
 *   eta   = myScheduledTime + delay
 * We do NOT try to model per-stop drift or fold in pause_total_sec — a break
 * that already ENDED is already reflected in the completed stops' real
 * completed_at timestamps, so double-counting it would overstate the ETA. The
 * only break we add on top of the observed delay is the one currently running.
 */

/** A stop as seen by the tracking math. Times are epoch-ms (UTC) or null. */
export interface TrackStop {
  /** stop_order on the route (1-based, unique per route). */
  stop_order: number;
  status: 'pending' | 'out_for_delivery' | 'arrived' | 'completed' | 'exception';
  /**
   * Scheduled time as epoch-ms on the route date. The DB stores a bare
   * TIME ('HH:MM:SS'); the page anchors it to the route date in America/
   * New_York before calling this function. Null when no scheduled_time.
   */
  scheduled_ms: number | null;
  /** completed_at as epoch-ms, or null when not completed. */
  completed_ms: number | null;
}

export type TrackState = 'no_route' | 'planned' | 'in_progress' | 'delivered';

export interface TrackingInput {
  /** The route's lifecycle status, or null when there's no route today. */
  routeStatus: 'planned' | 'in_progress' | 'completed' | 'cancelled' | null;
  /** now() as epoch-ms. */
  now_ms: number;
  /** paused_at as epoch-ms while the driver is on a break, else null. */
  pausedAt_ms: number | null;
  /** THIS member's stop, or null when the member has no stop on the route. */
  myStop: TrackStop | null;
  /**
   * Every stop on the route (including myStop). Used ONLY for privacy-safe
   * COUNTS + the latest-completed delay probe — never for names/addresses.
   * The page reads these via the service client precisely because member RLS
   * hides other members' stops.
   */
  allStops: ReadonlyArray<TrackStop>;
}

export interface TrackingState {
  state: TrackState;
  /** true while the driver is on a break (route in progress + paused_at set). */
  onBreak: boolean;
  /**
   * Number of not-yet-completed stops ahead of the member (stop_order < mine
   * AND status not in {completed, exception}). Only meaningful when
   * state === 'in_progress'. 0 = "you're next".
   */
  stopsAway: number;
  /**
   * Estimated arrival at the member's stop as epoch-ms, or null when it
   * can't be estimated (no scheduled_time on the member's stop). Only set
   * for state === 'in_progress'.
   */
  eta_ms: number | null;
  /**
   * The running delay applied (ms, ≥ 0), for copy like "running a little
   * behind". 0 when on time (or unknowable). Only set for 'in_progress'.
   */
  delay_ms: number;
  /** completed_at (epoch-ms) when state === 'delivered', else null. */
  completed_ms: number | null;
  /** true when the member's stop terminated as an exception (vs. clean delivery). */
  wasException: boolean;
}

const NOT_DONE = new Set(['pending', 'out_for_delivery', 'arrived']);

/**
 * Compute the running delay for the route: how far behind the most recently
 * completed stop finished vs. when it was scheduled, clamped to ≥ 0, plus the
 * currently-active break (if any). Returns 0 when there's nothing to measure
 * (no completed stop with a scheduled_time yet).
 *
 * Exported for direct unit testing.
 */
export function runningDelayMs(
  allStops: ReadonlyArray<TrackStop>,
  pausedAt_ms: number | null,
  now_ms: number
): number {
  // The LATEST completed stop = the highest completed_ms among 'completed'
  // stops that also carry a scheduled_ms (we can only measure drift against a
  // schedule). 'exception' stops are excluded — a skipped stop's completed_ms
  // isn't a "we arrived here at X" signal.
  let latest: TrackStop | null = null;
  for (const s of allStops) {
    if (s.status !== 'completed') continue;
    if (s.completed_ms == null || s.scheduled_ms == null) continue;
    if (latest === null || s.completed_ms > (latest.completed_ms as number)) {
      latest = s;
    }
  }

  let delay = 0;
  if (latest && latest.completed_ms != null && latest.scheduled_ms != null) {
    delay = Math.max(0, latest.completed_ms - latest.scheduled_ms);
  }

  // A break happening RIGHT NOW pushes every remaining ETA out by however long
  // it's been running. A finished break is already baked into the completed
  // stops' real timestamps, so we don't re-add pause_total_sec here.
  if (pausedAt_ms != null) {
    delay += Math.max(0, now_ms - pausedAt_ms);
  }

  return delay;
}

/**
 * Map the (route, my stop, all stops, now, pause) tuple → the member-facing
 * tracking state. Pure. See the module header for the state + ETA model.
 */
export function computeTrackingState(input: TrackingInput): TrackingState {
  const { routeStatus, now_ms, pausedAt_ms, myStop, allStops } = input;

  const base: TrackingState = {
    state: 'no_route',
    onBreak: false,
    stopsAway: 0,
    eta_ms: null,
    delay_ms: 0,
    completed_ms: null,
    wasException: false,
  };

  // No route today, or the member simply isn't on it → nothing to track.
  if (routeStatus == null || myStop == null) {
    return base;
  }

  // Terminal for the member first — a delivered/exception stop reads the same
  // ("your box was dropped / there was an issue") regardless of route status.
  if (myStop.status === 'completed' || myStop.status === 'exception') {
    return {
      ...base,
      state: 'delivered',
      completed_ms: myStop.completed_ms,
      wasException: myStop.status === 'exception',
    };
  }

  // Route not started (planned) or a rare admin cancel → "being loaded".
  // (cancelled is treated as planned for the member: they never see a
  // cancellation here — staff email separately, matching lib/delivery.ts.)
  if (routeStatus === 'planned' || routeStatus === 'cancelled') {
    return { ...base, state: 'planned' };
  }

  // Route in progress, my stop not done yet.
  const onBreak = pausedAt_ms != null;

  // stops_away = not-yet-completed stops strictly ahead of me in order.
  let stopsAway = 0;
  for (const s of allStops) {
    if (s.stop_order < myStop.stop_order && NOT_DONE.has(s.status)) {
      stopsAway += 1;
    }
  }

  const delay = runningDelayMs(allStops, pausedAt_ms, now_ms);
  const eta_ms =
    myStop.scheduled_ms != null ? myStop.scheduled_ms + delay : null;

  return {
    state: 'in_progress',
    onBreak,
    stopsAway,
    eta_ms,
    delay_ms: delay,
    completed_ms: null,
    wasException: false,
  };
}
