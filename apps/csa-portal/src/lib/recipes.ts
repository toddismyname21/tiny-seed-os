/**
 * Recipe-library helpers shared between /admin/recipes, the recipes API,
 * and the weekly-email matcher.
 *
 * A recipe is EITHER:
 *   - source='link' → an external url (the body is ignored)
 *   - source='farm' → our own written body/steps (the url is ignored)
 *
 * `crops` is a free-text tag list. To MATCH a recipe to a week's box we
 * overlap a recipe's crops against the box's product names — so the tags
 * should resemble crop/ingredient names that appear in
 * box_contents.product_name (e.g. "kale", "tomatoes", "carrots").
 */
import type { Database } from './database.types';

export type Recipe = Database['public']['Tables']['recipes']['Row'];
export type RecipeSource = 'farm' | 'link';

/**
 * Common crop names that show up in box_contents.product_name. Surfaced
 * as a hint under the crop-tags input on /admin/recipes so Todd tags
 * recipes with names that will actually match a box. Not enforced — tags
 * are free-text — just guidance.
 *
 * Derived from the kinds of produce a NE-Pennsylvania CSA grows across
 * spring/summer/fall. Kept lowercase; matching is case-insensitive.
 */
export const COMMON_CROP_TAGS: readonly string[] = [
  'arugula', 'basil', 'beans', 'beets', 'bok choy', 'broccoli',
  'cabbage', 'carrots', 'cauliflower', 'celery', 'chard', 'cilantro',
  'collards', 'corn', 'cucumbers', 'dill', 'eggplant', 'fennel',
  'garlic', 'green beans', 'kale', 'kohlrabi', 'leeks', 'lettuce',
  'mustard greens', 'okra', 'onions', 'parsley', 'parsnips', 'peas',
  'peppers', 'potatoes', 'radishes', 'scallions', 'spinach',
  'summer squash', 'sweet potatoes', 'tomatoes', 'turnips', 'winter squash',
  'zucchini',
] as const;

/**
 * Normalize a crop/product name for overlap comparison: trim, lowercase,
 * collapse internal whitespace, and strip a trailing plural 's' so
 * "tomatoes" matches "tomato" and "carrots" matches "carrot".
 *
 * We do NOT do heavy stemming — a deliberate, predictable transform that
 * Todd can reason about when tagging. The plural strip is the single
 * special case because produce is so often pluralized in box contents.
 */
export function normalizeCropToken(raw: string): string {
  const base = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (base.length <= 3) return base; // don't strip 's' off short words ("peas")
  return base.endsWith('s') ? base.slice(0, -1) : base;
}

/**
 * Does a recipe's crops overlap any of the supplied box crop names?
 * Case-insensitive, plural-insensitive (via normalizeCropToken). Also
 * matches when one name CONTAINS the other (so "cherry tomatoes" in the
 * box matches a "tomato" recipe tag, and a "kale" box matches a
 * "lacinato kale" recipe tag).
 */
export function recipeMatchesCrops(
  recipeCrops: readonly string[],
  boxCropTokens: ReadonlySet<string>
): boolean {
  for (const tag of recipeCrops) {
    const t = normalizeCropToken(tag);
    if (!t) continue;
    if (boxCropTokens.has(t)) return true;
    // Substring fallback: handles "cherry tomato" ⊃ "tomato" both ways.
    for (const boxTok of boxCropTokens) {
      if (boxTok.includes(t) || t.includes(boxTok)) return true;
    }
  }
  return false;
}

/** Build the normalized token set for a list of box product names. */
export function boxCropTokenSet(productNames: readonly string[]): Set<string> {
  const set = new Set<string>();
  for (const name of productNames) {
    const tok = normalizeCropToken(name);
    if (tok) set.add(tok);
  }
  return set;
}

/** Human label for a recipe source — used in the admin list badge. */
export const SOURCE_LABEL: Record<RecipeSource, string> = {
  farm: 'From us',
  link: 'Link',
};
