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
import { resolveOpsRole } from './lib/admin';
import { phoneSatisfiesGate } from './lib/phone';
import { memberHasFlexShare } from './lib/account';

// Routes that require an authenticated session. Glob matching by
// path-prefix. A request to `/dashboard/anything` matches `/dashboard`.
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/box',
  '/preferences',
  '/profile',
  '/onboarding',
  '/account',
  '/stop-notes',
  '/admin',
];

// ───────────────────────────────────────────────────────────────────────
// PUBLIC, TOKEN-AUTHENTICATED prefixes (Todd 2026-06-14 — zero-barrier chef
// ordering). The chef wholesale ordering page lives at /order/<token> and its
// submit endpoint at /api/order/submit. There is NO login: the permanent
// secret `wholesale_accounts.order_token` IS the access (chefs bookmark the URL
// and order anytime). These paths must NEVER be redirected to /login, and the
// member onboarding / phone / pickup-ack gates must never apply to them. They
// are deliberately NOT in PROTECTED_PREFIXES (so the auth gate skips them) and
// are listed here only for documentation + a fast pass-through. The actual
// access control is the token check inside the page + the place_wholesale_order
// RPC (the token is validated server-side on every read AND submit).
// `/api/track` (Todd 2026-06-30 — Gmail open-tracking pixel) is ALSO public:
// the pixel endpoint /api/track/o/<token>.gif is hit directly by recipients'
// EMAIL CLIENTS, which carry no auth cookie and no same-origin context. The
// opaque per-recipient token IS the access — it's validated server-side
// (service-role) inside the endpoint, which always returns a 1×1 GIF (never
// 404/500) so it never leaks token existence. Must NEVER redirect to /login.
const PUBLIC_TOKEN_PREFIXES = ['/order', '/api/order', '/api/track'];

function isPublicTokenRoute(pathname: string): boolean {
  return PUBLIC_TOKEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

// Admin-only prefixes. Authenticated users without role='admin'/'staff'
// are bounced back to /dashboard with an explanatory banner. The
// /api/admin/* endpoints are excluded from THIS middleware redirect
// (they need JSON 403s, not HTML redirects) and enforce their own
// role check via `requireAdmin()` in the route handler.
const ADMIN_PREFIXES = ['/admin'];

// ───────────────────────────────────────────────────────────────────────
// CREW least-privilege allowlist (migration 0068 — limited pack/field role).
// A user whose customers.role='crew' may reach ONLY these /admin PAGE prefixes
// (pack/delivery ops). These pages inherently show member NAMES for packing /
// labels — job-necessary — but crew NEVER reaches member management, financials,
// pricing, campaigns, exports, sync/health, or the /admin dashboard. Any OTHER
// /admin/* PAGE is redirected to the crew home (/admin/handoff) by the crew
// branch below.
//
// This is a PAGE allowlist. /api/admin/* is deliberately NOT gated here — JSON
// endpoints must return their own 403 (not an HTML 303 redirect). Crew reaches
// an /api/admin path only via fetch from an allowed page, and only the handoff +
// cooler endpoints accept crew (requireCrew); every other /api/admin/* route
// keeps calling requireAdmin and returns 403 for crew. So we let /api/admin/*
// fall through for crew and rely on per-endpoint gating.
//
// Prefix matching is SEGMENT-BOUNDARY exact (=== p OR startsWith(p + '/')) so
// '/admin/handoff' never accidentally allows '/admin/handoffX'.
// CREW-allowed pack pages. Each is either fully PII-free for crew OR has been
// deliberately wired with a service-role/ops-scoped loader so crew see the data
// they need WITHOUT any member PII:
//   • handoff + cooler — read the zero-PII ops tables via is_ops_caller() (0068).
//   • pick-pack — the harvest/pack sheets load PER-CROP AGGREGATE demand through
//     the service-role client (no member contact_name/email/phone rendered in
//     any view; the make-ups banner's member names stay on the admin/staff-only
//     RLS read, so they never reach crew), and the live check-off board is the
//     is_ops_caller-gated pick_pack_progress table (migration 0069).
// The OTHER pack pages (pack-sheet, harvest, labels, host-sheets, stop-manifest,
// route-sheet, text-stop, substitutions, share-contents) still load member data
// through the RLS client + admin bypass, so they render EMPTY for crew and stay
// EXCLUDED until each gets its own PII-safe loader.
const CREW_ALLOWED_PREFIXES = [
  '/admin/handoff',
  '/admin/cooler',
  '/admin/pick-pack',
];

// The crew home — where a crew user is sent from any non-allowlisted /admin page
// (and from /dashboard). MUST itself be inside CREW_ALLOWED_PREFIXES to avoid a
// redirect loop.
const CREW_HOME = '/admin/handoff';

function isCrewAllowedPage(pathname: string): boolean {
  return CREW_ALLOWED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

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
  // Admin routes bypass the onboarding funnel — Todd is an admin, not
  // a CSA member-in-progress. If a future admin somehow has an
  // onboarding members row, they still need to reach /admin to do work.
  '/admin',
  '/api/admin',
];

// ───────────────────────────────────────────────────────────────────────
// PHONE nag (Todd directive 2026-06-08; SOFTENED 2026-06-12 after member
// complaints). Every member SHOULD have a valid US cell on file — we text them
// when their share arrives. ORIGINALLY this hard-redirected every member page
// to /account/add-phone until a number was saved; members complained they were
// hard-locked out of viewing their own share. NEW behavior: members may VIEW
// every member page; we instead surface an unmissable, non-dismissible NAG
// BANNER (MemberShell, fed via locals.memberNags) linking to /account/add-phone.
// The interstitial pages remain fully reachable so the save still works and the
// member is never trapped. Onboarding members are still funnelled through their
// OWN flow (which collects the phone) by the onboarding gate below.
// ───────────────────────────────────────────────────────────────────────

// Paths where we DON'T compute / surface the phone nag (the interstitial
// itself, its API, the onboarding funnel, sign-out + auth callbacks). On every
// OTHER protected member page the nag banner shows but never blocks viewing.
const PHONE_NAG_SUPPRESS_PREFIXES = [
  '/account/add-phone',     // the interstitial page itself (no self-nag)
  '/api/account/add-phone', // its save endpoint
  '/logout',                // sign-out escape hatch
  '/auth',                  // auth callbacks (login completion)
  // Onboarding members are funnelled through their OWN flow (the onboarding
  // gate runs after this one) which has a dedicated contact step that collects
  // + writes customers.phone. Suppressing the nag here avoids a double ask.
  '/onboarding',
  '/api/onboarding',
];

function isPhoneNagSuppressed(pathname: string): boolean {
  return PHONE_NAG_SUPPRESS_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

// ───────────────────────────────────────────────────────────────────────
// PICKUP-ACK nag (Todd directive 2026-06-08; SOFTENED 2026-06-12). Members
// SHOULD confirm they understand WHERE/WHEN they pick up (missed pickups =
// wasted boxes). ORIGINALLY this hard-redirected every member page to
// /account/confirm-pickup until pickup_acknowledged_at was set. NEW behavior:
// members may VIEW every member page; we surface a non-dismissible NAG BANNER
// linking to /account/confirm-pickup instead. The confirm-pickup + pickup pages
// remain reachable so the acknowledgment (and the choose-a-stop escape hatch)
// still work.
// ───────────────────────────────────────────────────────────────────────

// Paths where we DON'T surface the pickup-ack nag (the interstitial itself, the
// choose-a-location escape hatch + its APIs, the add-phone interstitial, the
// onboarding funnel, sign-out + auth callbacks).
const PICKUP_ACK_NAG_SUPPRESS_PREFIXES = [
  '/account/confirm-pickup',     // the interstitial page itself (no self-nag)
  '/api/account/confirm-pickup', // its save endpoint
  '/account/pickup',             // choose-a-location escape hatch (page)
  '/api/account/pickup-location',// its save endpoint
  '/api/account/request-delivery', // home-delivery request from the pickup page
  '/account/add-phone',          // the phone interstitial renders outside the shell
  '/api/account/add-phone',
  '/logout',                     // sign-out escape hatch
  '/auth',                       // auth callbacks (login completion)
  '/onboarding',
  '/api/onboarding',
];

function isPickupAckNagSuppressed(pathname: string): boolean {
  return PICKUP_ACK_NAG_SUPPRESS_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

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

function isAdminRoute(pathname: string): boolean {
  return ADMIN_PREFIXES.some(
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

  // ───────────────────────────────────────────────────────────────────
  // PUBLIC token routes (chef ordering at /order/<token> + /api/order/*).
  // No auth, no gates — the order_token is the sole gate (validated in the
  // page + the place_wholesale_order RPC). Pass straight through so a chef
  // is never bounced to /login. We still run the response-header step below
  // by falling through `next()` at the end, so we early-return here AFTER
  // letting the rest of the request complete. (We short-circuit before any
  // protected/onboarding/admin gate can match.)
  // ───────────────────────────────────────────────────────────────────
  if (isPublicTokenRoute(pathname)) {
    const response = await next();
    response.headers.set(
      'Cache-Control',
      'private, no-cache, no-store, must-revalidate, max-age=0'
    );
    response.headers.set('Pragma', 'no-cache');
    return response;
  }

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
  // Admin landing redirect. Authenticated admins/staff who hit the
  // member dashboard exact path (/dashboard) are redirected to /admin.
  // Todd (role=admin) is the farm owner — not a CSA subscriber — so
  // /dashboard's "no active share" empty-state is wrong for him. This
  // is intentionally exact-match: admins remain free to visit /box,
  // /onboarding/*, and other member-facing pages for QA. Sub-paths of
  // /dashboard (none exist today) would also pass through unchanged.
  // ───────────────────────────────────────────────────────────────────
  if (user && pathname === '/dashboard') {
    const opsCtx = await resolveOpsRole(supabase, user);
    if (opsCtx) {
      // Crew are not CSA members — send them to their pack-house home instead of
      // the (empty, member-facing) /dashboard OR the /admin dashboard (which
      // crew may not see). Admin/staff land on the full /admin dashboard.
      return redirect(opsCtx.role === 'crew' ? CREW_HOME : '/admin', 303);
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // Admin / ops gate. Routes under /admin/* require role in
  // ('admin','staff','crew'). If the user is authenticated but has none of
  // those roles, redirect to /dashboard with ?error=admin_only so the
  // dashboard can flash a banner. Unauth users hitting /admin/* are already
  // redirected to /login by the protected-route check above (since /admin is
  // in PROTECTED_PREFIXES).
  //
  // CREW least-privilege branch: a crew user may reach ONLY the pack-house
  // page allowlist (CREW_ALLOWED_PREFIXES). Any OTHER /admin PAGE (members,
  // reports, campaigns, weekly-email, wholesale/*, products, flex-*, sync,
  // health, notices, market/*, the /admin dashboard, …) is redirected to the
  // crew home. /api/admin/* is NOT redirected — those endpoints self-gate and
  // return JSON 403s (crew is accepted only by the handoff + cooler routes via
  // requireCrew; everything else calls requireAdmin → 403). admin/staff
  // behavior is COMPLETELY UNCHANGED (full access).
  // ───────────────────────────────────────────────────────────────────
  if (user && isAdminRoute(pathname)) {
    const opsCtx = await resolveOpsRole(supabase, user);
    if (!opsCtx) {
      return redirect('/dashboard?error=admin_only', 303);
    }
    if (
      opsCtx.role === 'crew' &&
      !pathname.startsWith('/api/') &&
      !isCrewAllowedPage(pathname)
    ) {
      // Crew hit a non-allowlisted /admin page → bounce to their home.
      return redirect(CREW_HOME, 303);
    }
    // Stash so admin/ops pages (and AdminShell) don't re-query.
    locals.adminRole = opsCtx.role;
    locals.adminCustomerId = opsCtx.customerId;
  }

  // ───────────────────────────────────────────────────────────────────
  // PHONE + PICKUP-ACK NAGS (Todd directive 2026-06-08; SOFTENED 2026-06-12).
  // Runs for an authenticated user on a protected member HTML route. We read
  // role + phone + pickup_acknowledged_at in ONE round-trip and COMPUTE two
  // flags — we no longer redirect. The flags are stashed on
  // `locals.memberNags` so MemberShell can render unmissable, non-dismissible
  // top-of-page banners that link to the add-phone / confirm-pickup pages
  // (those pages remain reachable so the member can satisfy the nag and is
  // never trapped). Members can now VIEW their share regardless.
  //
  //   - role in ('admin','staff') → NEVER nagged (Todd is the owner, staff do
  //     farm work; they aren't CSA members who get texts).
  //   - needsPhone     = phone empty/invalid  (suppressed on the interstitial
  //                       + onboarding funnel + auth/logout paths).
  //   - needsPickupAck = pickup_acknowledged_at IS NULL (same suppressions +
  //                       the choose-a-location escape hatch).
  //
  // Scoped to protected member HTML routes only: skip /api/* (no MemberShell,
  // a wasted round-trip) and /admin/* (admins don't get member nags).
  //
  // FAIL-SOFT: any query error leaves both flags false (never surface a false
  // alarm on a transient DB hiccup; never block the page).
  // ───────────────────────────────────────────────────────────────────
  if (
    user &&
    user.email &&
    isProtected(pathname) &&
    !pathname.startsWith('/api/') &&
    !isAdminRoute(pathname)
  ) {
    const { data: gateRow, error: gateErr } = await supabase
      .from('customers')
      .select('role, phone, pickup_acknowledged_at')
      .eq('email', user.email)
      .maybeSingle()
      .overrideTypes<
        { role: 'member' | 'admin' | 'staff' | 'crew'; phone: string | null; pickup_acknowledged_at: string | null },
        { merge: false }
      >();

    if (gateErr) {
      console.error('[middleware] member-nag lookup failed (skipping nags):', gateErr.message);
    } else if (gateRow) {
      // admin/staff/crew are farm workers, not CSA members — never nag them
      // about a phone/pickup they don't have.
      const isStaff =
        gateRow.role === 'admin' ||
        gateRow.role === 'staff' ||
        gateRow.role === 'crew';

      const needsPhone =
        !isStaff &&
        !isPhoneNagSuppressed(pathname) &&
        !phoneSatisfiesGate(gateRow.phone);

      const needsPickupAck =
        !isStaff &&
        !isPickupAckNagSuppressed(pathname) &&
        !gateRow.pickup_acknowledged_at;

      if (needsPhone || needsPickupAck) {
        locals.memberNags = { needsPhone, needsPickupAck };
      }
    }
    // No customers row → not a member with nags (the dashboard shows its own
    // "no share on file" state). Pass through with no nags.
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

  // ───────────────────────────────────────────────────────────────────
  // Flex-membership signal for the bottom-nav "Order" tab (FIX 1,
  // 2026-06-08). Computed ONCE here and stashed on locals so MemberShell
  // renders the tab on EVERY member page (box, pickup, vacation…) without
  // each page re-querying. Scoped to protected member HTML routes only:
  //   - skip /api/* (no MemberShell, would be a wasted round-trip)
  //   - skip /admin/* (admins don't get the member order tab)
  //   - skip the add-phone interstitial (it renders outside MemberShell)
  // FAIL-SOFT inside the helper (errors → false → tab hidden).
  // ───────────────────────────────────────────────────────────────────
  if (
    user &&
    user.email &&
    isProtected(pathname) &&
    !pathname.startsWith('/api/') &&
    !isAdminRoute(pathname)
  ) {
    locals.isFlexMember = await memberHasFlexShare(supabase);
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
