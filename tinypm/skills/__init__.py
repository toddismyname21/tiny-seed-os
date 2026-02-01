"""
TinyPM Skills Registry - Modular Skill Architecture
====================================================

SOTA skill architecture based on OpenClaw research (2026).

This module provides:
1. Base TinyPMSkill class - Abstract interface for all skills
2. ActionClassifier - Risk-based security gate for actions
3. SkillRegistry - Discovery and registration of skills
4. SkillOrchestrator - Routes intents to skills, composes workflows

Architecture:
    User Intent -> Intent Parser -> Skill Orchestrator -> Skill(s) -> Result
                                          |
                                  ActionClassifier (security gate)

Risk Levels:
    - READ_ONLY: Auto-approve, no side effects (e.g., read emails, view tasks)
    - INTERNAL: Log + execute, internal modifications (e.g., create task, save draft)
    - EXTERNAL: Require approval, external communication (e.g., send email, post to API)
    - DANGEROUS: Multi-party approval, irreversible actions (e.g., delete data, send to all)

Created: 2026-01-30
Author: Builder Agent
"""

import json
import hashlib
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import (
    Any,
    Callable,
    Dict,
    List,
    Optional,
    Set,
    Tuple,
    Type,
    TypeVar,
    Union,
)
import traceback

# =============================================================================
# ENUMS AND CONSTANTS
# =============================================================================

class RiskLevel(Enum):
    """
    Risk classification for actions.

    Determines approval requirements before execution.
    """
    READ_ONLY = "read_only"      # No approval needed, auto-execute
    INTERNAL = "internal"        # Log and execute, internal changes only
    EXTERNAL = "external"        # Requires user approval, external side effects
    DANGEROUS = "dangerous"      # Multi-party approval, irreversible/high-impact


class SkillCategory(Enum):
    """Categories of skills for organization and discovery."""
    COMMUNICATION = "communication"   # Email, chat, notifications
    CALENDAR = "calendar"             # Scheduling, meetings
    TASK = "task"                     # Task management, board operations
    RESEARCH = "research"             # Web search, document analysis
    APPROVAL = "approval"             # Human-in-the-loop workflows
    INTEGRATION = "integration"       # External API connections
    ANALYTICS = "analytics"           # Reporting, metrics, insights
    SYSTEM = "system"                 # System operations, configuration


class ExecutionStatus(Enum):
    """Status of skill execution."""
    SUCCESS = "success"
    FAILED = "failed"
    PENDING_APPROVAL = "pending_approval"
    BLOCKED = "blocked"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class SkillParameter:
    """Definition of a skill parameter with validation."""
    name: str
    type: str  # "string", "integer", "boolean", "array", "object"
    description: str
    required: bool = True
    default: Any = None
    enum: Optional[List[str]] = None  # Allowed values
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    pattern: Optional[str] = None  # Regex pattern for strings

    def validate(self, value: Any) -> Tuple[bool, Optional[str]]:
        """
        Validate a value against this parameter definition.

        Returns:
            (is_valid, error_message)
        """
        if value is None:
            if self.required and self.default is None:
                return False, f"Parameter '{self.name}' is required"
            return True, None

        # Type validation
        type_map = {
            "string": str,
            "integer": int,
            "boolean": bool,
            "array": list,
            "object": dict,
        }
        expected_type = type_map.get(self.type)
        if expected_type and not isinstance(value, expected_type):
            return False, f"Parameter '{self.name}' must be {self.type}, got {type(value).__name__}"

        # Enum validation
        if self.enum and value not in self.enum:
            return False, f"Parameter '{self.name}' must be one of: {self.enum}"

        # Range validation for numbers
        if self.type == "integer" and value is not None:
            if self.min_value is not None and value < self.min_value:
                return False, f"Parameter '{self.name}' must be >= {self.min_value}"
            if self.max_value is not None and value > self.max_value:
                return False, f"Parameter '{self.name}' must be <= {self.max_value}"

        return True, None

    def to_json_schema(self) -> Dict:
        """Convert to JSON Schema format for AI discovery."""
        schema = {
            "type": self.type,
            "description": self.description,
        }
        if self.enum:
            schema["enum"] = self.enum
        if self.default is not None:
            schema["default"] = self.default
        if self.min_value is not None:
            schema["minimum"] = self.min_value
        if self.max_value is not None:
            schema["maximum"] = self.max_value
        if self.pattern:
            schema["pattern"] = self.pattern
        return schema


@dataclass
class SkillManifest:
    """
    Manifest for AI discovery of skill capabilities.

    This is what AI agents see when discovering available skills.
    """
    name: str
    description: str
    version: str
    category: SkillCategory
    triggers: List[str]  # Natural language triggers
    risk_level: RiskLevel
    parameters: List[SkillParameter]
    required_permissions: List[str]
    examples: List[Dict[str, str]]  # Example usages
    output_schema: Optional[Dict] = None
    rate_limit: Optional[int] = None  # Max calls per minute
    cooldown_seconds: Optional[int] = None  # Min time between calls

    def to_json_schema(self) -> Dict:
        """Convert to JSON Schema for AI tool use."""
        properties = {}
        required = []

        for param in self.parameters:
            properties[param.name] = param.to_json_schema()
            if param.required:
                required.append(param.name)

        return {
            "name": self.name,
            "description": self.description,
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required,
            },
        }

    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization."""
        return {
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "category": self.category.value,
            "triggers": self.triggers,
            "risk_level": self.risk_level.value,
            "parameters": [asdict(p) for p in self.parameters],
            "required_permissions": self.required_permissions,
            "examples": self.examples,
            "output_schema": self.output_schema,
            "rate_limit": self.rate_limit,
            "cooldown_seconds": self.cooldown_seconds,
        }


@dataclass
class SkillExecutionRequest:
    """Request to execute a skill."""
    skill_name: str
    parameters: Dict[str, Any]
    user_id: str
    request_id: str
    context: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    approval_status: Optional[str] = None  # "pending", "approved", "denied"
    approval_by: Optional[str] = None

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class SkillExecutionResult:
    """Result of skill execution."""
    request_id: str
    skill_name: str
    status: ExecutionStatus
    data: Any = None
    error: Optional[str] = None
    error_trace: Optional[str] = None
    execution_time_ms: int = 0
    risk_level: Optional[RiskLevel] = None
    requires_approval: bool = False
    approval_request_id: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict:
        d = asdict(self)
        d["status"] = self.status.value
        if self.risk_level:
            d["risk_level"] = self.risk_level.value
        return d

    @property
    def success(self) -> bool:
        return self.status == ExecutionStatus.SUCCESS


# =============================================================================
# BASE SKILL CLASS
# =============================================================================

class TinyPMSkill(ABC):
    """
    Base class for all TinyPM skills.

    Skills are modular units of functionality that can be:
    - Discovered by AI agents
    - Composed into workflows
    - Security-gated based on risk level

    Implementation requirements:
    1. Define name, description, triggers in class or __init__
    2. Define parameters with validation schemas
    3. Implement execute() method
    4. Set appropriate risk_level

    Example:
        class EmailReadSkill(TinyPMSkill):
            name = "read_emails"
            description = "Read unread emails from inbox"
            risk_level = RiskLevel.READ_ONLY

            def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
                emails = self.email_client.get_unread()
                return self.success_result(request, data=emails)
    """

    # Class-level attributes (override in subclass)
    name: str = "base_skill"
    description: str = "Base skill - not meant for direct use"
    version: str = "1.0.0"
    category: SkillCategory = SkillCategory.SYSTEM
    triggers: List[str] = []
    risk_level: RiskLevel = RiskLevel.READ_ONLY
    required_permissions: List[str] = []
    rate_limit: Optional[int] = None
    cooldown_seconds: Optional[int] = None

    def __init__(self):
        """Initialize skill with default state."""
        self._last_execution: Optional[datetime] = None
        self._execution_count: int = 0
        self._parameters: List[SkillParameter] = []
        self._examples: List[Dict[str, str]] = []
        self._output_schema: Optional[Dict] = None

        # Call subclass setup
        self._setup_parameters()
        self._setup_examples()

    def _setup_parameters(self):
        """Override to define skill parameters."""
        pass

    def _setup_examples(self):
        """Override to define example usages."""
        pass

    @property
    def manifest(self) -> SkillManifest:
        """
        Get skill manifest for AI discovery.

        This is automatically called by the SkillRegistry when
        discovering available skills.
        """
        return SkillManifest(
            name=self.name,
            description=self.description,
            version=self.version,
            category=self.category,
            triggers=self.triggers,
            risk_level=self.risk_level,
            parameters=self._parameters,
            required_permissions=self.required_permissions,
            examples=self._examples,
            output_schema=self._output_schema,
            rate_limit=self.rate_limit,
            cooldown_seconds=self.cooldown_seconds,
        )

    def add_parameter(
        self,
        name: str,
        type: str,
        description: str,
        required: bool = True,
        default: Any = None,
        enum: Optional[List[str]] = None,
        min_value: Optional[float] = None,
        max_value: Optional[float] = None,
        pattern: Optional[str] = None,
    ):
        """Add a parameter definition."""
        self._parameters.append(SkillParameter(
            name=name,
            type=type,
            description=description,
            required=required,
            default=default,
            enum=enum,
            min_value=min_value,
            max_value=max_value,
            pattern=pattern,
        ))

    def add_example(self, intent: str, parameters: Dict[str, Any], expected_outcome: str):
        """Add an example usage for AI learning."""
        self._examples.append({
            "intent": intent,
            "parameters": parameters,
            "expected_outcome": expected_outcome,
        })

    def validate_parameters(self, parameters: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Validate all parameters against schema.

        Returns:
            (is_valid, list_of_errors)
        """
        errors = []
        for param_def in self._parameters:
            value = parameters.get(param_def.name, param_def.default)
            is_valid, error = param_def.validate(value)
            if not is_valid:
                errors.append(error)
        return len(errors) == 0, errors

    def check_rate_limit(self) -> Tuple[bool, Optional[str]]:
        """
        Check if skill can be executed based on rate limits.

        Returns:
            (can_execute, reason_if_blocked)
        """
        if self.cooldown_seconds and self._last_execution:
            elapsed = (datetime.now() - self._last_execution).total_seconds()
            if elapsed < self.cooldown_seconds:
                remaining = self.cooldown_seconds - elapsed
                return False, f"Cooldown active: {remaining:.0f}s remaining"

        # Rate limit checking would need a time window tracker
        # Simplified for now - implement with sliding window if needed

        return True, None

    @abstractmethod
    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        """
        Execute the skill with given parameters.

        This is the main method to implement in subclasses.

        Args:
            request: SkillExecutionRequest with parameters and context

        Returns:
            SkillExecutionResult with status, data, or error
        """
        pass

    def pre_execute(self, request: SkillExecutionRequest) -> Optional[SkillExecutionResult]:
        """
        Pre-execution hook for validation, rate limiting, etc.

        Override to add custom pre-execution logic.
        Returns SkillExecutionResult if execution should be blocked.
        """
        # Validate parameters
        is_valid, errors = self.validate_parameters(request.parameters)
        if not is_valid:
            return SkillExecutionResult(
                request_id=request.request_id,
                skill_name=self.name,
                status=ExecutionStatus.FAILED,
                error=f"Parameter validation failed: {'; '.join(errors)}",
            )

        # Check rate limits
        can_execute, reason = self.check_rate_limit()
        if not can_execute:
            return SkillExecutionResult(
                request_id=request.request_id,
                skill_name=self.name,
                status=ExecutionStatus.BLOCKED,
                error=reason,
            )

        return None

    def post_execute(self, request: SkillExecutionRequest, result: SkillExecutionResult):
        """
        Post-execution hook for logging, metrics, etc.

        Override to add custom post-execution logic.
        """
        self._last_execution = datetime.now()
        self._execution_count += 1

    def success_result(
        self,
        request: SkillExecutionRequest,
        data: Any = None,
        execution_time_ms: int = 0,
    ) -> SkillExecutionResult:
        """Helper to create a success result."""
        return SkillExecutionResult(
            request_id=request.request_id,
            skill_name=self.name,
            status=ExecutionStatus.SUCCESS,
            data=data,
            execution_time_ms=execution_time_ms,
            risk_level=self.risk_level,
        )

    def error_result(
        self,
        request: SkillExecutionRequest,
        error: str,
        error_trace: Optional[str] = None,
    ) -> SkillExecutionResult:
        """Helper to create an error result."""
        return SkillExecutionResult(
            request_id=request.request_id,
            skill_name=self.name,
            status=ExecutionStatus.FAILED,
            error=error,
            error_trace=error_trace,
            risk_level=self.risk_level,
        )

    def pending_approval_result(
        self,
        request: SkillExecutionRequest,
        approval_request_id: str,
    ) -> SkillExecutionResult:
        """Helper to create a pending approval result."""
        return SkillExecutionResult(
            request_id=request.request_id,
            skill_name=self.name,
            status=ExecutionStatus.PENDING_APPROVAL,
            requires_approval=True,
            approval_request_id=approval_request_id,
            risk_level=self.risk_level,
        )


# =============================================================================
# ACTION CLASSIFIER (Security Gate)
# =============================================================================

@dataclass
class ActionClassification:
    """Classification result for an action."""
    risk_level: RiskLevel
    requires_approval: bool
    approval_type: Optional[str] = None  # "single", "multi_party"
    approvers_needed: int = 0
    reason: str = ""
    auto_approve: bool = False


class ActionClassifier:
    """
    Security gate that classifies actions by risk level.

    Determines approval requirements before skill execution.

    Risk Level Determination:
    1. Skill's declared risk_level is the baseline
    2. Context and parameters can escalate (never reduce) risk
    3. Certain patterns always escalate (mass operations, external comms)

    Approval Rules:
    - READ_ONLY: No approval, auto-execute
    - INTERNAL: Log and execute, no approval needed
    - EXTERNAL: User approval required
    - DANGEROUS: Multi-party approval required
    """

    # Keywords that escalate to EXTERNAL (matched as whole words only)
    EXTERNAL_KEYWORDS = {
        "send", "post", "publish", "share", "email", "notify",
        "submit", "broadcast", "announce"
    }

    # Keywords that escalate to DANGEROUS (matched as whole words only)
    # NOTE: "all" was intentionally REMOVED - it caused 60%+ false positives
    # on legitimate queries like "show all tasks", "list all emails", etc.
    # The word "all" by itself is not dangerous; dangerous patterns like
    # "delete_all" or "all_users" are handled separately in DANGEROUS_PATTERNS.
    DANGEROUS_KEYWORDS = {
        "delete", "remove", "destroy", "drop", "truncate",
        "everyone", "mass", "bulk", "force"
    }

    @classmethod
    def _word_boundary_match(cls, keyword: str, text: str) -> bool:
        """
        Check if keyword exists as a whole word in text.

        Uses regex word boundaries to prevent matching substrings.
        For example, "all" should NOT match "install" or "overall".

        Args:
            keyword: The keyword to search for
            text: The text to search in (should already be lowercase)

        Returns:
            True if keyword exists as a whole word in text
        """
        # Use word boundaries (\b) to match whole words only
        # re.escape handles any special regex characters in keywords
        pattern = r'\b' + re.escape(keyword) + r'\b'
        return bool(re.search(pattern, text))

    # Parameter patterns that escalate risk
    DANGEROUS_PATTERNS = {
        "all_users": RiskLevel.DANGEROUS,
        "delete_all": RiskLevel.DANGEROUS,
        "force": RiskLevel.EXTERNAL,
        "override": RiskLevel.EXTERNAL,
        "skip_validation": RiskLevel.DANGEROUS,
    }

    def __init__(self):
        self._classification_log: List[Dict] = []
        self._escalation_rules: Dict[str, RiskLevel] = {}
        self._approval_overrides: Dict[str, bool] = {}  # skill_name -> auto_approve

    def classify(
        self,
        skill: TinyPMSkill,
        request: SkillExecutionRequest,
    ) -> ActionClassification:
        """
        Classify an action and determine approval requirements.

        Args:
            skill: The skill being executed
            request: The execution request

        Returns:
            ActionClassification with risk level and approval requirements
        """
        # Start with skill's declared risk level
        risk_level = skill.risk_level
        escalation_reasons = []

        # Check for keyword escalation in skill name and description
        # Uses word boundary matching to prevent false positives
        # (e.g., "all" should not match "install" or "overall")
        skill_text = f"{skill.name} {skill.description}".lower()

        if any(self._word_boundary_match(kw, skill_text) for kw in self.DANGEROUS_KEYWORDS):
            if risk_level.value in ["read_only", "internal", "external"]:
                risk_level = RiskLevel.DANGEROUS
                escalation_reasons.append("dangerous keywords detected")
        elif any(self._word_boundary_match(kw, skill_text) for kw in self.EXTERNAL_KEYWORDS):
            if risk_level.value in ["read_only", "internal"]:
                risk_level = RiskLevel.EXTERNAL
                escalation_reasons.append("external communication keywords detected")

        # Check parameters for escalation patterns
        for param_name, param_value in request.parameters.items():
            pattern_key = f"{param_name}:{param_value}".lower() if isinstance(param_value, str) else param_name

            for pattern, escalate_to in self.DANGEROUS_PATTERNS.items():
                if pattern in pattern_key or pattern == str(param_value).lower():
                    if self._is_higher_risk(escalate_to, risk_level):
                        risk_level = escalate_to
                        escalation_reasons.append(f"parameter pattern '{pattern}' detected")

        # Check for mass operations
        for param_name, param_value in request.parameters.items():
            if isinstance(param_value, list) and len(param_value) > 10:
                if risk_level != RiskLevel.DANGEROUS:
                    risk_level = max(risk_level, RiskLevel.EXTERNAL, key=lambda r: self._risk_weight(r))
                    escalation_reasons.append(f"mass operation ({len(param_value)} items)")

        # Determine approval requirements
        requires_approval = risk_level in [RiskLevel.EXTERNAL, RiskLevel.DANGEROUS]
        approval_type = None
        approvers_needed = 0
        auto_approve = False

        if risk_level == RiskLevel.READ_ONLY:
            auto_approve = True
        elif risk_level == RiskLevel.INTERNAL:
            auto_approve = True  # Log but auto-approve
        elif risk_level == RiskLevel.EXTERNAL:
            approval_type = "single"
            approvers_needed = 1
        elif risk_level == RiskLevel.DANGEROUS:
            approval_type = "multi_party"
            approvers_needed = 2

        # Check for approval overrides
        if skill.name in self._approval_overrides:
            auto_approve = self._approval_overrides[skill.name]

        reason = "; ".join(escalation_reasons) if escalation_reasons else f"baseline risk level for {skill.name}"

        classification = ActionClassification(
            risk_level=risk_level,
            requires_approval=requires_approval,
            approval_type=approval_type,
            approvers_needed=approvers_needed,
            reason=reason,
            auto_approve=auto_approve,
        )

        # Log classification
        self._classification_log.append({
            "timestamp": datetime.now().isoformat(),
            "skill": skill.name,
            "request_id": request.request_id,
            "original_risk": skill.risk_level.value,
            "final_risk": risk_level.value,
            "requires_approval": requires_approval,
            "reason": reason,
        })

        return classification

    def _is_higher_risk(self, new: RiskLevel, current: RiskLevel) -> bool:
        """Check if new risk level is higher than current."""
        return self._risk_weight(new) > self._risk_weight(current)

    def _risk_weight(self, risk: RiskLevel) -> int:
        """Get numeric weight for risk level comparison."""
        weights = {
            RiskLevel.READ_ONLY: 1,
            RiskLevel.INTERNAL: 2,
            RiskLevel.EXTERNAL: 3,
            RiskLevel.DANGEROUS: 4,
        }
        return weights.get(risk, 0)

    def add_escalation_rule(self, pattern: str, escalate_to: RiskLevel):
        """Add custom escalation rule."""
        self._escalation_rules[pattern] = escalate_to

    def set_auto_approve(self, skill_name: str, auto_approve: bool = True):
        """Set auto-approve override for a skill."""
        self._approval_overrides[skill_name] = auto_approve

    def get_classification_log(self, limit: int = 100) -> List[Dict]:
        """Get recent classification log entries."""
        return self._classification_log[-limit:]


# =============================================================================
# SKILL REGISTRY
# =============================================================================

class SkillRegistry:
    """
    Registry for discovering and managing skills.

    Features:
    - Skill discovery and registration
    - Manifest generation for AI agents
    - Skill lookup by name, category, or trigger
    - Permission checking
    """

    _instance: Optional['SkillRegistry'] = None

    def __new__(cls):
        """Singleton pattern for global registry."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._skills: Dict[str, TinyPMSkill] = {}
        self._categories: Dict[SkillCategory, List[str]] = {}
        self._triggers: Dict[str, str] = {}  # trigger -> skill_name
        self._permissions: Dict[str, Set[str]] = {}  # skill_name -> required_permissions
        self._initialized = True

    def register(self, skill: TinyPMSkill) -> bool:
        """
        Register a skill in the registry.

        Args:
            skill: The skill instance to register

        Returns:
            True if registered successfully, False if already exists
        """
        if skill.name in self._skills:
            print(f"[SkillRegistry] Warning: Skill '{skill.name}' already registered, skipping")
            return False

        self._skills[skill.name] = skill

        # Index by category
        if skill.category not in self._categories:
            self._categories[skill.category] = []
        self._categories[skill.category].append(skill.name)

        # Index triggers
        for trigger in skill.triggers:
            trigger_lower = trigger.lower()
            if trigger_lower in self._triggers:
                print(f"[SkillRegistry] Warning: Trigger '{trigger}' already mapped to '{self._triggers[trigger_lower]}'")
            self._triggers[trigger_lower] = skill.name

        # Index permissions
        self._permissions[skill.name] = set(skill.required_permissions)

        print(f"[SkillRegistry] Registered skill: {skill.name} ({skill.category.value})")
        return True

    def unregister(self, skill_name: str) -> bool:
        """Remove a skill from the registry."""
        if skill_name not in self._skills:
            return False

        skill = self._skills[skill_name]

        # Remove from category index
        if skill.category in self._categories:
            self._categories[skill.category].remove(skill_name)

        # Remove triggers
        for trigger in skill.triggers:
            trigger_lower = trigger.lower()
            if self._triggers.get(trigger_lower) == skill_name:
                del self._triggers[trigger_lower]

        # Remove permissions
        if skill_name in self._permissions:
            del self._permissions[skill_name]

        del self._skills[skill_name]
        return True

    def get(self, skill_name: str) -> Optional[TinyPMSkill]:
        """Get a skill by name."""
        return self._skills.get(skill_name)

    def get_by_trigger(self, trigger: str) -> Optional[TinyPMSkill]:
        """Get a skill by trigger phrase."""
        skill_name = self._triggers.get(trigger.lower())
        if skill_name:
            return self._skills.get(skill_name)
        return None

    def find_by_trigger(self, text: str) -> List[Tuple[TinyPMSkill, str]]:
        """
        Find skills that match triggers in text.

        Returns list of (skill, matched_trigger) tuples.
        """
        matches = []
        text_lower = text.lower()

        for trigger, skill_name in self._triggers.items():
            if trigger in text_lower:
                skill = self._skills.get(skill_name)
                if skill:
                    matches.append((skill, trigger))

        return matches

    def get_by_category(self, category: SkillCategory) -> List[TinyPMSkill]:
        """Get all skills in a category."""
        skill_names = self._categories.get(category, [])
        return [self._skills[name] for name in skill_names if name in self._skills]

    def list_all(self) -> List[TinyPMSkill]:
        """Get all registered skills."""
        return list(self._skills.values())

    def list_names(self) -> List[str]:
        """Get all skill names."""
        return list(self._skills.keys())

    def get_manifests(self) -> List[Dict]:
        """Get manifests for all skills (for AI discovery)."""
        return [skill.manifest.to_dict() for skill in self._skills.values()]

    def get_json_schemas(self) -> List[Dict]:
        """Get JSON schemas for all skills (for AI tool use)."""
        return [skill.manifest.to_json_schema() for skill in self._skills.values()]

    def check_permissions(
        self,
        skill_name: str,
        user_permissions: Set[str],
    ) -> Tuple[bool, List[str]]:
        """
        Check if user has required permissions for a skill.

        Returns:
            (has_permission, missing_permissions)
        """
        required = self._permissions.get(skill_name, set())
        missing = required - user_permissions
        return len(missing) == 0, list(missing)

    def to_dict(self) -> Dict:
        """Serialize registry to dictionary."""
        return {
            "skills": self.get_manifests(),
            "categories": {cat.value: names for cat, names in self._categories.items()},
            "triggers": dict(self._triggers),
        }


# =============================================================================
# SKILL ORCHESTRATOR
# =============================================================================

class SkillOrchestrator:
    """
    Orchestrates skill discovery, routing, and execution.

    Features:
    - Routes user intents to appropriate skills
    - Composes multi-skill workflows
    - Handles approval workflows
    - Manages execution context

    Architecture:
        User Intent -> Intent Parser -> Orchestrator -> ActionClassifier -> Skill
                                            |                   |
                                      Approval Manager    Permission Check
    """

    def __init__(self, user_id: str = "default"):
        self.user_id = user_id
        self.registry = SkillRegistry()
        self.classifier = ActionClassifier()

        # Execution state
        self._pending_approvals: Dict[str, Dict] = {}  # approval_id -> request_data
        self._execution_history: List[Dict] = []
        self._request_counter: int = 0

        # User permissions (would come from auth system)
        self._user_permissions: Set[str] = set()

    def discover_skills(self) -> List[Dict]:
        """
        Get all available skills for AI discovery.

        Returns list of skill manifests suitable for AI tool use.
        """
        return self.registry.get_json_schemas()

    def route_intent(self, intent_text: str, context: Dict = None) -> List[TinyPMSkill]:
        """
        Route a natural language intent to matching skills.

        Args:
            intent_text: Natural language description of desired action
            context: Additional context for routing

        Returns:
            List of matching skills, ordered by relevance
        """
        matches = self.registry.find_by_trigger(intent_text)

        # Sort by specificity (longer trigger = more specific)
        matches.sort(key=lambda m: len(m[1]), reverse=True)

        return [skill for skill, trigger in matches]

    def execute(
        self,
        skill_name: str,
        parameters: Dict[str, Any],
        context: Dict[str, Any] = None,
    ) -> SkillExecutionResult:
        """
        Execute a skill with approval workflow.

        Flow:
        1. Get skill from registry
        2. Check permissions
        3. Classify action risk
        4. Request approval if needed
        5. Execute skill
        6. Log result

        Args:
            skill_name: Name of skill to execute
            parameters: Skill parameters
            context: Execution context

        Returns:
            SkillExecutionResult
        """
        import time
        start_time = time.time()

        # Generate request ID
        self._request_counter += 1
        request_id = f"req_{self.user_id}_{self._request_counter}_{int(time.time())}"

        # Get skill
        skill = self.registry.get(skill_name)
        if not skill:
            return SkillExecutionResult(
                request_id=request_id,
                skill_name=skill_name,
                status=ExecutionStatus.FAILED,
                error=f"Skill '{skill_name}' not found",
            )

        # Create request
        request = SkillExecutionRequest(
            skill_name=skill_name,
            parameters=parameters,
            user_id=self.user_id,
            request_id=request_id,
            context=context or {},
        )

        # Check permissions
        has_permission, missing = self.registry.check_permissions(
            skill_name, self._user_permissions
        )
        if not has_permission:
            return SkillExecutionResult(
                request_id=request_id,
                skill_name=skill_name,
                status=ExecutionStatus.BLOCKED,
                error=f"Missing permissions: {', '.join(missing)}",
            )

        # Classify action
        classification = self.classifier.classify(skill, request)

        # Handle approval workflow
        if classification.requires_approval and not classification.auto_approve:
            if request.approval_status != "approved":
                # Store pending approval
                approval_id = self._create_approval_request(request, classification)
                return skill.pending_approval_result(request, approval_id)

        # Pre-execution checks
        pre_result = skill.pre_execute(request)
        if pre_result:
            return pre_result

        # Execute skill
        try:
            result = skill.execute(request)
            result.execution_time_ms = int((time.time() - start_time) * 1000)
            result.risk_level = classification.risk_level
        except Exception as e:
            result = skill.error_result(
                request,
                error=str(e),
                error_trace=traceback.format_exc(),
            )

        # Post-execution
        skill.post_execute(request, result)

        # Log execution
        self._log_execution(request, result, classification)

        return result

    def execute_workflow(
        self,
        skills: List[Tuple[str, Dict[str, Any]]],
        context: Dict[str, Any] = None,
    ) -> List[SkillExecutionResult]:
        """
        Execute multiple skills in sequence.

        Each skill receives the accumulated context from previous skills.
        Stops on first error unless continue_on_error is set.

        Args:
            skills: List of (skill_name, parameters) tuples
            context: Initial context

        Returns:
            List of results for each skill
        """
        results = []
        workflow_context = context.copy() if context else {}

        for skill_name, parameters in skills:
            result = self.execute(skill_name, parameters, workflow_context)
            results.append(result)

            if result.success and result.data:
                # Pass data to next skill
                workflow_context[f"{skill_name}_result"] = result.data
            elif not result.success:
                # Stop on error
                break

        return results

    def approve_request(
        self,
        approval_id: str,
        approver_id: str,
        approved: bool,
    ) -> Optional[SkillExecutionResult]:
        """
        Approve or deny a pending request.

        Args:
            approval_id: The approval request ID
            approver_id: ID of the approver
            approved: True to approve, False to deny

        Returns:
            Execution result if approved and executed, None otherwise
        """
        if approval_id not in self._pending_approvals:
            return None

        approval_data = self._pending_approvals[approval_id]
        request_data = approval_data["request"]

        if approved:
            # Execute the skill
            request = SkillExecutionRequest(
                skill_name=request_data["skill_name"],
                parameters=request_data["parameters"],
                user_id=request_data["user_id"],
                request_id=request_data["request_id"],
                context=request_data.get("context", {}),
                approval_status="approved",
                approval_by=approver_id,
            )

            skill = self.registry.get(request.skill_name)
            if skill:
                result = skill.execute(request)
                del self._pending_approvals[approval_id]
                return result
        else:
            # Denied
            del self._pending_approvals[approval_id]

        return None

    def get_pending_approvals(self) -> List[Dict]:
        """Get all pending approval requests."""
        return [
            {
                "approval_id": aid,
                "skill_name": data["request"]["skill_name"],
                "parameters": data["request"]["parameters"],
                "risk_level": data["classification"]["risk_level"],
                "reason": data["classification"]["reason"],
                "timestamp": data["timestamp"],
            }
            for aid, data in self._pending_approvals.items()
        ]

    def set_user_permissions(self, permissions: Set[str]):
        """Set user permissions for skill execution."""
        self._user_permissions = permissions

    def _create_approval_request(
        self,
        request: SkillExecutionRequest,
        classification: ActionClassification,
    ) -> str:
        """Create a pending approval request."""
        approval_id = f"apr_{hashlib.md5(request.request_id.encode()).hexdigest()[:8]}"

        self._pending_approvals[approval_id] = {
            "request": request.to_dict(),
            "classification": asdict(classification),
            "timestamp": datetime.now().isoformat(),
            "approvers": [],
            "approvers_needed": classification.approvers_needed,
        }

        return approval_id

    def _log_execution(
        self,
        request: SkillExecutionRequest,
        result: SkillExecutionResult,
        classification: ActionClassification,
    ):
        """Log skill execution for audit trail."""
        self._execution_history.append({
            "timestamp": datetime.now().isoformat(),
            "request_id": request.request_id,
            "skill_name": request.skill_name,
            "user_id": request.user_id,
            "parameters": request.parameters,
            "status": result.status.value,
            "risk_level": classification.risk_level.value,
            "execution_time_ms": result.execution_time_ms,
            "error": result.error,
        })

        # Keep last 1000 entries
        if len(self._execution_history) > 1000:
            self._execution_history = self._execution_history[-1000:]

    def get_execution_history(self, limit: int = 100) -> List[Dict]:
        """Get recent execution history."""
        return self._execution_history[-limit:]


# =============================================================================
# MODULE EXPORTS
# =============================================================================

def get_skill_registry() -> SkillRegistry:
    """Get the global skill registry singleton."""
    return SkillRegistry()


def get_skill_orchestrator(user_id: str = "default") -> SkillOrchestrator:
    """Create a new skill orchestrator for a user."""
    return SkillOrchestrator(user_id)


__all__ = [
    # Enums
    "RiskLevel",
    "SkillCategory",
    "ExecutionStatus",
    # Data classes
    "SkillParameter",
    "SkillManifest",
    "SkillExecutionRequest",
    "SkillExecutionResult",
    "ActionClassification",
    # Core classes
    "TinyPMSkill",
    "ActionClassifier",
    "SkillRegistry",
    "SkillOrchestrator",
    # Factory functions
    "get_skill_registry",
    "get_skill_orchestrator",
]
