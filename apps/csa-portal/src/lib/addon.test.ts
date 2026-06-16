/**
 * Unit tests for the add-on label derivation (lib/addon).
 *
 * Run via: npm run test:unit  (tsx; vitest is NOT installed).
 *
 * The bug this covers: a member with Cheese + Mushroom add-ons saw two
 * rows both labeled just "Add-On" because the specific add-on type lives
 * only in members.notes free-text, not in a column. addOnLabel() derives
 * "Cheese add-on" / "Mushroom add-on" from notes via keyword match.
 */
import { addOnLabel, shareDisplayLabel, GENERIC_ADD_ON_LABEL } from './addon';

let passed = 0;
function assertEq(actual: string, expected: string, msg: string): void {
  if (actual !== expected) {
    throw new Error(`FAIL: ${msg}\n  expected: ${expected}\n  actual:   ${actual}`);
  }
  passed++;
}

// ─── addOnLabel: real-world notes strings ────────────────────────────
assertEq(addOnLabel('...2026 Mushroom CSA Add-On...'), 'Mushroom add-on', 'mushroom from notes');
assertEq(addOnLabel('Local Cheese CSA Add-On 2026'), 'Cheese add-on', 'cheese from notes');
assertEq(addOnLabel('Local Bread Add-On'), 'Bread add-on', 'bread from notes');
assertEq(addOnLabel('Coffee Add-On 2026'), 'Coffee add-on', 'coffee from notes');
assertEq(addOnLabel('2026 Farm Egg Add-On (weekly)'), 'Egg add-on', 'egg from notes');

// ─── Case-insensitivity ──────────────────────────────────────────────
assertEq(addOnLabel('LOCAL CHEESE ADD-ON'), 'Cheese add-on', 'uppercase cheese');
assertEq(addOnLabel('mUsHrOoM csa'), 'Mushroom add-on', 'mixed-case mushroom');

// ─── Fallbacks ───────────────────────────────────────────────────────
assertEq(addOnLabel(null), GENERIC_ADD_ON_LABEL, 'null notes → generic');
assertEq(addOnLabel(undefined), GENERIC_ADD_ON_LABEL, 'undefined notes → generic');
assertEq(addOnLabel(''), GENERIC_ADD_ON_LABEL, 'empty notes → generic');
assertEq(addOnLabel('   '), GENERIC_ADD_ON_LABEL, 'whitespace notes → generic');
assertEq(
  addOnLabel('Some unrelated note about a Tuesday pickup'),
  GENERIC_ADD_ON_LABEL,
  'no keyword → generic',
);

// ─── First-match priority when multiple keywords appear ──────────────
// Order in the table is mushroom > cheese; a contrived multi-keyword
// string returns the first match deterministically.
assertEq(
  addOnLabel('Mushroom and Cheese combo add-on'),
  'Mushroom add-on',
  'first keyword wins (mushroom before cheese)',
);

// ─── shareDisplayLabel: add-on vs non-add-on ─────────────────────────
assertEq(
  shareDisplayLabel('add_on', '2026 Mushroom CSA Add-On', 'Add-On'),
  'Mushroom add-on',
  'shareDisplayLabel derives add-on name',
);
assertEq(
  shareDisplayLabel('add_on', null, 'Add-On'),
  GENERIC_ADD_ON_LABEL,
  'shareDisplayLabel add-on with null notes → generic',
);
assertEq(
  shareDisplayLabel('summer_veg', 'irrelevant cheese mention', 'Summer Vegetable Share'),
  'Summer Vegetable Share',
  'shareDisplayLabel non-add-on uses base label (ignores notes)',
);

console.log(`addon.test.ts: ${passed} assertions passed`);
