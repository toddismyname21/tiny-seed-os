# INBOX: UX Design Claude
## MARCHING ORDERS - 2026-02-15

**From:** PM_Architect
**Priority:** HIGH

---

## MANDATORY PIPELINE - READ THIS FIRST

**NOTHING is "done" until it passes Code Audit + Verifier.**

### Your workflow:
1. Make CSS/visual changes
2. Write what you did to your OUTBOX.md with exact selectors and line numbers
3. Code Audit Claude will review for CSS conflicts, orphaned styles, accessibility
4. Verifier Claude will verify visual changes render correctly
5. If either flags issues → you fix → repeat
6. Only after BOTH say PASS is it done

---

## IMPORTANT: PHASED APPROACH (Owner Directive)

The owner has directed a specific order of operations:

### PHASE 1 (NOW): Functionality First
- Desktop Claude and Backend Claude are fixing security issues and making all 4 CREATE sub-tabs functional
- **DO NOT** move, reorganize, or restructure HTML/CSS yet
- **DO NOT** consolidate sections or refactor layout yet
- Focus ONLY on visual polish that doesn't change structure

### PHASE 2 (AFTER all tabs verified working): Full UX Audit + Beautification
- Once Code Audit + Verifier confirm all 4 CREATE sub-tabs are functional
- THEN do a comprehensive UX audit applying research principles
- Consolidate redundant UI patterns
- Unify design language across all tabs
- Apply competitor insights (Later, Buffer, Canva patterns)
- This is where the BIG visual transformation happens

**We save the big design pass for LAST so we don't break working features.**

---

## PHASE 1 TASKS (Do Now - Non-Breaking Visual Polish)

File: `web_app/marketing-command-center.html`

### Task 1: Polish AI Content Studio Tab (CSS Only)

The AI Content Studio sub-tab (line ~8167) needs visual consistency with Quick Post:
- Studio tab buttons (`studio-tab-btn`) need hover effects matching create-mode-btn
- The Generate tab results area needs card styling matching `.caption-option-card`
- Quick action buttons need hover lift effect (`transform: translateY(-2px)`)
- Add loading skeleton animation for AI generation wait states

**CSS additions only. Do NOT change HTML structure or JS logic.**

### Task 2: Polish CSA Box Visual Tab (CSS Only)

The CSA Box Visual sub-tab (line ~8594):
- Quick-add item buttons need better hover states
- Selected items should have a polished tag/pill appearance
- The canvas preview area needs a better empty state background
- Generate button hover should match Quick Post button animations

**CSS additions only.**

### Task 3: Polish Repurpose Tab (CSS Only)

The Repurpose sub-tab (line ~8808):
- Blog-to-Social and Social-to-Blog cards need consistent glass morphism
- Generated post results cards need styling matching caption-option-card
- Tab toggle (URL vs Content) needs smoother transition

**CSS additions only.**

### Task 4: Create Mode Toggle Animation

The 4 create-mode-btn buttons (line ~6985-6997) need:
- Smoother active state transition (currently instant background change)
- Add CSS transition for background, color, transform
- Subtle scale or lift on hover for inactive tabs
- Active tab should have slight elevation (box-shadow)

**CSS transition additions only.**

---

## PHASE 2 TASKS (Do AFTER all tabs pass Code Audit + Verifier)

These are documented here for planning but **DO NOT START until PM_Architect gives the green light.**

### THE NORTH STAR PRINCIPLE (Owner Directive - 2026-02-18)

**"If posting from the MCC is not EASIER than opening Instagram and hitting post, what is the point?"**

Every UX decision in Phase 2 must pass this test:
- **Friction-free** -- Every extra click, every confusing label, every unclear flow is a failure
- **No confusion** -- A farmer in a field with muddy hands should be able to post in under 60 seconds
- **Fun and easy** -- This should feel BETTER than native apps, not worse
- **The bar is Instagram/TikTok** -- If their native app does it in 2 taps, we cannot require 5

Specific implications:
- Default to the most common choices (pre-select platforms, pre-fill hashtags)
- One-tap posting should be possible for repeat content types
- Remove every modal/confirmation that isn't strictly necessary
- The happy path (write caption, add photo, post) should be 3 steps MAX
- Loading states must feel instant (<200ms perceived)
- Success should feel rewarding (celebration, not just a toast)
- Error recovery should be automatic where possible (retry, save draft)

### Full MCC UX Audit
- Apply the 5 Key UX Principles from shared_research:
  1. Speed is THE product - audit all loading states, transitions
  2. 3-5 nav items max - review tab count, consider consolidation
  3. Progressive disclosure - hide 80%, reveal on demand
  4. Characters should be ambient
  5. Opinionated beats flexible
- **Apply the North Star Principle** - audit every flow for friction, count the clicks
- Apply competitor insights from your OUTBOX gap analysis
- Consolidate duplicate UI patterns across tabs
- Unify spacing, typography, color usage
- Improve mobile experience across ALL tabs (not just Quick Post)
- Accessibility audit: contrast ratios, focus states, screen reader support
- **Click-count audit**: Document how many clicks each common action takes vs native apps

---

## OUTBOX REQUIREMENTS

When you finish Phase 1 tasks:
```markdown
## PHASE 1 VISUAL POLISH - [Date]

### CSS Changes Made
| Change | Selector/Line | What Changed |
|--------|--------------|-------------|
| Studio tab hover | .studio-tab-btn:hover | Added translateY(-2px) + box-shadow |
| ... | ... | ... |

### No HTML/JS Structure Changes (confirmed)
### Awaiting Code Audit + Verifier Review
```

---

---

## !! PHASE 2 GREEN LIGHT - 2026-02-18 !!

**From:** PM_Architect
**Status:** All 4 CREATE sub-tabs have passed Code Audit + Verifier. Desktop Claude completed 5 priorities of security + functional fixes. You are now cleared for Phase 2 UX work.

**A comprehensive external UX audit has been completed.** The findings below are YOUR assignments (visual/CSS work). Desktop Claude is handling the functional/HTML/JS fixes separately.

---

## PHASE 2 PRIORITY TASKS (From External UX Audit)

**THE NORTH STAR:** "If posting from the MCC is not EASIER than opening Instagram and hitting post, what is the point?"

**File:** `web_app/marketing-command-center.html`

---

### Task P2-1: SUB-TAB VISUAL HIERARCHY (P2 - MODERATE)

**Problem:** The 4 inner tabs within AI Content Studio (Generate, Templates, Photo Analysis, A/B Testing) are not visually differentiated enough from the main CREATE sub-tabs above. Users get confused about which "tab level" they're on.

**Fix:**
1. The main 4 CREATE sub-tabs (Quick Post | AI Studio | CSA Box Visual | Repurpose) should use the current `create-mode-btn` styling
2. The inner sub-tabs (within AI Studio) should use a CLEARLY different visual treatment:
   - Smaller font size
   - Slightly indented or contained within a pill/segment control
   - Different background treatment (e.g., subtle underline tabs vs filled buttons)
3. This is a CSS-only fix — change `.studio-tab-btn` styling to differentiate from `.create-mode-btn`

---

### Task P2-2: FLOATING ACTION BAR POLISH (P1 - CRITICAL)

**Context:** Desktop Claude is adding a sticky floating action bar for POST NOW / SCHEDULE. Your job is to make it beautiful.

**Fix (CSS companion to Desktop Claude's 6A):**
1. The floating bar needs glass morphism treatment: `backdrop-filter: blur(12px)`, semi-transparent background
2. Subtle top shadow/border for depth separation from content
3. POST NOW button should be the MOST prominent element on the entire page — vivid gradient, larger than SCHEDULE
4. SCHEDULE button should be secondary (outlined or muted)
5. Smooth entrance animation: bar should fade/slide in when user scrolls past the original button position

---

### Task P2-3: CSA BOX VISUAL EMPTY STATE DESIGN (P1 - CRITICAL)

**Context:** Desktop Claude is adding empty state messaging and item removal. Your job is the visual design.

**Fix:**
1. Empty state should have a centered illustration or icon (farm box / basket SVG)
2. Instructional text should be warm and inviting, not clinical: "Fill your box, see it come to life"
3. Item pills (once added) should have a polished tag appearance: rounded, colored by category (green for veggies, purple for flowers, tan for bread, etc.)
4. Remove "×" button should be subtle until hover
5. The preview transition from empty → populated should animate smoothly

---

### Task P2-4: BUTTON CONSISTENCY AUDIT (P2 - MODERATE)

**Problem:** Buttons across the CREATE tab use inconsistent styles — some have gradients, some are flat, some are outlined. The CSA "Generate Box Visual" button has a green-to-orange gradient that doesn't match the rest of the app.

**Fix:**
1. Audit ALL buttons in the CREATE tab
2. Define a consistent button hierarchy:
   - **Primary action** (POST NOW, Generate): Vivid gradient (keep the existing green or use brand accent)
   - **Secondary action** (SCHEDULE, Save Draft): Outlined or muted fill
   - **Tertiary** (Quick add, toggles): Ghost/text buttons
3. Apply consistently across all 4 sub-tabs
4. CSA "Generate Box Visual" should match the primary action style

---

### Task P2-5: TONE/VOICE SELECTOR VISIBILITY (P3 - MINOR)

**Problem:** The "Authentic" tone dropdown in Quick Post is collapsed by default and easy to miss. Many users may never discover they can change their post tone.

**Fix:**
1. Make the tone selector more visually prominent — use a pill/chip style instead of hidden dropdown
2. Show the current tone as a visible badge: `Tone: Authentic ▾`
3. On hover/click, expand to show options
4. Consider pre-selected options as horizontal pills: Authentic | Casual | Professional | Energetic

---

### Task P2-6: SAVE DRAFT BUTTON PROMINENCE (P3 - MINOR)

**Problem:** "Save Draft" is small, grey, lower-left. Users who frequently draft posts will miss it.

**Fix:**
1. Move "Save Draft" closer to the floating action bar (if Desktop Claude adds one)
2. Give it secondary button treatment: outlined, adequate size
3. Add `Cmd+S` hint text (Desktop Claude is adding the keyboard shortcut)

---

### Task P2-7: CONSISTENT ICON LANGUAGE (P3 - MINOR)

**Problem:** The CREATE tab uses emojis, SVG icons, Font Awesome icons, and text badges interchangeably. This feels inconsistent.

**Fix:**
1. Choose ONE icon system (Font Awesome is already loaded)
2. Replace emoji usage in buttons/tabs with consistent Font Awesome icons
3. Emojis are OK in content/copy but NOT in UI elements (buttons, tab labels, badges)
4. Exception: Quick-add chips for CSA items can keep emoji for warmth

---

### Task P2-8: MOBILE RESPONSIVENESS PASS (P2 - MODERATE)

**Problem:** Several elements are cut off or require horizontal scrolling on narrow viewports (especially the IG sub-type selectors: Feed | Story | Reel).

**Fix:**
1. At 768px and 480px breakpoints:
   - IG sub-type selector should stack or wrap gracefully
   - Character counter should wrap to multiple lines if needed
   - All buttons must be tap-target sized (44px minimum)
   - Intelligence Panel floating button should not obscure content
2. Test all 4 CREATE sub-tabs at both breakpoints
3. The floating action bar (from P2-2) must work on tablet (769px-1024px)

---

### Task P2-9: NEW USER ONBOARDING CARD (P2 - MODERATE)

**Problem:** The Create tab has 30+ interactive elements with no onboarding. A first-time user is overwhelmed.

**Fix (CSS + minimal HTML):**
1. Add a collapsible "Getting Started" card at the TOP of the Quick Post tab
2. Card contains 3 steps: "1. Write your caption → 2. Add a photo → 3. Hit Post Now"
3. Card should be warm, inviting, with farm-appropriate imagery
4. "Don't show again" checkbox saves to localStorage
5. Card should use glass morphism and fit the existing design language
6. **NOTE:** Desktop Claude may need to add the HTML for this — coordinate via your OUTBOX. Describe the exact HTML structure you need.

---

### Task P2-10: INTELLIGENCE PANEL OVERLAP FIX (P2 - MODERATE)

**Problem:** The floating Intelligence Panel button (lightbulb) overlaps content and can obscure right-edge elements like character counts and action buttons.

**Fix:**
1. When the panel is CLOSED, the button should be smaller and semi-transparent until hover
2. Ensure it doesn't overlap the character counter or any action buttons
3. On mobile, consider moving it to the top of the screen or making it part of the tab bar
4. When open, the panel should slide in from the right with a smooth animation, not just appear

---

## STRENGTHS TO PRESERVE (DO NOT CHANGE THESE)

The external audit identified these as competitive advantages. Do NOT simplify, hide, or remove:
- Voice note recording for hands-free use
- Real-time multi-platform character counters
- Contextual AI awareness banner (weather/season/market day)
- 5-3-2 content type tracker
- "Move #tags from caption" automation
- Grid Preview in Power Tools
- A/B caption testing

---

## OUTBOX REQUIREMENTS FOR PHASE 2

When you finish, write to your OUTBOX:
```markdown
## PHASE 2 COMPLETE: External UX Audit Visual Fixes - [Date]

### CSS Changes Made
| Task | Selector/Line | What Changed |
|------|--------------|-------------|
| P2-1: Sub-tab hierarchy | .studio-tab-btn | Differentiated from main tabs |
| P2-2: Floating bar polish | .publish-actions | Glass morphism, animation |
| ... | ... | ... |

### HTML Structure Requests (for Desktop Claude)
[List any HTML changes you need Desktop Claude to make]

### No Functional/JS Changes (confirmed)
### Awaiting Code Audit + Verifier Review
```

---

*UX Design Claude - Make it beautiful, but don't break what works. Code Audit and Verifier will check everything.*
