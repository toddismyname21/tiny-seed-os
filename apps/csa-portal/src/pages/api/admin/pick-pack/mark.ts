/**
 * POST /api/admin/pick-pack/mark   (admin/staff/CREW — pack-house ops, 0069/0083)
 *
 * Set the LIVE status of ONE Pick & Pack line and stamp WHO did it. This is the
 * write behind the interactive check-off on /admin/pick-pack/[week] — the fix
 * for Todd's "confusion about what has been done, and if someone did it."
 *
 *   • PICK lines  (section='harvest', the ?view=overall sheet): todo → harvesting
 *     → done. On 'done' the caller may pass actual_qty (what was ACTUALLY
 *     harvested vs the sheet's target).
 *   • PACK lines  (section in csa/wholesale/market): todo → packed.
 *   • PACK HOUSE  (section='packhouse', the by-item distribution sheet, 0083):
 *     a PACK-style line (todo → packed) that ALSO carries two crew-editable
 *     fields — needed_qty ("still need to pick/pull N more") and note. Each of
 *     status / needed_qty / note can be updated INDEPENDENTLY: saving a note must
 *     NOT clobber the packed status or a flagged need, and vice-versa. So a
 *     packhouse write builds a TARGETED upsert payload that carries ONLY the
 *     field(s) the caller sent — omitted columns are preserved on conflict (and
 *     take their column default on a fresh insert).
 *
 * Body (JSON, same-origin fetch):
 *   week_date   YYYY-MM-DD Monday of the cycle week
 *   section     'harvest' | 'csa' | 'wholesale' | 'market' | 'packhouse'
 *   scope_day   'all' | 'mon' | 'thu'   (the harvest-day scope the sheet is on)
 *   market_id   pickup_locations UUID for section='market'; null/absent else
 *   line_key    the STABLE per-crop key (lib/pick-pack.ts pickPackLineKey)
 *   status      target status — REQUIRED for non-packhouse sections + MUST be
 *               legal for the section; OPTIONAL for packhouse (a note-only or
 *               need-only save omits it). packhouse status is a PACK status.
 *   actual_qty  optional number, ONLY meaningful for section='harvest' + 'done'
 *   needed_qty  optional number, ONLY meaningful for section='packhouse' — the
 *               crew's "still need N more" figure (0/null clears the flag)
 *   note        optional string, ONLY meaningful for section='packhouse' (''/null
 *               clears the note)
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
 * Returns { ok:true, status, needed_qty, note, worked_by } / { ok:false, error }.
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
  section: z.enum(['harvest', 'csa', 'wholesale', 'market', 'packhouse']),
  scope_day: z.enum(['all', 'mon', 'thu']),
  // Accept a UUID, explicit null, or omission — coalesced below.
  market_id: z.string().uuid().nullable().optional(),
  line_key: z.string().trim().min(1).max(200),
  // REQUIRED for every non-packhouse section; OPTIONAL for packhouse (a note-only
  // or need-only save omits it). Enforced per-section below.
  status: z.enum(['todo', 'harvesting', 'done', 'packed']).optional(),
  // Non-negative, finite; null/omitted allowed. Only persisted for harvest+done.
  actual_qty: z.number().finite().nonnegative().nullable().optional(),
  // Pack-house only: the crew's "still need to pick/pull N more" figure. A number
  // sets the flag; 0 or null clears it. Presence (vs omission) is what decides
  // whether the column is touched, so a status/note save never wipes it.
  needed_qty: z.number().finite().nonnegative().nullable().optional(),
  // Pack-house only: a free-text pack-team note. Non-empty text sets it; ''/null
  // clears it. Presence decides whether the column is touched.
  note: z.string().max(500).nullable().optional(),
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
  const isPackhouse = b.section === 'packhouse';

  // Which mutating fields did this request carry? (Presence, not value — a null
  // needed_qty/note is a deliberate CLEAR, not an omission.)
  const touchesStatus = b.status !== undefined;
  const touchesNeeded = b.needed_qty !== undefined;
  const touchesNote = b.note !== undefined;

  if (!isPackhouse) {
    // Non-packhouse sections: status is REQUIRED and must be legal for the
    // section (a PICK status on a PACK line, or vice-versa, is a client bug).
    if (!touchesStatus) {
      return json({ ok: false, error: 'invalid_input' }, 400);
    }
    const legal = b.section === 'harvest' ? HARVEST_STATUSES : PACK_STATUSES;
    if (!legal.has(b.status as string)) {
      return json({ ok: false, error: 'illegal_status_for_section' }, 400);
    }
  } else {
    // Pack-house: status is OPTIONAL but, when present, must be a PACK status
    // (todo/packed). At least ONE mutating field (status / needed_qty / note)
    // must be present — an empty write is a no-op we reject rather than stamp.
    if (touchesStatus && !PACK_STATUSES.has(b.status as string)) {
      return json({ ok: false, error: 'illegal_status_for_section' }, 400);
    }
    if (!touchesStatus && !touchesNeeded && !touchesNote) {
      return json({ ok: false, error: 'nothing_to_update' }, 400);
    }
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

  // The upsert payload. The five key columns + worked_by/updated_at are ALWAYS
  // present. Whether the mutating columns (status / actual_qty / needed_qty /
  // note) are included depends on the section:
  //   • non-packhouse — the existing full write: status + actual_qty (the
  //     controller always sends a status, so nothing is preserved unexpectedly).
  //   • packhouse — a TARGETED write: include ONLY the field(s) the caller sent,
  //     so an omitted column is preserved on conflict (and takes its column
  //     default on a fresh insert). This is what lets a note-only save keep the
  //     packed status, a pack-toggle keep a flagged need, etc.
  const payload: {
    week_date: string;
    section: 'harvest' | 'csa' | 'wholesale' | 'market' | 'packhouse';
    scope_day: 'all' | 'mon' | 'thu';
    market_id: string;
    line_key: string;
    worked_by: string | null;
    worked_by_id: string;
    updated_at: string;
    status?: 'todo' | 'harvesting' | 'done' | 'packed';
    actual_qty?: number | null;
    needed_qty?: number | null;
    note?: string | null;
  } = {
    week_date: b.week_date,
    section: b.section,
    scope_day: b.scope_day,
    market_id,
    line_key: b.line_key,
    worked_by,
    worked_by_id: ctx.customerId,
    updated_at: new Date().toISOString(),
  };
  // Normalized values echoed back to the client (also what we persist for pack).
  let needed_out: number | null = null;
  let note_out: string | null = null;
  if (!isPackhouse) {
    payload.status = b.status;
    payload.actual_qty = actual_qty;
  } else {
    if (touchesStatus) payload.status = b.status;
    if (touchesNeeded) {
      // 0 or null both clear the flag; a positive number sets it.
      needed_out = b.needed_qty != null && b.needed_qty > 0 ? b.needed_qty : null;
      payload.needed_qty = needed_out;
    }
    if (touchesNote) {
      const trimmed = (b.note ?? '').trim();
      note_out = trimmed.length > 0 ? trimmed : null;
      payload.note = note_out;
    }
  }

  const { error } = await supabase
    .from('pick_pack_progress')
    .upsert(payload, { onConflict: 'week_date,section,scope_day,market_id,line_key' });

  if (error) {
    console.error('[api/admin/pick-pack/mark] upsert failed:', error.message);
    return json({ ok: false, error: 'save_failed' }, 500);
  }

  return json({
    ok: true,
    status: touchesStatus ? b.status : null,
    needed_qty: touchesNeeded ? needed_out : undefined,
    note: touchesNote ? note_out : undefined,
    worked_by,
  });
};
