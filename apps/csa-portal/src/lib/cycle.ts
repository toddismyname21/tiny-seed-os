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
 *   3. **Real read of `weekly_box_plan`**: the box composition served
 *      from the resolver is the LIVE plan (published or not). The Phase 1
 *      pack pages render even when published_at is null so admin can
 *      preview before publish; member-facing pages will gate on
 *      published_at separately.
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
  // We pre-filter at the DB to (status in active/scheduled AND end_date
  // >= week_starting AND start_date <= week_end). The overlap check is
  // re-asserted locally because Postgres date arithmetic + RLS is fiddly.
  const week_end = addDays(week_starting, 6);
  const holdFetch = supabase
    .from('vacation_holds')
    .select('id, member_id, start_date, end_date, status')
    .in('status', ['active', 'scheduled'])
    .lte('start_date', week_end)
    .gte('end_date', week_starting);

  // ─── 3. Fetch locked swaps for the cycle ───────────────────────
  const swapFetch = supabase
    .from('box_swap_events')
    .select('member_id, swap_out_item, swap_in_item, status')
    .eq('cycle_code', 'WEEKLY')
    .eq('week_starting', week_starting)
    .in('status', ['locked', 'pending']);

  // ─── 4. Fetch the published (or draft) box plans ───────────────
  const planFetch = supabase
    .from('weekly_box_plan')
    .select('share_size, contents, published_at')
    .eq('cycle_code', 'WEEKLY')
    .eq('week_starting', week_starting);

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
    .in('status', ['locked', 'fulfilled'])
    .overrideTypes<FlexOrderRow[], { merge: false }>();

  // ─── 6. Fetch member preferences (allergies for auto-subs) ─────
  // We pull all rows then index — cheaper than N round-trips for ~200
  // members.
  const prefsFetch = supabase
    .from('member_preferences')
    .select('member_id, allergies, dislikes, delivery_notes');

  const [memberRes, holdRes, swapRes, planRes, flexRes, prefsRes] = await Promise.all([
    memberFetch, holdFetch, swapFetch, planFetch, flexFetch, prefsFetch,
  ]);

  // Defensive: every query gets its own error surface.
  for (const [label, res] of [
    ['members', memberRes], ['vacation_holds', holdRes], ['box_swap_events', swapRes],
    ['weekly_box_plan', planRes], ['flex_orders', flexRes],
    ['member_preferences', prefsRes],
  ] as const) {
    if (res.error) {
      throw new Error(`resolveCycle: ${label} fetch failed: ${res.error.message}`);
    }
  }

  const memberRows = (memberRes.data ?? []) as unknown as MemberJoinRow[];
  const holds = holdRes.data ?? [];
  const swaps = swapRes.data ?? [];
  const plans = planRes.data ?? [];
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

  // share_size → { contents, published_at }
  const boxPlanBySize = new Map<string, { contents: BoxContentLine[]; published_at: string | null }>();
  for (const p of plans) {
    boxPlanBySize.set(p.share_size, {
      contents: Array.isArray(p.contents) ? (p.contents as unknown as BoxContentLine[]) : [],
      published_at: p.published_at,
    });
  }

  // ─── 7. Build CycleMember rows, partitioned by inclusion ───────
  const included: CycleMember[] = [];
  const excludedBiweekly: CycleMember[] = [];
  const excludedOnHold: CycleMember[] = [];

  for (const m of memberRows) {
    const { type: addon_type, frequency: addon_frequency } = deriveAddon(m.notes);
    const pref = prefsByMember.get(m.id);
    const cycle_member: CycleMember = {
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
      allergies: pref?.allergies ?? [],
      dislikes: pref?.dislikes ?? [],
      delivery_notes: pref?.delivery_notes ?? null,
    };

    const memberHolds = holdsByMember.get(m.id) ?? [];
    const onHold = memberHolds.some((h) => holdOverlapsWeek(h, week_starting));

    if (onHold) {
      excludedOnHold.push(cycle_member);
      continue;
    }
    if (!cycle_member.on_this_week) {
      // Add-on members default to weekly delivery in many cases — only
      // exclude them from the biweekly bucket if their resolved frequency
      // also says biweekly (or unknown — conservative).
      if (m.share_type === 'add_on' && addon_frequency === 'weekly') {
        // Weekly add-on ships even on biweekly off-weeks (their own
        // schedule overrides their A/B). Include.
        included.push({ ...cycle_member, on_this_week: true });
        continue;
      }
      excludedBiweekly.push(cycle_member);
      continue;
    }
    included.push(cycle_member);
  }

  // ─── 8. byStop + byDistributionDay buckets ─────────────────────
  const byStop = new Map<string, CycleMember[]>();
  const byDistributionDay = new Map<WeekdayCode, CycleMember[]>();
  byDistributionDay.set('Tue', []);
  byDistributionDay.set('Wed', []);
  byDistributionDay.set('Sat', []);

  for (const member of included) {
    // Stop bucket
    let stopKey: string;
    if (member.delivery_address && !member.pickup_location_id) {
      stopKey = HOME_DELIVERY_STOP_ID;
    } else if (member.pickup_location_id) {
      stopKey = member.pickup_location_id;
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
    if (!isAddonOnThisWeek(member, member.addon_frequency, week_starting)) continue;
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
  for (const allergy of member.allergies ?? []) {
    const a = allergy.trim().toLowerCase();
    if (!a) continue;
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const crop = items[i].crop.toLowerCase();
      if (cropMatches(crop, a)) {
        allergy_subs.push({ removed: items[i].crop, reason: `allergy: ${allergy}` });
        flagSet.add(items[i].crop.toLowerCase());
        items.splice(i, 1);
      }
    }
  }
  for (const dislike of member.dislikes ?? []) {
    const d = dislike.trim().toLowerCase();
    if (!d) continue;
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const crop = items[i].crop.toLowerCase();
      if (!flagSet.has(crop) && cropMatches(crop, d)) {
        allergy_subs.push({ removed: items[i].crop, reason: `dislike: ${dislike}` });
        items.splice(i, 1);
      }
    }
  }

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
