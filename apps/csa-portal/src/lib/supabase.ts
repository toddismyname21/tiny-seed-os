/**
 * Supabase clients for the CSA portal.
 *
 * Two clients exposed:
 *   - `supabaseAnon`  — browser/SSR-public client. Honors RLS. Use for
 *                        member-facing reads + writes via auth JWT.
 *   - `supabaseAdmin` — server-only. Bypasses RLS. Use ONLY in API
 *                        routes / Edge Functions for admin-grade ops
 *                        (Shopify webhook, scheduled emails, etc.).
 *                        NEVER import this in a client component.
 *
 * The keys are read via Astro's typed env helpers
 * (https://docs.astro.build/en/guides/environment-variables/).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
} from 'astro:env/client';
import { SUPABASE_SERVICE_ROLE_KEY } from 'astro:env/server';
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
