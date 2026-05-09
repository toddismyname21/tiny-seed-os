/**
 * /logout — sign out the current user, clear auth cookies, redirect home.
 *
 * Accepts both GET and POST. POST is preferred (CSRF-safer and the
 * dashboard form uses it) but GET is supported so a plain link works
 * too (e.g. emergency "sign me out" link in a help email).
 */
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../lib/supabase';

export const prerender = false;

const handler: APIRoute = async ({ request, cookies, redirect }) => {
  const supabase = createSupabaseServerClient(request, cookies);

  // signOut() invalidates the refresh token server-side and asks
  // our `setAll` handler to clear the auth cookies.
  const { error } = await supabase.auth.signOut();

  if (error) {
    // Non-fatal — proceed with redirect regardless. The cookie wipe
    // below covers the "stale cookie left behind" case.
    console.error('[logout] signOut failed:', error.message);
  }

  return redirect('/login', 303);
};

export const GET = handler;
export const POST = handler;
