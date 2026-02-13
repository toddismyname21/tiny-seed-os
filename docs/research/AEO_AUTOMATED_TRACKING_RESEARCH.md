# AEO (Answer Engine Optimization) Automated Tracking Research

**Research Date:** February 12, 2026
**Purpose:** Build an automated system to monitor whether AI assistants mention "Tiny Seed Farm" when users ask about local farms, CSAs, and organic produce in Pittsburgh.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Existing AEO Monitoring Tools](#1-existing-aeo-monitoring-tools)
3. [API Access to AI Platforms](#2-api-access-to-ai-platforms)
4. [Query Strategy](#3-query-strategy)
5. [Technical Implementation](#4-technical-implementation)
6. [Alerting and Reporting](#5-alerting-and-reporting)
7. [Cost Optimization](#6-cost-optimization)
8. [Recommended Implementation Approach](#7-recommended-implementation-approach)
9. [Appendix: Code Examples](#appendix-code-examples)

---

## Executive Summary

AEO (Answer Engine Optimization) has become essential in 2026. Over 60% of searches now end without a click, with users getting answers directly from AI overviews. Major publishers report 800% year-over-year increases in LLM-driven traffic. This research provides a comprehensive guide to building an automated system that tracks "Tiny Seed Farm" mentions across ChatGPT, Perplexity, Gemini, and Google AI Overviews.

**Key Findings:**
- Commercial tools exist but are expensive ($89-$500+/month)
- DIY approaches are viable using APIs from OpenAI, Google, and Perplexity
- HubSpot offers a **FREE** AEO Grader tool for basic tracking
- Google Gemini API has a generous free tier (100-1,000 requests/day)
- Open-source tools like AI Monitor and AI Chat Watch exist on GitHub
- Estimated DIY cost: $10-50/month with strategic query scheduling

---

## 1. Existing AEO Monitoring Tools

### Commercial Tools (Enterprise)

| Tool | Pricing | Platforms Covered | Best For |
|------|---------|-------------------|----------|
| **Otterly.AI** | $29-$989/mo | ChatGPT, Perplexity, Gemini, Google AIO, Copilot, AI Mode | Best value for agencies |
| **Peec AI** | $89-$499/mo | ChatGPT, Perplexity, Google AIO (+Gemini, Claude for extra fee) | Mid-market B2B SaaS |
| **Scrunch AI** | $100-$500/mo | ChatGPT, Gemini, Perplexity, Claude | Enterprise with SOC 2 needs |
| **Profound** | $99-$399+/mo | 10+ engines including Claude, Grok | Fortune 100 companies |
| **Ahrefs Brand Radar** | $199+/mo add-on | ChatGPT, Perplexity, Gemini, Google AIO | SEO teams already using Ahrefs |
| **AIclicks.io** | Contact for pricing | ChatGPT, Gemini, Perplexity, Claude, Grok | Content creation + tracking |

### Free Tools

| Tool | Features | Limitations |
|------|----------|-------------|
| **HubSpot AEO Grader** | ChatGPT, Perplexity, Gemini analysis; competitor benchmarking; 0-100 visibility score; actionable recommendations | No continuous monitoring; manual runs |

### Open-Source Tools

| Tool | GitHub | Features |
|------|--------|----------|
| **AI Monitor** | Search "AI Monitor brand mentions" | First open-source AI mention tracker; ChatGPT, Google AIO, Perplexity |
| **AI Chat Watch (AICW)** | github.com/topics/brand-monitoring | GEO marketer tool; competitive intelligence; Claude + ChatGPT |

**Recommendation for Tiny Seed Farm:** Start with **HubSpot AEO Grader (free)** for baseline, then build DIY tracker using APIs, with potential upgrade to **Otterly.AI Lite ($29/mo)** for more features.

---

## 2. API Access to AI Platforms

### OpenAI API (ChatGPT)

**Pricing (Per Million Tokens):**
| Model | Input | Output |
|-------|-------|--------|
| GPT-4o Mini | $0.15 | $0.60 |
| GPT-4o | $5.00 | $15.00 |
| GPT-5 | $1.25 | $10.00 |
| GPT-5 (Batch API - 50% off) | $0.625 | $5.00 |

**Web Search API:**
- ChatGPT search now available to everyone
- Use `gpt-5-search-api` for real-time web data
- API returns `sources` field with all URLs consulted

**Estimated Cost for AEO Tracking:**
- 30 queries/day x 30 days = 900 queries/month
- ~500 tokens per query/response
- Using GPT-4o Mini: ~$0.34/month for inputs + outputs

**Code Example:**
```python
from openai import OpenAI

client = OpenAI(api_key="your-api-key")

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "user", "content": "What are the best CSA programs near Pittsburgh?"}
    ]
)

answer = response.choices[0].message.content
if "tiny seed" in answer.lower():
    print("MENTIONED!")
```

### Google Gemini API

**Free Tier Limits (as of February 2026):**
| Model | Requests/Min | Requests/Day | Context Window |
|-------|--------------|--------------|----------------|
| Gemini 2.5 Pro | 5 | 100 | 1M tokens |
| Gemini 2.5 Flash | 10 | 250 | 1M tokens |
| Gemini 2.5 Flash-Lite | 15 | 1,000 | 1M tokens |

**Paid Tier Pricing:**
- Gemini 2.5 Flash: $0.30/M input tokens, $2.50/M output tokens

**Important Notes:**
- Free tier limits reset at midnight Pacific time
- No credit card required for free tier
- Rate limits apply at Google Cloud Project level

**Code Example:**
```python
import google.generativeai as genai

genai.configure(api_key="your-api-key")
model = genai.GenerativeModel('gemini-2.5-flash')

response = model.generate_content(
    "What organic farms offer CSA subscriptions in Pittsburgh?"
)

if "tiny seed" in response.text.lower():
    print("MENTIONED in Gemini!")
```

### Perplexity API

**Pricing Model:** Pay-as-you-go credits
- Perplexity Pro subscribers: $5 monthly credit
- Sonar: $1.00/M input tokens (most affordable)
- Sonar Pro: Higher pricing, better reasoning
- **2026 Update:** Citation tokens no longer billed

**Key Features:**
- Real-time web search built-in
- Domain filtering supported
- Returns ranked results with citations

**Code Example:**
```python
import requests

url = "https://api.perplexity.ai/chat/completions"
headers = {
    "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
    "Content-Type": "application/json"
}

payload = {
    "model": "sonar",
    "messages": [
        {"role": "user", "content": "Best local farms for organic produce in Pittsburgh PA"}
    ]
}

response = requests.post(url, json=payload, headers=headers)
answer = response.json()["choices"][0]["message"]["content"]
```

### Anthropic Claude API

**Pricing (Per Million Tokens):**
| Model | Input | Output |
|-------|-------|--------|
| Claude Haiku 4.5 | $1.00 | $5.00 |
| Claude Sonnet 4.5 | $3.00 | $15.00 |
| Claude Opus 4.5 | $5.00 | $25.00 |

**Cost Optimization:**
- Prompt caching: 90% savings on repeated context
- Batch API: 50% discount
- 5-minute cache: 1.25x write, 0.1x read

### Google AI Overviews (via SerpAPI)

**SerpAPI Pricing:**
- Developer: $75/month for 5,000 searches ($0.015/search)
- Supports Google AI Overview extraction
- Handles proxies and CAPTCHAs automatically

**Important Legal Note:** Google filed a lawsuit against SerpAPI in December 2025 alleging DMCA violations. Consider alternative approaches or monitor legal developments.

**Alternative Approach - Free:**
```python
# Using Google Custom Search API (100 queries/day free)
# Then check if AI Overview appears in results
```

---

## 3. Query Strategy

### Recommended Queries for Tiny Seed Farm

**Tier 1 - High Priority (Daily Monitoring):**
```
1. "best CSA Pittsburgh"
2. "organic farm near Pittsburgh"
3. "local farm subscription Pittsburgh"
4. "CSA programs Pittsburgh PA"
5. "farm share near me Pittsburgh"
```

**Tier 2 - Medium Priority (2-3x/week):**
```
6. "organic vegetables Pittsburgh"
7. "local produce delivery Pittsburgh"
8. "farm to table Pittsburgh"
9. "sustainable farms Pennsylvania"
10. "best organic farms near Pittsburgh"
```

**Tier 3 - Long-Tail (Weekly):**
```
11. "where to buy local organic vegetables Pittsburgh"
12. "CSA subscription vs grocery store Pittsburgh"
13. "small farms near Rochester PA"
14. "organic farming Beaver County PA"
15. "family farm fresh produce Pittsburgh area"
```

**Competitor Monitoring:**
```
- "[competitor name] vs alternatives Pittsburgh"
- "farms like [competitor] Pittsburgh"
```

### Query Frequency Recommendations

| Query Tier | Frequency | Queries/Month | Rationale |
|------------|-----------|---------------|-----------|
| Tier 1 (5 queries) | Daily | 150 | Core visibility tracking |
| Tier 2 (5 queries) | 3x/week | 60 | Important keywords |
| Tier 3 (5 queries) | Weekly | 20 | Long-tail coverage |
| **Total** | - | **230** | - |

**Per Platform (4 platforms):** 920 queries/month total

### Location Variations

Include location modifiers to capture local intent:
- "Pittsburgh"
- "Pittsburgh PA"
- "near Pittsburgh"
- "Pittsburgh area"
- "Western Pennsylvania"
- "Beaver County PA"
- "Rochester PA"

---

## 4. Technical Implementation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AEO Tracking System                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  Scheduler  │───>│ Query Engine │───>│  AI APIs    │     │
│  │  (APScheduler/│   │             │    │  - OpenAI   │     │
│  │   Cron)     │    │             │    │  - Gemini   │     │
│  └─────────────┘    └─────────────┘    │  - Perplexity│    │
│                            │           │  - SerpAPI  │     │
│                            ▼           └─────────────┘     │
│                    ┌─────────────┐                          │
│                    │  Response   │                          │
│                    │  Parser     │                          │
│                    │  (NER/Regex)│                          │
│                    └─────────────┘                          │
│                            │                                │
│              ┌─────────────┼─────────────┐                 │
│              ▼             ▼             ▼                 │
│       ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│       │ Database │  │ Alerts   │  │ Dashboard│            │
│       │ (SQLite/ │  │ (Email/  │  │ (Grafana/│            │
│       │  Postgres)│  │  Slack)  │  │  Custom) │            │
│       └──────────┘  └──────────┘  └──────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Scheduling Options

**Option 1: APScheduler (Python - Recommended)**
```python
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = BlockingScheduler()

# Run Tier 1 queries daily at 6 AM
@scheduler.scheduled_job(CronTrigger(hour=6, minute=0))
def run_tier1_queries():
    run_queries(TIER1_QUERIES, all_platforms=True)

# Run Tier 2 queries Mon/Wed/Fri at 7 AM
@scheduler.scheduled_job(CronTrigger(day_of_week='mon,wed,fri', hour=7))
def run_tier2_queries():
    run_queries(TIER2_QUERIES, all_platforms=True)

# Run Tier 3 queries Sundays at 8 AM
@scheduler.scheduled_job(CronTrigger(day_of_week='sun', hour=8))
def run_tier3_queries():
    run_queries(TIER3_QUERIES, all_platforms=True)

scheduler.start()
```

**Option 2: System Cron**
```bash
# Edit crontab: crontab -e

# Tier 1 - Daily at 6 AM
0 6 * * * /usr/bin/python3 /home/user/aeo_tracker/run_tier1.py >> /var/log/aeo.log 2>&1

# Tier 2 - Mon/Wed/Fri at 7 AM
0 7 * * 1,3,5 /usr/bin/python3 /home/user/aeo_tracker/run_tier2.py >> /var/log/aeo.log 2>&1

# Tier 3 - Sundays at 8 AM
0 8 * * 0 /usr/bin/python3 /home/user/aeo_tracker/run_tier3.py >> /var/log/aeo.log 2>&1
```

### Parsing AI Responses for Brand Mentions

**Simple Regex Approach:**
```python
import re

def check_brand_mention(response_text, brand_name="Tiny Seed Farm"):
    """Check if brand is mentioned in AI response."""
    # Case-insensitive search
    pattern = re.compile(re.escape(brand_name), re.IGNORECASE)

    # Also check variations
    variations = [
        "tiny seed",
        "tinyseed",
        "tiny-seed",
        "tinyseedfarm"
    ]

    found = bool(pattern.search(response_text))

    for var in variations:
        if var.lower() in response_text.lower():
            found = True
            break

    return found
```

**Advanced NLP Approach (using spaCy):**
```python
import spacy

nlp = spacy.load("en_core_web_sm")

def extract_entities(response_text):
    """Extract named entities from AI response."""
    doc = nlp(response_text)

    entities = {
        "organizations": [],
        "locations": [],
        "products": []
    }

    for ent in doc.ents:
        if ent.label_ == "ORG":
            entities["organizations"].append(ent.text)
        elif ent.label_ in ["GPE", "LOC"]:
            entities["locations"].append(ent.text)
        elif ent.label_ == "PRODUCT":
            entities["products"].append(ent.text)

    return entities

def analyze_mention_context(response_text, brand_name):
    """Analyze the context around a brand mention."""
    doc = nlp(response_text)

    for sent in doc.sents:
        if brand_name.lower() in sent.text.lower():
            # Analyze sentiment of the sentence
            # Check position (first mention, recommendation, etc.)
            return {
                "sentence": sent.text,
                "position": response_text.lower().find(brand_name.lower()),
                "is_recommendation": any(word in sent.text.lower()
                    for word in ["recommend", "best", "top", "great", "excellent"])
            }

    return None
```

### Tracking Position and Prominence

```python
def calculate_prominence_score(response_text, brand_name):
    """
    Calculate prominence score (0-100) based on:
    - Position in response
    - Context (recommendation vs. just mention)
    - Number of mentions
    """
    score = 0
    text_lower = response_text.lower()
    brand_lower = brand_name.lower()

    if brand_lower not in text_lower:
        return 0

    # Position score (earlier = better)
    position = text_lower.find(brand_lower)
    total_length = len(response_text)
    position_score = max(0, 30 - (position / total_length * 30))
    score += position_score

    # Mention count score
    mention_count = text_lower.count(brand_lower)
    score += min(mention_count * 10, 30)

    # Recommendation context score
    rec_words = ["recommend", "best", "top", "excellent", "great choice",
                 "highly rated", "popular", "favorite"]
    for word in rec_words:
        if word in text_lower:
            # Check if near brand mention
            word_pos = text_lower.find(word)
            if abs(word_pos - position) < 200:  # Within 200 chars
                score += 10
                break

    # First position bonus
    if position < 500:
        score += 20

    return min(score, 100)
```

### Competitor Detection

```python
COMPETITORS = [
    "Harvest Valley Farm",
    "Green Acres CSA",
    "Pittsburgh Fresh",
    "Urban Farm Pittsburgh",
    # Add actual competitors
]

def detect_competitors(response_text):
    """Detect which competitors are mentioned."""
    mentioned = []

    for competitor in COMPETITORS:
        if competitor.lower() in response_text.lower():
            mentioned.append({
                "name": competitor,
                "position": response_text.lower().find(competitor.lower()),
                "prominence": calculate_prominence_score(response_text, competitor)
            })

    return sorted(mentioned, key=lambda x: x["prominence"], reverse=True)
```

### Database Schema

```sql
CREATE TABLE aeo_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_text TEXT NOT NULL,
    tier INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE aeo_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_id INTEGER REFERENCES aeo_queries(id),
    platform TEXT NOT NULL,  -- 'chatgpt', 'gemini', 'perplexity', 'google_aio'
    response_text TEXT NOT NULL,
    brand_mentioned BOOLEAN NOT NULL,
    prominence_score INTEGER,
    competitors_mentioned TEXT,  -- JSON array
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE aeo_daily_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    platform TEXT NOT NULL,
    visibility_percentage FLOAT,  -- % of queries with brand mention
    avg_prominence_score FLOAT,
    total_queries INTEGER,
    total_mentions INTEGER,
    competitor_share TEXT,  -- JSON object
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_responses_date ON aeo_responses(created_at);
CREATE INDEX idx_responses_platform ON aeo_responses(platform);
CREATE INDEX idx_daily_scores_date ON aeo_daily_scores(date);
```

---

## 5. Alerting and Reporting

### When to Alert

| Alert Type | Trigger | Priority |
|------------|---------|----------|
| **New Mention** | Brand mentioned for first time on a query/platform | Medium |
| **Lost Mention** | Brand was mentioned last week, not this week | High |
| **Sentiment Shift** | Negative context detected | Critical |
| **Competitor Surge** | Competitor prominence increased significantly | Medium |
| **Factual Error** | Incorrect information about brand | Critical |
| **Volume Spike** | 50%+ increase in mentions | Low (positive) |

### Alert Implementation

```python
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText

def check_alerts(db_connection):
    """Check for alert conditions."""
    alerts = []

    # Check for lost mentions
    yesterday = datetime.now() - timedelta(days=1)
    last_week = datetime.now() - timedelta(days=7)

    cursor = db_connection.cursor()

    # Queries that had mentions last week but not yesterday
    cursor.execute("""
        SELECT DISTINCT q.query_text, r.platform
        FROM aeo_queries q
        JOIN aeo_responses r ON q.id = r.query_id
        WHERE r.brand_mentioned = TRUE
        AND r.created_at BETWEEN ? AND ?
        AND NOT EXISTS (
            SELECT 1 FROM aeo_responses r2
            WHERE r2.query_id = q.id
            AND r2.platform = r.platform
            AND r2.brand_mentioned = TRUE
            AND r2.created_at > ?
        )
    """, (last_week, yesterday, yesterday))

    lost_mentions = cursor.fetchall()

    for query, platform in lost_mentions:
        alerts.append({
            "type": "lost_mention",
            "priority": "high",
            "message": f"Lost mention on {platform} for query: {query}"
        })

    return alerts

def send_alert(alert, config):
    """Send alert via email/Slack."""
    if config["slack_webhook"]:
        send_slack_alert(alert, config["slack_webhook"])

    if config["email"]:
        send_email_alert(alert, config["email"])

def send_slack_alert(alert, webhook_url):
    import requests

    color = {
        "critical": "#ff0000",
        "high": "#ff9900",
        "medium": "#ffcc00",
        "low": "#00cc00"
    }.get(alert["priority"], "#cccccc")

    payload = {
        "attachments": [{
            "color": color,
            "title": f"AEO Alert: {alert['type']}",
            "text": alert["message"],
            "ts": datetime.now().timestamp()
        }]
    }

    requests.post(webhook_url, json=payload)
```

### Key AEO Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| **AI Visibility %** | (Queries with mention / Total queries) x 100 | >30% |
| **Share of Voice** | (Your mentions / Total brand mentions) x 100 | >20% |
| **Avg Prominence Score** | Mean of all prominence scores | >60 |
| **Citation Rate** | (Queries with link citation / Total queries) x 100 | >10% |
| **Sentiment Score** | (Positive mentions - Negative) / Total | >0.5 |

### AEO Score Calculation

```python
def calculate_aeo_score(metrics):
    """
    Calculate composite AEO score (0-100).

    Components:
    - Visibility (30%): How often mentioned
    - Prominence (25%): Position and context when mentioned
    - Share of Voice (20%): Vs competitors
    - Citation Quality (15%): Links to website
    - Sentiment (10%): Positive vs negative
    """

    visibility_score = min(metrics["visibility_pct"] * 3, 30)
    prominence_score = metrics["avg_prominence"] * 0.25
    sov_score = min(metrics["share_of_voice"] * 2, 20)
    citation_score = min(metrics["citation_rate"] * 1.5, 15)
    sentiment_score = (metrics["sentiment"] + 1) * 5  # -1 to 1 -> 0 to 10

    total = (visibility_score + prominence_score + sov_score +
             citation_score + sentiment_score)

    return round(total, 1)
```

### Reporting Dashboard

**Weekly Report Template:**
```markdown
# AEO Weekly Report - Tiny Seed Farm
**Week of:** [DATE]

## Overall AEO Score: [X]/100 ([+/-X] from last week)

### Platform Breakdown
| Platform | Visibility | Prominence | Change |
|----------|------------|------------|--------|
| ChatGPT  | X%         | X/100      | +X%    |
| Perplexity | X%       | X/100      | +X%    |
| Gemini   | X%         | X/100      | +X%    |
| Google AIO | X%       | X/100      | +X%    |

### Top Performing Queries
1. "[query]" - Mentioned on X platforms
2. "[query]" - Prominence score: X

### Opportunities (Not Mentioned)
1. "[query]" - High search volume
2. "[query]" - Competitor mentioned

### Competitor Analysis
| Competitor | Share of Voice | Trend |
|------------|----------------|-------|
| [Name]     | X%             | +X%   |

### Recommendations
1. [Action item based on data]
2. [Action item based on data]
```

---

## 6. Cost Optimization

### API Cost Estimates (Monthly)

**Baseline: 920 queries/month across 4 platforms**

| Platform | Free Tier | Paid Estimate |
|----------|-----------|---------------|
| Gemini | 100-1000/day FREE | $0 |
| ChatGPT (GPT-4o Mini) | None | ~$0.50 |
| Perplexity (Sonar) | $5 credit with Pro | ~$2-5 |
| SerpAPI (Google AIO) | None | $75/mo OR skip |

**Total Estimated Cost:**
- **Budget Option (skip SerpAPI):** $5-10/month
- **Full Coverage:** $80-85/month

### Cost Reduction Strategies

**1. Use Free Tiers Strategically**
```python
# Prioritize Gemini for routine checks (free)
PLATFORM_PRIORITY = [
    ("gemini", 1000),    # Free daily limit
    ("chatgpt", 100),    # Budget limit
    ("perplexity", 50),  # Credit-based
]

def allocate_queries(queries, platforms=PLATFORM_PRIORITY):
    """Allocate queries across platforms based on limits/costs."""
    allocation = {}

    for query in queries:
        for platform, daily_limit in platforms:
            if allocation.get(platform, 0) < daily_limit:
                allocation.setdefault(platform, []).append(query)
                break

    return allocation
```

**2. Implement Semantic Caching**
```python
from functools import lru_cache
import hashlib

# Cache identical queries for 24 hours
query_cache = {}

def get_cached_or_query(platform, query, ttl_hours=24):
    """Check cache before making API call."""
    cache_key = hashlib.md5(f"{platform}:{query}".encode()).hexdigest()

    if cache_key in query_cache:
        cached_time, cached_result = query_cache[cache_key]
        if (datetime.now() - cached_time).hours < ttl_hours:
            return cached_result

    # Make actual API call
    result = query_platform(platform, query)
    query_cache[cache_key] = (datetime.now(), result)

    return result
```

**3. Batch Processing with OpenAI**
```python
# Use Batch API for 50% discount (24-hour turnaround)
from openai import OpenAI

client = OpenAI()

def submit_batch_queries(queries):
    """Submit queries via Batch API for cost savings."""

    # Create batch file
    batch_requests = []
    for i, query in enumerate(queries):
        batch_requests.append({
            "custom_id": f"query-{i}",
            "method": "POST",
            "url": "/v1/chat/completions",
            "body": {
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": query}]
            }
        })

    # Submit batch (returns within 24 hours)
    batch = client.batches.create(
        input_file_id=upload_batch_file(batch_requests),
        endpoint="/v1/chat/completions",
        completion_window="24h"
    )

    return batch.id
```

**4. Use Anthropic Prompt Caching**
```python
# Cache common system prompts for 90% savings
system_prompt = """You are analyzing local farm and CSA options
in the Pittsburgh area. Please provide recommendations based on
current offerings, quality, and customer reviews."""

# First request caches the system prompt
# Subsequent requests with same cache_control pay only 10% for cached portion
```

**5. Strategic Query Reduction**
- Remove duplicate semantic queries
- Focus on high-value queries only
- Reduce frequency for stable queries
- Use sampling instead of exhaustive tracking

---

## 7. Recommended Implementation Approach

### Phase 1: Foundation (Week 1)

**Goal:** Establish baseline and manual tracking

1. **Run HubSpot AEO Grader** (FREE)
   - Get initial visibility score
   - Identify gaps vs competitors
   - Document baseline metrics

2. **Set up Google Gemini API** (FREE)
   - Create Google Cloud project
   - Enable Gemini API
   - Test with 5 core queries

3. **Create Query List**
   - 15 prioritized queries (see Section 3)
   - Document competitor names
   - Set up tracking spreadsheet

### Phase 2: Automation (Weeks 2-3)

**Goal:** Build automated tracking system

1. **Set up Python Environment**
   ```bash
   pip install openai google-generativeai apscheduler spacy requests
   python -m spacy download en_core_web_sm
   ```

2. **Implement Core Tracker**
   - Query execution module
   - Response parser
   - SQLite database
   - Basic logging

3. **Add Scheduling**
   - APScheduler for query timing
   - Rate limit handling
   - Error recovery

### Phase 3: Intelligence (Week 4)

**Goal:** Add analytics and alerting

1. **Build Metrics Dashboard**
   - Daily visibility scores
   - Competitor tracking
   - Trend analysis

2. **Set up Alerts**
   - Email notifications
   - Slack integration (optional)
   - Alert thresholds

3. **Generate Reports**
   - Weekly summary template
   - CSV exports
   - Trend charts

### Phase 4: Optimization (Ongoing)

**Goal:** Refine and expand

1. **Add Platforms**
   - Perplexity API
   - SerpAPI for Google AIO (if budget allows)

2. **Tune Queries**
   - Remove low-value queries
   - Add high-performing variations
   - A/B test prompts

3. **Improve Scoring**
   - Sentiment analysis
   - Citation tracking
   - Context classification

### Minimum Viable Product (MVP) Checklist

- [ ] Gemini API integration (free)
- [ ] 5 core queries tracked daily
- [ ] SQLite storage
- [ ] Brand mention detection
- [ ] Email alerts for lost mentions
- [ ] Weekly CSV report

### Technology Stack Recommendation

| Component | Technology | Why |
|-----------|------------|-----|
| Language | Python 3.10+ | Best AI/API support |
| Scheduler | APScheduler | Flexible, production-ready |
| Database | SQLite -> PostgreSQL | Start simple, scale later |
| NLP | spaCy | Industry standard NER |
| Dashboard | Grafana OR custom | Depends on existing stack |
| Hosting | Raspberry Pi OR VPS | Low cost, always-on |

---

## Appendix: Code Examples

### Complete MVP Implementation

```python
#!/usr/bin/env python3
"""
AEO Tracker MVP for Tiny Seed Farm
Monitors brand mentions across AI platforms
"""

import os
import re
import json
import sqlite3
import logging
from datetime import datetime
from typing import List, Dict, Optional

import google.generativeai as genai
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

# Configuration
BRAND_NAME = "Tiny Seed Farm"
BRAND_VARIATIONS = ["tiny seed", "tinyseed", "tiny-seed"]
DB_PATH = "aeo_tracker.db"

TIER1_QUERIES = [
    "best CSA Pittsburgh",
    "organic farm near Pittsburgh",
    "local farm subscription Pittsburgh",
    "CSA programs Pittsburgh PA",
    "farm share near me Pittsburgh"
]

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database Setup
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query TEXT NOT NULL,
            platform TEXT NOT NULL,
            response TEXT NOT NULL,
            brand_mentioned BOOLEAN NOT NULL,
            prominence_score INTEGER,
            competitors TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS daily_summary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATE NOT NULL,
            platform TEXT NOT NULL,
            visibility_pct FLOAT,
            avg_prominence FLOAT,
            total_queries INTEGER,
            mentions INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    return conn

# Gemini Integration
def init_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel('gemini-2.5-flash')

def query_gemini(model, query: str) -> str:
    """Query Gemini and return response text."""
    try:
        response = model.generate_content(query)
        return response.text
    except Exception as e:
        logger.error(f"Gemini error: {e}")
        return ""

# Analysis Functions
def check_brand_mention(text: str) -> bool:
    """Check if brand is mentioned."""
    text_lower = text.lower()

    if BRAND_NAME.lower() in text_lower:
        return True

    for variation in BRAND_VARIATIONS:
        if variation in text_lower:
            return True

    return False

def calculate_prominence(text: str, brand: str = BRAND_NAME) -> int:
    """Calculate prominence score 0-100."""
    text_lower = text.lower()
    brand_lower = brand.lower()

    if brand_lower not in text_lower:
        return 0

    score = 0

    # Position score (earlier = better)
    position = text_lower.find(brand_lower)
    total_length = len(text)
    if position < total_length * 0.25:
        score += 30
    elif position < total_length * 0.5:
        score += 20
    else:
        score += 10

    # Mention count
    count = text_lower.count(brand_lower)
    score += min(count * 15, 30)

    # Recommendation context
    rec_words = ["recommend", "best", "top", "excellent", "great"]
    for word in rec_words:
        if word in text_lower:
            score += 20
            break

    return min(score, 100)

def detect_competitors(text: str, competitors: List[str]) -> List[str]:
    """Find mentioned competitors."""
    mentioned = []
    text_lower = text.lower()

    for comp in competitors:
        if comp.lower() in text_lower:
            mentioned.append(comp)

    return mentioned

# Main Tracking Function
def run_tracking(queries: List[str], platform: str = "gemini"):
    """Run tracking for a list of queries."""
    conn = init_db()
    cursor = conn.cursor()

    model = init_gemini()

    results = []

    for query in queries:
        logger.info(f"Querying: {query}")

        response_text = query_gemini(model, query)

        if not response_text:
            continue

        mentioned = check_brand_mention(response_text)
        prominence = calculate_prominence(response_text) if mentioned else 0
        competitors = detect_competitors(response_text, [])  # Add your competitors

        cursor.execute('''
            INSERT INTO responses
            (query, platform, response, brand_mentioned, prominence_score, competitors)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (query, platform, response_text, mentioned, prominence,
              json.dumps(competitors)))

        results.append({
            "query": query,
            "mentioned": mentioned,
            "prominence": prominence,
            "competitors": competitors
        })

        logger.info(f"  Mentioned: {mentioned}, Prominence: {prominence}")

    conn.commit()
    conn.close()

    # Send alerts if needed
    check_and_alert(results)

    return results

def check_and_alert(results: List[Dict]):
    """Check for alert conditions."""
    for result in results:
        if not result["mentioned"]:
            # Could alert on missed mention
            pass

        if result["competitors"]:
            logger.warning(f"Competitors mentioned: {result['competitors']}")

def generate_daily_summary():
    """Generate daily summary metrics."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    today = datetime.now().date()

    cursor.execute('''
        SELECT
            platform,
            COUNT(*) as total,
            SUM(CASE WHEN brand_mentioned THEN 1 ELSE 0 END) as mentions,
            AVG(CASE WHEN brand_mentioned THEN prominence_score ELSE NULL END) as avg_prominence
        FROM responses
        WHERE DATE(created_at) = ?
        GROUP BY platform
    ''', (today,))

    for row in cursor.fetchall():
        platform, total, mentions, avg_prominence = row
        visibility = (mentions / total * 100) if total > 0 else 0

        cursor.execute('''
            INSERT INTO daily_summary
            (date, platform, visibility_pct, avg_prominence, total_queries, mentions)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (today, platform, visibility, avg_prominence or 0, total, mentions))

        logger.info(f"Daily Summary - {platform}: {visibility:.1f}% visibility")

    conn.commit()
    conn.close()

# Scheduler
def start_scheduler():
    """Start the tracking scheduler."""
    scheduler = BlockingScheduler()

    # Tier 1 queries daily at 6 AM
    @scheduler.scheduled_job(CronTrigger(hour=6, minute=0))
    def daily_tier1():
        logger.info("Running Tier 1 queries...")
        run_tracking(TIER1_QUERIES)
        generate_daily_summary()

    logger.info("Starting AEO Tracker scheduler...")
    scheduler.start()

if __name__ == "__main__":
    # Test run
    logger.info("Testing AEO Tracker...")
    results = run_tracking(TIER1_QUERIES[:2])  # Test with 2 queries

    for r in results:
        print(f"\nQuery: {r['query']}")
        print(f"  Mentioned: {r['mentioned']}")
        print(f"  Prominence: {r['prominence']}")
```

### Environment Setup

```bash
# .env file
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here
ALERT_EMAIL=alerts@tinyseedfarm.com
SLACK_WEBHOOK=https://hooks.slack.com/services/xxx
```

### Requirements

```txt
# requirements.txt
google-generativeai>=0.8.0
openai>=1.0.0
apscheduler>=3.10.0
spacy>=3.7.0
requests>=2.31.0
python-dotenv>=1.0.0
```

---

## Key Takeaways

1. **Start Free:** Use HubSpot AEO Grader + Gemini free tier
2. **Focus on Core Queries:** 5-15 queries is sufficient for a local farm
3. **Automate Early:** Even basic automation saves hours weekly
4. **Track Competitors:** Know who's winning the AI visibility battle
5. **Alert on Changes:** Lost mentions need immediate attention
6. **Iterate:** Refine queries based on what actually drives visibility

---

## Sources

### Commercial Tools
- [Otterly.AI](https://otterly.ai)
- [Peec AI](https://peec.ai)
- [Scrunch AI](https://scrunch.com)
- [Profound](https://www.tryprofound.com)
- [Ahrefs Brand Radar](https://ahrefs.com/brand-radar)
- [HubSpot AEO Grader](https://www.hubspot.com/aeo-grader)
- [AIclicks.io](https://aiclicks.io)

### API Documentation
- [OpenAI API Pricing](https://openai.com/api/pricing/)
- [OpenAI Web Search API](https://platform.openai.com/docs/guides/tools-web-search)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Perplexity API Docs](https://docs.perplexity.ai/docs/getting-started/pricing)
- [Anthropic Claude Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [SerpAPI AI Overview](https://serpapi.com/ai-overview)

### Research & Methodology
- [AEO Analytics KPIs - Avinash Kaushik](https://www.kaushik.net/avinash/aeo-answer-engine-analytics-reports-kpis-metrics/)
- [What is a Good AEO Visibility Score](https://semai.ai/blogs/what-is-a-good-aeo-visibility-score/)
- [From SEO to AEO Metrics](https://semai.ai/blogs/from-seo-metrics-to-aeo-metrics-what-actually-matters/)
- [DIY AI Visibility Tracking](https://www.amicited.com/blog/diy-ai-visibility-tracking/)

### Open Source
- [GitHub Brand Monitoring Topic](https://github.com/topics/brand-monitoring)
- [GEO Tools Awesome List](https://github.com/izak-fisher/generative-engine-optimization-tools)

### Technical Implementation
- [How to Schedule API Calls with Cron](https://blog.dreamfactory.com/how-to-schedule-api-calls)
- [APScheduler Documentation](https://betterstack.com/community/guides/scaling-python/apscheduler-scheduled-tasks/)
- [spaCy NER Documentation](https://spacy.io/)
- [API Rate Limiting Best Practices](https://www.gravitee.io/blog/rate-limiting-apis-scale-patterns-strategies)

---

*Document created: February 12, 2026*
*For: Tiny Seed Farm AEO Implementation*
