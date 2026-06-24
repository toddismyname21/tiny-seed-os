/**
 * Fulfillment Cycle resolver — the foundation of CSA Operations.
 *
 * A Cycle Instance is a single week-instance of the order → harvest →
 * pack → distribute pipeline. There is ONE cycle per week (cycle_code =
 * 'WEEKLY'), keyed by `week_starting` (the Monday of that week). Every
 * downstream report (vendor orders, harvest list, pack sheets, labels,
 * per-stop manifests, pack-day dashboard) is a *view* of the same
 * resolution — so a vacation hold submitted at 5:59 AM Monday is
 * reflected everywhere on the next query, with no jobs to re-run.
 *
 * See docs/specs/CSA_OPERATIONS_ADMIN_SPEC.md §2 + §5 for the full spec.
 *
 * Critical correctness rules:
 *
 *   1. **Biweekly-at-the-query-level**: members on the off-week of their
 *      biweekly schedule are EXCLUDED at the data layer (not as a
 *      display filter). `isMemberOnThisWeek` is the single source of
 *      truth for "is this member receiving a box this week?" and is used
 *      by EVERY aggregation in this module.
 *
 *   2. **Holds-as-query-foundation**: a `vacation_holds` row whose range
 *      overlaps the cycle's distribution week excludes the member from
 *      `members[]`, which in turn excludes them from every other view.
 *      No caching — the resolver runs live on every page request.
 *
 *   3. **Real read of `box_contents`**: the box composition served from the
 *      resolver is the LIVE plan, read from `box_contents` — the single
 *      source of truth the rest of the app already uses. Rows are keyed by
 *      `week_date` (the cycle Monday) and `share_type` ('large'/'small').
 *      published_at is no longer carried (box_contents has no publish gate);
 *      the resolver always renders whatever is in box_contents.
 *
 *   4. **All distribution days inside ONE cycle**: per Todd 2026-05-27,
 *      there is one weekly cutoff (Mon 6 AM). A single cycle's
 *      `byDistributionDay` slices the same member set into Tue
 *      (Lawrenceville), Wed (CSA stops + home delivery), and Sat
 *      (Bloomfield + Sewickley markets). The harvest list uses two
 *      tabs (Mon harvest = Tue+Wed; Thu harvest = Sat) but draws from
 *      the same cycle.
 *
 * This module is server-only (it uses SupabaseClient<Database>). The
 * public functions are pure with respect to their inputs.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from './database.types';
import { LARGE_SIZES, SMALL_SIZES } from './share-buckets';
import { getSchedule, lastDelivery, type SeasonSchedule } from './season';

/* ──────────────────────────────────────────────────────────────────
 * Public types
 * ────────────────────────────────────────────────────────────────── */

export type CycleCode = 'WEEKLY';

/** A short two-letter weekday code matching pickup_locations.day_of_week. */
export type WeekdayCode = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

/** Size buckets the resolver collapses share_size into for box-plan lookup. */
export type SizeBucket = 'small' | 'large' | 'unknown';

/** Add-on category derived from members.notes / vendor add_on_types. */
export type AddOnType = 'mushroom' | 'bread' | 'cheese' | 'coffee' | 'eggs' | 'unknown';

/** Frequency of an add-on subscription — drives whether it ships this cycle. */
export type AddOnFrequency = 'weekly' | 'biweekly' | 'unknown';

/** Single item inside a box plan's contents JSONB array. */
export interface BoxContentLine {
  crop: string;
  qty: number;
  unit: string;
  notes?: string;
}

/**
 * A member as resolved into the cycle. Carries enough to drive every
 * downstream report without re-querying.
 */
export interface CycleMember {
  /** members.id */
  id: string;
  /** members.customer_id */
  customer_id: string;
  /** members.share_type — every distinct share is a separate row. */
  share_type: string;
  /** Raw enum from members.share_size — see SizeBucket for the derived bucket. */
  share_size: string | null;
  /** Bucketed size — drives weekly_box_plan lookup. */
  size_bucket: SizeBucket;
  /** members.biweekly_week */
  biweekly_week: 'A' | 'B' | null;
  /** Whether this member is RECEIVING a box this cycle (true) or it's
   *  their off-week (false). False members are EXCLUDED from `members[]`
   *  in the result — this is exposed on the row itself for tests + audits. */
  on_this_week: boolean;
  /** Customer display name (joined). */
  contact_name: string;
  /** Customer email (joined; for owe-flag emails). */
  email: string;
  /** members.payment_status — controls the "⚠ owes" flag. */
  payment_status: string | null;
  /** members.pickup_location_id — null for home delivery members. */
  pickup_location_id: string | null;
  /** members.delivery_address — non-null means home delivery. */
  delivery_address: string | null;
  /** members.notes — parsed for add-on type/frequency. */
  notes: string | null;
  /** members.customization_allowed — only summer_veg should be true. */
  customization_allowed: boolean;
  /** members.swap_credits — surfaced for the per-stop manifest + admin. */
  swap_credits: number;
  /** Resolved add-on type (only meaningful when share_type='add_on'). */
  addon_type: AddOnType;
  /** Resolved add-on frequency (only meaningful when share_type='add_on'). */
  addon_frequency: AddOnFrequency;
  /** Joined pickup location (null for home delivery). */
  pickup_location: ResolvedPickupLocation | null;
  /** Member preferences: allergies drive automatic substitutions on labels. */
  allergies: string[];
  dislikes: string[];
  delivery_notes: string | null;
  /**
   * Migration 0041 — vacation-hold disposition. TRUE when this member is
   * receiving THIS week's box only because they MOVED a held week onto it
   * (their hold has disposition='move' AND move_to_week === this cycle's
   * week_starting). Lets the pack floor flag "moved in" boxes. For a member
   * on their normal schedule this is false.
   */
  moved_in: boolean;
  /**
   * When `moved_in` is true, the ORIGINAL week the member moved AWAY from —
   * the week_starting (Monday) of their hold's overlapping week — for a
   * "moved from <date>" admin tag. Null when `moved_in` is false.
   */
  moved_from: string | null;
}

export interface ResolvedPickupLocation {
  id: string;
  name: string;
  city: string | null;
  zip: string | null;
  day_of_week: WeekdayCode | null;
  time_start: string | null;
  time_end: string | null;
  host_name: string | null;
  host_phone: string | null;
}

/** Resolved box contents for one member: base + applied swaps + allergy subs. */
export interface ResolvedBoxComposition {
  /** Final shipping list. */
  items: BoxContentLine[];
  /** Items the member swapped IN this cycle (status=locked). */
  swapped_in: string[];
  /** Items the member swapped OUT this cycle (status=locked). */
  swapped_out: string[];
  /** Items auto-substituted due to allergies (no swap credit used). */
  allergy_subs: Array<{ removed: string; reason: string }>;
}

/** Per-stop totals for the Pack-Day Dashboard + per-stop manifest cover. */
export interface StopTotals {
  /** Stop id, or the sentinel 'home_delivery' bucket. */
  stop_id: string;
  /** Display name (stop name OR "Home delivery"). */
  stop_name: string;
  /** day_of_week from the stop (Tue/Wed/Sat) OR 'Wed' for home delivery. */
  day_of_week: WeekdayCode | null;
  boxes_small: number;
  boxes_large: number;
  addons: Record<AddOnType, number>;
  flex_orders: number;
  /** Count of members at this stop with payment_status != 'Paid'. */
  owes_count: number;
}

/** Per-distribution-day rollup of members + their composition. */
export interface DistributionDayBucket {
  day: WeekdayCode;
  members: CycleMember[];
}

/** The cycle resolution — the single source-of-truth object every report consumes. */
export interface ResolvedCycle {
  cycle_code: CycleCode;
  /** 'YYYY-MM-DD' — Monday of the week. */
  week_starting: string;
  /** Distribution dates inside this cycle, keyed by weekday. */
  distribution_dates: {
    Tue: string;
    Wed: string;
    Sat: string;
  };
  /** Active members RECEIVING a box this cycle (biweekly + hold filtered). */
  members: CycleMember[];
  /** Members EXCLUDED for biweekly off-week — surfaced for transparency. */
  excluded_biweekly: CycleMember[];
  /** Members EXCLUDED for vacation_holds overlapping the week. */
  excluded_on_hold: CycleMember[];
  /**
   * Members EXCLUDED because their share's SEASON does not cover this week
   * (e.g. spring_veg on a June week, or flower before its Jun 24 opener).
   * Surfaced for transparency/audits; share types with no configured season
   * (flex / add_on) never appear here. See `isShareInSeasonForWeek`.
   */
  excluded_out_of_season: CycleMember[];
  /**
   * Migration 0041 — members whose overlapping hold has disposition='donate'.
   * They are EXCLUDED from `members` (they don't receive a box) but the farm
   * still PACKS their box as a donation and reallocates it. The pack team
   * uses `donated.length` for the "Donations: N boxes" tally. A subset of
   * `excluded_on_hold` — donate members appear in BOTH (excluded AND here)
   * so existing exclusion consumers are unaffected.
   */
  donated: CycleMember[];
  /** Grouped by pickup_location_id (or 'home_delivery'). */
  byStop: Map<string, CycleMember[]>;
  /** Grouped by Tue/Wed/Sat (home delivery → Wed). */
  byDistributionDay: Map<WeekdayCode, CycleMember[]>;
  /** Per-member resolved box composition (only for share_type='summer_veg'). */
  boxCompositionByMember: Map<string, ResolvedBoxComposition>;
  /** Total add-on subscriptions counted for this cycle (respects frequency). */
  addOnTotals: Record<AddOnType, { weekly: number; biweekly: number; total: number }>;
  /** Aggregated flex_orders for this cycle (status in 'locked' or 'fulfilled'). */
  flexOrderTotals: {
    items: Array<{ flex_item_id: string; name: string | null; qty: number; total_cents: number }>;
    grand_total_cents: number;
    order_count: number;
  };
  /** Per-stop totals (for manifest covers + pack-day dashboard). */
  totalsByStop: Map<string, StopTotals>;
  /** Stops with at least one member this cycle, sorted by day then name. */
  activeStops: StopTotals[];
  /** The published box plans for this cycle, keyed by share_size. */
  boxPlanBySize: Map<string, { contents: BoxContentLine[]; published_at: string | null }>;
}

/* ──────────────────────────────────────────────────────────────────
 * Pure helpers (testable without a database)
 * ────────────────────────────────────────────────────────────────── */

const HOME_DELIVERY_STOP_ID = 'home_delivery';

/**
 * Bucket members.share_size into 'small' | 'large' | 'unknown'. Mirrors
 * share-buckets.ts but stays self-contained so this module has no UI
 * dependency.
 */
export function bucketSize(s: string | null | undefined): SizeBucket {
  if (!s) return 'unknown';
  if (LARGE_SIZES.has(s)) return 'large';
  if (SMALL_SIZES.has(s)) return 'small';
  return 'unknown';
}

/**
 * Days between two YYYY-MM-DD dates as a non-negative integer. Pure;
 * timezone-stable because we anchor at noon UTC.
 */
function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/**
 * Add `days` to a YYYY-MM-DD string and return the new YYYY-MM-DD.
 * Anchored at noon UTC so DST has no effect.
 */
export function addDays(date: string, days: number): string {
  const t = Date.parse(`${date}T12:00:00Z`) + days * 86_400_000;
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Is the given YYYY-MM-DD a Monday? Used to validate week_starting.
 */
export function isMonday(date: string): boolean {
  const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
  return dow === 1;
}

/**
 * The Monday of the week containing `date` (YYYY-MM-DD). Returns
 * `date` unchanged when `date` is already a Monday.
 */
export function mondayOfWeek(date: string): string {
  const dow = new Date(`${date}T12:00:00Z`).getUTCDay(); // 0=Sun..6=Sat
  // Move backwards to Monday: if today is Sun (0), go back 6; otherwise dow-1.
  const back = dow === 0 ? 6 : dow - 1;
  return addDays(date, -back);
}

/**
 * Determine whether `member` is receiving a box in the cycle that starts
 * `weekStarting` (a Monday).
 *
 * Rules (spec §5.2):
 *   - Members with `biweekly_week` NULL are treated as on-week (legacy
 *     migrated members without an A/B assignment — admin assigns later,
 *     but they shouldn't be silently excluded in the meantime).
 *   - Members with biweekly_week='A' or 'B' alternate weeks based on the
 *     ISO week-of-year parity of `weekStarting`. Even-week (parity=0)
 *     = Week A; odd-week (parity=1) = Week B. This is a deterministic
 *     calendar function, independent of any DB state.
 *
 * Note: this is the *PER-MEMBER* gate. The cycle resolver also subtracts
 * `vacation_holds` overlapping the distribution week.
 *
 * Pure — no DB calls. Used by every aggregation in this module AND by
 * unit tests (see cycle.test.ts) to prove the biweekly exclusion.
 */
export function isMemberOnThisWeek(
  member: { biweekly_week: 'A' | 'B' | null },
  weekStarting: string
): boolean {
  if (!member.biweekly_week) return true; // unassigned → still receive
  const parity = weekParity(weekStarting);
  // parity 0 == Week A, parity 1 == Week B.
  return (parity === 0 && member.biweekly_week === 'A') ||
         (parity === 1 && member.biweekly_week === 'B');
}

/**
 * Is `shareType`'s season "live" for the cycle that starts `weekStarting`
 * (a Monday)?
 *
 * THE SEASON-WINDOW RULE (Todd 2026-06-09): a member's share is only part
 * of a given week's fulfillment when that week falls INSIDE the share's
 * configured season. Before this gate, a June label/pack run wrongly
 * included BOTH spring_veg members (whose season ended Wed 2026-05-27) and
 * flower members (whose season doesn't start until Wed 2026-06-24). Both
 * were caught packing/printing boxes they shouldn't.
 *
 * Window math (all on the Monday week_starting basis the resolver uses):
 *   firstWeek = mondayOfWeek(schedule.firstDelivery)         // season opens
 *   lastWeek  = mondayOfWeek(lastDelivery(schedule))          // season closes
 *   in-season ⟺ firstWeek <= weekStarting <= lastWeek
 *
 * The bounds are INCLUSIVE of the first and last delivery weeks: a member
 * receives a box on the week of the first delivery Wednesday and on the week
 * of the final delivery Wednesday, and on every (parity-permitting) week
 * between. This mirrors season.ts `seasonPhase`, which treats the whole
 * final delivery week as still-active.
 *
 * Share types WITHOUT a configured schedule (flex, add_on, fall_veg, or any
 * share `getSchedule` returns null for) have NO season window — this returns
 * `true` for every week so their existing behavior (include-if-active) is
 * fully preserved. add_ons ride with their parent box exactly as before.
 *
 * Pure — no DB calls. Used by the resolver's member partitioning so EVERY
 * downstream view (labels, pack sheet, stop manifest, harvest list, box
 * plan) is corrected at the single source of truth.
 */
export function isShareInSeasonForWeek(
  shareType: string,
  weekStarting: string
): boolean {
  const schedule = getSchedule(shareType);
  if (!schedule) return true; // no window configured → always in (preserve)
  const firstWeek = mondayOfWeek(schedule.firstDelivery);
  const lastWeek = mondayOfWeek(lastDelivery(schedule));
  return weekStarting >= firstWeek && weekStarting <= lastWeek;
}

/**
 * Parity of a Monday-anchored week, as 0 (Week A) or 1 (Week B).
 * Deterministic: count whole weeks since a fixed anchor Monday and take
 * mod 2. The anchor is the first Monday of the 2026 CSA season (Mon
 * 2026-06-08 = Week A by Todd's convention — first delivery is Wed
 * 2026-06-10, which is Week A).
 *
 * Choosing 2026-06-08 as the anchor (not e.g. epoch) means biweekly
 * Week A = first CSA week, which matches the human intuition.
 */
export function weekParity(weekStarting: string): 0 | 1 {
  const anchor = '2026-06-08';
  const days = daysBetween(anchor, weekStarting);
  // Members can be queried for weeks before the anchor (admin testing
  // with a past week). The math works either way: -7/7 = -1, mod 2 = 1
  // in JS for negatives → we normalise.
  const weeks = Math.floor(days / 7);
  return ((weeks % 2) + 2) % 2 as 0 | 1;
}

/**
 * Vacation hold overlaps any day in [weekStart, weekStart + 6] (the
 * Mon–Sun distribution range).
 */
function holdOverlapsWeek(
  hold: { start_date: string; end_date: string; status: string },
  weekStarting: string
): boolean {
  if (hold.status !== 'active' && hold.status !== 'scheduled') return false;
  const weekEnd = addDays(weekStarting, 6);
  // Overlap iff hold.start <= weekEnd AND hold.end >= weekStarting.
  return hold.start_date <= weekEnd && hold.end_date >= weekStarting;
}

/* ──────────────────────────────────────────────────────────────────
 * Migration 0041 — MOVE-disposition: valid target delivery weeks.
 * ────────────────────────────────────────────────────────────────── */

/** A selectable move target: the week_starting (Monday) value to submit
 *  plus the delivery Wednesday for the human-readable label. */
export interface MoveTargetWeek {
  /** week_starting (Monday, YYYY-MM-DD) — the value stored in move_to_week. */
  week_starting: string;
  /** The delivery Wednesday (YYYY-MM-DD) for that week — for display. */
  delivery_date: string;
  /** 1-based season week index, for "Week 5" style labels. */
  week_number: number;
}

/**
 * Valid future in-season delivery weeks a member may MOVE a held box onto.
 *
 * A move target is valid when:
 *   1. It is a delivery week of the controlling season (firstDelivery + 7n,
 *      n in [0, totalWeeks)).
 *   2. Its pack cutoff has NOT passed — i.e. the week is strictly in the
 *      FUTURE relative to `fromDate`. We compare on the Monday
 *      (week_starting): a target is allowed only when its Monday is AFTER
 *      the Monday of the `fromDate` week. This guarantees the move lands on
 *      a week whose Monday-6AM pack cutoff is still ahead, and never on the
 *      current (already-cutoff-imminent) week.
 *
 * IMPORTANT (per spec): we use the FULL weekly delivery calendar, NOT the
 * member's biweekly parity. A biweekly member is explicitly allowed to move
 * a box onto an OFF-parity week — the whole point of "move" is flexibility.
 *
 * Returns the list sorted ascending by week. Empty when the season is
 * unknown (e.g. a share_type with no SEASON_SCHEDULE entry) or fully past.
 *
 * Pure given `schedule` + `fromDate`; the convenience overload resolves the
 * schedule by share_type and defaults `fromDate` to today (ET).
 */
export function validMoveTargetWeeks(
  schedule: SeasonSchedule,
  fromDate: string = todayET()
): MoveTargetWeek[] {
  const fromMonday = mondayOfWeek(fromDate);
  const out: MoveTargetWeek[] = [];
  for (let n = 0; n < schedule.totalWeeks; n += 1) {
    const delivery_date = addDays(schedule.firstDelivery, n * 7); // a Wednesday
    const week_starting = mondayOfWeek(delivery_date);
    // Strictly future week (target Monday after the current week's Monday).
    if (week_starting <= fromMonday) continue;
    out.push({ week_starting, delivery_date, week_number: n + 1 });
  }
  return out;
}

/**
 * Resolve the season schedule by share_type, then list valid move-target
 * weeks. Returns [] for an unconfigured share_type (no SEASON_SCHEDULE).
 */
export function validMoveTargetWeeksForShare(
  shareType: string,
  fromDate: string = todayET()
): MoveTargetWeek[] {
  const schedule = getSchedule(shareType);
  if (!schedule) return [];
  return validMoveTargetWeeks(schedule, fromDate);
}

/** Is `weekStartingMonday` a valid move target for `shareType` as of
 *  `fromDate`? Used by the API route to server-validate the submitted week.
 *  `weekStartingMonday` must already be a Monday (YYYY-MM-DD). */
export function isValidMoveTarget(
  shareType: string,
  weekStartingMonday: string,
  fromDate: string = todayET()
): boolean {
  return validMoveTargetWeeksForShare(shareType, fromDate)
    .some((t) => t.week_starting === weekStartingMonday);
}

/** Today as 'YYYY-MM-DD' in America/New_York (the farm's calendar). Kept
 *  local so this module stays free of cross-imports from account.ts. */
function todayET(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

/**
 * Derive (addon_type, addon_frequency) from a member's `notes` text.
 * Add-ons are migrated from Shopify product titles like:
 *   "2026 Mushroom CSA Add-On - Bi-weekly"
 *   "2026 Bread Add-On Weekly"
 * Phase 1 reads notes; a Phase-2 schema fix would normalise these into
 * structured columns.
 */
export function deriveAddon(notes: string | null | undefined): {
  type: AddOnType;
  frequency: AddOnFrequency;
} {
  const n = (notes ?? '').toLowerCase();
  let type: AddOnType = 'unknown';
  if (n.includes('mushroom')) type = 'mushroom';
  else if (n.includes('bread')) type = 'bread';
  else if (n.includes('cheese')) type = 'cheese';
  else if (n.includes('coffee')) type = 'coffee';
  else if (n.includes('egg')) type = 'eggs';

  let frequency: AddOnFrequency = 'unknown';
  if (n.includes('bi-weekly') || n.includes('biweekly') || n.includes('bi weekly')) {
    frequency = 'biweekly';
  } else if (n.includes('weekly')) {
    frequency = 'weekly';
  }

  return { type, frequency };
}

/**
 * Should this add-on member's add-on ship this cycle? Mirrors
 * isMemberOnThisWeek but for add-on frequency: weekly ships every cycle;
 * biweekly ships only on the member's A/B week.
 */
export function isAddonOnThisWeek(
  member: { biweekly_week: 'A' | 'B' | null },
  freq: AddOnFrequency,
  weekStarting: string
): boolean {
  if (freq === 'weekly') return true;
  // 'biweekly' or 'unknown' — fall back to the member's biweekly schedule.
  return isMemberOnThisWeek(member, weekStarting);
}

/* ──────────────────────────────────────────────────────────────────
 * The resolver — single round of DB reads, all aggregations live.
 * ────────────────────────────────────────────────────────────────── */

/**
 * Resolve a Fulfillment Cycle for the given week.
 *
 * @param supabase  Any RLS-aware client. The cookie-aware admin client is
 *                  the typical caller (admin pages); the service-role
 *                  client also works (cron jobs).
 * @param weekStartingInput  YYYY-MM-DD; if it isn't a Monday, we snap it
 *                  back to that week's Monday for caller convenience.
 *
 * Throws on schema-level errors (missing tables, malformed input). Never
 * returns null — an empty cycle (no active members) returns an empty
 * `members` array + zero totals.
 */
export async function resolveCycle(
  supabase: SupabaseClient<Database>,
  weekStartingInput: string
): Promise<ResolvedCycle> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStartingInput)) {
    throw new Error(`resolveCycle: invalid week_starting "${weekStartingInput}" (expected YYYY-MM-DD)`);
  }
  const week_starting = isMonday(weekStartingInput)
    ? weekStartingInput
    : mondayOfWeek(weekStartingInput);

  // Distribution dates inside the cycle.
  const distribution_dates = {
    Tue: addDays(week_starting, 1),
    Wed: addDays(week_starting, 2),
    Sat: addDays(week_starting, 5),
  };

  // ─── 1. Fetch active members + their joins (parallel) ──────────
  // We pull the full active set in one query and slice it locally;
  // 190 active members is tiny — the round-trip cost dominates row count.
  type MemberJoinRow = {
    id: string;
    customer_id: string;
    share_type: string;
    share_size: string | null;
    biweekly_week: 'A' | 'B' | null;
    payment_status: string | null;
    pickup_location_id: string | null;
    delivery_address: string | null;
    notes: string | null;
    customization_allowed: boolean;
    swap_credits: number;
    status: string;
    customer: { contact_name: string; email: string } | null;
    pickup_location: {
      id: string;
      name: string;
      city: string | null;
      zip: string | null;
      day_of_week: WeekdayCode | null;
      time_start: string | null;
      time_end: string | null;
      host_name: string | null;
      host_phone: string | null;
    } | null;
  };

  const memberFetch = supabase
    .from('members')
    .select(`
      id, customer_id, share_type, share_size, biweekly_week,
      payment_status, pickup_location_id, delivery_address, notes,
      customization_allowed, swap_credits, status,
      customer:customers ( contact_name, email ),
      pickup_location:pickup_locations (
        id, name, city, zip, day_of_week, time_start, time_end,
        host_name, host_phone
      )
    `)
    .eq('status', 'active')
    .overrideTypes<MemberJoinRow[], { merge: false }>();

  // ─── 2. Fetch holds that could affect this week ────────────────
  // Two ways a hold affects THIS cycle:
  //   (a) OVERLAP — the hold's [start,end] range overlaps this week →
  //       the member is EXCLUDED (skip), or excluded + donated, or
  //       excluded + moved-away.
  //   (b) MOVE-IN — a hold with disposition='move' whose move_to_week ==
  //       this week_starting → the member is ADDED to THIS week even if
  //       their range doesn't overlap and even if it's their biweekly
  //       off-week.
  // We can't express "(overlap) OR (move_to_week = week)" cleanly across
  // base columns in one PostgREST .or() without parse pitfalls, so we run
  // TWO small bounded fetches and merge. Both are tiny (≤ a few rows).
  // ── Migration 0041 resilience ────────────────────────────────────
  // The `disposition` + `move_to_week` columns only exist AFTER migration
  // 0041 is applied. On a pre-migration production DB, selecting them 400s,
  // which would break the OVERLAP fetch and, in turn, EVERY ops page that
  // calls resolveCycle. To stay live before the migration lands we:
  //   1. TRY the full select (incl. disposition + move_to_week). When it
  //      succeeds (post-migration, AND in the unit-test mock whose select
  //      never errors) we get full move/donate behavior.
  //   2. If it ERRORS (columns missing pre-migration), FALL BACK to selecting
  //      only the pre-existing columns and treat every hold as
  //      disposition='skip' (moved_in always false, donated always empty —
  //      exactly today's pre-0041 behavior).
  // This AUTO-RECOVERS: once 0041 is applied the full select succeeds again
  // with NO code change, restoring move/donate.
  const week_end = addDays(week_starting, 6);

  // Hold-row shape used by both the full-select and fallback paths.
  // disposition/move_to_week are OPTIONAL: present post-0041, absent in the
  // pre-migration fallback (treated as 'skip' / null below).
  type Row41 = {
    id: string;
    member_id: string | null;
    start_date: string;
    end_date: string;
    status: string;
    disposition?: string | null;
    move_to_week?: string | null;
  };

  // (1) Try the full OVERLAP fetch with the 0041 columns.
  let holdRes = await supabase
    .from('vacation_holds')
    .select('id, member_id, start_date, end_date, status, disposition, move_to_week')
    .in('status', ['active', 'scheduled'])
    .lte('start_date', week_end)
    .gte('end_date', week_starting);

  // True once we've confirmed the 0041 columns are queryable. Drives whether
  // the separate move-in fetch runs (it filters on disposition/move_to_week,
  // which would 400 in fallback mode).
  let dispositionColumnsAvailable = !holdRes.error;

  if (holdRes.error) {
    // (2) FALLBACK: re-run the OVERLAP fetch with ONLY pre-0041 columns.
    holdRes = await supabase
      .from('vacation_holds')
      .select('id, member_id, start_date, end_date, status')
      .in('status', ['active', 'scheduled'])
      .lte('start_date', week_end)
      .gte('end_date', week_starting);
  }

  // Move-in holds: target THIS week, regardless of their own date range.
  // Only meaningful (and only queryable) when the 0041 columns exist — guard
  // it so fallback mode never issues a disposition/move_to_week filter.
  const moveInRes = dispositionColumnsAvailable
    ? await supabase
        .from('vacation_holds')
        .select('id, member_id, start_date, end_date, status, disposition, move_to_week')
        .in('status', ['active', 'scheduled'])
        .eq('disposition', 'move')
        .eq('move_to_week', week_starting)
    : { data: [] as Row41[], error: null };

  // ─── 3. Fetch locked swaps for the cycle ───────────────────────
  const swapFetch = supabase
    .from('box_swap_events')
    .select('member_id, swap_out_item, swap_in_item, status')
    .eq('cycle_code', 'WEEKLY')
    .eq('week_starting', week_starting)
    .in('status', ['locked', 'pending']);

  // ─── 4. Fetch the box plans from box_contents ──────────────────
  // box_contents is the single source of truth used everywhere else in the
  // app (member /box page, swaps, etc.). week_date IS the cycle Monday (same
  // value as week_starting). We group rows by share_type ('large'/'small')
  // below into the boxPlanBySize shape the downstream lookup expects.
  type BoxContentsRow = {
    share_type: string;
    product_name: string;
    quantity: number;
    unit: string | null;
  };
  const planFetch = supabase
    .from('box_contents')
    .select('share_type, product_name, quantity, unit')
    .eq('week_date', week_starting)
    .overrideTypes<BoxContentsRow[], { merge: false }>();

  // ─── 5. Fetch flex orders for the cycle ────────────────────────
  // Locked OR fulfilled — anything paid for this week.
  type FlexOrderRow = {
    flex_item_id: string;
    qty: number;
    total_cents: number;
    member_id: string;
    flex_inventory: { name: string | null } | null;
  };
  const flexFetch = supabase
    .from('flex_orders')
    .select('flex_item_id, qty, total_cents, member_id, flex_inventory:flex_inventory ( name )')
    .eq('cycle_code', 'WEEKLY')
    .eq('week_starting', week_starting)
    // pending|locked|fulfilled — the PACKABLE set, matching the labels / stop
    // manifest / pack-check / flex-orders admin. 'pending' is now debited AT
    // ORDER (so it's paid + must pack), so it counts here too. Was ['locked',
    // 'fulfilled'] which under-counted vs the pack lists (audit 2026-06-19).
    .in('status', ['pending', 'locked', 'fulfilled'])
    .overrideTypes<FlexOrderRow[], { merge: false }>();

  // ─── 6. Fetch member preferences (allergies for auto-subs) ─────
  // We pull all rows then index — cheaper than N round-trips for ~200
  // members.
  const prefsFetch = supabase
    .from('member_preferences')
    .select('member_id, allergies, dislikes, delivery_notes');

  // NOTE: the holds fetches (holdRes / moveInRes) were already awaited above
  // because the move-in fetch depends on whether the 0041 columns exist. The
  // remaining five run in parallel.
  const [memberRes, swapRes, planRes, flexRes, prefsRes] = await Promise.all([
    memberFetch, swapFetch, planFetch, flexFetch, prefsFetch,
  ]);

  // Defensive: every query gets its own error surface. The OVERLAP holds
  // fetch already fell back (never throws on the 0041-column 400). The move-in
  // fetch only ran when the 0041 columns are present, so any error it carries
  // is a genuine failure worth surfacing.
  for (const [label, res] of [
    ['members', memberRes],
    ['vacation_holds (move-in)', moveInRes], ['box_swap_events', swapRes],
    ['box_contents', planRes], ['flex_orders', flexRes],
    ['member_preferences', prefsRes],
  ] as const) {
    if (res.error) {
      throw new Error(`resolveCycle: ${label} fetch failed: ${res.error.message}`);
    }
  }
  // The OVERLAP holds fetch is special: a 0041-column 400 was already handled
  // by the fallback re-query above. Only throw if the FALLBACK also errored
  // (a real connectivity/permission failure, not the expected missing-column).
  if (holdRes.error) {
    throw new Error(`resolveCycle: vacation_holds fetch failed: ${holdRes.error.message}`);
  }

  const memberRows = (memberRes.data ?? []) as unknown as MemberJoinRow[];
  const holds = (holdRes.data ?? []) as Row41[];
  const moveInHolds = (moveInRes.data ?? []) as Row41[];
  const swaps = swapRes.data ?? [];
  const plans = (planRes.data ?? []) as unknown as BoxContentsRow[];
  const flexOrders = (flexRes.data ?? []) as unknown as FlexOrderRow[];
  const prefs = prefsRes.data ?? [];

  // ─── Index helpers ──────────────────────────────────────────────
  // member_id → array of holds (for fast overlap check)
  const holdsByMember = new Map<string, typeof holds>();
  for (const h of holds) {
    if (!h.member_id) continue;
    const arr = holdsByMember.get(h.member_id);
    if (arr) arr.push(h);
    else holdsByMember.set(h.member_id, [h]);
  }

  // member_id → swap events for this cycle
  const swapsByMember = new Map<string, typeof swaps>();
  for (const s of swaps) {
    if (!s.member_id) continue;
    // Only LOCKED swaps apply to the box composition (admin pages may
    // also want to *preview* pending; for resolver correctness we
    // include only locked, then surface pending separately if needed).
    if (s.status !== 'locked') continue;
    const arr = swapsByMember.get(s.member_id);
    if (arr) arr.push(s);
    else swapsByMember.set(s.member_id, [s]);
  }

  // member_id → preferences
  const prefsByMember = new Map<string, { allergies: string[]; dislikes: string[]; delivery_notes: string | null }>();
  for (const p of prefs) {
    if (!p.member_id) continue;
    prefsByMember.set(p.member_id, {
      allergies: p.allergies ?? [],
      dislikes: p.dislikes ?? [],
      delivery_notes: p.delivery_notes ?? null,
    });
  }

  // ─── Household preference UNION (Todd 2026-06-24) ─────────────────
  // Preferences are stored PER member row, but a customer has several rows
  // (veg box + each add-on). A dislike/allergy set on ANY of a household's
  // rows must apply to their BOX — otherwise a preference filed on an add-on
  // row (as the portal sometimes does) is silently ignored. 17 members were
  // hit by this; e.g. Kelly Corrigan's "Beets" skip landed on her mushroom
  // add-on row, so her veg box never dropped beets. We union dislikes +
  // allergies (case-insensitive) across each customer's member rows and stamp
  // the union onto every CycleMember below, so applyComposition + the
  // label/pack allergy flags honor the full household preference set.
  const customerIdByMember = new Map<string, string>();
  for (const m of memberRows) customerIdByMember.set(m.id, m.customer_id);
  const prefsByCustomer = new Map<string, { allergies: string[]; dislikes: string[] }>();
  for (const [memberId, pref] of prefsByMember) {
    const custId = customerIdByMember.get(memberId);
    if (!custId) continue;
    const agg = prefsByCustomer.get(custId) ?? { allergies: [], dislikes: [] };
    for (const a of pref.allergies) {
      if (a && !agg.allergies.some((x) => x.toLowerCase() === a.toLowerCase())) agg.allergies.push(a);
    }
    for (const d of pref.dislikes) {
      if (d && !agg.dislikes.some((x) => x.toLowerCase() === d.toLowerCase())) agg.dislikes.push(d);
    }
    prefsByCustomer.set(custId, agg);
  }

  // share_type ('large'/'small') → { contents, published_at }. Built from
  // box_contents: group the per-product rows by share_type, mapping each row
  // to a BoxContentLine. published_at is null (box_contents has no publish
  // gate; downstream never reads it). The keys ('large'/'small') keep the
  // downstream lookup `boxPlanBySize.get(size_bucket === 'large' ? ... )`
  // working unchanged.
  const boxPlanBySize = new Map<string, { contents: BoxContentLine[]; published_at: string | null }>();
  for (const p of plans) {
    const line: BoxContentLine = {
      crop: p.product_name,
      qty: Number(p.quantity) || 1,
      unit: p.unit || 'ea',
    };
    const existing = boxPlanBySize.get(p.share_type);
    if (existing) existing.contents.push(line);
    else boxPlanBySize.set(p.share_type, { contents: [line], published_at: null });
  }

  // member_id → row, for resolving moved-in members (their full join data
  // is already in memberRows since they're active).
  const memberRowById = new Map<string, MemberJoinRow>();
  for (const m of memberRows) memberRowById.set(m.id, m);

  /** Build a base CycleMember (moved_in defaults false) from a join row. */
  function buildCycleMember(m: MemberJoinRow): CycleMember {
    const { type: addon_type, frequency: addon_frequency } = deriveAddon(m.notes);
    const pref = prefsByMember.get(m.id);
    return {
      id: m.id,
      customer_id: m.customer_id,
      share_type: m.share_type,
      share_size: m.share_size,
      size_bucket: bucketSize(m.share_size),
      biweekly_week: m.biweekly_week,
      on_this_week: isMemberOnThisWeek(m, week_starting),
      contact_name: m.customer?.contact_name ?? '(unknown)',
      email: m.customer?.email ?? '',
      payment_status: m.payment_status,
      pickup_location_id: m.pickup_location_id,
      delivery_address: m.delivery_address,
      notes: m.notes,
      customization_allowed: m.customization_allowed,
      swap_credits: m.swap_credits,
      addon_type,
      addon_frequency,
      pickup_location: m.pickup_location ?? null,
      // Household UNION (not just this row's prefs) so a dislike/allergy filed
      // on any of the customer's member rows is honored on the box.
      allergies: prefsByCustomer.get(m.customer_id)?.allergies ?? pref?.allergies ?? [],
      dislikes: prefsByCustomer.get(m.customer_id)?.dislikes ?? pref?.dislikes ?? [],
      delivery_notes: pref?.delivery_notes ?? null,
      moved_in: false,
      moved_from: null,
    };
  }

  // ─── 7. Build CycleMember rows, partitioned by inclusion ───────
  const included: CycleMember[] = [];
  const excludedBiweekly: CycleMember[] = [];
  const excludedOnHold: CycleMember[] = [];
  const excludedOutOfSeason: CycleMember[] = [];
  const donated: CycleMember[] = [];
  // member_ids ALREADY placed in `included` — guards the move-in de-dupe.
  const includedIds = new Set<string>();

  for (const m of memberRows) {
    const cycle_member = buildCycleMember(m);

    // ── SEASON WINDOW (Todd 2026-06-09) ──────────────────────────
    // First gate: if this share's season does NOT cover this week, the
    // member is not part of THIS cycle at all — they don't receive a box,
    // aren't on hold, aren't biweekly-excluded. This drops spring_veg from
    // June weeks and flower from pre-Jun-24 weeks. Shares with no configured
    // season (flex / add_on) pass through unchanged. A move-disposition box
    // moved ONTO an in-season week is handled in the move-in pass below
    // (which reads the member row directly), so this filter can never drop a
    // legitimately moved-in member — move targets are validated in-season.
    if (!isShareInSeasonForWeek(m.share_type, week_starting)) {
      excludedOutOfSeason.push(cycle_member);
      continue;
    }

    const memberHolds = holdsByMember.get(m.id) ?? [];
    const overlappingHold = memberHolds.find((h) => holdOverlapsWeek(h, week_starting));

    if (overlappingHold) {
      // The member's box for THIS week is held. Regardless of disposition
      // they do NOT receive a box on their original/overlapping week.
      excludedOnHold.push(cycle_member);
      // DONATE: the box is still packed + donated → tally it.
      if (overlappingHold.disposition === 'donate') {
        donated.push(cycle_member);
      }
      // MOVE/SKIP need no extra work here — a MOVE member's add-into-target
      // happens in the dedicated move-in pass below (keyed on move_to_week).
      continue;
    }
    // ── FLEX bypasses biweekly parity ENTIRELY (incident 2026-06-10) ──
    // Flex membership is NOT a biweekly box subscription — a flex member
    // receives produce ONLY by placing a flex_order for the week, and the
    // consuming pages (labels / pack-check / manifest) already gate flex
    // receipt on having that order. The biweekly A/B parity column is
    // meaningless for flex, and on 2026-06-10 a data sync stamped every
    // flex row with a junk A/B tag. With the parity gate applied, 'B'-tagged
    // flex members were dropped from a Week-A run even though they HAD flex
    // orders — 7 members' orders missed the truck. The resolver must NEVER
    // exclude a flex member for parity, regardless of biweekly_week's value.
    // (summer_veg / flower / spring parity behavior below is unchanged.)
    if (m.share_type === 'flex') {
      included.push({ ...cycle_member, on_this_week: true });
      includedIds.add(m.id);
      continue;
    }
    if (!cycle_member.on_this_week) {
      // Add-on members default to weekly delivery in many cases — only
      // exclude them from the biweekly bucket if their resolved frequency
      // also says biweekly (or unknown — conservative).
      if (m.share_type === 'add_on' && cycle_member.addon_frequency === 'weekly') {
        // Weekly add-on ships even on biweekly off-weeks (their own
        // schedule overrides their A/B). Include.
        included.push({ ...cycle_member, on_this_week: true });
        includedIds.add(m.id);
        continue;
      }
      excludedBiweekly.push(cycle_member);
      continue;
    }
    included.push(cycle_member);
    includedIds.add(m.id);
  }

  // ─── 7b. MOVE-IN pass (migration 0041) ─────────────────────────
  // A member with a hold disposition='move' whose move_to_week === this
  // cycle's week_starting RECEIVES a box THIS week — even on their biweekly
  // off-week. They were excluded from their ORIGINAL week above. We add them
  // here, tagged moved_in + moved_from (the Monday of the week they moved
  // away from). De-duped: never double-count a member already receiving.
  for (const mh of moveInHolds) {
    if (!mh.member_id) continue;
    if (mh.disposition !== 'move') continue;       // defensive (query already filters)
    if (mh.move_to_week !== week_starting) continue; // defensive (query already filters)
    if (includedIds.has(mh.member_id)) continue;   // already receiving — de-dupe

    const row = memberRowById.get(mh.member_id);
    if (!row) continue; // not an active member (cancelled/paused) → skip

    // Defensive season guard: a valid move target is in-season by
    // construction (validMoveTargetWeeks only emits weeks inside
    // [firstDelivery … lastDelivery]). But never move a box onto a week the
    // share's season doesn't cover — guards against a hand-written/legacy
    // move_to_week that predates this rule. For shares with no season this
    // is always true, so flex/unscheduled moves are unaffected.
    if (!isShareInSeasonForWeek(row.share_type, week_starting)) continue;

    // Respect the member's OTHER holds: if a DIFFERENT hold overlaps THIS
    // target week, the move is moot (they're held this week anyway). Don't
    // add a moved-in box on a week they're already on hold for.
    const otherHolds = holdsByMember.get(mh.member_id) ?? [];
    const otherOverlaps = otherHolds.some(
      (h) => h.id !== mh.id && holdOverlapsWeek(h, week_starting),
    );
    if (otherOverlaps) continue;

    const moved = buildCycleMember(row);
    moved.on_this_week = true;
    moved.moved_in = true;
    // moved_from = the Monday of the week the hold overlapped (the week they
    // gave up). Use the hold's start_date's Monday — for a single-week move
    // this is exactly the original delivery week.
    moved.moved_from = mondayOfWeek(mh.start_date);
    included.push(moved);
    includedIds.add(mh.member_id);

    // If the main loop placed this member in excluded_biweekly for THIS week
    // (a biweekly member moving onto an off-parity week), they are now
    // RECEIVING — pull them out of that bucket so the two views agree and
    // they're not double-listed as both excluded AND included.
    const exIdx = excludedBiweekly.findIndex((x) => x.id === mh.member_id);
    if (exIdx >= 0) excludedBiweekly.splice(exIdx, 1);
  }

  // ─── 8. byStop + byDistributionDay buckets ─────────────────────
  const byStop = new Map<string, CycleMember[]>();
  const byDistributionDay = new Map<WeekdayCode, CycleMember[]>();
  byDistributionDay.set('Tue', []);
  byDistributionDay.set('Wed', []);
  byDistributionDay.set('Sat', []);

  // Each customer → their BOX row's stop key. An add-on ships INSIDE the box,
  // so an add-on row with no pickup of its own must ride to the SAME stop its
  // box does — exactly like the labels attach add-ons to the box. Without this,
  // a home-delivery customer's null-pickup add-on row landed in "no pickup set"
  // on the manifest while the label correctly rode it on the home box — a
  // label↔manifest mismatch (Todd 2026-06-23 audit: Martina/Stephanie/Carla).
  const customerBoxStop = new Map<string, string>();
  // Each home-delivery customer → their delivery address (taken from the BOX
  // row, which always carries it). The address lives PER member row, but a
  // household has several rows (box + each add-on) and the add-on rows are
  // frequently created/migrated with a NULL delivery_address. We make the
  // resolver the single source of truth: stamp the household address onto any
  // home-riding row that's missing it, so NO downstream consumer (route planner,
  // labels, manifest, driver) can read a null for a household we deliver to.
  // Root cause of Todd 2026-06-24: the route planner picked a null-address
  // add-on row and reported "no home address" for Martina/Stephanie/Carla/
  // Ronelle even though each box row had the address.
  const customerHomeAddress = new Map<string, string>();
  for (const m of included) {
    if (m.share_type === 'add_on') continue;
    let key: string | null = null;
    if (m.delivery_address && !m.pickup_location_id) key = HOME_DELIVERY_STOP_ID;
    else if (m.pickup_location_id) key = m.pickup_location_id;
    if (key && !customerBoxStop.has(m.customer_id)) customerBoxStop.set(m.customer_id, key);
    if (m.delivery_address && !m.pickup_location_id && !customerHomeAddress.has(m.customer_id)) {
      customerHomeAddress.set(m.customer_id, m.delivery_address);
    }
  }
  // Stamp the household address onto any home-bound row missing it (add-ons that
  // ride the home box). Only for households whose BOX goes home — never touch a
  // row whose box ships to a pickup location. Display-only: changes no count.
  for (const m of included) {
    if (m.delivery_address) continue;
    if (customerBoxStop.get(m.customer_id) !== HOME_DELIVERY_STOP_ID) continue;
    const addr = customerHomeAddress.get(m.customer_id);
    if (addr) m.delivery_address = addr;
  }

  for (const member of included) {
    // Stop bucket
    let stopKey: string;
    if (member.delivery_address && !member.pickup_location_id) {
      stopKey = HOME_DELIVERY_STOP_ID;
    } else if (member.pickup_location_id) {
      stopKey = member.pickup_location_id;
    } else if (member.share_type === 'add_on' && customerBoxStop.has(member.customer_id)) {
      // Add-on with no pickup of its own → ride to its customer's box stop.
      stopKey = customerBoxStop.get(member.customer_id)!;
    } else {
      // Active member with neither pickup nor delivery — typically the
      // 30 Allison Park TBD + test members per the 2026-05-25 reconciliation.
      // Bucket them under a sentinel so they're visible to admin.
      stopKey = 'no_pickup_set';
    }
    const stopArr = byStop.get(stopKey);
    if (stopArr) stopArr.push(member);
    else byStop.set(stopKey, [member]);

    // Distribution-day bucket. Home delivery → Wed (spec §4.10).
    let day: WeekdayCode = 'Wed';
    if (member.pickup_location?.day_of_week) {
      day = member.pickup_location.day_of_week;
    } else if (member.delivery_address) {
      day = 'Wed';
    }
    if (day !== 'Tue' && day !== 'Wed' && day !== 'Sat') {
      // Some stops still have Wed default — anything outside Tue/Wed/Sat
      // is treated as Wed (matches the seeded data: all CSA stops Wed,
      // markets Sat, Lawrenceville will be Tue once added).
      day = 'Wed';
    }
    byDistributionDay.get(day)!.push(member);
  }

  // ─── 9. Per-member box composition ─────────────────────────────
  const boxCompositionByMember = new Map<string, ResolvedBoxComposition>();
  for (const member of included) {
    if (member.share_type !== 'summer_veg') continue;
    const plan = boxPlanBySize.get(member.size_bucket === 'large' ? 'large' : 'small')
      ?? boxPlanBySize.get(member.share_size ?? '')
      ?? { contents: [], published_at: null };
    const composition = applyComposition(plan.contents, swapsByMember.get(member.id) ?? [], member);
    boxCompositionByMember.set(member.id, composition);
  }

  // ─── 10. Add-on totals ─────────────────────────────────────────
  const addOnTotals: Record<AddOnType, { weekly: number; biweekly: number; total: number }> = {
    mushroom: { weekly: 0, biweekly: 0, total: 0 },
    bread:    { weekly: 0, biweekly: 0, total: 0 },
    cheese:   { weekly: 0, biweekly: 0, total: 0 },
    coffee:   { weekly: 0, biweekly: 0, total: 0 },
    eggs:     { weekly: 0, biweekly: 0, total: 0 },
    unknown:  { weekly: 0, biweekly: 0, total: 0 },
  };
  for (const member of included) {
    if (member.share_type !== 'add_on') continue;
    // Re-assert frequency-aware inclusion (weekly always; biweekly only
    // on the member's A/B week). isMemberOnThisWeek already ran above
    // for the broader filter, but we also need to count the weekly
    // add-ons of biweekly-off members (the override branch above let
    // them through). Use isAddonOnThisWeek to be explicit.
    // EXCEPTION: a moved_in add-on (make-up / extra box on an off-parity
    // week) is here on purpose — count it even though parity says "off",
    // so the harvest aggregate matches what actually packs (Todd 2026-06-23).
    if (!member.moved_in && !isAddonOnThisWeek(member, member.addon_frequency, week_starting)) continue;
    const bucket = addOnTotals[member.addon_type];
    if (member.addon_frequency === 'weekly') bucket.weekly += 1;
    else if (member.addon_frequency === 'biweekly') bucket.biweekly += 1;
    else bucket.biweekly += 1; // unknown defaults to biweekly bucket
    bucket.total += 1;
  }

  // ─── 11. Flex order totals ─────────────────────────────────────
  const flexAgg = new Map<string, { name: string | null; qty: number; total_cents: number }>();
  let flexGrandTotalCents = 0;
  let flexOrderCount = 0;
  for (const fo of flexOrders) {
    flexOrderCount += 1;
    flexGrandTotalCents += fo.total_cents;
    const existing = flexAgg.get(fo.flex_item_id);
    if (existing) {
      existing.qty += fo.qty;
      existing.total_cents += fo.total_cents;
    } else {
      flexAgg.set(fo.flex_item_id, {
        name: fo.flex_inventory?.name ?? null,
        qty: fo.qty,
        total_cents: fo.total_cents,
      });
    }
  }
  const flexOrderTotals = {
    items: Array.from(flexAgg.entries()).map(([flex_item_id, v]) => ({
      flex_item_id, ...v,
    })),
    grand_total_cents: flexGrandTotalCents,
    order_count: flexOrderCount,
  };

  // member_id → flex order count, for per-stop summary
  const flexByMember = new Map<string, number>();
  for (const fo of flexOrders) {
    flexByMember.set(fo.member_id, (flexByMember.get(fo.member_id) ?? 0) + fo.qty);
  }

  // ─── 12. Per-stop totals ───────────────────────────────────────
  const totalsByStop = new Map<string, StopTotals>();
  for (const [stopKey, stopMembers] of byStop) {
    const first = stopMembers[0];
    let stop_name: string;
    let day_of_week: WeekdayCode | null = null;
    if (stopKey === HOME_DELIVERY_STOP_ID) {
      stop_name = 'Home delivery';
      day_of_week = 'Wed';
    } else if (stopKey === 'no_pickup_set') {
      stop_name = 'No pickup set';
      day_of_week = null;
    } else {
      stop_name = first?.pickup_location?.name ?? '(unknown)';
      day_of_week = first?.pickup_location?.day_of_week ?? null;
    }

    const totals: StopTotals = {
      stop_id: stopKey,
      stop_name,
      day_of_week,
      boxes_small: 0,
      boxes_large: 0,
      addons: { mushroom: 0, bread: 0, cheese: 0, coffee: 0, eggs: 0, unknown: 0 },
      flex_orders: 0,
      owes_count: 0,
    };
    for (const m of stopMembers) {
      if (m.share_type === 'summer_veg') {
        if (m.size_bucket === 'large') totals.boxes_large += 1;
        else totals.boxes_small += 1; // small or unknown bucket → small box
      }
      if (m.share_type === 'add_on') {
        totals.addons[m.addon_type] += 1;
      }
      if (flexByMember.has(m.id)) {
        totals.flex_orders += 1;
      }
      if (m.payment_status && m.payment_status.toLowerCase() !== 'paid') {
        totals.owes_count += 1;
      }
    }
    totalsByStop.set(stopKey, totals);
  }

  // Sorted list of active stops for UI (day → name).
  const DAY_RANK: Record<WeekdayCode, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
  };
  const activeStops = Array.from(totalsByStop.values()).sort((a, b) => {
    const da = a.day_of_week ? DAY_RANK[a.day_of_week] : 99;
    const db = b.day_of_week ? DAY_RANK[b.day_of_week] : 99;
    if (da !== db) return da - db;
    return a.stop_name.localeCompare(b.stop_name);
  });

  return {
    cycle_code: 'WEEKLY',
    week_starting,
    distribution_dates,
    members: included,
    excluded_biweekly: excludedBiweekly,
    excluded_on_hold: excludedOnHold,
    excluded_out_of_season: excludedOutOfSeason,
    donated,
    byStop,
    byDistributionDay,
    boxCompositionByMember,
    addOnTotals,
    flexOrderTotals,
    totalsByStop,
    activeStops,
    boxPlanBySize,
  };
}

/* ──────────────────────────────────────────────────────────────────
 * Box composition: apply swaps + allergy subs.
 * ────────────────────────────────────────────────────────────────── */

/**
 * Apply locked swaps + allergy substitutions to a base contents array,
 * returning the resolved per-member shipping list.
 *
 * Algorithm:
 *   1. Start from base contents (copy).
 *   2. For each LOCKED swap: remove swap_out_item, add swap_in_item.
 *      Matching on crop name (case-insensitive). If swap_out_item isn't
 *      present, the swap is treated as additive (this shouldn't happen
 *      with a well-formed swap menu but we tolerate it).
 *   3. For each allergy entry: if the resolved list contains a matching
 *      crop, remove it and add a substitution flag. We don't auto-pick
 *      a replacement here — that's a pack-floor decision; the label
 *      shows the allergy and the empty slot to fill.
 *
 * Returns the SHIPPING items array + parallel arrays of what changed
 * (swapped_in / swapped_out / allergy_subs) so the label and pack sheet
 * can render badges/flags.
 */
export function applyComposition(
  baseContents: BoxContentLine[],
  lockedSwaps: ReadonlyArray<{ swap_out_item: string; swap_in_item: string }>,
  member: { allergies: string[]; dislikes: string[] }
): ResolvedBoxComposition {
  const items: BoxContentLine[] = baseContents.map((c) => ({ ...c }));
  const swapped_in: string[] = [];
  const swapped_out: string[] = [];
  const allergy_subs: Array<{ removed: string; reason: string }> = [];

  // Apply locked swaps.
  for (const s of lockedSwaps) {
    const outLower = s.swap_out_item.toLowerCase();
    const idx = items.findIndex((it) => it.crop.toLowerCase() === outLower);
    if (idx >= 0) {
      const removed = items[idx];
      items.splice(idx, 1);
      swapped_out.push(s.swap_out_item);
      // Use the removed item's unit/qty as a guess for the swap-in unit
      // when we have no other info. A future weekly_swap_menu lookup
      // would supply the canonical unit.
      items.push({
        crop: s.swap_in_item,
        qty: removed.qty,
        unit: removed.unit,
        notes: 'swap',
      });
      swapped_in.push(s.swap_in_item);
    } else {
      // Swap-out item wasn't in the base — treat as additive.
      items.push({ crop: s.swap_in_item, qty: 1, unit: 'ea', notes: 'swap (added)' });
      swapped_in.push(s.swap_in_item);
    }
  }

  // Allergy + dislike subs. Match on crop name (case-insensitive). The
  // matcher tolerates English plural / singular variants ("strawberry"
  // vs "strawberries", "bean" vs "beans") by comparing the first 4+
  // letters of each word — i.e. the morphological STEM. Pure substring
  // matching breaks on the s/ies plural ("strawberries".includes
  // ("strawberry") = false), so we use a small prefix-match instead.
  const flagSet = new Set<string>();
  // When an item is pulled for an allergy/dislike we REPLACE it with a
  // "Farmer's choice" line (Todd 2026-06-24) so the member still gets a full
  // box — the crew adds any abundant item in its place — instead of a short
  // box. One sub per removed item, carrying the removed item's qty/unit. The
  // label/pack box-contents footer renders these in the item list.
  const farmersChoiceSubs: BoxContentLine[] = [];
  const queueSub = (removed: BoxContentLine): void => {
    farmersChoiceSubs.push({
      crop: "Farmer's choice",
      qty: removed.qty,
      unit: removed.unit,
      notes: `sub for ${removed.crop}`,
    });
  };
  for (const allergy of member.allergies ?? []) {
    const a = allergy.trim().toLowerCase();
    if (!a) continue;
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const crop = items[i].crop.toLowerCase();
      if (cropMatches(crop, a)) {
        const removed = items[i];
        allergy_subs.push({ removed: removed.crop, reason: `allergy: ${allergy}` });
        flagSet.add(crop);
        items.splice(i, 1);
        queueSub(removed);
      }
    }
  }
  for (const dislike of member.dislikes ?? []) {
    const d = dislike.trim().toLowerCase();
    if (!d) continue;
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const crop = items[i].crop.toLowerCase();
      if (!flagSet.has(crop) && cropMatches(crop, d)) {
        const removed = items[i];
        allergy_subs.push({ removed: removed.crop, reason: `dislike: ${dislike}` });
        items.splice(i, 1);
        queueSub(removed);
      }
    }
  }
  for (const sub of farmersChoiceSubs) items.push(sub);

  return { items, swapped_in, swapped_out, allergy_subs };
}

/**
 * Does `crop` match `term` for the purpose of an allergy/dislike sub?
 *
 * Both are pre-lowercased. We:
 *   1. Do a plain substring check both ways (catches "tomato" vs "cherry
 *      tomato", "kale" vs "baby kale").
 *   2. Fall back to a stem prefix check on the FIRST WORD only — share
 *      a 4+-char prefix when neither is short. This handles English
 *      plural variants like strawberry/strawberries, tomato/tomatoes,
 *      bean/beans without depending on a stemming library.
 *
 * Exported for testability.
 */
export function cropMatches(crop: string, term: string): boolean {
  if (!crop || !term) return false;
  // Substring (either direction). Cheap and works for "kale" inside
  // "baby kale" and "strawberry" inside "strawberry shortcake".
  if (crop.includes(term) || term.includes(crop)) return true;
  // First-word stem-prefix. Compare the first ALPHA token of each.
  const cropWord = (crop.match(/[a-z]+/) ?? [''])[0];
  const termWord = (term.match(/[a-z]+/) ?? [''])[0];
  if (cropWord.length < 4 || termWord.length < 4) return false;
  const stemLen = Math.min(cropWord.length, termWord.length, 5);
  return cropWord.slice(0, stemLen) === termWord.slice(0, stemLen);
}

/* ──────────────────────────────────────────────────────────────────
 * Tiny display helpers shared by the printable pages.
 * ────────────────────────────────────────────────────────────────── */

/** Pretty-print a week-starting date as "Week of Monday, June 8". */
export function prettyWeekHeader(weekStarting: string): string {
  return 'Week of ' + new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${weekStarting}T12:00:00Z`));
}

/** "Wed, Jun 10". */
export function prettyShortDate(dateYMD: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dateYMD}T12:00:00Z`));
}

/**
 * Compute the upcoming Monday in ET (the next cycle's week_starting).
 * If today IS Monday, returns today.
 */
export function upcomingMonday(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? '';
  const dayIndex: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const todayIdx = dayIndex[get('weekday')] ?? 0;
  // 0 days until Mon if today is Mon; else (1 - todayIdx + 7) % 7.
  // Special case: if today is Sun (0), the upcoming Mon is tomorrow (1).
  const daysUntilMon = todayIdx === 1 ? 0 : (1 - todayIdx + 7) % 7;
  return addDays(`${get('year')}-${get('month')}-${get('day')}`, daysUntilMon);
}

/**
 * The Monday of the CURRENT delivery week — the week we are executing RIGHT NOW.
 *
 * THIS is the canonical "active week" for every delivery-EXECUTION tool: the
 * driver run sheet, stop manifests, labels, pack sheets, pack day, host sheets,
 * harvest list, and the text-a-stop tool. They must show TODAY's delivery.
 *
 * Unlike `upcomingMonday()` — which rolls forward to NEXT Monday on Tue–Sun and
 * therefore, on a delivery Wednesday, showed the driver NEXT week's roster and
 * phone numbers (the 2026-06-17 incident) — this stays on the current Mon–Sun
 * week (so it spans the Wed delivery AND any Sat market) and only advances to
 * the next week on Monday, when the new cycle genuinely begins.
 *
 * Forward-PLANNING tools (flex ordering, flex inventory, vendor orders, box
 * plan) intentionally keep using `upcomingMonday()` — they look ahead by design.
 */
export function currentDeliveryWeek(now: Date = new Date()): string {
  return mondayOfWeek(todayET(now));
}

/** Sentinel id for the home-delivery bucket in byStop. */
export const HOME_DELIVERY_BUCKET_ID = HOME_DELIVERY_STOP_ID;

/** Slug a stop name for use in URLs (lowercase, hyphenated). */
export function slugStop(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Resolve a stop slug back to a stop_id within an activeStops list. */
export function resolveStopBySlug(
  slug: string,
  stops: ReadonlyArray<StopTotals>
): StopTotals | null {
  const target = slug.toLowerCase();
  return stops.find((s) => slugStop(s.stop_name) === target) ?? null;
}
