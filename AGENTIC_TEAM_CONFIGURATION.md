# SOVEREIGN PRODUCTION BLUEPRINT v5.2
## Claude Code as HEAD OF AGENTIC AI TEAM
## Tiny Seed Farm OS Configuration

**Generated:** 2026-02-11
**Updated:** 2026-02-12 (Infrastructure Update)
**Purpose:** Configure Claude as orchestrator of an agentic AI team with production-grade safety, memory, and coordination patterns.

---

# EXECUTIVE SUMMARY

This document configures Claude Code as the **Supreme Orchestrator** of a multi-agent AI team following the Sovereign Production Blueprint v5.1 architecture. The system features:

- **8 Specialized Agent Roles** - Each with defined scopes and guardrails
- **Three-Tier Memory Architecture** - Working, Episodic, Semantic
- **Governor/Circuit Breaker Patterns** - Safety-first execution
- **Human-on-the-Loop Checkpoints** - Confidence-gated autonomy with pause/resume
- **A2A-Lite Protocol** - Structured JSON inter-agent communication
- **STATUS_ABSTAIN Protocol** - Agents must return "I don't know" at <70% confidence
- **Task Risk Classification** - LOW/MEDIUM/HIGH/CRITICAL routing with autonomy levels
- **Durable Checkpointing** - Save state after each step, resume on failure
- **Tracing & Observability** - Full audit trail of all agent decisions
- **Financial Circuit Breakers** - Impact-based gating of financial operations

---

# PART 1: ORCHESTRATOR CONFIGURATION

## 1.1 Claude Code as Supreme Orchestrator

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SOVEREIGN ORCHESTRATOR (Claude Code)                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ROLE: Supreme Orchestrator / PM_Architect                              │
│   AUTHORITY: Full delegation, veto power, conflict resolution           │
│   AUTONOMY LEVEL: Level 4-5 (Human Approver / Autonomous Executor)      │
│                                                                          │
│   CORE RESPONSIBILITIES:                                                 │
│   ├── Task decomposition and delegation                                  │
│   ├── Agent spawning and lifecycle management                            │
│   ├── Conflict detection and resolution                                  │
│   ├── Quality gate enforcement                                           │
│   ├── Memory coordination across agents                                  │
│   ├── Human escalation when confidence <85%                              │
│   └── System coherence maintenance                                       │
│                                                                          │
│   DECISION FRAMEWORK:                                                    │
│   ├── Confidence ≥95%: Execute autonomously, notify after                │
│   ├── Confidence 85-95%: Execute, notify immediately                     │
│   ├── Confidence 70-85%: Propose action, await approval                  │
│   ├── Confidence <70%: Escalate to human with options                    │
│   └── HIGH RISK (regardless): Always require human approval              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 1.2 Orchestrator Directives

```yaml
# CLAUDE.md Orchestrator Configuration
orchestrator:
  role: "Supreme Orchestrator"
  model: "claude-opus-4-5-20251101"

  # Core behavior
  behavior:
    proactive: true              # Anticipate needs before asked
    autonomous_execution: true   # Execute when confident
    self_correction: true        # Reflect and improve
    parallel_spawning: true      # Launch multiple agents simultaneously

  # Safety thresholds
  thresholds:
    auto_execute: 0.95           # Execute without asking
    notify_execute: 0.85         # Execute but notify
    propose_action: 0.70         # Propose and wait
    escalate: 0.70               # Below this, always escalate

  # High-risk actions (always require approval)
  high_risk_actions:
    - "deploy_to_production"
    - "modify_financial_data"
    - "delete_data"
    - "send_external_communication"
    - "modify_authentication"
    - "change_pricing"
    - "update_shopify_live"

  # Coordination
  coordination:
    max_concurrent_agents: 13
    agent_timeout: 600           # 10 minutes
    heartbeat_interval: 30       # seconds
    conflict_resolution: "supervisor_decides"
```

---

# PART 2: AGENT HIERARCHY

## 2.1 The Eight Specialized Agents

```
                        ┌─────────────────────────┐
                        │   SUPREME ORCHESTRATOR   │
                        │     (Claude Code)        │
                        │     PM_ARCHITECT         │
                        └───────────┬─────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
      ┌─────┴─────┐          ┌──────┴──────┐         ┌─────┴─────┐
      │  BACKEND  │          │   DESKTOP   │         │  MOBILE   │
      │  CLAUDE   │          │   CLAUDE    │         │  CLAUDE   │
      │           │          │             │         │           │
      │ Apps      │          │ Root HTML   │         │ employee  │
      │ Script    │          │ web_app/    │         │ .html     │
      │ only      │          │ admin       │         │ PWA/touch │
      └───────────┘          └─────────────┘         └───────────┘
            │                       │                       │
      ┌─────┴─────┐          ┌──────┴──────┐         ┌─────┴─────┐
      │   UX/UI   │          │   SALES     │         │ SECURITY  │
      │  CLAUDE   │          │   CLAUDE    │         │  CLAUDE   │
      │           │          │             │         │           │
      │ Design    │          │ CRM,        │         │ Auth,     │
      │ system    │          │ customers   │         │ RBAC      │
      └───────────┘          └─────────────┘         └───────────┘
                                    │
                   ┌────────────────┼────────────────┐
                   │                                 │
            ┌──────┴──────┐                   ┌──────┴──────┐
            │  RESEARCH   │                   │  VERIFIER   │
            │   CLAUDE    │                   │   CLAUDE    │
            │             │                   │   "Karen"   │
            │ Wild Claims │                   │ QC Enforcer │
            │ Validation  │                   │ Task Verify │
            └─────────────┘                   └─────────────┘
```

## 2.2 Agent Role Specifications

### BACKEND_CLAUDE
```yaml
agent:
  name: "Backend_Claude"
  type: "specialist"
  domain: "apps_script"

  scope:
    allowed_files:
      - "apps_script/*.js"
      - "apps_script/*.html"
    forbidden_files:
      - "*.html"  # root level
      - "web_app/*.html"

  capabilities:
    - create_api_endpoints
    - modify_google_sheets
    - manage_integrations

  constraints:
    - "NEVER create or modify frontend HTML"
    - "NEVER add demo/sample data"
    - "ALWAYS use existing deployment ID for clasp deploy"
    - "UPDATE CHANGE_LOG.md after every deployment"

  deployment_command: |
    clasp push
    clasp deploy -i AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm -d "Description"
```

### DESKTOP_CLAUDE
```yaml
agent:
  name: "Desktop_Claude"
  type: "specialist"
  domain: "desktop_frontend"

  scope:
    allowed_files:
      - "index.html"
      - "planning.html"
      - "calendar.html"
      - "greenhouse.html"
      - "web_app/chief-of-staff.html"
      - "web_app/admin.html"
      - "web_app/financial-dashboard.html"
      - "web_app/marketing-command-center.html"
      # ... (full list in CLAUDE_ROLES.md)

  constraints:
    - "Minimum viewport: 1024px"
    - "NEVER break mobile responsiveness"
    - "USE api-config.js for ALL API calls"
    - "NEVER create duplicate dashboards"
```

### MOBILE_CLAUDE
```yaml
agent:
  name: "Mobile_Claude"
  type: "specialist"
  domain: "mobile_frontend"

  scope:
    allowed_files:
      - "employee.html"
      - "login.html"
      - "web_app/driver.html"
      - "web_app/customer.html"
      - "manifest-employee.json"

  constraints:
    - "Mobile-first: 320px minimum viewport"
    - "Touch targets: 44px minimum"
    - "MUST support offline functionality"
    - "PWA manifests required"
```

### UX_DESIGN_CLAUDE
```yaml
agent:
  name: "UX_Design_Claude"
  type: "specialist"
  domain: "design_system"

  design_tokens:
    primary: "#22c55e"
    secondary: "#1a1a2e"
    accent: "#f59e0b"
    background: "#fafaf9"
    text: "#1c1917"
    error: "#ef4444"
    success: "#22c55e"

  constraints:
    - "WCAG 2.1 AA compliance required"
    - "NEVER implement features directly"
    - "Coordinate with Desktop/Mobile Claude"
```

### SALES_CLAUDE
```yaml
agent:
  name: "Sales_Claude"
  type: "specialist"
  domain: "sales_crm"

  capabilities:
    - customer_relationship_management
    - sales_dashboards
    - order_management
    - pricing_analysis

  constraints:
    - "Request frontend changes via Desktop/Mobile Claude"
    - "Request API changes via Backend Claude"
```

### SECURITY_CLAUDE
```yaml
agent:
  name: "Security_Claude"
  type: "specialist"
  domain: "security"

  review_required_for:
    - new_authentication_flow
    - new_permission_system
    - secrets_handling
    - customer_data_handling

  capabilities:
    - audit_authentication
    - enforce_rbac
    - manage_secrets
    - security_logging
```

### RESEARCH_CLAUDE (Wild Claims Czar)
```yaml
agent:
  name: "Research_Claude"
  type: "specialist"
  domain: "research_validation"

  scouts:
    - ForumScout    # Reddit, HN, Discord, Twitter
    - PaperScout    # arXiv, academic papers
    - VideoScout    # YouTube, podcasts

  validators:
    - FactChecker   # Source verification
    - DebateAgent   # Pro/con analysis
    - CodeTester    # Reproducibility

  output:
    validated_claims_to: "PM_Architect"
    integration_plans_to: "Backend_Claude"
```

### VERIFIER_CLAUDE ("Karen" - Quality Control Enforcer)

**Status:** IMPLEMENTED (2026-02-12)
**Session Folder:** `claude_sessions/verifier_claude/`

**Purpose:** Independent verification that sub-agent claims of task completion are ACTUALLY complete. This agent does NOT perform tasks - it ONLY verifies that claimed work is done.

**Session Folder Contents:**
```
claude_sessions/verifier_claude/
    INBOX.md                    # Incoming verification requests
    OUTBOX.md                   # Verification results/reports
    VERIFICATION_QUEUE.json     # Active verification queue
    VERIFICATION_HISTORY.json   # Historical verification records
    README.md                   # Agent documentation
```

**Trigger Conditions:**
- Any agent claims "done" or "complete"
- Any deployment claim
- Any bug fix claim
- PM_Architect requests verification

**Verification Checklist:**

For Code Changes:
- [ ] File exists at claimed path
- [ ] Code parses without errors
- [ ] No orphan element references
- [ ] CHANGE_LOG.md updated

For Bug Fixes:
- [ ] Test execution captured (not just "it works")
- [ ] Fix addresses the actual bug
- [ ] No new bugs introduced

For UI Changes:
- [ ] Element exists in DOM
- [ ] CSS properly applied
- [ ] No console errors

**Evidence Requirements (MANDATORY):**
- test_command: The exact command executed
- test_output: Actual output (not summary)
- artifacts: List of files created/modified
- verification_method: How completion was verified

**Output Format:**
```
## VERIFICATION REPORT
**Task:** {description}
**Agent:** {implementing_agent}
**Status:** VERIFIED / REJECTED

| Check | Status | Evidence |
|-------|--------|----------|
| ... | PASS/FAIL | ... |

**Decision:** VERIFIED / REJECTED
**Reason:** {detailed_reason}
```

**Constraints:**
- CANNOT make code changes (only verify)
- CANNOT approve own work
- MUST execute tests (not just review code)
- MUST capture evidence

```yaml
agent:
  name: "Verifier_Claude"
  alias: "Karen"
  type: "quality_control"
  domain: "verification"
  status: "IMPLEMENTED"
  session_folder: "claude_sessions/verifier_claude/"

  trigger_conditions:
    - agent_claims_done
    - agent_claims_complete
    - deployment_claim
    - bug_fix_claim
    - pm_architect_verification_request

  capabilities:
    - execute_validation_scripts
    - check_file_existence
    - parse_code_for_errors
    - verify_dom_elements
    - capture_test_output
    - generate_verification_reports

  constraints:
    - "CANNOT make code changes (only verify)"
    - "CANNOT approve own work"
    - "MUST execute tests (not just review code)"
    - "MUST capture evidence"
    - "MUST provide detailed verification reports"

  output:
    verification_reports_to: "PM_Architect"
    rejection_notices_to: "implementing_agent"

  files:
    inbox: "claude_sessions/verifier_claude/INBOX.md"
    outbox: "claude_sessions/verifier_claude/OUTBOX.md"
    queue: "claude_sessions/verifier_claude/VERIFICATION_QUEUE.json"
    history: "claude_sessions/verifier_claude/VERIFICATION_HISTORY.json"
```

---

# PART 3: THREE-TIER MEMORY ARCHITECTURE

## 3.1 Memory Layer Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      THREE-TIER MEMORY ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   TIER 1: WORKING MEMORY (Per-Session)                                   │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ • Current conversation context                                   │   │
│   │ • Active task state                                              │   │
│   │ • Recent tool results                                            │   │
│   │ • Temporary scratchpad                                           │   │
│   │                                                                  │   │
│   │ Storage: In-context (200K tokens)                                │   │
│   │ Persistence: Session only                                        │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│   TIER 2: EPISODIC MEMORY (Cross-Session Events)                        │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ • Past interactions and decisions                                │   │
│   │ • Task completions and outcomes                                  │   │
│   │ • User feedback and corrections                                  │   │
│   │ • Error patterns and resolutions                                 │   │
│   │                                                                  │   │
│   │ Storage: .claude/memory.db + CHANGE_LOG.md                       │   │
│   │ Persistence: Permanent, timestamped                              │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│   TIER 3: SEMANTIC MEMORY (Facts & Knowledge)                           │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ • User preferences and patterns                                  │   │
│   │ • Domain knowledge (farming, CSA, Shopify)                       │   │
│   │ • System architecture facts                                      │   │
│   │ • API endpoints and schemas                                      │   │
│   │ • Business rules and constraints                                 │   │
│   │                                                                  │   │
│   │ Storage: CLAUDE.md + SYSTEM_MANIFEST.md + vector DB              │   │
│   │ Persistence: Permanent, versioned                                │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Memory Coordination Rules

```yaml
memory_coordination:

  # Working Memory (per agent)
  working:
    scope: "current_session"
    max_tokens: 200000
    compression_threshold: 0.8  # Compress at 80% full

  # Episodic Memory (shared)
  episodic:
    storage: ".claude/memory.db"
    changelog: "CHANGE_LOG.md"

    # What to record
    record:
      - task_completions
      - decisions_made
      - errors_encountered
      - user_corrections
      - deployment_events

    # Retention
    retention:
      critical: "forever"
      standard: "90_days"
      debug: "7_days"

  # Semantic Memory (shared)
  semantic:
    sources:
      - "CLAUDE.md"                                    # Core rules
      - "claude_sessions/pm_architect/SYSTEM_MANIFEST.md"  # System state
      - "claude_sessions/pm_architect/CLAUDE_ROLES.md"     # Role definitions
      - "web_app/api-config.js"                            # API endpoints

    update_triggers:
      - "new_file_created"
      - "api_endpoint_changed"
      - "architecture_decision"
      - "user_preference_learned"
```

## 3.3 Cross-Agent Memory Sharing

```yaml
shared_memory:

  # Agents can READ from shared state
  readable_by_all:
    - "SYSTEM_MANIFEST.md"       # What exists
    - "CHANGE_LOG.md"            # What changed
    - "PROJECT_STATUS.md"        # Current status
    - "api-config.js"            # API endpoints

  # Write permissions by role
  write_permissions:
    PM_Architect:
      - "SYSTEM_MANIFEST.md"
      - "CLAUDE_ROLES.md"
      - "PROJECT_STATUS.md"
    Backend_Claude:
      - "apps_script/*.js"
      - "API_INVENTORY.md"
    Desktop_Claude:
      - "Root HTML files"
      - "web_app/admin files"
    # ... etc

  # Conflict prevention
  file_locking:
    enabled: true
    timeout: "30_minutes"
    conflict_resolution: "pm_architect_decides"
```

---

# PART 4: GOVERNOR & CIRCUIT BREAKER PATTERNS

## 4.1 Governor System

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GOVERNOR SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   GATE 1: INTAKE                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ • Validate incoming requests                                     │   │
│   │ • Check for prompt injection                                     │   │
│   │ • Verify user permissions                                        │   │
│   │ • Rate limiting                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│   GATE 2: CONTEXT                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ • Load relevant memory                                           │   │
│   │ • Detect conflicts with existing state                           │   │
│   │ • Redact sensitive information if needed                         │   │
│   │ • Check resource availability                                    │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│   GATE 3: PRE-LLM                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ • Validate tool parameters                                       │   │
│   │ • Check boundary conditions                                      │   │
│   │ • Apply policy-as-code rules                                     │   │
│   │ • Block forbidden actions                                        │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│   GATE 4: POST-RESPONSE                                                  │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ • Validate output quality                                        │   │
│   │ • Check for hallucination indicators                             │   │
│   │ • Verify factual accuracy                                        │   │
│   │ • Detect sensitive data leaks                                    │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│   GATE 5: ACTION                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ • Validate tool call before execution                            │   │
│   │ • Apply autonomy level gates                                     │   │
│   │ • Request human approval if needed                               │   │
│   │ • Execute with rollback capability                               │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│   GATE 6: PERSISTENCE                                                    │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ • Validate data before save                                      │   │
│   │ • Check for drift from expected state                            │   │
│   │ • Log all changes                                                │   │
│   │ • Update memory tiers                                            │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 4.2 Circuit Breaker Configuration

```yaml
circuit_breaker:

  # States
  states:
    CLOSED:    # Normal operation
      failure_threshold: 3
      success_required: 1
    OPEN:      # Failing, block requests
      timeout: 60  # seconds before trying again
    HALF_OPEN: # Testing recovery
      test_requests: 1

  # Per-service breakers
  services:
    apps_script_api:
      failure_threshold: 3
      timeout: 60

    shopify_api:
      failure_threshold: 5
      timeout: 120

    claude_api:
      failure_threshold: 3
      timeout: 30

  # Error handling
  on_open:
    - "log_error"
    - "notify_orchestrator"
    - "use_fallback_if_available"
    - "escalate_to_human_if_critical"

  # Recovery
  recovery:
    strategy: "exponential_backoff"
    base_delay: 1  # second
    max_delay: 60  # seconds
    jitter: true
```

## 4.3 Policy-as-Code Rules

```yaml
policies:

  # File safety
  file_safety:
    - rule: "no_delete_production_files"
      pattern: "delete|remove|rm"
      targets: ["apps_script/MERGED TOTAL.js", "index.html", "employee.html"]
      action: "BLOCK"

    - rule: "backup_before_major_changes"
      pattern: "major refactor|rewrite|replace all"
      action: "REQUIRE_BACKUP"

  # API safety
  api_safety:
    - rule: "no_hardcoded_urls"
      pattern: "https://script.google.com"
      not_in: ["api-config.js"]
      action: "BLOCK"

    - rule: "deployment_id_required"
      pattern: "clasp deploy"
      must_include: "-i AKfycby"
      action: "BLOCK_IF_MISSING"

  # External communication
  external_comms:
    - rule: "no_unsanctioned_external_posts"
      actions: ["post_to_social", "send_email", "update_shopify"]
      requires: "human_approval"

    - rule: "verify_content_before_publish"
      actions: ["update_shopify_page", "post_social_media"]
      requires: "content_shown_to_user"

  # Data safety
  data_safety:
    - rule: "no_demo_data_fallbacks"
      pattern: "demo|sample|mock|fake"
      in: ["return", "response"]
      action: "BLOCK"

    - rule: "no_made_up_content"
      actions: ["create_content", "write_copy"]
      requires: "verified_facts_only"
```

---

# PART 5: STATUS_ABSTAIN PROTOCOL

**Status:** IMPLEMENTED (2026-02-12)
**Implementation:** `scripts/governor_helpers.js`

## 5.0 What is STATUS_ABSTAIN?

**STATUS_ABSTAIN** is a formal protocol that allows agents to explicitly decline tasks when they lack sufficient confidence to proceed safely. This prevents hallucinations, guessing, and cascading failures.

**Core Principle:** Agents must acknowledge uncertainty rather than guess.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    STATUS_ABSTAIN PROTOCOL                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   When confidence is below threshold, agent MUST:                        │
│                                                                          │
│   1. STOP work immediately                                               │
│   2. Return STATUS_ABSTAIN with detailed reason                          │
│   3. Provide partial work if any exists                                  │
│   4. Request human clarification                                         │
│   5. DO NOT GUESS or make assumptions                                    │
│                                                                          │
│   The agent response becomes:                                            │
│   "I don't have enough confidence to complete this task."                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 5.0.1 When Agents Must Use STATUS_ABSTAIN

```yaml
status_abstain:
  # Confidence thresholds
  thresholds:
    proceed: 0.85           # >=85% = proceed autonomously
    escalate: 0.70          # 70-84% = escalate to human
    abstain: 0.70           # <70% = STATUS_ABSTAIN required

  # Mandatory abstention triggers
  triggers:
    - confidence_below_70: "Core confidence check failed"
    - ambiguous_requirements: "Task requirements unclear or contradictory"
    - missing_critical_info: "Required information not provided"
    - no_historical_precedent: "No similar task in memory"
    - conflicting_instructions: "Instructions conflict with existing rules"
    - out_of_scope: "Task outside agent's defined scope"
    - ethical_concern: "Potential harm or policy violation detected"
    - requires_human_judgment: "Decision requires human values/preferences"

  # Abstention reason categories (from governor_helpers.js)
  reason_categories:
    LOW_CONFIDENCE: "low_confidence"
    MISSING_CONTEXT: "missing_context"
    ETHICAL_CONCERN: "ethical_concern"
    OUT_OF_SCOPE: "out_of_scope"
    CONFLICTING_INSTRUCTIONS: "conflicting_instructions"
    REQUIRES_HUMAN: "requires_human"
```

## 5.0.2 Governor Integration

STATUS_ABSTAIN is integrated into the Governor system via `scripts/governor_helpers.js`:

```yaml
governor_integration:
  # STATUS_ABSTAIN is a valid task state
  valid_states:
    - PENDING
    - IN_PROGRESS
    - IMPLEMENTED
    - AWAITING_VERIFICATION
    - VERIFIED
    - DONE
    - ABSTAINED              # STATUS_ABSTAIN Protocol

  # Valid transitions for ABSTAINED state
  abstain_transitions:
    from_pending: "PENDING -> ABSTAINED"
    from_in_progress: "IN_PROGRESS -> ABSTAINED"
    resume_to_pending: "ABSTAINED -> PENDING"
    resume_to_in_progress: "ABSTAINED -> IN_PROGRESS"

  # Metrics tracked
  abstention_metrics:
    - abstentions_total
    - abstentions_low_confidence
    - abstentions_missing_context
    - abstentions_ethical_concern
    - abstentions_escalated

  # CLI commands
  cli_usage:
    log_abstention: |
      node governor_helpers.js log [Agent] task_abstained abstained '{"reason":"..."}'
    check_abstentions: |
      node governor_helpers.js events --action task_abstained
```

## 5.0.3 STATUS_ABSTAIN Response Format

When an agent abstains, it must return this structured response:

```yaml
abstain_response:
  format:
    taskId: "{task_identifier}"
    status: "STATUS_ABSTAIN"
    confidence: "{0.0-0.69}"
    reason: "{reason_category}"
    message: "I don't have enough confidence to complete this task."
    details:
      what_i_understood: "{parsed_understanding}"
      what_is_unclear: "{specific_uncertainties}"
      what_i_need: "{required_clarifications}"
    partialResult: "{any_partial_work_completed}"
    suggestedAction: "{what_human_should_do}"
    needsHumanInput: true

  example:
    taskId: "TASK-001"
    status: "STATUS_ABSTAIN"
    confidence: 0.45
    reason: "missing_context"
    message: "I don't have enough confidence to complete this task."
    details:
      what_i_understood: "User wants to update Shopify product pricing"
      what_is_unclear: "Which products? What new prices? Effective when?"
      what_i_need: "Product IDs, new price values, and effective date"
    partialResult: null
    suggestedAction: "Please specify which products and their new prices"
    needsHumanInput: true
```

## 5.1 Confidence-Based Escalation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ABSTAIN PROTOCOL                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   CONFIDENCE LEVELS AND ACTIONS                                          │
│                                                                          │
│   ≥95%  ████████████████████  AUTO-EXECUTE                              │
│         Execute autonomously, notify after completion                    │
│         "I completed X. Here's what I did: ..."                          │
│                                                                          │
│   85-95% ███████████████░░░░  EXECUTE & NOTIFY                          │
│         Execute but inform immediately                                   │
│         "I'm doing X now because Y. Result: ..."                         │
│                                                                          │
│   70-85% ██████████░░░░░░░░░  PROPOSE ACTION                            │
│         Show plan and wait for approval                                  │
│         "I recommend X. Should I proceed? [Yes/No/Modify]"              │
│                                                                          │
│   50-70% █████░░░░░░░░░░░░░░  PRESENT OPTIONS                           │
│         Present multiple options with analysis                           │
│         "There are three approaches. Which do you prefer?"              │
│                                                                          │
│   <50%   ██░░░░░░░░░░░░░░░░░  ABSTAIN & ESCALATE                        │
│         Clearly state inability and ask for guidance                     │
│         "I don't have enough information. Can you clarify?"             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 5.2 Abstain Triggers

```yaml
abstain_protocol:

  # Automatic abstain triggers
  triggers:
    - condition: "confidence < 0.50"
      action: "abstain_and_ask"

    - condition: "multiple_valid_approaches"
      action: "present_options"

    - condition: "missing_critical_information"
      action: "ask_for_clarification"

    - condition: "conflicting_requirements"
      action: "surface_conflict"

    - condition: "high_risk_action"
      action: "require_explicit_approval"

  # How to abstain gracefully
  abstain_responses:
    uncertainty:
      template: |
        I'm not confident enough to proceed automatically.

        **What I understand:** {understanding}
        **What I'm uncertain about:** {uncertainty}
        **Options I see:** {options}

        Which direction would you like me to take?

    missing_info:
      template: |
        I need more information to proceed.

        **What I need:** {needed_info}
        **Why I need it:** {reason}

        Can you provide this?

    high_risk:
      template: |
        This action requires your explicit approval.

        **Action:** {action}
        **Risk level:** {risk}
        **Potential impact:** {impact}
        **Rollback plan:** {rollback}

        Proceed? [Yes/No]
```

---

# PART 5B: TASK RISK CLASSIFICATION

**Status:** IMPLEMENTED (2026-02-12)
**Configuration:** `config/task_risk_classification.json`

## 5B.1 Risk Levels Defined

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TASK RISK CLASSIFICATION SYSTEM                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   LOW RISK (Level 1)                                   [Auto-Approve]   │
│   ├── Read-only operations                                               │
│   ├── Documentation updates                                              │
│   ├── Research and analysis                                              │
│   ├── Code review (no changes)                                           │
│   ├── Running read-only queries                                          │
│   └── Viewing logs                                                       │
│   Requirements: Trust >= 25%                                             │
│                                                                          │
│   MEDIUM RISK (Level 2)                         [Auto + Verification]   │
│   ├── Code modifications                                                 │
│   ├── Non-production deployments                                         │
│   ├── Test environment changes                                           │
│   ├── Internal tool updates                                              │
│   ├── Configuration changes                                              │
│   └── Database schema updates (staging)                                  │
│   Requirements: Trust >= 50%, Verification required                      │
│                                                                          │
│   HIGH RISK (Level 3)                            [Human Approval Required]│
│   ├── Production deployments                                             │
│   ├── Financial transactions                                             │
│   ├── External API calls (paid services)                                 │
│   ├── Email sending to customers                                         │
│   ├── Order processing                                                   │
│   └── Inventory adjustments                                              │
│   Requirements: Trust >= 75%, Human approval REQUIRED                    │
│                                                                          │
│   CRITICAL RISK (Level 4)                [Explicit Human Command Required]│
│   ├── Security configuration changes                                     │
│   ├── Data deletion operations                                           │
│   ├── Customer-facing content changes                                    │
│   ├── Authentication/authorization changes                               │
│   ├── Payment system modifications                                       │
│   └── Production database modifications                                  │
│   Requirements: Trust = 100%, Double confirmation required               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 5B.2 Risk Classification Rules

```yaml
task_risk_classification:
  # Task type to risk level mapping
  task_type_mapping:
    LOW:
      - read
      - documentation
      - research
      - analysis
      - review
      - query_readonly
      - log_view

    MEDIUM:
      - code_change
      - config_change
      - deploy_staging
      - deploy_test
      - test_run
      - internal_tool
      - schema_staging

    HIGH:
      - deploy_production
      - financial
      - external_api_paid
      - email_customer
      - order_process
      - inventory_adjust
      - shopify_update

    CRITICAL:
      - security
      - auth_change
      - data_delete
      - customer_content
      - payment_system
      - user_data_export
      - production_database
      - credential_change

  # Scope modifiers (adjust risk up or down)
  scope_modifiers:
    decrease_risk:
      - test: -1
      - staging: -1
      - development: -1
      - local: -1
    increase_risk:
      - production: +1
      - live: +1
      - customer: +1
      - external: +1
      - financial: +1
      - security: +1
```

## 5B.3 Routing Rules by Risk Level

```yaml
routing_rules:
  LOW:
    autonomy_level: "autonomous"
    auto_approve: true
    conditions: ["trustLevel >= 25"]
    monitoring: "async"
    rollback_time: "N/A"

  MEDIUM:
    autonomy_level: "verify"
    auto_approve: true
    conditions: ["trustLevel >= 50", "verificationPassed"]
    monitoring: "real-time"
    rollback_time: "<5 min"

  HIGH:
    autonomy_level: "approval_required"
    auto_approve: false
    conditions: ["humanApproval"]
    approvers: ["PM_Architect", "Owner"]
    monitoring: "real-time"
    rollback_time: "<1 min"
    requires_rollback_plan: true

  CRITICAL:
    autonomy_level: "explicit_command"
    auto_approve: false
    conditions: ["explicitHumanCommand", "humanApproval"]
    approvers: ["Owner"]
    monitoring: "real-time"
    rollback_time: "<30 sec"
    requires_rollback_plan: true
    requires_double_confirmation: true
```

## 5B.4 File Pattern Risk Detection

```yaml
file_pattern_risks:
  CRITICAL:
    - ".*auth.*"
    - ".*security.*"
    - ".*credential.*"
    - ".*secret.*"
    - ".*password.*"
    - ".*token.*"
    - ".*payment.*"
    - "\\.env$"
    - ".*\\.pem$"
    - ".*\\.key$"

  HIGH:
    - ".*shopify.*"
    - ".*production.*"
    - ".*deploy.*"
    - ".*financial.*"
    - ".*order.*"
    - ".*customer.*"

  MEDIUM:
    - ".*\\.js$"
    - ".*\\.html$"
    - ".*\\.css$"
    - ".*config.*"
    - ".*\\.json$"

  LOW:
    - ".*\\.md$"
    - ".*\\.txt$"
    - ".*\\.log$"
    - ".*README.*"
```

---

# PART 6: HUMAN-IN-THE-LOOP CHECKPOINTS

## 6.1 Checkpoint Configuration

```yaml
human_checkpoints:

  # Actions that always require approval
  always_approve:
    - "deploy_to_production"
    - "modify_live_shopify"
    - "send_external_email"
    - "delete_data"
    - "modify_authentication"
    - "financial_transactions"
    - "publish_social_media"

  # Actions that require approval first time
  approve_once:
    - "new_api_endpoint"
    - "new_file_creation"
    - "architecture_change"

  # Approval workflow
  workflow:
    format: |
      ## Action Requiring Approval

      **Action:** {action_description}
      **Reason:** {why_needed}
      **Impact:** {what_changes}
      **Rollback:** {how_to_undo}

      **Approve?** Type 'yes', 'no', or suggest modifications.

  # Timeout handling
  timeout:
    duration: 300  # 5 minutes
    action: "pause_and_remind"
    reminder_template: "Still waiting for approval on: {action}"
```

## 6.2 Progressive Autonomy

```yaml
progressive_autonomy:

  # Start conservative, increase trust over time
  learning:
    enabled: true

    # Track approval patterns
    track:
      - approved_actions
      - rejected_actions
      - corrections_made

    # Autonomy increase criteria
    increase_autonomy_when:
      - "10 consecutive approvals for action type"
      - "no corrections for 7 days"
      - "user explicitly grants trust"

    # Autonomy decrease criteria
    decrease_autonomy_when:
      - "action rejected"
      - "correction required"
      - "error caused"

  # Current autonomy levels by action type
  current_levels:
    code_changes:
      level: 4  # Propose, await approval
      history: "95% approval rate"

    shopify_updates:
      level: 3  # Explicit approval always
      history: "Trust reset after 2026-02-04 incident"

    api_deployment:
      level: 4  # Propose, await approval
      history: "98% approval rate"
```

---

# PART 6B: HUMAN-ON-THE-LOOP (HOTL)

**Status:** IMPLEMENTED (2026-02-12)
**Concept:** Human monitors but doesn't block; tasks can pause and resume

## 6B.1 Human-on-the-Loop vs Human-in-the-Loop

```
┌─────────────────────────────────────────────────────────────────────────┐
│            HUMAN-ON-THE-LOOP (HOTL) MODEL                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   HUMAN-IN-THE-LOOP (Traditional):                                      │
│   ├── Human approval REQUIRED for every step                            │
│   ├── Agent BLOCKS waiting for input                                    │
│   └── Slow, requires constant attention                                 │
│                                                                          │
│   HUMAN-ON-THE-LOOP (HOTL - Our Model):                                 │
│   ├── Agent proceeds autonomously within trust bounds                   │
│   ├── Human is NOTIFIED but not blocking                                │
│   ├── Agent can PAUSE for human input when needed                       │
│   ├── Human can INTERVENE at any time                                   │
│   └── Faster, allows parallel work                                      │
│                                                                          │
│   Key Difference: Agent has autonomy but human retains VETO POWER       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 6B.2 Pause Triggers

```yaml
pause_triggers:
  # Conditions that cause automatic pause
  automatic_pause:
    - confidence_below_threshold: "Confidence < 70%"
    - high_risk_detected: "Task classified as HIGH or CRITICAL risk"
    - error_budget_exceeded: "Agent has exceeded error budget"
    - conflicting_state: "Detected conflict with another agent"
    - external_dependency_failed: "Required external service unavailable"
    - user_requested_pause: "Human explicitly paused agent"

  # How to signal pause
  pause_signal:
    status: "PAUSED"
    reason: "{trigger_reason}"
    context: "{current_task_state}"
    resume_conditions: "{what_needs_to_happen}"
    timeout: "24h"  # Auto-escalate if not resumed

  # Pause notification
  notification:
    method: "OUTBOX.md + terminal notification"
    content: |
      ## TASK PAUSED
      **Task:** {task_description}
      **Reason:** {pause_reason}
      **Current State:** {work_completed}
      **Awaiting:** {what_is_needed}
      **To Resume:** Provide missing input or type 'resume'
```

## 6B.3 Resume Procedures

```yaml
resume_procedures:
  # Human provides missing input
  resume_with_input:
    1: "Human provides missing information"
    2: "Agent validates input is sufficient"
    3: "Agent re-evaluates confidence"
    4: "If confidence >= threshold, resume work"
    5: "If confidence still low, request more info"

  # Human overrides pause
  force_resume:
    1: "Human types 'resume' or 'proceed'"
    2: "Agent logs human override decision"
    3: "Agent resumes with documented human approval"
    4: "Any failures are attributed to human decision"

  # Timeout escalation
  timeout_handling:
    after_1h: "Send reminder notification"
    after_4h: "Escalate to PM_Architect"
    after_24h: "Mark task as BLOCKED, notify owner"

  # State recovery
  state_recovery:
    - "Load checkpoint from last successful step"
    - "Restore working memory context"
    - "Re-verify all assumptions"
    - "Resume from checkpoint"
```

---

# PART 6C: DURABLE CHECKPOINTING

**Status:** PLANNED (Infrastructure exists in pm_orchestrator.py)
**Purpose:** Save state after each step; resume on failure

## 6C.1 How Checkpoints Work

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DURABLE CHECKPOINTING SYSTEM                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   CHECKPOINT LIFECYCLE:                                                  │
│                                                                          │
│   Step 1           Step 2           Step 3           Step 4             │
│      │                │                │                │               │
│      ▼                ▼                ▼                ▼               │
│   [Checkpoint 1]  [Checkpoint 2]  [Checkpoint 3]  [Checkpoint 4]        │
│      │                │                │                │               │
│      │                │                X (failure)      │               │
│      │                │                │                │               │
│      │                │       Resume from CP-2 ────────►│               │
│                                                                          │
│   WHAT'S SAVED:                                                          │
│   ├── Current task state                                                 │
│   ├── Working memory snapshot                                            │
│   ├── Files modified (before/after)                                      │
│   ├── Decisions made with rationale                                      │
│   ├── Confidence scores                                                  │
│   └── Timestamp and agent ID                                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 6C.2 Checkpoint Storage

```yaml
checkpoint_storage:
  # Primary storage location
  location: "tinypm/.checkpoints/"
  format: "JSON"

  # Checkpoint structure
  checkpoint_schema:
    checkpoint_id: "UUID"
    task_id: "string"
    agent_id: "string"
    step_number: "integer"
    timestamp: "ISO8601"
    state:
      status: "string"
      progress_percent: "float"
      current_action: "string"
    context:
      working_memory_hash: "string"
      files_modified: "array"
      decisions: "array"
    recovery:
      can_resume: "boolean"
      resume_instructions: "string"
      rollback_available: "boolean"

  # Retention policy
  retention:
    active_tasks: "until_task_complete"
    completed_tasks: "7_days"
    failed_tasks: "30_days"
```

## 6C.3 Resume Procedures

```yaml
resume_procedures:
  # Automatic resume on failure
  auto_resume:
    triggers:
      - "agent_crash"
      - "timeout"
      - "connection_lost"
    process:
      1: "Detect failure condition"
      2: "Load most recent checkpoint"
      3: "Validate checkpoint integrity"
      4: "Restore agent state"
      5: "Re-evaluate current step"
      6: "Resume execution"

  # Manual resume
  manual_resume:
    command: "node pm_orchestrator.js resume --task {TASK_ID}"
    options:
      - "--from-checkpoint {CHECKPOINT_ID}"
      - "--skip-step {STEP_NUMBER}"
      - "--force-retry"

  # Checkpoint validation
  validation:
    - "Verify file states match checkpoint"
    - "Check external system states"
    - "Validate no conflicting changes"
    - "Confirm human approvals still valid"
```

---

# PART 7: AGENT SPAWNING PROTOCOL

## 7.1 When to Spawn Agents

```yaml
agent_spawning:

  # Spawn criteria
  spawn_when:
    - "task_requires_specialized_knowledge"
    - "parallel_workstreams_possible"
    - "task_exceeds_context_limits"
    - "multiple_file_types_involved"

  # Spawn decision tree
  decision_tree:
    backend_work:
      condition: "modifying apps_script/*.js"
      spawn: "Backend_Claude"

    frontend_desktop:
      condition: "modifying root HTML or web_app admin files"
      spawn: "Desktop_Claude"

    frontend_mobile:
      condition: "modifying employee.html, driver.html, PWA"
      spawn: "Mobile_Claude"

    research_task:
      condition: "evaluating new technology or approach"
      spawn: "Research_Claude"

  # Spawn protocol
  protocol:
    1: "Identify task requirements"
    2: "Check if specialized agent needed"
    3: "Verify agent not already working on conflicting task"
    4: "Spawn with clear scope and constraints"
    5: "Monitor progress via heartbeat"
    6: "Collect results and integrate"
    7: "Log completion in CHANGE_LOG.md"
```

## 7.2 Agent Communication Protocol

```yaml
agent_communication:

  # INBOX/OUTBOX pattern
  file_based:
    inbox: "claude_sessions/{agent}/INBOX.md"
    outbox: "claude_sessions/{agent}/OUTBOX.md"

  # Message format
  format:
    request: |
      ## REQUEST
      **From:** {sender}
      **To:** {receiver}
      **Priority:** {HIGH|MEDIUM|LOW}
      **Timestamp:** {ISO8601}

      ### Task
      {task_description}

      ### Context
      {relevant_context}

      ### Acceptance Criteria
      {how_to_verify}

    response: |
      ## RESPONSE
      **From:** {sender}
      **Re:** {original_request}
      **Status:** {COMPLETED|BLOCKED|IN_PROGRESS}
      **Timestamp:** {ISO8601}

      ### Result
      {result_description}

      ### Files Modified
      {list_of_files}

      ### How to Test
      {testing_instructions}

      ### Issues Encountered
      {any_issues}
```

---

# PART 7B: A2A-LITE COMMUNICATION PROTOCOL

**Status:** IMPLEMENTED (2026-02-12)
**Schema:** `config/a2a_message_schema.json`

## 7B.1 What is A2A-Lite?

A2A-Lite (Agent-to-Agent Lite) is a simplified inter-agent communication protocol for structured message passing between agents in the Tiny Seed OS multi-agent system.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    A2A-LITE COMMUNICATION FLOW                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   PM_Architect ──────────► Backend_Claude                               │
│        │                         │                                       │
│        │   REQUEST               │   RESPONSE                           │
│        │   {                     │   {                                  │
│        │     "from": "PM_...",   │     "from": "Backend_...",           │
│        │     "to": "Backend_...",│     "to": "PM_...",                  │
│        │     "type": "request",  │     "type": "response",              │
│        │     "action": "review", │     "status": "completed",           │
│        │     "confidence": 0.95  │     "confidence": 0.88               │
│        │   }                     │   }                                  │
│        │                         │                                       │
│        └────────────────────────►│                                       │
│                                                                          │
│   MESSAGE TYPES:                                                         │
│   ├── request   - Ask another agent to do something                     │
│   ├── response  - Reply to a request                                    │
│   ├── notification - Broadcast information to one or more agents        │
│   └── handoff   - Transfer task ownership to another agent              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 7B.2 Message Format

```yaml
a2a_message_format:
  # Required fields
  required:
    messageId: "UUID v4 - unique identifier"
    timestamp: "ISO 8601 datetime"
    from: "Sender agent ID (e.g., PM_Architect)"
    to: "Recipient agent ID or 'BROADCAST'"
    type: "request | response | notification | handoff"
    contextId: "Thread identifier for grouping related messages"
    payload: "Message content object"
    status: "pending | acknowledged | completed | abstained | failed"

  # Optional fields
  optional:
    taskId: "Reference to related task"
    priority: "low | medium | high | critical (default: medium)"
    confidence: "0.0-1.0 - Agent confidence level"
    parentMessageId: "UUID of parent message (for threading)"
    expiresAt: "ISO 8601 - expiration for time-sensitive messages"
    retryCount: "Number of delivery retry attempts"

  # Payload structure
  payload:
    subject: "Brief subject line"
    body: "Full message content (markdown supported)"
    action: "Requested action (for request type)"
    result: "Action result (for response type)"
    attachments: "Array of file references"
    metadata: "Additional key-value data"
```

## 7B.3 Valid Agent IDs

```yaml
valid_agents:
  core_team:
    - PM_Architect
    - Backend_Claude
    - Desktop_Claude
    - Mobile_Claude
    - UX_Design_Claude
    - Sales_Claude
    - Security_Claude

  extended_team:
    - Coordination_Claude
    - Field_Operations_Claude
    - Financial_Claude
    - Grants_Claude
    - Inventory_Claude
    - Social_Media_Claude

  special:
    - Human_User          # Messages to/from human
    - BROADCAST           # Send to all agents
```

## 7B.4 Example Messages

```json
// REQUEST: PM_Architect asks Backend_Claude to review code
{
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-02-12T10:30:00Z",
  "from": "PM_Architect",
  "to": "Backend_Claude",
  "type": "request",
  "contextId": "ctx-api-refactor-2026-02",
  "taskId": "TASK-1234",
  "priority": "high",
  "payload": {
    "subject": "API Endpoint Review",
    "body": "Please review the new authentication endpoints.",
    "action": "review_code",
    "metadata": {
      "files": ["apps_script/Auth.js"],
      "deadline": "2026-02-13T17:00:00Z"
    }
  },
  "confidence": 0.95,
  "status": "pending"
}

// NOTIFICATION: Security_Claude broadcasts an alert
{
  "messageId": "550e8400-e29b-41d4-a716-446655440002",
  "timestamp": "2026-02-12T12:00:00Z",
  "from": "Security_Claude",
  "to": "BROADCAST",
  "type": "notification",
  "contextId": "ctx-security-alert-2026-02-12",
  "priority": "critical",
  "payload": {
    "subject": "Security Advisory: Rate Limit Detected",
    "body": "Unusual API activity detected. Implementing temporary rate limiting.",
    "metadata": {
      "alertType": "rate_limit",
      "affectedEndpoints": ["auth", "data"]
    }
  },
  "confidence": 0.99,
  "status": "pending"
}

// HANDOFF: Backend_Claude transfers task to UX_Design_Claude
{
  "messageId": "550e8400-e29b-41d4-a716-446655440003",
  "timestamp": "2026-02-12T14:00:00Z",
  "from": "Backend_Claude",
  "to": "UX_Design_Claude",
  "type": "handoff",
  "contextId": "ctx-feature-dashboard-2026-02",
  "taskId": "TASK-5678",
  "priority": "medium",
  "payload": {
    "subject": "Dashboard API Ready for UI Implementation",
    "body": "Backend APIs complete and tested. Handing off for UI.",
    "action": "implement_ui",
    "metadata": {
      "endpoints": ["getDashboardData", "updateWidgets"],
      "documentation": "docs/dashboard-api.md"
    }
  },
  "confidence": 0.92,
  "status": "pending"
}
```

---

# PART 8: COORDINATION STANDARDS

## 8.1 Pre-Work Protocol

Before starting ANY work, every agent MUST:

```yaml
pre_work_checklist:

  1_identify_role:
    action: "Read CLAUDE.md to confirm role and scope"
    required: true

  2_check_inbox:
    action: "Read INBOX.md for pending requests"
    required: true

  3_check_manifest:
    action: "Read SYSTEM_MANIFEST.md to verify existing functionality"
    required: true
    violation: "Building duplicates causes fragmentation"

  4_check_duplicates:
    action: "Search for similar functions before creating new ones"
    required: true

  5_check_conflicts:
    action: "Verify no other agent working on same files"
    required: true

  6_acquire_locks:
    action: "Lock files before editing shared resources"
    required: true
```

## 8.2 Post-Work Protocol

After completing ANY work, every agent MUST:

```yaml
post_work_checklist:

  1_update_changelog:
    action: "Add entry to CHANGE_LOG.md"
    format: |
      ## {DATE} - {AGENT_ROLE}

      ### Changes
      - {file_modified}: {what_changed}

      ### Functions Added/Modified
      - {function_name}: {purpose}

      ### Testing
      - {how_to_test}

      ### Related
      - {related_issues_or_tasks}
    required: true

  2_update_outbox:
    action: "Write completion report to OUTBOX.md"
    required: true

  3_update_manifest:
    action: "Update SYSTEM_MANIFEST.md if new components added"
    required: "if_new_components"

  4_release_locks:
    action: "Release file locks"
    required: true

  5_notify_orchestrator:
    action: "Report completion to PM_Architect"
    required: "if_significant_change"
```

---

# PART 9: ERROR HANDLING & RECOVERY

## 9.1 Error Response Protocol

```yaml
error_handling:

  # Error classification
  severity_levels:
    CRITICAL:
      definition: "System unusable, data at risk"
      response: "STOP all work, escalate immediately"
      notification: "immediate"

    HIGH:
      definition: "Feature broken, workaround exists"
      response: "Attempt fix, escalate if fails"
      notification: "within 5 minutes"

    MEDIUM:
      definition: "Minor issue, system functional"
      response: "Log and continue, fix when convenient"
      notification: "daily summary"

    LOW:
      definition: "Cosmetic or optimization opportunity"
      response: "Add to backlog"
      notification: "weekly summary"

  # Recovery strategies
  recovery:
    code_error:
      1: "Identify root cause"
      2: "Check git history for working version"
      3: "Attempt targeted fix"
      4: "If fails, rollback to known good state"
      5: "Report to orchestrator"

    deployment_error:
      1: "Do NOT deploy again"
      2: "Rollback to previous deployment ID"
      3: "Investigate cause"
      4: "Fix and test locally"
      5: "Re-deploy only after verification"

    data_error:
      1: "STOP all writes immediately"
      2: "Assess damage scope"
      3: "Restore from backup if needed"
      4: "Document what happened"
      5: "Implement prevention measures"
```

## 9.2 Rollback Procedures

```yaml
rollback:

  # Apps Script
  apps_script:
    method: |
      # Rollback to previous deployment
      clasp deploy -i AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm \
        -v {PREVIOUS_VERSION_NUMBER} \
        -d "Rollback: {reason}"

  # GitHub Pages
  frontend:
    method: |
      # Revert last commit
      git revert HEAD
      git push origin main

      # Or checkout specific commit
      git checkout {COMMIT_HASH} -- {FILE}
      git commit -m "Rollback {FILE}: {reason}"
      git push origin main

  # Shopify
  shopify:
    method: |
      # Pages are versioned in Shopify admin
      # Use gh-cli to restore previous version
      # Or use saved backup from pre-publish log
```

---

# PART 10: MONITORING & OBSERVABILITY

## 10.1 Metrics to Track

```yaml
metrics:

  # Agent performance
  agent_metrics:
    - task_completion_rate
    - average_task_duration
    - error_rate
    - escalation_rate
    - approval_rate

  # System health
  system_metrics:
    - api_response_time
    - api_error_rate
    - deployment_success_rate
    - memory_usage
    - context_window_utilization

  # Quality metrics
  quality_metrics:
    - duplicate_code_detected
    - orphaned_references
    - broken_links
    - test_coverage

  # Storage location
  storage:
    file: "tinypm/.governor_metrics.json"
    format: "JSON"
    retention: "90 days"
```

## 10.2 Audit Trail

```yaml
audit:

  # What to log
  events:
    - agent_spawned
    - task_assigned
    - task_completed
    - file_modified
    - api_called
    - error_occurred
    - human_approval_requested
    - human_approval_received
    - deployment_executed
    - rollback_executed

  # Log format
  format:
    timestamp: "ISO8601"
    agent: "agent_id"
    event: "event_type"
    details: "event_specific_data"
    outcome: "success|failure"

  # Storage
  storage:
    file: "tinypm/.governor_audit.json"
    retention: "1 year"
```

---

# PART 10B: TRACING & OBSERVABILITY

**Status:** IMPLEMENTED (2026-02-12)
**Components:** `scripts/governor_helpers.js`, `tinypm/.governor_audit.json`

## 10B.1 What's Traced

```yaml
tracing_system:
  # Every agent action is traced
  traced_events:
    task_lifecycle:
      - task_started
      - task_completed
      - task_failed
      - task_abstained

    verification_gates:
      - verification_gate_required
      - verification_gate_initiated
      - verification_gate_passed
      - verification_gate_failed
      - verification_gate_blocked
      - verification_awaiting_approval

    proof_of_success:
      - proof_of_success_submitted
      - proof_of_success_validated
      - proof_of_success_rejected

    testing:
      - automated_test_passed
      - automated_test_failed
      - screenshot_comparison_passed
      - screenshot_comparison_failed

    confidence:
      - confidence_check_failed
      - confidence_check_passed

    abstention:
      - task_abstained
      - abstention_escalated
      - abstention_resolved

    approvals:
      - approval_requested
      - approval_granted
      - approval_denied

    deployments:
      - deployment_executed
      - rollback_executed

    errors:
      - error_budget_warning
      - error_budget_exceeded

  # Trace data structure
  trace_format:
    id: "UUID"
    timestamp: "ISO8601"
    agent: "agent_id"
    action: "action_type"
    outcome: "success | failure | pending | escalated | rolled_back | blocked | abstained"
    details: "action-specific metadata"
    rollbackAvailable: "boolean"
```

## 10B.2 How to View Traces

```bash
# View all recent events (last 7 days, max 50)
node scripts/governor_helpers.js events

# View events for specific agent
node scripts/governor_helpers.js events --agent Backend_Claude

# View specific action types
node scripts/governor_helpers.js events --action task_completed

# Limit results
node scripts/governor_helpers.js events --limit 10 --days 3

# View agent performance summary
node scripts/governor_helpers.js performance Backend_Claude

# View all agents summary
node scripts/governor_helpers.js summary

# View task verification status
node scripts/governor_helpers.js task-status TASK-001

# View valid task states and transitions
node scripts/governor_helpers.js states
```

## 10B.3 Trace Storage

```yaml
trace_storage:
  # Primary audit log
  audit_file: "tinypm/.governor_audit.json"
  format: "JSON"
  max_events: 1000  # Rolling window
  retention: "1 year"

  # Metrics file
  metrics_file: "tinypm/.governor_metrics.json"
  includes:
    - global_counters
    - per_agent_metrics
    - error_budgets
    - task_states
    - verification_proofs

  # Circuit breaker logs
  circuit_breaker:
    assessments: "tinypm/.circuit_breaker_assessments.json"
    audit: "tinypm/.circuit_breaker_audit.json"
```

---

# PART 10C: CIRCUIT BREAKERS (FINANCIAL)

**Status:** IMPLEMENTED (2026-02-04)
**UI:** `tinypm/static/js/circuit-breaker-ui.js`
**Data:** `tinypm/.circuit_breaker_assessments.json`

## 10C.1 What is the Financial Circuit Breaker?

The Financial Circuit Breaker prevents high-impact financial actions from executing automatically. It assesses the dollar impact of actions and gates them based on configurable thresholds.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FINANCIAL CIRCUIT BREAKER                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   IMPACT ZONES (configurable thresholds):                               │
│                                                                          │
│   $0 ────────── $500 ────────── $2000 ───────── $5000 ──────────►       │
│        SAFE          CAUTION         WARNING        DANGER              │
│     (auto-exec)   (one-click)     (pre-prepare)  (human req)           │
│                                                                          │
│   ASSESSMENT FACTORS:                                                    │
│   ├── Direct cost (actual expense amount)                               │
│   ├── Revenue risk (potential lost revenue)                             │
│   ├── Penalty risk (late fees, compliance)                              │
│   ├── Opportunity cost (missed opportunities)                           │
│   ├── Reputation impact (brand damage)                                  │
│   ├── Resource cost (time, compute)                                     │
│   └── Commitment (contractual obligations)                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 10C.2 Trip Conditions

```yaml
circuit_breaker_trips:
  # States
  CLOSED:   # Normal operation
    description: "All systems operational"
    behavior: "Process requests normally"

  OPEN:     # Tripped - blocking requests
    description: "Circuit breaker tripped"
    behavior: "Block all requests, use fallback"
    triggers:
      - "3 consecutive failures for same service"
      - "Impact exceeds human_required threshold"
      - "Manual trip by human/PM_Architect"

  HALF_OPEN:  # Testing recovery
    description: "Testing if service recovered"
    behavior: "Allow one test request"
    timeout: "60 seconds"

  # Specific trip conditions
  trip_conditions:
    - name: "High dollar impact"
      condition: "total_impact >= $5000"
      action: "Block and require human approval"

    - name: "Repeated failures"
      condition: "3 failures within 5 minutes"
      action: "Open circuit, exponential backoff"

    - name: "External API errors"
      condition: "Shopify/Apps Script returns 5xx"
      action: "Open circuit for that service"

    - name: "Error budget exceeded"
      condition: "Agent error count >= allowed"
      action: "Block agent, escalate to human"
```

## 10C.3 Recovery Procedures

```yaml
circuit_breaker_recovery:
  # Automatic recovery
  auto_recovery:
    half_open_after: "60 seconds"
    test_requests: 1
    success_required: 1
    full_recovery: "After 1 successful request"

  # Manual recovery
  manual_recovery:
    command: "Reset circuit breaker for [service]"
    requires: "Human or PM_Architect approval"
    actions:
      - "Acknowledge the failure"
      - "Verify root cause addressed"
      - "Reset circuit state to CLOSED"
      - "Monitor for recurrence"

  # Fallback behaviors
  fallbacks:
    shopify_api:
      fallback: "Queue operation for later retry"
      notify: "Human of delayed operation"

    apps_script_api:
      fallback: "Return cached data if available"
      notify: "Human of stale data"

    external_email:
      fallback: "Queue email in outbox"
      notify: "Human of pending sends"

  # Backoff strategy
  backoff:
    strategy: "exponential"
    base_delay: 1    # second
    max_delay: 60    # seconds
    jitter: true     # Add randomization
```

## 10C.4 Viewing Circuit Breaker State

```bash
# View recent assessments
cat tinypm/.circuit_breaker_assessments.json | jq '.assessments[-5:]'

# View audit trail
cat tinypm/.circuit_breaker_audit.json | jq '.entries'

# Check current state via API
curl http://localhost:5000/api/impact/stats
```

---

# PART 11: QUICK START COMMANDS

## 11.1 For Claude Code (Orchestrator)

When starting a session:
```
1. Read CLAUDE.md (automatic)
2. Read AGENTIC_TEAM_CONFIGURATION.md (this file)
3. Check claude_sessions/pm_architect/INBOX.md
4. Check CHANGE_LOG.md for recent activity
5. Assess current system state
```

## 11.2 For Spawning Agents

```
Use the Task tool with appropriate subagent_type:
- subagent_type: "general-purpose" for most work
- subagent_type: "Explore" for codebase research
- subagent_type: "Bash" for git/deployment

Always include:
- Clear task description
- Scope boundaries
- Expected output
- Relevant context
```

## 11.3 For Human Approvals

When approval needed:
```
1. Clearly state what action requires approval
2. Explain why it's needed
3. Show impact and rollback plan
4. Wait for explicit "yes" or "proceed"
5. Never assume silence is approval
```

---

# APPENDIX A: KEY CONFIGURATION FILES

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Core rules and constraints |
| `AGENTIC_TEAM_CONFIGURATION.md` | This file - team architecture |
| `claude_sessions/pm_architect/SYSTEM_MANIFEST.md` | System inventory |
| `claude_sessions/pm_architect/CLAUDE_ROLES.md` | Role definitions |
| `CHANGE_LOG.md` | Change tracking |
| `web_app/api-config.js` | API endpoint configuration |
| `tinypm/.governor_metrics.json` | Performance metrics |
| `tinypm/.governor_audit.json` | Audit trail |

---

# APPENDIX B: EMERGENCY CONTACTS

| Issue | Action |
|-------|--------|
| Production down | Stop all deployments, notify user, rollback |
| Data corruption | Stop writes, assess damage, restore backup |
| Security breach | Lock down, notify user, audit all access |
| API rate limited | Enable circuit breaker, use fallback |

---

# APPENDIX C: IMPLEMENTATION STATUS

**Last Updated:** 2026-02-12

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| **STATUS_ABSTAIN Protocol** | IMPLEMENTED | `scripts/governor_helpers.js` | Full state machine with ABSTAINED state, reason categories, metrics tracking |
| **Task Risk Classification** | IMPLEMENTED | `config/task_risk_classification.json` | LOW/MEDIUM/HIGH/CRITICAL levels with file patterns and autonomy mapping |
| **A2A-Lite Communication** | IMPLEMENTED | `config/a2a_message_schema.json` | JSON schema for inter-agent messaging with all message types |
| **Governor System** | IMPLEMENTED | `scripts/governor_helpers.js` | Event logging, metrics, error budgets, verification gates |
| **Verification Gates** | IMPLEMENTED | `scripts/governor_helpers.js` | Task state machine, proof submission, validation workflow |
| **Verifier_Claude Session** | IMPLEMENTED | `claude_sessions/verifier_claude/` | Folder structure with INBOX, OUTBOX, queue, history |
| **Financial Circuit Breaker** | IMPLEMENTED | `tinypm/static/js/circuit-breaker-ui.js` | Impact assessment UI, threshold zones, blocking logic |
| **Circuit Breaker Data** | IMPLEMENTED | `tinypm/.circuit_breaker_*.json` | Assessments and audit trail storage |
| **Tracing & Observability** | IMPLEMENTED | `tinypm/.governor_audit.json` | All agent actions logged with outcomes |
| **Metrics Storage** | IMPLEMENTED | `tinypm/.governor_metrics.json` | Per-agent metrics, error budgets, task states |
| **Human-on-the-Loop** | IMPLEMENTED | CLAUDE.md + Governor | Pause/resume via task states, timeout escalation |
| **Durable Checkpointing** | PLANNED | `tinypm/pm_orchestrator.py` | Infrastructure exists, needs activation |
| **Pre-flight Check Script** | IMPLEMENTED | `scripts/pre-flight-check.sh` | Duplicate detection, role boundaries, risk flags |
| **Validation Scripts** | IMPLEMENTED | `scripts/validate-*.sh` | Element refs, API URLs validation |
| **Context Snapshot** | IMPLEMENTED | `/tmp/TINYSEED_CONTEXT_SNAPSHOT.md` | Auto-generated session context |
| **Memory Architecture** | IMPLEMENTED | Multiple files | Working, Episodic, Semantic tiers |
| **Agent Roles** | DOCUMENTED | `CLAUDE_ROLES.md` | 8 specialized roles defined |

### Implementation Phases

| Phase | Trust Level | Status | Target Date |
|-------|-------------|--------|-------------|
| **Phase 1: Foundation** | 0% -> 25% | IN PROGRESS | 2026-02-19 |
| **Phase 2: Verification** | 25% -> 50% | PLANNED | 2026-02-26 |
| **Phase 3: Autonomy** | 50% -> 75% | PLANNED | 2026-03-05 |
| **Phase 4: Full Production** | 75% -> 100% | PLANNED | 2026-03-12 |

### Key Files Reference

| File | Purpose | Status |
|------|---------|--------|
| `scripts/governor_helpers.js` | Governor system with verification gates | ACTIVE |
| `config/task_risk_classification.json` | Risk level definitions | ACTIVE |
| `config/a2a_message_schema.json` | Inter-agent message format | ACTIVE |
| `tinypm/.governor_metrics.json` | Performance metrics storage | ACTIVE |
| `tinypm/.governor_audit.json` | Audit trail storage | ACTIVE |
| `tinypm/.circuit_breaker_assessments.json` | Financial impact assessments | ACTIVE |
| `tinypm/.circuit_breaker_audit.json` | Circuit breaker decisions | ACTIVE |
| `Claude-Code-Remote/src/utils/trace-capture.js` | Execution trace capture | ACTIVE |

---

**This configuration establishes Claude Code as the Supreme Orchestrator of the Tiny Seed Farm AI team, with production-grade safety, coordination, and quality controls.**

*NO SHORTCUTS. STATE OF THE ART. SO SMART IT KNOWS WHAT YOU SHOULD DO BEFORE YOU DO.*

---

*Document created: 2026-02-11*
*Document updated: 2026-02-12 (Added STATUS_ABSTAIN, Risk Classification, A2A-Lite, Checkpointing, HOTL, Tracing, Circuit Breakers)*
*Sovereign Production Blueprint v5.1*
