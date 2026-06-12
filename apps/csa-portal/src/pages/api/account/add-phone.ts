/**
 * POST /api/account/add-phone
 *
 * The save path for the REQUIRED sign-in phone interstitial
 * (/account/add-phone). Todd directive (2026-06-08): every member MUST have
 * a valid US cell on file — we text them when their share arrives — so the
 * middleware gate forces members with no/invalid phone to the interstitial,
 * which posts here.
 *
 * This is a deliberately MINIMAL sibling of /api/account/profile: that
 * endpoint requires `contact_name` (it's the full profile form), which the
 * one-field interstitial doesn't collect — posting there would 303 back with
 * `name_required` and trap the member. So we keep the single-field save here,
 * reusing the SAME normalize/validate rules (lib/phone.ts) and the SAME
 * RLS-scoped, email-filtered update against `customers` (policy
 * customers_self_update, migration 0011 — a member can only touch their own
 * row, and email can't change).
 *
 * Body (application/x-www-form-urlencoded / multipart):
 *   - phone   String (required). Any common US format; normalized to 10
 *             digits before storage.
 *   - next    String (optional). The path the gate captured so we can
 *             return the member where they were headed. Must be a same-site
 *             absolute path ("/...") — anything else falls back to /dashboard.
 *
 * On success: 303 → <next> (sanitized) or /dashboard
 * On failure: 303 → /account/add-phone?error=<code>[&next=<next>]
 *
 * Mirrors the CSRF + auth contract of /api/account/profile.
 */
import type { APIRoute } from 'astro';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';
import { normalizeUSPhone } from '../../../lib/phone';

export const prerender = false;

/**
 * Sanitize the post-save redirect target. Only allow a same-site absolute
 * path (starts with "/" but not "//" — the latter is a protocol-relative
 * URL that could point off-site). Anything else → /dashboard.
 */
function safeNext(raw: string | null): string {
  if (!raw) return '/dashboard';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
  // Never bounce them straight back to the gate page or its API.
  if (raw === '/account/add-phone' || raw.startsWith('/account/add-phone')) {
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
    console.error('[api/account/add-phone] formData parse failed', e);
    return redirect('/account/add-phone?error=invalid_phone', 303);
  }

  const rawPhone = String(formData.get('phone') ?? '');
  const next = safeNext(
    typeof formData.get('next') === 'string' ? (formData.get('next') as string) : null
  );
  // Preserve `next` across a validation bounce so a typo doesn't lose the
  // member's intended destination.
  const nextQuery =
    next !== '/dashboard' ? `&next=${encodeURIComponent(next)}` : '';

  const normalized = normalizeUSPhone(rawPhone);
  if (!normalized) {
    return redirect(`/account/add-phone?error=invalid_phone${nextQuery}`, 303);
  }

  // RLS-scoped update, filtered by email → matches customers_self_update.
  // We store the normalized 10-digit form so every downstream consumer
  // (SMS sender, admin, read-side gate checks) sees one canonical shape.
  const { error } = await locals.supabase
    .from('customers')
    .update({ phone: normalized, updated_at: new Date().toISOString() })
    .eq('email', user.email);

  if (error) {
    console.error('[api/account/add-phone] update failed:', error.message);
    return redirect(`/account/add-phone?error=save_failed${nextQuery}`, 303);
  }

  return redirect(next, 303);
};
