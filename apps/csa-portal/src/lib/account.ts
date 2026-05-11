/**
 * Account-page shared helpers.
 *
 * Used by `/account/*` pages and `/api/account/*` routes.
 */

/**
 * Compute the integer number of weeks covered by an inclusive date
 * range, matching the SQL function logic exactly:
 *
 *   weeks = ceil((end - start) / 7) + 1
 *
 * Same-day → 1 week, 7-day (Mon-Sun) → 1 week, 8-day → 2 weeks.
 *
 * Inputs are 'YYYY-MM-DD' strings.
 */
export function weeksInRange(startDate: string, endDate: string): number {
  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  if (!start || !end) return 0;
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (days < 0) return 0;
  return Math.ceil(days / 7) + 1;
}

/**
 * Parse a 'YYYY-MM-DD' string into a UTC-midnight Date. Returns null
 * if invalid.
 */
function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * Today as 'YYYY-MM-DD' in America/New_York (the farm's calendar).
 */
export function todayET(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/**
 * Pretty-print a 'YYYY-MM-DD' as 'May 13, 2026'.
 */
export function prettyDate(s: string | null | undefined): string {
  if (!s) return '';
  // Anchor at noon UTC to avoid the off-by-one DST surprise.
  return new Intl.DateTimeFormat('en-US', {
    weekday: undefined,
    month: 'long', day: 'numeric', year: 'numeric',
    timeZone: 'America/New_York',
  }).format(new Date(`${s}T12:00:00Z`));
}

/**
 * Compute hold status from start/end + stored status. We expose this
 * helper so the UI shows accurate "Active now" labels without waiting
 * for a cron to flip status='scheduled' → 'active'.
 *
 * Returns the visual status to display, NOT the DB row status.
 */
export type DisplayHoldStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export function displayHoldStatus(
  storedStatus: string,
  startDate: string,
  endDate: string,
  now: string = todayET()
): DisplayHoldStatus {
  if (storedStatus === 'cancelled') return 'cancelled';
  if (storedStatus === 'completed') return 'completed';
  if (now < startDate) return 'scheduled';
  if (now > endDate) return 'completed';
  return 'active';
}

/**
 * Map a vacation-hold display status to a Badge variant + label.
 */
export function holdBadge(status: DisplayHoldStatus): { variant: 'green' | 'amber' | 'sky' | 'gray'; label: string } {
  switch (status) {
    case 'active':    return { variant: 'green', label: 'Active now' };
    case 'scheduled': return { variant: 'sky',   label: 'Scheduled' };
    case 'completed': return { variant: 'gray',  label: 'Completed' };
    case 'cancelled': return { variant: 'gray',  label: 'Cancelled' };
  }
}

/**
 * Map server-side vacation/preference error codes to user-friendly copy.
 */
export const VACATION_ERROR_COPY: Record<string, string> = {
  invalid_input: "We couldn't read that — please check your dates and try again.",
  start_date_in_past: "Vacation holds can't start in the past. Pick a date today or later.",
  invalid_date_range: 'End date must be after start date.',
  insufficient_vacation_weeks: "That's more weeks than you have left this season.",
  overlapping_hold: 'You already have a vacation hold during those dates.',
  member_not_found: "We couldn't find that share on your account.",
  hold_not_found: "We couldn't find that hold — it may already be cancelled.",
  cannot_cancel: "That hold can't be cancelled — it's already completed.",
  network: "We couldn't reach the server. Please try again.",
};

export const PREFS_ERROR_COPY: Record<string, string> = {
  too_many_dislikes: 'Whoa — that\'s a lot. Please keep it under 50 items.',
  notes_too_long: 'Delivery notes are limited to 500 characters.',
  invalid_input: "We couldn't save that — please check your entries and try again.",
  invalid_preference: 'Please choose a valid contact preference.',
  network: "We couldn't reach the server. Please try again.",
};

export const PICKUP_ERROR_COPY: Record<string, string> = {
  invalid_input: 'Please pick a pickup location or enter a delivery address.',
  location_not_found: 'That pickup location is no longer available.',
  location_full: 'That location is at capacity. Try another or contact us.',
  member_not_found: "We couldn't find that share on your account.",
  network: "We couldn't reach the server. Please try again.",
};

export const BIWEEKLY_ERROR_COPY: Record<string, string> = {
  invalid_input: 'Please choose Week A, Week B, or "no preference".',
  no_active_share: "We don't have an active share on your account yet.",
  network: "We couldn't reach the server. Please try again.",
};
