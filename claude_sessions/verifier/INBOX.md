# INBOX: Verifier Claude
## GATEKEEPER ROLE - All Changes Must Pass Through You

**Updated:** 2026-02-15
**From:** PM_Architect
**Role:** You verify that changes ACTUALLY WORK. No change ships without your verification.

---

## STARTUP PROTOCOL

1. Read `CLAUDE.md` for system rules
2. Read this INBOX for verification requests
3. Check all terminal OUTBOXes for new "completed" claims
4. Check Code Audit Claude's OUTBOX for review results
5. Verify each change with evidence
6. Write verdict to your OUTBOX

---

## YOUR ROLE IN THE PIPELINE

```
Desktop/Backend/UX Claude makes changes
        ↓
They write to their OUTBOX what they did
        ↓
Code Audit Claude reviews code quality
        ↓
★ YOU verify the changes actually FUNCTION ★
        ↓
ONLY if both Code Audit AND you say PASS → change is "done"
```

**You are the second gate. Code Audit checks code quality. YOU check that it works.**

---

## VERIFICATION RULES (IRON CLAD)

1. **NEVER modify code** - Only read and report
2. **Document evidence** - Line numbers, code snippets, grep output
3. **Use STATUS_ABSTAIN** - If you cannot verify without runtime, say so
4. **Report ALL issues** - Even small ones
5. **Check for orphans** - HTML elements without JS handlers, JS calls to missing elements
6. **Cross-reference** - Does what they claim match what's in the code?
7. **Check Code Audit first** - Read Code Audit's verdict before doing your verification. If they said FAIL, focus your verification on the same areas.

---

## VERIFICATION QUEUE - 2026-02-15

### Verify 1: Desktop Claude Security Fixes

**When Desktop Claude writes "PRIORITY 1 COMPLETE" to their OUTBOX, verify:**

| Fix | How to Verify |
|-----|--------------|
| DOMPurify CDN | `grep -n 'dompurify\|DOMPurify' web_app/marketing-command-center.html` - should find script tag in head AND `DOMPurify.sanitize()` calls |
| XSS fixes | For each of the 8+ flagged lines, verify the innerHTML assignment now uses either `textContent` or `DOMPurify.sanitize()` |
| Unhandled fetch | Verify try/catch exists around lines ~19043, ~19439, ~35597. Check catch block shows toast. |
| 6 missing functions | Search for each: `grep -n 'function editEvergreen\|function import52WeekTemplate\|function loadSharedContentCalendar\|function open52WeekImportModal\|function openAddCalendarEntryModal\|function openSharedContentEntryModal'` - ALL 6 must return results |
| selectMixTrackerAccount | `grep -c 'function selectMixTrackerAccount\|selectMixTrackerAccount = function' marketing-command-center.html` - should return 1 (not 2) |
| truncateText | `grep -c 'function truncateText' marketing-command-center.html` - should return 1 (not 2) |

### Verify 2: Desktop Claude Sub-Tab Deep Dive

**When Desktop Claude writes "PRIORITY 2/3/4 COMPLETE" to their OUTBOX, verify each sub-tab:**

#### AI Content Studio (id="aiStudioMode")
| Check | How to Verify |
|-------|--------------|
| switchStudioTab() exists | `grep -n 'function switchStudioTab'` |
| All 4 studio tabs have content | `grep -n 'id="studioGenerateTab"\|id="studioTemplatesTab"\|id="studioPhotoTab"\|id="studioABTab"'` |
| Generate button has handler | `grep -n 'generateStudioContent\|studioQuickAction'` |
| Results display exists | Check for results container div |
| No orphaned handlers | All onclick functions in this section are defined |

#### CSA Box Visual (id="csaVisualizerMode")
| Check | How to Verify |
|-------|--------------|
| generateCSABoxVisual() exists and is not a stub | Read the function body - should use fabric.js Canvas |
| addCSAItem() exists | `grep -n 'function addCSAItem'` |
| quickAddCSAItem() exists | `grep -n 'function quickAddCSAItem'` |
| downloadCSAVisual() exists | `grep -n 'function downloadCSAVisual'` |
| Canvas element exists in HTML | `grep -n 'id="csaCanvas"\|id="csaPreviewCanvas"'` |

#### Repurpose (id="repurposeMode")
| Check | How to Verify |
|-------|--------------|
| generateBlogToSocial() exists and is not a stub | Read function body - should call API |
| generateSocialToBlog() exists | `grep -n 'function generateSocialToBlog'` |
| toggleRepurposeInput() exists | `grep -n 'function toggleRepurposeInput'` |
| loadHighPerformers() exists | `grep -n 'function loadHighPerformers'` |
| Results containers exist | Check for `blogToSocialResults` and `socialToBlogResults` divs |

### Verify 3: Backend Claude Endpoints

**When Backend Claude writes completion to their OUTBOX, verify:**

| Endpoint | Verify How |
|----------|-----------|
| exchangeForPermanentPageTokens | Function exists in MERGED TOTAL.js AND is wired in router |
| checkTokenHealth | Function exists AND wired in router |
| refreshAllIGAATokens | Function exists AND wired in router |
| CREATE sub-tab endpoints | All endpoints Desktop Claude calls are routed |

### Verify 4: UX Design CSS Changes

**When UX Claude writes completion to their OUTBOX, verify:**
- No functional elements hidden by CSS
- Hover states exist on claimed elements
- Glass morphism applied consistently
- Mobile responsive at 768px and 480px breakpoints
- No CSS syntax errors (unclosed brackets, missing semicolons)

---

## VERIFICATION REPORT FORMAT

```markdown
## VERIFICATION: [Terminal] - [Task]
**Date:** [Date]
**Verified By:** Verifier_Claude
**Code Audit Verdict:** [PASS/FAIL from Code Audit]

### Results
| Item | Status | Evidence |
|------|--------|----------|
| [Item] | PASS / FAIL / STATUS_ABSTAIN | [grep output, line numbers] |

### Issues Found
[numbered list]

### Verdict: PASS / FAIL / NEEDS_REMEDIATION
[If FAIL: what specifically must be fixed before this passes]
```

---

## SCORECARD (Running Tally)

Track the overall MCC CREATE tab readiness:

| Section | Previous Score | Current Score | Gate Status |
|---------|---------------|---------------|-------------|
| A. Core Functionality | 10/10 | Pending re-verify | |
| B. Schedule Flow | 7/7 | Pending re-verify | |
| C. Visual/UX | 7/7 | Pending re-verify | |
| D. Tagging | 5/5 | Pending re-verify | |
| E. Security Fixes | 0/? | Awaiting Desktop | |
| F. AI Content Studio | Not verified | Awaiting Desktop | |
| G. CSA Box Visual | Not verified | Awaiting Desktop | |
| H. Repurpose | Not verified | Awaiting Desktop | |
| I. No Regressions | 2/4 | Awaiting fixes | |

**Target: ALL sections PASS before declaring CREATE tab complete.**

---

*Verifier Claude - Trust but verify. Every claim needs evidence. You are the gate.*
