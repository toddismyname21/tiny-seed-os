/**
 * Unit tests for pickup-from-variant.ts.
 *
 * No Vitest in this repo, so we run as a plain Node script:
 *   npx tsx src/lib/pickup-from-variant.test.ts
 *
 * Exits 0 if all assertions pass, 1 otherwise.
 *
 * The fixture `LOCATIONS` mirrors the live 2026 pickup_locations names
 * (verified against the live Supabase pickup_locations table 2026-06-04).
 * Adding a new live location → add it here AND assert the variants that
 * should map to it. The matcher only depends on `id` + `name`, so the
 * fixture intentionally omits day_of_week / is_active / etc.
 */
import {
  matchVariantToPickup,
  type PickupLocation,
} from './pickup-from-variant.ts';

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

// ─── Test fixture: live pickup_locations as of 2026-06-04 ───────────
const LOCATIONS: PickupLocation[] = [
  { id: 'loc-bloom', name: 'Bloomfield Market' },
  { id: 'loc-hp',    name: 'Highland Park' },
  { id: 'loc-mtl',   name: 'Mt. Lebanon' },
  { id: 'loc-sh',    name: 'Squirrel Hill' },
  { id: 'loc-ns',    name: 'North Side' },
  { id: 'loc-fc',    name: 'Fox Chapel' },
  { id: 'loc-law',   name: 'Lawrenceville' },
  { id: 'loc-cran',  name: 'Cranberry' },
  { id: 'loc-oak',   name: 'Oakmont' },
  { id: 'loc-shady', name: 'Shadyside' },
  { id: 'loc-zel',   name: 'Zelienople' },
  { id: 'loc-sim',   name: "Simon's" },
  { id: 'loc-stp',   name: "St. Paul's" },
  { id: 'loc-roch',  name: 'Rochester' },
  { id: 'loc-merc',  name: 'Mercer' },
  { id: 'loc-ss',    name: 'South Side' },
];

// ─── Real-world variants (the verified samples from the task brief) ──

test('Squirrel Hill CSA porch variant → Squirrel Hill', () => {
  const r = matchVariantToPickup('Squirrel Hill (CSA CUSTOMER PORCH)', LOCATIONS);
  assertEqual(r.locationId, 'loc-sh');
  assertEqual(r.reason, 'exact_match:Squirrel Hill');
});

test('Bloomfield SAT-market variant maps to Bloomfield Market (rewrite)', () => {
  const r = matchVariantToPickup("Bloomfield (SATURDAY FARMER'S MARKET)", LOCATIONS);
  assertEqual(r.locationId, 'loc-bloom');
  assertEqual(r.reason, 'prefix_match:bloomfield→Bloomfield Market');
});

test('Highland Park (Bryant St. Market) → Highland Park (NOT Bloomfield — that was the burn-bug)', () => {
  const r = matchVariantToPickup('Highland Park (Bryant St. Market)', LOCATIONS);
  assertEqual(r.locationId, 'loc-hp');
  assertEqual(r.reason, 'exact_match:Highland Park');
});

test('Mt. Lebanon CSA porch → Mt. Lebanon (rewrite — same canonical name is in the rewrite map)', () => {
  // "mt. lebanon" is also a REWRITES key (so e.g. legacy variants without the
  // period still land on the right row), which means the rewrite branch fires
  // BEFORE the exact branch. Both routes resolve to the same locationId; we
  // assert the rewrite-branch reason here to lock in the actual call order.
  const r = matchVariantToPickup('Mt. Lebanon (CSA CUSTOMER PORCH)', LOCATIONS);
  assertEqual(r.locationId, 'loc-mtl');
  assertEqual(r.reason, 'prefix_match:mt. lebanon→Mt. Lebanon');
});

test('Mt Lebanon (no period) → Mt. Lebanon via rewrite', () => {
  const r = matchVariantToPickup('Mt Lebanon (CSA CUSTOMER PORCH)', LOCATIONS);
  assertEqual(r.locationId, 'loc-mtl');
  assertEqual(r.reason, 'prefix_match:mt lebanon→Mt. Lebanon');
});

// ── Allison Park (TBD) — explicitly null, member picks later ──────────

test('$150 / Allison Park (TBD) → null, allison_park_tbd', () => {
  const r = matchVariantToPickup('$150 / Allison Park (TBD)', LOCATIONS);
  assertEqual(r.locationId, null);
  assertEqual(r.reason, 'allison_park_tbd');
});

test('$400 / Allison Park (TBD) → null, allison_park_tbd', () => {
  const r = matchVariantToPickup('$400 / Allison Park (TBD)', LOCATIONS);
  assertEqual(r.locationId, null);
  assertEqual(r.reason, 'allison_park_tbd');
});

test('Allison Park (TBD) bare → null, allison_park_tbd', () => {
  const r = matchVariantToPickup('Allison Park (TBD)', LOCATIONS);
  assertEqual(r.locationId, null);
  assertEqual(r.reason, 'allison_park_tbd');
});

// ── Home delivery — pickup_location_id stays NULL by design ───────────

test('Home Delivery — $15/wk → null, home_delivery', () => {
  const r = matchVariantToPickup('Home Delivery — $15/wk', LOCATIONS);
  assertEqual(r.locationId, null);
  assertEqual(r.reason, 'home_delivery');
});

test('Home Delivery (anywhere) → null, home_delivery', () => {
  const r = matchVariantToPickup('Home Delivery (Anywhere in Pittsburgh)', LOCATIONS);
  assertEqual(r.locationId, null);
  assertEqual(r.reason, 'home_delivery');
});

test('Delivered (legacy spelling) → null, home_delivery', () => {
  const r = matchVariantToPickup('Delivered to your door', LOCATIONS);
  assertEqual(r.locationId, null);
  assertEqual(r.reason, 'home_delivery');
});

// ── Flex prefix stripping ─────────────────────────────────────────────

test('$150 / Highland Park (Bryant St. Market) → Highland Park', () => {
  const r = matchVariantToPickup('$150 / Highland Park (Bryant St. Market)', LOCATIONS);
  assertEqual(r.locationId, 'loc-hp');
  assertEqual(r.reason, 'exact_match:Highland Park');
});

test('$400 / Squirrel Hill (CSA CUSTOMER PORCH) → Squirrel Hill', () => {
  const r = matchVariantToPickup('$400 / Squirrel Hill (CSA CUSTOMER PORCH)', LOCATIONS);
  assertEqual(r.locationId, 'loc-sh');
  assertEqual(r.reason, 'exact_match:Squirrel Hill');
});

// ── Simon's / St. Paul's apostrophe / period rewrites ─────────────────

test("Simon (no apostrophe) → Simon's via rewrite", () => {
  const r = matchVariantToPickup('Simon (CSA CUSTOMER PORCH)', LOCATIONS);
  assertEqual(r.locationId, 'loc-sim');
  assertEqual(r.reason, "prefix_match:simon→Simon's");
});

test("Simon's (with apostrophe) → Simon's via rewrite (canonical name is in the rewrite map)", () => {
  // Same situation as Mt. Lebanon: "simon's" is also a REWRITES key, so the
  // rewrite branch wins. The locationId is identical to the would-be exact
  // match, only the reason differs.
  const r = matchVariantToPickup("Simon's (CSA CUSTOMER PORCH)", LOCATIONS);
  assertEqual(r.locationId, 'loc-sim');
  assertEqual(r.reason, "prefix_match:simon's→Simon's");
});

test("St Paul (no period/apostrophe) → St. Paul's via rewrite", () => {
  const r = matchVariantToPickup('St Paul (CSA CUSTOMER PORCH)', LOCATIONS);
  assertEqual(r.locationId, 'loc-stp');
  assertEqual(r.reason, "prefix_match:st paul→St. Paul's");
});

test("St. Paul's (canonical) → St. Paul's via rewrite (canonical name is in the rewrite map)", () => {
  // Same situation as Mt. Lebanon / Simon's: "st. paul's" is also a REWRITES
  // key, so the rewrite branch wins. The locationId is identical to the
  // would-be exact match, only the reason differs.
  const r = matchVariantToPickup("St. Paul's (CSA CUSTOMER PORCH)", LOCATIONS);
  assertEqual(r.locationId, 'loc-stp');
  assertEqual(r.reason, "prefix_match:st. paul's→St. Paul's");
});

// ── Every other 2026 location via exact match ─────────────────────────

test('North Side variant → North Side', () => {
  const r = matchVariantToPickup('North Side (CSA CUSTOMER PORCH)', LOCATIONS);
  assertEqual(r.locationId, 'loc-ns');
  assertEqual(r.reason, 'exact_match:North Side');
});

test('Fox Chapel variant → Fox Chapel', () => {
  const r = matchVariantToPickup('Fox Chapel (CSA CUSTOMER PORCH)', LOCATIONS);
  assertEqual(r.locationId, 'loc-fc');
  assertEqual(r.reason, 'exact_match:Fox Chapel');
});

test('Lawrenceville variant → Lawrenceville', () => {
  const r = matchVariantToPickup('Lawrenceville (CSA CUSTOMER PORCH)', LOCATIONS);
  assertEqual(r.locationId, 'loc-law');
  assertEqual(r.reason, 'exact_match:Lawrenceville');
});

test('Cranberry variant → Cranberry', () => {
  const r = matchVariantToPickup('Cranberry (CSA CUSTOMER PORCH)', LOCATIONS);
  assertEqual(r.locationId, 'loc-cran');
  assertEqual(r.reason, 'exact_match:Cranberry');
});

test('Oakmont variant → Oakmont', () => {
  const r = matchVariantToPickup('Oakmont (CSA CUSTOMER PORCH)', LOCATIONS);
  assertEqual(r.locationId, 'loc-oak');
  assertEqual(r.reason, 'exact_match:Oakmont');
});

test('Shadyside variant → Shadyside', () => {
  const r = matchVariantToPickup('Shadyside (CSA CUSTOMER PORCH)', LOCATIONS);
  assertEqual(r.locationId, 'loc-shady');
  assertEqual(r.reason, 'exact_match:Shadyside');
});

test('Zelienople variant → Zelienople', () => {
  const r = matchVariantToPickup('Zelienople (CSA CUSTOMER PORCH)', LOCATIONS);
  assertEqual(r.locationId, 'loc-zel');
  assertEqual(r.reason, 'exact_match:Zelienople');
});

test('Rochester variant → Rochester', () => {
  const r = matchVariantToPickup('Rochester (CSA CUSTOMER PORCH)', LOCATIONS);
  assertEqual(r.locationId, 'loc-roch');
  assertEqual(r.reason, 'exact_match:Rochester');
});

test('Mercer variant → Mercer', () => {
  const r = matchVariantToPickup('Mercer (CSA CUSTOMER PORCH)', LOCATIONS);
  assertEqual(r.locationId, 'loc-merc');
  assertEqual(r.reason, 'exact_match:Mercer');
});

test('South Side variant → South Side', () => {
  const r = matchVariantToPickup('South Side (CSA CUSTOMER PORCH)', LOCATIONS);
  assertEqual(r.locationId, 'loc-ss');
  assertEqual(r.reason, 'exact_match:South Side');
});

// ── Edge cases ────────────────────────────────────────────────────────

test('null variant → null, no_variant', () => {
  const r = matchVariantToPickup(null, LOCATIONS);
  assertEqual(r.locationId, null);
  assertEqual(r.reason, 'no_variant');
});

test('undefined variant → null, no_variant', () => {
  const r = matchVariantToPickup(undefined, LOCATIONS);
  assertEqual(r.locationId, null);
  assertEqual(r.reason, 'no_variant');
});

test('empty string variant → null, no_variant', () => {
  const r = matchVariantToPickup('', LOCATIONS);
  assertEqual(r.locationId, null);
  assertEqual(r.reason, 'no_variant');
});

test('whitespace-only variant → null, no_variant', () => {
  const r = matchVariantToPickup('     ', LOCATIONS);
  assertEqual(r.locationId, null);
  assertEqual(r.reason, 'no_variant');
});

test('totally unknown variant → null, unmatched:* (verbatim)', () => {
  const r = matchVariantToPickup('Atlantis (UNDERWATER)', LOCATIONS);
  assertEqual(r.locationId, null);
  assertEqual(r.reason, 'unmatched:Atlantis (UNDERWATER)');
});

test('variant containing only a parenthetical → unmatched (cant strip to nothing then match)', () => {
  // Edge: "(SATURDAY MARKET)" — after the parenthetical strip there's nothing left.
  // The function trims to '' and bails to unmatched rather than matching everything.
  const r = matchVariantToPickup('(SATURDAY MARKET)', LOCATIONS);
  assertEqual(r.locationId, null);
  assertEqual(r.reason, 'unmatched:(SATURDAY MARKET)');
});

test('rewrite to a location not present in pickup_locations → no_loc_record_for', () => {
  // Same matcher, but with a LOCATIONS fixture missing Bloomfield Market —
  // this proves the data-drift branch returns the right reason rather than
  // silently picking a wrong row.
  const trimmedLocations = LOCATIONS.filter((l) => l.id !== 'loc-bloom');
  const r = matchVariantToPickup("Bloomfield (SATURDAY FARMER'S MARKET)", trimmedLocations);
  assertEqual(r.locationId, null);
  assertEqual(r.reason, 'no_loc_record_for:Bloomfield Market');
});

test('variant matched case-insensitively (lowercase input, mixed-case location)', () => {
  const r = matchVariantToPickup('squirrel hill (csa customer porch)', LOCATIONS);
  assertEqual(r.locationId, 'loc-sh');
  assertEqual(r.reason, 'exact_match:Squirrel Hill');
});

test('variant matched case-insensitively (uppercase input)', () => {
  const r = matchVariantToPickup('SQUIRREL HILL (CSA CUSTOMER PORCH)', LOCATIONS);
  assertEqual(r.locationId, 'loc-sh');
  assertEqual(r.reason, 'exact_match:Squirrel Hill');
});

test('variant with no parenthetical detail (bare location name) → matches', () => {
  const r = matchVariantToPickup('Squirrel Hill', LOCATIONS);
  assertEqual(r.locationId, 'loc-sh');
  assertEqual(r.reason, 'exact_match:Squirrel Hill');
});

test('home delivery beats allison park ordering (defense-in-depth)', () => {
  // Pathological "Home Delivery to Allison Park" — home_delivery wins because
  // we detect it first. Recording the contract so a future refactor doesn't
  // accidentally swap the order and start auto-assigning home-delivery rows
  // to allison_park_tbd reason (which would be misleading).
  const r = matchVariantToPickup('Home Delivery to Allison Park', LOCATIONS);
  assertEqual(r.locationId, null);
  assertEqual(r.reason, 'home_delivery');
});

// ─── Done ───────────────────────────────────────────────────────────

console.log('');
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) {
  const p = (globalThis as { process?: { exit: (n: number) => never } }).process;
  if (p) p.exit(1);
}
