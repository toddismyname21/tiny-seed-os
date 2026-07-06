/**
 * POST /api/admin/market/copy-week   (admin only, form POST → 303)
 *
 * "Repeat last week and tweak." The write behind "Copy last week's list" on
 * /admin/market: copy every market_offerings row for THIS market from its most
 * recent prior week into the current week, so Todd starts from last week's plan
 * and just adjusts the numbers.
 *
 * SOURCE WEEK = the most recent week BEFORE to_week that has ≥1 offering for
 * this market (NOT blindly "7 days ago" — a skipped week is handled correctly).
 * Copies unit + price_cents + planned_qty + name override + is_active + sort_order.
 * Post-market reconciliation fields (leftover_qty / donated_qty) are NOT copied —
 * they belong to that past week only. Products ALREADY on the current week for
 * this market are SKIPPED, so copy never duplicates and never overwrites edits
 * Todd already made — it only fills in the missing items.
 *
 * Body (application/x-www-form-urlencoded or multipart/form-data):
 *   - week_starting      YYYY-MM-DD cycle Monday (the TARGET week) (required)
 *   - market_location_id pickup_locations UUID (a farmers-market)  (required)
 *
 * Authorization: requireAdmin + isSameOriginPost. Writes ONLY market_offerings.
 * On success: 303 → /admin/market?week=&market=&ok=copied&n=<count>&from=<week>
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { isYMD } from '../../../../lib/flex-order';

export const prerender = false;

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function backTo(
  week: string,
  market: string,
  key: 'ok' | 'error',
  val: string,
  extra?: Record<string, string>,
): string {
  const q = new URLSearchParams();
  if (isYMD(week)) q.set('week', week);
  if (UUID_RE.test(market)) q.set('market', market);
  q.set(key, val);
  for (const [k, v] of Object.entries(extra ?? {})) q.set(k, v);
  return `/admin/market?${q.toString()}`;
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
    return redirect('/admin/market?error=invalid_input', 303);
  }

  const week = String(form.get('week_starting') ?? '').trim();
  const market = String(form.get('market_location_id') ?? '').trim();
  if (!isYMD(week)) return redirect('/admin/market?error=bad_week', 303);
  if (!UUID_RE.test(market)) return redirect(backTo(week, '', 'error', 'invalid_market'), 303);

  const supabase = locals.supabase;

  // The market MUST be one of the 4 live farmers-markets (never trust the client).
  const { data: mkt, error: mktErr } = await supabase
    .from('pickup_locations')
    .select('id')
    .eq('id', market)
    .eq('is_delivery_zone', false)
    .in('day_of_week', ['Tue', 'Sat', 'Sun'])
    .maybeSingle();
  if (mktErr) {
    console.error('[api/admin/market/copy-week] market validation failed:', mktErr.message);
    return redirect(backTo(week, market, 'error', 'copy_failed'), 303);
  }
  if (!mkt) return redirect(backTo(week, market, 'error', 'invalid_market'), 303);

  // SOURCE WEEK: the newest week BEFORE the target that actually has rows for
  // this market. Ordering week_starting desc and taking the first row gives the
  // most recent prior week with data (a skipped week just isn't returned).
  const { data: srcWeekRow, error: srcWeekErr } = await supabase
    .from('market_offerings')
    .select('week_starting')
    .eq('market_location_id', market)
    .lt('week_starting', week)
    .order('week_starting', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (srcWeekErr) {
    console.error('[api/admin/market/copy-week] source-week lookup failed:', srcWeekErr.message);
    return redirect(backTo(week, market, 'error', 'copy_failed'), 303);
  }
  if (!srcWeekRow) {
    return redirect(backTo(week, market, 'error', 'no_prior_week'), 303);
  }
  const fromWeek = srcWeekRow.week_starting;

  // Every offering from the source week for this market.
  const { data: sourceRows, error: sourceErr } = await supabase
    .from('market_offerings')
    .select('library_id, name, unit, price_cents, planned_qty, is_active, sort_order')
    .eq('market_location_id', market)
    .eq('week_starting', fromWeek);
  if (sourceErr) {
    console.error('[api/admin/market/copy-week] source rows fetch failed:', sourceErr.message);
    return redirect(backTo(week, market, 'error', 'copy_failed'), 303);
  }
  if (!sourceRows || sourceRows.length === 0) {
    return redirect(backTo(week, market, 'error', 'no_prior_week'), 303);
  }

  // SKIP products already on the target week for this market (never duplicate,
  // never overwrite Todd's current-week edits — only fill in the missing ones).
  const { data: presentRows, error: presentErr } = await supabase
    .from('market_offerings')
    .select('library_id')
    .eq('week_starting', week)
    .eq('market_location_id', market);
  if (presentErr) {
    console.error('[api/admin/market/copy-week] present check failed:', presentErr.message);
    return redirect(backTo(week, market, 'error', 'copy_failed'), 303);
  }
  const present = new Set((presentRows ?? []).map((r) => r.library_id));

  const inserts = sourceRows
    .filter((r) => !present.has(r.library_id))
    .map((r) => ({
      library_id: r.library_id,
      week_starting: week,
      market_location_id: market,
      name: r.name,
      unit: r.unit,
      price_cents: r.price_cents,
      planned_qty: r.planned_qty,
      is_active: r.is_active,
      sort_order: r.sort_order,
    }));

  if (inserts.length === 0) {
    // Every source item is already on this week — nothing to bring over.
    return redirect(backTo(week, market, 'ok', 'copied', { n: '0', from: fromWeek }), 303);
  }

  const { error: insErr } = await supabase.from('market_offerings').insert(inserts);
  if (insErr) {
    console.error('[api/admin/market/copy-week] insert failed:', insErr.message);
    return redirect(backTo(week, market, 'error', 'copy_failed'), 303);
  }

  return redirect(
    backTo(week, market, 'ok', 'copied', { n: String(inserts.length), from: fromWeek }),
    303,
  );
};
