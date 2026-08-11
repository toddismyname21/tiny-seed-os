/**
 * POST /api/admin/route/save-optimized — save an OPTIMIZED route (from the
 * route planner) as a driver route the driver opens on their phone.
 *
 * Body: { route_date: 'YYYY-MM-DD', leg: 'A'|'B', driver_name?, stops: [
 *   { ref: { col: 'pickup_location_id'|'member_id'|'wholesale_customer_id', id },
 *     scheduledTime?: 'HH:MM:SS' }   // in OPTIMIZED ORDER
 * ] }
 *
 * RE-SAVE = AUTO-UPDATE: any existing route for the same (route_date, leg) is
 * deleted (cascades its stops) and replaced, so the driver's link always shows
 * the latest optimized order. Each stop writes EXACTLY ONE target FK per the
 * delivery_stops_target_xor CHECK, stop_order = the optimized sequence.
 * Admin-gated + same-origin.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

const COLS = new Set(['pickup_location_id', 'member_id', 'wholesale_customer_id', 'manual_stop_id']);

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) return json({ error: 'forbidden' }, 403);
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;
  const sb = locals.supabase;

  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }

  const route_date = String(body?.route_date ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(route_date)) return json({ error: 'bad_date' }, 400);
  const leg = body?.leg === 'B' ? 'B' : 'A';

  const raw = Array.isArray(body?.stops) ? body.stops : [];
  const stops = raw.filter((s: any) => s?.ref && COLS.has(s.ref.col) && typeof s.ref.id === 'string' && s.ref.id);
  if (stops.length === 0) return json({ error: 'no_stops', detail: 'No stops with a valid target (a wholesale stop may be missing its customer link).' }, 400);

  const driver_name = (typeof body?.driver_name === 'string' && body.driver_name.trim())
    ? body.driver_name.trim()
    : (locals.user?.email === 'todd@tinyseedfarmpgh.com' ? 'Todd' : 'Driver');

  // Replace any existing route for this (date, leg) — re-save auto-updates.
  const { data: existing } = await sb.from('delivery_routes').select('id').eq('route_date', route_date).eq('leg', leg);
  for (const r of existing ?? []) await sb.from('delivery_routes').delete().eq('id', (r as any).id);

  const { data: routeRows, error: rErr } = await sb
    .from('delivery_routes')
    .insert({ route_date, leg, driver_id: locals.user?.id ?? null, driver_name, status: 'planned' } as any)
    .select('id');
  if (rErr || !routeRows?.[0]) {
    console.error('[save-optimized] route insert failed:', rErr?.message);
    return json({ error: 'route_insert_failed', detail: rErr?.message }, 500);
  }
  const routeId = (routeRows[0] as any).id as string;

  const rows = stops.map((s: any, i: number) => ({
    route_id: routeId,
    pickup_location_id: s.ref.col === 'pickup_location_id' ? s.ref.id : null,
    member_id: s.ref.col === 'member_id' ? s.ref.id : null,
    wholesale_customer_id: s.ref.col === 'wholesale_customer_id' ? s.ref.id : null,
    manual_stop_id: s.ref.col === 'manual_stop_id' ? s.ref.id : null,
    stop_order: i + 1,
    scheduled_time: (typeof s.scheduledTime === 'string' && /^\d{2}:\d{2}/.test(s.scheduledTime)) ? s.scheduledTime : null,
    status: 'pending',
  }));

  const { error: sErr } = await sb.from('delivery_stops').insert(rows as any);
  if (sErr) {
    console.error('[save-optimized] stops insert failed:', sErr.message);
    await sb.from('delivery_routes').delete().eq('id', routeId);
    return json({ error: 'stops_insert_failed', detail: sErr.message }, 500);
  }

  return json({ ok: true, route_id: routeId, url: `/admin/route/${routeId}`, leg, stops: rows.length });
};
