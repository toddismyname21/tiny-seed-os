#!/usr/bin/env python3
"""
TINY SEED FARM - BULLETPROOF iMESSAGE MONITOR
============================================
Enterprise-Grade Automatic SMS Capture System

This daemon monitors ALL incoming and outgoing iMessages/SMS on your Mac
and sends them to the Chief of Staff AI Intelligence System for processing.

NOTHING SLIPS THROUGH THE CRACKS.

Features:
- Captures ALL messages (incoming AND outgoing)
- Runs automatically on Mac startup
- Survives crashes with auto-restart
- Handles macOS Ventura+ attributedBody format
- Robust webhook with exponential backoff retry
- State persistence (remembers where it left off)
- Full Disk Access permission verification
- Graceful shutdown on SIGTERM/SIGINT

Requirements:
- Python 3.9+
- requests library (pip3 install requests)
- Full Disk Access permission granted to Python

Created: 2026-01-22
Architecture: Production-grade daemon with launchd integration
"""

import sqlite3
import time
import os
import json
import logging
import signal
import sys
import hashlib
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

try:
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
except ImportError:
    print("ERROR: requests library not installed")
    print("Run: pip3 install requests")
    sys.exit(1)


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

class Config:
    """Central configuration - modify these values for your setup."""

    # Database location (standard macOS Messages location)
    DB_PATH = Path.home() / "Library/Messages/chat.db"

    # Your Google Apps Script webhook URL
    # This is the Tiny Seed Farm API endpoint
    WEBHOOK_URL = os.environ.get(
        "WEBHOOK_URL",
        "https://script.google.com/macros/s/AKfycbx8syGK5Bm60fypNO0yE60BYtTFJXxviaEtgrqENmF5GStB58UCEA4Shu_IF9r6kjf5/exec"
    )

    # How often to check for new messages (seconds)
    # 2 seconds is optimal - fast enough to feel real-time, light on CPU
    POLL_INTERVAL = 2

    # State file - remembers last processed message across restarts
    STATE_FILE = Path.home() / ".tiny_seed_sms_state.json"

    # Log file location
    LOG_DIR = Path.home() / "Library/Logs/TinySeedFarm"
    LOG_FILE = LOG_DIR / "imessage-monitor.log"

    # macOS epoch offset (January 1, 2001 in Unix timestamp)
    MACOS_EPOCH_OFFSET = 978307200

    # Maximum messages to process per poll (prevents overwhelming the API)
    MAX_MESSAGES_PER_POLL = 50

    # Retry configuration for webhook
    WEBHOOK_RETRIES = 5
    WEBHOOK_BACKOFF_FACTOR = 1  # 1, 2, 4, 8, 16 seconds
    WEBHOOK_TIMEOUT = (5, 30)  # (connect, read) timeouts

    # Deduplication cache size
    DEDUP_CACHE_SIZE = 10000


# ═══════════════════════════════════════════════════════════════════════════════
# DATA STRUCTURES
# ═══════════════════════════════════════════════════════════════════════════════

class MessageDirection(Enum):
    INCOMING = "INBOUND"
    OUTGOING = "OUTBOUND"


@dataclass
class Message:
    """Structured message data."""
    rowid: int
    guid: str
    text: Optional[str]
    timestamp: str
    direction: str
    contact_id: str
    contact_name: Optional[str]
    is_group_chat: bool
    group_chat_id: Optional[str]
    chat_name: Optional[str]
    is_read: bool
    is_delivered: bool
    has_attachment: bool

    def to_webhook_payload(self) -> Dict[str, Any]:
        """Convert to webhook payload format."""
        return {
            "action": "receiveSMS",
            "message": self.text or "",
            "sender": self.contact_id,
            "senderName": self.contact_name or self.contact_id or "Unknown",
            "phone": self.contact_id,
            "direction": self.direction,
            "timestamp": self.timestamp,
            "isGroupChat": self.is_group_chat,
            "groupChatId": self.group_chat_id,
            "chatName": self.chat_name,
            "source": "imessage_monitor",
            "rowid": self.rowid,
            "guid": self.guid
        }


# ═══════════════════════════════════════════════════════════════════════════════
# LOGGING SETUP
# ═══════════════════════════════════════════════════════════════════════════════

def setup_logging():
    """Configure logging with file and console output."""
    Config.LOG_DIR.mkdir(parents=True, exist_ok=True)

    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # File handler (rotating would be better for production)
    file_handler = logging.FileHandler(Config.LOG_FILE)
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.INFO)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)

    # Configure root logger
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logging.getLogger(__name__)


logger = setup_logging()


# ═══════════════════════════════════════════════════════════════════════════════
# PERMISSION CHECKER
# ═══════════════════════════════════════════════════════════════════════════════

def check_full_disk_access() -> bool:
    """
    Verify Full Disk Access permission is granted.
    This is REQUIRED to read the Messages database.
    """
    try:
        # Try to read the Messages database
        with open(Config.DB_PATH, 'rb') as f:
            f.read(1)
        logger.info("Full Disk Access: GRANTED")
        return True
    except PermissionError:
        logger.error("=" * 60)
        logger.error("FULL DISK ACCESS NOT GRANTED!")
        logger.error("=" * 60)
        logger.error("")
        logger.error("This script needs Full Disk Access to read your messages.")
        logger.error("")
        logger.error("To fix this:")
        logger.error("1. Open System Settings (or System Preferences)")
        logger.error("2. Go to Privacy & Security → Full Disk Access")
        logger.error("3. Click the lock icon and enter your password")
        logger.error("4. Click + and add Python:")
        logger.error(f"   {sys.executable}")
        logger.error("5. Also add Terminal.app if testing manually")
        logger.error("6. RESTART Terminal after granting permission!")
        logger.error("")
        logger.error("=" * 60)
        return False
    except FileNotFoundError:
        logger.error(f"Messages database not found at: {Config.DB_PATH}")
        logger.error("Make sure Messages app has been used on this Mac.")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# MESSAGE DATABASE READER
# ═══════════════════════════════════════════════════════════════════════════════

class MessageDatabaseReader:
    """Reads messages from the macOS Messages database."""

    def __init__(self):
        self.last_rowid = 0
        self.processed_guids: set = set()
        self._load_state()

    def _load_state(self):
        """Load last processed ROWID from state file."""
        try:
            if Config.STATE_FILE.exists():
                with open(Config.STATE_FILE, 'r') as f:
                    state = json.load(f)
                    self.last_rowid = state.get('last_rowid', 0)
                    # Load recent GUIDs for deduplication
                    self.processed_guids = set(state.get('recent_guids', []))
                    logger.info(f"Loaded state: last_rowid={self.last_rowid}")
        except Exception as e:
            logger.warning(f"Could not load state: {e}")
            self.last_rowid = 0

    def save_state(self):
        """Save current state to file."""
        try:
            # Keep only recent GUIDs for deduplication
            recent_guids = list(self.processed_guids)[-1000:]

            with open(Config.STATE_FILE, 'w') as f:
                json.dump({
                    'last_rowid': self.last_rowid,
                    'recent_guids': recent_guids,
                    'last_updated': datetime.now().isoformat()
                }, f, indent=2)
        except Exception as e:
            logger.error(f"Could not save state: {e}")

    def _parse_attributed_body(self, blob: bytes) -> Optional[str]:
        """
        Parse attributedBody blob to extract message text.
        Required for macOS Ventura and later where 'text' field is often NULL.
        """
        if not blob:
            return None

        try:
            # Method 1: Look for NSString marker
            for marker in [b"NSString", b"NSMutableString"]:
                pos = blob.find(marker)
                if pos != -1:
                    # Skip marker and preamble bytes
                    pos += len(marker)

                    # Skip variable-length preamble (usually 4-6 bytes)
                    while pos < len(blob) and blob[pos] < 0x20 and blob[pos] != 0:
                        pos += 1

                    # Handle length encoding
                    if pos < len(blob):
                        length_byte = blob[pos]

                        if length_byte == 0x81 and pos + 2 < len(blob):
                            # 2-byte length (little endian)
                            length = int.from_bytes(blob[pos+1:pos+3], 'little')
                            pos += 3
                        elif length_byte == 0x82 and pos + 3 < len(blob):
                            # 3-byte length
                            length = int.from_bytes(blob[pos+1:pos+4], 'little')
                            pos += 4
                        elif length_byte < 0x80:
                            # Single byte length
                            length = length_byte
                            pos += 1
                        else:
                            continue

                        if pos + length <= len(blob):
                            text = blob[pos:pos+length].decode('utf-8', errors='ignore')
                            if text.strip():
                                return text.strip()

            # Method 2: Look for readable text sequences
            # Sometimes the text is stored differently
            text_start = None
            for i in range(len(blob) - 10):
                # Look for start of readable text
                if blob[i:i+1].isalpha() or blob[i] in (0x20, 0x27, 0x22):
                    if text_start is None:
                        text_start = i
                elif text_start is not None:
                    if i - text_start > 5:
                        candidate = blob[text_start:i].decode('utf-8', errors='ignore')
                        if len(candidate) > 3 and not candidate.startswith('NS'):
                            return candidate.strip()
                    text_start = None

            return None

        except Exception as e:
            logger.debug(f"Could not parse attributedBody: {e}")
            return None

    def _convert_timestamp(self, mac_timestamp: int) -> Optional[str]:
        """Convert macOS timestamp to ISO format string."""
        if not mac_timestamp or mac_timestamp == 0:
            return datetime.now().isoformat()

        try:
            # Handle nanosecond precision (modern macOS uses nanoseconds)
            if mac_timestamp > 1e15:
                mac_timestamp = mac_timestamp / 1e9
            elif mac_timestamp > 1e12:
                mac_timestamp = mac_timestamp / 1e6

            unix_timestamp = mac_timestamp + Config.MACOS_EPOCH_OFFSET
            return datetime.fromtimestamp(unix_timestamp).isoformat()
        except Exception:
            return datetime.now().isoformat()

    def _get_contact_name(self, conn: sqlite3.Connection, handle_id: int) -> Optional[str]:
        """Try to get contact name from handle."""
        # The Messages database doesn't store names directly
        # Names come from Contacts.app which we can't easily access
        # Return None and let the webhook system handle name lookup
        return None

    def get_new_messages(self) -> List[Message]:
        """Fetch all new messages since last check."""
        messages = []

        try:
            # Open database in read-only mode with URI
            # This properly handles WAL mode
            conn = sqlite3.connect(
                f'file:{Config.DB_PATH}?mode=ro',
                uri=True,
                timeout=10
            )
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Query for new messages
            query = """
            SELECT
                message.ROWID as rowid,
                message.guid,
                message.text,
                message.attributedBody,
                message.date,
                message.date_read,
                message.date_delivered,
                message.is_from_me,
                message.is_read,
                message.is_sent,
                message.is_delivered,
                message.cache_has_attachments,
                message.cache_roomnames as group_chat_id,
                handle.id as contact_id,
                chat.display_name as chat_name,
                chat.chat_identifier as chat_identifier
            FROM message
            LEFT JOIN handle ON message.handle_id = handle.ROWID
            LEFT JOIN chat_message_join ON message.ROWID = chat_message_join.message_id
            LEFT JOIN chat ON chat_message_join.chat_id = chat.ROWID
            WHERE message.ROWID > ?
            ORDER BY message.ROWID ASC
            LIMIT ?
            """

            cursor.execute(query, (self.last_rowid, Config.MAX_MESSAGES_PER_POLL))

            for row in cursor.fetchall():
                # Skip if already processed (deduplication by GUID)
                guid = row['guid']
                if guid in self.processed_guids:
                    continue

                # Get message text (try text field first, then attributedBody)
                text = row['text']
                if not text and row['attributedBody']:
                    text = self._parse_attributed_body(row['attributedBody'])

                # Skip empty messages (reactions, typing indicators, etc.)
                if not text or not text.strip():
                    # Still update rowid to skip this message
                    if row['rowid'] > self.last_rowid:
                        self.last_rowid = row['rowid']
                    continue

                # Determine direction
                direction = MessageDirection.OUTGOING.value if row['is_from_me'] else MessageDirection.INCOMING.value

                # Determine if group chat
                is_group = bool(row['group_chat_id'] or (row['chat_identifier'] and row['chat_identifier'].startswith('chat')))

                # Create message object
                message = Message(
                    rowid=row['rowid'],
                    guid=guid,
                    text=text.strip(),
                    timestamp=self._convert_timestamp(row['date']),
                    direction=direction,
                    contact_id=row['contact_id'] or row['chat_identifier'] or 'Unknown',
                    contact_name=None,  # Will be looked up by webhook
                    is_group_chat=is_group,
                    group_chat_id=row['group_chat_id'],
                    chat_name=row['chat_name'],
                    is_read=bool(row['is_read']),
                    is_delivered=bool(row['is_delivered']),
                    has_attachment=bool(row['cache_has_attachments'])
                )

                messages.append(message)

                # Update tracking
                self.processed_guids.add(guid)
                if row['rowid'] > self.last_rowid:
                    self.last_rowid = row['rowid']

                # Keep dedup cache bounded
                if len(self.processed_guids) > Config.DEDUP_CACHE_SIZE:
                    # Keep most recent half
                    self.processed_guids = set(list(self.processed_guids)[-Config.DEDUP_CACHE_SIZE//2:])

            conn.close()

        except sqlite3.Error as e:
            logger.error(f"Database error: {e}")
        except Exception as e:
            logger.error(f"Error fetching messages: {e}", exc_info=True)

        return messages


# ═══════════════════════════════════════════════════════════════════════════════
# WEBHOOK SENDER
# ═══════════════════════════════════════════════════════════════════════════════

class WebhookSender:
    """Sends messages to the Chief of Staff webhook with robust retry logic."""

    def __init__(self):
        self.session = self._create_session()
        self.failed_messages: List[Dict] = []

    def _create_session(self) -> requests.Session:
        """Create HTTP session with automatic retry and exponential backoff."""
        session = requests.Session()

        retry_strategy = Retry(
            total=Config.WEBHOOK_RETRIES,
            backoff_factor=Config.WEBHOOK_BACKOFF_FACTOR,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["POST", "GET"],
        )

        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("https://", adapter)
        session.mount("http://", adapter)

        return session

    def send(self, message: Message) -> bool:
        """Send message to webhook."""
        payload = message.to_webhook_payload()

        try:
            # Use POST for the webhook
            response = self.session.post(
                Config.WEBHOOK_URL,
                json=payload,
                timeout=Config.WEBHOOK_TIMEOUT,
                headers={"Content-Type": "application/json"}
            )

            response.raise_for_status()

            # Log success
            direction_emoji = "📤" if message.direction == "OUTBOUND" else "📥"
            contact = message.contact_name or message.contact_id or "Unknown"
            preview = (message.text[:50] + "...") if len(message.text) > 50 else message.text

            logger.info(f"{direction_emoji} [{contact}] {preview}")

            # Try to parse response for AI analysis summary
            try:
                result = response.json()
                if result.get('success'):
                    if result.get('priorityScore'):
                        logger.info(f"   → Priority: {result['priorityScore']} | {result.get('intent', 'N/A')} | {result.get('sentiment', 'N/A')}")
                    if result.get('commitmentsCreated', 0) > 0:
                        logger.info(f"   → {result['commitmentsCreated']} commitment(s) tracked!")
            except:
                pass

            return True

        except requests.exceptions.RequestException as e:
            logger.error(f"Webhook failed for message {message.rowid}: {e}")
            self.failed_messages.append(payload)
            return False

    def retry_failed(self) -> int:
        """Retry sending failed messages. Returns number of successes."""
        if not self.failed_messages:
            return 0

        logger.info(f"Retrying {len(self.failed_messages)} failed messages...")
        successes = 0
        still_failed = []

        for payload in self.failed_messages:
            try:
                response = self.session.post(
                    Config.WEBHOOK_URL,
                    json=payload,
                    timeout=Config.WEBHOOK_TIMEOUT,
                    headers={"Content-Type": "application/json"}
                )
                response.raise_for_status()
                successes += 1
            except:
                still_failed.append(payload)

        self.failed_messages = still_failed

        if successes > 0:
            logger.info(f"Retry succeeded for {successes} messages")
        if still_failed:
            logger.warning(f"{len(still_failed)} messages still failing")

        return successes


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN MONITOR
# ═══════════════════════════════════════════════════════════════════════════════

class iMessageMonitor:
    """Main monitoring daemon."""

    def __init__(self):
        self.running = True
        self.reader = MessageDatabaseReader()
        self.sender = WebhookSender()
        self.stats = {
            'started_at': datetime.now().isoformat(),
            'messages_processed': 0,
            'messages_sent': 0,
            'errors': 0
        }

        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGTERM, self._shutdown_handler)
        signal.signal(signal.SIGINT, self._shutdown_handler)

    def _shutdown_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        logger.info(f"Received shutdown signal ({signum})")
        self.running = False

    def _print_banner(self):
        """Print startup banner."""
        logger.info("=" * 60)
        logger.info("TINY SEED FARM - iMESSAGE MONITOR")
        logger.info("=" * 60)
        logger.info(f"Database: {Config.DB_PATH}")
        logger.info(f"Webhook: {Config.WEBHOOK_URL[:50]}...")
        logger.info(f"Poll interval: {Config.POLL_INTERVAL}s")
        logger.info(f"Starting from ROWID: {self.reader.last_rowid}")
        logger.info("=" * 60)
        logger.info("Monitoring for new messages... (Ctrl+C to stop)")
        logger.info("")

    def run(self):
        """Main monitoring loop."""
        # Check permissions first
        if not check_full_disk_access():
            sys.exit(1)

        self._print_banner()

        consecutive_errors = 0
        last_retry_time = datetime.now()

        while self.running:
            try:
                # Get new messages
                messages = self.reader.get_new_messages()

                # Process each message
                for message in messages:
                    self.stats['messages_processed'] += 1

                    if self.sender.send(message):
                        self.stats['messages_sent'] += 1
                    else:
                        self.stats['errors'] += 1

                # Save state after processing
                if messages:
                    self.reader.save_state()

                # Reset error counter on success
                consecutive_errors = 0

                # Periodically retry failed messages
                if datetime.now() - last_retry_time > timedelta(minutes=5):
                    self.sender.retry_failed()
                    last_retry_time = datetime.now()

            except Exception as e:
                consecutive_errors += 1
                self.stats['errors'] += 1
                logger.error(f"Error in main loop: {e}", exc_info=True)

                # Exponential backoff on repeated errors
                if consecutive_errors > 5:
                    sleep_time = min(30 * consecutive_errors, 300)  # Max 5 min
                    logger.warning(f"Too many errors, sleeping {sleep_time}s...")
                    time.sleep(sleep_time)

            # Sleep until next poll
            time.sleep(Config.POLL_INTERVAL)

        # Graceful shutdown
        logger.info("Shutting down...")
        self.reader.save_state()

        # Final retry of failed messages
        self.sender.retry_failed()

        # Print stats
        logger.info("=" * 60)
        logger.info("SESSION STATISTICS")
        logger.info(f"  Started: {self.stats['started_at']}")
        logger.info(f"  Messages processed: {self.stats['messages_processed']}")
        logger.info(f"  Messages sent: {self.stats['messages_sent']}")
        logger.info(f"  Errors: {self.stats['errors']}")
        logger.info("=" * 60)
        logger.info("Monitor stopped.")


# ═══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    """Entry point."""
    # Quick test mode
    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        logger.info("Running in test mode...")
        if check_full_disk_access():
            logger.info("Permission check: PASSED")
            reader = MessageDatabaseReader()
            messages = reader.get_new_messages()
            logger.info(f"Found {len(messages)} new messages")
            for msg in messages[:5]:
                logger.info(f"  {msg.direction}: {msg.text[:50]}...")
        return

    # Run the monitor
    monitor = iMessageMonitor()
    monitor.run()


if __name__ == "__main__":
    main()
