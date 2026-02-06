#!/usr/bin/env python3
"""
===============================================================================
CONFLICT DETECTOR v1.0 - 100% Deterministic Conflict Detection
===============================================================================

Part of Project "Sovereign Seed" Phase 2

CRITICAL: This service is 100% DETERMINISTIC. NO LLM involvement.
Uses rule-based logic ONLY for conflict detection and resolution.

Purpose:
- Detect contradictions in data (e.g., "$1,200" vs "$1,500" for same field)
- Support legal accuracy for lease terms, contracts, agreements
- Prevent data integrity issues before they cause problems
- Provide automated resolution strategies with full audit trail

Conflict Types:
- BOOLEAN: "received" vs "not received" (mutually exclusive)
- NUMERIC: "$1,200" vs "$1,500" (percentage difference)
- DATE: "Feb 1" vs "Feb 15" (temporal contradiction)
- STATE: "active" vs "terminated" (status contradiction)
- EXISTENCE: "has feature X" vs "does not have feature X"

Resolution Strategies:
- Effective Date Precedence: Newer documents supersede older
- Source Priority: Contracts > Amendments > Leases > Emails > Notes
- Human Review: For CRITICAL severity conflicts

Usage:
    from conflict_detector import get_conflict_detector

    detector = get_conflict_detector()

    # Create data points from different sources
    points = [
        DataPoint(value="$1,200", source_id="lease", ...),
        DataPoint(value="$1,500", source_id="email", ...)
    ]

    # Detect conflicts
    conflicts = detector.detect_conflicts(points, "monthly_rent")

    # Resolve automatically or flag for human review
    if conflicts:
        resolution = detector.resolve_by_effective_date(conflicts[0])

Author: PM_Architect Claude
Date: 2026-02-04
===============================================================================
"""

from __future__ import annotations

import hashlib
import json
import logging
import sqlite3
import threading
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, Tuple, Union
from uuid import uuid4

# ===============================================================================
# CONFIGURATION
# ===============================================================================

APP_DIR = Path(__file__).parent
CONFLICTS_DB_FILE = APP_DIR / ".conflicts.db"
CONFLICTS_JSON_FILE = APP_DIR / ".conflicts.json"  # Backup/fallback
CONFLICT_LOG_FILE = APP_DIR / ".conflicts.log"

# ===============================================================================
# LOGGING
# ===============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


def log(msg: str, level: str = "INFO"):
    """Log conflict detector activity."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [ConflictDetector] [{level}] {msg}"
    print(line)
    try:
        with open(CONFLICT_LOG_FILE, "a") as f:
            f.write(line + "\n")
    except:
        pass


# ===============================================================================
# ENUMS
# ===============================================================================

class ConflictType(str, Enum):
    """Types of data conflicts."""
    BOOLEAN = "boolean"      # "received" vs "not received"
    NUMERIC = "numeric"      # "$1,200" vs "$1,500"
    DATE = "date"            # "Feb 1" vs "Feb 15"
    STATE = "state"          # "active" vs "terminated"
    EXISTENCE = "existence"  # "has feature X" vs "does not have feature X"


class ConflictSeverity(str, Enum):
    """Severity levels for conflicts."""
    LOW = "low"           # Minor discrepancy, informational
    MEDIUM = "medium"     # Significant difference, needs review
    HIGH = "high"         # Major contradiction, blocks action
    CRITICAL = "critical" # Legal/financial risk, requires human


class ResolutionMethod(str, Enum):
    """Methods for resolving conflicts."""
    EFFECTIVE_DATE = "effective_date"  # Most recent wins
    SOURCE_PRIORITY = "source_priority"  # Higher priority source wins
    HUMAN = "human"  # Human decision required
    MERGED = "merged"  # Values were merged/averaged
    MANUAL_OVERRIDE = "manual_override"  # User specified value


# ===============================================================================
# DATA CLASSES
# ===============================================================================

@dataclass
class DataPoint:
    """
    A single data point with provenance.

    Each DataPoint represents a value extracted from a specific source
    at a specific time, with full tracking for audit purposes.
    """
    value: Any                          # Original raw value
    normalized_value: Any               # From NormalizationService
    source_id: str                      # Document/anchor ID
    source_type: str                    # 'lease', 'email', 'task', etc.
    effective_date: Optional[datetime]  # When this became effective
    extraction_confidence: float        # 0.0-1.0 confidence in extraction
    anchor_id: Optional[str] = None     # Stable anchor reference
    extracted_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if self.effective_date is None:
            self.effective_date = self.extracted_at

    def to_dict(self) -> Dict[str, Any]:
        """Convert to JSON-serializable dict."""
        return {
            "value": str(self.value) if not isinstance(self.value, (str, int, float, bool, type(None))) else self.value,
            "normalized_value": str(self.normalized_value) if isinstance(self.normalized_value, Decimal) else self.normalized_value,
            "source_id": self.source_id,
            "source_type": self.source_type,
            "effective_date": self.effective_date.isoformat() if self.effective_date else None,
            "extraction_confidence": self.extraction_confidence,
            "anchor_id": self.anchor_id,
            "extracted_at": self.extracted_at.isoformat() if self.extracted_at else None,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DataPoint':
        """Create from dict."""
        effective_date = data.get("effective_date")
        if isinstance(effective_date, str):
            effective_date = datetime.fromisoformat(effective_date)

        extracted_at = data.get("extracted_at")
        if isinstance(extracted_at, str):
            extracted_at = datetime.fromisoformat(extracted_at)
        else:
            extracted_at = datetime.now()

        # Handle normalized value - try to convert back to Decimal if it looks numeric
        normalized_value = data.get("normalized_value")
        if isinstance(normalized_value, str):
            try:
                normalized_value = Decimal(normalized_value)
            except (InvalidOperation, ValueError):
                pass

        return cls(
            value=data.get("value"),
            normalized_value=normalized_value,
            source_id=data.get("source_id", ""),
            source_type=data.get("source_type", "unknown"),
            effective_date=effective_date,
            extraction_confidence=data.get("extraction_confidence", 1.0),
            anchor_id=data.get("anchor_id"),
            extracted_at=extracted_at,
            metadata=data.get("metadata", {})
        )


@dataclass
class Resolution:
    """
    How a conflict was resolved.

    Captures the full decision process for audit trail.
    """
    id: str
    method: str  # ResolutionMethod value
    winning_value: Any
    winning_data_point_index: int  # Index of winning DataPoint in conflict
    reasoning: str
    resolved_by: str  # 'system' or user ID
    resolved_at: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if not self.id:
            self.id = str(uuid4())[:12]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to JSON-serializable dict."""
        return {
            "id": self.id,
            "method": self.method,
            "winning_value": str(self.winning_value) if isinstance(self.winning_value, Decimal) else self.winning_value,
            "winning_data_point_index": self.winning_data_point_index,
            "reasoning": self.reasoning,
            "resolved_by": self.resolved_by,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Resolution':
        """Create from dict."""
        resolved_at = data.get("resolved_at")
        if isinstance(resolved_at, str):
            resolved_at = datetime.fromisoformat(resolved_at)
        else:
            resolved_at = datetime.now()

        return cls(
            id=data.get("id", ""),
            method=data.get("method", ""),
            winning_value=data.get("winning_value"),
            winning_data_point_index=data.get("winning_data_point_index", 0),
            reasoning=data.get("reasoning", ""),
            resolved_by=data.get("resolved_by", "system"),
            resolved_at=resolved_at,
            metadata=data.get("metadata", {})
        )


@dataclass
class Conflict:
    """
    A detected conflict between data points.

    Represents a contradiction that needs resolution before
    the data can be trusted for decision-making.
    """
    id: str
    conflict_type: str  # ConflictType value
    severity: str  # ConflictSeverity value
    data_points: List[DataPoint]
    field_name: str
    description: str
    resolution: Optional[Resolution] = None
    detected_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if not self.id:
            self.id = str(uuid4())[:12]

    @property
    def is_resolved(self) -> bool:
        """Check if conflict has been resolved."""
        return self.resolution is not None

    @property
    def values(self) -> List[Any]:
        """Get all conflicting values."""
        return [dp.value for dp in self.data_points]

    @property
    def normalized_values(self) -> List[Any]:
        """Get all normalized conflicting values."""
        return [dp.normalized_value for dp in self.data_points]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to JSON-serializable dict."""
        return {
            "id": self.id,
            "conflict_type": self.conflict_type,
            "severity": self.severity,
            "data_points": [dp.to_dict() for dp in self.data_points],
            "field_name": self.field_name,
            "description": self.description,
            "resolution": self.resolution.to_dict() if self.resolution else None,
            "detected_at": self.detected_at.isoformat() if self.detected_at else None,
            "is_resolved": self.is_resolved,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Conflict':
        """Create from dict."""
        detected_at = data.get("detected_at")
        if isinstance(detected_at, str):
            detected_at = datetime.fromisoformat(detected_at)
        else:
            detected_at = datetime.now()

        resolution = data.get("resolution")
        if resolution:
            resolution = Resolution.from_dict(resolution)

        return cls(
            id=data.get("id", ""),
            conflict_type=data.get("conflict_type", ""),
            severity=data.get("severity", ""),
            data_points=[DataPoint.from_dict(dp) for dp in data.get("data_points", [])],
            field_name=data.get("field_name", ""),
            description=data.get("description", ""),
            resolution=resolution,
            detected_at=detected_at,
            metadata=data.get("metadata", {})
        )


# ===============================================================================
# CONFLICT DETECTOR
# ===============================================================================

class ConflictDetector:
    """
    Detects and manages conflicts in data.

    This is the core engine for identifying contradictions across
    documents and data sources. All detection is deterministic
    and rule-based - NO LLM involvement.
    """

    # Source type priorities (higher = more authoritative)
    DEFAULT_SOURCE_PRIORITIES: Dict[str, int] = {
        'contract': 100,
        'amendment': 90,
        'lease': 85,
        'legal_document': 80,
        'official_email': 70,
        'invoice': 65,
        'email': 50,
        'meeting_notes': 40,
        'note': 30,
        'task': 20,
        'chat': 10,
        'unknown': 0
    }

    # Numeric severity thresholds (percentage difference)
    NUMERIC_SEVERITY_THRESHOLDS = {
        ConflictSeverity.LOW: 0.05,      # <5%
        ConflictSeverity.MEDIUM: 0.20,   # 5-20%
        ConflictSeverity.HIGH: 0.50,     # 20-50%
        ConflictSeverity.CRITICAL: 1.0   # >50%
    }

    def __init__(self, normalization_service: Optional['NormalizationService'] = None):
        """
        Initialize ConflictDetector.

        Args:
            normalization_service: Optional NormalizationService for value normalization
        """
        self.normalizer = normalization_service
        self.conflicts: Dict[str, Conflict] = {}
        self.source_priorities = self.DEFAULT_SOURCE_PRIORITIES.copy()
        self._lock = threading.RLock()
        self.use_sqlite = True

        # Statistics
        self._stats = {
            'total_detections': 0,
            'conflicts_found': 0,
            'conflicts_resolved': 0,
            'by_type': {t.value: 0 for t in ConflictType},
            'by_severity': {s.value: 0 for s in ConflictSeverity}
        }

        # Initialize storage
        self._init_storage()

    def _init_storage(self):
        """Initialize persistent storage."""
        if self.use_sqlite:
            try:
                self.conn = sqlite3.connect(str(CONFLICTS_DB_FILE), check_same_thread=False)
                self.conn.execute("""
                    CREATE TABLE IF NOT EXISTS conflicts (
                        id TEXT PRIMARY KEY,
                        data TEXT NOT NULL,
                        field_name TEXT NOT NULL,
                        conflict_type TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        is_resolved INTEGER DEFAULT 0,
                        detected_at TEXT NOT NULL,
                        resolved_at TEXT
                    )
                """)
                self.conn.execute("CREATE INDEX IF NOT EXISTS idx_field ON conflicts(field_name)")
                self.conn.execute("CREATE INDEX IF NOT EXISTS idx_resolved ON conflicts(is_resolved)")
                self.conn.execute("CREATE INDEX IF NOT EXISTS idx_severity ON conflicts(severity)")
                self.conn.commit()
                self._load_from_db()
            except Exception as e:
                log(f"SQLite init failed, using JSON: {e}", "WARN")
                self.use_sqlite = False
                self._load_from_json()
        else:
            self._load_from_json()

    def _load_from_db(self):
        """Load conflicts from SQLite database."""
        try:
            cursor = self.conn.execute("SELECT id, data FROM conflicts")
            for row in cursor.fetchall():
                try:
                    data = json.loads(row[1])
                    self.conflicts[row[0]] = Conflict.from_dict(data)
                except:
                    pass
            log(f"Loaded {len(self.conflicts)} conflicts from database")
        except Exception as e:
            log(f"Failed to load from DB: {e}", "ERROR")

    def _load_from_json(self):
        """Load conflicts from JSON file."""
        if CONFLICTS_JSON_FILE.exists():
            try:
                data = json.loads(CONFLICTS_JSON_FILE.read_text())
                for conflict_data in data.get("conflicts", []):
                    conflict = Conflict.from_dict(conflict_data)
                    self.conflicts[conflict.id] = conflict
                log(f"Loaded {len(self.conflicts)} conflicts from JSON")
            except Exception as e:
                log(f"Failed to load from JSON: {e}", "ERROR")

    def _save_conflict(self, conflict: Conflict):
        """Save conflict to persistent storage."""
        if self.use_sqlite:
            try:
                self.conn.execute("""
                    INSERT OR REPLACE INTO conflicts
                    (id, data, field_name, conflict_type, severity, is_resolved, detected_at, resolved_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    conflict.id,
                    json.dumps(conflict.to_dict(), default=str),
                    conflict.field_name,
                    conflict.conflict_type,
                    conflict.severity,
                    1 if conflict.is_resolved else 0,
                    conflict.detected_at.isoformat() if conflict.detected_at else None,
                    conflict.resolution.resolved_at.isoformat() if conflict.resolution else None
                ))
                self.conn.commit()
            except Exception as e:
                log(f"Failed to save to DB: {e}", "ERROR")
        else:
            self._save_to_json()

    def _save_to_json(self):
        """Save all conflicts to JSON file."""
        try:
            data = {
                "conflicts": [c.to_dict() for c in self.conflicts.values()],
                "updated_at": datetime.now().isoformat()
            }
            CONFLICTS_JSON_FILE.write_text(json.dumps(data, indent=2, default=str))
        except Exception as e:
            log(f"Failed to save to JSON: {e}", "ERROR")

    # =========================================================================
    # MAIN DETECTION METHODS
    # =========================================================================

    def detect_conflicts(
        self,
        data_points: List[DataPoint],
        field_name: str
    ) -> List[Conflict]:
        """
        Detect conflicts among data points for the same field.

        Algorithm:
        1. Normalize all values using NormalizationService
        2. Group by normalized value
        3. If multiple distinct values exist, we have a conflict
        4. Determine conflict type and severity
        5. Create and store Conflict objects

        Args:
            data_points: List of DataPoint objects to compare
            field_name: Name of the field being compared (e.g., "monthly_rent")

        Returns:
            List of detected Conflict objects
        """
        with self._lock:
            self._stats['total_detections'] += 1

            if len(data_points) < 2:
                return []

            # Group by normalized value
            value_groups: Dict[str, List[DataPoint]] = {}

            for dp in data_points:
                # Use normalized value for grouping
                norm_val = dp.normalized_value
                if norm_val is None:
                    norm_val = dp.value

                # Convert to string key for grouping
                if isinstance(norm_val, Decimal):
                    key = str(norm_val)
                elif isinstance(norm_val, datetime):
                    key = norm_val.isoformat()
                elif isinstance(norm_val, bool):
                    key = str(norm_val)
                else:
                    key = str(norm_val)

                if key not in value_groups:
                    value_groups[key] = []
                value_groups[key].append(dp)

            # If only one group, no conflict
            if len(value_groups) <= 1:
                return []

            # We have a conflict!
            conflicts = []

            # Determine conflict type from data
            conflict_type = self._determine_conflict_type(data_points)

            # Create conflict with all data points
            severity = self._calculate_severity(conflict_type, data_points)

            description = self._generate_description(field_name, data_points, conflict_type)

            conflict = Conflict(
                id=str(uuid4())[:12],
                conflict_type=conflict_type.value,
                severity=severity.value,
                data_points=data_points,
                field_name=field_name,
                description=description,
                detected_at=datetime.now()
            )

            # Store conflict
            self.conflicts[conflict.id] = conflict
            self._save_conflict(conflict)

            # Update stats
            self._stats['conflicts_found'] += 1
            self._stats['by_type'][conflict_type.value] += 1
            self._stats['by_severity'][severity.value] += 1

            conflicts.append(conflict)
            log(f"Detected {severity.value} {conflict_type.value} conflict for '{field_name}'")

            return conflicts

    def detect_boolean_conflict(self, points: List[DataPoint]) -> Optional[Conflict]:
        """
        Detect boolean contradictions (yes/no, true/false, received/pending).

        Boolean conflicts are always HIGH severity because they are
        mutually exclusive states.

        Args:
            points: List of DataPoint objects with boolean-like values

        Returns:
            Conflict if contradiction found, None otherwise
        """
        if len(points) < 2:
            return None

        true_count = 0
        false_count = 0

        for dp in points:
            norm_val = dp.normalized_value
            if norm_val is True or (isinstance(norm_val, str) and norm_val.lower() in ('true', 'yes', '1')):
                true_count += 1
            elif norm_val is False or (isinstance(norm_val, str) and norm_val.lower() in ('false', 'no', '0')):
                false_count += 1

        if true_count > 0 and false_count > 0:
            # Boolean conflict found
            conflict = Conflict(
                id=str(uuid4())[:12],
                conflict_type=ConflictType.BOOLEAN.value,
                severity=ConflictSeverity.HIGH.value,  # Always HIGH for boolean
                data_points=points,
                field_name=points[0].metadata.get('field_name', 'unknown'),
                description=f"Boolean conflict: {true_count} sources say TRUE, {false_count} say FALSE",
                detected_at=datetime.now()
            )

            with self._lock:
                self.conflicts[conflict.id] = conflict
                self._save_conflict(conflict)

            return conflict

        return None

    def detect_numeric_conflict(
        self,
        points: List[DataPoint],
        threshold: float = 0.01
    ) -> Optional[Conflict]:
        """
        Detect numeric contradictions.

        Args:
            points: List of DataPoint objects with numeric values
            threshold: Minimum percentage difference to trigger conflict (0.01 = 1%)

        Returns:
            Conflict if values differ beyond threshold, None otherwise
        """
        if len(points) < 2:
            return None

        # Extract numeric values
        numeric_values: List[Tuple[DataPoint, Decimal]] = []

        for dp in points:
            norm_val = dp.normalized_value
            if isinstance(norm_val, Decimal):
                numeric_values.append((dp, norm_val))
            elif isinstance(norm_val, (int, float)):
                numeric_values.append((dp, Decimal(str(norm_val))))
            elif isinstance(norm_val, str):
                try:
                    numeric_values.append((dp, Decimal(norm_val)))
                except (InvalidOperation, ValueError):
                    continue

        if len(numeric_values) < 2:
            return None

        # Find min and max
        values_only = [v for _, v in numeric_values]
        min_val = min(values_only)
        max_val = max(values_only)

        # Calculate percentage difference
        if min_val == 0 and max_val == 0:
            return None  # Both zero, no conflict

        # Use the larger absolute value as denominator
        base = max(abs(min_val), abs(max_val))
        if base == 0:
            base = Decimal('1')

        pct_diff = abs(max_val - min_val) / base

        if pct_diff < Decimal(str(threshold)):
            return None  # Within threshold

        # Determine severity from percentage difference
        severity = self._severity_from_numeric_diff(float(pct_diff))

        conflict = Conflict(
            id=str(uuid4())[:12],
            conflict_type=ConflictType.NUMERIC.value,
            severity=severity.value,
            data_points=points,
            field_name=points[0].metadata.get('field_name', 'unknown'),
            description=f"Numeric conflict: values range from {min_val} to {max_val} ({float(pct_diff)*100:.1f}% difference)",
            detected_at=datetime.now()
        )

        with self._lock:
            self.conflicts[conflict.id] = conflict
            self._save_conflict(conflict)

        return conflict

    def detect_date_conflict(
        self,
        points: List[DataPoint],
        tolerance_days: int = 0
    ) -> Optional[Conflict]:
        """
        Detect date contradictions.

        Args:
            points: List of DataPoint objects with date values
            tolerance_days: Number of days difference to tolerate (for timezone issues)

        Returns:
            Conflict if dates differ beyond tolerance, None otherwise
        """
        if len(points) < 2:
            return None

        # Extract date values
        date_values: List[Tuple[DataPoint, datetime]] = []

        for dp in points:
            norm_val = dp.normalized_value
            if isinstance(norm_val, datetime):
                date_values.append((dp, norm_val))

        if len(date_values) < 2:
            return None

        # Find min and max dates
        dates_only = [d for _, d in date_values]
        min_date = min(dates_only)
        max_date = max(dates_only)

        # Calculate difference in days
        diff_days = (max_date - min_date).days

        if abs(diff_days) <= tolerance_days:
            return None  # Within tolerance

        # Determine severity from date difference
        severity = self._severity_from_date_diff(abs(diff_days))

        conflict = Conflict(
            id=str(uuid4())[:12],
            conflict_type=ConflictType.DATE.value,
            severity=severity.value,
            data_points=points,
            field_name=points[0].metadata.get('field_name', 'unknown'),
            description=f"Date conflict: {min_date.strftime('%Y-%m-%d')} vs {max_date.strftime('%Y-%m-%d')} ({diff_days} days apart)",
            detected_at=datetime.now()
        )

        with self._lock:
            self.conflicts[conflict.id] = conflict
            self._save_conflict(conflict)

        return conflict

    # =========================================================================
    # RESOLUTION METHODS
    # =========================================================================

    def resolve_by_effective_date(self, conflict: Conflict) -> Resolution:
        """
        Resolve conflict using Effective Date Precedence.

        The most recent effective_date wins (newer documents supersede older).
        This is the standard legal principle for amendments.

        Args:
            conflict: The Conflict to resolve

        Returns:
            Resolution object with winning value
        """
        if not conflict.data_points:
            raise ValueError("Conflict has no data points")

        # Sort by effective date (newest first)
        sorted_points = sorted(
            enumerate(conflict.data_points),
            key=lambda x: x[1].effective_date or datetime.min,
            reverse=True
        )

        winner_idx, winner = sorted_points[0]

        resolution = Resolution(
            id=str(uuid4())[:12],
            method=ResolutionMethod.EFFECTIVE_DATE.value,
            winning_value=winner.value,
            winning_data_point_index=winner_idx,
            reasoning=f"Selected value from most recent document (effective date: {winner.effective_date.strftime('%Y-%m-%d') if winner.effective_date else 'unknown'})",
            resolved_by="system",
            resolved_at=datetime.now()
        )

        conflict.resolution = resolution

        with self._lock:
            self._save_conflict(conflict)
            self._stats['conflicts_resolved'] += 1

        log(f"Resolved conflict {conflict.id} by effective date: '{winner.value}'")
        return resolution

    def resolve_by_source_priority(self, conflict: Conflict) -> Resolution:
        """
        Resolve conflict using source priority.

        Higher priority sources (contracts, legal documents) take precedence
        over lower priority sources (emails, notes).

        Args:
            conflict: The Conflict to resolve

        Returns:
            Resolution object with winning value
        """
        if not conflict.data_points:
            raise ValueError("Conflict has no data points")

        # Sort by source priority (highest first)
        sorted_points = sorted(
            enumerate(conflict.data_points),
            key=lambda x: self.source_priorities.get(x[1].source_type.lower(), 0),
            reverse=True
        )

        winner_idx, winner = sorted_points[0]
        winner_priority = self.source_priorities.get(winner.source_type.lower(), 0)

        resolution = Resolution(
            id=str(uuid4())[:12],
            method=ResolutionMethod.SOURCE_PRIORITY.value,
            winning_value=winner.value,
            winning_data_point_index=winner_idx,
            reasoning=f"Selected value from highest priority source: {winner.source_type} (priority {winner_priority})",
            resolved_by="system",
            resolved_at=datetime.now()
        )

        conflict.resolution = resolution

        with self._lock:
            self._save_conflict(conflict)
            self._stats['conflicts_resolved'] += 1

        log(f"Resolved conflict {conflict.id} by source priority: '{winner.value}' from {winner.source_type}")
        return resolution

    def resolve_manually(
        self,
        conflict: Conflict,
        winning_index: int,
        resolved_by: str,
        reasoning: str = ""
    ) -> Resolution:
        """
        Manually resolve a conflict by selecting a winning value.

        Args:
            conflict: The Conflict to resolve
            winning_index: Index of the winning DataPoint
            resolved_by: ID of the user resolving the conflict
            reasoning: Optional explanation of the decision

        Returns:
            Resolution object with winning value
        """
        if winning_index < 0 or winning_index >= len(conflict.data_points):
            raise ValueError(f"Invalid winning index: {winning_index}")

        winner = conflict.data_points[winning_index]

        resolution = Resolution(
            id=str(uuid4())[:12],
            method=ResolutionMethod.MANUAL_OVERRIDE.value,
            winning_value=winner.value,
            winning_data_point_index=winning_index,
            reasoning=reasoning or f"Manually selected by {resolved_by}",
            resolved_by=resolved_by,
            resolved_at=datetime.now()
        )

        conflict.resolution = resolution

        with self._lock:
            self._save_conflict(conflict)
            self._stats['conflicts_resolved'] += 1

        log(f"Conflict {conflict.id} manually resolved by {resolved_by}: '{winner.value}'")
        return resolution

    # =========================================================================
    # QUERY METHODS
    # =========================================================================

    def get_conflict(self, conflict_id: str) -> Optional[Conflict]:
        """Get a specific conflict by ID."""
        return self.conflicts.get(conflict_id)

    def get_conflicts_for_document(self, document_id: str) -> List[Conflict]:
        """Get all conflicts involving a document."""
        with self._lock:
            return [
                c for c in self.conflicts.values()
                if any(dp.source_id == document_id for dp in c.data_points)
            ]

    def get_conflicts_for_field(self, field_name: str) -> List[Conflict]:
        """Get all conflicts for a specific field."""
        with self._lock:
            return [c for c in self.conflicts.values() if c.field_name == field_name]

    def get_unresolved_conflicts(self) -> List[Conflict]:
        """Get all conflicts without resolution."""
        with self._lock:
            return [c for c in self.conflicts.values() if not c.is_resolved]

    def get_resolved_conflicts(self) -> List[Conflict]:
        """Get all resolved conflicts."""
        with self._lock:
            return [c for c in self.conflicts.values() if c.is_resolved]

    def get_conflicts_by_severity(self, severity: ConflictSeverity) -> List[Conflict]:
        """Get conflicts filtered by severity."""
        with self._lock:
            return [c for c in self.conflicts.values() if c.severity == severity.value]

    def get_all_conflicts(self) -> List[Conflict]:
        """Get all conflicts."""
        return list(self.conflicts.values())

    # =========================================================================
    # BULK OPERATIONS
    # =========================================================================

    def bulk_detect(self, documents: List[Dict[str, Any]]) -> Dict[str, List[Conflict]]:
        """
        Detect conflicts across multiple documents.

        Args:
            documents: List of dicts with 'field_name' and 'data_points' keys

        Returns:
            Dict of field_name -> list of conflicts
        """
        results: Dict[str, List[Conflict]] = {}

        for doc in documents:
            field_name = doc.get('field_name', 'unknown')
            data_points = doc.get('data_points', [])

            # Convert dicts to DataPoint objects if needed
            if data_points and isinstance(data_points[0], dict):
                data_points = [DataPoint.from_dict(dp) for dp in data_points]

            conflicts = self.detect_conflicts(data_points, field_name)
            if conflicts:
                results[field_name] = conflicts

        return results

    # =========================================================================
    # HELPER METHODS
    # =========================================================================

    def _determine_conflict_type(self, data_points: List[DataPoint]) -> ConflictType:
        """Determine the type of conflict from data point values."""
        if not data_points:
            return ConflictType.EXISTENCE

        # Check first normalized value type
        sample = data_points[0].normalized_value

        if isinstance(sample, bool):
            return ConflictType.BOOLEAN
        elif isinstance(sample, datetime):
            return ConflictType.DATE
        elif isinstance(sample, (Decimal, int, float)):
            return ConflictType.NUMERIC
        elif isinstance(sample, str):
            # Check if it's a boolean-like string
            lower = sample.lower()
            if lower in ('true', 'false', 'yes', 'no', 'confirmed', 'denied', 'paid', 'unpaid'):
                return ConflictType.BOOLEAN
            # Check if it's a state
            if lower in ('active', 'inactive', 'terminated', 'pending', 'completed'):
                return ConflictType.STATE

        return ConflictType.EXISTENCE

    def _calculate_severity(
        self,
        conflict_type: ConflictType,
        data_points: List[DataPoint]
    ) -> ConflictSeverity:
        """Calculate conflict severity based on type and values."""

        if conflict_type == ConflictType.BOOLEAN:
            # Boolean conflicts are always HIGH
            return ConflictSeverity.HIGH

        elif conflict_type == ConflictType.NUMERIC:
            # Get numeric values and calculate percentage difference
            values = []
            for dp in data_points:
                val = dp.normalized_value
                if isinstance(val, (Decimal, int, float)):
                    values.append(float(val) if not isinstance(val, Decimal) else float(val))

            if len(values) >= 2:
                pct_diff = self._calculate_percentage_diff(values)
                return self._severity_from_numeric_diff(pct_diff)

            return ConflictSeverity.MEDIUM

        elif conflict_type == ConflictType.DATE:
            # Get date values and calculate days difference
            dates = []
            for dp in data_points:
                val = dp.normalized_value
                if isinstance(val, datetime):
                    dates.append(val)

            if len(dates) >= 2:
                min_date = min(dates)
                max_date = max(dates)
                days_diff = (max_date - min_date).days
                return self._severity_from_date_diff(days_diff)

            return ConflictSeverity.MEDIUM

        elif conflict_type == ConflictType.STATE:
            # State conflicts are always HIGH (mutually exclusive)
            return ConflictSeverity.HIGH

        # Default
        return ConflictSeverity.MEDIUM

    def _calculate_percentage_diff(self, values: List[float]) -> float:
        """Calculate percentage difference between min and max values."""
        if not values:
            return 0.0

        min_val = min(values)
        max_val = max(values)

        if min_val == 0 and max_val == 0:
            return 0.0

        base = max(abs(min_val), abs(max_val))
        if base == 0:
            return 1.0  # 100% difference

        return abs(max_val - min_val) / base

    def _severity_from_numeric_diff(self, pct_diff: float) -> ConflictSeverity:
        """Determine severity from numeric percentage difference."""
        if pct_diff > 0.50:
            return ConflictSeverity.CRITICAL
        elif pct_diff > 0.20:
            return ConflictSeverity.HIGH
        elif pct_diff > 0.05:
            return ConflictSeverity.MEDIUM
        else:
            return ConflictSeverity.LOW

    def _severity_from_date_diff(self, days: int) -> ConflictSeverity:
        """Determine severity from date difference in days."""
        if days > 365:
            return ConflictSeverity.CRITICAL  # Different year
        elif days > 30:
            return ConflictSeverity.HIGH  # Different month
        elif days > 7:
            return ConflictSeverity.MEDIUM  # Same month
        else:
            return ConflictSeverity.LOW  # Same week

    def _generate_description(
        self,
        field_name: str,
        data_points: List[DataPoint],
        conflict_type: ConflictType
    ) -> str:
        """Generate human-readable conflict description."""
        values = [str(dp.value) for dp in data_points[:3]]
        sources = [dp.source_type for dp in data_points[:3]]

        if len(data_points) > 3:
            values.append(f"... and {len(data_points) - 3} more")

        value_str = ", ".join(values)
        source_str = ", ".join(set(sources))

        return f"Conflicting values for '{field_name}': [{value_str}] from sources: [{source_str}]"

    # =========================================================================
    # STATISTICS
    # =========================================================================

    def get_stats(self) -> Dict[str, Any]:
        """Get conflict detection statistics."""
        with self._lock:
            unresolved = len(self.get_unresolved_conflicts())
            resolved = len(self.get_resolved_conflicts())

            return {
                **self._stats,
                'total_conflicts': len(self.conflicts),
                'unresolved': unresolved,
                'resolved': resolved,
                'resolution_rate': resolved / len(self.conflicts) if self.conflicts else 0
            }

    def reset_stats(self):
        """Reset statistics."""
        self._stats = {
            'total_detections': 0,
            'conflicts_found': 0,
            'conflicts_resolved': 0,
            'by_type': {t.value: 0 for t in ConflictType},
            'by_severity': {s.value: 0 for s in ConflictSeverity}
        }

    def get_health_summary(self) -> Dict[str, Any]:
        """Get conflict health summary for dashboard."""
        with self._lock:
            conflicts = list(self.conflicts.values())

            unresolved = [c for c in conflicts if not c.is_resolved]
            critical = [c for c in unresolved if c.severity == ConflictSeverity.CRITICAL.value]
            high = [c for c in unresolved if c.severity == ConflictSeverity.HIGH.value]

            by_field: Dict[str, int] = {}
            for c in conflicts:
                by_field[c.field_name] = by_field.get(c.field_name, 0) + 1

            return {
                "total_conflicts": len(conflicts),
                "unresolved": len(unresolved),
                "critical_unresolved": len(critical),
                "high_unresolved": len(high),
                "health_status": "critical" if critical else ("warning" if high else "healthy"),
                "by_field": by_field,
                "last_checked": datetime.now().isoformat()
            }


# ===============================================================================
# CONFLICT REPORT GENERATOR
# ===============================================================================

class ConflictReport:
    """Generate conflict reports for documents and fields."""

    def __init__(self, detector: ConflictDetector):
        self.detector = detector

    def generate_report(self, document_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Generate a comprehensive conflict report.

        Args:
            document_ids: Optional list of document IDs to filter by

        Returns:
            Report dict with summary and details
        """
        if document_ids:
            conflicts = []
            for doc_id in document_ids:
                conflicts.extend(self.detector.get_conflicts_for_document(doc_id))
        else:
            conflicts = self.detector.get_all_conflicts()

        unresolved = [c for c in conflicts if not c.is_resolved]
        resolved = [c for c in conflicts if c.is_resolved]

        # Group by severity
        by_severity: Dict[str, List[Conflict]] = {}
        for c in conflicts:
            if c.severity not in by_severity:
                by_severity[c.severity] = []
            by_severity[c.severity].append(c)

        # Group by field
        by_field: Dict[str, List[Conflict]] = {}
        for c in conflicts:
            if c.field_name not in by_field:
                by_field[c.field_name] = []
            by_field[c.field_name].append(c)

        return {
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total": len(conflicts),
                "unresolved": len(unresolved),
                "resolved": len(resolved),
                "critical": len(by_severity.get(ConflictSeverity.CRITICAL.value, [])),
                "high": len(by_severity.get(ConflictSeverity.HIGH.value, [])),
                "medium": len(by_severity.get(ConflictSeverity.MEDIUM.value, [])),
                "low": len(by_severity.get(ConflictSeverity.LOW.value, []))
            },
            "by_severity": {
                sev: [c.to_dict() for c in conflicts]
                for sev, conflicts in by_severity.items()
            },
            "by_field": {
                field: [c.to_dict() for c in conflicts]
                for field, conflicts in by_field.items()
            },
            "unresolved_details": [c.to_dict() for c in unresolved],
            "document_ids": document_ids
        }

    def export_to_json(self, conflicts: List[Conflict]) -> str:
        """Export conflicts to JSON for audit."""
        return json.dumps(
            [c.to_dict() for c in conflicts],
            indent=2,
            default=str
        )


# ===============================================================================
# GOVERNOR CONFLICT GATE
# ===============================================================================

class GovernorConflictGate:
    """
    Gate that blocks actions when unresolved HIGH/CRITICAL conflicts exist.

    Integrates with the Governor system to prevent operations that would
    depend on conflicting data.
    """

    def __init__(self, detector: ConflictDetector):
        self.detector = detector

    def check(
        self,
        field_name: str,
        action: str
    ) -> Tuple[bool, Optional[Conflict]]:
        """
        Check if action is blocked by conflicts.

        Args:
            field_name: The field relevant to the action
            action: Description of the action being attempted

        Returns:
            Tuple of (allowed, blocking_conflict)
            - allowed=True if action can proceed
            - blocking_conflict=Conflict that is blocking (if any)
        """
        conflicts = self.detector.get_conflicts_for_field(field_name)

        # Filter to unresolved HIGH/CRITICAL
        blocking = [
            c for c in conflicts
            if not c.is_resolved
            and c.severity in [ConflictSeverity.HIGH.value, ConflictSeverity.CRITICAL.value]
        ]

        if blocking:
            log(f"Action '{action}' blocked by conflict on field '{field_name}'", "WARN")
            return (False, blocking[0])

        return (True, None)

    def check_multiple_fields(
        self,
        field_names: List[str],
        action: str
    ) -> Tuple[bool, List[Conflict]]:
        """
        Check multiple fields for blocking conflicts.

        Args:
            field_names: List of fields to check
            action: Description of the action being attempted

        Returns:
            Tuple of (allowed, blocking_conflicts)
        """
        blocking = []

        for field in field_names:
            allowed, conflict = self.check(field, action)
            if not allowed and conflict:
                blocking.append(conflict)

        return (len(blocking) == 0, blocking)

    def get_blocking_summary(self) -> Dict[str, Any]:
        """Get summary of all blocking conflicts."""
        unresolved = self.detector.get_unresolved_conflicts()
        blocking = [
            c for c in unresolved
            if c.severity in [ConflictSeverity.HIGH.value, ConflictSeverity.CRITICAL.value]
        ]

        return {
            "blocked_actions": len(blocking),
            "critical": len([c for c in blocking if c.severity == ConflictSeverity.CRITICAL.value]),
            "high": len([c for c in blocking if c.severity == ConflictSeverity.HIGH.value]),
            "affected_fields": list(set(c.field_name for c in blocking)),
            "conflicts": [c.to_dict() for c in blocking]
        }


# ===============================================================================
# SINGLETON ACCESS
# ===============================================================================

_detector: Optional[ConflictDetector] = None


def get_conflict_detector() -> ConflictDetector:
    """Get the singleton ConflictDetector instance."""
    global _detector
    if _detector is None:
        # Try to get normalization service
        try:
            from normalization_service import get_normalization_service
            _detector = ConflictDetector(get_normalization_service())
        except ImportError:
            _detector = ConflictDetector(None)
    return _detector


def get_conflict_gate() -> GovernorConflictGate:
    """Get a GovernorConflictGate instance."""
    return GovernorConflictGate(get_conflict_detector())


def get_conflict_report() -> ConflictReport:
    """Get a ConflictReport instance."""
    return ConflictReport(get_conflict_detector())


# ===============================================================================
# CLI TESTING
# ===============================================================================

if __name__ == "__main__":
    import sys

    print("=" * 70)
    print("CONFLICT DETECTOR v1.0 - Test Suite")
    print("=" * 70)

    detector = get_conflict_detector()

    # Test boolean conflict
    print("\n--- Boolean Conflict Test ---")
    bool_points = [
        DataPoint(
            value="received",
            normalized_value=True,
            source_id="email_1",
            source_type="email",
            effective_date=datetime(2026, 1, 15),
            extraction_confidence=0.95
        ),
        DataPoint(
            value="not received",
            normalized_value=False,
            source_id="email_2",
            source_type="email",
            effective_date=datetime(2026, 1, 20),
            extraction_confidence=0.95
        )
    ]

    bool_conflicts = detector.detect_conflicts(bool_points, "payment_status")
    assert len(bool_conflicts) == 1, f"Expected 1 conflict, got {len(bool_conflicts)}"
    assert bool_conflicts[0].conflict_type == ConflictType.BOOLEAN.value
    print(f"PASS: Boolean conflict detected - {bool_conflicts[0].description}")

    # Test numeric conflict
    print("\n--- Numeric Conflict Test ---")
    num_points = [
        DataPoint(
            value="$1,200",
            normalized_value=Decimal("1200"),
            source_id="lease",
            source_type="lease",
            effective_date=datetime(2026, 1, 1),
            extraction_confidence=0.95
        ),
        DataPoint(
            value="$1,800",
            normalized_value=Decimal("1800"),
            source_id="email",
            source_type="email",
            effective_date=datetime(2026, 1, 15),
            extraction_confidence=0.85
        )
    ]

    num_conflicts = detector.detect_conflicts(num_points, "monthly_rent")
    assert len(num_conflicts) == 1, f"Expected 1 conflict, got {len(num_conflicts)}"
    assert num_conflicts[0].conflict_type == ConflictType.NUMERIC.value
    assert num_conflicts[0].severity == ConflictSeverity.HIGH.value  # 33% difference (600/1800)
    print(f"PASS: Numeric conflict detected - {num_conflicts[0].description}")

    # Test date conflict
    print("\n--- Date Conflict Test ---")
    date_points = [
        DataPoint(
            value="Feb 1, 2026",
            normalized_value=datetime(2026, 2, 1),
            source_id="contract",
            source_type="contract",
            effective_date=datetime(2026, 1, 1),
            extraction_confidence=0.95
        ),
        DataPoint(
            value="Feb 15, 2026",
            normalized_value=datetime(2026, 2, 15),
            source_id="amendment",
            source_type="amendment",
            effective_date=datetime(2026, 1, 20),
            extraction_confidence=0.95
        )
    ]

    date_conflicts = detector.detect_conflicts(date_points, "due_date")
    assert len(date_conflicts) == 1, f"Expected 1 conflict, got {len(date_conflicts)}"
    assert date_conflicts[0].conflict_type == ConflictType.DATE.value
    print(f"PASS: Date conflict detected - {date_conflicts[0].description}")

    # Test resolution by effective date
    print("\n--- Resolution Test (Effective Date) ---")
    conflict = num_conflicts[0]
    resolution = detector.resolve_by_effective_date(conflict)
    assert resolution is not None
    assert resolution.method == ResolutionMethod.EFFECTIVE_DATE.value
    assert resolution.winning_value == "$1,800"  # Newer email wins
    print(f"PASS: Resolved by effective date - winning value: {resolution.winning_value}")

    # Test resolution by source priority
    print("\n--- Resolution Test (Source Priority) ---")
    # Create a fresh conflict for this test
    priority_points = [
        DataPoint(
            value="$1,200",
            normalized_value=Decimal("1200"),
            source_id="contract",
            source_type="contract",
            effective_date=datetime(2026, 1, 1),
            extraction_confidence=0.95
        ),
        DataPoint(
            value="$1,500",
            normalized_value=Decimal("1500"),
            source_id="email",
            source_type="email",
            effective_date=datetime(2026, 1, 15),
            extraction_confidence=0.85
        )
    ]
    priority_conflicts = detector.detect_conflicts(priority_points, "contract_rent")
    conflict2 = priority_conflicts[0]
    resolution2 = detector.resolve_by_source_priority(conflict2)
    assert resolution2 is not None
    assert resolution2.method == ResolutionMethod.SOURCE_PRIORITY.value
    assert resolution2.winning_value == "$1,200"  # Contract has higher priority
    print(f"PASS: Resolved by source priority - winning value: {resolution2.winning_value}")

    # Test no conflict when values match
    print("\n--- No Conflict Test (Matching Values) ---")
    matching_points = [
        DataPoint(
            value="$1,200",
            normalized_value=Decimal("1200"),
            source_id="lease",
            source_type="lease",
            effective_date=datetime(2026, 1, 1),
            extraction_confidence=0.95
        ),
        DataPoint(
            value="1200 dollars",
            normalized_value=Decimal("1200"),  # Same normalized value
            source_id="email",
            source_type="email",
            effective_date=datetime(2026, 1, 15),
            extraction_confidence=0.85
        )
    ]

    matching_conflicts = detector.detect_conflicts(matching_points, "matching_rent")
    assert len(matching_conflicts) == 0, f"Expected 0 conflicts, got {len(matching_conflicts)}"
    print("PASS: No conflict when normalized values match")

    # Test Governor Conflict Gate
    print("\n--- Governor Conflict Gate Test ---")
    gate = get_conflict_gate()

    # This should be blocked (HIGH severity unresolved conflict)
    allowed, blocking = gate.check("payment_status", "process_payment")
    assert not allowed, "Should be blocked by boolean conflict"
    print(f"PASS: Action blocked by conflict on 'payment_status'")

    # This should be allowed (conflict was resolved)
    allowed, blocking = gate.check("monthly_rent", "generate_invoice")
    assert allowed, "Should be allowed (conflict resolved)"
    print("PASS: Action allowed after resolution")

    # Statistics
    print("\n" + "=" * 70)
    print("Statistics:")
    print(json.dumps(detector.get_stats(), indent=2))

    # Health Summary
    print("\n" + "=" * 70)
    print("Health Summary:")
    print(json.dumps(detector.get_health_summary(), indent=2))

    print("\n" + "=" * 70)
    print("ALL TESTS PASSED")
    print("=" * 70)

    sys.exit(0)
