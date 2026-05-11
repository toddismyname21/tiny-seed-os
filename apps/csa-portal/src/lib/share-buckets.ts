/**
 * Share bucketing — turns the (share_type, share_size, biweekly_week)
 * tuple into a single human-friendly display group.
 *
 * Why a separate module:
 *   - The bucketing logic is used by both /admin (overview list) and
 *     /admin/members (filterable members table) and the CSV export.
 *   - The underlying enum values stay as-is (summer_veg, flower, flex,
 *     add_on, spring_veg). Granularity is purely a DISPLAY/REPORTING
 *     concern — never write these labels back to the DB.
 *
 * Data model (per Todd, 2026-05-11):
 *   - EVERY CSA member is bi-weekly. There are no weekly subscribers.
 *   - biweekly_week is TEXT ('A' | 'B' | NULL) after migration 0018.
 *     'A' = Week A pickup, 'B' = Week B pickup, NULL = not yet assigned
 *     (admin needs to assign via member detail page).
 *
 * Size bucketing:
 *   share_size has 11 legal enum values in the schema. We collapse them
 *   into "small" / "large" using LARGE_SIZES + SMALL_SIZES. Anything
 *   outside those sets (or NULL where required) buckets as "unknown" —
 *   surfaced as a footer note for Todd to clean up via member detail.
 *
 *   Sized share types (summer_veg, flower) require a valid size.
 *   Unsized share types (spring_veg, flex, add_on, wholesale_csa)
 *   ignore size entirely.
 */

// ─── Size bucketing ──────────────────────────────────────────────────
export const LARGE_SIZES = new Set<string>([
  'large', 'regular', 'family', 'full', 'double',
]);

export const SMALL_SIZES = new Set<string>([
  'small', 'petite', 'light', 'half', 'quarter', 'single',
]);

export type SizeBucket = 'small' | 'large' | 'unknown';

export function bucketSize(s: string | null | undefined): SizeBucket {
  if (!s) return 'unknown';
  if (LARGE_SIZES.has(s)) return 'large';
  if (SMALL_SIZES.has(s)) return 'small';
  return 'unknown';
}

// ─── Week bucketing ──────────────────────────────────────────────────
/**
 * Bucket the (now TEXT-valued) biweekly_week column.
 *
 *   'A'      → 'a'
 *   'B'      → 'b'
 *   NULL/''  → 'unassigned'
 *   other    → 'unassigned' (defensive — CHECK constraint guarantees
 *              we never get here, but be safe in TS)
 */
export type WeekBucket = 'a' | 'b' | 'unassigned';

export function bucketWeek(w: string | null | undefined): WeekBucket {
  if (w === 'A') return 'a';
  if (w === 'B') return 'b';
  return 'unassigned';
}

// ─── Full bucket id ──────────────────────────────────────────────────
/**
 * Canonical bucket identifiers. These are STABLE strings safe to use
 * as URL query params, sort keys, and filter values.
 *
 * Order in DISPLAY_ORDER below is the order Todd sees them.
 *
 * Naming: each sized type gets {size}_{week} buckets; unsized types
 * get just _{week} buckets. The full grid for summer_veg is:
 *   small × {A, B, unassigned}  +  large × {A, B, unassigned}  = 6
 * For unsized types: 3 each.
 */
export type ShareBucketId =
  // Spring veg — unsized, week-only
  | 'spring_veg_a'
  | 'spring_veg_b'
  | 'spring_veg_unassigned'
  // Summer veg — sized + weeked = 6
  | 'summer_small_a'
  | 'summer_small_b'
  | 'summer_small_unassigned'
  | 'summer_large_a'
  | 'summer_large_b'
  | 'summer_large_unassigned'
  // Fall veg — unsized, week-only
  | 'fall_veg_a'
  | 'fall_veg_b'
  | 'fall_veg_unassigned'
  // Flower — sized + weeked = 6
  | 'flower_small_a'
  | 'flower_small_b'
  | 'flower_small_unassigned'
  | 'flower_large_a'
  | 'flower_large_b'
  | 'flower_large_unassigned'
  // Flex — unsized
  | 'flex_a'
  | 'flex_b'
  | 'flex_unassigned'
  // Add-on — unsized
  | 'addon_a'
  | 'addon_b'
  | 'addon_unassigned'
  // Wholesale CSA — single bucket (not on bi-weekly schedule)
  | 'wholesale_csa'
  // Catch-all for sized rows whose size doesn't bucket
  | 'unknown';

export interface ShareBucketDef {
  id: ShareBucketId;
  label: string;
  group:
    | 'spring_veg' | 'summer_veg' | 'fall_veg' | 'flower'
    | 'flex' | 'add_on' | 'wholesale_csa' | 'unknown';
}

/** Stable display order. Sums and tables follow this order. */
export const DISPLAY_ORDER: ShareBucketDef[] = [
  // Spring veg
  { id: 'spring_veg_a',            label: 'Spring Veg · Week A',           group: 'spring_veg' },
  { id: 'spring_veg_b',            label: 'Spring Veg · Week B',           group: 'spring_veg' },
  { id: 'spring_veg_unassigned',   label: 'Spring Veg · Unassigned',       group: 'spring_veg' },
  // Summer veg
  { id: 'summer_small_a',          label: 'Summer Small · Week A',         group: 'summer_veg' },
  { id: 'summer_small_b',          label: 'Summer Small · Week B',         group: 'summer_veg' },
  { id: 'summer_small_unassigned', label: 'Summer Small · Unassigned',     group: 'summer_veg' },
  { id: 'summer_large_a',          label: 'Summer Large · Week A',         group: 'summer_veg' },
  { id: 'summer_large_b',          label: 'Summer Large · Week B',         group: 'summer_veg' },
  { id: 'summer_large_unassigned', label: 'Summer Large · Unassigned',     group: 'summer_veg' },
  // Fall veg
  { id: 'fall_veg_a',              label: 'Fall Veg · Week A',             group: 'fall_veg' },
  { id: 'fall_veg_b',              label: 'Fall Veg · Week B',             group: 'fall_veg' },
  { id: 'fall_veg_unassigned',     label: 'Fall Veg · Unassigned',         group: 'fall_veg' },
  // Flower
  { id: 'flower_small_a',          label: 'Flower Small · Week A',         group: 'flower' },
  { id: 'flower_small_b',          label: 'Flower Small · Week B',         group: 'flower' },
  { id: 'flower_small_unassigned', label: 'Flower Small · Unassigned',     group: 'flower' },
  { id: 'flower_large_a',          label: 'Flower Large · Week A',         group: 'flower' },
  { id: 'flower_large_b',          label: 'Flower Large · Week B',         group: 'flower' },
  { id: 'flower_large_unassigned', label: 'Flower Large · Unassigned',     group: 'flower' },
  // Flex
  { id: 'flex_a',                  label: 'Flex · Week A',                 group: 'flex' },
  { id: 'flex_b',                  label: 'Flex · Week B',                 group: 'flex' },
  { id: 'flex_unassigned',         label: 'Flex · Unassigned',             group: 'flex' },
  // Add-ons
  { id: 'addon_a',                 label: 'Add-on · Week A',               group: 'add_on' },
  { id: 'addon_b',                 label: 'Add-on · Week B',               group: 'add_on' },
  { id: 'addon_unassigned',        label: 'Add-on · Unassigned',           group: 'add_on' },
  // Wholesale
  { id: 'wholesale_csa',           label: 'Wholesale CSA',                 group: 'wholesale_csa' },
  // Unknown — only shown if non-zero
  { id: 'unknown',                 label: 'Unbucketed (needs review)',     group: 'unknown' },
];

const BUCKET_LABEL: Record<ShareBucketId, string> = Object.fromEntries(
  DISPLAY_ORDER.map((d) => [d.id, d.label])
) as Record<ShareBucketId, string>;

export function bucketLabel(id: ShareBucketId): string {
  return BUCKET_LABEL[id] ?? id;
}

/**
 * Classify one member row into a bucket id.
 *
 * Inputs accept `string | null` because Postgres columns and our
 * supabase-js result types both expose this shape.
 */
export function classifyShare(
  shareType: string | null | undefined,
  shareSize: string | null | undefined,
  biweeklyWeek: string | null | undefined
): ShareBucketId {
  const week = bucketWeek(biweeklyWeek);
  const size = bucketSize(shareSize);

  switch (shareType) {
    case 'spring_veg':
      if (week === 'a') return 'spring_veg_a';
      if (week === 'b') return 'spring_veg_b';
      return 'spring_veg_unassigned';

    case 'summer_veg':
      if (size === 'unknown') return 'unknown';
      if (size === 'small' && week === 'a')          return 'summer_small_a';
      if (size === 'small' && week === 'b')          return 'summer_small_b';
      if (size === 'small' && week === 'unassigned') return 'summer_small_unassigned';
      if (size === 'large' && week === 'a')          return 'summer_large_a';
      if (size === 'large' && week === 'b')          return 'summer_large_b';
      if (size === 'large' && week === 'unassigned') return 'summer_large_unassigned';
      return 'unknown';

    case 'fall_veg':
      if (week === 'a') return 'fall_veg_a';
      if (week === 'b') return 'fall_veg_b';
      return 'fall_veg_unassigned';

    case 'flower':
      if (size === 'unknown') return 'unknown';
      if (size === 'small' && week === 'a')          return 'flower_small_a';
      if (size === 'small' && week === 'b')          return 'flower_small_b';
      if (size === 'small' && week === 'unassigned') return 'flower_small_unassigned';
      if (size === 'large' && week === 'a')          return 'flower_large_a';
      if (size === 'large' && week === 'b')          return 'flower_large_b';
      if (size === 'large' && week === 'unassigned') return 'flower_large_unassigned';
      return 'unknown';

    case 'flex':
      if (week === 'a') return 'flex_a';
      if (week === 'b') return 'flex_b';
      return 'flex_unassigned';

    case 'add_on':
      if (week === 'a') return 'addon_a';
      if (week === 'b') return 'addon_b';
      return 'addon_unassigned';

    case 'wholesale_csa':
      return 'wholesale_csa';

    default:
      return 'unknown';
  }
}

/**
 * Build a count map from an array of member rows. Convenience wrapper
 * used by both /admin and /admin/members. Returns a Map keyed by
 * bucket id so the caller can iterate in DISPLAY_ORDER.
 */
export interface MemberShareRow {
  share_type: string | null;
  share_size: string | null;
  biweekly_week: string | null;
}

export function countByBucket(rows: ReadonlyArray<MemberShareRow>): Map<ShareBucketId, number> {
  const counts = new Map<ShareBucketId, number>();
  for (const row of rows) {
    const id = classifyShare(row.share_type, row.share_size, row.biweekly_week);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/**
 * Server-side Supabase filter translator. The /admin/members filter
 * dropdown emits a bucket id; we translate that into a sequence of
 * column predicates we can apply to a query builder.
 *
 * Returns the *filters* to apply. The caller is responsible for
 * actually calling `.eq()` / `.is()` / `.in()` on its query builder
 * — this keeps share-buckets.ts dependency-free of supabase-js.
 *
 * Examples:
 *   filtersFor('summer_small_a') →
 *     { share_type: 'summer_veg', share_size_in: [...SMALL], biweekly_week_eq: 'A' }
 *
 *   filtersFor('flex_unassigned') →
 *     { share_type: 'flex', biweekly_week_is_null: true }
 */
export interface BucketFilters {
  share_type?: string;
  share_size_in?: string[];
  biweekly_week_eq?: 'A' | 'B';
  biweekly_week_is_null?: boolean;
}

const SMALL_SIZE_LIST = Array.from(SMALL_SIZES);
const LARGE_SIZE_LIST = Array.from(LARGE_SIZES);

export function filtersFor(id: ShareBucketId): BucketFilters {
  switch (id) {
    // ─── Spring veg ──────────────────────────────────────────────────
    case 'spring_veg_a':
      return { share_type: 'spring_veg', biweekly_week_eq: 'A' };
    case 'spring_veg_b':
      return { share_type: 'spring_veg', biweekly_week_eq: 'B' };
    case 'spring_veg_unassigned':
      return { share_type: 'spring_veg', biweekly_week_is_null: true };

    // ─── Summer veg ──────────────────────────────────────────────────
    case 'summer_small_a':
      return { share_type: 'summer_veg', share_size_in: SMALL_SIZE_LIST, biweekly_week_eq: 'A' };
    case 'summer_small_b':
      return { share_type: 'summer_veg', share_size_in: SMALL_SIZE_LIST, biweekly_week_eq: 'B' };
    case 'summer_small_unassigned':
      return { share_type: 'summer_veg', share_size_in: SMALL_SIZE_LIST, biweekly_week_is_null: true };
    case 'summer_large_a':
      return { share_type: 'summer_veg', share_size_in: LARGE_SIZE_LIST, biweekly_week_eq: 'A' };
    case 'summer_large_b':
      return { share_type: 'summer_veg', share_size_in: LARGE_SIZE_LIST, biweekly_week_eq: 'B' };
    case 'summer_large_unassigned':
      return { share_type: 'summer_veg', share_size_in: LARGE_SIZE_LIST, biweekly_week_is_null: true };

    // ─── Fall veg ────────────────────────────────────────────────────
    case 'fall_veg_a':
      return { share_type: 'fall_veg', biweekly_week_eq: 'A' };
    case 'fall_veg_b':
      return { share_type: 'fall_veg', biweekly_week_eq: 'B' };
    case 'fall_veg_unassigned':
      return { share_type: 'fall_veg', biweekly_week_is_null: true };

    // ─── Flower ──────────────────────────────────────────────────────
    case 'flower_small_a':
      return { share_type: 'flower', share_size_in: SMALL_SIZE_LIST, biweekly_week_eq: 'A' };
    case 'flower_small_b':
      return { share_type: 'flower', share_size_in: SMALL_SIZE_LIST, biweekly_week_eq: 'B' };
    case 'flower_small_unassigned':
      return { share_type: 'flower', share_size_in: SMALL_SIZE_LIST, biweekly_week_is_null: true };
    case 'flower_large_a':
      return { share_type: 'flower', share_size_in: LARGE_SIZE_LIST, biweekly_week_eq: 'A' };
    case 'flower_large_b':
      return { share_type: 'flower', share_size_in: LARGE_SIZE_LIST, biweekly_week_eq: 'B' };
    case 'flower_large_unassigned':
      return { share_type: 'flower', share_size_in: LARGE_SIZE_LIST, biweekly_week_is_null: true };

    // ─── Flex ────────────────────────────────────────────────────────
    case 'flex_a':
      return { share_type: 'flex', biweekly_week_eq: 'A' };
    case 'flex_b':
      return { share_type: 'flex', biweekly_week_eq: 'B' };
    case 'flex_unassigned':
      return { share_type: 'flex', biweekly_week_is_null: true };

    // ─── Add-on ──────────────────────────────────────────────────────
    case 'addon_a':
      return { share_type: 'add_on', biweekly_week_eq: 'A' };
    case 'addon_b':
      return { share_type: 'add_on', biweekly_week_eq: 'B' };
    case 'addon_unassigned':
      return { share_type: 'add_on', biweekly_week_is_null: true };

    // ─── Wholesale ───────────────────────────────────────────────────
    case 'wholesale_csa':
      return { share_type: 'wholesale_csa' };

    // ─── Unknown ─────────────────────────────────────────────────────
    case 'unknown':
      // The "unknown" bucket is for sized rows whose size doesn't
      // bucket (NULL or unrecognised on summer_veg / flower). Callers
      // handle this inline since it can't be expressed as a simple
      // WHERE.
      return {};

    default:
      return {};
  }
}

/**
 * Type guard for a string coming in from a URL query param. Returns
 * the validated id or null if it doesn't match a known bucket.
 */
const VALID_IDS = new Set<string>(DISPLAY_ORDER.map((d) => d.id));
export function parseBucketId(input: string | null | undefined): ShareBucketId | null {
  if (!input) return null;
  return VALID_IDS.has(input) ? (input as ShareBucketId) : null;
}
