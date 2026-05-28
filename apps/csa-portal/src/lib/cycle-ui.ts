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
    let suffix = '';
    if (offset === 0) suffix = ' (this week)';
    else if (offset === 1) suffix = ' (next week)';
    else if (offset === -1) suffix = ' (last week)';
    out.push({
      value: wk,
      label: `Week of ${prettyShortDate(wk).replace(/^[A-Za-z]+, /, '')}${suffix}`,
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
