# THE ULTIMATE AI MEMORY ARCHITECTURE
## Tiny Seed Farm Journal: Institutional Memory System for 10+ Years

**Version:** 1.0.0
**Status:** PRODUCTION BLUEPRINT
**Date:** 2026-02-13
**Architect:** Claude Opus 4.5

---

## EXECUTIVE SUMMARY

This document defines a world-class institutional memory system for Tiny Seed Farm, designed to serve three brands (Farm, Fleurs, Fungi) for 10+ years with zero data loss and maximum AI intelligence. The architecture combines the best elements from:

- **MemGPT/Letta** - Self-editing memory with virtual context management
- **Mem0** - Graph-based memory with relational structures
- **Zep/Graphiti** - Temporal knowledge graphs with bitemporal modeling
- **RAG Best Practices** - Hybrid retrieval with semantic and structured search
- **Agricultural AI** - Domain-specific temporal reasoning for farming

**The core insight:** This is not just a database. It is a **memory operating system** that mimics human cognition - with episodic memory (specific events), semantic memory (general knowledge), working memory (active context), and procedural memory (learned skills/patterns).

---

## PART 1: THEORETICAL FOUNDATION

### 1.1 Memory Taxonomy (Based on 2025-2026 Research)

Drawing from the survey "Memory in the Age of AI Agents" and the ICLR 2026 Workshop on MemAgents:

| Memory Type | Description | Farm Example |
|-------------|-------------|--------------|
| **Factual Memory** | Static knowledge, facts, entities | "Dahlias need 120 days to bloom" |
| **Experiential Memory** | Insights from past events, skills learned | "We learned 2025: direct-sow sunflowers beat transplants" |
| **Working Memory** | Active context for current task | "Today's harvest list: tomatoes, peppers, basil" |
| **Episodic Memory** | Specific events with time/place/actors | "June 15, 2025: First dahlia harvest of season, 50 stems" |
| **Semantic Memory** | Generalized patterns extracted from episodes | "Dahlias typically ready first week of June" |
| **Procedural Memory** | How-to knowledge, workflows, routines | "Morning harvest procedure: check cooler temp, grab bins..." |

### 1.2 Memory Dynamics

From Mem0 and Zep research, memory is not static - it evolves:

1. **Formation** - Extracting memories from raw events/conversations
2. **Consolidation** - Transforming episodic to semantic over time
3. **Decay** - Reducing relevance of old, unused memories
4. **Retrieval** - Finding relevant memories for current context
5. **Correction** - Updating memories when errors are detected

### 1.3 The Bitemporal Model (From Zep/Graphiti)

Every memory has TWO timestamps:
- **Event Time (T)** - When the fact/event ACTUALLY occurred
- **Ingestion Time (T')** - When the system LEARNED about it

This enables:
- "What did we KNOW on March 1, 2025?" (ingestion time query)
- "What HAPPENED in March 2025?" (event time query)
- Retroactive corrections without losing history
- Full audit trail of knowledge evolution

---

## PART 2: DATA MODEL

### 2.1 Core Sheets Architecture

The system requires **14 Google Sheets** organized in a hub-and-spoke pattern:

```
                         ┌─────────────────────┐
                         │   AI_MEMORY_INDEX   │
                         │   (Master Index)    │
                         └──────────┬──────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  EPISODIC       │       │  SEMANTIC       │       │  ENTITIES       │
│  MEMORY         │       │  MEMORY         │       │  (Knowledge     │
│  (Events)       │       │  (Patterns)     │       │   Graph Nodes)  │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                          │
         │                         │                          │
         ▼                         ▼                          ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  ENTITY         │       │  MEMORY         │       │  TEMPORAL       │
│  RELATIONSHIPS  │       │  EMBEDDINGS     │       │  EVENTS         │
│  (Graph Edges)  │       │  (Vectors)      │       │  (Timeline)     │
└─────────────────┘       └─────────────────┘       └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BRAND-SPECIFIC SHEETS                         │
├─────────────────┬─────────────────┬─────────────────────────────────┤
│  FARM_MEMORY    │  FLEURS_MEMORY  │  FUNGI_MEMORY                   │
│  (Vegetables)   │  (Flowers)      │  (Mushrooms)                    │
└─────────────────┴─────────────────┴─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SUPPORTING SHEETS                             │
├─────────────────┬─────────────────┬─────────────────┬───────────────┤
│  CORRECTIONS    │  MEMORY_STATS   │  CONSOLIDATION  │ WORKING_MEM   │
│  (Error Fixes)  │  (Metrics)      │  _LOG           │ (Session)     │
└─────────────────┴─────────────────┴─────────────────┴───────────────┘
```

### 2.2 Sheet Schemas

#### 2.2.1 AI_MEMORY_INDEX (Master Index)

The central registry of all memories with importance scores.

| Column | Type | Description |
|--------|------|-------------|
| Memory_ID | String | UUID: `MEM_YYYYMMDD_HHMMSS_XXX` |
| Memory_Type | Enum | EPISODIC, SEMANTIC, PROCEDURAL, FACTUAL |
| Brand | Enum | FARM, FLEURS, FUNGI, CROSS_BRAND |
| Event_Time | DateTime | When the event/fact occurred (T) |
| Ingestion_Time | DateTime | When system learned it (T') |
| Last_Accessed | DateTime | Last retrieval time |
| Access_Count | Integer | Times retrieved |
| Importance_Score | Float (0-1) | AI-assigned importance |
| Decay_Rate | Float | Daily decay multiplier |
| Current_Relevance | Float (0-1) | Importance * decay over time |
| Summary | String | 1-sentence summary |
| Full_Content_Ref | String | Reference to detailed sheet |
| Embedding_ID | String | Reference to vector embedding |
| Tags | String[] | Entity tags for filtering |
| Source | Enum | JOURNAL, OBSERVATION, INFERENCE, CORRECTION |
| Confidence | Float (0-1) | Certainty level |
| Superseded_By | String | Memory_ID if corrected |
| Is_Active | Boolean | False if superseded |
| Cross_Brand_Relevant | Boolean | Applies to multiple brands |

#### 2.2.2 EPISODIC_MEMORY (Specific Events)

| Column | Type | Description |
|--------|------|-------------|
| Episode_ID | String | `EP_YYYYMMDD_XXX` |
| Memory_ID | String | FK to AI_MEMORY_INDEX |
| Date | Date | Event date |
| Time | Time | Event time (if known) |
| Location | String | Where: field, greenhouse, market, etc. |
| Actor | String | Who: Owner, employee, weather, pest |
| Action | String | What happened |
| Object | String | What was affected |
| Outcome | Enum | SUCCESS, FAILURE, PARTIAL, NEUTRAL |
| Quantity | Float | Numeric value if applicable |
| Unit | String | lbs, stems, trays, hours, etc. |
| Weather_Conditions | String | Weather at time |
| Temperature | Float | Temp at time |
| Full_Description | Text | Complete narrative |
| Lessons_Learned | Text | What we took away |
| Related_Episodes | String[] | Links to related events |
| Photos_Drive_IDs | String[] | Google Drive photo refs |
| Season | Enum | SPRING, SUMMER, FALL, WINTER |
| Week_Number | Integer | ISO week number |
| Growth_Stage | String | Seedling, Vegetative, Flowering, Harvest |
| Crop_IDs | String[] | FK to crops involved |
| Customer_IDs | String[] | FK to customers involved |

#### 2.2.3 SEMANTIC_MEMORY (Patterns & Knowledge)

| Column | Type | Description |
|--------|------|-------------|
| Semantic_ID | String | `SEM_XXX` |
| Memory_ID | String | FK to AI_MEMORY_INDEX |
| Knowledge_Type | Enum | PATTERN, RULE, FACT, PREFERENCE, PROCEDURE |
| Subject | String | What this is about |
| Predicate | String | Relationship type |
| Object | String | The value/target |
| Confidence | Float (0-1) | How certain |
| Evidence_Count | Integer | How many episodes support this |
| Source_Episodes | String[] | Episode_IDs that formed this |
| First_Observed | Date | When first noticed |
| Last_Confirmed | Date | When last validated |
| Contradiction_Count | Integer | Times contradicted |
| Version | Integer | How many times updated |
| Temporal_Qualifier | String | "usually", "in summer", "on Tuesdays" |
| Condition | Text | When this applies |
| Natural_Language | Text | Human-readable statement |
| Structured_Form | JSON | Machine-parseable format |

#### 2.2.4 ENTITIES (Knowledge Graph Nodes)

| Column | Type | Description |
|--------|------|-------------|
| Entity_ID | String | `ENT_TYPE_XXX` |
| Entity_Type | Enum | See Entity Types below |
| Name | String | Primary name |
| Aliases | String[] | Alternative names |
| Brand_Affinity | Enum[] | FARM, FLEURS, FUNGI |
| Created_Date | Date | When added |
| Last_Modified | Date | When updated |
| Properties | JSON | Type-specific attributes |
| Embedding_ID | String | FK to embeddings |
| Is_Active | Boolean | Still relevant |
| Notes | Text | Additional context |

**Entity Types:**

| Type | Examples | Key Properties |
|------|----------|----------------|
| CROP | Tomato, Dahlia, Oyster Mushroom | family, days_to_maturity, spacing |
| VARIETY | Cherokee Purple, Cafe au Lait | parent_crop, source, year_introduced |
| FIELD | North Field, Greenhouse 1 | area_sqft, soil_type, irrigation |
| BED | N-01, GH1-A01 | field, length_ft, orientation |
| CUSTOMER | Mayfly Market, Chef John | type, delivery_day, preferences |
| MARKET | Lawrenceville, Sewickley | day_of_week, season, booth_fee |
| EMPLOYEE | Sarah, Marcus | role, start_date, skills |
| SUPPLIER | Johnny's Seeds, Stuewe | category, account_number |
| PEST | Aphid, Slugs, Early Blight | crop_targets, season, treatments |
| TREATMENT | Neem Oil, Beneficial Insects | target_pests, phi_days, organic |
| EQUIPMENT | Paperpot, BCS Tractor | maintenance_schedule, location |
| WEATHER_PATTERN | Late Spring Frost, Dry July | frequency, impact, mitigation |
| EVENT_TYPE | First Frost, Market Opening | typical_date, triggers |

#### 2.2.5 ENTITY_RELATIONSHIPS (Knowledge Graph Edges)

| Column | Type | Description |
|--------|------|-------------|
| Relationship_ID | String | `REL_XXX` |
| Source_Entity_ID | String | FK to ENTITIES |
| Relationship_Type | Enum | See Relationship Types |
| Target_Entity_ID | String | FK to ENTITIES |
| Strength | Float (0-1) | How strong the relationship |
| Temporal_Start | Date | When relationship started |
| Temporal_End | Date | When ended (null if current) |
| Evidence_Episodes | String[] | Episodes supporting this |
| Properties | JSON | Relationship-specific data |
| Notes | Text | Context |

**Relationship Types:**

| Relationship | Example | Properties |
|--------------|---------|------------|
| GROWS_IN | Tomato GROWS_IN North Field | season, success_rate |
| FOLLOWS | Garlic FOLLOWS Tomato | rotation rule |
| SUPPLIES | Johnny's SUPPLIES Cherokee Purple | price, lead_time |
| BUYS_FROM | Mayfly BUYS_FROM Farm | avg_order, delivery_day |
| PREFERS | Chef John PREFERS Baby Greens | quantity, frequency |
| TREATS | Neem Oil TREATS Aphids | effectiveness |
| ATTACKS | Aphids ATTACKS Brassicas | severity, season |
| LOCATED_IN | Bed N-01 LOCATED_IN North Field | position |
| INCOMPATIBLE | Fennel INCOMPATIBLE Tomato | reason |
| COMPANION | Basil COMPANION Tomato | benefit |

#### 2.2.6 TEMPORAL_EVENTS (Timeline Index)

| Column | Type | Description |
|--------|------|-------------|
| Event_ID | String | `TE_YYYYMMDD_XXX` |
| Date | Date | Event date |
| Year | Integer | For year-over-year queries |
| Month | Integer | 1-12 |
| Week | Integer | ISO week |
| Day_Of_Year | Integer | 1-366 |
| Season | Enum | SPRING, SUMMER, FALL, WINTER |
| Event_Type | String | frost, harvest, planting, market, etc. |
| Brand | Enum | FARM, FLEURS, FUNGI, ALL |
| Description | String | What happened |
| Memory_ID | String | FK to AI_MEMORY_INDEX |
| Is_Recurring | Boolean | Annual event? |
| Recurrence_Pattern | String | "every year", "first frost" |
| Significance | Float (0-1) | How important historically |
| Weather_High | Float | High temp |
| Weather_Low | Float | Low temp |
| Weather_Precip | Float | Precipitation |

#### 2.2.7 MEMORY_EMBEDDINGS (Vector Storage)

| Column | Type | Description |
|--------|------|-------------|
| Embedding_ID | String | `EMB_XXX` |
| Memory_ID | String | FK to AI_MEMORY_INDEX |
| Text_Content | Text | Original text that was embedded |
| Model_Used | String | text-embedding-3-large |
| Dimensions | Integer | 3072 |
| Embedding_Vector | String | JSON array of floats |
| Created_At | DateTime | When generated |
| Chunk_Index | Integer | For long documents |
| Total_Chunks | Integer | How many chunks |

**Note:** For production, consider external vector storage (Vertex AI Vector Search) with sheet as index only.

#### 2.2.8 BRAND-SPECIFIC SHEETS (FARM_MEMORY, FLEURS_MEMORY, FUNGI_MEMORY)

Each brand sheet stores specialized knowledge:

| Column | Type | Description |
|--------|------|-------------|
| Entry_ID | String | Brand-specific ID |
| Memory_ID | String | FK to AI_MEMORY_INDEX |
| Category | String | Brand-specific categories |
| Subcategory | String | Further detail |
| Content | Text | Full content |
| Crop_Specific | JSON | Crop-level details |
| Year | Integer | Which season/year |
| Verified | Boolean | Owner-confirmed |

**FARM_MEMORY Categories:** Vegetables, Soil, Irrigation, Pest_Management, Harvest, Storage, Sales

**FLEURS_MEMORY Categories:** Arrangements, Varieties, Vase_Life, Market_Performance, Wedding_Work, Design_Notes

**FUNGI_MEMORY Categories:** Strains, Substrates, Climate_Control, Contamination, Yields, Processing

#### 2.2.9 CORRECTIONS (Self-Correction Log)

| Column | Type | Description |
|--------|------|-------------|
| Correction_ID | String | `COR_XXX` |
| Original_Memory_ID | String | What was wrong |
| Corrected_Memory_ID | String | New correct version |
| Correction_Type | Enum | FACTUAL_ERROR, OUTDATED, NUANCE, MERGE |
| Error_Description | Text | What was wrong |
| Correct_Information | Text | What's right |
| Detected_By | Enum | AI, OWNER, SYSTEM |
| Detection_Method | String | How found |
| Correction_Date | DateTime | When fixed |
| Confidence_Before | Float | Old confidence |
| Confidence_After | Float | New confidence |
| Learning_Applied | Boolean | AI updated patterns |

#### 2.2.10 CONSOLIDATION_LOG (Episodic -> Semantic)

| Column | Type | Description |
|--------|------|-------------|
| Consolidation_ID | String | `CON_XXX` |
| Run_Date | DateTime | When consolidation ran |
| Episodes_Analyzed | Integer | How many reviewed |
| Patterns_Identified | Integer | New patterns found |
| Patterns_Reinforced | Integer | Existing patterns strengthened |
| Patterns_Weakened | Integer | Contradicted patterns |
| New_Semantic_IDs | String[] | Created memories |
| Updated_Semantic_IDs | String[] | Modified memories |
| Processing_Time_Sec | Float | How long it took |
| AI_Model_Used | String | Which AI |
| Prompt_Version | String | Which prompt template |

#### 2.2.11 WORKING_MEMORY (Session Context)

| Column | Type | Description |
|--------|------|-------------|
| Session_ID | String | `WM_YYYYMMDD_HHMMSS` |
| Started_At | DateTime | Session start |
| Last_Updated | DateTime | Last activity |
| User_ID | String | Who's interacting |
| Task_Type | String | planning, harvest, sales, etc. |
| Active_Context | JSON | Currently loaded memories |
| Recent_Retrievals | JSON | Last 10 queries |
| Conversation_Summary | Text | Running summary |
| Entities_In_Focus | String[] | Active entity IDs |
| Time_Focus | JSON | Date ranges in discussion |
| Pending_Actions | JSON | Things to remember |
| Session_Insights | Text | Things learned this session |

#### 2.2.12 MEMORY_STATS (System Metrics)

| Column | Type | Description |
|--------|------|-------------|
| Date | Date | Stats date |
| Total_Memories | Integer | Count |
| Episodic_Count | Integer | Episodes |
| Semantic_Count | Integer | Patterns |
| Entity_Count | Integer | Entities |
| Relationship_Count | Integer | Edges |
| Avg_Importance | Float | Mean importance |
| Retrieval_Count | Integer | Queries today |
| Consolidation_Runs | Integer | Runs today |
| Corrections_Made | Integer | Fixes today |
| Storage_Bytes | Integer | Size |
| Embedding_Count | Integer | Vectors |

---

## PART 3: RETRIEVAL ALGORITHMS

### 3.1 Hybrid Retrieval System

Based on RAG best practices from 2025-2026 research, we implement a **4-stage retrieval pipeline**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        QUERY INPUT                                   │
│  "What did we learn about growing dahlias in 2025?"                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 1: QUERY ANALYSIS & EXPANSION                                │
│  • Extract entities: [Dahlia, 2025]                                 │
│  • Detect temporal: year=2025                                        │
│  • Detect intent: LEARNING_RETRIEVAL                                │
│  • Expand query: "dahlia growing lessons insights problems 2025"    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  STAGE 2A:          │ │  STAGE 2B:      │ │  STAGE 2C:      │
│  STRUCTURED SEARCH  │ │  SEMANTIC SEARCH│ │  GRAPH TRAVERSAL│
│                     │ │                 │ │                 │
│  SQL-like queries   │ │  Vector cosine  │ │  Entity→Memory  │
│  on sheet filters   │ │  similarity     │ │  path finding   │
│                     │ │                 │ │                 │
│  • Entity: Dahlia   │ │  • Embed query  │ │  • Dahlia node  │
│  • Year: 2025       │ │  • Top-K search │ │  • Related edges│
│  • Type: LEARNING   │ │  • Threshold: 0.7│ │  • 2-hop context│
└──────────┬──────────┘ └────────┬────────┘ └────────┬────────┘
           │                     │                    │
           └─────────────────────┼────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 3: CANDIDATE FUSION & RERANKING                              │
│                                                                      │
│  Score = (0.3 × Relevance) + (0.25 × Recency) +                     │
│          (0.25 × Importance) + (0.2 × Source_Diversity)             │
│                                                                      │
│  Deduplicate, merge overlapping memories                            │
│  Apply MMR (Maximal Marginal Relevance) for diversity               │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 4: CONTEXT ASSEMBLY                                          │
│                                                                      │
│  • Token budget: 8000 tokens                                        │
│  • Pack highest-scored first                                        │
│  • Include: 3 episodic, 2 semantic, 1 procedural                   │
│  • Add entity context for referenced entities                       │
│  • Include temporal anchors (what week/season)                      │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        ASSEMBLED CONTEXT                             │
│  Ready for AI to generate response                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Scoring Formula

The **Memory Relevance Score** combines multiple factors:

```javascript
function calculateMemoryScore(memory, query, currentDate) {
  // 1. Semantic Relevance (0-1)
  const semanticScore = cosineSimilarity(
    query.embedding,
    memory.embedding
  );

  // 2. Recency Decay (Ebbinghaus-inspired)
  const daysSinceCreated = daysBetween(memory.ingestionTime, currentDate);
  const daysSinceAccessed = daysBetween(memory.lastAccessed, currentDate);
  const recencyScore = Math.pow(0.995, Math.min(daysSinceCreated, daysSinceAccessed));

  // 3. Importance (AI-assigned, 0-1)
  const importanceScore = memory.importanceScore;

  // 4. Access Frequency Boost
  const accessBoost = Math.min(memory.accessCount / 10, 1) * 0.1;

  // 5. Temporal Alignment (for temporal queries)
  const temporalScore = calculateTemporalAlignment(memory, query);

  // 6. Entity Overlap
  const entityScore = calculateEntityOverlap(memory.tags, query.entities);

  // Weighted combination
  const finalScore =
    (0.30 * semanticScore) +
    (0.15 * recencyScore) +
    (0.20 * importanceScore) +
    (0.05 * accessBoost) +
    (0.15 * temporalScore) +
    (0.15 * entityScore);

  return Math.min(finalScore, 1.0);
}
```

### 3.3 Temporal Query Handlers

Special handlers for time-based queries:

```javascript
const TEMPORAL_PATTERNS = {
  // "What happened last year at this time?"
  SAME_TIME_DIFFERENT_YEAR: {
    pattern: /(?:last|previous)\s+year|same\s+time\s+(?:last|in)\s+(\d{4})/i,
    handler: (query, currentDate) => {
      const targetYear = currentDate.getFullYear() - 1;
      const weekStart = getWeekStart(currentDate);
      const weekEnd = getWeekEnd(currentDate);

      return {
        filters: {
          year: targetYear,
          weekOfYear: getWeekNumber(currentDate),
          // Also check 1 week before/after for fuzzy matching
          weekRange: [getWeekNumber(currentDate) - 1, getWeekNumber(currentDate) + 1]
        },
        boostFields: ['lessons_learned', 'outcome']
      };
    }
  },

  // "Our first year growing X"
  FIRST_OCCURRENCE: {
    pattern: /first\s+(?:year|time|season)\s+(?:growing|with|doing)\s+(.+)/i,
    handler: (query, match) => {
      const subject = match[1];
      return {
        filters: {
          entityName: subject,
          sortBy: 'event_time',
          sortOrder: 'ASC',
          limit: 10  // Get earliest records
        }
      };
    }
  },

  // "What did we do differently in 2025 vs 2024?"
  YEAR_COMPARISON: {
    pattern: /(\d{4})\s+(?:vs|versus|compared to|vs\.)\s+(\d{4})/i,
    handler: (query, match) => {
      return {
        parallelQueries: [
          { year: parseInt(match[1]) },
          { year: parseInt(match[2]) }
        ],
        aggregation: 'COMPARE'
      };
    }
  },

  // "Every spring we..."
  RECURRING_PATTERN: {
    pattern: /every\s+(spring|summer|fall|winter|year|month|week)/i,
    handler: (query, match) => {
      return {
        filters: {
          memoryType: 'SEMANTIC',
          temporalQualifier: match[1]
        }
      };
    }
  }
};
```

### 3.4 Cross-Brand Query Handling

When a query touches multiple brands:

```javascript
function handleCrossBrandQuery(query) {
  const brandMentions = detectBrandMentions(query);

  if (brandMentions.length === 0) {
    // No specific brand - search all with cross_brand priority
    return {
      primarySearch: { brand: 'CROSS_BRAND' },
      secondarySearch: { brand: ['FARM', 'FLEURS', 'FUNGI'] },
      mergeStrategy: 'INTERLEAVE'
    };
  }

  if (brandMentions.length === 1) {
    // Specific brand - search that + cross_brand
    return {
      primarySearch: { brand: brandMentions[0] },
      secondarySearch: { brand: 'CROSS_BRAND' },
      mergeStrategy: 'PRIMARY_FIRST'
    };
  }

  // Multiple brands mentioned - explicit comparison
  return {
    parallelSearches: brandMentions.map(b => ({ brand: b })),
    mergeStrategy: 'COMPARE',
    includeConnections: true  // Show where brands interact
  };
}
```

---

## PART 4: IMPORTANCE SCORING SYSTEM

### 4.1 Initial Importance Assignment

When a memory is created, AI assigns importance based on:

```javascript
const IMPORTANCE_PROMPT = `
You are assessing the importance of a farm memory for long-term retention.

MEMORY:
{{memory_content}}

CONTEXT:
- Brand: {{brand}}
- Event Type: {{event_type}}
- Date: {{date}}

Rate importance from 0.0 to 1.0 based on:

HIGH IMPORTANCE (0.8-1.0):
- First occurrence of something
- Major success or failure
- Financial impact > $500
- Learning that changes future behavior
- Customer relationship milestone
- Pest/disease outbreak
- Weather event affecting crops
- Process improvement discovery

MEDIUM IMPORTANCE (0.5-0.79):
- Normal harvest records with notable quantity
- Customer feedback (positive or negative)
- Equipment maintenance events
- Supply chain issues
- Staff performance notes
- Market performance data

LOW IMPORTANCE (0.2-0.49):
- Routine daily activities
- Normal weather observations
- Standard task completion
- Minor notes

VERY LOW (0.0-0.19):
- Duplicate of existing memory
- Trivial observations
- Already captured in another memory

Respond with JSON:
{
  "importance_score": 0.XX,
  "reasoning": "Brief explanation",
  "should_consolidate_with": ["memory_id if this duplicates another"],
  "suggested_tags": ["entity1", "entity2"]
}
`;
```

### 4.2 Importance Decay Over Time

Importance decays but can be refreshed:

```javascript
function calculateCurrentRelevance(memory, currentDate) {
  const baseImportance = memory.importanceScore;
  const daysSinceEvent = daysBetween(memory.eventTime, currentDate);
  const daysSinceAccess = daysBetween(memory.lastAccessed, currentDate);

  // Decay based on time since event
  // Faster decay for low-importance, slower for high
  const decayRate = memory.decayRate || (1 - baseImportance * 0.003);
  const eventDecay = Math.pow(decayRate, daysSinceEvent);

  // Refresh boost from recent access
  const accessBoost = daysSinceAccess < 7 ? 0.1 :
                      daysSinceAccess < 30 ? 0.05 : 0;

  // Seasonal relevance boost
  const seasonalBoost = isSeasonallyRelevant(memory, currentDate) ? 0.15 : 0;

  // Annual relevance boost (same week/month different year)
  const annualBoost = isSameTimeOfYear(memory.eventTime, currentDate) ? 0.2 : 0;

  const currentRelevance = Math.min(
    baseImportance * eventDecay + accessBoost + seasonalBoost + annualBoost,
    1.0
  );

  return currentRelevance;
}

function isSeasonallyRelevant(memory, currentDate) {
  const memorySeason = getSeason(memory.eventTime);
  const currentSeason = getSeason(currentDate);
  return memorySeason === currentSeason;
}
```

---

## PART 5: SUMMARIZATION & CONSOLIDATION

### 5.1 Summarization Strategy

Three levels of summarization:

| Level | When | Output |
|-------|------|--------|
| **Immediate** | On memory creation | 1-sentence summary |
| **Weekly** | Every Sunday midnight | Week summary per brand |
| **Seasonal** | End of each season | Season summary, lessons |
| **Annual** | Dec 31 | Year review, top learnings |

### 5.2 Consolidation Pipeline (Episodic -> Semantic)

Weekly consolidation job:

```javascript
async function runWeeklyConsolidation() {
  const weekEpisodes = getEpisodesFromLastWeek();

  // Group by entity/topic
  const grouped = groupEpisodesByEntity(weekEpisodes);

  for (const [entityId, episodes] of Object.entries(grouped)) {
    // Skip if too few episodes
    if (episodes.length < 3) continue;

    // Look for patterns
    const patterns = await detectPatterns(episodes);

    for (const pattern of patterns) {
      // Check if semantic memory already exists
      const existing = findMatchingSemantic(pattern.subject, pattern.predicate);

      if (existing) {
        // Reinforce existing pattern
        await reinforcePattern(existing.id, episodes, pattern.strength);
      } else if (pattern.confidence > 0.7) {
        // Create new semantic memory
        await createSemanticMemory({
          subject: pattern.subject,
          predicate: pattern.predicate,
          object: pattern.object,
          confidence: pattern.confidence,
          sourceEpisodes: episodes.map(e => e.id),
          naturalLanguage: pattern.naturalLanguage
        });
      }
    }
  }

  // Log consolidation run
  await logConsolidation(weekEpisodes.length, patterns.length);
}
```

### 5.3 Pattern Detection Prompt

```javascript
const PATTERN_DETECTION_PROMPT = `
Analyze these farm episodes from the past week and identify recurring patterns:

EPISODES:
{{episodes_json}}

For each pattern you identify, provide:

1. Pattern Type: CORRELATION, CAUSATION, PREFERENCE, TIMING, SEQUENCE
2. Subject: What entity is this about?
3. Predicate: What's the relationship?
4. Object: What's the outcome/target?
5. Confidence: 0.0-1.0 based on evidence strength
6. Natural Language: Human-readable statement
7. Temporal Qualifier: "usually", "in summer", "on Tuesdays", etc.
8. Conditions: When does this apply?

Example output:
{
  "patterns": [
    {
      "type": "TIMING",
      "subject": "Dahlia",
      "predicate": "first_harvest",
      "object": "Week 23-24",
      "confidence": 0.85,
      "naturalLanguage": "Dahlias typically produce first harvest in week 23-24 (early June)",
      "temporalQualifier": "annually",
      "conditions": "when transplanted by May 1",
      "supportingEpisodes": ["EP_20250601_001", "EP_20240605_003"]
    }
  ]
}

Be conservative - only report patterns with clear evidence.
`;
```

### 5.4 Consolidation Schedule

| Task | Frequency | Trigger | Description |
|------|-----------|---------|-------------|
| Episode Indexing | Real-time | On journal entry | Index new episode, extract entities |
| Embedding Generation | Real-time | On index | Generate vector embedding |
| Importance Decay | Daily 3am | Time trigger | Update current_relevance scores |
| Weekly Consolidation | Sunday 11pm | Time trigger | Episodic->Semantic patterns |
| Memory Pruning | Monthly 1st | Time trigger | Archive very low relevance |
| Seasonal Summary | Season end | Date trigger | Generate season learnings |
| Annual Review | Dec 31 | Date trigger | Year-in-review generation |

---

## PART 6: CONTEXT SELECTION DECISION TREE

### 6.1 Task-Based Context Selection

Different tasks need different memory contexts:

```
                           ┌─────────────────────┐
                           │    TASK TYPE?       │
                           └──────────┬──────────┘
                                      │
         ┌────────────┬───────────────┼───────────────┬────────────┐
         ▼            ▼               ▼               ▼            ▼
    ┌─────────┐  ┌─────────┐    ┌─────────┐    ┌─────────┐   ┌─────────┐
    │PLANNING │  │HARVEST  │    │ SALES   │    │PROBLEM  │   │LEARNING │
    │         │  │         │    │         │    │SOLVING  │   │QUERY    │
    └────┬────┘  └────┬────┘    └────┬────┘    └────┬────┘   └────┬────┘
         │            │              │              │              │
         ▼            ▼              ▼              ▼              ▼
┌─────────────┐ ┌──────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│Load:        │ │Load:     │ │Load:       │ │Load:       │ │Load:       │
│• Crop       │ │• Last    │ │• Customer  │ │• Similar   │ │• Semantic  │
│  profiles   │ │  harvest │ │  history   │ │  past      │ │  memories  │
│• Same-time  │ │  dates   │ │• Preferences│ │  problems │ │• Episode   │
│  last year  │ │• Weather │ │• Price     │ │• Solutions │ │  evidence  │
│• Bed history│ │  forecast│ │  history   │ │  tried     │ │• Temporal  │
│• Success/   │ │• Market  │ │• Market    │ │• Expert    │ │  context   │
│  failure    │ │  demand  │ │  trends    │ │  advice    │ │• Related   │
│  patterns   │ │          │ │            │ │            │ │  entities  │
└─────────────┘ └──────────┘ └────────────┘ └────────────┘ └────────────┘
```

### 6.2 Context Budget Allocation

For an 8000-token context window:

```javascript
const CONTEXT_BUDGET = {
  PLANNING: {
    total_tokens: 8000,
    allocation: {
      system_prompt: 500,
      current_task: 300,
      semantic_memory: 2000,  // Patterns, rules
      episodic_memory: 1500,  // Recent relevant events
      temporal_context: 1000, // Same time last year
      entity_context: 500,    // Crop/field profiles
      procedural_memory: 700, // How-to knowledge
      buffer: 500
    }
  },
  PROBLEM_SOLVING: {
    total_tokens: 8000,
    allocation: {
      system_prompt: 500,
      problem_description: 500,
      similar_problems: 2500,  // Past similar issues
      solutions_tried: 1500,   // What worked/didn't
      expert_knowledge: 1500,  // External resources
      current_context: 500,    // Weather, season
      buffer: 500
    }
  },
  CUSTOMER_INTERACTION: {
    total_tokens: 8000,
    allocation: {
      system_prompt: 500,
      customer_profile: 800,   // Full history
      recent_orders: 1000,
      preferences: 700,
      current_availability: 800,
      market_context: 600,
      communication_style: 400,
      buffer: 500
    }
  }
};
```

### 6.3 Context Assembly Algorithm

```javascript
async function assembleContext(task, query, user) {
  const budget = CONTEXT_BUDGET[task.type];
  const context = {
    sections: [],
    totalTokens: 0,
    retrievedMemories: []
  };

  // 1. Always include system prompt
  context.sections.push({
    type: 'system',
    content: getSystemPrompt(task.type),
    tokens: budget.allocation.system_prompt
  });

  // 2. Add current task/query
  context.sections.push({
    type: 'task',
    content: formatTask(task, query),
    tokens: budget.allocation.current_task
  });

  // 3. Retrieve memories by priority
  const retrievalPriority = getRetrievalPriority(task.type);

  for (const memoryType of retrievalPriority) {
    const budgetForType = budget.allocation[memoryType];
    if (!budgetForType) continue;

    const memories = await retrieveMemories({
      query: query,
      type: memoryType,
      brand: task.brand,
      tokenBudget: budgetForType,
      excludeIds: context.retrievedMemories
    });

    for (const memory of memories) {
      if (context.totalTokens + memory.tokens > budget.total_tokens) break;

      context.sections.push({
        type: memoryType,
        content: formatMemory(memory),
        tokens: memory.tokens,
        memoryId: memory.id
      });

      context.totalTokens += memory.tokens;
      context.retrievedMemories.push(memory.id);
    }
  }

  // 4. Update access stats for retrieved memories
  await updateAccessStats(context.retrievedMemories);

  return context;
}
```

---

## PART 7: ENTITY EXTRACTION & TAGGING

### 7.1 Automatic Entity Extraction

Every journal entry is processed to extract entities:

```javascript
const ENTITY_EXTRACTION_PROMPT = `
Extract all entities from this farm journal entry:

ENTRY:
"{{entry_text}}"

DATE: {{date}}
BRAND: {{brand}}

Identify all entities and their types:

ENTITY TYPES:
- CROP: Any plant being grown
- VARIETY: Specific cultivar of a crop
- FIELD: Growing area (field, greenhouse, bed)
- CUSTOMER: Person or business
- MARKET: Farmers market or sales venue
- PEST: Insect, disease, or animal pest
- TREATMENT: Product or method used
- EQUIPMENT: Tool or machine
- EMPLOYEE: Staff member
- WEATHER: Weather event or condition
- QUANTITY: Measurable amount with unit

For each entity, provide:
- name: The entity name
- type: From the list above
- is_new: true if likely first mention ever
- relationship_hints: suggested relationships

Example output:
{
  "entities": [
    {
      "name": "Cherokee Purple",
      "type": "VARIETY",
      "parent": "Tomato",
      "is_new": false,
      "relationship_hints": ["grows_in: Greenhouse 1"]
    },
    {
      "name": "120 lbs",
      "type": "QUANTITY",
      "unit": "lbs",
      "value": 120,
      "relates_to": "Cherokee Purple harvest"
    }
  ]
}
`;
```

### 7.2 Entity Resolution

Matching new mentions to existing entities:

```javascript
async function resolveEntity(extractedEntity, brand) {
  // 1. Exact name match
  const exactMatch = await findEntityByName(extractedEntity.name);
  if (exactMatch) return exactMatch;

  // 2. Alias match
  const aliasMatch = await findEntityByAlias(extractedEntity.name);
  if (aliasMatch) return aliasMatch;

  // 3. Fuzzy match (for typos/variations)
  const fuzzyMatches = await fuzzySearchEntities(
    extractedEntity.name,
    extractedEntity.type,
    0.85  // Similarity threshold
  );

  if (fuzzyMatches.length === 1) {
    // Add as new alias
    await addEntityAlias(fuzzyMatches[0].id, extractedEntity.name);
    return fuzzyMatches[0];
  }

  if (fuzzyMatches.length > 1) {
    // Ambiguous - flag for human review
    await flagForReview({
      newMention: extractedEntity,
      possibleMatches: fuzzyMatches,
      context: 'entity_resolution'
    });
    // Use most likely for now
    return fuzzyMatches[0];
  }

  // 4. No match - create new entity
  if (extractedEntity.is_new || fuzzyMatches.length === 0) {
    return await createEntity({
      name: extractedEntity.name,
      type: extractedEntity.type,
      brand: brand,
      properties: extractedEntity.properties || {}
    });
  }
}
```

### 7.3 Automatic Tagging

After entity extraction, memories are automatically tagged:

```javascript
async function tagMemory(memoryId, extractedEntities) {
  const tags = [];

  for (const entity of extractedEntities) {
    const resolved = await resolveEntity(entity);
    tags.push(resolved.id);

    // Also add parent entities
    if (entity.type === 'VARIETY') {
      const parentCrop = await getParentCrop(resolved.id);
      if (parentCrop) tags.push(parentCrop.id);
    }

    // Add brand tag
    tags.push(`BRAND:${entity.brand || 'ALL'}`);

    // Add temporal tags
    const date = entity.date;
    tags.push(`YEAR:${date.getFullYear()}`);
    tags.push(`SEASON:${getSeason(date)}`);
    tags.push(`WEEK:${getWeekNumber(date)}`);
  }

  // Update memory with unique tags
  await updateMemoryTags(memoryId, [...new Set(tags)]);
}
```

---

## PART 8: CROSS-BRAND EVENT DETECTION

### 8.1 Cross-Brand Relevance Rules

Some events affect all brands:

```javascript
const CROSS_BRAND_TRIGGERS = {
  // Weather affects everyone
  WEATHER_EVENT: {
    keywords: ['frost', 'freeze', 'hail', 'drought', 'flood', 'heat wave'],
    relevance: 1.0,
    reason: 'Weather impacts all growing operations'
  },

  // Infrastructure affects everyone
  INFRASTRUCTURE: {
    keywords: ['irrigation', 'well', 'electricity', 'road', 'building'],
    relevance: 0.9,
    reason: 'Infrastructure serves all brands'
  },

  // Labor/staffing
  LABOR: {
    keywords: ['hire', 'fire', 'training', 'schedule', 'staff'],
    relevance: 0.8,
    reason: 'Labor resources shared across brands'
  },

  // Financial
  FINANCIAL: {
    keywords: ['budget', 'investment', 'loan', 'expense', 'revenue'],
    relevance: 0.9,
    reason: 'Financial decisions affect all brands'
  },

  // Shared pests/diseases
  PEST_CROSS: {
    keywords: ['deer', 'groundhog', 'vole', 'rabbit'],
    relevance: 0.7,
    reason: 'Wildlife pests affect all outdoor crops'
  },

  // Shared resources
  RESOURCE: {
    keywords: ['compost', 'mulch', 'fuel', 'supplies'],
    relevance: 0.6,
    reason: 'Shared inputs'
  }
};

async function detectCrossBrandRelevance(memory, primaryBrand) {
  const text = memory.fullContent.toLowerCase();

  for (const [trigger, config] of Object.entries(CROSS_BRAND_TRIGGERS)) {
    for (const keyword of config.keywords) {
      if (text.includes(keyword)) {
        return {
          isCrossBrand: true,
          relevance: config.relevance,
          reason: config.reason,
          trigger: trigger
        };
      }
    }
  }

  // Also check for explicit multi-brand mentions
  const brands = ['farm', 'fleurs', 'fungi'];
  const mentionedBrands = brands.filter(b => text.includes(b));

  if (mentionedBrands.length > 1) {
    return {
      isCrossBrand: true,
      relevance: 0.9,
      reason: 'Explicitly mentions multiple brands',
      trigger: 'EXPLICIT_MENTION'
    };
  }

  return { isCrossBrand: false };
}
```

### 8.2 Cross-Brand Pattern Learning

The AI learns which patterns transfer between brands:

```javascript
const CROSS_BRAND_LEARNING_PROMPT = `
Analyze this memory from {{primary_brand}} and determine if it contains knowledge applicable to other brands.

MEMORY:
{{memory_content}}

OTHER BRANDS:
- FARM (vegetables)
- FLEURS (flowers)
- FUNGI (mushrooms)

Consider:
1. Does this reveal a general principle (soil health, pest behavior, weather response)?
2. Could this customer relationship benefit other brands?
3. Is this a market insight that applies broadly?
4. Is this about shared infrastructure or resources?
5. Does this contain a process improvement applicable elsewhere?

Respond with:
{
  "cross_brand_applicable": true/false,
  "applicable_to": ["BRAND1", "BRAND2"],
  "transfer_type": "PRINCIPLE" | "CUSTOMER" | "MARKET" | "INFRASTRUCTURE" | "PROCESS",
  "transferred_insight": "What specifically transfers",
  "confidence": 0.0-1.0
}
`;
```

---

## PART 9: SELF-CORRECTION MECHANISM

### 9.1 Error Detection Methods

Based on 2025-2026 research on self-correcting AI, we implement multiple detection methods:

```javascript
const ERROR_DETECTION = {
  // 1. Contradiction Detection
  CONTRADICTION: {
    description: 'New information contradicts existing memory',
    detector: async (newMemory, existingMemories) => {
      // Compare with semantically similar memories
      const similar = await findSimilarMemories(newMemory, 0.8);

      for (const existing of similar) {
        const contradiction = await detectContradiction(newMemory, existing);
        if (contradiction.isContradiction) {
          return {
            type: 'CONTRADICTION',
            conflictingMemoryId: existing.id,
            description: contradiction.description,
            resolution: contradiction.suggestedResolution
          };
        }
      }
      return null;
    }
  },

  // 2. Temporal Inconsistency
  TEMPORAL: {
    description: 'Event timing impossible or unlikely',
    detector: async (memory) => {
      // Check if harvest date before planting
      if (memory.eventType === 'HARVEST') {
        const planting = await findRelatedPlanting(memory);
        if (planting && planting.date > memory.date) {
          return {
            type: 'TEMPORAL',
            description: 'Harvest recorded before planting',
            conflictingMemoryId: planting.id
          };
        }
      }

      // Check if dates are realistic
      if (isDateAnomalous(memory.date, memory.eventType)) {
        return {
          type: 'TEMPORAL',
          description: 'Date seems unlikely for this event type'
        };
      }
      return null;
    }
  },

  // 3. Statistical Outlier
  OUTLIER: {
    description: 'Value significantly outside normal range',
    detector: async (memory) => {
      if (!memory.quantity) return null;

      const historical = await getHistoricalValues(
        memory.entityId,
        memory.quantityType,
        20  // Last 20 similar records
      );

      const stats = calculateStats(historical);
      const zScore = (memory.quantity - stats.mean) / stats.stdDev;

      if (Math.abs(zScore) > 3) {
        return {
          type: 'OUTLIER',
          description: `Value ${memory.quantity} is ${zScore.toFixed(1)} standard deviations from mean`,
          expected: { mean: stats.mean, stdDev: stats.stdDev },
          suggestedAction: 'FLAG_FOR_REVIEW'
        };
      }
      return null;
    }
  },

  // 4. User Correction
  USER_CORRECTION: {
    description: 'Owner explicitly corrects information',
    handler: async (correctionRequest) => {
      return {
        type: 'USER_CORRECTION',
        originalMemoryId: correctionRequest.memoryId,
        correctInformation: correctionRequest.correct,
        reason: correctionRequest.reason || 'User-provided correction'
      };
    }
  },

  // 5. External Validation Failure
  VALIDATION: {
    description: 'External data contradicts memory',
    detector: async (memory) => {
      // Check weather claims against weather API
      if (memory.weatherConditions) {
        const actualWeather = await getHistoricalWeather(memory.date);
        if (significantly_different(memory.weatherConditions, actualWeather)) {
          return {
            type: 'VALIDATION',
            description: 'Weather in memory differs from actual',
            claimed: memory.weatherConditions,
            actual: actualWeather
          };
        }
      }
      return null;
    }
  }
};
```

### 9.2 Correction Workflow

```javascript
async function processCorrection(error, correctInfo, source) {
  // 1. Create correction record
  const correctionId = await createCorrectionRecord({
    originalMemoryId: error.conflictingMemoryId,
    errorType: error.type,
    errorDescription: error.description,
    detectedBy: source,
    detectionMethod: error.detectorName,
    correctionDate: new Date()
  });

  // 2. Handle based on error type
  switch (error.type) {
    case 'CONTRADICTION':
      // Keep both but mark relationship
      await linkMemoriesAsContradiction(
        error.conflictingMemoryId,
        correctInfo.memoryId,
        correctionId
      );

      // Reduce confidence of older if newer is more reliable
      if (isMoreReliable(correctInfo, error.original)) {
        await reduceConfidence(error.conflictingMemoryId, 0.3);
      }
      break;

    case 'TEMPORAL':
    case 'OUTLIER':
      // Flag for human review
      await flagForReview({
        memoryId: error.conflictingMemoryId,
        reason: error.description,
        correctionId: correctionId
      });
      break;

    case 'USER_CORRECTION':
      // Create superseding memory
      const newMemoryId = await createCorrectedMemory(
        error.conflictingMemoryId,
        correctInfo
      );

      // Mark original as superseded
      await updateMemory(error.conflictingMemoryId, {
        isActive: false,
        supersededBy: newMemoryId,
        supersededReason: correctInfo.reason
      });
      break;
  }

  // 3. Update semantic patterns if affected
  const affectedPatterns = await findPatternsUsingMemory(
    error.conflictingMemoryId
  );

  for (const pattern of affectedPatterns) {
    await weakenPattern(pattern.id, 0.1);
    await logPatternWeakening(pattern.id, correctionId);
  }

  // 4. Learn from correction
  await learnFromCorrection(error, correctInfo, correctionId);

  return correctionId;
}
```

### 9.3 Learning from Corrections

```javascript
const CORRECTION_LEARNING_PROMPT = `
A correction was made to farm memory. Analyze what we can learn:

ORIGINAL (INCORRECT):
{{original_content}}

CORRECTED:
{{corrected_content}}

ERROR TYPE: {{error_type}}
REASON: {{reason}}

What should we learn from this correction?
- Should we update any general patterns?
- Should we add validation rules?
- Should we flag similar potential errors?
- What led to the original error?

Respond with:
{
  "learning_type": "PATTERN_UPDATE" | "NEW_RULE" | "SCAN_SIMILAR" | "PROCESS_CHANGE",
  "specific_learning": "What we learned",
  "action_items": ["specific actions to prevent recurrence"],
  "patterns_to_review": ["pattern_ids that might be affected"],
  "confidence_in_learning": 0.0-1.0
}
`;
```

---

## PART 10: TEN-YEAR SCALABILITY ANALYSIS

### 10.1 Growth Projections

| Metric | Year 1 | Year 5 | Year 10 |
|--------|--------|--------|---------|
| Episodic Memories | 1,500 | 8,000 | 20,000 |
| Semantic Memories | 200 | 1,500 | 4,000 |
| Entities | 500 | 2,000 | 5,000 |
| Relationships | 1,000 | 8,000 | 25,000 |
| Embeddings | 2,000 | 12,000 | 30,000 |
| Daily Queries | 20 | 100 | 300 |
| Storage (MB) | 50 | 500 | 2,000 |

### 10.2 Scalability Strategies

#### 10.2.1 Google Sheets Limits

Google Sheets has limits we must work within:

| Limit | Value | Mitigation |
|-------|-------|------------|
| Cells per sheet | 10,000,000 | Archive old years to separate sheets |
| Characters per cell | 50,000 | Split large content across cells |
| Rows per sheet | ~1,000,000 | Partition by year/brand |
| API calls/min | 300 | Batch operations, caching |

#### 10.2.2 Annual Archiving Strategy

```javascript
async function archiveYear(year) {
  // 1. Create archive sheet
  const archiveSheet = await createSheet(`ARCHIVE_${year}`);

  // 2. Move low-relevance memories
  const toArchive = await getMemoriesForArchiving({
    year: year,
    maxRelevance: 0.3,
    excludeTypes: ['SEMANTIC']  // Keep patterns active
  });

  // 3. Copy to archive
  await copyMemoriesToSheet(toArchive, archiveSheet);

  // 4. Update index with archive location
  for (const memory of toArchive) {
    await updateMemoryIndex(memory.id, {
      archived: true,
      archiveLocation: `ARCHIVE_${year}`,
      archiveDate: new Date()
    });
  }

  // 5. Delete from active sheets (keep index)
  await deleteFromActiveSheets(toArchive.map(m => m.id));

  // 6. Generate year summary
  await generateYearSummary(year, archiveSheet);
}
```

#### 10.2.3 Embedding Storage Strategy

For large-scale embeddings, use external storage:

**Year 1-3: Google Sheets**
- Store embeddings as JSON strings
- Index by memory_id
- Works for <5000 embeddings

**Year 3+: Vertex AI Vector Search**
- Migrate embeddings to cloud vector DB
- Keep sheet as index/metadata only
- Enables billion-scale search

```javascript
// Migration path
async function migrateToVertexVectorSearch() {
  const embeddings = await getAllEmbeddings();

  for (const emb of embeddings) {
    // Upload to Vertex
    await vertexVectorSearch.upsert({
      id: emb.embeddingId,
      embedding: emb.vector,
      metadata: {
        memoryId: emb.memoryId,
        brand: emb.brand,
        year: emb.year
      }
    });

    // Update sheet to reference external
    await updateEmbeddingRecord(emb.embeddingId, {
      storageLocation: 'VERTEX',
      localVector: null  // Remove from sheet
    });
  }
}
```

#### 10.2.4 Query Performance at Scale

```javascript
const PERFORMANCE_TIERS = {
  HOT: {
    // Current year + last season
    storage: 'Primary Sheets',
    indexing: 'Full embeddings in memory',
    retrievalTime: '<500ms'
  },
  WARM: {
    // Last 3 years
    storage: 'Secondary Sheets',
    indexing: 'Embeddings cached on demand',
    retrievalTime: '<2s'
  },
  COLD: {
    // Older archives
    storage: 'Archive Sheets',
    indexing: 'Index only, fetch full on demand',
    retrievalTime: '<5s'
  }
};

// Tiered retrieval
async function tieredRetrieval(query, maxResults = 10) {
  let results = [];

  // 1. Search HOT tier first
  const hotResults = await searchTier('HOT', query, maxResults);
  results.push(...hotResults);

  // 2. If not enough results, search WARM
  if (results.length < maxResults) {
    const warmResults = await searchTier('WARM', query, maxResults - results.length);
    results.push(...warmResults);
  }

  // 3. Only search COLD if specifically requested or very few results
  if (results.length < 3 || query.includeArchive) {
    const coldResults = await searchTier('COLD', query, maxResults - results.length);
    results.push(...coldResults);
  }

  return results;
}
```

### 10.3 Multi-Agent Memory Sharing

For future multi-agent scenarios (e.g., multiple AI assistants):

```javascript
// Based on Mem0 and Letta research
const MULTI_AGENT_MEMORY = {
  // Shared memory pool
  sharedMemory: {
    accessControl: 'READ_ALL_WRITE_SCOPED',
    conflictResolution: 'CRDT',  // Conflict-free replicated data types
    syncMethod: 'EVENTUAL_CONSISTENCY'
  },

  // Agent-specific memory
  agentMemory: {
    scope: 'AGENT_ONLY',
    purpose: 'Working context, task state',
    retention: 'SESSION'
  },

  // Memory visibility
  visibility: {
    EPISODIC: 'ALL_AGENTS',  // Everyone can see what happened
    SEMANTIC: 'ALL_AGENTS',   // Everyone can see learned patterns
    WORKING: 'AGENT_ONLY',    // Only current agent sees active context
    PROCEDURAL: 'ALL_AGENTS'  // Everyone can follow procedures
  }
};
```

---

## PART 11: IMPLEMENTATION PHASES

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Basic memory infrastructure

**Deliverables:**
1. Create all 14 Google Sheets with schemas
2. Implement core Apps Script functions:
   - `createMemory()` - Add new memory
   - `retrieveMemories()` - Basic retrieval
   - `updateMemory()` - Modify memory
   - `deleteMemory()` - Soft delete

3. Implement entity extraction (basic regex + AI)
4. Set up daily triggers for decay calculation
5. Build simple web UI for viewing memories

**Code Structure:**
```
apps_script/
├── MemoryCore.js           # Core CRUD operations
├── MemoryRetrieval.js      # Retrieval algorithms
├── MemoryIndex.js          # Index management
├── EntityExtractor.js      # Entity extraction
└── MemoryTriggers.js       # Time-based triggers
```

### Phase 2: Intelligence (Weeks 3-4)

**Goal:** AI-powered features

**Deliverables:**
1. Integrate Claude API for:
   - Importance scoring
   - Entity extraction
   - Pattern detection
   - Summarization

2. Implement embedding generation (Vertex AI)
3. Build semantic search
4. Create consolidation pipeline (weekly)
5. Add cross-brand detection

**New Code:**
```
apps_script/
├── MemoryAI.js             # AI integration
├── MemoryEmbeddings.js     # Vector operations
├── MemoryConsolidation.js  # Episodic->Semantic
├── CrossBrandDetector.js   # Multi-brand logic
└── TemporalQueries.js      # Time-based queries
```

### Phase 3: Correction & Learning (Weeks 5-6)

**Goal:** Self-improvement capabilities

**Deliverables:**
1. Implement error detection suite
2. Build correction workflow
3. Create learning from corrections
4. Add human review queue
5. Build audit trail

**New Code:**
```
apps_script/
├── MemoryCorrection.js     # Error detection
├── MemoryLearning.js       # Learning from errors
├── MemoryReview.js         # Human review queue
└── MemoryAudit.js          # Audit trail
```

### Phase 4: Integration (Weeks 7-8)

**Goal:** Connect to existing systems

**Deliverables:**
1. Integrate with existing Farm Journal entry point
2. Connect to PLANNING_2026 for automatic memory creation
3. Connect to HARVEST_LOG for automatic episodes
4. Connect to CUSTOMERS for entity sync
5. Build dashboard for memory statistics

**Integration Points:**
- Journal Entry -> Memory Creation
- Planning Action -> Memory Creation
- Harvest Log -> Episode Creation
- Customer Interaction -> Memory + Entity Update

### Phase 5: Optimization (Ongoing)

**Goal:** Performance and quality improvement

**Deliverables:**
1. Implement archiving strategy
2. Add caching layer
3. Build embedding migration path
4. Create monitoring dashboard
5. Establish backup procedures

---

## PART 12: API REFERENCE

### 12.1 Core Memory Functions

```javascript
// CREATE
async function createMemory(params) {
  /**
   * @param {Object} params
   * @param {string} params.content - Full memory content
   * @param {string} params.type - EPISODIC|SEMANTIC|PROCEDURAL|FACTUAL
   * @param {string} params.brand - FARM|FLEURS|FUNGI|CROSS_BRAND
   * @param {Date} params.eventTime - When event occurred
   * @param {string[]} params.tags - Initial tags
   * @param {Object} params.metadata - Additional data
   * @returns {Object} { success, memoryId, entities, importance }
   */
}

// RETRIEVE
async function retrieveMemories(params) {
  /**
   * @param {Object} params
   * @param {string} params.query - Natural language query
   * @param {string} params.type - Filter by memory type
   * @param {string} params.brand - Filter by brand
   * @param {Object} params.temporal - { year, season, weekRange }
   * @param {string[]} params.entities - Filter by entity IDs
   * @param {number} params.limit - Max results (default 10)
   * @param {number} params.minRelevance - Minimum score (default 0.3)
   * @returns {Object[]} Array of memories with scores
   */
}

// UPDATE
async function updateMemory(memoryId, updates) {
  /**
   * @param {string} memoryId
   * @param {Object} updates - Fields to update
   * @returns {Object} { success, updatedFields }
   */
}

// CORRECT
async function correctMemory(originalId, correction) {
  /**
   * @param {string} originalId - Memory to correct
   * @param {Object} correction
   * @param {string} correction.correctContent - Right information
   * @param {string} correction.reason - Why correcting
   * @returns {Object} { success, correctionId, newMemoryId }
   */
}

// CONSOLIDATE
async function runConsolidation(options) {
  /**
   * @param {Object} options
   * @param {string} options.scope - 'week'|'month'|'season'
   * @param {string} options.brand - Specific brand or 'ALL'
   * @returns {Object} { patterns, reinforced, weakened }
   */
}
```

### 12.2 Retrieval Endpoints

```javascript
// For doGet() in Apps Script
case 'memorySearch':
  return memorySearch(e.parameter);

case 'memoryGetById':
  return getMemoryById(e.parameter.id);

case 'memoryGetByEntity':
  return getMemoriesByEntity(e.parameter.entityId);

case 'memoryGetTemporal':
  return getTemporalMemories(e.parameter);

case 'memoryGetContext':
  return assembleTaskContext(e.parameter);
```

### 12.3 Web UI Endpoints

```javascript
// Dashboard data
case 'memoryStats':
  return getMemoryStats();

// Memory timeline
case 'memoryTimeline':
  return getMemoryTimeline(e.parameter);

// Entity graph
case 'entityGraph':
  return getEntityGraph(e.parameter.entityId);

// Pending corrections
case 'pendingCorrections':
  return getPendingCorrections();
```

---

## PART 13: PROMPTS LIBRARY

### 13.1 Memory Creation Prompt

```
You are the institutional memory system for Tiny Seed Farm (brands: Farm, Fleurs, Fungi).

A new journal entry has been recorded. Process it into structured memory:

JOURNAL ENTRY:
{{entry_content}}

DATE: {{date}}
ENTERED BY: {{user}}

Extract the following:

1. SUMMARY (1 sentence, <100 chars)
2. MEMORY TYPE: EPISODIC (specific event) | SEMANTIC (general pattern) | PROCEDURAL (how-to)
3. PRIMARY BRAND: FARM | FLEURS | FUNGI | CROSS_BRAND
4. ENTITIES: Extract all people, places, crops, etc. with types
5. IMPORTANCE (0.0-1.0): Rate significance for long-term memory
6. OUTCOME: SUCCESS | FAILURE | PARTIAL | NEUTRAL | N/A
7. LESSONS: Any explicit or implicit lessons
8. TEMPORAL_MARKERS: Season, week number, recurring event references
9. CROSS_BRAND_RELEVANCE: Does this affect other brands? Why?

Output as JSON:
{
  "summary": "...",
  "memoryType": "...",
  "brand": "...",
  "entities": [...],
  "importance": 0.X,
  "outcome": "...",
  "lessons": ["..."],
  "temporalMarkers": {...},
  "crossBrand": { "relevant": true/false, "reason": "..." }
}
```

### 13.2 Context Assembly Prompt

```
You are preparing context for the Tiny Seed Farm AI assistant.

CURRENT TASK: {{task_description}}
CURRENT DATE: {{date}}
BRAND FOCUS: {{brand}}
USER: {{user_role}}

You have access to these retrieved memories:

EPISODIC MEMORIES:
{{episodic_memories}}

SEMANTIC PATTERNS:
{{semantic_patterns}}

ENTITY CONTEXT:
{{entity_context}}

TEMPORAL CONTEXT (same time last year):
{{temporal_context}}

Assemble a coherent context that:
1. Puts most relevant information first
2. Highlights connections between memories
3. Notes any contradictions or uncertainties
4. Includes temporal anchors ("Last year at this time...")
5. Surfaces relevant patterns
6. Stays within {{token_limit}} tokens

Output the assembled context as flowing text, not a list.
```

### 13.3 Pattern Detection Prompt

```
Analyze these episodic memories from Tiny Seed Farm to identify recurring patterns:

EPISODES FROM {{time_period}}:
{{episodes}}

EXISTING PATTERNS (to reinforce or contradict):
{{existing_patterns}}

For each pattern identified:

1. PATTERN_TYPE:
   - TIMING (when things happen)
   - SEQUENCE (order of events)
   - CORRELATION (things that happen together)
   - CAUSATION (A causes B)
   - PREFERENCE (customer/crop preferences)
   - CONSTRAINT (limitations learned)

2. NATURAL_LANGUAGE: State the pattern in plain English

3. CONFIDENCE: 0.0-1.0 based on:
   - Number of supporting episodes
   - Consistency of evidence
   - Recency of evidence

4. EVIDENCE: Episode IDs that support this

5. CONTRADICTIONS: Any counter-evidence?

6. TEMPORAL_SCOPE: When does this apply?

Only output patterns with confidence >= 0.6

Output as JSON array.
```

### 13.4 Correction Analysis Prompt

```
A memory error has been detected in the Tiny Seed Farm system.

ORIGINAL MEMORY:
{{original_memory}}

CORRECTION:
{{correction}}

ERROR TYPE: {{error_type}}

Analyze this correction to help the system learn:

1. ROOT_CAUSE: Why did this error occur?
   - Data entry mistake
   - Outdated information
   - Incorrect inference
   - Missing context
   - Conflicting sources

2. PATTERN_IMPACT: Which learned patterns might be affected?
   List pattern IDs that used this memory as evidence.

3. SIMILAR_RISKS: Are there other memories that might have the same error?
   Describe characteristics to search for.

4. PREVENTION: How can we prevent this error type in the future?
   - New validation rule?
   - Required field?
   - Cross-check process?

5. SEVERITY: LOW | MEDIUM | HIGH
   Based on how much this affects other knowledge.

Output as JSON.
```

---

## PART 14: MONITORING & MAINTENANCE

### 14.1 Health Metrics

Track daily:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Retrieval Latency | <2s | >5s |
| Embedding Generation | <3s | >10s |
| Consolidation Runtime | <5min | >15min |
| Memory Index Size | <500K rows | >800K rows |
| Daily Corrections | <5% of entries | >10% |
| Cross-Brand Detection | >90% recall | <70% |
| Entity Resolution | >95% accuracy | <85% |

### 14.2 Maintenance Tasks

| Task | Frequency | Description |
|------|-----------|-------------|
| Decay Calculation | Daily 3am | Update current_relevance |
| Consolidation | Weekly Sunday | Episodic->Semantic |
| Archiving Check | Monthly 1st | Identify archive candidates |
| Embedding Refresh | Quarterly | Re-embed with latest model |
| Pattern Review | Seasonal | Human review of low-confidence patterns |
| System Backup | Daily | Export all sheets |
| Performance Report | Weekly | Generate stats email |

### 14.3 Backup Strategy

```javascript
async function backupMemorySystem() {
  const timestamp = new Date().toISOString().split('T')[0];
  const backupFolderId = 'YOUR_BACKUP_FOLDER_ID';

  const sheetsToBackup = [
    'AI_MEMORY_INDEX',
    'EPISODIC_MEMORY',
    'SEMANTIC_MEMORY',
    'ENTITIES',
    'ENTITY_RELATIONSHIPS',
    'CORRECTIONS'
  ];

  for (const sheetName of sheetsToBackup) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(sheetName);

    // Export as CSV
    const csvContent = convertSheetToCsv(sheet);

    // Save to Drive
    const file = DriveApp.createFile(
      `${sheetName}_backup_${timestamp}.csv`,
      csvContent,
      MimeType.CSV
    );
    file.moveTo(DriveApp.getFolderById(backupFolderId));
  }

  // Also create JSON snapshot of critical data
  const snapshot = await createSystemSnapshot();
  DriveApp.createFile(
    `MEMORY_SNAPSHOT_${timestamp}.json`,
    JSON.stringify(snapshot, null, 2),
    MimeType.PLAIN_TEXT
  ).moveTo(DriveApp.getFolderById(backupFolderId));
}
```

---

## PART 15: SUCCESS CRITERIA

### 15.1 Functional Requirements

| Requirement | Acceptance Criteria |
|-------------|---------------------|
| Memory Creation | Journal entries automatically create memories within 30s |
| Entity Extraction | 90%+ of entities correctly identified |
| Semantic Search | Relevant results in top 3 for 85%+ of queries |
| Temporal Queries | "Same time last year" returns correct data |
| Cross-Brand | Cross-brand events flagged 90%+ of the time |
| Correction | Corrections properly supersede old memories |
| Consolidation | Weekly patterns generated with evidence |
| Retrieval Speed | <2s for typical queries |

### 15.2 Quality Metrics

| Metric | Target | Measurement Method |
|--------|--------|---------------------|
| Retrieval Relevance | >0.7 avg score | User feedback on results |
| Pattern Accuracy | >80% useful | Owner review of patterns |
| Correction Rate | <5% | Corrections / Total Memories |
| Entity Accuracy | >90% | Random sampling review |
| User Satisfaction | >4/5 | Monthly survey |

### 15.3 Long-Term Goals

**Year 1:**
- System operational with all core features
- 1,500+ memories indexed
- 200+ semantic patterns learned
- Owner trusts system for historical queries

**Year 3:**
- System is primary knowledge repository
- AI can answer "what did we learn" questions confidently
- Patterns inform planning decisions
- New employees onboard using memory system

**Year 10:**
- Complete institutional history preserved
- Multi-generational knowledge transfer capability
- AI can reason about long-term trends
- System has prevented repeated mistakes dozens of times

---

## CONCLUSION

This architecture represents the convergence of the best ideas from MemGPT/Letta (self-editing memory), Mem0 (graph-based relational memory), Zep/Graphiti (temporal knowledge graphs), and cutting-edge RAG research. It is specifically designed for:

1. **Google Apps Script constraints** - Works within Sheets limits with clear scaling path
2. **Agricultural domain** - Temporal reasoning, seasonal patterns, multi-crop knowledge
3. **Multi-brand operation** - Cross-pollination of knowledge across Farm, Fleurs, Fungi
4. **Long-term preservation** - 10+ year data integrity with archiving strategy
5. **Self-improvement** - Learns from corrections and consolidates patterns

The implementation phases are realistic for a single developer (Claude Code) to build incrementally, starting with core infrastructure and adding intelligence layers progressively.

**This is not just a database. It is an institutional brain that remembers everything, learns from mistakes, and gets smarter over time.**

---

## RESEARCH SOURCES

This architecture draws from:

- [MemGPT/Letta Documentation](https://docs.letta.com/concepts/memgpt/)
- [Mem0 Research Paper (2025)](https://arxiv.org/abs/2504.19413)
- [Zep: Temporal Knowledge Graph Architecture](https://arxiv.org/abs/2501.07391)
- [RAG Best Practices 2025-2026](https://www.edenai.co/post/the-2025-guide-to-retrieval-augmented-generation-rag)
- [Graph-based Agent Memory Survey (2026)](https://arxiv.org/html/2602.05665)
- [Memory in the Age of AI Agents Survey](https://arxiv.org/abs/2512.13564)
- [Vertex AI Memory Bank](https://cloud.google.com/blog/products/ai-machine-learning/vertex-ai-memory-bank-in-public-preview)
- [ICLR 2026 Workshop on MemAgents](https://openreview.net/pdf?id=U51WxL382H)
- [Agricultural AI Decision Support Systems (2025)](https://www.mdpi.com/2073-4395/15/12/2898)

---

*Document Version: 1.0.0*
*Last Updated: 2026-02-13*
*Author: Claude Opus 4.5 (AI Architect)*
*For: Tiny Seed Farm / Todd Wilson*
