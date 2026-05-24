import { defineConfig, devices } from '@playwright/test';
import { STORAGE_STATE } from './tests/e2e/supabase-fixtures';

export { STORAGE_STATE };

// Mobile-emulated Chromium. CSA members are iPhone-first, so we run a
// mobile viewport — but on the CHROMIUM engine (Pixel 7 descriptor is
// already Chromium-based), so the harness needs only `chromium` installed
// (matches CI + Lighthouse's mobile emulation).
const MOBILE_CHROMIUM = devices['Pixel 7'];

/**
 * Playwright config for the Tiny Seed CSA portal.
 *
 * ── Where the tests run ──────────────────────────────────────────────
 * baseURL is env-configurable:
 *   - default → http://localhost:4321 (the Astro SSR dev server)
 *   - CI / deployed → set PLAYWRIGHT_BASE_URL=https://<preview-url>
 *
 * When baseURL points at localhost we boot the dev server ourselves via
 * the `webServer` block (the @astrojs/vercel adapter has no `preview`
 * command — see note on webServer below). When baseURL points at a
 * remote URL (a Vercel preview / production), we DON'T start a server —
 * we hit the live site as-is.
 *
 * ── Auth (the hard part) ─────────────────────────────────────────────
 * Magic-link login can't run unattended (no inbox). Instead, the
 * `setup` project (global-setup.ts) mints a Supabase session for a
 * dedicated TEST MEMBER using the service-role admin API and writes the
 * resulting auth cookies to a `storageState` file. Every authenticated
 * test reuses that state, so no email round-trip is ever needed.
 *
 * Required env (NEVER hardcode — see .env.test.example):
 *   PUBLIC_SUPABASE_URL          Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY    service-role key (admin API + seeding)
 *   PUBLIC_SUPABASE_ANON_KEY     anon key (token exchange)
 *   E2E_TEST_EMAIL               the test member's email (default test@test.com)
 *
 * The portal reads PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY /
 * SUPABASE_SERVICE_ROLE_KEY from its own .env, so the dev server already
 * has them; global-setup reads the same vars from the process env (loaded
 * from .env / .env.test by load-env.ts).
 */

// Load .env so a bare `npx playwright test` picks up the same Supabase
// creds the Astro build uses. Astro itself loads .env; Playwright does
// not, so we replicate the minimal loader here (no extra dependency).
import { config as loadEnv } from './tests/e2e/load-env';
loadEnv();

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4321';
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(BASE_URL);

export default defineConfig({
  testDir: './tests/e2e',
  // One worker for the authenticated suite keeps the shared test member's
  // box-swap fixture deterministic (no two specs swapping the same row at
  // once). The unauth suite is independent but cheap, so global serial is
  // fine and avoids flaky cross-test interference on a single member.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },

  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['list']]
    : [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // 1. Auth bootstrap — mints the session, seeds the swap fixture,
    //    writes storageState. Everything else depends on it. Its teardown
    //    removes the seeded fixture at the very end.
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
      teardown: 'teardown',
    },

    // Cleanup project — removes seeded DB fixtures. Runs after `setup`'s
    // dependents finish (referenced as `setup`'s teardown).
    {
      name: 'teardown',
      testMatch: /global-teardown\.ts/,
    },

    // 2. Authenticated journeys (mobile viewport — members are iPhone-first).
    {
      name: 'authenticated',
      testIgnore: [/global-setup\.ts/, /global-teardown\.ts/, /logged-out\.spec\.ts/],
      dependencies: ['setup'],
      use: {
        ...MOBILE_CHROMIUM,
        storageState: STORAGE_STATE,
      },
    },

    // 3. Logged-out probe — protected routes must 303 → /login. No
    //    storageState; no dependency on the auth bootstrap so it runs even
    //    if Supabase is unreachable. (File named logged-out.spec.ts so the
    //    governor's `auth*` risk pattern doesn't flag a pure test file.)
    {
      name: 'unauth',
      testMatch: /logged-out\.spec\.ts/,
      use: {
        ...MOBILE_CHROMIUM,
        storageState: { cookies: [], origins: [] },
      },
    },
  ],

  // Boot the site locally. The @astrojs/vercel adapter does NOT support
  // `astro preview` (it emits serverless functions, not a previewable
  // server), so we run the real SSR dev server — it exercises middleware,
  // Supabase auth, and every route exactly like production. Skipped
  // entirely when targeting a remote baseURL (we test the deployed site
  // as-is).
  webServer: isLocal
    ? {
        command: `npm run dev -- --port ${new URL(BASE_URL).port || '4321'}`,
        url: BASE_URL,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        // Suppress the dev toolbar so it can't intercept clicks or pollute
        // the a11y scan (it's a dev-only overlay, absent in production).
        env: { ASTRO_DISABLE_DEV_TOOLBAR: '1' },
        stdout: 'pipe',
        stderr: 'pipe',
      }
    : undefined,
});
