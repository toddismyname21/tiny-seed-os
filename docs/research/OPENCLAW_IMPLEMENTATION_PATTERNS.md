# OpenClaw Implementation Patterns for Tiny Seed OS

**Research Date:** February 12, 2026
**Purpose:** Extract adaptable code patterns from OpenClaw for JavaScript/Google Apps Script
**Based on:** OpenClaw v2026.2.9 architecture and documentation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Skills/Plugin System](#skillsplugin-system)
4. [Persistent Memory Implementation](#persistent-memory-implementation)
5. [Task Verification Patterns](#task-verification-patterns)
6. [State Management Across Sessions](#state-management-across-sessions)
7. [Error Recovery Strategy](#error-recovery-strategy)
8. [Human Escalation Patterns](#human-escalation-patterns)
9. [Message Platform Integration](#message-platform-integration)
10. [Autonomous Task Execution](#autonomous-task-execution)
11. [JavaScript/Apps Script Adaptations](#javascriptapps-script-adaptations)
12. [Implementation Priorities](#implementation-priorities)
13. [Sources](#sources)

---

## Executive Summary

OpenClaw's core innovation is not magic AI - it's **good systems architecture**. The project succeeds by treating:

1. **Events as triggers** (not continuous AI thinking)
2. **Files as source of truth** (not opaque databases)
3. **Serial execution by default** (preventing race conditions)
4. **Explicit human approval** for high-stakes actions

These patterns translate directly to JavaScript/Google Apps Script for Tiny Seed OS.

---

## Architecture Overview

### Two Essential Abstractions

OpenClaw's entire architecture rests on two concepts:

#### 1. Autonomous Invocation with Session Routing

```
trigger → route → run in (session namespace)
```

Multiple activation mechanisms feed into isolated session execution:
- Time-based (cron, heartbeat)
- Event-based (webhooks, file changes)
- Message-based (WhatsApp, Telegram, SMS)
- Voice-based (wake word detection)

#### 2. Externalized Memory with Compaction

> "Treat the LLM context as a cache and disk memory as the source of truth."

The agent only knows what's written to files. Context windows are temporary; durable storage persists.

### Core Components

| Component | Purpose | Tiny Seed Equivalent |
|-----------|---------|---------------------|
| **Gateway** | Central orchestration, WebSocket server | Apps Script Web App API |
| **Agent Runtime** | LLM execution loop | Claude API calls |
| **Channels** | Platform adapters (WhatsApp, Telegram) | SMS/Email handlers |
| **Skills** | Modular capability injection | Skill files in workspace |
| **Memory** | Persistent context storage | Google Sheets + Docs |

### Three Functional Layers

```
┌─────────────────────────────────────────────────────────────┐
│  TRIGGERING                                                   │
│  Time-based, periodic, or event-driven invocation            │
│  (Cron jobs, webhooks, message arrivals)                     │
├─────────────────────────────────────────────────────────────┤
│  PERSISTENT STATE                                             │
│  Append logs, retrieval, summarization/compaction            │
│  (MEMORY.md, daily logs, session transcripts)                │
├─────────────────────────────────────────────────────────────┤
│  SESSION SEMANTICS                                            │
│  Conversation routing, isolation, multi-agent mapping        │
│  (main session, DM sessions, group sessions)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Skills/Plugin System

### SKILL.md Format

OpenClaw skills are **documentation-centric** - markdown files that teach the agent how to use tools.

```markdown
---
name: blogwatcher
description: "Monitor blogs and RSS/Atom feeds for updates."
homepage: https://github.com/example/blogwatcher

clawdbot:
  emoji: "📰"
  requires:
    bins:
      - blogwatcher
  install:
    - id: go
      kind: go
      module: github.com/example/blogwatcher@latest
      bins: blogwatcher
      label: "Install blogwatcher (go)"
---

# Blog Watcher Skill

Quick start: `blogwatcher --help`

## Common Commands

- Add feeds: `blogwatcher add "My Blog" https://example.com`
- List tracked sources: `blogwatcher blogs`
- Check for updates: `blogwatcher scan`

## Usage Notes

Use `blogwatcher <command> --help` to discover flags and options.
```

### Skill Discovery & Precedence

```
Workspace skills (highest priority)
  └─ <workspace>/skills/
User skills
  └─ ~/.openclaw/skills/
Bundled skills (lowest priority)
  └─ <install>/skills/
```

### Skill Caching for Performance

```typescript
// OpenClaw Pattern: Skill snapshot with version hashing
function getSkillsSnapshotVersion(workspaceState) {
  // Hash of file mtimes, directory structure
  return computeHash(workspaceState);
}

const SKILL_CACHE = new Map();

function loadSkills(workspaceId, version) {
  const cacheKey = `${workspaceId}:${version}`;
  if (SKILL_CACHE.has(cacheKey)) {
    return SKILL_CACHE.get(cacheKey);
  }

  const skills = discoverSkills(workspaceId);
  SKILL_CACHE.set(cacheKey, skills);
  return skills;
}
```

### JavaScript/Apps Script Adaptation

```javascript
/**
 * Skill loader for Tiny Seed OS
 * Skills stored in Google Docs with YAML frontmatter
 */

const SKILL_FOLDER_ID = 'your-skills-folder-id';

function loadSkills() {
  const folder = DriveApp.getFolderById(SKILL_FOLDER_ID);
  const files = folder.getFilesByType(MimeType.GOOGLE_DOCS);
  const skills = [];

  while (files.hasNext()) {
    const file = files.next();
    const doc = DocumentApp.openById(file.getId());
    const content = doc.getBody().getText();

    const skill = parseSkillMarkdown(content);
    if (skill.enabled !== false) {
      skills.push(skill);
    }
  }

  return skills;
}

function parseSkillMarkdown(content) {
  // Extract YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const frontmatter = frontmatterMatch ?
    parseYaml(frontmatterMatch[1]) : {};

  // Extract instructions (everything after frontmatter)
  const instructions = content.replace(/^---\n[\s\S]*?\n---\n?/, '');

  return {
    name: frontmatter.name || 'unnamed',
    description: frontmatter.description || '',
    emoji: frontmatter.clawdbot?.emoji || '🔧',
    requires: frontmatter.clawdbot?.requires || {},
    instructions: instructions.trim()
  };
}

function injectRelevantSkills(userMessage, allSkills) {
  // Only inject skills relevant to current task
  const relevantSkills = allSkills.filter(skill =>
    isSkillRelevant(userMessage, skill)
  );

  return relevantSkills.map(s =>
    `## ${s.emoji} ${s.name}\n${s.instructions}`
  ).join('\n\n');
}
```

---

## Persistent Memory Implementation

### Three-Tier Memory Structure

```
~/.openclaw/workspace/
├── MEMORY.md              # Long-term curated memory (durable facts)
├── memory/
│   ├── 2026-02-12.md     # Today's daily log (ephemeral)
│   └── 2026-02-11.md     # Yesterday's daily log
└── sessions/
    └── 2026-02-12-task-name.md  # Session transcripts
```

### MEMORY.md Format

```markdown
# Agent Memory

## User Preferences
- Prefers morning briefings at 6:30 AM
- Communication style: direct, no fluff
- Primary focus: farm operations, CSA logistics

## Project Conventions
- Always use Eastern time zone
- Member IDs are 6-digit format (e.g., 123456)
- Delivery routes organized by day of week

## Critical Facts
- Todd Wilson is the farm owner
- Farm address: 257 Zeigler Rd, Rochester, PA 15074
- Current CSA season: 2026 Summer

## Learned Behaviors
- When asked about weather, check Rochester PA specifically
- Email summaries should be < 3 paragraphs
- Approval requests go to Todd first
```

### Daily Log Format

```markdown
# 2026-02-12 Daily Log

## 08:30 - Morning Brief Generated
- Weather: 45°F, partly cloudy
- 3 urgent emails flagged
- Delivery route optimized: 12 stops

## 10:15 - Member Query Handled
User asked about box customization
- Referred to FAQ section
- Noted: member 234567 wants no cilantro

## 14:00 - Task Completed
Inventory sync completed
- 47 items updated
- 3 discrepancies flagged for review
```

### SQLite Schema (Hybrid Search)

```sql
-- File metadata for incremental indexing
CREATE TABLE files (
  path TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'memory',
  hash TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Chunks with embeddings
CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'memory',
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  hash TEXT NOT NULL,
  model TEXT NOT NULL,
  text TEXT NOT NULL,
  embedding TEXT NOT NULL,  -- JSON-serialized vector
  updated_at INTEGER NOT NULL
);

-- Full-text search via FTS5
CREATE VIRTUAL TABLE chunks_fts USING fts5(
  text, id UNINDEXED, path UNINDEXED
);

-- Vector search extension
CREATE VIRTUAL TABLE vec0 USING vec0(
  id TEXT PRIMARY KEY,
  embedding FLOAT[1536]
);
```

### Hybrid Search Formula

```typescript
// 70% vector (semantic) + 30% BM25 (keyword)
const score = vectorWeight * vectorScore + textWeight * textScore;

// BM25 normalization (lower rank = better)
const normalizedBM25 = 1 / (1 + Math.max(0, bm25Rank));

// Final ranking
const finalScore = 0.7 * cosineSimilarity + 0.3 * normalizedBM25;
```

### Google Apps Script Adaptation

```javascript
/**
 * Memory system for Tiny Seed OS using Google Sheets
 */

const MEMORY_SHEET_ID = 'your-memory-sheet-id';

// Long-term memory stored in "Memory" tab
// Daily logs stored in "DailyLogs" tab
// Session transcripts in "Sessions" tab

function saveToMemory(key, value, category) {
  const sheet = SpreadsheetApp.openById(MEMORY_SHEET_ID)
    .getSheetByName('Memory');

  // Check if key exists
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      rowIndex = i + 1;
      break;
    }
  }

  const now = new Date().toISOString();
  if (rowIndex > 0) {
    // Update existing
    sheet.getRange(rowIndex, 2, 1, 3).setValues([[value, category, now]]);
  } else {
    // Append new
    sheet.appendRow([key, value, category, now]);
  }
}

function searchMemory(query, limit = 5) {
  const sheet = SpreadsheetApp.openById(MEMORY_SHEET_ID)
    .getSheetByName('Memory');
  const data = sheet.getDataRange().getValues();

  // Simple keyword search (enhance with embeddings for production)
  const queryLower = query.toLowerCase();
  const results = data
    .filter(row =>
      row[0].toLowerCase().includes(queryLower) ||
      row[1].toLowerCase().includes(queryLower)
    )
    .slice(0, limit)
    .map(row => ({
      key: row[0],
      value: row[1],
      category: row[2],
      updatedAt: row[3]
    }));

  return results;
}

function appendDailyLog(entry) {
  const sheet = SpreadsheetApp.openById(MEMORY_SHEET_ID)
    .getSheetByName('DailyLogs');

  const today = Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd');
  const time = Utilities.formatDate(new Date(), 'America/New_York', 'HH:mm');

  sheet.appendRow([today, time, entry]);
}

function getTodaysLogs() {
  const sheet = SpreadsheetApp.openById(MEMORY_SHEET_ID)
    .getSheetByName('DailyLogs');
  const data = sheet.getDataRange().getValues();

  const today = Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd');

  return data
    .filter(row => row[0] === today)
    .map(row => `## ${row[1]}\n${row[2]}`)
    .join('\n\n');
}

// Memory flush before context compaction
function flushMemoryBeforeCompaction(conversation) {
  const importantFacts = extractImportantFacts(conversation);

  importantFacts.forEach(fact => {
    saveToMemory(fact.key, fact.value, 'auto-extracted');
  });

  appendDailyLog(`Memory flush: ${importantFacts.length} facts preserved`);
}
```

---

## Task Verification Patterns

### The Verification Problem

> "DEPLOYED !== DONE. The USER must verify functionality works."

OpenClaw distinguishes between:
- **IMPLEMENTED**: Agent claims task complete
- **AWAITING_VERIFICATION**: Needs evidence
- **VERIFIED**: Evidence confirms it works
- **USER_VERIFIED**: Human confirmed functionality

### Verification Evidence Types

| Task Type | Required Evidence |
|-----------|-------------------|
| Bug fix | Test execution + captured output |
| UI change | Screenshot or DOM verification |
| API change | curl response captured |
| Deployment | Live endpoint verification |
| File creation | File exists + parses correctly |
| Email sent | Delivery confirmation |

### Task Verification Implementation

```javascript
/**
 * Task verification system for Tiny Seed OS
 */

const VERIFICATION_REQUIREMENTS = {
  'email_sent': ['delivery_status', 'message_id'],
  'sheet_updated': ['row_count', 'timestamp'],
  'api_call': ['response_code', 'response_body'],
  'file_created': ['file_id', 'file_url'],
  'sms_sent': ['twilio_sid', 'status'],
  'inventory_sync': ['items_updated', 'discrepancies']
};

function verifyTaskCompletion(taskType, taskId, evidence) {
  const required = VERIFICATION_REQUIREMENTS[taskType] || [];

  // Check all required evidence exists
  const missing = required.filter(req => !evidence[req]);

  if (missing.length > 0) {
    return {
      verified: false,
      status: 'AWAITING_VERIFICATION',
      missing: missing,
      message: `Missing evidence: ${missing.join(', ')}`
    };
  }

  // Validate evidence quality
  const validation = validateEvidence(taskType, evidence);

  if (!validation.valid) {
    return {
      verified: false,
      status: 'VERIFICATION_FAILED',
      errors: validation.errors
    };
  }

  // Log successful verification
  logVerification(taskId, taskType, evidence);

  return {
    verified: true,
    status: 'VERIFIED',
    evidence: evidence
  };
}

function validateEvidence(taskType, evidence) {
  const errors = [];

  switch (taskType) {
    case 'email_sent':
      if (evidence.delivery_status !== 'delivered') {
        errors.push(`Email not delivered: ${evidence.delivery_status}`);
      }
      break;

    case 'api_call':
      if (evidence.response_code >= 400) {
        errors.push(`API error: ${evidence.response_code}`);
      }
      break;

    case 'sheet_updated':
      if (evidence.row_count === 0) {
        errors.push('No rows updated');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

// Automatic verification for common operations
function sendEmailWithVerification(recipient, subject, body) {
  try {
    GmailApp.sendEmail(recipient, subject, body);

    // Get sent message for verification
    Utilities.sleep(1000); // Wait for message to appear
    const threads = GmailApp.search(`to:${recipient} subject:"${subject}"`, 0, 1);

    if (threads.length > 0) {
      const message = threads[0].getMessages()[0];
      return {
        success: true,
        evidence: {
          delivery_status: 'delivered',
          message_id: message.getId(),
          timestamp: message.getDate().toISOString()
        }
      };
    }

    return {
      success: false,
      evidence: {
        delivery_status: 'unknown',
        error: 'Could not verify delivery'
      }
    };

  } catch (e) {
    return {
      success: false,
      evidence: {
        delivery_status: 'failed',
        error: e.message
      }
    };
  }
}
```

---

## State Management Across Sessions

### JSONL Session Format

OpenClaw stores sessions as append-only JSONL files:

```jsonl
{"type":"session","id":"abc123","timestamp":"2026-02-12T08:30:00Z","agent":"main"}
{"type":"user","content":"Check today's weather","timestamp":"2026-02-12T08:30:01Z"}
{"type":"assistant","content":"I'll check the weather for Rochester, PA.","timestamp":"2026-02-12T08:30:02Z"}
{"type":"tool_call","tool":"weather_api","args":{"location":"Rochester,PA"},"timestamp":"2026-02-12T08:30:03Z"}
{"type":"tool_result","tool":"weather_api","result":{"temp":45,"conditions":"Partly cloudy"},"timestamp":"2026-02-12T08:30:04Z"}
{"type":"assistant","content":"It's 45°F and partly cloudy in Rochester today.","timestamp":"2026-02-12T08:30:05Z"}
```

### Session Key Structure

```
agent:ID:channel:peer

Examples:
- main:whatsapp:+15555550123
- support:telegram:user_456
- admin:sms:+17175550199
```

### Session Persistence Modes

| Mode | Behavior |
|------|----------|
| `isolated` | Fresh session per conversation (default for DMs) |
| `persistent` | Continuous session across messages (default for main) |

### Lane Queue for Serial Execution

```javascript
/**
 * Lane-based task queue preventing race conditions
 */

class LaneQueue {
  constructor() {
    this.lanes = {
      main: [],      // User messages
      cron: [],      // Scheduled tasks
      subagent: [],  // Child agent tasks
      nested: []     // Agent-initiated follow-ups
    };
    this.processing = {
      main: false,
      cron: false,
      subagent: false,
      nested: false
    };
    this.concurrencyLimits = {
      main: 1,       // Serial by default
      cron: 1,
      subagent: 4,   // Allow parallel subagents
      nested: 2
    };
  }

  enqueue(lane, task) {
    this.lanes[lane].push(task);
    this.processLane(lane);
  }

  async processLane(lane) {
    if (this.processing[lane]) return;
    if (this.lanes[lane].length === 0) return;

    this.processing[lane] = true;

    while (this.lanes[lane].length > 0) {
      const task = this.lanes[lane].shift();

      try {
        await task.execute();
        task.onComplete?.();
      } catch (error) {
        task.onError?.(error);
      }
    }

    this.processing[lane] = false;
  }
}

// Google Apps Script adaptation using Lock Service
function executeWithLock(lockName, fn) {
  const lock = LockService.getScriptLock();

  try {
    // Wait up to 30 seconds for lock
    lock.waitLock(30000);
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// Session-specific locking
function processMessageForSession(sessionKey, message) {
  const lockName = `session_${sessionKey}`;

  return executeWithLock(lockName, () => {
    // Load session state
    const session = loadSession(sessionKey);

    // Process message
    const result = processMessage(session, message);

    // Save updated session
    saveSession(sessionKey, session);

    return result;
  });
}
```

### Google Apps Script Session Storage

```javascript
/**
 * Session management using Google Sheets
 */

const SESSIONS_SHEET_ID = 'your-sessions-sheet-id';

function loadSession(sessionKey) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(`session_${sessionKey}`);

  if (cached) {
    return JSON.parse(cached);
  }

  const sheet = SpreadsheetApp.openById(SESSIONS_SHEET_ID)
    .getSheetByName('Sessions');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === sessionKey) {
      const session = {
        key: data[i][0],
        history: JSON.parse(data[i][1] || '[]'),
        state: JSON.parse(data[i][2] || '{}'),
        updatedAt: data[i][3]
      };

      // Cache for 5 minutes
      cache.put(`session_${sessionKey}`, JSON.stringify(session), 300);
      return session;
    }
  }

  // Return new session
  return {
    key: sessionKey,
    history: [],
    state: {},
    updatedAt: new Date().toISOString()
  };
}

function saveSession(sessionKey, session) {
  const sheet = SpreadsheetApp.openById(SESSIONS_SHEET_ID)
    .getSheetByName('Sessions');
  const data = sheet.getDataRange().getValues();

  session.updatedAt = new Date().toISOString();

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === sessionKey) {
      rowIndex = i + 1;
      break;
    }
  }

  const rowData = [
    sessionKey,
    JSON.stringify(session.history),
    JSON.stringify(session.state),
    session.updatedAt
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, 4).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  // Update cache
  const cache = CacheService.getScriptCache();
  cache.put(`session_${sessionKey}`, JSON.stringify(session), 300);
}

function appendToSessionHistory(sessionKey, entry) {
  const session = loadSession(sessionKey);

  session.history.push({
    ...entry,
    timestamp: new Date().toISOString()
  });

  // Compact if history too long
  if (session.history.length > 50) {
    session.history = compactHistory(session.history);
  }

  saveSession(sessionKey, session);
}

function compactHistory(history) {
  // Keep last 10 messages verbatim
  const recent = history.slice(-10);
  const older = history.slice(0, -10);

  // Summarize older messages
  const summary = {
    type: 'summary',
    content: summarizeMessages(older),
    originalCount: older.length,
    timestamp: new Date().toISOString()
  };

  return [summary, ...recent];
}
```

---

## Error Recovery Strategy

### Exponential Backoff with Cooldown

```javascript
/**
 * Error recovery with exponential backoff
 */

const COOLDOWN_SCHEDULE = [
  60000,     // 1 minute after first failure
  300000,    // 5 minutes
  1500000,   // 25 minutes
  3600000    // 60 minutes (max)
];

class ErrorRecoveryManager {
  constructor() {
    this.failures = {};  // provider -> failure count
    this.cooldowns = {}; // provider -> cooldown end time
  }

  canRetry(provider) {
    const cooldownEnd = this.cooldowns[provider];
    if (cooldownEnd && Date.now() < cooldownEnd) {
      return false;
    }
    return true;
  }

  recordFailure(provider, error) {
    this.failures[provider] = (this.failures[provider] || 0) + 1;

    const failureCount = this.failures[provider];
    const cooldownIndex = Math.min(failureCount - 1, COOLDOWN_SCHEDULE.length - 1);
    const cooldownMs = COOLDOWN_SCHEDULE[cooldownIndex];

    this.cooldowns[provider] = Date.now() + cooldownMs;

    Logger.log(`Provider ${provider} in cooldown for ${cooldownMs/1000}s`);
  }

  recordSuccess(provider) {
    this.failures[provider] = 0;
    delete this.cooldowns[provider];
  }

  getCooldownStatus() {
    const status = {};
    const now = Date.now();

    for (const [provider, endTime] of Object.entries(this.cooldowns)) {
      if (endTime > now) {
        status[provider] = {
          inCooldown: true,
          remainingMs: endTime - now
        };
      }
    }

    return status;
  }
}

// Retry with fallback chain
async function executeWithFallback(providers, operation) {
  const recovery = new ErrorRecoveryManager();
  const errors = [];

  for (const provider of providers) {
    if (!recovery.canRetry(provider)) {
      errors.push({ provider, error: 'In cooldown' });
      continue;
    }

    try {
      const result = await operation(provider);
      recovery.recordSuccess(provider);
      return result;

    } catch (error) {
      recovery.recordFailure(provider, error);
      errors.push({ provider, error: error.message });
    }
  }

  throw new Error(`All providers failed: ${JSON.stringify(errors)}`);
}

// Google Apps Script version (synchronous)
function executeWithFallbackSync(providers, operation) {
  const errors = [];

  for (const provider of providers) {
    const cooldownKey = `cooldown_${provider}`;
    const cooldownEnd = PropertiesService.getScriptProperties()
      .getProperty(cooldownKey);

    if (cooldownEnd && Date.now() < parseInt(cooldownEnd)) {
      errors.push({ provider, error: 'In cooldown' });
      continue;
    }

    try {
      const result = operation(provider);

      // Clear cooldown on success
      PropertiesService.getScriptProperties()
        .deleteProperty(cooldownKey);

      return result;

    } catch (error) {
      // Set cooldown
      const failureKey = `failures_${provider}`;
      const failures = parseInt(
        PropertiesService.getScriptProperties().getProperty(failureKey) || '0'
      ) + 1;

      PropertiesService.getScriptProperties()
        .setProperty(failureKey, failures.toString());

      const cooldownMs = COOLDOWN_SCHEDULE[
        Math.min(failures - 1, COOLDOWN_SCHEDULE.length - 1)
      ];

      PropertiesService.getScriptProperties()
        .setProperty(cooldownKey, (Date.now() + cooldownMs).toString());

      errors.push({ provider, error: error.message });
    }
  }

  throw new Error(`All providers failed: ${JSON.stringify(errors)}`);
}
```

### Context Overflow Recovery

```javascript
/**
 * Handle context overflow with automatic compaction
 */

const MAX_CONTEXT_TOKENS = 100000;
const COMPACTION_THRESHOLD = 0.8;  // Compact at 80% capacity

function handleContextOverflow(session, newMessage) {
  const currentTokens = estimateTokens(session.history);
  const threshold = MAX_CONTEXT_TOKENS * COMPACTION_THRESHOLD;

  if (currentTokens >= threshold) {
    // Trigger memory flush before compaction
    flushMemoryBeforeCompaction(session.history);

    // Compact history
    session.history = compactHistory(session.history);

    Logger.log(`Context compacted: ${currentTokens} -> ${estimateTokens(session.history)} tokens`);
  }

  // Add new message
  session.history.push(newMessage);

  return session;
}

function estimateTokens(messages) {
  // Rough estimate: 4 chars per token
  const totalChars = messages.reduce((sum, msg) =>
    sum + JSON.stringify(msg).length, 0
  );
  return Math.ceil(totalChars / 4);
}
```

---

## Human Escalation Patterns

### Approval Requirements

```javascript
/**
 * Human escalation and approval system
 */

const APPROVAL_REQUIRED_ACTIONS = {
  // Always require approval
  'payment': { always: true, timeout: 3600000 },
  'delete_data': { always: true, timeout: 3600000 },
  'external_publish': { always: true, timeout: 3600000 },

  // Require approval above threshold
  'email_bulk': { threshold: 10, timeout: 1800000 },
  'inventory_change': { threshold: 100, timeout: 1800000 },

  // Require approval for specific conditions
  'shopify_update': {
    conditions: ['price_change', 'product_archive'],
    timeout: 3600000
  }
};

class ApprovalManager {
  constructor() {
    this.pendingApprovals = {};
  }

  requiresApproval(action, params) {
    const config = APPROVAL_REQUIRED_ACTIONS[action];
    if (!config) return false;

    if (config.always) return true;

    if (config.threshold && params.count > config.threshold) {
      return true;
    }

    if (config.conditions) {
      return config.conditions.some(c => params.conditions?.includes(c));
    }

    return false;
  }

  requestApproval(action, params, callback) {
    const approvalId = Utilities.getUuid();

    this.pendingApprovals[approvalId] = {
      action,
      params,
      callback,
      requestedAt: new Date().toISOString(),
      timeout: APPROVAL_REQUIRED_ACTIONS[action]?.timeout || 3600000
    };

    // Store in persistent storage
    this.savePendingApproval(approvalId);

    // Send notification to approver
    this.notifyApprover(approvalId, action, params);

    return approvalId;
  }

  notifyApprover(approvalId, action, params) {
    const approvalUrl = `${getBaseUrl()}?action=approve&id=${approvalId}`;
    const rejectUrl = `${getBaseUrl()}?action=reject&id=${approvalId}`;

    const message = `
🔔 APPROVAL REQUIRED

Action: ${action}
Details: ${JSON.stringify(params, null, 2)}

✅ Approve: ${approvalUrl}
❌ Reject: ${rejectUrl}

This request will expire in ${this.pendingApprovals[approvalId].timeout / 60000} minutes.
    `;

    // Send via configured channel (SMS, email, Slack)
    sendApprovalNotification(message);
  }

  processApproval(approvalId, approved, approverNote) {
    const pending = this.pendingApprovals[approvalId];
    if (!pending) {
      return { error: 'Approval request not found or expired' };
    }

    // Check timeout
    const elapsed = Date.now() - new Date(pending.requestedAt).getTime();
    if (elapsed > pending.timeout) {
      delete this.pendingApprovals[approvalId];
      return { error: 'Approval request expired' };
    }

    // Log the decision
    logApprovalDecision(approvalId, approved, approverNote);

    if (approved) {
      // Execute the approved action
      pending.callback(pending.params);
    }

    delete this.pendingApprovals[approvalId];
    this.deletePendingApproval(approvalId);

    return {
      success: true,
      approved,
      action: pending.action
    };
  }

  savePendingApproval(approvalId) {
    const sheet = SpreadsheetApp.openById(APPROVAL_SHEET_ID)
      .getSheetByName('PendingApprovals');

    const pending = this.pendingApprovals[approvalId];
    sheet.appendRow([
      approvalId,
      pending.action,
      JSON.stringify(pending.params),
      pending.requestedAt,
      pending.timeout
    ]);
  }

  deletePendingApproval(approvalId) {
    const sheet = SpreadsheetApp.openById(APPROVAL_SHEET_ID)
      .getSheetByName('PendingApprovals');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === approvalId) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
  }
}

// Usage in task execution
function executeTaskWithApproval(action, params) {
  const approvalManager = new ApprovalManager();

  if (approvalManager.requiresApproval(action, params)) {
    return {
      status: 'AWAITING_APPROVAL',
      approvalId: approvalManager.requestApproval(
        action,
        params,
        (p) => executeTaskDirect(action, p)
      )
    };
  }

  return executeTaskDirect(action, params);
}
```

### Confidence-Based Escalation

```javascript
/**
 * Escalate to human when confidence is low
 */

const CONFIDENCE_THRESHOLD = 0.7;

function executeWithConfidenceCheck(task, confidence) {
  if (confidence < CONFIDENCE_THRESHOLD) {
    return escalateToHuman(task, confidence);
  }

  return executeTask(task);
}

function escalateToHuman(task, confidence) {
  const escalationId = Utilities.getUuid();

  const message = `
⚠️ LOW CONFIDENCE ESCALATION

Task: ${task.description}
Confidence: ${(confidence * 100).toFixed(1)}%
Threshold: ${(CONFIDENCE_THRESHOLD * 100).toFixed(1)}%

What I understood:
${task.interpretation}

What I'm uncertain about:
${task.uncertainties.map(u => `- ${u}`).join('\n')}

Please clarify or confirm to proceed.
  `;

  sendEscalationNotification(message);

  return {
    status: 'ESCALATED',
    escalationId,
    reason: 'low_confidence',
    confidence
  };
}
```

---

## Message Platform Integration

### Channel Adapter Interface

```javascript
/**
 * Abstract channel adapter interface
 */

class ChannelAdapter {
  constructor(config) {
    this.config = config;
    this.connected = false;
  }

  // Abstract methods - implement per platform
  async connect() { throw new Error('Not implemented'); }
  async disconnect() { throw new Error('Not implemented'); }
  async sendMessage(recipient, message) { throw new Error('Not implemented'); }
  async handleIncoming(rawMessage) { throw new Error('Not implemented'); }

  // Common methods
  normalizeMessage(rawMessage) {
    return {
      id: rawMessage.id || Utilities.getUuid(),
      channel: this.constructor.name,
      sender: this.extractSender(rawMessage),
      text: this.extractText(rawMessage),
      media: this.extractMedia(rawMessage),
      timestamp: new Date().toISOString(),
      raw: rawMessage
    };
  }

  formatOutgoing(message) {
    // Platform-specific formatting
    return message;
  }
}
```

### SMS Channel (Twilio)

```javascript
/**
 * SMS channel adapter using Twilio
 */

class SMSChannelAdapter extends ChannelAdapter {
  constructor(config) {
    super(config);
    this.accountSid = config.TWILIO_ACCOUNT_SID;
    this.authToken = config.TWILIO_AUTH_TOKEN;
    this.fromNumber = config.TWILIO_FROM_NUMBER;
  }

  sendMessage(recipient, message) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;

    const payload = {
      To: recipient,
      From: this.fromNumber,
      Body: message.text
    };

    if (message.mediaUrl) {
      payload.MediaUrl = message.mediaUrl;
    }

    const options = {
      method: 'post',
      payload: payload,
      headers: {
        'Authorization': 'Basic ' + Utilities.base64Encode(
          `${this.accountSid}:${this.authToken}`
        )
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());

    return {
      success: response.getResponseCode() === 201,
      sid: result.sid,
      status: result.status,
      error: result.error_message
    };
  }

  handleIncoming(webhookPayload) {
    return {
      id: webhookPayload.MessageSid,
      channel: 'sms',
      sender: webhookPayload.From,
      text: webhookPayload.Body,
      media: webhookPayload.MediaUrl0 ? [{
        url: webhookPayload.MediaUrl0,
        type: webhookPayload.MediaContentType0
      }] : [],
      timestamp: new Date().toISOString()
    };
  }
}
```

### Email Channel (Gmail)

```javascript
/**
 * Email channel adapter using Gmail API
 */

class EmailChannelAdapter extends ChannelAdapter {
  handleIncoming(emailThread) {
    const messages = emailThread.getMessages();
    const latest = messages[messages.length - 1];

    return {
      id: latest.getId(),
      channel: 'email',
      sender: latest.getFrom(),
      text: latest.getPlainBody(),
      subject: latest.getSubject(),
      threadId: emailThread.getId(),
      attachments: latest.getAttachments().map(a => ({
        name: a.getName(),
        type: a.getContentType(),
        size: a.getSize()
      })),
      timestamp: latest.getDate().toISOString()
    };
  }

  sendMessage(recipient, message) {
    try {
      if (message.threadId) {
        // Reply to thread
        const thread = GmailApp.getThreadById(message.threadId);
        thread.reply(message.text);
      } else {
        // New email
        GmailApp.sendEmail(
          recipient,
          message.subject || 'Message from Tiny Seed OS',
          message.text,
          {
            htmlBody: message.html,
            attachments: message.attachments
          }
        );
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}
```

### Multi-Channel Router

```javascript
/**
 * Route messages to appropriate channel adapters
 */

class ChannelRouter {
  constructor() {
    this.adapters = {
      sms: new SMSChannelAdapter(getConfig()),
      email: new EmailChannelAdapter(getConfig()),
      // Add more channels as needed
    };
  }

  routeIncoming(channel, rawMessage) {
    const adapter = this.adapters[channel];
    if (!adapter) {
      throw new Error(`Unknown channel: ${channel}`);
    }

    // Normalize message
    const message = adapter.handleIncoming(rawMessage);

    // Determine session key
    const sessionKey = this.getSessionKey(channel, message.sender);

    // Route to agent
    return this.routeToAgent(sessionKey, message);
  }

  getSessionKey(channel, sender) {
    return `main:${channel}:${sender}`;
  }

  sendResponse(sessionKey, response) {
    const [agent, channel, recipient] = sessionKey.split(':');

    const adapter = this.adapters[channel];
    if (!adapter) {
      throw new Error(`Unknown channel: ${channel}`);
    }

    return adapter.sendMessage(recipient, response);
  }
}
```

---

## Autonomous Task Execution

### Heartbeat System

```javascript
/**
 * Heartbeat system for proactive autonomous operation
 */

const HEARTBEAT_CONFIG = {
  interval: 30 * 60 * 1000,  // 30 minutes
  activeHours: { start: 6, end: 22 },  // 6 AM - 10 PM
  timezone: 'America/New_York',
  alertThreshold: 0.8
};

function setupHeartbeat() {
  // Create time-based trigger
  ScriptApp.newTrigger('executeHeartbeat')
    .timeBased()
    .everyMinutes(30)
    .create();
}

function executeHeartbeat() {
  // Check if within active hours
  if (!isWithinActiveHours()) {
    Logger.log('Heartbeat skipped: outside active hours');
    return;
  }

  // Load heartbeat checklist
  const checklist = loadHeartbeatChecklist();
  if (!checklist || checklist.length === 0) {
    Logger.log('Heartbeat skipped: empty checklist');
    return;
  }

  // Execute each check
  const results = checklist.map(check => executeCheck(check));

  // Determine if alert needed
  const alerts = results.filter(r => r.needsAlert);

  if (alerts.length > 0) {
    sendHeartbeatAlert(alerts);
  } else {
    Logger.log('Heartbeat OK: all checks passed');
  }

  // Log heartbeat execution
  appendDailyLog(`Heartbeat executed: ${results.length} checks, ${alerts.length} alerts`);
}

function loadHeartbeatChecklist() {
  // Load from HEARTBEAT.md or Sheet
  const doc = DocumentApp.openById(HEARTBEAT_DOC_ID);
  const content = doc.getBody().getText();

  // Parse checklist items
  const items = content.split('\n')
    .filter(line => line.trim().startsWith('-'))
    .map(line => ({
      task: line.replace(/^-\s*/, '').trim(),
      enabled: !line.includes('[disabled]')
    }))
    .filter(item => item.enabled);

  return items;
}

function executeCheck(check) {
  // Use Claude to interpret and execute check
  const prompt = `
Execute this monitoring check and report results:

Check: ${check.task}

Available tools:
- fetchUrl(url): Fetch a URL and return status/content
- querySheet(sheetId, range): Query data from a sheet
- getEmailCount(query): Count emails matching query
- checkDiskUsage(): Get disk usage percentage

Return JSON with:
- status: "ok" | "warning" | "critical"
- message: Brief description of findings
- details: Any relevant data
  `;

  const result = callClaudeWithTools(prompt);

  return {
    check: check.task,
    ...result,
    needsAlert: result.status !== 'ok'
  };
}

function isWithinActiveHours() {
  const now = new Date();
  const hour = parseInt(Utilities.formatDate(
    now,
    HEARTBEAT_CONFIG.timezone,
    'H'
  ));

  return hour >= HEARTBEAT_CONFIG.activeHours.start &&
         hour < HEARTBEAT_CONFIG.activeHours.end;
}
```

### Cron Task Scheduling

```javascript
/**
 * Cron-like task scheduling
 */

const SCHEDULED_TASKS = {
  'morning_brief': {
    schedule: '0 6 * * *',  // 6 AM daily
    handler: 'generateMorningBrief',
    enabled: true
  },
  'weekly_report': {
    schedule: '0 9 * * 1',  // 9 AM Mondays
    handler: 'generateWeeklyReport',
    enabled: true
  },
  'inventory_sync': {
    schedule: '0 */4 * * *',  // Every 4 hours
    handler: 'syncInventory',
    enabled: true
  }
};

function setupScheduledTasks() {
  // Clear existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction().startsWith('scheduledTask_')) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new triggers based on config
  Object.entries(SCHEDULED_TASKS).forEach(([taskId, config]) => {
    if (!config.enabled) return;

    const { hour, minute, dayOfWeek } = parseCronSchedule(config.schedule);

    if (dayOfWeek !== null) {
      // Weekly task
      ScriptApp.newTrigger(`scheduledTask_${taskId}`)
        .timeBased()
        .onWeekDay(dayOfWeek)
        .atHour(hour)
        .nearMinute(minute)
        .create();
    } else {
      // Daily or hourly task
      if (hour === '*') {
        ScriptApp.newTrigger(`scheduledTask_${taskId}`)
          .timeBased()
          .everyHours(parseInt(minute))
          .create();
      } else {
        ScriptApp.newTrigger(`scheduledTask_${taskId}`)
          .timeBased()
          .atHour(hour)
          .nearMinute(minute)
          .everyDays(1)
          .create();
      }
    }
  });
}

function scheduledTask_morning_brief() {
  executeScheduledTask('morning_brief');
}

function executeScheduledTask(taskId) {
  const config = SCHEDULED_TASKS[taskId];
  if (!config || !config.enabled) return;

  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    Logger.log(`Executing scheduled task: ${taskId}`);

    // Create isolated session for this task
    const sessionKey = `cron:${taskId}:${Date.now()}`;

    // Execute handler
    const result = this[config.handler]();

    // Log completion
    appendDailyLog(`Scheduled task ${taskId} completed: ${JSON.stringify(result)}`);

    return result;

  } catch (e) {
    Logger.log(`Scheduled task ${taskId} failed: ${e.message}`);
    appendDailyLog(`Scheduled task ${taskId} FAILED: ${e.message}`);

    // Notify on failure
    sendTaskFailureAlert(taskId, e);

  } finally {
    lock.releaseLock();
  }
}
```

---

## JavaScript/Apps Script Adaptations

### Key Differences from TypeScript

| OpenClaw (TypeScript) | Tiny Seed (Apps Script) |
|-----------------------|-------------------------|
| SQLite + sqlite-vec | Google Sheets + Cache |
| Node.js async/await | Synchronous execution |
| Local file system | Google Drive |
| WebSocket channels | HTTP endpoints + webhooks |
| Docker sandboxing | Script isolation |
| npm packages | Libraries + UrlFetchApp |

### Equivalent Storage Patterns

```javascript
// OpenClaw: SQLite
// Tiny Seed: Google Sheets + CacheService

// Memory storage
const STORAGE = {
  memory: 'MEMORY_SHEET_ID',
  sessions: 'SESSIONS_SHEET_ID',
  approvals: 'APPROVALS_SHEET_ID',
  logs: 'LOGS_SHEET_ID'
};

// Cache layer for performance
function getCachedOrFetch(key, fetchFn, ttl = 300) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(key);

  if (cached) {
    return JSON.parse(cached);
  }

  const value = fetchFn();
  cache.put(key, JSON.stringify(value), ttl);
  return value;
}
```

### Embedding Alternatives

```javascript
// OpenClaw: node-llama-cpp or OpenAI embeddings
// Tiny Seed: Use Claude for semantic search or simple keyword matching

function semanticSearch(query, documents) {
  // Option 1: Claude-based semantic ranking
  const prompt = `
Rank these documents by relevance to the query.
Return JSON array of indices in order of relevance.

Query: ${query}

Documents:
${documents.map((d, i) => `[${i}] ${d}`).join('\n')}

Return: [indices in relevance order]
  `;

  const response = callClaude(prompt);
  const rankedIndices = JSON.parse(response);

  return rankedIndices.map(i => documents[i]);
}

// Option 2: Keyword-based (cheaper, faster)
function keywordSearch(query, documents) {
  const queryWords = query.toLowerCase().split(/\s+/);

  return documents
    .map((doc, index) => {
      const docLower = doc.toLowerCase();
      const score = queryWords.filter(word =>
        docLower.includes(word)
      ).length;
      return { doc, score, index };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.doc);
}
```

---

## Implementation Priorities

### Phase 1: Foundation (Week 1)

1. **Session Management**
   - Implement session storage in Sheets
   - Add session key routing
   - Build history compaction

2. **Memory System**
   - Create MEMORY sheet structure
   - Implement daily logs
   - Build simple search

3. **Lane Queue**
   - Implement Lock-based serial execution
   - Prevent race conditions

### Phase 2: Intelligence (Week 2)

4. **Skills Loading**
   - Create skill document format
   - Build skill discovery
   - Implement context injection

5. **Error Recovery**
   - Add exponential backoff
   - Implement provider fallbacks
   - Build cooldown system

### Phase 3: Autonomy (Week 3)

6. **Heartbeat System**
   - Set up monitoring triggers
   - Build checklist execution
   - Implement alert routing

7. **Task Verification**
   - Define evidence requirements
   - Build verification checks
   - Add human confirmation flow

### Phase 4: Channels (Week 4)

8. **Human Escalation**
   - Build approval workflow
   - Add notification channels
   - Implement timeout handling

9. **Multi-Channel**
   - Add SMS adapter (Twilio)
   - Enhance email handling
   - Build channel router

---

## Sources

### Official Documentation
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [OpenClaw Skills](https://docs.openclaw.ai/tools/skills)
- [OpenClaw Memory](https://docs.openclaw.ai/concepts/memory)
- [OpenClaw Agent Loop](https://docs.openclaw.ai/concepts/agent-loop)

### Technical Deep Dives
- [Deep Dive: How OpenClaw's Memory System Works](https://snowan.gitbook.io/study-notes/ai-blogs/openclaw-memory-system-deep-dive)
- [OpenClaw Is Not Magic; It's Just Good Architecture](https://labs.adaline.ai/p/openclaw-architecture-not-magic)
- [Decoding OpenClaw: The Surprising Elegance of Two Simple Abstractions](https://binds.ch/blog/openclaw-systems-analysis/)
- [OpenClaw Architecture Overview](https://ppaolo.substack.com/p/openclaw-system-architecture-overview)
- [OpenClaw Agentic Framework: Heartbeat Monitoring](https://saulius.io/blog/openclaw-autonomous-ai-agent-framework-heartbeat-monitoring)

### Memory Architecture
- [Agentic AI: OpenClaw Memory Architecture Explained](https://medium.com/@shivam.agarwal.in/agentic-ai-openclaw-moltbot-clawdbots-memory-architecture-explained-61c3b9697488)
- [OpenClaw Memory Architecture - Daily Notes and Long-Term Memory](https://zenvanriel.nl/ai-engineer-blog/openclaw-memory-architecture-guide/)
- [Local-First RAG: Using SQLite for AI Agent Memory](https://www.pingcap.com/blog/local-first-rag-using-sqlite-ai-agent-memory-openclaw/)

### Error Recovery & Security
- [Model Selection and Failover](https://deepwiki.com/openclaw/openclaw/5.4-model-selection-and-failover)
- [Tool Security and Sandboxing](https://deepwiki.com/openclaw/openclaw/6.2-tool-security-and-sandboxing)
- [OpenClaw Error Troubleshooting](https://www.aifreeapi.com/en/posts/openclaw-error-troubleshooting-center)

### Channel Integrations
- [OpenClaw Channel Comparison](https://zenvanriel.nl/ai-engineer-blog/openclaw-channel-comparison-telegram-whatsapp-signal/)
- [WhatsApp Integration](https://deepwiki.com/openclaw/openclaw/8.2-whatsapp-integration)
- [Channels Documentation](https://deepwiki.com/openclaw/openclaw/8-channels)

### Tutorials & Guides
- [You Could've Invented OpenClaw](https://gist.github.com/dabit3/bc60d3bea0b02927995cd9bf53c3db32)
- [We Built Persistent Memory for OpenClaw](https://mem0.ai/blog/mem0-memory-for-openclaw)
- [Setting Up Skills In OpenClaw](https://nwosunneoma.medium.com/setting-up-skills-in-openclaw-d043b76303be)

---

*Research compiled February 12, 2026*
*Patterns adapted for JavaScript/Google Apps Script implementation*
