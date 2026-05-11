/**
 * POST /api/admin/members/[id]/flex-credit
 *
 * Form body:
 *   - amount  decimal > 0 and ≤ 10000 (USD)
 *   - reason  optional string ≤ 200 chars
 *
 * Inserts a row into flex_transactions with type='credit'. The
 * member's balance is computed from the ledger view
 * member_flex_balance — no separate column update needed.
 *
 * Audit: the audit_log trigger on customers/members/preferences fires
 * for those tables. flex_transactions is append-only (no trigger), so
 * we record admin_email INLINE on the row itself so future-Todd can
 * see which admin issued the credit.
 *
 * On success: 303 → /admin/members/[id]?ok=flex_credited
 * On failure: 303 → /admin/members/[id]?error=<code>
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdmin } from '../../../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../../../lib/onboarding';

export const prerender = false;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const Body = z.object({
  amount: z.number().positive().max(10_000),
  reason: z.string().max(200).nullable(),
});

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

  const amountStr = String(formData.get('amount') ?? '');
  const amount = Number.parseFloat(amountStr);
  const reasonRaw = String(formData.get('reason') ?? '').trim();
  const reason = reasonRaw.length === 0 ? null : reasonRaw;

  const parsed = Body.safeParse({ amount, reason });
  if (!parsed.success) {
    return redirect(`/admin/members/${memberId}?error=invalid_input`, 303);
  }

  // Look up the member's customer email — flex_transactions requires
  // it (denormalized so deleting a member doesn't orphan the ledger).
  type MemberLookup = { customer: { email: string } | null };
  const { data: memberRow, error: lookupErr } = await locals.supabase
    .from('members')
    .select('customer:customers!inner(email)')
    .eq('id', memberId)
    .maybeSingle()
    .overrideTypes<MemberLookup, { merge: false }>();

  if (lookupErr || !memberRow || !memberRow.customer?.email) {
    return redirect(`/admin/members/${memberId}?error=member_not_found`, 303);
  }

  const adminEmail = auth.ctx!.user.email!;

  const { error } = await locals.supabase
    .from('flex_transactions')
    .insert({
      member_id: memberId,
      email: memberRow.customer.email,
      type: 'credit',
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      admin_email: adminEmail,
    });

  if (error) {
    console.error('[api/admin/members/flex-credit] insert failed:', error.message);
    return redirect(`/admin/members/${memberId}?error=invalid_input`, 303);
  }

  return redirect(`/admin/members/${memberId}?ok=flex_credited`, 303);
};
