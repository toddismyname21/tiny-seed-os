# CODE AUDIT METHODOLOGY

## Overview

This methodology is modeled after professional audit firms (Trail of Bits, NCC Group, OpenZeppelin) adapted for a Claude Code terminal operating on a large JavaScript/HTML codebase. It combines automated static analysis, AST-based deep analysis, runtime verification, visual testing, and security scanning into a systematic workflow.

---

## Audit Types

### 1. Full Audit
A comprehensive sweep of an entire file or subsystem. Takes significant time. Run at major milestones or before owner reviews.

**Scope:** All checklist categories (Correctness, Completeness, Consistency, Security, Performance, Accessibility, Maintainability, Error Handling, API Contract, State Management, Visual Integrity)

### 2. Targeted Audit
A focused audit of specific changes or features. Run when a terminal claims "done" on a task.

**Scope:** Only the categories relevant to the claimed changes, plus regression checks.

### 3. Regression Audit
A quick automated sweep to ensure new changes did not break existing functionality.

**Scope:** Automated scripts only -- duplicate detector, orphan checker, API URL validator, element ref validator.

### 4. Security Audit
A deep dive into security-specific concerns. Run before any production deployment or when new input handling is added.

**Scope:** XSS, injection, auth bypass, CSRF, secrets exposure, dependency vulnerabilities.

### 5. Continuous Audit
Automated scripts that run at the start of every Code Audit Claude session. Results feed into the session's initial report.

**Scope:** All automated scripts in `scripts/audit/`.

---

## The Audit Process (Step by Step)

### Phase 1: Reconnaissance (5 minutes)

Before touching any code, understand the landscape.

```
1. Read the INBOX for any specific audit requests
2. Read recent CHANGE_LOG.md entries (what changed since last audit?)
3. Read recent git log (what commits landed?)
4. Read terminal OUTBOXes for "completed" claims
5. Identify the target files and their size/complexity
```

### Phase 2: Automated Sweep (10-15 minutes)

Run every automated tool. Capture all output.

```bash
# Full automated audit suite
bash scripts/audit/run-full-audit.sh [target-file-or-directory]

# Individual tools (if you need to run them separately):
node scripts/audit/duplicate-function-detector.js [file]
node scripts/audit/dead-code-finder.js [file]
bash scripts/audit/dom-orphan-checker.sh [file]
node scripts/audit/function-call-graph.js [file]
node scripts/audit/api-contract-validator.js [file]
bash scripts/audit/unused-css-finder.sh [file]
node scripts/audit/event-listener-auditor.js [file]
node scripts/audit/stub-function-detector.js [file]
bash scripts/audit/async-pattern-checker.sh [file]
```

### Phase 3: Deep Manual Analysis (20-60 minutes)

For each finding from Phase 2, and for areas that automated tools cannot cover:

1. **Read the code** -- Actually read functions, not just grep for patterns
2. **Trace call paths** -- Follow a function from its caller to its implementation. Does the right version get called?
3. **Check edge cases** -- What happens with empty input? Null? Undefined? Very large input?
4. **Verify error handling** -- Does every fetch/API call have a catch? Does every try have meaningful error recovery?
5. **Check state consistency** -- Are global variables modified in multiple places? Could race conditions occur?
6. **Validate visual logic** -- Do CSS classes referenced in JS actually exist in the stylesheet? Do media queries cover the right breakpoints?

### Phase 4: Runtime Verification (10-20 minutes, when applicable)

For findings that need runtime proof:

```bash
# Execute JavaScript to test actual behavior
node -e "
  // Test which version of a duplicate function wins
  function escapeHtml(s) { return 'VERSION_1: ' + s; }
  function escapeHtml(s) { return 'VERSION_2: ' + s; }
  console.log(escapeHtml('<test>')); // Will print VERSION_2
"

# Screenshot a page for visual verification
npx playwright screenshot --browser chromium http://localhost:8080/page.html screenshot.png

# Run Lighthouse audit
npx lighthouse http://localhost:8080/page.html --output json --quiet

# Run accessibility audit
npx pa11y http://localhost:8080/page.html
```

### Phase 5: Report Generation

Compile all findings into the standard report format (see below). Every finding must have:
- A unique ID (e.g., AUDIT-2026-0215-001)
- A severity rating (CRITICAL / HIGH / MEDIUM / LOW / INFO)
- A description of the issue
- Evidence (code snippets, line numbers, tool output)
- Impact assessment (what breaks, who is affected)
- Recommended fix
- Which terminal should fix it

---

## Finding Report Format

Every individual finding MUST follow this format:

```markdown
### [AUDIT-YYYY-MMDD-NNN] Title of Finding

**Severity:** CRITICAL | HIGH | MEDIUM | LOW | INFO
**Category:** Correctness | Security | Performance | Accessibility | Maintainability | etc.
**File:** path/to/file.ext
**Lines:** 1234-1256
**Affects:** [Description of what functionality is affected]
**Assigned To:** [Terminal name that should fix this]

#### Description
[Clear, concise description of what is wrong]

#### Evidence
```
[Exact code snippet, tool output, or screenshot reference]
```

#### Impact
[What happens because of this bug? Who is affected? How likely is it to trigger?]

#### Recommended Fix
[Specific, actionable steps to fix the issue]

#### Verification Steps
[How to verify the fix was applied correctly]
```

---

## Full Audit Report Format

```markdown
# AUDIT REPORT: [Target Name]

**Date:** YYYY-MM-DD
**Auditor:** Code_Audit_Claude
**Scope:** [Full | Targeted | Regression | Security]
**Target:** [File(s) or subsystem audited]
**Methodology:** Automated sweep + manual analysis + runtime verification

---

## Executive Summary

[2-3 sentence overview: What was audited, what was found, overall assessment]

**Findings Summary:**
| Severity | Count |
|----------|-------|
| CRITICAL | X |
| HIGH | X |
| MEDIUM | X |
| LOW | X |
| INFO | X |
| **TOTAL** | **X** |

**Overall Verdict:** PASS | FAIL | NEEDS_REMEDIATION

---

## Automated Tool Results

| Tool | Status | Findings |
|------|--------|----------|
| Duplicate Function Detector | RAN/SKIPPED | X issues |
| Dead Code Finder | RAN/SKIPPED | X issues |
| DOM Orphan Checker | RAN/SKIPPED | X issues |
| API URL Validator | RAN/SKIPPED | X issues |
| Element Ref Validator | RAN/SKIPPED | X issues |
| Stub Function Detector | RAN/SKIPPED | X issues |
| Unused CSS Finder | RAN/SKIPPED | X issues |
| Event Listener Auditor | RAN/SKIPPED | X issues |
| Async Pattern Checker | RAN/SKIPPED | X issues |

---

## Findings

### Critical Findings
[List of CRITICAL findings using the Finding Report Format]

### High Findings
[List of HIGH findings]

### Medium Findings
[List of MEDIUM findings]

### Low Findings
[List of LOW findings]

### Informational
[List of INFO findings]

---

## Items Not Verified (STATUS_ABSTAIN)

| Item | Reason | What Would Be Needed |
|------|--------|---------------------|
| [Item] | [Why it could not be verified] | [What tool/access/environment is needed] |

---

## Recommendations

### Immediate Actions (Block deployment)
[Numbered list of things that must be fixed before going live]

### Short-Term Actions (Fix within 1 week)
[Numbered list]

### Long-Term Actions (Technical debt)
[Numbered list]

---

## Appendix

### A. Tool Versions
[List of tool versions used]

### B. Raw Tool Output
[Collapsible sections with full tool output]

### C. Files Examined
[Complete list of files read during audit]
```

---

## Evidence Standards

### What Counts as Evidence

| Evidence Type | Strength | Example |
|--------------|----------|---------|
| Tool output with line numbers | STRONG | `eslint output showing error at line 1234` |
| Exact code snippet with context | STRONG | `Lines 100-110 of file.html showing the bug` |
| Runtime test output | STRONG | `Node.js execution showing incorrect return value` |
| Screenshot comparison | STRONG | `Before/after screenshots showing rendering difference` |
| Lighthouse/axe-core report | STRONG | `Accessibility score: 45/100, 12 violations` |
| Curl response with status code | STRONG | `curl -s URL returned 500 with error body` |
| Git blame showing when introduced | MODERATE | `Introduced in commit abc123 on 2026-02-10` |
| Cross-reference to documentation | MODERATE | `CLAUDE.md says X but code does Y` |

### What Does NOT Count as Evidence

- "I think this might be broken"
- "This looks wrong"
- "I tested it and it works" (without showing the test)
- "Based on my experience..."
- Referencing line numbers without showing the actual code

---

## Audit Cadence

| Trigger | Audit Type | Scope |
|---------|-----------|-------|
| Session start | Continuous | Run automated suite |
| Terminal claims "done" | Targeted | Audit the claimed changes |
| Before owner review | Full | Complete audit of target area |
| Before deployment | Security + Regression | Security scan + regression suite |
| After major refactor | Full | Complete re-audit of affected files |
| Weekly (Saturday) | Full | Entire active codebase |
| Emergency (bug reported) | Targeted | Focus on reported area + related code |

---

## Collaboration Protocol

### When You Find a Bug

1. Write the finding in standard format
2. Add it to your OUTBOX immediately
3. Tag the responsible terminal (e.g., "Assigned To: Desktop_Claude")
4. If CRITICAL: Also write to PM_Architect's INBOX with "CRITICAL AUDIT FINDING" header
5. Do NOT attempt to fix it yourself

### When a Terminal Disputes Your Finding

1. Re-verify your evidence
2. If your evidence holds: "Evidence stands. [Link to proof]"
3. If they provide new information: Update finding or mark RESOLVED
4. Escalate to PM_Architect if disagreement persists

### When PM_Architect Requests an Audit

1. Acknowledge in your OUTBOX within 1 message
2. Run the requested audit type
3. Deliver report within the session
4. Flag any STATUS_ABSTAIN items that need live testing
