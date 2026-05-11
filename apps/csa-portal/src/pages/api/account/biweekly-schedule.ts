/**
 * POST /api/account/biweekly-schedule
 *
 * Member self-service: pick Week A, Week B, or "no preference".
 *
 * Form body (multipart/form-data):
 *   - week    one of: 'A' | 'B' | 'unassigned'
 *             'unassigned' clears the schedule (sets NULL) — the
 *             admin's auto-assign run will pick a week for the member.
 *
 * On success: 303 → /account/biweekly-schedule?ok=saved
 * On failure: 303 → /account/biweekly-schedule?error=<code>
 *
 * Auth: middleware sets locals.user + locals.supabase (RLS-scoped to
 * the auth'd member). We update EVERY live member row tied to that
 * customer — if Todd has Summer Veg + Flower, both should follow the
 * same Week A/B schedule. The members_self_write RLS policy lets the
 * auth'd member update their own rows.
 *
 * Why no separate "preference" column: members.biweekly_week IS the
 * assignment. When a member chooses Week A via this endpoint, they're
 * assigned to Week A — there's no soft-preference / hard-assignment
 * split. If admin needs to override later, they use
 * /api/admin/members/[id]/biweekly-week.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';

export const prerender = false;

const Body = z.object({
  week: z.enum(['A', 'B', 'unassigned'], { message: 'invalid_input' }),
});

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  const user = locals.user;
  if (!user || !user.email) {
    return redirect('/login', 303);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (e) {
    console.error('[api/account/biweekly-schedule] formData parse failed', e);
    return redirect('/account/biweekly-schedule?error=invalid_input', 303);
  }

  const raw = String(formData.get('week') ?? '');
  const parsed = Body.safeParse({ week: raw });
  if (!parsed.success) {
    return redirect('/account/biweekly-schedule?error=invalid_input', 303);
  }

  // Translate UI value into DB value.
  const dbValue: 'A' | 'B' | null =
    parsed.data.week === 'unassigned' ? null : parsed.data.week;

  // ─── Find every LIVE member row for this customer ────────────────
  // We update ALL active/paused/onboarding rows so a multi-share
  // customer (Summer Veg + Flower) stays on a single schedule. RLS
  // (members_self_*) restricts the SELECT to the auth'd customer's
  // own rows.
  type MemberStub = { id: string };
  const { data: memberRows, error: fetchErr } = await locals.supabase
    .from('members')
    .select('id')
    .in('status', ['active', 'paused', 'onboarding'])
    .overrideTypes<MemberStub[], { merge: false }>();

  if (fetchErr) {
    console.error('[api/account/biweekly-schedule] member fetch failed:', fetchErr.message);
    return redirect('/account/biweekly-schedule?error=invalid_input', 303);
  }

  const memberIds = (memberRows ?? []).map((m) => m.id);

  // No live shares — nothing to update. Still 303-back-to-OK so the
  // page renders a clean state; the page itself will show the "no
  // active share" empty state.
  if (memberIds.length === 0) {
    return redirect('/account/biweekly-schedule?error=no_active_share', 303);
  }

  // ─── Update every live row in one statement ──────────────────────
  // RLS scopes the WHERE clause to the auth'd customer's rows — even
  // if memberIds somehow contained foreign rows, the policy would
  // block them. Belt + suspenders.
  const { error: updateErr } = await locals.supabase
    .from('members')
    .update({ biweekly_week: dbValue, updated_at: new Date().toISOString() })
    .in('id', memberIds);

  if (updateErr) {
    console.error('[api/account/biweekly-schedule] update failed:', updateErr.message);
    return redirect('/account/biweekly-schedule?error=invalid_input', 303);
  }

  return redirect('/account/biweekly-schedule?ok=saved', 303);
};
