/**
 * /auth/callback — Supabase Auth magic-link landing endpoint.
 *
 * When a user clicks the link in their email, Supabase redirects them
 * here with `?code=<pkce_code>&next=<intended_path>`. We exchange the
 * code for a session via `supabase.auth.exchangeCodeForSession`, which
 * sets the access + refresh token cookies on the response.
 *
 * Then we redirect the user to `next` (sanitized) or `/dashboard`.
 *
 * Failure modes:
 *   - missing/invalid code        → /login?error=invalid_link
 *   - exchange returns an error   → /login?error=callback_failed
 */
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../lib/supabase';

// Server-only endpoint. No prerendering.
export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, url, redirect }) => {
  const code = url.searchParams.get('code');
  const errorDesc = url.searchParams.get('error_description') ?? url.searchParams.get('error');

  // Sanitize `next` to a same-origin path. Reject absolute URLs and
  // protocol-relative URLs to prevent open-redirect via an attacker
  // crafting `?next=//evil.example.com`.
  const nextRaw = url.searchParams.get('next') ?? '/dashboard';
  const isSafeNext =
    typeof nextRaw === 'string' &&
    nextRaw.startsWith('/') &&
    !nextRaw.startsWith('//') &&
    !nextRaw.startsWith('/\\');
  const nextPath = isSafeNext ? nextRaw : '/dashboard';

  // Supabase appended an explicit error (e.g. expired link)
  if (errorDesc) {
    console.error('[auth/callback] supabase returned error:', errorDesc);
    return redirect('/login?error=invalid_link', 303);
  }

  if (!code) {
    return redirect('/login?error=invalid_link', 303);
  }

  // Build the cookie-aware client — the exchangeCodeForSession call
  // below will trigger our `setAll` handler in supabase.ts to write
  // the refreshed access + refresh tokens to httpOnly cookies.
  const supabase = createSupabaseServerClient(request, cookies);

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
    return redirect('/login?error=callback_failed', 303);
  }

  // Success — bounce to the originally-intended path.
  return redirect(nextPath, 303);
};
