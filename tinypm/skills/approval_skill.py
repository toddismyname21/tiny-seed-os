"""
TinyPM Approval Skills - Human-in-the-Loop Workflows
====================================================

Skills for managing approval workflows and human-in-the-loop decisions.

This module provides the infrastructure for:
1. Requesting human approval for high-risk actions
2. Managing approval queues
3. Multi-party approval for dangerous actions
4. Audit trails for approved/denied actions

Skills included:
- request_approval: Request approval for an action (READ_ONLY)
- list_pending_approvals: List all pending approvals (READ_ONLY)
- get_approval_status: Get status of a specific approval (READ_ONLY)
- approve_action: Approve a pending action (INTERNAL)
- deny_action: Deny a pending action (INTERNAL)
- get_approval_history: Get history of approvals (READ_ONLY)
- escalate_approval: Escalate approval to higher authority (INTERNAL)
- auto_approve_rule: Create rule for auto-approval (EXTERNAL)

Created: 2026-01-30
Author: Builder Agent
"""

import sys
import json
import hashlib
from pathlib import Path
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

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

# Approval storage file
APP_DIR = Path(__file__).parent.parent
APPROVALS_FILE = APP_DIR / ".approvals.json"

# Approval statuses
APPROVAL_PENDING = "pending"
APPROVAL_APPROVED = "approved"
APPROVAL_DENIED = "denied"
APPROVAL_EXPIRED = "expired"
APPROVAL_ESCALATED = "escalated"
APPROVAL_CANCELLED = "cancelled"

# Default expiry in hours
DEFAULT_EXPIRY_HOURS = 24


# =============================================================================
# APPROVAL STORAGE OPERATIONS
# =============================================================================

def load_approvals() -> Dict:
    """Load the approvals file."""
    if not APPROVALS_FILE.exists():
        return {
            "pending": {},
            "completed": [],
            "auto_approve_rules": [],
            "next_id": 1,
        }
    try:
        return json.loads(APPROVALS_FILE.read_text())
    except Exception as e:
        print(f"[ApprovalSkill] Error loading approvals: {e}")
        return None


def save_approvals(approvals: Dict) -> bool:
    """Save the approvals file."""
    try:
        APPROVALS_FILE.write_text(json.dumps(approvals, indent=2, default=str))
        return True
    except Exception as e:
        print(f"[ApprovalSkill] Error saving approvals: {e}")
        return False


def generate_approval_id(data: Dict) -> str:
    """Generate a unique approval ID."""
    timestamp = datetime.now().isoformat()
    content = f"{timestamp}:{json.dumps(data, sort_keys=True)}"
    return f"apr_{hashlib.md5(content.encode()).hexdigest()[:12]}"


def check_expired_approvals(approvals: Dict) -> int:
    """Move expired approvals to completed. Returns count of expired."""
    now = datetime.now()
    expired_count = 0

    expired_ids = []
    for approval_id, approval in approvals.get("pending", {}).items():
        expires_at = datetime.fromisoformat(approval.get("expires_at", "2000-01-01"))
        if now > expires_at:
            expired_ids.append(approval_id)
            approval["status"] = APPROVAL_EXPIRED
            approval["completed_at"] = now.isoformat()
            approvals.get("completed", []).append(approval)
            expired_count += 1

    for approval_id in expired_ids:
        del approvals["pending"][approval_id]

    return expired_count


# =============================================================================
# REQUEST APPROVAL SKILL
# =============================================================================

class RequestApprovalSkill(TinyPMSkill):
    """Request human approval for an action."""

    name = "request_approval"
    description = "Request human approval for a high-risk or external action. Returns an approval ID to track the request."
    version = "1.0.0"
    category = SkillCategory.APPROVAL
    triggers = [
        "request approval",
        "need approval",
        "get permission",
        "approval request",
    ]
    risk_level = RiskLevel.READ_ONLY  # Creating a request doesn't change anything
    required_permissions = ["approvals:request"]

    def _setup_parameters(self):
        self.add_parameter(
            name="action_type",
            type="string",
            description="Type of action requiring approval",
            required=True,
        )
        self.add_parameter(
            name="action_description",
            type="string",
            description="Human-readable description of the action",
            required=True,
        )
        self.add_parameter(
            name="risk_level",
            type="string",
            description="Risk level of the action",
            required=False,
            enum=["external", "dangerous"],
            default="external",
        )
        self.add_parameter(
            name="parameters",
            type="object",
            description="Parameters that will be used when executing the action",
            required=False,
            default={},
        )
        self.add_parameter(
            name="context",
            type="string",
            description="Additional context for the approver",
            required=False,
            default="",
        )
        self.add_parameter(
            name="expires_in_hours",
            type="integer",
            description="Hours until this approval request expires",
            required=False,
            default=DEFAULT_EXPIRY_HOURS,
            min_value=1,
            max_value=168,
        )
        self.add_parameter(
            name="approvers_needed",
            type="integer",
            description="Number of approvers needed (2 for dangerous actions)",
            required=False,
            default=1,
            min_value=1,
            max_value=5,
        )

    def _setup_examples(self):
        self.add_example(
            intent="I need approval to send this email to all users",
            parameters={
                "action_type": "send_bulk_email",
                "action_description": "Send product update email to 500 users",
                "risk_level": "dangerous",
                "approvers_needed": 2,
            },
            expected_outcome="Creates an approval request requiring 2 approvers",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        approvals = load_approvals()
        if approvals is None:
            return self.error_result(request, error="Failed to load approvals")

        try:
            # Check for expired approvals first
            check_expired_approvals(approvals)

            action_type = request.parameters["action_type"]
            action_description = request.parameters["action_description"]
            risk_level = request.parameters.get("risk_level", "external")
            params = request.parameters.get("parameters", {})
            context = request.parameters.get("context", "")
            expires_in = request.parameters.get("expires_in_hours", DEFAULT_EXPIRY_HOURS)
            approvers_needed = request.parameters.get("approvers_needed", 1)

            # For dangerous actions, require at least 2 approvers
            if risk_level == "dangerous" and approvers_needed < 2:
                approvers_needed = 2

            now = datetime.now()
            expires_at = now + timedelta(hours=expires_in)

            approval_data = {
                "action_type": action_type,
                "action_description": action_description,
                "risk_level": risk_level,
                "parameters": params,
                "context": context,
                "approvers_needed": approvers_needed,
                "approvers": [],
                "deniers": [],
                "status": APPROVAL_PENDING,
                "requested_by": request.user_id,
                "requested_at": now.isoformat(),
                "expires_at": expires_at.isoformat(),
                "original_request_id": request.request_id,
            }

            approval_id = generate_approval_id(approval_data)
            approval_data["approval_id"] = approval_id

            approvals["pending"][approval_id] = approval_data

            if not save_approvals(approvals):
                return self.error_result(request, error="Failed to save approval request")

            return self.success_result(request, data={
                "approval_id": approval_id,
                "status": APPROVAL_PENDING,
                "action_type": action_type,
                "approvers_needed": approvers_needed,
                "expires_at": expires_at.isoformat(),
                "message": f"Approval request created. Requires {approvers_needed} approver(s).",
            })

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# LIST PENDING APPROVALS SKILL
# =============================================================================

class ListPendingApprovalsSkill(TinyPMSkill):
    """List all pending approval requests."""

    name = "list_pending_approvals"
    description = "List all pending approval requests that need human review."
    version = "1.0.0"
    category = SkillCategory.APPROVAL
    triggers = [
        "pending approvals",
        "what needs approval",
        "approval queue",
        "show approvals",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["approvals:read"]

    def _setup_parameters(self):
        self.add_parameter(
            name="risk_level",
            type="string",
            description="Filter by risk level",
            required=False,
            enum=["external", "dangerous", "all"],
            default="all",
        )
        self.add_parameter(
            name="limit",
            type="integer",
            description="Maximum number to return",
            required=False,
            default=20,
            min_value=1,
            max_value=100,
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        approvals = load_approvals()
        if approvals is None:
            return self.error_result(request, error="Failed to load approvals")

        try:
            # Check for expired approvals first
            expired_count = check_expired_approvals(approvals)
            if expired_count > 0:
                save_approvals(approvals)

            risk_filter = request.parameters.get("risk_level", "all")
            limit = request.parameters.get("limit", 20)

            pending = list(approvals.get("pending", {}).values())

            # Filter by risk level
            if risk_filter != "all":
                pending = [p for p in pending if p.get("risk_level") == risk_filter]

            # Sort by requested_at (newest first)
            pending.sort(key=lambda x: x.get("requested_at", ""), reverse=True)

            # Apply limit
            pending = pending[:limit]

            data = {
                "count": len(pending),
                "filter": risk_filter,
                "pending_approvals": [
                    {
                        "approval_id": p.get("approval_id"),
                        "action_type": p.get("action_type"),
                        "action_description": p.get("action_description"),
                        "risk_level": p.get("risk_level"),
                        "approvers_needed": p.get("approvers_needed"),
                        "approvers_count": len(p.get("approvers", [])),
                        "requested_by": p.get("requested_by"),
                        "requested_at": p.get("requested_at"),
                        "expires_at": p.get("expires_at"),
                    }
                    for p in pending
                ],
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# GET APPROVAL STATUS SKILL
# =============================================================================

class GetApprovalStatusSkill(TinyPMSkill):
    """Get status of a specific approval request."""

    name = "get_approval_status"
    description = "Get the current status and details of a specific approval request."
    version = "1.0.0"
    category = SkillCategory.APPROVAL
    triggers = [
        "approval status",
        "check approval",
        "approval details",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["approvals:read"]

    def _setup_parameters(self):
        self.add_parameter(
            name="approval_id",
            type="string",
            description="The approval request ID",
            required=True,
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        approvals = load_approvals()
        if approvals is None:
            return self.error_result(request, error="Failed to load approvals")

        try:
            approval_id = request.parameters["approval_id"]

            # Check pending first
            if approval_id in approvals.get("pending", {}):
                approval = approvals["pending"][approval_id]
                return self.success_result(request, data={
                    "found": True,
                    "status": approval.get("status"),
                    "approval": approval,
                })

            # Check completed
            for completed in approvals.get("completed", []):
                if completed.get("approval_id") == approval_id:
                    return self.success_result(request, data={
                        "found": True,
                        "status": completed.get("status"),
                        "approval": completed,
                    })

            return self.success_result(request, data={
                "found": False,
                "approval_id": approval_id,
                "message": f"Approval {approval_id} not found",
            })

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# APPROVE ACTION SKILL
# =============================================================================

class ApproveActionSkill(TinyPMSkill):
    """Approve a pending action."""

    name = "approve_action"
    description = "Approve a pending action. For multi-party approvals, adds your approval to the list."
    version = "1.0.0"
    category = SkillCategory.APPROVAL
    triggers = [
        "approve",
        "approve action",
        "grant approval",
        "yes approve",
    ]
    risk_level = RiskLevel.INTERNAL  # Approving doesn't execute the action
    required_permissions = ["approvals:approve"]

    def _setup_parameters(self):
        self.add_parameter(
            name="approval_id",
            type="string",
            description="The approval request ID",
            required=True,
        )
        self.add_parameter(
            name="approver_id",
            type="string",
            description="ID of the person approving",
            required=False,
        )
        self.add_parameter(
            name="comment",
            type="string",
            description="Optional comment from approver",
            required=False,
            default="",
        )

    def _setup_examples(self):
        self.add_example(
            intent="Approve the email send request",
            parameters={
                "approval_id": "apr_abc123",
                "comment": "Looks good, approved",
            },
            expected_outcome="Adds approval; if enough approvals, marks as fully approved",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        approvals = load_approvals()
        if approvals is None:
            return self.error_result(request, error="Failed to load approvals")

        try:
            approval_id = request.parameters["approval_id"]
            approver_id = request.parameters.get("approver_id", request.user_id)
            comment = request.parameters.get("comment", "")

            if approval_id not in approvals.get("pending", {}):
                return self.error_result(request, error=f"Approval {approval_id} not found or already completed")

            approval = approvals["pending"][approval_id]

            # Check if already approved by this person
            if approver_id in [a.get("id") for a in approval.get("approvers", [])]:
                return self.error_result(request, error=f"Already approved by {approver_id}")

            # Check if expired
            expires_at = datetime.fromisoformat(approval.get("expires_at", "2000-01-01"))
            if datetime.now() > expires_at:
                approval["status"] = APPROVAL_EXPIRED
                approval["completed_at"] = datetime.now().isoformat()
                approvals["completed"].append(approval)
                del approvals["pending"][approval_id]
                save_approvals(approvals)
                return self.error_result(request, error="Approval request has expired")

            # Add approval
            approval["approvers"].append({
                "id": approver_id,
                "approved_at": datetime.now().isoformat(),
                "comment": comment,
            })

            # Check if fully approved
            if len(approval["approvers"]) >= approval.get("approvers_needed", 1):
                approval["status"] = APPROVAL_APPROVED
                approval["completed_at"] = datetime.now().isoformat()
                approvals["completed"].append(approval)
                del approvals["pending"][approval_id]
                fully_approved = True
            else:
                fully_approved = False

            if not save_approvals(approvals):
                return self.error_result(request, error="Failed to save approval")

            return self.success_result(request, data={
                "approval_id": approval_id,
                "approver": approver_id,
                "fully_approved": fully_approved,
                "approvers_count": len(approval["approvers"]),
                "approvers_needed": approval.get("approvers_needed", 1),
                "status": approval["status"],
                "message": "Fully approved - action can proceed" if fully_approved else f"Approved ({len(approval['approvers'])}/{approval.get('approvers_needed', 1)})",
            })

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# DENY ACTION SKILL
# =============================================================================

class DenyActionSkill(TinyPMSkill):
    """Deny a pending action."""

    name = "deny_action"
    description = "Deny a pending action. This immediately rejects the request."
    version = "1.0.0"
    category = SkillCategory.APPROVAL
    triggers = [
        "deny",
        "deny action",
        "reject",
        "no deny",
    ]
    risk_level = RiskLevel.INTERNAL
    required_permissions = ["approvals:deny"]

    def _setup_parameters(self):
        self.add_parameter(
            name="approval_id",
            type="string",
            description="The approval request ID",
            required=True,
        )
        self.add_parameter(
            name="denier_id",
            type="string",
            description="ID of the person denying",
            required=False,
        )
        self.add_parameter(
            name="reason",
            type="string",
            description="Reason for denial",
            required=True,
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        approvals = load_approvals()
        if approvals is None:
            return self.error_result(request, error="Failed to load approvals")

        try:
            approval_id = request.parameters["approval_id"]
            denier_id = request.parameters.get("denier_id", request.user_id)
            reason = request.parameters["reason"]

            if approval_id not in approvals.get("pending", {}):
                return self.error_result(request, error=f"Approval {approval_id} not found or already completed")

            approval = approvals["pending"][approval_id]

            # Add denial
            approval["deniers"].append({
                "id": denier_id,
                "denied_at": datetime.now().isoformat(),
                "reason": reason,
            })

            approval["status"] = APPROVAL_DENIED
            approval["completed_at"] = datetime.now().isoformat()
            approval["denial_reason"] = reason

            approvals["completed"].append(approval)
            del approvals["pending"][approval_id]

            if not save_approvals(approvals):
                return self.error_result(request, error="Failed to save approval")

            return self.success_result(request, data={
                "approval_id": approval_id,
                "denier": denier_id,
                "status": APPROVAL_DENIED,
                "reason": reason,
                "message": "Action denied and will not be executed",
            })

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# GET APPROVAL HISTORY SKILL
# =============================================================================

class GetApprovalHistorySkill(TinyPMSkill):
    """Get history of completed approvals."""

    name = "get_approval_history"
    description = "Get the history of completed (approved, denied, expired) approval requests."
    version = "1.0.0"
    category = SkillCategory.APPROVAL
    triggers = [
        "approval history",
        "past approvals",
        "completed approvals",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["approvals:read"]

    def _setup_parameters(self):
        self.add_parameter(
            name="status",
            type="string",
            description="Filter by completion status",
            required=False,
            enum=["approved", "denied", "expired", "all"],
            default="all",
        )
        self.add_parameter(
            name="limit",
            type="integer",
            description="Maximum number to return",
            required=False,
            default=50,
            min_value=1,
            max_value=200,
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        approvals = load_approvals()
        if approvals is None:
            return self.error_result(request, error="Failed to load approvals")

        try:
            status_filter = request.parameters.get("status", "all")
            limit = request.parameters.get("limit", 50)

            completed = approvals.get("completed", [])

            # Filter by status
            if status_filter != "all":
                completed = [c for c in completed if c.get("status") == status_filter]

            # Sort by completed_at (newest first)
            completed.sort(key=lambda x: x.get("completed_at", ""), reverse=True)

            # Apply limit
            completed = completed[:limit]

            # Summarize counts
            all_completed = approvals.get("completed", [])
            summary = {
                "approved": len([c for c in all_completed if c.get("status") == APPROVAL_APPROVED]),
                "denied": len([c for c in all_completed if c.get("status") == APPROVAL_DENIED]),
                "expired": len([c for c in all_completed if c.get("status") == APPROVAL_EXPIRED]),
            }

            data = {
                "count": len(completed),
                "filter": status_filter,
                "summary": summary,
                "history": [
                    {
                        "approval_id": c.get("approval_id"),
                        "action_type": c.get("action_type"),
                        "action_description": c.get("action_description"),
                        "status": c.get("status"),
                        "requested_by": c.get("requested_by"),
                        "requested_at": c.get("requested_at"),
                        "completed_at": c.get("completed_at"),
                        "approvers": [a.get("id") for a in c.get("approvers", [])],
                        "denial_reason": c.get("denial_reason"),
                    }
                    for c in completed
                ],
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# ESCALATE APPROVAL SKILL
# =============================================================================

class EscalateApprovalSkill(TinyPMSkill):
    """Escalate an approval to higher authority."""

    name = "escalate_approval"
    description = "Escalate an approval request to require higher authority or more approvers."
    version = "1.0.0"
    category = SkillCategory.APPROVAL
    triggers = [
        "escalate approval",
        "need more approvers",
        "escalate to manager",
    ]
    risk_level = RiskLevel.INTERNAL
    required_permissions = ["approvals:escalate"]

    def _setup_parameters(self):
        self.add_parameter(
            name="approval_id",
            type="string",
            description="The approval request ID",
            required=True,
        )
        self.add_parameter(
            name="additional_approvers",
            type="integer",
            description="Number of additional approvers needed",
            required=False,
            default=1,
            min_value=1,
            max_value=5,
        )
        self.add_parameter(
            name="reason",
            type="string",
            description="Reason for escalation",
            required=True,
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        approvals = load_approvals()
        if approvals is None:
            return self.error_result(request, error="Failed to load approvals")

        try:
            approval_id = request.parameters["approval_id"]
            additional = request.parameters.get("additional_approvers", 1)
            reason = request.parameters["reason"]

            if approval_id not in approvals.get("pending", {}):
                return self.error_result(request, error=f"Approval {approval_id} not found or already completed")

            approval = approvals["pending"][approval_id]

            old_needed = approval.get("approvers_needed", 1)
            approval["approvers_needed"] = old_needed + additional
            approval["status"] = APPROVAL_ESCALATED
            approval["escalation_reason"] = reason
            approval["escalated_at"] = datetime.now().isoformat()

            if not save_approvals(approvals):
                return self.error_result(request, error="Failed to save approval")

            return self.success_result(request, data={
                "approval_id": approval_id,
                "old_approvers_needed": old_needed,
                "new_approvers_needed": approval["approvers_needed"],
                "reason": reason,
                "message": f"Escalated: now requires {approval['approvers_needed']} approvers",
            })

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# AUTO APPROVE RULE SKILL
# =============================================================================

class AutoApproveRuleSkill(TinyPMSkill):
    """Create a rule for auto-approval of certain actions."""

    name = "create_auto_approve_rule"
    description = "Create a rule that auto-approves certain low-risk actions. Requires approval itself."
    version = "1.0.0"
    category = SkillCategory.APPROVAL
    triggers = [
        "auto approve rule",
        "always approve",
        "skip approval for",
    ]
    risk_level = RiskLevel.EXTERNAL  # Creating rules needs approval
    required_permissions = ["approvals:admin"]

    def _setup_parameters(self):
        self.add_parameter(
            name="action_type",
            type="string",
            description="Action type to auto-approve",
            required=True,
        )
        self.add_parameter(
            name="conditions",
            type="object",
            description="Conditions that must be met for auto-approval",
            required=False,
            default={},
        )
        self.add_parameter(
            name="max_risk_level",
            type="string",
            description="Maximum risk level to auto-approve",
            required=False,
            enum=["read_only", "internal"],
            default="internal",
        )
        self.add_parameter(
            name="expires_in_days",
            type="integer",
            description="Days until this rule expires",
            required=False,
            default=30,
            min_value=1,
            max_value=365,
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        approvals = load_approvals()
        if approvals is None:
            return self.error_result(request, error="Failed to load approvals")

        try:
            action_type = request.parameters["action_type"]
            conditions = request.parameters.get("conditions", {})
            max_risk = request.parameters.get("max_risk_level", "internal")
            expires_days = request.parameters.get("expires_in_days", 30)

            # Don't allow auto-approve for external or dangerous
            if max_risk not in ["read_only", "internal"]:
                return self.error_result(
                    request,
                    error="Cannot create auto-approve rules for external or dangerous actions"
                )

            rule = {
                "id": f"rule_{len(approvals.get('auto_approve_rules', []))+1}",
                "action_type": action_type,
                "conditions": conditions,
                "max_risk_level": max_risk,
                "created_by": request.user_id,
                "created_at": datetime.now().isoformat(),
                "expires_at": (datetime.now() + timedelta(days=expires_days)).isoformat(),
                "active": True,
            }

            if "auto_approve_rules" not in approvals:
                approvals["auto_approve_rules"] = []

            approvals["auto_approve_rules"].append(rule)

            if not save_approvals(approvals):
                return self.error_result(request, error="Failed to save rule")

            return self.success_result(request, data={
                "rule_id": rule["id"],
                "action_type": action_type,
                "max_risk_level": max_risk,
                "expires_at": rule["expires_at"],
                "message": f"Auto-approve rule created for '{action_type}'",
            })

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# CANCEL APPROVAL REQUEST SKILL
# =============================================================================

class CancelApprovalSkill(TinyPMSkill):
    """Cancel a pending approval request."""

    name = "cancel_approval"
    description = "Cancel a pending approval request (only the requester can cancel)."
    version = "1.0.0"
    category = SkillCategory.APPROVAL
    triggers = [
        "cancel approval",
        "withdraw approval",
        "cancel request",
    ]
    risk_level = RiskLevel.INTERNAL
    required_permissions = ["approvals:cancel"]

    def _setup_parameters(self):
        self.add_parameter(
            name="approval_id",
            type="string",
            description="The approval request ID",
            required=True,
        )
        self.add_parameter(
            name="reason",
            type="string",
            description="Reason for cancellation",
            required=False,
            default="Cancelled by requester",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        approvals = load_approvals()
        if approvals is None:
            return self.error_result(request, error="Failed to load approvals")

        try:
            approval_id = request.parameters["approval_id"]
            reason = request.parameters.get("reason", "Cancelled by requester")

            if approval_id not in approvals.get("pending", {}):
                return self.error_result(request, error=f"Approval {approval_id} not found or already completed")

            approval = approvals["pending"][approval_id]

            # Only requester can cancel
            if approval.get("requested_by") != request.user_id:
                return self.error_result(
                    request,
                    error="Only the original requester can cancel this approval"
                )

            approval["status"] = APPROVAL_CANCELLED
            approval["completed_at"] = datetime.now().isoformat()
            approval["cancellation_reason"] = reason

            approvals["completed"].append(approval)
            del approvals["pending"][approval_id]

            if not save_approvals(approvals):
                return self.error_result(request, error="Failed to save")

            return self.success_result(request, data={
                "approval_id": approval_id,
                "status": APPROVAL_CANCELLED,
                "reason": reason,
                "message": "Approval request cancelled",
            })

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# REGISTRATION
# =============================================================================

def register_approval_skills():
    """Register all approval skills with the global registry."""
    registry = get_skill_registry()

    skills = [
        RequestApprovalSkill(),
        ListPendingApprovalsSkill(),
        GetApprovalStatusSkill(),
        ApproveActionSkill(),
        DenyActionSkill(),
        GetApprovalHistorySkill(),
        EscalateApprovalSkill(),
        AutoApproveRuleSkill(),
        CancelApprovalSkill(),
    ]

    for skill in skills:
        registry.register(skill)

    print(f"[ApprovalSkill] Registered {len(skills)} approval skills")
    return skills


# Auto-register on import
register_approval_skills()
