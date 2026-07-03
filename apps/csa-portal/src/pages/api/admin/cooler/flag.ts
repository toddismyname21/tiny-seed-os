/**
 * POST /api/admin/cooler/flag   (admin/staff only)
 *
 * ONE-TAP toggle of a pallet's 🔴 move-it flag (+ optional reason). This is the
 * signal that drives the top-of-page MOVE LIST and — later — the CSA-box-fill /
 * wholesale-availability hook (docs/COOLER_LAYOUT.md). Kept as its own fast path
 * so a crew member can flag "this is aging, move it forward" in a single tap.
 *
 * Body (multipart/form-data):
 *   - id             cooler_pallets UUID (required)
 *   - move_it        'true' | absent — the new flag state
 *   - move_it_reason 'aging'|'surplus'|'customer' (only stored when move_it on)
 *   - lang           'es' to preserve Spanish on the redirect (else English)
 *
 * On success: 303 → /admin/cooler?ok=flagged[&lang=es]
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

const MoveReason = z.enum(['aging', 'surplus', 'customer']);

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

  const move_it = String(form.get('move_it') ?? '') === 'true';
  // The reason is only meaningful (and only stored) when the flag is ON —
  // clearing the flag also clears any stale reason.
  const reasonParsed = MoveReason.safeParse(String(form.get('move_it_reason') ?? '').trim());
  const move_it_reason = move_it && reasonParsed.success ? reasonParsed.data : null;

  const { error } = await locals.supabase
    .from('cooler_pallets')
    .update({ move_it, move_it_reason, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'active');

  if (error) {
    console.error('[api/admin/cooler/flag] update failed:', error.message);
    return back(redirect, 'error', 'flag_failed', lang);
  }
  return back(redirect, 'ok', 'flagged', lang);
};
