/**
 * Unit tests for cycle.ts pure helpers.
 *
 * No Vitest in this repo — run as a plain Node script:
 *   npx tsx src/lib/cycle.test.ts
 *
 * Exits 0 if all assertions pass, 1 otherwise.
 *
 * These tests cover the THREE non-negotiable correctness rules from
 * docs/specs/CSA_OPERATIONS_ADMIN_SPEC.md §5:
 *
 *   1. **Biweekly query-level exclusion** (§5.2) — isMemberOnThisWeek
 *      MUST return false for biweekly off-week members so they're
 *      excluded from every aggregation that uses the resolver. Two
 *      consecutive weeks of the same member MUST alternate true/false.
 *
 *   2. **Vacation-hold exclusion** — holdOverlapsWeek (proven via
 *      applyComposition is also exercised inline) AND the resolver's
 *      member partitioning.
 *
 *   3. **Allergy substitution does NOT consume swap credits** —
 *      applyComposition flags an allergy sub but neither the swaps nor
 *      the credits column is touched.
 *
 * applyComposition (the swap+allergy logic) is also unit-tested here
 * since it's deterministic given inputs.
 */
import {
  addDays,
  applyComposition,
  bucketSize,
  deriveAddon,
  isAddonOnThisWeek,
  isMemberOnThisWeek,
  isMonday,
  isShareInSeasonForWeek,
  isValidMoveTarget,
  mondayOfWeek,
  prettyShortDate,
  prettyWeekHeader,
  resolveCycle,
  resolveStopBySlug,
  slugStop,
  upcomingMonday,
  validMoveTargetWeeks,
  weekParity,
  type StopTotals,
} from './cycle.ts';
import { SEASON_SCHEDULE } from './season.ts';

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

function assertTrue(v: boolean, msg?: string): void {
  if (!v) throw new Error(msg ?? 'expected true');
}

// ═══ Date helpers ════════════════════════════════════════════════════

test('addDays adds across month boundaries', () => {
  assertEqual(addDays('2026-06-08', 7),  '2026-06-15');
  assertEqual(addDays('2026-06-29', 7),  '2026-07-06');
  assertEqual(addDays('2026-12-30', 5),  '2027-01-04');
  assertEqual(addDays('2026-06-08', -1), '2026-06-07');
});

test('isMonday correctly identifies the day of week', () => {
  assertTrue(isMonday('2026-06-08'),  'June 8, 2026 is a Monday');
  assertTrue(!isMonday('2026-06-09'), 'June 9, 2026 is NOT a Monday');
  assertTrue(!isMonday('2026-06-07'), 'June 7, 2026 is a Sunday');
});

test('mondayOfWeek snaps mid-week dates back to Monday', () => {
  // 2026-06-08 = Mon, 2026-06-09 = Tue, ..., 2026-06-14 = Sun.
  assertEqual(mondayOfWeek('2026-06-08'), '2026-06-08'); // already Mon
  assertEqual(mondayOfWeek('2026-06-09'), '2026-06-08'); // Tue → Mon
  assertEqual(mondayOfWeek('2026-06-10'), '2026-06-08'); // Wed → Mon
  assertEqual(mondayOfWeek('2026-06-14'), '2026-06-08'); // Sun → Mon
});

// ═══ Biweekly parity ═════════════════════════════════════════════════

test('weekParity: anchor week 2026-06-08 = parity 0 (Week A)', () => {
  assertEqual(weekParity('2026-06-08'), 0);
  assertEqual(weekParity('2026-06-15'), 1); // +1 week
  assertEqual(weekParity('2026-06-22'), 0); // +2 weeks
  assertEqual(weekParity('2026-06-29'), 1); // +3 weeks
});

test('weekParity: handles weeks BEFORE the anchor (negative diff)', () => {
  assertEqual(weekParity('2026-06-01'), 1); // anchor - 1 week → Week B
  assertEqual(weekParity('2026-05-25'), 0); // anchor - 2 weeks → Week A
});

// ═══ isMemberOnThisWeek — THE CRITICAL DATA-INTEGRITY RULE ═══════════

test('isMemberOnThisWeek: null biweekly_week → always TRUE (legacy unassigned ships)', () => {
  const m = { biweekly_week: null as null };
  assertTrue(isMemberOnThisWeek(m, '2026-06-08'), 'unassigned ships week A');
  assertTrue(isMemberOnThisWeek(m, '2026-06-15'), 'unassigned ships week B');
  assertTrue(isMemberOnThisWeek(m, '2026-07-06'), 'unassigned ships any week');
});

test('isMemberOnThisWeek: Week A member SHIPS on Week A, NOT on Week B', () => {
  const m = { biweekly_week: 'A' as const };
  // Week A = parity 0 = 2026-06-08, 2026-06-22, ...
  assertTrue(isMemberOnThisWeek(m, '2026-06-08'),  'A ships week of June 8');
  assertTrue(!isMemberOnThisWeek(m, '2026-06-15'), 'A does NOT ship week of June 15');
  assertTrue(isMemberOnThisWeek(m, '2026-06-22'),  'A ships week of June 22');
  assertTrue(!isMemberOnThisWeek(m, '2026-06-29'), 'A does NOT ship week of June 29');
});

test('isMemberOnThisWeek: Week B member is the EXACT INVERSE of Week A', () => {
  const wkA = '2026-06-08';
  const wkB = '2026-06-15';
  const a = { biweekly_week: 'A' as const };
  const b = { biweekly_week: 'B' as const };
  assertTrue(isMemberOnThisWeek(a, wkA) !== isMemberOnThisWeek(b, wkA),
             'A and B disagree on week A');
  assertTrue(isMemberOnThisWeek(a, wkB) !== isMemberOnThisWeek(b, wkB),
             'A and B disagree on week B');
});

test('isMemberOnThisWeek: Week A and Week B together cover every week', () => {
  // For any week, exactly one of {Week A member, Week B member} ships.
  const a = { biweekly_week: 'A' as const };
  const b = { biweekly_week: 'B' as const };
  for (let offset = 0; offset < 16; offset += 1) {
    const wk = addDays('2026-06-08', offset * 7);
    const aShips = isMemberOnThisWeek(a, wk);
    const bShips = isMemberOnThisWeek(b, wk);
    // Exclusive OR: exactly one of them ships.
    assertTrue(aShips !== bShips, `week ${wk}: A=${aShips} B=${bShips} should differ`);
  }
});

// ═══ Add-on frequency override ═══════════════════════════════════════

test('isAddonOnThisWeek: WEEKLY add-on ships every cycle regardless of biweekly_week', () => {
  // Even a Week B member with a weekly add-on subscription gets the
  // add-on on Week A. The biweekly schedule applies to the SHARE, not
  // the add-on, when the add-on is explicitly weekly.
  const b = { biweekly_week: 'B' as const };
  assertTrue(isAddonOnThisWeek(b, 'weekly', '2026-06-08'),
             'weekly add-on ships on Week A even for B member');
  assertTrue(isAddonOnThisWeek(b, 'weekly', '2026-06-15'),
             'weekly add-on ships on Week B for B member');
});

test('isAddonOnThisWeek: BIWEEKLY add-on follows the member\'s biweekly_week', () => {
  const a = { biweekly_week: 'A' as const };
  assertTrue(isAddonOnThisWeek(a, 'biweekly', '2026-06-08'),  'A biweekly ships A');
  assertTrue(!isAddonOnThisWeek(a, 'biweekly', '2026-06-15'), 'A biweekly skips B');
});

// ═══ isShareInSeasonForWeek — THE SEASON-WINDOW RULE (Todd 2026-06-09) ═
//
// A share is only part of a week's fulfillment when that week is inside the
// share's season. Windows (Monday week_starting basis):
//   spring_veg : Wed May 6 → Wed May 27   → weeks Mon 2026-05-04 .. 2026-05-25
//   summer_veg : Wed Jun 10 → Wed Oct 7   → weeks Mon 2026-06-08 .. 2026-10-05
//   flower     : Wed Jun 24 → Wed Oct 7   → weeks Mon 2026-06-22 .. 2026-10-05

test('isShareInSeasonForWeek: spring_veg EXCLUDED from a June week (season ended May 27)', () => {
  // The exact bug Todd caught: a June label run must NOT include spring_veg.
  assertTrue(!isShareInSeasonForWeek('spring_veg', '2026-06-08'),
             'spring_veg out-of-season the week of June 8');
  assertTrue(!isShareInSeasonForWeek('spring_veg', '2026-06-01'),
             'spring_veg out-of-season the week after its last delivery');
  // …but spring_veg IS in-season during its actual run.
  assertTrue(isShareInSeasonForWeek('spring_veg', '2026-05-04'),
             'spring_veg in-season its first delivery week (Wed May 6)');
  assertTrue(isShareInSeasonForWeek('spring_veg', '2026-05-25'),
             'spring_veg in-season its LAST delivery week (Wed May 27) — inclusive');
});

test('isShareInSeasonForWeek: flower EXCLUDED before Jun 24, INCLUDED on/after', () => {
  // flower opens Wed 2026-06-24 → first week Mon 2026-06-22.
  assertTrue(!isShareInSeasonForWeek('flower', '2026-06-08'),
             'flower out-of-season week of June 8 (before opener)');
  assertTrue(!isShareInSeasonForWeek('flower', '2026-06-15'),
             'flower out-of-season week of June 15 (still before opener)');
  assertTrue(isShareInSeasonForWeek('flower', '2026-06-22'),
             'flower IN-season its first delivery week (Wed Jun 24)');
  assertTrue(isShareInSeasonForWeek('flower', '2026-10-05'),
             'flower IN-season its last delivery week (Wed Oct 7) — inclusive');
  assertTrue(!isShareInSeasonForWeek('flower', '2026-10-12'),
             'flower out-of-season the week after its last delivery');
});

test('isShareInSeasonForWeek: summer_veg IN-season Jun 10 → Oct 7, OUT before/after', () => {
  assertTrue(isShareInSeasonForWeek('summer_veg', '2026-06-08'),
             'summer in-season first week (Wed Jun 10)');
  assertTrue(isShareInSeasonForWeek('summer_veg', '2026-06-22'),
             'summer in-season mid-season');
  assertTrue(isShareInSeasonForWeek('summer_veg', '2026-10-05'),
             'summer in-season last week (Wed Oct 7) — inclusive');
  assertTrue(!isShareInSeasonForWeek('summer_veg', '2026-06-01'),
             'summer out-of-season the week before it opens');
  assertTrue(!isShareInSeasonForWeek('summer_veg', '2026-10-12'),
             'summer out-of-season the week after its last delivery');
});

test('isShareInSeasonForWeek: flex/add_on/unconfigured have NO window → always in-season', () => {
  // No SEASON_SCHEDULE entry → getSchedule null → always true, preserving
  // the prior include-if-active behavior. add_ons ride with their box.
  assertTrue(isShareInSeasonForWeek('flex', '2026-06-08'), 'flex always in-season');
  assertTrue(isShareInSeasonForWeek('flex', '2027-01-01'), 'flex in-season even off-calendar');
  assertTrue(isShareInSeasonForWeek('add_on', '2026-06-08'), 'add_on always in-season');
  assertTrue(isShareInSeasonForWeek('fall_veg', '2026-06-08'), 'unconfigured share always in-season');
});

// ═══ deriveAddon: parses Shopify product titles in members.notes ═════

test('deriveAddon: recognises mushroom/bread/cheese/coffee/eggs', () => {
  assertEqual(deriveAddon('2026 Mushroom CSA Add-On - Bi-weekly').type, 'mushroom');
  assertEqual(deriveAddon('2026 Bread Add-On - Weekly').type,           'bread');
  assertEqual(deriveAddon('Goat Rodeo Cheese CSA - Biweekly').type,     'cheese');
  assertEqual(deriveAddon('Redhawk Coffee Add-On').type,                'coffee');
  assertEqual(deriveAddon('Pasture-Raised Egg Share - weekly').type,    'eggs');
  assertEqual(deriveAddon('Shopify Order #12345').type,                 'unknown');
  assertEqual(deriveAddon(null).type,                                   'unknown');
});

test('deriveAddon: recognises weekly vs biweekly (incl. spacing variants)', () => {
  assertEqual(deriveAddon('Add-on Bi-weekly').frequency, 'biweekly');
  assertEqual(deriveAddon('Add-on biweekly').frequency,  'biweekly');
  assertEqual(deriveAddon('Add-on Bi weekly').frequency, 'biweekly');
  assertEqual(deriveAddon('Add-on Weekly').frequency,    'weekly');
  assertEqual(deriveAddon('Add-on').frequency,           'unknown');
});

// ═══ bucketSize ══════════════════════════════════════════════════════

test('bucketSize: large/regular/family → large; small/petite/light → small', () => {
  assertEqual(bucketSize('large'),   'large');
  assertEqual(bucketSize('regular'), 'large');
  assertEqual(bucketSize('family'),  'large');
  assertEqual(bucketSize('small'),   'small');
  assertEqual(bucketSize('petite'),  'small');
  assertEqual(bucketSize('light'),   'small');
  assertEqual(bucketSize(null),      'unknown');
  assertEqual(bucketSize('weird'),   'unknown');
});

// ═══ applyComposition — swap + allergy logic ══════════════════════════

test('applyComposition: no swaps, no allergies → base contents unchanged', () => {
  const base = [
    { crop: 'Lettuce', qty: 1, unit: 'head' },
    { crop: 'Carrots', qty: 1, unit: 'lb' },
  ];
  const res = applyComposition(base, [], { allergies: [], dislikes: [] });
  assertEqual(res.items, base);
  assertEqual(res.swapped_in,  []);
  assertEqual(res.swapped_out, []);
  assertEqual(res.allergy_subs, []);
});

test('applyComposition: a locked swap removes the OUT item, adds the IN item', () => {
  const base = [
    { crop: 'Lettuce', qty: 1, unit: 'head' },
    { crop: 'Kale',    qty: 1, unit: 'bunch' },
  ];
  const swaps = [{ swap_out_item: 'Kale', swap_in_item: 'Tomatoes' }];
  const res = applyComposition(base, swaps, { allergies: [], dislikes: [] });
  const cropsAfter = res.items.map((i) => i.crop).sort();
  assertEqual(cropsAfter, ['Lettuce', 'Tomatoes']);
  assertEqual(res.swapped_in,  ['Tomatoes']);
  assertEqual(res.swapped_out, ['Kale']);
});

test('applyComposition: allergy substitution does NOT consume a swap credit', () => {
  // Spec §5.3: allergies/dislikes are automatic and do NOT deduct swap_credits.
  // Proof in this layer: applyComposition takes the member's allergy list and
  // flags the matching crop without touching the swap arrays. (members.swap_credits
  // is only ever decremented elsewhere, by box_swap_events; this function
  // never returns or modifies a credit count.)
  const base = [
    { crop: 'Strawberries', qty: 1, unit: 'pint' },
    { crop: 'Lettuce',      qty: 1, unit: 'head' },
  ];
  const res = applyComposition(base, [], {
    allergies: ['strawberry'],
    dislikes: [],
  });
  // Strawberries gone; lettuce stays.
  assertEqual(res.items.map((i) => i.crop), ['Lettuce']);
  assertEqual(res.swapped_in,  [], 'no swap_in for allergy');
  assertEqual(res.swapped_out, [], 'no swap_out for allergy');
  assertEqual(res.allergy_subs.length, 1, 'one allergy sub recorded');
  assertEqual(res.allergy_subs[0].removed, 'Strawberries');
  assertTrue(res.allergy_subs[0].reason.includes('allergy'), 'reason flagged as allergy');
});

test('applyComposition: dislike removes the item even when allergy doesn\'t', () => {
  const base = [
    { crop: 'Beets', qty: 1, unit: 'bunch' },
    { crop: 'Chard', qty: 1, unit: 'bunch' },
  ];
  const res = applyComposition(base, [], { allergies: [], dislikes: ['beet'] });
  assertEqual(res.items.map((i) => i.crop), ['Chard']);
  assertEqual(res.allergy_subs.length, 1);
  assertTrue(res.allergy_subs[0].reason.includes('dislike'));
});

test('applyComposition: swap-out item that isn\'t in the base is treated as additive', () => {
  // Defensive — the menu shouldn't allow this but the resolver tolerates.
  const base = [{ crop: 'Lettuce', qty: 1, unit: 'head' }];
  const swaps = [{ swap_out_item: 'Garlic', swap_in_item: 'Onion' }];
  const res = applyComposition(base, swaps, { allergies: [], dislikes: [] });
  assertEqual(res.items.length, 2);
  assertTrue(res.items.some((i) => i.crop === 'Onion'));
  assertEqual(res.swapped_in,  ['Onion']);
});

// ═══ Date display ════════════════════════════════════════════════════

test('prettyWeekHeader formats nicely', () => {
  // June 8, 2026 is a Monday.
  assertEqual(prettyWeekHeader('2026-06-08'), 'Week of Monday, June 8');
});

test('prettyShortDate formats nicely', () => {
  assertEqual(prettyShortDate('2026-06-10'), 'Wed, Jun 10');
  assertEqual(prettyShortDate('2026-06-13'), 'Sat, Jun 13');
});

// ═══ slug helpers ════════════════════════════════════════════════════

test('slugStop: kebab-case, lowercase, strips punctuation', () => {
  assertEqual(slugStop('Highland Park'),        'highland-park');
  assertEqual(slugStop('Allison Park - Simons'), 'allison-park-simons');
  assertEqual(slugStop('Mt. Lebanon'),          'mt-lebanon');
  assertEqual(slugStop('Sewickley (CSA)'),      'sewickley-csa');
});

test('resolveStopBySlug round-trips through slugStop', () => {
  const stops: StopTotals[] = [
    { stop_id: '1', stop_name: 'Highland Park', day_of_week: 'Wed',
      boxes_small: 5, boxes_large: 2,
      addons: { mushroom: 1, bread: 0, cheese: 0, coffee: 0, eggs: 0, unknown: 0 },
      flex_orders: 0, owes_count: 0 },
    { stop_id: '2', stop_name: 'Sewickley (CSA)', day_of_week: 'Wed',
      boxes_small: 1, boxes_large: 0,
      addons: { mushroom: 0, bread: 0, cheese: 0, coffee: 0, eggs: 0, unknown: 0 },
      flex_orders: 0, owes_count: 0 },
  ];
  const found = resolveStopBySlug('sewickley-csa', stops);
  assertTrue(found !== null, 'should find by slug');
  assertEqual(found!.stop_id, '2');

  const missing = resolveStopBySlug('does-not-exist', stops);
  assertEqual(missing, null);
});

// ═══ upcomingMonday ══════════════════════════════════════════════════

test('upcomingMonday returns a Monday (any time the test runs)', () => {
  const m = upcomingMonday();
  assertTrue(/^\d{4}-\d{2}-\d{2}$/.test(m), 'looks like YYYY-MM-DD');
  assertTrue(isMonday(m), `${m} should be a Monday`);
});

// ═══ Hold overlap (proven indirectly via the integration of the rule) ══

test('vacation hold overlap logic (mirrors resolveCycle\'s exclusion)', () => {
  // This proves the SHAPE of the overlap check the resolver applies, not
  // resolveCycle itself. resolveCycle excludes a member when any of their
  // active/scheduled holds overlaps [week_starting, week_starting + 6].
  // The overlap condition is: hold.start <= week_end AND hold.end >= week_starting.
  function overlapsWeek(hold: { start_date: string; end_date: string }, weekStarting: string): boolean {
    const weekEnd = addDays(weekStarting, 6);
    return hold.start_date <= weekEnd && hold.end_date >= weekStarting;
  }
  // Hold entirely BEFORE the week → no overlap.
  assertTrue(!overlapsWeek({ start_date: '2026-06-01', end_date: '2026-06-05' }, '2026-06-08'),
             'hold ending Fri before Mon week start does NOT overlap');
  // Hold entirely AFTER the week → no overlap.
  assertTrue(!overlapsWeek({ start_date: '2026-06-15', end_date: '2026-06-21' }, '2026-06-08'),
             'hold starting next Mon does NOT overlap this week');
  // Hold entirely INSIDE the week → overlap.
  assertTrue(overlapsWeek({ start_date: '2026-06-09', end_date: '2026-06-12' }, '2026-06-08'),
             'hold entirely inside week overlaps');
  // Hold straddling the start of the week → overlap.
  assertTrue(overlapsWeek({ start_date: '2026-06-05', end_date: '2026-06-10' }, '2026-06-08'),
             'hold straddling Mon start overlaps');
  // Hold straddling the end of the week → overlap.
  assertTrue(overlapsWeek({ start_date: '2026-06-13', end_date: '2026-06-16' }, '2026-06-08'),
             'hold straddling Sun end overlaps');
  // Single-day hold on Wednesday → overlap.
  assertTrue(overlapsWeek({ start_date: '2026-06-10', end_date: '2026-06-10' }, '2026-06-08'),
             'single-day hold on Wed overlaps');
});

// ═══ MOVE-TARGET week helper (migration 0041) ════════════════════════

test('validMoveTargetWeeks: lists only FUTURE in-season delivery weeks (Mondays)', () => {
  const summer = SEASON_SCHEDULE.summer_veg; // Wed 2026-06-10, 18 wks
  // From a date mid-season, only later weeks should appear, and each
  // target's week_starting must be the Monday of that delivery Wednesday.
  const targets = validMoveTargetWeeks(summer, '2026-06-10');
  // 2026-06-10 is Week 1 (Mon 2026-06-08). Future weeks start Mon 2026-06-15.
  assertTrue(targets.length > 0, 'has future targets');
  assertEqual(targets[0].week_starting, '2026-06-15', 'first future target is week 2 Monday');
  assertEqual(targets[0].delivery_date, '2026-06-17', 'week 2 delivery Wednesday');
  assertEqual(targets[0].week_number, 2);
  // Every target is a Monday and strictly after the current week's Monday.
  for (const t of targets) {
    assertTrue(isMonday(t.week_starting), `${t.week_starting} is a Monday`);
    assertTrue(t.week_starting > '2026-06-08', 'after the current week Monday');
  }
});

test('validMoveTargetWeeks: empty once the season is fully past', () => {
  const summer = SEASON_SCHEDULE.summer_veg;
  assertEqual(validMoveTargetWeeks(summer, '2027-01-01').length, 0);
});

test('isValidMoveTarget: accepts a real future week, rejects bogus/past', () => {
  // Week 3 = Wed 2026-06-24 → Monday 2026-06-22.
  assertTrue(isValidMoveTarget('summer_veg', '2026-06-22', '2026-06-10'),
             'week-3 Monday is a valid move target');
  assertTrue(!isValidMoveTarget('summer_veg', '2026-06-08', '2026-06-10'),
             'current week is NOT a valid target (cutoff passed)');
  assertTrue(!isValidMoveTarget('summer_veg', '2026-06-23', '2026-06-10'),
             'a Tuesday (non-Monday) is not in the target set');
  assertTrue(!isValidMoveTarget('unknown_share', '2026-06-22', '2026-06-10'),
             'unconfigured share → no valid targets');
});

// ═══ resolveCycle — DISPOSITION (move / donate) ══════════════════════
//
// These exercise the FULL resolver against an in-memory Supabase mock that
// reproduces the exact PostgREST query-builder chain cycle.ts uses, and the
// DB-side pre-filters the resolver relies on (holds overlap; move-in
// holds keyed on move_to_week). Each builder is a thenable that resolves to
// { data, error } and ignores filters it doesn't need (the resolver
// re-asserts overlap locally), EXCEPT the two filters that are load-bearing:
//   - vacation_holds OVERLAP fetch (start_date <= week_end, end_date >= week)
//   - vacation_holds MOVE-IN fetch (disposition='move', move_to_week=week)

type Row = Record<string, unknown>;

/** A chainable, awaitable query stub. Filters are applied for the two
 *  vacation_holds fetches the resolver depends on; everything else passes
 *  the full dataset through (cycle.ts re-derives the rest locally). */
function makeBuilder(rows: Row[]) {
  let data = rows.slice();
  const builder: Record<string, unknown> = {};
  const ret = () => builder;
  builder.select = ret;
  builder.order = ret;
  builder.overrideTypes = ret;
  builder.eq = (col: string, val: unknown) => {
    data = data.filter((r) => r[col] === val);
    return builder;
  };
  builder.in = (col: string, vals: unknown[]) => {
    data = data.filter((r) => vals.includes(r[col]));
    return builder;
  };
  builder.lte = (col: string, val: string) => {
    data = data.filter((r) => String(r[col]) <= val);
    return builder;
  };
  builder.gte = (col: string, val: string) => {
    data = data.filter((r) => String(r[col]) >= val);
    return builder;
  };
  // Thenable: await resolves to { data, error }.
  builder.then = (resolve: (v: { data: Row[]; error: null }) => unknown) =>
    resolve({ data, error: null });
  return builder;
}

interface MockTables {
  members: Row[];
  vacation_holds: Row[];
  box_swap_events?: Row[];
  weekly_box_plan?: Row[];
  flex_orders?: Row[];
  member_preferences?: Row[];
}

function makeSupabase(tables: MockTables) {
  return {
    from(table: string) {
      const rows = (tables as unknown as Record<string, Row[] | undefined>)[table] ?? [];
      return makeBuilder(rows.map((r) => ({ ...r })));
    },
  } as unknown as Parameters<typeof resolveCycle>[0];
}

/** Minimal active member row matching the resolver's MemberJoinRow shape. */
function memberRow(over: Partial<Row> = {}): Row {
  return {
    id: 'm1',
    customer_id: 'c1',
    share_type: 'summer_veg',
    share_size: 'small',
    biweekly_week: null,
    payment_status: 'Paid',
    pickup_location_id: 'stop1',
    delivery_address: null,
    notes: null,
    customization_allowed: false,
    swap_credits: 0,
    status: 'active',
    customer: { contact_name: 'Test Member', email: 'm1@example.com' },
    pickup_location: {
      id: 'stop1', name: 'Highland Park', city: 'Pittsburgh', zip: '15206',
      day_of_week: 'Wed', time_start: null, time_end: null,
      host_name: null, host_phone: null,
    },
    ...over,
  };
}

function holdRow(over: Partial<Row> = {}): Row {
  return {
    id: 'h1', member_id: 'm1',
    start_date: '2026-06-08', end_date: '2026-06-14',
    status: 'scheduled', disposition: 'skip', move_to_week: null,
    ...over,
  };
}

const asyncTests: Array<{ name: string; fn: () => Promise<void> }> = [];
function asyncTest(name: string, fn: () => Promise<void>): void {
  asyncTests.push({ name, fn });
}

asyncTest('resolveCycle MOVE: member excluded from ORIGINAL week, ADDED to target week', async () => {
  // m1 is biweekly Week A (parity-0 weeks: 06-08, 06-22, …). They hold their
  // 06-08 box with disposition=move, move_to_week = 06-22 (a Week-A week they
  // would NOT normally receive only because they gave up 06-08 — here we use
  // a future Week-A week so the move genuinely ADDS a box they'd otherwise
  // miss after giving up 06-08). The key assertions: excluded on the
  // original week, present + tagged moved_in on the target.
  const member = memberRow({ id: 'm1', biweekly_week: 'A' });
  const hold = holdRow({
    id: 'h1', member_id: 'm1',
    start_date: '2026-06-08', end_date: '2026-06-14',
    disposition: 'move', move_to_week: '2026-06-15',
  });
  const sb = makeSupabase({ members: [member], vacation_holds: [hold] });

  // ORIGINAL week (2026-06-08): member is held → NOT receiving.
  const orig = await resolveCycle(sb, '2026-06-08');
  assertTrue(!orig.members.some((m) => m.id === 'm1'), 'm1 not receiving on original week');
  assertTrue(orig.excluded_on_hold.some((m) => m.id === 'm1'), 'm1 in excluded_on_hold on original week');

  // TARGET week (2026-06-15, a Week-B/off-parity week for this A member):
  // member ADDED, tagged moved_in + moved_from. Without the move they'd be
  // excluded_biweekly here, proving the move truly ADDS a box.
  const target = await resolveCycle(sb, '2026-06-15');
  const moved = target.members.find((m) => m.id === 'm1');
  assertTrue(!!moved, 'm1 receiving on target week');
  assertTrue(moved!.moved_in === true, 'm1 tagged moved_in');
  assertEqual(moved!.moved_from, '2026-06-08', 'moved_from = original week Monday');
});

asyncTest('resolveCycle MOVE: biweekly member can move onto an OFF-PARITY week', async () => {
  // m1 is biweekly Week A (ships parity-0 weeks: 06-08, 06-22, ...). They
  // move their 06-08 box to 06-15 — a Week B (off-parity) week they would
  // NOT normally receive. The move must still land.
  const member = memberRow({ id: 'm1', biweekly_week: 'A' });
  const hold = holdRow({
    id: 'h1', member_id: 'm1',
    start_date: '2026-06-08', end_date: '2026-06-14',
    disposition: 'move', move_to_week: '2026-06-15',
  });
  const sb = makeSupabase({ members: [member], vacation_holds: [hold] });

  // Sanity: without the move, a Week-A member is excluded_biweekly on 06-15.
  // (We prove the move overrides that.)
  const target = await resolveCycle(sb, '2026-06-15');
  const moved = target.members.find((m) => m.id === 'm1');
  assertTrue(!!moved, 'Week-A member receives on off-parity target week via move');
  assertTrue(moved!.moved_in === true, 'tagged moved_in');
  // And they must NOT also appear in excluded_biweekly for that week.
  assertTrue(!target.excluded_biweekly.some((m) => m.id === 'm1'),
             'moved-in member not double-listed as biweekly-excluded');
});

asyncTest('resolveCycle DONATE: member excluded from receiving AND surfaced in donated[]', async () => {
  const member = memberRow({ id: 'm1' });
  const hold = holdRow({
    id: 'h1', member_id: 'm1',
    start_date: '2026-06-08', end_date: '2026-06-14',
    disposition: 'donate', move_to_week: null,
  });
  const sb = makeSupabase({ members: [member], vacation_holds: [hold] });

  const c = await resolveCycle(sb, '2026-06-08');
  assertTrue(!c.members.some((m) => m.id === 'm1'), 'donate member NOT receiving');
  assertTrue(c.excluded_on_hold.some((m) => m.id === 'm1'), 'donate member in excluded_on_hold');
  assertEqual(c.donated.length, 1, 'one donated box');
  assertEqual(c.donated[0].id, 'm1', 'donated[] holds the right member');
  // A skip member, by contrast, must NOT appear in donated[].
});

asyncTest('resolveCycle SKIP: held member excluded, NOT in donated[], NOT moved_in anywhere', async () => {
  const member = memberRow({ id: 'm1' });
  const hold = holdRow({ disposition: 'skip', move_to_week: null });
  const sb = makeSupabase({ members: [member], vacation_holds: [hold] });

  const c = await resolveCycle(sb, '2026-06-08');
  assertTrue(!c.members.some((m) => m.id === 'm1'), 'skip member excluded');
  assertEqual(c.donated.length, 0, 'skip does NOT create a donation');

  // A later week with no move target → member not moved-in anywhere.
  const later = await resolveCycle(sb, '2026-06-15');
  assertTrue(!later.members.some((m) => m.id === 'm1' && m.moved_in),
             'skip member never moved_in');
});

asyncTest('resolveCycle MOVE: no double-count when target week is also a normal receiving week', async () => {
  // m1 is WEEKLY (receives every week). They have a hold on 06-08 with
  // disposition=move, move_to_week=06-15. On 06-15 they ALREADY receive
  // normally (weekly). The move-in pass must NOT add a duplicate row.
  const member = memberRow({ id: 'm1', biweekly_week: null });
  const hold = holdRow({
    id: 'h1', member_id: 'm1',
    start_date: '2026-06-08', end_date: '2026-06-14',
    disposition: 'move', move_to_week: '2026-06-15',
  });
  const sb = makeSupabase({ members: [member], vacation_holds: [hold] });

  const target = await resolveCycle(sb, '2026-06-15');
  const matches = target.members.filter((m) => m.id === 'm1');
  assertEqual(matches.length, 1, 'm1 appears exactly once on target week (no double-count)');
  // Since they were already receiving normally, the existing row wins
  // (moved_in stays false — they didn't NEED the move to get this box).
  assertTrue(matches[0].moved_in === false, 'normal receiving row preserved (not moved_in)');
});

asyncTest('resolveCycle MOVE: respects the member\'s OTHER holds on the target week', async () => {
  // m1 moves their 06-08 box to 06-15, but ALSO has a separate skip hold
  // covering 06-15. They must NOT be moved-in onto a week they're held for.
  const member = memberRow({ id: 'm1', biweekly_week: 'A' });
  const moveHold = holdRow({
    id: 'h1', member_id: 'm1',
    start_date: '2026-06-08', end_date: '2026-06-14',
    disposition: 'move', move_to_week: '2026-06-15',
  });
  const otherHold = holdRow({
    id: 'h2', member_id: 'm1',
    start_date: '2026-06-15', end_date: '2026-06-21',
    disposition: 'skip', move_to_week: null,
  });
  const sb = makeSupabase({ members: [member], vacation_holds: [moveHold, otherHold] });

  const target = await resolveCycle(sb, '2026-06-15');
  assertTrue(!target.members.some((m) => m.id === 'm1'),
             'm1 NOT moved-in onto a week they are separately on hold for');
  assertTrue(target.excluded_on_hold.some((m) => m.id === 'm1'),
             'm1 excluded_on_hold on that week (the other hold wins)');
});

// ═══ resolveCycle — SEASON WINDOW (Todd 2026-06-09) ══════════════════
//
// These prove the bug fix end-to-end: out-of-season shares are dropped from
// `members` (and therefore from byStop, byDistributionDay, labels, pack
// sheets, harvest) at the resolver, while in-window shares and shares with
// no season (flex/add_on) are untouched. A moved-in summer member must
// still land on an in-season target week.

asyncTest('resolveCycle SEASON: spring_veg EXCLUDED from a June week, summer INCLUDED', async () => {
  // The exact bug: on the June 8 week, a spring_veg member (season ended
  // May 27) must NOT receive a box; a summer_veg member must.
  const spring = memberRow({ id: 'spring1', share_type: 'spring_veg', customer_id: 'cs' });
  const summer = memberRow({ id: 'summer1', share_type: 'summer_veg', customer_id: 'cu' });
  const sb = makeSupabase({ members: [spring, summer], vacation_holds: [] });

  const c = await resolveCycle(sb, '2026-06-08');
  assertTrue(!c.members.some((m) => m.id === 'spring1'), 'spring_veg NOT receiving in June');
  assertTrue(c.excluded_out_of_season.some((m) => m.id === 'spring1'),
             'spring_veg surfaced in excluded_out_of_season');
  assertTrue(c.members.some((m) => m.id === 'summer1'), 'summer_veg receiving in June');
  // And it must NOT leak into the other exclusion buckets.
  assertTrue(!c.excluded_biweekly.some((m) => m.id === 'spring1'),
             'out-of-season spring not double-listed as biweekly-excluded');
  assertTrue(!c.excluded_on_hold.some((m) => m.id === 'spring1'),
             'out-of-season spring not double-listed as on-hold');
});

asyncTest('resolveCycle SEASON: flower EXCLUDED before Jun 24, INCLUDED on/after', async () => {
  const flower = memberRow({ id: 'flower1', share_type: 'flower', customer_id: 'cf' });
  const sb = makeSupabase({ members: [flower], vacation_holds: [] });

  // Week of June 8 — flower hasn't started (opener Wed Jun 24).
  const before = await resolveCycle(sb, '2026-06-08');
  assertTrue(!before.members.some((m) => m.id === 'flower1'), 'flower NOT receiving before Jun 24');
  assertTrue(before.excluded_out_of_season.some((m) => m.id === 'flower1'),
             'flower in excluded_out_of_season before its opener');

  // Week of June 22 — flower's first delivery week (Wed Jun 24).
  const opening = await resolveCycle(sb, '2026-06-22');
  assertTrue(opening.members.some((m) => m.id === 'flower1'),
             'flower receiving its opening week (Jun 24)');
  assertTrue(!opening.excluded_out_of_season.some((m) => m.id === 'flower1'),
             'flower not excluded on its opening week');
});

asyncTest('resolveCycle SEASON: flex + add_on unaffected by the season window', async () => {
  // Neither has a configured season → both ship on any active week, even one
  // (2027) far outside every veg/flower season.
  const flex = memberRow({ id: 'flex1', share_type: 'flex', customer_id: 'cflex' });
  const addon = memberRow({
    id: 'addon1', share_type: 'add_on', customer_id: 'caddon',
    notes: '2026 Mushroom CSA Add-On - Weekly',
  });
  const sb = makeSupabase({ members: [flex, addon], vacation_holds: [] });

  const off = await resolveCycle(sb, '2027-01-04'); // a Monday, no season
  assertTrue(off.members.some((m) => m.id === 'flex1'), 'flex unaffected by season window');
  assertTrue(off.members.some((m) => m.id === 'addon1'), 'add_on unaffected by season window');
  assertEqual(off.excluded_out_of_season.length, 0, 'no season exclusions for unscheduled shares');
});

asyncTest('resolveCycle SEASON: a moved-in summer member is still INCLUDED on the in-season target', async () => {
  // A summer_veg member (biweekly Week A) moves their held 06-08 box onto
  // 06-15. The target is in-season (summer runs Jun 8 .. Oct 5 by week), so
  // the season filter must NOT drop the moved-in member.
  const member = memberRow({ id: 'm1', share_type: 'summer_veg', biweekly_week: 'A' });
  const hold = holdRow({
    id: 'h1', member_id: 'm1',
    start_date: '2026-06-08', end_date: '2026-06-14',
    disposition: 'move', move_to_week: '2026-06-15',
  });
  const sb = makeSupabase({ members: [member], vacation_holds: [hold] });

  const target = await resolveCycle(sb, '2026-06-15');
  const moved = target.members.find((m) => m.id === 'm1');
  assertTrue(!!moved, 'moved-in summer member present on in-season target week');
  assertTrue(moved!.moved_in === true, 'tagged moved_in');
  assertTrue(!target.excluded_out_of_season.some((m) => m.id === 'm1'),
             'moved-in member NOT dropped by the season filter');
});

// ═══ resolveCycle — FLEX bypasses biweekly parity (incident 2026-06-10) ═
//
// PRODUCTION INCIDENT: a data sync stamped every flex member's biweekly_week
// with a junk A/B tag. The resolver applied isMemberOnThisWeek (A/B parity)
// to flex members, so 'B'-tagged flex members were dropped from a Week-A run
// even though they HAD flex orders — 7 members' orders missed the truck.
// Flex receipt is governed SOLELY by having a flex order (which downstream
// pages gate on); the resolver must never exclude flex for parity. These
// tests are the defense-in-depth guard that this can never recur.

asyncTest('resolveCycle FLEX: a flex member tagged week B is INCLUDED on a week-A cycle', async () => {
  // 2026-06-08 is a Week-A (parity 0) cycle. A 'B'-tagged flex member would
  // be excluded_biweekly under naive parity — the bypass keeps them IN.
  const flexB = memberRow({ id: 'flexB', share_type: 'flex', biweekly_week: 'B', customer_id: 'cfb' });
  const sb = makeSupabase({ members: [flexB], vacation_holds: [] });

  const c = await resolveCycle(sb, '2026-06-08'); // Week A
  assertTrue(c.members.some((m) => m.id === 'flexB'),
             'B-tagged flex member INCLUDED on a Week-A cycle');
  assertTrue(!c.excluded_biweekly.some((m) => m.id === 'flexB'),
             'flex member NOT in excluded_biweekly (parity bypassed)');
  const row = c.members.find((m) => m.id === 'flexB');
  assertTrue(row!.on_this_week === true, 'flex member marked on_this_week regardless of A/B tag');
});

asyncTest('resolveCycle FLEX: a flex member tagged week A is INCLUDED on a week-B cycle (inverse)', async () => {
  // 2026-06-15 is a Week-B (parity 1) cycle. An 'A'-tagged flex member would
  // be excluded_biweekly under naive parity — the bypass keeps them IN.
  const flexA = memberRow({ id: 'flexA', share_type: 'flex', biweekly_week: 'A', customer_id: 'cfa' });
  const sb = makeSupabase({ members: [flexA], vacation_holds: [] });

  const c = await resolveCycle(sb, '2026-06-15'); // Week B
  assertTrue(c.members.some((m) => m.id === 'flexA'),
             'A-tagged flex member INCLUDED on a Week-B cycle');
  assertTrue(!c.excluded_biweekly.some((m) => m.id === 'flexA'),
             'flex member NOT in excluded_biweekly (parity bypassed)');

  // Control: a summer_veg member with the SAME A tag on this same Week-B
  // cycle MUST still be excluded_biweekly — proving parity behavior is
  // preserved for non-flex shares.
  const vegA = memberRow({ id: 'vegA', share_type: 'summer_veg', biweekly_week: 'A', customer_id: 'cva' });
  const sb2 = makeSupabase({ members: [vegA], vacation_holds: [] });
  const c2 = await resolveCycle(sb2, '2026-06-15'); // Week B
  assertTrue(!c2.members.some((m) => m.id === 'vegA'),
             'summer_veg A member NOT receiving on Week B (parity preserved)');
  assertTrue(c2.excluded_biweekly.some((m) => m.id === 'vegA'),
             'summer_veg A member IS excluded_biweekly on Week B (control)');
});

// ═══ Done ════════════════════════════════════════════════════════════

(async () => {
  for (const t of asyncTests) {
    try {
      await t.fn();
      passed += 1;
      console.log(`  ok  ${t.name}`);
    } catch (err) {
      failed += 1;
      console.log(`  FAIL ${t.name}`);
      console.log(`       ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log('');
  console.log(`${passed} passed, ${failed} failed`);
  if (failed > 0) {
    const p = (globalThis as { process?: { exit: (n: number) => never } }).process;
    if (p) p.exit(1);
  }
})();
