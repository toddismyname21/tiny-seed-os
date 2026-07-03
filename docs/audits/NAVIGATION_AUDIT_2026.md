# Navigation Audit — Tiny Seed Farm OS
**Date:** 2026-03-27
**Auditor:** Audit Claude (claude-sonnet-4-6)
**Scope:** 22 HTML pages audited for navigation consistency, dead-ends, and UX gaps

---

## Summary Table

| Page | Has Sidebar | Has Back/Home Link | Has Header Nav | Dead End? | Role | Mobile-Focused? |
|------|-------------|-------------------|----------------|-----------|------|----------------|
| `index.html` | YES — persistent sidebar, full nav-section structure | N/A (IS the hub) | No | No (is the hub) | Owner/Admin | No |
| `planning.html` | NO — print sidebar only (hidden in print CSS) | YES — `<a href="index.html" class="back-btn">` | No | No | Owner/Admin | No |
| `calendar.html` | NO — filter/legend sidebar, not a nav sidebar | YES — `<a href="index.html" class="back-btn">` | No | No | Owner/Admin | No |
| `soil-tests.html` | NO | PARTIAL — button `onclick="window.location.href='index.html'"` (not a persistent link) | No | No | Owner/Admin | No |
| `employee.html` | NO | NO | NO — internal tab-bar navs only | YES | Employee | YES (PWA, apple-mobile meta) |
| `flowers.html` | NO | YES — `<a href="index.html" class="back-btn">` | No | No | Owner/Admin | No |
| `labels.html` | NO | YES — `<a href="index.html" class="back-btn">` | No | No | Owner/Admin | No |
| `farm-operations.html` | YES — full sidebar with nav-sections, links to hub pages | YES — `href="index.html"` in sidebar nav | Yes (implied by sidebar header) | No | Owner/Admin | No |
| `food-safety.html` | NO — filter sidebar (not nav) | YES — `<a href="index.html">` icon link | No | No | Owner/Admin | No |
| `seed_inventory_PRODUCTION.html` | NO — filter sidebar (not nav) | YES — back-btn with conditional routing to index or employee | No | No | Owner/Admin | No |
| `web_app/greenhouse-dashboard.html` | NO | YES — `<a href="../index.html">` home button (fixed, floating) | YES — `<header class="gh-header">` + `<nav class="gh-tabs">` | No | Owner/Admin | No |
| `web_app/financial-dashboard.html` | NO | YES — `<a href="../index.html">` floating home button | YES — `<nav class="top-nav">` + `<nav class="tab-nav">` | No | Owner/Admin | No |
| `web_app/chief-of-staff.html` | YES — `nav-sidebar` (icon rail, expands on hover) | YES — `<a href="../index.html" class="nav-sidebar-item">` | YES — `<header class="header">` | No | Owner | YES (mobile-open breakpoint, bottom nav) |
| `web_app/marketing-command-center.html` | NO | YES — `<a href="index.html" class="nav-back">` (two nav-back links: financial-dashboard + index) | NO — nav-back links serve as header substitute | No | Owner/Admin | No |
| `web_app/manager-dashboard.html` | YES — full sidebar with `nav-section`, `href="../index.html"` | YES — sidebar includes "Home Dashboard" link | YES — `<header class="header">` | No | Admin/Manager | No |
| `web_app/sales.html` | YES — sidebar with full nav-section structure | YES — sidebar nav includes `href="../index.html"` | YES — `<header class="header">` | No | Owner/Admin | No |
| `web_app/driver.html` | NO | NO — no link to index.html found | NO — has `<header class="app-header">` (hidden on load) + `<nav class="bottom-nav">` (hidden on load) | YES | Employee (Driver) | YES (PWA, apple-mobile meta) |
| `web_app/loan-readiness.html` | NO | YES — `<a href="../index.html">` floating home button | NO | No | Owner | No |
| `web_app/admin.html` | YES — full sidebar with nav-sections | YES — sidebar includes `<a class="nav-item" href="../index.html">` | No | Owner/Admin | No |
| `web_app/csa.html` | NO — cart-sidebar only (not nav) | YES — `<a href="../index.html">` floating home button | NO — `<nav class="bottom-nav">` (CSA tab bar) | No | Customer (CSA Member) | YES (apple-mobile meta) |
| `web_app/wholesale.html` | NO | NO — no link to index.html found | YES — `<header class="header" role="navigation">` + `<nav class="nav-tabs">` | YES | Customer (Wholesale Buyer) | No |
| `web_app/seedling-presale-2026.html` | NO | PARTIAL — `<a href="/">` links to site root, NOT to `index.html` | YES — `<nav class="site-header" role="navigation">` | No (has nav) | Customer (Public) | No |

---

## Dead-End Pages (Critical UX Finding)

Three pages have no working path back to the OS hub:

1. **`employee.html`** — No `href="index.html"` or equivalent. Contains only internal tab-bar navigation. Users who land here via the hub cannot return without browser back button.
2. **`web_app/driver.html`** — No link to index.html. The `<header>` and `<nav class="bottom-nav">` are hidden by default (display:none). The page is a login-gated PWA with no visible escape route.
3. **`web_app/wholesale.html`** — No link to index.html. Has a header nav and tab navigation, but all links are internal to the wholesale flow. A wholesale buyer may be the intended audience (external-facing), but admin users entering from the hub have no way back.

---

## Navigation Pattern Inconsistency

The codebase uses **five different navigation patterns** with no standard:

| Pattern | Pages Using It | Problem |
|---------|---------------|---------|
| Full persistent sidebar (index.html style) | `index.html`, `farm-operations.html`, `web_app/sales.html`, `web_app/admin.html`, `web_app/manager-dashboard.html` | Inconsistent — only 5 of 22 pages have this |
| Floating fixed home button (dark circle, top-left) | `web_app/greenhouse-dashboard.html`, `web_app/financial-dashboard.html`, `web_app/loan-readiness.html`, `web_app/csa.html` | Fragile inline style, not a reusable component |
| `<a class="back-btn">` text link | `planning.html`, `calendar.html`, `flowers.html`, `labels.html` | Inconsistent placement, no icon |
| Icon-rail nav-sidebar (hover-expand) | `web_app/chief-of-staff.html` | One-off custom pattern |
| No navigation at all | `employee.html`, `web_app/driver.html`, `web_app/wholesale.html` | Dead ends |

---

## Mobile-Focused Pages

| Page | Evidence |
|------|---------|
| `employee.html` | `apple-mobile-web-app-capable`, `apple-mobile-web-app-title: "Field App"`, full-width action buttons, PWA install prompt |
| `web_app/driver.html` | `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, bottom-nav pattern, PWA-style login gate |
| `web_app/chief-of-staff.html` | `mobile-open` breakpoint, `cos-bottom-nav` for mobile, responsive sidebar |
| `web_app/csa.html` | `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, bottom-nav pattern |

---

## Role Classification

| Role | Pages |
|------|-------|
| **Owner/Admin** | `index.html`, `planning.html`, `calendar.html`, `soil-tests.html`, `flowers.html`, `labels.html`, `farm-operations.html`, `food-safety.html`, `seed_inventory_PRODUCTION.html`, `web_app/greenhouse-dashboard.html`, `web_app/financial-dashboard.html`, `web_app/marketing-command-center.html`, `web_app/sales.html`, `web_app/loan-readiness.html`, `web_app/admin.html` |
| **Admin/Manager** | `web_app/manager-dashboard.html` |
| **Owner** | `web_app/chief-of-staff.html` |
| **Employee (Field)** | `employee.html` |
| **Employee (Driver)** | `web_app/driver.html` |
| **Customer — CSA Member** | `web_app/csa.html` |
| **Customer — Wholesale Buyer** | `web_app/wholesale.html` |
| **Customer — Public** | `web_app/seedling-presale-2026.html` |

---

## Findings by Severity

### P2 — Navigation Dead Ends (Fix This Week)

**F-NAV-001:** `employee.html` has no link back to `index.html`. Employee users who land directly on this page cannot navigate to the hub. Given this is a mobile PWA, the back button may not be available (full-screen mode on iOS).

**F-NAV-002:** `web_app/driver.html` has no link back to `index.html`. Same PWA risk as above. The `<header>` and `<nav class="bottom-nav">` elements are initialized as `display:none` — they appear only after login, but even then contain no hub link.

**F-NAV-003:** `web_app/wholesale.html` has no link back to `index.html`. Admin users who open this page from the hub are stranded.

### P3 — Inconsistency / Tech Debt (Track)

**F-NAV-004:** Five distinct navigation patterns exist across 22 pages. There is no shared nav component. Every page reimplements its own navigation HTML, making future changes require touching 22 files.

**F-NAV-005:** The floating home button (used in 4 `web_app/` pages) is implemented as a 120-character inline style string duplicated verbatim four times. This is a maintenance liability — any style change must be made in four places.

**F-NAV-006:** `web_app/seedling-presale-2026.html` links `href="/"` instead of `href="../index.html"`. On GitHub Pages, `/` resolves to the repo root, not the OS hub. This may or may not route correctly depending on deployment — should be verified.

**F-NAV-007:** `soil-tests.html` uses a JS `onclick` button to return to index rather than an `<a>` element. This is not accessible (keyboard users, screen readers) and breaks middle-click/open-in-new-tab behavior.

**F-NAV-008:** `calendar.html` sidebar is a filter/legend panel, not a navigation sidebar. It uses the class name `sidebar` identically to the nav sidebars in `index.html` and `farm-operations.html`, creating naming collision risk in shared CSS.

**F-NAV-009:** `web_app/marketing-command-center.html` uses two `<a class="nav-back">` links rendered in what appears to be a header position — one to `financial-dashboard.html` and one to `index.html`. This is a non-standard pattern that appears nowhere else in the codebase.

---

## Pages With No Issues Found

- `planning.html` — back-btn present, clean pattern
- `flowers.html` — back-btn present, clean pattern
- `labels.html` — back-btn present, clean pattern
- `web_app/chief-of-staff.html` — sidebar nav + header, links to hub, mobile-aware
- `web_app/manager-dashboard.html` — sidebar nav + header
- `web_app/admin.html` — sidebar nav with hub link
- `web_app/sales.html` — sidebar nav with hub link
- `web_app/financial-dashboard.html` — floating home button + header nav
- `web_app/greenhouse-dashboard.html` — floating home button + header nav + tab nav

---

## Recommended Actions

Priority order for remediation:

1. Add `href="index.html"` link to `employee.html` (mobile-safe — use a fixed top-right icon, not a sidebar)
2. Add `href="../index.html"` link to `web_app/driver.html` (same approach — post-login only)
3. Add `href="../index.html"` link to `web_app/wholesale.html` (simple back-btn in header)
4. Create a shared nav component (either a JS include or a copy-paste standard) to reduce 5 patterns to 1
5. Verify `seedling-presale-2026.html` `href="/"` resolves correctly on GitHub Pages
6. Convert `soil-tests.html` `onclick` navigation to a proper `<a>` element

---

*Report generated by: Audit Claude*
*Methodology: grep-based static analysis across all 22 target files*
*No application code was modified during this audit*
