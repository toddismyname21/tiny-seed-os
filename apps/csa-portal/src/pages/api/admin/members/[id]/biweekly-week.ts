/**
 * POST /api/admin/members/[id]/biweekly-week
 *
 * Cadence-aware member schedule control (migration 0073). Admin is the
 * authority for cadence AND parity, so this ONE endpoint writes both
 * `cadence` and `biweekly_week` consistently.
 *
 * Form body (multipart/form-data):
 *   - schedule   one of:
 *       'weekly'                → cadence='weekly',   biweekly_week=NULL
 *       'biweekly_a'            → cadence='biweekly',  biweekly_week='A'
 *       'biweekly_b'            → cadence='biweekly',  biweekly_week='B'
 *       'biweekly_unassigned'   → cadence='biweekly',  biweekly_week=NULL
 *
 *   Legacy compatibility: the old field name `biweekly_week` with values
 *   'A' | 'B' | 'unassigned' is still accepted and mapped to the biweekly
 *   cadence (A→biweekly_a, B→biweekly_b, unassigned→biweekly_unassigned) so
 *   any un-updated caller keeps working.
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
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../../lib/onboarding';

export const prerender = false;

/** The cadence-aware control's values, plus the legacy biweekly_week values. */
const Body = z.object({
  schedule: z.enum([
    'weekly',
    'biweekly_a',
    'biweekly_b',
    'biweekly_unassigned',
    // Legacy field values (mapped below):
    'A',
    'B',
    'unassigned',
  ], { message: 'invalid_input' }),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Map a submitted schedule value → the (cadence, biweekly_week) tuple. */
function toColumns(
  value: z.infer<typeof Body>['schedule'],
): { cadence: 'weekly' | 'biweekly'; biweekly_week: 'A' | 'B' | null } {
  switch (value) {
    case 'weekly':
      return { cadence: 'weekly', biweekly_week: null };
    case 'biweekly_a':
    case 'A':
      return { cadence: 'biweekly', biweekly_week: 'A' };
    case 'biweekly_b':
    case 'B':
      return { cadence: 'biweekly', biweekly_week: 'B' };
    case 'biweekly_unassigned':
    case 'unassigned':
    default:
      return { cadence: 'biweekly', biweekly_week: null };
  }
}

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
  // Accept the new `schedule` field first; fall back to the legacy
  // `biweekly_week` field so an un-updated form still submits.
  const raw = String(formData.get('schedule') ?? formData.get('biweekly_week') ?? '');

  const parsed = Body.safeParse({ schedule: raw });
  if (!parsed.success) {
    return redirect(`/admin/members/${memberId}?error=invalid_input`, 303);
  }

  const { cadence, biweekly_week } = toColumns(parsed.data.schedule);

  const { error } = await locals.supabase
    .from('members')
    .update({ cadence, biweekly_week, updated_at: new Date().toISOString() })
    .eq('id', memberId);

  if (error) {
    console.error('[api/admin/members/biweekly-week] update failed:', error.message);
    return redirect(`/admin/members/${memberId}?error=invalid_input`, 303);
  }

  return redirect(`/admin/members/${memberId}?ok=biweekly_week_updated`, 303);
};
