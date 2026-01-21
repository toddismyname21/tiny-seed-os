#!/usr/bin/env python3
"""
SMS Intelligence Daemon
=======================

Enterprise-grade SMS/iMessage monitoring and analysis daemon.
Implements patterns from Gong.io and Salesforce Einstein.

Features:
- Real-time message monitoring via watchdog (FSEvents)
- macOS Ventura+ attributedBody decoding
- Contact name resolution from AddressBook
- Claude API integration for intelligent analysis
- ChromaDB for semantic search
- Redis for caching and alerts
- Google Sheets sync for existing workflows

Usage:
    python sms_daemon.py --mode daemon      # Run as background daemon
    python sms_daemon.py --mode analyze     # Process pending messages once
    python sms_daemon.py --mode search --query "meeting tomorrow"
    python sms_daemon.py --mode status      # Show system status

Requirements:
    - macOS with Full Disk Access granted to Python/Terminal
    - Anthropic API key configured
    - Redis running locally (optional but recommended)
"""

import os
import sys
import json
import time
import signal
import sqlite3
import plistlib
import argparse
import threading
import requests
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, List, Any, Tuple
from dataclasses import dataclass, asdict, field
from queue import Queue, Empty
from collections import defaultdict
import logging

# Third-party imports
try:
    from anthropic import Anthropic
except ImportError:
    print("ERROR: anthropic package not installed. Run: pip install anthropic")
    sys.exit(1)

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
except ImportError:
    print("ERROR: watchdog package not installed. Run: pip install watchdog")
    sys.exit(1)

try:
    import chromadb
except ImportError:
    print("ERROR: chromadb package not installed. Run: pip install chromadb")
    sys.exit(1)

# Optional Redis support
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    print("WARNING: redis package not installed. Caching disabled.")

# Local imports
from config import (
    SMSIntelligenceConfig,
    get_config,
    setup_logging,
    CHAT_DB_PATH,
    CONTACTS_DB_PATH,
    VECTOR_DB_DIR,
    GOOGLE_SHEETS_API_URL,
    REDIS_URL,
    check_full_disk_access,
)


# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass
class Message:
    """Represents a single SMS/iMessage"""
    rowid: int
    guid: str
    text: str
    sender: str
    sender_name: str
    timestamp: Optional[datetime]
    is_from_me: bool
    service: str  # "iMessage" or "SMS"
    chat_id: str
    is_group_chat: bool
    attachments: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "rowid": self.rowid,
            "guid": self.guid,
            "text": self.text,
            "sender": self.sender,
            "sender_name": self.sender_name,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "is_from_me": self.is_from_me,
            "service": self.service,
            "chat_id": self.chat_id,
            "is_group_chat": self.is_group_chat,
            "attachments": self.attachments,
        }


@dataclass
class MessageAnalysis:
    """Analysis results for a message"""
    message_guid: str
    requires_response: bool
    urgency: str  # critical, high, medium, low, none
    sentiment: str  # very_positive, positive, neutral, negative, very_negative
    contains_question: bool
    contains_commitment: bool
    commitment_details: Optional[str]
    topics: List[str]
    suggested_response_time: str  # immediate, within_1h, within_24h, no_rush
    key_info_extracted: List[str]
    analyzed_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "message_guid": self.message_guid,
            "requires_response": self.requires_response,
            "urgency": self.urgency,
            "sentiment": self.sentiment,
            "contains_question": self.contains_question,
            "contains_commitment": self.contains_commitment,
            "commitment_details": self.commitment_details,
            "topics": self.topics,
            "suggested_response_time": self.suggested_response_time,
            "key_info_extracted": self.key_info_extracted,
            "analyzed_at": self.analyzed_at.isoformat(),
        }


# ============================================================================
# MESSAGE DATABASE ACCESS
# ============================================================================

class MessageDatabase:
    """
    Interface to the macOS Messages SQLite database.
    Handles attributedBody decoding for macOS Ventura+.
    """

    def __init__(self, db_path: Path = CHAT_DB_PATH, contacts_path: Path = CONTACTS_DB_PATH):
        self.db_path = db_path
        self.contacts_path = contacts_path
        self._contact_cache: Dict[str, str] = {}
        self._load_contacts()
        self.logger = logging.getLogger("sms_intelligence.database")

    def _get_connection(self) -> sqlite3.Connection:
        """Get read-only connection to Messages database"""
        return sqlite3.connect(
            f'file:{self.db_path}?mode=ro',
            uri=True,
            detect_types=sqlite3.PARSE_DECLTYPES
        )

    def _load_contacts(self):
        """Load contacts from AddressBook database"""
        if not self.contacts_path.exists():
            # Try alternative paths
            alt_paths = [
                Path.home() / "Library" / "Application Support" / "AddressBook" / "AddressBook-v22.abcddb",
                Path.home() / "Library" / "Containers" / "com.apple.AddressBook" / "Data" / "Library" / "Application Support" / "AddressBook" / "AddressBook-v22.abcddb",
            ]
            for path in alt_paths:
                if path.exists():
                    self.contacts_path = path
                    break
            else:
                logging.warning("AddressBook database not found. Contact names will not be resolved.")
                return

        try:
            conn = sqlite3.connect(f'file:{self.contacts_path}?mode=ro', uri=True)
            cursor = conn.cursor()

            # Get phone numbers with names
            cursor.execute('''
                SELECT
                    ZABCDPHONENUMBER.ZFULLNUMBER,
                    ZABCDRECORD.ZFIRSTNAME,
                    ZABCDRECORD.ZLASTNAME
                FROM ZABCDPHONENUMBER
                LEFT JOIN ZABCDRECORD ON ZABCDPHONENUMBER.ZOWNER = ZABCDRECORD.Z_PK
                WHERE ZABCDPHONENUMBER.ZFULLNUMBER IS NOT NULL
            ''')

            for row in cursor.fetchall():
                phone, first, last = row
                if phone:
                    normalized = self._normalize_phone(phone)
                    name = f"{first or ''} {last or ''}".strip()
                    if name and normalized:
                        self._contact_cache[normalized] = name

            # Also get emails
            try:
                cursor.execute('''
                    SELECT
                        ZABCDEMAILADDRESS.ZADDRESS,
                        ZABCDRECORD.ZFIRSTNAME,
                        ZABCDRECORD.ZLASTNAME
                    FROM ZABCDEMAILADDRESS
                    LEFT JOIN ZABCDRECORD ON ZABCDEMAILADDRESS.ZOWNER = ZABCDRECORD.Z_PK
                    WHERE ZABCDEMAILADDRESS.ZADDRESS IS NOT NULL
                ''')

                for row in cursor.fetchall():
                    email, first, last = row
                    if email:
                        name = f"{first or ''} {last or ''}".strip()
                        if name:
                            self._contact_cache[email.lower()] = name
            except sqlite3.OperationalError:
                pass  # Email table may not exist

            conn.close()
            logging.info(f"Loaded {len(self._contact_cache)} contacts from AddressBook")

        except Exception as e:
            logging.warning(f"Could not load contacts: {e}")

    def _normalize_phone(self, phone: str) -> str:
        """Normalize phone number for consistent lookup"""
        # Remove all non-digit characters and take last 10 digits
        digits = ''.join(c for c in phone if c.isdigit())
        return digits[-10:] if len(digits) >= 10 else digits

    def _mac_timestamp_to_datetime(self, ts: Optional[int]) -> Optional[datetime]:
        """
        Convert macOS timestamp to Python datetime.
        macOS uses January 1, 2001 as epoch (not Unix 1970).
        """
        if ts is None or ts == 0:
            return None

        # Handle nanoseconds (newer macOS) vs seconds
        if ts > 1e12:
            ts = ts / 1e9

        mac_epoch = datetime(2001, 1, 1)
        try:
            return mac_epoch + timedelta(seconds=ts)
        except (ValueError, OverflowError):
            return None

    def _decode_attributed_body(self, blob: bytes) -> Optional[str]:
        """
        Decode attributedBody field from macOS Ventura+ Messages.
        This is an NSKeyedArchiver-encoded NSAttributedString.
        """
        if not blob:
            return None

        try:
            # Parse as binary plist
            plist = plistlib.loads(blob)
            objects = plist.get('$objects', [])

            # Strategy 1: Look for direct string in objects
            for obj in objects:
                if isinstance(obj, str) and len(obj) > 1:
                    # Skip internal markers
                    if not obj.startswith('$') and not obj.startswith('NS'):
                        return obj
                elif isinstance(obj, dict):
                    # Check for NSString content
                    if 'NS.string' in obj:
                        return obj['NS.string']

            # Strategy 2: Look for __kIMMessagePartAttributeName
            for i, obj in enumerate(objects):
                if isinstance(obj, dict) and 'NS.keys' in obj:
                    # This might be an NSDictionary - check values
                    pass

            # Strategy 3: Find the longest reasonable string
            candidates = []
            for obj in objects:
                if isinstance(obj, str):
                    # Filter out system strings
                    if (len(obj) > 1 and
                        not obj.startswith('$') and
                        not obj.startswith('NS') and
                        not obj.startswith('IM') and
                        not obj.startswith('__') and
                        obj not in ('NSObject', 'NSDictionary', 'NSArray', 'NSNumber', 'NSString', 'NSData')):
                        candidates.append(obj)

            if candidates:
                # Return the longest candidate (usually the message text)
                return max(candidates, key=len)

            # Strategy 4: Raw binary extraction (fallback)
            blob_str = blob.decode('utf-8', errors='ignore')

            # Look for text after common markers
            markers = ['NSString', 'streamtyped', '\x01+', '\x01*']
            for marker in markers:
                if marker in blob_str:
                    parts = blob_str.split(marker)
                    for part in reversed(parts):
                        # Extract printable ASCII characters
                        text = ''.join(c for c in part[:500] if c.isprintable() and ord(c) < 128)
                        text = text.strip()
                        if len(text) > 2:
                            # Clean up common artifacts
                            text = text.split('\x00')[0].strip()
                            if text and len(text) > 1:
                                return text

        except Exception as e:
            self.logger.debug(f"Failed to decode attributedBody: {e}")

        return None

    def get_contact_name(self, identifier: str) -> str:
        """Get contact name from phone number or email"""
        if not identifier:
            return "Unknown"

        # Check cache directly for emails
        if '@' in identifier:
            return self._contact_cache.get(identifier.lower(), identifier)

        # Normalize phone and check cache
        normalized = self._normalize_phone(identifier)
        return self._contact_cache.get(normalized, identifier)

    def get_messages_since(self, since_rowid: int = 0, limit: int = 100) -> List[Message]:
        """Get all messages since a given ROWID"""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT
                m.ROWID,
                m.guid,
                m.text,
                m.attributedBody,
                h.id as sender_id,
                m.date,
                m.is_from_me,
                m.service,
                c.chat_identifier,
                c.display_name,
                (SELECT COUNT(*) FROM chat_handle_join WHERE chat_id = c.ROWID) as participant_count
            FROM message m
            LEFT JOIN handle h ON m.handle_id = h.ROWID
            LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
            LEFT JOIN chat c ON cmj.chat_id = c.ROWID
            WHERE m.ROWID > ?
            ORDER BY m.ROWID ASC
            LIMIT ?
        ''', (since_rowid, limit))

        messages = []
        for row in cursor.fetchall():
            (rowid, guid, text, attr_body, sender_id, date,
             is_from_me, service, chat_id, display_name, participant_count) = row

            # Get text from either text field or attributedBody
            message_text = text
            if not message_text and attr_body:
                message_text = self._decode_attributed_body(attr_body)

            if message_text:  # Only include messages with actual text
                sender_name = self.get_contact_name(sender_id) if sender_id else "Me"

                messages.append(Message(
                    rowid=rowid,
                    guid=guid or f"msg_{rowid}",
                    text=message_text,
                    sender=sender_id or "Me",
                    sender_name="Me" if is_from_me else sender_name,
                    timestamp=self._mac_timestamp_to_datetime(date),
                    is_from_me=bool(is_from_me),
                    service=service or "iMessage",
                    chat_id=chat_id or "unknown",
                    is_group_chat=bool(participant_count and participant_count > 2),
                ))

        conn.close()
        return messages

    def get_conversation_history(self, chat_id: str, limit: int = 100) -> List[Message]:
        """Get full conversation history for a specific chat"""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT
                m.ROWID,
                m.guid,
                m.text,
                m.attributedBody,
                h.id as sender_id,
                m.date,
                m.is_from_me,
                m.service,
                c.chat_identifier,
                (SELECT COUNT(*) FROM chat_handle_join WHERE chat_id = c.ROWID) as participant_count
            FROM message m
            LEFT JOIN handle h ON m.handle_id = h.ROWID
            LEFT JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
            LEFT JOIN chat c ON cmj.chat_id = c.ROWID
            WHERE c.chat_identifier = ?
            ORDER BY m.date DESC
            LIMIT ?
        ''', (chat_id, limit))

        messages = []
        for row in cursor.fetchall():
            (rowid, guid, text, attr_body, sender_id, date,
             is_from_me, service, chat_identifier, participant_count) = row

            message_text = text or self._decode_attributed_body(attr_body)

            if message_text:
                messages.append(Message(
                    rowid=rowid,
                    guid=guid or f"msg_{rowid}",
                    text=message_text,
                    sender=sender_id or "Me",
                    sender_name="Me" if is_from_me else self.get_contact_name(sender_id),
                    timestamp=self._mac_timestamp_to_datetime(date),
                    is_from_me=bool(is_from_me),
                    service=service or "iMessage",
                    chat_id=chat_identifier or "unknown",
                    is_group_chat=bool(participant_count and participant_count > 2),
                ))

        conn.close()
        return list(reversed(messages))  # Return in chronological order

    def get_all_chats(self) -> List[Dict[str, Any]]:
        """Get list of all chat threads"""
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT
                c.ROWID,
                c.chat_identifier,
                c.display_name,
                (SELECT COUNT(*) FROM chat_message_join WHERE chat_id = c.ROWID) as message_count,
                (SELECT MAX(m.date) FROM message m
                 JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
                 WHERE cmj.chat_id = c.ROWID) as last_message_date
            FROM chat c
            WHERE c.chat_identifier IS NOT NULL
            ORDER BY last_message_date DESC
        ''')

        chats = []
        for row in cursor.fetchall():
            rowid, chat_id, display_name, message_count, last_date = row
            contact_name = display_name or self.get_contact_name(chat_id)

            chats.append({
                "rowid": rowid,
                "chat_id": chat_id,
                "display_name": contact_name,
                "message_count": message_count or 0,
                "last_message": self._mac_timestamp_to_datetime(last_date),
            })

        conn.close()
        return chats

    def get_max_rowid(self) -> int:
        """Get the maximum message ROWID"""
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT MAX(ROWID) FROM message')
        result = cursor.fetchone()
        conn.close()
        return result[0] if result and result[0] else 0


# ============================================================================
# CONVERSATION ANALYZER (Claude API)
# ============================================================================

class ConversationAnalyzer:
    """Analyzes conversations using Claude API"""

    def __init__(self, config: SMSIntelligenceConfig):
        self.config = config
        self.client = Anthropic(api_key=config.anthropic_api_key)
        self.logger = logging.getLogger("sms_intelligence.analyzer")

    def _format_conversation(self, messages: List[Message]) -> str:
        """Format messages for LLM analysis"""
        formatted = []
        for msg in messages:
            sender = "ME" if msg.is_from_me else msg.sender_name
            timestamp = msg.timestamp.strftime("%Y-%m-%d %H:%M") if msg.timestamp else "Unknown"
            formatted.append(f"[{timestamp}] {sender}: {msg.text}")
        return "\n".join(formatted)

    def analyze_message(self, message: Message, context: List[Message]) -> MessageAnalysis:
        """
        Analyze a single new message with conversation context.
        Uses Claude Sonnet for cost-effective analysis.
        """
        context_text = self._format_conversation(context[-self.config.analysis.context_window_size:])

        prompt = f"""Analyze this new message in the context of the recent conversation. Return ONLY valid JSON.

RECENT CONVERSATION CONTEXT:
{context_text}

NEW MESSAGE TO ANALYZE:
[{message.timestamp.strftime("%Y-%m-%d %H:%M") if message.timestamp else "Now"}] {message.sender_name}: {message.text}

Return a JSON object with these exact fields:
{{
    "requires_response": true/false,
    "urgency": "critical" | "high" | "medium" | "low" | "none",
    "sentiment": "very_positive" | "positive" | "neutral" | "negative" | "very_negative",
    "contains_question": true/false,
    "contains_commitment": true/false,
    "commitment_details": "description if commitment exists, null otherwise",
    "topics": ["topic1", "topic2"],
    "suggested_response_time": "immediate" | "within_1h" | "within_24h" | "no_rush",
    "key_info_extracted": ["any dates, times, numbers, names, or important details mentioned"]
}}

Important:
- "urgency" should be "critical" only for emergencies, "high" for time-sensitive matters
- Extract ALL dates, times, and scheduling information in key_info_extracted
- If the message is from ME, set requires_response to false unless I asked a question
"""

        try:
            response = self.client.messages.create(
                model=self.config.llm.model_standard,
                max_tokens=self.config.llm.max_tokens_standard,
                temperature=self.config.llm.temperature_analysis,
                messages=[{"role": "user", "content": prompt}]
            )

            result = self._parse_json_response(response.content[0].text)

            return MessageAnalysis(
                message_guid=message.guid,
                requires_response=result.get("requires_response", False),
                urgency=result.get("urgency", "none"),
                sentiment=result.get("sentiment", "neutral"),
                contains_question=result.get("contains_question", False),
                contains_commitment=result.get("contains_commitment", False),
                commitment_details=result.get("commitment_details"),
                topics=result.get("topics", []),
                suggested_response_time=result.get("suggested_response_time", "no_rush"),
                key_info_extracted=result.get("key_info_extracted", []),
            )

        except Exception as e:
            self.logger.error(f"Analysis failed for message {message.guid}: {e}")
            # Return default analysis on error
            return MessageAnalysis(
                message_guid=message.guid,
                requires_response=False,
                urgency="none",
                sentiment="neutral",
                contains_question=False,
                contains_commitment=False,
                commitment_details=None,
                topics=[],
                suggested_response_time="no_rush",
                key_info_extracted=[],
            )

    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Parse JSON from LLM response, handling markdown code blocks"""
        try:
            # Handle markdown code blocks
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]

            return json.loads(text.strip())
        except json.JSONDecodeError as e:
            self.logger.warning(f"JSON parse error: {e}")
            return {}


# ============================================================================
# INTELLIGENCE ENGINE
# ============================================================================

class IntelligenceEngine:
    """Main engine orchestrating message processing"""

    def __init__(self, config: SMSIntelligenceConfig):
        self.config = config
        self.logger = logging.getLogger("sms_intelligence.engine")

        # Initialize components
        self.db = MessageDatabase()
        self.analyzer = ConversationAnalyzer(config)

        # Initialize ChromaDB
        self.chroma_client = chromadb.PersistentClient(path=str(VECTOR_DB_DIR))
        self.messages_collection = self.chroma_client.get_or_create_collection(
            name=config.vector_db.messages_collection,
            metadata={"description": "SMS/iMessage semantic search"}
        )

        # Initialize Redis if available
        self.redis_client = None
        if REDIS_AVAILABLE:
            try:
                self.redis_client = redis.from_url(REDIS_URL)
                self.redis_client.ping()
                self.logger.info("Redis connected successfully")
            except Exception as e:
                self.logger.warning(f"Redis connection failed: {e}")
                self.redis_client = None

        # Track processing state
        self._last_processed_rowid = self._load_last_processed_rowid()
        self._context_cache: Dict[str, List[Message]] = {}

        # Processing stats
        self.stats = {
            "messages_processed": 0,
            "analyses_completed": 0,
            "errors": 0,
            "last_process_time": None,
        }

    def _load_last_processed_rowid(self) -> int:
        """Load last processed message ID from Redis or file"""
        if self.redis_client:
            try:
                value = self.redis_client.get("sms_intelligence:last_rowid")
                if value:
                    return int(value)
            except Exception:
                pass

        # Fallback to file
        state_file = VECTOR_DB_DIR / "state.json"
        if state_file.exists():
            try:
                with open(state_file) as f:
                    data = json.load(f)
                    return data.get("last_processed_rowid", 0)
            except Exception:
                pass

        return 0

    def _save_last_processed_rowid(self, rowid: int):
        """Save last processed message ID"""
        self._last_processed_rowid = rowid

        if self.redis_client:
            try:
                self.redis_client.set("sms_intelligence:last_rowid", rowid)
            except Exception as e:
                self.logger.warning(f"Failed to save to Redis: {e}")

        # Also save to file as backup
        state_file = VECTOR_DB_DIR / "state.json"
        try:
            with open(state_file, 'w') as f:
                json.dump({"last_processed_rowid": rowid}, f)
        except Exception as e:
            self.logger.warning(f"Failed to save state file: {e}")

    def process_new_messages(self) -> int:
        """Process all new messages since last check"""
        new_messages = self.db.get_messages_since(
            self._last_processed_rowid,
            limit=self.config.daemon.max_messages_per_cycle
        )

        if not new_messages:
            return 0

        processed_count = 0

        for message in new_messages:
            try:
                # Get conversation context
                context = self._get_chat_context(message.chat_id)

                # Analyze the message
                analysis = self.analyzer.analyze_message(message, context)

                # Store in ChromaDB
                self._store_in_vector_db(message, analysis)

                # Cache in Redis
                self._cache_message(message, analysis)

                # Check for alerts
                self._check_alerts(message, analysis)

                # Sync to Google Sheets
                if self.config.google_sheets.sync_enabled:
                    self._sync_to_sheets(message, analysis)

                # Update context cache
                self._update_context_cache(message)

                # Update processing state
                self._save_last_processed_rowid(message.rowid)
                processed_count += 1
                self.stats["messages_processed"] += 1
                self.stats["analyses_completed"] += 1

                self.logger.info(
                    f"Processed: [{message.sender_name}] {message.text[:50]}... "
                    f"(urgency={analysis.urgency}, sentiment={analysis.sentiment})"
                )

            except Exception as e:
                self.logger.error(f"Error processing message {message.rowid}: {e}")
                self.stats["errors"] += 1
                # Still update rowid to avoid getting stuck
                self._save_last_processed_rowid(message.rowid)

        self.stats["last_process_time"] = datetime.now()
        return processed_count

    def _get_chat_context(self, chat_id: str, limit: int = 20) -> List[Message]:
        """Get recent context for a chat"""
        if chat_id in self._context_cache:
            return self._context_cache[chat_id]

        messages = self.db.get_conversation_history(chat_id, limit)
        self._context_cache[chat_id] = messages
        return messages

    def _update_context_cache(self, message: Message):
        """Update context cache with new message"""
        if message.chat_id not in self._context_cache:
            self._context_cache[message.chat_id] = []

        self._context_cache[message.chat_id].append(message)

        # Keep only recent messages
        if len(self._context_cache[message.chat_id]) > 50:
            self._context_cache[message.chat_id] = self._context_cache[message.chat_id][-50:]

    def _store_in_vector_db(self, message: Message, analysis: MessageAnalysis):
        """Store message and analysis in ChromaDB for semantic search"""
        try:
            self.messages_collection.upsert(
                documents=[message.text],
                metadatas=[{
                    "message_guid": message.guid,
                    "sender": message.sender_name,
                    "sender_id": message.sender,
                    "timestamp": message.timestamp.isoformat() if message.timestamp else "",
                    "chat_id": message.chat_id,
                    "is_from_me": str(message.is_from_me),
                    "service": message.service,
                    "sentiment": analysis.sentiment,
                    "urgency": analysis.urgency,
                    "topics": json.dumps(analysis.topics),
                    "requires_response": str(analysis.requires_response),
                }],
                ids=[message.guid]
            )
        except Exception as e:
            self.logger.error(f"ChromaDB storage error: {e}")

    def _cache_message(self, message: Message, analysis: MessageAnalysis):
        """Cache message and analysis in Redis"""
        if not self.redis_client:
            return

        try:
            key = f"sms_intelligence:message:{message.guid}"
            self.redis_client.hset(key, mapping={
                "text": message.text,
                "sender": message.sender_name,
                "timestamp": message.timestamp.isoformat() if message.timestamp else "",
                "analysis": json.dumps(analysis.to_dict()),
            })
            self.redis_client.expire(key, 86400 * 30)  # 30 day TTL
        except Exception as e:
            self.logger.warning(f"Redis caching error: {e}")

    def _check_alerts(self, message: Message, analysis: MessageAnalysis):
        """Check if message requires immediate attention"""
        alerts = []

        # High urgency alert
        if analysis.urgency in self.config.analysis.alert_on_urgency:
            alerts.append({
                "type": "urgent_message",
                "priority": analysis.urgency,
                "message": f"High urgency message from {message.sender_name}",
                "content": message.text[:200],
                "chat_id": message.chat_id,
                "timestamp": datetime.now().isoformat(),
            })

        # Commitment made by other party
        if analysis.contains_commitment and not message.is_from_me:
            alerts.append({
                "type": "commitment_received",
                "priority": "medium",
                "message": f"{message.sender_name} made a commitment",
                "details": analysis.commitment_details,
                "chat_id": message.chat_id,
                "timestamp": datetime.now().isoformat(),
            })

        # Immediate response expected
        if (analysis.requires_response and
            analysis.suggested_response_time == "immediate" and
            not message.is_from_me):
            alerts.append({
                "type": "immediate_response_needed",
                "priority": "high",
                "message": f"Immediate response expected for {message.sender_name}",
                "content": message.text[:200],
                "chat_id": message.chat_id,
                "timestamp": datetime.now().isoformat(),
            })

        # Negative sentiment alert
        if analysis.sentiment in ["negative", "very_negative"] and self.config.analysis.alert_on_negative_sentiment:
            alerts.append({
                "type": "negative_sentiment",
                "priority": "medium",
                "message": f"Negative sentiment detected from {message.sender_name}",
                "sentiment": analysis.sentiment,
                "chat_id": message.chat_id,
                "timestamp": datetime.now().isoformat(),
            })

        # Store alerts
        for alert in alerts:
            self._store_alert(alert)
            self.logger.warning(f"ALERT: {alert['type']} - {alert['message']}")

    def _store_alert(self, alert: Dict[str, Any]):
        """Store alert in Redis"""
        if self.redis_client:
            try:
                self.redis_client.lpush(
                    "sms_intelligence:alerts",
                    json.dumps(alert)
                )
                self.redis_client.ltrim("sms_intelligence:alerts", 0, 999)  # Keep last 1000
            except Exception as e:
                self.logger.warning(f"Failed to store alert in Redis: {e}")

    def _sync_to_sheets(self, message: Message, analysis: MessageAnalysis):
        """Sync message and analysis to Google Sheets"""
        try:
            payload = {
                "action": "smsIntelligence",
                "data": {
                    "message": message.to_dict(),
                    "analysis": analysis.to_dict(),
                }
            }

            response = requests.post(
                GOOGLE_SHEETS_API_URL,
                json=payload,
                timeout=10
            )

            if response.status_code != 200:
                self.logger.warning(f"Google Sheets sync failed: {response.status_code}")

        except Exception as e:
            self.logger.warning(f"Google Sheets sync error: {e}")

    def semantic_search(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search conversations semantically"""
        try:
            results = self.messages_collection.query(
                query_texts=[query],
                n_results=limit
            )

            if not results or not results["documents"]:
                return []

            return [
                {
                    "text": doc,
                    "metadata": meta,
                    "distance": dist if results.get("distances") else None
                }
                for doc, meta, dist in zip(
                    results["documents"][0],
                    results["metadatas"][0],
                    results.get("distances", [[]])[0] or [None] * len(results["documents"][0])
                )
            ]
        except Exception as e:
            self.logger.error(f"Semantic search error: {e}")
            return []

    def get_recent_alerts(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent alerts from Redis"""
        if not self.redis_client:
            return []

        try:
            alerts = self.redis_client.lrange("sms_intelligence:alerts", 0, limit - 1)
            return [json.loads(a) for a in alerts]
        except Exception as e:
            self.logger.error(f"Failed to get alerts: {e}")
            return []

    def get_status(self) -> Dict[str, Any]:
        """Get system status"""
        return {
            "last_processed_rowid": self._last_processed_rowid,
            "current_max_rowid": self.db.get_max_rowid(),
            "pending_messages": self.db.get_max_rowid() - self._last_processed_rowid,
            "stats": self.stats,
            "redis_connected": bool(self.redis_client),
            "vector_db_path": str(VECTOR_DB_DIR),
            "chat_db_path": str(CHAT_DB_PATH),
            "chat_db_exists": CHAT_DB_PATH.exists(),
        }


# ============================================================================
# FILE WATCHER DAEMON
# ============================================================================

class MessageWatcherDaemon:
    """Background daemon that watches for new messages using watchdog"""

    def __init__(self, engine: IntelligenceEngine, config: SMSIntelligenceConfig):
        self.engine = engine
        self.config = config
        self.logger = logging.getLogger("sms_intelligence.daemon")
        self.observer = None
        self._running = False
        self._last_process_time = 0

    def start(self):
        """Start the file watcher daemon"""
        self._running = True

        # Set up signal handlers
        signal.signal(signal.SIGTERM, self._handle_signal)
        signal.signal(signal.SIGINT, self._handle_signal)

        # Process any pending messages on startup
        if self.config.daemon.process_on_startup:
            self.logger.info("Processing pending messages on startup...")
            count = self.engine.process_new_messages()
            self.logger.info(f"Processed {count} pending messages")

        # Create file watcher
        class Handler(FileSystemEventHandler):
            def __init__(handler_self, daemon):
                handler_self.daemon = daemon

            def on_modified(handler_self, event):
                if 'chat.db' in event.src_path:
                    handler_self.daemon._on_database_change()

        messages_dir = str(CHAT_DB_PATH.parent)
        self.observer = Observer()
        self.observer.schedule(Handler(self), messages_dir, recursive=False)
        self.observer.start()

        self.logger.info(f"Started watching {messages_dir}")
        self.logger.info("SMS Intelligence Daemon is running. Press Ctrl+C to stop.")

        # Main loop
        try:
            while self._running:
                time.sleep(1)

                # Periodic health check
                if time.time() % self.config.daemon.health_check_interval_seconds < 1:
                    self._health_check()

        except KeyboardInterrupt:
            self.logger.info("Shutdown requested...")
        finally:
            self.stop()

    def _on_database_change(self):
        """Handle database modification event"""
        # Debounce
        now = time.time()
        if now - self._last_process_time < self.config.daemon.debounce_seconds:
            return

        self._last_process_time = now

        try:
            count = self.engine.process_new_messages()
            if count > 0:
                self.logger.info(f"Processed {count} new messages")
        except Exception as e:
            self.logger.error(f"Error processing messages: {e}")

    def _health_check(self):
        """Perform periodic health check"""
        try:
            status = self.engine.get_status()
            pending = status.get("pending_messages", 0)
            if pending > 100:
                self.logger.warning(f"High pending message count: {pending}")
        except Exception as e:
            self.logger.error(f"Health check failed: {e}")

    def _handle_signal(self, signum, frame):
        """Handle termination signals"""
        self.logger.info(f"Received signal {signum}")
        self._running = False

    def stop(self):
        """Stop the daemon"""
        self._running = False
        if self.observer:
            self.observer.stop()
            self.observer.join(timeout=5)
        self.logger.info("SMS Intelligence Daemon stopped")


# ============================================================================
# CLI INTERFACE
# ============================================================================

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="SMS Intelligence System - Enterprise-grade iMessage analysis",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python sms_daemon.py --mode daemon          # Run as background daemon
    python sms_daemon.py --mode analyze         # Process pending messages once
    python sms_daemon.py --mode search --query "meeting tomorrow"
    python sms_daemon.py --mode status          # Show system status
    python sms_daemon.py --mode chats           # List all conversations
        """
    )

    parser.add_argument(
        '--mode',
        choices=['daemon', 'analyze', 'search', 'status', 'chats'],
        default='daemon',
        help='Operating mode'
    )
    parser.add_argument(
        '--query',
        help='Search query (for search mode)'
    )
    parser.add_argument(
        '--limit',
        type=int,
        default=10,
        help='Limit for search results or chat list'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )

    args = parser.parse_args()

    # Setup logging
    config = get_config()
    if args.verbose:
        config.daemon.log_level = "DEBUG"
    logger = setup_logging(config.daemon)

    # Validate configuration
    errors = config.validate()
    if errors:
        for error in errors:
            logger.error(f"Configuration error: {error}")

        if "API key" in str(errors):
            print("\nTo configure your Anthropic API key:")
            print("  export ANTHROPIC_API_KEY='your-key-here'")
            print("  or run: python setup.sh")
            sys.exit(1)

        if "Messages database" in str(errors):
            print("\nMessages database not found. Ensure Full Disk Access is granted.")
            sys.exit(1)

    # Check Full Disk Access
    if not check_full_disk_access():
        logger.error("Full Disk Access not granted!")
        print("\nTo grant Full Disk Access:")
        print("  1. Open System Settings > Privacy & Security > Full Disk Access")
        print("  2. Add Terminal (or your Python installation)")
        print("  3. Restart Terminal")
        sys.exit(1)

    # Initialize engine
    engine = IntelligenceEngine(config)

    # Execute based on mode
    if args.mode == 'daemon':
        daemon = MessageWatcherDaemon(engine, config)
        daemon.start()

    elif args.mode == 'analyze':
        logger.info("Processing pending messages...")
        count = engine.process_new_messages()
        print(f"Processed {count} messages")

    elif args.mode == 'search':
        if not args.query:
            print("Error: --query required for search mode")
            sys.exit(1)

        results = engine.semantic_search(args.query, args.limit)
        if results:
            print(f"\nSearch results for: '{args.query}'\n")
            for i, r in enumerate(results, 1):
                meta = r['metadata']
                print(f"{i}. [{meta.get('sender', 'Unknown')}] {r['text'][:100]}...")
                print(f"   Sentiment: {meta.get('sentiment', 'N/A')} | "
                      f"Chat: {meta.get('chat_id', 'N/A')[:30]}")
                print()
        else:
            print("No results found")

    elif args.mode == 'status':
        status = engine.get_status()
        print("\n" + "=" * 50)
        print("SMS Intelligence System Status")
        print("=" * 50)
        print(f"Last Processed ROWID: {status['last_processed_rowid']}")
        print(f"Current Max ROWID: {status['current_max_rowid']}")
        print(f"Pending Messages: {status['pending_messages']}")
        print(f"Redis Connected: {status['redis_connected']}")
        print(f"Messages Processed: {status['stats']['messages_processed']}")
        print(f"Errors: {status['stats']['errors']}")
        print(f"Vector DB: {status['vector_db_path']}")
        print("=" * 50 + "\n")

    elif args.mode == 'chats':
        db = MessageDatabase()
        chats = db.get_all_chats()[:args.limit]

        print("\n" + "=" * 60)
        print("Recent Conversations")
        print("=" * 60)
        for chat in chats:
            last_msg = chat['last_message'].strftime("%Y-%m-%d %H:%M") if chat['last_message'] else "Unknown"
            print(f"\n{chat['display_name']}")
            print(f"  Messages: {chat['message_count']} | Last: {last_msg}")
            print(f"  Chat ID: {chat['chat_id'][:50]}...")
        print()


if __name__ == "__main__":
    main()
