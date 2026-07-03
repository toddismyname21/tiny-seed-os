/**
 * POST /api/admin/wholesale/orders/delete   (admin only, JSON)
 *
 * Delete a MANUAL wholesale order (one keyed in via /create). ONLY orders with
 * source='manual' may be deleted here — a chef_portal / import order must never
 * be removed from the admin manual-entry UI (those have their own lifecycle).
 *
 * wholesale_order_items.order_id is FK → wholesale_orders(id) ON DELETE CASCADE
 * (migration 0044), so deleting the order row removes its items automatically.
 *
 * Body shape (validated with zod): { order_id }
 * Returns JSON: { ok:true } or { ok:false, error, ... }.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../../lib/onboarding';
import { supabaseAdmin } from '../../../../../lib/supabase';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const Body = z.object({ order_id: z.uuid() });

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_body' }, 400);
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return json({ ok: false, error: 'invalid_input', detail: parsed.error.issues }, 400);
  }
  const { order_id } = parsed.data;

  // Confirm it exists AND is a manual order before removing anything.
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('wholesale_orders')
    .select('id, source')
    .eq('id', order_id)
    .maybeSingle<{ id: string; source: string | null }>();

  if (fetchErr) {
    console.error('[orders/delete] order fetch failed:', fetchErr.message);
    return json({ ok: false, error: 'fetch_failed', detail: fetchErr.message }, 500);
  }
  if (!existing) {
    return json({ ok: false, error: 'not_found', message: 'That order no longer exists.' }, 404);
  }
  if (existing.source !== 'manual') {
    return json(
      { ok: false, error: 'not_deletable', message: 'Only manually-entered orders can be deleted here.' },
      403,
    );
  }

  // FK cascade removes wholesale_order_items; delete the order row.
  const { error: delErr } = await supabaseAdmin
    .from('wholesale_orders')
    .delete()
    .eq('id', order_id)
    .eq('source', 'manual'); // belt-and-suspenders: never delete a non-manual row

  if (delErr) {
    console.error('[orders/delete] delete failed:', delErr.message);
    return json({ ok: false, error: 'delete_failed', detail: delErr.message }, 500);
  }

  return json({ ok: true, order_id });
};
