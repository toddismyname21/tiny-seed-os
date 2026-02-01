#!/usr/bin/env python3
"""
===============================================================================
ENERGY TRACKING SYSTEM - TinyPM's #1 Differentiator
===============================================================================

THIS IS WHERE WE BECOME #1. No competitor does this.

A comprehensive energy-aware scheduling system that:
1. Implicitly detects energy from behavior (typing speed, task velocity, errors)
2. Offers optional explicit input (emoji-based, non-intrusive)
3. Visualizes energy curves and patterns
4. Provides energy-aware task suggestions
5. Manages task difficulty indicators
6. Auto-schedules recovery time blocks

Based on UX_SPEC_BEHAVIOR_ENERGY.md research:
- Rise App's energy potential scoring
- Circadian rhythm productivity research
- Cognitive load theory (Sweller)
- Modern burnout prevention strategies

Created: 2026-02-01
Author: Implementation Team - Energy Tracking System
"""

import json
import math
import statistics
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import hashlib

# Path configuration
APP_DIR = Path(__file__).parent

# Storage files
ENERGY_TRACKING_FILE = APP_DIR / ".pm_energy_tracking.json"
ENERGY_HISTORY_FILE = APP_DIR / ".pm_energy_history.json"
IMPLICIT_SIGNALS_FILE = APP_DIR / ".pm_implicit_signals.json"
RECOVERY_BLOCKS_FILE = APP_DIR / ".pm_recovery_blocks.json"
TASK_DIFFICULTY_FILE = APP_DIR / ".pm_task_difficulty.json"

# Import existing modules for integration
try:
    from predictive_intent import (
        EnergyFocusEstimator,
        ActionCategory,
        ActionEvent,
        FusedContext
    )
    PREDICTIVE_AVAILABLE = True
except ImportError:
    PREDICTIVE_AVAILABLE = False
    print("[EnergyTracking] predictive_intent not available - using standalone mode")


# ===============================================================================
# ENUMS & DATA CLASSES
# ===============================================================================

class EnergyLevel(Enum):
    """Energy levels for the 1-5 scale."""
    VERY_LOW = 1    # Exhausted, need rest
    LOW = 2         # Tired, low capacity
    NORMAL = 3      # Baseline, can function
    GOOD = 4        # Energized, productive
    GREAT = 5       # Peak performance


class TaskDifficulty(Enum):
    """Task difficulty levels matching cognitive load."""
    EASY = 1        # Quick wins, routine, no decisions
    LIGHT = 2       # Minor focus needed
    MEDIUM = 3      # Moderate focus, some decisions
    HARD = 4        # Significant concentration needed
    INTENSE = 5     # Deep work, complex decisions


class EnergySource(Enum):
    """Source of energy data."""
    IMPLICIT_TYPING = "implicit_typing"
    IMPLICIT_TASK_VELOCITY = "implicit_task_velocity"
    IMPLICIT_ERROR_RATE = "implicit_error_rate"
    IMPLICIT_ACTION_GAPS = "implicit_action_gaps"
    EXPLICIT_CHECKIN = "explicit_checkin"
    EXPLICIT_TASK_RATING = "explicit_task_rating"
    CIRCADIAN_DEFAULT = "circadian_default"
    LEARNED_PATTERN = "learned_pattern"


@dataclass
class EnergyReading:
    """A single energy reading from any source."""
    timestamp: datetime
    level: float                    # 0.0 - 1.0 normalized
    source: EnergySource
    raw_value: Any = None          # Original value before normalization
    confidence: float = 0.5         # How reliable is this reading
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "timestamp": self.timestamp.isoformat(),
            "level": round(self.level, 3),
            "source": self.source.value,
            "raw_value": self.raw_value,
            "confidence": round(self.confidence, 3),
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "EnergyReading":
        return cls(
            timestamp=datetime.fromisoformat(data["timestamp"]),
            level=data["level"],
            source=EnergySource(data["source"]),
            raw_value=data.get("raw_value"),
            confidence=data.get("confidence", 0.5),
            metadata=data.get("metadata", {})
        )


@dataclass
class DailyEnergyCurve:
    """Predicted energy levels throughout a day."""
    date: str
    hourly_levels: Dict[int, float]     # hour -> energy level (0.0-1.0)
    peak_hours: List[int]               # Hours with highest energy
    dip_hours: List[int]                # Hours with lowest energy
    confidence: float = 0.5
    based_on_samples: int = 0

    def to_dict(self) -> Dict:
        return {
            "date": self.date,
            "hourly_levels": self.hourly_levels,
            "peak_hours": self.peak_hours,
            "dip_hours": self.dip_hours,
            "confidence": round(self.confidence, 3),
            "based_on_samples": self.based_on_samples
        }


@dataclass
class WeeklyEnergyHeatmap:
    """Weekly energy patterns as a heatmap."""
    # Dict of day_of_week -> hour -> average energy level
    heatmap: Dict[int, Dict[int, float]]
    peak_time_slots: List[Tuple[int, int]]  # (day, hour) tuples
    low_time_slots: List[Tuple[int, int]]
    best_deep_work_day: int                  # 0=Monday
    based_on_weeks: int = 0

    def to_dict(self) -> Dict:
        return {
            "heatmap": self.heatmap,
            "peak_time_slots": self.peak_time_slots,
            "low_time_slots": self.low_time_slots,
            "best_deep_work_day": self.best_deep_work_day,
            "based_on_weeks": self.based_on_weeks
        }


@dataclass
class TaskWithDifficulty:
    """A task with computed difficulty indicator."""
    task_id: str
    title: str
    difficulty: TaskDifficulty
    difficulty_score: float              # 0.0 - 1.0
    difficulty_factors: Dict[str, float] # Factor breakdown
    best_energy_level: EnergyLevel       # Recommended minimum energy
    estimated_duration_minutes: int
    cognitive_load_type: str             # "analytical", "creative", "routine"

    def to_dict(self) -> Dict:
        return {
            "task_id": self.task_id,
            "title": self.title,
            "difficulty": self.difficulty.value,
            "difficulty_score": round(self.difficulty_score, 2),
            "difficulty_factors": self.difficulty_factors,
            "best_energy_level": self.best_energy_level.value,
            "estimated_duration_minutes": self.estimated_duration_minutes,
            "cognitive_load_type": self.cognitive_load_type
        }


@dataclass
class RecoveryBlock:
    """A scheduled recovery/break time block."""
    id: str
    start_time: datetime
    duration_minutes: int
    reason: str                          # Why recovery is suggested
    priority: int                        # Higher = more urgent
    suggestions: List[str]               # Break activity suggestions
    auto_scheduled: bool = True
    accepted: bool = False
    completed: bool = False

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "start_time": self.start_time.isoformat(),
            "duration_minutes": self.duration_minutes,
            "reason": self.reason,
            "priority": self.priority,
            "suggestions": self.suggestions,
            "auto_scheduled": self.auto_scheduled,
            "accepted": self.accepted,
            "completed": self.completed
        }


@dataclass
class EnergyAwareSuggestion:
    """A task suggestion matched to current energy level."""
    task: TaskWithDifficulty
    match_score: float                   # How well task matches current energy
    timing_recommendation: str           # "NOW", "In 2 hours", "Tomorrow AM"
    reasoning: str
    alternatives: List[str]              # Alternative easier/harder tasks

    def to_dict(self) -> Dict:
        return {
            "task": self.task.to_dict(),
            "match_score": round(self.match_score, 2),
            "timing_recommendation": self.timing_recommendation,
            "reasoning": self.reasoning,
            "alternatives": self.alternatives
        }


# ===============================================================================
# IMPLICIT ENERGY DETECTOR
# ===============================================================================

class ImplicitEnergyDetector:
    """
    Detects energy level from implicit behavioral signals.

    This is the core innovation - no explicit input required!

    Signals tracked:
    1. Typing speed patterns (fast & accurate = high energy)
    2. Task completion velocity (completing tasks quickly = energized)
    3. Time between actions (longer gaps = lower energy/distracted)
    4. Error rate (more errors = cognitive fatigue)
    """

    # Thresholds for signal interpretation
    TYPING_SPEED_BASELINE_WPM = 45       # Average typing speed
    TASK_VELOCITY_BASELINE_MIN = 25      # Avg minutes per task
    ACTION_GAP_NORMAL_SEC = 60           # Normal gap between actions
    ERROR_RATE_BASELINE = 0.05           # 5% error rate is normal

    def __init__(self):
        self.signals_history = self._load_signals()
        self.baselines = self._load_baselines()

    def _load_signals(self) -> List[Dict]:
        """Load signal history."""
        if IMPLICIT_SIGNALS_FILE.exists():
            try:
                data = json.loads(IMPLICIT_SIGNALS_FILE.read_text())
                return data.get("signals", [])[-5000:]  # Keep last 5000
            except:
                pass
        return []

    def _save_signals(self):
        """Save signals to storage."""
        try:
            data = {
                "signals": self.signals_history[-5000:],
                "updated_at": datetime.now().isoformat()
            }
            IMPLICIT_SIGNALS_FILE.write_text(json.dumps(data, indent=2))
        except Exception as e:
            print(f"[ImplicitEnergyDetector] Error saving: {e}")

    def _load_baselines(self) -> Dict:
        """Load or calculate personal baselines."""
        # Calculate from history if we have enough data
        if len(self.signals_history) >= 100:
            return self._calculate_personal_baselines()
        # Otherwise use defaults
        return {
            "typing_wpm": self.TYPING_SPEED_BASELINE_WPM,
            "task_minutes": self.TASK_VELOCITY_BASELINE_MIN,
            "action_gap_sec": self.ACTION_GAP_NORMAL_SEC,
            "error_rate": self.ERROR_RATE_BASELINE
        }

    def _calculate_personal_baselines(self) -> Dict:
        """Calculate personalized baselines from history."""
        typing_speeds = []
        task_durations = []
        action_gaps = []
        error_rates = []

        for signal in self.signals_history:
            source = signal.get("source")
            value = signal.get("raw_value")
            if value is None:
                continue

            if source == "typing_speed":
                typing_speeds.append(value)
            elif source == "task_duration":
                task_durations.append(value)
            elif source == "action_gap":
                action_gaps.append(value)
            elif source == "error_rate":
                error_rates.append(value)

        return {
            "typing_wpm": statistics.median(typing_speeds) if typing_speeds else self.TYPING_SPEED_BASELINE_WPM,
            "task_minutes": statistics.median(task_durations) if task_durations else self.TASK_VELOCITY_BASELINE_MIN,
            "action_gap_sec": statistics.median(action_gaps) if action_gaps else self.ACTION_GAP_NORMAL_SEC,
            "error_rate": statistics.median(error_rates) if error_rates else self.ERROR_RATE_BASELINE
        }

    def record_typing_speed(self, chars_typed: int, seconds_elapsed: float) -> EnergyReading:
        """
        Record typing speed as an energy signal.

        Higher typing speed (relative to baseline) suggests higher energy.
        """
        if seconds_elapsed <= 0:
            return None

        # Calculate words per minute (assuming 5 chars per word)
        wpm = (chars_typed / 5) / (seconds_elapsed / 60)

        # Normalize relative to baseline
        baseline = self.baselines["typing_wpm"]
        ratio = wpm / baseline
        energy_level = min(1.0, max(0.1, ratio * 0.5 + 0.25))  # Map 0.5x-1.5x to 0.1-1.0

        # Confidence based on sample size
        confidence = min(0.8, chars_typed / 100)

        reading = EnergyReading(
            timestamp=datetime.now(),
            level=energy_level,
            source=EnergySource.IMPLICIT_TYPING,
            raw_value=wpm,
            confidence=confidence,
            metadata={"chars": chars_typed, "seconds": seconds_elapsed, "baseline_wpm": baseline}
        )

        self._record_signal("typing_speed", wpm, energy_level, confidence)
        return reading

    def record_task_completion(
        self,
        task_id: str,
        started_at: datetime,
        completed_at: datetime,
        estimated_minutes: int = None
    ) -> EnergyReading:
        """
        Record task completion velocity as an energy signal.

        Completing tasks faster than expected = higher energy.
        """
        duration_minutes = (completed_at - started_at).total_seconds() / 60

        if estimated_minutes and estimated_minutes > 0:
            # Compare to estimate
            ratio = estimated_minutes / duration_minutes  # >1 = faster than expected
        else:
            # Compare to baseline
            baseline = self.baselines["task_minutes"]
            ratio = baseline / duration_minutes

        # Map ratio to energy level
        energy_level = min(1.0, max(0.1, ratio * 0.4 + 0.3))

        # Higher confidence if we had an estimate
        confidence = 0.7 if estimated_minutes else 0.5

        reading = EnergyReading(
            timestamp=completed_at,
            level=energy_level,
            source=EnergySource.IMPLICIT_TASK_VELOCITY,
            raw_value=duration_minutes,
            confidence=confidence,
            metadata={
                "task_id": task_id,
                "duration_minutes": duration_minutes,
                "estimated_minutes": estimated_minutes,
                "velocity_ratio": ratio
            }
        )

        self._record_signal("task_duration", duration_minutes, energy_level, confidence)
        return reading

    def record_action_gap(self, previous_action_time: datetime) -> EnergyReading:
        """
        Record time gap between actions as an energy signal.

        Longer gaps suggest lower energy or distraction.
        """
        gap_seconds = (datetime.now() - previous_action_time).total_seconds()

        baseline = self.baselines["action_gap_sec"]
        ratio = baseline / gap_seconds  # <1 = longer than normal

        # Map to energy level (longer gaps = lower energy)
        if gap_seconds < 10:
            energy_level = 0.9  # Very active
        elif gap_seconds < 60:
            energy_level = 0.7  # Normal pace
        elif gap_seconds < 300:
            energy_level = 0.5  # Slowing down
        elif gap_seconds < 900:
            energy_level = 0.3  # Very slow
        else:
            energy_level = 0.2  # Probably away

        confidence = 0.5 if gap_seconds < 900 else 0.3

        reading = EnergyReading(
            timestamp=datetime.now(),
            level=energy_level,
            source=EnergySource.IMPLICIT_ACTION_GAPS,
            raw_value=gap_seconds,
            confidence=confidence,
            metadata={"baseline_sec": baseline, "gap_ratio": ratio}
        )

        self._record_signal("action_gap", gap_seconds, energy_level, confidence)
        return reading

    def record_error_event(self, error_count: int, total_actions: int) -> EnergyReading:
        """
        Record error rate as an energy signal.

        Higher error rate suggests cognitive fatigue.
        """
        if total_actions <= 0:
            return None

        error_rate = error_count / total_actions
        baseline = self.baselines["error_rate"]
        ratio = baseline / (error_rate + 0.01)  # >1 = fewer errors than normal

        # Map to energy level (more errors = lower energy)
        energy_level = min(1.0, max(0.1, ratio * 0.3 + 0.4))

        confidence = min(0.7, total_actions / 50)

        reading = EnergyReading(
            timestamp=datetime.now(),
            level=energy_level,
            source=EnergySource.IMPLICIT_ERROR_RATE,
            raw_value=error_rate,
            confidence=confidence,
            metadata={
                "error_count": error_count,
                "total_actions": total_actions,
                "baseline_rate": baseline
            }
        )

        self._record_signal("error_rate", error_rate, energy_level, confidence)
        return reading

    def _record_signal(self, source: str, raw_value: Any, energy: float, confidence: float):
        """Internal: record a signal to history."""
        self.signals_history.append({
            "timestamp": datetime.now().isoformat(),
            "source": source,
            "raw_value": raw_value,
            "energy_level": energy,
            "confidence": confidence
        })

        # Periodically save and recalculate baselines
        if len(self.signals_history) % 50 == 0:
            self._save_signals()
            self.baselines = self._calculate_personal_baselines()

    def get_current_estimate(self, lookback_minutes: int = 30) -> EnergyReading:
        """
        Get current energy estimate from recent implicit signals.

        Combines multiple signal types with weighted average.
        """
        cutoff = datetime.now() - timedelta(minutes=lookback_minutes)

        recent_signals = [
            s for s in self.signals_history
            if datetime.fromisoformat(s["timestamp"]) > cutoff
        ]

        if not recent_signals:
            # No recent signals - return baseline
            return EnergyReading(
                timestamp=datetime.now(),
                level=0.5,
                source=EnergySource.CIRCADIAN_DEFAULT,
                confidence=0.3,
                metadata={"reason": "no_recent_signals"}
            )

        # Weighted average by confidence
        total_weight = 0
        weighted_energy = 0

        for signal in recent_signals:
            weight = signal["confidence"]
            weighted_energy += signal["energy_level"] * weight
            total_weight += weight

        avg_energy = weighted_energy / total_weight if total_weight > 0 else 0.5
        avg_confidence = total_weight / len(recent_signals)

        return EnergyReading(
            timestamp=datetime.now(),
            level=avg_energy,
            source=EnergySource.LEARNED_PATTERN,
            confidence=avg_confidence,
            metadata={"signal_count": len(recent_signals), "lookback_minutes": lookback_minutes}
        )

    def get_stats(self) -> Dict:
        """Get implicit detection statistics."""
        return {
            "total_signals": len(self.signals_history),
            "baselines": self.baselines,
            "recent_signals_1hr": len([
                s for s in self.signals_history
                if datetime.fromisoformat(s["timestamp"]) > datetime.now() - timedelta(hours=1)
            ]),
            "signal_distribution": {
                source: len([s for s in self.signals_history if s["source"] == source])
                for source in ["typing_speed", "task_duration", "action_gap", "error_rate"]
            }
        }


# ===============================================================================
# EXPLICIT ENERGY INPUT (OPTIONAL)
# ===============================================================================

class ExplicitEnergyInput:
    """
    Handles optional explicit energy check-ins.

    Key principles:
    - Always optional, never required
    - Quick and non-intrusive (single tap)
    - Emoji-based for emotional resonance
    - Can be skipped without penalty
    """

    # Emoji mappings for energy levels
    ENERGY_EMOJIS = {
        EnergyLevel.VERY_LOW: ("exhausted", ["sleeping_face", "tired_face"]),
        EnergyLevel.LOW: ("drained", ["weary_face", "pensive_face"]),
        EnergyLevel.NORMAL: ("okay", ["neutral_face", "slightly_smiling_face"]),
        EnergyLevel.GOOD: ("good", ["smile", "grinning_face"]),
        EnergyLevel.GREAT: ("great", ["star_struck", "sunglasses", "muscle"])
    }

    def __init__(self):
        self.checkin_history: List[EnergyReading] = []
        self._load_history()

    def _load_history(self):
        """Load check-in history."""
        if ENERGY_HISTORY_FILE.exists():
            try:
                data = json.loads(ENERGY_HISTORY_FILE.read_text())
                self.checkin_history = [
                    EnergyReading.from_dict(r)
                    for r in data.get("checkins", [])
                ]
            except:
                pass

    def _save_history(self):
        """Save check-in history."""
        try:
            data = {
                "checkins": [r.to_dict() for r in self.checkin_history[-1000:]],
                "updated_at": datetime.now().isoformat()
            }
            ENERGY_HISTORY_FILE.write_text(json.dumps(data, indent=2))
        except Exception as e:
            print(f"[ExplicitEnergyInput] Error saving: {e}")

    def record_morning_checkin(
        self,
        energy_level: int,
        sleep_quality: int = None
    ) -> EnergyReading:
        """
        Record morning energy check-in.

        Args:
            energy_level: 1-5 scale
            sleep_quality: Optional 1-4 scale (Poor, Fair, Good, Great)
        """
        # Normalize to 0-1
        normalized = (energy_level - 1) / 4.0

        # Adjust based on sleep quality if provided
        if sleep_quality:
            sleep_factor = (sleep_quality - 1) / 3.0  # 0-1
            # Weight: 70% stated energy, 30% sleep quality
            normalized = 0.7 * normalized + 0.3 * sleep_factor

        reading = EnergyReading(
            timestamp=datetime.now(),
            level=normalized,
            source=EnergySource.EXPLICIT_CHECKIN,
            raw_value=energy_level,
            confidence=0.9,  # Explicit input is high confidence
            metadata={
                "type": "morning_checkin",
                "sleep_quality": sleep_quality
            }
        )

        self.checkin_history.append(reading)
        self._save_history()

        return reading

    def record_post_task_rating(
        self,
        task_id: str,
        energy_during: str  # "low", "medium", "high"
    ) -> EnergyReading:
        """
        Record quick energy rating after task completion.

        This is the non-blocking toast: "How was your energy during that task?"
        """
        energy_map = {
            "low": 0.25,
            "medium": 0.5,
            "high": 0.8
        }

        normalized = energy_map.get(energy_during.lower(), 0.5)

        reading = EnergyReading(
            timestamp=datetime.now(),
            level=normalized,
            source=EnergySource.EXPLICIT_TASK_RATING,
            raw_value=energy_during,
            confidence=0.85,
            metadata={
                "type": "post_task_rating",
                "task_id": task_id
            }
        )

        self.checkin_history.append(reading)
        self._save_history()

        return reading

    def get_last_explicit_reading(self, max_hours_ago: int = 4) -> Optional[EnergyReading]:
        """Get most recent explicit energy reading."""
        cutoff = datetime.now() - timedelta(hours=max_hours_ago)

        for reading in reversed(self.checkin_history):
            if reading.timestamp > cutoff:
                return reading

        return None

    def get_checkin_prompt(self) -> Dict:
        """
        Get a check-in prompt for the UI.

        Returns structured data for the optional check-in UI.
        """
        now = datetime.now()
        is_morning = 6 <= now.hour <= 10

        if is_morning:
            return {
                "type": "morning",
                "title": "Good morning! How are you feeling?",
                "options": [
                    {"value": 1, "label": "Very Low", "emoji": "tired_face"},
                    {"value": 2, "label": "Low", "emoji": "weary_face"},
                    {"value": 3, "label": "Normal", "emoji": "neutral_face"},
                    {"value": 4, "label": "Good", "emoji": "smile"},
                    {"value": 5, "label": "Great", "emoji": "star_struck"}
                ],
                "sleep_question": {
                    "title": "Sleep quality last night?",
                    "options": [
                        {"value": 1, "label": "Poor"},
                        {"value": 2, "label": "Fair"},
                        {"value": 3, "label": "Good"},
                        {"value": 4, "label": "Great"}
                    ]
                },
                "skippable": True
            }
        else:
            return {
                "type": "anytime",
                "title": "Quick energy check",
                "options": [
                    {"value": 1, "label": "Low", "emoji": "weary_face"},
                    {"value": 3, "label": "Medium", "emoji": "neutral_face"},
                    {"value": 5, "label": "High", "emoji": "muscle"}
                ],
                "skippable": True
            }


# ===============================================================================
# ENERGY CURVE PREDICTOR
# ===============================================================================

class EnergyCurvePredictor:
    """
    Predicts energy curves based on historical patterns.

    Combines:
    1. Default circadian rhythm curve
    2. Personal historical patterns
    3. Day-of-week variations
    4. Recent readings for real-time adjustment
    """

    # Default circadian energy curve (based on research)
    DEFAULT_CURVE = {
        0: 0.15, 1: 0.10, 2: 0.08, 3: 0.08, 4: 0.10, 5: 0.20,
        6: 0.40, 7: 0.60, 8: 0.80, 9: 0.90, 10: 1.00, 11: 0.95,
        12: 0.70, 13: 0.60, 14: 0.65, 15: 0.75, 16: 0.80, 17: 0.70,
        18: 0.55, 19: 0.45, 20: 0.35, 21: 0.30, 22: 0.25, 23: 0.20
    }

    def __init__(self, implicit_detector: ImplicitEnergyDetector, explicit_input: ExplicitEnergyInput):
        self.implicit = implicit_detector
        self.explicit = explicit_input
        self.learned_curves = self._load_learned_curves()

    def _load_learned_curves(self) -> Dict:
        """Load learned energy curves."""
        if ENERGY_TRACKING_FILE.exists():
            try:
                data = json.loads(ENERGY_TRACKING_FILE.read_text())
                return data.get("learned_curves", {})
            except:
                pass
        return {
            "personal_curve": None,
            "day_curves": {},  # day_of_week -> curve
            "samples_by_hour": defaultdict(list)
        }

    def _save_learned_curves(self):
        """Save learned curves."""
        try:
            data = {
                "learned_curves": self.learned_curves,
                "updated_at": datetime.now().isoformat()
            }
            ENERGY_TRACKING_FILE.write_text(json.dumps(data, indent=2, default=str))
        except Exception as e:
            print(f"[EnergyCurvePredictor] Error saving: {e}")

    def record_reading(self, reading: EnergyReading):
        """Record a reading for curve learning."""
        hour = reading.timestamp.hour
        day = reading.timestamp.weekday()

        # Store sample
        key = f"{day}_{hour}"
        if key not in self.learned_curves["samples_by_hour"]:
            self.learned_curves["samples_by_hour"][key] = []

        self.learned_curves["samples_by_hour"][key].append({
            "level": reading.level,
            "confidence": reading.confidence,
            "timestamp": reading.timestamp.isoformat()
        })

        # Keep bounded
        self.learned_curves["samples_by_hour"][key] = \
            self.learned_curves["samples_by_hour"][key][-100:]

        # Periodically rebuild curves
        total_samples = sum(len(v) for v in self.learned_curves["samples_by_hour"].values())
        if total_samples % 50 == 0:
            self._rebuild_curves()
            self._save_learned_curves()

    def _rebuild_curves(self):
        """Rebuild learned curves from samples."""
        samples = self.learned_curves["samples_by_hour"]

        # Build day-specific curves
        for day in range(7):
            curve = {}
            for hour in range(24):
                key = f"{day}_{hour}"
                if key in samples and len(samples[key]) >= 3:
                    # Weighted average by confidence
                    weighted = sum(s["level"] * s["confidence"] for s in samples[key])
                    total_conf = sum(s["confidence"] for s in samples[key])
                    curve[hour] = weighted / total_conf if total_conf > 0 else self.DEFAULT_CURVE[hour]
                else:
                    curve[hour] = self.DEFAULT_CURVE[hour]

            self.learned_curves["day_curves"][str(day)] = curve

        # Build overall personal curve (weighted average across days)
        personal = {}
        for hour in range(24):
            values = [
                self.learned_curves["day_curves"].get(str(d), {}).get(hour, self.DEFAULT_CURVE[hour])
                for d in range(5)  # Weekdays only for personal curve
            ]
            personal[hour] = statistics.mean(values)

        self.learned_curves["personal_curve"] = personal

    def predict_today(self) -> DailyEnergyCurve:
        """Predict energy curve for today."""
        today = datetime.now()
        day_of_week = today.weekday()

        # Get day-specific curve if available, else personal curve, else default
        if str(day_of_week) in self.learned_curves.get("day_curves", {}):
            curve = self.learned_curves["day_curves"][str(day_of_week)]
            confidence = 0.8
        elif self.learned_curves.get("personal_curve"):
            curve = self.learned_curves["personal_curve"]
            confidence = 0.6
        else:
            curve = self.DEFAULT_CURVE
            confidence = 0.4

        # Adjust for current real readings
        current_estimate = self.implicit.get_current_estimate()
        explicit_reading = self.explicit.get_last_explicit_reading()

        current_hour = today.hour

        # If we have recent readings, adjust the curve
        if current_estimate.confidence > 0.5:
            # Adjust current and nearby hours based on actual reading
            actual_level = current_estimate.level
            predicted_level = curve.get(current_hour, 0.5)
            adjustment = actual_level - predicted_level

            # Apply decaying adjustment to nearby hours
            adjusted_curve = dict(curve)
            for h in range(max(0, current_hour - 2), min(24, current_hour + 5)):
                decay = 1.0 - abs(h - current_hour) * 0.2
                adjusted_curve[h] = min(1.0, max(0.1, curve.get(h, 0.5) + adjustment * decay))

            curve = adjusted_curve

        # Find peak and dip hours
        sorted_hours = sorted(curve.items(), key=lambda x: x[1], reverse=True)
        peak_hours = [h for h, v in sorted_hours[:3]]
        dip_hours = [h for h, v in sorted_hours[-3:]]

        return DailyEnergyCurve(
            date=today.strftime("%Y-%m-%d"),
            hourly_levels=curve,
            peak_hours=sorted(peak_hours),
            dip_hours=sorted(dip_hours),
            confidence=confidence,
            based_on_samples=sum(len(v) for v in self.learned_curves["samples_by_hour"].values())
        )

    def predict_week(self) -> WeeklyEnergyHeatmap:
        """Generate weekly energy heatmap."""
        heatmap = {}

        for day in range(7):
            day_curve = self.learned_curves.get("day_curves", {}).get(str(day), self.DEFAULT_CURVE)
            heatmap[day] = day_curve

        # Find peak and low time slots
        all_slots = []
        for day in range(7):
            for hour in range(24):
                level = heatmap.get(day, {}).get(hour, self.DEFAULT_CURVE[hour])
                all_slots.append((day, hour, level))

        all_slots.sort(key=lambda x: x[2], reverse=True)

        peak_slots = [(d, h) for d, h, v in all_slots[:10]]
        low_slots = [(d, h) for d, h, v in all_slots[-10:]]

        # Find best deep work day (highest average energy 9am-11am)
        deep_work_scores = []
        for day in range(5):  # Weekdays only
            day_curve = heatmap.get(day, self.DEFAULT_CURVE)
            deep_work_avg = statistics.mean([day_curve.get(h, 0.5) for h in [9, 10, 11]])
            deep_work_scores.append((day, deep_work_avg))

        best_day = max(deep_work_scores, key=lambda x: x[1])[0]

        return WeeklyEnergyHeatmap(
            heatmap=heatmap,
            peak_time_slots=peak_slots,
            low_time_slots=low_slots,
            best_deep_work_day=best_day,
            based_on_weeks=len(self.learned_curves.get("samples_by_hour", {})) // 168  # 24*7
        )

    def get_current_energy(self) -> Dict:
        """Get current energy level with full context."""
        now = datetime.now()

        # Get curve prediction
        today_curve = self.predict_today()
        predicted_level = today_curve.hourly_levels.get(now.hour, 0.5)

        # Get implicit estimate
        implicit_estimate = self.implicit.get_current_estimate()

        # Get explicit if recent
        explicit_reading = self.explicit.get_last_explicit_reading()

        # Combine estimates (weighted by confidence)
        estimates = [(predicted_level, today_curve.confidence * 0.5)]
        estimates.append((implicit_estimate.level, implicit_estimate.confidence))

        if explicit_reading:
            estimates.append((explicit_reading.level, explicit_reading.confidence))

        # Weighted average
        total_weight = sum(w for _, w in estimates)
        combined = sum(v * w for v, w in estimates) / total_weight if total_weight > 0 else 0.5

        return {
            "current_level": round(combined, 2),
            "current_level_pct": int(combined * 100),
            "predicted_from_curve": round(predicted_level, 2),
            "implicit_estimate": round(implicit_estimate.level, 2),
            "explicit_reading": round(explicit_reading.level, 2) if explicit_reading else None,
            "confidence": round(total_weight / len(estimates), 2),
            "peak_hours_today": today_curve.peak_hours,
            "next_peak_in_hours": self._hours_until_peak(today_curve),
            "dip_expected": self._check_dip_period(now.hour, today_curve)
        }

    def _hours_until_peak(self, curve: DailyEnergyCurve) -> Optional[int]:
        """Calculate hours until next peak."""
        current_hour = datetime.now().hour
        for peak in sorted(curve.peak_hours):
            if peak > current_hour:
                return peak - current_hour
        return None

    def _check_dip_period(self, current_hour: int, curve: DailyEnergyCurve) -> bool:
        """Check if we're in a dip period."""
        return current_hour in curve.dip_hours


# ===============================================================================
# TASK DIFFICULTY ANALYZER
# ===============================================================================

class TaskDifficultyAnalyzer:
    """
    Analyzes and assigns difficulty levels to tasks.

    Based on Cognitive Load Theory:
    - Intrinsic load (task complexity)
    - Estimated duration
    - Decision complexity
    - Stakeholder impact
    - Deadline pressure
    """

    # Task type base difficulties
    TASK_TYPE_DIFFICULTY = {
        "data_entry": 1.0,
        "filing": 1.0,
        "inventory": 1.5,
        "email_simple": 2.0,
        "scheduling": 2.0,
        "email_response": 2.5,
        "meeting_prep": 3.0,
        "report": 3.5,
        "planning": 4.0,
        "analysis": 4.5,
        "strategy": 5.0,
        "budgeting": 5.0,
        "negotiation": 5.0,
        "crisis_management": 5.0
    }

    # Duration impact on difficulty
    DURATION_FACTORS = {
        15: 0.0,   # 15 min - no penalty
        30: 0.2,   # 30 min
        60: 0.5,   # 1 hour
        120: 0.8,  # 2 hours
        240: 1.0   # 4+ hours - max penalty
    }

    def __init__(self):
        self.task_history = self._load_task_history()

    def _load_task_history(self) -> Dict:
        """Load task difficulty history for learning."""
        if TASK_DIFFICULTY_FILE.exists():
            try:
                return json.loads(TASK_DIFFICULTY_FILE.read_text())
            except:
                pass
        return {"tasks": {}, "overrides": {}}

    def _save_task_history(self):
        """Save task history."""
        try:
            TASK_DIFFICULTY_FILE.write_text(json.dumps(self.task_history, indent=2))
        except Exception as e:
            print(f"[TaskDifficultyAnalyzer] Error saving: {e}")

    def analyze_task(
        self,
        task_id: str,
        title: str,
        description: str = "",
        estimated_minutes: int = 30,
        has_deadline: bool = False,
        deadline_hours: int = None,
        stakeholder_count: int = 0,
        task_type: str = None
    ) -> TaskWithDifficulty:
        """
        Analyze a task and compute its difficulty.

        Returns TaskWithDifficulty with full breakdown.
        """
        factors = {}

        # 1. Base difficulty from task type
        if task_type and task_type in self.TASK_TYPE_DIFFICULTY:
            base_diff = self.TASK_TYPE_DIFFICULTY[task_type]
        else:
            # Infer from keywords in title/description
            base_diff = self._infer_difficulty_from_text(title + " " + description)

        factors["base_complexity"] = base_diff / 5.0  # Normalize to 0-1

        # 2. Duration factor
        duration_factor = self._get_duration_factor(estimated_minutes)
        factors["duration"] = duration_factor

        # 3. Deadline pressure
        if has_deadline and deadline_hours is not None:
            if deadline_hours <= 4:
                deadline_factor = 1.0
            elif deadline_hours <= 24:
                deadline_factor = 0.7
            elif deadline_hours <= 72:
                deadline_factor = 0.4
            else:
                deadline_factor = 0.2
        else:
            deadline_factor = 0.0

        factors["deadline_pressure"] = deadline_factor

        # 4. Stakeholder impact
        stakeholder_factor = min(1.0, stakeholder_count * 0.2)
        factors["stakeholder_impact"] = stakeholder_factor

        # 5. Combine factors (weighted)
        weights = {
            "base_complexity": 0.4,
            "duration": 0.2,
            "deadline_pressure": 0.25,
            "stakeholder_impact": 0.15
        }

        score = sum(factors[k] * weights[k] for k in factors)

        # Map score to difficulty level
        if score < 0.2:
            difficulty = TaskDifficulty.EASY
        elif score < 0.4:
            difficulty = TaskDifficulty.LIGHT
        elif score < 0.6:
            difficulty = TaskDifficulty.MEDIUM
        elif score < 0.8:
            difficulty = TaskDifficulty.HARD
        else:
            difficulty = TaskDifficulty.INTENSE

        # Determine cognitive load type
        if base_diff >= 4:
            load_type = "analytical"
        elif "creative" in title.lower() or "design" in title.lower():
            load_type = "creative"
        else:
            load_type = "routine"

        # Recommended energy level
        energy_map = {
            TaskDifficulty.EASY: EnergyLevel.LOW,
            TaskDifficulty.LIGHT: EnergyLevel.LOW,
            TaskDifficulty.MEDIUM: EnergyLevel.NORMAL,
            TaskDifficulty.HARD: EnergyLevel.GOOD,
            TaskDifficulty.INTENSE: EnergyLevel.GREAT
        }

        result = TaskWithDifficulty(
            task_id=task_id,
            title=title,
            difficulty=difficulty,
            difficulty_score=score,
            difficulty_factors=factors,
            best_energy_level=energy_map[difficulty],
            estimated_duration_minutes=estimated_minutes,
            cognitive_load_type=load_type
        )

        # Store for learning
        self.task_history["tasks"][task_id] = result.to_dict()
        self._save_task_history()

        return result

    def _infer_difficulty_from_text(self, text: str) -> float:
        """Infer difficulty from keywords in text."""
        text_lower = text.lower()

        # Easy indicators
        easy_words = ["quick", "simple", "update", "check", "review", "file", "organize"]
        # Hard indicators
        hard_words = ["analyze", "strategy", "plan", "budget", "complex", "negotiate", "crisis", "urgent"]

        easy_score = sum(1 for w in easy_words if w in text_lower)
        hard_score = sum(1 for w in hard_words if w in text_lower)

        base = 2.5  # Default medium
        base -= easy_score * 0.5
        base += hard_score * 0.7

        return max(1.0, min(5.0, base))

    def _get_duration_factor(self, minutes: int) -> float:
        """Get difficulty factor from duration."""
        for threshold, factor in sorted(self.DURATION_FACTORS.items()):
            if minutes <= threshold:
                return factor
        return 1.0

    def record_actual_difficulty(self, task_id: str, perceived_difficulty: int):
        """Record user's perceived difficulty for learning."""
        self.task_history["overrides"][task_id] = {
            "perceived": perceived_difficulty,
            "timestamp": datetime.now().isoformat()
        }
        self._save_task_history()


# ===============================================================================
# ENERGY-AWARE TASK MATCHER
# ===============================================================================

class EnergyAwareTaskMatcher:
    """
    Matches tasks to current energy level.

    The magic: suggest the RIGHT task at the RIGHT moment.
    """

    def __init__(
        self,
        curve_predictor: EnergyCurvePredictor,
        difficulty_analyzer: TaskDifficultyAnalyzer
    ):
        self.curves = curve_predictor
        self.analyzer = difficulty_analyzer

    def get_task_suggestions(
        self,
        available_tasks: List[Dict],
        current_energy: float = None,
        limit: int = 5
    ) -> List[EnergyAwareSuggestion]:
        """
        Get task suggestions matched to current energy.

        Args:
            available_tasks: List of task dicts with id, title, etc.
            current_energy: Override current energy (0-1), or will detect
            limit: Max suggestions to return
        """
        if current_energy is None:
            energy_data = self.curves.get_current_energy()
            current_energy = energy_data["current_level"]

        # Analyze all tasks
        analyzed = []
        for task in available_tasks:
            analyzed_task = self.analyzer.analyze_task(
                task_id=task.get("id", ""),
                title=task.get("title", ""),
                description=task.get("description", ""),
                estimated_minutes=task.get("estimated_minutes", 30),
                has_deadline=bool(task.get("deadline")),
                deadline_hours=task.get("deadline_hours"),
                task_type=task.get("type")
            )
            analyzed.append((task, analyzed_task))

        # Score each task against current energy
        suggestions = []
        for task_dict, task_analyzed in analyzed:
            match_score = self._calculate_match_score(task_analyzed, current_energy)
            timing = self._get_timing_recommendation(task_analyzed, current_energy)
            reasoning = self._generate_reasoning(task_analyzed, current_energy, match_score)

            # Find alternatives
            alternatives = self._find_alternatives(analyzed, task_analyzed, current_energy)

            suggestions.append(EnergyAwareSuggestion(
                task=task_analyzed,
                match_score=match_score,
                timing_recommendation=timing,
                reasoning=reasoning,
                alternatives=alternatives
            ))

        # Sort by match score
        suggestions.sort(key=lambda s: s.match_score, reverse=True)

        return suggestions[:limit]

    def _calculate_match_score(self, task: TaskWithDifficulty, energy: float) -> float:
        """Calculate how well task matches current energy."""
        # Convert task difficulty to required energy (0-1)
        required_energy = (task.difficulty.value - 1) / 4.0

        # Perfect match = required energy matches current
        diff = abs(required_energy - energy)

        # Penalize more heavily if task is too hard for current energy
        if required_energy > energy:
            diff *= 1.5  # Harder penalty

        match_score = max(0.0, 1.0 - diff)

        return match_score

    def _get_timing_recommendation(
        self,
        task: TaskWithDifficulty,
        current_energy: float
    ) -> str:
        """Get timing recommendation for this task."""
        required_energy = (task.difficulty.value - 1) / 4.0
        diff = required_energy - current_energy

        if diff <= 0.1:
            return "NOW"
        elif diff <= 0.3:
            # Find when energy will be high enough
            today_curve = self.curves.predict_today()
            current_hour = datetime.now().hour
            for hour in range(current_hour + 1, 24):
                if today_curve.hourly_levels.get(hour, 0) >= required_energy:
                    hours_until = hour - current_hour
                    return f"In {hours_until} hour{'s' if hours_until > 1 else ''}"
            return "Tomorrow morning"
        else:
            if task.difficulty.value >= 4:
                return "Schedule for peak hours"
            else:
                return "Later today"

    def _generate_reasoning(
        self,
        task: TaskWithDifficulty,
        energy: float,
        match_score: float
    ) -> str:
        """Generate human-readable reasoning."""
        energy_pct = int(energy * 100)
        required_pct = int((task.difficulty.value - 1) / 4.0 * 100)

        if match_score > 0.8:
            return f"Great match! Your energy ({energy_pct}%) is perfect for this {task.difficulty.name.lower()} task."
        elif match_score > 0.5:
            return f"Good fit. Your energy ({energy_pct}%) can handle this task."
        elif energy < required_pct / 100:
            return f"This {task.difficulty.name.lower()} task needs {required_pct}% energy. Consider an easier task or wait for higher energy."
        else:
            return f"You have more energy than needed. Consider tackling a harder task to maximize productivity."

    def _find_alternatives(
        self,
        all_tasks: List[Tuple],
        current_task: TaskWithDifficulty,
        energy: float
    ) -> List[str]:
        """Find alternative tasks at different difficulty levels."""
        alternatives = []

        # Find easier alternative
        for task_dict, analyzed in all_tasks:
            if analyzed.task_id != current_task.task_id:
                if analyzed.difficulty.value < current_task.difficulty.value:
                    alternatives.append(f"Easier: {analyzed.title}")
                    break

        # Find harder alternative
        for task_dict, analyzed in all_tasks:
            if analyzed.task_id != current_task.task_id:
                if analyzed.difficulty.value > current_task.difficulty.value:
                    alternatives.append(f"Harder: {analyzed.title}")
                    break

        return alternatives[:2]

    def get_low_energy_mode_tasks(
        self,
        available_tasks: List[Dict],
        limit: int = 5
    ) -> List[EnergyAwareSuggestion]:
        """
        Get easy wins for low energy periods.

        "Low Energy Mode" - surface tasks that still provide progress.
        """
        # Force low energy context
        return self.get_task_suggestions(
            available_tasks,
            current_energy=0.3,  # Simulate low energy
            limit=limit
        )

    def get_best_time_for_task(self, task: TaskWithDifficulty) -> Dict:
        """
        Get the best time to do a specific task.

        Returns detailed timing recommendation.
        """
        today_curve = self.curves.predict_today()
        week_heatmap = self.curves.predict_week()

        required_energy = (task.difficulty.value - 1) / 4.0

        # Find best hours today
        best_hours_today = []
        for hour, level in today_curve.hourly_levels.items():
            if level >= required_energy:
                best_hours_today.append((hour, level))

        best_hours_today.sort(key=lambda x: x[1], reverse=True)

        # Find best day this week
        day_scores = []
        for day in range(7):
            day_curve = week_heatmap.heatmap.get(day, {})
            peak_energy = max(day_curve.values()) if day_curve else 0.5
            if peak_energy >= required_energy:
                day_scores.append((day, peak_energy))

        day_scores.sort(key=lambda x: x[1], reverse=True)

        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

        return {
            "task_title": task.title,
            "difficulty": task.difficulty.name,
            "required_energy_pct": int(required_energy * 100),
            "best_hours_today": [
                {"hour": h, "energy_pct": int(e * 100)}
                for h, e in best_hours_today[:3]
            ],
            "best_day_this_week": days[day_scores[0][0]] if day_scores else None,
            "recommendation": self._format_time_recommendation(
                task, best_hours_today, day_scores, days
            )
        }

    def _format_time_recommendation(
        self,
        task: TaskWithDifficulty,
        best_hours: List,
        best_days: List,
        day_names: List
    ) -> str:
        """Format a human-readable time recommendation."""
        if not best_hours:
            if best_days:
                return f"Best time: {day_names[best_days[0][0]]} during peak hours"
            return "Consider breaking this into smaller tasks"

        now = datetime.now()
        best_hour = best_hours[0][0]

        if best_hour == now.hour:
            return "NOW is a great time!"
        elif best_hour > now.hour:
            return f"Today at {best_hour}:00 would be ideal"
        else:
            if best_days:
                return f"{day_names[best_days[0][0]]} at {best_hours[0][0]}:00"
            return "Tomorrow morning during peak hours"


# ===============================================================================
# RECOVERY TIME MANAGER
# ===============================================================================

class RecoveryTimeManager:
    """
    Manages automatic recovery/break scheduling.

    Based on research:
    - Micro-breaks of 5+ minutes boost energy
    - Recovery time after intense work is crucial
    - Protected recovery periods prevent burnout
    """

    # Recovery time recommendations
    RECOVERY_RULES = {
        "after_intense_task": {"minutes": 15, "priority": 1},
        "after_2hr_focus": {"minutes": 15, "priority": 2},
        "after_meeting": {"minutes": 10, "priority": 3},
        "low_energy_detected": {"minutes": 10, "priority": 2},
        "afternoon_dip": {"minutes": 20, "priority": 3}
    }

    # Break activity suggestions
    BREAK_SUGGESTIONS = {
        "short": [
            "Step outside briefly",
            "Stretch at your desk",
            "Look at something far away (eye rest)",
            "Get a glass of water"
        ],
        "medium": [
            "Take a short walk",
            "Do some light stretching",
            "Have a healthy snack",
            "Practice deep breathing"
        ],
        "long": [
            "Go for a walk outside",
            "Do a brief meditation",
            "Have a proper meal break",
            "Change your environment"
        ]
    }

    def __init__(self, curve_predictor: EnergyCurvePredictor):
        self.curves = curve_predictor
        self.scheduled_blocks = self._load_blocks()
        self.recovery_stats = self._load_stats()

    def _load_blocks(self) -> List[RecoveryBlock]:
        """Load scheduled recovery blocks."""
        if RECOVERY_BLOCKS_FILE.exists():
            try:
                data = json.loads(RECOVERY_BLOCKS_FILE.read_text())
                return [
                    RecoveryBlock(
                        id=b["id"],
                        start_time=datetime.fromisoformat(b["start_time"]),
                        duration_minutes=b["duration_minutes"],
                        reason=b["reason"],
                        priority=b["priority"],
                        suggestions=b["suggestions"],
                        auto_scheduled=b.get("auto_scheduled", True),
                        accepted=b.get("accepted", False),
                        completed=b.get("completed", False)
                    )
                    for b in data.get("blocks", [])
                ]
            except:
                pass
        return []

    def _save_blocks(self):
        """Save recovery blocks."""
        try:
            data = {
                "blocks": [b.to_dict() for b in self.scheduled_blocks],
                "updated_at": datetime.now().isoformat()
            }
            RECOVERY_BLOCKS_FILE.write_text(json.dumps(data, indent=2))
        except Exception as e:
            print(f"[RecoveryTimeManager] Error saving: {e}")

    def _load_stats(self) -> Dict:
        """Load recovery statistics."""
        return {
            "total_suggested": 0,
            "total_accepted": 0,
            "total_completed": 0,
            "avg_break_minutes": 0
        }

    def suggest_recovery(
        self,
        reason: str,
        after_task: TaskWithDifficulty = None
    ) -> Optional[RecoveryBlock]:
        """
        Suggest a recovery block.

        Args:
            reason: Why recovery is suggested (maps to RECOVERY_RULES)
            after_task: The task just completed (for context)
        """
        if reason not in self.RECOVERY_RULES:
            return None

        rule = self.RECOVERY_RULES[reason]
        duration = rule["minutes"]
        priority = rule["priority"]

        # Adjust duration based on task intensity
        if after_task and after_task.difficulty.value >= 4:
            duration = max(duration, 15)

        # Get suggestions based on duration
        if duration <= 5:
            suggestions = self.BREAK_SUGGESTIONS["short"][:2]
        elif duration <= 15:
            suggestions = self.BREAK_SUGGESTIONS["medium"][:3]
        else:
            suggestions = self.BREAK_SUGGESTIONS["long"][:3]

        # Create the block
        block_id = hashlib.md5(f"{reason}{datetime.now().isoformat()}".encode()).hexdigest()[:12]

        block = RecoveryBlock(
            id=block_id,
            start_time=datetime.now(),
            duration_minutes=duration,
            reason=self._format_reason(reason, after_task),
            priority=priority,
            suggestions=suggestions,
            auto_scheduled=True
        )

        self.scheduled_blocks.append(block)
        self._save_blocks()

        self.recovery_stats["total_suggested"] += 1

        return block

    def _format_reason(self, reason: str, task: TaskWithDifficulty = None) -> str:
        """Format human-readable reason."""
        reasons = {
            "after_intense_task": f"You completed an intense task{' (' + task.title + ')' if task else ''}. Your brain needs recovery time.",
            "after_2hr_focus": "You've been focused for 2+ hours. A short break will boost sustained productivity.",
            "after_meeting": "Meetings are mentally demanding. Take a moment to reset.",
            "low_energy_detected": "Your energy level seems low. A break might help.",
            "afternoon_dip": "Afternoon energy dip detected. A break now can help you push through."
        }
        return reasons.get(reason, "Time for a recovery break")

    def accept_recovery(self, block_id: str) -> bool:
        """Mark a recovery block as accepted."""
        for block in self.scheduled_blocks:
            if block.id == block_id:
                block.accepted = True
                self._save_blocks()
                self.recovery_stats["total_accepted"] += 1
                return True
        return False

    def complete_recovery(self, block_id: str) -> bool:
        """Mark a recovery block as completed."""
        for block in self.scheduled_blocks:
            if block.id == block_id:
                block.completed = True
                self._save_blocks()
                self.recovery_stats["total_completed"] += 1
                return True
        return False

    def get_pending_recovery(self) -> Optional[RecoveryBlock]:
        """Get the next pending recovery block."""
        pending = [
            b for b in self.scheduled_blocks
            if not b.completed and b.start_time > datetime.now() - timedelta(hours=2)
        ]

        if pending:
            pending.sort(key=lambda b: b.priority)
            return pending[0]

        return None

    def check_recovery_needed(
        self,
        recent_task: TaskWithDifficulty = None,
        hours_since_break: float = None,
        current_energy: float = None
    ) -> Optional[str]:
        """
        Check if recovery is needed based on various signals.

        Returns the reason if recovery is needed, None otherwise.
        """
        # After intense task
        if recent_task and recent_task.difficulty.value >= 4:
            return "after_intense_task"

        # After 2+ hours without break
        if hours_since_break and hours_since_break >= 2:
            return "after_2hr_focus"

        # Low energy detected
        if current_energy and current_energy < 0.3:
            return "low_energy_detected"

        # Afternoon dip (1pm-3pm)
        hour = datetime.now().hour
        if 13 <= hour <= 15:
            # Check if in dip period
            today_curve = self.curves.predict_today()
            if hour in today_curve.dip_hours:
                return "afternoon_dip"

        return None

    def get_recovery_stats(self) -> Dict:
        """Get recovery statistics."""
        accepted = self.recovery_stats["total_accepted"]
        suggested = self.recovery_stats["total_suggested"]

        return {
            **self.recovery_stats,
            "acceptance_rate": accepted / suggested if suggested > 0 else 0,
            "pending_blocks": len([b for b in self.scheduled_blocks if not b.completed]),
            "completed_today": len([
                b for b in self.scheduled_blocks
                if b.completed and b.start_time.date() == datetime.now().date()
            ])
        }


# ===============================================================================
# MAIN ENERGY TRACKER CLASS
# ===============================================================================

class EnergyTracker:
    """
    Main entry point for the Energy Tracking System.

    This is the comprehensive interface that brings together all components:
    - Implicit detection
    - Explicit input
    - Energy visualization
    - Task matching
    - Recovery management
    """

    def __init__(self):
        # Core components
        self.implicit_detector = ImplicitEnergyDetector()
        self.explicit_input = ExplicitEnergyInput()
        self.curve_predictor = EnergyCurvePredictor(
            self.implicit_detector,
            self.explicit_input
        )
        self.task_analyzer = TaskDifficultyAnalyzer()
        self.task_matcher = EnergyAwareTaskMatcher(
            self.curve_predictor,
            self.task_analyzer
        )
        self.recovery_manager = RecoveryTimeManager(self.curve_predictor)

        # Session tracking
        self.session_start = datetime.now()
        self.last_action_time = datetime.now()
        self.actions_this_session = 0

    # ===== IMPLICIT DETECTION INTERFACE =====

    def record_typing(self, chars_typed: int, seconds_elapsed: float) -> Dict:
        """Record typing speed as an implicit energy signal."""
        reading = self.implicit_detector.record_typing_speed(chars_typed, seconds_elapsed)
        if reading:
            self.curve_predictor.record_reading(reading)
            return reading.to_dict()
        return {}

    def record_task_completed(
        self,
        task_id: str,
        started_at: datetime,
        completed_at: datetime = None,
        estimated_minutes: int = None
    ) -> Dict:
        """Record task completion for energy tracking."""
        if completed_at is None:
            completed_at = datetime.now()

        reading = self.implicit_detector.record_task_completion(
            task_id, started_at, completed_at, estimated_minutes
        )

        if reading:
            self.curve_predictor.record_reading(reading)

        # Check if recovery is needed
        task = self.task_analyzer.task_history.get("tasks", {}).get(task_id)
        if task:
            task_obj = TaskWithDifficulty(**task) if isinstance(task, dict) else task
            recovery_reason = self.recovery_manager.check_recovery_needed(
                recent_task=task_obj
            )
            if recovery_reason:
                recovery = self.recovery_manager.suggest_recovery(recovery_reason, task_obj)
                return {
                    "energy_reading": reading.to_dict() if reading else {},
                    "recovery_suggested": recovery.to_dict() if recovery else None
                }

        return {"energy_reading": reading.to_dict() if reading else {}}

    def record_action(self) -> Dict:
        """Record a generic action for gap tracking."""
        reading = self.implicit_detector.record_action_gap(self.last_action_time)
        self.last_action_time = datetime.now()
        self.actions_this_session += 1

        if reading:
            self.curve_predictor.record_reading(reading)

        return reading.to_dict() if reading else {}

    def record_error(self, error_count: int, total_actions: int) -> Dict:
        """Record error rate as an energy signal."""
        reading = self.implicit_detector.record_error_event(error_count, total_actions)
        if reading:
            self.curve_predictor.record_reading(reading)
            return reading.to_dict()
        return {}

    # ===== EXPLICIT INPUT INTERFACE =====

    def get_checkin_prompt(self) -> Dict:
        """Get the check-in prompt for the UI."""
        return self.explicit_input.get_checkin_prompt()

    def record_checkin(
        self,
        energy_level: int,
        sleep_quality: int = None
    ) -> Dict:
        """Record explicit energy check-in."""
        reading = self.explicit_input.record_morning_checkin(energy_level, sleep_quality)
        self.curve_predictor.record_reading(reading)
        return reading.to_dict()

    def record_task_energy_rating(self, task_id: str, energy_during: str) -> Dict:
        """Record post-task energy rating."""
        reading = self.explicit_input.record_post_task_rating(task_id, energy_during)
        self.curve_predictor.record_reading(reading)
        return reading.to_dict()

    # ===== VISUALIZATION INTERFACE =====

    def get_current_energy(self) -> Dict:
        """Get current energy level with full context."""
        return self.curve_predictor.get_current_energy()

    def get_today_curve(self) -> Dict:
        """Get today's energy curve for visualization."""
        curve = self.curve_predictor.predict_today()
        return curve.to_dict()

    def get_weekly_heatmap(self) -> Dict:
        """Get weekly energy heatmap."""
        heatmap = self.curve_predictor.predict_week()
        return heatmap.to_dict()

    # ===== TASK MATCHING INTERFACE =====

    def analyze_task(
        self,
        task_id: str,
        title: str,
        **kwargs
    ) -> Dict:
        """Analyze a task for difficulty."""
        task = self.task_analyzer.analyze_task(task_id, title, **kwargs)
        return task.to_dict()

    def get_task_suggestions(
        self,
        available_tasks: List[Dict],
        limit: int = 5
    ) -> List[Dict]:
        """Get energy-aware task suggestions."""
        suggestions = self.task_matcher.get_task_suggestions(available_tasks, limit=limit)
        return [s.to_dict() for s in suggestions]

    def get_low_energy_tasks(
        self,
        available_tasks: List[Dict],
        limit: int = 5
    ) -> List[Dict]:
        """Get easy wins for low energy mode."""
        suggestions = self.task_matcher.get_low_energy_mode_tasks(available_tasks, limit=limit)
        return [s.to_dict() for s in suggestions]

    def get_best_time_for_task(self, task_id: str) -> Dict:
        """Get best time recommendation for a specific task."""
        task_data = self.task_analyzer.task_history.get("tasks", {}).get(task_id)
        if not task_data:
            return {"error": "Task not found"}

        # Convert dict to TaskWithDifficulty
        task = TaskWithDifficulty(
            task_id=task_data["task_id"],
            title=task_data["title"],
            difficulty=TaskDifficulty(task_data["difficulty"]),
            difficulty_score=task_data["difficulty_score"],
            difficulty_factors=task_data["difficulty_factors"],
            best_energy_level=EnergyLevel(task_data["best_energy_level"]),
            estimated_duration_minutes=task_data["estimated_duration_minutes"],
            cognitive_load_type=task_data["cognitive_load_type"]
        )

        return self.task_matcher.get_best_time_for_task(task)

    # ===== RECOVERY INTERFACE =====

    def check_recovery_needed(self) -> Optional[Dict]:
        """Check if recovery is needed now."""
        energy_data = self.get_current_energy()
        hours_active = (datetime.now() - self.session_start).total_seconds() / 3600

        reason = self.recovery_manager.check_recovery_needed(
            hours_since_break=hours_active,
            current_energy=energy_data["current_level"]
        )

        if reason:
            block = self.recovery_manager.suggest_recovery(reason)
            return block.to_dict() if block else None

        return None

    def get_pending_recovery(self) -> Optional[Dict]:
        """Get pending recovery block if any."""
        block = self.recovery_manager.get_pending_recovery()
        return block.to_dict() if block else None

    def accept_recovery(self, block_id: str) -> bool:
        """Accept a recovery suggestion."""
        return self.recovery_manager.accept_recovery(block_id)

    def complete_recovery(self, block_id: str) -> bool:
        """Mark recovery as completed."""
        return self.recovery_manager.complete_recovery(block_id)

    # ===== COMPREHENSIVE STATUS =====

    def get_full_status(self) -> Dict:
        """Get comprehensive energy tracking status."""
        return {
            "current_energy": self.get_current_energy(),
            "today_curve": self.get_today_curve(),
            "implicit_stats": self.implicit_detector.get_stats(),
            "recovery_stats": self.recovery_manager.get_recovery_stats(),
            "session": {
                "started_at": self.session_start.isoformat(),
                "duration_minutes": (datetime.now() - self.session_start).total_seconds() / 60,
                "actions_count": self.actions_this_session
            }
        }


# ===============================================================================
# SINGLETON INSTANCE
# ===============================================================================

_energy_tracker_instance: Optional[EnergyTracker] = None


def get_energy_tracker() -> EnergyTracker:
    """Get the singleton EnergyTracker instance."""
    global _energy_tracker_instance
    if _energy_tracker_instance is None:
        _energy_tracker_instance = EnergyTracker()
    return _energy_tracker_instance


# ===============================================================================
# MAIN (for testing)
# ===============================================================================

if __name__ == "__main__":
    print("Energy Tracking System - Initialized")
    print("=" * 60)

    tracker = get_energy_tracker()

    # Get current status
    status = tracker.get_full_status()
    print(f"\nCurrent Energy: {status['current_energy']['current_level_pct']}%")
    print(f"Peak Hours Today: {status['today_curve']['peak_hours']}")
    print(f"Dip Hours Today: {status['today_curve']['dip_hours']}")

    # Get check-in prompt
    prompt = tracker.get_checkin_prompt()
    print(f"\nCheck-in Prompt: {prompt['title']}")

    print("\n" + "=" * 60)
    print("Energy Tracking System ready for integration!")
