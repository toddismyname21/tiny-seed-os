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

// ─── getSchedule ────────────────────────────────────────────────────

test('getSchedule returns the summer_veg config', () => {
  assertEqual(getSchedule('summer_veg'), { firstDelivery: '2026-06-10', totalWeeks: 18 });
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
