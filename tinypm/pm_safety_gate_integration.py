#!/usr/bin/env python3
"""
===============================================================================
PM SAFETY GATE INTEGRATION - Connect Safety Gate to PM Orchestrator
===============================================================================

This module provides integration utilities to connect the 5-gate safety system
with the PM Orchestrator. It wraps actions and suggestions with safety checks.

Usage in pm_orchestrator.py:

    from pm_safety_gate_integration import (
        SafetyGatedAction,
        check_suggestion_safety,
        check_action_safety,
        get_safety_gate_instance
    )

    # Check a suggestion before showing to user
    result = check_suggestion_safety(
        suggestion_type="task_reminder",
        content="Remind about weekly review",
        confidence=0.85,
        memory_sources=["calendar_preference"]
    )

    if result["approved"]:
        # Show suggestion to user
        pass
    else:
        # Log blocked suggestion
        pass

    # Check an action before executing
    result = check_action_safety(
        action_type="send_email",
        content="Send reminder to team",
        confidence=0.90,
        dependencies=["task_123"]
    )
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional
import json
import functools

# Import the core safety gate
from pm_safety_gate import (
    PMSafetyGate,
    get_safety_gate,
    GateName,
    ActionRiskLevel,
    DecisionOutcome,
    SafetyDecision,
    log
)


# ===============================================================================
# SAFE ACTION WRAPPER
# ===============================================================================

@dataclass
class SafetyGatedAction:
    """
    A wrapper for actions that must pass through the safety gate.

    Usage:
        action = SafetyGatedAction(
            action_type="create_task",
            content="Create task for team review",
            confidence=0.85,
            memory_sources=["team_preferences"],
            on_approved=lambda: create_task(...),
            on_blocked=lambda reason: log_blocked(reason)
        )
        result = action.execute()
    """
    action_type: str
    content: str
    confidence: float = 0.8
    memory_sources: List[str] = None
    dependencies: List[str] = None
    blockers: List[str] = None
    prerequisites: List[str] = None
    metadata: Dict[str, Any] = None
    on_approved: Optional[Callable] = None
    on_blocked: Optional[Callable[[str], None]] = None
    on_needs_clarification: Optional[Callable[[str, List[str]], None]] = None
    on_needs_approval: Optional[Callable[[str], None]] = None

    def __post_init__(self):
        if self.memory_sources is None:
            self.memory_sources = []
        if self.dependencies is None:
            self.dependencies = []
        if self.blockers is None:
            self.blockers = []
        if self.prerequisites is None:
            self.prerequisites = []
        if self.metadata is None:
            self.metadata = {}

    def to_action_dict(self) -> Dict:
        """Convert to action dict for safety gate."""
        return {
            "type": self.action_type,
            "content": self.content,
            "confidence": self.confidence,
            "memory_sources": self.memory_sources,
            "dependencies": self.dependencies,
            "blockers": self.blockers,
            "prerequisites": self.prerequisites,
            "metadata": self.metadata
        }

    def execute(self, gate: PMSafetyGate = None) -> Dict:
        """
        Execute the action through the safety gate.

        Returns:
            Safety check result dict with:
            - approved: bool
            - outcome: str
            - executed: bool - whether action was executed
            - result: Any - result from on_approved if executed
        """
        if gate is None:
            gate = get_safety_gate()

        # Check through safety gate
        check_result = gate.check_action(self.to_action_dict())

        result = {
            **check_result,
            "executed": False,
            "result": None
        }

        outcome = check_result.get("outcome", "blocked")

        if outcome == "approved":
            if self.on_approved:
                try:
                    result["result"] = self.on_approved()
                    result["executed"] = True
                except Exception as e:
                    result["executed"] = False
                    result["execution_error"] = str(e)
                    log(f"Action execution error: {e}", "ERROR")
            else:
                result["executed"] = True

        elif outcome == "needs_clarification":
            if self.on_needs_clarification:
                suggestions = check_result.get("suggestions", [])
                self.on_needs_clarification(check_result.get("reason", ""), suggestions)

        elif outcome == "needs_approval":
            if self.on_needs_approval:
                self.on_needs_approval(check_result.get("reason", ""))

        else:  # blocked
            if self.on_blocked:
                self.on_blocked(check_result.get("reason", "Blocked by safety gate"))

        return result


# ===============================================================================
# CONVENIENCE FUNCTIONS
# ===============================================================================

def check_suggestion_safety(
    suggestion_type: str,
    content: str,
    confidence: float = 0.8,
    memory_sources: List[str] = None,
    metadata: Dict = None
) -> Dict:
    """
    Check if a suggestion should be shown to the user.

    This is a simplified check for proactive suggestions that typically
    don't require dependencies or blockers.

    Args:
        suggestion_type: Type like "task_reminder", "stale_task", etc.
        content: The suggestion content
        confidence: Confidence score 0-1
        memory_sources: Memory keys this is based on
        metadata: Additional metadata

    Returns:
        Dict with approved, reason, suggestions, etc.
    """
    gate = get_safety_gate()

    action = {
        "type": f"suggest_{suggestion_type}",
        "content": content,
        "confidence": confidence,
        "memory_sources": memory_sources or [],
        "dependencies": [],
        "metadata": metadata or {"is_suggestion": True}
    }

    return gate.check_action(action)


def check_action_safety(
    action_type: str,
    content: str,
    confidence: float = 0.8,
    memory_sources: List[str] = None,
    dependencies: List[str] = None,
    blockers: List[str] = None,
    metadata: Dict = None
) -> Dict:
    """
    Check if an action should be executed.

    Args:
        action_type: Type like "create_task", "send_email", etc.
        content: Action description
        confidence: Confidence score 0-1
        memory_sources: Memory keys this is grounded in
        dependencies: Task/action IDs this depends on
        blockers: Task IDs that must be complete first
        metadata: Additional metadata

    Returns:
        Dict with approved, reason, suggestions, etc.
    """
    gate = get_safety_gate()

    action = {
        "type": action_type,
        "content": content,
        "confidence": confidence,
        "memory_sources": memory_sources or [],
        "dependencies": dependencies or [],
        "blockers": blockers or [],
        "metadata": metadata or {}
    }

    return gate.check_action(action)


def get_safety_gate_instance(memory=None, confidence_scorer=None) -> PMSafetyGate:
    """Get the global safety gate instance."""
    return get_safety_gate(memory, confidence_scorer)


# ===============================================================================
# DECORATOR FOR SAFE EXECUTION
# ===============================================================================

def require_safety_check(
    action_type: str = None,
    min_confidence: float = 0.8,
    require_sources: bool = True
):
    """
    Decorator to require safety check before executing a function.

    Usage:
        @require_safety_check(action_type="create_task", min_confidence=0.85)
        def create_task_for_user(title, assignee, confidence=0.9):
            # This will only execute if safety gate approves
            return create_task(title, assignee)

    The decorated function can accept a `confidence` kwarg that will be used
    for the safety check. It can also accept `memory_sources` as a kwarg.
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Extract safety-relevant kwargs
            confidence = kwargs.pop("confidence", min_confidence)
            memory_sources = kwargs.pop("memory_sources", [])
            content = kwargs.pop("content_description", f"Executing {func.__name__}")

            # Determine action type
            act_type = action_type or func.__name__

            # Check if sources required
            if require_sources and not memory_sources:
                log(f"Safety check: No memory sources for {act_type}", "WARN")

            # Run safety check
            result = check_action_safety(
                action_type=act_type,
                content=content,
                confidence=confidence,
                memory_sources=memory_sources
            )

            if not result.get("approved"):
                log(f"Safety gate blocked {act_type}: {result.get('reason')}", "WARN")
                # Return a SafetyBlockedResult instead of executing
                return {
                    "blocked": True,
                    "reason": result.get("reason"),
                    "suggestions": result.get("suggestions", []),
                    "outcome": result.get("outcome"),
                    "action_id": result.get("action_id")
                }

            # Safety approved - execute
            return func(*args, **kwargs)

        return wrapper
    return decorator


# ===============================================================================
# PROACTIVE ENGINE INTEGRATION
# ===============================================================================

class SafetyGatedProactiveEngine:
    """
    A wrapper around ProactiveEngine that applies safety checks to all suggestions.

    This can be used as a drop-in replacement in pm_orchestrator.py:

        # Instead of:
        self.proactive = ProactiveEngine(self.memory)

        # Use:
        self.proactive = SafetyGatedProactiveEngine(self.memory)
    """

    def __init__(self, memory_manager, original_proactive_engine=None):
        """
        Initialize with the original ProactiveEngine.

        Args:
            memory_manager: MemoryManager instance
            original_proactive_engine: Optional existing ProactiveEngine
        """
        self.memory = memory_manager
        self.gate = get_safety_gate(memory_manager)

        # Create or use existing proactive engine
        if original_proactive_engine:
            self._original = original_proactive_engine
        else:
            # Import here to avoid circular imports
            try:
                from pm_orchestrator import ProactiveEngine
                self._original = ProactiveEngine(memory_manager)
            except ImportError:
                self._original = None

        self.blocked_suggestions = []
        self.approved_suggestions = []

    def check_for_proactive_items(self, ctx) -> List[str]:
        """
        Get proactive items, filtered through safety gate.

        This wraps the original method and applies safety checks to each suggestion.
        """
        if not self._original:
            return []

        # Get original suggestions
        original_items = self._original.check_for_proactive_items(ctx)

        # Filter through safety gate
        approved_items = []
        for item in original_items:
            # Try to extract type from the item (heuristic)
            suggestion_type = self._infer_suggestion_type(item)

            result = check_suggestion_safety(
                suggestion_type=suggestion_type,
                content=item,
                confidence=0.85  # Default confidence for proactive items
            )

            if result.get("approved"):
                approved_items.append(item)
                self.approved_suggestions.append({
                    "item": item,
                    "timestamp": datetime.now().isoformat(),
                    "action_id": result.get("action_id")
                })
            else:
                self.blocked_suggestions.append({
                    "item": item,
                    "reason": result.get("reason"),
                    "timestamp": datetime.now().isoformat(),
                    "action_id": result.get("action_id")
                })
                log(f"Safety gate blocked suggestion: {item[:50]}...")

        return approved_items

    def _infer_suggestion_type(self, item: str) -> str:
        """Infer suggestion type from content (heuristic)."""
        item_lower = item.lower()

        if "question" in item_lower or "waiting" in item_lower:
            return "question_pending"
        elif "builder" in item_lower:
            return "builder_update"
        elif "launch" in item_lower or "%" in item_lower:
            return "milestone_reached"
        elif "follow" in item_lower:
            return "followup_reminder"
        elif "stale" in item_lower or "progress" in item_lower:
            return "stale_task"
        elif "meeting" in item_lower:
            return "meeting_reminder"
        elif "email" in item_lower:
            return "email_alert"
        elif "calendar" in item_lower:
            return "calendar_alert"
        else:
            return "general_suggestion"

    def should_send_proactive_message(self, ctx) -> tuple:
        """Delegate to original with safety awareness."""
        if not self._original:
            return (False, None)
        return self._original.should_send_proactive_message(ctx)

    def record_suggestion_outcome(self, suggestion_type: str, was_helpful: bool):
        """Record outcome and propagate to both safety gate and original engine."""
        if self._original and hasattr(self._original, 'record_suggestion_outcome'):
            self._original.record_suggestion_outcome(suggestion_type, was_helpful)

        # Also record in safety gate's confidence scorer
        if hasattr(self.gate, 'confidence_scorer') and self.gate.confidence_scorer:
            self.gate.confidence_scorer.record_outcome(suggestion_type, was_helpful)

    def get_proactive_suggestions(self, ctx) -> List[Dict]:
        """Get proactive suggestions with safety metadata."""
        if not self._original or not hasattr(self._original, 'get_proactive_suggestions'):
            return []
        return self._original.get_proactive_suggestions(ctx)

    def get_timing_context_for_proactive(self) -> Dict:
        """Get timing context."""
        if self._original and hasattr(self._original, 'get_timing_context_for_proactive'):
            return self._original.get_timing_context_for_proactive()
        return {}

    @property
    def timing_intelligence(self):
        """Access timing intelligence."""
        if self._original and hasattr(self._original, 'timing_intelligence'):
            return self._original.timing_intelligence
        return None

    @property
    def confidence_scorer(self):
        """Access confidence scorer."""
        if self._original and hasattr(self._original, 'confidence_scorer'):
            return self._original.confidence_scorer
        return None

    @property
    def predictive_intent(self):
        """Access predictive intent engine."""
        if self._original and hasattr(self._original, 'predictive_intent'):
            return self._original.predictive_intent
        return None

    def get_safety_stats(self) -> Dict:
        """Get safety gate statistics."""
        gate_stats = self.gate.get_stats()
        return {
            **gate_stats,
            "approved_suggestions_count": len(self.approved_suggestions),
            "blocked_suggestions_count": len(self.blocked_suggestions),
            "recent_blocked": self.blocked_suggestions[-5:]
        }


# ===============================================================================
# RESPONSE GENERATOR INTEGRATION
# ===============================================================================

def wrap_response_with_safety(response_generator):
    """
    Wrap a ResponseGenerator to apply safety checks to its outputs.

    This modifies the generate() method to check suggestions through safety gate.

    Usage:
        self.response_gen = ResponseGenerator(self.claude, self.memory)
        wrap_response_with_safety(self.response_gen)
    """
    original_generate = response_generator.generate
    gate = get_safety_gate()

    def safe_generate(user_message: str, conversation_history, ctx):
        # Generate original response
        response = original_generate(user_message, conversation_history, ctx)

        # Log the response through safety gate for audit
        gate.check_action({
            "type": "generate_response",
            "content": response[:200],
            "confidence": 0.95,  # High confidence for direct responses
            "memory_sources": [],
            "metadata": {
                "user_message": user_message[:100],
                "response_length": len(response)
            }
        })

        return response

    response_generator.generate = safe_generate
    return response_generator


# ===============================================================================
# BUILDER ACTION INTEGRATION
# ===============================================================================

def check_builder_delegation(task_content: str, priority: str = "normal") -> Dict:
    """
    Check if delegating a task to Builder passes safety checks.

    Args:
        task_content: The task description to delegate
        priority: Task priority

    Returns:
        Safety check result
    """
    return check_action_safety(
        action_type="delegate_to_builder",
        content=task_content,
        confidence=0.85,
        metadata={
            "priority": priority,
            "delegation": True
        }
    )


def check_autonomous_action(action_type: str, action_content: str, confidence: float) -> Dict:
    """
    Check if an autonomous (no user confirmation) action is safe.

    Autonomous actions have stricter requirements:
    - Higher confidence threshold
    - Must have memory sources
    - Impact must be low
    """
    return check_action_safety(
        action_type=f"autonomous_{action_type}",
        content=action_content,
        confidence=confidence,
        metadata={
            "autonomous": True,
            "requires_memory_sources": True
        }
    )


# ===============================================================================
# INITIALIZATION HELPER
# ===============================================================================

def initialize_safety_gate_for_orchestrator(orchestrator):
    """
    Initialize safety gate integration for a PMOrchestrator instance.

    This is the main entry point for integrating safety gate with the orchestrator.

    Usage in pm_orchestrator.py __init__:
        from pm_safety_gate_integration import initialize_safety_gate_for_orchestrator
        initialize_safety_gate_for_orchestrator(self)

    This will:
    1. Create a safety gate instance with memory and confidence scorer
    2. Wrap the proactive engine with safety checks
    3. Add safety methods to the orchestrator
    """
    # Get or create safety gate with orchestrator's memory
    memory = getattr(orchestrator, 'memory', None)
    confidence_scorer = None

    # Try to get confidence scorer from proactive engine
    if hasattr(orchestrator, 'proactive') and hasattr(orchestrator.proactive, 'confidence_scorer'):
        confidence_scorer = orchestrator.proactive.confidence_scorer

    gate = get_safety_gate(memory, confidence_scorer)

    # Attach gate to orchestrator
    orchestrator.safety_gate = gate

    # Wrap proactive engine with safety checks
    if hasattr(orchestrator, 'proactive'):
        orchestrator.proactive = SafetyGatedProactiveEngine(
            orchestrator.memory,
            orchestrator.proactive
        )

    # Add convenience methods
    orchestrator.check_action_safety = lambda action: gate.check_action(action)
    orchestrator.get_safety_stats = lambda: gate.get_stats()

    log("Safety gate integration initialized for orchestrator")

    return gate


# ===============================================================================
# CLI
# ===============================================================================

def main():
    """Test the safety gate integration."""
    import argparse

    parser = argparse.ArgumentParser(description="PM Safety Gate Integration")
    parser.add_argument("--test-suggestion", action="store_true", help="Test suggestion safety check")
    parser.add_argument("--test-action", action="store_true", help="Test action safety check")
    parser.add_argument("--stats", action="store_true", help="Show safety gate stats")

    args = parser.parse_args()

    if args.test_suggestion:
        print("\n=== Testing Suggestion Safety Check ===")
        result = check_suggestion_safety(
            suggestion_type="task_reminder",
            content="Remind about the weekly team review meeting",
            confidence=0.85,
            memory_sources=["calendar_preferences", "team_meeting_history"]
        )
        print(json.dumps(result, indent=2))

    elif args.test_action:
        print("\n=== Testing Action Safety Check ===")
        result = check_action_safety(
            action_type="send_email",
            content="Send reminder email to team about deadline",
            confidence=0.75,
            memory_sources=["team_emails"],
            dependencies=["task_123"]
        )
        print(json.dumps(result, indent=2))

    elif args.stats:
        gate = get_safety_gate_instance()
        stats = gate.get_stats()
        print("\n=== Safety Gate Statistics ===")
        print(json.dumps(stats, indent=2))

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
