/**
 * POST /api/admin/market/sign-add   (admin only)
 *
 * Last-minute "throw something on" — add a NEW market product (and therefore a
 * printable sign) for a week, right from the signs page. Creates a
 * product_library entry if the name is new, then a market_offering for the week
 * at every active farmers-market, so the item shows up as a sign AND on the
 * price sheet / pick lists.
 *
 * Body (multipart/form-data):
 *   - week_starting   YYYY-MM-DD (required)
 *   - name            text (required)
 *   - price_dollars   dollars >= 0 (optional — blank → 0 → a blank hand-write sign)
 *   - category        'Vegetables' | 'Herbs' | 'Flowers' | 'Other' (drives sign color)
 *   - unit            text (optional, default 'each')
 *
 * Auth: requireAdmin + isSameOriginPost. On success → labels page ?ok=added.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { dollarsToCents, isYMD } from '../../../../lib/flex-order';

export const prerender = false;

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'item';
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
    return redirect('/admin/market', 303);
  }

  const week = String(form.get('week_starting') ?? '');
  if (!isYMD(week)) return redirect('/admin/market?error=bad_week', 303);
  const back = `/admin/market/labels/${week}`;

  const name = String(form.get('name') ?? '').trim().slice(0, 80);
  if (!name) return redirect(`${back}?error=need_name`, 303);

  const allowedCat = new Set(['Vegetables', 'Herbs', 'Flowers', 'Other']);
  const rawCat = String(form.get('category') ?? 'Vegetables').trim();
  const category = allowedCat.has(rawCat) ? rawCat : 'Vegetables';
  const unit = String(form.get('unit') ?? '').trim().slice(0, 30) || 'each';
  const priceCents = dollarsToCents(String(form.get('price_dollars') ?? '').trim() || null) ?? 0;

  // 1. Find the product by name (case-insensitive) or create it.
  let libraryId: string | null = null;
  const { data: existing } = await locals.supabase
    .from('product_library')
    .select('id')
    .ilike('name', name)
    .maybeSingle();
  if (existing) {
    libraryId = (existing as { id: string }).id;
  } else {
    const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: created, error: createErr } = await locals.supabase
      .from('product_library')
      .insert({ name, slug, category })
      .select('id')
      .single();
    if (createErr || !created) {
      console.error('[api/admin/market/sign-add] product create failed:', createErr?.message);
      return redirect(`${back}?error=add_failed`, 303);
    }
    libraryId = (created as { id: string }).id;
  }

  // 2. The active farmers-markets (is_delivery_zone=false, day Tue/Sat/Sun).
  const { data: markets, error: mErr } = await locals.supabase
    .from('pickup_locations')
    .select('id')
    .eq('is_delivery_zone', false)
    .in('day_of_week', ['Tue', 'Sat', 'Sun']);
  if (mErr || !markets || markets.length === 0) {
    console.error('[api/admin/market/sign-add] markets fetch failed:', mErr?.message);
    return redirect(`${back}?error=add_failed`, 303);
  }

  // 3. Offerings for markets that don't already have this product this week.
  const { data: have } = await locals.supabase
    .from('market_offerings')
    .select('market_location_id')
    .eq('week_starting', week)
    .eq('library_id', libraryId);
  const haveSet = new Set((have ?? []).map((r) => (r as { market_location_id: string | null }).market_location_id));
  const rows = (markets as { id: string }[])
    .filter((m) => !haveSet.has(m.id))
    .map((m) => ({ library_id: libraryId, week_starting: week, market_location_id: m.id, unit, price_cents: priceCents, is_active: true }));

  if (rows.length > 0) {
    const { error: insErr } = await locals.supabase.from('market_offerings').insert(rows);
    if (insErr) {
      console.error('[api/admin/market/sign-add] offering insert failed:', insErr.message);
      return redirect(`${back}?error=add_failed`, 303);
    }
  }
  return redirect(`${back}?ok=added`, 303);
};
