/**
 * Type augmentation for `Astro.locals`.
 *
 * Lives under `src/lib/` (not `src/env.d.ts`) to avoid colliding with
 * Astro's auto-generated type stub at `.astro/env.d.ts`. Astro picks up
 * any `.d.ts` file in the project root or `src/`, so location is
 * arbitrary as long as it's in scope.
 *
 * Set by `src/middleware.ts` on every request.
 */
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from './database.types';

declare global {
  namespace App {
    interface Locals {
      /** The verified Supabase Auth user, or `null` for anonymous requests. */
      user: User | null;
      /**
       * A cookie-aware Supabase client scoped to the current request.
       * RLS-enforced as the authenticated user. Use this for any
       * member-data query.
       */
      supabase: SupabaseClient<Database>;
      /**
       * Ops role, set by middleware on /admin/* routes only. 'admin'/'staff'
       * get full access; 'crew' (migration 0068) is the LIMITED pack/field role
       * restricted to the pack-house ops allowlist — AdminShell reads this to
       * render the reduced crew nav. Never set for members/anonymous.
       */
      adminRole?: 'admin' | 'staff' | 'crew';
      /** The admin/ops user's own customers.id, set on /admin/* routes. */
      adminCustomerId?: string;
      /**
       * Whether the current member has an active FLEX share. Set by
       * middleware on protected member routes (FIX 1, 2026-06-08) so
       * MemberShell can render the bottom-nav "Order" tab on every member
       * page without each page re-querying. `false` for non-flex members,
       * admins, and anonymous requests.
       */
      isFlexMember?: boolean;
      /**
       * Persistent member nags, computed ONCE per request in middleware
       * (SOFTENED gates, 2026-06-12) and consumed by MemberShell, which
       * renders unmissable non-dismissible top-of-page banners instead of
       * the old hard redirects. Only set (truthy) when at least one nag
       * applies, on protected member HTML routes for non-admin members:
       *   - needsPhone     → customers.phone empty/invalid (collect a cell
       *                       so we can text on arrival) → /account/add-phone
       *   - needsPickupAck → customers.pickup_acknowledged_at IS NULL
       *                       (confirm where/when they pick up) →
       *                       /account/confirm-pickup
       * Undefined when no nag applies (admins, satisfied members, the
       * interstitial pages themselves, onboarding funnel, anonymous).
       */
      memberNags?: { needsPhone: boolean; needsPickupAck: boolean };
    }
  }
}

export {};
