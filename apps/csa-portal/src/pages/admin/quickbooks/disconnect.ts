/**
 * POST /admin/quickbooks/disconnect  — Intuit "Disconnect URL".
 *
 * Admin-gated (middleware) + same-origin POST. Revokes the refresh token at
 * Intuit and clears the stored tokens (portal_settings). Also accepts GET so the
 * Intuit-configured Disconnect URL resolves if hit directly; a GET simply shows
 * the console (the actual revoke requires the same-origin POST from the button).
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/admin';
import { isSameOriginPost, PORTAL_ORIGIN } from '../../../lib/onboarding';
import { disconnect } from '../../../lib/quickbooks';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!isSameOriginPost(request, PORTAL_ORIGIN)) {
    return new Response('Forbidden', { status: 403 });
  }
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;

  await disconnect();
  return redirect('/admin/quickbooks?disconnected=1', 303);
};

// A bare GET to the Disconnect URL just returns to the console.
export const GET: APIRoute = async ({ locals, redirect }) => {
  const auth = await requireAdmin(locals.supabase, locals.user);
  if (auth.response) return auth.response;
  return redirect('/admin/quickbooks', 303);
};
