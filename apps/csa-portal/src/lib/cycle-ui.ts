/**
 * Tiny UI helpers shared by the admin Phase-1 ops pages.
 *
 * - `weekOptions(anchor)` — list of upcoming + recent Mondays for the
 *   <select> on every admin page (so Todd can flip to "Last week" or
 *   "Next week" without typing a date).
 * - `formatCents(n)` — $1.50 from 150 (cents).
 * - `csaDistDates(weekStarting)` — Tue/Wed/Sat ISO dates for the cycle
 *   (duplicates resolveCycle.distribution_dates so static UI can call it
 *   without a DB round-trip).
 *
 * Pure / server-or-client safe.
 */
import { addDays, mondayOfWeek, prettyShortDate, upcomingMonday } from './cycle.ts';

export interface WeekOption {
  /** YYYY-MM-DD (Monday). */
  value: string;
  /** "Week of Jun 8" + suffix tag ("this week" / "next week" / "last week"). */
  label: string;
}

/**
 * The single canonical WEEK label — a Mon–Sun date RANGE, e.g.
 * "Week of Jun 22 – Jun 28" (CSA_GLOSSARY_OF_TRUTH §3/§5: always a range,
 * NEVER "this / last / next week"). `input` may be any day in the week; we
 * snap to the cycle Monday first, so callers can pass a Monday OR a delivery
 * Wednesday and get the same range. Weekday + year are stripped from
 * `prettyShortDate` so the two ends read cleanly ("Jun 22 – Jun 28").
 *
 * This is the ONE builder of the glossary range string — `weekOptions` and
 * the member dashboard both call it so they can never drift.
 */
export function weekRangeLabel(input: string): string {
  const mon = mondayOfWeek(input);
  const sun = addDays(mon, 6);
  const strip = (d: string): string => prettyShortDate(d).replace(/^[A-Za-z]+, /, '');
  return `Week of ${strip(mon)} – ${strip(sun)}`;
}

/**
 * Build a friendly week-picker list anchored at the current cycle.
 *
 * Returns 5 options: 1 past week, current week, and 3 upcoming weeks.
 * Selected option for "this week" is the current Monday.
 */
export function weekOptions(now: Date = new Date()): WeekOption[] {
  const thisMon = mondayOfWeek(upcomingMonday(now));
  const out: WeekOption[] = [];
  // -1 past week through +3 upcoming
  for (let offset = -1; offset <= 3; offset += 1) {
    const wk = addDays(thisMon, offset * 7);
    // Date-RANGE label — no ambiguous "this/last/next week" (Todd 2026-06-18).
    // A CSA week runs Mon–Sun and has FOUR pickup days (Tue Lawrenceville,
    // Wed delivery, Sat markets, Sun South Side), so we name the whole range
    // rather than implying a single Wednesday. weekRangeLabel is the shared
    // builder of this glossary string (also used by the member dashboard).
    out.push({
      value: wk,
      label: weekRangeLabel(wk),
    });
  }
  return out;
}

/** "$1.50" from 150 (cents). Returns "—" for non-finite input. */
export function formatCents(c: number | null | undefined): string {
  if (c === null || c === undefined || !Number.isFinite(c)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(c / 100);
}

/** Tue/Wed/Sat distribution dates for a Mon-anchored cycle. */
export function csaDistDates(weekStarting: string): {
  Tue: string;
  Wed: string;
  Sat: string;
} {
  return {
    Tue: addDays(weekStarting, 1),
    Wed: addDays(weekStarting, 2),
    Sat: addDays(weekStarting, 5),
  };
}
