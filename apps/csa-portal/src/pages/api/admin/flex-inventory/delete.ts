/**
 * POST /api/admin/flex-inventory/delete   (admin only)
 *
 * Hard-deletes a flex_inventory item. flex_orders.flex_item_id is a
 * REFERENCES (no ON DELETE CASCADE), so an item with any orders cannot be
 * deleted at the DB level — we detect that and steer the admin to
 * deactivate instead (set is_active=false) so historical orders stay intact
 * and fulfillment reads don't break.
 *
 * Form body: id (UUID), week_starting (YYYY-MM-DD, for the redirect).
 *
 * On success: 303 → /admin/flex-inventory?week=<>&ok=deleted
 * On has-orders: 303 → ...&error=has_orders
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { isYMD } from '../../../../lib/flex-order';

export const prerender = false;

const Body = z.object({
  id: z.uuid(),
  week_starting: z.string().refine(isYMD),
});

function backTo(week: string, key: 'ok' | 'error', val: string): string {
  return `/admin/flex-inventory?week=${encodeURIComponent(week)}&${key}=${val}`;
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirect(backTo('', 'error', 'invalid_input'), 303);
  }

  const parsed = Body.safeParse({
    id: String(form.get('id') ?? ''),
    week_starting: String(form.get('week_starting') ?? ''),
  });
  if (!parsed.success) {
    return redirect(backTo(String(form.get('week_starting') ?? ''), 'error', 'invalid_input'), 303);
  }
  const { id, week_starting } = parsed.data;

  // Guard: any existing order blocks a hard delete (FK). Check first so we
  // can return a friendly "deactivate instead" message rather than a 500.
  type OrderRow = { id: string };
  const { data: orders, error: ordErr } = await locals.supabase
    .from('flex_orders')
    .select('id')
    .eq('flex_item_id', id)
    .limit(1)
    .overrideTypes<OrderRow[], { merge: false }>();

  if (ordErr) {
    console.error('[api/admin/flex-inventory/delete] order check failed:', ordErr.message);
    return redirect(backTo(week_starting, 'error', 'delete_failed'), 303);
  }
  if ((orders ?? []).length > 0) {
    return redirect(backTo(week_starting, 'error', 'has_orders'), 303);
  }

  const { error } = await locals.supabase.from('flex_inventory').delete().eq('id', id);
  if (error) {
    console.error('[api/admin/flex-inventory/delete] delete failed:', error.message);
    return redirect(backTo(week_starting, 'error', 'delete_failed'), 303);
  }
  return redirect(backTo(week_starting, 'ok', 'deleted'), 303);
};
