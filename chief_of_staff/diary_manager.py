"""
Work Diary & AI Retrospective System
=====================================
Auto-generated work diary and weekly retrospectives for the Chief of Staff.

Features:
- Auto-capture daily accomplishments from calendar, tasks, and activity
- Editable diary entries with user notes
- Daily summary generation
- Weekly AI retrospectives with insights
- Performance review export

Based on UX_SPEC_PROACTIVE_AI.md specifications.

Created: 2026-02-01
Author: Implementation_Team_Claude
"""

import json
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field, asdict
from enum import Enum


# =============================================================================
# DATA CLASSES & ENUMS
# =============================================================================

class EntryType(Enum):
    """Types of diary entries."""
    TASK_COMPLETED = "task_completed"
    MEETING_ATTENDED = "meeting_attended"
    FOCUS_SESSION = "focus_session"
    CODE_REVIEW = "code_review"
    PRODUCTION_ISSUE = "production_issue"
    COMMUNICATION = "communication"
    MILESTONE = "milestone"
    USER_NOTE = "user_note"


class AccomplishmentCategory(Enum):
    """Categories for accomplishments."""
    SHIP = "ship"           # Shipped a feature/product
    TEAM = "team"           # Team/mentoring work
    FIX = "fix"             # Bug/issue fix
    PROCESS = "process"     # Process improvement
    PLANNING = "planning"   # Planning/strategy
    LEARNING = "learning"   # Learning/growth


@dataclass
class DiaryEntry:
    """Represents a single work diary entry."""
    id: str
    timestamp: datetime
    entry_type: EntryType
    title: str
    description: str
    duration_minutes: int = 0
    metrics: Dict[str, Any] = field(default_factory=dict)
    user_notes: str = ""
    is_significant: bool = False
    linked_items: List[str] = field(default_factory=list)

    def __post_init__(self):
        if self.metrics is None:
            self.metrics = {}
        if self.linked_items is None:
            self.linked_items = []

    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization."""
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat(),
            'entry_type': self.entry_type.value,
            'title': self.title,
            'description': self.description,
            'duration_minutes': self.duration_minutes,
            'metrics': self.metrics,
            'user_notes': self.user_notes,
            'is_significant': self.is_significant,
            'linked_items': self.linked_items
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'DiaryEntry':
        """Create from dictionary."""
        return cls(
            id=data['id'],
            timestamp=datetime.fromisoformat(data['timestamp']),
            entry_type=EntryType(data['entry_type']),
            title=data['title'],
            description=data['description'],
            duration_minutes=data.get('duration_minutes', 0),
            metrics=data.get('metrics', {}),
            user_notes=data.get('user_notes', ''),
            is_significant=data.get('is_significant', False),
            linked_items=data.get('linked_items', [])
        )


@dataclass
class DailySummary:
    """Daily summary of work."""
    date: datetime
    entries: List[DiaryEntry]
    tasks_completed: int
    meetings_attended: int
    focus_time_minutes: int
    highlights: List[str]
    ai_summary: str
    user_reflection: str = ""

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            'date': self.date.strftime('%Y-%m-%d'),
            'entries': [e.to_dict() for e in self.entries],
            'tasks_completed': self.tasks_completed,
            'meetings_attended': self.meetings_attended,
            'focus_time_minutes': self.focus_time_minutes,
            'highlights': self.highlights,
            'ai_summary': self.ai_summary,
            'user_reflection': self.user_reflection
        }


@dataclass
class WeeklyRetrospective:
    """Weekly AI-generated retrospective."""
    week_start: datetime
    week_end: datetime
    generated_at: datetime

    # Overview metrics
    total_tasks: int
    tasks_completed: int
    tasks_moved: int
    total_meetings: int
    focus_time_hours: float
    meeting_time_hours: float

    # Sections
    overview_summary: str
    wins: List[Dict[str, Any]]
    challenges: List[Dict[str, Any]]
    patterns: List[Dict[str, Any]]
    recommendations: List[str]

    # Trend data
    productivity_trend: str  # "up", "down", "stable"
    focus_trend: str
    completion_rate: float

    # AI confidence (based on weeks of data)
    confidence_level: str  # "low", "medium", "high"
    weeks_of_data: int

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            'week_start': self.week_start.strftime('%Y-%m-%d'),
            'week_end': self.week_end.strftime('%Y-%m-%d'),
            'generated_at': self.generated_at.isoformat(),
            'total_tasks': self.total_tasks,
            'tasks_completed': self.tasks_completed,
            'tasks_moved': self.tasks_moved,
            'total_meetings': self.total_meetings,
            'focus_time_hours': self.focus_time_hours,
            'meeting_time_hours': self.meeting_time_hours,
            'overview_summary': self.overview_summary,
            'wins': self.wins,
            'challenges': self.challenges,
            'patterns': self.patterns,
            'recommendations': self.recommendations,
            'productivity_trend': self.productivity_trend,
            'focus_trend': self.focus_trend,
            'completion_rate': self.completion_rate,
            'confidence_level': self.confidence_level,
            'weeks_of_data': self.weeks_of_data
        }


@dataclass
class Accomplishment:
    """A significant accomplishment for performance reviews."""
    id: str
    date: datetime
    category: AccomplishmentCategory
    title: str
    description: str
    impact: str
    evidence: List[str]  # Links to supporting data
    user_role: str = ""
    is_confirmed: bool = False

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            'id': self.id,
            'date': self.date.strftime('%Y-%m-%d'),
            'category': self.category.value,
            'title': self.title,
            'description': self.description,
            'impact': self.impact,
            'evidence': self.evidence,
            'user_role': self.user_role,
            'is_confirmed': self.is_confirmed
        }


# =============================================================================
# DIARY MANAGER CLASS
# =============================================================================

class DiaryManager:
    """
    Manages the personal work diary and retrospectives.

    Features:
    - Auto-capture from calendar, tasks, and activity
    - Daily summaries with AI-generated insights
    - Weekly retrospectives with pattern detection
    - Performance review export
    """

    DIARY_DIR = os.path.join(os.path.dirname(__file__), '.diary_data')

    def __init__(self, user_id: str = "default"):
        self.user_id = user_id
        self._entries: Dict[str, List[DiaryEntry]] = {}  # date -> entries
        self._accomplishments: List[Accomplishment] = []
        self._retrospectives: List[WeeklyRetrospective] = []
        self._ensure_data_dir()
        self._load_data()

    def _ensure_data_dir(self):
        """Ensure data directory exists."""
        if not os.path.exists(self.DIARY_DIR):
            os.makedirs(self.DIARY_DIR)

    def _get_data_file(self, data_type: str) -> str:
        """Get path to data file."""
        return os.path.join(self.DIARY_DIR, f"{self.user_id}_{data_type}.json")

    def _load_data(self):
        """Load persisted data."""
        # Load entries
        entries_file = self._get_data_file('entries')
        if os.path.exists(entries_file):
            try:
                with open(entries_file, 'r') as f:
                    data = json.load(f)
                    for date_str, entries in data.items():
                        self._entries[date_str] = [
                            DiaryEntry.from_dict(e) for e in entries
                        ]
            except Exception as e:
                print(f"[Diary] Error loading entries: {e}")

        # Load accomplishments
        acc_file = self._get_data_file('accomplishments')
        if os.path.exists(acc_file):
            try:
                with open(acc_file, 'r') as f:
                    data = json.load(f)
                    self._accomplishments = [
                        Accomplishment(
                            id=a['id'],
                            date=datetime.strptime(a['date'], '%Y-%m-%d'),
                            category=AccomplishmentCategory(a['category']),
                            title=a['title'],
                            description=a['description'],
                            impact=a['impact'],
                            evidence=a.get('evidence', []),
                            user_role=a.get('user_role', ''),
                            is_confirmed=a.get('is_confirmed', False)
                        )
                        for a in data
                    ]
            except Exception as e:
                print(f"[Diary] Error loading accomplishments: {e}")

    def _save_entries(self):
        """Save entries to disk."""
        entries_file = self._get_data_file('entries')
        data = {
            date: [e.to_dict() for e in entries]
            for date, entries in self._entries.items()
        }
        try:
            with open(entries_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"[Diary] Error saving entries: {e}")

    def _save_accomplishments(self):
        """Save accomplishments to disk."""
        acc_file = self._get_data_file('accomplishments')
        try:
            with open(acc_file, 'w') as f:
                json.dump([a.to_dict() for a in self._accomplishments], f, indent=2)
        except Exception as e:
            print(f"[Diary] Error saving accomplishments: {e}")

    def _generate_id(self) -> str:
        """Generate unique ID."""
        import uuid
        return str(uuid.uuid4())[:8]

    def _date_key(self, dt: datetime) -> str:
        """Get date key string."""
        return dt.strftime('%Y-%m-%d')

    # =========================================================================
    # AUTO-CAPTURE METHODS
    # =========================================================================

    def capture_from_calendar(self, calendar_events: List[Dict]) -> int:
        """
        Auto-capture diary entries from calendar events.

        Args:
            calendar_events: List of calendar event dictionaries

        Returns:
            Number of entries created
        """
        count = 0
        today = self._date_key(datetime.now())

        for event in calendar_events:
            # Skip future events
            event_time = datetime.fromisoformat(event.get('start', '').replace('Z', '+00:00'))
            if event_time > datetime.now(event_time.tzinfo if event_time.tzinfo else None):
                continue

            # Create meeting entry
            entry = DiaryEntry(
                id=self._generate_id(),
                timestamp=event_time.replace(tzinfo=None),
                entry_type=EntryType.MEETING_ATTENDED,
                title=f"Meeting: {event.get('title', 'Untitled')}",
                description=f"Attended meeting with {event.get('attendee_count', 0)} participants",
                duration_minutes=event.get('duration_minutes', 30),
                metrics={
                    'attendees': event.get('attendee_count', 0),
                    'location': event.get('location', 'Virtual')
                }
            )

            date_key = self._date_key(event_time.replace(tzinfo=None))
            if date_key not in self._entries:
                self._entries[date_key] = []

            # Avoid duplicates
            existing_ids = {e.id for e in self._entries[date_key]}
            if entry.id not in existing_ids:
                self._entries[date_key].append(entry)
                count += 1

        if count > 0:
            self._save_entries()

        return count

    def capture_task_completion(self, task: Dict) -> DiaryEntry:
        """
        Capture a completed task.

        Args:
            task: Task dictionary with title, description, time_spent, etc.

        Returns:
            Created diary entry
        """
        entry = DiaryEntry(
            id=self._generate_id(),
            timestamp=datetime.now(),
            entry_type=EntryType.TASK_COMPLETED,
            title=f"Completed: {task.get('title', 'Task')}",
            description=task.get('description', ''),
            duration_minutes=task.get('time_spent_minutes', 0),
            metrics={
                'estimated_minutes': task.get('estimated_minutes', 0),
                'priority': task.get('priority', 'normal'),
                'project': task.get('project', '')
            },
            is_significant=task.get('is_milestone', False),
            linked_items=task.get('linked_items', [])
        )

        date_key = self._date_key(datetime.now())
        if date_key not in self._entries:
            self._entries[date_key] = []
        self._entries[date_key].append(entry)
        self._save_entries()

        return entry

    def capture_focus_session(self, title: str, duration_minutes: int,
                              files_touched: int = 0) -> DiaryEntry:
        """
        Capture a focus/deep work session.

        Args:
            title: What was worked on
            duration_minutes: Session duration
            files_touched: Number of files modified

        Returns:
            Created diary entry
        """
        entry = DiaryEntry(
            id=self._generate_id(),
            timestamp=datetime.now(),
            entry_type=EntryType.FOCUS_SESSION,
            title=f"Focus: {title}",
            description=f"Deep work session: {duration_minutes} minutes",
            duration_minutes=duration_minutes,
            metrics={
                'files_touched': files_touched
            },
            is_significant=duration_minutes >= 120  # 2+ hours is significant
        )

        date_key = self._date_key(datetime.now())
        if date_key not in self._entries:
            self._entries[date_key] = []
        self._entries[date_key].append(entry)
        self._save_entries()

        return entry

    def add_user_note(self, note: str, mark_significant: bool = False) -> DiaryEntry:
        """
        Add a manual user note to the diary.

        Args:
            note: The note content
            mark_significant: Whether to flag as significant

        Returns:
            Created diary entry
        """
        entry = DiaryEntry(
            id=self._generate_id(),
            timestamp=datetime.now(),
            entry_type=EntryType.USER_NOTE,
            title="Personal Note",
            description=note,
            is_significant=mark_significant
        )

        date_key = self._date_key(datetime.now())
        if date_key not in self._entries:
            self._entries[date_key] = []
        self._entries[date_key].append(entry)
        self._save_entries()

        return entry

    def update_entry_notes(self, entry_id: str, notes: str) -> bool:
        """
        Update user notes on an existing entry.

        Args:
            entry_id: Entry ID to update
            notes: New notes content

        Returns:
            True if updated successfully
        """
        for date_key, entries in self._entries.items():
            for entry in entries:
                if entry.id == entry_id:
                    entry.user_notes = notes
                    self._save_entries()
                    return True
        return False

    def mark_as_significant(self, entry_id: str) -> bool:
        """Mark an entry as significant for accomplishments."""
        for date_key, entries in self._entries.items():
            for entry in entries:
                if entry.id == entry_id:
                    entry.is_significant = True
                    self._save_entries()
                    return True
        return False

    # =========================================================================
    # DAILY SUMMARY
    # =========================================================================

    def get_daily_entries(self, date: datetime = None) -> List[DiaryEntry]:
        """Get all entries for a specific date."""
        if date is None:
            date = datetime.now()
        date_key = self._date_key(date)
        return self._entries.get(date_key, [])

    def generate_daily_summary(self, date: datetime = None) -> DailySummary:
        """
        Generate a daily summary with AI insights.

        Args:
            date: Date to summarize (default: today)

        Returns:
            DailySummary object
        """
        if date is None:
            date = datetime.now()

        entries = self.get_daily_entries(date)

        # Calculate metrics
        tasks_completed = sum(1 for e in entries if e.entry_type == EntryType.TASK_COMPLETED)
        meetings_attended = sum(1 for e in entries if e.entry_type == EntryType.MEETING_ATTENDED)
        focus_time = sum(
            e.duration_minutes for e in entries
            if e.entry_type == EntryType.FOCUS_SESSION
        )

        # Extract highlights (significant entries)
        highlights = [
            e.title for e in entries if e.is_significant
        ]

        # If no highlights, pick top entries
        if not highlights and entries:
            highlights = [entries[0].title]
            if len(entries) > 1:
                highlights.append(entries[-1].title)

        # Generate AI summary
        ai_summary = self._generate_daily_ai_summary(
            date, entries, tasks_completed, meetings_attended, focus_time
        )

        return DailySummary(
            date=date,
            entries=entries,
            tasks_completed=tasks_completed,
            meetings_attended=meetings_attended,
            focus_time_minutes=focus_time,
            highlights=highlights,
            ai_summary=ai_summary
        )

    def _generate_daily_ai_summary(self, date: datetime, entries: List[DiaryEntry],
                                   tasks: int, meetings: int, focus_minutes: int) -> str:
        """Generate AI summary for the day."""
        if not entries:
            return "No activity recorded for this day."

        focus_hours = focus_minutes / 60

        # Build summary based on activity
        parts = []

        if tasks > 0:
            parts.append(f"Completed {tasks} task{'s' if tasks != 1 else ''}")

        if meetings > 0:
            parts.append(f"attended {meetings} meeting{'s' if meetings != 1 else ''}")

        if focus_hours > 0:
            parts.append(f"logged {focus_hours:.1f} hours of focus time")

        summary = ", ".join(parts).capitalize() + "."

        # Add productivity assessment
        if focus_hours >= 4:
            summary += " Highly productive day with excellent focus time."
        elif focus_hours >= 2:
            summary += " Good balance of meetings and focused work."
        elif meetings > 4:
            summary += " Meeting-heavy day with limited deep work time."

        # Add highlights
        significant = [e for e in entries if e.is_significant]
        if significant:
            summary += f" Key highlight: {significant[0].title}."

        return summary

    # =========================================================================
    # WEEKLY RETROSPECTIVE
    # =========================================================================

    def get_week_entries(self, week_start: datetime = None) -> List[DiaryEntry]:
        """Get all entries for a week starting from week_start."""
        if week_start is None:
            # Default to start of current week (Monday)
            today = datetime.now()
            week_start = today - timedelta(days=today.weekday())

        week_end = week_start + timedelta(days=6)
        entries = []

        current = week_start
        while current <= week_end:
            entries.extend(self.get_daily_entries(current))
            current += timedelta(days=1)

        return entries

    def generate_weekly_retrospective(self, week_start: datetime = None) -> WeeklyRetrospective:
        """
        Generate weekly AI retrospective.

        Auto-generated every Sunday (or on demand).
        Includes: Overview, Wins, Challenges, Patterns, Recommendations.

        Args:
            week_start: Start of week (default: current week's Monday)

        Returns:
            WeeklyRetrospective object
        """
        if week_start is None:
            today = datetime.now()
            week_start = today - timedelta(days=today.weekday())

        week_end = week_start + timedelta(days=6)
        entries = self.get_week_entries(week_start)

        # Calculate metrics
        total_tasks = sum(1 for e in entries if e.entry_type == EntryType.TASK_COMPLETED)
        total_meetings = sum(1 for e in entries if e.entry_type == EntryType.MEETING_ATTENDED)
        focus_minutes = sum(
            e.duration_minutes for e in entries
            if e.entry_type == EntryType.FOCUS_SESSION
        )
        meeting_minutes = sum(
            e.duration_minutes for e in entries
            if e.entry_type == EntryType.MEETING_ATTENDED
        )

        # Detect wins (significant entries and milestones)
        wins = self._detect_wins(entries)

        # Detect challenges
        challenges = self._detect_challenges(entries)

        # Detect patterns
        patterns = self._detect_patterns(entries)

        # Generate recommendations
        recommendations = self._generate_recommendations(
            total_tasks, total_meetings, focus_minutes, meeting_minutes, patterns
        )

        # Calculate trends
        weeks_of_data = self._count_weeks_of_data()
        productivity_trend, focus_trend = self._calculate_trends(week_start)

        # Calculate completion rate
        completion_rate = (total_tasks / max(total_tasks + 5, 1)) * 100  # Estimate

        # Determine confidence level
        if weeks_of_data >= 8:
            confidence = "high"
        elif weeks_of_data >= 4:
            confidence = "medium"
        else:
            confidence = "low"

        # Generate overview
        overview = self._generate_overview_summary(
            total_tasks, total_meetings, focus_minutes / 60, meeting_minutes / 60
        )

        retro = WeeklyRetrospective(
            week_start=week_start,
            week_end=week_end,
            generated_at=datetime.now(),
            total_tasks=total_tasks,
            tasks_completed=total_tasks,
            tasks_moved=0,  # Would need task system integration
            total_meetings=total_meetings,
            focus_time_hours=focus_minutes / 60,
            meeting_time_hours=meeting_minutes / 60,
            overview_summary=overview,
            wins=wins,
            challenges=challenges,
            patterns=patterns,
            recommendations=recommendations,
            productivity_trend=productivity_trend,
            focus_trend=focus_trend,
            completion_rate=completion_rate,
            confidence_level=confidence,
            weeks_of_data=weeks_of_data
        )

        self._retrospectives.append(retro)
        return retro

    def _detect_wins(self, entries: List[DiaryEntry]) -> List[Dict[str, Any]]:
        """Detect wins and accomplishments from entries."""
        wins = []

        # Significant entries are wins
        for entry in entries:
            if entry.is_significant:
                wins.append({
                    'title': entry.title,
                    'date': entry.timestamp.strftime('%Y-%m-%d'),
                    'type': entry.entry_type.value,
                    'description': entry.description,
                    'metrics': entry.metrics
                })

        # High-duration focus sessions are wins
        long_focus = [
            e for e in entries
            if e.entry_type == EntryType.FOCUS_SESSION and e.duration_minutes >= 120
        ]
        for entry in long_focus:
            if entry.id not in [w.get('id') for w in wins]:
                wins.append({
                    'title': f"Deep work: {entry.title}",
                    'date': entry.timestamp.strftime('%Y-%m-%d'),
                    'type': 'focus_session',
                    'description': f"Extended focus session of {entry.duration_minutes} minutes"
                })

        return wins[:5]  # Top 5 wins

    def _detect_challenges(self, entries: List[DiaryEntry]) -> List[Dict[str, Any]]:
        """Detect challenges from the week."""
        challenges = []

        # Days with many meetings but little focus time
        by_day = {}
        for entry in entries:
            day = entry.timestamp.strftime('%Y-%m-%d')
            if day not in by_day:
                by_day[day] = {'meetings': 0, 'focus': 0}
            if entry.entry_type == EntryType.MEETING_ATTENDED:
                by_day[day]['meetings'] += 1
            elif entry.entry_type == EntryType.FOCUS_SESSION:
                by_day[day]['focus'] += entry.duration_minutes

        for day, stats in by_day.items():
            if stats['meetings'] >= 4 and stats['focus'] < 60:
                challenges.append({
                    'title': 'Meeting overload',
                    'date': day,
                    'description': f"{stats['meetings']} meetings with only {stats['focus']} min focus time",
                    'suggestion': 'Consider blocking focus time on high-meeting days'
                })

        return challenges[:3]  # Top 3 challenges

    def _detect_patterns(self, entries: List[DiaryEntry]) -> List[Dict[str, Any]]:
        """Detect patterns in work behavior."""
        patterns = []

        # Focus time by day of week
        focus_by_day = {}
        for entry in entries:
            if entry.entry_type == EntryType.FOCUS_SESSION:
                day = entry.timestamp.strftime('%A')
                if day not in focus_by_day:
                    focus_by_day[day] = 0
                focus_by_day[day] += entry.duration_minutes

        if focus_by_day:
            best_day = max(focus_by_day, key=focus_by_day.get)
            patterns.append({
                'title': 'Best focus day',
                'description': f'{best_day} is your most productive day for deep work',
                'data': focus_by_day
            })

        # Meeting patterns
        meetings_by_day = {}
        for entry in entries:
            if entry.entry_type == EntryType.MEETING_ATTENDED:
                day = entry.timestamp.strftime('%A')
                if day not in meetings_by_day:
                    meetings_by_day[day] = 0
                meetings_by_day[day] += 1

        if meetings_by_day:
            heavy_day = max(meetings_by_day, key=meetings_by_day.get)
            patterns.append({
                'title': 'Meeting-heavy day',
                'description': f'{heavy_day} tends to have the most meetings',
                'data': meetings_by_day
            })

        return patterns

    def _generate_recommendations(self, tasks: int, meetings: int,
                                   focus_minutes: int, meeting_minutes: int,
                                   patterns: List[Dict]) -> List[str]:
        """Generate actionable recommendations."""
        recommendations = []

        focus_hours = focus_minutes / 60
        meeting_hours = meeting_minutes / 60

        if meeting_hours > focus_hours:
            recommendations.append(
                "Consider blocking more focus time - meetings currently outweigh deep work"
            )

        if meetings > 15:
            recommendations.append(
                "High meeting load this week. Consider declining or shortening some meetings"
            )

        if focus_hours < 10:
            recommendations.append(
                "Focus time is below 10 hours. Try blocking 2-hour focus blocks in the morning"
            )

        if not recommendations:
            recommendations.append(
                "Good week! Maintain your current balance of meetings and focus time"
            )

        return recommendations

    def _count_weeks_of_data(self) -> int:
        """Count how many weeks of data we have."""
        if not self._entries:
            return 0

        dates = [datetime.strptime(d, '%Y-%m-%d') for d in self._entries.keys()]
        if not dates:
            return 0

        min_date = min(dates)
        max_date = max(dates)
        weeks = (max_date - min_date).days // 7 + 1
        return weeks

    def _calculate_trends(self, week_start: datetime) -> tuple:
        """Calculate productivity and focus trends."""
        # Would compare to previous weeks - simplified for now
        return ("stable", "stable")

    def _generate_overview_summary(self, tasks: int, meetings: int,
                                   focus_hours: float, meeting_hours: float) -> str:
        """Generate overview summary text."""
        return (
            f"This week you completed {tasks} tasks, attended {meetings} meetings, "
            f"and logged {focus_hours:.1f} hours of focus time. "
            f"Meeting time: {meeting_hours:.1f} hours ({meeting_hours / 40 * 100:.0f}% of work week)."
        )

    # =========================================================================
    # ACCOMPLISHMENT TRACKING
    # =========================================================================

    def add_accomplishment(self, title: str, description: str,
                          category: AccomplishmentCategory, impact: str,
                          evidence: List[str] = None, user_role: str = "") -> Accomplishment:
        """
        Add a significant accomplishment.

        Args:
            title: Accomplishment title
            description: Detailed description
            category: Category (ship, team, fix, etc.)
            impact: Business impact description
            evidence: Links to supporting evidence
            user_role: User's role in the accomplishment

        Returns:
            Created Accomplishment object
        """
        acc = Accomplishment(
            id=self._generate_id(),
            date=datetime.now(),
            category=category,
            title=title,
            description=description,
            impact=impact,
            evidence=evidence or [],
            user_role=user_role,
            is_confirmed=True
        )

        self._accomplishments.append(acc)
        self._save_accomplishments()

        return acc

    def get_accomplishments(self, start_date: datetime = None,
                           end_date: datetime = None,
                           category: AccomplishmentCategory = None) -> List[Accomplishment]:
        """Get accomplishments, optionally filtered."""
        results = self._accomplishments

        if start_date:
            results = [a for a in results if a.date >= start_date]
        if end_date:
            results = [a for a in results if a.date <= end_date]
        if category:
            results = [a for a in results if a.category == category]

        return sorted(results, key=lambda a: a.date, reverse=True)

    def confirm_accomplishment(self, acc_id: str) -> bool:
        """Confirm an AI-detected accomplishment."""
        for acc in self._accomplishments:
            if acc.id == acc_id:
                acc.is_confirmed = True
                self._save_accomplishments()
                return True
        return False

    def remove_accomplishment(self, acc_id: str) -> bool:
        """Remove an accomplishment from the list."""
        for i, acc in enumerate(self._accomplishments):
            if acc.id == acc_id:
                self._accomplishments.pop(i)
                self._save_accomplishments()
                return True
        return False

    # =========================================================================
    # PERFORMANCE REVIEW EXPORT
    # =========================================================================

    def export_for_review(self, start_date: datetime, end_date: datetime,
                         format: str = "text") -> str:
        """
        Export accomplishments for performance review.

        Args:
            start_date: Start of review period
            end_date: End of review period
            format: "text", "markdown", or "pdf"

        Returns:
            Formatted export string
        """
        accomplishments = self.get_accomplishments(start_date, end_date)

        # Get retrospectives for the period
        retros = [
            r for r in self._retrospectives
            if start_date <= r.week_start <= end_date
        ]

        # Calculate overall metrics
        total_focus_hours = sum(r.focus_time_hours for r in retros)
        total_tasks = sum(r.tasks_completed for r in retros)
        total_meetings = sum(r.total_meetings for r in retros)

        if format == "markdown":
            return self._export_markdown(
                accomplishments, retros, start_date, end_date,
                total_focus_hours, total_tasks, total_meetings
            )
        elif format == "pdf":
            # Would integrate with PDF library
            return self._export_markdown(
                accomplishments, retros, start_date, end_date,
                total_focus_hours, total_tasks, total_meetings
            )
        else:
            return self._export_text(
                accomplishments, retros, start_date, end_date,
                total_focus_hours, total_tasks, total_meetings
            )

    def _export_text(self, accomplishments: List[Accomplishment],
                     retros: List[WeeklyRetrospective],
                     start_date: datetime, end_date: datetime,
                     focus_hours: float, tasks: int, meetings: int) -> str:
        """Export as plain text."""
        lines = []
        lines.append("=" * 60)
        lines.append("PERFORMANCE REVIEW - ACCOMPLISHMENTS SUMMARY")
        lines.append(f"Period: {start_date.strftime('%B %d, %Y')} - {end_date.strftime('%B %d, %Y')}")
        lines.append("=" * 60)

        lines.append("\nOVERVIEW:")
        lines.append(f"  Tasks Completed: {tasks}")
        lines.append(f"  Focus Time: {focus_hours:.1f} hours")
        lines.append(f"  Meetings Attended: {meetings}")

        lines.append("\n" + "-" * 60)
        lines.append("MAJOR ACCOMPLISHMENTS:")
        lines.append("-" * 60)

        for acc in accomplishments:
            lines.append(f"\n[{acc.category.value.upper()}] {acc.title}")
            lines.append(f"  Date: {acc.date.strftime('%B %d, %Y')}")
            lines.append(f"  {acc.description}")
            lines.append(f"  Impact: {acc.impact}")
            if acc.user_role:
                lines.append(f"  My Role: {acc.user_role}")

        if not accomplishments:
            lines.append("\n  No accomplishments recorded for this period.")

        lines.append("\n" + "-" * 60)
        lines.append("SKILLS DEMONSTRATED:")
        lines.append("-" * 60)

        # Count by category
        by_category = {}
        for acc in accomplishments:
            cat = acc.category.value
            by_category[cat] = by_category.get(cat, 0) + 1

        for cat, count in sorted(by_category.items(), key=lambda x: -x[1]):
            bar = "=" * min(count * 3, 30)
            lines.append(f"  {cat.capitalize()}: [{bar}] ({count})")

        lines.append("\n" + "=" * 60)
        lines.append("Generated by Chief of Staff AI")
        lines.append(f"Export Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        lines.append("=" * 60)

        return "\n".join(lines)

    def _export_markdown(self, accomplishments: List[Accomplishment],
                         retros: List[WeeklyRetrospective],
                         start_date: datetime, end_date: datetime,
                         focus_hours: float, tasks: int, meetings: int) -> str:
        """Export as Markdown."""
        lines = []
        lines.append("# Performance Review - Accomplishments Summary")
        lines.append(f"**Period:** {start_date.strftime('%B %d, %Y')} - {end_date.strftime('%B %d, %Y')}")
        lines.append("")

        lines.append("## Overview")
        lines.append(f"- **Tasks Completed:** {tasks}")
        lines.append(f"- **Focus Time:** {focus_hours:.1f} hours")
        lines.append(f"- **Meetings Attended:** {meetings}")
        lines.append("")

        lines.append("## Major Accomplishments")
        lines.append("")

        for acc in accomplishments:
            lines.append(f"### [{acc.category.value.upper()}] {acc.title}")
            lines.append(f"*{acc.date.strftime('%B %d, %Y')}*")
            lines.append("")
            lines.append(acc.description)
            lines.append("")
            lines.append(f"**Impact:** {acc.impact}")
            if acc.user_role:
                lines.append(f"**My Role:** {acc.user_role}")
            lines.append("")

        if not accomplishments:
            lines.append("*No accomplishments recorded for this period.*")

        lines.append("## Skills Demonstrated")
        lines.append("")

        by_category = {}
        for acc in accomplishments:
            cat = acc.category.value
            by_category[cat] = by_category.get(cat, 0) + 1

        for cat, count in sorted(by_category.items(), key=lambda x: -x[1]):
            lines.append(f"- **{cat.capitalize()}:** {count} accomplishments")

        lines.append("")
        lines.append("---")
        lines.append(f"*Generated by Chief of Staff AI on {datetime.now().strftime('%Y-%m-%d')}*")

        return "\n".join(lines)

    # =========================================================================
    # DIARY UI DATA
    # =========================================================================

    def get_diary_view(self, date: datetime = None) -> Dict:
        """
        Get diary data formatted for UI display.

        Returns data matching the UX spec Work Diary UI design.
        """
        if date is None:
            date = datetime.now()

        entries = self.get_daily_entries(date)
        summary = self.generate_daily_summary(date)

        # Format entries for timeline view
        timeline = []
        for entry in sorted(entries, key=lambda e: e.timestamp):
            timeline.append({
                'id': entry.id,
                'time': entry.timestamp.strftime('%I:%M %p'),
                'title': entry.title,
                'description': entry.description,
                'type': entry.entry_type.value,
                'duration': f"{entry.duration_minutes}m" if entry.duration_minutes else None,
                'metrics': entry.metrics,
                'user_notes': entry.user_notes,
                'is_significant': entry.is_significant,
                'actions': ['add_reflection', 'add_notes', 'mark_significant']
            })

        return {
            'date': date.strftime('%A, %B %d, %Y'),
            'date_iso': date.strftime('%Y-%m-%d'),
            'timeline': timeline,
            'summary': {
                'tasks_completed': summary.tasks_completed,
                'meetings_attended': summary.meetings_attended,
                'focus_time': f"{summary.focus_time_minutes // 60}h {summary.focus_time_minutes % 60}m",
                'highlights': summary.highlights,
                'ai_summary': summary.ai_summary,
                'user_reflection': summary.user_reflection
            },
            'navigation': {
                'previous': (date - timedelta(days=1)).strftime('%Y-%m-%d'),
                'next': (date + timedelta(days=1)).strftime('%Y-%m-%d'),
                'today': datetime.now().strftime('%Y-%m-%d')
            }
        }

    def get_retrospective_view(self, week_start: datetime = None) -> Dict:
        """
        Get retrospective data formatted for UI display.

        Returns data matching the UX spec Weekly Retrospective UI design.
        """
        retro = self.generate_weekly_retrospective(week_start)

        return {
            'week': f"{retro.week_start.strftime('%B %d')} - {retro.week_end.strftime('%B %d, %Y')}",
            'generated_at': retro.generated_at.strftime('%Y-%m-%d %H:%M'),
            'tabs': {
                'overview': {
                    'metrics': {
                        'tasks': retro.total_tasks,
                        'completed': retro.tasks_completed,
                        'moved': retro.tasks_moved,
                        'meetings': retro.total_meetings
                    },
                    'focus_time': {
                        'hours': retro.focus_time_hours,
                        'goal': 15,  # Would be configurable
                        'percentage': (retro.focus_time_hours / 15) * 100
                    },
                    'meeting_load': {
                        'hours': retro.meeting_time_hours,
                        'percentage': (retro.meeting_time_hours / 40) * 100
                    },
                    'summary': retro.overview_summary
                },
                'wins': retro.wins,
                'challenges': retro.challenges,
                'patterns': retro.patterns,
                'recommendations': retro.recommendations
            },
            'trends': {
                'productivity': retro.productivity_trend,
                'focus': retro.focus_trend,
                'completion_rate': retro.completion_rate
            },
            'confidence': {
                'level': retro.confidence_level,
                'weeks_of_data': retro.weeks_of_data
            },
            'export_options': ['pdf', 'markdown', 'performance_review']
        }


# =============================================================================
# GLOBAL INSTANCE
# =============================================================================

_diary_manager: Optional[DiaryManager] = None


def get_diary_manager(user_id: str = "default") -> DiaryManager:
    """Get or create global diary manager instance."""
    global _diary_manager
    if _diary_manager is None or _diary_manager.user_id != user_id:
        _diary_manager = DiaryManager(user_id)
    return _diary_manager


# =============================================================================
# CLI INTERFACE
# =============================================================================

if __name__ == "__main__":
    import sys

    print("=" * 60)
    print("WORK DIARY & RETROSPECTIVE SYSTEM")
    print("=" * 60)

    diary = get_diary_manager()

    if len(sys.argv) < 2:
        print("\nUsage: python diary_manager.py <command>")
        print("\nCommands:")
        print("  today          - Show today's diary")
        print("  week           - Show this week's retrospective")
        print("  add <note>     - Add a user note")
        print("  focus <title> <mins>  - Log focus session")
        print("  accomplishment - Add an accomplishment")
        print("  export <days>  - Export for review")
        sys.exit(0)

    command = sys.argv[1]

    if command == "today":
        view = diary.get_diary_view()
        print(f"\n{view['date']}")
        print("-" * 40)

        if view['timeline']:
            for item in view['timeline']:
                print(f"\n{item['time']} - {item['title']}")
                if item['duration']:
                    print(f"  Duration: {item['duration']}")
                if item['user_notes']:
                    print(f"  Notes: {item['user_notes']}")
        else:
            print("\nNo entries yet today.")

        print(f"\nSummary: {view['summary']['ai_summary']}")

    elif command == "week":
        view = diary.get_retrospective_view()
        print(f"\nWeekly Retrospective: {view['week']}")
        print("-" * 40)

        overview = view['tabs']['overview']
        print(f"\nMetrics:")
        print(f"  Tasks: {overview['metrics']['tasks']}")
        print(f"  Meetings: {overview['metrics']['meetings']}")
        print(f"  Focus: {overview['focus_time']['hours']:.1f}h")

        print(f"\nWins:")
        for win in view['tabs']['wins']:
            print(f"  - {win['title']}")

        print(f"\nRecommendations:")
        for rec in view['tabs']['recommendations']:
            print(f"  - {rec}")

    elif command == "add":
        if len(sys.argv) < 3:
            print("Usage: python diary_manager.py add '<note>'")
            sys.exit(1)
        note = ' '.join(sys.argv[2:])
        entry = diary.add_user_note(note)
        print(f"Added note: {entry.title}")

    elif command == "focus":
        if len(sys.argv) < 4:
            print("Usage: python diary_manager.py focus '<title>' <minutes>")
            sys.exit(1)
        title = sys.argv[2]
        minutes = int(sys.argv[3])
        entry = diary.capture_focus_session(title, minutes)
        print(f"Logged focus session: {entry.title} ({minutes} min)")

    elif command == "accomplishment":
        title = input("Title: ")
        description = input("Description: ")
        impact = input("Impact: ")
        category = input("Category (ship/team/fix/process): ")

        acc = diary.add_accomplishment(
            title=title,
            description=description,
            category=AccomplishmentCategory(category),
            impact=impact
        )
        print(f"\nAdded accomplishment: {acc.title}")

    elif command == "export":
        days = int(sys.argv[2]) if len(sys.argv) > 2 else 90
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        export = diary.export_for_review(start_date, end_date, format="text")
        print(export)

    else:
        print(f"Unknown command: {command}")
