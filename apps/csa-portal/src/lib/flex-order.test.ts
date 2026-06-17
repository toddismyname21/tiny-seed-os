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
  isWeekendMarket,
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

// — WEEK 1 ('2026-06-08'): close now aligned to Tue Jun 9 2026 08:00 EDT
//   (UTC-4) = 2026-06-09T12:00:00Z (was 18:00 ET; retired 2026-06-16 so
//   Week 1 shares the standing Tuesday-8-AM deadline).
const cut1 = cutoffEpochMs('2026-06-08');
assert.equal(new Date(cut1).toISOString(), '2026-06-09T12:00:00.000Z', 'Week 1 close = Tue Jun 9 08:00 EDT = 12:00 UTC');
// Week 1 is already open → a far-past open instant (epoch 0).
assert.equal(opensEpochMs('2026-06-08'), 0, 'Week 1 opens at epoch 0 (already open)');
assert.equal(isBeforeOpen('2026-06-08', Date.UTC(2026, 5, 8, 0, 0, 0)), false, 'Week 1 is never before-open');
assert.equal(closeLabel('2026-06-08'), 'Tuesday 8 AM');
// Just before/at/after the Week-1 close.
assert.equal(isPastCutoff('2026-06-08', cut1 - 1000), false);
assert.equal(isPastCutoff('2026-06-08', cut1), true);
assert.equal(isPastCutoff('2026-06-08', cut1 + 1000), true);
assert.equal(isWindowOpen('2026-06-08', cut1 - 1000), true, 'Week 1 open just before close');
assert.equal(isWindowOpen('2026-06-08', cut1), false, 'Week 1 closed at cutoff');

// — STANDING WEEK ('2026-06-15', Monday): window aligned to box-swap cutoff
//   (Todd 2026-06-16; open day moved Friday → Thursday 2026-06-17):
//   opens prior Thursday Jun 11 2026 00:00 EDT (UTC-4) = 2026-06-11T04:00:00Z;
//   closes that week's Tuesday Jun 16 2026 08:00 EDT (UTC-4) = 2026-06-16T12:00:00Z.
const open15 = opensEpochMs('2026-06-15');
const cut15 = cutoffEpochMs('2026-06-15');
assert.equal(new Date(open15).toISOString(), '2026-06-11T04:00:00.000Z', 'Standing open = Thu Jun 11 00:00 EDT = 04:00 UTC');
assert.equal(new Date(cut15).toISOString(), '2026-06-16T12:00:00.000Z', 'Standing close = Tue Jun 16 08:00 EDT = 12:00 UTC');
assert.equal(closeLabel('2026-06-15'), 'Tuesday 8 AM');
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
//   Mon 2026-01-05 → close Tue 2026-01-06 08:00 EST = 13:00 UTC;
//   open prior Thu 2026-01-01 00:00 EST = 05:00 UTC.
const winterCut = cutoffEpochMs('2026-01-05');
assert.equal(new Date(winterCut).toISOString(), '2026-01-06T13:00:00.000Z', 'Standing close Tue 8am EST = 13:00 UTC');
const winterOpen = opensEpochMs('2026-01-05');
assert.equal(new Date(winterOpen).toISOString(), '2026-01-01T05:00:00.000Z', 'Standing open Thu 00:00 EST = 05:00 UTC');

/* ── PICKUP-DAY-AWARE cutoff (Todd 2026-06-12) ──
 *
 * Weekend-market members (pickup day 'Sat'/'Sun') may order/edit/cancel/skip
 * until WEDNESDAY 23:59:59 ET of the cycle week; Wed/home members keep the
 * standing Tuesday cutoff. The OPEN instant (prior Fri 00:00 ET) is unchanged
 * for everyone — only the CLOSE shifts.
 */

// isWeekendMarket predicate.
assert.equal(isWeekendMarket('Sat'), true);
assert.equal(isWeekendMarket('Sun'), true);
assert.equal(isWeekendMarket('Wed'), false);
assert.equal(isWeekendMarket('Mon'), false);
assert.equal(isWeekendMarket(null), false, 'home delivery (null) is NOT weekend-market');
assert.equal(isWeekendMarket(undefined), false);

// — Standing week '2026-06-15' (Monday):
//   Wed/home cutoff = Tue Jun 16 08:00 EDT = 2026-06-16T12:00:00Z.
//   Weekend-market cutoff = Wed Jun 17 23:59:59 EDT = 2026-06-18T03:59:59Z.
const cutWed15 = cutoffEpochMs('2026-06-15');               // default = Tue
const cutWedExplicit15 = cutoffEpochMs('2026-06-15', 'Wed'); // 'Wed' = Tue cutoff
const cutSat15 = cutoffEpochMs('2026-06-15', 'Sat');
const cutSun15 = cutoffEpochMs('2026-06-15', 'Sun');
const cutHome15 = cutoffEpochMs('2026-06-15', null);
assert.equal(cutWedExplicit15, cutWed15, "'Wed' pickup keeps the Tuesday cutoff");
assert.equal(cutHome15, cutWed15, 'home delivery (null) keeps the Tuesday cutoff');
assert.equal(new Date(cutSat15).toISOString(), '2026-06-18T03:59:59.000Z', 'Sat market close = Wed Jun 17 23:59:59 EDT = 03:59:59Z next day');
assert.equal(cutSun15, cutSat15, 'Sun market close == Sat market close (both Wed 23:59:59 ET)');
assert.ok(cutSat15 > cutWed15, 'weekend-market cutoff is strictly later than the Tuesday cutoff');

// closeLabel reflects the member's own cutoff.
assert.equal(closeLabel('2026-06-15'), 'Tuesday 8 AM');
assert.equal(closeLabel('2026-06-15', 'Wed'), 'Tuesday 8 AM');
assert.equal(closeLabel('2026-06-15', null), 'Tuesday 8 AM');
assert.equal(closeLabel('2026-06-15', 'Sat'), 'Wednesday midnight');
assert.equal(closeLabel('2026-06-15', 'Sun'), 'Wednesday midnight');
// Week-1 weekend-market member still gets Wednesday midnight (later than Tue 8 AM).
assert.equal(closeLabel('2026-06-08', 'Sat'), 'Wednesday midnight');
assert.equal(closeLabel('2026-06-08'), 'Tuesday 8 AM');

// windowLabels close phrase is pickup-day-aware (Wed 11:59 PM ET for market).
assert.equal(windowLabels('2026-06-15').closesLabel, 'Tuesday, June 16 at 8:00 AM');
assert.equal(windowLabels('2026-06-15', 'Sat').closesLabel, 'Wednesday, June 17 at 11:59 PM', 'market close label = Wed Jun 17 11:59 PM ET');
assert.equal(windowLabels('2026-06-15', 'Sat').opensLabel, 'Thursday, June 11 at 12:00 AM', 'open label = prior Thursday for market member');

// — CORE SCENARIO (Todd's rule, the emailed promise):
//   Tuesday 8 AM ET of the cycle week (= 2026-06-16 12:00 UTC) is EXACTLY the
//   standing Wed/home cutoff (Tue 08:00 ET = 12:00 UTC, box-swap-aligned):
//     • Wed/home member is BLOCKED (at-or-past close), • Sat-market member is
//       still ALLOWED (their close is Wed 23:59:59 ET).
const tue8amET = Date.UTC(2026, 5, 16, 12, 0, 0); // 08:00 EDT = the cutoff instant
assert.equal(isPastCutoff('2026-06-15', tue8amET), true, 'Tue 8am ET: Wed member at/past cutoff');
assert.equal(isPastCutoff('2026-06-15', tue8amET, null), true, 'Tue 8am ET: home member past cutoff');
assert.equal(isPastCutoff('2026-06-15', tue8amET, 'Sat'), false, 'Tue 8am ET: Sat-market member NOT past cutoff');
assert.equal(isWindowOpen('2026-06-15', tue8amET, 'Sat'), true, 'Tue 8am ET: Sat-market window still OPEN');
assert.equal(isWindowOpen('2026-06-15', tue8amET), false, 'Tue 8am ET: Wed-member window CLOSED');

// Wednesday 11:00 PM ET (before the 23:59:59 close) — market member still in.
const wed11pmET = Date.UTC(2026, 5, 18, 3, 0, 0); // Wed Jun 17 23:00 EDT = Thu 03:00 UTC
assert.equal(isPastCutoff('2026-06-15', wed11pmET, 'Sat'), false, 'Wed 11pm ET: Sat-market member still in');
assert.equal(isWindowOpen('2026-06-15', wed11pmET, 'Sat'), true, 'Wed 11pm ET: Sat-market window open');
// One second after the market close — now blocked.
assert.equal(isPastCutoff('2026-06-15', cutSat15, 'Sat'), true, 'at market cutoff: blocked');
assert.equal(isPastCutoff('2026-06-15', cutSat15 - 1000, 'Sat'), false, 'just before market cutoff: allowed');

// — THURSDAY 00:01 ET of the NEXT calendar week: BOTH members are past the
//   PRIOR week's cutoff (the prior week '2026-06-15' closed Tue/Wed; by Thu
//   even the market cutoff Wed 23:59:59 has passed).
const thu0001ET = Date.UTC(2026, 5, 18, 4, 1, 0); // Thu Jun 18 00:01 EDT = 04:01 UTC
assert.equal(isPastCutoff('2026-06-15', thu0001ET), true, 'Thu 00:01: Wed member past prior-week cutoff');
assert.equal(isPastCutoff('2026-06-15', thu0001ET, 'Sat'), true, 'Thu 00:01: market member ALSO past prior-week cutoff');

// — currentOrderWeek is pickup-day-aware: on Tuesday 8 AM ET, a weekend-market
//   member STAYS on the current week (6/15, still open) while a Wed member has
//   already rolled to the before-open next week (6/22 opens Fri 6/19).
assert.equal(currentOrderWeek(tue8amET, 'Sat'), '2026-06-15', 'Tue 8am ET market member → 6/15 (still open)');
assert.equal(currentOrderWeek(tue8amET), '2026-06-22', 'Tue 8am ET Wed member → 6/22 (next, before-open)');
// By Wed 11pm ET the market member is still on 6/15; the Wed member is on 6/22.
assert.equal(currentOrderWeek(wed11pmET, 'Sat'), '2026-06-15', 'Wed 11pm ET market member → 6/15 (still open)');
// After the market cutoff (Thu 00:01), the market member rolls to 6/22 too.
assert.equal(currentOrderWeek(thu0001ET, 'Sat'), '2026-06-22', 'Thu 00:01 market member → 6/22 (rolled over)');

// — DST SANITY: a WINTER weekend-market week (EST, UTC-5).
//   Mon 2026-01-05 → market close Wed 2026-01-07 23:59:59 EST = 2026-01-08T04:59:59Z.
const winterMarketCut = cutoffEpochMs('2026-01-05', 'Sat');
assert.equal(new Date(winterMarketCut).toISOString(), '2026-01-08T04:59:59.000Z', 'Winter market close Wed 23:59:59 EST = 04:59:59Z');
assert.ok(winterMarketCut > cutoffEpochMs('2026-01-05'), 'winter market cutoff later than winter Tuesday cutoff');

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
 * Week-1 ('2026-06-08') closes Tue Jun 9 08:00 EDT (= 2026-06-09T12:00Z)
 * (aligned to the standing Tuesday-8-AM deadline 2026-06-16).
 * Standing week '2026-06-15' opens Thu Jun 11 00:00 EDT (= 2026-06-11T04:00Z)
 * (open day moved Friday → Thursday 2026-06-17),
 * closes Tue Jun 16 08:00 EDT (= 2026-06-16T12:00Z).
 */
// Mon 6/8 (any time before Week-1 close) → 6/8, still open.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 8, 16, 0, 0)), '2026-06-08', 'Mon 6/8 → 6/8 (open)');
// Tue 6/9 07:00 ET (= 11:00 UTC, before the 08:00 ET close) → 6/8, STILL open.
//   This is the regression the bug created: upcomingMonday() returned 6/15.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 9, 11, 0, 0)), '2026-06-08', 'Tue 6/9 07:00 ET → 6/8 (still open)');
// Tue 6/9 09:00 ET (= 13:00 UTC, AFTER the 08:00 ET close) → 6/15, before-open.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 9, 13, 0, 0)), '2026-06-15', 'Tue 6/9 after close → 6/15 (before-open)');
// Wed 6/10 (Week-1 closed; 6/15 not open until Thu) → 6/15, before-open.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 10, 12, 0, 0)), '2026-06-15', 'Wed 6/10 → 6/15 (before-open)');
// Thu 6/11 (6/15 window opens Thu 00:00 ET = 04:00 UTC) → 6/15, now OPEN.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 11, 12, 0, 0)), '2026-06-15', 'Thu 6/11 → 6/15 (open)');
assert.equal(isWindowOpen('2026-06-15', Date.UTC(2026, 5, 11, 12, 0, 0)), true, 'Thu 6/11: 6/15 is open (opens Thu)');
// Fri 6/12 (6/15 window already opened Thu) → 6/15, open.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 12, 12, 0, 0)), '2026-06-15', 'Fri 6/12 → 6/15 (open)');
// Sanity: the returned week for Fri 6/12 is genuinely OPEN.
assert.equal(isWindowOpen('2026-06-15', Date.UTC(2026, 5, 12, 12, 0, 0)), true, 'Fri 6/12: 6/15 is open');
// Mon 6/15 (its own week, still open until Tue 6/16 08:00 ET) → 6/15.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 15, 16, 0, 0)), '2026-06-15', 'Mon 6/15 → 6/15 (open)');
// Tue 6/16 07:00 ET (11:00 UTC, before 08:00 ET = 12:00 UTC close) → 6/15, still open.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 16, 11, 0, 0)), '2026-06-15', 'Tue 6/16 07:00 ET → 6/15 (still open)');
// Wed 6/17 (6/15 closed; 6/22 opens Thu 6/18) → 6/22, before-open.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 17, 12, 0, 0)), '2026-06-22', 'Wed 6/17 → 6/22 (before-open)');

/* ── windowLabels / formatWindowInstant (closed/before-open brand copy) ── */
// Standing week 6/15: opens Thu Jun 11 12:00 AM ET, closes Tue Jun 16 8:00 AM ET.
{
  const labels = windowLabels('2026-06-15');
  assert.equal(labels.opensLabel, 'Thursday, June 11 at 12:00 AM', 'opens label = Thu Jun 11 12:00 AM ET');
  assert.equal(labels.closesLabel, 'Tuesday, June 16 at 8:00 AM', 'closes label = Tue Jun 16 8:00 AM ET');
}
// Week-1 is already open → opensLabel null; close = Tue Jun 9 8:00 AM ET.
{
  const labels = windowLabels('2026-06-08');
  assert.equal(labels.opensLabel, null, 'Week-1 opens label is null (already open)');
  assert.equal(labels.closesLabel, 'Tuesday, June 9 at 8:00 AM', 'Week-1 close = Tue Jun 9 8:00 AM ET');
}
// formatWindowInstant is plain ET.
assert.equal(formatWindowInstant(Date.UTC(2026, 5, 16, 11, 0, 0)), 'Tuesday, June 16 at 7:00 AM');

/* ── category emoji ── */
assert.equal(categoryEmoji('Herbs'), '🌿');
assert.equal(categoryEmoji('CSA Shares'), '📦');
assert.equal(categoryEmoji(null), '🧺');
assert.equal(categoryEmoji('Nonsense'), '🧺');

console.log('flex-order.test.ts — all assertions passed');
