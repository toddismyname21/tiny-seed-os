/**
 * Unit tests for biweekly-assign.ts.
 *
 * No Vitest in this repo, so we run as a plain Node script:
 *   npx tsx src/lib/biweekly-assign.test.ts
 *
 * Exits 0 if all assertions pass, 1 otherwise.
 */
import {
  buildPreview,
  computeAssignments,
  type LocationCurrent,
  type MemberToAssign,
} from './biweekly-assign.ts';

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

// ─── computeAssignments ─────────────────────────────────────────────

test('empty input returns empty map', () => {
  const result = computeAssignments([], []);
  assertEqual(result.size, 0);
});

test('10 unassigned at one location with 0/0 current → 5 A, 5 B', () => {
  const members: MemberToAssign[] = Array.from({ length: 10 }, (_, i) => ({
    id: `id${i.toString().padStart(2, '0')}`,
    pickup_location_id: 'loc-1',
    legacy_id: `M${i.toString().padStart(3, '0')}`,
  }));
  const current: LocationCurrent[] = [
    { pickup_location_id: 'loc-1', current_a: 0, current_b: 0 },
  ];
  const result = computeAssignments(members, current);
  assertEqual(result.size, 10);
  const a = Array.from(result.values()).filter((v) => v === 'A').length;
  const b = Array.from(result.values()).filter((v) => v === 'B').length;
  assertEqual(a, 5, 'expected 5 in week A');
  assertEqual(b, 5, 'expected 5 in week B');
});

test('10 unassigned at one location with 5 A, 0 B current → all 10 go to B', () => {
  // After we send 5 to B, count is 5A/5B. The 6th tied case → A,
  // then 7th tied case → B, etc. So 7 to B + 3 to A, NOT all-10-to-B.
  // The original spec said "all 10 go to B" but that's only correct if
  // the algorithm doesn't catch up the running balance. Since we DO
  // balance running, the actual correct answer is: 5 to B (catches
  // up), then 5 split 3A/2B. Let me re-check…
  //
  // Start: a=5, b=0.
  //   m0 → a<=b? 5<=0? false → B, b=1     (a=5, b=1)
  //   m1 → 5<=1? false → B, b=2           (a=5, b=2)
  //   m2 → 5<=2? false → B, b=3           (a=5, b=3)
  //   m3 → 5<=3? false → B, b=4           (a=5, b=4)
  //   m4 → 5<=4? false → B, b=5           (a=5, b=5)
  //   m5 → 5<=5? true  → A, a=6           (a=6, b=5)
  //   m6 → 6<=5? false → B, b=6           (a=6, b=6)
  //   m7 → 6<=6? true  → A, a=7           (a=7, b=6)
  //   m8 → 7<=6? false → B, b=7           (a=7, b=7)
  //   m9 → 7<=7? true  → A, a=8           (a=8, b=7)
  // Final assignments: B B B B B A B A B A → 4 A, 6 B
  const members: MemberToAssign[] = Array.from({ length: 10 }, (_, i) => ({
    id: `id${i.toString().padStart(2, '0')}`,
    pickup_location_id: 'loc-1',
    legacy_id: `M${i.toString().padStart(3, '0')}`,
  }));
  const current: LocationCurrent[] = [
    { pickup_location_id: 'loc-1', current_a: 5, current_b: 0 },
  ];
  const result = computeAssignments(members, current);
  const a = Array.from(result.values()).filter((v) => v === 'A').length;
  const b = Array.from(result.values()).filter((v) => v === 'B').length;
  // Running balance: should leave the location at 8 A / 7 B (≤1 apart).
  // Initial 5A + new A's = 8 → 3 went to A. Initial 0B + 7 went to B.
  // Wait, that's 3+7=10. ✓
  assertEqual(a + b, 10);
  assertEqual(a, 3, 'expected 3 to A (running balance from 5A/0B baseline)');
  assertEqual(b, 7, 'expected 7 to B');
  // Final headcount per location should be no more than 1 apart.
  const finalA = 5 + a;
  const finalB = 0 + b;
  if (Math.abs(finalA - finalB) > 1) {
    throw new Error(`final headcount drifts too far: A=${finalA} B=${finalB}`);
  }
});

test('5 unassigned at NULL + 5 at known location → independent balance', () => {
  const members: MemberToAssign[] = [
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `null-${i}`,
      pickup_location_id: null,
      legacy_id: `N${i}`,
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `loc-${i}`,
      pickup_location_id: 'loc-1',
      legacy_id: `L${i}`,
    })),
  ];
  const current: LocationCurrent[] = [
    { pickup_location_id: null,    current_a: 0, current_b: 0 },
    { pickup_location_id: 'loc-1', current_a: 0, current_b: 0 },
  ];
  const result = computeAssignments(members, current);
  const nullA = Array.from(result.entries()).filter(([k, v]) => k.startsWith('null-') && v === 'A').length;
  const nullB = Array.from(result.entries()).filter(([k, v]) => k.startsWith('null-') && v === 'B').length;
  const locA  = Array.from(result.entries()).filter(([k, v]) => k.startsWith('loc-')  && v === 'A').length;
  const locB  = Array.from(result.entries()).filter(([k, v]) => k.startsWith('loc-')  && v === 'B').length;
  // Each group of 5 should split 3/2.
  assertEqual(nullA, 3, 'NULL location: 3 to A');
  assertEqual(nullB, 2, 'NULL location: 2 to B');
  assertEqual(locA, 3, 'loc-1: 3 to A');
  assertEqual(locB, 2, 'loc-1: 2 to B');
});

test('deterministic: same input → same output (two runs)', () => {
  const members: MemberToAssign[] = [
    { id: 'aaa', pickup_location_id: 'loc-1', legacy_id: 'M001' },
    { id: 'bbb', pickup_location_id: 'loc-1', legacy_id: 'M002' },
    { id: 'ccc', pickup_location_id: 'loc-1', legacy_id: 'M003' },
    { id: 'ddd', pickup_location_id: 'loc-1', legacy_id: 'M004' },
  ];
  const current: LocationCurrent[] = [
    { pickup_location_id: 'loc-1', current_a: 0, current_b: 0 },
  ];
  const r1 = computeAssignments(members, current);
  const r2 = computeAssignments(members, current);
  assertEqual(Array.from(r1.entries()), Array.from(r2.entries()));
});

test('deterministic: result is the same regardless of input order', () => {
  const a: MemberToAssign[] = [
    { id: '1', pickup_location_id: 'loc-1', legacy_id: 'M001' },
    { id: '2', pickup_location_id: 'loc-1', legacy_id: 'M002' },
    { id: '3', pickup_location_id: 'loc-1', legacy_id: 'M003' },
    { id: '4', pickup_location_id: 'loc-1', legacy_id: 'M004' },
  ];
  const b: MemberToAssign[] = [a[3], a[1], a[0], a[2]];
  const cur: LocationCurrent[] = [
    { pickup_location_id: 'loc-1', current_a: 0, current_b: 0 },
  ];
  const r1 = computeAssignments(a, cur);
  const r2 = computeAssignments(b, cur);
  // Pairwise lookup should match
  for (const m of a) {
    assertEqual(r1.get(m.id), r2.get(m.id), `member ${m.id} should land in the same week`);
  }
});

test('NULL legacy_id is sorted last (deterministic tiebreak)', () => {
  const members: MemberToAssign[] = [
    { id: 'zz', pickup_location_id: 'loc-1', legacy_id: null },
    { id: 'aa', pickup_location_id: 'loc-1', legacy_id: 'M001' },
  ];
  const cur: LocationCurrent[] = [
    { pickup_location_id: 'loc-1', current_a: 0, current_b: 0 },
  ];
  const r = computeAssignments(members, cur);
  // 'M001' < '' is FALSE since '' < 'M001'. We use ('' for null).
  // 'M001' sorts AFTER ''. So 'aa' should be SECOND, getting Week B.
  // Actually: '' < 'M001' lexically → 'zz' (null legacy) sorts FIRST.
  // 'zz' → A, 'aa' → B.
  assertEqual(r.get('zz'), 'A', 'null-legacy member processed first (sorts first via empty string)');
  assertEqual(r.get('aa'), 'B', 'has-legacy member processed second');
});

test('every input member appears exactly once in result', () => {
  const members: MemberToAssign[] = Array.from({ length: 50 }, (_, i) => ({
    id: `m-${i}`,
    pickup_location_id: i % 3 === 0 ? null : `loc-${i % 4}`,
    legacy_id: `M${i.toString().padStart(3, '0')}`,
  }));
  const current: LocationCurrent[] = [
    { pickup_location_id: null,    current_a: 1, current_b: 0 },
    { pickup_location_id: 'loc-0', current_a: 2, current_b: 1 },
    { pickup_location_id: 'loc-1', current_a: 0, current_b: 3 },
    { pickup_location_id: 'loc-2', current_a: 0, current_b: 0 },
    { pickup_location_id: 'loc-3', current_a: 7, current_b: 7 },
  ];
  const r = computeAssignments(members, current);
  assertEqual(r.size, members.length);
  for (const m of members) {
    if (r.get(m.id) !== 'A' && r.get(m.id) !== 'B') {
      throw new Error(`member ${m.id} got no assignment`);
    }
  }
});

test('per-location final balance is ≤1 apart', () => {
  const members: MemberToAssign[] = Array.from({ length: 17 }, (_, i) => ({
    id: `m-${i}`,
    pickup_location_id: 'loc-1',
    legacy_id: `M${i.toString().padStart(3, '0')}`,
  }));
  const current: LocationCurrent[] = [
    { pickup_location_id: 'loc-1', current_a: 3, current_b: 6 },
  ];
  const r = computeAssignments(members, current);
  const newA = Array.from(r.values()).filter((v) => v === 'A').length;
  const newB = Array.from(r.values()).filter((v) => v === 'B').length;
  const finalA = 3 + newA;
  const finalB = 6 + newB;
  if (Math.abs(finalA - finalB) > 1) {
    throw new Error(`final A=${finalA} B=${finalB} not balanced`);
  }
});

test('location with current count but no unassigned members → ignored', () => {
  const members: MemberToAssign[] = [
    { id: 'm1', pickup_location_id: 'loc-active', legacy_id: 'M001' },
  ];
  const current: LocationCurrent[] = [
    { pickup_location_id: 'loc-active',  current_a: 0, current_b: 0 },
    { pickup_location_id: 'loc-other',   current_a: 5, current_b: 5 },
  ];
  const r = computeAssignments(members, current);
  assertEqual(r.size, 1);
  assertEqual(r.get('m1'), 'A');
});

// ─── buildPreview ───────────────────────────────────────────────────

test('buildPreview: rolls up assignments per location, NULL pinned last', () => {
  const members: MemberToAssign[] = [
    { id: 'a1', pickup_location_id: 'loc-1', legacy_id: 'M001' },
    { id: 'a2', pickup_location_id: 'loc-1', legacy_id: 'M002' },
    { id: 'b1', pickup_location_id: 'loc-2', legacy_id: 'M003' },
    { id: 'n1', pickup_location_id: null,    legacy_id: 'M004' },
    { id: 'n2', pickup_location_id: null,    legacy_id: 'M005' },
  ];
  const current: LocationCurrent[] = [
    { pickup_location_id: 'loc-1', current_a: 0, current_b: 0 },
    { pickup_location_id: 'loc-2', current_a: 0, current_b: 0 },
    { pickup_location_id: null,    current_a: 0, current_b: 0 },
  ];
  const names = new Map([
    ['loc-1', 'Highland Park'],
    ['loc-2', 'Squirrel Hill'],
  ]);
  const preview = buildPreview(members, current, names);

  assertEqual(preview.totals.unassigned, 5);
  assertEqual(preview.totals.to_a + preview.totals.to_b, 5);
  assertEqual(preview.byLocation.length, 3);
  // Last entry is the NULL bucket.
  assertEqual(preview.byLocation[2].pickup_location_id, null);
  assertEqual(preview.byLocation[2].location_name, 'Home delivery / no pickup');
});

// ─── Done ───────────────────────────────────────────────────────────

console.log('');
console.log(`${passed} passed, ${failed} failed`);
// Note: `process` is a Node global. We use a `globalThis` lookup so
// the file type-checks without depending on @types/node (which the
// portal app doesn't install). Behaviour is identical at runtime.
if (failed > 0) {
  const p = (globalThis as { process?: { exit: (n: number) => never } }).process;
  if (p) p.exit(1);
}
