# TINYPM SYSTEM MANIFEST

## Complete Inventory of TinyPM Codebase

**Last Updated:** 2026-01-30
**Purpose:** Single source of truth for what exists in TinyPM

---

# PYTHON FILES

## Core Application

### app.py (937 lines) - WORKING
**Purpose:** Full TUI application for task management
**Status:** Production-ready, DO NOT REPLACE

| Function/Class | Purpose | Status |
|----------------|---------|--------|
| `TinyPM` | Main App class | Working |
| `NewTaskScreen` | Modal for task creation | Working |
| `LaunchConfirmScreen` | Agent launch confirmation | Working |
| `load_persona(role)` | Inject persona into Claude | Working |
| `get_available_personas()` | Discover personas/*.md | Working |

---

### pm_orchestrator.py (~1200 lines) - WORKING
**Purpose:** Intelligent autonomous PM system
**Status:** SOTA architecture, ENHANCE ONLY

| Class | Purpose | Status |
|-------|---------|--------|
| `Memory` | Dataclass for user_facts, project_facts, preferences | Working |
| `ProjectContext` | Tasks, builder_status, agent_questions | Working |
| `OrchestratorState` | Session tracking, errors | Working |
| `MemoryManager` | Load/save memory, learn from messages | Working |
| `ContextGatherer` | Gather ALL project context | Working |
| `SmartRouter` | Analyze messages, determine routing | Working |
| `ProactiveEngine` | Generate proactive suggestions (ENHANCED with ConfidenceScorer + TimingIntelligence) | Working |
| `ProactiveEngine._gather_potential_suggestions()` | Gather all potential suggestions with metadata | Working |
| `ProactiveEngine.record_suggestion_outcome()` | Record whether suggestion was helpful | Working |
| `AlertConsolidator` | Batch notifications into summaries | Working |
| `ClaudeInterface` | API and CLI calls | Working |
| `ResponseGenerator` | Build intelligent responses (ENHANCED with confidence-aware prompts) | Working |
| `ChannelManager` | Dashboard ↔ builder communication | Working |
| `PMOrchestrator` | Main coordinator (ENHANCED with AlertConsolidator integration) | Working |
| `PMOrchestrator._gather_and_consolidate_notifications()` | Gather and batch notifications | Working |
| `PMOrchestrator.send_consolidated_alert_if_needed()` | Send consolidated alerts using TimingIntelligence | Working |

**INTELLIGENCE INTEGRATION (2026-01-30):**
- [x] ProactiveEngine uses ConfidenceScorer to filter suggestions by confidence
- [x] ProactiveEngine uses TimingIntelligence to check if it's a good time to suggest
- [x] ResponseGenerator includes confidence levels in system prompts
- [x] PMOrchestrator uses AlertConsolidator to batch notifications
- [x] PMOrchestrator.status() shows intelligence statistics

**PLANNED ENHANCEMENTS:**
- [ ] Add checkpointing with PostgresSaver
- [ ] Add LangSmith tracing
- [ ] Add error recovery with retry policies

---

### pm_brain.py (~1985 lines) - WORKING
**Purpose:** Intelligent PM with learning capabilities
**Status:** Mem0-style memory, ENHANCE ONLY

| Function/Class | Purpose | Status |
|----------------|---------|--------|
| `store_fact(key, value)` | Persist facts | Working |
| `retrieve_fact(key)` | Get facts | Working |
| `add_context(content, type)` | Rolling context buffer | Working |
| `record_interaction(user, response, helpful)` | Learn from exchanges | Working |
| `predict_next_action()` | Anticipate based on patterns | Working |
| `check_proactive_suggestions()` | Find things to mention | Working |
| `estimate_timeout(task)` | Adaptive timeouts | Working |
| `ConfidenceScorer` | SOTA confidence calibration class | Working |
| `ConfidenceScorer.score_suggestion()` | Calculate calibrated confidence 0.0-1.0 | Working |
| `ConfidenceScorer.get_action_level()` | Return action level based on thresholds | Working |
| `ConfidenceScorer.record_outcome()` | Learn from user feedback | Working |
| `ConfidenceScorer.get_historical_accuracy()` | Get past accuracy for type | Working |
| `ConfidenceScorer.get_confidence_stats()` | Get confidence performance stats | Working |
| `ConfidenceScorer.should_suggest()` | Convenience method for suggestions | Working |
| `get_confidence_scorer()` | Get global ConfidenceScorer instance | Working |
| `TimingIntelligence` | SOTA timing intelligence class (IUI '26) | Working |
| `TimingIntelligence.is_good_time_to_suggest()` | Check if now is good time to suggest | Working |
| `TimingIntelligence.detect_task_boundary()` | Check if user just completed something | Working |
| `TimingIntelligence.is_in_deep_work()` | Check if user is in focused work | Working |
| `TimingIntelligence.get_next_good_window()` | Estimate next good intervention time | Working |
| `TimingIntelligence.record_timing_outcome()` | Learn from timing feedback | Working |
| `TimingIntelligence.record_user_action()` | Record user actions for analysis | Working |
| `TimingIntelligence.get_timing_stats()` | Get timing performance statistics | Working |
| `get_timing_intelligence()` | Get global TimingIntelligence instance | Working |
| `StyleLearner` | SOTA style learning class (Superhuman research) | Working |
| `StyleLearner.learn_from_text()` | Extract style patterns from user writing | Working |
| `StyleLearner.learn_from_messages()` | Learn from chat history | Working |
| `StyleLearner.get_style_profile()` | Return learned style characteristics | Working |
| `StyleLearner.apply_style()` | Rewrite draft in user's voice (basic) | Working |
| `StyleLearner.get_style_prompt()` | Return prompt for Claude to write in user's style | Working |
| `StyleLearner.get_style_stats()` | Get style learning statistics | Working |
| `StyleLearner.reset_profile()` | Reset style profile to defaults | Working |
| `get_style_learner()` | Get global StyleLearner instance | Working |

**Memory Structure:**
```python
{
  "facts": {},           # key-value store
  "relationships": [],   # graph structure
  "context": [],         # recent context
  "user_preferences": {} # learned preferences
}
```

**Pattern Structure:**
```python
{
  "time_patterns": {},           # What user does when
  "sequence_patterns": {},       # What follows what
  "response_effectiveness": {},  # How well responses worked
  "confidence_history": {},      # Track outcomes by suggestion type (NEW)
  "accuracy_by_type": {}         # Track accuracy metrics by type (NEW)
}
```

**Confidence Action Levels (SOTA Research):**
```python
# From PROACTIVE_AI_RESEARCH_2026.md
LEVEL_AUTO = ">95% confidence: Auto-execute, notify after"
LEVEL_APPROVE = "85-95%: Present for one-click approval"
LEVEL_CLARIFY = "70-85%: Ask specific clarifying question"
LEVEL_COLLABORATE = "50-70%: Collaborative mode"
LEVEL_CAVEAT = "<50%: Don't suggest, or caveat heavily"
```

**PLANNED ENHANCEMENTS:**
- [x] Add ConfidenceScorer class (DONE - 2026-01-30)
- [x] Add TimingIntelligence class (DONE - 2026-01-30, IUI '26 research)
- [x] Add StyleLearner class (DONE - 2026-01-30, Superhuman research)

---

### builder_autonomous.py (356 lines) - WORKING
**Purpose:** Autonomous code builder agent
**Status:** Working with mentor verification

| Function/Class | Purpose | Status |
|----------------|---------|--------|
| `pick_up_task()` | Get task from PM | Working |
| `build_task()` | Execute build | Working |
| `report_progress()` | Update PM on status | Working |
| `mentor_loop()` | Critic verification (3 retries) | Working |

**Constants:**
- MAX_TIMEOUT = 900 (15 min)
- DEFAULT_TIMEOUT = 300 (5 min)
- MAX_CRITIC_RETRIES = 3

---

### critic.py (268 lines) - WORKING
**Purpose:** Verification and quality assurance
**Status:** Working

| Function | Purpose | Status |
|----------|---------|--------|
| `critic_verify(task_type, output, context)` | Verify builder output | Working |
| `detect_task_type(task)` | Classify task | Working |
| `verify_code()` | Code verification | Working |
| `verify_api()` | API endpoint verification | Working |
| `verify_research()` | Research verification | Working |

---

### daily-evolution.py (855 lines) - WORKING
**Purpose:** Daily improvement system
**Status:** Best-in-class self-improving

| Function/Class | Purpose | Status |
|----------------|---------|--------|
| `perform_research()` | Today's research topic | Working |
| `run_evolution()` | Create tasks from research | Working |
| `run_auto_ingest()` | Ingest official docs | Working |
| `run_evaluations()` | Measure performance | Working |
| `show_evolution_stats()` | Display metrics | Working |
| `get_model_recommendation()` | Route to best model | Working |

**Model Routing:**
```python
MODEL_ROUTING = {
    "writing": "claude-opus-4.5",
    "planning": "claude-opus-4.5",
    "tools": "gpt-5.2",
    "vision": "gemini-3-pro",
}
```

---

### web_server.py (3,500+ lines) - WORKING
**Purpose:** Full web server with REST API
**Status:** Production API, ENHANCE ONLY

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/` | GET | Dashboard HTML | Working |
| `/api/tasks` | GET | List tasks | Working |
| `/api/tasks` | POST | Create task | Working |
| `/api/tasks/update` | POST | Update task | Working |
| `/api/tasks/delete` | POST | Delete task | Working |
| `/api/personas` | GET | List personas | Working |
| `/api/stats` | GET | Dashboard stats | Working |
| `/api/chat` | POST | Overseer chat | Working |
| `/api/braindump` | POST | Parse brain dump | Working |
| `/api/pm/chat` | GET/POST | PM chat | Working |
| `/api/builder/chat` | GET/POST | Builder chat | Working |
| `/api/agent/questions` | GET | Agent questions | Working |
| `/api/launch` | POST | Launch agent | Working |
| `/api/uploads` | GET | List uploads | Working |
| `/api/intercom` | GET | Inter-agent comms | Working |

**Key Features:**
- Intelligent PM auto-responder (background thread)
- Tool use (read_file, list_directory, search_files)
- Memory persistence
- Context gathering

---

## supabase_sync.py (~400 lines) - WORKING
**Purpose:** Supabase sync layer for cloud persistence
**Status:** Complete, ready to use
**Created:** 2026-01-30 by Backend_Agent_7

| Class/Function | Purpose | Status |
|----------------|---------|--------|
| `SupabaseSync` | Main sync class | Working |
| `SupabaseSync._init_client()` | Initialize Supabase client | Working |
| `SupabaseSync.is_connected()` | Check connection status | Working |
| `SupabaseSync.sync_tasks()` | Sync local tasks to cloud | Working |
| `SupabaseSync.fetch_tasks()` | Fetch tasks from cloud | Working |
| `SupabaseSync.fetch_tasks_by_status()` | Fetch tasks by status filter | Working |
| `SupabaseSync.delete_task()` | Delete task from cloud | Working |
| `SupabaseSync.sync_memory()` | Sync PM memory to cloud | Working |
| `SupabaseSync.fetch_memory()` | Fetch PM memory from cloud | Working |
| `SupabaseSync.sync_conversation()` | Sync chat history | Working |
| `SupabaseSync.fetch_conversation()` | Fetch chat history | Working |
| `SupabaseSync.list_conversations()` | List recent conversations | Working |
| `SupabaseSync.save_checkpoint()` | Save LangGraph checkpoint | Working |
| `SupabaseSync.load_checkpoint()` | Load LangGraph checkpoint | Working |
| `SupabaseSync.list_checkpoints()` | List recent checkpoints | Working |
| `SupabaseSync.delete_old_checkpoints()` | Cleanup old checkpoints | Working |
| `SupabaseSync.save_suggestion()` | Save proactive suggestion | Working |
| `SupabaseSync.resolve_suggestion()` | Mark suggestion resolved | Working |
| `SupabaseSync.sync_style_profile()` | Sync StyleLearner profile | Working |
| `SupabaseSync.fetch_style_profile()` | Fetch style profile | Working |
| `SupabaseSync.sync_all_local_data()` | Full backup utility | Working |
| `SupabaseSync.get_sync_status()` | Get connection/table stats | Working |
| `get_supabase_sync()` | Get global singleton instance | Working |

**CLI Usage:**
```bash
python supabase_sync.py          # Show status
python supabase_sync.py sync     # Sync all local data
python supabase_sync.py status   # Show detailed status
python supabase_sync.py fetch-tasks  # Fetch tasks from cloud
```

---

## supabase_schema.sql - COMPLETE
**Purpose:** Database schema for Supabase
**Status:** Ready to run in Supabase SQL Editor
**Created:** 2026-01-30 by Backend_Agent_7

**Tables:**
- `tasks` - Task board items
- `memory` - PM memory (Mem0-style)
- `conversations` - Chat history
- `checkpoints` - LangGraph checkpoints
- `suggestions` - Proactive suggestions tracking
- `style_profiles` - Learned user styles

---

## email_integration.py (~500 lines) - WORKING
**Purpose:** Gmail integration for proactive email intelligence
**Status:** Complete, needs oauth_manager.py for OAuth
**Created:** 2026-01-30 by Backend_Agent_10

| Class/Function | Purpose | Status |
|----------------|---------|--------|
| `EmailMessage` | Dataclass for email representation | Working |
| `EmailMessage.needs_response()` | Detect if email needs reply | Working |
| `EmailMessage.get_urgency_score()` | Score urgency 1-5 | Working |
| `EmailMessage.is_from_important_sender()` | Check important sender list | Working |
| `EmailIntegration` | Main email integration class | Working |
| `EmailIntegration._validate_scopes()` | SECURITY: Reject non-gmail scopes | Working |
| `EmailIntegration.is_connected()` | Check OAuth connection | Working |
| `EmailIntegration.get_connection_status()` | Get detailed connection info | Working |
| `EmailIntegration.get_unread_count()` | Get inbox unread count | Working |
| `EmailIntegration.get_unread_emails()` | Fetch unread emails | Working |
| `EmailIntegration.get_email_by_id()` | Fetch specific email | Working |
| `EmailIntegration.get_emails_needing_response()` | Filter emails needing reply | Working |
| `EmailIntegration.get_urgent_emails()` | Filter by urgency threshold | Working |
| `EmailIntegration.draft_reply()` | Create draft reply | Working |
| `EmailIntegration.draft_reply_in_user_voice()` | Draft reply using StyleLearner | Working |
| `EmailIntegration.extract_action_items()` | Extract action items from email | Working |
| `EmailIntegration.get_email_context_for_pm()` | Get context for PM suggestions | Working |
| `EmailIntegration.set_important_senders()` | Configure important senders | Working |
| `EmailIntegration.get_emails_from_important_senders()` | Filter by important senders | Working |
| `EmailIntegration.mark_as_read()` | Mark email as read | Working |
| `EmailIntegration.get_thread()` | Get all messages in thread | Working |
| `get_email_integration()` | Get global singleton instance | Working |

**CLI Usage:**
```bash
python email_integration.py          # Show connection status
python email_integration.py status   # Detailed status
python email_integration.py unread   # Count unread emails
python email_integration.py urgent   # List urgent emails
python email_integration.py context  # Get PM context JSON
```

**SECURITY BOUNDARIES:**
- Only `gmail.readonly` and `gmail.compose` scopes
- Rejects tokens with sheets/drive/docs/calendar access
- TinyPM is isolated from Tiny Seed OS

---

## calendar_integration.py (~550 lines) - WORKING
**Purpose:** Google Calendar integration for proactive scheduling
**Status:** Complete, needs OAuth credentials for full functionality
**Created:** 2026-01-30 by Backend_Agent_9

| Class/Function | Purpose | Status |
|----------------|---------|--------|
| `SecurityError` | Exception for security boundary violations | Working |
| `validate_scopes()` | SECURITY: Validate only calendar scopes allowed | Working |
| `CalendarEvent` | Dataclass for calendar event representation | Working |
| `CalendarEvent.minutes_until()` | Minutes until event starts | Working |
| `CalendarEvent.is_soon()` | Check if event starts within N minutes | Working |
| `CalendarEvent.duration_minutes()` | Get event duration | Working |
| `CalendarEvent.to_dict()` | Convert to JSON-serializable dict | Working |
| `CalendarIntegration` | Main calendar integration class | Working |
| `CalendarIntegration._get_access_token()` | Get OAuth token with scope validation | Working |
| `CalendarIntegration._api_request()` | Make authenticated API requests | Working |
| `CalendarIntegration._get_cached()` | Get cached API response | Working |
| `CalendarIntegration._set_cached()` | Cache API response with TTL | Working |
| `CalendarIntegration.is_connected()` | Check OAuth connection | Working |
| `CalendarIntegration.get_upcoming_events()` | Fetch events for next N hours | Working |
| `CalendarIntegration._parse_event()` | Parse Google API event to CalendarEvent | Working |
| `CalendarIntegration._parse_datetime()` | Parse datetime with timezone handling | Working |
| `CalendarIntegration.get_events_today()` | Get all today's events | Working |
| `CalendarIntegration.get_next_event()` | Get next upcoming event | Working |
| `CalendarIntegration.get_events_soon()` | Events starting within N minutes | Working |
| `CalendarIntegration.detect_conflicts()` | Find scheduling conflicts | Working |
| `CalendarIntegration.find_free_slots()` | Find available time blocks | Working |
| `CalendarIntegration.suggest_task_time()` | Suggest optimal time for task | Working |
| `CalendarIntegration.get_prep_time_needed()` | Estimate prep time for event | Working |
| `CalendarIntegration.get_focus_time_available()` | Calculate uninterrupted focus time | Working |
| `CalendarIntegration.get_calendar_context_for_pm()` | Full context for PM suggestions | Working |
| `CalendarIntegration.get_scheduling_advice()` | Human-readable scheduling advice | Working |
| `get_calendar_integration()` | Get global singleton instance | Working |

**CLI Usage:**
```bash
python calendar_integration.py          # Show usage
python calendar_integration.py status   # Connection status
python calendar_integration.py events   # List upcoming events
python calendar_integration.py free     # Find free time slots
python calendar_integration.py advice   # Get scheduling advice
python calendar_integration.py context  # Get PM context JSON
```

**SECURITY BOUNDARIES:**
- Only calendar.readonly, calendar.events.readonly, calendar, calendar.events scopes
- Explicitly rejects tokens with sheets/drive/gmail/docs access
- `validate_scopes()` raises `SecurityError` on forbidden scope
- TinyPM is completely isolated from Tiny Seed OS data

**Calendar Intelligence Features:**
- Prep time estimation based on event type, attendees, location
- Focus time calculation (detects deep work opportunities)
- Free slot finding with duration requirements
- Task scheduling suggestions (prefers morning for deep work)
- Conflict detection for proposed time slots
- Busy day detection (>5 events)

---

## oauth_manager.py (~650 lines) - WORKING
**Purpose:** Secure OAuth 2.0 manager for Google Calendar and Gmail
**Status:** Complete, ready for use
**Created:** 2026-01-30 by Backend_Agent_8

| Class/Function | Purpose | Status |
|----------------|---------|--------|
| `TINYPM_ALLOWED_SCOPES` | Whitelist of calendar/gmail scopes | Working |
| `FORBIDDEN_SCOPES` | Blacklist of sheets/drive scopes | Working |
| `OAuthBoundaryError` | Exception for security violations | Working |
| `OAuthConfigError` | Exception for config errors | Working |
| `OAuthTokenError` | Exception for token errors | Working |
| `TinyPMOAuthManager` | Main OAuth manager class | Working |
| `TinyPMOAuthManager._validate_config()` | Validate OAuth configuration | Working |
| `TinyPMOAuthManager.is_configured()` | Check if OAuth is configured | Working |
| `TinyPMOAuthManager._validate_scopes()` | SECURITY: Reject forbidden scopes | Working |
| `TinyPMOAuthManager._validate_token()` | SECURITY: Validate token scopes | Working |
| `TinyPMOAuthManager.get_authorization_url()` | Generate OAuth URL | Working |
| `TinyPMOAuthManager.exchange_code_for_tokens()` | Exchange code for tokens | Working |
| `TinyPMOAuthManager.refresh_access_token()` | Refresh expired token | Working |
| `TinyPMOAuthManager.save_tokens_to_supabase()` | Save tokens with tpm_ prefix | Working |
| `TinyPMOAuthManager._save_tokens_local()` | Fallback local storage | Working |
| `TinyPMOAuthManager.get_valid_access_token()` | Get token, auto-refresh | Working |
| `TinyPMOAuthManager._load_tokens()` | Load from Supabase or local | Working |
| `TinyPMOAuthManager.revoke_tokens()` | Revoke and delete tokens | Working |
| `TinyPMOAuthManager.get_user_info()` | Get user info from Google | Working |
| `TinyPMOAuthManager.get_status()` | Get OAuth status | Working |
| `get_oauth_manager()` | Get global singleton instance | Working |

**CLI Usage:**
```bash
python oauth_manager.py              # Show status and help
python oauth_manager.py auth-url     # Get authorization URL
python oauth_manager.py status       # Detailed status JSON
python oauth_manager.py test-scopes  # Test scope validation
python oauth_manager.py exchange <code>  # Exchange code for tokens
python oauth_manager.py revoke <user_id> # Revoke user tokens
```

**SECURITY BOUNDARIES (CRITICAL):**
- Only calendar.readonly, calendar.events, gmail.readonly, gmail.compose, openid, email, profile allowed
- FORBIDDEN: spreadsheets, drive, documents, drive.file, drive.readonly, drive.metadata, drive.appdata
- Token prefix: `tpm_` (prevents collision with other systems)
- Token table: `tinypm_oauth_tokens` (separate from Tiny Seed OS)
- _validate_token() called on EVERY exchange and refresh
- Raises OAuthBoundaryError on violation

---

## PASTE_OAUTH_TABLE.sql - COMPLETE
**Purpose:** Database migration for OAuth tokens table
**Status:** Ready to run in Supabase SQL Editor
**Created:** 2026-01-30 by Backend_Agent_8

**Creates:**
- `tinypm_oauth_tokens` table (separate from Tiny Seed OS)
- Row Level Security policy
- Indexes on expires_at and updated_at
- Auto-update trigger for timestamps
- Optional scope validation function
- Cleanup function for expired tokens

---

## Files To Create (PLANNED)

| File | Purpose | Priority | Status |
|------|---------|----------|--------|
| `langgraph_wrapper.py` | LangGraph state machine | P1 | Not started |

---

# FRONTEND FILES

### web_dashboard.html (4,800+ lines) - WORKING
**Purpose:** Mobile-friendly web dashboard
**Status:** Production-ready, ENHANCE ONLY

**Sections:**
- Header with stats (pending, in progress, done)
- Filter bar
- Task list with cards
- Task detail panel
- Chat panel (PM communication)
- New task modal
- Edit task modal

**Style:** Dark theme (Linear/Superhuman inspired)

---

# PERSONAS (7 total)

| Persona | Lines | Purpose | Status |
|---------|-------|---------|--------|
| `architect.md` | 1,138 | Plans, doesn't code | Complete |
| `builder.md` | 1,026 | Writes production code | Complete |
| `chief-of-staff.md` | 1,165 | Coordinates everything | Complete |
| `evolver.md` | 3,960 | Daily improvement | Complete |
| `overseer.md` | 8,232 | Full project context | Complete |
| `qa.md` | 983 | Testing and auditing | Complete |
| `researcher.md` | 3,476 | Research tasks | Complete |

**DO NOT MODIFY PERSONAS** - They are complete and well-designed.

---

# STATE FILES

| File | Purpose | Status |
|------|---------|--------|
| `board.json` | Task database | Active, has real data |
| `.pm_chat.json` | Chat history | Active |
| `.pm_memory.json` | Memory store | Active, has learned data |
| `.pm_patterns.json` | Learned patterns | Active |
| `.pm_orchestrator_state.json` | Orchestrator state | Active |
| `.pm_brain_state.json` | Brain state | Active |
| `.claude_intercom.json` | Agent communication | Active |
| `.agent_questions.json` | Pending questions | Active |
| `.launch_checklist.json` | Launch readiness | Active |
| `.pm_style_profile.json` | Learned user style | Active |
| `.env` | Environment variables (local) | Active |
| `.env.example` | Env template for setup | Complete |

**DO NOT DELETE STATE FILES** - They contain learned data.

---

# SHELL SCRIPTS

| Script | Purpose | Status |
|--------|---------|--------|
| `start-terminal.sh` | Launch TUI | Working |
| `start-web.sh` | Launch web server | Working |
| `pm_inbox_poll.sh` | Poll PM inbox | Working |
| `pm_reply.sh` | Send PM replies | Working |
| `pm_to_builder.sh` | PM → Builder comms | Working |
| `builder_to_pm.sh` | Builder → PM comms | Working |
| `builder_poll.sh` | Builder polls for tasks | Working |
| `agent_ask.sh` | Agent question system | Working |
| `agent_wait_answer.sh` | Wait for answers | Working |
| `pm_watch.sh` | Watch PM state | Working |

---

# DOCUMENTATION

| Document | Purpose | Status |
|----------|---------|--------|
| `README.md` | Project overview | Complete |
| `CURRENT_STATE_AUDIT.md` | Codebase audit | Complete |
| `ENHANCEMENT_PLAN_2026.md` | Build roadmap | Complete |
| `PROTOTYPE_BUILD_PLAN.md` | Original plan | Superseded |
| `COMPETITOR_ANALYSIS_2026.md` | Competitor research | Complete |
| `SOTA_MULTI_AGENT_RESEARCH_2026.md` | SOTA research | Complete |
| `PROACTIVE_AI_RESEARCH_2026.md` | Proactive AI research | Complete |
| `TINYPM_CLAUDE.md` | Coordination rules | Complete |
| `TINYPM_MANIFEST.md` | This file | Active |
| `TINYPM_WORKLOG.md` | Work tracking | Active |

---

# DIRECTORY STRUCTURE

```
tinypm/
├── app.py                      # TUI application
├── pm_orchestrator.py          # PM system
├── pm_brain.py                 # Memory/learning
├── builder_autonomous.py       # Builder agent
├── critic.py                   # Verification
├── daily-evolution.py          # Self-improvement
├── web_server.py               # API server
├── supabase_sync.py            # Cloud persistence
├── calendar_integration.py     # Google Calendar (NEW)
├── email_integration.py        # Gmail integration
├── oauth_manager.py            # OAuth2 flow
├── web_dashboard.html          # Dashboard UI
├── board.json                  # Task database
├── personas/                   # 7 persona definitions
│   ├── architect.md
│   ├── builder.md
│   ├── chief-of-staff.md
│   ├── evolver.md
│   ├── overseer.md
│   ├── qa.md
│   └── researcher.md
├── research/                   # Research outputs
├── uploads/                    # User uploads
├── .pm_*.json                  # State files (hidden)
├── *.sh                        # Shell scripts
├── TINYPM_CLAUDE.md           # Rules
├── TINYPM_MANIFEST.md         # This file
├── TINYPM_WORKLOG.md          # Work log
└── *.md                        # Documentation
```

---

*Manifest created: 2026-01-30*
*Keep this file updated with every change.*
