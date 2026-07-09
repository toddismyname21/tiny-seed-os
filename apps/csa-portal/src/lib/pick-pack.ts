/**
 * Pick & Pack — shared aggregation + display helpers for the printable
 * harvest pick lists at /admin/pick-pack/[week].
 *
 * The Pick & Pack generator answers ONE question for the pack day: "What do we
 * pick, and how much, across EVERY channel?" It folds four demand sources into
 * a single per-crop pick list, then breaks that demand down per-channel so the
 * crew gets:
 *
 *   1. an OVERALL harvest list (tender greens first) — pick everything once;
 *   2. a per-MARKET checklist (one per farmers-market) — what to bring;
 *   3. a CSA checklist — the box demand by crop;
 *   4. a WHOLESALE checklist — the restaurant order demand by crop;
 *   5. a Spanish (?lang=es) version of the OVERALL harvest list.
 *
 * Demand sources (all keyed to the same cycle Monday `week_starting`):
 *   • CSA box demand — STRICTLY from resolveCycle: sum each summer_veg member's
 *     resolved box composition (default plan + locked swaps + allergy subs) per
 *     crop. This is the single source of truth the rest of the ops app uses.
 *   • Market planned_qty — from market_offerings (the existing planned_qty
 *     column the market editor already writes), summed across that crop's
 *     offerings, and tagged per market for the per-market checklist.
 *   • Wholesale order qty — from wholesale_order_items on submitted
 *     wholesale_orders delivering inside the cycle week.
 *   • Flex à-la-carte qty — from flex_orders (status pending/locked/fulfilled)
 *     for the cycle week, item name/unit from flex_inventory, scoped to the
 *     member's harvest day exactly like CSA. Folds into the same per-crop rows
 *     (flex kale → the kale line) so the crew harvests the flex demand too —
 *     "so we have them" (Todd). A flex item that matches no existing crop line
 *     becomes its own line.
 *
 * Sum per crop = CSA box demand + market planned_qty (all that crop's
 * offerings) + wholesale order item qty + flex à-la-carte qty.
 *
 * Pure + dependency-free (no DB, no framework). The page does the DB reads and
 * feeds rows in; this module owns the merge + ordering + i18n so it's unit-
 * testable and the two route files stay thin.
 */

/* ──────────────────────────────────────────────────────────────────
 * Channel demand inputs (the page builds these from its DB reads)
 * ────────────────────────────────────────────────────────────────── */

export type Channel = 'csa' | 'market' | 'wholesale' | 'flex';

/** One unit of demand for a crop on a single channel. */
export interface CropDemandInput {
  /** Display crop name (the first-seen spelling wins for the merged row). */
  crop: string;
  /** Quantity demanded on this channel. */
  qty: number;
  /** Unit for THIS channel's qty (box bunches vs wholesale lbs can differ). */
  unit: string;
  /** Optional product_library category — drives tender-green ordering. */
  category?: string | null;
}

/** Per-channel qty + unit on a merged crop row (null = channel has no demand). */
export interface ChannelQty {
  qty: number;
  unit: string;
}

/** A crop merged across channels for the OVERALL harvest list. */
export interface MergedCropRow {
  /** Display crop name. */
  crop: string;
  /** Best category seen for this crop (for tender-green ordering). */
  category: string | null;
  csa: ChannelQty | null;
  market: ChannelQty | null;
  wholesale: ChannelQty | null;
  /** Flex à-la-carte demand (null = no flex order for this crop). */
  flex: ChannelQty | null;
  /** Sum of every channel's qty — the headline "pick this much" number when
   *  all channels share a unit; when units differ, the per-channel cells are
   *  authoritative (we never silently add bunches to pounds in the display). */
  totalQty: number;
  /** True when more than one channel demands this crop. */
  multiChannel: boolean;
  /** True when this crop is a tender green (sorted to the very top). */
  tender: boolean;
}

/* ──────────────────────────────────────────────────────────────────
 * Crop name normalization (matches the harvest page's normCrop)
 * ────────────────────────────────────────────────────────────────── */

/**
 * Normalize a crop name for cross-channel matching: lowercase, drop
 * parentheticals (units like "(per lb)"), strip punctuation, collapse spaces.
 * So "King Spring Mix (per lb)" (wholesale) folds into "King Spring Mix" (box).
 * Mirrors the existing harvest page exactly so the two pages agree.
 */
export function normCrop(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ──────────────────────────────────────────────────────────────────
 * Stable per-line KEY (for live check-off progress, migration 0069)
 * ────────────────────────────────────────────────────────────────── */

/**
 * A URL/DB-safe slug of a crop or harvest-crop name: the same normalization the
 * cross-channel demand merge uses (normCrop → lowercase, drop parentheticals +
 * punctuation, collapse spaces) with spaces turned into hyphens. Deterministic
 * and dependency-free.
 */
export function slugForKey(s: string): string {
  return normCrop(s).replace(/ /g, '-');
}

/**
 * Derive the STABLE line_key stored in pick_pack_progress for one rendered
 * Pick & Pack line. This key is written into the server-rendered
 * `data-line-key` attribute AND used verbatim by the browser + the save
 * endpoint, so it MUST be identical in all three places.
 *
 * WHY IT IS STABLE — and NEVER an array index:
 *   • It is derived only from the crop / harvest-crop NAME (+ unit for the
 *     per-crop pack lines), run through the SAME normCrop() the demand merge
 *     already dedupes on. So the same crop yields the same key on every reload,
 *     regardless of sort order, how many other crops there are, or which week it
 *     is (the week is a SEPARATE column — week_date — so next week's identical
 *     crop is a fresh row, not a collision).
 *   • kind namespaces the two row shapes so they can never collide:
 *       - 'group' → a combined-greens line (multiple package variants weighed as
 *          one), keyed by its library harvest_crop. No unit (it aggregates units).
 *       - 'row'   → an ordinary per-crop line, keyed by crop + unit. The unit is
 *          included because a pack view can list the same crop under two units
 *          (e.g. bunch vs lb) as two distinct lines.
 *   • Within a single rendered sheet the demand is already deduped per crop
 *     (overall) or per crop+unit (csa/wholesale/market), so no two rendered
 *     lines share a (kind, name-slug, unit-slug) triple — the key is unique per
 *     sheet, exactly what the (week, section, scope, market, line_key) UNIQUE
 *     upsert needs.
 */
export function pickPackLineKey(
  kind: 'group' | 'row',
  name: string,
  unit?: string | null,
): string {
  const base = slugForKey(name) || 'unnamed';
  if (kind === 'group') return `g:${base}`;
  const u = unit ? slugForKey(unit) : '';
  return u ? `c:${base}:${u}` : `c:${base}`;
}

/* ──────────────────────────────────────────────────────────────────
 * Tender-green classification (TENDER GREENS FIRST)
 * ────────────────────────────────────────────────────────────────── */

/**
 * product_library / wholesale categories that ARE tender greens — the most
 * perishable crops that must be picked first (into the cooler) so they don't
 * wilt waiting on slower roots/squash. Mirrors the wholesale catalog's
 * green-family categories.
 */
const TENDER_CATEGORIES = new Set<string>([
  'salad mixes',
  'salad greens',
  'head lettuce & chicories',
  'bunching greens',
  'greens',
  'lettuce',
  'cooking greens',
]);

/**
 * Name keywords that mark a crop as a tender green when its category is
 * missing/unknown (CSA box crops are plain strings with no category). Kept
 * conservative — only unambiguous tender greens.
 */
const TENDER_KEYWORDS = [
  'lettuce', 'salad', 'mix', 'green', 'spinach', 'arugula', 'kale', 'chard',
  'mustard', 'mizuna', 'bok choy', 'pak choi', 'tatsoi', 'cress', 'mesclun',
  'collard', 'romaine', 'spring mix', 'braising', 'microgreen',
];

/** Is this crop a tender green (by category first, then name keywords)? */
export function isTenderGreen(crop: string, category?: string | null): boolean {
  const cat = (category ?? '').trim().toLowerCase();
  if (cat && TENDER_CATEGORIES.has(cat)) return true;
  const name = crop.toLowerCase();
  return TENDER_KEYWORDS.some((kw) => name.includes(kw));
}

/* ──────────────────────────────────────────────────────────────────
 * The merge — fold per-channel demand into ONE ordered pick list
 * ────────────────────────────────────────────────────────────────── */

/**
 * Merge CSA + market + wholesale + flex demand into one per-crop list, ordered:
 *   1. TENDER GREENS FIRST (then everything else),
 *   2. within each group, biggest total demand first,
 *   3. ties broken alphabetically.
 *
 * Crops are matched on `normCrop`. Each channel keeps its own unit; `totalQty`
 * is the simple sum (callers display per-channel cells when units differ).
 *
 * `flex` defaults to [] so pre-flex callers (and the page's single-crop
 * tender probe) keep working with three positional args.
 */
export function mergeCropDemand(
  csa: CropDemandInput[],
  market: CropDemandInput[],
  wholesale: CropDemandInput[],
  flex: CropDemandInput[] = [],
): MergedCropRow[] {
  const map = new Map<string, MergedCropRow>();

  function bump(chan: Channel, d: CropDemandInput): void {
    const key = normCrop(d.crop);
    if (!key || !(d.qty > 0)) return;
    let row = map.get(key);
    if (!row) {
      row = {
        crop: d.crop,
        category: d.category ?? null,
        csa: null, market: null, wholesale: null, flex: null,
        totalQty: 0, multiChannel: false, tender: false,
      };
      map.set(key, row);
    }
    if (!row.category && d.category) row.category = d.category;
    const cur = row[chan];
    if (cur) cur.qty += d.qty;
    else row[chan] = { qty: d.qty, unit: d.unit };
    row.totalQty += d.qty;
  }

  for (const d of csa) bump('csa', d);
  for (const d of market) bump('market', d);
  for (const d of wholesale) bump('wholesale', d);
  for (const d of flex) bump('flex', d);

  const rows = Array.from(map.values());
  for (const r of rows) {
    r.multiChannel = [r.csa, r.market, r.wholesale, r.flex].filter(Boolean).length > 1;
    r.tender = isTenderGreen(r.crop, r.category);
  }

  rows.sort((a, b) => {
    // Tender greens first.
    if (a.tender !== b.tender) return a.tender ? -1 : 1;
    // Then biggest demand.
    if (b.totalQty !== a.totalQty) return b.totalQty - a.totalQty;
    // Then alphabetical.
    return a.crop.localeCompare(b.crop);
  });
  return rows;
}

/** Count of channels with demand on a merged row. */
export function channelCount(r: MergedCropRow): number {
  return [r.csa, r.market, r.wholesale, r.flex].filter(Boolean).length;
}

/* ──────────────────────────────────────────────────────────────────
 * PACK-HOUSE DESTINATION MATRIX — destination-preserving grouping.
 *
 * The overall merge (mergeCropDemand) FLATTENS every channel into ONE per-crop
 * row: it answers "how much of this crop do we pick in total?" The pack-house
 * view needs the OPPOSITE decomposition — keep each PHYSICAL destination (CSA,
 * each market by name, each wholesale account by restaurant, Flex) as its own
 * column so a crew member holding 30 bunches of kale can read across the row
 * and split it to its final homes as it comes off the field.
 *
 * The per-destination granularity ALREADY EXISTS upstream (market_offerings are
 * per market; wholesale_order_items join to an account; CSA + Flex are single
 * destinations) — the overall merge just discards it. buildDestinationMatrix
 * re-expresses that SAME demand as a crop × destination matrix, keyed on the
 * SAME normCrop() the merge dedupes on. Because a matrix row is looked up by
 * normCrop against the caller's already-computed `merged` rows, EACH ROW REUSES
 * the merged row's `totalQty` verbatim — no separate math. And when the caller
 * feeds the SAME scoped demand into both the merge and this matrix, the row's
 * destination cells SUM to that same total by construction (CSA + Σmarkets +
 * Σwholesale-accounts + Flex). So the two sheets can never disagree.
 * ────────────────────────────────────────────────────────────────── */

/** The physical destination a unit of demand is packed to. */
export type DestKind = 'csa' | 'market' | 'wholesale' | 'flex';

/** One unit of demand tagged with the destination column it belongs to. */
export interface DestDemandInput {
  /** Crop/product name (matched to a merged row via normCrop). */
  crop: string;
  /** Quantity headed to this destination. */
  qty: number;
  /** Unit for THIS destination's qty (a market's bunch vs wholesale lb differ). */
  unit: string;
  /** Which family of destination this column is. */
  kind: DestKind;
  /** Stable column id — 'csa' / market id / wholesale account id / 'flex'.
   *  Two demand rows sharing a destKey merge into ONE cell (e.g. a restaurant
   *  with two orders this week, or a market with two offerings of a crop). */
  destKey: string;
  /** Column header text (market name / restaurant name; 'CSA' / 'Flex'). */
  destLabel: string;
  /** CSA-only: how this qty splits across small vs large boxes, so the pack
   *  crew can pack sizes correctly. Summed into the destination cell alongside
   *  `qty`. Omit for market / wholesale / flex demand (no size dimension). */
  sizeSplit?: { small: number; large: number };
}

/** One filled cell of the matrix — qty going to a destination for a crop.
 *  `sizeSplit` is present ONLY on CSA cells that carried a small/large box
 *  breakdown (the pack crew packs box sizes differently); small + large sum to
 *  `qty` for CSA box demand. Other kinds (market/wholesale/flex) never set it. */
export interface MatrixCell { qty: number; unit: string; sizeSplit?: { small: number; large: number }; }
/** A destination column of the matrix. */
export interface MatrixColumn { key: string; label: string; kind: DestKind; }
/** One crop row of the matrix (aligned 1:1 with a merged harvest row). */
export interface MatrixRow {
  /** Display crop name (the merged row's spelling). */
  crop: string;
  category: string | null;
  /** True when this crop is a tender green (rows stay tender-first). */
  tender: boolean;
  /** Row total — REUSED verbatim from the merged row (same merge, no re-add). */
  totalQty: number;
  /** The unit carrying the most demand on the row — shown once at row level;
   *  a cell prints its own unit only when it differs from this. '' when empty. */
  dominantUnit: string;
  /** True when the row's cells don't all share `dominantUnit` (mixed units, so
   *  `totalQty` is a bare count the caller should flag rather than unit-label). */
  mixedUnits: boolean;
  /** destKey → cell, only for the destinations that actually take this crop. */
  cells: Map<string, MatrixCell>;
}
/** The assembled crop × destination matrix. */
export interface DestinationMatrix {
  columns: MatrixColumn[];
  rows: MatrixRow[];
}

/** Column ordering: CSA, then markets, then wholesale accounts, then Flex. */
const DEST_KIND_ORDER: Record<DestKind, number> = {
  csa: 0, market: 1, wholesale: 2, flex: 3,
};

/**
 * Build the crop × destination matrix.
 *
 * `merged` supplies the ROW SET, ROW ORDER (tender-first, as mergeCropDemand
 * already sorted it) and the authoritative per-row `totalQty`. `dests` supplies
 * the per-destination cells. A matrix row is emitted for EVERY merged row, in
 * merged order; its cells are whatever `dests` contributed under the same
 * normCrop key (empty when a destination doesn't take that crop).
 *
 * Only destinations that received ANY demand become columns (no empty columns).
 * Within a destination kind, columns keep the FIRST-SEEN order of `dests`, so
 * the caller controls intra-kind ordering (e.g. markets by day, restaurants by
 * name) simply by ordering the array it passes.
 *
 * Pure + dependency-free — reuses only normCrop, so it can never drift from the
 * merge's crop identity.
 */
export function buildDestinationMatrix(
  merged: MergedCropRow[],
  dests: DestDemandInput[],
): DestinationMatrix {
  // 1. Accumulate cells per normCrop → destKey; remember each column's metadata
  //    and first-seen order so intra-kind ordering is the caller's to control.
  const cellsByCrop = new Map<string, Map<string, MatrixCell>>();
  const colMeta = new Map<string, { label: string; kind: DestKind; seen: number }>();
  let seq = 0;
  for (const d of dests) {
    const cropKey = normCrop(d.crop);
    if (!cropKey || !d.destKey || !(d.qty > 0)) continue;
    if (!colMeta.has(d.destKey)) {
      colMeta.set(d.destKey, { label: d.destLabel, kind: d.kind, seen: seq++ });
    }
    let byDest = cellsByCrop.get(cropKey);
    if (!byDest) { byDest = new Map(); cellsByCrop.set(cropKey, byDest); }
    const cell = byDest.get(d.destKey);
    // Same destKey twice (two orders for a restaurant, two market offerings of a
    // crop) SUMS into one cell — so Σcells still equals the channel's merge qty.
    // A CSA sizeSplit accumulates alongside qty (small + large track the same
    // sum), so a crop split across units still yields one S/L breakdown.
    if (cell) {
      cell.qty += d.qty;
      if (d.sizeSplit) {
        if (!cell.sizeSplit) cell.sizeSplit = { small: 0, large: 0 };
        cell.sizeSplit.small += d.sizeSplit.small;
        cell.sizeSplit.large += d.sizeSplit.large;
      }
    } else {
      const nc: MatrixCell = { qty: d.qty, unit: d.unit };
      if (d.sizeSplit) nc.sizeSplit = { small: d.sizeSplit.small, large: d.sizeSplit.large };
      byDest.set(d.destKey, nc);
    }
  }

  // 2. Order columns: by kind (CSA → markets → wholesale → Flex), then the
  //    first-seen order within each kind.
  const columns: MatrixColumn[] = Array.from(colMeta.entries())
    .sort((a, b) => {
      const ka = DEST_KIND_ORDER[a[1].kind];
      const kb = DEST_KIND_ORDER[b[1].kind];
      if (ka !== kb) return ka - kb;
      return a[1].seen - b[1].seen;
    })
    .map(([key, m]) => ({ key, label: m.label, kind: m.kind }));

  // 3. One matrix row per merged row, IN MERGED ORDER, total reused verbatim.
  const rows: MatrixRow[] = merged.map((mr) => {
    const cells = cellsByCrop.get(normCrop(mr.crop)) ?? new Map<string, MatrixCell>();
    // Dominant unit = the unit carrying the most qty across this row's cells.
    const byUnit = new Map<string, number>();
    for (const c of cells.values()) byUnit.set(c.unit, (byUnit.get(c.unit) ?? 0) + c.qty);
    let dominantUnit = '';
    let best = -1;
    for (const [u, q] of byUnit) if (q > best) { best = q; dominantUnit = u; }
    const mixedUnits = byUnit.size > 1;
    return {
      crop: mr.crop, category: mr.category, tender: mr.tender,
      totalQty: mr.totalQty, dominantUnit, mixedUnits, cells,
    };
  });

  return { columns, rows };
}

/* ──────────────────────────────────────────────────────────────────
 * Spanish (?lang=es) — overall harvest list translation
 * ────────────────────────────────────────────────────────────────── */

export type Lang = 'en' | 'es';

/** Parse a ?lang= param into a supported language (defaults to English). */
export function parseLang(raw: string | null | undefined): Lang {
  return raw === 'es' ? 'es' : 'en';
}

/** Static UI strings for the printable harvest pages, EN + ES. */
export const PICK_PACK_STRINGS: Record<Lang, {
  overallTitle: string;
  overallSubtitle: string;
  tenderGroup: string;
  otherGroup: string;
  crop: string;
  qty: string;
  unit: string;
  csaCol: string;
  marketCol: string;
  wholesaleCol: string;
  flexCol: string;
  total: string;
  nothing: string;
  pickOnce: string;
  langToggle: string;
  /* ── Pack House distribution matrix (crop × destination) ── */
  packhouseTab: string;      // view-switcher label
  packhouseTitle: string;    // doc heading
  packhouseSubtitle: string; // doc sub-line
  packhouseHint: string;     // footnote under the matrix
  notesCol: string;          // blank pen column header (wash / attention notes)
  cropCol: string;           // first column header
  checkCol: string;          // header over the per-row print tick box
  partWord: string;          // "Part" — split-section caption (wide sheets)
  ofWord: string;            // "of"   — "Part 1 of 2"
  destsWord: string;         // "destinations" — "…destinations 1–6"
  /* ── Live check-off (migration 0069) — button + status + summary labels. ──
   * Consumed by the browser controller on /admin/pick-pack/[week], which builds
   * the interactive Harvesting/Done + Packed controls client-side. */
  live: {
    progress: string;        // summary heading
    toGo: string;            // count label: not started
    harvesting: string;      // count label + PICK button + status
    done: string;            // count label + PICK button + status
    packed: string;          // count label + PACK button + status
    markPacked: string;      // PACK button
    undo: string;            // reset a set line back to todo
    actualQ: string;         // "How many did you actually get?" prompt label
    save: string;            // confirm actual qty
    cancel: string;          // dismiss the qty prompt
    by: string;              // "· by " connector before the worker name
    saveFailed: string;      // inline error after a failed POST
    retry: string;           // retry a failed POST
  };
}> = {
  en: {
    overallTitle: 'Overall harvest — pick everything once',
    overallSubtitle: 'Tender greens first. Tick each crop as it comes in.',
    tenderGroup: 'Tender greens — pick & cool FIRST',
    otherGroup: 'Everything else',
    crop: 'Crop',
    qty: 'Total qty',
    unit: 'Unit',
    csaCol: 'CSA',
    marketCol: 'Market',
    wholesaleCol: 'Wholesale',
    flexCol: 'Flex',
    total: 'Total',
    nothing: 'Nothing to harvest this week yet.',
    pickOnce: 'Harvest each crop once for everyone, then split it to the CSA / market / wholesale packs.',
    langToggle: 'Español',
    packhouseTab: 'Pack House (by item)',
    packhouseTitle: 'Pack House — where each crop goes',
    packhouseSubtitle: 'As each crop comes off the field, split the row across its destinations. Row total = pick it all once (matches the harvest sheet).',
    packhouseHint: 'Each row totals to the same number as the overall harvest sheet. Cells show where that crop is headed; use the Wash / notes box for anything that needs attention before it leaves.',
    notesCol: 'Wash / notes',
    cropCol: 'Crop',
    checkCol: 'Done',
    partWord: 'Part',
    ofWord: 'of',
    destsWord: 'destinations',
    live: {
      progress: 'Progress',
      toGo: 'to go',
      harvesting: 'Harvesting',
      done: 'Done',
      packed: 'Packed',
      markPacked: 'Packed',
      undo: 'Undo',
      actualQ: 'How many did you actually get?',
      save: 'Save',
      cancel: 'Cancel',
      by: 'by',
      saveFailed: "Couldn't save — tap to retry",
      retry: 'Retry',
    },
  },
  es: {
    overallTitle: 'Cosecha total — cosechar todo una vez',
    overallSubtitle: 'Verduras tiernas primero. Marque cada cultivo al cosecharlo.',
    tenderGroup: 'Verduras tiernas — cosechar y enfriar PRIMERO',
    otherGroup: 'Todo lo demás',
    crop: 'Cultivo',
    qty: 'Cantidad total',
    unit: 'Unidad',
    csaCol: 'CSA',
    marketCol: 'Mercado',
    wholesaleCol: 'Mayoreo',
    flexCol: 'Flex',
    total: 'Total',
    nothing: 'Aún no hay nada que cosechar esta semana.',
    pickOnce: 'Coseche cada cultivo una vez para todos, luego divídalo entre los empaques de CSA / mercado / mayoreo.',
    langToggle: 'English',
    packhouseTab: 'Casa de empaque (por artículo)',
    packhouseTitle: 'Casa de empaque — a dónde va cada cultivo',
    packhouseSubtitle: 'Al salir cada cultivo del campo, divida la fila entre sus destinos. El total de la fila = cosecharlo todo una vez (coincide con la hoja de cosecha).',
    packhouseHint: 'Cada fila suma el mismo número que la hoja de cosecha total. Las celdas muestran a dónde va ese cultivo; use la casilla Lavar / notas para lo que necesite atención antes de salir.',
    notesCol: 'Lavar / notas',
    cropCol: 'Cultivo',
    checkCol: 'Listo',
    partWord: 'Parte',
    ofWord: 'de',
    destsWord: 'destinos',
    live: {
      progress: 'Progreso',
      toGo: 'por hacer',
      harvesting: 'Cosechando',
      done: 'Listo',
      packed: 'Empacado',
      markPacked: 'Empacado',
      undo: 'Deshacer',
      actualQ: '¿Cuánto cosechó en realidad?',
      save: 'Guardar',
      cancel: 'Cancelar',
      by: 'por',
      saveFailed: 'No se guardó — toque para reintentar',
      retry: 'Reintentar',
    },
  },
};
