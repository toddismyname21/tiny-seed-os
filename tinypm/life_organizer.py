#!/usr/bin/env python3
"""
TinyPM Life Organizer - Always-On Proactive Engine
═══════════════════════════════════════════════════════════════════════════════

The heart of TinyPM's proactive intelligence. This module runs continuously
in the background, checking emails, monitoring calendar, tracking relationships,
and generating nudges to help the user stay on top of their life.

Features:
- Email monitoring (every 5 minutes)
- Calendar analysis (every hour)
- Relationship tracking (daily)
- Morning brief generation (at user's wake time)
- Goal progress tracking (continuous)

Uses APScheduler for reliable background task scheduling.

Usage:
    # Start as module
    python3 life_organizer.py

    # Or import and use
    from life_organizer import LifeOrganizer
    organizer = LifeOrganizer()
    organizer.start()

Created: 2026-01-30
Author: Team 5 Builder (Claude)
"""

import json
import logging
import threading
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

# Try to import APScheduler
try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.triggers.interval import IntervalTrigger
    from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED
    APSCHEDULER_AVAILABLE = True
except ImportError:
    APSCHEDULER_AVAILABLE = False
    print("[Life Organizer] APScheduler not installed. Run: pip install apscheduler")

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

APP_DIR = Path(__file__).parent
LOG_FILE = APP_DIR / ".life_organizer.log"
STATE_FILE = APP_DIR / ".life_organizer_state.json"
NOTIFICATIONS_FILE = APP_DIR / ".notifications.json"
USER_SETTINGS_FILE = APP_DIR / ".user_settings.json"

# Default check intervals
DEFAULT_EMAIL_INTERVAL_MINUTES = 5
DEFAULT_CALENDAR_INTERVAL_HOURS = 1
DEFAULT_RELATIONSHIP_HOUR = 9  # 9am for daily relationship checks
DEFAULT_MORNING_BRIEF_HOUR = 6
DEFAULT_MORNING_BRIEF_MINUTE = 30

# Quiet hours (don't send notifications during these times)
DEFAULT_QUIET_START = 22  # 10pm
DEFAULT_QUIET_END = 7     # 7am

# ═══════════════════════════════════════════════════════════════════════════════
# LOGGING SETUP
# ═══════════════════════════════════════════════════════════════════════════════

def setup_logging() -> logging.Logger:
    """Set up logging to file and console."""
    logger = logging.getLogger("LifeOrganizer")
    logger.setLevel(logging.INFO)

    # File handler
    file_handler = logging.FileHandler(LOG_FILE)
    file_handler.setLevel(logging.DEBUG)
    file_formatter = logging.Formatter(
        '%(asctime)s | %(levelname)s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(file_formatter)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s: %(message)s',
        datefmt='%H:%M:%S'
    )
    console_handler.setFormatter(console_formatter)

    # Remove existing handlers to avoid duplicates
    logger.handlers.clear()
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger

logger = setup_logging()

# ═══════════════════════════════════════════════════════════════════════════════
# STATE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

def load_state() -> Dict[str, Any]:
    """Load organizer state from disk."""
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except Exception as e:
            logger.error(f"Error loading state: {e}")
    return {
        "started_at": None,
        "last_email_check": None,
        "last_calendar_check": None,
        "last_relationship_check": None,
        "last_morning_brief": None,
        "jobs_run": 0,
        "errors": 0,
        "nudges_generated": 0
    }


def save_state(state: Dict[str, Any]) -> None:
    """Save organizer state to disk."""
    try:
        STATE_FILE.write_text(json.dumps(state, indent=2, default=str))
    except Exception as e:
        logger.error(f"Error saving state: {e}")


def load_user_settings() -> Dict[str, Any]:
    """Load user settings/preferences."""
    if USER_SETTINGS_FILE.exists():
        try:
            return json.loads(USER_SETTINGS_FILE.read_text())
        except:
            pass
    return {
        "wake_time_hour": DEFAULT_MORNING_BRIEF_HOUR,
        "wake_time_minute": DEFAULT_MORNING_BRIEF_MINUTE,
        "quiet_start_hour": DEFAULT_QUIET_START,
        "quiet_end_hour": DEFAULT_QUIET_END,
        "email_interval_minutes": DEFAULT_EMAIL_INTERVAL_MINUTES,
        "calendar_interval_hours": DEFAULT_CALENDAR_INTERVAL_HOURS,
        "timezone": "America/New_York",
        "nudge_channels": ["in_app"],  # in_app, email, push
        "max_nudges_per_day": 3
    }


def save_user_settings(settings: Dict[str, Any]) -> None:
    """Save user settings."""
    try:
        USER_SETTINGS_FILE.write_text(json.dumps(settings, indent=2))
    except Exception as e:
        logger.error(f"Error saving settings: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# LIFE ORGANIZER CLASS
# ═══════════════════════════════════════════════════════════════════════════════

class LifeOrganizer:
    """
    Always-On Life Organizer Engine.

    Runs background tasks to proactively help the user:
    - Check emails for urgent items
    - Monitor calendar for upcoming events
    - Track relationships and contact frequency
    - Generate morning briefs
    - Track goal progress
    """

    def __init__(self, user_id: str = "default"):
        self.user_id = user_id
        self.state = load_state()
        self.settings = load_user_settings()
        self.scheduler: Optional[BackgroundScheduler] = None
        self._running = False
        self._nudge_engine = None
        self._email_integration = None
        self._calendar_integration = None

        # Job callbacks for monitoring
        self._job_callbacks: List[Callable] = []

        logger.info(f"Life Organizer initialized for user: {user_id}")

    @property
    def nudge_engine(self):
        """Lazy load nudge engine."""
        if self._nudge_engine is None:
            try:
                from nudge_engine import NudgeEngine
                self._nudge_engine = NudgeEngine(self.user_id)
            except ImportError:
                logger.warning("NudgeEngine not available")
        return self._nudge_engine

    @property
    def email_integration(self):
        """Lazy load email integration."""
        if self._email_integration is None:
            try:
                from email_integration import get_email_integration
                self._email_integration = get_email_integration(self.user_id)
            except ImportError:
                logger.warning("Email integration not available")
        return self._email_integration

    @property
    def calendar_integration(self):
        """Lazy load calendar integration."""
        if self._calendar_integration is None:
            try:
                from calendar_integration import get_calendar_integration
                self._calendar_integration = get_calendar_integration(self.user_id)
            except ImportError:
                logger.warning("Calendar integration not available")
        return self._calendar_integration

    def start(self) -> bool:
        """
        Start the Life Organizer background scheduler.

        Returns:
            bool: True if started successfully, False otherwise
        """
        if not APSCHEDULER_AVAILABLE:
            logger.error("Cannot start: APScheduler not installed")
            return False

        if self._running:
            logger.warning("Life Organizer is already running")
            return True

        try:
            self.scheduler = BackgroundScheduler()

            # Add error/success listeners
            self.scheduler.add_listener(
                self._on_job_executed,
                EVENT_JOB_EXECUTED | EVENT_JOB_ERROR
            )

            # Schedule jobs based on settings
            self._schedule_jobs()

            # Start the scheduler
            self.scheduler.start()
            self._running = True

            # Update state
            self.state["started_at"] = datetime.now().isoformat()
            save_state(self.state)

            logger.info("Life Organizer STARTED - background jobs running")
            self._log_scheduled_jobs()

            return True

        except Exception as e:
            logger.error(f"Failed to start Life Organizer: {e}")
            return False

    def stop(self) -> None:
        """Stop the Life Organizer scheduler."""
        if self.scheduler and self._running:
            self.scheduler.shutdown(wait=False)
            self._running = False
            logger.info("Life Organizer STOPPED")

    def _schedule_jobs(self) -> None:
        """Schedule all background jobs based on user settings."""
        settings = self.settings

        # 1. Email check - every N minutes
        email_interval = settings.get("email_interval_minutes", DEFAULT_EMAIL_INTERVAL_MINUTES)
        self.scheduler.add_job(
            self.check_emails,
            IntervalTrigger(minutes=email_interval),
            id="email_check",
            name="Check Emails",
            replace_existing=True,
            misfire_grace_time=60
        )

        # 2. Calendar check - every N hours
        calendar_interval = settings.get("calendar_interval_hours", DEFAULT_CALENDAR_INTERVAL_HOURS)
        self.scheduler.add_job(
            self.check_calendar,
            IntervalTrigger(hours=calendar_interval),
            id="calendar_check",
            name="Check Calendar",
            replace_existing=True,
            misfire_grace_time=300
        )

        # 3. Relationship check - daily at 9am
        self.scheduler.add_job(
            self.check_relationships,
            CronTrigger(hour=DEFAULT_RELATIONSHIP_HOUR, minute=0),
            id="relationship_check",
            name="Check Relationships",
            replace_existing=True,
            misfire_grace_time=3600
        )

        # 4. Morning brief - at user's wake time
        wake_hour = settings.get("wake_time_hour", DEFAULT_MORNING_BRIEF_HOUR)
        wake_minute = settings.get("wake_time_minute", DEFAULT_MORNING_BRIEF_MINUTE)
        self.scheduler.add_job(
            self.generate_morning_brief,
            CronTrigger(hour=wake_hour, minute=wake_minute),
            id="morning_brief",
            name="Generate Morning Brief",
            replace_existing=True,
            misfire_grace_time=1800
        )

        # 5. Goal progress check - every 4 hours during waking hours
        self.scheduler.add_job(
            self.check_goals,
            CronTrigger(hour="8,12,16,20", minute=0),
            id="goal_check",
            name="Check Goal Progress",
            replace_existing=True,
            misfire_grace_time=1800
        )

    def _log_scheduled_jobs(self) -> None:
        """Log all scheduled jobs."""
        if self.scheduler:
            jobs = self.scheduler.get_jobs()
            logger.info(f"Scheduled {len(jobs)} background jobs:")
            for job in jobs:
                logger.info(f"  - {job.name} (ID: {job.id})")

    def _on_job_executed(self, event) -> None:
        """Handle job execution events."""
        job_id = event.job_id

        if event.exception:
            self.state["errors"] = self.state.get("errors", 0) + 1
            logger.error(f"Job {job_id} FAILED: {event.exception}")
        else:
            self.state["jobs_run"] = self.state.get("jobs_run", 0) + 1
            logger.debug(f"Job {job_id} completed successfully")

        save_state(self.state)

        # Notify callbacks
        for callback in self._job_callbacks:
            try:
                callback(job_id, event.exception)
            except:
                pass

    def add_job_callback(self, callback: Callable) -> None:
        """Add a callback to be notified when jobs complete."""
        self._job_callbacks.append(callback)

    # ═══════════════════════════════════════════════════════════════════════════
    # BACKGROUND JOBS
    # ═══════════════════════════════════════════════════════════════════════════

    def check_emails(self) -> Dict[str, Any]:
        """
        Check emails for urgent items needing attention.

        Runs every 5 minutes (configurable).
        Generates nudges for:
        - Urgent emails
        - Emails needing response
        - Action items from emails
        """
        logger.info("Checking emails...")
        result = {"checked": False, "nudges_created": 0}

        try:
            if not self.email_integration:
                logger.warning("Email integration not available")
                return result

            if not self.email_integration.is_connected():
                logger.warning("Email not connected - skipping check")
                return result

            # Get email context
            context = self.email_integration.get_email_context_for_pm()
            result["checked"] = True

            # Check for urgent emails
            if context.get("urgent_emails"):
                for email in context["urgent_emails"]:
                    if self.nudge_engine:
                        self.nudge_engine.create_urgent_email_nudge(email)
                        result["nudges_created"] += 1

            # Update state
            self.state["last_email_check"] = datetime.now().isoformat()
            save_state(self.state)

            logger.info(f"Email check complete: {context.get('unread_count', 0)} unread, "
                       f"{context.get('urgent_count', 0)} urgent")

            return result

        except Exception as e:
            logger.error(f"Email check failed: {e}")
            return result

    def check_calendar(self) -> Dict[str, Any]:
        """
        Check calendar for upcoming events and conflicts.

        Runs every hour (configurable).
        Generates nudges for:
        - Events starting soon
        - Prep time needed
        - Scheduling conflicts
        """
        logger.info("Checking calendar...")
        result = {"checked": False, "nudges_created": 0}

        try:
            if not self.calendar_integration:
                logger.warning("Calendar integration not available")
                return result

            if not self.calendar_integration.is_connected():
                logger.warning("Calendar not connected - skipping check")
                return result

            # Get calendar context
            context = self.calendar_integration.get_calendar_context_for_pm()
            result["checked"] = True

            # Check for events starting soon
            if context.get("events_starting_soon"):
                for event in context["events_starting_soon"]:
                    if self.nudge_engine and not event.get("is_all_day"):
                        self.nudge_engine.create_event_reminder_nudge(event)
                        result["nudges_created"] += 1

            # Check if prep time needed
            if context.get("prep_needed"):
                if self.nudge_engine:
                    self.nudge_engine.create_prep_time_nudge(
                        context.get("next_event", {}),
                        context.get("prep_warning", "")
                    )
                    result["nudges_created"] += 1

            # Update state
            self.state["last_calendar_check"] = datetime.now().isoformat()
            save_state(self.state)

            logger.info(f"Calendar check complete: {context.get('events_today_count', 0)} events today")

            return result

        except Exception as e:
            logger.error(f"Calendar check failed: {e}")
            return result

    def check_relationships(self) -> Dict[str, Any]:
        """
        Check relationship contact frequency.

        Runs daily at 9am.
        Generates nudges for:
        - Contacts not reached out to in a while
        - Upcoming birthdays/anniversaries
        """
        logger.info("Checking relationships...")
        result = {"checked": False, "nudges_created": 0}

        try:
            if not self.nudge_engine:
                logger.warning("Nudge engine not available")
                return result

            # Generate relationship nudges
            nudges = self.nudge_engine.analyze_contact_frequency()
            result["nudges_created"] = len(nudges)
            result["checked"] = True

            # Check for upcoming important dates
            date_nudges = self.nudge_engine.check_important_dates()
            result["nudges_created"] += len(date_nudges)

            # Update state
            self.state["last_relationship_check"] = datetime.now().isoformat()
            save_state(self.state)

            logger.info(f"Relationship check complete: {result['nudges_created']} nudges created")

            return result

        except Exception as e:
            logger.error(f"Relationship check failed: {e}")
            return result

    def check_goals(self) -> Dict[str, Any]:
        """
        Check goal progress and generate accountability nudges.

        Runs 4 times per day during waking hours.
        """
        logger.info("Checking goals...")
        result = {"checked": False, "nudges_created": 0}

        try:
            if not self.nudge_engine:
                logger.warning("Nudge engine not available")
                return result

            # Check goal progress
            nudges = self.nudge_engine.check_goal_progress()
            result["nudges_created"] = len(nudges)
            result["checked"] = True

            logger.info(f"Goal check complete: {result['nudges_created']} nudges created")

            return result

        except Exception as e:
            logger.error(f"Goal check failed: {e}")
            return result

    def generate_morning_brief(self) -> Dict[str, Any]:
        """
        Generate the morning brief.

        Runs at user's configured wake time.
        Includes:
        - Today's calendar events
        - Urgent emails
        - Tasks due today
        - Relationship reminders
        - Weather (if configured)
        """
        logger.info("Generating morning brief...")
        result = {"generated": False, "sections": []}

        try:
            brief = {
                "generated_at": datetime.now().isoformat(),
                "date": datetime.now().strftime("%A, %B %d, %Y"),
                "sections": []
            }

            # Calendar section
            if self.calendar_integration and self.calendar_integration.is_connected():
                context = self.calendar_integration.get_calendar_context_for_pm()
                events_today = context.get("events_today", [])
                brief["sections"].append({
                    "title": "Today's Schedule",
                    "type": "calendar",
                    "count": len(events_today),
                    "items": events_today[:5]
                })
                result["sections"].append("calendar")

            # Email section
            if self.email_integration and self.email_integration.is_connected():
                context = self.email_integration.get_email_context_for_pm()
                brief["sections"].append({
                    "title": "Email Summary",
                    "type": "email",
                    "unread_count": context.get("unread_count", 0),
                    "urgent_count": context.get("urgent_count", 0),
                    "needs_response_count": context.get("needs_response_count", 0)
                })
                result["sections"].append("email")

            # Tasks section
            try:
                board_file = APP_DIR / "board.json"
                if board_file.exists():
                    board = json.loads(board_file.read_text())
                    tasks = board.get("tasks", [])
                    pending = [t for t in tasks if t.get("status") == "pending"]
                    in_progress = [t for t in tasks if t.get("status") == "in_progress"]

                    brief["sections"].append({
                        "title": "Tasks",
                        "type": "tasks",
                        "pending_count": len(pending),
                        "in_progress_count": len(in_progress),
                        "top_tasks": pending[:3]
                    })
                    result["sections"].append("tasks")
            except Exception as e:
                logger.warning(f"Could not load tasks: {e}")

            # Relationship section
            if self.nudge_engine:
                birthdays = self.nudge_engine.get_upcoming_birthdays(days=7)
                if birthdays:
                    brief["sections"].append({
                        "title": "Upcoming Birthdays",
                        "type": "birthdays",
                        "items": birthdays
                    })
                    result["sections"].append("birthdays")

            # Save the morning brief
            morning_brief_file = APP_DIR / ".morning_brief.json"
            morning_brief_file.write_text(json.dumps(brief, indent=2, default=str))

            # Create a nudge for the morning brief
            if self.nudge_engine:
                self.nudge_engine.create_morning_brief_nudge(brief)

            # Update state
            self.state["last_morning_brief"] = datetime.now().isoformat()
            save_state(self.state)

            result["generated"] = True
            logger.info(f"Morning brief generated with {len(brief['sections'])} sections")

            return result

        except Exception as e:
            logger.error(f"Morning brief generation failed: {e}")
            return result

    # ═══════════════════════════════════════════════════════════════════════════
    # STATUS AND CONTROL
    # ═══════════════════════════════════════════════════════════════════════════

    def get_status(self) -> Dict[str, Any]:
        """Get the current status of the Life Organizer."""
        status = {
            "running": self._running,
            "user_id": self.user_id,
            "state": self.state,
            "settings": self.settings,
            "scheduled_jobs": [],
            "next_runs": {}
        }

        if self.scheduler and self._running:
            jobs = self.scheduler.get_jobs()
            for job in jobs:
                status["scheduled_jobs"].append({
                    "id": job.id,
                    "name": job.name,
                    "next_run": job.next_run_time.isoformat() if job.next_run_time else None
                })
                status["next_runs"][job.id] = job.next_run_time.isoformat() if job.next_run_time else None

        return status

    def update_settings(self, new_settings: Dict[str, Any]) -> None:
        """Update user settings and reschedule jobs if needed."""
        self.settings.update(new_settings)
        save_user_settings(self.settings)

        # Reschedule jobs if scheduler is running
        if self._running and self.scheduler:
            self._schedule_jobs()
            logger.info("Jobs rescheduled with new settings")

    def trigger_job(self, job_id: str) -> bool:
        """Manually trigger a specific job."""
        if not self._running:
            logger.warning("Life Organizer not running")
            return False

        job_map = {
            "email_check": self.check_emails,
            "calendar_check": self.check_calendar,
            "relationship_check": self.check_relationships,
            "morning_brief": self.generate_morning_brief,
            "goal_check": self.check_goals
        }

        if job_id in job_map:
            logger.info(f"Manually triggering job: {job_id}")
            job_map[job_id]()
            return True

        logger.warning(f"Unknown job ID: {job_id}")
        return False

    def is_quiet_hours(self) -> bool:
        """Check if currently in quiet hours."""
        now = datetime.now()
        quiet_start = self.settings.get("quiet_start_hour", DEFAULT_QUIET_START)
        quiet_end = self.settings.get("quiet_end_hour", DEFAULT_QUIET_END)

        current_hour = now.hour

        # Handle overnight quiet hours (e.g., 22:00 to 07:00)
        if quiet_start > quiet_end:
            return current_hour >= quiet_start or current_hour < quiet_end
        else:
            return quiet_start <= current_hour < quiet_end


# ═══════════════════════════════════════════════════════════════════════════════
# GLOBAL INSTANCE
# ═══════════════════════════════════════════════════════════════════════════════

_life_organizer: Optional[LifeOrganizer] = None


def get_life_organizer(user_id: str = "default") -> LifeOrganizer:
    """Get or create the Life Organizer instance."""
    global _life_organizer
    if _life_organizer is None or _life_organizer.user_id != user_id:
        _life_organizer = LifeOrganizer(user_id)
    return _life_organizer


# ═══════════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    """CLI interface for Life Organizer."""
    import argparse

    parser = argparse.ArgumentParser(description="TinyPM Life Organizer")
    parser.add_argument("command", nargs="?", default="start",
                       choices=["start", "status", "trigger", "stop"],
                       help="Command to run")
    parser.add_argument("--job", type=str, help="Job ID for trigger command")
    parser.add_argument("--foreground", action="store_true",
                       help="Run in foreground (don't exit)")

    args = parser.parse_args()

    organizer = get_life_organizer()

    if args.command == "start":
        print("=" * 60)
        print("TinyPM Life Organizer - Always-On Proactive Engine")
        print("=" * 60)

        if not APSCHEDULER_AVAILABLE:
            print("\nERROR: APScheduler not installed")
            print("Run: pip install apscheduler")
            return

        if organizer.start():
            print("\nLife Organizer is running!")
            print("Background jobs scheduled:")
            for job in organizer.scheduler.get_jobs():
                next_run = job.next_run_time.strftime("%H:%M:%S") if job.next_run_time else "N/A"
                print(f"  - {job.name}: next run at {next_run}")

            if args.foreground:
                print("\nRunning in foreground. Press Ctrl+C to stop.")
                try:
                    while True:
                        time.sleep(1)
                except KeyboardInterrupt:
                    print("\nShutting down...")
                    organizer.stop()
            else:
                print("\nRunning in background. Use 'status' to check.")
        else:
            print("Failed to start Life Organizer")

    elif args.command == "status":
        status = organizer.get_status()
        print("\n" + "=" * 40)
        print("Life Organizer Status")
        print("=" * 40)
        print(f"Running: {status['running']}")
        print(f"User: {status['user_id']}")
        print(f"Started: {status['state'].get('started_at', 'N/A')}")
        print(f"Jobs run: {status['state'].get('jobs_run', 0)}")
        print(f"Errors: {status['state'].get('errors', 0)}")
        print(f"Nudges generated: {status['state'].get('nudges_generated', 0)}")

        if status["scheduled_jobs"]:
            print("\nScheduled Jobs:")
            for job in status["scheduled_jobs"]:
                print(f"  - {job['name']}: {job['next_run']}")

    elif args.command == "trigger":
        if not args.job:
            print("Error: --job is required for trigger command")
            print("Available jobs: email_check, calendar_check, relationship_check, morning_brief, goal_check")
            return

        if organizer.trigger_job(args.job):
            print(f"Triggered job: {args.job}")
        else:
            print(f"Failed to trigger job: {args.job}")

    elif args.command == "stop":
        organizer.stop()
        print("Life Organizer stopped")


if __name__ == "__main__":
    main()
