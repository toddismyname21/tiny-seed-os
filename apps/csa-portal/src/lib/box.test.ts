/**
 * Unit tests for the box_contents share_type bucket mapping (lib/box).
 *
 * Run via: npm run test:unit  (tsx; vitest is NOT installed).
 *
 * The bug this covers: box_contents for veg is published by SIZE bucket
 * ('small' / 'family' / 'large'), but the /box page used to query by the
 * member's ENUM share_type ('summer_veg'), so a summer_veg member saw
 * "not published" even when their box existed. boxContentsShareTypesFor +
 * resolveBoxContentsBuckets map a member onto the right bucket(s).
 */
import {
  boxContentsShareTypesFor,
  resolveBoxContentsBuckets,
  isCutoffPassed,
} from './box';
import { mondayOfWeek } from './cycle';

let passed = 0;
function assertEqualArr(actual: string[], expected: string[], msg: string): void {
  const ok = actual.length === expected.length && actual.every((v, i) => v === expected[i]);
  if (!ok) {
    throw new Error(`FAIL: ${msg}\n  expected: [${expected.join(',')}]\n  actual:   [${actual.join(',')}]`);
  }
  passed++;
}
function assertEq<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected) {
    throw new Error(`FAIL: ${msg}\n  expected: ${String(expected)}\n  actual:   ${String(actual)}`);
  }
  passed++;
}
function assertUnordered(actual: string[], expected: string[], msg: string): void {
  const a = [...actual].sort();
  const b = [...expected].sort();
  const ok = a.length === b.length && a.every((v, i) => v === b[i]);
  if (!ok) {
    throw new Error(`FAIL: ${msg}\n  expected (any order): [${expected.join(',')}]\n  actual:   [${actual.join(',')}]`);
  }
  passed++;
}

const tests: Array<{ name: string; fn: () => void }> = [];
function test(name: string, fn: () => void): void {
  tests.push({ name, fn });
}

test('summer_veg/small → ["small"]', () => {
  assertEqualArr(boxContentsShareTypesFor({ share_type: 'summer_veg', share_size: 'small' }), ['small'], 'small bucket');
});

test('summer_veg/family → ["family","large"] (prefer family)', () => {
  assertEqualArr(boxContentsShareTypesFor({ share_type: 'summer_veg', share_size: 'family' }), ['family', 'large'], 'family then large');
});

test('summer_veg/large → ["family","large"]', () => {
  assertEqualArr(boxContentsShareTypesFor({ share_type: 'summer_veg', share_size: 'large' }), ['family', 'large'], 'large size reads family/large');
});

test('spring_veg/regular → ["family","large"]', () => {
  assertEqualArr(boxContentsShareTypesFor({ share_type: 'spring_veg', share_size: 'regular' }), ['family', 'large'], 'regular maps to family/large');
});

test('veg with null/unknown size → generous ["family","large","small"]', () => {
  assertEqualArr(boxContentsShareTypesFor({ share_type: 'summer_veg', share_size: null }), ['family', 'large', 'small'], 'null size generous');
});

test('flower → ["flower"] (unchanged)', () => {
  assertEqualArr(boxContentsShareTypesFor({ share_type: 'flower', share_size: 'petite' }), ['flower'], 'flower passthrough');
});

test('flex → ["flex"] passthrough (never matches a veg bucket)', () => {
  assertEqualArr(boxContentsShareTypesFor({ share_type: 'flex', share_size: 'light' }), ['flex'], 'flex passthrough');
});

test('add_on → ["add_on"] passthrough', () => {
  assertEqualArr(boxContentsShareTypesFor({ share_type: 'add_on', share_size: null }), ['add_on'], 'add_on passthrough');
});

test('resolveBoxContentsBuckets unions + dedups across mixed members', () => {
  const { queryShareTypes, preferenceByMemberShareType } = resolveBoxContentsBuckets([
    { share_type: 'summer_veg', share_size: 'small' },
    { share_type: 'summer_veg', share_size: 'family' },
    { share_type: 'flower', share_size: 'petite' },
  ]);
  assertUnordered(queryShareTypes, ['small', 'family', 'large', 'flower'], 'union of buckets, deduped');
  assertEqualArr(preferenceByMemberShareType.get('summer_veg') ?? [], ['family', 'large'], 'last summer_veg pref wins (family)');
  assertEqualArr(preferenceByMemberShareType.get('flower') ?? [], ['flower'], 'flower pref');
});

// ─────────────────────────────────────────────────────────────────────
// Week-key contract (2026-06-14 fix): box_contents / box_swaps are keyed
// to the cycle MONDAY, not the delivery Wednesday. /box derives the Monday
// from the Wednesday via mondayOfWeek and uses it for the box_contents read,
// the box_swaps read, AND the swap write — so reads and writes share a key.
// ─────────────────────────────────────────────────────────────────────

test('mondayOfWeek(delivery Wednesday) → that cycle Monday', () => {
  // Jun 17 2026 delivery (Wed) belongs to the Jun 15 (Mon) cycle.
  assertEq(mondayOfWeek('2026-06-17'), '2026-06-15', 'Jun 17 Wed → Jun 15 Mon');
  // Jun 10 2026 delivery (Wed) belongs to the Jun 8 (Mon) cycle.
  assertEq(mondayOfWeek('2026-06-10'), '2026-06-08', 'Jun 10 Wed → Jun 8 Mon');
  // Idempotent: a Monday maps to itself (so deriving twice is safe).
  assertEq(mondayOfWeek('2026-06-15'), '2026-06-15', 'Monday is a fixed point');
});

test('isCutoffPassed cutoff is identical whether keyed by Wed or Mon', () => {
  // Cutoff = Tue Jun 16 2026, 08:00 ET (EDT, UTC-4) = 12:00:00Z.
  // For the Jun 17 cycle: Wednesday key and Monday key must agree exactly.
  const justBefore = new Date('2026-06-16T11:59:00Z'); // 07:59 ET Tue — open
  const justAfter = new Date('2026-06-16T12:00:00Z'); // 08:00 ET Tue — closed
  // Wednesday key (the /box page-level call).
  assertEq(isCutoffPassed('2026-06-17', justBefore), false, 'Wed key: open before 8AM ET');
  assertEq(isCutoffPassed('2026-06-17', justAfter), true, 'Wed key: closed at 8AM ET');
  // Monday key (what the swap + swap-undo APIs now receive).
  assertEq(isCutoffPassed('2026-06-15', justBefore), false, 'Mon key: open before 8AM ET');
  assertEq(isCutoffPassed('2026-06-15', justAfter), true, 'Mon key: closed at 8AM ET');
});

let failures = 0;
for (const t of tests) {
  try {
    t.fn();
    console.log(`  ✓ ${t.name}`);
  } catch (e) {
    failures++;
    console.error(`  ✗ ${t.name}`);
    console.error(`    ${(e as Error).message}`);
  }
}
console.log(`\nbox mapping: ${tests.length - failures}/${tests.length} tests, ${passed} assertions`);
if (failures > 0) process.exit(1);
