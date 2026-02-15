# INBOX: Code Audit Claude
## GATEKEEPER ROLE - All Changes Must Pass Through You

**Updated:** 2026-02-15
**From:** PM_Architect
**Role:** You are the GATE. No change ships without your review.

---

## STARTUP PROTOCOL

1. Read `CLAUDE.md` for system rules
2. Read `claude_sessions/code_audit/INSTRUCTIONS.md` for your role
3. Read `claude_sessions/code_audit/AUDIT_METHODOLOGY.md` for methodology
4. Read this INBOX for review queue
5. Check all terminal OUTBOXes for new "completed" claims
6. Run targeted audits on claimed changes
7. Write evidence-backed verdict to your OUTBOX

---

## YOUR ROLE IN THE PIPELINE

```
Desktop/Backend/UX Claude makes changes
        ↓
They write to their OUTBOX what they did
        ↓
★ YOU review the changes (security, quality, correctness) ★
        ↓
Verifier Claude verifies functionality
        ↓
ONLY if both you AND Verifier say PASS → change is "done"
```

**You are the first gate. Be thorough. Be skeptical.**

---

## REVIEW QUEUE - 2026-02-15

### Review 1: Desktop Claude Security Fixes (WHEN THEY COMPLETE)

Desktop Claude is making these changes to `web_app/marketing-command-center.html`:

**Check their OUTBOX for completion, then verify:**

| Fix | What to Audit |
|-----|--------------|
| DOMPurify added | Verify CDN script tag exists in `<head>`. Verify `DOMPurify` is actually called on API data innerHTML assignments. |
| XSS fixes (8+ locations) | Grep for ALL remaining `.innerHTML =` that include API response variables. Flag any they missed. |
| 3 unhandled fetch calls | Verify try/catch or .catch() added to lines ~19043, ~19439, ~35597. Check error handling is user-facing (toast), not just console.log. |
| 6 missing functions | Verify ALL 6 functions now exist: `editEvergreen`, `import52WeekTemplate`, `loadSharedContentCalendar`, `open52WeekImportModal`, `openAddCalendarEntryModal`, `openSharedContentEntryModal`. Check they don't throw errors. |
| selectMixTrackerAccount | Verify there is now ONE definition. Check it still has both CSS class logic AND igSyncedPosts re-render. Verify no inline style overrides remain. |
| truncateText | Verify only ONE definition exists. |

**Run after their changes:**
```bash
# Check for remaining innerHTML with API data
grep -n '\.innerHTML.*data\.' web_app/marketing-command-center.html
grep -n '\.innerHTML.*result\.' web_app/marketing-command-center.html

# Check for duplicate functions
node scripts/audit/duplicate-function-detector.js web_app/marketing-command-center.html

# Check for orphaned DOM refs
bash scripts/audit/dom-orphan-checker.sh web_app/marketing-command-center.html
```

### Review 2: Backend Claude Token + Endpoint Changes

Backend Claude is adding to `apps_script/MERGED TOTAL.js`:
- `exchangeForPermanentPageTokens()`
- `checkTokenHealth()`
- `refreshAllIGAATokens()`
- Missing endpoints for CREATE sub-tabs
- CSRF token system

**Audit for:**
- Credentials not logged to console/Logger (token values should never appear in logs)
- Error handling on all API calls (UrlFetchApp.fetch)
- Proper use of CacheService for CSRF tokens
- No hardcoded secrets (everything from PropertiesService)
- Router correctly wires all new actions

### Review 3: UX Design CSS Changes

UX Claude is adding CSS polish to the CREATE sub-tabs.

**Audit for:**
- No CSS that accidentally hides functional elements
- No `display: none` or `visibility: hidden` on interactive elements
- No z-index conflicts that could overlay clickable areas
- No `pointer-events: none` on buttons
- Responsive breakpoints don't break layout

### Review 4: AI Content Studio, CSA Box Visual, Repurpose Deep Audit

After Desktop Claude claims these sub-tabs are functional, run targeted audit:

**For each sub-tab, check:**
1. All onclick handlers reference defined functions
2. All getElementById calls reference existing elements
3. All fetch calls have error handling
4. No innerHTML with unsanitized user/API input
5. API endpoints called actually exist in the backend router

---

## STANDING ORDERS (Always Active)

### After ANY Terminal Claims "Done":
1. Read their OUTBOX for completion claim
2. Identify the files they modified
3. Run targeted audit on those files
4. Cross-reference: does what they claim match what's actually in the code?
5. Report findings with PASS / FAIL / NEEDS_REMEDIATION verdict

### Audit Report Format:
```markdown
## CODE AUDIT REVIEW: [Terminal Name] - [Task]
**Date:** [Date]
**Files Reviewed:** [list]
**Verdict:** PASS / FAIL / NEEDS_REMEDIATION

### Findings
| # | Severity | Issue | Location | Evidence |
|---|----------|-------|----------|----------|
| 1 | CRITICAL | ... | line XXX | code snippet |

### Recommendation
[What needs to happen before this can ship]
```

---

## PREVIOUS AUDIT (Reference)

Your comprehensive MCC audit from earlier today found 38 issues (12 CRITICAL, 8 HIGH, 9 MEDIUM, 5 LOW, 4 INFO). That audit is in your OUTBOX.md. Use it as your baseline - verify the builders are addressing those findings.

---

*Code Audit Claude - Trust nothing. Verify everything. You are the gate.*
