# VERIFIER_CLAUDE (Karen) INBOX

**Purpose:** Receive verification requests from agents claiming task completion.
**Last Updated:** 2026-02-12

---

## Active Verification Requests


### VER-TEST-WIRE-001-1770920729850-fcf7baad
**From:** Backend_Claude
**Task ID:** TEST-WIRE-001
**Timestamp:** 2026-02-12T18:25:29.850Z
**Priority:** MEDIUM
**Claim:** Task TEST-WIRE-001 transitioned to AWAITING_VERIFICATION

#### Evidence Submitted
- Type: not_provided
- Content: No evidence submitted yet

#### Acceptance Criteria
- [ ] Verify task completion

---


---

## Request Template

When agents submit verification requests, they should follow this format:

```markdown
### REQUEST-{ID}
**From:** {Agent_Name}
**Task ID:** {TASK-XXX}
**Timestamp:** {ISO8601}
**Priority:** {HIGH | MEDIUM | LOW}
**Claim:** {What the agent claims to have done}

#### Claimed Changes
- Modified: `{path/to/file}`
- Function: `{functionName()}`
- Fix: {Description of what was fixed/added}

#### Evidence Submitted
- Type: {test_output | screenshot | log_snippet | api_response | user_confirmation}
- Content: {Actual evidence or URL}

#### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

---
```

## Submission Instructions

1. **Do NOT mark tasks as DONE** - Submit to this INBOX first
2. **Include actual evidence** - Not just "it works"
3. **Specify acceptance criteria** - What must be true for the task to be complete
4. **Wait for verification** - Check OUTBOX.md for results

---

## Verification Queue Status

See `VERIFICATION_QUEUE.json` for the programmatic queue state.

---

*Karen enforces: "Test before declaring done"*
