/**
 * Stop Notes — read-only member view + cross-stop RLS isolation (chat Phase 0).
 *
 * Uses the storageState minted by global-setup (logged in as the test member).
 *
 * The load-bearing assertion (migration 0029 read-scoping): a member at stop A
 * sees a staff-posted note for stop A and does NOT see a note posted at stop B.
 * This is enforced at the DATABASE by the stop_messages_member_read RLS policy
 * (pickup_location_id IN current_member_location_ids()), so the spec is the
 * end-to-end proof of that policy, not a UI-only check.
 *
 * Self-contained fixturing: the test member's real pickup is cleared by
 * global-setup (for the FIX-1 banner test), so we can't lean on it. beforeAll
 * creates two ephemeral stops, points the member's active share at stop A, and
 * seeds one visible note at each stop; afterAll restores the member's pickup
 * and removes the ephemeral data. If the member has no active share to
 * re-point, the whole describe self-skips.
 */
import { test, expect } from '@playwright/test';
import {
  readTestEnv,
  seedStopNotesFixture,
  cleanupStopNotesFixture,
  STOP_NOTE_A_BODY,
  STOP_NOTE_B_BODY,
  type StopNotesFixture,
  type TestEnv,
} from './supabase-fixtures';

let env: TestEnv | null = null;
let fixture: StopNotesFixture | null = null;

test.describe('stop notes (read-only) + cross-stop RLS isolation', () => {
  test.beforeAll(async () => {
    env = readTestEnv();
    fixture = await seedStopNotesFixture(env);
  });

  test.afterAll(async () => {
    if (env && fixture) {
      await cleanupStopNotesFixture(env, fixture);
    }
  });

  test('member sees their stop A note and NOT stop B note', async ({ page }) => {
    test.skip(!fixture, 'test member has no active share to re-point onto a stop');

    await page.goto('/stop-notes');

    // Page rendered (not bounced to login), with the Stop Notes heading.
    await expect(page).toHaveURL(/\/stop-notes\b/);
    await expect(
      page.getByRole('heading', { name: /^stop notes$/i })
    ).toBeVisible();

    // The note for the member's OWN stop (A) is visible.
    await expect(page.getByText(STOP_NOTE_A_BODY)).toBeVisible();

    // The "Farm" role badge renders on the staff-authored note.
    await expect(page.getByText('Farm', { exact: true }).first()).toBeVisible();

    // The note for a DIFFERENT stop (B) must NOT appear anywhere — RLS filters
    // it out at the database, so it never reaches the page.
    await expect(page.getByText(STOP_NOTE_B_BODY)).toHaveCount(0);
  });

  test('empty-state copy is absent when the stop has a note', async ({ page }) => {
    test.skip(!fixture, 'test member has no active share to re-point onto a stop');
    await page.goto('/stop-notes');
    // With a seeded note present, the "No notes for your pickup yet" empty
    // state must NOT show for the member's stop.
    await expect(page.getByText(/no notes for your pickup yet/i)).toHaveCount(0);
  });

  test('dashboard surfaces a Stop Notes card linking to the page', async ({ page }) => {
    test.skip(!fixture, 'test member has no active share with a pickup location');
    await page.goto('/dashboard');
    const card = page.getByRole('link', { name: /stop notes/i });
    await expect(card.first()).toBeVisible();
    await card.first().click();
    await expect(page).toHaveURL(/\/stop-notes\b/);
  });
});
