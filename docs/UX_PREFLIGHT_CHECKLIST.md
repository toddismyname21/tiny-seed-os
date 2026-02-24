# UX Preflight Checklist

> **MANDATORY:** Run this checklist before ANY UI work. No exceptions.
>
> This is a **living document** backed by a dynamic rule engine at `config/ux_audit_rules.json`.
> The automated audit script reads rules from that JSON — add new rules there, and checks update automatically.
>
> Synthesized from 14+ research documents. Sources: NN/g, Linear, Notion, Things 3, Apple HIG, Google MD3, IxDF, Stanford CASA, Deloitte, a16z, Baymard, MIT Media Lab, Laws of UX.

---

## THIS SYSTEM IS DYNAMIC

The UX audit evolves with the industry. Here's how:

### To add a new rule
Edit `config/ux_audit_rules.json` — append to the `rules` array:
```json
{
  "id": "XX-NNN",
  "category": "cognitive_load",
  "severity": "high",
  "check_type": "automated",
  "name": "Short name",
  "description": "What to check and why",
  "pattern": "regex_to_find",
  "source": "Where this rule came from",
  "added": "2026-MM-DD",
  "active": true
}
```

### To update a threshold
Edit the `thresholds` object in `config/ux_audit_rules.json`:
```json
"touch_target_min_px": 48  // Changed from 44 based on new research
```

### To deprecate a rule
Set `"active": false` — the rule stays for history but stops being checked.

### To add a new category
Add to the `categories` object. Rules can reference it immediately.

### To log evolution
Append to `evolution_log` so the team knows what changed and why.

### When to evolve
- After reading new UX research
- After a user reports a UX issue that should be caught
- After industry standards change (WCAG updates, new device form factors)
- After competitive analysis reveals new patterns
- After any "this should have been caught" moment

---

## How to Use This Checklist

1. **Before starting UI work:** Read the relevant sections for your task type
2. **During implementation:** Reference thresholds and patterns
3. **Before declaring done:** Run `./scripts/ux-preflight-audit.sh <file>` for automated checks
4. **Before deploying:** Complete the Final Gate section

### Task Type Quick Reference

| Task Type | Required Sections |
|-----------|-------------------|
| New page/component | ALL sections |
| Bug fix (UI) | Section 1, 2, 3, 8 |
| Style/CSS change | Section 1, 2, 5, 6, 8 |
| Adding buttons/forms | Section 2, 3, 4, 5, 8 |
| Mobile work | Section 5, 6, 8 |
| Dashboard/data display | Section 1, 3, 4, 7, 8 |

---

## Section 1: Cognitive Load (Miller's Law + Hick's Law)

**Principle:** The average person holds 5-9 items in working memory. More choices = slower decisions = higher abandonment.

### Hard Limits

| Element | Maximum | Source |
|---------|---------|--------|
| Primary nav items (mobile) | 3-5 | Navigation Patterns |
| Primary nav items (desktop) | 5-7 | Navigation Patterns |
| Tab panels | 5 (ideally 3-4) | Progressive Disclosure |
| Dropdown items per menu | 7 before grouping | Cognitive Load |
| Form fields visible at once | 5-7 | Cognitive Load |
| Process steps visible | 5 | Cognitive Load |
| Notifications visible at once | 2 | Core UX Principles |
| Visuals per dashboard | 5-12 | UX Research 2026 |
| Icons users remember on first use | ~4 | UX Research 2026 |

### Checklist

- [ ] **Nav items within limits?** Count primary navigation items. Mobile: 3-5. Desktop: 5-7. Sidebar: 5-9 with grouping.
- [ ] **No tab overload?** Maximum 5 tabs visible. If more needed, use "More" dropdown or consolidate.
- [ ] **Clear visual hierarchy?** Can you tell what's most important in <3 seconds without reading?
- [ ] **Smart defaults reduce decisions?** Pre-fill fields, select most common option, auto-detect context.
- [ ] **No decision paralysis?** User should know "what to do first" within 5 seconds of seeing the page.
- [ ] **Scannable headings?** Short paragraphs, bullet points, plain language (no jargon).
- [ ] **Recognition over recall?** Show options as buttons/dropdowns, don't make users type from memory.
- [ ] **Consistent patterns?** If "Save" is top-right on one screen, it's top-right on ALL screens.
- [ ] **One primary action per screen?** Visual hierarchy guides the eye to the single most important thing.
- [ ] **"Time to answer" under 30 seconds?** If users can't act on data within 30 seconds, revise hierarchy.

### Warning Signs of High Cognitive Load
- Too many things visible at once (feature sprawl)
- Users don't know where to start (decision paralysis)
- Frequent user mistakes (error rates)
- Users leaving mid-task (abandonment)
- "How do I...?" questions (support requests)

---

## Section 2: Design System Compliance

**Principle:** Consistency reduces learning load. Same patterns everywhere = less thinking.

### Color Tokens (Use ONLY These)

```css
/* PRIMARY — Use var() references, NEVER hardcode hex */
--ts-green-500: #22c55e;     /* THE canonical primary green */
--primary: #2d5a27;           /* Dark green — buttons, accents */
--primary-light: #4a7c43;     /* Hover states */
--primary-dark: #1e3d1a;      /* Pressed states */
--success: #22c55e;           /* Success, completed */
--warning: #f59e0b;           /* Amber — warnings, overdue */
--danger: #ef4444;            /* Red — errors, delete */
--info: #3b82f6;              /* Blue — information, links */
--secondary: #f4a261;         /* Orange — secondary actions */

/* BACKGROUNDS */
--bg-dark: #0f172a;           /* Main background */
--bg-card: #1e293b;           /* Card backgrounds */
--bg-elevated: #334155;       /* Elevated elements, inputs */

/* TEXT */
--text-primary: #f8fafc;      /* Main text */
--text-secondary: #94a3b8;    /* Secondary text */
--text-muted: #64748b;        /* Muted — NEVER for important info */

/* BORDERS */
--border: rgba(255, 255, 255, 0.1);
--border-active: rgba(74, 124, 67, 0.5);
```

### Checklist

- [ ] **No hardcoded colors?** Every color uses a CSS variable, never a raw hex value.
- [ ] **Primary green is correct?** Using `var(--ts-green-500)` or `#22c55e`, NOT `#4A7C43` or `#2d5a27` for accent.
- [ ] **Shadow tokens used?** Only the 5 design system shadow levels (xs, sm, md, lg, xl). No custom `box-shadow`.
- [ ] **Border radius tokens?** Only 4 values: sm, md, lg, xl. No arbitrary `border-radius: 7px`.
- [ ] **Spacing follows 4px base?** xs(4), sm(8), md(12), lg(16), xl(20), 2xl(24). No arbitrary values.
- [ ] **Typography uses fluid scale?** 6 design system sizes. No hardcoded px/rem outside the scale.
- [ ] **Button uses `.ts-btn` variants?** 9 variants exist. Don't create new button styles.
- [ ] **Card uses `.ts-card` types?** 3 card types exist. Don't create new card styles.
- [ ] **`data-theme` attribute set?** Every page must have `data-theme="dark"` or `data-theme="light"`.
- [ ] **Design system CSS linked?** `<link rel="stylesheet" href="tiny-seed-design-system.css">` present.
- [ ] **Animations use system definitions?** 5 standard animations. No new `@keyframes` for existing effects.

### Known Violations to Fix (from Visual Design Audit)

| Issue | Pages Affected | Fix |
|-------|---------------|-----|
| Wrong primary green | manager-dashboard, employee | Change to `var(--ts-green-500)` |
| 30+ custom shadows | Most pages | Replace with system tokens |
| 8 radius values | Many pages | Consolidate to 4 |
| Hardcoded typography | Many pages | Use fluid scale |
| Missing design system link | seedling-presale-2026 | Add link |

---

## Section 3: Progressive Disclosure

**Principle:** Don't show everything at once. Hide 80%, show 20%. Reveal complexity as users demonstrate readiness.

### The 4 Levels

| Level | Content | Trigger | Example |
|-------|---------|---------|---------|
| **Immediate** | Core, most-used (20%) | Always visible | Task title, status, due date |
| **First interaction** | Common options | Click/hover | Priority, assignee, tags |
| **Demonstrated readiness** | Advanced features | Scroll/explore | Subtasks, attachments, history |
| **Expert mode** | Power features | Shortcuts/settings | Automation, API access |

### What Goes Where

**Always Visible (Level 1):** Primary action (Create/Save/Submit), current status, main navigation, search.

**On Interaction (Level 2):** Secondary actions, filters/sorting, edit options, sharing.

**Behind "More" (Level 3):** Rarely-used features, configuration, history/logs, export/import.

**Settings Only (Level 4):** Integrations, API access, automation, developer tools.

### Checklist

- [ ] **Essential info visible without scrolling?** Primary data and actions are above the fold.
- [ ] **Advanced options hidden by default?** Use accordions, "More options", or tabs.
- [ ] **No more than 2 clicks for common tasks?** Path from landing to completing frequent action.
- [ ] **Long lists collapsible?** Lists > 5 items should be collapsible/paginated.
- [ ] **Forms show only essential fields?** Optional fields behind "More options" or "Advanced".
- [ ] **Using `<details>/<summary>` for expandable content?** Native HTML progressive disclosure.
- [ ] **Sections logically grouped before revealing?** Related items expand together.
- [ ] **Critical actions NOT hidden?** Primary actions always visible — never behind menus.
- [ ] **Empty states guide the user?** No blank screens. Show icon + heading + helpful action.

### Implementation Patterns (Ranked by Preference)

1. **Accordions/Collapsibles** — Click header to expand (settings, additional details)
2. **Tabs** — Max 5 panels (content organization)
3. **Dropdown menus** — Max 7 items per menu
4. **Scroll-based revelation** — Content appears as user scrolls
5. **Contextual menus** — Right-click/hover (always have keyboard equivalent)
6. **`<details>/<summary>`** — Native HTML, zero JS required

---

## Section 4: Content & Copy

**Principle:** Clear over clever. Brief over verbose. Helpful over performative. Warm over formal.

### Checklist

- [ ] **Plain English labels?** No code-style labels, no jargon. "Sow in greenhouse" not "ghsow".
- [ ] **Action verbs on buttons?** "Save Changes", "Add Item", "Export CSV" — not "Submit" or "OK".
- [ ] **Error messages are helpful?** "That didn't work. Try [alternative]?" not "Error 500".
- [ ] **Empty states are encouraging?** "Ready to start? [Action button]" not "No data found."
- [ ] **Microcopy has personality?** Warm but professional. Not robotic, not over-enthusiastic.
- [ ] **Labels describe outcomes?** "Track Your Rankings" is better than "Log Rankings".
- [ ] **No placeholder text in production?** No "[INSERT NAME]", "TBD", or "Lorem ipsum".
- [ ] **Numbers are human-readable?** `123-456-7890` not `1234567890`. `$1,234` not `1234`.
- [ ] **Time/dates are relative when useful?** "2 hours ago" vs "2026-02-24T14:30:00Z".
- [ ] **Tooltips explain "why"?** Not just "what" — explain the benefit of the action.

### Tone by Situation

| Situation | Tone | Example |
|-----------|------|---------|
| Greeting | Warm, brief | "Morning! 3 tasks today." |
| Instruction | Clear, direct | "Select the crop, then set quantity." |
| Error | Calm, helpful | "That didn't work. Try [alternative]?" |
| Celebration | Genuine, understated | "Nice work!" (not a parade) |
| Waiting | Patient, informative | "Loading your data..." |

### Anti-Patterns

- "I'm so sorry! An unexpected error occurred!" (over-apologizing)
- "Hello! Welcome back! Let me tell you about..." (over-enthusiastic greeting)
- "I have analyzed your task list and determined that..." (robotic)
- Generic "Error" or "Failed" with no guidance

---

## Section 5: Touch Targets & Interactive Elements

**Principle:** Design for dirty hands, bright sun, quick glances. "One thumb, one eyeball."

### Size Requirements

| Context | Minimum | Recommended | Spacing |
|---------|---------|-------------|---------|
| Standard desktop | 44x44px | 48x48px | 8px |
| Standard mobile | 44x44px | 48x48px | 8px |
| Field/outdoor use | 56x56px | 64x64px | 16px |
| Gloved operation | 60x60px | 72x72px | 20px |
| PIN pad / number entry | 70x80px | 80x80px | 16px |

### Checklist

- [ ] **All interactive elements >= 44px?** Buttons, links, checkboxes, toggles, inputs.
- [ ] **Primary action buttons >= 48px tall?** Submit, Save, Create, Complete.
- [ ] **Field mode buttons >= 60px?** If page is used outdoors/in field.
- [ ] **Adequate spacing between targets?** Minimum 8px gap, 16px for field use.
- [ ] **Primary actions in thumb zone?** Bottom 45% of screen on mobile.
- [ ] **No critical actions in top corners?** Hard to reach with one hand.
- [ ] **Touch feedback provided?** `button:active { transform: scale(0.98); }` on all buttons.
- [ ] **Inputs have 16px font size?** Prevents iOS auto-zoom on focus.
- [ ] **Form inputs >= 48px tall?** `min-height: 48px` on all inputs.
- [ ] **Icons have labels?** Icons alone reduce discoverability by 50%. Use icon + text.

### CSS Pattern for Touch Feedback (Required)

```css
button:active, .clickable:active {
    transform: scale(0.98);
    transition: transform 50ms;
}
```

---

## Section 6: Mobile & Responsive

**Principle:** Mobile is a different experience, not a shrunk desktop. Rethink for touch.

### Breakpoints

```css
--breakpoint-sm: 480px;   /* Small phone */
--breakpoint-md: 768px;   /* Mobile landscape / tablet portrait */
--breakpoint-lg: 1024px;  /* Tablet landscape */
--breakpoint-xl: 1280px;  /* Desktop */
```

### Checklist

- [ ] **Bottom navigation on mobile?** Tab bar with 4 items max (not hamburger as primary nav).
- [ ] **FAB for primary action?** Floating Action Button, bottom-right, for main creation action.
- [ ] **Single column layout on mobile?** No side-by-side panels below 768px.
- [ ] **Tables become cards on mobile?** Complex tables → stacked card view.
- [ ] **Sidebar collapses?** Sidebar → bottom sheet or hamburger below 768px.
- [ ] **No horizontal scroll?** `overflow-x: hidden` on mobile viewports.
- [ ] **Full-screen modals on mobile?** Modals fill screen below 480px.
- [ ] **Pull-to-refresh on PWA pages?** If applicable.
- [ ] **Safe area insets for notched devices?** `env(safe-area-inset-top)` etc.
- [ ] **Text readable without zooming?** Body text 16px minimum on mobile.
- [ ] **Media queries cover all sizes?** Test at 480px, 768px, 1024px, 1280px.
- [ ] **Swipe gestures where appropriate?** Swipe left (delete), right (complete), down (refresh).

### Mobile Anti-Patterns to Avoid

1. **Hamburger menu as primary nav** — Hides everything, reduces discoverability 50%+
2. **Horizontal scrolling tabs** — 11 tabs scrolling = cognitive overload
3. **Tiny close buttons** — Modal dismiss targets must be 44px+
4. **Desktop sidebar on mobile** — Fixed 260px sidebar crushes content
5. **Deep nesting** — 3 levels max on mobile

---

## Section 7: Speed & Performance

**Principle:** Speed IS the product. Users equate speed with quality, reliability, and trust.

### Response Time Thresholds

| Time | Perception | Action |
|------|-----------|--------|
| <50ms | Direct manipulation | Button press feedback |
| <100ms | Instantaneous | All UI interactions |
| 100-300ms | Fast | Noticeable but acceptable |
| 300-1000ms | Sluggish | Must show loading indicator |
| >1000ms | Slow | Must show progress bar |
| >10s | Broken | User assumes error, abandons |

### Performance Budget

| Asset | Budget |
|-------|--------|
| JavaScript bundle (gzipped) | < 200KB |
| CSS bundle | < 50KB |
| Images per page | < 500KB |
| API response (p95) | < 200ms |
| Page load (3G) | < 3 seconds |
| First paint | < 1 second |
| Time to interactive | < 5 seconds |
| LCP (Largest Contentful Paint) | < 2.5s |
| FID (First Input Delay) | < 100ms |
| CLS (Cumulative Layout Shift) | < 0.1 |

### Checklist

- [ ] **Optimistic UI updates?** UI updates immediately, syncs in background, rollback if fails.
- [ ] **Skeleton screens instead of spinners?** Gray placeholders showing layout, not spinning circles.
- [ ] **Lazy loading for below-fold content?** Images, components, data loaded when needed.
- [ ] **Search debounced at 300ms?** Don't fire on every keystroke.
- [ ] **No layout shifts after load?** CLS < 0.1. Reserve space for async content.
- [ ] **Keyboard shortcuts for power users?** Cmd+K (command palette), Cmd+S (save), etc.
- [ ] **Service worker for offline/caching?** Core functions work offline.
- [ ] **Loading prioritization correct?** Critical CSS → content → images → secondary features → analytics.
- [ ] **Prefetching on hover/scroll?** Load likely-next content before user requests it.
- [ ] **No redundant API calls?** Cache responses, don't re-fetch unchanged data.

### Animation Timing

| Type | Duration |
|------|----------|
| Micro-interactions (button press) | 100-200ms |
| Transitions (panel open/close) | 200-300ms |
| Complex animations (celebrations) | 300-500ms max |

---

## Section 8: Accessibility & Inclusivity

**Principle:** Design for dirty hands, bright sun, bilingual workforce, varying tech comfort.

### Checklist

- [ ] **Color contrast >= 4.5:1 for text?** 7:1 for field/outdoor use.
- [ ] **Don't rely on color alone?** Use icons, text, or patterns in addition to color.
- [ ] **ARIA labels on all buttons?** `aria-label="Close dialog"` on icon-only buttons.
- [ ] **Focus indicators visible?** Custom focus states, not just browser default.
- [ ] **Escape always closes modals?** No keyboard traps.
- [ ] **`data-i18n` on translatable text?** English and Spanish support required.
- [ ] **Alt text on meaningful images?** Decorative images get `alt=""`.
- [ ] **High contrast mode works?** Test with system high contrast enabled.
- [ ] **Undo available for destructive actions?** Delete → "Undo" toast for 5 seconds.
- [ ] **Autosave to prevent data loss?** Forms save progress periodically.

### Safe Area Insets (For Fixed Positioning)

```css
:root {
    --safe-top: env(safe-area-inset-top, 0px);
    --safe-bottom: env(safe-area-inset-bottom, 0px);
}
```

---

## Section 9: Character & Personality

**Principle:** Characters should be ambient — present when needed, quiet during focus.

### Interaction Rules

| Rule | Limit |
|------|-------|
| Greetings | Once per session, context-aware, one line |
| Nudges visible at once | Maximum 2 |
| Nudge auto-dismiss | 5 seconds |
| Minimum between interruptions | 2 minutes |
| Celebrations | 30% of completions (not every one) |

### Checklist

- [ ] **Character not blocking primary tasks?** Suggestions dismissable with one action.
- [ ] **Appropriate presence level?** Persistent avatar: 24-36px. Conversation: 48-64px.
- [ ] **Explains decisions?** "Suggesting this because [context]" — never hide the "why".
- [ ] **Admits uncertainty?** "I'm not sure. Here are options..." when confidence is low.
- [ ] **Offers overrides?** User can always reject AI suggestions.
- [ ] **Respects quiet hours?** No interruptions during "do not disturb".

---

## Section 10: Dual-Context Design (Field vs Office)

**Principle:** 0% implemented as of audit. This is the foundational strategy for the entire system.

### Field Mode Requirements

- [ ] High-contrast color scheme (#0f172a bg, #22c55e buttons, #ffffff text)
- [ ] Touch targets minimum 60px (72px preferred)
- [ ] Maximum 2 taps for any primary action
- [ ] Body text 18px minimum, headers 24px+ bold
- [ ] Voice input offered as primary input method
- [ ] Offline capability for core functions
- [ ] Auto-detect context (time of day, location, device orientation)
- [ ] Mode toggle visible and accessible

### Office Mode Requirements

- [ ] Keyboard shortcuts documented and functional
- [ ] J/K navigation (Vim-style) for lists
- [ ] Cmd+K command palette
- [ ] Batch operations available
- [ ] Information density options (compact/comfortable/spacious)
- [ ] Distraction-free/focus mode
- [ ] Progress indicators and completion celebrations

### Cross-Context Requirements

- [ ] Seamless sync between modes
- [ ] Consistent branding across both
- [ ] Clear mode indicator visible
- [ ] User preferences remembered
- [ ] Unified notification system

---

## Section 11: Gamification & Habit Formation

**Principle:** Currently 0% implemented. Streak tracking, celebrations, and progress are missing system-wide.

### Checklist

- [ ] **Streak tracking?** Consecutive days of activity displayed.
- [ ] **Completion celebrations?** Brief "Nice work!" on task completion (30% of the time).
- [ ] **Progress indicators?** Show how close user is to goal.
- [ ] **Milestone recognition?** "You've logged 100 harvests!" at key thresholds.
- [ ] **Streak freeze available?** Ethical gamification — don't punish for sick days.
- [ ] **Weekly ritual support?** Built-in "SEO Sunday", "Market Monday" planning flows.
- [ ] **Encouraging empty states?** "Ready to dominate? Log your first ranking!" not "No data."

---

## Section 12: Final Gate (Before Declaring Done)

### Mandatory Evidence for Each Task Type

| Task Type | Required Evidence |
|-----------|-------------------|
| Bug fix | Test execution output captured |
| UI change | DOM verification or visual confirmation |
| API change | curl response captured |
| New component | Renders without JS errors |
| Style change | Before/after comparison |
| Mobile fix | Tested at 480px and 768px viewports |

### Pre-Deploy Checklist

- [ ] **No JS console errors?** Open DevTools, check console.
- [ ] **No hardcoded API URLs?** All use `api-config.js`.
- [ ] **No demo/placeholder data?** Show real data or empty states.
- [ ] **CHANGE_LOG.md updated?** With date, role, files, changes.
- [ ] **Design system tokens used?** No raw hex, px, or custom shadows.
- [ ] **Responsive at all breakpoints?** 480, 768, 1024, 1280.
- [ ] **Touch targets verified?** All interactive elements >= 44px.
- [ ] **Loading states present?** Skeleton screens for async content.
- [ ] **Empty states defined?** Every data section has an empty state.
- [ ] **Progressive disclosure applied?** Advanced features hidden by default.

---

## Automated Checks

Run the automated audit script:

```bash
./scripts/ux-preflight-audit.sh <filename.html>
```

This checks:
- Color token compliance (no hardcoded hex)
- Touch target minimums (44px)
- Nav item counts
- Tab counts
- Missing ARIA labels
- Design system CSS link
- API config import
- Viewport meta tag
- Font size (16px minimum on inputs)
- data-theme attribute
- Empty state definitions

---

## Quick Reference: All Critical Thresholds

### Timing
| Metric | Target |
|--------|--------|
| Button feedback | <50ms |
| All UI interactions | <100ms |
| Nudge auto-dismiss | 5 seconds |
| Between interruptions | 2+ minutes |
| Search debounce | 300ms |
| Page load | <3 seconds |
| Time to first value | 60-90 seconds |
| User decides to stay/leave | 3-5 minutes |

### Counts
| Element | Max |
|---------|-----|
| Primary nav (mobile) | 5 |
| Primary nav (desktop) | 7 |
| Tabs | 5 |
| Dropdown items | 7 |
| Form fields visible | 7 |
| Notifications visible | 2 |
| Dashboard visuals | 12 |

### Sizes
| Element | Min Size |
|---------|----------|
| Standard touch target | 44px |
| Primary button | 48px |
| Field mode button | 60px |
| Gloved button | 72px |
| Body text (mobile) | 16px |
| Body text (field mode) | 18px |
| Input font size (iOS) | 16px |

### Performance
| Asset | Budget |
|-------|--------|
| JS bundle | <200KB gzip |
| CSS bundle | <50KB |
| Images/page | <500KB |
| API response (p95) | <200ms |
| LCP | <2.5s |
| CLS | <0.1 |

---

## Customer Segment North Stars

| Segment | UX North Star |
|---------|---------------|
| CSA Members | Check box contents in <10 seconds |
| Farmers Market Shoppers | Know if farm is at market TODAY, instantly |
| Gardening Learners | Feel "I can do this" within 30 seconds |
| Flower Customers | Subscribe in <2 minutes |
| Wholesale Chefs | Reorder in <60 seconds |

---

*Compiled from 14+ research documents, February 2026*
*Sources: NN/g, Linear, Notion, IxDF, Deloitte, a16z, Stanford CASA, Apple HIG, Google MD3, Baymard Institute, MIT Media Lab, Laws of UX*
