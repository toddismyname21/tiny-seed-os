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
  /** Display crop name. When `canonical` is set this is the product_library
   *  name; otherwise it's the outlet's spelling (first-seen wins, unless a later
   *  canonical name upgrades the merged row's display — see mergeCropDemand). */
  crop: string;
  /** Quantity demanded on this channel. */
  qty: number;
  /** Unit for THIS channel's qty (box bunches vs wholesale lbs can differ). */
  unit: string;
  /** Optional product_library category — drives tender-green ordering. */
  category?: string | null;
  /** True when `crop` is the canonical product_library name (a library-LINKED
   *  demand line). A canonical name wins as the merged row's display over a
   *  non-canonical name, so one real crop renders under one canonical label. */
  canonical?: boolean;
  /** The outlet's OWN spelling for this line (e.g. Harvie "Wild Dandelion
   *  Greens"), surfaced as small "also called" print on the merged row when it
   *  differs from the canonical display — so crew can match a crate labeled by
   *  the vendor. Omit when it's the same as `crop`. */
  sourceName?: string;
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
  /** Distinct outlet spellings that differ from `crop` (the canonical display),
   *  A→Z. Rendered as small "also: …" print so crew match a crate the vendor
   *  labeled differently. Empty when every source used the same name. */
  altNames: string[];
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
 * CANONICAL ITEM IDENTITY — vendor-alias normalization
 *
 * The root problem (owner, 2026-07-13): "we have items that are the same thing,
 * called different things to different outlets." Harvie sells "Wild Dandelion
 * Greens" / "Local Organic Radicchio"; our library + market call them "Dandelion
 * Greens" / "Radicchio". normCrop alone keeps them apart, so one real crop shows
 * up as 2–3 rows on the pick sheet.
 *
 * The PRIMARY fix lives on the page: when a demand line is LINKED to a
 * product_library product (wholesale_products.library_id, market_offerings.
 * library_id, flex_inventory.library_id), the page passes the library's
 * canonical `name` as the crop identity. That collapses arbitrary vendor
 * renames ("Baby Kale Mix" → "King Spring Mix") that share nothing textually.
 *
 * aliasNormalize is the SECONDARY, text-only fallback for UNLINKED lines (a
 * manual wholesale item, a market offering with no library row, a CSA box-plan
 * crop): it strips the handful of leading vendor adjectives outlets bolt onto
 * the same crop, so "Local Organic Radicchio" and "Wild Dandelion Greens" still
 * fold into "Radicchio" / "Dandelion Greens" by text alone.
 *
 * The stripped list is intentionally SHORT and CONSERVATIVE — only adjectives
 * that are provably the-same-crop marketing prefixes. We do NOT strip words that
 * can change the crop's identity (e.g. "Baby" → baby kale IS a distinct product;
 * "Red"/"Green" distinguish real varieties). Add here only after confirming the
 * word never distinguishes two real crops in the catalog.
 * ────────────────────────────────────────────────────────────────── */

/** Leading vendor "grade/marketing" adjectives that never change WHICH crop a
 *  line is. Order matters only in that longer phrases are tried first below. */
const VENDOR_PREFIXES: readonly string[] = [
  'certified organic',
  'local',
  'organic',
  'wild',
  'fresh',
];

/**
 * Text-only canonical key for an UNLINKED crop name: normCrop, then repeatedly
 * peel leading vendor prefixes ("Local Organic Radicchio" → "radicchio"). Idem-
 * potent and dependency-free. Never strips a name down to nothing (a name that
 * IS just a prefix, e.g. "Fresh", is returned normalized, unpeeled).
 */
export function aliasNormalize(s: string): string {
  let n = normCrop(s);
  let peeled = true;
  while (peeled) {
    peeled = false;
    for (const p of VENDOR_PREFIXES) {
      if (n.length > p.length + 1 && n.startsWith(p + ' ')) {
        n = n.slice(p.length + 1).trim();
        peeled = true;
        break;
      }
    }
  }
  return n;
}

/* ──────────────────────────────────────────────────────────────────
 * CANONICAL CROP GROUPS — collapse vendor name-variants of the SAME crop
 * into ONE pick row (owner directive 2026-07-20).
 *
 * aliasNormalize peels LEADING marketing prefixes ("Organic Fennel" → "fennel")
 * but it cannot fix two other ways an outlet forks one real crop into many pick
 * rows:
 *   1. a TRAILING pack/portion descriptor — "Organic Fennel Bulb" → "fennel
 *      bulb", "Fresh Dill Bunch" → "dill bunch", "Organic Kohlrabi Duo" →
 *      "kohlrabi duo" — which normCrop keeps, so the bunch/bulb/duo line never
 *      merges with the bare crop; and
 *   2. a totally DIFFERENT vendor name for the same crop — Market Wagon lists
 *      "Zephyr", "Zucchini", "Costata Romanesco", "Patty Pan Squash" that all
 *      ARE summer squash but share no text with "Summer Squash".
 *
 * CANONICAL_ALIASES is an EXPLICIT, owner-confirmed map (applied AFTER
 * aliasNormalize, so keys are prefix-stripped) that folds each such variant onto
 * one canonical key. It is deliberately a hand-curated list — NOT a generic
 * "strip trailing words" rule — precisely so genuinely-distinct varieties never
 * merge by accident: "Red Romaine" stays its own row (only "Romaine …" folds to
 * "romaine"); cabbage TYPES stay separate (only pure Green-Cabbage name-variants
 * collapse; Conical/Pointed and Napa keep their own keys). Add an entry ONLY
 * after confirming the alias is provably the SAME crop as its target.
 *
 * The PREFERRED durable fix for a linked outlet line is still a product_library
 * mapping (the page passes the library NAME as the crop identity); this map is
 * the text-only fallback for the variants a library mapping can't practically
 * reach — chiefly the squash grouping.
 * ────────────────────────────────────────────────────────────────── */

/** aliasNormalize-space (lowercase, no punctuation/parentheticals) alias →
 *  canonical key. Every value is itself a terminal canonical key. */
const CANONICAL_ALIASES: Readonly<Record<string, string>> = {
  // SUMMER SQUASH — collapse ALL variants into one row.
  'summer squash mix': 'summer squash',
  'summer squash medley': 'summer squash',
  'costata romanesco': 'summer squash',
  'patty pan squash': 'summer squash',
  'patty pan': 'summer squash',
  'pattypan squash': 'summer squash',
  'pattypan': 'summer squash',
  'zephyr': 'summer squash',
  'zephyr squash': 'summer squash',
  'zucchini': 'summer squash',
  'zucchini squash': 'summer squash',
  'green zucchini': 'summer squash',
  'gold zucchini': 'summer squash',
  'golden zucchini': 'summer squash',
  'yellow squash': 'summer squash',
  // CABBAGE — keep TYPES separate; collapse only pure same-type name-variants.
  'cabbage': 'green cabbage',
  'cabbages': 'green cabbage',
  'green cabbages': 'green cabbage',
  'green cabbage head': 'green cabbage',
  'green cabbage heads': 'green cabbage',
  'pointed cabbage': 'conical cabbage', // conical = pointed (same type)
  'napa': 'napa cabbage',
  // CUCUMBERS.
  'cucumber': 'cucumbers',
  'slicing cucumber': 'cucumbers',
  'slicing cucumbers': 'cucumbers',
  // BROCCOLINI.
  'broccolini bunch': 'broccolini',
  // BEETS.
  'beet': 'beets',
  'beet w tops': 'beets',
  'beets w tops': 'beets',
  'beet with tops': 'beets',
  'beets with tops': 'beets',
  // FENNEL.
  'fennel bulb': 'fennel',
  // KOHLRABI.
  'kohlrabi duo': 'kohlrabi',
  // DILL.
  'dill bunch': 'dill',
  // ROMAINE (NOT "red romaine" — that is a distinct variety and stays its row).
  'romaine lettuce': 'romaine',
  'romaine head': 'romaine',
  'romaine lettuce head': 'romaine',
  // LITTLE GEM (some vendor spellings carry an embedded "lettuce" word).
  'little gems': 'little gem',
  'little gem duo': 'little gem',
  'little gem lettuce': 'little gem',
  'little gem lettuce duo': 'little gem',
};

/** Canonical key → the DISPLAY label the merged row should carry, for the groups
 *  where the label matters and the natural first-seen / library-linked spelling
 *  wouldn't be the crop the crew knows (a squash row must read "Summer Squash",
 *  not "Zucchini"; a folded cabbage row must read "Green Cabbage", not "Cabbage").
 *  Applied LAST in mergeCropDemand, so it wins over first-seen/library display. */
const CANONICAL_DISPLAY: Readonly<Record<string, string>> = {
  'summer squash': 'Summer Squash',
  'green cabbage': 'Green Cabbage',
  'conical cabbage': 'Conical Cabbage',
  'napa cabbage': 'Napa Cabbage',
};

/**
 * The canonical identity for a crop name: aliasNormalize (normCrop + leading
 * vendor-prefix stripping), then the explicit CANONICAL_ALIASES fold. Idempotent
 * (a canonical key maps to itself) and dependency-free.
 */
export function cropCanonicalKey(s: string): string {
  const a = aliasNormalize(s);
  return CANONICAL_ALIASES[a] ?? a;
}

/**
 * The forced DISPLAY label for a crop whose canonical group defines one, else
 * null (use the natural first-seen / library-linked spelling). Lets a caller
 * label a folded group row with the crop the crew knows.
 */
export function canonicalDisplayName(s: string): string | null {
  return CANONICAL_DISPLAY[cropCanonicalKey(s)] ?? null;
}

/**
 * The MERGE KEY every Pick & Pack aggregation dedupes on. It is cropCanonicalKey
 * — aliasNormalize (normCrop + vendor-prefix stripping) plus the explicit
 * same-crop alias fold — so that:
 *   • library-canonical names (passed in by the page for linked lines) already
 *     agree,
 *   • unlinked outlet spellings that differ only by a marketing prefix still
 *     collapse to one row, and
 *   • owner-confirmed vendor name-variants (summer-squash medley, "Fennel Bulb",
 *     etc.) fold onto one canonical crop row.
 * This is the SINGLE identity function shared by mergeCropDemand,
 * buildDestinationMatrix and the line-key slug, so they can never drift.
 */
export function cropMergeKey(s: string): string {
  return cropCanonicalKey(s);
}

/* ──────────────────────────────────────────────────────────────────
 * Stable per-line KEY (for live check-off progress, migration 0069)
 * ────────────────────────────────────────────────────────────────── */

/**
 * A URL/DB-safe slug of a crop or harvest-crop name: the SAME canonical identity
 * the cross-channel demand merge dedupes on (cropMergeKey → normCrop + vendor-
 * prefix stripping) with spaces turned into hyphens. Deterministic and
 * dependency-free.
 *
 * STABILITY NOTE (canonicalization, 2026-07-13): the switch from normCrop to
 * cropMergeKey changes the slug for any crop whose merged spelling changed — an
 * unlinked "Local Radicchio" now slugs to "radicchio", and a library-linked line
 * now slugs from its canonical library name. Live check-off progress rows
 * (pick_pack_progress) keyed on an OLD slug for the CURRENT week will orphan
 * (harmless: they simply stop matching a rendered line; next tap writes a fresh
 * row). This is the accepted one-time cost of merging same-thing rows.
 */
export function slugForKey(s: string): string {
  return cropMergeKey(s).replace(/ /g, '-');
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
 * CREW SECTIONS — group the pack sheet by product family
 *
 * Owner (2026-07-13): the Pack-House by-item sheet and the overall "everything
 * else" block should be GROUPED by product_library.category into a handful of
 * crew-sensible sections, in a sensible pick/pack order, items A→Z within.
 *
 * The live product_library.category vocabulary is the 14-value wholesale catalog
 * list (src/lib/wholesale-categories.ts: Salad Mixes, Salad Greens, Head Lettuce
 * & Chicories, Bunching Greens, Herbs, Tomatoes, Peppers, Roots, Brassicas,
 * Alliums, Squash & Fruiting, Mushrooms, Edible Flowers, Specialty). We collapse
 * those into 8 crew sections — merging the three salad/lettuce buckets into one
 * "Salad Greens", folding Brassicas' cooking greens in with Bunching Greens,
 * rolling Tomatoes + Peppers + Squash & Fruiting into "Fruiting & Vegetables",
 * and sending Mushrooms + Specialty (and anything unknown) to "Other":
 *
 *   product_library.category            → crew section
 *   ───────────────────────────────────────────────────────────────
 *   Salad Mixes / Salad Greens /        → Salad Greens
 *     Head Lettuce & Chicories
 *   Bunching Greens / Brassicas         → Bunching Greens
 *   Alliums                             → Alliums
 *   Roots                               → Roots
 *   Tomatoes / Peppers /                → Fruiting & Vegetables
 *     Squash & Fruiting
 *   Herbs                               → Herbs
 *   Edible Flowers                      → Flowers
 *   Mushrooms / Specialty / unknown     → Other
 *
 * CSA box-plan crops arrive with NO category (plain strings). For those we fall
 * back to a name-keyword classifier so a bare "Kale" still lands in Bunching
 * Greens, "Carrots" in Roots, etc. Category always wins over the name guess.
 * ────────────────────────────────────────────────────────────────── */

/** The crew section labels, in pick/pack order (perishable-ish first, then
 *  storage crops, then herbs/flowers, then the catch-all). */
export const CREW_SECTIONS = [
  'Salad Greens',
  'Bunching Greens',
  'Alliums',
  'Roots',
  'Fruiting & Vegetables',
  'Herbs',
  'Flowers',
  'Other',
] as const;
export type CrewSection = (typeof CREW_SECTIONS)[number];

/** product_library.category (lowercased) → crew section. Covers the live
 *  wholesale vocabulary plus a few legacy/alias spellings seen in the data. */
const CATEGORY_TO_SECTION: Record<string, CrewSection> = {
  'salad mixes': 'Salad Greens',
  'salad mix': 'Salad Greens',
  'salad greens': 'Salad Greens',
  'head lettuce & chicories': 'Salad Greens',
  'head lettuce': 'Salad Greens',
  'lettuce': 'Salad Greens',
  'greens': 'Salad Greens',
  'bunching greens': 'Bunching Greens',
  'cooking greens': 'Bunching Greens',
  'brassicas': 'Bunching Greens',
  'alliums': 'Alliums',
  'roots': 'Roots',
  'tomatoes': 'Fruiting & Vegetables',
  'peppers': 'Fruiting & Vegetables',
  'squash & fruiting': 'Fruiting & Vegetables',
  'vegetables': 'Fruiting & Vegetables',
  'herbs': 'Herbs',
  'edible flowers': 'Flowers',
  'flowers': 'Flowers',
  'mushrooms': 'Other',
  'specialty': 'Other',
};

/** Name-keyword fallback for crops with NO category (CSA box-plan strings).
 *  First match wins, tried in CREW_SECTIONS order so the more specific families
 *  (roots, alliums) are reached before the broad greens catch. */
const SECTION_NAME_KEYWORDS: ReadonlyArray<readonly [CrewSection, readonly string[]]> = [
  ['Alliums', ['onion', 'scallion', 'garlic', 'leek', 'shallot', 'chive']],
  ['Roots', ['carrot', 'beet', 'radish', 'turnip', 'potato', 'kohlrabi', 'rutabaga', 'parsnip', 'fennel', 'celeriac', 'ginger', 'sweet potato']],
  ['Herbs', ['basil', 'cilantro', 'dill', 'parsley', 'mint', 'thyme', 'oregano', 'sage', 'tarragon', 'rosemary', 'herb']],
  ['Flowers', ['flower', 'bouquet', 'dahlia', 'zinnia', 'sunflower', 'celosia', 'snapdragon']],
  ['Fruiting & Vegetables', ['tomato', 'pepper', 'eggplant', 'cucumber', 'cuke', 'squash', 'zucchini', 'bean', 'pea', 'melon', 'corn', 'tomatillo', 'okra']],
  ['Bunching Greens', ['kale', 'chard', 'collard', 'mustard', 'braising', 'bok choy', 'pak choi', 'tatsoi', 'broccoli', 'cabbage', 'rapini']],
  ['Salad Greens', ['lettuce', 'salad', 'mesclun', 'mix', 'arugula', 'spinach', 'mizuna', 'cress', 'radicchio', 'escarole', 'endive', 'green']],
];

/**
 * The crew section a crop belongs to. `category` (product_library.category) wins
 * when present + recognized; otherwise fall back to a name-keyword guess; else
 * "Other". Pure + deterministic.
 */
export function crewSection(category?: string | null, cropName?: string | null): CrewSection {
  const cat = (category ?? '').trim().toLowerCase();
  if (cat && CATEGORY_TO_SECTION[cat]) return CATEGORY_TO_SECTION[cat];
  const name = (cropName ?? '').toLowerCase();
  if (name) {
    for (const [section, keywords] of SECTION_NAME_KEYWORDS) {
      if (keywords.some((kw) => name.includes(kw))) return section;
    }
  }
  return 'Other';
}

/** Sort rank of a crew section (its index in CREW_SECTIONS). */
export function crewSectionRank(s: CrewSection): number {
  return CREW_SECTIONS.indexOf(s);
}

/** One rendered crew section: its label + the items in it (already A→Z). */
export interface CrewSectionGroup<T> { section: CrewSection; items: T[]; }

/**
 * Bucket a flat item list into ordered crew sections. Sections appear in
 * CREW_SECTIONS order (empty ones dropped); items within a section are sorted
 * A→Z by `sortName(item)` (case-insensitive). `getCategory`/`getCropName` feed
 * crewSection(); pure, input never mutated.
 */
export function groupBySection<T>(
  items: readonly T[],
  getCategory: (item: T) => string | null | undefined,
  getCropName: (item: T) => string,
  sortName?: (item: T) => string,
): CrewSectionGroup<T>[] {
  const buckets = new Map<CrewSection, T[]>();
  for (const item of items) {
    const section = crewSection(getCategory(item), getCropName(item));
    const b = buckets.get(section);
    if (b) b.push(item);
    else buckets.set(section, [item]);
  }
  const name = sortName ?? getCropName;
  const out: CrewSectionGroup<T>[] = [];
  for (const section of CREW_SECTIONS) {
    const b = buckets.get(section);
    if (!b || b.length === 0) continue;
    b.sort((a, c) => name(a).localeCompare(name(c), undefined, { sensitivity: 'base' }));
    out.push({ section, items: b });
  }
  return out;
}

/* ──────────────────────────────────────────────────────────────────
 * PORTIONED PRODUCTS → TOTAL HARVEST POUNDS
 *
 * Clamshell salad mixes + "Big Bagz" are HARVESTED BY WEIGHT but packed by the
 * count. When a product carries a product_library.pack_weight_lb (0.25 for a
 * ¼-lb clamshell, 0.75 for a Big Bag), the pick sheet shows the crew the total
 * pounds to cut = packed-unit count × pack_weight_lb, beside the count.
 *
 * These are the PURE arithmetic pieces (pack weight passed in, no DB) so both
 * route files + the tests share one implementation. The page wraps packLbForUnits
 * with its own libLookup() to supply the pack weight per crop.
 * ────────────────────────────────────────────────────────────────── */

/** Units that ARE already a weight — their qty is pounds already, so a
 *  pack-weight multiply would double-count. */
const WEIGHT_UNIT_RE = /^(lb|lbs|pound|pounds|#)$/i;

/** True when `unit` is a weight unit (lb / pound / #) — qty already in pounds. */
export function isWeightUnit(unit: string | null | undefined): boolean {
  return WEIGHT_UNIT_RE.test((unit ?? '').trim());
}

/**
 * Total pounds for `qty` packed units at `packWeightLb` lb each, on unit `unit`,
 * or null when there's nothing to show — no pack weight, a weight-based unit
 * (already pounds → never multiply), or a non-positive qty. Rounded to 0.1 lb.
 */
export function packLbForUnits(
  packWeightLb: number | null | undefined,
  qty: number,
  unit: string,
): number | null {
  if (packWeightLb == null || !(packWeightLb > 0)) return null;
  if (isWeightUnit(unit)) return null;
  if (!(qty > 0)) return null;
  return Math.round(qty * packWeightLb * 10) / 10;
}

/** "10 lb" / "10.5 lb" — trims a trailing ".0" for whole pounds. */
export function fmtLb(lb: number): string {
  const s = Number.isInteger(lb) ? String(lb) : lb.toFixed(1);
  return `${s} lb`;
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
  // Per-key bookkeeping kept OUT of the public row shape:
  //  • isCanonical — has the row's display name been set from a library-linked
  //    (canonical) input yet? The FIRST canonical input wins the display; a later
  //    non-canonical spelling never overwrites it.
  //  • altSeen — every outlet spelling seen for the key, deduped later into the
  //    row's altNames (dropping any that equal the final canonical display).
  const isCanonical = new Map<string, boolean>();
  const altSeen = new Map<string, Set<string>>();

  function bump(chan: Channel, d: CropDemandInput): void {
    const key = cropMergeKey(d.crop);
    if (!key || !(d.qty > 0)) return;
    let row = map.get(key);
    if (!row) {
      row = {
        crop: d.crop,
        category: d.category ?? null,
        csa: null, market: null, wholesale: null, flex: null,
        totalQty: 0, multiChannel: false, tender: false, altNames: [],
      };
      map.set(key, row);
      isCanonical.set(key, !!d.canonical);
    } else if (d.canonical && !isCanonical.get(key)) {
      // A library-canonical name upgrades a row first seen under an outlet
      // spelling — so one real crop renders under its canonical library label.
      row.crop = d.crop;
      isCanonical.set(key, true);
    }
    if (!row.category && d.category) row.category = d.category;
    // Remember every distinct outlet spelling (the line's own name, plus any
    // explicit sourceName) so we can surface the ones that differ from display.
    let seen = altSeen.get(key);
    if (!seen) { seen = new Set(); altSeen.set(key, seen); }
    seen.add(d.crop);
    if (d.sourceName) seen.add(d.sourceName);
    const cur = row[chan];
    if (cur) cur.qty += d.qty;
    else row[chan] = { qty: d.qty, unit: d.unit };
    row.totalQty += d.qty;
  }

  for (const d of csa) bump('csa', d);
  for (const d of market) bump('market', d);
  for (const d of wholesale) bump('wholesale', d);
  for (const d of flex) bump('flex', d);

  const rows: MergedCropRow[] = [];
  for (const [key, r] of map) {
    rows.push(r);
    // A canonical GROUP may force the display label (e.g. the summer-squash row
    // must read "Summer Squash", not whichever variant was seen first). This
    // wins over both first-seen and a library-linked spelling, applied last.
    const forced = CANONICAL_DISPLAY[key];
    if (forced) r.crop = forced;
    r.multiChannel = [r.csa, r.market, r.wholesale, r.flex].filter(Boolean).length > 1;
    r.tender = isTenderGreen(r.crop, r.category);
    // altNames = distinct source spellings whose normalized text differs from
    // the canonical display (so we never annotate a row with its own name), A→Z.
    const seen = altSeen.get(key);
    if (seen) {
      const dispNorm = normCrop(r.crop);
      const out: string[] = [];
      const dedupe = new Set<string>();
      for (const name of seen) {
        const nn = normCrop(name);
        if (!nn || nn === dispNorm || dedupe.has(nn)) continue;
        dedupe.add(nn);
        out.push(name.trim());
      }
      r.altNames = out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }
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
  /** Distinct outlet spellings that differ from `crop` (from the merged row) —
   *  small "also: …" print so crew match a differently-labeled crate. */
  altNames: string[];
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
    const cropKey = cropMergeKey(d.crop);
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
    const cells = cellsByCrop.get(cropMergeKey(mr.crop)) ?? new Map<string, MatrixCell>();
    // Dominant unit = the unit carrying the most qty across this row's cells.
    const byUnit = new Map<string, number>();
    for (const c of cells.values()) byUnit.set(c.unit, (byUnit.get(c.unit) ?? 0) + c.qty);
    let dominantUnit = '';
    let best = -1;
    for (const [u, q] of byUnit) if (q > best) { best = q; dominantUnit = u; }
    const mixedUnits = byUnit.size > 1;
    return {
      crop: mr.crop, category: mr.category, tender: mr.tender, altNames: mr.altNames,
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
  /* ── Pack House distribution TABLE (crop × destination, one row per crop) ── */
  itemCol: string;           // pack-matrix first column header ("Item")
  haveOnHandCol: string;     // pack-matrix "have on hand (qty)" checkbox column
  packedCol: string;         // pack-matrix "packed" checkbox column
  packhouseInstruction: string; // instruction line above the pack-matrix table
  partWord: string;          // "Part" — split-section caption (wide sheets)
  ofWord: string;            // "of"   — "Part 1 of 2"
  destsWord: string;         // "destinations" — "…destinations 1–6"
  alsoWord: string;          // "also" — small "also: <vendor spelling>" print
  sections: Record<CrewSection, string>; // crew-section band labels (EN/ES)
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
    /* ── Pack-house interactive extras (0083): needed_qty + note + flag filter. */
    flaggedShort: string;    // summary label after the flagged count
    filterFlagged: string;   // "Flagged only" quick-filter chip
    needBtn: string;         // "Need more" — opens the needed_qty editor
    needChip: string;        // amber chip template — MUST contain "{n}"
    needPrompt: string;      // "How many more do you still need?" prompt label
    noteBtn: string;         // "Note" — opens the note editor
    notePrompt: string;      // note input prompt label
    clear: string;           // one-tap clear (need / note)
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
    itemCol: 'Item',
    haveOnHandCol: 'Have on hand (qty)',
    packedCol: 'Packed',
    packhouseInstruction: 'Harvest the TOTAL. If you already have some from a previous market or inventory, check "Have on hand" and write how many — the harvest team cuts that much less. Check "Packed" when the item is fully packed for all outlets.',
    partWord: 'Part',
    ofWord: 'of',
    destsWord: 'destinations',
    alsoWord: 'also',
    sections: {
      'Salad Greens': 'Salad Greens',
      'Bunching Greens': 'Bunching Greens',
      'Alliums': 'Alliums',
      'Roots': 'Roots',
      'Fruiting & Vegetables': 'Fruiting & Vegetables',
      'Herbs': 'Herbs',
      'Flowers': 'Flowers',
      'Other': 'Other',
    },
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
      flaggedShort: 'flagged short',
      filterFlagged: 'Flagged only',
      needBtn: 'Need more',
      needChip: 'need {n} more',
      needPrompt: 'How many more do you still need?',
      noteBtn: 'Note',
      notePrompt: 'Leave a note for the pack team',
      clear: 'Clear',
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
    itemCol: 'Artículo',
    haveOnHandCol: 'Ya tengo (cant.)',
    packedCol: 'Empacado',
    packhouseInstruction: 'Coseche el TOTAL. Si ya tiene algo de un mercado anterior o del inventario, marque "Ya tengo" y escriba cuánto — el equipo de cosecha corta esa cantidad menos. Marque "Empacado" cuando el artículo esté completamente empacado para todos los destinos.',
    partWord: 'Parte',
    ofWord: 'de',
    destsWord: 'destinos',
    alsoWord: 'también',
    sections: {
      'Salad Greens': 'Verduras de ensalada',
      'Bunching Greens': 'Verduras de manojo',
      'Alliums': 'Cebollas y ajos',
      'Roots': 'Raíces',
      'Fruiting & Vegetables': 'Frutos y verduras',
      'Herbs': 'Hierbas',
      'Flowers': 'Flores',
      'Other': 'Otros',
    },
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
      flaggedShort: 'faltan',
      filterFlagged: 'Solo faltantes',
      needBtn: 'Faltan',
      needChip: 'faltan {n} más',
      needPrompt: '¿Cuántos más necesita todavía?',
      noteBtn: 'Nota',
      notePrompt: 'Deje una nota para el equipo de empaque',
      clear: 'Quitar',
    },
  },
};
