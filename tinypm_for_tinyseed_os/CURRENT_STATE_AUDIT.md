# TINYPM CURRENT STATE AUDIT

**Date:** 2026-01-30
**Purpose:** Document EVERYTHING that exists before building anything new

---

# EXECUTIVE SUMMARY

TinyPM already has a **sophisticated, working system** with:
- Full TUI application (app.py - 937 lines)
- Intelligent PM Orchestrator (pm_orchestrator.py - 903 lines)
- SOTA PM Brain with Mem0-style memory (pm_brain.py - 726 lines)
- Web dashboard (web_dashboard.html - 4,800+ lines)
- 7 persona definitions
- Task board with real data
- Builder autonomous agent
- Web server with API

**WE MUST NOT LOSE THIS.**

---

# WHAT EXISTS AND WORKS

## 1. Terminal Application (app.py)

**Status:** WORKING
**Lines:** 937
**Purpose:** Full TUI dashboard for task management

### Features:
- Task list with filtering (by status, search)
- Task creation/editing modal
- Claude agent launching with persona injection
- Status cycling (pending → in_progress → done)
- Context file tracking
- Output logging panel
- Keyboard shortcuts (n, e, d, x, /)

### Key Components:
```python
- TinyPM (main App class)
- NewTaskScreen (modal for task creation)
- LaunchConfirmScreen (agent launch confirmation)
- load_persona(role) → injects persona into Claude
- get_available_personas() → discovers personas/*.md
```

**PRESERVE:** Entire file. It's production-ready.

---

## 2. PM Orchestrator (pm_orchestrator.py)

**Status:** WORKING - SOTA DESIGN
**Lines:** 903
**Purpose:** Intelligent autonomous PM system

### Architecture:
```
┌─────────────────────────────────────────────────────────────────────┐
│                         PM ORCHESTRATOR                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │   WATCHER   │  │   BRAIN     │  │  MEMORY     │  │  ROUTER    │ │
│  │ (File Poll) │→ │ (Claude)    │→ │ (Persist)   │→ │ (Decide)   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Features:
- Real-time message watching (3s interval)
- Proactive intelligence (anticipates needs)
- Multi-agent coordination (manages Builder)
- Persistent memory (Mem0-style)
- Context awareness (project state, tasks, deadlines)
- Predictive suggestions
- Health monitoring (heartbeat)
- Event-driven architecture
- Smart routing (PM vs Builder decisions)
- Session continuity

### Key Classes:
```python
- Memory (dataclass) - user_facts, project_facts, preferences, followups
- ProjectContext - tasks, builder_status, agent_questions, launch_progress
- OrchestratorState - session_id, messages_processed, errors
- MemoryManager - load/save, learn_from_message, get_context_for_prompt
- ContextGatherer - gathers ALL project context
- SmartRouter - analyzes messages, determines routing
- ProactiveEngine - generates proactive suggestions
- ClaudeInterface - API and CLI calls
- ResponseGenerator - builds intelligent responses
- ChannelManager - dashboard ↔ builder communication
- PMOrchestrator - main coordinator
```

**PRESERVE:** Entire file. This is already SOTA architecture.

---

## 3. PM Brain (pm_brain.py)

**Status:** WORKING - SOTA FEATURES
**Lines:** 726
**Purpose:** Intelligent PM with learning capabilities

### SOTA Features (Already Implemented):
- **Mem0-style hybrid memory** (facts + relationships + context)
- **MCP integration patterns**
- **Proactive intelligence** (anticipate needs)
- **Pattern learning** (learn from interactions)
- **Cost-aware model routing** (planned)
- **Adaptive timeouts** based on task complexity
- **Self-improvement loops** (planned)

### Memory System:
```python
{
  "facts": {},           # key-value store for fast retrieval
  "relationships": [],   # graph-like structure for connections
  "context": [],         # recent context for semantic matching
  "user_preferences": {} # learned user preferences
}
```

### Pattern Learning:
```python
{
  "time_patterns": {},           # What user does at certain times
  "sequence_patterns": {},       # What follows what
  "response_effectiveness": {}   # How well responses worked
}
```

### Key Functions:
```python
- store_fact(key, value) - persist facts
- retrieve_fact(key) - get facts
- add_context(content, type) - rolling context buffer
- record_interaction(user, response, helpful) - learn from exchanges
- predict_next_action() - anticipate based on patterns
- check_proactive_suggestions() - find things to proactively mention
- estimate_timeout(task) - adaptive timeouts
```

**PRESERVE:** Entire file. Memory and learning systems are exactly what we need.

---

## 4. Web Dashboard (web_dashboard.html)

**Status:** WORKING
**Lines:** 4,800+
**Purpose:** Mobile-friendly web interface

### Features:
- Task list with status filtering
- Task cards with priority colors
- Task detail view
- Task creation/editing modals
- PM Chat interface (talk to Claude)
- Real-time refresh (3 seconds)
- Confirmation banners
- Dark theme (Linear/Superhuman style)
- Mobile responsive
- PWA capable

### Sections:
- Header with stats (pending, in progress, done)
- Filter bar
- Task list
- Task detail panel
- Chat panel
- New task modal
- Edit task modal

**PRESERVE:** Entire file. It's a complete dashboard.

---

## 5. Web Server (web_server.py)

**Status:** WORKING
**Lines:** 3,500+
**Purpose:** Python server with full API

### Endpoints:
```
GET  /                → Dashboard HTML
GET  /api/tasks       → List tasks
POST /api/tasks       → Create task
GET  /api/tasks/<id>  → Get task
PUT  /api/tasks/<id>  → Update task
DELETE /api/tasks/<id> → Delete task
POST /api/chat        → PM chat via Claude
GET  /api/status      → System status
POST /api/brain-dump  → Convert thoughts to tasks
```

**PRESERVE:** Entire file. Full API server.

---

## 6. Personas (7 total)

| Persona | Purpose | Lines |
|---------|---------|-------|
| `architect.md` | Plans, doesn't code | 1,138 |
| `builder.md` | Writes production code | 1,026 |
| `chief-of-staff.md` | Coordinates everything | 1,165 |
| `evolver.md` | Daily improvement system | 3,960 |
| `overseer.md` | Full project context | 8,232 |
| `qa.md` | Testing and auditing | 983 |
| `researcher.md` | Research tasks | 3,476 |

**PRESERVE:** All personas. They're well-designed.

---

## 7. Builder Autonomous (builder_autonomous.py)

**Status:** WORKING
**Lines:** 700+
**Purpose:** Autonomous code builder agent

### Features:
- Picks up tasks from PM
- Builds autonomously
- Reports progress
- Handles errors
- Inter-agent communication

**PRESERVE:** Entire file.

---

## 8. Supporting Scripts

| Script | Purpose |
|--------|---------|
| `start-terminal.sh` | Launch TUI |
| `start-web.sh` | Launch web server |
| `pm_inbox_poll.sh` | Poll PM inbox |
| `pm_reply.sh` | Send PM replies |
| `pm_to_builder.sh` | PM → Builder communication |
| `builder_to_pm.sh` | Builder → PM communication |
| `builder_poll.sh` | Builder polls for tasks |
| `agent_ask.sh` | Agent question system |
| `agent_wait_answer.sh` | Wait for user answers |
| `pm_watch.sh` | Watch PM state |

**PRESERVE:** All scripts. They're the glue.

---

## 9. State Files

| File | Purpose |
|------|---------|
| `board.json` | Task database |
| `.pm_chat.json` | Chat history |
| `.pm_memory.json` | Memory store |
| `.pm_patterns.json` | Learned patterns |
| `.pm_orchestrator_state.json` | Orchestrator state |
| `.pm_brain_state.json` | Brain state |
| `.claude_intercom.json` | Agent communication |
| `.agent_questions.json` | Pending questions |
| `.launch_checklist.json` | Launch readiness |

**PRESERVE:** All state files. They have learned data.

---

# WHAT NEEDS TO BE ENHANCED (NOT REPLACED)

## 1. Supabase Backend
**Current:** File-based JSON storage
**Enhancement:** Add Supabase as additional backend (not replacement)
- Keep JSON for local/offline operation
- Sync to Supabase for persistence/sharing
- Realtime subscriptions

## 2. LangGraph Integration
**Current:** Direct Claude CLI calls
**Enhancement:** Wrap in LangGraph for state management
- Add checkpointing
- Enable multi-step workflows
- Time-travel debugging

## 3. Multi-Agent Debate
**Current:** Single agent responses
**Enhancement:** Add CortexDebate for important decisions
- Keep simple responses simple
- Use debate for complex/risky decisions

## 4. Calendar Integration
**Current:** None
**Enhancement:** Add Google Calendar connection
- Read events
- Suggest task scheduling
- Integrate with proactive suggestions

## 5. Email Integration
**Current:** None
**Enhancement:** Add Gmail connection
- Read inbox (with permission)
- Draft replies
- Integrate with Chief of Staff

## 6. Mobile App
**Current:** Web dashboard (mobile-friendly)
**Enhancement:** React Native wrapper
- Native notifications
- Better offline support
- App Store presence

---

# REVISED BUILD PLAN

## DO NOT:
- Replace app.py
- Replace pm_orchestrator.py
- Replace pm_brain.py
- Replace web_dashboard.html
- Replace web_server.py
- Delete any personas
- Delete any state files

## DO:
1. **Add Supabase sync layer** (new file: supabase_sync.py)
2. **Add LangGraph wrapper** (new file: langgraph_workflow.py)
3. **Add calendar integration** (new file: calendar_integration.py)
4. **Add email integration** (new file: email_integration.py)
5. **Add debate system for critical decisions** (new file: debate_system.py)
6. **Enhance existing web_server.py** with new endpoints
7. **Enhance existing web_dashboard.html** with new features

---

# ARCHITECTURE AFTER ENHANCEMENT

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TINYPM ENHANCED                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  EXISTING (PRESERVE):                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │   app.py    │  │ orchestrator │  │   brain     │                │
│  │    (TUI)    │  │   (SOTA)     │  │  (Memory)   │                │
│  └─────────────┘  └─────────────┘  └─────────────┘                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │ web_server  │  │ web_dashboard│  │  personas   │                │
│  │   (API)     │  │   (UI)       │  │    (7)      │                │
│  └─────────────┘  └─────────────┘  └─────────────┘                │
│                                                                     │
│  NEW (ADD):                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │  Supabase   │  │  LangGraph  │  │   Debate    │                │
│  │   Sync      │  │  Workflow   │  │   System    │                │
│  └─────────────┘  └─────────────┘  └─────────────┘                │
│  ┌─────────────┐  ┌─────────────┐                                  │
│  │  Calendar   │  │   Email     │                                  │
│  │ Integration │  │ Integration │                                  │
│  └─────────────┘  └─────────────┘                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

# CONCLUSION

TinyPM is NOT a blank slate. It has:
- 5,000+ lines of working Python code
- 4,800+ lines of working HTML
- 7 well-designed personas
- Mem0-style memory system
- Pattern learning
- Proactive intelligence
- Multi-agent communication
- Web and TUI interfaces

**The path forward is ENHANCEMENT, not replacement.**

---

---

# RESEARCH COMPLETED

## Competitor Analysis
See: `COMPETITOR_ANALYSIS_2026.md`
- 8 major competitors analyzed (Motion, Reclaim, Superhuman, Linear, Notion AI, Todoist, Asana, Monday)
- Market gap identified: Personal + professional life integration
- Key differentiators to copy: Voice/style learning, proactive suggestions, auto-drafts

## SOTA Multi-Agent Research
See: `SOTA_MULTI_AGENT_RESEARCH_2026.md`
- LangGraph for durable execution (checkpointing)
- Mem0 validated: 26% accuracy boost, 91% lower latency
- MCP is industry standard (97M+ monthly SDK downloads)
- 5-level autonomy frameworks for trust calibration
- **TinyPM Alignment Score: 78%** - Well-positioned but gaps exist

## Proactive AI Research
See: `PROACTIVE_AI_RESEARCH_2026.md`
- Key signals: Calendar, email, tasks, time context, behavior patterns
- Alert fatigue prevention: Timing intelligence, consolidation, confidence thresholds
- Motion and Superhuman patterns: Auto-scheduling, voice learning, proactive drafts
- TinyPM already has the foundation; needs timing intelligence and calendar integration

## Enhancement Plan
See: `ENHANCEMENT_PLAN_2026.md`
- 4-6 week roadmap to beta-ready
- Priority: Checkpointing > Calendar > Confidence Scoring > Email
- Parallel agent execution plan

---

*Audit completed: 2026-01-30*
*Research completed: 2026-01-30*
*WE WILL NOT LOSE THE GOOD PARTS.*
*WE KNOW WHAT OTHERS ARE DOING.*
*WE WILL BE THE BEST.*
