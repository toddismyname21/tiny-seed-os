/**
 * POST /api/account/vacation/schedule
 *
 * Body (multipart/form-data, from the /account/vacation/new form):
 *   - member_id     UUID of the member row to apply the hold to
 *   - start_date    YYYY-MM-DD
 *   - end_date      YYYY-MM-DD
 *   - reason        Optional free text (≤ 500 chars)
 *   - disposition   'skip' (default) | 'move' | 'donate'  (migration 0041)
 *   - move_to_week  YYYY-MM-DD (Monday/week_starting of the target delivery
 *                   week) — REQUIRED when disposition='move', else omitted.
 *
 * Authentication: enforced by middleware (Astro.locals.user is non-null).
 * Authorization: the caller must own the `member_id`. We confirm by
 *   selecting the row through the cookie-aware (RLS-scoped) client first.
 *
 * On success: 303 → /account/vacation?ok=scheduled.
 * On validation/business failure: 303 → /account/vacation/new?error=<code>
 *   with start_date / end_date / reason preserved in the query string so
 *   the form re-renders with the user's input.
 *
 * Atomic write: Postgres function `schedule_vacation_hold(...)` (migration
 * 0016) handles the FOR UPDATE lock + budget + overlap + INSERT + counter
 * INCREMENT in one transaction.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { isValidMoveTarget, isMonday } from '../../../../lib/cycle';
import { cascadeVacationHoldToAddOns } from '../../../../lib/vacation-cascade';

export const prerender = false;

const FormSchema = z.object({
  member_id: z.uuid('invalid_input'),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid_input'),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid_input'),
  reason: z.string().max(500, 'reason_too_long').nullable(),
  // Migration 0041 — disposition + optional move target.
  disposition: z.enum(['skip', 'move', 'donate'], { message: 'invalid_disposition' }),
  // move_to_week is a Monday (week_starting) string OR null. Cross-field
  // validity (required-for-move, in-season, future) is checked below.
  move_to_week: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid_move_target')
    .nullable(),
});

type ScheduleResult =
  | { ok: true; hold_id: string; weeks_used: number; disposition?: string }
  | {
      error:
        | 'invalid_input'
        | 'member_not_found'
        | 'start_date_in_past'
        | 'invalid_date_range'
        | 'insufficient_vacation_weeks'
        | 'overlapping_hold'
        | 'invalid_disposition'
        | 'move_target_required'
        | 'move_target_not_allowed'
        | 'move_target_in_past'
        | 'invalid_move_target';
      requested?: number;
      available?: number;
    };

function preserveOnError(
  code: string,
  startDate: string,
  endDate: string,
  reason: string | null,
  disposition?: string,
  moveToWeek?: string | null
): string {
  const params = new URLSearchParams();
  params.set('error', code);
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  if (reason) params.set('reason', reason);
  if (disposition) params.set('disposition', disposition);
  if (moveToWeek) params.set('move_to_week', moveToWeek);
  return `/account/vacation/new?${params.toString()}`;
}

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  const user = locals.user;
  if (!user || !user.email) {
    return redirect('/login', 303);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (e) {
    console.error('[api/account/vacation/schedule] formData parse failed', e);
    return redirect('/account/vacation/new?error=invalid_input', 303);
  }

  const rawMemberId = String(formData.get('member_id') ?? '');
  const rawStart = String(formData.get('start_date') ?? '');
  const rawEnd = String(formData.get('end_date') ?? '');
  const rawReason = String(formData.get('reason') ?? '').trim();
  // Default disposition to 'skip' so a form that omits it (or an older
  // client) keeps today's behaviour.
  const rawDisposition = String(formData.get('disposition') ?? 'skip').trim() || 'skip';
  const rawMoveToWeek = String(formData.get('move_to_week') ?? '').trim();

  const parsed = FormSchema.safeParse({
    member_id: rawMemberId,
    start_date: rawStart,
    end_date: rawEnd,
    reason: rawReason === '' ? null : rawReason,
    disposition: rawDisposition,
    // Only carry a move target when disposition is 'move'; otherwise null
    // so the SQL's "skip/donate must have null move_to_week" check passes.
    move_to_week: rawDisposition === 'move' && rawMoveToWeek !== '' ? rawMoveToWeek : null,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const msg = issue?.message;
    const code =
      msg === 'reason_too_long' ? 'reason_too_long'
      : msg === 'invalid_disposition' ? 'invalid_disposition'
      : msg === 'invalid_move_target' ? 'invalid_move_target'
      : 'invalid_input';
    return redirect(preserveOnError(code, rawStart, rawEnd, rawReason, rawDisposition, rawMoveToWeek), 303);
  }

  const { member_id, start_date, end_date, reason, disposition, move_to_week } = parsed.data;

  // ─── Cross-field: move requires a target; skip/donate must not have one ──
  if (disposition === 'move' && !move_to_week) {
    return redirect(preserveOnError('move_target_required', start_date, end_date, reason, disposition, rawMoveToWeek), 303);
  }
  if (disposition !== 'move' && move_to_week) {
    return redirect(preserveOnError('move_target_not_allowed', start_date, end_date, reason, disposition, null), 303);
  }
  // A move target must be a Monday (week_starting). The UI submits Mondays;
  // reject anything else before we hit the DB.
  if (disposition === 'move' && move_to_week && !isMonday(move_to_week)) {
    return redirect(preserveOnError('invalid_move_target', start_date, end_date, reason, disposition, move_to_week), 303);
  }

  // ─── Authorization: confirm caller owns this member ───────────────
  // RLS on members restricts SELECT to rows where customer_id matches
  // current_customer_id() (the user's customer row). If the user
  // doesn't own this member, the query returns zero rows. We also read
  // share_type here to server-validate the move target is a real future
  // in-season delivery week for THIS share.
  type MemberRow = { id: string; status: string; share_type: string };
  const { data: memberData, error: memberErr } = await locals.supabase
    .from('members')
    .select('id, status, share_type')
    .eq('id', member_id)
    .maybeSingle()
    .overrideTypes<MemberRow, { merge: false }>();

  if (memberErr) {
    console.error('[api/account/vacation/schedule] member lookup failed:', memberErr.message);
    return redirect(preserveOnError('invalid_input', start_date, end_date, reason, disposition, move_to_week), 303);
  }
  if (!memberData) {
    return redirect(preserveOnError('member_not_found', start_date, end_date, reason, disposition, move_to_week), 303);
  }
  if (!['active', 'paused', 'onboarding'].includes(memberData.status)) {
    return redirect(preserveOnError('member_not_found', start_date, end_date, reason, disposition, move_to_week), 303);
  }

  // ─── Server-validate the move target against the season calendar ──
  // isValidMoveTarget rejects any week that isn't a real FUTURE in-season
  // delivery week for this share_type (defends against a hand-crafted POST).
  if (disposition === 'move' && move_to_week && !isValidMoveTarget(memberData.share_type, move_to_week)) {
    return redirect(preserveOnError('invalid_move_target', start_date, end_date, reason, disposition, move_to_week), 303);
  }

  // ─── Atomic write via SECURITY DEFINER function ────────────────────
  // The 6-arg signature (with p_disposition / p_move_to_week) only exists
  // AFTER migration 0041. On a pre-migration production DB the DB still has
  // the original 4-arg schedule_vacation_hold(p_member_id, p_start_date,
  // p_end_date, p_reason) and PostgREST can't resolve the 6-arg call →
  // it 400s with a "function not found" (PGRST202) error, which would
  // break ALL hold scheduling, even a plain skip.
  //
  // Resilience strategy:
  //   1. TRY the 6-arg call (full disposition support).
  //   2. If it fails because the function signature doesn't exist
  //      (PGRST202 / "Could not find the function"), FALL BACK:
  //        - disposition 'skip'  → call the original 4-arg form (a plain
  //          skip hold succeeds, preserving today's behaviour).
  //        - disposition 'move' / 'donate' → we cannot honour the member's
  //          intent pre-migration, so DON'T silently drop it to a skip.
  //          Redirect back with a friendly error code instead.
  // AUTO-RECOVERS: once 0041 is applied, the 6-arg call resolves and the
  // fallback path is never taken — no code change needed.
  let rpcData: unknown;
  let rpcErr: { message: string; code?: string } | null;

  {
    const res = await locals.supabase.rpc('schedule_vacation_hold', {
      p_member_id: member_id,
      p_start_date: start_date,
      p_end_date: end_date,
      p_reason: reason,
      p_disposition: disposition,
      p_move_to_week: move_to_week,
    });
    rpcData = res.data;
    rpcErr = res.error;
  }

  // Detect "the 6-arg function doesn't exist yet" (pre-migration). PostgREST
  // surfaces a missing RPC as code PGRST202; we also match the human-readable
  // message defensively in case the code field is absent.
  const isMissingFunction =
    !!rpcErr &&
    (rpcErr.code === 'PGRST202' ||
      /could not find the function|schema cache|does not exist/i.test(rpcErr.message ?? ''));

  if (rpcErr && isMissingFunction) {
    console.warn(
      '[api/account/vacation/schedule] 6-arg schedule_vacation_hold unavailable (pre-0041), falling back to 4-arg skip:',
      rpcErr.message
    );

    // Pre-migration we can only create a plain SKIP hold. If the member
    // specifically asked to MOVE or DONATE, don't degrade their choice to a
    // silent skip — send them back with a clear "not available yet" message.
    if (disposition !== 'skip') {
      return redirect(
        preserveOnError('move_donate_unavailable', start_date, end_date, reason, disposition, move_to_week),
        303
      );
    }

    const res = await locals.supabase.rpc('schedule_vacation_hold', {
      p_member_id: member_id,
      p_start_date: start_date,
      p_end_date: end_date,
      p_reason: reason,
    });
    rpcData = res.data;
    rpcErr = res.error;
  }

  if (rpcErr) {
    console.error('[api/account/vacation/schedule] rpc failed:', rpcErr.message);
    return redirect(preserveOnError('invalid_input', start_date, end_date, reason, disposition, move_to_week), 303);
  }

  const result = rpcData as unknown as ScheduleResult;
  if ('error' in result) {
    return redirect(preserveOnError(result.error, start_date, end_date, reason, disposition, move_to_week), 303);
  }

  // ── Cascade the hold to the member's ADD-ONS (bread/cheese/etc.) ──────
  // A vacation hold on a BOX share must also pause that customer's add-on
  // subscriptions, which are separate add_on `members` rows — otherwise the
  // add-on tries to pack with no box to ride along in (real incident). The
  // box hold is created via the SECURITY DEFINER RPC above and stamped
  // status='scheduled' (migration 0041), so the rider holds mirror that.
  //
  // BEST-EFFORT: a cascade failure must NEVER undo the box hold that already
  // succeeded. We log and continue to the success redirect either way. The
  // helper is idempotent (skips add-ons already held for an overlapping
  // range) and no-ops when the held share is itself an add_on / flex.
  try {
    const cascade = await cascadeVacationHoldToAddOns(locals.supabase, {
      boxMemberId: member_id,
      // The box hold's id — stamped onto each rider as parent_hold_id (0052)
      // so the cancel cascade can find them by FK. schedule_vacation_hold
      // returns it as hold_id on success.
      boxHoldId: result.hold_id,
      boxShareType: memberData.share_type,
      start_date,
      end_date,
      status: 'scheduled',
      disposition,
      move_to_week,
      reason,
    });
    if (cascade.error) {
      console.error(
        '[api/account/vacation/schedule] add-on cascade failed (box hold kept):',
        cascade.error
      );
    } else if (cascade.created.length > 0 || cascade.skippedExisting.length > 0) {
      console.info(
        `[api/account/vacation/schedule] add-on cascade: created ${cascade.created.length}, skipped ${cascade.skippedExisting.length} (already held)`
      );
    }
  } catch (e) {
    console.error(
      '[api/account/vacation/schedule] add-on cascade threw (box hold kept):',
      e
    );
  }

  return redirect('/account/vacation?ok=scheduled', 303);
};
