/**
 * POST /api/admin/cooler/retire   (admin/staff/crew — pack-house ops, migration 0068)
 *
 * Retire a pallet — it shipped out to its market/order or was emptied. Sets
 * status='out' and stamps out_at, which removes it from the board + the move
 * list (both scan status='active' only). This is a soft retire, NOT a delete:
 * the row survives for history / a future report. Use delete.ts to remove a row
 * created in error.
 *
 * Body (multipart/form-data):
 *   - id    cooler_pallets UUID (required)
 *   - lang  'es' to preserve Spanish on the redirect (else English)
 *
 * On success: 303 → /admin/cooler?ok=out[&lang=es]
 * On failure: 303 → /admin/cooler?error=<code>[&lang=es]
 *
 * Authorization: isSameOriginPost() + requireCrew() (admin/staff/crew). The UPDATE runs through
 * the cookie-aware RLS client (cooler_pallets_staff = is_admin_caller).
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireCrew } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';

export const prerender = false;

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
  const auth = await requireCrew(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return back(redirect, 'error', 'invalid_input', 'en');
  }

  const lang = String(form.get('lang') ?? '') === 'es' ? 'es' : 'en';
  const id = String(form.get('id') ?? '').trim();
  if (!z.uuid().safeParse(id).success) {
    return back(redirect, 'error', 'invalid_input', lang);
  }

  // Only flip an ACTIVE pallet — a double-submit retiring an already-out pallet
  // is a harmless no-op (idempotent on the happy path).
  const { error } = await locals.supabase
    .from('cooler_pallets')
    .update({
      status: 'out',
      out_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'active');

  if (error) {
    console.error('[api/admin/cooler/retire] update failed:', error.message);
    return back(redirect, 'error', 'out_failed', lang);
  }
  return back(redirect, 'ok', 'out', lang);
};
