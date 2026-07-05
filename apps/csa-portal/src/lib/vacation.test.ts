/**
 * Unit tests for vacation.ts (vacation-hold week accounting).
 *
 * No Vitest in this repo, so we run as a plain Node script:
 *   npx tsx src/lib/vacation.test.ts
 *
 * Exits 0 if all assertions pass, 1 otherwise.
 *
 * Canonical fixture: 2026 summer veg (firstDelivery Wed 2026-06-10, 18
 * weeks). The cycle.ts anchor (Mon 2026-06-08 = Week A) means Week-A weeks
 * are Jun 10 / 24 / … and Week-B weeks are Jun 17 / Jul 1 / …
 *
 * THE REGRESSION: a single Mon–Fri hold (2026-06-15 → 2026-06-19) over ONE
 * Wednesday delivery (6/17) must count as exactly 1 week, not 2.
 */
import {
  vacationWeeksUsed,
  deliveryWeekOverlapsHold,
  type VacationMember,
} from './vacation.ts';

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

const weekly: VacationMember = { share_type: 'summer_veg', biweekly_week: null };
const weeklyA: VacationMember = { share_type: 'summer_veg', biweekly_week: 'A' };
const weeklyB: VacationMember = { share_type: 'summer_veg', biweekly_week: 'B' };

// ─── THE REGRESSION: Naomi's hold ────────────────────────────────────

test('REGRESSION: Naomi — Mon 6/15 → Fri 6/19 over one Wed (6/17) = 1 week', () => {
  // This is the exact incident. The old CEIL((4)/7)+1 formula gave 2.
  assertEqual(vacationWeeksUsed(weekly, '2026-06-15', '2026-06-19'), 1);
});

test('same-day hold on a delivery Wednesday (6/17) = 1 week', () => {
  assertEqual(vacationWeeksUsed(weekly, '2026-06-17', '2026-06-17'), 1);
});

test('hold entirely within one cycle week but NO delivery (Thu–Sat after Wed) = 1 week', () => {
  // Thu 6/18 → Sat 6/20 is still the SAME Mon–Sun week as Wed 6/17, so the
  // member's 6/17 box is suppressed → 1. (Matches resolver: hold overlaps the
  // Mon–Sun window.)
  assertEqual(vacationWeeksUsed(weekly, '2026-06-18', '2026-06-20'), 1);
});

// ─── Weekly member: multi-week ranges ────────────────────────────────

test('weekly — full Mon–Sun single week (6/15–6/21) = 1 week', () => {
  assertEqual(vacationWeeksUsed(weekly, '2026-06-15', '2026-06-21'), 1);
});

test('weekly — two delivery Wednesdays (6/15–6/24, covers 6/17 + 6/24) = 2 weeks', () => {
  assertEqual(vacationWeeksUsed(weekly, '2026-06-15', '2026-06-24'), 2);
});

test('weekly — a clean three-week block (6/15–7/1, covers 6/17,6/24,7/1) = 3 weeks', () => {
  assertEqual(vacationWeeksUsed(weekly, '2026-06-15', '2026-07-01'), 3);
});

test('weekly — 8-day span Mon→next Mon straddling 2 weeks but only 6/17 in range start... ', () => {
  // Mon 6/15 → Mon 6/22: weeks of 6/17 (Wed) and 6/24 (Wed). The week of 6/24
  // is Mon 6/22 – Sun 6/28; the hold's last day 6/22 IS that Monday → overlaps
  // → 6/24 counts. So this is 2. (The OLD formula also said 2 here, by luck.)
  assertEqual(vacationWeeksUsed(weekly, '2026-06-15', '2026-06-22'), 2);
});

// ─── Biweekly members: only ON-parity weeks count ────────────────────

test('biweekly A — hold over their ON week (6/24) = 1 week', () => {
  // Week A deliveries: Jun 10, 24, Jul 8 … Hold 6/22–6/26 covers the week of
  // Wed 6/24 (an A week) → 1.
  assertEqual(vacationWeeksUsed(weeklyA, '2026-06-22', '2026-06-26'), 1);
});

test('biweekly A — hold over their OFF week (6/17, a B week) = 0 weeks', () => {
  // Week-A member is NOT getting a box the week of Wed 6/17 (that's Week B),
  // so holding it costs them nothing.
  assertEqual(vacationWeeksUsed(weeklyA, '2026-06-15', '2026-06-19'), 0);
});

test('biweekly B — Naomi-style Mon–Fri over their ON week (6/17) = 1 week', () => {
  // Week-B deliveries: Jun 17, Jul 1 … 6/15–6/19 covers the week of 6/17 → 1.
  assertEqual(vacationWeeksUsed(weeklyB, '2026-06-15', '2026-06-19'), 1);
});

test('biweekly B — hold over an A week (6/24) only = 0 weeks', () => {
  assertEqual(vacationWeeksUsed(weeklyB, '2026-06-22', '2026-06-26'), 0);
});

test('biweekly A — two-week span counts only the ONE A delivery inside it', () => {
  // 6/15–6/24 spans weeks of 6/17 (B) and 6/24 (A). For an A member only 6/24
  // counts → 1.
  assertEqual(vacationWeeksUsed(weeklyA, '2026-06-15', '2026-06-24'), 1);
});

test('biweekly detected via reduced total_weeks (no explicit A/B) ', () => {
  // summer_veg full season = 18 weeks; a biweekly plan is sold as 9. With no
  // explicit parity we default to A. Hold over the week of A-delivery 6/24.
  const bw9: VacationMember = { share_type: 'summer_veg', biweekly_week: null, total_weeks: 9 };
  assertEqual(vacationWeeksUsed(bw9, '2026-06-22', '2026-06-26'), 1);
  // And over a B-only week (6/17) → 0 (defaulted-A member isn't on that week).
  assertEqual(vacationWeeksUsed(bw9, '2026-06-15', '2026-06-19'), 0);
});

// ─── cadence column authority (migration 0073) ───────────────────────

test('cadence=weekly overrides a stray biweekly_week (counts every held week)', () => {
  // A weekly member wrongly carrying biweekly_week='B'. The cadence column
  // makes them weekly → their 6/17 (a "B" week) box IS suppressed → 1.
  const strayB: VacationMember = { share_type: 'summer_veg', biweekly_week: 'B', cadence: 'weekly' };
  assertEqual(vacationWeeksUsed(strayB, '2026-06-15', '2026-06-19'), 1);
});

test('cadence=biweekly + A parity counts only on-parity weeks', () => {
  const bwA: VacationMember = { share_type: 'summer_veg', biweekly_week: 'A', cadence: 'biweekly' };
  // Hold over an A week (6/24) → 1; hold over a B week (6/17) → 0.
  assertEqual(vacationWeeksUsed(bwA, '2026-06-22', '2026-06-26'), 1);
  assertEqual(vacationWeeksUsed(bwA, '2026-06-15', '2026-06-19'), 0);
});

// ─── Season boundaries ───────────────────────────────────────────────

test('hold extending past the last delivery counts only in-season weeks', () => {
  // Summer last delivery is Wed 2026-10-07. A hold 2026-10-05 → 2026-10-31
  // covers only the week of 10/7 (one delivery) → 1, not the phantom weeks
  // after the season ends.
  assertEqual(vacationWeeksUsed(weekly, '2026-10-05', '2026-10-31'), 1);
});

test('hold entirely before the season opens = 0 weeks', () => {
  // Summer opens Wed 6/10; a hold 6/1–6/7 is entirely before → 0.
  assertEqual(vacationWeeksUsed(weekly, '2026-06-01', '2026-06-07'), 0);
});

test('hold spanning the season opener counts from the first delivery', () => {
  // 6/8 (Mon, season's Week-1 Monday) → 6/12 (Fri) covers the week of Wed
  // 6/10 → 1.
  assertEqual(vacationWeeksUsed(weekly, '2026-06-08', '2026-06-12'), 1);
});

// ─── Defensive / edge cases ──────────────────────────────────────────

test('inverted range (end < start) = 0 weeks', () => {
  assertEqual(vacationWeeksUsed(weekly, '2026-06-19', '2026-06-15'), 0);
});

test('malformed dates = 0 weeks', () => {
  assertEqual(vacationWeeksUsed(weekly, 'not-a-date', '2026-06-19'), 0);
  assertEqual(vacationWeeksUsed(weekly, '2026-06-15', ''), 0);
});

test('share with no configured season (flex) = 0 weeks', () => {
  const flex: VacationMember = { share_type: 'flex', biweekly_week: null };
  assertEqual(vacationWeeksUsed(flex, '2026-06-15', '2026-07-15'), 0);
});

test('add_on share (no season) = 0 weeks', () => {
  const addon: VacationMember = { share_type: 'add_on', biweekly_week: null };
  assertEqual(vacationWeeksUsed(addon, '2026-06-15', '2026-06-19'), 0);
});

// ─── deliveryWeekOverlapsHold primitive ──────────────────────────────

test('deliveryWeekOverlapsHold: Wed 6/17 vs Mon–Fri 6/15–6/19 = true', () => {
  assertEqual(deliveryWeekOverlapsHold('2026-06-17', '2026-06-15', '2026-06-19'), true);
});

test('deliveryWeekOverlapsHold: Wed 6/17 vs next week 6/22–6/26 = false', () => {
  assertEqual(deliveryWeekOverlapsHold('2026-06-17', '2026-06-22', '2026-06-26'), false);
});

test('deliveryWeekOverlapsHold: hold touching only the Monday of the delivery week = true', () => {
  // Week of Wed 6/24 is Mon 6/22 – Sun 6/28. A hold ending exactly 6/22 still
  // overlaps that Monday → true (matches resolver's inclusive Mon–Sun window).
  assertEqual(deliveryWeekOverlapsHold('2026-06-24', '2026-06-18', '2026-06-22'), true);
});

// ─── Summary ─────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
