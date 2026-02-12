# Semantic Cache / Cross-Agent Memory Store Evaluation

## For Tiny Seed OS Multi-Agent Architecture

**Date:** 2026-02-12
**Author:** Architecture Evaluation Team
**Status:** Research Complete - Ready for Implementation Decision

---

## EXECUTIVE SUMMARY

A Cross-Agent Memory Store is essential for TinyPM's multi-agent architecture. Based on the research insight that *"A Cross-Agent Memory Store utilizes vector databases and Knowledge Graphs to pool intelligence,"* this evaluation analyzes three implementation options and recommends a phased approach.

**Key Finding:** TinyPM already has a sophisticated single-agent memory system (`memory_engine_v2.py`) with 2,043 lines of code implementing multi-tier memory, BM25+semantic hybrid retrieval, knowledge graphs, and intelligent forgetting. The gap is **cross-agent sharing** - making this memory accessible to all agents without cache poisoning.

**Recommendation:** Start with **Simple JSON with embeddings** (Option 2) using the existing infrastructure, then graduate to **SQLite + vector extension** (Option 3) for production.

---

## THE PROBLEM WE'RE SOLVING

### Current State
- **PM Brain** has Mem0-style memory (facts, relationships, context) in `.pm_memory.json`
- **Memory Engine v2** has sophisticated 4-tier memory (working/episodic/semantic/procedural)
- **Knowledge Graph** tracks entities and relationships
- **BUT:** Each agent session operates in isolation

### What Agents Need to Share
1. **What's been built** - Completed tasks, deployed features, created files
2. **What's in progress** - Current assignments, blockers, dependencies
3. **Codebase knowledge** - File locations, function purposes, API endpoints
4. **Decisions made** - Why certain approaches were chosen
5. **User preferences** - Owner's communication style, priorities

### Why This Matters
Without shared memory:
- Agents duplicate work (e.g., creating functions that already exist)
- Agents give contradictory answers about system state
- Context is lost between sessions
- Token budgets burn on re-explaining context

---

## OPTIONS COMPARISON

| Criterion | Mem0 (Option 1) | Simple JSON + Embeddings (Option 2) | SQLite + Vector (Option 3) |
|-----------|-----------------|--------------------------------------|----------------------------|
| **Complexity** | Medium-High | Low | Medium |
| **Setup Time** | 2-4 hours | 30 minutes | 1-2 hours |
| **External Dependencies** | Mem0 Cloud or self-hosted | None | sqlite-vec (single file) |
| **Performance** | Excellent (91% lower latency) | Good for <10K items | Excellent (millions of items) |
| **Cost** | $0-99/month (cloud) | Free | Free |
| **Vector Search** | Native (hybrid vector+graph) | Simple cosine similarity | Native HNSW index |
| **Knowledge Graph** | Native (Graphiti integration) | Manual implementation | Manual implementation |
| **Cross-Agent Safety** | Built-in isolation | Manual file locking | SQLite transactions |
| **Offline Support** | No (cloud) / Yes (self-hosted) | Yes | Yes |
| **Our Fit** | Overkill for current scale | Perfect for now | Perfect for production |

### Detailed Analysis

#### Option 1: Mem0 (Hybrid Vector+Graph Memory)

**What it is:** Production-grade memory layer with 41K+ GitHub stars, used by AWS Agent SDK, CrewAI.

**Pros:**
- Industry-leading performance (91% latency reduction, 90% token cost reduction)
- Hybrid vector + graph architecture out of the box
- SOC 2 & HIPAA compliant (cloud version)
- Built-in deduplication and conflict resolution
- 26% accuracy improvement over baseline

**Cons:**
- External dependency (API calls or self-hosting)
- Cloud version has recurring cost
- Self-hosted version requires infrastructure
- May be overkill for current 5-10 agent scale

**Implementation Effort:**
```python
# Mem0 Cloud integration (if chosen)
from mem0 import Memory

memory = Memory(
    api_key=os.getenv("MEM0_API_KEY"),
    organization_id="tiny_seed_farm"
)

# Store cross-agent memory
memory.add(
    messages=[{"role": "assistant", "content": content}],
    user_id=f"tinyseed_{agent_role}",
    agent_id="tinyseed_shared_memory",
    metadata={"source_agent": agent_role, "confidence": confidence}
)

# Retrieve with semantic search
results = memory.search(query, user_id="tinyseed_shared", limit=10)
```

**Verdict:** Reserve for future when scale demands it.

---

#### Option 2: Simple JSON with Embeddings (RECOMMENDED FOR NOW)

**What it is:** Leverage existing `memory_engine_v2.py` with shared file access and simple vector similarity.

**Pros:**
- Zero external dependencies
- Builds on existing 2,043 lines of sophisticated memory code
- Already has BM25 + semantic hybrid retrieval
- Already has knowledge graph with entity extraction
- File-based = easy debugging and transparency
- Instant implementation

**Cons:**
- File locking needed for concurrent access
- Performance degrades past ~50K items
- No ACID transactions (but we're not banking)

**Implementation Effort:**
```python
# Already exists in memory_engine_v2.py!
from memory_engine_v2 import get_memory_system

memory = get_memory_system()

# Store shared knowledge
memory.add(
    content="PM_Architect completed auth-guard.js implementation",
    tier=MemoryTier.SEMANTIC,
    importance=0.8,
    metadata={"source_agent": "pm_architect", "shared": True}
)

# Retrieve for any agent
results = memory.retrieve("authentication implementation", top_k=5)
```

**What's Missing (Must Add):**
1. **Shared memory file location** - Single source of truth
2. **Agent attribution** - Track which agent wrote what
3. **Verification status** - Mark items as verified/unverified
4. **Conflict detection** - Alert on contradictory memories

**Verdict:** Best fit for current needs. Extend existing system.

---

#### Option 3: SQLite + Vector Extension (RECOMMENDED FOR PRODUCTION)

**What it is:** SQLite with `sqlite-vec` extension for native vector search, plus SQL for structured queries.

**Pros:**
- Single file database (no server)
- ACID transactions (safe concurrent access)
- Native vector search (HNSW algorithm)
- SQL queries for complex filtering
- Scales to millions of records
- Zero network latency

**Cons:**
- Requires `sqlite-vec` extension installation
- Slightly more complex than JSON
- Need to define schema upfront

**Implementation Effort:**
```python
import sqlite3
import sqlite_vec
from typing import List

# Initialize database
db = sqlite3.connect("shared_agent_memory.db")
db.enable_load_extension(True)
sqlite_vec.load(db)

# Create tables
db.execute("""
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    embedding vec_f32(384),  -- dimension depends on model
    source_agent TEXT,
    memory_type TEXT,
    importance REAL DEFAULT 0.5,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accessed_at TIMESTAMP,
    access_count INTEGER DEFAULT 0
)
""")

db.execute("""
CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    name TEXT,
    entity_type TEXT,
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    mention_count INTEGER DEFAULT 1
)
""")

db.execute("""
CREATE TABLE IF NOT EXISTS relationships (
    id TEXT PRIMARY KEY,
    from_entity TEXT REFERENCES entities(id),
    to_entity TEXT REFERENCES entities(id),
    relation_type TEXT,
    source_memory TEXT REFERENCES memories(id),
    created_at TIMESTAMP
)
""")

# Vector search
def search_memories(query_embedding: List[float], top_k: int = 10):
    return db.execute("""
        SELECT id, content, importance,
               vec_distance_cosine(embedding, ?) as distance
        FROM memories
        WHERE verified = TRUE OR importance > 0.7
        ORDER BY distance
        LIMIT ?
    """, (query_embedding, top_k)).fetchall()
```

**Verdict:** Ideal for production deployment. Implement after JSON version proves the concept.

---

## RECOMMENDED APPROACH

### Phase 1: Extend Existing System (This Week)

**What:** Add cross-agent sharing to `memory_engine_v2.py`

**Implementation Steps:**

1. **Create shared memory directory:**
```
/Users/samanthapollack/Documents/TIny_Seed_OS/shared_memory/
  ├── agent_memories.json      # Shared semantic memories
  ├── codebase_knowledge.json  # What's built, where files are
  ├── decisions.json           # Decisions and rationale
  ├── work_in_progress.json    # Current agent assignments
  └── verification_queue.json  # Items needing human verification
```

2. **Add agent attribution to MemoryItem:**
```python
@dataclass
class MemoryItem:
    # ... existing fields ...
    source_agent: str = "unknown"        # Which agent wrote this
    verified: bool = False               # Human-verified?
    verification_source: str = ""        # How was it verified?
    confidence: float = 0.5              # Agent's confidence in this fact
    contradicts: List[str] = field(default_factory=list)  # IDs of contradicting memories
```

3. **Create SharedMemoryStore class:**
```python
class SharedMemoryStore:
    """Cross-agent memory with conflict detection."""

    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.lock_file = base_dir / ".lock"

    def add_with_verification(self, item: MemoryItem) -> MemoryItem:
        """Add memory with automatic conflict detection."""
        # Check for existing similar memories
        similar = self.find_similar(item.content, threshold=0.85)

        if similar:
            # Check for contradictions
            for existing in similar:
                if self._is_contradiction(item.content, existing.content):
                    item.contradicts.append(existing.id)
                    self._flag_for_review(item, existing)

        # Acquire file lock
        with self._file_lock():
            self._save_item(item)

        return item

    def _is_contradiction(self, new: str, existing: str) -> bool:
        """Simple contradiction detection."""
        # Look for negation patterns
        negation_pairs = [
            ("completed", "not completed"),
            ("working", "broken"),
            ("exists", "doesn't exist"),
            ("deployed", "not deployed"),
        ]
        for pos, neg in negation_pairs:
            if (pos in new and neg in existing) or (neg in new and pos in existing):
                return True
        return False
```

### Phase 2: SQLite Migration (Next Month)

**What:** Migrate to SQLite + sqlite-vec for production

**When:** After shared JSON proves the concept and we have >5K shared memories

**Migration Script:**
```python
def migrate_json_to_sqlite():
    """One-time migration from JSON to SQLite."""
    # Load existing memories
    json_store = SharedMemoryStore(SHARED_MEMORY_DIR)
    all_memories = json_store.get_all()

    # Create SQLite database
    db = create_sqlite_database()

    # Migrate with embeddings
    for memory in all_memories:
        embedding = compute_embedding(memory.content)
        insert_memory(db, memory, embedding)

    # Verify migration
    assert db.execute("SELECT COUNT(*) FROM memories").fetchone()[0] == len(all_memories)
```

### Phase 3: Consider Mem0 (Future)

**When:** If/when any of these become true:
- Agent count exceeds 20
- Memory count exceeds 500K items
- Need multi-tenant isolation
- Compliance requirements (SOC 2, HIPAA)

---

## IMPLEMENTATION PLAN

### Files to Create

```
shared_memory/
  ├── __init__.py              # Package init
  ├── store.py                 # SharedMemoryStore class
  ├── conflict_detector.py     # Contradiction detection
  ├── verification.py          # Human verification queue
  └── embeddings.py            # Embedding generation
```

### Storage Location

**Primary:** `/Users/samanthapollack/Documents/TIny_Seed_OS/shared_memory/`

**Rationale:**
- Within project directory for git tracking
- Separate from tinypm for clarity
- Easy to backup and version control

### Query Interface

```python
from shared_memory import SharedMemory

# Initialize (lazy singleton)
memory = SharedMemory.get_instance()

# Store knowledge
memory.store(
    content="API endpoint /getUsers returns all users from USERS sheet",
    agent="backend_claude",
    memory_type="codebase_knowledge",
    confidence=0.95
)

# Query by semantic similarity
results = memory.search(
    query="how to get user data",
    top_k=5,
    verified_only=False  # Include unverified in search
)

# Get codebase knowledge specifically
codebase = memory.get_codebase_knowledge(
    topic="authentication",
    verified_only=True
)

# Check what's in progress
wip = memory.get_work_in_progress(
    agent="*"  # All agents
)
```

---

## INTEGRATION WITH AGENTS

### How Agents Read from Shared Memory

**Cold Start Protocol (CLAUDE.md addition):**
```markdown
## STEP 0: LOAD SHARED MEMORY CONTEXT

Before starting work, load cross-agent context:

```python
from shared_memory import SharedMemory

memory = SharedMemory.get_instance()

# Get recent codebase changes
recent_changes = memory.get_recent(hours=24, limit=20)

# Get knowledge relevant to your role
if role == "backend_claude":
    relevant = memory.search("apps_script API endpoints functions")
elif role == "desktop_claude":
    relevant = memory.search("HTML frontend authentication")

# Get work in progress to avoid conflicts
wip = memory.get_work_in_progress()
for item in wip:
    if item.affects_files_i_might_touch():
        LOG_WARNING(f"Agent {item.source_agent} is working on {item.files}")
```
```

### How Agents Write to Shared Memory

**After completing work:**
```python
# Store what was done
memory.store(
    content=f"Created auth-guard.js with session validation for all protected pages",
    agent=MY_ROLE,
    memory_type="codebase_knowledge",
    confidence=0.9,
    related_files=["web_app/auth-guard.js"],
    tags=["authentication", "frontend", "security"]
)

# Mark decision for future reference
memory.store(
    content="Decided to use session storage instead of cookies for auth tokens because of CORS issues with Google Apps Script",
    agent=MY_ROLE,
    memory_type="decision",
    confidence=1.0,
    related_files=["web_app/auth-guard.js", "apps_script/MERGED TOTAL.js"],
    tags=["authentication", "architecture_decision"]
)
```

### How to Prevent Cache Poisoning

Based on the research, cache poisoning occurs when:
1. An agent stores incorrect information
2. Other agents retrieve and act on that incorrect information
3. Errors propagate through the system

**Prevention Mechanisms:**

#### 1. Source Attribution
Every memory entry includes:
- `source_agent`: Which agent wrote this
- `confidence`: How confident the agent was
- `created_at`: When it was written
- `verification_status`: unverified/verified/disputed

#### 2. Confidence Thresholds
```python
def retrieve_for_action(query: str) -> List[MemoryItem]:
    """Only return high-confidence or verified memories for actions."""
    results = memory.search(query, top_k=20)

    actionable = [
        r for r in results
        if r.verified or r.confidence >= 0.85
    ]

    return actionable
```

#### 3. Contradiction Detection
```python
def detect_contradictions(new_item: MemoryItem) -> List[MemoryItem]:
    """Find existing memories that contradict the new one."""
    similar = memory.search(new_item.content, top_k=10)

    contradictions = []
    for existing in similar:
        # Use LLM to check for semantic contradiction
        if is_contradictory(new_item.content, existing.content):
            contradictions.append(existing)
            # Flag both for human review
            flag_for_review(new_item, existing, reason="potential_contradiction")

    return contradictions
```

#### 4. Human Verification Queue
```python
class VerificationQueue:
    """Items flagged for human review."""

    def add_to_queue(self, item: MemoryItem, reason: str):
        """Add item to verification queue."""
        entry = {
            "item_id": item.id,
            "content": item.content,
            "source_agent": item.source_agent,
            "reason": reason,
            "created_at": datetime.now().isoformat(),
            "status": "pending"
        }
        self._save_to_queue(entry)

    def get_pending(self) -> List[Dict]:
        """Get items awaiting human verification."""
        return [e for e in self.queue if e["status"] == "pending"]

    def verify(self, item_id: str, verified: bool, notes: str = ""):
        """Human marks item as verified or rejected."""
        item = memory.get(item_id)
        item.verified = verified
        item.verification_source = "human"
        item.verification_notes = notes
        memory.update(item)
```

#### 5. Automatic Expiry
```python
def apply_memory_decay():
    """Expire unverified memories over time."""
    for item in memory.get_unverified():
        age_days = (datetime.now() - item.created_at).days

        # Unverified memories decay faster
        if not item.verified:
            item.confidence *= 0.95 ** age_days  # 5% decay per day

            if item.confidence < 0.3:
                item.state = MemoryState.EXPIRED
                log(f"Expired unverified memory: {item.id}")
```

---

## SUCCESS METRICS

### Phase 1 Success Criteria
- [ ] Shared memory directory created and accessible
- [ ] At least 3 agents successfully reading shared memory
- [ ] At least 3 agents successfully writing shared memory
- [ ] Zero duplicate work incidents in 2 weeks
- [ ] Contradiction detection working (manual test)

### Phase 2 Success Criteria
- [ ] SQLite migration complete
- [ ] <50ms query latency for vector search
- [ ] Knowledge graph with >100 entities
- [ ] Automated conflict detection working

---

## APPENDIX: EXISTING CODE TO LEVERAGE

### From `memory_engine_v2.py` (2,043 lines)

Already implemented and ready to extend:
- `MemoryItem` dataclass with importance scoring
- `BM25Index` for keyword search
- `SimpleEmbedding` for vector similarity
- `HybridRetriever` combining BM25 + semantic + RRF
- `TemporalKnowledgeGraph` with entity extraction
- `MemoryConsolidator` for episodic -> semantic promotion
- `ForgettingMechanism` with Ebbinghaus decay
- Multi-tier stores (Working, Episodic, Semantic, Procedural)

### From `pm_brain.py` (2,082 lines)

- `load_memory()` / `save_memory()` patterns
- `add_context()` for rolling context buffer
- `record_interaction()` for pattern learning
- `ConfidenceScorer` for calibrated confidence
- `TimingIntelligence` for optimal suggestion timing
- `StyleLearner` for communication style

### From Research Reports

- `MULTI_AGENT_MEMORY_RESEARCH_REPORT.md` - Comprehensive 2025-2026 best practices
- `SOTA_MULTI_AGENT_RESEARCH_2026.md` - Competitive analysis and patterns
- `PROACTIVE_AI_RESEARCH_2026.md` - Anticipatory suggestions

---

## NEXT STEPS

1. **Immediate (Today):** Create `shared_memory/` directory structure
2. **This Week:** Implement `SharedMemoryStore` class extending existing code
3. **Week 2:** Add to CLAUDE.md cold start protocol
4. **Week 3:** Implement contradiction detection
5. **Month 2:** Evaluate SQLite migration based on usage

---

**Document Status:** Ready for implementation decision

**Recommended Decision:** Proceed with Option 2 (Simple JSON + Embeddings) extending existing `memory_engine_v2.py`, with clear migration path to Option 3 (SQLite + Vector) at scale.
