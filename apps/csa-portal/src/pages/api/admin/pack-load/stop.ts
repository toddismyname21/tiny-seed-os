/**
 * POST /api/admin/pack-load/stop   (admin only)
 *
 * Persist the crew's "stop loaded" toggle for one stop in one delivery week.
 * Upserts a single row into pack_stop_status keyed on (week_starting, stop_id).
 *
 * Body (JSON, same-origin fetch):
 *   week_starting    YYYY-MM-DD Monday of the cycle (snapped to Monday if not)
 *   stop_id          StopTotals.stop_id (a pickup id, 'home_delivery', or
 *                    'no_pickup_set' — we trust the resolver's id verbatim)
 *   loaded           boolean — true = stop loaded, false = un-load (reversible)
 *   confirmed_count  integer — total boxes at click time (small+large+flex).
 *                    Stored so the live page can flag "⚠ count changed" if the
 *                    resolver's count later drifts and require a re-confirm.
 *
 * When loaded=true we stamp confirmed_by (caller email) + confirmed_at (now)
 * and persist confirmed_count. When loaded=false we clear all three so a
 * re-load starts a fresh audit trail and the stale-guard never fires on a
 * stop that was explicitly un-loaded.
 *
 * Authorization: isSameOriginPost (CSRF) + requireAdmin (role admin/staff).
 * RLS: pack_stop_status_staff_all lets the cookie-aware client read+write.
 *
 * Returns { ok: true, ... } / { ok: false, error } JSON.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { isMonday, mondayOfWeek } from '../../../../lib/cycle';
import type { Database } from '../../../../lib/database.types';

export const prerender = false;

type PackStopInsert = Database['public']['Tables']['pack_stop_status']['Insert'];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return jsonResponse({ ok: false, error: 'forbidden' }, 403);
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;
  const ctx = auth.ctx;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ ok: false, error: 'bad_body' }, 400);
  }

  const weekRaw = String(body.week_starting ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekRaw)) {
    return jsonResponse({ ok: false, error: 'invalid_week' }, 400);
  }
  const week_starting = isMonday(weekRaw) ? weekRaw : mondayOfWeek(weekRaw);

  const stop_id = String(body.stop_id ?? '').trim();
  if (!stop_id) {
    return jsonResponse({ ok: false, error: 'missing_stop_id' }, 400);
  }

  // loaded must be a real boolean — reject anything ambiguous so a missing
  // field can never silently mark a stop loaded.
  if (typeof body.loaded !== 'boolean') {
    return jsonResponse({ ok: false, error: 'invalid_loaded' }, 400);
  }
  const loaded = body.loaded;

  // confirmed_count: required + a non-negative integer when loading; ignored
  // (cleared) when un-loading.
  let confirmed_count: number | null = null;
  if (loaded) {
    const n = Number(body.confirmed_count);
    if (!Number.isInteger(n) || n < 0) {
      return jsonResponse({ ok: false, error: 'invalid_count' }, 400);
    }
    confirmed_count = n;
  }

  const nowIso = new Date().toISOString();
  const row: PackStopInsert = {
    week_starting,
    stop_id,
    loaded,
    confirmed_count,
    confirmed_by: loaded ? (ctx.user.email ?? null) : null,
    confirmed_at: loaded ? nowIso : null,
    updated_at: nowIso,
  };

  const { data, error } = await locals.supabase
    .from('pack_stop_status')
    .upsert(row, { onConflict: 'week_starting,stop_id' })
    .select('stop_id, loaded, confirmed_count, confirmed_by, confirmed_at')
    .maybeSingle();

  if (error) {
    console.error('[api/admin/pack-load/stop] upsert failed:', error.message);
    return jsonResponse({ ok: false, error: 'update_failed', detail: error.message }, 500);
  }

  return jsonResponse({
    ok: true,
    stop_id,
    loaded,
    confirmed_count: data?.confirmed_count ?? confirmed_count,
    confirmed_by: data?.confirmed_by ?? null,
    confirmed_at: data?.confirmed_at ?? null,
  });
};
