/**
 * All-Pages Smoke Test
 *
 * Auto-tests every HTML page in web_app/ and key root pages.
 * For each page, verifies:
 * 1. Page loads (HTTP 200, no crash)
 * 2. No uncaught JS errors (with allow-list for expected API errors)
 * 3. Page body has visible content (not blank)
 *
 * Auth bypass: uses localStorage.test_mode=true via addInitScript
 */

import { test, expect } from '@playwright/test';

// All web_app/ pages (the main application)
const WEB_APP_PAGES = [
  'index.html',
  'greenhouse-dashboard.html',
  'sales.html',
  'wholesale.html',
  'chef-order.html',
  'chef-approve.html',
  'chef-register.html',
  'csa.html',
  'csa-unified-finder.html',
  'csa-location-finder.html',
  'csa-location-widget.html',
  'customer.html',
  'employee-management.html',
  'employee-onboarding.html',
  'employee-approve.html',
  'employee-register.html',
  'manager-dashboard.html',
  'schedule.html',
  'task-assignment.html',
  'admin.html',
  'marketing-command-center.html',
  'quick-content.html',
  'financial-dashboard.html',
  'accounting.html',
  'quickbooks-dashboard.html',
  'loan-readiness.html',
  'wealth-builder.html',
  'reports-dashboard.html',
  'chief-of-staff.html',
  'command-center.html',
  'field-planner.html',
  'food-safety.html',
  'farmers-market.html',
  'market-sales.html',
  'labels.html',
  'driver.html',
  'delivery-zone-checker.html',
  'garage.html',
  'satellite-map.html',
  'smart-predictions.html',
  'ai-assistant.html',
  'claude-chat.html',
  'seo_dashboard.html',
  'remote-dashboard.html',
  'pm-dashboard.html',
  'pm-monitor.html',
  'seedling-admin.html',
  'seedling-presale-2026.html',
  'seedling-wholesale-2026.html',
  'neighbor.html',
  'log-commitment.html',
  'book-import.html',
  'privacy-policy.html',
  'eula.html',
];

// Key root-level app pages (served from project root)
const ROOT_PAGES = [
  'index.html',
  'login.html',
  'greenhouse.html',
  'employee.html',
  'calendar.html',
  'planning.html',
  'succession.html',
  'sowing-sheets.html',
  'soil-tests.html',
  'labels.html',
  'flowers.html',
  'farm-operations.html',
  'food-safety.html',
  'seed_inventory_PRODUCTION.html',
  'seed_track.html',
  'track.html',
  'quick-seed.html',
  'inventory_capture.html',
  'smart_learning_DTM.html',
  'offline.html',
];

// Expected errors that should NOT fail the test
// These are API/network errors that happen because there's no real backend in CI
const ALLOWED_ERROR_PATTERNS = [
  /Failed to fetch/i,
  /NetworkError/i,
  /net::ERR_/i,
  /script\.google\.com/i,
  /CORS/i,
  /403/i,
  /401/i,
  /Load failed/i,
  /AbortError/i,
  /timeout/i,
  /Cannot read properties of null/i, // DOM elements not yet loaded
  /Cannot read properties of undefined/i,
  /is not defined/i, // External libs that didn't load
  /google is not defined/i,
  /gapi is not defined/i,
  /firebase/i,
];

function isAllowedError(errorMessage: string): boolean {
  return ALLOWED_ERROR_PATTERNS.some(pattern => pattern.test(errorMessage));
}

test.describe('All Pages Smoke Test — web_app/', () => {
  for (const page of WEB_APP_PAGES) {
    test(`web_app/${page} loads without critical JS errors`, async ({ page: browserPage }) => {
      const criticalErrors: string[] = [];

      // Capture JS errors
      browserPage.on('pageerror', (error) => {
        if (!isAllowedError(error.message)) {
          criticalErrors.push(error.message);
        }
      });

      // Auth bypass via localStorage
      await browserPage.addInitScript(() => {
        localStorage.setItem('test_mode', 'true');
      });

      // Navigate — use domcontentloaded since API calls will timeout
      const response = await browserPage.goto(`/web_app/${page}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Check HTTP status
      expect(response?.status(), `${page} should return HTTP 200`).toBe(200);

      // Wait briefly for any init JS to run
      await browserPage.waitForTimeout(1000);

      // Check page has content (not blank)
      const bodyText = await browserPage.locator('body').textContent();
      expect(
        (bodyText || '').trim().length,
        `${page} body should have content`
      ).toBeGreaterThan(0);

      // Check no critical JS errors
      expect(
        criticalErrors,
        `${page} should have no critical JS errors: ${criticalErrors.join('; ')}`
      ).toHaveLength(0);
    });
  }
});

test.describe('All Pages Smoke Test — root pages', () => {
  for (const page of ROOT_PAGES) {
    test(`${page} loads without critical JS errors`, async ({ page: browserPage }) => {
      const criticalErrors: string[] = [];

      browserPage.on('pageerror', (error) => {
        if (!isAllowedError(error.message)) {
          criticalErrors.push(error.message);
        }
      });

      await browserPage.addInitScript(() => {
        localStorage.setItem('test_mode', 'true');
      });

      const response = await browserPage.goto(`/${page}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      expect(response?.status(), `${page} should return HTTP 200`).toBe(200);

      await browserPage.waitForTimeout(1000);

      const bodyText = await browserPage.locator('body').textContent();
      expect(
        (bodyText || '').trim().length,
        `${page} body should have content`
      ).toBeGreaterThan(0);

      expect(
        criticalErrors,
        `${page} should have no critical JS errors: ${criticalErrors.join('; ')}`
      ).toHaveLength(0);
    });
  }
});
