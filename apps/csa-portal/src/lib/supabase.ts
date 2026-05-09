/**
 * Supabase clients for the CSA portal.
 *
 * Three entrypoints exposed:
 *   - `supabaseAnon`  — browser/SSR-public client. Honors RLS. Use for
 *                        member-facing reads + writes via auth JWT.
 *   - `supabaseAdmin` — server-only. Bypasses RLS. Use ONLY in API
 *                        routes / Edge Functions for admin-grade ops
 *                        (Shopify webhook, scheduled emails, etc.).
 *                        NEVER import this in a client component.
 *   - `createSupabaseServerClient(request, cookies)` — cookie-aware SSR
 *                        client. Reads + writes the Supabase auth
 *                        session cookies on every request. Use this in
 *                        middleware and any `.astro` page or API route
 *                        that needs to know "who is the current user?".
 *                        Honors RLS as the authenticated user.
 *
 * The keys are read via Astro's typed env helpers
 * (https://docs.astro.build/en/guides/environment-variables/).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import {
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
} from 'astro:env/client';
import { SUPABASE_SERVICE_ROLE_KEY } from 'astro:env/server';
import type { AstroCookies } from 'astro';
import type { Database } from './database.types';

export const supabaseAnon: SupabaseClient<Database> = createClient<Database>(
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: 'pkce',                 // OAuth + magic-link best practice
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

/**
 * Admin client. NEVER expose to the browser. Always invoke from
 * server-only contexts (Astro endpoints under `src/pages/api/...`).
 */
export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(
  PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Helper: validate the request's auth JWT and return a Supabase client
 * scoped to that user's session. Use this in API routes that need
 * RLS-enforced queries on behalf of a member.
 */
export function supabaseForRequest(
  authHeader: string | null
): SupabaseClient<Database> {
  return createClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Cookie-aware SSR client. The PKCE auth flow stores the user's
 * access + refresh tokens as `sb-<project-ref>-auth-token` cookies on
 * the response. This client reads them on each incoming request and
 * writes refreshed tokens back when Supabase rotates them.
 *
 * Usage (in middleware):
 *   const supabase = createSupabaseServerClient(request, cookies);
 *   const { data: { user } } = await supabase.auth.getUser();
 *
 * `getUser()` re-validates the JWT against Supabase Auth on every call
 * — preferred over `getSession()` for server-side authorization.
 */
export function createSupabaseServerClient(
  request: Request,
  cookies: AstroCookies
): SupabaseClient<Database> {
  return createServerClient<Database>(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          // Parse the inbound Cookie header — exact + handles chunked
          // auth cookies (`sb-<ref>-auth-token.0`, `.1`, ...) cleanly.
          const header = request.headers.get('Cookie') ?? '';
          const parsed = parseCookieHeader(header);
          // parseCookieHeader returns { name, value: string | undefined }[].
          // The Supabase SSR contract requires `value: string`, so drop
          // any malformed entries (value === undefined).
          return parsed
            .filter((c): c is { name: string; value: string } => typeof c.value === 'string');
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            // Astro's cookies.set accepts the same SerializeOptions
            // shape Supabase passes — but we harden the security
            // attributes regardless of what Supabase requested:
            //   httpOnly:  prevents JS reading the auth token (XSS defence)
            //   secure:    HTTPS-only (csa.tinyseedfarm.com is HTTPS only)
            //   sameSite:  'lax' — needed for the magic-link redirect
            //              to set the cookie when the user clicks the
            //              email link from a different origin
            cookies.set(name, value, {
              httpOnly: true,
              secure: true,
              sameSite: 'lax',
              path: options?.path ?? '/',
              maxAge: options?.maxAge,
              expires: options?.expires,
              domain: options?.domain,
            });
          }
        },
      },
    }
  );
}
