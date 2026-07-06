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
  mergeCropDemand, channelCount, buildDestinationMatrix,
  type CropDemandInput, type DestDemandInput,
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

/* ════════════════════════════════════════════════════════════════════════
 * PACK HOUSE DISTRIBUTION MATRIX (buildDestinationMatrix)
 * The invariant Todd depends on: a matrix row's TOTAL is the SAME number as the
 * overall harvest sheet (reused from `merged`, not re-added), AND the row's
 * destination cells SUM to that total. Prove it end-to-end.
 * ════════════════════════════════════════════════════════════════════════ */
{
  // Demand: Kale to CSA + two markets + two restaurants + Flex; Carrots to CSA
  // + one restaurant (that restaurant also has a SECOND kale order — must sum).
  const csa: CropDemandInput[] = [
    { crop: 'Kale', qty: 10, unit: 'bunch' },
    { crop: 'Carrots', qty: 40, unit: 'bunch', category: 'Roots' },
  ];
  const market: CropDemandInput[] = [{ crop: 'Kale', qty: 8, unit: 'bunch' }]; // Σ of the two market offerings below
  const wholesale: CropDemandInput[] = [ // Σ of the per-restaurant orders below
    { crop: 'Kale', qty: 7, unit: 'bunch' },
    { crop: 'Carrots', qty: 6, unit: 'bunch' },
  ];
  const flex: CropDemandInput[] = [{ crop: 'Kale', qty: 3, unit: 'bunch' }];
  const merged = mergeCropDemand(csa, market, wholesale, flex);

  // The SAME demand, decomposed to physical destinations (what the page feeds).
  const dests: DestDemandInput[] = [
    { crop: 'Kale', qty: 10, unit: 'bunch', kind: 'csa', destKey: 'csa', destLabel: 'CSA' },
    { crop: 'Carrots', qty: 40, unit: 'bunch', kind: 'csa', destKey: 'csa', destLabel: 'CSA' },
    { crop: 'Kale', qty: 5, unit: 'bunch', kind: 'market', destKey: 'mkt:lville', destLabel: 'Lawrenceville' },
    { crop: 'Kale', qty: 3, unit: 'bunch', kind: 'market', destKey: 'mkt:sq', destLabel: 'Squirrel Hill' },
    { crop: 'Kale', qty: 4, unit: 'bunch', kind: 'wholesale', destKey: 'ws:a', destLabel: 'Dish' },
    { crop: 'Kale', qty: 2, unit: 'bunch', kind: 'wholesale', destKey: 'ws:b', destLabel: 'Fet Fisk' },
    // Second order for the SAME restaurant (ws:a) — must merge into its cell.
    { crop: 'Kale', qty: 1, unit: 'bunch', kind: 'wholesale', destKey: 'ws:a', destLabel: 'Dish' },
    { crop: 'Carrots', qty: 6, unit: 'bunch', kind: 'wholesale', destKey: 'ws:a', destLabel: 'Dish' },
    { crop: 'Kale', qty: 3, unit: 'bunch', kind: 'flex', destKey: 'flex', destLabel: 'Flex' },
  ];
  const matrix = buildDestinationMatrix(merged, dests);

  // Row order matches merged exactly (tender-first etc.).
  assert.deepEqual(
    matrix.rows.map((r) => r.crop),
    merged.map((r) => r.crop),
    'matrix rows are in merged order',
  );

  // Column order: CSA, then markets (first-seen), then wholesale, then Flex.
  assert.deepEqual(
    matrix.columns.map((c) => c.key),
    ['csa', 'mkt:lville', 'mkt:sq', 'ws:a', 'ws:b', 'flex'],
    'columns ordered by kind then first-seen',
  );
  assert.deepEqual(matrix.columns.map((c) => c.kind), ['csa', 'market', 'market', 'wholesale', 'wholesale', 'flex']);

  // THE INVARIANT: each row total == merged total == Σ cells.
  for (const r of matrix.rows) {
    const mr = merged.find((m) => m.crop === r.crop)!;
    assert.equal(r.totalQty, mr.totalQty, `${r.crop}: row total reused from merged`);
    let sum = 0;
    for (const cell of r.cells.values()) sum += cell.qty;
    assert.equal(sum, r.totalQty, `${r.crop}: Σ destination cells == row total`);
  }

  // Multiple orders for one restaurant summed into that ONE cell.
  const kale = matrix.rows.find((r) => normCrop(r.crop) === 'kale')!;
  assert.equal(kale.cells.get('ws:a')!.qty, 5, 'Dish kale = 4 + 1 (two orders summed)');
  assert.equal(kale.cells.get('mkt:lville')!.qty, 5);
  assert.equal(kale.cells.get('csa')!.qty, 10);
  assert.equal(kale.cells.get('flex')!.qty, 3);
  assert.equal(kale.totalQty, 10 + 8 + 7 + 3, 'kale total = 28');

  // A destination that doesn't take a crop → no cell (renders "—").
  const carrots = matrix.rows.find((r) => normCrop(r.crop) === 'carrots')!;
  assert.equal(carrots.cells.has('mkt:lville'), false, 'carrots has no Lawrenceville cell');
  assert.equal(carrots.cells.get('csa')!.qty, 40);
  assert.equal(carrots.cells.get('ws:a')!.qty, 6);
  assert.equal(carrots.totalQty, 46);
}

/* ── Dominant unit + mixed-unit flag ── */
{
  // Kale: 10 bunch (CSA) + 2 lb (wholesale) → dominant 'bunch', mixed = true.
  const merged = mergeCropDemand(
    [{ crop: 'Kale', qty: 10, unit: 'bunch' }],
    [], [{ crop: 'Kale', qty: 2, unit: 'lb' }],
  );
  const matrix = buildDestinationMatrix(merged, [
    { crop: 'Kale', qty: 10, unit: 'bunch', kind: 'csa', destKey: 'csa', destLabel: 'CSA' },
    { crop: 'Kale', qty: 2, unit: 'lb', kind: 'wholesale', destKey: 'ws:a', destLabel: 'Dish' },
  ]);
  const row = matrix.rows[0];
  assert.equal(row.dominantUnit, 'bunch', 'dominant unit is the bigger-qty unit');
  assert.equal(row.mixedUnits, true, 'flagged when a destination uses a different unit');
}

/* ── Empty demand → no columns, no rows (drives the "nothing" card) ── */
{
  const matrix = buildDestinationMatrix([], []);
  assert.equal(matrix.columns.length, 0);
  assert.equal(matrix.rows.length, 0);
}

console.log('pick-pack.test.ts — all assertions passed');
