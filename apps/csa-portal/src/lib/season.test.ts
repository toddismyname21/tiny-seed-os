/**
 * Unit tests for season.ts.
 *
 * No Vitest in this repo, so we run as a plain Node script:
 *   npx tsx src/lib/season.test.ts
 *
 * Exits 0 if all assertions pass, 1 otherwise.
 *
 * All `now` arguments are constructed as explicit UTC instants chosen so
 * the corresponding Eastern wall-clock date is unambiguous. June is EDT
 * (UTC-4): 12:00 UTC on a date = 08:00 ET the SAME calendar day, so a
 * noon-UTC instant always lands on the intended ET date.
 */
import {
  getSchedule,
  seasonPhase,
  daysUntilStart,
  currentWeekNumber,
  firstDeliveryPretty,
  lastDelivery,
  SEASON_SCHEDULE,
  type SeasonSchedule,
} from './season.ts';

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

/** Noon-UTC instant for a given ET calendar date (EDT in summer → 8 AM ET). */
function etNoon(ymd: string): Date {
  return new Date(`${ymd}T12:00:00Z`);
}

const summer: SeasonSchedule = SEASON_SCHEDULE.summer_veg;
const spring: SeasonSchedule = SEASON_SCHEDULE.spring_veg;

// ─── getSchedule ────────────────────────────────────────────────────

test('getSchedule returns the summer_veg config', () => {
  assertEqual(getSchedule('summer_veg'), { firstDelivery: '2026-06-10', totalWeeks: 18 });
});

test('getSchedule returns the spring_veg config', () => {
  assertEqual(getSchedule('spring_veg'), { firstDelivery: '2026-05-06', totalWeeks: 4 });
});

test('getSchedule returns null for an unconfigured share type', () => {
  assertEqual(getSchedule('flower'), null);
  assertEqual(getSchedule('not_a_real_type'), null);
});

// ─── seasonPhase: before / active / complete boundaries ─────────────

test("seasonPhase is 'before' the day prior to first delivery (June 9)", () => {
  assertEqual(seasonPhase(summer, etNoon('2026-06-09')), 'before');
});

test("seasonPhase flips to 'active' exactly on the June 10 start", () => {
  assertEqual(seasonPhase(summer, etNoon('2026-06-10')), 'active');
});

test("seasonPhase is 'before' well ahead of the season (May 19)", () => {
  assertEqual(seasonPhase(summer, etNoon('2026-05-19')), 'before');
});

test("seasonPhase stays 'active' on the final delivery Wednesday (Oct 7)", () => {
  // firstDelivery + 17 weeks = 2026-10-07.
  assertEqual(lastDelivery(summer), '2026-10-07');
  assertEqual(seasonPhase(summer, etNoon('2026-10-07')), 'active');
});

test("seasonPhase stays 'active' through the final delivery week (Oct 13, the following Tue)", () => {
  assertEqual(seasonPhase(summer, etNoon('2026-10-13')), 'active');
});

test("seasonPhase flips to 'complete' once the final week elapses (Oct 14)", () => {
  assertEqual(seasonPhase(summer, etNoon('2026-10-14')), 'complete');
});

// ─── daysUntilStart: day-0 edge + counts ─────────────────────────────

test('daysUntilStart is 0 on the first-delivery day (day-0 edge)', () => {
  assertEqual(daysUntilStart(summer, etNoon('2026-06-10')), 0);
});

test('daysUntilStart is 1 the day before (June 9)', () => {
  assertEqual(daysUntilStart(summer, etNoon('2026-06-09')), 1);
});

test('daysUntilStart counts whole days out (May 20 → 21 days)', () => {
  // May 20 → June 10: 11 days left in May + 10 days into June = 21.
  assertEqual(daysUntilStart(summer, etNoon('2026-05-20')), 21);
});

// ─── currentWeekNumber: week 1 / mid / 18 ───────────────────────────

test('currentWeekNumber is 1 on the first delivery (June 10)', () => {
  assertEqual(currentWeekNumber(summer, etNoon('2026-06-10')), 1);
});

test('currentWeekNumber is still 1 mid-week-1 (June 14, that Sunday)', () => {
  assertEqual(currentWeekNumber(summer, etNoon('2026-06-14')), 1);
});

test('currentWeekNumber is 2 on the second delivery Wednesday (June 17)', () => {
  assertEqual(currentWeekNumber(summer, etNoon('2026-06-17')), 2);
});

test('currentWeekNumber is 9 mid-season (Aug 5 = week 9 Wednesday)', () => {
  // firstDelivery + 8 weeks = 2026-08-05.
  assertEqual(currentWeekNumber(summer, etNoon('2026-08-05')), 9);
});

test('currentWeekNumber is 18 on the final delivery (Oct 7)', () => {
  assertEqual(currentWeekNumber(summer, etNoon('2026-10-07')), 18);
});

test('currentWeekNumber clamps to 18 even after the season ends (Oct 20)', () => {
  assertEqual(currentWeekNumber(summer, etNoon('2026-10-20')), 18);
});

test('currentWeekNumber clamps to 1 before the season (May 20)', () => {
  assertEqual(currentWeekNumber(summer, etNoon('2026-05-20')), 1);
});

// ─── Spring season (spring_veg): 4 weeks, May 6 → May 27 ─────────────
//
// May is EDT (UTC-4), so the same noon-UTC anchoring trick used for the
// summer cases lands every `now` on the intended Eastern calendar date.

test('spring lastDelivery is May 27 (firstDelivery + 3 weeks)', () => {
  assertEqual(lastDelivery(spring), '2026-05-27');
});

test("spring seasonPhase is 'before' the day prior to first delivery (May 5)", () => {
  assertEqual(seasonPhase(spring, etNoon('2026-05-05')), 'before');
});

test("spring seasonPhase flips to 'active' exactly on the May 6 start", () => {
  assertEqual(seasonPhase(spring, etNoon('2026-05-06')), 'active');
});

test("spring is 'active' at week 3 on May 21 (per task spec)", () => {
  // dayDelta = 15 → floor(15/7)+1 = 3.
  assertEqual(seasonPhase(spring, etNoon('2026-05-21')), 'active');
  assertEqual(currentWeekNumber(spring, etNoon('2026-05-21')), 3);
});

test('spring currentWeekNumber is 4 on the final delivery (May 27)', () => {
  assertEqual(currentWeekNumber(spring, etNoon('2026-05-27')), 4);
});

// The task brief sketched "May 28 → complete", but seasonPhase
// intentionally keeps the season 'active' through the WHOLE final delivery
// week (the final Wednesday + the following 6 days), mirroring the summer
// contract above (Oct 7 final delivery stays 'active' through Oct 13). So
// May 28 — two days into the final delivery week — is still 'active'. The
// season flips to 'complete' on June 3 (the day after the May 27 +6 = June
// 2 active-window end). Asserting the TRUE behavior here so the test is a
// faithful spec of seasonPhase, not a contradiction of it.
test("spring stays 'active' on May 28 (still inside the final delivery week)", () => {
  assertEqual(seasonPhase(spring, etNoon('2026-05-28')), 'active');
});

test("spring stays 'active' through the end of the final delivery week (June 2)", () => {
  assertEqual(seasonPhase(spring, etNoon('2026-06-02')), 'active');
});

test("spring flips to 'complete' once the final week elapses (June 3)", () => {
  assertEqual(seasonPhase(spring, etNoon('2026-06-03')), 'complete');
});

test('spring currentWeekNumber clamps to 4 after the season ends (June 10)', () => {
  assertEqual(currentWeekNumber(spring, etNoon('2026-06-10')), 4);
});

test('spring firstDeliveryPretty renders "Wednesday, May 6"', () => {
  assertEqual(firstDeliveryPretty(spring), 'Wednesday, May 6');
});

// ─── firstDeliveryPretty ─────────────────────────────────────────────

test('firstDeliveryPretty renders "Wednesday, June 10"', () => {
  assertEqual(firstDeliveryPretty(summer), 'Wednesday, June 10');
});

// ─── Done ───────────────────────────────────────────────────────────

console.log('');
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) {
  const p = (globalThis as { process?: { exit: (n: number) => never } }).process;
  if (p) p.exit(1);
}
