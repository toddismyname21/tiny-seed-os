/**
 * GET /api/account/flex-balance
 *
 * Auth-gated JSON read of the caller's Farm Flex wallet balance, resolved
 * by their authenticated email. Exists to keep the LIVE Shopify
 * GraphQL round-trip OFF the SSR critical render path (gap analysis P0-1,
 * 2026-05-24): dashboard.astro / account/index.astro / account/flex.astro
 * used to `await getFlexBalance(...)` inline before producing HTML, so
 * every member's home page blocked on a cross-service Shopify call. At
 * 176+ concurrent logins that was the top launch-day slowness risk.
 *
 * Now those pages render the wallet card immediately with a loading
 * state and the FlexWallet island fetches THIS endpoint after first paint.
 *
 * Response (200):
 *   { total, principal, bonus, currency }     // FlexBalance shape
 * When the member has no Shopify customer / no balance / Shopify is down,
 * getFlexBalance fail-softs to null and we return:
 *   { total: 0, principal: 0, bonus: 0, currency: 'USD' }
 * The island treats total <= 0 as "hide the wallet" — identical to the
 * old SSR null behavior, so a flex outage never breaks the page.
 *
 * 401 { error: 'unauthorized' } for an unauthenticated request.
 *
 * `Cache-Control: private` — this is per-member, never shared/CDN-cached.
 * The balance can change (top-ups, spends) so we also no-store it.
 */
import type { APIRoute } from 'astro';
import { getFlexBalance } from '../../../lib/flex';

export const prerender = false;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Per-member, never CDN/shared-cached; balance can change anytime.
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

  // Fail-soft contract: getFlexBalance returns null on EVERY error path
  // (no Shopify creds, Shopify down, GraphQL errors, no customer). We
  // normalize null → a zeroed balance so the client has one stable shape;
  // the island hides the wallet when total <= 0 (same as the old SSR
  // null check).
  const balance = await getFlexBalance(user.email);

  if (!balance) {
    return jsonResponse({ total: 0, principal: 0, bonus: 0, currency: 'USD' });
  }

  return jsonResponse({
    total: balance.total,
    principal: balance.principal,
    bonus: balance.bonus,
    currency: balance.currency,
  });
};
