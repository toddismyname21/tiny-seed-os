/**
 * Unit tests for flex-order.ts pure helpers. Run via `npm run test:unit`
 * (npx tsx). Node's assert; no test framework dependency (matches the
 * other *.test.ts in this repo).
 */
import assert from 'node:assert/strict';
import {
  dollarsToCents, centsToDollars, formatCents,
  cutoffEpochMs, opensEpochMs, isPastCutoff, isBeforeOpen, isWindowOpen,
  closeLabel, stockTier,
  upcomingMondayET, addWeeksYMD, isYMD, categoryEmoji,
  currentOrderWeek, windowLabels, formatWindowInstant,
} from './flex-order.ts';

/* ── money ── */
assert.equal(dollarsToCents('4'), 400);
assert.equal(dollarsToCents('4.50'), 450);
assert.equal(dollarsToCents('$4.50'), 450);
assert.equal(dollarsToCents('1,250'), 125000);
assert.equal(dollarsToCents('0'), 0);
assert.equal(dollarsToCents(''), null);
assert.equal(dollarsToCents('abc'), null);
assert.equal(dollarsToCents('-3'), null);
assert.equal(dollarsToCents(null), null);
assert.equal(dollarsToCents('4.005'), 401, 'rounds to nearest cent'); // 4.005*100=400.5→401
assert.equal(centsToDollars(450), '4.50');
assert.equal(centsToDollars(3500), '35.00');
assert.equal(formatCents(4500), '$45.00');

/* ── stock tiers (M2) ── */
assert.equal(stockTier(50), 'plenty');
assert.equal(stockTier(11), 'plenty');
assert.equal(stockTier(10), 'low');
assert.equal(stockTier(4), 'low');
assert.equal(stockTier(3), 'critical');
assert.equal(stockTier(1), 'critical');
assert.equal(stockTier(0), 'sold_out');
assert.equal(stockTier(-5), 'sold_out');

/* ── order window: open / close (Todd 2026-06-08 cadence) ── */

// — WEEK 1 ('2026-06-08'): close Tue Jun 9 2026 18:00 EDT (UTC-4) = 2026-06-09T22:00:00Z.
const cut1 = cutoffEpochMs('2026-06-08');
assert.equal(new Date(cut1).toISOString(), '2026-06-09T22:00:00.000Z', 'Week 1 close = Tue Jun 9 18:00 EDT = 22:00 UTC');
// Week 1 is already open → a far-past open instant (epoch 0).
assert.equal(opensEpochMs('2026-06-08'), 0, 'Week 1 opens at epoch 0 (already open)');
assert.equal(isBeforeOpen('2026-06-08', Date.UTC(2026, 5, 8, 0, 0, 0)), false, 'Week 1 is never before-open');
assert.equal(closeLabel('2026-06-08'), 'Tuesday 6 PM');
// Just before/at/after the Week-1 close.
assert.equal(isPastCutoff('2026-06-08', cut1 - 1000), false);
assert.equal(isPastCutoff('2026-06-08', cut1), true);
assert.equal(isPastCutoff('2026-06-08', cut1 + 1000), true);
assert.equal(isWindowOpen('2026-06-08', cut1 - 1000), true, 'Week 1 open just before close');
assert.equal(isWindowOpen('2026-06-08', cut1), false, 'Week 1 closed at cutoff');

// — STANDING WEEK ('2026-06-15', Monday):
//   opens prior Thursday Jun 11 2026 00:00 EDT (UTC-4) = 2026-06-11T04:00:00Z;
//   closes that week's Tuesday Jun 16 2026 07:00 EDT (UTC-4) = 2026-06-16T11:00:00Z.
const open15 = opensEpochMs('2026-06-15');
const cut15 = cutoffEpochMs('2026-06-15');
assert.equal(new Date(open15).toISOString(), '2026-06-11T04:00:00.000Z', 'Standing open = Thu Jun 11 00:00 EDT = 04:00 UTC');
assert.equal(new Date(cut15).toISOString(), '2026-06-16T11:00:00.000Z', 'Standing close = Tue Jun 16 07:00 EDT = 11:00 UTC');
assert.equal(closeLabel('2026-06-15'), 'Tuesday 7 AM');
// Before open (Wed Jun 10): not open, before-open true.
const beforeOpen = Date.UTC(2026, 5, 10, 12, 0, 0);
assert.equal(isBeforeOpen('2026-06-15', beforeOpen), true);
assert.equal(isWindowOpen('2026-06-15', beforeOpen), false);
assert.equal(isPastCutoff('2026-06-15', beforeOpen), false);
// At open: window open.
assert.equal(isBeforeOpen('2026-06-15', open15), false);
assert.equal(isWindowOpen('2026-06-15', open15), true);
// Just before close: still open. At close: past, not open.
assert.equal(isWindowOpen('2026-06-15', cut15 - 1000), true);
assert.equal(isPastCutoff('2026-06-15', cut15 - 1000), false);
assert.equal(isWindowOpen('2026-06-15', cut15), false);
assert.equal(isPastCutoff('2026-06-15', cut15), true);

// — DST CORRECTNESS: a winter standing week (EST, UTC-5).
//   Mon 2026-01-05 → close Tue 2026-01-06 07:00 EST = 12:00 UTC;
//   open prior Thu 2026-01-01 00:00 EST = 05:00 UTC.
const winterCut = cutoffEpochMs('2026-01-05');
assert.equal(new Date(winterCut).toISOString(), '2026-01-06T12:00:00.000Z', 'Standing close Tue 7am EST = 12:00 UTC');
const winterOpen = opensEpochMs('2026-01-05');
assert.equal(new Date(winterOpen).toISOString(), '2026-01-01T05:00:00.000Z', 'Standing open Thu 00:00 EST = 05:00 UTC');

/* ── week helpers ── */
assert.ok(isYMD('2026-06-08'));
assert.ok(!isYMD('2026-6-8'));
assert.equal(addWeeksYMD('2026-06-08', 1), '2026-06-15');
assert.equal(addWeeksYMD('2026-06-08', -1), '2026-06-01');
// upcomingMondayET on a Monday returns that Monday.
assert.equal(upcomingMondayET(new Date('2026-06-08T12:00:00-04:00')), '2026-06-08');
// On a Wednesday, returns the NEXT Monday.
assert.equal(upcomingMondayET(new Date('2026-06-10T12:00:00-04:00')), '2026-06-15');

/* ── currentOrderWeek (BUG B fix: order by WINDOW, not calendar week) ──
 *
 * Week-1 ('2026-06-08') closes Tue Jun 9 18:00 EDT (= 2026-06-09T22:00Z).
 * Standing week '2026-06-15' opens Thu Jun 11 00:00 EDT (= 2026-06-11T04:00Z),
 * closes Tue Jun 16 07:00 EDT.
 */
// Mon 6/8 (any time before Week-1 close) → 6/8, still open.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 8, 16, 0, 0)), '2026-06-08', 'Mon 6/8 → 6/8 (open)');
// Tue 6/9 10:00 ET (= 14:00 UTC, before the 18:00 ET close) → 6/8, STILL open.
//   This is the regression the bug created: upcomingMonday() returned 6/15.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 9, 14, 0, 0)), '2026-06-08', 'Tue 6/9 10:00 ET → 6/8 (still open)');
// Tue 6/9 19:00 ET (= 23:00 UTC, AFTER the 18:00 ET close) → 6/15, before-open.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 9, 23, 0, 0)), '2026-06-15', 'Tue 6/9 after close → 6/15 (before-open)');
// Wed 6/10 (Week-1 closed; 6/15 not open until Thu) → 6/15, before-open.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 10, 12, 0, 0)), '2026-06-15', 'Wed 6/10 → 6/15 (before-open)');
// Thu 6/11 (6/15 window opens Thu 00:00 ET = 04:00 UTC) → 6/15, open.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 11, 12, 0, 0)), '2026-06-15', 'Thu 6/11 → 6/15 (open)');
// Sanity: the returned week for Thu 6/11 is genuinely OPEN.
assert.equal(isWindowOpen('2026-06-15', Date.UTC(2026, 5, 11, 12, 0, 0)), true, 'Thu 6/11: 6/15 is open');
// Mon 6/15 (its own week, still open until Tue 6/16 07:00 ET) → 6/15.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 15, 16, 0, 0)), '2026-06-15', 'Mon 6/15 → 6/15 (open)');
// Tue 6/16 06:00 ET (10:00 UTC, before 07:00 ET close... 06:00 ET = 10:00 UTC < 11:00 UTC close) → 6/15, still open.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 16, 10, 0, 0)), '2026-06-15', 'Tue 6/16 06:00 ET → 6/15 (still open)');
// Wed 6/17 (6/15 closed; 6/22 opens Thu 6/18) → 6/22, before-open.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 17, 12, 0, 0)), '2026-06-22', 'Wed 6/17 → 6/22 (before-open)');

/* ── windowLabels / formatWindowInstant (closed/before-open brand copy) ── */
// Standing week 6/15: opens Thu Jun 11 12:00 AM ET, closes Tue Jun 16 7:00 AM ET.
{
  const labels = windowLabels('2026-06-15');
  assert.equal(labels.opensLabel, 'Thursday, June 11 at 12:00 AM', 'opens label = Thu Jun 11 12:00 AM ET');
  assert.equal(labels.closesLabel, 'Tuesday, June 16 at 7:00 AM', 'closes label = Tue Jun 16 7:00 AM ET');
}
// Week-1 is already open → opensLabel null; close = Tue Jun 9 6:00 PM ET.
{
  const labels = windowLabels('2026-06-08');
  assert.equal(labels.opensLabel, null, 'Week-1 opens label is null (already open)');
  assert.equal(labels.closesLabel, 'Tuesday, June 9 at 6:00 PM', 'Week-1 close = Tue Jun 9 6:00 PM ET');
}
// formatWindowInstant is plain ET.
assert.equal(formatWindowInstant(Date.UTC(2026, 5, 16, 11, 0, 0)), 'Tuesday, June 16 at 7:00 AM');

/* ── category emoji ── */
assert.equal(categoryEmoji('Herbs'), '🌿');
assert.equal(categoryEmoji('CSA Shares'), '📦');
assert.equal(categoryEmoji(null), '🧺');
assert.equal(categoryEmoji('Nonsense'), '🧺');

console.log('flex-order.test.ts — all assertions passed');
