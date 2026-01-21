# Enterprise-Grade SMS/iMessage Intelligence System
## Comprehensive Research Report

---

## Executive Summary

This document provides a comprehensive technical blueprint for building an enterprise-grade SMS/iMessage intelligence system on macOS. The system achieves **zero-friction automatic processing** of all messages, full conversation thread analysis, and predictive intelligence that anticipates user needs before they arise.

**Key Architecture Decision**: The recommended approach uses a hybrid real-time + batch architecture with:
- **File System Event Monitoring** via FSEvents/watchdog for instant new message detection
- **Direct SQLite Database Access** to the Messages `chat.db` for complete conversation history
- **LLM-powered Analysis** (Claude/GPT) for deep conversation intelligence
- **Vector Database** for semantic search and relationship memory
- **Background Daemon** via `launchd` for always-on monitoring

---

## Table of Contents

1. [Technical Foundation: Mac iMessage Database Access](#1-technical-foundation-mac-imessage-database-access)
2. [Real-Time Message Monitoring Approaches](#2-real-time-message-monitoring-approaches)
3. [Enterprise Conversation Intelligence Patterns](#3-enterprise-conversation-intelligence-patterns)
4. [Thread Analysis & NLP Techniques](#4-thread-analysis--nlp-techniques)
5. [Predictive Intelligence Architecture](#5-predictive-intelligence-architecture)
6. [Recommended System Architecture](#6-recommended-system-architecture)
7. [Implementation Details](#7-implementation-details)
8. [Privacy & Security Considerations](#8-privacy--security-considerations)
9. [Code Patterns & Libraries](#9-code-patterns--libraries)
10. [Architecture Diagram](#10-architecture-diagram)

---

## 1. Technical Foundation: Mac iMessage Database Access

### Database Location & Structure

The iMessage database is stored at:
```
~/Library/Messages/chat.db
```

This is a **SQLite 3 database** containing approximately 15 tables. The key tables are:

| Table | Purpose |
|-------|---------|
| `message` | All messages with content, timestamps, metadata |
| `handle` | Contact identifiers (phone numbers, emails) |
| `chat` | Conversation threads (1:1 and group) |
| `chat_handle_join` | Links chats to participants (many-to-many) |
| `chat_message_join` | Links messages to conversations |
| `attachment` | File attachments with paths and MIME types |

### Full Disk Access Requirements

Starting with **macOS Catalina (10.15)**, accessing `chat.db` requires **Full Disk Access**:

```
System Settings → Privacy & Security → Full Disk Access → Add Terminal/Python
```

**Important**: Applications must be restarted after granting access.

### Critical Schema Details

#### Message Table Key Columns
```sql
ROWID INTEGER PRIMARY KEY AUTOINCREMENT
guid TEXT UNIQUE NOT NULL           -- Unique message identifier
text TEXT                           -- Plain text (may be NULL in newer macOS)
attributedBody BLOB                 -- Encoded message content (Ventura+)
handle_id INTEGER                   -- Foreign key to handle table
date INTEGER                        -- Mac epoch (seconds since 2001-01-01)
date_read INTEGER
date_delivered INTEGER
is_from_me INTEGER                  -- 1 = outbound, 0 = inbound
is_read INTEGER
service TEXT                        -- "iMessage" or "SMS"
cache_roomnames TEXT                -- Group chat names
```

#### Date Conversion
macOS uses **January 1, 2001** as its epoch (not Unix 1970):
```python
import datetime

def mac_timestamp_to_datetime(mac_timestamp):
    """Convert macOS timestamp to Python datetime"""
    # Timestamps may be in nanoseconds (newer macOS) or seconds
    if mac_timestamp > 1e12:  # Nanoseconds
        mac_timestamp = mac_timestamp / 1e9
    mac_epoch = datetime.datetime(2001, 1, 1)
    return mac_epoch + datetime.timedelta(seconds=mac_timestamp)
```

### The attributedBody Challenge (macOS Ventura+)

Starting with **macOS Ventura**, many messages store content in the `attributedBody` BLOB field rather than `text`. This is an **NSKeyedArchiver-encoded NSAttributedString**.

```python
import plistlib
import sqlite3

def decode_attributed_body(blob):
    """Decode attributedBody field from macOS Ventura+ Messages"""
    if not blob:
        return None

    try:
        # Load as binary plist
        plist = plistlib.loads(blob)

        # NSKeyedArchiver structure
        objects = plist.get('$objects', [])

        # Find the string content
        for obj in objects:
            if isinstance(obj, str) and len(obj) > 1:
                # Skip internal markers like "$null"
                if not obj.startswith('$') and not obj.startswith('NS'):
                    return obj
            elif isinstance(obj, dict):
                # Check for NSString content
                if 'NS.string' in obj:
                    return obj['NS.string']

        # Alternative: look for content after markers
        blob_str = blob.decode('utf-8', errors='ignore')
        if 'NSString' in blob_str:
            parts = blob_str.split('NSString')
            if len(parts) > 1:
                # Extract text between markers
                text_part = parts[-1]
                # Find readable content
                readable = ''.join(c for c in text_part if c.isprintable())
                return readable.strip()

    except Exception as e:
        pass

    return None
```

### Contacts Database Integration

Contact names are stored separately in:
```
~/Library/Application Support/AddressBook/AddressBook-v22.abcddb
```

Key query for contact lookup:
```sql
SELECT
    ZABCDRECORD.ZFIRSTNAME,
    ZABCDRECORD.ZLASTNAME,
    ZABCDPHONENUMBER.ZFULLNUMBER
FROM ZABCDRECORD
LEFT JOIN ZABCDPHONENUMBER ON ZABCDRECORD.Z_PK = ZABCDPHONENUMBER.ZOWNER
ORDER BY ZABCDRECORD.ZLASTNAME, ZABCDRECORD.ZFIRSTNAME
```

---

## 2. Real-Time Message Monitoring Approaches

### Approach 1: FSEvents + File Watching (RECOMMENDED)

**macOS FSEvents** is the native file system event API. For Python, use the `watchdog` library:

```python
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import time

class MessageDBHandler(FileSystemEventHandler):
    def __init__(self, callback):
        self.callback = callback
        self.last_processed = time.time()

    def on_modified(self, event):
        if event.src_path.endswith('chat.db') or event.src_path.endswith('chat.db-wal'):
            # Debounce: SQLite writes can trigger multiple events
            if time.time() - self.last_processed > 0.5:
                self.last_processed = time.time()
                self.callback()

def start_message_watcher(on_new_message_callback):
    """Start watching for new messages"""
    import os

    messages_dir = os.path.expanduser('~/Library/Messages')

    event_handler = MessageDBHandler(on_new_message_callback)
    observer = Observer()
    observer.schedule(event_handler, messages_dir, recursive=False)
    observer.start()

    return observer
```

**Key Insight**: Watch for both `chat.db` and `chat.db-wal` (Write-Ahead Log) modifications. SQLite in WAL mode writes to the WAL file first.

### Approach 2: launchd with WatchPaths

Create a persistent daemon using macOS `launchd`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.yourcompany.sms-intelligence</string>

    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/python3</string>
        <string>/path/to/message_processor.py</string>
    </array>

    <key>WatchPaths</key>
    <array>
        <string>~/Library/Messages/chat.db</string>
        <string>~/Library/Messages/chat.db-wal</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>/tmp/sms-intelligence.log</string>

    <key>StandardErrorPath</key>
    <string>/tmp/sms-intelligence.error.log</string>
</dict>
</plist>
```

Install with:
```bash
cp com.yourcompany.sms-intelligence.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.yourcompany.sms-intelligence.plist
```

### Approach 3: Polling with Change Detection

Fallback approach using `PRAGMA data_version`:

```python
import sqlite3
import time

class MessagePoller:
    def __init__(self, db_path, callback, interval=2.0):
        self.db_path = db_path
        self.callback = callback
        self.interval = interval
        self.last_data_version = None
        self.last_message_rowid = 0

    def check_for_changes(self):
        conn = sqlite3.connect(f'file:{self.db_path}?mode=ro', uri=True)
        cursor = conn.cursor()

        # Check data version (changes on any write)
        cursor.execute('PRAGMA data_version')
        current_version = cursor.fetchone()[0]

        if self.last_data_version != current_version:
            self.last_data_version = current_version

            # Get new messages
            cursor.execute('''
                SELECT ROWID, text, handle_id, date, is_from_me
                FROM message
                WHERE ROWID > ?
                ORDER BY ROWID
            ''', (self.last_message_rowid,))

            new_messages = cursor.fetchall()
            if new_messages:
                self.last_message_rowid = new_messages[-1][0]
                self.callback(new_messages)

        conn.close()

    def run(self):
        while True:
            self.check_for_changes()
            time.sleep(self.interval)
```

### Approach 4: imsg CLI Tool

The **imsg** tool by steipete provides a production-ready CLI:

```bash
# Install via Homebrew
brew tap steipete/tap
brew install imsg

# Watch for new messages in real-time (JSON output)
imsg watch --json

# Get chat history
imsg history --json --chat-id "chat123"

# List all chats
imsg chats --json
```

GitHub: https://github.com/steipete/imsg

---

## 3. Enterprise Conversation Intelligence Patterns

### How Salesforce Einstein Works

Salesforce Einstein Conversation Insights:
- **Automatic transcription** in 36 languages
- **AI-powered summaries** of conversations
- **Keyword and topic detection** for tracking competitor mentions, objections
- **Sentiment analysis** per conversation segment
- **Next-step recommendations** based on conversation context

Key architecture pattern: **Einstein Trust Layer** provides secure AI processing with PII protection.

### How Gong.io Analyzes Conversations

Gong's Revenue Intelligence platform:
1. **Records and transcribes** all sales communications
2. **NLP analysis** identifies:
   - Topics discussed
   - Questions asked
   - Customer objections
   - Competitor mentions
   - Buying signals
3. **Talk pattern analysis**: talk-to-listen ratio, longest monologue, patience metrics
4. **Deal risk scoring** based on conversation signals

### How HubSpot Conversation Intelligence Works

HubSpot's approach:
- **Automatic call transcription** with searchability
- **AI-generated summaries** capturing key points
- **Tracked terms** to identify specific conversation types
- **Workflow triggers** based on conversation outcomes
- **Coaching playlists** for training

### Common Patterns Across Enterprise Systems

| Capability | Implementation |
|------------|----------------|
| Transcription | Speech-to-text (for voice) / Direct text capture |
| Topic Detection | NER + keyword extraction + semantic clustering |
| Sentiment | Per-message and trend analysis |
| Intent Recognition | Fine-tuned classifiers or LLM prompting |
| Commitment Detection | Pattern matching + LLM extraction |
| Next Actions | Predictive models + rule engine |

---

## 4. Thread Analysis & NLP Techniques

### Conversation Summarization

**Hierarchical Summarization** for long threads:

```python
from anthropic import Anthropic

def summarize_conversation_thread(messages, anthropic_client):
    """
    Hierarchical summarization for long conversation threads
    """
    # Chunk messages into segments (e.g., 20 messages each)
    chunk_size = 20
    chunks = [messages[i:i+chunk_size] for i in range(0, len(messages), chunk_size)]

    # Summarize each chunk
    chunk_summaries = []
    for chunk in chunks:
        conversation_text = format_messages(chunk)

        response = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": f"""Summarize this conversation segment concisely:

{conversation_text}

Focus on:
1. Key topics discussed
2. Decisions made
3. Action items or commitments
4. Emotional tone/sentiment
"""
            }]
        )
        chunk_summaries.append(response.content[0].text)

    # Combine chunk summaries into final summary
    if len(chunk_summaries) > 1:
        combined = "\n---\n".join(chunk_summaries)
        final_response = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=800,
            messages=[{
                "role": "user",
                "content": f"""Synthesize these conversation segment summaries into one cohesive summary:

{combined}

Provide:
1. Overall relationship context
2. Key ongoing topics/themes
3. All commitments and action items
4. Relationship health assessment
"""
            }]
        )
        return final_response.content[0].text

    return chunk_summaries[0] if chunk_summaries else ""
```

### Entity Extraction with Structured Output

Using Claude with structured output:

```python
from anthropic import Anthropic
import json

EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "people_mentioned": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Names of people mentioned in the conversation"
        },
        "dates_times": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "reference": {"type": "string"},
                    "interpreted": {"type": "string"}
                }
            }
        },
        "locations": {
            "type": "array",
            "items": {"type": "string"}
        },
        "commitments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "who": {"type": "string"},
                    "what": {"type": "string"},
                    "when": {"type": "string"},
                    "confidence": {"type": "number"}
                }
            }
        },
        "questions_pending": {
            "type": "array",
            "items": {"type": "string"}
        },
        "sentiment": {
            "type": "string",
            "enum": ["very_positive", "positive", "neutral", "negative", "very_negative"]
        },
        "urgency_level": {
            "type": "string",
            "enum": ["critical", "high", "medium", "low", "none"]
        },
        "topics": {
            "type": "array",
            "items": {"type": "string"}
        }
    }
}

def extract_conversation_intelligence(messages, anthropic_client):
    """Extract structured intelligence from conversation"""

    conversation_text = format_messages(messages)

    response = anthropic_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"""Analyze this conversation and extract structured information.

CONVERSATION:
{conversation_text}

Return a JSON object with this structure:
{json.dumps(EXTRACTION_SCHEMA, indent=2)}

Be thorough in extracting ALL commitments, questions, and action items.
For dates/times, include both the original reference ("tomorrow", "next week")
and your interpretation based on today's date.
"""
        }]
    )

    # Parse JSON from response
    response_text = response.content[0].text
    # Extract JSON from response (handle markdown code blocks)
    if "```json" in response_text:
        json_str = response_text.split("```json")[1].split("```")[0]
    elif "```" in response_text:
        json_str = response_text.split("```")[1].split("```")[0]
    else:
        json_str = response_text

    return json.loads(json_str)
```

### Sentiment Trend Analysis

```python
from collections import defaultdict
from datetime import datetime, timedelta

class SentimentTrendAnalyzer:
    """Track sentiment trends over time for a relationship"""

    def __init__(self):
        self.sentiment_scores = {
            'very_positive': 2,
            'positive': 1,
            'neutral': 0,
            'negative': -1,
            'very_negative': -2
        }

    def analyze_trend(self, analyzed_messages):
        """
        analyzed_messages: list of dicts with 'date' and 'sentiment' keys
        Returns trend analysis
        """
        if not analyzed_messages:
            return {'trend': 'insufficient_data'}

        # Group by week
        weekly_sentiment = defaultdict(list)
        for msg in analyzed_messages:
            week_start = msg['date'] - timedelta(days=msg['date'].weekday())
            score = self.sentiment_scores.get(msg['sentiment'], 0)
            weekly_sentiment[week_start].append(score)

        # Calculate weekly averages
        weekly_averages = {
            week: sum(scores) / len(scores)
            for week, scores in weekly_sentiment.items()
        }

        # Determine trend
        weeks = sorted(weekly_averages.keys())
        if len(weeks) >= 2:
            recent_avg = weekly_averages[weeks[-1]]
            previous_avg = weekly_averages[weeks[-2]]

            if recent_avg > previous_avg + 0.3:
                trend = 'improving'
            elif recent_avg < previous_avg - 0.3:
                trend = 'declining'
            else:
                trend = 'stable'
        else:
            trend = 'insufficient_data'

        return {
            'trend': trend,
            'current_score': weekly_averages.get(weeks[-1], 0) if weeks else 0,
            'weekly_data': weekly_averages
        }
```

### Commitment and Action Item Extraction

```python
def extract_action_items(conversation_text, anthropic_client):
    """Extract actionable commitments from conversation"""

    response = anthropic_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        messages=[{
            "role": "user",
            "content": f"""Analyze this conversation and extract ALL action items and commitments.

CONVERSATION:
{conversation_text}

For each action item, identify:
1. WHO is responsible (use "Me" for the user, or the other person's name)
2. WHAT needs to be done (specific action)
3. WHEN it should be done (if mentioned)
4. CONTEXT (why this came up)
5. PRIORITY (inferred from urgency cues)

Also identify:
- Unanswered questions that need follow-up
- Implicit commitments (things implied but not explicitly stated)
- Potential conflicts or scheduling issues

Return as JSON:
{{
    "explicit_commitments": [
        {{"who": "...", "what": "...", "when": "...", "context": "...", "priority": "high/medium/low"}}
    ],
    "implicit_commitments": [...],
    "pending_questions": ["..."],
    "follow_up_needed": true/false,
    "follow_up_reason": "..."
}}
"""
        }]
    )

    return parse_json_response(response.content[0].text)
```

---

## 5. Predictive Intelligence Architecture

### Next Best Action System

Based on patterns from Pega, Salesforce, and other enterprise systems:

```python
class NextBestActionEngine:
    """
    Predictive engine that recommends optimal next actions
    based on conversation analysis and historical patterns
    """

    def __init__(self, anthropic_client, vector_store):
        self.client = anthropic_client
        self.vector_store = vector_store
        self.action_types = [
            'send_followup',
            'schedule_meeting',
            'send_reminder',
            'escalate',
            'wait',
            'send_information',
            'make_commitment',
            'ask_question'
        ]

    def predict_next_action(self, contact_id, recent_conversation, relationship_context):
        """
        Predict the optimal next action for a conversation
        """
        # Get historical patterns for this contact
        historical_context = self.vector_store.query(
            f"conversation patterns with {contact_id}",
            top_k=5
        )

        # Build prediction prompt
        prompt = f"""Based on the conversation analysis and historical patterns,
recommend the BEST next action.

CURRENT CONVERSATION ANALYSIS:
{json.dumps(recent_conversation, indent=2)}

RELATIONSHIP CONTEXT:
{json.dumps(relationship_context, indent=2)}

HISTORICAL PATTERNS:
{historical_context}

Available action types: {self.action_types}

Recommend the single best action with:
1. Action type
2. Specific content/message if applicable
3. Timing (immediate, within X hours, specific time)
4. Reasoning
5. Confidence score (0-1)

Consider:
- Pending commitments from either party
- Unanswered questions
- Time since last contact
- Sentiment trend
- Urgency signals
- Relationship health

Return as JSON:
{{
    "recommended_action": "action_type",
    "timing": "immediate|within_1h|within_24h|scheduled",
    "specific_time": "ISO timestamp or null",
    "content": "suggested message or action description",
    "reasoning": "why this action now",
    "confidence": 0.85,
    "alternatives": [
        {{"action": "...", "reasoning": "..."}}
    ]
}}
"""

        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )

        return parse_json_response(response.content[0].text)

    def generate_proactive_alerts(self, all_conversations):
        """
        Scan all conversations and generate proactive alerts
        """
        alerts = []

        for conv in all_conversations:
            # Check for overdue commitments
            if conv.get('my_commitments'):
                for commitment in conv['my_commitments']:
                    if is_overdue(commitment):
                        alerts.append({
                            'type': 'overdue_commitment',
                            'priority': 'high',
                            'contact': conv['contact_name'],
                            'details': commitment,
                            'suggested_action': 'Send update or deliver on commitment'
                        })

            # Check for contacts going cold
            if days_since_contact(conv) > conv.get('typical_response_time', 7) * 2:
                alerts.append({
                    'type': 'contact_going_cold',
                    'priority': 'medium',
                    'contact': conv['contact_name'],
                    'days_since_contact': days_since_contact(conv),
                    'suggested_action': 'Send check-in message'
                })

            # Check for unresolved questions
            if conv.get('pending_questions'):
                alerts.append({
                    'type': 'pending_questions',
                    'priority': 'medium',
                    'contact': conv['contact_name'],
                    'questions': conv['pending_questions'],
                    'suggested_action': 'Follow up on unanswered questions'
                })

        return sorted(alerts, key=lambda x: {'high': 0, 'medium': 1, 'low': 2}[x['priority']])
```

### Relationship Health Scoring

```python
class RelationshipHealthScorer:
    """
    Calculate relationship health scores based on multiple factors
    """

    def calculate_health_score(self, conversation_data):
        """
        Returns a score from 0-100 with breakdown
        """
        factors = {}

        # 1. Response time reciprocity (20 points)
        avg_their_response_time = conversation_data.get('avg_their_response_hours', 24)
        avg_my_response_time = conversation_data.get('avg_my_response_hours', 24)

        response_balance = min(avg_their_response_time, avg_my_response_time) / max(avg_their_response_time, avg_my_response_time, 1)
        factors['response_reciprocity'] = response_balance * 20

        # 2. Sentiment trend (25 points)
        sentiment_trend = conversation_data.get('sentiment_trend', 'stable')
        sentiment_scores = {'improving': 25, 'stable': 18, 'declining': 8, 'insufficient_data': 12}
        factors['sentiment'] = sentiment_scores.get(sentiment_trend, 12)

        # 3. Engagement frequency (20 points)
        messages_per_week = conversation_data.get('messages_per_week', 0)
        if messages_per_week >= 10:
            factors['engagement'] = 20
        elif messages_per_week >= 5:
            factors['engagement'] = 15
        elif messages_per_week >= 2:
            factors['engagement'] = 10
        else:
            factors['engagement'] = 5

        # 4. Commitment fulfillment (20 points)
        commitments_kept = conversation_data.get('commitments_kept', 0)
        commitments_total = conversation_data.get('commitments_total', 0)
        if commitments_total > 0:
            factors['commitment_score'] = (commitments_kept / commitments_total) * 20
        else:
            factors['commitment_score'] = 15  # Neutral if no commitments

        # 5. Conversation depth (15 points)
        avg_message_length = conversation_data.get('avg_message_length', 0)
        topics_discussed = len(conversation_data.get('topics', []))

        depth_score = min(15, (avg_message_length / 50) * 5 + (topics_discussed / 5) * 10)
        factors['depth'] = depth_score

        total_score = sum(factors.values())

        return {
            'total_score': round(total_score, 1),
            'health_level': 'excellent' if total_score >= 80 else 'good' if total_score >= 60 else 'fair' if total_score >= 40 else 'needs_attention',
            'factor_breakdown': factors,
            'recommendations': self._generate_recommendations(factors)
        }

    def _generate_recommendations(self, factors):
        recommendations = []

        if factors.get('response_reciprocity', 0) < 10:
            recommendations.append("Response times are imbalanced - consider adjusting your response speed")

        if factors.get('sentiment', 0) < 12:
            recommendations.append("Sentiment is declining - consider addressing any concerns directly")

        if factors.get('engagement', 0) < 10:
            recommendations.append("Low engagement - initiate more conversations")

        if factors.get('commitment_score', 0) < 12:
            recommendations.append("Commitment fulfillment needs attention - prioritize pending promises")

        return recommendations
```

---

## 6. Recommended System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SMS Intelligence System                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────────────────┐ │
│  │  Message    │    │   Event      │    │      Processing Pipeline        │ │
│  │  Sources    │───▶│   Queue      │───▶│                                 │ │
│  │             │    │  (Redis)     │    │  ┌─────────┐  ┌──────────────┐  │ │
│  │ • chat.db   │    │              │    │  │ Message │  │ Conversation │  │ │
│  │ • Contacts  │    └──────────────┘    │  │ Parser  │─▶│  Analyzer    │  │ │
│  │             │                        │  └─────────┘  └──────────────┘  │ │
│  └─────────────┘                        │                      │          │ │
│        ▲                                │                      ▼          │ │
│        │                                │  ┌──────────────────────────┐   │ │
│  ┌─────────────┐                        │  │   LLM Analysis Engine    │   │ │
│  │  Watchdog   │                        │  │  (Claude/GPT API)        │   │ │
│  │  Daemon     │                        │  │                          │   │ │
│  │  (launchd)  │                        │  │  • Entity Extraction     │   │ │
│  └─────────────┘                        │  │  • Sentiment Analysis    │   │ │
│                                         │  │  • Commitment Detection  │   │ │
│                                         │  │  • Summarization         │   │ │
│                                         │  │  • Next Action Predict   │   │ │
│                                         │  └──────────────────────────┘   │ │
│                                         │               │                 │ │
│                                         └───────────────┼─────────────────┘ │
│                                                         ▼                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        Data Layer                                       ││
│  │                                                                         ││
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────────────┐  ││
│  │  │  Vector Store   │  │   PostgreSQL    │  │   Redis Cache          │  ││
│  │  │  (ChromaDB/     │  │                 │  │                        │  ││
│  │  │   Pinecone)     │  │  • Contacts     │  │  • Session State       │  ││
│  │  │                 │  │  • Messages     │  │  • Rate Limiting       │  ││
│  │  │  • Semantic     │  │  • Analysis     │  │  • Recent Context      │  ││
│  │  │    Search       │  │  • Actions      │  │                        │  ││
│  │  │  • Conversation │  │  • Alerts       │  │                        │  ││
│  │  │    Embeddings   │  │                 │  │                        │  ││
│  │  └─────────────────┘  └─────────────────┘  └────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                         │                                   │
│                                         ▼                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                       Output Layer                                      ││
│  │                                                                         ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  ││
│  │  │ Dashboard    │  │  Alerts &    │  │    API       │  │   Google   │  ││
│  │  │ (Web UI)     │  │  Notifs      │  │  Endpoints   │  │   Sheets   │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Details

#### 1. Message Watcher (launchd Daemon)
- Runs continuously via launchd
- Monitors `chat.db` and `chat.db-wal` for changes
- Immediately detects new messages (< 1 second latency)
- Publishes events to Redis queue

#### 2. Event Queue (Redis)
- Decouples detection from processing
- Handles bursts of messages
- Ensures no messages are lost
- Enables replay if processing fails

#### 3. Processing Pipeline
- **Message Parser**: Handles `attributedBody` decoding, contact resolution
- **Conversation Analyzer**: Groups messages into threads, identifies context
- **LLM Engine**: Calls Claude API for deep analysis

#### 4. Data Layer
- **Vector Store**: Semantic search over conversation history
- **PostgreSQL**: Structured data (contacts, analysis results, action items)
- **Redis**: Fast caching, session state, rate limiting

#### 5. Output Layer
- **Dashboard**: Web UI for viewing insights
- **Alerts**: Push notifications for urgent items
- **API**: Integration with other systems
- **Google Sheets**: Export for your existing workflow

---

## 7. Implementation Details

### Complete Message Processor

```python
#!/usr/bin/env python3
"""
Enterprise SMS/iMessage Intelligence Processor
Main daemon that monitors and analyzes all messages
"""

import os
import sqlite3
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, asdict
from anthropic import Anthropic
import chromadb
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import redis
import threading
from queue import Queue

# Configuration
CHAT_DB_PATH = os.path.expanduser('~/Library/Messages/chat.db')
CONTACTS_DB_PATH = os.path.expanduser('~/Library/Application Support/AddressBook/AddressBook-v22.abcddb')

@dataclass
class Message:
    rowid: int
    guid: str
    text: str
    sender: str
    sender_name: Optional[str]
    timestamp: datetime
    is_from_me: bool
    service: str
    chat_id: str
    is_group_chat: bool


class MessageDatabase:
    """Interface to the iMessage SQLite database"""

    def __init__(self, db_path: str = CHAT_DB_PATH):
        self.db_path = db_path
        self._contact_cache = {}
        self._load_contacts()

    def _get_connection(self):
        """Get read-only connection to database"""
        return sqlite3.connect(
            f'file:{self.db_path}?mode=ro',
            uri=True,
            detect_types=sqlite3.PARSE_DECLTYPES
        )

    def _load_contacts(self):
        """Load contacts from AddressBook"""
        try:
            conn = sqlite3.connect(
                f'file:{CONTACTS_DB_PATH}?mode=ro',
                uri=True
            )
            cursor = conn.cursor()

            # Get phone numbers
            cursor.execute('''
                SELECT ZABCDPHONENUMBER.ZFULLNUMBER,
                       ZABCDRECORD.ZFIRSTNAME,
                       ZABCDRECORD.ZLASTNAME
                FROM ZABCDPHONENUMBER
                LEFT JOIN ZABCDRECORD ON ZABCDPHONENUMBER.ZOWNER = ZABCDRECORD.Z_PK
            ''')

            for row in cursor.fetchall():
                phone, first, last = row
                if phone:
                    normalized = self._normalize_phone(phone)
                    name = f"{first or ''} {last or ''}".strip()
                    if name:
                        self._contact_cache[normalized] = name

            conn.close()
        except Exception as e:
            print(f"Warning: Could not load contacts: {e}")

    def _normalize_phone(self, phone: str) -> str:
        """Normalize phone number for lookup"""
        return ''.join(c for c in phone if c.isdigit())[-10:]

    def _mac_timestamp_to_datetime(self, ts: int) -> datetime:
        """Convert Mac timestamp to datetime"""
        if ts is None:
            return None
        if ts > 1e12:  # Nanoseconds
            ts = ts / 1e9
        mac_epoch = datetime(2001, 1, 1)
        return mac_epoch + timedelta(seconds=ts)

    def _decode_attributed_body(self, blob: bytes) -> Optional[str]:
        """Decode attributedBody for macOS Ventura+"""
        if not blob:
            return None

        import plistlib

        try:
            plist = plistlib.loads(blob)
            objects = plist.get('$objects', [])

            for obj in objects:
                if isinstance(obj, str) and len(obj) > 1:
                    if not obj.startswith('$') and not obj.startswith('NS'):
                        return obj
                elif isinstance(obj, dict) and 'NS.string' in obj:
                    return obj['NS.string']

            # Fallback: extract from raw bytes
            blob_str = blob.decode('utf-8', errors='ignore')
            if 'NSString' in blob_str:
                parts = blob_str.split('NSString')
                for part in reversed(parts):
                    text = ''.join(c for c in part[:500] if c.isprintable() and ord(c) < 128)
                    if len(text) > 2:
                        return text.strip()

        except Exception:
            pass

        return None

    def get_contact_name(self, identifier: str) -> str:
        """Get contact name from phone/email"""
        if not identifier:
            return "Unknown"

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
            rowid, guid, text, attr_body, sender_id, date, is_from_me, service, chat_id, participant_count = row

            # Get text from either text field or attributedBody
            message_text = text
            if not message_text:
                message_text = self._decode_attributed_body(attr_body)

            if message_text:  # Only include messages with actual text
                sender_name = self.get_contact_name(sender_id) if sender_id else "Me"

                messages.append(Message(
                    rowid=rowid,
                    guid=guid,
                    text=message_text,
                    sender=sender_id or "Me",
                    sender_name=sender_name if not is_from_me else "Me",
                    timestamp=self._mac_timestamp_to_datetime(date),
                    is_from_me=bool(is_from_me),
                    service=service or "iMessage",
                    chat_id=chat_id or "unknown",
                    is_group_chat=participant_count > 1 if participant_count else False
                ))

        conn.close()
        return messages

    def get_conversation_history(self, chat_id: str, limit: int = 100) -> List[Message]:
        """Get full conversation history for a chat"""
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
            rowid, guid, text, attr_body, sender_id, date, is_from_me, service, chat_id, participant_count = row

            message_text = text or self._decode_attributed_body(attr_body)

            if message_text:
                messages.append(Message(
                    rowid=rowid,
                    guid=guid,
                    text=message_text,
                    sender=sender_id or "Me",
                    sender_name=self.get_contact_name(sender_id) if sender_id else "Me",
                    timestamp=self._mac_timestamp_to_datetime(date),
                    is_from_me=bool(is_from_me),
                    service=service or "iMessage",
                    chat_id=chat_id or "unknown",
                    is_group_chat=participant_count > 1 if participant_count else False
                ))

        conn.close()
        return list(reversed(messages))


class ConversationAnalyzer:
    """Analyzes conversations using Claude API"""

    def __init__(self, anthropic_api_key: str):
        self.client = Anthropic(api_key=anthropic_api_key)

    def _format_conversation(self, messages: List[Message]) -> str:
        """Format messages for LLM analysis"""
        formatted = []
        for msg in messages:
            sender = "ME" if msg.is_from_me else msg.sender_name
            timestamp = msg.timestamp.strftime("%Y-%m-%d %H:%M") if msg.timestamp else "Unknown time"
            formatted.append(f"[{timestamp}] {sender}: {msg.text}")
        return "\n".join(formatted)

    def analyze_message(self, message: Message, recent_context: List[Message]) -> Dict[str, Any]:
        """Quick analysis of a single new message with context"""

        context_text = self._format_conversation(recent_context[-10:])  # Last 10 messages

        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{
                "role": "user",
                "content": f"""Analyze this new message in context. Return JSON only.

RECENT CONVERSATION:
{context_text}

NEW MESSAGE:
[{message.timestamp}] {message.sender_name}: {message.text}

Return JSON:
{{
    "requires_response": true/false,
    "urgency": "critical|high|medium|low|none",
    "sentiment": "very_positive|positive|neutral|negative|very_negative",
    "contains_question": true/false,
    "contains_commitment": true/false,
    "commitment_details": "description if any",
    "topics": ["topic1", "topic2"],
    "suggested_response_time": "immediate|within_1h|within_24h|no_rush",
    "key_info_extracted": ["any dates, names, numbers mentioned"]
}}
"""
            }]
        )

        return self._parse_json(response.content[0].text)

    def analyze_thread(self, messages: List[Message]) -> Dict[str, Any]:
        """Deep analysis of a full conversation thread"""

        conversation_text = self._format_conversation(messages)

        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": f"""Perform comprehensive analysis of this conversation. Return detailed JSON.

CONVERSATION:
{conversation_text}

Return JSON:
{{
    "summary": "2-3 sentence summary of the conversation",
    "relationship_context": "nature of the relationship based on conversation style",
    "key_topics": ["main topics discussed"],
    "sentiment_analysis": {{
        "overall": "positive|neutral|negative",
        "trend": "improving|stable|declining",
        "notable_moments": ["any significant emotional moments"]
    }},
    "commitments": {{
        "their_commitments": [
            {{"what": "...", "when": "...", "status": "pending|completed|unclear"}}
        ],
        "my_commitments": [
            {{"what": "...", "when": "...", "status": "pending|completed|unclear"}}
        ]
    }},
    "pending_items": {{
        "unanswered_questions": ["questions that need answers"],
        "unresolved_topics": ["topics that need follow-up"],
        "action_items": ["specific things that need to be done"]
    }},
    "communication_patterns": {{
        "their_style": "formal|casual|brief|detailed",
        "response_expectations": "quick|relaxed|unknown",
        "best_times_to_reach": "any patterns noticed"
    }},
    "next_best_actions": [
        {{
            "action": "recommended action",
            "timing": "when to do it",
            "reasoning": "why this action",
            "priority": "high|medium|low"
        }}
    ],
    "alerts": [
        {{
            "type": "warning type",
            "message": "what needs attention",
            "urgency": "high|medium|low"
        }}
    ]
}}
"""
            }]
        )

        return self._parse_json(response.content[0].text)

    def _parse_json(self, text: str) -> Dict[str, Any]:
        """Parse JSON from LLM response"""
        try:
            # Handle markdown code blocks
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
            return json.loads(text.strip())
        except json.JSONDecodeError:
            return {"error": "Failed to parse response", "raw": text}


class IntelligenceEngine:
    """Main engine that orchestrates message processing"""

    def __init__(self, anthropic_api_key: str, redis_url: str = "redis://localhost:6379"):
        self.db = MessageDatabase()
        self.analyzer = ConversationAnalyzer(anthropic_api_key)
        self.redis = redis.from_url(redis_url)

        # Initialize vector store
        self.chroma = chromadb.PersistentClient(path="./sms_intelligence_vectors")
        self.collection = self.chroma.get_or_create_collection("conversations")

        # Track last processed message
        self.last_processed_rowid = int(self.redis.get("last_processed_rowid") or 0)

        # Message queue for processing
        self.message_queue = Queue()

        # Cache for recent context
        self.context_cache = {}

    def process_new_messages(self):
        """Process any new messages since last check"""
        new_messages = self.db.get_messages_since(self.last_processed_rowid)

        for message in new_messages:
            # Get recent context for this chat
            context = self._get_chat_context(message.chat_id)

            # Analyze the message
            analysis = self.analyzer.analyze_message(message, context)

            # Store the analysis
            self._store_analysis(message, analysis)

            # Check for alerts
            self._check_alerts(message, analysis)

            # Update context cache
            self._update_context(message)

            # Update last processed
            self.last_processed_rowid = message.rowid
            self.redis.set("last_processed_rowid", self.last_processed_rowid)

            print(f"Processed: [{message.sender_name}] {message.text[:50]}...")

        return len(new_messages)

    def _get_chat_context(self, chat_id: str, limit: int = 20) -> List[Message]:
        """Get recent context for a chat"""
        if chat_id in self.context_cache:
            return self.context_cache[chat_id]

        messages = self.db.get_conversation_history(chat_id, limit)
        self.context_cache[chat_id] = messages
        return messages

    def _update_context(self, message: Message):
        """Update context cache with new message"""
        if message.chat_id not in self.context_cache:
            self.context_cache[message.chat_id] = []

        self.context_cache[message.chat_id].append(message)

        # Keep only last 50 messages in cache
        if len(self.context_cache[message.chat_id]) > 50:
            self.context_cache[message.chat_id] = self.context_cache[message.chat_id][-50:]

    def _store_analysis(self, message: Message, analysis: Dict):
        """Store message and analysis"""
        # Store in vector database for semantic search
        self.collection.add(
            documents=[message.text],
            metadatas=[{
                "message_id": message.guid,
                "sender": message.sender_name,
                "timestamp": message.timestamp.isoformat() if message.timestamp else "",
                "chat_id": message.chat_id,
                "is_from_me": message.is_from_me,
                "sentiment": analysis.get("sentiment", "neutral"),
                "urgency": analysis.get("urgency", "none"),
                "topics": json.dumps(analysis.get("topics", []))
            }],
            ids=[message.guid]
        )

        # Store analysis in Redis for quick access
        self.redis.hset(
            f"message:{message.guid}",
            mapping={
                "text": message.text,
                "sender": message.sender_name,
                "analysis": json.dumps(analysis),
                "timestamp": message.timestamp.isoformat() if message.timestamp else ""
            }
        )
        self.redis.expire(f"message:{message.guid}", 86400 * 30)  # 30 day TTL

    def _check_alerts(self, message: Message, analysis: Dict):
        """Check if message requires immediate attention"""
        alerts = []

        if analysis.get("urgency") in ["critical", "high"]:
            alerts.append({
                "type": "urgent_message",
                "message": f"High urgency message from {message.sender_name}",
                "content": message.text[:100]
            })

        if analysis.get("contains_commitment") and not message.is_from_me:
            alerts.append({
                "type": "commitment_made",
                "message": f"{message.sender_name} made a commitment",
                "details": analysis.get("commitment_details")
            })

        if analysis.get("requires_response") and analysis.get("suggested_response_time") == "immediate":
            alerts.append({
                "type": "response_needed",
                "message": f"Immediate response expected for {message.sender_name}",
                "content": message.text[:100]
            })

        for alert in alerts:
            self.redis.lpush("alerts", json.dumps(alert))
            print(f"🚨 ALERT: {alert['type']} - {alert['message']}")

    def get_relationship_summary(self, contact_identifier: str) -> Dict[str, Any]:
        """Get comprehensive relationship summary for a contact"""
        # Find all chats with this contact
        # Then run full thread analysis
        # Return comprehensive summary
        pass

    def semantic_search(self, query: str, limit: int = 10) -> List[Dict]:
        """Search conversations semantically"""
        results = self.collection.query(
            query_texts=[query],
            n_results=limit
        )

        return [
            {
                "text": doc,
                "metadata": meta
            }
            for doc, meta in zip(results["documents"][0], results["metadatas"][0])
        ]


class MessageWatcherDaemon:
    """Daemon that watches for new messages"""

    def __init__(self, engine: IntelligenceEngine):
        self.engine = engine
        self.observer = None

    def start(self):
        """Start the file watcher"""

        class Handler(FileSystemEventHandler):
            def __init__(self, engine):
                self.engine = engine
                self.last_process = 0

            def on_modified(self, event):
                if 'chat.db' in event.src_path:
                    # Debounce
                    now = time.time()
                    if now - self.last_process > 1.0:
                        self.last_process = now
                        try:
                            count = self.engine.process_new_messages()
                            if count > 0:
                                print(f"Processed {count} new messages")
                        except Exception as e:
                            print(f"Error processing messages: {e}")

        messages_dir = os.path.dirname(CHAT_DB_PATH)
        self.observer = Observer()
        self.observer.schedule(Handler(self.engine), messages_dir, recursive=False)
        self.observer.start()

        print(f"Started watching {messages_dir}")

        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.observer.stop()

        self.observer.join()


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='SMS Intelligence System')
    parser.add_argument('--api-key', required=True, help='Anthropic API key')
    parser.add_argument('--redis', default='redis://localhost:6379', help='Redis URL')
    parser.add_argument('--mode', choices=['daemon', 'analyze', 'search'], default='daemon')
    parser.add_argument('--query', help='Search query (for search mode)')

    args = parser.parse_args()

    engine = IntelligenceEngine(args.api_key, args.redis)

    if args.mode == 'daemon':
        daemon = MessageWatcherDaemon(engine)
        daemon.start()
    elif args.mode == 'analyze':
        # Process any pending messages
        count = engine.process_new_messages()
        print(f"Processed {count} messages")
    elif args.mode == 'search':
        if args.query:
            results = engine.semantic_search(args.query)
            for r in results:
                print(f"- {r['metadata']['sender']}: {r['text'][:100]}")


if __name__ == "__main__":
    main()
```

### Requirements File

```
# requirements.txt
anthropic>=0.34.0
watchdog>=4.0.0
redis>=5.0.0
chromadb>=0.4.0
plistlib  # Built-in to Python 3.4+
```

---

## 8. Privacy & Security Considerations

### Legal Requirements

1. **Consent**: If analyzing messages involving others, ensure appropriate consent
2. **Data Minimization**: Only collect/store what's necessary
3. **Encryption**:
   - Encrypt stored analysis data at rest (AES-256)
   - Use TLS for all API communications
4. **Access Control**: Restrict access to the system
5. **Audit Logging**: Log all access to message data

### Technical Security Measures

```python
# Encryption utilities
from cryptography.fernet import Fernet
import os

class SecureStorage:
    def __init__(self):
        key_path = os.path.expanduser('~/.sms_intelligence_key')
        if os.path.exists(key_path):
            with open(key_path, 'rb') as f:
                self.key = f.read()
        else:
            self.key = Fernet.generate_key()
            with open(key_path, 'wb') as f:
                f.write(self.key)
            os.chmod(key_path, 0o600)

        self.cipher = Fernet(self.key)

    def encrypt(self, data: str) -> bytes:
        return self.cipher.encrypt(data.encode())

    def decrypt(self, data: bytes) -> str:
        return self.cipher.decrypt(data).decode()
```

### API Key Security

```python
# Use environment variables or secure credential storage
import keyring

def get_api_key():
    """Retrieve API key from secure storage"""
    key = keyring.get_password("sms_intelligence", "anthropic_api_key")
    if not key:
        key = os.environ.get("ANTHROPIC_API_KEY")
    return key

def store_api_key(key: str):
    """Store API key in secure storage"""
    keyring.set_password("sms_intelligence", "anthropic_api_key", key)
```

---

## 9. Code Patterns & Libraries

### Recommended Libraries

| Purpose | Library | Notes |
|---------|---------|-------|
| Database Access | `sqlite3` (builtin) | Use `mode=ro` for read-only |
| File Watching | `watchdog` | FSEvents backend on macOS |
| LLM API | `anthropic` | Official Anthropic SDK |
| Vector Store | `chromadb` | Local, easy setup |
| Vector Store (Scale) | `pinecone-client` | Cloud, production-grade |
| Queue/Cache | `redis` | Fast, reliable |
| Scheduling | `schedule` or `apscheduler` | For batch jobs |
| HTTP API | `fastapi` | For dashboard/API |
| NLP (Optional) | `spacy` | Entity extraction |

### Useful Third-Party Tools

1. **imsg** (steipete/imsg): CLI for Messages.app
   - `brew tap steipete/tap && brew install imsg`
   - Great for sending messages from scripts

2. **imessage_reader** (niftycode): Python library
   - `pip install imessage-reader`
   - Good starting point but needs updates for Ventura+

3. **imessage_tools** (my-other-github-account):
   - Handles `attributedBody` decoding for Ventura+
   - Good reference implementation

---

## 10. Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                        SMS/iMessage Intelligence System                        │
│                              Enterprise Architecture                           │
└───────────────────────────────────────────────────────────────────────────────┘

                                   ┌─────────────────┐
                                   │   macOS Host    │
                                   │                 │
                                   │  ┌───────────┐  │
                                   │  │ Messages  │  │
                                   │  │   .app    │  │
                                   │  └─────┬─────┘  │
                                   │        │        │
                                   │        ▼        │
                                   │  ┌───────────┐  │
                                   │  │  chat.db  │◄─┼──── iMessage/SMS
                                   │  │ (SQLite)  │  │
                                   │  └─────┬─────┘  │
                                   │        │        │
                                   └────────┼────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    │  ┌────────────────────▼────────────────────┐  │
                    │  │           File System Watcher           │  │
                    │  │         (launchd + FSEvents)            │  │
                    │  │                                         │  │
                    │  │   • Monitors chat.db modifications      │  │
                    │  │   • Sub-second detection latency        │  │
                    │  │   • Automatic restart on failure        │  │
                    │  └────────────────────┬────────────────────┘  │
                    │                       │                       │
                    │                       ▼                       │
                    │  ┌─────────────────────────────────────────┐  │
                    │  │              Event Queue                │  │
                    │  │               (Redis)                   │  │
                    │  │                                         │  │
                    │  │   • Decouples detection from processing │  │
                    │  │   • Handles message bursts              │  │
                    │  │   • Ensures exactly-once processing     │  │
                    │  └────────────────────┬────────────────────┘  │
                    │                       │                       │
                    │                       ▼                       │
                    │  ┌─────────────────────────────────────────┐  │
                    │  │         Message Processing Pipeline     │  │
                    │  │                                         │  │
                    │  │  ┌─────────────┐    ┌─────────────┐     │  │
                    │  │  │   Message   │    │  Contact    │     │  │
                    │  │  │   Parser    │◄──▶│  Resolver   │     │  │
                    │  │  │             │    │             │     │  │
                    │  │  │ • Decode    │    │ • AddressBook│    │  │
                    │  │  │   attrBody  │    │ • Phone→Name│     │  │
                    │  │  │ • Parse     │    │             │     │  │
                    │  │  │   timestamps│    │             │     │  │
                    │  │  └──────┬──────┘    └─────────────┘     │  │
                    │  │         │                               │  │
                    │  │         ▼                               │  │
                    │  │  ┌─────────────────────────────────┐    │  │
                    │  │  │      LLM Analysis Engine        │    │  │
                    │  │  │      (Claude Sonnet API)        │    │  │
                    │  │  │                                 │    │  │
                    │  │  │  ┌─────────┐ ┌─────────┐       │    │  │
                    │  │  │  │Sentiment│ │ Entity  │       │    │  │
                    │  │  │  │Analysis │ │Extract  │       │    │  │
                    │  │  │  └─────────┘ └─────────┘       │    │  │
                    │  │  │  ┌─────────┐ ┌─────────┐       │    │  │
                    │  │  │  │Commit-  │ │ Action  │       │    │  │
                    │  │  │  │ment Det │ │ Items   │       │    │  │
                    │  │  │  └─────────┘ └─────────┘       │    │  │
                    │  │  │  ┌─────────┐ ┌─────────┐       │    │  │
                    │  │  │  │ Thread  │ │Next Best│       │    │  │
                    │  │  │  │ Summary │ │ Action  │       │    │  │
                    │  │  │  └─────────┘ └─────────┘       │    │  │
                    │  │  └────────────────┬────────────────┘    │  │
                    │  │                   │                     │  │
                    │  └───────────────────┼─────────────────────┘  │
                    │                      │                        │
                    │                      ▼                        │
                    │  ┌─────────────────────────────────────────┐  │
                    │  │              Data Layer                 │  │
                    │  │                                         │  │
                    │  │  ┌───────────┐ ┌──────────┐ ┌────────┐ │  │
                    │  │  │  Vector   │ │PostgreSQL│ │ Redis  │ │  │
                    │  │  │  Store    │ │          │ │ Cache  │ │  │
                    │  │  │(ChromaDB) │ │• Analysis│ │        │ │  │
                    │  │  │           │ │• Actions │ │• State │ │  │
                    │  │  │• Semantic │ │• Alerts  │ │• Recent│ │  │
                    │  │  │  Search   │ │• History │ │  Msgs  │ │  │
                    │  │  │• Embed-   │ │          │ │        │ │  │
                    │  │  │  dings    │ │          │ │        │ │  │
                    │  │  └───────────┘ └──────────┘ └────────┘ │  │
                    │  └─────────────────────────────────────────┘  │
                    │                                               │
                    │                      ▼                        │
                    │  ┌─────────────────────────────────────────┐  │
                    │  │              Output Layer               │  │
                    │  │                                         │  │
                    │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐│  │
                    │  │  │Dashboard │ │  Alerts  │ │  Google  ││  │
                    │  │  │ (FastAPI │ │  (Push)  │ │  Sheets  ││  │
                    │  │  │  + Vue)  │ │          │ │  Sync    ││  │
                    │  │  └──────────┘ └──────────┘ └──────────┘│  │
                    │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐│  │
                    │  │  │   API    │ │ Webhooks │ │  Email   ││  │
                    │  │  │Endpoints │ │          │ │ Digest   ││  │
                    │  │  └──────────┘ └──────────┘ └──────────┘│  │
                    │  └─────────────────────────────────────────┘  │
                    │                                               │
                    │                SMS Intelligence System        │
                    └───────────────────────────────────────────────┘


                         DATA FLOW LEGEND
                         ────────────────
                         ───▶  Data flow
                         ◄──▶  Bidirectional
                         │     Connection


             REAL-TIME PROCESSING FLOW (< 2 seconds end-to-end)
             ═══════════════════════════════════════════════════

             1. Message arrives → chat.db modified
             2. FSEvents triggers watcher → Event to Redis
             3. Pipeline processes → LLM analysis
             4. Results stored → Alerts triggered
             5. Dashboard updated → User notified
```

---

## Summary: The Best Approach

### Recommended Implementation

1. **File Watching**: Use `launchd` with `WatchPaths` for reliable, always-on monitoring
2. **Database Access**: Direct SQLite access with proper `attributedBody` decoding
3. **Analysis Engine**: Claude Sonnet for cost-effective, high-quality analysis
4. **Vector Store**: ChromaDB locally, upgrade to Pinecone for scale
5. **Queue/Cache**: Redis for reliability and speed
6. **Architecture**: Event-driven with real-time processing for new messages, batch for deep analysis

### Key Success Factors

- **Zero friction**: Daemon runs automatically, no user intervention needed
- **Comprehensive**: Analyzes every message in/out
- **Predictive**: Uses conversation history + LLM to anticipate needs
- **Actionable**: Generates specific next-best-actions and alerts
- **Searchable**: Semantic search across all conversation history

### Cost Estimate (Monthly)

| Component | Cost |
|-----------|------|
| Claude API (5000 msgs/mo) | ~$15-30 |
| Redis (local) | Free |
| ChromaDB (local) | Free |
| Infrastructure | Mac you already have |
| **Total** | **~$15-30/month** |

---

## Sources

### Mac iMessage Database Access
- [Accessing Your iMessages with SQL | David Bieber](https://davidbieber.com/snippets/2020-05-20-imessage-sql-db/)
- [Searching Your iMessage Database | Atomic Object](https://spin.atomicobject.com/search-imessage-sql/)
- [imessage_reader | GitHub](https://github.com/niftycode/imessage_reader)
- [imsg CLI | GitHub](https://github.com/steipete/imsg)
- [imessage_tools for Ventura | GitHub](https://github.com/my-other-github-account/imessage_tools)

### File Monitoring & Daemons
- [fswatch | GitHub](https://github.com/emcrisostomo/fswatch)
- [File System Events | Apple Developer](https://developer.apple.com/documentation/coreservices/file_system_events)
- [launchd Tutorial](https://launchd.info/)
- [Python Watchdog | PyPI](https://pypi.org/project/watchdog/)

### Enterprise Conversation Intelligence
- [Einstein Conversation Insights | Salesforce Ben](https://www.salesforceben.com/einstein-conversation-insights-analyze-customer-calls-and-coach-your-users/)
- [Gong vs Chorus Comparison | Claap](https://www.claap.io/blog/gong-vs-chorus-which-is-better-and-why)
- [Conversation Intelligence | HubSpot](https://www.hubspot.com/products/conversation-intelligence)
- [Gong Conversation Intelligence](https://www.gong.io/conversation-intelligence)

### Predictive Intelligence & NLP
- [Next Best Action | Pega](https://www.pega.com/next-best-action)
- [Next Best Experience | McKinsey](https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/next-best-experience-how-ai-can-power-every-customer-interaction)
- [Sentiment Analysis | Convin](https://convin.ai/blog/sentiment-analysis-nlp-convo-intell)
- [LLM Chat History Summarization Guide | mem0.ai](https://mem0.ai/blog/llm-chat-history-summarization-guide-2025)

### Architecture & Processing
- [Real-Time vs Batch Processing | Streamkap](https://streamkap.com/resources-and-guides/batch-vs-real-time-processing)
- [Event-Driven Architecture with Kafka | DZone](https://dzone.com/articles/microservices-event-driven-architecture-and-kafka)
- [LangChain Conversational Memory | Pinecone](https://www.pinecone.io/learn/series/langchain/langchain-conversational-memory/)

### Privacy & Security
- [GDPR Compliant Messaging | Beconversive](https://www.beconversive.com/blog/gdpr-compliant-messaging)
- [Text Message Monitoring Legality | LeapXpert](https://www.leapxpert.com/beyond-privacy-concerns-understanding-the-legality-of-text-message-monitoring/)

### API & Tools
- [Claude API | Anthropic](https://www.anthropic.com/api)
- [Structured Outputs | OpenAI](https://platform.openai.com/docs/guides/structured-outputs)
- [spaCy NER | spaCy.io](https://spacy.io/usage/linguistic-features)
- [Relationship Intelligence | Introhive](https://www.introhive.com/blog/relationship-intelligence-automation/)
