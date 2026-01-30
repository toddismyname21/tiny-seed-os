# Claude Flow Setup Guide for Tiny Seed Farm OS

**Created:** 2026-01-23
**Purpose:** Multi-agent orchestration with persistent memory
**Status:** Research Complete - Ready for Installation

---

## What is Claude Flow?

Claude Flow is the leading agent orchestration platform for Claude, enabling:
- **Multi-agent swarms** with 60+ specialized agent types
- **Hierarchical coordination** with a single coordinator enforcing alignment
- **Persistent SQLite memory** for cross-session state management
- **Self-learning capabilities** via SONA neural adaptation
- **MCP integration** for native Claude Code support

### Key Statistics (v3 - January 2026)
- 500,000+ downloads
- 100,000+ monthly active users
- 84.8% SWE-Bench solve rate
- 30-50% token reduction
- 150x-12,500x faster memory retrieval via HNSW indexing

---

## Installation

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+ or Bun 1.0+
- Claude Code installed (`npm install -g @anthropic-ai/claude-code`)

### Quick Install (4 Commands)

```bash
# 1. Ensure Claude Code is installed
npm install -g @anthropic-ai/claude-code

# 2. Enable dangerous permissions for automation
claude --dangerously-skip-permissions

# 3. Install Claude Flow v3 alpha
npm install -g claude-flow@v3alpha

# 4. Initialize in project directory
cd /Users/samanthapollack/Documents/TIny_Seed_OS
npx claude-flow@v3alpha init
```

### Alternative: Using Bun (Faster)

```bash
bun add -g claude-flow@v3alpha
bunx claude-flow@v3alpha init
```

### Verify Installation

```bash
claude-flow --version
claude-flow hive status
claude-flow mcp tools list
```

---

## Hierarchical Configuration for Tiny Seed Farm OS

### Initialize with PM_Architect as Coordinator

```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS

# Initialize hierarchical swarm with PM_Architect as queen
claude-flow hive init \
  --topology hierarchical \
  --max-agents 12 \
  --name "tiny-seed-farm" \
  --memory-pool 512
```

### Topology Explanation

**Hierarchical (Recommended for this project):**
- Single coordinator (PM_Architect) enforces alignment
- Prevents goal drift in multi-agent work
- Clear chain of command
- Best for structured projects with defined roles

**Other Options:**
- `mesh` - Fault-tolerant, all agents can communicate
- `ring` - Sequential handoffs
- `star` - All agents connect to central hub

---

## Agent Configuration

### Directory Structure After Init

```
/Users/samanthapollack/Documents/TIny_Seed_OS/
├── .hive-mind/           # Config and session data
│   └── config.json       # Main configuration
├── .swarm/               # Memory database
│   └── memory.db         # SQLite persistent storage
├── .claude/              # Agent definitions
│   └── agents/           # Agent markdown files
├── memory/               # Agent-specific memories
└── coordination/         # Active workflow files
```

### Define PM_Architect as Coordinator

Create `.claude/agents/pm-architect.md`:

```markdown
---
name: pm-architect
type: hierarchical-coordinator
color: "#6B46C1"
description: Project Manager and System Architect - coordinates all Claude sessions
capabilities:
  - task-distribution
  - conflict-resolution
  - system-design
  - code-review
  - deployment-orchestration
priority: critical
model: opus
---

You are PM_Architect, the coordinator for Tiny Seed Farm OS.

## Responsibilities
1. Coordinate work across all Claude sessions
2. Prevent duplicate work and conflicts
3. Enforce architectural decisions
4. Review and approve system changes
5. Manage the INBOX/OUTBOX communication system

## Communication Protocol
- Read all team INBOX files for updates
- Write assignments to team OUTBOX files
- Use Claude Coordination API for real-time messaging
- Escalate critical issues to owner via SMS

## Files You Manage
- /claude_sessions/pm_architect/INBOX.md (incoming requests)
- /claude_sessions/pm_architect/OUTBOX.md (your responses)
- /claude_sessions/CLAUDE_COORDINATION_GUIDE.md
```

### Define Specialized Worker Agents

Create agent files for each existing Claude session role:

**`.claude/agents/backend-developer.md`**
```markdown
---
name: backend-developer
type: coder
color: "#2B6CB0"
description: Apps Script backend development
capabilities:
  - google-apps-script
  - api-development
  - database-operations
  - deployment
priority: high
model: sonnet
---

Backend developer for Google Apps Script modules.
Reports to: pm-architect
INBOX: /claude_sessions/backend/INBOX.md
OUTBOX: /claude_sessions/backend/OUTBOX.md
```

**`.claude/agents/field-operations.md`**
```markdown
---
name: field-operations
type: analyst
color: "#38A169"
description: Farm field operations and harvest planning
capabilities:
  - harvest-scheduling
  - weather-integration
  - compliance-tracking
  - field-management
priority: high
model: sonnet
---

Field operations specialist for farm management.
Reports to: pm-architect
INBOX: /claude_sessions/field_operations/INBOX.md
OUTBOX: /claude_sessions/field_operations/OUTBOX.md
```

**`.claude/agents/financial.md`**
```markdown
---
name: financial
type: analyst
color: "#D69E2E"
description: Financial dashboards and accounting
capabilities:
  - financial-reporting
  - accounting
  - budgeting
  - loan-applications
priority: high
model: sonnet
---

Financial specialist for farm accounting and dashboards.
Reports to: pm-architect
INBOX: /claude_sessions/financial/INBOX.md
OUTBOX: /claude_sessions/financial/OUTBOX.md
```

---

## SQLite Memory Configuration

### Database Location
After initialization, the SQLite database is at:
```
/Users/samanthapollack/Documents/TIny_Seed_OS/.swarm/memory.db
```

### Memory System Tables

| Table | Purpose |
|-------|---------|
| `memory_store` | Key-value storage with namespaces |
| `sessions` | Cross-session persistence |
| `agents` | Agent registry and state |
| `tasks` | Task orchestration and tracking |
| `agent_memory` | Individual agent state |
| `shared_state` | Inter-agent communication |
| `events` | Audit logging |
| `patterns` | Learned behaviors |
| `performance_metrics` | System monitoring |
| `workflow_state` | Crash recovery |
| `swarm_topology` | Network structure |
| `consensus_state` | Distributed agreement |

### Configure Memory Retention

```bash
# Set 30-day retention
claude-flow config set memory.retention 30d

# Set max database size
claude-flow config set memory.maxSize 1GB

# Enable WAL mode for concurrent access
claude-flow memory init
```

### Memory Commands

```bash
# Store project context
claude-flow memory store "architecture/decisions" "Using Google Apps Script backend with Sheets database"

# Recall stored context
claude-flow memory recall "architecture/*"

# Clean up expired entries
claude-flow memory cleanup

# Optimize database
claude-flow memory vacuum
```

---

## Integration with INBOX/OUTBOX System

The existing INBOX/OUTBOX system at `/claude_sessions/` is **compatible** with Claude Flow. Here's how to integrate:

### Hybrid Approach

1. **Claude Flow** handles:
   - Real-time coordination
   - Task assignment and claiming
   - Memory persistence across sessions
   - Agent spawning and lifecycle

2. **INBOX/OUTBOX files** handle:
   - Human-readable audit trail
   - Detailed task specifications
   - Long-form documentation
   - Cross-session handoffs

### Sync Configuration

Add to `.hive-mind/config.json`:

```json
{
  "name": "tiny-seed-farm",
  "topology": "hierarchical",
  "coordinator": "pm-architect",
  "maxAgents": 12,
  "memory": {
    "backend": "hybrid",
    "sqlitePath": ".swarm/memory.db",
    "retention": "30d"
  },
  "inboxOutbox": {
    "enabled": true,
    "basePath": "claude_sessions",
    "roles": [
      "pm_architect",
      "backend",
      "field_operations",
      "financial",
      "inventory_traceability",
      "social_media",
      "ux_design",
      "security",
      "mobile_employee",
      "sales_crm",
      "grants_funding",
      "don_knowledge_base",
      "email_chief_of_staff"
    ]
  }
}
```

### Startup Protocol

When any Claude session starts:

1. **Read INBOX** for pending assignments
2. **Register with Claude Flow**
   ```bash
   claude-flow agent spawn --type <role> --name "<Session Name>"
   ```
3. **Check SQLite memory** for context
4. **Claim tasks** if available
5. **Begin work**

### Handoff Protocol

When ending a session:

1. **Update OUTBOX** with completed work
2. **Store context in memory**
   ```bash
   claude-flow memory store "session/<role>/lastContext" "<summary>"
   ```
3. **End Claude Flow session**
   ```bash
   claude-flow agent terminate --name "<Session Name>"
   ```

---

## MCP Server Integration

Add Claude Flow as an MCP server for native tool access:

```bash
# Add MCP server
claude mcp add claude-flow -- npx -y claude-flow@v3alpha mcp start

# Verify
claude mcp list
```

This enables access to 175+ Claude Flow tools directly within Claude Code sessions.

### Available MCP Tools

Key tools include:
- `mcp__claude-flow__swarm_init` - Initialize swarm
- `mcp__claude-flow__agent_spawn` - Spawn new agent
- `mcp__claude-flow__task_orchestrate` - Orchestrate tasks
- `mcp__claude-flow__memory_store` - Store in memory
- `mcp__claude-flow__memory_recall` - Recall from memory

---

## Common Workflows

### Starting a Work Session

```bash
# 1. Check system status
claude-flow hive status

# 2. Register as a role
claude-flow agent spawn --type coder --name "Backend Session"

# 3. Check for tasks
claude-flow task list --available

# 4. Claim a task
claude-flow task claim <task-id>

# 5. Begin work with live monitoring
claude-flow hive monitor --live
```

### Coordinated Multi-Agent Task

```bash
# PM_Architect creates orchestrated task
claude-flow orchestrate "Implement new harvest scheduling feature" \
  --agents 4 \
  --parallel \
  --topology hierarchical

# Monitor progress
claude-flow hive monitor --live
```

### Context Recovery

```bash
# After system restart, recover session state
claude-flow session resume

# Check what was being worked on
claude-flow memory recall "session/*"
```

---

## Environment Variables

Set these for optimal operation:

```bash
# Add to ~/.bashrc or ~/.zshrc

# API Key
export ANTHROPIC_API_KEY="your-key"

# Claude Flow configuration
export CLAUDE_FLOW_MAX_AGENTS=12
export CLAUDE_FLOW_MEMORY_SIZE=1GB
export CLAUDE_FLOW_ENABLE_NEURAL=true
export CLAUDE_FLOW_MEMORY_BACKEND=hybrid
export CLAUDE_FLOW_MEMORY_PATH=/Users/samanthapollack/Documents/TIny_Seed_OS/.swarm
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Permission errors | `sudo chown -R $(whoami) ~/.npm` |
| Claude Code not found | Reinstall: `npm install -g @anthropic-ai/claude-code` |
| Memory database errors | `claude-flow memory reset --force` |
| MCP server issues | `claude-flow mcp restart` |
| SQLite errors (Windows) | Use in-memory storage or see Windows guide |
| Agent not responding | Check `claude-flow hive status` and respawn |

### Reset Everything

```bash
# Nuclear option - full reset
rm -rf .hive-mind .swarm memory coordination
claude-flow init
claude-flow memory init
```

---

## Comparison: Claude Flow vs Existing System

| Feature | Existing INBOX/OUTBOX | Claude Flow |
|---------|----------------------|-------------|
| **Storage** | Markdown files | SQLite + Files |
| **Real-time** | No | Yes |
| **Task claiming** | Manual | Automatic |
| **Memory persistence** | None | Full SQLite |
| **Agent lifecycle** | Manual | Managed |
| **Conflict prevention** | File locks | Built-in |
| **Human readable** | Yes | Dashboard |
| **Learning** | No | SONA neural |

**Recommendation:** Use both together - Claude Flow for real-time coordination, INBOX/OUTBOX for documentation and human review.

---

## Next Steps

1. **Install Claude Flow**
   ```bash
   npm install -g claude-flow@v3alpha
   cd /Users/samanthapollack/Documents/TIny_Seed_OS
   npx claude-flow@v3alpha init
   ```

2. **Configure hierarchical topology**
   ```bash
   claude-flow hive init --topology hierarchical --max-agents 12
   ```

3. **Create agent definition files** in `.claude/agents/`

4. **Set up MCP integration**
   ```bash
   claude mcp add claude-flow -- npx -y claude-flow@v3alpha mcp start
   ```

5. **Test coordination**
   ```bash
   claude-flow orchestrate "Test task" --agents 2
   ```

---

## Resources

- [GitHub Repository](https://github.com/ruvnet/claude-flow)
- [NPM Package](https://www.npmjs.com/package/claude-flow)
- [Wiki Documentation](https://github.com/ruvnet/claude-flow/wiki)
- [Memory System Guide](https://github.com/ruvnet/claude-flow/wiki/Memory-System)
- [Agent Usage Guide](https://github.com/ruvnet/claude-flow/wiki/Agent-Usage-Guide)

---

## Existing Coordination Infrastructure

The project already has:

1. **ClaudeCoordination.js** (Apps Script backend)
   - Message system between Claude sessions
   - Task coordination via Google Sheets
   - File locking to prevent conflicts
   - SMS alerts via Twilio

2. **INBOX/OUTBOX files** for each role:
   - `/claude_sessions/<role>/INBOX.md`
   - `/claude_sessions/<role>/OUTBOX.md`

3. **Claude Coordination Dashboard**
   - `/web_app/claude-coordination.html`

Claude Flow complements this by adding:
- Local SQLite persistence (faster than Sheets API)
- Real-time agent lifecycle management
- Self-learning and pattern recognition
- Native MCP tool integration

---

*Document created by PM_Architect Claude*
*Research sources: GitHub, NPM, Claude Flow Wiki*
