/**
 * Authenticated member journeys.
 *
 * Uses the storageState minted by global-setup, so `page` starts logged
 * in as the test member. Covers:
 *   - dashboard renders (greeting + bottom nav with 4 items)
 *   - each /account sub-page loads with no console errors
 *   - the persistent bottom nav is present on member pages
 *
 * Resilience: assertions target stable structure (roles, nav hrefs,
 * headings) over exact marketing copy, since the dashboard's body varies
 * by season phase (countdown vs. box vs. complete) and by what data the
 * test member happens to have.
 */
import { test, expect, type Page } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { PICKUP_FIXTURE_PATH } from './supabase-fixtures';

/**
 * Did global-setup clear the test member's pickup? (Only when they had an
 * active share — otherwise the FIX-1 banner can't render and the test
 * self-skips.) Read the snapshot sidecar global-setup wrote.
 */
function pickupWasCleared(): boolean {
  if (!existsSync(PICKUP_FIXTURE_PATH)) return false;
  const raw = readFileSync(PICKUP_FIXTURE_PATH, 'utf8').trim();
  if (!raw || raw === 'null') return false;
  try {
    const snap = JSON.parse(raw) as { rows?: unknown[] };
    return Array.isArray(snap.rows) && snap.rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Attach a console-error collector to a page. Returns a getter. We ignore
 * benign noise that doesn't indicate a broken page:
 *   - favicon / resource 404s (not app logic)
 *   - Supabase "Failed to load resource" style network blips that the app
 *     handles fail-soft (flex/Shopify are absent in the test env)
 */
function collectConsoleErrors(page: Page): () => string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/favicon/i.test(text)) return;
    if (/Failed to load resource/i.test(text)) return;
    errors.push(text);
  });
  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}`);
  });
  return () => errors;
}

const BOTTOM_NAV_ITEMS = ['Home', 'Box', 'Account', 'Help'];

test.describe('authenticated dashboard', () => {
  test('dashboard renders greeting + bottom nav (4 items)', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await page.goto('/dashboard');

    // Not redirected to login (auth worked).
    await expect(page).toHaveURL(/\/dashboard\b/);

    // Greeting heading ("Welcome back, <name>.")
    await expect(
      page.getByRole('heading', { name: /welcome back/i })
    ).toBeVisible();

    // Persistent bottom tab bar with exactly the 4 expected items.
    const primaryNav = page.getByRole('navigation', { name: 'Primary' });
    await expect(primaryNav).toBeVisible();
    for (const label of BOTTOM_NAV_ITEMS) {
      await expect(primaryNav.getByRole('link', { name: label })).toBeVisible();
    }
    const navLinks = primaryNav.getByRole('link');
    await expect(navLinks).toHaveCount(BOTTOM_NAV_ITEMS.length);

    // Active tab is Home.
    await expect(
      primaryNav.locator('a[aria-current="page"]')
    ).toContainText('Home');

    expect(getErrors(), 'no console errors on dashboard').toEqual([]);
  });

  test('share card OR no-share state is present (not a blank page)', async ({ page }) => {
    await page.goto('/dashboard');
    // Either an active share section ("Your share(s)") OR the empty state
    // ("No active share on file") must render — never a blank container.
    const shares = page.getByRole('heading', { name: /your shares?\b/i });
    const emptyState = page.getByText(/no active share on file/i);
    await expect(shares.or(emptyState).first()).toBeVisible();
  });
});

test.describe('account hub + sub-pages', () => {
  test('account hub loads with profile + setting cards', async ({ page }) => {
    const getErrors = collectConsoleErrors(page);
    await page.goto('/account');
    await expect(page).toHaveURL(/\/account\b/);
    await expect(
      page.getByRole('heading', { name: /your account/i })
    ).toBeVisible();
    // Profile section is always rendered (it's the auth identity card).
    await expect(page.getByRole('heading', { name: /^profile$/i })).toBeVisible();
    // Account-level cards that don't require an active share. The Farm Flex
    // card is the <FlexWallet variant="hub"> island anchor (data-flex-wallet
    // ="hub"); it's a nav link that always renders, so it's present
    // immediately even though its balance number loads after first paint
    // (the words "Farm Flex" also appear in the Refer card's body copy, so a
    // name match would be ambiguous).
    await expect(page.locator('a[data-flex-wallet="hub"]')).toBeVisible();
    await expect(page.getByRole('link', { name: /refer a friend/i })).toBeVisible();
    expect(getErrors(), 'no console errors on /account').toEqual([]);
  });

  // Each account sub-page: loads (200, stays auth'd) with no console errors.
  const subPages: { path: string; heading: RegExp }[] = [
    { path: '/account/profile', heading: /profile|your details|edit/i },
    { path: '/account/preferences', heading: /preferences/i },
    { path: '/account/pickup', heading: /pickup|delivery/i },
    { path: '/account/vacation', heading: /vacation/i },
    { path: '/account/biweekly-schedule', heading: /bi-?weekly|schedule|week/i },
    { path: '/account/flex', heading: /farm flex|flex/i },
    { path: '/account/household', heading: /shared access|household/i },
    { path: '/account/refer', heading: /refer/i },
  ];

  for (const { path, heading } of subPages) {
    test(`${path} loads with no console errors`, async ({ page }) => {
      const getErrors = collectConsoleErrors(page);
      const res = await page.goto(path);

      // Must not be redirected to login (auth + non-onboarding).
      expect(res?.status(), `${path} should be 200`).toBe(200);
      await expect(page, `${path} should not bounce to /login`).not.toHaveURL(/\/login\b/);

      // An H1 is present (page rendered real content, not a blank shell).
      await expect(page.locator('h1').first()).toBeVisible();
      // Soft heading match — informational, not the gate (copy varies).
      const matchedHeading = await page
        .locator('h1, h2')
        .filter({ hasText: heading })
        .count();
      expect.soft(matchedHeading, `${path} expected a heading matching ${heading}`).toBeGreaterThan(0);

      expect(getErrors(), `no console errors on ${path}`).toEqual([]);
    });
  }
});

test.describe('pickup forcing-nudge banner (FIX 1)', () => {
  // global-setup cleared the test member's active-share pickup, so the
  // "choose your pickup" nudge must render. Skip if the member had no active
  // share to clear (banner is data-driven and correctly absent then).
  test.skip(!pickupWasCleared(), 'test member has no active share to clear pickup on');

  // The banner appears at the top of all three member hubs.
  const HUBS = ['/dashboard', '/box', '/account'];

  for (const path of HUBS) {
    test(`no-pickup banner is present + actionable on ${path}`, async ({ page }) => {
      await page.goto(path);

      // role="alert" region with the data hook, announced to AT.
      const banner = page.locator('[data-pickup-nudge]');
      await expect(banner).toBeVisible();
      await expect(banner).toHaveAttribute('role', 'alert');

      // The forcing message + the primary CTA → /account/pickup.
      await expect(
        banner.getByRole('heading', { name: /action needed: choose your pickup/i })
      ).toBeVisible();
      const cta = banner.getByRole('link', { name: /choose pickup/i });
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute('href', '/account/pickup');
    });
  }

  test('banner CTA navigates to the pickup chooser', async ({ page }) => {
    await page.goto('/dashboard');
    await page
      .locator('[data-pickup-nudge]')
      .getByRole('link', { name: /choose pickup/i })
      .click();
    await expect(page).toHaveURL(/\/account\/pickup\b/);
    // The pickup page renders (heading present) — the member can now choose.
    await expect(page.getByRole('heading', { name: /pickup location/i })).toBeVisible();
  });
});

test.describe('bottom-nav navigation works', () => {
  test('tapping Account then Box navigates between member pages', async ({ page }) => {
    await page.goto('/dashboard');
    const nav = page.getByRole('navigation', { name: 'Primary' });

    await nav.getByRole('link', { name: 'Account' }).click();
    await expect(page).toHaveURL(/\/account\b/);

    await nav.getByRole('link', { name: 'Box' }).click();
    await expect(page).toHaveURL(/\/box\b/);
  });
});
