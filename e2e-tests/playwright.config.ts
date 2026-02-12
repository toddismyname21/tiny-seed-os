import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for MCC Tab Smoke Tests
 *
 * This configuration is optimized for CI/CD environments
 * to catch "black tab" bugs before deployment.
 */
export default defineConfig({
  // Look for test files in the e2e-tests directory
  testDir: '.',

  // Run tests in files in parallel
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests - run serially for tab tests
  workers: 1,

  // Reporter configuration
  reporter: process.env.CI
    ? [
        ['list'],
        ['json', { outputFile: 'test-results.json' }],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
      ]
    : [['list']],

  // Shared settings for all the projects below
  use: {
    // Base URL for the MCC page
    baseURL: process.env.MCC_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure (CI only for storage reasons)
    video: process.env.CI ? 'on-first-retry' : 'off',

    // Timeout for each action
    actionTimeout: 5000,

    // Timeout for navigation
    navigationTimeout: 30000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use headless mode
        headless: true,
      },
    },
  ],

  // Global timeout for each test
  timeout: 30000,

  // Expect timeout
  expect: {
    timeout: 5000,
  },

  // Output folder for test artifacts
  outputDir: 'test-results/',

  // Run local dev server before starting the tests (development only)
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npx serve ../web_app -l 3000',
        port: 3000,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
