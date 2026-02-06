#!/usr/bin/env python3
"""
===============================================================================
CONTINUOUS LEARNING ENGINE - Phase 4: State of the Art Learning System
===============================================================================

This module implements a sophisticated learning system that:
- Tracks predictions and outcomes for confidence calibration
- Learns user patterns across multiple dimensions (time, priority, style, etc.)
- Implements temporal decay for stale patterns
- Supports export/import for backup and sync

Key Principles (2026 SOTA Research):
- Confidence calibration: If predicted 80% but actual acceptance is 95%, we're under-confident
- Pattern learning: Track what works for THIS specific user
- Decay: Recent behavior matters more than old behavior
- Multi-dimensional: Time, context, task type, weather sensitivity all matter

Integration:
- Frontend sends feedback via /api/learning/record
- Backend stores in .learning_state.json
- Calibrated confidence used by anticipatory_engine.py
- Patterns surfaced in web_dashboard.html settings panel

Author: PM_Architect
Date: 2026-02-04
"""

import json
import hashlib
import time
import math
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from enum import Enum
import threading

# ===============================================================================
# CONFIGURATION
# ===============================================================================

APP_DIR = Path(__file__).parent
LEARNING_STATE_FILE = APP_DIR / ".learning_state.json"
PREDICTIONS_FILE = APP_DIR / ".learning_predictions.json"
PATTERNS_FILE = APP_DIR / ".learning_patterns.json"

# Calibration settings
CALIBRATION_WINDOW = 100  # Number of recent predictions to use for calibration
MIN_CALIBRATION_SAMPLES = 10  # Minimum samples before applying calibration
CALIBRATION_CLAMP_MIN = 0.5  # Don't reduce confidence by more than 50%
CALIBRATION_CLAMP_MAX = 1.5  # Don't boost confidence by more than 50%

# Pattern decay
DEFAULT_DECAY_DAYS = 30  # Patterns older than this decay
DECAY_RATE = 0.03  # 3% decay per day after threshold

# ===============================================================================
# ENUMS & DATACLASSES
# ===============================================================================

class Outcome(Enum):
    """Possible outcomes for predictions/suggestions."""
    ACCEPTED = 'accepted'           # User clicked approve
    REJECTED = 'rejected'           # User clicked reject
    MODIFIED = 'modified'           # User edited before accepting
    IGNORED = 'ignored'             # User didn't interact (timeout)
    EXECUTED_UNDO = 'executed_undo' # Auto-executed but user undid it


# Outcome weights for learning
OUTCOME_WEIGHTS = {
    Outcome.ACCEPTED.value: 1.0,      # Strong positive signal
    Outcome.REJECTED.value: -0.5,     # Negative but informative
    Outcome.MODIFIED.value: 0.5,      # Partial positive - we were close
    Outcome.IGNORED.value: 0.0,       # Neutral (maybe didn't see it)
    Outcome.EXECUTED_UNDO.value: -1.0 # Strong negative - we got it wrong
}


# Learnable pattern categories
LEARNABLE_PATTERNS = {
    'time_preferences': {
        'description': 'When user prefers to do certain task types',
        'signals': ['task_type', 'start_time', 'day_of_week']
    },
    'priority_adjustments': {
        'description': 'How user actually prioritizes vs stated priority',
        'signals': ['stated_priority', 'actual_completion_order']
    },
    'email_response_style': {
        'description': 'Tone, length, formality of email responses',
        'signals': ['recipient_type', 'response_length', 'response_tone']
    },
    'task_duration_accuracy': {
        'description': 'How long tasks actually take vs estimates',
        'signals': ['estimated_duration', 'actual_duration', 'task_type']
    },
    'weather_sensitivity': {
        'description': 'How much weather affects user decisions',
        'signals': ['weather_condition', 'task_rescheduled', 'task_type']
    },
    'energy_level_patterns': {
        'description': 'When user has high/low energy for different tasks',
        'signals': ['time_of_day', 'task_difficulty', 'completion_quality']
    },
    'interruption_tolerance': {
        'description': 'When user accepts/rejects interruptions',
        'signals': ['time_of_day', 'current_task_type', 'interruption_type']
    }
}


@dataclass
class Prediction:
    """A recorded prediction with its context."""
    prediction_id: str
    prediction_type: str  # task_suggestion, email_draft, schedule_change, etc.
    confidence: float  # Raw confidence (0-1)
    context: Dict[str, Any]  # Relevant context when prediction was made
    timestamp: str
    suggestion_text: Optional[str] = None


@dataclass
class RecordedOutcome:
    """The outcome of a prediction."""
    prediction_id: str
    outcome: str  # One of Outcome values
    user_modification: Optional[str] = None  # If modified, what did user change
    response_time_ms: Optional[int] = None  # How long user took to respond
    timestamp: str = ""


@dataclass
class PatternEntry:
    """A learned pattern entry."""
    pattern_type: str
    pattern_key: str  # e.g., "Monday_09" for time patterns
    weight: float  # Current learned weight
    sample_count: int
    last_updated: str
    context_summary: Dict[str, Any] = field(default_factory=dict)


# ===============================================================================
# UTILITY FUNCTIONS
# ===============================================================================

def safe_read_json(path: Path, default: Any = None) -> Any:
    """Safely read JSON file with error handling."""
    try:
        if path.exists():
            return json.loads(path.read_text())
    except (json.JSONDecodeError, IOError):
        pass
    return default if default is not None else {}


def safe_write_json(path: Path, data: Any) -> bool:
    """Safely write JSON file with atomic write."""
    try:
        temp_path = path.with_suffix('.tmp')
        temp_path.write_text(json.dumps(data, indent=2, default=str))
        temp_path.rename(path)
        return True
    except IOError:
        return False


def generate_prediction_id() -> str:
    """Generate a unique prediction ID."""
    return hashlib.sha256(
        f"{datetime.now().isoformat()}:{time.time_ns()}".encode()
    ).hexdigest()[:16]


# ===============================================================================
# LEARNING ENGINE
# ===============================================================================

class LearningEngine:
    """
    Core learning engine for continuous improvement.

    This engine:
    1. Records predictions with their raw confidence
    2. Tracks outcomes (accepted/rejected/modified/ignored/undone)
    3. Calibrates confidence based on historical accuracy
    4. Learns patterns specific to this user
    5. Decays old patterns to adapt to changing behavior

    Usage:
        engine = LearningEngine()

        # Record a prediction
        pred_id = engine.record_prediction(
            prediction_type='task_suggestion',
            confidence=0.82,
            context={'task_type': 'email', 'time_of_day': 'morning'}
        )

        # Later, record the outcome
        engine.record_outcome(pred_id, Outcome.ACCEPTED)

        # Get calibrated confidence for new predictions
        calibrated = engine.get_calibrated_confidence(0.75)
    """

    def __init__(self):
        self.predictions: List[Prediction] = []
        self.outcomes: List[RecordedOutcome] = []
        self.patterns: Dict[str, PatternEntry] = {}
        self.confidence_calibration: float = 1.0
        self._lock = threading.RLock()
        self._load()

    def _load(self):
        """Load state from disk."""
        # Load predictions
        pred_data = safe_read_json(PREDICTIONS_FILE, {"predictions": [], "outcomes": []})
        for p in pred_data.get("predictions", [])[-500:]:  # Keep last 500
            try:
                self.predictions.append(Prediction(**p))
            except (TypeError, KeyError):
                pass
        for o in pred_data.get("outcomes", [])[-500:]:
            try:
                self.outcomes.append(RecordedOutcome(**o))
            except (TypeError, KeyError):
                pass

        # Load patterns
        pattern_data = safe_read_json(PATTERNS_FILE, {"patterns": {}, "calibration": 1.0})
        self.confidence_calibration = pattern_data.get("calibration", 1.0)
        for key, p in pattern_data.get("patterns", {}).items():
            try:
                self.patterns[key] = PatternEntry(**p)
            except (TypeError, KeyError):
                pass

    def _save_predictions(self):
        """Save predictions and outcomes to disk."""
        data = {
            "predictions": [asdict(p) for p in self.predictions[-500:]],
            "outcomes": [asdict(o) for o in self.outcomes[-500:]],
            "last_updated": datetime.now().isoformat()
        }
        safe_write_json(PREDICTIONS_FILE, data)

    def _save_patterns(self):
        """Save patterns and calibration to disk."""
        data = {
            "patterns": {k: asdict(v) for k, v in self.patterns.items()},
            "calibration": self.confidence_calibration,
            "last_updated": datetime.now().isoformat()
        }
        safe_write_json(PATTERNS_FILE, data)

    # ===== PREDICTION RECORDING =====

    def record_prediction(
        self,
        prediction_type: str,
        confidence: float,
        context: Dict[str, Any] = None,
        suggestion_text: str = None
    ) -> str:
        """
        Record a prediction/suggestion that was made.

        Args:
            prediction_type: Type of prediction (task_suggestion, email_draft, etc.)
            confidence: Raw confidence score (0-1)
            context: Contextual information when prediction was made
            suggestion_text: Optional text of the suggestion

        Returns:
            prediction_id for later outcome recording
        """
        with self._lock:
            pred_id = generate_prediction_id()
            prediction = Prediction(
                prediction_id=pred_id,
                prediction_type=prediction_type,
                confidence=confidence,
                context=context or {},
                timestamp=datetime.now().isoformat(),
                suggestion_text=suggestion_text
            )
            self.predictions.append(prediction)
            self._save_predictions()
            return pred_id

    def record_outcome(
        self,
        prediction_id: str,
        outcome: Outcome,
        user_modification: str = None,
        response_time_ms: int = None
    ) -> bool:
        """
        Record the outcome of a prediction.

        Args:
            prediction_id: ID returned from record_prediction
            outcome: The outcome enum value
            user_modification: If modified, what was changed
            response_time_ms: How long user took to respond

        Returns:
            True if recorded successfully
        """
        with self._lock:
            # Find the prediction
            prediction = None
            for p in self.predictions:
                if p.prediction_id == prediction_id:
                    prediction = p
                    break

            if not prediction:
                return False

            # Record outcome
            recorded = RecordedOutcome(
                prediction_id=prediction_id,
                outcome=outcome.value if isinstance(outcome, Outcome) else outcome,
                user_modification=user_modification,
                response_time_ms=response_time_ms,
                timestamp=datetime.now().isoformat()
            )
            self.outcomes.append(recorded)

            # Update confidence calibration
            self.update_confidence_calibration()

            # Learn from this interaction
            self.learn_pattern(prediction.context, outcome, prediction.prediction_type)

            self._save_predictions()
            self._save_patterns()
            return True

    # ===== CONFIDENCE CALIBRATION =====

    def update_confidence_calibration(self) -> float:
        """
        Update confidence calibration based on recent predictions and outcomes.

        Formula:
        If predicted confidence = 80% but actual acceptance = 95%,
        calibration factor = 95/80 = 1.1875

        Next time, raw 80% becomes 80% * 1.1875 = 95%

        Returns:
            New calibration factor
        """
        with self._lock:
            # Need minimum samples
            if len(self.predictions) < MIN_CALIBRATION_SAMPLES:
                return self.confidence_calibration

            # Get recent predictions with outcomes
            recent_preds = self.predictions[-CALIBRATION_WINDOW:]
            outcome_map = {o.prediction_id: o for o in self.outcomes}

            # Calculate actual acceptance rate vs predicted confidence
            predictions_with_outcomes = []
            for pred in recent_preds:
                if pred.prediction_id in outcome_map:
                    predictions_with_outcomes.append((pred, outcome_map[pred.prediction_id]))

            if len(predictions_with_outcomes) < MIN_CALIBRATION_SAMPLES:
                return self.confidence_calibration

            # Count accepted (including modified with positive weight)
            accepted = 0
            total_weight = 0
            total_confidence = 0

            for pred, outcome in predictions_with_outcomes:
                weight = OUTCOME_WEIGHTS.get(outcome.outcome, 0)
                if weight > 0:
                    accepted += weight
                total_weight += 1
                total_confidence += pred.confidence

            if total_weight == 0 or total_confidence == 0:
                return self.confidence_calibration

            actual_accuracy = accepted / total_weight
            avg_confidence = total_confidence / total_weight

            # Calculate calibration factor
            if avg_confidence > 0:
                new_calibration = actual_accuracy / avg_confidence
                # Clamp to reasonable range
                new_calibration = max(
                    CALIBRATION_CLAMP_MIN,
                    min(CALIBRATION_CLAMP_MAX, new_calibration)
                )
            else:
                new_calibration = 1.0

            # Smooth transition (don't jump immediately)
            self.confidence_calibration = (
                0.8 * self.confidence_calibration + 0.2 * new_calibration
            )

            return self.confidence_calibration

    def get_calibrated_confidence(self, raw_confidence: float) -> float:
        """
        Apply calibration to a raw confidence score.

        Args:
            raw_confidence: The original confidence (0-1)

        Returns:
            Calibrated confidence, clamped to (0, 1)
        """
        calibrated = raw_confidence * self.confidence_calibration
        return max(0.0, min(1.0, calibrated))

    # ===== PATTERN LEARNING =====

    def learn_pattern(
        self,
        context: Dict[str, Any],
        outcome: Outcome,
        prediction_type: str
    ) -> None:
        """
        Learn from a single interaction.

        Updates pattern weights based on outcome.

        Args:
            context: The context when prediction was made
            outcome: The outcome of the prediction
            prediction_type: Type of prediction for categorization
        """
        with self._lock:
            outcome_val = outcome.value if isinstance(outcome, Outcome) else outcome
            weight = OUTCOME_WEIGHTS.get(outcome_val, 0)

            # Time-based pattern
            if 'time_of_day' in context or 'hour' in context:
                hour = context.get('hour', datetime.now().hour)
                day = context.get('day_of_week', datetime.now().strftime('%A'))
                self._update_pattern(
                    'time_preferences',
                    f"{day}_{hour}",
                    weight,
                    {'prediction_type': prediction_type, 'hour': hour, 'day': day}
                )

            # Task type pattern
            if 'task_type' in context:
                self._update_pattern(
                    'priority_adjustments',
                    f"{context['task_type']}",
                    weight,
                    {'task_type': context['task_type'], 'prediction_type': prediction_type}
                )

            # Energy level pattern (time + task difficulty)
            if 'task_difficulty' in context:
                hour = context.get('hour', datetime.now().hour)
                self._update_pattern(
                    'energy_level_patterns',
                    f"{hour}_{context['task_difficulty']}",
                    weight,
                    {'hour': hour, 'difficulty': context['task_difficulty']}
                )

            # Weather sensitivity
            if 'weather' in context:
                self._update_pattern(
                    'weather_sensitivity',
                    f"{context['weather']}_{context.get('task_type', 'general')}",
                    weight,
                    {'weather': context['weather']}
                )

    def _update_pattern(
        self,
        pattern_type: str,
        pattern_key: str,
        outcome_weight: float,
        context_summary: Dict[str, Any]
    ):
        """Update a single pattern entry."""
        full_key = f"{pattern_type}:{pattern_key}"

        if full_key in self.patterns:
            entry = self.patterns[full_key]
            # Running weighted average
            n = entry.sample_count
            entry.weight = (entry.weight * n + outcome_weight) / (n + 1)
            entry.sample_count = n + 1
            entry.last_updated = datetime.now().isoformat()
            entry.context_summary.update(context_summary)
        else:
            self.patterns[full_key] = PatternEntry(
                pattern_type=pattern_type,
                pattern_key=pattern_key,
                weight=outcome_weight,
                sample_count=1,
                last_updated=datetime.now().isoformat(),
                context_summary=context_summary
            )

    def get_pattern_weight(self, pattern_type: str, pattern_key: str = None) -> float:
        """
        Get the learned weight for a pattern.

        Args:
            pattern_type: Category of pattern
            pattern_key: Specific key within category

        Returns:
            Weight (-1 to 1), or 0 if not learned
        """
        with self._lock:
            if pattern_key:
                full_key = f"{pattern_type}:{pattern_key}"
                if full_key in self.patterns:
                    return self.patterns[full_key].weight
                return 0.0
            else:
                # Return average for pattern type
                relevant = [p for k, p in self.patterns.items() if k.startswith(f"{pattern_type}:")]
                if relevant:
                    return sum(p.weight for p in relevant) / len(relevant)
                return 0.0

    def get_patterns_for_context(self, context: Dict[str, Any]) -> Dict[str, float]:
        """
        Get all relevant pattern weights for a given context.

        Args:
            context: Current context

        Returns:
            Dict of pattern_type -> weight
        """
        with self._lock:
            result = {}

            # Time pattern
            hour = context.get('hour', datetime.now().hour)
            day = context.get('day_of_week', datetime.now().strftime('%A'))
            result['time_preferences'] = self.get_pattern_weight('time_preferences', f"{day}_{hour}")

            # Task type
            if 'task_type' in context:
                result['priority_adjustments'] = self.get_pattern_weight(
                    'priority_adjustments', context['task_type']
                )

            # Energy level
            if 'task_difficulty' in context:
                result['energy_level_patterns'] = self.get_pattern_weight(
                    'energy_level_patterns', f"{hour}_{context['task_difficulty']}"
                )

            # Weather
            if 'weather' in context:
                result['weather_sensitivity'] = self.get_pattern_weight(
                    'weather_sensitivity', f"{context['weather']}_{context.get('task_type', 'general')}"
                )

            return result

    # ===== PATTERN DECAY =====

    def decay_old_patterns(self, days: int = DEFAULT_DECAY_DAYS) -> int:
        """
        Apply decay to patterns older than threshold.

        Patterns decay toward neutral (0) over time to adapt to
        changing user behavior.

        Args:
            days: Patterns older than this many days will decay

        Returns:
            Number of patterns decayed
        """
        with self._lock:
            cutoff = datetime.now() - timedelta(days=days)
            decayed_count = 0

            for key, pattern in list(self.patterns.items()):
                try:
                    last_updated = datetime.fromisoformat(pattern.last_updated)
                    if last_updated < cutoff:
                        # Calculate days since update
                        days_old = (datetime.now() - last_updated).days
                        days_past_threshold = days_old - days

                        # Apply exponential decay
                        decay_factor = math.exp(-DECAY_RATE * days_past_threshold)
                        pattern.weight *= decay_factor
                        decayed_count += 1

                        # Remove patterns that have decayed to near-zero
                        if abs(pattern.weight) < 0.01:
                            del self.patterns[key]
                except (ValueError, TypeError):
                    pass

            if decayed_count > 0:
                self._save_patterns()

            return decayed_count

    # ===== EXPORT/IMPORT =====

    def export_learning_state(self) -> dict:
        """
        Export complete learning state for backup/sync.

        Returns:
            Dict containing all learning data
        """
        with self._lock:
            return {
                "version": "1.0",
                "exported_at": datetime.now().isoformat(),
                "predictions": [asdict(p) for p in self.predictions],
                "outcomes": [asdict(o) for o in self.outcomes],
                "patterns": {k: asdict(v) for k, v in self.patterns.items()},
                "confidence_calibration": self.confidence_calibration,
                "stats": self.get_stats()
            }

    def import_learning_state(self, state: dict) -> bool:
        """
        Import learning state from backup.

        Args:
            state: Previously exported state dict

        Returns:
            True if import successful
        """
        with self._lock:
            try:
                # Validate version
                version = state.get("version", "0")
                if version != "1.0":
                    return False

                # Import predictions
                self.predictions = []
                for p in state.get("predictions", []):
                    self.predictions.append(Prediction(**p))

                # Import outcomes
                self.outcomes = []
                for o in state.get("outcomes", []):
                    self.outcomes.append(RecordedOutcome(**o))

                # Import patterns
                self.patterns = {}
                for k, v in state.get("patterns", {}).items():
                    self.patterns[k] = PatternEntry(**v)

                # Import calibration
                self.confidence_calibration = state.get("confidence_calibration", 1.0)

                # Save to disk
                self._save_predictions()
                self._save_patterns()

                return True
            except (TypeError, KeyError, ValueError):
                return False

    # ===== STATISTICS =====

    def get_stats(self) -> Dict[str, Any]:
        """
        Get learning system statistics.

        Returns:
            Dict with various statistics
        """
        with self._lock:
            outcome_counts = {}
            for o in self.outcomes:
                outcome_counts[o.outcome] = outcome_counts.get(o.outcome, 0) + 1

            # Calculate acceptance rate
            positive_outcomes = sum(
                1 for o in self.outcomes
                if o.outcome in [Outcome.ACCEPTED.value, Outcome.MODIFIED.value]
            )
            total_outcomes = len(self.outcomes)
            acceptance_rate = positive_outcomes / total_outcomes if total_outcomes > 0 else 0

            # Pattern stats
            patterns_by_type = {}
            for key, pattern in self.patterns.items():
                ptype = pattern.pattern_type
                if ptype not in patterns_by_type:
                    patterns_by_type[ptype] = {"count": 0, "avg_weight": 0, "total_samples": 0}
                patterns_by_type[ptype]["count"] += 1
                patterns_by_type[ptype]["avg_weight"] += pattern.weight
                patterns_by_type[ptype]["total_samples"] += pattern.sample_count

            for ptype in patterns_by_type:
                if patterns_by_type[ptype]["count"] > 0:
                    patterns_by_type[ptype]["avg_weight"] /= patterns_by_type[ptype]["count"]

            return {
                "total_predictions": len(self.predictions),
                "total_outcomes": len(self.outcomes),
                "acceptance_rate": round(acceptance_rate, 3),
                "confidence_calibration": round(self.confidence_calibration, 3),
                "outcome_distribution": outcome_counts,
                "total_patterns": len(self.patterns),
                "patterns_by_type": patterns_by_type,
                "calibration_status": (
                    "under-confident" if self.confidence_calibration > 1.1 else
                    "over-confident" if self.confidence_calibration < 0.9 else
                    "well-calibrated"
                )
            }

    def get_learned_preferences(self) -> List[Dict[str, Any]]:
        """
        Get human-readable learned preferences for display.

        Returns:
            List of learned preference descriptions
        """
        with self._lock:
            preferences = []

            # Time preferences
            time_patterns = [
                (k, p) for k, p in self.patterns.items()
                if p.pattern_type == 'time_preferences' and p.sample_count >= 3
            ]
            for key, pattern in sorted(time_patterns, key=lambda x: -abs(x[1].weight))[:5]:
                if pattern.weight > 0.3:
                    preferences.append({
                        "type": "time_preference",
                        "description": f"You're more productive on {pattern.pattern_key.replace('_', ' at ')}:00",
                        "confidence": min(1.0, pattern.sample_count / 10),
                        "weight": pattern.weight
                    })
                elif pattern.weight < -0.3:
                    preferences.append({
                        "type": "time_preference",
                        "description": f"You tend to decline suggestions on {pattern.pattern_key.replace('_', ' at ')}:00",
                        "confidence": min(1.0, pattern.sample_count / 10),
                        "weight": pattern.weight
                    })

            # Task type preferences
            task_patterns = [
                (k, p) for k, p in self.patterns.items()
                if p.pattern_type == 'priority_adjustments' and p.sample_count >= 3
            ]
            for key, pattern in sorted(task_patterns, key=lambda x: -abs(x[1].weight))[:5]:
                if pattern.weight > 0.3:
                    preferences.append({
                        "type": "task_preference",
                        "description": f"You respond well to {pattern.pattern_key} suggestions",
                        "confidence": min(1.0, pattern.sample_count / 10),
                        "weight": pattern.weight
                    })

            return preferences


# ===============================================================================
# SINGLETON INSTANCE
# ===============================================================================

_learning_engine: Optional[LearningEngine] = None


def get_learning_engine() -> LearningEngine:
    """Get the singleton LearningEngine instance."""
    global _learning_engine
    if _learning_engine is None:
        _learning_engine = LearningEngine()
    return _learning_engine


# ===============================================================================
# CONVENIENCE FUNCTIONS
# ===============================================================================

def record_feedback(
    prediction_id: str,
    outcome: str,
    modification: str = None
) -> bool:
    """Record feedback from frontend (convenience function)."""
    engine = get_learning_engine()
    outcome_enum = Outcome(outcome) if outcome in [o.value for o in Outcome] else Outcome.IGNORED
    return engine.record_outcome(prediction_id, outcome_enum, modification)


def get_calibrated_confidence(raw: float) -> float:
    """Get calibrated confidence (convenience function)."""
    return get_learning_engine().get_calibrated_confidence(raw)


def get_learning_stats() -> dict:
    """Get learning statistics (convenience function)."""
    return get_learning_engine().get_stats()


# ===============================================================================
# CLI
# ===============================================================================

if __name__ == "__main__":
    import argparse
    import pprint

    parser = argparse.ArgumentParser(description="Learning Engine CLI")
    parser.add_argument("--stats", action="store_true", help="Show learning statistics")
    parser.add_argument("--preferences", action="store_true", help="Show learned preferences")
    parser.add_argument("--decay", action="store_true", help="Run pattern decay")
    parser.add_argument("--export", type=str, help="Export state to file")
    parser.add_argument("--import-state", type=str, help="Import state from file")
    args = parser.parse_args()

    engine = get_learning_engine()

    if args.stats:
        print("=" * 60)
        print("LEARNING ENGINE STATISTICS")
        print("=" * 60)
        pprint.pprint(engine.get_stats())

    elif args.preferences:
        print("=" * 60)
        print("LEARNED PREFERENCES")
        print("=" * 60)
        prefs = engine.get_learned_preferences()
        if prefs:
            for p in prefs:
                print(f"  - {p['description']}")
                print(f"    (confidence: {p['confidence']:.0%}, weight: {p['weight']:.2f})")
        else:
            print("  No significant preferences learned yet.")
            print("  Keep using the system to build your profile!")

    elif args.decay:
        decayed = engine.decay_old_patterns()
        print(f"Decayed {decayed} old patterns")

    elif args.export:
        state = engine.export_learning_state()
        with open(args.export, 'w') as f:
            json.dump(state, f, indent=2)
        print(f"Exported learning state to {args.export}")

    elif args.import_state:
        with open(args.import_state, 'r') as f:
            state = json.load(f)
        if engine.import_learning_state(state):
            print(f"Successfully imported learning state from {args.import_state}")
        else:
            print("Failed to import learning state")

    else:
        print("Learning Engine v1.0")
        print("Use --stats, --preferences, --decay, --export, or --import-state")
