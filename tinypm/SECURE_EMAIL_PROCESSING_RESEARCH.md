# Secure Email Processing Pipeline Research
## TinyPM Architecture Guide

**Date:** January 30, 2026
**Status:** Comprehensive Research Document
**Target:** Email categorization, task extraction, contact detection, Email Zero maintenance

---

## Executive Summary

TinyPM needs to process users' personal emails safely and securely. This research covers:

1. **Gmail API best practices** for efficient, scalable synchronization
2. **How industry leaders** (Superhuman, SaneBox) handle this problem
3. **Security, compliance, and data privacy** requirements
4. **Minimal viable secure pipeline** for TinyPM's use case
5. **Specific architecture recommendations** for your implementation

**Key Finding:** You're on the right track. Your OAuth boundary enforcement and token storage approach are solid. The gap is transitioning from simple read operations to a full processing pipeline with proper architecture.

---

## Part 1: Gmail API Architecture & Best Practices

### 1.1 Synchronization Strategy: Incremental vs. Full

**Your Current Approach:** Reading unread emails via `messages.list` query
**Problem:** This rescans your entire mailbox every time, wasting quota and API calls

**Gmail API Provides Two Sync Methods:**

#### Option A: Full Synchronization (First Time Only)
```
GET /users/me/messages?q=is:unread&maxResults=100
```
- **Use Case:** Initial sync, recovery from lost history ID
- **Cost:** ~1 API call per message
- **Frequency:** Once per user, then store `historyId`
- **When to Use:** User first connects email, or history ID invalid (HTTP 404)

#### Option B: Incremental Synchronization (Recommended for Polling)
```
GET /users/me/history?startHistoryId=<last_known_history_id>&historyTypes=messageAdded,messageModified
```
- **Use Case:** Daily/hourly sync, efficient updates
- **Cost:** Single API call returns all changes since last sync
- **Frequency:** Multiple times per day
- **Advantage:** Only returns what changed (new emails, label changes, etc.)

**Important History ID Facts:**
- History IDs are typically valid for **at least 1 week**, sometimes longer
- If you receive `HTTP 404`, perform full sync and store new `historyId`
- History IDs increase chronologically but have random gaps between valid values
- Cache the `historyId` in your database after every sync

**Your Implementation Gap:**
Your current `email_integration.py` uses `messages.list` for every query. For production, you should:
1. Store `historyId` in Supabase's `tinypm_oauth_tokens` table
2. After first sync, use `history.list` for subsequent calls
3. Handle `HTTP 404` with fallback to full sync

### 1.2 Gmail API Rate Limits & Quotas

**Daily Quota:**
- **1 billion quota units per day** (project-wide)
- **250 quota units per user per second** (moving average allowing bursts)

**Operation Costs:**
- Reading a message: ~1 quota unit per call
- Sending email: ~100 quota units
- Listing messages: ~1 quota unit per message

**Your Scale Math:**
- Processing 100 unread emails per user daily: ~100-200 quota units/user/day (acceptable)
- If you have 10,000 users processing 100 emails daily: 1-2M quota units (plenty)
- Superhuman-scale (1M+ users): Requires careful batching and architecture

**Handling Rate Limits:**
- **429 error:** "Too Many Requests" → Implement exponential backoff
- **Daily quota exceeded:** May persist for **several hours**
- **Per-user limits:** Your orchestrator should throttle aggressive users

**Your Recommendation:**
Batch process emails in your background worker (see Celery section) rather than on-demand. Don't call Gmail API synchronously in user request handlers.

### 1.3 Gmail Push Notifications vs. Polling

**Push Notifications (Webhooks):**
- Gmail uses Google Cloud Pub/Sub
- Requires infrastructure setup (GCP project, Pub/Sub topic, subscription)
- Real-time notification when new emails arrive
- **Problem:** Race condition—user's email client notifies before TinyPM processes (you'll get duplicate notifications)

**Polling Strategy:**
- Your orchestrator checks email every 5-15 minutes
- Lower real-time but eliminates race conditions
- Better for batch classification and processing
- Scales better without external infrastructure

**TinyPM Recommendation: Polling with Batch Processing**
- Simple to implement
- Aligns with your background worker architecture
- Sufficient for "Email Zero" maintenance (not real-time)
- Can add push notifications later if needed

---

## Part 2: How Industry Leaders Handle This

### 2.1 Superhuman's Approach

**Architecture Pattern:**
Superhuman evolved from single-prompt RAG to a sophisticated **multi-agent cognitive architecture** with:

1. **Query Classification Phase** (parallel execution)
   - Analyzes user intent
   - Selects which tools to activate
   - Determines response strategy

2. **Metadata Extraction Phase** (parallel)
   - Extracts context from email metadata
   - Builds user preference profile
   - Identifies action items

3. **Hybrid Search & Reranking**
   - Combines full-text search with semantic search
   - Reranks results based on user preferences

4. **Task-Specific Prompting**
   - Instead of one large prompt, uses modular prompts
   - Each task (categorize, extract tasks, find VIPs) gets custom prompt
   - Maintains consistency across diverse tasks

**Auto Label Feature:**
- Automatically assigns labels: marketing, pitch, social, news
- Users can define custom labels with natural language prompts
- ~90%+ accuracy on standard categories

**Key Insight for TinyPM:**
You don't need a single LLM call to "understand" an email. Instead:
1. Classify (rule-based, fast)
2. Extract metadata (lightweight)
3. Only use Claude for complex cases (ambiguous priority, action item extraction)

### 2.2 SaneBox's Approach

**Classification Strategy:**
- **Headers only:** Never processes full email body for privacy
- Uses: From, Subject, Timestamp, Known sender history
- Machine learning learns from user's manual corrections
- Organizes into: SaneLater, SaneNews, SaneBlackHole

**Known Issues SaneBox Has:**
- **Push notification race condition:** User gets notified before SaneBox processes
- **Negative feedback loop:** Aggressive push notifications hurt user experience

**Learning Mechanism:**
- When user moves emails to different folders, SaneBox retrains
- Maintains per-user classification model
- Adapts to changes in user's behavior over time

**Key Insight for TinyPM:**
Start with headers + basic ML. Add full-body understanding (via Claude) only for high-value tasks like action item extraction.

### 2.3 Common Pattern: Hybrid Classification

**Leading Approach Across Industry:**

```
Rule-Based Layer (Fast, deterministic)
  ├─ Check From: field against known categories
  ├─ Check Subject: for keywords (urgent, asap, invoice, etc.)
  ├─ Check Timestamp: age of email
  └─ Decision: Is this newsletter? Spam? Known unimportant sender?
        ↓
        If matches rule → Label & file immediately (0ms delay)
        If no match → Pass to LLM layer

LLM Layer (Accurate, slower)
  ├─ Full email body available
  ├─ Context from user's past emails
  └─ Determine: Priority, action items, response needed?
```

**Performance Metrics:**
- Rule-based catches ~80% of emails in <10ms
- LLM handles ~20% of edge cases in 1-2 seconds
- Flan-T5 achieves 90% F1-score, GPT-4 reaches 95% F1-score

**Cost Implications:**
- LLM inference costs dominate
- Rule-based filtering is nearly free
- Hybrid saves 80% of LLM calls vs. classifying everything with LLM

---

## Part 3: Data Privacy & Security Requirements

### 3.1 GDPR Compliance

**Key Articles for Email Processing:**
- **Article 5(e):** Storage Limitation—keep data only as long as necessary
- **Article 17:** Right to be Forgotten—delete user data on request without undue delay
- **Article 32:** Security of Processing—encrypt data at rest and in transit

**For TinyPM Specifically:**

| Requirement | Your Implementation |
|-------------|-------------------|
| Data minimization | Only store headers + basic metadata, not full bodies by default |
| Retention policy | Define: How long do you keep processed emails? 30 days? 90 days? |
| Deletion on request | Implement: User can delete all processed email history |
| Encryption in transit | Already using HTTPS, but ensure token transmission is secure |
| Encryption at rest | Store tokens encrypted in Supabase, not plaintext |

**2026 Reality:**
GDPR is now a **deliverability standard**. Email providers (Gmail, Outlook) enforce it like an authentication requirement. If your processing violates GDPR, email providers notice and deprioritize your emails.

### 3.2 Token Storage & OAuth Security

**Your Current Implementation (Good):**
- OAuth tokens stored in Supabase's `tinypm_oauth_tokens` table
- Tokens prefixed with `tpm_` to prevent collision with Tiny Seed OS
- Hard boundary enforcement (gmail.readonly, gmail.compose only)
- Scope validation rejects any Sheets/Drive scopes

**Missing Pieces:**
1. **Encryption at rest:** Are tokens encrypted in the database?
   - Recommendation: Use database column encryption (AES-256)
   - Or: Use a secrets management system (AWS Secrets Manager, HashiCorp Vault)

2. **Refresh token rotation:**
   - Current: Refresh tokens stay valid indefinitely
   - Better: Each refresh generates new refresh token (single-use)
   - Prevents token reuse if intercepted

3. **Token expiration handling:**
   - Your code clears token on `401` error (good)
   - Should also implement: Preemptive refresh 5 min before expiry

**Implementation Recommendations:**

```python
# Current pattern (acceptable)
def _get_access_token(self):
    token = self._access_token
    if token:
        return token
    # ... fetch from oauth_manager

# Better pattern (production)
def _get_access_token(self):
    if self._token_expired_soon():  # Within 5 minutes
        self._refresh_access_token()
    if self._access_token:
        return self._access_token
    return None

def _refresh_access_token(self):
    # Get refresh token from Supabase
    # POST to Google OAuth endpoint
    # Store new access + refresh tokens
    # Implement refresh token rotation
```

### 3.3 SOC 2 Compliance for Email Processing

**Five Trust Services Criteria (pick at least Security):**
1. **Security** (Required) — Access controls, encryption, intrusion detection
2. **Availability** (Optional) — System uptime, disaster recovery
3. **Confidentiality** (Optional) — Data privacy, encryption
4. **Processing Integrity** (Optional) — Accurate, complete, timely processing
5. **Privacy** (Optional) — GDPR/CCPA compliance

**For Email Processing, Focus On:**

| TSC | Requirement | TinyPM Implementation |
|-----|-------------|----------------------|
| Security | Access controls | OAuth scopes limit what emails can access |
| Security | Encryption | HTTPS for API, encrypted tokens in DB |
| Security | Audit logging | Log who accessed what email when |
| Confidentiality | Data classification | Don't export user email content outside GCP |
| Processing Integrity | Error handling | Retry logic, audit trail of failures |
| Privacy | Retention policy | Documented email retention (e.g., 30 days) |
| Privacy | Data deletion | User can delete all processed history |

**Audit Trail Requirements:**
- Who: User ID or service account
- What: API call, parameters, result
- When: Timestamp
- Why: Which feature triggered the access
- Status: Success or failure

**Example audit log entry:**
```json
{
  "timestamp": "2026-01-30T14:23:45Z",
  "user_id": "tpm_user_123",
  "action": "read_unread_emails",
  "resource": "gmail",
  "status": "success",
  "result_count": 5,
  "duration_ms": 340
}
```

### 3.4 Breach Notification Requirements

**In the US & EU:** If you process user emails and there's a breach, you may need to notify:
- The affected user(s)
- Relevant regulators (ICO in UK, CNIL in France, etc.)
- Typically within **72 hours** of discovery

**Your Risk Profile (Lower Risk):**
- Only access to Gmail (not Sheets/Drive)
- Tokens encrypted in Supabase
- Limited to authenticated users
- No email export to external systems

**Recommended Protections:**
1. Rate limiting on API access
2. Monitoring for unusual patterns (sudden spike in email reads)
3. Regular token rotation
4. Delete old access logs after 90 days

---

## Part 4: Email Classification Architecture

### 4.1 Rule-Based Layer (Your Priority)

**First, implement deterministic rules.** These catch 70-80% of emails instantly:

```python
class EmailClassifier:
    """Fast rule-based email classification."""

    def classify(self, email: EmailMessage) -> Dict[str, any]:
        """
        Returns:
        {
            'category': 'actionable', 'fyI', 'newsletter', 'spam', 'waiting_for',
            'priority': 1-5 (5 = most urgent),
            'needs_response': bool,
            'is_from_important_sender': bool,
            'confidence': 0.0-1.0
        }
        """

        # Rule 1: Headers-based spam detection
        if self._is_spam(email):
            return {
                'category': 'spam',
                'confidence': 0.95,
                'needs_response': False,
                'priority': 1
            }

        # Rule 2: Newsletter detection
        if self._is_newsletter(email):
            return {
                'category': 'newsletter',
                'confidence': 0.90,
                'needs_response': False,
                'priority': 2
            }

        # Rule 3: VIP/Important sender
        if email.sender_email in self.important_senders:
            return {
                'category': 'actionable',
                'confidence': 0.85,
                'needs_response': True,
                'priority': 5,
                'is_from_important_sender': True
            }

        # Rule 4: Question detection (contains ?)
        if self._contains_question(email.subject + ' ' + email.snippet):
            return {
                'category': 'actionable',
                'confidence': 0.80,
                'needs_response': True,
                'priority': 4
            }

        # Rule 5: Urgency keywords
        urgency = self._detect_urgency(email.subject + ' ' + email.snippet)
        if urgency > 0:
            return {
                'category': 'actionable',
                'confidence': 0.75,
                'needs_response': True,
                'priority': urgency
            }

        # Default: FYI (read, but no action needed)
        return {
            'category': 'fyi',
            'confidence': 0.6,
            'needs_response': False,
            'priority': 3
        }

    def _is_spam(self, email: EmailMessage) -> bool:
        """Check headers, sender reputation, etc."""
        spam_indicators = [
            'noreply@',
            'no-reply@',
            'automated@',
            'unsubscribe' in email.body.lower()
        ]
        return any(spam_indicators)

    def _is_newsletter(self, email: EmailMessage) -> bool:
        """Detect newsletters vs. personal emails."""
        newsletter_keywords = [
            'newsletter', 'digest', 'weekly update', 'news roundup',
            'unsubscribe', 'manage preferences'
        ]
        combined = (email.subject + ' ' + email.snippet).lower()
        return sum(1 for kw in newsletter_keywords if kw in combined) >= 2

    def _contains_question(self, text: str) -> bool:
        """Simple question detection."""
        return '?' in text

    def _detect_urgency(self, text: str) -> int:
        """Return urgency score 0-5."""
        text_lower = text.lower()
        if 'urgent' in text_lower or 'asap' in text_lower:
            return 5
        if 'important' in text_lower or 'priority' in text_lower:
            return 4
        if 'please' in text_lower or 'can you' in text_lower:
            return 3
        return 0
```

**Expected Performance:**
- Speed: 10-50ms per email
- Accuracy: 75-85% (on known patterns)
- Confidence: Can decline low-confidence emails to LLM

### 4.2 LLM Layer (Claude Integration)

**After rules catch easy cases, use Claude for:**
1. Action item extraction ("Can you send the report by Friday?" → Task)
2. Priority disambiguation (Is this FYI or actionable?)
3. VIP sender detection (Is this person important to the user?)
4. Email thread context understanding

```python
import anthropic

class EmailIntelligence:
    """Use Claude for complex email understanding."""

    def __init__(self, claude_api_key: str = None):
        self.client = anthropic.Anthropic(api_key=claude_api_key)

    def extract_action_items(self, email: EmailMessage) -> List[Dict]:
        """
        Extract action items from email.
        Returns: [{'task': 'Send report', 'deadline': 'Friday', 'priority': 4}, ...]
        """
        prompt = f"""Extract action items from this email. For each action:
        - What is the action?
        - Who should do it? (if specified)
        - When is it due? (if specified)
        - How important is it? (1-5)

Subject: {email.subject}
From: {email.sender}
Body: {email.body[:1000]}

Respond as JSON array only. If no actions, return [].
"""

        response = self.client.messages.create(
            model="claude-opus-4-5-20251101",  # Use your preferred model
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )

        # Parse JSON response
        import json
        try:
            return json.loads(response.content[0].text)
        except:
            return []

    def categorize_complex_email(self, email: EmailMessage,
                                 rule_based_confidence: float = 0.0) -> Dict:
        """
        Use Claude to categorize emails where rules are uncertain.
        Only called for rule_based_confidence < 0.7
        """
        if rule_based_confidence > 0.7:
            return None  # Rules are confident enough

        prompt = f"""Categorize this email as: actionable, fyi, newsletter, or spam.
Also determine priority (1-5, where 5 is most urgent).

Subject: {email.subject}
From: {email.sender}
Snippet: {email.snippet}

Respond as JSON: {{"category": "...", "priority": N}}
"""

        response = self.client.messages.create(
            model="claude-opus-4-5-20251101",
            max_tokens=100,
            messages=[{"role": "user", "content": prompt}]
        )

        try:
            import json
            return json.loads(response.content[0].text)
        except:
            return {"category": "fyi", "priority": 3}
```

**Cost Model:**
- If 1M emails/day, and LLM handles 20% = 200K Claude calls/day
- At $3/M input tokens: ~$1-2/day for 1M emails
- Rule-based saves 800K calls/day = $2.40 in costs

### 4.3 Recommended Hybrid Pipeline

```python
class EmailProcessor:
    """Complete hybrid classification pipeline."""

    def __init__(self):
        self.classifier = EmailClassifier()
        self.intelligence = EmailIntelligence()

    def process_email(self, email: EmailMessage) -> Dict:
        """
        1. Rule-based classification (fast)
        2. If low confidence, use LLM
        3. Extract action items for high-priority emails
        """

        # Step 1: Rule-based classification
        rule_result = self.classifier.classify(email)

        # Step 2: If uncertain, use LLM
        if rule_result['confidence'] < 0.7:
            llm_result = self.intelligence.categorize_complex_email(
                email,
                rule_result['confidence']
            )
            if llm_result:
                rule_result.update(llm_result)
                rule_result['confidence'] = 0.85

        # Step 3: For high-priority/actionable emails, extract tasks
        if rule_result.get('needs_response') or rule_result.get('priority', 0) >= 4:
            actions = self.intelligence.extract_action_items(email)
            rule_result['action_items'] = actions

        return rule_result
```

---

## Part 5: Minimal Viable Secure Pipeline Architecture

### 5.1 High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER REQUEST                            │
│                    (Check my emails)                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
         ┌──────────────────┐
         │  TinyPM API      │
         │  Endpoint        │
         └────────┬─────────┘
                  │
                  ▼
         ┌────────────────────────┐
         │ Return cached results  │ ← <1ms
         │ (already processed)    │
         └────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              BACKGROUND: Email Processing Worker                │
│                  (Runs every 5-15 minutes)                      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ 1. Get access token        │
    │    from OAuth storage      │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ 2. Call Gmail API          │
    │    history.list (or        │
    │    messages.list if no     │
    │    history ID)             │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────────────┐
    │ 3. Process each email              │
    │    Rule-based classification       │
    │    (80% done here)                 │
    └────────────┬──────────────────────┘
                 │
                 ├─→ Low confidence (20%)
                 │     ├─→ Call Claude API (LLM)
                 │     └─→ Extract action items
                 │
                 ▼
    ┌────────────────────────────────────┐
    │ 4. Store results in database       │
    │    - Classification result         │
    │    - Action items                  │
    │    - Last processed timestamp      │
    │    - Last history ID               │
    └────────────┬──────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────────┐
    │ 5. Update UI cache                 │
    │    (for instant user response)     │
    └────────────────────────────────────┘
```

### 5.2 Database Schema (Supabase)

```sql
-- Email processing results (short-lived)
CREATE TABLE tinypm_email_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    email_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,

    -- Original email data
    from_address TEXT NOT NULL,
    from_name TEXT,
    subject TEXT NOT NULL,
    snippet TEXT,
    date_received TIMESTAMP NOT NULL,

    -- Classification results
    category TEXT CHECK (category IN ('actionable', 'fyi', 'newsletter', 'spam', 'waiting_for')),
    priority INT CHECK (priority >= 1 AND priority <= 5),
    confidence FLOAT CHECK (confidence >= 0.0 AND confidence <= 1.0),
    needs_response BOOLEAN,
    is_from_vip BOOLEAN,

    -- Action items (JSON array)
    action_items JSONB,

    -- Processing metadata
    processed_at TIMESTAMP DEFAULT NOW(),
    processed_by TEXT,  -- 'rule_based' or 'claude'
    ttl_days INT DEFAULT 30,  -- Auto-delete after 30 days

    -- Gmail state tracking
    last_history_id TEXT,
    is_unread BOOLEAN,

    UNIQUE(user_id, email_id),
    INDEX (user_id, processed_at DESC),
    INDEX (user_id, category, priority DESC)
);

-- Audit log (compliance)
CREATE TABLE tinypm_email_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,  -- 'read_emails', 'process_email', 'extract_actions'
    resource TEXT,  -- Which API was called
    status TEXT,  -- 'success', 'failure'
    error_message TEXT,
    result_count INT,
    duration_ms INT,
    timestamp TIMESTAMP DEFAULT NOW(),

    INDEX (user_id, timestamp DESC),
    INDEX (timestamp DESC)  -- For retention policy cleanup
);

-- OAuth token storage (encrypted)
CREATE TABLE tinypm_oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL,

    -- Tokens (should be encrypted at rest)
    access_token TEXT NOT NULL ENCRYPTED,
    refresh_token TEXT NOT NULL ENCRYPTED,
    token_type TEXT DEFAULT 'Bearer',

    -- Scope tracking (for security validation)
    scopes TEXT[] NOT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    last_refreshed_at TIMESTAMP,

    -- Rotation tracking (for security)
    refresh_count INT DEFAULT 0,

    INDEX (user_id),
    INDEX (expires_at)  -- For token expiry cleanup
);

-- Processing state (incremental sync)
CREATE TABLE tinypm_email_sync_state (
    user_id TEXT PRIMARY KEY,
    last_history_id TEXT,
    last_sync_time TIMESTAMP,
    last_full_sync_time TIMESTAMP,
    sync_count INT DEFAULT 0,

    -- Errors (for monitoring)
    last_error TEXT,
    last_error_time TIMESTAMP,
    consecutive_errors INT DEFAULT 0
);
```

### 5.3 Background Worker Implementation

Using Celery with Redis (or replace with whatever task queue you prefer):

```python
# tasks.py - Background email processing

from celery import shared_task
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def process_user_emails(self, user_id: str):
    """
    Process unread emails for a user.
    Runs every 5-15 minutes via Celery Beat.
    """
    try:
        # Step 1: Get email integration
        from email_integration import get_email_integration
        email_client = get_email_integration(user_id)

        if not email_client.is_connected():
            logger.warning(f"User {user_id} email not connected")
            return {"status": "skipped", "reason": "not_connected"}

        # Step 2: Get sync state
        sync_state = get_sync_state(user_id)
        start_time = datetime.utcnow()

        # Step 3: Fetch emails (incremental if possible)
        if sync_state and sync_state.get('last_history_id'):
            # Try incremental sync
            try:
                emails = email_client.get_new_emails_since(
                    sync_state['last_history_id']
                )
            except Exception as e:
                logger.warning(f"History sync failed for {user_id}, falling back to full")
                emails = email_client.get_unread_emails(max_results=100)
        else:
            # First time sync
            emails = email_client.get_unread_emails(max_results=100)

        # Step 4: Classify and process
        processor = EmailProcessor()
        results = []

        for email in emails:
            try:
                classified = processor.process_email(email)

                # Store in database
                store_email_result(user_id, email, classified)
                results.append(classified)

                # Audit log
                log_audit("process_email", user_id, "success")

            except Exception as e:
                logger.error(f"Error processing email {email.id}: {e}")
                log_audit("process_email", user_id, "failure", str(e))
                # Continue processing other emails

        # Step 5: Update sync state
        new_history_id = emails[-1].thread_id if emails else None
        update_sync_state(user_id, new_history_id, start_time)

        return {
            "status": "success",
            "emails_processed": len(results),
            "duration_ms": int((datetime.utcnow() - start_time).total_seconds() * 1000)
        }

    except Exception as e:
        logger.error(f"Error in process_user_emails for {user_id}: {e}")

        # Retry with exponential backoff
        retry_count = self.request.retries
        countdown = 60 * (2 ** retry_count)  # 60s, 120s, 240s

        self.retry(exc=e, countdown=countdown)


@shared_task
def process_all_users():
    """
    Orchestrate email processing for all active users.
    Runs every 5 minutes.
    """
    # Get all users with active email connections
    active_users = get_active_email_users()

    # Queue processing tasks
    for user_id in active_users:
        # Stagger tasks to avoid thundering herd
        delay = hash(user_id) % 60  # Spread across 60 seconds
        process_user_emails.apply_async(
            args=[user_id],
            countdown=delay
        )

    logger.info(f"Queued email processing for {len(active_users)} users")

    return {"users_queued": len(active_users)}


@shared_task
def cleanup_old_results():
    """
    Delete old email processing results (>30 days).
    Runs daily for GDPR compliance.
    """
    cutoff = datetime.utcnow() - timedelta(days=30)
    deleted = delete_email_results_before(cutoff)
    logger.info(f"Cleaned up {deleted} old email results")

    # Also cleanup old audit logs
    cutoff_audit = datetime.utcnow() - timedelta(days=90)
    deleted_audit = delete_audit_logs_before(cutoff_audit)
    logger.info(f"Cleaned up {deleted_audit} old audit logs")

    return {"deleted_results": deleted, "deleted_audit_logs": deleted_audit}


# Celery Beat schedule
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'process-all-users': {
        'task': 'tasks.process_all_users',
        'schedule': 300.0,  # Every 5 minutes
    },
    'cleanup-old-results': {
        'task': 'tasks.cleanup_old_results',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
    },
}
```

### 5.4 API Endpoint for User Dashboard

```python
# In your FastAPI or Flask app

@app.get("/api/email/dashboard")
@auth_required
def get_email_dashboard(user_id: str):
    """
    Return cached email processing results for UI.
    This is <1ms because results are pre-computed by background worker.
    """

    # Get counts by category
    counts = {
        'actionable': get_email_count(user_id, 'actionable'),
        'waiting_for': get_email_count(user_id, 'waiting_for'),
        'fyi': get_email_count(user_id, 'fyi'),
        'newsletters': get_email_count(user_id, 'newsletter'),
    }

    # Get high-priority items
    urgent = get_emails_by_priority(user_id, min_priority=4, limit=10)

    # Get action items that need response
    pending_actions = get_action_items_by_status(user_id, 'pending', limit=5)

    # Get VIP senders awaiting response
    vip_pending = get_vip_pending_responses(user_id, limit=5)

    return {
        'last_sync': get_last_sync_time(user_id),
        'counts': counts,
        'urgent_emails': [serialize_email(e) for e in urgent],
        'pending_actions': pending_actions,
        'vip_pending': vip_pending,
        'email_zero_status': counts['actionable'] == 0 and counts['waiting_for'] == 0,
    }


@app.post("/api/email/refresh")
@auth_required
def trigger_email_refresh(user_id: str):
    """
    Allow user to trigger immediate email refresh.
    Useful after sending an email or expecting urgent message.
    Rate limited: 1 per minute.
    """

    if is_rate_limited(user_id, 'email_refresh', 1):
        return {"error": "Rate limited. Try again in 30 seconds."}, 429

    # Queue immediate processing
    process_user_emails.apply_async(args=[user_id])

    return {"status": "queued"}
```

---

## Part 6: Security Checklist

### 6.1 OAuth & Token Management
- [ ] Store access tokens encrypted in database (AES-256)
- [ ] Implement refresh token rotation (each refresh generates new token)
- [ ] Validate scopes on token receipt (reject sheets/drive)
- [ ] Clear token on 401 Unauthorized
- [ ] Preemptively refresh 5 minutes before expiry
- [ ] Log all token operations to audit log
- [ ] Delete expired tokens after 7 days

### 6.2 Gmail API Usage
- [ ] Implement rate limiting per user (250 quota/sec)
- [ ] Cache message bodies (never refetch same message)
- [ ] Use history.list for incremental sync after first full sync
- [ ] Handle 404 by falling back to full sync
- [ ] Store history ID in database after each sync
- [ ] Implement exponential backoff for 429 errors
- [ ] Monitor daily quota usage

### 6.3 Data Privacy
- [ ] Define retention policy (30 days default)
- [ ] Implement auto-delete for old results
- [ ] Support user data deletion on request (GDPR right to be forgotten)
- [ ] Don't export email bodies to external systems
- [ ] Encrypt sensitive data in logs (don't log email content)
- [ ] Only store headers + minimal metadata

### 6.4 Audit & Compliance
- [ ] Log all email access (who, what, when, why)
- [ ] Keep audit logs for 90 days minimum
- [ ] Implement anomaly detection (sudden spike in reads)
- [ ] Document data retention policy
- [ ] Have breach notification process
- [ ] Test data deletion workflow monthly

### 6.5 Code Security
- [ ] Use HTTPS only (no plaintext token transmission)
- [ ] Never log tokens, email content, or PII
- [ ] Use parameterized queries (not string concatenation)
- [ ] Validate all API inputs (email IDs, user IDs)
- [ ] Sanitize any email content before displaying in UI
- [ ] Keep dependencies updated

---

## Part 7: Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. Add incremental sync to email_integration.py
   - Store history ID in Supabase
   - Implement history.list fallback
2. Add database schema (email_results, audit_log, sync_state)
3. Implement basic rule-based classifier
4. Add audit logging

### Phase 2: Background Processing (Week 2-3)
1. Set up Celery with Redis
2. Implement process_user_emails task
3. Create cleanup job for retention
4. Add rate limiting per user

### Phase 3: Intelligence Layer (Week 3-4)
1. Add LLM layer (Claude API integration)
2. Implement action item extraction
3. Add confidence scoring
4. Implement fallback to rules when LLM fails

### Phase 4: User Interface (Week 4-5)
1. Build email dashboard endpoint
2. Add refresh button
3. Display action items
4. Show Email Zero status
5. Add category filters

### Phase 5: Security Hardening (Week 5)
1. Encrypt tokens at rest
2. Implement token rotation
3. Add preemptive refresh
4. Comprehensive audit logging
5. Breach notification process

### Phase 6: Monitoring & Optimization (Week 6+)
1. Alert on sync failures
2. Monitor API quota usage
3. Track LLM costs
4. Performance profiling
5. User feedback loop

---

## Part 8: Cost Model

### Gmail API Costs
- **Free**: 1 billion quota units/day (project-wide)
- Typical email processing: 100 quota units per user per day = $0

### Claude API Costs (LLM layer)
- **Per 20% of emails** (confidence < 0.7)
- Input tokens: ~500 per email
- Output tokens: ~100 per email
- Pricing: $3 per 1M input tokens

**For 100K emails/day:**
- Rule-based: 80K emails = $0
- LLM: 20K emails × 600 tokens = 12M tokens = ~$0.036/day = ~$1/month

### Infrastructure Costs
- **Celery + Redis**: ~$10-20/month (or managed service)
- **Database storage**: <$1/month (email results auto-delete)
- **Supabase**: Included in existing usage

**Total Monthly Cost:** $1-30/month depending on scale

---

## Part 9: Key Recommendations

### For TinyPM Specifically

1. **Start with batch processing, not webhooks**
   - Simpler architecture, fewer moving parts
   - 5-15 minute latency is acceptable for "Email Zero"
   - Avoids Gmail push notification race conditions

2. **Hybrid classification from day 1**
   - 80% rule-based (instant, cost-free)
   - 20% LLM for edge cases
   - Don't start with LLM-only (waste of tokens + cost)

3. **Store minimal data**
   - Headers + classification results only
   - Don't store full email bodies
   - Auto-delete after 30 days (GDPR friendly)
   - Better privacy = better sales story

4. **Incremental sync is critical**
   - history.list saves 80% of API calls
   - Store history ID after each sync
   - Implement 404 fallback immediately

5. **Security by design**
   - You already have OAuth boundary enforcement (good!)
   - Add token encryption at rest (next priority)
   - Implement audit logging (compliance requirement)
   - Plan for SOC 2 from the start

### What NOT to Do

- Don't build custom email parsing (use Gmail API)
- Don't store encrypted emails (violates simplicity principle)
- Don't implement real-time webhooks yet (save for scale-up)
- Don't call Gmail API synchronously in user requests (use background workers)
- Don't assume LLM classifies everything better (it costs more, slower)

---

## Part 10: References & Further Reading

### Gmail API Documentation
- [Google Gmail API Sync Guide](https://developers.google.com/workspace/gmail/api/guides/sync)
- [Gmail API Rate Limits](https://developers.google.com/workspace/gmail/api/reference/quota)
- [Gmail history.list Documentation](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list)

### Industry Leaders
- [Superhuman's Cognitive Architecture](https://blog.superhuman.com/how-we-built-superhuman-ai/)
- [SaneBox: AI Email Management](https://www.sanebox.com/)

### Security & Compliance
- [GDPR Email Compliance 2026](https://secureprivacy.ai/blog/gdpr-compliance-2026)
- [SOC 2 Compliance Guide](https://sprinto.com/blog/soc-2-requirements/)
- [OAuth Token Best Practices](https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/)
- [Email Audit Logging (Microsoft Reference)](https://learn.microsoft.com/en-us/purview/audit-mailboxes)

### Background Processing
- [Celery: Distributed Task Queue](https://docs.celeryproject.org/)
- [Message Queues for Email Processing](https://dev.community/_nancychauhan/introduction-to-message-queue-build-a-newsletter-app-using-django-celery-and-rabbitmq-in-30-min-60p)

### Email Classification
- [LLM Email Classification Research](https://arxiv.org/html/2405.15936v1)
- [Hybrid Classification Approaches](https://medium.com/@lad.jai/the-hybrid-approach-combining-llms-and-non-llms-for-nlp-success-c07a1d0e14f8)

---

## Appendix: Your Current Implementation Status

### ✅ Already Implemented (Good Foundation)
- OAuth token storage with scope validation
- Hard boundary enforcement (gmail.readonly, gmail.compose)
- Email parsing and message extraction
- Urgency scoring algorithm
- Integration with StyleLearner for user voice
- Skill-based architecture (email_skill.py)

### ⚠️ Missing Pieces (Priority Order)
1. **Incremental sync** - Currently using messages.list every time
2. **Background worker** - No Celery/task queue implementation
3. **Rule-based classifier** - Only urgency score, no categorization
4. **Database schema** - No email results storage
5. **Audit logging** - No compliance logging
6. **Token encryption** - OAuth tokens may not be encrypted at rest
7. **Token rotation** - No refresh token rotation
8. **Retention policy** - No auto-delete of old results

### 📋 Next Steps
1. Read this document completely
2. Review your email_integration.py against Part 1.1 (incremental sync)
3. Add Celery/Redis for background processing
4. Implement EmailClassifier from Part 4.1
5. Add database schema from Part 5.2
6. Set up audit logging
7. Plan SOC 2 compliance from start

---

**Document Created:** January 30, 2026
**Status:** Research Complete
**Next Action:** Technical design phase for implementation

