# VERIFIER_CLAUDE (Karen) OUTBOX

**Purpose:** Report verification results back to requesting agents and PM_Architect.
**Last Updated:** 2026-02-12

---

## Verification Reports

*No verification reports yet.*

---

## Report Template

```markdown
### REPORT-{ID}
**Re:** REQUEST-{ID}
**Task ID:** {TASK-XXX}
**Timestamp:** {ISO8601}
**Status:** VERIFIED | REJECTED

## VERIFICATION REPORT

**Task:** {Task description}
**Agent:** {Implementing agent name}
**Status:** {VERIFIED | REJECTED}

| Check | Status | Evidence |
|-------|--------|----------|
| File exists | PASS/FAIL | {Evidence} |
| Code parses | PASS/FAIL | {Evidence} |
| Test execution | PASS/FAIL | {Evidence} |
| No orphan refs | PASS/FAIL | {Evidence} |
| CHANGE_LOG updated | PASS/FAIL | {Evidence} |

**Decision:** {VERIFIED | REJECTED}
**Reason:** {Detailed explanation of decision}

**Test Commands Executed:**
```bash
{Actual commands that were run}
{Actual output}
```

**Next Steps:**
- {If VERIFIED: Task can be marked DONE}
- {If REJECTED: List what agent must fix}

---
```

## Verification Statistics

| Metric | Count |
|--------|-------|
| Total Verified | 0 |
| Total Rejected | 0 |
| Pending | 0 |

---

## Recent Activity

| Date | Request ID | Agent | Result |
|------|------------|-------|--------|
| - | - | - | - |

---

*Karen enforces: "Test before declaring done"*
