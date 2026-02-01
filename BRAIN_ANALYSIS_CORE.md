# BRAIN ANALYSIS: CORE SYSTEMS
## TinyPM Migration to Chief of Staff Brain - Technical Deep Dive

**Created:** 2026-02-01
**Team:** Migration Deep Dive - Core Systems
**Methodology:** Researcher/Builder/Critic

---

## EXECUTIVE SUMMARY

This document provides a comprehensive technical analysis of the three core brain systems that will power the Tiny Seed OS Chief of Staff:

1. **pm_brain.py** - Pattern learning, confidence scoring, timing intelligence, and style learning
2. **pm_orchestrator.py** - Multi-agent coordination, context gathering, error recovery, and response generation
3. **predictive_intent.py** - Behavior pattern mining, confidence calibration, and intent prediction

These systems represent a sophisticated SOTA (State of the Art) implementation based on January 2026 research, including Mem0-style hybrid memory, IUI '26 timing research, and Bayesian confidence calibration.

---

## PHASE 1: RESEARCHER - COMPREHENSIVE DOCUMENTATION

---

### 1. MIGRATION README OVERVIEW

**Location:** `/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm_for_tinyseed_os/MIGRATION_README.md`

**Purpose:** Complete TinyPM codebase for integration as the "Brain" of Tiny Seed OS.

**Four Editions Available:**
1. Builder Edition - Self-improving
2. Consumer Edition - Plug and play
3. Developer Edition - API-first
4. **Brain Edition** - Chief of Staff Brain (TARGET)

**Key Integration Points:**
```python
from pm_orchestrator import PMOrchestrator
from pm_brain import PMBrain
from predictive_intent import PredictiveIntentEngine

brain = PMBrain()
orchestrator = PMOrchestrator(brain=brain)
intent = PredictiveIntentEngine()
orchestrator.start_watching()
```

**Intercom System:** Uses `.claude_intercom.json` for message passing between Claude sessions.

---

### 2. PM_BRAIN.PY - COMPLETE ANALYSIS

**Location:** `/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm_for_tinyseed_os/pm_brain.py`
**Lines:** ~2,082

#### Configuration Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `PM_CHAT_FILE` | `.pm_chat.json` | Dashboard chat messages |
| `PM_BRAIN_STATE` | `.pm_brain_state.json` | Brain state persistence |
| `MEMORY_FILE` | `.pm_memory.json` | Mem0-style hybrid memory |
| `PATTERNS_FILE` | `.pm_patterns.json` | Learned patterns |
| `TIMING_STATE_FILE` | `.pm_timing_state.json` | Timing intelligence state |
| `STYLE_PROFILE_FILE` | `.pm_style_profile.json` | User style profile |
| `CHECK_INTERVAL` | 5 seconds | Polling interval |
| `MAX_RESPONSE_TIME` | 180 seconds | Claude CLI timeout |

#### Classes and Methods

##### 1. ConfidenceScorer Class (Lines 308-654)

**Purpose:** Calibrated confidence scoring for proactive suggestions based on 2026 SOTA research.

**Action Level Thresholds:**
```python
THRESHOLD_AUTO = 0.95      # Auto-execute, notify after
THRESHOLD_APPROVE = 0.85   # One-click approval
THRESHOLD_CLARIFY = 0.70   # Ask clarifying question
THRESHOLD_COLLABORATE = 0.50  # Collaborative mode
```

**Key Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `score_suggestion` | `(suggestion_type: str, context: dict = None) -> float` | Calculate calibrated confidence 0.0-1.0 |
| `get_action_level` | `(confidence: float) -> str` | Determine presentation level |
| `record_outcome` | `(suggestion_type: str, was_accepted: bool)` | Feedback loop for learning |
| `get_historical_accuracy` | `(suggestion_type: str) -> float` | Past accuracy for suggestion type |
| `should_suggest` | `(suggestion_type: str, context: dict) -> tuple` | Convenience check |
| `get_confidence_stats` | `() -> dict` | Performance metrics |

**Email Urgency Boosting (Lines 416-439):**
- Email urgency (1-5) provides confidence boost
- Important sender detection
- Stale email age (>24h, >48h) boosts urgency

##### 2. TimingIntelligence Class (Lines 665-1076)

**Purpose:** Determine optimal moments for proactive suggestions based on IUI '26 research.

**Research Basis:**
- Task boundary interventions: **52% engagement rate**
- Mid-task interruptions: **38% engagement rate** (62% dismissed)
- Well-timed suggestions: **45.4s interpretation time** vs 101.4s for poorly-timed

**Key Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `record_user_action` | `(action_type: str, metadata: dict = None)` | Track actions for timing |
| `is_good_time_to_suggest` | `(calendar_context: dict = None) -> bool` | Check if good moment |
| `detect_task_boundary` | `() -> bool` | Check for task completion |
| `is_in_deep_work` | `() -> bool` | Check if user is focused |
| `get_next_good_window` | `() -> dict` | Estimate next good time |
| `record_timing_outcome` | `(was_good_time: bool, context: dict)` | Learn from outcomes |
| `get_timing_stats` | `() -> dict` | Performance statistics |

**Calendar Awareness (Lines 780-800):**
- Never interrupt during meetings
- Don't interrupt within 5 min of meeting start
- Calendar gaps are good times for suggestions

##### 3. StyleLearner Class (Lines 1087-1657)

**Purpose:** Learn user's communication style (Superhuman-inspired "voice learning").

**Style Characteristics Learned:**
- Formality level (0=casual, 1=formal)
- Average sentence length
- Greeting/closing patterns
- Vocabulary patterns (filler phrases)
- Punctuation style (exclamations, ellipses)
- Emoji usage (none, rare, moderate, frequent)

**Key Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `learn_from_text` | `(text: str, text_type: str = "message")` | Extract style from writing |
| `learn_from_messages` | `(messages: list)` | Batch learning from chat |
| `get_style_profile` | `() -> dict` | Current learned profile |
| `get_style_prompt` | `() -> str` | Prompt for Claude to mimic style |
| `apply_style` | `(draft: str) -> str` | Basic style transformation |
| `reset_profile` | `()` | Clear learned style |

**Analysis Methods:**
- `_analyze_formality` - Formal vs casual markers
- `_analyze_sentence_length` - Words per sentence
- `_analyze_greetings_closings` - Pattern extraction
- `_analyze_vocabulary` - Common phrases
- `_analyze_punctuation` - Exclamation/ellipsis usage
- `_analyze_emoji` - Emoji frequency

#### Memory System Functions (Lines 108-163)

**Mem0-Style Hybrid Memory:**

```python
def load_memory() -> dict:
    # Returns:
    #   facts: {}          # Key-value for fast retrieval
    #   relationships: []  # Graph-like connections
    #   context: []        # Rolling context buffer
    #   user_preferences: {}

def store_fact(key: str, value: str)
def retrieve_fact(key: str)
def add_context(content: str, context_type: str = "conversation")
def get_relevant_context(limit: int = 10) -> list
```

#### Pattern Learning Functions (Lines 169-241)

```python
def load_patterns() -> dict:
    # Returns:
    #   time_patterns: {}      # Hour/day -> action distribution
    #   sequence_patterns: {}  # What follows what
    #   response_effectiveness: {}  # How well responses worked

def categorize_input(text: str) -> str:
    # Returns: "task_request", "question", "status_check", "urgent_request", "general"

def record_interaction(user_input: str, response: str, was_helpful: bool)
def predict_next_action() -> Optional[str]
```

#### Proactive Intelligence Functions (Lines 247-302)

```python
def check_proactive_suggestions() -> list:
    # Checks: stale tasks, builder health

def estimate_timeout(task: str) -> int:
    # Returns: 600s for research, 480s for implementation, 180s default
```

#### Claude CLI Interface (Lines 1735-1784)

```python
def call_claude(prompt: str, session_id: str = None, timeout: int = None) -> tuple[str, bool]:
    # Uses: ~/.local/bin/claude with --dangerously-skip-permissions
    # Returns: (response_text, success)
```

---

### 3. PM_ORCHESTRATOR.PY - COMPLETE ANALYSIS

**Location:** `/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm_for_tinyseed_os/pm_orchestrator.py`
**Lines:** ~2,600+

#### Architecture Diagram

```
+---------------------------------------------------------------------------+
|                           PM ORCHESTRATOR                                  |
+---------------------------------------------------------------------------+
|  +-------------+  +-------------+  +-------------+  +--------------+      |
|  |   WATCHER   |->|   BRAIN     |->|   MEMORY    |->|   ROUTER     |      |
|  | (File Poll) |  | (Claude)    |  | (Persist)   |  | (Decide)     |      |
|  +-------------+  +-------------+  +-------------+  +--------------+      |
|         |               |                                 |               |
|  +------------------------------------------------------------------+    |
|  |                    CHANNEL MANAGER                                |    |
|  |  Dashboard <-> Builder <-> Agents <-> Alerts                      |    |
|  +------------------------------------------------------------------+    |
+---------------------------------------------------------------------------+
```

#### Configuration Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `WATCH_INTERVAL` | 3 seconds | File check frequency |
| `HEARTBEAT_INTERVAL` | 30 seconds | Health check frequency |
| `PROACTIVE_CHECK_INTERVAL` | 60 seconds | Suggestion check frequency |
| `BUILDER_TIMEOUT` | 300 seconds | Builder assumed dead |
| `CLAUDE_TIMEOUT` | 120 seconds | Claude response timeout |

#### Enums

```python
class MessagePriority(Enum):
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4

class AgentStatus(Enum):
    IDLE = "idle"
    WORKING = "working"
    WAITING = "waiting"
    ERROR = "error"
    OFFLINE = "offline"
```

#### Data Classes

##### Memory (Lines 191-232)
```python
@dataclass
class Memory:
    user_facts: List[str]           # Max 50
    project_facts: List[str]        # Max 50
    preferences: Dict[str, Any]
    conversation_topics: List[Dict]
    pending_followups: List[str]    # Max 20
    learned_patterns: List[Dict]
    important_dates: List[Dict]
    last_interactions: List[Dict]   # Max 100

    def add_fact(category: str, fact: str)
    def add_followup(item: str)
    def record_interaction(user_msg: str, pm_response: str)
```

##### ProjectContext (Lines 234-266)
```python
@dataclass
class ProjectContext:
    # Task context
    tasks_pending: int
    tasks_in_progress: int
    tasks_total: int
    active_tasks: List[str]

    # Builder context
    builder_status: str
    builder_last_msg: str
    builder_queue_size: int

    # Agent context
    agent_questions_waiting: int

    # Launch context
    launch_progress_pct: int
    launch_items_done: int
    launch_items_total: int

    # Calendar context (NEW)
    calendar_connected: bool
    next_meeting_in_minutes: Optional[int]
    next_meeting_title: Optional[str]
    prep_time_needed: bool
    focus_time_minutes: int
    is_in_meeting: bool
    busy_day: bool
    events_today_count: int

    # Email context (NEW)
    email_connected: bool
    unread_email_count: int
    urgent_email_count: int
    emails_needing_response: int
    urgent_emails: List[Dict]
    email_action_items: List[str]
```

##### OrchestratorState (Lines 268-279)
```python
@dataclass
class OrchestratorState:
    session_id: str
    started_at: str
    last_heartbeat: str
    messages_processed: int
    proactive_suggestions: int
    errors: int
    builder_last_seen: str
    last_processed_msg_id: int
    mode: str  # active, paused, maintenance
```

#### Classes

##### 1. ErrorRecovery Class (Lines 343-730)

**Purpose:** SOTA error recovery patterns for resilient AI operations.

**Patterns Implemented:**
1. Exponential backoff with jitter
2. Circuit breaker pattern
3. Graceful degradation
4. Persistent error logging

**Circuit Breaker States:**
```python
class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Blocking requests
    HALF_OPEN = "half_open"  # Testing recovery
```

**Configuration:**
```python
@dataclass
class CircuitBreakerConfig:
    failure_threshold: int = 5     # Failures before opening
    recovery_timeout: float = 60.0 # Seconds before retry
    success_threshold: int = 2     # Successes to close
```

**Key Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `calculate_backoff` | `(attempt: int, base_delay: float, max_delay: float) -> float` | Exponential backoff with jitter |
| `is_circuit_open` | `(operation_name: str) -> bool` | Check if blocking |
| `record_success` | `(operation_name: str)` | Track success, close circuit |
| `record_failure` | `(operation_name: str, error: Exception, context: dict)` | Track failure, open circuit |
| `with_retry` | `(func, operation_name, max_attempts, ...) -> Callable` | Decorator for retry |
| `get_fallback_response` | `(operation_name: str) -> dict` | Graceful degradation |

##### 2. MemoryManager Class (Lines 737-805)

**Purpose:** Persistent memory with learning capabilities.

**Key Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `_load` | `() -> Memory` | Load from disk |
| `save` | `()` | Persist to disk |
| `learn_from_message` | `(user_msg: str, pm_response: str)` | Extract learnings |
| `get_context_for_prompt` | `() -> str` | Format for Claude |

**Learning Triggers:**
- Identity phrases: "my name is", "I am", "call me"
- Preferences: "I prefer", "I like", "I want"
- Deadlines: "deadline", "by", "due", "before"
- Followups: "I'll follow up", "will check", "remind me"

##### 3. ContextGatherer Class (Lines 811-939)

**Purpose:** Gathers comprehensive project context including calendar and email.

**Key Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `gather` | `() -> ProjectContext` | Collect all context |
| `format_for_prompt` | `(ctx: ProjectContext) -> str` | Format for Claude |

**Data Sources:**
- `board.json` - Task board
- `.claude_intercom.json` - Builder status
- `.agent_questions.json` - Agent questions
- `.launch_checklist.json` - Launch readiness
- Calendar integration (if available)
- Email integration (if available)

##### 4. IntegratedContextGatherer Class (Lines 945-1163)

**Purpose:** Unified context combining task, calendar, and email.

**Key Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `get_unified_context` | `() -> Dict[str, Any]` | Complete context dict |
| `_compute_insights` | `(ctx: ProjectContext) -> Dict` | Actionable insights |
| `format_for_claude_prompt` | `() -> str` | Rich formatted context |
| `get_timing_context_for_proactive` | `() -> Dict` | Timing-specific context |

**Computed Insights:**
- **Priorities:** Urgent emails, agent questions blocking work
- **Warnings:** Meeting prep needed, overload risk
- **Opportunities:** Focus time available, inbox zero candidate

##### 5. SmartRouter Class (Lines 1170-1217)

**Purpose:** Decides how to handle incoming messages.

**Keyword Categories:**
```python
BUILDER_KEYWORDS = ["build", "create", "code", "implement", "fix bug", "add feature",
                    "write", "develop", "html", "css", "javascript", "python"]
URGENT_KEYWORDS = ["urgent", "asap", "now", "immediately", "critical", "broken", "down", "error"]
INFO_KEYWORDS = ["status", "update", "progress", "what", "how", "where", "when", "why"]
```

**Key Method:**
```python
@classmethod
def analyze(cls, message: str) -> Dict[str, Any]:
    # Returns:
    #   route: "pm" | "builder" | "research"
    #   priority: MessagePriority
    #   should_delegate: bool
    #   delegate_to: str | None
    #   needs_context: bool
    #   proactive_hint: str | None
```

##### 6. ProactiveEngine Class (Lines 1223-1603)

**Purpose:** Generates proactive suggestions and alerts with SOTA intelligence.

**Integrations:**
- ConfidenceScorer - Calibrated confidence
- TimingIntelligence - Optimal intervention timing
- PredictiveIntentEngine - Mind-reading prediction

**Suggestion Types:**
| Type | Priority | Base Confidence |
|------|----------|-----------------|
| `question_pending` | high | 0.90 |
| `builder_update` | normal | 0.85 |
| `milestone_reached` | normal | 0.95 |
| `followup_reminder` | low | 0.75 |
| `stale_task` | low | 0.60 |
| `meeting_prep` | high | 0.95 |
| `focus_time_available` | low | 0.80 |
| `meeting_coming_up` | normal | 0.85 |
| `busy_day_alert` | normal | 0.85 |
| `urgent_email` | high | 0.90 |
| `emails_pending_response` | normal | 0.75 |
| `email_action_items` | normal | 0.70 |
| `inbox_overload` | low | 0.65 |

**Key Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `_gather_potential_suggestions` | `(ctx: ProjectContext) -> List[Dict]` | Collect all suggestions |
| `check_for_proactive_items` | `(ctx: ProjectContext) -> List[str]` | Filter with confidence |
| `should_send_proactive_message` | `(ctx: ProjectContext) -> Tuple[bool, Optional[str]]` | Decide to send |
| `record_suggestion_outcome` | `(suggestion_type: str, was_helpful: bool)` | Learning feedback |
| `record_user_action` | `(action_type: str, context: Dict, metadata: Dict)` | Pattern learning |

##### 7. AlertConsolidator Class (Lines 1608-1798)

**Purpose:** Batches multiple notifications into digestible summaries.

**Research Basis:**
- 59% of leaders say too many alerts cause inefficiency
- 62% of alerts are entirely ignored

**Alert Types:**
- `task_due` - Tasks due today
- `task_overdue` - Tasks past deadline
- `builder_update` - Builder status changes
- `question_pending` - Agent questions
- `calendar_event` - Upcoming meetings

**Priority Weights:**
```python
PRIORITY_WEIGHTS = {
    "critical": 4,
    "high": 3,
    "normal": 2,
    "low": 1
}
```

**Key Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `add_alert` | `(alert_type: str, content: str, priority: str)` | Queue alert |
| `should_consolidate` | `() -> bool` | Check threshold (2+) |
| `consolidate` | `() -> str` | Create narrative summary |
| `clear` | `()` | Clear after delivery |

##### 8. ClaudeInterface Class (Lines 1807-1872)

**Purpose:** Interface to Claude - supports both API and CLI.

**Key Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `call_api` | `(system_prompt: str, messages: List[Dict]) -> Tuple[str, bool]` | Claude API call |
| `call_cli` | `(prompt: str) -> Tuple[str, bool]` | Claude CLI call |

**API Model:** `claude-sonnet-4-20250514`

##### 9. ResponseGenerator Class (Lines 1878-2027)

**Purpose:** Generates intelligent PM responses with calendar/email awareness.

**Key Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `build_system_prompt` | `(ctx, proactive_items, confidence_info) -> str` | Build Claude prompt |
| `generate` | `(user_message, conversation_history, ctx) -> str` | Generate response |

**System Prompt Structure:**
1. Core Directives (6 rules)
2. Current Project State
3. Memory & Learned Facts
4. Proactive Items
5. Confidence Guidance
6. Calendar & Email Awareness
7. Response Format Guidelines

##### 10. ChannelManager Class (Lines 2033-2118)

**Purpose:** Manages all communication channels.

**Key Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `get_new_dashboard_messages` | `() -> List[Dict]` | New user messages |
| `get_new_builder_messages` | `() -> List[Dict]` | New builder messages |
| `send_dashboard_response` | `(response: str, original_id: int)` | Send PM response |
| `send_to_builder` | `(task: str, priority: str)` | Delegate to builder |
| `mark_builder_messages_read` | `(msg_ids: List[int])` | Mark as read |
| `get_conversation_history` | `() -> List[Dict]` | Recent 12 messages |

##### 11. PMOrchestrator Class (Lines 2124-2600+)

**Purpose:** Main orchestrator - coordinates everything.

**Integrations:**
- AlertConsolidator - Batch notifications
- ConfidenceScorer - Via ProactiveEngine
- TimingIntelligence - Via ProactiveEngine
- LangGraph (optional) - Durable execution
- Skills System (optional) - Modular skill execution

**Key Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `try_skill_execution` | `(user_message: str) -> Optional[str]` | Route to skills |
| `process_dashboard_message` | `(msg: Dict)` | Handle user message |
| `process_builder_messages` | `(messages: List[Dict])` | Handle builder updates |
| `heartbeat` | `()` | System health check |
| `send_consolidated_alert_if_needed` | `()` | Send batched alerts |
| `run_cycle` | `()` | One orchestrator cycle |
| `run` | `()` | Main loop |
| `status` | `()` | Print current status |

**Run Cycle Flow:**
1. Check for dashboard messages
2. Process each message (skill routing -> LangGraph -> traditional)
3. Check for builder messages
4. Send consolidated alerts if needed
5. Sleep for WATCH_INTERVAL

---

### 4. PREDICTIVE_INTENT.PY - COMPLETE ANALYSIS

**Location:** `/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm_for_tinyseed_os/predictive_intent.py`
**Lines:** ~2,000+

#### Core Philosophy
> "The best PM system knows what you need before you do."

#### Research Basis
- IUI '26: Task boundary interventions (52% engagement)
- Superhuman's anticipatory email suggestions
- Notion AI's context-aware completions
- Mem0 hybrid memory architecture

#### Enums

```python
class ActionCategory(Enum):
    TASK_MANAGEMENT = "task_management"
    COMMUNICATION = "communication"
    CALENDAR = "calendar"
    DEEP_WORK = "deep_work"
    PLANNING = "planning"
    ADMINISTRATIVE = "administrative"
    RESEARCH = "research"
    REVIEW = "review"
    DELEGATION = "delegation"
    STANDUP = "standup"
    UNKNOWN = "unknown"

class ContextSignal(Enum):
    TIME_OF_DAY = "time_of_day"
    DAY_OF_WEEK = "day_of_week"
    CALENDAR_STATE = "calendar_state"
    EMAIL_STATE = "email_state"
    TASK_STATE = "task_state"
    RECENT_ACTIONS = "recent_actions"
    SESSION_DURATION = "session_duration"
    ENERGY_ESTIMATE = "energy_estimate"
    MEETING_PROXIMITY = "meeting_proximity"
    DEADLINE_PRESSURE = "deadline_pressure"
```

#### Data Classes

##### ActionEvent (Lines 141-170)
```python
@dataclass
class ActionEvent:
    id: str
    timestamp: datetime
    category: ActionCategory
    action_type: str
    context: Dict[str, Any]
    metadata: Dict[str, Any]
```

##### PredictedAction (Lines 173-194)
```python
@dataclass
class PredictedAction:
    action_type: str
    category: ActionCategory
    confidence: float               # 0.0 - 1.0
    reasoning: List[str]
    suggested_time: Optional[datetime]
    supporting_evidence: Dict[str, Any]
    action_level: str               # auto, approve, suggest, collaborative
```

##### ProactiveSuggestion (Lines 197-215)
```python
@dataclass
class ProactiveSuggestion:
    message: str
    prediction: PredictedAction
    priority: int
    quick_actions: List[str]
    expires_at: Optional[datetime]
    shown_at: Optional[datetime]
```

##### FusedContext (Lines 218-264)
```python
@dataclass
class FusedContext:
    # Time context
    hour: int
    minute: int
    day_of_week: int
    day_name: str
    is_weekend: bool
    is_morning: bool
    is_afternoon: bool
    is_evening: bool

    # Calendar context
    calendar_connected: bool
    next_meeting_in_minutes: Optional[int]
    is_in_meeting: bool
    meetings_today: int
    free_time_minutes: int
    busy_day: bool

    # Email context
    email_connected: bool
    unread_count: int
    urgent_count: int
    needs_response_count: int

    # Task context
    tasks_pending: int
    tasks_in_progress: int
    tasks_overdue: int
    has_urgent_deadline: bool

    # Recent activity
    recent_action_categories: List[str]
    session_duration_minutes: int
    actions_this_hour: int

    # Derived signals
    energy_estimate: float          # 0-1
    focus_likelihood: float         # 0-1
    meeting_pressure: float         # 0-1
    deadline_pressure: float        # 0-1
```

#### Classes

##### 1. BehaviorPatternMiner Class (Lines 270-567)

**Purpose:** Mines behavioral patterns from user action history.

**Pattern Types:**
1. Time-of-day patterns - What user does at specific hours
2. Day-of-week patterns - Monday vs Friday behaviors
3. Sequence patterns - After X, user usually does Y
4. Trigger patterns - When event E happens, user does A
5. Duration patterns - Time spent on activities
6. Transition patterns - Category switching behavior

**Configuration:**
```python
MIN_SAMPLES_FOR_PATTERN = 3
MIN_SAMPLES_FOR_CONFIDENCE = 10
```

**Key Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `record_action` | `(action: ActionEvent)` | Add action to history |
| `_update_time_patterns` | `(action: ActionEvent)` | Update hour/day patterns |
| `_update_sequence_patterns` | `(action: ActionEvent)` | Update what-follows-what |
| `mine_trigger_patterns` | `()` | Extract trigger->action patterns |
| `get_time_pattern` | `(hour: int, day: int = None) -> Dict[str, float]` | Action distribution |
| `get_sequence_prediction` | `(last_action: str, limit: int) -> List[Tuple[str, float]]` | Next actions |
| `get_trigger_response` | `(trigger: str) -> List[Tuple[str, float]]` | Actions for trigger |
| `get_pattern_confidence` | `(pattern_type: str, pattern_key: str) -> float` | Confidence 0-0.95 |
| `get_most_common_actions` | `(hour, day, limit) -> List[Tuple[str, int]]` | Top actions |
| `get_stats` | `() -> Dict` | Mining statistics |

##### 2. ConfidenceCalibrator Class (Lines 574-878)

**Purpose:** SOTA confidence calibration using temperature scaling and historical blending.

**Algorithm:**
1. **Temperature Scaling:** `calibrated = sigmoid(logit(raw_conf) / temperature)`
   - Temperature > 1: Less confident (spreads distribution)
   - Temperature < 1: More confident (sharpens distribution)
2. **Historical Blending:** 60% current + 40% track record

**Target:** Expected Calibration Error (ECE) < 10%

**Key Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `_temperature_scale` | `(confidence: float, temperature: float) -> float` | Apply temperature |
| `calibrate` | `(raw_confidence: float, action_type: str, prediction_history: dict) -> float` | Full calibration |
| `record_prediction_outcome` | `(predicted_confidence: float, was_correct: bool, action_type: str)` | Feedback |
| `_recalculate_calibration` | `()` | Compute ECE and bin accuracies |
| `_adjust_temperatures` | `()` | Auto-tune per action type |
| `get_calibration_stats` | `() -> Dict` | ECE, MCE, bin data |

**Temperature Adjustment Logic:**
- Overconfident (error > 0.05): Increase temperature (max 3.0)
- Underconfident (error < -0.05): Decrease temperature (min 0.5)
- Well calibrated: No change

##### 3. TaskBoundaryDetector Class (Lines 885-1065)

**Purpose:** Detects natural task boundaries for non-intrusive suggestions.

**Research Basis (IUI '26):**
- Interruptions at task boundaries are **49.7% faster** to respond to
- ML can infer task boundaries from behavior patterns

**Boundary Signals:**
```python
BOUNDARY_SIGNALS = [
    'task_completed', 'session_start', 'context_switch',
    'meeting_ended', 'long_pause', 'email_sent',
    'commit_pushed', 'document_saved'
]
```

**Deep Work Protection:**
```python
DEEP_WORK_PATTERNS = [ActionCategory.DEEP_WORK, ActionCategory.RESEARCH]
MIN_DEEP_WORK_MINUTES = 15
```

**Key Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `check_boundary` | `(new_action: ActionEvent = None) -> Tuple[bool, List[str]]` | Check if boundary |
| `get_time_until_next_boundary` | `() -> Optional[int]` | Estimate minutes |
| `record_suggestion_outcome` | `(was_at_boundary: bool, was_accepted: bool)` | Learning |
| `get_boundary_effectiveness` | `() -> Dict` | Statistics |

##### 4. ImplicitFeedbackCollector Class (Lines 1072-1371)

**Purpose:** Collects implicit feedback from user behavior patterns.

**Accept Signals:**
- User did suggested action
- Quick response (< 2 min)
- Clicked quick action button
- Engaged with suggestion

**Reject Signals:**
- Suggestion expired (30 min timeout)
- Explicit dismiss
- Did different action immediately
- Ignored 3+ times

**Key Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `track_suggestion` | `(suggestion: ProactiveSuggestion) -> str` | Start tracking |
| `check_implicit_feedback` | `(user_action: ActionEvent, suggestion_id: str) -> List[Dict]` | Check for feedback |
| `record_explicit_feedback` | `(suggestion, response, suggestion_id)` | User clicked button |
| `get_acceptance_rate` | `(action_type: str) -> Optional[float]` | Historical rate |
| `get_optimal_suggestion_count` | `() -> int` | Based on fatigue |
| `get_feedback_stats` | `() -> Dict` | Statistics |

##### 5. EnergyFocusEstimator Class (Lines 1378-1697)

**Purpose:** Estimates user's current energy and focus level from behavior.

**Default Energy Curve (0-1 by hour):**
```python
DEFAULT_ENERGY_CURVE = {
    0: 0.15, 1: 0.10, 2: 0.08, 3: 0.08, 4: 0.10, 5: 0.20,
    6: 0.40, 7: 0.60, 8: 0.80, 9: 0.90, 10: 1.00, 11: 0.95,
    12: 0.70, 13: 0.60, 14: 0.65, 15: 0.75, 16: 0.80, 17: 0.70,
    18: 0.55, 19: 0.45, 20: 0.35, 21: 0.30, 22: 0.25, 23: 0.20
}
```

**Task Complexity Mapping:**
```python
TASK_COMPLEXITY = {
    ActionCategory.DEEP_WORK: 1.0,
    ActionCategory.PLANNING: 0.9,
    ActionCategory.RESEARCH: 0.85,
    ActionCategory.REVIEW: 0.7,
    ActionCategory.COMMUNICATION: 0.5,
    ActionCategory.TASK_MANAGEMENT: 0.4,
    ActionCategory.CALENDAR: 0.3,
    ActionCategory.ADMINISTRATIVE: 0.3,
    ActionCategory.STANDUP: 0.4,
    ActionCategory.DELEGATION: 0.5,
}
```

**Key Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `estimate_energy` | `(hour: int, recent_actions: List) -> float` | Current energy 0-1 |
| `estimate_focus` | `(recent_actions, context) -> float` | Current focus 0-1 |
| `get_task_match_score` | `(action_category, energy, focus) -> float` | Match quality |
| `record_action` | `(action: ActionEvent, outcome: str)` | Pattern learning |
| `_rebuild_personal_curve` | `()` | Personalized energy curve |
| `suggest_optimal_task_type` | `(energy, focus) -> List[ActionCategory]` | Best task types |
| `get_energy_stats` | `() -> Dict` | Statistics |

##### 6. ContextFusionEngine Class (Lines 1704-1961)

**Purpose:** Fuses multiple context signals into a unified understanding.

**Signal Sources:**
1. Time (hour, day, part of day)
2. Calendar (meetings, free time)
3. Email (unread, urgent)
4. Tasks (pending, in progress, overdue)
5. Recent actions (what user just did)
6. Session state (duration, activity level)
7. Derived signals (energy, focus, pressure)

**Default Signal Weights:**
```python
signal_weights = {
    TIME_OF_DAY: 1.0,
    DAY_OF_WEEK: 0.8,
    CALENDAR_STATE: 1.2,
    EMAIL_STATE: 0.9,
    TASK_STATE: 1.1,
    RECENT_ACTIONS: 1.5,
    SESSION_DURATION: 0.6,
    ENERGY_ESTIMATE: 0.7,
    MEETING_PROXIMITY: 1.3,
    DEADLINE_PRESSURE: 1.4
}
```

**Key Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `gather_context` | `(recent_actions: List) -> FusedContext` | Main entry point |
| `_gather_calendar_context` | `(context: FusedContext)` | Calendar signals |
| `_gather_email_context` | `(context: FusedContext)` | Email signals |
| `_gather_task_context` | `(context: FusedContext)` | Task signals |
| `_gather_activity_context` | `(context, recent_actions)` | Activity signals |
| `_calculate_derived_signals` | `(context: FusedContext)` | Energy, focus, pressure |
| `get_weighted_signal` | `(signal, value) -> float` | Apply learned weight |
| `update_weight` | `(signal, delta)` | Learning |

##### 7. IntentPredictionEngine Class (Lines 1968-2000+)

**Purpose:** Core prediction engine that predicts user's next actions.

**Confidence Thresholds:**
```python
THRESHOLD_AUTO = 0.95        # Auto-execute
THRESHOLD_APPROVE = 0.85     # One-click approval
THRESHOLD_SUGGEST = 0.70     # Present as suggestion
THRESHOLD_COLLABORATIVE = 0.50  # Discuss/explore
```

**Components:**
- BehaviorPatternMiner
- ContextFusionEngine
- ConfidenceCalibrator
- EnergyFocusEstimator

**Prediction Methodology:**
1. Gather and fuse context
2. Query multiple pattern types
3. Apply Bayesian-style confidence calibration
4. Generate ranked predictions with reasoning
5. Apply action-level classification

---

## PHASE 2: BUILDER - INTEGRATION REQUIREMENTS

### Required Dependencies

```bash
pip install anthropic  # For Claude API
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client  # Calendar/Email
pip install supabase   # Optional, for cloud sync
pip install langgraph  # Optional, for durable execution
```

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# For Calendar/Email
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Optional - Cloud Sync
SUPABASE_URL=...
SUPABASE_KEY=...
SUPABASE_SERVICE_KEY=...
```

### File System Requirements

The brain creates and manages these files:

| File | Purpose |
|------|---------|
| `.pm_chat.json` | Dashboard chat messages |
| `.pm_brain_state.json` | Brain state persistence |
| `.pm_memory.json` | Mem0-style hybrid memory |
| `.pm_patterns.json` | Learned patterns |
| `.pm_timing_state.json` | Timing intelligence |
| `.pm_style_profile.json` | User style profile |
| `.pm_orchestrator_state.json` | Orchestrator state |
| `.pm_orchestrator.log` | Orchestrator logs |
| `.pm_error_log.json` | Error recovery state |
| `.pm_intent_patterns.json` | Intent patterns |
| `.pm_intent_history.json` | Action history |
| `.pm_prediction_outcomes.json` | Prediction tracking |
| `.pm_learned_weights.json` | Context signal weights |
| `.pm_calibration_data.json` | Confidence calibration |
| `.pm_energy_patterns.json` | Energy patterns |
| `.pm_feedback_history.json` | Implicit feedback |
| `.claude_intercom.json` | Claude session messages |
| `board.json` | Task board |
| `.agent_questions.json` | Agent questions |
| `.launch_checklist.json` | Launch readiness |

### Claude CLI Requirement

```bash
# Install Claude CLI
curl -fsSL https://claude.ai/install.sh | sh

# Expected location
~/.local/bin/claude
```

### API Endpoints Expected

The brain expects these integrations to be available:

1. **Calendar Integration** (`calendar_integration.py`)
   - `get_calendar_integration(user_id)`
   - `CalendarIntegration.is_connected()`
   - `CalendarIntegration.get_calendar_context_for_pm()`

2. **Email Integration** (`email_integration.py`)
   - `get_email_integration(user_id)`
   - `EmailIntegration.is_connected()`
   - `EmailIntegration.get_email_context_for_pm()`

3. **LangGraph Wrapper** (`langgraph_wrapper.py`) - Optional
   - `TinyPMGraph`
   - `TinyPMState`
   - `create_initial_state()`

4. **Skills API** (`skills_api.py`) - Optional
   - `SkillsAPI(agent_id)`
   - `SkillsAPI.parse_intent(message)`
   - `SkillsAPI.execute_skill(skill_name, parameters)`

---

## PHASE 3: CRITIC - EVALUATION

### pm_brain.py Evaluation

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Functionality** | 9/10 | Comprehensive confidence scoring, timing intelligence, style learning |
| **Code Quality** | 8/10 | Well-documented, good separation of concerns, some long functions |
| **Production Ready** | 8/10 | Needs error handling improvements in some areas |
| **SOTA Compliance** | 9/10 | Follows IUI '26 research, Mem0 patterns, Superhuman voice learning |

**Strengths:**
- Excellent implementation of calibrated confidence scoring
- Research-backed timing intelligence with calendar awareness
- Sophisticated style learning system
- Good persistent state management

**Risks:**
- Claude CLI dependency may fail silently
- No rate limiting for pattern storage
- Style learning requires significant user data to be effective

**Recommended Improvements:**
1. Add exponential backoff to Claude CLI calls
2. Implement memory size limits with LRU eviction
3. Add style learning confidence indicator to prevent premature use
4. Consider async implementation for better responsiveness

### pm_orchestrator.py Evaluation

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Functionality** | 9/10 | Comprehensive orchestration with multi-agent support |
| **Code Quality** | 8/10 | Good architecture, well-documented classes |
| **Production Ready** | 8/10 | Has error recovery but needs more testing |
| **SOTA Compliance** | 9/10 | Implements circuit breaker, alert consolidation, calendar/email integration |

**Strengths:**
- Excellent error recovery with circuit breaker pattern
- Smart alert consolidation reduces notification fatigue
- Good integration with calendar and email
- Skills system routing for modular expansion

**Risks:**
- Complex dependency chain (calendar, email, LangGraph, skills)
- File-based state can cause race conditions with multiple processes
- No distributed locking for concurrent access

**Recommended Improvements:**
1. Add file locking for state files
2. Implement health check endpoint for monitoring
3. Add metrics collection (Prometheus-compatible)
4. Consider message queue for inter-process communication

### predictive_intent.py Evaluation

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Functionality** | 10/10 | Comprehensive prediction engine with multiple learning systems |
| **Code Quality** | 9/10 | Excellent documentation, clear algorithms |
| **Production Ready** | 7/10 | Sophisticated but needs more real-world testing |
| **SOTA Compliance** | 10/10 | Temperature scaling, Bayesian calibration, energy/focus estimation |

**Strengths:**
- True SOTA implementation of confidence calibration
- Innovative energy/focus estimation
- Comprehensive implicit feedback collection
- Task boundary detection based on research

**Risks:**
- Cold start problem - needs significant data to be effective
- Computational overhead of pattern mining
- Personal energy curve requires extended data collection

**Recommended Improvements:**
1. Add cold start heuristics (default patterns for new users)
2. Implement incremental pattern mining to reduce overhead
3. Add A/B testing framework for prediction experiments
4. Consider moving heavy computation to background thread

---

## OVERALL ASSESSMENT

### System Maturity

| Component | Maturity Level |
|-----------|----------------|
| pm_brain.py | Production-ready with monitoring |
| pm_orchestrator.py | Production-ready with caveats |
| predictive_intent.py | Beta - needs more testing |

### Integration Complexity

**Easy Integration:**
- Basic PM chat functionality
- Memory and pattern learning
- Confidence scoring

**Medium Integration:**
- Calendar and email context
- Skills system routing
- Alert consolidation

**Complex Integration:**
- LangGraph durable execution
- Full predictive intent engine
- Personal energy curve learning

### Recommended Migration Path

1. **Phase 1:** Deploy pm_brain.py and pm_orchestrator.py core
2. **Phase 2:** Add calendar and email integrations
3. **Phase 3:** Enable predictive intent for power users
4. **Phase 4:** Roll out LangGraph and advanced features

---

## CONCLUSION

The TinyPM Brain systems represent a sophisticated, research-backed implementation of an AI project management assistant. The codebase demonstrates strong understanding of SOTA AI patterns including:

- Calibrated confidence scoring
- Research-backed timing intelligence
- Multi-signal context fusion
- Implicit feedback learning
- Energy/focus estimation

The primary concerns are around cold start handling, computational overhead, and the complexity of the full dependency chain. For the Chief of Staff use case, a phased rollout starting with core functionality and gradually enabling advanced features is recommended.

**Final Ratings:**
- Overall Functionality: **9/10**
- Overall Code Quality: **8.5/10**
- Production Readiness: **7.5/10** (needs staged rollout)
- SOTA Compliance: **9.5/10**

---

*Analysis completed by Team 2: Migration Deep Dive - Core Systems*
*Using Researcher/Builder/Critic Methodology*
*Date: 2026-02-01*
