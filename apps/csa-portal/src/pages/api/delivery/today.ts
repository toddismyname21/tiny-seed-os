/**
 * GET /api/delivery/today
 *
 * Returns the authenticated member's delivery status for today as a
 * DeliveryStatus JSON object. Used by:
 *   - <DeliveryTracker.astro> as the fallback fetch when Realtime
 *     reconnects (e.g. after the tab regains focus).
 *   - SSR can also call `fetchDeliveryStatus` directly without going
 *     through HTTP — this endpoint is the XHR-facing version.
 *
 * V2 — native Supabase. Zero Apps Script. Replaces the V1 endpoint
 * /api/delivery-status which proxied to Apps Script. We keep the old
 * endpoint as an alias (see /api/delivery-status.ts) so nothing else
 * in the codebase needs to retarget.
 *
 * Authentication: middleware never short-circuits /api/* routes, so we
 * enforce auth here and return 401 on miss (XHR caller, not browser
 * navigation — never redirect).
 *
 * Authorization: the cookie-aware Supabase client is RLS-scoped to
 * the authenticated user. delivery_stops RLS narrows reads to stops
 * tied to the member's pickup_location OR member_id. There's no way
 * a member could see another member's stop, even if a future regression
 * dropped a WHERE clause in this handler.
 *
 * Caching: `Cache-Control: no-store` — per-user, per-second-fresh.
 */
import type { APIRoute } from 'astro';
import { fetchDeliveryStatus } from '../../../lib/delivery';

export const prerender = false;

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
  const user = locals.user;
  if (!user || !user.email) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const status = await fetchDeliveryStatus(locals.supabase);
  return jsonResponse(status);
};
