#!/usr/bin/env python3
"""
TinyPM Skills API - REST API Layer for Skills System
====================================================

This module provides the API layer for the Skills System.
It's designed to be integrated with web_server.py.

Endpoints:
- GET /api/skills - List all available skills
- GET /api/skills/pending-approvals - Get pending approval requests
- GET /api/skills/history - Get execution history
- POST /api/skills/execute - Execute a skill by name
- POST /api/skills/approve - Approve a pending action
- POST /api/skills/deny - Deny a pending action
- POST /api/skills/parse-intent - Parse natural language to skills

Usage:
    from skills_api import (
        get_skill_orchestrator,
        SKILLS_AVAILABLE,
        SkillsAPI,
    )

Created: 2026-01-31
Author: Skills System Deployment Team
"""

import json
import traceback
from typing import Any, Dict, Optional

# =============================================================================
# SKILLS SYSTEM INITIALIZATION
# =============================================================================

try:
    from skills.orchestrator import (
        UnifiedSkillOrchestrator,
        get_unified_orchestrator,
    )
    from skills import (
        get_skill_registry,
        RiskLevel,
        SkillCategory,
        ExecutionStatus,
    )
    SKILLS_AVAILABLE = True
    print("[SkillsAPI] Skills System ENABLED - modular skill architecture active")
except ImportError as e:
    print(f"[SkillsAPI] Skills System not available: {e}")
    SKILLS_AVAILABLE = False
    UnifiedSkillOrchestrator = None


# Global orchestrator instance (per-user in production)
_skill_orchestrators: Dict[str, "UnifiedSkillOrchestrator"] = {}


def get_skill_orchestrator(user_id: str = "default") -> Optional["UnifiedSkillOrchestrator"]:
    """
    Get or create a SkillOrchestrator for a user.

    Args:
        user_id: User ID for the orchestrator

    Returns:
        UnifiedSkillOrchestrator instance or None if not available
    """
    if not SKILLS_AVAILABLE:
        return None

    if user_id not in _skill_orchestrators:
        orchestrator = get_unified_orchestrator(user_id)
        orchestrator.grant_all_permissions()
        _skill_orchestrators[user_id] = orchestrator

    return _skill_orchestrators[user_id]


# =============================================================================
# SKILLS API CLASS
# =============================================================================

class SkillsAPI:
    """
    API handler for Skills System endpoints.

    This class can be used directly with web_server.py by calling
    its methods with the appropriate data.
    """

    def __init__(self, user_id: str = "dashboard_user"):
        """
        Initialize the Skills API.

        Args:
            user_id: User ID for skill execution context
        """
        self.user_id = user_id

    @property
    def orchestrator(self) -> Optional["UnifiedSkillOrchestrator"]:
        """Get the orchestrator for this API instance."""
        return get_skill_orchestrator(self.user_id)

    def get_skills(self) -> Dict[str, Any]:
        """
        GET /api/skills
        List all available skills with their manifests.

        Returns:
            Dict with skills, categories, and metadata
        """
        if not SKILLS_AVAILABLE:
            return {"success": False, "error": "Skills system not available"}

        try:
            orchestrator = self.orchestrator
            if not orchestrator:
                return {"success": False, "error": "Orchestrator not initialized"}

            skills = orchestrator.get_available_skills()

            # Group by category for better UI
            by_category = {}
            for skill in skills:
                cat = skill.get("category", "system")
                if cat not in by_category:
                    by_category[cat] = []
                by_category[cat].append(skill)

            return {
                "success": True,
                "skill_count": len(skills),
                "skills": skills,
                "by_category": by_category,
                "categories": list(by_category.keys()),
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_pending_approvals(self) -> Dict[str, Any]:
        """
        GET /api/skills/pending-approvals
        Get all pending approval requests.

        Returns:
            Dict with pending approvals list
        """
        if not SKILLS_AVAILABLE:
            return {"success": False, "error": "Skills system not available"}

        try:
            orchestrator = self.orchestrator
            if not orchestrator:
                return {"success": False, "error": "Orchestrator not initialized"}

            pending = orchestrator.get_pending_approvals()
            return {
                "success": True,
                "count": len(pending),
                "pending_approvals": pending,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_history(self, limit: int = 50) -> Dict[str, Any]:
        """
        GET /api/skills/history
        Get execution history for skills.

        Args:
            limit: Maximum number of history entries

        Returns:
            Dict with execution history
        """
        if not SKILLS_AVAILABLE:
            return {"success": False, "error": "Skills system not available"}

        try:
            orchestrator = self.orchestrator
            if not orchestrator:
                return {"success": False, "error": "Orchestrator not initialized"}

            history = orchestrator.get_execution_history(limit=limit)
            return {
                "success": True,
                "count": len(history),
                "history": history,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def execute_skill(
        self,
        skill_name: str,
        parameters: Dict[str, Any] = None,
        context: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        POST /api/skills/execute
        Execute a skill by name with parameters.

        Args:
            skill_name: Name of the skill to execute
            parameters: Skill parameters
            context: Execution context

        Returns:
            Dict with execution result
        """
        if not SKILLS_AVAILABLE:
            return {"success": False, "error": "Skills system not available"}

        if not skill_name:
            return {"success": False, "error": "skill_name required"}

        try:
            orchestrator = self.orchestrator
            if not orchestrator:
                return {"success": False, "error": "Orchestrator not initialized"}

            result = orchestrator.execute(
                skill_name,
                parameters or {},
                context or {},
            )

            return {
                "success": result.success,
                "request_id": result.request_id,
                "skill_name": result.skill_name,
                "status": result.status.value if result.status else "unknown",
                "data": result.data,
                "error": result.error,
                "execution_time_ms": result.execution_time_ms,
                "risk_level": result.risk_level.value if result.risk_level else None,
                "requires_approval": result.requires_approval,
                "approval_request_id": result.approval_request_id,
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "traceback": traceback.format_exc(),
            }

    def approve(
        self,
        approval_id: str,
        approver_id: str = None,
    ) -> Dict[str, Any]:
        """
        POST /api/skills/approve
        Approve a pending action.

        Args:
            approval_id: The approval request ID
            approver_id: ID of the approver (optional)

        Returns:
            Dict with approval result
        """
        if not SKILLS_AVAILABLE:
            return {"success": False, "error": "Skills system not available"}

        if not approval_id:
            return {"success": False, "error": "approval_id required"}

        try:
            orchestrator = self.orchestrator
            if not orchestrator:
                return {"success": False, "error": "Orchestrator not initialized"}

            result = orchestrator.approve_pending(
                approval_id,
                approver_id or self.user_id,
            )

            if result:
                return {
                    "success": True,
                    "approved": True,
                    "result": result.to_dict() if hasattr(result, 'to_dict') else {
                        "status": result.status.value,
                        "data": result.data,
                        "error": result.error,
                    },
                }
            else:
                return {
                    "success": False,
                    "error": f"Approval {approval_id} not found",
                }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def deny(
        self,
        approval_id: str,
        reason: str = "Denied by user",
    ) -> Dict[str, Any]:
        """
        POST /api/skills/deny
        Deny a pending action.

        Args:
            approval_id: The approval request ID
            reason: Reason for denial

        Returns:
            Dict with denial result
        """
        if not SKILLS_AVAILABLE:
            return {"success": False, "error": "Skills system not available"}

        if not approval_id:
            return {"success": False, "error": "approval_id required"}

        try:
            orchestrator = self.orchestrator
            if not orchestrator:
                return {"success": False, "error": "Orchestrator not initialized"}

            success = orchestrator.deny_pending(approval_id, reason)

            return {
                "success": success,
                "denied": success,
                "approval_id": approval_id,
                "reason": reason,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def parse_intent(self, text: str) -> Dict[str, Any]:
        """
        POST /api/skills/parse-intent
        Parse natural language to identify matching skills.

        Args:
            text: Natural language text to parse

        Returns:
            Dict with matching skills and confidence scores
        """
        if not SKILLS_AVAILABLE:
            return {"success": False, "error": "Skills system not available"}

        if not text:
            return {"success": False, "error": "text required"}

        try:
            orchestrator = self.orchestrator
            if not orchestrator:
                return {"success": False, "error": "Orchestrator not initialized"}

            matches = orchestrator.parse_intent(text)

            return {
                "success": True,
                "text": text,
                "match_count": len(matches),
                "matches": [
                    {
                        "skill_name": m.get("skill_name"),
                        "trigger": m.get("trigger"),
                        "parameters": m.get("parameters"),
                        "confidence": m.get("confidence"),
                    }
                    for m in matches
                ],
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def route_and_execute(self, text: str, params: Dict = None) -> Dict[str, Any]:
        """
        Parse intent and execute the best matching skill.

        Args:
            text: Natural language command
            params: Additional parameters to merge

        Returns:
            Dict with execution result
        """
        if not SKILLS_AVAILABLE:
            return {"success": False, "error": "Skills system not available"}

        if not text:
            return {"success": False, "error": "text required"}

        try:
            orchestrator = self.orchestrator
            if not orchestrator:
                return {"success": False, "error": "Orchestrator not initialized"}

            result = orchestrator.route_and_execute(text, params or {})

            return {
                "success": result.success,
                "request_id": result.request_id,
                "skill_name": result.skill_name,
                "status": result.status.value if result.status else "unknown",
                "data": result.data,
                "error": result.error,
                "execution_time_ms": result.execution_time_ms,
                "risk_level": result.risk_level.value if result.risk_level else None,
                "requires_approval": result.requires_approval,
                "approval_request_id": result.approval_request_id,
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "traceback": traceback.format_exc(),
            }


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

# Global API instance for simple access
_default_api: Optional[SkillsAPI] = None


def get_api(user_id: str = "default") -> SkillsAPI:
    """Get a SkillsAPI instance for a user."""
    global _default_api
    if user_id == "default" and _default_api is not None:
        return _default_api

    api = SkillsAPI(user_id)
    if user_id == "default":
        _default_api = api
    return api


# =============================================================================
# CLI TESTING
# =============================================================================

def main():
    """CLI interface for testing the Skills API."""
    import sys

    print("=" * 60)
    print("TinyPM Skills API - Test Interface")
    print("=" * 60)

    api = get_api()

    # List skills
    print("\n[1] Listing all skills...")
    result = api.get_skills()
    if result["success"]:
        print(f"   Found {result['skill_count']} skills in categories: {result['categories']}")
        for skill in result["skills"][:5]:
            print(f"   - {skill['name']}: {skill['description'][:60]}...")
    else:
        print(f"   Error: {result['error']}")

    # Test task skill (should work without OAuth)
    print("\n[2] Testing list_tasks skill...")
    result = api.execute_skill("list_tasks", {"status": "all", "limit": 5})
    if result["success"]:
        data = result["data"]
        print(f"   Found {data.get('count', 0)} tasks")
        for task in data.get("tasks", [])[:3]:
            print(f"   - {task['id']}: {task['title'][:40]}... [{task['status']}]")
    else:
        print(f"   Error: {result['error']}")

    # Test get_task_summary
    print("\n[3] Testing get_task_summary skill...")
    result = api.execute_skill("get_task_summary", {})
    if result["success"]:
        data = result["data"]
        print(f"   Total tasks: {data.get('total_tasks', 0)}")
        print(f"   Completion: {data.get('completion_percentage', 0)}%")
        print(f"   By status: {data.get('by_status', {})}")
    else:
        print(f"   Error: {result['error']}")

    # Test intent parsing
    print("\n[4] Testing intent parsing...")
    test_intents = [
        "show me all pending tasks",
        "what's on my calendar today",
        "check my emails",
        "create a new task",
    ]
    for intent in test_intents:
        result = api.parse_intent(intent)
        if result["success"] and result["matches"]:
            best = result["matches"][0]
            print(f"   '{intent}' -> {best['skill_name']} ({best['confidence']:.2f})")
        else:
            print(f"   '{intent}' -> No match")

    # Test pending approvals
    print("\n[5] Checking pending approvals...")
    result = api.get_pending_approvals()
    if result["success"]:
        print(f"   {result['count']} pending approvals")
    else:
        print(f"   Error: {result['error']}")

    print("\n" + "=" * 60)
    print("Skills API test complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
