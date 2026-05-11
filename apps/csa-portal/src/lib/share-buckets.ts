/**
 * Share bucketing — turns the (share_type, share_size, biweekly_week)
 * tuple into a single human-friendly display group.
 *
 * Why a separate module:
 *   - The bucketing logic is used by both /admin (overview list) and
 *     /admin/members (filterable members table).
 *   - The underlying enum values stay as-is (summer_veg, flower, flex,
 *     add_on). Granularity is purely a DISPLAY/REPORTING concern —
 *     never write these labels back to the DB.
 *
 * Size bucketing:
 *   share_size has 11 legal values in the schema. We collapse them
 *   into "small" / "large" using LARGE_SIZES + SMALL_SIZES. Anything
 *   outside those sets (or NULL) bucket as "unknown" — surfaced as a
 *   footer note for Todd to clean up via the member detail page.
 *
 * Biweekly:
 *   biweekly_week is `number | null` in the DB (0 | 1 | NULL). NULL =
 *   weekly share. 0 = Week A. 1 = Week B. Any other value falls back
 *   to "weekly" defensively (the schema doesn't enforce 0/1, only that
 *   it's an int).
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
export type WeekBucket = 'weekly' | 'biweekly_a' | 'biweekly_b';

export function bucketWeek(w: number | null | undefined): WeekBucket {
  if (w === 0) return 'biweekly_a';
  if (w === 1) return 'biweekly_b';
  return 'weekly';
}

// ─── Full bucket id ──────────────────────────────────────────────────
/**
 * Canonical bucket identifiers. These are STABLE strings safe to use
 * as URL query params, sort keys, and filter values.
 *
 * Order in DISPLAY_ORDER below is the order Todd sees them.
 */
export type ShareBucketId =
  // Spring veg — kept simple (no size/week split in current data)
  | 'spring_veg'
  // Summer veg — 6 granular buckets
  | 'summer_small_weekly'
  | 'summer_large_weekly'
  | 'summer_small_biweekly_a'
  | 'summer_small_biweekly_b'
  | 'summer_large_biweekly_a'
  | 'summer_large_biweekly_b'
  // Fall veg — kept simple
  | 'fall_veg'
  // Flower — 6 granular buckets
  | 'flower_small_weekly'
  | 'flower_large_weekly'
  | 'flower_small_biweekly_a'
  | 'flower_small_biweekly_b'
  | 'flower_large_biweekly_a'
  | 'flower_large_biweekly_b'
  // Flex
  | 'flex'
  // Add-on — 3 buckets
  | 'addon_weekly'
  | 'addon_biweekly_a'
  | 'addon_biweekly_b'
  // Wholesale CSA
  | 'wholesale_csa'
  // Catch-all for rows that can't be bucketed (unknown share_size on
  // a sized type, or unrecognised share_type)
  | 'unknown';

export interface ShareBucketDef {
  id: ShareBucketId;
  label: string;
  group: 'spring_veg' | 'summer_veg' | 'fall_veg' | 'flower' | 'flex' | 'add_on' | 'wholesale_csa' | 'unknown';
}

/** Stable display order. Sums and tables follow this order. */
export const DISPLAY_ORDER: ShareBucketDef[] = [
  // Spring
  { id: 'spring_veg',                label: 'Spring Veg',                  group: 'spring_veg' },
  // Summer
  { id: 'summer_small_weekly',       label: 'Summer Small Weekly',         group: 'summer_veg' },
  { id: 'summer_large_weekly',       label: 'Summer Large Weekly',         group: 'summer_veg' },
  { id: 'summer_small_biweekly_a',   label: 'Summer Small Bi-weekly Wk A', group: 'summer_veg' },
  { id: 'summer_small_biweekly_b',   label: 'Summer Small Bi-weekly Wk B', group: 'summer_veg' },
  { id: 'summer_large_biweekly_a',   label: 'Summer Large Bi-weekly Wk A', group: 'summer_veg' },
  { id: 'summer_large_biweekly_b',   label: 'Summer Large Bi-weekly Wk B', group: 'summer_veg' },
  // Fall
  { id: 'fall_veg',                  label: 'Fall Veg',                    group: 'fall_veg' },
  // Flower
  { id: 'flower_small_weekly',       label: 'Flower Small Weekly',         group: 'flower' },
  { id: 'flower_large_weekly',       label: 'Flower Large Weekly',         group: 'flower' },
  { id: 'flower_small_biweekly_a',   label: 'Flower Small Bi-weekly Wk A', group: 'flower' },
  { id: 'flower_small_biweekly_b',   label: 'Flower Small Bi-weekly Wk B', group: 'flower' },
  { id: 'flower_large_biweekly_a',   label: 'Flower Large Bi-weekly Wk A', group: 'flower' },
  { id: 'flower_large_biweekly_b',   label: 'Flower Large Bi-weekly Wk B', group: 'flower' },
  // Flex
  { id: 'flex',                      label: 'Flex',                        group: 'flex' },
  // Add-ons
  { id: 'addon_weekly',              label: 'Add-on Weekly',               group: 'add_on' },
  { id: 'addon_biweekly_a',          label: 'Add-on Bi-weekly Wk A',       group: 'add_on' },
  { id: 'addon_biweekly_b',          label: 'Add-on Bi-weekly Wk B',       group: 'add_on' },
  // Wholesale
  { id: 'wholesale_csa',             label: 'Wholesale CSA',               group: 'wholesale_csa' },
  // Unknown — only shown if non-zero
  { id: 'unknown',                   label: 'Unbucketed (needs review)',   group: 'unknown' },
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
  biweeklyWeek: number | null | undefined
): ShareBucketId {
  const week = bucketWeek(biweeklyWeek);
  const size = bucketSize(shareSize);

  switch (shareType) {
    case 'spring_veg':
      return 'spring_veg';

    case 'summer_veg':
      if (size === 'unknown') return 'unknown';
      if (size === 'small' && week === 'weekly')      return 'summer_small_weekly';
      if (size === 'large' && week === 'weekly')      return 'summer_large_weekly';
      if (size === 'small' && week === 'biweekly_a')  return 'summer_small_biweekly_a';
      if (size === 'small' && week === 'biweekly_b')  return 'summer_small_biweekly_b';
      if (size === 'large' && week === 'biweekly_a')  return 'summer_large_biweekly_a';
      if (size === 'large' && week === 'biweekly_b')  return 'summer_large_biweekly_b';
      return 'unknown';

    case 'fall_veg':
      return 'fall_veg';

    case 'flower':
      if (size === 'unknown') return 'unknown';
      if (size === 'small' && week === 'weekly')      return 'flower_small_weekly';
      if (size === 'large' && week === 'weekly')      return 'flower_large_weekly';
      if (size === 'small' && week === 'biweekly_a')  return 'flower_small_biweekly_a';
      if (size === 'small' && week === 'biweekly_b')  return 'flower_small_biweekly_b';
      if (size === 'large' && week === 'biweekly_a')  return 'flower_large_biweekly_a';
      if (size === 'large' && week === 'biweekly_b')  return 'flower_large_biweekly_b';
      return 'unknown';

    case 'flex':
      // Flex isn't sized or weeked — single bucket.
      return 'flex';

    case 'add_on':
      // Add-ons are not sized but ARE weeked. A bi-weekly base share
      // pairs its add-on to the same week, so we still bucket by week.
      if (week === 'biweekly_a') return 'addon_biweekly_a';
      if (week === 'biweekly_b') return 'addon_biweekly_b';
      return 'addon_weekly';

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
  biweekly_week: number | null;
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
 *   filtersFor('summer_small_weekly') →
 *     { share_type: 'summer_veg', share_size_in: [...SMALL], biweekly_week_is_null: true }
 *
 *   filtersFor('flex') →
 *     { share_type: 'flex' }
 */
export interface BucketFilters {
  share_type?: string;
  share_size_in?: string[];
  biweekly_week_eq?: number;
  biweekly_week_is_null?: boolean;
}

const SMALL_SIZE_LIST = Array.from(SMALL_SIZES);
const LARGE_SIZE_LIST = Array.from(LARGE_SIZES);

export function filtersFor(id: ShareBucketId): BucketFilters {
  switch (id) {
    case 'spring_veg':
      return { share_type: 'spring_veg' };

    case 'summer_small_weekly':
      return { share_type: 'summer_veg', share_size_in: SMALL_SIZE_LIST, biweekly_week_is_null: true };
    case 'summer_large_weekly':
      return { share_type: 'summer_veg', share_size_in: LARGE_SIZE_LIST, biweekly_week_is_null: true };
    case 'summer_small_biweekly_a':
      return { share_type: 'summer_veg', share_size_in: SMALL_SIZE_LIST, biweekly_week_eq: 0 };
    case 'summer_small_biweekly_b':
      return { share_type: 'summer_veg', share_size_in: SMALL_SIZE_LIST, biweekly_week_eq: 1 };
    case 'summer_large_biweekly_a':
      return { share_type: 'summer_veg', share_size_in: LARGE_SIZE_LIST, biweekly_week_eq: 0 };
    case 'summer_large_biweekly_b':
      return { share_type: 'summer_veg', share_size_in: LARGE_SIZE_LIST, biweekly_week_eq: 1 };

    case 'fall_veg':
      return { share_type: 'fall_veg' };

    case 'flower_small_weekly':
      return { share_type: 'flower', share_size_in: SMALL_SIZE_LIST, biweekly_week_is_null: true };
    case 'flower_large_weekly':
      return { share_type: 'flower', share_size_in: LARGE_SIZE_LIST, biweekly_week_is_null: true };
    case 'flower_small_biweekly_a':
      return { share_type: 'flower', share_size_in: SMALL_SIZE_LIST, biweekly_week_eq: 0 };
    case 'flower_small_biweekly_b':
      return { share_type: 'flower', share_size_in: SMALL_SIZE_LIST, biweekly_week_eq: 1 };
    case 'flower_large_biweekly_a':
      return { share_type: 'flower', share_size_in: LARGE_SIZE_LIST, biweekly_week_eq: 0 };
    case 'flower_large_biweekly_b':
      return { share_type: 'flower', share_size_in: LARGE_SIZE_LIST, biweekly_week_eq: 1 };

    case 'flex':
      return { share_type: 'flex' };

    case 'addon_weekly':
      return { share_type: 'add_on', biweekly_week_is_null: true };
    case 'addon_biweekly_a':
      return { share_type: 'add_on', biweekly_week_eq: 0 };
    case 'addon_biweekly_b':
      return { share_type: 'add_on', biweekly_week_eq: 1 };

    case 'wholesale_csa':
      return { share_type: 'wholesale_csa' };

    case 'unknown':
      // The "unknown" bucket is for rows that don't bucket cleanly. We
      // can't express that as a simple WHERE — callers handle this in
      // application code or skip it as a filter option.
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
