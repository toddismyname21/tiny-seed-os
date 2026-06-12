/**
 * Account-page shared helpers.
 *
 * Used by `/account/*` pages and `/api/account/*` routes.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * The customer (account owner) the logged-in user resolves to, for the
 * member-facing share pages (dashboard, box, account hub).
 *
 * WHY THIS EXISTS (household-sharing fix, 2026-06-12): an INVITED household
 * member (migration 0023 — a row in `account_members`, no `customers` row of
 * their own) signs in with their OWN email. The `customers_self_read` RLS
 * policy is keyed on `email = auth.jwt()->>'email'`, so a direct
 * `from('customers')...` query returns ZERO rows for them — even though
 * `current_customer_id()` correctly resolves their JWT email to the OWNER's
 * customer id (and `members_self_read` therefore DOES grant them the owner's
 * member rows). The old pages embedded `members` UNDER `customers`, so the
 * invisible parent customers row hid the shares entirely → "can't see our
 * share".
 *
 * `household_owner()` (migration 0023, SECURITY DEFINER) returns the resolved
 * account owner (id, contact_name, email) for the caller's `current_customer_id()`
 * — it works identically for a PRIMARY (their own row) and an INVITED member
 * (the owner's row), and exposes nothing else. We use it as the single source
 * of "which customer am I?", then query `members` directly by that id (RLS via
 * current_customer_id() scopes it). This fixes invited members WITHOUT widening
 * any RLS policy or touching the primary's behavior.
 *
 * Returns null when the caller resolves to no account at all (no customers row
 * AND no active household membership) — the page then shows its "no share" /
 * "no customer record" empty state, exactly as before.
 *
 * FAIL-SOFT: on any RPC error returns null (the page falls back to its
 * empty state rather than crashing).
 */
export interface ResolvedAccountCustomer {
  id: string;
  contactName: string;
  email: string;
}

export async function resolveAccountCustomer(
  supabase: SupabaseClient<Database>
): Promise<ResolvedAccountCustomer | null> {
  try {
    const { data, error } = await supabase.rpc('household_owner');
    if (error) {
      console.error('[account] resolveAccountCustomer (household_owner) failed:', error.message);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : null;
    if (!row || !row.owner_id) return null;
    return {
      id: row.owner_id,
      contactName: row.contact_name ?? '',
      email: row.email ?? '',
    };
  } catch (e) {
    console.error('[account] resolveAccountCustomer threw (→ null):', e);
    return null;
  }
}

/**
 * Does this logged-in member still need to choose a pickup location or home
 * delivery?  TRUE when they have at least one ACTIVE share AND none of their
 * active shares has either a `pickup_location_id` or a `delivery_address`.
 *
 * WHY THIS EXISTS (FIX 1, 2026-05-24): the ~191 members migrated from the
 * 2026 CSA Shopify products are `status='active'`, but the CSA products did
 * NOT capture a pickup choice at checkout. The onboarding funnel in
 * middleware only catches `status='onboarding'`, so these active members are
 * never prompted. They MUST choose a pickup/delivery before the first box
 * (Wed June 10). This drives a persistent dashboard/box/account banner.
 *
 * Scope decision — ACTIVE only: paused/onboarding shares are excluded.
 *   - onboarding members are already funnelled to /onboarding (which sets
 *     pickup), so nudging them too would double up.
 *   - a paused share isn't receiving a box, so a pickup nudge is premature.
 * If ANY active share already has a pickup OR a delivery address, the member
 * has made a choice → no nudge (a multi-share member who set one is done).
 *
 * Uses the caller's RLS-scoped cookie client, so it only ever sees the
 * current member's own rows. FAIL-SOFT: any query error returns `false`
 * (never block the page or show a false alarm on a transient DB hiccup).
 */
export async function memberNeedsPickupChoice(
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('pickup_location_id, delivery_address')
      .eq('status', 'active');

    if (error) {
      console.error('[account] pickup-nudge check failed:', error.message);
      return false; // fail-soft — don't show a false alarm
    }

    const rows = data ?? [];
    if (rows.length === 0) return false; // no active share → nothing to nudge

    // Needs a choice iff NO active share has a pickup OR a delivery address.
    const anyChosen = rows.some((r) => {
      const hasPickup = r.pickup_location_id != null;
      const hasDelivery =
        typeof r.delivery_address === 'string' && r.delivery_address.trim().length > 0;
      return hasPickup || hasDelivery;
    });
    return !anyChosen;
  } catch (e) {
    console.error('[account] pickup-nudge check threw (→ false):', e);
    return false;
  }
}

/**
 * Does this logged-in member have an ACTIVE flex share?
 *
 * This is the single, canonical "is a flex member?" signal shared by:
 *   - the MemberShell bottom-nav "Order" tab (FIX 1, 2026-06-08) — computed
 *     once per request in middleware and stashed on `locals.isFlexMember`
 *     so the tab shows on EVERY member page (box, pickup, vacation…) in one
 *     tap, not just the dashboard/account.
 *   - the /account hub's prominent order CTA + the /account/flex-order gate.
 *
 * Definition matches what the account hub already used to gate its extras
 * card: a member row with `share_type='flex'` in a LIVE status
 * ('active','paused','onboarding'). RLS scopes the query to the caller's
 * own member rows.
 *
 * FAIL-SOFT: any query error returns `false` (hide the order tab rather than
 * surface a dead/empty link on a transient DB hiccup).
 */
export async function memberHasFlexShare(
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('id')
      .eq('share_type', 'flex')
      .in('status', ['active', 'paused', 'onboarding'])
      .limit(1);

    if (error) {
      console.error('[account] flex-share check failed:', error.message);
      return false;
    }
    return (data ?? []).length > 0;
  } catch (e) {
    console.error('[account] flex-share check threw (→ false):', e);
    return false;
  }
}

/**
 * The member's RESOLVED pickup, in a shape the confirm-pickup interstitial
 * and any read-side display can present without re-deriving the rules.
 *
 *   kind = 'none'      → member has an active share but NO pickup/delivery
 *                        chosen yet → route them to /account/pickup first.
 *   kind = 'delivery'  → home delivery (a delivery_address is set).
 *   kind = 'pickup'    → a pickup_location is set. `day`/`time` may be null:
 *                        a stop with no time window is a "text-on-arrival"
 *                        stop (porch host texts members when the box lands);
 *                        a stop WITH a window is a scheduled stop/market.
 *
 * `noActiveShare` is true when the member has no live share at all — the
 * confirm-pickup gate treats that as nothing to acknowledge (pass-through).
 */
export type ResolvedPickupKind = 'none' | 'pickup' | 'delivery';

export interface ResolvedPickup {
  kind: ResolvedPickupKind;
  noActiveShare: boolean;
  /** Pickup-stop display name (kind='pickup'). */
  locationName: string | null;
  /** City for context (kind='pickup'), when present. */
  locationCity: string | null;
  /** Long weekday ("Wednesday") for a scheduled stop, else null. */
  dayLong: string | null;
  /** Formatted time window ("3–6 PM") for a scheduled stop/market, else null. */
  timeRange: string | null;
  /** Full home-delivery address (kind='delivery'). */
  deliveryAddress: string | null;
  /**
   * True for a pickup stop with NO time window — present "you'll get a text
   * when it arrives" rather than a clock time.
   */
  textOnArrival: boolean;
  /**
   * MEMBER-FACING custom instructions for the resolved pickup stop
   * (kind='pickup'), straight from pickup_locations.pickup_instructions.
   * NULL when the stop has none — the UI then shows only its generic copy
   * (never an empty block). DISTINCT from the admin-only `notes` column,
   * which must never reach members.
   */
  pickupInstructions: string | null;
  /**
   * MEMBER-FACING host name for the resolved pickup stop (kind='pickup'),
   * straight from pickup_locations.host_name. NULL for a stop with no host
   * (markets / farm). When present, the surface shows a "Your host" line +
   * the respect-your-host note. DISTINCT from the admin-only `notes` column.
   */
  hostName: string | null;
  /**
   * MEMBER-FACING host phone for the resolved pickup stop (kind='pickup'),
   * straight from pickup_locations.host_phone. NULL when the host has no
   * number on file; rendered as a `tel:` link when present.
   */
  hostPhone: string | null;
}

const PICKUP_DAY_LONG: Record<string, string> = {
  Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
  Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday',
};

/**
 * Format a 'HH:MM[:SS]' pair as "3–6 PM" (collapses a shared period).
 * Returns '' when either bound is missing.
 */
export function formatPickupTimeRange(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  if (!start || !end) return '';
  const fmt = (t: string): { label: string; period: string } => {
    const [hStr, mStr = '0'] = t.split(':');
    let h = Number(hStr);
    const m = Number(mStr);
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 === 0 ? 12 : h % 12;
    const label = m === 0 ? `${h}` : `${h}:${String(m).padStart(2, '0')}`;
    return { label, period };
  };
  const s = fmt(start);
  const e = fmt(end);
  // Collapse "3 PM–6 PM" → "3–6 PM" when both share a period.
  return s.period === e.period
    ? `${s.label}–${e.label} ${e.period}`
    : `${s.label} ${s.period}–${e.label} ${e.period}`;
}

/**
 * Resolve the current member's pickup choice for the confirm-pickup gate +
 * interstitial. Mirrors the dashboard's "primary share" selection (most
 * recent live share) and the `memberNeedsPickupChoice` rule.
 *
 * Uses the caller's RLS-scoped client → only ever the member's own rows.
 * FAIL-SOFT: on any error returns a `noActiveShare` result so the GATE never
 * traps a paying member behind a transient DB hiccup (the gate passes through
 * on noActiveShare).
 */
export async function resolveMemberPickup(
  supabase: SupabaseClient<Database>
): Promise<ResolvedPickup> {
  const EMPTY: ResolvedPickup = {
    kind: 'none', noActiveShare: true, locationName: null, locationCity: null,
    dayLong: null, timeRange: null, deliveryAddress: null, textOnArrival: false,
    pickupInstructions: null, hostName: null, hostPhone: null,
  };
  type PickupRow = {
    status: string;
    start_date: string | null;
    pickup_location_id: string | null;
    delivery_address: string | null;
    pickup_location: {
      name: string;
      city: string | null;
      day_of_week: string | null;
      time_start: string | null;
      time_end: string | null;
      pickup_instructions: string | null;
      host_name: string | null;
      host_phone: string | null;
    } | null;
  };

  try {
    const { data, error } = await supabase
      .from('members')
      .select(
        `
        status,
        start_date,
        pickup_location_id,
        delivery_address,
        pickup_location:pickup_locations (
          name, city, day_of_week, time_start, time_end, pickup_instructions,
          host_name, host_phone
        )
      `
      )
      .in('status', ['active', 'paused', 'onboarding'])
      .order('start_date', { ascending: false })
      .overrideTypes<PickupRow[], { merge: false }>();

    if (error) {
      console.error('[account] resolveMemberPickup failed:', error.message);
      return EMPTY;
    }

    const rows = data ?? [];

    if (rows.length === 0) return EMPTY; // no live share → nothing to confirm

    // Prefer a share that has actually MADE a choice (pickup or delivery);
    // otherwise fall back to the first (most-recent) live share so we can
    // show the 'none' state. This matches the dashboard's primary-share pick.
    const chosen =
      rows.find(
        (r) =>
          r.pickup_location_id != null ||
          (typeof r.delivery_address === 'string' && r.delivery_address.trim().length > 0)
      ) ?? rows[0];

    const hasDelivery =
      typeof chosen.delivery_address === 'string' && chosen.delivery_address.trim().length > 0;
    if (hasDelivery) {
      return {
        kind: 'delivery', noActiveShare: false, locationName: null, locationCity: null,
        dayLong: null, timeRange: null, deliveryAddress: chosen.delivery_address!.trim(),
        textOnArrival: false, pickupInstructions: null, hostName: null, hostPhone: null,
      };
    }

    if (chosen.pickup_location_id != null && chosen.pickup_location) {
      const loc = chosen.pickup_location;
      const timeRange = formatPickupTimeRange(loc.time_start, loc.time_end);
      const dayLong = loc.day_of_week ? PICKUP_DAY_LONG[loc.day_of_week] ?? loc.day_of_week : null;
      const instructions =
        typeof loc.pickup_instructions === 'string' && loc.pickup_instructions.trim().length > 0
          ? loc.pickup_instructions.trim()
          : null;
      const hostName =
        typeof loc.host_name === 'string' && loc.host_name.trim().length > 0
          ? loc.host_name.trim()
          : null;
      const hostPhone =
        typeof loc.host_phone === 'string' && loc.host_phone.trim().length > 0
          ? loc.host_phone.trim()
          : null;
      return {
        kind: 'pickup', noActiveShare: false,
        locationName: loc.name, locationCity: loc.city,
        dayLong, timeRange: timeRange || null, deliveryAddress: null,
        textOnArrival: timeRange.length === 0,
        pickupInstructions: instructions,
        hostName, hostPhone,
      };
    }

    // Live share but no pickup/delivery chosen → must choose first.
    return {
      kind: 'none', noActiveShare: false, locationName: null, locationCity: null,
      dayLong: null, timeRange: null, deliveryAddress: null, textOnArrival: false,
      pickupInstructions: null, hostName: null, hostPhone: null,
    };
  } catch (e) {
    console.error('[account] resolveMemberPickup threw (→ noActiveShare):', e);
    return EMPTY;
  }
}

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
  // Migration 0041 — disposition (move / donate) errors.
  invalid_disposition: 'Please choose Skip, Move to another week, or Donate.',
  move_target_required: 'Pick the week you\'d like your box moved to.',
  move_target_not_allowed: "A move-to week only applies when you're moving a box. Please try again.",
  move_target_in_past: "That week has already passed — please pick an upcoming delivery week.",
  invalid_move_target: "That isn't a valid delivery week to move to — please pick one from the list.",
  // Pre-migration fallback: the move/donate options aren't live on the server
  // yet, so we couldn't apply that choice. A plain skip still works.
  move_donate_unavailable: "Moving or donating a box isn't available just yet — for now you can skip these weeks, or email us and we'll sort it out.",
  network: "We couldn't reach the server. Please try again.",
};

export const PREFS_ERROR_COPY: Record<string, string> = {
  too_many_dislikes: 'Whoa — that\'s a lot. Please keep it under 50 items.',
  notes_too_long: 'Delivery notes are limited to 500 characters.',
  invalid_input: "We couldn't save that — please check your entries and try again.",
  invalid_preference: 'Please choose a valid contact preference.',
  network: "We couldn't reach the server. Please try again.",
};

export const PROFILE_ERROR_COPY: Record<string, string> = {
  name_required: 'Please enter your name.',
  name_too_long: 'Your name is a little long — please keep it under 120 characters.',
  phone_too_long: 'That phone number looks too long — please double-check it.',
  invalid_input: "We couldn't save that — please check your entries and try again.",
  network: "We couldn't reach the server. Please try again.",
};

export const PICKUP_ERROR_COPY: Record<string, string> = {
  invalid_input: 'Please pick a pickup location, or enter a valid delivery address to request home delivery.',
  location_not_found: 'That pickup location is no longer available.',
  location_full: 'That location is at capacity. Try another or contact us.',
  member_not_found: "We couldn't find that share on your account.",
  // Home delivery is paid + admin-approved, so a member can't set it directly —
  // they request it instead (this code should be unreachable from the UI, since
  // the member form posts to /api/account/request-delivery, but we map it so a
  // hand-crafted POST gets a clear message rather than a generic one).
  delivery_admin_only:
    'Home delivery is $15/week and needs farm approval — use “Request home delivery” and we’ll set it up for you.',
  already_delivery: "You're already set up for home delivery. Contact us to make changes.",
  no_active_share: "We don't have an active share on your account yet.",
  network: "We couldn't reach the server. Please try again.",
};

export const BIWEEKLY_ERROR_COPY: Record<string, string> = {
  invalid_input: 'Please choose Week A, Week B, or "no preference".',
  no_active_share: "We don't have an active share on your account yet.",
  network: "We couldn't reach the server. Please try again.",
};

export const HOUSEHOLD_ERROR_COPY: Record<string, string> = {
  invalid_input: "We couldn't read that — please check the email and try again.",
  invalid_email: 'Please enter a valid email address.',
  already_member:
    'That email already has its own Tiny Seed Farm CSA account, so it can’t be added here. If you think that’s a mistake, contact the farm.',
  already_invited: 'That person is already on your account.',
  self_invite: "That’s your own login email — you already have full access.",
  not_primary:
    'Only the account owner can add or remove people. Ask them to make changes for you.',
  network: "We couldn't reach the server. Please try again.",
};
