# TinyPM Four Versions Architecture

## Document Version: 1.0
## Date: 2026-01-31
## Author: PM Architect (Claude Opus 4.5)

---

# Executive Summary

This document defines the architecture for four distinct versions of TinyPM, each targeting a specific use case and user type. All versions share a common core but differ in exposed features, UI complexity, API access, and autonomy levels.

```
                    +---------------------------+
                    |     TinyPM SHARED CORE    |
                    |                           |
                    | - PM Brain (Intelligence) |
                    | - Memory System (Mem0)    |
                    | - Task Management         |
                    | - Skills Orchestrator     |
                    | - Intercom System         |
                    | - Context Gatherer        |
                    +-------------+-------------+
                                  |
        +------------+------------+------------+------------+
        |            |            |            |            |
   +----v----+  +----v----+  +----v----+  +----v----+
   | BUILDER |  | CONSUMER|  |DEVELOPER|  |  BRAIN  |
   | Edition |  | Edition |  | Edition |  | Edition |
   +---------+  +---------+  +---------+  +---------+
```

---

# Version Matrix Overview

| Feature | Builder | Consumer | Developer | Brain |
|---------|---------|----------|-----------|-------|
| **Target User** | TinyPM Core Team | End Users | Developers | Tiny Seed OS |
| **Primary Mode** | Self-building | Plug & play | API-first | Headless |
| **UI Complexity** | Full dev tools | Minimal, beautiful | Technical | None |
| **Autonomy Level** | 5 (Full auto) | 2-3 (Supervised) | 3-4 (Configurable) | 5 (Full auto) |
| **API Access** | Full + internals | Curated REST | Full REST + GraphQL | Full + intercom |
| **Customization** | Maximum | Theme/preferences | Skills + Plugins | Integration config |
| **Data Location** | Local + Cloud | Cloud (Supabase) | Configurable | Local JSON |
| **MCP Server** | Yes | No | Yes | Yes |
| **LangGraph** | Yes | Optional | Yes | Yes |
| **Claude CLI** | Yes | No | Optional | Yes |

---

# 1. TinyPM Builder Edition

## "Build TinyPM with TinyPM"

### Target User
- TinyPM development team
- Contributors building new features
- The meta-use case: using TinyPM to improve itself

### Philosophy
The Builder Edition is TinyPM's self-improvement engine. It uses TinyPM's own PM orchestration to manage TinyPM development tasks. This creates a virtuous cycle where improvements to TinyPM immediately improve the tool being used to build TinyPM.

### Core Features

```
+------------------------------------------+
|           TINYPM BUILDER EDITION          |
+------------------------------------------+
| DEVELOPMENT TOOLS                         |
| +--------------------------------------+  |
| | Code Generation Agent (Claude CLI)   |  |
| | Critic/Mentor Verification Loop      |  |
| | Wild Claims Czar (Research Scanner)  |  |
| | Artistic Director (UX/UI Reviews)    |  |
| | Daily Evolution Tracker              |  |
| +--------------------------------------+  |
|                                          |
| BUILD AUTOMATION                          |
| +--------------------------------------+  |
| | Autonomous Builder (builder_auto.py) |  |
| | Task-to-Code Pipeline                |  |
| | Verification & Retry Loops           |  |
| | Git Integration                      |  |
| +--------------------------------------+  |
|                                          |
| INTROSPECTION                            |
| +--------------------------------------+  |
| | PM-to-Builder Intercom               |  |
| | Real-time Task Dashboard             |  |
| | Build Metrics & Logs                 |  |
| | Performance Profiling                |  |
| +--------------------------------------+  |
+------------------------------------------+
```

### Components Included
- `pm_orchestrator.py` - Full orchestration
- `pm_brain.py` - PM Intelligence
- `builder_autonomous.py` - Autonomous code generation
- `critic.py` - Mentor/verification system
- `wild_claims_czar.py` - Research monitoring
- `artistic_director.py` - UX review
- `daily-evolution.py` - Self-improvement tracker
- `langgraph_wrapper.py` - Durable execution
- `skills_api.py` - Full skills system
- `web_dashboard.html` - Full developer dashboard

### UI Mode
Full developer dashboard with:
- Task board with all fields exposed
- Builder chat panel
- PM chat panel
- Intercom viewer
- Error recovery dashboard
- Skills execution panel
- Remote terminal access
- LangGraph thread viewer

### API Access Level
**Maximum** - Exposes all internal APIs plus:
- `/api/internals/state` - Raw orchestrator state
- `/api/internals/memory` - Memory system access
- `/api/internals/patterns` - Learned patterns
- `/api/builder/execute-raw` - Direct Claude CLI access
- `/api/claims/full-scan` - Wild Claims Czar
- `/api/evolution/trigger` - Daily evolution hooks

### Autonomy Configuration
```python
BUILDER_AUTONOMY = {
    "level": 5,  # Full autonomy
    "human_approval_required": ["deploy", "git_push", "external_api"],
    "auto_approve_skills": ["read", "write", "analyze", "create_task"],
    "critic_verification": True,
    "max_retry_attempts": 3,
    "timeout_scaling": "adaptive"  # Tasks get timeouts based on complexity
}
```

### Unique Features
1. **Self-Improvement Loop**: PM creates tasks to improve TinyPM, Builder executes them, Critic verifies, and the cycle continues.
2. **Meta-Observation**: Dashboard shows TinyPM building TinyPM in real-time.
3. **Research Integration**: Wild Claims Czar scans for SOTA techniques and creates improvement tasks.

---

# 2. TinyPM Consumer Edition

## "Plug and Play Personal PM"

### Target User
- End users who want a personal project manager
- Non-technical users
- Mobile-first users

### Philosophy
The Consumer Edition is beautiful, simple, and just works. No configuration, no coding, no terminal. Users chat with their PM and things get done. The complexity is hidden, the magic is visible.

### Core Features

```
+------------------------------------------+
|          TINYPM CONSUMER EDITION          |
+------------------------------------------+
| CONVERSATIONAL INTERFACE                  |
| +--------------------------------------+  |
| | Natural Language Chat                |  |
| | Voice Input (Mobile)                 |  |
| | Smart Suggestions                    |  |
| | Proactive Nudges                     |  |
| +--------------------------------------+  |
|                                          |
| LIFE ORGANIZATION                         |
| +--------------------------------------+  |
| | Tasks & Projects                     |  |
| | Calendar Integration                 |  |
| | Contact Management                   |  |
| | Goal Tracking                        |  |
| | Important Dates                      |  |
| +--------------------------------------+  |
|                                          |
| INTELLIGENCE                             |
| +--------------------------------------+  |
| | Pattern Learning                     |  |
| | Proactive Reminders                  |  |
| | Priority Suggestions                 |  |
| | Focus Time Detection                 |  |
| +--------------------------------------+  |
+------------------------------------------+
```

### Components Included
- `pm_brain.py` - PM Intelligence (simplified mode)
- Context Gatherer (calendar, email)
- Memory System (preferences, facts)
- Nudge System (proactive suggestions)
- Skills API (curated, safe skills only)
- PWA-optimized dashboard

### Components EXCLUDED
- `builder_autonomous.py` (no code generation)
- `critic.py` (no verification needed)
- `wild_claims_czar.py` (no research scanning)
- Remote terminal access
- Claude CLI access
- LangGraph (optional, cloud-hosted)

### UI Mode
Mobile-optimized, beautiful, minimal:
- Chat-first interface
- Card-based task view
- Swipe gestures for status changes
- Bottom navigation (Chat, Tasks, Calendar, Profile)
- Notification center
- Dark mode by default

### API Access Level
**Curated** - Safe, user-facing APIs only:
- `/api/chat` - Conversational interface
- `/api/tasks` - CRUD for personal tasks
- `/api/projects` - Project management
- `/api/nudges` - Proactive suggestions
- `/api/contacts` - Contact management
- `/api/goals` - Goal tracking
- `/api/calendar/events` - Calendar (read-only)
- `/api/email/recent` - Email summaries (read-only)

No access to:
- Builder APIs
- Internal state APIs
- Skills execution (only via chat)
- File system operations

### Autonomy Configuration
```python
CONSUMER_AUTONOMY = {
    "level": 2,  # Supervised
    "human_approval_required": ["create_task", "modify_calendar", "send_email"],
    "auto_approve": ["read", "suggest", "remind"],
    "proactive_notifications": True,
    "max_daily_nudges": 5,
    "quiet_hours": {"start": "22:00", "end": "07:00"}
}
```

### Unique Features
1. **Zero Configuration**: Works out of the box with Supabase backend.
2. **Mobile-First PWA**: Installable on phone, offline-capable.
3. **Gentle Intelligence**: Learns preferences without feeling creepy.
4. **Voice Integration**: Talk to your PM (mobile).

---

# 3. TinyPM Developer Edition

## "Build Your Own AI PM"

### Target User
- Developers building with TinyPM
- Teams customizing TinyPM for their workflow
- API integrators

### Philosophy
The Developer Edition is for those who want to extend, customize, or integrate TinyPM. Full API access, plugin system, custom skills, and extensive documentation.

### Core Features

```
+------------------------------------------+
|         TINYPM DEVELOPER EDITION          |
+------------------------------------------+
| FULL API                                  |
| +--------------------------------------+  |
| | REST API (all endpoints)             |  |
| | WebSocket for real-time updates      |  |
| | GraphQL (optional module)            |  |
| | Webhook system                       |  |
| +--------------------------------------+  |
|                                          |
| EXTENSIBILITY                            |
| +--------------------------------------+  |
| | Custom Skills Registration           |  |
| | Plugin Architecture                  |  |
| | Persona Customization                |  |
| | Workflow Automation                  |  |
| +--------------------------------------+  |
|                                          |
| DEVELOPMENT TOOLS                        |
| +--------------------------------------+  |
| | API Explorer                         |  |
| | Request/Response Logging             |  |
| | Debugging Console                    |  |
| | Performance Metrics                  |  |
| +--------------------------------------+  |
|                                          |
| INTEGRATION POINTS                       |
| +--------------------------------------+  |
| | MCP Server (for Claude Desktop/Code) |  |
| | OAuth Manager (Google, Microsoft)    |  |
| | Supabase Sync                        |  |
| | A2A Protocol                         |  |
| +--------------------------------------+  |
+------------------------------------------+
```

### Components Included
All components from Builder Edition, plus:
- `mcp_server.py` - Model Context Protocol server
- `a2a_client.py` - Agent-to-Agent protocol
- `oauth_manager.py` - OAuth 2.0 flow manager
- `supabase_sync.py` - Cloud sync
- GraphQL schema (new)
- Webhook dispatcher (new)
- Plugin loader (new)

### UI Mode
Technical dashboard with:
- API explorer with request builder
- Real-time WebSocket console
- Skill registry manager
- OAuth flow visualizer
- Supabase sync status
- Request/response inspector
- Custom persona editor

### API Access Level
**Full** - All APIs documented and versioned:

```
/api/v1/
├── tasks/           # Task CRUD
├── projects/        # Project management
├── chat/            # Conversational interface
├── skills/          # Skills system
│   ├── execute      # Execute skill
│   ├── register     # Register custom skill
│   └── catalog      # Skill catalog
├── plugins/         # Plugin management
│   ├── install      # Install plugin
│   ├── configure    # Configure plugin
│   └── list         # List plugins
├── webhooks/        # Webhook configuration
│   ├── register     # Register webhook
│   ├── test         # Test webhook
│   └── logs         # Webhook logs
├── auth/            # Authentication
│   ├── oauth/       # OAuth flows
│   └── tokens/      # API tokens
├── sync/            # Cloud sync
│   ├── status       # Sync status
│   └── force        # Force sync
└── debug/           # Debug endpoints (dev only)
    ├── state        # Internal state
    ├── logs         # Log stream
    └── metrics      # Performance metrics
```

### Autonomy Configuration
```python
DEVELOPER_AUTONOMY = {
    "level": 3,  # Balanced - configurable per deployment
    "configurable": True,  # Can be changed via API
    "default_approval": "user_choice",
    "skill_permissions": {
        "built_in": "auto",
        "custom": "require_approval"
    },
    "plugin_sandbox": True,
    "audit_logging": True
}
```

### Unique Features
1. **Custom Skills SDK**: Register your own skills with risk levels.
2. **Plugin Architecture**: Install third-party plugins.
3. **Multi-tenant Support**: Deploy for teams.
4. **Full Observability**: LangSmith integration for tracing.

---

# 4. TinyPM Brain Edition

## "Chief of Staff Brain for Tiny Seed OS"

### Target User
- Tiny Seed OS integration
- Multi-agent orchestration
- Headless PM operation

### Philosophy
The Brain Edition is TinyPM running as a pure intelligence layer without a direct user interface. It powers the Chief of Staff in Tiny Seed OS, coordinating multiple agents and providing proactive intelligence through the intercom system.

### Core Features

```
+------------------------------------------+
|           TINYPM BRAIN EDITION            |
+------------------------------------------+
| MULTI-AGENT COORDINATION                  |
| +--------------------------------------+  |
| | PM Orchestrator (full)               |  |
| | Agent Registry                       |  |
| | Intercom Message Bus                 |  |
| | Task Delegation Engine               |  |
| +--------------------------------------+  |
|                                          |
| INTELLIGENCE LAYER                        |
| +--------------------------------------+  |
| | PM Brain (proactive mode)            |  |
| | Pattern Learning                     |  |
| | Predictive Intent Engine             |  |
| | Confidence Scoring                   |  |
| +--------------------------------------+  |
|                                          |
| INTEGRATION                              |
| +--------------------------------------+  |
| | File-based Intercom                  |  |
| | Heartbeat Monitoring                 |  |
| | Cross-project Awareness              |  |
| | Calendar + Email Context             |  |
| +--------------------------------------+  |
|                                          |
| DURABLE EXECUTION                        |
| +--------------------------------------+  |
| | LangGraph State Machine              |  |
| | Error Recovery                       |  |
| | Session Continuity                   |  |
| | Crash Recovery                       |  |
| +--------------------------------------+  |
+------------------------------------------+
```

### Components Included
- `pm_orchestrator.py` - Full orchestration (daemon mode)
- `pm_brain.py` - PM Intelligence (proactive mode)
- `langgraph_wrapper.py` - Durable execution
- Context Gatherer (all integrations)
- Memory System (full)
- Pattern Learning
- Intercom System (file-based)
- Agent Registry

### Components EXCLUDED
- `web_server.py` (no HTTP server)
- `web_dashboard.html` (no UI)
- OAuth flows (uses shared tokens)
- Consumer-facing APIs

### UI Mode
**None** - Headless operation. All communication through:
- `.claude_intercom.json` - Agent message bus
- `.pm_chat.json` - PM conversation history
- `.builder_heartbeat.json` - Health monitoring
- File watchers for inbox patterns

### API Access Level
**Internal** - No HTTP API, communication via files:

```
INTERCOM PROTOCOL:
├── pm_to_builder[]     # Tasks for Builder agent
├── builder_to_pm[]     # Builder status/completions
├── pm_to_researcher[]  # Research requests
├── researcher_to_pm[]  # Research results
├── system_alerts[]     # System-wide alerts
└── broadcast[]         # All-agent broadcasts

MESSAGE SCHEMA:
{
  "id": int,
  "from": "pm" | "builder" | "researcher" | "system",
  "to": "pm" | "builder" | "researcher" | "all",
  "type": "task" | "status" | "question" | "alert" | "completion",
  "priority": "low" | "normal" | "high" | "critical",
  "message": string,
  "context": object,
  "timestamp": ISO8601,
  "read": boolean
}
```

### Autonomy Configuration
```python
BRAIN_AUTONOMY = {
    "level": 5,  # Full autonomy
    "mode": "daemon",
    "heartbeat_interval": 30,  # seconds
    "proactive_mode": True,
    "proactive_check_interval": 60,  # seconds
    "coordination": {
        "delegate_to_builder": ["coding", "file_changes"],
        "delegate_to_researcher": ["research", "analysis"],
        "handle_self": ["coordination", "planning", "reminders"]
    },
    "recovery": {
        "max_retries": 3,
        "backoff_multiplier": 2.0,
        "circuit_breaker_threshold": 5
    }
}
```

### Unique Features
1. **Daemon Mode**: Runs as background process, no UI needed.
2. **Cross-Project Awareness**: Knows about both TinyPM and Tiny Seed OS.
3. **Agent Coordination**: Manages Builder, Researcher, and other agents.
4. **Crash Recovery**: LangGraph ensures no work is lost.

---

# Shared Core Architecture

## Core Components (Used by All Versions)

```
SHARED CORE/
├── pm_brain.py                  # Core PM intelligence
│   ├── ConfidenceScorer        # Assess response quality
│   ├── TimingIntelligence      # Adaptive timeouts
│   ├── PatternLearning         # Learn from interactions
│   └── ProactiveSuggestions    # Anticipate needs
│
├── memory/
│   ├── MemoryManager           # Mem0-style hybrid memory
│   ├── FactStore               # Key-value facts
│   ├── ContextBuffer           # Rolling context
│   └── PatternStore            # Learned patterns
│
├── context/
│   ├── ContextGatherer         # Project state
│   ├── CalendarContext         # Calendar awareness
│   ├── EmailContext            # Email awareness
│   └── IntegratedContext       # Unified context
│
├── tasks/
│   ├── TaskBoard               # board.json manager
│   ├── TaskPrioritizer         # Priority assessment
│   └── TaskRouter              # Route to appropriate agent
│
├── skills/
│   ├── SkillRegistry           # Available skills
│   ├── SkillOrchestrator       # Execute skills
│   ├── ApprovalManager         # Human-in-loop
│   └── BuiltInSkills           # Core skill set
│
├── intercom/
│   ├── IntercomManager         # Message bus
│   ├── AgentRegistry           # Known agents
│   └── BroadcastManager        # System broadcasts
│
└── recovery/
    ├── ErrorRecovery           # Retry with backoff
    ├── CircuitBreaker          # Prevent cascade failures
    └── StateCheckpoint         # LangGraph integration
```

## Shared Data Models

```python
# Core types used across all versions

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from enum import Enum

class TaskStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    BLOCKED = "blocked"

class Priority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class Task:
    id: str
    title: str
    description: str
    status: TaskStatus
    priority: Priority
    role: str
    context: List[str]
    created: str
    updated: str
    notes: Optional[List[Dict]] = None
    progress: Optional[int] = None

@dataclass
class IntercomMessage:
    id: int
    from_agent: str
    to_agent: str
    type: str
    priority: Priority
    message: str
    context: Dict[str, Any]
    timestamp: str
    read: bool = False

@dataclass
class Memory:
    user_facts: List[str]
    project_facts: List[str]
    preferences: Dict[str, Any]
    conversation_topics: List[Dict]
    pending_followups: List[str]
    learned_patterns: List[Dict]
    important_dates: List[Dict]
    last_interactions: List[Dict]
```

---

# Version Switching Mechanism

## Architecture for Multi-Version Support

```
+------------------------------------------+
|            VERSION MANAGER                |
+------------------------------------------+
| version_config.json                       |
| +--------------------------------------+  |
| {                                      |  |
|   "active_version": "builder",         |  |
|   "versions": {                        |  |
|     "builder": {...config...},         |  |
|     "consumer": {...config...},        |  |
|     "developer": {...config...},       |  |
|     "brain": {...config...}            |  |
|   }                                    |  |
| }                                      |  |
| +--------------------------------------+  |
|                                          |
| VersionLoader                             |
| +--------------------------------------+  |
| | load_version(name) -> Config         |  |
| | apply_feature_flags(config)          |  |
| | initialize_components(config)        |  |
| | validate_dependencies(config)        |  |
| +--------------------------------------+  |
+------------------------------------------+
```

### Version Configuration Schema

```python
# version_config.py

VERSION_CONFIGS = {
    "builder": {
        "name": "TinyPM Builder Edition",
        "mode": "full",
        "features": {
            "autonomous_builder": True,
            "critic_verification": True,
            "wild_claims_czar": True,
            "artistic_director": True,
            "daily_evolution": True,
            "langgraph": True,
            "skills_full": True,
            "remote_terminal": True,
            "mcp_server": True,
            "claude_cli": True,
            "debug_endpoints": True
        },
        "ui": {
            "mode": "full_dashboard",
            "dev_tools": True,
            "builder_panel": True,
            "pm_panel": True,
            "intercom_viewer": True
        },
        "api": {
            "access_level": "full",
            "internal_endpoints": True,
            "rate_limit": None
        },
        "autonomy": {
            "level": 5,
            "auto_approve_skills": ["*"]
        }
    },

    "consumer": {
        "name": "TinyPM Consumer Edition",
        "mode": "minimal",
        "features": {
            "autonomous_builder": False,
            "critic_verification": False,
            "wild_claims_czar": False,
            "artistic_director": False,
            "daily_evolution": False,
            "langgraph": False,  # Cloud-hosted
            "skills_full": False,  # Curated only
            "remote_terminal": False,
            "mcp_server": False,
            "claude_cli": False,
            "debug_endpoints": False
        },
        "ui": {
            "mode": "mobile_optimized",
            "dev_tools": False,
            "builder_panel": False,
            "pm_panel": False,
            "chat_first": True,
            "pwa": True
        },
        "api": {
            "access_level": "curated",
            "internal_endpoints": False,
            "rate_limit": 100  # per minute
        },
        "autonomy": {
            "level": 2,
            "require_approval": ["create_task", "modify_calendar"]
        }
    },

    "developer": {
        "name": "TinyPM Developer Edition",
        "mode": "api_first",
        "features": {
            "autonomous_builder": False,
            "critic_verification": False,
            "wild_claims_czar": False,
            "artistic_director": False,
            "daily_evolution": False,
            "langgraph": True,
            "skills_full": True,
            "remote_terminal": True,
            "mcp_server": True,
            "claude_cli": True,  # Optional
            "debug_endpoints": True,
            "graphql": True,
            "webhooks": True,
            "plugins": True
        },
        "ui": {
            "mode": "api_explorer",
            "dev_tools": True,
            "api_docs": True,
            "request_inspector": True
        },
        "api": {
            "access_level": "full",
            "versioned": True,
            "rate_limit": 1000  # per minute
        },
        "autonomy": {
            "level": 3,
            "configurable": True
        }
    },

    "brain": {
        "name": "TinyPM Brain Edition",
        "mode": "headless",
        "features": {
            "autonomous_builder": False,  # Delegates to Builder agent
            "critic_verification": False,
            "wild_claims_czar": False,
            "artistic_director": False,
            "daily_evolution": False,
            "langgraph": True,
            "skills_full": True,
            "remote_terminal": False,
            "mcp_server": True,
            "claude_cli": True,
            "debug_endpoints": False,
            "pm_orchestrator": True,
            "intercom_daemon": True
        },
        "ui": {
            "mode": None,  # Headless
            "http_server": False
        },
        "api": {
            "access_level": "intercom_only",
            "http_disabled": True,
            "file_protocol": True
        },
        "autonomy": {
            "level": 5,
            "daemon_mode": True,
            "proactive_enabled": True
        }
    }
}
```

### Switching Versions

```python
# version_manager.py

from pathlib import Path
import json

class VersionManager:
    def __init__(self, config_path: Path = None):
        self.config_path = config_path or Path("version_config.json")
        self.current_version = None

    def get_active_version(self) -> str:
        """Get currently active version name."""
        if self.config_path.exists():
            config = json.loads(self.config_path.read_text())
            return config.get("active_version", "consumer")
        return "consumer"  # Default

    def set_active_version(self, version: str) -> bool:
        """Switch to a different version."""
        if version not in VERSION_CONFIGS:
            return False

        config = {"active_version": version}
        self.config_path.write_text(json.dumps(config, indent=2))
        return True

    def get_config(self) -> dict:
        """Get configuration for active version."""
        version = self.get_active_version()
        return VERSION_CONFIGS.get(version, VERSION_CONFIGS["consumer"])

    def is_feature_enabled(self, feature: str) -> bool:
        """Check if a feature is enabled in current version."""
        config = self.get_config()
        return config.get("features", {}).get(feature, False)

# Usage in main.py:
version_manager = VersionManager()
if version_manager.is_feature_enabled("autonomous_builder"):
    from builder_autonomous import start_builder
    start_builder()
```

---

# Inter-Version Communication

## How Versions Can Talk to Each Other

For scenarios where multiple versions need to communicate (e.g., Consumer Edition talking to a Brain Edition backend):

```
+------------------+         +------------------+
|  CONSUMER APP    |  <----> |   BRAIN DAEMON   |
|  (User's Phone)  |   API   | (Server Backend) |
+------------------+         +------------------+
        |                            |
        v                            v
+------------------+         +------------------+
|  Supabase Cloud  |  <----> |  Local File Bus  |
|  (Sync Layer)    |   Sync  |  (Intercom)      |
+------------------+         +------------------+
```

### Communication Protocols

1. **Consumer <-> Brain (Cloud-Mediated)**
   - Consumer uses Supabase REST API
   - Brain syncs periodically via `supabase_sync.py`
   - Real-time via Supabase Realtime channels

2. **Developer <-> Brain (Direct API)**
   - Developer Edition can connect directly to Brain's MCP server
   - Uses A2A protocol for agent-to-agent messages

3. **Builder <-> Brain (Local Intercom)**
   - Both on same machine
   - Use `.claude_intercom.json` for messages
   - Heartbeat via `.builder_heartbeat.json`

---

# Deployment Strategy

## Per-Version Deployment

| Version | Deployment | Infrastructure |
|---------|------------|----------------|
| **Builder** | Local only | Mac/Linux dev machine |
| **Consumer** | Cloud + PWA | Supabase + CDN + Mobile |
| **Developer** | Self-hosted or Cloud | Docker / Kubernetes |
| **Brain** | Local daemon | Mac with Claude CLI |

### Builder Edition Deployment
```bash
# Local only - no deployment needed
cd ~/Documents/TIny_Seed_OS/tinypm
./start-web.sh  # Starts web server with full features
```

### Consumer Edition Deployment
```bash
# Build PWA for production
npm run build:pwa

# Deploy to CDN (Netlify, Vercel, etc.)
netlify deploy --prod

# Supabase already configured
# No server deployment needed - serverless backend
```

### Developer Edition Deployment
```bash
# Docker deployment
docker build -t tinypm-developer .
docker run -p 8000:8000 \
  -e ANTHROPIC_API_KEY=$API_KEY \
  -e SUPABASE_URL=$SUPABASE_URL \
  tinypm-developer

# Kubernetes deployment
kubectl apply -f k8s/tinypm-developer.yaml
```

### Brain Edition Deployment
```bash
# Run as daemon on local machine
python3 pm_orchestrator.py --daemon

# Or via systemd/launchd
# /Library/LaunchAgents/com.tinypm.brain.plist
```

---

# Migration Path

## Upgrading Between Versions

```
CONSUMER  -->  DEVELOPER  -->  BUILDER
   ^               |              |
   |               v              v
   +<---- BRAIN <--+<-------------+
```

### Consumer to Developer
1. Export data via Supabase
2. Install Developer Edition locally
3. Import data
4. Enable additional features via config

### Developer to Builder
1. Clone TinyPM repo
2. Copy configuration
3. Enable builder-specific features
4. Start autonomous builder

### Any Version to Brain
1. Ensure PM Orchestrator runs as daemon
2. Configure intercom paths
3. Disable HTTP server
4. Enable heartbeat monitoring

---

# Summary

| Version | One-Line Description |
|---------|---------------------|
| **Builder** | "The tool that builds itself" |
| **Consumer** | "Your AI personal assistant, simplified" |
| **Developer** | "Build your own PM with full API access" |
| **Brain** | "The intelligence layer for Tiny Seed OS" |

Each version shares the same core intelligence but exposes it differently based on the target user's needs. The shared core ensures consistency while version-specific configurations enable the right level of complexity for each use case.

---

# Appendix: File Mapping

## Which Files Are Used by Each Version

| File | Builder | Consumer | Developer | Brain |
|------|:-------:|:--------:|:---------:|:-----:|
| `pm_orchestrator.py` | Y | - | Y | Y |
| `pm_brain.py` | Y | Y | Y | Y |
| `builder_autonomous.py` | Y | - | - | - |
| `critic.py` | Y | - | - | - |
| `wild_claims_czar.py` | Y | - | - | - |
| `artistic_director.py` | Y | - | - | - |
| `daily-evolution.py` | Y | - | - | - |
| `langgraph_wrapper.py` | Y | - | Y | Y |
| `skills_api.py` | Y | Y* | Y | Y |
| `web_server.py` | Y | Y | Y | - |
| `web_dashboard.html` | Y | Y* | Y | - |
| `mcp_server.py` | Y | - | Y | Y |
| `a2a_client.py` | - | - | Y | - |
| `oauth_manager.py` | Y | Y | Y | - |
| `supabase_sync.py` | - | Y | Y | Y |

*Y = Included, - = Excluded, Y* = Modified/Simplified version

---

*Document generated by PM Architect (Claude Opus 4.5)*
*For TinyPM Project - January 2026*
