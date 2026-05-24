/**
 * POST /api/admin/members/[id]/comms
 *
 * Logs ONE human interaction (call / text / email reply / note) against a
 * member's record. This is what guarantees no conversation gets lost: the
 * next person to talk to the member sees the full history on the
 * member-detail page.
 *
 * The URL [id] is the MEMBER id (matching the rest of /admin/members/*),
 * but member_comms keys on CUSTOMER id (the person, so the log spans
 * seasons). So we resolve the member → its customer_id before inserting.
 *
 * Form body:
 *   - channel  one of email | phone | text | note | other (default note)
 *   - summary  1-2000 chars (the note itself)
 *
 * Security:
 *   - isSameOriginPost CSRF gate (mirrors every admin API route).
 *   - requireAdmin: caller must map to a customers row with role
 *     admin/staff. The insert then goes through the cookie-aware
 *     (RLS-scoped) client, so the row is written under the
 *     admin_all_member_comms policy (is_admin_caller()) — defense in
 *     depth: even if the app check were bypassed, RLS would reject a
 *     non-admin write.
 *   - author_email is set server-side to the logged-in admin/staff email
 *     (locals.user.email) — never trusted from the form.
 *
 * On success: 303 → /admin/members/[id]?ok=logged
 * On failure: 303 → /admin/members/[id]?error=<code>
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../../lib/onboarding';

export const prerender = false;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const Body = z.object({
  channel: z.enum(['email', 'phone', 'text', 'note', 'other']),
  summary: z.string().trim().min(1, 'A summary is required.').max(2000),
});

export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  // CSRF: same-origin POSTs only.
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  // AuthZ: caller must be admin or staff.
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

  const parsed = Body.safeParse({
    channel: String(formData.get('channel') ?? ''),
    summary: String(formData.get('summary') ?? ''),
  });
  if (!parsed.success) {
    return redirect(`/admin/members/${memberId}?error=invalid_input`, 303);
  }

  // Resolve member → customer_id (member_comms keys on the customer).
  type MemberLookup = { customer_id: string };
  const { data: memberRow, error: lookupErr } = await locals.supabase
    .from('members')
    .select('customer_id')
    .eq('id', memberId)
    .maybeSingle()
    .overrideTypes<MemberLookup, { merge: false }>();

  if (lookupErr || !memberRow?.customer_id) {
    return redirect(`/admin/members/${memberId}?error=member_not_found`, 303);
  }

  // author_email comes from the verified session, NEVER the form.
  const authorEmail = locals.user?.email ?? auth.ctx!.user.email ?? null;

  const { error } = await locals.supabase.from('member_comms').insert({
    customer_id: memberRow.customer_id,
    author_email: authorEmail,
    channel: parsed.data.channel,
    summary: parsed.data.summary,
  });

  if (error) {
    console.error('[api/admin/members/comms] insert failed:', error.message);
    return redirect(`/admin/members/${memberId}?error=invalid_input`, 303);
  }

  return redirect(`/admin/members/${memberId}?ok=logged`, 303);
};
