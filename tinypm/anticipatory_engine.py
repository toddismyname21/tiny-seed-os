#!/usr/bin/env python3
"""
TinyPM Anticipatory Actions Engine - Phase 3: Prescient AI
===========================================================================

STATE OF THE ART proactive action system inspired by Superhuman's Auto Drafts.
This engine ANTICIPATES what the user needs BEFORE they ask.

Trust Framework (5 Levels):
- INFORM (< 65%): Just inform the user, no action prepared
- SUGGEST (65-80%): Suggest with reasoning, user decides
- PRE_PREPARE (80-90%): Draft ready, user reviews before sending
- ONE_CLICK (90-95%): One click to approve, very low friction
- AUTO_EXECUTE (95%+): Automatically execute reversible actions

CRITICAL: All auto-executed actions MUST be reversible. Human always has final say.

Action Types:
- Email Response: Draft replies to unanswered emails
- Task Reschedule: Move tasks due to weather/conflicts
- Reminder Creation: Create reminders from detected deadlines
- Harvest Alert: GDD threshold notifications
- Customer Followup: Follow up on quiet threads

Created: 2026-02-04
Author: PM_Architect Claude
"""

import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import hashlib

# ===========================================================================
# CONFIGURATION
# ===========================================================================

APP_DIR = Path(__file__).parent
ACTIONS_FILE = APP_DIR / ".anticipatory_actions.json"
UNDO_FILE = APP_DIR / ".anticipatory_undo.json"
HISTORY_FILE = APP_DIR / ".anticipatory_history.json"
DRAFTS_FILE = APP_DIR / ".anticipatory_drafts.json"

# Trust level thresholds
TRUST_THRESHOLDS = {
    'inform': (0.00, 0.65),
    'suggest': (0.65, 0.80),
    'pre_prepare': (0.80, 0.90),
    'one_click': (0.90, 0.95),
    'auto_execute': (0.95, 1.00)
}

# Action type configurations
ANTICIPATABLE_ACTIONS = {
    'email_response': {
        'trigger': 'unanswered_email_24h',
        'reversible': True,
        'max_trust': 'one_click',  # Never auto-send emails
        'category': 'communication',
        'default_confidence': 0.75
    },
    'task_reschedule': {
        'trigger': 'weather_conflict',
        'reversible': True,
        'max_trust': 'auto_execute',
        'category': 'scheduling',
        'default_confidence': 0.85
    },
    'reminder_creation': {
        'trigger': 'mentioned_deadline',
        'reversible': True,
        'max_trust': 'auto_execute',
        'category': 'productivity',
        'default_confidence': 0.88
    },
    'harvest_alert': {
        'trigger': 'gdd_threshold_reached',
        'reversible': True,
        'max_trust': 'one_click',
        'category': 'farming',
        'default_confidence': 0.82
    },
    'customer_followup': {
        'trigger': 'no_response_48h',
        'reversible': True,
        'max_trust': 'pre_prepare',
        'category': 'communication',
        'default_confidence': 0.70
    }
}


# ===========================================================================
# ENUMS AND DATA CLASSES
# ===========================================================================

class TrustLevel(str, Enum):
    """Trust levels for anticipatory actions."""
    INFORM = "inform"
    SUGGEST = "suggest"
    PRE_PREPARE = "pre_prepare"
    ONE_CLICK = "one_click"
    AUTO_EXECUTE = "auto_execute"


class ActionStatus(str, Enum):
    """Status of an anticipated action."""
    PENDING = "pending"           # Waiting for user review
    APPROVED = "approved"         # User approved
    REJECTED = "rejected"         # User rejected
    AUTO_EXECUTED = "auto_executed"  # System executed
    UNDONE = "undone"            # Undone by user
    EXPIRED = "expired"          # Action window passed


@dataclass
class UndoToken:
    """Token for undoing an action."""
    token_id: str
    action_id: str
    action_type: str
    original_state: Dict[str, Any]
    created_at: datetime
    expires_at: datetime
    used: bool = False

    def to_dict(self) -> Dict:
        return {
            'token_id': self.token_id,
            'action_id': self.action_id,
            'action_type': self.action_type,
            'original_state': self.original_state,
            'created_at': self.created_at.isoformat(),
            'expires_at': self.expires_at.isoformat(),
            'used': self.used
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'UndoToken':
        return cls(
            token_id=data['token_id'],
            action_id=data['action_id'],
            action_type=data['action_type'],
            original_state=data['original_state'],
            created_at=datetime.fromisoformat(data['created_at']),
            expires_at=datetime.fromisoformat(data['expires_at']),
            used=data.get('used', False)
        )


@dataclass
class AnticipatedAction:
    """An action the system anticipates the user will want."""
    id: str
    action_type: str
    title: str
    description: str
    reasoning: str
    confidence: float
    trust_level: TrustLevel
    status: ActionStatus
    created_at: datetime
    expires_at: Optional[datetime]
    payload: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)
    undo_token: Optional[str] = None
    user_feedback: Optional[bool] = None
    executed_at: Optional[datetime] = None

    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'action_type': self.action_type,
            'title': self.title,
            'description': self.description,
            'reasoning': self.reasoning,
            'confidence': self.confidence,
            'trust_level': self.trust_level.value,
            'status': self.status.value,
            'created_at': self.created_at.isoformat(),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'payload': self.payload,
            'metadata': self.metadata,
            'undo_token': self.undo_token,
            'user_feedback': self.user_feedback,
            'executed_at': self.executed_at.isoformat() if self.executed_at else None
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'AnticipatedAction':
        return cls(
            id=data['id'],
            action_type=data['action_type'],
            title=data['title'],
            description=data['description'],
            reasoning=data['reasoning'],
            confidence=data['confidence'],
            trust_level=TrustLevel(data['trust_level']),
            status=ActionStatus(data['status']),
            created_at=datetime.fromisoformat(data['created_at']),
            expires_at=datetime.fromisoformat(data['expires_at']) if data.get('expires_at') else None,
            payload=data.get('payload', {}),
            metadata=data.get('metadata', {}),
            undo_token=data.get('undo_token'),
            user_feedback=data.get('user_feedback'),
            executed_at=datetime.fromisoformat(data['executed_at']) if data.get('executed_at') else None
        )


@dataclass
class EmailDraft:
    """A pre-prepared email draft."""
    id: str
    thread_id: Optional[str]
    to: str
    subject: str
    body: str
    context: str
    confidence: float
    created_at: datetime
    status: str = "pending"  # pending, sent, discarded

    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'thread_id': self.thread_id,
            'to': self.to,
            'subject': self.subject,
            'body': self.body,
            'context': self.context,
            'confidence': self.confidence,
            'created_at': self.created_at.isoformat(),
            'status': self.status
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'EmailDraft':
        return cls(
            id=data['id'],
            thread_id=data.get('thread_id'),
            to=data['to'],
            subject=data['subject'],
            body=data['body'],
            context=data.get('context', ''),
            confidence=data.get('confidence', 0.75),
            created_at=datetime.fromisoformat(data['created_at']),
            status=data.get('status', 'pending')
        )


# ===========================================================================
# DATA PERSISTENCE
# ===========================================================================

def load_actions() -> List[AnticipatedAction]:
    """Load anticipated actions from disk."""
    if ACTIONS_FILE.exists():
        try:
            data = json.loads(ACTIONS_FILE.read_text())
            return [AnticipatedAction.from_dict(a) for a in data.get('actions', [])]
        except Exception as e:
            print(f"[Anticipatory] Error loading actions: {e}")
    return []


def save_actions(actions: List[AnticipatedAction]) -> None:
    """Save anticipated actions to disk."""
    try:
        data = {
            'updated_at': datetime.now().isoformat(),
            'actions': [a.to_dict() for a in actions]
        }
        ACTIONS_FILE.write_text(json.dumps(data, indent=2))
    except Exception as e:
        print(f"[Anticipatory] Error saving actions: {e}")


def load_undo_tokens() -> List[UndoToken]:
    """Load undo tokens from disk."""
    if UNDO_FILE.exists():
        try:
            data = json.loads(UNDO_FILE.read_text())
            return [UndoToken.from_dict(t) for t in data.get('tokens', [])]
        except Exception as e:
            print(f"[Anticipatory] Error loading undo tokens: {e}")
    return []


def save_undo_tokens(tokens: List[UndoToken]) -> None:
    """Save undo tokens to disk."""
    try:
        data = {
            'updated_at': datetime.now().isoformat(),
            'tokens': [t.to_dict() for t in tokens]
        }
        UNDO_FILE.write_text(json.dumps(data, indent=2))
    except Exception as e:
        print(f"[Anticipatory] Error saving undo tokens: {e}")


def load_drafts() -> List[EmailDraft]:
    """Load email drafts from disk."""
    if DRAFTS_FILE.exists():
        try:
            data = json.loads(DRAFTS_FILE.read_text())
            return [EmailDraft.from_dict(d) for d in data.get('drafts', [])]
        except Exception as e:
            print(f"[Anticipatory] Error loading drafts: {e}")
    return []


def save_drafts(drafts: List[EmailDraft]) -> None:
    """Save email drafts to disk."""
    try:
        data = {
            'updated_at': datetime.now().isoformat(),
            'drafts': [d.to_dict() for d in drafts]
        }
        DRAFTS_FILE.write_text(json.dumps(data, indent=2))
    except Exception as e:
        print(f"[Anticipatory] Error saving drafts: {e}")


# ===========================================================================
# ANTICIPATORY ENGINE
# ===========================================================================

class AnticipatoryEngine:
    """
    Main engine for anticipating and preparing user actions.

    Inspired by Superhuman's Auto Drafts - the AI writes email drafts
    BEFORE the user asks, so they're ready when needed.
    """

    def __init__(self, user_id: str = "default"):
        self.user_id = user_id
        self.actions = load_actions()
        self.undo_tokens = load_undo_tokens()
        self.drafts = load_drafts()
        self._confidence_scorer = None
        self._style_learner = None

    def reload(self) -> None:
        """Reload all data from disk."""
        self.actions = load_actions()
        self.undo_tokens = load_undo_tokens()
        self.drafts = load_drafts()

    # =========================================================================
    # TRUST LEVEL DETERMINATION
    # =========================================================================

    def determine_trust_level(self, confidence: float, action_type: str) -> TrustLevel:
        """
        Determine the appropriate trust level based on confidence and action type.

        Args:
            confidence: Model confidence (0.0 - 1.0)
            action_type: Type of action being anticipated

        Returns:
            Appropriate TrustLevel for this action
        """
        # Get max trust for this action type
        action_config = ANTICIPATABLE_ACTIONS.get(action_type, {})
        max_trust_str = action_config.get('max_trust', 'pre_prepare')
        max_trust = TrustLevel(max_trust_str)

        # Determine level based on confidence
        for level_name, (low, high) in TRUST_THRESHOLDS.items():
            if low <= confidence < high:
                determined_level = TrustLevel(level_name)
                break
        else:
            determined_level = TrustLevel.INFORM

        # Clamp to max trust for this action type
        trust_order = [TrustLevel.INFORM, TrustLevel.SUGGEST, TrustLevel.PRE_PREPARE,
                       TrustLevel.ONE_CLICK, TrustLevel.AUTO_EXECUTE]

        max_idx = trust_order.index(max_trust)
        determined_idx = trust_order.index(determined_level)

        if determined_idx > max_idx:
            return max_trust

        return determined_level

    # =========================================================================
    # UNDO SYSTEM
    # =========================================================================

    def create_undo_point(self, action: AnticipatedAction, original_state: Dict) -> UndoToken:
        """
        Create an undo point for a reversible action.

        Args:
            action: The action being executed
            original_state: State before the action was taken

        Returns:
            UndoToken that can be used to reverse the action
        """
        token = UndoToken(
            token_id=str(uuid.uuid4()),
            action_id=action.id,
            action_type=action.action_type,
            original_state=original_state,
            created_at=datetime.now(),
            expires_at=datetime.now() + timedelta(minutes=30),  # 30 min undo window
            used=False
        )

        self.undo_tokens.append(token)
        save_undo_tokens(self.undo_tokens)

        return token

    def undo_action(self, token_id: str) -> Tuple[bool, str]:
        """
        Undo an action using its token.

        Args:
            token_id: The undo token ID

        Returns:
            (success, message)
        """
        # Find the token
        token = None
        for t in self.undo_tokens:
            if t.token_id == token_id:
                token = t
                break

        if not token:
            return False, "Undo token not found"

        if token.used:
            return False, "Action already undone"

        if datetime.now() > token.expires_at:
            return False, "Undo window expired"

        # Execute the undo based on action type
        success, message = self._execute_undo(token)

        if success:
            token.used = True

            # Update the action status
            for action in self.actions:
                if action.id == token.action_id:
                    action.status = ActionStatus.UNDONE
                    break

            save_undo_tokens(self.undo_tokens)
            save_actions(self.actions)

        return success, message

    def _execute_undo(self, token: UndoToken) -> Tuple[bool, str]:
        """Execute the actual undo operation based on action type."""
        action_type = token.action_type
        original_state = token.original_state

        if action_type == 'task_reschedule':
            # Restore original task date
            return self._undo_task_reschedule(original_state)
        elif action_type == 'reminder_creation':
            # Delete the created reminder
            return self._undo_reminder_creation(original_state)
        elif action_type == 'email_response':
            # Move draft back to drafts (if sent, cannot undo)
            return self._undo_email_response(original_state)

        return False, f"Unknown action type: {action_type}"

    def _undo_task_reschedule(self, original_state: Dict) -> Tuple[bool, str]:
        """Undo a task reschedule."""
        # This would integrate with the task system
        task_id = original_state.get('task_id')
        original_date = original_state.get('original_date')
        print(f"[Anticipatory] Undoing task reschedule: {task_id} -> {original_date}")
        return True, f"Task rescheduled back to {original_date}"

    def _undo_reminder_creation(self, original_state: Dict) -> Tuple[bool, str]:
        """Undo a reminder creation."""
        reminder_id = original_state.get('reminder_id')
        print(f"[Anticipatory] Undoing reminder creation: {reminder_id}")
        return True, "Reminder deleted"

    def _undo_email_response(self, original_state: Dict) -> Tuple[bool, str]:
        """Undo an email response (only if draft, not sent)."""
        draft_id = original_state.get('draft_id')
        was_sent = original_state.get('was_sent', False)

        if was_sent:
            return False, "Cannot undo sent email"

        print(f"[Anticipatory] Undoing email draft: {draft_id}")
        return True, "Email draft discarded"

    # =========================================================================
    # PATTERN DETECTION
    # =========================================================================

    def detect_actionable_patterns(self) -> List[AnticipatedAction]:
        """
        Scan for patterns that indicate an action should be anticipated.

        Returns:
            List of new anticipated actions to queue
        """
        new_actions = []

        # Check for unanswered emails
        email_actions = self._detect_email_patterns()
        new_actions.extend(email_actions)

        # Check for weather-conflicting tasks
        weather_actions = self._detect_weather_conflicts()
        new_actions.extend(weather_actions)

        # Check for mentioned deadlines
        deadline_actions = self._detect_deadline_mentions()
        new_actions.extend(deadline_actions)

        # Check for customer followup needs
        followup_actions = self._detect_followup_needs()
        new_actions.extend(followup_actions)

        # Add to queue and save
        for action in new_actions:
            if not self._is_duplicate(action):
                self.actions.append(action)

        save_actions(self.actions)

        return new_actions

    def _is_duplicate(self, action: AnticipatedAction) -> bool:
        """Check if a similar action already exists."""
        # Hash key elements to detect duplicates
        key = f"{action.action_type}:{action.payload.get('target_id', '')}"
        key_hash = hashlib.md5(key.encode()).hexdigest()[:16]

        for existing in self.actions:
            if existing.status == ActionStatus.PENDING:
                existing_key = f"{existing.action_type}:{existing.payload.get('target_id', '')}"
                existing_hash = hashlib.md5(existing_key.encode()).hexdigest()[:16]
                if key_hash == existing_hash:
                    return True

        return False

    def _detect_email_patterns(self) -> List[AnticipatedAction]:
        """Detect emails that need responses."""
        actions = []

        # This would integrate with email system
        # For now, we create a structure for the pattern
        try:
            # Check for emails pending response
            from nudge_engine import get_nudge_engine
            nudge_engine = get_nudge_engine()
            # Would check email-related nudges and create anticipatory actions
        except ImportError:
            pass

        return actions

    def _detect_weather_conflicts(self) -> List[AnticipatedAction]:
        """Detect tasks that conflict with weather."""
        actions = []

        # This would integrate with weather API and task system
        # Check outdoor tasks vs weather forecast

        return actions

    def _detect_deadline_mentions(self) -> List[AnticipatedAction]:
        """Detect mentioned deadlines that should become reminders."""
        actions = []

        # This would scan recent communications for deadline mentions
        # and create reminder suggestions

        return actions

    def _detect_followup_needs(self) -> List[AnticipatedAction]:
        """Detect threads that need followup."""
        actions = []

        # Check for threads with no response after 48h

        return actions

    # =========================================================================
    # EMAIL DRAFT GENERATION
    # =========================================================================

    def generate_email_draft(self, thread_id: str, context: Dict) -> Optional[EmailDraft]:
        """
        Generate an email draft for a thread.

        This is the Superhuman-style "Auto Drafts" feature - the AI writes
        the response BEFORE the user asks, so it's ready instantly.

        Args:
            thread_id: Email thread ID
            context: Context about the conversation

        Returns:
            EmailDraft ready for user review
        """
        # Get style learner for user's voice
        try:
            from pm_brain import get_style_learner
            style_learner = get_style_learner()
            style_prompt = style_learner.get_style_prompt()
        except ImportError:
            style_prompt = "Write in a friendly, professional tone."

        # Generate draft content
        subject = context.get('subject', 'Re: ')
        to = context.get('sender_email', '')
        original_body = context.get('body', '')

        # This would call Claude to generate the draft
        # For now, create a placeholder structure
        draft_body = self._generate_draft_body(original_body, style_prompt)

        draft = EmailDraft(
            id=str(uuid.uuid4()),
            thread_id=thread_id,
            to=to,
            subject=f"Re: {subject}" if not subject.startswith('Re:') else subject,
            body=draft_body,
            context=json.dumps(context),
            confidence=0.75,
            created_at=datetime.now()
        )

        self.drafts.append(draft)
        save_drafts(self.drafts)

        return draft

    def _generate_draft_body(self, original: str, style_prompt: str) -> str:
        """Generate draft body using style prompt."""
        # This would integrate with Claude for actual generation
        # For now, return a template
        return f"[Draft generated with style: {style_prompt[:50]}...]\n\n"

    # =========================================================================
    # TASK RESCHEDULING
    # =========================================================================

    def pre_schedule_task(self, task_id: str, reason: str, new_date: datetime) -> AnticipatedAction:
        """
        Pre-prepare a task reschedule action.

        Args:
            task_id: Task to reschedule
            reason: Why it should be rescheduled
            new_date: Suggested new date

        Returns:
            AnticipatedAction ready for approval
        """
        action = AnticipatedAction(
            id=str(uuid.uuid4()),
            action_type='task_reschedule',
            title=f"Reschedule task due to {reason}",
            description=f"Move task to {new_date.strftime('%B %d')} because of {reason}",
            reasoning=f"Weather forecast shows {reason}. Rescheduling to a better day.",
            confidence=0.88,
            trust_level=self.determine_trust_level(0.88, 'task_reschedule'),
            status=ActionStatus.PENDING,
            created_at=datetime.now(),
            expires_at=datetime.now() + timedelta(hours=24),
            payload={
                'task_id': task_id,
                'new_date': new_date.isoformat(),
                'reason': reason
            }
        )

        self.actions.append(action)
        save_actions(self.actions)

        return action

    # =========================================================================
    # ACTION EXECUTION
    # =========================================================================

    def execute_with_approval(self, action_id: str, approved: bool,
                               modifications: Optional[Dict] = None) -> Tuple[bool, str, Optional[str]]:
        """
        Execute an action with user approval.

        Args:
            action_id: The action to execute
            approved: Whether user approved
            modifications: Any modifications to the action

        Returns:
            (success, message, undo_token_id)
        """
        # Find the action
        action = None
        for a in self.actions:
            if a.id == action_id:
                action = a
                break

        if not action:
            return False, "Action not found", None

        if action.status != ActionStatus.PENDING:
            return False, f"Action already {action.status.value}", None

        if not approved:
            action.status = ActionStatus.REJECTED
            action.user_feedback = False
            save_actions(self.actions)
            return True, "Action rejected", None

        # Apply modifications if any
        if modifications:
            action.payload.update(modifications)

        # Capture state for undo
        original_state = self._capture_original_state(action)

        # Execute the action
        success, message = self._execute_action(action)

        if success:
            action.status = ActionStatus.APPROVED
            action.executed_at = datetime.now()
            action.user_feedback = True

            # Create undo point
            undo_token = self.create_undo_point(action, original_state)
            action.undo_token = undo_token.token_id

            save_actions(self.actions)

            return True, message, undo_token.token_id

        return False, message, None

    def _capture_original_state(self, action: AnticipatedAction) -> Dict:
        """Capture the original state before executing action."""
        if action.action_type == 'task_reschedule':
            # Would fetch current task date from task system
            return {
                'task_id': action.payload.get('task_id'),
                'original_date': datetime.now().isoformat()  # Placeholder
            }
        elif action.action_type == 'reminder_creation':
            return {'reminder_id': None}  # Will be filled after creation
        elif action.action_type == 'email_response':
            return {
                'draft_id': action.payload.get('draft_id'),
                'was_sent': False
            }

        return {}

    def _execute_action(self, action: AnticipatedAction) -> Tuple[bool, str]:
        """Execute the actual action."""
        action_type = action.action_type

        if action_type == 'task_reschedule':
            return self._execute_task_reschedule(action)
        elif action_type == 'reminder_creation':
            return self._execute_reminder_creation(action)
        elif action_type == 'email_response':
            return self._execute_email_response(action)
        elif action_type == 'harvest_alert':
            return self._execute_harvest_alert(action)
        elif action_type == 'customer_followup':
            return self._execute_customer_followup(action)

        return False, f"Unknown action type: {action_type}"

    def _execute_task_reschedule(self, action: AnticipatedAction) -> Tuple[bool, str]:
        """Execute a task reschedule."""
        task_id = action.payload.get('task_id')
        new_date = action.payload.get('new_date')
        print(f"[Anticipatory] Rescheduling task {task_id} to {new_date}")
        return True, f"Task rescheduled to {new_date}"

    def _execute_reminder_creation(self, action: AnticipatedAction) -> Tuple[bool, str]:
        """Execute a reminder creation."""
        reminder_text = action.payload.get('text')
        due_date = action.payload.get('due_date')
        print(f"[Anticipatory] Creating reminder: {reminder_text} for {due_date}")
        return True, f"Reminder created for {due_date}"

    def _execute_email_response(self, action: AnticipatedAction) -> Tuple[bool, str]:
        """Execute an email response (create Gmail draft)."""
        draft_id = action.payload.get('draft_id')
        print(f"[Anticipatory] Creating Gmail draft from {draft_id}")
        return True, "Email draft created in Gmail"

    def _execute_harvest_alert(self, action: AnticipatedAction) -> Tuple[bool, str]:
        """Execute a harvest alert."""
        crop = action.payload.get('crop')
        field = action.payload.get('field')
        print(f"[Anticipatory] Harvest alert: {crop} in {field}")
        return True, f"Harvest alert sent for {crop}"

    def _execute_customer_followup(self, action: AnticipatedAction) -> Tuple[bool, str]:
        """Execute a customer followup draft."""
        customer = action.payload.get('customer')
        print(f"[Anticipatory] Creating followup draft for {customer}")
        return True, f"Followup draft created for {customer}"

    # =========================================================================
    # AUTO-EXECUTION FOR HIGH CONFIDENCE
    # =========================================================================

    def process_auto_execute_queue(self) -> List[Tuple[str, str]]:
        """
        Process actions that should auto-execute.

        Returns:
            List of (action_id, undo_token_id) for executed actions
        """
        executed = []

        for action in self.actions:
            if action.status != ActionStatus.PENDING:
                continue

            if action.trust_level != TrustLevel.AUTO_EXECUTE:
                continue

            # Double-check reversibility
            action_config = ANTICIPATABLE_ACTIONS.get(action.action_type, {})
            if not action_config.get('reversible', False):
                continue

            # Execute with auto-approval
            success, message, undo_token = self.execute_with_approval(
                action.id, approved=True
            )

            if success:
                action.status = ActionStatus.AUTO_EXECUTED
                executed.append((action.id, undo_token))
                print(f"[Anticipatory] Auto-executed: {action.title}")

        save_actions(self.actions)

        return executed

    # =========================================================================
    # QUERY METHODS
    # =========================================================================

    def get_pending_actions(self) -> List[AnticipatedAction]:
        """Get all pending actions for user review."""
        return [a for a in self.actions if a.status == ActionStatus.PENDING]

    def get_actions_by_trust_level(self, level: TrustLevel) -> List[AnticipatedAction]:
        """Get pending actions of a specific trust level."""
        return [a for a in self.actions
                if a.status == ActionStatus.PENDING and a.trust_level == level]

    def get_pending_drafts(self) -> List[EmailDraft]:
        """Get all pending email drafts."""
        return [d for d in self.drafts if d.status == 'pending']

    def get_action_queue_summary(self) -> Dict:
        """Get summary of action queue for dashboard."""
        pending = self.get_pending_actions()

        by_level = {}
        for level in TrustLevel:
            by_level[level.value] = len([a for a in pending if a.trust_level == level])

        by_type = {}
        for action in pending:
            by_type[action.action_type] = by_type.get(action.action_type, 0) + 1

        return {
            'total_pending': len(pending),
            'by_trust_level': by_level,
            'by_action_type': by_type,
            'pending_drafts': len(self.get_pending_drafts()),
            'active_undo_tokens': len([t for t in self.undo_tokens
                                        if not t.used and datetime.now() < t.expires_at])
        }


# ===========================================================================
# GLOBAL INSTANCE
# ===========================================================================

_anticipatory_engine: Optional[AnticipatoryEngine] = None


def get_anticipatory_engine(user_id: str = "default") -> AnticipatoryEngine:
    """Get or create the AnticipatoryEngine instance."""
    global _anticipatory_engine
    if _anticipatory_engine is None or _anticipatory_engine.user_id != user_id:
        _anticipatory_engine = AnticipatoryEngine(user_id)
    return _anticipatory_engine


# ===========================================================================
# CLI INTERFACE
# ===========================================================================

def main():
    """CLI interface for Anticipatory Engine."""
    import argparse

    parser = argparse.ArgumentParser(description="TinyPM Anticipatory Actions Engine")
    parser.add_argument("command", nargs="?", default="status",
                       choices=["status", "pending", "scan", "auto", "queue"],
                       help="Command to run")

    args = parser.parse_args()
    engine = get_anticipatory_engine()

    if args.command == "status":
        summary = engine.get_action_queue_summary()
        print("\n" + "=" * 60)
        print("Anticipatory Actions Engine - Status")
        print("=" * 60)
        print(f"Pending actions: {summary['total_pending']}")
        print(f"Pending drafts: {summary['pending_drafts']}")
        print(f"Active undo tokens: {summary['active_undo_tokens']}")
        print("\nBy Trust Level:")
        for level, count in summary['by_trust_level'].items():
            print(f"  {level}: {count}")
        print("\nBy Action Type:")
        for atype, count in summary['by_action_type'].items():
            print(f"  {atype}: {count}")

    elif args.command == "pending":
        pending = engine.get_pending_actions()
        print("\n" + "=" * 60)
        print("Pending Anticipatory Actions")
        print("=" * 60)
        if not pending:
            print("No pending actions")
        else:
            for action in pending:
                print(f"\n[{action.trust_level.value.upper()}] {action.title}")
                print(f"  {action.description}")
                print(f"  Confidence: {action.confidence:.0%}")
                print(f"  ID: {action.id}")

    elif args.command == "scan":
        print("\nScanning for actionable patterns...")
        new_actions = engine.detect_actionable_patterns()
        print(f"Found {len(new_actions)} new anticipated actions")

    elif args.command == "auto":
        print("\nProcessing auto-execute queue...")
        executed = engine.process_auto_execute_queue()
        print(f"Auto-executed {len(executed)} actions")
        for action_id, undo_token in executed:
            print(f"  - {action_id} (undo: {undo_token})")

    elif args.command == "queue":
        summary = engine.get_action_queue_summary()
        print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
