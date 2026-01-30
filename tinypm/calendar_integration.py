"""
TinyPM Calendar Integration
===========================
Google Calendar integration for proactive scheduling suggestions.

SECURITY: HARD BOUNDARIES - Only calendar scopes, never sheets/drive.

This module provides calendar intelligence for the PM system:
- Get upcoming events
- Detect scheduling conflicts
- Suggest optimal times for tasks
- Prep time recommendations

Created: 2026-01-30
Author: Backend_Agent_9
"""

import os
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field


# =============================================================================
# SECURITY: SCOPE VALIDATION
# =============================================================================

ALLOWED_SCOPES = frozenset([
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events.readonly',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
])

FORBIDDEN_SCOPES = frozenset([
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/gmail',
    'https://www.googleapis.com/auth/documents',
])


def validate_scopes(scopes: List[str]) -> bool:
    """
    Validate that scopes are ONLY calendar-related.
    HARD BOUNDARY: TinyPM NEVER accesses Sheets/Drive.
    """
    for scope in scopes:
        if scope in FORBIDDEN_SCOPES:
            raise SecurityError(f"FORBIDDEN: TinyPM cannot use scope: {scope}")
        if scope not in ALLOWED_SCOPES:
            print(f"[Calendar Security] Warning: Unknown scope: {scope}")
    return True


class SecurityError(Exception):
    """Raised when security boundary is violated."""
    pass


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class CalendarEvent:
    """Represents a calendar event."""
    id: str
    title: str
    start: datetime
    end: datetime
    location: Optional[str] = None
    description: Optional[str] = None
    attendees: List[str] = field(default_factory=list)
    is_all_day: bool = False

    def __post_init__(self):
        if self.attendees is None:
            self.attendees = []

    def minutes_until(self) -> int:
        """Minutes until this event starts."""
        now = datetime.now()
        # Handle timezone-aware datetimes
        if self.start.tzinfo is not None:
            try:
                from datetime import timezone
                now = datetime.now(timezone.utc)
            except ImportError:
                pass
        delta = self.start - now
        return int(delta.total_seconds() / 60)

    def is_soon(self, minutes: int = 30) -> bool:
        """Check if event is starting soon."""
        mins = self.minutes_until()
        return 0 < mins <= minutes

    def duration_minutes(self) -> int:
        """Get event duration in minutes."""
        delta = self.end - self.start
        return int(delta.total_seconds() / 60)

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'title': self.title,
            'start': self.start.isoformat(),
            'end': self.end.isoformat(),
            'location': self.location,
            'description': self.description,
            'attendees': self.attendees,
            'is_all_day': self.is_all_day,
            'minutes_until': self.minutes_until(),
            'duration_minutes': self.duration_minutes()
        }


# =============================================================================
# CALENDAR INTEGRATION CLASS
# =============================================================================

class CalendarIntegration:
    """
    Google Calendar integration for TinyPM.

    Features:
    - Get upcoming events
    - Detect scheduling conflicts
    - Suggest optimal times for tasks
    - Prep time recommendations

    SECURITY: Only uses calendar scopes, validates all tokens.
    """

    CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3"

    def __init__(self, user_id: str = "default"):
        self.user_id = user_id
        self._access_token: Optional[str] = None
        self._token_expiry: Optional[datetime] = None
        self._cache: Dict[str, Any] = {}
        self._cache_expiry: Dict[str, datetime] = {}

    def _get_access_token(self) -> Optional[str]:
        """
        Get valid access token from OAuth manager.

        SECURITY: Validates scopes before returning token.
        """
        # Check if we have a valid cached token
        if self._access_token and self._token_expiry:
            if datetime.now() < self._token_expiry:
                return self._access_token

        # Try to get token from OAuth manager
        try:
            from oauth_manager import get_oauth_manager
            manager = get_oauth_manager()

            # SECURITY: Validate scopes before getting token
            token_info = manager.get_token_info(self.user_id)
            if token_info and 'scopes' in token_info:
                validate_scopes(token_info['scopes'])

            self._access_token = manager.get_valid_access_token(self.user_id)
            self._token_expiry = datetime.now() + timedelta(minutes=55)
            return self._access_token

        except ImportError:
            print("[Calendar] OAuth manager not available - calendar features disabled")
            return None
        except SecurityError as e:
            print(f"[Calendar] SECURITY VIOLATION: {e}")
            return None
        except Exception as e:
            print(f"[Calendar] Error getting access token: {e}")
            return None

    def _api_request(self, endpoint: str, method: str = 'GET', data: Dict = None) -> Optional[Dict]:
        """Make authenticated request to Calendar API."""
        import urllib.request
        import urllib.error

        token = self._get_access_token()
        if not token:
            print("[Calendar] No valid access token")
            return None

        url = f"{self.CALENDAR_API_BASE}{endpoint}"

        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

        req_data = json.dumps(data).encode() if data else None
        req = urllib.request.Request(url, data=req_data, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                return json.loads(response.read().decode())
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else "No error body"
            print(f"[Calendar] API error: {e.code} - {error_body}")
            return None
        except urllib.error.URLError as e:
            print(f"[Calendar] Network error: {e.reason}")
            return None
        except Exception as e:
            print(f"[Calendar] Request error: {e}")
            return None

    def _get_cached(self, key: str, max_age_seconds: int = 60) -> Optional[Any]:
        """Get cached value if still valid."""
        if key in self._cache and key in self._cache_expiry:
            if datetime.now() < self._cache_expiry[key]:
                return self._cache[key]
        return None

    def _set_cached(self, key: str, value: Any, max_age_seconds: int = 60):
        """Cache a value with expiry."""
        self._cache[key] = value
        self._cache_expiry[key] = datetime.now() + timedelta(seconds=max_age_seconds)

    def is_connected(self) -> bool:
        """Check if calendar is connected and accessible."""
        return self._get_access_token() is not None

    def get_upcoming_events(self, hours: int = 24, max_results: int = 20) -> List[CalendarEvent]:
        """
        Get upcoming events for the next N hours.

        Args:
            hours: Number of hours to look ahead
            max_results: Maximum number of events to return

        Returns:
            List of CalendarEvent objects sorted by start time
        """
        # Check cache first
        cache_key = f"upcoming_{hours}_{max_results}"
        cached = self._get_cached(cache_key, max_age_seconds=30)
        if cached is not None:
            return cached

        now = datetime.utcnow()
        time_min = now.isoformat() + 'Z'
        time_max = (now + timedelta(hours=hours)).isoformat() + 'Z'

        endpoint = (
            f"/calendars/primary/events?"
            f"timeMin={time_min}&"
            f"timeMax={time_max}&"
            f"maxResults={max_results}&"
            f"singleEvents=true&"
            f"orderBy=startTime"
        )

        result = self._api_request(endpoint)
        if not result:
            return []

        events = []
        for item in result.get('items', []):
            event = self._parse_event(item)
            if event:
                events.append(event)

        # Cache results
        self._set_cached(cache_key, events, max_age_seconds=30)

        return events

    def _parse_event(self, item: Dict) -> Optional[CalendarEvent]:
        """Parse a Google Calendar API event item into CalendarEvent."""
        try:
            start_data = item.get('start', {})
            end_data = item.get('end', {})

            # Parse start/end times
            if 'dateTime' in start_data:
                start_str = start_data['dateTime']
                end_str = end_data.get('dateTime', start_str)

                # Handle various timezone formats
                start = self._parse_datetime(start_str)
                end = self._parse_datetime(end_str)
                is_all_day = False
            else:
                # All-day event
                start_date = start_data.get('date', '')
                end_date = end_data.get('date', start_date)
                start = datetime.strptime(start_date, '%Y-%m-%d')
                end = datetime.strptime(end_date, '%Y-%m-%d')
                is_all_day = True

            # Extract attendees
            attendees = []
            for attendee in item.get('attendees', []):
                email = attendee.get('email')
                if email:
                    attendees.append(email)

            return CalendarEvent(
                id=item.get('id', ''),
                title=item.get('summary', 'No Title'),
                start=start,
                end=end,
                location=item.get('location'),
                description=item.get('description'),
                attendees=attendees,
                is_all_day=is_all_day
            )
        except Exception as e:
            print(f"[Calendar] Error parsing event: {e}")
            return None

    def _parse_datetime(self, dt_str: str) -> datetime:
        """Parse datetime string with various timezone formats."""
        # Remove Z suffix
        if dt_str.endswith('Z'):
            dt_str = dt_str[:-1] + '+00:00'

        # Handle +00:00 format
        if '+' in dt_str or (dt_str.count('-') > 2):
            try:
                return datetime.fromisoformat(dt_str)
            except ValueError:
                pass

        # Fallback: try without timezone
        try:
            return datetime.fromisoformat(dt_str.split('+')[0].split('-')[0:3])
        except (ValueError, TypeError):
            pass

        # Final fallback
        return datetime.fromisoformat(dt_str[:19])

    def get_events_today(self) -> List[CalendarEvent]:
        """Get all events for today."""
        now = datetime.now()
        hours_left = 24 - now.hour
        return self.get_upcoming_events(hours=max(hours_left, 1))

    def get_next_event(self) -> Optional[CalendarEvent]:
        """Get the next upcoming event."""
        events = self.get_upcoming_events(hours=24, max_results=1)
        return events[0] if events else None

    def get_events_soon(self, minutes: int = 60) -> List[CalendarEvent]:
        """Get events starting within N minutes."""
        events = self.get_upcoming_events(hours=2)
        return [e for e in events if e.is_soon(minutes)]

    def detect_conflicts(self, start: datetime, end: datetime) -> List[CalendarEvent]:
        """
        Detect any calendar conflicts for a proposed time slot.

        Args:
            start: Proposed start time
            end: Proposed end time

        Returns:
            List of conflicting events
        """
        # Get events around the proposed time
        now = datetime.now()
        hours_ahead = int((end - now).total_seconds() / 3600) + 2
        events = self.get_upcoming_events(hours=max(hours_ahead, 24))

        conflicts = []
        for event in events:
            # Check for overlap: event starts before end AND event ends after start
            if event.start < end and event.end > start:
                conflicts.append(event)

        return conflicts

    def find_free_slots(self, duration_minutes: int, within_hours: int = 8) -> List[Dict]:
        """
        Find free time slots of at least `duration_minutes` length.

        Args:
            duration_minutes: Minimum slot duration needed
            within_hours: How far ahead to search

        Returns:
            List of {start, end, duration_minutes} dicts
        """
        events = self.get_upcoming_events(hours=within_hours)

        free_slots = []
        current_time = datetime.now()
        end_time = current_time + timedelta(hours=within_hours)

        # Sort events by start time (should already be sorted)
        events.sort(key=lambda e: e.start)

        # Find gaps between events
        last_end = current_time
        for event in events:
            if event.start > last_end:
                gap_minutes = (event.start - last_end).total_seconds() / 60
                if gap_minutes >= duration_minutes:
                    free_slots.append({
                        'start': last_end,
                        'end': event.start,
                        'duration_minutes': int(gap_minutes)
                    })
            last_end = max(last_end, event.end)

        # Check time after last event
        if last_end < end_time:
            gap_minutes = (end_time - last_end).total_seconds() / 60
            if gap_minutes >= duration_minutes:
                free_slots.append({
                    'start': last_end,
                    'end': end_time,
                    'duration_minutes': int(gap_minutes)
                })

        return free_slots

    def suggest_task_time(self, task_title: str, estimated_minutes: int = 30) -> Optional[Dict]:
        """
        Suggest the best time to work on a task based on calendar.

        Args:
            task_title: Title of the task (used for context)
            estimated_minutes: How long the task will take

        Returns:
            {start, end, reason} or None if no good time found
        """
        free_slots = self.find_free_slots(estimated_minutes)

        if not free_slots:
            return None

        # Prefer slots that are:
        # 1. Not immediately (give 15 min buffer)
        # 2. Long enough for the task
        # 3. During reasonable hours (9am-6pm)

        best_slot = None
        best_reason = ""

        for slot in free_slots:
            start_hour = slot['start'].hour

            # Skip if too early or too late
            if start_hour < 9:
                continue
            if start_hour > 18:
                continue

            # Skip if starting in next 15 minutes (need buffer)
            if slot['start'] < datetime.now() + timedelta(minutes=15):
                continue

            # This slot works
            best_slot = slot
            best_reason = f"Free slot with {slot['duration_minutes']} minutes available"

            # Prefer morning slots for deep work
            if 9 <= start_hour <= 11:
                best_reason = f"Morning slot (optimal for focus) with {slot['duration_minutes']} min"
                break

            # Also good: early afternoon
            if 13 <= start_hour <= 15:
                best_reason = f"Afternoon slot with {slot['duration_minutes']} min available"

        if not best_slot:
            # Fallback to first available
            best_slot = free_slots[0]
            best_reason = f"First available slot ({best_slot['duration_minutes']} min)"

        return {
            'start': best_slot['start'],
            'end': best_slot['start'] + timedelta(minutes=estimated_minutes),
            'reason': best_reason
        }

    def get_prep_time_needed(self, event: CalendarEvent) -> int:
        """
        Estimate prep time needed for an event.

        Args:
            event: The calendar event

        Returns:
            Recommended prep time in minutes
        """
        prep_time = 5  # Default minimum

        # More prep for meetings with multiple attendees
        if event.attendees:
            num_attendees = len(event.attendees)
            if num_attendees > 5:
                prep_time = 20
            elif num_attendees > 2:
                prep_time = 15
            else:
                prep_time = 10

        # More prep if it has a location (need to travel)
        if event.location:
            # Check if it's a video call
            location_lower = event.location.lower()
            if any(vc in location_lower for vc in ['zoom', 'meet', 'teams', 'webex']):
                prep_time = max(prep_time, 5)
            else:
                # Physical location - need travel time
                prep_time = max(prep_time, 20)

        # Check title for hints about importance
        title_lower = event.title.lower()
        high_importance_keywords = [
            'interview', 'presentation', 'review', 'important',
            'board', 'investor', 'client', 'demo', 'pitch',
            '1:1', 'one-on-one', 'performance'
        ]
        if any(word in title_lower for word in high_importance_keywords):
            prep_time = max(prep_time, 30)

        # Check description for additional context
        if event.description:
            desc_lower = event.description.lower()
            if 'agenda' in desc_lower or 'prepare' in desc_lower:
                prep_time = max(prep_time, 15)

        return prep_time

    def get_focus_time_available(self) -> Dict:
        """
        Calculate how much uninterrupted focus time is available.

        Returns:
            {next_block_minutes, total_today_minutes, next_meeting_in}
        """
        events = self.get_events_today()
        now = datetime.now()

        # Find next event
        next_event = None
        for event in events:
            if event.start > now:
                next_event = event
                break

        if next_event:
            next_block_minutes = int((next_event.start - now).total_seconds() / 60)
            next_meeting_in = next_block_minutes
        else:
            # No more events today
            end_of_day = now.replace(hour=18, minute=0, second=0)
            if now < end_of_day:
                next_block_minutes = int((end_of_day - now).total_seconds() / 60)
            else:
                next_block_minutes = 0
            next_meeting_in = None

        # Calculate total free time today
        total_free = 0
        free_slots = self.find_free_slots(duration_minutes=15, within_hours=8)
        for slot in free_slots:
            # Only count slots during work hours
            if 9 <= slot['start'].hour <= 18:
                total_free += slot['duration_minutes']

        return {
            'next_block_minutes': next_block_minutes,
            'total_today_minutes': total_free,
            'next_meeting_in': next_meeting_in,
            'has_deep_work_time': next_block_minutes >= 90
        }

    def get_calendar_context_for_pm(self) -> Dict:
        """
        Get calendar context for the PM to use in proactive suggestions.

        Returns comprehensive calendar intelligence for PM decision-making.
        """
        # Check if connected first
        if not self.is_connected():
            return {
                'connected': False,
                'events_today_count': 0,
                'events_today': [],
                'next_event': None,
                'events_starting_soon': [],
                'prep_needed': False,
                'busy_day': False,
                'focus_time': None
            }

        events_today = self.get_events_today()
        next_event = self.get_next_event()
        events_soon = self.get_events_soon(60)
        focus_time = self.get_focus_time_available()

        context = {
            'connected': True,
            'events_today_count': len(events_today),
            'events_today': [e.to_dict() for e in events_today[:5]],
            'next_event': None,
            'events_starting_soon': [],
            'prep_needed': False,
            'busy_day': len(events_today) > 5,
            'focus_time': focus_time
        }

        if next_event:
            prep_needed = self.get_prep_time_needed(next_event)
            minutes_until = next_event.minutes_until()

            context['next_event'] = {
                'title': next_event.title,
                'start': next_event.start.isoformat(),
                'minutes_until': minutes_until,
                'prep_time_needed': prep_needed,
                'location': next_event.location,
                'attendee_count': len(next_event.attendees)
            }

            # Check if prep time warning needed
            if minutes_until <= prep_needed + 10:
                context['prep_needed'] = True
                context['prep_warning'] = (
                    f"'{next_event.title}' starts in {minutes_until} min. "
                    f"Recommended prep time: {prep_needed} min."
                )

        for event in events_soon:
            context['events_starting_soon'].append({
                'title': event.title,
                'minutes_until': event.minutes_until(),
                'is_all_day': event.is_all_day
            })

        return context

    def get_scheduling_advice(self, task_duration_minutes: int = 30) -> str:
        """
        Get human-readable scheduling advice for the PM.

        Args:
            task_duration_minutes: How long the task needs

        Returns:
            Natural language advice string
        """
        if not self.is_connected():
            return "Calendar not connected. Connect Google Calendar for scheduling suggestions."

        context = self.get_calendar_context_for_pm()
        focus = context.get('focus_time', {})

        advice_parts = []

        # Check focus time
        if focus.get('has_deep_work_time'):
            advice_parts.append(
                f"You have {focus.get('next_block_minutes', 0)} minutes of focus time "
                f"before your next meeting."
            )
        elif focus.get('next_meeting_in'):
            advice_parts.append(
                f"Next meeting in {focus.get('next_meeting_in')} minutes - "
                f"consider quick tasks only."
            )

        # Check if prep needed
        if context.get('prep_needed'):
            advice_parts.append(context.get('prep_warning', ''))

        # Check if busy day
        if context.get('busy_day'):
            advice_parts.append(
                f"Busy day with {context.get('events_today_count')} events - "
                f"protect your focus time."
            )

        # Suggest optimal time for task
        suggestion = self.suggest_task_time("task", task_duration_minutes)
        if suggestion:
            start_time = suggestion['start'].strftime('%I:%M %p')
            advice_parts.append(
                f"Best time for a {task_duration_minutes}-min task: {start_time}. "
                f"({suggestion['reason']})"
            )

        return " ".join(advice_parts) if advice_parts else "Calendar looks clear."


# =============================================================================
# GLOBAL INSTANCE AND FACTORY
# =============================================================================

_calendar_integration: Optional[CalendarIntegration] = None


def get_calendar_integration(user_id: str = "default") -> CalendarIntegration:
    """Get or create calendar integration instance."""
    global _calendar_integration
    if _calendar_integration is None or _calendar_integration.user_id != user_id:
        _calendar_integration = CalendarIntegration(user_id)
    return _calendar_integration


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """CLI interface for testing calendar integration."""
    import sys

    print("=" * 60)
    print("TinyPM Calendar Integration")
    print("=" * 60)

    cal = get_calendar_integration()

    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == "status":
            print(f"\nConnected: {cal.is_connected()}")
            if cal.is_connected():
                context = cal.get_calendar_context_for_pm()
                print(f"Events today: {context['events_today_count']}")
                print(f"Busy day: {context['busy_day']}")
                if context['next_event']:
                    print(f"Next event: {context['next_event']['title']} "
                          f"in {context['next_event']['minutes_until']} min")

        elif command == "events":
            print("\nUpcoming events:")
            events = cal.get_upcoming_events()
            if not events:
                print("  (No events or not connected)")
            for event in events:
                print(f"  - {event.title}")
                print(f"    Start: {event.start}")
                print(f"    Minutes until: {event.minutes_until()}")

        elif command == "free":
            print("\nFree slots (30+ min):")
            slots = cal.find_free_slots(30)
            if not slots:
                print("  (No free slots or not connected)")
            for slot in slots:
                print(f"  - {slot['start'].strftime('%I:%M %p')} - "
                      f"{slot['end'].strftime('%I:%M %p')} "
                      f"({slot['duration_minutes']} min)")

        elif command == "advice":
            print("\nScheduling advice:")
            print(cal.get_scheduling_advice())

        elif command == "context":
            print("\nFull PM context:")
            context = cal.get_calendar_context_for_pm()
            print(json.dumps(context, indent=2, default=str))

        else:
            print(f"Unknown command: {command}")
            print("Available: status, events, free, advice, context")

    else:
        print("\nUsage: python calendar_integration.py <command>")
        print("\nCommands:")
        print("  status   - Check connection and basic status")
        print("  events   - List upcoming events")
        print("  free     - Find free time slots")
        print("  advice   - Get scheduling advice")
        print("  context  - Get full PM context (JSON)")
        print("\nNote: Requires OAuth manager to be configured.")


if __name__ == "__main__":
    main()
