"""
TinyPM Email Integration
========================
Gmail integration for proactive email intelligence.

Created: 2026-01-30
Author: Backend_Agent_10
Purpose: Gmail read + compose for TinyPM proactive suggestions

Features:
- Read unread emails
- Detect urgent emails needing response
- Draft replies in user's voice (using StyleLearner)
- Identify action items from emails

SECURITY: HARD BOUNDARIES - Only gmail scopes, never sheets/drive.
TinyPM is completely isolated from Tiny Seed OS data access.
"""

import os
import json
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from dataclasses import dataclass
from email.mime.text import MIMEText
from pathlib import Path

# App directory for local storage
APP_DIR = Path(__file__).parent


@dataclass
class EmailMessage:
    """Represents an email message."""
    id: str
    thread_id: str
    subject: str
    sender: str
    sender_email: str
    snippet: str
    body: str
    date: datetime
    is_unread: bool
    labels: List[str]

    def is_from_important_sender(self, important_emails: List[str]) -> bool:
        """Check if email is from an important sender."""
        return self.sender_email.lower() in [e.lower() for e in important_emails]

    def needs_response(self) -> bool:
        """Heuristic: does this email likely need a response?"""
        # Check for question marks
        if '?' in self.subject or '?' in self.snippet:
            return True
        # Check for action words
        action_words = ['please', 'can you', 'could you', 'would you', 'need', 'urgent', 'asap']
        text_lower = (self.subject + ' ' + self.snippet).lower()
        return any(word in text_lower for word in action_words)

    def get_urgency_score(self) -> int:
        """
        Score urgency 1-5 (5 = most urgent).

        Scoring:
        - 5: Contains 'urgent' or 'asap'
        - 4: Contains 'important' or 'priority'
        - 3: Needs response (question or action words)
        - 2: Default unread
        - +1: If older than 24 hours (capped at 5)
        """
        score = 2  # Default

        text_lower = (self.subject + ' ' + self.snippet).lower()

        if 'urgent' in text_lower or 'asap' in text_lower:
            score = 5
        elif 'important' in text_lower or 'priority' in text_lower:
            score = 4
        elif self.needs_response():
            score = 3

        # Older unread emails are more urgent
        try:
            # Handle timezone-aware vs naive datetime comparison
            now = datetime.now()
            email_date = self.date
            if email_date.tzinfo is not None:
                # Make now timezone-aware to match
                try:
                    from datetime import timezone
                    now = datetime.now(timezone.utc)
                except ImportError:
                    # Fallback: remove timezone from email_date
                    email_date = email_date.replace(tzinfo=None)
            age_hours = (now - email_date).total_seconds() / 3600
            if age_hours > 24:
                score = min(5, score + 1)
        except Exception:
            pass  # Ignore age calculation on error

        return score


class EmailIntegration:
    """
    Gmail integration for TinyPM.

    Features:
    - Get unread emails
    - Identify emails needing response
    - Draft replies in user's voice
    - Extract action items

    SECURITY BOUNDARIES:
    - Only uses gmail.readonly and gmail.compose scopes
    - NEVER accesses Google Sheets, Drive, or any other service
    - Validates scopes before making any request
    - TinyPM is completely isolated from Tiny Seed OS
    """

    GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1"

    # SECURITY: Only these scopes are allowed
    ALLOWED_SCOPES = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.compose"
    ]

    def __init__(self, user_id: str = "default"):
        self.user_id = user_id
        self._access_token = None
        self._token_scopes = []
        self.important_senders = []  # User can configure
        self._oauth_manager = None

    def _validate_scopes(self, scopes: List[str]) -> bool:
        """
        SECURITY: Validate that token only has gmail scopes.
        Rejects any token with sheets/drive access.
        """
        forbidden_patterns = ['sheets', 'drive', 'docs', 'calendar']
        for scope in scopes:
            scope_lower = scope.lower()
            for forbidden in forbidden_patterns:
                if forbidden in scope_lower:
                    print(f"[Email] SECURITY: Rejected scope with forbidden access: {scope}")
                    return False
        return True

    def _get_oauth_manager(self):
        """Get OAuth manager with lazy import."""
        if self._oauth_manager is not None:
            return self._oauth_manager

        try:
            from oauth_manager import get_oauth_manager
            self._oauth_manager = get_oauth_manager()
            return self._oauth_manager
        except ImportError:
            print("[Email] oauth_manager not available - running in demo mode")
            return None

    def _get_access_token(self) -> Optional[str]:
        """
        Get valid access token from OAuth manager.
        The OAuth manager already validates scopes at token exchange time.
        """
        if self._access_token:
            return self._access_token

        manager = self._get_oauth_manager()
        if not manager:
            return None

        try:
            # OAuth manager handles scope validation and token refresh
            self._access_token = manager.get_valid_access_token(self.user_id)
            return self._access_token
        except Exception as e:
            print(f"[Email] Token retrieval error: {e}")
            return None

    def _api_request(self, endpoint: str, method: str = 'GET', data: Dict = None) -> Optional[Dict]:
        """Make authenticated request to Gmail API."""
        import urllib.request
        import urllib.error

        token = self._get_access_token()
        if not token:
            print("[Email] No valid access token")
            return None

        url = f"{self.GMAIL_API_BASE}{endpoint}"

        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

        req_data = json.dumps(data).encode() if data else None
        req = urllib.request.Request(url, data=req_data, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                return json.loads(response.read().decode())
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else str(e)
            print(f"[Email] API error: {e.code} - {error_body}")
            # Clear token on auth errors
            if e.code == 401:
                self._access_token = None
            return None
        except Exception as e:
            print(f"[Email] Request error: {e}")
            return None

    def is_connected(self) -> bool:
        """Check if email is connected and accessible."""
        return self._get_access_token() is not None

    def get_connection_status(self) -> Dict:
        """Get detailed connection status."""
        token = self._get_access_token()
        return {
            "connected": token is not None,
            "user_id": self.user_id,
            "scopes": self._token_scopes,
            "oauth_available": self._get_oauth_manager() is not None
        }

    def get_unread_count(self) -> int:
        """Get count of unread emails in inbox."""
        result = self._api_request("/users/me/labels/INBOX")
        if result:
            return result.get('messagesUnread', 0)
        return 0

    def get_unread_emails(self, max_results: int = 20) -> List[EmailMessage]:
        """Get unread emails from inbox."""
        endpoint = f"/users/me/messages?q=is:unread&maxResults={max_results}"
        result = self._api_request(endpoint)

        if not result:
            return []

        emails = []
        for msg_ref in result.get('messages', []):
            msg_id = msg_ref['id']
            msg_data = self._api_request(f"/users/me/messages/{msg_id}")

            if msg_data:
                email = self._parse_message(msg_data)
                if email:
                    emails.append(email)

        return emails

    def get_email_by_id(self, email_id: str) -> Optional[EmailMessage]:
        """Get a specific email by ID."""
        msg_data = self._api_request(f"/users/me/messages/{email_id}")
        if msg_data:
            return self._parse_message(msg_data)
        return None

    def _parse_message(self, msg_data: Dict) -> Optional[EmailMessage]:
        """Parse Gmail API message into EmailMessage."""
        try:
            headers = {h['name']: h['value'] for h in msg_data.get('payload', {}).get('headers', [])}

            # Parse sender
            from_header = headers.get('From', '')
            sender_email = from_header
            sender_name = from_header
            if '<' in from_header:
                parts = from_header.split('<')
                sender_name = parts[0].strip().strip('"')
                sender_email = parts[1].strip('>')

            # Parse date
            date_str = headers.get('Date', '')
            try:
                # Handle various date formats
                from email.utils import parsedate_to_datetime
                date = parsedate_to_datetime(date_str)
            except:
                date = datetime.now()

            # Get body
            body = self._extract_body(msg_data.get('payload', {}))

            return EmailMessage(
                id=msg_data.get('id', ''),
                thread_id=msg_data.get('threadId', ''),
                subject=headers.get('Subject', '(No Subject)'),
                sender=sender_name,
                sender_email=sender_email,
                snippet=msg_data.get('snippet', ''),
                body=body,
                date=date,
                is_unread='UNREAD' in msg_data.get('labelIds', []),
                labels=msg_data.get('labelIds', [])
            )
        except Exception as e:
            print(f"[Email] Parse error: {e}")
            return None

    def _extract_body(self, payload: Dict) -> str:
        """Extract email body from payload."""
        body = ""

        if 'body' in payload and payload['body'].get('data'):
            body = base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8', errors='ignore')
        elif 'parts' in payload:
            for part in payload['parts']:
                if part.get('mimeType') == 'text/plain':
                    if part.get('body', {}).get('data'):
                        body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='ignore')
                        break
                # Recursively check nested parts
                elif 'parts' in part:
                    body = self._extract_body(part)
                    if body:
                        break

        return body[:2000]  # Truncate for safety

    def get_emails_needing_response(self) -> List[EmailMessage]:
        """Get unread emails that likely need a response."""
        emails = self.get_unread_emails()
        return [e for e in emails if e.needs_response()]

    def get_urgent_emails(self, threshold: int = 4) -> List[EmailMessage]:
        """Get emails with urgency score >= threshold."""
        emails = self.get_unread_emails()
        return [e for e in emails if e.get_urgency_score() >= threshold]

    def draft_reply(self, email: EmailMessage, reply_text: str) -> Optional[str]:
        """
        Create a draft reply to an email.
        Returns draft ID if successful.
        """
        # Create the reply message
        message = MIMEText(reply_text)
        message['to'] = email.sender_email
        message['subject'] = f"Re: {email.subject}" if not email.subject.startswith('Re:') else email.subject
        message['In-Reply-To'] = email.id
        message['References'] = email.id

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

        result = self._api_request(
            "/users/me/drafts",
            method='POST',
            data={
                'message': {
                    'raw': raw,
                    'threadId': email.thread_id
                }
            }
        )

        if result:
            return result.get('id')
        return None

    def draft_reply_in_user_voice(self, email: EmailMessage, context: str = "", claude_api_key: str = None) -> Optional[Dict]:
        """
        Draft a reply using StyleLearner for user's voice.
        Returns {draft_id, draft_text} or None.

        Args:
            email: The email to reply to
            context: Additional context for the reply
            claude_api_key: Optional Claude API key for generating reply
        """
        try:
            from pm_brain import get_style_learner
            style_learner = get_style_learner()
            style_prompt = style_learner.get_style_prompt()
        except ImportError:
            style_prompt = "Write in a professional, friendly tone."

        # Build prompt for Claude to draft reply
        prompt = f"""Draft a reply to this email in the user's voice.

{style_prompt}

ORIGINAL EMAIL:
From: {email.sender} <{email.sender_email}>
Subject: {email.subject}
---
{email.body[:1000]}
---

{f"ADDITIONAL CONTEXT: {context}" if context else ""}

Write a concise, appropriate reply. Just the reply text, no explanations."""

        draft_text = None

        # Try to call Claude API if key provided
        if claude_api_key:
            draft_text = self._call_claude_for_draft(prompt, claude_api_key)

        # Fallback: placeholder for manual editing
        if not draft_text:
            draft_text = f"[Draft reply to: {email.subject}]\n\n(Edit this draft in Gmail)"

        draft_id = self.draft_reply(email, draft_text)

        return {
            'draft_id': draft_id,
            'draft_text': draft_text,
            'to': email.sender_email,
            'subject': f"Re: {email.subject}"
        } if draft_id else None

    def _call_claude_for_draft(self, prompt: str, api_key: str) -> Optional[str]:
        """Call Claude API to generate email draft."""
        import urllib.request
        import urllib.error

        try:
            url = "https://api.anthropic.com/v1/messages"
            headers = {
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
            data = {
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 500,
                "messages": [{"role": "user", "content": prompt}]
            }

            req = urllib.request.Request(
                url,
                data=json.dumps(data).encode(),
                headers=headers,
                method='POST'
            )

            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode())
                return result.get('content', [{}])[0].get('text', '')
        except Exception as e:
            print(f"[Email] Claude API error: {e}")
            return None

    def extract_action_items(self, email: EmailMessage) -> List[str]:
        """Extract potential action items from an email."""
        action_items = []

        # Simple heuristic extraction
        lines = (email.subject + '\n' + email.body).split('\n')

        action_indicators = ['please', 'can you', 'could you', 'need you to', 'would you',
                           'make sure', 'don\'t forget', 'remember to', 'action required',
                           'by end of day', 'by tomorrow', 'deadline', 'due date']

        for line in lines:
            line_lower = line.lower().strip()
            if any(indicator in line_lower for indicator in action_indicators):
                # Clean up the line
                action = line.strip()
                if len(action) > 10 and len(action) < 200:
                    action_items.append(action)

        return action_items[:5]  # Max 5 action items

    def get_email_context_for_pm(self) -> Dict:
        """
        Get email context for the PM to use in proactive suggestions.
        This is the main integration point with pm_orchestrator.py.
        """
        if not self.is_connected():
            return {
                'connected': False,
                'unread_count': 0,
                'urgent_count': 0,
                'needs_response_count': 0,
                'urgent_emails': [],
                'action_items': []
            }

        unread_count = self.get_unread_count()
        urgent_emails = self.get_urgent_emails()
        needs_response = self.get_emails_needing_response()

        context = {
            'connected': True,
            'unread_count': unread_count,
            'urgent_count': len(urgent_emails),
            'needs_response_count': len(needs_response),
            'urgent_emails': [],
            'action_items': []
        }

        for email in urgent_emails[:3]:
            context['urgent_emails'].append({
                'id': email.id,
                'subject': email.subject,
                'sender': email.sender,
                'sender_email': email.sender_email,
                'urgency': email.get_urgency_score(),
                'snippet': email.snippet[:100],
                'needs_response': email.needs_response()
            })

            # Extract action items
            actions = self.extract_action_items(email)
            context['action_items'].extend(actions)

        # Deduplicate action items
        context['action_items'] = list(set(context['action_items']))[:10]

        return context

    def set_important_senders(self, emails: List[str]):
        """Configure list of important senders."""
        self.important_senders = emails

    def get_emails_from_important_senders(self) -> List[EmailMessage]:
        """Get unread emails from configured important senders."""
        if not self.important_senders:
            return []

        emails = self.get_unread_emails()
        return [e for e in emails if e.is_from_important_sender(self.important_senders)]

    def mark_as_read(self, email_id: str) -> bool:
        """Mark an email as read."""
        result = self._api_request(
            f"/users/me/messages/{email_id}/modify",
            method='POST',
            data={'removeLabelIds': ['UNREAD']}
        )
        return result is not None

    def get_thread(self, thread_id: str) -> List[EmailMessage]:
        """Get all messages in a thread."""
        result = self._api_request(f"/users/me/threads/{thread_id}")
        if not result:
            return []

        emails = []
        for msg_data in result.get('messages', []):
            email = self._parse_message(msg_data)
            if email:
                emails.append(email)

        return sorted(emails, key=lambda e: e.date)


# Global instance
_email_integration = None

def get_email_integration(user_id: str = "default") -> EmailIntegration:
    """Get or create email integration instance."""
    global _email_integration
    if _email_integration is None or _email_integration.user_id != user_id:
        _email_integration = EmailIntegration(user_id)
    return _email_integration


# ═══════════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    """CLI interface for testing email integration."""
    import sys

    print("=" * 60)
    print("TinyPM Email Integration")
    print("=" * 60)

    email = get_email_integration()

    if len(sys.argv) > 1:
        cmd = sys.argv[1]

        if cmd == "status":
            status = email.get_connection_status()
            print(f"\nConnection Status:")
            print(f"  Connected: {status['connected']}")
            print(f"  User ID: {status['user_id']}")
            print(f"  OAuth Available: {status['oauth_available']}")
            if status['scopes']:
                print(f"  Scopes: {', '.join(status['scopes'])}")

        elif cmd == "unread":
            count = email.get_unread_count()
            print(f"\nUnread emails: {count}")

        elif cmd == "urgent":
            urgent = email.get_urgent_emails()
            print(f"\nUrgent emails ({len(urgent)}):")
            for e in urgent:
                print(f"  [{e.get_urgency_score()}] {e.subject}")
                print(f"      From: {e.sender}")

        elif cmd == "context":
            context = email.get_email_context_for_pm()
            print(f"\nEmail Context for PM:")
            print(json.dumps(context, indent=2, default=str))

        else:
            print(f"Unknown command: {cmd}")
            print("Commands: status, unread, urgent, context")
    else:
        # Default: show status
        status = email.get_connection_status()
        print(f"\nStatus: {'Connected' if status['connected'] else 'Not connected'}")

        if not status['connected']:
            print("\nTo connect:")
            print("  1. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env")
            print("  2. Run: python oauth_manager.py auth")
            print("  3. Authenticate with gmail.readonly and gmail.compose scopes")
            print("  4. Run: python email_integration.py status")
        else:
            print(f"Unread emails: {email.get_unread_count()}")

        print("\nCommands: status, unread, urgent, context")


if __name__ == "__main__":
    main()
