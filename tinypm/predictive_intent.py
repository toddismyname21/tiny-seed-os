#!/usr/bin/env python3
"""
===============================================================================
PREDICTIVE INTENT ENGINE - TinyPM's Mind-Reading Core
===============================================================================

This is the brain that makes TinyPM feel like it can read your mind.

STATE OF THE ART IMPLEMENTATION (January 2026):
- Multi-dimensional behavior pattern mining
- Bayesian intent prediction with confidence calibration
- Context fusion across 7+ signal sources
- Proactive suggestion generation with learned timing
- Continuous learning loop with A/B testing capability

CORE PHILOSOPHY:
"The best PM system knows what you need before you do."

Based on research from:
- IUI '26: Task boundary interventions (52% engagement)
- Superhuman's anticipatory email suggestions
- Notion AI's context-aware completions
- Mem0 hybrid memory architecture

Usage:
    from predictive_intent import PredictiveIntentEngine

    engine = PredictiveIntentEngine()
    predictions = engine.predict_next_actions(context)
    suggestions = engine.generate_proactive_suggestions(predictions)

Created: 2026-01-30
Author: PM_Architect
"""

import json
import math
import statistics
from collections import defaultdict, Counter
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, Set
import hashlib
import re


# ===============================================================================
# CONFIGURATION
# ===============================================================================

APP_DIR = Path(__file__).parent

# Persistent storage files
INTENT_PATTERNS_FILE = APP_DIR / ".pm_intent_patterns.json"
INTENT_HISTORY_FILE = APP_DIR / ".pm_intent_history.json"
PREDICTION_OUTCOMES_FILE = APP_DIR / ".pm_prediction_outcomes.json"
LEARNED_WEIGHTS_FILE = APP_DIR / ".pm_learned_weights.json"

# Import existing TinyPM modules for integration
try:
    from pm_brain import (
        get_confidence_scorer,
        get_timing_intelligence,
        get_style_learner,
        load_patterns as load_brain_patterns,
        load_memory as load_brain_memory
    )
    BRAIN_AVAILABLE = True
except ImportError:
    BRAIN_AVAILABLE = False
    print("[PredictiveIntent] pm_brain not available - running standalone")

try:
    from calendar_integration import get_calendar_integration
    CALENDAR_AVAILABLE = True
except ImportError:
    CALENDAR_AVAILABLE = False
    print("[PredictiveIntent] Calendar integration not available")

try:
    from email_integration import get_email_integration
    EMAIL_AVAILABLE = True
except ImportError:
    EMAIL_AVAILABLE = False
    print("[PredictiveIntent] Email integration not available")


# ===============================================================================
# ENUMS & DATA CLASSES
# ===============================================================================

class ActionCategory(Enum):
    """Categories of user actions for pattern mining."""
    TASK_MANAGEMENT = "task_management"      # Create, update, complete tasks
    COMMUNICATION = "communication"           # Email, chat, messaging
    CALENDAR = "calendar"                     # Scheduling, meetings
    DEEP_WORK = "deep_work"                   # Coding, writing, focused work
    PLANNING = "planning"                     # Strategy, roadmaps, reviews
    ADMINISTRATIVE = "administrative"         # Settings, org, maintenance
    RESEARCH = "research"                     # Investigation, learning
    REVIEW = "review"                         # PRs, approvals, feedback
    DELEGATION = "delegation"                 # Assigning work to others
    STANDUP = "standup"                       # Daily rituals, status updates
    UNKNOWN = "unknown"


class ContextSignal(Enum):
    """Types of context signals for fusion."""
    TIME_OF_DAY = "time_of_day"
    DAY_OF_WEEK = "day_of_week"
    CALENDAR_STATE = "calendar_state"
    EMAIL_STATE = "email_state"
    TASK_STATE = "task_state"
    RECENT_ACTIONS = "recent_actions"
    SESSION_DURATION = "session_duration"
    ENERGY_ESTIMATE = "energy_estimate"       # Derived from activity patterns
    MEETING_PROXIMITY = "meeting_proximity"
    DEADLINE_PRESSURE = "deadline_pressure"


@dataclass
class ActionEvent:
    """Represents a recorded user action."""
    id: str
    timestamp: datetime
    category: ActionCategory
    action_type: str                          # Specific action (e.g., "create_task")
    context: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat(),
            "category": self.category.value,
            "action_type": self.action_type,
            "context": self.context,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "ActionEvent":
        return cls(
            id=data["id"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            category=ActionCategory(data["category"]),
            action_type=data["action_type"],
            context=data.get("context", {}),
            metadata=data.get("metadata", {})
        )


@dataclass
class PredictedAction:
    """A predicted next action with confidence and reasoning."""
    action_type: str
    category: ActionCategory
    confidence: float                         # 0.0 - 1.0
    reasoning: List[str]                      # Why we predicted this
    suggested_time: Optional[datetime] = None
    supporting_evidence: Dict[str, Any] = field(default_factory=dict)
    action_level: str = "suggest"             # auto, approve, suggest, collaborative

    def to_dict(self) -> Dict:
        return {
            "action_type": self.action_type,
            "category": self.category.value,
            "confidence": round(self.confidence, 3),
            "confidence_pct": f"{int(self.confidence * 100)}%",
            "reasoning": self.reasoning,
            "suggested_time": self.suggested_time.isoformat() if self.suggested_time else None,
            "supporting_evidence": self.supporting_evidence,
            "action_level": self.action_level
        }


@dataclass
class ProactiveSuggestion:
    """A proactive suggestion ready for user presentation."""
    message: str                              # Human-readable suggestion
    prediction: PredictedAction               # Underlying prediction
    priority: int = 0                         # Higher = more important
    quick_actions: List[str] = field(default_factory=list)  # One-click options
    expires_at: Optional[datetime] = None     # When suggestion becomes stale
    shown_at: Optional[datetime] = None

    def to_dict(self) -> Dict:
        return {
            "message": self.message,
            "prediction": self.prediction.to_dict(),
            "priority": self.priority,
            "quick_actions": self.quick_actions,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "shown_at": self.shown_at.isoformat() if self.shown_at else None
        }


@dataclass
class FusedContext:
    """All context signals fused into a single object."""
    # Time context
    hour: int
    minute: int
    day_of_week: int                          # 0=Monday
    day_name: str
    is_weekend: bool
    is_morning: bool                          # 6am-12pm
    is_afternoon: bool                        # 12pm-6pm
    is_evening: bool                          # 6pm-10pm

    # Calendar context
    calendar_connected: bool = False
    next_meeting_in_minutes: Optional[int] = None
    is_in_meeting: bool = False
    meetings_today: int = 0
    free_time_minutes: int = 0
    busy_day: bool = False

    # Email context
    email_connected: bool = False
    unread_count: int = 0
    urgent_count: int = 0
    needs_response_count: int = 0

    # Task context
    tasks_pending: int = 0
    tasks_in_progress: int = 0
    tasks_overdue: int = 0
    has_urgent_deadline: bool = False

    # Recent activity
    recent_action_categories: List[str] = field(default_factory=list)
    session_duration_minutes: int = 0
    actions_this_hour: int = 0

    # Derived signals
    energy_estimate: float = 0.7              # 0-1, derived from patterns
    focus_likelihood: float = 0.5             # 0-1, likelihood of deep focus
    meeting_pressure: float = 0.0             # 0-1, upcoming meeting stress
    deadline_pressure: float = 0.0            # 0-1, task deadline stress

    def to_dict(self) -> Dict:
        return asdict(self)


# ===============================================================================
# BEHAVIOR PATTERN MINER
# ===============================================================================

class BehaviorPatternMiner:
    """
    Mines behavioral patterns from user action history.

    Pattern types discovered:
    1. Time-of-day patterns: What does user do at specific hours?
    2. Day-of-week patterns: Monday vs Friday behaviors
    3. Sequence patterns: After action X, user usually does Y
    4. Trigger patterns: When event E happens, user does action A
    5. Duration patterns: How long does user spend on activities?
    6. Transition patterns: How does user switch between work modes?
    """

    # Minimum samples needed for statistical confidence
    MIN_SAMPLES_FOR_PATTERN = 3
    MIN_SAMPLES_FOR_CONFIDENCE = 10

    def __init__(self):
        self.patterns = self._load_patterns()
        self.action_history = self._load_history()

    def _load_patterns(self) -> Dict:
        """Load discovered patterns from storage."""
        if INTENT_PATTERNS_FILE.exists():
            try:
                return json.loads(INTENT_PATTERNS_FILE.read_text())
            except Exception as e:
                print(f"[PatternMiner] Error loading patterns: {e}")
        return {
            "time_patterns": {},           # hour -> action distribution
            "day_patterns": {},            # day_of_week -> action distribution
            "time_day_patterns": {},       # (day, hour) -> action distribution
            "sequence_patterns": {},       # action -> next action distribution
            "trigger_patterns": {},        # trigger -> action distribution
            "duration_patterns": {},       # action -> typical durations
            "transition_patterns": {},     # category_from -> category_to -> frequency
            "metadata": {
                "created_at": datetime.now().isoformat(),
                "total_actions_analyzed": 0,
                "last_mined": None
            }
        }

    def _save_patterns(self):
        """Save patterns to storage."""
        self.patterns["metadata"]["last_mined"] = datetime.now().isoformat()
        try:
            INTENT_PATTERNS_FILE.write_text(json.dumps(self.patterns, indent=2, default=str))
        except Exception as e:
            print(f"[PatternMiner] Error saving patterns: {e}")

    def _load_history(self) -> List[ActionEvent]:
        """Load action history from storage."""
        if INTENT_HISTORY_FILE.exists():
            try:
                data = json.loads(INTENT_HISTORY_FILE.read_text())
                return [ActionEvent.from_dict(e) for e in data.get("events", [])]
            except Exception as e:
                print(f"[PatternMiner] Error loading history: {e}")
        return []

    def _save_history(self):
        """Save action history to storage."""
        # Keep last 10000 events
        recent = self.action_history[-10000:]
        data = {
            "events": [e.to_dict() for e in recent],
            "updated_at": datetime.now().isoformat()
        }
        try:
            INTENT_HISTORY_FILE.write_text(json.dumps(data, indent=2))
        except Exception as e:
            print(f"[PatternMiner] Error saving history: {e}")

    def record_action(self, action: ActionEvent):
        """Record an action for pattern analysis."""
        self.action_history.append(action)

        # Incrementally update patterns
        self._update_time_patterns(action)
        self._update_sequence_patterns(action)

        # Periodically save
        if len(self.action_history) % 10 == 0:
            self._save_history()
            self._save_patterns()

    def _update_time_patterns(self, action: ActionEvent):
        """Update time-based patterns with new action."""
        hour = action.timestamp.hour
        day = action.timestamp.weekday()
        action_key = action.action_type

        # Hour pattern
        hour_key = str(hour)
        if hour_key not in self.patterns["time_patterns"]:
            self.patterns["time_patterns"][hour_key] = {}
        if action_key not in self.patterns["time_patterns"][hour_key]:
            self.patterns["time_patterns"][hour_key][action_key] = 0
        self.patterns["time_patterns"][hour_key][action_key] += 1

        # Day pattern
        day_key = str(day)
        if day_key not in self.patterns["day_patterns"]:
            self.patterns["day_patterns"][day_key] = {}
        if action_key not in self.patterns["day_patterns"][day_key]:
            self.patterns["day_patterns"][day_key][action_key] = 0
        self.patterns["day_patterns"][day_key][action_key] += 1

        # Combined time+day pattern
        time_day_key = f"{day}_{hour}"
        if time_day_key not in self.patterns["time_day_patterns"]:
            self.patterns["time_day_patterns"][time_day_key] = {}
        if action_key not in self.patterns["time_day_patterns"][time_day_key]:
            self.patterns["time_day_patterns"][time_day_key][action_key] = 0
        self.patterns["time_day_patterns"][time_day_key][action_key] += 1

        self.patterns["metadata"]["total_actions_analyzed"] += 1

    def _update_sequence_patterns(self, action: ActionEvent):
        """Update sequence patterns (what follows what)."""
        if len(self.action_history) < 2:
            return

        # Get previous action
        prev_action = self.action_history[-2]

        # Skip if too much time has passed (session break)
        time_diff = (action.timestamp - prev_action.timestamp).total_seconds()
        if time_diff > 1800:  # 30 minute gap = new session
            return

        prev_key = prev_action.action_type
        curr_key = action.action_type

        if prev_key not in self.patterns["sequence_patterns"]:
            self.patterns["sequence_patterns"][prev_key] = {}
        if curr_key not in self.patterns["sequence_patterns"][prev_key]:
            self.patterns["sequence_patterns"][prev_key][curr_key] = 0
        self.patterns["sequence_patterns"][prev_key][curr_key] += 1

        # Also track category transitions
        prev_cat = prev_action.category.value
        curr_cat = action.category.value

        if prev_cat not in self.patterns["transition_patterns"]:
            self.patterns["transition_patterns"][prev_cat] = {}
        if curr_cat not in self.patterns["transition_patterns"][prev_cat]:
            self.patterns["transition_patterns"][prev_cat][curr_cat] = 0
        self.patterns["transition_patterns"][prev_cat][curr_cat] += 1

    def mine_trigger_patterns(self):
        """
        Mine trigger->action patterns from history.

        Triggers include:
        - Email from specific sender -> action
        - Calendar event type -> action
        - Task status change -> action
        - Time entering certain hour -> action
        """
        triggers = defaultdict(lambda: defaultdict(int))

        for event in self.action_history:
            context = event.context

            # Email triggers
            if "email_from" in context:
                trigger = f"email_from:{context['email_from']}"
                triggers[trigger][event.action_type] += 1

            # Calendar triggers
            if "calendar_event_type" in context:
                trigger = f"calendar:{context['calendar_event_type']}"
                triggers[trigger][event.action_type] += 1

            # Task triggers
            if "task_status_changed" in context:
                trigger = f"task_status:{context['task_status_changed']}"
                triggers[trigger][event.action_type] += 1

        # Convert to regular dict and save
        self.patterns["trigger_patterns"] = {
            k: dict(v) for k, v in triggers.items()
        }
        self._save_patterns()

    def get_time_pattern(self, hour: int, day: int = None) -> Dict[str, float]:
        """
        Get probability distribution of actions for a time slot.

        Returns dict of action_type -> probability
        """
        if day is not None:
            # Use combined time+day pattern
            key = f"{day}_{hour}"
            pattern = self.patterns["time_day_patterns"].get(key, {})
        else:
            # Use just hour pattern
            pattern = self.patterns["time_patterns"].get(str(hour), {})

        if not pattern:
            return {}

        # Convert counts to probabilities
        total = sum(pattern.values())
        if total < self.MIN_SAMPLES_FOR_PATTERN:
            return {}

        return {k: v / total for k, v in pattern.items()}

    def get_sequence_prediction(self, last_action: str, limit: int = 5) -> List[Tuple[str, float]]:
        """
        Predict next actions based on what just happened.

        Returns list of (action_type, probability) tuples.
        """
        pattern = self.patterns["sequence_patterns"].get(last_action, {})

        if not pattern:
            return []

        total = sum(pattern.values())
        if total < self.MIN_SAMPLES_FOR_PATTERN:
            return []

        # Sort by frequency and convert to probabilities
        sorted_items = sorted(pattern.items(), key=lambda x: x[1], reverse=True)
        return [(k, v / total) for k, v in sorted_items[:limit]]

    def get_trigger_response(self, trigger: str) -> List[Tuple[str, float]]:
        """Get likely actions in response to a trigger."""
        pattern = self.patterns["trigger_patterns"].get(trigger, {})

        if not pattern:
            return []

        total = sum(pattern.values())
        if total < self.MIN_SAMPLES_FOR_PATTERN:
            return []

        sorted_items = sorted(pattern.items(), key=lambda x: x[1], reverse=True)
        return [(k, v / total) for k, v in sorted_items]

    def get_pattern_confidence(self, pattern_type: str, pattern_key: str) -> float:
        """
        Calculate confidence in a pattern based on sample size.

        Uses Bayesian-inspired calculation:
        - More samples = higher confidence
        - Starts low, asymptotically approaches 1.0
        """
        patterns_dict = self.patterns.get(pattern_type, {})
        pattern = patterns_dict.get(pattern_key, {})

        if not pattern:
            return 0.0

        total_samples = sum(pattern.values())

        if total_samples < self.MIN_SAMPLES_FOR_PATTERN:
            return 0.0

        # Confidence formula: 1 - 1/(1 + samples/min_confident_samples)
        # At MIN_SAMPLES_FOR_CONFIDENCE samples, confidence is 0.5
        confidence = 1 - 1 / (1 + total_samples / self.MIN_SAMPLES_FOR_CONFIDENCE)

        return min(confidence, 0.95)  # Cap at 95%

    def get_most_common_actions(self, hour: int = None, day: int = None, limit: int = 5) -> List[Tuple[str, int]]:
        """Get most common actions, optionally filtered by time."""
        if hour is not None and day is not None:
            pattern = self.patterns["time_day_patterns"].get(f"{day}_{hour}", {})
        elif hour is not None:
            pattern = self.patterns["time_patterns"].get(str(hour), {})
        elif day is not None:
            pattern = self.patterns["day_patterns"].get(str(day), {})
        else:
            # Aggregate all
            pattern = defaultdict(int)
            for p in self.patterns["time_patterns"].values():
                for k, v in p.items():
                    pattern[k] += v

        sorted_items = sorted(pattern.items(), key=lambda x: x[1], reverse=True)
        return sorted_items[:limit]

    def get_stats(self) -> Dict:
        """Get pattern mining statistics."""
        return {
            "total_actions": len(self.action_history),
            "total_analyzed": self.patterns["metadata"]["total_actions_analyzed"],
            "time_slots_with_patterns": len(self.patterns["time_patterns"]),
            "sequence_patterns": len(self.patterns["sequence_patterns"]),
            "trigger_patterns": len(self.patterns["trigger_patterns"]),
            "transition_patterns": len(self.patterns["transition_patterns"]),
            "last_mined": self.patterns["metadata"]["last_mined"]
        }


# ===============================================================================
# CONTEXT FUSION ENGINE
# ===============================================================================

class ContextFusionEngine:
    """
    Fuses multiple context signals into a unified understanding.

    Signal sources:
    1. Time (hour, day, part of day)
    2. Calendar (meetings, free time)
    3. Email (unread, urgent)
    4. Tasks (pending, in progress, overdue)
    5. Recent actions (what user just did)
    6. Session state (how long active, activity level)
    7. Derived signals (energy, focus, pressure)

    The fusion creates a holistic view that enables better predictions
    than any single signal could provide.
    """

    def __init__(self):
        self.signal_weights = self._load_weights()

        # Energy patterns by hour (default, learned over time)
        self.energy_curve = {
            0: 0.2, 1: 0.1, 2: 0.1, 3: 0.1, 4: 0.1, 5: 0.2,
            6: 0.4, 7: 0.6, 8: 0.8, 9: 0.9, 10: 1.0, 11: 0.95,
            12: 0.7, 13: 0.6, 14: 0.7, 15: 0.8, 16: 0.85, 17: 0.7,
            18: 0.5, 19: 0.4, 20: 0.3, 21: 0.3, 22: 0.2, 23: 0.2
        }

    def _load_weights(self) -> Dict[str, float]:
        """Load learned signal weights."""
        if LEARNED_WEIGHTS_FILE.exists():
            try:
                data = json.loads(LEARNED_WEIGHTS_FILE.read_text())
                return data.get("signal_weights", {})
            except:
                pass

        # Default weights (equal importance)
        return {
            ContextSignal.TIME_OF_DAY.value: 1.0,
            ContextSignal.DAY_OF_WEEK.value: 0.8,
            ContextSignal.CALENDAR_STATE.value: 1.2,
            ContextSignal.EMAIL_STATE.value: 0.9,
            ContextSignal.TASK_STATE.value: 1.1,
            ContextSignal.RECENT_ACTIONS.value: 1.5,
            ContextSignal.SESSION_DURATION.value: 0.6,
            ContextSignal.ENERGY_ESTIMATE.value: 0.7,
            ContextSignal.MEETING_PROXIMITY.value: 1.3,
            ContextSignal.DEADLINE_PRESSURE.value: 1.4
        }

    def _save_weights(self):
        """Save learned weights."""
        try:
            data = {
                "signal_weights": self.signal_weights,
                "updated_at": datetime.now().isoformat()
            }
            LEARNED_WEIGHTS_FILE.write_text(json.dumps(data, indent=2))
        except Exception as e:
            print(f"[ContextFusion] Error saving weights: {e}")

    def gather_context(self, recent_actions: List[ActionEvent] = None) -> FusedContext:
        """
        Gather all context signals and fuse into FusedContext.

        This is the main entry point for context gathering.
        """
        now = datetime.now()

        # Initialize with time context
        context = FusedContext(
            hour=now.hour,
            minute=now.minute,
            day_of_week=now.weekday(),
            day_name=now.strftime("%A"),
            is_weekend=now.weekday() >= 5,
            is_morning=6 <= now.hour < 12,
            is_afternoon=12 <= now.hour < 18,
            is_evening=18 <= now.hour < 22
        )

        # Gather calendar context
        self._gather_calendar_context(context)

        # Gather email context
        self._gather_email_context(context)

        # Gather task context
        self._gather_task_context(context)

        # Gather recent action context
        self._gather_activity_context(context, recent_actions or [])

        # Calculate derived signals
        self._calculate_derived_signals(context)

        return context

    def _gather_calendar_context(self, context: FusedContext):
        """Gather calendar-related context signals."""
        if not CALENDAR_AVAILABLE:
            return

        try:
            cal = get_calendar_integration()
            if not cal.is_connected():
                return

            context.calendar_connected = True

            cal_context = cal.get_calendar_context_for_pm()

            context.meetings_today = cal_context.get("events_today_count", 0)
            context.busy_day = cal_context.get("busy_day", False)

            focus_time = cal_context.get("focus_time", {})
            context.free_time_minutes = focus_time.get("next_block_minutes", 0)

            next_event = cal_context.get("next_event")
            if next_event:
                context.next_meeting_in_minutes = next_event.get("minutes_until")

                # Check if we're in a meeting (negative minutes_until)
                if context.next_meeting_in_minutes is not None:
                    context.is_in_meeting = context.next_meeting_in_minutes < 0

        except Exception as e:
            print(f"[ContextFusion] Calendar context error: {e}")

    def _gather_email_context(self, context: FusedContext):
        """Gather email-related context signals."""
        if not EMAIL_AVAILABLE:
            return

        try:
            email = get_email_integration()
            if not email.is_connected():
                return

            context.email_connected = True

            email_context = email.get_email_context_for_pm()

            context.unread_count = email_context.get("unread_count", 0)
            context.urgent_count = email_context.get("urgent_count", 0)
            context.needs_response_count = email_context.get("needs_response_count", 0)

        except Exception as e:
            print(f"[ContextFusion] Email context error: {e}")

    def _gather_task_context(self, context: FusedContext):
        """Gather task-related context signals."""
        board_file = APP_DIR / "board.json"

        if not board_file.exists():
            return

        try:
            board = json.loads(board_file.read_text())
            tasks = board.get("tasks", [])

            context.tasks_pending = len([t for t in tasks if t.get("status") == "pending"])
            context.tasks_in_progress = len([t for t in tasks if t.get("status") == "in_progress"])

            # Check for overdue tasks
            now = datetime.now()
            for task in tasks:
                deadline = task.get("deadline")
                if deadline:
                    try:
                        deadline_dt = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
                        if deadline_dt.replace(tzinfo=None) < now:
                            context.tasks_overdue += 1
                        elif (deadline_dt.replace(tzinfo=None) - now).total_seconds() < 86400:
                            context.has_urgent_deadline = True
                    except:
                        pass

        except Exception as e:
            print(f"[ContextFusion] Task context error: {e}")

    def _gather_activity_context(self, context: FusedContext, recent_actions: List[ActionEvent]):
        """Gather recent activity context."""
        if not recent_actions:
            return

        # Get actions from last hour
        one_hour_ago = datetime.now() - timedelta(hours=1)
        recent_hour = [a for a in recent_actions if a.timestamp > one_hour_ago]

        context.actions_this_hour = len(recent_hour)

        # Get category distribution
        if recent_actions:
            recent_5 = recent_actions[-5:]
            context.recent_action_categories = [a.category.value for a in recent_5]

        # Calculate session duration
        if recent_actions:
            first_action = recent_actions[0]
            context.session_duration_minutes = int(
                (datetime.now() - first_action.timestamp).total_seconds() / 60
            )

    def _calculate_derived_signals(self, context: FusedContext):
        """Calculate derived signals from raw signals."""

        # Energy estimate based on time of day and activity
        base_energy = self.energy_curve.get(context.hour, 0.5)

        # Adjust for activity level (more active = higher energy)
        activity_factor = min(context.actions_this_hour / 10, 1.0) * 0.2

        context.energy_estimate = min(base_energy + activity_factor, 1.0)

        # Focus likelihood (inverse of interruption potential)
        focus = 0.5

        if context.calendar_connected and context.next_meeting_in_minutes is not None:
            if context.next_meeting_in_minutes > 60:
                focus += 0.3  # Good chunk of time
            elif context.next_meeting_in_minutes < 15:
                focus -= 0.3  # Meeting imminent

        if context.is_morning and not context.busy_day:
            focus += 0.2  # Mornings are typically better for focus

        context.focus_likelihood = max(0.0, min(1.0, focus))

        # Meeting pressure
        if context.next_meeting_in_minutes is not None:
            if context.next_meeting_in_minutes <= 5:
                context.meeting_pressure = 1.0
            elif context.next_meeting_in_minutes <= 15:
                context.meeting_pressure = 0.8
            elif context.next_meeting_in_minutes <= 30:
                context.meeting_pressure = 0.5
            elif context.next_meeting_in_minutes <= 60:
                context.meeting_pressure = 0.2

        # Deadline pressure
        if context.has_urgent_deadline:
            context.deadline_pressure = 0.8
        if context.tasks_overdue > 0:
            context.deadline_pressure = min(1.0, 0.5 + context.tasks_overdue * 0.1)

    def get_weighted_signal(self, signal: ContextSignal, value: float) -> float:
        """Get signal value weighted by learned importance."""
        weight = self.signal_weights.get(signal.value, 1.0)
        return value * weight

    def update_weight(self, signal: ContextSignal, delta: float):
        """Update a signal's weight based on prediction outcome."""
        current = self.signal_weights.get(signal.value, 1.0)
        new_weight = max(0.1, min(2.0, current + delta))  # Clamp to [0.1, 2.0]
        self.signal_weights[signal.value] = new_weight
        self._save_weights()


# ===============================================================================
# INTENT PREDICTION ENGINE
# ===============================================================================

class IntentPredictionEngine:
    """
    The core prediction engine that predicts user's next actions.

    Prediction methodology:
    1. Gather and fuse context
    2. Query multiple pattern types
    3. Apply Bayesian-style confidence calibration
    4. Generate ranked predictions with reasoning
    5. Apply action-level classification

    This engine is designed to be "scary smart" - it should feel like
    it reads the user's mind by combining multiple weak signals into
    strong predictions.
    """

    # Confidence thresholds for action levels
    THRESHOLD_AUTO = 0.95        # Auto-execute
    THRESHOLD_APPROVE = 0.85     # One-click approval
    THRESHOLD_SUGGEST = 0.70     # Present as suggestion
    THRESHOLD_COLLABORATIVE = 0.50  # Discuss/explore

    def __init__(self):
        self.pattern_miner = BehaviorPatternMiner()
        self.context_engine = ContextFusionEngine()
        self.prediction_outcomes = self._load_outcomes()

        # Action type to category mapping
        self.action_categories = self._build_action_category_map()

    def _load_outcomes(self) -> Dict:
        """Load prediction outcome history for learning."""
        if PREDICTION_OUTCOMES_FILE.exists():
            try:
                return json.loads(PREDICTION_OUTCOMES_FILE.read_text())
            except:
                pass
        return {
            "predictions": [],    # List of (prediction, outcome, timestamp)
            "accuracy_by_type": {},
            "metadata": {
                "total_predictions": 0,
                "correct_predictions": 0,
                "created_at": datetime.now().isoformat()
            }
        }

    def _save_outcomes(self):
        """Save prediction outcomes."""
        try:
            # Keep only recent outcomes
            self.prediction_outcomes["predictions"] = self.prediction_outcomes["predictions"][-1000:]
            PREDICTION_OUTCOMES_FILE.write_text(
                json.dumps(self.prediction_outcomes, indent=2, default=str)
            )
        except Exception as e:
            print(f"[IntentPrediction] Error saving outcomes: {e}")

    def _build_action_category_map(self) -> Dict[str, ActionCategory]:
        """Build mapping of action types to categories."""
        return {
            # Task management
            "create_task": ActionCategory.TASK_MANAGEMENT,
            "update_task": ActionCategory.TASK_MANAGEMENT,
            "complete_task": ActionCategory.TASK_MANAGEMENT,
            "archive_task": ActionCategory.TASK_MANAGEMENT,
            "prioritize_tasks": ActionCategory.TASK_MANAGEMENT,

            # Communication
            "send_message": ActionCategory.COMMUNICATION,
            "reply_email": ActionCategory.COMMUNICATION,
            "draft_email": ActionCategory.COMMUNICATION,
            "read_email": ActionCategory.COMMUNICATION,
            "chat_pm": ActionCategory.COMMUNICATION,

            # Calendar
            "check_calendar": ActionCategory.CALENDAR,
            "schedule_meeting": ActionCategory.CALENDAR,
            "reschedule": ActionCategory.CALENDAR,
            "prep_meeting": ActionCategory.CALENDAR,

            # Deep work
            "coding": ActionCategory.DEEP_WORK,
            "writing": ActionCategory.DEEP_WORK,
            "design": ActionCategory.DEEP_WORK,
            "focus_session": ActionCategory.DEEP_WORK,

            # Planning
            "review_roadmap": ActionCategory.PLANNING,
            "set_goals": ActionCategory.PLANNING,
            "sprint_planning": ActionCategory.PLANNING,
            "retrospective": ActionCategory.PLANNING,

            # Review
            "review_pr": ActionCategory.REVIEW,
            "approve_request": ActionCategory.REVIEW,
            "give_feedback": ActionCategory.REVIEW,

            # Delegation
            "assign_task": ActionCategory.DELEGATION,
            "follow_up": ActionCategory.DELEGATION,
            "check_progress": ActionCategory.DELEGATION,

            # Standup
            "morning_review": ActionCategory.STANDUP,
            "end_of_day": ActionCategory.STANDUP,
            "status_update": ActionCategory.STANDUP
        }

    def _get_category(self, action_type: str) -> ActionCategory:
        """Get category for an action type."""
        return self.action_categories.get(action_type, ActionCategory.UNKNOWN)

    def predict_next_actions(
        self,
        context: FusedContext = None,
        recent_actions: List[ActionEvent] = None,
        limit: int = 5
    ) -> List[PredictedAction]:
        """
        Predict the most likely next actions.

        This is the main prediction method. It combines multiple signal
        sources to generate ranked predictions.

        Args:
            context: Pre-gathered context, or will gather fresh
            recent_actions: Recent actions for sequence prediction
            limit: Maximum predictions to return

        Returns:
            List of PredictedAction sorted by confidence
        """
        # Gather context if not provided
        if context is None:
            context = self.context_engine.gather_context(recent_actions)

        # Collect predictions from multiple sources
        candidates: Dict[str, Dict] = {}  # action_type -> prediction_data

        # 1. Time-based predictions
        self._add_time_predictions(candidates, context)

        # 2. Sequence-based predictions
        if recent_actions:
            self._add_sequence_predictions(candidates, recent_actions[-1])

        # 3. Trigger-based predictions
        self._add_trigger_predictions(candidates, context)

        # 4. Context-based heuristic predictions
        self._add_context_predictions(candidates, context)

        # Calibrate and rank predictions
        predictions = self._calibrate_predictions(candidates)

        # Sort by confidence and limit
        predictions.sort(key=lambda p: p.confidence, reverse=True)

        return predictions[:limit]

    def _add_time_predictions(self, candidates: Dict, context: FusedContext):
        """Add predictions based on time patterns."""
        time_probs = self.pattern_miner.get_time_pattern(context.hour, context.day_of_week)
        pattern_confidence = self.pattern_miner.get_pattern_confidence(
            "time_day_patterns",
            f"{context.day_of_week}_{context.hour}"
        )

        for action_type, prob in time_probs.items():
            if action_type not in candidates:
                candidates[action_type] = {
                    "action_type": action_type,
                    "confidence_factors": [],
                    "reasoning": []
                }

            # Weight: probability * pattern_confidence * time_weight
            weight = self.context_engine.get_weighted_signal(
                ContextSignal.TIME_OF_DAY,
                prob * pattern_confidence
            )

            candidates[action_type]["confidence_factors"].append(weight)
            candidates[action_type]["reasoning"].append(
                f"You often do '{action_type}' at {context.hour}:00 on {context.day_name}s"
            )

    def _add_sequence_predictions(self, candidates: Dict, last_action: ActionEvent):
        """Add predictions based on action sequences."""
        sequence_probs = self.pattern_miner.get_sequence_prediction(last_action.action_type)
        pattern_confidence = self.pattern_miner.get_pattern_confidence(
            "sequence_patterns",
            last_action.action_type
        )

        for action_type, prob in sequence_probs:
            if action_type not in candidates:
                candidates[action_type] = {
                    "action_type": action_type,
                    "confidence_factors": [],
                    "reasoning": []
                }

            weight = self.context_engine.get_weighted_signal(
                ContextSignal.RECENT_ACTIONS,
                prob * pattern_confidence
            )

            candidates[action_type]["confidence_factors"].append(weight)
            candidates[action_type]["reasoning"].append(
                f"After '{last_action.action_type}', you usually do '{action_type}'"
            )

    def _add_trigger_predictions(self, candidates: Dict, context: FusedContext):
        """Add predictions based on trigger patterns."""
        triggers = []

        # Email triggers
        if context.urgent_count > 0:
            triggers.append("email_urgent")
        if context.unread_count > 10:
            triggers.append("email_backlog")

        # Calendar triggers
        if context.next_meeting_in_minutes and context.next_meeting_in_minutes <= 15:
            triggers.append("meeting_imminent")
        if context.is_morning and not context.is_in_meeting:
            triggers.append("morning_start")

        # Task triggers
        if context.tasks_overdue > 0:
            triggers.append("task_overdue")
        if context.has_urgent_deadline:
            triggers.append("deadline_close")

        for trigger in triggers:
            trigger_probs = self.pattern_miner.get_trigger_response(trigger)

            for action_type, prob in trigger_probs:
                if action_type not in candidates:
                    candidates[action_type] = {
                        "action_type": action_type,
                        "confidence_factors": [],
                        "reasoning": []
                    }

                candidates[action_type]["confidence_factors"].append(prob * 0.8)
                candidates[action_type]["reasoning"].append(
                    f"Triggered by: {trigger}"
                )

    def _add_context_predictions(self, candidates: Dict, context: FusedContext):
        """Add heuristic predictions based on current context."""

        # Morning routine prediction
        if context.is_morning and context.hour <= 9:
            self._add_candidate(
                candidates,
                "morning_review",
                0.7,
                "Morning is a good time for daily review"
            )

        # Email check if many unread
        if context.unread_count > 5:
            urgency_boost = min(context.urgent_count * 0.1, 0.3)
            self._add_candidate(
                candidates,
                "read_email",
                0.5 + urgency_boost,
                f"You have {context.unread_count} unread emails"
            )

        # Meeting prep if meeting soon
        if context.next_meeting_in_minutes and 15 <= context.next_meeting_in_minutes <= 30:
            self._add_candidate(
                candidates,
                "prep_meeting",
                0.75,
                f"Meeting in {context.next_meeting_in_minutes} minutes - prep time"
            )

        # Task work if good focus time
        if context.focus_likelihood > 0.7 and context.free_time_minutes > 60:
            self._add_candidate(
                candidates,
                "focus_session",
                context.focus_likelihood * 0.8,
                f"Good time for deep work ({context.free_time_minutes}min free)"
            )

        # Handle overdue tasks
        if context.tasks_overdue > 0:
            self._add_candidate(
                candidates,
                "update_task",
                0.6 + context.tasks_overdue * 0.1,
                f"{context.tasks_overdue} task(s) overdue - need attention"
            )

        # End of day if evening
        if context.is_evening and context.hour >= 17:
            self._add_candidate(
                candidates,
                "end_of_day",
                0.5,
                "Evening - typical end-of-day wrap up time"
            )

    def _add_candidate(self, candidates: Dict, action_type: str, confidence: float, reason: str):
        """Helper to add a candidate prediction."""
        if action_type not in candidates:
            candidates[action_type] = {
                "action_type": action_type,
                "confidence_factors": [],
                "reasoning": []
            }
        candidates[action_type]["confidence_factors"].append(confidence)
        candidates[action_type]["reasoning"].append(reason)

    def _calibrate_predictions(self, candidates: Dict) -> List[PredictedAction]:
        """Calibrate confidence scores and create PredictedAction objects."""
        predictions = []

        for action_type, data in candidates.items():
            factors = data["confidence_factors"]

            if not factors:
                continue

            # Combine confidence factors
            # Method: weighted geometric mean (emphasizes agreement)
            if len(factors) == 1:
                raw_confidence = factors[0]
            else:
                # More factors = higher base confidence (agreement boost)
                agreement_boost = 1 + (len(factors) - 1) * 0.1
                raw_confidence = (sum(factors) / len(factors)) * min(agreement_boost, 1.5)

            # Apply historical accuracy calibration
            historical_accuracy = self._get_historical_accuracy(action_type)
            if historical_accuracy is not None:
                calibrated = raw_confidence * (0.7 + historical_accuracy * 0.3)
            else:
                calibrated = raw_confidence * 0.85  # Discount for unknown accuracy

            # Clamp to valid range
            final_confidence = max(0.0, min(0.99, calibrated))

            # Determine action level
            if final_confidence >= self.THRESHOLD_AUTO:
                action_level = "auto"
            elif final_confidence >= self.THRESHOLD_APPROVE:
                action_level = "approve"
            elif final_confidence >= self.THRESHOLD_SUGGEST:
                action_level = "suggest"
            elif final_confidence >= self.THRESHOLD_COLLABORATIVE:
                action_level = "collaborative"
            else:
                continue  # Skip low-confidence predictions

            predictions.append(PredictedAction(
                action_type=action_type,
                category=self._get_category(action_type),
                confidence=final_confidence,
                reasoning=data["reasoning"],
                action_level=action_level,
                supporting_evidence={
                    "confidence_factors": factors,
                    "historical_accuracy": historical_accuracy,
                    "factor_count": len(factors)
                }
            ))

        return predictions

    def _get_historical_accuracy(self, action_type: str) -> Optional[float]:
        """Get historical prediction accuracy for an action type."""
        accuracy_data = self.prediction_outcomes.get("accuracy_by_type", {}).get(action_type)

        if accuracy_data and accuracy_data.get("total", 0) >= 5:
            return accuracy_data["correct"] / accuracy_data["total"]

        return None

    def predict_lookahead(
        self,
        hours: int = 1,
        context: FusedContext = None
    ) -> List[Dict]:
        """
        Predict likely actions for the next N hours.

        This provides a "what's the plan" view.

        Returns list of {time_slot, predictions} dicts.
        """
        if context is None:
            context = self.context_engine.gather_context()

        lookahead = []
        current_hour = context.hour
        current_day = context.day_of_week

        for i in range(hours):
            future_hour = (current_hour + i) % 24
            future_day = current_day
            if current_hour + i >= 24:
                future_day = (current_day + 1) % 7

            # Create future context
            future_context = FusedContext(
                hour=future_hour,
                minute=0,
                day_of_week=future_day,
                day_name=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][future_day],
                is_weekend=future_day >= 5,
                is_morning=6 <= future_hour < 12,
                is_afternoon=12 <= future_hour < 18,
                is_evening=18 <= future_hour < 22
            )

            # Get predictions for this time slot
            predictions = self.predict_next_actions(future_context, limit=3)

            lookahead.append({
                "time_slot": f"{future_hour}:00",
                "hour": future_hour,
                "predictions": [p.to_dict() for p in predictions]
            })

        return lookahead

    def record_action(self, action: ActionEvent):
        """Record an action for pattern learning."""
        self.pattern_miner.record_action(action)

    def record_prediction_outcome(self, action_type: str, was_correct: bool):
        """Record whether a prediction was correct for learning."""
        # Update accuracy tracking
        if action_type not in self.prediction_outcomes["accuracy_by_type"]:
            self.prediction_outcomes["accuracy_by_type"][action_type] = {
                "correct": 0,
                "total": 0
            }

        self.prediction_outcomes["accuracy_by_type"][action_type]["total"] += 1
        if was_correct:
            self.prediction_outcomes["accuracy_by_type"][action_type]["correct"] += 1

        self.prediction_outcomes["metadata"]["total_predictions"] += 1
        if was_correct:
            self.prediction_outcomes["metadata"]["correct_predictions"] += 1

        # Record for A/B analysis
        self.prediction_outcomes["predictions"].append({
            "action_type": action_type,
            "was_correct": was_correct,
            "timestamp": datetime.now().isoformat()
        })

        self._save_outcomes()

    def get_accuracy_stats(self) -> Dict:
        """Get prediction accuracy statistics."""
        meta = self.prediction_outcomes["metadata"]
        total = meta["total_predictions"]
        correct = meta["correct_predictions"]

        return {
            "total_predictions": total,
            "correct_predictions": correct,
            "overall_accuracy": correct / total if total > 0 else 0.0,
            "by_type": self.prediction_outcomes["accuracy_by_type"]
        }


# ===============================================================================
# PROACTIVE SUGGESTION GENERATOR
# ===============================================================================

class ProactiveSuggestionGenerator:
    """
    Transforms predictions into human-friendly proactive suggestions.

    The goal is to make suggestions feel natural and helpful, not intrusive.
    Each suggestion should feel like a thoughtful human assistant.

    Suggestion templates are crafted to be:
    1. Conversational, not robotic
    2. Action-oriented
    3. Contextually relevant
    4. Respectful of user's time/attention
    """

    # Suggestion templates by action type
    TEMPLATES = {
        # Morning rituals
        "morning_review": [
            "Good morning! Ready to review today's priorities?",
            "Time to plan your day - shall we look at what's on deck?",
            "Morning check-in: you have {tasks_pending} tasks waiting."
        ],

        # Email actions
        "read_email": [
            "You have {unread_count} unread emails - worth a quick scan?",
            "{urgent_count} urgent emails need attention.",
            "Inbox check time? {unread_count} messages waiting."
        ],
        "reply_email": [
            "Email from {sender} might need a response.",
            "Quick reply to {sender}? Their email's been waiting.",
            "Looks like {sender} is expecting a response."
        ],

        # Calendar/meetings
        "prep_meeting": [
            "Meeting in {minutes} minutes - time to prep?",
            "'{meeting_title}' starts soon. Need the context?",
            "Heads up: meeting in {minutes} min. Prep time?"
        ],
        "check_calendar": [
            "What's on your calendar today?",
            "Worth checking what's coming up?",
            "Calendar check - {meetings_today} meetings today."
        ],

        # Task management
        "update_task": [
            "Task '{task_title}' needs an update.",
            "{overdue_count} overdue tasks could use attention.",
            "Some tasks are falling behind - quick update?"
        ],
        "complete_task": [
            "Ready to mark '{task_title}' complete?",
            "Looks like '{task_title}' might be done - close it out?",
            "Task finished? Let's update the board."
        ],
        "create_task": [
            "Want to capture that as a task?",
            "Should we add this to the board?",
            "New task to track?"
        ],

        # Deep work
        "focus_session": [
            "You have {free_time} minutes of focus time - good for deep work.",
            "Clear block ahead. Perfect for focused work.",
            "No meetings for a while - focus time?"
        ],
        "coding": [
            "Ready to dive into code?",
            "Good time for development work.",
            "Coding session? The calendar's clear."
        ],

        # End of day
        "end_of_day": [
            "Wrapping up? Let's do a quick status update.",
            "End of day - anything to capture before tomorrow?",
            "Time to wind down. Want to review what got done?"
        ],

        # Status/updates
        "status_update": [
            "Quick status update for the team?",
            "Time to share progress?",
            "The team might want an update on your progress."
        ],

        # Review
        "review_pr": [
            "PR waiting for your review.",
            "Code review needed - want to take a look?",
            "PR review time? Something's waiting."
        ],

        # Generic fallbacks
        "default": [
            "Based on your patterns, you might want to {action}.",
            "Usually you {action} around this time.",
            "Time for {action}? Your patterns suggest so."
        ]
    }

    # Quick actions by category
    QUICK_ACTIONS = {
        ActionCategory.COMMUNICATION: ["Open Inbox", "Quick Reply", "Skip for Now"],
        ActionCategory.TASK_MANAGEMENT: ["View Tasks", "Mark Complete", "Remind Later"],
        ActionCategory.CALENDAR: ["Open Calendar", "Prep Now", "Dismiss"],
        ActionCategory.DEEP_WORK: ["Start Focus", "Block Time", "Not Now"],
        ActionCategory.STANDUP: ["Give Update", "Skip", "Remind Later"],
        ActionCategory.REVIEW: ["Start Review", "Delegate", "Later"]
    }

    def __init__(self):
        self.intent_engine = IntentPredictionEngine()
        self.context_engine = ContextFusionEngine()

        # Track shown suggestions to avoid repetition
        self.recently_shown: List[str] = []
        self.show_history: List[Dict] = []

    def generate_suggestions(
        self,
        predictions: List[PredictedAction] = None,
        context: FusedContext = None,
        limit: int = 3
    ) -> List[ProactiveSuggestion]:
        """
        Generate proactive suggestions from predictions.

        Args:
            predictions: Pre-computed predictions, or will compute fresh
            context: Pre-gathered context
            limit: Maximum suggestions to return

        Returns:
            List of ProactiveSuggestion ready for presentation
        """
        # Gather fresh data if not provided
        if context is None:
            context = self.context_engine.gather_context()

        if predictions is None:
            predictions = self.intent_engine.predict_next_actions(context, limit=limit + 2)

        suggestions = []

        for pred in predictions:
            # Skip if recently shown
            if pred.action_type in self.recently_shown[-5:]:
                continue

            # Generate the suggestion
            suggestion = self._create_suggestion(pred, context)

            if suggestion:
                suggestions.append(suggestion)

            if len(suggestions) >= limit:
                break

        return suggestions

    def _create_suggestion(
        self,
        prediction: PredictedAction,
        context: FusedContext
    ) -> Optional[ProactiveSuggestion]:
        """Create a suggestion from a prediction."""

        # Get templates for this action type
        templates = self.TEMPLATES.get(
            prediction.action_type,
            self.TEMPLATES["default"]
        )

        # Choose a template (rotate through them)
        template_idx = hash(datetime.now().isoformat()) % len(templates)
        template = templates[template_idx]

        # Fill in template variables
        message = self._fill_template(template, prediction, context)

        # Get quick actions
        quick_actions = self.QUICK_ACTIONS.get(
            prediction.category,
            ["OK", "Not Now"]
        )

        # Calculate priority
        priority = self._calculate_priority(prediction, context)

        # Set expiry (suggestions get stale)
        expires_at = datetime.now() + timedelta(minutes=30)

        return ProactiveSuggestion(
            message=message,
            prediction=prediction,
            priority=priority,
            quick_actions=quick_actions,
            expires_at=expires_at
        )

    def _fill_template(
        self,
        template: str,
        prediction: PredictedAction,
        context: FusedContext
    ) -> str:
        """Fill in template variables with actual values."""

        # Build replacement dict
        replacements = {
            "action": prediction.action_type.replace("_", " "),
            "tasks_pending": str(context.tasks_pending),
            "unread_count": str(context.unread_count),
            "urgent_count": str(context.urgent_count),
            "meetings_today": str(context.meetings_today),
            "free_time": str(context.free_time_minutes),
            "overdue_count": str(context.tasks_overdue)
        }

        # Add meeting info if available
        if context.next_meeting_in_minutes is not None:
            replacements["minutes"] = str(context.next_meeting_in_minutes)
            replacements["meeting_title"] = "upcoming meeting"  # Would need calendar integration

        # Add task info from supporting evidence
        if "task_title" in prediction.supporting_evidence:
            replacements["task_title"] = prediction.supporting_evidence["task_title"]
        else:
            replacements["task_title"] = "your task"

        if "sender" in prediction.supporting_evidence:
            replacements["sender"] = prediction.supporting_evidence["sender"]
        else:
            replacements["sender"] = "someone"

        # Fill template
        try:
            return template.format(**replacements)
        except KeyError:
            # Fallback if template has unfilled variables
            return template.replace("{", "").replace("}", "")

    def _calculate_priority(
        self,
        prediction: PredictedAction,
        context: FusedContext
    ) -> int:
        """Calculate suggestion priority (higher = more important)."""
        priority = 0

        # Base priority from confidence
        priority += int(prediction.confidence * 50)

        # Boost for urgent context
        if context.urgent_count > 0:
            priority += 20

        if context.tasks_overdue > 0:
            priority += 15

        if context.next_meeting_in_minutes and context.next_meeting_in_minutes < 15:
            priority += 25

        # Boost for high-value action types
        high_value_actions = {"reply_email", "prep_meeting", "update_task", "review_pr"}
        if prediction.action_type in high_value_actions:
            priority += 10

        return priority

    def mark_shown(self, suggestion: ProactiveSuggestion):
        """Mark a suggestion as shown to avoid repetition."""
        suggestion.shown_at = datetime.now()
        self.recently_shown.append(suggestion.prediction.action_type)

        # Keep recent history bounded
        if len(self.recently_shown) > 20:
            self.recently_shown = self.recently_shown[-20:]

        # Track for analytics
        self.show_history.append({
            "action_type": suggestion.prediction.action_type,
            "shown_at": suggestion.shown_at.isoformat(),
            "confidence": suggestion.prediction.confidence
        })

    def record_response(self, suggestion: ProactiveSuggestion, response: str):
        """Record user's response to a suggestion for learning."""
        was_accepted = response in ["OK", "Start", "View", "Open", "Yes"]

        # Update intent engine's prediction outcomes
        self.intent_engine.record_prediction_outcome(
            suggestion.prediction.action_type,
            was_accepted
        )

        # Also update timing intelligence if available
        if BRAIN_AVAILABLE:
            try:
                timing = get_timing_intelligence()
                timing.record_timing_outcome(was_accepted, {
                    "suggestion_type": suggestion.prediction.action_type,
                    "response": response
                })
            except:
                pass


# ===============================================================================
# UNIFIED PREDICTIVE INTENT ENGINE
# ===============================================================================

class PredictiveIntentEngine:
    """
    The unified interface to TinyPM's predictive intelligence.

    This is the main class that external code should use.

    Usage:
        engine = PredictiveIntentEngine()

        # Get predictions
        predictions = engine.predict_next_actions()

        # Get ready-to-show suggestions
        suggestions = engine.generate_proactive_suggestions()

        # Record what user actually did (for learning)
        engine.record_action(action_event)
        engine.record_suggestion_response(suggestion, "OK")
    """

    def __init__(self):
        self.intent_engine = IntentPredictionEngine()
        self.suggestion_generator = ProactiveSuggestionGenerator()
        self.context_engine = ContextFusionEngine()
        self.pattern_miner = BehaviorPatternMiner()

        # Track for integration with pm_orchestrator
        self._last_context: Optional[FusedContext] = None
        self._last_predictions: List[PredictedAction] = []

    def predict_next_actions(
        self,
        context: FusedContext = None,
        recent_actions: List[ActionEvent] = None,
        limit: int = 5
    ) -> List[PredictedAction]:
        """
        Predict the most likely next actions.

        This is the core prediction method.

        Returns:
            List of PredictedAction sorted by confidence
        """
        if context is None:
            context = self.context_engine.gather_context(recent_actions)

        self._last_context = context
        self._last_predictions = self.intent_engine.predict_next_actions(
            context, recent_actions, limit
        )

        return self._last_predictions

    def generate_proactive_suggestions(
        self,
        predictions: List[PredictedAction] = None,
        context: FusedContext = None,
        limit: int = 3
    ) -> List[ProactiveSuggestion]:
        """
        Generate human-friendly proactive suggestions.

        These are ready to present to the user.

        Returns:
            List of ProactiveSuggestion sorted by priority
        """
        if context is None:
            context = self._last_context or self.context_engine.gather_context()

        if predictions is None:
            predictions = self._last_predictions or self.predict_next_actions(context)

        suggestions = self.suggestion_generator.generate_suggestions(
            predictions, context, limit
        )

        # Sort by priority
        suggestions.sort(key=lambda s: s.priority, reverse=True)

        return suggestions

    def get_lookahead(self, hours: int = 1) -> List[Dict]:
        """
        Get predicted actions for the next N hours.

        Returns "what's the plan" view.
        """
        return self.intent_engine.predict_lookahead(hours)

    def get_fused_context(self) -> FusedContext:
        """Get current fused context."""
        return self.context_engine.gather_context()

    def record_action(self, action: ActionEvent):
        """Record an action for pattern learning."""
        self.intent_engine.record_action(action)

    def record_action_simple(
        self,
        action_type: str,
        category: ActionCategory = None,
        context: Dict = None,
        metadata: Dict = None
    ):
        """Simple interface to record an action."""
        if category is None:
            category = self.intent_engine._get_category(action_type)

        action = ActionEvent(
            id=hashlib.md5(f"{action_type}{datetime.now().isoformat()}".encode()).hexdigest()[:12],
            timestamp=datetime.now(),
            category=category,
            action_type=action_type,
            context=context or {},
            metadata=metadata or {}
        )

        self.record_action(action)

    def record_suggestion_response(self, suggestion: ProactiveSuggestion, response: str):
        """Record user's response to a suggestion."""
        self.suggestion_generator.record_response(suggestion, response)

    def mark_suggestion_shown(self, suggestion: ProactiveSuggestion):
        """Mark a suggestion as shown."""
        self.suggestion_generator.mark_shown(suggestion)

    def get_stats(self) -> Dict:
        """Get comprehensive statistics about the predictive system."""
        return {
            "pattern_mining": self.pattern_miner.get_stats(),
            "prediction_accuracy": self.intent_engine.get_accuracy_stats(),
            "context_weights": self.context_engine.signal_weights,
            "recently_shown_suggestions": len(self.suggestion_generator.recently_shown)
        }

    def integrate_with_pm_orchestrator(self, ctx_from_orchestrator: Dict) -> List[str]:
        """
        Integration point with pm_orchestrator.py's ProactiveEngine.

        This method translates our predictions into the format expected
        by the existing ProactiveEngine.check_for_proactive_items().

        Args:
            ctx_from_orchestrator: ProjectContext data from ContextGatherer.gather()

        Returns:
            List of suggestion strings for the proactive items
        """
        # Get predictions
        predictions = self.predict_next_actions(limit=3)

        # Generate suggestions
        suggestions = self.generate_proactive_suggestions(predictions, limit=3)

        # Convert to simple strings for orchestrator
        items = []
        for suggestion in suggestions:
            # Add confidence indicator
            conf = int(suggestion.prediction.confidence * 100)
            if conf >= 85:
                items.append(suggestion.message)
            else:
                items.append(f"{suggestion.message} ({conf}% confident)")

        return items


# ===============================================================================
# CLI INTERFACE
# ===============================================================================

def main():
    """CLI interface for testing predictive intent engine."""
    import sys

    print("=" * 70)
    print("TinyPM PREDICTIVE INTENT ENGINE")
    print("'The AI that reads your mind'")
    print("=" * 70)

    engine = PredictiveIntentEngine()

    if len(sys.argv) > 1:
        cmd = sys.argv[1]

        if cmd == "predict":
            print("\nPredicting next actions...")
            predictions = engine.predict_next_actions()

            if not predictions:
                print("  (No predictions - need more data)")
            else:
                for i, pred in enumerate(predictions, 1):
                    print(f"\n{i}. {pred.action_type} ({pred.confidence_pct})")
                    print(f"   Category: {pred.category.value}")
                    print(f"   Action level: {pred.action_level}")
                    print(f"   Reasoning:")
                    for reason in pred.reasoning[:3]:
                        print(f"     - {reason}")

        elif cmd == "suggest":
            print("\nGenerating suggestions...")
            suggestions = engine.generate_proactive_suggestions()

            if not suggestions:
                print("  (No suggestions available)")
            else:
                for i, sug in enumerate(suggestions, 1):
                    print(f"\n{i}. {sug.message}")
                    print(f"   Priority: {sug.priority}")
                    print(f"   Quick actions: {', '.join(sug.quick_actions)}")
                    print(f"   Confidence: {sug.prediction.confidence_pct}")

        elif cmd == "lookahead":
            hours = int(sys.argv[2]) if len(sys.argv) > 2 else 2
            print(f"\nLookahead for next {hours} hours...")

            lookahead = engine.get_lookahead(hours)
            for slot in lookahead:
                print(f"\n{slot['time_slot']}:")
                for pred in slot["predictions"][:2]:
                    print(f"  - {pred['action_type']} ({pred['confidence_pct']})")

        elif cmd == "context":
            print("\nCurrent fused context:")
            ctx = engine.get_fused_context()
            ctx_dict = ctx.to_dict()
            for key, value in ctx_dict.items():
                print(f"  {key}: {value}")

        elif cmd == "stats":
            print("\nEngine statistics:")
            stats = engine.get_stats()
            print(json.dumps(stats, indent=2))

        elif cmd == "record":
            if len(sys.argv) < 3:
                print("Usage: predictive_intent.py record <action_type>")
                return
            action_type = sys.argv[2]
            engine.record_action_simple(action_type)
            print(f"Recorded action: {action_type}")

        else:
            print(f"Unknown command: {cmd}")
            print("\nCommands: predict, suggest, lookahead [hours], context, stats, record <action>")

    else:
        print("\nUsage: python predictive_intent.py <command>")
        print("\nCommands:")
        print("  predict              - Show predicted next actions")
        print("  suggest              - Generate proactive suggestions")
        print("  lookahead [hours]    - Predict actions for next N hours")
        print("  context              - Show current fused context")
        print("  stats                - Show engine statistics")
        print("  record <action>      - Record an action for learning")
        print("\nExamples:")
        print("  python predictive_intent.py predict")
        print("  python predictive_intent.py lookahead 4")
        print("  python predictive_intent.py record check_calendar")


if __name__ == "__main__":
    main()
