/**
 * POST /api/admin/crew/remove   (admin/staff — requireAdmin)
 *
 * Revoke a crew member's access. Guarded so it can NEVER nuke a real account:
 *   - the target row MUST have role='crew' (else 409 — we refuse to touch an
 *     admin / staff / member row).
 *   - if that crew row has ANY history (a members row or total_orders > 0) we
 *     DOWNGRADE role→'member' (preserve the customer + their history).
 *   - only a clean crew-only row (no members, no orders — i.e. one this invite
 *     flow created) is DELETED, so the same email can be re-invited later.
 *
 * Body (application/json): { customer_id: string (uuid) }
 *
 * Returns JSON: { ok: true, note } | { ok: false, error }
 *
 * Authorization: isSameOriginPost() (CSRF) + requireAdmin() (admin/staff only).
 * Writes run through the cookie-aware RLS client (admin_all_customers, 0017).
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../lib/onboarding';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const RemoveSchema = z.object({
  customer_id: z.uuid('Invalid id.'),
});

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid request body.' }, 400);
  }

  const parsed = RemoveSchema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }, 400);
  }
  const id = parsed.data.customer_id;

  // Load the target. Only a role='crew' row may be removed.
  const { data: row, error: lookupErr } = await locals.supabase
    .from('customers')
    .select('id, role, total_orders')
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<
      { id: string; role: 'member' | 'admin' | 'staff' | 'crew'; total_orders: number | null },
      { merge: false }
    >();

  if (lookupErr) {
    console.error('[api/admin/crew/remove] lookup failed:', lookupErr.message);
    return json({ ok: false, error: 'Could not load that account.' }, 500);
  }
  if (!row) {
    return json({ ok: false, error: 'That crew member no longer exists.' }, 404);
  }
  if (row.role !== 'crew') {
    // Defense in depth: never modify a real member/admin/staff account here.
    return json({ ok: false, error: 'That account is not a crew member and was not changed.' }, 409);
  }

  // Does this row carry any history worth preserving?
  const { count: memberCount, error: countErr } = await locals.supabase
    .from('members')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', id);

  if (countErr) {
    console.error('[api/admin/crew/remove] member-count failed:', countErr.message);
    return json({ ok: false, error: 'Could not verify that account. Try again.' }, 500);
  }

  const hasHistory = (memberCount ?? 0) > 0 || (row.total_orders ?? 0) > 0;

  if (hasHistory) {
    // Preserve the customer + history — just strip crew access.
    const { error: updErr } = await locals.supabase
      .from('customers')
      .update({ role: 'member' })
      .eq('id', id)
      .eq('role', 'crew'); // belt-and-suspenders: only act on a still-crew row
    if (updErr) {
      console.error('[api/admin/crew/remove] downgrade failed:', updErr.message);
      return json({ ok: false, error: 'Could not remove crew access.' }, 500);
    }
    return json({ ok: true, note: 'Crew access revoked. The account was kept because it has history.' });
  }

  // Clean crew-only row → delete so the email can be re-invited later.
  const { error: delErr } = await locals.supabase
    .from('customers')
    .delete()
    .eq('id', id)
    .eq('role', 'crew');
  if (delErr) {
    console.error('[api/admin/crew/remove] delete failed:', delErr.message);
    return json({ ok: false, error: 'Could not remove that crew member.' }, 500);
  }
  return json({ ok: true, note: 'Crew member removed.' });
};
