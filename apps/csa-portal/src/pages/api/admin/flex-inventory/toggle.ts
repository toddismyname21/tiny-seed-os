/**
 * POST /api/admin/flex-inventory/toggle   (admin only)
 *
 * Flips a flex_inventory item's is_active flag (a one-click on/off from the
 * list view). Items with is_active=false are "ghosts" — visible to the admin
 * but not orderable; this endpoint lets Todd turn them on/off live without
 * opening the edit form.
 *
 * Form body: id (UUID), week_starting (YYYY-MM-DD, for the redirect).
 *
 * On success: 303 → /admin/flex-inventory?week=<>&ok=toggled
 * On error:   303 → ...&error=toggle_failed
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

  // Read current is_active, then flip to its opposite.
  type ActiveRow = { is_active: boolean };
  const { data: row, error: readErr } = await locals.supabase
    .from('flex_inventory')
    .select('is_active')
    .eq('id', id)
    .single()
    .overrideTypes<ActiveRow, { merge: false }>();

  if (readErr || !row) {
    console.error('[api/admin/flex-inventory/toggle] read failed:', readErr?.message ?? 'not found');
    return redirect(backTo(week_starting, 'error', 'toggle_failed'), 303);
  }

  const { error } = await locals.supabase
    .from('flex_inventory')
    .update({ is_active: !row.is_active })
    .eq('id', id);
  if (error) {
    console.error('[api/admin/flex-inventory/toggle] update failed:', error.message);
    return redirect(backTo(week_starting, 'error', 'toggle_failed'), 303);
  }
  return redirect(backTo(week_starting, 'ok', 'toggled'), 303);
};
