#!/usr/bin/env python3
"""
TinyFeedback - Feedback & Bug Reporting Utilities
=================================================
Created: 2026-01-30
Team: Feedback & Bug Reporting (Team 3)

Features:
- Load/save feedback to .feedback.json
- Generate statistics and daily digests
- Filter by type, status, and date
- Email notification support
"""

import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, asdict

APP_DIR = Path(__file__).parent
FEEDBACK_FILE = APP_DIR / ".feedback.json"


@dataclass
class FeedbackItem:
    """Represents a single feedback item."""
    id: str
    type: str  # bug, feature, general
    title: str
    details: str
    status: str  # new, reviewed, in_progress, done
    page: str
    user_agent: str
    user_email: str
    screenshot: Optional[str]  # base64 data URL or None
    timestamp: str
    admin_notes: str
    reviewed_at: Optional[str]
    reviewed_by: Optional[str]

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> 'FeedbackItem':
        return cls(
            id=data.get('id', str(uuid.uuid4())),
            type=data.get('type', 'general'),
            title=data.get('title', ''),
            details=data.get('details', ''),
            status=data.get('status', 'new'),
            page=data.get('page', ''),
            user_agent=data.get('user_agent', ''),
            user_email=data.get('user_email', ''),
            screenshot=data.get('screenshot'),
            timestamp=data.get('timestamp', datetime.now().isoformat()),
            admin_notes=data.get('admin_notes', ''),
            reviewed_at=data.get('reviewed_at'),
            reviewed_by=data.get('reviewed_by')
        )


def load_feedback() -> List[FeedbackItem]:
    """Load all feedback items from storage."""
    if not FEEDBACK_FILE.exists():
        return []

    try:
        data = json.loads(FEEDBACK_FILE.read_text())
        items = data.get('items', [])
        return [FeedbackItem.from_dict(item) for item in items]
    except (json.JSONDecodeError, KeyError) as e:
        print(f"[Feedback] Error loading feedback: {e}")
        return []


def save_feedback(item: FeedbackItem) -> bool:
    """
    Save a new feedback item to storage.
    Returns True on success, False on failure.
    """
    try:
        # Load existing data
        if FEEDBACK_FILE.exists():
            data = json.loads(FEEDBACK_FILE.read_text())
        else:
            data = {'items': [], 'created': datetime.now().isoformat()}

        # Add new item
        data['items'].insert(0, item.to_dict())  # Newest first
        data['last_updated'] = datetime.now().isoformat()

        # Write back
        FEEDBACK_FILE.write_text(json.dumps(data, indent=2))
        return True
    except Exception as e:
        print(f"[Feedback] Error saving feedback: {e}")
        return False


def update_feedback(item_id: str, updates: Dict) -> Optional[FeedbackItem]:
    """
    Update an existing feedback item.
    Returns the updated item or None if not found.
    """
    try:
        if not FEEDBACK_FILE.exists():
            return None

        data = json.loads(FEEDBACK_FILE.read_text())
        items = data.get('items', [])

        for i, item in enumerate(items):
            if item.get('id') == item_id:
                # Apply updates
                for key, value in updates.items():
                    item[key] = value

                # Add timestamp for status changes
                if 'status' in updates and updates['status'] == 'reviewed':
                    item['reviewed_at'] = datetime.now().isoformat()

                data['items'][i] = item
                data['last_updated'] = datetime.now().isoformat()
                FEEDBACK_FILE.write_text(json.dumps(data, indent=2))
                return FeedbackItem.from_dict(item)

        return None
    except Exception as e:
        print(f"[Feedback] Error updating feedback: {e}")
        return None


def get_feedback_stats() -> Dict[str, Any]:
    """
    Get feedback statistics.
    Returns counts by type, status, and recent trends.
    """
    items = load_feedback()

    if not items:
        return {
            'total': 0,
            'by_type': {'bug': 0, 'feature': 0, 'general': 0},
            'by_status': {'new': 0, 'reviewed': 0, 'in_progress': 0, 'done': 0},
            'new_today': 0,
            'new_this_week': 0,
            'response_rate': 0
        }

    # Count by type
    by_type = {'bug': 0, 'feature': 0, 'general': 0}
    for item in items:
        t = item.type if item.type in by_type else 'general'
        by_type[t] += 1

    # Count by status
    by_status = {'new': 0, 'reviewed': 0, 'in_progress': 0, 'done': 0}
    for item in items:
        s = item.status if item.status in by_status else 'new'
        by_status[s] += 1

    # Recent counts
    now = datetime.now()
    today = now.date()
    week_ago = (now - timedelta(days=7)).date()

    new_today = 0
    new_this_week = 0

    for item in items:
        try:
            item_date = datetime.fromisoformat(item.timestamp.replace('Z', '+00:00')).date()
            if item_date == today:
                new_today += 1
            if item_date >= week_ago:
                new_this_week += 1
        except (ValueError, AttributeError):
            pass

    # Response rate (% that are not "new")
    responded = by_status['reviewed'] + by_status['in_progress'] + by_status['done']
    response_rate = int((responded / len(items)) * 100) if items else 0

    return {
        'total': len(items),
        'by_type': by_type,
        'by_status': by_status,
        'new_today': new_today,
        'new_this_week': new_this_week,
        'response_rate': response_rate
    }


def get_feedback_by_filters(
    type_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = 50
) -> List[FeedbackItem]:
    """
    Get feedback items filtered by type and/or status.
    """
    items = load_feedback()

    if type_filter and type_filter != 'all':
        items = [i for i in items if i.type == type_filter]

    if status_filter and status_filter != 'all':
        items = [i for i in items if i.status == status_filter]

    return items[:limit]


def generate_daily_digest() -> str:
    """
    Generate a daily digest of feedback for email or dashboard.
    Returns markdown-formatted string.
    """
    stats = get_feedback_stats()
    items = load_feedback()

    # Get new items from last 24 hours
    now = datetime.now()
    yesterday = now - timedelta(days=1)

    new_items = []
    for item in items:
        try:
            item_dt = datetime.fromisoformat(item.timestamp.replace('Z', '+00:00'))
            # Handle timezone-aware vs naive datetime
            if item_dt.tzinfo is not None:
                item_dt = item_dt.replace(tzinfo=None)
            if item_dt >= yesterday:
                new_items.append(item)
        except (ValueError, AttributeError):
            pass

    # Build digest
    lines = [
        "# TinyFeedback Daily Digest",
        f"**Generated:** {now.strftime('%Y-%m-%d %H:%M')}",
        "",
        "## Summary",
        f"- **Total Feedback:** {stats['total']}",
        f"- **New Today:** {stats['new_today']}",
        f"- **New This Week:** {stats['new_this_week']}",
        f"- **Response Rate:** {stats['response_rate']}%",
        "",
        "## By Type",
        f"- Bugs: {stats['by_type']['bug']}",
        f"- Features: {stats['by_type']['feature']}",
        f"- General: {stats['by_type']['general']}",
        "",
        "## By Status",
        f"- New: {stats['by_status']['new']}",
        f"- Reviewed: {stats['by_status']['reviewed']}",
        f"- In Progress: {stats['by_status']['in_progress']}",
        f"- Done: {stats['by_status']['done']}",
        "",
    ]

    # List new items
    if new_items:
        lines.append("## New Feedback (Last 24h)")
        for item in new_items:
            type_emoji = {'bug': '🐛', 'feature': '✨', 'general': '💭'}.get(item.type, '📝')
            lines.append(f"- {type_emoji} **{item.title}** ({item.type})")
            if item.details:
                preview = item.details[:100] + '...' if len(item.details) > 100 else item.details
                lines.append(f"  > {preview}")
    else:
        lines.append("## New Feedback (Last 24h)")
        lines.append("No new feedback in the last 24 hours.")

    return "\n".join(lines)


def send_feedback_notification(item: FeedbackItem) -> bool:
    """
    Log feedback notification. Email sending can be added when Gmail compose scope is enabled.
    Returns True on success.
    """
    try:
        type_emoji = {'bug': '🐛', 'feature': '✨', 'general': '💭'}.get(item.type, '📝')

        # Log to console for now - email notifications can be enabled when needed
        print(f"[Feedback] {type_emoji} New {item.type}: {item.title}")
        print(f"[Feedback] From: {item.user_email or 'Anonymous'} on {item.page}")

        # Future: Could integrate with email when gmail.compose scope is available
        # For now, feedback is stored in .feedback.json and viewable in dashboard

        return True
    except Exception as e:
        print(f"[Feedback] Error logging notification: {e}")
        return False


def create_feedback_item(
    type: str,
    title: str,
    details: str,
    page: str = '',
    user_agent: str = '',
    user_email: str = '',
    screenshot: Optional[str] = None
) -> Optional[FeedbackItem]:
    """
    Create and save a new feedback item.
    Convenience function combining creation and saving.
    Returns the created item or None on failure.
    """
    item = FeedbackItem(
        id=str(uuid.uuid4()),
        type=type,
        title=title,
        details=details,
        status='new',
        page=page,
        user_agent=user_agent,
        user_email=user_email,
        screenshot=screenshot,
        timestamp=datetime.now().isoformat(),
        admin_notes='',
        reviewed_at=None,
        reviewed_by=None
    )

    if save_feedback(item):
        # Try to send notification (non-blocking)
        try:
            send_feedback_notification(item)
        except Exception:
            pass
        return item

    return None


if __name__ == "__main__":
    # Test the module
    print("TinyFeedback Utils Test")
    print("=" * 40)

    # Test stats
    stats = get_feedback_stats()
    print(f"Current stats: {json.dumps(stats, indent=2)}")

    # Test digest
    print("\n" + generate_daily_digest())
