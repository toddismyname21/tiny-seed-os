"""
Chief of Staff Email Integration
================================
Full Gmail integration for the Chief of Staff command center.

FULL ACCESS: Unlike TinyPM, Chief of Staff has full gmail access
including reading, composing, and SENDING emails.

Features:
- Read unread emails
- Detect urgent emails needing response
- Draft replies in user's voice
- SEND emails (Chief of Staff only)
- Label and archive emails
- Extract action items from emails

Created: 2026-01-30
Author: Chief_of_Staff_Claude
"""

import os
import json
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from dataclasses import dataclass
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path


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
        if '?' in self.subject or '?' in self.snippet:
            return True
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
        score = 2

        text_lower = (self.subject + ' ' + self.snippet).lower()

        if 'urgent' in text_lower or 'asap' in text_lower:
            score = 5
        elif 'important' in text_lower or 'priority' in text_lower:
            score = 4
        elif self.needs_response():
            score = 3

        age_hours = (datetime.now() - self.date).total_seconds() / 3600
        if age_hours > 24:
            score = min(5, score + 1)

        return score

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'thread_id': self.thread_id,
            'subject': self.subject,
            'sender': self.sender,
            'sender_email': self.sender_email,
            'snippet': self.snippet,
            'body': self.body[:500],  # Truncate for safety
            'date': self.date.isoformat(),
            'is_unread': self.is_unread,
            'labels': self.labels,
            'urgency_score': self.get_urgency_score(),
            'needs_response': self.needs_response()
        }


class EmailIntegration:
    """
    Full Gmail integration for Chief of Staff.

    Features:
    - Read all emails
    - Identify emails needing response
    - Draft replies in user's voice
    - SEND emails directly
    - Archive and label emails
    - Extract action items
    - Full thread management
    """

    GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1"

    def __init__(self, user_id: str = "default"):
        self.user_id = user_id
        self._access_token = None
        self._token_expiry = None
        self.important_senders = []
        self._cache = {}
        self._cache_expiry = {}

    def _get_access_token(self) -> Optional[str]:
        """Get valid access token from OAuth manager."""
        if self._access_token and self._token_expiry:
            if datetime.now() < self._token_expiry:
                return self._access_token

        try:
            from oauth_manager import get_oauth_manager
            manager = get_oauth_manager()
            self._access_token = manager.get_valid_access_token(self.user_id)
            self._token_expiry = datetime.now() + timedelta(minutes=55)
            return self._access_token
        except ImportError:
            print("[Email] OAuth manager not available")
            return None
        except Exception as e:
            print(f"[Email] Error getting access token: {e}")
            return None

    def _api_request(self, endpoint: str, method: str = 'GET',
                     data: Dict = None, params: Dict = None) -> Optional[Dict]:
        """Make authenticated request to Gmail API."""
        import urllib.request
        import urllib.error
        from urllib.parse import urlencode

        token = self._get_access_token()
        if not token:
            print("[Email] No valid access token")
            return None

        url = f"{self.GMAIL_API_BASE}{endpoint}"
        if params:
            url += '?' + urlencode(params)

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
            "can_send": True,  # Chief of Staff has full access
            "can_read": True,
            "can_compose": True
        }

    # =========================================================================
    # READ OPERATIONS
    # =========================================================================

    def get_unread_count(self) -> int:
        """Get count of unread emails in inbox."""
        result = self._api_request("/users/me/labels/INBOX")
        if result:
            return result.get('messagesUnread', 0)
        return 0

    def get_unread_emails(self, max_results: int = 20) -> List[EmailMessage]:
        """Get unread emails from inbox."""
        result = self._api_request(
            "/users/me/messages",
            params={'q': 'is:unread', 'maxResults': str(max_results)}
        )

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

    def get_recent_emails(self, max_results: int = 20) -> List[EmailMessage]:
        """Get recent emails (read and unread)."""
        result = self._api_request(
            "/users/me/messages",
            params={'maxResults': str(max_results)}
        )

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

    def search_emails(self, query: str, max_results: int = 20) -> List[EmailMessage]:
        """Search emails with Gmail query syntax."""
        result = self._api_request(
            "/users/me/messages",
            params={'q': query, 'maxResults': str(max_results)}
        )

        if not result:
            return []

        emails = []
        for msg_ref in result.get('messages', []):
            msg_data = self._api_request(f"/users/me/messages/{msg_ref['id']}")
            if msg_data:
                email = self._parse_message(msg_data)
                if email:
                    emails.append(email)

        return emails

    def _parse_message(self, msg_data: Dict) -> Optional[EmailMessage]:
        """Parse Gmail API message into EmailMessage."""
        try:
            headers = {h['name']: h['value'] for h in msg_data.get('payload', {}).get('headers', [])}

            from_header = headers.get('From', '')
            sender_email = from_header
            sender_name = from_header
            if '<' in from_header:
                parts = from_header.split('<')
                sender_name = parts[0].strip().strip('"')
                sender_email = parts[1].strip('>')

            date_str = headers.get('Date', '')
            try:
                from email.utils import parsedate_to_datetime
                date = parsedate_to_datetime(date_str)
            except:
                date = datetime.now()

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
                elif 'parts' in part:
                    body = self._extract_body(part)
                    if body:
                        break

        return body[:5000]  # Truncate for safety

    # =========================================================================
    # WRITE OPERATIONS (Chief of Staff Only)
    # =========================================================================

    def draft_reply(self, email: EmailMessage, reply_text: str) -> Optional[str]:
        """
        Create a draft reply to an email.
        Returns draft ID if successful.
        """
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

    def send_email(self, to: str, subject: str, body: str,
                   reply_to: EmailMessage = None) -> Optional[Dict]:
        """
        Send an email directly.

        Args:
            to: Recipient email address
            subject: Email subject
            body: Email body text
            reply_to: Optional EmailMessage to reply to

        Returns:
            Sent message data or None if failed
        """
        message = MIMEText(body)
        message['to'] = to
        message['subject'] = subject

        if reply_to:
            message['In-Reply-To'] = reply_to.id
            message['References'] = reply_to.id

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

        data = {'raw': raw}
        if reply_to:
            data['threadId'] = reply_to.thread_id

        result = self._api_request(
            "/users/me/messages/send",
            method='POST',
            data=data
        )

        if result:
            print(f"[Email] Sent email to {to}: {subject}")

        return result

    def send_draft(self, draft_id: str) -> Optional[Dict]:
        """Send a previously created draft."""
        result = self._api_request(
            "/users/me/drafts/send",
            method='POST',
            data={'id': draft_id}
        )
        return result

    def archive_email(self, email_id: str) -> bool:
        """Archive an email (remove from inbox)."""
        result = self._api_request(
            f"/users/me/messages/{email_id}/modify",
            method='POST',
            data={'removeLabelIds': ['INBOX']}
        )
        return result is not None

    def mark_as_read(self, email_id: str) -> bool:
        """Mark an email as read."""
        result = self._api_request(
            f"/users/me/messages/{email_id}/modify",
            method='POST',
            data={'removeLabelIds': ['UNREAD']}
        )
        return result is not None

    def add_label(self, email_id: str, label_id: str) -> bool:
        """Add a label to an email."""
        result = self._api_request(
            f"/users/me/messages/{email_id}/modify",
            method='POST',
            data={'addLabelIds': [label_id]}
        )
        return result is not None

    def delete_email(self, email_id: str) -> bool:
        """Move email to trash."""
        result = self._api_request(
            f"/users/me/messages/{email_id}/trash",
            method='POST'
        )
        return result is not None

    # =========================================================================
    # INTELLIGENCE OPERATIONS
    # =========================================================================

    def get_emails_needing_response(self) -> List[EmailMessage]:
        """Get unread emails that likely need a response."""
        emails = self.get_unread_emails()
        return [e for e in emails if e.needs_response()]

    def get_urgent_emails(self, threshold: int = 4) -> List[EmailMessage]:
        """Get emails with urgency score >= threshold."""
        emails = self.get_unread_emails()
        return [e for e in emails if e.get_urgency_score() >= threshold]

    def extract_action_items(self, email: EmailMessage) -> List[str]:
        """Extract potential action items from an email."""
        action_items = []

        lines = (email.subject + '\n' + email.body).split('\n')

        action_indicators = ['please', 'can you', 'could you', 'need you to', 'would you',
                           'make sure', 'don\'t forget', 'remember to', 'action required',
                           'by end of day', 'by tomorrow', 'deadline', 'due date']

        for line in lines:
            line_lower = line.lower().strip()
            if any(indicator in line_lower for indicator in action_indicators):
                action = line.strip()
                if len(action) > 10 and len(action) < 200:
                    action_items.append(action)

        return action_items[:5]

    def get_email_context(self) -> Dict:
        """Get email context for Chief of Staff intelligence."""
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

        for email in urgent_emails[:5]:
            context['urgent_emails'].append(email.to_dict())

            actions = self.extract_action_items(email)
            context['action_items'].extend(actions)

        context['action_items'] = list(set(context['action_items']))[:10]

        return context

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


# =============================================================================
# GLOBAL INSTANCE
# =============================================================================

_email_integration: Optional[EmailIntegration] = None


def get_email_integration(user_id: str = "default") -> EmailIntegration:
    """Get or create email integration instance."""
    global _email_integration
    if _email_integration is None or _email_integration.user_id != user_id:
        _email_integration = EmailIntegration(user_id)
    return _email_integration


# =============================================================================
# CLI INTERFACE
# =============================================================================

if __name__ == "__main__":
    import sys

    print("=" * 60)
    print("Chief of Staff Email Integration")
    print("=" * 60)

    email = get_email_integration()

    if len(sys.argv) > 1:
        cmd = sys.argv[1]

        if cmd == "status":
            status = email.get_connection_status()
            print(f"\nConnection Status:")
            print(f"  Connected: {status['connected']}")
            print(f"  Can Read: {status['can_read']}")
            print(f"  Can Send: {status['can_send']}")

        elif cmd == "unread":
            count = email.get_unread_count()
            print(f"\nUnread emails: {count}")

            if count > 0:
                print("\nRecent unread:")
                for e in email.get_unread_emails(5):
                    print(f"  - {e.subject}")
                    print(f"    From: {e.sender}")

        elif cmd == "urgent":
            urgent = email.get_urgent_emails()
            print(f"\nUrgent emails ({len(urgent)}):")
            for e in urgent:
                print(f"  [{e.get_urgency_score()}] {e.subject}")
                print(f"      From: {e.sender}")

        elif cmd == "context":
            context = email.get_email_context()
            print(f"\nEmail Context:")
            print(json.dumps(context, indent=2, default=str))

        elif cmd == "send":
            # Test send
            if len(sys.argv) >= 5:
                to = sys.argv[2]
                subject = sys.argv[3]
                body = sys.argv[4]
                result = email.send_email(to, subject, body)
                if result:
                    print(f"Email sent successfully!")
                else:
                    print("Failed to send email")
            else:
                print("Usage: python email_integration.py send <to> <subject> <body>")

        else:
            print(f"Unknown command: {cmd}")
            print("Commands: status, unread, urgent, context, send")

    else:
        status = email.get_connection_status()
        print(f"\nStatus: {'Connected' if status['connected'] else 'Not connected'}")

        if not status['connected']:
            print("\nTo connect:")
            print("  1. Run: python oauth_callback_server.py")
            print("  2. Authorize in browser")
            print("  3. Run: python email_integration.py status")
        else:
            print(f"Unread emails: {email.get_unread_count()}")

        print("\nCommands: status, unread, urgent, context, send")
