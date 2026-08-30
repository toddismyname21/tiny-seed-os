/**
 * Unit tests for automation-heartbeat.ts.
 *
 * No Vitest in this repo, so we run as a plain Node script:
 *   npx tsx src/lib/automation-heartbeat.test.ts
 *
 * Exits 0 if all assertions pass, 1 otherwise.
 *
 * The load-bearing behaviour: this module is the ONLY thing standing between a
 * silently-disabled cron and a member who never gets their email. Three real
 * outages (chef reminders 3 weeks, Wednesday fresh sheet 6 weeks, Friday fresh
 * sheet never) all returned HTTP 200 while failing. So the cases pinned here
 * are the ones that decide whether an outage is SEEN:
 *
 *   - a disabled gate must read 'off', never 'ok' (an off switch must not
 *     masquerade as health) and never 'stale' (turning something off on
 *     purpose must not page anyone)
 *   - a job that has never sent must read 'never', not 'ok'
 *   - the stale boundary must be exact — off-by-one here means a weekly job
 *     can miss a full cycle without anyone hearing about it
 *   - an unparseable timestamp must fail toward the alarm, not away from it
 */
import {
  classifyHeartbeat,
  heartbeatProblems,
  formatHeartbeatText,
  HEARTBEAT_CHECKS,
  WEEKLY_MAX_AGE_DAYS,
  type HeartbeatCheckDef,
} from './automation-heartbeat.ts';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${(err as Error).message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, msg?: string): void {
  if (actual !== expected) {
    throw new Error(msg ?? `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const NOW = Date.parse('2026-08-30T12:00:00Z');
const DEF: HeartbeatCheckDef = {
  gate: 'chef_reminder_enabled',
  notificationType: 'chef_order_reminder',
  label: 'Chef order reminders (Mon)',
  maxAgeDays: WEEKLY_MAX_AGE_DAYS,
};
const daysAgo = (n: number): string => new Date(NOW - n * 86_400_000).toISOString();

// ─── disabled gates ─────────────────────────────────────────────────

test("a disabled gate reads 'off', not 'ok' — an off switch is not health", () => {
  const r = classifyHeartbeat(DEF, false, null, NOW);
  assertEqual(r.state, 'off');
});

test("a disabled gate stays 'off' even with an ancient last-send", () => {
  // The real chef_reminder_enabled case: gate false, last send 20 days back.
  // Deliberate off must not page anyone — but it must still be visible.
  const r = classifyHeartbeat(DEF, false, daysAgo(20), NOW);
  assertEqual(r.state, 'off');
});

test("'off' is NOT reported as a problem", () => {
  const r = classifyHeartbeat(DEF, false, null, NOW);
  assertEqual(heartbeatProblems([r]).length, 0);
});

// ─── enabled + never sent ───────────────────────────────────────────

test("enabled but NEVER sent reads 'never' (the Friday fresh sheet case)", () => {
  const r = classifyHeartbeat(DEF, true, null, NOW);
  assertEqual(r.state, 'never');
  assertEqual(r.ageDays, null);
});

test("'never' IS reported as a problem", () => {
  const r = classifyHeartbeat(DEF, true, null, NOW);
  assertEqual(heartbeatProblems([r]).length, 1);
});

// ─── the stale boundary ─────────────────────────────────────────────

test('a fresh send is ok', () => {
  assertEqual(classifyHeartbeat(DEF, true, daysAgo(1), NOW).state, 'ok');
});

test('exactly at maxAgeDays is still ok (boundary is inclusive)', () => {
  assertEqual(classifyHeartbeat(DEF, true, daysAgo(WEEKLY_MAX_AGE_DAYS), NOW).state, 'ok');
});

test('one day past maxAgeDays is stale', () => {
  assertEqual(classifyHeartbeat(DEF, true, daysAgo(WEEKLY_MAX_AGE_DAYS + 1), NOW).state, 'stale');
});

test('a weekly job that missed ONE cycle is still ok (7d < 9d slack)', () => {
  assertEqual(classifyHeartbeat(DEF, true, daysAgo(7), NOW).state, 'ok');
});

test('a weekly job that missed TWO cycles is stale — the real chef case', () => {
  // chef_order_reminder was 20 days stale when this was written.
  const r = classifyHeartbeat(DEF, true, daysAgo(20), NOW);
  assertEqual(r.state, 'stale');
  assertEqual(r.ageDays, 20);
});

test('the 42-day Wednesday fresh sheet is stale', () => {
  assertEqual(classifyHeartbeat(DEF, true, daysAgo(42), NOW).state, 'stale');
});

// ─── failing toward the alarm ───────────────────────────────────────

test("an unparseable timestamp reads 'never', not 'ok'", () => {
  const r = classifyHeartbeat(DEF, true, 'not-a-date', NOW);
  assertEqual(r.state, 'never');
});

// ─── config integrity ───────────────────────────────────────────────

test('no duplicate notification types in the check list', () => {
  const seen = new Set(HEARTBEAT_CHECKS.map((c) => c.notificationType));
  assertEqual(seen.size, HEARTBEAT_CHECKS.length);
});

test('every check has a positive maxAgeDays and a label', () => {
  for (const c of HEARTBEAT_CHECKS) {
    if (!(c.maxAgeDays > 0)) throw new Error(`${c.notificationType} has a non-positive maxAgeDays`);
    if (!c.label.trim()) throw new Error(`${c.notificationType} has no label`);
  }
});

test('all four known feature gates are covered', () => {
  const gates = new Set(HEARTBEAT_CHECKS.map((c) => c.gate).filter(Boolean));
  for (const g of [
    'chef_reminder_enabled',
    'flex_reminder_enabled',
    'wholesale_list_wed_enabled',
    'wholesale_list_fri_enabled',
  ]) {
    if (!gates.has(g)) throw new Error(`gate ${g} is not covered by any heartbeat check`);
  }
});

// ─── rendering ──────────────────────────────────────────────────────

test('formatted text names the job and its state', () => {
  const txt = formatHeartbeatText([
    classifyHeartbeat(DEF, true, daysAgo(20), NOW),
    classifyHeartbeat({ ...DEF, label: 'Friday fresh sheet' }, true, null, NOW),
    classifyHeartbeat({ ...DEF, label: 'Flex reminders' }, false, null, NOW),
  ]);
  if (!txt.includes('STALE')) throw new Error('missing STALE marker');
  if (!txt.includes('has NEVER sent')) throw new Error('missing NEVER wording');
  if (!txt.includes('gate is off')) throw new Error('missing OFF wording');
  if (!txt.includes('Friday fresh sheet')) throw new Error('missing job label');
});

test('problems filter returns only stale + never, in order', () => {
  const rs = [
    classifyHeartbeat(DEF, true, daysAgo(1), NOW),   // ok
    classifyHeartbeat(DEF, false, null, NOW),        // off
    classifyHeartbeat(DEF, true, daysAgo(30), NOW),  // stale
    classifyHeartbeat(DEF, true, null, NOW),         // never
  ];
  const p = heartbeatProblems(rs);
  assertEqual(p.length, 2);
  assertEqual(p[0].state, 'stale');
  assertEqual(p[1].state, 'never');
});

// ─── Done ───────────────────────────────────────────────────────────

console.log('');
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) {
  const p = (globalThis as { process?: { exit: (n: number) => never } }).process;
  if (p) p.exit(1);
}
