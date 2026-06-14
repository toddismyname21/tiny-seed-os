/**
 * Wholesale categories — the canonical, ORDERED category list for the
 * chef/wholesale catalog, plus deterministic sort/group helpers.
 *
 * This module is the single source of truth for how wholesale products are
 * categorized and the ORDER those categories appear in. The order mirrors a
 * chef's produce-catalog flow (salad → lettuces → greens → herbs →
 * fruiting → roots → brassicas → alliums → squash → mushrooms → flowers →
 * specialty), so the admin board and the upcoming chef-facing catalog read
 * top-to-bottom the way a kitchen actually shops.
 *
 * Pure + dependency-free: safe to import from SSR pages, admin APIs, and
 * tests. No secrets, no DB calls, no framework imports — just constants and
 * pure functions so every consumer agrees on category names and order.
 */

/* ──────────────────────────────────────────────────────────────────
 * Canonical ordered category list
 * ────────────────────────────────────────────────────────────────── */

/** The canonical wholesale categories, in chef produce-catalog order.
 *  New products should be assigned one of these (the admin form offers
 *  exactly this list). Order here IS the display order on the board. */
export const WHOLESALE_CATEGORIES = [
  'Salad Mixes',
  'Salad Greens',
  'Head Lettuce & Chicories',
  'Bunching Greens',
  'Herbs',
  'Tomatoes',
  'Peppers',
  'Roots',
  'Brassicas',
  'Alliums',
  'Squash & Fruiting',
  'Mushrooms',
  'Edible Flowers',
  'Specialty',
] as const;

export type WholesaleCategory = (typeof WHOLESALE_CATEGORIES)[number];

/** Where unknown / unassigned categories sort: after every known one. */
const UNKNOWN_RANK = WHOLESALE_CATEGORIES.length;

/* ──────────────────────────────────────────────────────────────────
 * Ranking
 * ────────────────────────────────────────────────────────────────── */

/**
 * Rank of a category for deterministic display order.
 *  - A known category → its index in WHOLESALE_CATEGORIES (0-based).
 *  - Anything else (null, '', legacy/custom value) → UNKNOWN_RANK, so it
 *    sorts AFTER every known category. Among unknowns, callers break ties
 *    alphabetically (see groupByCategory).
 */
export function categoryRank(cat: string | null | undefined): number {
  if (!cat) return UNKNOWN_RANK;
  const idx = (WHOLESALE_CATEGORIES as readonly string[]).indexOf(cat.trim());
  return idx === -1 ? UNKNOWN_RANK : idx;
}

/** True if `cat` is one of the canonical wholesale categories. */
export function isKnownCategory(cat: string | null | undefined): cat is WholesaleCategory {
  if (!cat) return false;
  return (WHOLESALE_CATEGORIES as readonly string[]).includes(cat.trim());
}

/* ──────────────────────────────────────────────────────────────────
 * Grouping
 * ────────────────────────────────────────────────────────────────── */

/** A minimal product shape for grouping — anything with a category, a
 *  sort_order, and a name. Generic so callers keep their own row type. */
export interface CategorizedProduct {
  category: string | null;
  sort_order: number;
  name: string;
}

/** One category section: its label + the items that belong to it, already
 *  sorted (by sort_order, then name). */
export interface CategoryGroup<T extends CategorizedProduct> {
  category: string;
  items: T[];
}

/** Display label for an item's (possibly null/blank) category. */
function groupKey(cat: string | null | undefined): string {
  const trimmed = (cat ?? '').trim();
  return trimmed === '' ? 'Uncategorized' : trimmed;
}

/**
 * Group products into ordered category sections.
 *
 * Returns `[{ category, items }]` where:
 *   - Known categories appear in WHOLESALE_CATEGORIES order.
 *   - Unknown / custom / blank categories appear AFTER all known ones,
 *     alphabetically (blank → "Uncategorized").
 *   - Within each section, items keep their existing within-category sort:
 *     `sort_order` ascending, then `name` ascending (case-insensitive).
 *
 * Pure: does not mutate the input array.
 */
export function groupByCategory<T extends CategorizedProduct>(
  products: readonly T[]
): CategoryGroup<T>[] {
  const buckets = new Map<string, T[]>();

  for (const p of products) {
    const key = groupKey(p.category);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(p);
    else buckets.set(key, [p]);
  }

  // Order the category keys: known by rank, unknown alphabetically after.
  const keys = [...buckets.keys()].sort((a, b) => {
    const ra = categoryRank(a);
    const rb = categoryRank(b);
    if (ra !== rb) return ra - rb;
    // Same rank (e.g. both unknown) → alphabetical, case-insensitive.
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  });

  return keys.map((category) => {
    const items = [...(buckets.get(category) ?? [])].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    return { category, items };
  });
}
