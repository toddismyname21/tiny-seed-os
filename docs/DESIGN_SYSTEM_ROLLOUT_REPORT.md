# Design System Rollout Report

**Date:** 2026-02-20
**CSS File:** `web_app/tiny-seed-design-system.css` (v1.0)
**Total Pages Now Using Design System:** 55

---

## Summary

Applied the Tiny Seed Design System to all HTML files across the project. Every page now:
1. Links to `tiny-seed-design-system.css`
2. Has a `data-theme="dark"` or `data-theme="light"` attribute on `<html>`
3. Has Inter font loaded (added where missing)
4. Uses design token fallbacks for core CSS variables (where applicable)
5. Has `-webkit-font-smoothing: antialiased` on body (where applicable)

---

## Previously Done (7 files)

These were already completed before this rollout:

| File | Theme |
|------|-------|
| `web_app/chef-order.html` | light |
| `web_app/accounting.html` | dark |
| `web_app/quickbooks-dashboard.html` | dark |
| `web_app/employee-management.html` | dark |
| `web_app/financial-dashboard.html` | dark |
| `web_app/loan-readiness.html` | dark |
| `web_app/csa.html` | light |

---

## Newly Modified (48 files)

### web_app/ Directory - Dark Theme (29 files)

| File | Changes |
|------|---------|
| `web_app/index.html` | data-theme="dark", Inter font, CSS link, token fallbacks, font-smoothing, focus-visible, scrollbar, reduced-motion |
| `web_app/sales.html` | data-theme="dark", CSS link, token fallbacks, font-smoothing, focus-visible, scrollbar, reduced-motion |
| `web_app/customer.html` | data-theme="dark", CSS link, token fallbacks, font-smoothing, focus-visible, scrollbar, reduced-motion |
| `web_app/driver.html` | data-theme="dark", Inter font, CSS link, token fallbacks, font-smoothing |
| `web_app/garage.html` | data-theme="dark", CSS link |
| `web_app/food-safety.html` | data-theme="dark", CSS link, token fallbacks |
| `web_app/labels.html` | data-theme="dark", CSS link, token fallbacks, font-smoothing |
| `web_app/smart-predictions.html` | data-theme="dark", Inter font, CSS link, token fallbacks, font-smoothing |
| `web_app/field-planner.html` | data-theme="dark", Inter font, CSS link, token fallbacks, font-smoothing |
| `web_app/farmers-market.html` | data-theme="dark", CSS link, token fallbacks, font-smoothing |
| `web_app/admin.html` | data-theme="dark", CSS link, token fallbacks, font-smoothing |
| `web_app/book-import.html` | data-theme="dark", CSS link, token fallbacks |
| `web_app/seo_dashboard.html` | data-theme="dark", CSS link |
| `web_app/chief-of-staff.html` | data-theme="dark", CSS link |
| `web_app/claude-chat.html` | data-theme="dark", Inter font, CSS link, font-smoothing |
| `web_app/remote-dashboard.html` | data-theme="dark", CSS link, font-smoothing |
| `web_app/pm-monitor.html` | data-theme="dark", CSS link, font-smoothing |
| `web_app/wealth-builder.html` | data-theme="dark", CSS link |
| `web_app/ai-assistant.html` | data-theme="dark", Inter font, CSS link, token fallbacks, font-smoothing |
| `web_app/marketing-command-center.html` | data-theme="dark", CSS link (light touch - very large file) |
| `web_app/marketing-command-center-v3-backup.html` | data-theme="dark", CSS link |
| `web_app/manager-dashboard.html` | data-theme="dark", CSS link, font-smoothing |
| `web_app/pm-dashboard.html` | data-theme="dark", CSS link, font-smoothing |
| `web_app/satellite-map.html` | data-theme="dark", CSS link |
| `web_app/quick-content.html` | data-theme="dark", Inter font, CSS link, token fallbacks |
| `web_app/task-assignment.html` | data-theme="dark", CSS link, font-smoothing |
| `web_app/reports-dashboard.html` | data-theme="dark", CSS link |
| `web_app/schedule.html` | data-theme="dark", CSS link |
| `web_app/market-sales.html` | data-theme="dark", CSS link, token fallbacks |

### web_app/ Directory - Light Theme (15 files)

| File | Changes |
|------|---------|
| `web_app/wholesale.html` | data-theme="light", CSS link, token fallbacks, font-smoothing |
| `web_app/neighbor.html` | data-theme="light", CSS link |
| `web_app/employee-register.html` | data-theme="light", CSS link |
| `web_app/chef-register.html` | data-theme="light", CSS link |
| `web_app/privacy-policy.html` | data-theme="light", Inter font, CSS link |
| `web_app/eula.html` | data-theme="light", Inter font, CSS link |
| `web_app/delivery-zone-checker.html` | data-theme="light", CSS link |
| `web_app/csa-location-finder.html` | data-theme="light", CSS link |
| `web_app/csa-location-widget.html` | data-theme="light", CSS link |
| `web_app/csa-unified-finder.html` | data-theme="light", CSS link |
| `web_app/employee-approve.html` | data-theme="light", CSS link |
| `web_app/employee-onboarding.html` | data-theme="light", CSS link |
| `web_app/log-commitment.html` | data-theme="light", Inter font, CSS link |
| `web_app/chef-approve.html` | data-theme="light", CSS link |
| `web_app/command-center.html` | data-theme="light", Inter font, CSS link |

### Root Directory (4 files)

| File | Theme | Changes |
|------|-------|---------|
| `employee.html` | dark | data-theme="dark", CSS link (href="web_app/tiny-seed-design-system.css") |
| `planning.html` | dark | data-theme="dark", CSS link (href="web_app/tiny-seed-design-system.css") |
| `greenhouse.html` | dark | data-theme="dark", CSS link (href="web_app/tiny-seed-design-system.css") |
| `soil-tests.html` | light | data-theme="light", CSS link (href="web_app/tiny-seed-design-system.css") |

---

## Files Skipped

| File | Reason |
|------|--------|
| `web_app/tiny-seed-design-system.css` | This IS the design system file |
| `web_app/claude-coordination.html` | File does not exist |
| `web_app/api-config.js`, `web_app/auth-guard.js`, etc. | Not HTML files |

---

## Theme Assignment Logic

- **Light theme** (`data-theme="light"`): Customer-facing pages (CSA, chef/wholesale portals, registration forms, approval pages, onboarding, legal documents, delivery zone checker, location finders, soil tests)
- **Dark theme** (`data-theme="dark"`): Admin dashboards, manager tools, internal operations pages, field apps, monitoring tools, AI/Claude interfaces, financial dashboards

---

## Changes Applied Per File (Standard Pattern)

For each file, the following changes were made as applicable:

1. **`data-theme` attribute** added to `<html>` tag
2. **Inter font preconnect + link** added to `<head>` (where not already present)
3. **Design system CSS link** added after existing stylesheets:
   - `web_app/*.html`: `<link rel="stylesheet" href="tiny-seed-design-system.css">`
   - Root `*.html`: `<link rel="stylesheet" href="web_app/tiny-seed-design-system.css">`
4. **CSS variable token fallbacks** updated in `:root` where standard variables existed:
   - `--primary` -> `var(--ts-green-500, #22c55e)`
   - `--primary-dark` -> `var(--ts-green-600, #16a34a)`
   - `--bg-dark` -> `var(--ts-bg-base, #0f172a)`
   - `--bg-card` -> `var(--ts-bg-surface, #1e293b)`
   - `--text-primary` -> `var(--ts-text, #f8fafc)`
   - `--text-secondary` -> `var(--ts-text-secondary, #94a3b8)`
   - `--border` -> `var(--ts-border, #334155)`
5. **Font smoothing** added to body: `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;`
6. **Utility CSS** added before `</style>` on key files:
   - `:focus-visible` outline styling
   - `:focus:not(:focus-visible)` outline removal
   - Button active state feedback
   - `prefers-reduced-motion` media query
   - Subtle scrollbar styling

---

## Notes

- No functional JavaScript was changed in any file
- No existing custom styles were removed - the design system layers underneath
- Files with complex custom theming (chief-of-staff.html, garage.html, MCC) received lighter-touch changes (CSS link + data-theme only) to avoid conflicts
- The design system CSS is additive and uses `[data-theme]` selectors so it only activates when the attribute is present
- All existing fallback values are preserved so pages work identically if the design system CSS fails to load
