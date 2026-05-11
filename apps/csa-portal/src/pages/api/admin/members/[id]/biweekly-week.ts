/**
 * POST /api/admin/members/[id]/biweekly-week
 *
 * Form body (multipart/form-data):
 *   - biweekly_week   one of: 'A' | 'B' | 'unassigned'
 *                     'unassigned' clears the field (sets NULL).
 *
 * On success: 303 → /admin/members/[id]?ok=biweekly_week_updated
 * On failure: 303 → /admin/members/[id]?error=<code>
 *
 * Authorization:
 *   1. requireAdmin() — verifies the calling JWT email maps to a
 *      customers row with role in ('admin','staff'). Returns 403 if not.
 *   2. CSRF: isSameOriginPost(). Belt + suspenders to Astro's built-in.
 *
 * The mutation uses the cookie-aware client so the audit_log trigger
 * captures Todd's email as changed_by_email (same pattern as
 * /api/admin/members/[id]/status). The admin_all_members RLS policy
 * from migration 0017 allows the write.
 *
 * Why: After migration 0018, biweekly_week is TEXT ('A' | 'B' | NULL).
 * Every CSA member is bi-weekly; the admin uses this endpoint to assign
 * each member to their pickup week as they come through.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../../lib/onboarding';

export const prerender = false;

const Body = z.object({
  biweekly_week: z.enum(['A', 'B', 'unassigned'], { message: 'invalid_input' }),
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
  const raw = String(formData.get('biweekly_week') ?? '');

  const parsed = Body.safeParse({ biweekly_week: raw });
  if (!parsed.success) {
    return redirect(`/admin/members/${memberId}?error=invalid_input`, 303);
  }

  // Translate UI value ('unassigned') into DB value (NULL).
  const dbValue: 'A' | 'B' | null =
    parsed.data.biweekly_week === 'unassigned' ? null : parsed.data.biweekly_week;

  const { error } = await locals.supabase
    .from('members')
    .update({ biweekly_week: dbValue, updated_at: new Date().toISOString() })
    .eq('id', memberId);

  if (error) {
    console.error('[api/admin/members/biweekly-week] update failed:', error.message);
    return redirect(`/admin/members/${memberId}?error=invalid_input`, 303);
  }

  return redirect(`/admin/members/${memberId}?ok=biweekly_week_updated`, 303);
};
