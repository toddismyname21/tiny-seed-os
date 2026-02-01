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
import random
from collections import defaultdict, Counter
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, Set
import hashlib
import re

# For Supabase integration (optional)
try:
    from supabase import create_client, Client
    import os
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
    if SUPABASE_URL and SUPABASE_KEY:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        SUPABASE_AVAILABLE = True
    else:
        SUPABASE_AVAILABLE = False
except ImportError:
    SUPABASE_AVAILABLE = False


# ===============================================================================
# CONFIGURATION
# ===============================================================================

APP_DIR = Path(__file__).parent

# Persistent storage files
INTENT_PATTERNS_FILE = APP_DIR / ".pm_intent_patterns.json"
INTENT_HISTORY_FILE = APP_DIR / ".pm_intent_history.json"
PREDICTION_OUTCOMES_FILE = APP_DIR / ".pm_prediction_outcomes.json"
LEARNED_WEIGHTS_FILE = APP_DIR / ".pm_learned_weights.json"
CALIBRATION_DATA_FILE = APP_DIR / ".pm_calibration_data.json"
ENERGY_PATTERNS_FILE = APP_DIR / ".pm_energy_patterns.json"
FEEDBACK_HISTORY_FILE = APP_DIR / ".pm_feedback_history.json"

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
# CONFIDENCE CALIBRATOR - STATE OF THE ART (2026)
# ===============================================================================

class ConfidenceCalibrator:
    """
    State-of-the-art confidence calibration using temperature scaling
    and historical blending.

    Research basis:
    - Temperature scaling: calibrated_prob = sigmoid(logit(raw_prob) / temperature)
      - logit(p) = log(p / (1-p))
      - sigmoid(x) = 1 / (1 + exp(-x))
    - When temperature > 1: Makes predictions LESS confident (more spread)
    - When temperature < 1: Makes predictions MORE confident (more peaked)
    - Historical blending: 60% current + 40% track record
    - Target: Expected Calibration Error (ECE) < 10%

    Modern neural networks are systematically overconfident. This class
    ensures that when we say "85% confident", the prediction is actually
    correct ~85% of the time.
    """

    # Target calibration error threshold
    TARGET_ECE = 0.10  # 10%

    # Minimum samples before we trust historical accuracy
    MIN_SAMPLES_FOR_HISTORY = 10

    # Bins for ECE calculation
    NUM_CALIBRATION_BINS = 10

    def __init__(self):
        self.calibration_data = self._load_calibration_data()

        # Default temperature (>1.0 = less confident, <1.0 = more confident)
        self.default_temperature = 1.5  # Start conservative (less confident)

    def _load_calibration_data(self) -> Dict:
        """Load calibration data from storage."""
        if CALIBRATION_DATA_FILE.exists():
            try:
                return json.loads(CALIBRATION_DATA_FILE.read_text())
            except Exception as e:
                print(f"[ConfidenceCalibrator] Error loading data: {e}")

        return {
            "temperatures": {},          # action_type -> learned temperature
            "prediction_log": [],        # List of (predicted_conf, actual_correct, action_type)
            "calibration_metrics": {
                "ece": None,             # Expected Calibration Error
                "mce": None,             # Maximum Calibration Error
                "last_calculated": None
            },
            "bin_accuracies": {},        # For reliability diagram
            "metadata": {
                "created_at": datetime.now().isoformat(),
                "total_calibrations": 0
            }
        }

    def _save_calibration_data(self):
        """Save calibration data to storage."""
        try:
            CALIBRATION_DATA_FILE.write_text(
                json.dumps(self.calibration_data, indent=2, default=str)
            )
        except Exception as e:
            print(f"[ConfidenceCalibrator] Error saving data: {e}")

        # Also sync to Supabase if available
        if SUPABASE_AVAILABLE:
            try:
                supabase.table("pm_calibration").upsert({
                    "id": "confidence_calibrator",
                    "data": self.calibration_data,
                    "updated_at": datetime.now().isoformat()
                }).execute()
            except Exception as e:
                print(f"[ConfidenceCalibrator] Supabase sync error: {e}")

    def _temperature_scale(self, confidence: float, temperature: float) -> float:
        """
        Apply temperature scaling using correct logit transformation.

        Formula: calibrated = sigmoid(logit(p) / temperature)

        This is the CORRECT temperature scaling formula:
        - logit(p) = log(p / (1-p)) converts probability to log-odds
        - Dividing by temperature > 1 shrinks log-odds toward 0 (less confident)
        - Dividing by temperature < 1 expands log-odds away from 0 (more confident)
        - sigmoid converts back to probability space

        Args:
            confidence: Raw confidence value (0.0 to 1.0)
            temperature: Temperature parameter (>1 = less confident, <1 = more confident)

        Returns:
            Temperature-scaled confidence
        """
        # Epsilon to prevent log(0) or division by zero at boundaries
        EPSILON = 1e-7

        # Clamp confidence to valid range with epsilon buffer
        p = max(EPSILON, min(1.0 - EPSILON, confidence))

        # Convert to logit (log-odds)
        logit = math.log(p / (1.0 - p))

        # Scale by temperature
        scaled_logit = logit / temperature

        # Convert back to probability via sigmoid
        calibrated = 1.0 / (1.0 + math.exp(-scaled_logit))

        return calibrated

    def calibrate(
        self,
        raw_confidence: float,
        action_type: str,
        prediction_history: Optional[Dict] = None
    ) -> float:
        """
        Calibrate a raw confidence score using temperature scaling
        and historical blending.

        Args:
            raw_confidence: The raw prediction confidence (0.0-1.0)
            action_type: The action type being predicted
            prediction_history: Optional dict with 'correct' and 'total' counts

        Returns:
            Calibrated confidence score (0.0-0.95)
        """
        # Step 1: Apply temperature scaling using logit transformation
        # Formula: calibrated = sigmoid(logit(p) / temperature)
        # - temperature > 1: less confident (spreads distribution)
        # - temperature < 1: more confident (sharpens distribution)
        temperature = self.calibration_data["temperatures"].get(
            action_type, self.default_temperature
        )
        temp_scaled = self._temperature_scale(raw_confidence, temperature)

        # Step 2: Blend with historical accuracy (60% current + 40% history)
        if prediction_history and prediction_history.get("total", 0) >= self.MIN_SAMPLES_FOR_HISTORY:
            historical_accuracy = prediction_history["correct"] / prediction_history["total"]
            # 60% temperature-scaled + 40% historical
            calibrated = 0.6 * temp_scaled + 0.4 * historical_accuracy
        else:
            # Discount for unknown accuracy (be more conservative)
            calibrated = temp_scaled * 0.7

        # Track for metrics
        self.calibration_data["metadata"]["total_calibrations"] += 1

        # Clamp to valid range (cap at 95% - never be "certain")
        return max(0.0, min(0.95, calibrated))

    def record_prediction_outcome(
        self,
        predicted_confidence: float,
        was_correct: bool,
        action_type: str
    ):
        """
        Record the outcome of a prediction for calibration learning.

        This is the feedback loop that allows the calibrator to learn
        optimal temperatures for each action type.
        """
        # Add to prediction log
        self.calibration_data["prediction_log"].append({
            "confidence": predicted_confidence,
            "correct": was_correct,
            "action_type": action_type,
            "timestamp": datetime.now().isoformat()
        })

        # Keep log bounded
        if len(self.calibration_data["prediction_log"]) > 5000:
            self.calibration_data["prediction_log"] = \
                self.calibration_data["prediction_log"][-5000:]

        # Periodically recalculate calibration metrics and adjust temperatures
        if len(self.calibration_data["prediction_log"]) % 50 == 0:
            self._recalculate_calibration()
            self._adjust_temperatures()

        self._save_calibration_data()

    def _recalculate_calibration(self):
        """
        Recalculate Expected Calibration Error (ECE) and bin accuracies.

        ECE = Sum over bins of: (bin_weight * |accuracy - confidence|)

        A well-calibrated model has ECE close to 0.
        """
        log = self.calibration_data["prediction_log"]
        if len(log) < 20:
            return

        # Create bins
        bins = [[] for _ in range(self.NUM_CALIBRATION_BINS)]
        bin_size = 1.0 / self.NUM_CALIBRATION_BINS

        for entry in log:
            conf = entry["confidence"]
            bin_idx = min(int(conf / bin_size), self.NUM_CALIBRATION_BINS - 1)
            bins[bin_idx].append(entry)

        # Calculate ECE and bin accuracies
        ece = 0.0
        mce = 0.0
        bin_accuracies = {}

        for i, bin_entries in enumerate(bins):
            if not bin_entries:
                continue

            # Average confidence in this bin
            avg_confidence = sum(e["confidence"] for e in bin_entries) / len(bin_entries)

            # Actual accuracy in this bin
            actual_accuracy = sum(1 for e in bin_entries if e["correct"]) / len(bin_entries)

            # Weight by number of samples
            weight = len(bin_entries) / len(log)

            # Calibration error for this bin
            bin_error = abs(actual_accuracy - avg_confidence)

            ece += weight * bin_error
            mce = max(mce, bin_error)

            # Store for reliability diagram
            bin_label = f"{i * bin_size:.1f}-{(i + 1) * bin_size:.1f}"
            bin_accuracies[bin_label] = {
                "avg_confidence": round(avg_confidence, 3),
                "actual_accuracy": round(actual_accuracy, 3),
                "count": len(bin_entries),
                "error": round(bin_error, 3)
            }

        self.calibration_data["calibration_metrics"] = {
            "ece": round(ece, 4),
            "mce": round(mce, 4),
            "last_calculated": datetime.now().isoformat()
        }
        self.calibration_data["bin_accuracies"] = bin_accuracies

        print(f"[ConfidenceCalibrator] ECE: {ece:.3f}, MCE: {mce:.3f}")

    def _adjust_temperatures(self):
        """
        Adjust temperatures per action type to reduce calibration error.

        If predictions are overconfident (confidence > accuracy), increase temperature.
        If underconfident (confidence < accuracy), decrease temperature.
        """
        log = self.calibration_data["prediction_log"][-500:]  # Recent predictions

        # Group by action type
        by_type: Dict[str, List] = defaultdict(list)
        for entry in log:
            by_type[entry["action_type"]].append(entry)

        for action_type, entries in by_type.items():
            if len(entries) < 10:
                continue

            avg_confidence = sum(e["confidence"] for e in entries) / len(entries)
            actual_accuracy = sum(1 for e in entries if e["correct"]) / len(entries)

            # Calibration error direction
            error = avg_confidence - actual_accuracy

            # Adjust temperature
            current_temp = self.calibration_data["temperatures"].get(
                action_type, self.default_temperature
            )

            if error > 0.05:  # Overconfident
                # Increase temperature (softens probabilities)
                new_temp = min(current_temp + 0.1, 3.0)
            elif error < -0.05:  # Underconfident
                # Decrease temperature (sharpens probabilities)
                new_temp = max(current_temp - 0.1, 0.5)
            else:
                # Well calibrated
                new_temp = current_temp

            self.calibration_data["temperatures"][action_type] = new_temp

    def get_calibration_stats(self) -> Dict:
        """Get calibration statistics."""
        ece = self.calibration_data["calibration_metrics"].get("ece")
        return {
            "ece": ece,
            "mce": self.calibration_data["calibration_metrics"].get("mce"),
            "target_ece": self.TARGET_ECE,
            "is_well_calibrated": (
                ece is not None and ece < self.TARGET_ECE
            ),
            "total_predictions_logged": len(self.calibration_data["prediction_log"]),
            "temperatures": self.calibration_data["temperatures"],
            "bin_accuracies": self.calibration_data["bin_accuracies"]
        }


# ===============================================================================
# TASK BOUNDARY DETECTOR - STATE OF THE ART (2026)
# ===============================================================================

class TaskBoundaryDetector:
    """
    Detects natural task boundaries for non-intrusive suggestions.

    Research basis (IUI '26):
    - Interruptions at task boundaries are 49.7% faster to respond to
    - ML can infer task boundaries from behavior patterns
    - Natural transition points minimize disruption

    Don't interrupt during deep work. Detect when user finishes a task
    and is in a natural transition state - that's the magic moment.
    """

    # Boundary signal types
    BOUNDARY_SIGNALS = [
        'task_completed',           # User completed a task
        'session_start',            # Beginning of work session
        'context_switch',           # Switched task category
        'meeting_ended',            # Meeting just ended
        'long_pause',               # >5 min inactivity
        'email_sent',               # Email sent (natural break)
        'commit_pushed',            # Code committed
        'document_saved',           # Document saved
    ]

    # Deep work indicators (don't interrupt)
    DEEP_WORK_PATTERNS = [
        ActionCategory.DEEP_WORK,
        ActionCategory.RESEARCH,
    ]

    # Minimum deep work session before protecting
    MIN_DEEP_WORK_MINUTES = 15

    def __init__(self):
        self.last_activity = datetime.now()
        self.current_task_category: Optional[ActionCategory] = None
        self.deep_work_started: Optional[datetime] = None
        self.recent_boundaries: List[Dict] = []
        self.boundary_stats = self._load_boundary_stats()

    def _load_boundary_stats(self) -> Dict:
        """Load boundary detection statistics."""
        # Could persist this, but keeping in-memory for simplicity
        return {
            "boundaries_detected": 0,
            "suggestions_at_boundary": 0,
            "acceptance_at_boundary": 0,
            "acceptance_not_at_boundary": 0
        }

    def check_boundary(self, new_action: Optional[ActionEvent] = None) -> Tuple[bool, List[str]]:
        """
        Check if this is a good moment to make a suggestion.

        Args:
            new_action: The action just taken (or None for periodic check)

        Returns:
            Tuple of (is_boundary, list_of_signals_detected)
        """
        signals_detected = []
        now = datetime.now()

        # Check for long pause (natural boundary)
        pause_seconds = (now - self.last_activity).total_seconds()
        pause_minutes = pause_seconds / 60

        if pause_minutes >= 5 and pause_minutes < 30:
            # 5-30 min pause = natural boundary
            # >30 min = might have left, don't interrupt on return
            signals_detected.append("long_pause")

        if new_action:
            # Check for task completion signals
            completion_actions = [
                'complete_task', 'send_message', 'send_email',
                'push_commit', 'save_document', 'end_meeting',
                'close_ticket', 'mark_done', 'archive'
            ]
            if any(ca in new_action.action_type for ca in completion_actions):
                signals_detected.append("task_completed")

            # Check for context switch (category change)
            if self.current_task_category and new_action.category != self.current_task_category:
                # Switching categories = task boundary
                signals_detected.append("context_switch")

            # Check for session start (first action after gap)
            if pause_minutes >= 30:
                signals_detected.append("session_start")

            # Update tracking
            self.current_task_category = new_action.category
            self.last_activity = now

            # Track deep work sessions
            if new_action.category in self.DEEP_WORK_PATTERNS:
                if self.deep_work_started is None:
                    self.deep_work_started = now
            else:
                self.deep_work_started = None

        # Check if in protected deep work session
        if self.deep_work_started:
            deep_work_minutes = (now - self.deep_work_started).total_seconds() / 60
            if deep_work_minutes >= self.MIN_DEEP_WORK_MINUTES:
                # In protected deep work - NOT a boundary
                return (False, ["in_deep_work"])

        is_boundary = len(signals_detected) > 0

        if is_boundary:
            self.boundary_stats["boundaries_detected"] += 1
            self.recent_boundaries.append({
                "timestamp": now.isoformat(),
                "signals": signals_detected
            })
            # Keep bounded
            self.recent_boundaries = self.recent_boundaries[-100:]

        return (is_boundary, signals_detected)

    def get_time_until_next_boundary(self) -> Optional[int]:
        """
        Estimate minutes until next natural boundary.

        Based on historical patterns of boundary timing.
        Returns None if unknown.
        """
        if len(self.recent_boundaries) < 5:
            return None

        # Calculate average time between boundaries
        boundaries_with_time = []
        for i in range(1, len(self.recent_boundaries)):
            prev = datetime.fromisoformat(self.recent_boundaries[i-1]["timestamp"])
            curr = datetime.fromisoformat(self.recent_boundaries[i]["timestamp"])
            gap_minutes = (curr - prev).total_seconds() / 60
            if gap_minutes < 120:  # Only count gaps < 2 hours
                boundaries_with_time.append(gap_minutes)

        if not boundaries_with_time:
            return None

        avg_gap = statistics.mean(boundaries_with_time)
        time_since_last = (datetime.now() - datetime.fromisoformat(
            self.recent_boundaries[-1]["timestamp"]
        )).total_seconds() / 60

        estimated_remaining = max(0, avg_gap - time_since_last)
        return int(estimated_remaining)

    def record_suggestion_outcome(self, was_at_boundary: bool, was_accepted: bool):
        """Record whether suggestions at boundaries are more effective."""
        self.boundary_stats["suggestions_at_boundary"] += (1 if was_at_boundary else 0)
        if was_accepted:
            if was_at_boundary:
                self.boundary_stats["acceptance_at_boundary"] += 1
            else:
                self.boundary_stats["acceptance_not_at_boundary"] += 1

    def get_boundary_effectiveness(self) -> Dict:
        """Get statistics on boundary-based suggestion effectiveness."""
        at_boundary = self.boundary_stats["suggestions_at_boundary"]
        acc_at = self.boundary_stats["acceptance_at_boundary"]

        total = self.boundary_stats["boundaries_detected"]
        not_at = total - at_boundary if total > at_boundary else 0
        acc_not = self.boundary_stats["acceptance_not_at_boundary"]

        return {
            "boundaries_detected": self.boundary_stats["boundaries_detected"],
            "acceptance_rate_at_boundary": acc_at / at_boundary if at_boundary > 0 else None,
            "acceptance_rate_not_at_boundary": acc_not / not_at if not_at > 0 else None,
            "boundary_boost": (
                (acc_at / at_boundary) / (acc_not / not_at)
                if at_boundary > 0 and not_at > 0 and acc_not > 0
                else None
            )
        }


# ===============================================================================
# IMPLICIT FEEDBACK COLLECTOR - STATE OF THE ART (2026)
# ===============================================================================

class ImplicitFeedbackCollector:
    """
    Collects implicit feedback from user behavior patterns.

    Research basis:
    - Each action feeds the model, making predictions sharper
    - Implicit signals: acceptance time, dismissal patterns, follow-through
    - Automatic model improvement without explicit ratings

    The system learns from what you DO, not what you say.
    """

    # Feedback signal types
    IMPLICIT_ACCEPT_SIGNALS = [
        "user_did_suggested_action",      # User did what we suggested
        "quick_response",                  # Fast action after suggestion (< 2 min)
        "clicked_quick_action",            # Clicked one of the quick action buttons
        "engaged_with_suggestion",         # Opened/expanded suggestion
    ]

    IMPLICIT_REJECT_SIGNALS = [
        "suggestion_expired",              # Suggestion timed out without action
        "explicit_dismiss",                # User clicked dismiss
        "did_different_action",            # User did something else immediately
        "ignored_multiple_times",          # Same suggestion ignored 3+ times
    ]

    # Time thresholds
    QUICK_RESPONSE_SECONDS = 120          # < 2 min = quick response
    SUGGESTION_TIMEOUT_MINUTES = 30       # After 30 min = implicit reject
    IMMEDIATE_ACTION_SECONDS = 10         # < 10 sec = very strong signal

    def __init__(self):
        self.pending_suggestions: Dict[str, Tuple[Any, datetime]] = {}
        self.feedback_history: List[Dict] = []
        self.feedback_patterns = self._load_feedback_patterns()

    def _load_feedback_patterns(self) -> Dict:
        """Load learned feedback patterns."""
        if FEEDBACK_HISTORY_FILE.exists():
            try:
                data = json.loads(FEEDBACK_HISTORY_FILE.read_text())
                return data.get("patterns", {})
            except:
                pass

        return {
            "action_acceptance_rates": {},    # action_type -> acceptance rate
            "time_of_day_rates": {},          # hour -> acceptance rate
            "context_signals": {},            # context_key -> impact on acceptance
            "suggestion_fatigue": {           # Track suggestion fatigue
                "suggestions_today": 0,
                "acceptances_today": 0,
                "last_reset": datetime.now().date().isoformat()
            }
        }

    def _save_feedback_patterns(self):
        """Save feedback patterns."""
        try:
            data = {
                "patterns": self.feedback_patterns,
                "history": self.feedback_history[-1000:],  # Keep last 1000
                "updated_at": datetime.now().isoformat()
            }
            FEEDBACK_HISTORY_FILE.write_text(json.dumps(data, indent=2))
        except Exception as e:
            print(f"[ImplicitFeedback] Error saving: {e}")

        # Supabase sync
        if SUPABASE_AVAILABLE:
            try:
                supabase.table("pm_feedback").upsert({
                    "id": "implicit_feedback",
                    "data": self.feedback_patterns,
                    "updated_at": datetime.now().isoformat()
                }).execute()
            except:
                pass

    def track_suggestion(self, suggestion: 'ProactiveSuggestion') -> str:
        """
        Start tracking a suggestion for implicit feedback.

        Returns a tracking ID.
        """
        sid = hashlib.md5(
            f"{suggestion.message}{datetime.now().isoformat()}".encode()
        ).hexdigest()[:12]

        self.pending_suggestions[sid] = (suggestion, datetime.now())

        # Update fatigue tracking
        today = datetime.now().date().isoformat()
        if self.feedback_patterns["suggestion_fatigue"]["last_reset"] != today:
            # New day - reset counters
            self.feedback_patterns["suggestion_fatigue"] = {
                "suggestions_today": 0,
                "acceptances_today": 0,
                "last_reset": today
            }

        self.feedback_patterns["suggestion_fatigue"]["suggestions_today"] += 1

        return sid

    def check_implicit_feedback(
        self,
        user_action: ActionEvent,
        suggestion_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Check if user actions imply feedback on pending suggestions.

        Returns list of feedback events detected.
        """
        feedback_events = []
        now = datetime.now()
        to_remove = []

        for sid, (suggestion, shown_at) in self.pending_suggestions.items():
            # Check for explicit tracking
            if suggestion_id and sid != suggestion_id:
                continue

            time_since_shown = (now - shown_at).total_seconds()

            # Check if user did the suggested action
            if user_action.action_type == suggestion.prediction.action_type:
                # They did it! Implicit acceptance
                signal_strength = 1.0

                # Stronger signal if quick response
                if time_since_shown < self.IMMEDIATE_ACTION_SECONDS:
                    signal_strength = 1.5  # Very strong
                elif time_since_shown < self.QUICK_RESPONSE_SECONDS:
                    signal_strength = 1.2  # Strong

                feedback = {
                    "type": "implicit_accept",
                    "signal": "user_did_suggested_action",
                    "action_type": suggestion.prediction.action_type,
                    "time_to_action": time_since_shown,
                    "signal_strength": signal_strength,
                    "timestamp": now.isoformat()
                }
                feedback_events.append(feedback)
                self._record_feedback(feedback, suggestion)
                to_remove.append(sid)

            # Check for timeout (implicit reject)
            elif time_since_shown > self.SUGGESTION_TIMEOUT_MINUTES * 60:
                feedback = {
                    "type": "implicit_reject",
                    "signal": "suggestion_expired",
                    "action_type": suggestion.prediction.action_type,
                    "time_to_timeout": time_since_shown,
                    "signal_strength": 0.5,  # Weak reject (might have just been busy)
                    "timestamp": now.isoformat()
                }
                feedback_events.append(feedback)
                self._record_feedback(feedback, suggestion)
                to_remove.append(sid)

            # Check if user did something completely different immediately
            elif time_since_shown < 60 and user_action.action_type != suggestion.prediction.action_type:
                # Quick action but not what we suggested = mild reject
                feedback = {
                    "type": "implicit_reject",
                    "signal": "did_different_action",
                    "action_type": suggestion.prediction.action_type,
                    "actual_action": user_action.action_type,
                    "signal_strength": 0.7,
                    "timestamp": now.isoformat()
                }
                feedback_events.append(feedback)
                self._record_feedback(feedback, suggestion)
                to_remove.append(sid)

        # Clean up tracked suggestions
        for sid in to_remove:
            del self.pending_suggestions[sid]

        return feedback_events

    def record_explicit_feedback(
        self,
        suggestion: 'ProactiveSuggestion',
        response: str,
        suggestion_id: Optional[str] = None
    ):
        """Record explicit feedback (user clicked a button)."""
        is_accept = response.lower() in [
            "ok", "yes", "start", "view", "open", "accept",
            "do it", "proceed", "confirm"
        ]

        feedback = {
            "type": "explicit_accept" if is_accept else "explicit_reject",
            "signal": "clicked_quick_action" if is_accept else "explicit_dismiss",
            "action_type": suggestion.prediction.action_type,
            "response": response,
            "signal_strength": 1.0,  # Explicit = strong signal
            "timestamp": datetime.now().isoformat()
        }

        self._record_feedback(feedback, suggestion)

        # Remove from pending
        if suggestion_id and suggestion_id in self.pending_suggestions:
            del self.pending_suggestions[suggestion_id]

        # Update fatigue tracking
        if is_accept:
            self.feedback_patterns["suggestion_fatigue"]["acceptances_today"] += 1

    def _record_feedback(self, feedback: Dict, suggestion: 'ProactiveSuggestion'):
        """Internal: record feedback and update patterns."""
        self.feedback_history.append(feedback)

        action_type = feedback["action_type"]
        is_accept = "accept" in feedback["type"]

        # Update action acceptance rates
        if action_type not in self.feedback_patterns["action_acceptance_rates"]:
            self.feedback_patterns["action_acceptance_rates"][action_type] = {
                "accepts": 0, "rejects": 0
            }

        if is_accept:
            self.feedback_patterns["action_acceptance_rates"][action_type]["accepts"] += 1
        else:
            self.feedback_patterns["action_acceptance_rates"][action_type]["rejects"] += 1

        # Update time-of-day rates
        hour = str(datetime.now().hour)
        if hour not in self.feedback_patterns["time_of_day_rates"]:
            self.feedback_patterns["time_of_day_rates"][hour] = {
                "accepts": 0, "rejects": 0
            }

        if is_accept:
            self.feedback_patterns["time_of_day_rates"][hour]["accepts"] += 1
        else:
            self.feedback_patterns["time_of_day_rates"][hour]["rejects"] += 1

        # Periodically save
        if len(self.feedback_history) % 10 == 0:
            self._save_feedback_patterns()

    def get_acceptance_rate(self, action_type: str) -> Optional[float]:
        """Get historical acceptance rate for an action type."""
        rates = self.feedback_patterns["action_acceptance_rates"].get(action_type)
        if not rates:
            return None

        total = rates["accepts"] + rates["rejects"]
        if total < 5:
            return None

        return rates["accepts"] / total

    def get_optimal_suggestion_count(self) -> int:
        """
        Get optimal number of suggestions for today based on fatigue patterns.

        More rejections = reduce suggestions. High acceptance = can show more.
        """
        fatigue = self.feedback_patterns["suggestion_fatigue"]

        shown = fatigue["suggestions_today"]
        accepted = fatigue["acceptances_today"]

        if shown == 0:
            return 5  # Default: up to 5 suggestions

        acceptance_rate = accepted / shown

        if acceptance_rate < 0.2:
            # Low acceptance - reduce suggestions
            return max(2, 5 - shown // 3)
        elif acceptance_rate > 0.6:
            # High acceptance - can show more
            return min(10, 5 + int(acceptance_rate * 5))
        else:
            return 5  # Normal

    def get_feedback_stats(self) -> Dict:
        """Get feedback collection statistics."""
        return {
            "total_feedback_events": len(self.feedback_history),
            "pending_suggestions": len(self.pending_suggestions),
            "action_acceptance_rates": {
                k: v["accepts"] / (v["accepts"] + v["rejects"])
                if (v["accepts"] + v["rejects"]) > 0 else None
                for k, v in self.feedback_patterns["action_acceptance_rates"].items()
            },
            "today_stats": self.feedback_patterns["suggestion_fatigue"],
            "optimal_suggestions_remaining": self.get_optimal_suggestion_count()
        }


# ===============================================================================
# ENERGY & FOCUS ESTIMATOR - STATE OF THE ART (2026)
# ===============================================================================

class EnergyFocusEstimator:
    """
    Estimates user's current energy and focus level from behavior.

    Research basis:
    - Match suggestions to user state
    - High energy -> complex tasks, Low energy -> simple tasks
    - Personal circadian patterns learned over time

    The goal: suggest the RIGHT task at the RIGHT moment.
    """

    # Default circadian energy curve (normalized 0-1)
    DEFAULT_ENERGY_CURVE = {
        0: 0.15, 1: 0.10, 2: 0.08, 3: 0.08, 4: 0.10, 5: 0.20,
        6: 0.40, 7: 0.60, 8: 0.80, 9: 0.90, 10: 1.00, 11: 0.95,
        12: 0.70, 13: 0.60, 14: 0.65, 15: 0.75, 16: 0.80, 17: 0.70,
        18: 0.55, 19: 0.45, 20: 0.35, 21: 0.30, 22: 0.25, 23: 0.20
    }

    # Task complexity mapping
    TASK_COMPLEXITY = {
        ActionCategory.DEEP_WORK: 1.0,       # Needs high energy
        ActionCategory.PLANNING: 0.9,
        ActionCategory.RESEARCH: 0.85,
        ActionCategory.REVIEW: 0.7,
        ActionCategory.COMMUNICATION: 0.5,
        ActionCategory.TASK_MANAGEMENT: 0.4,
        ActionCategory.CALENDAR: 0.3,
        ActionCategory.ADMINISTRATIVE: 0.3,
        ActionCategory.STANDUP: 0.4,
        ActionCategory.DELEGATION: 0.5,
        ActionCategory.UNKNOWN: 0.5,
    }

    def __init__(self):
        self.personal_energy_curve: Optional[Dict[int, float]] = None
        self.activity_data: List[Dict] = []
        self.energy_patterns = self._load_energy_patterns()

    def _load_energy_patterns(self) -> Dict:
        """Load learned energy patterns."""
        if ENERGY_PATTERNS_FILE.exists():
            try:
                data = json.loads(ENERGY_PATTERNS_FILE.read_text())
                self.personal_energy_curve = data.get("personal_curve")
                self.activity_data = data.get("activity_data", [])[-1000:]
                return data.get("patterns", {})
            except:
                pass

        return {
            "hourly_productivity": {},     # hour -> productivity score
            "day_patterns": {},            # day_of_week -> patterns
            "streak_data": {               # Focus streak tracking
                "current_streak": 0,
                "max_streak": 0,
                "streak_start": None
            }
        }

    def _save_energy_patterns(self):
        """Save energy patterns."""
        try:
            data = {
                "personal_curve": self.personal_energy_curve,
                "activity_data": self.activity_data[-1000:],
                "patterns": self.energy_patterns,
                "updated_at": datetime.now().isoformat()
            }
            ENERGY_PATTERNS_FILE.write_text(json.dumps(data, indent=2, default=str))
        except Exception as e:
            print(f"[EnergyEstimator] Error saving: {e}")

    def estimate_energy(
        self,
        hour: int,
        recent_actions: List[ActionEvent] = None
    ) -> float:
        """
        Estimate current energy level (0.0 - 1.0).

        Combines:
        1. Time-of-day baseline (personal or default curve)
        2. Recent activity level (more activity = higher energy)
        3. Deep work streaks (sustained focus = flow state boost)
        """
        # Base from time of day
        if self.personal_energy_curve:
            base_energy = self.personal_energy_curve.get(hour, 0.5)
        else:
            base_energy = self.DEFAULT_ENERGY_CURVE.get(hour, 0.5)

        if not recent_actions:
            return base_energy

        # Adjust based on recent activity
        now = datetime.now()
        recent_hour = [
            a for a in recent_actions
            if (now - a.timestamp).total_seconds() < 3600
        ]

        # Activity boost: more actions = higher energy (up to +0.2)
        activity_boost = min(len(recent_hour) / 15, 1.0) * 0.2

        # Focus boost: sustained deep work = flow state (up to +0.15)
        deep_work_actions = [
            a for a in recent_hour
            if a.category in [ActionCategory.DEEP_WORK, ActionCategory.RESEARCH]
        ]

        focus_boost = 0.0
        if len(deep_work_actions) >= 3:
            # Check if sustained (not interrupted)
            if len(recent_hour) > 0:
                deep_work_ratio = len(deep_work_actions) / len(recent_hour)
                if deep_work_ratio > 0.7:
                    focus_boost = 0.15  # In flow state

        # Fatigue penalty: too many hours of work without break
        if len(self.activity_data) > 0:
            # Check how long user has been active today
            today_start = datetime.now().replace(hour=0, minute=0, second=0)
            today_actions = [
                a for a in self.activity_data
                if datetime.fromisoformat(a["timestamp"]) > today_start
            ]

            hours_active = len(set(
                datetime.fromisoformat(a["timestamp"]).hour
                for a in today_actions
            ))

            if hours_active > 8:
                # Fatigue penalty after 8+ hours
                fatigue_penalty = min((hours_active - 8) * 0.05, 0.2)
            else:
                fatigue_penalty = 0.0
        else:
            fatigue_penalty = 0.0

        final_energy = base_energy + activity_boost + focus_boost - fatigue_penalty
        return max(0.1, min(1.0, final_energy))

    def estimate_focus(
        self,
        recent_actions: List[ActionEvent] = None,
        context: 'FusedContext' = None
    ) -> float:
        """
        Estimate current focus/concentration level (0.0 - 1.0).

        Combines:
        1. Recent action homogeneity (same category = focused)
        2. Action frequency (steady pace = focused)
        3. External interruption potential (calendar, emails)
        """
        focus = 0.5  # Baseline

        if recent_actions and len(recent_actions) >= 3:
            recent_5 = recent_actions[-5:]

            # Category homogeneity (all same category = focused)
            categories = [a.category for a in recent_5]
            unique_categories = len(set(categories))

            if unique_categories == 1:
                focus += 0.3  # Single category = highly focused
            elif unique_categories == 2:
                focus += 0.1  # Two categories = somewhat focused

            # Check for deep work focus
            if all(c in [ActionCategory.DEEP_WORK, ActionCategory.RESEARCH] for c in categories):
                focus += 0.1  # Extra boost for deep work

        # Context-based adjustments
        if context:
            # Meeting soon = lower focus
            if context.next_meeting_in_minutes and context.next_meeting_in_minutes < 30:
                focus -= 0.2

            # Many unread emails = potential distraction
            if context.unread_count > 10:
                focus -= 0.1

            # Overdue tasks = stress reduces focus
            if context.tasks_overdue > 2:
                focus -= 0.1

        return max(0.1, min(1.0, focus))

    def get_task_match_score(
        self,
        action_category: ActionCategory,
        current_energy: float,
        current_focus: float
    ) -> float:
        """
        Calculate how well a task matches current energy/focus state.

        Returns 0.0-1.0 score:
        - 1.0 = perfect match
        - 0.0 = terrible match (high-energy task when exhausted)
        """
        task_complexity = self.TASK_COMPLEXITY.get(action_category, 0.5)

        # Energy match: complex tasks need high energy
        energy_match = 1.0 - abs(task_complexity - current_energy)

        # Focus match: complex tasks also benefit from focus
        focus_weight = task_complexity * 0.5  # Complex tasks weight focus more
        focus_match = 1.0 - (focus_weight * (1.0 - current_focus))

        # Combined score
        match_score = 0.6 * energy_match + 0.4 * focus_match

        return max(0.0, min(1.0, match_score))

    def record_action(self, action: ActionEvent, outcome: Optional[str] = None):
        """Record action for energy pattern learning."""
        self.activity_data.append({
            "timestamp": action.timestamp.isoformat(),
            "hour": action.timestamp.hour,
            "day": action.timestamp.weekday(),
            "category": action.category.value,
            "action_type": action.action_type,
            "outcome": outcome
        })

        # Keep bounded
        self.activity_data = self.activity_data[-2000:]

        # Periodically rebuild personal curve
        if len(self.activity_data) % 100 == 0:
            self._rebuild_personal_curve()
            self._save_energy_patterns()

    def _rebuild_personal_curve(self):
        """Rebuild personal energy curve from activity data."""
        if len(self.activity_data) < 50:
            return

        # Calculate productivity by hour
        hourly_data: Dict[int, List[Dict]] = defaultdict(list)

        for entry in self.activity_data:
            hour = entry["hour"]
            hourly_data[hour].append(entry)

        # Build curve based on activity frequency and complexity
        curve = {}
        for hour, entries in hourly_data.items():
            if len(entries) < 3:
                continue

            # More activity at this hour = higher baseline energy
            activity_score = len(entries) / len(self.activity_data) * 24

            # Bonus for deep work at this hour
            deep_work_count = sum(
                1 for e in entries
                if e["category"] in [ActionCategory.DEEP_WORK.value, ActionCategory.RESEARCH.value]
            )
            deep_work_bonus = deep_work_count / len(entries) * 0.2

            curve[hour] = min(1.0, activity_score + deep_work_bonus)

        if len(curve) >= 12:  # Need at least half the hours
            # Fill in missing hours with interpolation
            for h in range(24):
                if h not in curve:
                    # Use average of neighbors
                    prev_h = (h - 1) % 24
                    next_h = (h + 1) % 24
                    if prev_h in curve and next_h in curve:
                        curve[h] = (curve[prev_h] + curve[next_h]) / 2
                    else:
                        curve[h] = self.DEFAULT_ENERGY_CURVE[h]

            self.personal_energy_curve = curve
            print(f"[EnergyEstimator] Rebuilt personal energy curve from {len(self.activity_data)} data points")

    def suggest_optimal_task_type(self, current_energy: float, current_focus: float) -> List[ActionCategory]:
        """
        Suggest optimal task types for current energy/focus state.

        Returns list of ActionCategory sorted by match score.
        """
        scores = []
        for category in ActionCategory:
            if category == ActionCategory.UNKNOWN:
                continue
            score = self.get_task_match_score(category, current_energy, current_focus)
            scores.append((category, score))

        scores.sort(key=lambda x: x[1], reverse=True)
        return [cat for cat, score in scores if score > 0.5]

    def get_energy_stats(self) -> Dict:
        """Get energy estimation statistics."""
        current_hour = datetime.now().hour

        return {
            "current_energy_estimate": self.estimate_energy(current_hour),
            "has_personal_curve": self.personal_energy_curve is not None,
            "data_points": len(self.activity_data),
            "peak_hours": (
                sorted(
                    self.personal_energy_curve.items() if self.personal_energy_curve
                    else self.DEFAULT_ENERGY_CURVE.items(),
                    key=lambda x: x[1], reverse=True
                )[:3]
            ),
            "suggested_task_types": [
                cat.value for cat in self.suggest_optimal_task_type(
                    self.estimate_energy(current_hour), 0.5
                )[:3]
            ]
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

        # SOTA Enhancement: Confidence Calibrator
        self.confidence_calibrator = ConfidenceCalibrator()

        # SOTA Enhancement: Energy/Focus Estimator
        self.energy_estimator = EnergyFocusEstimator()

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
        """
        Calibrate confidence scores and create PredictedAction objects.

        SOTA Enhancement (2026):
        - Uses ConfidenceCalibrator with temperature scaling
        - Historical blending: 60% current + 40% track record
        - Target calibration error: <10%
        """
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

            # SOTA: Apply temperature scaling + historical calibration
            historical_data = self.prediction_outcomes.get("accuracy_by_type", {}).get(action_type)
            calibrated = self.confidence_calibrator.calibrate(
                raw_confidence,
                action_type,
                historical_data
            )

            # Clamp to valid range (already done in calibrator, but ensure)
            final_confidence = max(0.0, min(0.95, calibrated))

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

            # Get historical accuracy for evidence
            historical_accuracy = self._get_historical_accuracy(action_type)

            predictions.append(PredictedAction(
                action_type=action_type,
                category=self._get_category(action_type),
                confidence=final_confidence,
                reasoning=data["reasoning"],
                action_level=action_level,
                supporting_evidence={
                    "confidence_factors": factors,
                    "historical_accuracy": historical_accuracy,
                    "factor_count": len(factors),
                    "calibration_method": "temperature_scaling_plus_historical"
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

    def record_prediction_outcome(
        self,
        action_type: str,
        was_correct: bool,
        predicted_confidence: float = None
    ):
        """
        Record whether a prediction was correct for learning.

        SOTA Enhancement: Also updates the ConfidenceCalibrator for
        continuous calibration improvement.
        """
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
            "predicted_confidence": predicted_confidence,
            "timestamp": datetime.now().isoformat()
        })

        self._save_outcomes()

        # SOTA: Update calibrator for continuous improvement
        if predicted_confidence is not None:
            self.confidence_calibrator.record_prediction_outcome(
                predicted_confidence,
                was_correct,
                action_type
            )

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

    SOTA Enhancements (2026):
    1. Confidence-qualified language ("I'm fairly confident..." vs "I think...")
    2. Task boundary awareness (don't interrupt deep work)
    3. Implicit feedback collection (learn from behavior)
    4. Energy-aware suggestions (match task to energy level)
    5. Progressive automation levels (suggest -> approve -> auto)

    The goal is to make suggestions feel natural and helpful, not intrusive.
    Each suggestion should feel like a thoughtful human assistant.
    """

    # SOTA: Confidence-qualified templates by confidence level
    CONFIDENCE_PREFIXES = {
        "very_high": [  # >= 0.85
            "I'm confident that",
            "Based on your patterns, it's time to",
            "This is a great time to",
        ],
        "high": [  # 0.70 - 0.85
            "I'm fairly confident that",
            "Your patterns suggest",
            "It looks like time to",
        ],
        "medium": [  # 0.50 - 0.70
            "I think",
            "You might want to",
            "It could be a good time to",
        ],
        "low": [  # < 0.50
            "Just a thought:",
            "Perhaps consider",
            "Maybe",
        ]
    }

    # Suggestion templates by action type - ENHANCED with reasoning
    TEMPLATES = {
        # Morning rituals
        "morning_review": [
            "{prefix} review today's priorities. {reasoning}",
            "{prefix} plan your day - you have {tasks_pending} tasks waiting. {reasoning}",
            "Good morning! {prefix} do a quick check-in. {reasoning}"
        ],

        # Email actions
        "read_email": [
            "{prefix} check your inbox - {unread_count} emails waiting. {reasoning}",
            "{prefix} handle {urgent_count} urgent emails. {reasoning}",
            "{prefix} do a quick email scan. {reasoning}"
        ],
        "reply_email": [
            "{prefix} respond to {sender}. {reasoning}",
            "{prefix} send a quick reply to {sender}. {reasoning}",
            "{sender} is waiting for a response. {prefix} reply now. {reasoning}"
        ],

        # Calendar/meetings
        "prep_meeting": [
            "{prefix} prep for your meeting in {minutes} minutes. {reasoning}",
            "'{meeting_title}' starts soon. {prefix} review the context. {reasoning}",
            "Meeting in {minutes} min - {prefix} get ready. {reasoning}"
        ],
        "check_calendar": [
            "{prefix} check what's on your calendar. {reasoning}",
            "{prefix} review today's {meetings_today} meetings. {reasoning}",
            "{prefix} see what's coming up. {reasoning}"
        ],

        # Task management
        "update_task": [
            "{prefix} update '{task_title}'. {reasoning}",
            "{prefix} address {overdue_count} overdue tasks. {reasoning}",
            "Some tasks need attention. {prefix} do a quick update. {reasoning}"
        ],
        "complete_task": [
            "{prefix} mark '{task_title}' complete. {reasoning}",
            "'{task_title}' looks done - {prefix} close it out. {reasoning}",
            "{prefix} update the board with completed work. {reasoning}"
        ],
        "create_task": [
            "{prefix} capture this as a task. {reasoning}",
            "{prefix} add this to the board. {reasoning}",
            "New task to track? {prefix} create it now. {reasoning}"
        ],

        # Deep work
        "focus_session": [
            "{prefix} start a focus session - you have {free_time} minutes free. {reasoning}",
            "Clear block ahead. {prefix} do some deep work. {reasoning}",
            "No meetings for a while - {prefix} focus now. {reasoning}"
        ],
        "coding": [
            "{prefix} dive into code. {reasoning}",
            "{prefix} start a coding session - calendar's clear. {reasoning}",
            "Good time for development. {prefix} start coding. {reasoning}"
        ],

        # End of day
        "end_of_day": [
            "{prefix} wrap up with a status update. {reasoning}",
            "End of day - {prefix} capture anything for tomorrow. {reasoning}",
            "{prefix} review what got done today. {reasoning}"
        ],

        # Status/updates
        "status_update": [
            "{prefix} share a quick status update. {reasoning}",
            "{prefix} update the team on progress. {reasoning}",
            "Team might want an update. {prefix} share your progress. {reasoning}"
        ],

        # Review
        "review_pr": [
            "{prefix} review the waiting PR. {reasoning}",
            "Code review needed - {prefix} take a look. {reasoning}",
            "{prefix} start the PR review. {reasoning}"
        ],

        # Generic fallbacks with confidence
        "default": [
            "{prefix} {action}. {reasoning}",
            "{prefix} do {action} - your patterns suggest it's time. {reasoning}",
            "{prefix} {action} now. {reasoning}"
        ]
    }

    # Quick actions by category - ENHANCED with more options
    QUICK_ACTIONS = {
        ActionCategory.COMMUNICATION: ["Open Inbox", "Quick Reply", "Snooze 30min", "Skip"],
        ActionCategory.TASK_MANAGEMENT: ["View Tasks", "Mark Done", "Snooze 30min", "Dismiss"],
        ActionCategory.CALENDAR: ["Open Calendar", "Start Prep", "5min Warning", "Dismiss"],
        ActionCategory.DEEP_WORK: ["Start Focus", "Block 2hr", "Snooze 1hr", "Not Now"],
        ActionCategory.STANDUP: ["Give Update", "Quick Note", "Skip Today", "Dismiss"],
        ActionCategory.REVIEW: ["Start Review", "Assign Other", "Snooze 1hr", "Later"],
        ActionCategory.PLANNING: ["Start Planning", "Quick Notes", "Later", "Skip"],
        ActionCategory.RESEARCH: ["Start Research", "Bookmark", "Later", "Skip"],
        ActionCategory.DELEGATION: ["Assign Now", "Follow Up", "Later", "Skip"],
    }

    def __init__(self):
        self.intent_engine = IntentPredictionEngine()
        self.context_engine = ContextFusionEngine()

        # SOTA: Task Boundary Detector
        self.boundary_detector = TaskBoundaryDetector()

        # SOTA: Implicit Feedback Collector
        self.feedback_collector = ImplicitFeedbackCollector()

        # SOTA: Energy/Focus Estimator
        self.energy_estimator = EnergyFocusEstimator()

        # Track shown suggestions to avoid repetition
        self.recently_shown: List[str] = []
        self.show_history: List[Dict] = []

    def generate_suggestions(
        self,
        predictions: List[PredictedAction] = None,
        context: FusedContext = None,
        recent_actions: List[ActionEvent] = None,
        limit: int = 3,
        respect_boundaries: bool = True
    ) -> List[ProactiveSuggestion]:
        """
        Generate proactive suggestions from predictions.

        SOTA Enhancements:
        - Task boundary awareness (only suggest at natural breaks)
        - Energy-aware filtering (match suggestions to user energy)
        - Implicit feedback-informed limiting (avoid suggestion fatigue)

        Args:
            predictions: Pre-computed predictions, or will compute fresh
            context: Pre-gathered context
            recent_actions: Recent actions for boundary detection
            limit: Maximum suggestions to return
            respect_boundaries: If True, only suggest at task boundaries

        Returns:
            List of ProactiveSuggestion ready for presentation
        """
        # Gather fresh data if not provided
        if context is None:
            context = self.context_engine.gather_context(recent_actions)

        if predictions is None:
            predictions = self.intent_engine.predict_next_actions(
                context, recent_actions, limit=limit + 3
            )

        # SOTA: Check task boundary (don't interrupt deep work)
        if respect_boundaries and recent_actions:
            is_boundary, signals = self.boundary_detector.check_boundary(
                recent_actions[-1] if recent_actions else None
            )
            if not is_boundary:
                # Not at a boundary - return empty or very limited suggestions
                if "in_deep_work" in signals:
                    # In deep work - don't interrupt at all
                    return []
                else:
                    # Not at natural break - limit to 1 high-confidence suggestion
                    limit = 1
                    predictions = [p for p in predictions if p.confidence >= 0.85]

        # SOTA: Apply feedback-based limits (avoid suggestion fatigue)
        optimal_count = self.feedback_collector.get_optimal_suggestion_count()
        limit = min(limit, optimal_count)

        # SOTA: Get current energy for task matching
        current_energy = self.energy_estimator.estimate_energy(
            context.hour, recent_actions
        )
        current_focus = self.energy_estimator.estimate_focus(recent_actions, context)

        suggestions = []

        for pred in predictions:
            # Skip if recently shown
            if pred.action_type in self.recently_shown[-5:]:
                continue

            # SOTA: Check energy match (don't suggest complex tasks when tired)
            energy_match = self.energy_estimator.get_task_match_score(
                pred.category, current_energy, current_focus
            )
            if energy_match < 0.4:
                # Poor energy match - skip this suggestion
                continue

            # Generate the suggestion
            suggestion = self._create_suggestion(pred, context, energy_match)

            if suggestion:
                suggestions.append(suggestion)

            if len(suggestions) >= limit:
                break

        # COLD START: Generate bootstrap suggestions when no predictions pass threshold
        if not suggestions and not predictions:
            suggestions = self._generate_bootstrap_suggestions(context, current_energy, current_focus, limit)

        return suggestions

    def _generate_bootstrap_suggestions(
        self,
        context: FusedContext,
        energy: float,
        focus: float,
        limit: int
    ) -> List[ProactiveSuggestion]:
        """
        Generate bootstrap suggestions for new users without enough history.

        These are context-aware but don't rely on learned patterns.
        """
        bootstrap_predictions = []

        # Morning routine
        if context.is_morning and context.hour <= 10:
            bootstrap_predictions.append(PredictedAction(
                action_type="morning_review",
                category=ActionCategory.STANDUP,
                confidence=0.55,
                reasoning=["Good time for a morning check-in"],
                action_level="suggest"
            ))

        # Check email if there are unread
        if context.unread_count > 0:
            conf = min(0.65, 0.5 + context.unread_count * 0.01)
            bootstrap_predictions.append(PredictedAction(
                action_type="read_email",
                category=ActionCategory.COMMUNICATION,
                confidence=conf,
                reasoning=[f"{context.unread_count} emails waiting"],
                action_level="suggest"
            ))

        # Task management if tasks pending
        if context.tasks_pending > 0:
            bootstrap_predictions.append(PredictedAction(
                action_type="update_task",
                category=ActionCategory.TASK_MANAGEMENT,
                confidence=0.55,
                reasoning=[f"{context.tasks_pending} tasks need attention"],
                action_level="suggest"
            ))

        # Deep work if good focus time
        if not context.busy_day and energy > 0.6 and focus > 0.5:
            bootstrap_predictions.append(PredictedAction(
                action_type="focus_session",
                category=ActionCategory.DEEP_WORK,
                confidence=0.50,
                reasoning=["Calendar looks clear for focused work"],
                action_level="suggest"
            ))

        # Meeting prep if meeting soon
        if context.next_meeting_in_minutes and 10 <= context.next_meeting_in_minutes <= 45:
            bootstrap_predictions.append(PredictedAction(
                action_type="prep_meeting",
                category=ActionCategory.CALENDAR,
                confidence=0.60,
                reasoning=[f"Meeting in {context.next_meeting_in_minutes} minutes"],
                action_level="suggest"
            ))

        # End of day
        if context.is_evening and context.hour >= 17:
            bootstrap_predictions.append(PredictedAction(
                action_type="end_of_day",
                category=ActionCategory.STANDUP,
                confidence=0.50,
                reasoning=["Time to wrap up for the day"],
                action_level="suggest"
            ))

        # Create suggestions from bootstrap predictions
        suggestions = []
        for pred in bootstrap_predictions[:limit]:
            energy_match = self.energy_estimator.get_task_match_score(
                pred.category, energy, focus
            )
            suggestion = self._create_suggestion(pred, context, energy_match)
            if suggestion:
                suggestions.append(suggestion)

        return suggestions

    def _create_suggestion(
        self,
        prediction: PredictedAction,
        context: FusedContext,
        energy_match: float = 1.0
    ) -> Optional[ProactiveSuggestion]:
        """
        Create a suggestion from a prediction.

        SOTA Enhancements:
        - Confidence-qualified language
        - Includes reasoning for transparency
        - Energy-aware priority adjustment
        """
        # Get templates for this action type
        templates = self.TEMPLATES.get(
            prediction.action_type,
            self.TEMPLATES["default"]
        )

        # Choose a template (rotate through them)
        template_idx = hash(datetime.now().isoformat()) % len(templates)
        template = templates[template_idx]

        # SOTA: Get confidence-qualified prefix
        prefix = self._get_confidence_prefix(prediction.confidence)

        # SOTA: Build concise reasoning from prediction evidence
        reasoning = self._build_reasoning(prediction)

        # Fill in template variables with prefix and reasoning
        message = self._fill_template(template, prediction, context, prefix, reasoning)

        # Get quick actions
        quick_actions = self.QUICK_ACTIONS.get(
            prediction.category,
            ["OK", "Snooze", "Not Now"]
        )

        # Calculate priority (SOTA: includes energy match factor)
        priority = self._calculate_priority(prediction, context, energy_match)

        # Set expiry (suggestions get stale)
        expires_at = datetime.now() + timedelta(minutes=30)

        suggestion = ProactiveSuggestion(
            message=message,
            prediction=prediction,
            priority=priority,
            quick_actions=quick_actions,
            expires_at=expires_at
        )

        # SOTA: Track for implicit feedback
        self.feedback_collector.track_suggestion(suggestion)

        return suggestion

    def _get_confidence_prefix(self, confidence: float) -> str:
        """
        Get confidence-qualified language prefix.

        SOTA: Match language to actual confidence level.
        Research shows users trust systems more when they express appropriate uncertainty.
        """
        if confidence >= 0.85:
            prefixes = self.CONFIDENCE_PREFIXES["very_high"]
        elif confidence >= 0.70:
            prefixes = self.CONFIDENCE_PREFIXES["high"]
        elif confidence >= 0.50:
            prefixes = self.CONFIDENCE_PREFIXES["medium"]
        else:
            prefixes = self.CONFIDENCE_PREFIXES["low"]

        # Random selection for variety
        return random.choice(prefixes)

    def _build_reasoning(self, prediction: PredictedAction) -> str:
        """
        Build concise reasoning string from prediction evidence.

        SOTA: Show WHY we're suggesting, not just WHAT.
        This builds trust by being transparent.
        """
        if not prediction.reasoning:
            return ""

        # Take first reason (most important)
        primary_reason = prediction.reasoning[0]

        # Shorten if too long
        if len(primary_reason) > 60:
            primary_reason = primary_reason[:57] + "..."

        # Format based on confidence level
        conf_pct = int(prediction.confidence * 100)
        if conf_pct >= 85:
            return f"({primary_reason})"
        elif conf_pct >= 70:
            return f"(Why: {primary_reason})"
        else:
            return f"({conf_pct}% confident - {primary_reason})"

    def _fill_template(
        self,
        template: str,
        prediction: PredictedAction,
        context: FusedContext,
        prefix: str = "",
        reasoning: str = ""
    ) -> str:
        """
        Fill in template variables with actual values.

        SOTA Enhancement: Now includes confidence prefix and reasoning.
        """
        # Build replacement dict
        replacements = {
            "action": prediction.action_type.replace("_", " "),
            "tasks_pending": str(context.tasks_pending),
            "unread_count": str(context.unread_count),
            "urgent_count": str(context.urgent_count),
            "meetings_today": str(context.meetings_today),
            "free_time": str(context.free_time_minutes),
            "overdue_count": str(context.tasks_overdue),
            # SOTA: Confidence prefix and reasoning
            "prefix": prefix,
            "reasoning": reasoning
        }

        # Add meeting info if available
        if context.next_meeting_in_minutes is not None:
            replacements["minutes"] = str(context.next_meeting_in_minutes)
            replacements["meeting_title"] = "upcoming meeting"  # Would need calendar integration
        else:
            replacements["minutes"] = "0"
            replacements["meeting_title"] = "meeting"

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
            message = template.format(**replacements)
            # Clean up any double spaces or trailing/leading whitespace
            message = " ".join(message.split())
            return message
        except KeyError as e:
            # Fallback if template has unfilled variables
            print(f"[SuggestionGenerator] Template key error: {e}")
            return template.replace("{", "").replace("}", "")

    def _calculate_priority(
        self,
        prediction: PredictedAction,
        context: FusedContext,
        energy_match: float = 1.0
    ) -> int:
        """
        Calculate suggestion priority (higher = more important).

        SOTA Enhancement: Includes energy match factor.
        """
        priority = 0

        # Base priority from confidence
        priority += int(prediction.confidence * 50)

        # SOTA: Energy match boost (good match = higher priority)
        priority += int(energy_match * 15)

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

        # SOTA: Penalty if action level is collaborative (lower confidence)
        if prediction.action_level == "collaborative":
            priority -= 10

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
        """
        Record user's response to a suggestion for learning.

        SOTA Enhancement: Uses implicit feedback collector and confidence calibrator.
        """
        was_accepted = response.lower() in [
            "ok", "start", "view", "open", "yes", "accept",
            "do it", "proceed", "confirm", "mark done"
        ]

        # SOTA: Record explicit feedback through collector
        self.feedback_collector.record_explicit_feedback(suggestion, response)

        # Update intent engine's prediction outcomes (with confidence for calibration)
        self.intent_engine.record_prediction_outcome(
            suggestion.prediction.action_type,
            was_accepted,
            suggestion.prediction.confidence  # SOTA: Include confidence for calibration
        )

        # SOTA: Record boundary effectiveness
        is_at_boundary, _ = self.boundary_detector.check_boundary()
        self.boundary_detector.record_suggestion_outcome(is_at_boundary, was_accepted)

        # SOTA: Record action for energy learning
        if was_accepted:
            self.energy_estimator.record_action(
                ActionEvent(
                    id=hashlib.md5(f"response_{datetime.now().isoformat()}".encode()).hexdigest()[:12],
                    timestamp=datetime.now(),
                    category=suggestion.prediction.category,
                    action_type=suggestion.prediction.action_type,
                    context={"from_suggestion": True}
                ),
                outcome="accepted"
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

    STATE OF THE ART IMPLEMENTATION (January 2026):
    - ConfidenceCalibrator: Temperature scaling + historical blending (<10% ECE)
    - TaskBoundaryDetector: Don't interrupt deep work (49.7% faster responses)
    - ImplicitFeedbackCollector: Learn from behavior automatically
    - EnergyFocusEstimator: Match suggestions to user energy level

    TARGET METRICS:
    - Accuracy@3: 70%
    - Acceptance Rate: 52% (IUI benchmark)
    - Calibration Error: <10%

    Usage:
        engine = PredictiveIntentEngine()

        # Get predictions
        predictions = engine.predict_next_actions()

        # Get ready-to-show suggestions
        suggestions = engine.generate_proactive_suggestions()

        # Record what user actually did (for learning)
        engine.record_action(action_event)
        engine.record_suggestion_response(suggestion, "OK")

        # SOTA: Check if good time to suggest
        is_good_time = engine.is_good_time_to_suggest()

        # SOTA: Get calibration stats
        calibration = engine.get_calibration_stats()
    """

    def __init__(self):
        self.intent_engine = IntentPredictionEngine()
        self.suggestion_generator = ProactiveSuggestionGenerator()
        self.context_engine = ContextFusionEngine()
        self.pattern_miner = BehaviorPatternMiner()

        # SOTA: Direct access to new components
        self.confidence_calibrator = self.intent_engine.confidence_calibrator
        self.task_boundary_detector = self.suggestion_generator.boundary_detector
        self.feedback_collector = self.suggestion_generator.feedback_collector
        self.energy_estimator = self.suggestion_generator.energy_estimator

        # Track for integration with pm_orchestrator
        self._last_context: Optional[FusedContext] = None
        self._last_predictions: List[PredictedAction] = []
        self._recent_actions: List[ActionEvent] = []

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
        limit: int = 3,
        respect_boundaries: bool = True
    ) -> List[ProactiveSuggestion]:
        """
        Generate human-friendly proactive suggestions.

        SOTA Enhancement: Now includes task boundary awareness and energy matching.

        Returns:
            List of ProactiveSuggestion sorted by priority
        """
        if context is None:
            context = self._last_context or self.context_engine.gather_context(self._recent_actions)

        if predictions is None:
            predictions = self._last_predictions or self.predict_next_actions(context, self._recent_actions)

        suggestions = self.suggestion_generator.generate_suggestions(
            predictions=predictions,
            context=context,
            recent_actions=self._recent_actions,
            limit=limit,
            respect_boundaries=respect_boundaries
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
            "recently_shown_suggestions": len(self.suggestion_generator.recently_shown),
            # SOTA: New stats
            "calibration": self.confidence_calibrator.get_calibration_stats(),
            "boundary_effectiveness": self.task_boundary_detector.get_boundary_effectiveness(),
            "feedback_stats": self.feedback_collector.get_feedback_stats(),
            "energy_stats": self.energy_estimator.get_energy_stats()
        }

    # =========================================================================
    # SOTA: New Methods for Enhanced Functionality
    # =========================================================================

    def is_good_time_to_suggest(self, last_action: ActionEvent = None) -> Tuple[bool, List[str]]:
        """
        SOTA: Check if this is a good time to make a suggestion.

        Uses TaskBoundaryDetector to avoid interrupting deep work.

        Returns:
            Tuple of (is_good_time, signals_detected)
        """
        action = last_action or (self._recent_actions[-1] if self._recent_actions else None)
        return self.task_boundary_detector.check_boundary(action)

    def get_energy_and_focus(self, recent_actions: List[ActionEvent] = None) -> Dict:
        """
        SOTA: Get current energy and focus estimates.

        Returns dict with:
        - energy: 0.0-1.0 (higher = more energy)
        - focus: 0.0-1.0 (higher = more focused)
        - suggested_tasks: list of task types that match current state
        """
        context = self._last_context or self.context_engine.gather_context()
        actions = recent_actions or self._recent_actions

        energy = self.energy_estimator.estimate_energy(context.hour, actions)
        focus = self.energy_estimator.estimate_focus(actions, context)
        suggested = self.energy_estimator.suggest_optimal_task_type(energy, focus)

        return {
            "energy": round(energy, 2),
            "focus": round(focus, 2),
            "energy_level": "high" if energy > 0.7 else "medium" if energy > 0.4 else "low",
            "focus_level": "high" if focus > 0.7 else "medium" if focus > 0.4 else "low",
            "suggested_task_types": [cat.value for cat in suggested[:3]],
            "optimal_for_deep_work": energy > 0.6 and focus > 0.6
        }

    def get_calibration_stats(self) -> Dict:
        """
        SOTA: Get confidence calibration statistics.

        Returns dict with:
        - ece: Expected Calibration Error (target: <0.10)
        - is_well_calibrated: bool
        - temperatures: learned temperatures per action type
        """
        return self.confidence_calibrator.get_calibration_stats()

    def check_implicit_feedback(self, user_action: ActionEvent) -> List[Dict]:
        """
        SOTA: Check if user action implies feedback on pending suggestions.

        Call this whenever user takes an action to automatically learn.

        Returns list of feedback events detected.
        """
        # Track the action
        self._recent_actions.append(user_action)
        if len(self._recent_actions) > 100:
            self._recent_actions = self._recent_actions[-100:]

        # Check for implicit feedback
        return self.feedback_collector.check_implicit_feedback(user_action)

    def get_acceptance_rate(self, action_type: str = None) -> Optional[float]:
        """
        SOTA: Get acceptance rate for suggestions.

        Args:
            action_type: Specific action type, or None for overall

        Returns acceptance rate 0.0-1.0 or None if insufficient data.
        """
        if action_type:
            return self.feedback_collector.get_acceptance_rate(action_type)
        else:
            stats = self.feedback_collector.get_feedback_stats()
            today = stats.get("today_stats", {})
            shown = today.get("suggestions_today", 0)
            accepted = today.get("acceptances_today", 0)
            return accepted / shown if shown > 0 else None

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
    print("TinyPM PREDICTIVE INTENT ENGINE - STATE OF THE ART (2026)")
    print("'The AI that reads your mind'")
    print("=" * 70)
    print("\nSOTA Features:")
    print("  - Confidence Calibration (target ECE <10%)")
    print("  - Task Boundary Detection (49.7% faster responses)")
    print("  - Implicit Feedback Learning")
    print("  - Energy/Focus Matching")
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
                    print(f"   Calibration: {pred.supporting_evidence.get('calibration_method', 'N/A')}")
                    print(f"   Reasoning:")
                    for reason in pred.reasoning[:3]:
                        print(f"     - {reason}")

        elif cmd == "suggest":
            print("\nGenerating suggestions...")

            # SOTA: Check if good time first
            is_good_time, signals = engine.is_good_time_to_suggest()
            print(f"\nBoundary check: {'Good time' if is_good_time else 'Not ideal'}")
            if signals:
                print(f"  Signals: {', '.join(signals)}")

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
            print(json.dumps(stats, indent=2, default=str))

        elif cmd == "record":
            if len(sys.argv) < 3:
                print("Usage: predictive_intent.py record <action_type>")
                return
            action_type = sys.argv[2]
            engine.record_action_simple(action_type)
            print(f"Recorded action: {action_type}")

        # SOTA: New commands
        elif cmd == "energy":
            print("\nCurrent Energy & Focus:")
            energy_data = engine.get_energy_and_focus()
            for key, value in energy_data.items():
                print(f"  {key}: {value}")

        elif cmd == "calibration":
            print("\nConfidence Calibration Stats:")
            cal_stats = engine.get_calibration_stats()
            print(f"  ECE (Expected Calibration Error): {cal_stats.get('ece', 'N/A')}")
            print(f"  Target ECE: <{cal_stats.get('target_ece', 0.10)}")
            print(f"  Is Well Calibrated: {cal_stats.get('is_well_calibrated', 'Unknown')}")
            print(f"  Predictions Logged: {cal_stats.get('total_predictions_logged', 0)}")
            if cal_stats.get("temperatures"):
                print(f"  Learned Temperatures:")
                for action, temp in list(cal_stats["temperatures"].items())[:5]:
                    print(f"    {action}: {temp:.2f}")

        elif cmd == "boundary":
            print("\nTask Boundary Effectiveness:")
            boundary_stats = engine.task_boundary_detector.get_boundary_effectiveness()
            for key, value in boundary_stats.items():
                if value is not None:
                    if isinstance(value, float):
                        print(f"  {key}: {value:.2%}")
                    else:
                        print(f"  {key}: {value}")

        elif cmd == "feedback":
            print("\nImplicit Feedback Stats:")
            feedback_stats = engine.feedback_collector.get_feedback_stats()
            for key, value in feedback_stats.items():
                print(f"  {key}: {value}")

        elif cmd == "test":
            # Run unit tests for confidence calibration
            test_confidence_calibration()

        else:
            print(f"Unknown command: {cmd}")
            print("\nCommands: predict, suggest, lookahead, context, stats, record,")
            print("          energy, calibration, boundary, feedback, test")

    else:
        print("\nUsage: python predictive_intent.py <command>")
        print("\nCommands:")
        print("  predict              - Show predicted next actions")
        print("  suggest              - Generate proactive suggestions")
        print("  lookahead [hours]    - Predict actions for next N hours")
        print("  context              - Show current fused context")
        print("  stats                - Show all engine statistics")
        print("  record <action>      - Record an action for learning")
        print("\nSOTA Commands:")
        print("  energy               - Show energy & focus estimates")
        print("  calibration          - Show confidence calibration stats")
        print("  boundary             - Show task boundary effectiveness")
        print("  feedback             - Show implicit feedback stats")
        print("\nTesting:")
        print("  test                 - Run unit tests for calibration")
        print("\nExamples:")
        print("  python predictive_intent.py predict")
        print("  python predictive_intent.py energy")
        print("  python predictive_intent.py calibration")
        print("  python predictive_intent.py test")
        print("  python predictive_intent.py record check_calendar")


def test_confidence_calibration():
    """
    Unit test for ConfidenceCalibrator temperature scaling.

    Verifies that the temperature scaling formula works correctly:
    - temperature > 1: should make predictions LESS confident (closer to 0.5)
    - temperature < 1: should make predictions MORE confident (away from 0.5)
    - temperature = 1: should leave predictions unchanged
    - Edge cases: handles p=0 and p=1 gracefully
    """
    print("\n" + "=" * 60)
    print("UNIT TEST: ConfidenceCalibrator Temperature Scaling")
    print("=" * 60)

    calibrator = ConfidenceCalibrator()
    all_passed = True

    # Test 1: Temperature = 1 should leave confidence unchanged
    print("\nTest 1: Temperature = 1.0 (identity)")
    for test_conf in [0.3, 0.5, 0.7, 0.9]:
        result = calibrator._temperature_scale(test_conf, 1.0)
        passed = abs(result - test_conf) < 0.001
        status = "PASS" if passed else "FAIL"
        print(f"  {test_conf:.1f} -> {result:.4f} [{status}]")
        if not passed:
            all_passed = False

    # Test 2: Temperature > 1 should make predictions LESS confident (closer to 0.5)
    print("\nTest 2: Temperature = 2.0 (should move toward 0.5)")
    for test_conf in [0.8, 0.9, 0.95]:
        result = calibrator._temperature_scale(test_conf, 2.0)
        # Result should be between 0.5 and original
        passed = 0.5 < result < test_conf
        status = "PASS" if passed else "FAIL"
        print(f"  {test_conf:.2f} -> {result:.4f} (moved toward 0.5) [{status}]")
        if not passed:
            all_passed = False

    for test_conf in [0.2, 0.1, 0.05]:
        result = calibrator._temperature_scale(test_conf, 2.0)
        # Result should be between original and 0.5
        passed = test_conf < result < 0.5
        status = "PASS" if passed else "FAIL"
        print(f"  {test_conf:.2f} -> {result:.4f} (moved toward 0.5) [{status}]")
        if not passed:
            all_passed = False

    # Test 3: Temperature < 1 should make predictions MORE confident (away from 0.5)
    print("\nTest 3: Temperature = 0.5 (should move away from 0.5)")
    for test_conf in [0.7, 0.8]:
        result = calibrator._temperature_scale(test_conf, 0.5)
        # Result should be more extreme (further from 0.5)
        passed = result > test_conf
        status = "PASS" if passed else "FAIL"
        print(f"  {test_conf:.2f} -> {result:.4f} (more confident, moved away from 0.5) [{status}]")
        if not passed:
            all_passed = False

    for test_conf in [0.3, 0.2]:
        result = calibrator._temperature_scale(test_conf, 0.5)
        # Result should be more extreme (further from 0.5)
        passed = result < test_conf
        status = "PASS" if passed else "FAIL"
        print(f"  {test_conf:.2f} -> {result:.4f} (more confident, moved away from 0.5) [{status}]")
        if not passed:
            all_passed = False

    # Test 4: Edge cases (p near 0 and 1)
    print("\nTest 4: Edge cases (boundary handling)")
    for edge_conf in [0.0, 0.0001, 0.9999, 1.0]:
        try:
            result = calibrator._temperature_scale(edge_conf, 1.5)
            passed = 0.0 <= result <= 1.0
            status = "PASS" if passed else "FAIL"
            print(f"  {edge_conf:.4f} -> {result:.4f} (in valid range) [{status}]")
            if not passed:
                all_passed = False
        except Exception as e:
            print(f"  {edge_conf:.4f} -> ERROR: {e} [FAIL]")
            all_passed = False

    # Test 5: Verify symmetry around 0.5
    print("\nTest 5: Symmetry around 0.5")
    for offset in [0.1, 0.2, 0.3, 0.4]:
        high = 0.5 + offset
        low = 0.5 - offset
        high_result = calibrator._temperature_scale(high, 1.5)
        low_result = calibrator._temperature_scale(low, 1.5)
        # They should be equidistant from 0.5
        high_dist = abs(high_result - 0.5)
        low_dist = abs(low_result - 0.5)
        passed = abs(high_dist - low_dist) < 0.001
        status = "PASS" if passed else "FAIL"
        print(f"  {low:.1f} -> {low_result:.4f}, {high:.1f} -> {high_result:.4f} (symmetric) [{status}]")
        if not passed:
            all_passed = False

    # Summary
    print("\n" + "=" * 60)
    if all_passed:
        print("ALL TESTS PASSED - Temperature scaling is correctly implemented")
    else:
        print("SOME TESTS FAILED - Check implementation")
    print("=" * 60)

    return all_passed


if __name__ == "__main__":
    main()
