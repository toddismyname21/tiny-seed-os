/**
 * GET /admin/quickbooks/callback  — Intuit OAuth 2.0 redirect target.
 *
 * Intuit redirects here after the admin authorizes, with `code`, `realmId`, and
 * the `state` we issued. We verify the CSRF state, exchange the code for tokens,
 * store them (portal_settings), and bounce back to the console. This URL must be
 * registered EXACTLY as a Redirect URI in the Intuit app:
 *   https://csa.tinyseedfarm.com/admin/quickbooks/callback
 *
 * Admin-gated by middleware — the admin still holds their session cookie when
 * Intuit redirects back, so requireAdmin passes.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/admin';
import { quickbooksConfigured, consumeState, exchangeCodeForTokens } from '../../../lib/quickbooks';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url, redirect }) => {
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  if (!quickbooksConfigured()) {
    return redirect('/admin/quickbooks?error=not_configured', 303);
  }

  const params = url.searchParams;
  // Intuit can send an explicit error (e.g. access_denied).
  const oauthError = params.get('error');
  if (oauthError) {
    return redirect(`/admin/quickbooks?error=${encodeURIComponent(oauthError)}`, 303);
  }

  const code = params.get('code');
  const realmId = params.get('realmId');
  const state = params.get('state') ?? '';
  if (!code || !realmId) {
    return redirect('/admin/quickbooks?error=missing_code', 303);
  }
  if (!(await consumeState(state))) {
    return redirect('/admin/quickbooks?error=bad_state', 303);
  }

  try {
    await exchangeCodeForTokens(code, realmId);
  } catch (e) {
    console.error('[quickbooks/callback] token exchange failed:', e);
    return redirect('/admin/quickbooks?error=token_exchange', 303);
  }
  return redirect('/admin/quickbooks?connected=1', 303);
};
