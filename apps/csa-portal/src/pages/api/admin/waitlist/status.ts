/**
 * POST /api/admin/waitlist/status
 *
 * Move a waitlist signup along its lifecycle: new → contacted → converted /
 * archived (and reopen archived → new). PHASE 2 · WAVE 1 (proposal 2.2).
 *
 * Form body (multipart/form-data):
 *   - id      uuid of the waitlist_signups row (required)
 *   - status  one of new | contacted | converted | archived (required)
 *
 * On success: 303 → /admin/waitlist?ok=updated
 * On failure: 303 → /admin/waitlist?error=<code>
 *
 * Authorization (mirrors the other /api/admin/* mutations):
 *   1. isSameOriginPost() — CSRF (belt + suspenders to Astro's built-in).
 *   2. requireAdmin() — caller's customers.role ∈ ('admin','staff') → else 403.
 * The write runs through the cookie-aware RLS-scoped client; the table's
 * is_admin_caller() FOR ALL policy (migration 0070) lets it through.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';

export const prerender = false;

const REDIRECT = '/admin/waitlist';

const StatusSchema = z.enum(['new', 'contacted', 'converted', 'archived']);

function fail(
  redirect: (url: string, status: 303) => Response,
  code: string,
): Response {
  return redirect(`${REDIRECT}?error=${code}`, 303);
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return fail(redirect, 'invalid_input');
  }

  const id = String(formData.get('id') ?? '');
  if (!z.uuid().safeParse(id).success) {
    return fail(redirect, 'invalid_input');
  }

  const statusParsed = StatusSchema.safeParse(String(formData.get('status') ?? ''));
  if (!statusParsed.success) {
    return fail(redirect, 'invalid_input');
  }

  const { data, error } = await locals.supabase
    .from('waitlist_signups')
    .update({ status: statusParsed.data })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[api/admin/waitlist/status] update failed:', error.message);
    return fail(redirect, 'network');
  }
  if (!data) {
    // Row vanished (deleted between page load + click) — treat as a no-op.
    return redirect(`${REDIRECT}?ok=updated`, 303);
  }

  return redirect(`${REDIRECT}?ok=updated`, 303);
};
