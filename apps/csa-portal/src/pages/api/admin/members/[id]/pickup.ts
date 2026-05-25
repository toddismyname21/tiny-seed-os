/**
 * POST /api/admin/members/[id]/pickup
 *
 * The APPROVAL side of the home-delivery gate. An admin sets a member's
 * pickup location OR their home delivery address. This is how a member's
 * "Request home delivery" gets fulfilled: after Todd collects the $15/week
 * in Shopify (manual — out of scope here), he sets the delivery address from
 * the member's admin page.
 *
 * Body (multipart/form-data):
 *   - mode               'pickup' | 'delivery'
 *   - pickup_location_id UUID   (when mode='pickup')
 *   - delivery_address   String (when mode='delivery')
 *
 * Security:
 *   - isSameOriginPost CSRF gate (mirrors every admin API route).
 *   - requireAdmin: caller must map to a customers row with role admin/staff.
 *   - The mutation is delegated to change_pickup_location() (migration 0030).
 *     That RPC's delivery branch is gated on is_admin_caller(). We invoke it
 *     through locals.supabase (the admin's cookie-aware RLS-scoped client), so
 *     the admin's JWT is present → is_admin_caller() is TRUE → the delivery
 *     set is permitted. (Going through the service-role client would carry no
 *     JWT and be rejected — intentional; the gate stays honest.)
 *
 * On success: 303 → /admin/members/[id]?ok=pickup_updated
 * On failure: 303 → /admin/members/[id]?error=<code>
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../../lib/onboarding';

export const prerender = false;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const Body = z
  .object({
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
      error:
        | 'invalid_input'
        | 'member_not_found'
        | 'location_not_found'
        | 'location_full'
        | 'delivery_admin_only';
      max_capacity?: number;
      current?: number;
    };

export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  const memberId = params.id ?? '';
  if (!UUID_RE.test(memberId)) {
    return redirect('/admin/members?error=invalid_input', 303);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return redirect(`/admin/members/${memberId}?error=invalid_input`, 303);
  }

  const deliveryAddr = String(formData.get('delivery_address') ?? '').trim();
  const parsed = Body.safeParse({
    mode: String(formData.get('mode') ?? ''),
    pickup_location_id: String(formData.get('pickup_location_id') ?? ''),
    delivery_address: deliveryAddr === '' ? null : deliveryAddr,
  });
  if (!parsed.success) {
    return redirect(`/admin/members/${memberId}?error=invalid_input`, 303);
  }

  const isPickup = parsed.data.mode === 'pickup';
  const newLocation = isPickup ? (parsed.data.pickup_location_id as string) : null;
  const newAddress = !isPickup ? parsed.data.delivery_address : null;

  // Atomic write via the SECURITY DEFINER RPC. Through the admin's RLS-scoped
  // client so is_admin_caller() inside the function is TRUE (delivery allowed).
  const { data: rpcData, error: rpcErr } = await locals.supabase.rpc('change_pickup_location', {
    p_member_id: memberId,
    p_new_location_id: newLocation,
    p_new_delivery_address: newAddress,
  });

  if (rpcErr) {
    console.error('[api/admin/members/pickup] rpc failed:', rpcErr.message);
    return redirect(`/admin/members/${memberId}?error=invalid_input`, 303);
  }

  const result = rpcData as unknown as ChangeResult;
  if ('error' in result) {
    return redirect(`/admin/members/${memberId}?error=${result.error}`, 303);
  }

  return redirect(`/admin/members/${memberId}?ok=pickup_updated`, 303);
};
