/**
 * POST /api/admin/notices/[id]/done
 *
 * Mark a member notice fulfilled OR cancelled (the two terminal states the
 * admin Notices page offers per open notice).
 *
 * Form body (multipart/form-data):
 *   - action   'done' | 'cancel'  (whitelisted; default 'done')
 *
 * 'done'   → status='done',      fulfilled_by=<staff email>, fulfilled_at=now
 * 'cancel' → status='cancelled', fulfilled_by=<staff email>, fulfilled_at=now
 *            (we stamp who/when on cancel too, so the audit trail is complete —
 *             a cancelled promise is also "closed by" someone).
 *
 * On success: 303 → /admin/notices?ok=<done|cancelled>
 * On failure: 303 → /admin/notices?error=<code>
 *
 * Authorization (mirrors the other /api/admin/* mutations):
 *   1. isSameOriginPost() — CSRF (belt + suspenders to Astro's built-in).
 *   2. requireAdmin() — caller's customers.role ∈ ('admin','staff') → else 403.
 * The write runs through the cookie-aware RLS-scoped client; the table's
 * admin/staff ALL policy lets it through.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../../lib/onboarding';

export const prerender = false;

const REDIRECT = '/admin/notices';

function fail(redirect: (url: string, status: 303) => Response, code: string): Response {
  return redirect(`${REDIRECT}?error=${code}`, 303);
}

export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;
  const ctx = auth.ctx;

  const id = params.id ?? '';
  if (!z.uuid().safeParse(id).success) {
    return fail(redirect, 'invalid_input');
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return fail(redirect, 'invalid_input');
  }

  const action = String(formData.get('action') ?? 'done');
  if (action !== 'done' && action !== 'cancel') {
    return fail(redirect, 'invalid_input');
  }

  const status = action === 'cancel' ? 'cancelled' : 'done';
  const nowIso = new Date().toISOString();

  // Only flip a notice that's still OPEN — prevents a double-submit from
  // re-stamping an already-closed notice (idempotent on the happy path).
  const { data, error } = await locals.supabase
    .from('member_notices')
    .update({
      status,
      fulfilled_by: ctx.user.email ?? null,
      fulfilled_at: nowIso,
    })
    .eq('id', id)
    .eq('status', 'open')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error(`[api/admin/notices/done] ${action} failed:`, error.message);
    return fail(redirect, 'network');
  }
  if (!data) {
    // Notice didn't exist or was already closed — not an error worth alarming
    // the user; treat as a no-op success so a stale double-click is harmless.
    return redirect(`${REDIRECT}?ok=${status === 'cancelled' ? 'cancelled' : 'done'}`, 303);
  }

  return redirect(`${REDIRECT}?ok=${status === 'cancelled' ? 'cancelled' : 'done'}`, 303);
};
