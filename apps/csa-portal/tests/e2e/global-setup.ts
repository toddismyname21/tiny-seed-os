/**
 * Playwright "setup" project — the auth bootstrap.
 *
 * Runs once before the authenticated suite (declared as a dependency in
 * playwright.config.ts). It:
 *   1. Mints a real Supabase session for the test member WITHOUT email
 *      (service-role admin generateLink → verifyOtp → SSR cookie emit).
 *   2. Writes those cookies to a Playwright storageState file that the
 *      `authenticated` project loads, so every test starts logged in.
 *   3. Seeds a deterministic swappable box item for the test member's
 *      upcoming Wednesday so the /box swap journey is exercisable.
 *   4. Stashes the seeded fixture to a JSON sidecar for the box spec.
 *
 * This is a Playwright TEST (not a globalSetup function) so it reports as
 * a passing step and so its failures surface in the HTML report. If the
 * Supabase admin API is unreachable, this fails loudly and the dependent
 * authenticated suite is skipped — while the independent `unauth` project
 * still runs.
 */
import { test as setup, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  readTestEnv,
  mintMemberCookies,
  seedSwapFixture,
  clearTestMemberPickup,
  projectRef,
  STORAGE_STATE,
  SWAP_FIXTURE_PATH,
  PICKUP_FIXTURE_PATH,
} from './supabase-fixtures';

setup('authenticate test member + seed fixtures', async ({}, testInfo) => {
  const env = readTestEnv();
  const baseURL = testInfo.project.use.baseURL ?? 'http://localhost:4321';

  // 1 + 2. Mint cookies and write storageState.
  const cookies = await mintMemberCookies(env, baseURL);
  expect(cookies.length, 'expected at least one auth cookie').toBeGreaterThan(0);
  expect(
    cookies.some((c) => c.name === `sb-${projectRef(env.supabaseUrl)}-auth-token`),
    'expected the sb-<ref>-auth-token cookie'
  ).toBeTruthy();

  mkdirSync(dirname(STORAGE_STATE), { recursive: true });
  writeFileSync(
    STORAGE_STATE,
    JSON.stringify({ cookies, origins: [] }, null, 2),
    'utf8'
  );

  // 3 + 4. Seed the swap fixture (best-effort — a member with no live
  // share yields null, and the box spec self-skips the swap assertion).
  const fixture = await seedSwapFixture(env);
  writeFileSync(SWAP_FIXTURE_PATH, JSON.stringify(fixture, null, 2), 'utf8');

  // 5. Snapshot + clear the test member's pickup so the FIX-1 no-pickup
  //    nudge banner is deterministically present during the run. Restored
  //    on teardown. Null when the member has no active share (banner test
  //    self-skips).
  const pickupSnapshot = await clearTestMemberPickup(env);
  writeFileSync(PICKUP_FIXTURE_PATH, JSON.stringify(pickupSnapshot, null, 2), 'utf8');

  // eslint-disable-next-line no-console
  console.log(
    `[e2e setup] authenticated ${env.testEmail}; ` +
      (fixture
        ? `seeded swap fixture "${fixture.product}" (${fixture.shareType}, week ${fixture.weekDate}); `
        : 'no live share → swap fixture skipped; ') +
      (pickupSnapshot
        ? `cleared pickup on ${pickupSnapshot.rows.length} active share(s) (restored on teardown)`
        : 'no active share → pickup-nudge fixture skipped')
  );
});
