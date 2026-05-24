/**
 * Unit tests for stop-chat.ts (Stop Notes / chat Phase 0).
 *
 * No Vitest in this repo, so we run as a plain Node script:
 *   npx tsx src/lib/stop-chat.test.ts
 *
 * Exits 0 if all assertions pass, 1 otherwise.
 *
 * The load-bearing piece is memberDisplayName() — it enforces the portal's
 * privacy ceiling (first name + last initial only, never a full surname), so
 * we pin its behavior across the edge cases that real contact_name data hits
 * (single token, multi-token, blank, mixed case, over-long).
 */
import {
  memberDisplayName,
  formatNoteTimestamp,
  ROLE_BADGE_LABEL,
  DISPLAY_NAME_MAX,
} from './stop-chat.ts';

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

// ─── memberDisplayName ──────────────────────────────────────────────

test('two-token name → first + last initial', () => {
  assertEqual(memberDisplayName('Jane Smith'), 'Jane S.');
});

test('three-token name → first + LAST initial (surname is the last token)', () => {
  assertEqual(memberDisplayName('Jane Marie Smith'), 'Jane S.');
});

test('single token → first name only, no initial', () => {
  assertEqual(memberDisplayName('Jane'), 'Jane');
});

test('lowercase input is title-cased on the leading letters', () => {
  assertEqual(memberDisplayName('jane smith'), 'Jane S.');
});

test('extra whitespace is trimmed + collapsed', () => {
  assertEqual(memberDisplayName('  jane   smith  '), 'Jane S.');
});

test('empty / whitespace / null → "A member" (never empty — DB requires ≥1)', () => {
  assertEqual(memberDisplayName(''), 'A member');
  assertEqual(memberDisplayName('   '), 'A member');
  assertEqual(memberDisplayName(null), 'A member');
  assertEqual(memberDisplayName(undefined), 'A member');
});

test('never publishes a full surname (only the initial)', () => {
  const out = memberDisplayName('Alexandra Thompson');
  assertEqual(out, 'Alexandra T.');
  // The surname must NOT appear in full.
  if (out.toLowerCase().includes('thompson')) {
    throw new Error(`display name leaked the full surname: ${out}`);
  }
});

test('over-long name is clamped to DISPLAY_NAME_MAX', () => {
  const longFirst = 'X'.repeat(200);
  const out = memberDisplayName(`${longFirst} Smith`);
  if (out.length > DISPLAY_NAME_MAX) {
    throw new Error(`expected ≤ ${DISPLAY_NAME_MAX} chars, got ${out.length}`);
  }
});

// ─── ROLE_BADGE_LABEL ───────────────────────────────────────────────

test('role badge labels match the privacy-friendly copy', () => {
  assertEqual(ROLE_BADGE_LABEL.staff, 'Farm');
  assertEqual(ROLE_BADGE_LABEL.host, 'Host');
  assertEqual(ROLE_BADGE_LABEL.member, 'Member');
});

// ─── formatNoteTimestamp ────────────────────────────────────────────

test('formats an ISO timestamp in ET (absolute, not relative)', () => {
  // 2026-05-24T18:15:00Z → 2:15 PM ET (EDT, UTC-4).
  assertEqual(formatNoteTimestamp('2026-05-24T18:15:00Z'), 'May 24, 2:15 PM');
});

test('returns empty string for null / unparseable input', () => {
  assertEqual(formatNoteTimestamp(null), '');
  assertEqual(formatNoteTimestamp(undefined), '');
  assertEqual(formatNoteTimestamp('not-a-date'), '');
});

// ─── Done ───────────────────────────────────────────────────────────

console.log('');
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) {
  const p = (globalThis as { process?: { exit: (n: number) => never } }).process;
  if (p) p.exit(1);
}
