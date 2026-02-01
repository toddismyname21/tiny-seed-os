"""
TinyPM Email Skills - Gmail Integration Skills
==============================================

Wraps email_integration.py functionality with skill interface.

Skills included:
- read_unread_emails: Read unread emails from inbox (READ_ONLY)
- read_urgent_emails: Get urgent emails needing attention (READ_ONLY)
- get_email_context: Get email context for PM decisions (READ_ONLY)
- draft_email_reply: Draft a reply to an email (INTERNAL)
- send_email_draft: Send a prepared draft (EXTERNAL)
- get_email_by_id: Get a specific email by ID (READ_ONLY)
- mark_email_read: Mark an email as read (INTERNAL)
- extract_action_items: Extract action items from email (READ_ONLY)

Created: 2026-01-30
Author: Builder Agent
Security: Gmail scopes only - NEVER accesses Sheets/Drive
"""

import sys
from pathlib import Path
from datetime import datetime
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

# Import email integration
try:
    from email_integration import (
        get_email_integration,
        EmailIntegration,
        EmailMessage,
    )
    EMAIL_AVAILABLE = True
except ImportError:
    EMAIL_AVAILABLE = False
    print("[EmailSkill] Warning: email_integration not available")


# =============================================================================
# READ UNREAD EMAILS SKILL
# =============================================================================

class ReadUnreadEmailsSkill(TinyPMSkill):
    """Read unread emails from inbox."""

    name = "read_unread_emails"
    description = "Read unread emails from Gmail inbox. Returns list of unread emails with subject, sender, snippet, and urgency."
    version = "1.0.0"
    category = SkillCategory.COMMUNICATION
    triggers = [
        "read emails",
        "check emails",
        "get unread emails",
        "show my emails",
        "check inbox",
        "unread messages",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["email:read"]
    rate_limit = 10  # Max 10 calls per minute
    cooldown_seconds = 5

    def _setup_parameters(self):
        self.add_parameter(
            name="max_results",
            type="integer",
            description="Maximum number of emails to return",
            required=False,
            default=20,
            min_value=1,
            max_value=50,
        )
        self.add_parameter(
            name="user_id",
            type="string",
            description="User ID for email account (defaults to 'default')",
            required=False,
            default="default",
        )

    def _setup_examples(self):
        self.add_example(
            intent="Check my unread emails",
            parameters={"max_results": 10},
            expected_outcome="Returns list of up to 10 unread emails",
        )
        self.add_example(
            intent="Show all my inbox messages",
            parameters={"max_results": 50},
            expected_outcome="Returns list of up to 50 unread emails",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        if not EMAIL_AVAILABLE:
            return self.error_result(
                request,
                error="Email integration not available",
            )

        try:
            user_id = request.parameters.get("user_id", "default")
            max_results = request.parameters.get("max_results", 20)

            email_client = get_email_integration(user_id)

            if not email_client.is_connected():
                return self.error_result(
                    request,
                    error="Email not connected. Please authenticate with Gmail first.",
                )

            emails = email_client.get_unread_emails(max_results=max_results)

            data = {
                "count": len(emails),
                "emails": [
                    {
                        "id": e.id,
                        "thread_id": e.thread_id,
                        "subject": e.subject,
                        "sender": e.sender,
                        "sender_email": e.sender_email,
                        "snippet": e.snippet[:150],
                        "date": e.date.isoformat(),
                        "is_unread": e.is_unread,
                        "urgency_score": e.get_urgency_score(),
                        "needs_response": e.needs_response(),
                    }
                    for e in emails
                ],
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# READ URGENT EMAILS SKILL
# =============================================================================

class ReadUrgentEmailsSkill(TinyPMSkill):
    """Get urgent emails that need immediate attention."""

    name = "read_urgent_emails"
    description = "Get urgent emails with high urgency scores. These are emails that likely need immediate attention."
    version = "1.0.0"
    category = SkillCategory.COMMUNICATION
    triggers = [
        "urgent emails",
        "important emails",
        "emails needing attention",
        "priority emails",
        "critical emails",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["email:read"]
    cooldown_seconds = 5

    def _setup_parameters(self):
        self.add_parameter(
            name="urgency_threshold",
            type="integer",
            description="Minimum urgency score (1-5, where 5 is most urgent)",
            required=False,
            default=4,
            min_value=1,
            max_value=5,
        )
        self.add_parameter(
            name="user_id",
            type="string",
            description="User ID for email account",
            required=False,
            default="default",
        )

    def _setup_examples(self):
        self.add_example(
            intent="Show me urgent emails",
            parameters={"urgency_threshold": 4},
            expected_outcome="Returns emails with urgency score >= 4",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        if not EMAIL_AVAILABLE:
            return self.error_result(request, error="Email integration not available")

        try:
            user_id = request.parameters.get("user_id", "default")
            threshold = request.parameters.get("urgency_threshold", 4)

            email_client = get_email_integration(user_id)

            if not email_client.is_connected():
                return self.error_result(
                    request,
                    error="Email not connected",
                )

            emails = email_client.get_urgent_emails(threshold=threshold)

            data = {
                "count": len(emails),
                "urgency_threshold": threshold,
                "urgent_emails": [
                    {
                        "id": e.id,
                        "subject": e.subject,
                        "sender": e.sender,
                        "sender_email": e.sender_email,
                        "snippet": e.snippet[:150],
                        "urgency_score": e.get_urgency_score(),
                        "needs_response": e.needs_response(),
                        "date": e.date.isoformat(),
                    }
                    for e in emails
                ],
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# GET EMAIL CONTEXT SKILL
# =============================================================================

class GetEmailContextSkill(TinyPMSkill):
    """Get email context for PM decision making."""

    name = "get_email_context"
    description = "Get comprehensive email context including unread count, urgent emails, action items. Used for proactive PM suggestions."
    version = "1.0.0"
    category = SkillCategory.COMMUNICATION
    triggers = [
        "email context",
        "email summary",
        "email status",
        "inbox overview",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["email:read"]
    cooldown_seconds = 10

    def _setup_parameters(self):
        self.add_parameter(
            name="user_id",
            type="string",
            description="User ID for email account",
            required=False,
            default="default",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        if not EMAIL_AVAILABLE:
            return self.error_result(request, error="Email integration not available")

        try:
            user_id = request.parameters.get("user_id", "default")
            email_client = get_email_integration(user_id)

            context = email_client.get_email_context_for_pm()

            return self.success_result(request, data=context)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# GET EMAIL BY ID SKILL
# =============================================================================

class GetEmailByIdSkill(TinyPMSkill):
    """Get a specific email by its ID."""

    name = "get_email_by_id"
    description = "Retrieve a specific email by its Gmail message ID. Returns full email details including body."
    version = "1.0.0"
    category = SkillCategory.COMMUNICATION
    triggers = [
        "get email",
        "read email",
        "open email",
        "show email",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["email:read"]

    def _setup_parameters(self):
        self.add_parameter(
            name="email_id",
            type="string",
            description="Gmail message ID",
            required=True,
        )
        self.add_parameter(
            name="user_id",
            type="string",
            description="User ID for email account",
            required=False,
            default="default",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        if not EMAIL_AVAILABLE:
            return self.error_result(request, error="Email integration not available")

        try:
            email_id = request.parameters["email_id"]
            user_id = request.parameters.get("user_id", "default")

            email_client = get_email_integration(user_id)

            if not email_client.is_connected():
                return self.error_result(request, error="Email not connected")

            email = email_client.get_email_by_id(email_id)

            if not email:
                return self.error_result(request, error=f"Email {email_id} not found")

            data = {
                "id": email.id,
                "thread_id": email.thread_id,
                "subject": email.subject,
                "sender": email.sender,
                "sender_email": email.sender_email,
                "body": email.body,
                "snippet": email.snippet,
                "date": email.date.isoformat(),
                "is_unread": email.is_unread,
                "labels": email.labels,
                "urgency_score": email.get_urgency_score(),
                "needs_response": email.needs_response(),
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# DRAFT EMAIL REPLY SKILL
# =============================================================================

class DraftEmailReplySkill(TinyPMSkill):
    """Draft a reply to an email (does not send)."""

    name = "draft_email_reply"
    description = "Create a draft reply to an email. The draft is saved but NOT sent - requires separate approval to send."
    version = "1.0.0"
    category = SkillCategory.COMMUNICATION
    triggers = [
        "draft reply",
        "write reply",
        "compose reply",
        "prepare response",
    ]
    risk_level = RiskLevel.INTERNAL  # Creates draft, doesn't send
    required_permissions = ["email:read", "email:compose"]
    cooldown_seconds = 10

    def _setup_parameters(self):
        self.add_parameter(
            name="email_id",
            type="string",
            description="Gmail message ID of email to reply to",
            required=True,
        )
        self.add_parameter(
            name="reply_text",
            type="string",
            description="The reply text content",
            required=True,
        )
        self.add_parameter(
            name="user_id",
            type="string",
            description="User ID for email account",
            required=False,
            default="default",
        )

    def _setup_examples(self):
        self.add_example(
            intent="Draft a reply to that email",
            parameters={
                "email_id": "abc123",
                "reply_text": "Thank you for your message. I'll review this and get back to you.",
            },
            expected_outcome="Creates a draft reply in Gmail (not sent)",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        if not EMAIL_AVAILABLE:
            return self.error_result(request, error="Email integration not available")

        try:
            email_id = request.parameters["email_id"]
            reply_text = request.parameters["reply_text"]
            user_id = request.parameters.get("user_id", "default")

            email_client = get_email_integration(user_id)

            if not email_client.is_connected():
                return self.error_result(request, error="Email not connected")

            # Get original email
            original_email = email_client.get_email_by_id(email_id)
            if not original_email:
                return self.error_result(request, error=f"Email {email_id} not found")

            # Create draft
            draft_id = email_client.draft_reply(original_email, reply_text)

            if not draft_id:
                return self.error_result(request, error="Failed to create draft")

            data = {
                "draft_id": draft_id,
                "in_reply_to": original_email.subject,
                "to": original_email.sender_email,
                "reply_text": reply_text[:200] + "..." if len(reply_text) > 200 else reply_text,
                "status": "draft_created",
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# DRAFT EMAIL IN USER VOICE SKILL
# =============================================================================

class DraftEmailInVoiceSkill(TinyPMSkill):
    """Draft a reply in the user's voice using AI."""

    name = "draft_email_in_voice"
    description = "Draft a reply to an email using AI to match the user's writing style. Requires Claude API key."
    version = "1.0.0"
    category = SkillCategory.COMMUNICATION
    triggers = [
        "ai draft reply",
        "smart reply",
        "generate reply",
        "write reply for me",
    ]
    risk_level = RiskLevel.INTERNAL
    required_permissions = ["email:read", "email:compose", "ai:use"]
    cooldown_seconds = 15

    def _setup_parameters(self):
        self.add_parameter(
            name="email_id",
            type="string",
            description="Gmail message ID of email to reply to",
            required=True,
        )
        self.add_parameter(
            name="context",
            type="string",
            description="Additional context for the reply (optional)",
            required=False,
            default="",
        )
        self.add_parameter(
            name="user_id",
            type="string",
            description="User ID for email account",
            required=False,
            default="default",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        if not EMAIL_AVAILABLE:
            return self.error_result(request, error="Email integration not available")

        import os
        claude_api_key = os.environ.get("ANTHROPIC_API_KEY")

        try:
            email_id = request.parameters["email_id"]
            context = request.parameters.get("context", "")
            user_id = request.parameters.get("user_id", "default")

            email_client = get_email_integration(user_id)

            if not email_client.is_connected():
                return self.error_result(request, error="Email not connected")

            # Get original email
            original_email = email_client.get_email_by_id(email_id)
            if not original_email:
                return self.error_result(request, error=f"Email {email_id} not found")

            # Draft in user's voice
            result = email_client.draft_reply_in_user_voice(
                original_email,
                context=context,
                claude_api_key=claude_api_key,
            )

            if not result:
                return self.error_result(request, error="Failed to create AI draft")

            data = {
                "draft_id": result["draft_id"],
                "to": result["to"],
                "subject": result["subject"],
                "draft_text": result["draft_text"][:500] + "..." if len(result["draft_text"]) > 500 else result["draft_text"],
                "status": "ai_draft_created",
                "ai_generated": True,
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# MARK EMAIL READ SKILL
# =============================================================================

class MarkEmailReadSkill(TinyPMSkill):
    """Mark an email as read."""

    name = "mark_email_read"
    description = "Mark an email as read in Gmail."
    version = "1.0.0"
    category = SkillCategory.COMMUNICATION
    triggers = [
        "mark as read",
        "mark read",
        "dismiss email",
    ]
    risk_level = RiskLevel.INTERNAL
    required_permissions = ["email:modify"]

    def _setup_parameters(self):
        self.add_parameter(
            name="email_id",
            type="string",
            description="Gmail message ID",
            required=True,
        )
        self.add_parameter(
            name="user_id",
            type="string",
            description="User ID for email account",
            required=False,
            default="default",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        if not EMAIL_AVAILABLE:
            return self.error_result(request, error="Email integration not available")

        try:
            email_id = request.parameters["email_id"]
            user_id = request.parameters.get("user_id", "default")

            email_client = get_email_integration(user_id)

            if not email_client.is_connected():
                return self.error_result(request, error="Email not connected")

            success = email_client.mark_as_read(email_id)

            if not success:
                return self.error_result(request, error=f"Failed to mark email {email_id} as read")

            return self.success_result(request, data={"email_id": email_id, "marked_read": True})

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# EXTRACT ACTION ITEMS SKILL
# =============================================================================

class ExtractActionItemsSkill(TinyPMSkill):
    """Extract action items from an email."""

    name = "extract_email_action_items"
    description = "Extract potential action items and tasks from an email using heuristics."
    version = "1.0.0"
    category = SkillCategory.COMMUNICATION
    triggers = [
        "extract tasks from email",
        "email action items",
        "what do I need to do",
        "email tasks",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["email:read"]

    def _setup_parameters(self):
        self.add_parameter(
            name="email_id",
            type="string",
            description="Gmail message ID",
            required=True,
        )
        self.add_parameter(
            name="user_id",
            type="string",
            description="User ID for email account",
            required=False,
            default="default",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        if not EMAIL_AVAILABLE:
            return self.error_result(request, error="Email integration not available")

        try:
            email_id = request.parameters["email_id"]
            user_id = request.parameters.get("user_id", "default")

            email_client = get_email_integration(user_id)

            if not email_client.is_connected():
                return self.error_result(request, error="Email not connected")

            email = email_client.get_email_by_id(email_id)
            if not email:
                return self.error_result(request, error=f"Email {email_id} not found")

            action_items = email_client.extract_action_items(email)

            data = {
                "email_id": email_id,
                "subject": email.subject,
                "sender": email.sender,
                "action_items": action_items,
                "count": len(action_items),
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# GET EMAIL THREAD SKILL
# =============================================================================

class GetEmailThreadSkill(TinyPMSkill):
    """Get all messages in an email thread."""

    name = "get_email_thread"
    description = "Get all messages in an email conversation thread."
    version = "1.0.0"
    category = SkillCategory.COMMUNICATION
    triggers = [
        "email thread",
        "email conversation",
        "full thread",
        "conversation history",
    ]
    risk_level = RiskLevel.READ_ONLY
    required_permissions = ["email:read"]

    def _setup_parameters(self):
        self.add_parameter(
            name="thread_id",
            type="string",
            description="Gmail thread ID",
            required=True,
        )
        self.add_parameter(
            name="user_id",
            type="string",
            description="User ID for email account",
            required=False,
            default="default",
        )

    def execute(self, request: SkillExecutionRequest) -> SkillExecutionResult:
        if not EMAIL_AVAILABLE:
            return self.error_result(request, error="Email integration not available")

        try:
            thread_id = request.parameters["thread_id"]
            user_id = request.parameters.get("user_id", "default")

            email_client = get_email_integration(user_id)

            if not email_client.is_connected():
                return self.error_result(request, error="Email not connected")

            emails = email_client.get_thread(thread_id)

            data = {
                "thread_id": thread_id,
                "message_count": len(emails),
                "messages": [
                    {
                        "id": e.id,
                        "subject": e.subject,
                        "sender": e.sender,
                        "sender_email": e.sender_email,
                        "snippet": e.snippet[:150],
                        "date": e.date.isoformat(),
                    }
                    for e in emails
                ],
            }

            return self.success_result(request, data=data)

        except Exception as e:
            return self.error_result(request, error=str(e))


# =============================================================================
# REGISTRATION
# =============================================================================

def register_email_skills():
    """Register all email skills with the global registry."""
    registry = get_skill_registry()

    skills = [
        ReadUnreadEmailsSkill(),
        ReadUrgentEmailsSkill(),
        GetEmailContextSkill(),
        GetEmailByIdSkill(),
        DraftEmailReplySkill(),
        DraftEmailInVoiceSkill(),
        MarkEmailReadSkill(),
        ExtractActionItemsSkill(),
        GetEmailThreadSkill(),
    ]

    for skill in skills:
        registry.register(skill)

    print(f"[EmailSkill] Registered {len(skills)} email skills")
    return skills


# Auto-register on import
if EMAIL_AVAILABLE:
    register_email_skills()
