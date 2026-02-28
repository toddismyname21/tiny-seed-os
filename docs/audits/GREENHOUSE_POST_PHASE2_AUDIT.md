# Greenhouse Dashboard — Post-Phase 2 UX Audit
### Tiny Seed Farm OS — 2026-02-28
### Auditor: PM_Architect (Claude Opus 4.6) — Senior UX Methodology

---

## Phases Completed

| Phase | Status | What Shipped |
|-------|--------|-------------|
| **Phase 0** | DEPLOYED | Default tab → Today's Tasks, "Operations" → "Overview", Escape key on modals, touch targets 44px |
| **Phase 1** | DEPLOYED | Morning progress bar, card action buttons (Label/Sheet/Done), undo toast with countdown, Overview action cards, wholesale redirect, ARIA roles/labels on all tabs + modals + toast |
| **Phase 2 (partial)** | DEPLOYED | Bulk "Mark All Sown" on overdue, modal focus traps (Tab/Shift+Tab cycling), auto-focus first input on modal open, focus restoration on modal close |

### Phase 2 Remaining

| # | Item | Status |
|---|------|--------|
| 11 | Embed label printing modal in dashboard | NOT STARTED |
| 12 | Embed sowing sheet preview modal | NOT STARTED |
| 15 | Restructure from 6 tabs to 4 tabs | NOT STARTED |

---

## Nielsen's 10 Heuristics Evaluation

| # | Heuristic | Before | After | Score | Finding | Severity |
|---|-----------|--------|-------|-------|---------|----------|
| 1 | **Visibility of system status** | 4/10 | **7/10** | +3 | Morning progress bar shows "Today's Progress: X%" with animated fill. Undo toast displays countdown timer (5s). Optimistic UI instantly removes cards on Mark Sown. Bulk sow shows "Marking N tasks..." feedback. **Remaining:** Regular toast still 3.5s timeout, no persistent error banner. | 2 |
| 2 | **Match between system and real world** | 6/10 | **7/10** | +1 | "Operations" → "Overview". Card buttons use farm language ("Done" not "Complete Task"). Action cards say "Start Sowing" not "Execute Sowing Operations". **Remaining:** Seed lot modal uses technical batch IDs. | 2 |
| 3 | **User control and freedom** | 3/10 | **7/10** | +4 | Undo toast on Mark Sown (5s), Mark Transplanted (5s). Escape closes modals. Click overlay closes modals. Focus returns to trigger element. **Remaining:** Bulk mark has no undo (confirm-only). No breadcrumbs. | 2 |
| 4 | **Consistency and standards** | 4/10 | **6/10** | +2 | Mark Sown now matches quick-seed pattern (optimistic UI + undo). Card action buttons consistent (Label/Sheet/Done on every task card). Sub-tabs have aria-selected. **Remaining:** 6 tabs still (not 4). Label/Sheet buttons open external pages, not embedded. | 3 |
| 5 | **Error prevention** | 5/10 | **6/10** | +1 | Bulk mark requires confirm dialog. Undo prevents accidental single marks. Failed bulk ops report exact count. **Remaining:** Inline chips still save-on-blur. CSV import limited preview. | 2 |
| 6 | **Recognition rather than recall** | 3/10 | **7/10** | +4 | Today's Tasks is DEFAULT — zero recall needed. Overview has 3 action cards (Start Sowing / Print Labels / Print Sheets). Each task card has Label/Sheet/Done buttons in-context. **Remaining:** Label/Sheet still navigate away. | 2 |
| 7 | **Flexibility and efficiency of use** | 4/10 | **6/10** | +2 | Bulk "Mark All Sown" for overdue batch. Per-card action buttons skip navigation. Print button on section header. **Remaining:** No keyboard shortcuts. No bulk for non-overdue section. | 3 |
| 8 | **Aesthetic and minimalist design** | 7/10 | **8/10** | +1 | Overview tab: action cards + collapsed stats (not wall of data). Progress bar adds focused info. Undo toast is minimal and centered. **Remaining:** 6 tabs create cognitive load. | 2 |
| 9 | **Help users recover from errors** | 2/10 | **5/10** | +3 | Undo toast (5s window) on sow + transplant. Tray inventory retry button on API failure. Bulk failure shows "X of Y failed — reload to check". API errors caught and reverted. **Remaining:** No persistent error banner. Regular toast 3.5s is too short. No offline queuing. | 3 |
| 10 | **Help and documentation** | 1/10 | **1/10** | 0 | NO CHANGE. Zero onboarding. Zero tooltips. Zero help text. Zero contextual guidance. This remains the biggest gap. | 4 |

### Heuristic Average: 6.0/10 (was 3.9/10, improvement: +2.1)

---

## WCAG 2.2 Accessibility Re-Assessment

### Keyboard Navigation

| Feature | Before | After | Status |
|---------|--------|-------|--------|
| Tab role attributes | MISSING | `role="tablist"` + `role="tab"` + `aria-selected` + `tabindex` | PASS |
| Panel role attributes | MISSING | `role="tabpanel"` + `aria-labelledby` | PASS |
| Modal role attributes | MISSING | `role="dialog"` + `aria-modal="true"` + `aria-label` on all 10 modals | PASS |
| Escape key closes modals | MISSING | Closes topmost modal, prevents default | PASS |
| Focus trap in modals | MISSING | Tab/Shift+Tab cycles within modal (first↔last focusable) | PASS |
| Auto-focus on modal open | MISSING | First focusable element (input/select/button) receives focus | PASS |
| Focus restoration on close | MISSING | Returns focus to trigger element via `modal._triggerEl` | PASS |
| Toast announcements | MISSING | `aria-live="polite"` on toast element | PASS |
| Arrow keys on tab bar | MISSING | Still missing | FAIL |
| `aria-expanded` on collapsible sections | MISSING | Still missing on `<details>` elements | FAIL |
| `aria-busy` on loading states | MISSING | Still missing | FAIL |

### Touch Targets

| Element | Before | After | WCAG 2.2 (48px) |
|---------|--------|-------|-----------------|
| `.btn` | 40px | **44px** | CLOSE (borderline pass) |
| `.btn-sm` | 36px | **44px min-h, 44px min-w** | CLOSE |
| `.btn-action` (card buttons) | N/A (new) | **44px** | CLOSE |
| `.detail-chip` | 32px | **36px** | FAIL (still 12px short) |
| Modal close buttons | Standard | Standard + `aria-label="Close"` | PASS (clickable area adequate) |

### Color Contrast — No change (already WCAG AA pass on all primary elements)

### Accessibility Score: 5.5/10 (was 2/10, improvement: +3.5)

---

## Task Completion Efficiency

| Task | Before (clicks/pages) | After Phase 2 | Improvement |
|------|----------------------|---------------|-------------|
| "What do I sow today?" | 3 clicks / 1 page | **0 clicks** (auto-default) | 3 clicks eliminated |
| "Mark tray as sown" | 4 clicks + modal / 1 page | **1 click (Done)** → modal → confirm → undo toast | ~2 clicks saved + recovery option |
| "Mark all overdue sown" | Not possible | **1 click** (Mark All Sown) → confirm | NEW capability |
| "Print today's labels" | 6+ clicks / 2 pages | **1 click** (Label on card) → labels.html | 3 clicks saved, still 2 pages |
| "Print task sheets" | 5+ clicks / 2 pages | **1 click** (Print button) | 3 clicks saved, still leaves page |
| "Full morning routine" | 12-18 clicks / 4 pages | **6-9 clicks / 2-3 pages** | ~50% reduction |

**Task Completion Score: 6/10** (was 3/10, improvement: +3)

---

## TOP 3 CRITICAL ISSUES (Remaining)

### CRITICAL #1: Zero Onboarding (Heuristic #10 = 1/10)
**Severity: 4/5 | Impact: Every new user**

A new greenhouse employee opens this dashboard and sees a sophisticated dark UI with 6 tabs, stat cards, and task cards — but ZERO guidance on what to do first. No tooltip tour. No "Welcome" overlay. No contextual help icons. The morning progress bar is helpful IF you understand the system; useless if you don't.

**Recommendation:** First-visit tooltip tour (3-5 steps): "This is your daily task list → Click Done when sown → Use the progress bar to track your morning → Print labels from each card."

**Effort:** Medium | **Impact:** Transforms new user experience

### CRITICAL #2: Label & Sheet Still External Pages (Heuristic #4 = 6/10)
**Severity: 3/5 | Impact: Every morning routine**

Card buttons for "Label" and "Sheet" are a massive UX improvement over the old zero-button state. But they still navigate to `labels.html` and `sowing-sheets.html` — breaking context. The user leaves their task list, does a print action, and must navigate back. This is the #1 remaining friction in the morning routine.

**Recommendation:** Embed label preview as a print-ready modal inside the dashboard. Reuse QR generation logic from labels.html. For sowing sheets, embed a simplified print-ready task card view.

**Effort:** High | **Impact:** Eliminates the last page navigations from the core morning loop

### CRITICAL #3: Still 6 Tabs (Heuristic #8 = 8/10)
**Severity: 3/5 | Impact: Cognitive load on every visit**

6 tabs + 5 sub-tabs in Sales = 11 navigation targets. Research consensus: 3-5 primary nav items maximum. Reports tab is rarely used (periodic, not daily). Consolidating to 4 tabs (Today, Inventory, Growth, Sales) with Reports in an overflow menu would reduce cognitive load by 33%.

**Recommendation:** Merge Overview stats into Today's Tasks as collapsible header. Move Reports to overflow/More menu. Result: 4 tabs.

**Effort:** Medium | **Impact:** Cleaner information architecture

---

## TOP 3 QUICK WINS (Next Priorities)

### QUICK WIN #1: Add Undo to Bulk Mark All Sown
**Effort: 30 min | Impact: 7/10**

The individual Mark Sown has undo (5s). The bulk "Mark All Sown" only has a confirm dialog — no undo. Add the same undo toast pattern: optimistically mark all, show undo toast, delay API calls by 5s.

### QUICK WIN #2: Increase Detail Chip Touch Targets
**Effort: 5 min | Impact: 5/10**

Detail chips are still 36px (below WCAG 2.2's 48px ideal, below our 44px standard for buttons). Change `min-height:36px` → `min-height:44px` to match all other interactive elements.

### QUICK WIN #3: Add `aria-expanded` to Collapsible Sections
**Effort: 15 min | Impact: 5/10**

The Overview tab `<details>` element and seed warning banner expandable section lack `aria-expanded`. Add it for screen reader users to understand toggle state.

---

## Summary Scores

| Category | Phase 0 Baseline | After Phase 0+1+2 | Change |
|----------|-----------------|-------------------|--------|
| Nielsen's Heuristics Average | 3.9/10 | **6.0/10** | **+2.1** |
| Task Completion Efficiency | 3/10 | **6/10** | **+3** |
| Learnability | 3/10 | **6/10** | **+3** |
| Memorability | 5/10 | **7/10** | **+2** |
| Error Recovery | 2/10 | **5/10** | **+3** |
| Accessibility (WCAG 2.2) | 2/10 | **5.5/10** | **+3.5** |
| Mobile Responsiveness | 6/10 | **6/10** | **0** |
| Visual Design | 7/10 | **8/10** | **+1** |
| **OVERALL UX SCORE** | **47/100** | **66/100** | **+19 (+40%)** |

---

## What Changed Per Phase

### Phase 0 Impact (Quick Wins)
- Default tab fix: +4 clicks saved per visit (Heuristic #6: 3→7)
- Escape key + touch targets: Foundation for accessibility
- "Overview" rename: Small but meaningful language improvement

### Phase 1 Impact (Core Workflow)
- Morning progress bar: Visibility of status (Heuristic #1: 4→6)
- Card action buttons: Recognition over recall (Heuristic #6: biggest single lift)
- Undo toast: Control and freedom (Heuristic #3: 3→7)
- Overview action cards: Dead-end tab → launchpad
- ARIA labels: Accessibility from 2/10 → 4/10

### Phase 2 Impact (Polish + Accessibility)
- Bulk mark sown: Efficiency for power users (Heuristic #7: 4→6)
- Focus traps: Critical accessibility (modal keyboard usability)
- Focus management: Auto-focus + restoration = professional modal UX
- ARIA completion: Accessibility from 4/10 → 5.5/10

---

## Next Steps: Phase 2 Completion + Phase 3

### Phase 2 Remaining (implement next)
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 11 | Embed label printing modal (reuse labels.html QR logic) | High | Eliminates 1 page navigation |
| 12 | Embed sowing sheet preview modal | Medium | Eliminates 1 page navigation |
| 15 | Restructure from 6 tabs to 4 tabs | Medium | Reduces cognitive load 33% |

### Phase 3 (after Phase 2 complete)
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 16 | Keyboard shortcuts (S=sow, P=print, N=next) | Medium | Power user efficiency |
| 17 | First-visit onboarding tooltips | Medium | Learnability 6→8 |
| 18 | Client-side caching for API responses | High | Performance |
| 19 | Unify Mark Sown UX between dashboard + quick-seed | Medium | Consistency |
| 20 | Mobile responsive pass (sowing-sheets + labels) | Medium | Mobile usability |

---

*Audit conducted 2026-02-28 after Phase 0+1+2 deployment. Methodology: Nielsen Norman Group 10 Heuristics, WCAG 2.2 Level AA, task completion analysis. Baseline: pre-implementation audit score 47/100.*
