/**
 * POST /api/account/pickup-location
 *
 * Body (multipart/form-data):
 *   - member_id            UUID — which member's pickup to change
 *   - mode                 'pickup' | 'delivery'
 *   - pickup_location_id   UUID (when mode='pickup'); ignored otherwise
 *   - delivery_address     String (when mode='delivery'); ignored otherwise
 *
 * On success: 303 → /account/pickup?ok=saved
 * On failure: 303 → /account/pickup?error=<code>
 *
 * The mutation is delegated to the SECURITY DEFINER function
 * `change_pickup_location()` in migration 0016 — it locks the member
 * row and (if pickup) counts existing live members at the new location
 * to enforce max_capacity.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';

export const prerender = false;

const FormSchema = z
  .object({
    member_id: z.uuid('invalid_input'),
    mode: z.enum(['pickup', 'delivery'], { message: 'invalid_input' }),
    pickup_location_id: z.union([z.uuid(), z.literal(''), z.null()]),
    delivery_address: z.string().max(500, 'invalid_input').nullable(),
  })
  .refine(
    (d) =>
      (d.mode === 'pickup' && typeof d.pickup_location_id === 'string' && d.pickup_location_id.length > 0) ||
      (d.mode === 'delivery' && d.delivery_address !== null && d.delivery_address.trim().length > 0),
    { message: 'invalid_input' }
  );

type ChangeResult =
  | { ok: true }
  | {
      error: 'invalid_input' | 'member_not_found' | 'location_not_found' | 'location_full';
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

  const memberId = String(formData.get('member_id') ?? '');
  const mode = String(formData.get('mode') ?? '');
  const pickupId = String(formData.get('pickup_location_id') ?? '');
  const deliveryAddr = String(formData.get('delivery_address') ?? '').trim();

  const parsed = FormSchema.safeParse({
    member_id: memberId,
    mode,
    pickup_location_id: pickupId,
    delivery_address: deliveryAddr === '' ? null : deliveryAddr,
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

  const isPickup = parsed.data.mode === 'pickup';
  const newLocation = isPickup ? (parsed.data.pickup_location_id as string) : null;
  const newAddress = !isPickup ? parsed.data.delivery_address : null;

  // ─── Atomic write via SECURITY DEFINER function ────────────────────
  const { data: rpcData, error: rpcErr } = await locals.supabase.rpc(
    'change_pickup_location',
    {
      p_member_id: parsed.data.member_id,
      p_new_location_id: newLocation,
      p_new_delivery_address: newAddress,
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
