/**
 * POST /api/account/confirm-pickup
 *
 * The save path for the REQUIRED pickup-acknowledgment interstitial
 * (/account/confirm-pickup). Todd directive (2026-06-08): every member MUST
 * confirm they understand WHERE/WHEN they pick up — middleware forces members
 * with customers.pickup_acknowledged_at IS NULL to the interstitial, which
 * posts here.
 *
 * Minimal sibling of /api/account/add-phone: it stamps
 * customers.pickup_acknowledged_at = now() via the SAME RLS-scoped,
 * email-filtered self-update (policy customers_self_update, migration 0011 — a
 * member can only touch their own row), then returns the member to `?next=`.
 *
 * Body (application/x-www-form-urlencoded / multipart):
 *   - ack    String. The acknowledgment checkbox value (must be present —
 *            the form marks it `required`; we also enforce server-side).
 *   - next   String (optional). The path the gate captured. Must be a
 *            same-site absolute path ("/...") — anything else → /dashboard.
 *
 * On success: 303 → <next> (sanitized) or /dashboard
 * On failure: 303 → /account/confirm-pickup?error=save_failed[&next=<next>]
 *
 * Mirrors the CSRF + auth contract of /api/account/add-phone.
 */
import type { APIRoute } from 'astro';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';

export const prerender = false;

/**
 * Sanitize the post-save redirect target. Only allow a same-site absolute
 * path (starts with "/" but not "//"). Never bounce back to the gate page.
 */
function safeNext(raw: string | null): string {
  if (!raw) return '/dashboard';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
  if (raw === '/account/confirm-pickup' || raw.startsWith('/account/confirm-pickup')) {
    return '/dashboard';
  }
  return raw;
}

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
    console.error('[api/account/confirm-pickup] formData parse failed', e);
    return redirect('/account/confirm-pickup?error=save_failed', 303);
  }

  const next = safeNext(
    typeof formData.get('next') === 'string' ? (formData.get('next') as string) : null
  );
  const nextQuery =
    next !== '/dashboard' ? `&next=${encodeURIComponent(next)}` : '';

  // The acknowledgment must be explicitly checked. The interstitial marks the
  // checkbox `required`, but we enforce it server-side too so a hand-rolled
  // POST can't silently clear the gate without acknowledging.
  const ack = formData.get('ack');
  if (!ack) {
    return redirect(`/account/confirm-pickup?error=save_failed${nextQuery}`, 303);
  }

  // RLS-scoped update, filtered by email → matches customers_self_update.
  const { error } = await locals.supabase
    .from('customers')
    .update({
      pickup_acknowledged_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('email', user.email);

  if (error) {
    console.error('[api/account/confirm-pickup] update failed:', error.message);
    return redirect(`/account/confirm-pickup?error=save_failed${nextQuery}`, 303);
  }

  return redirect(next, 303);
};
