/**
 * GET /admin/quickbooks/connect  — Intuit "Connect/Reconnect URL".
 *
 * Admin-gated (middleware). Builds the Intuit OAuth authorize URL (with a
 * one-time CSRF state persisted in portal_settings) and 302-redirects the admin
 * to Intuit to grant access. Intuit returns to /admin/quickbooks/callback.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/admin';
import { quickbooksConfigured, buildAuthorizeUrl } from '../../../lib/quickbooks';

export const prerender = false;

export const GET: APIRoute = async ({ locals, redirect }) => {
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  if (!quickbooksConfigured()) {
    return redirect('/admin/quickbooks?error=not_configured', 303);
  }
  const url = await buildAuthorizeUrl();
  return redirect(url, 302);
};
