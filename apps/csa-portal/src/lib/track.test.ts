/**
 * Unit tests for track.ts — the pure ETA / delay math behind /account/track.
 *
 * No Vitest in this repo — run as a plain Node script:
 *   npx tsx src/lib/track.test.ts
 *
 * Exits 0 if all assertions pass, 1 otherwise.
 *
 * Coverage (per the feature spec's required cases):
 *   - no route / not delivery day
 *   - route planned (not started)
 *   - in progress, no delay (on time)
 *   - in progress, with delay (latest completed stop ran late)
 *   - in progress, paused (break running now adds to the ETA)
 *   - my stop completed (delivered) + exception
 *   - stops_away counting (not-done stops strictly ahead of me)
 *   - runningDelayMs edge cases (no completed stop; exception excluded; clamp)
 */
import {
  computeTrackingState,
  runningDelayMs,
  type TrackStop,
} from './track.ts';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  FAIL ${name}`);
    console.log(`       ${err instanceof Error ? err.message : String(err)}`);
  }
}

function assertEqual<T>(actual: T, expected: T, msg?: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${msg ?? 'assertEqual failed'}\n       expected: ${JSON.stringify(expected)}\n       actual:   ${JSON.stringify(actual)}`
    );
  }
}

// ─── Time fixtures (epoch-ms). Route date anchored on an arbitrary day. ───
const MIN = 60_000;
// Scheduled times: stop 1 @ 12:00, stop 2 @ 12:30, stop 3 (me) @ 13:00, stop 4 @ 13:30.
const T1200 = Date.UTC(2026, 7, 19, 16, 0, 0); // 12:00 ET ≈ 16:00 UTC (values are abstract)
const T1230 = T1200 + 30 * MIN;
const T1300 = T1200 + 60 * MIN;
const T1330 = T1200 + 90 * MIN;

function stop(
  order: number,
  status: TrackStop['status'],
  scheduled_ms: number | null,
  completed_ms: number | null = null
): TrackStop {
  return { stop_order: order, status, scheduled_ms, completed_ms };
}

// ═══ STATE: no_route ═════════════════════════════════════════════════

test('no route today → no_route state', () => {
  const out = computeTrackingState({
    routeStatus: null,
    now_ms: T1200,
    pausedAt_ms: null,
    myStop: null,
    allStops: [],
  });
  assertEqual(out.state, 'no_route');
  assertEqual(out.eta_ms, null);
  assertEqual(out.stopsAway, 0);
});

test('route exists but member has no stop on it → no_route', () => {
  const out = computeTrackingState({
    routeStatus: 'in_progress',
    now_ms: T1200,
    pausedAt_ms: null,
    myStop: null,
    allStops: [stop(1, 'out_for_delivery', T1200)],
  });
  assertEqual(out.state, 'no_route');
});

// ═══ STATE: planned (not started) ════════════════════════════════════

test('route planned, my stop pending → planned', () => {
  const me = stop(3, 'pending', T1300);
  const out = computeTrackingState({
    routeStatus: 'planned',
    now_ms: T1200,
    pausedAt_ms: null,
    myStop: me,
    allStops: [stop(1, 'pending', T1200), stop(2, 'pending', T1230), me, stop(4, 'pending', T1330)],
  });
  assertEqual(out.state, 'planned');
  assertEqual(out.eta_ms, null, 'planned has no computed ETA');
});

test('route cancelled is treated as planned for the member', () => {
  const me = stop(3, 'pending', T1300);
  const out = computeTrackingState({
    routeStatus: 'cancelled',
    now_ms: T1200,
    pausedAt_ms: null,
    myStop: me,
    allStops: [me],
  });
  assertEqual(out.state, 'planned');
});

// ═══ STATE: in_progress — no delay (on time) ═════════════════════════

test('in progress, on time → eta == my scheduled_time, delay 0', () => {
  // Stops 1 & 2 completed EXACTLY on schedule; 3 (me) + 4 remaining.
  const me = stop(3, 'out_for_delivery', T1300);
  const all: TrackStop[] = [
    stop(1, 'completed', T1200, T1200),
    stop(2, 'completed', T1230, T1230),
    me,
    stop(4, 'pending', T1330),
  ];
  const out = computeTrackingState({
    routeStatus: 'in_progress',
    now_ms: T1230,
    pausedAt_ms: null,
    myStop: me,
    allStops: all,
  });
  assertEqual(out.state, 'in_progress');
  assertEqual(out.delay_ms, 0, 'no delay when latest completed finished on schedule');
  assertEqual(out.eta_ms, T1300, 'ETA is exactly my scheduled time');
  assertEqual(out.stopsAway, 0, 'stops 1 & 2 are completed, so 0 not-done stops ahead');
  assertEqual(out.onBreak, false);
});

test('in progress, stops_away counts only NOT-DONE stops ahead of me', () => {
  const me = stop(3, 'out_for_delivery', T1300);
  const all: TrackStop[] = [
    stop(1, 'completed', T1200, T1200), // done → not counted
    stop(2, 'out_for_delivery', T1230), // not done, ahead → counted
    me,
    stop(4, 'pending', T1330), // behind me → not counted
  ];
  const out = computeTrackingState({
    routeStatus: 'in_progress',
    now_ms: T1230,
    pausedAt_ms: null,
    myStop: me,
    allStops: all,
  });
  assertEqual(out.stopsAway, 1, 'only stop 2 is not-done AND ahead of me');
});

// ═══ STATE: in_progress — with delay ═════════════════════════════════

test('in progress, latest completed ran 20m late → ETA shifts +20m', () => {
  const me = stop(3, 'out_for_delivery', T1300);
  const all: TrackStop[] = [
    stop(1, 'completed', T1200, T1200),
    // Stop 2 scheduled 12:30 but completed 12:50 → 20 min behind.
    stop(2, 'completed', T1230, T1230 + 20 * MIN),
    me,
    stop(4, 'pending', T1330),
  ];
  const out = computeTrackingState({
    routeStatus: 'in_progress',
    now_ms: T1230 + 20 * MIN,
    pausedAt_ms: null,
    myStop: me,
    allStops: all,
  });
  assertEqual(out.delay_ms, 20 * MIN, 'delay = latest completed lateness');
  assertEqual(out.eta_ms, T1300 + 20 * MIN, 'my ETA shifts by the running delay');
});

test('delay is clamped ≥ 0 — an EARLY completed stop never yields negative delay', () => {
  const me = stop(3, 'out_for_delivery', T1300);
  const all: TrackStop[] = [
    // Completed 15 min EARLY (ahead of schedule) → clamp to 0.
    stop(2, 'completed', T1230, T1230 - 15 * MIN),
    me,
  ];
  const out = computeTrackingState({
    routeStatus: 'in_progress',
    now_ms: T1230,
    pausedAt_ms: null,
    myStop: me,
    allStops: all,
  });
  assertEqual(out.delay_ms, 0, 'ahead of schedule → 0 delay, not negative');
  assertEqual(out.eta_ms, T1300, 'ETA does not move earlier than scheduled');
});

test('latest completed = highest completed_ms (most recent), not last in array', () => {
  const me = stop(4, 'out_for_delivery', T1330);
  const all: TrackStop[] = [
    // Out of order in the array; the LATEST completion (stop 2 @ +30m) drives delay.
    stop(2, 'completed', T1230, T1230 + 30 * MIN),
    stop(1, 'completed', T1200, T1200 + 5 * MIN),
    me,
  ];
  const out = computeTrackingState({
    routeStatus: 'in_progress',
    now_ms: T1230 + 30 * MIN,
    pausedAt_ms: null,
    myStop: me,
    allStops: all,
  });
  assertEqual(out.delay_ms, 30 * MIN, 'uses the most-recently completed stop, not array order');
});

// ═══ STATE: in_progress — paused (break running now) ═════════════════

test('in progress, paused → onBreak true and (now − paused_at) added to delay', () => {
  const me = stop(3, 'out_for_delivery', T1300);
  const all: TrackStop[] = [
    stop(2, 'completed', T1230, T1230 + 10 * MIN), // 10m observed delay
    me,
  ];
  const pausedAt = T1230 + 10 * MIN; // break started when stop 2 finished
  const now = pausedAt + 8 * MIN; // 8 min into the break
  const out = computeTrackingState({
    routeStatus: 'in_progress',
    now_ms: now,
    pausedAt_ms: pausedAt,
    myStop: me,
    allStops: all,
  });
  assertEqual(out.onBreak, true);
  assertEqual(out.delay_ms, 10 * MIN + 8 * MIN, 'observed delay + active break duration');
  assertEqual(out.eta_ms, T1300 + 18 * MIN, 'ETA shifts by delay + live break');
});

test('paused with NO completed stops yet → delay is just the live break', () => {
  const me = stop(2, 'out_for_delivery', T1230);
  const pausedAt = T1200;
  const now = T1200 + 5 * MIN;
  const out = computeTrackingState({
    routeStatus: 'in_progress',
    now_ms: now,
    pausedAt_ms: pausedAt,
    myStop: me,
    allStops: [stop(1, 'out_for_delivery', T1200), me],
  });
  assertEqual(out.onBreak, true);
  assertEqual(out.delay_ms, 5 * MIN, 'no completed stop → only the live break counts');
  assertEqual(out.eta_ms, T1230 + 5 * MIN);
});

// ═══ STATE: delivered / exception ════════════════════════════════════

test('my stop completed → delivered with completed_ms', () => {
  const me = stop(3, 'completed', T1300, T1300 + 3 * MIN);
  const out = computeTrackingState({
    routeStatus: 'in_progress',
    now_ms: T1330,
    pausedAt_ms: null,
    myStop: me,
    allStops: [me],
  });
  assertEqual(out.state, 'delivered');
  assertEqual(out.completed_ms, T1300 + 3 * MIN);
  assertEqual(out.wasException, false);
});

test('my stop completed reads delivered EVEN when route already completed', () => {
  const me = stop(3, 'completed', T1300, T1300);
  const out = computeTrackingState({
    routeStatus: 'completed',
    now_ms: T1330,
    pausedAt_ms: null,
    myStop: me,
    allStops: [me],
  });
  assertEqual(out.state, 'delivered');
});

test('my stop exception → delivered state, wasException true', () => {
  const me = stop(3, 'exception', T1300, T1300 + 5 * MIN);
  const out = computeTrackingState({
    routeStatus: 'in_progress',
    now_ms: T1330,
    pausedAt_ms: null,
    myStop: me,
    allStops: [me],
  });
  assertEqual(out.state, 'delivered');
  assertEqual(out.wasException, true);
});

// ═══ runningDelayMs unit edges ═══════════════════════════════════════

test('runningDelayMs: no completed stop → 0', () => {
  assertEqual(runningDelayMs([stop(1, 'out_for_delivery', T1200)], null, T1200), 0);
});

test('runningDelayMs: completed stop WITHOUT scheduled_ms is ignored', () => {
  // Can't measure drift with no schedule → 0.
  assertEqual(runningDelayMs([stop(1, 'completed', null, T1200 + 99 * MIN)], null, T1330), 0);
});

test('runningDelayMs: exception stops do NOT count as a delay probe', () => {
  const all = [stop(1, 'exception', T1200, T1200 + 40 * MIN)];
  assertEqual(runningDelayMs(all, null, T1330), 0, 'exception excluded from delay probe');
});

// ═══ Summary ═════════════════════════════════════════════════════════
console.log('');
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) {
  const p = (globalThis as { process?: { exit: (n: number) => never } }).process;
  if (p) p.exit(1);
}
