/**
 * Route protection + Supabase auth session handling.
 *
 * Runs on every request to the CSA portal. Responsibilities:
 *
 *   1. Build a cookie-aware Supabase server client and call
 *      `auth.getUser()`. This:
 *      - validates the JWT against Supabase Auth on every request
 *        (cannot be forged client-side)
 *      - rotates the refresh token if it's expired and writes the
 *        new tokens back to the response via Set-Cookie
 *
 *   2. Stash the authenticated user + supabase client on `Astro.locals`
 *      so downstream pages can read it without re-running `getUser()`.
 *
 *   3. Enforce route policy:
 *      - PROTECTED routes (`/dashboard`, `/box`, `/preferences`,
 *        `/profile`) without a session → redirect to `/login`
 *      - `/login` while logged in → redirect to `/dashboard`
 *      - everything else → pass through
 *
 *   4. Set `Cache-Control: private, no-store` on auth-touching
 *      responses so a CDN can never serve one user's Set-Cookie to
 *      another user (per Supabase SSR docs).
 */
import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from './lib/supabase';

// Routes that require an authenticated session. Glob matching by
// path-prefix. A request to `/dashboard/anything` matches `/dashboard`.
const PROTECTED_PREFIXES = ['/dashboard', '/box', '/preferences', '/profile'];

// Routes a logged-in user shouldn't see — bounce them to /dashboard.
const AUTH_ONLY_PREFIXES = ['/login'];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isAuthOnly(pathname: string): boolean {
  return AUTH_ONLY_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, cookies, url, redirect, locals } = context;

  const supabase = createSupabaseServerClient(request, cookies);

  // getUser() contacts the Supabase Auth server to validate the JWT.
  // If the access token is expired and a refresh token is present,
  // Supabase rotates the tokens and `setAll` (in supabase.ts) writes
  // them back to Set-Cookie on the response.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Stash on locals so pages don't have to re-run getUser().
  // (Type augmentation lives in env.d.ts.)
  locals.user = user;
  locals.supabase = supabase;

  const pathname = url.pathname;

  // Enforce auth on protected routes. Preserve the original intended
  // path as `?next=` so we can bounce the user back after login.
  if (!user && isProtected(pathname)) {
    const next = encodeURIComponent(pathname + url.search);
    return redirect(`/login?next=${next}`, 303);
  }

  // Logged-in users shouldn't sit on /login.
  if (user && isAuthOnly(pathname)) {
    return redirect('/dashboard', 303);
  }

  const response = await next();

  // Per Supabase SSR docs: any response that may have rotated auth
  // cookies must be marked as non-cacheable so a CDN cannot serve
  // one user's Set-Cookie headers to another user.
  // We apply this conservatively to all responses that pass through
  // the middleware — Astro is server-rendered (output: 'server') so
  // this affects no static assets.
  response.headers.set(
    'Cache-Control',
    'private, no-cache, no-store, must-revalidate, max-age=0'
  );
  response.headers.set('Pragma', 'no-cache');

  return response;
});
