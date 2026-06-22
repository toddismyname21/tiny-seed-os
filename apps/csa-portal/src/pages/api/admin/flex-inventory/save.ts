/**
 * POST /api/admin/flex-inventory/save   (admin only)
 *
 * Create OR update a single flex_inventory item for a given week.
 *
 * Form body (multipart/form-data):
 *   - id              UUID — present => UPDATE; absent/empty => INSERT.
 *   - week_starting   YYYY-MM-DD (the cycle Monday)
 *   - name            required, 1–120 chars
 *   - category        optional
 *   - unit            required
 *   - price_dollars   required, dollars (>= 0) → stored as price_cents
 *   - available_qty   required, integer >= 0
 *   - description     optional
 *   - photo_url       optional (absolute URL from the image upload endpoint)
 *   - is_active       'true' | absent
 *   - coming_soon     'true' | absent
 *   - is_featured     'true' | absent
 *
 * ── remaining_qty semantics (acceptance criterion) ──────────────────
 * On CREATE: remaining_qty = available_qty (nothing ordered yet).
 * On UPDATE: editing available_qty must NOT clobber already-ordered units.
 *   ordered      = old.available_qty − old.remaining_qty   (units consumed)
 *   new.remaining = max(0, new.available_qty − ordered)
 * So if 100 available / 90 remaining (10 ordered) and Todd raises available
 * to 120, remaining becomes 110 (still 10 ordered). If he LOWERS available
 * below the ordered count, remaining floors at 0 (can't un-sell).
 * `ordered` is derived from the columns (available − remaining); the member
 * insert path is the single writer that decrements remaining_qty atomically,
 * so the column is authoritative. (PostgREST aggregate SUM is disabled on
 * this project, so a live re-sum cross-check isn't available — and isn't
 * needed, since remaining_qty already reflects every committed order.)
 *
 * Authorization: requireAdmin + isSameOriginPost. Writes go through the
 * cookie-aware RLS client (admin_all policy), consistent with every other
 * admin mutation in this codebase.
 *
 * On success: 303 → /admin/flex-inventory?week=<>&ok=<saved|created>
 * On failure: 303 → /admin/flex-inventory?week=<>&error=<code>
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { dollarsToCents, isYMD } from '../../../../lib/flex-order';

export const prerender = false;

const Body = z.object({
  id: z.uuid().nullable(),
  week_starting: z.string().refine(isYMD, 'invalid_week'),
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().max(60).nullable(),
  unit: z.string().trim().min(1).max(30),
  price_cents: z.number().int().nonnegative().max(1_000_000),
  available_qty: z.number().int().nonnegative().max(100_000),
  description: z.string().trim().max(1000).nullable(),
  photo_url: z.url().max(2000).nullable(),
  is_active: z.boolean(),
  coming_soon: z.boolean(),
  is_featured: z.boolean(),
});

function strOrNull(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

function backTo(week: string, key: 'ok' | 'error', val: string): string {
  return `/admin/flex-inventory?week=${encodeURIComponent(week)}&${key}=${val}`;
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
  const idRaw = strOrNull(form.get('id'));
  const priceCents = dollarsToCents(strOrNull(form.get('price_dollars')));
  const availRaw = strOrNull(form.get('available_qty'));
  const availQty = availRaw === null ? NaN : Number.parseInt(availRaw, 10);

  if (priceCents === null) {
    return redirect(backTo(week, 'error', 'invalid_price'), 303);
  }

  const parsed = Body.safeParse({
    id: idRaw,
    week_starting: week,
    name: String(form.get('name') ?? '').trim(),
    category: strOrNull(form.get('category')),
    unit: String(form.get('unit') ?? '').trim(),
    price_cents: priceCents,
    available_qty: Number.isFinite(availQty) ? availQty : NaN,
    description: strOrNull(form.get('description')),
    photo_url: strOrNull(form.get('photo_url')),
    is_active: form.get('is_active') === 'true',
    coming_soon: form.get('coming_soon') === 'true',
    is_featured: form.get('is_featured') === 'true',
  });

  if (!parsed.success) {
    return redirect(backTo(week, 'error', 'invalid_input'), 303);
  }
  const d = parsed.data;

  // ── CREATE ──────────────────────────────────────────────────────
  if (!d.id) {
    const { error } = await locals.supabase.from('flex_inventory').insert({
      week_starting: d.week_starting,
      name: d.name,
      category: d.category,
      unit: d.unit,
      price_cents: d.price_cents,
      available_qty: d.available_qty,
      remaining_qty: d.available_qty, // nothing ordered yet
      description: d.description,
      photo_url: d.photo_url,
      is_active: d.is_active,
      coming_soon: d.coming_soon,
      is_featured: d.is_featured,
    });
    if (error) {
      console.error('[api/admin/flex-inventory/save] insert failed:', error.message);
      return redirect(backTo(d.week_starting, 'error', 'save_failed'), 303);
    }
    return redirect(backTo(d.week_starting, 'ok', 'created'), 303);
  }

  // ── UPDATE ──────────────────────────────────────────────────────
  // Read the current row to derive how many units are already ordered, so
  // editing available_qty doesn't clobber that.
  type Cur = {
    available_qty: number;
    remaining_qty: number;
    week_starting: string;
    library_id: string | null;
  };
  const { data: cur, error: curErr } = await locals.supabase
    .from('flex_inventory')
    .select('available_qty, remaining_qty, week_starting, library_id')
    .eq('id', d.id)
    .maybeSingle()
    .overrideTypes<Cur, { merge: false }>();

  if (curErr) {
    console.error('[api/admin/flex-inventory/save] current read failed:', curErr.message);
    return redirect(backTo(d.week_starting, 'error', 'save_failed'), 303);
  }
  if (!cur) {
    return redirect(backTo(d.week_starting, 'error', 'not_found'), 303);
  }

  // Units consumed per the column (available − remaining), never negative.
  // remaining_qty is decremented atomically by the member insert path, so
  // this is the authoritative count of already-ordered units.
  const ordered = Math.max(0, cur.available_qty - cur.remaining_qty);
  const newRemaining = Math.max(0, d.available_qty - ordered);

  const { error } = await locals.supabase
    .from('flex_inventory')
    .update({
      name: d.name,
      category: d.category,
      unit: d.unit,
      price_cents: d.price_cents,
      available_qty: d.available_qty,
      remaining_qty: newRemaining,
      description: d.description,
      photo_url: d.photo_url,
      is_active: d.is_active,
      coming_soon: d.coming_soon,
      is_featured: d.is_featured,
    })
    .eq('id', d.id);

  if (error) {
    console.error('[api/admin/flex-inventory/save] update failed:', error.message);
    return redirect(backTo(d.week_starting, 'error', 'save_failed'), 303);
  }

  // ── PROPAGATE the photo to the shared product_library (single source). ──
  // product_library is the master photo store: wholesale, box, and flex all
  // read library.photo_url first. So when this flex item carries a photo AND is
  // linked to a library row, push the photo UP to the library so it shows on
  // every channel for that product. Additive + best-effort: a failure here
  // never fails the flex save (the item already saved its own photo_url as a
  // fallback). Only runs when both a library link and a photo exist — we never
  // null out the shared photo from the flex editor.
  if (cur.library_id && d.photo_url) {
    const { error: libErr } = await locals.supabase
      .from('product_library')
      .update({ photo_url: d.photo_url, updated_at: new Date().toISOString() })
      .eq('id', cur.library_id);
    if (libErr) {
      console.error('[api/admin/flex-inventory/save] library photo propagate failed:', libErr.message);
    }
  }

  return redirect(backTo(d.week_starting, 'ok', 'saved'), 303);
};
