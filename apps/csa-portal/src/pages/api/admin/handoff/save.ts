/**
 * POST /api/admin/handoff/save   (admin/staff/crew — pack-house ops, migration 0068)
 *
 * Upsert ONE end-of-day pack-house handoff (keyed by log_date + crew_type) AND
 * insert any NEW carry-forward open items raised on it.
 *
 * WHY UPSERT: packhouse_handoff has a UNIQUE(log_date, crew_type) constraint —
 * one handoff per crew per day. Editing today's handoff (the fill page loads the
 * existing row and re-submits) must REPLACE that row, not create a duplicate. We
 * upsert on that conflict key and let created_at keep its original value (only
 * present on the first insert) while stamping updated_at every time.
 *
 * WHY OPEN ITEMS ARE INSERT-ONLY HERE: Block F is an "add items" affordance, not
 * an editor of existing items. Existing open items are RESOLVED on the read-side
 * digest (/api/admin/handoff/resolve-item), never re-edited here — so on an edit
 * re-submit we only insert the newly-typed rows (those with a non-empty body),
 * and never duplicate items already carried forward.
 *
 * Body (multipart/form-data):
 *   Block A  log_date (YYYY-MM-DD, required) · crew_type ('pack'|'field',
 *            required) · author_name · next_crew · headcount (int)
 *   Block B  shift_status ('normal'|'attention'|'urgent') · summary (≤140)
 *   Block C  packed_{csa,market,wholesale,floral}_{done,target} (ints, → packed
 *            jsonb) · plan_completed ('yes'|'partial'|'no')
 *   Block D  ph_cooler_temp · barn_cooler_temp · truck_used ('true'|absent) ·
 *            truck_temp · cooler_notes · use_first · running_low
 *   Block E  quality_issue · equipment_issue · safety_issue · photo_url
 *   Block F  priority (repeated, ≤3 kept) · open_item_body[] + open_item_owner[]
 *            (paired by index; blank-body rows dropped)
 *   Block G  note_next_crew
 *   lang     'es' to preserve Spanish on the redirect (else English)
 *
 * On success: 303 → /admin/handoff?ok=saved[&lang=es]
 * On failure: 303 → /admin/handoff/new?error=<code>[&crew=&date=&lang=es]
 *
 * Authorization (mirrors every other /api/admin/* mutation):
 *   1. isSameOriginPost() — CSRF belt-and-suspenders.
 *   2. requireCrew() — customers.role ∈ ('admin','staff','crew') → else 403.
 * The writes run through the cookie-aware RLS client; the tables' admin/staff
 * FOR ALL ops policy (is_ops_caller, migration 0068) lets admin/staff/crew through.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireCrew } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';

export const prerender = false;

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Trim a form value to a non-empty string, or null. */
function strOrNull(v: FormDataEntryValue | null, max = 4000): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  if (s.length === 0) return null;
  return s.slice(0, max);
}

/** Parse an integer >= 0, or null (blank / non-numeric / negative). */
function intOrNull(v: FormDataEntryValue | null): number | null {
  if (v === null) return null;
  const s = String(v).trim();
  if (s.length === 0) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/** Parse a temperature-style number (may be negative — coolers can read <32°F),
 *  bounded to a sane range so a fat-fingered value can't poison the row. */
function tempOrNull(v: FormDataEntryValue | null): number | null {
  if (v === null) return null;
  const s = String(v).trim();
  if (s.length === 0) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < -50 || n > 150) return null;
  return Math.round(n * 10) / 10;
}

/** Only accept an http(s) URL for the optional photo field; anything else → null
 *  (never store a javascript:/data: URI). */
function urlOrNull(v: FormDataEntryValue | null): string | null {
  const s = strOrNull(v, 2000);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? s : null;
  } catch {
    return null;
  }
}

const CrewType = z.enum(['pack', 'field']);
const ShiftStatus = z.enum(['normal', 'attention', 'urgent']);
const PlanCompleted = z.enum(['yes', 'partial', 'no']);

function fail(
  redirect: (url: string, status: 303) => Response,
  code: string,
  crew: string,
  date: string,
  lang: string,
): Response {
  const p = new URLSearchParams({ error: code });
  if (crew) p.set('crew', crew);
  if (date) p.set('date', date);
  if (lang === 'es') p.set('lang', 'es');
  return redirect(`/admin/handoff/new?${p.toString()}`, 303);
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }
  const auth = await requireCrew(locals.supabase, locals.user);
  if (auth.response) return auth.response;
  const ctx = auth.ctx;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(redirect, 'invalid_input', '', '', '');
  }

  const lang = String(form.get('lang') ?? '') === 'es' ? 'es' : 'en';
  const log_date = String(form.get('log_date') ?? '').trim();
  const crewRaw = String(form.get('crew_type') ?? '').trim();

  // Hard requirements: a valid Monday-agnostic date + a known crew type. These
  // form the unique key we upsert on, so they must be right.
  if (!YMD.test(log_date)) return fail(redirect, 'invalid_date', crewRaw, log_date, lang);
  const crewParsed = CrewType.safeParse(crewRaw);
  if (!crewParsed.success) return fail(redirect, 'invalid_crew', crewRaw, log_date, lang);
  const crew_type = crewParsed.data;

  // Block B — status is required (defaults 'normal'); summary capped at 140.
  const statusParsed = ShiftStatus.safeParse(String(form.get('shift_status') ?? 'normal').trim());
  const shift_status = statusParsed.success ? statusParsed.data : 'normal';
  const summary = strOrNull(form.get('summary'), 140);

  // Block C — plan_completed is optional; packed is a flexible per-channel
  // done-vs-target object. We store only channels that have at least one number.
  const planRaw = String(form.get('plan_completed') ?? '').trim();
  const planParsed = planRaw ? PlanCompleted.safeParse(planRaw) : null;
  const plan_completed = planParsed && planParsed.success ? planParsed.data : null;

  const channels = ['csa', 'market', 'wholesale', 'floral'] as const;
  const packed: Record<string, { done: number | null; target: number | null }> = {};
  for (const ch of channels) {
    const done = intOrNull(form.get(`packed_${ch}_done`));
    const target = intOrNull(form.get(`packed_${ch}_target`));
    if (done !== null || target !== null) packed[ch] = { done, target };
  }

  // Block D — cooler state (temps may be blank; truck_used is a checkbox).
  const truck_used = String(form.get('truck_used') ?? '') === 'true';
  const ph_cooler_temp = tempOrNull(form.get('ph_cooler_temp'));
  const barn_cooler_temp = tempOrNull(form.get('barn_cooler_temp'));
  const truck_temp = truck_used ? tempOrNull(form.get('truck_temp')) : null;

  // Block F — top-3 priorities (dedupe blanks, keep first 3).
  const priorities = form
    .getAll('priority')
    .map((v) => String(v).trim())
    .filter((s) => s.length > 0)
    .slice(0, 3);

  // ── Upsert the handoff row on (log_date, crew_type) ────────────────────────
  const { data: saved, error: saveErr } = await locals.supabase
    .from('packhouse_handoff')
    .upsert(
      {
        log_date,
        crew_type,
        author_name: strOrNull(form.get('author_name'), 120) ?? ctx.user.email ?? null,
        next_crew: strOrNull(form.get('next_crew'), 120),
        headcount: intOrNull(form.get('headcount')),
        shift_status,
        summary,
        plan_completed,
        packed: Object.keys(packed).length > 0 ? packed : null,
        ph_cooler_temp,
        barn_cooler_temp,
        truck_used,
        truck_temp,
        cooler_notes: strOrNull(form.get('cooler_notes')),
        use_first: strOrNull(form.get('use_first')),
        running_low: strOrNull(form.get('running_low')),
        quality_issue: strOrNull(form.get('quality_issue')),
        equipment_issue: strOrNull(form.get('equipment_issue')),
        safety_issue: strOrNull(form.get('safety_issue')),
        photo_url: urlOrNull(form.get('photo_url')),
        priorities: priorities.length > 0 ? priorities : null,
        note_next_crew: strOrNull(form.get('note_next_crew')),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'log_date,crew_type' },
    )
    .select('id')
    .single();

  if (saveErr || !saved) {
    console.error('[api/admin/handoff/save] upsert failed:', saveErr?.message);
    return fail(redirect, 'save_failed', crew_type, log_date, lang);
  }

  // ── Insert NEW carry-forward open items (paired body/owner by index) ───────
  const bodies = form.getAll('open_item_body').map((v) => String(v).trim());
  const owners = form.getAll('open_item_owner').map((v) => String(v).trim());
  const newItems = bodies
    .map((body, i) => ({ body, owner: owners[i] ?? '' }))
    .filter((it) => it.body.length > 0)
    .slice(0, 20) // sane cap — a handoff never legitimately raises 20+ items
    .map((it) => ({
      body: it.body.slice(0, 500),
      owner: it.owner.length > 0 ? it.owner.slice(0, 120) : null,
      created_handoff_id: saved.id,
    }));

  if (newItems.length > 0) {
    const { error: itemsErr } = await locals.supabase
      .from('packhouse_open_items')
      .insert(newItems);
    if (itemsErr) {
      // The handoff itself saved — surface a soft warning but don't lose it.
      console.error('[api/admin/handoff/save] open-items insert failed:', itemsErr.message);
      const p = new URLSearchParams({ ok: 'saved', warn: 'items' });
      if (lang === 'es') p.set('lang', 'es');
      return redirect(`/admin/handoff?${p.toString()}`, 303);
    }
  }

  const p = new URLSearchParams({ ok: 'saved' });
  if (lang === 'es') p.set('lang', 'es');
  return redirect(`/admin/handoff?${p.toString()}`, 303);
};
