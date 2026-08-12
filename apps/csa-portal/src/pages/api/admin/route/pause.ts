/**
 * POST /api/admin/route/pause   (admin only)
 *
 * Driver "☕ Start break" / "▶️ Resume route" toggle for a delivery route.
 * Body (form-encoded or JSON): { route_id, action: 'pause' | 'resume' }.
 *
 *   pause  → set paused_at = now() ONLY IF it is currently NULL. Idempotent:
 *            a route already paused returns 200 no-op (a double-tap while on
 *            a break must not reset the break clock).
 *   resume → pause_total_sec += floor(now − paused_at); paused_at = NULL.
 *            Idempotent: a route not currently paused returns 200 no-op.
 *
 * The member tracking page (/account/track) reads paused_at to fold the
 * currently-running break into its honest ETA and to show a "driver is on a
 * break" banner. pause_total_sec accumulates finished-break seconds for
 * admin/analytics (a finished break is already reflected in the completed
 * stops' timestamps, so the member ETA doesn't re-add it).
 *
 * Authorization (identical to the other admin route APIs, e.g. start.ts):
 *   - isSameOriginPost CSRF (blocks cross-site form POSTs)
 *   - requireAdmin       (403 for non-admins / stale cookies)
 *
 * RLS: delivery_routes_admin_all lets the cookie-aware admin client write.
 * Audit: the delivery_routes UPDATE trigger captures every change tagged
 * with the admin's email.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';

export const prerender = false;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/**
 * Read route_id + action from either a form POST (the driver page uses
 * FormData for zero-dependency progressive enhancement) or a JSON body.
 * Returns nulls when a field is absent/blank.
 */
async function readParams(
  request: Request
): Promise<{ routeId: string | null; action: string | null }> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const body = (await request.json()) as Record<string, unknown>;
      const routeId = typeof body.route_id === 'string' ? body.route_id.trim() : '';
      const action = typeof body.action === 'string' ? body.action.trim() : '';
      return { routeId: routeId || null, action: action || null };
    } catch {
      return { routeId: null, action: null };
    }
  }
  // Default: form-encoded / multipart.
  const form = await request.formData();
  const routeId = String(form.get('route_id') ?? '').trim();
  const action = String(form.get('action') ?? '').trim();
  return { routeId: routeId || null, action: action || null };
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return jsonResponse({ ok: false, error: 'forbidden' }, 403);
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  const { routeId, action } = await readParams(request);
  if (!routeId) {
    return jsonResponse({ ok: false, error: 'missing_route_id' }, 400);
  }
  if (action !== 'pause' && action !== 'resume') {
    return jsonResponse({ ok: false, error: 'invalid_action' }, 400);
  }

  const supabase = locals.supabase;

  // Load the route's current pause state.
  type RouteRow = {
    id: string;
    status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
    paused_at: string | null;
    pause_total_sec: number;
  };
  const { data: route, error: rErr } = await supabase
    .from('delivery_routes')
    .select('id, status, paused_at, pause_total_sec')
    .eq('id', routeId)
    .maybeSingle()
    .overrideTypes<RouteRow, { merge: false }>();

  if (rErr) {
    console.error('[api/admin/route/pause] route fetch failed:', rErr.message);
    return jsonResponse({ ok: false, error: 'fetch_failed' }, 500);
  }
  if (!route) {
    return jsonResponse({ ok: false, error: 'route_not_found' }, 404);
  }
  if (route.status === 'completed' || route.status === 'cancelled') {
    return jsonResponse(
      { ok: false, error: 'route_terminal', status: route.status },
      409
    );
  }

  const now = new Date();
  const nowISO = now.toISOString();

  if (action === 'pause') {
    // Idempotent: already on a break → no-op (don't reset the clock).
    if (route.paused_at) {
      return jsonResponse({
        ok: true,
        route_id: routeId,
        paused: true,
        paused_at: route.paused_at,
        pause_total_sec: route.pause_total_sec,
        no_op: true,
      });
    }
    const { error: updErr } = await supabase
      .from('delivery_routes')
      .update({ paused_at: nowISO })
      .eq('id', routeId);
    if (updErr) {
      console.error('[api/admin/route/pause] pause update failed:', updErr.message);
      return jsonResponse({ ok: false, error: 'update_failed' }, 500);
    }
    return jsonResponse({
      ok: true,
      route_id: routeId,
      paused: true,
      paused_at: nowISO,
      pause_total_sec: route.pause_total_sec,
    });
  }

  // action === 'resume'.
  // Idempotent: not currently paused → no-op.
  if (!route.paused_at) {
    return jsonResponse({
      ok: true,
      route_id: routeId,
      paused: false,
      paused_at: null,
      pause_total_sec: route.pause_total_sec,
      no_op: true,
    });
  }

  // Accumulate the just-ended break's whole seconds. Clamp ≥ 0 to defend
  // against clock skew (a paused_at somehow in the future).
  const pausedAtMs = Date.parse(route.paused_at);
  const elapsedSec = Number.isFinite(pausedAtMs)
    ? Math.max(0, Math.floor((now.getTime() - pausedAtMs) / 1000))
    : 0;
  const newTotal = route.pause_total_sec + elapsedSec;

  const { error: updErr } = await supabase
    .from('delivery_routes')
    .update({ paused_at: null, pause_total_sec: newTotal })
    .eq('id', routeId);
  if (updErr) {
    console.error('[api/admin/route/pause] resume update failed:', updErr.message);
    return jsonResponse({ ok: false, error: 'update_failed' }, 500);
  }
  return jsonResponse({
    ok: true,
    route_id: routeId,
    paused: false,
    paused_at: null,
    pause_total_sec: newTotal,
    break_sec: elapsedSec,
  });
};
