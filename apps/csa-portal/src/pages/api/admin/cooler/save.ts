/**
 * POST /api/admin/cooler/save   (admin/staff only)
 *
 * Create a NEW cooler pallet, or UPDATE an existing one when `id` is present.
 * A pallet is one LOGICAL destination (a market / a wholesale order / CSA /
 * other) — see docs/COOLER_LAYOUT.md. This is the "full edit" path (label +
 * type + zone + date + move-it + reason + notes); the one-tap fast paths live in
 * move.ts / flag.ts / out.ts so a gloved crew member can restage or retire a
 * pallet in a single POST without re-submitting the whole form.
 *
 * Body (multipart/form-data):
 *   id             cooler_pallets UUID — present → UPDATE, absent → INSERT
 *   label          destination name (required, ≤120)
 *   pallet_type    'market'|'wholesale'|'csa'|'other' (required)
 *   zone           'ph_accessible'|'ph_far'|'barn'|'van_overflow' (default ph_accessible)
 *   date_in        YYYY-MM-DD (optional; default today ET on insert)
 *   move_it        'true' | absent
 *   move_it_reason 'aging'|'surplus'|'customer' (kept only when move_it is on)
 *   notes          free text (≤2000)
 *   lang           'es' to preserve Spanish on the redirect (else English)
 *
 * On success: 303 → /admin/cooler?ok=saved[&lang=es]
 * On failure: 303 → /admin/cooler?error=<code>[&lang=es]
 *
 * Authorization (mirrors every other /api/admin/* mutation):
 *   1. isSameOriginPost() — CSRF belt-and-suspenders.
 *   2. requireAdmin() — customers.role ∈ ('admin','staff') → else 403.
 * The write runs through the cookie-aware RLS client; the table's admin/staff
 * FOR ALL policy (is_admin_caller) lets it through.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';
import { todayET } from '../../../../lib/delivery';

export const prerender = false;

const YMD = /^\d{4}-\d{2}-\d{2}$/;

const PalletType = z.enum(['market', 'wholesale', 'csa', 'other']);
const Zone = z.enum(['ph_accessible', 'ph_far', 'barn', 'van_overflow']);
const MoveReason = z.enum(['aging', 'surplus', 'customer']);

/** Trim a form value to a non-empty string capped at `max`, or null. */
function strOrNull(v: FormDataEntryValue | null, max = 4000): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  if (s.length === 0) return null;
  return s.slice(0, max);
}

function back(
  redirect: (url: string, status: 303) => Response,
  key: 'ok' | 'error',
  val: string,
  lang: string,
): Response {
  const p = new URLSearchParams({ [key]: val });
  if (lang === 'es') p.set('lang', 'es');
  return redirect(`/admin/cooler?${p.toString()}`, 303);
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
    return back(redirect, 'error', 'invalid_input', 'en');
  }

  const lang = String(form.get('lang') ?? '') === 'es' ? 'es' : 'en';

  // id present → update path. Must be a valid UUID if supplied at all.
  const idRaw = String(form.get('id') ?? '').trim();
  const isUpdate = idRaw.length > 0;
  if (isUpdate && !z.uuid().safeParse(idRaw).success) {
    return back(redirect, 'error', 'invalid_input', lang);
  }

  // Required: a non-empty label + a known pallet_type.
  const label = strOrNull(form.get('label'), 120);
  if (!label) return back(redirect, 'error', 'invalid_label', lang);

  const typeParsed = PalletType.safeParse(String(form.get('pallet_type') ?? '').trim());
  if (!typeParsed.success) return back(redirect, 'error', 'invalid_type', lang);

  // Zone defaults to ph_accessible if blank/unknown.
  const zoneParsed = Zone.safeParse(String(form.get('zone') ?? '').trim());
  const zone = zoneParsed.success ? zoneParsed.data : 'ph_accessible';

  // date_in: use the supplied YYYY-MM-DD if valid, else today ET (insert path).
  const dateRaw = String(form.get('date_in') ?? '').trim();
  const date_in = YMD.test(dateRaw) ? dateRaw : todayET();

  // move-it flag; the reason is only meaningful (and only stored) when flagged.
  const move_it = String(form.get('move_it') ?? '') === 'true';
  const reasonParsed = MoveReason.safeParse(String(form.get('move_it_reason') ?? '').trim());
  const move_it_reason = move_it && reasonParsed.success ? reasonParsed.data : null;

  const notes = strOrNull(form.get('notes'), 2000);

  if (isUpdate) {
    const { error } = await locals.supabase
      .from('cooler_pallets')
      .update({
        label,
        pallet_type: typeParsed.data,
        zone,
        date_in,
        move_it,
        move_it_reason,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', idRaw);
    if (error) {
      console.error('[api/admin/cooler/save] update failed:', error.message);
      return back(redirect, 'error', 'save_failed', lang);
    }
    return back(redirect, 'ok', 'saved', lang);
  }

  const { error } = await locals.supabase
    .from('cooler_pallets')
    .insert({
      label,
      pallet_type: typeParsed.data,
      zone,
      date_in,
      move_it,
      move_it_reason,
      notes,
    });
  if (error) {
    console.error('[api/admin/cooler/save] insert failed:', error.message);
    return back(redirect, 'error', 'save_failed', lang);
  }
  return back(redirect, 'ok', 'added', lang);
};
