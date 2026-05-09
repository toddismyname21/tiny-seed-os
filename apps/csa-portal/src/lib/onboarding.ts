/**
 * Onboarding step-detection helpers (Day 6).
 *
 * The onboarding flow is URL-driven: each step is its own page so a
 * member can close the browser, log back in, and resume where they left
 * off. State is persisted to the `member_preferences` table — the
 * presence of a row + the completeness of its fields tell us how far
 * the user has progressed.
 *
 * Step ladder:
 *
 *   1. welcome       (always shown — landing pad)
 *   2. box-preview   (always shown — read-only)
 *   3. preferences   (writes member_preferences.dislikes / allergies / delivery_notes)
 *   4. contact       (writes member_preferences.contact_preference / newsletter_opt_in
 *                    + customers.phone)
 *   5. confirm       (writes members.status = 'active' on submit)
 *
 * To detect "have they done step 3?" we check that a row exists in
 * `member_preferences`. To detect "have they done step 4?" we check
 * `member_preferences.contact_preference` was actually set by the user
 * (we sentinel that by looking at `updated_at` being meaningfully newer
 * than `created_at`, but simpler: contact step always writes
 * `newsletter_opt_in` AND we look at customer.phone OR a tracked flag).
 *
 * For Day 6 we use a simple, defensible model:
 *   - no member_preferences row             → resume at step 3 (preferences)
 *   - row exists, no contact step done yet  → resume at step 4 (contact)
 *   - both done                             → resume at step 5 (confirm)
 *
 * "Contact step done" is tracked via a JSONB flag on
 * `member_preferences.preferred_swaps` because we already have that
 * column and it's unused at this phase. Keys live under the
 * `_onboarding` namespace so we don't collide with future swap-rule
 * usage:
 *
 *   preferred_swaps._onboarding.contact_done = true
 *
 * (We could also add a column, but we'd rather not migrate the schema
 *  for a transient flag. Once a member is `status='active'` this flag
 *  is irrelevant and can be cleared at leisure.)
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from './database.types';

export type OnboardingStep =
  | 'welcome'
  | 'box-preview'
  | 'preferences'
  | 'contact'
  | 'confirm';

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  'welcome',
  'box-preview',
  'preferences',
  'contact',
  'confirm',
] as const;

/**
 * Result of resolving a user's onboarding context.
 *
 * - `member` is the *first* members row whose status is 'onboarding'.
 *   In practice every customer will have at most one onboarding share
 *   active at a time, but we defensively pick the most recently
 *   updated one if multiple exist.
 * - `nextStep` is the earliest step the user has not yet completed.
 * - `prefs` is the member's existing preferences row, if any.
 */
export interface OnboardingContext {
  member: {
    id: string;
    customer_id: string;
    share_type: Database['public']['Tables']['members']['Row']['share_type'];
    share_size: Database['public']['Tables']['members']['Row']['share_size'];
    season: string;
    start_date: string;
    end_date: string;
    total_weeks: number;
    weeks_remaining: number;
    pickup_location_id: string | null;
    delivery_address: string | null;
    status: string;
  };
  prefs: Database['public']['Tables']['member_preferences']['Row'] | null;
  customer: {
    id: string;
    contact_name: string;
    email: string;
    phone: string | null;
  };
  /** Earliest incomplete step. */
  nextStep: OnboardingStep;
  /** True if `?step=preferences` is fully filled. */
  preferencesDone: boolean;
  /** True if `?step=contact` is fully filled. */
  contactDone: boolean;
}

interface OnboardingFlags {
  contact_done?: boolean;
}

/**
 * Read the onboarding flags JSON blob safely. Returns an empty object
 * if the column is missing, malformed, or doesn't have our namespace.
 */
export function readOnboardingFlags(prefs: { preferred_swaps: Json } | null): OnboardingFlags {
  if (!prefs) return {};
  const ps = prefs.preferred_swaps;
  if (!ps || typeof ps !== 'object' || Array.isArray(ps)) return {};
  const ns = (ps as Record<string, Json>)._onboarding;
  if (!ns || typeof ns !== 'object' || Array.isArray(ns)) return {};
  return ns as OnboardingFlags;
}

/**
 * Merge a flag update into the existing preferred_swaps blob without
 * stomping any non-onboarding swap rules a future feature might add.
 */
export function withOnboardingFlag(
  existing: Json | null | undefined,
  flag: keyof OnboardingFlags,
  value: boolean
): Json {
  const base: Record<string, Json> =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, Json>) }
      : {};
  const ns =
    base._onboarding &&
    typeof base._onboarding === 'object' &&
    !Array.isArray(base._onboarding)
      ? { ...(base._onboarding as Record<string, Json>) }
      : {};
  ns[flag] = value;
  base._onboarding = ns as Json;
  return base as Json;
}

/**
 * Look up the current user's onboarding state. Returns `null` if the
 * user has no onboarding-status members row — caller should treat that
 * as "not in onboarding" and let normal routing apply.
 *
 * Uses the cookie-aware (RLS-scoped) supabase client, so even though
 * this query nominally crosses customers + members + member_preferences
 * the database will only return rows the auth.jwt()->>'email' user owns.
 */
export async function resolveOnboardingContext(
  supabase: SupabaseClient<Database>,
  userEmail: string
): Promise<OnboardingContext | null> {
  // 1. Customer + their members in one round-trip. RLS limits results
  //    to the row matching auth.jwt()->>'email', so this is safe.
  //    We `.overrideTypes()` because supabase-js's generic type inference
  //    collapses to `never` when an embedded select string is passed
  //    to .select() with a hand-rolled Database stub. The runtime
  //    behavior is unchanged — this is purely a type narrowing for the
  //    response shape we know we're requesting.
  type CustomerWithMembers = {
    id: string;
    contact_name: string;
    email: string;
    phone: string | null;
    members: Array<{
      id: string;
      customer_id: string;
      share_type: Database['public']['Tables']['members']['Row']['share_type'];
      share_size: Database['public']['Tables']['members']['Row']['share_size'];
      season: string;
      start_date: string;
      end_date: string;
      total_weeks: number;
      weeks_remaining: number;
      pickup_location_id: string | null;
      delivery_address: string | null;
      status: string;
      updated_at: string;
    }>;
  };

  const { data: customerRows, error: customerErr } = await supabase
    .from('customers')
    .select(
      `
      id,
      contact_name,
      email,
      phone,
      members (
        id,
        customer_id,
        share_type,
        share_size,
        season,
        start_date,
        end_date,
        total_weeks,
        weeks_remaining,
        pickup_location_id,
        delivery_address,
        status,
        updated_at
      )
    `
    )
    .eq('email', userEmail)
    .limit(1)
    .maybeSingle()
    .overrideTypes<CustomerWithMembers, { merge: false }>();

  if (customerErr) {
    console.error('[onboarding] customer lookup failed:', customerErr.message);
    return null;
  }
  if (!customerRows) return null;

  const onboardingMembers = (customerRows.members ?? []).filter(
    (m) => m.status === 'onboarding'
  );

  if (onboardingMembers.length === 0) return null;

  // Most-recently-updated wins if there are somehow multiple.
  onboardingMembers.sort((a, b) =>
    a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0
  );
  const member = onboardingMembers[0];

  // 2. Existing preferences row, if any.
  const { data: prefsRow, error: prefsErr } = await supabase
    .from('member_preferences')
    .select('*')
    .eq('member_id', member.id)
    .maybeSingle();

  if (prefsErr) {
    console.error('[onboarding] prefs lookup failed:', prefsErr.message);
  }

  const prefs = prefsRow ?? null;
  const flags = readOnboardingFlags(prefs);

  // Step decision:
  //   - no prefs row  → step 3 (preferences)
  //   - prefs but no contact_done flag → step 4 (contact)
  //   - both done → step 5 (confirm)
  //
  // Note steps 1 + 2 are "pass-through" pages — they don't write state
  // — so we never *resume* at them. A user who hits /onboarding (or
  // any out-of-flow URL) starts at /onboarding/welcome and clicks
  // through. If they bail mid-flow on step 3 they resume at step 3.
  let nextStep: OnboardingStep = 'preferences';
  if (prefs && flags.contact_done) {
    nextStep = 'confirm';
  } else if (prefs) {
    nextStep = 'contact';
  }

  return {
    member,
    prefs,
    customer: {
      id: customerRows.id,
      contact_name: customerRows.contact_name,
      email: customerRows.email,
      phone: customerRows.phone,
    },
    nextStep,
    preferencesDone: !!prefs,
    contactDone: !!flags.contact_done,
  };
}

/** Build a redirect URL for the current step. */
export function stepUrl(step: OnboardingStep): string {
  return `/onboarding/${step}`;
}

/**
 * CSRF: we accept a POST only if its Origin header matches the
 * configured site. Astro 6's CSRF feature does the same check, but we
 * belt-and-suspenders it inside the API routes too.
 */
export function isSameOriginPost(request: Request, expectedOrigin: string): boolean {
  if (request.method !== 'POST') return true;
  const origin = request.headers.get('origin');
  if (!origin) {
    // Some browsers strip Origin on same-origin POSTs from forms.
    // Fall back to Referer when Origin is absent.
    const referer = request.headers.get('referer');
    if (!referer) return false;
    try {
      const refOrigin = new URL(referer).origin;
      return refOrigin === expectedOrigin;
    } catch {
      return false;
    }
  }
  return origin === expectedOrigin;
}

/** The expected origin of POSTs in production. */
export const PORTAL_ORIGIN = 'https://csa.tinyseedfarm.com';
