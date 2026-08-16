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
 *   - op=bulk-plan
 *                BULK "plan markets" grid save. One submit carries the WHOLE
 *                grid for a week: one row per product (library_id) with that
 *                product's unit + price, plus a planned qty per market column.
 *                For each (week_starting, library_id, market_location_id) cell:
 *                  • qty entered → UPSERT the matching offering — create it
 *                    (unit + price + planned_qty + market, is_active=true) if
 *                    none exists for that product+market+week, else UPDATE its
 *                    planned_qty (and unit/price from the row).
 *                  • blank/0 cell with an existing offering → CLEAR planned_qty
 *                    to null (we do NOT delete the offering).
 *                Each product's unit + price are entered once per row and
 *                applied to every market offering created/updated from it.
 *                Writes ONLY to market_offerings (one source of truth).
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

/* ──────────────────────────────────────────────────────────────────
 * Bulk "plan markets" grid (op=bulk-plan)
 *
 * The grid posts one logical ROW per product plus one qty cell per market:
 *   rows[<library_id>][unit]            text
 *   rows[<library_id>][price_dollars]   dollars >= 0
 *   rows[<library_id>][qty][<market_id>] number >= 0 or blank
 *
 * We parse those bracketed names into a per-product bucket, then validate.
 * ────────────────────────────────────────────────────────────────── */

/** One product row from the grid, after parsing (qty per market_location_id). */
interface GridRow {
  library_id: string;
  unit: string;
  price_dollars: string;
  /** market_location_id → raw qty string (may be '' for a blank cell). */
  qty: Map<string, string>;
}

/** Parse `rows[<libId>][unit|price_dollars]` and `rows[<libId>][qty][<mktId>]`
 *  into a map of GridRow keyed by library_id. Tolerates missing fields. */
function parseGridRows(form: FormData): Map<string, GridRow> {
  const rows = new Map<string, GridRow>();
  // rows[<libId>][qty][<mktId>]  — qty cell (3-level)
  const qtyKey = /^rows\[([^\]]+)\]\[qty\]\[([^\]]+)\]$/;
  // rows[<libId>][<field>]       — unit / price_dollars (2-level)
  const fieldKey = /^rows\[([^\]]+)\]\[([a-z_]+)\]$/;

  const ensure = (libId: string): GridRow => {
    let r = rows.get(libId);
    if (!r) {
      r = { library_id: libId, unit: '', price_dollars: '', qty: new Map() };
      rows.set(libId, r);
    }
    return r;
  };

  for (const [key, value] of form.entries()) {
    const qm = key.match(qtyKey);
    if (qm) {
      ensure(qm[1]).qty.set(qm[2], String(value).trim());
      continue;
    }
    const fm = key.match(fieldKey);
    if (fm && (fm[2] === 'unit' || fm[2] === 'price_dollars')) {
      const r = ensure(fm[1]);
      if (fm[2] === 'unit') r.unit = String(value).trim();
      else r.price_dollars = String(value).trim();
    }
  }
  return rows;
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

  // ── BULK PLAN (grid) ────────────────────────────────────────────
  if (op === 'bulk-plan') {
    if (!isYMD(week)) {
      return redirect(backTo(week, 'error', 'invalid_input'), 303);
    }

    const grid = parseGridRows(form);

    // The live set of valid markets (the same filter the editor uses). Every
    // qty cell's market_location_id must be one of these — never trust the
    // client. We fetch the set ONCE and check membership in-memory.
    const { data: marketRows, error: marketsErr } = await locals.supabase
      .from('pickup_locations')
      .select('id')
      .eq('is_delivery_zone', false)
      .in('day_of_week', ['Tue', 'Sat', 'Sun']);
    if (marketsErr) {
      console.error('[api/admin/market/save] bulk-plan markets fetch failed:', marketsErr.message);
      return redirect(backTo(week, 'error', 'plan_failed'), 303);
    }
    const validMarketIds = new Set((marketRows ?? []).map((m) => m.id));

    // Existing offerings for this week, keyed by `${library_id}|${market_id}`,
    // so we can decide INSERT vs UPDATE per cell and find offerings to CLEAR.
    const { data: existingRows, error: existingErr } = await locals.supabase
      .from('market_offerings')
      .select('id, library_id, market_location_id, planned_qty')
      .eq('week_starting', week);
    if (existingErr) {
      console.error('[api/admin/market/save] bulk-plan existing fetch failed:', existingErr.message);
      return redirect(backTo(week, 'error', 'plan_failed'), 303);
    }
    const offeringKey = (libId: string, mktId: string | null): string => `${libId}|${mktId ?? ''}`;
    const existingByKey = new Map<string, { id: string; planned_qty: number | null }>();
    for (const r of existingRows ?? []) {
      if (!r.market_location_id) continue; // untagged legacy rows: not grid cells
      existingByKey.set(offeringKey(r.library_id, r.market_location_id), {
        id: r.id, planned_qty: r.planned_qty,
      });
    }

    // Build the work list: INSERTs, UPDATEs (qty + unit/price), and CLEARs
    // (set planned_qty=null). Validate as we go; bail on the first bad cell so
    // the owner sees a clear error rather than a partial save.
    type InsertWork = {
      library_id: string; market_location_id: string;
      unit: string; price_cents: number; planned_qty: number;
    };
    type UpdateWork = { id: string; unit: string; price_cents: number; planned_qty: number };
    type ClearWork = { id: string };
    const inserts: InsertWork[] = [];
    const updates: UpdateWork[] = [];
    const clears: ClearWork[] = [];
    // Track which existing offerings a non-blank cell touched, so the REST of
    // the existing offerings on rows the grid rendered can be cleared.
    const touchedOfferingIds = new Set<string>();

    for (const row of grid.values()) {
      // A product is a valid library row only if the id is a UUID.
      if (!/^[0-9a-fA-F-]{36}$/.test(row.library_id)) {
        return redirect(backTo(week, 'error', 'invalid_input'), 303);
      }

      // Does this row write any quantity? unit/price are only required when so.
      let rowHasQty = false;
      const cellPlans: { marketId: string; qty: number }[] = [];
      for (const [marketId, raw] of row.qty.entries()) {
        if (!validMarketIds.has(marketId)) {
          return redirect(backTo(week, 'error', 'invalid_market'), 303);
        }
        if (raw.length === 0) continue; // blank cell → handled as a CLEAR below
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
          return redirect(backTo(week, 'error', 'invalid_qty'), 303);
        }
        if (n === 0) continue; // 0 is treated as blank → CLEAR, not a write
        rowHasQty = true;
        cellPlans.push({ marketId, qty: n });
      }

      // Resolve unit/price only when a write is needed for this row.
      let unit = '';
      let priceCents = 0;
      if (rowHasQty) {
        const parsedPrice = dollarsToCents(row.price_dollars || null) ?? 0;
        const u = z.string().trim().min(1).max(30).safeParse(row.unit || 'each');
        const p = z.number().int().nonnegative().max(1_000_000).safeParse(parsedPrice);
        if (!u.success) return redirect(backTo(week, 'error', 'invalid_input'), 303);
        if (!p.success) return redirect(backTo(week, 'error', 'invalid_price'), 303);
        unit = u.data;
        priceCents = p.data;
      }

      for (const { marketId, qty } of cellPlans) {
        const key = offeringKey(row.library_id, marketId);
        const existing = existingByKey.get(key);
        if (existing) {
          touchedOfferingIds.add(existing.id);
          updates.push({ id: existing.id, unit, price_cents: priceCents, planned_qty: qty });
        } else {
          inserts.push({
            library_id: row.library_id, market_location_id: marketId,
            unit, price_cents: priceCents, planned_qty: qty,
          });
        }
      }
    }

    // CLEAR: any offering whose (lib, market) cell the grid rendered but that
    // now has a blank/0 qty → set planned_qty=null (keep the offering). We only
    // clear offerings whose library_id appeared in the grid (so we never touch
    // offerings for products the grid didn't render), and that a write didn't
    // already touch.
    for (const row of grid.values()) {
      for (const [marketId, raw] of row.qty.entries()) {
        const n = raw.length === 0 ? 0 : Number(raw);
        const isBlankOrZero = raw.length === 0 || (Number.isFinite(n) && n === 0);
        if (!isBlankOrZero) continue;
        const existing = existingByKey.get(offeringKey(row.library_id, marketId));
        if (existing && !touchedOfferingIds.has(existing.id) && existing.planned_qty !== null) {
          clears.push({ id: existing.id });
        }
      }
    }

    const nowIso = new Date().toISOString();

    if (inserts.length > 0) {
      const { error } = await locals.supabase.from('market_offerings').insert(
        inserts.map((i) => ({
          library_id: i.library_id,
          week_starting: week,
          market_location_id: i.market_location_id,
          unit: i.unit,
          price_cents: i.price_cents,
          planned_qty: i.planned_qty,
          is_active: true,
        })),
      );
      if (error) {
        console.error('[api/admin/market/save] bulk-plan insert failed:', error.message);
        return redirect(backTo(week, 'error', 'plan_failed'), 303);
      }
    }

    for (const u of updates) {
      const { error } = await locals.supabase
        .from('market_offerings')
        .update({ unit: u.unit, price_cents: u.price_cents, planned_qty: u.planned_qty, updated_at: nowIso })
        .eq('id', u.id);
      if (error) {
        console.error('[api/admin/market/save] bulk-plan update failed:', error.message);
        return redirect(backTo(week, 'error', 'plan_failed'), 303);
      }
    }

    if (clears.length > 0) {
      const { error } = await locals.supabase
        .from('market_offerings')
        .update({ planned_qty: null, updated_at: nowIso })
        .in('id', clears.map((c) => c.id));
      if (error) {
        console.error('[api/admin/market/save] bulk-plan clear failed:', error.message);
        return redirect(backTo(week, 'error', 'plan_failed'), 303);
      }
    }

    return redirect(`/admin/market?view=plan&week=${encodeURIComponent(week)}&ok=planned`, 303);
  }

  // Unknown op.
  return redirect(backTo(week, 'error', 'invalid_input'), 303);
};
