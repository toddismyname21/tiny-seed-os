/**
 * Admin authorization helpers.
 *
 * Day 10. Routes under `/admin/*` are gated by middleware.ts which uses
 * `requireAdminRole` below to verify the authenticated user maps to a
 * customers row with role in ('admin','staff'). API routes under
 * `/api/admin/*` also call `requireAdminRole` defensively before any
 * mutation — middleware enforcement is a redirect-based gate for HTML
 * pages, but JSON endpoints need a 401/403 response, not a 303.
 *
 * The check is a single round-trip to Postgres. We do NOT cache the
 * role on the user JWT to avoid:
 *   - role revocation latency (rotating an admin to member would
 *     require the user to re-login if we cached on the JWT)
 *   - drift between the JWT claim and the canonical customers.role
 *
 * The query goes through the cookie-aware (RLS-scoped) client, which
 * is sufficient: the customers_self_read policy lets the caller see
 * their own row, and the admin_all_customers policy is moot here
 * (the caller is reading their own row by email).
 */
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from './database.types';

/** Canonical owner email. Matches lib/box.ts OWNER_EMAIL — duplicated
 *  here to keep this module dependency-free. */
export const ADMIN_REDIRECT_NON_MEMBER = '/dashboard?error=admin_only';

export type AdminRole = 'admin' | 'staff';

export interface AdminContext {
  user: User;
  role: AdminRole;
  customerId: string;
}

/**
 * Look up the current user's customers.role. Returns the role if the
 * user is admin/staff, or null otherwise.
 *
 * Returns `null` (NOT an error) when the user has no customers row at
 * all — middleware translates this to a redirect to /dashboard with the
 * admin_only banner, same as a non-admin.
 */
export async function resolveAdminRole(
  supabase: SupabaseClient<Database>,
  user: User | null
): Promise<AdminContext | null> {
  if (!user || !user.email) return null;

  type Row = { id: string; role: 'member' | 'admin' | 'staff' };
  const { data, error } = await supabase
    .from('customers')
    .select('id, role')
    .eq('email', user.email)
    .maybeSingle()
    .overrideTypes<Row, { merge: false }>();

  if (error) {
    // Surface in server logs but treat as "not admin" — never accidentally
    // grant admin on a failed lookup.
    console.error('[admin] role lookup failed:', error.message);
    return null;
  }

  if (!data) return null;
  if (data.role !== 'admin' && data.role !== 'staff') return null;

  return { user, role: data.role, customerId: data.id };
}

/**
 * Helper for API routes under /api/admin/*. Returns a Response (401/403)
 * when authorization fails; returns null when it succeeds (caller
 * proceeds with the AdminContext from `ctx`).
 *
 * Pattern:
 *   const ctx = await resolveAdminRole(locals.supabase, locals.user);
 *   const denial = denyIfNotAdmin(ctx);
 *   if (denial) return denial;
 *   // ...use ctx safely
 */
export function denyIfNotAdmin(ctx: AdminContext | null): Response | null {
  if (!ctx) {
    // We collapse 401 (unauthenticated) and 403 (authenticated but not
    // admin) into 403 — Astro middleware already redirects unauthed
    // users away from /admin/*, so by the time we reach an API handler
    // any unauthorized caller is either (a) authenticated but not admin
    // or (b) sending a stale cookie. Either way: 403.
    return new Response(
      JSON.stringify({ ok: false, error: 'forbidden' }),
      {
        status: 403,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      }
    );
  }
  return null;
}

/**
 * Convenience: combines resolveAdminRole + denyIfNotAdmin for the
 * common case in API routes.
 *
 * Returns { ctx: AdminContext } on success, or { response: Response }
 * with the 403 already-built.
 */
export async function requireAdmin(
  supabase: SupabaseClient<Database>,
  user: User | null
): Promise<{ ctx: AdminContext; response?: never } | { ctx?: never; response: Response }> {
  const ctx = await resolveAdminRole(supabase, user);
  if (!ctx) {
    return { response: denyIfNotAdmin(null)! };
  }
  return { ctx };
}
