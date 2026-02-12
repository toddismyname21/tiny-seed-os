# STATUS_ABSTAIN Protocol Specification

> Implementation specification for the STATUS_ABSTAIN protocol - a standardized mechanism for agents to explicitly decline to answer when retrieval confidence falls below the 85% threshold.

**Version:** 1.0.0
**Created:** 2026-02-12
**Status:** Implementation Ready
**Based On:**
- Research finding: "If an agent determines that its retrieval confidence for a specific query falls below a strict 85% threshold, it is explicitly forbidden from attempting to guess. Instead, it must return a standardized STATUS_ABSTAIN code."
- `docs/research/AGENT_FAILURE_PREVENTION_PATTERNS.md`
- `docs/TRUST_AUTONOMY_FRAMEWORK.md`
- `scripts/governor_helpers.js`

---

## Table of Contents

1. [Protocol Definition](#1-protocol-definition)
2. [Agent Prompt Additions](#2-agent-prompt-additions)
3. [Governor Integration](#3-governor-integration)
4. [Verification](#4-verification)
5. [Implementation Code](#5-implementation-code)
6. [Appendix: Response Schemas](#appendix-response-schemas)

---

## 1. Protocol Definition

### 1.1 What STATUS_ABSTAIN Means

STATUS_ABSTAIN is a standardized response code indicating that an agent has **explicitly declined to provide an answer** because it lacks sufficient confidence in its retrieval or reasoning.

**Key Characteristics:**
- **Honest uncertainty**: The agent acknowledges the limits of its knowledge
- **Non-guessing**: The agent refuses to fabricate or hallucinate information
- **Traceable**: The abstention is logged for audit and metrics
- **Escalatable**: The response triggers fallback procedures

**STATUS_ABSTAIN is NOT:**
- A failure (agent performed correctly by recognizing uncertainty)
- An error (system is functioning as designed)
- A timeout (agent completed processing)
- A refusal (not a policy or safety block)

### 1.2 When STATUS_ABSTAIN Must Be Triggered

The 85% confidence threshold is **mandatory** and **non-negotiable**.

#### Trigger Conditions

| Condition | Confidence | Required Action |
|-----------|------------|-----------------|
| High confidence | >= 85% | Proceed with response |
| Low confidence | < 85% | **MUST return STATUS_ABSTAIN** |
| No retrieval | 0% | **MUST return STATUS_ABSTAIN** |
| Mixed signals | < 85% | **MUST return STATUS_ABSTAIN** |

#### Confidence Calculation

```
Retrieval Confidence = min(
  source_reliability,      // How trustworthy is the data source?
  recency_score,           // How current is the information?
  relevance_score,         // How relevant to the specific query?
  corroboration_score      // Is it confirmed by multiple sources?
) * 100

IF Retrieval Confidence < 85:
  RETURN STATUS_ABSTAIN
```

#### Examples of When to Abstain

| Query Type | Example | Abstain When |
|------------|---------|--------------|
| Factual | "What was revenue in Q3 2025?" | Data not in system, or only partial data found |
| Temporal | "When did we last deliver to Restaurant X?" | No delivery records found, or records are incomplete |
| Procedural | "How do we process organic certification?" | Documentation is outdated or missing sections |
| Predictive | "Will weather affect tomorrow's harvest?" | Weather data unavailable or forecast confidence < 85% |
| Comparative | "How do we compare to competitor Y?" | No reliable competitor data available |

#### Examples of When to Proceed

| Query Type | Example | Proceed When |
|------------|---------|--------------|
| Factual | "What is our business address?" | Verified in system configuration |
| Temporal | "When was the last delivery?" | Clear record in delivery log |
| Procedural | "How do we log hours?" | Current SOP document exists |
| Status | "Is the irrigation system on?" | Real-time sensor data available |

### 1.3 Standard Response Format

#### JSON Response Schema

```json
{
  "status": "STATUS_ABSTAIN",
  "code": "ABSTAIN_001",
  "timestamp": "2026-02-12T14:30:00.000Z",
  "agent": "Backend_Claude",
  "query_id": "query-abc123",
  "confidence": {
    "calculated": 0.62,
    "threshold": 0.85,
    "gap": 0.23
  },
  "reasoning": {
    "factors": [
      {
        "name": "source_reliability",
        "score": 0.70,
        "reason": "Source data is 6 months old"
      },
      {
        "name": "relevance_score",
        "score": 0.55,
        "reason": "Query mentions specific product not in catalog"
      }
    ],
    "primary_uncertainty": "Requested information not found in available data sources"
  },
  "attempted_sources": [
    "inventory_database",
    "product_catalog",
    "historical_orders"
  ],
  "suggested_actions": [
    {
      "action": "ESCALATE_HUMAN",
      "reason": "Human may have access to information not in system"
    },
    {
      "action": "CHECK_EXTERNAL",
      "source": "shopify_api",
      "reason": "Product may exist in Shopify but not synced"
    }
  ],
  "partial_information": {
    "available": true,
    "summary": "Found 3 similar products but none matching exact query",
    "confidence_if_accepted": 0.45
  }
}
```

#### STATUS_ABSTAIN Code Categories

| Code | Category | Description |
|------|----------|-------------|
| `ABSTAIN_001` | No Data | Requested information not found in any source |
| `ABSTAIN_002` | Stale Data | Data exists but is older than acceptable threshold |
| `ABSTAIN_003` | Partial Data | Some information found but insufficient for reliable answer |
| `ABSTAIN_004` | Conflicting Data | Multiple sources disagree, cannot determine truth |
| `ABSTAIN_005` | Scope Exceeded | Query requires knowledge outside agent's domain |
| `ABSTAIN_006` | Insufficient Context | Query is ambiguous and clarification needed |
| `ABSTAIN_007` | Calculation Uncertain | Numeric answer cannot be computed with confidence |
| `ABSTAIN_008` | External Dependency | Answer requires external service that is unavailable |

---

## 2. Agent Prompt Additions

### 2.1 Mandatory Prompt Block

Add the following to ALL agent system prompts:

```text
═══════════════════════════════════════════════════════════════════════════════
CONFIDENCE THRESHOLD PROTOCOL (MANDATORY)
═══════════════════════════════════════════════════════════════════════════════

You MUST evaluate your confidence before providing ANY factual response.

CONFIDENCE THRESHOLD: 85%

For EVERY factual claim, retrieval, or data-based answer:
1. Calculate your confidence as: min(source_reliability, recency, relevance, corroboration) * 100
2. IF confidence >= 85%: Proceed with response
3. IF confidence < 85%: You MUST return STATUS_ABSTAIN

WHEN YOU MUST ABSTAIN:
- You cannot find the requested information
- The information you found is outdated (>30 days for operational data)
- You only have partial information
- Multiple sources conflict
- The query is outside your knowledge domain
- You would need to guess or extrapolate

WHEN YOU ABSTAIN, RETURN THIS FORMAT:
{
  "status": "STATUS_ABSTAIN",
  "code": "[ABSTAIN_001-008]",
  "confidence": {"calculated": [0.00-0.84], "threshold": 0.85},
  "reasoning": "[Why you are abstaining]",
  "suggested_actions": ["[What could resolve this]"]
}

CRITICAL RULES:
- NEVER guess when uncertain
- NEVER provide fabricated data
- NEVER round up confidence to meet threshold
- ALWAYS log abstention with reasoning
- Abstaining is CORRECT behavior when appropriate

An abstention is NOT a failure - it is an honest acknowledgment of uncertainty.

═══════════════════════════════════════════════════════════════════════════════
```

### 2.2 Role-Specific Additions

#### Backend_Claude

```text
BACKEND-SPECIFIC ABSTENTION RULES:
- Abstain if API endpoint status is unknown
- Abstain if database query returns no results
- Abstain if data schema has changed since last verification
- Abstain if calculation depends on missing parameters
```

#### Sales_Claude

```text
SALES-SPECIFIC ABSTENTION RULES:
- Abstain if customer history is incomplete
- Abstain if pricing data is older than 7 days
- Abstain if inventory count cannot be verified
- Abstain if competitor information is unverified
```

#### UX_Design_Claude

```text
UX-SPECIFIC ABSTENTION RULES:
- Abstain if user research data is older than 90 days
- Abstain if accessibility requirements are unclear
- Abstain if design system version is unspecified
- Abstain if device compatibility cannot be verified
```

### 2.3 Examples for Agents

#### Example 1: Proceed (Confidence >= 85%)

**Query:** "What is our farm's address?"

**Agent Reasoning:**
```
Confidence Calculation:
- source_reliability: 1.0 (system configuration, verified)
- recency: 1.0 (static data, always current)
- relevance: 1.0 (exact match to query)
- corroboration: 0.95 (appears in multiple places)

Calculated Confidence: min(1.0, 1.0, 1.0, 0.95) = 0.95 = 95%
Threshold: 85%
Decision: PROCEED

Response: "Our farm address is 257 Zeigler Rd, Rochester, PA 15074"
```

#### Example 2: Abstain (Confidence < 85%)

**Query:** "How many pounds of tomatoes did we sell in July 2024?"

**Agent Reasoning:**
```
Confidence Calculation:
- source_reliability: 0.80 (sales data exists but has known gaps)
- recency: 1.0 (historical, doesn't age)
- relevance: 0.70 (found tomato sales, but category definitions changed mid-year)
- corroboration: 0.60 (Shopify and QuickBooks show different numbers)

Calculated Confidence: min(0.80, 1.0, 0.70, 0.60) = 0.60 = 60%
Threshold: 85%
Decision: STATUS_ABSTAIN
```

**Response:**
```json
{
  "status": "STATUS_ABSTAIN",
  "code": "ABSTAIN_004",
  "confidence": {"calculated": 0.60, "threshold": 0.85, "gap": 0.25},
  "reasoning": {
    "primary_uncertainty": "Conflicting data between Shopify ($1,247) and QuickBooks ($1,089) for July 2024 tomato sales",
    "factors": [
      {"name": "corroboration_score", "score": 0.60, "reason": "15% discrepancy between sources"}
    ]
  },
  "suggested_actions": [
    {"action": "ESCALATE_HUMAN", "reason": "Manual reconciliation needed to determine correct figure"}
  ],
  "partial_information": {
    "available": true,
    "summary": "Shopify reports $1,247, QuickBooks reports $1,089",
    "confidence_if_accepted": 0.60
  }
}
```

#### Example 3: Abstain (No Data)

**Query:** "What's the soil pH in the north field?"

**Agent Reasoning:**
```
Confidence Calculation:
- source_reliability: 0 (no soil pH data found)
- recency: N/A
- relevance: N/A
- corroboration: N/A

Calculated Confidence: 0%
Threshold: 85%
Decision: STATUS_ABSTAIN
```

**Response:**
```json
{
  "status": "STATUS_ABSTAIN",
  "code": "ABSTAIN_001",
  "confidence": {"calculated": 0, "threshold": 0.85, "gap": 0.85},
  "reasoning": {
    "primary_uncertainty": "No soil pH data found in any data source",
    "factors": [
      {"name": "source_reliability", "score": 0, "reason": "No soil testing data in system"}
    ]
  },
  "attempted_sources": ["soil_tracker", "field_notes", "lab_results"],
  "suggested_actions": [
    {"action": "CHECK_EXTERNAL", "source": "soil_testing_lab", "reason": "May need to schedule soil test"},
    {"action": "ESCALATE_HUMAN", "reason": "Todd may have paper records from previous tests"}
  ]
}
```

---

## 3. Governor Integration

### 3.1 How governor_helpers.js Handles STATUS_ABSTAIN

The Governor system treats STATUS_ABSTAIN as a **valid outcome**, not a failure.

#### New Constants

```javascript
// Add to VALID_OUTCOMES
const VALID_OUTCOMES = [
  'success',
  'failure',
  'pending',
  'escalated',
  'rolled_back',
  'blocked',
  'awaiting_verification',
  'abstained'  // NEW
];

// Add to VALID_ACTIONS
const VALID_ACTIONS = [
  // ... existing actions ...
  'abstain_triggered',
  'abstain_escalated',
  'abstain_resolved',
  'abstain_false_positive'
];

// Add to VALID_METRICS
const VALID_METRICS = [
  // ... existing metrics ...
  'abstentions_total',
  'abstentions_escalated',
  'abstentions_resolved_by_human',
  'abstentions_resolved_by_external',
  'false_abstentions',     // Agent abstained but shouldn't have
  'false_confidence'       // Agent didn't abstain but should have
];

// Abstention codes
const ABSTAIN_CODES = {
  ABSTAIN_001: 'no_data',
  ABSTAIN_002: 'stale_data',
  ABSTAIN_003: 'partial_data',
  ABSTAIN_004: 'conflicting_data',
  ABSTAIN_005: 'scope_exceeded',
  ABSTAIN_006: 'insufficient_context',
  ABSTAIN_007: 'calculation_uncertain',
  ABSTAIN_008: 'external_dependency'
};
```

#### Core Functions

```javascript
/**
 * Handle a STATUS_ABSTAIN response from an agent
 *
 * @param {string} agent - Agent that abstained
 * @param {object} abstainResponse - The STATUS_ABSTAIN response object
 * @param {object} originalQuery - The query that triggered abstention
 * @returns {object} Result with next steps and escalation status
 */
function handleAbstention(agent, abstainResponse, originalQuery) {
  const result = {
    handled: false,
    escalated: false,
    resolution: null,
    nextSteps: []
  };

  // Validate abstention response format
  if (!validateAbstainResponse(abstainResponse)) {
    logGovernorEvent(agent, 'abstain_triggered', 'failure', {
      error: 'Invalid STATUS_ABSTAIN response format',
      response: abstainResponse
    });
    return { ...result, error: 'Invalid abstention format' };
  }

  // Log the abstention event
  const eventResult = logGovernorEvent(agent, 'abstain_triggered', 'abstained', {
    code: abstainResponse.code,
    confidence: abstainResponse.confidence,
    reasoning: abstainResponse.reasoning,
    query: originalQuery.summary || originalQuery.text?.substring(0, 200)
  });

  // Increment abstention metric
  incrementMetric('abstentions_total', agent);

  // Determine fallback procedure based on code
  const fallback = determineFallback(abstainResponse.code, abstainResponse.suggested_actions);
  result.nextSteps = fallback.steps;

  // Check if human escalation is required
  if (fallback.requiresHuman) {
    result.escalated = true;
    incrementMetric('abstentions_escalated', agent);
    result.escalationDetails = createEscalationTicket(agent, abstainResponse, originalQuery);
  }

  result.handled = true;
  return result;
}

/**
 * Validate STATUS_ABSTAIN response format
 */
function validateAbstainResponse(response) {
  if (!response || typeof response !== 'object') return false;
  if (response.status !== 'STATUS_ABSTAIN') return false;
  if (!response.code || !ABSTAIN_CODES[response.code]) return false;
  if (!response.confidence || typeof response.confidence.calculated !== 'number') return false;
  if (response.confidence.calculated >= 0.85) return false; // Should not abstain at >= 85%
  return true;
}

/**
 * Determine appropriate fallback procedure for abstention type
 */
function determineFallback(code, suggestedActions = []) {
  const fallbacks = {
    ABSTAIN_001: { // No data
      steps: ['check_external_sources', 'escalate_to_human'],
      requiresHuman: true,
      timeout: 3600 // 1 hour
    },
    ABSTAIN_002: { // Stale data
      steps: ['refresh_data_source', 'retry_query'],
      requiresHuman: false,
      timeout: 300 // 5 minutes
    },
    ABSTAIN_003: { // Partial data
      steps: ['offer_partial_with_disclaimer', 'suggest_refinement'],
      requiresHuman: false,
      timeout: 0
    },
    ABSTAIN_004: { // Conflicting data
      steps: ['escalate_to_human', 'request_reconciliation'],
      requiresHuman: true,
      timeout: 7200 // 2 hours
    },
    ABSTAIN_005: { // Scope exceeded
      steps: ['route_to_appropriate_agent', 'escalate_if_no_agent'],
      requiresHuman: false,
      timeout: 60
    },
    ABSTAIN_006: { // Insufficient context
      steps: ['request_clarification', 'suggest_rephrasing'],
      requiresHuman: false,
      timeout: 0
    },
    ABSTAIN_007: { // Calculation uncertain
      steps: ['show_range_estimate', 'escalate_for_verification'],
      requiresHuman: true,
      timeout: 1800 // 30 minutes
    },
    ABSTAIN_008: { // External dependency
      steps: ['retry_external_service', 'queue_for_later', 'escalate_if_critical'],
      requiresHuman: false,
      timeout: 900 // 15 minutes
    }
  };

  return fallbacks[code] || {
    steps: ['escalate_to_human'],
    requiresHuman: true,
    timeout: 3600
  };
}
```

### 3.2 Fallback Procedures

#### Procedure 1: Check External Sources

```javascript
async function checkExternalSources(abstainResponse, originalQuery) {
  const externalSources = [
    { name: 'shopify_api', priority: 1 },
    { name: 'quickbooks_api', priority: 2 },
    { name: 'google_sheets', priority: 3 }
  ];

  for (const source of externalSources) {
    try {
      const result = await queryExternalSource(source.name, originalQuery);
      if (result.found && result.confidence >= 0.85) {
        logGovernorEvent('Governor', 'abstain_resolved', 'success', {
          original_code: abstainResponse.code,
          resolved_by: source.name,
          new_confidence: result.confidence
        });
        incrementMetric('abstentions_resolved_by_external');
        return { resolved: true, source: source.name, result: result.data };
      }
    } catch (error) {
      // Log but continue to next source
      console.warn(`External source ${source.name} failed:`, error.message);
    }
  }

  return { resolved: false, triedSources: externalSources.map(s => s.name) };
}
```

#### Procedure 2: Escalate to Human

```javascript
function createEscalationTicket(agent, abstainResponse, originalQuery) {
  const ticket = {
    id: generateUUID(),
    type: 'ABSTENTION_ESCALATION',
    priority: determineEscalationPriority(abstainResponse.code),
    created: new Date().toISOString(),
    agent: agent,
    abstainCode: abstainResponse.code,
    confidence: abstainResponse.confidence,
    query: {
      text: originalQuery.text,
      context: originalQuery.context,
      user: originalQuery.user
    },
    reasoning: abstainResponse.reasoning,
    partialInfo: abstainResponse.partial_information,
    suggestedActions: abstainResponse.suggested_actions,
    status: 'OPEN',
    assignedTo: null,
    resolution: null
  };

  // Save to escalation queue
  saveEscalationTicket(ticket);

  // Notify appropriate humans
  notifyEscalation(ticket);

  return ticket;
}

function determineEscalationPriority(code) {
  const priorities = {
    ABSTAIN_001: 'MEDIUM',    // No data - might be expected
    ABSTAIN_002: 'LOW',       // Stale data - can often wait
    ABSTAIN_003: 'LOW',       // Partial data - informational
    ABSTAIN_004: 'HIGH',      // Conflicting data - needs resolution
    ABSTAIN_005: 'LOW',       // Scope exceeded - routing issue
    ABSTAIN_006: 'LOW',       // Insufficient context - user can help
    ABSTAIN_007: 'HIGH',      // Calculation uncertain - may be financial
    ABSTAIN_008: 'MEDIUM'     // External dependency - may resolve itself
  };
  return priorities[code] || 'MEDIUM';
}
```

### 3.3 Human Resolution Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ABSTENTION ESCALATION FLOW                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Agent detects low confidence (<85%)                                 │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐                                                 │
│  │ STATUS_ABSTAIN  │                                                 │
│  │   returned      │                                                 │
│  └────────┬────────┘                                                 │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐     ┌─────────────────┐                        │
│  │ Try automated   │────▶│ Resolved?       │──Yes──▶ Log & Return   │
│  │ fallbacks       │     └────────┬────────┘                        │
│  └─────────────────┘              │No                               │
│                                   ▼                                  │
│                     ┌─────────────────────────┐                      │
│                     │ Create escalation ticket │                     │
│                     └───────────┬─────────────┘                      │
│                                 │                                    │
│                                 ▼                                    │
│                     ┌─────────────────────────┐                      │
│                     │ Notify human            │                      │
│                     │ (Email/Slack/Dashboard) │                      │
│                     └───────────┬─────────────┘                      │
│                                 │                                    │
│                                 ▼                                    │
│                     ┌─────────────────────────┐                      │
│                     │ Human reviews:          │                      │
│                     │ - Original query        │                      │
│                     │ - Agent reasoning       │                      │
│                     │ - Partial information   │                      │
│                     └───────────┬─────────────┘                      │
│                                 │                                    │
│                    ┌────────────┴────────────┐                       │
│                    ▼                         ▼                       │
│           ┌───────────────┐         ┌───────────────┐               │
│           │ Provide answer │         │ Confirm no    │               │
│           │ (with source)  │         │ answer exists │               │
│           └───────┬───────┘         └───────┬───────┘               │
│                   │                         │                        │
│                   ▼                         ▼                        │
│           Log as resolved           Log as "correctly               │
│           (abstention                abstained"                      │
│            resolved by human)        (no false positive)             │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Verification

### 4.1 Verifying Proper Abstention Behavior

#### Automated Verification Tests

```javascript
/**
 * Test suite to verify agents properly abstain
 */
const abstentionTests = {
  /**
   * Test 1: Agent abstains when data is not found
   */
  async testAbstainsOnNoData() {
    const query = "What was the price of product XYZ-999 in 2019?";
    const response = await agent.process(query);

    assert.strictEqual(response.status, 'STATUS_ABSTAIN');
    assert.strictEqual(response.code, 'ABSTAIN_001');
    assert.ok(response.confidence.calculated < 0.85);
    return { passed: true };
  },

  /**
   * Test 2: Agent does NOT abstain when data is available
   */
  async testProceedsWithKnownData() {
    const query = "What is the farm address?";
    const response = await agent.process(query);

    assert.notStrictEqual(response.status, 'STATUS_ABSTAIN');
    assert.ok(response.answer.includes('257 Zeigler Rd'));
    return { passed: true };
  },

  /**
   * Test 3: Agent abstains on conflicting data
   */
  async testAbstainsOnConflict() {
    // Set up conflicting data scenario
    await setupConflictingData('revenue_q3', { source1: 10000, source2: 12000 });

    const query = "What was revenue in Q3?";
    const response = await agent.process(query);

    assert.strictEqual(response.status, 'STATUS_ABSTAIN');
    assert.strictEqual(response.code, 'ABSTAIN_004');
    assert.ok(response.partial_information.available);
    return { passed: true };
  },

  /**
   * Test 4: Agent abstains on stale data
   */
  async testAbstainsOnStaleData() {
    // Mark inventory data as 45 days old
    await setDataAge('inventory', 45);

    const query = "How many tomato plants do we have?";
    const response = await agent.process(query);

    assert.strictEqual(response.status, 'STATUS_ABSTAIN');
    assert.strictEqual(response.code, 'ABSTAIN_002');
    return { passed: true };
  },

  /**
   * Test 5: Abstention response format is valid
   */
  async testAbstentionFormat() {
    const query = "What is the meaning of life?"; // Philosophical, should abstain
    const response = await agent.process(query);

    // Validate all required fields
    assert.ok(response.status === 'STATUS_ABSTAIN');
    assert.ok(response.code);
    assert.ok(response.timestamp);
    assert.ok(response.confidence);
    assert.ok(response.confidence.calculated !== undefined);
    assert.ok(response.confidence.threshold === 0.85);
    assert.ok(response.reasoning);
    return { passed: true };
  }
};
```

#### Manual Verification Checklist

- [ ] Agent abstains when queried about data that doesn't exist
- [ ] Agent abstains when data is older than freshness threshold
- [ ] Agent abstains when multiple sources conflict
- [ ] Agent abstains when query is outside its domain
- [ ] Agent does NOT abstain when confident answer is available
- [ ] Abstention response includes all required fields
- [ ] Abstention is logged to Governor audit trail
- [ ] Human escalation is triggered for appropriate abstention codes
- [ ] Metrics are properly incremented on abstention

### 4.2 Metrics to Track

#### Primary Metrics

| Metric | Formula | Target | Alert Threshold |
|--------|---------|--------|-----------------|
| **Abstention Rate** | `abstentions / total_queries * 100` | 5-15% | >25% or <2% |
| **False Confidence Rate** | `false_confidence / (queries - abstentions) * 100` | <2% | >5% |
| **False Abstention Rate** | `false_abstentions / abstentions * 100` | <5% | >10% |
| **Resolution Rate** | `resolved_abstentions / escalated_abstentions * 100` | >90% | <75% |
| **Time to Resolution** | `avg(resolution_time)` | <2 hours | >8 hours |

#### Abstention Rate Interpretation

| Rate | Interpretation | Action |
|------|----------------|--------|
| <2% | Agent may be overconfident | Review false confidence incidents |
| 2-5% | Healthy, selective abstention | Normal operation |
| 5-15% | Agent is appropriately cautious | Monitor for trends |
| 15-25% | May indicate data quality issues | Investigate data sources |
| >25% | Systemic problem | Check retrieval system, data availability |

#### Dashboard Widget

```javascript
function getAbstentionMetrics(agent = null, timeframe = '7d') {
  const metrics = readJsonFile(METRICS_FILE);

  // Calculate abstention rate
  const total = metrics.metrics.queries_processed || 0;
  const abstentions = metrics.metrics.abstentions_total || 0;
  const falseConfidence = metrics.metrics.false_confidence || 0;
  const falseAbstentions = metrics.metrics.false_abstentions || 0;

  return {
    abstentionRate: total > 0 ? (abstentions / total * 100).toFixed(2) : 0,
    falseConfidenceRate: (total - abstentions) > 0
      ? (falseConfidence / (total - abstentions) * 100).toFixed(2)
      : 0,
    falseAbstentionRate: abstentions > 0
      ? (falseAbstentions / abstentions * 100).toFixed(2)
      : 0,
    totalAbstentions: abstentions,
    byCode: metrics.abstention_codes || {},
    trend: calculateTrend('abstentions_total', timeframe)
  };
}
```

### 4.3 Calibration Verification

To ensure agents are properly calibrated (confidence matches actual accuracy):

```javascript
/**
 * Calculate Expected Calibration Error (ECE) for abstention decisions
 *
 * ECE measures how well confidence matches actual outcomes
 * Lower is better. Target: ECE < 5%
 */
function calculateAbstentionCalibration() {
  const decisions = readRecentDecisions(1000); // Last 1000 decisions

  // Group by confidence bins
  const bins = {};
  for (let i = 0; i < 100; i += 10) {
    bins[`${i}-${i+10}`] = { count: 0, correct: 0 };
  }

  for (const decision of decisions) {
    const conf = decision.confidence.calculated * 100;
    const binKey = `${Math.floor(conf / 10) * 10}-${Math.floor(conf / 10) * 10 + 10}`;

    bins[binKey].count++;

    // Decision was correct if:
    // - Abstained (conf < 85) AND later verified no answer existed
    // - Proceeded (conf >= 85) AND answer was verified correct
    if (decision.verified_correct) {
      bins[binKey].correct++;
    }
  }

  // Calculate ECE
  let ece = 0;
  let totalSamples = 0;

  for (const [binKey, binData] of Object.entries(bins)) {
    if (binData.count === 0) continue;

    const binMidpoint = parseInt(binKey.split('-')[0]) + 5;
    const expectedAccuracy = binMidpoint / 100;
    const actualAccuracy = binData.correct / binData.count;

    ece += Math.abs(actualAccuracy - expectedAccuracy) * binData.count;
    totalSamples += binData.count;
  }

  return totalSamples > 0 ? (ece / totalSamples * 100).toFixed(2) : 0;
}
```

---

## 5. Implementation Code

### 5.1 JavaScript Additions to governor_helpers.js

Add the following code to `/Users/samanthapollack/Documents/TIny_Seed_OS/scripts/governor_helpers.js`:

```javascript
// ═══════════════════════════════════════════════════════════════════════════
// STATUS_ABSTAIN PROTOCOL
// ═══════════════════════════════════════════════════════════════════════════
// When retrieval confidence < 85%, agents MUST abstain rather than guess.
// This section handles abstention responses, fallbacks, and metrics.
// ═══════════════════════════════════════════════════════════════════════════

// Abstention codes
const ABSTAIN_CODES = {
  ABSTAIN_001: { name: 'no_data', description: 'Requested information not found in any source' },
  ABSTAIN_002: { name: 'stale_data', description: 'Data exists but is older than acceptable threshold' },
  ABSTAIN_003: { name: 'partial_data', description: 'Some information found but insufficient for reliable answer' },
  ABSTAIN_004: { name: 'conflicting_data', description: 'Multiple sources disagree, cannot determine truth' },
  ABSTAIN_005: { name: 'scope_exceeded', description: 'Query requires knowledge outside agent domain' },
  ABSTAIN_006: { name: 'insufficient_context', description: 'Query is ambiguous and clarification needed' },
  ABSTAIN_007: { name: 'calculation_uncertain', description: 'Numeric answer cannot be computed with confidence' },
  ABSTAIN_008: { name: 'external_dependency', description: 'Answer requires external service that is unavailable' }
};

// Confidence threshold (85%)
const CONFIDENCE_THRESHOLD = 0.85;

/**
 * Validate a STATUS_ABSTAIN response format
 *
 * @param {object} response - The response to validate
 * @returns {object} Validation result with isValid flag and errors
 */
function validateAbstainResponse(response) {
  const errors = [];

  if (!response || typeof response !== 'object') {
    errors.push('Response must be an object');
    return { isValid: false, errors };
  }

  if (response.status !== 'STATUS_ABSTAIN') {
    errors.push('status must be "STATUS_ABSTAIN"');
  }

  if (!response.code || !ABSTAIN_CODES[response.code]) {
    errors.push(`code must be one of: ${Object.keys(ABSTAIN_CODES).join(', ')}`);
  }

  if (!response.confidence || typeof response.confidence !== 'object') {
    errors.push('confidence must be an object');
  } else {
    if (typeof response.confidence.calculated !== 'number') {
      errors.push('confidence.calculated must be a number');
    } else if (response.confidence.calculated >= CONFIDENCE_THRESHOLD) {
      errors.push(`confidence.calculated (${response.confidence.calculated}) must be < ${CONFIDENCE_THRESHOLD}`);
    }
    if (response.confidence.threshold !== CONFIDENCE_THRESHOLD) {
      errors.push(`confidence.threshold must be ${CONFIDENCE_THRESHOLD}`);
    }
  }

  if (!response.reasoning) {
    errors.push('reasoning is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Handle a STATUS_ABSTAIN response from an agent
 *
 * @param {string} agent - Agent that abstained
 * @param {object} abstainResponse - The STATUS_ABSTAIN response object
 * @param {object} originalQuery - The query that triggered abstention
 * @returns {object} Result with next steps and escalation status
 */
function handleAbstention(agent, abstainResponse, originalQuery = {}) {
  const result = {
    success: false,
    handled: false,
    escalated: false,
    resolution: null,
    nextSteps: [],
    errors: []
  };

  // Validate abstention response format
  const validation = validateAbstainResponse(abstainResponse);
  if (!validation.isValid) {
    result.errors = validation.errors;
    logGovernorEvent(agent, 'abstain_triggered', 'failure', {
      error: 'Invalid STATUS_ABSTAIN response format',
      validationErrors: validation.errors,
      response: abstainResponse
    });
    return result;
  }

  // Log the abstention event
  logGovernorEvent(agent, 'abstain_triggered', 'abstained', {
    code: abstainResponse.code,
    codeName: ABSTAIN_CODES[abstainResponse.code].name,
    confidence: abstainResponse.confidence,
    reasoning: abstainResponse.reasoning?.primary_uncertainty || abstainResponse.reasoning,
    querySummary: originalQuery.text?.substring(0, 200) || 'No query text'
  });

  // Increment abstention metrics
  incrementMetric('abstentions_total', agent);
  incrementAbstentionCodeMetric(abstainResponse.code);

  // Determine fallback procedure based on code
  const fallback = determineFallbackProcedure(abstainResponse.code, abstainResponse.suggested_actions);
  result.nextSteps = fallback.steps;
  result.timeoutSeconds = fallback.timeout;

  // Check if human escalation is required
  if (fallback.requiresHuman) {
    result.escalated = true;
    incrementMetric('abstentions_escalated', agent);

    const escalation = createAbstentionEscalation(agent, abstainResponse, originalQuery);
    result.escalationId = escalation.id;
    result.escalationPriority = escalation.priority;

    logGovernorEvent(agent, 'abstain_escalated', 'escalated', {
      escalationId: escalation.id,
      priority: escalation.priority,
      code: abstainResponse.code
    });
  }

  result.success = true;
  result.handled = true;
  return result;
}

/**
 * Determine appropriate fallback procedure for abstention type
 *
 * @param {string} code - Abstention code
 * @param {array} suggestedActions - Agent's suggested actions
 * @returns {object} Fallback procedure
 */
function determineFallbackProcedure(code, suggestedActions = []) {
  const fallbacks = {
    ABSTAIN_001: { // No data
      steps: ['check_external_sources', 'escalate_to_human'],
      requiresHuman: true,
      timeout: 3600,
      autoRetry: false
    },
    ABSTAIN_002: { // Stale data
      steps: ['refresh_data_source', 'retry_query'],
      requiresHuman: false,
      timeout: 300,
      autoRetry: true
    },
    ABSTAIN_003: { // Partial data
      steps: ['offer_partial_with_disclaimer', 'suggest_refinement'],
      requiresHuman: false,
      timeout: 0,
      autoRetry: false
    },
    ABSTAIN_004: { // Conflicting data
      steps: ['escalate_to_human', 'request_reconciliation'],
      requiresHuman: true,
      timeout: 7200,
      autoRetry: false
    },
    ABSTAIN_005: { // Scope exceeded
      steps: ['route_to_appropriate_agent', 'escalate_if_no_agent'],
      requiresHuman: false,
      timeout: 60,
      autoRetry: false
    },
    ABSTAIN_006: { // Insufficient context
      steps: ['request_clarification', 'suggest_rephrasing'],
      requiresHuman: false,
      timeout: 0,
      autoRetry: false
    },
    ABSTAIN_007: { // Calculation uncertain
      steps: ['show_range_estimate', 'escalate_for_verification'],
      requiresHuman: true,
      timeout: 1800,
      autoRetry: false
    },
    ABSTAIN_008: { // External dependency
      steps: ['retry_external_service', 'queue_for_later', 'escalate_if_critical'],
      requiresHuman: false,
      timeout: 900,
      autoRetry: true
    }
  };

  return fallbacks[code] || {
    steps: ['escalate_to_human'],
    requiresHuman: true,
    timeout: 3600,
    autoRetry: false
  };
}

/**
 * Create an escalation ticket for abstention
 */
function createAbstentionEscalation(agent, abstainResponse, originalQuery) {
  const priorities = {
    ABSTAIN_001: 'MEDIUM',
    ABSTAIN_002: 'LOW',
    ABSTAIN_003: 'LOW',
    ABSTAIN_004: 'HIGH',
    ABSTAIN_005: 'LOW',
    ABSTAIN_006: 'LOW',
    ABSTAIN_007: 'HIGH',
    ABSTAIN_008: 'MEDIUM'
  };

  const escalation = {
    id: `ESC-ABSTAIN-${Date.now()}-${generateUUID().slice(0, 8)}`,
    type: 'ABSTENTION_ESCALATION',
    priority: priorities[abstainResponse.code] || 'MEDIUM',
    created: new Date().toISOString(),
    agent: agent,
    abstainCode: abstainResponse.code,
    abstainCodeName: ABSTAIN_CODES[abstainResponse.code].name,
    confidence: abstainResponse.confidence,
    query: {
      text: originalQuery.text || 'Unknown query',
      context: originalQuery.context || {},
      user: originalQuery.user || 'Unknown'
    },
    reasoning: abstainResponse.reasoning,
    partialInfo: abstainResponse.partial_information || null,
    suggestedActions: abstainResponse.suggested_actions || [],
    attemptedSources: abstainResponse.attempted_sources || [],
    status: 'OPEN',
    assignedTo: null,
    resolution: null,
    resolvedAt: null
  };

  // Save to metrics file escalations
  const metrics = readJsonFile(METRICS_FILE);
  if (metrics) {
    if (!metrics.abstention_escalations) {
      metrics.abstention_escalations = [];
    }
    metrics.abstention_escalations.push(escalation);

    // Keep last 500 escalations
    if (metrics.abstention_escalations.length > 500) {
      metrics.abstention_escalations = metrics.abstention_escalations.slice(-500);
    }

    writeJsonFile(METRICS_FILE, metrics);
  }

  return escalation;
}

/**
 * Increment metric for specific abstention code
 */
function incrementAbstentionCodeMetric(code) {
  const metrics = readJsonFile(METRICS_FILE);
  if (metrics) {
    if (!metrics.abstention_codes) {
      metrics.abstention_codes = {};
    }
    metrics.abstention_codes[code] = (metrics.abstention_codes[code] || 0) + 1;
    metrics.last_updated = new Date().toISOString();
    writeJsonFile(METRICS_FILE, metrics);
  }
}

/**
 * Resolve an abstention escalation
 *
 * @param {string} escalationId - Escalation ticket ID
 * @param {string} resolver - Who resolved (human name or agent)
 * @param {string} resolution - Resolution type: 'answered', 'no_answer_exists', 'data_added'
 * @param {object} details - Resolution details
 * @returns {object} Result
 */
function resolveAbstentionEscalation(escalationId, resolver, resolution, details = {}) {
  const metrics = readJsonFile(METRICS_FILE);
  if (!metrics || !metrics.abstention_escalations) {
    return { success: false, error: 'No escalations found' };
  }

  const index = metrics.abstention_escalations.findIndex(e => e.id === escalationId);
  if (index === -1) {
    return { success: false, error: 'Escalation not found' };
  }

  const escalation = metrics.abstention_escalations[index];
  escalation.status = 'RESOLVED';
  escalation.resolution = resolution;
  escalation.resolutionDetails = details;
  escalation.resolvedBy = resolver;
  escalation.resolvedAt = new Date().toISOString();

  writeJsonFile(METRICS_FILE, metrics);

  // Log the resolution
  logGovernorEvent(resolver, 'abstain_resolved', 'success', {
    escalationId: escalationId,
    resolution: resolution,
    originalCode: escalation.abstainCode,
    timeToResolve: Date.parse(escalation.resolvedAt) - Date.parse(escalation.created)
  });

  // Update metrics based on resolution type
  if (resolution === 'answered') {
    incrementMetric('abstentions_resolved_by_human');
  } else if (resolution === 'no_answer_exists') {
    // This confirms the abstention was correct
    // No metric needed - abstention was appropriate
  } else if (resolution === 'false_positive') {
    // Agent abstained but shouldn't have
    incrementMetric('false_abstentions', escalation.agent);
  }

  return { success: true, escalation };
}

/**
 * Get abstention metrics for dashboard/reporting
 *
 * @param {string} agent - Optional agent filter
 * @param {string} timeframe - Timeframe: '24h', '7d', '30d'
 * @returns {object} Abstention metrics
 */
function getAbstentionMetrics(agent = null, timeframe = '7d') {
  const metrics = readJsonFile(METRICS_FILE);
  if (!metrics) {
    return { error: 'Could not read metrics file' };
  }

  const totalQueries = metrics.metrics.queries_processed || 1; // Avoid division by zero
  const abstentions = metrics.metrics.abstentions_total || 0;
  const escalated = metrics.metrics.abstentions_escalated || 0;
  const resolvedByHuman = metrics.metrics.abstentions_resolved_by_human || 0;
  const falseConfidence = metrics.metrics.false_confidence || 0;
  const falseAbstentions = metrics.metrics.false_abstentions || 0;

  return {
    summary: {
      abstentionRate: ((abstentions / totalQueries) * 100).toFixed(2) + '%',
      totalAbstentions: abstentions,
      escalated: escalated,
      escalationRate: abstentions > 0 ? ((escalated / abstentions) * 100).toFixed(2) + '%' : '0%',
      resolvedByHuman: resolvedByHuman,
      resolutionRate: escalated > 0 ? ((resolvedByHuman / escalated) * 100).toFixed(2) + '%' : 'N/A'
    },
    quality: {
      falseConfidenceRate: totalQueries > abstentions
        ? ((falseConfidence / (totalQueries - abstentions)) * 100).toFixed(2) + '%'
        : '0%',
      falseAbstentionRate: abstentions > 0
        ? ((falseAbstentions / abstentions) * 100).toFixed(2) + '%'
        : '0%'
    },
    byCode: metrics.abstention_codes || {},
    openEscalations: (metrics.abstention_escalations || []).filter(e => e.status === 'OPEN').length,
    recentEscalations: (metrics.abstention_escalations || []).slice(-10)
  };
}

/**
 * Check if a confidence level should trigger abstention
 *
 * @param {number} confidence - Confidence level (0-1)
 * @returns {boolean} True if should abstain
 */
function shouldAbstain(confidence) {
  return confidence < CONFIDENCE_THRESHOLD;
}

/**
 * Create a properly formatted STATUS_ABSTAIN response
 *
 * @param {string} code - Abstention code (ABSTAIN_001 - ABSTAIN_008)
 * @param {number} confidence - Calculated confidence (0-0.84)
 * @param {string} primaryReason - Primary reason for abstention
 * @param {array} factors - Array of confidence factors
 * @param {array} suggestedActions - Suggested next actions
 * @param {object} partialInfo - Any partial information available
 * @returns {object} Formatted STATUS_ABSTAIN response
 */
function createAbstainResponse(code, confidence, primaryReason, factors = [], suggestedActions = [], partialInfo = null) {
  if (confidence >= CONFIDENCE_THRESHOLD) {
    throw new Error(`Cannot create abstain response with confidence >= ${CONFIDENCE_THRESHOLD}`);
  }

  if (!ABSTAIN_CODES[code]) {
    throw new Error(`Invalid abstain code: ${code}. Valid codes: ${Object.keys(ABSTAIN_CODES).join(', ')}`);
  }

  return {
    status: 'STATUS_ABSTAIN',
    code: code,
    timestamp: new Date().toISOString(),
    confidence: {
      calculated: confidence,
      threshold: CONFIDENCE_THRESHOLD,
      gap: CONFIDENCE_THRESHOLD - confidence
    },
    reasoning: {
      factors: factors,
      primary_uncertainty: primaryReason
    },
    suggested_actions: suggestedActions,
    partial_information: partialInfo
  };
}

// Add to module exports
module.exports = {
  // ... existing exports ...

  // STATUS_ABSTAIN Protocol exports
  validateAbstainResponse,
  handleAbstention,
  determineFallbackProcedure,
  resolveAbstentionEscalation,
  getAbstentionMetrics,
  shouldAbstain,
  createAbstainResponse,
  ABSTAIN_CODES,
  CONFIDENCE_THRESHOLD
};
```

### 5.2 CLI Commands Addition

Add these CLI commands to the switch statement in `governor_helpers.js`:

```javascript
    // ═══════════════════════════════════════════════════════════════════
    // STATUS_ABSTAIN CLI COMMANDS
    // ═══════════════════════════════════════════════════════════════════

    case 'abstain':
      // node governor_helpers.js abstain Backend_Claude ABSTAIN_001 0.45 "No data found" '{"text":"What is X?"}'
      const [, aAgent, aCode, aConfidence, aReason, aQueryJson] = args;
      const aQuery = aQueryJson ? JSON.parse(aQueryJson) : {};
      const abstainResponse = createAbstainResponse(
        aCode,
        parseFloat(aConfidence),
        aReason,
        [],
        [{ action: 'ESCALATE_HUMAN', reason: 'Manual review needed' }]
      );
      console.log(JSON.stringify(handleAbstention(aAgent, abstainResponse, aQuery), null, 2));
      break;

    case 'abstain-metrics':
      // node governor_helpers.js abstain-metrics [agent] [timeframe]
      const [, amAgent, amTimeframe] = args;
      console.log(JSON.stringify(getAbstentionMetrics(amAgent || null, amTimeframe || '7d'), null, 2));
      break;

    case 'resolve-abstention':
      // node governor_helpers.js resolve-abstention ESC-ABSTAIN-123 "Todd" "answered" '{"answer":"The value is X"}'
      const [, raEscId, raResolver, raResolution, raDetailsJson] = args;
      const raDetails = raDetailsJson ? JSON.parse(raDetailsJson) : {};
      console.log(JSON.stringify(resolveAbstentionEscalation(raEscId, raResolver, raResolution, raDetails), null, 2));
      break;

    case 'abstain-codes':
      // node governor_helpers.js abstain-codes
      console.log('\nSTATUS_ABSTAIN Codes:');
      console.log('─'.repeat(60));
      for (const [code, info] of Object.entries(ABSTAIN_CODES)) {
        console.log(`  ${code}: ${info.name}`);
        console.log(`    ${info.description}`);
        console.log();
      }
      break;

    case 'check-confidence':
      // node governor_helpers.js check-confidence 0.73
      const [, ccConfidence] = args;
      const conf = parseFloat(ccConfidence);
      const shouldAbstainResult = shouldAbstain(conf);
      console.log(`Confidence: ${(conf * 100).toFixed(1)}%`);
      console.log(`Threshold: ${(CONFIDENCE_THRESHOLD * 100).toFixed(1)}%`);
      console.log(`Decision: ${shouldAbstainResult ? 'MUST ABSTAIN' : 'May proceed'}`);
      break;
```

Update the help text:

```javascript
    default:
      console.log(`
Governor Helper Functions CLI

Usage:
  node governor_helpers.js <command> [options]

═══════════════════════════════════════════════════════════════════════════
STANDARD COMMANDS
═══════════════════════════════════════════════════════════════════════════
  [... existing commands ...]

═══════════════════════════════════════════════════════════════════════════
STATUS_ABSTAIN PROTOCOL COMMANDS
═══════════════════════════════════════════════════════════════════════════

  abstain <agent> <code> <confidence> <reason> [query_json]
    Handle an abstention from an agent
    Example: node governor_helpers.js abstain Backend_Claude ABSTAIN_001 0.45 "No data found" '{"text":"Query"}'

  abstain-metrics [agent] [timeframe]
    Get abstention metrics
    Example: node governor_helpers.js abstain-metrics Backend_Claude 7d

  resolve-abstention <escalation_id> <resolver> <resolution> [details_json]
    Resolve an abstention escalation
    Resolutions: answered, no_answer_exists, data_added, false_positive
    Example: node governor_helpers.js resolve-abstention ESC-ABSTAIN-123 "Todd" "answered" '{"answer":"42"}'

  abstain-codes
    Display all STATUS_ABSTAIN codes and their meanings
    Example: node governor_helpers.js abstain-codes

  check-confidence <confidence>
    Check if a confidence level requires abstention
    Example: node governor_helpers.js check-confidence 0.73

═══════════════════════════════════════════════════════════════════════════
CONFIDENCE THRESHOLD RULE
═══════════════════════════════════════════════════════════════════════════

  If retrieval confidence < 85%, agent MUST return STATUS_ABSTAIN.

  This is MANDATORY and NON-NEGOTIABLE.

  Abstaining is CORRECT behavior when uncertain.
  Guessing is FORBIDDEN.

      `);
```

### 5.3 Agent Prompt Template

Create a reusable prompt template file at `/Users/samanthapollack/Documents/TIny_Seed_OS/config/agent_prompts/STATUS_ABSTAIN_BLOCK.md`:

```markdown
# STATUS_ABSTAIN Prompt Block

Copy this block into ALL agent system prompts.

---

## The Block (Copy This Exactly)

```
═══════════════════════════════════════════════════════════════════════════════
CONFIDENCE THRESHOLD PROTOCOL (MANDATORY - READ CAREFULLY)
═══════════════════════════════════════════════════════════════════════════════

RETRIEVAL CONFIDENCE THRESHOLD: 85%

This threshold is MANDATORY and NON-NEGOTIABLE. You are FORBIDDEN from guessing.

FOR EVERY FACTUAL RESPONSE:

1. Calculate your confidence:
   confidence = min(source_reliability, recency, relevance, corroboration)

2. IF confidence >= 0.85 (85%):
   - Proceed with your answer
   - Include confidence level in metadata

3. IF confidence < 0.85 (85%):
   - You MUST return STATUS_ABSTAIN
   - You are FORBIDDEN from guessing
   - Provide the standardized response format below

WHEN YOU MUST ABSTAIN:
- Information not found in available sources
- Data is older than acceptable freshness threshold
- Only partial information available
- Multiple sources conflict with each other
- Query is outside your knowledge domain
- You would need to guess or make assumptions
- External service required but unavailable

STATUS_ABSTAIN RESPONSE FORMAT:
{
  "status": "STATUS_ABSTAIN",
  "code": "[ABSTAIN_001-008]",
  "confidence": {
    "calculated": [your calculated confidence, e.g., 0.62],
    "threshold": 0.85,
    "gap": [0.85 - calculated]
  },
  "reasoning": {
    "primary_uncertainty": "[Main reason you cannot answer]",
    "factors": [
      {"name": "source_reliability", "score": [0-1], "reason": "[why]"},
      {"name": "recency", "score": [0-1], "reason": "[why]"},
      {"name": "relevance", "score": [0-1], "reason": "[why]"},
      {"name": "corroboration", "score": [0-1], "reason": "[why]"}
    ]
  },
  "attempted_sources": ["[sources you checked]"],
  "suggested_actions": [
    {"action": "ESCALATE_HUMAN", "reason": "[when human help needed]"},
    {"action": "CHECK_EXTERNAL", "source": "[source]", "reason": "[why]"}
  ],
  "partial_information": {
    "available": [true/false],
    "summary": "[what partial info you have]",
    "confidence_if_accepted": [confidence of partial info]
  }
}

ABSTENTION CODES:
- ABSTAIN_001: No data found
- ABSTAIN_002: Data is stale/outdated
- ABSTAIN_003: Only partial data available
- ABSTAIN_004: Conflicting data from multiple sources
- ABSTAIN_005: Query outside your domain
- ABSTAIN_006: Query is ambiguous, need clarification
- ABSTAIN_007: Cannot calculate with confidence
- ABSTAIN_008: External service unavailable

REMEMBER:
- Abstaining is CORRECT behavior when uncertain
- Guessing is FORBIDDEN and will be penalized
- An honest "I don't know" is better than a confident wrong answer
- Your credibility depends on accurate confidence calibration

═══════════════════════════════════════════════════════════════════════════════
```

---

## Usage Instructions

1. Copy the block above into every agent's system prompt
2. Place it near the beginning, after role definition
3. For role-specific additions, add them after this block
4. Test with known-unknowable queries to verify behavior
```

---

## Appendix: Response Schemas

### A.1 Complete STATUS_ABSTAIN Response Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "STATUS_ABSTAIN Response",
  "type": "object",
  "required": ["status", "code", "timestamp", "confidence", "reasoning"],
  "properties": {
    "status": {
      "type": "string",
      "const": "STATUS_ABSTAIN"
    },
    "code": {
      "type": "string",
      "enum": ["ABSTAIN_001", "ABSTAIN_002", "ABSTAIN_003", "ABSTAIN_004",
               "ABSTAIN_005", "ABSTAIN_006", "ABSTAIN_007", "ABSTAIN_008"]
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "agent": {
      "type": "string",
      "description": "Agent that generated the abstention"
    },
    "query_id": {
      "type": "string",
      "description": "Unique identifier for the original query"
    },
    "confidence": {
      "type": "object",
      "required": ["calculated", "threshold"],
      "properties": {
        "calculated": {
          "type": "number",
          "minimum": 0,
          "maximum": 0.8499,
          "description": "Must be < 0.85 for abstention"
        },
        "threshold": {
          "type": "number",
          "const": 0.85
        },
        "gap": {
          "type": "number",
          "minimum": 0.0001,
          "description": "threshold - calculated"
        }
      }
    },
    "reasoning": {
      "type": "object",
      "required": ["primary_uncertainty"],
      "properties": {
        "factors": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {"type": "string"},
              "score": {"type": "number", "minimum": 0, "maximum": 1},
              "reason": {"type": "string"}
            }
          }
        },
        "primary_uncertainty": {
          "type": "string",
          "description": "Main reason for abstention"
        }
      }
    },
    "attempted_sources": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Data sources that were checked"
    },
    "suggested_actions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "action": {
            "type": "string",
            "enum": ["ESCALATE_HUMAN", "CHECK_EXTERNAL", "RETRY_LATER",
                     "REQUEST_CLARIFICATION", "ROUTE_TO_AGENT"]
          },
          "source": {"type": "string"},
          "reason": {"type": "string"}
        }
      }
    },
    "partial_information": {
      "type": ["object", "null"],
      "properties": {
        "available": {"type": "boolean"},
        "summary": {"type": "string"},
        "confidence_if_accepted": {"type": "number"}
      }
    }
  }
}
```

### A.2 Escalation Ticket Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Abstention Escalation Ticket",
  "type": "object",
  "required": ["id", "type", "priority", "created", "agent", "abstainCode", "status"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^ESC-ABSTAIN-[0-9]+-[a-f0-9]+$"
    },
    "type": {
      "type": "string",
      "const": "ABSTENTION_ESCALATION"
    },
    "priority": {
      "type": "string",
      "enum": ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    },
    "created": {
      "type": "string",
      "format": "date-time"
    },
    "agent": {"type": "string"},
    "abstainCode": {"type": "string"},
    "abstainCodeName": {"type": "string"},
    "confidence": {"type": "object"},
    "query": {
      "type": "object",
      "properties": {
        "text": {"type": "string"},
        "context": {"type": "object"},
        "user": {"type": "string"}
      }
    },
    "reasoning": {"type": "object"},
    "partialInfo": {"type": ["object", "null"]},
    "suggestedActions": {"type": "array"},
    "attemptedSources": {"type": "array"},
    "status": {
      "type": "string",
      "enum": ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]
    },
    "assignedTo": {"type": ["string", "null"]},
    "resolution": {
      "type": ["string", "null"],
      "enum": [null, "answered", "no_answer_exists", "data_added", "false_positive"]
    },
    "resolutionDetails": {"type": ["object", "null"]},
    "resolvedBy": {"type": ["string", "null"]},
    "resolvedAt": {"type": ["string", "null"], "format": "date-time"}
  }
}
```

---

## Summary

The STATUS_ABSTAIN Protocol establishes a robust system for handling agent uncertainty:

1. **Clear threshold**: 85% confidence required to proceed
2. **Standardized codes**: 8 abstention categories for different scenarios
3. **Audit trail**: All abstentions logged to Governor system
4. **Escalation paths**: Automatic routing to human when needed
5. **Metrics tracking**: Monitor abstention rates and quality
6. **Verification suite**: Tests to ensure proper behavior

**Key Principle:** An honest "I don't know" is infinitely more valuable than a confident wrong answer.

---

*Document Version: 1.0.0*
*Last Updated: 2026-02-12*
*Maintainer: PM_Architect*
