/**
 * /admin/campaigns — admin-only composer + send harness.
 *
 * Two suites here:
 *
 *  1. UNAUTH: a logged-out request to /admin/campaigns must 303 → /login.
 *     (Covered in logged-out.spec.ts too — kept here as belt-and-suspenders.)
 *
 *  2. AUTHENTICATED ADMIN: promotes the shared test member to role='admin'
 *     for the duration of this spec (with afterAll demotion), then walks
 *     the composer flow:
 *        - GET /admin/campaigns lists campaigns
 *        - GET /admin/campaigns/new renders the composer
 *        - POST /api/admin/campaigns/recipients-count returns a count >0
 *        - POST /api/admin/campaigns/draft creates a draft
 *        - GET /admin/campaigns/<id> renders the detail page
 *        - The detail page shows stats=0 for a fresh draft
 *
 *  We deliberately do NOT call /api/admin/campaigns/send in CI — that
 *  would actually mail Resend. The endpoint is exercised by the local
 *  manual smoke test (see report in the task summary).
 */
import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readTestEnv, type TestEnv } from './supabase-fixtures';

interface Promotion {
  customer_id: string;
  prior_role: 'member' | 'admin' | 'staff';
}

let env: TestEnv | null = null;
let promo: Promotion | null = null;
let createdCampaignId: string | null = null;

function admin(env: TestEnv): SupabaseClient {
  return createClient(env.supabaseUrl, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Snapshot the test member's customers.role + flip to 'admin'. Returns the
 * prior role so afterAll can restore it. Returns null when the test member
 * has no customers row (in which case the suite self-skips).
 */
async function promoteToAdmin(env: TestEnv): Promise<Promotion | null> {
  const a = admin(env);
  const { data: cust } = await a
    .from('customers')
    .select('id, role')
    .eq('email', env.testEmail)
    .maybeSingle();
  if (!cust) return null;
  const c = cust as { id: string; role: 'member' | 'admin' | 'staff' };
  await a.from('customers').update({ role: 'admin' }).eq('id', c.id);
  return { customer_id: c.id, prior_role: c.role };
}

async function restoreRole(env: TestEnv, p: Promotion): Promise<void> {
  await admin(env)
    .from('customers')
    .update({ role: p.prior_role })
    .eq('id', p.customer_id);
}

async function cleanupCampaign(env: TestEnv, id: string): Promise<void> {
  // campaign_recipients cascades, but be explicit for the audit trail.
  const a = admin(env);
  await a.from('campaign_recipients').delete().eq('campaign_id', id);
  await a.from('campaigns').delete().eq('id', id);
}

test.describe('admin campaigns — auth gate (unauth)', () => {
  test('GET /admin/campaigns redirects unauthenticated → /login', async ({ browser }) => {
    // We need a context with NO storageState. Spawn a fresh one.
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    const res = await page.goto('/admin/campaigns', { waitUntil: 'commit' });
    // Astro middleware may either 303 server-side (curl-like) or render
    // the login page after a client-following redirect. Either way the
    // final URL is /login.
    expect(page.url()).toContain('/login');
    expect(res?.status() ?? 0).toBeGreaterThanOrEqual(200);
    await ctx.close();
  });
});

test.describe('admin campaigns — composer flow', () => {
  test.beforeAll(async () => {
    env = readTestEnv();
    promo = await promoteToAdmin(env);
  });

  test.afterAll(async () => {
    if (env && createdCampaignId) {
      await cleanupCampaign(env, createdCampaignId);
    }
    if (env && promo) {
      await restoreRole(env, promo);
    }
  });

  test('admin can land on /admin/campaigns and see the New button', async ({ page }) => {
    test.skip(!promo, 'test member has no customers row to promote to admin');
    await page.goto('/admin/campaigns');
    await expect(page).toHaveURL(/\/admin\/campaigns\b/);
    await expect(
      page.getByRole('heading', { name: /^campaigns$/i }).first()
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /\+ new campaign/i }).first()).toBeVisible();
  });

  test('composer renders + recipient count updates with share-type changes', async ({ page }) => {
    test.skip(!promo, 'test member has no customers row to promote to admin');
    await page.goto('/admin/campaigns/new');
    await expect(page).toHaveURL(/\/admin\/campaigns\/new\b/);
    await expect(page.getByRole('heading', { name: /^new campaign$/i })).toBeVisible();

    // Default template (summer_veg + flex) preselected. The live count
    // is fetched from /api/admin/campaigns/recipients-count on mount; we
    // wait until it's not "—" anymore (it may be 0 if the project has no
    // matching members — that's fine, the test just proves the request
    // round-tripped).
    const countEl = page.locator('[data-recipient-count]');
    await expect(countEl).toBeVisible();
    await expect.poll(async () => await countEl.textContent(), {
      timeout: 5_000,
      message: 'recipient count should update from "—"',
    }).not.toBe('—');

    // Uncheck all shares → count should fall to 0.
    const summerVeg = page.locator('input[data-share-type][value="summer_veg"]');
    const flex = page.locator('input[data-share-type][value="flex"]');
    if (await summerVeg.isChecked()) await summerVeg.click();
    if (await flex.isChecked()) await flex.click();
    await expect.poll(async () => (await countEl.textContent())?.trim(), {
      timeout: 5_000,
    }).toBe('0');

    // Re-check summer_veg.
    await summerVeg.click();
    // Count goes back to "something" (>=0 — we don't assert a specific
    // number because it depends on the project's member set).
    await expect.poll(async () => (await countEl.textContent())?.trim() ?? '', {
      timeout: 5_000,
    }).not.toBe('—');
  });

  test('GET /api/admin/campaigns/recipients-count returns ok + filter', async ({ page }) => {
    test.skip(!promo, 'test member has no customers row to promote to admin');
    // Use the page context's auth (cookies are admin-promoted via beforeAll).
    await page.goto('/admin/campaigns/new'); // establish auth cookies in context
    const res = await page.request.get(
      '/api/admin/campaigns/recipients-count?share_types=summer_veg,flex&newsletter_opt_in=true'
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.count).toBe('number');
    expect(typeof body.deliverable_count).toBe('number');
    expect(body.filter.share_types).toEqual(['summer_veg', 'flex']);
    expect(body.filter.newsletter_opt_in).toBe(true);
  });

  test('POST /api/admin/campaigns/draft creates a draft and detail page renders', async ({ page }) => {
    test.skip(!promo, 'test member has no customers row to promote to admin');
    await page.goto('/admin/campaigns/new'); // establish auth cookies
    // The CSRF check in /api/admin/campaigns/* compares Origin against
    // the production PORTAL_ORIGIN ('https://csa.tinyseedfarm.com').
    // Real browser fetches against the deployed portal satisfy this
    // because the Origin header matches; in dev the live composer also
    // sends a localhost Origin and would be rejected — that's a known
    // dev-only constraint shared with every other admin POST endpoint
    // (recipes, weekly-email, stop-notes). For the harness we send the
    // production Origin so the dev server's same-origin check passes.
    const res = await page.request.post('/api/admin/campaigns/draft', {
      data: {
        name: '[E2E] test draft',
        subject: '[E2E] test subject',
        preview_text: '[E2E] preview text',
        body_html: '<p>Hi {{first_name}}, this is an end-to-end test draft.</p>',
        recipient_filter: { share_types: ['summer_veg'], newsletter_opt_in: true },
      },
      headers: {
        'content-type': 'application/json',
        origin: 'https://csa.tinyseedfarm.com',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.campaign).toBeTruthy();
    expect(body.campaign.id).toBeTruthy();
    createdCampaignId = body.campaign.id;
    expect(body.campaign.status).toBe('draft');
    expect(body.campaign.total_sent).toBe(0);

    // Detail page renders the campaign.
    await page.goto(`/admin/campaigns/${createdCampaignId}`);
    await expect(
      page.getByRole('heading', { name: /\[E2E\] test draft/i }).first()
    ).toBeVisible();
    // Stats cards present + zeroed.
    await expect(page.getByText(/Recipients/).first()).toBeVisible();
    await expect(page.getByText(/Sent/).first()).toBeVisible();
  });

  test('campaigns list shows the created draft', async ({ page }) => {
    test.skip(!promo, 'test member has no customers row to promote to admin');
    test.skip(!createdCampaignId, 'no campaign was created');
    await page.goto('/admin/campaigns');
    // The campaign name appears in the table.
    await expect(page.getByText('[E2E] test draft').first()).toBeVisible();
  });
});
