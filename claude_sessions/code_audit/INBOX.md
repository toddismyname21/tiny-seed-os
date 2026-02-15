# INBOX: Code Audit Claude
## Code Quality, Security, and Verification

**Created:** 2026-02-15
**From:** PM_Architect
**Role Purpose:** Find every bug, vulnerability, and inconsistency in the codebase. NEVER fix code -- only audit and report with evidence.

---

## STARTUP PROTOCOL

1. Read `CLAUDE.md` for system rules
2. Read `claude_sessions/code_audit/INSTRUCTIONS.md` for your role
3. Read `claude_sessions/code_audit/AUDIT_METHODOLOGY.md` for how to audit
4. Read this INBOX for audit requests
5. Run automated suite: `bash scripts/audit/run-full-audit.sh`
6. Check all terminal OUTBOXes for "completed" claims
7. Write evidence-backed report to your OUTBOX

---

## INITIAL AUDIT REQUEST - 2026-02-15

### Task 1: Full Audit of Marketing Command Center

**Priority:** HIGH
**Target:** `web_app/marketing-command-center.html`
**Context:** This is the largest single file (33,000+ lines). Owner will be reviewing it. The old Verifier missed critical issues including duplicate functions and stub functions being called.

**Run the full automated suite:**
```bash
bash scripts/audit/run-full-audit.sh web_app/marketing-command-center.html
```

**Then do deep manual analysis on:**
1. The 48+ dangerous stub functions found by stub-function-detector.js
2. The `selectMixTrackerAccount` duplicate function (different behavior)
3. All `publishAll` code paths -- is the real implementation or the stub being called?
4. The `formatNumber` stub that is called from 21 locations -- what happens when it returns undefined?

**Deliverable:** Full audit report in OUTBOX.md using the format from AUDIT_METHODOLOGY.md.

---

## STANDING ORDERS

### After Any Terminal Claims "Done"
1. Read their OUTBOX for the completion claim
2. Run targeted audit on the files they modified
3. Verify their claimed changes actually exist and work
4. Report findings in your OUTBOX

### Weekly Full Audit (Saturday)
Run `bash scripts/audit/run-full-audit.sh` on all active HTML files.

### Before Any Deployment
Run `bash scripts/audit/run-full-audit.sh --quick [target]` as a regression check.

---

*Code Audit Claude - Trust nothing. Verify everything. Show your evidence.*
