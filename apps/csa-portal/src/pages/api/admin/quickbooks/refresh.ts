/**
 * GET|POST /api/admin/quickbooks/refresh — mint a fresh QuickBooks access token.
 *
 * WHY THIS EXISTS: Intuit access tokens live ONE HOUR. The refresh token is good
 * for 100 days and is already stored in portal_settings, but the client secret
 * needed to exchange it lives only in the Vercel env (Vercel REDACTS secrets on
 * `env pull`, so it cannot be used from a laptop). The practical effect was that
 * every QuickBooks task — reconciling invoices, correcting the Food Bank
 * paperwork, sending a batch — died mid-way and Todd had to re-run the whole
 * OAuth dance in the browser for a token that could have been renewed silently.
 *
 * This endpoint calls lib/quickbooks getAccessToken(), which already does the
 * right thing: returns the cached token while it is valid, otherwise exchanges
 * the refresh token and persists the rotated pair (Intuit ROTATES the refresh
 * token on every exchange — persisting it is what stops the connection dying).
 * Running inside the portal means the secret never leaves Vercel.
 *
 * It mints a token; it does NOT read, write or send anything in QuickBooks, and
 * the token itself is never returned in the response body.
 *
 * Auth: admin-gated (middleware covers /admin/*, and requireAdmin here). GET is
 * allowed because this is idempotent beyond the token rotation itself.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../../lib/admin';
import { getAccessToken, getConnection, quickbooksConfigured } from '../../../../lib/quickbooks';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const handler: APIRoute = async ({ locals }) => {
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  if (!quickbooksConfigured()) return json({ ok: false, error: 'not_configured' }, 503);

  const conn = await getConnection();
  if (!conn.connected) {
    return json({ ok: false, error: 'not_connected', hint: 'Connect at /admin/quickbooks' }, 409);
  }

  const token = await getAccessToken();
  if (!token) {
    return json({ ok: false, error: 'refresh_failed', hint: 'Reconnect at /admin/quickbooks' }, 502);
  }
  return json({ ok: true, realmId: conn.realmId, environment: conn.environment });
};

export const GET = handler;
export const POST = handler;
