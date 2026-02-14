# AI Institutional Memory Research Report

## Farm Journal System - Memory Architecture Design

**Date:** 2026-02-13
**Purpose:** Research best practices for AI memory systems to inform Farm Journal architecture
**Context:** Building a Farm Journal system where AI needs to "remember" daily/weekly entries over time to generate better content across 3 brands (Farm, Fleurs, Fungi)

---

## Executive Summary

The PM's proposed hierarchical summarization architecture (daily raw entries -> weekly summaries -> monthly summaries -> yearly summaries) is **directionally correct** and aligns well with industry best practices. However, modern AI memory systems incorporate additional sophistication that can significantly improve the system's effectiveness within the constraints of Google Apps Script.

**Key Finding:** The proposed architecture mirrors the "tiered memory hierarchy" pattern used by MemGPT, LangChain, and emerging systems like Mem0. The main gaps are:
1. Missing **relevance-based retrieval** (not just time-based)
2. No **cross-brand knowledge sharing** mechanism
3. Unclear **context selection algorithm** for post generation
4. Missing **semantic compression** vs simple summarization

---

## Table of Contents

1. [Industry Memory Systems Analysis](#industry-memory-systems-analysis)
2. [Comparison: PM Proposal vs Industry Approaches](#comparison-pm-proposal-vs-industry-approaches)
3. [Recommended Architecture for Apps Script](#recommended-architecture-for-apps-script)
4. [Implementation Considerations](#implementation-considerations)
5. [Trigger Schedule Recommendations](#trigger-schedule-recommendations)
6. [Context Selection Algorithm](#context-selection-algorithm)
7. [Cross-Brand Memory Management](#cross-brand-memory-management)
8. [Research Sources](#research-sources)

---

## Industry Memory Systems Analysis

### 1. MemGPT (Letta) Architecture

[MemGPT](https://docs.letta.com/concepts/memgpt/) pioneered the concept of treating AI memory like an operating system manages memory:

**Core Concepts:**
- **Main Context (RAM):** Immediate access during inference - limited by context window
- **External Context (Disk):** Persistent storage beyond context limits
- **Virtual Context Management:** Paging between tiers based on relevance

**Memory Tiers:**
| Tier | Purpose | Persistence |
|------|---------|-------------|
| Core Memory | Agent persona + current user info | Session-persistent, self-editing |
| Archival Memory | Long-term knowledge base | Vector database (Chroma, pgvector) |
| Recall Memory | Conversation history | Searchable, summarizable |

**Key Innovation:** Self-editing memory - the agent can update its own persona and stored facts over time.

**Limitation:** All reasoning handled by single agent, consuming cognitive bandwidth. Unstructured data makes complex relational queries difficult.

### 2. LangChain Memory Systems

[LangChain](https://docs.langchain.com/oss/python/langgraph/memory) offers multiple memory patterns:

**Memory Types:**
| Type | Best For | Token Efficiency |
|------|----------|------------------|
| ConversationBufferMemory | Short sessions, full context needed | Low (stores everything) |
| ConversationSummaryMemory | Long conversations | High (compresses to summaries) |
| ConversationBufferWindowMemory | Recent context focus | Medium (sliding window) |
| VectorStoreRetrieverMemory | Large knowledge bases | High (semantic retrieval) |

**2025 Best Practice - Hybrid Architecture:**
Combine short-term memory (immediate context) with long-term memory (vector DB retrieval) for optimal performance, storage, and cost.

**Modern Implementation:**
- Use `RunnableWithMessageHistory` for LCEL integration
- Session management for concurrent conversations
- Automatic history with no manual management

### 3. Hierarchical Summarization Research

Recent research (2025-2026) on hierarchical AI memory:

**H2Memory System (Huang et al., November 2025):**
Stores four components:
- **Situation:** Event logs (raw data)
- **Background:** Recursively abstracted summaries
- **Topic-outlines:** User requirements, solutions, preferences
- **Principle memories:** Typed clusters of preferences/principles

**Key Insight:** Hierarchical summarization compresses older conversation segments while preserving essential information. Rather than discarding old context entirely, systems generate progressively more compact summaries as information ages.

**Google Titans + MIRAS Framework:**
Uses long-term memory to compress past data, then incorporates the summary into context. Attention can decide whether to attend to the summary of the past or not - key for selective recall.

### 4. Mem0 Production Architecture

[Mem0](https://arxiv.org/abs/2504.19413) (April 2025) addresses production scalability:

**Core Innovation:**
- Dynamically extracts, consolidates, and retrieves salient information
- Graph-based memory (Mem0g) captures complex relational structures
- Automatic consolidation prevents memory bloat

**Performance:**
- State-of-the-art on single-hop and multi-hop reasoning
- Graph extensions unlock gains in temporal and open-domain tasks

### 5. Memory Decay and Consolidation

[Research on memory management](https://redis.io/blog/build-smarter-ai-agents-manage-short-term-and-long-term-memory-with-redis/):

**Episodic vs Semantic Memory:**
- **Episodic:** Specific events (decay faster)
- **Semantic:** Facts and knowledge (decay slower)

**Consolidation Process:**
Transform raw experiences (episodic) into generalized knowledge (semantic). For AI agents: take detailed logs and convert to patterns, rules, and insights.

**Decay Mechanisms:**
- Time-based decay (age score)
- Access frequency weighting
- Importance/utility scoring
- Graduated decay rates by knowledge type

### 6. Context Selection Algorithms

[Advanced retrieval research](https://weaviate.io/blog/context-engineering):

**Weighted Scoring Formula:**
```
Score = (Relevance * 0.6) + (Recency * 0.25) + (Importance * 0.15)
```

Where:
- **Relevance:** Cosine similarity between query and memory embeddings
- **Recency:** Time decay factor (more recent = higher score)
- **Importance:** Explicit flags or usage frequency

**Selection Strategy:**
Not just "what's similar" but "what's relevant, recent, and actionable."

---

## Comparison: PM Proposal vs Industry Approaches

### PM's Proposed Architecture

```
Raw Daily Entries
    |
    v
Weekly Summaries (every Sunday)
    |
    v
Monthly Summaries (1st of month)
    |
    v
Yearly Summaries (Jan 1)

Context Selection: Recent posts use raw, historical use compressed
```

### Comparison Table

| Aspect | PM Proposal | MemGPT | LangChain | Mem0 | Best Practice |
|--------|------------|--------|-----------|------|---------------|
| **Hierarchical Compression** | Yes (4 levels) | Yes (2-3 tiers) | Yes (optional) | Yes (dynamic) | Yes - essential |
| **Time-Based Triggers** | Fixed schedule | On-demand | Configurable | Dynamic | Hybrid: scheduled + event-driven |
| **Semantic Retrieval** | Not specified | Vector DB | Vector DB | Graph + Vector | Critical for quality |
| **Cross-Context Sharing** | Not addressed | Single agent | Namespace-based | Graph relations | Needed for multi-brand |
| **Self-Updating Memory** | Not specified | Yes | No | Yes | Recommended |
| **Decay Mechanism** | Implicit (compression) | Explicit | Configurable | Automatic | Should be explicit |
| **Context Selection** | Time-based | Relevance + Recency | Configurable | Multi-factor | Multi-factor scoring |
| **Storage** | Google Sheets | Vector DB | Various | Graph + Vector | Sheets + computed summaries |

### Gap Analysis

| Gap | Impact | Recommended Solution |
|-----|--------|---------------------|
| **No semantic retrieval** | AI may miss relevant old content | Add keyword + theme tagging to entries |
| **No cross-brand context** | Miss synergies (e.g., tomatoes + flowers + mushrooms at same event) | Shared "farm events" layer |
| **Fixed schedule only** | Important events not captured immediately | Add event-based triggers |
| **No relevance scoring** | Context may be stale or irrelevant | Implement multi-factor selection |
| **No topic/theme extraction** | Summaries lose important patterns | Add theme clustering before summarization |

### What PM Got Right

1. **Hierarchical structure** - Matches industry standard
2. **Time-based compression** - Proven pattern
3. **Multiple granularity levels** - 4 levels is appropriate for a farm year
4. **Raw entries for recent** - Preserves detail when needed
5. **Compressed for historical** - Efficient context use

---

## Recommended Architecture for Apps Script

Given Google Apps Script constraints (6 min execution, 20k URL fetches/day, no persistent processes), here is the recommended architecture:

### Data Model (Google Sheets)

```
FARM_JOURNAL_RAW
| ID | Date | Brand | Entry_Type | Content | Weather | Crops_Mentioned | Themes | Sentiment |

FARM_JOURNAL_WEEKLY
| Week_Start | Brand | Summary | Key_Events | Themes | Crops_Active | Sentiment_Trend |

FARM_JOURNAL_MONTHLY
| Month | Brand | Summary | Themes | Metrics | Highlights | Lowlights |

FARM_JOURNAL_YEARLY
| Year | Brand | Summary | Annual_Themes | Key_Learnings | Metrics_YoY |

FARM_JOURNAL_CROSS_BRAND
| Date | Event_Type | Brands_Involved | Summary | Impact |

FARM_JOURNAL_THEMES
| Theme | Brand | First_Seen | Last_Seen | Frequency | Related_Themes |
```

### Architecture Diagram

```
                    +------------------+
                    |   Entry Input    |
                    | (Web Form / SMS) |
                    +--------+---------+
                             |
                             v
                    +------------------+
                    |  Raw Entry Log   |
                    | (FARM_JOURNAL_RAW)|
                    +--------+---------+
                             |
            +----------------+----------------+
            |                |                |
            v                v                v
      +----------+    +----------+    +----------+
      |   Farm   |    |  Fleurs  |    |  Fungi   |
      |  Memory  |    |  Memory  |    |  Memory  |
      +----+-----+    +----+-----+    +----+-----+
            |                |                |
            +----------------+----------------+
                             |
                             v
                    +------------------+
                    |  Cross-Brand     |
                    |  Event Layer     |
                    +--------+---------+
                             |
        +--------------------+--------------------+
        |                    |                    |
        v                    v                    v
  +-----------+       +-----------+       +-----------+
  |  Weekly   |       |  Monthly  |       |  Yearly   |
  | Summaries |  -->  | Summaries |  -->  | Summaries |
  +-----------+       +-----------+       +-----------+
        |                    |                    |
        +--------------------+--------------------+
                             |
                             v
                    +------------------+
                    | Context Selector |
                    | (Multi-Factor)   |
                    +--------+---------+
                             |
                             v
                    +------------------+
                    |  Content Gen AI  |
                    +------------------+
```

### Key Components

#### 1. Entry Processing Pipeline
```javascript
function processJournalEntry(entry) {
  // Extract metadata at ingestion time
  const processed = {
    ...entry,
    crops_mentioned: extractCrops(entry.content),
    themes: extractThemes(entry.content),
    sentiment: analyzeSentiment(entry.content),
    weather_context: getWeatherForDate(entry.date),
    brand: determineBrand(entry) // Farm, Fleurs, or Fungi
  };

  // Store raw entry
  saveToRawLog(processed);

  // Check for cross-brand events
  checkCrossBrandRelevance(processed);

  return processed;
}
```

#### 2. Theme Extraction (Lightweight)
```javascript
// Pre-defined theme patterns for each brand
const THEME_PATTERNS = {
  Farm: {
    planting: /plant|seed|sow|transplant/i,
    harvest: /harvest|pick|gather|yield/i,
    pest: /pest|bug|disease|blight/i,
    weather: /rain|sun|frost|heat|drought/i,
    soil: /soil|compost|amendment|fertility/i,
    market: /market|sell|customer|CSA/i
  },
  Fleurs: {
    bloom: /bloom|flower|petal|bud/i,
    arrangement: /bouquet|arrangement|design/i,
    wedding: /wedding|event|bride/i,
    seasonal: /spring|summer|fall|winter/i
  },
  Fungi: {
    fruiting: /fruit|pin|flush/i,
    substrate: /substrate|spawn|inoculate/i,
    humidity: /humid|mist|moisture/i,
    harvest: /harvest|pick|yield/i
  }
};
```

#### 3. Context Selector Algorithm
```javascript
function selectContext(contentRequest) {
  const { targetDate, brand, postType, topics } = contentRequest;

  // Determine lookback period based on post type
  const lookback = POST_TYPE_LOOKBACK[postType];

  // Calculate context mix
  const contextBudget = 4000; // tokens
  let selectedContext = [];
  let tokensUsed = 0;

  // 1. Always include current week's raw entries (highest relevance)
  const currentWeekRaw = getRawEntries(targetDate, 7, brand);
  selectedContext.push(...currentWeekRaw);
  tokensUsed += estimateTokens(currentWeekRaw);

  // 2. Add relevant past entries based on themes
  if (topics && topics.length > 0) {
    const themeRelevant = getEntriesByThemes(topics, brand, 30);
    const scored = scoreByRelevance(themeRelevant, topics, targetDate);
    selectedContext.push(...selectTopN(scored, contextBudget - tokensUsed));
  }

  // 3. Add compressed summaries for long-term patterns
  if (lookback.includeMonthly) {
    selectedContext.push(getMonthSummary(targetDate, brand));
  }
  if (lookback.includeYearly) {
    selectedContext.push(getYearSummary(brand));
  }

  // 4. Add cross-brand context if relevant
  if (shouldIncludeCrossBrand(postType)) {
    selectedContext.push(getCrossBrandEvents(targetDate, 30));
  }

  return selectedContext;
}
```

---

## Implementation Considerations

### Google Apps Script Constraints

| Constraint | Impact | Mitigation |
|-----------|--------|------------|
| 6 min execution limit | Large summarization may timeout | Batch processing, incremental summaries |
| 20k URL fetches/day | Limited AI API calls | Cache summaries, batch entries |
| No persistent memory | No in-memory caching | Use ScriptProperties for small cache |
| 30 triggers max | Limited automation | Consolidate trigger functions |
| 50MB Script Properties | Limited local storage | Primary storage in Sheets |

### Recommended Implementation Stack

```
Storage:         Google Sheets (primary data)
                 Script Properties (config + small cache)

Processing:      Apps Script (triggers + orchestration)
                 Gemini API (summarization + theme extraction)

Frontend:        HTML Service (entry forms)
                 Web app (dashboard)

Triggers:        Time-based (scheduled)
                 Edit-based (new entries)
```

### Memory Budget Strategy

Given Claude/Gemini context limits (~100k-200k tokens), allocate as follows for content generation:

| Content Type | Raw Entries | Weekly Summaries | Monthly | Yearly | Cross-Brand |
|--------------|-------------|------------------|---------|--------|-------------|
| Daily social post | 70% (7 days) | 20% (4 weeks) | 10% | - | - |
| Weekly newsletter | 40% (7 days) | 40% (8 weeks) | 20% | - | 5% |
| Monthly recap | 20% (raw highlights) | 60% | 20% | - | 10% |
| Seasonal planning | 10% | 20% | 50% | 20% | 15% |
| Annual review | - | 10% | 40% | 50% | 20% |

---

## Trigger Schedule Recommendations

### Recommended Trigger Configuration

```javascript
// TRIGGER SCHEDULE
const TRIGGER_CONFIG = {
  // Process new entries within 15 minutes
  entryProcessing: {
    type: 'time-driven',
    frequency: 'every 15 minutes',
    function: 'processNewEntries',
    description: 'Extract themes, crops, sentiment from new entries'
  },

  // Weekly summarization - Sunday evening
  weeklySummary: {
    type: 'time-driven',
    frequency: 'weekly',
    dayOfWeek: 'SUNDAY',
    hour: 20, // 8 PM
    function: 'generateWeeklySummaries',
    description: 'Summarize each brand week'
  },

  // Monthly summarization - 1st at midnight
  monthlySummary: {
    type: 'time-driven',
    frequency: 'monthly',
    dayOfMonth: 1,
    hour: 0,
    function: 'generateMonthlySummaries',
    description: 'Summarize each brand month'
  },

  // Yearly summarization - Jan 2nd (after final Dec entries)
  yearlySummary: {
    type: 'time-driven',
    frequency: 'yearly',
    month: 'JANUARY',
    dayOfMonth: 2,
    hour: 0,
    function: 'generateYearlySummaries',
    description: 'Annual brand summaries'
  },

  // Cross-brand event detection - daily
  crossBrandSync: {
    type: 'time-driven',
    frequency: 'daily',
    hour: 23, // 11 PM
    function: 'detectCrossBrandEvents',
    description: 'Find multi-brand connections'
  },

  // Theme decay/consolidation - weekly
  themeConsolidation: {
    type: 'time-driven',
    frequency: 'weekly',
    dayOfWeek: 'MONDAY',
    hour: 3, // 3 AM
    function: 'consolidateThemes',
    description: 'Merge similar themes, decay old ones'
  }
};
```

### Trigger Setup Code

```javascript
function setupJournalTriggers() {
  // Clear existing
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction().startsWith('journal_') ||
        t.getHandlerFunction().startsWith('memory_')) {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Entry processing (every 15 min)
  ScriptApp.newTrigger('journal_processNewEntries')
    .timeBased()
    .everyMinutes(15)
    .create();

  // Weekly summary (Sunday 8 PM)
  ScriptApp.newTrigger('memory_generateWeeklySummaries')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(20)
    .create();

  // Monthly summary (1st at midnight)
  ScriptApp.newTrigger('memory_generateMonthlySummaries')
    .timeBased()
    .onMonthDay(1)
    .atHour(0)
    .create();

  // Cross-brand (daily 11 PM)
  ScriptApp.newTrigger('memory_detectCrossBrandEvents')
    .timeBased()
    .everyDays(1)
    .atHour(23)
    .create();
}
```

### Event-Driven Triggers (Supplement)

In addition to scheduled triggers, add edit-based triggers for important events:

```javascript
function onJournalEntryAdded(e) {
  const entry = e.value;

  // Immediate theme extraction
  extractAndStoreThemes(entry);

  // Check for urgent cross-brand relevance
  if (isUrgentCrossBrand(entry)) {
    flagForCrossBrandReview(entry);
  }

  // Check for exceptional content (good photo ops, etc.)
  if (containsExceptionalContent(entry)) {
    queueForContentGeneration(entry);
  }
}
```

---

## Context Selection Algorithm

### Post Type Configuration

```javascript
const POST_TYPE_CONFIG = {
  'daily_social': {
    lookbackDays: 7,
    includeWeeklySummaries: 2,
    includeMonthlySummary: false,
    includeYearlySummary: false,
    crossBrandWeight: 0.1,
    maxContextTokens: 2000
  },

  'weekly_newsletter': {
    lookbackDays: 14,
    includeWeeklySummaries: 4,
    includeMonthlySummary: true,
    includeYearlySummary: false,
    crossBrandWeight: 0.2,
    maxContextTokens: 4000
  },

  'monthly_recap': {
    lookbackDays: 7, // Just highlights
    includeWeeklySummaries: 4,
    includeMonthlySummary: true,
    includeYearlySummary: false,
    crossBrandWeight: 0.25,
    maxContextTokens: 6000
  },

  'seasonal_planning': {
    lookbackDays: 0,
    includeWeeklySummaries: 8,
    includeMonthlySummary: true,
    includeYearlySummary: true,
    crossBrandWeight: 0.3,
    maxContextTokens: 8000
  },

  'blog_post': {
    lookbackDays: 30,
    includeWeeklySummaries: 8,
    includeMonthlySummary: true,
    includeYearlySummary: false,
    crossBrandWeight: 0.15,
    maxContextTokens: 6000,
    themeRelevanceWeight: 0.6 // Higher weight on theme matching
  }
};
```

### Multi-Factor Scoring Algorithm

```javascript
function scoreMemoryEntry(entry, request) {
  const {
    relevanceWeight = 0.5,
    recencyWeight = 0.3,
    importanceWeight = 0.2
  } = request.weights || {};

  // 1. Relevance Score (semantic similarity)
  const relevanceScore = calculateRelevance(entry, request.topics);

  // 2. Recency Score (time decay)
  const daysSinceEntry = daysBetween(entry.date, request.targetDate);
  const recencyScore = Math.exp(-daysSinceEntry / 30); // 30-day half-life

  // 3. Importance Score (explicit flags + usage)
  const importanceScore = calculateImportance(entry);

  // Combined score
  const finalScore =
    (relevanceScore * relevanceWeight) +
    (recencyScore * recencyWeight) +
    (importanceScore * importanceWeight);

  return {
    entry,
    scores: { relevance: relevanceScore, recency: recencyScore, importance: importanceScore },
    finalScore
  };
}

function calculateRelevance(entry, topics) {
  if (!topics || topics.length === 0) return 0.5; // Neutral if no topics specified

  const entryThemes = entry.themes || [];
  const overlap = topics.filter(t => entryThemes.includes(t)).length;

  return overlap / Math.max(topics.length, 1);
}

function calculateImportance(entry) {
  let score = 0.5; // Base score

  // Boost for explicit importance flags
  if (entry.important) score += 0.3;

  // Boost for high engagement indicators
  if (entry.hasPhoto) score += 0.1;
  if (entry.sentiment === 'exceptional') score += 0.1;

  // Boost for milestone events
  if (entry.isMilestone) score += 0.2;

  return Math.min(score, 1.0);
}
```

### Context Assembly

```javascript
function assembleContext(request) {
  const config = POST_TYPE_CONFIG[request.postType];
  const context = {
    raw: [],
    summaries: [],
    crossBrand: [],
    metadata: {}
  };

  let tokensRemaining = config.maxContextTokens;

  // Priority 1: Current period raw entries
  const currentRaw = getRawEntries({
    brand: request.brand,
    startDate: subtractDays(request.targetDate, config.lookbackDays),
    endDate: request.targetDate
  });

  const scoredRaw = currentRaw.map(e => scoreMemoryEntry(e, request));
  scoredRaw.sort((a, b) => b.finalScore - a.finalScore);

  for (const scored of scoredRaw) {
    const tokens = estimateTokens(scored.entry);
    if (tokensRemaining - tokens >= config.maxContextTokens * 0.3) {
      context.raw.push(scored);
      tokensRemaining -= tokens;
    }
  }

  // Priority 2: Weekly summaries
  if (config.includeWeeklySummaries > 0) {
    const weeklies = getWeeklySummaries(request.brand, config.includeWeeklySummaries);
    for (const weekly of weeklies) {
      const tokens = estimateTokens(weekly);
      if (tokensRemaining - tokens >= config.maxContextTokens * 0.2) {
        context.summaries.push(weekly);
        tokensRemaining -= tokens;
      }
    }
  }

  // Priority 3: Monthly/Yearly summaries
  if (config.includeMonthlySummary) {
    const monthly = getMonthlySummary(request.brand, request.targetDate);
    if (monthly) {
      context.summaries.push(monthly);
      tokensRemaining -= estimateTokens(monthly);
    }
  }

  if (config.includeYearlySummary) {
    const yearly = getYearlySummary(request.brand);
    if (yearly) {
      context.summaries.push(yearly);
      tokensRemaining -= estimateTokens(yearly);
    }
  }

  // Priority 4: Cross-brand context
  if (config.crossBrandWeight > 0) {
    const crossBrand = getCrossBrandEvents(request.targetDate, 30);
    const crossBrandBudget = config.maxContextTokens * config.crossBrandWeight;

    for (const event of crossBrand) {
      const tokens = estimateTokens(event);
      if (tokens <= Math.min(tokensRemaining, crossBrandBudget)) {
        context.crossBrand.push(event);
        tokensRemaining -= tokens;
      }
    }
  }

  context.metadata = {
    totalTokens: config.maxContextTokens - tokensRemaining,
    entryCount: context.raw.length,
    summaryCount: context.summaries.length,
    crossBrandCount: context.crossBrand.length
  };

  return context;
}
```

---

## Cross-Brand Memory Management

### Cross-Brand Event Detection

Events that span multiple brands create opportunities for unified storytelling.

```javascript
const CROSS_BRAND_PATTERNS = {
  // Events that naturally span brands
  sharedEvents: [
    { pattern: /farmer.*market/i, brands: ['Farm', 'Fleurs', 'Fungi'] },
    { pattern: /CSA.*delivery/i, brands: ['Farm', 'Fleurs', 'Fungi'] },
    { pattern: /wedding|event/i, brands: ['Fleurs', 'Farm'] },
    { pattern: /restaurant|chef/i, brands: ['Farm', 'Fungi'] }
  ],

  // Seasonal connections
  seasonalConnections: {
    spring: {
      Farm: ['planting', 'greenhouse', 'seedlings'],
      Fleurs: ['tulips', 'daffodils', 'peonies'],
      Fungi: ['spring flush', 'substrate prep']
    },
    summer: {
      Farm: ['tomatoes', 'peppers', 'peak harvest'],
      Fleurs: ['dahlias', 'sunflowers', 'zinnias'],
      Fungi: ['humidity challenges', 'cooling']
    },
    fall: {
      Farm: ['squash', 'root vegetables', 'storage'],
      Fleurs: ['mums', 'dried flowers', 'fall colors'],
      Fungi: ['peak season', 'shiitake logs']
    },
    winter: {
      Farm: ['planning', 'ordering seeds', 'cover crops'],
      Fleurs: ['forced bulbs', 'evergreens', 'dried'],
      Fungi: ['indoor cultivation', 'substrate prep']
    }
  }
};

function detectCrossBrandEvents() {
  const recentEntries = getAllBrandsRecentEntries(7); // Last 7 days
  const crossBrandEvents = [];

  // Group entries by date
  const entriesByDate = groupBy(recentEntries, 'date');

  for (const [date, entries] of Object.entries(entriesByDate)) {
    // Check if multiple brands have entries on same date
    const brandsActive = new Set(entries.map(e => e.brand));

    if (brandsActive.size > 1) {
      // Look for shared themes
      const allThemes = entries.flatMap(e => e.themes || []);
      const sharedThemes = findCommonThemes(allThemes);

      if (sharedThemes.length > 0) {
        crossBrandEvents.push({
          date,
          brands: Array.from(brandsActive),
          themes: sharedThemes,
          entries: entries.map(e => e.id),
          summary: generateCrossBrandSummary(entries)
        });
      }
    }

    // Check for pattern-based cross-brand events
    for (const entry of entries) {
      for (const rule of CROSS_BRAND_PATTERNS.sharedEvents) {
        if (rule.pattern.test(entry.content)) {
          crossBrandEvents.push({
            date,
            brands: rule.brands,
            eventType: 'shared_event',
            triggerEntry: entry.id,
            summary: `${rule.brands.join(' + ')} connection detected`
          });
        }
      }
    }
  }

  // Save cross-brand events
  saveCrossBrandEvents(crossBrandEvents);

  return crossBrandEvents;
}
```

### Cross-Brand Context Integration

```javascript
function generateCrossBrandContext(request) {
  // Get cross-brand events relevant to the request
  const events = getCrossBrandEvents({
    startDate: subtractDays(request.targetDate, 30),
    endDate: request.targetDate,
    includeBrand: request.brand
  });

  // Filter by relevance to current topics
  const relevant = events.filter(e => {
    if (!request.topics) return true;
    return e.themes.some(t => request.topics.includes(t));
  });

  // Format for context injection
  return relevant.map(e => ({
    type: 'cross_brand',
    date: e.date,
    summary: `[${e.brands.join(' + ')}] ${e.summary}`,
    relevance: calculateCrossBrandRelevance(e, request)
  }));
}
```

### Unified Storytelling Opportunities

The cross-brand layer enables:

1. **Market Day Stories:** "While the Farm stand was busy with tomatoes, Fleurs arranged the dahlia bouquets and Fungi restocked the shiitakes..."

2. **Seasonal Narratives:** "Spring awakening across the farm - seedlings in the greenhouse, tulip shoots emerging, and fresh substrate prepared for new mushroom blocks..."

3. **CSA Integration:** "This week's CSA boxes feature Farm's lettuce, Fleurs' wildflower bunches, and Fungi's oyster mushrooms..."

---

## Research Sources

### Academic and Technical Papers

- [MemGPT: Towards LLMs as Operating Systems](https://arxiv.org/abs/2310.08560) - Original MemGPT paper
- [Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory](https://arxiv.org/abs/2504.19413) - Production memory architecture
- [A-Mem: Agentic Memory for LLM Agents](https://arxiv.org/pdf/2502.12110) - 85-93% token reduction vs MemGPT
- [Memory in the Age of AI Agents: A Survey](https://arxiv.org/abs/2512.13564) - Comprehensive taxonomy

### Framework Documentation

- [LangChain Memory Overview](https://docs.langchain.com/oss/python/langgraph/memory)
- [Letta (MemGPT) Documentation](https://docs.letta.com/concepts/memgpt/)
- [Pinecone - Conversational Memory with LangChain](https://www.pinecone.io/learn/series/langchain/langchain-conversational-memory/)

### Implementation Guides

- [Design Patterns for Long-Term Memory in LLM Architectures](https://serokell.io/blog/design-patterns-for-long-term-memory-in-llm-powered-architectures)
- [Context Engineering for AI Agents](https://mem0.ai/blog/context-engineering-ai-agents-guide)
- [How to Build AI Agents with Redis Memory](https://redis.io/blog/build-smarter-ai-agents-manage-short-term-and-long-term-memory-with-redis/)
- [Memory Systems in AI Agents: Episodic vs. Semantic](https://ctoi.substack.com/p/memory-systems-in-ai-agents-episodic)

### Google Apps Script Resources

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Google AI Studio + Apps Script Integration](https://drlee.io/step-by-step-guide-to-integrating-ai-with-google-workspace-using-google-ai-studio-apps-script-4e44b20d0dff)

---

## Conclusion and Recommendations

### Summary

The PM's proposed architecture is **sound and aligns with industry best practices**. The hierarchical summarization approach (daily -> weekly -> monthly -> yearly) mirrors patterns used by MemGPT, LangChain, and production systems like Mem0.

### Key Enhancements to Add

1. **Theme/topic extraction** at entry time (enables relevance-based retrieval)
2. **Multi-factor context selection** (relevance + recency + importance, not just time)
3. **Cross-brand event layer** (captures synergies across Farm, Fleurs, Fungi)
4. **Event-driven triggers** (supplement scheduled triggers for important events)
5. **Graduated decay** (episodic memories compress faster than semantic patterns)

### Implementation Priority

| Priority | Component | Effort | Impact |
|----------|-----------|--------|--------|
| 1 | Basic hierarchical structure (PM proposal) | Medium | High |
| 2 | Theme extraction at entry | Low | High |
| 3 | Context selection algorithm | Medium | High |
| 4 | Cross-brand event detection | Medium | Medium |
| 5 | Importance/milestone flags | Low | Medium |
| 6 | Advanced decay mechanisms | High | Low |

### Next Steps

1. Create Google Sheets structure for all memory tiers
2. Implement entry processing function with theme extraction
3. Set up trigger schedule as documented
4. Build context selection function for content generation
5. Add cross-brand detection (can be Phase 2)

---

*Research compiled by Research Agent | 2026-02-13*
