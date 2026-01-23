# Planning Assistant Research: AI Architectures & Best Practices

**Research Date:** January 23, 2026
**Purpose:** Document state-of-the-art AI assistant architectures for building a production-grade farm planning assistant
**Focus:** Natural language understanding for commands like "Move the Tomato Plantings to JS6"

---

## Table of Contents

1. [Conversational AI Patterns](#1-conversational-ai-patterns)
2. [Intent Recognition & Entity Extraction](#2-intent-recognition--entity-extraction)
3. [Context-Aware AI Architecture](#3-context-aware-ai-architecture)
4. [Confirmation & Preview Patterns](#4-confirmation--preview-patterns)
5. [Error Handling & Graceful Degradation](#5-error-handling--graceful-degradation)
6. [Real-Time Data Integration](#6-real-time-data-integration)
7. [Leading AI Assistant Case Studies](#7-leading-ai-assistant-case-studies)
8. [Recommended Architecture for Farm Planning](#8-recommended-architecture-for-farm-planning)

---

## 1. Conversational AI Patterns

### Modern Architecture Paradigms (2025-2026)

The conversational AI landscape has evolved significantly. The era of simple chatbots has given way to **agentic AI systems** that can reason, plan, and execute complex multi-step workflows.

#### Hybrid Orchestrator-Workers Pattern

The dominant pattern in 2025-2026 is the **Orchestrator-Workers architecture**:

```
User Request
     |
     v
+------------------+
|   Orchestrator   |  <-- Central reasoning engine
+------------------+
    |    |    |
    v    v    v
+-----+ +-----+ +-----+
|Worker|Worker|Worker|  <-- Specialized models
+-----+ +-----+ +-----+
    |    |    |
    v    v    v
+------------------+
|   Result Fusion  |
+------------------+
```

**Key characteristics:**
- Central reasoning engine delegates subtasks to specialized models
- Orchestrator decides which "worker" handles each task
- Results are validated and stitched together
- Human input requested when confidence is low

**Application to Farm Planning:**
- Orchestrator parses "Move Tomato Plantings to JS6"
- Worker 1: Entity extraction (crop: Tomato, destination: JS6)
- Worker 2: Validation (check if JS6 exists, is available)
- Worker 3: Conflict detection (what's currently planned for JS6)

#### Multi-Agent Systems

For complex farm planning, a **multi-agent system** provides:

| Pattern | Description | Use Case |
|---------|-------------|----------|
| **Hierarchical** | Manager delegates to specialized workers | Complex operations across modules |
| **Sequential Pipeline** | Agent A passes to Agent B | Research -> Plan -> Validate -> Execute |
| **Collaborative/Debate** | Agents discuss and critique | Reduces hallucinations in critical decisions |

**Example for Farm Planning:**
```
User: "Move the Tomato Plantings to JS6"
     |
Agent 1 (Parser): Extracts intent + entities
     |
Agent 2 (Validator): Checks constraints
     |
Agent 3 (Planner): Creates execution plan
     |
Agent 4 (Reviewer): Validates the plan
     |
Final Output: Confirmation preview
```

#### Control Plane Pattern

A **Control Plane** acts as a governing layer that manages, routes, and monitors all tool interactions:

- Provides modularity, consistency, and scalability
- Ensures agents don't invoke tools independently without oversight
- Critical for production systems with destructive operations

**Sources:**
- [AI Chatbot Architecture: Building Scalable Systems](https://medium.com/@Mobisoft.Infotech/ai-chatbot-architecture-building-scalable-conversational-systems-253189a45d3d)
- [The Ultimate Guide to AI Agent Architectures 2025](https://dev.to/sohail-akbar/the-ultimate-guide-to-ai-agent-architectures-in-2025-2j1c)
- [Agentic AI Design Patterns Enterprise Guide](https://www.aufaitux.com/blog/agentic-ai-design-patterns-enterprise-guide/)

---

## 2. Intent Recognition & Entity Extraction

### Core Concepts

**Intent Recognition** identifies the user's goal:
- "Move the Tomato Plantings to JS6" -> Intent: `MOVE_PLANTING`
- "What beds are available in Field A?" -> Intent: `QUERY_AVAILABILITY`
- "Cancel all succession plantings for Lettuce" -> Intent: `CANCEL_PLANTINGS`

**Entity Extraction** identifies specific data:
- Crop: "Tomato"
- Field: "JS6"
- Date: "next week"
- Quantity: "3 beds"

### Intent Design Best Practices

#### 1. Clear, Action-Oriented Intent Names

```javascript
const INTENTS = {
  // Planting operations
  MOVE_PLANTING: 'move_planting',
  CREATE_PLANTING: 'create_planting',
  DELETE_PLANTING: 'delete_planting',
  UPDATE_PLANTING: 'update_planting',

  // Query operations
  QUERY_BEDS: 'query_beds',
  QUERY_PLANTINGS: 'query_plantings',
  QUERY_AVAILABILITY: 'query_availability',

  // Batch operations
  BULK_MOVE: 'bulk_move',
  BULK_RESCHEDULE: 'bulk_reschedule'
};
```

#### 2. Entity Schema for Farm Planning

```javascript
const ENTITY_TYPES = {
  CROP: {
    type: 'crop',
    synonyms: true,  // "Tomatoes" = "Tomato" = "Cherry Tomato"
    examples: ['Tomato', 'Lettuce', 'Kale']
  },
  FIELD_ID: {
    type: 'field_id',
    pattern: /^[A-Z]{1,3}\d{1,2}$/,  // JS6, A1, GH12
    examples: ['JS6', 'A1', 'B3']
  },
  DATE: {
    type: 'date',
    formats: ['next week', 'March 15', '3/15/2026', 'in 2 weeks']
  },
  QUANTITY: {
    type: 'quantity',
    unit: 'beds',
    examples: ['3 beds', 'all', 'half']
  }
};
```

#### 3. Training Data Balance

Maintain **balanced examples** per intent to avoid classifier bias:

```
MOVE_PLANTING: 50 examples
CREATE_PLANTING: 50 examples
DELETE_PLANTING: 50 examples
QUERY_BEDS: 50 examples
```

**Key insight:** Strong imbalance leads to biased classifiers. Hyperparameter optimization can cushion negative effects, but balanced datasets are the best solution.

### Modern Approaches: LLM-Based Intent Classification

With modern LLMs, you can use **structured output** instead of training traditional NLU models:

```javascript
const intentSchema = {
  type: 'object',
  properties: {
    intent: {
      type: 'string',
      enum: ['move_planting', 'create_planting', 'query_beds', 'cancel_planting']
    },
    entities: {
      type: 'object',
      properties: {
        crop: { type: 'string' },
        source_field: { type: 'string' },
        destination_field: { type: 'string' },
        date: { type: 'string' },
        quantity: { type: 'number' }
      }
    },
    confidence: { type: 'number' }
  }
};
```

### Synonym Handling for Farm Context

```javascript
const CROP_SYNONYMS = {
  'tomato': ['tomatoes', 'cherry tomato', 'beefsteak', 'heirloom tomato'],
  'lettuce': ['lettuces', 'salad mix', 'salanova', 'head lettuce'],
  'kale': ['lacinato', 'dinosaur kale', 'curly kale']
};

const FIELD_SYNONYMS = {
  'JS6': ['john\'s south 6', 'south field 6'],
  'GH1': ['greenhouse 1', 'the greenhouse', 'main greenhouse']
};
```

**Sources:**
- [Rasa NLU: Intent Classification](https://rasa.com/blog/rasa-nlu-in-depth-part-1-intent-classification/)
- [Microsoft: Intent Recognition and Entity Extraction](https://learn.microsoft.com/en-us/power-platform/well-architected/intelligent-application/language)
- [Leveraging Intent-Entity Relationships](https://link.springer.com/article/10.1007/s00521-024-09927-0)

---

## 3. Context-Aware AI Architecture

### The Context Engineering Challenge

As agents operate over multiple turns and longer time horizons, **context engineering** becomes critical. It's the art of curating what goes into the limited context window from the constantly evolving universe of possible information.

### State Management Patterns

#### Pattern 1: Context-Aware State Machine (Manus Approach)

Manus uses a **context-aware state machine** to manage tool availability:

```javascript
const STATE_MACHINE = {
  IDLE: {
    availableTools: ['query_beds', 'query_plantings', 'start_planning'],
    transitions: {
      'start_planning': 'PLANNING'
    }
  },
  PLANNING: {
    availableTools: ['move_planting', 'create_planting', 'preview_changes', 'cancel'],
    transitions: {
      'preview_changes': 'CONFIRMING',
      'cancel': 'IDLE'
    }
  },
  CONFIRMING: {
    availableTools: ['confirm', 'modify', 'cancel'],
    transitions: {
      'confirm': 'EXECUTING',
      'cancel': 'IDLE'
    }
  }
};
```

**Key technique:** Rather than removing tools, mask token logits during decoding to prevent/enforce selection of certain actions based on current state.

#### Pattern 2: Tiered Memory Architecture

```
+----------------------+
|   Working Memory     |  <-- Current conversation, immediate context
+----------------------+
          |
+----------------------+
|   Episodic Memory    |  <-- Past interactions, user preferences
+----------------------+
          |
+----------------------+
|   Semantic Memory    |  <-- Domain knowledge, farm rules
+----------------------+
          |
+----------------------+
|  Procedural Memory   |  <-- How to perform tasks
+----------------------+
```

**Implementation for Farm Planning:**

```javascript
const context = {
  // Working Memory - Current session
  working: {
    currentPlantings: [...],  // What user is working with
    pendingChanges: [...],     // Uncommitted modifications
    conversationHistory: [...]  // Recent messages
  },

  // Episodic Memory - Past sessions
  episodic: {
    userPreferences: { defaultField: 'A', preferredView: 'calendar' },
    recentOperations: [...],  // Last 50 operations
    commonPatterns: [...]      // "Usually moves lettuce to GH in winter"
  },

  // Semantic Memory - Domain knowledge
  semantic: {
    cropRequirements: { tomato: { minTemp: 50, fullSun: true } },
    fieldCharacteristics: { JS6: { irrigated: true, rowFeet: 300 } },
    rotationRules: [...]
  }
};
```

#### Pattern 3: Session-Based Architecture (Google ADK)

Treat the **Session as ground truth**; the working context is a computed projection:

```javascript
class PlanningSession {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.events = [];  // Immutable event log
    this.checkpoints = [];  // Snapshots for recovery
  }

  // Compute current state from events
  getWorkingContext() {
    return this.events.reduce((state, event) => {
      return applyEvent(state, event);
    }, initialState);
  }

  // Project only relevant context for the LLM
  getProjectedContext(query) {
    const fullContext = this.getWorkingContext();
    return {
      relevantPlantings: filterByQuery(fullContext.plantings, query),
      recentHistory: this.events.slice(-10),
      systemState: fullContext.summary
    };
  }
}
```

### Context Window Optimization

**Best practices for managing large context:**

1. **Keep recent messages in full** (last 5-7 turns)
2. **Compress older messages** into summaries
3. **Preserve system message** and key decisions
4. **Handle large data as artifacts** (reference IDs, not full data)

```javascript
function optimizeContext(messages, maxTokens) {
  const recent = messages.slice(-7);  // Keep full
  const older = messages.slice(0, -7);

  const compressed = older.length > 0
    ? [{ role: 'system', content: summarize(older) }]
    : [];

  return [...compressed, ...recent];
}
```

**Sources:**
- [Context Engineering for AI Agents: Lessons from Building Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
- [Google: Architecting Efficient Context-Aware Multi-Agent Framework](https://developers.googleblog.com/architecting-efficient-context-aware-multi-agent-framework-for-production/)
- [Anthropic: Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

---

## 4. Confirmation & Preview Patterns

### The Golden Rule: Show Changes Before Executing

Users must understand exactly what will happen before destructive operations execute.

### Pattern 1: Diff-Based Preview

**Most effective for planners:** Show proposed changes as diffs:

```
Here are the proposed changes:

PLANTING MOVES:
  - Tomato (Row 1-3) | JS2 → JS6 | Week 12
  + Tomato (Row 1-3) | JS6       | Week 12

  - Tomato (Row 4-6) | JS2 → JS6 | Week 14
  + Tomato (Row 4-6) | JS6       | Week 14

AFFECTED BEDS:
  JS2: 6 beds freed (now available weeks 12-20)
  JS6: 6 beds occupied (was empty)

CONFLICTS: None detected

Reply 'apply' to confirm, or describe modifications needed.
```

**Why this works:**
- Easier to scan than prose descriptions
- Easier to verify correctness
- Easier to make decisions

### Pattern 2: Staged Checkpoints

For complex operations, build in stages with explicit pause points:

```
I'll move the Tomato plantings in stages:

Stage 1: Validate destination (JS6)
  ✓ JS6 exists
  ✓ Has 6 available beds
  ✓ Irrigation compatible

Stage 2: Check conflicts
  → Running...

Reply 'continue' to proceed
Reply 'modify [what]' to adjust
Reply 'cancel' to abort
```

### Pattern 3: Smart Defaults with Confirmation

State inferred defaults and ask for confirmation:

```
Here's what I understand about this move:

  Source: All Tomato plantings in JS2 (6 beds, rows 1-6)
  Destination: JS6
  Timing: Keep original planting dates (weeks 12 and 14)
  Successions: Move all 2 succession plantings together

Edit any details above that need changing, or reply 'looks good' to proceed.
```

**Key insight:** Starting with 80% filled in is better than starting empty. Users can quickly scan, fix what's wrong, and move forward.

### Pattern 4: Inline Action Preview

For inline edits within a larger view:

```
┌─────────────────────────────────────────────────────┐
│ Week 12 | JS2                                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Tomato (3 beds) → MOVING TO JS6                 │ │
│ │ [Preview] [Apply] [Cancel]                      │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Week 12 | JS6                                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ← Tomato arriving (3 beds)                      │ │
│ │ Currently: Empty                                │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Undo & Rollback Capabilities

Always provide escape hatches:

```javascript
const OPERATION_LOG = {
  operations: [
    {
      id: 'op_12345',
      type: 'MOVE_PLANTING',
      timestamp: '2026-01-23T10:30:00Z',
      before: { field: 'JS2', beds: [1,2,3] },
      after: { field: 'JS6', beds: [1,2,3] },
      undoAvailable: true
    }
  ],

  undo(operationId) {
    const op = this.operations.find(o => o.id === operationId);
    return this.applyChange(op.after, op.before);  // Reverse
  }
};
```

**Sources:**
- [7 Prompt UX Patterns for Quicker Decisions with AI](https://blog.mariohayashi.com/p/7-prompt-ux-patterns-to-help-you)
- [AI UX Patterns: Inline Action](https://www.shapeof.ai/patterns/inline-action)
- [10 UX Design Patterns for AI Accuracy and Trust](https://www.cmswire.com/digital-experience/10-ux-design-patterns-that-improve-ai-accuracy-and-customer-trust/)

---

## 5. Error Handling & Graceful Degradation

### Error Categories for Farm Planning

| Error Type | Description | Example |
|------------|-------------|---------|
| **Technical** | API failures, network issues | Google Sheets API timeout |
| **Semantic** | AI misunderstands intent | "Move tomatoes" when multiple varieties exist |
| **Recognition** | Entity extraction fails | "Move it to the back field" (which field?) |
| **Validation** | Request violates constraints | Move to bed that's already occupied |
| **Business Rule** | Violates farm logic | Plant warm-season crop in winter slot |

### Graceful Degradation Principles

1. **Errors don't crash the agent** - Continue operating with reduced capability
2. **Agents understand what went wrong** - Clear feedback on failure reason
3. **Retry logic for transient failures** - Automatic recovery for network issues
4. **Security through input validation** - Prevent injection attacks

### Handling Ambiguous Requests

**The Clarification Flow:**

```
User: "Move the tomatoes to the back"

Assistant Analysis:
  - Intent: MOVE_PLANTING (high confidence)
  - Crop: "tomatoes" -> Multiple matches found
    - Cherry Tomato (JS2, 3 beds)
    - Beefsteak Tomato (JS3, 4 beds)
    - San Marzano (GH1, 2 beds)
  - Destination: "the back" -> Ambiguous
    - Could be: JS6, JS7, B4 (all "back" fields)

Assistant Response:
  I found multiple tomato plantings. Which would you like to move?

  1. Cherry Tomato (3 beds in JS2)
  2. Beefsteak Tomato (4 beds in JS3)
  3. San Marzano (2 beds in GH1)
  4. All tomato varieties

  And which field is "the back"?
  - JS6 (John's South, back section)
  - JS7 (John's South, far back)
  - B4 (Barn field, back)
```

### Slot Filling for Missing Information

When required information is missing, use **progressive slot filling**:

```javascript
const MOVE_PLANTING_SLOTS = {
  crop: { required: true, filled: false, value: null },
  source_field: { required: false, filled: false, value: null },  // Can infer
  destination_field: { required: true, filled: false, value: null },
  quantity: { required: false, filled: false, value: 'all', default: true }
};

function checkSlots(slots) {
  const missing = Object.entries(slots)
    .filter(([_, slot]) => slot.required && !slot.filled)
    .map(([name, _]) => name);

  if (missing.length > 0) {
    return generateClarificationQuestion(missing);
  }
  return null;  // All required slots filled
}
```

### Error Recovery Patterns

#### Circuit Breaker for External Services

```javascript
class CircuitBreaker {
  constructor(threshold = 5, resetTimeout = 30000) {
    this.failures = 0;
    this.threshold = threshold;
    this.resetTimeout = resetTimeout;
    this.state = 'CLOSED';  // CLOSED, OPEN, HALF_OPEN
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is open. Service temporarily unavailable.');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      setTimeout(() => { this.state = 'HALF_OPEN'; }, this.resetTimeout);
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
}
```

#### User-Friendly Error Messages

```javascript
const ERROR_MESSAGES = {
  FIELD_NOT_FOUND: {
    technical: "Field ID 'XYZ' not found in FIELDS sheet",
    user: "I couldn't find a field called 'XYZ'. Did you mean JS6, A1, or B3?",
    suggestions: ['JS6', 'A1', 'B3']  // Fuzzy matches
  },
  BED_OCCUPIED: {
    technical: "Beds 1-3 in JS6 already have plantings for weeks 12-16",
    user: "JS6 already has Lettuce planted in beds 1-3 during that time. Would you like to:\n1. Move to different beds (4-6 are available)\n2. Choose a different field\n3. Adjust the timing",
    options: ['different_beds', 'different_field', 'adjust_timing']
  },
  API_TIMEOUT: {
    technical: "Google Sheets API timeout after 30s",
    user: "I'm having trouble connecting to the farm database. Retrying in a moment...",
    retryable: true
  }
};
```

### Escalation and Human Handoff

For complex or high-stakes decisions:

```javascript
const ESCALATION_TRIGGERS = {
  // Low confidence in understanding
  LOW_CONFIDENCE: (score) => score < 0.7,

  // High-impact operations
  BULK_DELETE: (count) => count > 10,

  // Business-critical timing
  PEAK_SEASON: (date) => isPlantingPeakSeason(date),

  // Financial impact
  HIGH_VALUE_CROP: (crop) => crop.valuePerBed > 500
};

function checkEscalation(operation, context) {
  if (ESCALATION_TRIGGERS.LOW_CONFIDENCE(operation.confidence)) {
    return {
      escalate: true,
      reason: "I'm not confident I understood this correctly",
      suggestion: "Could you rephrase or provide more details?"
    };
  }
  // ... check other triggers
}
```

**Sources:**
- [Error Handling and Fallback Mechanisms in AI Assistants](https://www.nexusflowinnovations.com/blog/error-handling-fallback-mechanisms-ai-assistants)
- [Fail-Safe Patterns for AI Agent Workflows](https://engineersmeetai.substack.com/p/fail-safe-patterns-for-ai-agent-workflows)
- [Probing For Clarification - Must-Have Skill for AI Assistant](https://www.haptik.ai/tech/probing-clarification-skill-ai-assistant)

---

## 6. Real-Time Data Integration

### Google Sheets as Backend: Patterns & Best Practices

#### Understanding Real-Time in Sheets Context

Google Sheets is not a streaming database. "Real-time" typically means:
- **Polling:** Checking for changes every few seconds
- **Triggers:** Apps Script triggers on edit/change
- **Webhooks:** Push notifications on updates

#### Data Synchronization Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Planning Assistant                     │
├──────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
│  │   Intent    │   │   Entity    │   │  Execution  │    │
│  │  Recognizer │ → │  Extractor  │ → │   Engine    │    │
│  └─────────────┘   └─────────────┘   └─────────────┘    │
│         │                                    │           │
│         │         ┌─────────────┐           │           │
│         └────────→│   Context   │←──────────┘           │
│                   │    Cache    │                        │
│                   └─────────────┘                        │
│                          ↑↓                              │
├──────────────────────────────────────────────────────────┤
│                   Sync Layer                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │
│  │  Read Cache │   │ Write Queue │   │  Conflict   │    │
│  │   (fast)    │   │  (batched)  │   │  Resolver   │    │
│  └─────────────┘   └─────────────┘   └─────────────┘    │
├──────────────────────────────────────────────────────────┤
│                Google Sheets API                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  PLANTINGS | FIELDS | CROPS | SUCCESSIONS       │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

#### Caching Strategy for Responsiveness

```javascript
class SheetDataCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 30000;  // 30 second TTL
    this.lastSync = null;
  }

  async getPlantings(forceRefresh = false) {
    const cached = this.cache.get('plantings');

    if (!forceRefresh && cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;  // Return cached data
    }

    // Fetch fresh data
    const data = await sheetsAPI.getValues('Plantings!A:Z');
    this.cache.set('plantings', {
      data: this.parseRows(data),
      timestamp: Date.now()
    });

    return this.cache.get('plantings').data;
  }

  invalidate(sheetName) {
    this.cache.delete(sheetName.toLowerCase());
  }
}
```

#### Write Batching for Performance

```javascript
class WriteQueue {
  constructor() {
    this.queue = [];
    this.flushInterval = 2000;  // Batch writes every 2 seconds
    this.maxBatchSize = 50;

    setInterval(() => this.flush(), this.flushInterval);
  }

  add(operation) {
    this.queue.push(operation);

    // Flush immediately if batch is full
    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.maxBatchSize);

    // Group by sheet for efficient batch update
    const grouped = this.groupBySheet(batch);

    for (const [sheet, operations] of Object.entries(grouped)) {
      await sheetsAPI.batchUpdate(sheet, operations);
    }
  }
}
```

### RAG (Retrieval-Augmented Generation) for Farm Data

For complex queries, use **RAG** to pull relevant context:

```javascript
async function handleComplexQuery(userQuery) {
  // 1. Retrieve relevant data
  const relevantPlantings = await searchPlantings(userQuery);
  const relevantFields = await searchFields(userQuery);
  const relevantHistory = await searchOperationHistory(userQuery);

  // 2. Augment the prompt with retrieved context
  const augmentedPrompt = `
    USER QUERY: ${userQuery}

    RELEVANT PLANTINGS:
    ${formatPlantings(relevantPlantings)}

    RELEVANT FIELDS:
    ${formatFields(relevantFields)}

    RECENT OPERATIONS:
    ${formatHistory(relevantHistory)}

    Based on this context, respond to the user's query.
  `;

  // 3. Generate response
  return await llm.complete(augmentedPrompt);
}
```

### MCP (Model Context Protocol) Integration

**MCP** provides a standardized way to connect AI models to data sources:

```javascript
// MCP Server definition for Farm Planning
const farmPlanningMCP = {
  name: 'farm-planning',
  version: '1.0.0',
  tools: [
    {
      name: 'get_plantings',
      description: 'Retrieve plantings filtered by crop, field, or date range',
      inputSchema: {
        type: 'object',
        properties: {
          crop: { type: 'string' },
          field: { type: 'string' },
          dateRange: { type: 'object', properties: { start: {}, end: {} } }
        }
      }
    },
    {
      name: 'move_planting',
      description: 'Move a planting to a different field',
      inputSchema: {
        type: 'object',
        properties: {
          plantingId: { type: 'string', required: true },
          destinationField: { type: 'string', required: true }
        }
      }
    }
  ]
};
```

**Benefits of MCP:**
- Universal protocol - implement once, integrate with many AI tools
- Complexity grows linearly (not geometrically) as you add services
- Standard way to handle authentication, rate limiting, errors

**Sources:**
- [Connecting Google Sheets to AI Applications](https://www.klavis.ai/use-case/connecting-google-sheets-to-ai-applications-real-world-use-cases-for-developers)
- [CrewAI Google Sheets Integration](https://docs.crewai.com/en/enterprise/integrations/google_sheets)
- [Anthropic: Model Context Protocol](https://docs.anthropic.com/en/docs/build-with-claude/mcp)

---

## 7. Leading AI Assistant Case Studies

### Cursor AI: Deep Codebase Understanding

**Architecture Insights:**

Cursor is not a VS Code extension - it's a complete **fork of VS Code**, built with TypeScript for business logic and Rust for performance-critical components.

**Key Techniques Applicable to Farm Planning:**

1. **Whole-Project Context**: Cursor considers the entire codebase when making suggestions, using `@files` and `@folders` for explicit referencing alongside proactive indexing.

   **Farm Application:** Index all sheets (plantings, fields, crops) and allow references like `@plantings`, `@field:JS6`

2. **Composer Mode**: Creates entire applications based on descriptions by looking at the whole project and matching style.

   **Farm Application:** "Create a succession plan for summer tomatoes" could generate a full planting schedule matching existing patterns.

3. **Task Simplification**: The trick is figuring out what the LLM is good at and designing prompts/tools around limitations. Often means using smaller models for sub-tasks.

   **Farm Application:** Use fast model for intent classification, powerful model for complex planning logic.

### GitHub Copilot: Language Server Architecture

**Architecture Insights:**

Copilot runs as a **language server** built in Node.js/TypeScript, communicating via JSON-RPC protocol.

**Key Techniques:**

1. **Agent Mode**: Goes from reactive to proactive. Instead of waiting for cues, agents think in terms of goals.

   **Farm Application:** Proactively suggest "It's time to start your tomato successions based on last year's schedule"

2. **Multi-File Editing**: In agent mode, proposes plans (routes, middleware, migrations) and edits multiple files in one sweep.

   **Farm Application:** "Set up irrigation schedule" could update FIELDS sheet, create IRRIGATION_TASKS, and modify PLANTINGS with water requirements.

### Notion AI: Workspace-Aware Agents (2025)

**Architecture Insights:**

Notion 3.0 (September 2025) introduced **autonomous agents** that work for up to 20 minutes, performing multi-step tasks across hundreds of pages.

**Key Techniques:**

1. **Autonomous Execution**: Agents execute complex, multi-step workflows without constant user intervention.

   **Farm Application:** "Prepare next week's planting schedule" runs autonomously: checks seed inventory, availability, weather forecast, creates tasks.

2. **Deep Integration**: Pulls context from Slack, Google Drive, GitHub, within user's permission model.

   **Farm Application:** Integrate weather API, seed supplier inventory, market price data.

3. **Database Actions**: Create/edit pages, update databases, coordinate multi-step tasks across the workspace.

   **Farm Application:** Direct integration with farm's Google Sheets structure.

### Clockwise: Natural Language Calendar Management

**Architecture Insights:**

Clockwise interprets natural-language requests like "move my one-on-ones to tomorrow" and turns them into schedule changes.

**Key Techniques:**

1. **Intent + Constraint Resolution**: "Find 30 minutes with the team leads" requires understanding intent AND checking constraints (availability, preferences).

   **Farm Application:** "Find 3 beds for lettuce next week" checks field availability, soil conditions, rotation rules.

2. **Context-Aware Defaults**: Uses focus settings and existing commitments to place work appropriately.

   **Farm Application:** Use crop requirements, field history, season to suggest optimal placements.

**Sources:**
- [How Cursor AI IDE Works](https://blog.sshh.io/p/how-cursor-ai-ide-works)
- [Cursor vs GitHub Copilot](https://www.builder.io/blog/cursor-vs-github-copilot)
- [Notion 3.0 AI Agents](https://skywork.ai/blog/notion-3-ai-agents-2025/)
- [Clockwise AI Calendar](https://www.getclockwise.com/ai)

---

## 8. Recommended Architecture for Farm Planning

### Proposed Architecture: Agentic Farm Planning Assistant

Based on the research, here is the recommended architecture:

```
┌────────────────────────────────────────────────────────────────┐
│                    PLANNING ASSISTANT                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                   ORCHESTRATOR                           │ │
│  │  - Intent Classification (LLM with structured output)    │ │
│  │  - Entity Extraction (crop, field, date, quantity)       │ │
│  │  - State Machine (IDLE → PLANNING → CONFIRMING → DONE)   │ │
│  │  - Tool Selection & Routing                              │ │
│  └──────────────────────────────────────────────────────────┘ │
│         │              │              │              │         │
│         ▼              ▼              ▼              ▼         │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   │
│  │  Query   │   │  Move    │   │  Create  │   │ Validate │   │
│  │  Agent   │   │  Agent   │   │  Agent   │   │  Agent   │   │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   │
│         │              │              │              │         │
│         └──────────────┴──────────────┴──────────────┘         │
│                              │                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                   CONTEXT LAYER                          │ │
│  │  - Working Memory (current session, pending changes)     │ │
│  │  - Data Cache (plantings, fields, crops - 30s TTL)       │ │
│  │  - User Preferences (default field, common patterns)     │ │
│  │  - Domain Knowledge (crop requirements, rotation rules)  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                              │                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                   EXECUTION LAYER                        │ │
│  │  - Preview Generator (diff-based, before/after)          │ │
│  │  - Confirmation Handler (staged checkpoints)             │ │
│  │  - Write Queue (batched operations)                      │ │
│  │  - Undo Manager (operation log with rollback)            │ │
│  └──────────────────────────────────────────────────────────┘ │
│                              │                                 │
├────────────────────────────────────────────────────────────────┤
│                   GOOGLE SHEETS BACKEND                        │
│  PLANTINGS | FIELDS | CROPS | SUCCESSIONS | BEDS              │
└────────────────────────────────────────────────────────────────┘
```

### Implementation Priorities

#### Phase 1: Core Intent & Entity System

```javascript
// 1. Define intent schema with structured output
const intentSchema = {
  intent: { enum: ['move_planting', 'create_planting', 'query', 'cancel'] },
  entities: {
    crop: { type: 'string' },
    sourceField: { type: 'string' },
    destinationField: { type: 'string' },
    date: { type: 'string' },
    quantity: { type: 'number' }
  },
  confidence: { type: 'number' },
  clarificationNeeded: { type: 'array', items: { type: 'string' } }
};

// 2. Handle the request
async function handleRequest(userMessage) {
  // Parse intent and entities
  const parsed = await parseIntent(userMessage, intentSchema);

  // Check if clarification needed
  if (parsed.clarificationNeeded.length > 0) {
    return generateClarificationQuestion(parsed);
  }

  // Validate and preview
  const validation = await validateOperation(parsed);
  if (!validation.valid) {
    return formatValidationError(validation);
  }

  // Generate preview
  const preview = await generatePreview(parsed);
  return preview;
}
```

#### Phase 2: Context-Aware State Management

```javascript
class PlanningSession {
  constructor() {
    this.state = 'IDLE';
    this.pendingOperation = null;
    this.context = {
      recentPlantings: [],
      cachedFields: null,
      userPreferences: {}
    };
  }

  transition(action) {
    const transitions = {
      'IDLE': { 'start_planning': 'PLANNING' },
      'PLANNING': { 'preview': 'CONFIRMING', 'cancel': 'IDLE' },
      'CONFIRMING': { 'confirm': 'EXECUTING', 'modify': 'PLANNING', 'cancel': 'IDLE' },
      'EXECUTING': { 'complete': 'IDLE', 'error': 'PLANNING' }
    };

    const newState = transitions[this.state]?.[action];
    if (newState) {
      this.state = newState;
      return true;
    }
    return false;
  }
}
```

#### Phase 3: Preview & Confirmation

```javascript
function generatePreview(operation) {
  const before = getCurrentState(operation.entities);
  const after = applyOperation(before, operation);

  return {
    type: 'preview',
    summary: `Move ${operation.entities.crop} from ${before.field} to ${after.field}`,
    changes: [
      { type: 'remove', field: before.field, details: formatBeds(before) },
      { type: 'add', field: after.field, details: formatBeds(after) }
    ],
    conflicts: detectConflicts(after),
    affectedItems: countAffected(operation),
    actions: ['confirm', 'modify', 'cancel']
  };
}
```

### Key Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Intent accuracy | > 95% | Correct intent classification |
| Entity extraction | > 90% | All entities correctly extracted |
| Clarification rate | < 10% | Requests needing clarification |
| Error recovery | 100% | All errors handled gracefully |
| User confirmation | < 2 steps | From request to execution |
| Response time | < 2 seconds | For simple operations |

### Technology Recommendations

| Component | Recommended Technology | Rationale |
|-----------|----------------------|-----------|
| LLM | Claude (Anthropic) | Excellent function calling, structured output |
| Intent/Entity | LLM structured output | No separate NLU model needed |
| State Management | In-memory + checkpoints | Fast, recoverable |
| Data Layer | Google Sheets API v4 | Native integration with existing backend |
| Caching | In-memory with TTL | Simple, effective for farm scale |
| Preview | Diff-based rendering | Clear, scannable format |

---

## Conclusion

Building a production-grade farm planning assistant requires:

1. **Robust Intent & Entity System** - Use modern LLM structured output instead of traditional NLU
2. **Context-Aware State Machine** - Manage conversation flow and tool availability
3. **Diff-Based Previews** - Always show changes before executing
4. **Graceful Error Handling** - Clarification questions, slot filling, circuit breakers
5. **Efficient Data Integration** - Caching, batching, RAG for Google Sheets backend
6. **Learned Patterns from Leaders** - Cursor's codebase awareness, Notion's autonomous agents, Clockwise's natural language

The architecture should prioritize user trust through transparency (always preview), reliability through graceful degradation, and efficiency through intelligent caching and batching.

---

**Next Steps:**
- Document detailed function calling patterns with Claude
- Design the specific intent/entity taxonomy for farm operations
- Create wireframes for confirmation/preview UI
- Build proof-of-concept with core move/query operations