/**
 * GET /api/delivery-status
 *
 * V2 — native Supabase. Day 9, 2026-05-11.
 *
 * Originally proxied to Apps Script `getDeliveryHistory`. Now reads
 * directly from the new Supabase tables (migration 0019). Kept as a
 * route alias so any existing client (older cached pages, the
 * DeliveryTracker widget mid-deploy) keeps working with no observable
 * change.
 *
 * New consumers should hit `/api/delivery/today` directly — same
 * payload shape, clearer URL.
 */
import type { APIRoute } from 'astro';
import { fetchDeliveryStatus } from '../../lib/delivery';

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
