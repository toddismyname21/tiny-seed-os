/**
 * POST /api/account/vacation/schedule
 *
 * Body (multipart/form-data, from the /account/vacation/new form):
 *   - member_id     UUID of the member row to apply the hold to
 *   - start_date    YYYY-MM-DD
 *   - end_date      YYYY-MM-DD
 *   - reason        Optional free text (≤ 500 chars)
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
});

type ScheduleResult =
  | { ok: true; hold_id: string; weeks_used: number }
  | {
      error:
        | 'invalid_input'
        | 'member_not_found'
        | 'start_date_in_past'
        | 'invalid_date_range'
        | 'insufficient_vacation_weeks'
        | 'overlapping_hold';
      requested?: number;
      available?: number;
    };

function preserveOnError(
  code: string,
  startDate: string,
  endDate: string,
  reason: string | null
): string {
  const params = new URLSearchParams();
  params.set('error', code);
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  if (reason) params.set('reason', reason);
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

  const parsed = FormSchema.safeParse({
    member_id: rawMemberId,
    start_date: rawStart,
    end_date: rawEnd,
    reason: rawReason === '' ? null : rawReason,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const code = issue?.message === 'reason_too_long' ? 'reason_too_long' : 'invalid_input';
    return redirect(preserveOnError(code, rawStart, rawEnd, rawReason), 303);
  }

  const { member_id, start_date, end_date, reason } = parsed.data;

  // ─── Authorization: confirm caller owns this member ───────────────
  // RLS on members restricts SELECT to rows where customer_id matches
  // current_customer_id() (the user's customer row). If the user
  // doesn't own this member, the query returns zero rows.
  type MemberRow = { id: string; status: string };
  const { data: memberData, error: memberErr } = await locals.supabase
    .from('members')
    .select('id, status')
    .eq('id', member_id)
    .maybeSingle()
    .overrideTypes<MemberRow, { merge: false }>();

  if (memberErr) {
    console.error('[api/account/vacation/schedule] member lookup failed:', memberErr.message);
    return redirect(preserveOnError('invalid_input', start_date, end_date, reason), 303);
  }
  if (!memberData) {
    return redirect(preserveOnError('member_not_found', start_date, end_date, reason), 303);
  }
  if (!['active', 'paused', 'onboarding'].includes(memberData.status)) {
    return redirect(preserveOnError('member_not_found', start_date, end_date, reason), 303);
  }

  // ─── Atomic write via SECURITY DEFINER function ────────────────────
  const { data: rpcData, error: rpcErr } = await locals.supabase.rpc(
    'schedule_vacation_hold',
    {
      p_member_id: member_id,
      p_start_date: start_date,
      p_end_date: end_date,
      p_reason: reason,
    }
  );

  if (rpcErr) {
    console.error('[api/account/vacation/schedule] rpc failed:', rpcErr.message);
    return redirect(preserveOnError('invalid_input', start_date, end_date, reason), 303);
  }

  const result = rpcData as unknown as ScheduleResult;
  if ('error' in result) {
    return redirect(preserveOnError(result.error, start_date, end_date, reason), 303);
  }

  return redirect('/account/vacation?ok=scheduled', 303);
};
