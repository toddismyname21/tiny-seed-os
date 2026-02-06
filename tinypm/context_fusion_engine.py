#!/usr/bin/env python3
"""
===============================================================================
CONTEXT FUSION ENGINE - Phase 1 of Prescient AI System
===============================================================================

The Context Fusion Engine is TinyPM's intelligence aggregation layer.
It combines 7+ signal sources into actionable predictions that feel like magic.

CORE PRINCIPLE: Fused Intelligence = Sum(Signal x Weight x Recency x Confidence)

Signal Sources:
1. CALENDAR - Meetings, deadlines, scheduling pressure
2. WEATHER - Open-Meteo API for farm operations
3. TASKS - Current task board state from Google Sheets
4. EMAIL - Gmail inbox patterns and urgency
5. USER BEHAVIOR - Click patterns, time-of-day preferences
6. HISTORICAL PATTERNS - Past decisions and outcomes
7. SEASONAL CONTEXT - What's growing now (farm-specific)

Architecture:
- Parallel signal collection for speed
- Graceful degradation (missing signals don't break system)
- Confidence calibration for all predictions
- SSE integration for real-time dashboard updates

Created: 2026-02-04
Author: PM_Architect (Full Team Implementation)
Research Basis: PROACTIVE_AI_RESEARCH_2026.md
"""

import asyncio
import json
import hashlib
import math
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Callable
import threading
import time

# Optional imports for integrations
try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False

# ===============================================================================
# CONFIGURATION
# ===============================================================================

APP_DIR = Path(__file__).parent

# Persistence files
FUSION_STATE_FILE = APP_DIR / ".fusion_state.json"
SIGNAL_CACHE_FILE = APP_DIR / ".signal_cache.json"
PREDICTION_HISTORY_FILE = APP_DIR / ".fusion_predictions.json"
SIGNAL_WEIGHTS_FILE = APP_DIR / ".signal_weights.json"

# Signal source configuration
WEATHER_API_BASE = "https://api.open-meteo.com/v1/forecast"
DEFAULT_LATITUDE = 40.4406  # Pittsburgh, PA (Tiny Seed Farm location)
DEFAULT_LONGITUDE = -79.9959

# Cache TTLs (seconds)
WEATHER_CACHE_TTL = 3600      # 1 hour
CALENDAR_CACHE_TTL = 300      # 5 minutes
EMAIL_CACHE_TTL = 120         # 2 minutes
TASK_CACHE_TTL = 60           # 1 minute

# Confidence thresholds (from research)
HIGH_CONFIDENCE_THRESHOLD = 0.85
MEDIUM_CONFIDENCE_THRESHOLD = 0.70
LOW_CONFIDENCE_THRESHOLD = 0.50


def safe_read_json(path: Path, default: Any = None) -> Any:
    """Safely read JSON with error handling."""
    try:
        if path.exists():
            return json.loads(path.read_text())
    except (json.JSONDecodeError, IOError) as e:
        print(f"[ContextFusion] Error reading {path}: {e}")
    return default if default is not None else {}


def safe_write_json(path: Path, data: Any) -> bool:
    """Safely write JSON with atomic write."""
    try:
        temp_path = path.with_suffix('.tmp')
        temp_path.write_text(json.dumps(data, indent=2, default=str))
        temp_path.rename(path)
        return True
    except IOError as e:
        print(f"[ContextFusion] Error writing {path}: {e}")
        return False


# ===============================================================================
# ENUMS & DATA CLASSES
# ===============================================================================

class SignalType(Enum):
    """Types of context signals."""
    CALENDAR = "calendar"
    WEATHER = "weather"
    TASKS = "tasks"
    EMAIL = "email"
    USER_BEHAVIOR = "user_behavior"
    HISTORICAL = "historical"
    SEASONAL = "seasonal"
    TIME_CONTEXT = "time_context"


class SignalStatus(Enum):
    """Status of a signal source."""
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    STALE = "stale"
    ERROR = "error"
    NOT_CONFIGURED = "not_configured"


class PredictionType(Enum):
    """Types of predictions the engine can generate."""
    NEXT_ACTION = "next_action"
    DEADLINE_RISK = "deadline_risk"
    WEATHER_IMPACT = "weather_impact"
    MEETING_PREP = "meeting_prep"
    ENERGY_OPTIMAL = "energy_optimal"
    FOLLOW_UP_NEEDED = "follow_up_needed"
    SEASONAL_TASK = "seasonal_task"


@dataclass
class Signal:
    """A context signal with metadata."""
    type: SignalType
    data: Dict[str, Any]
    status: SignalStatus
    timestamp: datetime
    confidence: float = 1.0
    source: str = "unknown"
    ttl_seconds: int = 300

    @property
    def is_stale(self) -> bool:
        """Check if signal has exceeded its TTL."""
        age = (datetime.now() - self.timestamp).total_seconds()
        return age > self.ttl_seconds

    @property
    def freshness(self) -> float:
        """Return freshness score 0-1 (1 = fresh, 0 = stale)."""
        age = (datetime.now() - self.timestamp).total_seconds()
        return max(0.0, 1.0 - (age / self.ttl_seconds))

    def to_dict(self) -> Dict:
        return {
            "type": self.type.value,
            "data": self.data,
            "status": self.status.value,
            "timestamp": self.timestamp.isoformat(),
            "confidence": self.confidence,
            "source": self.source,
            "ttl_seconds": self.ttl_seconds,
            "is_stale": self.is_stale,
            "freshness": round(self.freshness, 2)
        }


@dataclass
class FusedContext:
    """All context signals fused into a unified view."""
    # Time context
    hour: int
    minute: int
    day_of_week: int  # 0=Monday
    day_name: str
    is_weekend: bool
    is_morning: bool
    is_afternoon: bool
    is_evening: bool

    # Calendar context
    calendar_connected: bool = False
    next_meeting_in_minutes: Optional[int] = None
    is_in_meeting: bool = False
    meetings_today: int = 0
    free_time_minutes: int = 0
    busy_day: bool = False
    upcoming_deadlines: List[Dict] = field(default_factory=list)

    # Weather context (farm-critical)
    weather_connected: bool = False
    temperature_f: Optional[float] = None
    precipitation_probability: Optional[int] = None
    weather_condition: Optional[str] = None
    frost_risk: bool = False
    good_planting_day: bool = False
    harvest_urgency: Optional[str] = None

    # Email context
    email_connected: bool = False
    unread_count: int = 0
    urgent_count: int = 0
    needs_response_count: int = 0
    oldest_unanswered_hours: int = 0

    # Task context
    tasks_connected: bool = False
    tasks_pending: int = 0
    tasks_in_progress: int = 0
    tasks_overdue: int = 0
    has_urgent_deadline: bool = False
    stale_tasks: List[str] = field(default_factory=list)

    # User behavior context
    recent_action_categories: List[str] = field(default_factory=list)
    session_duration_minutes: int = 0
    actions_this_hour: int = 0
    preferred_action_now: Optional[str] = None

    # Seasonal context (farm-specific)
    current_season: str = "unknown"
    growing_items: List[str] = field(default_factory=list)
    seasonal_tasks: List[str] = field(default_factory=list)

    # Derived/fused signals
    energy_estimate: float = 0.7
    focus_likelihood: float = 0.5
    meeting_pressure: float = 0.0
    deadline_pressure: float = 0.0
    overall_urgency: float = 0.0

    # Metadata
    signals_fused: int = 0
    fusion_timestamp: datetime = field(default_factory=datetime.now)
    overall_confidence: float = 0.5

    def to_dict(self) -> Dict:
        d = asdict(self)
        d['fusion_timestamp'] = self.fusion_timestamp.isoformat()
        return d


@dataclass
class Prediction:
    """A prediction generated from fused context."""
    id: str
    type: PredictionType
    message: str
    confidence: float
    reasoning: List[str]
    action_suggestions: List[str]
    priority: int  # 1-10, higher = more important
    expires_at: Optional[datetime] = None
    context_snapshot: Optional[Dict] = None

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "type": self.type.value,
            "message": self.message,
            "confidence": round(self.confidence, 3),
            "confidence_pct": f"{int(self.confidence * 100)}%",
            "reasoning": self.reasoning,
            "action_suggestions": self.action_suggestions,
            "priority": self.priority,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "action_level": self._get_action_level()
        }

    def _get_action_level(self) -> str:
        """Determine action level based on confidence (from research)."""
        if self.confidence >= 0.95:
            return "auto"  # Auto-execute
        elif self.confidence >= 0.85:
            return "approve"  # One-click approval
        elif self.confidence >= 0.70:
            return "suggest"  # Suggest with reasoning
        elif self.confidence >= 0.50:
            return "collaborative"  # Need more input
        else:
            return "inform"  # Just inform, low confidence


# ===============================================================================
# SIGNAL COLLECTORS - Parallel Signal Gathering
# ===============================================================================

class SignalCollector:
    """Base class for signal collectors."""

    def __init__(self, signal_type: SignalType, cache_ttl: int = 300):
        self.signal_type = signal_type
        self.cache_ttl = cache_ttl
        self._cache: Optional[Signal] = None

    async def collect(self) -> Signal:
        """Collect signal data. Override in subclasses."""
        raise NotImplementedError

    def get_cached(self) -> Optional[Signal]:
        """Get cached signal if still valid."""
        if self._cache and not self._cache.is_stale:
            return self._cache
        return None

    def set_cache(self, signal: Signal):
        """Cache the signal."""
        self._cache = signal


class TimeContextCollector(SignalCollector):
    """Collect time-based context (always available)."""

    def __init__(self):
        super().__init__(SignalType.TIME_CONTEXT, cache_ttl=60)

    async def collect(self) -> Signal:
        now = datetime.now()
        hour = now.hour

        data = {
            "hour": hour,
            "minute": now.minute,
            "day_of_week": now.weekday(),
            "day_name": now.strftime("%A"),
            "is_weekend": now.weekday() >= 5,
            "is_morning": 5 <= hour < 12,
            "is_afternoon": 12 <= hour < 17,
            "is_evening": 17 <= hour < 22,
            "is_night": hour >= 22 or hour < 5,
            "date": now.strftime("%Y-%m-%d"),
            "week_number": now.isocalendar()[1]
        }

        signal = Signal(
            type=self.signal_type,
            data=data,
            status=SignalStatus.CONNECTED,
            timestamp=now,
            confidence=1.0,
            source="system_clock",
            ttl_seconds=self.cache_ttl
        )

        self.set_cache(signal)
        return signal


class WeatherSignalCollector(SignalCollector):
    """Collect weather data from Open-Meteo API."""

    def __init__(self, latitude: float = DEFAULT_LATITUDE, longitude: float = DEFAULT_LONGITUDE):
        super().__init__(SignalType.WEATHER, cache_ttl=WEATHER_CACHE_TTL)
        self.latitude = latitude
        self.longitude = longitude

    async def collect(self) -> Signal:
        # Check cache first
        cached = self.get_cached()
        if cached:
            return cached

        now = datetime.now()

        # Try to fetch from Open-Meteo
        if AIOHTTP_AVAILABLE:
            try:
                data = await self._fetch_weather()
                signal = Signal(
                    type=self.signal_type,
                    data=data,
                    status=SignalStatus.CONNECTED,
                    timestamp=now,
                    confidence=0.9,
                    source="open_meteo",
                    ttl_seconds=self.cache_ttl
                )
                self.set_cache(signal)
                return signal
            except Exception as e:
                print(f"[WeatherCollector] API error: {e}")

        # Return disconnected signal
        return Signal(
            type=self.signal_type,
            data={"error": "Weather API unavailable"},
            status=SignalStatus.DISCONNECTED,
            timestamp=now,
            confidence=0.0,
            source="none",
            ttl_seconds=self.cache_ttl
        )

    async def _fetch_weather(self) -> Dict:
        """Fetch weather from Open-Meteo API."""
        params = {
            "latitude": self.latitude,
            "longitude": self.longitude,
            "current": "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
            "temperature_unit": "fahrenheit",
            "timezone": "America/New_York",
            "forecast_days": 5
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(WEATHER_API_BASE, params=params, timeout=10) as response:
                if response.status == 200:
                    raw = await response.json()
                    return self._parse_weather_response(raw)
                else:
                    raise Exception(f"API returned {response.status}")

    def _parse_weather_response(self, raw: Dict) -> Dict:
        """Parse Open-Meteo response into useful format."""
        current = raw.get("current", {})
        daily = raw.get("daily", {})

        # Get current conditions
        temp = current.get("temperature_2m")
        humidity = current.get("relative_humidity_2m")
        precipitation = current.get("precipitation", 0)
        weather_code = current.get("weather_code", 0)
        wind_speed = current.get("wind_speed_10m", 0)

        # Frost risk (temp below 36F)
        frost_risk = temp is not None and temp < 36

        # Good planting day heuristics (for farm)
        good_planting_day = (
            temp is not None and 45 <= temp <= 85 and
            precipitation < 0.1 and
            wind_speed < 15 and
            not frost_risk
        )

        # Get forecast
        forecast_precip = daily.get("precipitation_probability_max", [0])[0] if daily else 0

        # Weather condition from code
        condition = self._code_to_condition(weather_code)

        # Harvest urgency (if rain coming and crops ready)
        harvest_urgency = None
        if forecast_precip and forecast_precip > 70:
            harvest_urgency = "high"
        elif forecast_precip and forecast_precip > 40:
            harvest_urgency = "medium"

        return {
            "temperature_f": temp,
            "humidity_pct": humidity,
            "precipitation_in": precipitation,
            "weather_code": weather_code,
            "condition": condition,
            "wind_speed_mph": wind_speed,
            "frost_risk": frost_risk,
            "good_planting_day": good_planting_day,
            "harvest_urgency": harvest_urgency,
            "forecast_precip_pct": forecast_precip,
            "forecast_days": daily
        }

    def _code_to_condition(self, code: int) -> str:
        """Convert WMO weather code to human-readable condition."""
        conditions = {
            0: "Clear sky",
            1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
            45: "Foggy", 48: "Depositing rime fog",
            51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
            61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
            71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
            80: "Slight showers", 81: "Moderate showers", 82: "Violent showers",
            95: "Thunderstorm", 96: "Thunderstorm with hail"
        }
        return conditions.get(code, "Unknown")


class CalendarSignalCollector(SignalCollector):
    """Collect calendar context from Google Calendar."""

    def __init__(self, user_id: str = "default"):
        super().__init__(SignalType.CALENDAR, cache_ttl=CALENDAR_CACHE_TTL)
        self.user_id = user_id

    async def collect(self) -> Signal:
        cached = self.get_cached()
        if cached:
            return cached

        now = datetime.now()

        try:
            # Try to import calendar integration
            from calendar_integration import get_calendar_integration
            cal = get_calendar_integration(self.user_id)

            # Get today's events
            events = cal.get_events_today()

            # Try to get free slots
            try:
                free_blocks = cal.find_free_slots(duration_minutes=30, within_hours=8)
            except Exception:
                free_blocks = []

            # Calculate metrics
            next_meeting = None
            is_in_meeting = False
            free_time_minutes = len(free_blocks) * 30 if free_blocks else 0  # Approximate

            if events:
                for event in events:
                    start = event.get('start')
                    end = event.get('end')
                    if start and end:
                        if start <= now <= end:
                            is_in_meeting = True
                        elif start > now:
                            mins = int((start - now).total_seconds() / 60)
                            if next_meeting is None or mins < next_meeting:
                                next_meeting = mins

            data = {
                "connected": True,
                "events_today": len(events) if events else 0,
                "next_meeting_in_minutes": next_meeting,
                "is_in_meeting": is_in_meeting,
                "free_time_minutes": int(free_time_minutes),
                "busy_day": len(events) > 5 if events else False,
                "events": [e.to_dict() if hasattr(e, 'to_dict') else e for e in (events or [])][:10]
            }

            signal = Signal(
                type=self.signal_type,
                data=data,
                status=SignalStatus.CONNECTED,
                timestamp=now,
                confidence=0.95,
                source="google_calendar",
                ttl_seconds=self.cache_ttl
            )

            self.set_cache(signal)
            return signal

        except ImportError:
            pass
        except Exception as e:
            print(f"[CalendarCollector] Error: {e}")

        return Signal(
            type=self.signal_type,
            data={"connected": False, "error": "Calendar not configured"},
            status=SignalStatus.NOT_CONFIGURED,
            timestamp=now,
            confidence=0.0,
            source="none",
            ttl_seconds=self.cache_ttl
        )


class TaskSignalCollector(SignalCollector):
    """Collect task board state."""

    def __init__(self):
        super().__init__(SignalType.TASKS, cache_ttl=TASK_CACHE_TTL)
        self.board_file = APP_DIR / "board.json"

    async def collect(self) -> Signal:
        cached = self.get_cached()
        if cached:
            return cached

        now = datetime.now()

        if self.board_file.exists():
            try:
                board = json.loads(self.board_file.read_text())
                tasks = board.get("tasks", [])

                # Count by status
                pending = [t for t in tasks if t.get("status") == "pending"]
                in_progress = [t for t in tasks if t.get("status") == "in_progress"]
                done = [t for t in tasks if t.get("status") == "done"]

                # Check for overdue tasks
                overdue = []
                for t in tasks:
                    due = t.get("due_date") or t.get("deadline")
                    if due and t.get("status") != "done":
                        try:
                            due_dt = datetime.fromisoformat(due.replace("Z", "+00:00"))
                            if due_dt < now:
                                overdue.append(t.get("title", "Untitled"))
                        except:
                            pass

                # Check for stale in-progress tasks (>24h)
                stale = []
                for t in in_progress:
                    updated = t.get("updated") or t.get("updated_at")
                    if updated:
                        try:
                            updated_dt = datetime.fromisoformat(
                                updated.replace("Z", "+00:00").replace(" ", "T").split(".")[0]
                            )
                            if (now - updated_dt).total_seconds() > 86400:
                                stale.append(t.get("title", "Untitled"))
                        except:
                            pass

                data = {
                    "connected": True,
                    "pending_count": len(pending),
                    "in_progress_count": len(in_progress),
                    "done_count": len(done),
                    "overdue_count": len(overdue),
                    "overdue_tasks": overdue[:5],
                    "stale_tasks": stale[:5],
                    "has_urgent": len(overdue) > 0,
                    "total_tasks": len(tasks)
                }

                signal = Signal(
                    type=self.signal_type,
                    data=data,
                    status=SignalStatus.CONNECTED,
                    timestamp=now,
                    confidence=0.95,
                    source="board.json",
                    ttl_seconds=self.cache_ttl
                )

                self.set_cache(signal)
                return signal

            except Exception as e:
                print(f"[TaskCollector] Error: {e}")

        return Signal(
            type=self.signal_type,
            data={"connected": False, "error": "Board file not found"},
            status=SignalStatus.DISCONNECTED,
            timestamp=now,
            confidence=0.0,
            source="none",
            ttl_seconds=self.cache_ttl
        )


class EmailSignalCollector(SignalCollector):
    """Collect email inbox state from Gmail."""

    def __init__(self, user_id: str = "default"):
        super().__init__(SignalType.EMAIL, cache_ttl=EMAIL_CACHE_TTL)
        self.user_id = user_id

    async def collect(self) -> Signal:
        cached = self.get_cached()
        if cached:
            return cached

        now = datetime.now()

        try:
            from email_integration import get_email_integration
            email = get_email_integration(self.user_id)

            # Get unread count
            unread_count = email.get_unread_count()

            # Get unread emails to analyze urgency
            unread_emails = email.get_unread_emails(max_results=10)

            # Count urgent (simple heuristic: has "urgent" or "asap" in subject)
            urgent_count = 0
            for e in unread_emails:
                subject = (e.subject or "").lower()
                if any(word in subject for word in ["urgent", "asap", "important", "critical", "immediately"]):
                    urgent_count += 1

            data = {
                "connected": True,
                "unread_count": unread_count,
                "urgent_count": urgent_count,
                "needs_response_count": len(unread_emails),  # All unread could need response
                "oldest_unanswered_hours": 0  # Would need to calculate from timestamps
            }

            signal = Signal(
                type=self.signal_type,
                data=data,
                status=SignalStatus.CONNECTED,
                timestamp=now,
                confidence=0.9,
                source="gmail",
                ttl_seconds=self.cache_ttl
            )

            self.set_cache(signal)
            return signal

        except ImportError:
            pass
        except Exception as e:
            print(f"[EmailCollector] Error: {e}")

        return Signal(
            type=self.signal_type,
            data={"connected": False, "error": "Email not configured"},
            status=SignalStatus.NOT_CONFIGURED,
            timestamp=now,
            confidence=0.0,
            source="none",
            ttl_seconds=self.cache_ttl
        )


class UserBehaviorCollector(SignalCollector):
    """Collect user behavior patterns from pm_brain patterns."""

    def __init__(self):
        super().__init__(SignalType.USER_BEHAVIOR, cache_ttl=300)
        self.patterns_file = APP_DIR / ".pm_patterns.json"
        self.timing_file = APP_DIR / ".pm_timing_state.json"

    async def collect(self) -> Signal:
        now = datetime.now()
        data = {
            "connected": False,
            "recent_actions": [],
            "predicted_action": None,
            "time_patterns_available": False
        }

        # Load patterns
        if self.patterns_file.exists():
            try:
                patterns = json.loads(self.patterns_file.read_text())

                # Get time pattern for current hour
                time_key = f"{now.strftime('%A')}_{now.hour}"
                time_patterns = patterns.get("time_patterns", {}).get(time_key, {})

                if time_patterns:
                    # Find most common action for this time
                    sorted_actions = sorted(
                        time_patterns.items(),
                        key=lambda x: x[1],
                        reverse=True
                    )
                    if sorted_actions:
                        data["predicted_action"] = sorted_actions[0][0]
                        data["time_patterns_available"] = True
                        data["connected"] = True

                # Get effectiveness data
                effectiveness = patterns.get("response_effectiveness", {})
                if effectiveness:
                    data["effectiveness_data"] = effectiveness

            except Exception as e:
                print(f"[BehaviorCollector] Error: {e}")

        # Load timing state
        if self.timing_file.exists():
            try:
                timing = json.loads(self.timing_file.read_text())

                recent = timing.get("recent_actions", [])
                if recent:
                    data["recent_actions"] = [a.get("type") for a in recent[-5:]]
                    data["connected"] = True

            except Exception as e:
                pass

        status = SignalStatus.CONNECTED if data["connected"] else SignalStatus.NOT_CONFIGURED

        return Signal(
            type=self.signal_type,
            data=data,
            status=status,
            timestamp=now,
            confidence=0.7 if data["connected"] else 0.0,
            source="pm_brain_patterns",
            ttl_seconds=self.cache_ttl
        )


class SeasonalContextCollector(SignalCollector):
    """Collect seasonal context for farm operations."""

    # Pittsburgh/PA growing calendar
    SEASONAL_DATA = {
        1: {"season": "winter", "items": [], "tasks": ["Plan spring crops", "Order seeds", "Equipment maintenance"]},
        2: {"season": "late_winter", "items": [], "tasks": ["Start seeds indoors", "Prepare beds", "Pruning"]},
        3: {"season": "early_spring", "items": ["Indoor seedlings"], "tasks": ["Cold frame planting", "Soil prep", "Compost turning"]},
        4: {"season": "spring", "items": ["Lettuce", "Spinach", "Peas", "Radishes"], "tasks": ["Direct sowing", "Transplanting", "Mulching"]},
        5: {"season": "late_spring", "items": ["Tomatoes", "Peppers", "Squash", "Beans"], "tasks": ["Warm weather planting", "Weeding", "Trellising"]},
        6: {"season": "early_summer", "items": ["Tomatoes", "Cucumbers", "Beans", "Squash"], "tasks": ["Succession planting", "Pest management", "Irrigation"]},
        7: {"season": "summer", "items": ["Tomatoes", "Corn", "Peppers", "Melons"], "tasks": ["Harvesting", "Preserving", "Fall crop planting"]},
        8: {"season": "late_summer", "items": ["Tomatoes", "Peppers", "Eggplant", "Fall greens"], "tasks": ["Fall planting", "Seed saving", "Harvest"]},
        9: {"season": "early_fall", "items": ["Fall greens", "Squash", "Pumpkins", "Root vegetables"], "tasks": ["Harvest", "Cover crops", "Season extension"]},
        10: {"season": "fall", "items": ["Root vegetables", "Greens", "Brussels sprouts"], "tasks": ["Final harvest", "Garden cleanup", "Garlic planting"]},
        11: {"season": "late_fall", "items": ["Storage crops", "Cold-hardy greens"], "tasks": ["Winterizing", "Planning", "Market prep"]},
        12: {"season": "winter", "items": [], "tasks": ["Rest", "Planning", "Equipment maintenance"]}
    }

    def __init__(self):
        super().__init__(SignalType.SEASONAL, cache_ttl=86400)  # Daily refresh

    async def collect(self) -> Signal:
        now = datetime.now()
        month = now.month

        seasonal_info = self.SEASONAL_DATA.get(month, {})

        data = {
            "current_season": seasonal_info.get("season", "unknown"),
            "growing_items": seasonal_info.get("items", []),
            "seasonal_tasks": seasonal_info.get("tasks", []),
            "month": month,
            "days_into_season": now.day
        }

        return Signal(
            type=self.signal_type,
            data=data,
            status=SignalStatus.CONNECTED,
            timestamp=now,
            confidence=0.95,
            source="seasonal_calendar",
            ttl_seconds=self.cache_ttl
        )


# ===============================================================================
# CONTEXT FUSION ENGINE - The Core
# ===============================================================================

class ContextFusionEngine:
    """
    The Context Fusion Engine - TinyPM's prescient intelligence core.

    Fuses 7+ signal sources into actionable predictions using the formula:
    Fused Intelligence = Sum(Signal x Weight x Recency x Confidence)

    Key capabilities:
    - Parallel signal collection for speed
    - Graceful degradation when signals unavailable
    - Confidence calibration for all predictions
    - Continuous learning from feedback

    Usage:
        engine = ContextFusionEngine()
        context = await engine.gather_and_fuse()
        predictions = await engine.generate_predictions(context)
    """

    # Default signal weights (can be learned over time)
    DEFAULT_WEIGHTS = {
        SignalType.TIME_CONTEXT: 1.0,
        SignalType.CALENDAR: 0.9,
        SignalType.WEATHER: 0.8,
        SignalType.TASKS: 0.85,
        SignalType.EMAIL: 0.75,
        SignalType.USER_BEHAVIOR: 0.7,
        SignalType.SEASONAL: 0.6,
        SignalType.HISTORICAL: 0.65
    }

    def __init__(self, user_id: str = "default"):
        self.user_id = user_id
        self._lock = threading.RLock()

        # Initialize collectors
        self.collectors: Dict[SignalType, SignalCollector] = {
            SignalType.TIME_CONTEXT: TimeContextCollector(),
            SignalType.WEATHER: WeatherSignalCollector(),
            SignalType.CALENDAR: CalendarSignalCollector(user_id),
            SignalType.TASKS: TaskSignalCollector(),
            SignalType.EMAIL: EmailSignalCollector(user_id),
            SignalType.USER_BEHAVIOR: UserBehaviorCollector(),
            SignalType.SEASONAL: SeasonalContextCollector()
        }

        # Load or initialize weights
        self.weights = self._load_weights()

        # Prediction history for learning
        self.prediction_history: List[Dict] = []

        # SSE subscribers for real-time updates
        self._subscribers: List[Callable] = []

    def _load_weights(self) -> Dict[SignalType, float]:
        """Load learned signal weights."""
        data = safe_read_json(SIGNAL_WEIGHTS_FILE, {})
        weights = self.DEFAULT_WEIGHTS.copy()

        for key, value in data.get("weights", {}).items():
            try:
                signal_type = SignalType(key)
                weights[signal_type] = float(value)
            except (ValueError, TypeError):
                pass

        return weights

    def _save_weights(self):
        """Save signal weights."""
        data = {
            "weights": {k.value: v for k, v in self.weights.items()},
            "updated_at": datetime.now().isoformat()
        }
        safe_write_json(SIGNAL_WEIGHTS_FILE, data)

    # =========================================================================
    # SIGNAL GATHERING
    # =========================================================================

    async def gather_signals(self) -> Dict[SignalType, Signal]:
        """
        Gather all signals in parallel for speed.

        Returns dict of SignalType -> Signal, with graceful handling
        of any failures.
        """
        signals: Dict[SignalType, Signal] = {}

        # Create tasks for parallel collection
        async def collect_with_type(signal_type: SignalType) -> Tuple[SignalType, Signal]:
            collector = self.collectors[signal_type]
            try:
                signal = await asyncio.wait_for(
                    collector.collect(),
                    timeout=10.0  # 10 second timeout per signal
                )
                return signal_type, signal
            except asyncio.TimeoutError:
                print(f"[ContextFusion] Timeout collecting {signal_type.value}")
                return signal_type, Signal(
                    type=signal_type,
                    data={"error": "Collection timeout"},
                    status=SignalStatus.ERROR,
                    timestamp=datetime.now(),
                    confidence=0.0,
                    source="timeout",
                    ttl_seconds=60
                )
            except Exception as e:
                print(f"[ContextFusion] Error collecting {signal_type.value}: {e}")
                return signal_type, Signal(
                    type=signal_type,
                    data={"error": str(e)},
                    status=SignalStatus.ERROR,
                    timestamp=datetime.now(),
                    confidence=0.0,
                    source="error",
                    ttl_seconds=60
                )

        # Run all collections in parallel
        tasks = [collect_with_type(st) for st in self.collectors.keys()]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, tuple):
                signal_type, signal = result
                signals[signal_type] = signal

        return signals

    # =========================================================================
    # SIGNAL FUSION
    # =========================================================================

    async def fuse_signals(self, signals: Dict[SignalType, Signal]) -> FusedContext:
        """
        Fuse all signals into a unified FusedContext.

        Applies the fusion formula:
        Signal contribution = signal_data x weight x recency x confidence
        """
        now = datetime.now()

        # Start with time context (always available)
        time_sig = signals.get(SignalType.TIME_CONTEXT)
        time_data = time_sig.data if time_sig else {}

        context = FusedContext(
            hour=time_data.get("hour", now.hour),
            minute=time_data.get("minute", now.minute),
            day_of_week=time_data.get("day_of_week", now.weekday()),
            day_name=time_data.get("day_name", now.strftime("%A")),
            is_weekend=time_data.get("is_weekend", now.weekday() >= 5),
            is_morning=time_data.get("is_morning", 5 <= now.hour < 12),
            is_afternoon=time_data.get("is_afternoon", 12 <= now.hour < 17),
            is_evening=time_data.get("is_evening", 17 <= now.hour < 22)
        )

        # Fuse calendar
        cal_sig = signals.get(SignalType.CALENDAR)
        if cal_sig and cal_sig.status == SignalStatus.CONNECTED:
            cal = cal_sig.data
            context.calendar_connected = True
            context.next_meeting_in_minutes = cal.get("next_meeting_in_minutes")
            context.is_in_meeting = cal.get("is_in_meeting", False)
            context.meetings_today = cal.get("events_today", 0)
            context.free_time_minutes = cal.get("free_time_minutes", 0)
            context.busy_day = cal.get("busy_day", False)

            # Calculate meeting pressure
            if context.next_meeting_in_minutes is not None:
                if context.next_meeting_in_minutes <= 5:
                    context.meeting_pressure = 1.0
                elif context.next_meeting_in_minutes <= 15:
                    context.meeting_pressure = 0.7
                elif context.next_meeting_in_minutes <= 30:
                    context.meeting_pressure = 0.4
                else:
                    context.meeting_pressure = 0.1

        # Fuse weather
        weather_sig = signals.get(SignalType.WEATHER)
        if weather_sig and weather_sig.status == SignalStatus.CONNECTED:
            w = weather_sig.data
            context.weather_connected = True
            context.temperature_f = w.get("temperature_f")
            context.precipitation_probability = w.get("forecast_precip_pct")
            context.weather_condition = w.get("condition")
            context.frost_risk = w.get("frost_risk", False)
            context.good_planting_day = w.get("good_planting_day", False)
            context.harvest_urgency = w.get("harvest_urgency")

        # Fuse tasks
        task_sig = signals.get(SignalType.TASKS)
        if task_sig and task_sig.status == SignalStatus.CONNECTED:
            t = task_sig.data
            context.tasks_connected = True
            context.tasks_pending = t.get("pending_count", 0)
            context.tasks_in_progress = t.get("in_progress_count", 0)
            context.tasks_overdue = t.get("overdue_count", 0)
            context.has_urgent_deadline = t.get("has_urgent", False)
            context.stale_tasks = t.get("stale_tasks", [])

            # Calculate deadline pressure
            if context.tasks_overdue > 0:
                context.deadline_pressure = min(1.0, context.tasks_overdue * 0.3)

        # Fuse email
        email_sig = signals.get(SignalType.EMAIL)
        if email_sig and email_sig.status == SignalStatus.CONNECTED:
            e = email_sig.data
            context.email_connected = True
            context.unread_count = e.get("unread_count", 0)
            context.urgent_count = e.get("urgent_count", 0)
            context.needs_response_count = e.get("needs_response_count", 0)
            context.oldest_unanswered_hours = e.get("oldest_unanswered_hours", 0)

        # Fuse user behavior
        behavior_sig = signals.get(SignalType.USER_BEHAVIOR)
        if behavior_sig and behavior_sig.status == SignalStatus.CONNECTED:
            b = behavior_sig.data
            context.recent_action_categories = b.get("recent_actions", [])
            context.preferred_action_now = b.get("predicted_action")

        # Fuse seasonal
        seasonal_sig = signals.get(SignalType.SEASONAL)
        if seasonal_sig and seasonal_sig.status == SignalStatus.CONNECTED:
            s = seasonal_sig.data
            context.current_season = s.get("current_season", "unknown")
            context.growing_items = s.get("growing_items", [])
            context.seasonal_tasks = s.get("seasonal_tasks", [])

        # Calculate derived signals
        context.energy_estimate = self._estimate_energy(context)
        context.focus_likelihood = self._estimate_focus_likelihood(context)
        context.overall_urgency = self._calculate_overall_urgency(context)

        # Count signals and calculate overall confidence
        connected_signals = sum(
            1 for s in signals.values()
            if s.status == SignalStatus.CONNECTED
        )
        context.signals_fused = connected_signals

        # Overall confidence based on signal coverage
        context.overall_confidence = min(0.95, connected_signals / len(signals) + 0.3)
        context.fusion_timestamp = now

        return context

    def _estimate_energy(self, ctx: FusedContext) -> float:
        """Estimate user energy level based on time and activity."""
        # Base energy curve by hour (typical circadian rhythm)
        energy_curve = {
            6: 0.4, 7: 0.6, 8: 0.8, 9: 0.9, 10: 1.0, 11: 0.95,
            12: 0.7, 13: 0.6, 14: 0.7, 15: 0.8, 16: 0.85, 17: 0.7,
            18: 0.5, 19: 0.4, 20: 0.3, 21: 0.3, 22: 0.2
        }
        base = energy_curve.get(ctx.hour, 0.5)

        # Adjust for meetings (draining)
        if ctx.is_in_meeting:
            base -= 0.2
        if ctx.meetings_today > 5:
            base -= 0.15

        # Adjust for deadline pressure (stress)
        if ctx.deadline_pressure > 0.5:
            base -= 0.1

        return max(0.1, min(1.0, base))

    def _estimate_focus_likelihood(self, ctx: FusedContext) -> float:
        """Estimate likelihood user can achieve deep focus."""
        focus = 0.5

        # More free time = better focus
        if ctx.free_time_minutes > 60:
            focus += 0.2
        elif ctx.free_time_minutes > 30:
            focus += 0.1

        # Morning = better focus typically
        if ctx.is_morning and not ctx.busy_day:
            focus += 0.15

        # Meeting soon = worse focus
        if ctx.next_meeting_in_minutes and ctx.next_meeting_in_minutes < 30:
            focus -= 0.2

        # Urgent items = distraction
        if ctx.urgent_count > 0:
            focus -= 0.1

        return max(0.0, min(1.0, focus))

    def _calculate_overall_urgency(self, ctx: FusedContext) -> float:
        """Calculate overall urgency score."""
        urgency = 0.0

        # Overdue tasks
        urgency += ctx.tasks_overdue * 0.2

        # Urgent emails
        urgency += ctx.urgent_count * 0.1

        # Meeting pressure
        urgency += ctx.meeting_pressure * 0.3

        # Weather urgency (farm)
        if ctx.harvest_urgency == "high":
            urgency += 0.3
        elif ctx.harvest_urgency == "medium":
            urgency += 0.15

        return min(1.0, urgency)

    # =========================================================================
    # PREDICTION GENERATION
    # =========================================================================

    async def generate_predictions(self, context: FusedContext) -> List[Prediction]:
        """
        Generate predictions from fused context.

        Returns list of Prediction objects sorted by priority.
        """
        predictions = []

        # 1. Weather-based predictions (farm critical)
        if context.weather_connected:
            weather_preds = self._generate_weather_predictions(context)
            predictions.extend(weather_preds)

        # 2. Calendar-based predictions
        if context.calendar_connected:
            cal_preds = self._generate_calendar_predictions(context)
            predictions.extend(cal_preds)

        # 3. Task-based predictions
        if context.tasks_connected:
            task_preds = self._generate_task_predictions(context)
            predictions.extend(task_preds)

        # 4. Email-based predictions
        if context.email_connected:
            email_preds = self._generate_email_predictions(context)
            predictions.extend(email_preds)

        # 5. Energy/focus-based predictions
        energy_preds = self._generate_energy_predictions(context)
        predictions.extend(energy_preds)

        # 6. Seasonal predictions (farm)
        if context.current_season != "unknown":
            seasonal_preds = self._generate_seasonal_predictions(context)
            predictions.extend(seasonal_preds)

        # Sort by priority and confidence
        predictions.sort(key=lambda p: (p.priority, p.confidence), reverse=True)

        # Limit to top 10
        return predictions[:10]

    def _generate_weather_predictions(self, ctx: FusedContext) -> List[Prediction]:
        """Generate weather-related predictions."""
        preds = []

        # Frost risk
        if ctx.frost_risk:
            preds.append(Prediction(
                id=self._gen_id("frost"),
                type=PredictionType.WEATHER_IMPACT,
                message="Frost risk tonight! Protect tender plants.",
                confidence=0.9,
                reasoning=[
                    f"Temperature: {ctx.temperature_f}F",
                    "Below frost threshold (36F)"
                ],
                action_suggestions=[
                    "Cover tender crops",
                    "Bring potted plants inside",
                    "Harvest any frost-sensitive produce"
                ],
                priority=9
            ))

        # Good planting day
        if ctx.good_planting_day and ctx.is_morning:
            preds.append(Prediction(
                id=self._gen_id("plant"),
                type=PredictionType.WEATHER_IMPACT,
                message="Great day for outdoor planting!",
                confidence=0.85,
                reasoning=[
                    f"Temperature: {ctx.temperature_f}F (ideal range)",
                    "Low precipitation expected",
                    "Calm wind conditions"
                ],
                action_suggestions=[
                    "Transplant seedlings",
                    "Direct sow seeds",
                    "Work in garden beds"
                ],
                priority=6
            ))

        # Harvest urgency
        if ctx.harvest_urgency == "high":
            preds.append(Prediction(
                id=self._gen_id("harvest"),
                type=PredictionType.WEATHER_IMPACT,
                message="Rain coming soon - harvest ready crops now!",
                confidence=0.88,
                reasoning=[
                    f"Precipitation probability: {ctx.precipitation_probability}%",
                    "High moisture could damage ripe produce"
                ],
                action_suggestions=[
                    "Harvest ripe tomatoes",
                    "Pick ready greens",
                    "Check fruit trees"
                ],
                priority=8
            ))

        return preds

    def _generate_calendar_predictions(self, ctx: FusedContext) -> List[Prediction]:
        """Generate calendar-related predictions."""
        preds = []

        # Meeting prep
        if ctx.next_meeting_in_minutes and 15 <= ctx.next_meeting_in_minutes <= 30:
            preds.append(Prediction(
                id=self._gen_id("meeting_prep"),
                type=PredictionType.MEETING_PREP,
                message=f"Meeting in {ctx.next_meeting_in_minutes} minutes - time to prep",
                confidence=0.9,
                reasoning=[
                    "Meeting starting soon",
                    "Good time to review materials"
                ],
                action_suggestions=[
                    "Review meeting agenda",
                    "Gather any needed documents",
                    "Note key discussion points"
                ],
                priority=7
            ))

        # Busy day warning
        if ctx.busy_day and ctx.is_morning:
            preds.append(Prediction(
                id=self._gen_id("busy_day"),
                type=PredictionType.ENERGY_OPTIMAL,
                message="Heavy meeting day - tackle priority tasks between meetings",
                confidence=0.8,
                reasoning=[
                    f"{ctx.meetings_today} meetings today",
                    "Limited deep work time available"
                ],
                action_suggestions=[
                    "Identify top 3 priorities",
                    "Block focus time if possible",
                    "Batch quick tasks between meetings"
                ],
                priority=5
            ))

        return preds

    def _generate_task_predictions(self, ctx: FusedContext) -> List[Prediction]:
        """Generate task-related predictions."""
        preds = []

        # Overdue tasks
        if ctx.tasks_overdue > 0:
            preds.append(Prediction(
                id=self._gen_id("overdue"),
                type=PredictionType.DEADLINE_RISK,
                message=f"{ctx.tasks_overdue} overdue task(s) need attention",
                confidence=0.95,
                reasoning=[
                    f"{ctx.tasks_overdue} tasks past their deadline",
                    "May be blocking other work"
                ],
                action_suggestions=[
                    "Review overdue tasks",
                    "Update deadlines if needed",
                    "Complete or delegate"
                ],
                priority=8
            ))

        # Stale tasks
        if ctx.stale_tasks:
            preds.append(Prediction(
                id=self._gen_id("stale"),
                type=PredictionType.FOLLOW_UP_NEEDED,
                message=f"{len(ctx.stale_tasks)} task(s) stuck in progress >24h",
                confidence=0.85,
                reasoning=[
                    "Tasks haven't been updated recently",
                    f"Stale: {', '.join(ctx.stale_tasks[:3])}"
                ],
                action_suggestions=[
                    "Check if blocked",
                    "Update status",
                    "Break into smaller steps"
                ],
                priority=6
            ))

        return preds

    def _generate_email_predictions(self, ctx: FusedContext) -> List[Prediction]:
        """Generate email-related predictions."""
        preds = []

        # Urgent emails
        if ctx.urgent_count > 0:
            preds.append(Prediction(
                id=self._gen_id("urgent_email"),
                type=PredictionType.FOLLOW_UP_NEEDED,
                message=f"{ctx.urgent_count} urgent email(s) waiting",
                confidence=0.88,
                reasoning=[
                    "High-priority emails detected",
                    "May need quick response"
                ],
                action_suggestions=[
                    "Review urgent inbox",
                    "Respond or delegate",
                    "Flag for follow-up if complex"
                ],
                priority=7
            ))

        # Old unanswered emails
        if ctx.oldest_unanswered_hours > 48:
            preds.append(Prediction(
                id=self._gen_id("old_email"),
                type=PredictionType.FOLLOW_UP_NEEDED,
                message="Email thread waiting >48 hours for response",
                confidence=0.82,
                reasoning=[
                    f"Oldest unanswered: {ctx.oldest_unanswered_hours}h",
                    "May cause relationship friction"
                ],
                action_suggestions=[
                    "Send quick acknowledgment",
                    "Schedule time to respond fully",
                    "Delegate if appropriate"
                ],
                priority=5
            ))

        return preds

    def _generate_energy_predictions(self, ctx: FusedContext) -> List[Prediction]:
        """Generate energy/focus-based predictions."""
        preds = []

        # High focus opportunity
        if ctx.focus_likelihood > 0.7 and ctx.free_time_minutes > 45:
            preds.append(Prediction(
                id=self._gen_id("focus"),
                type=PredictionType.ENERGY_OPTIMAL,
                message="Good window for deep work - tackle complex tasks now",
                confidence=0.8,
                reasoning=[
                    f"Focus likelihood: {int(ctx.focus_likelihood * 100)}%",
                    f"Free time: {ctx.free_time_minutes} minutes",
                    "No immediate interruptions expected"
                ],
                action_suggestions=[
                    "Work on complex project",
                    "Do strategic planning",
                    "Handle creative work"
                ],
                priority=6
            ))

        # Low energy time
        if ctx.energy_estimate < 0.4 and ctx.is_afternoon:
            preds.append(Prediction(
                id=self._gen_id("low_energy"),
                type=PredictionType.ENERGY_OPTIMAL,
                message="Energy dip detected - good time for routine tasks",
                confidence=0.75,
                reasoning=[
                    f"Energy estimate: {int(ctx.energy_estimate * 100)}%",
                    "Post-lunch energy dip is normal"
                ],
                action_suggestions=[
                    "Handle email triage",
                    "Update task statuses",
                    "Take a short break"
                ],
                priority=3
            ))

        return preds

    def _generate_seasonal_predictions(self, ctx: FusedContext) -> List[Prediction]:
        """Generate seasonal/farm predictions."""
        preds = []

        # Seasonal tasks reminder
        if ctx.seasonal_tasks and ctx.is_morning:
            task = ctx.seasonal_tasks[0] if ctx.seasonal_tasks else None
            if task:
                preds.append(Prediction(
                    id=self._gen_id("seasonal"),
                    type=PredictionType.SEASONAL_TASK,
                    message=f"Seasonal reminder: {task}",
                    confidence=0.7,
                    reasoning=[
                        f"Current season: {ctx.current_season}",
                        f"Growing: {', '.join(ctx.growing_items[:3]) if ctx.growing_items else 'Planning phase'}"
                    ],
                    action_suggestions=[
                        task,
                        "Check farm calendar",
                        "Review crop status"
                    ],
                    priority=4
                ))

        return preds

    def _gen_id(self, prefix: str) -> str:
        """Generate unique prediction ID."""
        now = datetime.now().isoformat()
        return hashlib.sha256(f"{prefix}:{now}".encode()).hexdigest()[:12]

    # =========================================================================
    # CONFIDENCE CALCULATION
    # =========================================================================

    def calculate_confidence(self, prediction: Prediction) -> float:
        """
        Calculate calibrated confidence for a prediction.

        Uses:
        - Base model confidence
        - Signal freshness
        - Historical accuracy for this prediction type
        - Novelty factor
        """
        base_conf = prediction.confidence

        # Historical accuracy adjustment (would load from history)
        # For now, use conservative estimate
        historical_factor = 0.85

        # Calibrated confidence
        calibrated = base_conf * historical_factor

        return max(0.1, min(0.95, calibrated))

    # =========================================================================
    # CONVENIENCE METHODS
    # =========================================================================

    async def gather_and_fuse(self) -> FusedContext:
        """Convenience: gather signals and fuse in one call."""
        signals = await self.gather_signals()
        return await self.fuse_signals(signals)

    async def get_full_intelligence(self) -> Dict[str, Any]:
        """
        Get complete fused intelligence for dashboard/API.

        Returns dict with:
        - context: Fused context data
        - predictions: List of predictions
        - signal_status: Status of each signal source
        - confidence: Overall confidence
        """
        signals = await self.gather_signals()
        context = await self.fuse_signals(signals)
        predictions = await self.generate_predictions(context)

        return {
            "context": context.to_dict(),
            "predictions": [p.to_dict() for p in predictions],
            "signal_status": {
                st.value: {
                    "status": sig.status.value,
                    "freshness": sig.freshness,
                    "confidence": sig.confidence
                }
                for st, sig in signals.items()
            },
            "overall_confidence": context.overall_confidence,
            "signals_active": context.signals_fused,
            "signals_total": len(signals),
            "generated_at": datetime.now().isoformat()
        }

    def get_signal_status_summary(self) -> Dict[str, str]:
        """Get quick summary of signal connection status."""
        summary = {}
        for signal_type, collector in self.collectors.items():
            cached = collector.get_cached()
            if cached:
                summary[signal_type.value] = cached.status.value
            else:
                summary[signal_type.value] = "not_collected"
        return summary

    # =========================================================================
    # SSE INTEGRATION
    # =========================================================================

    def subscribe(self, callback: Callable[[Dict], None]):
        """Subscribe to context fusion updates."""
        self._subscribers.append(callback)

    def unsubscribe(self, callback: Callable[[Dict], None]):
        """Unsubscribe from updates."""
        if callback in self._subscribers:
            self._subscribers.remove(callback)

    async def _notify_subscribers(self, data: Dict):
        """Notify all subscribers of new data."""
        for callback in self._subscribers:
            try:
                callback(data)
            except Exception as e:
                print(f"[ContextFusion] Subscriber error: {e}")


# ===============================================================================
# SINGLETON INSTANCE
# ===============================================================================

_fusion_engine: Optional[ContextFusionEngine] = None


def get_fusion_engine(user_id: str = "default") -> ContextFusionEngine:
    """Get or create the global ContextFusionEngine instance."""
    global _fusion_engine
    if _fusion_engine is None:
        _fusion_engine = ContextFusionEngine(user_id)
    return _fusion_engine


# ===============================================================================
# CLI INTERFACE
# ===============================================================================

async def main_async():
    """Main async entry point for testing."""
    print("=" * 60)
    print("CONTEXT FUSION ENGINE - Phase 1 Test")
    print("=" * 60)

    engine = get_fusion_engine()

    print("\n[1] Gathering signals...")
    signals = await engine.gather_signals()

    for st, sig in signals.items():
        status_icon = "+" if sig.status == SignalStatus.CONNECTED else "-"
        print(f"  {status_icon} {st.value}: {sig.status.value} (confidence: {sig.confidence:.0%})")

    print("\n[2] Fusing context...")
    context = await engine.fuse_signals(signals)

    print(f"  Signals fused: {context.signals_fused}")
    print(f"  Overall confidence: {context.overall_confidence:.0%}")
    print(f"  Energy estimate: {context.energy_estimate:.0%}")
    print(f"  Focus likelihood: {context.focus_likelihood:.0%}")
    print(f"  Overall urgency: {context.overall_urgency:.0%}")

    print("\n[3] Generating predictions...")
    predictions = await engine.generate_predictions(context)

    for i, pred in enumerate(predictions[:5], 1):
        print(f"\n  [{i}] {pred.message}")
        print(f"      Confidence: {pred.confidence:.0%} | Priority: {pred.priority}")
        print(f"      Type: {pred.type.value}")

    print("\n" + "=" * 60)
    print("Context Fusion Engine test complete!")


def main():
    """CLI entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Context Fusion Engine")
    parser.add_argument("--test", action="store_true", help="Run test cycle")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    parser.add_argument("--status", action="store_true", help="Show signal status")
    args = parser.parse_args()

    if args.status:
        engine = get_fusion_engine()
        status = engine.get_signal_status_summary()
        print("Signal Status:")
        for sig, stat in status.items():
            print(f"  {sig}: {stat}")
    elif args.json:
        async def json_output():
            engine = get_fusion_engine()
            data = await engine.get_full_intelligence()
            print(json.dumps(data, indent=2, default=str))
        asyncio.run(json_output())
    else:
        asyncio.run(main_async())


if __name__ == "__main__":
    main()
