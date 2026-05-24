/**
 * Supabase test fixtures for the CSA portal E2E harness.
 *
 * Two responsibilities:
 *   1. mintMemberStorageState() — produce Playwright auth cookies for the
 *      dedicated TEST MEMBER WITHOUT an email round-trip, using the
 *      service-role admin API. This is the crux of testing a magic-link
 *      portal: we generate a magic-link `hashed_token` server-side
 *      (no email is sent), exchange it for a real session via the anon
 *      client's verifyOtp, then re-emit that session as cookies through
 *      the SAME `@supabase/ssr` server client the app's middleware reads
 *      — so the cookie name + encoding can never drift from the app.
 *
 *   2. seedSwapFixture() / cleanupSwapFixture() — guarantee the test
 *      member has exactly one swappable box item for the upcoming
 *      Wednesday, so the /box swap journey is genuinely exercisable even
 *      when the real season hasn't posted a box yet. Idempotent + cleaned
 *      up after the run. Service-role only (box_contents has no member
 *      write policy by design).
 *
 * NEVER hardcode credentials. All keys come from process.env, loaded from
 * the portal's .env / .env.test by load-env.ts.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { fileURLToPath } from 'node:url';

/** Auth cookie state file the `setup` project writes + `authenticated` reads. */
export const STORAGE_STATE = fileURLToPath(
  new URL('./.auth/member.json', import.meta.url)
);

/** Sidecar describing the seeded box-swap fixture, read by box.spec.ts. */
export const SWAP_FIXTURE_PATH = fileURLToPath(
  new URL('./.auth/swap-fixture.json', import.meta.url)
);

/** Sidecar snapshotting the test member's pickup state, restored on teardown. */
export const PICKUP_FIXTURE_PATH = fileURLToPath(
  new URL('./.auth/pickup-fixture.json', import.meta.url)
);

export interface TestEnv {
  supabaseUrl: string;
  anonKey: string;
  serviceKey: string;
  testEmail: string;
}

/** Read + validate the env the harness needs. Throws a clear error if any is missing. */
export function readTestEnv(): TestEnv {
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL ?? '';
  const anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const testEmail = process.env.E2E_TEST_EMAIL ?? 'test@test.com';

  const missing: string[] = [];
  if (!supabaseUrl) missing.push('PUBLIC_SUPABASE_URL');
  if (!anonKey) missing.push('PUBLIC_SUPABASE_ANON_KEY');
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length > 0) {
    throw new Error(
      `[e2e] Missing required env: ${missing.join(', ')}. ` +
        `Set them in apps/csa-portal/.env (or .env.test), or as CI secrets. ` +
        `See .env.test.example.`
    );
  }
  return { supabaseUrl, anonKey, serviceKey, testEmail };
}

/** A project-ref-scoped Supabase project-ref, e.g. `melizsvabemhaqeaqtyw`. */
export function projectRef(supabaseUrl: string): string {
  const m = /^https?:\/\/([^.]+)\.supabase\.co/.exec(supabaseUrl);
  return m?.[1] ?? 'unknown';
}

function adminClient(env: TestEnv): SupabaseClient {
  return createClient(env.supabaseUrl, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Ensure the test member's auth.users row exists. Idempotent: if the user
 * already exists, createUser returns a 422 we treat as "already there".
 * We confirm the email so it can sign in immediately.
 */
async function ensureAuthUser(env: TestEnv): Promise<void> {
  const admin = adminClient(env);
  const { error } = await admin.auth.admin.createUser({
    email: env.testEmail,
    email_confirm: true,
  });
  // 422 = user already registered. Anything else is a real failure.
  if (error && error.status !== 422) {
    throw new Error(
      `[e2e] could not ensure test auth user "${env.testEmail}": ${error.message}`
    );
  }
}

export interface MintedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Lax';
}

/**
 * Mint Playwright cookies that authenticate the test member at `baseUrl`.
 *
 * Steps:
 *   1. ensure the auth user exists
 *   2. admin.generateLink(magiclink) → hashed_token (NO email sent)
 *   3. anon.verifyOtp(token_hash) → real access + refresh tokens
 *   4. ssr.setSession() with a capturing cookie jar → exact app cookies
 *   5. map to Playwright cookie shape for the baseUrl host
 */
export async function mintMemberCookies(
  env: TestEnv,
  baseUrl: string
): Promise<MintedCookie[]> {
  await ensureAuthUser(env);

  const admin = adminClient(env);
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: env.testEmail,
  });
  if (linkErr || !link?.properties?.hashed_token) {
    throw new Error(
      `[e2e] generateLink failed for "${env.testEmail}": ${
        linkErr?.message ?? 'no hashed_token returned'
      }`
    );
  }

  const anon = createClient(env.supabaseUrl, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: verified, error: verifyErr } = await anon.auth.verifyOtp({
    type: 'magiclink',
    token_hash: link.properties.hashed_token,
  });
  if (verifyErr || !verified?.session) {
    throw new Error(
      `[e2e] verifyOtp failed: ${verifyErr?.message ?? 'no session returned'}`
    );
  }

  // Re-emit the session as cookies via the SAME SSR client the app uses,
  // so the cookie name + base64 chunk encoding match middleware exactly.
  const captured: { name: string; value: string; options?: Record<string, unknown> }[] = [];
  const server = createServerClient(env.supabaseUrl, env.anonKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll(toSet) {
        for (const c of toSet) captured.push(c);
      },
    },
  });
  const { error: setErr } = await server.auth.setSession({
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
  });
  if (setErr) {
    throw new Error(`[e2e] setSession (cookie emit) failed: ${setErr.message}`);
  }
  if (captured.length === 0) {
    throw new Error('[e2e] SSR client emitted no auth cookies — encoding changed?');
  }

  const host = new URL(baseUrl).hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  // 30-day expiry is plenty for a test run; the refresh token would
  // rotate on first request anyway.
  const expires = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

  return captured.map((c) => ({
    name: c.name,
    value: c.value,
    domain: host,
    path: '/',
    expires,
    httpOnly: true,
    // Secure cookies require https — Playwright will reject a secure cookie
    // on an http://localhost origin, so only mark secure off-localhost.
    secure: !isLocal,
    sameSite: 'Lax' as const,
  }));
}

// ── Swap fixture ──────────────────────────────────────────────────────

/** Compute the upcoming Wednesday (YYYY-MM-DD) in America/New_York. */
export function upcomingWednesdayET(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? '';
  const dayIndex: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const todayIdx = dayIndex[get('weekday')] ?? 0;
  const daysUntilWed = (3 - todayIdx + 7) % 7;
  const todayET = new Date(`${get('year')}-${get('month')}-${get('day')}T12:00:00Z`);
  const wed = new Date(todayET.getTime() + daysUntilWed * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(wed);
}

export interface SwapFixture {
  weekDate: string;
  shareType: string;
  product: string;
  options: string[];
}

/** The deterministic item the swap test drives. Prefixed so it's obvious in data. */
export const SWAP_FIXTURE_PRODUCT = 'E2E Test Greens';
export const SWAP_FIXTURE_OPTIONS = ['E2E Test Carrots', 'E2E Test Radish'];

/**
 * Find the test member's first live share_type, then ensure a swappable
 * box_contents row exists for (upcoming Wednesday, that share_type).
 * Returns the fixture, or null if the member has no live share (in which
 * case the swap test self-skips).
 */
export async function seedSwapFixture(env: TestEnv): Promise<SwapFixture | null> {
  const admin = adminClient(env);

  // Resolve the test member's live share type.
  const { data: customer, error: custErr } = await admin
    .from('customers')
    .select('id, members(id, share_type, status)')
    .eq('email', env.testEmail)
    .maybeSingle();
  if (custErr) {
    throw new Error(`[e2e] swap fixture: customer lookup failed: ${custErr.message}`);
  }
  const members = ((customer as { members?: { share_type: string; status: string }[] } | null)
    ?.members) ?? [];
  const live = members.find((m) =>
    ['active', 'paused', 'onboarding'].includes(m.status)
  );
  if (!live) return null;

  const weekDate = upcomingWednesdayET();
  const shareType = live.share_type;

  // Clear any prior swap on this fixture row so re-runs start clean, then
  // upsert the box row.
  await admin
    .from('box_swaps')
    .delete()
    .eq('week_date', weekDate)
    .eq('original_item', SWAP_FIXTURE_PRODUCT);

  // Remove a stale fixture row then insert a fresh one (no UNIQUE to upsert on).
  await admin
    .from('box_contents')
    .delete()
    .eq('week_date', weekDate)
    .eq('share_type', shareType)
    .eq('product_name', SWAP_FIXTURE_PRODUCT);

  const { error: insErr } = await admin.from('box_contents').insert({
    week_date: weekDate,
    share_type: shareType,
    product_name: SWAP_FIXTURE_PRODUCT,
    variety: null,
    quantity: 1,
    unit: 'bunch',
    is_swappable: true,
    swap_options: SWAP_FIXTURE_OPTIONS,
  });
  if (insErr) {
    throw new Error(`[e2e] swap fixture: box_contents insert failed: ${insErr.message}`);
  }

  return { weekDate, shareType, product: SWAP_FIXTURE_PRODUCT, options: SWAP_FIXTURE_OPTIONS };
}

// ── Pickup-nudge fixture ───────────────────────────────────────────────
//
// FIX 1 (2026-05-24) added a "choose your pickup" forcing-nudge banner that
// renders for an ACTIVE member who has NO pickup_location_id AND no
// delivery_address on any active share. To assert it DETERMINISTICALLY (not
// flakily, depending on whatever pickup the real test member happens to
// have), the harness SNAPSHOTS the test member's active-share pickup state,
// CLEARS it for the run, and RESTORES it on teardown. Service-role only
// (members has admin-bypass; clearing is a controlled test mutation).

export interface PickupSnapshotRow {
  id: string;
  pickup_location_id: string | null;
  delivery_address: string | null;
}

export interface PickupSnapshot {
  /** The active member rows whose pickup we cleared, with prior values. */
  rows: PickupSnapshotRow[];
}

/**
 * Snapshot + clear the test member's pickup/delivery on every ACTIVE share,
 * so the no-pickup nudge banner is guaranteed to render during the run.
 * Returns the snapshot (restore it on teardown). Returns null when the
 * member has no active share (nothing to clear → the banner won't show, and
 * the banner test self-skips).
 */
export async function clearTestMemberPickup(
  env: TestEnv
): Promise<PickupSnapshot | null> {
  const admin = adminClient(env);

  // Resolve the test member's customer + active member rows.
  const { data: customer, error: custErr } = await admin
    .from('customers')
    .select('id, members(id, status, pickup_location_id, delivery_address)')
    .eq('email', env.testEmail)
    .maybeSingle();
  if (custErr) {
    throw new Error(`[e2e] pickup fixture: customer lookup failed: ${custErr.message}`);
  }
  const members =
    ((customer as {
      members?: {
        id: string;
        status: string;
        pickup_location_id: string | null;
        delivery_address: string | null;
      }[];
    } | null)?.members) ?? [];

  const active = members.filter((m) => m.status === 'active');
  if (active.length === 0) return null;

  const rows: PickupSnapshotRow[] = active.map((m) => ({
    id: m.id,
    pickup_location_id: m.pickup_location_id,
    delivery_address: m.delivery_address,
  }));

  // Clear pickup + delivery on each active row.
  for (const r of rows) {
    const { error: updErr } = await admin
      .from('members')
      .update({ pickup_location_id: null, delivery_address: null })
      .eq('id', r.id);
    if (updErr) {
      throw new Error(`[e2e] pickup fixture: clear failed for ${r.id}: ${updErr.message}`);
    }
  }

  return { rows };
}

/** Restore the snapshotted pickup/delivery on each row. Best-effort. */
export async function restoreTestMemberPickup(
  env: TestEnv,
  snap: PickupSnapshot
): Promise<void> {
  const admin = adminClient(env);
  for (const r of snap.rows) {
    await admin
      .from('members')
      .update({
        pickup_location_id: r.pickup_location_id,
        delivery_address: r.delivery_address,
      })
      .eq('id', r.id);
  }
}

// ── Stop Notes fixture (chat Phase 0) ──────────────────────────────────
//
// Proves the migration-0029 read-scoping end to end: a member at stop A sees
// a staff-posted note for stop A and does NOT see a note posted at stop B.
//
// We can't rely on the test member's real pickup (global-setup CLEARS it for
// the FIX-1 banner test). So this fixture, run in the stop-notes spec's
// beforeAll via service-role:
//   1. creates two ephemeral pickup locations (A, B),
//   2. points the member's first active share at location A (snapshotting the
//      prior pickup so afterAll restores it),
//   3. inserts one staff note at A (must be visible) and one at B (must be
//      hidden from this member by RLS).
// afterAll deletes the notes + locations + restores the share's pickup.
//
// Service-role only (controlled test mutation; members + stop_messages both
// have admin/service-role write paths, and stop_messages has NO member insert
// policy by design in Phase 0).

export const STOP_NOTE_A_BODY = 'E2E Stop A note — under the blue tent today.';
export const STOP_NOTE_B_BODY = 'E2E Stop B note — you should NOT see this.';
const STOP_LOC_A_NAME = 'E2E Stop A (Highland Park)';
const STOP_LOC_B_NAME = 'E2E Stop B (Bloomfield)';

export interface StopNotesFixture {
  /** The member share row we re-pointed (to restore on teardown). */
  memberId: string;
  /** The share's prior pickup state (restored on teardown). */
  priorPickupLocationId: string | null;
  priorDeliveryAddress: string | null;
  /** The two ephemeral locations we created. */
  locationAId: string;
  locationBId: string;
}

/**
 * Seed the cross-stop isolation fixture. Returns the fixture, or null when the
 * test member has no active share to re-point (the spec self-skips then).
 */
export async function seedStopNotesFixture(env: TestEnv): Promise<StopNotesFixture | null> {
  const admin = adminClient(env);

  // Resolve the test member's customer + an active share to re-point, plus an
  // author customer id for the notes (the owner/admin if present, else the
  // member's own customer — the FK only needs ANY valid customers row).
  const { data: customer, error: custErr } = await admin
    .from('customers')
    .select('id, members(id, status, pickup_location_id, delivery_address)')
    .eq('email', env.testEmail)
    .maybeSingle();
  if (custErr) {
    throw new Error(`[e2e] stop-notes fixture: customer lookup failed: ${custErr.message}`);
  }
  const cust = customer as
    | {
        id: string;
        members?: {
          id: string;
          status: string;
          pickup_location_id: string | null;
          delivery_address: string | null;
        }[];
      }
    | null;
  const active = (cust?.members ?? []).find((m) => m.status === 'active');
  if (!cust || !active) return null;

  // Author for the notes: prefer an admin/staff customer; fall back to the
  // member's own customer id (valid FK target either way).
  const { data: adminRow } = await admin
    .from('customers')
    .select('id')
    .in('role', ['admin', 'staff'])
    .limit(1)
    .maybeSingle();
  const authorId = (adminRow as { id: string } | null)?.id ?? cust.id;

  // 1. Create two ephemeral locations.
  const { data: locs, error: locErr } = await admin
    .from('pickup_locations')
    .insert([
      { name: STOP_LOC_A_NAME, state: 'PA', is_active: true },
      { name: STOP_LOC_B_NAME, state: 'PA', is_active: true },
    ])
    .select('id, name');
  if (locErr || !locs || locs.length !== 2) {
    throw new Error(`[e2e] stop-notes fixture: location create failed: ${locErr?.message ?? 'no rows'}`);
  }
  const locA = (locs as { id: string; name: string }[]).find((l) => l.name === STOP_LOC_A_NAME)!;
  const locB = (locs as { id: string; name: string }[]).find((l) => l.name === STOP_LOC_B_NAME)!;

  // 2. Point the member's active share at location A (snapshot prior state).
  const prior = {
    memberId: active.id,
    priorPickupLocationId: active.pickup_location_id,
    priorDeliveryAddress: active.delivery_address,
  };
  const { error: updErr } = await admin
    .from('members')
    .update({ pickup_location_id: locA.id, delivery_address: null })
    .eq('id', active.id);
  if (updErr) {
    throw new Error(`[e2e] stop-notes fixture: re-point member failed: ${updErr.message}`);
  }

  // 3. Insert one visible staff note at A, one at B.
  const { error: noteErr } = await admin.from('stop_messages').insert([
    {
      pickup_location_id: locA.id,
      author_customer_id: authorId,
      author_display_name: 'Todd',
      author_role: 'staff',
      body: STOP_NOTE_A_BODY,
    },
    {
      pickup_location_id: locB.id,
      author_customer_id: authorId,
      author_display_name: 'Todd',
      author_role: 'staff',
      body: STOP_NOTE_B_BODY,
    },
  ]);
  if (noteErr) {
    throw new Error(`[e2e] stop-notes fixture: note insert failed: ${noteErr.message}`);
  }

  return {
    memberId: prior.memberId,
    priorPickupLocationId: prior.priorPickupLocationId,
    priorDeliveryAddress: prior.priorDeliveryAddress,
    locationAId: locA.id,
    locationBId: locB.id,
  };
}

/** Tear down the stop-notes fixture: delete notes + locations, restore pickup. */
export async function cleanupStopNotesFixture(
  env: TestEnv,
  fx: StopNotesFixture
): Promise<void> {
  const admin = adminClient(env);
  // Restore the member's original pickup FIRST (so it's never left pointing at
  // a location we're about to delete).
  await admin
    .from('members')
    .update({
      pickup_location_id: fx.priorPickupLocationId,
      delivery_address: fx.priorDeliveryAddress,
    })
    .eq('id', fx.memberId);
  // Deleting the locations CASCADEs the notes (stop_messages FK is ON DELETE
  // CASCADE), but delete notes explicitly too in case the cascade is ever
  // loosened.
  await admin
    .from('stop_messages')
    .delete()
    .in('pickup_location_id', [fx.locationAId, fx.locationBId]);
  await admin
    .from('pickup_locations')
    .delete()
    .in('id', [fx.locationAId, fx.locationBId]);
}

/** Remove the seeded fixture + any swap it produced. Best-effort. */
export async function cleanupSwapFixture(env: TestEnv, fx: SwapFixture): Promise<void> {
  const admin = adminClient(env);
  await admin
    .from('box_swaps')
    .delete()
    .eq('week_date', fx.weekDate)
    .eq('original_item', fx.product);
  await admin
    .from('box_contents')
    .delete()
    .eq('week_date', fx.weekDate)
    .eq('share_type', fx.shareType)
    .eq('product_name', fx.product);
}
