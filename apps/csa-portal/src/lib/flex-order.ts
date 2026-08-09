/**
 * Flex ordering — shared pure helpers (admin form + member page).
 *
 * This module is import-safe from BOTH server (admin APIs, SSR pages) and
 * tests. It holds NO secrets and makes NO DB calls — just pure functions
 * and constants shared across the flex feature so the admin form and the
 * member page agree on units, categories, cutoff math, money formatting,
 * and the low-stock thresholds.
 *
 * Source of truth for:
 *   - The order WINDOW (opens prior Thursday 00:00 ET, closes Tuesday
 *     08:00 ET that delivery week — aligned with the box-swap cutoff,
 *     EVERY week including the Week-1 launch) — gap research M1/M7.
 *   - Low-stock tiers from remaining_qty — gap research M2.
 *   - Dollars ↔ price_cents conversion — admin enters dollars, DB stores cents.
 *   - The category-emoji fallback for items with no photo — gap research M3.
 */

/* ──────────────────────────────────────────────────────────────────
 * Constants
 * ────────────────────────────────────────────────────────────────── */

/** Units offered in the admin "Add item" form. Free text in the DB, but
 *  the form constrains to this curated list (with an escape hatch for an
 *  out-of-band existing unit). */
export const FLEX_UNITS: ReadonlyArray<string> = [
  'each', 'bunch', 'head', 'lb', 'oz', 'pint', 'quart', 'bag', 'dozen', 'bouquet', 'jar',
];

/** Suggested categories (free text in DB; the form offers these + custom). */
export const FLEX_CATEGORIES: ReadonlyArray<string> = [
  'CSA Shares', 'Head Lettuce', 'Salad Mixes', 'Bunching Greens', 'Greens',
  'Roots', 'Herbs', 'Seedlings', 'Coming Soon', 'Other',
];

/** Category → emoji for the no-photo fallback (never a broken <img>). */
const CATEGORY_EMOJI: Record<string, string> = {
  'CSA Shares': '📦',
  'Head Lettuce': '🥬',
  'Salad Mixes': '🥗',
  'Bunching Greens': '🥬',
  'Greens': '🥬',
  'Roots': '🥕',
  'Herbs': '🌿',
  'Seedlings': '🌱',
  'Coming Soon': '✨',
  'Other': '🧺',
};

/** Emoji for an item with no photo, derived from its category. */
export function categoryEmoji(category: string | null | undefined): string {
  if (!category) return '🧺';
  return CATEGORY_EMOJI[category] ?? '🧺';
}

/* ──────────────────────────────────────────────────────────────────
 * Money
 * ────────────────────────────────────────────────────────────────── */

/** Parse a dollars string ("4", "4.50", "$4.50") → integer cents, or null
 *  when it isn't a valid non-negative money value. Rounds to the cent. */
export function dollarsToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const cleaned = String(input).trim().replace(/^\$/, '').replace(/,/g, '');
  if (cleaned === '') return null;
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** price_cents → a plain dollars string for a form `value` ("4.50"). */
export function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Format cents as "$4.50" for display. */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(cents / 100);
}

/* ──────────────────────────────────────────────────────────────────
 * Order window (opens prior Thursday 00:00 ET, closes Tuesday 08:00 ET) — M1 / M7
 *
 * Cadence (America/New_York, DST-aware), set by Todd 2026-06-08, corrected
 * 2026-06-16 to align the flex window with the box-swap cutoff, and the OPEN
 * day moved Friday → Thursday on 2026-06-17:
 *
 *   • Week 1 (week_starting === '2026-06-08'): treated as ALREADY OPEN (the
 *     season just launched). Its CLOSE now matches every other week —
 *     Tuesday 08:00 ET (Todd 2026-06-16; previously a one-time 18:00 ET
 *     override, retired so Week 1 has the same deadline as the rest).
 *   • All weeks (Week 1 + standing): the window CLOSES that week's Tuesday
 *     at 08:00 ET — i.e. (week_starting + 1 day) 08:00 ET, matching the
 *     box-swap cutoff so members have one deadline to remember. Standing
 *     weeks additionally OPEN the prior Thursday at 00:00 ET — i.e.
 *     (week_starting − 4 days); Week 1 is already open.
 *
 * `week_starting` is the MONDAY of the delivery week. ET is UTC−4 in June
 * (EDT) and UTC−5 in winter (EST); we never hardcode the offset — we
 * format the target wall-clock time and resolve its true UTC offset via
 * the Intl API so the math stays correct across DST.
 * ────────────────────────────────────────────────────────────────── */

/** The one-time Week-1 override week (season launch). */
const WEEK_ONE = '2026-06-08';

/** ONE-WEEK CUTOFF EXTENSION (Todd, 2026-08-09): the flex list for the week
 *  of Aug 10 went live over the weekend (same pattern as Aug 3), so the
 *  Wednesday-run close is extended Monday 7 AM → TUESDAY 7 AM ET for THIS
 *  WEEK ONLY. This also keeps the order page resolving to THIS delivery week
 *  (currentOrderWeek) through the extended window instead of rolling to next
 *  week. Weekend-run cutoff (Thu 7 AM) unchanged. Announced to flex members
 *  by email. Remove after 2026-08-11 (harmless if left — the week passes). */
const WEEK_EXTENDED_TUE = '2026-08-10';

/* ──────────────────────────────────────────────────────────────────
 * Pickup-day-aware cutoff (Todd 2026-06-12)
 *
 * Members who pick up at a WEEKEND MARKET (their pickup_location's
 * day_of_week is 'Sat' or 'Sun') get a LATER cutoff: they may place /
 * edit / cancel / skip their flex order until WEDNESDAY 23:59:59 ET of
 * the cycle week — because their box is packed for the weekend run, not
 * the Wednesday run. Members who pick up on Wednesday (or take home
 * delivery, which runs Wednesday) keep the Tuesday 08:00 ET cutoff
 * (every week, including the Week-1 launch).
 *
 * `PickupDay` is the raw `pickup_locations.day_of_week` short code (or
 * null for home delivery / unresolved). `isWeekendMarket()` is the single
 * predicate that decides which cutoff applies; every cutoff-aware helper
 * below accepts an optional `pickupDay` and routes through it so the
 * member page, the API guards, and the tests all agree.
 * ────────────────────────────────────────────────────────────────── */

/** Raw pickup-location weekday code, or null (home delivery / unresolved). */
export type PickupDay = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | null | undefined;

/**
 * Does this pickup day mean a WEEKEND-MARKET member (Sat/Sun pickup)?
 * Weekend-market members get the later Wednesday-midnight cutoff. Wednesday
 * pickup and home delivery (null) both keep the Tuesday cutoff.
 */
export function isWeekendMarket(pickupDay: PickupDay): boolean {
  return pickupDay === 'Sat' || pickupDay === 'Sun';
}

/**
 * Resolve an ET wall-clock instant (a given day-offset from `weekStarting`,
 * at `hour:minute` ET) to an absolute epoch-ms instant — DST-aware.
 *
 * @param weekStarting 'YYYY-MM-DD' Monday of the delivery week.
 * @param dayOffset    days from that Monday (e.g. +1 = Tuesday, −4 = prior Thursday).
 * @param hour         wall-clock hour in ET (0–23).
 * @param minute       wall-clock minute in ET (default 0).
 * @param second       wall-clock second in ET (default 0).
 */
function etWallClockEpochMs(
  weekStarting: string,
  dayOffset: number,
  hour: number,
  minute: number = 0,
  second: number = 0,
): number {
  const [y, m, d] = weekStarting.split('-').map((s) => Number.parseInt(s, 10));
  // Anchor noon UTC (DST-safe across the offset), then shift whole days.
  const mondayUTC = Date.UTC(y, m - 1, d, 12, 0, 0);
  const targetDayUTC = mondayUTC + dayOffset * 86_400_000;
  const dayDate = new Date(targetDayUTC);
  const offsetMin = etOffsetMinutes(dayDate); // e.g. -240 EDT, -300 EST.
  const ty = dayDate.getUTCFullYear();
  const tm = dayDate.getUTCMonth();
  const td = dayDate.getUTCDate();
  // Wall-clock hour:minute:second ET → UTC = (hour:minute:second) − offset.
  return Date.UTC(ty, tm, td, hour, minute, second) - offsetMin * 60_000;
}

/**
 * The order CUTOFF (close) for a cycle, as an absolute epoch-ms instant.
 *
 * The cutoff depends on the member's PICKUP DAY (Todd 2026-06-12):
 *
 *   • WEEKEND-MARKET members (pickupDay 'Sat'/'Sun', `isWeekendMarket` true):
 *     that week's WEDNESDAY (week_starting + 2 days) 23:59:59 ET. Their box
 *     is packed for the weekend run, so they get until Wednesday midnight.
 *   • Wednesday / home-delivery members (pickupDay null/'Wed'/anything else):
 *     that week's Tuesday (week_starting + 1 day) 08:00 ET — EVERY week,
 *     including the Week-1 launch (aligned with the box-swap cutoff).
 *
 * @param weekStarting 'YYYY-MM-DD' Monday of the delivery week.
 * @param pickupDay    raw pickup_locations.day_of_week ('Sat'/'Sun' → Thursday
 *                     cutoff); anything else (Tue market, Wed CSA, home
 *                     delivery, no-pickup) → Monday cutoff.
 *
 * UNIFIED CUTOFF (Todd 2026-06-26): box swaps AND flex à-la-carte share THIS
 * one pickup-day-aware deadline so they can never drift apart. Each member's
 * cutoff lands right before the harvest that fills their order:
 *   • WEDNESDAY RUN  (Tue market + Wed CSA + home delivery) → Monday 7:00 AM ET
 *     (week_starting + 0 days) → Monday harvest.
 *   • WEEKEND RUN    (Sat/Sun markets)                      → Thursday 7:00 AM ET
 *     (week_starting + 3 days) → Thursday harvest.
 * lib/box.ts `isCutoffPassed` delegates here so there is ONE source of truth.
 */
export function cutoffEpochMs(weekStarting: string, pickupDay: PickupDay = null): number {
  if (isWeekendMarket(pickupDay)) {
    // Weekend run (Sat/Sun pickups) harvests Thursday → closes Thursday 7 AM ET.
    return etWallClockEpochMs(weekStarting, 3, 7, 0);
  }
  // Wednesday run (Tue market / Wed CSA / home delivery / no-pickup) harvests
  // Monday → closes Monday 7 AM ET (the cycle Monday itself, week_starting + 0).
  if (weekStarting === WEEK_EXTENDED_TUE) {
    // One-week extension (see WEEK_EXTENDED_TUE): closes TUESDAY 7 AM ET.
    return etWallClockEpochMs(weekStarting, 1, 7, 0);
  }
  return etWallClockEpochMs(weekStarting, 0, 7, 0);
}

/**
 * The order OPEN instant for a cycle, as an absolute epoch-ms instant.
 *
 *   • Week 1 ('2026-06-08'): already open — returns a far-past instant
 *     (the season-launch week is live the moment members land on it).
 *   • Standing weeks: the prior Thursday (week_starting − 4 days) 00:00 ET.
 *
 * @param weekStarting 'YYYY-MM-DD' Monday of the delivery week.
 */
export function opensEpochMs(weekStarting: string): number {
  if (weekStarting === WEEK_ONE) return 0; // already open (epoch 0 = far past).
  // Prior Thursday = Monday − 4 days, at 00:00 ET (Todd 2026-06-17; moved one
  // day earlier from Friday so the flex list opens Thursday).
  return etWallClockEpochMs(weekStarting, -4, 0, 0);
}

/** America/New_York UTC offset in minutes for a given instant (e.g. -240 for EDT). */
function etOffsetMinutes(at: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const parts = dtf.formatToParts(at);
  const get = (t: string): number => Number.parseInt(parts.find((p) => p.type === t)?.value ?? '0', 10);
  const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  // offset = wallclock(as UTC) − actual UTC instant.
  return Math.round((asUTC - at.getTime()) / 60_000);
}

/**
 * Is the cutoff (close) for this week in the past relative to `now`?
 * `pickupDay` selects the member's cutoff (weekend-market → Wed 23:59:59 ET).
 */
export function isPastCutoff(weekStarting: string, now: number = Date.now(), pickupDay: PickupDay = null): boolean {
  return now >= cutoffEpochMs(weekStarting, pickupDay);
}

/** Has the order window for this week NOT yet opened, relative to `now`?
 *  The OPEN instant is the same for everyone (prior Thursday 00:00 ET) — only
 *  the CLOSE shifts by pickup day — so this takes no `pickupDay`. */
export function isBeforeOpen(weekStarting: string, now: number = Date.now()): boolean {
  return now < opensEpochMs(weekStarting);
}

/** Is the order window currently OPEN (opened and not yet closed)?
 *  `pickupDay` selects the member's cutoff (weekend-market → Wed 23:59:59 ET). */
export function isWindowOpen(weekStarting: string, now: number = Date.now(), pickupDay: PickupDay = null): boolean {
  return now >= opensEpochMs(weekStarting) && now < cutoffEpochMs(weekStarting, pickupDay);
}

/**
 * Short human label for the close instant, used in member copy + onboarding.
 * Matches the unified cutoff (Todd 2026-06-26):
 *   • weekend-market members (Sat/Sun)                 → "Thursday 7 AM"
 *   • everyone else (Tue market / Wed CSA / home / —)   → "Monday 7 AM"
 */
export function closeLabel(weekStarting: string, pickupDay: PickupDay = null): string {
  if (isWeekendMarket(pickupDay)) return 'Thursday 7 AM';
  if (weekStarting === WEEK_EXTENDED_TUE) return 'Tuesday 7 AM'; // one-week extension
  return 'Monday 7 AM';
}

/* ──────────────────────────────────────────────────────────────────
 * Low-stock tiers — M2
 * ────────────────────────────────────────────────────────────────── */

export type StockTier = 'plenty' | 'low' | 'critical' | 'sold_out';

/** Classify remaining_qty into the scarcity tier the member UI renders.
 *   >10  → plenty (no badge)
 *   4–10 → low (amber "N left")
 *   1–3  → critical (red "Only N left")
 *   0    → sold_out (dimmed, not orderable)
 */
export function stockTier(remaining: number): StockTier {
  if (remaining <= 0) return 'sold_out';
  if (remaining <= 3) return 'critical';
  if (remaining <= 10) return 'low';
  return 'plenty';
}

/* ──────────────────────────────────────────────────────────────────
 * Week resolution (Monday of a cycle) — shared with cycle.ts intent.
 * ────────────────────────────────────────────────────────────────── */

/** Upcoming (or current) Monday in ET as 'YYYY-MM-DD'. If today IS Monday,
 *  returns today. Used as the admin form's default week. */
export function upcomingMondayET(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? '';
  const dayIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const todayIdx = dayIndex[get('weekday')] ?? 0;
  const daysUntilMon = todayIdx === 1 ? 0 : (1 - todayIdx + 7) % 7;
  const base = `${get('year')}-${get('month')}-${get('day')}`;
  const [yy, mm, dd] = base.split('-').map((s) => Number.parseInt(s, 10));
  const t = Date.UTC(yy, mm - 1, dd, 12, 0, 0) + daysUntilMon * 86_400_000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Resolve the delivery week (Monday 'YYYY-MM-DD') the member should be
 * shown RIGHT NOW, by the ORDER WINDOW — not by the calendar week.
 *
 * This fixes the Tuesday/deadline-day bug: `upcomingMonday()` flips to NEXT
 * Monday as soon as the calendar passes Monday, so on Tuesday (when this
 * week's window is STILL OPEN until 8 AM) the page jumped to next week
 * (which has no inventory and is before-open). Members lost the final hours
 * before the deadline.
 *
 * Contract (per spec FLEX_ORDERING_AUDIT_FIX_2026-06-08 §BUG B):
 *   1. If some week W's window is currently OPEN
 *      (`opensEpochMs(W) ≤ now < cutoffEpochMs(W)`), return W — the
 *      member orders for the week they can still order for.
 *   2. Otherwise `now` is BETWEEN windows (after this week's close, before
 *      next week's open). Return the NEXT week whose window opens in the
 *      future (`now < opensEpochMs(W)`); the page renders its before-open
 *      state for it.
 *
 * Worked examples (Week-1 closes Tue 6/9 08:00 ET; 6/15 opens Thu 6/11):
 *   • Mon 6/8           → 6/8  (Week-1 open)
 *   • Tue 6/9 07:00 ET  → 6/8  (Week-1 still open, closes 08:00)
 *   • Tue 6/9 09:00 ET  → 6/15 (Week-1 closed; 6/15 not open till Thu — before-open)
 *   • Wed 6/10          → 6/15 (Week-1 closed; 6/15 not open till Thu — before-open)
 *   • Thu 6/11          → 6/15 (6/15 window opens Thu 00:00 ET)
 *
 * Implementation: enumerate candidate Mondays in a window around `now`
 * (−2 … +3 weeks covers every transition, since a window spans at most
 * Thu→Tue of the following week). Among them pick the OPEN week if any,
 * else the soonest week that opens in the future. Falls back to the
 * upcoming Monday if nothing matches (defensive — shouldn't happen).
 */
export function currentOrderWeek(now: number = Date.now(), pickupDay: PickupDay = null): string {
  // The Monday of the week containing `now`, in ET, as our search anchor.
  const anchorMonday = upcomingMondayET_mondayOfWeek(new Date(now));

  // Candidate delivery weeks around the anchor. A standing week's window
  // runs prior-Thursday → that-week's-Tuesday (or Wednesday for a weekend-
  // market member), so the open week for any instant is at most one week
  // away from the calendar week; we scan a generous range to be safe and
  // deterministic. The member's `pickupDay` selects which cutoff applies so
  // a weekend-market member stays on the CURRENT week through Wed night
  // instead of jumping early to the next (before-open) week.
  const candidates: string[] = [];
  for (let w = -2; w <= 3; w += 1) candidates.push(addWeeksYMD(anchorMonday, w));

  // 1. An OPEN window wins. Pick the EARLIEST open week (there is normally
  //    exactly one; earliest is the correct tie-break — you finish the
  //    nearer deadline first).
  let earliestOpen: string | null = null;
  for (const wk of candidates) {
    if (now >= opensEpochMs(wk) && now < cutoffEpochMs(wk, pickupDay)) {
      if (earliestOpen === null || wk < earliestOpen) earliestOpen = wk;
    }
  }
  if (earliestOpen) return earliestOpen;

  // 2. No open window — we're between windows. Return the SOONEST week
  //    whose window opens in the future (before-open state).
  let soonestUpcoming: string | null = null;
  for (const wk of candidates) {
    if (now < opensEpochMs(wk)) {
      if (soonestUpcoming === null || wk < soonestUpcoming) soonestUpcoming = wk;
    }
  }
  if (soonestUpcoming) return soonestUpcoming;

  // Defensive fallback (e.g. a far-future `now` past every candidate's
  // close): the upcoming Monday, matching the legacy behaviour.
  return upcomingMondayET(new Date(now));
}

/**
 * The Monday (ET, 'YYYY-MM-DD') of the week CONTAINING `now`. Unlike
 * `upcomingMondayET` (which returns the NEXT Monday on Tue–Sun), this
 * anchors to the CURRENT week's Monday so `currentOrderWeek` can scan
 * symmetrically around the present week. Internal helper.
 */
function upcomingMondayET_mondayOfWeek(now: Date): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? '';
  const dayIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const todayIdx = dayIndex[get('weekday')] ?? 0;
  // Days back to this week's Monday: Sun → 6, else todayIdx − 1.
  const back = todayIdx === 0 ? 6 : todayIdx - 1;
  const base = `${get('year')}-${get('month')}-${get('day')}`;
  const [yy, mm, dd] = base.split('-').map((s) => Number.parseInt(s, 10));
  const t = Date.UTC(yy, mm - 1, dd, 12, 0, 0) - back * 86_400_000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** Add `weeks` to a 'YYYY-MM-DD' Monday, returning 'YYYY-MM-DD'. */
export function addWeeksYMD(date: string, weeks: number): string {
  const [y, m, d] = date.split('-').map((s) => Number.parseInt(s, 10));
  const t = Date.UTC(y, m - 1, d, 12, 0, 0) + weeks * 7 * 86_400_000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** Pretty week label: "Week of Monday, June 8, 2026". */
export function prettyWeek(weekStarting: string): string {
  return 'Week of ' + new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${weekStarting}T12:00:00Z`));
}

/** Validate a 'YYYY-MM-DD' string shape. */
export function isYMD(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/* ──────────────────────────────────────────────────────────────────
 * Window labels for the closed / before-open member UX (Todd 2026-06-08)
 * ────────────────────────────────────────────────────────────────── */

/**
 * Format an absolute epoch-ms instant as a warm, concrete ET phrase,
 * e.g. "Thursday, June 11 at 12:00 AM" or "Tuesday, June 16 at 7:00 AM".
 * Always America/New_York so members read their own local farm time. The
 * Week-1 open instant (epoch 0) is a sentinel for "already open" and must
 * NOT be formatted as a date — callers guard that.
 */
export function formatWindowInstant(epochMs: number): string {
  const day = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York',
  }).format(new Date(epochMs));
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York',
  }).format(new Date(epochMs));
  return `${day} at ${time}`;
}

/**
 * The concrete open + close labels for a delivery week, for the closed /
 * before-open brand-moment copy. `opensLabel` is null when the week is the
 * already-open Week-1 sentinel (no meaningful open date to show).
 */
export function windowLabels(
  weekStarting: string,
  pickupDay: PickupDay = null,
): { opensLabel: string | null; closesLabel: string } {
  const opensMs = opensEpochMs(weekStarting);
  return {
    opensLabel: opensMs > 0 ? formatWindowInstant(opensMs) : null,
    closesLabel: formatWindowInstant(cutoffEpochMs(weekStarting, pickupDay)),
  };
}
