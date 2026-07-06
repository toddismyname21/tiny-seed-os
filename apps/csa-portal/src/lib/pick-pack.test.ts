/**
 * Unit tests for pick-pack.ts pure helpers. Run via `npm run test:unit`
 * (npx tsx). Node's assert; no test framework dependency (matches the
 * other *.test.ts in this repo).
 *
 * Focus: the FLEX channel added to mergeCropDemand (Todd 2026-07-05) — flex
 * demand must fold into existing crop lines by normCrop, spawn its own line
 * when it matches nothing, count toward totalQty + channelCount + multiChannel,
 * and never regress the CSA/market/wholesale behavior or line-key stability.
 */
import assert from 'node:assert/strict';
import {
  normCrop, slugForKey, pickPackLineKey, isTenderGreen,
  mergeCropDemand, channelCount,
  type CropDemandInput,
} from './pick-pack.ts';

/* ── normCrop / slug / line keys are UNCHANGED by the flex work ── */
assert.equal(normCrop('King Spring Mix (per lb)'), 'king spring mix');
assert.equal(slugForKey('King Spring Mix (per lb)'), 'king-spring-mix');
assert.equal(pickPackLineKey('row', 'Kale'), 'c:kale');
assert.equal(pickPackLineKey('row', 'Kale', 'bunch'), 'c:kale:bunch');
assert.equal(pickPackLineKey('group', 'King Spring Mix'), 'g:king-spring-mix');

/* ── FLEX folds into an EXISTING crop line by normCrop ── */
{
  const csa: CropDemandInput[] = [{ crop: 'Kale', qty: 10, unit: 'bunch' }];
  const flex: CropDemandInput[] = [{ crop: 'Kale', qty: 4, unit: 'bunch' }];
  const rows = mergeCropDemand(csa, [], [], flex);
  const kale = rows.find((r) => normCrop(r.crop) === 'kale');
  assert.ok(kale, 'kale row exists');
  assert.equal(kale!.csa?.qty, 10, 'CSA qty intact');
  assert.equal(kale!.flex?.qty, 4, 'flex qty attributed to its own cell');
  assert.equal(kale!.totalQty, 14, 'totalQty = CSA 10 + flex 4');
  assert.equal(channelCount(kale!), 2, 'CSA + flex = 2 channels');
  assert.equal(kale!.multiChannel, true, 'multi-channel with flex');
  // Line key for the merged crop is by NAME only (overall view) — UNCHANGED by
  // the added flex qty (the whole point: quantities change, keys don't).
  assert.equal(pickPackLineKey('row', kale!.crop), 'c:kale');
}

/* ── FLEX with a unit suffix folds into the box crop (normCrop drops "(per lb)") ── */
{
  const csa: CropDemandInput[] = [{ crop: 'King Spring Mix', qty: 20, unit: 'bag' }];
  const flex: CropDemandInput[] = [{ crop: 'King Spring Mix (per lb)', qty: 3, unit: 'lb' }];
  const rows = mergeCropDemand(csa, [], [], flex);
  assert.equal(rows.length, 1, 'flex "(per lb)" merged into the one box line, not a 2nd row');
  assert.equal(rows[0].csa?.qty, 20);
  assert.equal(rows[0].flex?.qty, 3);
  assert.equal(rows[0].totalQty, 23);
}

/* ── FLEX that matches NOTHING becomes its own line ── */
{
  const csa: CropDemandInput[] = [{ crop: 'Kale', qty: 10, unit: 'bunch' }];
  const flex: CropDemandInput[] = [{ crop: 'Dozen Eggs', qty: 6, unit: 'dozen' }];
  const rows = mergeCropDemand(csa, [], [], flex);
  assert.equal(rows.length, 2, 'eggs is its own line');
  const eggs = rows.find((r) => normCrop(r.crop) === 'dozen eggs');
  assert.ok(eggs, 'eggs line exists');
  assert.equal(eggs!.flex?.qty, 6);
  assert.equal(eggs!.csa, null, 'eggs has no CSA demand');
  assert.equal(channelCount(eggs!), 1, 'flex-only line = 1 channel');
  assert.equal(eggs!.multiChannel, false);
}

/* ── Zero / negative flex qty never creates a phantom line ── */
{
  const rows = mergeCropDemand([], [], [], [
    { crop: 'Nothing', qty: 0, unit: 'each' },
    { crop: 'Negative', qty: -5, unit: 'each' },
  ]);
  assert.equal(rows.length, 0, 'no rows for non-positive flex qty');
}

/* ── Flex tender green sorts to the top like any other channel ── */
{
  const rows = mergeCropDemand(
    [{ crop: 'Carrots', qty: 100, unit: 'bunch', category: 'Roots' }],
    [], [],
    [{ crop: 'Arugula', qty: 2, unit: 'bag' }],
  );
  assert.equal(isTenderGreen('Arugula'), true, 'arugula is tender by keyword');
  assert.equal(rows[0].crop, 'Arugula', 'tender flex-only crop sorts above bulk carrots');
  assert.equal(rows[0].flex?.qty, 2);
}

/* ── BACKWARD COMPAT: three-arg call (no flex) still works, flex cell is null ── */
{
  const rows = mergeCropDemand(
    [{ crop: 'Kale', qty: 10, unit: 'bunch' }],
    [{ crop: 'Kale', qty: 5, unit: 'bunch' }],
    [{ crop: 'Kale', qty: 2, unit: 'lb' }],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].flex, null, 'no flex arg → flex cell null');
  assert.equal(rows[0].totalQty, 17, 'CSA 10 + market 5 + wholesale 2');
  assert.equal(channelCount(rows[0]), 3, 'three channels, flex not counted');
}

console.log('pick-pack.test.ts — all assertions passed');
