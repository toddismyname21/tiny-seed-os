"""
Chief of Staff Calendar Integration
===================================
Full Google Calendar integration for the Chief of Staff command center.

FULL ACCESS: Unlike TinyPM, Chief of Staff has full calendar access
including the ability to create, modify, and delete events.

Features:
- Get upcoming events
- Create new events
- Detect scheduling conflicts
- Suggest optimal times for tasks
- Prep time recommendations
- Block focus time

Created: 2026-01-30
Author: Chief_of_Staff_Claude
"""

import os
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field


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
    calendar_id: str = 'primary'

    def __post_init__(self):
        if self.attendees is None:
            self.attendees = []

    def minutes_until(self) -> int:
        """Minutes until this event starts."""
        now = datetime.now()
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
    Full Google Calendar integration for Chief of Staff.

    Features:
    - Get upcoming events
    - Create/update/delete events
    - Detect scheduling conflicts
    - Suggest optimal times
    - Block focus time
    - Multi-calendar support
    """

    CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3"

    def __init__(self, user_id: str = "default"):
        self.user_id = user_id
        self._access_token: Optional[str] = None
        self._token_expiry: Optional[datetime] = None
        self._cache: Dict[str, Any] = {}
        self._cache_expiry: Dict[str, datetime] = {}

    def _get_access_token(self) -> Optional[str]:
        """Get valid access token from OAuth manager."""
        if self._access_token and self._token_expiry:
            if datetime.now() < self._token_expiry:
                return self._access_token

        try:
            from oauth_manager import get_oauth_manager
            manager = get_oauth_manager()
            self._access_token = manager.get_valid_access_token(self.user_id)
            self._token_expiry = datetime.now() + timedelta(minutes=55)
            return self._access_token
        except ImportError:
            print("[Calendar] OAuth manager not available")
            return None
        except Exception as e:
            print(f"[Calendar] Error getting access token: {e}")
            return None

    def _api_request(self, endpoint: str, method: str = 'GET',
                     data: Dict = None, params: Dict = None) -> Optional[Dict]:
        """Make authenticated request to Calendar API."""
        import urllib.request
        import urllib.error
        from urllib.parse import urlencode

        token = self._get_access_token()
        if not token:
            print("[Calendar] No valid access token")
            return None

        url = f"{self.CALENDAR_API_BASE}{endpoint}"
        if params:
            url += '?' + urlencode(params)

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

    # =========================================================================
    # READ OPERATIONS
    # =========================================================================

    def get_upcoming_events(self, hours: int = 24, max_results: int = 20,
                            calendar_id: str = 'primary') -> List[CalendarEvent]:
        """
        Get upcoming events for the next N hours.

        Args:
            hours: Number of hours to look ahead
            max_results: Maximum number of events to return
            calendar_id: Which calendar to query (default: primary)

        Returns:
            List of CalendarEvent objects sorted by start time
        """
        cache_key = f"upcoming_{calendar_id}_{hours}_{max_results}"
        cached = self._get_cached(cache_key, max_age_seconds=30)
        if cached is not None:
            return cached

        now = datetime.utcnow()
        time_min = now.isoformat() + 'Z'
        time_max = (now + timedelta(hours=hours)).isoformat() + 'Z'

        params = {
            'timeMin': time_min,
            'timeMax': time_max,
            'maxResults': str(max_results),
            'singleEvents': 'true',
            'orderBy': 'startTime'
        }

        result = self._api_request(f"/calendars/{calendar_id}/events", params=params)
        if not result:
            return []

        events = []
        for item in result.get('items', []):
            event = self._parse_event(item, calendar_id)
            if event:
                events.append(event)

        self._set_cached(cache_key, events, max_age_seconds=30)
        return events

    def _parse_event(self, item: Dict, calendar_id: str = 'primary') -> Optional[CalendarEvent]:
        """Parse a Google Calendar API event item into CalendarEvent."""
        try:
            start_data = item.get('start', {})
            end_data = item.get('end', {})

            if 'dateTime' in start_data:
                start = self._parse_datetime(start_data['dateTime'])
                end = self._parse_datetime(end_data.get('dateTime', start_data['dateTime']))
                is_all_day = False
            else:
                start_date = start_data.get('date', '')
                end_date = end_data.get('date', start_date)
                start = datetime.strptime(start_date, '%Y-%m-%d')
                end = datetime.strptime(end_date, '%Y-%m-%d')
                is_all_day = True

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
                is_all_day=is_all_day,
                calendar_id=calendar_id
            )
        except Exception as e:
            print(f"[Calendar] Error parsing event: {e}")
            return None

    def _parse_datetime(self, dt_str: str) -> datetime:
        """Parse datetime string with various timezone formats."""
        if dt_str.endswith('Z'):
            dt_str = dt_str[:-1] + '+00:00'

        try:
            return datetime.fromisoformat(dt_str)
        except ValueError:
            pass

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

    # =========================================================================
    # WRITE OPERATIONS (Chief of Staff Only)
    # =========================================================================

    def create_event(self, title: str, start: datetime, end: datetime,
                     description: str = None, location: str = None,
                     attendees: List[str] = None,
                     calendar_id: str = 'primary') -> Optional[Dict]:
        """
        Create a new calendar event.

        Args:
            title: Event title/summary
            start: Start datetime
            end: End datetime
            description: Optional event description
            location: Optional location
            attendees: Optional list of attendee email addresses
            calendar_id: Which calendar to add event to

        Returns:
            Created event data or None if failed
        """
        event_data = {
            'summary': title,
            'start': {
                'dateTime': start.isoformat(),
                'timeZone': 'America/New_York'  # TODO: Make configurable
            },
            'end': {
                'dateTime': end.isoformat(),
                'timeZone': 'America/New_York'
            }
        }

        if description:
            event_data['description'] = description
        if location:
            event_data['location'] = location
        if attendees:
            event_data['attendees'] = [{'email': email} for email in attendees]

        result = self._api_request(
            f"/calendars/{calendar_id}/events",
            method='POST',
            data=event_data
        )

        if result:
            # Clear cache since we modified the calendar
            self._cache.clear()
            self._cache_expiry.clear()
            print(f"[Calendar] Created event: {title}")

        return result

    def block_focus_time(self, start: datetime, end: datetime,
                         title: str = "Focus Time - Do Not Disturb") -> Optional[Dict]:
        """
        Block focus time on the calendar.

        Args:
            start: Start datetime
            end: End datetime
            title: Event title (default: "Focus Time - Do Not Disturb")

        Returns:
            Created event data or None if failed
        """
        return self.create_event(
            title=title,
            start=start,
            end=end,
            description="Automatically blocked by Chief of Staff for deep work."
        )

    def delete_event(self, event_id: str, calendar_id: str = 'primary') -> bool:
        """
        Delete a calendar event.

        Args:
            event_id: The event ID to delete
            calendar_id: Which calendar the event is in

        Returns:
            True if successful
        """
        import urllib.request
        import urllib.error

        token = self._get_access_token()
        if not token:
            return False

        url = f"{self.CALENDAR_API_BASE}/calendars/{calendar_id}/events/{event_id}"
        req = urllib.request.Request(
            url,
            headers={'Authorization': f'Bearer {token}'},
            method='DELETE'
        )

        try:
            urllib.request.urlopen(req, timeout=30)
            self._cache.clear()
            self._cache_expiry.clear()
            print(f"[Calendar] Deleted event: {event_id}")
            return True
        except Exception as e:
            print(f"[Calendar] Delete failed: {e}")
            return False

    # =========================================================================
    # SCHEDULING INTELLIGENCE
    # =========================================================================

    def detect_conflicts(self, start: datetime, end: datetime) -> List[CalendarEvent]:
        """Detect any calendar conflicts for a proposed time slot."""
        now = datetime.now()
        hours_ahead = int((end - now).total_seconds() / 3600) + 2
        events = self.get_upcoming_events(hours=max(hours_ahead, 24))

        conflicts = []
        for event in events:
            if event.start < end and event.end > start:
                conflicts.append(event)

        return conflicts

    def find_free_slots(self, duration_minutes: int, within_hours: int = 8) -> List[Dict]:
        """Find free time slots of at least `duration_minutes` length."""
        events = self.get_upcoming_events(hours=within_hours)

        free_slots = []
        current_time = datetime.now()
        end_time = current_time + timedelta(hours=within_hours)

        events.sort(key=lambda e: e.start)

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
        """Suggest the best time to work on a task based on calendar."""
        free_slots = self.find_free_slots(estimated_minutes)

        if not free_slots:
            return None

        best_slot = None
        best_reason = ""

        for slot in free_slots:
            start_hour = slot['start'].hour

            if start_hour < 9 or start_hour > 18:
                continue

            if slot['start'] < datetime.now() + timedelta(minutes=15):
                continue

            best_slot = slot
            best_reason = f"Free slot with {slot['duration_minutes']} minutes available"

            if 9 <= start_hour <= 11:
                best_reason = f"Morning slot (optimal for focus) with {slot['duration_minutes']} min"
                break

            if 13 <= start_hour <= 15:
                best_reason = f"Afternoon slot with {slot['duration_minutes']} min available"

        if not best_slot and free_slots:
            best_slot = free_slots[0]
            best_reason = f"First available slot ({best_slot['duration_minutes']} min)"

        if best_slot:
            return {
                'start': best_slot['start'],
                'end': best_slot['start'] + timedelta(minutes=estimated_minutes),
                'reason': best_reason
            }

        return None

    def get_prep_time_needed(self, event: CalendarEvent) -> int:
        """Estimate prep time needed for an event."""
        prep_time = 5

        if event.attendees:
            num_attendees = len(event.attendees)
            if num_attendees > 5:
                prep_time = 20
            elif num_attendees > 2:
                prep_time = 15
            else:
                prep_time = 10

        if event.location:
            location_lower = event.location.lower()
            if any(vc in location_lower for vc in ['zoom', 'meet', 'teams', 'webex']):
                prep_time = max(prep_time, 5)
            else:
                prep_time = max(prep_time, 20)

        title_lower = event.title.lower()
        high_importance_keywords = [
            'interview', 'presentation', 'review', 'important',
            'board', 'investor', 'client', 'demo', 'pitch',
            '1:1', 'one-on-one', 'performance'
        ]
        if any(word in title_lower for word in high_importance_keywords):
            prep_time = max(prep_time, 30)

        return prep_time

    def get_focus_time_available(self) -> Dict:
        """Calculate how much uninterrupted focus time is available."""
        events = self.get_events_today()
        now = datetime.now()

        next_event = None
        for event in events:
            if event.start > now:
                next_event = event
                break

        if next_event:
            next_block_minutes = int((next_event.start - now).total_seconds() / 60)
            next_meeting_in = next_block_minutes
        else:
            end_of_day = now.replace(hour=18, minute=0, second=0)
            if now < end_of_day:
                next_block_minutes = int((end_of_day - now).total_seconds() / 60)
            else:
                next_block_minutes = 0
            next_meeting_in = None

        total_free = 0
        free_slots = self.find_free_slots(duration_minutes=15, within_hours=8)
        for slot in free_slots:
            if 9 <= slot['start'].hour <= 18:
                total_free += slot['duration_minutes']

        return {
            'next_block_minutes': next_block_minutes,
            'total_today_minutes': total_free,
            'next_meeting_in': next_meeting_in,
            'has_deep_work_time': next_block_minutes >= 90
        }

    def get_calendar_context(self) -> Dict:
        """Get full calendar context for Chief of Staff intelligence."""
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

if __name__ == "__main__":
    import sys

    print("=" * 60)
    print("Chief of Staff Calendar Integration")
    print("=" * 60)

    cal = get_calendar_integration()

    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == "status":
            print(f"\nConnected: {cal.is_connected()}")
            if cal.is_connected():
                context = cal.get_calendar_context()
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

        elif command == "context":
            print("\nFull context:")
            context = cal.get_calendar_context()
            print(json.dumps(context, indent=2, default=str))

        elif command == "block":
            # Block 2 hours of focus time starting now
            start = datetime.now()
            end = start + timedelta(hours=2)
            result = cal.block_focus_time(start, end)
            if result:
                print("Focus time blocked successfully!")
            else:
                print("Failed to block focus time")

        else:
            print(f"Unknown command: {command}")
            print("Available: status, events, free, context, block")

    else:
        print("\nUsage: python calendar_integration.py <command>")
        print("\nCommands:")
        print("  status   - Check connection and basic status")
        print("  events   - List upcoming events")
        print("  free     - Find free time slots")
        print("  context  - Get full context (JSON)")
        print("  block    - Block 2 hours of focus time")
