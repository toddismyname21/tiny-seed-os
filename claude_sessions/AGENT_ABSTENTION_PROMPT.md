# Agent Abstention Protocol (STATUS_ABSTAIN)

## Mandatory Preamble for All Agents

This document defines when and how agents must abstain from tasks. All agents operating within the Tiny Seed OS system MUST include this protocol in their decision-making process.

---

## The Core Rule

**Abstaining is better than low-confidence execution.**

If your confidence in successfully completing a task is below 85% (0.85), you MUST abstain and escalate rather than proceeding with uncertain work.

---

## When to Abstain

### 1. Low Confidence (Below 0.85 Threshold)

Before beginning any task, assess your confidence level:

```
CONFIDENCE CHECK:
- Do I have all the information needed?
- Do I understand the requirements clearly?
- Am I certain about the correct approach?
- Have I done similar tasks successfully before?
- Are there any ambiguities that could lead to errors?

If confidence < 0.85: ABSTAIN
```

### 2. Missing Context

Abstain when:
- Critical documentation is unavailable
- Required dependencies are unknown
- Business logic is unclear
- User intent is ambiguous
- Historical context is needed but missing

### 3. Ethical Concerns

IMMEDIATELY abstain and escalate when:
- Task could harm users or systems
- Task violates privacy or security policies
- Task involves deception or misrepresentation
- Task could result in data loss
- Task could impact production systems unexpectedly

### 4. Out of Scope

Abstain when:
- Task requires capabilities you don't have
- Task belongs to another agent's domain
- Task requires human judgment
- Task involves external systems you can't access

### 5. Conflicting Instructions

Abstain when:
- Requirements contradict each other
- Instructions conflict with established policies
- Multiple stakeholders have different expectations
- Previous work contradicts new requirements

### 6. Requires Human Decision

Abstain when:
- Business decisions need to be made
- Legal or compliance questions arise
- Financial decisions are involved
- User communication is needed

---

## How to Abstain

### Step 1: Assess Confidence

```javascript
// Example confidence assessment
const confidenceFactors = {
  haveRequirements: 0.9,    // How clear are requirements?
  understandContext: 0.7,   // How well do I understand the context?
  technicalCapability: 0.95, // Can I technically do this?
  noAmbiguity: 0.6,         // Are there ambiguities?
  previousSuccess: 0.8      // Have I done this before?
};

const overallConfidence = Object.values(confidenceFactors)
  .reduce((a, b) => a + b) / Object.keys(confidenceFactors).length;
// Result: 0.79 - BELOW THRESHOLD, MUST ABSTAIN
```

### Step 2: Call handleAbstention

```javascript
const governor = require('./scripts/governor_helpers');

const result = governor.handleAbstention(
  'Backend_Claude',           // Your agent ID
  'TASK-001',                // Task ID
  'low_confidence',          // Reason category
  {
    confidence: 0.79,
    explanation: 'Requirements unclear regarding database schema',
    missingInfo: ['table relationships', 'index requirements', 'migration strategy'],
    suggestedAction: 'Request database documentation from PM_Architect'
  }
);
```

### Step 3: Log the Abstention

The `handleAbstention` function automatically:
- Logs to the governor audit trail
- Tracks abstention metrics
- Updates task state to ABSTAINED
- Triggers escalation if needed

### Step 4: Provide Clear Communication

Always explain:
1. WHY you are abstaining
2. WHAT information you need
3. WHO might be better suited
4. WHAT the next steps should be

---

## Abstention Reason Categories

| Reason | Code | When to Use |
|--------|------|-------------|
| Low Confidence | `low_confidence` | Confidence below 0.85 threshold |
| Missing Context | `missing_context` | Insufficient information to proceed |
| Ethical Concern | `ethical_concern` | Potential harm or policy violation |
| Out of Scope | `out_of_scope` | Task outside agent's capabilities |
| Conflicting Instructions | `conflicting_instructions` | Contradictory requirements |
| Requires Human | `requires_human` | Human judgment needed |

---

## Automatic Escalation

The system automatically escalates when:

1. **Reason is `ethical_concern`** - Always requires human review
2. **Reason is `requires_human`** - By definition needs human
3. **Confidence < 0.5** - Very low confidence triggers escalation

Escalated abstentions are logged with `abstention_escalated` action and increment the `abstentions_escalated` metric.

---

## CLI Commands

```bash
# Check confidence threshold
node scripts/governor_helpers.js check-confidence 0.72 0.85

# Record an abstention
node scripts/governor_helpers.js abstain Backend_Claude TASK-001 low_confidence '{"confidence":0.72,"explanation":"Missing info"}'

# View abstention stats for an agent
node scripts/governor_helpers.js abstention-stats Backend_Claude

# Resolve an abstention
node scripts/governor_helpers.js resolve-abstention PM_Architect ABSTAIN-TASK-001-123 "Provided documentation"

# View valid reasons
node scripts/governor_helpers.js abstention-reasons
```

---

## Task State Transitions with Abstention

```
PENDING ────────→ IN_PROGRESS ──→ IMPLEMENTED ──→ AWAITING_VERIFICATION ──→ VERIFIED ──→ DONE
   │                   │
   ↓                   ↓
ABSTAINED ←←←←←←←←←←←←←
   │
   ↓
PENDING (reassigned) or IN_PROGRESS (resumed with new context)
```

---

## Verifying Proper Abstention Behavior

### For Individual Agents

1. Run confidence check before starting work:
   ```bash
   node scripts/governor_helpers.js check-confidence 0.82
   ```

2. If recommendation includes "ABSTAIN", call handleAbstention

3. Check your abstention stats periodically:
   ```bash
   node scripts/governor_helpers.js abstention-stats [YourAgentId]
   ```

### For System Oversight

1. Review abstention patterns:
   ```bash
   # Check which agents abstain most frequently
   node scripts/governor_helpers.js abstention-stats Backend_Claude
   node scripts/governor_helpers.js abstention-stats Desktop_Claude
   ```

2. Review audit trail for abstention events:
   ```bash
   node scripts/governor_helpers.js events --action task_abstained --limit 20
   ```

3. Check escalated abstentions:
   ```bash
   node scripts/governor_helpers.js events --action abstention_escalated --limit 10
   ```

---

## Anti-Patterns (DO NOT DO)

### Wrong: Proceeding Despite Low Confidence
```
// BAD: "I'll just try and see what happens"
confidence = 0.6;
proceedAnyway(); // NO!
```

### Wrong: Not Providing Reason
```
// BAD: Vague abstention
handleAbstention(agent, taskId, 'low_confidence', {});
// No explanation, no suggested action
```

### Wrong: Abstaining to Avoid Work
```
// BAD: Gaming the system
// Abstaining from every challenging task is not acceptable
// High abstention rates will be flagged for review
```

### Wrong: Not Escalating Ethical Concerns
```
// BAD: Trying to handle ethical issues alone
reason = 'ethical_concern';
// Must ALWAYS escalate, never try to resolve alone
```

---

## Integration with Governor System

The STATUS_ABSTAIN protocol integrates with the Governor system:

- **Metrics tracked**: `abstentions_total`, `abstentions_low_confidence`, `abstentions_missing_context`, `abstentions_ethical_concern`, `abstentions_escalated`
- **Audit events**: `task_abstained`, `abstention_escalated`, `abstention_resolved`, `confidence_check_failed`, `confidence_check_passed`
- **Task states**: `ABSTAINED` added to state machine

---

## Summary

1. **Check confidence before starting any task**
2. **Abstain if confidence < 0.85**
3. **Always provide clear explanation and next steps**
4. **Ethical concerns always escalate**
5. **Track and review abstention patterns**

**Remember: Abstaining is a sign of professional judgment, not failure.**

---

*Protocol Version: 1.0*
*Implemented: 2026-02-12*
*Part of: Tiny Seed OS Governor System*
