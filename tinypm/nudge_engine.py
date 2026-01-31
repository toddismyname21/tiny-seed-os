#!/usr/bin/env python3
"""
TinyPM Nudge Engine - Intelligent Proactive Suggestions
═══════════════════════════════════════════════════════════════════════════════

The brain behind TinyPM's proactive nudges. Analyzes patterns, detects
opportunities, and generates smart suggestions to help users stay organized.

Components:
- ContactFrequencyAnalyzer: Track relationships and suggest when to reach out
- ImportantDateDetector: Remember birthdays, anniversaries, and milestones
- GoalTracker: Monitor goal progress and generate accountability nudges

Nudge Types:
- Urgent Email: Emails needing immediate attention
- Event Reminder: Upcoming calendar events
- Contact Reminder: People you haven't talked to in a while
- Birthday/Anniversary: Important dates coming up
- Goal Progress: Track and motivate goal completion
- Morning Brief: Daily summary nudge

Created: 2026-01-30
Author: Team 5 Builder (Claude)
"""

import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field, asdict
from enum import Enum

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

APP_DIR = Path(__file__).parent
NOTIFICATIONS_FILE = APP_DIR / ".notifications.json"
CONTACTS_FILE = APP_DIR / ".contacts.json"
GOALS_FILE = APP_DIR / ".goals.json"
IMPORTANT_DATES_FILE = APP_DIR / ".important_dates.json"
NUDGE_HISTORY_FILE = APP_DIR / ".nudge_history.json"
USER_SETTINGS_FILE = APP_DIR / ".user_settings.json"

# Default contact cadence (days)
DEFAULT_CONTACT_CADENCE = {
    "close_friend": 7,      # Weekly
    "friend": 14,           # Bi-weekly
    "colleague": 30,        # Monthly
    "acquaintance": 90,     # Quarterly
    "family": 7,            # Weekly
    "mentor": 30,           # Monthly
    "client": 14,           # Bi-weekly
    "default": 30           # Monthly
}

# Max nudges per day
MAX_NUDGES_PER_DAY = 5

# ═══════════════════════════════════════════════════════════════════════════════
# NUDGE DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

class NudgeType(str, Enum):
    """Types of nudges the system can generate."""
    URGENT_EMAIL = "urgent_email"
    EVENT_REMINDER = "event_reminder"
    PREP_TIME = "prep_time"
    CONTACT_REMINDER = "contact_reminder"
    BIRTHDAY = "birthday"
    ANNIVERSARY = "anniversary"
    GOAL_PROGRESS = "goal_progress"
    GOAL_DEADLINE = "goal_deadline"
    MORNING_BRIEF = "morning_brief"
    TASK_REMINDER = "task_reminder"
    CUSTOM = "custom"


class NudgePriority(str, Enum):
    """Priority levels for nudges."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


@dataclass
class Nudge:
    """Represents a proactive nudge/suggestion."""
    id: str
    type: NudgeType
    title: str
    message: str
    priority: NudgePriority
    created_at: datetime
    expires_at: Optional[datetime] = None
    action_url: Optional[str] = None
    action_label: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    read: bool = False
    dismissed: bool = False
    helpful: Optional[bool] = None  # User feedback
    dismissed_at: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "type": self.type.value if isinstance(self.type, NudgeType) else self.type,
            "title": self.title,
            "message": self.message,
            "priority": self.priority.value if isinstance(self.priority, NudgePriority) else self.priority,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "action_url": self.action_url,
            "action_label": self.action_label,
            "metadata": self.metadata,
            "read": self.read,
            "dismissed": self.dismissed,
            "helpful": self.helpful,
            "dismissed_at": self.dismissed_at.isoformat() if self.dismissed_at else None
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Nudge":
        """Create from dictionary."""
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            type=NudgeType(data["type"]) if data.get("type") in [e.value for e in NudgeType] else NudgeType.CUSTOM,
            title=data.get("title", ""),
            message=data.get("message", ""),
            priority=NudgePriority(data.get("priority", "medium")),
            created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else datetime.now(),
            expires_at=datetime.fromisoformat(data["expires_at"]) if data.get("expires_at") else None,
            action_url=data.get("action_url"),
            action_label=data.get("action_label"),
            metadata=data.get("metadata", {}),
            read=data.get("read", False),
            dismissed=data.get("dismissed", False),
            helpful=data.get("helpful"),
            dismissed_at=datetime.fromisoformat(data["dismissed_at"]) if data.get("dismissed_at") else None
        )


@dataclass
class Contact:
    """Represents a contact for relationship tracking."""
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    relationship_type: str = "default"  # close_friend, friend, colleague, etc.
    last_contact: Optional[datetime] = None
    contact_cadence_days: Optional[int] = None  # Override default cadence
    birthday: Optional[str] = None  # MM-DD format
    notes: str = ""
    active: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "relationship_type": self.relationship_type,
            "last_contact": self.last_contact.isoformat() if self.last_contact else None,
            "contact_cadence_days": self.contact_cadence_days,
            "birthday": self.birthday,
            "notes": self.notes,
            "active": self.active
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Contact":
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            name=data.get("name", ""),
            email=data.get("email"),
            phone=data.get("phone"),
            relationship_type=data.get("relationship_type", "default"),
            last_contact=datetime.fromisoformat(data["last_contact"]) if data.get("last_contact") else None,
            contact_cadence_days=data.get("contact_cadence_days"),
            birthday=data.get("birthday"),
            notes=data.get("notes", ""),
            active=data.get("active", True)
        )


@dataclass
class Goal:
    """Represents a user goal for tracking."""
    id: str
    title: str
    description: str = ""
    target_date: Optional[datetime] = None
    progress: int = 0  # 0-100
    milestones: List[Dict[str, Any]] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    status: str = "active"  # active, completed, abandoned
    category: str = "general"  # work, health, personal, learning, etc.

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "target_date": self.target_date.isoformat() if self.target_date else None,
            "progress": self.progress,
            "milestones": self.milestones,
            "created_at": self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
            "status": self.status,
            "category": self.category
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Goal":
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            title=data.get("title", ""),
            description=data.get("description", ""),
            target_date=datetime.fromisoformat(data["target_date"]) if data.get("target_date") else None,
            progress=data.get("progress", 0),
            milestones=data.get("milestones", []),
            created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else datetime.now(),
            status=data.get("status", "active"),
            category=data.get("category", "general")
        )


@dataclass
class ImportantDate:
    """Represents an important date to remember."""
    id: str
    title: str
    date: str  # MM-DD format for recurring, or YYYY-MM-DD for one-time
    recurring: bool = True
    reminder_days_before: List[int] = field(default_factory=lambda: [3, 1])
    category: str = "personal"  # birthday, anniversary, holiday, custom
    contact_id: Optional[str] = None  # Link to a contact if applicable
    notes: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "date": self.date,
            "recurring": self.recurring,
            "reminder_days_before": self.reminder_days_before,
            "category": self.category,
            "contact_id": self.contact_id,
            "notes": self.notes
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ImportantDate":
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            title=data.get("title", ""),
            date=data.get("date", ""),
            recurring=data.get("recurring", True),
            reminder_days_before=data.get("reminder_days_before", [3, 1]),
            category=data.get("category", "personal"),
            contact_id=data.get("contact_id"),
            notes=data.get("notes", "")
        )


# ═══════════════════════════════════════════════════════════════════════════════
# DATA STORAGE
# ═══════════════════════════════════════════════════════════════════════════════

def load_notifications() -> List[Nudge]:
    """Load nudges from disk."""
    if NOTIFICATIONS_FILE.exists():
        try:
            data = json.loads(NOTIFICATIONS_FILE.read_text())
            return [Nudge.from_dict(n) for n in data.get("nudges", [])]
        except Exception as e:
            print(f"[NudgeEngine] Error loading notifications: {e}")
    return []


def save_notifications(nudges: List[Nudge]) -> None:
    """Save nudges to disk."""
    try:
        data = {
            "updated_at": datetime.now().isoformat(),
            "nudges": [n.to_dict() for n in nudges]
        }
        NOTIFICATIONS_FILE.write_text(json.dumps(data, indent=2))
    except Exception as e:
        print(f"[NudgeEngine] Error saving notifications: {e}")


def load_contacts() -> List[Contact]:
    """Load contacts from disk."""
    if CONTACTS_FILE.exists():
        try:
            data = json.loads(CONTACTS_FILE.read_text())
            return [Contact.from_dict(c) for c in data.get("contacts", [])]
        except Exception as e:
            print(f"[NudgeEngine] Error loading contacts: {e}")
    return []


def save_contacts(contacts: List[Contact]) -> None:
    """Save contacts to disk."""
    try:
        data = {
            "updated_at": datetime.now().isoformat(),
            "contacts": [c.to_dict() for c in contacts]
        }
        CONTACTS_FILE.write_text(json.dumps(data, indent=2))
    except Exception as e:
        print(f"[NudgeEngine] Error saving contacts: {e}")


def load_goals() -> List[Goal]:
    """Load goals from disk."""
    if GOALS_FILE.exists():
        try:
            data = json.loads(GOALS_FILE.read_text())
            return [Goal.from_dict(g) for g in data.get("goals", [])]
        except Exception as e:
            print(f"[NudgeEngine] Error loading goals: {e}")
    return []


def save_goals(goals: List[Goal]) -> None:
    """Save goals to disk."""
    try:
        data = {
            "updated_at": datetime.now().isoformat(),
            "goals": [g.to_dict() for g in goals]
        }
        GOALS_FILE.write_text(json.dumps(data, indent=2))
    except Exception as e:
        print(f"[NudgeEngine] Error saving goals: {e}")


def load_important_dates() -> List[ImportantDate]:
    """Load important dates from disk."""
    if IMPORTANT_DATES_FILE.exists():
        try:
            data = json.loads(IMPORTANT_DATES_FILE.read_text())
            return [ImportantDate.from_dict(d) for d in data.get("dates", [])]
        except Exception as e:
            print(f"[NudgeEngine] Error loading important dates: {e}")
    return []


def save_important_dates(dates: List[ImportantDate]) -> None:
    """Save important dates to disk."""
    try:
        data = {
            "updated_at": datetime.now().isoformat(),
            "dates": [d.to_dict() for d in dates]
        }
        IMPORTANT_DATES_FILE.write_text(json.dumps(data, indent=2))
    except Exception as e:
        print(f"[NudgeEngine] Error saving important dates: {e}")


def load_user_settings() -> Dict[str, Any]:
    """Load user settings."""
    if USER_SETTINGS_FILE.exists():
        try:
            return json.loads(USER_SETTINGS_FILE.read_text())
        except:
            pass
    return {"max_nudges_per_day": MAX_NUDGES_PER_DAY}


# ═══════════════════════════════════════════════════════════════════════════════
# CONTACT FREQUENCY ANALYZER
# ═══════════════════════════════════════════════════════════════════════════════

class ContactFrequencyAnalyzer:
    """Analyze contact frequency and generate relationship nudges."""

    def __init__(self):
        self.contacts = load_contacts()

    def reload(self) -> None:
        """Reload contacts from disk."""
        self.contacts = load_contacts()

    def add_contact(self, contact: Contact) -> None:
        """Add a new contact."""
        self.contacts.append(contact)
        save_contacts(self.contacts)

    def update_contact(self, contact_id: str, updates: Dict[str, Any]) -> bool:
        """Update a contact."""
        for contact in self.contacts:
            if contact.id == contact_id:
                for key, value in updates.items():
                    if hasattr(contact, key):
                        setattr(contact, key, value)
                save_contacts(self.contacts)
                return True
        return False

    def record_contact(self, contact_id: str, when: Optional[datetime] = None) -> bool:
        """Record that the user contacted someone."""
        when = when or datetime.now()
        for contact in self.contacts:
            if contact.id == contact_id:
                contact.last_contact = when
                save_contacts(self.contacts)
                return True
        return False

    def get_cadence_for_contact(self, contact: Contact) -> int:
        """Get the contact cadence in days for a contact."""
        if contact.contact_cadence_days:
            return contact.contact_cadence_days
        return DEFAULT_CONTACT_CADENCE.get(
            contact.relationship_type,
            DEFAULT_CONTACT_CADENCE["default"]
        )

    def get_overdue_contacts(self) -> List[Dict[str, Any]]:
        """Get contacts that are overdue for reaching out."""
        overdue = []
        now = datetime.now()

        for contact in self.contacts:
            if not contact.active:
                continue

            cadence = self.get_cadence_for_contact(contact)

            if contact.last_contact:
                days_since = (now - contact.last_contact).days
                if days_since >= cadence:
                    overdue_days = days_since - cadence
                    overdue.append({
                        "contact": contact,
                        "days_since_contact": days_since,
                        "days_overdue": overdue_days,
                        "cadence": cadence
                    })
            else:
                # Never contacted
                overdue.append({
                    "contact": contact,
                    "days_since_contact": None,
                    "days_overdue": 0,
                    "cadence": cadence
                })

        # Sort by most overdue first
        overdue.sort(key=lambda x: x["days_overdue"] if x["days_overdue"] else 0, reverse=True)

        return overdue


# ═══════════════════════════════════════════════════════════════════════════════
# IMPORTANT DATE DETECTOR
# ═══════════════════════════════════════════════════════════════════════════════

class ImportantDateDetector:
    """Detect upcoming important dates and generate reminders."""

    def __init__(self):
        self.important_dates = load_important_dates()
        self.contacts = load_contacts()

    def reload(self) -> None:
        """Reload data from disk."""
        self.important_dates = load_important_dates()
        self.contacts = load_contacts()

    def add_important_date(self, date: ImportantDate) -> None:
        """Add an important date."""
        self.important_dates.append(date)
        save_important_dates(self.important_dates)

    def get_upcoming_dates(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get important dates coming up in the next N days."""
        upcoming = []
        now = datetime.now()
        today = now.date()

        for imp_date in self.important_dates:
            # Parse the date
            try:
                if imp_date.recurring:
                    # MM-DD format
                    month, day = map(int, imp_date.date.split("-"))
                    # Get the next occurrence
                    this_year = today.replace(month=month, day=day)
                    if this_year < today:
                        # Already passed this year, use next year
                        next_date = this_year.replace(year=today.year + 1)
                    else:
                        next_date = this_year
                else:
                    # YYYY-MM-DD format
                    next_date = datetime.strptime(imp_date.date, "%Y-%m-%d").date()

                days_until = (next_date - today).days

                if 0 <= days_until <= days:
                    upcoming.append({
                        "date": imp_date,
                        "next_occurrence": next_date.isoformat(),
                        "days_until": days_until
                    })

            except Exception as e:
                print(f"[ImportantDateDetector] Error parsing date {imp_date.date}: {e}")
                continue

        # Also check contacts' birthdays
        for contact in self.contacts:
            if contact.birthday and contact.active:
                try:
                    month, day = map(int, contact.birthday.split("-"))
                    this_year = today.replace(month=month, day=day)
                    if this_year < today:
                        next_date = this_year.replace(year=today.year + 1)
                    else:
                        next_date = this_year

                    days_until = (next_date - today).days

                    if 0 <= days_until <= days:
                        upcoming.append({
                            "date": ImportantDate(
                                id=f"birthday_{contact.id}",
                                title=f"{contact.name}'s Birthday",
                                date=contact.birthday,
                                recurring=True,
                                category="birthday",
                                contact_id=contact.id
                            ),
                            "next_occurrence": next_date.isoformat(),
                            "days_until": days_until,
                            "contact": contact
                        })
                except Exception:
                    continue

        # Sort by days until
        upcoming.sort(key=lambda x: x["days_until"])

        return upcoming


# ═══════════════════════════════════════════════════════════════════════════════
# GOAL TRACKER
# ═══════════════════════════════════════════════════════════════════════════════

class GoalTracker:
    """Track goals and generate accountability nudges."""

    def __init__(self):
        self.goals = load_goals()

    def reload(self) -> None:
        """Reload goals from disk."""
        self.goals = load_goals()

    def add_goal(self, goal: Goal) -> None:
        """Add a new goal."""
        self.goals.append(goal)
        save_goals(self.goals)

    def update_goal_progress(self, goal_id: str, progress: int) -> bool:
        """Update goal progress (0-100)."""
        for goal in self.goals:
            if goal.id == goal_id:
                goal.progress = min(100, max(0, progress))
                if goal.progress >= 100:
                    goal.status = "completed"
                save_goals(self.goals)
                return True
        return False

    def get_stalled_goals(self) -> List[Dict[str, Any]]:
        """Get goals that haven't been updated in a while."""
        stalled = []
        now = datetime.now()

        for goal in self.goals:
            if goal.status != "active":
                continue

            # Check if goal has a deadline approaching
            if goal.target_date:
                days_until_deadline = (goal.target_date - now).days

                # Stalled if deadline is approaching but progress is behind
                expected_progress = 100 - (days_until_deadline / 30 * 100)  # Rough estimate
                if goal.progress < expected_progress - 20:  # 20% behind
                    stalled.append({
                        "goal": goal,
                        "days_until_deadline": days_until_deadline,
                        "expected_progress": int(expected_progress),
                        "actual_progress": goal.progress,
                        "behind_by": int(expected_progress - goal.progress)
                    })

        return stalled

    def get_goals_with_deadlines(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get goals with deadlines in the next N days."""
        upcoming = []
        now = datetime.now()

        for goal in self.goals:
            if goal.status != "active" or not goal.target_date:
                continue

            days_until = (goal.target_date - now).days

            if 0 <= days_until <= days:
                upcoming.append({
                    "goal": goal,
                    "days_until_deadline": days_until,
                    "progress": goal.progress
                })

        return upcoming


# ═══════════════════════════════════════════════════════════════════════════════
# NUDGE ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class NudgeEngine:
    """
    Main engine for generating and managing proactive nudges.

    Coordinates the ContactFrequencyAnalyzer, ImportantDateDetector,
    and GoalTracker to generate intelligent nudges.
    """

    def __init__(self, user_id: str = "default"):
        self.user_id = user_id
        self.nudges = load_notifications()
        self.settings = load_user_settings()

        # Initialize analyzers
        self.contact_analyzer = ContactFrequencyAnalyzer()
        self.date_detector = ImportantDateDetector()
        self.goal_tracker = GoalTracker()

    def reload(self) -> None:
        """Reload all data from disk."""
        self.nudges = load_notifications()
        self.settings = load_user_settings()
        self.contact_analyzer.reload()
        self.date_detector.reload()
        self.goal_tracker.reload()

    # ═══════════════════════════════════════════════════════════════════════════
    # NUDGE CREATION
    # ═══════════════════════════════════════════════════════════════════════════

    def create_nudge(
        self,
        nudge_type: NudgeType,
        title: str,
        message: str,
        priority: NudgePriority = NudgePriority.MEDIUM,
        expires_hours: Optional[int] = 24,
        action_url: Optional[str] = None,
        action_label: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Nudge:
        """Create a new nudge and save it."""
        # Check if we've hit the daily limit
        if not self._can_create_nudge():
            print(f"[NudgeEngine] Daily nudge limit reached, not creating: {title}")
            # Still create but mark as low priority
            priority = NudgePriority.LOW

        nudge = Nudge(
            id=str(uuid.uuid4()),
            type=nudge_type,
            title=title,
            message=message,
            priority=priority,
            created_at=datetime.now(),
            expires_at=datetime.now() + timedelta(hours=expires_hours) if expires_hours else None,
            action_url=action_url,
            action_label=action_label,
            metadata=metadata or {}
        )

        self.nudges.append(nudge)
        save_notifications(self.nudges)

        print(f"[NudgeEngine] Created nudge: {title}")
        return nudge

    def _can_create_nudge(self) -> bool:
        """Check if we can create more nudges today."""
        today = datetime.now().date()
        today_nudges = [
            n for n in self.nudges
            if not n.dismissed
            and isinstance(n.created_at, datetime)
            and n.created_at.date() == today
        ]
        max_nudges = self.settings.get("max_nudges_per_day", MAX_NUDGES_PER_DAY)
        return len(today_nudges) < max_nudges

    # ═══════════════════════════════════════════════════════════════════════════
    # SPECIFIC NUDGE CREATORS
    # ═══════════════════════════════════════════════════════════════════════════

    def create_urgent_email_nudge(self, email_data: Dict[str, Any]) -> Nudge:
        """Create a nudge for an urgent email."""
        return self.create_nudge(
            nudge_type=NudgeType.URGENT_EMAIL,
            title=f"Urgent email from {email_data.get('sender', 'Unknown')}",
            message=f"Subject: {email_data.get('subject', 'No subject')[:50]}",
            priority=NudgePriority.URGENT if email_data.get('urgency', 3) >= 4 else NudgePriority.HIGH,
            expires_hours=8,
            action_label="Open Email",
            metadata={"email_id": email_data.get("id"), "sender": email_data.get("sender_email")}
        )

    def create_event_reminder_nudge(self, event_data: Dict[str, Any]) -> Nudge:
        """Create a nudge for an upcoming event."""
        minutes_until = event_data.get("minutes_until", 60)
        return self.create_nudge(
            nudge_type=NudgeType.EVENT_REMINDER,
            title=f"'{event_data.get('title', 'Event')}' in {minutes_until} minutes",
            message=f"Starting soon - make sure you're ready",
            priority=NudgePriority.HIGH if minutes_until <= 30 else NudgePriority.MEDIUM,
            expires_hours=2,
            metadata={"event_title": event_data.get("title")}
        )

    def create_prep_time_nudge(self, event_data: Dict[str, Any], warning: str) -> Nudge:
        """Create a nudge about prep time needed."""
        return self.create_nudge(
            nudge_type=NudgeType.PREP_TIME,
            title=f"Prep time for '{event_data.get('title', 'Event')}'",
            message=warning,
            priority=NudgePriority.HIGH,
            expires_hours=2,
            metadata={"event_title": event_data.get("title")}
        )

    def create_contact_reminder_nudge(self, contact_data: Dict[str, Any]) -> Nudge:
        """Create a nudge to reach out to someone."""
        contact = contact_data.get("contact")
        days = contact_data.get("days_since_contact")

        if days:
            message = f"It's been {days} days since you last connected"
        else:
            message = "You haven't connected with them yet"

        return self.create_nudge(
            nudge_type=NudgeType.CONTACT_REMINDER,
            title=f"Reach out to {contact.name}",
            message=message,
            priority=NudgePriority.MEDIUM,
            expires_hours=48,
            action_label="Send Message",
            metadata={
                "contact_id": contact.id,
                "contact_name": contact.name,
                "contact_email": contact.email
            }
        )

    def create_birthday_nudge(self, date_data: Dict[str, Any]) -> Nudge:
        """Create a birthday reminder nudge."""
        imp_date = date_data.get("date")
        days_until = date_data.get("days_until", 0)

        if days_until == 0:
            title = f"Today is {imp_date.title}!"
            priority = NudgePriority.URGENT
        elif days_until == 1:
            title = f"Tomorrow is {imp_date.title}"
            priority = NudgePriority.HIGH
        else:
            title = f"{imp_date.title} in {days_until} days"
            priority = NudgePriority.MEDIUM

        return self.create_nudge(
            nudge_type=NudgeType.BIRTHDAY,
            title=title,
            message="Don't forget to wish them well!",
            priority=priority,
            expires_hours=24,
            metadata={"date_id": imp_date.id, "contact_id": imp_date.contact_id}
        )

    def create_goal_progress_nudge(self, goal_data: Dict[str, Any]) -> Nudge:
        """Create a goal progress nudge."""
        goal = goal_data.get("goal")
        behind_by = goal_data.get("behind_by", 0)

        return self.create_nudge(
            nudge_type=NudgeType.GOAL_PROGRESS,
            title=f"Goal update: {goal.title}",
            message=f"You're {behind_by}% behind schedule. Time to make progress!",
            priority=NudgePriority.MEDIUM,
            expires_hours=24,
            action_label="Update Progress",
            metadata={"goal_id": goal.id, "current_progress": goal.progress}
        )

    def create_goal_deadline_nudge(self, goal_data: Dict[str, Any]) -> Nudge:
        """Create a goal deadline nudge."""
        goal = goal_data.get("goal")
        days_until = goal_data.get("days_until_deadline", 0)

        if days_until == 0:
            title = f"Deadline TODAY: {goal.title}"
            priority = NudgePriority.URGENT
        elif days_until == 1:
            title = f"Deadline TOMORROW: {goal.title}"
            priority = NudgePriority.HIGH
        else:
            title = f"Goal deadline in {days_until} days: {goal.title}"
            priority = NudgePriority.MEDIUM

        return self.create_nudge(
            nudge_type=NudgeType.GOAL_DEADLINE,
            title=title,
            message=f"Current progress: {goal.progress}%",
            priority=priority,
            expires_hours=24,
            metadata={"goal_id": goal.id}
        )

    def create_morning_brief_nudge(self, brief_data: Dict[str, Any]) -> Nudge:
        """Create the morning brief nudge."""
        sections = brief_data.get("sections", [])
        summary_parts = []

        for section in sections:
            if section.get("type") == "calendar":
                summary_parts.append(f"{section.get('count', 0)} events")
            elif section.get("type") == "email":
                summary_parts.append(f"{section.get('unread_count', 0)} unread emails")
            elif section.get("type") == "tasks":
                summary_parts.append(f"{section.get('pending_count', 0)} tasks pending")

        return self.create_nudge(
            nudge_type=NudgeType.MORNING_BRIEF,
            title=f"Good morning! Here's your day: {brief_data.get('date', 'Today')}",
            message=", ".join(summary_parts) if summary_parts else "Your day awaits",
            priority=NudgePriority.LOW,
            expires_hours=12,
            action_label="View Full Brief",
            action_url="/morning-brief",
            metadata={"brief_date": brief_data.get("date")}
        )

    # ═══════════════════════════════════════════════════════════════════════════
    # ANALYSIS METHODS
    # ═══════════════════════════════════════════════════════════════════════════

    def analyze_contact_frequency(self) -> List[Nudge]:
        """Analyze contacts and generate nudges for overdue relationships."""
        nudges_created = []
        overdue = self.contact_analyzer.get_overdue_contacts()

        # Only create nudges for the most overdue (top 3)
        for contact_data in overdue[:3]:
            # Check if we already have an active nudge for this contact
            contact = contact_data.get("contact")
            existing = [
                n for n in self.nudges
                if not n.dismissed
                and n.type == NudgeType.CONTACT_REMINDER
                and n.metadata.get("contact_id") == contact.id
            ]

            if not existing:
                nudge = self.create_contact_reminder_nudge(contact_data)
                nudges_created.append(nudge)

        return nudges_created

    def check_important_dates(self) -> List[Nudge]:
        """Check for upcoming important dates and generate nudges."""
        nudges_created = []
        upcoming = self.date_detector.get_upcoming_dates(days=7)

        for date_data in upcoming:
            imp_date = date_data.get("date")
            days_until = date_data.get("days_until")

            # Check if we should send a reminder
            if days_until in imp_date.reminder_days_before or days_until == 0:
                # Check if we already have an active nudge for this date
                existing = [
                    n for n in self.nudges
                    if not n.dismissed
                    and n.type in [NudgeType.BIRTHDAY, NudgeType.ANNIVERSARY]
                    and n.metadata.get("date_id") == imp_date.id
                ]

                if not existing:
                    if imp_date.category == "birthday":
                        nudge = self.create_birthday_nudge(date_data)
                    else:
                        nudge = self.create_nudge(
                            nudge_type=NudgeType.ANNIVERSARY,
                            title=imp_date.title,
                            message=f"Coming up in {days_until} days" if days_until > 0 else "Today!",
                            priority=NudgePriority.HIGH if days_until <= 1 else NudgePriority.MEDIUM,
                            metadata={"date_id": imp_date.id}
                        )
                    nudges_created.append(nudge)

        return nudges_created

    def check_goal_progress(self) -> List[Nudge]:
        """Check goal progress and generate nudges."""
        nudges_created = []

        # Check for stalled goals
        stalled = self.goal_tracker.get_stalled_goals()
        for goal_data in stalled[:2]:  # Max 2 nudges
            goal = goal_data.get("goal")
            existing = [
                n for n in self.nudges
                if not n.dismissed
                and n.type == NudgeType.GOAL_PROGRESS
                and n.metadata.get("goal_id") == goal.id
                and (datetime.now() - n.created_at).days < 1  # Only one per day
            ]

            if not existing:
                nudge = self.create_goal_progress_nudge(goal_data)
                nudges_created.append(nudge)

        # Check for upcoming deadlines
        upcoming = self.goal_tracker.get_goals_with_deadlines(days=7)
        for goal_data in upcoming:
            goal = goal_data.get("goal")
            existing = [
                n for n in self.nudges
                if not n.dismissed
                and n.type == NudgeType.GOAL_DEADLINE
                and n.metadata.get("goal_id") == goal.id
            ]

            if not existing:
                nudge = self.create_goal_deadline_nudge(goal_data)
                nudges_created.append(nudge)

        return nudges_created

    def get_upcoming_birthdays(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get upcoming birthdays."""
        upcoming = self.date_detector.get_upcoming_dates(days=days)
        return [
            {
                "name": d.get("date").title,
                "date": d.get("next_occurrence"),
                "days_until": d.get("days_until")
            }
            for d in upcoming
            if d.get("date").category == "birthday"
        ]

    # ═══════════════════════════════════════════════════════════════════════════
    # NUDGE MANAGEMENT
    # ═══════════════════════════════════════════════════════════════════════════

    def get_pending_nudges(self) -> List[Nudge]:
        """Get all pending (unread, not dismissed, not expired) nudges."""
        now = datetime.now()
        pending = []

        for nudge in self.nudges:
            if nudge.dismissed:
                continue
            if nudge.expires_at and nudge.expires_at < now:
                continue
            pending.append(nudge)

        # Sort by priority and creation time
        priority_order = {
            NudgePriority.URGENT: 0,
            NudgePriority.HIGH: 1,
            NudgePriority.MEDIUM: 2,
            NudgePriority.LOW: 3
        }
        pending.sort(key=lambda n: (priority_order.get(n.priority, 2), n.created_at))

        return pending

    def mark_as_read(self, nudge_id: str) -> bool:
        """Mark a nudge as read."""
        for nudge in self.nudges:
            if nudge.id == nudge_id:
                nudge.read = True
                save_notifications(self.nudges)
                return True
        return False

    def dismiss_nudge(self, nudge_id: str) -> bool:
        """Dismiss a nudge."""
        for nudge in self.nudges:
            if nudge.id == nudge_id:
                nudge.dismissed = True
                nudge.dismissed_at = datetime.now()
                save_notifications(self.nudges)
                return True
        return False

    def mark_helpful(self, nudge_id: str, helpful: bool) -> bool:
        """Mark whether a nudge was helpful (for learning)."""
        for nudge in self.nudges:
            if nudge.id == nudge_id:
                nudge.helpful = helpful
                save_notifications(self.nudges)
                return True
        return False

    def cleanup_expired(self) -> int:
        """Remove expired nudges. Returns count removed."""
        now = datetime.now()
        original_count = len(self.nudges)

        self.nudges = [
            n for n in self.nudges
            if not (n.expires_at and n.expires_at < now and n.dismissed)
        ]

        removed = original_count - len(self.nudges)
        if removed > 0:
            save_notifications(self.nudges)

        return removed


# ═══════════════════════════════════════════════════════════════════════════════
# GLOBAL INSTANCE
# ═══════════════════════════════════════════════════════════════════════════════

_nudge_engine: Optional[NudgeEngine] = None


def get_nudge_engine(user_id: str = "default") -> NudgeEngine:
    """Get or create the NudgeEngine instance."""
    global _nudge_engine
    if _nudge_engine is None or _nudge_engine.user_id != user_id:
        _nudge_engine = NudgeEngine(user_id)
    return _nudge_engine


# ═══════════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    """CLI interface for Nudge Engine."""
    import argparse

    parser = argparse.ArgumentParser(description="TinyPM Nudge Engine")
    parser.add_argument("command", nargs="?", default="status",
                       choices=["status", "pending", "create", "contacts", "goals", "dates"],
                       help="Command to run")
    parser.add_argument("--type", type=str, help="Nudge type for create")
    parser.add_argument("--title", type=str, help="Nudge title")
    parser.add_argument("--message", type=str, help="Nudge message")

    args = parser.parse_args()

    engine = get_nudge_engine()

    if args.command == "status":
        print("\n" + "=" * 40)
        print("Nudge Engine Status")
        print("=" * 40)
        pending = engine.get_pending_nudges()
        print(f"Pending nudges: {len(pending)}")
        print(f"Total nudges: {len(engine.nudges)}")
        print(f"Contacts tracked: {len(engine.contact_analyzer.contacts)}")
        print(f"Goals tracked: {len(engine.goal_tracker.goals)}")
        print(f"Important dates: {len(engine.date_detector.important_dates)}")

    elif args.command == "pending":
        print("\n" + "=" * 40)
        print("Pending Nudges")
        print("=" * 40)
        pending = engine.get_pending_nudges()
        if not pending:
            print("No pending nudges")
        else:
            for nudge in pending:
                print(f"\n[{nudge.priority.value.upper()}] {nudge.title}")
                print(f"  {nudge.message}")
                print(f"  Type: {nudge.type.value}")
                print(f"  ID: {nudge.id}")

    elif args.command == "contacts":
        print("\n" + "=" * 40)
        print("Contacts")
        print("=" * 40)
        for contact in engine.contact_analyzer.contacts:
            last = contact.last_contact.strftime("%Y-%m-%d") if contact.last_contact else "Never"
            print(f"  - {contact.name} ({contact.relationship_type}) - Last: {last}")

    elif args.command == "goals":
        print("\n" + "=" * 40)
        print("Goals")
        print("=" * 40)
        for goal in engine.goal_tracker.goals:
            print(f"  - {goal.title} [{goal.progress}%] ({goal.status})")

    elif args.command == "dates":
        print("\n" + "=" * 40)
        print("Important Dates")
        print("=" * 40)
        upcoming = engine.date_detector.get_upcoming_dates(days=30)
        if not upcoming:
            print("No upcoming dates in the next 30 days")
        else:
            for d in upcoming:
                print(f"  - {d['date'].title}: {d['next_occurrence']} ({d['days_until']} days)")

    elif args.command == "create":
        if not args.title or not args.message:
            print("Error: --title and --message required for create")
            return

        nudge = engine.create_nudge(
            nudge_type=NudgeType(args.type) if args.type else NudgeType.CUSTOM,
            title=args.title,
            message=args.message
        )
        print(f"Created nudge: {nudge.id}")


if __name__ == "__main__":
    main()
