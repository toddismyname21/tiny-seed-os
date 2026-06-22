/**
 * POST /api/admin/market/save   (admin only)
 *
 * Mutate the weekly MARKET LIST — `market_offerings`, the farmers-market
 * channel of the unified catalog. Three ops:
 *
 *   - op=add     INSERT a market_offerings row for a week from a master
 *                product (library_id). unit defaults to 'each', price to $0;
 *                is_active=true. A product may be added MULTIPLE times in one
 *                week (e.g. by the bunch AND the pound) — we do NOT dedupe by
 *                library_id, so each add creates its own offering row.
 *   - op=update  SET unit / price_cents / is_active on an existing offering
 *                (by id). Sends only the fields present in the form.
 *   - op=remove  DELETE an offering by id.
 *
 * Form body (application/x-www-form-urlencoded or multipart/form-data):
 *   - op             'add' | 'update' | 'remove'   (required)
 *   - week_starting  YYYY-MM-DD (the cycle Monday)  (required — for redirect + add)
 *   - library_id     product_library UUID           (add only)
 *   - id             market_offerings UUID          (update / remove only)
 *   - unit           text                           (add / update)
 *   - price_dollars  dollars >= 0 → price_cents     (add / update)
 *   - is_active      'true' | absent                (update — checkbox)
 *
 * Authorization: requireAdmin + isSameOriginPost. Writes go through the
 * cookie-aware RLS client (market_offerings_staff = is_admin_caller, FOR ALL),
 * consistent with flex-inventory/save.ts and every other admin mutation.
 *
 * On success: 303 → /admin/market?week=<>&ok=<added|saved|removed>
 * On failure: 303 → /admin/market?week=<>&error=<code>
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { dollarsToCents, isYMD } from '../../../../lib/flex-order';

export const prerender = false;

function strOrNull(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

function backTo(week: string, key: 'ok' | 'error', val: string): string {
  return `/admin/market?week=${encodeURIComponent(week)}&${key}=${val}`;
}

const AddBody = z.object({
  week_starting: z.string().refine(isYMD, 'invalid_week'),
  library_id: z.uuid(),
  unit: z.string().trim().min(1).max(30),
  price_cents: z.number().int().nonnegative().max(1_000_000),
});

const UpdateBody = z.object({
  id: z.uuid(),
  unit: z.string().trim().min(1).max(30),
  price_cents: z.number().int().nonnegative().max(1_000_000),
  is_active: z.boolean(),
});

const RemoveBody = z.object({
  id: z.uuid(),
});

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
    return redirect(backTo('', 'error', 'invalid_input'), 303);
  }

  const week = String(form.get('week_starting') ?? '');
  const op = String(form.get('op') ?? '').trim();

  // ── ADD ─────────────────────────────────────────────────────────
  if (op === 'add') {
    const priceCents = dollarsToCents(strOrNull(form.get('price_dollars'))) ?? 0;
    const parsed = AddBody.safeParse({
      week_starting: week,
      library_id: strOrNull(form.get('library_id')) ?? '',
      unit: String(form.get('unit') ?? '').trim() || 'each',
      price_cents: priceCents,
    });
    if (!parsed.success) {
      return redirect(backTo(week, 'error', 'invalid_input'), 303);
    }
    const d = parsed.data;

    const { error } = await locals.supabase.from('market_offerings').insert({
      library_id: d.library_id,
      week_starting: d.week_starting,
      unit: d.unit,
      price_cents: d.price_cents,
      is_active: true,
    });
    if (error) {
      console.error('[api/admin/market/save] add insert failed:', error.message);
      return redirect(backTo(d.week_starting, 'error', 'add_failed'), 303);
    }
    return redirect(backTo(d.week_starting, 'ok', 'added'), 303);
  }

  // ── UPDATE ──────────────────────────────────────────────────────
  if (op === 'update') {
    const priceCents = dollarsToCents(strOrNull(form.get('price_dollars')));
    if (priceCents === null) {
      return redirect(backTo(week, 'error', 'invalid_price'), 303);
    }
    const parsed = UpdateBody.safeParse({
      id: strOrNull(form.get('id')) ?? '',
      unit: String(form.get('unit') ?? '').trim(),
      price_cents: priceCents,
      is_active: form.get('is_active') === 'true',
    });
    if (!parsed.success) {
      return redirect(backTo(week, 'error', 'invalid_input'), 303);
    }
    const d = parsed.data;

    const { error } = await locals.supabase
      .from('market_offerings')
      .update({
        unit: d.unit,
        price_cents: d.price_cents,
        is_active: d.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', d.id);
    if (error) {
      console.error('[api/admin/market/save] update failed:', error.message);
      return redirect(backTo(week, 'error', 'save_failed'), 303);
    }
    return redirect(backTo(week, 'ok', 'saved'), 303);
  }

  // ── REMOVE ──────────────────────────────────────────────────────
  if (op === 'remove') {
    const parsed = RemoveBody.safeParse({ id: strOrNull(form.get('id')) ?? '' });
    if (!parsed.success) {
      return redirect(backTo(week, 'error', 'invalid_input'), 303);
    }
    const { error } = await locals.supabase
      .from('market_offerings')
      .delete()
      .eq('id', parsed.data.id);
    if (error) {
      console.error('[api/admin/market/save] remove failed:', error.message);
      return redirect(backTo(week, 'error', 'remove_failed'), 303);
    }
    return redirect(backTo(week, 'ok', 'removed'), 303);
  }

  // Unknown op.
  return redirect(backTo(week, 'error', 'invalid_input'), 303);
};
