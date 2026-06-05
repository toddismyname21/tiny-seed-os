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

/**
 * Mint an RLS-scoped Supabase client carrying the TEST MEMBER's real JWT
 * (magic-link → verifyOtp, no email sent). Used when a fixture must exercise
 * a path that keys on the caller's identity inside the database (e.g. the
 * home-delivery gate's `is_admin_caller()` — service-role carries no JWT, so
 * it can't stand in for "an admin did this"). The caller is responsible for
 * having promoted/demoted the member's `customers.role` as needed.
 */
export async function mintMemberJwtClient(env: TestEnv): Promise<SupabaseClient> {
  await ensureAuthUser(env);
  const admin = adminClient(env);
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: env.testEmail,
  });
  if (linkErr || !link?.properties?.hashed_token) {
    throw new Error(`[e2e] mintMemberJwtClient: generateLink failed: ${linkErr?.message ?? 'no token'}`);
  }
  const anon = createClient(env.supabaseUrl, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: verified, error: verifyErr } = await anon.auth.verifyOtp({
    type: 'magiclink',
    token_hash: link.properties.hashed_token,
  });
  if (verifyErr || !verified?.session) {
    throw new Error(`[e2e] mintMemberJwtClient: verifyOtp failed: ${verifyErr?.message ?? 'no session'}`);
  }
  return createClient(env.supabaseUrl, env.anonKey, {
    global: { headers: { Authorization: `Bearer ${verified.session.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
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

// ── Home-delivery gate (migration 0030) ────────────────────────────────
//
// Proves the revenue-leak fix at the DATABASE level: a MEMBER cannot set their
// own delivery_address through change_pickup_location() — the RPC rejects it
// with {error:'delivery_admin_only'} when is_admin_caller() is false. We mint
// a REAL member session token for the test member (same magic-link-without-
// email path mintMemberCookies uses) and call the RPC through an RLS-scoped
// client carrying that member's JWT, so is_admin_caller() evaluates the
// member's identity (not service-role, which carries no JWT). Service-role
// .rpc() bypasses RLS but is ALSO rejected here (no JWT → not admin), so this
// is the honest member-identity proof.

export interface DeliveryGateProof {
  /** The result the member-JWT RPC returned for a delivery-set attempt. */
  memberSetDeliveryResult: unknown;
  /**
   * Did a DIRECT member UPDATE of delivery_address (bypassing the RPC) get
   * blocked? The defense-in-depth trigger (migration 0030) must reject it,
   * so this is the error the REST update returned (truthy = blocked = good).
   */
  directUpdateError: string | null;
  /** delivery_address on the member's row BEFORE the attempt. */
  beforeAddress: string | null;
  /** delivery_address on the member's row AFTER both attempts (must == before). */
  afterAddress: string | null;
}

/**
 * Mint a real access token for the test member (no email round-trip), then call
 * change_pickup_location() to SET a delivery address through an RLS-scoped
 * client carrying that member's JWT. Returns the RPC result + the member row's
 * delivery_address before/after, so the spec can assert (a) the RPC rejected it
 * and (b) nothing was written. Returns null when the member has no member row
 * to target (spec self-skips). Read-only against the DB (the gate blocks the
 * write); no cleanup needed.
 */
export async function proveMemberCannotSetDelivery(
  env: TestEnv
): Promise<DeliveryGateProof | null> {
  const admin = adminClient(env);

  // Resolve the test member's first member row id + current delivery_address.
  const { data: customer, error: custErr } = await admin
    .from('customers')
    .select('id, members(id, status, delivery_address)')
    .eq('email', env.testEmail)
    .maybeSingle();
  if (custErr) {
    throw new Error(`[e2e] delivery-gate: customer lookup failed: ${custErr.message}`);
  }
  const members =
    ((customer as { members?: { id: string; status: string; delivery_address: string | null }[] } | null)
      ?.members) ?? [];
  // Prefer an active share; fall back to any share row.
  const target = members.find((m) => m.status === 'active') ?? members[0];
  if (!target) return null;

  // Mint a member session token (magic link → verifyOtp, no email sent).
  await ensureAuthUser(env);
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: env.testEmail,
  });
  if (linkErr || !link?.properties?.hashed_token) {
    throw new Error(`[e2e] delivery-gate: generateLink failed: ${linkErr?.message ?? 'no token'}`);
  }
  const anon = createClient(env.supabaseUrl, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: verified, error: verifyErr } = await anon.auth.verifyOtp({
    type: 'magiclink',
    token_hash: link.properties.hashed_token,
  });
  if (verifyErr || !verified?.session) {
    throw new Error(`[e2e] delivery-gate: verifyOtp failed: ${verifyErr?.message ?? 'no session'}`);
  }

  // RLS-scoped client carrying the MEMBER's JWT — is_admin_caller() = false.
  const asMember = createClient(env.supabaseUrl, env.anonKey, {
    global: { headers: { Authorization: `Bearer ${verified.session.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const beforeAddress = target.delivery_address;

  const { data: rpcData, error: rpcErr } = await asMember.rpc('change_pickup_location', {
    p_member_id: target.id,
    p_new_location_id: null,
    p_new_delivery_address: '999 E2E Leak Test Ave, Pittsburgh, PA 15206',
  });
  if (rpcErr) {
    // A hard RPC error (not the JSON {error} we expect) is itself a pass-ish
    // signal the write was blocked, but surface it so the spec sees it.
    throw new Error(`[e2e] delivery-gate: rpc threw: ${rpcErr.message}`);
  }

  // Also prove the DEFENSE-IN-DEPTH trigger: a member can't bypass the RPC
  // with a raw table UPDATE of delivery_address. members_self_update is
  // row-scoped, so without the trigger this would succeed. The trigger must
  // raise (REST surfaces it as an error). directUpdateError truthy = blocked.
  const { error: directErr } = await asMember
    .from('members')
    .update({ delivery_address: '888 E2E Direct Bypass St, Pittsburgh, PA 15206' })
    .eq('id', target.id);
  const directUpdateError = directErr?.message ?? null;

  // Re-read the row via service role to confirm nothing was written by either.
  const { data: after } = await admin
    .from('members')
    .select('delivery_address')
    .eq('id', target.id)
    .maybeSingle();
  const afterAddress = (after as { delivery_address: string | null } | null)?.delivery_address ?? null;

  return { memberSetDeliveryResult: rpcData, directUpdateError, beforeAddress, afterAddress };
}

// ── Dashboard cards fixture (pickup + schedule, 2026-06-05) ────────────
//
// Proves the dashboard's PickupCard + ScheduleCard render correctly for a
// known member state. The test member's pickup is cleared by global-setup
// (FIX-1 banner test), so we can't lean on it: this fixture points the
// member's first active share at an ephemeral pickup stop, forces its
// share_type to a season-configured one (so the schedule card has real
// dates), and sets a chosen biweekly_week — snapshotting everything for an
// exact restore. Service-role only (controlled test mutation).

const DASHBOARD_STOP_NAME = 'E2E Dashboard Stop (Squirrel Hill)';

/** A deterministic home-delivery address used by the delivery-mode fixture. */
const DASHBOARD_DELIVERY_ADDRESS = '742 E2E Evergreen Terrace, Pittsburgh, PA 15206';

export interface DashboardCardsOptions {
  /** Cadence: null → weekly, 'A'/'B' → biweekly. */
  biweeklyWeek?: 'A' | 'B' | null;
  /** Seed a HOME-DELIVERY share (no pickup stop) instead of a pickup stop. */
  homeDelivery?: boolean;
  /**
   * Phone-prompt control for the NextDeliveryBanner:
   *   'clear' → blank the customer's phone (banner shows the prominent
   *             "Update your phone number" button)
   *   'set'   → set a phone (banner shows the subtle inline "Update" link)
   *   undefined → leave the phone as-is (snapshot still taken so restore is
   *             a no-op-safe write).
   */
  phone?: 'clear' | 'set';
}

export interface DashboardCardsFixture {
  memberId: string;
  /** Owning customer id (for the phone snapshot/restore). */
  customerId: string;
  /** Prior values, restored on teardown. */
  priorPickupLocationId: string | null;
  priorDeliveryAddress: string | null;
  priorShareType: string;
  priorBiweeklyWeek: 'A' | 'B' | null;
  priorPhone: string | null;
  /** Prior customers.role — only snapshotted when home-delivery mode flips it to admin. */
  priorRole: 'member' | 'admin' | 'staff' | null;
  /** The ephemeral pickup location we created (null in home-delivery mode). */
  locationId: string | null;
  /** What we set the share to (so the spec can assert against it). */
  stopName: string;
  deliveryAddress: string | null;
  shareType: 'summer_veg';
  biweeklyWeek: 'A' | 'B' | null;
  /** Did we set a phone (true) or clear it (false)? null = left as-is. */
  hasPhone: boolean | null;
}

/** Phone we set when opts.phone === 'set' — obviously a test value. */
const DASHBOARD_TEST_PHONE = '(412) 555-0100';

/**
 * Seed the dashboard-cards fixture.
 *
 * Backward compatible: callers may pass the legacy `biweeklyWeek` argument
 * directly (`seedDashboardCardsFixture(env, 'A')`) OR an options object
 * (`seedDashboardCardsFixture(env, { homeDelivery: true, phone: 'clear' })`).
 *
 * Controls the cadence the ScheduleCard shows (null → weekly, 'A'/'B' →
 * biweekly), whether the share is a pickup stop or home delivery, and the
 * customer's phone (to assert the NextDeliveryBanner's phone-prompt states).
 * Returns null when the member has no active share (the spec self-skips).
 */
export async function seedDashboardCardsFixture(
  env: TestEnv,
  arg: ('A' | 'B' | null) | DashboardCardsOptions
): Promise<DashboardCardsFixture | null> {
  const opts: DashboardCardsOptions =
    arg === null || arg === 'A' || arg === 'B' ? { biweeklyWeek: arg } : arg;
  const biweeklyWeek = opts.biweeklyWeek ?? null;
  const homeDelivery = opts.homeDelivery ?? false;

  const admin = adminClient(env);

  const { data: customer, error: custErr } = await admin
    .from('customers')
    .select('id, phone, role, members(id, status, pickup_location_id, delivery_address, share_type, biweekly_week)')
    .eq('email', env.testEmail)
    .maybeSingle();
  if (custErr) {
    throw new Error(`[e2e] dashboard-cards fixture: customer lookup failed: ${custErr.message}`);
  }
  const cust = customer as
    | {
        id: string;
        phone: string | null;
        role: 'member' | 'admin' | 'staff';
        members?: {
          id: string;
          status: string;
          pickup_location_id: string | null;
          delivery_address: string | null;
          share_type: string;
          biweekly_week: 'A' | 'B' | null;
        }[];
      }
    | null;
  const active = (cust?.members ?? []).find((m) => m.status === 'active');
  if (!cust || !active) return null;

  // 1. Pickup mode → create an ephemeral stop. Home-delivery mode → no stop.
  let locationId: string | null = null;
  if (!homeDelivery) {
    const { data: loc, error: locErr } = await admin
      .from('pickup_locations')
      .insert({
        name: DASHBOARD_STOP_NAME,
        city: 'Pittsburgh',
        state: 'PA',
        day_of_week: 'Wed',
        time_start: '15:00',
        time_end: '18:00',
        is_active: true,
        is_delivery_zone: false,
      })
      .select('id')
      .single();
    if (locErr || !loc) {
      throw new Error(`[e2e] dashboard-cards fixture: location create failed: ${locErr?.message ?? 'no row'}`);
    }
    locationId = (loc as { id: string }).id;
  }

  // 2. Snapshot everything we'll mutate, then re-point the active share.
  let hasPhone: boolean | null = null;
  if (opts.phone === 'clear') hasPhone = false;
  else if (opts.phone === 'set') hasPhone = true;

  const fixture: DashboardCardsFixture = {
    memberId: active.id,
    customerId: cust.id,
    priorPickupLocationId: active.pickup_location_id,
    priorDeliveryAddress: active.delivery_address,
    priorShareType: active.share_type,
    priorBiweeklyWeek: active.biweekly_week,
    priorPhone: cust.phone,
    priorRole: null,
    locationId,
    stopName: DASHBOARD_STOP_NAME,
    deliveryAddress: homeDelivery ? DASHBOARD_DELIVERY_ADDRESS : null,
    shareType: 'summer_veg',
    biweeklyWeek,
    hasPhone,
  };

  // Service-role write for the ungated fields (share_type, biweekly_week,
  // pickup). delivery_address is GATED by migration 0030's admin-only trigger,
  // so we clear it here and (for home-delivery mode) set it through the
  // admin-JWT RPC below — never a raw non-admin write.
  const { error: updErr } = await admin
    .from('members')
    .update({
      pickup_location_id: locationId,
      delivery_address: null,
      share_type: 'summer_veg',
      biweekly_week: biweeklyWeek,
    })
    .eq('id', active.id);
  if (updErr) {
    if (locationId) await admin.from('pickup_locations').delete().eq('id', locationId);
    throw new Error(`[e2e] dashboard-cards fixture: re-point member failed: ${updErr.message}`);
  }

  // Home-delivery mode: set delivery_address through change_pickup_location()
  // as an ADMIN. We temporarily promote the test member's customer to
  // role='admin' (snapshotting the prior role), mint that member's JWT (now
  // is_admin_caller() = TRUE), call the RPC, then demote. This mirrors the
  // ONLY legitimate path — the /api/admin/members/[id]/pickup endpoint — so
  // the fixture respects the gate instead of fighting it.
  if (homeDelivery) {
    fixture.priorRole = cust.role;
    const { error: promoteErr } = await admin
      .from('customers')
      .update({ role: 'admin' })
      .eq('id', cust.id);
    if (promoteErr) {
      if (locationId) await admin.from('pickup_locations').delete().eq('id', locationId);
      throw new Error(`[e2e] dashboard-cards fixture: promote-to-admin failed: ${promoteErr.message}`);
    }

    try {
      const asAdmin = await mintMemberJwtClient(env);
      const { data: rpcData, error: rpcErr } = await asAdmin.rpc('change_pickup_location', {
        p_member_id: active.id,
        p_new_location_id: null,
        p_new_delivery_address: DASHBOARD_DELIVERY_ADDRESS,
      });
      if (rpcErr) {
        throw new Error(`rpc threw: ${rpcErr.message}`);
      }
      const result = rpcData as { error?: string } | null;
      if (result && 'error' in result && result.error) {
        throw new Error(`rpc rejected: ${result.error}`);
      }
    } catch (e) {
      // Roll back everything we mutated so we don't leave a half-seeded admin.
      await admin.from('customers').update({ role: cust.role }).eq('id', cust.id);
      await admin
        .from('members')
        .update({
          pickup_location_id: fixture.priorPickupLocationId,
          delivery_address: fixture.priorDeliveryAddress,
          share_type: fixture.priorShareType,
          biweekly_week: fixture.priorBiweeklyWeek,
        })
        .eq('id', active.id);
      throw new Error(
        `[e2e] dashboard-cards fixture: set delivery via admin RPC failed: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }

    // Demote immediately — the delivery_address is now set and persisted.
    await admin.from('customers').update({ role: cust.role }).eq('id', cust.id);
  }

  // 3. Phone control (only when requested, so default runs don't touch it).
  if (opts.phone) {
    const newPhone = opts.phone === 'set' ? DASHBOARD_TEST_PHONE : null;
    const { error: phoneErr } = await admin
      .from('customers')
      .update({ phone: newPhone })
      .eq('id', cust.id);
    if (phoneErr) {
      // Roll back the member + location so we don't leave a half-seeded state.
      await admin
        .from('members')
        .update({
          pickup_location_id: fixture.priorPickupLocationId,
          delivery_address: fixture.priorDeliveryAddress,
          share_type: fixture.priorShareType,
          biweekly_week: fixture.priorBiweeklyWeek,
        })
        .eq('id', active.id);
      if (locationId) await admin.from('pickup_locations').delete().eq('id', locationId);
      throw new Error(`[e2e] dashboard-cards fixture: phone update failed: ${phoneErr.message}`);
    }
  }

  return fixture;
}

/** Tear down the dashboard-cards fixture: restore the share + phone, delete the stop. */
export async function cleanupDashboardCardsFixture(
  env: TestEnv,
  fx: DashboardCardsFixture
): Promise<void> {
  const admin = adminClient(env);

  // Restore the non-delivery fields (ungated) FIRST so the share never dangles
  // at a location we delete. We restore pickup + share_type + biweekly here.
  await admin
    .from('members')
    .update({
      pickup_location_id: fx.priorPickupLocationId,
      share_type: fx.priorShareType,
      biweekly_week: fx.priorBiweeklyWeek,
    })
    .eq('id', fx.memberId);

  // delivery_address is GATED by migration 0030's trigger (non-admin writes
  // are rejected). If we seeded home delivery (priorRole set), restore the
  // prior delivery_address through an ADMIN-JWT direct update — is_admin_caller()
  // is TRUE for that JWT, so the trigger allows it, AND a direct update can
  // restore the exact prior value (including null, which the RPC's
  // one-of-location-or-address contract won't accept). We re-promote, write,
  // then always demote.
  if (fx.priorRole !== null) {
    await admin.from('customers').update({ role: 'admin' }).eq('id', fx.customerId);
    try {
      const asAdmin = await mintMemberJwtClient(env);
      const { error: restoreErr } = await asAdmin
        .from('members')
        .update({
          pickup_location_id: fx.priorPickupLocationId,
          delivery_address: fx.priorDeliveryAddress,
        })
        .eq('id', fx.memberId);
      if (restoreErr) {
        // Surface but don't throw — demotion below must still run. A leaked
        // delivery_address would break later specs, so log loudly.
        console.error(
          `[e2e] dashboard-cards cleanup: admin delivery restore failed: ${restoreErr.message}`
        );
      }
    } finally {
      // Always demote back, even if the restore write hiccupped.
      await admin.from('customers').update({ role: fx.priorRole }).eq('id', fx.customerId);
    }
  }

  // Restore the phone only if we touched it.
  if (fx.hasPhone !== null) {
    await admin.from('customers').update({ phone: fx.priorPhone }).eq('id', fx.customerId);
  }
  if (fx.locationId) {
    await admin.from('pickup_locations').delete().eq('id', fx.locationId);
  }
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
