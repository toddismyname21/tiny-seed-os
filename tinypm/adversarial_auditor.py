#!/usr/bin/env python3
"""
================================================================================
ADVERSARIAL AUDITOR - Black-Hat Agent for Chaos Testing & Decision Auditing
================================================================================

The "Mentor Agent" that stress-tests everything. This module provides:

1. CHAOS TESTING
   - Anti-pattern injection to verify Seed Vault catches violations
   - Edge case generation (empty, null, huge, unicode, etc.)
   - Malformed input testing

2. STRESS TESTING
   - Learning System bombardment with fake data
   - Context Fusion signal overload testing
   - Anticipatory Engine action flood testing

3. DECISION AUDITING
   - Blockchain-style immutable audit trail
   - Every agent decision recorded with cryptographic hashing
   - Tamper detection via hash chain verification

4. SECURITY PROBING
   - Permission escalation attempts
   - Seed Vault bypass attempts
   - Negotiation gaming detection

5. SIMULATED FLIGHT HOURS
   - Automated usage simulation
   - Random action generation
   - Performance/stability scoring

Architecture:
- All tests are NON-DESTRUCTIVE (use sandboxed/mock environments)
- Audit trail is tamper-evident via SHA-256 hash chain
- Can integrate with CI/CD pipelines

Created: 2026-02-04
Author: PM_Architect Claude
================================================================================
"""

import asyncio
import hashlib
import json
import os
import random
import string
import sys
import time
import traceback
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, Tuple, Union

# ================================================================================
# CONFIGURATION
# ================================================================================

APP_DIR = Path(__file__).parent
AUDIT_LOG_FILE = APP_DIR / ".audit_log.json"
AUDIT_INDEX_FILE = APP_DIR / ".audit_index.json"
TEST_RESULTS_FILE = APP_DIR / ".adversarial_test_results.json"
ANTI_PATTERNS_FILE = APP_DIR / "anti_patterns.json"
FLIGHT_REPORT_FILE = APP_DIR / ".flight_report.json"

# Limits to prevent accidental resource exhaustion
MAX_AUDIT_ENTRIES_IN_MEMORY = 10000
MAX_STRESS_TEST_ITEMS = 10000
MAX_FLIGHT_HOURS_SINGLE_RUN = 24

# ================================================================================
# ENUMS & DATA CLASSES
# ================================================================================

class TestSeverity(str, Enum):
    """Severity levels for test failures."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class SecurityRisk(str, Enum):
    """Categories of security risks."""
    PERMISSION_ESCALATION = "permission_escalation"
    DATA_LEAK = "data_leak"
    RULE_BYPASS = "rule_bypass"
    INJECTION = "injection"
    RESOURCE_EXHAUSTION = "resource_exhaustion"


class AuditEventType(str, Enum):
    """Types of auditable events."""
    DECISION = "decision"
    ACTION = "action"
    SUGGESTION = "suggestion"
    APPROVAL = "approval"
    REJECTION = "rejection"
    MODIFICATION = "modification"
    ERROR = "error"
    SECURITY_EVENT = "security_event"


@dataclass
class TestResult:
    """Result of a single test execution."""
    test_id: str
    test_name: str
    passed: bool
    severity: TestSeverity
    duration_ms: float
    message: str
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        result = asdict(self)
        result["severity"] = self.severity.value
        return result


@dataclass
class StressResult:
    """Result of a stress test."""
    test_id: str
    test_name: str
    target_system: str
    items_processed: int
    items_failed: int
    duration_seconds: float
    memory_before_mb: float
    memory_after_mb: float
    passed: bool
    stability_score: float  # 0-1
    errors: List[str] = field(default_factory=list)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class SecurityTestResult:
    """Result of a security probe."""
    test_id: str
    test_name: str
    risk_type: SecurityRisk
    vulnerability_found: bool
    severity: TestSeverity
    description: str
    remediation: str
    evidence: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        result = asdict(self)
        result["risk_type"] = self.risk_type.value
        result["severity"] = self.severity.value
        return result


@dataclass
class AuditEntry:
    """
    Immutable audit record with cryptographic hash for tamper detection.

    Uses blockchain-style chaining where each entry's hash incorporates
    the previous entry's hash, making the chain tamper-evident.
    """
    id: str
    timestamp: str
    event_type: AuditEventType
    agent: str
    action: str
    input_data: Dict[str, Any]
    output_data: Dict[str, Any]
    context: Dict[str, Any]
    seed_vault_check: bool
    duration_ms: float
    hash: str = ""
    previous_hash: str = ""

    def __post_init__(self):
        if not self.hash:
            self.hash = self._compute_hash()

    def _compute_hash(self) -> str:
        """Compute SHA-256 hash of entry for tamper detection."""
        data = {
            "id": self.id,
            "timestamp": self.timestamp,
            "event_type": self.event_type.value if isinstance(self.event_type, AuditEventType) else self.event_type,
            "agent": self.agent,
            "action": self.action,
            "input_data": json.dumps(self.input_data, sort_keys=True),
            "output_data": json.dumps(self.output_data, sort_keys=True),
            "context": json.dumps(self.context, sort_keys=True),
            "seed_vault_check": self.seed_vault_check,
            "previous_hash": self.previous_hash
        }
        content = json.dumps(data, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()

    def verify_integrity(self) -> bool:
        """Verify this entry's hash is correct."""
        computed = self._compute_hash()
        return computed == self.hash

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "event_type": self.event_type.value if isinstance(self.event_type, AuditEventType) else self.event_type,
            "agent": self.agent,
            "action": self.action,
            "input_data": self.input_data,
            "output_data": self.output_data,
            "context": self.context,
            "seed_vault_check": self.seed_vault_check,
            "duration_ms": self.duration_ms,
            "hash": self.hash,
            "previous_hash": self.previous_hash
        }

    @classmethod
    def from_dict(cls, data: dict) -> "AuditEntry":
        return cls(
            id=data["id"],
            timestamp=data["timestamp"],
            event_type=AuditEventType(data["event_type"]) if isinstance(data["event_type"], str) else data["event_type"],
            agent=data["agent"],
            action=data["action"],
            input_data=data["input_data"],
            output_data=data["output_data"],
            context=data["context"],
            seed_vault_check=data["seed_vault_check"],
            duration_ms=data.get("duration_ms", 0),
            hash=data["hash"],
            previous_hash=data["previous_hash"]
        )


@dataclass
class EdgeCase:
    """An edge case discovered during testing."""
    id: str
    category: str
    input_description: str
    actual_behavior: str
    expected_behavior: str
    severity: TestSeverity
    reproducible: bool
    steps_to_reproduce: List[str]
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class PerformanceMetrics:
    """Performance measurements from flight simulation."""
    avg_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    operations_per_second: float
    memory_peak_mb: float
    cpu_peak_percent: float
    gc_collections: int


@dataclass
class FlightReport:
    """Results from simulated flight hours."""
    report_id: str
    hours_simulated: float
    total_operations: int
    successful_operations: int
    failed_operations: int
    edge_cases_found: List[EdgeCase]
    performance_metrics: PerformanceMetrics
    stability_score: float  # 0-1
    recommendations: List[str]
    test_coverage: Dict[str, float]
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        return {
            "report_id": self.report_id,
            "hours_simulated": self.hours_simulated,
            "total_operations": self.total_operations,
            "successful_operations": self.successful_operations,
            "failed_operations": self.failed_operations,
            "edge_cases_found": [asdict(e) for e in self.edge_cases_found],
            "performance_metrics": asdict(self.performance_metrics),
            "stability_score": self.stability_score,
            "recommendations": self.recommendations,
            "test_coverage": self.test_coverage,
            "timestamp": self.timestamp
        }


@dataclass
class Vulnerability:
    """A discovered vulnerability."""
    id: str
    name: str
    category: SecurityRisk
    severity: TestSeverity
    description: str
    impact: str
    remediation: str
    cwe_id: Optional[str] = None
    cvss_score: Optional[float] = None


@dataclass
class AuditReport:
    """Comprehensive audit report."""
    report_id: str
    generated_at: str
    time_range_start: str
    time_range_end: str
    total_decisions: int
    decisions_by_agent: Dict[str, int]
    decisions_by_type: Dict[str, int]
    seed_vault_violations: int
    integrity_verified: bool
    tampering_detected: bool
    vulnerabilities: List[Vulnerability]
    health_score: float
    recommendations: List[str]


# ================================================================================
# ANTI-PATTERN LIBRARY
# ================================================================================

class AntiPatternLibrary:
    """
    Collection of known anti-patterns from UX research to test against.
    These are injected into the system to verify the Seed Vault catches them.
    """

    # UI Anti-Patterns (from research)
    UI_ANTI_PATTERNS = [
        {
            "id": "dropdown_instead_of_command",
            "name": "Dropdown Instead of Command Palette",
            "description": "Using nested dropdown menus instead of a searchable command palette",
            "category": "navigation",
            "severity": "high",
            "violation": {"type": "ui_pattern", "pattern": "dropdown_menu", "context": "action_selection"},
            "expected_rejection": "Command palette preferred over dropdowns for action-heavy interfaces"
        },
        {
            "id": "modal_overload",
            "name": "Modal Dialog Overload",
            "description": "Using modal dialogs for every interaction instead of inline editing",
            "category": "interaction",
            "severity": "medium",
            "violation": {"type": "ui_pattern", "pattern": "modal_dialog", "context": "simple_edit"},
            "expected_rejection": "Inline editing preferred for simple modifications"
        },
        {
            "id": "infinite_scroll_crud",
            "name": "Infinite Scroll for CRUD Operations",
            "description": "Using infinite scroll for data that needs bulk operations",
            "category": "data_display",
            "severity": "high",
            "violation": {"type": "ui_pattern", "pattern": "infinite_scroll", "context": "bulk_operations"},
            "expected_rejection": "Pagination with selection preferred for bulk operations"
        },
        {
            "id": "calendar_dropdown_dates",
            "name": "Calendar Widget for Known Dates",
            "description": "Forcing calendar picker when date is predictable (e.g., 'tomorrow')",
            "category": "input",
            "severity": "medium",
            "violation": {"type": "ui_pattern", "pattern": "calendar_picker", "context": "relative_date"},
            "expected_rejection": "Natural language date input preferred when context is clear"
        },
        {
            "id": "tooltip_critical_info",
            "name": "Critical Info Hidden in Tooltips",
            "description": "Hiding important information behind hover tooltips",
            "category": "information_architecture",
            "severity": "high",
            "violation": {"type": "ui_pattern", "pattern": "tooltip_info", "context": "critical_data"},
            "expected_rejection": "Critical information must be visible without interaction"
        },
        {
            "id": "auto_save_no_indicator",
            "name": "Auto-Save Without Indicator",
            "description": "Auto-saving without any visual feedback to user",
            "category": "feedback",
            "severity": "medium",
            "violation": {"type": "ui_pattern", "pattern": "auto_save", "context": "no_feedback"},
            "expected_rejection": "Auto-save requires clear visual feedback"
        },
        {
            "id": "wizard_no_skip",
            "name": "Wizard Without Skip Option",
            "description": "Multi-step wizard that doesn't allow skipping ahead",
            "category": "flow",
            "severity": "low",
            "violation": {"type": "ui_pattern", "pattern": "wizard_flow", "context": "no_skip"},
            "expected_rejection": "Users should be able to skip wizard steps when appropriate"
        },
        {
            "id": "destructive_action_easy",
            "name": "Easy Destructive Actions",
            "description": "Destructive actions (delete) too easy to trigger accidentally",
            "category": "safety",
            "severity": "critical",
            "violation": {"type": "ui_pattern", "pattern": "destructive_action", "context": "no_confirmation"},
            "expected_rejection": "Destructive actions require confirmation and undo"
        },
        {
            "id": "no_empty_state",
            "name": "Missing Empty State",
            "description": "Showing blank page when no data instead of helpful empty state",
            "category": "onboarding",
            "severity": "medium",
            "violation": {"type": "ui_pattern", "pattern": "empty_view", "context": "no_guidance"},
            "expected_rejection": "Empty states must guide users to next action"
        },
        {
            "id": "notification_no_action",
            "name": "Notification Without Action",
            "description": "Showing notification without a way to act on it",
            "category": "actionability",
            "severity": "medium",
            "violation": {"type": "ui_pattern", "pattern": "notification", "context": "no_cta"},
            "expected_rejection": "Notifications should include relevant actions"
        }
    ]

    # AI Behavior Anti-Patterns
    AI_ANTI_PATTERNS = [
        {
            "id": "overconfident_suggestion",
            "name": "Overconfident AI Suggestion",
            "description": "AI presents suggestion with very high confidence when data is sparse",
            "category": "calibration",
            "severity": "high",
            "violation": {"type": "ai_behavior", "pattern": "high_confidence", "data_quality": "sparse"},
            "expected_rejection": "Confidence must be calibrated to data quality"
        },
        {
            "id": "auto_execute_ambiguous",
            "name": "Auto-Execute on Ambiguous Intent",
            "description": "Auto-executing action when user intent is unclear",
            "category": "autonomy",
            "severity": "critical",
            "violation": {"type": "ai_behavior", "pattern": "auto_execute", "intent_clarity": "low"},
            "expected_rejection": "Auto-execute requires high confidence in user intent"
        },
        {
            "id": "no_reasoning_shown",
            "name": "No Reasoning Provided",
            "description": "AI makes decision without explaining why",
            "category": "explainability",
            "severity": "high",
            "violation": {"type": "ai_behavior", "pattern": "decision", "reasoning": None},
            "expected_rejection": "All AI decisions must include reasoning"
        },
        {
            "id": "interrupt_deep_work",
            "name": "Interrupt During Deep Work",
            "description": "AI proactively suggests something during focused work session",
            "category": "timing",
            "severity": "medium",
            "violation": {"type": "ai_behavior", "pattern": "proactive_suggestion", "user_state": "deep_work"},
            "expected_rejection": "Avoid interrupting during deep work sessions"
        },
        {
            "id": "repeated_rejected_suggestion",
            "name": "Repeating Rejected Suggestions",
            "description": "AI keeps suggesting something user has rejected multiple times",
            "category": "learning",
            "severity": "high",
            "violation": {"type": "ai_behavior", "pattern": "suggestion", "rejection_count": 3},
            "expected_rejection": "Suggestions rejected multiple times should not repeat"
        }
    ]

    # Data Handling Anti-Patterns
    DATA_ANTI_PATTERNS = [
        {
            "id": "pii_in_logs",
            "name": "PII in Debug Logs",
            "description": "Personal identifiable information written to logs",
            "category": "privacy",
            "severity": "critical",
            "violation": {"type": "data_handling", "pattern": "logging", "content": "pii"},
            "expected_rejection": "PII must never appear in logs"
        },
        {
            "id": "unbounded_query",
            "name": "Unbounded Data Query",
            "description": "Querying all records without limit",
            "category": "performance",
            "severity": "high",
            "violation": {"type": "data_handling", "pattern": "query", "limit": None},
            "expected_rejection": "All queries must have reasonable limits"
        },
        {
            "id": "no_input_validation",
            "name": "Missing Input Validation",
            "description": "User input used without validation",
            "category": "security",
            "severity": "critical",
            "violation": {"type": "data_handling", "pattern": "user_input", "validation": False},
            "expected_rejection": "All user input must be validated"
        }
    ]

    @classmethod
    def get_all_patterns(cls) -> List[dict]:
        """Get all anti-patterns."""
        return cls.UI_ANTI_PATTERNS + cls.AI_ANTI_PATTERNS + cls.DATA_ANTI_PATTERNS

    @classmethod
    def get_pattern_by_id(cls, pattern_id: str) -> Optional[dict]:
        """Get a specific anti-pattern by ID."""
        for pattern in cls.get_all_patterns():
            if pattern["id"] == pattern_id:
                return pattern
        return None

    @classmethod
    def get_patterns_by_category(cls, category: str) -> List[dict]:
        """Get anti-patterns by category."""
        return [p for p in cls.get_all_patterns() if p["category"] == category]

    @classmethod
    def get_patterns_by_severity(cls, severity: str) -> List[dict]:
        """Get anti-patterns by severity."""
        return [p for p in cls.get_all_patterns() if p["severity"] == severity]


# ================================================================================
# EDGE CASE GENERATORS
# ================================================================================

class EdgeCaseGenerator:
    """Generates adversarial inputs for edge case testing."""

    @staticmethod
    def generate_empty_inputs() -> List[dict]:
        """Generate various empty/null inputs."""
        return [
            {"type": "empty_string", "value": ""},
            {"type": "null", "value": None},
            {"type": "empty_list", "value": []},
            {"type": "empty_dict", "value": {}},
            {"type": "whitespace_only", "value": "   \t\n  "},
            {"type": "zero", "value": 0},
            {"type": "false", "value": False},
            {"type": "empty_set", "value": set()},
        ]

    @staticmethod
    def generate_huge_inputs() -> List[dict]:
        """Generate oversized inputs."""
        return [
            {"type": "huge_string", "value": "x" * 100000},
            {"type": "huge_number", "value": 10 ** 100},
            {"type": "negative_huge", "value": -(10 ** 100)},
            {"type": "huge_list", "value": list(range(10000))},
            {"type": "deep_nesting", "value": EdgeCaseGenerator._nested_dict(100)},
            {"type": "long_key_name", "value": {"a" * 10000: "value"}},
            {"type": "many_keys", "value": {f"key_{i}": i for i in range(10000)}},
        ]

    @staticmethod
    def _nested_dict(depth: int) -> dict:
        """Create deeply nested dictionary."""
        if depth <= 0:
            return {"leaf": "value"}
        return {"nested": EdgeCaseGenerator._nested_dict(depth - 1)}

    @staticmethod
    def generate_unicode_inputs() -> List[dict]:
        """Generate unicode edge cases."""
        return [
            {"type": "emoji", "value": "Hello World"},
            {"type": "rtl_text", "value": "hello world"},
            {"type": "mixed_direction", "value": "hello world test"},
            {"type": "zero_width_chars", "value": "he\u200bllo"},
            {"type": "homoglyphs", "value": "hello"},  # Using Cyrillic
            {"type": "null_byte", "value": "hello\x00world"},
            {"type": "unicode_escape", "value": "\\u0000"},
            {"type": "surrogate_pairs", "value": "hello world"},
            {"type": "combining_chars", "value": "e\u0301"},  # e + combining accent
            {"type": "control_chars", "value": "hello\x07world"},
            {"type": "bom", "value": "\ufeffhello"},
            {"type": "line_separators", "value": "hello\u2028world\u2029test"},
        ]

    @staticmethod
    def generate_type_confusion_inputs() -> List[dict]:
        """Generate inputs that might cause type confusion."""
        return [
            {"type": "string_number", "value": "123"},
            {"type": "string_bool_true", "value": "true"},
            {"type": "string_bool_false", "value": "false"},
            {"type": "string_null", "value": "null"},
            {"type": "string_undefined", "value": "undefined"},
            {"type": "string_nan", "value": "NaN"},
            {"type": "float_as_int", "value": 1.0},
            {"type": "negative_zero", "value": -0.0},
            {"type": "infinity", "value": float("inf")},
            {"type": "negative_infinity", "value": float("-inf")},
            {"type": "nan", "value": float("nan")},
        ]

    @staticmethod
    def generate_injection_inputs() -> List[dict]:
        """Generate potential injection payloads (for testing only)."""
        return [
            {"type": "sql_injection", "value": "'; DROP TABLE users; --"},
            {"type": "html_injection", "value": "<script>alert('xss')</script>"},
            {"type": "json_injection", "value": '{"key": "value", "__proto__": {}}'},
            {"type": "path_traversal", "value": "../../etc/passwd"},
            {"type": "command_injection", "value": "; ls -la"},
            {"type": "template_injection", "value": "{{7*7}}"},
            {"type": "ldap_injection", "value": "*)(uid=*))(|(uid=*"},
            {"type": "xml_injection", "value": "<?xml version='1.0'?><!DOCTYPE x [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]>"},
        ]

    @staticmethod
    def generate_all() -> List[dict]:
        """Generate all edge case inputs."""
        all_inputs = []
        all_inputs.extend(EdgeCaseGenerator.generate_empty_inputs())
        all_inputs.extend(EdgeCaseGenerator.generate_huge_inputs())
        all_inputs.extend(EdgeCaseGenerator.generate_unicode_inputs())
        all_inputs.extend(EdgeCaseGenerator.generate_type_confusion_inputs())
        all_inputs.extend(EdgeCaseGenerator.generate_injection_inputs())
        return all_inputs


# ================================================================================
# FAKE DATA GENERATORS (for stress testing)
# ================================================================================

class FakeDataGenerator:
    """Generates fake but realistic data for stress testing."""

    CROP_NAMES = ["Tomatoes", "Lettuce", "Carrots", "Peppers", "Cucumbers",
                  "Squash", "Beans", "Peas", "Corn", "Onions", "Garlic",
                  "Basil", "Cilantro", "Dill", "Parsley", "Kale", "Spinach"]

    TASK_TYPES = ["planting", "harvesting", "weeding", "watering", "fertilizing",
                  "pest_control", "equipment_maintenance", "delivery", "admin"]

    ASSIGNEES = ["Todd", "Sarah", "Mike", "Emma", "James", "Lisa", "Chris", "Amy"]

    @classmethod
    def generate_task(cls, task_id: Optional[str] = None) -> dict:
        """Generate a fake but realistic task."""
        now = datetime.now()
        due_offset = random.randint(-2, 14)  # -2 to +14 days

        return {
            "task_id": task_id or f"TASK-{uuid.uuid4().hex[:8].upper()}",
            "title": f"{random.choice(['Harvest', 'Plant', 'Weed', 'Water', 'Check', 'Prepare'])} {random.choice(cls.CROP_NAMES)}",
            "task_type": random.choice(cls.TASK_TYPES),
            "assignee": random.choice(cls.ASSIGNEES),
            "status": random.choice(["pending", "in_progress", "completed"]),
            "priority": random.choice(["low", "medium", "high", "urgent"]),
            "due_date": (now + timedelta(days=due_offset)).isoformat(),
            "created_at": (now - timedelta(days=random.randint(0, 30))).isoformat(),
            "estimated_hours": random.uniform(0.5, 8.0),
            "notes": f"Auto-generated task for stress testing - ID {uuid.uuid4().hex[:6]}",
            "metadata": {
                "source": "adversarial_auditor",
                "test_run_id": uuid.uuid4().hex,
                "is_fake": True
            }
        }

    @classmethod
    def generate_prediction(cls, prediction_id: Optional[str] = None) -> dict:
        """Generate a fake prediction for learning system testing."""
        return {
            "prediction_id": prediction_id or f"PRED-{uuid.uuid4().hex[:8]}",
            "prediction_type": random.choice(["task_suggestion", "schedule_change", "priority_bump", "email_draft", "meeting_prep"]),
            "confidence": random.uniform(0.3, 0.99),
            "context": {
                "time_of_day": random.choice(["morning", "afternoon", "evening"]),
                "day_of_week": random.choice(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
                "weather": random.choice(["sunny", "cloudy", "rainy"]),
                "workload": random.choice(["light", "normal", "heavy"])
            },
            "suggested_action": f"Auto-generated suggestion - {uuid.uuid4().hex[:6]}",
            "reasoning": ["Reason 1", "Reason 2", "Reason 3"],
            "timestamp": datetime.now().isoformat(),
            "metadata": {
                "source": "adversarial_auditor",
                "is_fake": True
            }
        }

    @classmethod
    def generate_signal(cls, signal_id: Optional[str] = None) -> dict:
        """Generate a fake context fusion signal."""
        signal_types = ["time_context", "calendar", "weather", "tasks", "email", "user_behavior", "seasonal"]
        signal_type = random.choice(signal_types)

        return {
            "signal_id": signal_id or f"SIG-{uuid.uuid4().hex[:8]}",
            "signal_type": signal_type,
            "strength": random.uniform(0.1, 1.0),
            "freshness": random.uniform(0.0, 1.0),
            "data": cls._generate_signal_data(signal_type),
            "timestamp": datetime.now().isoformat(),
            "metadata": {
                "source": "adversarial_auditor",
                "is_fake": True
            }
        }

    @classmethod
    def _generate_signal_data(cls, signal_type: str) -> dict:
        """Generate type-appropriate signal data."""
        if signal_type == "weather":
            return {"temp_f": random.randint(20, 100), "condition": random.choice(["sunny", "cloudy", "rainy"])}
        elif signal_type == "calendar":
            return {"next_meeting_minutes": random.randint(0, 480), "meetings_today": random.randint(0, 8)}
        elif signal_type == "tasks":
            return {"pending_count": random.randint(0, 50), "urgent_count": random.randint(0, 5)}
        elif signal_type == "email":
            return {"unread_count": random.randint(0, 100), "urgent_count": random.randint(0, 10)}
        else:
            return {"value": random.random()}

    @classmethod
    def generate_action(cls, action_id: Optional[str] = None) -> dict:
        """Generate a fake anticipatory action."""
        trust_levels = ["inform", "suggest", "pre_prepare", "one_click", "auto_execute"]

        return {
            "action_id": action_id or f"ACT-{uuid.uuid4().hex[:8]}",
            "title": f"Suggested: {random.choice(['Send email', 'Create task', 'Schedule meeting', 'Update priority', 'Archive item'])}",
            "description": f"Auto-generated action for testing - {uuid.uuid4().hex[:6]}",
            "trust_level": random.choice(trust_levels),
            "confidence": random.uniform(0.5, 0.99),
            "reasoning": "Based on learned patterns and current context",
            "status": "pending",
            "timestamp": datetime.now().isoformat(),
            "metadata": {
                "source": "adversarial_auditor",
                "is_fake": True
            }
        }


# ================================================================================
# SEED VAULT INTERFACE (Mock for testing)
# ================================================================================

class SeedVault:
    """
    Interface to the Seed Vault - the system that enforces design principles.
    This is a mock implementation for testing. In production, this would
    connect to the actual Seed Vault system.
    """

    def __init__(self):
        self.rules = self._load_default_rules()
        self.violations_log = []

    def _load_default_rules(self) -> List[dict]:
        """Load default Seed Vault rules."""
        return [
            {"id": "no_dropdown_for_actions", "pattern": "dropdown_menu", "context": "action_selection", "action": "reject"},
            {"id": "no_modal_for_simple_edit", "pattern": "modal_dialog", "context": "simple_edit", "action": "reject"},
            {"id": "require_confirmation_destructive", "pattern": "destructive_action", "context": "no_confirmation", "action": "reject"},
            {"id": "require_empty_state_guidance", "pattern": "empty_view", "context": "no_guidance", "action": "reject"},
            {"id": "calibrate_confidence", "pattern": "high_confidence", "data_quality": "sparse", "action": "reject"},
            {"id": "require_reasoning", "pattern": "decision", "reasoning": None, "action": "reject"},
            {"id": "no_pii_in_logs", "pattern": "logging", "content": "pii", "action": "reject"},
            {"id": "require_input_validation", "pattern": "user_input", "validation": False, "action": "reject"},
        ]

    def validate(self, proposal: dict) -> Tuple[bool, Optional[str]]:
        """
        Validate a proposal against Seed Vault rules.
        Returns (is_valid, rejection_reason)
        """
        violation = proposal.get("violation", {})

        for rule in self.rules:
            if self._matches_rule(violation, rule):
                self.violations_log.append({
                    "timestamp": datetime.now().isoformat(),
                    "rule_id": rule["id"],
                    "violation": violation,
                    "action": rule["action"]
                })
                return (False, f"Violates rule: {rule['id']}")

        return (True, None)

    def _matches_rule(self, violation: dict, rule: dict) -> bool:
        """Check if a violation matches a rule."""
        for key, expected_value in rule.items():
            if key in ["id", "action"]:
                continue
            actual_value = violation.get(key)
            if actual_value == expected_value:
                continue
            elif expected_value is not None:
                return False
        return True

    def get_violations(self) -> List[dict]:
        """Get all logged violations."""
        return self.violations_log.copy()

    def clear_violations(self):
        """Clear violation log."""
        self.violations_log = []


# ================================================================================
# ADVERSARIAL AUDITOR - MAIN CLASS
# ================================================================================

class AdversarialAuditor:
    """
    Black-Hat agent for chaos testing and decision auditing.

    This is the "Mentor Agent" that stress-tests everything to ensure
    the system is robust, secure, and follows established patterns.
    """

    def __init__(self, seed_vault: Optional[SeedVault] = None, systems: Optional[dict] = None):
        """
        Initialize the Adversarial Auditor.

        Args:
            seed_vault: The SeedVault instance for rule validation
            systems: Dict of system references for integration testing
        """
        self.seed_vault = seed_vault or SeedVault()
        self.systems = systems or {}

        self.test_results: List[TestResult] = []
        self.audit_entries: List[AuditEntry] = []
        self.last_hash = "0" * 64  # Genesis hash

        # Load existing audit log if present
        self._load_audit_log()

    # =========================================================================
    # CHAOS TESTING
    # =========================================================================

    async def inject_anti_pattern(self, pattern_name: str) -> TestResult:
        """
        Inject an anti-pattern to verify the Seed Vault catches it.

        Args:
            pattern_name: ID of the anti-pattern to inject

        Returns:
            TestResult indicating whether the anti-pattern was properly caught
        """
        start_time = time.time()
        test_id = f"CHAOS-{uuid.uuid4().hex[:8]}"

        pattern = AntiPatternLibrary.get_pattern_by_id(pattern_name)
        if not pattern:
            return TestResult(
                test_id=test_id,
                test_name=f"Anti-Pattern Injection: {pattern_name}",
                passed=False,
                severity=TestSeverity.INFO,
                duration_ms=(time.time() - start_time) * 1000,
                message=f"Anti-pattern '{pattern_name}' not found in library",
                details={"available_patterns": [p["id"] for p in AntiPatternLibrary.get_all_patterns()]}
            )

        # Attempt to inject the anti-pattern
        is_valid, rejection_reason = self.seed_vault.validate(pattern)

        # The test PASSES if the anti-pattern is REJECTED
        test_passed = not is_valid

        duration_ms = (time.time() - start_time) * 1000

        result = TestResult(
            test_id=test_id,
            test_name=f"Anti-Pattern Injection: {pattern['name']}",
            passed=test_passed,
            severity=TestSeverity(pattern["severity"]) if pattern["severity"] in [e.value for e in TestSeverity] else TestSeverity.MEDIUM,
            duration_ms=duration_ms,
            message=rejection_reason if test_passed else f"VULNERABILITY: Anti-pattern '{pattern['name']}' was NOT caught by Seed Vault",
            details={
                "pattern": pattern,
                "was_rejected": not is_valid,
                "expected_rejection": pattern.get("expected_rejection")
            }
        )

        self.test_results.append(result)
        return result

    async def run_chaos_suite(self) -> List[TestResult]:
        """
        Run the full chaos testing suite against all known anti-patterns.

        Returns:
            List of TestResult for each anti-pattern test
        """
        results = []
        all_patterns = AntiPatternLibrary.get_all_patterns()

        for pattern in all_patterns:
            result = await self.inject_anti_pattern(pattern["id"])
            results.append(result)
            # Small delay between tests
            await asyncio.sleep(0.01)

        return results

    def generate_adversarial_input(self, target: str) -> dict:
        """
        Generate adversarial input for a specific target system.

        Args:
            target: Name of target system ("learning", "fusion", "anticipatory", "general")

        Returns:
            Dict containing adversarial input data
        """
        edge_cases = EdgeCaseGenerator.generate_all()
        selected_case = random.choice(edge_cases)

        if target == "learning":
            return {
                "prediction": FakeDataGenerator.generate_prediction(),
                "adversarial_modifier": selected_case,
                "intent": "test_learning_system_robustness"
            }
        elif target == "fusion":
            return {
                "signal": FakeDataGenerator.generate_signal(),
                "adversarial_modifier": selected_case,
                "intent": "test_context_fusion_robustness"
            }
        elif target == "anticipatory":
            return {
                "action": FakeDataGenerator.generate_action(),
                "adversarial_modifier": selected_case,
                "intent": "test_anticipatory_engine_robustness"
            }
        else:
            return {
                "edge_case": selected_case,
                "intent": "general_robustness_test"
            }

    # =========================================================================
    # STRESS TESTING
    # =========================================================================

    async def stress_test_learning_system(self, fake_data_count: int) -> StressResult:
        """
        Stress test the learning system with large volumes of fake data.

        Args:
            fake_data_count: Number of fake predictions to generate

        Returns:
            StressResult with test metrics
        """
        test_id = f"STRESS-LS-{uuid.uuid4().hex[:8]}"
        count = min(fake_data_count, MAX_STRESS_TEST_ITEMS)

        # Memory measurement (simplified)
        import gc
        gc.collect()
        memory_before = self._get_memory_usage()

        start_time = time.time()
        items_failed = 0
        errors = []

        for i in range(count):
            try:
                prediction = FakeDataGenerator.generate_prediction()
                # Simulate processing - in production this would call actual learning system
                await self._simulate_learning_processing(prediction)
            except Exception as e:
                items_failed += 1
                if len(errors) < 10:  # Limit error storage
                    errors.append(str(e))

        duration = time.time() - start_time
        gc.collect()
        memory_after = self._get_memory_usage()

        # Calculate stability score
        success_rate = (count - items_failed) / count if count > 0 else 0
        memory_growth = (memory_after - memory_before) / memory_before if memory_before > 0 else 0
        stability_score = max(0, min(1, success_rate - (memory_growth * 0.5)))

        return StressResult(
            test_id=test_id,
            test_name="Learning System Stress Test",
            target_system="learning_system",
            items_processed=count,
            items_failed=items_failed,
            duration_seconds=duration,
            memory_before_mb=memory_before,
            memory_after_mb=memory_after,
            passed=stability_score >= 0.9,
            stability_score=stability_score,
            errors=errors
        )

    async def stress_test_context_fusion(self, signal_count: int) -> StressResult:
        """
        Stress test the context fusion engine with many signals.

        Args:
            signal_count: Number of fake signals to generate

        Returns:
            StressResult with test metrics
        """
        test_id = f"STRESS-CF-{uuid.uuid4().hex[:8]}"
        count = min(signal_count, MAX_STRESS_TEST_ITEMS)

        import gc
        gc.collect()
        memory_before = self._get_memory_usage()

        start_time = time.time()
        items_failed = 0
        errors = []

        for i in range(count):
            try:
                signal = FakeDataGenerator.generate_signal()
                await self._simulate_fusion_processing(signal)
            except Exception as e:
                items_failed += 1
                if len(errors) < 10:
                    errors.append(str(e))

        duration = time.time() - start_time
        gc.collect()
        memory_after = self._get_memory_usage()

        success_rate = (count - items_failed) / count if count > 0 else 0
        memory_growth = (memory_after - memory_before) / memory_before if memory_before > 0 else 0
        stability_score = max(0, min(1, success_rate - (memory_growth * 0.5)))

        return StressResult(
            test_id=test_id,
            test_name="Context Fusion Stress Test",
            target_system="context_fusion",
            items_processed=count,
            items_failed=items_failed,
            duration_seconds=duration,
            memory_before_mb=memory_before,
            memory_after_mb=memory_after,
            passed=stability_score >= 0.9,
            stability_score=stability_score,
            errors=errors
        )

    async def stress_test_anticipatory_engine(self, action_count: int) -> StressResult:
        """
        Stress test the anticipatory action engine.

        Args:
            action_count: Number of fake actions to generate

        Returns:
            StressResult with test metrics
        """
        test_id = f"STRESS-AE-{uuid.uuid4().hex[:8]}"
        count = min(action_count, MAX_STRESS_TEST_ITEMS)

        import gc
        gc.collect()
        memory_before = self._get_memory_usage()

        start_time = time.time()
        items_failed = 0
        errors = []

        for i in range(count):
            try:
                action = FakeDataGenerator.generate_action()
                await self._simulate_action_processing(action)
            except Exception as e:
                items_failed += 1
                if len(errors) < 10:
                    errors.append(str(e))

        duration = time.time() - start_time
        gc.collect()
        memory_after = self._get_memory_usage()

        success_rate = (count - items_failed) / count if count > 0 else 0
        memory_growth = (memory_after - memory_before) / memory_before if memory_before > 0 else 0
        stability_score = max(0, min(1, success_rate - (memory_growth * 0.5)))

        return StressResult(
            test_id=test_id,
            test_name="Anticipatory Engine Stress Test",
            target_system="anticipatory_engine",
            items_processed=count,
            items_failed=items_failed,
            duration_seconds=duration,
            memory_before_mb=memory_before,
            memory_after_mb=memory_after,
            passed=stability_score >= 0.9,
            stability_score=stability_score,
            errors=errors
        )

    # Simulation helpers (these would be replaced with actual system calls in production)
    async def _simulate_learning_processing(self, prediction: dict):
        """Simulate learning system processing."""
        await asyncio.sleep(0.001)  # Simulate processing time
        # In production: self.systems["learning"].process_prediction(prediction)

    async def _simulate_fusion_processing(self, signal: dict):
        """Simulate context fusion processing."""
        await asyncio.sleep(0.001)
        # In production: self.systems["fusion"].ingest_signal(signal)

    async def _simulate_action_processing(self, action: dict):
        """Simulate anticipatory engine processing."""
        await asyncio.sleep(0.001)
        # In production: self.systems["anticipatory"].queue_action(action)

    def _get_memory_usage(self) -> float:
        """Get current memory usage in MB."""
        try:
            import psutil
            process = psutil.Process(os.getpid())
            return process.memory_info().rss / (1024 * 1024)
        except ImportError:
            # Fallback if psutil not available
            return 0.0

    # =========================================================================
    # DECISION AUDITING
    # =========================================================================

    def record_decision(self, agent: str, action: str, input_data: dict,
                       output_data: dict, context: dict, seed_vault_check: bool,
                       duration_ms: float = 0) -> str:
        """
        Record a decision in the audit trail.

        Args:
            agent: Name of the agent making the decision
            action: Description of the action taken
            input_data: Input data for the decision
            output_data: Output/result of the decision
            context: Additional context
            seed_vault_check: Whether Seed Vault validation passed
            duration_ms: Time taken for the decision

        Returns:
            ID of the created audit entry
        """
        entry_id = f"AUD-{uuid.uuid4().hex[:12]}"

        entry = AuditEntry(
            id=entry_id,
            timestamp=datetime.now().isoformat(),
            event_type=AuditEventType.DECISION,
            agent=agent,
            action=action,
            input_data=input_data,
            output_data=output_data,
            context=context,
            seed_vault_check=seed_vault_check,
            duration_ms=duration_ms,
            previous_hash=self.last_hash
        )

        # Update hash chain
        self.last_hash = entry.hash

        # Store entry
        self.audit_entries.append(entry)

        # Persist periodically
        if len(self.audit_entries) % 100 == 0:
            self._save_audit_log()

        return entry_id

    def get_decision_trail(self, start: datetime, end: datetime) -> List[AuditEntry]:
        """
        Get all audit entries in a time range.

        Args:
            start: Start datetime
            end: End datetime

        Returns:
            List of AuditEntry objects in the time range
        """
        results = []
        for entry in self.audit_entries:
            entry_time = datetime.fromisoformat(entry.timestamp)
            if start <= entry_time <= end:
                results.append(entry)
        return results

    def verify_decision_integrity(self, decision_id: str) -> bool:
        """
        Verify the integrity of a specific decision and its chain.

        Args:
            decision_id: ID of the decision to verify

        Returns:
            True if the decision and its chain are intact
        """
        # Find the entry
        target_entry = None
        target_index = -1
        for i, entry in enumerate(self.audit_entries):
            if entry.id == decision_id:
                target_entry = entry
                target_index = i
                break

        if not target_entry:
            return False

        # Verify entry's own hash
        if not target_entry.verify_integrity():
            return False

        # Verify chain from this entry back
        current_hash = target_entry.previous_hash
        for i in range(target_index - 1, -1, -1):
            entry = self.audit_entries[i]
            if entry.hash != current_hash:
                return False
            if not entry.verify_integrity():
                return False
            current_hash = entry.previous_hash

        return True

    def verify_full_chain_integrity(self) -> Tuple[bool, Optional[str]]:
        """
        Verify the integrity of the entire audit chain.

        Returns:
            Tuple of (is_valid, first_corrupted_entry_id)
        """
        if not self.audit_entries:
            return (True, None)

        expected_prev_hash = "0" * 64  # Genesis

        for entry in self.audit_entries:
            # Verify previous hash matches
            if entry.previous_hash != expected_prev_hash:
                return (False, entry.id)

            # Verify entry's own hash
            if not entry.verify_integrity():
                return (False, entry.id)

            expected_prev_hash = entry.hash

        return (True, None)

    def export_audit_log(self, format: str = "json") -> bytes:
        """
        Export the audit log in specified format.

        Args:
            format: Export format ("json" or "csv")

        Returns:
            Bytes of the exported data
        """
        if format == "json":
            data = {
                "export_time": datetime.now().isoformat(),
                "entries": [e.to_dict() for e in self.audit_entries],
                "total_entries": len(self.audit_entries),
                "chain_valid": self.verify_full_chain_integrity()[0]
            }
            return json.dumps(data, indent=2).encode("utf-8")

        elif format == "csv":
            import csv
            import io

            output = io.StringIO()
            writer = csv.writer(output)

            # Header
            writer.writerow(["id", "timestamp", "event_type", "agent", "action",
                           "seed_vault_check", "duration_ms", "hash"])

            # Data
            for entry in self.audit_entries:
                writer.writerow([
                    entry.id,
                    entry.timestamp,
                    entry.event_type.value if isinstance(entry.event_type, AuditEventType) else entry.event_type,
                    entry.agent,
                    entry.action,
                    entry.seed_vault_check,
                    entry.duration_ms,
                    entry.hash[:16] + "..."  # Truncate hash for CSV
                ])

            return output.getvalue().encode("utf-8")

        else:
            raise ValueError(f"Unsupported format: {format}")

    def _load_audit_log(self):
        """Load existing audit log from disk."""
        if AUDIT_LOG_FILE.exists():
            try:
                data = json.loads(AUDIT_LOG_FILE.read_text())
                self.audit_entries = [AuditEntry.from_dict(e) for e in data.get("entries", [])]
                if self.audit_entries:
                    self.last_hash = self.audit_entries[-1].hash
            except Exception as e:
                print(f"Warning: Could not load audit log: {e}")

    def _save_audit_log(self):
        """Save audit log to disk."""
        try:
            # Keep only recent entries in memory
            if len(self.audit_entries) > MAX_AUDIT_ENTRIES_IN_MEMORY:
                # Archive older entries
                archive_entries = self.audit_entries[:-MAX_AUDIT_ENTRIES_IN_MEMORY]
                self.audit_entries = self.audit_entries[-MAX_AUDIT_ENTRIES_IN_MEMORY:]
                # TODO: Archive to separate file

            data = {
                "last_updated": datetime.now().isoformat(),
                "entries": [e.to_dict() for e in self.audit_entries],
                "last_hash": self.last_hash
            }
            AUDIT_LOG_FILE.write_text(json.dumps(data, indent=2))
        except Exception as e:
            print(f"Warning: Could not save audit log: {e}")

    # =========================================================================
    # SECURITY PROBING
    # =========================================================================

    async def attempt_permission_escalation(self) -> SecurityTestResult:
        """
        Attempt to escalate permissions beyond what should be allowed.

        Returns:
            SecurityTestResult indicating if escalation was possible
        """
        test_id = f"SEC-PE-{uuid.uuid4().hex[:8]}"
        vulnerability_found = False
        evidence = {}

        # Test 1: Try to access admin functions as non-admin
        try:
            # Simulate attempting admin action
            result = await self._attempt_admin_action_as_user()
            if result.get("success"):
                vulnerability_found = True
                evidence["admin_access"] = result
        except Exception as e:
            evidence["admin_access_error"] = str(e)

        # Test 2: Try to modify another user's data
        try:
            result = await self._attempt_cross_user_modification()
            if result.get("success"):
                vulnerability_found = True
                evidence["cross_user_access"] = result
        except Exception as e:
            evidence["cross_user_error"] = str(e)

        # Test 3: Try to access system configuration
        try:
            result = await self._attempt_config_access()
            if result.get("success"):
                vulnerability_found = True
                evidence["config_access"] = result
        except Exception as e:
            evidence["config_error"] = str(e)

        return SecurityTestResult(
            test_id=test_id,
            test_name="Permission Escalation Probe",
            risk_type=SecurityRisk.PERMISSION_ESCALATION,
            vulnerability_found=vulnerability_found,
            severity=TestSeverity.CRITICAL if vulnerability_found else TestSeverity.INFO,
            description="Attempted to escalate user permissions to admin level",
            remediation="Implement proper RBAC and verify permissions on every request",
            evidence=evidence
        )

    async def attempt_seed_vault_bypass(self) -> SecurityTestResult:
        """
        Attempt to bypass Seed Vault rules.

        Returns:
            SecurityTestResult indicating if bypass was possible
        """
        test_id = f"SEC-SVB-{uuid.uuid4().hex[:8]}"
        vulnerability_found = False
        evidence = {"bypass_attempts": []}

        # Get all anti-patterns
        patterns = AntiPatternLibrary.get_all_patterns()

        for pattern in patterns:
            # Try various bypass techniques
            bypass_attempts = [
                # Attempt 1: Wrap in legitimate-looking wrapper
                {"wrapper": "legitimate_action", "hidden_payload": pattern["violation"]},
                # Attempt 2: Split across multiple requests
                {"partial_1": pattern["violation"].copy(), "type": "partial"},
                # Attempt 3: Use alternative field names
                {k.upper(): v for k, v in pattern["violation"].items()},
                # Attempt 4: Encode payload
                {"encoded": json.dumps(pattern["violation"])},
            ]

            for attempt in bypass_attempts:
                is_valid, _ = self.seed_vault.validate(attempt)
                if is_valid and pattern["severity"] in ["critical", "high"]:
                    vulnerability_found = True
                    evidence["bypass_attempts"].append({
                        "pattern_id": pattern["id"],
                        "attempt": str(attempt)[:200],
                        "bypassed": True
                    })

        return SecurityTestResult(
            test_id=test_id,
            test_name="Seed Vault Bypass Probe",
            risk_type=SecurityRisk.RULE_BYPASS,
            vulnerability_found=vulnerability_found,
            severity=TestSeverity.HIGH if vulnerability_found else TestSeverity.INFO,
            description="Attempted to bypass Seed Vault validation rules",
            remediation="Strengthen Seed Vault pattern matching and add recursive payload inspection",
            evidence=evidence
        )

    async def attempt_negotiation_gaming(self) -> SecurityTestResult:
        """
        Attempt to reach consensus that violates Seed Vault rules
        through negotiation/voting manipulation.

        Returns:
            SecurityTestResult indicating if gaming was possible
        """
        test_id = f"SEC-NG-{uuid.uuid4().hex[:8]}"
        vulnerability_found = False
        evidence = {"gaming_attempts": []}

        # Simulate multi-agent negotiation scenarios
        gaming_scenarios = [
            {
                "name": "majority_override",
                "description": "Try to override Seed Vault with majority vote",
                "agents": ["agent_1", "agent_2", "agent_3"],
                "votes": {"approve_violation": 3, "reject_violation": 0},
                "violation": {"type": "ui_pattern", "pattern": "destructive_action", "context": "no_confirmation"}
            },
            {
                "name": "gradual_relaxation",
                "description": "Gradually relax rules through incremental proposals",
                "steps": [
                    {"relax": "confirmation_timeout", "from": 5, "to": 3},
                    {"relax": "confirmation_timeout", "from": 3, "to": 1},
                    {"relax": "confirmation_timeout", "from": 1, "to": 0},
                ]
            },
            {
                "name": "authority_impersonation",
                "description": "Impersonate admin agent to approve violation",
                "impersonated_agent": "admin_agent",
                "approval": {"type": "rule_exception", "reason": "emergency"}
            }
        ]

        for scenario in gaming_scenarios:
            # Check if Seed Vault would catch this
            if "violation" in scenario:
                is_valid, _ = self.seed_vault.validate(scenario["violation"])
                if is_valid:
                    vulnerability_found = True
                    evidence["gaming_attempts"].append({
                        "scenario": scenario["name"],
                        "success": True
                    })

        return SecurityTestResult(
            test_id=test_id,
            test_name="Negotiation Gaming Probe",
            risk_type=SecurityRisk.RULE_BYPASS,
            vulnerability_found=vulnerability_found,
            severity=TestSeverity.HIGH if vulnerability_found else TestSeverity.INFO,
            description="Attempted to game multi-agent consensus to bypass rules",
            remediation="Implement Governor veto for all Seed Vault violations regardless of consensus",
            evidence=evidence
        )

    # Security probe helpers
    async def _attempt_admin_action_as_user(self) -> dict:
        """Simulate attempting admin action as regular user."""
        # In production, this would actually test the permission system
        return {"success": False, "blocked_by": "permission_check"}

    async def _attempt_cross_user_modification(self) -> dict:
        """Simulate attempting to modify another user's data."""
        return {"success": False, "blocked_by": "ownership_check"}

    async def _attempt_config_access(self) -> dict:
        """Simulate attempting to access system configuration."""
        return {"success": False, "blocked_by": "config_protection"}

    # =========================================================================
    # SIMULATED FLIGHT HOURS
    # =========================================================================

    async def run_simulated_flight_hours(self, hours: int) -> FlightReport:
        """
        Simulate N hours of real usage with random actions, edge cases,
        and failure scenarios to discover bugs before production.

        Args:
            hours: Number of hours to simulate (max 24)

        Returns:
            FlightReport with comprehensive test results
        """
        report_id = f"FLIGHT-{uuid.uuid4().hex[:8]}"
        actual_hours = min(hours, MAX_FLIGHT_HOURS_SINGLE_RUN)

        # Convert hours to simulated operations
        # Assume ~100 operations per hour of real usage
        operations_per_hour = 100
        total_operations = actual_hours * operations_per_hour

        start_time = time.time()
        successful = 0
        failed = 0
        edge_cases_found: List[EdgeCase] = []
        response_times: List[float] = []

        import gc
        gc.collect()
        memory_baseline = self._get_memory_usage()
        memory_peak = memory_baseline

        # Define operation types with weights
        operation_types = [
            ("create_task", 0.2),
            ("update_task", 0.15),
            ("generate_prediction", 0.15),
            ("process_signal", 0.15),
            ("queue_action", 0.1),
            ("query_audit", 0.05),
            ("stress_input", 0.1),
            ("edge_case_input", 0.1),
        ]

        for i in range(total_operations):
            # Select operation type based on weights
            op_type = self._weighted_choice(operation_types)

            op_start = time.time()
            try:
                result = await self._execute_simulated_operation(op_type)
                op_duration = (time.time() - op_start) * 1000
                response_times.append(op_duration)

                if result.get("success"):
                    successful += 1
                else:
                    failed += 1
                    if result.get("edge_case"):
                        edge_cases_found.append(result["edge_case"])

            except Exception as e:
                failed += 1
                op_duration = (time.time() - op_start) * 1000
                response_times.append(op_duration)

                # Record as edge case
                edge_case = EdgeCase(
                    id=f"EC-{uuid.uuid4().hex[:8]}",
                    category="exception",
                    input_description=f"Operation: {op_type}",
                    actual_behavior=f"Exception: {str(e)}",
                    expected_behavior="Operation should complete without exception",
                    severity=TestSeverity.HIGH,
                    reproducible=True,
                    steps_to_reproduce=[f"Execute {op_type} operation"]
                )
                edge_cases_found.append(edge_case)

            # Track memory
            current_memory = self._get_memory_usage()
            if current_memory > memory_peak:
                memory_peak = current_memory

            # Progress logging
            if (i + 1) % 1000 == 0:
                print(f"Flight simulation: {i + 1}/{total_operations} operations completed")

        total_duration = time.time() - start_time

        # Calculate performance metrics
        if response_times:
            sorted_times = sorted(response_times)
            performance = PerformanceMetrics(
                avg_response_time_ms=sum(response_times) / len(response_times),
                p95_response_time_ms=sorted_times[int(len(sorted_times) * 0.95)],
                p99_response_time_ms=sorted_times[int(len(sorted_times) * 0.99)],
                operations_per_second=total_operations / total_duration if total_duration > 0 else 0,
                memory_peak_mb=memory_peak,
                cpu_peak_percent=0,  # Would need psutil for accurate CPU measurement
                gc_collections=gc.get_count()[0] if hasattr(gc, 'get_count') else 0
            )
        else:
            performance = PerformanceMetrics(0, 0, 0, 0, 0, 0, 0)

        # Calculate stability score
        success_rate = successful / total_operations if total_operations > 0 else 0
        memory_stability = 1.0 - min(1.0, (memory_peak - memory_baseline) / memory_baseline) if memory_baseline > 0 else 1.0
        edge_case_penalty = len(edge_cases_found) * 0.01
        stability_score = max(0, min(1, (success_rate + memory_stability) / 2 - edge_case_penalty))

        # Generate recommendations
        recommendations = self._generate_flight_recommendations(
            stability_score, edge_cases_found, performance, success_rate
        )

        # Calculate test coverage
        test_coverage = {
            "chaos_tests": 1.0 if any(e.category == "anti_pattern" for e in edge_cases_found) else 0.5,
            "stress_tests": 1.0,
            "edge_case_tests": len([e for e in edge_cases_found if e.category != "exception"]) / 10.0,
            "security_tests": 0.5,  # Would be higher with actual security test integration
        }

        report = FlightReport(
            report_id=report_id,
            hours_simulated=actual_hours,
            total_operations=total_operations,
            successful_operations=successful,
            failed_operations=failed,
            edge_cases_found=edge_cases_found,
            performance_metrics=performance,
            stability_score=stability_score,
            recommendations=recommendations,
            test_coverage=test_coverage
        )

        # Save report
        self._save_flight_report(report)

        return report

    def _weighted_choice(self, choices: List[Tuple[str, float]]) -> str:
        """Select from weighted choices."""
        total = sum(weight for _, weight in choices)
        r = random.uniform(0, total)
        cumulative = 0
        for choice, weight in choices:
            cumulative += weight
            if r <= cumulative:
                return choice
        return choices[-1][0]

    async def _execute_simulated_operation(self, op_type: str) -> dict:
        """Execute a simulated operation."""
        if op_type == "create_task":
            task = FakeDataGenerator.generate_task()
            await asyncio.sleep(0.001)
            return {"success": True, "task_id": task["task_id"]}

        elif op_type == "update_task":
            await asyncio.sleep(0.001)
            return {"success": True}

        elif op_type == "generate_prediction":
            prediction = FakeDataGenerator.generate_prediction()
            await self._simulate_learning_processing(prediction)
            return {"success": True, "prediction_id": prediction["prediction_id"]}

        elif op_type == "process_signal":
            signal = FakeDataGenerator.generate_signal()
            await self._simulate_fusion_processing(signal)
            return {"success": True}

        elif op_type == "queue_action":
            action = FakeDataGenerator.generate_action()
            await self._simulate_action_processing(action)
            return {"success": True}

        elif op_type == "query_audit":
            now = datetime.now()
            self.get_decision_trail(now - timedelta(hours=1), now)
            return {"success": True}

        elif op_type == "stress_input":
            # Generate and process a stress input
            edge_case = random.choice(EdgeCaseGenerator.generate_all())
            # Simulate processing that might fail on bad input
            if edge_case["type"] in ["huge_string", "deep_nesting", "huge_list"]:
                await asyncio.sleep(0.01)  # Simulate slower processing
            return {"success": True}

        elif op_type == "edge_case_input":
            edge_case = random.choice(EdgeCaseGenerator.generate_all())
            try:
                # Validate the edge case
                if edge_case["type"] == "null":
                    raise ValueError("Null input not handled")
            except Exception:
                return {
                    "success": False,
                    "edge_case": EdgeCase(
                        id=f"EC-{uuid.uuid4().hex[:8]}",
                        category=edge_case["type"],
                        input_description=str(edge_case)[:100],
                        actual_behavior="Validation error",
                        expected_behavior="Graceful handling",
                        severity=TestSeverity.MEDIUM,
                        reproducible=True,
                        steps_to_reproduce=["Provide input with type: " + edge_case["type"]]
                    )
                }
            return {"success": True}

        return {"success": True}

    def _generate_flight_recommendations(self, stability_score: float,
                                         edge_cases: List[EdgeCase],
                                         performance: PerformanceMetrics,
                                         success_rate: float) -> List[str]:
        """Generate recommendations based on flight test results."""
        recommendations = []

        if stability_score < 0.9:
            recommendations.append("CRITICAL: Stability score below 90%. Investigate failures before production.")

        if success_rate < 0.99:
            recommendations.append(f"Success rate {success_rate*100:.1f}% - target 99%+. Review error handling.")

        if performance.avg_response_time_ms > 100:
            recommendations.append(f"Average response time {performance.avg_response_time_ms:.1f}ms exceeds 100ms target.")

        if performance.p99_response_time_ms > 500:
            recommendations.append(f"P99 latency {performance.p99_response_time_ms:.1f}ms indicates tail latency issues.")

        exception_cases = [e for e in edge_cases if e.category == "exception"]
        if exception_cases:
            recommendations.append(f"Found {len(exception_cases)} unhandled exceptions. Add error handling.")

        critical_cases = [e for e in edge_cases if e.severity == TestSeverity.CRITICAL]
        if critical_cases:
            recommendations.append(f"CRITICAL: {len(critical_cases)} critical edge cases found. Fix immediately.")

        if performance.memory_peak_mb > 500:
            recommendations.append(f"Memory peaked at {performance.memory_peak_mb:.1f}MB. Consider optimization.")

        if not recommendations:
            recommendations.append("All metrics within acceptable ranges. System ready for production.")

        return recommendations

    def _save_flight_report(self, report: FlightReport):
        """Save flight report to disk."""
        try:
            FLIGHT_REPORT_FILE.write_text(json.dumps(report.to_dict(), indent=2, default=str))
        except Exception as e:
            print(f"Warning: Could not save flight report: {e}")

    # =========================================================================
    # REPORTING
    # =========================================================================

    def generate_audit_report(self, start: Optional[datetime] = None,
                             end: Optional[datetime] = None) -> AuditReport:
        """
        Generate a comprehensive audit report.

        Args:
            start: Start of reporting period (default: last 24 hours)
            end: End of reporting period (default: now)

        Returns:
            AuditReport with comprehensive metrics
        """
        if not end:
            end = datetime.now()
        if not start:
            start = end - timedelta(hours=24)

        entries = self.get_decision_trail(start, end)

        # Aggregate statistics
        decisions_by_agent: Dict[str, int] = {}
        decisions_by_type: Dict[str, int] = {}
        seed_vault_violations = 0

        for entry in entries:
            # By agent
            agent = entry.agent
            decisions_by_agent[agent] = decisions_by_agent.get(agent, 0) + 1

            # By type
            event_type = entry.event_type.value if isinstance(entry.event_type, AuditEventType) else entry.event_type
            decisions_by_type[event_type] = decisions_by_type.get(event_type, 0) + 1

            # Violations
            if not entry.seed_vault_check:
                seed_vault_violations += 1

        # Verify chain integrity
        chain_valid, corrupted_id = self.verify_full_chain_integrity()

        # Get vulnerabilities from test results
        vulnerabilities = self._extract_vulnerabilities_from_tests()

        # Calculate health score
        health_score = self._calculate_health_score(entries, seed_vault_violations, chain_valid)

        # Generate recommendations
        recommendations = self._generate_audit_recommendations(
            health_score, seed_vault_violations, vulnerabilities, chain_valid
        )

        return AuditReport(
            report_id=f"AUDIT-{uuid.uuid4().hex[:8]}",
            generated_at=datetime.now().isoformat(),
            time_range_start=start.isoformat(),
            time_range_end=end.isoformat(),
            total_decisions=len(entries),
            decisions_by_agent=decisions_by_agent,
            decisions_by_type=decisions_by_type,
            seed_vault_violations=seed_vault_violations,
            integrity_verified=chain_valid,
            tampering_detected=not chain_valid,
            vulnerabilities=vulnerabilities,
            health_score=health_score,
            recommendations=recommendations
        )

    def calculate_system_health_score(self) -> float:
        """
        Calculate overall system health score (0-1).

        Factors:
        - Test pass rate
        - Audit chain integrity
        - Seed Vault violation rate
        - Performance metrics
        """
        factors = []

        # Test pass rate
        if self.test_results:
            passed = sum(1 for t in self.test_results if t.passed)
            factors.append(passed / len(self.test_results))

        # Chain integrity
        chain_valid, _ = self.verify_full_chain_integrity()
        factors.append(1.0 if chain_valid else 0.0)

        # Seed Vault compliance
        if self.audit_entries:
            compliant = sum(1 for e in self.audit_entries if e.seed_vault_check)
            factors.append(compliant / len(self.audit_entries))

        # Calculate weighted average
        if factors:
            return sum(factors) / len(factors)
        return 1.0  # No data = assume healthy

    def identify_vulnerabilities(self) -> List[Vulnerability]:
        """
        Identify vulnerabilities based on test results and audit analysis.

        Returns:
            List of discovered Vulnerability objects
        """
        return self._extract_vulnerabilities_from_tests()

    def _extract_vulnerabilities_from_tests(self) -> List[Vulnerability]:
        """Extract vulnerabilities from test results."""
        vulnerabilities = []

        for result in self.test_results:
            if not result.passed and result.severity in [TestSeverity.CRITICAL, TestSeverity.HIGH]:
                vuln = Vulnerability(
                    id=f"VULN-{uuid.uuid4().hex[:8]}",
                    name=result.test_name,
                    category=SecurityRisk.RULE_BYPASS,
                    severity=result.severity,
                    description=result.message,
                    impact="System may accept invalid or malicious inputs",
                    remediation="Review and strengthen validation rules"
                )
                vulnerabilities.append(vuln)

        return vulnerabilities

    def _calculate_health_score(self, entries: List[AuditEntry],
                               violations: int, chain_valid: bool) -> float:
        """Calculate health score from audit data."""
        if not entries:
            return 1.0

        # Compliance rate
        compliance_rate = 1.0 - (violations / len(entries)) if len(entries) > 0 else 1.0

        # Chain integrity (binary - either valid or not)
        integrity_score = 1.0 if chain_valid else 0.0

        # Weighted average
        return (compliance_rate * 0.7) + (integrity_score * 0.3)

    def _generate_audit_recommendations(self, health_score: float,
                                        violations: int,
                                        vulnerabilities: List[Vulnerability],
                                        chain_valid: bool) -> List[str]:
        """Generate recommendations for audit report."""
        recommendations = []

        if not chain_valid:
            recommendations.append("CRITICAL: Audit chain integrity compromised. Investigate potential tampering.")

        if violations > 0:
            recommendations.append(f"Found {violations} Seed Vault violations. Review agent compliance.")

        critical_vulns = [v for v in vulnerabilities if v.severity == TestSeverity.CRITICAL]
        if critical_vulns:
            recommendations.append(f"CRITICAL: {len(critical_vulns)} critical vulnerabilities require immediate attention.")

        if health_score < 0.8:
            recommendations.append(f"Health score {health_score*100:.1f}% below 80% threshold. System needs attention.")
        elif health_score < 0.9:
            recommendations.append(f"Health score {health_score*100:.1f}% below optimal. Review for improvements.")
        else:
            recommendations.append("System health is good. Continue regular auditing.")

        return recommendations


# ================================================================================
# CLI INTERFACE
# ================================================================================

async def main():
    """CLI entry point for Adversarial Auditor."""
    import argparse

    parser = argparse.ArgumentParser(description="Adversarial Auditor - Black-Hat Testing System")
    parser.add_argument("--chaos", action="store_true", help="Run chaos testing suite")
    parser.add_argument("--stress", type=int, metavar="COUNT", help="Run stress test with COUNT items")
    parser.add_argument("--security", action="store_true", help="Run security probes")
    parser.add_argument("--flight", type=int, metavar="HOURS", help="Run simulated flight hours")
    parser.add_argument("--audit", action="store_true", help="Generate audit report")
    parser.add_argument("--health", action="store_true", help="Calculate system health score")
    parser.add_argument("--export", choices=["json", "csv"], help="Export audit log")

    args = parser.parse_args()

    auditor = AdversarialAuditor()

    if args.chaos:
        print("=" * 60)
        print("RUNNING CHAOS TEST SUITE")
        print("=" * 60)
        results = await auditor.run_chaos_suite()
        passed = sum(1 for r in results if r.passed)
        print(f"\nResults: {passed}/{len(results)} tests passed")
        for r in results:
            status = "PASS" if r.passed else "FAIL"
            print(f"  [{status}] {r.test_name}: {r.message[:60]}")

    if args.stress:
        print("=" * 60)
        print(f"RUNNING STRESS TEST ({args.stress} items)")
        print("=" * 60)
        result = await auditor.stress_test_learning_system(args.stress)
        print(f"\nStress Test Results:")
        print(f"  Items processed: {result.items_processed}")
        print(f"  Items failed: {result.items_failed}")
        print(f"  Duration: {result.duration_seconds:.2f}s")
        print(f"  Stability score: {result.stability_score*100:.1f}%")
        print(f"  Passed: {result.passed}")

    if args.security:
        print("=" * 60)
        print("RUNNING SECURITY PROBES")
        print("=" * 60)

        pe_result = await auditor.attempt_permission_escalation()
        print(f"\n[Permission Escalation] Vulnerability found: {pe_result.vulnerability_found}")

        svb_result = await auditor.attempt_seed_vault_bypass()
        print(f"[Seed Vault Bypass] Vulnerability found: {svb_result.vulnerability_found}")

        ng_result = await auditor.attempt_negotiation_gaming()
        print(f"[Negotiation Gaming] Vulnerability found: {ng_result.vulnerability_found}")

    if args.flight:
        print("=" * 60)
        print(f"RUNNING SIMULATED FLIGHT HOURS ({args.flight}h)")
        print("=" * 60)
        report = await auditor.run_simulated_flight_hours(args.flight)
        print(f"\nFlight Report:")
        print(f"  Hours simulated: {report.hours_simulated}")
        print(f"  Operations: {report.total_operations} ({report.successful_operations} success, {report.failed_operations} failed)")
        print(f"  Edge cases found: {len(report.edge_cases_found)}")
        print(f"  Stability score: {report.stability_score*100:.1f}%")
        print(f"\nRecommendations:")
        for rec in report.recommendations:
            print(f"  - {rec}")

    if args.audit:
        print("=" * 60)
        print("GENERATING AUDIT REPORT")
        print("=" * 60)
        report = auditor.generate_audit_report()
        print(f"\nAudit Report ({report.report_id}):")
        print(f"  Period: {report.time_range_start} to {report.time_range_end}")
        print(f"  Total decisions: {report.total_decisions}")
        print(f"  Seed Vault violations: {report.seed_vault_violations}")
        print(f"  Chain integrity: {'Valid' if report.integrity_verified else 'COMPROMISED'}")
        print(f"  Health score: {report.health_score*100:.1f}%")

    if args.health:
        score = auditor.calculate_system_health_score()
        print(f"\nSystem Health Score: {score*100:.1f}%")

    if args.export:
        data = auditor.export_audit_log(args.export)
        filename = f"audit_export.{args.export}"
        Path(filename).write_bytes(data)
        print(f"\nExported audit log to {filename}")


if __name__ == "__main__":
    asyncio.run(main())
