/**
 * POST /api/admin/market/save   (admin only)
 *
 * Mutate the weekly MARKET LIST — `market_offerings`, the farmers-market
 * channel of the unified catalog. Three ops:
 *
 *   - op=add     INSERT a market_offerings row for a week from a master
 *                product (library_id), tagged to a SPECIFIC market
 *                (market_location_id, required) with a planned harvest qty.
 *                unit defaults to 'each', price to $0; is_active=true. A
 *                product may be added MULTIPLE times in one week (e.g. by the
 *                bunch AND the pound, or to two different markets) — we do NOT
 *                dedupe by library_id, so each add creates its own offering row.
 *   - op=update  SET unit / price_cents / planned_qty / is_active on an
 *                existing offering (by id). Sends only the fields in the form.
 *   - op=remove  DELETE an offering by id.
 *
 * Form body (application/x-www-form-urlencoded or multipart/form-data):
 *   - op                 'add' | 'update' | 'remove'      (required)
 *   - week_starting      YYYY-MM-DD (the cycle Monday)     (required — redirect + add)
 *   - library_id         product_library UUID              (add only)
 *   - market_location_id pickup_locations UUID (a market)  (add only, required)
 *   - id                 market_offerings UUID             (update / remove only)
 *   - unit               text                              (add / update)
 *   - price_dollars      dollars >= 0 → price_cents        (add / update)
 *   - planned_qty        number >= 0 (blank → null)        (add / update)
 *   - is_active          'true' | absent                   (update — checkbox)
 *
 * The market a product is tagged to MUST be one of the 4 farmers-markets:
 * pickup_locations rows with is_delivery_zone=false AND day_of_week IN
 * ('Tue','Sat','Sun'). We validate the submitted market_location_id against
 * that live set on every add.
 *
 * Authorization: requireAdmin + isSameOriginPost. Writes go through the
 * cookie-aware RLS client (market_offerings_staff = is_admin_caller, FOR ALL),
 * consistent with flex-inventory/save.ts and every other admin mutation.
 *
 * On success: 303 → /admin/market?week=<>&ok=<added|saved|removed>
 * On failure: 303 → /admin/market?week=<>&error=<code>
 */
import type { APIRoute } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { dollarsToCents, isYMD } from '../../../../lib/flex-order';
import type { Database } from '../../../../lib/database.types';

export const prerender = false;

/**
 * The 4 farmers-markets are pickup_locations rows with is_delivery_zone=false
 * AND day_of_week IN ('Tue','Sat','Sun'). A market_offering may only be tagged
 * to one of these. Returns true iff `id` is one of them.
 */
async function isValidMarket(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('pickup_locations')
    .select('id')
    .eq('id', id)
    .eq('is_delivery_zone', false)
    .in('day_of_week', ['Tue', 'Sat', 'Sun'])
    .maybeSingle();
  if (error) {
    console.error('[api/admin/market/save] market validation failed:', error.message);
    return false;
  }
  return data !== null;
}

/** Parse a free-typed quantity field. Blank → null; otherwise a non-negative
 *  number (rejects negatives / NaN by returning the special INVALID sentinel). */
const QTY_INVALID = Symbol('qty_invalid');
function parsePlannedQty(v: FormDataEntryValue | null): number | null | typeof QTY_INVALID {
  if (v === null) return null;
  const s = String(v).trim();
  if (s.length === 0) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return QTY_INVALID;
  return n;
}

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
  market_location_id: z.uuid(),
  unit: z.string().trim().min(1).max(30),
  price_cents: z.number().int().nonnegative().max(1_000_000),
  planned_qty: z.number().nonnegative().max(1_000_000).nullable(),
});

const UpdateBody = z.object({
  id: z.uuid(),
  unit: z.string().trim().min(1).max(30),
  price_cents: z.number().int().nonnegative().max(1_000_000),
  planned_qty: z.number().nonnegative().max(1_000_000).nullable(),
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
    const plannedQty = parsePlannedQty(form.get('planned_qty'));
    if (plannedQty === QTY_INVALID) {
      return redirect(backTo(week, 'error', 'invalid_qty'), 303);
    }
    const parsed = AddBody.safeParse({
      week_starting: week,
      library_id: strOrNull(form.get('library_id')) ?? '',
      market_location_id: strOrNull(form.get('market_location_id')) ?? '',
      unit: String(form.get('unit') ?? '').trim() || 'each',
      price_cents: priceCents,
      planned_qty: plannedQty,
    });
    if (!parsed.success) {
      return redirect(backTo(week, 'error', 'invalid_input'), 303);
    }
    const d = parsed.data;

    // The market MUST be one of the 4 live farmers-markets. Validate against
    // the same pickup_locations filter the editor uses (defensive — the form
    // is a <select> of exactly these 4, but never trust the client).
    const valid = await isValidMarket(locals.supabase, d.market_location_id);
    if (!valid) {
      return redirect(backTo(d.week_starting, 'error', 'invalid_market'), 303);
    }

    const { error } = await locals.supabase.from('market_offerings').insert({
      library_id: d.library_id,
      week_starting: d.week_starting,
      market_location_id: d.market_location_id,
      unit: d.unit,
      price_cents: d.price_cents,
      planned_qty: d.planned_qty,
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
    const plannedQty = parsePlannedQty(form.get('planned_qty'));
    if (plannedQty === QTY_INVALID) {
      return redirect(backTo(week, 'error', 'invalid_qty'), 303);
    }
    const parsed = UpdateBody.safeParse({
      id: strOrNull(form.get('id')) ?? '',
      unit: String(form.get('unit') ?? '').trim(),
      price_cents: priceCents,
      planned_qty: plannedQty,
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
        planned_qty: d.planned_qty,
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
