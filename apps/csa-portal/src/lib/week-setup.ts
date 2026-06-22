/**
 * Weekly setup readiness — the single shared check behind BOTH the admin-home
 * "Set up next week" banner AND the /api/cron/flex-list-reminder email.
 *
 * "Setting up a week" means three editor surfaces each have at least one row
 * for that week:
 *
 *   • Box    — box_contents.week_date     (the standard CSA box plan)
 *   • Flex   — flex_inventory.week_starting (the à-la-carte extras catalog)
 *   • Market — market_offerings.week_starting (the farmers-market stall list)
 *
 * All three are keyed to the cycle MONDAY (week_starting / week_date are the
 * same Monday value resolveCycle uses). This module is pure-ish: it takes a
 * Supabase client + a Monday and returns a small readiness object. It makes NO
 * assumptions about WHICH client (cookie-aware admin client on the page, the
 * service-role client in the cron) — both work because each table is read with
 * a bounded HEAD count. Errors are treated as "unknown → not set" so a transient
 * read failure surfaces as a (safe) reminder rather than a false "all ready".
 *
 * Factored out so the banner and the cron can NEVER drift: one definition of
 * "is next week set up", one set of editor links.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { upcomingMondayET, addWeeksYMD, prettyWeek } from './flex-order';

/** The three editor surfaces a week needs before it's "set up". */
export type WeekSetupArea = 'box' | 'flex' | 'market';

/** Per-area readiness + the editor link the team opens to fill it. */
export interface WeekSetupItem {
  area: WeekSetupArea;
  /** Short human label ("Box", "Flex", "Market"). */
  label: string;
  /** TRUE when ≥1 row exists for the week in that area's table. */
  set: boolean;
  /** The admin editor path for this area (origin-relative). */
  href: string;
}

/** The full readiness result for one week. */
export interface WeekSetupReadiness {
  /** The cycle Monday this readiness is for ('YYYY-MM-DD'). */
  week: string;
  /** "Week of Monday, June 29, 2026" — for headers/email copy. */
  weekLabel: string;
  /** The three areas, always in box → flex → market order. */
  items: WeekSetupItem[];
  /** TRUE when all three areas have at least one row. */
  allReady: boolean;
  /** The subset of areas that are still empty (allReady ⟺ this is empty). */
  missing: WeekSetupItem[];
}

/** Editor link per area — the single source the banner + email both use. */
const AREA_HREF: Record<WeekSetupArea, string> = {
  box: '/admin/share-contents',
  flex: '/admin/flex-inventory',
  market: '/admin/market',
};

/** Short label per area. */
const AREA_LABEL: Record<WeekSetupArea, string> = {
  box: 'Box',
  flex: 'Flex',
  market: 'Market',
};

/**
 * The UPCOMING cycle Monday to prep — the next week whose box/flex/market
 * should be set.
 *
 * `upcomingMondayET()` returns TODAY when today is a Monday and otherwise the
 * next Monday. On a Monday the "current" week's setup is already (over)due, so
 * we roll forward a week to point the team at the NEXT week to prepare. On
 * Tue–Sun `upcomingMondayET()` already gives next Monday — exactly the week to
 * prep — so we use it as-is. Net effect: this always names the soonest FUTURE
 * delivery week, never the in-progress one.
 */
export function upcomingSetupWeek(now: Date = new Date()): string {
  const upcoming = upcomingMondayET(now);
  // If upcomingMondayET resolved to TODAY (today IS Monday), that week is the
  // current cycle — advance to the next Monday so we prep the FUTURE week.
  const todayMonday = mondayOfTodayET(now);
  if (upcoming === todayMonday) return addWeeksYMD(upcoming, 1);
  return upcoming;
}

/** This week's Monday in ET ('YYYY-MM-DD') — used to detect "today is Monday". */
function mondayOfTodayET(now: Date): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? '';
  const dayIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const todayIdx = dayIndex[get('weekday')] ?? 0;
  const back = todayIdx === 0 ? 6 : todayIdx - 1;
  const base = `${get('year')}-${get('month')}-${get('day')}`;
  const [yy, mm, dd] = base.split('-').map((s) => Number.parseInt(s, 10));
  const t = Date.UTC(yy, mm - 1, dd, 12, 0, 0) - back * 86_400_000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** Turn a HEAD-count query result into a boolean "has ≥1 row". On error we
 *  return false (unknown → treat as not-set, so the reminder/banner errs toward
 *  prompting setup rather than hiding it). */
function countToSet(
  label: string,
  week: string,
  res: { count: number | null; error: { message: string } | null },
): boolean {
  if (res.error) {
    console.error(`[week-setup] ${label} count failed for ${week}: ${res.error.message}`);
    return false;
  }
  return (res.count ?? 0) > 0;
}

/**
 * Resolve the box/flex/market readiness for a given cycle Monday.
 *
 * Runs the three HEAD counts in parallel — each keyed on its own table's week
 * column (box_contents.week_date, flex_inventory.week_starting,
 * market_offerings.week_starting). Returns a fully-formed readiness object
 * (items always present, in box → flex → market order) so callers can render
 * directly without re-deriving labels or links.
 */
export async function resolveWeekSetup(
  supabase: SupabaseClient<Database>,
  week: string,
): Promise<WeekSetupReadiness> {
  const [boxRes, flexRes, marketRes] = await Promise.all([
    supabase.from('box_contents').select('id', { count: 'exact', head: true }).eq('week_date', week),
    supabase.from('flex_inventory').select('id', { count: 'exact', head: true }).eq('week_starting', week),
    supabase.from('market_offerings').select('id', { count: 'exact', head: true }).eq('week_starting', week),
  ]);

  const boxSet = countToSet('box_contents', week, boxRes);
  const flexSet = countToSet('flex_inventory', week, flexRes);
  const marketSet = countToSet('market_offerings', week, marketRes);

  const setByArea: Record<WeekSetupArea, boolean> = {
    box: boxSet,
    flex: flexSet,
    market: marketSet,
  };

  const items: WeekSetupItem[] = (['box', 'flex', 'market'] as const).map((area) => ({
    area,
    label: AREA_LABEL[area],
    set: setByArea[area],
    href: AREA_HREF[area],
  }));

  const missing = items.filter((i) => !i.set);

  return {
    week,
    weekLabel: prettyWeek(week),
    items,
    allReady: missing.length === 0,
    missing,
  };
}
