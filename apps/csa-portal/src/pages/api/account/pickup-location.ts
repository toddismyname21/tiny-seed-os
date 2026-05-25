/**
 * POST /api/account/pickup-location
 *
 * Members may ONLY switch their PICKUP LOCATION here (pickup ↔ pickup). They
 * can NOT switch themselves to home delivery — home delivery is paid
 * ($15/week) + admin-approved, so it goes through a REQUEST flow
 * (/api/account/request-delivery) and is set by an admin. The
 * change_pickup_location RPC (migration 0030) rejects a member-initiated
 * delivery set with {error:'delivery_admin_only'} as defense-in-depth, so
 * even a hand-crafted POST can't open the revenue leak.
 *
 * Body (multipart/form-data):
 *   - member_id            UUID — which member's pickup to change
 *   - pickup_location_id   UUID — the stop to switch to
 *
 * On success: 303 → /account/pickup?ok=saved
 * On failure: 303 → /account/pickup?error=<code>
 *
 * The mutation is delegated to the SECURITY DEFINER function
 * `change_pickup_location()` — it locks the member row and counts existing
 * live members at the new location to enforce max_capacity.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';

export const prerender = false;

const FormSchema = z.object({
  member_id: z.uuid('invalid_input'),
  pickup_location_id: z.uuid('invalid_input'),
});

type ChangeResult =
  | { ok: true }
  | {
      error:
        | 'invalid_input'
        | 'member_not_found'
        | 'location_not_found'
        | 'location_full'
        | 'delivery_admin_only';
      max_capacity?: number;
      current?: number;
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
    console.error('[api/account/pickup-location] formData parse failed', e);
    return redirect('/account/pickup?error=invalid_input', 303);
  }

  const parsed = FormSchema.safeParse({
    member_id: String(formData.get('member_id') ?? ''),
    pickup_location_id: String(formData.get('pickup_location_id') ?? ''),
  });

  if (!parsed.success) {
    return redirect('/account/pickup?error=invalid_input', 303);
  }

  // ─── Authorization: confirm caller owns this member ───────────────
  type MemberRow = { id: string };
  const { data: memberData, error: memberErr } = await locals.supabase
    .from('members')
    .select('id')
    .eq('id', parsed.data.member_id)
    .maybeSingle()
    .overrideTypes<MemberRow, { merge: false }>();

  if (memberErr) {
    console.error('[api/account/pickup-location] member lookup failed:', memberErr.message);
    return redirect('/account/pickup?error=invalid_input', 303);
  }
  if (!memberData) {
    return redirect('/account/pickup?error=member_not_found', 303);
  }

  // ─── Atomic write via SECURITY DEFINER function ────────────────────
  // Always a pickup switch (delivery is NULL) — the RPC's delivery branch is
  // admin-gated, so we never reach it from this member route.
  const { data: rpcData, error: rpcErr } = await locals.supabase.rpc(
    'change_pickup_location',
    {
      p_member_id: parsed.data.member_id,
      p_new_location_id: parsed.data.pickup_location_id,
      p_new_delivery_address: null,
    }
  );

  if (rpcErr) {
    console.error('[api/account/pickup-location] rpc failed:', rpcErr.message);
    return redirect('/account/pickup?error=invalid_input', 303);
  }

  const result = rpcData as unknown as ChangeResult;
  if ('error' in result) {
    return redirect(`/account/pickup?error=${result.error}`, 303);
  }

  return redirect('/account/pickup?ok=saved', 303);
};
