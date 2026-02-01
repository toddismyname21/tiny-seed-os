# TinyPM Progress Tracker - January 31, 2026

**Last Updated:** Auto-updated by agents
**Terminus Claude:** Read this file for today's progress

---

## ACTIVE TEAMS

| Team | Mission | Status | Agent ID |
|------|---------|--------|----------|
| Life Organizer Research | Deep research on life assistant features | ✅ COMPLETE | a195c90 |
| Life Organizer Builder | Build Life tab in dashboard | ✅ COMPLETE | a4f47f5 |
| Life Organizer Critic | Review and QA | ✅ COMPLETE | a6dc6b8 |
| Life Organizer JS Fix | Verify all JavaScript works | ✅ COMPLETE | a6619be |
| MCP Server Deploy | Enable MCP for Claude Desktop | ✅ COMPLETE | builder |
| Predictive Intent Wire | Connect to dashboard UI | ✅ COMPLETE | ab234bc |
| Model Router Enable | Cost-optimized routing | ✅ COMPLETE | builder |
| Script Hospital | Fix 5 broken scripts | ✅ COMPLETE | opus4.5 |
| Magic Janitor | Consolidate duplicates | ✅ COMPLETE | janitor |
| **Wild Claims Czar** | Deploy research system | 🔄 RUNNING | a4b8c05 |
| **A2A Server** | Deploy agent interop | 🔄 RUNNING | a0cb1f9 |
| **LangGraph** | Deploy durable execution | 🔄 RUNNING | a53c33f |
| **Skills System** | Deploy skill orchestration | 🔄 RUNNING | ac3db2e |
| **Nudge System** | Deploy nudge production | 🔄 RUNNING | aa5c010 |
| **OAuth Docs** | Create Google OAuth setup guide | 🔄 RUNNING | acbe49c |
| **Test Organization** | Move tests to /tests/ folder | 🔄 RUNNING | afff83e |
| **CLI Tools** | Deploy pm_direct_line, progress_monitor, project_manager | COMPLETE | opus4.5 |

---

## PRIORITY QUEUE

### IMMEDIATE (Deploy Now)
- [x] Enable MCP Server - COMPLETE (see MCP_DEPLOYMENT_STATUS.md)
- [x] Wire Predictive Intent to dashboard - COMPLETE
- [x] Start Model Router (cost savings 26-70%) - COMPLETE

### MEDIUM-TERM (Config Required)
- [ ] Complete Google OAuth (need credentials from user)
- [ ] Configure Supabase (need anon key from user)

### CLEANUP
- [x] Consolidate JSON/logging/env patterns into utils/ - COMPLETE
- [ ] Archive dead code to /tests/
- [ ] Implement testing strategy

---

## SCRIPT STATUS TRACKER

### Core (10/10 Importance) - DEPLOYED
- [x] web_server.py - DEPLOYED
- [x] pm_orchestrator.py - DEPLOYED
- [x] pm_brain.py - DEPLOYED
- [x] builder_autonomous.py - DEPLOYED
- [x] critic.py - DEPLOYED

### High Value (8-9/10) - PARTIAL/DORMANT
- [x] life_organizer.py - FIXED (apscheduler installed)
- [ ] nudge_engine.py - PARTIAL
- [ ] email_integration.py - NEEDS OAUTH
- [ ] calendar_integration.py - NEEDS OAUTH
- [ ] oauth_manager.py - NEEDS CONFIG
- [x] predictive_intent.py - WIRED TO DASHBOARD
- [x] model_router.py - INTEGRATED
- [x] langgraph_wrapper.py - FIXED (works with local checkpointing)
- [ ] wild_claims_czar.py - NEEDS API KEYS

### Medium Value (6-7/10) - DORMANT
- [x] mcp_server.py - DEPLOYED + CONFIGURED
- [x] a2a_server.py - FIXED (import path corrected)
- [ ] supabase_sync.py - NEEDS KEY
- [ ] nudge_delivery.py - PARTIAL
- [ ] google_oauth.py - NEEDS CONFIG
- [ ] skills/orchestrator.py - DORMANT
- [ ] skills/email_skill.py - DORMANT
- [ ] skills/calendar_skill.py - DORMANT
- [ ] skills/task_skill.py - DORMANT

### Lower Priority (3-5/10)
- [x] app.py (TUI) - FIXED (Textual API compatibility)
- [ ] photo_upload.py - Needs Pillow
- [ ] Various test files

---

## COMPLETED TODAY

*(Auto-updated by agents)*

1. ✅ Remote access via Terminus configured
2. ✅ Fixed chat panel dropdown (single clean selector)
3. ✅ **LIFE ORGANIZER COMPLETE** - Full "Life" tab built and production-ready:
   - **Research (a195c90)**: Created `LIFE_ORGANIZER_RESEARCH_2026.md` - analysis of 8 best-in-class apps
   - **Builder (a4f47f5)**: Built Life tab UI with 6 cards + 9 JavaScript functions + backend APIs
   - **Critic (a6dc6b8)**: Reviewed implementation, created review document
   - **JS Fix (a6619be)**: Verified all 16 JavaScript functions properly wired
4. ✅ **Life Tab Features**:
   - Daily Brief header with time-based greeting, weather (Open-Meteo API), quick stats
   - Today's Calendar with event list and refresh
   - Relationship Nudges with contact reminders and birthdays
   - Email Status showing inbox/unread/needs-response counts
   - Smart Suggestions with proactive AI recommendations
   - Goals tracking with progress bars and categories
   - Life Organizer Engine controls (start/stop/trigger jobs)
   - Contact Modal (add contacts with relationship types, birthday)
   - Goal Modal (add goals with target dates, categories)
5. ✅ **MCP Server Deployed** - Claude Desktop integration enabled
8. ✅ **Magic Janitor Complete** - utils/ folder created with centralized utilities
9. ✅ **Model Router Integrated** - Intelligent model selection for 26-70% cost savings
10. ✅ **Script Hospital Complete** - Fixed 5 broken scripts:
    - `life_organizer.py` - Fixed: Installed apscheduler
    - `mcp_server.py` - Fixed: Installed mcp SDK (requires Python 3.10+ in .mcp_venv)
    - `a2a_server.py` - Fixed: Updated import path for RequestContext
    - `langgraph_wrapper.py` - Fixed: Installed langgraph + langchain-core
    - `app.py` (TUI) - Fixed: Updated Textual API for renderable attribute
11. ✅ **Predictive Intent Wired to Dashboard** - Mind-reading predictions now live:
    - API endpoints: `/api/predictions`, `/api/predictions/stats`, `/api/predictions/context`
    - POST endpoints for learning: `/api/predictions/record-action`, `/api/predictions/record-response`
    - Bootstrap suggestions for cold-start (no history needed)
    - UI in Life tab showing predictions with confidence bars
    - Quick actions, energy/focus indicators, and real-time updates
12. ✅ **CLI Tools Deployment Complete** - 3 CLI scripts deployed with proper --help:
    - `pm_direct_line.py` - Watches dashboard, responds via Claude CLI (--status, --once, --help)
    - `progress_monitor.py` - Tracks agent task progress, updates board.json (--status, --once, --help)
    - `project_manager.py` - Discrete projects (dinner logs, wine journals) with full CRUD (list, create, log, entries, stats)

---

## UTILS MODULE CREATED (Magic Janitor)

**Location:** `/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/utils/`

### Files Created
| File | Purpose | Key Functions |
|------|---------|---------------|
| `__init__.py` | Package exports | Exports all utilities |
| `json_utils.py` | JSON operations | `safe_read_json()`, `safe_write_json()`, `json_merge()` |
| `logging_utils.py` | Centralized logging | `log()`, `get_logger()`, `log_to_file()` |
| `env_loader.py` | .env loading | `load_env()`, `get_env()`, `get_env_bool()`, `get_env_int()` |
| `anthropic_client.py` | Singleton client | `get_anthropic_client()`, `create_message()` |

### Usage Examples
```python
# Import utilities
from utils import safe_read_json, safe_write_json, log, get_env, get_anthropic_client

# JSON with error handling
data = safe_read_json(Path("config.json"), default={})
safe_write_json(Path("config.json"), data)

# Simple logging
log("Task completed")
log("Warning!", level="WARNING")

# Environment variables
api_key = get_env("ANTHROPIC_API_KEY")
debug = get_env_bool("DEBUG", default=False)

# Singleton Anthropic client
client = get_anthropic_client()
```

### Migration (for future refactoring)
OLD duplicated pattern:
```python
if path.exists():
    try:
        data = json.loads(path.read_text())
    except:
        data = {}
```

NEW centralized:
```python
from utils import safe_read_json
data = safe_read_json(path, default={})
```

---

## MCP SERVER DEPLOYMENT STATUS

**Status:** COMPLETE AND READY

### Configuration Created
- **File:** `~/.config/claude/claude_desktop_config.json`
- **Restart Claude Desktop** to load the TinyPM MCP server

### How to Start MCP Server Manually (if needed)
```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS/tinypm
source .mcp_venv/bin/activate
python mcp_server.py
```

### Available MCP Tools (15 total)

| Tool | Description |
|------|-------------|
| `task_create` | Create a new task in TinyPM |
| `task_list` | List tasks with filtering |
| `task_update` | Update task status/priority |
| `task_delete` | Delete a task |
| `task_assign_to_builder` | Assign task to Builder agent |
| `agent_send_message` | Send message to any agent |
| `agent_get_status` | Get all agent statuses |
| `agent_get_messages` | Get messages from agents |
| `research_scan_sources` | Trigger Wild Claims Czar scan |
| `research_get_validated_claims` | Get validated research |
| `predict_user_intent` | Predictive intelligence |
| `get_proactive_brief` | Full intelligence brief |
| `memory_store` | Store facts persistently |
| `memory_retrieve` | Retrieve stored facts |
| `memory_get_context` | Get recent context |

### Available MCP Resources (7 total)

| Resource URI | Description |
|--------------|-------------|
| `board://tasks` | All tasks |
| `board://active` | In-progress tasks |
| `board://pending` | Pending tasks |
| `memory://facts` | Stored facts |
| `claims://recent` | Recent wild claims |
| `claims://validated` | Validated claims |
| `intercom://messages` | Agent intercom |

### Usage in Claude Desktop
After restarting Claude Desktop, you can:
- Say "list my tasks" to invoke `task_list`
- Say "create a task for X" to invoke `task_create`
- Say "get proactive brief" to invoke `get_proactive_brief`
- Say "assign task TPM-001 to builder" to invoke `task_assign_to_builder`

---

## MODEL ROUTER INTEGRATION (January 2026 SOTA)

**Status:** COMPLETE AND ACTIVE

### Cost Savings Potential
- **Expected:** 26-70% reduction in API costs
- **How:** Routes simple chats to cheaper models (Haiku) while keeping complex tasks on Sonnet

### Files Created/Modified
| File | Description |
|------|-------------|
| `model_router.py` | Core router with Jan 2026 model catalog (already existed) |
| `model_router_integration.py` | NEW - Bridge between web_server and router |
| `web_server.py` | Modified to use router for API calls |

### API Endpoints Added
| Endpoint | Description |
|----------|-------------|
| `GET /api/model-stats` | Full model usage and cost savings statistics |
| `GET /api/model-stats/quick` | Quick summary for dashboard display |

### How It Works
1. **Task Classification:** Analyzes user message to determine task type (simple_chat, code_generation, etc.)
2. **Model Selection:** Routes to optimal model based on January 2026 benchmarks
3. **Cost Tracking:** Records actual cost vs baseline (Sonnet) cost
4. **Savings Calculation:** Shows cumulative savings

### Model Routing Table (January 2026)
| Task Type | Optimal Model | Price (per 1M) |
|-----------|---------------|----------------|
| Simple Chat | gpt-5-nano -> Haiku | $0.25/$1.25 |
| Quick Status | gpt-5-nano -> Haiku | $0.25/$1.25 |
| Code Generation | claude-opus-4.5 -> Sonnet | $3/$15 |
| Tool Use | claude-sonnet (required) | $3/$15 |

### CLI Testing
```bash
# View stats
python model_router_integration.py --stats

# View today's stats
python model_router_integration.py --today

# Test routing for a message
python model_router_integration.py --test "What's the weather?"
```

### Usage in Code
```python
from model_router_integration import routed_chat, get_model_stats

# Routed API call (picks best model automatically)
response, routing_info = routed_chat(
    client=client,
    message="Hello, how are you?",
    system_prompt="You are a helpful assistant."
)
print(f"Used {routing_info['actual_model']}, saved ${routing_info['savings_usd']:.4f}")

# Get statistics
stats = get_model_stats(days=7)
print(f"This week: {stats['period']['total_calls']} calls, saved ${stats['period']['total_savings']:.2f}")
```

---

## SERVICE CONFIGURATION STATUS

**VERIFIED IN .env FILE** (not blocking - was incorrectly listed before)

| Service | Status | Verified |
|---------|--------|----------|
| Google OAuth | ✅ CONFIGURED | GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env |
| Supabase | ✅ CONFIGURED | SUPABASE_URL + SUPABASE_ANON_KEY + SERVICE_KEY in .env |
| Supabase Pro | ✅ CONFIGURED | SB_SECRET_KEY + SB_PUBLISHABLE_KEY added |
| Anthropic | ✅ CONFIGURED | ANTHROPIC_API_KEY in .env |
| VAPID Keys | ⏳ NOT SET | For push notifications (optional) |
| LangSmith | ⏳ NOT SET | For tracing/debugging (optional) |

**API Keys from task doc:**
- TWILIO_AUTH_TOKEN: ✅ Available
- GOOGLE_MAPS_API_KEY: ✅ Available

**LESSON LEARNED:** Always check .env before declaring something as "blocking"

---

## NEXT AGENT INSTRUCTIONS

**MANDATORY PRE-SESSION CHECKS:**

1. First, check what's actually configured:
```bash
cat /Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.env | grep -v "^#" | grep "="
```

2. Read the system status (single source of truth):
```bash
cat /Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/SYSTEM_STATUS.md
```

3. Then read today's progress:
```bash
cat /Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/TODAYS_PROGRESS.md
```

4. Check agent outputs:
```bash
ls -la /private/tmp/claude-501/-Users-samanthapollack-Documents-TIny-Seed-OS/tasks/
```

**NEVER assume something is "blocking" or "missing" without checking .env first!**

---

## SCRIPT HOSPITAL RESULTS (January 31, 2026)

**Status:** COMPLETE - All 5 priority scripts fixed and verified

### Issue Summary

| Script | Problem | Solution | Status |
|--------|---------|----------|--------|
| `life_organizer.py` | Missing `apscheduler` | `pip3 install apscheduler` | FIXED |
| `mcp_server.py` | Missing `mcp` SDK | Use `.mcp_venv` with Python 3.13 (mcp requires 3.10+) | FIXED |
| `a2a_server.py` | Wrong import path for `RequestContext` | Changed from `a2a.server.request_context` to `a2a.server.agent_execution` | FIXED |
| `langgraph_wrapper.py` | Missing `langgraph` | Installed in `.mcp_venv`: `pip install langgraph langchain-core` | FIXED |
| `app.py` | Textual API change (`Static.renderable` removed) | Updated to use `_renderable` with fallback | FIXED |

### Dependencies Installed (in .mcp_venv)

```bash
# APScheduler for life_organizer.py
apscheduler==3.11.2
tzlocal==5.3.1

# MCP for mcp_server.py (was already installed)
mcp==1.26.0

# A2A SDK for a2a_server.py
a2a-sdk==0.3.22
grpcio==1.76.0
protobuf==6.33.5
sqlalchemy==2.0.46
fastapi==0.128.0

# LangGraph for langgraph_wrapper.py
langgraph==1.0.7
langgraph-checkpoint==4.0.0
langchain-core==1.2.7
langsmith==0.6.7

# Textual for app.py
textual==7.5.0
```

### Verification Commands

```bash
# Test all scripts in the .mcp_venv
source /Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.mcp_venv/bin/activate

# life_organizer.py - status check
python life_organizer.py status

# mcp_server.py - help
python mcp_server.py --help

# a2a_server.py - help
python a2a_server.py --help

# langgraph_wrapper.py - status
python langgraph_wrapper.py --status

# app.py - import test (TUI requires terminal)
python -c "import app; print('OK')"
```

### Notes
- The `.mcp_venv` virtual environment uses Python 3.13 (via Homebrew)
- System Python (3.9.6) cannot install MCP/A2A SDKs (require 3.10+)
- All scripts have graceful degradation - they warn but don't crash if optional deps missing
- Supabase PostgreSQL checkpointing for langgraph is optional (falls back to local JSON)

---

## PREDICTIVE INTENT INTEGRATION (January 31, 2026)

**Status:** COMPLETE AND ACTIVE

### Overview
The dormant `predictive_intent.py` engine is now wired to the dashboard, providing "mind-reading" suggestions based on behavioral patterns, time, and context.

### Files Modified

| File | Changes |
|------|---------|
| `web_server.py` | Added 5 API endpoints for predictions |
| `web_dashboard.html` | Added UI in Life tab + JavaScript functions |
| `predictive_intent.py` | Added bootstrap suggestions for cold-start |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/predictions` | GET | Returns predictions + proactive suggestions |
| `/api/predictions/stats` | GET | Returns calibration & accuracy statistics |
| `/api/predictions/context` | GET | Returns current fused context |
| `/api/predictions/record-action` | POST | Records user action for learning |
| `/api/predictions/record-response` | POST | Records response to suggestion |

### Features

1. **Cold-Start Bootstrap**: New users get suggestions immediately
2. **Confidence Calibration**: Temperature scaling ensures accuracy
3. **Task Boundary Detection**: Won't interrupt deep work
4. **Energy/Focus Matching**: Matches suggestions to energy level
5. **Quick Actions**: One-click options for each suggestion
6. **Learning Loop**: Every action improves future predictions

### Testing

```bash
curl http://localhost:8000/api/predictions | jq
```

---

## CLI TOOLS DEPLOYMENT (January 31, 2026)

**Status:** COMPLETE

### Scripts Deployed

| Script | Purpose | Key Commands |
|--------|---------|--------------|
| `pm_direct_line.py` | Watch & respond to dashboard messages via Claude CLI | `--status`, `--once`, `--help` |
| `progress_monitor.py` | Track agent task progress from output files | `--status`, `--once`, `--help` |
| `project_manager.py` | Manage discrete file-based projects | `list`, `create`, `delete`, `log`, `entries`, `stats` |

### Usage Examples

```bash
# PM Direct Line - responds to dashboard chat using Claude CLI
python pm_direct_line.py --help     # Show usage
python pm_direct_line.py --status   # Show current status
python pm_direct_line.py --once     # Process pending messages and exit
python pm_direct_line.py            # Run continuously (watch mode)

# Progress Monitor - tracks agent task completion
python progress_monitor.py --help   # Show usage
python progress_monitor.py --status # Show task/agent status
python progress_monitor.py --once   # Update board.json once
python progress_monitor.py          # Run continuously

# Project Manager - discrete projects (dinner logs, wine journals, etc.)
python project_manager.py --help                    # Show all commands
python project_manager.py list                      # List all projects
python project_manager.py create "Wine Journal" wine_journal  # Create project
python project_manager.py log <project_id> "Great Cabernet"   # Quick log entry
python project_manager.py entries <project_id>     # View entries
python project_manager.py stats <project_id>       # View statistics
```

### Integration Points

- **pm_direct_line.py**: Watches `.pm_chat.json`, responds via Claude CLI with full terminal capabilities
- **progress_monitor.py**: Reads agent output files from `/private/tmp/claude/...`, updates `board.json` progress
- **project_manager.py**: Stores projects in `~/TinyPM/projects/` with JSON entries

### Features Added

1. **Proper `--help`** - All three scripts now have comprehensive argparse documentation
2. **`--status` commands** - View current state without running continuously
3. **`--once` mode** - Process/update once and exit (for cron jobs or manual runs)
4. **`--interval` option** - Customize poll interval for continuous modes
5. **Clean error handling** - Graceful degradation when files don't exist

---

*This file is the single source of truth for today's progress.*
