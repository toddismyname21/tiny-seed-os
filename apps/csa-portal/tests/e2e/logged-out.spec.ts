/**
 * Unauthenticated route-protection probe. @unauth
 *
 * No storageState, no Supabase dependency — this runs even if the admin
 * API is unreachable, proving the middleware gate independently.
 *
 * Contract (middleware.ts): a logged-out request to a PROTECTED route
 * redirects to /login (303) with the original path preserved as ?next=.
 * We assert the redirect at the HTTP layer (not after the browser follows
 * it) so the test is exact and fast.
 */
import { test, expect } from '@playwright/test';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/box',
  '/account',
  '/account/profile',
  '/account/preferences',
  '/account/pickup',
  '/account/vacation',
  '/account/biweekly-schedule',
  '/account/flex',
  '/account/household',
  '/account/refer',
  '/stop-notes',
  '/admin',
  '/admin/sync',
  '/admin/recipes',
  '/admin/weekly-email',
  '/admin/campaigns',
  '/admin/campaigns/new',
  '/admin/health',
  '/admin/stop-notes',
  // CSA Operations Admin Phase 1 (migration 0031 + 2026-05-27)
  '/admin/pack-day',
  '/admin/pack-day/2026-06-08',
  '/admin/stop-manifest',
  '/admin/stop-manifest/2026-06-08',
  '/admin/labels',
  '/admin/labels/2026-06-08',
  '/admin/harvest',
  '/admin/harvest/2026-06-08',
  '/admin/pack-sheet',
  '/admin/pack-sheet/2026-06-08',
  '/admin/vendor-orders',
  '/admin/vendor-orders/2026-06-08',
  '/admin/box-plan',
  '/admin/box-plan/2026-06-08',
];

test.describe('unauthenticated route protection @unauth', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route} → 303 redirect to /login`, async ({ request }) => {
      // maxRedirects:0 so we inspect the redirect itself, not the login page.
      const res = await request.get(route, { maxRedirects: 0 });
      expect(res.status(), `${route} should 303`).toBe(303);
      const location = res.headers()['location'] ?? '';
      expect(location, `${route} should redirect to /login`).toContain('/login');
      // The intended path must be preserved for post-login bounce-back.
      expect(location, `${route} should carry ?next=`).toContain('next=');
    });
  }

  test('public landing page renders without auth', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/Tiny Seed Farm CSA/i);
  });

  // /unsubscribe is a PUBLIC route (CAN-SPAM one-click, no login). It must
  // render 200 even with no/invalid token (showing a friendly message),
  // never redirect to /login.
  test('unsubscribe page is public (200, no login redirect)', async ({ page }) => {
    const res = await page.goto('/unsubscribe?token=invalid');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /isn't valid|unsubscribed|went wrong/i })).toBeVisible();
  });

  test('login page renders the email form without auth', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /email me a sign-in link/i })
    ).toBeVisible();
  });

  // /api/admin/health/* endpoints are JSON APIs, not HTML pages. Middleware
  // doesn't redirect /api/* routes — each handler enforces requireAdmin()
  // itself and returns a 403 JSON body. (No-auth callers must see a hard
  // refusal, not a 200 leaking health data.)
  test('GET /api/admin/health/status without auth → 403 JSON', async ({ request }) => {
    const res = await request.get('/api/admin/health/status', { maxRedirects: 0 });
    expect(res.status(), 'unauth health/status should 403').toBe(403);
    const body = await res.json().catch(() => null);
    expect(body, 'response must be JSON').toBeTruthy();
    expect(body.ok ?? body.error, 'JSON should carry an error code').toBeDefined();
  });

  test('POST /api/admin/health/run without auth → 403 JSON', async ({ request }) => {
    const res = await request.post('/api/admin/health/run', {
      maxRedirects: 0,
      headers: { 'content-type': 'application/json', origin: 'https://csa.tinyseedfarm.com' },
      data: {},
    });
    expect(res.status(), 'unauth health/run should 403').toBe(403);
  });
});
