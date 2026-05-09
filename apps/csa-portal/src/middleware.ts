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
 *        `/profile`, `/onboarding`) without a session → redirect to
 *        `/login` with the original path preserved as `?next=`
 *      - `/login` while logged in → redirect to `/dashboard`
 *      - Authenticated users with at least one `members.status =
 *        'onboarding'` row are funnelled into `/onboarding/<step>`
 *        until they activate. They cannot reach `/dashboard`, `/box`,
 *        etc. by typing the URL — they are redirected to wherever
 *        they left off (Day 6).
 *      - everything else → pass through
 *
 *   4. Set `Cache-Control: private, no-store` on auth-touching
 *      responses so a CDN can never serve one user's Set-Cookie to
 *      another user (per Supabase SSR docs).
 */
import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from './lib/supabase';
import {
  resolveOnboardingContext,
  stepUrl,
  ONBOARDING_STEPS,
  type OnboardingStep,
} from './lib/onboarding';

// Routes that require an authenticated session. Glob matching by
// path-prefix. A request to `/dashboard/anything` matches `/dashboard`.
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/box',
  '/preferences',
  '/profile',
  '/onboarding',
  '/account',
];

// Routes a logged-in user shouldn't see — bounce them to /dashboard.
const AUTH_ONLY_PREFIXES = ['/login'];

// Onboarding-status members are funnelled here. Anything *under*
// /onboarding is allowed through (they need to navigate the flow).
// We also let through API endpoints under /onboarding/api so the
// flow's mutations work, plus /logout (escape hatch) and /auth/*
// (callbacks) so authentication can complete.
const ONBOARDING_ALLOWED_PREFIXES = [
  '/onboarding',
  '/api/onboarding',
  '/logout',
  '/auth',
];

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

function isOnboardingAllowed(pathname: string): boolean {
  return ONBOARDING_ALLOWED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isValidStep(s: string): s is OnboardingStep {
  return (ONBOARDING_STEPS as readonly string[]).includes(s);
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
  // (Type augmentation lives in app-locals.d.ts.)
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

  // ───────────────────────────────────────────────────────────────────
  // Onboarding gate. If this authenticated user has at least one
  // members row whose status is 'onboarding' AND they're trying to
  // reach a non-onboarding-allowed path, redirect them into the flow.
  //
  // We only run this check for paths that could plausibly be member
  // pages — skipping it for API routes outside /api/onboarding (those
  // have their own auth checks) and for the home page + static assets.
  // The supabase round-trip is cheap (~30ms) but we don't want to do
  // it on every favicon hit.
  // ───────────────────────────────────────────────────────────────────
  if (user && user.email && isProtected(pathname) && !isOnboardingAllowed(pathname)) {
    const ctx = await resolveOnboardingContext(supabase, user.email);
    if (ctx) {
      // User is mid-onboarding. Bounce to their resume step.
      return redirect(stepUrl(ctx.nextStep), 303);
    }
  }

  // If user IS in onboarding-allowed territory but lands on bare
  // `/onboarding` (no step), or on an unknown step, route them to
  // their actual resume step. Welcome page is the default fallback
  // when no progress has been made yet.
  if (user && user.email && pathname === '/onboarding') {
    const ctx = await resolveOnboardingContext(supabase, user.email);
    if (ctx) {
      // Members in onboarding always start at welcome unless they've
      // already progressed past steps 3+. resolveOnboardingContext
      // returns the earliest *incomplete state-writing* step — we
      // honor that for resumes but route fresh users to /welcome.
      const stepFromCtx = ctx.preferencesDone ? ctx.nextStep : 'welcome';
      return redirect(stepUrl(stepFromCtx), 303);
    }
    // Not in onboarding → send to dashboard.
    return redirect('/dashboard', 303);
  }

  // If user hits /onboarding/<bogus-step>, fall back to /onboarding/welcome.
  if (user && pathname.startsWith('/onboarding/')) {
    const segment = pathname.slice('/onboarding/'.length).split('/')[0] ?? '';
    if (segment && !isValidStep(segment)) {
      return redirect('/onboarding/welcome', 303);
    }
  }

  // If a user reaches /onboarding/* but their members row isn't in
  // 'onboarding' status (e.g. they bookmarked the URL after activation),
  // bounce them to /dashboard. This complements the gate above for
  // the inverse direction.
  if (user && user.email && pathname.startsWith('/onboarding/')) {
    const ctx = await resolveOnboardingContext(supabase, user.email);
    if (!ctx) {
      return redirect('/dashboard', 303);
    }
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
