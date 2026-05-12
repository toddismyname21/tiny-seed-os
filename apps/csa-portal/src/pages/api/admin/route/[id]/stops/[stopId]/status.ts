/**
 * POST /api/admin/route/[id]/stops/[stopId]/status   (admin only)
 *
 * Updates a single stop's status. Valid transitions:
 *   pending          → out_for_delivery   (admin "Start route" did this)
 *   out_for_delivery → arrived
 *   arrived          → completed
 *   any non-terminal → exception (with required notes)
 *   any non-terminal → out_for_delivery   (re-open)
 *
 * Inputs (JSON body):
 *   status:           'arrived' | 'completed' | 'exception' | 'out_for_delivery'
 *   exception_notes:  required when status='exception'; ignored otherwise
 *   gps_lat, gps_lng: optional, accepted on any transition
 *
 * Side effects:
 *   - arrived         → arrived_at = NOW() (or kept if already set)
 *   - completed       → completed_at = NOW(); arrived_at backfilled if null
 *                       (admin can complete-without-arrive if they
 *                       forgot to tap Arrived).
 *   - exception       → completed_at = NOW(); notes saved
 *   - The recompute_route_totals trigger fan-outs to delivery_routes.
 *
 * Authorization: requireAdmin + isSameOriginPost.
 *
 * RLS: admin policies on delivery_stops let the cookie client write.
 *
 * Audit: every UPDATE captured by trigger.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../../../../lib/onboarding';
import type { Database } from '../../../../../../../lib/database.types';

export const prerender = false;

type StopUpdate = Database['public']['Tables']['delivery_stops']['Update'];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

type IncomingStatus = 'arrived' | 'completed' | 'exception' | 'out_for_delivery';

const ALLOWED_STATUSES: ReadonlySet<IncomingStatus> = new Set([
  'arrived', 'completed', 'exception', 'out_for_delivery',
]);

function parseLatLng(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  // Out-of-range → ignore (e.g. WGS84 lat ∈ [-90, 90], lng ∈ [-180, 180]).
  // We don't enforce lat-vs-lng here; the caller passes them in distinct
  // fields and we trust the field name.
  if (n < -180 || n > 180) return null;
  return n;
}

export const POST: APIRoute = async ({ request, params, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return jsonResponse({ ok: false, error: 'forbidden' }, 403);
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  const routeId = String(params.id ?? '').trim();
  const stopId = String(params.stopId ?? '').trim();
  if (!routeId || !stopId) {
    return jsonResponse({ ok: false, error: 'missing_ids' }, 400);
  }

  // Parse JSON body. We accept JSON OR x-www-form-urlencoded (some
  // mobile fetches with FormData come in as multipart — those use the
  // /proof endpoint, not this one).
  let body: Record<string, unknown> = {};
  const ct = (request.headers.get('content-type') ?? '').toLowerCase();
  try {
    if (ct.includes('application/json')) {
      body = (await request.json()) as Record<string, unknown>;
    } else {
      const form = await request.formData();
      for (const [k, v] of form.entries()) body[k] = typeof v === 'string' ? v : v.name;
    }
  } catch (e) {
    return jsonResponse({ ok: false, error: 'bad_body' }, 400);
  }

  const status = String(body.status ?? '').trim() as IncomingStatus;
  if (!ALLOWED_STATUSES.has(status)) {
    return jsonResponse(
      { ok: false, error: 'invalid_status', message: `Expected one of: ${Array.from(ALLOWED_STATUSES).join(', ')}` },
      400
    );
  }

  const exceptionNotes = String(body.exception_notes ?? '').trim();
  if (status === 'exception' && exceptionNotes.length === 0) {
    return jsonResponse(
      { ok: false, error: 'notes_required', message: 'exception_notes is required when status="exception".' },
      400
    );
  }

  const gpsLat = parseLatLng(body.gps_lat);
  const gpsLng = parseLatLng(body.gps_lng);

  const supabase = locals.supabase;

  // Load the stop to compute timestamp side effects + verify it belongs
  // to the route we were given (defense in depth — bad URLs shouldn't
  // accidentally mutate the wrong row).
  type StopRow = {
    id: string;
    route_id: string;
    status: 'pending' | 'out_for_delivery' | 'arrived' | 'completed' | 'exception';
    arrived_at: string | null;
    completed_at: string | null;
  };
  const { data: stop, error: sErr } = await supabase
    .from('delivery_stops')
    .select('id, route_id, status, arrived_at, completed_at')
    .eq('id', stopId)
    .maybeSingle()
    .overrideTypes<StopRow, { merge: false }>();

  if (sErr) {
    console.error('[api/admin/route/.../status] stop fetch failed:', sErr.message);
    return jsonResponse({ ok: false, error: 'fetch_failed' }, 500);
  }
  if (!stop) {
    return jsonResponse({ ok: false, error: 'stop_not_found' }, 404);
  }
  if (stop.route_id !== routeId) {
    return jsonResponse({ ok: false, error: 'stop_route_mismatch' }, 400);
  }

  const now = new Date().toISOString();
  const update: StopUpdate = { status };

  if (status === 'arrived') {
    update.arrived_at = stop.arrived_at ?? now;
  } else if (status === 'completed') {
    // Allow completing without an explicit "arrived" tap — backfill
    // arrived_at to NOW so the CHECK constraint is satisfied.
    update.arrived_at = stop.arrived_at ?? now;
    update.completed_at = stop.completed_at ?? now;
    // Clear any stale exception notes when admin re-completes.
    update.exception_notes = null;
  } else if (status === 'exception') {
    update.arrived_at = stop.arrived_at ?? now;
    update.completed_at = stop.completed_at ?? now;
    update.exception_notes = exceptionNotes;
  } else if (status === 'out_for_delivery') {
    // Re-open: clear arrived/completed if we're reverting from a later
    // state. (Admin "I marked this wrong" recovery.) Notes preserved.
    update.arrived_at = null;
    update.completed_at = null;
  }

  if (gpsLat !== null) update.gps_lat = gpsLat;
  if (gpsLng !== null) update.gps_lng = gpsLng;

  const { error: updErr } = await supabase
    .from('delivery_stops')
    .update(update)
    .eq('id', stopId);

  if (updErr) {
    console.error('[api/admin/route/.../status] update failed:', updErr.message);
    return jsonResponse(
      { ok: false, error: 'update_failed', detail: updErr.message },
      500
    );
  }

  return jsonResponse({ ok: true, stop_id: stopId, status });
};
