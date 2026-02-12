# Verification Protocol

**Version:** 1.0
**Effective Date:** 2026-02-12
**Status:** MANDATORY FOR ALL AGENT OPERATIONS

---

## Executive Summary

### Why This Protocol Exists

On February 11, 2026, the Marketing Command Center (MCC) tabs incident exposed a critical gap in our agent verification process. An agent reported task completion with confidence, but the implementation contained fundamental flaws:

- **Missing tab functionality** - Tabs that were claimed to be "working" had no click handlers
- **Broken navigation** - Users could not switch between sections
- **No actual testing** - Agent assertions were based on code review, not execution
- **False completion signals** - Task was marked COMPLETE without user verification

**The Result:** User frustration, wasted debugging time, and erosion of trust in agent capabilities.

**The Lesson:** "I implemented it" is not the same as "It works." Agent claims without evidence are worthless.

### Core Principle

> **No task reaches COMPLETE status without passing through the verification gate AND receiving explicit user confirmation.**

This protocol ensures that every claimed completion is backed by:
1. Verifiable artifacts
2. Passing tests
3. Documented evidence
4. User confirmation

---

## The Verification Flow

```
                    Agent Claims Complete
                            |
                            v
                  +-------------------+
                  | VERIFICATION GATE |
                  +-------------------+
                            |
            +---------------+---------------+
            |               |               |
            v               v               v
    +--------------+ +--------------+ +--------------+
    | Artifact     | | Tests        | | Evidence     |
    | exists?      | | pass?        | | provided?    |
    +--------------+ +--------------+ +--------------+
            |               |               |
            v               v               v
         NO -> REJECT    NO -> REJECT    NO -> REJECT
            |               |               |
            v               v               v
          YES             YES             YES
            |               |               |
            +---------------+---------------+
                            |
                            v
                        ALL YES
                            |
                            v
                  +-------------------+
                  | USER VERIFICATION |
                  +-------------------+
                            |
                            v
               User says "Verified working"
                            |
                            v
                      +-----------+
                      | COMPLETE  |
                      +-----------+
```

### Gate Requirements

| Check | Description | Failure Action |
|-------|-------------|----------------|
| Artifact exists | The file/feature/component physically exists and is accessible | Return to IN_PROGRESS |
| Tests pass | Automated tests execute successfully | Return to IN_PROGRESS |
| Evidence provided | Screenshot, test output, or verifiable proof attached | Return to IN_PROGRESS |

---

## Task States

### State Definitions

| State | Description | Who Sets It | Exit Criteria |
|-------|-------------|-------------|---------------|
| `PENDING` | Task identified but not started | System/User | Agent picks up task |
| `IN_PROGRESS` | Agent actively working on task | Agent | Implementation complete |
| `IMPLEMENTED` | Code written, awaiting verification | Agent | Passes verification gate |
| `AWAITING_VERIFICATION` | At verification gate | System | All gate checks pass |
| `VERIFIED` | Gate passed, needs user confirmation | System | User confirms |
| `AWAITING_USER_VERIFICATION` | Explicitly waiting for user to test | Agent/System | User responds |
| `COMPLETE` | Task fully done and confirmed | User only | N/A (terminal state) |

### State Diagram

```
PENDING
    |
    v
IN_PROGRESS <---------+
    |                 |
    v                 |
IMPLEMENTED           |
    |                 |
    v                 |
AWAITING_VERIFICATION |
    |                 |
    +--[FAIL]---------+
    |
    v [PASS]
VERIFIED
    |
    v
AWAITING_USER_VERIFICATION
    |
    +--[NOT CONFIRMED]---> remains AWAITING_USER_VERIFICATION
    |
    v [CONFIRMED]
COMPLETE
```

---

## Valid State Transitions

### Allowed Transitions

| From | To | Condition |
|------|----|-----------|
| PENDING | IN_PROGRESS | Agent begins work |
| IN_PROGRESS | IMPLEMENTED | Agent completes code changes |
| IMPLEMENTED | AWAITING_VERIFICATION | Agent submits for verification |
| AWAITING_VERIFICATION | VERIFIED | All gate checks pass |
| AWAITING_VERIFICATION | IN_PROGRESS | Gate check fails (loop back) |
| VERIFIED | AWAITING_USER_VERIFICATION | System requests user confirmation |
| AWAITING_USER_VERIFICATION | COMPLETE | User explicitly confirms |
| AWAITING_USER_VERIFICATION | IN_PROGRESS | User reports issues |

### PROHIBITED Transitions

The following shortcuts are **NEVER ALLOWED**:

| From | To | Why Prohibited |
|------|----|----------------|
| IMPLEMENTED | COMPLETE | Skips verification gate entirely |
| IN_PROGRESS | COMPLETE | Skips both gate and user verification |
| AWAITING_VERIFICATION | COMPLETE | Skips user verification |
| VERIFIED | COMPLETE | User must explicitly confirm |
| ANY STATE | COMPLETE | Only user can set COMPLETE status |

**Critical Rule:** The COMPLETE state can ONLY be reached through AWAITING_USER_VERIFICATION, and ONLY when a user provides explicit confirmation.

---

## Evidence Standards

### What IS Acceptable Evidence

Evidence must be **concrete, reproducible, and verifiable**.

#### Tier 1: Best Evidence (Automated)
```bash
# Actual test output
$ npm test -- --grep "tab navigation"
PASS src/components/Tabs.test.tsx
  Tab Navigation
    ✓ switches to Overview tab on click (45ms)
    ✓ switches to Analytics tab on click (32ms)
    ✓ maintains active state after switch (28ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

#### Tier 2: Strong Evidence (Visual)
- Screenshots showing the feature working
- Screen recordings of user flow
- Browser DevTools console showing no errors
- Network tab showing successful API calls

#### Tier 3: Acceptable Evidence (Manual)
- Step-by-step reproduction instructions with outcomes
- Specific element selectors that can be verified
- Hash/checksum of generated files

### What is NOT Acceptable Evidence

| Bad Evidence | Why It's Bad |
|--------------|--------------|
| "It works" | Unverifiable assertion |
| "I tested it" | No proof provided |
| "The code looks correct" | Code review != execution |
| "Should work now" | Speculation, not verification |
| "Fixed the issue" | What issue? How? Proof? |
| "Deployed successfully" | Deployment != functionality |
| "No errors in console" | Without screenshot, unverifiable |
| "I clicked through it" | No documentation of what was clicked |

### Evidence Template

When submitting for verification, agents MUST provide:

```markdown
## Verification Evidence

### Artifact Location
- File: `/path/to/component.tsx`
- Feature: [Description of what was built]

### Test Results
```
[Paste actual test output here]
```

### Manual Verification Steps
1. Navigate to [URL]
2. Click [element]
3. Expected: [behavior]
4. Actual: [what happened - must match expected]

### Screenshots/Recordings
[Attach visual evidence]

### Verification Command
```bash
[Command anyone can run to verify]
```
```

---

## Verification Scripts

### verify-completion.sh

Primary verification script for agent task completion.

#### Location
```
scripts/verify-completion.sh
```

#### Usage
```bash
# Basic usage - verify a specific task
./scripts/verify-completion.sh --task-id TASK-123

# Verify with verbose output
./scripts/verify-completion.sh --task-id TASK-123 --verbose

# Verify all pending completions
./scripts/verify-completion.sh --all-pending

# Dry run (show what would be verified)
./scripts/verify-completion.sh --task-id TASK-123 --dry-run
```

#### Exit Codes
| Code | Meaning |
|------|---------|
| 0 | All verifications passed |
| 1 | One or more verifications failed |
| 2 | Artifact not found |
| 3 | Tests failed |
| 4 | Evidence missing |
| 5 | Invalid task ID |

#### Example Output
```
$ ./scripts/verify-completion.sh --task-id MCC-TABS-001

=== VERIFICATION GATE: MCC-TABS-001 ===

[1/3] Artifact Check
  Looking for: src/components/marketing/Tabs.tsx
  Status: FOUND
  Last modified: 2026-02-12 10:45:23

[2/3] Test Execution
  Running: npm test -- --grep "Tabs"
  Status: PASSED (3/3 tests)

[3/3] Evidence Review
  Screenshot: evidence/MCC-TABS-001-screenshot.png
  Status: FOUND

=== GATE RESULT: PASSED ===

Task MCC-TABS-001 moved to VERIFIED state.
Awaiting user confirmation to mark COMPLETE.
```

### validate-element-refs.sh

Validates that UI elements referenced in code actually exist.

#### Location
```
scripts/validate-element-refs.sh
```

#### Usage
```bash
# Validate all element references in a component
./scripts/validate-element-refs.sh src/components/marketing/

# Validate specific file
./scripts/validate-element-refs.sh src/components/Tabs.tsx

# Output format options
./scripts/validate-element-refs.sh --format json src/components/
./scripts/validate-element-refs.sh --format table src/components/
```

#### What It Checks
- DOM selectors match existing elements
- Event handlers are properly bound
- Referenced IDs exist in the DOM
- CSS classes have corresponding styles
- Data attributes are consistently used

#### Example Output
```
$ ./scripts/validate-element-refs.sh src/components/marketing/Tabs.tsx

Element Reference Validation
============================

File: src/components/marketing/Tabs.tsx

| Line | Reference | Type | Status |
|------|-----------|------|--------|
| 23   | #tab-overview | ID | VALID |
| 24   | #tab-analytics | ID | VALID |
| 45   | .tab-active | Class | VALID |
| 67   | onClick={handleTabClick} | Handler | BOUND |

Summary: 4 references checked, 0 issues found
```

### Governor Helpers

The Governor system provides automation helpers for verification.

#### Available Helpers

```bash
# Check if task is ready for verification
governor verify:ready TASK-123

# Submit task to verification gate
governor verify:submit TASK-123 --evidence ./evidence/

# Check verification status
governor verify:status TASK-123

# List all tasks awaiting verification
governor verify:pending

# Force re-verification (after fixes)
governor verify:retry TASK-123
```

#### Governor Integration Example

```bash
# Complete workflow
governor task start MCC-TABS-001
# ... agent does work ...
governor task implement MCC-TABS-001
governor verify:submit MCC-TABS-001 --evidence ./evidence/mcc-tabs/
# System runs verification gate
governor verify:status MCC-TABS-001
# Output: VERIFIED - Awaiting user confirmation
```

---

## CI/CD Integration

### GitHub Actions Smoke Tests

Every PR triggers automated verification.

#### Workflow Configuration
```yaml
# .github/workflows/verification.yml
name: Verification Gate

on:
  pull_request:
    branches: [main, develop]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Dependencies
        run: npm ci

      - name: Run Unit Tests
        run: npm test -- --coverage

      - name: Run Integration Tests
        run: npm run test:integration

      - name: Validate Element References
        run: ./scripts/validate-element-refs.sh src/

      - name: Smoke Test UI
        run: |
          npm run build
          npm run test:smoke

      - name: Upload Evidence
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: verification-evidence
          path: |
            coverage/
            test-results/
            screenshots/
```

#### Required Checks

The following checks must pass before merge:

| Check | Threshold | Blocking |
|-------|-----------|----------|
| Unit Tests | 100% pass | Yes |
| Integration Tests | 100% pass | Yes |
| Element Validation | 0 errors | Yes |
| Smoke Tests | 100% pass | Yes |
| Coverage | >80% | No (warning) |

### Pre-commit Hooks

Local verification before code leaves developer machine.

#### Configuration
```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: verify-completion
        name: Verification Gate Check
        entry: ./scripts/pre-commit-verify.sh
        language: script
        pass_filenames: false
        stages: [commit]

      - id: element-refs
        name: Validate Element References
        entry: ./scripts/validate-element-refs.sh
        language: script
        types: [javascript, typescript, tsx]
        stages: [commit]

      - id: no-console
        name: No console.log in production
        entry: './scripts/check-console.sh'
        language: script
        types: [javascript, typescript]
        stages: [commit]
```

#### Pre-commit Script
```bash
#!/bin/bash
# scripts/pre-commit-verify.sh

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

# Run relevant tests only for changed files
for file in $STAGED_FILES; do
  if [[ $file == src/components/* ]]; then
    # Validate element references
    ./scripts/validate-element-refs.sh "$file" || exit 1
  fi
done

# Run fast unit tests
npm test -- --changedSince=HEAD~1 --passWithNoTests || exit 1

echo "Pre-commit verification passed"
exit 0
```

---

## Escalation Protocol

When verification fails, follow this escalation ladder:

### Level 1: First Failure - Return to Agent

**Trigger:** Verification gate fails on first attempt

**Action:**
1. Task state returns to IN_PROGRESS
2. Failure reason documented in task notes
3. Agent receives specific failure details
4. Agent has 1 opportunity to fix and resubmit

**Notification:**
```
VERIFICATION FAILED - Attempt 1/3

Task: MCC-TABS-001
Reason: Tests failed - tab click handler not responding
Evidence: See test output below

[Test output...]

Action Required: Fix the issue and resubmit for verification.
Remaining attempts: 2
```

### Level 2: Second Failure - Flag for Human Review

**Trigger:** Verification gate fails on second attempt

**Action:**
1. Task flagged with `NEEDS_HUMAN_REVIEW` label
2. Human reviewer notified via preferred channel
3. Agent receives warning about final attempt
4. Detailed failure history compiled

**Notification to Human:**
```
HUMAN REVIEW REQUESTED

Task: MCC-TABS-001
Agent: claude-agent-01
Failure Count: 2

Failure History:
- Attempt 1: Tests failed - tab click handler not responding
- Attempt 2: Tests failed - wrong element selector used

Agent has 1 remaining attempt before pause.
Please review task requirements and agent approach.
```

### Level 3: Third Failure - Pause Agent

**Trigger:** Verification gate fails on third attempt

**Action:**
1. Agent paused from this task type
2. Task escalated to human for manual completion
3. Incident logged for pattern analysis
4. Agent capability review scheduled

**Notification:**
```
AGENT PAUSED - VERIFICATION FAILURE LIMIT

Task: MCC-TABS-001
Agent: claude-agent-01
Status: PAUSED

This agent has been paused from UI component tasks after 3
consecutive verification failures.

Next Steps:
1. Human to complete task manually
2. Agent capability review in 24 hours
3. Pattern analysis to prevent recurrence

Resume agent with: governor agent resume claude-agent-01 --task-type ui
```

### Escalation Summary Table

| Attempt | Result | Next State | Action |
|---------|--------|------------|--------|
| 1 | FAIL | IN_PROGRESS | Agent fixes and retries |
| 2 | FAIL | IN_PROGRESS + FLAG | Human notified, agent warned |
| 3 | FAIL | PAUSED | Agent paused, human takes over |
| Any | PASS | VERIFIED | Proceed to user verification |

---

## User Verification Phrases

### Approved Confirmation Phrases

The following phrases, when stated by the user, will transition a task from AWAITING_USER_VERIFICATION to COMPLETE:

| Phrase | Confidence | Notes |
|--------|------------|-------|
| "Verified working" | High | Explicit confirmation |
| "I verified this works" | High | First-person confirmation |
| "I confirmed this works" | High | Explicit testing implied |
| "Tested and working" | High | Clear testing indication |
| "This is working correctly" | High | Specific functionality confirmed |
| "Confirmed functional" | High | Clear positive confirmation |
| "I've tested it, works great" | High | Personal verification stated |
| "Manually verified, all good" | High | Explicit manual testing |
| "LGTM after testing" | Medium | Requires context |
| "Approved after verification" | Medium | Clear approval |

### NOT Approved Phrases

The following phrases do NOT constitute verification and the task remains in AWAITING_USER_VERIFICATION:

| Phrase | Why Not Accepted | Required Follow-up |
|--------|------------------|-------------------|
| "Deployed" | Deployment != working | "Please verify it works after deployment" |
| "Should work" | Speculation, not verification | "Please test and confirm it works" |
| "Looks good" | Visual only, not functional | "Please click through and verify functionality" |
| "Merged" | Code merge != working | "Please verify in staging/production" |
| "LGTM" (without testing context) | May be code review only | "Did you test the functionality?" |
| "Thanks" | Acknowledgment, not verification | "Please confirm the feature is working" |
| "OK" / "Cool" / "Great" | Ambiguous response | "Is that confirmation it's working?" |
| "I'll test it later" | Deferred verification | Task remains AWAITING_USER_VERIFICATION |
| *No response* | No confirmation given | Periodic reminder sent |
| "Probably fine" | Uncertainty expressed | "Please verify to confirm" |

### User Response Handling

```
IF user_response IN approved_phrases:
    task.state = COMPLETE
    log("User verified: {user_response}")

ELIF user_response IN not_approved_phrases:
    task.state = AWAITING_USER_VERIFICATION  # No change
    send_clarification("Please verify the feature works as expected")

ELIF user_response indicates issue:
    task.state = IN_PROGRESS
    log("User found issue: {user_response}")
    notify_agent("User reported: {user_response}")

ELSE:
    # Ambiguous response
    ask_clarification("Could you confirm if this is working correctly?")
```

### Verification Request Template

When requesting user verification:

```markdown
## Verification Request

Task: [TASK-ID] - [Task Description]

### What Was Implemented
[Brief description of changes]

### How to Verify
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior
[What user should see/experience]

### Verification Evidence
[Screenshots/test output already collected]

---

Please respond with one of:
- "Verified working" - if the feature works correctly
- Description of any issues - if something is wrong
```

---

## Appendix A: Quick Reference Card

```
+--------------------------------------------------+
|           VERIFICATION QUICK REFERENCE            |
+--------------------------------------------------+

STATES:
  PENDING -> IN_PROGRESS -> IMPLEMENTED ->
  AWAITING_VERIFICATION -> VERIFIED ->
  AWAITING_USER_VERIFICATION -> COMPLETE

GATE CHECKS:
  [ ] Artifact exists
  [ ] Tests pass
  [ ] Evidence provided

SCRIPTS:
  ./scripts/verify-completion.sh --task-id TASK-123
  ./scripts/validate-element-refs.sh src/
  governor verify:submit TASK-123

ESCALATION:
  1st fail -> Agent retries
  2nd fail -> Human notified
  3rd fail -> Agent paused

USER CONFIRMS WITH:
  "Verified working" / "I confirmed this works"

USER DOES NOT CONFIRM WITH:
  "Deployed" / "Should work" / "LGTM" / silence

+--------------------------------------------------+
```

---

## Appendix B: Incident Log Template

When verification failures occur, document using this template:

```markdown
## Verification Incident Report

**Incident ID:** VIR-YYYY-MM-DD-XXX
**Task ID:** [TASK-ID]
**Agent:** [Agent identifier]
**Date:** [Date of incident]

### Summary
[One-line description of what went wrong]

### Failure Details
- Attempt 1: [What failed and why]
- Attempt 2: [What failed and why]
- Attempt 3: [What failed and why]

### Root Cause
[Why did the agent fail to implement correctly?]

### Resolution
[How was the issue ultimately fixed?]

### Prevention Measures
[What changes will prevent this in the future?]

### Lessons Learned
[Key takeaways for agent improvement]
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-12 | System | Initial protocol established after MCC tabs incident |

---

*This protocol is mandatory. Violations will be logged and may result in agent capability restrictions.*
