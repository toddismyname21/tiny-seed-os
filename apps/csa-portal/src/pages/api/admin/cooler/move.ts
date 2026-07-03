/**
 * POST /api/admin/cooler/move   (admin/staff only)
 *
 * ONE-TAP zone change — the board's primary restage action. A gloved crew
 * member taps a zone button on a pallet and it moves; no form re-submit. The
 * board is a MOVE LIST (docs/COOLER_LAYOUT.md), so this fast path must stay
 * snappy: validate the id + the target zone, UPDATE, redirect back.
 *
 * Body (multipart/form-data):
 *   - id    cooler_pallets UUID (required)
 *   - zone  'ph_accessible'|'ph_far'|'barn'|'van_overflow' (required)
 *   - lang  'es' to preserve Spanish on the redirect (else English)
 *
 * On success: 303 → /admin/cooler?ok=moved[&lang=es]
 * On failure: 303 → /admin/cooler?error=<code>[&lang=es]
 *
 * Authorization: isSameOriginPost() + requireAdmin(). The UPDATE runs through
 * the cookie-aware RLS client (cooler_pallets_staff = is_admin_caller).
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';

export const prerender = false;

const Zone = z.enum(['ph_accessible', 'ph_far', 'barn', 'van_overflow']);

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
  const id = String(form.get('id') ?? '').trim();
  if (!z.uuid().safeParse(id).success) {
    return back(redirect, 'error', 'invalid_input', lang);
  }
  const zoneParsed = Zone.safeParse(String(form.get('zone') ?? '').trim());
  if (!zoneParsed.success) {
    return back(redirect, 'error', 'invalid_zone', lang);
  }

  // Only restage ACTIVE pallets — moving a retired ('out') pallet is a no-op.
  const { error } = await locals.supabase
    .from('cooler_pallets')
    .update({ zone: zoneParsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'active');

  if (error) {
    console.error('[api/admin/cooler/move] update failed:', error.message);
    return back(redirect, 'error', 'move_failed', lang);
  }
  return back(redirect, 'ok', 'moved', lang);
};
