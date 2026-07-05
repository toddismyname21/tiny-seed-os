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
 * the auth'd member). We update ONLY the auth'd customer's BIWEEKLY-cadence
 * member rows (cadence='biweekly', migration 0073). A mixed household with a
 * WEEKLY share + a BIWEEKLY share must keep the weekly share weekly — the
 * old code stamped the chosen A/B parity onto EVERY live row, which turned
 * the household's weekly share into a half-frequency biweekly one (bug d, two
 * Shopify-proven live cases). The members_self_write RLS policy lets the
 * auth'd member update their own rows.
 *
 * Never changes cadence itself — cadence is purchase-defined and admin-only.
 * This endpoint only assigns the A/B parity of an already-biweekly share.
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

  // ─── Find every LIVE BIWEEKLY-cadence member row for this customer ─
  // We update ONLY cadence='biweekly' rows (migration 0073) so a mixed
  // household (e.g. weekly Flower + biweekly Veg) keeps its WEEKLY share
  // weekly. A weekly-only customer matches zero rows here → the picker page
  // never even offers the form to them (it shows the "every week" info
  // state), so this is defense in depth. RLS (members_self_*) restricts the
  // SELECT to the auth'd customer's own rows.
  type MemberStub = { id: string };
  const { data: memberRows, error: fetchErr } = await locals.supabase
    .from('members')
    .select('id')
    .in('status', ['active', 'paused', 'onboarding'])
    .eq('cadence', 'biweekly')
    .overrideTypes<MemberStub[], { merge: false }>();

  if (fetchErr) {
    console.error('[api/account/biweekly-schedule] member fetch failed:', fetchErr.message);
    return redirect('/account/biweekly-schedule?error=invalid_input', 303);
  }

  const memberIds = (memberRows ?? []).map((m) => m.id);

  // No live BIWEEKLY shares — nothing to assign (a weekly-only member has no
  // A/B to pick). 303-back with a clear code; the page renders the "you get a
  // box every week" info state instead of the picker.
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
