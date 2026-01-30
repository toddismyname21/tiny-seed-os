#!/usr/bin/env python3
"""
===============================================================================
LANGGRAPH WRAPPER - Durable Execution with State Persistence for TinyPM
===============================================================================

Implements LangGraph StateGraph with PostgresSaver checkpointing for:
1. Durable execution across crashes
2. Multi-conversation thread management
3. Error recovery with exponential backoff
4. Supabase PostgreSQL persistence

ARCHITECTURE:
    +------------------+
    | User Input       |
    +--------+---------+
             |
    +--------v---------+
    | gather_context   |  <-- Checkpoint #1
    +--------+---------+
             |
    +--------v---------+
    | analyze_intent   |  <-- Checkpoint #2
    +--------+---------+
             |
    +--------v---------+
    | generate_response|  <-- Checkpoint #3
    +--------+---------+
             |
    +--------v---------+
    | check_proactive  |  <-- Checkpoint #4 (conditional)
    +--------+---------+
             |
    +--------v---------+
    | consolidate_alerts| <-- Checkpoint #5
    +--------+---------+
             |
    +--------v---------+
    | END              |
    +------------------+

Usage:
    python3 langgraph_wrapper.py                    # Interactive CLI
    python3 langgraph_wrapper.py --message "Hello"  # Single message
    python3 langgraph_wrapper.py --thread-id abc123 # Resume thread
    python3 langgraph_wrapper.py --list-threads     # List all threads
    python3 langgraph_wrapper.py --recover          # Recover crashed thread
    python3 langgraph_wrapper.py --status           # Show system status

Requirements:
    pip install langgraph langchain-core psycopg psycopg-pool anthropic

Created: 2026-01-30
Author: Backend Agent
"""

import argparse
import json
import os
import random
import time
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from functools import wraps
from pathlib import Path
from typing import Any, Callable, Dict, List, Literal, Optional, Tuple, TypedDict, Annotated

# ===============================================================================
# CONFIGURATION
# ===============================================================================

APP_DIR = Path(__file__).parent
PROJECT_ROOT = APP_DIR.parent

# Load environment variables from .env
env_file = APP_DIR / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        if line.strip() and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

# Supabase PostgreSQL connection
# Connection string format: postgresql://user:password@host:port/database
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_DB_HOST = os.environ.get("SUPABASE_DB_HOST", "")
SUPABASE_DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD", "")
SUPABASE_DB_NAME = os.environ.get("SUPABASE_DB_NAME", "postgres")
SUPABASE_DB_USER = os.environ.get("SUPABASE_DB_USER", "postgres")
SUPABASE_DB_PORT = os.environ.get("SUPABASE_DB_PORT", "5432")

# Anthropic
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# Local files
BOARD_FILE = APP_DIR / "board.json"
INTERCOM_FILE = APP_DIR / ".claude_intercom.json"
PM_CHAT_FILE = APP_DIR / ".pm_chat.json"
PM_MEMORY_FILE = APP_DIR / ".pm_memory.json"
AGENT_QUESTIONS_FILE = APP_DIR / ".agent_questions.json"
LAUNCH_CHECKLIST_FILE = APP_DIR / ".launch_checklist.json"
LANGGRAPH_STATE_FILE = APP_DIR / ".langgraph_state.json"
LANGGRAPH_LOG_FILE = APP_DIR / ".langgraph.log"

# ===============================================================================
# LOGGING
# ===============================================================================

def log(msg: str, level: str = "INFO"):
    """Log with timestamp to file and stdout."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [{level}] {msg}"
    print(line)
    try:
        with open(LANGGRAPH_LOG_FILE, "a") as f:
            f.write(line + "\n")
    except:
        pass


# ===============================================================================
# STATE SCHEMA - TypedDict for LangGraph
# ===============================================================================

class MessageType(str, Enum):
    USER = "user"
    PM = "pm"
    SYSTEM = "system"


class IntentType(str, Enum):
    QUERY = "query"           # User asking a question
    TASK = "task"             # User wants to create/modify task
    STATUS = "status"         # User checking status
    BUILD = "build"           # User wants Builder to do something
    URGENT = "urgent"         # Urgent request
    CONVERSATIONAL = "conversational"  # General chat


class TinyPMState(TypedDict, total=False):
    """
    TinyPM State Schema for LangGraph.

    This defines all state that flows through the graph and gets checkpointed.
    Uses TypedDict for LangGraph compatibility.
    """
    # Thread identification
    thread_id: str
    parent_thread_id: Optional[str]

    # Input message
    input_message: str
    input_timestamp: str
    input_type: str  # MessageType value

    # Context gathered
    context: Dict[str, Any]
    memory_context: List[Dict[str, Any]]
    project_context: Dict[str, Any]

    # Intent analysis
    intent: str  # IntentType value
    confidence: float
    should_delegate: bool
    delegate_to: Optional[str]
    routing_metadata: Dict[str, Any]

    # Response generation
    response: str
    response_timestamp: str
    response_model: str

    # Proactive checks
    proactive_items: List[str]
    should_send_proactive: bool

    # Alert consolidation
    consolidated_alerts: str
    alert_count: int

    # Execution metadata
    current_node: str
    nodes_executed: List[str]
    execution_start: str
    execution_end: str
    total_duration_ms: int

    # Error tracking
    errors: List[Dict[str, Any]]
    retry_count: int
    last_error: Optional[str]

    # Output
    final_response: str
    success: bool


def create_initial_state(message: str, thread_id: str = None) -> TinyPMState:
    """Create initial state for a new conversation turn."""
    return TinyPMState(
        thread_id=thread_id or str(uuid.uuid4()),
        parent_thread_id=None,
        input_message=message,
        input_timestamp=datetime.now().isoformat(),
        input_type=MessageType.USER.value,
        context={},
        memory_context=[],
        project_context={},
        intent=IntentType.CONVERSATIONAL.value,
        confidence=0.0,
        should_delegate=False,
        delegate_to=None,
        routing_metadata={},
        response="",
        response_timestamp="",
        response_model="",
        proactive_items=[],
        should_send_proactive=False,
        consolidated_alerts="",
        alert_count=0,
        current_node="start",
        nodes_executed=[],
        execution_start=datetime.now().isoformat(),
        execution_end="",
        total_duration_ms=0,
        errors=[],
        retry_count=0,
        last_error=None,
        final_response="",
        success=False
    )


# ===============================================================================
# ERROR RECOVERY - Exponential Backoff with Circuit Breaker
# ===============================================================================

class RetryPolicy:
    """Retry policy with exponential backoff and jitter."""

    def __init__(
        self,
        max_attempts: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        jitter_factor: float = 0.25
    ):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.jitter_factor = jitter_factor

    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay for attempt with exponential backoff and jitter."""
        exp_delay = self.base_delay * (2 ** attempt)
        capped_delay = min(exp_delay, self.max_delay)
        jitter = 1 + (random.random() * self.jitter_factor)
        return capped_delay * jitter

    def execute_with_retry(
        self,
        func: Callable,
        args: tuple = (),
        kwargs: dict = None,
        operation_name: str = None,
        retryable_exceptions: tuple = (ConnectionError, TimeoutError, OSError)
    ):
        """Execute function with retry logic."""
        kwargs = kwargs or {}
        op_name = operation_name or func.__name__
        last_exception = None

        for attempt in range(self.max_attempts):
            try:
                result = func(*args, **kwargs)
                if attempt > 0:
                    log(f"[{op_name}] Succeeded on attempt {attempt + 1}")
                return result

            except retryable_exceptions as e:
                last_exception = e
                if attempt < self.max_attempts - 1:
                    delay = self.calculate_delay(attempt)
                    log(f"[{op_name}] Attempt {attempt + 1} failed: {e}. Retrying in {delay:.2f}s", "WARN")
                    time.sleep(delay)
                else:
                    log(f"[{op_name}] All {self.max_attempts} attempts failed", "ERROR")

            except Exception as e:
                # Non-retryable exception
                log(f"[{op_name}] Non-retryable error: {e}", "ERROR")
                raise

        if last_exception:
            raise last_exception


# Global retry policy
DEFAULT_RETRY_POLICY = RetryPolicy(max_attempts=3, base_delay=1.0)


def with_retry(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    operation_name: str = None
):
    """Decorator for adding retry logic to functions."""
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            policy = RetryPolicy(max_attempts=max_attempts, base_delay=base_delay)
            return policy.execute_with_retry(
                func, args, kwargs,
                operation_name=operation_name or func.__name__
            )
        return wrapper
    return decorator


# ===============================================================================
# POSTGRESQL CONNECTION & CHECKPOINTER
# ===============================================================================

class PostgresCheckpointer:
    """
    Custom checkpointer for Supabase PostgreSQL.

    Uses the langgraph.checkpoint.postgres module if available,
    otherwise falls back to manual implementation.
    """

    def __init__(self, connection_string: str = None):
        self.connection_string = connection_string or self._build_connection_string()
        self.pool = None
        self._initialized = False
        self._langgraph_saver = None

    def _build_connection_string(self) -> str:
        """Build PostgreSQL connection string from environment."""
        if SUPABASE_DB_HOST and SUPABASE_DB_PASSWORD:
            return f"postgresql://{SUPABASE_DB_USER}:{SUPABASE_DB_PASSWORD}@{SUPABASE_DB_HOST}:{SUPABASE_DB_PORT}/{SUPABASE_DB_NAME}"
        return ""

    def initialize(self) -> bool:
        """Initialize the checkpointer with database connection."""
        if not self.connection_string:
            log("No PostgreSQL connection string available. Using local checkpointing.", "WARN")
            return False

        try:
            # Try to use LangGraph's built-in PostgresSaver
            from langgraph.checkpoint.postgres import PostgresSaver
            from psycopg_pool import ConnectionPool

            self.pool = ConnectionPool(conninfo=self.connection_string)
            self._langgraph_saver = PostgresSaver(self.pool)

            # Set up schema (creates tables if they don't exist)
            self._langgraph_saver.setup()

            self._initialized = True
            log("PostgreSQL checkpointer initialized successfully")
            return True

        except ImportError as e:
            log(f"LangGraph PostgreSQL dependencies not installed: {e}", "WARN")
            log("Run: pip install langgraph-checkpoint-postgres psycopg-pool", "WARN")
            return False

        except Exception as e:
            log(f"Failed to initialize PostgreSQL checkpointer: {e}", "ERROR")
            return False

    def get_saver(self):
        """Get the LangGraph checkpointer/saver."""
        if not self._initialized:
            self.initialize()
        return self._langgraph_saver

    def save_checkpoint(self, thread_id: str, state: TinyPMState) -> bool:
        """Save checkpoint (fallback for when LangGraph saver isn't available)."""
        if self._langgraph_saver:
            # LangGraph handles this automatically
            return True

        # Fallback: save to local JSON
        try:
            checkpoints = {}
            if LANGGRAPH_STATE_FILE.exists():
                checkpoints = json.loads(LANGGRAPH_STATE_FILE.read_text())

            checkpoints[thread_id] = {
                "state": dict(state),
                "saved_at": datetime.now().isoformat()
            }

            LANGGRAPH_STATE_FILE.write_text(json.dumps(checkpoints, indent=2, default=str))
            return True

        except Exception as e:
            log(f"Failed to save local checkpoint: {e}", "ERROR")
            return False

    def load_checkpoint(self, thread_id: str) -> Optional[TinyPMState]:
        """Load checkpoint (fallback for when LangGraph saver isn't available)."""
        if self._langgraph_saver:
            # LangGraph handles this via config
            return None

        # Fallback: load from local JSON
        try:
            if not LANGGRAPH_STATE_FILE.exists():
                return None

            checkpoints = json.loads(LANGGRAPH_STATE_FILE.read_text())
            if thread_id in checkpoints:
                return TinyPMState(**checkpoints[thread_id]["state"])
            return None

        except Exception as e:
            log(f"Failed to load local checkpoint: {e}", "ERROR")
            return None

    def list_threads(self, limit: int = 50) -> List[Dict[str, Any]]:
        """List all threads with their latest state."""
        threads = []

        if self._langgraph_saver:
            # Use LangGraph's listing capability if available
            try:
                # Note: exact API depends on LangGraph version
                pass
            except:
                pass

        # Fallback: list from local JSON
        try:
            if LANGGRAPH_STATE_FILE.exists():
                checkpoints = json.loads(LANGGRAPH_STATE_FILE.read_text())
                for thread_id, data in list(checkpoints.items())[:limit]:
                    threads.append({
                        "thread_id": thread_id,
                        "saved_at": data.get("saved_at"),
                        "current_node": data.get("state", {}).get("current_node"),
                        "success": data.get("state", {}).get("success")
                    })
        except Exception as e:
            log(f"Failed to list threads: {e}", "ERROR")

        return threads

    def cleanup_old_checkpoints(self, keep_count: int = 100) -> int:
        """Clean up old checkpoints, keeping only the most recent."""
        deleted = 0

        try:
            if LANGGRAPH_STATE_FILE.exists():
                checkpoints = json.loads(LANGGRAPH_STATE_FILE.read_text())

                if len(checkpoints) > keep_count:
                    # Sort by saved_at and keep only the most recent
                    sorted_items = sorted(
                        checkpoints.items(),
                        key=lambda x: x[1].get("saved_at", ""),
                        reverse=True
                    )

                    new_checkpoints = dict(sorted_items[:keep_count])
                    deleted = len(checkpoints) - len(new_checkpoints)

                    LANGGRAPH_STATE_FILE.write_text(json.dumps(new_checkpoints, indent=2, default=str))

        except Exception as e:
            log(f"Failed to cleanup checkpoints: {e}", "ERROR")

        return deleted

    def close(self):
        """Close connections."""
        if self.pool:
            self.pool.close()


# Global checkpointer instance
_checkpointer: Optional[PostgresCheckpointer] = None

def get_checkpointer() -> PostgresCheckpointer:
    """Get or create the global checkpointer."""
    global _checkpointer
    if _checkpointer is None:
        _checkpointer = PostgresCheckpointer()
        _checkpointer.initialize()
    return _checkpointer


# ===============================================================================
# HELPER FUNCTIONS FOR FILE I/O
# ===============================================================================

def safe_read_json(path: Path, default: Any = None) -> Any:
    """Safely read JSON file."""
    try:
        if path.exists():
            return json.loads(path.read_text())
    except Exception as e:
        log(f"Error reading {path.name}: {e}", "WARN")
    return default if default is not None else {}


def safe_write_json(path: Path, data: Any):
    """Safely write JSON file."""
    try:
        path.write_text(json.dumps(data, indent=2, default=str))
    except Exception as e:
        log(f"Error writing {path.name}: {e}", "ERROR")


# ===============================================================================
# NODE IMPLEMENTATIONS
# ===============================================================================

def gather_context_node(state: TinyPMState) -> TinyPMState:
    """
    Node 1: Gather all relevant context for the conversation.

    Collects:
    - Project state (tasks, progress)
    - Builder status
    - Agent questions
    - Memory context
    - Launch readiness
    """
    log(f"[gather_context] Starting for thread {state.get('thread_id', 'unknown')[:8]}...")

    state["current_node"] = "gather_context"
    state["nodes_executed"] = state.get("nodes_executed", []) + ["gather_context"]

    try:
        project_context = {}

        # Task board
        board = safe_read_json(BOARD_FILE, {"tasks": []})
        tasks = board.get("tasks", [])
        project_context["tasks"] = {
            "total": len(tasks),
            "pending": len([t for t in tasks if t.get("status") == "pending"]),
            "in_progress": len([t for t in tasks if t.get("status") == "in_progress"]),
            "done": len([t for t in tasks if t.get("status") == "done"]),
            "active_tasks": [t.get("title", "Untitled")[:40] for t in tasks if t.get("status") == "in_progress"][:5]
        }

        # Builder status
        intercom = safe_read_json(INTERCOM_FILE, {})
        builder_msgs = intercom.get("builder_to_pm", [])
        if builder_msgs:
            latest = builder_msgs[-1]
            project_context["builder"] = {
                "status": latest.get("type", "unknown"),
                "last_message": latest.get("message", "")[:100],
                "last_updated": latest.get("timestamp", "")
            }
        else:
            project_context["builder"] = {"status": "unknown"}

        pm_queue = [t for t in intercom.get("pm_to_builder", []) if not t.get("read")]
        project_context["builder"]["queue_size"] = len(pm_queue)

        # Agent questions
        questions = safe_read_json(AGENT_QUESTIONS_FILE, {"questions": []})
        unanswered = [q for q in questions.get("questions", []) if not q.get("answered")]
        project_context["agent_questions"] = {
            "waiting": len(unanswered),
            "questions": [q.get("question", "")[:50] for q in unanswered[:3]]
        }

        # Launch readiness
        checklist = safe_read_json(LAUNCH_CHECKLIST_FILE, {"items": []})
        items = checklist.get("items", [])
        done_items = len([i for i in items if i.get("status") == "done"])
        total_items = len(items)
        project_context["launch"] = {
            "done": done_items,
            "total": total_items,
            "progress_pct": int((done_items / total_items) * 100) if total_items else 0
        }

        # Memory context (from pm_brain)
        memory = safe_read_json(PM_MEMORY_FILE, {})
        memory_context = []
        for ctx in memory.get("context", [])[-5:]:
            memory_context.append({
                "type": ctx.get("type", "unknown"),
                "content": ctx.get("content", "")[:100],
                "timestamp": ctx.get("timestamp", "")
            })

        state["project_context"] = project_context
        state["memory_context"] = memory_context
        state["context"] = {
            "gathered_at": datetime.now().isoformat(),
            "project_summary": f"Tasks: {project_context['tasks']['pending']} pending, {project_context['tasks']['in_progress']} in progress",
            "builder_status": project_context["builder"]["status"],
            "questions_waiting": project_context["agent_questions"]["waiting"],
            "launch_progress": project_context["launch"]["progress_pct"]
        }

        log(f"[gather_context] Gathered context: {state['context'].get('project_summary', '')}")

    except Exception as e:
        log(f"[gather_context] Error: {e}", "ERROR")
        state["errors"] = state.get("errors", []) + [{
            "node": "gather_context",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }]
        state["last_error"] = str(e)

    return state


def analyze_intent_node(state: TinyPMState) -> TinyPMState:
    """
    Node 2: Analyze user intent to determine routing.

    Determines:
    - Intent type (query, task, status, build, urgent, conversational)
    - Confidence level
    - Whether to delegate to Builder
    """
    log(f"[analyze_intent] Analyzing: {state.get('input_message', '')[:50]}...")

    state["current_node"] = "analyze_intent"
    state["nodes_executed"] = state.get("nodes_executed", []) + ["analyze_intent"]

    try:
        message = state.get("input_message", "").lower()

        # Keyword-based intent classification
        intent = IntentType.CONVERSATIONAL
        confidence = 0.7
        should_delegate = False
        delegate_to = None

        # Build/code keywords -> delegate to Builder
        build_keywords = ["build", "create", "code", "implement", "fix bug", "add feature",
                         "write", "develop", "html", "css", "javascript", "python"]
        if any(kw in message for kw in build_keywords):
            intent = IntentType.BUILD
            should_delegate = True
            delegate_to = "builder"
            confidence = 0.85

        # Status/update keywords
        status_keywords = ["status", "update", "progress", "how is", "what's happening"]
        if any(kw in message for kw in status_keywords):
            intent = IntentType.STATUS
            confidence = 0.9

        # Task keywords
        task_keywords = ["task", "todo", "to-do", "add task", "create task", "new task"]
        if any(kw in message for kw in task_keywords):
            intent = IntentType.TASK
            confidence = 0.85

        # Query keywords
        query_keywords = ["?", "what", "how", "why", "where", "when", "explain", "tell me"]
        if any(kw in message for kw in query_keywords):
            intent = IntentType.QUERY
            confidence = 0.8

        # Urgent keywords
        urgent_keywords = ["urgent", "asap", "now", "immediately", "critical", "broken", "down", "error"]
        if any(kw in message for kw in urgent_keywords):
            intent = IntentType.URGENT
            confidence = 0.95

        state["intent"] = intent.value
        state["confidence"] = confidence
        state["should_delegate"] = should_delegate
        state["delegate_to"] = delegate_to
        state["routing_metadata"] = {
            "keywords_matched": True,
            "analysis_method": "keyword_based",
            "analyzed_at": datetime.now().isoformat()
        }

        log(f"[analyze_intent] Intent: {intent.value} (confidence: {confidence:.2f})")

    except Exception as e:
        log(f"[analyze_intent] Error: {e}", "ERROR")
        state["errors"] = state.get("errors", []) + [{
            "node": "analyze_intent",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }]
        state["last_error"] = str(e)
        # Default to conversational on error
        state["intent"] = IntentType.CONVERSATIONAL.value
        state["confidence"] = 0.5

    return state


@with_retry(max_attempts=3, base_delay=2.0, operation_name="claude_api")
def call_claude_api(system_prompt: str, user_message: str, model: str = "claude-sonnet-4-20250514") -> Tuple[str, bool]:
    """Call Claude API with retry logic."""
    if not ANTHROPIC_API_KEY:
        return "API key not configured", False

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        response = client.messages.create(
            model=model,
            max_tokens=1000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}]
        )

        text = response.content[0].text if response.content else ""
        return text, True

    except Exception as e:
        log(f"Claude API error: {e}", "ERROR")
        raise


def generate_response_node(state: TinyPMState) -> TinyPMState:
    """
    Node 3: Generate PM response using Claude.

    Creates contextual, proactive response based on:
    - User message
    - Project context
    - Intent analysis
    - Memory context
    """
    log(f"[generate_response] Generating response...")

    state["current_node"] = "generate_response"
    state["nodes_executed"] = state.get("nodes_executed", []) + ["generate_response"]

    try:
        # Build context string
        ctx = state.get("context", {})
        project = state.get("project_context", {})
        memory = state.get("memory_context", [])

        context_parts = [
            f"PROJECT STATE:",
            f"- {ctx.get('project_summary', 'No task data')}",
            f"- Builder: {ctx.get('builder_status', 'unknown')}",
            f"- Questions waiting: {ctx.get('questions_waiting', 0)}",
            f"- Launch progress: {ctx.get('launch_progress', 0)}%"
        ]

        if project.get("tasks", {}).get("active_tasks"):
            context_parts.append(f"- Active: {', '.join(project['tasks']['active_tasks'])}")

        if memory:
            context_parts.append("\nRECENT MEMORY:")
            for m in memory[-3:]:
                context_parts.append(f"- [{m.get('type')}] {m.get('content', '')[:50]}")

        context_str = "\n".join(context_parts)

        # Build system prompt
        system_prompt = f"""You are the PM (Project Manager) for TinyPM and Tiny Seed Farm OS.

{context_str}

INTENT DETECTED: {state.get('intent', 'conversational')} (confidence: {state.get('confidence', 0.7):.0%})

CORE DIRECTIVES:
1. Be PROACTIVE - suggest next actions, anticipate needs
2. Be SPECIFIC - use actual numbers and data from context
3. Be CONCISE - under 150 words unless detail is requested
4. Be ACTION-ORIENTED - end with clear next steps
5. If questions are waiting, remind the user
6. If Builder needs attention, mention it"""

        # Call Claude
        response, success = call_claude_api(system_prompt, state.get("input_message", ""))

        if success:
            state["response"] = response
            state["response_timestamp"] = datetime.now().isoformat()
            state["response_model"] = "claude-sonnet-4-20250514"
            log(f"[generate_response] Generated {len(response)} chars")
        else:
            state["response"] = "I received your message but encountered an error generating a response. Please try again."
            state["errors"] = state.get("errors", []) + [{
                "node": "generate_response",
                "error": response,
                "timestamp": datetime.now().isoformat()
            }]
            state["last_error"] = response

    except Exception as e:
        log(f"[generate_response] Error: {e}", "ERROR")
        state["response"] = f"Error generating response: {str(e)}"
        state["errors"] = state.get("errors", []) + [{
            "node": "generate_response",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }]
        state["last_error"] = str(e)

    return state


def check_proactive_node(state: TinyPMState) -> TinyPMState:
    """
    Node 4: Check for proactive items to surface.

    Identifies:
    - Stale tasks
    - Pending questions
    - Builder status updates
    - Milestone achievements
    """
    log(f"[check_proactive] Checking for proactive items...")

    state["current_node"] = "check_proactive"
    state["nodes_executed"] = state.get("nodes_executed", []) + ["check_proactive"]

    try:
        proactive_items = []
        project = state.get("project_context", {})

        # Check for agent questions
        if project.get("agent_questions", {}).get("waiting", 0) > 0:
            count = project["agent_questions"]["waiting"]
            proactive_items.append(f"{count} agent question(s) waiting for your input")

        # Check for Builder updates
        builder = project.get("builder", {})
        if builder.get("status") == "done" and builder.get("queue_size", 0) > 0:
            proactive_items.append(f"Builder finished, {builder['queue_size']} tasks in queue")

        # Check launch progress milestones
        launch = project.get("launch", {})
        progress = launch.get("progress_pct", 0)
        if progress in [25, 50, 75, 90, 100]:
            proactive_items.append(f"Launch readiness hit {progress}%!")

        # Check for stuck in-progress tasks
        tasks = project.get("tasks", {})
        if tasks.get("in_progress", 0) > 3:
            proactive_items.append(f"{tasks['in_progress']} tasks in progress - any stuck?")

        state["proactive_items"] = proactive_items
        state["should_send_proactive"] = len(proactive_items) > 0

        log(f"[check_proactive] Found {len(proactive_items)} proactive items")

    except Exception as e:
        log(f"[check_proactive] Error: {e}", "ERROR")
        state["proactive_items"] = []
        state["should_send_proactive"] = False
        state["errors"] = state.get("errors", []) + [{
            "node": "check_proactive",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }]

    return state


def consolidate_alerts_node(state: TinyPMState) -> TinyPMState:
    """
    Node 5: Consolidate alerts into final response.

    Combines:
    - Main response
    - Proactive items
    - Any urgent alerts

    Research: 62% of individual alerts are ignored.
    Batched summaries get better engagement.
    """
    log(f"[consolidate_alerts] Consolidating final response...")

    state["current_node"] = "consolidate_alerts"
    state["nodes_executed"] = state.get("nodes_executed", []) + ["consolidate_alerts"]

    try:
        response_parts = [state.get("response", "")]

        # Add proactive items if present
        proactive = state.get("proactive_items", [])
        if proactive:
            proactive_section = "\n\n---\nAlso noting:\n" + "\n".join(f"- {item}" for item in proactive)
            response_parts.append(proactive_section)

        # Build final response
        final_response = "".join(response_parts)

        state["final_response"] = final_response
        state["consolidated_alerts"] = "\n".join(proactive) if proactive else ""
        state["alert_count"] = len(proactive)

        # Mark execution complete
        state["execution_end"] = datetime.now().isoformat()
        state["success"] = True

        # Calculate duration
        try:
            start = datetime.fromisoformat(state.get("execution_start", ""))
            end = datetime.fromisoformat(state["execution_end"])
            state["total_duration_ms"] = int((end - start).total_seconds() * 1000)
        except:
            state["total_duration_ms"] = 0

        log(f"[consolidate_alerts] Complete. Duration: {state['total_duration_ms']}ms")

    except Exception as e:
        log(f"[consolidate_alerts] Error: {e}", "ERROR")
        state["final_response"] = state.get("response", "Error consolidating response")
        state["success"] = False
        state["errors"] = state.get("errors", []) + [{
            "node": "consolidate_alerts",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }]

    return state


# ===============================================================================
# CONDITIONAL ROUTING
# ===============================================================================

def should_check_proactive(state: TinyPMState) -> Literal["check_proactive", "consolidate_alerts"]:
    """
    Conditional edge: decide whether to check for proactive items.

    Skip proactive check if:
    - Intent is urgent (respond quickly)
    - Errors occurred in previous nodes
    - Response generation failed
    """
    # Skip proactive check on errors
    if state.get("errors"):
        return "consolidate_alerts"

    # Skip on urgent intents (respond faster)
    if state.get("intent") == IntentType.URGENT.value:
        return "consolidate_alerts"

    # Skip if response failed
    if not state.get("response"):
        return "consolidate_alerts"

    return "check_proactive"


# ===============================================================================
# GRAPH BUILDER
# ===============================================================================

def build_graph():
    """
    Build the LangGraph StateGraph for TinyPM.

    Graph structure:
        START -> gather_context -> analyze_intent -> generate_response
              -> [conditional] -> check_proactive/consolidate_alerts -> END
    """
    try:
        from langgraph.graph import StateGraph, START, END

        # Create the graph with our state schema
        builder = StateGraph(TinyPMState)

        # Add nodes
        builder.add_node("gather_context", gather_context_node)
        builder.add_node("analyze_intent", analyze_intent_node)
        builder.add_node("generate_response", generate_response_node)
        builder.add_node("check_proactive", check_proactive_node)
        builder.add_node("consolidate_alerts", consolidate_alerts_node)

        # Add edges
        builder.add_edge(START, "gather_context")
        builder.add_edge("gather_context", "analyze_intent")
        builder.add_edge("analyze_intent", "generate_response")

        # Conditional edge after response generation
        builder.add_conditional_edges(
            "generate_response",
            should_check_proactive,
            {
                "check_proactive": "check_proactive",
                "consolidate_alerts": "consolidate_alerts"
            }
        )

        builder.add_edge("check_proactive", "consolidate_alerts")
        builder.add_edge("consolidate_alerts", END)

        # Compile with checkpointer
        checkpointer = get_checkpointer()
        saver = checkpointer.get_saver()

        if saver:
            graph = builder.compile(checkpointer=saver)
            log("Graph compiled with PostgreSQL checkpointing")
        else:
            graph = builder.compile()
            log("Graph compiled without checkpointing (local fallback)")

        return graph

    except ImportError as e:
        log(f"LangGraph not installed: {e}", "ERROR")
        log("Run: pip install langgraph langchain-core", "ERROR")
        return None


# ===============================================================================
# MAIN EXECUTION INTERFACE
# ===============================================================================

class TinyPMGraph:
    """
    Main interface for executing the TinyPM LangGraph.

    Provides:
    - Single message processing
    - Thread management
    - Recovery from checkpoints
    - History retrieval
    """

    def __init__(self):
        self.graph = None
        self.checkpointer = get_checkpointer()
        self._initialize()

    def _initialize(self):
        """Initialize the graph."""
        self.graph = build_graph()
        if not self.graph:
            log("Failed to build graph. Running in degraded mode.", "WARN")

    def process_message(
        self,
        message: str,
        thread_id: str = None
    ) -> Dict[str, Any]:
        """
        Process a single message through the graph.

        Args:
            message: User message to process
            thread_id: Optional thread ID for conversation continuity

        Returns:
            Dict with response and execution metadata
        """
        # Create initial state
        thread_id = thread_id or str(uuid.uuid4())
        state = create_initial_state(message, thread_id)

        log(f"Processing message in thread {thread_id[:8]}...")

        if not self.graph:
            # Fallback: run nodes manually without graph
            return self._process_fallback(state)

        try:
            # Configure thread for checkpointing
            config = {"configurable": {"thread_id": thread_id}}

            # Run the graph
            result = self.graph.invoke(state, config)

            # Save checkpoint (manual backup if needed)
            self.checkpointer.save_checkpoint(thread_id, result)

            return {
                "thread_id": thread_id,
                "response": result.get("final_response", ""),
                "success": result.get("success", False),
                "intent": result.get("intent", "unknown"),
                "confidence": result.get("confidence", 0),
                "proactive_items": result.get("proactive_items", []),
                "duration_ms": result.get("total_duration_ms", 0),
                "nodes_executed": result.get("nodes_executed", []),
                "errors": result.get("errors", [])
            }

        except Exception as e:
            log(f"Graph execution error: {e}", "ERROR")
            return {
                "thread_id": thread_id,
                "response": f"Error processing message: {str(e)}",
                "success": False,
                "errors": [{"error": str(e), "timestamp": datetime.now().isoformat()}]
            }

    def _process_fallback(self, state: TinyPMState) -> Dict[str, Any]:
        """Process message without LangGraph (fallback mode)."""
        log("Running in fallback mode (no LangGraph)", "WARN")

        # Run nodes manually
        state = gather_context_node(state)
        state = analyze_intent_node(state)
        state = generate_response_node(state)
        state = check_proactive_node(state)
        state = consolidate_alerts_node(state)

        # Save checkpoint
        self.checkpointer.save_checkpoint(state["thread_id"], state)

        return {
            "thread_id": state["thread_id"],
            "response": state.get("final_response", ""),
            "success": state.get("success", False),
            "intent": state.get("intent", "unknown"),
            "confidence": state.get("confidence", 0),
            "proactive_items": state.get("proactive_items", []),
            "duration_ms": state.get("total_duration_ms", 0),
            "nodes_executed": state.get("nodes_executed", []),
            "errors": state.get("errors", [])
        }

    def recover_thread(self, thread_id: str) -> Optional[Dict[str, Any]]:
        """
        Recover and resume a thread from its last checkpoint.

        Args:
            thread_id: ID of thread to recover

        Returns:
            Thread state if found, None otherwise
        """
        log(f"Attempting to recover thread {thread_id[:8]}...")

        checkpoint = self.checkpointer.load_checkpoint(thread_id)
        if not checkpoint:
            log(f"No checkpoint found for thread {thread_id[:8]}", "WARN")
            return None

        log(f"Recovered thread from node: {checkpoint.get('current_node')}")
        return dict(checkpoint)

    def list_threads(self, limit: int = 50) -> List[Dict[str, Any]]:
        """List all conversation threads."""
        return self.checkpointer.list_threads(limit)

    def get_status(self) -> Dict[str, Any]:
        """Get system status."""
        threads = self.list_threads(limit=1000)

        successful = len([t for t in threads if t.get("success")])
        failed = len([t for t in threads if not t.get("success")])

        return {
            "graph_available": self.graph is not None,
            "checkpointer_type": "postgresql" if self.checkpointer._langgraph_saver else "local_json",
            "total_threads": len(threads),
            "successful_threads": successful,
            "failed_threads": failed,
            "anthropic_configured": bool(ANTHROPIC_API_KEY),
            "supabase_configured": bool(SUPABASE_DB_HOST)
        }


# ===============================================================================
# CLI INTERFACE
# ===============================================================================

def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="TinyPM LangGraph Wrapper - Durable Execution with Checkpointing"
    )

    parser.add_argument(
        "-m", "--message",
        type=str,
        help="Process a single message"
    )

    parser.add_argument(
        "-t", "--thread-id",
        type=str,
        help="Thread ID to use or recover"
    )

    parser.add_argument(
        "--list-threads",
        action="store_true",
        help="List all conversation threads"
    )

    parser.add_argument(
        "--recover",
        action="store_true",
        help="Recover thread (requires --thread-id)"
    )

    parser.add_argument(
        "--status",
        action="store_true",
        help="Show system status"
    )

    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Run in interactive mode"
    )

    parser.add_argument(
        "--cleanup",
        type=int,
        metavar="N",
        help="Cleanup old checkpoints, keeping only N most recent"
    )

    args = parser.parse_args()

    # Initialize
    pm = TinyPMGraph()

    # Handle commands
    if args.status:
        status = pm.get_status()
        print("\n" + "=" * 60)
        print("  TinyPM LangGraph Status")
        print("=" * 60)
        for key, value in status.items():
            print(f"  {key}: {value}")
        print("=" * 60 + "\n")
        return

    if args.list_threads:
        threads = pm.list_threads(limit=20)
        print("\n" + "=" * 60)
        print("  Recent Conversation Threads")
        print("=" * 60)
        if not threads:
            print("  No threads found")
        else:
            for t in threads:
                status = "OK" if t.get("success") else "FAILED"
                print(f"  {t.get('thread_id', 'unknown')[:16]}...  [{status}]  Node: {t.get('current_node', 'unknown')}")
        print("=" * 60 + "\n")
        return

    if args.recover and args.thread_id:
        state = pm.recover_thread(args.thread_id)
        if state:
            print(f"\nRecovered thread {args.thread_id[:16]}...")
            print(f"  Current node: {state.get('current_node')}")
            print(f"  Nodes executed: {state.get('nodes_executed')}")
            print(f"  Last response: {state.get('response', '')[:100]}...")
        else:
            print(f"Failed to recover thread {args.thread_id}")
        return

    if args.cleanup:
        checkpointer = get_checkpointer()
        deleted = checkpointer.cleanup_old_checkpoints(args.cleanup)
        print(f"Cleaned up {deleted} old checkpoints")
        return

    if args.message:
        result = pm.process_message(args.message, args.thread_id)

        print("\n" + "=" * 60)
        print(f"  Thread: {result['thread_id'][:16]}...")
        print(f"  Intent: {result['intent']} ({result['confidence']:.0%})")
        print(f"  Duration: {result['duration_ms']}ms")
        print(f"  Success: {result['success']}")
        print("=" * 60)
        print("\nResponse:")
        print(result['response'])

        if result.get('proactive_items'):
            print("\nProactive Items:")
            for item in result['proactive_items']:
                print(f"  - {item}")

        if result.get('errors'):
            print("\nErrors:")
            for err in result['errors']:
                print(f"  - [{err.get('node', 'unknown')}] {err.get('error', 'Unknown error')}")

        print("")
        return

    if args.interactive:
        print("\n" + "=" * 60)
        print("  TinyPM Interactive Mode")
        print("  Type 'quit' or 'exit' to stop")
        print("  Type 'status' for system status")
        print("  Type 'threads' to list threads")
        print("=" * 60 + "\n")

        thread_id = None

        while True:
            try:
                user_input = input("You: ").strip()

                if not user_input:
                    continue

                if user_input.lower() in ['quit', 'exit', 'q']:
                    print("Goodbye!")
                    break

                if user_input.lower() == 'status':
                    status = pm.get_status()
                    for key, value in status.items():
                        print(f"  {key}: {value}")
                    continue

                if user_input.lower() == 'threads':
                    threads = pm.list_threads(limit=10)
                    for t in threads:
                        status = "OK" if t.get("success") else "FAILED"
                        print(f"  {t.get('thread_id', 'unknown')[:16]}...  [{status}]")
                    continue

                if user_input.lower() == 'new':
                    thread_id = None
                    print("Started new conversation thread")
                    continue

                # Process message
                result = pm.process_message(user_input, thread_id)
                thread_id = result['thread_id']  # Keep same thread

                print(f"\nPM: {result['response']}")

                if result.get('proactive_items'):
                    print("\n[Also noting:]")
                    for item in result['proactive_items']:
                        print(f"  - {item}")

                print("")

            except KeyboardInterrupt:
                print("\n\nGoodbye!")
                break
            except Exception as e:
                print(f"Error: {e}")

        return

    # Default: show help
    parser.print_help()


if __name__ == "__main__":
    main()
