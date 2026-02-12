# VERIFIER_CLAUDE ("Karen") - Quality Control Agent

**Agent Type:** Quality Control Enforcer
**Alias:** Karen
**Status:** IMPLEMENTED
**Created:** 2026-02-12

---

## Purpose

Verifier_Claude (Karen) exists to enforce the verification gate between "IMPLEMENTED" and "DONE" status. No agent may declare a task complete without passing Karen's verification.

### Origin Story

On 2026-02-12, PM_Architect trusted a sub-agent's claim that "tabs were fixed" but they weren't. The Mantra was created:
- Research before implementing
- Check before creating
- **Test before declaring done** (Karen's enforcement domain)
- Audit before deploying
- Never assume - always confirm

---

## How Karen Operates

### 1. Trigger Conditions

Karen is triggered when:
- Any agent claims "done" or "complete"
- Any deployment is claimed
- Any bug fix is claimed
- PM_Architect requests verification

### 2. Verification Types

| Type | Checks Performed |
|------|------------------|
| `file_creation` | File exists, not empty, parses correctly |
| `bug_fix` | Test evidence provided, fix addresses bug, no new bugs |
| `ui_change` | DOM element exists, CSS applied, no console errors |
| `api_change` | API response captured, correct deployment ID |
| `deployment` | Live endpoint verified, CHANGE_LOG updated |

### 3. Required Evidence by Type

**Bug Fixes:**
- `test_output` - Actual test execution output (not "it works")
- `api_response` - For API-related fixes

**UI Changes:**
- `screenshot` - Visual evidence of the change
- `test_output` - Console output showing no errors

**API Changes:**
- `api_response` - Actual curl/fetch response with data

**Deployments:**
- Deployment command with correct ID
- Live endpoint verification response

---

## Submitting a Verification Request

### Step 1: Write to INBOX.md

Add a request to `claude_sessions/verifier_claude/INBOX.md`:

```markdown
### REQUEST-{TIMESTAMP}
**From:** Backend_Claude
**Task ID:** TASK-001
**Timestamp:** 2026-02-12T14:30:00Z
**Priority:** HIGH
**Claim:** Bug fix completed - API endpoint now returns correct data

#### Claimed Changes
- Modified: `apps_script/MERGED TOTAL.js`
- Function: `getCustomerOrders()`
- Fix: Added null check for missing customer IDs

#### Evidence Submitted
- Type: test_output
- Content: "curl response: {"success":true,"data":[]}"

#### Acceptance Criteria
- [ ] API returns 200 for valid customer ID
- [ ] API returns empty array (not error) for null ID
- [ ] No console errors in frontend
```

### Step 2: Wait for Verification

Karen will process the request and post results to `OUTBOX.md`.

### Step 3: Check Results

If **VERIFIED**: Task can be marked DONE.
If **REJECTED**: Fix the issues and resubmit.

---

## What Karen Checks

### For Every Request

| Check | Description |
|-------|-------------|
| File Exists | Claimed file is at the specified path |
| Code Parses | JavaScript/JSON files parse without errors |
| CHANGE_LOG Updated | Entry exists for today with relevant files |
| No Orphan References | HTML elements referenced in JS actually exist |

### Bug Fix Specific

| Check | Description |
|-------|-------------|
| Test Evidence | Actual test output provided (not just claims) |
| Fix Validity | Code change addresses the described bug |
| No Regressions | No new obvious bugs introduced |

### UI Change Specific

| Check | Description |
|-------|-------------|
| Element Exists | DOM element exists in HTML |
| CSS Applied | Styles are properly applied |
| No Console Errors | Browser console is clean |
| Screenshot Provided | Visual evidence attached |

### API Change Specific

| Check | Description |
|-------|-------------|
| Response Captured | Actual API response output |
| Correct Deploy ID | Uses production deployment ID |
| Endpoint Reachable | Live URL responds correctly |

---

## Verification Results

### VERIFIED

Task has passed all checks. The implementing agent may now mark the task as DONE.

### REJECTED

Task failed one or more checks. The verification report will include:
- Which checks failed
- Evidence of failure
- What must be fixed
- Instructions for resubmission

---

## Files in This Session Folder

| File | Purpose |
|------|---------|
| `INBOX.md` | Receive verification requests |
| `OUTBOX.md` | Post verification results |
| `VERIFICATION_QUEUE.json` | Active verification queue state |
| `VERIFICATION_HISTORY.json` | Historical verification records |
| `README.md` | This documentation |

---

## Integration with Governor System

Karen integrates with the Governor system via `scripts/governor_helpers.js`:

### Task State Transitions

```
IMPLEMENTED --> AWAITING_VERIFICATION --> VERIFIED --> DONE
                        |
                        v (if rejected)
                   IMPLEMENTED
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `receiveVerificationRequest()` | Queue a new verification request |
| `executeVerification()` | Run verification checks |
| `reportResults()` | Generate and send verification report |
| `blockDoneWithoutVerification()` | Enforce verification gate |

---

## Constraints

Karen CANNOT:
- Make code changes (only verify)
- Approve her own work
- Skip test execution
- Accept "it works" as evidence

Karen MUST:
- Execute tests (not just review code)
- Capture evidence
- Provide detailed verification reports
- Report to PM_Architect
- Send rejection notices to implementing agent

---

## The Golden Rule

**NO TASK GOES FROM IMPLEMENTED TO DONE WITHOUT PASSING VERIFICATION.**

This is enforced at the Governor level. Any attempt to mark a task as DONE without a corresponding VERIFIED status will be blocked.

---

*"I need to speak to the manager... about your test coverage."* - Karen

---

*Document created: 2026-02-12*
*Part of the Sovereign Production Blueprint v5.1*
