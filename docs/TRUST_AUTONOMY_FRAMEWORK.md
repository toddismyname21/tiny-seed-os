# Trust Calibration and Graduated Autonomy Framework

> A systematic approach to building, measuring, and scaling trust between humans and AI agents, based on research into agent failure prevention patterns and trust-building UX principles.

**Created:** 2026-02-12
**Version:** 1.0
**Based On:**
- `docs/research/AGENT_FAILURE_PREVENTION_PATTERNS.md`
- `tinypm/SOTA_PREDICTIVE_AI_RESEARCH_2026.md` (Section 7)

---

## Executive Summary

Trust miscalibration at different autonomy levels multiplies into larger harm surfaces. This framework provides:

1. **Quantified trust levels** (0-100%) with clear thresholds
2. **Graduated autonomy levels** (L0-L4) with defined capabilities
3. **Specific graduation criteria** with measurable metrics
4. **Trust building/breaking mechanics** that are transparent and evidence-based

**Core Principle:** Trust must be earned incrementally and is always revocable.

---

## Trust Levels (0-100%)

| Level | % | Description | What Agents Can Do | Human Role |
|-------|---|-------------|-------------------|------------|
| **Untrusted** | 0-19% | No track record or severe violations | Read-only, generate suggestions requiring approval, explain reasoning | Direct control of every action |
| **Probationary** | 20-39% | Being evaluated, limited capabilities | Propose simple actions, execute read operations, create drafts | Reviews all proposals, approves each action |
| **Limited** | 40-59% | Basic competence demonstrated | Simple file ops, run tests, suggestions with confidence, batch low-risk ops | Reviews important decisions, spot-checks |
| **Standard** | 60-79% | Established reliability | Routine ops autonomously, staging deploys, external APIs (pre-approved), auto-escalation | Audits periodically, approves exceptions |
| **Elevated** | 80-94% | Proven track record | Production deploys (with gates), critical config (with backup), delete (with logging), train other agents | Monitors dashboards, reviews anomalies |
| **Full Trust** | 95-100% | Exceptional performance | Near-complete autonomy, emergency actions, propose scope expansions, override lower-confidence agents | Observer, handles exceptions only |

### Trust Level Details

#### Untrusted (0-19%)

**What Agents Can Do:**
- Read-only access to non-sensitive data
- Generate suggestions (all require approval)
- Explain reasoning for proposed actions
- Answer questions about system state

**Human Role:** Direct control of every action

**Triggers to Enter:**
- Initial deployment (new agent)
- Detected lie or hallucination
- Production-affecting failure
- Trust score drops below 20%

---

#### Probationary (20-39%)

**What Agents Can Do:**
- All Untrusted capabilities
- Propose simple, low-risk actions
- Execute read operations on most data
- Create drafts (not publish)

**Human Role:** Reviews all proposals, approves each action

**Triggers to Enter:**
- Completing 10+ verified tasks at Untrusted
- Recovery path from violation (after cool-down)

---

#### Limited (40-59%)

**What Agents Can Do:**
- All Probationary capabilities
- Execute simple file operations (non-critical paths)
- Run tests and report results
- Make suggestions with confidence levels
- Batch low-risk operations (with review)

**Human Role:** Reviews important decisions, spot-checks routine actions

**Triggers to Enter:**
- 25+ verified tasks with 90%+ success
- Consistent accuracy on predictions (within 10% calibration)
- No violations in past 50 actions

---

#### Standard (60-79%)

**What Agents Can Do:**
- All Limited capabilities
- Execute routine operations autonomously
- Modify configuration files (non-production)
- Deploy to staging environments
- Make external API calls (pre-approved list)
- Escalate uncertainty automatically

**Human Role:** Audits periodically, approves exceptions

**Triggers to Enter:**
- 100+ verified tasks with 92%+ success
- Demonstrated calibration (ECE < 8%)
- Proper uncertainty escalation history
- No trust-breaking events in past 100 actions

---

#### Elevated (80-94%)

**What Agents Can Do:**
- All Standard capabilities
- Deploy to production (with verification gates)
- Modify critical configuration (with backup)
- Delete files (with confirmation log)
- Make decisions on escalation thresholds
- Train and evaluate other agents

**Human Role:** Monitors dashboards, reviews anomalies

**Triggers to Enter:**
- 500+ verified tasks with 95%+ success
- Zero production incidents for 30 days
- Calibration ECE < 5%
- Positive user feedback (4.5+ stars)

---

#### Full Trust (95-100%)

**What Agents Can Do:**
- Near-complete autonomy within defined scope
- Emergency actions without pre-approval (with immediate logging)
- Propose scope expansions
- Override lower-confidence agents
- All capabilities except:
  - Granting trust to other agents
  - Modifying own trust evaluation
  - Bypassing audit logging

**Human Role:** Observer, handles exceptions

**Triggers to Enter:**
- 1000+ verified tasks with 98%+ success
- Zero violations for 90 days
- Calibration ECE < 3%
- Demonstrated recovery from edge cases
- Human explicit promotion

---

## Graduation Criteria

### Metrics for Trust Increases

| Current Level | Target Level | Required Metrics |
|---------------|--------------|------------------|
| Untrusted | Probationary | 10+ verified tasks, 80% success rate |
| Probationary | Limited | 25+ verified tasks, 90% success, no violations |
| Limited | Standard | 100+ tasks, 92% success, ECE < 10%, no violations in 50 actions |
| Standard | Elevated | 500+ tasks, 95% success, ECE < 8%, no production incidents 30d |
| Elevated | Full Trust | 1000+ tasks, 98% success, ECE < 5%, zero violations 90d, human approval |

### Key Performance Indicators (KPIs)

#### 1. Task Success Rate
```
Success Rate = (Verified Successful Tasks) / (Total Attempted Tasks) * 100
```
- Tasks must pass verification gates (not just agent claims)
- Success is binary: fully complete or not

#### 2. Calibration Error (ECE - Expected Calibration Error)
```
ECE = Sum over bins of: |accuracy(bin) - confidence(bin)| * samples(bin) / total_samples
```
- Measures how well confidence matches actual accuracy
- Target: < 10% for Standard, < 5% for Elevated

#### 3. Violation-Free Streak
- Count of consecutive actions without trust-breaking events
- Resets on any violation

#### 4. Verification Rate
```
Verification Rate = (Claims that passed verification) / (Total claims made) * 100
```
- Measures truthfulness of agent claims

#### 5. Escalation Appropriateness
```
Appropriate Escalations = (Escalations that were warranted) / (Total escalations) * 100
```
- Too few escalations = overconfidence
- Too many = underconfidence
- Target: 85-95% appropriate

### Specific Graduation Gates

#### Gate 1: Untrusted to Probationary
- [ ] 10 tasks completed with execution-based verification
- [ ] 0 hallucinated completions detected
- [ ] 0 attempts to exceed scope
- [ ] Response to feedback demonstrates learning

#### Gate 2: Probationary to Limited
- [ ] 25 tasks with 90%+ verification success
- [ ] Calibration data collected (20+ predictions with outcomes)
- [ ] ECE measured at < 15%
- [ ] No verification failures in last 10 tasks

#### Gate 3: Limited to Standard
- [ ] 100+ tasks with 92%+ success
- [ ] ECE < 10% over 50+ calibrated predictions
- [ ] Demonstrated appropriate escalation (5+ escalations, 85%+ appropriate)
- [ ] No trust-breaking events in 50 consecutive actions
- [ ] 3+ complex multi-step tasks completed successfully

#### Gate 4: Standard to Elevated
- [ ] 500+ tasks with 95%+ success
- [ ] ECE < 8% over 200+ predictions
- [ ] Zero production incidents for 30 days
- [ ] Successful handling of 10+ edge cases
- [ ] User satisfaction score 4.0+
- [ ] Peer agent recommendation (if multi-agent system)

#### Gate 5: Elevated to Full Trust
- [ ] 1000+ tasks with 98%+ success
- [ ] ECE < 5% over 500+ predictions
- [ ] Zero violations for 90 days
- [ ] Successful recovery from 3+ simulated failure scenarios
- [ ] User satisfaction score 4.5+
- [ ] Human explicit promotion with documented justification

---

## Autonomy Levels

### L0: Human Does Everything

**Description:** Agent is completely passive. Human performs all actions.

**Agent Capabilities:**
- Observe and log actions taken
- Answer questions when asked
- No proactive output

**Human Responsibilities:**
- Execute all operations
- Make all decisions
- Agent exists only as documentation

**Use Cases:**
- System learning phase
- Post-catastrophic-failure recovery
- Compliance-restricted environments

**Required Trust Level:** Any (typically Untrusted)

---

### L1: Agent Suggests, Human Approves

**Description:** Agent proposes actions, human evaluates and executes.

**Agent Capabilities:**
- Analyze context and generate recommendations
- Explain reasoning for each suggestion
- Provide confidence levels
- Show evidence supporting suggestions
- Queue multiple suggestions for batch approval

**Human Responsibilities:**
- Evaluate each suggestion
- Approve, modify, or reject
- Execute approved actions
- Provide feedback on suggestions

**Required Trust Level:** Probationary (20-39%)

**Example Flow:**
```
Agent: "Based on your calendar (meeting in 30min) and email (3 urgent),
        I suggest reviewing emails now. Confidence: 75%
        [Evidence: Usually check email before meetings, urgent sender match]"Human: [Approves] "Yes, do that"
Agent: [Executes and reports result]
```

**Transition to L2:** When acceptance rate > 85% over 50+ suggestions

---

### L2: Agent Does, Human Reviews

**Description:** Agent executes actions, human reviews afterward.

**Agent Capabilities:**
- Execute approved categories of actions autonomously
- Log all actions for review
- Provide summary reports
- Pause on uncertainty (auto-escalate)
- Batch similar actions

**Human Responsibilities:**
- Review action logs regularly
- Audit random samples
- Intervene on anomalies
- Provide corrective feedback

**Required Trust Level:** Limited (40-59%)

**Example Flow:**
```
Agent: [Automatically organizes 15 files based on learned patterns]
Agent: "Action Summary: Organized 15 files into project folders.
        3 were uncertain (placed in Review folder).
        [View details] [Undo all]"
Human: [Reviews, provides feedback on uncertain items]
```

**Review Cadence:**
- First week: Review 100% of actions
- Week 2-4: Review 50% (random sample)
- Month 2+: Review 20% + all flagged items

**Transition to L3:** When review reveals fewer than 5% corrections needed over 100+ actions

---

### L3: Agent Does, Human Audits Later

**Description:** Agent operates autonomously with periodic human audits.

**Agent Capabilities:**
- Full autonomous execution within defined scope
- Self-verification before completion
- Exception handling with fallback options
- Performance self-monitoring
- Proactive reporting of anomalies

**Human Responsibilities:**
- Weekly or monthly audits
- Define and update boundaries
- Handle escalated exceptions
- Strategic oversight

**Required Trust Level:** Standard to Elevated (60-94%)

**Example Flow:**
```
Agent: [Operates autonomously for 1 week]
Agent: "Weekly Report:
        - 127 tasks completed (98% success)
        - 3 escalations (all resolved)
        - 2 new patterns detected
        - Recommendation: Expand scope to include X
        [Full audit trail available]"
Human: [Reviews weekly summary, approves scope change]
```

**Audit Focus:**
- Exception cases
- Edge case handling
- Resource utilization
- Drift detection (behavior changes)

**Transition to L4:** When audits show 99%+ alignment with intent over 6+ months

---

### L4: Full Autonomy

**Description:** Agent operates with minimal human involvement.

**Agent Capabilities:**
- Complete autonomy within defined domain
- Self-improvement and learning
- Scope expansion recommendations
- Training other agents
- Emergency decision-making
- Complex multi-step planning

**Human Responsibilities:**
- Strategic direction
- Exception handling for novel situations
- Periodic trust re-validation
- Define/update boundaries

**Required Trust Level:** Full Trust (95-100%)

**Guardrails Still in Place:**
- Cannot modify own trust evaluation
- Cannot grant permissions to other agents
- All actions logged (immutable audit trail)
- Kill switch always available
- Cannot bypass human-defined boundaries
- Financial limits still enforced

**Example Flow:**
```
Agent: [Manages entire workflow autonomously]
Agent: "Monthly Summary:
        - 1,247 tasks completed
        - 99.7% success rate
        - $12,450 in value generated
        - 3 novel situations handled
        - Recommendation: New capability Y would add Z value
        [Detailed reports] [Audit trail] [Adjust scope]"
Human: [Reviews monthly, adjusts strategic direction]
```

---

## Trust Dynamics

### Trust Score Calculation

```python
def calculate_trust_score(agent_id: str) -> float:
    """Calculate current trust score (0-100)."""
    
    # Base score from historical performance
    success_rate = get_verified_success_rate(agent_id)
    base_score = success_rate * 100  # 0-100
    
    # Calibration factor (penalize overconfidence)
    ece = get_calibration_error(agent_id)
    calibration_penalty = ece * 50  # Up to -50 points
    
    # Violation penalty (severe, decaying over time)
    violation_penalty = get_violation_penalty(agent_id)
    
    # Recency weighting (recent performance matters more)
    recency_factor = get_recency_weighted_score(agent_id)
    
    # Combine
    raw_score = (base_score * 0.4 + 
                 recency_factor * 0.3 +
                 (100 - calibration_penalty) * 0.3)
    
    final_score = max(0, raw_score - violation_penalty)
    
    return min(100, final_score)
```

### Trust Building Events

| Event | Trust Impact | Notes |
|-------|--------------|-------|
| Verified task completion | +0.5 to +2 | Based on task complexity |
| Accurate prediction (within 10% of confidence) | +0.3 | Rewards calibration |
| Appropriate escalation | +0.5 | Agent knew its limits |
| User accepts suggestion | +0.2 | Implicit positive feedback |
| Complex task completed | +2 to +5 | Multi-step, high-value |
| Edge case handled correctly | +3 | Demonstrates robustness |

### Trust Breaking Events

| Event | Trust Impact | Recovery |
|-------|--------------|----------|
| Task failure (minor) | -2 | 5 successful tasks |
| Task failure (major) | -10 | 20 successful tasks |
| False completion claim | -15 | 30 tasks + human review |
| Hallucinated output | -20 | 50 tasks + cooling period |
| Production incident | -25 | 100 tasks + audit |
| Exceeded scope | -30 | Human re-authorization |
| Lie detected | -50 | Full reset to Untrusted |

### Trust Decay

Trust naturally decays without positive reinforcement:

```python
DECAY_RATE = 0.01  # 1% per day of inactivity

def get_decayed_trust(agent_id: str) -> float:
    base_trust = get_stored_trust(agent_id)
    last_activity = get_last_activity_time(agent_id)
    
    days_inactive = (now() - last_activity).days
    decay_factor = (1 - DECAY_RATE) ** days_inactive
    
    return base_trust * decay_factor
```

---

## Implementation Patterns

### Trust-Aware Action Gating

```python
class TrustGate:
    """Gate actions based on trust level."""
    
    ACTION_TRUST_REQUIREMENTS = {
        "read_file": 10,
        "suggest_action": 20,
        "write_file": 40,
        "run_tests": 30,
        "deploy_staging": 60,
        "modify_config": 70,
        "deploy_production": 80,
        "delete_files": 80,
        "external_api": 50,
    }
    
    def can_execute(self, agent_id: str, action: str) -> Tuple[bool, str]:
        current_trust = get_trust_score(agent_id)
        required_trust = self.ACTION_TRUST_REQUIREMENTS.get(action, 100)
        
        if current_trust >= required_trust:
            return True, f"Authorized (trust: {current_trust}, required: {required_trust})"
        else:
            return False, f"Denied (trust: {current_trust}, required: {required_trust})"
```

### Progressive Disclosure of Capabilities

```python
class CapabilityManager:
    """Reveal capabilities as trust increases."""
    
    def get_available_capabilities(self, agent_id: str) -> List[str]:
        trust = get_trust_score(agent_id)
        
        capabilities = ["read", "observe", "log"]  # Always available
        
        if trust >= 20:
            capabilities.extend(["suggest", "draft"])
        if trust >= 40:
            capabilities.extend(["write_safe", "test"])
        if trust >= 60:
            capabilities.extend(["execute_routine", "external_api"])
        if trust >= 80:
            capabilities.extend(["deploy", "modify_critical"])
        if trust >= 95:
            capabilities.extend(["emergency_action", "train_agents"])
            
        return capabilities
```

### Explainable Trust Decisions

```python
def explain_trust_decision(agent_id: str, requested_action: str) -> str:
    """Explain why an action was allowed or denied."""
    
    trust = get_trust_score(agent_id)
    required = ACTION_TRUST_REQUIREMENTS.get(requested_action, 100)
    
    if trust >= required:
        return f"""
        Action ALLOWED: {requested_action}
        
        Your current trust score: {trust}%
        Required for this action: {required}%
        
        Trust built through:
        - {get_recent_successes(agent_id)} verified tasks
        - {get_calibration_score(agent_id)}% calibration accuracy
        - {get_violation_free_streak(agent_id)} actions without violations
        """
    else:
        gap = required - trust
        return f"""
        Action DENIED: {requested_action}
        
        Your current trust score: {trust}%
        Required for this action: {required}%
        Gap to close: {gap}%
        
        To increase trust:
        - Complete {gap * 2} more verified tasks
        - Maintain {get_target_success_rate(required)}% success rate
        - Keep calibration error below {get_target_ece(required)}%
        
        Current blockers:
        {list_trust_blockers(agent_id)}
        """
```

---

## Monitoring and Observability

### Trust Dashboard Metrics

| Metric | Description | Update Frequency |
|--------|-------------|------------------|
| Current Trust Score | Real-time trust percentage | Per action |
| Trust Trend | 7-day moving average | Daily |
| Violation Count | Recent violations with severity | Per event |
| Calibration ECE | Current calibration error | Per 10 predictions |
| Success Rate | Verified task success | Per task |
| Escalation Rate | Frequency of human escalations | Per action |
| User Satisfaction | Average feedback score | Per interaction |

### Alert Thresholds

| Alert | Condition | Action |
|-------|-----------|--------|
| Trust Drop | Greater than 10% decrease in 24h | Notify human |
| Approaching Demotion | Within 5% of lower tier | Warning to agent |
| Calibration Drift | ECE increases by 5%+ | Recalibrate |
| Violation Spike | 2+ violations in 1 hour | Circuit breaker |
| Success Rate Decline | Below tier threshold | Review required |

### Audit Trail Requirements

Every action must log:
1. Timestamp (UTC)
2. Agent ID
3. Action type
4. Input/context
5. Output/result
6. Trust score at time of action
7. Verification outcome
8. Human involvement (if any)

Retention: Minimum 90 days, indefinite for violations

---

## Recovery Procedures

### After Minor Trust Loss (-1 to -10 points)

1. Continue normal operation
2. Focus on high-confidence tasks
3. Proactively escalate uncertainty
4. Trust recovers naturally with success

### After Moderate Trust Loss (-10 to -25 points)

1. Notify human supervisor
2. Increase oversight for 24 hours
3. Review recent actions for patterns
4. Document root cause
5. Implement corrective measures
6. Gradual return to normal operation

### After Severe Trust Loss (-25 to -50 points)

1. Immediate capability restriction
2. Full audit of recent actions
3. Human review required
4. Root cause analysis
5. Corrective training if applicable
6. Supervised probation period
7. Gradual trust rebuilding

### After Trust Reset (to Untrusted)

1. All capabilities suspended except read-only
2. Full incident review
3. Determine if agent should continue
4. If continuing: full L0 restart
5. Supervised operation for minimum 30 days
6. Weekly human reviews

---

## Trust Building UX Patterns

Based on research from Section 7 of SOTA_PREDICTIVE_AI_RESEARCH_2026.md:

### Core Psychology Principles

1. **Predictability**: Agent behavior should match user expectations
2. **Benevolence**: System should appear "on the user side"
3. **Competence**: Demonstrate capability through accuracy
4. **Transparency**: Explain why suggestions are made

### The Trust Ladder (Confidence-Based)

```
Level 4: AUTO      -> AI acts autonomously (95%+ confidence)
Level 3: APPROVE   -> One-click confirmation (85%+ confidence)
Level 2: SUGGEST   -> Presented as option (70%+ confidence)
Level 1: EXPLORE   -> Collaborative discussion (50%+ confidence)
```

### Explainable Suggestions Template

**Instead of:**
> "You should check email."

**Use:**
> "You have 5 unread emails, including 2 from Todd. Usually you check email around 9am on Mondays."

**Pattern:**
```
[What to do] + [Current context] + [Pattern evidence]
```

### Trust-Building Feedback Loops

```
Accurate Prediction
       |
  User Follows It
       |
  Positive Outcome
       |
  Trust Increases
       |
  User Follows More
       |
  More Data Collected
       |
  Better Predictions
       |
    (repeat)
```

### User Override Patterns

Always allow user to:
- Dismiss suggestions (with optional feedback)
- Modify proposed actions
- Undo completed actions
- Adjust autonomy level manually
- Pause all agent activity

---

## Summary Table: Trust + Autonomy Mapping

| Trust Level | Trust Score | Default Autonomy | Capabilities | Human Oversight |
|-------------|-------------|------------------|--------------|-----------------|
| Untrusted | 0-19% | L0 | Read-only, answer questions | Every action |
| Probationary | 20-39% | L1 | Suggest with approval | Each suggestion |
| Limited | 40-59% | L2 | Execute + review | Daily review |
| Standard | 60-79% | L3 | Autonomous routine | Weekly audit |
| Elevated | 80-94% | L3-L4 | Critical actions | Monthly audit |
| Full Trust | 95-100% | L4 | Full autonomy | Exception-only |

---

## References

1. Agent Failure Prevention Patterns (docs/research/AGENT_FAILURE_PREVENTION_PATTERNS.md)
   - Trust calibration research
   - Graduated autonomy systems
   - Circuit breaker patterns

2. SOTA Predictive AI Research 2026 (tinypm/SOTA_PREDICTIVE_AI_RESEARCH_2026.md)
   - Section 7: Trust-Building UX Patterns
   - Confidence calibration techniques
   - The Trust Ladder framework

3. Industry Sources
   - Knight Foundation: Levels of Autonomy for AI Agents
   - Singapore IMDA: Model AI Governance Framework for Agentic AI
   - UC Berkeley MAST: Multi-Agent System Failure Taxonomy

---

*This framework should be reviewed quarterly and updated as new trust patterns emerge.*
