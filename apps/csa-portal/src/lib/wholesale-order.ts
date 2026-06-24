/**
 * wholesale-order.ts — pure helpers shared by the chef ordering page
 * (/order/[token].astro), its submit API, and any tests.
 *
 * Import-safe from server + tests: NO secrets, NO DB calls — just date math
 * and money formatting so the page, the API, and the confirmation email all
 * agree on the delivery date, the edit cutoff, and how prices render.
 *
 * Cadence (per the brief + the old chef cadence, Todd 2026-06-14):
 *   - Delivery is the NEXT Wednesday. "Next" = the Wednesday of the upcoming
 *     order week (this week's Wednesday if we're still before it / early in
 *     the week; otherwise next week's). We anchor on the UPCOMING Monday in ET
 *     and take +2 days, which lands on the correct Wednesday in both cases.
 *     (Note: through Jul 1 2026 delivery is Wednesday.)
 *   - Edit cutoff for that Wednesday delivery is the TUESDAY before, 7 AM ET.
 */

/* ──────────────────────────────────────────────────────────────────
 * Money
 * ────────────────────────────────────────────────────────────────── */

/** Format integer cents as "$4.50". */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Effective per-unit price in cents after a pricing-tier discount.
 * `discountPct` is a whole-number percent (0 = list price, 10 = 10% off).
 * Mirrors the server-side math in place_wholesale_order so the page can show
 * the price the chef will actually be charged. Never returns negative.
 */
export function effectiveUnitCents(listCents: number, discountPct: number | null | undefined): number {
  const pct = Number.isFinite(discountPct as number) ? Number(discountPct) : 0;
  const out = Math.round(listCents * (1 - pct / 100));
  return out < 0 ? 0 : out;
}

/* ──────────────────────────────────────────────────────────────────
 * Date math (DST-safe via noon-UTC anchoring; ET for "today")
 * ────────────────────────────────────────────────────────────────── */

/** Add `days` to a 'YYYY-MM-DD' and return 'YYYY-MM-DD' (noon-UTC anchored). */
export function addDaysYMD(date: string, days: number): string {
  const [y, m, d] = date.split('-').map((s) => Number.parseInt(s, 10));
  const t = Date.UTC(y, m - 1, d, 12, 0, 0) + days * 86_400_000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/**
 * The UPCOMING (or current) Monday in ET as 'YYYY-MM-DD'. If today IS Monday,
 * returns today. This anchors the order week so the chef always orders for the
 * next deliverable Wednesday.
 */
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
  return addDaysYMD(`${get('year')}-${get('month')}-${get('day')}`, daysUntilMon);
}

/** Next Wednesday delivery date ('YYYY-MM-DD') = upcoming Monday + 2 days. */
export function nextDeliveryWednesday(now: Date = new Date()): string {
  return addDaysYMD(upcomingMondayET(now), 2);
}

/** The CURRENT delivery week's Wednesday ('YYYY-MM-DD' in ET). Unlike
 *  nextDeliveryWednesday (which rolls to NEXT week the moment the Tuesday 7 AM
 *  order cutoff passes), this stays on THIS week's Wednesday from Monday through
 *  Sunday, then rolls on Monday. It's the right default for the ADMIN wholesale
 *  views: on/around delivery day they must show TODAY's orders, not next week's
 *  (empty) date — otherwise chefs who ordered look like they "haven't ordered".
 *  (Todd 2026-06-24.) */
export function currentDeliveryWednesday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(now);
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? '';
  const dayIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const todayIdx = dayIndex[get('weekday')] ?? 0;
  const daysSinceMonday = (todayIdx + 6) % 7; // Mon=0, Tue=1, … Sun=6
  const thisMonday = addDaysYMD(`${get('year')}-${get('month')}-${get('day')}`, -daysSinceMonday);
  return addDaysYMD(thisMonday, 2);
}

/** The edit-cutoff calendar date ('YYYY-MM-DD') = the Tuesday before delivery,
 *  7 AM ET cutoff = the Wednesday delivery date − 1 day. (The cutoff TIME is
 *  7 AM ET — see CUTOFF_LABEL.) Name kept as `editCutoffSunday` for import
 *  back-compat. */
export function editCutoffSunday(now: Date = new Date()): string {
  return addDaysYMD(nextDeliveryWednesday(now), -1);
}

/** The upcoming Friday delivery date ('YYYY-MM-DD') in ET — THIS Friday when
 *  today is Sun–Fri, else next Friday. Unlike the Wednesday flow this is NOT
 *  Monday-anchored, so it stays on this week's Friday right up to the Thursday
 *  cutoff. Used by the Friday wholesale push (?day=fri). */
export function nextDeliveryFriday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(now);
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? '';
  const dayIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const todayIdx = dayIndex[get('weekday')] ?? 0;
  const daysUntilFri = (5 - todayIdx + 7) % 7;
  return addDaysYMD(`${get('year')}-${get('month')}-${get('day')}`, daysUntilFri);
}

/** Human edit-cutoff label for chef copy + the confirmation email. */
export const CUTOFF_LABEL = 'Tuesday 7 AM';
/** Friday-delivery edit-cutoff label (Thursday 7 AM ET). */
export const CUTOFF_LABEL_FRIDAY = 'Thursday 7 AM';

/** Validate a 'YYYY-MM-DD' string shape. */
export function isYMD(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** "Wednesday, June 18" — long, friendly, for headers + emails (UTC-stable). */
export function prettyDeliveryDate(dateYMD: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${dateYMD}T12:00:00Z`));
}
