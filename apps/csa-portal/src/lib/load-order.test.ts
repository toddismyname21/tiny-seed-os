/**
 * Unit tests for load-order.ts — PER-LEG truck load numbering (Todd 2026-07).
 * Run via `npm run test:unit` (npx tsx). Node's assert; no test framework
 * (matches the other *.test.ts in this repo).
 *
 * The single invariant every pack surface depends on: each route LEG is numbered
 * on its OWN (loadSeq restarts at 1 per leg = the leg's LAST drive stop), and the
 * shared list is ordered LEG-then-LOAD so labels / pack-sheet / pack-check /
 * truck sheets all follow ONE sequence.
 */
import assert from 'node:assert/strict';
import { buildLoadOrder, formatLoadRange, loadTag } from './load-order.ts';
import type { WeekRoutes, SavedRouteStop, SavedRouteLeg } from './saved-route.ts';

function stop(orderKey: string, name: string, order: number, kind: SavedRouteStop['kind'] = 'home'): SavedRouteStop {
  return { stop_order: order, kind, name, address: null, phone: null, scheduledTime: null, orderKey };
}
function leg(letter: string, stops: SavedRouteStop[]): SavedRouteLeg {
  return { route_id: 'r-' + letter, route_date: '2026-07-08', leg: letter, driver_name: 'Todd', stops };
}
function routes(legs: SavedRouteLeg[]): WeekRoutes {
  return { hasSavedRoute: true, legs, orderOf: new Map() };
}

/* ── Fail-soft: no saved route → null ── */
assert.equal(buildLoadOrder({ hasSavedRoute: false, legs: [], orderOf: new Map() }), null);
assert.equal(buildLoadOrder(routes([])), null);

/* ── Single leg: loadSeq is the reverse of drive order ── */
{
  const lo = buildLoadOrder(routes([
    leg('A', [
      stop('cust:1', 'Ann', 1),
      stop('cust:2', 'Bob', 2),
      stop('pl:x', 'Market', 3, 'pickup'),
    ]),
  ]));
  assert.ok(lo, 'load order built');
  assert.equal(lo!.total, 3);
  assert.equal(lo!.legCount, 1);
  // drive 1 (Ann) loads LAST (at the door) → loadSeq 3; drive 3 (Market) loads
  // FIRST (deepest) → loadSeq 1.
  assert.equal(lo!.home('1')!.loadSeq, 3);
  assert.equal(lo!.home('1')!.routeSeq, 1);
  assert.equal(lo!.home('2')!.loadSeq, 2);
  assert.equal(lo!.pickup('x')!.loadSeq, 1);
  assert.equal(lo!.pickup('x')!.routeSeq, 3);
  assert.equal(lo!.home('1')!.legTotal, 3);
  // Shared list is load-first first.
  assert.deepEqual(lo!.stops.map((s) => s.key), ['pl:x', 'cust:2', 'cust:1']);
}

/* ── Two legs: numbering RESTARTS per leg (the core change) ── */
{
  const lo = buildLoadOrder(routes([
    leg('A', [stop('cust:a1', 'A1', 1), stop('cust:a2', 'A2', 2)]),
    leg('B', [stop('cust:b1', 'B1', 1), stop('cust:b2', 'B2', 2), stop('cust:b3', 'B3', 3)]),
  ]));
  assert.ok(lo);
  assert.equal(lo!.total, 5);
  assert.equal(lo!.legCount, 2);
  // Leg A: 2 stops → loadSeq 2,1. Leg B RESTARTS: 3 stops → loadSeq 3,2,1.
  assert.equal(lo!.home('a1')!.loadSeq, 2);
  assert.equal(lo!.home('a2')!.loadSeq, 1);
  assert.equal(lo!.home('a1')!.legTotal, 2);
  assert.equal(lo!.home('b1')!.loadSeq, 3);
  assert.equal(lo!.home('b3')!.loadSeq, 1);
  assert.equal(lo!.home('b3')!.legTotal, 3);
  // legGroups: one page per leg, each load-first first.
  assert.equal(lo!.legGroups.length, 2);
  assert.deepEqual(lo!.legGroups[0].stops.map((s) => s.key), ['cust:a2', 'cust:a1']);
  assert.deepEqual(lo!.legGroups[1].stops.map((s) => s.key), ['cust:b3', 'cust:b2', 'cust:b1']);
  // orderValue: LEG-then-LOAD. All of A precedes all of B.
  assert.ok(lo!.orderValue('cust:a1') < lo!.orderValue('cust:b3'), 'leg A sorts before leg B');
  assert.ok(lo!.orderValue('cust:a2') < lo!.orderValue('cust:a1'), 'within A, load-first sorts first');
  assert.equal(lo!.orderValue('cust:missing'), Number.POSITIVE_INFINITY);
  // Shared list = A load-first…last, then B load-first…last.
  assert.deepEqual(lo!.stops.map((s) => s.key), ['cust:a2', 'cust:a1', 'cust:b3', 'cust:b2', 'cust:b1']);
  // loadTag pill.
  assert.equal(loadTag(lo!.home('b3')!), 'B-1');
  assert.equal(loadTag(lo!.home('a1')!), 'A-2');
}

/* ── Dedup: a key repeated (across legs) keeps its first occurrence only ── */
{
  const lo = buildLoadOrder(routes([
    leg('A', [stop('wc:z', 'Restaurant', 1, 'wholesale'), stop('cust:1', 'One', 2)]),
    leg('B', [stop('wc:z', 'Restaurant', 1, 'wholesale')]),
  ]));
  assert.ok(lo);
  assert.equal(lo!.total, 2, 'duplicate wc:z counted once');
  assert.equal(lo!.wholesaleCustomer('z')!.leg, 'A');
  assert.equal(lo!.legGroups.length, 1, 'leg B had only the dup → dropped');
}

/* ── formatLoadRange ── */
assert.equal(formatLoadRange([]), null);
assert.equal(formatLoadRange([4]), '#4');
assert.equal(formatLoadRange([5, 3, 9]), '#3–9');

console.log('load-order.test.ts — all assertions passed');
