/**
 * Unit tests for the vacation-hold add-on cascade (lib/vacation-cascade).
 *
 * Run via: npm run test:unit  (tsx; vitest is NOT installed in this repo).
 *
 * We exercise cascadeVacationHoldToAddOns against an in-memory Supabase
 * query-builder mock that supports the exact chain the helper uses:
 *   members:        .select().eq().eq().in()            (+ .maybeSingle())
 *   vacation_holds: .select().in().in().lte().gte()
 *                   .insert(rows).select()
 *
 * Core assertion (the bug this fixes): a hold on a BOX share yields matching
 * holds on every ACTIVE add_on row of the SAME customer — and is idempotent.
 */
import {
  cascadeVacationHoldToAddOns,
  rangesOverlap,
  riderReason,
} from './vacation-cascade';

type Row = Record<string, unknown>;

// ─── Assertions ──────────────────────────────────────────────────────
let passed = 0;
function assertTrue(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  passed++;
}
function assertEqual<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected) {
    throw new Error(`FAIL: ${msg}\n  expected: ${String(expected)}\n  actual:   ${String(actual)}`);
  }
  passed++;
}
function arrayEqUnordered(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

// ─── In-memory Supabase mock ─────────────────────────────────────────
// A builder that records inserts back into the shared `tables` store so a
// follow-up call sees them (lets us test idempotency on a repeat invocation).
interface Tables {
  members: Row[];
  vacation_holds: Row[];
}

function makeSupabase(tables: Tables) {
  function builderFor(table: keyof Tables) {
    let data = (tables[table] ?? []).map((r) => ({ ...r }));
    let pendingInsert: Row[] | null = null;
    let selectAfterInsert = false;

    const builder: Record<string, unknown> = {};
    const ret = () => builder;

    builder.select = () => {
      if (pendingInsert) selectAfterInsert = true;
      return builder;
    };
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
    builder.insert = (rows: Row[]) => {
      pendingInsert = rows.map((r) => ({ ...r, id: `gen-${Math.random().toString(36).slice(2, 8)}` }));
      // Commit to the shared store so a later call observes the new holds.
      tables[table].push(...pendingInsert);
      return builder;
    };
    builder.maybeSingle = async () => ({ data: data[0] ?? null, error: null });

    // Thenable resolution. For an insert chain we return the inserted rows;
    // otherwise the filtered select result.
    builder.then = (resolve: (v: { data: Row[]; error: null }) => unknown) => {
      if (pendingInsert) {
        return resolve({ data: selectAfterInsert ? pendingInsert : null as unknown as Row[], error: null });
      }
      return resolve({ data, error: null });
    };
    return builder;
  }

  return {
    from(table: string) {
      return builderFor(table as keyof Tables);
    },
  } as unknown as Parameters<typeof cascadeVacationHoldToAddOns>[0];
}

// ─── Test data helpers ───────────────────────────────────────────────
function boxMember(over: Partial<Row> = {}): Row {
  return { id: 'box1', customer_id: 'cust1', share_type: 'summer_veg', status: 'active', ...over };
}
function addOn(id: string, over: Partial<Row> = {}): Row {
  return { id, customer_id: 'cust1', share_type: 'add_on', status: 'active', ...over };
}

const tests: Array<{ name: string; fn: () => Promise<void> }> = [];
function test(name: string, fn: () => Promise<void>): void {
  tests.push({ name, fn });
}

// ─── Pure-function tests ─────────────────────────────────────────────
test('rangesOverlap: inclusive boundary touch counts as overlap', async () => {
  assertTrue(rangesOverlap('2026-07-01', '2026-07-07', '2026-07-07', '2026-07-10'), 'touching ends overlap');
  assertTrue(!rangesOverlap('2026-07-01', '2026-07-06', '2026-07-07', '2026-07-10'), 'disjoint ranges do not');
  assertTrue(rangesOverlap('2026-07-01', '2026-07-31', '2026-07-10', '2026-07-12'), 'contained range overlaps');
});

test('riderReason: suffixes a reason, or stands alone when blank', async () => {
  assertEqual(riderReason('Italy trip'), 'Italy trip [auto: rides the held box]', 'suffix appended');
  assertEqual(riderReason(null), '[auto: rides the held box]', 'blank → bare marker');
  assertEqual(riderReason('   '), '[auto: rides the held box]', 'whitespace → bare marker');
});

// ─── Core cascade behaviour ──────────────────────────────────────────
test('BOX hold cascades to ALL active add-ons of the same customer', async () => {
  const tables: Tables = {
    members: [boxMember(), addOn('ao_bread'), addOn('ao_cheese')],
    vacation_holds: [],
  };
  const sb = makeSupabase(tables);
  const res = await cascadeVacationHoldToAddOns(sb, {
    boxMemberId: 'box1',
    boxShareType: 'summer_veg',
    start_date: '2026-07-08',
    end_date: '2026-07-22',
    status: 'scheduled',
    disposition: 'skip',
    move_to_week: null,
    reason: 'Italy trip',
  });

  assertTrue(res.cascaded, 'cascaded for a box share');
  assertTrue(arrayEqUnordered(res.created, ['ao_bread', 'ao_cheese']), 'both add-ons got rider holds');
  assertEqual(res.skippedExisting.length, 0, 'nothing skipped');

  // Verify the rows actually landed with the rider reason + matching dates.
  const riders = tables.vacation_holds.filter((h) => h.member_id !== 'box1');
  assertEqual(riders.length, 2, 'two rider rows inserted');
  assertTrue(
    riders.every((h) => h.reason === 'Italy trip [auto: rides the held box]'),
    'rider reason suffixed'
  );
  assertTrue(
    riders.every((h) => h.start_date === '2026-07-08' && h.end_date === '2026-07-22'),
    'rider dates mirror the box hold'
  );
  assertTrue(riders.every((h) => h.disposition === 'skip' && h.status === 'scheduled'), 'disposition/status mirrored');
});

test('idempotent: an add-on already held for an overlapping range is skipped', async () => {
  const tables: Tables = {
    members: [boxMember(), addOn('ao_bread'), addOn('ao_cheese')],
    vacation_holds: [
      // ao_bread already holds an OVERLAPPING range → must be skipped.
      { id: 'pre1', member_id: 'ao_bread', start_date: '2026-07-10', end_date: '2026-07-15', status: 'scheduled' },
    ],
  };
  const sb = makeSupabase(tables);
  const res = await cascadeVacationHoldToAddOns(sb, {
    boxMemberId: 'box1',
    boxShareType: 'summer_veg',
    start_date: '2026-07-08',
    end_date: '2026-07-22',
    status: 'scheduled',
    disposition: 'skip',
    move_to_week: null,
    reason: null,
  });

  assertTrue(arrayEqUnordered(res.created, ['ao_cheese']), 'only the un-held add-on got a rider');
  assertTrue(arrayEqUnordered(res.skippedExisting, ['ao_bread']), 'already-held add-on skipped');
});

test('repeat call is a no-op (idempotency end-to-end)', async () => {
  const tables: Tables = {
    members: [boxMember(), addOn('ao_bread')],
    vacation_holds: [],
  };
  const sb = makeSupabase(tables);
  const input = {
    boxMemberId: 'box1',
    boxShareType: 'summer_veg',
    start_date: '2026-08-01',
    end_date: '2026-08-08',
    status: 'scheduled' as const,
    disposition: 'skip' as const,
    move_to_week: null,
    reason: 'Beach',
  };
  const first = await cascadeVacationHoldToAddOns(sb, input);
  assertTrue(arrayEqUnordered(first.created, ['ao_bread']), 'first call creates rider');

  const second = await cascadeVacationHoldToAddOns(makeSupabase(tables), input);
  assertEqual(second.created.length, 0, 'second call creates nothing');
  assertTrue(arrayEqUnordered(second.skippedExisting, ['ao_bread']), 'second call skips the existing rider');
});

test('held share is itself an add_on → no cascade', async () => {
  const tables: Tables = {
    members: [addOn('box1'), addOn('ao_bread')],
    vacation_holds: [],
  };
  const sb = makeSupabase(tables);
  const res = await cascadeVacationHoldToAddOns(sb, {
    boxMemberId: 'box1',
    boxShareType: 'add_on',
    start_date: '2026-07-08',
    end_date: '2026-07-22',
    status: 'scheduled',
    disposition: 'skip',
    move_to_week: null,
    reason: null,
  });
  assertTrue(!res.cascaded, 'add_on share does not cascade');
  assertEqual(res.created.length, 0, 'no rider rows');
  assertEqual(tables.vacation_holds.length, 0, 'nothing inserted');
});

test('flex share → no cascade', async () => {
  const tables: Tables = {
    members: [{ id: 'box1', customer_id: 'cust1', share_type: 'flex', status: 'active' }, addOn('ao_bread')],
    vacation_holds: [],
  };
  const sb = makeSupabase(tables);
  const res = await cascadeVacationHoldToAddOns(sb, {
    boxMemberId: 'box1',
    boxShareType: 'flex',
    start_date: '2026-07-08',
    end_date: '2026-07-22',
    status: 'scheduled',
    disposition: 'skip',
    move_to_week: null,
    reason: null,
  });
  assertTrue(!res.cascaded, 'flex share does not cascade');
});

test('no add-ons on the customer → cascaded true, nothing created', async () => {
  const tables: Tables = { members: [boxMember()], vacation_holds: [] };
  const sb = makeSupabase(tables);
  const res = await cascadeVacationHoldToAddOns(sb, {
    boxMemberId: 'box1',
    boxShareType: 'summer_veg',
    start_date: '2026-07-08',
    end_date: '2026-07-22',
    status: 'scheduled',
    disposition: 'skip',
    move_to_week: null,
    reason: null,
  });
  assertTrue(res.cascaded, 'still considered a cascade share');
  assertEqual(res.created.length, 0, 'no add-ons → nothing created');
});

test('MOVE disposition mirrors move_to_week onto rider holds', async () => {
  const tables: Tables = { members: [boxMember(), addOn('ao_bread')], vacation_holds: [] };
  const sb = makeSupabase(tables);
  const res = await cascadeVacationHoldToAddOns(sb, {
    boxMemberId: 'box1',
    boxShareType: 'summer_veg',
    start_date: '2026-07-08',
    end_date: '2026-07-14',
    status: 'scheduled',
    disposition: 'move',
    move_to_week: '2026-07-20',
    reason: 'Move it',
  });
  assertTrue(arrayEqUnordered(res.created, ['ao_bread']), 'rider created');
  const rider = tables.vacation_holds.find((h) => h.member_id === 'ao_bread')!;
  assertEqual(rider.disposition, 'move', 'rider disposition = move');
  assertEqual(rider.move_to_week, '2026-07-20', 'rider move_to_week mirrors box');
});

// ─── Run ─────────────────────────────────────────────────────────────
async function run(): Promise<void> {
  let failures = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failures++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${(e as Error).message}`);
    }
  }
  console.log(`\nvacation-cascade: ${tests.length - failures}/${tests.length} tests, ${passed} assertions`);
  if (failures > 0) process.exit(1);
}

run();
