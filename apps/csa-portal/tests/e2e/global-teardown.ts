/**
 * Playwright "teardown" project — runs after the authenticated suite.
 *
 * Removes the deterministic box-swap fixture (and any swap it produced)
 * that global-setup seeded, so the real `box_contents` table isn't left
 * with a stray "E2E Test Greens" row for the upcoming Wednesday. Reads the
 * fixture sidecar; no-op if it's absent or null.
 *
 * Wired as the `teardown` of the `setup` project in playwright.config.ts,
 * so it runs once at the very end (even when the auth suite fails).
 */
import { test as teardown } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import {
  readTestEnv,
  cleanupSwapFixture,
  restoreTestMemberPickup,
  SWAP_FIXTURE_PATH,
  PICKUP_FIXTURE_PATH,
  type SwapFixture,
  type PickupSnapshot,
} from './supabase-fixtures';

teardown('clean up seeded fixtures', async () => {
  let env: ReturnType<typeof readTestEnv> | null = null;
  try {
    env = readTestEnv();
  } catch (err) {
    // No env → nothing to clean up against.
    // eslint-disable-next-line no-console
    console.warn('[e2e teardown] cleanup skipped (no env):', err instanceof Error ? err.message : err);
    return;
  }

  // Swap fixture.
  if (existsSync(SWAP_FIXTURE_PATH)) {
    const raw = readFileSync(SWAP_FIXTURE_PATH, 'utf8').trim();
    if (raw && raw !== 'null') {
      const fx = JSON.parse(raw) as SwapFixture;
      try {
        await cleanupSwapFixture(env, fx);
        // eslint-disable-next-line no-console
        console.log(`[e2e teardown] removed swap fixture "${fx.product}" (week ${fx.weekDate})`);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[e2e teardown] swap cleanup skipped:', err instanceof Error ? err.message : err);
      }
    }
  }

  // Pickup snapshot — RESTORE the test member's real pickup state.
  if (existsSync(PICKUP_FIXTURE_PATH)) {
    const raw = readFileSync(PICKUP_FIXTURE_PATH, 'utf8').trim();
    if (raw && raw !== 'null') {
      const snap = JSON.parse(raw) as PickupSnapshot;
      try {
        await restoreTestMemberPickup(env, snap);
        // eslint-disable-next-line no-console
        console.log(`[e2e teardown] restored pickup on ${snap.rows.length} active share(s)`);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[e2e teardown] pickup restore skipped:', err instanceof Error ? err.message : err);
      }
    }
  }
});
