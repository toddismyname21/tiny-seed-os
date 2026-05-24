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
  SWAP_FIXTURE_PATH,
  type SwapFixture,
} from './supabase-fixtures';

teardown('clean up seeded fixtures', async () => {
  if (!existsSync(SWAP_FIXTURE_PATH)) return;
  const raw = readFileSync(SWAP_FIXTURE_PATH, 'utf8').trim();
  if (!raw || raw === 'null') return;

  const fx = JSON.parse(raw) as SwapFixture;
  try {
    const env = readTestEnv();
    await cleanupSwapFixture(env, fx);
    // eslint-disable-next-line no-console
    console.log(`[e2e teardown] removed swap fixture "${fx.product}" (week ${fx.weekDate})`);
  } catch (err) {
    // Teardown must never fail the run — log and move on.
    // eslint-disable-next-line no-console
    console.warn('[e2e teardown] cleanup skipped:', err instanceof Error ? err.message : err);
  }
});
