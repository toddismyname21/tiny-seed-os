/**
 * Box-customization helpers shared between /box, /api/box/swap, and
 * /api/box/swap-undo.
 *
 * Pittsburgh is in America/New_York (Eastern). The swap cutoff is UNIFIED with
 * Farm Flex and pickup-day-aware (Todd 2026-06-26): Sat/Sun-market members lock
 * Thursday 7 AM ET; everyone else (Tue market / Wed CSA / home delivery) locks
 * the cycle Monday 7 AM ET. isCutoffPassed delegates to lib/flex-order.ts
 * `cutoffEpochMs` — the single source of truth. (The formatInTZ /
 * computeETInstantMs helpers below are now unused — slated for cleanup.)
 *
 * Implementation notes:
 *   - We don't pull a TZ database. Instead we use Intl.DateTimeFormat
 *     with `timeZone: 'America/New_York'` to compute the wall-clock
 *     time in ET, then format both `now` and the cutoff in the same
 *     timezone so DST transitions don't bite us.
 *   - The cutoff math:
 *         delivery_day  = week_date              (Wednesday, 'YYYY-MM-DD')
 *         cutoff_dayET  = delivery_day - 1 day   (Tuesday)
 *         cutoff        = cutoff_dayET 08:00 ET
 *     We check `now_ET >= cutoff` to decide if the cutoff has passed.
 */

import { mondayOfWeek } from './cycle';
import { cutoffEpochMs, type PickupDay } from './flex-order';

export const OWNER_EMAIL = 'todd@tinyseedfarmpgh.com';

/**
 * Has the box-customization cutoff passed for this cycle week?
 *
 * UNIFIED CUTOFF (Todd 2026-06-26): box swaps share the SAME pickup-day-aware
 * deadline as Farm Flex, delegated to `cutoffEpochMs` (lib/flex-order.ts) — the
 * single source of truth, so the two can never drift apart again. The member's
 * pickup day selects which cutoff applies:
 *   • Sat/Sun markets (weekend run)                         → Thursday 7 AM ET
 *   • Tue market / Wed CSA / home delivery / no-pickup       → Monday 7 AM ET
 *
 * `weekDate` may be the cycle MONDAY or the delivery WEDNESDAY — we normalize to
 * the cycle Monday so behaviour is identical for either input. `pickupDay`
 * defaults to null (→ the Monday cutoff) so a missing pickup never grants the
 * later weekend window by accident.
 *
 * Returns true if `now` is at or past the cutoff for `weekDate`.
 */
export function isCutoffPassed(weekDate: string, now: Date, pickupDay: PickupDay = null): boolean {
  // Defensive: malformed date → treat as "not passed" so callers surface a
  // clearer invalid_input error elsewhere rather than 403'ing.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekDate)) return false;
  return now.getTime() >= cutoffEpochMs(mondayOfWeek(weekDate), pickupDay);
}

/**
 * Format a Date into America/New_York calendar parts.
 */
function formatInTZ(d: Date, tz: string): { year: number; month: number; day: number; weekday: string } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string): string =>
    parts.find((p) => p.type === t)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: get('weekday'),
  };
}

/**
 * Compute the absolute UTC ms timestamp for a given Eastern wall-clock
 * date+time (year, month 1-12, day, hour 0-23, minute 0-59).
 *
 * Strategy: try the offset that ET would have at *roughly* that
 * instant (we approximate with a UTC Date near the requested moment),
 * read the `timeZoneName` (EDT/EST), and use the canonical offset for
 * each. EDT = UTC-4, EST = UTC-5.
 *
 * This is robust across DST transitions because we compute the offset
 * from the perspective of the *target* date, not the host's current
 * date.
 */
function computeETInstantMs(
  year: number, month: number, day: number, hour: number, minute: number
): number {
  // First-pass guess: assume EDT (UTC-4) — most of the year.
  const guessUTC = Date.UTC(year, month - 1, day, hour + 4, minute, 0);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    timeZoneName: 'short',
  }).formatToParts(new Date(guessUTC));

  const tzName = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'EDT';

  // Map common ET tz names to their UTC offsets in hours.
  const offsetHours = tzName === 'EST' ? 5 : 4;
  return Date.UTC(year, month - 1, day, hour + offsetHours, minute, 0);
}

/**
 * Compute the upcoming Wednesday delivery date in Eastern time.
 * Mirrors the helper used by dashboard.astro and index.astro.
 *
 * Returns 'YYYY-MM-DD'.
 */
export function upcomingWednesdayET(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string): string =>
    parts.find((p) => p.type === t)?.value ?? '';
  const dayIndex: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const todayIdx = dayIndex[get('weekday')] ?? 0;
  const daysUntilWed = (3 - todayIdx + 7) % 7;
  // Anchor at noon UTC to avoid DST edge cases when adding days.
  const todayET = new Date(`${get('year')}-${get('month')}-${get('day')}T12:00:00Z`);
  const wed = new Date(todayET.getTime() + daysUntilWed * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(wed);
}

/** Pretty-print a YYYY-MM-DD date as 'Wednesday, May 13'. */
export function prettyDateET(weekDate: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    timeZone: 'America/New_York',
  }).format(new Date(`${weekDate}T12:00:00Z`));
}

/** Share-type label lookup. Centralized so /box and /dashboard agree. */
export const SHARE_TYPE_LABELS: Record<string, string> = {
  spring_veg: 'Spring Vegetable Share',
  summer_veg: 'Summer Vegetable Share',
  fall_veg: 'Fall Vegetable Share',
  flower: 'Flower Share',
  flex: 'Flex Share',
  add_on: 'Add-On',
  wholesale_csa: 'Wholesale CSA',
};

// ─────────────────────────────────────────────────────────────────────
// MEMBER share_type/share_size  →  box_contents.share_type mapping
// ─────────────────────────────────────────────────────────────────────
//
// The /box member page must read box_contents using the SAME share_type
// value the admin box editor writes — NOT the member's enum share_type.
//
// Reality (verified against prod box_contents 2026-06-08 / 2026-06-15):
//   • Veg boxes are published by SIZE: 'small' / 'family' / 'large'
//     (the admin "Share contents" editor's size buckets; Large mirrors
//     Family upstream, so a 'large' bucket may or may not exist for a
//     given week).
//   • There are currently NO flower box_contents rows for live weeks
//     (only legacy 'Flower-Share' / 'Petite-Bloom' from Jan). So flower
//     members keep reading 'flower' — which is simply "not posted yet"
//     until the flower box is published. Mapping flower → a value with
//     no rows would change nothing; leaving it as 'flower' preserves the
//     existing behaviour exactly per spec.
//   • flex members never read box_contents here — they use the flex
//     order page — so we never map them onto a box_contents bucket.
//
// A veg member maps to a PRIMARY bucket plus an ordered list of
// FALLBACKS so a Family/Large member still sees a box when only one of
// those two buckets was published for the week:
//   small  share_size → ['small']
//   family/large/regular share_size → ['family', 'large']  (prefer family)

/** A member row shape sufficient to resolve its box_contents bucket. */
export type BoxContentsLookupMember = {
  share_type: string;
  share_size: string | null;
};

/**
 * The box_contents.share_type bucket(s) a member should read, in
 * preference order. The first entry that has rows published for the week
 * wins; later entries are fallbacks.
 *
 *   - summer_veg / spring_veg / fall_veg:
 *       share_size 'small'                       → ['small']
 *       share_size 'family' | 'large' | 'regular'→ ['family', 'large']
 *       (any other / null size)                  → ['family', 'large', 'small']
 *   - flower: ['flower']  (unchanged — see note above)
 *   - flex / add_on / wholesale_csa / unknown: [<share_type>]
 *       (flex/add_on don't read /box box buckets; passthrough is harmless
 *        and never matches a veg/flower bucket)
 *
 * Returns a NON-EMPTY array; callers dedupe across members.
 */
export function boxContentsShareTypesFor(member: BoxContentsLookupMember): string[] {
  const isVeg =
    member.share_type === 'summer_veg' ||
    member.share_type === 'spring_veg' ||
    member.share_type === 'fall_veg';

  if (isVeg) {
    const size = (member.share_size ?? '').trim().toLowerCase();
    if (size === 'small') return ['small'];
    if (size === 'family' || size === 'large' || size === 'regular') {
      return ['family', 'large'];
    }
    // Unknown/null veg size: be generous so the member still sees a box.
    return ['family', 'large', 'small'];
  }

  if (member.share_type === 'flower') return ['flower'];

  // flex / add_on / wholesale_csa / anything else: passthrough.
  return [member.share_type];
}

/**
 * Given the full set of active members, return:
 *   - `queryShareTypes`: the deduped list of box_contents.share_type
 *     values to fetch (union of every member's preference list), and
 *   - `bucketForShareType`: a function that, AFTER the rows come back,
 *     resolves which single bucket a given member share_type actually
 *     reads — picking the first of that member's preference list that
 *     has ≥1 published row this week. Used to attribute fetched rows
 *     back to the right per-share section.
 *
 * Keeping the union broad (e.g. fetching both 'family' AND 'large') and
 * resolving the winner post-fetch means a Family member sees their box
 * whether the week was published under 'family' or only under 'large'.
 */
export function resolveBoxContentsBuckets(
  members: BoxContentsLookupMember[]
): {
  queryShareTypes: string[];
  preferenceByMemberShareType: Map<string, string[]>;
} {
  const union = new Set<string>();
  const preferenceByMemberShareType = new Map<string, string[]>();
  for (const m of members) {
    const prefs = boxContentsShareTypesFor(m);
    preferenceByMemberShareType.set(m.share_type, prefs);
    for (const p of prefs) union.add(p);
  }
  return {
    queryShareTypes: Array.from(union),
    preferenceByMemberShareType,
  };
}
