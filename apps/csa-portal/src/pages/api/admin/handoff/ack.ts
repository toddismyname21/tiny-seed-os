/**
 * POST /api/admin/handoff/ack   (admin/staff/crew — pack-house ops, migration 0068)
 *
 * Stamp the incoming person's read-receipt on a handoff (read_by / read_at) —
 * the I-PASS "synthesis by receiver" step adapted for async use. The read side
 * shows "read by <who> at <when>", which both closes the loop for the incoming
 * crew and gives the outgoing crew the feedback that their handoff was seen
 * (the motivation loop that sustains fill-out; anti-pattern AP-9).
 *
 * Body (multipart/form-data):
 *   - handoff_id  packhouse_handoff UUID (required)
 *   - lang        'es' to preserve Spanish on the redirect (else English)
 *
 * On success: 303 → /admin/handoff?ok=acked[&lang=es]
 * On failure: 303 → /admin/handoff?error=<code>[&lang=es]
 *
 * Authorization: isSameOriginPost() + requireCrew() (admin/staff/crew). The UPDATE runs through
 * the cookie-aware RLS client (packhouse_handoff_staff = is_admin_caller).
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
  return redirect(`/admin/handoff?${p.toString()}`, 303);
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
    return back(redirect, 'error', 'invalid_input', 'en');
  }

  const lang = String(form.get('lang') ?? '') === 'es' ? 'es' : 'en';
  const handoff_id = String(form.get('handoff_id') ?? '').trim();
  if (!z.uuid().safeParse(handoff_id).success) {
    return back(redirect, 'error', 'invalid_input', lang);
  }

  const { error } = await locals.supabase
    .from('packhouse_handoff')
    .update({
      read_by: ctx.user.email ?? null,
      read_at: new Date().toISOString(),
    })
    .eq('id', handoff_id);

  if (error) {
    console.error('[api/admin/handoff/ack] update failed:', error.message);
    return back(redirect, 'error', 'ack_failed', lang);
  }
  return back(redirect, 'ok', 'acked', lang);
};
