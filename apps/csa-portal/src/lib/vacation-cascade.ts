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
  // disposition / move_to_week columns only exist AFTER migration 0041. On a
  // pre-0041 DB, inserting them errors. We TRY the full insert, and on a
  // "column does not exist" error FALL BACK to the pre-0041 column set (the
  // box hold can only be a plain skip pre-migration, so dropping disposition
  // is faithful). AUTO-RECOVERS once 0041 is applied — no code change.
  const reason = riderReason(input.reason);
  const fullRows = toCreate.map((member_id) => ({
    member_id,
    start_date: input.start_date,
    end_date: input.end_date,
    status: input.status,
    disposition: input.disposition,
    move_to_week: input.move_to_week,
    reason,
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
      /column .* does not exist|disposition|move_to_week|schema cache/i.test(
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
