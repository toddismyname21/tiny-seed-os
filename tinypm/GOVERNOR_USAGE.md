# Governor System Usage Guide

## Overview

The Governor system tracks agent performance, logs audit events, and manages error budgets for the Tiny Seed OS multi-agent AI orchestration system. This document explains how agents should use these files.

**Created:** 2026-02-12
**Part of:** Agentic Performance Improvement Plan
**Author:** PM_Architect Claude

---

## File Locations

| File | Path | Purpose |
|------|------|---------|
| Metrics | `/tinypm/.governor_metrics.json` | Tracks performance metrics per agent |
| Audit Log | `/tinypm/.governor_audit.json` | Event-level audit trail |
| Helper Functions | `/scripts/governor_helpers.js` | JavaScript helper functions |

---

## Governor Metrics Structure

The `.governor_metrics.json` file tracks:

### Global Metrics
```json
{
  "metrics": {
    "tasks_completed": 0,
    "tasks_failed": 0,
    "escalations": 0,
    "approvals_requested": 0,
    "rollbacks_executed": 0,
    "duplicates_prevented": 0,
    "pre_flight_failures": 0
  }
}
```

### Per-Agent Metrics
Each agent has individual tracking:
```json
{
  "by_agent": {
    "Backend_Claude": {
      "tasks_completed": 0,
      "tasks_failed": 0,
      "escalations": 0,
      "approvals_requested": 0
    }
  }
}
```

### Error Budgets
Weekly error limits per agent:
```json
{
  "error_budgets": {
    "Backend_Claude": { "allowed": 5, "used": 0, "period": "weekly" }
  }
}
```

---

## Governor Audit Structure

The `.governor_audit.json` file logs individual events:

```json
{
  "events": [
    {
      "id": "uuid-here",
      "timestamp": "2026-02-12T10:30:00Z",
      "agent": "Backend_Claude",
      "action": "task_completed",
      "outcome": "success",
      "details": {
        "task": "Update API endpoint",
        "files_modified": ["MERGED TOTAL.js"],
        "confidence": 95
      },
      "rollbackAvailable": true
    }
  ]
}
```

---

## Using Helper Functions

### From Node.js

```javascript
const governor = require('./scripts/governor_helpers');

// Log an event
governor.logGovernorEvent('Backend_Claude', 'task_completed', 'success', {
  task: 'Update API endpoint',
  files_modified: ['MERGED TOTAL.js']
});

// Increment a metric
governor.incrementMetric('tasks_completed', 'Backend_Claude');

// Check error budget before proceeding
const budget = governor.checkErrorBudget('Backend_Claude');
if (!budget.canProceed) {
  console.log('Error budget exceeded - escalating to human');
}

// Get agent performance
const performance = governor.getAgentPerformance('Backend_Claude');
console.log(`Success rate: ${performance.summary.successRate}%`);
```

### From Command Line

```bash
# Log an event
node scripts/governor_helpers.js log Backend_Claude task_completed success '{"task":"API update"}'

# Increment a metric
node scripts/governor_helpers.js increment tasks_completed Backend_Claude

# Check error budget
node scripts/governor_helpers.js check-budget Backend_Claude

# Get agent performance
node scripts/governor_helpers.js performance Backend_Claude

# Get recent events
node scripts/governor_helpers.js events --agent Backend_Claude --limit 10

# Get all agents summary
node scripts/governor_helpers.js summary

# Reset error budgets (weekly)
node scripts/governor_helpers.js reset-budgets
```

### From Bash Scripts

```bash
# Simple metric increment using jq
jq '.metrics.tasks_completed += 1' tinypm/.governor_metrics.json > tmp.$$.json && mv tmp.$$.json tinypm/.governor_metrics.json

# Add audit event
NEW_EVENT=$(jq -n --arg agent "Backend_Claude" --arg action "task_completed" --arg outcome "success" '{
  id: "manual-\(now)",
  timestamp: (now | todate),
  agent: $agent,
  action: $action,
  outcome: $outcome,
  details: {}
}')
jq --argjson event "$NEW_EVENT" '.events += [$event]' tinypm/.governor_audit.json > tmp.$$.json && mv tmp.$$.json tinypm/.governor_audit.json
```

---

## When to Log Events

### ALWAYS Log:

| Event | When |
|-------|------|
| `task_started` | Beginning any assigned task |
| `task_completed` | Successfully finishing a task |
| `task_failed` | Task could not be completed |
| `escalation` | Confidence < 70%, escalating to human |
| `approval_requested` | Requesting human approval for high-risk action |
| `deployment_executed` | Any production deployment |
| `rollback_executed` | Any rollback operation |
| `duplicate_prevented` | Pre-flight check prevented duplicate creation |
| `pre_flight_failed` | Pre-flight validation failed |
| `verification_passed` | Verification check passed |
| `verification_failed` | Verification check failed |

### Log Details Should Include:

```javascript
{
  task: "Description of the task",
  files_modified: ["file1.js", "file2.html"],
  confidence: 95,  // Your confidence level
  reasoning: "Why this approach was chosen",
  rollbackCommand: "git checkout HEAD~1 -- file.js",  // How to undo
  verificationOutput: "Test output here"  // If applicable
}
```

---

## Agent Workflow Integration

### At Session Start

```javascript
// 1. Log session start
governor.logGovernorEvent('Backend_Claude', 'session_started', 'success', {
  context: 'Loaded from CONTEXT_SNAPSHOT.md'
});

// 2. Check error budget
const budget = governor.checkErrorBudget('Backend_Claude');
if (!budget.canProceed) {
  // Notify human of budget exceeded state
  console.log('Warning: Error budget exceeded. Operating in supervised mode.');
}

// 3. Review recent failures
const recentFailures = governor.getRecentEvents({
  agent: 'Backend_Claude',
  action: 'task_failed',
  days: 7
});
if (recentFailures.length > 0) {
  console.log(`Warning: ${recentFailures.length} failures in last 7 days`);
}
```

### During Task Execution

```javascript
// Before high-risk action
governor.logGovernorEvent('Backend_Claude', 'approval_requested', 'pending', {
  action: 'deploy_to_production',
  changes: ['Updated API endpoint'],
  rollbackPlan: 'git checkout HEAD~1 -- apps_script/MERGED TOTAL.js'
});
governor.incrementMetric('approvals_requested', 'Backend_Claude');

// After task completion
governor.logGovernorEvent('Backend_Claude', 'task_completed', 'success', {
  task: 'Update Morning Brief',
  files_modified: ['apps_script/MERGED TOTAL.js'],
  verificationOutput: 'curl test returned expected data'
});
governor.incrementMetric('tasks_completed', 'Backend_Claude');
```

### On Failure

```javascript
// Log the failure
governor.logGovernorEvent('Backend_Claude', 'task_failed', 'failure', {
  task: 'Update API endpoint',
  error: 'Syntax error in line 450',
  rollbackAvailable: true
});
governor.incrementMetric('tasks_failed', 'Backend_Claude');

// This automatically updates error budget
// Check if we should escalate
const budget = governor.checkErrorBudget('Backend_Claude');
if (!budget.canProceed) {
  governor.logGovernorEvent('Backend_Claude', 'escalation', 'escalated', {
    reason: 'Error budget exceeded',
    recommendedAction: 'Human review required before continuing'
  });
}
```

---

## Error Budget Management

### How It Works

1. Each agent has a weekly error budget (default: 5 failures)
2. Every `tasks_failed` increment counts against the budget
3. When budget reaches 80%, a warning is logged
4. When budget is exceeded, agent should operate in supervised mode
5. Budgets reset weekly (run `reset-budgets` command)

### Checking Budget Status

```bash
# From CLI
node scripts/governor_helpers.js check-budget Backend_Claude

# Output:
{
  "canProceed": true,
  "hasBudget": true,
  "allowed": 5,
  "used": 2,
  "remaining": 3,
  "period": "weekly",
  "percentUsed": 40,
  "message": "Backend_Claude has 3 errors remaining in budget"
}
```

### When Budget Exceeded

When an agent's error budget is exceeded:

1. Log `error_budget_exceeded` event automatically
2. Agent should request human approval for ALL subsequent tasks
3. Notify PM_Architect of the situation
4. Continue in "supervised mode" until budget resets

---

## Querying Audit Data

### Get Performance Summary

```bash
node scripts/governor_helpers.js summary
```

Output:
```json
{
  "globalMetrics": {
    "tasks_completed": 47,
    "tasks_failed": 3,
    "escalations": 2
  },
  "agents": {
    "Backend_Claude": {
      "tasksCompleted": 25,
      "tasksFailed": 1,
      "successRate": 96,
      "errorBudgetStatus": "1/5"
    }
  }
}
```

### Filter Events

```bash
# Get failures in last 7 days
node scripts/governor_helpers.js events --action task_failed --days 7

# Get all events for Backend_Claude
node scripts/governor_helpers.js events --agent Backend_Claude --limit 20

# Get deployments
node scripts/governor_helpers.js events --action deployment_executed
```

### Using jq for Analysis

```bash
# Count events by outcome
jq '.events | group_by(.outcome) | map({outcome: .[0].outcome, count: length})' tinypm/.governor_audit.json

# Find all failures today
jq --arg today "$(date +%Y-%m-%d)" '.events | map(select(.outcome == "failure" and (.timestamp | startswith($today))))' tinypm/.governor_audit.json

# Calculate success rate
jq '.events | [.[] | select(.action == "task_completed" or .action == "task_failed")] | group_by(.outcome) | {completed: (map(select(.[0].outcome == "success")) | .[0] | length), failed: (map(select(.[0].outcome == "failure")) | .[0] | length)}' tinypm/.governor_audit.json
```

---

## Maintenance

### Weekly Tasks

1. **Reset Error Budgets** (every Monday)
   ```bash
   node scripts/governor_helpers.js reset-budgets
   ```

2. **Review Performance Summary**
   ```bash
   node scripts/governor_helpers.js summary
   ```

3. **Archive Old Audit Events**
   The system automatically keeps only the last 1000 events.

### Troubleshooting

**Problem:** Governor files corrupted
**Solution:**
```bash
# Reset metrics file
echo '{"version":"1.0","created":"2026-02-12","metrics":{"tasks_completed":0,"tasks_failed":0,"escalations":0,"approvals_requested":0,"rollbacks_executed":0,"duplicates_prevented":0,"pre_flight_failures":0},"by_agent":{},"error_budgets":{},"last_updated":null}' > tinypm/.governor_metrics.json

# Reset audit file
echo '{"version":"1.0","created":"2026-02-12","events":[]}' > tinypm/.governor_audit.json
```

**Problem:** Helper script not finding files
**Solution:** Run from the project root directory, or ensure the path is correct.

---

## Integration with CLAUDE.md

The following rules in CLAUDE.md relate to the Governor system:

1. **Step 5: Log Your Changes** - Use governor audit logging
2. **Forbidden Actions** - Governor tracks violations
3. **Confidence-Based Escalation** - Governor logs escalations
4. **High-Risk Actions** - Governor logs approval requests

When completing any task, agents should:

1. Log the event to governor audit
2. Increment appropriate metrics
3. Check error budget before high-risk actions
4. Include governor metrics in CHANGE_LOG entries

---

## Valid Values Reference

### Agent Names
- PM_Architect
- Backend_Claude
- Desktop_Claude
- Mobile_Claude
- UX_Design_Claude
- Sales_Claude
- Security_Claude
- Verifier_Claude (future)
- Critic_Claude (future)

### Metrics
- tasks_completed
- tasks_failed
- escalations
- approvals_requested
- rollbacks_executed
- duplicates_prevented
- pre_flight_failures

### Actions
- task_started
- task_completed
- task_failed
- escalation
- approval_requested
- approval_granted
- approval_denied
- rollback_executed
- duplicate_prevented
- pre_flight_passed
- pre_flight_failed
- verification_passed
- verification_failed
- deployment_executed
- session_started
- session_ended
- error_budget_warning
- error_budget_exceeded

### Outcomes
- success
- failure
- pending
- escalated
- rolled_back

---

## Related Documents

- `/claude_sessions/pm_architect/AGENTIC_PERFORMANCE_IMPROVEMENT_PLAN.md` - Full improvement plan
- `/CLAUDE.md` - Main Claude rules and procedures
- `/claude_sessions/pm_architect/AGENTIC_TEAM_CONFIGURATION.md` - Agent roles and boundaries
- `/CHANGE_LOG.md` - Central change tracking

---

**END OF DOCUMENT**
