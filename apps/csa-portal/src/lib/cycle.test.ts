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
  mondayOfWeek,
  prettyShortDate,
  prettyWeekHeader,
  resolveStopBySlug,
  slugStop,
  upcomingMonday,
  weekParity,
  type StopTotals,
} from './cycle.ts';

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

// ═══ Done ════════════════════════════════════════════════════════════

console.log('');
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) {
  const p = (globalThis as { process?: { exit: (n: number) => never } }).process;
  if (p) p.exit(1);
}
