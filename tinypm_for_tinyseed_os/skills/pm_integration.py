"""
TinyPM Skills - PM Orchestrator Integration
===========================================

This module integrates the skill system with pm_orchestrator.py.

Integration points:
1. SkillRouter - Extends SmartRouter to route intents to skills
2. SkillResponseGenerator - Uses skills for intelligent responses
3. SkillContext - Provides skill-aware context to PM
4. SkillProactiveEngine - Proactive suggestions using skills

Usage in pm_orchestrator.py:
    from skills.pm_integration import (
        get_skill_router,
        SkillAwareResponseGenerator,
        get_skill_context,
    )

    # In PMOrchestrator.__init__:
    self.skill_router = get_skill_router()
    self.skill_response_gen = SkillAwareResponseGenerator(...)

    # In process_dashboard_message:
    skill_routing = self.skill_router.route(user_message)
    if skill_routing["has_skill_match"]:
        result = self.skill_router.execute(...)

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
    get_skill_registry,
)

from skills.orchestrator import (
    UnifiedSkillOrchestrator,
    IntentParser,
    get_unified_orchestrator,
)


# =============================================================================
# SKILL ROUTER - Integration with SmartRouter
# =============================================================================

class SkillRouter:
    """
    Extends SmartRouter with skill-aware routing.

    Determines:
    1. Whether a message can be handled by a skill
    2. Which skill(s) match the intent
    3. What parameters can be extracted
    4. Whether approval is needed
    """

    # Intent patterns that should bypass skills and go to Claude
    CLAUDE_ONLY_PATTERNS = [
        r"(?:what|how|why|explain|tell me about)",  # Knowledge questions
        r"(?:think|opinion|suggest|recommend)",     # Need reasoning
        r"(?:creative|brainstorm|ideas?)",          # Creative tasks
        r"(?:summarize|analyze|compare)",           # Complex analysis
    ]

    # Intent patterns that should definitely use skills
    SKILL_PATTERNS = [
        r"(?:list|show|get|read)\s+(?:my\s+)?(?:tasks?|emails?|events?|calendar)",
        r"(?:create|add|new)\s+(?:task|meeting|event)",
        r"(?:update|change|modify|edit)\s+(?:task|status)",
        r"(?:approve|deny|reject)\s+",
        r"(?:mark|set)\s+(?:as\s+)?(?:done|complete|read)",
        r"(?:check|find)\s+(?:urgent|pending|free)",
    ]

    def __init__(self, orchestrator: UnifiedSkillOrchestrator = None):
        self.orchestrator = orchestrator or get_unified_orchestrator()
        self._compile_patterns()

    def _compile_patterns(self):
        """Compile regex patterns for performance."""
        self._claude_patterns = [re.compile(p, re.IGNORECASE) for p in self.CLAUDE_ONLY_PATTERNS]
        self._skill_patterns = [re.compile(p, re.IGNORECASE) for p in self.SKILL_PATTERNS]

    def route(self, message: str, context: Dict = None) -> Dict:
        """
        Route a message and determine if skills can handle it.

        Args:
            message: User message
            context: Additional context

        Returns:
            Dict with routing decision:
            {
                "has_skill_match": bool,
                "skill_confidence": float,
                "skill_matches": [...],
                "should_use_skill": bool,
                "should_use_claude": bool,
                "reason": str,
            }
        """
        result = {
            "has_skill_match": False,
            "skill_confidence": 0.0,
            "skill_matches": [],
            "should_use_skill": False,
            "should_use_claude": True,
            "reason": "default to claude",
            "message": message,
        }

        # Check if message matches Claude-only patterns
        for pattern in self._claude_patterns:
            if pattern.search(message):
                result["reason"] = "question/reasoning pattern detected"
                return result

        # Check for skill pattern matches
        for pattern in self._skill_patterns:
            if pattern.search(message):
                result["should_use_skill"] = True
                break

        # Parse intent with orchestrator
        matches = self.orchestrator.parse_intent(message)

        if matches:
            best_match = matches[0]
            result["has_skill_match"] = True
            result["skill_confidence"] = best_match["confidence"]
            result["skill_matches"] = [
                {
                    "skill_name": m["skill_name"],
                    "confidence": m["confidence"],
                    "trigger": m["trigger"],
                    "parameters": m["parameters"],
                }
                for m in matches[:3]  # Top 3 matches
            ]

            # Use skill if confidence is high enough
            if best_match["confidence"] >= 0.4:
                result["should_use_skill"] = True
                result["should_use_claude"] = False
                result["reason"] = f"skill match: {best_match['skill_name']} ({best_match['confidence']:.2f})"
            else:
                # Low confidence - use Claude but mention skill option
                result["should_use_claude"] = True
                result["reason"] = f"low confidence match ({best_match['confidence']:.2f})"

        return result

    def execute(
        self,
        message: str,
        user_id: str = "default",
        additional_params: Dict = None,
    ) -> SkillExecutionResult:
        """
        Execute the best matching skill for a message.

        Args:
            message: User message
            user_id: User ID
            additional_params: Additional parameters to merge

        Returns:
            SkillExecutionResult
        """
        return self.orchestrator.route_and_execute(message, additional_params)

    def execute_skill(
        self,
        skill_name: str,
        parameters: Dict,
        user_id: str = "default",
    ) -> SkillExecutionResult:
        """
        Execute a specific skill by name.

        Args:
            skill_name: Skill name
            parameters: Skill parameters
            user_id: User ID

        Returns:
            SkillExecutionResult
        """
        return self.orchestrator.execute(skill_name, parameters)


# =============================================================================
# SKILL-AWARE RESPONSE GENERATOR
# =============================================================================

class SkillAwareResponseGenerator:
    """
    Response generator that can use skills for action execution.

    Integrates with existing ResponseGenerator but adds skill capabilities.

    Flow:
    1. Analyze message for skill matches
    2. If skill matches: execute skill, format result
    3. If no match or needs Claude: generate Claude response
    4. Optionally combine skill result with Claude commentary
    """

    def __init__(
        self,
        skill_router: SkillRouter,
        claude_interface = None,  # ClaudeInterface from pm_orchestrator
        memory = None,  # MemoryManager from pm_orchestrator
    ):
        self.router = skill_router
        self.claude = claude_interface
        self.memory = memory

    def generate(
        self,
        message: str,
        conversation_history: List[Dict] = None,
        context = None,  # ProjectContext
        user_id: str = "default",
    ) -> str:
        """
        Generate a response using skills and/or Claude.

        Args:
            message: User message
            conversation_history: Previous messages
            context: Project context
            user_id: User ID

        Returns:
            Response string
        """
        # Route the message
        routing = self.router.route(message)

        # If skill should handle it
        if routing["should_use_skill"] and routing["has_skill_match"]:
            result = self.router.execute(message, user_id)

            if result.status == ExecutionStatus.SUCCESS:
                # Format skill result as response
                return self._format_skill_result(result, routing)

            elif result.status == ExecutionStatus.PENDING_APPROVAL:
                return self._format_pending_approval(result, routing)

            elif result.status == ExecutionStatus.BLOCKED:
                return f"I can't do that right now: {result.error}"

            else:
                # Skill failed - fall back to Claude
                if self.claude:
                    return self._fallback_to_claude(message, conversation_history, context, result.error)
                return f"I encountered an error: {result.error}"

        # Use Claude (or no skill matched)
        if self.claude:
            return self._generate_claude_response(message, conversation_history, context, routing)

        # No Claude available - return what we can
        if routing["has_skill_match"]:
            return f"I found a matching action ({routing['skill_matches'][0]['skill_name']}) but need confirmation to proceed."

        return "I'm not sure how to help with that. Could you rephrase?"

    def _format_skill_result(self, result: SkillExecutionResult, routing: Dict) -> str:
        """Format a skill execution result as a natural response."""
        skill_name = result.skill_name
        data = result.data or {}

        # Skill-specific formatting
        if skill_name == "list_tasks":
            count = data.get("count", 0)
            tasks = data.get("tasks", [])
            if count == 0:
                return "No tasks found matching your criteria."

            lines = [f"Found {count} task(s):"]
            for t in tasks[:10]:
                status_emoji = {
                    "pending": "[  ]",
                    "in_progress": "[>>]",
                    "done": "[OK]",
                    "blocked": "[!!]",
                }.get(t.get("status", "pending"), "[  ]")
                lines.append(f"  {status_emoji} {t.get('id')}: {t.get('title')} ({t.get('priority')})")
            return "\n".join(lines)

        elif skill_name == "get_task_summary":
            by_status = data.get("by_status", {})
            completion = data.get("completion_percentage", 0)
            return (
                f"Project Status ({completion}% complete):\n"
                f"  Pending: {by_status.get('pending', 0)}\n"
                f"  In Progress: {by_status.get('in_progress', 0)}\n"
                f"  Done: {by_status.get('done', 0)}\n"
                f"  Blocked: {by_status.get('blocked', 0)}"
            )

        elif skill_name == "read_unread_emails":
            count = data.get("count", 0)
            emails = data.get("emails", [])
            if count == 0:
                return "No unread emails in your inbox."

            lines = [f"You have {count} unread email(s):"]
            for e in emails[:5]:
                urgency = e.get("urgency_score", 2)
                urgency_marker = "!" * min(urgency - 1, 3) if urgency > 2 else ""
                lines.append(f"  {urgency_marker} From {e.get('sender', 'Unknown')}: {e.get('subject', 'No subject')[:40]}")
            return "\n".join(lines)

        elif skill_name == "get_upcoming_events":
            count = data.get("count", 0)
            events = data.get("events", [])
            if count == 0:
                return "No upcoming events on your calendar."

            lines = [f"You have {count} upcoming event(s):"]
            for e in events[:5]:
                mins = e.get("minutes_until", 0)
                time_str = f"in {mins} min" if mins > 0 else "now"
                lines.append(f"  - {e.get('title', 'Untitled')} ({time_str})")
            return "\n".join(lines)

        elif skill_name == "create_task":
            task_id = data.get("task_id")
            return f"Task created: {task_id} - {data.get('task', {}).get('title', 'Untitled')}"

        elif skill_name == "update_task_status":
            if data.get("changed"):
                return f"Updated {data.get('task_id')}: {data.get('old_status')} -> {data.get('new_status')}"
            return f"Task {data.get('task_id')} is already {data.get('new_status')}"

        elif "approval" in skill_name:
            return data.get("message", f"Approval action completed: {skill_name}")

        # Generic formatting
        if "message" in data:
            return data["message"]

        if "count" in data:
            return f"Found {data['count']} result(s)."

        return f"Action completed: {skill_name}"

    def _format_pending_approval(self, result: SkillExecutionResult, routing: Dict) -> str:
        """Format a pending approval response."""
        return (
            f"This action requires approval before I can proceed.\n"
            f"Approval ID: {result.approval_request_id}\n"
            f"Risk level: {result.risk_level.value if result.risk_level else 'external'}\n\n"
            f"Reply 'approve {result.approval_request_id}' to proceed, or 'deny {result.approval_request_id}' to cancel."
        )

    def _fallback_to_claude(
        self,
        message: str,
        history: List[Dict],
        context,
        error: str,
    ) -> str:
        """Fall back to Claude when skill fails."""
        if not self.claude:
            return f"I encountered an error: {error}"

        # Add skill error context
        enhanced_context = f"Note: I tried to execute an action but encountered: {error}. Please help the user with their request."

        # Use existing Claude interface
        try:
            return self.claude.generate_response(message, history, context, enhanced_context)
        except Exception as e:
            return f"I encountered an error and couldn't generate a response: {e}"

    def _generate_claude_response(
        self,
        message: str,
        history: List[Dict],
        context,
        routing: Dict,
    ) -> str:
        """Generate response using Claude, possibly mentioning skill option."""
        if not self.claude:
            return "I need Claude to help with that, but it's not available right now."

        # If there was a low-confidence skill match, mention it
        skill_hint = ""
        if routing.get("has_skill_match") and routing.get("skill_matches"):
            match = routing["skill_matches"][0]
            skill_hint = f"\n(I also found a possible action: {match['skill_name']} - say 'do {match['skill_name']}' if that's what you want)"

        try:
            response = self.claude.generate_response(message, history, context)
            return response + skill_hint if skill_hint else response
        except Exception as e:
            return f"I had trouble generating a response: {e}"


# =============================================================================
# SKILL CONTEXT PROVIDER
# =============================================================================

class SkillContextProvider:
    """
    Provides skill-aware context for PM decisions.

    Integrates with IntegratedContextGatherer but adds skill capabilities.
    """

    def __init__(self, orchestrator: UnifiedSkillOrchestrator = None):
        self.orchestrator = orchestrator or get_unified_orchestrator()

    def get_available_skills_summary(self) -> Dict:
        """Get summary of available skills for context."""
        skills = self.orchestrator.registry.list_all()

        by_category = {}
        for skill in skills:
            cat = skill.category.value
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append({
                "name": skill.name,
                "description": skill.description[:100],
                "risk": skill.risk_level.value,
            })

        return {
            "total_skills": len(skills),
            "by_category": by_category,
            "categories": list(by_category.keys()),
        }

    def get_pending_approvals_context(self) -> Dict:
        """Get pending approvals for context."""
        pending = self.orchestrator.get_pending_approvals()
        return {
            "count": len(pending),
            "approvals": pending,
        }

    def get_recent_skill_activity(self, limit: int = 10) -> List[Dict]:
        """Get recent skill execution activity."""
        return self.orchestrator.get_execution_history(limit)

    def get_skill_context_for_prompt(self) -> str:
        """Get formatted skill context for Claude prompts."""
        summary = self.get_available_skills_summary()
        pending = self.get_pending_approvals_context()

        lines = ["\n=== SKILL CAPABILITIES ==="]
        lines.append(f"Available skills: {summary['total_skills']}")
        lines.append(f"Categories: {', '.join(summary['categories'])}")

        if pending["count"] > 0:
            lines.append(f"\nPENDING APPROVALS: {pending['count']}")
            for apr in pending["approvals"][:3]:
                lines.append(f"  - {apr['approval_id']}: {apr['skill_name']} ({apr['risk_level']})")

        return "\n".join(lines)


# =============================================================================
# PROACTIVE SKILL ENGINE
# =============================================================================

class SkillProactiveEngine:
    """
    Uses skills for proactive suggestions.

    Runs skills periodically to gather intelligence:
    - Email urgency checks
    - Calendar prep warnings
    - Task deadline alerts
    - Approval reminders
    """

    def __init__(self, orchestrator: UnifiedSkillOrchestrator = None):
        self.orchestrator = orchestrator or get_unified_orchestrator()
        self.orchestrator.grant_all_permissions()  # Proactive needs permissions

    def check_email_urgency(self) -> Optional[str]:
        """Check for urgent emails and return suggestion if any."""
        result = self.orchestrator.execute("read_urgent_emails", {"urgency_threshold": 4})

        if result.success and result.data:
            count = result.data.get("count", 0)
            if count > 0:
                urgent = result.data.get("urgent_emails", [])
                top = urgent[0] if urgent else {}
                return f"You have {count} urgent email(s). Most urgent from {top.get('sender', 'Unknown')}: {top.get('subject', 'No subject')[:40]}"

        return None

    def check_calendar_prep(self) -> Optional[str]:
        """Check if meeting prep is needed."""
        result = self.orchestrator.execute("get_next_event", {})

        if result.success and result.data and result.data.get("has_upcoming"):
            event = result.data.get("event", {})
            mins = event.get("minutes_until", 999)
            prep_needed = result.data.get("prep_time_needed_minutes", 5)

            if mins <= prep_needed + 10:
                return f"Heads up: '{event.get('title', 'Meeting')}' starts in {mins} minutes. Prep time recommended: {prep_needed} min."

        return None

    def check_pending_approvals(self) -> Optional[str]:
        """Check for pending approvals."""
        pending = self.orchestrator.get_pending_approvals()

        if len(pending) > 0:
            return f"You have {len(pending)} action(s) waiting for your approval."

        return None

    def check_blocked_tasks(self) -> Optional[str]:
        """Check for blocked tasks."""
        result = self.orchestrator.execute("find_tasks_by_status", {"status": "blocked"})

        if result.success and result.data:
            count = result.data.get("count", 0)
            if count > 0:
                return f"Alert: {count} task(s) are blocked and may need attention."

        return None

    def get_proactive_suggestions(self) -> List[str]:
        """Get all proactive suggestions."""
        suggestions = []

        # Check each source
        checks = [
            self.check_email_urgency,
            self.check_calendar_prep,
            self.check_pending_approvals,
            self.check_blocked_tasks,
        ]

        for check in checks:
            try:
                suggestion = check()
                if suggestion:
                    suggestions.append(suggestion)
            except Exception as e:
                print(f"[SkillProactive] Error in check: {e}")

        return suggestions


# =============================================================================
# FACTORY FUNCTIONS
# =============================================================================

_skill_router_instance: Optional[SkillRouter] = None


def get_skill_router() -> SkillRouter:
    """Get the global skill router instance."""
    global _skill_router_instance
    if _skill_router_instance is None:
        _skill_router_instance = SkillRouter()
    return _skill_router_instance


def get_skill_context_provider() -> SkillContextProvider:
    """Get a skill context provider."""
    return SkillContextProvider()


def get_skill_proactive_engine() -> SkillProactiveEngine:
    """Get a skill proactive engine."""
    return SkillProactiveEngine()


def create_skill_aware_generator(claude_interface=None, memory=None) -> SkillAwareResponseGenerator:
    """Create a skill-aware response generator."""
    router = get_skill_router()
    return SkillAwareResponseGenerator(router, claude_interface, memory)


# =============================================================================
# INTEGRATION HELPERS
# =============================================================================

def integrate_skills_with_orchestrator(pm_orchestrator):
    """
    Helper to integrate skills with an existing PMOrchestrator instance.

    Usage:
        from skills.pm_integration import integrate_skills_with_orchestrator
        integrate_skills_with_orchestrator(self)  # in PMOrchestrator.__init__

    This adds:
        - pm_orchestrator.skill_router
        - pm_orchestrator.skill_response_gen
        - pm_orchestrator.skill_proactive
        - pm_orchestrator.skill_context
    """
    pm_orchestrator.skill_router = get_skill_router()
    pm_orchestrator.skill_context = get_skill_context_provider()
    pm_orchestrator.skill_proactive = get_skill_proactive_engine()

    # Create skill-aware response generator with existing dependencies
    claude = getattr(pm_orchestrator, 'claude', None)
    memory = getattr(pm_orchestrator, 'memory', None)
    pm_orchestrator.skill_response_gen = create_skill_aware_generator(claude, memory)

    print("[PMIntegration] Skill system integrated with PMOrchestrator")


def process_message_with_skills(
    pm_orchestrator,
    message: str,
    context = None,
) -> Optional[str]:
    """
    Process a message with skill routing.

    Returns skill response if handled, None if should use Claude.

    Usage:
        # In PMOrchestrator.process_dashboard_message:
        skill_response = process_message_with_skills(self, user_message, ctx)
        if skill_response:
            self.channels.send_dashboard_response(skill_response, msg_id)
            return
        # ... continue with Claude handling
    """
    if not hasattr(pm_orchestrator, 'skill_router'):
        integrate_skills_with_orchestrator(pm_orchestrator)

    router = pm_orchestrator.skill_router
    routing = router.route(message)

    if routing["should_use_skill"] and routing["has_skill_match"]:
        result = router.execute(message)

        if result.success:
            gen = pm_orchestrator.skill_response_gen
            return gen._format_skill_result(result, routing)

        elif result.status == ExecutionStatus.PENDING_APPROVAL:
            gen = pm_orchestrator.skill_response_gen
            return gen._format_pending_approval(result, routing)

    return None


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """CLI interface for testing integration."""
    import sys

    print("=" * 60)
    print("TinyPM Skills - PM Integration")
    print("=" * 60)

    router = get_skill_router()
    router.orchestrator.grant_all_permissions()

    if len(sys.argv) > 1:
        message = " ".join(sys.argv[1:])
        print(f"\nMessage: {message}")

        # Route
        routing = router.route(message)
        print(f"\nRouting Decision:")
        print(f"  Has skill match: {routing['has_skill_match']}")
        print(f"  Confidence: {routing['skill_confidence']:.2f}")
        print(f"  Should use skill: {routing['should_use_skill']}")
        print(f"  Reason: {routing['reason']}")

        if routing['skill_matches']:
            print(f"\nMatched skills:")
            for m in routing['skill_matches']:
                print(f"  - {m['skill_name']} (conf: {m['confidence']:.2f})")

        # Execute if skill matched
        if routing['should_use_skill']:
            result = router.execute(message)
            print(f"\nExecution Result:")
            print(f"  Status: {result.status.value}")
            if result.data:
                import json
                print(f"  Data: {json.dumps(result.data, indent=2, default=str)[:500]}")
            if result.error:
                print(f"  Error: {result.error}")
    else:
        print("\nUsage: python pm_integration.py <message>")
        print("\nExamples:")
        print('  python pm_integration.py "list all pending tasks"')
        print('  python pm_integration.py "check my urgent emails"')
        print('  python pm_integration.py "show upcoming events"')

        # Show proactive suggestions
        print("\n" + "=" * 60)
        print("Proactive Suggestions:")
        proactive = get_skill_proactive_engine()
        suggestions = proactive.get_proactive_suggestions()
        if suggestions:
            for s in suggestions:
                print(f"  - {s}")
        else:
            print("  (No suggestions at this time)")


if __name__ == "__main__":
    main()
