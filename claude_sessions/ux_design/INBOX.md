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

### Full MCC UX Audit
- Apply the 5 Key UX Principles from shared_research:
  1. Speed is THE product - audit all loading states, transitions
  2. 3-5 nav items max - review tab count, consider consolidation
  3. Progressive disclosure - hide 80%, reveal on demand
  4. Characters should be ambient
  5. Opinionated beats flexible
- Apply competitor insights from your OUTBOX gap analysis
- Consolidate duplicate UI patterns across tabs
- Unify spacing, typography, color usage
- Improve mobile experience across ALL tabs (not just Quick Post)
- Accessibility audit: contrast ratios, focus states, screen reader support

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

*UX Design Claude - Make it beautiful, but don't break what works. Code Audit and Verifier will check everything.*
