/**
 * Pick & Pack — shared aggregation + display helpers for the printable
 * harvest pick lists at /admin/pick-pack/[week].
 *
 * The Pick & Pack generator answers ONE question for the pack day: "What do we
 * pick, and how much, across EVERY channel?" It folds three demand sources into
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
 *
 * Sum per crop = CSA box demand + market planned_qty (all that crop's
 * offerings) + wholesale order item qty.
 *
 * Pure + dependency-free (no DB, no framework). The page does the DB reads and
 * feeds rows in; this module owns the merge + ordering + i18n so it's unit-
 * testable and the two route files stay thin.
 */

/* ──────────────────────────────────────────────────────────────────
 * Channel demand inputs (the page builds these from its DB reads)
 * ────────────────────────────────────────────────────────────────── */

export type Channel = 'csa' | 'market' | 'wholesale';

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
 * Merge CSA + market + wholesale demand into one per-crop list, ordered:
 *   1. TENDER GREENS FIRST (then everything else),
 *   2. within each group, biggest total demand first,
 *   3. ties broken alphabetically.
 *
 * Crops are matched on `normCrop`. Each channel keeps its own unit; `totalQty`
 * is the simple sum (callers display per-channel cells when units differ).
 */
export function mergeCropDemand(
  csa: CropDemandInput[],
  market: CropDemandInput[],
  wholesale: CropDemandInput[],
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
        csa: null, market: null, wholesale: null,
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

  const rows = Array.from(map.values());
  for (const r of rows) {
    r.multiChannel = [r.csa, r.market, r.wholesale].filter(Boolean).length > 1;
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
  return [r.csa, r.market, r.wholesale].filter(Boolean).length;
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
  total: string;
  nothing: string;
  pickOnce: string;
  langToggle: string;
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
    total: 'Total',
    nothing: 'Nothing to harvest this week yet.',
    pickOnce: 'Harvest each crop once for everyone, then split it to the CSA / market / wholesale packs.',
    langToggle: 'Español',
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
    total: 'Total',
    nothing: 'Aún no hay nada que cosechar esta semana.',
    pickOnce: 'Coseche cada cultivo una vez para todos, luego divídalo entre los empaques de CSA / mercado / mayoreo.',
    langToggle: 'English',
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
