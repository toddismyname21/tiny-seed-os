/**
 * POST /api/admin/handoff/resolve-item   (admin/staff only)
 *
 * Mark ONE carry-forward open item resolved. This is the explicit read-side
 * action that stops an item from carrying forward onto every future day's
 * digest — the fix for the "carryforward zombie" anti-pattern (items are NEVER
 * auto-cleared; a person has to say "done").
 *
 * Body (multipart/form-data):
 *   - item_id   packhouse_open_items UUID (required)
 *   - lang      'es' to preserve Spanish on the redirect (else English)
 *
 * On success: 303 → /admin/handoff?ok=resolved[&lang=es]
 * On failure: 303 → /admin/handoff?error=<code>[&lang=es]
 *
 * Authorization: isSameOriginPost() + requireAdmin(). The UPDATE runs through
 * the cookie-aware RLS client (packhouse_open_items_staff = is_admin_caller).
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
  return redirect(`/admin/handoff?${p.toString()}`, 303);
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;
  const ctx = auth.ctx;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return back(redirect, 'error', 'invalid_input', 'en');
  }

  const lang = String(form.get('lang') ?? '') === 'es' ? 'es' : 'en';
  const item_id = String(form.get('item_id') ?? '').trim();
  if (!z.uuid().safeParse(item_id).success) {
    return back(redirect, 'error', 'invalid_input', lang);
  }

  // Only flip an item that's still OPEN — a double-submit re-stamping an already
  // resolved item is a harmless no-op (idempotent on the happy path).
  const { error } = await locals.supabase
    .from('packhouse_open_items')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: ctx.user.email ?? null,
    })
    .eq('id', item_id)
    .is('resolved_at', null);

  if (error) {
    console.error('[api/admin/handoff/resolve-item] update failed:', error.message);
    return back(redirect, 'error', 'resolve_failed', lang);
  }
  return back(redirect, 'ok', 'resolved', lang);
};
