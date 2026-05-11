/**
 * Bi-weekly Week A / Week B auto-assignment algorithm.
 *
 * Used by /api/admin/biweekly/auto-assign (POST + ?preview=1 GET) to
 * fairly distribute unassigned members across Week A and Week B on a
 * per-pickup-location basis.
 *
 * Algorithm (per location group):
 *   1. Sort the unassigned members by `legacy_id` ASC, then `id` ASC.
 *      Deterministic — same input always produces the same output.
 *   2. Look up the current Week A / Week B headcount for the location.
 *   3. For each unassigned member, assign whichever week currently has
 *      the LOWER live count (ties go to A). Increment the running
 *      count after each assignment so the next member sees the updated
 *      balance. This is greedy fair-share — exact, simple, optimal for
 *      this objective.
 *
 * Edge cases:
 *   - NULL pickup_location_id is a valid group key — all NULL-pickup
 *     members balance against each other independently of any other
 *     group. (Tested: see test file.)
 *   - A location with 0 unassigned members never appears in the result.
 *   - A location with severe pre-existing imbalance (say 5 A, 0 B and
 *     2 new members) sends BOTH new members to B until it catches up.
 *   - Members already assigned ('A' or 'B') MUST be filtered out by the
 *     caller — this function only sees unassigned members. The caller
 *     also passes in the current A/B headcount so the algorithm can
 *     balance against existing assignments, not just newcomers.
 *
 * Stability:
 *   The output Map preserves insertion order, but consumers should not
 *   rely on iteration order. They should rely on the (member_id → 'A'|'B')
 *   mapping.
 *
 * Why a pure function: makes this unit-testable without a database.
 * The API handler is the only thing that talks to Supabase. This
 * function is just data-in/data-out.
 */

export interface MemberToAssign {
  /** UUID — primary key in members. */
  id: string;
  /** UUID or NULL (NULL = home delivery / no pickup). */
  pickup_location_id: string | null;
  /** Used as a tiebreaker for deterministic sort. May be NULL for
   *  legacy-migrated members; we sort NULL last via empty-string fallback. */
  legacy_id: string | null;
}

export interface LocationCurrent {
  /** Same key as MemberToAssign.pickup_location_id. */
  pickup_location_id: string | null;
  /** Existing Week A members at this location (status='active'). */
  current_a: number;
  /** Existing Week B members at this location. */
  current_b: number;
}

export interface LocationPreview {
  pickup_location_id: string | null;
  location_name: string;
  unassigned: number;
  to_a: number;
  to_b: number;
}

export interface AssignmentPreview {
  byLocation: LocationPreview[];
  totals: {
    unassigned: number;
    to_a: number;
    to_b: number;
  };
}

/**
 * Run the assignment algorithm. Returns a map of (member_id → 'A' | 'B').
 *
 * Pre-conditions: `unassigned` contains ONLY members whose biweekly_week
 * is currently NULL. `current` contains the live A/B counts for every
 * location that appears in `unassigned` (and may contain extras for
 * locations with no unassigned members — those are simply ignored).
 *
 * Post-condition: every member in `unassigned` appears exactly once in
 * the returned map.
 */
export function computeAssignments(
  unassigned: ReadonlyArray<MemberToAssign>,
  current: ReadonlyArray<LocationCurrent>
): Map<string, 'A' | 'B'> {
  // 1. Group unassigned by pickup_location_id (NULL grouped together).
  //    Using `string | null` as a Map key works in JS — NULL is a
  //    distinct key from any string.
  const grouped = new Map<string | null, MemberToAssign[]>();
  for (const m of unassigned) {
    const key = m.pickup_location_id;
    const arr = grouped.get(key);
    if (arr) {
      arr.push(m);
    } else {
      grouped.set(key, [m]);
    }
  }

  // 2. Index current counts by location.
  const counts = new Map<string | null, { a: number; b: number }>();
  for (const c of current) {
    counts.set(c.pickup_location_id, { a: c.current_a, b: c.current_b });
  }

  // 3. For each location group: deterministic sort + greedy balance.
  const result = new Map<string, 'A' | 'B'>();
  for (const [loc, members] of grouped) {
    // Mutate the working counter so we balance against the *running*
    // total, not just the snapshot at the start.
    const cur = { ...(counts.get(loc) ?? { a: 0, b: 0 }) };

    // Deterministic order: legacy_id ASC (empty-string fallback puts
    // NULL legacy_ids last), then id ASC. Two runs with the same input
    // produce the same assignment.
    const sorted = members.slice().sort((x, y) => {
      const lx = x.legacy_id ?? '';
      const ly = y.legacy_id ?? '';
      if (lx !== ly) return lx.localeCompare(ly);
      return x.id.localeCompare(y.id);
    });

    for (const m of sorted) {
      // Tie → Week A (arbitrary but stable).
      if (cur.a <= cur.b) {
        result.set(m.id, 'A');
        cur.a += 1;
      } else {
        result.set(m.id, 'B');
        cur.b += 1;
      }
    }
  }

  return result;
}

/**
 * Helper: roll up the per-member assignments into the per-location
 * preview that the admin sees before they confirm.
 *
 * Each LocationPreview row shows the headcount that will move to A,
 * to B, and the total processed at that location. Locations are
 * returned in alphabetical order by name; the "Home delivery / no
 * pickup" row (NULL) is always last so it doesn't shuffle around.
 */
export function buildPreview(
  unassigned: ReadonlyArray<MemberToAssign>,
  current: ReadonlyArray<LocationCurrent>,
  locationNames: ReadonlyMap<string, string>
): AssignmentPreview {
  const assignments = computeAssignments(unassigned, current);

  // Bucket by location for the preview row counts.
  type Bucket = { name: string; unassigned: number; to_a: number; to_b: number };
  const byLoc = new Map<string | null, Bucket>();

  for (const m of unassigned) {
    const key = m.pickup_location_id;
    const name = key
      ? locationNames.get(key) ?? '(unknown location)'
      : 'Home delivery / no pickup';
    let b = byLoc.get(key);
    if (!b) {
      b = { name, unassigned: 0, to_a: 0, to_b: 0 };
      byLoc.set(key, b);
    }
    b.unassigned += 1;
    const week = assignments.get(m.id);
    if (week === 'A') b.to_a += 1;
    else if (week === 'B') b.to_b += 1;
  }

  // Sort: real locations alphabetical, NULL bucket pinned to the end.
  const rows: LocationPreview[] = Array.from(byLoc.entries()).map(([loc, b]) => ({
    pickup_location_id: loc,
    location_name: b.name,
    unassigned: b.unassigned,
    to_a: b.to_a,
    to_b: b.to_b,
  }));
  rows.sort((x, y) => {
    if (x.pickup_location_id === null && y.pickup_location_id === null) return 0;
    if (x.pickup_location_id === null) return 1;
    if (y.pickup_location_id === null) return -1;
    return x.location_name.localeCompare(y.location_name);
  });

  let to_a = 0;
  let to_b = 0;
  for (const r of rows) {
    to_a += r.to_a;
    to_b += r.to_b;
  }

  return {
    byLocation: rows,
    totals: {
      unassigned: unassigned.length,
      to_a,
      to_b,
    },
  };
}
