/**
 * GET /api/delivery-status
 *
 * Returns the current delivery status for the authenticated member's
 * stop TODAY. Used by `DeliveryTracker.astro` for polling.
 *
 * Phase 1 (Day 9): proxies to Apps Script `getDeliveryHistory`. When
 * the wholesale migration moves driver writes to Postgres (~Day 30),
 * this route gets a Postgres-backed implementation and the polling on
 * the client is replaced by a Supabase Realtime subscription.
 *
 * Authentication: the route is protected by middleware — `Astro.locals.user`
 * is the verified Supabase user. The /api prefix isn't in PROTECTED_PREFIXES
 * so middleware doesn't auto-redirect; we enforce the auth check here and
 * return 401 (not a redirect — the caller is XHR, not a browser).
 *
 * Authorization: we look up the member's `customers` row via the
 * cookie-aware (RLS-scoped) Supabase client. RLS policy
 * `customers_self_select` (migration 0011) restricts the SELECT to
 * the row matching the user's auth.jwt email — even if a future
 * regression dropped the WHERE clause, the user could only ever see
 * their own customer row.
 *
 * Response (always 200 unless auth fails):
 *   { state, eta, driver_name, completed_at, photo_url, issue_notes, last_updated }
 *
 * Failure modes:
 *   401  → no session
 *   200 { state: 'none', ... } → authenticated but no customer record,
 *                                no legacy_id, or upstream returned no
 *                                data (fail soft per spec).
 *
 * Caching: `Cache-Control: no-store` because we cannot CDN-cache a
 * per-user, per-second-fresh response. Middleware already sets the
 * conservative no-store on every response, but we set it explicitly
 * here for defense-in-depth in case middleware ever changes.
 */
import type { APIRoute } from 'astro';
import { fetchDeliveryStatus } from '../../lib/delivery';

export const prerender = false;

/** Wrap any JSON response with the cache-control headers we want. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store, max-age=0',
      'Pragma': 'no-cache',
    },
  });
}

export const GET: APIRoute = async ({ locals }) => {
  // 1. Auth — must have a verified session.
  const user = locals.user;
  if (!user || !user.email) {
    // 401 with a body the client can read. We don't redirect because
    // the caller is `fetch()` from the dashboard, not a browser nav.
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  // 2. Lookup `customers.legacy_id`. RLS limits to the row owned by
  // this auth user. We use `.maybeSingle()` so "no customer record"
  // returns null instead of throwing — that's the new-signup case
  // and we want to fall through to the empty status response.
  type CustomerRow = { legacy_id: string | null };
  const { data: customer, error: customerErr } = await locals.supabase
    .from('customers')
    .select('legacy_id')
    .limit(1)
    .maybeSingle()
    .overrideTypes<CustomerRow, { merge: false }>();

  if (customerErr) {
    // Logging only — don't leak DB error text to the client.
    console.error('[api/delivery-status] customer lookup failed:', customerErr.message);
    // Fail soft — return the empty status. Widget hides.
    return jsonResponse({
      state: 'none',
      eta: null,
      driver_name: null,
      completed_at: null,
      photo_url: null,
      issue_notes: null,
      last_updated: new Date().toISOString(),
    });
  }

  const legacyId = customer?.legacy_id ?? '';

  // 3. Fetch from Apps Script. `fetchDeliveryStatus` is fail-soft —
  // it always returns a DeliveryStatus, never throws. If legacyId is
  // empty (CSA-only member with no wholesale order history), it
  // immediately returns the empty status.
  const status = await fetchDeliveryStatus(legacyId);

  return jsonResponse(status);
};
