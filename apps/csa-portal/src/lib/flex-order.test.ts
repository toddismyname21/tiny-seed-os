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
  flexMemberRank, pickFlexMemberRow, decideFlexEligibility,
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

// — WEEK 1 ('2026-06-08'): UNIFIED cutoff (Todd 2026-06-26) → Wednesday-run
//   close = Mon Jun 8 2026 07:00 EDT (UTC-4) = 2026-06-08T11:00:00Z.
const cut1 = cutoffEpochMs('2026-06-08');
assert.equal(new Date(cut1).toISOString(), '2026-06-08T11:00:00.000Z', 'Week 1 close = Mon Jun 8 07:00 EDT = 11:00 UTC');
// Week 1 is already open → a far-past open instant (epoch 0).
assert.equal(opensEpochMs('2026-06-08'), 0, 'Week 1 opens at epoch 0 (already open)');
assert.equal(isBeforeOpen('2026-06-08', Date.UTC(2026, 5, 8, 0, 0, 0)), false, 'Week 1 is never before-open');
assert.equal(closeLabel('2026-06-08'), 'Monday 7 AM');
// Just before/at/after the Week-1 close.
assert.equal(isPastCutoff('2026-06-08', cut1 - 1000), false);
assert.equal(isPastCutoff('2026-06-08', cut1), true);
assert.equal(isPastCutoff('2026-06-08', cut1 + 1000), true);
assert.equal(isWindowOpen('2026-06-08', cut1 - 1000), true, 'Week 1 open just before close');
assert.equal(isWindowOpen('2026-06-08', cut1), false, 'Week 1 closed at cutoff');

// — STANDING WEEK ('2026-06-15', Monday): opens prior Thursday Jun 11 2026
//   00:00 EDT (UTC-4) = 2026-06-11T04:00:00Z; Wednesday-run close = Mon Jun 15
//   2026 07:00 EDT (UTC-4) = 2026-06-15T11:00:00Z.
const open15 = opensEpochMs('2026-06-15');
const cut15 = cutoffEpochMs('2026-06-15');
assert.equal(new Date(open15).toISOString(), '2026-06-11T04:00:00.000Z', 'Standing open = Thu Jun 11 00:00 EDT = 04:00 UTC');
assert.equal(new Date(cut15).toISOString(), '2026-06-15T11:00:00.000Z', 'Standing close = Mon Jun 15 07:00 EDT = 11:00 UTC');
assert.equal(closeLabel('2026-06-15'), 'Monday 7 AM');
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
//   Mon 2026-01-05 → close Mon 2026-01-05 07:00 EST = 12:00 UTC;
//   open prior Thu 2026-01-01 00:00 EST = 05:00 UTC.
const winterCut = cutoffEpochMs('2026-01-05');
assert.equal(new Date(winterCut).toISOString(), '2026-01-05T12:00:00.000Z', 'Standing close Mon 7am EST = 12:00 UTC');
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
//   Wed-run cutoff = Mon Jun 15 07:00 EDT = 2026-06-15T11:00:00Z.
//   Weekend-market cutoff = Thu Jun 18 07:00 EDT = 2026-06-18T11:00:00Z.
const cutWed15 = cutoffEpochMs('2026-06-15');               // default = Monday
const cutWedExplicit15 = cutoffEpochMs('2026-06-15', 'Wed'); // 'Wed' = Monday cutoff
const cutSat15 = cutoffEpochMs('2026-06-15', 'Sat');
const cutSun15 = cutoffEpochMs('2026-06-15', 'Sun');
const cutHome15 = cutoffEpochMs('2026-06-15', null);
assert.equal(cutWedExplicit15, cutWed15, "'Wed' pickup keeps the Monday cutoff");
assert.equal(cutHome15, cutWed15, 'home delivery (null) keeps the Monday cutoff');
assert.equal(new Date(cutSat15).toISOString(), '2026-06-18T11:00:00.000Z', 'Sat market close = Thu Jun 18 07:00 EDT = 11:00:00Z');
assert.equal(cutSun15, cutSat15, 'Sun market close == Sat market close (both Thu 07:00 ET)');
assert.ok(cutSat15 > cutWed15, 'weekend-market cutoff is strictly later than the Monday cutoff');

// closeLabel reflects the member's own cutoff.
assert.equal(closeLabel('2026-06-15'), 'Monday 7 AM');
assert.equal(closeLabel('2026-06-15', 'Wed'), 'Monday 7 AM');
assert.equal(closeLabel('2026-06-15', null), 'Monday 7 AM');
assert.equal(closeLabel('2026-06-15', 'Sat'), 'Thursday 7 AM');
assert.equal(closeLabel('2026-06-15', 'Sun'), 'Thursday 7 AM');
// Week-1 weekend-market member still gets the later Thursday cutoff.
assert.equal(closeLabel('2026-06-08', 'Sat'), 'Thursday 7 AM');
assert.equal(closeLabel('2026-06-08'), 'Monday 7 AM');

// windowLabels close phrase is pickup-day-aware.
assert.equal(windowLabels('2026-06-15').closesLabel, 'Monday, June 15 at 7:00 AM');
assert.equal(windowLabels('2026-06-15', 'Sat').closesLabel, 'Thursday, June 18 at 7:00 AM', 'market close label = Thu Jun 18 07:00 ET');
assert.equal(windowLabels('2026-06-15', 'Sat').opensLabel, 'Thursday, June 11 at 12:00 AM', 'open label = prior Thursday for market member');

// — CORE SCENARIO (the unified cutoff, Todd 2026-06-26):
//   Monday 7 AM ET of the cycle week (= 2026-06-15 11:00 UTC) is EXACTLY the
//   Wednesday-run cutoff:
//     • Wed/home member is BLOCKED (at-or-past close), • Sat-market member is
//       still ALLOWED (their close is Thursday 07:00 ET).
const mon7amET = Date.UTC(2026, 5, 15, 11, 0, 0); // Mon Jun 15 07:00 EDT = the Wed-run cutoff
assert.equal(isPastCutoff('2026-06-15', mon7amET), true, 'Mon 7am ET: Wed member at/past cutoff');
assert.equal(isPastCutoff('2026-06-15', mon7amET, null), true, 'Mon 7am ET: home member past cutoff');
assert.equal(isPastCutoff('2026-06-15', mon7amET, 'Sat'), false, 'Mon 7am ET: Sat-market member NOT past cutoff');
assert.equal(isWindowOpen('2026-06-15', mon7amET, 'Sat'), true, 'Mon 7am ET: Sat-market window still OPEN');
assert.equal(isWindowOpen('2026-06-15', mon7amET), false, 'Mon 7am ET: Wed-member window CLOSED');

// Wednesday (well before the Thursday 7 AM close) — market member still in.
const wed8amET = Date.UTC(2026, 5, 17, 12, 0, 0); // Wed Jun 17 08:00 EDT
assert.equal(isPastCutoff('2026-06-15', wed8amET, 'Sat'), false, 'Wed 8am ET: Sat-market member still in');
assert.equal(isWindowOpen('2026-06-15', wed8amET, 'Sat'), true, 'Wed 8am ET: Sat-market window open');
// One second after the market close — now blocked.
assert.equal(isPastCutoff('2026-06-15', cutSat15, 'Sat'), true, 'at market cutoff: blocked');
assert.equal(isPastCutoff('2026-06-15', cutSat15 - 1000, 'Sat'), false, 'just before market cutoff: allowed');

// — THURSDAY 08:00 ET (after the Thu 07:00 market close): BOTH members are past
//   the prior week's cutoff.
const thu8amET = Date.UTC(2026, 5, 18, 12, 0, 0); // Thu Jun 18 08:00 EDT
assert.equal(isPastCutoff('2026-06-15', thu8amET), true, 'Thu 8am: Wed member past prior-week cutoff');
assert.equal(isPastCutoff('2026-06-15', thu8amET, 'Sat'), true, 'Thu 8am: market member ALSO past prior-week cutoff');

// — currentOrderWeek is pickup-day-aware: at Mon 7 AM ET, a weekend-market
//   member STAYS on the current week (6/15, open until Thu) while a Wed member
//   has already rolled to the before-open next week (6/22 opens Thu 6/18).
assert.equal(currentOrderWeek(mon7amET, 'Sat'), '2026-06-15', 'Mon 7am ET market member → 6/15 (still open)');
assert.equal(currentOrderWeek(mon7amET), '2026-06-22', 'Mon 7am ET Wed member → 6/22 (next, before-open)');
// By Wednesday the market member is still on 6/15; the Wed member is on 6/22.
assert.equal(currentOrderWeek(wed8amET, 'Sat'), '2026-06-15', 'Wed market member → 6/15 (still open)');
// After the market cutoff (Thu 8am), the market member rolls to 6/22 too.
assert.equal(currentOrderWeek(thu8amET, 'Sat'), '2026-06-22', 'Thu 8am market member → 6/22 (rolled over)');

// — DST SANITY: a WINTER weekend-market week (EST, UTC-5).
//   Mon 2026-01-05 → market close Thu 2026-01-08 07:00 EST = 2026-01-08T12:00:00Z.
const winterMarketCut = cutoffEpochMs('2026-01-05', 'Sat');
assert.equal(new Date(winterMarketCut).toISOString(), '2026-01-08T12:00:00.000Z', 'Winter market close Thu 07:00 EST = 12:00:00Z');
assert.ok(winterMarketCut > cutoffEpochMs('2026-01-05'), 'winter market cutoff later than winter Monday cutoff');

/* ── week helpers ── */
assert.ok(isYMD('2026-06-08'));
assert.ok(!isYMD('2026-6-8'));
assert.equal(addWeeksYMD('2026-06-08', 1), '2026-06-15');
assert.equal(addWeeksYMD('2026-06-08', -1), '2026-06-01');
// upcomingMondayET on a Monday returns that Monday.
assert.equal(upcomingMondayET(new Date('2026-06-08T12:00:00-04:00')), '2026-06-08');
// On a Wednesday, returns the NEXT Monday.
assert.equal(upcomingMondayET(new Date('2026-06-10T12:00:00-04:00')), '2026-06-15');

/* ── currentOrderWeek (order by WINDOW, not calendar week) ──
 *
 * UNIFIED cutoff (Todd 2026-06-26): the Wednesday-run (default) week closes its
 * own cycle MONDAY 07:00 ET. Week-1 ('2026-06-08') closes Mon Jun 8 07:00 EDT
 * (= 2026-06-08T11:00Z). Standing week '2026-06-15' opens Thu Jun 11 00:00 EDT
 * (= 2026-06-11T04:00Z) and closes Mon Jun 15 07:00 EDT (= 2026-06-15T11:00Z).
 */
// Mon 6/8 06:00 ET (before Week-1's Mon 7 AM close) → 6/8, still open.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 8, 10, 0, 0)), '2026-06-08', 'Mon 6/8 06:00 ET → 6/8 (open)');
// Mon 6/8 08:00 ET (= 12:00 UTC, AFTER the 07:00 ET close) → 6/15, before-open.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 8, 12, 0, 0)), '2026-06-15', 'Mon 6/8 after close → 6/15 (before-open)');
// Wed 6/10 (Week-1 closed; 6/15 not open until Thu) → 6/15, before-open.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 10, 12, 0, 0)), '2026-06-15', 'Wed 6/10 → 6/15 (before-open)');
// Thu 6/11 (6/15 window opens Thu 00:00 ET = 04:00 UTC) → 6/15, now OPEN.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 11, 12, 0, 0)), '2026-06-15', 'Thu 6/11 → 6/15 (open)');
assert.equal(isWindowOpen('2026-06-15', Date.UTC(2026, 5, 11, 12, 0, 0)), true, 'Thu 6/11: 6/15 is open (opens Thu)');
// Fri 6/12 (6/15 window already opened Thu) → 6/15, open.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 12, 12, 0, 0)), '2026-06-15', 'Fri 6/12 → 6/15 (open)');
// Sanity: the returned week for Fri 6/12 is genuinely OPEN.
assert.equal(isWindowOpen('2026-06-15', Date.UTC(2026, 5, 12, 12, 0, 0)), true, 'Fri 6/12: 6/15 is open');
// Mon 6/15 06:00 ET (before its own Mon 7 AM close) → 6/15, still open.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 15, 10, 0, 0)), '2026-06-15', 'Mon 6/15 06:00 ET → 6/15 (open)');
// Mon 6/15 08:00 ET (after the 07:00 ET close; 6/22 opens Thu 6/18) → 6/22, before-open.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 15, 12, 0, 0)), '2026-06-22', 'Mon 6/15 after close → 6/22 (before-open)');
// Wed 6/17 (6/15 closed; 6/22 opens Thu 6/18) → 6/22, before-open.
assert.equal(currentOrderWeek(Date.UTC(2026, 5, 17, 12, 0, 0)), '2026-06-22', 'Wed 6/17 → 6/22 (before-open)');

/* ── windowLabels / formatWindowInstant (closed/before-open brand copy) ── */
// Standing week 6/15: opens Thu Jun 11 12:00 AM ET, closes Tue Jun 16 8:00 AM ET.
{
  const labels = windowLabels('2026-06-15');
  assert.equal(labels.opensLabel, 'Thursday, June 11 at 12:00 AM', 'opens label = Thu Jun 11 12:00 AM ET');
  assert.equal(labels.closesLabel, 'Monday, June 15 at 7:00 AM', 'closes label = Mon Jun 15 7:00 AM ET');
}
// Week-1 is already open → opensLabel null; close = Mon Jun 8 7:00 AM ET.
{
  const labels = windowLabels('2026-06-08');
  assert.equal(labels.opensLabel, null, 'Week-1 opens label is null (already open)');
  assert.equal(labels.closesLabel, 'Monday, June 8 at 7:00 AM', 'Week-1 close = Mon Jun 8 7:00 AM ET');
}
// formatWindowInstant is plain ET.
assert.equal(formatWindowInstant(Date.UTC(2026, 5, 16, 11, 0, 0)), 'Tuesday, June 16 at 7:00 AM');

/* ── category emoji ── */
assert.equal(categoryEmoji('Herbs'), '🌿');
assert.equal(categoryEmoji('CSA Shares'), '📦');
assert.equal(categoryEmoji(null), '🧺');
assert.equal(categoryEmoji('Nonsense'), '🧺');


/* ══════════════════════════════════════════════════════════════════
 * FLEX ELIGIBILITY (2026-08-21) — store credit > 0 OR a live flex row.
 * ══════════════════════════════════════════════════════════════════ */

/* ── flexMemberRank: lower wins ── */
assert.equal(flexMemberRank({ share_type: 'flex', status: 'active' }), 0);
assert.equal(flexMemberRank({ share_type: 'flex', status: 'onboarding' }), 1);
assert.equal(flexMemberRank({ share_type: 'flex', status: 'paused' }), 2);
assert.equal(flexMemberRank({ share_type: 'summer_veg', status: 'active' }), 3);
assert.equal(flexMemberRank({ share_type: 'flower', status: 'active' }), 4);
assert.equal(flexMemberRank({ share_type: 'flower', status: 'paused' }), 5);
assert.equal(flexMemberRank({ share_type: 'spring_veg', status: 'inactive' }), 6);
assert.equal(
  flexMemberRank({ share_type: 'flex', status: 'cancelled' }), 6,
  'a CANCELLED flex row is not a live flex identity'
);

/* ── pickFlexMemberRow ── */
{
  const { row, hasFlexShare } = pickFlexMemberRow([]);
  assert.equal(row, null, 'no rows → null');
  assert.equal(hasFlexShare, false);
}
{
  // A live flex row always wins, even against a newer active summer share.
  const rows = [
    { id: 'b', share_type: 'summer_veg', status: 'active',  created_at: '2026-07-01T00:00:00Z' },
    { id: 'a', share_type: 'flex',       status: 'paused',  created_at: '2026-01-01T00:00:00Z' },
  ];
  const { row, hasFlexShare } = pickFlexMemberRow(rows);
  assert.equal(row!.id, 'a', 'live flex row wins outright');
  assert.equal(hasFlexShare, true);
}
{
  // REAL SHAPE (Jan Duckworth): three rows, IDENTICAL created_at. The active
  // summer_veg row must win, and the result must be STABLE — the page and the
  // submit API resolve independently and require a match.
  const ts = '2026-05-09T00:03:16.256186Z';
  const rows = [
    { id: '2ee410b2', share_type: 'spring_veg', status: 'inactive', created_at: ts },
    { id: '93e4d8a0', share_type: 'flower',     status: 'active',   created_at: ts },
    { id: '7d1b80db', share_type: 'summer_veg', status: 'active',   created_at: ts },
  ];
  const first = pickFlexMemberRow(rows);
  assert.equal(first.row!.id, '7d1b80db', 'active summer_veg is the anchor row');
  assert.equal(first.hasFlexShare, false, 'no flex row → credit must decide');
  // Same rows in a different order must give the same answer.
  assert.equal(pickFlexMemberRow([...rows].reverse()).row!.id, '7d1b80db', 'order-independent');
}
{
  // Identical rank AND identical timestamps → id is the stable tiebreak.
  const ts = '2026-05-09T00:03:16.256186Z';
  const rows = [
    { id: 'zzz', share_type: 'flower', status: 'active', created_at: ts },
    { id: 'aaa', share_type: 'flower', status: 'active', created_at: ts },
  ];
  assert.equal(pickFlexMemberRow(rows).row!.id, 'aaa');
  assert.equal(pickFlexMemberRow([...rows].reverse()).row!.id, 'aaa', 'stable either way');
}
{
  // Same rank, different timestamps → newest wins.
  const rows = [
    { id: 'old', share_type: 'flower', status: 'active', created_at: '2026-01-01T00:00:00Z' },
    { id: 'new', share_type: 'flower', status: 'active', created_at: '2026-07-01T00:00:00Z' },
  ];
  assert.equal(pickFlexMemberRow(rows).row!.id, 'new');
}
{
  // A LIVE row beats an inactive one even when the inactive one is newer —
  // place_flex_order requires status IN (active,paused,onboarding).
  const rows = [
    { id: 'dead', share_type: 'summer_veg', status: 'cancelled', created_at: '2026-07-01T00:00:00Z' },
    { id: 'live', share_type: 'flower',     status: 'paused',    created_at: '2026-01-01T00:00:00Z' },
  ];
  assert.equal(pickFlexMemberRow(rows).row!.id, 'live');
}
{
  // Missing/unparseable created_at must not throw or destabilize the sort.
  const rows = [
    { id: 'b', share_type: 'flower', status: 'active', created_at: null },
    { id: 'a', share_type: 'flower', status: 'active' },
  ];
  assert.equal(pickFlexMemberRow(rows).row!.id, 'a', 'falls through to the id tiebreak');
}
{
  // Only non-live rows → still returns one (the caller denies on eligibility,
  // not on absence), and hasFlexShare stays false.
  const rows = [{ id: 'x', share_type: 'spring_veg', status: 'inactive', created_at: null }];
  const { row, hasFlexShare } = pickFlexMemberRow(rows);
  assert.equal(row!.id, 'x');
  assert.equal(hasFlexShare, false);
}

/* ── decideFlexEligibility ── */
// (a) member with credit and no flex row → eligible on store credit.
assert.deepEqual(
  decideFlexEligibility(false, true, 47.5),
  { eligible: true, reason: 'store_credit' }
);
// (b) EXISTING flex member while Shopify is DOWN (balance null) → still in.
assert.deepEqual(
  decideFlexEligibility(true, true, null),
  { eligible: true, reason: 'flex_share' },
  'a Shopify outage must never lock an existing flex member out'
);
// A flex member with a $0 balance is still eligible to SEE/build an order —
// the balance cap is enforced separately at submit.
assert.deepEqual(
  decideFlexEligibility(true, true, 0),
  { eligible: true, reason: 'flex_share' }
);
// (c) zero credit and no flex row → denied, honestly.
assert.deepEqual(
  decideFlexEligibility(false, true, 0),
  { eligible: false, reason: 'no_credit' }
);
// A negative balance is treated as no credit, never as eligible.
assert.deepEqual(
  decideFlexEligibility(false, true, -5),
  { eligible: false, reason: 'no_credit' }
);
// Shopify unreachable AND no flex row → fall back to the OLD rule (deny),
// but marked transient so the copy can say "try again", not "you're not a member".
assert.deepEqual(
  decideFlexEligibility(false, true, null),
  { eligible: false, reason: 'balance_unavailable' }
);
// Credit but NO member row to attach flex_orders.member_id to → denied,
// and flagged as OUR data anomaly rather than the member's mistake.
assert.deepEqual(
  decideFlexEligibility(false, false, 100),
  { eligible: false, reason: 'no_member_row' }
);
// No rows at all and no credit → the plain no-credit denial.
assert.deepEqual(
  decideFlexEligibility(false, false, 0),
  { eligible: false, reason: 'no_credit' }
);

console.log('flex-order.test.ts — all assertions passed');
