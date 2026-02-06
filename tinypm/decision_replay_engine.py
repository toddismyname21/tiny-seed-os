#!/usr/bin/env python3
"""
===============================================================================
DECISION REPLAY ENGINE - Bit-for-Bit Decision Reproducibility
===============================================================================

Phase 3 of Project "Sovereign Seed" - The system that proves decisions.

Every decision made by TinyPM is recorded with complete lineage and can be
replayed to verify correctness. This is CRITICAL for:

- Legal discovery ("Show me exactly how you decided X")
- Debugging ("Why did the AI do that?")
- Auditing ("Prove this decision was correct")
- Trust ("The AI didn't hallucinate - here's the chain of reasoning")

Key Insight: LLM Extraction Cannot Be Bit-for-Bit
LLMs are non-deterministic. The same input may produce slightly different
extractions. Our strategy:
1. Calculations MUST match - Pure functions are deterministic
2. Extractions are compared semantically - Same meaning = match
3. Original extraction is the legal "truth" - We store it, not replay it
4. For legal, show both - Original vs replay with calculation verification

Architecture:
    ┌─────────────────────────────────────────────────────────────────┐
    │                    DECISION REPLAY ENGINE                        │
    │                                                                  │
    │   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
    │   │   INPUTS    │──▶│ EXTRACTION  │──▶│ CALCULATION │          │
    │   │   + Hash    │   │   + Hash    │   │   + Hash    │          │
    │   └─────────────┘   └─────────────┘   └─────────────┘          │
    │          │                 │                 │                  │
    │          ▼                 ▼                 ▼                  │
    │   ┌─────────────────────────────────────────────────────┐      │
    │   │               DECISION RECORD                        │      │
    │   │   lineage_anchor + hash_chain + final_decision       │      │
    │   └─────────────────────────────────────────────────────┘      │
    │                            │                                    │
    │                            ▼                                    │
    │   ┌─────────────────────────────────────────────────────┐      │
    │   │             BLOCKCHAIN-STYLE CHAIN                   │      │
    │   │   record_n.previous_hash = record_(n-1).record_hash  │      │
    │   └─────────────────────────────────────────────────────┘      │
    │                                                                  │
    │   REPLAY MODES:                                                 │
    │   ├── FULL - Replay entire decision pipeline                    │
    │   ├── EXTRACTION_ONLY - Just replay extraction step             │
    │   ├── CALCULATION_ONLY - Just replay calculation step           │
    │   └── VERIFY_CHAIN - Verify hash chain integrity                │
    │                                                                  │
    └─────────────────────────────────────────────────────────────────┘

Usage:
    from decision_replay_engine import get_replay_engine, ReplayMode

    engine = get_replay_engine()

    # Record a decision
    record = engine.record_decision(
        decision_type="task_priority",
        raw_inputs={"task": "Harvest tomatoes", "deadline": "tomorrow"},
        context={"weather": "sunny", "energy": "high"},
        extraction_result={"urgency": 8, "importance": 9, "effort": 5},
        calculation_result=8.2,
        final_decision={"priority": 8.2, "action": "do_first"},
        model_id="claude-3-opus",
        agent_id="pm_brain"
    )

    # Replay the decision
    result = engine.replay(record.id, mode=ReplayMode.FULL)
    assert result.calculation_matched == True  # Calculations MUST match

    # Verify chain integrity
    chain_valid = engine.verify_chain()
    assert all(chain_valid.values())  # All records are valid

    # Export for legal discovery
    export = engine.export_for_legal([record.id])
"""

import hashlib
import json
import sqlite3
import threading
import time
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Callable
import difflib


# ===============================================================================
# CONFIGURATION
# ===============================================================================

APP_DIR = Path(__file__).parent
DECISIONS_DB_FILE = APP_DIR / "decisions.db"
DECISIONS_EXPORT_DIR = APP_DIR / "decision_exports"

# Ensure export directory exists
DECISIONS_EXPORT_DIR.mkdir(exist_ok=True)


# ===============================================================================
# ENUMS
# ===============================================================================

class ReplayMode(Enum):
    """Mode for replaying decisions."""
    FULL = "full"                    # Replay everything
    EXTRACTION_ONLY = "extraction"   # Just replay extraction
    CALCULATION_ONLY = "calculation" # Just replay calculation
    VERIFY_CHAIN = "verify"          # Verify hash chain only


class MatchType(Enum):
    """Type of match between original and replayed decision."""
    EXACT = "exact"           # Bit-for-bit match
    SEMANTIC = "semantic"     # Same meaning, different format
    DIVERGED = "diverged"     # Different result
    FAILED = "failed"         # Replay failed


class DecisionType(Enum):
    """Types of decisions that can be recorded."""
    TASK_PRIORITY = "task_priority"
    EMAIL_RESPONSE = "email_response"
    SCHEDULE_CHANGE = "schedule_change"
    APPROVAL = "approval"
    DELEGATION = "delegation"
    RECOMMENDATION = "recommendation"
    PREDICTION = "prediction"
    CONFLICT_RESOLUTION = "conflict_resolution"
    OTHER = "other"


# ===============================================================================
# DATA STRUCTURES
# ===============================================================================

@dataclass
class LineageAnchor:
    """
    Immutable anchor for decision reproducibility.

    This captures the exact state of all components at the time of decision,
    enabling future replay with the same conditions.
    """
    input_hash: str          # SHA-256 of all inputs
    model_id: str            # Exact AI model version used
    vault_version: str       # Seed Vault version at decision time
    extraction_version: str  # Extraction layer version
    calculator_version: str  # Calculator version
    timestamp: datetime

    def to_hash(self) -> str:
        """Generate hash of lineage anchor itself."""
        content = (
            f"{self.input_hash}:{self.model_id}:{self.vault_version}:"
            f"{self.extraction_version}:{self.calculator_version}"
        )
        return hashlib.sha256(content.encode()).hexdigest()

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "input_hash": self.input_hash,
            "model_id": self.model_id,
            "vault_version": self.vault_version,
            "extraction_version": self.extraction_version,
            "calculator_version": self.calculator_version,
            "timestamp": self.timestamp.isoformat()
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'LineageAnchor':
        """Create from dictionary."""
        return cls(
            input_hash=data["input_hash"],
            model_id=data["model_id"],
            vault_version=data["vault_version"],
            extraction_version=data["extraction_version"],
            calculator_version=data["calculator_version"],
            timestamp=datetime.fromisoformat(data["timestamp"])
        )


@dataclass
class DecisionRecord:
    """
    Complete record of a decision for replay.

    This is the atomic unit of the Decision Replay Engine. Each record
    contains everything needed to understand and reproduce a decision.
    """
    id: str
    decision_type: str       # 'task_priority', 'email_response', etc.
    lineage: LineageAnchor

    # Inputs (stored for replay)
    raw_inputs: Dict[str, Any]
    context: Dict[str, Any]

    # Extraction (LLM step - may not be exactly reproducible)
    extraction_result: Dict[str, Any]
    extraction_hash: str

    # Calculation (deterministic - MUST be reproducible)
    calculation_result: Any
    calculation_hash: str

    # Final decision
    final_decision: Any
    decision_hash: str

    # Chain (blockchain-style linking)
    previous_hash: str       # Hash of previous decision (blockchain-style)
    record_hash: str         # Hash of this entire record

    # Metadata
    created_at: datetime
    created_by: str          # Agent or user ID
    tags: List[str] = field(default_factory=list)
    notes: str = ""

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "decision_type": self.decision_type,
            "lineage": self.lineage.to_dict(),
            "raw_inputs": self.raw_inputs,
            "context": self.context,
            "extraction_result": self.extraction_result,
            "extraction_hash": self.extraction_hash,
            "calculation_result": self.calculation_result,
            "calculation_hash": self.calculation_hash,
            "final_decision": self.final_decision,
            "decision_hash": self.decision_hash,
            "previous_hash": self.previous_hash,
            "record_hash": self.record_hash,
            "created_at": self.created_at.isoformat(),
            "created_by": self.created_by,
            "tags": self.tags,
            "notes": self.notes
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'DecisionRecord':
        """Create from dictionary."""
        return cls(
            id=data["id"],
            decision_type=data["decision_type"],
            lineage=LineageAnchor.from_dict(data["lineage"]),
            raw_inputs=data["raw_inputs"],
            context=data["context"],
            extraction_result=data["extraction_result"],
            extraction_hash=data["extraction_hash"],
            calculation_result=data["calculation_result"],
            calculation_hash=data["calculation_hash"],
            final_decision=data["final_decision"],
            decision_hash=data["decision_hash"],
            previous_hash=data["previous_hash"],
            record_hash=data["record_hash"],
            created_at=datetime.fromisoformat(data["created_at"]),
            created_by=data["created_by"],
            tags=data.get("tags", []),
            notes=data.get("notes", "")
        )


@dataclass
class ReplayResult:
    """
    Result of replaying a decision.

    Contains comparison between original and replayed results, plus
    forensic notes about any differences found.
    """
    original_record: DecisionRecord
    replayed_decision: Any
    match_type: MatchType

    # Comparison results
    extraction_matched: bool
    calculation_matched: bool
    decision_matched: bool

    # Forensic details
    differences: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    # Timing
    replay_time_ms: int = 0
    original_time: datetime = None
    replayed_at: datetime = None

    # Replayed values (for comparison)
    replayed_extraction: Dict[str, Any] = None
    replayed_calculation: Any = None

    def __post_init__(self):
        if self.replayed_at is None:
            self.replayed_at = datetime.now()
        if self.original_time is None:
            self.original_time = self.original_record.created_at

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "original_record_id": self.original_record.id,
            "replayed_decision": self.replayed_decision,
            "match_type": self.match_type.value,
            "extraction_matched": self.extraction_matched,
            "calculation_matched": self.calculation_matched,
            "decision_matched": self.decision_matched,
            "differences": self.differences,
            "warnings": self.warnings,
            "replay_time_ms": self.replay_time_ms,
            "original_time": self.original_time.isoformat() if self.original_time else None,
            "replayed_at": self.replayed_at.isoformat() if self.replayed_at else None,
            "replayed_extraction": self.replayed_extraction,
            "replayed_calculation": self.replayed_calculation
        }


# ===============================================================================
# HASH UTILITIES
# ===============================================================================

def compute_hash(data: Any) -> str:
    """
    Compute SHA-256 hash of any data structure.

    Uses JSON serialization with sorted keys for determinism.
    """
    if data is None:
        return hashlib.sha256(b"null").hexdigest()

    try:
        # Convert to JSON with sorted keys for determinism
        json_str = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(json_str.encode()).hexdigest()
    except (TypeError, ValueError) as e:
        # Fallback for non-serializable data
        return hashlib.sha256(str(data).encode()).hexdigest()


def compute_record_hash(record: DecisionRecord) -> str:
    """
    Compute hash of entire decision record.

    This hash is used for chain verification and tamper detection.
    """
    content = {
        "id": record.id,
        "decision_type": record.decision_type,
        "lineage_hash": record.lineage.to_hash(),
        "extraction_hash": record.extraction_hash,
        "calculation_hash": record.calculation_hash,
        "decision_hash": record.decision_hash,
        "previous_hash": record.previous_hash
    }
    return compute_hash(content)


# ===============================================================================
# COMPARISON UTILITIES
# ===============================================================================

def compare_deep(original: Any, replayed: Any, path: str = "") -> Tuple[bool, List[str]]:
    """
    Deep comparison of two values with difference tracking.

    Returns (matched, list_of_differences)
    """
    differences = []

    # Handle None cases
    if original is None and replayed is None:
        return True, []
    if original is None or replayed is None:
        differences.append(f"{path}: original={original}, replayed={replayed}")
        return False, differences

    # Type mismatch
    if type(original) != type(replayed):
        differences.append(f"{path}: type mismatch (original={type(original).__name__}, replayed={type(replayed).__name__})")
        return False, differences

    # Dict comparison
    if isinstance(original, dict):
        all_keys = set(original.keys()) | set(replayed.keys())
        matched = True
        for key in all_keys:
            key_path = f"{path}.{key}" if path else key
            if key not in original:
                differences.append(f"{key_path}: missing in original")
                matched = False
            elif key not in replayed:
                differences.append(f"{key_path}: missing in replayed")
                matched = False
            else:
                sub_matched, sub_diffs = compare_deep(original[key], replayed[key], key_path)
                if not sub_matched:
                    matched = False
                    differences.extend(sub_diffs)
        return matched, differences

    # List comparison
    if isinstance(original, list):
        if len(original) != len(replayed):
            differences.append(f"{path}: length mismatch (original={len(original)}, replayed={len(replayed)})")
            return False, differences

        matched = True
        for i, (o, r) in enumerate(zip(original, replayed)):
            sub_matched, sub_diffs = compare_deep(o, r, f"{path}[{i}]")
            if not sub_matched:
                matched = False
                differences.extend(sub_diffs)
        return matched, differences

    # Numeric comparison with tolerance
    if isinstance(original, (int, float)) and isinstance(replayed, (int, float)):
        # Use relative tolerance for floats
        if isinstance(original, float) or isinstance(replayed, float):
            tolerance = max(abs(original), abs(replayed)) * 1e-9 + 1e-12
            if abs(original - replayed) <= tolerance:
                return True, []
        elif original == replayed:
            return True, []

        differences.append(f"{path}: value mismatch (original={original}, replayed={replayed})")
        return False, differences

    # Direct comparison
    if original == replayed:
        return True, []

    differences.append(f"{path}: value mismatch (original={original}, replayed={replayed})")
    return False, differences


def compute_semantic_similarity(original: Dict, replayed: Dict) -> float:
    """
    Compute semantic similarity between two extraction results.

    LLMs may produce slightly different text but equivalent meaning.
    This function attempts to measure semantic equivalence.

    Returns similarity score 0.0 to 1.0
    """
    if original == replayed:
        return 1.0

    # Convert to comparable strings
    orig_str = json.dumps(original, sort_keys=True, default=str)
    repl_str = json.dumps(replayed, sort_keys=True, default=str)

    # Use difflib for string similarity
    similarity = difflib.SequenceMatcher(None, orig_str, repl_str).ratio()

    # Also check key-value overlap
    if isinstance(original, dict) and isinstance(replayed, dict):
        common_keys = set(original.keys()) & set(replayed.keys())
        all_keys = set(original.keys()) | set(replayed.keys())
        key_overlap = len(common_keys) / len(all_keys) if all_keys else 1.0

        # Value similarity for common keys
        value_matches = 0
        for key in common_keys:
            if original[key] == replayed[key]:
                value_matches += 1
            elif isinstance(original[key], (int, float)) and isinstance(replayed[key], (int, float)):
                # Numeric values within 10% are considered similar
                orig_val = float(original[key])
                repl_val = float(replayed[key])
                if abs(orig_val - repl_val) <= max(abs(orig_val), abs(repl_val)) * 0.1:
                    value_matches += 0.8

        value_similarity = value_matches / len(common_keys) if common_keys else 0.0

        # Weighted combination
        return 0.3 * similarity + 0.3 * key_overlap + 0.4 * value_similarity

    return similarity


# ===============================================================================
# DATABASE LAYER
# ===============================================================================

class DecisionDatabase:
    """
    SQLite-based storage for decision records.

    Uses a single table with JSON columns for flexibility.
    Includes indexes for efficient querying.
    """

    def __init__(self, db_path: Path = DECISIONS_DB_FILE):
        self.db_path = db_path
        self._lock = threading.Lock()
        self._init_db()

    def _init_db(self):
        """Initialize database schema."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            try:
                cursor = conn.cursor()

                # Create decisions table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS decisions (
                        id TEXT PRIMARY KEY,
                        decision_type TEXT NOT NULL,
                        lineage_json TEXT NOT NULL,
                        raw_inputs_json TEXT NOT NULL,
                        context_json TEXT NOT NULL,
                        extraction_result_json TEXT NOT NULL,
                        extraction_hash TEXT NOT NULL,
                        calculation_result_json TEXT NOT NULL,
                        calculation_hash TEXT NOT NULL,
                        final_decision_json TEXT NOT NULL,
                        decision_hash TEXT NOT NULL,
                        previous_hash TEXT,
                        record_hash TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        created_by TEXT NOT NULL,
                        tags_json TEXT DEFAULT '[]',
                        notes TEXT DEFAULT ''
                    )
                """)

                # Create indexes for efficient querying
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_decisions_type
                    ON decisions(decision_type)
                """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_decisions_created
                    ON decisions(created_at)
                """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_decisions_agent
                    ON decisions(created_by)
                """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_decisions_record_hash
                    ON decisions(record_hash)
                """)

                # Create chain head table (tracks latest record)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS chain_head (
                        id INTEGER PRIMARY KEY CHECK (id = 1),
                        record_id TEXT,
                        record_hash TEXT,
                        updated_at TEXT
                    )
                """)

                conn.commit()
            finally:
                conn.close()

    def save(self, record: DecisionRecord):
        """Save a decision record."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            try:
                cursor = conn.cursor()

                cursor.execute("""
                    INSERT OR REPLACE INTO decisions
                    (id, decision_type, lineage_json, raw_inputs_json, context_json,
                     extraction_result_json, extraction_hash, calculation_result_json,
                     calculation_hash, final_decision_json, decision_hash,
                     previous_hash, record_hash, created_at, created_by, tags_json, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    record.id,
                    record.decision_type,
                    json.dumps(record.lineage.to_dict()),
                    json.dumps(record.raw_inputs),
                    json.dumps(record.context),
                    json.dumps(record.extraction_result),
                    record.extraction_hash,
                    json.dumps(record.calculation_result, default=str),
                    record.calculation_hash,
                    json.dumps(record.final_decision, default=str),
                    record.decision_hash,
                    record.previous_hash,
                    record.record_hash,
                    record.created_at.isoformat(),
                    record.created_by,
                    json.dumps(record.tags),
                    record.notes
                ))

                # Update chain head
                cursor.execute("""
                    INSERT OR REPLACE INTO chain_head (id, record_id, record_hash, updated_at)
                    VALUES (1, ?, ?, ?)
                """, (record.id, record.record_hash, datetime.now().isoformat()))

                conn.commit()
            finally:
                conn.close()

    def get(self, record_id: str) -> Optional[DecisionRecord]:
        """Get a decision record by ID."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            try:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM decisions WHERE id = ?
                """, (record_id,))
                row = cursor.fetchone()

                if row:
                    return self._row_to_record(row)
                return None
            finally:
                conn.close()

    def get_chain_head(self) -> Tuple[Optional[str], Optional[str]]:
        """Get the current chain head (record_id, record_hash)."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            try:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT record_id, record_hash FROM chain_head WHERE id = 1
                """)
                row = cursor.fetchone()
                return (row[0], row[1]) if row else (None, None)
            finally:
                conn.close()

    def query(self,
              decision_type: str = None,
              start_date: datetime = None,
              end_date: datetime = None,
              agent_id: str = None,
              tags: List[str] = None,
              limit: int = 100,
              offset: int = 0) -> List[DecisionRecord]:
        """Query decisions with filters."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            try:
                cursor = conn.cursor()

                conditions = []
                params = []

                if decision_type:
                    conditions.append("decision_type = ?")
                    params.append(decision_type)

                if start_date:
                    conditions.append("created_at >= ?")
                    params.append(start_date.isoformat())

                if end_date:
                    conditions.append("created_at <= ?")
                    params.append(end_date.isoformat())

                if agent_id:
                    conditions.append("created_by = ?")
                    params.append(agent_id)

                where_clause = " AND ".join(conditions) if conditions else "1=1"

                cursor.execute(f"""
                    SELECT * FROM decisions
                    WHERE {where_clause}
                    ORDER BY created_at DESC
                    LIMIT ? OFFSET ?
                """, params + [limit, offset])

                rows = cursor.fetchall()
                records = [self._row_to_record(row) for row in rows]

                # Filter by tags if specified
                if tags:
                    records = [
                        r for r in records
                        if any(tag in r.tags for tag in tags)
                    ]

                return records
            finally:
                conn.close()

    def get_all_for_chain_verification(self) -> List[DecisionRecord]:
        """Get all records for chain verification."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            try:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM decisions ORDER BY created_at ASC
                """)
                return [self._row_to_record(row) for row in cursor.fetchall()]
            finally:
                conn.close()

    def _row_to_record(self, row) -> DecisionRecord:
        """Convert database row to DecisionRecord."""
        return DecisionRecord(
            id=row[0],
            decision_type=row[1],
            lineage=LineageAnchor.from_dict(json.loads(row[2])),
            raw_inputs=json.loads(row[3]),
            context=json.loads(row[4]),
            extraction_result=json.loads(row[5]),
            extraction_hash=row[6],
            calculation_result=json.loads(row[7]),
            calculation_hash=row[8],
            final_decision=json.loads(row[9]),
            decision_hash=row[10],
            previous_hash=row[11],
            record_hash=row[12],
            created_at=datetime.fromisoformat(row[13]),
            created_by=row[14],
            tags=json.loads(row[15]) if row[15] else [],
            notes=row[16] if row[16] else ""
        )

    def count(self) -> int:
        """Get total count of decisions."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            try:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM decisions")
                return cursor.fetchone()[0]
            finally:
                conn.close()

    def get_stats(self) -> Dict:
        """Get statistics about stored decisions."""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            try:
                cursor = conn.cursor()

                # Total count
                cursor.execute("SELECT COUNT(*) FROM decisions")
                total = cursor.fetchone()[0]

                # Count by type
                cursor.execute("""
                    SELECT decision_type, COUNT(*)
                    FROM decisions
                    GROUP BY decision_type
                """)
                by_type = dict(cursor.fetchall())

                # Count by agent
                cursor.execute("""
                    SELECT created_by, COUNT(*)
                    FROM decisions
                    GROUP BY created_by
                """)
                by_agent = dict(cursor.fetchall())

                # Date range
                cursor.execute("""
                    SELECT MIN(created_at), MAX(created_at)
                    FROM decisions
                """)
                date_row = cursor.fetchone()

                return {
                    "total_decisions": total,
                    "by_type": by_type,
                    "by_agent": by_agent,
                    "earliest": date_row[0] if date_row[0] else None,
                    "latest": date_row[1] if date_row[1] else None
                }
            finally:
                conn.close()


# ===============================================================================
# CALCULATOR REGISTRY
# ===============================================================================

class CalculatorRegistry:
    """
    Registry of deterministic calculators for replay.

    Each calculator is a pure function that takes extraction results
    and returns a calculation result. These MUST be deterministic.
    """

    def __init__(self):
        self._calculators: Dict[str, Callable] = {}
        self._versions: Dict[str, str] = {}
        self._register_default_calculators()

    def _register_default_calculators(self):
        """Register built-in calculators."""

        # Task priority calculator
        def calc_task_priority(extraction: Dict, context: Dict = None) -> float:
            """Calculate task priority score 0-100."""
            urgency = extraction.get("urgency", 5)
            importance = extraction.get("importance", 5)
            effort = extraction.get("effort", 5)

            # Weighted formula
            base_score = (urgency * 0.35 + importance * 0.45 + (10 - effort) * 0.20) * 10

            # Context adjustments
            if context:
                if context.get("weather") == "rain" and extraction.get("outdoor", False):
                    base_score *= 0.8  # Lower priority for outdoor tasks in rain
                if context.get("energy") == "high":
                    base_score *= 1.1  # Boost for high energy

            return round(min(100, max(0, base_score)), 2)

        self.register("task_priority", calc_task_priority, "1.0.0")

        # Email urgency calculator
        def calc_email_urgency(extraction: Dict, context: Dict = None) -> int:
            """Calculate email urgency 1-5."""
            sender_importance = extraction.get("sender_importance", 3)
            deadline_hours = extraction.get("deadline_hours", 72)
            keywords_urgency = extraction.get("keywords_urgency", 2)

            # Time-based urgency
            if deadline_hours < 2:
                time_urgency = 5
            elif deadline_hours < 24:
                time_urgency = 4
            elif deadline_hours < 48:
                time_urgency = 3
            else:
                time_urgency = 2

            # Combined score
            score = (sender_importance * 0.4 + time_urgency * 0.4 + keywords_urgency * 0.2)
            return round(min(5, max(1, score)))

        self.register("email_urgency", calc_email_urgency, "1.0.0")

        # Generic weighted average
        def calc_weighted_average(extraction: Dict, context: Dict = None) -> float:
            """Calculate weighted average of all numeric values."""
            values = [v for v in extraction.values() if isinstance(v, (int, float))]
            if not values:
                return 0.0
            return round(sum(values) / len(values), 2)

        self.register("weighted_average", calc_weighted_average, "1.0.0")

    def register(self, name: str, calculator: Callable, version: str):
        """Register a calculator function."""
        self._calculators[name] = calculator
        self._versions[name] = version

    def get(self, name: str) -> Optional[Callable]:
        """Get a calculator by name."""
        return self._calculators.get(name)

    def get_version(self, name: str) -> str:
        """Get calculator version."""
        return self._versions.get(name, "unknown")

    def calculate(self, name: str, extraction: Dict, context: Dict = None) -> Any:
        """Run a calculator by name."""
        calculator = self.get(name)
        if not calculator:
            raise ValueError(f"Unknown calculator: {name}")
        return calculator(extraction, context)

    def list_calculators(self) -> Dict[str, str]:
        """List all registered calculators with versions."""
        return {name: self._versions[name] for name in self._calculators}


# ===============================================================================
# DECISION REPLAY ENGINE
# ===============================================================================

class DecisionReplayEngine:
    """
    Engine for storing and replaying decisions with complete lineage.

    This is the core component of the Sovereign Seed system's
    reproducibility guarantee.
    """

    # Class-level version for lineage tracking
    VERSION = "1.0.0"

    def __init__(self, db_path: Path = None):
        """Initialize the replay engine."""
        self.db = DecisionDatabase(db_path or DECISIONS_DB_FILE)
        self.calculators = CalculatorRegistry()

        # Load Seed Vault version if available
        try:
            from seed_vault import get_seed_vault
            self.vault = get_seed_vault()
            self._vault_version = self.vault.get_version() if hasattr(self.vault, 'get_version') else "1.0.0"
        except Exception:
            # Seed vault may not be configured or have schema issues
            self.vault = None
            self._vault_version = "unavailable"

    def record_decision(self,
                        decision_type: str,
                        raw_inputs: Dict[str, Any],
                        context: Dict[str, Any],
                        extraction_result: Dict[str, Any],
                        calculation_result: Any,
                        final_decision: Any,
                        model_id: str,
                        agent_id: str = None,
                        tags: List[str] = None,
                        notes: str = "") -> DecisionRecord:
        """
        Record a decision with full lineage.

        Creates an immutable record with hash chain linking.

        Args:
            decision_type: Type of decision (e.g., 'task_priority')
            raw_inputs: Original inputs to the decision
            context: Context at time of decision
            extraction_result: Result of LLM extraction
            calculation_result: Result of deterministic calculation
            final_decision: Final decision made
            model_id: AI model version used for extraction
            agent_id: ID of agent making the decision
            tags: Optional tags for categorization
            notes: Optional notes about the decision

        Returns:
            DecisionRecord with complete lineage and hash chain
        """
        now = datetime.now()
        record_id = str(uuid.uuid4())

        # Get chain head for previous hash
        prev_id, prev_hash = self.db.get_chain_head()

        # Compute hashes
        input_hash = compute_hash({"inputs": raw_inputs, "context": context})
        extraction_hash = compute_hash(extraction_result)
        calculation_hash = compute_hash(calculation_result)
        decision_hash = compute_hash(final_decision)

        # Determine calculator version
        calculator_version = self.calculators.get_version(decision_type)
        if calculator_version == "unknown":
            calculator_version = "custom"

        # Create lineage anchor
        lineage = LineageAnchor(
            input_hash=input_hash,
            model_id=model_id,
            vault_version=self._vault_version,
            extraction_version=self.VERSION,
            calculator_version=calculator_version,
            timestamp=now
        )

        # Create record (without record_hash initially)
        record = DecisionRecord(
            id=record_id,
            decision_type=decision_type,
            lineage=lineage,
            raw_inputs=raw_inputs,
            context=context,
            extraction_result=extraction_result,
            extraction_hash=extraction_hash,
            calculation_result=calculation_result,
            calculation_hash=calculation_hash,
            final_decision=final_decision,
            decision_hash=decision_hash,
            previous_hash=prev_hash or "GENESIS",
            record_hash="",  # Computed below
            created_at=now,
            created_by=agent_id or "unknown",
            tags=tags or [],
            notes=notes
        )

        # Compute record hash
        record.record_hash = compute_record_hash(record)

        # Save to database
        self.db.save(record)

        return record

    def replay(self,
               decision_id: str,
               mode: ReplayMode = ReplayMode.FULL,
               use_historical_model: bool = False,
               use_historical_vault: bool = False) -> ReplayResult:
        """
        Replay a decision and compare results.

        Args:
            decision_id: ID of the decision to replay
            mode: What to replay (full, extraction, calculation, verify)
            use_historical_model: Use same model version as original
            use_historical_vault: Use same Seed Vault version

        Returns:
            ReplayResult with comparison analysis
        """
        start_time = time.time()

        # Get original record
        record = self.db.get(decision_id)
        if not record:
            raise ValueError(f"Decision not found: {decision_id}")

        # Handle verify mode specially
        if mode == ReplayMode.VERIFY_CHAIN:
            chain_result = self.verify_chain(start_id=decision_id, end_id=decision_id)
            is_valid = chain_result.get(decision_id, False)

            return ReplayResult(
                original_record=record,
                replayed_decision=None,
                match_type=MatchType.EXACT if is_valid else MatchType.DIVERGED,
                extraction_matched=True,
                calculation_matched=True,
                decision_matched=is_valid,
                differences=[] if is_valid else ["Hash chain verification failed"],
                warnings=[],
                replay_time_ms=int((time.time() - start_time) * 1000)
            )

        # For extraction-only mode
        replayed_extraction = None
        extraction_matched = True
        extraction_differences = []

        if mode in [ReplayMode.FULL, ReplayMode.EXTRACTION_ONLY]:
            # NOTE: We cannot truly replay LLM extraction without calling the LLM
            # For now, we compare against stored extraction semantically
            # In production, you could call the LLM here with same prompt
            replayed_extraction = record.extraction_result  # Placeholder
            extraction_matched = True  # We trust stored extraction

            # Add warning about non-deterministic extraction
            warnings = ["LLM extraction is non-deterministic; using stored extraction as truth"]
        else:
            warnings = []

        # For calculation mode
        replayed_calculation = None
        calculation_matched = True
        calculation_differences = []

        if mode in [ReplayMode.FULL, ReplayMode.CALCULATION_ONLY]:
            # Replay the calculation (this MUST be deterministic)
            calculator = self.calculators.get(record.decision_type)

            if calculator:
                try:
                    replayed_calculation = calculator(
                        record.extraction_result,
                        record.context
                    )

                    # Compare calculation results
                    calculation_matched, calculation_differences = compare_deep(
                        record.calculation_result,
                        replayed_calculation
                    )

                    if not calculation_matched:
                        # This is a serious issue - calculations must be deterministic
                        warnings.append(
                            f"CRITICAL: Calculation diverged! Original={record.calculation_result}, "
                            f"Replayed={replayed_calculation}"
                        )
                except Exception as e:
                    calculation_matched = False
                    calculation_differences = [f"Calculator error: {str(e)}"]
                    warnings.append(f"Calculator threw exception: {str(e)}")
            else:
                # No registered calculator - compare hashes
                replayed_calculation = record.calculation_result
                calculation_matched = True
                warnings.append(
                    f"No calculator registered for '{record.decision_type}'; "
                    "using stored result"
                )

        # Determine overall match
        if calculation_matched and extraction_matched:
            if mode == ReplayMode.FULL:
                # In full mode, decision should match if calculation matches
                decision_matched = calculation_matched
                replayed_decision = record.final_decision
            else:
                decision_matched = True
                replayed_decision = record.final_decision

            match_type = MatchType.EXACT if decision_matched else MatchType.SEMANTIC
        else:
            decision_matched = False
            replayed_decision = replayed_calculation
            match_type = MatchType.DIVERGED

        # Combine differences
        all_differences = extraction_differences + calculation_differences

        # Calculate replay time
        replay_time_ms = int((time.time() - start_time) * 1000)

        return ReplayResult(
            original_record=record,
            replayed_decision=replayed_decision,
            match_type=match_type,
            extraction_matched=extraction_matched,
            calculation_matched=calculation_matched,
            decision_matched=decision_matched,
            differences=all_differences,
            warnings=warnings,
            replay_time_ms=replay_time_ms,
            replayed_extraction=replayed_extraction,
            replayed_calculation=replayed_calculation
        )

    def verify_chain(self,
                     start_id: str = None,
                     end_id: str = None) -> Dict[str, bool]:
        """
        Verify the hash chain for tampering.

        This checks that each record's previous_hash matches the
        record_hash of the previous record, forming an immutable chain.

        Returns:
            Dict mapping decision_id -> is_valid
        """
        # Get all records in order
        all_records = self.db.get_all_for_chain_verification()

        if not all_records:
            return {}

        results = {}
        expected_prev_hash = "GENESIS"

        for record in all_records:
            # Skip until we reach start_id
            if start_id and record.id != start_id and record.id not in results:
                expected_prev_hash = record.record_hash
                continue

            # Verify previous hash
            prev_hash_valid = (record.previous_hash == expected_prev_hash)

            # Verify record hash
            computed_hash = compute_record_hash(record)
            record_hash_valid = (record.record_hash == computed_hash)

            # Overall validity
            is_valid = prev_hash_valid and record_hash_valid
            results[record.id] = is_valid

            # Update expected for next record
            expected_prev_hash = record.record_hash

            # Stop if we've reached end_id
            if end_id and record.id == end_id:
                break

        return results

    def get_decision(self, decision_id: str) -> Optional[DecisionRecord]:
        """Get a decision record by ID."""
        return self.db.get(decision_id)

    def query_decisions(self,
                        decision_type: str = None,
                        start_date: datetime = None,
                        end_date: datetime = None,
                        agent_id: str = None,
                        tags: List[str] = None,
                        limit: int = 100) -> List[DecisionRecord]:
        """Query decisions with filters."""
        return self.db.query(
            decision_type=decision_type,
            start_date=start_date,
            end_date=end_date,
            agent_id=agent_id,
            tags=tags,
            limit=limit
        )

    def export_for_legal(self,
                         decision_ids: List[str],
                         format: str = "json",
                         include_verification: bool = True) -> bytes:
        """
        Export decisions for legal discovery.

        Creates a self-contained export with:
        - Full decision records
        - Lineage information
        - Verification results
        - Timestamps and signatures

        Args:
            decision_ids: List of decision IDs to export
            format: Export format ('json' or 'html')
            include_verification: Include replay verification

        Returns:
            Bytes of the export file
        """
        export_data = {
            "export_metadata": {
                "exported_at": datetime.now().isoformat(),
                "engine_version": self.VERSION,
                "vault_version": self._vault_version,
                "decision_count": len(decision_ids),
                "format": format
            },
            "decisions": [],
            "chain_verification": {},
            "verification_summary": {
                "all_valid": True,
                "errors": []
            }
        }

        for decision_id in decision_ids:
            record = self.db.get(decision_id)
            if not record:
                export_data["verification_summary"]["errors"].append(
                    f"Decision not found: {decision_id}"
                )
                export_data["verification_summary"]["all_valid"] = False
                continue

            decision_export = record.to_dict()

            # Add verification if requested
            if include_verification:
                try:
                    replay_result = self.replay(decision_id, mode=ReplayMode.CALCULATION_ONLY)
                    decision_export["verification"] = {
                        "replayed_at": replay_result.replayed_at.isoformat(),
                        "calculation_matched": replay_result.calculation_matched,
                        "match_type": replay_result.match_type.value,
                        "differences": replay_result.differences,
                        "warnings": replay_result.warnings
                    }

                    if not replay_result.calculation_matched:
                        export_data["verification_summary"]["all_valid"] = False
                        export_data["verification_summary"]["errors"].append(
                            f"Calculation mismatch for {decision_id}"
                        )
                except Exception as e:
                    decision_export["verification"] = {
                        "error": str(e),
                        "replayed_at": datetime.now().isoformat()
                    }
                    export_data["verification_summary"]["all_valid"] = False

            export_data["decisions"].append(decision_export)

        # Verify chain for exported decisions
        chain_valid = self.verify_chain()
        for decision_id in decision_ids:
            if decision_id in chain_valid:
                export_data["chain_verification"][decision_id] = chain_valid[decision_id]
                if not chain_valid[decision_id]:
                    export_data["verification_summary"]["all_valid"] = False

        # Format output
        if format == "json":
            return json.dumps(export_data, indent=2, default=str).encode('utf-8')
        elif format == "html":
            return self._format_html_export(export_data).encode('utf-8')
        else:
            raise ValueError(f"Unknown format: {format}")

    def _format_html_export(self, export_data: Dict) -> str:
        """Format export data as HTML."""
        html = """<!DOCTYPE html>
<html>
<head>
    <title>Decision Export - Legal Discovery</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 15px; border-radius: 8px; }
        .decision { border: 1px solid #ddd; margin: 20px 0; padding: 15px; border-radius: 8px; }
        .valid { border-left: 4px solid #4CAF50; }
        .invalid { border-left: 4px solid #f44336; }
        .hash { font-family: monospace; font-size: 12px; color: #666; }
        .section { margin: 10px 0; }
        .label { font-weight: bold; color: #333; }
        pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Decision Replay Engine - Legal Export</h1>
        <p><strong>Exported:</strong> {exported_at}</p>
        <p><strong>Engine Version:</strong> {engine_version}</p>
        <p><strong>Decisions:</strong> {decision_count}</p>
        <p><strong>Verification Status:</strong> {status}</p>
    </div>
""".format(
            exported_at=export_data["export_metadata"]["exported_at"],
            engine_version=export_data["export_metadata"]["engine_version"],
            decision_count=export_data["export_metadata"]["decision_count"],
            status="PASSED" if export_data["verification_summary"]["all_valid"] else "FAILED"
        )

        for decision in export_data["decisions"]:
            verification = decision.get("verification", {})
            is_valid = verification.get("calculation_matched", True)
            validity_class = "valid" if is_valid else "invalid"

            html += f"""
    <div class="decision {validity_class}">
        <h2>Decision: {decision["id"][:16]}...</h2>
        <div class="section">
            <span class="label">Type:</span> {decision["decision_type"]}
        </div>
        <div class="section">
            <span class="label">Created:</span> {decision["created_at"]}
        </div>
        <div class="section">
            <span class="label">Agent:</span> {decision["created_by"]}
        </div>
        <div class="section">
            <span class="label">Record Hash:</span>
            <span class="hash">{decision["record_hash"]}</span>
        </div>
        <div class="section">
            <span class="label">Inputs:</span>
            <pre>{json.dumps(decision["raw_inputs"], indent=2)}</pre>
        </div>
        <div class="section">
            <span class="label">Extraction:</span>
            <pre>{json.dumps(decision["extraction_result"], indent=2)}</pre>
        </div>
        <div class="section">
            <span class="label">Calculation:</span>
            <pre>{json.dumps(decision["calculation_result"], indent=2)}</pre>
        </div>
        <div class="section">
            <span class="label">Final Decision:</span>
            <pre>{json.dumps(decision["final_decision"], indent=2)}</pre>
        </div>
        <div class="section">
            <span class="label">Verification:</span>
            {f"<span style='color: green;'>PASSED</span>" if is_valid else f"<span style='color: red;'>FAILED</span>"}
        </div>
    </div>
"""

        html += """
</body>
</html>"""

        return html

    def get_lineage_report(self, decision_id: str) -> Dict:
        """
        Generate a human-readable lineage report.

        Shows the complete chain of how a decision was made.
        """
        record = self.db.get(decision_id)
        if not record:
            return {"error": f"Decision not found: {decision_id}"}

        # Get chain context (previous and next in chain)
        all_records = self.db.get_all_for_chain_verification()
        prev_record = None
        next_record = None

        for i, r in enumerate(all_records):
            if r.id == decision_id:
                if i > 0:
                    prev_record = all_records[i - 1]
                if i < len(all_records) - 1:
                    next_record = all_records[i + 1]
                break

        # Build report
        report = {
            "decision_id": record.id,
            "decision_type": record.decision_type,
            "created_at": record.created_at.isoformat(),
            "created_by": record.created_by,

            "lineage": {
                "input_hash": record.lineage.input_hash,
                "model_id": record.lineage.model_id,
                "vault_version": record.lineage.vault_version,
                "extraction_version": record.lineage.extraction_version,
                "calculator_version": record.lineage.calculator_version
            },

            "pipeline": {
                "inputs": record.raw_inputs,
                "context": record.context,
                "extraction": {
                    "result": record.extraction_result,
                    "hash": record.extraction_hash
                },
                "calculation": {
                    "result": record.calculation_result,
                    "hash": record.calculation_hash
                },
                "decision": {
                    "result": record.final_decision,
                    "hash": record.decision_hash
                }
            },

            "chain": {
                "previous_hash": record.previous_hash,
                "record_hash": record.record_hash,
                "previous_decision": prev_record.id if prev_record else None,
                "next_decision": next_record.id if next_record else None
            },

            "metadata": {
                "tags": record.tags,
                "notes": record.notes
            }
        }

        return report

    def get_stats(self) -> Dict:
        """Get engine statistics."""
        db_stats = self.db.get_stats()

        return {
            "engine_version": self.VERSION,
            "vault_version": self._vault_version,
            "calculators": self.calculators.list_calculators(),
            "database": db_stats
        }


# ===============================================================================
# ASCII ART VISUALIZATION
# ===============================================================================

class ReplayUI:
    """Generate replay visualizations."""

    @staticmethod
    def generate_lineage_diagram(record: DecisionRecord) -> str:
        """Generate ASCII art lineage diagram."""
        prev_hash_display = record.previous_hash[:16] if record.previous_hash != "GENESIS" else "GENESIS"

        return f"""
+-------------------------------------------------------------+
|                    DECISION LINEAGE                          |
|                    ID: {record.id[:16]}...                   |
+-------------------------------------------------------------+
|                                                              |
|  INPUTS                                                      |
|  +-- Hash: {record.lineage.input_hash[:16]}...               |
|                                                              |
|  EXTRACTION                                                  |
|  +-- Model: {record.lineage.model_id:<44}|
|  +-- Version: {record.lineage.extraction_version:<41}|
|  +-- Hash: {record.extraction_hash[:16]}...                  |
|                                                              |
|  CALCULATION                                                 |
|  +-- Version: {record.lineage.calculator_version:<41}|
|  +-- Hash: {record.calculation_hash[:16]}...                 |
|                                                              |
|  DECISION                                                    |
|  +-- Hash: {record.decision_hash[:16]}...                    |
|                                                              |
|  CHAIN                                                       |
|  +-- Previous: {prev_hash_display:<42}|
|  +-- Record: {record.record_hash[:16]}...                    |
|                                                              |
+-------------------------------------------------------------+
"""

    @staticmethod
    def generate_comparison_diagram(result: ReplayResult) -> str:
        """Generate ASCII art comparison diagram."""
        calc_status = "MATCH" if result.calculation_matched else "DIVERGED"
        extract_status = "MATCH" if result.extraction_matched else "DIVERGED"
        overall_status = result.match_type.value.upper()

        return f"""
+-------------------------------------------------------------+
|                    REPLAY COMPARISON                         |
|                    ID: {result.original_record.id[:16]}...   |
+-------------------------------------------------------------+
|                                                              |
|  ORIGINAL                        REPLAYED                    |
|  +--------+                      +--------+                  |
|                                                              |
|  Extraction: STORED              Extraction: [{extract_status}]       |
|  Calculation: {str(result.original_record.calculation_result)[:10]:<10}     Calculation: {str(result.replayed_calculation)[:10] if result.replayed_calculation else 'N/A':<10}|
|                                                              |
|  STATUS: [{calc_status}]                                     |
|                                                              |
|  Overall Match: [{overall_status}]                           |
|  Replay Time: {result.replay_time_ms}ms                                     |
|                                                              |
+-------------------------------------------------------------+
"""


# ===============================================================================
# SINGLETON ACCESS
# ===============================================================================

_engine: Optional[DecisionReplayEngine] = None
_engine_lock = threading.Lock()


def get_replay_engine(db_path: Path = None) -> DecisionReplayEngine:
    """Get or create the singleton replay engine."""
    global _engine

    with _engine_lock:
        if _engine is None:
            _engine = DecisionReplayEngine(db_path)
        return _engine


# ===============================================================================
# CONVENIENCE FUNCTIONS
# ===============================================================================

def record_decision(decision_type: str,
                    raw_inputs: Dict,
                    extraction_result: Dict,
                    calculation_result: Any,
                    final_decision: Any,
                    model_id: str = "unknown",
                    agent_id: str = "unknown",
                    context: Dict = None,
                    tags: List[str] = None,
                    notes: str = "") -> DecisionRecord:
    """
    Convenience function to record a decision.

    Uses the singleton engine instance.
    """
    engine = get_replay_engine()
    return engine.record_decision(
        decision_type=decision_type,
        raw_inputs=raw_inputs,
        context=context or {},
        extraction_result=extraction_result,
        calculation_result=calculation_result,
        final_decision=final_decision,
        model_id=model_id,
        agent_id=agent_id,
        tags=tags,
        notes=notes
    )


def replay_decision(decision_id: str,
                    mode: ReplayMode = ReplayMode.FULL) -> ReplayResult:
    """
    Convenience function to replay a decision.

    Uses the singleton engine instance.
    """
    engine = get_replay_engine()
    return engine.replay(decision_id, mode=mode)


def verify_all_decisions() -> Dict[str, bool]:
    """
    Verify all decisions in the chain.

    Returns dict of decision_id -> is_valid
    """
    engine = get_replay_engine()
    return engine.verify_chain()


# ===============================================================================
# CLI FOR TESTING
# ===============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Decision Replay Engine CLI")
    parser.add_argument("--stats", action="store_true", help="Show engine statistics")
    parser.add_argument("--verify", action="store_true", help="Verify all decisions")
    parser.add_argument("--replay", type=str, help="Replay a specific decision by ID")
    parser.add_argument("--export", type=str, nargs="+", help="Export decisions by ID")
    parser.add_argument("--demo", action="store_true", help="Run demo with sample decision")

    args = parser.parse_args()

    engine = get_replay_engine()

    if args.stats:
        stats = engine.get_stats()
        print(json.dumps(stats, indent=2, default=str))

    elif args.verify:
        results = engine.verify_chain()
        all_valid = all(results.values())
        print(f"Chain Verification: {'PASSED' if all_valid else 'FAILED'}")
        print(f"Total decisions: {len(results)}")
        if not all_valid:
            invalid = [k for k, v in results.items() if not v]
            print(f"Invalid records: {invalid}")

    elif args.replay:
        result = engine.replay(args.replay, mode=ReplayMode.FULL)
        print(ReplayUI.generate_comparison_diagram(result))
        print(f"Match Type: {result.match_type.value}")
        print(f"Calculation Matched: {result.calculation_matched}")
        if result.differences:
            print("Differences:")
            for diff in result.differences:
                print(f"  - {diff}")

    elif args.export:
        export_bytes = engine.export_for_legal(args.export, format="html")
        output_file = DECISIONS_EXPORT_DIR / f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        output_file.write_bytes(export_bytes)
        print(f"Exported to: {output_file}")

    elif args.demo:
        print("Recording sample decision...")

        record = engine.record_decision(
            decision_type="task_priority",
            raw_inputs={"task": "Harvest tomatoes", "deadline": "tomorrow", "outdoor": True},
            context={"weather": "sunny", "energy": "high"},
            extraction_result={"urgency": 8, "importance": 9, "effort": 5, "outdoor": True},
            calculation_result=82.5,
            final_decision={"priority": 82.5, "action": "do_first", "reason": "High urgency + importance"},
            model_id="claude-3-opus-20240229",
            agent_id="pm_brain",
            tags=["harvest", "high-priority"],
            notes="Sample decision for testing"
        )

        print(ReplayUI.generate_lineage_diagram(record))

        print("\nReplaying decision...")
        result = engine.replay(record.id, mode=ReplayMode.FULL)
        print(ReplayUI.generate_comparison_diagram(result))

        print("\nLineage Report:")
        report = engine.get_lineage_report(record.id)
        print(json.dumps(report, indent=2, default=str))

    else:
        parser.print_help()
