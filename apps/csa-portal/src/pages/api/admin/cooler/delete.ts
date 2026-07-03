/**
 * POST /api/admin/cooler/delete   (admin/staff only)
 *
 * Hard-delete a pallet row — for one created in error (wrong destination, typo,
 * duplicate). A pallet that legitimately shipped/emptied should be retired via
 * out.ts (soft, keeps history); delete is for genuine mistakes. The page guards
 * this with a styled inline confirm (never native confirm()).
 *
 * Body (multipart/form-data):
 *   - id    cooler_pallets UUID (required)
 *   - lang  'es' to preserve Spanish on the redirect (else English)
 *
 * On success: 303 → /admin/cooler?ok=deleted[&lang=es]
 * On failure: 303 → /admin/cooler?error=<code>[&lang=es]
 *
 * Authorization: isSameOriginPost() + requireAdmin(). The DELETE runs through
 * the cookie-aware RLS client (cooler_pallets_staff = is_admin_caller).
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
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

  const { error } = await locals.supabase
    .from('cooler_pallets')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[api/admin/cooler/delete] delete failed:', error.message);
    return back(redirect, 'error', 'delete_failed', lang);
  }
  return back(redirect, 'ok', 'deleted', lang);
};
