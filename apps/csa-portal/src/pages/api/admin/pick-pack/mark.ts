/**
 * POST /api/admin/pick-pack/mark   (admin/staff/CREW — pack-house ops, 0069)
 *
 * Set the LIVE status of ONE Pick & Pack line and stamp WHO did it. This is the
 * write behind the interactive check-off on /admin/pick-pack/[week] — the fix
 * for Todd's "confusion about what has been done, and if someone did it."
 *
 *   • PICK lines  (section='harvest', the ?view=overall sheet): todo → harvesting
 *     → done. On 'done' the caller may pass actual_qty (what was ACTUALLY
 *     harvested vs the sheet's target).
 *   • PACK lines  (section in csa/wholesale/market): todo → packed.
 *
 * Body (JSON, same-origin fetch):
 *   week_date   YYYY-MM-DD Monday of the cycle week
 *   section     'harvest' | 'csa' | 'wholesale' | 'market'
 *   scope_day   'all' | 'mon' | 'thu'   (the harvest-day scope the sheet is on)
 *   market_id   pickup_locations UUID for section='market'; null/absent else
 *   line_key    the STABLE per-crop key (lib/pick-pack.ts pickPackLineKey)
 *   status      target status — MUST be legal for the section (see above)
 *   actual_qty  optional number, ONLY meaningful for section='harvest' + 'done'
 *
 * Upserts pick_pack_progress on its (week_date, section, scope_day, market_id,
 * line_key) UNIQUE key (market_id coalesced to the all-zero sentinel for every
 * non-market section, matching the column default), stamping worked_by /
 * worked_by_id from the resolved ops caller.
 *
 * Authorization: isSameOriginPost (CSRF) + requireCrew (admin/staff/crew). The
 * upsert runs through the cookie-aware RLS client (pick_pack_progress_ops =
 * is_ops_caller), so crew can write from their phones.
 *
 * Returns { ok:true, status, worked_by } / { ok:false, error }.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireCrew } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';

export const prerender = false;

/** Non-market sections (and untagged market groups) share this sentinel so the
 *  composite UNIQUE dedupes and on_conflict can name market_id directly. Must
 *  match the column DEFAULT in migration 0069. */
const SENTINEL_MARKET = '00000000-0000-0000-0000-000000000000';

const Body = z.object({
  week_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  section: z.enum(['harvest', 'csa', 'wholesale', 'market']),
  scope_day: z.enum(['all', 'mon', 'thu']),
  // Accept a UUID, explicit null, or omission — coalesced below.
  market_id: z.string().uuid().nullable().optional(),
  line_key: z.string().trim().min(1).max(200),
  status: z.enum(['todo', 'harvesting', 'done', 'packed']),
  // Non-negative, finite; null/omitted allowed. Only persisted for harvest+done.
  actual_qty: z.number().finite().nonnegative().nullable().optional(),
});

/** Statuses each section is allowed to hold. */
const HARVEST_STATUSES = new Set(['todo', 'harvesting', 'done']);
const PACK_STATUSES = new Set(['todo', 'packed']);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }
  const auth = await requireCrew(locals.supabase, locals.user);
  if (auth.response) return auth.response;
  const ctx = auth.ctx;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_body' }, 400);
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return json({ ok: false, error: 'invalid_input' }, 400);
  }
  const b = parsed.data;

  // Status must be legal for the section (a PICK status on a PACK line, or vice
  // versa, is a client bug — reject rather than store a nonsense state).
  const legal = b.section === 'harvest' ? HARVEST_STATUSES : PACK_STATUSES;
  if (!legal.has(b.status)) {
    return json({ ok: false, error: 'illegal_status_for_section' }, 400);
  }

  // market_id only applies to the market sheet; force the sentinel elsewhere so
  // the row lands on the same UNIQUE slot the loader reads.
  const market_id =
    b.section === 'market' ? (b.market_id ?? SENTINEL_MARKET) : SENTINEL_MARKET;

  // actual_qty is only meaningful for a harvested PICK line marked done.
  const actual_qty =
    b.section === 'harvest' && b.status === 'done' && b.actual_qty != null
      ? b.actual_qty
      : null;

  const supabase = locals.supabase;

  // The "who did it" display name — the caller's customers.contact_name (self-
  // read via customers_self_read RLS), falling back to their email local-part so
  // worked_by is never blank. This is a farm-worker name, never member PII.
  let worked_by: string | null = null;
  const { data: me } = await supabase
    .from('customers')
    .select('contact_name')
    .eq('id', ctx.customerId)
    .maybeSingle()
    .overrideTypes<{ contact_name: string | null }, { merge: false }>();
  worked_by =
    me?.contact_name?.trim() ||
    (ctx.user.email ? ctx.user.email.split('@')[0] : null) ||
    'Crew';

  const { error } = await supabase
    .from('pick_pack_progress')
    .upsert(
      {
        week_date: b.week_date,
        section: b.section,
        scope_day: b.scope_day,
        market_id,
        line_key: b.line_key,
        status: b.status,
        actual_qty,
        worked_by,
        worked_by_id: ctx.customerId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'week_date,section,scope_day,market_id,line_key' },
    );

  if (error) {
    console.error('[api/admin/pick-pack/mark] upsert failed:', error.message);
    return json({ ok: false, error: 'save_failed' }, 500);
  }

  return json({ ok: true, status: b.status, worked_by });
};
