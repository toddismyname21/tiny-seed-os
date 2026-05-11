/**
 * POST /api/admin/members/[id]/status
 *
 * Form body (multipart/form-data):
 *   - status   one of: active|paused|onboarding|pending|cancelled|lapsed|expired|inactive
 *
 * On success: 303 → /admin/members/[id]?ok=status_updated
 * On failure: 303 → /admin/members/[id]?error=<code>
 *
 * Authorization:
 *   1. requireAdmin() — verifies the calling JWT email maps to a
 *      customers row with role in ('admin','staff'). Returns 403 if not.
 *   2. CSRF: isSameOriginPost(). Belt + suspenders to Astro's built-in.
 *
 * The mutation uses supabaseAdmin so RLS doesn't block writes to
 * member rows the admin doesn't own. The audit_log trigger captures
 * the before/after diff with the admin's auth.uid() / email since the
 * admin is the authenticated user even though we use the service
 * role for the write itself. Wait — actually `auth.uid()` returns
 * NULL when using service_role. We've been audit-logging with NULL
 * for admin writes in the existing routes too. Acceptable for Day 10;
 * we can revisit by routing admin writes through the cookie-aware
 * client (which we now CAN do thanks to the admin_all_members RLS
 * policy from migration 0017). Doing that here.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../../lib/onboarding';

export const prerender = false;

const STATUSES = [
  'active', 'paused', 'onboarding', 'pending',
  'cancelled', 'lapsed', 'expired', 'inactive',
] as const;

const Body = z.object({
  status: z.enum(STATUSES, { message: 'invalid_input' }),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  const memberId = params.id ?? '';
  if (!UUID_RE.test(memberId)) {
    return redirect('/admin/members?error=invalid_input', 303);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return redirect(`/admin/members/${memberId}?error=invalid_input`, 303);
  }
  const status = String(formData.get('status') ?? '');

  const parsed = Body.safeParse({ status });
  if (!parsed.success) {
    return redirect(`/admin/members/${memberId}?error=invalid_input`, 303);
  }

  // Use the cookie-aware (admin-authorized) client so the audit trigger
  // captures Todd's email as changed_by_email. The admin_all_members
  // RLS policy from migration 0017 lets this through.
  const { error } = await locals.supabase
    .from('members')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('id', memberId);

  if (error) {
    console.error('[api/admin/members/status] update failed:', error.message);
    return redirect(`/admin/members/${memberId}?error=invalid_input`, 303);
  }

  return redirect(`/admin/members/${memberId}?ok=status_updated`, 303);
};
