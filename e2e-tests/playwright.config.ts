import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Tiny Seed OS E2E Tests
 *
 * Covers MCC tab smoke tests, all-page smoke tests, and more.
 * Auth bypass: uses addInitScript to set localStorage.test_mode=true
 * before any page JS runs (immune to server query-param stripping).
 */
export default defineConfig({
  testDir: '.',

  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: process.env.CI ? 2 : undefined,

  reporter: process.env.CI
    ? [
        ['list'],
        ['json', { outputFile: 'test-results.json' }],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
      ]
    : [['list']],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Auth bypass: set localStorage BEFORE any page JS executes
    // This replaces ?test_mode=true query params which get stripped by some servers
    storageState: undefined,

    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'on-first-retry' : 'off',
    actionTimeout: 5000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
      },
    },
    {
      name: 'Mobile Pixel 5',
      use: {
        ...devices['Pixel 5'],
        headless: true,
      },
    },
  ],

  timeout: 30000,

  expect: {
    timeout: 5000,
  },

  outputDir: 'test-results/',

  // Serve from project root (not web_app/) so both root HTML and web_app/ are accessible
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npx http-server .. -p 3000 --cors -s',
        port: 3000,
        reuseExistingServer: true,
        timeout: 120000,
      },

  globalSetup: undefined,
});
