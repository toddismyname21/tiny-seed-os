# STATE OF THE ART: Multi-Agent Claude Coordination System

## Tiny Seed Farm OS - Production Architecture

**Created:** 2026-01-24
**Owner Directive:** "NO SHORTCUTS. STATE OF THE ART. SO SMART IT KNOWS WHAT I SHOULD DO BEFORE ME."

---

## EXECUTIVE SUMMARY

This document defines the production-ready architecture for coordinating 13+ Claude sessions with:
- **Real-time synchronization** between agents
- **Zero file conflicts** through distributed locking
- **Persistent memory** across session restarts
- **Autonomous orchestration** with minimal human intervention
- **Proactive intelligence** that anticipates owner needs

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TINY SEED FARM AI BRAIN                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ORCHESTRATION LAYER                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ Claude-Flow  │  │   PM2/tmux   │  │   Watchdog   │               │   │
│  │  │ (Swarm Mgmt) │  │  (Persistence)│  │  (Health)    │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────┴───────────────────────────────────┐   │
│  │                    COMMUNICATION LAYER                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │   MCP        │  │   Redis      │  │  PostgreSQL  │               │   │
│  │  │  (Protocol)  │  │  (Pub/Sub)   │  │  (Locks)     │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────┴───────────────────────────────────┐   │
│  │                      MEMORY LAYER                                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │   Qdrant     │  │   SQLite     │  │   Mem0       │               │   │
│  │  │  (Vectors)   │  │ (Checkpoints)│  │  (Long-term) │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────┴───────────────────────────────────┐   │
│  │                      AGENT LAYER (13 Specialists)                    │   │
│  │                                                                      │   │
│  │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │   │
│  │   │Backend  │ │UX Design│ │Field Ops│ │Financial│ │Sales CRM│      │   │
│  │   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘      │   │
│  │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │   │
│  │   │Inventory│ │ Grants  │ │Security │ │Social   │ │Mobile   │      │   │
│  │   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘      │   │
│  │   ┌─────────┐ ┌─────────┐ ┌─────────┐                              │   │
│  │   │Accounting│ │Business│ │Don KB   │                              │   │
│  │   └─────────┘ └─────────┘ └─────────┘                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PROBLEM → SOLUTION MATRIX

| Problem | Solution | Tool | Production Ready |
|---------|----------|------|------------------|
| **No real-time sync** | Redis Pub/Sub + MCP Protocol | Redis + MCP | YES |
| **Context window death** | Checkpoint to SQLite + Mem0 | SQLite + Mem0 | YES |
| **File conflicts** | Git worktrees + PostgreSQL locks | Git + PostgreSQL | YES |
| **Owner is bottleneck** | Claude-Flow autonomous orchestration | Claude-Flow | YES |
| **INBOX staleness** | File watcher + auto-cleanup | Chokidar | YES |
| **Phone PM vs Desktop PM** | Single orchestrator pattern | Claude-Flow | YES |
| **Sessions die on sleep** | tmux/screen persistence | tmux | YES |

---

## LAYER 1: SESSION PERSISTENCE (tmux/screen)

### Problem
Mac sleep, terminal close, or SSH disconnect kills Claude sessions.

### Solution
Run all Claude sessions inside **tmux** sessions that persist.

### Implementation

```bash
# Install tmux
brew install tmux

# Create persistent session for each Claude
tmux new-session -d -s backend "cd /Users/samanthapollack/Documents/TIny_Seed_OS && claude"
tmux new-session -d -s frontend "cd /Users/samanthapollack/Documents/TIny_Seed_OS && claude"
tmux new-session -d -s field-ops "cd /Users/samanthapollack/Documents/TIny_Seed_OS && claude"
# ... repeat for all 13

# List all sessions
tmux list-sessions

# Attach to a session
tmux attach -t backend

# Detach (keeps running): Ctrl+B, then D
```

### Automation Script

```bash
#!/bin/bash
# start-all-claudes.sh

SESSIONS=(
  "backend"
  "ux-design"
  "field-ops"
  "financial"
  "sales-crm"
  "inventory"
  "grants"
  "security"
  "social-media"
  "mobile"
  "accounting"
  "business"
  "don-kb"
)

PROJECT_DIR="/Users/samanthapollack/Documents/TIny_Seed_OS"

for session in "${SESSIONS[@]}"; do
  if ! tmux has-session -t "$session" 2>/dev/null; then
    echo "Starting $session..."
    tmux new-session -d -s "$session" "cd $PROJECT_DIR && claude"
  else
    echo "$session already running"
  fi
done

echo "All Claude sessions started. Use 'tmux attach -t <name>' to connect."
```

---

## LAYER 2: REAL-TIME COMMUNICATION (Redis Pub/Sub)

### Problem
Agents can't communicate in real-time. They only leave messages in files.

### Solution
Redis Pub/Sub for instant message delivery between agents.

### Implementation

```bash
# Install Redis
brew install redis
brew services start redis
```

```javascript
// coordination-server.js
const Redis = require('ioredis');
const pub = new Redis();
const sub = new Redis();

// Agent channels
const CHANNELS = {
  ALL: 'claude:broadcast',
  BACKEND: 'claude:backend',
  FRONTEND: 'claude:frontend',
  // ... etc
};

// Subscribe to messages
sub.subscribe(CHANNELS.ALL, CHANNELS.BACKEND);

sub.on('message', (channel, message) => {
  const msg = JSON.parse(message);
  console.log(`[${channel}] ${msg.from}: ${msg.content}`);

  // Notify the appropriate Claude session
  notifyAgent(msg.to, msg);
});

// Publish a message
function sendMessage(from, to, content) {
  const channel = to === 'ALL' ? CHANNELS.ALL : CHANNELS[to.toUpperCase()];
  pub.publish(channel, JSON.stringify({
    from,
    to,
    content,
    timestamp: new Date().toISOString()
  }));
}

// Example: Backend notifies Frontend of API change
sendMessage('backend', 'frontend', 'API endpoint changed: getChefProfile now uses Customers sheet');
```

### MCP Integration

```javascript
// MCP server for Claude to call
const mcpServer = {
  tools: {
    'send_message': {
      description: 'Send message to another Claude agent',
      parameters: {
        to: { type: 'string', enum: ['backend', 'frontend', 'all', ...] },
        content: { type: 'string' }
      },
      handler: async ({ to, content }) => {
        sendMessage(getCurrentAgentId(), to, content);
        return { sent: true };
      }
    },
    'check_messages': {
      description: 'Check for new messages',
      handler: async () => {
        return getUnreadMessages(getCurrentAgentId());
      }
    }
  }
};
```

---

## LAYER 3: FILE CONFLICT PREVENTION (Git Worktrees + Locks)

### Problem
Two agents edit MERGED TOTAL.js simultaneously = conflict.

### Solution
Git worktrees for isolation + PostgreSQL advisory locks for shared files.

### Git Worktrees Setup

```bash
# Create worktrees for each agent
cd /Users/samanthapollack/Documents/TIny_Seed_OS

git worktree add ../agent-backend -b agent/backend
git worktree add ../agent-frontend -b agent/frontend
git worktree add ../agent-field-ops -b agent/field-ops
# ... etc

# Each agent works in their own directory
# Backend: /Users/samanthapollack/Documents/agent-backend
# Frontend: /Users/samanthapollack/Documents/agent-frontend
```

### PostgreSQL File Locking

```sql
-- Create lock table
CREATE TABLE file_locks (
  file_path TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  locked_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 minutes'
);

-- Acquire lock
INSERT INTO file_locks (file_path, agent_id)
VALUES ('/apps_script/MERGED TOTAL.js', 'backend')
ON CONFLICT (file_path) DO NOTHING
RETURNING *;

-- Release lock
DELETE FROM file_locks WHERE file_path = $1 AND agent_id = $2;

-- Auto-cleanup expired locks
DELETE FROM file_locks WHERE expires_at < NOW();
```

### Lock MCP Tool

```javascript
const lockTools = {
  'acquire_file_lock': {
    description: 'Lock a file before editing',
    parameters: { file_path: { type: 'string' } },
    handler: async ({ file_path }) => {
      const result = await db.query(
        `INSERT INTO file_locks (file_path, agent_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING
         RETURNING *`,
        [file_path, getCurrentAgentId()]
      );
      return { locked: result.rowCount > 0 };
    }
  },
  'release_file_lock': {
    description: 'Release a file lock after editing',
    parameters: { file_path: { type: 'string' } },
    handler: async ({ file_path }) => {
      await db.query(
        'DELETE FROM file_locks WHERE file_path = $1 AND agent_id = $2',
        [file_path, getCurrentAgentId()]
      );
      return { released: true };
    }
  }
};
```

---

## LAYER 4: PERSISTENT MEMORY (Mem0 + SQLite)

### Problem
Claude loses all memory when context fills or session ends.

### Solution
Checkpoint state to SQLite + Mem0 for long-term memory.

### SQLite Checkpoints

```javascript
const Database = require('better-sqlite3');
const db = new Database('claude-memory.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    state JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    decision TEXT NOT NULL,
    context TEXT,
    outcome TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

// Save checkpoint before context fills
function saveCheckpoint(agentId, state) {
  db.prepare(`
    INSERT INTO checkpoints (agent_id, state) VALUES (?, ?)
  `).run(agentId, JSON.stringify(state));
}

// Restore on new session
function getLastCheckpoint(agentId) {
  return db.prepare(`
    SELECT state FROM checkpoints
    WHERE agent_id = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(agentId);
}
```

### Mem0 Integration

```python
from mem0 import Memory

# Initialize Mem0
memory = Memory()

# Store a memory
memory.add(
  "Backend Claude fixed the getChefProfile endpoint - now uses Customers sheet",
  user_id="tiny-seed-farm",
  metadata={"agent": "backend", "category": "api-fix"}
)

# Retrieve relevant memories
relevant = memory.search(
  "What changes were made to chef endpoints?",
  user_id="tiny-seed-farm"
)
```

---

## LAYER 5: AUTONOMOUS ORCHESTRATION (Claude-Flow)

### Problem
Owner manually manages 13 sessions = bottleneck.

### Solution
Claude-Flow swarm with hierarchical coordination.

### Installation

```bash
npm install -g @anthropic-ai/claude-code
npm install -g claude-flow@v3alpha
npx claude-flow@v3alpha init
```

### Configuration

```yaml
# claude-flow.yaml
swarm:
  topology: hierarchical
  max_agents: 13
  strategy: enterprise

queen:
  name: pm-architect
  role: Orchestrator
  capabilities:
    - task_decomposition
    - agent_spawning
    - conflict_resolution
    - priority_management

workers:
  - name: backend
    role: Backend Developer
    domain: apps_script/*.js

  - name: frontend
    role: Frontend Developer
    domain: web_app/*.html

  - name: field-ops
    role: Field Operations
    domain: planning, succession, crops

  # ... etc for all 13

communication:
  protocol: redis-pubsub
  fallback: file-based

memory:
  primary: sqlite
  long_term: mem0
  vectors: qdrant

file_locking:
  backend: postgresql
  timeout: 30m
```

### Startup

```bash
# Start the daemon (runs in background, survives terminal close)
npx claude-flow@v3alpha daemon start

# Initialize the swarm
npx claude-flow@v3alpha coordination swarm-init

# Monitor
npx claude-flow@v3alpha status
```

---

## LAYER 6: PROACTIVE INTELLIGENCE

### Problem
System is reactive - owner must tell it what to do.

### Solution
Event-driven triggers + predictive intelligence.

### Event Triggers

```javascript
// proactive-brain.js
const triggers = [
  // Time-based
  { type: 'schedule', cron: '0 6 * * *', action: 'morning_briefing' },
  { type: 'schedule', cron: '0 18 * * *', action: 'end_of_day_summary' },

  // Event-based
  { type: 'file_change', path: 'apps_script/*.js', action: 'notify_frontend' },
  { type: 'inbox_message', action: 'route_to_agent' },
  { type: 'git_push', action: 'run_tests' },

  // Condition-based
  { type: 'weather', condition: 'frost_warning', action: 'alert_field_ops' },
  { type: 'inventory', condition: 'low_stock', action: 'alert_owner' }
];

// Decision engine
async function decide(event) {
  const confidence = await predictBestAction(event);

  if (confidence > 0.9) {
    // Act autonomously
    await executeAction(event.action);
  } else if (confidence > 0.7) {
    // Act but notify owner
    await executeAction(event.action);
    await notifyOwner(`Executed: ${event.action}`);
  } else {
    // Ask owner
    await askOwner(`Should I: ${event.action}?`);
  }
}
```

### Morning Briefing Generator

```javascript
async function generateMorningBriefing() {
  const briefing = {
    weather: await getWeatherForecast(),
    tasks_completed_overnight: await getCompletedTasks(),
    tasks_pending: await getPendingTasks(),
    blockers: await getBlockers(),
    recommendations: await generateRecommendations()
  };

  // Prioritize with RICE scoring
  briefing.priority_order = prioritizeTasks(briefing.tasks_pending);

  // Send to owner via preferred channel
  await sendToOwner(formatBriefing(briefing));
}
```

---

## IMPLEMENTATION ROADMAP

### Week 1: Foundation
- [ ] Install Redis, PostgreSQL
- [ ] Set up tmux automation script
- [ ] Create coordination-server.js
- [ ] Test pub/sub messaging

### Week 2: File Coordination
- [ ] Set up git worktrees for all 13 agents
- [ ] Implement PostgreSQL file locking
- [ ] Create MCP tools for lock/unlock
- [ ] Test multi-agent editing

### Week 3: Memory Persistence
- [ ] Set up SQLite checkpoint database
- [ ] Integrate Mem0
- [ ] Create checkpoint/restore MCP tools
- [ ] Test session recovery

### Week 4: Orchestration
- [ ] Install Claude-Flow
- [ ] Configure swarm topology
- [ ] Set up daemon with PM2
- [ ] Test autonomous task distribution

### Week 5: Proactive Intelligence
- [ ] Implement event triggers
- [ ] Create morning briefing generator
- [ ] Set up confidence-based decision engine
- [ ] Test autonomous operations

---

## QUICK START (Today)

### Minimum Viable Coordination

```bash
# 1. Install dependencies
brew install redis tmux
brew services start redis
npm install -g claude-flow@v3alpha

# 2. Create tmux sessions
./start-all-claudes.sh

# 3. Start Claude-Flow daemon
npx claude-flow@v3alpha daemon start

# 4. Initialize swarm
npx claude-flow@v3alpha coordination swarm-init --topology hierarchical --max-agents 13

# 5. Monitor
npx claude-flow@v3alpha status
```

---

## OWNER INTERVENTION LEVELS

| Level | Owner Action | System Handles |
|-------|-------------|----------------|
| **Level 0** | Nothing | Everything - fully autonomous |
| **Level 1** | Approve critical decisions | Task distribution, coordination, routine work |
| **Level 2** | Set daily priorities | Agent management, conflict resolution |
| **Level 3** | Start sessions | Task execution, communication |
| **Level 4** | Manual management | Individual tasks only |

**Target: Level 1** - Owner only approves critical decisions, system handles everything else.

---

## SOURCES

### Real-Time Sync
- Redis Pub/Sub: https://redis.io/docs/latest/develop/pubsub/
- MCP Protocol: https://modelcontextprotocol.io/
- A2A Protocol: https://a2a-protocol.org/

### Multi-Agent Frameworks
- Claude-Flow: https://github.com/ruvnet/claude-flow
- CC Mirror: https://github.com/numman-ali/cc-mirror
- AWS Agent Squad: https://github.com/awslabs/agent-squad

### Memory Persistence
- Mem0: https://mem0.ai/
- Anthropic Memory Tool: https://docs.anthropic.com/
- Zep: https://www.getzep.com/

### Session Persistence
- tmux: https://github.com/tmux/tmux
- OpenSSH: https://www.openssh.org/
- PM2: https://pm2.keymetrics.io/

### Orchestration
- Temporal.io: https://temporal.io/
- Kagent: https://kagent.dev/
- LangGraph: https://www.langchain.com/langgraph

---

## OWNER DIRECTIVE COMPLIANCE

> "NO SHORTCUTS. STATE OF THE ART. SO SMART IT KNOWS WHAT I SHOULD DO BEFORE ME."

This architecture delivers:
- **No shortcuts**: Production-grade tools (Redis, PostgreSQL, Claude-Flow)
- **State of the art**: Latest protocols (MCP, A2A), frameworks (Claude-Flow, Mem0)
- **Proactive intelligence**: Event-driven triggers, confidence-based autonomy
- **Anticipates needs**: Morning briefings, predictive task prioritization

---

*PM_Architect Claude - Multi-Agent Architecture Complete*
*Ready for implementation.*
