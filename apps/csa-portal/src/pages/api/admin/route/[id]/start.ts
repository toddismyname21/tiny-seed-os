/**
 * POST /api/admin/route/[id]/start   (admin only)
 *
 * Transitions a route from `planned` to `in_progress` and flips every
 * one of its `pending` stops to `out_for_delivery`. Sets
 * `route.started_at = NOW()` on the route row.
 *
 * Idempotent on a route already `in_progress` — returns 200 with the
 * current state (no-op). Returns 409 for a route in a terminal state
 * (completed/cancelled).
 *
 * Authorization:
 *   - requireAdmin
 *   - isSameOriginPost CSRF
 *
 * RLS:
 *   - delivery_routes_admin_all + delivery_stops_admin_all let the
 *     cookie-aware client write here.
 *
 * Audit:
 *   - Every UPDATE captured by the trigger; Todd's email tagged on
 *     each row.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../../lib/onboarding';

export const prerender = false;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const POST: APIRoute = async ({ request, params, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return jsonResponse({ ok: false, error: 'forbidden' }, 403);
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  const routeId = String(params.id ?? '').trim();
  if (!routeId) {
    return jsonResponse({ ok: false, error: 'missing_route_id' }, 400);
  }

  const supabase = locals.supabase;

  // 1. Load the route row.
  type RouteRow = {
    id: string;
    status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
    started_at: string | null;
  };
  const { data: route, error: rErr } = await supabase
    .from('delivery_routes')
    .select('id, status, started_at')
    .eq('id', routeId)
    .maybeSingle()
    .overrideTypes<RouteRow, { merge: false }>();

  if (rErr) {
    console.error('[api/admin/route/start] route fetch failed:', rErr.message);
    return jsonResponse({ ok: false, error: 'fetch_failed' }, 500);
  }
  if (!route) {
    return jsonResponse({ ok: false, error: 'route_not_found' }, 404);
  }
  if (route.status === 'completed' || route.status === 'cancelled') {
    return jsonResponse({ ok: false, error: 'route_terminal', status: route.status }, 409);
  }
  if (route.status === 'in_progress') {
    return jsonResponse({ ok: true, route_id: routeId, status: 'in_progress', no_op: true });
  }

  // 2. Flip route → in_progress. Set started_at if not already set.
  const now = new Date().toISOString();
  const { error: updRouteErr } = await supabase
    .from('delivery_routes')
    .update({
      status: 'in_progress',
      started_at: route.started_at ?? now,
    })
    .eq('id', routeId);

  if (updRouteErr) {
    console.error('[api/admin/route/start] route update failed:', updRouteErr.message);
    return jsonResponse({ ok: false, error: 'update_failed' }, 500);
  }

  // 3. Flip pending → out_for_delivery on every stop. Stops that
  //    are already in arrived/completed/exception keep their state
  //    (you'd only see those if an admin re-started an old route).
  const { error: updStopsErr, count } = await supabase
    .from('delivery_stops')
    .update({ status: 'out_for_delivery' }, { count: 'exact' })
    .eq('route_id', routeId)
    .eq('status', 'pending');

  if (updStopsErr) {
    console.error('[api/admin/route/start] stops update failed:', updStopsErr.message);
    return jsonResponse({ ok: false, error: 'stops_update_failed' }, 500);
  }

  return jsonResponse({
    ok: true,
    route_id: routeId,
    status: 'in_progress',
    started_at: route.started_at ?? now,
    stops_advanced: count ?? 0,
  });
};
