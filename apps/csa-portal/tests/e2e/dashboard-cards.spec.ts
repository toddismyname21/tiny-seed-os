/**
 * Dashboard cards — pickup + delivery schedule (2026-06-05).
 *
 * Members were emailing that they couldn't find/change their pickup, or
 * understand their weekly vs. Week A / Week B schedule. The dashboard now
 * surfaces two cards: a PickupCard (current stop + "Change pickup location")
 * and a ScheduleCard (plain-language cadence + the member's upcoming dates).
 *
 * Uses the storageState minted by global-setup (logged in as the test
 * member). global-setup CLEARS the test member's pickup for the FIX-1 banner
 * test, so we can't lean on real state: each describe seeds a known share
 * state (pickup stop + share_type + biweekly_week) via service-role,
 * asserts the dashboard cards, then restores. If the member has no active
 * share to re-point, the describe self-skips.
 *
 * The schedule dates are NOT hard-coded here — we assert STRUCTURE (the
 * weekly card says "every week", the biweekly card says "every other week"
 * and lists upcoming-date chips). The exact dates are proven by the pure
 * unit tests in src/lib/schedule.test.ts.
 */
import { test, expect } from '@playwright/test';
import {
  readTestEnv,
  seedDashboardCardsFixture,
  cleanupDashboardCardsFixture,
  type DashboardCardsFixture,
  type TestEnv,
} from './supabase-fixtures';

let env: TestEnv | null = null;

// ── Weekly member ──────────────────────────────────────────────────────
test.describe('dashboard cards — WEEKLY member', () => {
  let fixture: DashboardCardsFixture | null = null;

  test.beforeAll(async () => {
    env = readTestEnv();
    fixture = await seedDashboardCardsFixture(env, null); // null → weekly
  });

  test.afterAll(async () => {
    if (env && fixture) await cleanupDashboardCardsFixture(env, fixture);
  });

  test('shows pickup card with the stop + a Change pickup action', async ({ page }) => {
    test.skip(!fixture, 'test member has no active share to re-point');
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard\b/);

    const pickupCard = page.locator('[data-pickup-card]');
    await expect(pickupCard).toBeVisible();
    await expect(pickupCard).toHaveAttribute('data-mode', 'pickup');
    // Stop name + day are shown.
    await expect(pickupCard).toContainText(fixture!.stopName);
    await expect(pickupCard).toContainText(/Wednesdays/i);
    // The primary action links to the pickup chooser (≤2 taps to change).
    const changeCta = pickupCard.getByRole('link', { name: /change pickup location/i });
    await expect(changeCta).toBeVisible();
    await expect(changeCta).toHaveAttribute('href', '/account/pickup');
  });

  test('shows a WEEKLY schedule card ("every week")', async ({ page }) => {
    test.skip(!fixture, 'test member has no active share to re-point');
    await page.goto('/dashboard');

    const scheduleCard = page.locator('[data-schedule-card]');
    await expect(scheduleCard).toBeVisible();
    await expect(scheduleCard).toHaveAttribute('data-cadence', 'weekly');
    await expect(scheduleCard).toContainText(/every week/i);
    // Weekly card intentionally has NO upcoming-date chip list.
    await expect(scheduleCard.locator('[data-upcoming-dates]')).toHaveCount(0);
  });

  test('Change pickup CTA navigates to the chooser', async ({ page }) => {
    test.skip(!fixture, 'test member has no active share to re-point');
    await page.goto('/dashboard');
    await page
      .locator('[data-pickup-card]')
      .getByRole('link', { name: /change pickup location/i })
      .click();
    await expect(page).toHaveURL(/\/account\/pickup\b/);
    await expect(page.getByRole('heading', { name: /your pickup location/i })).toBeVisible();
  });
});

// ── Biweekly Week-A member ───────────────────────────────────────────────
test.describe('dashboard cards — BIWEEKLY member', () => {
  let fixture: DashboardCardsFixture | null = null;

  test.beforeAll(async () => {
    env = readTestEnv();
    fixture = await seedDashboardCardsFixture(env, 'A'); // 'A' → biweekly
  });

  test.afterAll(async () => {
    if (env && fixture) await cleanupDashboardCardsFixture(env, fixture);
  });

  test('shows a BIWEEKLY schedule card with upcoming-date chips', async ({ page }) => {
    test.skip(!fixture, 'test member has no active share to re-point');
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard\b/);

    const scheduleCard = page.locator('[data-schedule-card]');
    await expect(scheduleCard).toBeVisible();
    await expect(scheduleCard).toHaveAttribute('data-cadence', 'biweekly');
    await expect(scheduleCard).toContainText(/every other week/i);

    // The biweekly card lists the member's actual upcoming delivery dates.
    const chips = scheduleCard.locator('[data-upcoming-dates] li');
    expect(await chips.count()).toBeGreaterThan(0);

    // Plain-language "why" + a link to change the schedule.
    await expect(scheduleCard).toContainText(/why every other week/i);
    await expect(
      scheduleCard.getByRole('link', { name: /change your schedule/i })
    ).toHaveAttribute('href', '/account/biweekly-schedule');
  });

  test('pickup card still renders for the biweekly member', async ({ page }) => {
    test.skip(!fixture, 'test member has no active share to re-point');
    await page.goto('/dashboard');
    const pickupCard = page.locator('[data-pickup-card]');
    await expect(pickupCard).toBeVisible();
    await expect(pickupCard).toContainText(fixture!.stopName);
  });
});
