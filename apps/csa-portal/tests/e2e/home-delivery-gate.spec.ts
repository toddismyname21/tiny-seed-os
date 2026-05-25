/**
 * Home-delivery gate (revenue-leak fix, migration 0030).
 *
 * Three things must hold:
 *
 *  1. DATABASE-LEVEL: a MEMBER cannot set their own delivery_address. The
 *     change_pickup_location() RPC rejects a member-initiated delivery set with
 *     {error:'delivery_admin_only'} and writes NOTHING. Proven by minting a
 *     REAL member-JWT-scoped Supabase client and calling the RPC directly
 *     (proveMemberCannotSetDelivery) — this is the load-bearing proof; the gate
 *     lives in Postgres, not the app.
 *
 *  2. UI: /account/pickup no longer offers a FREE "switch to home delivery"
 *     control. There is no delivery-mode radio / editable delivery textarea for
 *     members who aren't already on delivery — only a pickup-stop chooser and a
 *     "Request home delivery — $15/week, subject to approval" action.
 *
 *  3. UI: the PickupNudgeBanner copy no longer implies free delivery (it says
 *     "$15/week").
 *
 * The test member's pickup is CLEARED by global-setup (for the FIX-1 banner
 * test), so on /account/pickup they're in the "no pickup / no delivery" state —
 * exactly the state that shows the chooser + the request-delivery CTA.
 */
import { test, expect } from '@playwright/test';
import { readTestEnv, proveMemberCannotSetDelivery, type TestEnv } from './supabase-fixtures';

let env: TestEnv | null = null;

test.describe('home-delivery gate — DB enforcement', () => {
  test.beforeAll(() => {
    env = readTestEnv();
  });

  test('a member CANNOT set delivery_address — via RPC OR a raw table UPDATE (writes nothing)', async () => {
    const proof = await proveMemberCannotSetDelivery(env!);
    test.skip(!proof, 'test member has no member row to target');

    // 1. The RPC must REJECT the member-initiated delivery set with the gate code.
    expect(
      proof!.memberSetDeliveryResult,
      'member-initiated delivery set must be rejected by the RPC'
    ).toEqual({ error: 'delivery_admin_only' });

    // 2. DEFENSE-IN-DEPTH: a raw `from('members').update({delivery_address})`
    //    bypassing the RPC must ALSO be blocked by the trigger (members_self_
    //    update is row-scoped, so without the trigger this would succeed).
    expect(
      proof!.directUpdateError,
      'a direct member UPDATE of delivery_address must be blocked by the trigger'
    ).toBeTruthy();

    // 3. Neither attempt may have written anything — delivery_address unchanged.
    expect(
      proof!.afterAddress,
      'neither rejected call may have set delivery_address'
    ).toBe(proof!.beforeAddress);
  });
});

test.describe('home-delivery gate — pickup chooser UI', () => {
  test('shows pickup-stop chooser + "Request home delivery" CTA, NOT a free delivery toggle', async ({ page }) => {
    await page.goto('/account/pickup');
    await expect(page).toHaveURL(/\/account\/pickup\b/);
    await expect(page.getByRole('heading', { name: /pickup location/i })).toBeVisible();

    // The pickup-stop selector is present (members CAN switch stops).
    await expect(page.locator('#pickup_location_id')).toBeVisible();

    // The "$15/week, subject to approval" home-delivery section is present.
    await expect(
      page.getByRole('heading', { name: /home delivery — \$15\/week, subject to approval/i })
    ).toBeVisible();

    // The request action posts to the REQUEST endpoint (not pickup-location).
    const requestForm = page.locator('form[action="/api/account/request-delivery"]');
    await expect(requestForm).toBeVisible();
    await expect(
      requestForm.getByRole('button', { name: /request home delivery/i })
    ).toBeVisible();

    // There must be NO free "switch to home delivery" radio/mode toggle — the
    // old leak control. The legacy chooser used name="mode" with a delivery
    // radio (value="delivery"); it must be gone.
    await expect(page.locator('input[name="mode"][value="delivery"]')).toHaveCount(0);
    await expect(page.locator('input[name="mode"]')).toHaveCount(0);
  });
});

test.describe('home-delivery gate — banner copy', () => {
  test('PickupNudgeBanner copy mentions the $15/week delivery fee (no implied free delivery)', async ({ page }) => {
    await page.goto('/dashboard');
    const banner = page.locator('[data-pickup-nudge]');
    // The banner is data-driven; only assert its copy when it's actually shown
    // (the test member's pickup is cleared by global-setup, so it should be).
    const count = await banner.count();
    test.skip(count === 0, 'pickup nudge banner not shown for this member state');

    await expect(banner).toContainText(/\$15\/week/i);
    await expect(banner).toContainText(/request home delivery/i);
  });
});
