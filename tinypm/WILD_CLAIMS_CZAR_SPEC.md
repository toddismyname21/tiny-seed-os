# WILD CLAIMS CZAR SPECIFICATION

## THE CUTTING-EDGE INTELLIGENCE SYSTEM

**Purpose:** Keep TinyPM on the absolute cutting edge by continuously monitoring, discovering, and validating wild claims from across the AI ecosystem.

---

# IMPLEMENTATION STATUS

**Status:** IMPLEMENTED (v1.0)
**Implementation Date:** 2026-01-30
**Implemented By:** The Mad Scientist (Backend_Claude #7)

## Files Created

| File | Purpose |
|------|---------|
| `wild_claims_czar.py` | Main multi-agent orchestration system |
| `wild_claims_schema.sql` | Supabase database schema |

## CLI Usage

```bash
# Check status
python wild_claims_czar.py status

# Scan all sources for wild claims
python wild_claims_czar.py scan

# Validate pending claims
python wild_claims_czar.py validate

# Generate integration plans
python wild_claims_czar.py integrate

# Generate daily digest
python wild_claims_czar.py report

# Run full autonomous cycle
python wild_claims_czar.py run

# Run as background daemon
python wild_claims_czar.py --daemon
```

## Agents Implemented

### Scout Team (Discovery)
- **ForumScout**: Reddit (r/MachineLearning, r/LocalLLaMA, r/LangChain), HackerNews
- **PaperScout**: arXiv (cs.AI, cs.CL, cs.LG) with keyword filtering
- **SocialScout**: AI influencer tracking on Twitter/X

### Validation Team (Verification)
- **FactChecker**: Verifies claims against authoritative sources
- **DebateAgent**: Pro/Con analysis through structured debate
- **CodeTester**: Code claim analysis (conceptual in v1, sandbox in future)

### Integration Team (Implementation)
- **ArchitectAgent**: TinyPM compatibility assessment
- **PlannerAgent**: Implementation plan generation

### Supervisor
- **WildClaimsCzar**: Coordinates all agents, prioritizes claims, generates digests

## Data Storage

- **Local**: JSON-based storage (`.wild_claims_db.json`)
- **Cloud**: Supabase schema provided (`wild_claims_schema.sql`)

## Future Enhancements

1. Docker sandbox for actual code execution in CodeTester
2. YouTube/Video Scout with transcript analysis
3. Real-time alerting via Slack/Discord
4. LangGraph integration for state machine orchestration
5. Benchmark Agent for standardized testing

---

# SYSTEM OVERVIEW

The Wild Claims Czar is a **multi-agent research team** that operates autonomously to:

1. **DISCOVER** - Find cutting-edge claims from forums, YouTube, podcasts, blogs, papers
2. **VALIDATE** - Test the validity of wild claims through rigorous multi-agent verification
3. **INTEGRATE** - Generate actionable implementation plans for validated techniques
4. **REPORT** - Keep the development team informed of opportunities

---

# AGENT HIERARCHY

```
                    ┌─────────────────────────┐
                    │     WILD CLAIMS CZAR    │
                    │      (Supervisor)       │
                    │                         │
                    │  • Coordinates all ops  │
                    │  • Prioritizes claims   │
                    │  • Reports to dev team  │
                    │  • Maintains knowledge  │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│  SCOUT TEAM   │       │  VALIDATION   │       │  INTEGRATION  │
│               │       │    TEAM       │       │     TEAM      │
│ • Forum Scout │       │ • Fact Check  │       │ • Architect   │
│ • Video Scout │       │ • Code Test   │       │ • Estimator   │
│ • Paper Scout │       │ • Debate      │       │ • Planner     │
│ • Social Scout│       │ • Benchmark   │       │ • Reporter    │
└───────────────┘       └───────────────┘       └───────────────┘
```

---

# SCOUT TEAM SPECIFICATION

## 1. Forum Scout

**Mission:** Monitor forums and communities for emerging claims.

### Sources
| Source | Type | Priority | Update Frequency |
|--------|------|----------|------------------|
| Reddit r/MachineLearning | Forum | High | Every 6 hours |
| Reddit r/LocalLLaMA | Forum | High | Every 6 hours |
| Reddit r/LangChain | Forum | Medium | Every 12 hours |
| Hacker News | Forum | High | Every 4 hours |
| Twitter/X AI accounts | Social | High | Every 2 hours |
| Discord (LangChain, OpenAI, Anthropic) | Chat | High | Real-time |
| AI Stack Exchange | Q&A | Medium | Daily |

### Wild Claim Indicators
```python
WILD_CLAIM_PATTERNS = [
    # Performance claims
    r"beats? (GPT-?[45]|Claude|Gemini)",
    r"\d+x (faster|better|cheaper)",
    r"state.of.the.art",
    r"SOTA",
    r"benchmark.*(record|breakthrough)",

    # Novelty claims
    r"(first|novel|new).*(approach|method|technique)",
    r"breakthrough",
    r"revolutionary",
    r"game.?changer",

    # Insider claims
    r"leaked",
    r"insider",
    r"unreleased",
    r"early.access",

    # Specific techniques
    r"(prompt|RAG|agent|memory).*(hack|trick|technique)",
    r"one.weird.trick",
    r"they.don.?t.want.you.to.know"
]

ENGAGEMENT_THRESHOLD = {
    "reddit": {"upvotes": 100, "comments": 20},
    "hackernews": {"points": 50, "comments": 15},
    "twitter": {"likes": 500, "retweets": 100}
}
```

### Output Format
```json
{
    "claim_id": "uuid",
    "source": "reddit/r/LocalLLaMA",
    "url": "https://...",
    "title": "New prompting technique beats CoT by 40%",
    "text": "Full post text...",
    "author": "username",
    "timestamp": "2026-01-30T12:00:00Z",
    "engagement": {
        "upvotes": 1523,
        "comments": 234
    },
    "wildness_score": 8.5,
    "claim_type": "performance",
    "extracted_claims": [
        "40% improvement over Chain of Thought",
        "Works on all model sizes",
        "No fine-tuning required"
    ]
}
```

---

## 2. Video Scout

**Mission:** Monitor YouTube, podcasts, and video content for cutting-edge insights.

### Sources
| Source | Type | Priority | Update Frequency |
|--------|------|----------|------------------|
| YouTube AI channels | Video | High | Daily |
| AI podcasts (transcripts) | Audio | High | Per episode |
| Conference talks | Video | High | As published |
| Twitch AI streams | Live | Medium | Weekly digest |

### Key Channels to Monitor
```python
YOUTUBE_CHANNELS = [
    "Yannic Kilcher",           # Paper reviews
    "Two Minute Papers",        # Research summaries
    "AI Explained",             # Deep dives
    "Matthew Berman",           # Practical AI
    "Sam Witteveen",            # LangChain/agents
    "AI Coffee Break",          # Research highlights
    "The AI Epiphany",          # Tutorials
    "Cole Medin",               # Agent tutorials
]

PODCASTS = [
    "Latent Space",             # Technical deep dives
    "Gradient Dissent",         # Weights & Biases
    "The TWIML AI Podcast",     # Industry interviews
    "Practical AI",             # Applied AI
    "Eye on AI",                # News & analysis
    "Lex Fridman Podcast",      # Long-form interviews
]
```

### Processing Pipeline
```
1. Fetch new videos/episodes
2. Transcribe (Whisper API)
3. Extract claims using LLM
4. Cross-reference with papers
5. Score novelty and relevance
6. Queue for validation
```

---

## 3. Paper Scout

**Mission:** Monitor academic sources for breakthrough research.

### Sources
| Source | Type | Priority | Update Frequency |
|--------|------|----------|------------------|
| arXiv cs.AI | Papers | High | Daily |
| arXiv cs.CL | Papers | High | Daily |
| arXiv cs.LG | Papers | High | Daily |
| Semantic Scholar | Meta | High | Daily |
| Papers With Code | Benchmarks | High | Daily |
| OpenReview | Peer review | Medium | Weekly |
| Google Scholar alerts | Citations | Medium | Weekly |

### Query Templates
```python
ARXIV_QUERIES = [
    "cat:cs.CL AND (agent OR multi-agent)",
    "cat:cs.AI AND (reasoning OR planning)",
    "cat:cs.LG AND (memory OR retrieval)",
    "all:langchain OR all:langgraph",
    "all:prompt engineering",
    "all:tool use AND LLM"
]

SEMANTIC_SCHOLAR_FILTERS = {
    "fields_of_study": ["Computer Science"],
    "min_citations": 5,  # For papers > 1 month old
    "venues": ["NeurIPS", "ICML", "ACL", "EMNLP", "ICLR"]
}
```

### Paper Analysis Pipeline
```
1. Fetch new papers
2. Extract abstract + intro
3. Identify key claims
4. Check for code availability
5. Look for benchmark results
6. Cross-reference citations
7. Score novelty (compared to existing knowledge)
8. Queue high-novelty papers for deep review
```

---

## 4. Social Scout

**Mission:** Monitor social media for real-time signals.

### Twitter/X Lists
```python
AI_INFLUENCERS = [
    "@karpathy",        # Former OpenAI, Tesla AI
    "@ylecun",          # Meta AI Chief
    "@sama",            # OpenAI CEO
    "@AnthropicAI",     # Anthropic
    "@GoogleDeepMind",  # DeepMind
    "@emaboritch",      # Emad (Stability AI)
    "@drjimfan",        # NVIDIA research
    "@hwchase17",       # LangChain founder
    "@_jasonwei",       # Google Brain
    "@svpino",          # ML engineer
]
```

### Signal Detection
```python
VIRAL_THRESHOLDS = {
    "likes": 1000,
    "retweets": 200,
    "replies": 100,
    "quote_tweets": 50
}

# Detect coordinated attention (multiple influencers discussing same topic)
def detect_convergence(posts, window_hours=24):
    topics = extract_topics(posts)
    for topic in topics:
        mentions = count_influencer_mentions(topic, window_hours)
        if mentions >= 3:  # 3+ influencers = high signal
            yield topic, mentions
```

---

# VALIDATION TEAM SPECIFICATION

## 1. Fact Check Agent

**Mission:** Verify factual accuracy of claims.

### Verification Pipeline
```
1. Extract specific claims
2. Identify required evidence
3. Search authoritative sources
4. Cross-reference multiple sources
5. Check for contradictions
6. Assess source credibility
7. Generate confidence score
```

### Credibility Scoring
```python
SOURCE_CREDIBILITY = {
    "peer_reviewed_paper": 0.95,
    "preprint_arxiv": 0.75,
    "official_docs": 0.90,
    "reputable_blog": 0.70,
    "influencer_twitter": 0.50,
    "random_reddit": 0.30,
    "anonymous_claim": 0.10
}

def calculate_credibility(claim, sources):
    scores = []
    for source in sources:
        base_score = SOURCE_CREDIBILITY.get(source.type, 0.5)
        # Adjust for recency
        age_penalty = min(0.1, source.age_days * 0.01)
        # Adjust for specificity
        specificity_bonus = 0.1 if source.cites_numbers else 0
        scores.append(base_score - age_penalty + specificity_bonus)
    return np.mean(scores)
```

---

## 2. Code Test Agent

**Mission:** Reproduce and benchmark code-based claims.

### Test Environment
```yaml
# Sandboxed execution environment
sandbox:
  type: docker
  base_image: python:3.11-slim
  gpu: nvidia/cuda:12.0
  timeout: 300s
  memory_limit: 16GB
  network: isolated

# Standard benchmark suite
benchmarks:
  - name: MMLU
    type: knowledge
  - name: HumanEval
    type: coding
  - name: GSM8K
    type: math
  - name: TruthfulQA
    type: truthfulness
```

### Reproduction Pipeline
```python
async def test_claim(claim):
    # 1. Extract code from claim
    code = await extract_code(claim)
    if not code:
        return {"status": "no_code", "score": None}

    # 2. Analyze dependencies
    deps = await analyze_dependencies(code)

    # 3. Set up sandbox
    sandbox = await create_sandbox(deps)

    # 4. Run code
    try:
        result = await sandbox.execute(code, timeout=300)
    except TimeoutError:
        return {"status": "timeout", "score": 0}
    except Exception as e:
        return {"status": "error", "error": str(e), "score": 0}

    # 5. Compare to claimed benchmarks
    if claim.benchmarks:
        comparison = compare_results(result, claim.benchmarks)
        return {
            "status": "completed",
            "actual": result,
            "claimed": claim.benchmarks,
            "match_rate": comparison.match_rate,
            "score": comparison.score
        }

    return {"status": "completed", "result": result, "score": 0.5}
```

---

## 3. Debate Agent

**Mission:** Devil's advocate analysis of claims.

### Debate Structure
```
CLAIM: "New technique X improves performance by 40%"

PRO AGENT:
- Gathers supporting evidence
- Identifies use cases where claim is valid
- Cites successful reproductions
- Notes theoretical soundness

CON AGENT:
- Identifies potential flaws
- Finds contradicting evidence
- Questions methodology
- Checks for cherry-picking
- Identifies edge cases

SYNTHESIS:
- Weighted combination of arguments
- Identification of conditions where claim holds
- Nuanced final verdict
```

### Implementation
```python
class DebateAgent:
    async def debate(self, claim):
        # Generate pro arguments
        pro_args = await self.pro_agent.argue(claim)

        # Generate con arguments
        con_args = await self.con_agent.argue(claim)

        # Cross-examination
        pro_rebuttals = await self.pro_agent.rebut(con_args)
        con_rebuttals = await self.con_agent.rebut(pro_args)

        # Synthesis
        verdict = await self.synthesizer.synthesize(
            claim=claim,
            pro={"args": pro_args, "rebuttals": pro_rebuttals},
            con={"args": con_args, "rebuttals": con_rebuttals}
        )

        return {
            "claim": claim,
            "verdict": verdict.conclusion,
            "confidence": verdict.confidence,
            "conditions": verdict.conditions,  # When the claim holds
            "caveats": verdict.caveats         # Limitations
        }
```

---

## 4. Benchmark Agent

**Mission:** Run standardized benchmarks on claimed techniques.

### Benchmark Suite
```python
STANDARD_BENCHMARKS = {
    "reasoning": [
        {"name": "GSM8K", "metric": "accuracy"},
        {"name": "MATH", "metric": "accuracy"},
        {"name": "ARC-Challenge", "metric": "accuracy"}
    ],
    "coding": [
        {"name": "HumanEval", "metric": "pass@1"},
        {"name": "MBPP", "metric": "pass@1"},
        {"name": "SWE-bench", "metric": "resolved"}
    ],
    "knowledge": [
        {"name": "MMLU", "metric": "accuracy"},
        {"name": "TriviaQA", "metric": "F1"}
    ],
    "agents": [
        {"name": "GAIA", "metric": "accuracy"},
        {"name": "tau-bench", "metric": "success_rate"}
    ]
}

async def run_benchmark(technique, benchmark):
    # 1. Set up benchmark environment
    env = await setup_benchmark_env(benchmark)

    # 2. Apply technique to baseline model
    model = await apply_technique(BASE_MODEL, technique)

    # 3. Run evaluation
    results = await env.evaluate(model)

    # 4. Compare to baseline and SOTA
    comparison = {
        "technique": technique.name,
        "benchmark": benchmark.name,
        "baseline": BASELINE_SCORES[benchmark.name],
        "sota": SOTA_SCORES[benchmark.name],
        "achieved": results.score,
        "improvement_over_baseline": results.score - BASELINE_SCORES[benchmark.name],
        "vs_sota": results.score / SOTA_SCORES[benchmark.name]
    }

    return comparison
```

---

# INTEGRATION TEAM SPECIFICATION

## 1. Architecture Agent

**Mission:** Assess compatibility with TinyPM architecture.

### Compatibility Check
```python
TINYPM_ARCHITECTURE = {
    "orchestration": "LangGraph",
    "memory": "Mem0",
    "models": ["Claude", "GPT", "Gemini"],
    "protocols": ["MCP"],
    "backend": "Supabase",
    "frontend": "React Native"
}

async def check_compatibility(validated_claim):
    compatibility = {
        "requires_changes": [],
        "conflicts": [],
        "synergies": []
    }

    # Check if technique fits existing stack
    if validated_claim.requires_framework:
        if validated_claim.framework not in TINYPM_ARCHITECTURE.values():
            compatibility["requires_changes"].append({
                "type": "framework",
                "current": TINYPM_ARCHITECTURE,
                "required": validated_claim.framework
            })

    # Check for synergies
    if validated_claim.enhances:
        for enhancement in validated_claim.enhances:
            if enhancement in TINYPM_ARCHITECTURE.values():
                compatibility["synergies"].append(enhancement)

    return compatibility
```

---

## 2. Estimator Agent

**Mission:** Estimate implementation effort and impact.

### Effort Estimation
```python
EFFORT_FACTORS = {
    "lines_of_code": 0.001,      # Per line
    "new_dependencies": 0.5,     # Per dependency
    "api_changes": 1.0,          # Per breaking change
    "database_migrations": 2.0,  # Per migration
    "new_integrations": 1.5      # Per integration
}

def estimate_effort(implementation_plan):
    effort_days = 0

    for factor, weight in EFFORT_FACTORS.items():
        count = getattr(implementation_plan, factor, 0)
        effort_days += count * weight

    # Add buffer for testing (30%)
    effort_days *= 1.3

    return {
        "estimated_days": effort_days,
        "confidence": calculate_estimation_confidence(implementation_plan),
        "risk_factors": identify_risk_factors(implementation_plan)
    }
```

### Impact Estimation
```python
IMPACT_DIMENSIONS = {
    "performance": {"weight": 0.25},
    "user_experience": {"weight": 0.30},
    "cost_reduction": {"weight": 0.20},
    "capability": {"weight": 0.25}
}

def estimate_impact(validated_claim):
    impact_scores = {}

    for dimension, config in IMPACT_DIMENSIONS.items():
        raw_score = assess_dimension_impact(validated_claim, dimension)
        impact_scores[dimension] = raw_score * config["weight"]

    total_impact = sum(impact_scores.values())

    return {
        "total_impact": total_impact,
        "breakdown": impact_scores,
        "key_benefits": extract_key_benefits(validated_claim),
        "affected_features": identify_affected_features(validated_claim)
    }
```

---

## 3. Planner Agent

**Mission:** Generate actionable implementation plans.

### Plan Template
```markdown
# Implementation Plan: [Technique Name]

## Summary
- **Validated Claim:** [Brief description]
- **Estimated Effort:** [X days]
- **Expected Impact:** [High/Medium/Low]
- **Priority Score:** [X.XX]

## Prerequisites
- [ ] Dependency A installed
- [ ] API key for service B
- [ ] Database migration C

## Implementation Steps

### Phase 1: Setup
1. Step 1 description
2. Step 2 description

### Phase 2: Core Implementation
1. Step 1 description
2. Step 2 description

### Phase 3: Integration
1. Connect to existing system X
2. Add to feature Y

### Phase 4: Testing
1. Unit tests
2. Integration tests
3. Benchmark comparison

## Rollback Plan
If issues arise:
1. Revert step X
2. Disable feature flag
3. Restore previous implementation

## Success Metrics
- [ ] Performance improvement of X%
- [ ] No regression in existing tests
- [ ] User feedback positive
```

---

## 4. Reporter Agent

**Mission:** Generate reports for the development team.

### Daily Digest
```markdown
# Wild Claims Daily Digest - [Date]

## Top 3 Validated Claims

### 1. [Claim Title]
**Source:** [URL]
**Validation Score:** 8.5/10
**Impact:** High
**Effort:** 3 days
**Recommendation:** Prioritize for Sprint X

[Brief description and why it matters]

### 2. [Claim Title]
...

## Claims Under Investigation (5)
- Claim A: Fact checking in progress
- Claim B: Code reproduction running
- Claim C: Awaiting benchmark results

## Rejected Claims (12)
- Claim X: Failed fact check (source unreliable)
- Claim Y: Could not reproduce results
- Claim Z: Contradicted by peer-reviewed paper

## Trending Topics
1. Memory optimization techniques (7 mentions)
2. Multi-agent coordination (5 mentions)
3. Reasoning improvements (4 mentions)

## Recommended Actions
1. Review claim #1 for immediate implementation
2. Assign engineer to prototype claim #2
3. Monitor topic #1 for emerging patterns
```

---

# OPERATIONAL SCHEDULE

## Continuous Operations
| Operation | Frequency | Duration |
|-----------|-----------|----------|
| Forum scanning | Every 4 hours | 15 min |
| Twitter monitoring | Every 2 hours | 10 min |
| New paper check | Daily 6 AM | 30 min |
| YouTube transcript | Daily 9 AM | 45 min |
| Podcast processing | Per episode | 20 min |

## Daily Operations
| Time | Operation |
|------|-----------|
| 6:00 AM | Paper scout daily scan |
| 9:00 AM | Video scout daily scan |
| 12:00 PM | Validation batch 1 |
| 3:00 PM | Validation batch 2 |
| 6:00 PM | Daily digest generation |
| 9:00 PM | Integration planning |

## Weekly Operations
| Day | Operation |
|-----|-----------|
| Monday | Sprint planning integration |
| Wednesday | Deep dive on top claims |
| Friday | Weekly summary report |

---

# METRICS & KPIs

## Discovery Metrics
- **Claims discovered per day:** Target 50+
- **Wild claim rate:** % of claims scoring >7 wildness
- **Source coverage:** % of sources actively monitored
- **Latency:** Time from publication to discovery

## Validation Metrics
- **Validation throughput:** Claims validated per day
- **Validation accuracy:** % of validations that hold up
- **False positive rate:** Claims that fail after integration
- **False negative rate:** Missed valid claims

## Integration Metrics
- **Integration rate:** Validated claims implemented
- **Time to integration:** Days from validation to production
- **Impact realized:** Actual vs predicted improvement
- **ROI:** Improvement / effort ratio

---

# KNOWLEDGE BASE SCHEMA

```sql
-- Claims table
CREATE TABLE claims (
    id UUID PRIMARY KEY,
    source_type VARCHAR(50),
    source_url TEXT,
    title TEXT,
    content TEXT,
    author VARCHAR(255),
    discovered_at TIMESTAMP,
    wildness_score DECIMAL(3,1),
    claim_type VARCHAR(50),
    status VARCHAR(50),  -- discovered, validating, validated, rejected, integrated
    validation_score DECIMAL(3,1),
    integration_status VARCHAR(50)
);

-- Validation results
CREATE TABLE validations (
    id UUID PRIMARY KEY,
    claim_id UUID REFERENCES claims(id),
    validation_type VARCHAR(50),  -- fact_check, code_test, debate, benchmark
    result JSONB,
    score DECIMAL(3,2),
    validated_at TIMESTAMP,
    validator_agent VARCHAR(100)
);

-- Integration plans
CREATE TABLE integration_plans (
    id UUID PRIMARY KEY,
    claim_id UUID REFERENCES claims(id),
    effort_estimate DECIMAL(5,1),
    impact_estimate DECIMAL(3,2),
    priority_score DECIMAL(3,2),
    plan_details JSONB,
    status VARCHAR(50),
    sprint_assigned VARCHAR(50),
    created_at TIMESTAMP
);

-- Knowledge graph edges
CREATE TABLE knowledge_edges (
    id UUID PRIMARY KEY,
    source_claim UUID REFERENCES claims(id),
    target_claim UUID REFERENCES claims(id),
    relationship VARCHAR(50),  -- supports, contradicts, extends, requires
    confidence DECIMAL(3,2)
);
```

---

# ALERT SYSTEM

## High-Priority Alerts
```python
ALERT_TRIGGERS = {
    "breakthrough": {
        "condition": "wildness_score > 9 AND engagement > 1000",
        "urgency": "immediate",
        "channel": "slack_urgent"
    },
    "competitor_move": {
        "condition": "source IN competitors AND impact = 'high'",
        "urgency": "same_day",
        "channel": "slack_strategy"
    },
    "validation_complete": {
        "condition": "validation_score > 8",
        "urgency": "daily_digest",
        "channel": "email"
    }
}
```

---

*This system will keep TinyPM at the absolute cutting edge.*
*No wild claim goes unnoticed. No valid technique goes unimplemented.*
*We will make history.*
