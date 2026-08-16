/**
 * POST /api/admin/market/sign-edit   (admin only)
 *
 * Inline edit from the market SIGNS page (/admin/market/labels/[week]): rename a
 * product or change its price right on the sign, and have it PERSIST through the
 * whole market system (signs + printable price sheet + pick-pack market view),
 * because they all read market_offerings.
 *
 * A sign is per-PRODUCT (one row per library_id, deduped across markets), so this
 * updates EVERY offering for (week_starting, library_id) at once:
 *   - name           → display-name override (blank → NULL = revert to the
 *                      product_library master name)
 *   - price_dollars  → price_cents (blank → 0, which the sign renders as a blank
 *                      hand-write box)
 *
 * Auth: requireAdmin + isSameOriginPost (mirrors /api/admin/market/save).
 * On success: 303 → /admin/market/labels/<week>?ok=saved
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { dollarsToCents, isYMD } from '../../../../lib/flex-order';

export const prerender = false;

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
  const libraryId = String(form.get('library_id') ?? '');
  if (!isYMD(week) || !/^[0-9a-fA-F-]{36}$/.test(libraryId)) {
    return redirect('/admin/market?error=bad_input', 303);
  }
  const back = `/admin/market/labels/${week}`;

  // Name: blank → NULL (revert to the master product_library name).
  const rawName = String(form.get('name') ?? '').trim();
  const name = rawName.length ? rawName.slice(0, 80) : null;

  // Price: blank → 0 (the sign renders a blank, hand-write box); else dollars→cents.
  const rawPrice = String(form.get('price_dollars') ?? '').trim();
  const update: Record<string, unknown> = { name, updated_at: new Date().toISOString() };
  if (rawPrice.length) {
    const cents = dollarsToCents(rawPrice);
    if (cents === null || cents < 0) return redirect(`${back}?error=bad_price`, 303);
    update.price_cents = cents;
  } else {
    update.price_cents = 0;
  }

  const { error } = await locals.supabase
    .from('market_offerings')
    .update(update)
    .eq('week_starting', week)
    .eq('library_id', libraryId);

  // Inline click-to-edit on the signs page posts ajax=1 and wants JSON, not a
  // full-page redirect.
  const isAjax = String(form.get('ajax') ?? '') === '1';
  if (error) {
    console.error('[api/admin/market/sign-edit] update failed:', error.message);
    if (isAjax) return new Response(JSON.stringify({ ok: false, error: 'save_failed' }), { status: 500, headers: { 'content-type': 'application/json' } });
    return redirect(`${back}?error=save_failed`, 303);
  }
  if (isAjax) {
    return new Response(JSON.stringify({ ok: true, price_cents: update.price_cents, name }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return redirect(`${back}?ok=saved`, 303);
};
