"""
SMS Intelligence System
=======================

Enterprise-grade SMS/iMessage monitoring and analysis system for macOS.
Implements patterns from Gong.io and Salesforce Einstein.

Features:
- Real-time message monitoring via watchdog (FSEvents)
- macOS Ventura+ attributedBody decoding
- Contact name resolution from AddressBook
- Claude API integration for intelligent analysis
- ChromaDB for semantic search
- Redis for caching and alerts
- Google Sheets sync for existing workflows

Quick Start:
    from sms_intelligence import IntelligenceEngine, get_config

    config = get_config()
    engine = IntelligenceEngine(config)

    # Process new messages
    count = engine.process_new_messages()

    # Search semantically
    results = engine.semantic_search("meeting tomorrow")

    # Get recent alerts
    alerts = engine.get_recent_alerts()

CLI Usage:
    python -m sms_intelligence.sms_daemon --mode daemon     # Run as daemon
    python -m sms_intelligence.sms_daemon --mode status     # Check status
    python -m sms_intelligence.sms_daemon --mode search --query "meeting"

For more information, see the README.md file.
"""

__version__ = "1.0.0"
__author__ = "Tiny Seed Farm"
__email__ = "info@tinyseedfarm.com"

# Import main components for easy access
from .config import (
    SMSIntelligenceConfig,
    get_config,
    setup_logging,
    check_full_disk_access,
    CHAT_DB_PATH,
    CONTACTS_DB_PATH,
    GOOGLE_SHEETS_API_URL,
)

from .sms_daemon import (
    Message,
    MessageAnalysis,
    MessageDatabase,
    ConversationAnalyzer,
    IntelligenceEngine,
    MessageWatcherDaemon,
)

from .thread_analyzer import (
    ThreadAnalysis,
    ThreadAnalyzer,
    RelationshipHealthScorer,
    RelationshipHealthScore,
    NextBestActionEngine,
    SentimentTrendAnalyzer,
    Commitment,
)

__all__ = [
    # Version
    "__version__",

    # Config
    "SMSIntelligenceConfig",
    "get_config",
    "setup_logging",
    "check_full_disk_access",
    "CHAT_DB_PATH",
    "CONTACTS_DB_PATH",
    "GOOGLE_SHEETS_API_URL",

    # Core components
    "Message",
    "MessageAnalysis",
    "MessageDatabase",
    "ConversationAnalyzer",
    "IntelligenceEngine",
    "MessageWatcherDaemon",

    # Thread analysis
    "ThreadAnalysis",
    "ThreadAnalyzer",
    "RelationshipHealthScorer",
    "RelationshipHealthScore",
    "NextBestActionEngine",
    "SentimentTrendAnalyzer",
    "Commitment",
]
