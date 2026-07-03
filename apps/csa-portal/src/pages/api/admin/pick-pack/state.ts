/**
 * GET /api/admin/pick-pack/state   (admin/staff/CREW — pack-house ops, 0069)
 *
 * The authoritative per-line status for ONE rendered Pick & Pack sheet. The
 * browser controller on /admin/pick-pack/[week] applies realtime deltas directly
 * for instant cross-device updates, and calls THIS endpoint to reconcile the
 * whole sheet on first realtime (re)connect and as a slow fallback poll when the
 * realtime socket is down (pack-house wifi is spotty). Read-only.
 *
 * Query:
 *   week       YYYY-MM-DD Monday of the cycle week
 *   section    'harvest' | 'csa' | 'wholesale' | 'market'
 *   scope_day  'all' | 'mon' | 'thu'
 *   market_id  pickup_locations UUID for section='market'; absent → sentinel
 *
 * Authorization: requireCrew (admin/staff/crew). The read runs through the
 * cookie-aware RLS client (pick_pack_progress_ops = is_ops_caller).
 *
 * Returns { ok:true, rows:[{ line_key, status, worked_by, actual_qty }] }
 *      /  { ok:false, error }.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireCrew } from '../../../../lib/admin';

export const prerender = false;

const SENTINEL_MARKET = '00000000-0000-0000-0000-000000000000';

const Query = z.object({
  week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  section: z.enum(['harvest', 'csa', 'wholesale', 'market']),
  scope_day: z.enum(['all', 'mon', 'thu']),
  market_id: z.string().uuid().nullable().optional(),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const GET: APIRoute = async ({ request, locals }) => {
  const auth = await requireCrew(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const parsed = Query.safeParse({
    week: url.searchParams.get('week') ?? '',
    section: url.searchParams.get('section') ?? '',
    scope_day: url.searchParams.get('scope_day') ?? 'all',
    market_id: url.searchParams.get('market_id') || undefined,
  });
  if (!parsed.success) {
    return json({ ok: false, error: 'invalid_input' }, 400);
  }
  const q = parsed.data;
  const market_id =
    q.section === 'market' ? (q.market_id ?? SENTINEL_MARKET) : SENTINEL_MARKET;

  const { data, error } = await locals.supabase
    .from('pick_pack_progress')
    .select('line_key, status, worked_by, actual_qty')
    .eq('week_date', q.week)
    .eq('section', q.section)
    .eq('scope_day', q.scope_day)
    .eq('market_id', market_id);

  if (error) {
    console.error('[api/admin/pick-pack/state] read failed:', error.message);
    return json({ ok: false, error: 'read_failed' }, 500);
  }

  return json({ ok: true, rows: data ?? [] });
};
