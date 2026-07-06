/**
 * POST /api/admin/market/bulk-add   (admin only, form POST → 303)
 *
 * "Check off what we have." The write behind the "Add from products" checklist
 * on /admin/market: Todd ticks every product the farm has for a market this
 * week and taps "Add N items" — one round trip creates one market_offerings row
 * per checked product, tagged to the selected market.
 *
 * Each new offering INHERITS the product's last-known unit + price (its most
 * recent prior offering at ANY market/week), so a re-add lands with sensible
 * defaults; planned_qty starts BLANK (null) — an obvious placeholder Todd tweaks
 * after. Products already on this market's list this week are SKIPPED (the
 * checklist disables them, and we never duplicate server-side either).
 *
 * Body (application/x-www-form-urlencoded or multipart/form-data):
 *   - week_starting      YYYY-MM-DD cycle Monday                 (required)
 *   - market_location_id pickup_locations UUID (a farmers-market)(required)
 *   - library_ids        REPEATED product_library UUIDs          (>=1)
 *
 * The market MUST be one of the 4 farmers-markets (pickup_locations with
 * is_delivery_zone=false AND day_of_week IN Tue/Sat/Sun) — validated live.
 *
 * Authorization: requireAdmin + isSameOriginPost. Writes ONLY market_offerings.
 * On success: 303 → /admin/market?week=&market=&ok=added&n=<count added>
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { isYMD } from '../../../../lib/flex-order';

export const prerender = false;

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function backTo(week: string, market: string, key: 'ok' | 'error', val: string, n?: number): string {
  const q = new URLSearchParams();
  if (isYMD(week)) q.set('week', week);
  if (UUID_RE.test(market)) q.set('market', market);
  q.set(key, val);
  if (typeof n === 'number') q.set('n', String(n));
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

  // Checked products — REPEATED library_ids entries. De-dupe + shape-check.
  const requested = Array.from(new Set(
    form.getAll('library_ids').map((v) => String(v).trim()).filter((v) => UUID_RE.test(v)),
  ));
  if (requested.length === 0) {
    return redirect(backTo(week, market, 'error', 'nothing_selected'), 303);
  }

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
    console.error('[api/admin/market/bulk-add] market validation failed:', mktErr.message);
    return redirect(backTo(week, market, 'error', 'add_failed'), 303);
  }
  if (!mkt) return redirect(backTo(week, market, 'error', 'invalid_market'), 303);

  // Keep only ids that are real products (defensive against stale/forged ids).
  const { data: libRows, error: libErr } = await supabase
    .from('product_library')
    .select('id')
    .in('id', requested);
  if (libErr) {
    console.error('[api/admin/market/bulk-add] product check failed:', libErr.message);
    return redirect(backTo(week, market, 'error', 'add_failed'), 303);
  }
  const validIds = new Set((libRows ?? []).map((r) => r.id));
  const ids = requested.filter((id) => validIds.has(id));
  if (ids.length === 0) {
    return redirect(backTo(week, market, 'error', 'invalid_input'), 303);
  }

  // SKIP products already on THIS market's list this week (never duplicate).
  const { data: presentRows, error: presentErr } = await supabase
    .from('market_offerings')
    .select('library_id')
    .eq('week_starting', week)
    .eq('market_location_id', market);
  if (presentErr) {
    console.error('[api/admin/market/bulk-add] present check failed:', presentErr.message);
    return redirect(backTo(week, market, 'error', 'add_failed'), 303);
  }
  const present = new Set((presentRows ?? []).map((r) => r.library_id));
  const toAdd = ids.filter((id) => !present.has(id));
  if (toAdd.length === 0) {
    // Everything checked is already on the list — treat as a no-op success.
    return redirect(backTo(week, market, 'ok', 'added', 0), 303);
  }

  // Inherit each product's LAST-KNOWN unit + price (its most recent offering at
  // any market/week), so re-adds land with the price Todd last sold at. Pull the
  // candidate offerings newest-first and keep the first seen per library_id.
  const { data: priorRows, error: priorErr } = await supabase
    .from('market_offerings')
    .select('library_id, unit, price_cents, week_starting')
    .in('library_id', toAdd)
    .order('week_starting', { ascending: false })
    .order('updated_at', { ascending: false });
  if (priorErr) {
    console.error('[api/admin/market/bulk-add] prior lookup failed:', priorErr.message);
    // Non-fatal — fall back to defaults below.
  }
  const lastKnown = new Map<string, { unit: string; price_cents: number }>();
  for (const r of priorRows ?? []) {
    if (!lastKnown.has(r.library_id)) {
      lastKnown.set(r.library_id, { unit: r.unit, price_cents: r.price_cents });
    }
  }

  const inserts = toAdd.map((library_id) => {
    const seed = lastKnown.get(library_id);
    return {
      library_id,
      week_starting: week,
      market_location_id: market,
      unit: seed?.unit ?? 'each',
      price_cents: seed?.price_cents ?? 0,
      planned_qty: null,
      is_active: true,
    };
  });

  const { error: insErr } = await supabase.from('market_offerings').insert(inserts);
  if (insErr) {
    console.error('[api/admin/market/bulk-add] insert failed:', insErr.message);
    return redirect(backTo(week, market, 'error', 'add_failed'), 303);
  }

  return redirect(backTo(week, market, 'ok', 'added', toAdd.length), 303);
};
