/**
 * Member delivery-schedule resolver — the "when do I get a box?" helper.
 *
 * This is the member-facing counterpart to cycle.ts (which answers the
 * SAME question for the ops side, one week at a time). Here we project a
 * member's whole-season delivery calendar so the dashboard can show:
 *
 *   - Weekly members:   "a box EVERY week" + the next few Wednesdays.
 *   - Biweekly A/B:      "every OTHER week" + the next few Wednesdays
 *                        ON THEIR parity.
 *
 * Correctness is anchored on the SAME primitives as the ops resolver so
 * the member-facing dates can never drift from what the pack floor sees:
 *
 *   - `season.ts`  supplies firstDelivery (a Wednesday) + totalWeeks.
 *   - `cycle.ts`   supplies the week-parity math (`weekParity`,
 *                  `mondayOfWeek`, `addDays`). A delivery Wednesday belongs
 *                  to Week A when the Monday of its week has parity 0, and
 *                  Week B when parity 1 — IDENTICAL to `isMemberOnThisWeek`.
 *
 * Because the 2026 anchor (Mon 2026-06-08, parity 0 = Week A) lines up
 * with the first delivery (Wed 2026-06-10), Week-A members start on the
 * first delivery and Week-B members start one week later — matching the
 * human convention ("A is the first week").
 *
 * Pure + DST-safe (all date math goes through cycle.ts's noon-UTC anchored
 * helpers). No DB, no UI dependency — unit-testable in isolation.
 */
import type { SeasonSchedule } from './season';
import { lastDelivery } from './season';
import { addDays, mondayOfWeek, weekParity } from './cycle';

/** A member's delivery cadence, derived from their biweekly_week. */
export type DeliveryCadence = 'weekly' | 'biweekly';

export interface MemberScheduleInput {
  /** The controlling season schedule (firstDelivery + totalWeeks). */
  schedule: SeasonSchedule;
  /**
   * members.biweekly_week:
   *   - null → WEEKLY (a box every delivery week)
   *   - 'A'  → biweekly on parity-0 weeks (starts the first delivery)
   *   - 'B'  → biweekly on parity-1 weeks (starts one week later)
   */
  biweeklyWeek: 'A' | 'B' | null;
}

export interface ResolvedSchedule {
  cadence: DeliveryCadence;
  /** 'A' | 'B' for biweekly members; null for weekly. */
  biweeklyWeek: 'A' | 'B' | null;
  /**
   * EVERY delivery date for this member across the whole season, in
   * 'YYYY-MM-DD' order. For a weekly member this is one date per season
   * week; for a biweekly member it's only their parity weeks.
   */
  allDeliveries: string[];
}

/**
 * The parity a Wednesday delivery date belongs to. A delivery's "week" is
 * the Monday→Sunday window containing it (the same window cycle.ts keys
 * cycles on), so we snap the Wednesday back to its Monday and ask
 * `weekParity`. parity 0 = Week A, parity 1 = Week B.
 *
 * Exported for testability + reuse.
 */
export function deliveryParity(deliveryDate: string): 0 | 1 {
  return weekParity(mondayOfWeek(deliveryDate));
}

/**
 * Project a member's full-season delivery calendar.
 *
 * Walks every season delivery week (firstDelivery + 7n for n in
 * [0, totalWeeks)) and keeps the date when the member is "on" that week:
 *   - weekly members keep every week,
 *   - biweekly members keep only weeks whose parity matches their
 *     biweekly_week (A↔0, B↔1).
 */
export function resolveMemberSchedule(input: MemberScheduleInput): ResolvedSchedule {
  const { schedule, biweeklyWeek } = input;
  const cadence: DeliveryCadence = biweeklyWeek ? 'biweekly' : 'weekly';

  const allDeliveries: string[] = [];
  for (let n = 0; n < schedule.totalWeeks; n += 1) {
    const deliveryDate = addDays(schedule.firstDelivery, n * 7);
    if (cadence === 'weekly') {
      allDeliveries.push(deliveryDate);
      continue;
    }
    // Biweekly: keep only the member's parity.
    const parity = deliveryParity(deliveryDate);
    const memberParity = biweeklyWeek === 'A' ? 0 : 1;
    if (parity === memberParity) allDeliveries.push(deliveryDate);
  }

  return { cadence, biweeklyWeek, allDeliveries };
}

/**
 * The next `count` delivery dates on/after `fromDate` (inclusive), drawn
 * from a resolved schedule. `fromDate` defaults to today in Eastern time
 * so the dashboard shows upcoming boxes (a box being packed TODAY still
 * counts as "upcoming").
 *
 * Returns [] once the season is over (no future deliveries) — the caller
 * renders the "that's a wrap" state instead.
 */
export function upcomingDeliveries(
  resolved: ResolvedSchedule,
  count: number,
  fromDate: string = todayET(),
): string[] {
  return resolved.allDeliveries.filter((d) => d >= fromDate).slice(0, count);
}

/** The member's FIRST delivery of the season, or null for an empty schedule. */
export function firstMemberDelivery(resolved: ResolvedSchedule): string | null {
  return resolved.allDeliveries[0] ?? null;
}

/** The member's LAST delivery of the season, or null for an empty schedule. */
export function lastMemberDelivery(resolved: ResolvedSchedule): string | null {
  return resolved.allDeliveries[resolved.allDeliveries.length - 1] ?? null;
}

/**
 * Season-end label for copy ("Through October 7"). Falls back to the
 * member's last delivery when present (biweekly members end on their own
 * last parity week, which may be a week before the season's final week).
 */
export function seasonEndDate(
  resolved: ResolvedSchedule,
  schedule: SeasonSchedule,
): string {
  return lastMemberDelivery(resolved) ?? lastDelivery(schedule);
}

/**
 * Today's calendar date in Eastern time as 'YYYY-MM-DD'. Mirrors the
 * private helper in season.ts (kept local so this module has no reliance
 * on season.ts internals). en-CA → ISO-ordered parts.
 */
function todayET(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** "Wednesday, June 10" — full weekday + month + day, ET-stable (UTC anchor). */
export function prettyDeliveryLong(dateYMD: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${dateYMD}T12:00:00Z`));
}

/** "June 10" — month + day, no weekday (for the upcoming-dates chips). */
export function prettyDeliveryShort(dateYMD: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${dateYMD}T12:00:00Z`));
}
