/**
 * POST /api/onboarding/activate
 *
 * Final mutation: flips `members.status` from 'onboarding' → 'active'
 * for the current user's onboarding member row, then redirects to
 * `/dashboard?welcome=1` (which renders a one-time welcome banner).
 *
 * Guards:
 *   - Must be authenticated.
 *   - Must have a members row in 'onboarding' status.
 *   - Must have completed steps 3 + 4 (preferencesDone + contactDone).
 *
 * On success: 303 → /dashboard?welcome=1.
 * On guard failure: 303 → appropriate step.
 * On db failure: 303 → /onboarding/confirm?error=activation_failed.
 *
 * RLS: members_self_update policy (migration 0011) restricts the
 * UPDATE to rows owned by the authenticated user's customer_id, so
 * even if our application logic had a bug we couldn't activate
 * someone else's share.
 */
import type { APIRoute } from 'astro';
import {
  resolveOnboardingContext,
  isSameOriginPost,
  PORTAL_ORIGIN,
} from '../../../lib/onboarding';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }

  const user = locals.user;
  if (!user || !user.email) {
    return redirect('/login', 303);
  }

  const ctx = await resolveOnboardingContext(locals.supabase, user.email);
  if (!ctx) {
    // Already activated (no onboarding row remaining) — no-op success.
    return redirect('/dashboard', 303);
  }

  // Step ladder enforcement.
  if (!ctx.preferencesDone) return redirect('/onboarding/preferences', 303);
  if (!ctx.contactDone) return redirect('/onboarding/contact', 303);

  // Flip status to 'active'. RLS scopes the UPDATE to the user's
  // customer_id; the .eq('id', member_id) restricts further to this
  // particular share.
  const { error } = await locals.supabase
    .from('members')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', ctx.member.id);

  if (error) {
    console.error('[api/onboarding/activate] update failed:', error.message);
    return redirect('/onboarding/confirm?error=activation_failed', 303);
  }

  return redirect('/dashboard?welcome=1', 303);
};
