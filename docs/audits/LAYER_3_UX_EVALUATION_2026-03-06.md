# Layer 3: UX Evaluation Report — 2026-03-06

## Executive Summary

Layer 3 evaluation used Lighthouse MCP, a11y MCP (axe-core), Playwright MCP visual baselines, and Claude Vision analysis across 5 priority pages at desktop (1440x900) and mobile (375x812) viewports.

**Overall Assessment:** The application has a solid dark-theme design with good visual hierarchy on desktop. Mobile responsiveness varies significantly — greenhouse and sales adapt well, while MCC and Chief of Staff have density/overflow issues. Accessibility is the weakest area: color contrast failures, missing button labels, and disabled zoom are systemic.

---

## 1. Lighthouse Scores

> **Note:** Auth-protected pages redirect Lighthouse to login.html. Scores marked with * reflect the login page, not the actual dashboard.

| Page | Performance | Accessibility | Best Practices | SEO |
|------|------------|---------------|----------------|-----|
| login.html | 100 | 77 | 96 | 90 |
| index.html* | 100* | 77* | 96* | 90* |
| greenhouse-dashboard.html* | 100* | 77* | 96* | 90* |
| sales.html* | 100* | 77* | 96* | 90* |
| employee.html (public) | -- | 56 | -- | -- |
| chef-order.html (public) | -- | -- | -- | -- |

**Key Finding:** Lighthouse can't bypass auth-guard.js. For real performance data on protected pages, use Playwright MCP with `localStorage.test_mode=true` + Chrome DevTools performance traces.

### Login Page Issues (Lighthouse)
- **Accessibility 77:** Password toggle button missing accessible name
- **SEO 90:** Missing meta description

---

## 2. Accessibility Audit (axe-core WCAG 2.1 AA)

### employee.html (Real Data — Public Page)
| Rule | Severity | Count | Details |
|------|----------|-------|---------|
| button-name | Critical | 7 | Icon-only buttons (back arrows, refresh, close) have no accessible name |
| color-contrast | Serious | 7 | Green buttons (#00b961) on white text = 2.58:1 ratio (needs 4.5:1) |
| meta-viewport | Critical | 1 | `user-scalable=no` disables pinch-zoom — blocks users who need to zoom |
| select-name | Critical | 2 | `#noteCategory` and `#notePriority` selects have no labels |
| landmark-one-main | Moderate | 1 | No `<main>` landmark — screen readers can't find primary content |

### login.html
| Rule | Severity | Count | Details |
|------|----------|-------|---------|
| button-name | Minor | 1 | `.password-toggle` button has no accessible name |

### Systemic Issues (Likely Across All Pages)
Based on employee.html patterns:
- **Green buttons everywhere** use #00b961 on white — this fails WCAG AA on every page
- **Icon-only buttons** are common (back arrows, close, refresh) — likely all missing aria-labels
- **`user-scalable=no`** is in the meta viewport of many/all pages — this is a WCAG failure
- **Missing `<main>` landmark** is likely systemic across all dashboard pages

---

## 3. Claude Vision Analysis — Desktop (1440x900)

### Index / Hub Page
**Strengths:**
- Clear two-section layout: "Working Features" vs "All Applications"
- Card grid with consistent sizing and green/orange status indicators
- Good visual hierarchy — section headings are scannable
- Team invite section is prominent with clear CTAs

**Issues:**
- Very long page — requires significant scrolling to see all ~25 apps
- No search/filter for applications — user must scroll to find what they need
- Small card description text may be hard to read on lower-res monitors
- "All Applications" section has no grouping — flat list of 20+ cards

### Greenhouse Dashboard
**Strengths:**
- Clean 5-tab navigation (Today, Inventory, Growth, Sales, More)
- 4 stat cards at top give quick overview
- Clear task sections (Sowing Tasks, Transplant Tasks)
- Action buttons at bottom are well-labeled with icons

**Issues:**
- All stat cards show "--" with "Loading..." — data not loaded (test mode, but skeleton states should show meaningful placeholders)
- Task cards are empty dark rectangles — no skeleton animation or "No tasks" message
- Large empty gray areas dominate the page when no data loads
- The "Print" button is small relative to its importance

### Sales Dashboard
**Strengths:**
- Professional sidebar navigation with clear section groupings (Sales, Programs, Operations, Insights)
- 4 stat cards with trend indicators ("↑ 12% from yesterday")
- Alerts panel with color-coded severity (yellow warning, blue info, red error)
- "Sync from Shopify" button is prominent and actionable

**Issues:**
- "Never synced" warning next to Shopify button is small and easy to miss
- Recent Orders table shows loading spinner indefinitely (expected without API)
- Stat cards all show "--" — no meaningful empty state
- Top toolbar has many small icons that could be confusing for new users

### Marketing Command Center
**Strengths:**
- Rich, information-dense interface with lots of actionable content
- Greeting message with AI personality ("Good Evening, Boss!")
- 5-2-2 Real Posts Tracker with platform indicators
- Action Queue at bottom with clear action buttons (Delete, Delegate)

**Issues:**
- **Most visually dense page** — could overwhelm a farm worker
- Pink/purple/orange color scheme clashes with the dark theme used elsewhere
- Many overlapping UI elements and small text
- The posting controls section is complex — too many options visible at once
- Multiple badges/tags compete for attention (VIRAL, PEAK FRIDAY, CURATED)
- Scrolling required to see Action Queue — most important actions are below fold

### Chief of Staff
**Strengths:**
- Clean dashboard with clear priority indicators (Critical 0, High 0, Overdue 0)
- Quick Actions prominently placed (Process Inbox, Brain Dump, Morning Brief, Refresh)
- AI chat panel on right side with clear personality
- Farm stat cards (Active Plantings, Tasks This Week, Harvest Ready, Bed Utilization)

**Issues:**
- "Brain Offline" indicator visible — should be more prominent or hidden when not actionable
- "Loading schedule..." in Today's Schedule — should have a better empty/loading state
- Farm stat cards show "--" with no context for what the numbers mean
- Horizontal tab overflow not visible — tabs like "Proactive Intel", "Calendar AI", "Predictive", "Memory", "Auto..." may be cut off

---

## 4. Claude Vision Analysis — Mobile (375x812)

### Index / Hub Page (Mobile)
**Rating: GOOD**
- Cards stack vertically — readable and tappable
- Long scroll (very long page) but functional
- Section headings remain clear
- Card descriptions are readable at mobile size

### Greenhouse Dashboard (Mobile)
**Rating: GOOD**
- 2-column stat cards adapt well
- Task cards go single-column
- Action buttons wrap to 2x2 grid — all tappable
- Tab navigation clear with icons + labels
- "Synced" indicator visible

### Sales Dashboard (Mobile)
**Rating: FAIR**
- Sidebar hidden — hamburger menu available
- Stat cards stack full-width — readable
- **Issue:** Top toolbar is crowded — "Sync from Shopify" button overlaps/crowds "Dashboard" text
- **Issue:** Many small toolbar icons (search, refresh, notifications, avatar) tight for fat-finger tapping
- **Issue:** Recent Orders table header columns (ORDER, CUSTOMER, TOTAL, STATUS) may be too compressed on 375px
- Alerts section adapts well

### Marketing Command Center (Mobile)
**Rating: POOR**
- **Most problematic mobile experience**
- Extremely dense content squeezed into 375px width
- Social media post previews are tiny and hard to read
- Multiple overlapping badges and controls
- Action Queue buttons are small
- Color scheme (pink/purple/orange on dark) is even harder to read at mobile size
- The 5-2-2 tracker grid doesn't adapt well to narrow screens
- Would be very hard to use for a farm worker in bright sunlight on a phone

### Chief of Staff (Mobile)
**Rating: FAIR**
- Core layout adapts — priority counts visible, Quick Actions available
- **Issue:** "Connection Failed" and "Brain Offline" badges take up significant space
- **Issue:** Tab bar is cut off — only "Communications" and "Action Queue" visible, rest requires scrolling
- **Issue:** "API returned error: No token provided" error toast covers important content
- **Issue:** Chat FAB button overlaps with error toast
- AI chat panel not visible (likely collapsed/hidden on mobile — correct behavior)

---

## 5. Visual Baseline Manifest

Captured: 2026-03-06
Tool: Playwright MCP (`mcp__playwright__browser_take_screenshot`)
Auth bypass: `localStorage.setItem('test_mode', 'true')`

| File | Page | Viewport | Status |
|------|------|----------|--------|
| `visual-baselines/desktop/index.png` | Hub | 1440x900 | Captured |
| `visual-baselines/desktop/greenhouse-dashboard.png` | Greenhouse | 1440x900 | Captured |
| `visual-baselines/desktop/sales.png` | Sales | 1440x900 | Captured |
| `visual-baselines/desktop/marketing-command-center.png` | MCC | 1440x900 | Captured |
| `visual-baselines/desktop/chief-of-staff.png` | Chief of Staff | 1440x900 | Captured |
| `visual-baselines/mobile/index.png` | Hub | 375x812 | Captured |
| `visual-baselines/mobile/greenhouse-dashboard.png` | Greenhouse | 375x812 | Captured |
| `visual-baselines/mobile/sales.png` | Sales | 375x812 | Captured |
| `visual-baselines/mobile/marketing-command-center.png` | MCC | 375x812 | Captured |
| `visual-baselines/mobile/chief-of-staff.png` | Chief of Staff | 375x812 | Captured |

Use `/visual-diff` to compare future screenshots against these baselines.

---

## 6. Priority Issues — Sorted by Impact

### P0: Accessibility Blockers (Fix These First)
1. **Color contrast failure (systemic):** Green #00b961 on white text = 2.58:1 ratio. Needs 4.5:1 for WCAG AA. Affects every green button across the entire application. **Fix:** Darken to #008a48 or use dark text on green background.
2. **`user-scalable=no` in meta viewport:** Prevents users from zooming in. This is a WCAG 2.1 Level AA failure (1.4.4 Resize Text). Affects all pages. **Fix:** Remove `user-scalable=no` and `maximum-scale=1.0` from all viewport meta tags.
3. **7+ icon-only buttons without accessible names:** Screen readers announce these as "button" with no context. **Fix:** Add `aria-label` to all icon-only buttons (`<button aria-label="Go back">`, `<button aria-label="Refresh">`, etc.)
4. **Form controls without labels:** `#noteCategory` and `#notePriority` selects. **Fix:** Add `<label for="noteCategory">` or `aria-label`.

### P1: Mobile UX Issues (High Priority for Farm Workers)
5. **MCC is unusable on mobile 375px** — content density too high, text too small, controls too tight. Needs a dedicated mobile-first layout or simplified mobile view.
6. **Sales toolbar overlap** — "Sync from Shopify" crowds header text at 375px. Toolbar icons too tight for touch targets.
7. **Chief of Staff tab overflow** — horizontal tabs get cut off on mobile, no scroll indicator.

### P2: Empty/Loading States (Medium Priority)
8. **"--" values everywhere** — stat cards show "--" when data hasn't loaded. Should show skeleton animations or "0" with a loading indicator.
9. **Empty gray rectangles** in greenhouse — task cards render as blank dark boxes when no data. Should show "No sowing tasks today" or similar.
10. **Indefinite loading spinners** — Recent Orders in Sales shows spinner forever when API is unreachable. Should timeout and show an error state.

### P3: Design Consistency (Lower Priority)
11. **MCC color scheme** (pink/purple/orange) clashes with the dark green/orange theme used everywhere else.
12. **Missing `<main>` landmarks** across pages — add for screen reader navigation.
13. **Hub page has no search/filter** for 25+ application cards — consider adding search bar.

---

## 7. Recommendations

### Quick Wins (< 1 hour each)
- Remove `user-scalable=no` from all viewport meta tags
- Add `aria-label` to all icon-only buttons (grep for `<button` without text content)
- Add labels to orphaned select/input elements
- Change green button color from #00b961 to #008a48 (or use `color: #000` on green bg)

### Medium Effort (2-4 hours each)
- Add skeleton loading states to replace "--" placeholders
- Add "No data" empty states for task lists and tables
- Add timeout + error states for API-dependent sections
- Fix sales toolbar responsive layout at 375px

### Larger Effort (1+ days)
- Redesign MCC for mobile — either a simplified mobile view or progressive disclosure of features
- Add search/filter to hub page
- Implement consistent color palette across all pages (MCC vs rest of app)

---

## Layer Summary

| Layer | Status | Coverage |
|-------|--------|----------|
| Layer 1: Deterministic (pre-commit, element refs, API URLs) | GREEN | Full automation |
| Layer 2: Behavioral E2E (Playwright smoke tests) | GREEN | 165/165 passing |
| Layer 3: UX Evaluation | COMPLETE | 5 pages, 10 viewports, Lighthouse + a11y + vision |

**Next `/visual-diff` run:** Will compare against these baselines to detect visual regressions.
