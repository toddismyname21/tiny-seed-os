# Greenhouse & Seeding Workflow UX Audit
### Tiny Seed Farm OS — 2026-02-28
### Auditor: PM_Architect (Claude Opus 4.6) — Senior UX Methodology

---

## Executive Summary

The greenhouse/seeding workflow is **fragmented across 7 active pages** with no unified happy path. A farmer's morning routine — "What do I sow today? Print labels. Mark it done." — requires **4 page loads minimum** and **12+ clicks**. Competitors (Tend, farmOS, SBI Grower) achieve this in 3 steps on a single screen.

The Operations tab (default landing) is 100% read-only and provides zero actionable value for the primary user task. Today's Tasks — the actual workhorse — is buried as tab #2.

**Overall UX Score: 47/100** (broken workflow, strong individual components)

---

## Part 1: Current-State Flow Diagram

```
FARMER'S MORNING: "I need to sow 8 trays of tomatoes"

                    ┌─────────────────────────────┐
                    │  greenhouse-dashboard.html   │
                    │  DEFAULT: Operations Tab     │
                    │  ┌───────────────────────┐   │
                    │  │ 100% READ-ONLY        │   │
                    │  │ Wall of stats/data     │   │
                    │  │ NO ACTIONABLE BUTTONS  │   │ ← User lands here. Dead end.
                    │  └───────────────────────┘   │
                    │                               │
                    │  User must KNOW to click:     │
                    │  [Today's Tasks] tab (#2)     │
                    └──────────┬────────────────────┘
                               │
                    ┌──────────▼────────────────────┐
                    │  Today's Tasks Tab             │
                    │  - Sees sowing cards           │
                    │  - Can click "Mark Sown"       │
                    │  - BUT: No print labels here   │
                    │  - BUT: No print task sheets   │
                    └──────────┬────────────────────┘
                               │
              ┌────────────────┼───────────────────┐
              │                │                   │
    ┌─────────▼──────┐  ┌─────▼──────┐  ┌────────▼────────┐
    │ sowing-sheets  │  │ labels.html│  │ quick-seed.html  │
    │ .html          │  │            │  │                  │
    │ SEPARATE PAGE  │  │ SEPARATE   │  │ SEPARATE PAGE    │
    │ Print tasks    │  │ PAGE       │  │ Mobile execution │
    │ No "Mark Done" │  │ Print QR   │  │ Mark sown        │
    │ No labels      │  │ labels     │  │ No labels/sheets │
    └────────────────┘  │ No tasks   │  └──────────────────┘
                        │ No execute │
                        └────────────┘

RESULT: 4 page loads, 12+ clicks, no connecting tissue.
COMPETITOR BENCHMARK: 3 steps, 1 page.
```

---

## Part 2: Nielsen's 10 Heuristics Evaluation

| # | Heuristic | Score | Finding | Severity | Location |
|---|-----------|-------|---------|----------|----------|
| 1 | **Visibility of system status** | 4/10 | No progress indicator for morning seeding ("3 of 8 trays done"). Sync dot exists but no task-level progress bar. After "Mark Sown" there's a toast but no visual card removal animation — just a full reload. | 5 | greenhouse-dashboard.html, Today's Tasks tab |
| 2 | **Match between system and real world** | 6/10 | "Operations" tab name is corporate jargon; farmers think "What do I do today?" not "Operations overview." Tab should be "My Greenhouse" or "Dashboard." Seed lot modal uses batch IDs, not human-friendly names. | 3 | Operations tab label, seedLotModal |
| 3 | **User control and freedom** | 3/10 | No undo after "Mark Sown" (unlike quick-seed.html which has undo). No Escape key to close modals. Can't "unsow" a tray if marked by mistake. No breadcrumbs between the 4 disconnected pages. | 5 | Today's Tasks: markSown(), all modals |
| 4 | **Consistency and standards** | 4/10 | Two different "Mark Sown" experiences: greenhouse-dashboard uses a modal with seed lot search, quick-seed.html uses optimistic UI with instant card removal. Same action, radically different UX. Labels page and sowing-sheets have identical 420px sidebars but different interaction patterns. | 4 | greenhouse-dashboard vs quick-seed |
| 5 | **Error prevention** | 5/10 | No confirmation before "Mark Sown" (what if wrong tray?). Inline chip edits save on blur — easy to accidentally change values by mis-clicking. No "are you sure?" on destructive actions. CSV import shows only 5 preview rows — no way to verify full dataset before commit. | 4 | Today's Tasks: editable chips, CSV import |
| 6 | **Recognition rather than recall** | 3/10 | User must REMEMBER that Today's Tasks exists (default tab shows nothing useful). Must REMEMBER to go to separate pages for labels and task sheets. No contextual links between related actions. Batch IDs shown without crop names in some views. | 5 | Tab navigation, cross-page workflow |
| 7 | **Flexibility and efficiency of use** | 4/10 | No keyboard shortcuts. No bulk "Mark All Sown" for a batch. No quick-print button on task cards. Power users (field leads) have no shortcuts — same click path as first-time users. quick-seed.html has excellent mobile shortcuts but is a completely separate app. | 4 | All pages |
| 8 | **Aesthetic and minimalist design** | 7/10 | Dark theme is cohesive and professional. Inter font, consistent spacing, good color palette. BUT: Operations tab is a wall of data with no visual hierarchy for action items. 6 tabs + sub-tabs in Sales creates cognitive overload. | 3 | Operations tab, Sales sub-tabs |
| 9 | **Help users recover from errors** | 2/10 | Toast notifications disappear in 3 seconds — no persistent error state. API failures show generic "Error loading data" with no retry button. No offline recovery (unlike quick-seed.html which queues actions). Failed "Mark Sown" gives no guidance on what went wrong. | 5 | All API error handlers |
| 10 | **Help and documentation** | 1/10 | Zero onboarding. Zero tooltips. Zero help text. A new user opening greenhouse-dashboard has no idea what to do. No "Getting Started" guide. No contextual hints on the Operations tab explaining what it's for. | 4 | Everywhere |

**Heuristic Average: 3.9/10**

---

## Part 3: Usability Factors

### Task Completion Efficiency

| Task | Current Steps | Current Pages | Ideal Steps | Gap |
|------|--------------|---------------|-------------|-----|
| "What do I sow today?" | 3 clicks (open dashboard → click Today's Tasks → scan cards) | 1 page | 0 clicks (auto-show on open) | 3 clicks wasted |
| "Mark tray as sown" | 4 clicks (Today's Tasks → Mark Sown → select/skip lot → confirm) | 1 page | 1 click (tap "Done") | 3 clicks wasted |
| "Print today's labels" | 6+ clicks (open labels.html → set date → select seedings → preview → print) | 2 pages | 1 click (from task card) | 5 clicks + page load |
| "Print task sheets" | 5+ clicks (open sowing-sheets.html → set date → filter → print) | 2 pages | 1 click (from dashboard) | 4 clicks + page load |
| "Full morning routine" | 12-18 clicks across 4 pages | 4 pages | 3-5 clicks on 1 page | **9-13 clicks + 3 page loads wasted** |
| "Log a sale" | 5 clicks (Sales tab → Tracker sub-tab → Log Sale → fill form → submit) | 1 page | 3 clicks | 2 clicks wasted |

### Learnability (New Users)
**Score: 3/10** — No onboarding, no tooltips, no empty states with guidance. The default Operations tab actively misleads new users into thinking the page is read-only. A new employee would need verbal training to understand the workflow spans 4 pages.

### Memorability (Returning Users)
**Score: 5/10** — Once you KNOW the workflow, tab positions are consistent. But after a week away, the 4-page dance is easy to forget. No breadcrumbs or "continue where you left off."

### Error Rate Potential
**Score: 4/10** — Inline editable chips save on blur (accidental saves). No undo on Mark Sown. No confirmation dialogs on destructive actions. CSV import lacks full preview.

### User Satisfaction Indicators
**Score: 3/10** — Owner quote says it all: *"WHAT DOES IT EVEN DO? HOW DOES IT EVEN HELP?"* The Operations tab — the first thing you see — delivers zero value for the primary use case.

---

## Part 4: Accessibility Audit (WCAG 2.2)

### Color Contrast Ratios

| Element | Foreground | Background | Ratio | WCAG AA | WCAG AAA |
|---------|-----------|------------|-------|---------|----------|
| Primary text | #e2e8f0 | #0a0a0f | 15.9:1 | PASS | PASS |
| Secondary text | #94a3b8 | #0a0a0f | 7.1:1 | PASS | PASS |
| Green on dark | #4ade80 | #0a0a0f | 10.2:1 | PASS | PASS |
| Gold on dark | #f59e0b | #0a0a0f | 8.5:1 | PASS | PASS |
| Red on dark | #ef4444 | #1a1a2e | 4.8:1 | PASS | FAIL |
| Muted text (labels.html sidebar) | #94a3b8 | #16213e | 4.2:1 | PASS | FAIL |

**Contrast: Generally GOOD for dark theme. Two AAA failures on secondary elements.**

### Keyboard Navigation

| Page | Tab Order | Enter/Space | Escape | Arrow Keys | Focus Visible |
|------|-----------|-------------|--------|------------|---------------|
| greenhouse-dashboard | Partial — tabs clickable but not `role="tab"` | Works on buttons | NO modal close | NO | Minimal (outline:none in CSS) |
| sowing-sheets | Partial — sidebar filters tabbable | Works on forms | NO | NO | Minimal |
| labels | Partial — checkboxes tabbable | Works on checkboxes | NO | NO | Minimal |
| quick-seed | Partial — buttons tabbable | Works | NO | NO | Acceptable (mobile) |
| seedling-admin | Partial — tabs/forms tabbable | Works | NO | NO | Minimal |

**Keyboard: POOR across all pages. No Escape key handlers. No arrow key navigation. `outline:none` removes focus indicators.**

### Screen Reader Compatibility

| Issue | Severity | Pages Affected |
|-------|----------|----------------|
| Zero `aria-label` attributes on any page | Critical | ALL |
| No `role="tablist"` / `role="tab"` on tab navigation | Critical | greenhouse-dashboard, seedling-admin |
| No `role="dialog"` / `aria-modal` on modals | Critical | greenhouse-dashboard (5+ modals), labels, seedling-admin |
| No `aria-live` regions for dynamic content updates | High | ALL (toasts, data loads, filters) |
| No `aria-expanded` on collapsible sections | High | seedling-admin (accordion), presale FAQ |
| Status badges are color-only (no text fallback) | High | greenhouse-dashboard, sowing-sheets |
| Icon-only buttons lack text alternatives | High | sowing-sheets (edit/delete icons), labels |
| No `aria-selected` on active tabs | Medium | ALL tabbed interfaces |
| Inline editable chips not marked as editable | Medium | greenhouse-dashboard |
| No loading announcements (`aria-busy`) | Medium | ALL pages with async data |

### Touch Target Sizes (48px minimum per WCAG 2.2)

| Element | Actual Size | Meets 48px? | Page |
|---------|------------|-------------|------|
| Main tab buttons | ~44px height | CLOSE (borderline) | greenhouse-dashboard |
| "Mark Sown" button | 40px height, adequate width | FAIL (height) | greenhouse-dashboard |
| Inline edit chips | 32px height | FAIL | greenhouse-dashboard |
| Filter dropdown triggers | 36px height | FAIL | sowing-sheets |
| Label checkboxes | 20px (visual), tappable area larger | PASS (with padding) | labels |
| Quick-seed action buttons | 48-56px | PASS | quick-seed |
| Presale quantity inputs | 44px | CLOSE | seedling-presale-2026 |

---

## Part 5: Complete Issue Table

| # | Category | Issue | Severity (1-5) | Location | Recommendation | Effort |
|---|----------|-------|----------------|----------|----------------|--------|
| 1 | Navigation | Operations tab is default and 100% read-only — users land on a dead end | **5** | greenhouse-dashboard.html, tab 1 | Make Today's Tasks the default tab OR merge Operations into a header stats bar | Low |
| 2 | Workflow | Seeding morning routine requires 4 separate pages (12+ clicks) | **5** | Cross-page workflow | Embed print + execute actions directly in Today's Tasks tab | High |
| 3 | Heuristic #6 | User must recall that labels/sheets are separate pages — no contextual links | **5** | Today's Tasks tab | Add "Print Labels" and "Print Sheet" buttons on each task card | Med |
| 4 | Heuristic #3 | No undo after "Mark Sown" on greenhouse dashboard (quick-seed has undo) | **5** | Today's Tasks: markSown() | Add undo toast matching quick-seed.html pattern | Med |
| 5 | Heuristic #9 | API errors show generic message, no retry, toast disappears in 3s | **5** | All API error handlers | Add persistent error banner with retry button | Med |
| 6 | Accessibility | Zero ARIA labels across all pages | **5** | ALL pages | Add aria-label, role, aria-live to all interactive elements | High |
| 7 | Accessibility | No keyboard Escape to close modals | **4** | All modals (5+ on greenhouse-dashboard) | Add `keydown` listener for Escape on all modals | Low |
| 8 | Accessibility | No focus trap in modals — Tab escapes to background | **4** | All modals | Implement focus trap (first/last focusable element loop) | Med |
| 9 | Consistency | Two "Mark Sown" UX patterns (modal vs optimistic UI) | **4** | greenhouse-dashboard vs quick-seed | Align on optimistic UI pattern (instant removal + undo toast) | Med |
| 10 | Heuristic #1 | No morning progress indicator ("3/8 trays sown today") | **4** | Today's Tasks tab | Add progress bar at top of Today's Tasks | Low |
| 11 | Heuristic #2 | "Operations" label is corporate jargon, not farm language | **3** | Tab label | Rename to "Overview" or "My Greenhouse" | Low |
| 12 | Heuristic #5 | Inline chip edits save on blur (accidental save risk) | **3** | Today's Tasks: editable chips | Require explicit save (checkmark button) or add undo | Med |
| 13 | Efficiency | No bulk actions (select multiple trays, mark all sown) | **3** | Today's Tasks tab | Add checkbox selection + "Mark Selected as Sown" | Med |
| 14 | Heuristic #10 | Zero onboarding, tooltips, or help text anywhere | **4** | ALL pages | Add first-visit tooltip tour + contextual help icons | Med |
| 15 | Consistency | labels.html sidebar 420px matches sowing-sheets but different interactions | **3** | labels.html, sowing-sheets.html | If these stay separate: unify sidebar patterns | Med |
| 16 | Mobile | sowing-sheets.html sidebar fixed 420px, not responsive | **3** | sowing-sheets.html | Add collapsible sidebar for mobile | Med |
| 17 | Mobile | labels.html grid doesn't collapse on mobile | **3** | labels.html | Add responsive breakpoint, stack labels | Med |
| 18 | Duplication | wholesale-seedlings.html is legacy duplicate of seedling-wholesale-2026 | **3** | wholesale-seedlings.html | Delete or redirect to 2026 version | Low |
| 19 | Duplication | Seedling Sales tab overlaps with seedling-admin.html | **3** | greenhouse-dashboard Sales tab vs seedling-admin | Clearly differentiate: Sales tab = quick ops, Admin = full CRUD | Med |
| 20 | Performance | Multiple API calls on tab switch, no caching, full re-renders | **2** | All tab load functions | Add client-side cache with TTL, incremental rendering | High |
| 21 | Heuristic #7 | No keyboard shortcuts for power users | **2** | All pages | Add: S = Mark Sown, P = Print, N = Next task | Med |
| 22 | Touch targets | "Mark Sown" button height 40px (WCAG requires 48px) | **3** | greenhouse-dashboard task cards | Increase button padding to meet 48px | Low |
| 23 | Touch targets | Inline edit chips 32px height | **3** | greenhouse-dashboard editable chips | Increase to 44px minimum | Low |
| 24 | Heuristic #8 | Operations tab: wall of data with no visual hierarchy | **3** | Operations tab content | Add sections with clear headings, collapse non-essential | Med |

---

## Part 6: TOP 3 CRITICAL ISSUES (Must Fix Immediately)

### CRITICAL #1: Default Tab is a Dead End
**Severity: 5/5 | Impact: Every single user, every single session**

The Operations tab is the default landing and offers ZERO actionable elements. A farmer opens the greenhouse dashboard expecting to start their day and sees a wall of read-only statistics. The owner's exact words: *"WHAT DOES IT EVEN DO?"*

**Fix:** Change the default tab from Operations to Today's Tasks. One line of JavaScript:
```javascript
// In showTab() initialization
showTab('today');  // was: showTab('operations')
```
**Effort: 5 minutes. Impact: Transforms first impression.**

### CRITICAL #2: 4-Page Morning Routine
**Severity: 5/5 | Impact: Daily workflow for all greenhouse staff**

The core morning loop (see tasks → print labels → print sheets → mark done) requires 4 separate HTML pages with no connecting tissue. This is 3x more friction than any competitor.

**Fix:** Add contextual action buttons to each task card in Today's Tasks:
- "Print Label" button → opens label in print-ready modal (no page navigation)
- "Print Sheet" button → opens sowing sheet preview in modal
- "Quick Mark Done" → optimistic UI removal + undo toast (matching quick-seed pattern)

**Effort: Medium (embed print logic from labels.html into dashboard). Impact: Eliminates 3 page loads.**

### CRITICAL #3: Zero Accessibility
**Severity: 5/5 | Impact: Legal compliance, screen reader users, keyboard users**

No ARIA labels, no roles, no focus traps, no keyboard Escape, no live regions across ANY page. This is a WCAG 2.2 Level A failure — the minimum standard. Any user relying on assistive technology cannot use these pages.

**Fix:** Systematic pass adding:
- `role="tablist"` + `role="tab"` + `aria-selected` on all tab bars
- `role="dialog"` + `aria-modal="true"` + focus trap on all modals
- `aria-live="polite"` on toast containers and dynamic content areas
- `aria-label` on all icon-only buttons
- Escape key handlers on all modals

**Effort: High (8 files, every interactive element). Impact: Legal compliance + inclusive design.**

---

## Part 7: TOP 3 QUICK WINS (High Impact, Low Effort)

### QUICK WIN #1: Change Default Tab to Today's Tasks
**Effort: 5 minutes | Impact: 10/10**
One line change. Transforms the landing experience from "what is this?" to "here's what I do today."

### QUICK WIN #2: Add Morning Progress Bar
**Effort: 30 minutes | Impact: 8/10**
Add a simple progress bar at the top of Today's Tasks: "Today's Seeding: 3 of 8 trays complete ████░░░░ 37%"
Uses data already loaded. Gives immediate satisfaction and visibility.

### QUICK WIN #3: Rename "Operations" to "Overview" + Add Action Links
**Effort: 1 hour | Impact: 7/10**
Rename the tab. Add 3 action cards at the top of Overview: "Start Sowing →", "Print Labels →", "Print Sheets →" linking to the relevant tab/page. Transforms the dead-end into a launchpad.

---

## Part 8: Proposed Redesigned Flow

### The 3-Step Morning (Target State)

```
FARMER OPENS GREENHOUSE DASHBOARD
           │
           ▼
┌─────────────────────────────────────────────────┐
│  TODAY'S TASKS (Default Tab)                     │
│                                                  │
│  ┌─── Morning Progress ─────────────────────┐   │
│  │ Today's Seeding: 3/8 trays  ████░░░░ 37% │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  ┌── Quick Actions Bar ──────────────────────┐   │
│  │ [Print All Labels] [Print Task Sheet]     │   │
│  │ [Mark All Sown ▾]  [Filter: Overdue ▾]   │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  OVERDUE (red border, expanded by default)       │
│  ┌──────────────────────────────────────────┐   │
│  │ 🍅 Tomato - Cherokee Purple              │   │
│  │ 3 trays | 72-cell | Sow by: Feb 25      │   │
│  │ [✓ Done] [🏷 Label] [📋 Sheet]           │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  TODAY (gold border)                             │
│  ┌──────────────────────────────────────────┐   │
│  │ 🌶 Pepper - Sweet Banana                 │   │
│  │ 2 trays | 50-cell | Sow today            │   │
│  │ [✓ Done] [🏷 Label] [📋 Sheet]           │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  UPCOMING (green border, collapsed)              │
│  ▸ 5 more seedings this week                    │
└─────────────────────────────────────────────────┘

STEP 1: Open dashboard → see today's tasks (automatic)
STEP 2: Click [✓ Done] → card fades out + undo toast (3s)
STEP 3: Click [🏷 Label] → print-ready modal (no page nav)

TOTAL: 3 steps, 1 page, 3 clicks for the core loop.
```

### Tab Restructure Proposal

| Current (6 tabs) | Proposed (4 tabs) | Why |
|-------------------|-------------------|-----|
| Operations (default) | **Today** (default) | The task users actually need first |
| Today's Tasks | *(merged into Today)* | Operations stats become a collapsible header in Today |
| Tray Inventory | **Inventory** | Keep as-is, rename for clarity |
| Growth Tracking | **Growth** | Keep as-is |
| Seedling Sales (4 sub-tabs) | **Sales** | Keep, but consider moving Production Plan sub-tab to its own page for admins |
| Reports | *(moved to ... menu)* | Reports are periodic, not daily — move to overflow menu |

**Result: 4 primary tabs instead of 6. Core daily task is the default.**

---

## Part 9: Page Consolidation Recommendations

| Action | Pages Affected | Recommendation | Priority |
|--------|---------------|----------------|----------|
| **Merge** | Operations tab + Today's Tasks tab | Operations stats become a collapsible summary bar in Today's Tasks. One tab replaces two. | P0 |
| **Embed** | labels.html → greenhouse-dashboard | Add "Print Label" button per task card that opens a print-ready modal. labels.html remains as standalone for batch printing. | P1 |
| **Embed** | sowing-sheets.html → greenhouse-dashboard | Add "Print Sheet" button in Today's Tasks quick actions bar. sowing-sheets.html remains for detailed management. | P1 |
| **Keep** | quick-seed.html | This is a PURPOSE-BUILT mobile PWA. Keep it separate — it serves field crew, not desktop managers. But add a link to it from the dashboard for mobile users. | N/A |
| **Delete** | wholesale-seedlings.html | Legacy duplicate. 880 lines vs 1621 lines in 2026 version. Redirect to seedling-wholesale-2026.html. | P1 |
| **Differentiate** | Sales tab vs seedling-admin.html | Sales tab = quick daily ops (log sale, check inventory). Admin = full CRUD (manage varieties, allocations, page settings). Add clear labels. | P2 |

---

## Part 10: Implementation Priority (Phased)

### Phase 0: Immediate (< 1 day, zero risk)
1. Change default tab from Operations to Today's Tasks
2. Rename "Operations" to "Overview"
3. Add Escape key handlers to all modals
4. Increase touch targets on Mark Sown button (padding adjustment)

### Phase 1: This Week (medium effort, high impact)
5. Add morning progress bar to Today's Tasks
6. Add "Print Label" and "Print Sheet" buttons to task cards
7. Add undo toast after Mark Sown (match quick-seed.html pattern)
8. Add action cards to Overview tab ("Start Sowing", "Print Labels", etc.)
9. Delete wholesale-seedlings.html (legacy duplicate)
10. Add basic ARIA labels to all interactive elements

### Phase 2: Next Sprint (larger effort)
11. Embed label printing modal in greenhouse-dashboard (reuse labels.html QR logic)
12. Embed sowing sheet preview modal in greenhouse-dashboard
13. Add bulk "Mark All Sown" for a section
14. Full WCAG 2.2 pass: focus traps, aria-live, role attributes
15. Restructure from 6 tabs to 4 tabs

### Phase 3: Polish (lower priority)
16. Add keyboard shortcuts (S = sow, P = print, N = next)
17. Add first-visit onboarding tooltips
18. Add client-side caching for API responses
19. Unify "Mark Sown" UX between dashboard and quick-seed
20. Mobile responsive pass on sowing-sheets.html and labels.html

---

## Part 11: Competitive Benchmark (Updated)

| Feature | Tend App | farmOS | SBI Grower | **Tiny Seed (Current)** | **Tiny Seed (Proposed)** |
|---------|----------|--------|------------|------------------------|-------------------------|
| Morning task view | Auto-show | Dashboard widget | Scan to start | Buried in tab #2 | **Default tab** |
| Steps to mark sown | 1 tap | 2 clicks | 1 scan | 4 clicks + modal | **1 click + undo** |
| Label printing | Integrated | Plugin | Auto-print | Separate page | **Button per card** |
| Task sheets | Integrated | Report view | Auto-generate | Separate page | **Quick actions bar** |
| Progress tracking | Visual bar | Percentage | Real-time | None | **Progress bar** |
| Mobile | Native app | Responsive | Native + scan | Separate PWA | **PWA + dashboard** |
| Onboarding | Guided tour | Docs | Training mode | None | **Tooltip tour** |

---

## Part 12: Summary Scores

| Category | Score | Notes |
|----------|-------|-------|
| Nielsen's Heuristics Average | 3.9/10 | Heuristics #3, #6, #9, #10 are critical failures |
| Task Completion Efficiency | 3/10 | 4 pages, 12+ clicks for core morning routine |
| Learnability | 3/10 | No onboarding, misleading default tab |
| Memorability | 5/10 | Consistent once learned, but 4-page dance is forgettable |
| Error Recovery | 2/10 | No undo on dashboard, generic errors, no retry |
| Accessibility (WCAG 2.2) | 2/10 | Level A failure — no ARIA, no keyboard, no focus management |
| Mobile Responsiveness | 6/10 | quick-seed excellent; sowing-sheets and labels poor |
| Visual Design | 7/10 | Cohesive dark theme, professional palette |
| **OVERALL UX SCORE** | **47/100** | Strong individual components, broken workflow |

---

## Appendix A: Files Audited

| File | Lines | Purpose | Mobile | Accessibility |
|------|-------|---------|--------|---------------|
| greenhouse-dashboard.html | ~3200 | Central hub (6 tabs) | Acceptable | Poor |
| sowing-sheets.html | ~1952 | Task sheet management | Poor | Partial |
| labels.html | ~3203 | Label printing (QR) | Very Poor | Fair |
| quick-seed.html | ~982 | Mobile execution PWA | Excellent | Partial |
| seedling-admin.html | ~2952 | Variety/allocation CMS | Poor | Partial |
| seedling-presale-2026.html | ~3000+ | Customer presale | Excellent | Fair |
| seedling-wholesale-2026.html | ~1621 | Wholesale orders | Good | Fair |
| wholesale-seedlings.html | ~880 | **LEGACY DUPLICATE** | Basic | N/A — delete |

## Appendix B: API Endpoints Mapped

30+ API endpoints documented across all pages. Full list in greenhouse-dashboard agent report.

---

*Audit conducted 2026-02-28 by PM_Architect using Nielsen Norman Group heuristic methodology, WCAG 2.2 Level AA criteria, and competitive benchmarking against Tend, farmOS, and SBI Grower.*
