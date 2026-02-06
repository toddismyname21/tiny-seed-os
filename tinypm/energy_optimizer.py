#!/usr/bin/env python3
"""
===============================================================================
ENERGY OPTIMIZER - Circadian/Energy-Aware Task Scheduling
===============================================================================

Phase 2 of TinyPM's Prescient AI System

Based on cognitive science research:
- Peak 1 (Standard): Late morning (10am-12pm) - Complex problem-solving
- Dip: Early afternoon (1-3pm) - Recovery mode
- Peak 2: Late afternoon (4-6pm) - Secondary focus window

Farmer-specific patterns (early risers, heat avoidance):
- Peak 1: 5-8am (cool morning, high energy)
- Dip: 12-2pm (hot afternoon)
- Peak 2: 5-7pm (evening cooldown)

Created: 2026-02-04
Author: PM_Architect Claude (Phase 2)
"""

import json
from dataclasses import dataclass, asdict
from datetime import datetime, time, timedelta
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Tuple


# ==============================================================================
# DATA STRUCTURES
# ==============================================================================

class EnergyLevel(Enum):
    """Energy levels throughout the day."""
    PEAK = "peak"           # High cognitive capacity
    MODERATE = "moderate"   # Normal capacity
    DIP = "dip"             # Low energy, routine tasks
    RECOVERY = "recovery"   # Building back up


class TaskEnergyRequirement(Enum):
    """Energy requirements for task categories."""
    HIGH = "high"           # Needs peak energy
    MODERATE = "moderate"   # Normal energy fine
    LOW = "low"             # Can do during dip
    FLEXIBLE = "flexible"   # Any time works


@dataclass
class EnergyState:
    """Current energy state with context."""
    level: EnergyLevel
    percentage: float       # 0-100 scale
    trend: str              # "rising", "falling", "stable"
    next_peak_in: int       # Minutes until next peak
    recommended_tasks: List[str]
    avoid_tasks: List[str]
    time_of_day: str        # "morning", "midday", "afternoon", "evening"


@dataclass
class TimeRecommendation:
    """Optimal time recommendation for a task."""
    suggested_time: datetime
    energy_match: float     # 0-1 score
    reason: str
    alternatives: List[Dict]


@dataclass
class EnergyConflict:
    """Conflict between task requirements and energy state."""
    task_id: str
    task_title: str
    scheduled_time: datetime
    required_energy: TaskEnergyRequirement
    available_energy: EnergyLevel
    severity: str           # "warning", "critical"
    suggestion: str


@dataclass
class OptimizedSchedule:
    """Optimized schedule with energy-aware ordering."""
    tasks: List[Dict]
    total_energy_match: float
    conflicts_resolved: int
    recommendations: List[str]


# ==============================================================================
# ENERGY PROFILES
# ==============================================================================

ENERGY_PROFILES = {
    "morning_person": {
        "name": "Morning Person",
        "description": "Peak energy in early morning, gradual decline",
        "peaks": [
            {"start": 6, "end": 10, "level": 95},
            {"start": 14, "end": 16, "level": 70}
        ],
        "dips": [
            {"start": 12, "end": 14, "level": 40},
            {"start": 20, "end": 23, "level": 30}
        ],
        "baseline": 60,
        "wake_time": 5,
        "wind_down": 20
    },
    "farmer_default": {
        "name": "Farmer (Early Riser)",
        "description": "Adapted for farm work - early peak, heat avoidance dip",
        "peaks": [
            {"start": 5, "end": 8, "level": 100},   # Pre-heat peak
            {"start": 17, "end": 19, "level": 80}   # Evening cooldown
        ],
        "dips": [
            {"start": 12, "end": 15, "level": 35},  # Hot afternoon
            {"start": 21, "end": 23, "level": 25}
        ],
        "baseline": 55,
        "wake_time": 4,
        "wind_down": 20
    },
    "night_owl": {
        "name": "Night Owl",
        "description": "Peak energy in late morning and evening",
        "peaks": [
            {"start": 10, "end": 13, "level": 85},
            {"start": 19, "end": 23, "level": 95}
        ],
        "dips": [
            {"start": 6, "end": 9, "level": 30},
            {"start": 14, "end": 17, "level": 50}
        ],
        "baseline": 55,
        "wake_time": 8,
        "wind_down": 0
    },
    "custom": {
        "name": "Custom Profile",
        "description": "User-defined energy patterns",
        "peaks": [],
        "dips": [],
        "baseline": 60,
        "wake_time": 6,
        "wind_down": 22
    }
}


# ==============================================================================
# TASK ENERGY REQUIREMENTS (Farm-specific)
# ==============================================================================

TASK_ENERGY_REQUIREMENTS = {
    # HIGH ENERGY - Need peak cognitive/physical capacity
    "planning": TaskEnergyRequirement.HIGH,
    "email_triage": TaskEnergyRequirement.HIGH,
    "harvesting": TaskEnergyRequirement.HIGH,
    "transplanting": TaskEnergyRequirement.HIGH,
    "budget_review": TaskEnergyRequirement.HIGH,
    "decision_making": TaskEnergyRequirement.HIGH,
    "complex_problem": TaskEnergyRequirement.HIGH,
    "seeding": TaskEnergyRequirement.HIGH,
    "cultivation": TaskEnergyRequirement.HIGH,
    "pest_scouting": TaskEnergyRequirement.HIGH,

    # MODERATE ENERGY - Normal capacity sufficient
    "customer_calls": TaskEnergyRequirement.MODERATE,
    "market_prep": TaskEnergyRequirement.MODERATE,
    "delivery": TaskEnergyRequirement.MODERATE,
    "equipment_check": TaskEnergyRequirement.MODERATE,
    "ordering": TaskEnergyRequirement.MODERATE,
    "team_meeting": TaskEnergyRequirement.MODERATE,
    "packing": TaskEnergyRequirement.MODERATE,

    # LOW ENERGY - Can do during energy dip
    "watering": TaskEnergyRequirement.LOW,
    "weeding": TaskEnergyRequirement.LOW,
    "data_entry": TaskEnergyRequirement.LOW,
    "filing": TaskEnergyRequirement.LOW,
    "cleaning": TaskEnergyRequirement.LOW,
    "inventory_count": TaskEnergyRequirement.LOW,
    "mulching": TaskEnergyRequirement.LOW,

    # FLEXIBLE - Any time works
    "break": TaskEnergyRequirement.FLEXIBLE,
    "admin": TaskEnergyRequirement.FLEXIBLE,
    "general": TaskEnergyRequirement.FLEXIBLE
}


# ==============================================================================
# ENERGY OPTIMIZER CLASS
# ==============================================================================

class EnergyOptimizer:
    """
    Circadian-aware task scheduling optimizer.

    Matches tasks to optimal energy windows based on:
    - User's energy profile (farmer, morning person, etc.)
    - Task cognitive/physical requirements
    - Time of day and energy trends
    """

    def __init__(self, profile_name: str = "farmer_default"):
        """Initialize with an energy profile."""
        self.profile_name = profile_name
        self.profile = ENERGY_PROFILES.get(profile_name, ENERGY_PROFILES["farmer_default"])
        self.custom_overrides: Dict = {}

    def get_current_energy_state(self, at_time: datetime = None) -> EnergyState:
        """
        Get the current energy state based on time and profile.

        Args:
            at_time: Optional specific time (defaults to now)

        Returns:
            EnergyState with current energy level and recommendations
        """
        if at_time is None:
            at_time = datetime.now()

        hour = at_time.hour + at_time.minute / 60.0

        # Calculate energy percentage
        energy_pct = self._calculate_energy_at_hour(hour)

        # Determine energy level
        if energy_pct >= 80:
            level = EnergyLevel.PEAK
        elif energy_pct >= 60:
            level = EnergyLevel.MODERATE
        elif energy_pct >= 40:
            level = EnergyLevel.RECOVERY
        else:
            level = EnergyLevel.DIP

        # Calculate trend (compare to 30 min ago and ahead)
        past_energy = self._calculate_energy_at_hour(hour - 0.5)
        future_energy = self._calculate_energy_at_hour(hour + 0.5)

        if future_energy > energy_pct + 5:
            trend = "rising"
        elif future_energy < energy_pct - 5:
            trend = "falling"
        else:
            trend = "stable"

        # Find next peak
        next_peak_in = self._minutes_until_next_peak(hour)

        # Time of day classification
        if 5 <= hour < 12:
            time_of_day = "morning"
        elif 12 <= hour < 14:
            time_of_day = "midday"
        elif 14 <= hour < 18:
            time_of_day = "afternoon"
        else:
            time_of_day = "evening"

        # Generate recommendations
        recommended, avoid = self._get_task_recommendations(level)

        return EnergyState(
            level=level,
            percentage=round(energy_pct, 1),
            trend=trend,
            next_peak_in=next_peak_in,
            recommended_tasks=recommended,
            avoid_tasks=avoid,
            time_of_day=time_of_day
        )

    def match_task_to_energy(self, task: Dict, energy_state: EnergyState = None) -> float:
        """
        Calculate how well a task matches the current energy state.

        Args:
            task: Task dict with type, priority, etc.
            energy_state: Optional energy state (defaults to current)

        Returns:
            Match score from 0.0 (terrible match) to 1.0 (perfect match)
        """
        if energy_state is None:
            energy_state = self.get_current_energy_state()

        # Determine task energy requirement
        task_type = task.get("task_type", task.get("type", "general")).lower()
        task_req = TASK_ENERGY_REQUIREMENTS.get(task_type, TaskEnergyRequirement.MODERATE)

        # Score based on match
        level = energy_state.level

        # Perfect matches
        if task_req == TaskEnergyRequirement.FLEXIBLE:
            return 0.85  # Always decent

        if task_req == TaskEnergyRequirement.HIGH:
            if level == EnergyLevel.PEAK:
                return 1.0
            elif level == EnergyLevel.MODERATE:
                return 0.6
            elif level == EnergyLevel.RECOVERY:
                return 0.35
            else:  # DIP
                return 0.15

        elif task_req == TaskEnergyRequirement.MODERATE:
            if level == EnergyLevel.PEAK:
                return 0.8  # Slight waste of peak
            elif level == EnergyLevel.MODERATE:
                return 1.0
            elif level == EnergyLevel.RECOVERY:
                return 0.7
            else:
                return 0.4

        elif task_req == TaskEnergyRequirement.LOW:
            if level == EnergyLevel.PEAK:
                return 0.4  # Waste of peak energy
            elif level == EnergyLevel.MODERATE:
                return 0.7
            elif level == EnergyLevel.RECOVERY:
                return 0.9
            else:  # DIP - perfect for low-energy tasks
                return 1.0

        return 0.5  # Default

    def optimize_schedule(self, tasks: List[Dict], start_time: datetime = None) -> OptimizedSchedule:
        """
        Optimize a list of tasks for energy-aware scheduling.

        Args:
            tasks: List of task dicts
            start_time: When the schedule starts (defaults to now)

        Returns:
            OptimizedSchedule with reordered tasks and recommendations
        """
        if start_time is None:
            start_time = datetime.now()

        if not tasks:
            return OptimizedSchedule(
                tasks=[],
                total_energy_match=0,
                conflicts_resolved=0,
                recommendations=[]
            )

        # Score all tasks at different time slots
        time_slots = self._generate_time_slots(start_time, len(tasks))

        # Greedy assignment: best task for each slot
        optimized = []
        remaining = tasks.copy()
        total_match = 0
        conflicts_fixed = 0

        for slot_time in time_slots:
            if not remaining:
                break

            energy_state = self.get_current_energy_state(slot_time)

            # Score each remaining task
            scored = []
            for task in remaining:
                score = self.match_task_to_energy(task, energy_state)
                # Boost for priority
                priority = task.get("priority", "medium").lower()
                if priority == "high":
                    score *= 1.15
                elif priority == "critical":
                    score *= 1.25
                scored.append((task, score))

            # Pick best match
            scored.sort(key=lambda x: x[1], reverse=True)
            best_task, best_score = scored[0]

            # Check if this fixes a conflict
            original_score = self.match_task_to_energy(best_task, self.get_current_energy_state(start_time))
            if best_score > original_score + 0.2:
                conflicts_fixed += 1

            best_task["scheduled_time"] = slot_time.isoformat()
            best_task["energy_match"] = round(best_score, 2)
            optimized.append(best_task)
            remaining.remove(best_task)
            total_match += best_score

        # Generate recommendations
        recommendations = self._generate_schedule_recommendations(optimized)

        return OptimizedSchedule(
            tasks=optimized,
            total_energy_match=round(total_match / len(optimized), 2) if optimized else 0,
            conflicts_resolved=conflicts_fixed,
            recommendations=recommendations
        )

    def suggest_optimal_time(self, task: Dict) -> TimeRecommendation:
        """
        Suggest the optimal time to perform a task.

        Args:
            task: Task dict with type, priority, etc.

        Returns:
            TimeRecommendation with suggested time and alternatives
        """
        now = datetime.now()
        task_type = task.get("task_type", task.get("type", "general")).lower()
        task_req = TASK_ENERGY_REQUIREMENTS.get(task_type, TaskEnergyRequirement.MODERATE)

        # Search next 24 hours for best time
        best_time = now
        best_score = 0
        alternatives = []

        for hours_ahead in range(48):  # Check every 30 min
            check_time = now + timedelta(minutes=hours_ahead * 30)
            energy_state = self.get_current_energy_state(check_time)
            score = self.match_task_to_energy(task, energy_state)

            if score > best_score:
                best_score = score
                best_time = check_time

            # Collect good alternatives
            if score >= 0.7 and len(alternatives) < 3:
                alternatives.append({
                    "time": check_time.isoformat(),
                    "score": round(score, 2),
                    "energy_level": energy_state.level.value
                })

        # Generate reason
        reason = self._generate_time_reason(task_req, self.get_current_energy_state(best_time))

        return TimeRecommendation(
            suggested_time=best_time,
            energy_match=round(best_score, 2),
            reason=reason,
            alternatives=alternatives[:3]
        )

    def detect_energy_conflicts(self, schedule: List[Dict]) -> List[EnergyConflict]:
        """
        Detect conflicts between scheduled tasks and energy levels.

        Args:
            schedule: List of task dicts with scheduled_time

        Returns:
            List of EnergyConflict objects
        """
        conflicts = []

        for task in schedule:
            scheduled_str = task.get("scheduled_time") or task.get("due_date")
            if not scheduled_str:
                continue

            try:
                if "T" in scheduled_str:
                    scheduled = datetime.fromisoformat(scheduled_str.replace("Z", ""))
                else:
                    scheduled = datetime.fromisoformat(scheduled_str + "T09:00:00")
            except:
                continue

            energy_state = self.get_current_energy_state(scheduled)
            match_score = self.match_task_to_energy(task, energy_state)

            if match_score < 0.4:
                task_type = task.get("task_type", "general").lower()
                task_req = TASK_ENERGY_REQUIREMENTS.get(task_type, TaskEnergyRequirement.MODERATE)

                # Generate suggestion
                optimal = self.suggest_optimal_time(task)
                suggestion = f"Consider rescheduling to {optimal.suggested_time.strftime('%I:%M %p')}"

                conflict = EnergyConflict(
                    task_id=str(task.get("id", task.get("task_id", ""))),
                    task_title=task.get("title", "Untitled"),
                    scheduled_time=scheduled,
                    required_energy=task_req,
                    available_energy=energy_state.level,
                    severity="critical" if match_score < 0.25 else "warning",
                    suggestion=suggestion
                )
                conflicts.append(conflict)

        return conflicts

    # ==========================================================================
    # PRIVATE METHODS
    # ==========================================================================

    def _calculate_energy_at_hour(self, hour: float) -> float:
        """Calculate energy percentage at a given hour."""
        hour = hour % 24  # Normalize

        # Check peaks
        for peak in self.profile["peaks"]:
            if peak["start"] <= hour < peak["end"]:
                return peak["level"]

        # Check dips
        for dip in self.profile["dips"]:
            if dip["start"] <= hour < dip["end"]:
                return dip["level"]

        # Interpolate between baseline and nearest peak/dip
        return self.profile["baseline"]

    def _minutes_until_next_peak(self, current_hour: float) -> int:
        """Calculate minutes until the next energy peak."""
        for peak in self.profile["peaks"]:
            if peak["start"] > current_hour:
                return int((peak["start"] - current_hour) * 60)

        # Wrap to tomorrow's first peak
        first_peak = self.profile["peaks"][0]["start"] if self.profile["peaks"] else 9
        return int((24 - current_hour + first_peak) * 60)

    def _get_task_recommendations(self, level: EnergyLevel) -> Tuple[List[str], List[str]]:
        """Get recommended and avoid task types for energy level."""
        if level == EnergyLevel.PEAK:
            return (
                ["Complex planning", "Important decisions", "Harvesting", "Transplanting", "Budget review"],
                ["Data entry", "Routine watering", "Filing"]
            )
        elif level == EnergyLevel.MODERATE:
            return (
                ["Customer calls", "Team meetings", "Market prep", "Deliveries"],
                ["Complex analysis", "Strategic planning"]
            )
        elif level == EnergyLevel.DIP:
            return (
                ["Watering", "Weeding", "Data entry", "Inventory count", "Cleaning"],
                ["Important decisions", "Complex planning", "Customer negotiations"]
            )
        else:  # RECOVERY
            return (
                ["Light admin", "Email reading (not responding)", "Organizing"],
                ["Heavy physical work", "Critical decisions"]
            )

    def _generate_time_slots(self, start: datetime, count: int) -> List[datetime]:
        """Generate time slots for scheduling."""
        slots = []
        current = start

        for _ in range(count):
            # Skip night hours (wind_down to wake_time)
            while current.hour >= self.profile["wind_down"] or current.hour < self.profile["wake_time"]:
                current += timedelta(hours=1)

            slots.append(current)
            current += timedelta(minutes=45)  # 45-min task blocks

        return slots

    def _generate_schedule_recommendations(self, schedule: List[Dict]) -> List[str]:
        """Generate recommendations for the optimized schedule."""
        recommendations = []

        if not schedule:
            return recommendations

        # Check for consecutive high-energy tasks
        high_count = 0
        for task in schedule:
            task_type = task.get("task_type", "general").lower()
            if TASK_ENERGY_REQUIREMENTS.get(task_type) == TaskEnergyRequirement.HIGH:
                high_count += 1
            else:
                high_count = 0

            if high_count >= 3:
                recommendations.append("Consider adding a break between high-energy tasks")
                break

        # Check for dip utilization
        dip_tasks = sum(1 for t in schedule if t.get("energy_match", 0) < 0.5)
        if dip_tasks > len(schedule) // 3:
            recommendations.append("Several tasks scheduled during energy dips - consider rescheduling")

        return recommendations

    def _generate_time_reason(self, task_req: TaskEnergyRequirement, energy_state: EnergyState) -> str:
        """Generate human-readable reason for time suggestion."""
        level = energy_state.level.value

        if task_req == TaskEnergyRequirement.HIGH:
            if energy_state.level == EnergyLevel.PEAK:
                return f"This is your peak energy time - perfect for demanding tasks"
            return f"Wait for your next peak ({energy_state.next_peak_in} min) for best results"

        elif task_req == TaskEnergyRequirement.LOW:
            if energy_state.level == EnergyLevel.DIP:
                return "Your energy dip is ideal for routine tasks - save peak energy for harder work"
            return "Save this for your energy dip - use peak time for complex tasks"

        return f"Your {level} energy level is well-suited for this task"


# ==============================================================================
# UTILITY FUNCTIONS
# ==============================================================================

def energy_state_to_dict(state: EnergyState) -> Dict:
    """Convert EnergyState to JSON-serializable dict."""
    return {
        "level": state.level.value,
        "percentage": state.percentage,
        "trend": state.trend,
        "next_peak_in": state.next_peak_in,
        "recommended_tasks": state.recommended_tasks,
        "avoid_tasks": state.avoid_tasks,
        "time_of_day": state.time_of_day
    }


def get_energy_for_api(profile: str = "farmer_default") -> Dict:
    """API endpoint helper - get current energy state."""
    optimizer = EnergyOptimizer(profile)
    state = optimizer.get_current_energy_state()
    return energy_state_to_dict(state)


def optimize_tasks_for_api(tasks: List[Dict], profile: str = "farmer_default") -> Dict:
    """API endpoint helper - optimize task schedule."""
    optimizer = EnergyOptimizer(profile)
    result = optimizer.optimize_schedule(tasks)
    return {
        "tasks": result.tasks,
        "total_energy_match": result.total_energy_match,
        "conflicts_resolved": result.conflicts_resolved,
        "recommendations": result.recommendations
    }


# ==============================================================================
# CLI FOR TESTING
# ==============================================================================

if __name__ == "__main__":
    import sys

    print("=" * 60)
    print("ENERGY OPTIMIZER - Circadian Task Scheduling")
    print("=" * 60)

    # Test with farmer profile
    optimizer = EnergyOptimizer("farmer_default")
    state = optimizer.get_current_energy_state()

    print(f"\nCurrent Energy State ({state.time_of_day}):")
    print(f"  Level: {state.level.value.upper()}")
    print(f"  Percentage: {state.percentage}%")
    print(f"  Trend: {state.trend}")
    print(f"  Next peak in: {state.next_peak_in} minutes")
    print(f"\n  Recommended: {', '.join(state.recommended_tasks[:3])}")
    print(f"  Avoid: {', '.join(state.avoid_tasks[:2])}")

    # Test task matching
    test_tasks = [
        {"title": "Harvest tomatoes", "task_type": "harvesting"},
        {"title": "Update records", "task_type": "data_entry"},
        {"title": "Customer call", "task_type": "customer_calls"},
    ]

    print("\nTask Energy Matches:")
    for task in test_tasks:
        score = optimizer.match_task_to_energy(task)
        print(f"  {task['title']}: {score:.0%}")

    # Test optimization
    print("\nOptimized Schedule:")
    result = optimizer.optimize_schedule(test_tasks)
    for task in result.tasks:
        print(f"  {task.get('scheduled_time', 'TBD')[:16]} - {task['title']} ({task.get('energy_match', 0):.0%})")
    print(f"\nOverall Energy Match: {result.total_energy_match:.0%}")
