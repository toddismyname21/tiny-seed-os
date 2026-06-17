/**
 * Vacation-hold add-on cascade.
 *
 * REAL INCIDENT this fixes: a member places a vacation hold on their BOX
 * (a `members` row with share_type summer_veg / spring_veg / flower), but
 * their ADD-ONS (bread / cheese / mushroom / coffee — SEPARATE `members`
 * rows with share_type='add_on', same customer) are NOT held. So the
 * add-on still tries to pack with no box to ride along in.
 *
 * Fix: whenever a hold is created for a BOX share, ALSO create matching
 * holds for every ACTIVE add_on row belonging to the SAME customer that
 * isn't already held for an overlapping date range. The add-on "rides the
 * held box": same start/end/status/disposition/move_to_week, with the
 * reason suffixed " [auto: rides the held box]".
 *
 * ── Why a DIRECT INSERT (not the schedule_vacation_hold RPC) ───────────
 * The RPC enforces the BOX member's own vacation budget + overlap and
 * INCREMENTS that member's vacation_weeks_used. An add-on rider hold must
 * NOT consume the add-on's own vacation budget (the member already "spent"
 * the week on the box), and must NOT hard-error on an existing overlap —
 * it should be idempotent (skip an add-on that's already held). A plain
 * INSERT through the cookie-aware (RLS-scoped) client is exactly right:
 * the `vacation_self_all` policy (migration 0011) permits insert/select on
 * vacation_holds where member_id belongs to current_customer_id()'s
 * members — which the add-on rows do.
 *
 * ── Idempotency ────────────────────────────────────────────────────────
 * For each add-on we first check for an existing scheduled/active hold that
 * OVERLAPS [start, end] (existing.start <= end AND existing.end >= start)
 * and skip it if found. This makes a repeat call (or a retry) a no-op and
 * never double-holds.
 *
 * This module is app-layer only — no DB migration. It is intentionally
 * best-effort: a cascade failure must never undo the box hold that already
 * succeeded, so callers log and continue. The function returns a summary so
 * callers (and tests) can assert what happened.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/** Box share types whose hold should cascade to add-ons. */
const BOX_SHARE_TYPES = new Set([
  'summer_veg',
  'spring_veg',
  'fall_veg',
  'flower',
  'wholesale_csa',
]);

export type CascadeHoldInput = {
  /** The BOX member the hold was created for. */
  boxMemberId: string;
  /**
   * The just-created BOX hold's id (vacation_holds.id). Stamped onto every
   * rider as `parent_hold_id` so the cancel cascade can find them by FK
   * (migration 0052) instead of the old date-overlap + reason-marker heuristic.
   */
  boxHoldId: string;
  /** The BOX member's share_type — used to decide whether to cascade. */
  boxShareType: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  disposition: 'skip' | 'move' | 'donate';
  move_to_week: string | null;
  /** The box hold's reason (may be null). The add-on reason is derived. */
  reason: string | null;
};

export type CascadeResult = {
  /** True when the box share type is one we cascade for. */
  cascaded: boolean;
  /** add_on member_ids we created a rider hold for. */
  created: string[];
  /** add_on member_ids skipped because they already had an overlapping hold. */
  skippedExisting: string[];
  /** Non-fatal error message, if the cascade couldn't complete. */
  error?: string;
};

const RIDER_SUFFIX = ' [auto: rides the held box]';

/** Compose the add-on rider hold reason from the box hold's reason. */
export function riderReason(boxReason: string | null): string {
  const base = (boxReason ?? '').trim();
  return base ? `${base}${RIDER_SUFFIX}` : RIDER_SUFFIX.trim();
}

/**
 * Is this hold an auto-created add-on RIDER (vs. a member-booked hold)?
 * Riders are stamped with RIDER_SUFFIX in their reason by `riderReason()`.
 * We match the suffix (trimmed, since a blank box reason yields the bare
 * marker) anywhere in the reason so both forms — "Italy trip [auto: …]" and
 * the bare "[auto: …]" — are recognised. Used on the CANCEL path to cancel
 * ONLY the riders we created, never a hold the member booked on the add-on
 * directly.
 */
export function isRiderReason(reason: string | null | undefined): boolean {
  return (reason ?? '').includes(RIDER_SUFFIX.trim());
}

/** Two date ranges (inclusive, YYYY-MM-DD) overlap. */
export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  // Lexicographic compare is correct for zero-padded ISO dates.
  return aStart <= bEnd && aEnd >= bStart;
}

/**
 * Cascade a just-created box vacation hold onto the member's add-ons.
 *
 * @param supabase  Cookie-aware (RLS-scoped) client — the same one that
 *                  created the box hold, so RLS scopes us to this customer.
 * @param input     The box hold details.
 * @returns         A summary of what was created / skipped.
 */
export async function cascadeVacationHoldToAddOns(
  supabase: SupabaseClient<Database>,
  input: CascadeHoldInput
): Promise<CascadeResult> {
  // Only BOX shares cascade. If the held share is itself an add_on (rare),
  // or flex, do nothing extra.
  if (!BOX_SHARE_TYPES.has(input.boxShareType)) {
    return { cascaded: false, created: [], skippedExisting: [] };
  }

  // ── Resolve the customer via the box member, then its ACTIVE add-ons ──
  // RLS lets us read members for our own customer only; the box member is
  // ours (we just created its hold), so its customer_id is readable.
  const { data: boxMember, error: boxErr } = await supabase
    .from('members')
    .select('customer_id')
    .eq('id', input.boxMemberId)
    .maybeSingle();

  if (boxErr) {
    return {
      cascaded: true,
      created: [],
      skippedExisting: [],
      error: `box member lookup failed: ${boxErr.message}`,
    };
  }
  if (!boxMember?.customer_id) {
    return {
      cascaded: true,
      created: [],
      skippedExisting: [],
      error: 'box member has no customer_id',
    };
  }

  const { data: addOns, error: addOnErr } = await supabase
    .from('members')
    .select('id')
    .eq('customer_id', boxMember.customer_id)
    .eq('share_type', 'add_on')
    .in('status', ['active', 'paused', 'onboarding']);

  if (addOnErr) {
    return {
      cascaded: true,
      created: [],
      skippedExisting: [],
      error: `add-on lookup failed: ${addOnErr.message}`,
    };
  }

  const addOnIds = (addOns ?? []).map((a) => a.id as string);
  if (addOnIds.length === 0) {
    return { cascaded: true, created: [], skippedExisting: [] };
  }

  // ── Idempotency: find add-ons that ALREADY have an overlapping hold ──
  // Pull every scheduled/active hold for these add-ons that could overlap
  // (existing.start_date <= end AND existing.end_date >= start), then mark
  // any add-on with such a hold as "skip".
  const { data: existing, error: existErr } = await supabase
    .from('vacation_holds')
    .select('member_id, start_date, end_date, status')
    .in('member_id', addOnIds)
    .in('status', ['scheduled', 'active'])
    .lte('start_date', input.end_date)
    .gte('end_date', input.start_date);

  if (existErr) {
    return {
      cascaded: true,
      created: [],
      skippedExisting: [],
      error: `existing-hold lookup failed: ${existErr.message}`,
    };
  }

  const alreadyHeld = new Set<string>();
  for (const h of existing ?? []) {
    // Defensive re-check of overlap (the query already filtered, but keep
    // the predicate explicit so the contract is obvious + testable).
    if (
      rangesOverlap(
        h.start_date as string,
        h.end_date as string,
        input.start_date,
        input.end_date
      )
    ) {
      alreadyHeld.add(h.member_id as string);
    }
  }

  const toCreate = addOnIds.filter((id) => !alreadyHeld.has(id));
  const skippedExisting = addOnIds.filter((id) => alreadyHeld.has(id));

  if (toCreate.length === 0) {
    return { cascaded: true, created: [], skippedExisting };
  }

  // ── Insert rider holds (one row per add-on) ──
  // Resilience mirror of the schedule route + /account/vacation page: the
  // disposition / move_to_week columns only exist AFTER migration 0041, and
  // parent_hold_id only AFTER migration 0052. On a DB missing either, the
  // full insert errors. We TRY the full insert, and on a "column does not
  // exist" error FALL BACK to the pre-0041 column set (the box hold can only
  // be a plain skip pre-0041, and a pre-0052 DB still cancels riders by the
  // legacy heuristic which the cancel path retains). AUTO-RECOVERS once both
  // migrations are applied — no code change.
  const reason = riderReason(input.reason);
  const fullRows = toCreate.map((member_id) => ({
    member_id,
    start_date: input.start_date,
    end_date: input.end_date,
    status: input.status,
    disposition: input.disposition,
    move_to_week: input.move_to_week,
    reason,
    parent_hold_id: input.boxHoldId,
  }));

  let inserted: { member_id: string }[] | null = null;
  let insErr: { message: string; code?: string } | null = null;

  {
    const res = await supabase
      .from('vacation_holds')
      .insert(fullRows)
      .select('member_id');
    inserted = (res.data as { member_id: string }[] | null) ?? null;
    insErr = res.error;
  }

  const isMissingColumn =
    !!insErr &&
    (insErr.code === '42703' ||
      /column .* does not exist|disposition|move_to_week|parent_hold_id|schema cache/i.test(
        insErr.message ?? ''
      ));

  if (insErr && isMissingColumn) {
    const baseRows = toCreate.map((member_id) => ({
      member_id,
      start_date: input.start_date,
      end_date: input.end_date,
      status: input.status,
      reason,
    }));
    const res = await supabase
      .from('vacation_holds')
      .insert(baseRows)
      .select('member_id');
    inserted = (res.data as { member_id: string }[] | null) ?? null;
    insErr = res.error;
  }

  if (insErr) {
    return {
      cascaded: true,
      created: [],
      skippedExisting,
      error: `rider insert failed: ${insErr.message}`,
    };
  }

  return {
    cascaded: true,
    created: (inserted ?? []).map((r) => r.member_id),
    skippedExisting,
  };
}

/* ──────────────────────────────────────────────────────────────────────
 * CANCEL cascade — the mirror of the create cascade above.
 *
 * REAL GAP this fixes (flagged 2026-06-16): a member cancels a vacation hold
 * on their BOX, but the auto-created add-on RIDER holds stay scheduled/active
 * — orphaning them (the add-on resumes packing with no box to ride in / stays
 * paused while the box is live). When the box hold goes away, its riders must
 * go away too.
 *
 * Fix: after a box hold is cancelled, find every ACTIVE/SCHEDULED add_on RIDER
 * hold whose `parent_hold_id` points at the cancelled box hold (migration
 * 0052), and cancel them.
 *
 * ── Why parent_hold_id, not the old date-overlap heuristic ──────────────
 * The original matcher used (same customer + date OVERLAP + rider marker).
 * That mis-fires when a member holds TWO OVERLAPPING box holds: cancelling
 * one would also cancel the other's riders (they all overlap, all carry the
 * marker, all share the customer). The FK is exact — each rider points at
 * exactly ONE box hold — so cancelling box A touches only box A's riders.
 *
 * ── Why a DIRECT UPDATE (not the cancel_vacation_hold RPC) ──────────────
 * Faithful symmetry with how riders are CREATED (a direct INSERT, NOT the
 * schedule RPC). Riders never INCREMENT the add-on's vacation_weeks_used, so
 * cancelling them must NOT DECREMENT it either — but cancel_vacation_hold()
 * (migration 0016) always tries to refund weeks. A plain UPDATE
 * (status='cancelled', cancelled_at=now()) through the cookie-aware
 * (RLS-scoped) client touches only the hold row, never the counter — exactly
 * right. The vacation_self_all policy (migration 0011) permits the update on
 * vacation_holds whose member_id belongs to current_customer_id()'s members.
 *
 * ── Scope guard ─────────────────────────────────────────────────────────
 * We select riders by parent_hold_id = the cancelled box hold's id, so only
 * riders that actually ride THIS box hold are touched — a hold the member
 * booked directly on an add-on (parent_hold_id NULL) and a rider riding a
 * DIFFERENT box hold are both left intact, without any date math.
 *
 * Best-effort: a cascade failure must NEVER undo the box cancel that already
 * succeeded — callers log and continue. Returns a summary for callers/tests.
 * ────────────────────────────────────────────────────────────────────── */

export type CancelCascadeInput = {
  /** The BOX member whose hold was just cancelled. */
  boxMemberId: string;
  /**
   * The cancelled BOX hold's id (vacation_holds.id). Riders are matched by
   * `parent_hold_id = boxHoldId` (migration 0052) — exact, not by date overlap.
   */
  boxHoldId: string;
  /** The BOX member's share_type — used to decide whether to cascade. */
  boxShareType: string;
  /**
   * The cancelled box hold's date range. Retained only for the pre-0052
   * fallback (riders created before parent_hold_id existed carry no FK, so
   * we fall back to the legacy overlap + marker match for those).
   */
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
};

export type CancelCascadeResult = {
  /** True when the box share type is one we cascade for. */
  cascaded: boolean;
  /** add-on hold ids we cancelled (rider holds). */
  cancelled: string[];
  /** Non-fatal error message, if the cascade couldn't complete. */
  error?: string;
};

/**
 * Cascade a just-cancelled box vacation hold onto the member's add-on riders.
 *
 * @param supabase  Cookie-aware (RLS-scoped) client — the same one that
 *                  cancelled the box hold, so RLS scopes us to this customer.
 * @param input     The cancelled box hold details.
 * @returns         A summary of which rider holds were cancelled.
 */
export async function cascadeVacationCancelToAddOns(
  supabase: SupabaseClient<Database>,
  input: CancelCascadeInput
): Promise<CancelCascadeResult> {
  // Only BOX shares cascade. If the cancelled hold is itself an add_on (rare)
  // or flex, there are no riders to clean up.
  if (!BOX_SHARE_TYPES.has(input.boxShareType)) {
    return { cascaded: false, cancelled: [] };
  }

  // ── Find the rider holds to cancel (PRIMARY: by parent_hold_id FK) ──
  // Riders created by the create cascade carry parent_hold_id = this box
  // hold's id (migration 0052). Select the scheduled/active ones directly —
  // no customer resolution, no date math, no marker guessing. RLS still scopes
  // the read to the current customer's holds, so the FK can only ever resolve
  // to a rider we own.
  let riderHoldIds: string[] = [];

  const { data: fkRiders, error: fkErr } = await supabase
    .from('vacation_holds')
    .select('id')
    .eq('parent_hold_id', input.boxHoldId)
    .in('status', ['scheduled', 'active']);

  // Pre-0052 resilience: if parent_hold_id doesn't exist yet (or PostgREST's
  // schema cache hasn't picked it up), the column filter errors. Riders made
  // before the migration carry no FK anyway, so fall back to the legacy
  // (customer + date-overlap + rider-marker) heuristic for those. AUTO-RECOVERS
  // once 0052 is applied and riders are backfilled — no code change.
  const fkColumnMissing =
    !!fkErr &&
    (fkErr.code === '42703' ||
      /column .* does not exist|parent_hold_id|schema cache/i.test(fkErr.message ?? ''));

  if (fkErr && !fkColumnMissing) {
    return { cascaded: true, cancelled: [], error: `rider lookup failed: ${fkErr.message}` };
  }

  if (!fkErr) {
    riderHoldIds = (fkRiders ?? []).map((r) => r.id as string);
  } else {
    // ── Legacy fallback (pre-0052 only) ──
    // Resolve the customer via the box member, then its add-ons, then the
    // overlapping rider-marked holds — exactly the original heuristic.
    const { data: boxMember, error: boxErr } = await supabase
      .from('members')
      .select('customer_id')
      .eq('id', input.boxMemberId)
      .maybeSingle();

    if (boxErr) {
      return { cascaded: true, cancelled: [], error: `box member lookup failed: ${boxErr.message}` };
    }
    if (!boxMember?.customer_id) {
      return { cascaded: true, cancelled: [], error: 'box member has no customer_id' };
    }

    const { data: addOns, error: addOnErr } = await supabase
      .from('members')
      .select('id')
      .eq('customer_id', boxMember.customer_id)
      .eq('share_type', 'add_on');

    if (addOnErr) {
      return { cascaded: true, cancelled: [], error: `add-on lookup failed: ${addOnErr.message}` };
    }

    const addOnIds = (addOns ?? []).map((a) => a.id as string);
    if (addOnIds.length === 0) {
      return { cascaded: true, cancelled: [] };
    }

    const { data: candidates, error: candErr } = await supabase
      .from('vacation_holds')
      .select('id, member_id, start_date, end_date, status, reason')
      .in('member_id', addOnIds)
      .in('status', ['scheduled', 'active'])
      .lte('start_date', input.end_date)
      .gte('end_date', input.start_date);

    if (candErr) {
      return { cascaded: true, cancelled: [], error: `rider lookup failed: ${candErr.message}` };
    }

    for (const h of candidates ?? []) {
      if (
        isRiderReason(h.reason as string | null) &&
        rangesOverlap(
          h.start_date as string,
          h.end_date as string,
          input.start_date,
          input.end_date
        )
      ) {
        riderHoldIds.push(h.id as string);
      }
    }
  }

  if (riderHoldIds.length === 0) {
    return { cascaded: true, cancelled: [] };
  }

  // ── Cancel the rider holds (direct UPDATE; never touches the counter) ──
  // cancelled_at exists since the original vacation_holds schema (migration
  // 0016 sets it). We update only id + status + cancelled_at.
  const { data: updated, error: updErr } = await supabase
    .from('vacation_holds')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .in('id', riderHoldIds)
    .select('id');

  if (updErr) {
    return { cascaded: true, cancelled: [], error: `rider cancel failed: ${updErr.message}` };
  }

  return {
    cascaded: true,
    cancelled: (updated ?? []).map((r) => r.id as string),
  };
}
