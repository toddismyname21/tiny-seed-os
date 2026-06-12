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

/**
 * Fallback pickup time shown in the "Next delivery" banner when a stop has
 * no `pickup_locations.time_start` configured. Todd flagged 2 PM as a
 * PLACEHOLDER — change it HERE, in one place, when the real cutoff is known.
 */
export const DEFAULT_PICKUP_TIME = '2 PM';

/** A member's delivery cadence, derived from their biweekly_week. */
export type DeliveryCadence = 'weekly' | 'biweekly';

/**
 * A pickup weekday — the shape stored in `pickup_locations.day_of_week`.
 * Matches cycle.ts's `WeekdayCode`; re-declared locally so this member-facing
 * module stays free of cross-imports from the ops resolver.
 */
export type PickupDay = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

/**
 * Day-offset (in whole days) from the cycle's delivery WEDNESDAY anchor to the
 * member's ACTUAL pickup day, within the SAME Monday→Sunday cycle week.
 *
 * The whole fulfillment season is anchored on Wednesdays (season.ts
 * firstDelivery is always a Wednesday; schedule.ts projects Wednesdays; the
 * ops cycle keys on the Monday of that Wed's week). But members pick up on
 * DIFFERENT weekdays within that one Mon–Sun cycle window:
 *
 *   - Lawrenceville (Tue) is the day BEFORE the Wednesday → offset −1.
 *   - CSA stops + home delivery (Wed) are the anchor itself → offset 0.
 *   - Weekend markets (Sat) come AFTER the Wednesday → offset +3.
 *
 * So a Week-B member whose cycle Wednesday is Jun 17 but who picks up at a
 * Saturday market actually gets their box Jun 20 (Jun 17 + 3) — NOT Jun 17.
 * Showing the bare Wednesday anchor was the bug a real member reported
 * (banner said "Wednesday, June 17 … Sewickley Market" while Sewickley is a
 * Saturday stop / pickup is Jun 20).
 *
 * null / unknown day → 0 (treat as the Wednesday anchor — home delivery and
 * any unconfigured stop default to the anchor day).
 */
const PICKUP_DAY_OFFSET: Record<PickupDay, number> = {
  Mon: -2, // before the Wednesday anchor, same Mon–Sun week
  Tue: -1, // Lawrenceville — Tuesday precedes the Wednesday anchor
  Wed: 0,  // CSA stops + home delivery — the anchor itself
  Thu: 1,
  Fri: 2,
  Sat: 3,  // weekend markets (Bloomfield / Sewickley) — after the anchor
  Sun: 4,  // end of the Mon–Sun cycle week
};

/**
 * Shift a cycle's delivery WEDNESDAY (YYYY-MM-DD) to the member's ACTUAL
 * pickup date, given their `pickup_locations.day_of_week`. Pure + DST-safe —
 * delegates to cycle.ts's noon-UTC `addDays`.
 *
 * This is the single source of truth for "the member SEES which date?": every
 * member-facing surface (dashboard banner, /account next-box line, /box title)
 * must run the cycle Wednesday through this so the displayed date matches the
 * member's real pickup day. The OPS side keeps anchoring on the Wednesday
 * (the pack cutoff + cycle key are Wednesday/Monday) — only the DISPLAYED date
 * shifts. Biweekly + flex semantics are unchanged: which Wednesday a member is
 * "on" is resolved upstream (resolveMemberSchedule); this only re-labels it.
 *
 *   pickupDateForWeek('2026-06-17', 'Sat') → '2026-06-20'  (Saturday market)
 *   pickupDateForWeek('2026-06-17', 'Tue') → '2026-06-16'  (Lawrenceville)
 *   pickupDateForWeek('2026-06-17', 'Wed') → '2026-06-17'  (CSA stop / home)
 *   pickupDateForWeek('2026-06-17', null)  → '2026-06-17'  (unknown → anchor)
 */
export function pickupDateForWeek(
  deliveryWednesday: string,
  pickupDay: PickupDay | null | undefined,
): string {
  if (!pickupDay) return deliveryWednesday;
  const offset = PICKUP_DAY_OFFSET[pickupDay] ?? 0;
  return offset === 0 ? deliveryWednesday : addDays(deliveryWednesday, offset);
}

/**
 * Robustly decide whether a member is on a BI-WEEKLY share.
 *
 * `members.biweekly_week` alone is ambiguous: it is null for a true WEEKLY
 * member AND for a biweekly member who signed up biweekly but hasn't yet
 * picked Week A/B (the Shopify sync sets a reduced `total_weeks` for biweekly
 * orders — e.g. summer_veg 9 vs 18 — but leaves biweekly_week null until the
 * member chooses). So a member is biweekly when EITHER:
 *   - biweekly_week is set ('A' | 'B'), OR
 *   - their total_weeks is less than the season's full weekly count
 *     (i.e. they were sold a "ceil(totalWeeks/2)" biweekly plan).
 *
 * When the controlling season schedule is unknown (e.g. a flower-only share
 * while flower dates are still TBD), we fall back to biweekly_week alone —
 * never guess "biweekly" without evidence, so a null member reads as weekly.
 *
 * Use this for any MEMBER-FACING "every week vs every other week" copy so the
 * account hub and the dashboard never disagree (a true weekly member must
 * NEVER be shown biweekly framing).
 */
export function memberIsBiweekly(input: {
  biweeklyWeek: 'A' | 'B' | null;
  totalWeeks: number | null | undefined;
  schedule: SeasonSchedule | null;
}): boolean {
  if (input.biweeklyWeek === 'A' || input.biweeklyWeek === 'B') return true;
  if (
    input.schedule &&
    typeof input.totalWeeks === 'number' &&
    input.totalWeeks > 0 &&
    input.totalWeeks < input.schedule.totalWeeks
  ) {
    return true;
  }
  return false;
}

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

/**
 * Format a single pickup time for the "after [2 PM]" banner copy.
 *
 * Accepts a `pickup_locations.time_start` value (`'HH:MM'` or `'HH:MM:SS'`),
 * returning a human label like "2 PM" / "2:30 PM". Falls back to the
 * single-source-of-truth `DEFAULT_PICKUP_TIME` constant when the stop has no
 * time configured (null/blank/unparseable) — so the banner ALWAYS reads
 * "after <time>" and the placeholder is changeable in exactly one place.
 */
export function prettyPickupTime(timeStart: string | null | undefined): string {
  if (!timeStart) return DEFAULT_PICKUP_TIME;
  const m = /^(\d{1,2}):(\d{2})/.exec(timeStart.trim());
  if (!m) return DEFAULT_PICKUP_TIME;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(min) || h > 23 || min > 59) {
    return DEFAULT_PICKUP_TIME;
  }
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 === 0 ? 12 : h % 12;
  return min === 0 ? `${h} ${period}` : `${h}:${String(min).padStart(2, '0')} ${period}`;
}
