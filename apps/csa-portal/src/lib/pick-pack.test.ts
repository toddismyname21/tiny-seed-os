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
  aliasNormalize, cropMergeKey, crewSection, crewSectionRank, groupBySection,
  isWeightUnit, packLbForUnits, fmtLb, CREW_SECTIONS,
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

/* ════════════════════════════════════════════════════════════════════════
 * CSA small/large box SPLIT (Todd 2026-07-09) — the pack crew packs sizes
 * differently, so the CSA matrix cell must carry an 8S/4L breakdown. The split
 * accumulates alongside qty (across units + duplicate CSA inputs), only CSA
 * cells carry it, and it NEVER changes the row total (Σcells still == total).
 * ════════════════════════════════════════════════════════════════════════ */
{
  const csa: CropDemandInput[] = [{ crop: 'Kale', qty: 12, unit: 'bunch' }];
  const wholesale: CropDemandInput[] = [{ crop: 'Kale', qty: 5, unit: 'bunch' }];
  const merged = mergeCropDemand(csa, [], wholesale);

  const dests: DestDemandInput[] = [
    // CSA Kale split 8 small + 4 large = 12.
    { crop: 'Kale', qty: 12, unit: 'bunch', kind: 'csa', destKey: 'csa', destLabel: 'CSA', sizeSplit: { small: 8, large: 4 } },
    // Wholesale carries NO split.
    { crop: 'Kale', qty: 5, unit: 'bunch', kind: 'wholesale', destKey: 'ws:a', destLabel: 'Dish' },
  ];
  const matrix = buildDestinationMatrix(merged, dests);
  const kale = matrix.rows.find((r) => normCrop(r.crop) === 'kale')!;

  const csaCell = kale.cells.get('csa')!;
  assert.equal(csaCell.qty, 12, 'CSA cell qty intact');
  assert.deepEqual(csaCell.sizeSplit, { small: 8, large: 4 }, 'CSA cell carries the 8S/4L split');
  assert.equal(csaCell.sizeSplit!.small + csaCell.sizeSplit!.large, csaCell.qty, 'split sums to the CSA qty');

  // Non-CSA cells never get a split.
  assert.equal(kale.cells.get('ws:a')!.sizeSplit, undefined, 'wholesale cell has no size split');

  // Invariant unchanged: Σ destination cells == row total == merged total.
  let sum = 0;
  for (const cell of kale.cells.values()) sum += cell.qty;
  assert.equal(sum, kale.totalQty, 'Σ cells == row total (split does not alter totals)');
  assert.equal(kale.totalQty, 17, 'CSA 12 + wholesale 5');
}

/* ── CSA split accumulates across UNITS + duplicate CSA inputs into one cell ── */
{
  // Same crop fed as two CSA rows (e.g. two units, or small vs large plan rows)
  // — the cell qty AND the split must both sum.
  const merged = mergeCropDemand(
    [{ crop: 'Salad Mix', qty: 30, unit: 'bag' }],
    [], [],
  );
  const matrix = buildDestinationMatrix(merged, [
    { crop: 'Salad Mix', qty: 20, unit: 'bag', kind: 'csa', destKey: 'csa', destLabel: 'CSA', sizeSplit: { small: 20, large: 0 } },
    { crop: 'Salad Mix', qty: 10, unit: 'bag', kind: 'csa', destKey: 'csa', destLabel: 'CSA', sizeSplit: { small: 0, large: 10 } },
  ]);
  const cell = matrix.rows[0].cells.get('csa')!;
  assert.equal(cell.qty, 30, 'two CSA inputs summed into one cell');
  assert.deepEqual(cell.sizeSplit, { small: 20, large: 10 }, 'splits summed across the two inputs');
  assert.equal(cell.sizeSplit!.small + cell.sizeSplit!.large, cell.qty, 'accumulated split still sums to qty');
}

/* ════════════════════════════════════════════════════════════════════════
 * CANONICAL ITEM IDENTITY (owner 2026-07-13) — the alias-normalizer folds the
 * same real-world crop, spelled differently by different outlets, into ONE row.
 * ════════════════════════════════════════════════════════════════════════ */

/* ── aliasNormalize peels leading vendor adjectives; cropMergeKey == it ── */
assert.equal(aliasNormalize('Local Organic Radicchio'), 'radicchio', 'Local + Organic stripped');
assert.equal(aliasNormalize('Wild Dandelion Greens'), 'dandelion greens', 'Wild stripped, "greens" kept');
assert.equal(aliasNormalize('Fresh Basil'), 'basil');
assert.equal(aliasNormalize('Certified Organic Kale'), 'kale', 'multi-word prefix stripped');
assert.equal(aliasNormalize('Radicchio'), 'radicchio', 'no-prefix name unchanged');
assert.equal(cropMergeKey('Local Organic Radicchio'), cropMergeKey('Radicchio'), 'aliases share a merge key');
// A name that IS just a prefix is never peeled to nothing.
assert.equal(aliasNormalize('Fresh'), 'fresh', 'a bare prefix survives (never emptied)');
// "Baby" is deliberately NOT stripped — baby kale is a distinct product.
assert.notEqual(aliasNormalize('Baby Kale'), aliasNormalize('Kale'), 'Baby is preserved (distinct crop)');
// slugForKey now rides on cropMergeKey (line-key canonicalization).
assert.equal(slugForKey('Local Organic Radicchio'), 'radicchio');
// Regression: the documented unit-suffix slug is unchanged (no vendor prefix).
assert.equal(slugForKey('King Spring Mix (per lb)'), 'king-spring-mix');

/* ── The three CONCRETE merges for the 2026-07-13 week (unlinked, text-only) ── */
{
  // Harvie (wholesale) spells them one way; the box/market spell them the library way.
  const csa: CropDemandInput[] = [
    { crop: 'Radicchio', qty: 12, unit: 'head' },
    { crop: 'Dandelion Greens', qty: 8, unit: 'bunch' },
  ];
  const market: CropDemandInput[] = [{ crop: 'Salad Mix', qty: 20, unit: 'bag' }];
  const wholesale: CropDemandInput[] = [
    { crop: 'Local Organic Radicchio', qty: 6, unit: 'head', sourceName: 'Local Organic Radicchio' },
    { crop: 'Wild Dandelion Greens', qty: 4, unit: 'bunch', sourceName: 'Wild Dandelion Greens' },
    { crop: 'Organic Salad Mix', qty: 5, unit: 'bag', sourceName: 'Organic Salad Mix' },
  ];
  const rows = mergeCropDemand(csa, market, wholesale);
  assert.equal(rows.length, 3, 'three real crops → three rows (aliases merged, not 6)');
  const rad = rows.find((r) => normCrop(r.crop) === 'radicchio')!;
  assert.equal(rad.totalQty, 18, 'Radicchio 12 + 6 = 18 (Local Organic folded in)');
  assert.deepEqual(rad.altNames, ['Local Organic Radicchio'], 'vendor spelling surfaced as an altName');
  const dan = rows.find((r) => normCrop(r.crop) === 'dandelion greens')!;
  assert.equal(dan.totalQty, 12, 'Dandelion Greens 8 + 4 = 12');
  assert.deepEqual(dan.altNames, ['Wild Dandelion Greens']);
  const sal = rows.find((r) => normCrop(r.crop) === 'salad mix')!;
  assert.equal(sal.totalQty, 25, 'Salad Mix 20 + 5 = 25');
}

/* ── A LIBRARY-canonical name (linked line) wins the display + upgrades a row
 *    first seen under an outlet spelling that shares NO text with it. ── */
{
  // CSA plan says "King Spring Mix"; wholesale is linked to the same library
  // product but the order item was named "Baby Kale Mix" by the vendor. The page
  // passes the canonical library name with canonical:true + the vendor sourceName.
  const csa: CropDemandInput[] = [{ crop: 'King Spring Mix', qty: 30, unit: 'bag' }];
  const wholesale: CropDemandInput[] = [
    { crop: 'King Spring Mix', qty: 10, unit: 'lb', canonical: true, sourceName: 'Baby Kale Mix' },
  ];
  const rows = mergeCropDemand(csa, [], wholesale);
  assert.equal(rows.length, 1, 'linked line merged into the box line by canonical name');
  assert.equal(rows[0].crop, 'King Spring Mix', 'canonical library name is the display');
  assert.deepEqual(rows[0].altNames, ['Baby Kale Mix'], 'the vendor spelling is surfaced');
  assert.equal(rows[0].totalQty, 40);
}

/* ── Canonical name upgrades display even when seen SECOND ── */
{
  const rows = mergeCropDemand(
    [{ crop: 'radicchio', qty: 5, unit: 'head' }],            // non-canonical, lowercased
    [],
    [{ crop: 'Radicchio', qty: 3, unit: 'head', canonical: true }], // canonical, seen later
  );
  assert.equal(rows[0].crop, 'Radicchio', 'canonical spelling wins the display even seen 2nd');
}

/* ── buildDestinationMatrix inherits the SAME canonical identity ── */
{
  const merged = mergeCropDemand(
    [{ crop: 'Radicchio', qty: 12, unit: 'head' }],
    [], [{ crop: 'Local Organic Radicchio', qty: 6, unit: 'head', sourceName: 'Local Organic Radicchio' }],
  );
  const matrix = buildDestinationMatrix(merged, [
    { crop: 'Radicchio', qty: 12, unit: 'head', kind: 'csa', destKey: 'csa', destLabel: 'CSA' },
    // The wholesale cell uses the VENDOR spelling — must still attach to the row.
    { crop: 'Local Organic Radicchio', qty: 6, unit: 'head', kind: 'wholesale', destKey: 'ws:a', destLabel: 'Dish' },
  ]);
  assert.equal(matrix.rows.length, 1, 'one canonical row');
  const r = matrix.rows[0];
  assert.equal(r.cells.get('csa')!.qty, 12);
  assert.equal(r.cells.get('ws:a')!.qty, 6, 'vendor-spelled cell attached via cropMergeKey');
  let sum = 0; for (const c of r.cells.values()) sum += c.qty;
  assert.equal(sum, r.totalQty, 'Σ cells == total holds across alias spellings');
  assert.deepEqual(r.altNames, ['Local Organic Radicchio'], 'matrix row carries the altName');
}

/* ════════════════════════════════════════════════════════════════════════
 * CREW SECTIONS — category → section mapping + name fallback + grouping.
 * ════════════════════════════════════════════════════════════════════════ */

// Every live product_library.category maps to a real crew section.
assert.equal(crewSection('Salad Mixes'), 'Salad Greens');
assert.equal(crewSection('Salad Greens'), 'Salad Greens');
assert.equal(crewSection('Head Lettuce & Chicories'), 'Salad Greens');
assert.equal(crewSection('Bunching Greens'), 'Bunching Greens');
assert.equal(crewSection('Brassicas'), 'Bunching Greens');
assert.equal(crewSection('Alliums'), 'Alliums');
assert.equal(crewSection('Roots'), 'Roots');
assert.equal(crewSection('Tomatoes'), 'Fruiting & Vegetables');
assert.equal(crewSection('Peppers'), 'Fruiting & Vegetables');
assert.equal(crewSection('Squash & Fruiting'), 'Fruiting & Vegetables');
assert.equal(crewSection('Herbs'), 'Herbs');
assert.equal(crewSection('Edible Flowers'), 'Flowers');
assert.equal(crewSection('Mushrooms'), 'Other');
assert.equal(crewSection('Specialty'), 'Other');
// Unknown / blank category → Other (no crash).
assert.equal(crewSection('Nonsense'), 'Other');
assert.equal(crewSection(null), 'Other');
assert.equal(crewSection(''), 'Other');
// Category is case-insensitive.
assert.equal(crewSection('bunching greens'), 'Bunching Greens');

// Name-keyword fallback when NO category (CSA box-plan crops).
assert.equal(crewSection(null, 'Kale'), 'Bunching Greens');
assert.equal(crewSection(null, 'Rainbow Carrots'), 'Roots');
assert.equal(crewSection(null, 'Scallions'), 'Alliums');
assert.equal(crewSection(null, 'Cherry Tomatoes'), 'Fruiting & Vegetables');
assert.equal(crewSection(null, 'Genovese Basil'), 'Herbs');
assert.equal(crewSection(null, 'Sunflower Bouquet'), 'Flowers');
assert.equal(crewSection(null, 'Butterhead Lettuce'), 'Salad Greens');
assert.equal(crewSection(null, 'Widget'), 'Other', 'no keyword hit → Other');
// Category ALWAYS wins over the name guess.
assert.equal(crewSection('Roots', 'Kale'), 'Roots', 'category beats name keyword');

// crewSectionRank matches CREW_SECTIONS order.
assert.equal(crewSectionRank('Salad Greens'), 0);
assert.equal(crewSectionRank('Other'), CREW_SECTIONS.length - 1);
assert.ok(crewSectionRank('Alliums') < crewSectionRank('Roots'));

/* ── groupBySection: ordered sections, A→Z within, empties dropped ── */
{
  interface Row { crop: string; category: string | null; }
  const rows: Row[] = [
    { crop: 'Zucchini', category: 'Squash & Fruiting' },
    { crop: 'Arugula', category: 'Salad Greens' },
    { crop: 'Kale', category: 'Bunching Greens' },
    { crop: 'Beets', category: 'Roots' },
    { crop: 'Carrots', category: 'Roots' },
    { crop: 'Basil', category: 'Herbs' },
    { crop: 'Cabbage', category: null }, // → Bunching Greens by name
  ];
  const groups = groupBySection(rows, (r) => r.category, (r) => r.crop);
  assert.deepEqual(
    groups.map((g) => g.section),
    ['Salad Greens', 'Bunching Greens', 'Roots', 'Fruiting & Vegetables', 'Herbs'],
    'sections in CREW_SECTIONS order, empty ones dropped',
  );
  const bunching = groups.find((g) => g.section === 'Bunching Greens')!;
  assert.deepEqual(bunching.items.map((r) => r.crop), ['Cabbage', 'Kale'], 'A→Z within a section');
  const roots = groups.find((g) => g.section === 'Roots')!;
  assert.deepEqual(roots.items.map((r) => r.crop), ['Beets', 'Carrots']);
}

/* ════════════════════════════════════════════════════════════════════════
 * PORTIONED PRODUCTS → TOTAL HARVEST POUNDS (pure helpers).
 * ════════════════════════════════════════════════════════════════════════ */

assert.equal(isWeightUnit('lb'), true);
assert.equal(isWeightUnit('LBS'), true);
assert.equal(isWeightUnit('#'), true);
assert.equal(isWeightUnit('each'), false);
assert.equal(isWeightUnit('clamshell'), false);
assert.equal(isWeightUnit(null), false);

// ¼-lb clamshell × 40 → 10.0 lb; 0.75-lb Big Bag × 8 → 6.0 lb (owner's examples).
assert.equal(packLbForUnits(0.25, 40, 'each'), 10);
assert.equal(packLbForUnits(0.75, 8, 'bag'), 6);
// Rounded to 0.1 lb.
assert.equal(packLbForUnits(0.25, 5, 'clamshell'), 1.3);
// No pack weight, weight-based unit, or non-positive qty → null (no double-count).
assert.equal(packLbForUnits(null, 40, 'each'), null);
assert.equal(packLbForUnits(0, 40, 'each'), null);
assert.equal(packLbForUnits(0.25, 40, 'lb'), null, 'already pounds → never multiply');
assert.equal(packLbForUnits(0.25, 0, 'each'), null);

// fmtLb trims whole pounds, keeps one decimal otherwise.
assert.equal(fmtLb(10), '10 lb');
assert.equal(fmtLb(10.5), '10.5 lb');
assert.equal(fmtLb(6), '6 lb');

/* ── altNames stays empty when everyone agrees on the name ── */
{
  const rows = mergeCropDemand(
    [{ crop: 'Kale', qty: 10, unit: 'bunch' }],
    [{ crop: 'Kale', qty: 5, unit: 'bunch' }],
    [],
  );
  assert.deepEqual(rows[0].altNames, [], 'no altNames when all sources spell it the same');
}

console.log('pick-pack.test.ts — all assertions passed');
