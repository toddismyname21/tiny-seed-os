/**
 * POST /api/admin/pick-pack/mark  (admin/staff/CREW — pack-house ops, 0069/0083/0092)
 *
 * Set the LIVE status of ONE Pick & Pack line and stamp WHO did it. This is the
 * write behind the interactive check-off on /admin/pick-pack/[week] — the fix
 * for Todd's "confusion about what has been done, and if someone did it." It is
 * ALSO the write behind the pack crew's Monday checklist at /admin/checklist.
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
 *   • CREW DAY    (section='crew_day', the pack crew's daily responsibility
 *     checklist, 0092 — Monday v1): a simple todo → done tick whose line_key is
 *     a STABLE task key from lib/crew-day.ts, always on scope_day='mon' and the
 *     sentinel market_id. It uses the SAME targeted partial-update contract as
 *     packhouse, because its lunch-checkpoint row also carries note (the missing
 *     items flagged for Ben, one per line) and needed_qty (the quantity typed on
 *     the most recent flag). Ticking the box must not wipe a flag, and flagging
 *     must not wipe the tick.
 *
 * Body (JSON, same-origin fetch):
 *   week_date   YYYY-MM-DD Monday of the cycle week
 *   section     'harvest' | 'csa' | 'wholesale' | 'market' | 'packhouse' | 'crew_day'
 *   scope_day   'all' | 'mon' | 'thu'   (the harvest-day scope the sheet is on;
 *               always 'mon' for crew_day)
 *   market_id   pickup_locations UUID for section='market'; null/absent else
 *   line_key    the STABLE per-crop key (lib/pick-pack.ts pickPackLineKey), or
 *               the STABLE task key (lib/crew-day.ts) for section='crew_day'
 *   status      target status — REQUIRED for sections WITHOUT the targeted
 *               contract + MUST be legal for the section; OPTIONAL for packhouse
 *               and crew_day (a note-only or need-only save omits it). packhouse
 *               takes a PACK status (todo|packed); crew_day takes todo|done.
 *   actual_qty  optional number, ONLY meaningful for section='harvest' + 'done'.
 *               Ignored (persisted as null) for every other section.
 *   needed_qty  optional number, ONLY meaningful for packhouse ("still need N
 *               more") and crew_day (the flagged quantity); 0/null clears it
 *   note        optional string, ONLY meaningful for packhouse (pack-team note)
 *               and crew_day (the newline-separated flagged items); ''/null clears
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
  section: z.enum(['harvest', 'csa', 'wholesale', 'market', 'packhouse', 'crew_day']),
  scope_day: z.enum(['all', 'mon', 'thu']),
  // Accept a UUID, explicit null, or omission — coalesced below.
  market_id: z.string().uuid().nullable().optional(),
  line_key: z.string().trim().min(1).max(200),
  // REQUIRED for every section WITHOUT the targeted contract; OPTIONAL for
  // packhouse + crew_day (a note-only or flag-only save omits it). Enforced
  // per-section below.
  status: z.enum(['todo', 'harvesting', 'done', 'packed']).optional(),
  // Non-negative, finite; null/omitted allowed. Only persisted for harvest+done.
  actual_qty: z.number().finite().nonnegative().nullable().optional(),
  // TARGETED sections only (packhouse "still need to pick/pull N more"; crew_day
  // flagged quantity). A number sets it; 0 or null clears it. Presence (vs
  // omission) is what decides whether the column is touched, so a status/note
  // save never wipes it.
  needed_qty: z.number().finite().nonnegative().nullable().optional(),
  // TARGETED sections only (packhouse pack-team note; crew_day newline-separated
  // flagged items). Non-empty text sets it; ''/null clears it. Presence decides
  // whether the column is touched.
  note: z.string().max(500).nullable().optional(),
});

/** Statuses each section is allowed to hold. */
const HARVEST_STATUSES = new Set(['todo', 'harvesting', 'done']);
const PACK_STATUSES = new Set(['todo', 'packed']);
/** crew_day is a plain tick: todo ↔ done. 'harvesting'/'packed' are rejected. */
const CREW_DAY_STATUSES = new Set(['todo', 'done']);

/** Sections using the TARGETED partial-update contract — status / needed_qty /
 *  note are each independently settable and an OMITTED field is preserved on
 *  conflict. Everything else does the original full write. */
const TARGETED_SECTIONS = new Set(['packhouse', 'crew_day']);

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
  const isTargeted = TARGETED_SECTIONS.has(b.section);

  // Which mutating fields did this request carry? (Presence, not value — a null
  // needed_qty/note is a deliberate CLEAR, not an omission.)
  const touchesStatus = b.status !== undefined;
  const touchesNeeded = b.needed_qty !== undefined;
  const touchesNote = b.note !== undefined;

  // The statuses THIS section may hold: PICK for harvest, a plain tick for
  // crew_day, PACK for everything else (csa/wholesale/market/packhouse).
  const legalStatuses =
    b.section === 'harvest' ? HARVEST_STATUSES
    : b.section === 'crew_day' ? CREW_DAY_STATUSES
    : PACK_STATUSES;

  if (!isTargeted) {
    // Full-write sections: status is REQUIRED and must be legal for the section
    // (a PICK status on a PACK line, or vice-versa, is a client bug).
    if (!touchesStatus) {
      return json({ ok: false, error: 'invalid_input' }, 400);
    }
    if (!legalStatuses.has(b.status as string)) {
      return json({ ok: false, error: 'illegal_status_for_section' }, 400);
    }
  } else {
    // Targeted sections (packhouse, crew_day): status is OPTIONAL but, when
    // present, must be legal for the section. At least ONE mutating field
    // (status / needed_qty / note) must be present — an empty write is a no-op
    // we reject rather than stamp.
    if (touchesStatus && !legalStatuses.has(b.status as string)) {
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
  //   • full-write sections — the existing behavior: status + actual_qty (the
  //     controller always sends a status, so nothing is preserved unexpectedly).
  //   • TARGETED sections (packhouse, crew_day) — include ONLY the field(s) the
  //     caller sent, so an omitted column is preserved on conflict (and takes its
  //     column default on a fresh insert). This is what lets a note-only save keep
  //     the packed status / the crew_day tick, a toggle keep a flagged need, etc.
  const payload: {
    week_date: string;
    section: 'harvest' | 'csa' | 'wholesale' | 'market' | 'packhouse' | 'crew_day';
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
  if (!isTargeted) {
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
