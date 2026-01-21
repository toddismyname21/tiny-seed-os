#!/usr/bin/env python3
"""
SMS Intelligence System Configuration
=====================================

Enterprise-grade configuration for the SMS/iMessage intelligence system.
Follows patterns from Gong.io and Salesforce Einstein.

Configuration Hierarchy:
1. Environment variables (highest priority)
2. Config file (~/.sms_intelligence/config.json)
3. Default values (lowest priority)
"""

import os
import json
import logging
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from enum import Enum


# ============================================================================
# ENVIRONMENT & PATHS
# ============================================================================

# Base directories
HOME_DIR = Path.home()
CONFIG_DIR = HOME_DIR / ".sms_intelligence"
DATA_DIR = CONFIG_DIR / "data"
LOG_DIR = CONFIG_DIR / "logs"
VECTOR_DB_DIR = DATA_DIR / "chromadb"

# macOS Message Database paths
CHAT_DB_PATH = HOME_DIR / "Library" / "Messages" / "chat.db"
CHAT_DB_WAL_PATH = HOME_DIR / "Library" / "Messages" / "chat.db-wal"
CONTACTS_DB_PATH = HOME_DIR / "Library" / "Application Support" / "AddressBook" / "AddressBook-v22.abcddb"

# Alternative AddressBook path for newer macOS
CONTACTS_DB_PATH_ALT = HOME_DIR / "Library" / "Application Support" / "AddressBook" / "Sources"


# ============================================================================
# API ENDPOINTS
# ============================================================================

# Google Sheets API endpoint (Tiny Seed OS)
GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbx8syGK5Bm60fypNO0yE60BYtTFJXxviaEtgrqENmF5GStB58UCEA4Shu_IF9r6kjf5/exec"

# Redis configuration
REDIS_URL = os.getenv("SMS_INTELLIGENCE_REDIS_URL", "redis://localhost:6379/0")
REDIS_ALERTS_CHANNEL = "sms_intelligence:alerts"
REDIS_MESSAGES_QUEUE = "sms_intelligence:messages"


# ============================================================================
# ANALYSIS SETTINGS
# ============================================================================

class AnalysisLevel(Enum):
    """Level of analysis depth"""
    QUICK = "quick"           # Basic sentiment, urgency only
    STANDARD = "standard"     # Full single-message analysis
    DEEP = "deep"             # Full thread analysis with predictions


class UrgencyLevel(Enum):
    """Urgency levels for messages"""
    CRITICAL = "critical"     # Requires immediate response
    HIGH = "high"             # Should respond within 1 hour
    MEDIUM = "medium"         # Respond within 24 hours
    LOW = "low"               # No time pressure
    NONE = "none"             # Informational only


class SentimentLevel(Enum):
    """Sentiment classification"""
    VERY_POSITIVE = "very_positive"
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    VERY_NEGATIVE = "very_negative"


@dataclass
class AnalysisConfig:
    """Configuration for message analysis"""

    # Default analysis level for new messages
    default_level: AnalysisLevel = AnalysisLevel.STANDARD

    # Context window (number of recent messages to include)
    context_window_size: int = 10

    # Deep analysis trigger thresholds
    deep_analysis_message_threshold: int = 20  # Analyze thread if > N messages
    deep_analysis_interval_hours: int = 24      # Re-analyze threads every N hours

    # Batch processing settings
    batch_size: int = 10                        # Messages per batch for bulk processing
    batch_delay_seconds: float = 0.5            # Delay between batches (rate limiting)

    # Thread summarization
    thread_chunk_size: int = 20                 # Messages per chunk for hierarchical summary
    max_summary_length: int = 500               # Max characters for summaries

    # Commitment tracking
    track_commitments: bool = True
    commitment_reminder_hours: int = 24         # Remind about commitments after N hours

    # Alert thresholds
    alert_on_urgency: List[str] = field(default_factory=lambda: ["critical", "high"])
    alert_on_negative_sentiment: bool = True
    alert_on_unanswered_questions_hours: int = 4


@dataclass
class LLMConfig:
    """Configuration for LLM (Claude) API"""

    # Model selection
    model_quick: str = "claude-sonnet-4-20250514"       # For quick analysis
    model_standard: str = "claude-sonnet-4-20250514"    # For standard analysis
    model_deep: str = "claude-sonnet-4-20250514"        # For deep thread analysis

    # Token limits
    max_tokens_quick: int = 500
    max_tokens_standard: int = 1000
    max_tokens_deep: int = 2000

    # Rate limiting
    requests_per_minute: int = 50
    tokens_per_minute: int = 100000

    # Retry settings
    max_retries: int = 3
    retry_delay_seconds: float = 1.0

    # Temperature settings (lower = more deterministic)
    temperature_analysis: float = 0.3
    temperature_suggestions: float = 0.7


@dataclass
class VectorDBConfig:
    """Configuration for ChromaDB vector storage"""

    # Collection names
    messages_collection: str = "sms_messages"
    threads_collection: str = "sms_threads"
    summaries_collection: str = "thread_summaries"

    # Embedding settings
    embedding_model: str = "default"  # ChromaDB default embedding

    # Search settings
    default_search_limit: int = 10
    similarity_threshold: float = 0.7

    # Maintenance
    cleanup_older_than_days: int = 365  # Keep data for 1 year


@dataclass
class GoogleSheetsConfig:
    """Configuration for Google Sheets sync"""

    # Sheet names/tabs
    messages_sheet: str = "SMS_Messages"
    analysis_sheet: str = "SMS_Analysis"
    alerts_sheet: str = "SMS_Alerts"
    contacts_sheet: str = "SMS_Contacts"

    # Sync settings
    sync_enabled: bool = True
    sync_interval_minutes: int = 5
    batch_sync_size: int = 50

    # Retry settings
    max_retries: int = 3
    retry_delay_seconds: float = 2.0


@dataclass
class DaemonConfig:
    """Configuration for the background daemon"""

    # File watching
    debounce_seconds: float = 1.0        # Minimum time between processing
    poll_fallback_seconds: float = 5.0   # Polling interval if watchdog fails

    # Processing
    process_on_startup: bool = True      # Process pending messages on start
    max_messages_per_cycle: int = 100    # Limit messages per processing cycle

    # Health checks
    health_check_interval_seconds: int = 60
    max_consecutive_errors: int = 5      # Restart after N consecutive errors

    # Logging
    log_level: str = "INFO"
    log_rotation_days: int = 7
    log_max_size_mb: int = 50


# ============================================================================
# MAIN CONFIGURATION CLASS
# ============================================================================

@dataclass
class SMSIntelligenceConfig:
    """Main configuration container"""

    analysis: AnalysisConfig = field(default_factory=AnalysisConfig)
    llm: LLMConfig = field(default_factory=LLMConfig)
    vector_db: VectorDBConfig = field(default_factory=VectorDBConfig)
    google_sheets: GoogleSheetsConfig = field(default_factory=GoogleSheetsConfig)
    daemon: DaemonConfig = field(default_factory=DaemonConfig)

    # API Keys (loaded from environment or keyring)
    anthropic_api_key: Optional[str] = None

    def __post_init__(self):
        """Load API keys and validate configuration"""
        self._load_api_keys()
        self._ensure_directories()

    def _load_api_keys(self):
        """Load API keys from environment or secure storage"""
        # Try environment variable first
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")

        # Try keyring if not in environment
        if not self.anthropic_api_key:
            try:
                import keyring
                self.anthropic_api_key = keyring.get_password(
                    "sms_intelligence",
                    "anthropic_api_key"
                )
            except ImportError:
                pass

    def _ensure_directories(self):
        """Create necessary directories"""
        for directory in [CONFIG_DIR, DATA_DIR, LOG_DIR, VECTOR_DB_DIR]:
            directory.mkdir(parents=True, exist_ok=True)

    def validate(self) -> List[str]:
        """Validate configuration, return list of errors"""
        errors = []

        if not self.anthropic_api_key:
            errors.append("Anthropic API key not configured")

        if not CHAT_DB_PATH.exists():
            errors.append(f"Messages database not found: {CHAT_DB_PATH}")

        return errors

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary (excluding sensitive data)"""
        return {
            "analysis": {
                "default_level": self.analysis.default_level.value,
                "context_window_size": self.analysis.context_window_size,
                "batch_size": self.analysis.batch_size,
            },
            "llm": {
                "model_standard": self.llm.model_standard,
                "requests_per_minute": self.llm.requests_per_minute,
            },
            "vector_db": {
                "messages_collection": self.vector_db.messages_collection,
            },
            "google_sheets": {
                "sync_enabled": self.google_sheets.sync_enabled,
                "sync_interval_minutes": self.google_sheets.sync_interval_minutes,
            },
            "daemon": {
                "log_level": self.daemon.log_level,
            },
            "has_api_key": bool(self.anthropic_api_key),
        }

    @classmethod
    def load_from_file(cls, config_path: Optional[Path] = None) -> "SMSIntelligenceConfig":
        """Load configuration from JSON file"""
        if config_path is None:
            config_path = CONFIG_DIR / "config.json"

        config = cls()

        if config_path.exists():
            try:
                with open(config_path, 'r') as f:
                    data = json.load(f)

                # Apply loaded values (simplified - in production, use proper merging)
                if "daemon" in data:
                    if "log_level" in data["daemon"]:
                        config.daemon.log_level = data["daemon"]["log_level"]
                    if "debounce_seconds" in data["daemon"]:
                        config.daemon.debounce_seconds = data["daemon"]["debounce_seconds"]

                if "google_sheets" in data:
                    if "sync_enabled" in data["google_sheets"]:
                        config.google_sheets.sync_enabled = data["google_sheets"]["sync_enabled"]

            except (json.JSONDecodeError, KeyError) as e:
                logging.warning(f"Error loading config file: {e}")

        return config

    def save_to_file(self, config_path: Optional[Path] = None):
        """Save configuration to JSON file"""
        if config_path is None:
            config_path = CONFIG_DIR / "config.json"

        with open(config_path, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)


# ============================================================================
# LOGGING SETUP
# ============================================================================

def setup_logging(config: Optional[DaemonConfig] = None) -> logging.Logger:
    """Configure logging for the SMS Intelligence System"""
    if config is None:
        config = DaemonConfig()

    # Ensure log directory exists
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    # Create logger
    logger = logging.getLogger("sms_intelligence")
    logger.setLevel(getattr(logging, config.log_level.upper()))

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_format = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_format)
    logger.addHandler(console_handler)

    # File handler with rotation
    try:
        from logging.handlers import RotatingFileHandler
        file_handler = RotatingFileHandler(
            LOG_DIR / "sms_intelligence.log",
            maxBytes=config.log_max_size_mb * 1024 * 1024,
            backupCount=config.log_rotation_days
        )
        file_handler.setLevel(logging.DEBUG)
        file_format = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
        )
        file_handler.setFormatter(file_format)
        logger.addHandler(file_handler)
    except Exception as e:
        logger.warning(f"Could not set up file logging: {e}")

    return logger


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_config() -> SMSIntelligenceConfig:
    """Get or create the global configuration"""
    return SMSIntelligenceConfig.load_from_file()


def store_api_key(api_key: str) -> bool:
    """Store API key securely in system keyring"""
    try:
        import keyring
        keyring.set_password("sms_intelligence", "anthropic_api_key", api_key)
        return True
    except ImportError:
        logging.error("keyring module not installed. Install with: pip install keyring")
        return False
    except Exception as e:
        logging.error(f"Failed to store API key: {e}")
        return False


def check_full_disk_access() -> bool:
    """Check if the current process has Full Disk Access"""
    try:
        # Try to read the Messages database
        with open(CHAT_DB_PATH, 'rb') as f:
            f.read(1)
        return True
    except PermissionError:
        return False
    except FileNotFoundError:
        # Database doesn't exist - not a permissions issue
        return True


def print_config_summary(config: SMSIntelligenceConfig):
    """Print a summary of the current configuration"""
    print("\n" + "=" * 60)
    print("SMS Intelligence System Configuration")
    print("=" * 60)
    print(f"\nAPI Key Configured: {'Yes' if config.anthropic_api_key else 'NO - REQUIRED'}")
    print(f"Full Disk Access: {'Yes' if check_full_disk_access() else 'NO - REQUIRED'}")
    print(f"\nMessages DB: {CHAT_DB_PATH}")
    print(f"  Exists: {CHAT_DB_PATH.exists()}")
    print(f"\nVector DB: {VECTOR_DB_DIR}")
    print(f"Log Directory: {LOG_DIR}")
    print(f"\nGoogle Sheets Sync: {'Enabled' if config.google_sheets.sync_enabled else 'Disabled'}")
    print(f"  Interval: {config.google_sheets.sync_interval_minutes} minutes")
    print(f"\nAnalysis Level: {config.analysis.default_level.value}")
    print(f"Context Window: {config.analysis.context_window_size} messages")
    print(f"\nDaemon Log Level: {config.daemon.log_level}")
    print("=" * 60 + "\n")


# ============================================================================
# MAIN - For testing configuration
# ============================================================================

if __name__ == "__main__":
    config = get_config()
    errors = config.validate()

    print_config_summary(config)

    if errors:
        print("Configuration Errors:")
        for error in errors:
            print(f"  - {error}")
    else:
        print("Configuration is valid!")
