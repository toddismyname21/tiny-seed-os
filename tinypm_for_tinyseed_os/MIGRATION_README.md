# TinyPM for Tiny Seed OS - Migration Package

**Created:** February 1, 2026
**Purpose:** Complete TinyPM codebase for integration as the "Brain" of Tiny Seed OS

---

## What This Package Contains

This is a complete, clean copy of TinyPM ready for integration with Tiny Seed OS.

### Core Systems

| File | Purpose |
|------|---------|
| `pm_orchestrator.py` | Main orchestration engine - the "brain" |
| `pm_brain.py` | Pattern learning and confidence scoring |
| `web_server.py` | HTTP server with all API endpoints |
| `web_dashboard.html` | Main dashboard UI |
| `characters.html` | Character family page (Magic vs Science theme) |

### Agent Systems

| File | Purpose |
|------|---------|
| `artistic_director.py` | Visual design and creative direction |
| `builder_autonomous.py` | Autonomous code building agent |
| `wild_claims_czar.py` | Multi-agent research system |
| `critic.py` | Quality assurance agent |
| `life_organizer.py` | Personal organization features |
| `project_manager.py` | Project tracking and management |

### Integration Systems

| File | Purpose |
|------|---------|
| `a2a_server.py` | Agent-to-Agent protocol server |
| `a2a_client.py` | A2A client for external agents |
| `mcp_server.py` | Model Context Protocol server |
| `mcp_client.py` | MCP client for Claude Desktop |
| `model_router.py` | Intelligent model routing (cost optimization) |

### AI & Intelligence

| File | Purpose |
|------|---------|
| `predictive_intent.py` | Intent prediction engine |
| `langgraph_wrapper.py` | Durable execution with LangGraph |
| `nudge_engine.py` | Proactive suggestion system |
| `skills_api.py` | Skill orchestration system |

### External Integrations

| File | Purpose |
|------|---------|
| `calendar_integration.py` | Google Calendar integration |
| `email_integration.py` | Gmail integration |
| `oauth_manager.py` | OAuth flow management |
| `supabase_sync.py` | Cloud database sync |

### UI & Frontend

| File | Purpose |
|------|---------|
| `web_dashboard.html` | Main dashboard |
| `characters.html` | Character showcase page |
| `auth.html` | Authentication flow |
| `onboarding.html` | User onboarding |
| `remote_terminal_panel.html` | Terminal interface |
| `service-worker.js` | PWA service worker |
| `manifest.json` | PWA manifest |

---

## Quick Start

### 1. Environment Setup

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your API keys:
# - ANTHROPIC_API_KEY (required)
# - GOOGLE_CLIENT_ID (for calendar/email)
# - GOOGLE_CLIENT_SECRET (for calendar/email)
# - SUPABASE_URL (optional, for cloud sync)
# - SUPABASE_KEY (optional, for cloud sync)
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Start TinyPM

```bash
# Start all servers
python start_servers.py

# Or start individually:
python web_server.py          # Web dashboard on port 8000
python pm_orchestrator.py     # PM brain (run in background)
python remote_terminal_bridge.py start  # Terminal bridge
```

### 4. Access Dashboard

Open: http://localhost:8000

---

## Integration with Tiny Seed OS

### As the "Brain" Edition

TinyPM can serve as the central intelligence for Tiny Seed OS:

1. **PM Orchestrator** monitors all Claude sessions via intercom system
2. **Predictive Intent** anticipates user needs
3. **Nudge Engine** proactively suggests actions
4. **Skills API** orchestrates cross-system capabilities
5. **A2A Protocol** enables communication with other AI agents

### Key Integration Points

```python
# Import the brain
from pm_orchestrator import PMOrchestrator
from pm_brain import PMBrain
from predictive_intent import PredictiveIntentEngine

# Initialize
brain = PMBrain()
orchestrator = PMOrchestrator(brain=brain)
intent = PredictiveIntentEngine()

# Start listening
orchestrator.start_watching()
```

### Intercom System

TinyPM uses `.claude_intercom.json` for message passing between Claude sessions:

```python
# Send message to TinyPM brain
from pm_orchestrator import send_to_pm

send_to_pm({
    "from": "chief_of_staff",
    "type": "status_update",
    "content": "Daily brief completed"
})
```

---

## Four Versions Available

1. **Builder Edition** - Build TinyPM with TinyPM (self-improving)
2. **Consumer Edition** - Plug and play web app
3. **Developer Edition** - API-first for developers
4. **Brain Edition** - Chief of Staff Brain for Tiny Seed OS (THIS ONE)

See `TINYPM_FOUR_VERSIONS_ARCHITECTURE.md` for details.

---

## Character System

TinyPM features 14 unique characters in a "Magic vs Science" theme:

- **Hybrid Bridge (4)**: Pip (mascot), Quinn, Synapse, ORACLE
- **Magic Side (5)**: Archimedes, Iris, Dustin, Luna, Tick & Tock
- **Science Side (5)**: Prometheus, Vector, Ada, Index, Cipher

See `TINYPM_AVATAR_DESIGN_SPECS.md` for character designs.

---

## Documentation Index

| Document | Description |
|----------|-------------|
| `README.md` | General overview |
| `TINYPM_ARCHITECTURE_BLUEPRINT_2026.md` | System architecture |
| `TINYPM_FOUR_VERSIONS_ARCHITECTURE.md` | 4 edition specs |
| `TINYPM_FUNCTIONALITY_AUDIT_2026.md` | Feature status |
| `TINYPM_UX_RESEARCH_2026.md` | UX research findings |
| `TINYPM_AVATAR_DESIGN_SPECS.md` | Character designs |
| `A2A_INTEGRATION_GUIDE.md` | Agent-to-Agent protocol |
| `MCP_INTEGRATION_COMPLETE_GUIDE.md` | MCP setup |
| `GOOGLE_OAUTH_SETUP.md` | Calendar/Email setup |

---

## Support

For questions about integration, check:
- `TINYPM_MANIFEST.md` - Complete system inventory
- `TINYPM_WORKLOG.md` - Development history

---

*TinyPM - "In the space between the spell and the equation, that's where true creation happens."*
