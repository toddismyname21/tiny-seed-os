#!/usr/bin/env python3
"""
TinyPM Intelligent Safe Mode - Phase 4: Sovereign Seed
===========================================================================

AUTOMATIC LOCKDOWN when AI systems become unreliable.

The Intelligent Safe Mode monitors key health metrics and automatically
transitions the system to "read-only" mode when thresholds are exceeded.

Safe Mode Levels:
- GREEN:    Normal operation (all permissions)
- YELLOW:   Elevated caution (monitoring closely)
- RED:      High alert (auto-execute disabled, human required)
- LOCKDOWN: Read-only mode (writes disabled, all actions need human)

Monitored Metrics:
- Abstain rate: How often the Overlap Validator forces abstention
- Conflict rate: How often conflicting data is detected
- Low confidence rate: How often AI confidence is below threshold
- Validation failure rate: How often schema validation fails
- Circuit breaker rate: How often the circuit breaker blocks actions

Default Thresholds (configurable):
| Metric                 | Yellow | Red  | Lockdown |
|------------------------|--------|------|----------|
| Abstain rate           | 30%    | 50%  | 70%      |
| Conflict rate          | 15%    | 30%  | 50%      |
| Low confidence rate    | 40%    | 60%  | 80%      |
| Validation failure     | 10%    | 25%  | 40%      |
| Circuit breaker rate   | 20%    | 40%  | 60%      |

Integration:
- Works with all Sovereign Seed systems (overlap validator, conflict detector, etc.)
- Provides /api/safe-mode/* endpoints via web_server.py
- Full audit trail for forensic dashboard
- Background monitoring thread with configurable check interval

Created: 2026-02-04
Author: PM_Architect Claude
Part of: Project "Sovereign Seed" Phase 4
"""

from __future__ import annotations

import hashlib
import json
import logging
import threading
import time
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, Tuple, Union


# ===========================================================================
# CONFIGURATION
# ===========================================================================

APP_DIR = Path(__file__).parent
SAFE_MODE_STATE_FILE = APP_DIR / ".safe_mode_state.json"
SAFE_MODE_EVENTS_FILE = APP_DIR / ".safe_mode_events.json"
SAFE_MODE_CONFIG_FILE = APP_DIR / ".safe_mode_config.json"
SAFE_MODE_LOG_FILE = APP_DIR / ".safe_mode.log"

# How often to check health (seconds)
DEFAULT_CHECK_INTERVAL = 60

# Rolling window for metric calculation (minutes)
DEFAULT_METRIC_WINDOW = 60


# ===========================================================================
# LOGGING
# ===========================================================================

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


def log(msg: str, level: str = "INFO"):
    """Log safe mode activity with timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [SafeMode] [{level}] {msg}"
    print(line)
    try:
        with open(SAFE_MODE_LOG_FILE, "a") as f:
            f.write(line + "\n")
    except Exception:
        pass


# ===========================================================================
# ENUMS
# ===========================================================================

class SafeModeLevel(str, Enum):
    """Safe mode levels - severity ascending."""
    GREEN = "green"           # Normal operation
    YELLOW = "yellow"         # Elevated caution
    RED = "red"               # High alert
    LOCKDOWN = "lockdown"     # Read-only mode


class MetricTrend(str, Enum):
    """Trend direction for health metrics."""
    IMPROVING = "improving"
    STABLE = "stable"
    DEGRADING = "degrading"


# ===========================================================================
# DATA CLASSES
# ===========================================================================

@dataclass
class HealthMetric:
    """A monitored health metric with thresholds and history."""
    name: str
    current_value: float
    threshold_yellow: float
    threshold_red: float
    threshold_lockdown: float
    window_minutes: int
    last_updated: datetime
    trend: MetricTrend
    history: List[Tuple[datetime, float]] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            'name': self.name,
            'current_value': self.current_value,
            'threshold_yellow': self.threshold_yellow,
            'threshold_red': self.threshold_red,
            'threshold_lockdown': self.threshold_lockdown,
            'window_minutes': self.window_minutes,
            'last_updated': self.last_updated.isoformat(),
            'trend': self.trend.value,
            'history': [
                {'timestamp': t.isoformat(), 'value': v}
                for t, v in self.history[-50:]  # Keep last 50 data points
            ]
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'HealthMetric':
        history = [
            (datetime.fromisoformat(h['timestamp']), h['value'])
            for h in data.get('history', [])
        ]
        return cls(
            name=data['name'],
            current_value=data['current_value'],
            threshold_yellow=data['threshold_yellow'],
            threshold_red=data['threshold_red'],
            threshold_lockdown=data['threshold_lockdown'],
            window_minutes=data['window_minutes'],
            last_updated=datetime.fromisoformat(data['last_updated']),
            trend=MetricTrend(data['trend']),
            history=history
        )


@dataclass
class SafeModeState:
    """Current state of the safe mode system."""
    level: SafeModeLevel
    metrics: Dict[str, HealthMetric]
    triggered_by: List[str]
    locked_at: Optional[datetime]
    lock_reason: str
    can_write: bool
    can_auto_execute: bool
    requires_human: bool
    last_check: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict:
        return {
            'level': self.level.value,
            'metrics': {name: m.to_dict() for name, m in self.metrics.items()},
            'triggered_by': self.triggered_by,
            'locked_at': self.locked_at.isoformat() if self.locked_at else None,
            'lock_reason': self.lock_reason,
            'can_write': self.can_write,
            'can_auto_execute': self.can_auto_execute,
            'requires_human': self.requires_human,
            'last_check': self.last_check.isoformat()
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'SafeModeState':
        metrics = {
            name: HealthMetric.from_dict(m)
            for name, m in data.get('metrics', {}).items()
        }
        return cls(
            level=SafeModeLevel(data['level']),
            metrics=metrics,
            triggered_by=data.get('triggered_by', []),
            locked_at=datetime.fromisoformat(data['locked_at']) if data.get('locked_at') else None,
            lock_reason=data.get('lock_reason', ''),
            can_write=data.get('can_write', True),
            can_auto_execute=data.get('can_auto_execute', True),
            requires_human=data.get('requires_human', False),
            last_check=datetime.fromisoformat(data['last_check']) if data.get('last_check') else datetime.now()
        )


@dataclass
class SafeModeEvent:
    """Log of safe mode state changes."""
    id: str
    timestamp: datetime
    previous_level: SafeModeLevel
    new_level: SafeModeLevel
    triggered_by: List[str]
    metrics_snapshot: Dict[str, float]
    auto_triggered: bool
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    notes: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat(),
            'previous_level': self.previous_level.value,
            'new_level': self.new_level.value,
            'triggered_by': self.triggered_by,
            'metrics_snapshot': self.metrics_snapshot,
            'auto_triggered': self.auto_triggered,
            'acknowledged_by': self.acknowledged_by,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'notes': self.notes
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'SafeModeEvent':
        return cls(
            id=data['id'],
            timestamp=datetime.fromisoformat(data['timestamp']),
            previous_level=SafeModeLevel(data['previous_level']),
            new_level=SafeModeLevel(data['new_level']),
            triggered_by=data.get('triggered_by', []),
            metrics_snapshot=data.get('metrics_snapshot', {}),
            auto_triggered=data.get('auto_triggered', True),
            acknowledged_by=data.get('acknowledged_by'),
            acknowledged_at=datetime.fromisoformat(data['acknowledged_at']) if data.get('acknowledged_at') else None,
            notes=data.get('notes')
        )


# ===========================================================================
# EXCEPTIONS
# ===========================================================================

class CannotUnlockError(Exception):
    """Raised when trying to unlock but metrics are still at dangerous levels."""
    pass


class SafeModeBlockedError(Exception):
    """Raised when an action is blocked by safe mode."""
    def __init__(self, level: SafeModeLevel, reason: str):
        self.level = level
        self.reason = reason
        super().__init__(f"Action blocked by Safe Mode ({level.value}): {reason}")


# ===========================================================================
# SAFE MODE CONTROLLER
# ===========================================================================

class SafeModeController:
    """
    Controls the Intelligent Safe Mode system.

    Monitors health metrics and automatically transitions between safe mode levels.
    Provides gates for action execution based on current safe mode state.
    """

    # Default thresholds (percentage as decimal, e.g., 0.30 = 30%)
    DEFAULT_THRESHOLDS = {
        'abstain_rate': {
            'yellow': 0.30,
            'red': 0.50,
            'lockdown': 0.70
        },
        'conflict_rate': {
            'yellow': 0.15,
            'red': 0.30,
            'lockdown': 0.50
        },
        'low_confidence_rate': {
            'yellow': 0.40,
            'red': 0.60,
            'lockdown': 0.80
        },
        'validation_failure_rate': {
            'yellow': 0.10,
            'red': 0.25,
            'lockdown': 0.40
        },
        'circuit_breaker_rate': {
            'yellow': 0.20,
            'red': 0.40,
            'lockdown': 0.60
        }
    }

    def __init__(self, check_interval_seconds: int = DEFAULT_CHECK_INTERVAL):
        """Initialize the SafeModeController."""
        self.check_interval = check_interval_seconds
        self.thresholds = self._load_thresholds()
        self.metric_collectors: Dict[str, Callable[[], float]] = {}
        self._monitoring = False
        self._monitor_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()

        # Load or initialize state
        self.state = self._load_state()
        self.events: List[SafeModeEvent] = self._load_events()

        # Register default metric collectors
        self._register_default_collectors()

        log("SafeModeController initialized")

    # =========================================================================
    # STATE MANAGEMENT
    # =========================================================================

    def _load_state(self) -> SafeModeState:
        """Load state from disk or create default."""
        if SAFE_MODE_STATE_FILE.exists():
            try:
                data = json.loads(SAFE_MODE_STATE_FILE.read_text())
                return SafeModeState.from_dict(data)
            except Exception as e:
                log(f"Failed to load state: {e}", "ERROR")

        # Create default state
        return SafeModeState(
            level=SafeModeLevel.GREEN,
            metrics={},
            triggered_by=[],
            locked_at=None,
            lock_reason="",
            can_write=True,
            can_auto_execute=True,
            requires_human=False
        )

    def _save_state(self):
        """Save state to disk."""
        try:
            SAFE_MODE_STATE_FILE.write_text(json.dumps(self.state.to_dict(), indent=2))
        except Exception as e:
            log(f"Failed to save state: {e}", "ERROR")

    def _load_events(self) -> List[SafeModeEvent]:
        """Load events from disk."""
        if SAFE_MODE_EVENTS_FILE.exists():
            try:
                data = json.loads(SAFE_MODE_EVENTS_FILE.read_text())
                return [SafeModeEvent.from_dict(e) for e in data.get('events', [])]
            except Exception as e:
                log(f"Failed to load events: {e}", "ERROR")
        return []

    def _save_events(self):
        """Save events to disk (keep last 1000)."""
        try:
            SAFE_MODE_EVENTS_FILE.write_text(json.dumps({
                'events': [e.to_dict() for e in self.events[-1000:]]
            }, indent=2))
        except Exception as e:
            log(f"Failed to save events: {e}", "ERROR")

    def _load_thresholds(self) -> Dict:
        """Load custom thresholds or use defaults."""
        if SAFE_MODE_CONFIG_FILE.exists():
            try:
                data = json.loads(SAFE_MODE_CONFIG_FILE.read_text())
                return data.get('thresholds', self.DEFAULT_THRESHOLDS.copy())
            except Exception:
                pass
        return self.DEFAULT_THRESHOLDS.copy()

    def _save_thresholds(self):
        """Save thresholds to disk."""
        try:
            SAFE_MODE_CONFIG_FILE.write_text(json.dumps({
                'thresholds': self.thresholds
            }, indent=2))
        except Exception as e:
            log(f"Failed to save thresholds: {e}", "ERROR")

    # =========================================================================
    # PUBLIC API
    # =========================================================================

    def get_state(self) -> SafeModeState:
        """Get current safe mode state."""
        return self.state

    def check_health(self) -> SafeModeLevel:
        """
        Check all health metrics and update state.

        Returns the new safe mode level.
        """
        with self._lock:
            # Collect all metrics
            for name, collector in self.metric_collectors.items():
                try:
                    value = collector()
                    self._update_metric(name, value)
                except Exception as e:
                    log(f"Collector {name} failed: {e}", "WARNING")
                    # Collector failure is itself a warning sign
                    self._update_metric(f"{name}_collector_error", 1.0)

            # Determine level based on metrics
            new_level = self._calculate_level()

            # Update state if changed
            if new_level != self.state.level:
                self._transition_to(new_level)

            # Update last check time
            self.state.last_check = datetime.now()
            self._save_state()

            return self.state.level

    def force_lockdown(self, reason: str, user_id: str) -> SafeModeState:
        """
        Manually trigger lockdown.

        Args:
            reason: Why lockdown is being triggered
            user_id: Who is triggering it
        """
        with self._lock:
            self._transition_to(
                SafeModeLevel.LOCKDOWN,
                manual=True,
                reason=f"Manual lockdown by {user_id}: {reason}"
            )
            self._save_state()

        log(f"Manual lockdown triggered by {user_id}: {reason}", "WARNING")
        return self.state

    def acknowledge_and_unlock(self, user_id: str, notes: str = None) -> SafeModeState:
        """
        Acknowledge safe mode and attempt to unlock.

        Only succeeds if metrics have improved to a safe level.

        Args:
            user_id: Who is acknowledging
            notes: Optional notes about the unlock

        Raises:
            CannotUnlockError: If metrics are still at dangerous levels
        """
        with self._lock:
            # Calculate current level based on metrics
            current_level = self._calculate_level()

            if current_level == SafeModeLevel.LOCKDOWN:
                raise CannotUnlockError(
                    "Cannot unlock - metrics still at LOCKDOWN levels. "
                    f"Triggered by: {', '.join(self.state.triggered_by)}. "
                    "Please resolve the underlying issues first."
                )

            # Record acknowledgment on the last event
            if self.events:
                self.events[-1].acknowledged_by = user_id
                self.events[-1].acknowledged_at = datetime.now()
                self.events[-1].notes = notes
                self._save_events()

            # Transition to the calculated level
            self._transition_to(
                current_level,
                manual=True,
                reason=f"Unlocked by {user_id}: {notes or 'No notes provided'}"
            )
            self._save_state()

        log(f"Safe mode acknowledged and unlocked by {user_id}", "INFO")
        return self.state

    def set_threshold(self, metric: str, level: str, value: float) -> None:
        """
        Adjust a threshold.

        Args:
            metric: Metric name (e.g., 'abstain_rate')
            level: Threshold level ('yellow', 'red', 'lockdown')
            value: New threshold value (0.0 to 1.0)
        """
        if metric not in self.thresholds:
            self.thresholds[metric] = {}
        self.thresholds[metric][level] = value
        self._save_thresholds()
        log(f"Threshold updated: {metric}.{level} = {value}")

    def register_collector(self, metric_name: str, collector: Callable[[], float]) -> None:
        """
        Register a metric collector function.

        Args:
            metric_name: Name of the metric
            collector: Function that returns a float (0.0 to 1.0)
        """
        self.metric_collectors[metric_name] = collector
        log(f"Registered collector: {metric_name}")

    def start_monitoring(self) -> None:
        """Start background monitoring."""
        if self._monitoring:
            log("Monitoring already running")
            return

        self._monitoring = True
        self._monitor_thread = threading.Thread(
            target=self._monitor_loop,
            daemon=True,
            name="SafeMode-Monitor"
        )
        self._monitor_thread.start()
        log("Background monitoring started")

    def stop_monitoring(self) -> None:
        """Stop background monitoring."""
        self._monitoring = False
        log("Background monitoring stopped")

    # =========================================================================
    # GATES
    # =========================================================================

    def gate_write(self, action_description: str = "") -> bool:
        """
        Check if writes are allowed.

        Returns True if allowed, raises SafeModeBlockedError if not.
        """
        if not self.state.can_write:
            raise SafeModeBlockedError(
                self.state.level,
                f"Writes disabled in {self.state.level.value} mode. "
                f"Reason: {self.state.lock_reason}"
            )
        return True

    def gate_auto_execute(self, action_description: str = "") -> bool:
        """
        Check if auto-execution is allowed.

        Returns True if allowed, raises SafeModeBlockedError if not.
        """
        if not self.state.can_auto_execute:
            raise SafeModeBlockedError(
                self.state.level,
                f"Auto-execute disabled in {self.state.level.value} mode. "
                f"Human approval required. Reason: {self.state.lock_reason}"
            )
        return True

    def check_action_allowed(self, requires_write: bool = False,
                              requires_auto_execute: bool = False) -> Tuple[bool, Optional[str]]:
        """
        Check if an action is allowed.

        Returns (allowed, reason_if_blocked).
        """
        if requires_write and not self.state.can_write:
            return False, f"Writes blocked ({self.state.level.value}): {self.state.lock_reason}"

        if requires_auto_execute and not self.state.can_auto_execute:
            return False, f"Auto-execute blocked ({self.state.level.value}): {self.state.lock_reason}"

        return True, None

    # =========================================================================
    # DASHBOARD DATA
    # =========================================================================

    def get_dashboard_data(self) -> Dict:
        """Get data for the safe mode dashboard."""
        return {
            'level': self.state.level.value,
            'level_color': self._get_level_color(),
            'level_icon': self._get_level_icon(),
            'metrics': {
                name: {
                    'value': m.current_value,
                    'value_percent': f"{m.current_value * 100:.1f}%",
                    'threshold_yellow': m.threshold_yellow,
                    'threshold_red': m.threshold_red,
                    'threshold_lockdown': m.threshold_lockdown,
                    'status': self._get_metric_status(m),
                    'trend': m.trend.value,
                    'trend_icon': self._get_trend_icon(m.trend),
                    'last_updated': m.last_updated.isoformat()
                }
                for name, m in self.state.metrics.items()
            },
            'triggered_by': self.state.triggered_by,
            'can_write': self.state.can_write,
            'can_auto_execute': self.state.can_auto_execute,
            'requires_human': self.state.requires_human,
            'locked_at': self.state.locked_at.isoformat() if self.state.locked_at else None,
            'lock_reason': self.state.lock_reason,
            'last_check': self.state.last_check.isoformat(),
            'recent_events': [
                {
                    'id': e.id,
                    'timestamp': e.timestamp.isoformat(),
                    'previous': e.previous_level.value,
                    'new': e.new_level.value,
                    'triggered_by': e.triggered_by,
                    'auto_triggered': e.auto_triggered,
                    'acknowledged': e.acknowledged_by is not None
                }
                for e in self.events[-10:]
            ],
            'stats': self._calculate_stats(),
            'healthy': self.state.level == SafeModeLevel.GREEN
        }

    def get_events(self, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Get paginated events."""
        events = self.events[-(limit + offset):]
        if offset > 0:
            events = events[:-offset]
        return [e.to_dict() for e in events[-limit:]]

    # =========================================================================
    # INTERNAL METHODS
    # =========================================================================

    def _update_metric(self, name: str, value: float):
        """Update a metric value and calculate trend."""
        now = datetime.now()

        if name not in self.state.metrics:
            # Create new metric
            thresholds = self.thresholds.get(name, {
                'yellow': 0.30,
                'red': 0.50,
                'lockdown': 0.70
            })
            self.state.metrics[name] = HealthMetric(
                name=name,
                current_value=value,
                threshold_yellow=thresholds.get('yellow', 0.30),
                threshold_red=thresholds.get('red', 0.50),
                threshold_lockdown=thresholds.get('lockdown', 0.70),
                window_minutes=DEFAULT_METRIC_WINDOW,
                last_updated=now,
                trend=MetricTrend.STABLE,
                history=[(now, value)]
            )
        else:
            metric = self.state.metrics[name]

            # Add to history
            metric.history.append((now, value))

            # Keep only last 100 data points
            if len(metric.history) > 100:
                metric.history = metric.history[-100:]

            # Calculate trend
            metric.trend = self._calculate_trend(metric.history)
            metric.current_value = value
            metric.last_updated = now

    def _calculate_trend(self, history: List[Tuple[datetime, float]]) -> MetricTrend:
        """Calculate trend from history."""
        if len(history) < 3:
            return MetricTrend.STABLE

        # Get recent values (last 5)
        recent = [v for _, v in history[-5:]]

        # Simple linear trend
        if len(recent) >= 3:
            first_half_avg = sum(recent[:len(recent)//2]) / (len(recent)//2)
            second_half_avg = sum(recent[len(recent)//2:]) / (len(recent) - len(recent)//2)

            diff = second_half_avg - first_half_avg

            if diff < -0.05:  # 5% improvement
                return MetricTrend.IMPROVING
            elif diff > 0.05:  # 5% degradation
                return MetricTrend.DEGRADING

        return MetricTrend.STABLE

    def _calculate_level(self) -> SafeModeLevel:
        """Calculate the appropriate level based on all metrics."""
        triggered = []
        max_level = SafeModeLevel.GREEN

        for name, metric in self.state.metrics.items():
            thresholds = self.thresholds.get(name, {})

            if metric.current_value >= thresholds.get('lockdown', 1.0):
                triggered.append(f"{name}:LOCKDOWN({metric.current_value:.1%})")
                max_level = SafeModeLevel.LOCKDOWN
            elif metric.current_value >= thresholds.get('red', 1.0):
                triggered.append(f"{name}:RED({metric.current_value:.1%})")
                if max_level not in [SafeModeLevel.LOCKDOWN]:
                    max_level = SafeModeLevel.RED
            elif metric.current_value >= thresholds.get('yellow', 1.0):
                triggered.append(f"{name}:YELLOW({metric.current_value:.1%})")
                if max_level == SafeModeLevel.GREEN:
                    max_level = SafeModeLevel.YELLOW

        self.state.triggered_by = triggered
        return max_level

    def _transition_to(self, level: SafeModeLevel, manual: bool = False, reason: str = None):
        """Transition to a new safe mode level."""
        previous = self.state.level

        # Log event
        event = SafeModeEvent(
            id=str(uuid.uuid4())[:8],
            timestamp=datetime.now(),
            previous_level=previous,
            new_level=level,
            triggered_by=self.state.triggered_by.copy(),
            metrics_snapshot={
                name: m.current_value
                for name, m in self.state.metrics.items()
            },
            auto_triggered=not manual
        )
        self.events.append(event)
        self._save_events()

        # Update state
        self.state.level = level
        self.state.lock_reason = reason or f"Auto-triggered: {', '.join(self.state.triggered_by)}"

        # Set permissions based on level
        if level == SafeModeLevel.GREEN:
            self.state.can_write = True
            self.state.can_auto_execute = True
            self.state.requires_human = False
            self.state.locked_at = None
        elif level == SafeModeLevel.YELLOW:
            self.state.can_write = True
            self.state.can_auto_execute = True
            self.state.requires_human = False
        elif level == SafeModeLevel.RED:
            self.state.can_write = True
            self.state.can_auto_execute = False
            self.state.requires_human = True
        elif level == SafeModeLevel.LOCKDOWN:
            self.state.can_write = False
            self.state.can_auto_execute = False
            self.state.requires_human = True
            self.state.locked_at = datetime.now()

        log(f"TRANSITION: {previous.value} -> {level.value} | {self.state.lock_reason}",
            "WARNING" if level in [SafeModeLevel.RED, SafeModeLevel.LOCKDOWN] else "INFO")

    def _monitor_loop(self):
        """Background monitoring loop."""
        log("Monitor loop starting")

        while self._monitoring:
            try:
                self.check_health()
            except Exception as e:
                log(f"Monitor loop error: {e}", "ERROR")

            time.sleep(self.check_interval)

        log("Monitor loop stopped")

    def _register_default_collectors(self):
        """Register default metric collectors."""
        # These will connect to actual systems
        self.register_collector('abstain_rate', self._collect_abstain_rate)
        self.register_collector('conflict_rate', self._collect_conflict_rate)
        self.register_collector('low_confidence_rate', self._collect_low_confidence_rate)
        self.register_collector('validation_failure_rate', self._collect_validation_failure_rate)
        self.register_collector('circuit_breaker_rate', self._collect_circuit_breaker_rate)

    # =========================================================================
    # METRIC COLLECTORS
    # =========================================================================

    def _collect_abstain_rate(self) -> float:
        """Collect abstain rate from overlap validator."""
        try:
            from overlap_validator import get_overlap_validator
            validator = get_overlap_validator()
            stats = validator.get_statistics()
            total = stats.get('total_validations', 0)
            abstains = stats.get('abstains', 0)
            if total > 0:
                return abstains / total
        except ImportError:
            pass
        except AttributeError:
            pass
        except Exception as e:
            log(f"Failed to collect abstain_rate: {e}", "DEBUG")

        # Return 0 if no data or system not available
        return 0.0

    def _collect_conflict_rate(self) -> float:
        """Collect conflict rate from conflict detector."""
        try:
            from conflict_detector import get_conflict_detector
            detector = get_conflict_detector()
            stats = detector.get_statistics() if hasattr(detector, 'get_statistics') else {}
            total = stats.get('total_checks', 0)
            conflicts = stats.get('conflicts_found', 0)
            if total > 0:
                return conflicts / total
        except ImportError:
            pass
        except AttributeError:
            pass
        except Exception as e:
            log(f"Failed to collect conflict_rate: {e}", "DEBUG")

        return 0.0

    def _collect_low_confidence_rate(self) -> float:
        """Collect low confidence rate from AI decisions."""
        try:
            # Check pm_brain decisions
            decisions_file = APP_DIR / ".pm_decisions.json"
            if decisions_file.exists():
                data = json.loads(decisions_file.read_text())
                decisions = data.get('decisions', [])[-100:]  # Last 100
                if decisions:
                    low_conf = sum(1 for d in decisions if d.get('confidence', 1.0) < 0.6)
                    return low_conf / len(decisions)
        except Exception as e:
            log(f"Failed to collect low_confidence_rate: {e}", "DEBUG")

        return 0.0

    def _collect_validation_failure_rate(self) -> float:
        """Collect validation failure rate from structural gate."""
        try:
            from structural_gate import get_structural_gate
            gate = get_structural_gate()
            stats = gate.get_statistics() if hasattr(gate, 'get_statistics') else {}
            total = stats.get('total_validations', 0)
            failures = stats.get('failures', 0)
            if total > 0:
                return failures / total
        except ImportError:
            pass
        except AttributeError:
            pass
        except Exception as e:
            log(f"Failed to collect validation_failure_rate: {e}", "DEBUG")

        return 0.0

    def _collect_circuit_breaker_rate(self) -> float:
        """Collect circuit breaker block rate."""
        try:
            from financial_circuit_breaker import get_circuit_breaker
            breaker = get_circuit_breaker()
            stats = breaker.get_statistics() if hasattr(breaker, 'get_statistics') else {}
            total = stats.get('total_assessments', 0)
            blocked = stats.get('blocked_count', 0)
            if total > 0:
                return blocked / total
        except ImportError:
            pass
        except AttributeError:
            pass
        except Exception as e:
            log(f"Failed to collect circuit_breaker_rate: {e}", "DEBUG")

        return 0.0

    # =========================================================================
    # HELPER METHODS
    # =========================================================================

    def _get_level_color(self) -> str:
        """Get color for current level."""
        colors = {
            SafeModeLevel.GREEN: '#22c55e',
            SafeModeLevel.YELLOW: '#eab308',
            SafeModeLevel.RED: '#ef4444',
            SafeModeLevel.LOCKDOWN: '#1f2937'
        }
        return colors.get(self.state.level, '#6b7280')

    def _get_level_icon(self) -> str:
        """Get icon for current level."""
        icons = {
            SafeModeLevel.GREEN: 'check-circle',
            SafeModeLevel.YELLOW: 'alert-triangle',
            SafeModeLevel.RED: 'alert-octagon',
            SafeModeLevel.LOCKDOWN: 'lock'
        }
        return icons.get(self.state.level, 'help-circle')

    def _get_metric_status(self, metric: HealthMetric) -> str:
        """Get status string for a metric."""
        if metric.current_value >= metric.threshold_lockdown:
            return 'lockdown'
        elif metric.current_value >= metric.threshold_red:
            return 'red'
        elif metric.current_value >= metric.threshold_yellow:
            return 'yellow'
        return 'green'

    def _get_trend_icon(self, trend: MetricTrend) -> str:
        """Get icon for trend direction."""
        icons = {
            MetricTrend.IMPROVING: 'trending-down',
            MetricTrend.STABLE: 'minus',
            MetricTrend.DEGRADING: 'trending-up'
        }
        return icons.get(trend, 'minus')

    def _calculate_stats(self) -> Dict:
        """Calculate summary statistics."""
        now = datetime.now()
        last_24h = [e for e in self.events if e.timestamp > now - timedelta(hours=24)]
        last_7d = [e for e in self.events if e.timestamp > now - timedelta(days=7)]

        # Count transitions by type
        lockdowns_24h = sum(1 for e in last_24h if e.new_level == SafeModeLevel.LOCKDOWN)
        lockdowns_7d = sum(1 for e in last_7d if e.new_level == SafeModeLevel.LOCKDOWN)

        # Calculate uptime (time in GREEN)
        green_time = timedelta(0)
        total_time = timedelta(0)

        prev_event = None
        for event in self.events:
            if prev_event:
                duration = event.timestamp - prev_event.timestamp
                total_time += duration
                if prev_event.new_level == SafeModeLevel.GREEN:
                    green_time += duration
            prev_event = event

        # Include time since last event
        if prev_event:
            duration = now - prev_event.timestamp
            total_time += duration
            if prev_event.new_level == SafeModeLevel.GREEN:
                green_time += duration

        uptime_percent = (green_time.total_seconds() / max(total_time.total_seconds(), 1)) * 100

        return {
            'lockdowns_24h': lockdowns_24h,
            'lockdowns_7d': lockdowns_7d,
            'total_events': len(self.events),
            'uptime_percent': round(uptime_percent, 1),
            'currently_healthy': self.state.level == SafeModeLevel.GREEN,
            'metrics_count': len(self.state.metrics)
        }

    def _generate_id(self) -> str:
        """Generate a unique ID for events."""
        return str(uuid.uuid4())[:8]


# ===========================================================================
# SINGLETON & FACTORY
# ===========================================================================

_controller: Optional[SafeModeController] = None
_controller_lock = threading.Lock()


def get_safe_mode_controller() -> SafeModeController:
    """
    Get the global SafeModeController instance.

    Thread-safe singleton pattern. Creates the controller and starts
    monitoring on first call.
    """
    global _controller

    if _controller is None:
        with _controller_lock:
            if _controller is None:
                _controller = SafeModeController()
                _controller.start_monitoring()
                log("SafeModeController singleton created")

    return _controller


def reset_safe_mode_controller():
    """Reset the singleton (for testing)."""
    global _controller
    if _controller:
        _controller.stop_monitoring()
    _controller = None


# ===========================================================================
# CONVENIENCE FUNCTIONS
# ===========================================================================

def is_safe() -> bool:
    """Quick check if system is in safe (GREEN) state."""
    return get_safe_mode_controller().state.level == SafeModeLevel.GREEN


def can_write() -> bool:
    """Quick check if writes are allowed."""
    return get_safe_mode_controller().state.can_write


def can_auto_execute() -> bool:
    """Quick check if auto-execution is allowed."""
    return get_safe_mode_controller().state.can_auto_execute


def get_safe_mode_level() -> str:
    """Get current safe mode level as string."""
    return get_safe_mode_controller().state.level.value


def gate_action(requires_write: bool = False,
                requires_auto_execute: bool = False,
                action_description: str = "") -> bool:
    """
    Gate an action based on safe mode state.

    Returns True if allowed, raises SafeModeBlockedError if not.
    """
    controller = get_safe_mode_controller()

    if requires_write:
        controller.gate_write(action_description)

    if requires_auto_execute:
        controller.gate_auto_execute(action_description)

    return True


# ===========================================================================
# DECORATORS
# ===========================================================================

def safe_mode_write_gate(func: Callable) -> Callable:
    """Decorator that gates a function requiring write access."""
    def wrapper(*args, **kwargs):
        get_safe_mode_controller().gate_write(func.__name__)
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    wrapper.__doc__ = func.__doc__
    return wrapper


def safe_mode_auto_execute_gate(func: Callable) -> Callable:
    """Decorator that gates a function requiring auto-execute access."""
    def wrapper(*args, **kwargs):
        get_safe_mode_controller().gate_auto_execute(func.__name__)
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    wrapper.__doc__ = func.__doc__
    return wrapper


# ===========================================================================
# TESTING UTILITIES
# ===========================================================================

def simulate_metric(metric_name: str, value: float):
    """
    Simulate a metric value for testing.

    Args:
        metric_name: Name of the metric
        value: Value to set (0.0 to 1.0)
    """
    controller = get_safe_mode_controller()
    controller._update_metric(metric_name, value)
    controller.check_health()


def run_test():
    """Run basic tests to verify safe mode functionality."""
    print("\n" + "="*60)
    print("INTELLIGENT SAFE MODE - TEST SUITE")
    print("="*60)

    # Reset for clean test
    reset_safe_mode_controller()
    controller = get_safe_mode_controller()
    controller.stop_monitoring()  # Disable auto-monitoring for tests
    # Clear collectors for deterministic testing
    controller.metric_collectors.clear()

    print("\n[TEST 1] Initial state should be GREEN")
    assert controller.get_state().level == SafeModeLevel.GREEN
    assert controller.get_state().can_write == True
    assert controller.get_state().can_auto_execute == True
    print("  PASS: Initial state is GREEN")

    print("\n[TEST 2] Simulate high abstain rate -> should trigger YELLOW")
    controller._update_metric('abstain_rate', 0.35)  # 35% > 30% threshold
    new_level = controller._calculate_level()  # Don't run check_health which runs collectors
    controller._transition_to(new_level)
    assert controller.get_state().level == SafeModeLevel.YELLOW
    assert controller.get_state().can_write == True
    assert controller.get_state().can_auto_execute == True
    print("  PASS: Transitioned to YELLOW")

    print("\n[TEST 3] Simulate critical conflict rate -> should trigger LOCKDOWN")
    controller._update_metric('conflict_rate', 0.55)  # 55% > 50% threshold
    new_level = controller._calculate_level()
    controller._transition_to(new_level)
    assert controller.get_state().level == SafeModeLevel.LOCKDOWN
    assert controller.get_state().can_write == False
    assert controller.get_state().can_auto_execute == False
    print("  PASS: Transitioned to LOCKDOWN")

    print("\n[TEST 4] Cannot unlock while metrics are bad")
    try:
        controller.acknowledge_and_unlock("test_user", "Testing unlock")
        assert False, "Should have raised CannotUnlockError"
    except CannotUnlockError as e:
        print(f"  PASS: Correctly raised CannotUnlockError")

    print("\n[TEST 5] Improve metrics and unlock")
    controller._update_metric('abstain_rate', 0.10)
    controller._update_metric('conflict_rate', 0.05)
    # Now calculate level should be GREEN
    new_level = controller._calculate_level()
    assert new_level == SafeModeLevel.GREEN, f"Expected GREEN but got {new_level}"
    # Should now be able to unlock
    controller.acknowledge_and_unlock("test_user", "Issues resolved")
    assert controller.get_state().level == SafeModeLevel.GREEN
    print("  PASS: Successfully unlocked to GREEN")

    print("\n[TEST 6] Manual lockdown")
    controller.force_lockdown("Security concern", "admin")
    assert controller.get_state().level == SafeModeLevel.LOCKDOWN
    assert "admin" in controller.get_state().lock_reason
    print("  PASS: Manual lockdown works")

    print("\n[TEST 7] Gate functions block when locked")
    try:
        controller.gate_write("test action")
        assert False, "Should have raised SafeModeBlockedError"
    except SafeModeBlockedError:
        print("  PASS: Write gate blocked action")

    print("\n[TEST 8] Dashboard data is complete")
    data = controller.get_dashboard_data()
    assert 'level' in data
    assert 'metrics' in data
    assert 'stats' in data
    assert 'recent_events' in data
    print("  PASS: Dashboard data contains all expected fields")

    print("\n" + "="*60)
    print("ALL TESTS PASSED")
    print("="*60)

    # Clean up
    reset_safe_mode_controller()


if __name__ == "__main__":
    run_test()
