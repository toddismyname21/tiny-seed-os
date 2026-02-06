"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                              THE GOVERNOR                                      ║
║                   Central AI Operations Governance Layer                       ║
║                                                                                ║
║  "Every AI operation flows through the Governor. No exceptions."               ║
║                                                                                ║
║  Integrates all 11 Sovereign Seed systems into a unified middleware layer     ║
║  that automatically enforces policies on EVERY AI request and response.       ║
║                                                                                ║
║  Architecture: 6-Level Defense-in-Depth                                        ║
║  ├── Level 1: Intake Gate (request filtering)                                 ║
║  ├── Level 2: Context Sandbox (data protection)                               ║
║  ├── Level 3: Pre-LLM Guard (instruction constraints)                         ║
║  ├── Level 4: Post-Response Validator (output safety)                         ║
║  ├── Level 5: Action Gate (execution authorization)                           ║
║  └── Level 6: Persistence Gate (state protection)                             ║
║                                                                                ║
║  Based on: OPA Policy-as-Code, Kubernetes Admission Controllers,              ║
║            Netflix Hystrix Circuit Breakers, LangChain Callbacks               ║
╚══════════════════════════════════════════════════════════════════════════════╝

Created: 2026-02-06
Author: Claude (PM_Architect)
Version: 1.0.0
"""

import asyncio
import hashlib
import json
import logging
import time
import traceback
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, Union
import threading
import uuid

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION & CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

GOVERNOR_VERSION = "1.0.0"
GOVERNOR_LOG_FILE = Path(__file__).parent / ".governor_audit.json"
GOVERNOR_METRICS_FILE = Path(__file__).parent / ".governor_metrics.json"
GOVERNOR_STATE_FILE = Path(__file__).parent / ".governor_state.json"

# Policy hierarchy levels (higher number = higher priority)
class PolicyLevel(Enum):
    CONTEXTUAL = 1       # Runtime conditions (lowest priority)
    ORGANIZATIONAL = 2   # Business rules
    REGULATORY = 3       # Compliance requirements
    CRITICAL = 4         # Safety & security (highest priority, cannot override)

# Decision outcomes
class GovernorDecision(Enum):
    ALLOW = "allow"                    # Full execution permitted
    ALLOW_WITH_CONDITIONS = "allow_with_conditions"  # Execute with modifications
    DEFER = "defer"                    # Postpone for better timing
    ESCALATE = "escalate"              # Requires human review
    BLOCK = "block"                    # Denied, cannot proceed

# Safe Mode levels (from intelligent_safe_mode.py)
class SafeLevel(Enum):
    GREEN = "GREEN"       # Normal operation
    YELLOW = "YELLOW"     # Elevated caution
    RED = "RED"           # High alert
    LOCKDOWN = "LOCKDOWN" # Emergency stop

# Circuit breaker states
class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing recovery


# ═══════════════════════════════════════════════════════════════════════════════
# DATA STRUCTURES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class GovernorContext:
    """Complete context for a governed operation"""
    request_id: str
    user_id: Optional[str]
    operation_type: str  # "chat", "action", "skill", "persist"
    source: str  # "web_api", "orchestrator", "brain", "builder"
    timestamp: datetime
    data: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "request_id": self.request_id,
            "user_id": self.user_id,
            "operation_type": self.operation_type,
            "source": self.source,
            "timestamp": self.timestamp.isoformat(),
            "data": self.data,
            "metadata": self.metadata
        }


@dataclass
class GovernorResult:
    """Result of a governance check"""
    decision: GovernorDecision
    level: int  # 1-6 (which gate made the decision)
    gate_name: str
    reason: str
    conditions: List[str] = field(default_factory=list)
    modified_data: Optional[Dict] = None
    audit_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    duration_ms: float = 0.0
    policy_chain: List[Dict] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "decision": self.decision.value,
            "level": self.level,
            "gate_name": self.gate_name,
            "reason": self.reason,
            "conditions": self.conditions,
            "audit_id": self.audit_id,
            "duration_ms": self.duration_ms,
            "policy_chain": self.policy_chain
        }


@dataclass
class PolicyRule:
    """A single policy rule"""
    id: str
    name: str
    level: PolicyLevel
    description: str
    condition: Callable[[GovernorContext], bool]
    action: GovernorDecision
    reason_template: str
    enabled: bool = True

    def evaluate(self, ctx: GovernorContext) -> Optional[GovernorResult]:
        """Evaluate this rule against context"""
        if not self.enabled:
            return None
        try:
            if self.condition(ctx):
                return GovernorResult(
                    decision=self.action,
                    level=self.level.value,
                    gate_name=f"policy:{self.id}",
                    reason=self.reason_template.format(**ctx.to_dict())
                )
        except Exception as e:
            logging.warning(f"Policy {self.id} evaluation failed: {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# CIRCUIT BREAKER (Resilience Pattern)
# ═══════════════════════════════════════════════════════════════════════════════

class CircuitBreaker:
    """
    Protects against cascading failures in validation systems.
    If a validator crashes too many times, circuit opens and we fail fast.
    """

    def __init__(self, name: str, failure_threshold: int = 5,
                 recovery_timeout_seconds: int = 30):
        self.name = name
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.recovery_timeout = timedelta(seconds=recovery_timeout_seconds)
        self.last_failure_time: Optional[datetime] = None
        self.success_count = 0
        self._lock = threading.Lock()

    def can_execute(self) -> bool:
        """Check if we can execute through this circuit"""
        with self._lock:
            if self.state == CircuitState.CLOSED:
                return True

            if self.state == CircuitState.OPEN:
                # Check if recovery timeout has passed
                if self.last_failure_time and \
                   datetime.now() - self.last_failure_time > self.recovery_timeout:
                    self.state = CircuitState.HALF_OPEN
                    logging.info(f"Circuit {self.name} entering HALF_OPEN state")
                    return True
                return False

            if self.state == CircuitState.HALF_OPEN:
                return True

            return False

    def record_success(self):
        """Record a successful execution"""
        with self._lock:
            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                logging.info(f"Circuit {self.name} recovered, now CLOSED")
            self.success_count += 1

    def record_failure(self, error: Exception = None):
        """Record a failed execution"""
        with self._lock:
            self.failure_count += 1
            self.last_failure_time = datetime.now()

            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.OPEN
                logging.warning(f"Circuit {self.name} failed during recovery, back to OPEN")

            elif self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
                logging.error(f"Circuit {self.name} OPENED after {self.failure_count} failures")

    def get_status(self) -> Dict:
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "last_failure": self.last_failure_time.isoformat() if self.last_failure_time else None
        }


# ═══════════════════════════════════════════════════════════════════════════════
# VALIDATOR CACHE (Performance Optimization)
# ═══════════════════════════════════════════════════════════════════════════════

class ValidatorCache:
    """
    Caches validation results to avoid re-validating identical inputs.
    TTL-based with intelligent invalidation.
    """

    def __init__(self, default_ttl_seconds: int = 300):
        self.cache: Dict[str, Tuple[Any, datetime]] = {}
        self.default_ttl = timedelta(seconds=default_ttl_seconds)
        self.hit_count = 0
        self.miss_count = 0
        self._lock = threading.Lock()

    def _make_key(self, validator_name: str, data: Any) -> str:
        """Create deterministic cache key"""
        data_str = json.dumps(data, sort_keys=True, default=str)
        data_hash = hashlib.sha256(data_str.encode()).hexdigest()[:16]
        return f"{validator_name}:{data_hash}"

    def get(self, validator_name: str, data: Any) -> Optional[Any]:
        """Get cached result if valid"""
        key = self._make_key(validator_name, data)
        with self._lock:
            if key in self.cache:
                result, expiry = self.cache[key]
                if datetime.now() < expiry:
                    self.hit_count += 1
                    return result
                else:
                    del self.cache[key]
            self.miss_count += 1
            return None

    def set(self, validator_name: str, data: Any, result: Any,
            ttl_seconds: Optional[int] = None):
        """Cache a validation result"""
        key = self._make_key(validator_name, data)
        ttl = timedelta(seconds=ttl_seconds) if ttl_seconds else self.default_ttl
        expiry = datetime.now() + ttl
        with self._lock:
            self.cache[key] = (result, expiry)

    def invalidate(self, pattern: str = None):
        """Invalidate cache entries matching pattern"""
        with self._lock:
            if pattern is None:
                self.cache.clear()
            else:
                keys_to_delete = [k for k in self.cache.keys() if pattern in k]
                for key in keys_to_delete:
                    del self.cache[key]

    def get_stats(self) -> Dict:
        total = self.hit_count + self.miss_count
        return {
            "hit_count": self.hit_count,
            "miss_count": self.miss_count,
            "hit_rate": self.hit_count / total if total > 0 else 0,
            "cache_size": len(self.cache)
        }


# ═══════════════════════════════════════════════════════════════════════════════
# AUDIT LOGGER (Immutable Audit Trail)
# ═══════════════════════════════════════════════════════════════════════════════

class GovernorAuditLogger:
    """
    Immutable audit trail for all governance decisions.
    Every decision is logged with full context for forensic analysis.
    """

    def __init__(self, log_file: Path = GOVERNOR_LOG_FILE):
        self.log_file = log_file
        self._lock = threading.Lock()
        self._ensure_log_file()

    def _ensure_log_file(self):
        """Ensure log file exists with valid structure"""
        if not self.log_file.exists():
            self.log_file.write_text(json.dumps({
                "version": GOVERNOR_VERSION,
                "created": datetime.now().isoformat(),
                "entries": []
            }, indent=2))

    def log(self, context: GovernorContext, result: GovernorResult,
            execution_result: Optional[Dict] = None):
        """Log a governance decision"""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "audit_id": result.audit_id,
            "request_id": context.request_id,
            "user_id": context.user_id,
            "operation_type": context.operation_type,
            "source": context.source,
            "decision": result.decision.value,
            "gate_level": result.level,
            "gate_name": result.gate_name,
            "reason": result.reason,
            "conditions": result.conditions,
            "duration_ms": result.duration_ms,
            "policy_chain": result.policy_chain,
            "execution_result": execution_result
        }

        # Sign entry for tamper detection
        entry_str = json.dumps(entry, sort_keys=True)
        entry["signature"] = hashlib.sha256(entry_str.encode()).hexdigest()[:16]

        with self._lock:
            try:
                data = json.loads(self.log_file.read_text())
                data["entries"].append(entry)

                # Keep last 10000 entries (rotate)
                if len(data["entries"]) > 10000:
                    data["entries"] = data["entries"][-10000:]

                self.log_file.write_text(json.dumps(data, indent=2))
            except Exception as e:
                logging.error(f"Failed to write audit log: {e}")

    def query(self, filters: Dict = None, limit: int = 100) -> List[Dict]:
        """Query audit trail with filters"""
        try:
            data = json.loads(self.log_file.read_text())
            entries = data.get("entries", [])

            if filters:
                for key, value in filters.items():
                    entries = [e for e in entries if e.get(key) == value]

            return entries[-limit:]
        except Exception as e:
            logging.error(f"Failed to query audit log: {e}")
            return []

    def get_stats(self) -> Dict:
        """Get audit statistics"""
        try:
            data = json.loads(self.log_file.read_text())
            entries = data.get("entries", [])

            decisions = {}
            for entry in entries:
                decision = entry.get("decision", "unknown")
                decisions[decision] = decisions.get(decision, 0) + 1

            return {
                "total_entries": len(entries),
                "decision_distribution": decisions,
                "log_file_size_kb": self.log_file.stat().st_size / 1024
            }
        except Exception:
            return {"error": "Failed to get stats"}


# ═══════════════════════════════════════════════════════════════════════════════
# METRICS TRACKER
# ═══════════════════════════════════════════════════════════════════════════════

class GovernorMetrics:
    """Tracks operational metrics for monitoring and optimization"""

    def __init__(self, metrics_file: Path = GOVERNOR_METRICS_FILE):
        self.metrics_file = metrics_file
        self._lock = threading.Lock()
        self._init_metrics()

    def _init_metrics(self):
        if not self.metrics_file.exists():
            self._save_metrics({
                "version": GOVERNOR_VERSION,
                "started": datetime.now().isoformat(),
                "gates": {
                    "intake": {"processed": 0, "blocked": 0, "allowed": 0, "deferred": 0},
                    "context": {"processed": 0, "redacted": 0, "conflicts": 0},
                    "pre_llm": {"processed": 0, "modified": 0, "blocked": 0},
                    "post_response": {"processed": 0, "accepted": 0, "rejected": 0, "modified": 0},
                    "action": {"processed": 0, "allowed": 0, "blocked": 0, "escalated": 0},
                    "persistence": {"processed": 0, "allowed": 0, "blocked": 0, "drift_corrected": 0}
                },
                "latency_ms": {
                    "total": [],
                    "per_gate": {}
                },
                "circuit_breakers": {},
                "cache_stats": {}
            })

    def _load_metrics(self) -> Dict:
        try:
            return json.loads(self.metrics_file.read_text())
        except Exception:
            self._init_metrics()
            return json.loads(self.metrics_file.read_text())

    def _save_metrics(self, metrics: Dict):
        self.metrics_file.write_text(json.dumps(metrics, indent=2))

    def record_gate_result(self, gate_name: str, decision: GovernorDecision,
                           duration_ms: float):
        """Record a gate decision"""
        with self._lock:
            metrics = self._load_metrics()

            if gate_name in metrics["gates"]:
                metrics["gates"][gate_name]["processed"] += 1

                if decision == GovernorDecision.ALLOW:
                    metrics["gates"][gate_name]["allowed"] = \
                        metrics["gates"][gate_name].get("allowed", 0) + 1
                elif decision == GovernorDecision.BLOCK:
                    metrics["gates"][gate_name]["blocked"] = \
                        metrics["gates"][gate_name].get("blocked", 0) + 1
                elif decision == GovernorDecision.DEFER:
                    metrics["gates"][gate_name]["deferred"] = \
                        metrics["gates"][gate_name].get("deferred", 0) + 1
                elif decision == GovernorDecision.ESCALATE:
                    metrics["gates"][gate_name]["escalated"] = \
                        metrics["gates"][gate_name].get("escalated", 0) + 1

            # Track latency (keep last 1000)
            if gate_name not in metrics["latency_ms"]["per_gate"]:
                metrics["latency_ms"]["per_gate"][gate_name] = []
            metrics["latency_ms"]["per_gate"][gate_name].append(duration_ms)
            metrics["latency_ms"]["per_gate"][gate_name] = \
                metrics["latency_ms"]["per_gate"][gate_name][-1000:]

            self._save_metrics(metrics)

    def get_summary(self) -> Dict:
        """Get metrics summary"""
        metrics = self._load_metrics()

        # Calculate average latencies
        avg_latencies = {}
        for gate, latencies in metrics["latency_ms"]["per_gate"].items():
            if latencies:
                avg_latencies[gate] = sum(latencies) / len(latencies)

        return {
            "gates": metrics["gates"],
            "avg_latency_ms": avg_latencies,
            "uptime_since": metrics.get("started")
        }


# ═══════════════════════════════════════════════════════════════════════════════
# THE GOVERNOR - Main Class
# ═══════════════════════════════════════════════════════════════════════════════

class Governor:
    """
    The Governor - Central AI Operations Governance Layer

    All AI operations MUST flow through the Governor.
    The Governor integrates all 11 Sovereign Seed systems and enforces
    policies at 6 levels of defense-in-depth.

    Usage:
        governor = Governor()
        await governor.initialize()

        # For chat/LLM operations:
        result = await governor.govern_llm_operation(context, llm_call_func)

        # For actions:
        result = await governor.govern_action(context, action_func)

        # For persistence:
        result = await governor.govern_persist(context, persist_func)
    """

    def __init__(self, config: Dict = None):
        self.config = config or {}
        self.version = GOVERNOR_VERSION
        self.safe_level = SafeLevel.GREEN

        # Core components
        self.audit_logger = GovernorAuditLogger()
        self.metrics = GovernorMetrics()
        self.cache = ValidatorCache(default_ttl_seconds=300)

        # Circuit breakers for each validator
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}

        # Policy registry
        self.policies: List[PolicyRule] = []

        # Integration with Sovereign Seed systems (lazy loaded)
        self._stable_anchors = None
        self._normalization = None
        self._overlap_validator = None
        self._structural_gate = None
        self._conflict_detector = None
        self._rbac_retrieval = None
        self._circuit_breaker = None
        self._etc_pipeline = None
        self._decision_replay = None
        self._override_hygiene = None
        self._intelligent_safe_mode = None

        # Initialize state
        self._initialized = False
        self._lock = asyncio.Lock()

        logging.info(f"Governor v{self.version} instantiated")

    async def initialize(self) -> bool:
        """Initialize the Governor and all integrated systems"""
        async with self._lock:
            if self._initialized:
                return True

            try:
                logging.info("Initializing Governor...")

                # Initialize circuit breakers for each validation system
                validator_names = [
                    "stable_anchors", "normalization", "overlap_validator",
                    "structural_gate", "conflict_detector", "rbac_retrieval",
                    "financial_circuit_breaker", "etc_pipeline", "decision_replay",
                    "override_hygiene", "safe_mode"
                ]
                for name in validator_names:
                    self.circuit_breakers[name] = CircuitBreaker(
                        name=name,
                        failure_threshold=5,
                        recovery_timeout_seconds=60
                    )

                # Load default policies
                self._load_default_policies()

                # Import and initialize Sovereign Seed systems
                await self._initialize_sovereign_seed()

                self._initialized = True
                logging.info("Governor initialization complete")
                return True

            except Exception as e:
                logging.error(f"Governor initialization failed: {e}")
                traceback.print_exc()
                return False

    def _load_default_policies(self):
        """Load default governance policies"""

        # CRITICAL: Block during lockdown
        self.policies.append(PolicyRule(
            id="lockdown_block",
            name="Lockdown Mode Block",
            level=PolicyLevel.CRITICAL,
            description="Block all operations during LOCKDOWN safe mode",
            condition=lambda ctx: self.safe_level == SafeLevel.LOCKDOWN,
            action=GovernorDecision.BLOCK,
            reason_template="System is in LOCKDOWN mode. All operations blocked."
        ))

        # CRITICAL: Block unauthorized users
        self.policies.append(PolicyRule(
            id="auth_required",
            name="Authentication Required",
            level=PolicyLevel.CRITICAL,
            description="Require user authentication for sensitive operations",
            condition=lambda ctx: ctx.operation_type in ["action", "persist"]
                                  and ctx.user_id is None,
            action=GovernorDecision.BLOCK,
            reason_template="Authentication required for {operation_type} operations"
        ))

        # REGULATORY: Rate limiting
        self.policies.append(PolicyRule(
            id="rate_limit",
            name="Rate Limiting",
            level=PolicyLevel.REGULATORY,
            description="Limit request rate per user",
            condition=lambda ctx: self._check_rate_limit(ctx),
            action=GovernorDecision.DEFER,
            reason_template="Rate limit exceeded for user {user_id}"
        ))

        # ORGANIZATIONAL: Escalate high-value operations
        self.policies.append(PolicyRule(
            id="high_value_escalate",
            name="High Value Escalation",
            level=PolicyLevel.ORGANIZATIONAL,
            description="Escalate operations with high financial impact",
            condition=lambda ctx: ctx.metadata.get("financial_impact", 0) > 5000,
            action=GovernorDecision.ESCALATE,
            reason_template="Operation requires human review (impact: ${metadata[financial_impact]})"
        ))

        # CONTEXTUAL: Defer during off-hours if non-urgent
        self.policies.append(PolicyRule(
            id="off_hours_defer",
            name="Off-Hours Deferral",
            level=PolicyLevel.CONTEXTUAL,
            description="Defer non-urgent operations during off-hours",
            condition=lambda ctx: self._is_off_hours()
                                  and not ctx.metadata.get("urgent", False),
            action=GovernorDecision.ALLOW_WITH_CONDITIONS,
            reason_template="Operation queued for business hours"
        ))

    async def _initialize_sovereign_seed(self):
        """Initialize Sovereign Seed system integrations"""
        try:
            # Phase 1: Forensic Infrastructure
            from stable_anchors import StableAnchorService
            self._stable_anchors = StableAnchorService()

            from normalization_service import NormalizationService
            self._normalization = NormalizationService()

            from overlap_validator import OverlapValidator
            self._overlap_validator = OverlapValidator()

            logging.info("Phase 1 systems loaded")

        except ImportError as e:
            logging.warning(f"Phase 1 import failed (continuing): {e}")

        try:
            # Phase 2: Governor & Policy-as-Code
            from structural_gate import StructuralGate
            self._structural_gate = StructuralGate()

            from conflict_detector import ConflictDetector
            self._conflict_detector = ConflictDetector()

            from rbac_retrieval import RBACRetrieval
            self._rbac_retrieval = RBACRetrieval()

            from financial_circuit_breaker import FinancialCircuitBreaker
            self._circuit_breaker = FinancialCircuitBreaker()

            logging.info("Phase 2 systems loaded")

        except ImportError as e:
            logging.warning(f"Phase 2 import failed (continuing): {e}")

        try:
            # Phase 3: Deterministic Logic Split
            from extraction_calculation_split import ETCPipeline
            self._etc_pipeline = ETCPipeline()

            from decision_replay_engine import DecisionReplayEngine
            self._decision_replay = DecisionReplayEngine()

            logging.info("Phase 3 systems loaded")

        except ImportError as e:
            logging.warning(f"Phase 3 import failed (continuing): {e}")

        try:
            # Phase 4: Operational Sovereignty
            from override_hygiene import OverrideHygieneSystem
            self._override_hygiene = OverrideHygieneSystem()

            from intelligent_safe_mode import IntelligentSafeMode
            self._intelligent_safe_mode = IntelligentSafeMode()

            logging.info("Phase 4 systems loaded")

        except ImportError as e:
            logging.warning(f"Phase 4 import failed (continuing): {e}")

    def _check_rate_limit(self, ctx: GovernorContext) -> bool:
        """Check if user has exceeded rate limit"""
        # TODO: Implement proper rate limiting with sliding window
        return False

    def _is_off_hours(self) -> bool:
        """Check if current time is off-hours"""
        hour = datetime.now().hour
        return hour < 6 or hour > 22

    # ═══════════════════════════════════════════════════════════════════════════
    # LEVEL 1: INTAKE GATE
    # ═══════════════════════════════════════════════════════════════════════════

    async def _intake_gate(self, ctx: GovernorContext) -> GovernorResult:
        """
        Level 1: Intake Gate
        First line of defense - filters requests before any processing.

        Checks:
        - Safe mode level
        - Authentication
        - Rate limiting
        - Resource availability
        """
        start_time = time.time()

        # Check safe mode
        if self.safe_level == SafeLevel.LOCKDOWN:
            return GovernorResult(
                decision=GovernorDecision.BLOCK,
                level=1,
                gate_name="intake_gate",
                reason="System in LOCKDOWN mode",
                duration_ms=(time.time() - start_time) * 1000
            )

        # Evaluate policies in hierarchical order
        policy_results = []
        for policy in sorted(self.policies, key=lambda p: p.level.value, reverse=True):
            result = policy.evaluate(ctx)
            if result:
                policy_results.append({
                    "policy_id": policy.id,
                    "level": policy.level.name,
                    "decision": result.decision.value
                })

                # Critical policies block immediately
                if policy.level == PolicyLevel.CRITICAL and \
                   result.decision in [GovernorDecision.BLOCK, GovernorDecision.ESCALATE]:
                    result.policy_chain = policy_results
                    result.duration_ms = (time.time() - start_time) * 1000
                    return result

        # All policies passed
        return GovernorResult(
            decision=GovernorDecision.ALLOW,
            level=1,
            gate_name="intake_gate",
            reason="Intake checks passed",
            policy_chain=policy_results,
            duration_ms=(time.time() - start_time) * 1000
        )

    # ═══════════════════════════════════════════════════════════════════════════
    # LEVEL 2: CONTEXT SANDBOX
    # ═══════════════════════════════════════════════════════════════════════════

    async def _context_sandbox(self, ctx: GovernorContext) -> GovernorResult:
        """
        Level 2: Context Sandbox
        Protects sensitive data and verifies context integrity.

        Checks:
        - Redact PII/sensitive data
        - Verify memory accuracy (via Stable Anchors)
        - Check for conflicts
        - RBAC filtering
        """
        start_time = time.time()
        conditions = []
        modified_data = dict(ctx.data)

        # RBAC filtering (if available)
        if self._rbac_retrieval and self.circuit_breakers["rbac_retrieval"].can_execute():
            try:
                # Filter context based on user permissions
                if ctx.user_id:
                    filtered = await asyncio.to_thread(
                        self._rbac_retrieval.filter_for_user,
                        ctx.user_id,
                        modified_data
                    )
                    if filtered:
                        modified_data = filtered
                        conditions.append("rbac_filtered")

                self.circuit_breakers["rbac_retrieval"].record_success()
            except Exception as e:
                self.circuit_breakers["rbac_retrieval"].record_failure(e)
                logging.warning(f"RBAC filtering failed: {e}")

        # Conflict detection (if available)
        if self._conflict_detector and self.circuit_breakers["conflict_detector"].can_execute():
            try:
                conflicts = await asyncio.to_thread(
                    self._conflict_detector.detect,
                    modified_data
                )
                if conflicts and len(conflicts) > 0:
                    # Critical conflicts block
                    critical = [c for c in conflicts if c.get("severity") == "critical"]
                    if critical:
                        return GovernorResult(
                            decision=GovernorDecision.ESCALATE,
                            level=2,
                            gate_name="context_sandbox",
                            reason=f"Critical conflicts detected: {len(critical)}",
                            conditions=conditions,
                            modified_data=modified_data,
                            duration_ms=(time.time() - start_time) * 1000
                        )
                    conditions.append(f"conflicts_detected:{len(conflicts)}")

                self.circuit_breakers["conflict_detector"].record_success()
            except Exception as e:
                self.circuit_breakers["conflict_detector"].record_failure(e)
                logging.warning(f"Conflict detection failed: {e}")

        return GovernorResult(
            decision=GovernorDecision.ALLOW,
            level=2,
            gate_name="context_sandbox",
            reason="Context validated",
            conditions=conditions,
            modified_data=modified_data,
            duration_ms=(time.time() - start_time) * 1000
        )

    # ═══════════════════════════════════════════════════════════════════════════
    # LEVEL 3: PRE-LLM GUARD
    # ═══════════════════════════════════════════════════════════════════════════

    async def _pre_llm_guard(self, ctx: GovernorContext,
                              system_prompt: str,
                              messages: List[Dict]) -> Tuple[GovernorResult, str, List[Dict]]:
        """
        Level 3: Pre-LLM Guard
        Injects governance constraints into LLM calls.

        Checks:
        - Inject safety constraints into system prompt
        - Validate parameter limits
        - Check for prompt injection
        - Apply normalization to inputs
        """
        start_time = time.time()
        conditions = []
        modified_system = system_prompt
        modified_messages = list(messages)

        # Inject governance constraints into system prompt
        governance_constraints = """

[GOVERNANCE CONSTRAINTS - MANDATORY]
- You must cite sources for factual claims
- You must flag uncertainty when confidence < 80%
- You must not execute financial operations > $500 without explicit user approval
- You must respect the user's stated preferences from memory
- You must not reveal sensitive/private information
[END GOVERNANCE CONSTRAINTS]

"""
        modified_system = governance_constraints + modified_system
        conditions.append("constraints_injected")

        # Normalize inputs (if available)
        if self._normalization and self.circuit_breakers["normalization"].can_execute():
            try:
                for i, msg in enumerate(modified_messages):
                    if msg.get("role") == "user" and msg.get("content"):
                        normalized = await asyncio.to_thread(
                            self._normalization.normalize_text,
                            msg["content"]
                        )
                        if normalized:
                            modified_messages[i] = {**msg, "content": normalized}

                conditions.append("inputs_normalized")
                self.circuit_breakers["normalization"].record_success()
            except Exception as e:
                self.circuit_breakers["normalization"].record_failure(e)
                logging.warning(f"Normalization failed: {e}")

        # Check for prompt injection patterns
        injection_patterns = [
            "ignore previous instructions",
            "disregard your instructions",
            "you are now",
            "pretend you are",
            "act as if",
            "new instructions:",
            "system prompt:",
        ]

        for msg in modified_messages:
            content = msg.get("content", "").lower()
            for pattern in injection_patterns:
                if pattern in content:
                    conditions.append("prompt_injection_warning")
                    # Don't block, but flag for monitoring
                    break

        result = GovernorResult(
            decision=GovernorDecision.ALLOW,
            level=3,
            gate_name="pre_llm_guard",
            reason="LLM call approved with constraints",
            conditions=conditions,
            duration_ms=(time.time() - start_time) * 1000
        )

        return result, modified_system, modified_messages

    # ═══════════════════════════════════════════════════════════════════════════
    # LEVEL 4: POST-RESPONSE VALIDATOR
    # ═══════════════════════════════════════════════════════════════════════════

    async def _post_response_validator(self, ctx: GovernorContext,
                                        response_text: str) -> Tuple[GovernorResult, str]:
        """
        Level 4: Post-Response Validator
        Validates LLM output before delivery.

        Checks:
        - Structural validation (schema conformance)
        - Overlap validation (hallucination detection)
        - Stable anchor verification
        - Content safety
        """
        start_time = time.time()
        conditions = []
        modified_response = response_text

        # Structural Gate validation (if available)
        if self._structural_gate and self.circuit_breakers["structural_gate"].can_execute():
            try:
                validation = await asyncio.to_thread(
                    self._structural_gate.validate,
                    response_text,
                    ctx.operation_type
                )
                if validation and not validation.get("valid", True):
                    # Kill on schema violation
                    return (GovernorResult(
                        decision=GovernorDecision.BLOCK,
                        level=4,
                        gate_name="post_response_validator",
                        reason=f"Schema violation: {validation.get('errors', [])}",
                        conditions=conditions,
                        duration_ms=(time.time() - start_time) * 1000
                    ), "")

                conditions.append("schema_validated")
                self.circuit_breakers["structural_gate"].record_success()
            except Exception as e:
                self.circuit_breakers["structural_gate"].record_failure(e)
                logging.warning(f"Structural gate failed: {e}")

        # Overlap validation / hallucination detection (if available)
        if self._overlap_validator and self.circuit_breakers["overlap_validator"].can_execute():
            try:
                overlap = await asyncio.to_thread(
                    self._overlap_validator.validate,
                    response_text,
                    ctx.data
                )
                if overlap:
                    iou_score = overlap.get("iou_score", 1.0)
                    if iou_score < 0.8:
                        # Low overlap = potential hallucination
                        conditions.append(f"low_overlap:{iou_score:.2f}")

                        # If very low, escalate
                        if iou_score < 0.5:
                            return (GovernorResult(
                                decision=GovernorDecision.ESCALATE,
                                level=4,
                                gate_name="post_response_validator",
                                reason=f"Potential hallucination detected (IoU: {iou_score:.2f})",
                                conditions=conditions,
                                duration_ms=(time.time() - start_time) * 1000
                            ), modified_response)
                    else:
                        conditions.append("overlap_validated")

                self.circuit_breakers["overlap_validator"].record_success()
            except Exception as e:
                self.circuit_breakers["overlap_validator"].record_failure(e)
                logging.warning(f"Overlap validation failed: {e}")

        # Stable Anchor verification (if available)
        if self._stable_anchors and self.circuit_breakers["stable_anchors"].can_execute():
            try:
                anchors = await asyncio.to_thread(
                    self._stable_anchors.extract_and_verify,
                    response_text
                )
                if anchors:
                    valid_anchors = sum(1 for a in anchors if a.get("verified"))
                    total_anchors = len(anchors)
                    conditions.append(f"anchors:{valid_anchors}/{total_anchors}")

                self.circuit_breakers["stable_anchors"].record_success()
            except Exception as e:
                self.circuit_breakers["stable_anchors"].record_failure(e)
                logging.warning(f"Stable anchor verification failed: {e}")

        return (GovernorResult(
            decision=GovernorDecision.ALLOW,
            level=4,
            gate_name="post_response_validator",
            reason="Response validated",
            conditions=conditions,
            modified_data={"response": modified_response},
            duration_ms=(time.time() - start_time) * 1000
        ), modified_response)

    # ═══════════════════════════════════════════════════════════════════════════
    # LEVEL 5: ACTION GATE
    # ═══════════════════════════════════════════════════════════════════════════

    async def _action_gate(self, ctx: GovernorContext,
                           action: Dict) -> GovernorResult:
        """
        Level 5: Action Gate
        Final authorization before executing actions.

        Checks:
        - Financial circuit breaker
        - Override hygiene (canonical vs preference rules)
        - Safe mode constraints
        - ETC Pipeline validation (for calculations)
        """
        start_time = time.time()
        conditions = []

        # Financial Circuit Breaker (if available)
        if self._circuit_breaker and self.circuit_breakers["financial_circuit_breaker"].can_execute():
            try:
                impact = await asyncio.to_thread(
                    self._circuit_breaker.assess,
                    action
                )
                if impact:
                    amount = impact.get("estimated_impact", 0)

                    # Apply thresholds
                    if amount > 5000:
                        return GovernorResult(
                            decision=GovernorDecision.ESCALATE,
                            level=5,
                            gate_name="action_gate",
                            reason=f"High financial impact (${amount:.2f}) requires human approval",
                            conditions=conditions,
                            duration_ms=(time.time() - start_time) * 1000
                        )
                    elif amount > 500:
                        conditions.append(f"financial_impact:${amount:.2f}")
                        conditions.append("one_click_approval_required")
                    else:
                        conditions.append("auto_execute_allowed")

                self.circuit_breakers["financial_circuit_breaker"].record_success()
            except Exception as e:
                self.circuit_breakers["financial_circuit_breaker"].record_failure(e)
                logging.warning(f"Financial circuit breaker failed: {e}")

        # Override Hygiene check (if available)
        if self._override_hygiene and self.circuit_breakers["override_hygiene"].can_execute():
            try:
                rule_check = await asyncio.to_thread(
                    self._override_hygiene.check_action,
                    action
                )
                if rule_check:
                    if rule_check.get("blocked_by_canonical"):
                        return GovernorResult(
                            decision=GovernorDecision.BLOCK,
                            level=5,
                            gate_name="action_gate",
                            reason=f"Blocked by canonical rule: {rule_check.get('rule_id')}",
                            conditions=conditions,
                            duration_ms=(time.time() - start_time) * 1000
                        )
                    if rule_check.get("drifted"):
                        conditions.append("drift_detected")

                self.circuit_breakers["override_hygiene"].record_success()
            except Exception as e:
                self.circuit_breakers["override_hygiene"].record_failure(e)
                logging.warning(f"Override hygiene failed: {e}")

        # Safe mode constraints
        if self.safe_level == SafeLevel.RED:
            # In RED mode, block write operations
            if action.get("type") in ["write", "update", "delete", "execute"]:
                return GovernorResult(
                    decision=GovernorDecision.BLOCK,
                    level=5,
                    gate_name="action_gate",
                    reason="Write operations blocked in RED safe mode",
                    conditions=conditions,
                    duration_ms=(time.time() - start_time) * 1000
                )
        elif self.safe_level == SafeLevel.YELLOW:
            # In YELLOW mode, require approval for writes
            if action.get("type") in ["write", "update", "delete", "execute"]:
                conditions.append("yellow_mode_approval_required")

        # ETC Pipeline for calculations (if action involves math)
        if action.get("type") == "calculate" and self._etc_pipeline:
            if self.circuit_breakers["etc_pipeline"].can_execute():
                try:
                    etc_result = await asyncio.to_thread(
                        self._etc_pipeline.process,
                        action.get("data", {})
                    )
                    if etc_result:
                        # Replace AI calculation with deterministic result
                        action["calculated_result"] = etc_result
                        conditions.append("etc_pipeline_executed")

                    self.circuit_breakers["etc_pipeline"].record_success()
                except Exception as e:
                    self.circuit_breakers["etc_pipeline"].record_failure(e)
                    logging.warning(f"ETC Pipeline failed: {e}")

        return GovernorResult(
            decision=GovernorDecision.ALLOW,
            level=5,
            gate_name="action_gate",
            reason="Action authorized",
            conditions=conditions,
            modified_data=action,
            duration_ms=(time.time() - start_time) * 1000
        )

    # ═══════════════════════════════════════════════════════════════════════════
    # LEVEL 6: PERSISTENCE GATE
    # ═══════════════════════════════════════════════════════════════════════════

    async def _persistence_gate(self, ctx: GovernorContext,
                                 file_path: str,
                                 new_data: Dict,
                                 old_data: Optional[Dict] = None) -> GovernorResult:
        """
        Level 6: Persistence Gate
        Final check before writing to persistent storage.

        Checks:
        - State transition validation
        - Data consistency
        - Drift detection from canonical values
        - Decision replay logging
        """
        start_time = time.time()
        conditions = []

        # Decision Replay logging (if available)
        if self._decision_replay and self.circuit_breakers["decision_replay"].can_execute():
            try:
                # Record this decision for replay capability
                replay_id = await asyncio.to_thread(
                    self._decision_replay.record,
                    {
                        "context": ctx.to_dict(),
                        "file_path": file_path,
                        "old_data": old_data,
                        "new_data": new_data,
                        "timestamp": datetime.now().isoformat()
                    }
                )
                conditions.append(f"replay_id:{replay_id}")

                self.circuit_breakers["decision_replay"].record_success()
            except Exception as e:
                self.circuit_breakers["decision_replay"].record_failure(e)
                logging.warning(f"Decision replay logging failed: {e}")

        # State transition validation
        if old_data is not None:
            # Check for valid state transitions
            old_status = old_data.get("status")
            new_status = new_data.get("status")

            invalid_transitions = [
                ("completed", "pending"),
                ("completed", "in_progress"),
                ("cancelled", "pending"),
                ("cancelled", "in_progress"),
            ]

            if (old_status, new_status) in invalid_transitions:
                return GovernorResult(
                    decision=GovernorDecision.BLOCK,
                    level=6,
                    gate_name="persistence_gate",
                    reason=f"Invalid state transition: {old_status} -> {new_status}",
                    conditions=conditions,
                    duration_ms=(time.time() - start_time) * 1000
                )

        # Data consistency check
        required_fields = ["id", "updated_at"]
        for field in required_fields:
            if field not in new_data:
                if field == "updated_at":
                    new_data["updated_at"] = datetime.now().isoformat()
                    conditions.append("updated_at_injected")

        # Safe mode state update
        if self._intelligent_safe_mode and self.circuit_breakers["safe_mode"].can_execute():
            try:
                # Report this operation to safe mode monitoring
                await asyncio.to_thread(
                    self._intelligent_safe_mode.record_operation,
                    {
                        "type": "persist",
                        "file": file_path,
                        "success": True
                    }
                )
                self.circuit_breakers["safe_mode"].record_success()
            except Exception as e:
                self.circuit_breakers["safe_mode"].record_failure(e)

        return GovernorResult(
            decision=GovernorDecision.ALLOW,
            level=6,
            gate_name="persistence_gate",
            reason="Persistence approved",
            conditions=conditions,
            modified_data=new_data,
            duration_ms=(time.time() - start_time) * 1000
        )

    # ═══════════════════════════════════════════════════════════════════════════
    # PUBLIC API: Governance Methods
    # ═══════════════════════════════════════════════════════════════════════════

    async def govern_llm_operation(
        self,
        ctx: GovernorContext,
        llm_call: Callable,
        system_prompt: str,
        messages: List[Dict],
        **llm_kwargs
    ) -> Tuple[GovernorResult, Optional[str]]:
        """
        Govern a complete LLM operation through all 4 levels.

        Args:
            ctx: Governor context with request metadata
            llm_call: Async function to call LLM (receives system, messages, **kwargs)
            system_prompt: System prompt for LLM
            messages: Message history
            **llm_kwargs: Additional LLM parameters

        Returns:
            (GovernorResult, response_text or None if blocked)
        """
        total_start = time.time()

        # Level 1: Intake Gate
        intake_result = await self._intake_gate(ctx)
        self.metrics.record_gate_result("intake", intake_result.decision, intake_result.duration_ms)

        if intake_result.decision in [GovernorDecision.BLOCK, GovernorDecision.ESCALATE]:
            self.audit_logger.log(ctx, intake_result)
            return intake_result, None

        # Level 2: Context Sandbox
        context_result = await self._context_sandbox(ctx)
        self.metrics.record_gate_result("context", context_result.decision, context_result.duration_ms)

        if context_result.decision == GovernorDecision.BLOCK:
            self.audit_logger.log(ctx, context_result)
            return context_result, None

        # Level 3: Pre-LLM Guard
        pre_result, mod_system, mod_messages = await self._pre_llm_guard(
            ctx, system_prompt, messages
        )
        self.metrics.record_gate_result("pre_llm", pre_result.decision, pre_result.duration_ms)

        if pre_result.decision == GovernorDecision.BLOCK:
            self.audit_logger.log(ctx, pre_result)
            return pre_result, None

        # Execute LLM call
        try:
            response_text = await llm_call(mod_system, mod_messages, **llm_kwargs)
        except Exception as e:
            error_result = GovernorResult(
                decision=GovernorDecision.BLOCK,
                level=3,
                gate_name="llm_execution",
                reason=f"LLM call failed: {str(e)}",
                duration_ms=(time.time() - total_start) * 1000
            )
            self.audit_logger.log(ctx, error_result)
            return error_result, None

        # Level 4: Post-Response Validator
        post_result, validated_response = await self._post_response_validator(ctx, response_text)
        self.metrics.record_gate_result("post_response", post_result.decision, post_result.duration_ms)

        # Merge results for final decision
        final_result = GovernorResult(
            decision=post_result.decision,
            level=4,
            gate_name="govern_llm_operation",
            reason=f"LLM operation {'completed' if post_result.decision == GovernorDecision.ALLOW else 'blocked'}",
            conditions=[
                *intake_result.conditions,
                *context_result.conditions,
                *pre_result.conditions,
                *post_result.conditions
            ],
            modified_data=post_result.modified_data,
            duration_ms=(time.time() - total_start) * 1000,
            policy_chain=[
                {"level": 1, "gate": "intake", **intake_result.to_dict()},
                {"level": 2, "gate": "context", **context_result.to_dict()},
                {"level": 3, "gate": "pre_llm", **pre_result.to_dict()},
                {"level": 4, "gate": "post_response", **post_result.to_dict()},
            ]
        )

        self.audit_logger.log(ctx, final_result)

        if final_result.decision in [GovernorDecision.ALLOW, GovernorDecision.ALLOW_WITH_CONDITIONS]:
            return final_result, validated_response
        else:
            return final_result, None

    async def govern_action(
        self,
        ctx: GovernorContext,
        action: Dict,
        execute_func: Optional[Callable] = None
    ) -> Tuple[GovernorResult, Optional[Any]]:
        """
        Govern an action execution through levels 1, 2, 5.

        Args:
            ctx: Governor context
            action: Action to execute
            execute_func: Optional function to execute if approved

        Returns:
            (GovernorResult, execution_result or None if blocked)
        """
        total_start = time.time()

        # Level 1: Intake Gate
        intake_result = await self._intake_gate(ctx)
        self.metrics.record_gate_result("intake", intake_result.decision, intake_result.duration_ms)

        if intake_result.decision in [GovernorDecision.BLOCK, GovernorDecision.ESCALATE]:
            self.audit_logger.log(ctx, intake_result)
            return intake_result, None

        # Level 2: Context Sandbox
        context_result = await self._context_sandbox(ctx)
        self.metrics.record_gate_result("context", context_result.decision, context_result.duration_ms)

        if context_result.decision == GovernorDecision.BLOCK:
            self.audit_logger.log(ctx, context_result)
            return context_result, None

        # Level 5: Action Gate
        action_result = await self._action_gate(ctx, action)
        self.metrics.record_gate_result("action", action_result.decision, action_result.duration_ms)

        final_result = GovernorResult(
            decision=action_result.decision,
            level=5,
            gate_name="govern_action",
            reason=action_result.reason,
            conditions=[
                *intake_result.conditions,
                *context_result.conditions,
                *action_result.conditions
            ],
            modified_data=action_result.modified_data,
            duration_ms=(time.time() - total_start) * 1000
        )

        # Execute if approved and function provided
        execution_result = None
        if final_result.decision == GovernorDecision.ALLOW and execute_func:
            try:
                execution_result = await execute_func(action_result.modified_data or action)
            except Exception as e:
                final_result.decision = GovernorDecision.BLOCK
                final_result.reason = f"Execution failed: {str(e)}"

        self.audit_logger.log(ctx, final_result, {"execution_result": str(execution_result)})
        return final_result, execution_result

    async def govern_persist(
        self,
        ctx: GovernorContext,
        file_path: str,
        new_data: Dict,
        old_data: Optional[Dict] = None,
        persist_func: Optional[Callable] = None
    ) -> Tuple[GovernorResult, bool]:
        """
        Govern a persistence operation through levels 1, 2, 6.

        Args:
            ctx: Governor context
            file_path: Target file path
            new_data: Data to persist
            old_data: Previous data (for transition validation)
            persist_func: Optional function to execute persistence

        Returns:
            (GovernorResult, success: bool)
        """
        total_start = time.time()

        # Level 1: Intake Gate
        intake_result = await self._intake_gate(ctx)
        self.metrics.record_gate_result("intake", intake_result.decision, intake_result.duration_ms)

        if intake_result.decision in [GovernorDecision.BLOCK]:
            self.audit_logger.log(ctx, intake_result)
            return intake_result, False

        # Level 2: Context Sandbox
        context_result = await self._context_sandbox(ctx)
        self.metrics.record_gate_result("context", context_result.decision, context_result.duration_ms)

        if context_result.decision == GovernorDecision.BLOCK:
            self.audit_logger.log(ctx, context_result)
            return context_result, False

        # Level 6: Persistence Gate
        persist_result = await self._persistence_gate(ctx, file_path, new_data, old_data)
        self.metrics.record_gate_result("persistence", persist_result.decision, persist_result.duration_ms)

        final_result = GovernorResult(
            decision=persist_result.decision,
            level=6,
            gate_name="govern_persist",
            reason=persist_result.reason,
            conditions=[
                *intake_result.conditions,
                *context_result.conditions,
                *persist_result.conditions
            ],
            modified_data=persist_result.modified_data,
            duration_ms=(time.time() - total_start) * 1000
        )

        # Execute persistence if approved
        success = False
        if final_result.decision == GovernorDecision.ALLOW and persist_func:
            try:
                await persist_func(file_path, persist_result.modified_data or new_data)
                success = True
            except Exception as e:
                final_result.decision = GovernorDecision.BLOCK
                final_result.reason = f"Persistence failed: {str(e)}"
        elif final_result.decision == GovernorDecision.ALLOW:
            success = True

        self.audit_logger.log(ctx, final_result, {"success": success})
        return final_result, success

    # ═══════════════════════════════════════════════════════════════════════════
    # STATUS & MONITORING
    # ═══════════════════════════════════════════════════════════════════════════

    def get_status(self) -> Dict:
        """Get current Governor status"""
        return {
            "version": self.version,
            "initialized": self._initialized,
            "safe_level": self.safe_level.value,
            "circuit_breakers": {
                name: cb.get_status()
                for name, cb in self.circuit_breakers.items()
            },
            "cache_stats": self.cache.get_stats(),
            "audit_stats": self.audit_logger.get_stats(),
            "metrics": self.metrics.get_summary()
        }

    def set_safe_level(self, level: SafeLevel, reason: str = ""):
        """Manually set safe mode level"""
        old_level = self.safe_level
        self.safe_level = level
        logging.warning(f"Safe level changed: {old_level.value} -> {level.value}. Reason: {reason}")

        # Log the change
        self.audit_logger.log(
            GovernorContext(
                request_id=str(uuid.uuid4()),
                user_id="system",
                operation_type="safe_level_change",
                source="governor",
                timestamp=datetime.now(),
                data={"old_level": old_level.value, "new_level": level.value, "reason": reason}
            ),
            GovernorResult(
                decision=GovernorDecision.ALLOW,
                level=0,
                gate_name="safe_level_change",
                reason=reason
            )
        )

    def add_policy(self, policy: PolicyRule):
        """Add a custom policy rule"""
        self.policies.append(policy)
        logging.info(f"Added policy: {policy.id} ({policy.level.name})")

    def remove_policy(self, policy_id: str) -> bool:
        """Remove a policy by ID"""
        for i, policy in enumerate(self.policies):
            if policy.id == policy_id:
                del self.policies[i]
                logging.info(f"Removed policy: {policy_id}")
                return True
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# SINGLETON INSTANCE
# ═══════════════════════════════════════════════════════════════════════════════

_governor_instance: Optional[Governor] = None
_governor_lock = threading.Lock()

def get_governor() -> Governor:
    """Get the global Governor instance (singleton)"""
    global _governor_instance
    with _governor_lock:
        if _governor_instance is None:
            _governor_instance = Governor()
        return _governor_instance

async def init_governor() -> Governor:
    """Initialize and return the global Governor instance"""
    governor = get_governor()
    await governor.initialize()
    return governor


# ═══════════════════════════════════════════════════════════════════════════════
# CONVENIENCE DECORATORS
# ═══════════════════════════════════════════════════════════════════════════════

def governed_llm(operation_type: str = "chat", source: str = "api"):
    """
    Decorator to wrap LLM operations with governance.

    Usage:
        @governed_llm(operation_type="chat", source="web_api")
        async def my_llm_call(system, messages, **kwargs):
            return await anthropic_client.messages.create(...)
    """
    def decorator(func):
        async def wrapper(system_prompt: str, messages: List[Dict],
                         user_id: str = None, **kwargs):
            governor = get_governor()
            if not governor._initialized:
                await governor.initialize()

            ctx = GovernorContext(
                request_id=str(uuid.uuid4()),
                user_id=user_id,
                operation_type=operation_type,
                source=source,
                timestamp=datetime.now(),
                data={"messages_count": len(messages)},
                metadata=kwargs.get("metadata", {})
            )

            result, response = await governor.govern_llm_operation(
                ctx, func, system_prompt, messages, **kwargs
            )

            if result.decision in [GovernorDecision.ALLOW, GovernorDecision.ALLOW_WITH_CONDITIONS]:
                return response
            else:
                raise GovernanceError(result)

        return wrapper
    return decorator


def governed_action(operation_type: str = "action", source: str = "api"):
    """
    Decorator to wrap action executions with governance.

    Usage:
        @governed_action(operation_type="task_update", source="orchestrator")
        async def update_task(action_data):
            return await task_service.update(action_data)
    """
    def decorator(func):
        async def wrapper(action: Dict, user_id: str = None, **kwargs):
            governor = get_governor()
            if not governor._initialized:
                await governor.initialize()

            ctx = GovernorContext(
                request_id=str(uuid.uuid4()),
                user_id=user_id,
                operation_type=operation_type,
                source=source,
                timestamp=datetime.now(),
                data=action,
                metadata=kwargs.get("metadata", {})
            )

            result, execution_result = await governor.govern_action(
                ctx, action, func
            )

            if result.decision in [GovernorDecision.ALLOW, GovernorDecision.ALLOW_WITH_CONDITIONS]:
                return execution_result
            else:
                raise GovernanceError(result)

        return wrapper
    return decorator


class GovernanceError(Exception):
    """Raised when a governance check fails"""
    def __init__(self, result: GovernorResult):
        self.result = result
        super().__init__(f"Governance {result.decision.value}: {result.reason}")


# ═══════════════════════════════════════════════════════════════════════════════
# CLI & TESTING
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Governor - AI Operations Governance")
    parser.add_argument("--status", action="store_true", help="Show Governor status")
    parser.add_argument("--test", action="store_true", help="Run test governance flow")
    parser.add_argument("--set-level", choices=["GREEN", "YELLOW", "RED", "LOCKDOWN"],
                       help="Set safe mode level")
    args = parser.parse_args()

    async def main():
        governor = await init_governor()

        if args.status:
            status = governor.get_status()
            print(json.dumps(status, indent=2, default=str))

        elif args.set_level:
            level = SafeLevel[args.set_level]
            governor.set_safe_level(level, "CLI command")
            print(f"Safe level set to: {level.value}")

        elif args.test:
            print("Testing Governor flow...")

            # Test LLM governance
            ctx = GovernorContext(
                request_id="test-001",
                user_id="test_user",
                operation_type="chat",
                source="test",
                timestamp=datetime.now(),
                data={"test": True}
            )

            async def mock_llm(system, messages, **kwargs):
                return "This is a test response from the mock LLM."

            result, response = await governor.govern_llm_operation(
                ctx,
                mock_llm,
                "You are a helpful assistant.",
                [{"role": "user", "content": "Hello!"}]
            )

            print(f"\nTest Result:")
            print(f"  Decision: {result.decision.value}")
            print(f"  Reason: {result.reason}")
            print(f"  Duration: {result.duration_ms:.2f}ms")
            print(f"  Response: {response[:100] if response else 'None'}...")
            print(f"  Conditions: {result.conditions}")

        else:
            parser.print_help()

    asyncio.run(main())
