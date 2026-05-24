/**
 * Automated accessibility — axe-core via @axe-core/playwright.
 *
 * Runs axe on the portal's key pages and FAILS on serious/critical
 * violations (WCAG 2.0/2.1 A + AA). Moderate/minor issues are reported
 * for the baseline but don't fail the build, so the gate stays meaningful
 * (a serious contrast/role/name break) without becoming noise.
 *
 * This spec is in the `authenticated` project (it has storageState), so
 * dashboard/box/account/flex scan as a logged-in member. For the public
 * pages (landing, login) we clear cookies first — otherwise middleware
 * bounces an authed user off /login to /dashboard.
 *
 * Each test logs its full violation breakdown to the console so the run
 * output IS the baseline report.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * KNOWN, TRACKED BASELINE EXCEPTIONS.
 *
 * RESOLVED 2026-05-24 — set is now EMPTY (color-contrast is fully gated).
 *
 * History: the harness surfaced a real, pre-existing a11y issue on its
 * first run (2026-05-24): the brand primary green (--ts-primary #16a34a)
 * failed WCAG AA 4.5:1 — white-on-green (3.29:1), green-on-white (3.29:1),
 * and as low as 2.7:1 where green text sat on a green-tinted badge. It
 * was the lone serious violation, on every page (buttons, badges, links,
 * active bottom-nav label), so we baselined `color-contrast` rather than
 * hide or let-block it: it was allowed, all OTHER serious/critical
 * violations still failed the gate, and every run printed the contrast
 * details so the baseline stayed visible.
 *
 * The fix landed the same day: --ts-primary was deepened to green-800
 * (#166534, 7.13:1 on white, ≥5.7:1 on every tinted badge) in
 * src/styles/global.css, with --ts-primary-dark → green-900 (#14532d) for
 * hover. With the green AA-compliant, the BRAND-GREEN exception is removed
 * — `color-contrast` is now a HARD gate for the green (and everything
 * else), so re-introducing a too-light green fails the build.
 */
const BASELINED_RULE_IDS = new Set<string>([]);

/**
 * NODE-LEVEL baseline (≠ rule-level above).
 *
 * Removing the blanket `color-contrast` rule exception unmasked TWO
 * pre-existing, SEPARATE color-contrast failures that have nothing to do
 * with the brand green: 12px `--ts-text-muted` (#64748b / slate-500) text
 * sitting on a tinted card surface —
 *   · /account       #64748b on #eff3ed ≈ 4.24:1  (was 4.32:1 pre-green-fix)
 *   · /account/flex  #64748b on #f3f7f5 ≈ 4.40:1  (was 4.49:1 pre-green-fix)
 * Both failed BEFORE the green change too (verified in the 2026-05-24
 * axe baseline) — they were simply hidden underneath the green nodes by
 * the old rule-level exception. They are NOT a regression from the green
 * deepening (the ~0.08 drift is the /5 tint shifting as primary darkened;
 * the nodes were already sub-4.5:1).
 *
 * Root cause is broader than these two nodes: #64748b at 12px is borderline
 * on ANY muted/tinted surface (it even measures 4.31:1 on --ts-bg-muted
 * #f3f4f0). Fixing it means darkening --ts-text-muted portal-wide (slate-500
 * → slate-600), a non-green design-token change touching ~44 files — out of
 * scope for THIS green-only a11y task and a separate brand/design decision
 * owned by PM/Todd (review live).
 *
 * So we baseline these by EXACT NODE (CSS-selector substring), not by rule:
 * `color-contrast` stays a hard gate for the green and every other element,
 * and any NEW muted-text contrast break (different selector) still fails.
 * TODO(a11y muted text): darken --ts-text-muted to clear 4.5:1 at 12px on
 * tinted surfaces, then delete this list.
 */
const BASELINED_NODE_TARGET_SUBSTRINGS: readonly string[] = [
  'data-astro-cid-o3zcl4wc',                  // /account hub muted timestamp
  '.border-ts-primary > .text-xs.text-ts-text-muted', // /flex topup-option muted note
];

function isBaselinedNode(target: string): boolean {
  return BASELINED_NODE_TARGET_SUBSTRINGS.some((sub) => target.includes(sub));
}

async function scan(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();

  const byImpact = (impact: string): number =>
    results.violations.filter((v) => v.impact === impact).length;

  // eslint-disable-next-line no-console
  console.log(
    `[a11y] ${label}: ${results.violations.length} violations ` +
      `(critical=${byImpact('critical')}, serious=${byImpact('serious')}, ` +
      `moderate=${byImpact('moderate')}, minor=${byImpact('minor')})`
  );
  for (const v of results.violations) {
    // eslint-disable-next-line no-console
    console.log(
      `   - [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node${
        v.nodes.length === 1 ? '' : 's'
      }) → ${v.helpUrl}`
    );
    // Per-node detail makes the baseline actionable (which element, what
    // the failure summary says — e.g. the exact contrast ratio + colors).
    for (const node of v.nodes) {
      const target = node.target.join(' ');
      const summary = (node.failureSummary ?? '').replace(/\s+/g, ' ').trim();
      // eslint-disable-next-line no-console
      console.log(`       · ${target}\n         ${summary}`);
    }
  }

  // A violation blocks the gate when it's serious/critical, its rule
  // isn't rule-level baselined, AND it has at least one node that isn't
  // node-level baselined. (Node-level baselining lets us keep the rule a
  // hard gate while excusing two specific, separately-owned pre-existing
  // nodes — see BASELINED_NODE_TARGET_SUBSTRINGS.)
  const blocking = results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .filter((v) => !BASELINED_RULE_IDS.has(v.id))
    .filter((v) => v.nodes.some((n) => !isBaselinedNode(n.target.join(' '))));

  const hasBaselined =
    results.violations.some((v) => BASELINED_RULE_IDS.has(v.id)) ||
    results.violations.some((v) => v.nodes.some((n) => isBaselinedNode(n.target.join(' '))));
  if (blocking.length === 0 && hasBaselined) {
    // eslint-disable-next-line no-console
    console.log(
      `[a11y] ${label}: PASS — only baselined exception(s) present; ` +
        `see BASELINED_RULE_IDS / BASELINED_NODE_TARGET_SUBSTRINGS notes.`
    );
  }

  // Assert on the violation IDS (not the whole node tree) for a readable
  // failure message when a NEW serious/critical issue appears.
  expect(
    blocking.map((v) => v.id),
    `${label}: ${blocking.length} NON-baselined serious/critical a11y violation(s)`
  ).toEqual([]);
}

test.describe('accessibility (axe) — public pages', () => {
  test('landing page has no serious/critical violations', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
    await scan(page, 'landing /');
  });

  test('login page has no serious/critical violations', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    await scan(page, 'login /login');
  });
});

test.describe('accessibility (axe) — authenticated pages', () => {
  test('dashboard has no serious/critical violations', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard\b/);
    await scan(page, 'dashboard /dashboard');
  });

  test('box has no serious/critical violations', async ({ page }) => {
    await page.goto('/box');
    await scan(page, 'box /box');
  });

  test('account hub has no serious/critical violations', async ({ page }) => {
    await page.goto('/account');
    await scan(page, 'account /account');
  });

  test('flex has no serious/critical violations', async ({ page }) => {
    await page.goto('/account/flex');
    await scan(page, 'flex /account/flex');
  });
});
