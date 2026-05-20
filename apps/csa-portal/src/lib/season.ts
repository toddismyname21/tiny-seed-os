/**
 * CSA season-schedule module.
 *
 * Data-driven season config keyed by `share_type`. The dashboard (and any
 * future page) reads this to decide whether the season is `before`,
 * `active`, or `complete`, how many days remain until Week 1, and which
 * delivery week we're currently in.
 *
 * EXTENSIBILITY: Only `summer_veg` is configured today (2026 season starts
 * Wednesday June 10, runs 18 weeks → last delivery Oct 7). To add another
 * season (spring_veg / flower / flex / fall_veg) the owner only edits the
 * `SEASON_SCHEDULE` map below — no other code changes are required. Every
 * helper takes a `SeasonSchedule` and is pure, so adding a share type can
 * never break the others.
 *
 * TIMEZONE: Pittsburgh is America/New_York. All "today / now" math is done
 * in Eastern time so we never get a UTC off-by-one (e.g. it being "May 19"
 * in UTC while it's still "May 18" 8 PM in ET). We mirror the noon-UTC
 * anchoring trick used by `box.ts` so adding/subtracting whole days is
 * DST-safe.
 */

export interface SeasonSchedule {
  /** First delivery date, 'YYYY-MM-DD' in Eastern time. Always a Wednesday. */
  firstDelivery: string;
  /** Number of weekly deliveries in the season (inclusive of week 1). */
  totalWeeks: number;
}

/**
 * Keyed by `share_type`. Only the summer veg share is known today; the
 * others are intentionally left unconfigured until the owner supplies
 * their start dates. A `share_type` with no entry → `getSchedule` returns
 * `null` and the dashboard falls back to its pre-season-aware behavior.
 */
export const SEASON_SCHEDULE: Record<string, SeasonSchedule> = {
  summer_veg: { firstDelivery: '2026-06-10', totalWeeks: 18 },
  // spring_veg / flower / flex / fall_veg: TBD — owner will provide.
};

/** Season lifecycle phase relative to `now`. */
export type SeasonPhase = 'before' | 'active' | 'complete';

const MS_PER_DAY = 86_400_000;

/**
 * Look up the schedule for a share type. Returns `null` for any share
 * type that has not been configured yet.
 */
export function getSchedule(shareType: string): SeasonSchedule | null {
  return SEASON_SCHEDULE[shareType] ?? null;
}

/**
 * Today's calendar date in Eastern time as a 'YYYY-MM-DD' string.
 * Using `en-CA` gives ISO-ordered parts (YYYY-MM-DD).
 */
function todayET(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Convert a 'YYYY-MM-DD' date to an absolute ms timestamp anchored at noon
 * UTC. We only ever diff two such anchors (both at the same wall offset),
 * so the count of whole days between them is exact and DST-immune.
 */
function dateToAnchorMs(ymd: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return Number.NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

/**
 * The final delivery date of the season, 'YYYY-MM-DD' in ET.
 * = firstDelivery + (totalWeeks - 1) weeks.
 */
export function lastDelivery(schedule: SeasonSchedule): string {
  const firstMs = dateToAnchorMs(schedule.firstDelivery);
  const lastMs = firstMs + (schedule.totalWeeks - 1) * 7 * MS_PER_DAY;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(lastMs));
}

/**
 * Whole days from today (ET) until the first delivery.
 *
 *   - Returns 0 when today IS the first-delivery day.
 *   - Returns a positive number before the season starts.
 *   - Returns a negative number once the first delivery is in the past
 *     (callers in the 'before' phase never see this — they gate on
 *     `seasonPhase` first — but it's well-defined regardless).
 */
export function daysUntilStart(schedule: SeasonSchedule, now: Date = new Date()): number {
  const todayMs = dateToAnchorMs(todayET(now));
  const firstMs = dateToAnchorMs(schedule.firstDelivery);
  return Math.round((firstMs - todayMs) / MS_PER_DAY);
}

/**
 * Season phase relative to `now` (ET):
 *
 *   - 'before'   : today < firstDelivery
 *   - 'active'   : firstDelivery <= today <= (firstDelivery + (totalWeeks-1) weeks)
 *                  i.e. inclusive of the final delivery's whole week. The
 *                  member should still see "this week's box" through the
 *                  end of the last delivery week, so the active window
 *                  extends 6 days past the final Wednesday (Wed → next Tue).
 *   - 'complete' : after the last delivery week has fully elapsed
 */
export function seasonPhase(schedule: SeasonSchedule, now: Date = new Date()): SeasonPhase {
  const todayMs = dateToAnchorMs(todayET(now));
  const firstMs = dateToAnchorMs(schedule.firstDelivery);
  if (todayMs < firstMs) return 'before';

  // Last delivery Wednesday, plus the rest of that delivery week (through
  // the following Tuesday) — 6 extra days — so a member checking on, say,
  // the final Saturday still sees the active dashboard, not "that's a wrap".
  const lastDeliveryMs = firstMs + (schedule.totalWeeks - 1) * 7 * MS_PER_DAY;
  const activeEndMs = lastDeliveryMs + 6 * MS_PER_DAY;
  if (todayMs > activeEndMs) return 'complete';
  return 'active';
}

/**
 * 1-based delivery week index during the season, clamped to
 * [1, totalWeeks].
 *
 * Week boundaries run Wednesday→Tuesday: the first delivery Wednesday and
 * the six days that follow are "Week 1", the next Wednesday starts
 * "Week 2", and so on. Before the season this returns 1 (the upcoming
 * week); after the season it returns `totalWeeks`. Callers should gate on
 * `seasonPhase` first — this is only meaningful in the 'active' phase.
 */
export function currentWeekNumber(schedule: SeasonSchedule, now: Date = new Date()): number {
  const todayMs = dateToAnchorMs(todayET(now));
  const firstMs = dateToAnchorMs(schedule.firstDelivery);
  const dayDelta = Math.round((todayMs - firstMs) / MS_PER_DAY);
  // Before the season: day 0 of week 1.
  const weekIndex = Math.floor(dayDelta / 7) + 1;
  if (weekIndex < 1) return 1;
  if (weekIndex > schedule.totalWeeks) return schedule.totalWeeks;
  return weekIndex;
}

/**
 * Pretty first-delivery label, e.g. "Wednesday, June 10". Formatted in ET
 * from the noon-UTC anchor so the weekday/day never drift across the
 * date line.
 */
export function firstDeliveryPretty(schedule: SeasonSchedule): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateToAnchorMs(schedule.firstDelivery)));
}
