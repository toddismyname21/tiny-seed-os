/**
 * Vacation-hold week accounting.
 *
 * THE BUG THIS FIXES (real incident, Naomi, 2026-06-16):
 *   A weekly summer-veg member scheduled ONE 3-day hold,
 *   2026-06-15 (Mon) → 2026-06-19 (Fri), covering a single Wednesday
 *   delivery (6/17). Her `members.vacation_weeks_used` jumped by 2 and the
 *   portal told her "that's 2 weeks." It should have been 1.
 *
 *   ROOT CAUSE: every layer (the schedule_vacation_hold RPC, the app-layer
 *   `weeksInRange`, and the /account/vacation/new live preview) computed
 *   weeks as `CEIL((end - start) / 7) + 1` — a calendar-span heuristic, NOT
 *   a count of the member's actual deliveries. For Naomi:
 *     CEIL((4 days) / 7) + 1 = 0 + 1 = 1, + 1 = 2.   ← wrong.
 *   Any hold that doesn't START on a delivery-week boundary inflates by one,
 *   and the heuristic completely ignores biweekly off-weeks (a biweekly
 *   member holding their OFF week was still charged ≥ 1).
 *
 * THE CORRECT RULE — count the member's DELIVERY OCCURRENCES in the range:
 *   A vacation week is "used" only when the member would actually have
 *   RECEIVED a box that the hold now suppresses. So:
 *     weeks_used = number of the member's delivery dates whose
 *                  Monday→Sunday cycle week OVERLAPS [start, end].
 *
 *   This is the EXACT mirror of the ops resolver's exclusion test
 *   (`holdOverlapsWeek` in cycle.ts): a member is excluded from a cycle when
 *   the hold overlaps any day of that cycle's Mon–Sun window. Charging the
 *   member precisely the weeks the resolver excludes them from keeps the
 *   budget honest in BOTH directions — never over- nor under-counting.
 *
 *   - Weekly member  → counts every season Wednesday whose Mon–Sun week the
 *     hold touches. Naomi's Mon–Fri range touches only the week of Wed 6/17
 *     → 1.
 *   - Biweekly member → counts ONLY their ON-parity (A/B) delivery weeks the
 *     hold touches. A biweekly member whose hold lands entirely on their OFF
 *     week → 0 (they weren't getting a box anyway).
 *
 * SEASON-AWARE: deliveries come from `resolveMemberSchedule` (schedule.ts),
 * which already bounds the calendar to the share's season and applies A/B
 * parity. A hold extending past the season's last delivery never counts
 * phantom weeks.
 *
 * DST-SAFE / PURE: all date math flows through cycle.ts's noon-UTC anchored
 * helpers (`addDays`, `mondayOfWeek`). No DB, no UI dependency — fully
 * unit-testable (see vacation.test.ts).
 *
 * ── SQL MIRROR ──────────────────────────────────────────────────────────
 * The authoritative increment happens inside the SECURITY DEFINER RPC
 * `schedule_vacation_hold`. This module is the app-layer source of truth for
 * DISPLAY (the holds list + the new-hold live preview) and MUST stay in sync
 * with the RPC. The corrected RPC SQL lives in
 *   supabase/migrations/0042_vacation_week_count_fix.sql
 * and implements the identical "count member delivery weeks overlapping the
 * range" logic in PL/pgSQL. PM applies that migration; this module makes the
 * UI correct immediately and degrades safely if the migration lags.
 */
import { addDays, mondayOfWeek } from './cycle';
import { getSchedule } from './season';
import { memberIsBiweekly, resolveMemberSchedule } from './schedule';

/** The minimal member shape needed to count vacation weeks for a hold. */
export interface VacationMember {
  /** members.share_type — selects the season calendar (summer_veg, …). */
  share_type: string;
  /** members.biweekly_week — 'A' | 'B' for biweekly; null for weekly. */
  biweekly_week: 'A' | 'B' | null;
  /**
   * members.total_weeks — used (with the season's full weekly count) to
   * detect a biweekly member who hasn't yet been assigned an A/B parity.
   * See `memberIsBiweekly`. Optional; null/undefined → rely on biweekly_week.
   */
  total_weeks?: number | null;
}

/**
 * Does a delivery's Monday→Sunday cycle week overlap the inclusive hold
 * range [startDate, endDate]?
 *
 * Mirrors `holdOverlapsWeek` in cycle.ts EXACTLY (the resolver's exclusion
 * rule), but expressed from the delivery's perspective: the delivery's week
 * runs [weekMonday, weekMonday + 6] and overlaps the hold iff
 *   weekMonday <= endDate AND (weekMonday + 6) >= startDate.
 *
 * Pure; lexicographic compare is correct for zero-padded ISO dates.
 * Exported for testability.
 */
export function deliveryWeekOverlapsHold(
  deliveryDate: string,
  startDate: string,
  endDate: string,
): boolean {
  const weekMonday = mondayOfWeek(deliveryDate);
  const weekSunday = addDays(weekMonday, 6);
  return weekMonday <= endDate && weekSunday >= startDate;
}

/**
 * The number of vacation WEEKS a hold over [startDate, endDate] consumes for
 * `member` — i.e. how many of the member's own delivery weeks the hold
 * actually suppresses.
 *
 * Returns 0 for:
 *   - an inverted range (end < start),
 *   - a share with no configured season (flex / add_on / fall_veg) — those
 *     have no delivery calendar to count against, so they cost no vacation
 *     weeks (consistent with the resolver, which never season-excludes them),
 *   - a hold that lands entirely on a biweekly member's OFF weeks, or
 *   - a hold entirely outside the share's season.
 *
 * Inputs are 'YYYY-MM-DD'. Pure + DST-safe.
 */
export function vacationWeeksUsed(
  member: VacationMember,
  startDate: string,
  endDate: string,
): number {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
  ) {
    return 0;
  }
  if (endDate < startDate) return 0;

  const schedule = getSchedule(member.share_type);
  // No season configured for this share → no delivery calendar → 0 weeks.
  // (flex / add_on never season-exclude in the resolver and ride their box;
  // charging them vacation weeks would be meaningless.)
  if (!schedule) return 0;

  // Biweekly detection mirrors the member-facing copy (schedule.ts): a member
  // is biweekly if biweekly_week is set OR their total_weeks is a reduced
  // (≈ half-season) plan. A weekly member counts every week; a biweekly one
  // counts only their A/B parity weeks.
  const biweekly = memberIsBiweekly({
    biweeklyWeek: member.biweekly_week,
    totalWeeks: member.total_weeks ?? null,
    schedule,
  });

  const resolved = resolveMemberSchedule({
    schedule,
    // A biweekly member with no assigned parity yet defaults to 'A' so we
    // still count a concrete set of weeks (matches the resolver, which treats
    // null biweekly_week as on-week — the most generous, never under-charging
    // a member who later picks a parity). A weekly member passes null.
    biweeklyWeek: biweekly ? (member.biweekly_week ?? 'A') : null,
  });

  let count = 0;
  for (const delivery of resolved.allDeliveries) {
    if (deliveryWeekOverlapsHold(delivery, startDate, endDate)) count += 1;
  }
  return count;
}
