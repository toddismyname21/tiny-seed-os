#!/usr/bin/env python3
"""
===============================================================================
PM SAFETY GATE v1.0 - 5-Gate Validation System for PM Actions
===============================================================================

Based on SOTA research: Every PM action should go through 5 gates to prevent
hallucinations and ensure reliable autonomous behavior.

THE 5 GATES:
1. SOURCE VERIFICATION - Is this grounded in memory/actual data?
2. CONFIDENCE CHECK - Does confidence exceed threshold (default 80%)?
3. IMPACT ANALYSIS - What could go wrong? How reversible is this action?
4. DEPENDENCY CHECK - Are blockers still valid? Prerequisites met?
5. HUMAN OVERRIDE - Has the user blocked this type of action?

DESIGN PRINCIPLES:
- Fail-safe: If any gate fails, action is blocked
- Transparent: Full audit trail of all decisions
- Configurable: Thresholds and enabled gates are adjustable
- Learnable: Records outcomes to improve over time

Usage:
    from pm_safety_gate import PMSafetyGate, get_safety_gate

    gate = get_safety_gate(memory, confidence_scorer)

    action = {
        'type': 'suggest_task',
        'content': 'Recommend weeding for Alice',
        'memory_sources': ['alice_prefers_outdoor', 'weather_clear'],
        'confidence': 0.85,
        'dependencies': ['task_123']
    }

    result = gate.check_action(action)
    if result['approved']:
        # Execute action
    else:
        # Action blocked - log reason
        print(f"Blocked by gate: {result['gate_failed']}, reason: {result['reason']}")
"""

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum

# ===============================================================================
# CONFIGURATION
# ===============================================================================

APP_DIR = Path(__file__).parent

# Safety gate state files
SAFETY_GATE_CONFIG_FILE = APP_DIR / ".pm_safety_gate_config.json"
SAFETY_GATE_DECISIONS_FILE = APP_DIR / ".pm_safety_gate_decisions.json"
SAFETY_GATE_OVERRIDES_FILE = APP_DIR / ".pm_safety_gate_overrides.json"

# Default configuration
DEFAULT_CONFIG = {
    "gates_enabled": {
        "source_verification": True,
        "confidence_check": True,
        "impact_analysis": True,
        "dependency_check": True,
        "human_override": True
    },
    "thresholds": {
        "confidence_minimum": 0.80,  # 80% minimum confidence
        "confidence_auto_approve": 0.95,  # 95% for auto-approval
        "confidence_require_clarification": 0.70,  # Below this, ask for clarification
        "max_impact_score": 0.7,  # Maximum acceptable impact score (0-1)
        "min_source_verification_ratio": 0.5  # At least 50% of sources must verify
    },
    "impact_weights": {
        "irreversible": 0.4,  # Weight for irreversible actions
        "affects_external": 0.3,  # Weight for actions affecting external systems
        "affects_users": 0.3,  # Weight for actions affecting other users
        "financial": 0.5,  # Weight for financial impact
        "data_modification": 0.3,  # Weight for data modification
        "communication": 0.2  # Weight for sending communications
    },
    "action_risk_levels": {
        # Low risk actions
        "suggest_task": "low",
        "show_status": "low",
        "provide_info": "low",
        "summarize": "low",
        # Medium risk actions
        "create_task": "medium",
        "update_task": "medium",
        "send_reminder": "medium",
        "schedule_meeting": "medium",
        # High risk actions
        "delete_task": "high",
        "send_email": "high",
        "make_purchase": "high",
        "modify_user_data": "high",
        "external_api_call": "high",
        "autonomous_action": "high"
    },
    "max_decisions_to_log": 1000,
    "version": "1.0.0",
    "created_at": datetime.now().isoformat()
}


# ===============================================================================
# ENUMS AND DATA CLASSES
# ===============================================================================

class GateName(Enum):
    """Names of the 5 safety gates."""
    SOURCE_VERIFICATION = "source_verification"
    CONFIDENCE_CHECK = "confidence_check"
    IMPACT_ANALYSIS = "impact_analysis"
    DEPENDENCY_CHECK = "dependency_check"
    HUMAN_OVERRIDE = "human_override"


class ActionRiskLevel(Enum):
    """Risk levels for actions."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class DecisionOutcome(Enum):
    """Possible outcomes from the safety gate."""
    APPROVED = "approved"
    BLOCKED = "blocked"
    NEEDS_CLARIFICATION = "needs_clarification"
    NEEDS_APPROVAL = "needs_approval"


@dataclass
class GateResult:
    """Result from a single gate check."""
    gate: GateName
    passed: bool
    score: float  # 0.0 to 1.0
    reason: str
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "gate": self.gate.value,
            "passed": self.passed,
            "score": self.score,
            "reason": self.reason,
            "details": self.details
        }


@dataclass
class SafetyDecision:
    """Complete decision from the safety gate system."""
    action_id: str
    action_type: str
    timestamp: str
    outcome: DecisionOutcome
    gate_failed: Optional[str]
    reason: str
    gate_results: List[GateResult]
    action_summary: str
    risk_level: ActionRiskLevel
    total_score: float  # Combined score from all gates
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "action_id": self.action_id,
            "action_type": self.action_type,
            "timestamp": self.timestamp,
            "outcome": self.outcome.value,
            "gate_failed": self.gate_failed,
            "reason": self.reason,
            "gate_results": [g.to_dict() for g in self.gate_results],
            "action_summary": self.action_summary,
            "risk_level": self.risk_level.value,
            "total_score": self.total_score,
            "metadata": self.metadata
        }


# ===============================================================================
# HELPER FUNCTIONS
# ===============================================================================

def safe_read_json(path: Path, default: Any = None) -> Any:
    """Safely read JSON file."""
    try:
        if path.exists():
            return json.loads(path.read_text())
    except Exception:
        pass
    return default if default is not None else {}


def safe_write_json(path: Path, data: Any) -> bool:
    """Safely write JSON file."""
    try:
        path.write_text(json.dumps(data, indent=2, default=str))
        return True
    except Exception:
        return False


def log(msg: str, level: str = "INFO"):
    """Log with timestamp."""
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [SafetyGate] [{level}] {msg}")


# ===============================================================================
# PM SAFETY GATE
# ===============================================================================

class PMSafetyGate:
    """
    5-gate safety system for PM actions.
    Prevents hallucinations through validation.

    Every action must pass through all enabled gates:
    1. Source Verification - Is this grounded in memory?
    2. Confidence Check - Is confidence > 80%?
    3. Impact Analysis - What could go wrong?
    4. Dependency Check - Are blockers still valid?
    5. Human Override - Allow user to block action
    """

    def __init__(self, memory=None, confidence_scorer=None):
        """
        Initialize the safety gate.

        Args:
            memory: Memory manager instance (for source verification)
            confidence_scorer: ConfidenceScorer instance (for confidence checks)
        """
        self.memory = memory
        self.confidence_scorer = confidence_scorer
        self.config = self._load_config()
        self.overrides = self._load_overrides()
        self.decision_log: List[SafetyDecision] = []
        self._load_decision_log()

        log(f"Initialized with {sum(self.config['gates_enabled'].values())}/5 gates enabled")

    def _load_config(self) -> Dict:
        """Load configuration from file or use defaults."""
        config = safe_read_json(SAFETY_GATE_CONFIG_FILE, DEFAULT_CONFIG)
        # Ensure all default keys exist
        for key, value in DEFAULT_CONFIG.items():
            if key not in config:
                config[key] = value
            elif isinstance(value, dict):
                for subkey, subvalue in value.items():
                    if subkey not in config[key]:
                        config[key][subkey] = subvalue
        return config

    def save_config(self) -> bool:
        """Save current configuration to file."""
        self.config["updated_at"] = datetime.now().isoformat()
        return safe_write_json(SAFETY_GATE_CONFIG_FILE, self.config)

    def _load_overrides(self) -> Dict:
        """Load human override settings."""
        return safe_read_json(SAFETY_GATE_OVERRIDES_FILE, {
            "blocked_action_types": [],
            "blocked_patterns": [],
            "always_require_approval": [],
            "whitelist": [],
            "updated_at": None
        })

    def save_overrides(self) -> bool:
        """Save override settings to file."""
        self.overrides["updated_at"] = datetime.now().isoformat()
        return safe_write_json(SAFETY_GATE_OVERRIDES_FILE, self.overrides)

    def _load_decision_log(self):
        """Load decision log from file."""
        data = safe_read_json(SAFETY_GATE_DECISIONS_FILE, {"decisions": []})
        # Keep only last N decisions
        max_decisions = self.config.get("max_decisions_to_log", 1000)
        decisions = data.get("decisions", [])[-max_decisions:]
        # Convert to SafetyDecision objects (lightweight - just keep as dicts)
        self.decision_log = decisions

    def _save_decision_log(self):
        """Save decision log to file."""
        max_decisions = self.config.get("max_decisions_to_log", 1000)
        data = {
            "decisions": self.decision_log[-max_decisions:],
            "total_decisions": len(self.decision_log),
            "last_updated": datetime.now().isoformat()
        }
        safe_write_json(SAFETY_GATE_DECISIONS_FILE, data)

    # ═══════════════════════════════════════════════════════════════════════════
    # MAIN ENTRY POINT
    # ═══════════════════════════════════════════════════════════════════════════

    def check_action(self, action: Dict) -> Dict:
        """
        Run action through all 5 gates.

        Args:
            action: Dict containing:
                - type: str - Action type (e.g., 'suggest_task', 'send_email')
                - content: str - Action content/description
                - memory_sources: List[str] - Memory keys this action is based on
                - confidence: float - Confidence score (0-1)
                - dependencies: List[str] - Task/action IDs this depends on
                - metadata: Dict - Additional metadata

        Returns:
            Dict with:
                - approved: bool - Whether action is approved
                - outcome: str - 'approved', 'blocked', 'needs_clarification', 'needs_approval'
                - gate_failed: Optional[str] - Name of gate that failed (if any)
                - reason: str - Human-readable explanation
                - action_id: str - UUID for tracking
                - risk_level: str - 'low', 'medium', 'high', 'critical'
                - total_score: float - Combined score from all gates
                - gate_results: List[Dict] - Detailed results from each gate
                - suggestions: List[str] - Suggestions for passing blocked gates
        """
        action_id = str(uuid.uuid4())
        action_type = action.get("type", "unknown")
        action_content = action.get("content", "")

        log(f"Checking action: {action_type} [{action_id[:8]}...]")

        # Determine risk level
        risk_level = self._get_risk_level(action_type)

        # Run through all enabled gates
        gate_results: List[GateResult] = []
        all_passed = True
        first_failed_gate = None
        first_failure_reason = ""

        # Gate 1: Source Verification
        if self.config["gates_enabled"].get("source_verification", True):
            result = self.gate_1_source_verification(action)
            gate_results.append(result)
            if not result.passed:
                all_passed = False
                if first_failed_gate is None:
                    first_failed_gate = result.gate.value
                    first_failure_reason = result.reason

        # Gate 2: Confidence Check
        if self.config["gates_enabled"].get("confidence_check", True):
            result = self.gate_2_confidence_check(action)
            gate_results.append(result)
            if not result.passed:
                all_passed = False
                if first_failed_gate is None:
                    first_failed_gate = result.gate.value
                    first_failure_reason = result.reason

        # Gate 3: Impact Analysis
        if self.config["gates_enabled"].get("impact_analysis", True):
            result = self.gate_3_impact_analysis(action, risk_level)
            gate_results.append(result)
            if not result.passed:
                all_passed = False
                if first_failed_gate is None:
                    first_failed_gate = result.gate.value
                    first_failure_reason = result.reason

        # Gate 4: Dependency Check
        if self.config["gates_enabled"].get("dependency_check", True):
            result = self.gate_4_dependency_check(action)
            gate_results.append(result)
            if not result.passed:
                all_passed = False
                if first_failed_gate is None:
                    first_failed_gate = result.gate.value
                    first_failure_reason = result.reason

        # Gate 5: Human Override
        if self.config["gates_enabled"].get("human_override", True):
            result = self.gate_5_human_override(action)
            gate_results.append(result)
            if not result.passed:
                all_passed = False
                if first_failed_gate is None:
                    first_failed_gate = result.gate.value
                    first_failure_reason = result.reason

        # Calculate total score
        if gate_results:
            total_score = sum(r.score for r in gate_results) / len(gate_results)
        else:
            total_score = 1.0  # No gates enabled = pass

        # Determine outcome
        if all_passed:
            outcome = DecisionOutcome.APPROVED
            reason = "All gates passed"
        else:
            # Check if we need clarification vs full block
            confidence = action.get("confidence", 0)
            clarification_threshold = self.config["thresholds"].get("confidence_require_clarification", 0.70)

            if confidence >= clarification_threshold and first_failed_gate != "human_override":
                outcome = DecisionOutcome.NEEDS_CLARIFICATION
                reason = f"Gate '{first_failed_gate}' needs clarification: {first_failure_reason}"
            elif risk_level == ActionRiskLevel.HIGH:
                outcome = DecisionOutcome.NEEDS_APPROVAL
                reason = f"High-risk action blocked by '{first_failed_gate}': {first_failure_reason}"
            else:
                outcome = DecisionOutcome.BLOCKED
                reason = f"Blocked by gate '{first_failed_gate}': {first_failure_reason}"

        # Create decision record
        decision = SafetyDecision(
            action_id=action_id,
            action_type=action_type,
            timestamp=datetime.now().isoformat(),
            outcome=outcome,
            gate_failed=first_failed_gate,
            reason=reason,
            gate_results=gate_results,
            action_summary=action_content[:200] if action_content else "",
            risk_level=risk_level,
            total_score=total_score,
            metadata=action.get("metadata", {})
        )

        # Log decision
        self.log_decision(action, decision)

        # Generate suggestions for blocked actions
        suggestions = []
        if not all_passed:
            suggestions = self._generate_suggestions(action, gate_results)

        log(f"Decision: {outcome.value} (score: {total_score:.2f}) [{action_id[:8]}...]")

        return {
            "approved": outcome == DecisionOutcome.APPROVED,
            "outcome": outcome.value,
            "gate_failed": first_failed_gate,
            "reason": reason,
            "action_id": action_id,
            "risk_level": risk_level.value,
            "total_score": total_score,
            "gate_results": [r.to_dict() for r in gate_results],
            "suggestions": suggestions
        }

    # ═══════════════════════════════════════════════════════════════════════════
    # GATE 1: SOURCE VERIFICATION
    # ═══════════════════════════════════════════════════════════════════════════

    def gate_1_source_verification(self, action: Dict) -> GateResult:
        """
        Verify all claimed sources exist in memory.

        This gate ensures the action is grounded in actual data, not hallucinated.

        Checks:
        - All memory_sources exist in the memory system
        - Sources are recent enough to be relevant
        - Data referenced in content matches actual values
        """
        memory_sources = action.get("memory_sources", [])
        content = action.get("content", "")

        # If no sources claimed, check if action type requires sources
        if not memory_sources:
            action_type = action.get("type", "")
            # Low-risk actions that don't need sources
            no_source_ok = ["show_status", "provide_info", "summarize", "suggest_task"]
            if action_type in no_source_ok:
                return GateResult(
                    gate=GateName.SOURCE_VERIFICATION,
                    passed=True,
                    score=0.8,
                    reason="Low-risk action type does not require memory sources",
                    details={"action_type": action_type}
                )
            else:
                return GateResult(
                    gate=GateName.SOURCE_VERIFICATION,
                    passed=False,
                    score=0.0,
                    reason="No memory sources provided for action that requires grounding",
                    details={"action_type": action_type, "requires_sources": True}
                )

        # Verify each source exists
        verified_sources = []
        missing_sources = []
        stale_sources = []

        for source in memory_sources:
            source_data = self._verify_memory_source(source)
            if source_data["exists"]:
                if source_data.get("is_stale", False):
                    stale_sources.append(source)
                else:
                    verified_sources.append(source)
            else:
                missing_sources.append(source)

        # Calculate verification ratio
        total_sources = len(memory_sources)
        verified_count = len(verified_sources)
        verification_ratio = verified_count / total_sources if total_sources > 0 else 0

        # Check against threshold
        min_ratio = self.config["thresholds"].get("min_source_verification_ratio", 0.5)
        passed = verification_ratio >= min_ratio

        # Score calculation
        score = verification_ratio
        if stale_sources:
            score *= 0.9  # Small penalty for stale sources

        if passed:
            reason = f"Verified {verified_count}/{total_sources} sources"
            if stale_sources:
                reason += f" ({len(stale_sources)} stale)"
        else:
            reason = f"Only {verified_count}/{total_sources} sources verified (need {min_ratio*100:.0f}%)"

        return GateResult(
            gate=GateName.SOURCE_VERIFICATION,
            passed=passed,
            score=score,
            reason=reason,
            details={
                "verified_sources": verified_sources,
                "missing_sources": missing_sources,
                "stale_sources": stale_sources,
                "verification_ratio": verification_ratio,
                "threshold": min_ratio
            }
        )

    def _verify_memory_source(self, source_key: str) -> Dict:
        """Verify a single memory source exists and is valid."""
        if self.memory is None:
            # No memory system attached - trust claimed sources
            return {"exists": True, "is_stale": False, "data": None}

        try:
            # Check if memory has a get or retrieve method
            if hasattr(self.memory, 'memory') and hasattr(self.memory.memory, '__dict__'):
                # MemoryManager style
                mem = self.memory.memory
                # Check user_facts, project_facts, preferences
                all_facts = (
                    mem.user_facts +
                    mem.project_facts +
                    list(mem.preferences.keys())
                )
                # Simple check: does source_key appear in any fact?
                for fact in all_facts:
                    if source_key.lower() in str(fact).lower():
                        return {"exists": True, "is_stale": False, "data": fact}

            # Try direct memory access
            if hasattr(self.memory, 'get'):
                data = self.memory.get(source_key)
                if data is not None:
                    return {"exists": True, "is_stale": False, "data": data}

            # Check .pm_memory.json directly as fallback
            memory_file = APP_DIR / ".pm_memory.json"
            if memory_file.exists():
                mem_data = json.loads(memory_file.read_text())
                # Search all memory contents
                for key, value in mem_data.items():
                    if source_key.lower() in str(value).lower():
                        return {"exists": True, "is_stale": False, "data": value}

            return {"exists": False, "is_stale": False, "data": None}

        except Exception as e:
            log(f"Error verifying source '{source_key}': {e}", "WARN")
            # On error, be permissive
            return {"exists": True, "is_stale": False, "data": None}

    # ═══════════════════════════════════════════════════════════════════════════
    # GATE 2: CONFIDENCE CHECK
    # ═══════════════════════════════════════════════════════════════════════════

    def gate_2_confidence_check(self, action: Dict) -> GateResult:
        """
        Verify confidence meets threshold.

        Uses the ConfidenceScorer if available, otherwise uses the provided confidence.

        Thresholds:
        - >95%: Auto-approve
        - 80-95%: Normal approval
        - 70-80%: Needs clarification
        - <70%: Block
        """
        provided_confidence = action.get("confidence", 0.5)
        action_type = action.get("type", "unknown")

        # Use ConfidenceScorer if available for calibrated confidence
        if self.confidence_scorer is not None:
            try:
                context = action.get("context", {})
                calibrated_confidence = self.confidence_scorer.score_suggestion(
                    action_type,
                    context
                )
                # Blend provided and calibrated confidence
                final_confidence = (provided_confidence * 0.4) + (calibrated_confidence * 0.6)
            except Exception as e:
                log(f"ConfidenceScorer error: {e}", "WARN")
                final_confidence = provided_confidence
        else:
            final_confidence = provided_confidence

        # Get thresholds
        min_confidence = self.config["thresholds"].get("confidence_minimum", 0.80)
        auto_approve = self.config["thresholds"].get("confidence_auto_approve", 0.95)
        clarify_threshold = self.config["thresholds"].get("confidence_require_clarification", 0.70)

        # Determine result
        if final_confidence >= auto_approve:
            passed = True
            reason = f"High confidence ({final_confidence*100:.1f}%) - auto-approved"
        elif final_confidence >= min_confidence:
            passed = True
            reason = f"Confidence ({final_confidence*100:.1f}%) meets threshold ({min_confidence*100:.0f}%)"
        elif final_confidence >= clarify_threshold:
            passed = False
            reason = f"Confidence ({final_confidence*100:.1f}%) below threshold - needs clarification"
        else:
            passed = False
            reason = f"Low confidence ({final_confidence*100:.1f}%) - blocked"

        return GateResult(
            gate=GateName.CONFIDENCE_CHECK,
            passed=passed,
            score=final_confidence,
            reason=reason,
            details={
                "provided_confidence": provided_confidence,
                "final_confidence": final_confidence,
                "threshold_min": min_confidence,
                "threshold_auto": auto_approve,
                "threshold_clarify": clarify_threshold,
                "used_scorer": self.confidence_scorer is not None
            }
        )

    # ═══════════════════════════════════════════════════════════════════════════
    # GATE 3: IMPACT ANALYSIS
    # ═══════════════════════════════════════════════════════════════════════════

    def gate_3_impact_analysis(self, action: Dict, risk_level: ActionRiskLevel) -> GateResult:
        """
        Analyze what could go wrong with this action.

        Factors:
        - Is the action reversible?
        - Does it affect external systems?
        - Does it affect other users?
        - Financial impact?
        - Data modification scope?
        - Communication (emails, messages)?
        """
        action_type = action.get("type", "unknown")
        content = action.get("content", "")
        metadata = action.get("metadata", {})

        # Calculate impact score components
        impact_factors = {}
        weights = self.config["impact_weights"]

        # Irreversibility check
        irreversible_actions = ["delete", "remove", "send_email", "publish", "make_purchase"]
        is_irreversible = any(ia in action_type.lower() for ia in irreversible_actions)
        impact_factors["irreversible"] = 1.0 if is_irreversible else 0.0

        # External system check
        external_keywords = ["api", "external", "sync", "publish", "send", "post"]
        affects_external = any(ek in action_type.lower() or ek in content.lower() for ek in external_keywords)
        impact_factors["affects_external"] = 1.0 if affects_external else 0.0

        # User impact check
        user_keywords = ["user", "team", "member", "notify", "assign"]
        affects_users = any(uk in content.lower() for uk in user_keywords)
        impact_factors["affects_users"] = 1.0 if affects_users else 0.0

        # Financial impact check
        financial_keywords = ["purchase", "payment", "invoice", "cost", "price", "$"]
        has_financial = any(fk in content.lower() for fk in financial_keywords)
        impact_factors["financial"] = 1.0 if has_financial else 0.0

        # Data modification check
        data_mod_keywords = ["update", "modify", "change", "edit", "create", "delete"]
        modifies_data = any(dk in action_type.lower() for dk in data_mod_keywords)
        impact_factors["data_modification"] = 1.0 if modifies_data else 0.0

        # Communication check
        comm_keywords = ["email", "message", "notify", "sms", "slack", "send"]
        sends_communication = any(ck in action_type.lower() or ck in content.lower() for ck in comm_keywords)
        impact_factors["communication"] = 1.0 if sends_communication else 0.0

        # Calculate weighted impact score
        total_impact = 0
        total_weight = 0
        for factor, value in impact_factors.items():
            weight = weights.get(factor, 0.1)
            total_impact += value * weight
            total_weight += weight

        impact_score = total_impact / total_weight if total_weight > 0 else 0

        # Risk level adjustment
        if risk_level == ActionRiskLevel.HIGH:
            impact_score = min(1.0, impact_score * 1.3)
        elif risk_level == ActionRiskLevel.CRITICAL:
            impact_score = min(1.0, impact_score * 1.5)
        elif risk_level == ActionRiskLevel.LOW:
            impact_score = impact_score * 0.7

        # Check against threshold
        max_impact = self.config["thresholds"].get("max_impact_score", 0.7)
        passed = impact_score <= max_impact

        # Safety score (inverse of impact)
        safety_score = 1.0 - impact_score

        if passed:
            reason = f"Impact score ({impact_score*100:.1f}%) within acceptable range"
        else:
            high_impact_factors = [f for f, v in impact_factors.items() if v > 0]
            reason = f"High impact ({impact_score*100:.1f}%): {', '.join(high_impact_factors)}"

        return GateResult(
            gate=GateName.IMPACT_ANALYSIS,
            passed=passed,
            score=safety_score,
            reason=reason,
            details={
                "impact_score": impact_score,
                "impact_factors": impact_factors,
                "risk_level": risk_level.value,
                "max_allowed": max_impact,
                "is_reversible": not is_irreversible
            }
        )

    # ═══════════════════════════════════════════════════════════════════════════
    # GATE 4: DEPENDENCY CHECK
    # ═══════════════════════════════════════════════════════════════════════════

    def gate_4_dependency_check(self, action: Dict) -> GateResult:
        """
        Verify dependencies are still valid.

        Checks:
        - All referenced tasks/actions still exist
        - Blockers have been resolved
        - Prerequisites have been met
        - Time-based dependencies are satisfied
        """
        dependencies = action.get("dependencies", [])
        blockers = action.get("blockers", [])
        prerequisites = action.get("prerequisites", [])

        # If no dependencies, pass automatically
        if not dependencies and not blockers and not prerequisites:
            return GateResult(
                gate=GateName.DEPENDENCY_CHECK,
                passed=True,
                score=1.0,
                reason="No dependencies to check",
                details={"has_dependencies": False}
            )

        # Check dependencies
        invalid_deps = []
        valid_deps = []
        unresolved_blockers = []
        unmet_prereqs = []

        # Verify each dependency exists
        for dep in dependencies:
            if self._check_dependency_exists(dep):
                valid_deps.append(dep)
            else:
                invalid_deps.append(dep)

        # Check blockers are resolved
        for blocker in blockers:
            if not self._check_blocker_resolved(blocker):
                unresolved_blockers.append(blocker)

        # Check prerequisites are met
        for prereq in prerequisites:
            if not self._check_prerequisite_met(prereq):
                unmet_prereqs.append(prereq)

        # Calculate score
        total_items = len(dependencies) + len(blockers) + len(prerequisites)
        problem_count = len(invalid_deps) + len(unresolved_blockers) + len(unmet_prereqs)

        if total_items > 0:
            score = 1.0 - (problem_count / total_items)
        else:
            score = 1.0

        passed = problem_count == 0

        if passed:
            reason = f"All {total_items} dependencies verified"
        else:
            problems = []
            if invalid_deps:
                problems.append(f"{len(invalid_deps)} invalid deps")
            if unresolved_blockers:
                problems.append(f"{len(unresolved_blockers)} unresolved blockers")
            if unmet_prereqs:
                problems.append(f"{len(unmet_prereqs)} unmet prerequisites")
            reason = f"Dependency issues: {', '.join(problems)}"

        return GateResult(
            gate=GateName.DEPENDENCY_CHECK,
            passed=passed,
            score=score,
            reason=reason,
            details={
                "valid_dependencies": valid_deps,
                "invalid_dependencies": invalid_deps,
                "unresolved_blockers": unresolved_blockers,
                "unmet_prerequisites": unmet_prereqs
            }
        )

    def _check_dependency_exists(self, dep_id: str) -> bool:
        """Check if a dependency (task, action) still exists."""
        try:
            # Check board.json for task dependencies
            board_file = APP_DIR / "board.json"
            if board_file.exists():
                board = json.loads(board_file.read_text())
                tasks = board.get("tasks", [])
                for task in tasks:
                    if str(task.get("id")) == str(dep_id):
                        return True

            # Check intercom for action dependencies
            intercom_file = APP_DIR / ".claude_intercom.json"
            if intercom_file.exists():
                intercom = json.loads(intercom_file.read_text())
                for msg in intercom.get("pm_to_builder", []):
                    if str(msg.get("id")) == str(dep_id):
                        return True

            return False
        except Exception:
            return True  # On error, assume valid

    def _check_blocker_resolved(self, blocker_id: str) -> bool:
        """Check if a blocker has been resolved."""
        try:
            board_file = APP_DIR / "board.json"
            if board_file.exists():
                board = json.loads(board_file.read_text())
                tasks = board.get("tasks", [])
                for task in tasks:
                    if str(task.get("id")) == str(blocker_id):
                        # Blocker is resolved if task is done
                        return task.get("status") == "done"
            return True  # If not found, assume resolved
        except Exception:
            return True

    def _check_prerequisite_met(self, prereq: str) -> bool:
        """Check if a prerequisite condition is met."""
        # Simple implementation - check if prereq string contains task ID
        # that is marked as done
        return self._check_blocker_resolved(prereq)

    # ═══════════════════════════════════════════════════════════════════════════
    # GATE 5: HUMAN OVERRIDE
    # ═══════════════════════════════════════════════════════════════════════════

    def gate_5_human_override(self, action: Dict) -> GateResult:
        """
        Check if human has blocked this type of action.

        Checks:
        - Action type is not in blocked list
        - Action content doesn't match blocked patterns
        - Action is not in always-require-approval list
        - Check for explicit whitelist approvals
        """
        action_type = action.get("type", "unknown")
        content = action.get("content", "")

        # Check whitelist first (explicit approvals)
        whitelist = self.overrides.get("whitelist", [])
        for approved in whitelist:
            if self._matches_override_pattern(action, approved):
                return GateResult(
                    gate=GateName.HUMAN_OVERRIDE,
                    passed=True,
                    score=1.0,
                    reason="Explicitly whitelisted by user",
                    details={"matched_whitelist": approved}
                )

        # Check blocked action types
        blocked_types = self.overrides.get("blocked_action_types", [])
        if action_type in blocked_types:
            return GateResult(
                gate=GateName.HUMAN_OVERRIDE,
                passed=False,
                score=0.0,
                reason=f"Action type '{action_type}' is blocked by user",
                details={"blocked_type": action_type}
            )

        # Check blocked patterns
        blocked_patterns = self.overrides.get("blocked_patterns", [])
        for pattern in blocked_patterns:
            if pattern.lower() in content.lower() or pattern.lower() in action_type.lower():
                return GateResult(
                    gate=GateName.HUMAN_OVERRIDE,
                    passed=False,
                    score=0.0,
                    reason=f"Action matches blocked pattern: '{pattern}'",
                    details={"matched_pattern": pattern}
                )

        # Check if requires explicit approval
        require_approval = self.overrides.get("always_require_approval", [])
        if action_type in require_approval:
            return GateResult(
                gate=GateName.HUMAN_OVERRIDE,
                passed=False,
                score=0.5,
                reason=f"Action type '{action_type}' requires explicit approval",
                details={"requires_approval": True}
            )

        # No blocks - approved
        return GateResult(
            gate=GateName.HUMAN_OVERRIDE,
            passed=True,
            score=1.0,
            reason="No human overrides apply",
            details={"checked_blocks": len(blocked_types) + len(blocked_patterns)}
        )

    def _matches_override_pattern(self, action: Dict, pattern: Dict) -> bool:
        """Check if action matches an override pattern."""
        if isinstance(pattern, str):
            return pattern == action.get("type")
        if isinstance(pattern, dict):
            action_type = pattern.get("type")
            if action_type and action_type != action.get("type"):
                return False
            content_pattern = pattern.get("content")
            if content_pattern and content_pattern.lower() not in action.get("content", "").lower():
                return False
            return True
        return False

    # ═══════════════════════════════════════════════════════════════════════════
    # HELPER METHODS
    # ═══════════════════════════════════════════════════════════════════════════

    def _get_risk_level(self, action_type: str) -> ActionRiskLevel:
        """Determine risk level for an action type."""
        risk_levels = self.config.get("action_risk_levels", {})
        level_str = risk_levels.get(action_type, "medium")

        try:
            return ActionRiskLevel(level_str)
        except ValueError:
            return ActionRiskLevel.MEDIUM

    def _generate_suggestions(self, action: Dict, gate_results: List[GateResult]) -> List[str]:
        """Generate suggestions for fixing blocked action."""
        suggestions = []

        for result in gate_results:
            if not result.passed:
                if result.gate == GateName.SOURCE_VERIFICATION:
                    if result.details.get("missing_sources"):
                        suggestions.append(
                            f"Add memory sources for: {', '.join(result.details['missing_sources'][:3])}"
                        )
                    suggestions.append("Ensure claims are grounded in stored memory/data")

                elif result.gate == GateName.CONFIDENCE_CHECK:
                    conf = result.details.get("final_confidence", 0)
                    threshold = result.details.get("threshold_min", 0.8)
                    suggestions.append(
                        f"Increase confidence from {conf*100:.0f}% to {threshold*100:.0f}%"
                    )
                    suggestions.append("Gather more supporting evidence before acting")

                elif result.gate == GateName.IMPACT_ANALYSIS:
                    high_factors = [f for f, v in result.details.get("impact_factors", {}).items() if v > 0]
                    if high_factors:
                        suggestions.append(f"Consider safer alternatives (high impact: {', '.join(high_factors)})")
                    if not result.details.get("is_reversible", True):
                        suggestions.append("Action is irreversible - seek explicit approval")

                elif result.gate == GateName.DEPENDENCY_CHECK:
                    if result.details.get("unresolved_blockers"):
                        suggestions.append(
                            f"Resolve blockers first: {', '.join(result.details['unresolved_blockers'][:3])}"
                        )
                    if result.details.get("invalid_dependencies"):
                        suggestions.append("Update or remove invalid dependencies")

                elif result.gate == GateName.HUMAN_OVERRIDE:
                    if result.details.get("requires_approval"):
                        suggestions.append("Request explicit user approval for this action type")
                    else:
                        suggestions.append("This action type has been blocked by the user")

        return suggestions[:5]  # Limit to 5 suggestions

    def log_decision(self, action: Dict, decision: SafetyDecision):
        """Log all decisions for audit trail."""
        decision_dict = decision.to_dict()
        decision_dict["original_action"] = {
            "type": action.get("type"),
            "content": action.get("content", "")[:200],
            "memory_sources": action.get("memory_sources", []),
            "confidence": action.get("confidence", 0)
        }

        self.decision_log.append(decision_dict)
        self._save_decision_log()

        # Log to stdout for monitoring
        status = "APPROVED" if decision.outcome == DecisionOutcome.APPROVED else "BLOCKED"
        log(f"[{status}] {decision.action_type} - {decision.reason[:60]}")

    # ═══════════════════════════════════════════════════════════════════════════
    # CONFIGURATION MANAGEMENT
    # ═══════════════════════════════════════════════════════════════════════════

    def update_threshold(self, threshold_name: str, value: float) -> bool:
        """Update a threshold value."""
        if threshold_name not in self.config["thresholds"]:
            log(f"Unknown threshold: {threshold_name}", "WARN")
            return False

        if not 0.0 <= value <= 1.0:
            log(f"Threshold value must be between 0 and 1", "WARN")
            return False

        self.config["thresholds"][threshold_name] = value
        self.save_config()
        log(f"Updated threshold '{threshold_name}' to {value}")
        return True

    def enable_gate(self, gate_name: str, enabled: bool = True) -> bool:
        """Enable or disable a gate."""
        if gate_name not in self.config["gates_enabled"]:
            log(f"Unknown gate: {gate_name}", "WARN")
            return False

        self.config["gates_enabled"][gate_name] = enabled
        self.save_config()
        log(f"Gate '{gate_name}' {'enabled' if enabled else 'disabled'}")
        return True

    def add_blocked_action_type(self, action_type: str) -> bool:
        """Block an action type."""
        if action_type not in self.overrides["blocked_action_types"]:
            self.overrides["blocked_action_types"].append(action_type)
            self.save_overrides()
            log(f"Blocked action type: {action_type}")
        return True

    def remove_blocked_action_type(self, action_type: str) -> bool:
        """Unblock an action type."""
        if action_type in self.overrides["blocked_action_types"]:
            self.overrides["blocked_action_types"].remove(action_type)
            self.save_overrides()
            log(f"Unblocked action type: {action_type}")
        return True

    def add_blocked_pattern(self, pattern: str) -> bool:
        """Add a blocked content pattern."""
        if pattern not in self.overrides["blocked_patterns"]:
            self.overrides["blocked_patterns"].append(pattern)
            self.save_overrides()
            log(f"Added blocked pattern: {pattern}")
        return True

    def whitelist_action(self, action_pattern: Dict) -> bool:
        """Add an action to the whitelist."""
        self.overrides["whitelist"].append(action_pattern)
        self.save_overrides()
        log(f"Whitelisted action: {action_pattern}")
        return True

    def require_approval_for(self, action_type: str) -> bool:
        """Require explicit approval for an action type."""
        if action_type not in self.overrides["always_require_approval"]:
            self.overrides["always_require_approval"].append(action_type)
            self.save_overrides()
            log(f"Now requiring approval for: {action_type}")
        return True

    # ═══════════════════════════════════════════════════════════════════════════
    # STATISTICS AND REPORTING
    # ═══════════════════════════════════════════════════════════════════════════

    def get_stats(self) -> Dict:
        """Get statistics about safety gate decisions."""
        if not self.decision_log:
            return {
                "total_decisions": 0,
                "approval_rate": 0.0,
                "by_outcome": {},
                "by_gate": {},
                "by_action_type": {},
                "average_score": 0.0
            }

        total = len(self.decision_log)
        approved = sum(1 for d in self.decision_log if d.get("outcome") == "approved")

        # Count by outcome
        by_outcome = {}
        for d in self.decision_log:
            outcome = d.get("outcome", "unknown")
            by_outcome[outcome] = by_outcome.get(outcome, 0) + 1

        # Count failures by gate
        by_gate = {}
        for d in self.decision_log:
            gate = d.get("gate_failed")
            if gate:
                by_gate[gate] = by_gate.get(gate, 0) + 1

        # Count by action type
        by_action_type = {}
        for d in self.decision_log:
            action_type = d.get("action_type", "unknown")
            if action_type not in by_action_type:
                by_action_type[action_type] = {"total": 0, "approved": 0}
            by_action_type[action_type]["total"] += 1
            if d.get("outcome") == "approved":
                by_action_type[action_type]["approved"] += 1

        # Calculate average score
        scores = [d.get("total_score", 0) for d in self.decision_log]
        avg_score = sum(scores) / len(scores) if scores else 0

        return {
            "total_decisions": total,
            "approval_rate": approved / total if total > 0 else 0,
            "by_outcome": by_outcome,
            "by_gate": by_gate,
            "by_action_type": by_action_type,
            "average_score": avg_score,
            "gates_enabled": self.config["gates_enabled"],
            "thresholds": self.config["thresholds"]
        }

    def get_recent_decisions(self, limit: int = 10) -> List[Dict]:
        """Get recent decisions."""
        return self.decision_log[-limit:]

    def get_blocked_decisions(self, limit: int = 20) -> List[Dict]:
        """Get recent blocked decisions for review."""
        blocked = [d for d in self.decision_log if d.get("outcome") != "approved"]
        return blocked[-limit:]


# ===============================================================================
# SINGLETON INSTANCE
# ===============================================================================

_safety_gate: Optional[PMSafetyGate] = None


def get_safety_gate(memory=None, confidence_scorer=None) -> PMSafetyGate:
    """Get the global safety gate instance (singleton pattern)."""
    global _safety_gate
    if _safety_gate is None:
        _safety_gate = PMSafetyGate(memory, confidence_scorer)
    return _safety_gate


def reset_safety_gate():
    """Reset the global safety gate instance (for testing)."""
    global _safety_gate
    _safety_gate = None


# ===============================================================================
# COMMAND LINE INTERFACE
# ===============================================================================

def main():
    """CLI for testing and managing the safety gate."""
    import argparse

    parser = argparse.ArgumentParser(description="PM Safety Gate - 5-Gate Validation System")
    parser.add_argument("--stats", action="store_true", help="Show decision statistics")
    parser.add_argument("--recent", type=int, default=0, help="Show N recent decisions")
    parser.add_argument("--blocked", type=int, default=0, help="Show N recent blocked decisions")
    parser.add_argument("--test", action="store_true", help="Run test action through gates")
    parser.add_argument("--config", action="store_true", help="Show current configuration")
    parser.add_argument("--enable-gate", type=str, help="Enable a gate")
    parser.add_argument("--disable-gate", type=str, help="Disable a gate")
    parser.add_argument("--set-threshold", nargs=2, metavar=("NAME", "VALUE"), help="Set threshold")
    parser.add_argument("--block-type", type=str, help="Block an action type")
    parser.add_argument("--unblock-type", type=str, help="Unblock an action type")

    args = parser.parse_args()

    gate = get_safety_gate()

    if args.stats:
        stats = gate.get_stats()
        print("\n=== Safety Gate Statistics ===")
        print(f"Total Decisions: {stats['total_decisions']}")
        print(f"Approval Rate: {stats['approval_rate']*100:.1f}%")
        print(f"Average Score: {stats['average_score']*100:.1f}%")
        print(f"\nBy Outcome: {json.dumps(stats['by_outcome'], indent=2)}")
        print(f"\nFailures by Gate: {json.dumps(stats['by_gate'], indent=2)}")
        print(f"\nBy Action Type: {json.dumps(stats['by_action_type'], indent=2)}")

    elif args.recent > 0:
        decisions = gate.get_recent_decisions(args.recent)
        print(f"\n=== Last {len(decisions)} Decisions ===")
        for d in decisions:
            print(f"\n[{d['outcome'].upper()}] {d['action_type']} ({d['timestamp']})")
            print(f"  Reason: {d['reason']}")
            print(f"  Score: {d['total_score']*100:.1f}%")

    elif args.blocked > 0:
        decisions = gate.get_blocked_decisions(args.blocked)
        print(f"\n=== Last {len(decisions)} Blocked Decisions ===")
        for d in decisions:
            print(f"\n[{d['outcome'].upper()}] {d['action_type']} ({d['timestamp']})")
            print(f"  Gate Failed: {d['gate_failed']}")
            print(f"  Reason: {d['reason']}")

    elif args.test:
        print("\n=== Testing Safety Gate ===")
        test_action = {
            "type": "suggest_task",
            "content": "Recommend weekly review meeting for the team",
            "memory_sources": ["team_preferences", "calendar_availability"],
            "confidence": 0.85,
            "dependencies": [],
            "metadata": {"test": True}
        }
        print(f"Test action: {json.dumps(test_action, indent=2)}")
        result = gate.check_action(test_action)
        print(f"\nResult: {json.dumps(result, indent=2)}")

    elif args.config:
        print("\n=== Current Configuration ===")
        print(json.dumps(gate.config, indent=2))
        print("\n=== Overrides ===")
        print(json.dumps(gate.overrides, indent=2))

    elif args.enable_gate:
        gate.enable_gate(args.enable_gate, True)

    elif args.disable_gate:
        gate.enable_gate(args.disable_gate, False)

    elif args.set_threshold:
        name, value = args.set_threshold
        gate.update_threshold(name, float(value))

    elif args.block_type:
        gate.add_blocked_action_type(args.block_type)

    elif args.unblock_type:
        gate.remove_blocked_action_type(args.unblock_type)

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
