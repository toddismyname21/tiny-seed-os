#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════════════
PM ORCHESTRATOR - The Ultimate Intelligent PM System
═══════════════════════════════════════════════════════════════════════════════════════

STATE OF THE ART. NO SHORTCUTS. PRODUCTION READY.

FEATURES:
1. REAL-TIME RESPONSE - Watches for messages, responds in seconds
2. PROACTIVE INTELLIGENCE - Suggests actions before user asks
3. MULTI-AGENT COORDINATION - Manages Builder, Research agents, etc.
4. PERSISTENT MEMORY - Learns facts, preferences, patterns (Mem0-style)
5. CONTEXT AWARENESS - Knows project state, tasks, deadlines
6. PREDICTIVE SUGGESTIONS - Anticipates needs based on patterns
7. HEALTH MONITORING - Heartbeat, error tracking, recovery
8. EVENT-DRIVEN - Reacts to file changes, completions, alerts
9. SMART ROUTING - Knows when to respond vs delegate to Builder
10. SESSION CONTINUITY - Maintains conversation context across restarts

ARCHITECTURE:
┌─────────────────────────────────────────────────────────────────────┐
│                         PM ORCHESTRATOR                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │   WATCHER   │  │   BRAIN     │  │  MEMORY     │  │  ROUTER    │ │
│  │ (File Poll) │→ │ (Claude)    │→ │ (Persist)   │→ │ (Decide)   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
│         ↓                ↓                                ↓        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    CHANNEL MANAGER                          │   │
│  │  Dashboard ←→ Builder ←→ Agents ←→ Alerts                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

Usage:
    python3 pm_orchestrator.py                    # Full orchestrator
    python3 pm_orchestrator.py --responder-only   # Just auto-respond
    python3 pm_orchestrator.py --status           # Show system status
    python3 pm_orchestrator.py --proactive        # Enable proactive mode
"""

import argparse
import asyncio
import hashlib
import json
import os
import random
import re
import subprocess
import sys
import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from functools import wraps
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, TypeVar, Union
import traceback

# Type variable for generic retry function
T = TypeVar('T')

# Import intelligence classes from pm_brain
from pm_brain import (
    get_confidence_scorer,
    get_timing_intelligence,
    ConfidenceScorer,
    TimingIntelligence
)

# Import calendar and email integrations
try:
    from calendar_integration import get_calendar_integration, CalendarIntegration
    CALENDAR_AVAILABLE = True
except ImportError:
    CALENDAR_AVAILABLE = False
    print("[Orchestrator] Calendar integration not available")

try:
    from email_integration import get_email_integration, EmailIntegration
    EMAIL_AVAILABLE = True
except ImportError:
    EMAIL_AVAILABLE = False
    print("[Orchestrator] Email integration not available")

# Import predictive intent engine (SOTA 2026)
try:
    from predictive_intent import (
        PredictiveIntentEngine,
        ActionEvent,
        ActionCategory,
        PredictedAction,
        ProactiveSuggestion,
        FusedContext
    )
    PREDICTIVE_INTENT_AVAILABLE = True
except ImportError:
    PREDICTIVE_INTENT_AVAILABLE = False
    print("[Orchestrator] Predictive intent engine not available")

# Import LangGraph wrapper for durable execution (SOTA 2026)
try:
    from langgraph_wrapper import TinyPMGraph, TinyPMState, create_initial_state
    LANGGRAPH_AVAILABLE = True
    print("[Orchestrator] LangGraph durable execution ENABLED")
except ImportError as e:
    LANGGRAPH_AVAILABLE = False
    print(f"[Orchestrator] LangGraph not available: {e}")

# Import Skills System for modular skill execution (SOTA 2026)
try:
    from skills_api import SkillsAPI, SKILLS_AVAILABLE as SKILLS_SYSTEM_AVAILABLE, get_skill_orchestrator
    _skills_api = None

    def get_skills_api_instance() -> SkillsAPI:
        """Get lazy-initialized SkillsAPI instance."""
        global _skills_api
        if _skills_api is None:
            _skills_api = SkillsAPI("pm_orchestrator")
        return _skills_api

    print("[Orchestrator] Skills System ENABLED - modular skill architecture active")
except ImportError as e:
    SKILLS_SYSTEM_AVAILABLE = False
    print(f"[Orchestrator] Skills System not available: {e}")

    def get_skills_api_instance():
        return None

# ═══════════════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════════════

APP_DIR = Path(__file__).parent
PROJECT_ROOT = APP_DIR.parent

# Core files
PM_CHAT_FILE = APP_DIR / ".pm_chat.json"
INTERCOM_FILE = APP_DIR / ".claude_intercom.json"
BOARD_FILE = APP_DIR / "board.json"
AGENT_QUESTIONS_FILE = APP_DIR / ".agent_questions.json"
LAUNCH_CHECKLIST_FILE = APP_DIR / ".launch_checklist.json"

# Orchestrator state
ORCHESTRATOR_STATE_FILE = APP_DIR / ".pm_orchestrator_state.json"
PM_MEMORY_FILE = APP_DIR / ".pm_memory.json"
PM_PATTERNS_FILE = APP_DIR / ".pm_patterns.json"
PM_LOG_FILE = APP_DIR / ".pm_orchestrator.log"

# Claude
CLAUDE_BIN = Path.home() / ".local" / "bin" / "claude"

# Timing
WATCH_INTERVAL = 3  # seconds between file checks
HEARTBEAT_INTERVAL = 30  # seconds between heartbeats
PROACTIVE_CHECK_INTERVAL = 60  # seconds between proactive checks
BUILDER_TIMEOUT = 300  # seconds before assuming Builder is dead
CLAUDE_TIMEOUT = 120  # seconds to wait for Claude response

# Load .env
env_file = APP_DIR / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        if line.strip() and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# ═══════════════════════════════════════════════════════════════════════════════════════
# ENUMS & DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════════════

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

@dataclass
class Memory:
    """Persistent memory system - learns and remembers."""
    user_facts: List[str] = field(default_factory=list)
    project_facts: List[str] = field(default_factory=list)
    preferences: Dict[str, Any] = field(default_factory=dict)
    conversation_topics: List[Dict] = field(default_factory=list)
    pending_followups: List[str] = field(default_factory=list)
    learned_patterns: List[Dict] = field(default_factory=list)
    important_dates: List[Dict] = field(default_factory=list)
    last_interactions: List[Dict] = field(default_factory=list)

    def add_fact(self, category: str, fact: str):
        """Add a learned fact."""
        if category == "user":
            if fact not in self.user_facts:
                self.user_facts.append(fact)
                if len(self.user_facts) > 50:
                    self.user_facts.pop(0)
        elif category == "project":
            if fact not in self.project_facts:
                self.project_facts.append(fact)
                if len(self.project_facts) > 50:
                    self.project_facts.pop(0)

    def add_followup(self, item: str):
        """Add something to follow up on."""
        if item not in self.pending_followups:
            self.pending_followups.append(item)
            if len(self.pending_followups) > 20:
                self.pending_followups.pop(0)

    def record_interaction(self, user_msg: str, pm_response: str):
        """Record an interaction for pattern learning."""
        self.last_interactions.append({
            "timestamp": datetime.now().isoformat(),
            "user": user_msg[:200],
            "pm": pm_response[:200],
            "hour": datetime.now().hour,
            "weekday": datetime.now().weekday()
        })
        if len(self.last_interactions) > 100:
            self.last_interactions.pop(0)

@dataclass
class ProjectContext:
    """Current project state snapshot."""
    tasks_pending: int = 0
    tasks_in_progress: int = 0
    tasks_total: int = 0
    active_tasks: List[str] = field(default_factory=list)
    builder_status: str = "unknown"
    builder_last_msg: str = ""
    builder_queue_size: int = 0
    agent_questions_waiting: int = 0
    launch_progress_pct: int = 0
    launch_items_done: int = 0
    launch_items_total: int = 0
    recent_completions: List[str] = field(default_factory=list)
    # Calendar context (NEW)
    calendar_connected: bool = False
    next_meeting_in_minutes: Optional[int] = None
    next_meeting_title: Optional[str] = None
    prep_time_needed: bool = False
    prep_warning: Optional[str] = None
    focus_time_minutes: int = 0
    is_in_meeting: bool = False
    busy_day: bool = False
    events_today_count: int = 0
    # Email context (NEW)
    email_connected: bool = False
    unread_email_count: int = 0
    urgent_email_count: int = 0
    emails_needing_response: int = 0
    urgent_emails: List[Dict] = field(default_factory=list)
    email_action_items: List[str] = field(default_factory=list)

@dataclass
class OrchestratorState:
    """Full orchestrator state."""
    session_id: str = ""
    started_at: str = ""
    last_heartbeat: str = ""
    messages_processed: int = 0
    proactive_suggestions: int = 0
    errors: int = 0
    builder_last_seen: str = ""
    last_processed_msg_id: int = 0
    mode: str = "active"  # active, paused, maintenance

# ═══════════════════════════════════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════════════════════════════════

LOG_BUFFER = []

def log(msg: str, level: str = "INFO"):
    """Log with timestamp."""
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] [{level}] {msg}"
    print(line)
    LOG_BUFFER.append(line)
    if len(LOG_BUFFER) > 500:
        LOG_BUFFER.pop(0)
    try:
        with open(PM_LOG_FILE, "a") as f:
            f.write(f"[{datetime.now().isoformat()}] [{level}] {msg}\n")
    except:
        pass

# ═══════════════════════════════════════════════════════════════════════════════════════
# FILE OPERATIONS
# ═══════════════════════════════════════════════════════════════════════════════════════

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

# ═══════════════════════════════════════════════════════════════════════════════════════
# ERROR RECOVERY SYSTEM - SOTA Resilience Patterns
# ═══════════════════════════════════════════════════════════════════════════════════════

# Error log file for persistent error tracking
PM_ERROR_LOG_FILE = APP_DIR / ".pm_error_log.json"


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"      # Normal operation, requests flow through
    OPEN = "open"          # Too many failures, requests blocked
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker behavior."""
    failure_threshold: int = 5       # Failures before opening circuit
    recovery_timeout: float = 60.0   # Seconds before trying again
    success_threshold: int = 2       # Successes needed to close circuit


class ErrorRecovery:
    """
    SOTA Error Recovery Patterns for Resilient AI Operations.

    Implements:
    1. Exponential backoff with jitter for API retry
    2. Circuit breaker pattern to prevent cascade failures
    3. Graceful degradation with fallback responses
    4. Persistent error logging for debugging

    Based on patterns from:
    - AWS Architecture Blog (2024): Exponential Backoff And Jitter
    - Netflix Hystrix patterns for circuit breaking
    - Google SRE Book: Handling Overload
    """

    # Default retry configuration
    DEFAULT_MAX_ATTEMPTS = 3
    DEFAULT_BASE_DELAY = 1.0  # seconds
    DEFAULT_MAX_DELAY = 60.0  # seconds
    DEFAULT_JITTER_FACTOR = 0.25  # Add randomness to prevent thundering herd

    # Retryable exceptions - these are transient and worth retrying
    RETRYABLE_EXCEPTIONS = (
        ConnectionError,
        TimeoutError,
        ConnectionResetError,
        ConnectionRefusedError,
        BrokenPipeError,
        OSError,  # Covers network-related OS errors
    )

    def __init__(self, circuit_config: Optional[CircuitBreakerConfig] = None):
        """
        Initialize ErrorRecovery with optional circuit breaker config.

        Args:
            circuit_config: Circuit breaker configuration. Uses defaults if None.
        """
        self.circuit_config = circuit_config or CircuitBreakerConfig()

        # Circuit breaker state per operation
        self._circuit_states: Dict[str, CircuitState] = {}
        self._failure_counts: Dict[str, int] = {}
        self._success_counts: Dict[str, int] = {}
        self._last_failure_times: Dict[str, float] = {}

        # Error history for logging
        self._error_history: List[Dict[str, Any]] = []

        # Load persisted state
        self._load_state()

    def _load_state(self) -> None:
        """Load circuit breaker state from disk."""
        try:
            if PM_ERROR_LOG_FILE.exists():
                data = json.loads(PM_ERROR_LOG_FILE.read_text())
                self._error_history = data.get("error_history", [])[-100:]  # Keep last 100
        except Exception:
            pass

    def _save_state(self) -> None:
        """Save error log to disk."""
        try:
            data = {
                "error_history": self._error_history[-100:],
                "circuit_states": {k: v.value for k, v in self._circuit_states.items()},
                "failure_counts": self._failure_counts,
                "last_updated": datetime.now().isoformat()
            }
            PM_ERROR_LOG_FILE.write_text(json.dumps(data, indent=2, default=str))
        except Exception as e:
            log(f"Failed to save error state: {e}", "WARN")

    def calculate_backoff(self, attempt: int, base_delay: float = None,
                         max_delay: float = None) -> float:
        """
        Calculate exponential backoff delay with jitter.

        Formula: min(max_delay, base_delay * 2^attempt) * (1 + random * jitter)

        Args:
            attempt: Current attempt number (0-indexed)
            base_delay: Starting delay in seconds
            max_delay: Maximum delay cap in seconds

        Returns:
            Delay in seconds to wait before next retry
        """
        base = base_delay or self.DEFAULT_BASE_DELAY
        max_d = max_delay or self.DEFAULT_MAX_DELAY

        # Exponential increase: 1, 2, 4, 8, 16, ...
        exp_delay = base * (2 ** attempt)

        # Cap at max delay
        capped_delay = min(exp_delay, max_d)

        # Add jitter to prevent thundering herd
        jitter = 1 + (random.random() * self.DEFAULT_JITTER_FACTOR)

        return capped_delay * jitter

    def is_circuit_open(self, operation_name: str) -> bool:
        """
        Check if circuit breaker is open (blocking requests).

        If circuit is open, check if recovery timeout has passed
        and transition to half-open state.

        Args:
            operation_name: Name of the operation to check

        Returns:
            True if circuit is open and requests should be blocked
        """
        state = self._circuit_states.get(operation_name, CircuitState.CLOSED)

        if state == CircuitState.OPEN:
            # Check if we should try again (recovery timeout passed)
            last_failure = self._last_failure_times.get(operation_name, 0)
            if time.time() - last_failure >= self.circuit_config.recovery_timeout:
                self._circuit_states[operation_name] = CircuitState.HALF_OPEN
                log(f"Circuit [{operation_name}] transitioning to HALF_OPEN", "INFO")
                return False
            return True

        return False

    def record_success(self, operation_name: str) -> None:
        """
        Record successful operation, potentially closing circuit.

        Args:
            operation_name: Name of the operation that succeeded
        """
        state = self._circuit_states.get(operation_name, CircuitState.CLOSED)

        if state == CircuitState.HALF_OPEN:
            # Track successes in half-open state
            self._success_counts[operation_name] = self._success_counts.get(operation_name, 0) + 1

            if self._success_counts[operation_name] >= self.circuit_config.success_threshold:
                # Enough successes - close circuit
                self._circuit_states[operation_name] = CircuitState.CLOSED
                self._failure_counts[operation_name] = 0
                self._success_counts[operation_name] = 0
                log(f"Circuit [{operation_name}] CLOSED - service recovered", "INFO")
        else:
            # Normal operation - reset failure count
            self._failure_counts[operation_name] = 0

    def record_failure(self, operation_name: str, error: Exception,
                       context: Optional[Dict[str, Any]] = None) -> None:
        """
        Record failed operation, potentially opening circuit.

        Args:
            operation_name: Name of the operation that failed
            error: The exception that occurred
            context: Additional context for debugging
        """
        state = self._circuit_states.get(operation_name, CircuitState.CLOSED)

        # Update failure tracking
        self._failure_counts[operation_name] = self._failure_counts.get(operation_name, 0) + 1
        self._last_failure_times[operation_name] = time.time()

        # Log the error
        self.log_error(
            operation=operation_name,
            error=error,
            attempt=self._failure_counts[operation_name],
            will_retry=self._failure_counts[operation_name] < self.circuit_config.failure_threshold,
            context=context
        )

        if state == CircuitState.HALF_OPEN:
            # Failed during recovery test - back to open
            self._circuit_states[operation_name] = CircuitState.OPEN
            self._success_counts[operation_name] = 0
            log(f"Circuit [{operation_name}] back to OPEN - recovery failed", "WARN")
        elif self._failure_counts[operation_name] >= self.circuit_config.failure_threshold:
            # Too many failures - open circuit
            self._circuit_states[operation_name] = CircuitState.OPEN
            log(f"Circuit [{operation_name}] OPENED - too many failures", "ERROR")

    def log_error(self, operation: str, error: Exception, attempt: int,
                  will_retry: bool, context: Optional[Dict[str, Any]] = None) -> None:
        """
        Log error with full context for debugging.

        Args:
            operation: Name of the operation
            error: The exception that occurred
            attempt: Which attempt this was
            will_retry: Whether we'll retry
            context: Additional context
        """
        error_entry = {
            "timestamp": datetime.now().isoformat(),
            "operation": operation,
            "error_type": type(error).__name__,
            "error_message": str(error),
            "attempt": attempt,
            "will_retry": will_retry,
            "context": context or {}
        }

        self._error_history.append(error_entry)
        if len(self._error_history) > 100:
            self._error_history = self._error_history[-100:]

        log_level = "WARN" if will_retry else "ERROR"
        log(f"[{operation}] Attempt {attempt} failed: {error} (retry={will_retry})", log_level)

        self._save_state()

    def get_fallback_response(self, operation_name: str) -> Dict[str, Any]:
        """
        Return graceful degradation response when circuit is open.

        Args:
            operation_name: Name of the operation that failed

        Returns:
            Fallback response with error context
        """
        return {
            "success": False,
            "fallback": True,
            "message": f"Service temporarily unavailable ({operation_name}). Please try again later.",
            "circuit_state": self._circuit_states.get(operation_name, CircuitState.CLOSED).value,
            "retry_after": self.circuit_config.recovery_timeout
        }

    def with_retry(self, func: Callable[..., T],
                   operation_name: str = None,
                   max_attempts: int = None,
                   base_delay: float = None,
                   max_delay: float = None,
                   retry_exceptions: tuple = None) -> Callable[..., T]:
        """
        Decorator/wrapper to execute function with exponential backoff retry.

        Args:
            func: Function to wrap
            operation_name: Name for circuit breaker tracking
            max_attempts: Maximum retry attempts
            base_delay: Starting delay for backoff
            max_delay: Maximum delay cap
            retry_exceptions: Tuple of exceptions to retry on

        Returns:
            Wrapped function with retry logic
        """
        op_name = operation_name or func.__name__
        attempts = max_attempts or self.DEFAULT_MAX_ATTEMPTS
        base = base_delay or self.DEFAULT_BASE_DELAY
        max_d = max_delay or self.DEFAULT_MAX_DELAY
        exceptions = retry_exceptions or self.RETRYABLE_EXCEPTIONS

        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            # Check circuit breaker first
            if self.is_circuit_open(op_name):
                log(f"Circuit [{op_name}] is OPEN - returning fallback", "WARN")
                raise CircuitOpenError(f"Circuit breaker open for {op_name}")

            last_exception = None

            for attempt in range(attempts):
                try:
                    result = func(*args, **kwargs)
                    self.record_success(op_name)
                    return result

                except exceptions as e:
                    last_exception = e
                    self.record_failure(op_name, e, {"attempt": attempt + 1, "args": str(args)[:100]})

                    if attempt < attempts - 1:
                        delay = self.calculate_backoff(attempt, base, max_d)
                        log(f"[{op_name}] Retrying in {delay:.2f}s (attempt {attempt + 1}/{attempts})")
                        time.sleep(delay)

                except Exception as e:
                    # Non-retryable exception - fail immediately
                    self.record_failure(op_name, e, {"attempt": attempt + 1, "fatal": True})
                    raise

            # All retries exhausted
            if last_exception:
                raise last_exception

        return wrapper

    def execute_with_retry(self, func: Callable[..., T],
                          args: tuple = (),
                          kwargs: dict = None,
                          operation_name: str = None,
                          max_attempts: int = None,
                          base_delay: float = None) -> T:
        """
        Execute a function with retry logic (non-decorator style).

        Args:
            func: Function to execute
            args: Positional arguments
            kwargs: Keyword arguments
            operation_name: Name for tracking
            max_attempts: Max retry attempts
            base_delay: Starting delay

        Returns:
            Function result

        Raises:
            Last exception if all retries fail
        """
        kwargs = kwargs or {}
        wrapped = self.with_retry(
            func,
            operation_name=operation_name or func.__name__,
            max_attempts=max_attempts,
            base_delay=base_delay
        )
        return wrapped(*args, **kwargs)

    def get_error_stats(self) -> Dict[str, Any]:
        """
        Get error statistics for monitoring.

        Returns:
            Dict with error counts, circuit states, and recent errors
        """
        return {
            "total_errors": len(self._error_history),
            "circuit_states": {k: v.value for k, v in self._circuit_states.items()},
            "failure_counts": self._failure_counts,
            "recent_errors": self._error_history[-10:],
            "last_updated": datetime.now().isoformat()
        }


class CircuitOpenError(Exception):
    """Raised when circuit breaker is open and request is blocked."""
    pass


# Global error recovery instance
_error_recovery: Optional[ErrorRecovery] = None


def get_error_recovery() -> ErrorRecovery:
    """Get global ErrorRecovery instance (singleton pattern)."""
    global _error_recovery
    if _error_recovery is None:
        _error_recovery = ErrorRecovery()
    return _error_recovery


def retry_on_failure(max_attempts: int = 3,
                    base_delay: float = 1.0,
                    operation_name: str = None):
    """
    Decorator to add retry logic to any function.

    Usage:
        @retry_on_failure(max_attempts=3, base_delay=2.0)
        def call_external_api():
            ...

    Args:
        max_attempts: Maximum number of attempts
        base_delay: Starting delay in seconds
        operation_name: Name for circuit breaker (defaults to function name)
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        recovery = get_error_recovery()
        return recovery.with_retry(
            func,
            operation_name=operation_name or func.__name__,
            max_attempts=max_attempts,
            base_delay=base_delay
        )
    return decorator


# ═══════════════════════════════════════════════════════════════════════════════════════
# MEMORY SYSTEM (Mem0-inspired)
# ═══════════════════════════════════════════════════════════════════════════════════════

class MemoryManager:
    """Persistent memory with learning capabilities."""

    def __init__(self):
        self.memory = self._load()

    def _load(self) -> Memory:
        """Load memory from disk."""
        data = safe_read_json(PM_MEMORY_FILE, {})
        return Memory(
            user_facts=data.get("user_facts", []),
            project_facts=data.get("project_facts", []),
            preferences=data.get("preferences", {}),
            conversation_topics=data.get("conversation_topics", []),
            pending_followups=data.get("pending_followups", []),
            learned_patterns=data.get("learned_patterns", []),
            important_dates=data.get("important_dates", []),
            last_interactions=data.get("last_interactions", [])
        )

    def save(self):
        """Save memory to disk."""
        safe_write_json(PM_MEMORY_FILE, asdict(self.memory))

    def learn_from_message(self, user_msg: str, pm_response: str):
        """Extract learnings from a conversation exchange."""
        lower = user_msg.lower()

        # Extract user facts
        if any(x in lower for x in ["my name is", "i am ", "i'm ", "call me"]):
            self.memory.add_fact("user", f"Identity: {user_msg[:100]}")

        if any(x in lower for x in ["i prefer", "i like", "i want", "i need"]):
            self.memory.add_fact("user", f"Preference: {user_msg[:100]}")

        if any(x in lower for x in ["deadline", "by ", "due ", "before "]):
            self.memory.important_dates.append({
                "mentioned": datetime.now().isoformat(),
                "context": user_msg[:150]
            })

        # Track followups from response
        if any(x in pm_response.lower() for x in ["i'll follow up", "will check", "let me know", "remind me"]):
            self.memory.add_followup(user_msg[:100])

        # Record interaction
        self.memory.record_interaction(user_msg, pm_response)

        self.save()

    def get_context_for_prompt(self) -> str:
        """Get memory context formatted for the prompt."""
        parts = []

        if self.memory.user_facts:
            parts.append("USER FACTS:\n" + "\n".join(f"- {f}" for f in self.memory.user_facts[-5:]))

        if self.memory.preferences:
            parts.append("PREFERENCES:\n" + json.dumps(self.memory.preferences, indent=2))

        if self.memory.pending_followups:
            parts.append("PENDING FOLLOWUPS:\n" + "\n".join(f"- {f}" for f in self.memory.pending_followups[-5:]))

        if self.memory.important_dates:
            parts.append("IMPORTANT DATES MENTIONED:\n" + "\n".join(
                f"- {d['context'][:50]}..." for d in self.memory.important_dates[-3:]
            ))

        return "\n\n".join(parts) if parts else "No stored memory yet."

# ═══════════════════════════════════════════════════════════════════════════════════════
# CONTEXT GATHERER
# ═══════════════════════════════════════════════════════════════════════════════════════

class ContextGatherer:
    """Gathers comprehensive project context including calendar and email."""

    @staticmethod
    def gather() -> ProjectContext:
        """Gather all project context including calendar and email."""
        ctx = ProjectContext()

        # Tasks
        board = safe_read_json(BOARD_FILE, {"tasks": []})
        tasks = board.get("tasks", [])
        ctx.tasks_total = len(tasks)
        ctx.tasks_pending = len([t for t in tasks if t.get("status") == "pending"])
        ctx.tasks_in_progress = len([t for t in tasks if t.get("status") == "in_progress"])
        ctx.active_tasks = [t.get("title", "Untitled")[:40] for t in tasks if t.get("status") == "in_progress"][:5]

        # Builder
        intercom = safe_read_json(INTERCOM_FILE, {})
        builder_msgs = intercom.get("builder_to_pm", [])
        if builder_msgs:
            latest = builder_msgs[-1]
            ctx.builder_status = latest.get("type", "unknown")
            ctx.builder_last_msg = latest.get("message", "")[:100]
        pm_queue = [t for t in intercom.get("pm_to_builder", []) if not t.get("read")]
        ctx.builder_queue_size = len(pm_queue)

        # Agent questions
        questions = safe_read_json(AGENT_QUESTIONS_FILE, {"questions": []})
        ctx.agent_questions_waiting = len([q for q in questions.get("questions", []) if not q.get("answered")])

        # Launch readiness
        checklist = safe_read_json(LAUNCH_CHECKLIST_FILE, {"items": []})
        items = checklist.get("items", [])
        ctx.launch_items_total = len(items)
        ctx.launch_items_done = len([i for i in items if i.get("status") == "done"])
        ctx.launch_progress_pct = int((ctx.launch_items_done / ctx.launch_items_total) * 100) if ctx.launch_items_total else 0

        # Calendar context (NEW)
        if CALENDAR_AVAILABLE:
            try:
                cal = get_calendar_integration()
                cal_ctx = cal.get_calendar_context_for_pm()
                ctx.calendar_connected = cal_ctx.get('connected', False)
                if ctx.calendar_connected:
                    ctx.events_today_count = cal_ctx.get('events_today_count', 0)
                    ctx.busy_day = cal_ctx.get('busy_day', False)
                    ctx.prep_time_needed = cal_ctx.get('prep_needed', False)
                    ctx.prep_warning = cal_ctx.get('prep_warning')

                    # Focus time
                    focus = cal_ctx.get('focus_time', {})
                    ctx.focus_time_minutes = focus.get('next_block_minutes', 0)

                    # Next meeting info
                    next_evt = cal_ctx.get('next_event')
                    if next_evt:
                        ctx.next_meeting_in_minutes = next_evt.get('minutes_until')
                        ctx.next_meeting_title = next_evt.get('title')
                        # Check if currently in a meeting (negative minutes until = in meeting)
                        if ctx.next_meeting_in_minutes is not None and ctx.next_meeting_in_minutes <= 0:
                            ctx.is_in_meeting = True
            except Exception as e:
                log(f"Calendar context error: {e}", "WARN")

        # Email context (NEW)
        if EMAIL_AVAILABLE:
            try:
                email = get_email_integration()
                email_ctx = email.get_email_context_for_pm()
                ctx.email_connected = email_ctx.get('connected', False)
                if ctx.email_connected:
                    ctx.unread_email_count = email_ctx.get('unread_count', 0)
                    ctx.urgent_email_count = email_ctx.get('urgent_count', 0)
                    ctx.emails_needing_response = email_ctx.get('needs_response_count', 0)
                    ctx.urgent_emails = email_ctx.get('urgent_emails', [])
                    ctx.email_action_items = email_ctx.get('action_items', [])
            except Exception as e:
                log(f"Email context error: {e}", "WARN")

        return ctx

    @staticmethod
    def format_for_prompt(ctx: ProjectContext) -> str:
        """Format context for Claude prompt including calendar and email."""
        lines = [
            f"TASKS: {ctx.tasks_pending} pending, {ctx.tasks_in_progress} in progress, {ctx.tasks_total} total",
        ]

        if ctx.active_tasks:
            lines.append(f"ACTIVE: {', '.join(ctx.active_tasks)}")

        lines.append(f"BUILDER: {ctx.builder_status} | Queue: {ctx.builder_queue_size} tasks")
        if ctx.builder_last_msg:
            lines.append(f"  Last: {ctx.builder_last_msg}")

        if ctx.agent_questions_waiting:
            lines.append(f"AGENT QUESTIONS WAITING: {ctx.agent_questions_waiting}")

        lines.append(f"LAUNCH READINESS: {ctx.launch_progress_pct}% ({ctx.launch_items_done}/{ctx.launch_items_total})")

        # Calendar section (NEW)
        if ctx.calendar_connected:
            lines.append("")
            lines.append("CALENDAR:")
            if ctx.is_in_meeting:
                lines.append(f"  Currently IN MEETING: {ctx.next_meeting_title}")
            elif ctx.next_meeting_in_minutes is not None:
                lines.append(f"  Next meeting: {ctx.next_meeting_title} in {ctx.next_meeting_in_minutes} min")
            if ctx.prep_time_needed and ctx.prep_warning:
                lines.append(f"  PREP NEEDED: {ctx.prep_warning}")
            lines.append(f"  Focus time available: {ctx.focus_time_minutes} min")
            lines.append(f"  Events today: {ctx.events_today_count} {'(busy day!)' if ctx.busy_day else ''}")

        # Email section (NEW)
        if ctx.email_connected:
            lines.append("")
            lines.append("EMAIL:")
            lines.append(f"  Unread: {ctx.unread_email_count}")
            if ctx.urgent_email_count > 0:
                lines.append(f"  URGENT: {ctx.urgent_email_count} emails need attention")
            if ctx.emails_needing_response > 0:
                lines.append(f"  Needing response: {ctx.emails_needing_response}")
            if ctx.urgent_emails:
                for ue in ctx.urgent_emails[:2]:
                    lines.append(f"    - [{ue.get('urgency', '?')}] {ue.get('subject', 'No subject')[:40]} from {ue.get('sender', 'Unknown')}")
            if ctx.email_action_items:
                lines.append(f"  Action items from email: {len(ctx.email_action_items)}")

        return "\n".join(lines)

# ═══════════════════════════════════════════════════════════════════════════════════════
# INTEGRATED CONTEXT GATHERER
# ═══════════════════════════════════════════════════════════════════════════════════════

class IntegratedContextGatherer:
    """
    Unified context gatherer combining task, calendar, and email context.

    This creates a comprehensive context object for Claude prompts that includes:
    - Task board state (pending, in progress, etc.)
    - Calendar awareness (meetings, focus time, prep warnings)
    - Email intelligence (urgent emails, action items)

    Usage:
        gatherer = IntegratedContextGatherer()
        context = gatherer.get_unified_context()
        prompt_context = gatherer.format_for_claude_prompt()
    """

    def __init__(self, user_id: str = "default"):
        self.user_id = user_id
        self._calendar = None
        self._email = None

    def _get_calendar(self):
        """Get calendar integration (lazy load)."""
        if self._calendar is None and CALENDAR_AVAILABLE:
            self._calendar = get_calendar_integration(self.user_id)
        return self._calendar

    def _get_email(self):
        """Get email integration (lazy load)."""
        if self._email is None and EMAIL_AVAILABLE:
            self._email = get_email_integration(self.user_id)
        return self._email

    def get_unified_context(self) -> Dict[str, Any]:
        """
        Get unified context combining task, calendar, and email data.

        Returns a comprehensive dict suitable for PM decision-making.
        """
        # Start with project context
        project_ctx = ContextGatherer.gather()

        unified = {
            "timestamp": datetime.now().isoformat(),
            "user_id": self.user_id,

            # Task context
            "tasks": {
                "pending": project_ctx.tasks_pending,
                "in_progress": project_ctx.tasks_in_progress,
                "total": project_ctx.tasks_total,
                "active": project_ctx.active_tasks,
            },

            # Builder context
            "builder": {
                "status": project_ctx.builder_status,
                "last_message": project_ctx.builder_last_msg,
                "queue_size": project_ctx.builder_queue_size,
            },

            # Agent context
            "agents": {
                "questions_waiting": project_ctx.agent_questions_waiting,
            },

            # Launch context
            "launch": {
                "progress_pct": project_ctx.launch_progress_pct,
                "items_done": project_ctx.launch_items_done,
                "items_total": project_ctx.launch_items_total,
            },

            # Calendar context
            "calendar": {
                "connected": project_ctx.calendar_connected,
                "is_in_meeting": project_ctx.is_in_meeting,
                "next_meeting_title": project_ctx.next_meeting_title,
                "next_meeting_in_minutes": project_ctx.next_meeting_in_minutes,
                "prep_time_needed": project_ctx.prep_time_needed,
                "prep_warning": project_ctx.prep_warning,
                "focus_time_minutes": project_ctx.focus_time_minutes,
                "busy_day": project_ctx.busy_day,
                "events_today_count": project_ctx.events_today_count,
            },

            # Email context
            "email": {
                "connected": project_ctx.email_connected,
                "unread_count": project_ctx.unread_email_count,
                "urgent_count": project_ctx.urgent_email_count,
                "needs_response_count": project_ctx.emails_needing_response,
                "urgent_emails": project_ctx.urgent_emails,
                "action_items": project_ctx.email_action_items,
            },

            # Computed insights
            "insights": self._compute_insights(project_ctx),
        }

        return unified

    def _compute_insights(self, ctx: ProjectContext) -> Dict[str, Any]:
        """
        Compute actionable insights from the combined context.

        These are higher-level observations useful for PM decision making.
        """
        insights = {
            "priorities": [],
            "warnings": [],
            "opportunities": [],
        }

        # Priority: Urgent emails
        if ctx.urgent_email_count > 0:
            insights["priorities"].append({
                "type": "urgent_email",
                "message": f"{ctx.urgent_email_count} urgent email(s) need attention",
                "priority": "high"
            })

        # Priority: Agent questions
        if ctx.agent_questions_waiting > 0:
            insights["priorities"].append({
                "type": "agent_questions",
                "message": f"{ctx.agent_questions_waiting} agent question(s) blocking work",
                "priority": "high"
            })

        # Warning: Meeting prep needed
        if ctx.prep_time_needed:
            insights["warnings"].append({
                "type": "meeting_prep",
                "message": ctx.prep_warning or "Meeting prep needed soon"
            })

        # Warning: Busy day with lots of tasks
        if ctx.busy_day and ctx.tasks_pending > 5:
            insights["warnings"].append({
                "type": "overload_risk",
                "message": f"Busy day ({ctx.events_today_count} events) with {ctx.tasks_pending} pending tasks"
            })

        # Opportunity: Focus time available
        if ctx.focus_time_minutes >= 90 and ctx.tasks_in_progress > 0:
            insights["opportunities"].append({
                "type": "deep_work",
                "message": f"{ctx.focus_time_minutes} min focus time - perfect for deep work on active tasks"
            })

        # Opportunity: Inbox zero candidate
        if ctx.unread_email_count > 0 and ctx.unread_email_count <= 10 and ctx.focus_time_minutes >= 30:
            insights["opportunities"].append({
                "type": "inbox_zero",
                "message": f"Only {ctx.unread_email_count} unread emails - inbox zero possible"
            })

        return insights

    def format_for_claude_prompt(self) -> str:
        """
        Format the unified context as a string for Claude prompts.

        This is the main integration point - returns a formatted string
        that can be injected into PM prompts.
        """
        ctx = ContextGatherer.gather()
        base_format = ContextGatherer.format_for_prompt(ctx)

        # Add insights section
        insights = self._compute_insights(ctx)

        insights_lines = []
        if insights["priorities"]:
            insights_lines.append("\nPRIORITIES:")
            for p in insights["priorities"]:
                insights_lines.append(f"  [{p['priority'].upper()}] {p['message']}")

        if insights["warnings"]:
            insights_lines.append("\nWARNINGS:")
            for w in insights["warnings"]:
                insights_lines.append(f"  {w['message']}")

        if insights["opportunities"]:
            insights_lines.append("\nOPPORTUNITIES:")
            for o in insights["opportunities"]:
                insights_lines.append(f"  {o['message']}")

        if insights_lines:
            return base_format + "\n" + "\n".join(insights_lines)

        return base_format

    def get_timing_context_for_proactive(self) -> Dict[str, Any]:
        """
        Get context specifically for timing decisions (when to suggest).

        Returns info needed by TimingIntelligence.is_good_time_to_suggest().
        """
        ctx = ContextGatherer.gather()

        return {
            "is_in_meeting": ctx.is_in_meeting,
            "next_meeting_in_minutes": ctx.next_meeting_in_minutes,
            "focus_time_minutes": ctx.focus_time_minutes,
            "calendar_connected": ctx.calendar_connected,
        }


# Global IntegratedContextGatherer instance
_integrated_context: Optional[IntegratedContextGatherer] = None


def get_integrated_context(user_id: str = "default") -> IntegratedContextGatherer:
    """Get or create the global IntegratedContextGatherer instance."""
    global _integrated_context
    if _integrated_context is None or _integrated_context.user_id != user_id:
        _integrated_context = IntegratedContextGatherer(user_id)
    return _integrated_context


# ═══════════════════════════════════════════════════════════════════════════════════════
# SMART ROUTER
# ═══════════════════════════════════════════════════════════════════════════════════════

class SmartRouter:
    """Decides how to handle incoming messages."""

    # Keywords that suggest Builder should handle it
    BUILDER_KEYWORDS = [
        "build", "create", "code", "implement", "fix bug", "add feature",
        "write", "develop", "html", "css", "javascript", "python"
    ]

    # Keywords that suggest urgent/immediate response
    URGENT_KEYWORDS = [
        "urgent", "asap", "now", "immediately", "critical", "broken", "down", "error"
    ]

    # Keywords that suggest informational query
    INFO_KEYWORDS = [
        "status", "update", "progress", "what", "how", "where", "when", "why"
    ]

    @classmethod
    def analyze(cls, message: str) -> Dict[str, Any]:
        """Analyze message and determine routing."""
        lower = message.lower()

        result = {
            "route": "pm",  # pm, builder, research
            "priority": MessagePriority.NORMAL,
            "should_delegate": False,
            "delegate_to": None,
            "needs_context": True,
            "proactive_hint": None
        }

        # Check for Builder keywords
        if any(kw in lower for kw in cls.BUILDER_KEYWORDS):
            result["should_delegate"] = True
            result["delegate_to"] = "builder"
            result["route"] = "pm_then_builder"

        # Check urgency
        if any(kw in lower for kw in cls.URGENT_KEYWORDS):
            result["priority"] = MessagePriority.HIGH

        # Check if it's a status query
        if any(kw in lower for kw in cls.INFO_KEYWORDS):
            result["needs_context"] = True

        return result

# ═══════════════════════════════════════════════════════════════════════════════════════
# PROACTIVE ENGINE
# ═══════════════════════════════════════════════════════════════════════════════════════

class ProactiveEngine:
    """Generates proactive suggestions and alerts with SOTA intelligence.

    Enhanced with:
    - ConfidenceScorer: Calibrated confidence before surfacing suggestions
    - TimingIntelligence: Detect optimal moments for intervention (IUI '26 research)
    - PredictiveIntentEngine: Mind-reading prediction (2026 SOTA)
    """

    def __init__(self, memory_manager: MemoryManager):
        self.memory = memory_manager
        self.last_suggestions = {}
        # Get global intelligence instances
        self.confidence_scorer = get_confidence_scorer()
        self.timing_intelligence = get_timing_intelligence()

        # Initialize predictive intent engine (SOTA 2026)
        self.predictive_intent = None
        if PREDICTIVE_INTENT_AVAILABLE:
            try:
                self.predictive_intent = PredictiveIntentEngine()
                log("ProactiveEngine: PredictiveIntentEngine loaded - mind-reading active")
            except Exception as e:
                log(f"ProactiveEngine: Failed to load PredictiveIntentEngine: {e}", "WARN")

    def _gather_potential_suggestions(self, ctx: ProjectContext) -> List[Dict]:
        """Gather all potential suggestions with their metadata.

        Returns list of dicts with:
        - type: suggestion type for confidence scoring
        - message: the suggestion text
        - priority: priority level
        - context: additional context for scoring

        ENHANCED: Now includes calendar and email suggestions.
        """
        suggestions = []

        # Agent questions waiting - high priority
        if ctx.agent_questions_waiting > 0:
            suggestions.append({
                "type": "question_pending",
                "message": f"{ctx.agent_questions_waiting} agent question(s) waiting for your input",
                "priority": "high",
                "context": {
                    "data_completeness": 1.0,  # We know exact count
                    "novelty_score": 0.1,  # Common occurrence
                    "base_confidence": 0.90
                }
            })

        # Builder idle with queue
        if ctx.builder_status == "done" and ctx.builder_queue_size > 0:
            suggestions.append({
                "type": "builder_update",
                "message": f"Builder finished and has {ctx.builder_queue_size} tasks in queue",
                "priority": "normal",
                "context": {
                    "data_completeness": 1.0,
                    "novelty_score": 0.2,
                    "base_confidence": 0.85
                }
            })

        # Launch readiness milestones
        if ctx.launch_progress_pct in [25, 50, 75, 90] and ctx.launch_progress_pct != self.last_suggestions.get("launch_pct"):
            suggestions.append({
                "type": "milestone_reached",
                "message": f"Launch readiness hit {ctx.launch_progress_pct}%!",
                "priority": "normal",
                "context": {
                    "data_completeness": 1.0,
                    "novelty_score": 0.5,  # Milestones are somewhat novel
                    "base_confidence": 0.95
                }
            })

        # Pending followups
        if self.memory.memory.pending_followups:
            suggestions.append({
                "type": "followup_reminder",
                "message": f"You have {len(self.memory.memory.pending_followups)} pending follow-up(s)",
                "priority": "low",
                "context": {
                    "data_completeness": 0.8,  # We know count but not urgency
                    "novelty_score": 0.1,
                    "base_confidence": 0.75
                }
            })

        # Stale tasks in progress (only first one to avoid noise)
        if ctx.active_tasks and len(ctx.active_tasks) > 0:
            task = ctx.active_tasks[0]
            suggestions.append({
                "type": "stale_task",
                "message": f"Task '{task[:30]}' in progress - status update?",
                "priority": "low",
                "context": {
                    "data_completeness": 0.6,  # We don't know exact staleness
                    "novelty_score": 0.3,
                    "base_confidence": 0.60
                }
            })

        # ═══════════════════════════════════════════════════════════════
        # CALENDAR SUGGESTIONS (NEW)
        # ═══════════════════════════════════════════════════════════════

        # Meeting prep reminder (15 min before meetings)
        if ctx.calendar_connected and ctx.prep_time_needed:
            suggestions.append({
                "type": "meeting_prep",
                "message": f"Meeting prep needed: {ctx.prep_warning}",
                "priority": "high",
                "context": {
                    "data_completeness": 1.0,
                    "novelty_score": 0.2,
                    "base_confidence": 0.95  # High confidence - we know meeting time
                }
            })

        # Focus time opportunity
        if ctx.calendar_connected and ctx.focus_time_minutes >= 90:
            suggestions.append({
                "type": "focus_time_available",
                "message": f"You have {ctx.focus_time_minutes} min of focus time - good for deep work",
                "priority": "low",
                "context": {
                    "data_completeness": 1.0,
                    "novelty_score": 0.4,
                    "base_confidence": 0.80
                }
            })

        # Upcoming meeting awareness (30-60 min out)
        if ctx.calendar_connected and ctx.next_meeting_in_minutes:
            if 30 <= ctx.next_meeting_in_minutes <= 60:
                suggestions.append({
                    "type": "meeting_coming_up",
                    "message": f"'{ctx.next_meeting_title}' in {ctx.next_meeting_in_minutes} min - wrap up current work",
                    "priority": "normal",
                    "context": {
                        "data_completeness": 1.0,
                        "novelty_score": 0.2,
                        "base_confidence": 0.85
                    }
                })

        # Busy day alert (morning only, not repeatedly)
        if ctx.calendar_connected and ctx.busy_day:
            from datetime import datetime
            if datetime.now().hour < 10:  # Morning
                suggestions.append({
                    "type": "busy_day_alert",
                    "message": f"Busy day with {ctx.events_today_count} events - protect your focus time",
                    "priority": "normal",
                    "context": {
                        "data_completeness": 1.0,
                        "novelty_score": 0.3,
                        "base_confidence": 0.85
                    }
                })

        # ═══════════════════════════════════════════════════════════════
        # EMAIL SUGGESTIONS (NEW)
        # ═══════════════════════════════════════════════════════════════

        # Urgent emails needing response
        if ctx.email_connected and ctx.urgent_email_count > 0:
            # Build a message with specifics if available
            if ctx.urgent_emails:
                top_urgent = ctx.urgent_emails[0]
                msg = f"Urgent email from {top_urgent.get('sender', 'Unknown')}: '{top_urgent.get('subject', 'No subject')[:30]}'"
                if ctx.urgent_email_count > 1:
                    msg += f" (+{ctx.urgent_email_count - 1} more)"
            else:
                msg = f"{ctx.urgent_email_count} urgent email(s) need attention"

            suggestions.append({
                "type": "urgent_email",
                "message": msg,
                "priority": "high",
                "context": {
                    "data_completeness": 1.0,
                    "novelty_score": 0.2,
                    "base_confidence": 0.90
                }
            })

        # Emails needing response (but not marked urgent)
        elif ctx.email_connected and ctx.emails_needing_response > 2:
            suggestions.append({
                "type": "emails_pending_response",
                "message": f"{ctx.emails_needing_response} emails may need a response",
                "priority": "normal",
                "context": {
                    "data_completeness": 0.8,  # Heuristic-based
                    "novelty_score": 0.2,
                    "base_confidence": 0.75
                }
            })

        # Action items from emails
        if ctx.email_connected and ctx.email_action_items:
            suggestions.append({
                "type": "email_action_items",
                "message": f"{len(ctx.email_action_items)} action item(s) detected in emails",
                "priority": "normal",
                "context": {
                    "data_completeness": 0.7,  # Extracted via heuristics
                    "novelty_score": 0.3,
                    "base_confidence": 0.70
                }
            })

        # High unread count alert (inbox getting out of hand)
        if ctx.email_connected and ctx.unread_email_count > 50:
            suggestions.append({
                "type": "inbox_overload",
                "message": f"Inbox has {ctx.unread_email_count} unread emails - time for inbox zero?",
                "priority": "low",
                "context": {
                    "data_completeness": 1.0,
                    "novelty_score": 0.2,
                    "base_confidence": 0.65
                }
            })

        return suggestions

    def check_for_proactive_items(self, ctx: ProjectContext) -> List[str]:
        """Check if there's anything we should proactively mention.

        ENHANCED: Now uses ConfidenceScorer to filter suggestions.
        Only surfaces suggestions that meet confidence threshold.

        ENHANCED v2: Uses calendar context for timing decisions.

        ENHANCED v3: Uses PredictiveIntentEngine for mind-reading predictions.
        """
        # Build calendar timing context for TimingIntelligence
        calendar_timing_ctx = {
            "is_in_meeting": ctx.is_in_meeting,
            "next_meeting_in_minutes": ctx.next_meeting_in_minutes,
            "focus_time_minutes": ctx.focus_time_minutes,
            "calendar_connected": ctx.calendar_connected,
        }

        # First, check if this is a good time to suggest (TimingIntelligence with calendar awareness)
        if not self.timing_intelligence.is_good_time_to_suggest(calendar_timing_ctx):
            log("TimingIntelligence: Not a good time to suggest (calendar aware)", "DEBUG")
            return []

        # Gather all potential suggestions
        potential = self._gather_potential_suggestions(ctx)

        # ═══════════════════════════════════════════════════════════════
        # PREDICTIVE INTENT SUGGESTIONS (SOTA 2026)
        # Get "mind-reading" suggestions from the PredictiveIntentEngine
        # ═══════════════════════════════════════════════════════════════
        if self.predictive_intent:
            try:
                # Get predictions and convert to proactive suggestions
                predictions = self.predictive_intent.predict_next_actions(limit=3)
                suggestions = self.predictive_intent.generate_proactive_suggestions(predictions, limit=2)

                for sug in suggestions:
                    # Only include high-confidence predictions
                    if sug.prediction.confidence >= 0.65:
                        potential.append({
                            "type": f"predicted_{sug.prediction.action_type}",
                            "message": sug.message,
                            "priority": "normal" if sug.prediction.confidence < 0.80 else "high",
                            "context": {
                                "data_completeness": 0.7,
                                "novelty_score": 0.4,
                                "base_confidence": sug.prediction.confidence
                            },
                            "_predictive": True  # Flag for tracking
                        })
                        log(f"PredictiveIntent: Added suggestion '{sug.prediction.action_type}' ({int(sug.prediction.confidence*100)}%)")
            except Exception as e:
                log(f"PredictiveIntent: Error getting suggestions: {e}", "WARN")

        # Filter through confidence scoring
        items = []
        for suggestion in potential:
            should_show, confidence, action_level = self.confidence_scorer.should_suggest(
                suggestion["type"],
                suggestion.get("context", {})
            )

            if should_show:
                # Add confidence indicator for lower-confidence items
                if action_level == ConfidenceScorer.LEVEL_AUTO:
                    msg = suggestion["message"]
                elif action_level == ConfidenceScorer.LEVEL_APPROVE:
                    msg = suggestion["message"]
                elif action_level == ConfidenceScorer.LEVEL_CLARIFY:
                    msg = f"{suggestion['message']} (confidence: {int(confidence*100)}%)"
                else:
                    # Collaborative mode - add caveat
                    msg = f"{suggestion['message']} (suggested, verify?)"

                items.append(msg)

                # Track that we showed this suggestion type
                if suggestion["type"] == "milestone_reached":
                    self.last_suggestions["launch_pct"] = ctx.launch_progress_pct

                log(f"ProactiveEngine: Showing '{suggestion['type']}' (confidence: {confidence:.2f}, level: {action_level})")

        return items

    def should_send_proactive_message(self, ctx: ProjectContext) -> Tuple[bool, Optional[str]]:
        """Determine if we should send an unsolicited proactive message.

        ENHANCED: Uses TimingIntelligence with calendar awareness.
        """
        # Build calendar timing context
        calendar_timing_ctx = {
            "is_in_meeting": ctx.is_in_meeting,
            "next_meeting_in_minutes": ctx.next_meeting_in_minutes,
            "focus_time_minutes": ctx.focus_time_minutes,
            "calendar_connected": ctx.calendar_connected,
        }

        # Check timing first (with calendar awareness)
        if not self.timing_intelligence.is_good_time_to_suggest(calendar_timing_ctx):
            next_window = self.timing_intelligence.get_next_good_window()
            log(f"ProactiveEngine: Not good time to suggest. Next window in {next_window['estimated_seconds']}s")
            return False, None

        items = self.check_for_proactive_items(ctx)

        # Only send if there are important items
        # Lowered threshold from 2 to 1 since we now have confidence filtering
        if items and len(items) >= 1:
            return True, "\n".join(items)

        return False, None

    def record_suggestion_outcome(self, suggestion_type: str, was_helpful: bool):
        """Record whether a suggestion was helpful for learning.

        Call this after user interacts with suggestion.
        Also updates PredictiveIntentEngine for continuous learning.
        """
        self.confidence_scorer.record_outcome(suggestion_type, was_helpful)
        self.timing_intelligence.record_timing_outcome(was_helpful, {"suggestion_type": suggestion_type})

        # Also record to predictive intent engine if it's a predicted suggestion
        if self.predictive_intent and suggestion_type.startswith("predicted_"):
            action_type = suggestion_type.replace("predicted_", "")
            self.predictive_intent.intent_engine.record_prediction_outcome(action_type, was_helpful)
            log(f"PredictiveIntent: Recorded outcome for '{action_type}': {'correct' if was_helpful else 'incorrect'}")

        log(f"ProactiveEngine: Recorded outcome for '{suggestion_type}': {'helpful' if was_helpful else 'not helpful'}")

    def record_user_action(self, action_type: str, context: Dict = None, metadata: Dict = None):
        """Record a user action for pattern learning.

        Call this when user performs any significant action to train
        the PredictiveIntentEngine.

        Args:
            action_type: Type of action (e.g., "create_task", "check_calendar")
            context: Optional context dict (e.g., {"email_from": "john@example.com"})
            metadata: Optional metadata dict
        """
        if self.predictive_intent:
            try:
                self.predictive_intent.record_action_simple(
                    action_type,
                    context=context,
                    metadata=metadata
                )
                log(f"PredictiveIntent: Recorded action '{action_type}'")
            except Exception as e:
                log(f"PredictiveIntent: Error recording action: {e}", "WARN")

# ═══════════════════════════════════════════════════════════════════════════════════════
# ALERT CONSOLIDATOR
# ═══════════════════════════════════════════════════════════════════════════════════════

class AlertConsolidator:
    """
    Batches multiple notifications into digestible summaries.

    Research shows:
    - 59% of leaders say too many alerts cause inefficiency
    - 62% of alerts are entirely ignored
    - Instead of 10 individual alerts, we create 1 narrative summary

    Alert types:
    - task_due: Tasks due today
    - task_overdue: Tasks past deadline
    - builder_update: Builder completed/status changes
    - question_pending: Agent has a question for user
    - calendar_event: Upcoming meeting/event
    """

    # Alert type display names for narrative generation
    ALERT_LABELS = {
        "task_due": "due today",
        "task_overdue": "overdue",
        "builder_update": "builder update",
        "question_pending": "question waiting",
        "calendar_event": "calendar event"
    }

    # Priority weights for sorting
    PRIORITY_WEIGHTS = {
        "critical": 4,
        "high": 3,
        "normal": 2,
        "low": 1
    }

    # Minimum alerts before consolidation triggers
    CONSOLIDATION_THRESHOLD = 2

    def __init__(self):
        self.alert_queue: List[Dict[str, Any]] = []
        self.last_consolidation: Optional[str] = None

    def add_alert(self, alert_type: str, content: str, priority: str = "normal") -> None:
        """
        Queue an alert for consolidation.

        Args:
            alert_type: One of task_due, task_overdue, builder_update,
                       question_pending, calendar_event
            content: The alert message content
            priority: One of critical, high, normal, low
        """
        if alert_type not in self.ALERT_LABELS:
            log(f"Unknown alert type: {alert_type}, treating as normal", "WARN")

        if priority not in self.PRIORITY_WEIGHTS:
            priority = "normal"

        self.alert_queue.append({
            "type": alert_type,
            "content": content,
            "priority": priority,
            "timestamp": datetime.now().isoformat(),
            "weight": self.PRIORITY_WEIGHTS.get(priority, 2)
        })

    def should_consolidate(self) -> bool:
        """
        Check if we have enough alerts to warrant consolidation.

        Returns:
            True if queue has enough alerts to consolidate
        """
        return len(self.alert_queue) >= self.CONSOLIDATION_THRESHOLD

    def consolidate(self) -> str:
        """
        Turn queued alerts into a single narrative summary.

        Returns:
            Consolidated narrative string
        """
        if not self.alert_queue:
            return ""

        # Sort by priority (highest first)
        sorted_alerts = sorted(
            self.alert_queue,
            key=lambda x: x["weight"],
            reverse=True
        )

        # Group by type
        grouped: Dict[str, List[Dict]] = defaultdict(list)
        for alert in sorted_alerts:
            grouped[alert["type"]].append(alert)

        # Build narrative sections
        narrative_parts = []
        quick_actions = []

        # Task summary section
        task_items = []

        # Handle task_due alerts
        if "task_due" in grouped:
            due_alerts = grouped["task_due"]
            count = len(due_alerts)
            if count == 1:
                task_items.append(f"1 task due today: {due_alerts[0]['content']}")
            else:
                task_items.append(f"{count} tasks due today")
            quick_actions.append("View Tasks")

        # Handle task_overdue alerts
        if "task_overdue" in grouped:
            overdue_alerts = grouped["task_overdue"]
            count = len(overdue_alerts)
            if count == 1:
                task_items.append(f"1 task overdue: {overdue_alerts[0]['content']}")
            else:
                task_items.append(f"{count} tasks overdue")
            if "View Tasks" not in quick_actions:
                quick_actions.append("View Tasks")

        # Combine task items as priority items
        if task_items:
            total_priority = len(grouped.get("task_due", [])) + len(grouped.get("task_overdue", []))
            narrative_parts.append(f"- {total_priority} priority item{'s' if total_priority != 1 else ''} need attention")

        # Handle builder_update alerts
        if "builder_update" in grouped:
            builder_alerts = grouped["builder_update"]
            # Get the most recent/important update
            latest = builder_alerts[0]
            narrative_parts.append(f"- Builder: {latest['content']}")

        # Handle question_pending alerts
        if "question_pending" in grouped:
            question_alerts = grouped["question_pending"]
            count = len(question_alerts)
            if count == 1:
                # Include who has the question if available
                content = question_alerts[0]['content']
                narrative_parts.append(f"- {content}")
            else:
                narrative_parts.append(f"- {count} agent questions waiting for your input")
            quick_actions.append("Answer Question")

        # Handle calendar_event alerts
        if "calendar_event" in grouped:
            calendar_alerts = grouped["calendar_event"]
            # Show most urgent calendar event
            latest = calendar_alerts[0]
            narrative_parts.append(f"- Calendar: {latest['content']}")
            quick_actions.append("View Calendar")

        # Build final narrative
        output_lines = ["Morning Focus:"]
        output_lines.extend(narrative_parts)

        if quick_actions:
            actions_str = " ".join(f"[{action}]" for action in quick_actions)
            output_lines.append("")
            output_lines.append(f"Quick Actions: {actions_str}")

        self.last_consolidation = datetime.now().isoformat()

        return "\n".join(output_lines)

    def get_consolidated_summary(self) -> str:
        """
        Return the batched summary without clearing the queue.
        Useful for preview/display purposes.

        Returns:
            Consolidated summary string
        """
        return self.consolidate()

    def clear(self) -> None:
        """Clear the queue after delivery."""
        self.alert_queue = []

    def get_queue_size(self) -> int:
        """Return current queue size."""
        return len(self.alert_queue)

    def get_alerts_by_type(self, alert_type: str) -> List[Dict]:
        """Get all alerts of a specific type."""
        return [a for a in self.alert_queue if a["type"] == alert_type]

    def get_high_priority_count(self) -> int:
        """Count alerts with high or critical priority."""
        return len([a for a in self.alert_queue if a["priority"] in ("high", "critical")])

# ═══════════════════════════════════════════════════════════════════════════════════════
# CLAUDE INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════════════

class ClaudeInterface:
    """Interface to Claude - supports both API and CLI."""

    def __init__(self):
        self._api_client = None

    def _get_api_client(self):
        """Get Anthropic API client."""
        if self._api_client:
            return self._api_client
        if not ANTHROPIC_API_KEY:
            return None
        try:
            import anthropic
            self._api_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
            return self._api_client
        except ImportError:
            log("anthropic package not installed", "WARN")
            return None

    def call_api(self, system_prompt: str, messages: List[Dict]) -> Tuple[str, bool]:
        """Call Claude via API."""
        client = self._get_api_client()
        if not client:
            return "API not available", False

        try:
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                system=system_prompt,
                messages=messages
            )
            text = response.content[0].text if response.content else ""
            return text, True
        except Exception as e:
            log(f"API error: {e}", "ERROR")
            return str(e), False

    def call_cli(self, prompt: str) -> Tuple[str, bool]:
        """Call Claude via CLI for full power."""
        if not CLAUDE_BIN.exists():
            return "CLI not found", False

        try:
            result = subprocess.run(
                [str(CLAUDE_BIN), "-p", "--output-format", "text"],
                input=prompt,
                capture_output=True,
                text=True,
                timeout=CLAUDE_TIMEOUT,
                cwd=str(PROJECT_ROOT),
                env={**os.environ, "NO_COLOR": "1"}
            )

            if result.returncode == 0:
                response = result.stdout.strip()
                response = re.sub(r'\x1b\[[0-9;]*m', '', response)
                return response, True
            else:
                return result.stderr or "Unknown error", False

        except subprocess.TimeoutExpired:
            return "Timeout", False
        except Exception as e:
            return str(e), False

# ═══════════════════════════════════════════════════════════════════════════════════════
# RESPONSE GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════════════

class ResponseGenerator:
    """Generates intelligent PM responses.

    ENHANCED with:
    - Confidence-aware proactive suggestions
    - TimingIntelligence integration for optimal intervention
    - Calendar and Email context integration (NEW)
    """

    def __init__(self, claude: ClaudeInterface, memory: MemoryManager):
        self.claude = claude
        self.memory = memory
        self.confidence_scorer = get_confidence_scorer()
        self.timing_intelligence = get_timing_intelligence()
        self.integrated_context = get_integrated_context()

    def build_system_prompt(self, ctx: ProjectContext, proactive_items: List[str], confidence_info: Optional[Dict] = None) -> str:
        """Build the intelligent system prompt.

        Args:
            ctx: Project context
            proactive_items: List of proactive suggestions to mention
            confidence_info: Optional dict with confidence scoring info for suggestions

        ENHANCED: Uses IntegratedContextGatherer for comprehensive context.
        """
        memory_context = self.memory.get_context_for_prompt()

        # Use integrated context for richer formatting (includes calendar + email)
        project_context = self.integrated_context.format_for_claude_prompt()

        proactive_section = ""
        if proactive_items:
            proactive_section = "\n\nPROACTIVE ITEMS TO MENTION:\n" + "\n".join(f"- {i}" for i in proactive_items)

        # Add confidence guidance if available
        confidence_section = ""
        if confidence_info:
            confidence_section = f"""

═══════════════════════════════════════════════════════════════
CONFIDENCE GUIDANCE
═══════════════════════════════════════════════════════════════
When making suggestions, calibrate your language based on confidence:
- High confidence (>85%): Be direct and actionable
- Medium confidence (70-85%): Suggest but invite input
- Lower confidence (50-70%): Frame as collaborative exploration
- Current suggestion confidence: {confidence_info.get('overall_confidence', 'N/A')}
"""

        # Add calendar/email awareness guidance
        calendar_email_guidance = ""
        if ctx.calendar_connected or ctx.email_connected:
            calendar_email_guidance = """

═══════════════════════════════════════════════════════════════
CALENDAR & EMAIL AWARENESS
═══════════════════════════════════════════════════════════════
You now have visibility into the user's calendar and email. Use this to:
- Respect meeting times (don't suggest tasks right before meetings)
- Suggest good times for deep work based on calendar gaps
- Prioritize urgent emails that need attention
- Remind about meeting prep when needed
- Consider email action items when suggesting next steps
Be aware but not overwhelming - mention these naturally in context.
"""

        return f"""You are the PM (Project Manager) for TinyPM and Tiny Seed Farm OS.

═══════════════════════════════════════════════════════════════
CORE DIRECTIVES - FOLLOW THESE EXACTLY
═══════════════════════════════════════════════════════════════

1. BE PROACTIVE: Don't just answer questions - suggest next actions, flag issues, anticipate needs.

2. BE SPECIFIC: Use actual numbers, names, and data from the context below. Never be vague.

3. BE CONCISE: Keep responses under 150 words unless detail is explicitly requested.

4. BE SMART: If something important is in the proactive items, mention it.

5. COORDINATE: You manage Builder (coding agent) and research agents. If something needs building, acknowledge it and queue it for Builder.

6. REMEMBER: Reference past conversations when relevant. Learn from interactions.

═══════════════════════════════════════════════════════════════
CURRENT PROJECT STATE
═══════════════════════════════════════════════════════════════
{project_context}

═══════════════════════════════════════════════════════════════
MEMORY & LEARNED FACTS
═══════════════════════════════════════════════════════════════
{memory_context}
{proactive_section}{confidence_section}{calendar_email_guidance}

═══════════════════════════════════════════════════════════════
RESPONSE FORMAT
═══════════════════════════════════════════════════════════════
- Start with the key point or answer
- Use bullet points for multiple items
- End with a clear next action or question when appropriate
- If agent questions are waiting, remind the user
- If Builder completed something, celebrate briefly and move on
- Be direct, not flowery. You're a trusted partner, not a servant."""

    def generate(self, user_message: str, conversation_history: List[Dict], ctx: ProjectContext) -> str:
        """Generate an intelligent response.

        ENHANCED: Now uses ConfidenceScorer and TimingIntelligence for
        calibrated suggestions.
        """
        # Get proactive items (these are now confidence-filtered)
        proactive = ProactiveEngine(self.memory)
        proactive_items = proactive.check_for_proactive_items(ctx)

        # Calculate overall confidence for the suggestions we're about to make
        confidence_info = None
        if proactive_items:
            # Get confidence stats for context
            stats = self.confidence_scorer.get_confidence_stats()
            confidence_info = {
                "overall_confidence": f"{int(stats.get('overall_acceptance_rate', 0.7) * 100)}%",
                "suggestion_count": len(proactive_items),
                "is_task_boundary": self.timing_intelligence.detect_task_boundary()
            }

        # Build prompt with confidence guidance
        system_prompt = self.build_system_prompt(ctx, proactive_items, confidence_info)

        # Format messages for API
        messages = []
        for msg in conversation_history[-8:]:
            role = "user" if msg.get("from") == "user" else "assistant"
            messages.append({"role": role, "content": msg["message"]})
        messages.append({"role": "user", "content": user_message})

        # Call Claude
        response, success = self.claude.call_api(system_prompt, messages)

        if success:
            # Learn from this interaction
            self.memory.learn_from_message(user_message, response)

            # Record user action for timing intelligence
            self.timing_intelligence.record_user_action("message", {"message_length": len(user_message)})

            return response
        else:
            return f"I received your message but encountered an error: {response}. Please try again."

# ═══════════════════════════════════════════════════════════════════════════════════════
# CHANNEL MANAGER
# ═══════════════════════════════════════════════════════════════════════════════════════

class ChannelManager:
    """Manages all communication channels."""

    def __init__(self):
        self.last_chat_id = 0
        self.last_builder_id = 0

    def get_new_dashboard_messages(self) -> List[Dict]:
        """Get new messages from dashboard."""
        chat = safe_read_json(PM_CHAT_FILE, {"messages": [], "next_id": 1})
        messages = chat.get("messages", [])

        new_msgs = [
            m for m in messages
            if m["id"] > self.last_chat_id
            and m.get("from") == "user"
            and not m.get("auto_responded")
        ]

        return new_msgs

    def get_new_builder_messages(self) -> List[Dict]:
        """Get new messages from Builder."""
        intercom = safe_read_json(INTERCOM_FILE, {})
        builder_msgs = intercom.get("builder_to_pm", [])

        new_msgs = [m for m in builder_msgs if m["id"] > self.last_builder_id and not m.get("read")]
        return new_msgs

    def send_dashboard_response(self, response: str, original_id: int):
        """Send response to dashboard."""
        chat = safe_read_json(PM_CHAT_FILE, {"messages": [], "next_id": 1})

        msg_id = chat.get("next_id", 1)
        chat["messages"].append({
            "id": msg_id,
            "from": "pm",
            "message": response,
            "timestamp": datetime.now().isoformat(),
            "read_by_user": False,
            "auto_generated": True,
            "generator": "pm_orchestrator"
        })
        chat["next_id"] = msg_id + 1

        # Mark original as responded
        for m in chat["messages"]:
            if m["id"] == original_id:
                m["auto_responded"] = True

        safe_write_json(PM_CHAT_FILE, chat)
        self.last_chat_id = original_id
        log(f"Response sent (msg #{msg_id})")

    def send_to_builder(self, task: str, priority: str = "normal"):
        """Send task to Builder."""
        intercom = safe_read_json(INTERCOM_FILE, {"pm_to_builder": [], "builder_to_pm": [], "next_id": 1})

        msg_id = intercom.get("next_id", 1)
        intercom["pm_to_builder"].append({
            "id": msg_id,
            "type": "task",
            "message": task,
            "priority": priority,
            "timestamp": datetime.now().isoformat(),
            "status": "pending",
            "read": False
        })
        intercom["next_id"] = msg_id + 1

        safe_write_json(INTERCOM_FILE, intercom)
        log(f"Task sent to Builder (#{msg_id})")

    def mark_builder_messages_read(self, msg_ids: List[int]):
        """Mark Builder messages as read."""
        intercom = safe_read_json(INTERCOM_FILE, {})
        for msg in intercom.get("builder_to_pm", []):
            if msg["id"] in msg_ids:
                msg["read"] = True
                self.last_builder_id = max(self.last_builder_id, msg["id"])
        safe_write_json(INTERCOM_FILE, intercom)

    def get_conversation_history(self) -> List[Dict]:
        """Get recent conversation history."""
        chat = safe_read_json(PM_CHAT_FILE, {"messages": []})
        return chat.get("messages", [])[-12:]

# ═══════════════════════════════════════════════════════════════════════════════════════
# ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════════════════════

class PMOrchestrator:
    """The main orchestrator - coordinates everything.

    ENHANCED with:
    - AlertConsolidator: Batch notifications into digestible summaries
    - Intelligence integration: Uses ConfidenceScorer and TimingIntelligence via ProactiveEngine
    """

    def __init__(self, use_langgraph: bool = False):
        self.state = self._load_state()
        self.memory = MemoryManager()
        self.claude = ClaudeInterface()
        self.channels = ChannelManager()
        self.response_gen = ResponseGenerator(self.claude, self.memory)
        self.proactive = ProactiveEngine(self.memory)
        self.alert_consolidator = AlertConsolidator()  # NEW: Batch notifications
        self.running = False
        self._last_consolidated_alert_time: Optional[str] = None

        # LangGraph integration for durable execution (SOTA 2026)
        self.use_langgraph = use_langgraph and LANGGRAPH_AVAILABLE
        self.langgraph: Optional['TinyPMGraph'] = None
        if self.use_langgraph:
            try:
                self.langgraph = TinyPMGraph()
                log("LangGraph durable execution mode ENABLED")
            except Exception as e:
                log(f"Failed to initialize LangGraph: {e}", "ERROR")
                self.use_langgraph = False

        # Skills System integration (SOTA 2026)
        self.skills_api = get_skills_api_instance() if SKILLS_SYSTEM_AVAILABLE else None
        if self.skills_api:
            log("Skills System integration ENABLED")

    def _load_state(self) -> OrchestratorState:
        """Load orchestrator state."""
        data = safe_read_json(ORCHESTRATOR_STATE_FILE, {})
        import uuid
        return OrchestratorState(
            session_id=data.get("session_id", str(uuid.uuid4())),
            started_at=data.get("started_at", datetime.now().isoformat()),
            last_heartbeat=data.get("last_heartbeat", ""),
            messages_processed=data.get("messages_processed", 0),
            proactive_suggestions=data.get("proactive_suggestions", 0),
            errors=data.get("errors", 0),
            builder_last_seen=data.get("builder_last_seen", ""),
            last_processed_msg_id=data.get("last_processed_msg_id", 0),
            mode=data.get("mode", "active")
        )

    def _save_state(self):
        """Save orchestrator state."""
        safe_write_json(ORCHESTRATOR_STATE_FILE, asdict(self.state))

    def try_skill_execution(self, user_message: str) -> Optional[str]:
        """
        Try to route the message to a skill and execute it.

        Returns the skill result as a formatted string, or None if no skill matched.
        This enables intent-to-skill routing for the PM.
        """
        if not self.skills_api:
            return None

        try:
            # Parse intent to find matching skills
            intent_result = self.skills_api.parse_intent(user_message)
            if not intent_result.get("success") or intent_result.get("match_count", 0) == 0:
                return None

            # Get the best match (highest confidence)
            best_match = intent_result["matches"][0]
            confidence = best_match.get("confidence", 0)

            # Only execute if confidence is high enough (> 0.6)
            if confidence < 0.6:
                log(f"Skill match '{best_match['skill_name']}' confidence too low ({confidence:.2f})")
                return None

            skill_name = best_match["skill_name"]
            parameters = best_match.get("parameters", {})

            log(f"Executing skill '{skill_name}' with confidence {confidence:.2f}")

            # Execute the skill
            result = self.skills_api.execute_skill(skill_name, parameters)

            if result.get("requires_approval"):
                return f"This action requires approval. Approval ID: {result.get('approval_request_id')}"

            if not result.get("success"):
                return None  # Skill failed, fall back to normal processing

            # Format the skill result for the response
            data = result.get("data", {})
            return self._format_skill_result(skill_name, data)

        except Exception as e:
            log(f"Skill execution error: {e}", "WARN")
            return None

    def _format_skill_result(self, skill_name: str, data: Dict) -> Optional[str]:
        """Format skill execution result for inclusion in PM response."""
        if skill_name == "list_tasks":
            tasks = data.get("tasks", [])
            if not tasks:
                return "No tasks found matching those criteria."
            lines = [f"Found {data.get('count', len(tasks))} tasks:"]
            for t in tasks[:5]:
                lines.append(f"  - [{t.get('status')}] {t.get('id')}: {t.get('title')}")
            if data.get('count', 0) > 5:
                lines.append(f"  ... and {data.get('count') - 5} more")
            return "\n".join(lines)

        elif skill_name == "get_task_summary":
            return (
                f"Project Summary:\n"
                f"  - Total tasks: {data.get('total_tasks', 0)}\n"
                f"  - Completion: {data.get('completion_percentage', 0)}%\n"
                f"  - By status: {data.get('by_status', {})}"
            )

        elif skill_name in ["get_upcoming_events", "get_events_today"]:
            events = data.get("events", [])
            if not events:
                return "No events found."
            lines = [f"Found {data.get('count', len(events))} events:"]
            for e in events[:5]:
                lines.append(f"  - {e.get('title')} at {e.get('start_formatted', e.get('start'))}")
            return "\n".join(lines)

        # Generic formatting for other skills
        if isinstance(data, dict):
            return f"Skill '{skill_name}' result: {json.dumps(data, indent=2, default=str)[:500]}"
        return str(data)[:500]

    def process_dashboard_message(self, msg: Dict):
        """Process a message from the dashboard.

        If LangGraph is enabled, uses the durable execution graph with checkpointing.
        Otherwise, uses the traditional response generation pipeline.
        Now enhanced with Skills System routing for direct skill execution.
        """
        user_message = msg["message"]
        msg_id = msg["id"]

        log(f"Processing #{msg_id}: {user_message[:50]}...")

        # NEW: Try skill execution first (intent-to-skill routing)
        skill_result = self.try_skill_execution(user_message)
        if skill_result:
            # Skill handled the request, send the result
            self.channels.send_dashboard_response(skill_result, msg_id)
            self.state.messages_processed += 1
            self.state.last_processed_msg_id = msg_id
            self._save_state()
            return

        # Analyze for routing
        routing = SmartRouter.analyze(user_message)

        # Use LangGraph if enabled - provides durable execution with checkpointing
        if self.use_langgraph and self.langgraph:
            log("Using LangGraph durable execution mode")
            result = self.langgraph.process_message(user_message)
            response = result.get("response", "Error: No response from LangGraph")

            # Log LangGraph execution details
            log(f"LangGraph: intent={result.get('intent')} conf={result.get('confidence', 0):.0%} duration={result.get('duration_ms', 0)}ms")

            if result.get("errors"):
                for err in result["errors"]:
                    log(f"LangGraph error: {err.get('error', 'Unknown')}", "WARN")
        else:
            # Traditional response generation
            # Gather context
            ctx = ContextGatherer.gather()

            # Get conversation history
            history = self.channels.get_conversation_history()

            # Generate response
            response = self.response_gen.generate(user_message, history, ctx)

        # Send response
        self.channels.send_dashboard_response(response, msg_id)

        # If should delegate to Builder, do that too
        if routing["should_delegate"] and routing["delegate_to"] == "builder":
            self.channels.send_to_builder(
                f"User request: {user_message}\n\nPM acknowledged. Please implement.",
                "high"
            )
            log("Also delegated to Builder")

        # Update state
        self.state.messages_processed += 1
        self.state.last_processed_msg_id = msg_id
        self._save_state()

    def process_builder_messages(self, messages: List[Dict]):
        """Process messages from Builder."""
        for msg in messages:
            msg_type = msg.get("type", "update")
            content = msg.get("message", "")

            log(f"Builder [{msg_type}]: {content[:50]}...")

            # If Builder completed something, we might want to notify dashboard
            if msg_type == "done":
                self.state.builder_last_seen = datetime.now().isoformat()

        # Mark as read
        self.channels.mark_builder_messages_read([m["id"] for m in messages])

    def heartbeat(self):
        """Periodic heartbeat - check system health."""
        self.state.last_heartbeat = datetime.now().isoformat()
        self._save_state()

    def _gather_and_consolidate_notifications(self, ctx: ProjectContext) -> Optional[str]:
        """Gather pending notifications and consolidate them using AlertConsolidator.

        This batches multiple alerts into a single digestible summary instead of
        sending 10 individual notifications.

        Returns:
            Consolidated alert summary string, or None if nothing to report
        """
        # Clear previous alerts
        self.alert_consolidator.clear()

        # Gather tasks due today (would connect to actual deadline data)
        board = safe_read_json(BOARD_FILE, {"tasks": []})
        tasks = board.get("tasks", [])

        for task in tasks:
            # Check for overdue tasks
            if task.get("status") == "in_progress":
                deadline = task.get("deadline")
                if deadline:
                    try:
                        deadline_dt = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
                        if deadline_dt < datetime.now():
                            self.alert_consolidator.add_alert(
                                "task_overdue",
                                task.get("title", "Untitled")[:50],
                                "high"
                            )
                    except (ValueError, TypeError):
                        pass

        # Check for agent questions
        if ctx.agent_questions_waiting > 0:
            self.alert_consolidator.add_alert(
                "question_pending",
                f"{ctx.agent_questions_waiting} agent question(s) need your input",
                "high" if ctx.agent_questions_waiting > 2 else "normal"
            )

        # Check builder status
        if ctx.builder_status == "done" and ctx.builder_queue_size > 0:
            self.alert_consolidator.add_alert(
                "builder_update",
                f"Builder finished, {ctx.builder_queue_size} tasks in queue",
                "normal"
            )

        # Only consolidate if we have enough alerts
        if self.alert_consolidator.should_consolidate():
            summary = self.alert_consolidator.consolidate()
            self.alert_consolidator.clear()
            return summary

        return None

    def send_consolidated_alert_if_needed(self):
        """Check if we should send a consolidated alert to the user.

        Uses AlertConsolidator to batch notifications and TimingIntelligence
        (via ProactiveEngine) to determine if it's a good time.
        """
        # Don't send alerts too frequently
        if self._last_consolidated_alert_time:
            try:
                last_time = datetime.fromisoformat(self._last_consolidated_alert_time)
                if (datetime.now() - last_time).total_seconds() < 300:  # 5 min cooldown
                    return
            except (ValueError, TypeError):
                pass

        # Gather context
        ctx = ContextGatherer.gather()

        # Check timing via proactive engine
        should_send, _ = self.proactive.should_send_proactive_message(ctx)
        if not should_send:
            return

        # Get consolidated summary
        summary = self._gather_and_consolidate_notifications(ctx)
        if summary:
            # Send to dashboard as a system message
            chat = safe_read_json(PM_CHAT_FILE, {"messages": [], "next_id": 1})
            msg_id = chat.get("next_id", 1)
            chat["messages"].append({
                "id": msg_id,
                "from": "pm",
                "message": summary,
                "timestamp": datetime.now().isoformat(),
                "read_by_user": False,
                "auto_generated": True,
                "generator": "pm_orchestrator_consolidated_alert",
                "is_alert": True
            })
            chat["next_id"] = msg_id + 1
            safe_write_json(PM_CHAT_FILE, chat)

            self._last_consolidated_alert_time = datetime.now().isoformat()
            self.state.proactive_suggestions += 1
            self._save_state()
            log(f"Sent consolidated alert (msg #{msg_id})")

    def run_cycle(self):
        """Run one cycle of the orchestrator."""
        # Check for dashboard messages
        new_dashboard = self.channels.get_new_dashboard_messages()
        for msg in new_dashboard:
            try:
                self.process_dashboard_message(msg)
            except Exception as e:
                log(f"Error processing message: {e}", "ERROR")
                traceback.print_exc()
                self.state.errors += 1

        # Check for Builder messages
        new_builder = self.channels.get_new_builder_messages()
        if new_builder:
            self.process_builder_messages(new_builder)

        # Check if we should send consolidated alerts (uses AlertConsolidator + TimingIntelligence)
        try:
            self.send_consolidated_alert_if_needed()
        except Exception as e:
            log(f"Error in consolidated alert: {e}", "WARN")

    def run(self):
        """Main run loop."""
        log("═" * 60)
        log("PM ORCHESTRATOR STARTING")
        log("═" * 60)
        log(f"Session: {self.state.session_id[:8]}...")
        log(f"Watch interval: {WATCH_INTERVAL}s")
        log(f"Chat file: {PM_CHAT_FILE}")
        log("Press Ctrl+C to stop")
        log("═" * 60)

        self.running = True
        self.state.started_at = datetime.now().isoformat()
        self._save_state()

        last_heartbeat = time.time()

        try:
            while self.running:
                # Run main cycle
                self.run_cycle()

                # Heartbeat
                if time.time() - last_heartbeat > HEARTBEAT_INTERVAL:
                    self.heartbeat()
                    last_heartbeat = time.time()

                time.sleep(WATCH_INTERVAL)

        except KeyboardInterrupt:
            log("Shutting down...")

        self._save_state()
        log(f"Session complete. Processed {self.state.messages_processed} messages, {self.state.errors} errors.")

    def status(self):
        """Print current status including intelligence metrics."""
        ctx = ContextGatherer.gather()

        # Get intelligence stats
        confidence_scorer = get_confidence_scorer()
        timing_intel = get_timing_intelligence()
        confidence_stats = confidence_scorer.get_confidence_stats()
        timing_stats = timing_intel.get_timing_stats()

        # Predictive Intent stats
        predictive_stats = None
        if self.proactive.predictive_intent:
            try:
                predictive_stats = self.proactive.predictive_intent.get_stats()
            except:
                pass

        # Calendar status
        calendar_status = "Not available"
        if CALENDAR_AVAILABLE:
            if ctx.calendar_connected:
                calendar_status = f"Connected ({ctx.events_today_count} events today)"
            else:
                calendar_status = "Not connected"

        # Email status
        email_status = "Not available"
        if EMAIL_AVAILABLE:
            if ctx.email_connected:
                email_status = f"Connected ({ctx.unread_email_count} unread)"
            else:
                email_status = "Not connected"

        # Predictive intent status
        predictive_status = "Not available"
        if PREDICTIVE_INTENT_AVAILABLE:
            if predictive_stats:
                pm = predictive_stats.get("pattern_mining", {})
                pa = predictive_stats.get("prediction_accuracy", {})
                predictive_status = f"Active (patterns: {pm.get('total_actions', 0)}, accuracy: {int(pa.get('overall_accuracy', 0)*100)}%)"
            else:
                predictive_status = "Available but not initialized"

        print(f"""
═══════════════════════════════════════════════════════════════
  PM ORCHESTRATOR STATUS
═══════════════════════════════════════════════════════════════
  Session:           {self.state.session_id[:8]}...
  Mode:              {self.state.mode}
  Started:           {self.state.started_at}
  Last Heartbeat:    {self.state.last_heartbeat or 'Never'}
  Messages:          {self.state.messages_processed}
  Proactive Alerts:  {self.state.proactive_suggestions}
  Errors:            {self.state.errors}

  PROJECT STATE:
    Tasks:           {ctx.tasks_pending} pending, {ctx.tasks_in_progress} in progress
    Builder:         {ctx.builder_status} (queue: {ctx.builder_queue_size})
    Agent Questions: {ctx.agent_questions_waiting} waiting
    Launch:          {ctx.launch_progress_pct}%

  INTEGRATIONS:
    Calendar:        {calendar_status}
    Email:           {email_status}
    Predictive AI:   {predictive_status}

  CALENDAR CONTEXT:
    In meeting:      {ctx.is_in_meeting}
    Next meeting:    {ctx.next_meeting_title or 'None'} {f'in {ctx.next_meeting_in_minutes} min' if ctx.next_meeting_in_minutes else ''}
    Focus time:      {ctx.focus_time_minutes} minutes available
    Prep needed:     {ctx.prep_time_needed}
    Busy day:        {ctx.busy_day}

  EMAIL CONTEXT:
    Unread:          {ctx.unread_email_count}
    Urgent:          {ctx.urgent_email_count}
    Need response:   {ctx.emails_needing_response}
    Action items:    {len(ctx.email_action_items)}

  MEMORY:
    User Facts:      {len(self.memory.memory.user_facts)}
    Followups:       {len(self.memory.memory.pending_followups)}
    Interactions:    {len(self.memory.memory.last_interactions)}

  INTELLIGENCE (SOTA):
    Confidence Scorer:
      Types tracked:       {confidence_stats.get('types_tracked', 0)}
      Total outcomes:      {confidence_stats.get('total_outcomes', 0)}
      Acceptance rate:     {int(confidence_stats.get('overall_acceptance_rate', 0) * 100)}%

    Timing Intelligence:
      Total suggestions:   {timing_stats.get('total_suggestions', 0)}
      Engagement rate:     {int(timing_stats.get('engagement_rate', 0) * 100)}%
      Task boundary rate:  {int(timing_stats.get('task_boundary_engagement', 0) * 100)}%
      Deep work rate:      {int(timing_stats.get('deep_work_engagement', 0) * 100)}%

    Alert Consolidator:
      Queued alerts:       {self.alert_consolidator.get_queue_size()}
      High priority:       {self.alert_consolidator.get_high_priority_count()}""")

        # Add predictive intent section if available
        if predictive_stats:
            pm = predictive_stats.get("pattern_mining", {})
            pa = predictive_stats.get("prediction_accuracy", {})
            print(f"""
    PREDICTIVE INTENT (MIND-READING):
      Pattern Mining:
        Total actions:       {pm.get('total_actions', 0)}
        Time patterns:       {pm.get('time_slots_with_patterns', 0)}
        Sequence patterns:   {pm.get('sequence_patterns', 0)}
        Trigger patterns:    {pm.get('trigger_patterns', 0)}

      Prediction Accuracy:
        Total predictions:   {pa.get('total_predictions', 0)}
        Correct:             {pa.get('correct_predictions', 0)}
        Accuracy:            {int(pa.get('overall_accuracy', 0) * 100)}%""")

        print("═══════════════════════════════════════════════════════════════\n")

    # ═══════════════════════════════════════════════════════════════════════════════════
    # LANGGRAPH DURABLE EXECUTION API
    # ═══════════════════════════════════════════════════════════════════════════════════

    def get_langgraph_status(self) -> Dict[str, Any]:
        """Get LangGraph execution engine status.

        Returns status information about the LangGraph durable execution system.
        """
        if not LANGGRAPH_AVAILABLE:
            return {
                "enabled": False,
                "available": False,
                "error": "LangGraph not installed"
            }

        if not self.use_langgraph or not self.langgraph:
            return {
                "enabled": False,
                "available": True,
                "message": "LangGraph available but not enabled. Use --langgraph flag."
            }

        try:
            status = self.langgraph.get_status()
            return {
                "enabled": True,
                "available": True,
                "graph_available": status.get("graph_available", False),
                "checkpointer_type": status.get("checkpointer_type", "unknown"),
                "total_threads": status.get("total_threads", 0),
                "successful_threads": status.get("successful_threads", 0),
                "failed_threads": status.get("failed_threads", 0),
                "anthropic_configured": status.get("anthropic_configured", False)
            }
        except Exception as e:
            return {
                "enabled": True,
                "available": True,
                "error": str(e)
            }

    def get_langgraph_threads(self, limit: int = 50) -> List[Dict[str, Any]]:
        """List all LangGraph conversation threads.

        Args:
            limit: Maximum number of threads to return

        Returns:
            List of thread objects with id, status, and metadata
        """
        if not self.use_langgraph or not self.langgraph:
            return []

        try:
            return self.langgraph.list_threads(limit)
        except Exception as e:
            log(f"Error listing LangGraph threads: {e}", "ERROR")
            return []

    def langgraph_process(self, message: str, thread_id: str = None) -> Dict[str, Any]:
        """Process a message through LangGraph durable execution.

        Args:
            message: The user message to process
            thread_id: Optional thread ID for conversation continuity

        Returns:
            Result dict with response, metadata, and any errors
        """
        if not LANGGRAPH_AVAILABLE:
            return {
                "success": False,
                "error": "LangGraph not available"
            }

        # Temporarily enable LangGraph if not already
        if not self.langgraph:
            try:
                self.langgraph = TinyPMGraph()
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Failed to initialize LangGraph: {e}"
                }

        try:
            result = self.langgraph.process_message(message, thread_id)
            return result
        except Exception as e:
            log(f"LangGraph process error: {e}", "ERROR")
            return {
                "success": False,
                "error": str(e)
            }

    def langgraph_recover_thread(self, thread_id: str) -> Dict[str, Any]:
        """Recover a LangGraph thread from its last checkpoint.

        Args:
            thread_id: ID of the thread to recover

        Returns:
            Recovered thread state or error
        """
        if not self.langgraph:
            return {"success": False, "error": "LangGraph not initialized"}

        try:
            state = self.langgraph.recover_thread(thread_id)
            if state:
                return {"success": True, "state": state}
            return {"success": False, "error": f"Thread {thread_id} not found"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ═══════════════════════════════════════════════════════════════════════════════════
    # A2A PROTOCOL INTEGRATION
    # ═══════════════════════════════════════════════════════════════════════════════════

    async def delegate_to_a2a_agent(
        self,
        agent_name: str,
        message: str,
        skill: str = None
    ) -> Dict[str, Any]:
        """
        Delegate a task to an external A2A agent.

        This enables TinyPM to call out to external A2A-compatible agents
        like Salesforce, ServiceNow, Workday, etc.

        Args:
            agent_name: Name of the registered external agent
            message: Task description or query
            skill: Optional skill hint for routing

        Returns:
            Result from external agent
        """
        try:
            from a2a_client import get_agent_registry, call_external_agent

            result = await call_external_agent(
                agent_name=agent_name,
                message=message,
                skill=skill
            )

            log(f"A2A delegation to {agent_name}: {'success' if result.success else 'failed'}")

            return {
                "success": result.success,
                "response": result.text,
                "data": result.data,
                "task_id": result.task_id,
                "error": result.error
            }

        except ImportError:
            log("A2A client not available", "WARN")
            return {
                "success": False,
                "error": "A2A client module not installed"
            }
        except Exception as e:
            log(f"A2A delegation error: {e}", "ERROR")
            return {
                "success": False,
                "error": str(e)
            }

    def get_a2a_capabilities(self) -> Dict[str, Any]:
        """
        Get TinyPM's A2A capabilities for external agents.

        Returns:
            Dict with skills, status, and capabilities
        """
        capabilities = {
            "agent_name": "TinyPM Orchestrator",
            "protocol": "A2A v0.3",
            "skills": [
                {
                    "id": "task_management",
                    "name": "Task Management",
                    "available": True
                },
                {
                    "id": "predictive_intent",
                    "name": "Predictive Intelligence",
                    "available": PREDICTIVE_INTENT_AVAILABLE
                },
                {
                    "id": "agent_delegation",
                    "name": "Agent Delegation",
                    "available": True
                },
                {
                    "id": "status_reporting",
                    "name": "Status Reporting",
                    "available": True
                },
                {
                    "id": "wizard_council",
                    "name": "Wizard Council Decision",
                    "available": True
                },
                {
                    "id": "wild_claims_research",
                    "name": "Wild Claims Verification",
                    "available": True  # Will check dynamically
                }
            ],
            "integrations": {
                "calendar": CALENDAR_AVAILABLE,
                "email": EMAIL_AVAILABLE,
                "predictive_intent": PREDICTIVE_INTENT_AVAILABLE
            },
            "status": "active" if self.running else "idle"
        }

        # Check wild claims availability
        try:
            from wild_claims_czar import WildClaimsCzar
        except ImportError:
            for skill in capabilities["skills"]:
                if skill["id"] == "wild_claims_research":
                    skill["available"] = False

        return capabilities

    def process_a2a_request(
        self,
        message: str,
        skill: str = None,
        context_id: str = None
    ) -> Dict[str, Any]:
        """
        Process an incoming A2A request.

        Routes to the appropriate handler based on skill or auto-detection.

        Args:
            message: The incoming message from external agent
            skill: Optional skill hint
            context_id: Optional conversation context ID

        Returns:
            Response dict with text and structured data
        """
        message_lower = message.lower()

        # Gather context
        ctx = ContextGatherer.gather()

        # Route based on skill or auto-detect
        if skill == "predictive_intent" or any(kw in message_lower for kw in [
            "predict", "suggest", "what should", "next", "pattern", "anticipate"
        ]):
            return self._handle_a2a_predictive(message, ctx)

        elif skill == "status_reporting" or any(kw in message_lower for kw in [
            "status", "health", "report", "progress", "overview"
        ]):
            return self._handle_a2a_status(message, ctx)

        elif skill == "agent_delegation" or any(kw in message_lower for kw in [
            "build", "implement", "fix", "create", "code", "developer"
        ]):
            return self._handle_a2a_delegation(message, ctx)

        else:
            return self._handle_a2a_task_management(message, ctx)

    def _handle_a2a_predictive(self, message: str, ctx: ProjectContext) -> Dict[str, Any]:
        """Handle A2A predictive intelligence request."""
        if not self.proactive.predictive_intent:
            return {
                "text": "Predictive intelligence is not currently available.",
                "data": {"status": "unavailable"}
            }

        try:
            # Use the proactive engine to get predictions
            suggestions = self.proactive.get_proactive_suggestions(ctx)

            if suggestions:
                text_parts = [f"Proactive suggestions based on current context ({len(suggestions)} items):"]
                for i, s in enumerate(suggestions[:5], 1):
                    text_parts.append(f"{i}. {s}")
                text = "\n".join(text_parts)
            else:
                text = "No specific suggestions at this time."

            return {
                "text": text,
                "data": {
                    "suggestions": suggestions[:5],
                    "context": {
                        "tasks_pending": ctx.tasks_pending,
                        "tasks_in_progress": ctx.tasks_in_progress,
                        "builder_status": ctx.builder_status
                    }
                }
            }

        except Exception as e:
            log(f"A2A predictive error: {e}", "ERROR")
            return {
                "text": f"Error generating predictions: {str(e)}",
                "data": {"error": str(e)}
            }

    def _handle_a2a_status(self, message: str, ctx: ProjectContext) -> Dict[str, Any]:
        """Handle A2A status request."""
        text = f"""TinyPM Status Report

Tasks:
- Pending: {ctx.tasks_pending}
- In Progress: {ctx.tasks_in_progress}
- Total: {ctx.tasks_total}

Builder: {ctx.builder_status}
{f'  Last: {ctx.builder_last_msg}' if ctx.builder_last_msg else ''}
Queue: {ctx.builder_queue_size} tasks

Agent Questions Waiting: {ctx.agent_questions_waiting}
Launch Progress: {ctx.launch_progress_pct}%

Session Stats:
- Messages Processed: {self.state.messages_processed}
- Proactive Suggestions: {self.state.proactive_suggestions}
- Errors: {self.state.errors}"""

        return {
            "text": text,
            "data": {
                "tasks": {
                    "pending": ctx.tasks_pending,
                    "in_progress": ctx.tasks_in_progress,
                    "total": ctx.tasks_total,
                    "active": ctx.active_tasks
                },
                "builder": {
                    "status": ctx.builder_status,
                    "queue_size": ctx.builder_queue_size,
                    "last_message": ctx.builder_last_msg
                },
                "session": {
                    "messages_processed": self.state.messages_processed,
                    "proactive_suggestions": self.state.proactive_suggestions,
                    "errors": self.state.errors
                },
                "timestamp": datetime.now().isoformat()
            }
        }

    def _handle_a2a_delegation(self, message: str, ctx: ProjectContext) -> Dict[str, Any]:
        """Handle A2A delegation request - queue for Builder."""
        self.channels.send_to_builder(
            f"[A2A External Request] {message}",
            "normal"
        )

        return {
            "text": f"Task delegated to Builder agent. Current queue size: {ctx.builder_queue_size + 1}",
            "data": {
                "delegated": True,
                "queue_size": ctx.builder_queue_size + 1,
                "builder_status": ctx.builder_status
            }
        }

    def _handle_a2a_task_management(self, message: str, ctx: ProjectContext) -> Dict[str, Any]:
        """Handle A2A task management request."""
        # Get board data
        board = safe_read_json(BOARD_FILE, {"tasks": []})
        tasks = board.get("tasks", [])

        message_lower = message.lower()

        if "list" in message_lower or "show" in message_lower:
            active = [t for t in tasks if t.get("status") in ["pending", "in_progress"]][:10]
            task_list = "\n".join([
                f"- [{t.get('status')}] {t.get('title', 'Untitled')}"
                for t in active
            ])
            return {
                "text": f"Active tasks:\n{task_list}" if task_list else "No active tasks.",
                "data": {
                    "tasks": [
                        {"id": t.get("id"), "title": t.get("title"), "status": t.get("status")}
                        for t in active
                    ]
                }
            }

        elif "status" in message_lower or "count" in message_lower:
            return {
                "text": f"Tasks: {ctx.tasks_pending} pending, {ctx.tasks_in_progress} in progress, {ctx.tasks_total} total",
                "data": {
                    "pending": ctx.tasks_pending,
                    "in_progress": ctx.tasks_in_progress,
                    "total": ctx.tasks_total
                }
            }

        else:
            return {
                "text": "Task management ready. Send 'list tasks' or 'task status' for information.",
                "data": {"status": "ready"}
            }


# ═══════════════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="PM Orchestrator - Intelligent Autonomous PM")
    parser.add_argument("--status", action="store_true", help="Show status")
    parser.add_argument("--responder-only", action="store_true", help="Only respond to messages (no proactive)")
    parser.add_argument("--langgraph", action="store_true", help="Use LangGraph durable execution mode with checkpointing")
    args = parser.parse_args()

    # Initialize with LangGraph if requested and available
    use_langgraph = args.langgraph and LANGGRAPH_AVAILABLE
    if args.langgraph and not LANGGRAPH_AVAILABLE:
        print("[WARNING] LangGraph requested but not available. Using standard mode.")

    orchestrator = PMOrchestrator(use_langgraph=use_langgraph)

    if args.status:
        orchestrator.status()
        return

    orchestrator.run()

if __name__ == "__main__":
    main()
