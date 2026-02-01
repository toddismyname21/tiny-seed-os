#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
PM BRAIN v2.0 - STATE OF THE ART Intelligent PM System
═══════════════════════════════════════════════════════════════════════════════

SOTA Features (Based on January 2026 Research):
- Mem0-style hybrid memory (facts + relationships + context)
- MCP integration patterns
- Proactive intelligence (anticipate needs before asked)
- Pattern learning (learn from interactions)
- Cost-aware model routing
- Adaptive timeouts based on task complexity
- Self-improvement loops

Core Capabilities:
- Full file system access via Claude CLI
- Tool usage (Read, Grep, Bash, etc.)
- Persistent session memory
- The ability to actually DO things, not just chat

Usage:
    python3 pm_brain.py              # Run in foreground
    python3 pm_brain.py --daemon     # Run as background daemon
    python3 pm_brain.py --once       # Process one message and exit
    python3 pm_brain.py --status     # Show brain status
    python3 pm_brain.py --memory     # Show memory statistics

Requirements:
    - Claude CLI installed at ~/.local/bin/claude
    - Anthropic API key configured in Claude CLI
"""

import argparse
import json
import os
import subprocess
import sys
import time
import uuid
from datetime import datetime
from pathlib import Path

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

APP_DIR = Path(__file__).parent
PM_CHAT_FILE = APP_DIR / ".pm_chat.json"
PM_BRAIN_STATE = APP_DIR / ".pm_brain_state.json"
PM_BRAIN_LOG = APP_DIR / ".pm_brain.log"
INTERCOM_FILE = APP_DIR / ".claude_intercom.json"
BOARD_FILE = APP_DIR / "board.json"
AGENT_QUESTIONS_FILE = APP_DIR / ".agent_questions.json"
LAUNCH_CHECKLIST_FILE = APP_DIR / ".launch_checklist.json"

CLAUDE_BIN = Path.home() / ".local" / "bin" / "claude"
CHECK_INTERVAL = 5  # seconds between checks
MAX_RESPONSE_TIME = 180  # seconds to wait for Claude (increased from 120)

# SOTA Memory Files
MEMORY_FILE = APP_DIR / ".pm_memory.json"
PATTERNS_FILE = APP_DIR / ".pm_patterns.json"

# ═══════════════════════════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════════════════════════

def log(msg: str, level: str = "INFO"):
    """Log with timestamp to file and stdout."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [{level}] {msg}"
    print(line)
    try:
        with open(PM_BRAIN_LOG, "a") as f:
            f.write(line + "\n")
    except:
        pass

# ═══════════════════════════════════════════════════════════════════════════════
# STATE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

def load_state() -> dict:
    """Load brain state (session ID, last processed message, etc.)."""
    if PM_BRAIN_STATE.exists():
        try:
            return json.loads(PM_BRAIN_STATE.read_text())
        except:
            pass
    return {
        "session_id": str(uuid.uuid4()),
        "last_processed_id": 0,
        "started_at": datetime.now().isoformat(),
        "messages_processed": 0,
        "errors": 0
    }

def save_state(state: dict):
    """Save brain state."""
    state["updated_at"] = datetime.now().isoformat()
    PM_BRAIN_STATE.write_text(json.dumps(state, indent=2))

# ═══════════════════════════════════════════════════════════════════════════════
# SOTA: MEM0-STYLE HYBRID MEMORY SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════

def load_memory() -> dict:
    """Load hybrid memory (facts, relationships, patterns)."""
    if MEMORY_FILE.exists():
        try:
            return json.loads(MEMORY_FILE.read_text())
        except:
            pass
    return {
        "facts": {},  # key-value store for fast retrieval
        "relationships": [],  # graph-like structure for connections
        "context": [],  # recent context for semantic matching
        "user_preferences": {},  # learned user preferences
        "updated_at": datetime.now().isoformat()
    }

def save_memory(memory: dict):
    """Save memory."""
    memory["updated_at"] = datetime.now().isoformat()
    MEMORY_FILE.write_text(json.dumps(memory, indent=2))

def store_fact(key: str, value: str):
    """Store a fact in key-value memory."""
    memory = load_memory()
    memory["facts"][key] = {
        "value": value,
        "stored_at": datetime.now().isoformat(),
        "access_count": 0
    }
    save_memory(memory)

def retrieve_fact(key: str):
    """Retrieve a fact from memory."""
    memory = load_memory()
    if key in memory["facts"]:
        memory["facts"][key]["access_count"] += 1
        save_memory(memory)
        return memory["facts"][key]["value"]
    return None

def add_context(content: str, context_type: str = "conversation"):
    """Add to rolling context buffer (Mem0-style)."""
    memory = load_memory()
    ctx = {
        "content": content[:500],  # Truncate for efficiency
        "type": context_type,
        "timestamp": datetime.now().isoformat()
    }
    memory["context"].append(ctx)
    # Keep only last 100 context items
    memory["context"] = memory["context"][-100:]
    save_memory(memory)

def get_relevant_context(limit: int = 10) -> list:
    """Get recent relevant context."""
    memory = load_memory()
    return memory["context"][-limit:]

# ═══════════════════════════════════════════════════════════════════════════════
# SOTA: PATTERN LEARNING SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════

def load_patterns() -> dict:
    """Load learned patterns."""
    if PATTERNS_FILE.exists():
        try:
            return json.loads(PATTERNS_FILE.read_text())
        except:
            pass
    return {
        "time_patterns": {},  # What user typically does at certain times
        "sequence_patterns": {},  # What typically follows what
        "response_effectiveness": {}  # How well responses worked
    }

def save_patterns(patterns: dict):
    """Save patterns."""
    PATTERNS_FILE.write_text(json.dumps(patterns, indent=2))

def categorize_input(text: str) -> str:
    """Categorize user input for pattern matching."""
    text = text.lower()
    if any(kw in text for kw in ["task", "todo", "do", "create", "build", "fix"]):
        return "task_request"
    if any(kw in text for kw in ["?", "what", "how", "why", "where", "when"]):
        return "question"
    if any(kw in text for kw in ["status", "progress", "update", "check"]):
        return "status_check"
    if any(kw in text for kw in ["urgent", "asap", "now", "immediately"]):
        return "urgent_request"
    return "general"

def record_interaction(user_input: str, response: str, was_helpful: bool = True):
    """Record interaction for pattern learning."""
    patterns = load_patterns()

    # Time pattern
    hour = datetime.now().hour
    day = datetime.now().strftime("%A")
    time_key = f"{day}_{hour}"

    if time_key not in patterns["time_patterns"]:
        patterns["time_patterns"][time_key] = []
    patterns["time_patterns"][time_key].append({
        "input_type": categorize_input(user_input),
        "timestamp": datetime.now().isoformat()
    })
    # Keep only last 50 entries per time slot
    patterns["time_patterns"][time_key] = patterns["time_patterns"][time_key][-50:]

    # Effectiveness tracking
    input_cat = categorize_input(user_input)
    if input_cat not in patterns["response_effectiveness"]:
        patterns["response_effectiveness"][input_cat] = {"helpful": 0, "total": 0}
    patterns["response_effectiveness"][input_cat]["total"] += 1
    if was_helpful:
        patterns["response_effectiveness"][input_cat]["helpful"] += 1

    save_patterns(patterns)

def predict_next_action():
    """Predict what user might want next based on patterns."""
    patterns = load_patterns()

    hour = datetime.now().hour
    day = datetime.now().strftime("%A")
    time_key = f"{day}_{hour}"

    if time_key in patterns["time_patterns"]:
        recent = patterns["time_patterns"][time_key][-5:]
        if recent:
            actions = [r["input_type"] for r in recent]
            most_common = max(set(actions), key=actions.count)
            return most_common
    return None

# ═══════════════════════════════════════════════════════════════════════════════
# SOTA: PROACTIVE INTELLIGENCE
# ═══════════════════════════════════════════════════════════════════════════════

def check_proactive_suggestions() -> list:
    """Check if there are proactive suggestions to offer.

    SOTA recommendation: Agents should anticipate needs, not just respond.
    """
    suggestions = []

    # Check for stale tasks
    if BOARD_FILE.exists():
        try:
            board = json.loads(BOARD_FILE.read_text())
            in_progress = [t for t in board.get("tasks", []) if t.get("status") == "in_progress"]
            for task in in_progress:
                updated = task.get("updated", "")
                if updated:
                    try:
                        updated_dt = datetime.fromisoformat(updated.replace(" ", "T").split(".")[0])
                        age = (datetime.now() - updated_dt).total_seconds() / 3600
                        if age > 24:
                            suggestions.append(f"Task '{task['title'][:30]}' has been in progress for {int(age)}h")
                    except:
                        pass
        except:
            pass

    # Check builder health
    builder_state_file = APP_DIR / ".builder_autonomous_state.json"
    if builder_state_file.exists():
        try:
            builder_state = json.loads(builder_state_file.read_text())
            current_task = builder_state.get("current_task")
            if current_task:
                suggestions.append(f"Builder working on task #{current_task}")
        except:
            pass

    return suggestions

def estimate_timeout(task: str) -> int:
    """Estimate appropriate timeout based on task complexity.

    SOTA insight: Complex tasks need more time. Timeouts should scale.
    """
    task_lower = task.lower()

    # Research/analysis tasks need more time
    if any(kw in task_lower for kw in ["research", "analyze", "investigate", "upgrade"]):
        return 600  # 10 minutes

    # Complex tasks with multiple steps
    if any(kw in task_lower for kw in ["implement", "build", "create", "refactor"]):
        return 480  # 8 minutes

    # Standard tasks
    return MAX_RESPONSE_TIME

# ═══════════════════════════════════════════════════════════════════════════════
# SOTA: CONFIDENCE SCORER
# Based on PROACTIVE_AI_RESEARCH_2026.md - Calibrated confidence for suggestions
# ═══════════════════════════════════════════════════════════════════════════════

class ConfidenceScorer:
    """
    Calibrated confidence scoring for proactive suggestions.

    Based on 2026 SOTA research, confidence should be calibrated using:
    - Historical accuracy for suggestion type
    - Data quality/completeness
    - Novelty (new situations = less confident)
    - User agreement history

    Action levels (from research):
    - >95%: Auto-execute, notify after (LEVEL_AUTO)
    - 85-95%: Present for one-click approval (LEVEL_APPROVE)
    - 70-85%: Ask specific clarifying question (LEVEL_CLARIFY)
    - 50-70%: Collaborative mode (LEVEL_COLLABORATE)
    - <50%: Don't suggest, or caveat heavily (LEVEL_CAVEAT)
    """

    # Action level constants
    LEVEL_AUTO = "auto_execute"
    LEVEL_APPROVE = "one_click_approval"
    LEVEL_CLARIFY = "ask_clarifying"
    LEVEL_COLLABORATE = "collaborative"
    LEVEL_CAVEAT = "caveat_or_silent"

    # Confidence thresholds
    THRESHOLD_AUTO = 0.95
    THRESHOLD_APPROVE = 0.85
    THRESHOLD_CLARIFY = 0.70
    THRESHOLD_COLLABORATE = 0.50

    def __init__(self):
        """Initialize ConfidenceScorer with pattern storage."""
        self.patterns_file = PATTERNS_FILE
        self._ensure_confidence_structure()

    def _ensure_confidence_structure(self):
        """Ensure patterns file has confidence tracking structure."""
        patterns = load_patterns()
        if "confidence_history" not in patterns:
            patterns["confidence_history"] = {
                # Track outcomes by suggestion type
                # Format: type -> {accepted: int, rejected: int, total: int}
            }
        if "accuracy_by_type" not in patterns:
            patterns["accuracy_by_type"] = {
                # Track accuracy metrics by suggestion type
                # Format: type -> {correct: int, incorrect: int, accuracy: float}
            }
        save_patterns(patterns)

    def score_suggestion(self, suggestion_type: str, context: dict = None) -> float:
        """
        Calculate calibrated confidence score for a suggestion.

        Args:
            suggestion_type: Type of suggestion (e.g., "task_reminder", "deadline_warning",
                           "stale_task", "builder_status", "morning_focus",
                           "urgent_email", "meeting_prep")
            context: Optional context dict with:
                - data_completeness: float 0-1 (how complete is the data)
                - novelty_score: float 0-1 (how novel/unusual is this situation)
                - base_confidence: float 0-1 (model's raw confidence if available)
                - email_urgency: int 1-5 (for email suggestions, boosts confidence)
                - is_important_sender: bool (for email suggestions)
                - email_age_hours: float (stale emails boost urgency)

        Returns:
            Calibrated confidence score between 0.0 and 1.0
        """
        context = context or {}

        # Start with base confidence (default 0.7 if not provided)
        base_confidence = context.get("base_confidence", 0.70)

        # Gather adjustment factors
        adjustments = []

        # 1. Historical accuracy for this suggestion type
        historical_accuracy = self.get_historical_accuracy(suggestion_type)
        if historical_accuracy is not None:
            adjustments.append(historical_accuracy)
        else:
            # No history = slightly lower confidence (new territory)
            adjustments.append(0.80)

        # 2. Data quality/completeness
        data_completeness = context.get("data_completeness", 0.85)
        adjustments.append(data_completeness)

        # 3. Novelty penalty (new situations = less confident)
        novelty_score = context.get("novelty_score", 0.20)  # Default: not very novel
        novelty_adjustment = 1.0 - (novelty_score * 0.30)  # Max 30% penalty
        adjustments.append(novelty_adjustment)

        # 4. User agreement history for this type
        agreement_rate = self._get_user_agreement_rate(suggestion_type)
        if agreement_rate is not None:
            adjustments.append(agreement_rate)
        else:
            # No agreement history = neutral
            adjustments.append(0.85)

        # ═══════════════════════════════════════════════════════════════
        # EMAIL URGENCY BOOSTING (NEW)
        # High urgency emails, important senders, and stale emails
        # all boost confidence that user should see the suggestion
        # ═══════════════════════════════════════════════════════════════
        if suggestion_type in ["urgent_email", "emails_pending_response", "email_action_items"]:
            email_boost = 0.0

            # Urgency score (1-5) - higher urgency = higher confidence
            email_urgency = context.get("email_urgency", 3)
            if email_urgency >= 5:
                email_boost += 0.15  # Very urgent
            elif email_urgency >= 4:
                email_boost += 0.10  # Important

            # Important sender boost
            if context.get("is_important_sender", False):
                email_boost += 0.10

            # Stale email boost (>24h unreplied = more urgent)
            email_age_hours = context.get("email_age_hours", 0)
            if email_age_hours > 48:
                email_boost += 0.15  # Very stale
            elif email_age_hours > 24:
                email_boost += 0.10  # Getting stale

            # Apply email boost (max 0.25 total)
            email_boost = min(0.25, email_boost)
            base_confidence = min(1.0, base_confidence + email_boost)

        # Calculate calibrated confidence
        if adjustments:
            adjustment_factor = sum(adjustments) / len(adjustments)
            calibrated = base_confidence * adjustment_factor
        else:
            calibrated = base_confidence

        # Clamp to valid range
        return max(0.0, min(1.0, calibrated))

    def get_action_level(self, confidence: float) -> str:
        """
        Determine appropriate action level based on confidence score.

        Args:
            confidence: Calibrated confidence score 0.0-1.0

        Returns:
            Action level constant indicating how to present the suggestion
        """
        if confidence >= self.THRESHOLD_AUTO:
            return self.LEVEL_AUTO
        elif confidence >= self.THRESHOLD_APPROVE:
            return self.LEVEL_APPROVE
        elif confidence >= self.THRESHOLD_CLARIFY:
            return self.LEVEL_CLARIFY
        elif confidence >= self.THRESHOLD_COLLABORATE:
            return self.LEVEL_COLLABORATE
        else:
            return self.LEVEL_CAVEAT

    def get_action_description(self, action_level: str) -> str:
        """Get human-readable description of action level."""
        descriptions = {
            self.LEVEL_AUTO: "Auto-execute and notify after",
            self.LEVEL_APPROVE: "Present for one-click approval",
            self.LEVEL_CLARIFY: "Ask specific clarifying question",
            self.LEVEL_COLLABORATE: "Enter collaborative discussion mode",
            self.LEVEL_CAVEAT: "Don't suggest, or caveat heavily"
        }
        return descriptions.get(action_level, "Unknown action level")

    def record_outcome(self, suggestion_type: str, was_accepted: bool):
        """
        Record the outcome of a suggestion for learning.

        Args:
            suggestion_type: Type of suggestion that was made
            was_accepted: Whether the user accepted/acted on the suggestion
        """
        patterns = load_patterns()

        # Initialize if needed
        if "confidence_history" not in patterns:
            patterns["confidence_history"] = {}

        if suggestion_type not in patterns["confidence_history"]:
            patterns["confidence_history"][suggestion_type] = {
                "accepted": 0,
                "rejected": 0,
                "total": 0,
                "last_updated": None
            }

        # Update counts
        history = patterns["confidence_history"][suggestion_type]
        history["total"] += 1
        if was_accepted:
            history["accepted"] += 1
        else:
            history["rejected"] += 1
        history["last_updated"] = datetime.now().isoformat()

        # Also update accuracy tracking
        if "accuracy_by_type" not in patterns:
            patterns["accuracy_by_type"] = {}

        if suggestion_type not in patterns["accuracy_by_type"]:
            patterns["accuracy_by_type"][suggestion_type] = {
                "correct": 0,
                "incorrect": 0,
                "accuracy": 0.5
            }

        accuracy_data = patterns["accuracy_by_type"][suggestion_type]
        if was_accepted:
            accuracy_data["correct"] += 1
        else:
            accuracy_data["incorrect"] += 1

        total = accuracy_data["correct"] + accuracy_data["incorrect"]
        if total > 0:
            accuracy_data["accuracy"] = accuracy_data["correct"] / total

        save_patterns(patterns)

        log(f"Recorded outcome for '{suggestion_type}': {'accepted' if was_accepted else 'rejected'}")

    def get_historical_accuracy(self, suggestion_type: str) -> float:
        """
        Get historical accuracy for a suggestion type.

        Args:
            suggestion_type: Type of suggestion

        Returns:
            Accuracy rate (0.0-1.0) or None if no history
        """
        patterns = load_patterns()

        accuracy_data = patterns.get("accuracy_by_type", {}).get(suggestion_type)
        if accuracy_data:
            total = accuracy_data.get("correct", 0) + accuracy_data.get("incorrect", 0)
            if total >= 3:  # Need at least 3 data points
                return accuracy_data.get("accuracy", None)

        return None

    def _get_user_agreement_rate(self, suggestion_type: str) -> float:
        """
        Get user agreement rate for a suggestion type.

        Args:
            suggestion_type: Type of suggestion

        Returns:
            Agreement rate (0.0-1.0) or None if no history
        """
        patterns = load_patterns()

        history = patterns.get("confidence_history", {}).get(suggestion_type)
        if history:
            total = history.get("total", 0)
            if total >= 3:  # Need at least 3 data points
                accepted = history.get("accepted", 0)
                return accepted / total

        return None

    def get_confidence_stats(self) -> dict:
        """
        Get statistics about confidence scoring performance.

        Returns:
            Dict with confidence statistics
        """
        patterns = load_patterns()

        stats = {
            "types_tracked": 0,
            "total_outcomes": 0,
            "overall_acceptance_rate": 0.0,
            "by_type": {}
        }

        confidence_history = patterns.get("confidence_history", {})
        accuracy_by_type = patterns.get("accuracy_by_type", {})

        total_accepted = 0
        total_all = 0

        for suggestion_type, history in confidence_history.items():
            stats["types_tracked"] += 1
            type_total = history.get("total", 0)
            type_accepted = history.get("accepted", 0)

            total_accepted += type_accepted
            total_all += type_total

            accuracy = accuracy_by_type.get(suggestion_type, {}).get("accuracy", None)

            stats["by_type"][suggestion_type] = {
                "total": type_total,
                "accepted": type_accepted,
                "acceptance_rate": type_accepted / type_total if type_total > 0 else 0,
                "historical_accuracy": accuracy
            }

        stats["total_outcomes"] = total_all
        if total_all > 0:
            stats["overall_acceptance_rate"] = total_accepted / total_all

        return stats

    def should_suggest(self, suggestion_type: str, context: dict = None) -> tuple:
        """
        Convenience method to determine if a suggestion should be made.

        Args:
            suggestion_type: Type of suggestion
            context: Optional context dict

        Returns:
            Tuple of (should_suggest: bool, confidence: float, action_level: str)
        """
        confidence = self.score_suggestion(suggestion_type, context)
        action_level = self.get_action_level(confidence)

        # Don't suggest if confidence is too low
        should_show = confidence >= self.THRESHOLD_COLLABORATE  # 50%

        return (should_show, confidence, action_level)


# Global ConfidenceScorer instance for convenience
_confidence_scorer = None

def get_confidence_scorer() -> ConfidenceScorer:
    """Get or create the global ConfidenceScorer instance."""
    global _confidence_scorer
    if _confidence_scorer is None:
        _confidence_scorer = ConfidenceScorer()
    return _confidence_scorer


# ═══════════════════════════════════════════════════════════════════════════════
# SOTA: TIMING INTELLIGENCE
# Based on IUI '26 research: Task boundary interventions get 52% engagement
# vs 38% for mid-task interruptions. Well-timed = 45.4s interpretation time.
# ═══════════════════════════════════════════════════════════════════════════════

# Timing state file
TIMING_STATE_FILE = APP_DIR / ".pm_timing_state.json"

class TimingIntelligence:
    """
    Determine optimal moments for proactive suggestions.

    Based on IUI '26 research findings:
    - Intervening at task boundaries: 52% engagement rate
    - Mid-task interruptions: 38% engagement (62% dismissed)
    - Well-timed suggestions: 45.4s interpretation vs 101.4s for poorly-timed

    Key principle: "Intervening at a programmer's task boundary was found
    to be the most effective design principle overall."
    """

    def __init__(self):
        self.state = self._load_state()

    def _load_state(self) -> dict:
        """Load timing state from persistent storage."""
        if TIMING_STATE_FILE.exists():
            try:
                return json.loads(TIMING_STATE_FILE.read_text())
            except:
                pass
        return {
            "last_user_action": None,
            "last_task_completion": None,
            "recent_actions": [],  # Rolling window of recent actions
            "deep_work_start": None,
            "timing_outcomes": [],  # Track if timing was good
            "time_pattern_scores": {},  # Learned time-of-day patterns
            "created_at": datetime.now().isoformat()
        }

    def _save_state(self):
        """Save timing state."""
        self.state["updated_at"] = datetime.now().isoformat()
        TIMING_STATE_FILE.write_text(json.dumps(self.state, indent=2))

    def record_user_action(self, action_type: str, metadata: dict = None):
        """
        Record a user action for timing analysis.

        action_type: "message", "task_created", "task_completed", "task_updated",
                     "browsing", "file_saved", "idle_return"
        """
        now = datetime.now()
        action = {
            "type": action_type,
            "timestamp": now.isoformat(),
            "hour": now.hour,
            "day": now.strftime("%A"),
            "metadata": metadata or {}
        }

        self.state["last_user_action"] = action
        self.state["recent_actions"].append(action)

        # Keep only last 50 actions
        self.state["recent_actions"] = self.state["recent_actions"][-50:]

        # Track task completions separately (these are prime intervention moments)
        if action_type == "task_completed":
            self.state["last_task_completion"] = action
            # Clear deep work state - task completion = natural break
            self.state["deep_work_start"] = None

        # Detect entry into deep work (sustained focused activity)
        if action_type in ["file_saved", "message"] and self._is_sustained_activity():
            if not self.state["deep_work_start"]:
                self.state["deep_work_start"] = now.isoformat()

        self._save_state()

    def _is_sustained_activity(self) -> bool:
        """Check if user is in sustained activity (potential deep work)."""
        recent = self.state["recent_actions"][-5:]
        if len(recent) < 3:
            return False

        # Check if actions are clustered in time (rapid activity)
        try:
            timestamps = [datetime.fromisoformat(a["timestamp"]) for a in recent]
            time_diffs = [(timestamps[i+1] - timestamps[i]).total_seconds()
                          for i in range(len(timestamps)-1)]
            avg_gap = sum(time_diffs) / len(time_diffs) if time_diffs else float('inf')

            # If average gap < 60 seconds, user is actively working
            return avg_gap < 60
        except:
            return False

    def is_good_time_to_suggest(self, calendar_context: dict = None) -> bool:
        """
        Returns True if this is a good moment to surface a suggestion.

        Good moments (IUI '26 research):
        - Just after task completion (52% engagement)
        - Natural break points (idle for 2-5 minutes)
        - Start of day / end of day transitions
        - After returning from idle
        - Calendar gaps between meetings (NEW)

        Bad moments:
        - Mid-task / deep work (38% engagement, 62% dismissed)
        - Very rapid activity (user is focused)
        - Just after we already suggested something
        - During meetings (NEW)
        - Within 5 minutes of meeting start (NEW)

        Args:
            calendar_context: Optional dict with calendar awareness info:
                - is_in_meeting: bool
                - next_meeting_in_minutes: int or None
                - focus_time_minutes: int
        """
        now = datetime.now()

        # ═══════════════════════════════════════════════════════════════
        # CALENDAR AWARENESS (NEW) - Check first, high priority
        # ═══════════════════════════════════════════════════════════════
        if calendar_context:
            # NEVER interrupt during meetings
            if calendar_context.get('is_in_meeting', False):
                return False

            # Don't interrupt within 5 minutes of meeting start
            next_meeting = calendar_context.get('next_meeting_in_minutes')
            if next_meeting is not None and 0 < next_meeting <= 5:
                return False

            # Calendar gaps are good times - prefer task boundaries AND calendar gaps
            focus_time = calendar_context.get('focus_time_minutes', 0)
            if focus_time >= 30:  # Good chunk of focus time
                # Check if we're at a task boundary within this focus window
                if self.detect_task_boundary():
                    return True  # Perfect timing: task boundary + focus time

        # Check for recent task completion (best time!)
        if self.detect_task_boundary():
            return True

        # Check if user is in deep work (worst time)
        if self.is_in_deep_work():
            return False

        # Check time since last user action
        last_action = self.state.get("last_user_action")
        if last_action:
            try:
                last_time = datetime.fromisoformat(last_action["timestamp"])
                seconds_since = (now - last_time).total_seconds()

                # Too recent = actively working, don't interrupt
                if seconds_since < 120:  # Less than 2 minutes
                    return False

                # 2-10 minutes idle = good window (natural break)
                if 120 <= seconds_since <= 600:
                    return True

                # Very long idle (>10 min) = might have stepped away
                # Wait for them to return
                if seconds_since > 600:
                    return False
            except:
                pass

        # Check time-of-day patterns (learned from outcomes)
        time_key = f"{now.strftime('%A')}_{now.hour}"
        pattern_score = self.state.get("time_pattern_scores", {}).get(time_key, 0.5)

        # If this time slot historically has good outcomes, lean toward suggesting
        if pattern_score >= 0.6:
            return True

        # Default: don't suggest (err on side of not interrupting)
        return False

    def get_calendar_timing_context(self) -> dict:
        """
        Get timing context from calendar for decision making.

        This should be called by pm_orchestrator to pass calendar data
        to is_good_time_to_suggest().

        Returns dict with timing-relevant calendar info.
        """
        try:
            from calendar_integration import get_calendar_integration
            cal = get_calendar_integration()
            cal_ctx = cal.get_calendar_context_for_pm()

            return {
                'is_in_meeting': False,  # Calculated below
                'next_meeting_in_minutes': None,
                'focus_time_minutes': 0,
                'calendar_connected': cal_ctx.get('connected', False)
            } if not cal_ctx.get('connected') else {
                'is_in_meeting': cal_ctx.get('next_event', {}).get('minutes_until', 999) <= 0,
                'next_meeting_in_minutes': cal_ctx.get('next_event', {}).get('minutes_until'),
                'focus_time_minutes': cal_ctx.get('focus_time', {}).get('next_block_minutes', 0),
                'calendar_connected': True
            }
        except Exception:
            return {
                'is_in_meeting': False,
                'next_meeting_in_minutes': None,
                'focus_time_minutes': 0,
                'calendar_connected': False
            }

    def detect_task_boundary(self) -> bool:
        """
        Check if user just completed something (natural intervention point).

        Task boundaries are the BEST moment to suggest (52% engagement rate).
        """
        last_completion = self.state.get("last_task_completion")
        if not last_completion:
            return False

        try:
            completion_time = datetime.fromisoformat(last_completion["timestamp"])
            seconds_since = (datetime.now() - completion_time).total_seconds()

            # Within 5 minutes of task completion = prime window
            return seconds_since <= 300
        except:
            return False

    def is_in_deep_work(self) -> bool:
        """
        Check if user appears to be in focused/deep work mode.

        Interrupting deep work has only 38% engagement (62% dismissed).
        """
        deep_work_start = self.state.get("deep_work_start")
        if not deep_work_start:
            return False

        try:
            start_time = datetime.fromisoformat(deep_work_start)
            minutes_in_deep_work = (datetime.now() - start_time).total_seconds() / 60

            # If they've been in sustained activity for 5+ minutes, they're in the zone
            return minutes_in_deep_work >= 5
        except:
            return False

    def get_next_good_window(self) -> dict:
        """
        Estimate when the next good intervention window will be.

        Returns dict with:
        - estimated_seconds: seconds until next good window
        - reason: why we think this will be a good time
        - confidence: 0-1 confidence in this estimate
        """
        now = datetime.now()

        # If user is in deep work, estimate when they'll surface
        if self.is_in_deep_work():
            deep_work_start = self.state.get("deep_work_start")
            if deep_work_start:
                try:
                    start = datetime.fromisoformat(deep_work_start)
                    minutes_in = (now - start).total_seconds() / 60

                    # People typically take breaks every 25-45 minutes (Pomodoro-ish)
                    # Estimate next break at 30 minute mark
                    estimated_break = max(0, 30 - minutes_in)

                    return {
                        "estimated_seconds": int(estimated_break * 60),
                        "reason": "Waiting for natural break from deep work",
                        "confidence": 0.6
                    }
                except:
                    pass

        # Check if there's a historically good time coming up
        for hours_ahead in range(1, 4):
            future_hour = (now.hour + hours_ahead) % 24
            time_key = f"{now.strftime('%A')}_{future_hour}"
            score = self.state.get("time_pattern_scores", {}).get(time_key, 0.5)

            if score >= 0.7:
                return {
                    "estimated_seconds": hours_ahead * 3600,
                    "reason": f"Historically good time at {future_hour}:00",
                    "confidence": score
                }

        # Default: suggest checking back in 5 minutes
        return {
            "estimated_seconds": 300,
            "reason": "Default check interval",
            "confidence": 0.3
        }

    def record_timing_outcome(self, was_good_time: bool, context: dict = None):
        """
        Learn from whether a suggestion timing was good.

        was_good_time: True if user engaged with suggestion, False if dismissed/ignored
        context: Optional dict with additional context (suggestion_type, etc.)
        """
        now = datetime.now()
        time_key = f"{now.strftime('%A')}_{now.hour}"

        # Record the outcome
        outcome = {
            "timestamp": now.isoformat(),
            "time_key": time_key,
            "was_good": was_good_time,
            "was_deep_work": self.is_in_deep_work(),
            "was_task_boundary": self.detect_task_boundary(),
            "context": context or {}
        }

        self.state["timing_outcomes"].append(outcome)
        # Keep only last 200 outcomes
        self.state["timing_outcomes"] = self.state["timing_outcomes"][-200:]

        # Update time pattern scores based on outcomes
        self._update_time_pattern_scores()

        self._save_state()

    def _update_time_pattern_scores(self):
        """Update learned time-of-day pattern scores based on outcomes."""
        outcomes = self.state.get("timing_outcomes", [])
        if not outcomes:
            return

        # Group outcomes by time key
        by_time_key = {}
        for outcome in outcomes:
            key = outcome.get("time_key")
            if key:
                if key not in by_time_key:
                    by_time_key[key] = {"good": 0, "total": 0}
                by_time_key[key]["total"] += 1
                if outcome.get("was_good"):
                    by_time_key[key]["good"] += 1

        # Calculate scores (with smoothing for low sample sizes)
        scores = {}
        for key, counts in by_time_key.items():
            if counts["total"] >= 3:  # Need at least 3 samples
                # Bayesian smoothing: assume 50% prior with 2 pseudo-observations
                scores[key] = (counts["good"] + 1) / (counts["total"] + 2)
            else:
                scores[key] = 0.5  # Default to neutral

        self.state["time_pattern_scores"] = scores

    def get_timing_stats(self) -> dict:
        """Get statistics about timing performance."""
        outcomes = self.state.get("timing_outcomes", [])

        if not outcomes:
            return {
                "total_suggestions": 0,
                "engagement_rate": 0.0,
                "best_times": [],
                "worst_times": []
            }

        good_count = sum(1 for o in outcomes if o.get("was_good"))
        total = len(outcomes)

        # Find best and worst time slots
        scores = self.state.get("time_pattern_scores", {})
        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)

        return {
            "total_suggestions": total,
            "engagement_rate": good_count / total if total > 0 else 0.0,
            "best_times": sorted_scores[:3],
            "worst_times": sorted_scores[-3:] if len(sorted_scores) > 3 else [],
            "task_boundary_engagement": self._calc_boundary_engagement(outcomes),
            "deep_work_engagement": self._calc_deep_work_engagement(outcomes)
        }

    def _calc_boundary_engagement(self, outcomes: list) -> float:
        """Calculate engagement rate at task boundaries."""
        boundary_outcomes = [o for o in outcomes if o.get("was_task_boundary")]
        if not boundary_outcomes:
            return 0.0
        good = sum(1 for o in boundary_outcomes if o.get("was_good"))
        return good / len(boundary_outcomes)

    def _calc_deep_work_engagement(self, outcomes: list) -> float:
        """Calculate engagement rate during deep work."""
        deep_outcomes = [o for o in outcomes if o.get("was_deep_work")]
        if not deep_outcomes:
            return 0.0
        good = sum(1 for o in deep_outcomes if o.get("was_good"))
        return good / len(deep_outcomes)


# Global TimingIntelligence instance
_timing_intelligence = None

def get_timing_intelligence() -> TimingIntelligence:
    """Get the global TimingIntelligence instance."""
    global _timing_intelligence
    if _timing_intelligence is None:
        _timing_intelligence = TimingIntelligence()
    return _timing_intelligence


# ═══════════════════════════════════════════════════════════════════════════════
# SOTA: STYLE LEARNER
# Based on Superhuman research - "voice learning" makes AI drafts sound like user
# ═══════════════════════════════════════════════════════════════════════════════

# Style profile file
STYLE_PROFILE_FILE = APP_DIR / ".pm_style_profile.json"


class StyleLearner:
    """
    Learn user's communication style and apply it to AI-generated drafts.

    Based on Superhuman's "voice learning" feature - a killer feature that makes
    AI drafts sound like the user actually wrote them.

    Style characteristics learned:
    - Formality level (casual vs formal)
    - Sentence length (short and punchy vs flowing)
    - Vocabulary patterns (technical terms, casual phrases)
    - Greeting/closing patterns
    - Punctuation style (exclamation marks, ellipses)
    - Common phrases the user repeats
    - Emoji usage

    Usage:
        learner = get_style_learner()
        learner.learn_from_messages(chat_history)
        style_prompt = learner.get_style_prompt()
        casual_draft = learner.apply_style(formal_draft)
    """

    def __init__(self):
        """Initialize StyleLearner with persistent storage."""
        self.profile = self._load_profile()

    def _load_profile(self) -> dict:
        """Load style profile from persistent storage."""
        if STYLE_PROFILE_FILE.exists():
            try:
                return json.loads(STYLE_PROFILE_FILE.read_text())
            except:
                pass
        return {
            "formality_score": 0.5,  # 0=casual, 1=formal (start neutral)
            "avg_sentence_length": 15,  # words per sentence
            "common_greetings": [],
            "common_closings": [],
            "vocabulary_patterns": [],  # frequently used phrases
            "punctuation_style": {
                "exclamations": "moderate",  # none, rare, moderate, frequent
                "ellipses": "rare",
                "questions": "moderate"
            },
            "emoji_usage": "none",  # none, rare, moderate, frequent
            "sample_phrases": [],  # characteristic phrases
            "samples_analyzed": 0,
            "text_samples": [],  # raw samples for analysis (limited)
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

    def _save_profile(self):
        """Save style profile to persistent storage."""
        self.profile["updated_at"] = datetime.now().isoformat()
        STYLE_PROFILE_FILE.write_text(json.dumps(self.profile, indent=2))

    def learn_from_text(self, text: str, text_type: str = "message"):
        """
        Extract style patterns from user's writing.

        Args:
            text: The user's written text to analyze
            text_type: Type of text - "message", "email", "note", "comment"
        """
        if not text or len(text.strip()) < 10:
            return

        # Store sample for future analysis (keep last 100)
        self.profile["text_samples"].append({
            "text": text[:500],  # Truncate long texts
            "type": text_type,
            "timestamp": datetime.now().isoformat()
        })
        self.profile["text_samples"] = self.profile["text_samples"][-100:]

        # Analyze the text
        self._analyze_formality(text)
        self._analyze_sentence_length(text)
        self._analyze_greetings_closings(text)
        self._analyze_vocabulary(text)
        self._analyze_punctuation(text)
        self._analyze_emoji(text)
        self._extract_phrases(text)

        self.profile["samples_analyzed"] += 1
        self._save_profile()

        log(f"StyleLearner: Analyzed {text_type}, total samples: {self.profile['samples_analyzed']}")

    def learn_from_messages(self, messages: list):
        """
        Learn from a list of chat messages.

        Args:
            messages: List of message dicts with 'from' and 'message' keys
        """
        user_messages = [
            m.get("message", "") for m in messages
            if m.get("from") == "user" and m.get("message")
        ]

        for msg in user_messages:
            self.learn_from_text(msg, "message")

        log(f"StyleLearner: Learned from {len(user_messages)} user messages")

    def _analyze_formality(self, text: str):
        """Analyze and update formality score."""
        text_lower = text.lower()

        # Formal indicators
        formal_markers = [
            "dear", "sincerely", "regards", "respectfully", "kindly",
            "please be advised", "i am writing", "pursuant to",
            "as per", "hereby", "therefore", "consequently",
            "would you be so kind", "at your earliest convenience"
        ]

        # Casual indicators
        casual_markers = [
            "hey", "hi there", "what's up", "gonna", "wanna", "gotta",
            "yeah", "yep", "nope", "cool", "awesome", "great",
            "thanks!", "cheers", "btw", "fyi", "lol", "haha",
            "!", "?!", "...", ":)", ":D", "👍"
        ]

        formal_count = sum(1 for marker in formal_markers if marker in text_lower)
        casual_count = sum(1 for marker in casual_markers if marker in text_lower)

        # Calculate new formality based on this text
        if formal_count + casual_count > 0:
            text_formality = formal_count / (formal_count + casual_count)
        else:
            text_formality = 0.5  # Neutral

        # Weighted moving average with existing score
        samples = self.profile["samples_analyzed"]
        if samples > 0:
            weight = min(0.1, 1 / (samples + 1))  # Diminishing returns
            self.profile["formality_score"] = (
                (1 - weight) * self.profile["formality_score"] +
                weight * text_formality
            )
        else:
            self.profile["formality_score"] = text_formality

    def _analyze_sentence_length(self, text: str):
        """Analyze average sentence length."""
        import re

        # Split into sentences (rough approximation)
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]

        if not sentences:
            return

        # Count words per sentence
        word_counts = [len(s.split()) for s in sentences]
        avg_length = sum(word_counts) / len(word_counts)

        # Weighted moving average
        samples = self.profile["samples_analyzed"]
        if samples > 0:
            weight = min(0.1, 1 / (samples + 1))
            self.profile["avg_sentence_length"] = (
                (1 - weight) * self.profile["avg_sentence_length"] +
                weight * avg_length
            )
        else:
            self.profile["avg_sentence_length"] = avg_length

    def _analyze_greetings_closings(self, text: str):
        """Extract greeting and closing patterns."""
        text_lower = text.lower().strip()
        lines = text.split('\n')

        # Common greetings to detect
        greeting_patterns = [
            "hey", "hi", "hello", "hi there", "hey there",
            "good morning", "good afternoon", "good evening",
            "dear", "greetings", "howdy", "yo", "sup"
        ]

        # Common closings to detect
        closing_patterns = [
            "thanks", "thank you", "thanks!", "cheers", "best",
            "regards", "sincerely", "take care", "talk soon",
            "let me know", "lmk", "ttyl", "bye", "later"
        ]

        # Check first line for greetings
        if lines:
            first_line = lines[0].lower().strip()
            for greeting in greeting_patterns:
                if first_line.startswith(greeting):
                    # Store the actual greeting used (preserve case)
                    actual_greeting = lines[0].strip()
                    if actual_greeting and len(actual_greeting) < 30:
                        if actual_greeting not in self.profile["common_greetings"]:
                            self.profile["common_greetings"].append(actual_greeting)
                        # Keep only top 10 most recent
                        self.profile["common_greetings"] = self.profile["common_greetings"][-10:]
                    break

        # Check last line for closings
        if lines:
            last_line = lines[-1].lower().strip()
            for closing in closing_patterns:
                if closing in last_line:
                    actual_closing = lines[-1].strip()
                    if actual_closing and len(actual_closing) < 50:
                        if actual_closing not in self.profile["common_closings"]:
                            self.profile["common_closings"].append(actual_closing)
                        self.profile["common_closings"] = self.profile["common_closings"][-10:]
                    break

    def _analyze_vocabulary(self, text: str):
        """Extract vocabulary patterns (frequently used phrases)."""
        text_lower = text.lower()

        # Common filler/style phrases to detect
        style_phrases = [
            "basically", "honestly", "actually", "literally",
            "quick question", "just wanted to", "just checking",
            "let me know", "sounds good", "makes sense",
            "no worries", "no problem", "for sure", "definitely",
            "i think", "i feel like", "i guess", "i mean",
            "kind of", "sort of", "pretty much", "you know"
        ]

        for phrase in style_phrases:
            if phrase in text_lower:
                if phrase not in self.profile["vocabulary_patterns"]:
                    self.profile["vocabulary_patterns"].append(phrase)
                # Keep only top 20
                self.profile["vocabulary_patterns"] = self.profile["vocabulary_patterns"][-20:]

    def _analyze_punctuation(self, text: str):
        """Analyze punctuation style."""
        # Count punctuation occurrences
        exclamation_count = text.count('!')
        ellipsis_count = text.count('...')
        question_count = text.count('?')
        word_count = len(text.split())

        if word_count < 5:
            return

        # Calculate rates per 100 words
        exclamation_rate = (exclamation_count / word_count) * 100
        ellipsis_rate = (ellipsis_count / word_count) * 100
        question_rate = (question_count / word_count) * 100

        # Categorize
        def rate_to_category(rate: float) -> str:
            if rate < 0.5:
                return "none"
            elif rate < 2:
                return "rare"
            elif rate < 5:
                return "moderate"
            else:
                return "frequent"

        # Update with weighted influence
        self.profile["punctuation_style"]["exclamations"] = rate_to_category(exclamation_rate)
        self.profile["punctuation_style"]["ellipses"] = rate_to_category(ellipsis_rate)
        self.profile["punctuation_style"]["questions"] = rate_to_category(question_rate)

    def _analyze_emoji(self, text: str):
        """Analyze emoji usage."""
        import re

        # Simple emoji detection (common emojis and emoticons)
        emoji_pattern = re.compile(
            r'[\U0001F600-\U0001F64F]|'  # Emoticons
            r'[\U0001F300-\U0001F5FF]|'  # Symbols
            r'[\U0001F680-\U0001F6FF]|'  # Transport
            r'[\U0001F1E0-\U0001F1FF]|'  # Flags
            r'[:;]-?[)D(P]|'             # Text emoticons
            r'<3|'                        # Heart
            r'[👍👎🙂😊😃😄🤔🎉✨💪🔥❤️]'  # Common emojis
        )

        emoji_matches = emoji_pattern.findall(text)
        word_count = len(text.split())

        if word_count < 5:
            return

        emoji_rate = (len(emoji_matches) / word_count) * 100

        if emoji_rate < 0.1:
            self.profile["emoji_usage"] = "none"
        elif emoji_rate < 1:
            self.profile["emoji_usage"] = "rare"
        elif emoji_rate < 3:
            self.profile["emoji_usage"] = "moderate"
        else:
            self.profile["emoji_usage"] = "frequent"

    def _extract_phrases(self, text: str):
        """Extract characteristic phrases from the text."""
        import re

        # Look for repeated phrases (3-6 words) that might be characteristic
        words = text.split()

        if len(words) < 6:
            return

        # Extract 3-6 word phrases
        for phrase_len in range(3, 7):
            for i in range(len(words) - phrase_len + 1):
                phrase = ' '.join(words[i:i + phrase_len]).strip()

                # Clean up the phrase
                phrase = re.sub(r'^[,.\s]+|[,.\s]+$', '', phrase)

                if len(phrase) < 10 or len(phrase) > 50:
                    continue

                # Skip if it's just common filler
                if phrase.lower() in ['i think that', 'i want to', 'i need to']:
                    continue

                # Check if it contains interesting structure
                if any(marker in phrase.lower() for marker in [
                    'let me know', 'happy to', 'feel free', 'would be great',
                    'sounds good', 'makes sense', 'no problem', 'no worries'
                ]):
                    if phrase not in self.profile["sample_phrases"]:
                        self.profile["sample_phrases"].append(phrase)
                    self.profile["sample_phrases"] = self.profile["sample_phrases"][-30:]

    def get_style_profile(self) -> dict:
        """
        Return the learned style characteristics.

        Returns:
            Dict with all learned style characteristics
        """
        return {
            "formality_score": round(self.profile["formality_score"], 2),
            "formality_level": self._formality_to_level(),
            "avg_sentence_length": round(self.profile["avg_sentence_length"], 1),
            "sentence_style": self._sentence_length_to_style(),
            "common_greetings": self.profile["common_greetings"][-5:],
            "common_closings": self.profile["common_closings"][-5:],
            "vocabulary_patterns": self.profile["vocabulary_patterns"][-10:],
            "punctuation_style": self.profile["punctuation_style"],
            "emoji_usage": self.profile["emoji_usage"],
            "sample_phrases": self.profile["sample_phrases"][-10:],
            "samples_analyzed": self.profile["samples_analyzed"],
            "confidence": self._calculate_confidence()
        }

    def _formality_to_level(self) -> str:
        """Convert formality score to descriptive level."""
        score = self.profile["formality_score"]
        if score < 0.2:
            return "very_casual"
        elif score < 0.4:
            return "casual"
        elif score < 0.6:
            return "neutral"
        elif score < 0.8:
            return "formal"
        else:
            return "very_formal"

    def _sentence_length_to_style(self) -> str:
        """Convert average sentence length to style description."""
        avg = self.profile["avg_sentence_length"]
        if avg < 8:
            return "very_short"  # Punchy, direct
        elif avg < 12:
            return "short"  # Concise
        elif avg < 18:
            return "medium"  # Balanced
        elif avg < 25:
            return "long"  # Flowing
        else:
            return "very_long"  # Complex

    def _calculate_confidence(self) -> float:
        """Calculate confidence in the style profile based on samples."""
        samples = self.profile["samples_analyzed"]

        # Need at least 10 samples for reasonable confidence
        if samples < 5:
            return 0.2
        elif samples < 10:
            return 0.4
        elif samples < 25:
            return 0.6
        elif samples < 50:
            return 0.8
        else:
            return 0.95

    def get_style_prompt(self) -> str:
        """
        Return a prompt that instructs Claude to write in user's style.

        Returns:
            String prompt to prepend to AI draft requests
        """
        profile = self.get_style_profile()

        if profile["samples_analyzed"] < 3:
            return "Write in a natural, friendly tone."

        parts = []

        # Formality
        formality_desc = {
            "very_casual": "very casual and relaxed",
            "casual": "casual and friendly",
            "neutral": "conversational but professional",
            "formal": "professional and polished",
            "very_formal": "formal and business-like"
        }
        parts.append(f"Write in a {formality_desc.get(profile['formality_level'], 'natural')} style.")

        # Sentence length
        if profile["sentence_style"] in ["very_short", "short"]:
            parts.append("Use short, punchy sentences. Get to the point quickly.")
        elif profile["sentence_style"] in ["long", "very_long"]:
            parts.append("Use flowing sentences with more detail and context.")

        # Greetings
        if profile["common_greetings"]:
            greetings = profile["common_greetings"][:3]
            parts.append(f"Start messages with greetings like: {', '.join(greetings)}")

        # Closings
        if profile["common_closings"]:
            closings = profile["common_closings"][:3]
            parts.append(f"End messages with closings like: {', '.join(closings)}")

        # Vocabulary
        if profile["vocabulary_patterns"]:
            vocab = profile["vocabulary_patterns"][:5]
            parts.append(f"Use phrases like: {', '.join(vocab)}")

        # Punctuation
        punct = profile["punctuation_style"]
        if punct.get("exclamations") == "frequent":
            parts.append("Use exclamation marks generously to show enthusiasm.")
        elif punct.get("exclamations") == "none":
            parts.append("Avoid exclamation marks; keep tone measured.")

        if punct.get("ellipses") in ["moderate", "frequent"]:
            parts.append("Use ellipses (...) for trailing thoughts.")

        # Emoji
        emoji = profile["emoji_usage"]
        if emoji == "none":
            parts.append("Do not use emojis.")
        elif emoji == "rare":
            parts.append("Emojis are okay but use sparingly.")
        elif emoji in ["moderate", "frequent"]:
            parts.append("Feel free to use emojis to add personality.")

        return " ".join(parts)

    def apply_style(self, draft: str) -> str:
        """
        Rewrite a draft in the user's voice.

        This method provides guidance for how to transform a formal/generic draft
        into something that sounds like the user. For actual transformation,
        this should be combined with an LLM call using get_style_prompt().

        Args:
            draft: The original draft text to transform

        Returns:
            Style-aware version of the draft (basic transformations applied)
        """
        if not draft:
            return draft

        profile = self.get_style_profile()
        result = draft

        # Apply greeting transformation
        if profile["common_greetings"] and profile["formality_level"] in ["casual", "very_casual"]:
            # Replace formal greetings with user's style
            formal_greetings = ["Dear Sir/Madam", "Dear Sir or Madam", "To Whom It May Concern"]
            for formal in formal_greetings:
                if formal in result:
                    preferred = profile["common_greetings"][0] if profile["common_greetings"] else "Hi"
                    result = result.replace(formal, preferred)

        # Apply closing transformation
        if profile["common_closings"] and profile["formality_level"] in ["casual", "very_casual"]:
            formal_closings = ["Sincerely,", "Yours faithfully,", "Best regards,"]
            for formal in formal_closings:
                if formal in result:
                    preferred = profile["common_closings"][0] if profile["common_closings"] else "Thanks!"
                    result = result.replace(formal, preferred)

        # Remove/add exclamation marks based on style
        punct = profile["punctuation_style"]
        if punct.get("exclamations") == "none":
            # Reduce exclamation marks
            while '!!' in result:
                result = result.replace('!!', '!')
            # Replace some with periods (simple heuristic)
            result = result.replace('!.', '.')

        # Note: Full style application requires LLM - this does basic transformations
        # For complete transformation, use: claude.generate(get_style_prompt() + draft)

        return result

    def reset_profile(self):
        """Reset the style profile to defaults."""
        self.profile = {
            "formality_score": 0.5,
            "avg_sentence_length": 15,
            "common_greetings": [],
            "common_closings": [],
            "vocabulary_patterns": [],
            "punctuation_style": {
                "exclamations": "moderate",
                "ellipses": "rare",
                "questions": "moderate"
            },
            "emoji_usage": "none",
            "sample_phrases": [],
            "samples_analyzed": 0,
            "text_samples": [],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        self._save_profile()
        log("StyleLearner: Profile reset to defaults")

    def get_style_stats(self) -> dict:
        """Get statistics about style learning."""
        return {
            "samples_analyzed": self.profile["samples_analyzed"],
            "confidence": self._calculate_confidence(),
            "unique_greetings": len(self.profile["common_greetings"]),
            "unique_closings": len(self.profile["common_closings"]),
            "vocabulary_phrases": len(self.profile["vocabulary_patterns"]),
            "sample_phrases": len(self.profile["sample_phrases"]),
            "formality_level": self._formality_to_level(),
            "sentence_style": self._sentence_length_to_style(),
            "created_at": self.profile.get("created_at"),
            "updated_at": self.profile.get("updated_at")
        }


# Global StyleLearner instance
_style_learner = None


def get_style_learner() -> StyleLearner:
    """Get the global StyleLearner instance."""
    global _style_learner
    if _style_learner is None:
        _style_learner = StyleLearner()
    return _style_learner


# ═══════════════════════════════════════════════════════════════════════════════
# CONTEXT GATHERING
# ═══════════════════════════════════════════════════════════════════════════════

def gather_context() -> str:
    """Gather current project state for Claude - ENHANCED with SOTA features."""
    parts = []

    # Task board
    try:
        if BOARD_FILE.exists():
            board = json.loads(BOARD_FILE.read_text())
            tasks = board.get("tasks", [])
            pending = len([t for t in tasks if t.get("status") == "pending"])
            in_progress = len([t for t in tasks if t.get("status") == "in_progress"])
            parts.append(f"Tasks: {pending} pending, {in_progress} in progress")
    except:
        pass

    # Builder status
    try:
        if INTERCOM_FILE.exists():
            intercom = json.loads(INTERCOM_FILE.read_text())
            builder_msgs = intercom.get("builder_to_pm", [])
            if builder_msgs:
                latest = builder_msgs[-1]
                parts.append(f"Builder last: [{latest.get('type')}] {latest.get('message', '')[:80]}...")
            queued = len([t for t in intercom.get("pm_to_builder", []) if not t.get("read")])
            if queued:
                parts.append(f"Builder queue: {queued} tasks")
    except:
        pass

    # Agent questions
    try:
        if AGENT_QUESTIONS_FILE.exists():
            questions = json.loads(AGENT_QUESTIONS_FILE.read_text())
            unanswered = len([q for q in questions.get("questions", []) if not q.get("answered")])
            if unanswered:
                parts.append(f"Agent questions waiting: {unanswered}")
    except:
        pass

    # Launch readiness
    try:
        if LAUNCH_CHECKLIST_FILE.exists():
            checklist = json.loads(LAUNCH_CHECKLIST_FILE.read_text())
            items = checklist.get("items", [])
            done = len([i for i in items if i.get("status") == "done"])
            total = len(items)
            if total:
                parts.append(f"Launch readiness: {done}/{total} ({int(done/total*100)}%)")
    except:
        pass

    # SOTA: Add memory context
    recent_ctx = get_relevant_context(limit=5)
    if recent_ctx:
        parts.append(f"Recent memory: {len(recent_ctx)} items")

    # SOTA: Add pattern prediction
    predicted = predict_next_action()
    if predicted:
        parts.append(f"Predicted intent: {predicted}")

    # SOTA: Add proactive suggestions
    suggestions = check_proactive_suggestions()
    if suggestions:
        parts.append(f"Alerts: {len(suggestions)}")

    return " | ".join(parts) if parts else "No context available"

# ═══════════════════════════════════════════════════════════════════════════════
# CLAUDE CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════

def call_claude(prompt: str, session_id: str = None, timeout: int = None) -> tuple[str, bool]:
    """
    Call Claude CLI with the given prompt.
    Returns (response_text, success).

    SOTA: Now supports adaptive timeouts.
    """
    if not CLAUDE_BIN.exists():
        return "Claude CLI not found", False

    # Use provided timeout or default
    actual_timeout = timeout or MAX_RESPONSE_TIME

    # Build the command - use --dangerously-skip-permissions for autonomous operation
    cmd = [
        str(CLAUDE_BIN),
        "-p",  # Print mode (non-interactive)
        prompt,
        "--dangerously-skip-permissions",  # SOTA: Autonomous operation
    ]

    try:
        log(f"Calling Claude CLI (timeout: {actual_timeout}s)")

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=actual_timeout,
            cwd=str(APP_DIR.parent),  # Run from project root
            env={**os.environ, "NO_COLOR": "1", "PATH": f"{CLAUDE_BIN.parent}:{os.environ.get('PATH', '')}"}
        )

        if result.returncode == 0:
            response = result.stdout.strip()
            # Clean up any ANSI codes that might have slipped through
            import re
            response = re.sub(r'\x1b\[[0-9;]*m', '', response)
            return response, True
        else:
            error = result.stderr.strip() or "Unknown error"
            log(f"Claude CLI error: {error}", "ERROR")
            return f"Error: {error}", False

    except subprocess.TimeoutExpired:
        log(f"Claude CLI timed out after {actual_timeout}s", "ERROR")
        return "Response timed out", False
    except Exception as e:
        log(f"Claude CLI exception: {e}", "ERROR")
        return f"Error: {str(e)}", False

def build_pm_prompt(user_message: str, context: str, history: list) -> str:
    """Build the full prompt for Claude - SOTA ENHANCED with memory and proactive intelligence."""

    # Recent conversation history
    history_text = ""
    if history:
        history_text = "\n\nRECENT CONVERSATION:\n"
        for msg in history[-6:]:  # Last 6 messages
            role = "USER" if msg.get("from") == "user" else "PM"
            history_text += f"{role}: {msg['message'][:200]}\n"

    # SOTA: Add memory context
    memory_text = ""
    recent_ctx = get_relevant_context(limit=5)
    if recent_ctx:
        memory_text = "\n\nRECENT MEMORY:\n"
        for ctx in recent_ctx:
            memory_text += f"- [{ctx['type']}] {ctx['content'][:100]}\n"

    # SOTA: Add proactive suggestions
    proactive_text = ""
    suggestions = check_proactive_suggestions()
    if suggestions:
        proactive_text = "\n\nPROACTIVE ALERTS:\n"
        for s in suggestions:
            proactive_text += f"- {s}\n"

    prompt = f"""You are the PM (Project Manager) for TinyPM and Tiny Seed Farm OS, responding to a dashboard message.

CURRENT PROJECT STATE:
{context}
{history_text}{memory_text}{proactive_text}

CRITICAL INSTRUCTIONS - FOLLOW THESE EXACTLY:
1. Be PROACTIVE - suggest next actions, anticipate needs before asked
2. Be SPECIFIC - use numbers, names, actual data from context
3. Be CONCISE - keep responses under 150 words
4. Be ACTION-ORIENTED - end with a clear next step when appropriate
5. If agent questions are waiting, remind the user
6. If Builder completed work, mention it
7. If there are proactive alerts, mention them naturally
8. THINK AHEAD - what will the user need next?

USER MESSAGE:
{user_message}

YOUR RESPONSE (as the PM - be intelligent and anticipate needs):"""

    return prompt

# ═══════════════════════════════════════════════════════════════════════════════
# MESSAGE PROCESSING
# ═══════════════════════════════════════════════════════════════════════════════

def get_new_messages(last_id: int) -> list:
    """Get new user messages since last_id."""
    if not PM_CHAT_FILE.exists():
        return []

    try:
        chat = json.loads(PM_CHAT_FILE.read_text())
        messages = chat.get("messages", [])

        new_msgs = [
            m for m in messages
            if m["id"] > last_id
            and m.get("from") == "user"
            and not m.get("auto_responded")
        ]

        return new_msgs
    except Exception as e:
        log(f"Error reading messages: {e}", "ERROR")
        return []

def get_conversation_history() -> list:
    """Get recent conversation history."""
    if not PM_CHAT_FILE.exists():
        return []

    try:
        chat = json.loads(PM_CHAT_FILE.read_text())
        return chat.get("messages", [])[-10:]
    except:
        return []

def save_response(response_text: str, original_msg_id: int):
    """Save PM response to chat file."""
    try:
        chat = json.loads(PM_CHAT_FILE.read_text())

        msg_id = chat.get("next_id", 1)
        chat["messages"].append({
            "id": msg_id,
            "from": "pm",
            "message": response_text,
            "timestamp": datetime.now().isoformat(),
            "read_by_user": False,
            "auto_generated": True,
            "generator": "pm_brain"
        })
        chat["next_id"] = msg_id + 1

        # Mark original as responded
        for m in chat["messages"]:
            if m["id"] == original_msg_id:
                m["auto_responded"] = True

        PM_CHAT_FILE.write_text(json.dumps(chat, indent=2))
        log(f"Response saved as message #{msg_id}")
        return True

    except Exception as e:
        log(f"Error saving response: {e}", "ERROR")
        return False

def process_message(msg: dict, state: dict) -> bool:
    """Process a single user message - SOTA ENHANCED with learning."""
    user_message = msg["message"]
    msg_id = msg["id"]

    log(f"Processing message #{msg_id}: {user_message[:50]}...")

    # SOTA: Store user message in memory
    add_context(f"User: {user_message[:100]}", "user_message")

    # Gather context
    context = gather_context()
    history = get_conversation_history()

    # Build prompt
    prompt = build_pm_prompt(user_message, context, history)

    # SOTA: Use adaptive timeout
    timeout = estimate_timeout(user_message)
    log(f"Using adaptive timeout: {timeout}s")

    # Call Claude with adaptive timeout
    response, success = call_claude(prompt, state.get("session_id"), timeout=timeout)

    if success:
        # Save response
        save_response(response, msg_id)
        state["messages_processed"] = state.get("messages_processed", 0) + 1

        # SOTA: Store response in memory and record interaction
        add_context(f"PM: {response[:100]}", "pm_response")
        record_interaction(user_message, response, was_helpful=True)

        return True
    else:
        state["errors"] = state.get("errors", 0) + 1
        # Still save a fallback response
        save_response(f"I received your message but encountered an error. Please try again or check the terminal.", msg_id)
        record_interaction(user_message, "error", was_helpful=False)
        return False

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN LOOP
# ═══════════════════════════════════════════════════════════════════════════════

def run_once(state: dict) -> bool:
    """Process any pending messages once."""
    new_msgs = get_new_messages(state["last_processed_id"])

    if not new_msgs:
        return False

    for msg in new_msgs:
        process_message(msg, state)
        state["last_processed_id"] = msg["id"]
        save_state(state)

    return True

def run_loop():
    """Main loop - watch for messages and respond with SOTA intelligence."""
    log("=" * 60)
    log("PM BRAIN v2.0 - SOTA Intelligence Active")
    log("=" * 60)
    log("Features: Mem0 Memory | Pattern Learning | Proactive Intel")
    log("=" * 60)

    state = load_state()
    log(f"Session: {state['session_id'][:8]}... | Last processed: #{state['last_processed_id']}")

    # Check Claude CLI exists
    if not CLAUDE_BIN.exists():
        log(f"Claude CLI not found at {CLAUDE_BIN}", "ERROR")
        log("Install with: curl -fsSL https://claude.ai/install.sh | sh")
        sys.exit(1)

    log(f"Watching {PM_CHAT_FILE}")
    log(f"Check interval: {CHECK_INTERVAL}s")
    log("Press Ctrl+C to stop")
    log("-" * 60)

    try:
        while True:
            new_msgs = get_new_messages(state["last_processed_id"])

            if new_msgs:
                log(f"Found {len(new_msgs)} new message(s)")

                for msg in new_msgs:
                    process_message(msg, state)
                    state["last_processed_id"] = msg["id"]
                    save_state(state)

            time.sleep(CHECK_INTERVAL)

    except KeyboardInterrupt:
        log("Shutting down...")
        save_state(state)
        log(f"Processed {state['messages_processed']} messages, {state['errors']} errors")

def run_daemon():
    """Run as a background daemon."""
    import signal

    # Create PID file
    pid_file = APP_DIR / ".pm_brain.pid"
    pid_file.write_text(str(os.getpid()))

    def cleanup(signum, frame):
        log("Received shutdown signal")
        pid_file.unlink(missing_ok=True)
        sys.exit(0)

    signal.signal(signal.SIGTERM, cleanup)
    signal.signal(signal.SIGINT, cleanup)

    log(f"Running as daemon (PID: {os.getpid()})")
    run_loop()

# ═══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="PM Brain v2.0 - SOTA Intelligent PM")
    parser.add_argument("--daemon", action="store_true", help="Run as background daemon")
    parser.add_argument("--once", action="store_true", help="Process pending messages once and exit")
    parser.add_argument("--status", action="store_true", help="Show brain status")
    parser.add_argument("--memory", action="store_true", help="Show memory statistics")
    args = parser.parse_args()

    if args.status:
        state = load_state()
        patterns = load_patterns()
        print(f"""
PM Brain v2.0 Status - SOTA Intelligence
═══════════════════════════════════════════════════════════
  Session ID:        {state['session_id'][:8]}...
  Last processed:    #{state['last_processed_id']}
  Messages handled:  {state.get('messages_processed', 0)}
  Errors:            {state.get('errors', 0)}
  Started:           {state.get('started_at', 'Unknown')}
  Updated:           {state.get('updated_at', 'Never')}

  Pattern Categories: {len(patterns.get('time_patterns', {}))}
  Effectiveness Data: {len(patterns.get('response_effectiveness', {}))}
═══════════════════════════════════════════════════════════
""")
        return

    if args.memory:
        memory = load_memory()
        print(f"""
PM Brain Memory Statistics - Mem0-Style
═══════════════════════════════════════════════════════════
  Facts stored:      {len(memory.get('facts', {}))}
  Relationships:     {len(memory.get('relationships', []))}
  Context items:     {len(memory.get('context', []))}
  User preferences:  {len(memory.get('user_preferences', {}))}
  Last updated:      {memory.get('updated_at', 'Unknown')}
═══════════════════════════════════════════════════════════
""")
        return

    if args.once:
        state = load_state()
        processed = run_once(state)
        if processed:
            print("Processed pending messages")
        else:
            print("No new messages")
        return

    if args.daemon:
        run_daemon()
    else:
        run_loop()

if __name__ == "__main__":
    main()
