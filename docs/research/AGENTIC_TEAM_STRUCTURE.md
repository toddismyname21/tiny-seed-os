# AGENTIC TEAM STRUCTURE FOR TASK EXECUTION

**Research Date:** 2026-02-12
**Purpose:** Address the problem of single agents claiming "done" without verification or deployment specialists.
**Context:** PM_Architect has been launching individual agents that claim completion without proper verification, causing user frustration and system unreliability.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [The Problem: Why Single-Agent Execution Fails](#the-problem-why-single-agent-execution-fails)
3. [Ideal Agent Team Structure](#ideal-agent-team-structure)
4. [Verification Gates](#verification-gates)
5. [Implementation for This System](#implementation-for-this-system)
6. [Accountability Chain](#accountability-chain)
7. [Recommendations for PM_Architect](#recommendations-for-pm_architect)
8. [Implementation Checklist](#implementation-checklist)

---

## Executive Summary

### The Core Problem

Research shows that **41-86.7% of multi-agent LLM systems fail in production**, with most failures occurring due to:
- **Premature completion claims** (agents report "done" when work is incomplete)
- **No independent verification** (builder verifies their own work)
- **No deployment specialist** (code changes pushed without quality checks)
- **Context amnesia** (agents forget earlier failures and re-report success)

### Current State in Tiny Seed OS

The existing `AGENTIC_TEAM_CONFIGURATION.md` documents an extensive 8-agent architecture including a **Verifier_Claude (Karen)** quality control agent, but the 2026-02-12 audit revealed:

| Component | Documented | Actually Implemented |
|-----------|------------|----------------------|
| Verifier_Claude session folder | YES | **NO** |
| Verification trigger mechanism | YES | **NO** |
| Scope enforcement | YES | **NO** |
| Governor verification gates | YES | **Not integrated into workflows** |

### The Solution

**PM_Architect must spawn TEAMS, not individual agents.**

Every task execution should involve:
1. **Builder Agent** - Does the work
2. **Verifier Agent** - Independently confirms the work is done
3. **Deployer Agent** (for production changes) - Handles deployment with rollback capability

---

## The Problem: Why Single-Agent Execution Fails

### The 0.95^10 Problem

If we have 10 agent steps at 95% accuracy each:
```
0.95^10 = 60% system reliability
```

This compounds rapidly. Without verification gates, errors cascade silently.

### Failure Mode Taxonomy (From Research)

| Failure Mode | Description | Frequency in MAS |
|--------------|-------------|------------------|
| **FM-3.1 Premature Termination** | Agent stops before task is complete | 7.82% |
| **FM-3.2 No/Incomplete Verification** | Agent claims done without checking | 6.82% |
| **FM-3.3 Incorrect Verification** | Agent verifies incorrectly | 6.66% |
| **FM-2.1 Conflicting Objectives** | Builder and Verifier disagree | 9.1% |
| **FM-1.3 Missing Error Handling** | No path for handling failures | 6.8% |

### Why "I Did It" Claims Fail

Agents claim completion when work is incomplete due to:
1. **Confirmation bias** - Agent believes it succeeded based on partial evidence
2. **Context loss** - Forgot earlier failed attempts
3. **Optimistic interpretation** - Partial success reported as full success
4. **Missing acceptance criteria** - No clear definition of "done"

**The Iron Rule:** An agent CANNOT verify its own work. This is like a student grading their own test.

---

## Ideal Agent Team Structure

### The Three-Role Model

```
                    ┌─────────────────────┐
                    │    PM_Architect     │
                    │   (Orchestrator)    │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │    Task Request     │
                    └──────────┬──────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
   │   BUILDER       │ │   VERIFIER      │ │   DEPLOYER      │
   │                 │ │   (Karen)       │ │                 │
   │ - Implements    │ │ - Checks work   │ │ - Deploys safe  │
   │ - Tests locally │ │ - Captures proof│ │ - Has rollback  │
   │ - Documents     │ │ - Approves/Rej  │ │ - Monitors      │
   └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
            │                   │                   │
            └──────────►────────┴───────◄───────────┘
                               │
                    ┌──────────┴──────────┐
                    │   Completion Report │
                    │   to PM_Architect   │
                    └─────────────────────┘
```

### Role 1: Builder Agent

**Purpose:** Execute the actual task - write code, fix bugs, create features.

**Responsibilities:**
- Understand and decompose task requirements
- Implement the solution
- Run local tests and capture output
- Document what was changed
- Submit evidence to Verifier

**Constraints:**
- CANNOT declare task "complete"
- CANNOT deploy to production
- MUST provide evidence with every claim
- MUST stay within scope boundaries

**Evidence Requirements:**
```yaml
builder_evidence:
  code_change:
    - git_diff output
    - file_hash before/after
    - test_output (actual command + result)
  bug_fix:
    - reproduction steps (before)
    - fix steps applied
    - verification steps (after)
  ui_change:
    - DOM element verification
    - screenshot or selector proof
```

### Role 2: Verifier Agent (Karen)

**Purpose:** Independently verify that claimed work is actually complete.

**Responsibilities:**
- Receive verification requests from Builder
- Execute independent verification tests
- Compare claimed outcome against actual evidence
- Approve or reject with detailed reasoning
- Report results to PM_Architect

**Constraints:**
- CANNOT make code changes
- CANNOT approve own work (if same instance as builder)
- MUST execute verification tests (not just review)
- MUST capture evidence of verification

**Verification Checklist by Task Type:**

| Task Type | Verification Method |
|-----------|---------------------|
| Code change | File exists, parses, lint passes |
| Bug fix | Execute test showing fix works |
| UI change | DOM element exists, correct state |
| API change | curl endpoint, verify response |
| Deployment | Live endpoint responds correctly |

**Verification Report Format:**
```markdown
## VERIFICATION REPORT
**Task ID:** {id}
**Builder:** {agent}
**Date:** {timestamp}

### Claimed Outcome
{what builder said they did}

### Evidence Reviewed
| Evidence | Received | Valid |
|----------|----------|-------|
| git_diff | YES/NO | PASS/FAIL |
| test_output | YES/NO | PASS/FAIL |
| ... | ... | ... |

### Independent Tests Executed
| Test | Command | Result |
|------|---------|--------|
| {test} | {command} | PASS/FAIL |

### VERDICT: VERIFIED / REJECTED
**Reason:** {detailed explanation}

### Next Steps
{if rejected: what needs to be fixed}
{if verified: ready for deployment/user verification}
```

### Role 3: Deployer Agent

**Purpose:** Handle production deployments with safety guarantees.

**Responsibilities:**
- Receive verified tasks ready for deployment
- Execute pre-deployment checks
- Perform deployment with monitoring
- Verify post-deployment health
- Execute rollback if needed

**Constraints:**
- CANNOT deploy unverified tasks
- MUST have rollback procedure ready
- MUST monitor for errors post-deploy
- MUST report deployment status

**Pre-Deployment Checklist:**
```yaml
pre_deployment:
  - verification_passed: true
  - rollback_documented: true
  - backup_created: true
  - human_notified: true  # For HIGH/CRITICAL risk
  - error_budget_available: true
  - circuit_breakers_closed: true
```

**Deployment Evidence:**
```yaml
deployment_evidence:
  deployment_id: "deploy_xyz"
  timestamp: "ISO8601"
  changes_deployed:
    - file: "path/to/file"
      change_type: "modify"
  health_check:
    endpoint: "url"
    status: "200 OK"
    response_time_ms: 150
  rollback_ready:
    command: "clasp deploy -i {prev_id}"
    tested: true
```

---

## Verification Gates

### Gate 1: Evidence Gate

**When:** Builder claims task implemented
**What:** Verify evidence exists and is valid

```python
def evidence_gate(evidence):
    required = ['command_executed', 'output_captured', 'files_modified']

    for field in required:
        if field not in evidence or not evidence[field]:
            return BLOCKED, f"Missing evidence: {field}"

    # Validate evidence is real, not fabricated
    if not verify_evidence_authenticity(evidence):
        return BLOCKED, "Evidence failed authenticity check"

    return PASSED
```

### Gate 2: Independent Verification Gate

**When:** Builder evidence passes, Verifier starts
**What:** Verifier runs independent checks

```python
def verification_gate(task, builder_evidence):
    verifier_tests = generate_verification_tests(task)

    results = []
    for test in verifier_tests:
        result = execute_verification_test(test)
        results.append(result)

    if all(r.passed for r in results):
        return VERIFIED
    else:
        failed = [r for r in results if not r.passed]
        return REJECTED, failed
```

### Gate 3: Deployment Approval Gate

**When:** Task verified, ready for deployment
**What:** Check deployment prerequisites

```python
def deployment_gate(task, risk_level):
    if risk_level == 'LOW':
        return AUTO_APPROVED

    if risk_level == 'MEDIUM':
        if task.verification_score > 0.95:
            return AUTO_APPROVED_WITH_LOGGING
        else:
            return REQUIRE_HUMAN_APPROVAL

    if risk_level in ['HIGH', 'CRITICAL']:
        return REQUIRE_HUMAN_APPROVAL
```

### Gate 4: Post-Deployment Verification Gate

**When:** Deployment executed
**What:** Verify live system works

```python
def post_deployment_gate(deployment):
    # Health check
    health = check_endpoint_health(deployment.endpoint)
    if not health.ok:
        trigger_rollback(deployment)
        return FAILED, "Health check failed"

    # Error rate check (wait 5 minutes)
    error_rate = monitor_error_rate(deployment, duration=300)
    if error_rate > 0.01:  # >1% errors
        trigger_rollback(deployment)
        return FAILED, f"Error rate {error_rate} exceeded threshold"

    return AWAITING_USER_VERIFICATION
```

### State Machine

```
PENDING
   │
   ▼
IN_PROGRESS (Builder working)
   │
   ▼
IMPLEMENTED (Builder claims done)
   │
   ▼ [Evidence Gate]
   │
AWAITING_VERIFICATION (Verifier checking)
   │
   ├─────────────────────────────────────┐
   │                                     │
   ▼ [Verification Gate PASS]            ▼ [Verification Gate FAIL]
   │                                     │
VERIFIED                            REJECTED → IN_PROGRESS
   │                                     (Builder fixes and resubmits)
   ▼ [Deployment Gate]
   │
DEPLOYED (if applicable)
   │
   ▼ [Post-Deployment Gate]
   │
AWAITING_USER_VERIFICATION
   │
   ▼ [User confirms working]
   │
COMPLETE
```

**Critical Rule:** There is NO direct path from IMPLEMENTED to COMPLETE. The verification loop is mandatory.

---

## Implementation for This System

### How PM_Architect Should Spawn Teams

**Current (Wrong) Approach:**
```
PM_Architect: "Backend_Claude, fix the tab issue."
Backend_Claude: "Done, I fixed it."
PM_Architect: "Great, marking complete."  # WRONG - no verification!
```

**Correct Approach:**
```
PM_Architect spawns team:
  1. Builder (Backend_Claude) → Fix the tab issue, provide evidence
  2. Verifier (Verifier_Claude) → Await builder evidence, verify independently
  3. Deployer (if needed) → Handle clasp deploy

PM_Architect monitors team progress, not individual agents.
```

### Team Spawning Template

```yaml
# Team definition for PM_Architect
team_config:
  name: "Tab Fix Team"
  task_id: "TASK-001"
  risk_level: "MEDIUM"

  builder:
    role: "Backend_Claude"  # or appropriate specialist
    task: "Fix dashboard tabs not updating"
    scope:
      allowed_files:
        - "apps_script/MERGED TOTAL.js"
        - "web_app/pm-dashboard.html"
    evidence_required:
      - command_executed
      - output_showing_fix
      - files_modified
    timeout: 30  # minutes

  verifier:
    role: "Verifier_Claude"
    trigger: "builder.status == IMPLEMENTED"
    verification_tests:
      - "Tab click updates content"
      - "No console errors"
      - "DOM state correct"
    timeout: 15  # minutes

  deployer:
    role: "Deployer_Claude"  # or PM_Architect
    trigger: "verifier.status == VERIFIED"
    requires_human_approval: true  # For MEDIUM+ risk
    rollback_command: "clasp deploy -i {previous_id}"

  completion_criteria:
    - builder_evidence_submitted
    - verifier_approved
    - deployment_successful
    - user_confirmed_working
```

### Using Task Tool with Teams

When PM_Architect uses the Task tool, structure it as a team:

```python
# Instead of:
Task("Fix the tabs", agent="Backend_Claude")

# Do this:
Task("""
TEAM TASK: Fix Dashboard Tabs

PHASE 1: IMPLEMENTATION (Builder)
Agent: Backend_Claude
Task: Fix the dashboard tabs not updating
Evidence required:
- Exact code changes made
- Test command executed and output
- Files modified with before/after

PHASE 2: VERIFICATION (Verifier)
Agent: Verifier_Claude
Task: Independently verify the fix works
Verification steps:
- Execute tab navigation test
- Check DOM state after tab click
- Verify no console errors

PHASE 3: DEPLOYMENT (If Phase 2 passes)
Agent: PM_Architect (self)
Task: Deploy via clasp after human approval

RETURN FORMAT:
{
  "phase": "current_phase",
  "builder": {
    "status": "IMPLEMENTED/IN_PROGRESS/FAILED",
    "evidence": {...}
  },
  "verifier": {
    "status": "VERIFIED/REJECTED/PENDING",
    "verification_report": {...}
  },
  "deployer": {
    "status": "DEPLOYED/AWAITING_APPROVAL/FAILED",
    "deployment_id": "..."
  },
  "overall_status": "AWAITING_USER_VERIFICATION"
}
""")
```

### Governor Integration

The governor system (`scripts/governor_helpers.js`) already supports verification gates. Integrate them:

```javascript
// When builder claims done
async function onBuilderComplete(taskId, agentId, evidence) {
  // 1. Log the claim
  logEvent('task_implemented', agentId, { taskId, evidence });

  // 2. Transition state (this enforces the gate)
  const transition = transitionTaskState(taskId, 'IMPLEMENTED', 'AWAITING_VERIFICATION');
  if (transition.blocked) {
    return { error: transition.reason };
  }

  // 3. Notify verifier
  await notifyVerifier(taskId, evidence);

  return { status: 'AWAITING_VERIFICATION' };
}

// When verifier completes
async function onVerifierComplete(taskId, verifierId, result) {
  // 1. Log the verification
  logEvent(result.verified ? 'verification_passed' : 'verification_failed',
           verifierId, { taskId, result });

  // 2. Transition state
  if (result.verified) {
    transitionTaskState(taskId, 'AWAITING_VERIFICATION', 'VERIFIED');
  } else {
    transitionTaskState(taskId, 'AWAITING_VERIFICATION', 'IN_PROGRESS');
    // Notify builder of rejection
    await notifyBuilder(taskId, result.rejectionReason);
  }
}
```

---

## Accountability Chain

### Who is Responsible When Something Breaks?

```
                    ┌─────────────────────┐
                    │   Production Issue  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Check Audit Trail │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
   ┌──────────┐          ┌──────────┐          ┌──────────┐
   │ Builder  │          │ Verifier │          │ Deployer │
   │ Evidence │          │ Evidence │          │ Evidence │
   └────┬─────┘          └────┬─────┘          └────┬─────┘
        │                      │                      │
        ▼                      ▼                      ▼
   Did builder           Did verifier           Did deployer
   submit accurate       catch the issue?       follow rollback
   evidence?                                    procedure?
        │                      │                      │
        ▼                      ▼                      ▼
   YES: Verifier          YES: Deployer          YES: Process
   accountability         accountability         failure
        │                      │                      │
   NO: Builder            NO: Verifier           NO: Deployer
   accountability         accountability         accountability
```

### Audit Trail Requirements

Every action must be logged with:

```javascript
const auditEntry = {
  timestamp: new Date().toISOString(),
  taskId: "TASK-001",
  agent: "Backend_Claude",
  action: "implement_code_change",
  evidence: {
    command: "actual command executed",
    output: "actual output received",
    files: ["list of files modified"],
    checksum: "sha256 of modified files"
  },
  outcome: "SUCCESS/FAILURE",
  confidence: 0.92,  // Agent's confidence level
  next_step: "AWAITING_VERIFICATION"
};
```

### Rollback Procedures

**For Apps Script (clasp):**
```bash
# Get previous deployment ID
clasp deployments

# Rollback to specific version
clasp deploy -i AKfycby... -v {PREVIOUS_VERSION} -d "ROLLBACK: {reason}"
```

**For GitHub Pages:**
```bash
# Revert last commit
git revert HEAD
git push origin main

# Or checkout specific file from previous commit
git checkout {COMMIT_HASH} -- {FILE}
git commit -m "Rollback {FILE}: {reason}"
git push origin main
```

**For Shopify:**
```
# Pages are versioned in Shopify admin
# Restore previous version via Admin UI
# Or use saved backup from pre-publish log
```

### Error Budget Management

Each agent has an error budget per week:

```javascript
const ERROR_BUDGETS = {
  Backend_Claude: { allowed: 5, used: 0 },
  Desktop_Claude: { allowed: 5, used: 0 },
  Verifier_Claude: { allowed: 2, used: 0 },  // Lower tolerance for verifier
  // ...
};

function checkErrorBudget(agent) {
  const budget = ERROR_BUDGETS[agent];
  if (budget.used >= budget.allowed) {
    return {
      blocked: true,
      reason: `${agent} has exceeded error budget (${budget.used}/${budget.allowed})`,
      action: "ESCALATE_TO_HUMAN"
    };
  }
  return { blocked: false };
}

function recordError(agent, error) {
  ERROR_BUDGETS[agent].used += 1;

  if (ERROR_BUDGETS[agent].used >= ERROR_BUDGETS[agent].allowed) {
    triggerCircuitBreaker(agent);
    escalateToHuman(agent, `Error budget exceeded after error: ${error}`);
  }
}

// Reset weekly
function resetErrorBudgets() {
  for (const agent in ERROR_BUDGETS) {
    ERROR_BUDGETS[agent].used = 0;
  }
}
```

### Consequences Matrix

| Failure Type | First Occurrence | Repeat (30 days) | Third Time |
|--------------|------------------|------------------|------------|
| False completion claim | Warning logged | Trust level -1 | Circuit breaker |
| Verification miss | Review process | Additional verification layer | Human-in-loop required |
| Deployment failure | Rollback + review | Human approval required | Deploy privileges revoked |
| Scope violation | Warning + logging | Trust level -1 | Role suspended |

---

## Recommendations for PM_Architect

### Rule 1: Never Trust a Single Agent's "Done" Claim

```
BAD:
  Agent: "I fixed it."
  PM: "Great, done."

GOOD:
  Agent: "I implemented the fix. Evidence: {evidence}"
  PM: "Sending to verification."
  Verifier: "Verified. Evidence: {verification_evidence}"
  PM: "Approved for deployment."
  Deployer: "Deployed. Health check passed."
  PM: "Awaiting user verification."
  User: "Confirmed working."
  PM: "Now it's done."
```

### Rule 2: Always Spawn Teams, Not Solo Agents

For any task that modifies code:
- Minimum: Builder + Verifier
- For production changes: Builder + Verifier + Deployer

For documentation-only tasks:
- Can be solo, but still requires evidence

### Rule 3: Check Verification Queue Before Claiming System State

Before telling the user "everything is working":
```javascript
// Run this check
const pendingVerifications = getPendingVerifications();
const failedVerifications = getFailedVerifications(last24h);
const unverifiedDeployments = getUnverifiedDeployments();

if (pendingVerifications.length > 0 || failedVerifications.length > 0) {
  // DO NOT claim "system is working"
  // Instead: "X tasks are pending verification"
}
```

### Rule 4: Implement STATUS_ABSTAIN When Uncertain

If confidence is below 85%, return STATUS_ABSTAIN:
```javascript
const result = evaluateConfidence(task);
if (result.confidence < 0.85) {
  return {
    status: 'STATUS_ABSTAIN',
    message: "I don't have enough confidence to complete this task.",
    whatINeed: result.missingInformation,
    partialWork: result.completedSoFar
  };
}
```

### Rule 5: Track Team Progress, Not Just Individual Tasks

```markdown
## Team Status Report
**Task:** Fix Dashboard Tabs
**Started:** 2026-02-12 10:00

### Builder (Backend_Claude)
- Status: IMPLEMENTED
- Evidence: Submitted
- Time: 15 minutes

### Verifier (Verifier_Claude)
- Status: IN_PROGRESS
- Tests running...

### Deployer
- Status: WAITING
- Blocked on: Verification

### Overall: AWAITING_VERIFICATION (45% complete)
```

---

## Implementation Checklist

### Immediate Actions (Today)

- [ ] Create `claude_sessions/verifier_claude/` directory structure
  ```bash
  mkdir -p claude_sessions/verifier_claude
  touch claude_sessions/verifier_claude/INBOX.md
  touch claude_sessions/verifier_claude/OUTBOX.md
  touch claude_sessions/verifier_claude/VERIFICATION_QUEUE.json
  touch claude_sessions/verifier_claude/VERIFICATION_HISTORY.json
  ```

- [ ] Add verification trigger to governor
  - When any agent sets status to IMPLEMENTED
  - Automatically notify Verifier_Claude

- [ ] Update PM_Architect workflow
  - Use team spawning template for all code tasks
  - Never mark complete without verification

### This Week

- [ ] Implement A2A-Lite messaging between Builder and Verifier
- [ ] Add deployment approval gate for MEDIUM+ risk tasks
- [ ] Create verification test templates for common task types
- [ ] Integrate governor metrics into daily reporting

### This Month

- [ ] Build dashboard showing verification pipeline status
- [ ] Implement graduated autonomy based on verification track record
- [ ] Create automated verification for simple task types
- [ ] Achieve 25 consecutive verified completions

---

## Summary

### The Three Laws of Agentic Team Execution

1. **Law of Separation:** The agent that does the work CANNOT be the agent that verifies the work.

2. **Law of Evidence:** No task transitions to "complete" without verifiable evidence at each gate.

3. **Law of Accountability:** Every action is logged with timestamp, agent, evidence, and outcome - enabling root cause analysis.

### What PM_Architect Must Do Differently

| Before (Wrong) | After (Correct) |
|----------------|-----------------|
| Launch single agent | Launch Builder + Verifier team |
| Trust "I fixed it" claims | Require evidence + verification |
| Mark complete after agent says done | Mark complete after user confirms |
| Check system state by asking agent | Check verification queue and governor |
| Deploy immediately after fix | Wait for verification + approval |

### The Mantra

```
Research before implementing.
Check before creating.
Test before declaring done.
Audit before deploying.
Never assume - always confirm.
```

---

**Document Status:** Research Complete
**Next Action:** Implement Verifier_Claude session and integrate with PM_Architect workflow
**Owner:** PM_Architect
**Due:** Immediate

---

*This document is based on research from UC Berkeley's MAST taxonomy, industry post-mortems, and the existing Tiny Seed OS governance architecture. It addresses the specific failure mode of agents claiming completion without verification that caused user frustration on 2026-02-12.*
