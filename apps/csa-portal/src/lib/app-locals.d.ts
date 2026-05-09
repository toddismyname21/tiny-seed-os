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
    }
  }
}

export {};
