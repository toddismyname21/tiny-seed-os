"""
TinyPM Calendar Skills - Google Calendar Integration Skills
==========================================================

Wraps calendar_integration.py functionality with skill interface.

Skills included:
- get_upcoming_events: Get upcoming calendar events (READ_ONLY)
- get_events_today: Get all events for today (READ_ONLY)
- get_next_event: Get the next upcoming event (READ_ONLY)
- get_events_soon: Get events starting within N minutes (READ_ONLY)
- detect_conflicts: Check for scheduling conflicts (READ_ONLY)
- find_free_slots: Find free time slots (READ_ONLY)
- suggest_task_time: Suggest optimal time for a task (READ_ONLY)
- get_calendar_context: Get calendar context for PM (READ_ONLY)
- get_focus_time: Get available focus time information (READ_ONLY)
- get_scheduling_advice: Get natural language scheduling advice (READ_ONLY)

Created: 2026-01-30
Author: Builder Agent
Security: Calendar scopes only - NEVER accesses Sheets/Drive
"""

import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from skills import (
    TinyPMSkill,
    RiskLevel,
    SkillCategory,
    SkillExecutionRequest,
    SkillExecutionResult,
    ExecutionStatus,
    get_skill_registry,
)

# Import calendar integration
try:
    from calendar_integration import (
        get_calendar_integration,
        CalendarIntegration,
        CalendarEvent,
    )
    CALENDAR_AVAILABLE = True
except ImportError:
    CALENDAR_AVAILABLE = False
    print("[CalendarSkill] Warning: calendar_integration not available")


# =============================================================================
# GET UPCOMING EVENTS SKILL
# =============================================================================

class GetUpcomingEventsSkill(TinyPMSkill):
    """Get upcoming calendar events."""

    name = "get_upcoming_events"
    description = "Get upcoming events from Google Calendar for the next N hours."
    version = "1.0.0"
    category = SkillCategory.CALENDAR
    triggers = [
        "upcoming events",
        "calendar events",
        "what's on my calendar",
        "schedule",
        "my meetings",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["calendar:read"]
    rate_limit = 15
    cooldown_seconds = 5

    def _setup_parameters(self):
        self.add_parameter(
            name="hours",
            type="integer",
            description="Number of hours to look ahead",
            required=False,
            default=24,
            min_value=1,
            max_value=168,  # 1 week
        )
        self.add_parameter(
            name="max_results",
            type="integer",
            description="Maximum number of events to return",
            required=False,
            default=20,
            min_value=1,
            max_value=100,
        )
        self.add_parameter(
            name="user_id",
            type="string",
            description="User ID for calendar account",
            required=False,
            default="default",
        )

    def _setup_examples(self):
        self.add_example(
            intent="What's on my calendar today?",
            parameters={"hours": 24},
            expected_outcome="Returns all events for the next 24 hours",
        )
        self.add_example(
            intent="Show my meetings for this week",
            parameters={"hours": 168, "max_results": 50},
            expected_outcome="Returns events for the next week",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        if not CALENDAR_AVAILABLE:
            return self.error_result(request, error="Calendar integration not available")

        try:
            hours = request.parameters.get("hours", 24)
            max_results = request.parameters.get("max_results", 20)
            user_id = request.parameters.get("user_id", "default")

            calendar_client = get_calendar_integration(user_id)

            if not calendar_client.is_connected():
                return self.error_result(
                    request,
                    error="Calendar not connected. Please authenticate with Google Calendar first.",
                )

            events = calendar_client.get_upcoming_events(hours=hours, max_results=max_results)

            data = {
                "count": len(events),
                "hours_ahead": hours,
                "events": [e.to_dict() for e in events],
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# GET EVENTS TODAY SKILL
# =============================================================================

class GetEventsTodaySkill(TinyPMSkill):
    """Get all events for today."""

    name = "get_events_today"
    description = "Get all calendar events for today."
    version = "1.0.0"
    category = SkillCategory.CALENDAR
    triggers = [
        "today's events",
        "today's schedule",
        "what's today",
        "meetings today",
        "today's calendar",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["calendar:read"]
    cooldown_seconds = 5

    def _setup_parameters(self):
        self.add_parameter(
            name="user_id",
            type="string",
            description="User ID for calendar account",
            required=False,
            default="default",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        if not CALENDAR_AVAILABLE:
            return self.error_result(request, error="Calendar integration not available")

        try:
            user_id = request.parameters.get("user_id", "default")
            calendar_client = get_calendar_integration(user_id)

            if not calendar_client.is_connected():
                return self.error_result(request, error="Calendar not connected")

            events = calendar_client.get_events_today()

            data = {
                "count": len(events),
                "date": datetime.now().strftime("%Y-%m-%d"),
                "events": [e.to_dict() for e in events],
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# GET NEXT EVENT SKILL
# =============================================================================

class GetNextEventSkill(TinyPMSkill):
    """Get the next upcoming event."""

    name = "get_next_event"
    description = "Get the next upcoming calendar event."
    version = "1.0.0"
    category = SkillCategory.CALENDAR
    triggers = [
        "next meeting",
        "next event",
        "what's next",
        "upcoming meeting",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["calendar:read"]
    cooldown_seconds = 3

    def _setup_parameters(self):
        self.add_parameter(
            name="user_id",
            type="string",
            description="User ID for calendar account",
            required=False,
            default="default",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        if not CALENDAR_AVAILABLE:
            return self.error_result(request, error="Calendar integration not available")

        try:
            user_id = request.parameters.get("user_id", "default")
            calendar_client = get_calendar_integration(user_id)

            if not calendar_client.is_connected():
                return self.error_result(request, error="Calendar not connected")

            event = calendar_client.get_next_event()

            if not event:
                return self.success_result(request, data={
                    "has_upcoming": False,
                    "message": "No upcoming events found",
                })

            prep_time = calendar_client.get_prep_time_needed(event)

            data = {
                "has_upcoming": True,
                "event": event.to_dict(),
                "prep_time_needed_minutes": prep_time,
                "is_soon": event.is_soon(30),
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# GET EVENTS SOON SKILL
# =============================================================================

class GetEventsSoonSkill(TinyPMSkill):
    """Get events starting within N minutes."""

    name = "get_events_soon"
    description = "Get calendar events starting within the next N minutes."
    version = "1.0.0"
    category = SkillCategory.CALENDAR
    triggers = [
        "events starting soon",
        "meetings soon",
        "coming up",
        "what's coming up",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["calendar:read"]

    def _setup_parameters(self):
        self.add_parameter(
            name="minutes",
            type="integer",
            description="Minutes to look ahead",
            required=False,
            default=60,
            min_value=5,
            max_value=480,
        )
        self.add_parameter(
            name="user_id",
            type="string",
            description="User ID for calendar account",
            required=False,
            default="default",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        if not CALENDAR_AVAILABLE:
            return self.error_result(request, error="Calendar integration not available")

        try:
            minutes = request.parameters.get("minutes", 60)
            user_id = request.parameters.get("user_id", "default")

            calendar_client = get_calendar_integration(user_id)

            if not calendar_client.is_connected():
                return self.error_result(request, error="Calendar not connected")

            events = calendar_client.get_events_soon(minutes=minutes)

            data = {
                "count": len(events),
                "within_minutes": minutes,
                "events": [
                    {
                        **e.to_dict(),
                        "prep_time_needed": calendar_client.get_prep_time_needed(e),
                    }
                    for e in events
                ],
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# DETECT CONFLICTS SKILL
# =============================================================================

class DetectConflictsSkill(TinyPMSkill):
    """Detect scheduling conflicts for a proposed time slot."""

    name = "detect_calendar_conflicts"
    description = "Check if a proposed time slot has any calendar conflicts."
    version = "1.0.0"
    category = SkillCategory.CALENDAR
    triggers = [
        "check conflicts",
        "schedule conflict",
        "is this time free",
        "availability check",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["calendar:read"]

    def _setup_parameters(self):
        self.add_parameter(
            name="start_time",
            type="string",
            description="Start time in ISO format (e.g., 2026-01-30T14:00:00)",
            required=True,
        )
        self.add_parameter(
            name="end_time",
            type="string",
            description="End time in ISO format",
            required=True,
        )
        self.add_parameter(
            name="user_id",
            type="string",
            description="User ID for calendar account",
            required=False,
            default="default",
        )

    def _setup_examples(self):
        self.add_example(
            intent="Can I schedule a meeting tomorrow at 2pm?",
            parameters={
                "start_time": "2026-01-31T14:00:00",
                "end_time": "2026-01-31T15:00:00",
            },
            expected_outcome="Returns any conflicting events during that time",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        if not CALENDAR_AVAILABLE:
            return self.error_result(request, error="Calendar integration not available")

        try:
            start_str = request.parameters["start_time"]
            end_str = request.parameters["end_time"]
            user_id = request.parameters.get("user_id", "default")

            # Parse times
            start = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
            end = datetime.fromisoformat(end_str.replace("Z", "+00:00"))

            calendar_client = get_calendar_integration(user_id)

            if not calendar_client.is_connected():
                return self.error_result(request, error="Calendar not connected")

            conflicts = calendar_client.detect_conflicts(start, end)

            data = {
                "proposed_start": start_str,
                "proposed_end": end_str,
                "has_conflicts": len(conflicts) > 0,
                "conflict_count": len(conflicts),
                "conflicts": [e.to_dict() for e in conflicts],
            }

            return self.success_result(request, data=data)

        except ValueError as e:
            return self.error_result(request, error=f"Invalid time format: {e}")
        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# FIND FREE SLOTS SKILL
# =============================================================================

class FindFreeSlotsSkill(TinyPMSkill):
    """Find free time slots for scheduling."""

    name = "find_free_slots"
    description = "Find available free time slots of a minimum duration."
    version = "1.0.0"
    category = SkillCategory.CALENDAR
    triggers = [
        "find free time",
        "available slots",
        "when am I free",
        "open slots",
        "schedule availability",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["calendar:read"]

    def _setup_parameters(self):
        self.add_parameter(
            name="duration_minutes",
            type="integer",
            description="Minimum duration needed in minutes",
            required=False,
            default=30,
            min_value=15,
            max_value=480,
        )
        self.add_parameter(
            name="within_hours",
            type="integer",
            description="How far ahead to search (hours)",
            required=False,
            default=8,
            min_value=1,
            max_value=72,
        )
        self.add_parameter(
            name="user_id",
            type="string",
            description="User ID for calendar account",
            required=False,
            default="default",
        )

    def _setup_examples(self):
        self.add_example(
            intent="When can I fit in a 1-hour meeting today?",
            parameters={"duration_minutes": 60, "within_hours": 8},
            expected_outcome="Returns free slots of at least 60 minutes",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        if not CALENDAR_AVAILABLE:
            return self.error_result(request, error="Calendar integration not available")

        try:
            duration = request.parameters.get("duration_minutes", 30)
            within_hours = request.parameters.get("within_hours", 8)
            user_id = request.parameters.get("user_id", "default")

            calendar_client = get_calendar_integration(user_id)

            if not calendar_client.is_connected():
                return self.error_result(request, error="Calendar not connected")

            slots = calendar_client.find_free_slots(duration, within_hours)

            # Format slots for output
            formatted_slots = []
            for slot in slots:
                formatted_slots.append({
                    "start": slot["start"].isoformat(),
                    "end": slot["end"].isoformat(),
                    "duration_minutes": slot["duration_minutes"],
                    "start_formatted": slot["start"].strftime("%I:%M %p"),
                    "end_formatted": slot["end"].strftime("%I:%M %p"),
                })

            data = {
                "minimum_duration": duration,
                "search_hours": within_hours,
                "slot_count": len(formatted_slots),
                "free_slots": formatted_slots,
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# SUGGEST TASK TIME SKILL
# =============================================================================

class SuggestTaskTimeSkill(TinyPMSkill):
    """Suggest optimal time to work on a task."""

    name = "suggest_task_time"
    description = "Suggest the best time to work on a task based on calendar availability and work patterns."
    version = "1.0.0"
    category = SkillCategory.CALENDAR
    triggers = [
        "best time for task",
        "when should I",
        "schedule task",
        "optimal time",
        "suggest time",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["calendar:read"]

    def _setup_parameters(self):
        self.add_parameter(
            name="task_title",
            type="string",
            description="Title or description of the task",
            required=True,
        )
        self.add_parameter(
            name="estimated_minutes",
            type="integer",
            description="Estimated task duration in minutes",
            required=False,
            default=30,
            min_value=15,
            max_value=480,
        )
        self.add_parameter(
            name="user_id",
            type="string",
            description="User ID for calendar account",
            required=False,
            default="default",
        )

    def _setup_examples(self):
        self.add_example(
            intent="When's the best time to work on the quarterly report?",
            parameters={
                "task_title": "Quarterly report",
                "estimated_minutes": 90,
            },
            expected_outcome="Suggests optimal time slot for focused work",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        if not CALENDAR_AVAILABLE:
            return self.error_result(request, error="Calendar integration not available")

        try:
            task_title = request.parameters["task_title"]
            estimated_minutes = request.parameters.get("estimated_minutes", 30)
            user_id = request.parameters.get("user_id", "default")

            calendar_client = get_calendar_integration(user_id)

            if not calendar_client.is_connected():
                return self.error_result(request, error="Calendar not connected")

            suggestion = calendar_client.suggest_task_time(task_title, estimated_minutes)

            if not suggestion:
                return self.success_result(request, data={
                    "found_time": False,
                    "task": task_title,
                    "message": "No suitable time slot found in the next 8 hours",
                })

            data = {
                "found_time": True,
                "task": task_title,
                "estimated_minutes": estimated_minutes,
                "suggested_start": suggestion["start"].isoformat(),
                "suggested_end": suggestion["end"].isoformat(),
                "start_formatted": suggestion["start"].strftime("%I:%M %p"),
                "reason": suggestion["reason"],
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# GET CALENDAR CONTEXT SKILL
# =============================================================================

class GetCalendarContextSkill(TinyPMSkill):
    """Get comprehensive calendar context for PM decisions."""

    name = "get_calendar_context"
    description = "Get comprehensive calendar context including events, focus time, and prep warnings. Used for proactive PM suggestions."
    version = "1.0.0"
    category = SkillCategory.CALENDAR
    triggers = [
        "calendar context",
        "calendar summary",
        "calendar status",
        "day overview",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["calendar:read"]
    cooldown_seconds = 10

    def _setup_parameters(self):
        self.add_parameter(
            name="user_id",
            type="string",
            description="User ID for calendar account",
            required=False,
            default="default",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        if not CALENDAR_AVAILABLE:
            return self.error_result(request, error="Calendar integration not available")

        try:
            user_id = request.parameters.get("user_id", "default")
            calendar_client = get_calendar_integration(user_id)

            context = calendar_client.get_calendar_context_for_pm()

            return self.success_result(request, data=context)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# GET FOCUS TIME SKILL
# =============================================================================

class GetFocusTimeSkill(TinyPMSkill):
    """Get available focus time information."""

    name = "get_focus_time"
    description = "Get information about available uninterrupted focus time for deep work."
    version = "1.0.0"
    category = SkillCategory.CALENDAR
    triggers = [
        "focus time",
        "deep work time",
        "uninterrupted time",
        "time to focus",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["calendar:read"]

    def _setup_parameters(self):
        self.add_parameter(
            name="user_id",
            type="string",
            description="User ID for calendar account",
            required=False,
            default="default",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        if not CALENDAR_AVAILABLE:
            return self.error_result(request, error="Calendar integration not available")

        try:
            user_id = request.parameters.get("user_id", "default")
            calendar_client = get_calendar_integration(user_id)

            if not calendar_client.is_connected():
                return self.error_result(request, error="Calendar not connected")

            focus = calendar_client.get_focus_time_available()

            data = {
                "next_block_minutes": focus["next_block_minutes"],
                "total_today_minutes": focus["total_today_minutes"],
                "next_meeting_in_minutes": focus["next_meeting_in"],
                "has_deep_work_time": focus["has_deep_work_time"],
                "recommendation": self._get_recommendation(focus),
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))

    def _get_recommendation(self, focus: Dict) -> str:
        """Generate a recommendation based on focus time."""
        if focus.get("has_deep_work_time"):
            return f"You have {focus.get('next_block_minutes', 0)} minutes of focus time - perfect for deep work!"
        elif focus.get("next_block_minutes", 0) >= 30:
            return f"{focus.get('next_block_minutes', 0)} minutes available - good for moderate tasks."
        elif focus.get("next_meeting_in"):
            return f"Meeting in {focus.get('next_meeting_in')} minutes - stick to quick tasks."
        else:
            return "Limited focus time available."


# =============================================================================
# GET SCHEDULING ADVICE SKILL
# =============================================================================

class GetSchedulingAdviceSkill(TinyPMSkill):
    """Get natural language scheduling advice."""

    name = "get_scheduling_advice"
    description = "Get human-readable scheduling advice for the current day."
    version = "1.0.0"
    category = SkillCategory.CALENDAR
    triggers = [
        "scheduling advice",
        "what should I do",
        "planning advice",
        "schedule tips",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["calendar:read"]

    def _setup_parameters(self):
        self.add_parameter(
            name="task_duration_minutes",
            type="integer",
            description="Duration of task you want to fit in (optional)",
            required=False,
            default=30,
            min_value=15,
            max_value=480,
        )
        self.add_parameter(
            name="user_id",
            type="string",
            description="User ID for calendar account",
            required=False,
            default="default",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        if not CALENDAR_AVAILABLE:
            return self.error_result(request, error="Calendar integration not available")

        try:
            duration = request.parameters.get("task_duration_minutes", 30)
            user_id = request.parameters.get("user_id", "default")

            calendar_client = get_calendar_integration(user_id)
            advice = calendar_client.get_scheduling_advice(duration)

            data = {
                "advice": advice,
                "task_duration_considered": duration,
                "timestamp": datetime.now().isoformat(),
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# REGISTRATION
# =============================================================================

def register_calendar_skills():
    """Register all calendar skills with the global registry."""
    registry = get_skill_registry()

    skills = [
        GetUpcomingEventsSkill(),
        GetEventsTodaySkill(),
        GetNextEventSkill(),
        GetEventsSoonSkill(),
        DetectConflictsSkill(),
        FindFreeSlotsSkill(),
        SuggestTaskTimeSkill(),
        GetCalendarContextSkill(),
        GetFocusTimeSkill(),
        GetSchedulingAdviceSkill(),
    ]

    for skill in skills:
        registry.register(skill)

    print(f"[CalendarSkill] Registered {len(skills)} calendar skills")
    return skills


# Auto-register on import
if CALENDAR_AVAILABLE:
    register_calendar_skills()
