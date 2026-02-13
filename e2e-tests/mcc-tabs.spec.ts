/**
 * MCC Tab Smoke Tests
 *
 * These tests verify that each tab in the Marketing Command Center
 * renders visible content (not black/empty). This catches "black tab"
 * bugs before deployment.
 *
 * Tests verify:
 * 1. Tab content is visible (not display:none)
 * 2. Tab content has non-zero dimensions
 * 3. Tab content contains text (not empty)
 */

import { test, expect, Page } from '@playwright/test';

// Configure Playwright for this test file
test.use({
  // Use Chromium in headless mode
  browserName: 'chromium',
  headless: true,
  // Set viewport for consistent testing
  viewport: { width: 1280, height: 800 },
  // Take screenshot on failure
  screenshot: 'only-on-failure',
  // Trace on first retry
  trace: 'on-first-retry',
});

// Base URL for the MCC page (with test_mode to bypass auth)
const MCC_URL = process.env.MCC_URL || 'http://localhost:3000/marketing-command-center.html?test_mode=true&ci=true';

// All tabs that should be tested
const MCC_TABS = [
  'brain',
  'create',
  'farmpics',
  'contentcalendar',
  'growth',
  'campaigns',
  'paidads',
  'analytics',
  'engage',
  'settings',
  'designstudio'  // Added 2026-02-12: Design Studio with Fabric.js editor
] as const;

type TabName = typeof MCC_TABS[number];

/**
 * Helper function to switch to a tab and verify it renders content
 */
async function verifyTabContent(page: Page, tabName: TabName): Promise<void> {
  // Click the tab button
  const tabButton = page.locator(`[onclick*="switchTab('${tabName}')"]`);
  await expect(tabButton, `Tab button for '${tabName}' should exist`).toBeVisible();
  await tabButton.click();

  // Wait for any animations/transitions
  await page.waitForTimeout(300);

  // Get the tab content container
  const tabContent = page.locator(`#${tabName}Tab`);

  // Verify tab content is visible (not display:none)
  await expect(tabContent, `Tab content for '${tabName}' should be visible`).toBeVisible();

  // Verify tab content has the 'active' class
  await expect(tabContent, `Tab content for '${tabName}' should have active class`).toHaveClass(/active/);

  // Verify tab content has non-zero dimensions
  const box = await tabContent.boundingBox();
  expect(box, `Tab content for '${tabName}' should have a bounding box`).not.toBeNull();
  expect(box?.width, `Tab content for '${tabName}' should have non-zero width`).toBeGreaterThan(0);
  expect(box?.height, `Tab content for '${tabName}' should have non-zero height`).toBeGreaterThan(0);

  // Verify tab content contains text (not completely empty)
  const textContent = await tabContent.textContent();
  expect(
    textContent?.trim().length,
    `Tab content for '${tabName}' should contain text`
  ).toBeGreaterThan(0);
}

test.describe('MCC Tab Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the MCC page
    await page.goto(MCC_URL, { waitUntil: 'domcontentloaded' });

    // Wait for the page to fully load
    await page.waitForSelector('.tab-nav', { timeout: 30000 });
  });

  // Test that the page loads successfully
  test('MCC page loads successfully', async ({ page }) => {
    // Check for main navigation
    await expect(page.locator('.tab-nav')).toBeVisible();

    // Check that at least one tab button exists
    await expect(page.locator('.tab-btn').first()).toBeVisible();

    // Check that main content area exists
    await expect(page.locator('.main-content')).toBeVisible();
  });

  // Test that the default tab (brain) is active on load
  test('Default tab (brain) is active on page load', async ({ page }) => {
    const brainTab = page.locator('#brainTab');
    await expect(brainTab).toBeVisible();
    await expect(brainTab).toHaveClass(/active/);
  });

  // Individual tab tests - one for each MCC tab
  test('Brain tab displays content', async ({ page }) => {
    await verifyTabContent(page, 'brain');
  });

  test('Create tab displays content', async ({ page }) => {
    await verifyTabContent(page, 'create');
  });

  test('FarmPics tab displays content', async ({ page }) => {
    await verifyTabContent(page, 'farmpics');
  });

  test('Content Calendar tab displays content', async ({ page }) => {
    await verifyTabContent(page, 'contentcalendar');
  });

  test('Growth tab displays content', async ({ page }) => {
    await verifyTabContent(page, 'growth');
  });

  test('Campaigns tab displays content', async ({ page }) => {
    await verifyTabContent(page, 'campaigns');
  });

  test('Paid Ads tab displays content', async ({ page }) => {
    await verifyTabContent(page, 'paidads');
  });

  test('Analytics tab displays content', async ({ page }) => {
    await verifyTabContent(page, 'analytics');
  });

  test('Engage tab displays content', async ({ page }) => {
    await verifyTabContent(page, 'engage');
  });

  test('Settings tab displays content', async ({ page }) => {
    await verifyTabContent(page, 'settings');
  });

  test('Design Studio tab displays content', async ({ page }) => {
    await verifyTabContent(page, 'designstudio');
  });

  // Comprehensive test that cycles through all tabs
  test('All tabs can be cycled through without errors', async ({ page }) => {
    for (const tabName of MCC_TABS) {
      await verifyTabContent(page, tabName);
    }
  });

  // Test for tab switching performance
  test('Tab switching completes within acceptable time', async ({ page }) => {
    for (const tabName of MCC_TABS) {
      const startTime = Date.now();

      const tabButton = page.locator(`[onclick*="switchTab('${tabName}')"]`);
      await tabButton.click();

      const tabContent = page.locator(`#${tabName}Tab`);
      await expect(tabContent).toBeVisible();

      const elapsed = Date.now() - startTime;
      expect(elapsed, `Tab '${tabName}' should switch within 2 seconds`).toBeLessThan(2000);
    }
  });

  // Test that hidden tabs stay hidden
  test('Hidden tabs (display:none in HTML) remain hidden', async ({ page }) => {
    // These tabs are marked with style="display: none;" in the HTML
    const hiddenTabs = ['dashboard', 'schedule', 'connections', 'budget', 'intelligence'];

    for (const tabName of hiddenTabs) {
      const tabButton = page.locator(`[onclick*="switchTab('${tabName}')"]`);
      // Hidden tabs should have their buttons hidden
      await expect(tabButton).toBeHidden();
    }
  });

  // Visual regression prevention - ensure tabs have minimum content
  test('Each tab has minimum expected content height', async ({ page }) => {
    const MIN_HEIGHT = 100; // Minimum expected height in pixels

    for (const tabName of MCC_TABS) {
      const tabButton = page.locator(`[onclick*="switchTab('${tabName}')"]`);
      await tabButton.click();
      await page.waitForTimeout(100);

      const tabContent = page.locator(`#${tabName}Tab`);
      const box = await tabContent.boundingBox();

      expect(
        box?.height,
        `Tab '${tabName}' should have at least ${MIN_HEIGHT}px height`
      ).toBeGreaterThan(MIN_HEIGHT);
    }
  });
});

// Playwright configuration for this test file
test.describe.configure({ mode: 'serial' });
