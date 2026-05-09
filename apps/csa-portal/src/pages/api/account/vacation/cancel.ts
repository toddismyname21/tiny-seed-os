/**
 * POST /api/account/vacation/cancel
 *
 * Body (multipart/form-data, from the per-hold cancel button on
 * /account/vacation):
 *   - hold_id    UUID of the hold to cancel
 *   - member_id  UUID of the member who owns it (we verify ownership
 *                via RLS regardless, but the form supplies it so we
 *                can fail fast on a stale/missing row).
 *
 * On success: 303 → /account/vacation?ok=cancelled&weeks=<N>.
 * On failure: 303 → /account/vacation?error=<code>.
 *
 * Mid-active holds: only the future-week portion is refunded. See
 * cancel_vacation_hold() in migration 0016 for the refund logic.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';

export const prerender = false;

const FormSchema = z.object({
  hold_id: z.uuid('invalid_input'),
  member_id: z.uuid('invalid_input'),
});

type CancelResult =
  | { ok: true; weeks_refunded: number; cancelled_status: string }
  | {
      error:
        | 'invalid_input'
        | 'hold_not_found'
        | 'cannot_cancel'
        | 'member_not_found';
      status?: string;
    };

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
    console.error('[api/account/vacation/cancel] formData parse failed', e);
    return redirect('/account/vacation?error=invalid_input', 303);
  }

  const parsed = FormSchema.safeParse({
    hold_id: String(formData.get('hold_id') ?? ''),
    member_id: String(formData.get('member_id') ?? ''),
  });
  if (!parsed.success) {
    return redirect('/account/vacation?error=invalid_input', 303);
  }
  const { hold_id, member_id } = parsed.data;

  // ─── Authorization: confirm caller owns the member + hold ─────────
  // RLS on vacation_holds restricts SELECT to rows owned by the user.
  type HoldRow = { id: string; member_id: string; status: string };
  const { data: holdData, error: holdErr } = await locals.supabase
    .from('vacation_holds')
    .select('id, member_id, status')
    .eq('id', hold_id)
    .eq('member_id', member_id)
    .maybeSingle()
    .overrideTypes<HoldRow, { merge: false }>();

  if (holdErr) {
    console.error('[api/account/vacation/cancel] hold lookup failed:', holdErr.message);
    return redirect('/account/vacation?error=invalid_input', 303);
  }
  if (!holdData) {
    return redirect('/account/vacation?error=hold_not_found', 303);
  }

  // ─── Atomic cancel via SECURITY DEFINER function ──────────────────
  const { data: rpcData, error: rpcErr } = await locals.supabase.rpc(
    'cancel_vacation_hold',
    {
      p_member_id: member_id,
      p_hold_id: hold_id,
    }
  );

  if (rpcErr) {
    console.error('[api/account/vacation/cancel] rpc failed:', rpcErr.message);
    return redirect('/account/vacation?error=invalid_input', 303);
  }

  const result = rpcData as unknown as CancelResult;
  if ('error' in result) {
    return redirect(`/account/vacation?error=${result.error}`, 303);
  }

  const params = new URLSearchParams();
  params.set('ok', 'cancelled');
  params.set('weeks', String(result.weeks_refunded));
  return redirect(`/account/vacation?${params.toString()}`, 303);
};
