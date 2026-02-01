"""
TinyPM Skill Orchestrator - Unified Skill Execution Engine
=========================================================

The SkillOrchestrator ties together:
1. Skill discovery and registration
2. Intent routing to skills
3. Action classification and security
4. Approval workflow management
5. Multi-skill workflow composition

This module extends the base classes from __init__.py with higher-level
orchestration capabilities.

Architecture:
    User Intent -> Intent Parser -> Skill Orchestrator -> Skill(s) -> Result
                                          |
                                  ActionClassifier (security gate)
                                          |
                                  Approval Manager

Created: 2026-01-30
Author: Builder Agent
"""

import sys
import re
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from skills import (
    TinyPMSkill,
    RiskLevel,
    SkillCategory,
    SkillExecutionRequest,
    SkillExecutionResult,
    ExecutionStatus,
    ActionClassifier,
    ActionClassification,
    SkillRegistry,
    get_skill_registry,
    get_skill_orchestrator,
)


# =============================================================================
# INTENT PARSER
# =============================================================================

class IntentParser:
    """
    Parses natural language intents to identify skills and parameters.

    Uses a combination of:
    1. Trigger word matching (fast, deterministic)
    2. Pattern extraction for parameters
    3. Confidence scoring

    For production, this would be enhanced with:
    - ML-based intent classification
    - Entity extraction
    - Context-aware disambiguation
    """

    # Common parameter patterns
    PATTERNS = {
        "email_id": r"email[_\s]?(?:id)?[:\s]+([a-zA-Z0-9]+)",
        "task_id": r"(?:task|TPM)[_\s-]?(\d+)",
        "time_hours": r"(?:next|within|for)\s+(\d+)\s+hours?",
        "count": r"(?:top|first|last|max)\s+(\d+)",
        "priority": r"(low|medium|high|critical)\s+priority",
        "status": r"(?:status|mark\s+as)\s+(pending|in_progress|done|blocked)",
    }

    def __init__(self, registry: SkillRegistry):
        self.registry = registry
        self._build_trigger_index()

    def _build_trigger_index(self):
        """Build an index of triggers to skills."""
        self._trigger_index = {}
        for skill in self.registry.list_all():
            for trigger in skill.triggers:
                # Store trigger with skill reference
                trigger_lower = trigger.lower()
                if trigger_lower not in self._trigger_index:
                    self._trigger_index[trigger_lower] = []
                self._trigger_index[trigger_lower].append(skill)

    def parse(self, text: str, context: Dict = None) -> List[Dict]:
        """
        Parse an intent text and return matching skills with parameters.

        Args:
            text: Natural language text
            context: Optional context for disambiguation

        Returns:
            List of {skill, parameters, confidence} dicts
        """
        text_lower = text.lower()
        matches = []

        # Find trigger matches
        for trigger, skills in self._trigger_index.items():
            if trigger in text_lower:
                for skill in skills:
                    params = self._extract_parameters(text, skill)
                    confidence = self._calculate_confidence(text_lower, trigger, skill)

                    matches.append({
                        "skill": skill,
                        "skill_name": skill.name,
                        "trigger": trigger,
                        "parameters": params,
                        "confidence": confidence,
                    })

        # Sort by confidence
        matches.sort(key=lambda x: x["confidence"], reverse=True)

        # Deduplicate skills (keep highest confidence)
        seen_skills = set()
        unique_matches = []
        for match in matches:
            if match["skill_name"] not in seen_skills:
                seen_skills.add(match["skill_name"])
                unique_matches.append(match)

        return unique_matches

    def _extract_parameters(self, text: str, skill: TinyPMSkill) -> Dict[str, Any]:
        """Extract parameters from text for a given skill."""
        params = {}

        # Apply pattern matching
        for param_name, pattern in self.PATTERNS.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                value = match.group(1)
                # Convert to int if numeric
                if value.isdigit():
                    value = int(value)
                params[param_name] = value

        # Look for skill-specific parameter hints
        # This is a simplified version - production would use NER
        text_lower = text.lower()

        # Extract numbers that might be limits
        numbers = re.findall(r"\b(\d+)\b", text)
        if numbers:
            # Use last number as potential limit/count
            params.setdefault("limit", int(numbers[-1]))
            params.setdefault("max_results", int(numbers[-1]))

        # Extract quoted strings
        quoted = re.findall(r'"([^"]+)"', text)
        if quoted:
            # First quoted string might be title/description
            if skill.name in ["create_task", "update_task"]:
                params["title"] = quoted[0]
                if len(quoted) > 1:
                    params["description"] = quoted[1]

        return params

    def _calculate_confidence(self, text: str, trigger: str, skill: TinyPMSkill) -> float:
        """
        Calculate confidence score for a match.

        Factors:
        - Trigger length (longer = more specific)
        - Position in text (earlier = higher intent)
        - Skill description keyword overlap
        """
        # Base confidence from trigger length
        confidence = min(len(trigger) / 20, 0.5)  # Max 0.5 from length

        # Bonus for trigger position (prefer early matches)
        position = text.find(trigger.lower())
        if position >= 0:
            position_score = max(0, 0.2 - (position / len(text) * 0.2))
            confidence += position_score

        # Bonus for keyword overlap with description
        desc_words = set(skill.description.lower().split())
        text_words = set(text.split())
        overlap = len(desc_words & text_words)
        confidence += min(overlap * 0.05, 0.2)

        # Bonus for exact category match in text
        category_name = skill.category.value.replace("_", " ")
        if category_name in text.lower():
            confidence += 0.1

        return min(confidence, 1.0)


# =============================================================================
# UNIFIED SKILL ORCHESTRATOR
# =============================================================================

class UnifiedSkillOrchestrator:
    """
    Production-ready skill orchestrator with full feature set.

    Features:
    1. Intent parsing and skill routing
    2. Parameter extraction and validation
    3. Risk classification and approval workflow
    4. Multi-skill workflow execution
    5. Execution history and audit logging
    6. Permission management
    """

    def __init__(self, user_id: str = "default"):
        self.user_id = user_id
        self.registry = get_skill_registry()
        self.parser = IntentParser(self.registry)
        self.classifier = ActionClassifier()

        # User state
        self._user_permissions: set = set()
        self._session_context: Dict = {}

        # Execution tracking
        self._execution_history: List[Dict] = []
        self._pending_approvals: Dict[str, Dict] = {}
        self._request_counter = 0

    def load_all_skills(self):
        """Load all skill modules to ensure registration."""
        import importlib

        skill_modules = [
            "skills.email_skill",
            "skills.calendar_skill",
            "skills.task_skill",
            "skills.approval_skill",
        ]

        for module_name in skill_modules:
            try:
                importlib.import_module(module_name)
                print(f"[Orchestrator] Loaded {module_name}")
            except ImportError as e:
                print(f"[Orchestrator] Could not load {module_name}: {e}")

        # Rebuild parser index after loading
        self.parser._build_trigger_index()

    def get_available_skills(self) -> List[Dict]:
        """Get all available skills with their manifests."""
        return self.registry.get_manifests()

    def get_skill_schemas(self) -> List[Dict]:
        """Get JSON schemas for all skills (for AI tool use)."""
        return self.registry.get_json_schemas()

    def parse_intent(self, text: str) -> List[Dict]:
        """
        Parse natural language to identify matching skills.

        Returns list of matches with confidence scores.
        """
        return self.parser.parse(text, self._session_context)

    def route_and_execute(
        self,
        text: str,
        additional_params: Dict = None,
    ) -> SkillExecutionResult:
        """
        Parse intent, route to skill, and execute.

        This is the main entry point for natural language commands.

        Args:
            text: Natural language command
            additional_params: Additional parameters to merge

        Returns:
            SkillExecutionResult
        """
        # Parse intent
        matches = self.parse_intent(text)

        if not matches:
            return SkillExecutionResult(
                request_id=self._generate_request_id(),
                skill_name="unknown",
                status=ExecutionStatus.FAILED,
                error=f"No matching skill found for: {text}",
            )

        # Take highest confidence match
        best_match = matches[0]
        skill = best_match["skill"]
        params = best_match["parameters"]

        # Merge additional params
        if additional_params:
            params.update(additional_params)

        # Execute
        return self.execute(skill.name, params)

    def execute(
        self,
        skill_name: str,
        parameters: Dict[str, Any],
        context: Dict[str, Any] = None,
        skip_approval: bool = False,
    ) -> SkillExecutionResult:
        """
        Execute a skill with full approval workflow.

        Args:
            skill_name: Name of skill to execute
            parameters: Skill parameters
            context: Execution context
            skip_approval: Skip approval (only for pre-approved requests)

        Returns:
            SkillExecutionResult
        """
        import time
        start_time = time.time()

        request_id = self._generate_request_id()

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
            context={**(context or {}), **self._session_context},
        )

        # Check permissions
        has_perm, missing = self.registry.check_permissions(
            skill_name, self._user_permissions
        )
        if not has_perm and self._user_permissions:  # Only enforce if permissions are set
            return SkillExecutionResult(
                request_id=request_id,
                skill_name=skill_name,
                status=ExecutionStatus.BLOCKED,
                error=f"Missing permissions: {', '.join(missing)}",
            )

        # Classify action
        classification = self.classifier.classify(skill, request)

        # Handle approval workflow
        if classification.requires_approval and not classification.auto_approve and not skip_approval:
            approval_id = self._create_approval_request(request, classification)
            result = skill.pending_approval_result(request, approval_id)
            self._log_execution(request, result, classification)
            return result

        # Pre-execution checks
        pre_result = skill.pre_execute(request)
        if pre_result:
            return pre_result

        # Execute
        try:
            result = skill.execute(request)
            result.execution_time_ms = int((time.time() - start_time) * 1000)
            result.risk_level = classification.risk_level
        except Exception as e:
            import traceback
            result = skill.error_result(
                request,
                error=str(e),
                error_trace=traceback.format_exc(),
            )

        # Post-execution
        skill.post_execute(request, result)
        self._log_execution(request, result, classification)

        return result

    def execute_workflow(
        self,
        steps: List[Tuple[str, Dict[str, Any]]],
        context: Dict[str, Any] = None,
        stop_on_error: bool = True,
    ) -> List[SkillExecutionResult]:
        """
        Execute multiple skills in sequence.

        Each skill receives the accumulated context from previous skills.

        Args:
            steps: List of (skill_name, parameters) tuples
            context: Initial context
            stop_on_error: Stop execution on first error

        Returns:
            List of results for each skill
        """
        results = []
        workflow_context = {**(context or {})}

        for skill_name, parameters in steps:
            result = self.execute(skill_name, parameters, workflow_context)
            results.append(result)

            if result.success and result.data:
                # Pass data to next skill
                workflow_context[f"{skill_name}_result"] = result.data
            elif not result.success and stop_on_error:
                break

        return results

    def approve_pending(
        self,
        approval_id: str,
        approver_id: str = None,
    ) -> Optional[SkillExecutionResult]:
        """
        Approve a pending request and execute it.

        Args:
            approval_id: The approval ID
            approver_id: ID of approver (defaults to current user)

        Returns:
            Execution result if approved, None if not found
        """
        if approval_id not in self._pending_approvals:
            return None

        approval_data = self._pending_approvals[approval_id]
        request_data = approval_data["request"]

        # Execute with skip_approval=True since it's now approved
        result = self.execute(
            request_data["skill_name"],
            request_data["parameters"],
            request_data.get("context", {}),
            skip_approval=True,
        )

        # Clean up
        del self._pending_approvals[approval_id]

        return result

    def deny_pending(
        self,
        approval_id: str,
        reason: str = "Denied",
    ) -> bool:
        """Deny a pending request."""
        if approval_id in self._pending_approvals:
            del self._pending_approvals[approval_id]
            return True
        return False

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

    def set_user_permissions(self, permissions: set):
        """Set user permissions."""
        self._user_permissions = permissions

    def grant_permission(self, permission: str):
        """Grant a single permission."""
        self._user_permissions.add(permission)

    def grant_all_permissions(self):
        """Grant all permissions (for testing/admin)."""
        # Collect all permissions from all skills
        for skill in self.registry.list_all():
            for perm in skill.required_permissions:
                self._user_permissions.add(perm)

    def set_session_context(self, context: Dict):
        """Set session-level context passed to all executions."""
        self._session_context = context

    def update_session_context(self, updates: Dict):
        """Update session context with new values."""
        self._session_context.update(updates)

    def get_execution_history(self, limit: int = 100) -> List[Dict]:
        """Get recent execution history."""
        return self._execution_history[-limit:]

    def get_skill_by_category(self, category: SkillCategory) -> List[TinyPMSkill]:
        """Get skills by category."""
        return self.registry.get_by_category(category)

    def _generate_request_id(self) -> str:
        """Generate unique request ID."""
        import time
        self._request_counter += 1
        return f"req_{self.user_id}_{self._request_counter}_{int(time.time())}"

    def _create_approval_request(
        self,
        request: SkillExecutionRequest,
        classification: ActionClassification,
    ) -> str:
        """Create a pending approval request."""
        import hashlib
        approval_id = f"apr_{hashlib.md5(request.request_id.encode()).hexdigest()[:8]}"

        self._pending_approvals[approval_id] = {
            "request": request.to_dict(),
            "classification": {
                "risk_level": classification.risk_level.value,
                "requires_approval": classification.requires_approval,
                "approval_type": classification.approval_type,
                "approvers_needed": classification.approvers_needed,
                "reason": classification.reason,
            },
            "timestamp": datetime.now().isoformat(),
        }

        return approval_id

    def _log_execution(
        self,
        request: SkillExecutionRequest,
        result: SkillExecutionResult,
        classification: ActionClassification,
    ):
        """Log execution for audit trail."""
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


# =============================================================================
# FACTORY FUNCTIONS
# =============================================================================

_orchestrator_instances: Dict[str, UnifiedSkillOrchestrator] = {}


def get_unified_orchestrator(user_id: str = "default") -> UnifiedSkillOrchestrator:
    """Get or create a unified orchestrator for a user."""
    if user_id not in _orchestrator_instances:
        orchestrator = UnifiedSkillOrchestrator(user_id)
        orchestrator.load_all_skills()
        _orchestrator_instances[user_id] = orchestrator
    return _orchestrator_instances[user_id]


def reset_orchestrator(user_id: str = "default"):
    """Reset the orchestrator for a user (for testing)."""
    if user_id in _orchestrator_instances:
        del _orchestrator_instances[user_id]


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """CLI interface for testing the orchestrator."""
    import sys

    print("=" * 60)
    print("TinyPM Skill Orchestrator")
    print("=" * 60)

    orchestrator = get_unified_orchestrator()
    orchestrator.grant_all_permissions()

    # List available skills
    print(f"\nAvailable skills: {len(orchestrator.registry.list_names())}")
    for name in sorted(orchestrator.registry.list_names()):
        skill = orchestrator.registry.get(name)
        print(f"  - {name}: {skill.description[:50]}...")

    if len(sys.argv) > 1:
        # Execute command from args
        command = " ".join(sys.argv[1:])
        print(f"\nExecuting: {command}")

        matches = orchestrator.parse_intent(command)
        if matches:
            print(f"\nMatched skills:")
            for m in matches[:3]:
                print(f"  - {m['skill_name']} (confidence: {m['confidence']:.2f})")

        result = orchestrator.route_and_execute(command)
        print(f"\nResult:")
        print(f"  Status: {result.status.value}")
        if result.error:
            print(f"  Error: {result.error}")
        if result.data:
            import json
            print(f"  Data: {json.dumps(result.data, indent=2, default=str)[:500]}")
    else:
        print("\nUsage: python orchestrator.py <natural language command>")
        print("\nExamples:")
        print("  python orchestrator.py 'list all pending tasks'")
        print("  python orchestrator.py 'show my upcoming meetings'")
        print("  python orchestrator.py 'check urgent emails'")


if __name__ == "__main__":
    main()
