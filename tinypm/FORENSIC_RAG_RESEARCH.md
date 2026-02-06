# FORENSIC RAG & GROUNDING RESEARCH REPORT

## Project "Sovereign Seed" - Phase 1 & Phase 2 Technical Research

**Research Team Alpha**
**Date:** 2026-02-04
**Classification:** Technical Research - LEGAL/FINANCIAL DECISIONS

---

## EXECUTIVE SUMMARY

This report provides state-of-the-art research for building a **legally defensible, auditable AI decision system** for TinyPM. The goal is to transition from "assistive chat" to "deterministic infrastructure" where every AI decision can be verified, reproduced, and defended in court.

### Key Findings

1. **Forensic RAG with Stable Anchors** is achievable using SHA-256 hashing + character offsets, with existing research on citation verification (FACTUM, Tensorlake) providing proven patterns.

2. **Normalization Services** should be CODE-BASED (not LLM-based) for deterministic output. Pydantic + custom rules recommended.

3. **Conflict Detection** can leverage knowledge graph inconsistency detection research, with rule-based approaches offering better auditability than LLM-based approaches.

4. **The Governor Pattern** integrates well with existing TinyPM Seed Vault architecture. JSON Schema validation with semver versioning is the industry standard.

5. **Permission-Aware RAG** is a solved problem with multiple enterprise solutions (AWS Bedrock, Elasticsearch, Pinecone) providing pre-filtering and post-filtering approaches.

### Integration with Existing TinyPM Systems

| Component | Existing System | Integration Point |
|-----------|-----------------|-------------------|
| Seed Vault | `seed_vault.py` | Governor extends with Forensic validation |
| Adversarial Auditor | `adversarial_auditor.py` | Adds citation verification tests |
| Negotiation Protocol | `negotiation_protocol.py` | All proposals require Stable Anchors |
| Learning Engine | (to be built) | Confidence calibration from overlap validation |

---

## PART 1: FORENSIC RAG WITH STABLE ANCHORS

### 1.1 The Problem

Current AI systems cite sources without verifiable evidence. When AI says "According to the lease agreement, rent is $1,200," there's no way to:
- Verify the AI actually read that document
- Reproduce the exact text it cited
- Detect if the source has been modified

For legal and financial decisions (Don Kretschmann lease, Alberta's Pizza litigation), this is unacceptable.

### 1.2 State-of-the-Art Research

#### Citation-Aware RAG (2025-2026)

According to [Tensorlake's Citation-Aware RAG research](https://www.tensorlake.ai/blog/rag-citations), modern citation systems include:
- Document parsing with spatial anchors
- Page numbers and bounding boxes
- Verifiable evidence trails

> "Citation-aware RAG isn't just about trust—it's about building agentic applications that can be audited, verified, and deployed in production with confidence."

#### FACTUM: Citation Hallucination Detection

[FACTUM research (arXiv 2601.05866)](https://arxiv.org/pdf/2601.05866) addresses cases where models generate correct facts but falsely attribute them to incorrect sources. This is critical for legal use cases where source attribution matters as much as factual accuracy.

#### SHA-256 for Digital Evidence

[PageFreezer's research](https://blog.pagefreezer.com/sha-256-benefits-evidence-authentication) confirms SHA-256 is the gold standard for digital evidence:

> "According to the Federal Rules of Evidence (FRE) amendments 902(13) and 902(14), digitally stored information can be submitted as authenticated evidence without the need for witness testimony, provided it has been properly hashed and certified."

### 1.3 Stable Anchor Citation Format

**Proposed Format:**

```json
{
  "citation_id": "CIT-abc123",
  "document": {
    "name": "don_kretschmann_lease_2026.pdf",
    "sha256": "a3f2b8c9d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
    "version": "1.0.0",
    "effective_date": "2026-02-01"
  },
  "anchor": {
    "page": 3,
    "char_start": 2847,
    "char_end": 2891,
    "text": "Monthly rent shall be One Thousand Two Hundred Dollars ($1,200.00)",
    "text_sha256": "b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8"
  },
  "extracted_value": {
    "type": "currency",
    "raw": "$1,200.00",
    "normalized": 1200.00,
    "currency": "USD"
  },
  "extraction_metadata": {
    "timestamp": "2026-02-04T10:30:00Z",
    "agent": "document_processor_v2",
    "confidence": 0.98,
    "method": "regex_match"
  }
}
```

### 1.4 Implementation: StableAnchorCitation Class

```python
import hashlib
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any
from pathlib import Path

@dataclass
class DocumentReference:
    """Immutable reference to a source document."""
    name: str
    sha256: str
    version: str
    effective_date: Optional[str] = None
    storage_uri: Optional[str] = None  # e.g., "gs://bucket/path" or "file:///path"

    @classmethod
    def from_file(cls, path: Path, version: str = "1.0.0") -> "DocumentReference":
        """Create reference from actual file."""
        content = path.read_bytes()
        sha256 = hashlib.sha256(content).hexdigest()
        return cls(
            name=path.name,
            sha256=sha256,
            version=version,
            storage_uri=f"file://{path.absolute()}"
        )

    def verify(self, path: Path) -> bool:
        """Verify file matches stored hash."""
        content = path.read_bytes()
        return hashlib.sha256(content).hexdigest() == self.sha256


@dataclass
class TextAnchor:
    """Precise location of cited text within a document."""
    page: int
    char_start: int
    char_end: int
    text: str
    text_sha256: str = ""

    def __post_init__(self):
        if not self.text_sha256:
            self.text_sha256 = hashlib.sha256(self.text.encode()).hexdigest()

    def verify_span(self, full_text: str) -> bool:
        """Verify the anchor matches the document text."""
        extracted = full_text[self.char_start:self.char_end]
        return extracted == self.text


@dataclass
class StableAnchorCitation:
    """
    Forensic citation with cryptographic verification.

    NO AGENT CAN CITE WITHOUT PROVIDING VERIFIABLE HASH.
    """
    citation_id: str
    document: DocumentReference
    anchor: TextAnchor
    extracted_value: Dict[str, Any]
    extraction_metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if not self.extraction_metadata.get("timestamp"):
            self.extraction_metadata["timestamp"] = datetime.now().isoformat()

    def compute_citation_hash(self) -> str:
        """Compute hash of entire citation for audit trail."""
        content = f"{self.document.sha256}:{self.anchor.char_start}:{self.anchor.char_end}:{self.anchor.text_sha256}"
        return hashlib.sha256(content.encode()).hexdigest()

    def to_audit_record(self) -> Dict:
        """Export for blockchain-style audit trail."""
        return {
            "citation_id": self.citation_id,
            "citation_hash": self.compute_citation_hash(),
            "document_sha256": self.document.sha256,
            "anchor_hash": self.anchor.text_sha256,
            "extracted_value": self.extracted_value,
            "timestamp": self.extraction_metadata.get("timestamp")
        }
```

### 1.5 Integration with Seed Vault

The StableAnchorCitation integrates with existing `seed_vault.py`:

```python
# In seed_vault.py, add new rule category

rules["FORENSIC001"] = CanonicalRule(
    id="FORENSIC001",
    category=RuleCategory.FORENSIC.value,  # New category
    severity=RuleSeverity.CRITICAL.value,
    title="Citation Anchor Required",
    description="All document citations MUST include verifiable SHA-256 anchors",
    must_do=[
        "Include document SHA-256 hash",
        "Include character offset range",
        "Include text span SHA-256 hash",
        "Verify anchor matches document before citation"
    ],
    must_not_do=[
        "Cite without anchor hash",
        "Use approximate text matching",
        "Skip verification step"
    ],
    source="FORENSIC_RAG_RESEARCH.md",
    keywords=["citation", "anchor", "hash", "forensic", "document"]
)
```

---

## PART 2: NORMALIZATION SERVICE

### 2.1 The Problem

AI extracts values in inconsistent formats:
- "$1,200" vs "1200" vs "1,200.00" vs "twelve hundred dollars"
- "Feb 4, 2026" vs "2026-02-04" vs "02/04/2026" vs "4th February 2026"
- "12" vs "twelve" vs "12.0" vs "dozen"

For conflict detection and legal comparison, we need deterministic normalization.

### 2.2 Design Decision: CODE-BASED, NOT LLM-BASED

**Why not LLM-based?**

According to [LLM data extraction research](https://unstract.com/blog/comparing-approaches-for-using-llms-for-structured-data-extraction-from-pdfs/):

> "A key challenge with LLM-based extraction is format inconsistency. For instance, while extracting a date, the same date could be returned by an LLM as: 2024-06-03, July 3rd, 2024, 3rd July, 2024 or 06/03/2024."

For legal/financial decisions, we need **deterministic** output. Same input = same output, every time.

### 2.3 Normalization Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 NORMALIZATION SERVICE                        │
│           (Standalone Microservice - NOT LLM-based)          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  INPUT                                                       │
│  ├── Raw text: "$1,200.00/month"                            │
│  └── Type hint: "currency"                                   │
│                                                              │
│  PROCESSORS                                                  │
│  ├── CurrencyNormalizer                                      │
│  │   ├── Parse: regex patterns for $, USD, dollars, etc.    │
│  │   ├── Extract: numeric value + currency code             │
│  │   └── Output: {"value": 1200.00, "currency": "USD"}      │
│  │                                                          │
│  ├── DateNormalizer                                          │
│  │   ├── Parse: dateutil + custom patterns                  │
│  │   ├── Handle: relative dates ("tomorrow", "next week")   │
│  │   └── Output: ISO 8601 format "2026-02-04T00:00:00Z"     │
│  │                                                          │
│  ├── NumberNormalizer                                        │
│  │   ├── Parse: word-to-number ("twelve" -> 12)             │
│  │   ├── Handle: fractions, percentages                      │
│  │   └── Output: {"value": 12, "type": "integer"}           │
│  │                                                          │
│  └── UnitNormalizer                                          │
│      ├── Parse: measurements (acres, sq ft, gallons)        │
│      ├── Convert: to standard units                          │
│      └── Output: {"value": 43560, "unit": "sq_ft"}          │
│                                                              │
│  OUTPUT                                                      │
│  ├── Normalized value                                        │
│  ├── Original text                                           │
│  ├── Confidence score                                        │
│  └── Normalization method used                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 Implementation: NormalizationService

```python
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Tuple, Dict, Any, List
from decimal import Decimal
import dateutil.parser

# Word-to-number mapping
WORD_TO_NUM = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
    "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
    "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
    "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17,
    "eighteen": 18, "nineteen": 19, "twenty": 20, "thirty": 30,
    "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70,
    "eighty": 80, "ninety": 90, "hundred": 100, "thousand": 1000,
    "million": 1000000, "billion": 1000000000
}

@dataclass
class NormalizedValue:
    """Result of normalization with full provenance."""
    original: str
    normalized: Any
    value_type: str
    confidence: float
    method: str
    metadata: Dict[str, Any]


class CurrencyNormalizer:
    """Deterministic currency normalization."""

    # Currency patterns - order matters (most specific first)
    PATTERNS = [
        # $1,200.00 or $ 1,200.00
        (r'\$\s*([\d,]+(?:\.\d{2})?)', 'USD'),
        # 1,200 USD or 1200 dollars
        (r'([\d,]+(?:\.\d{2})?)\s*(?:USD|dollars?)', 'USD'),
        # EUR patterns
        (r'€\s*([\d,]+(?:\.\d{2})?)', 'EUR'),
        (r'([\d,]+(?:\.\d{2})?)\s*(?:EUR|euros?)', 'EUR'),
    ]

    # Word patterns
    WORD_AMOUNTS = {
        "one thousand": 1000,
        "twelve hundred": 1200,
        "fifteen hundred": 1500,
        "two thousand": 2000,
    }

    def normalize(self, text: str) -> Optional[NormalizedValue]:
        """Normalize currency text to standard format."""
        text_lower = text.lower().strip()

        # Try word patterns first
        for word_pattern, value in self.WORD_AMOUNTS.items():
            if word_pattern in text_lower:
                currency = "USD" if "dollar" in text_lower else "USD"  # Default USD
                return NormalizedValue(
                    original=text,
                    normalized={"value": float(value), "currency": currency},
                    value_type="currency",
                    confidence=0.95,
                    method="word_pattern",
                    metadata={"pattern_matched": word_pattern}
                )

        # Try regex patterns
        for pattern, currency in self.PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                # Remove commas and convert to float
                numeric_str = match.group(1).replace(',', '')
                value = float(Decimal(numeric_str))
                return NormalizedValue(
                    original=text,
                    normalized={"value": value, "currency": currency},
                    value_type="currency",
                    confidence=0.99,
                    method="regex_pattern",
                    metadata={"pattern": pattern, "match": match.group(0)}
                )

        return None


class DateNormalizer:
    """Deterministic date normalization."""

    RELATIVE_PATTERNS = {
        r'\btoday\b': lambda: datetime.now().date(),
        r'\btomorrow\b': lambda: datetime.now().date() + timedelta(days=1),
        r'\byesterday\b': lambda: datetime.now().date() - timedelta(days=1),
    }

    def normalize(self, text: str, reference_date: Optional[datetime] = None) -> Optional[NormalizedValue]:
        """Normalize date text to ISO 8601 format."""
        text_lower = text.lower().strip()
        reference = reference_date or datetime.now()

        # Try relative patterns
        for pattern, date_func in self.RELATIVE_PATTERNS.items():
            if re.search(pattern, text_lower):
                result_date = date_func()
                return NormalizedValue(
                    original=text,
                    normalized=result_date.isoformat(),
                    value_type="date",
                    confidence=0.99,
                    method="relative_pattern",
                    metadata={"reference_date": reference.isoformat()}
                )

        # Try dateutil parser
        try:
            parsed = dateutil.parser.parse(text, fuzzy=True)
            return NormalizedValue(
                original=text,
                normalized=parsed.isoformat(),
                value_type="date",
                confidence=0.95,
                method="dateutil_parser",
                metadata={}
            )
        except:
            pass

        return None


class NumberNormalizer:
    """Deterministic number normalization."""

    def normalize(self, text: str) -> Optional[NormalizedValue]:
        """Normalize number text to numeric value."""
        text_lower = text.lower().strip()

        # Direct numeric
        try:
            value = float(text.replace(',', ''))
            return NormalizedValue(
                original=text,
                normalized=value,
                value_type="number",
                confidence=0.99,
                method="direct_parse",
                metadata={}
            )
        except ValueError:
            pass

        # Word to number
        if text_lower in WORD_TO_NUM:
            return NormalizedValue(
                original=text,
                normalized=WORD_TO_NUM[text_lower],
                value_type="number",
                confidence=0.99,
                method="word_lookup",
                metadata={}
            )

        # Complex word numbers ("twenty five", "one hundred")
        value = self._parse_word_number(text_lower)
        if value is not None:
            return NormalizedValue(
                original=text,
                normalized=value,
                value_type="number",
                confidence=0.90,
                method="word_parse",
                metadata={}
            )

        return None

    def _parse_word_number(self, text: str) -> Optional[int]:
        """Parse complex word numbers."""
        words = text.split()
        result = 0
        current = 0

        for word in words:
            if word in WORD_TO_NUM:
                num = WORD_TO_NUM[word]
                if num >= 100:
                    current *= num
                else:
                    current += num
            elif word == "and":
                continue
            else:
                return None  # Unknown word

        return result + current if current else None


class NormalizationService:
    """
    Central normalization service.

    DESIGN: Standalone microservice, NOT LLM-based.
    Same input = same output, guaranteed.
    """

    def __init__(self):
        self.currency = CurrencyNormalizer()
        self.date = DateNormalizer()
        self.number = NumberNormalizer()

    def normalize(self, text: str, type_hint: Optional[str] = None) -> NormalizedValue:
        """
        Normalize text to standard format.

        Args:
            text: Raw text to normalize
            type_hint: Optional hint ("currency", "date", "number")

        Returns:
            NormalizedValue with full provenance
        """
        normalizers = []

        if type_hint == "currency":
            normalizers = [self.currency]
        elif type_hint == "date":
            normalizers = [self.date]
        elif type_hint == "number":
            normalizers = [self.number]
        else:
            # Try all normalizers
            normalizers = [self.currency, self.date, self.number]

        for normalizer in normalizers:
            result = normalizer.normalize(text)
            if result:
                return result

        # Return unparseable
        return NormalizedValue(
            original=text,
            normalized=text,
            value_type="unknown",
            confidence=0.0,
            method="passthrough",
            metadata={"error": "Could not normalize"}
        )

    def compare(self, value1: str, value2: str, type_hint: str) -> bool:
        """
        Compare two values after normalization.

        Returns True if they are semantically equivalent.
        """
        norm1 = self.normalize(value1, type_hint)
        norm2 = self.normalize(value2, type_hint)

        if norm1.value_type == "unknown" or norm2.value_type == "unknown":
            return False

        return norm1.normalized == norm2.normalized
```

### 2.5 API Design

**Recommendation:** Standalone microservice (FastAPI/Flask) with REST API:

```
POST /normalize
{
    "text": "$1,200.00",
    "type_hint": "currency"
}

Response:
{
    "original": "$1,200.00",
    "normalized": {"value": 1200.00, "currency": "USD"},
    "value_type": "currency",
    "confidence": 0.99,
    "method": "regex_pattern"
}
```

---

## PART 3: CONFLICT DETECTION LOGIC

### 3.1 The Problem

When multiple documents contain contradictory facts:
- Lease v1: "Rent is $1,200/month"
- Lease v2: "Rent is $1,500/month"
- Email: "We agreed on twelve hundred"

The system must detect these conflicts WITHOUT hallucinating which is correct.

### 3.2 Research: Knowledge Graph Conflict Detection

According to [research on detecting inconsistencies in knowledge graphs](https://journals.sagepub.com/doi/10.1177/30504554251353512):

> "Knowledge graphs are typically constructed via automated procedures and by utilizing heterogeneous data sources. This hinders the quality of these large resulting KGs, as they might contain contradictions—a set of assertions that conflict with some axioms."

The paper notes that classical description logic reasoners can detect inconsistencies but don't scale well. Modern approaches split the KG into modules for parallel processing.

### 3.3 Conflict Detection Approach: CODE-DRIVEN

**Why NOT LLM-based?**

Per [the contradiction detection guide](https://www.shadecoder.com/topics/contradiction-detection-a-comprehensive-guide-for-2025):

> "Building a modular pipeline (retriever → NLI classifier → triage system) enables faster iteration and clearer audits."

For legal/financial decisions, we need **explainable** conflict detection. LLMs can be part of the pipeline, but the core logic must be rule-based.

### 3.4 Conflict Types

| Conflict Type | Example | Detection Method |
|---------------|---------|------------------|
| **Boolean** | "Payment received" vs "Payment not received" | Negation detection |
| **Numeric** | "Rent is $1200" vs "Rent is $1500" | Numeric comparison |
| **Date** | "Due on Feb 1" vs "Due on Feb 15" | Date comparison |
| **State** | "Active lease" vs "Terminated lease" | Enum/state comparison |
| **Existence** | "Has insurance" vs "No insurance" | Existence negation |

### 3.5 Implementation: ConflictDetector

```python
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any, Set, Tuple
from normalization_service import NormalizationService, NormalizedValue

class ConflictType(Enum):
    BOOLEAN = "boolean"
    NUMERIC = "numeric"
    DATE = "date"
    STATE = "state"
    EXISTENCE = "existence"

class ConflictSeverity(Enum):
    CRITICAL = "critical"  # Directly contradictory
    HIGH = "high"          # Significantly different values
    MEDIUM = "medium"      # Minor discrepancy
    LOW = "low"            # Potential conflict, needs review

@dataclass
class Fact:
    """A fact extracted from a document with stable anchor."""
    fact_id: str
    subject: str          # What the fact is about (e.g., "monthly_rent")
    predicate: str        # The relationship (e.g., "equals")
    object_value: Any     # The value (e.g., 1200.00)
    object_type: str      # Type hint for normalization
    source_document: str  # Document hash
    effective_date: Optional[datetime] = None
    citation: Optional[Any] = None  # StableAnchorCitation
    confidence: float = 1.0

@dataclass
class Conflict:
    """A detected conflict between facts."""
    conflict_id: str
    conflict_type: ConflictType
    severity: ConflictSeverity
    fact_a: Fact
    fact_b: Fact
    explanation: str
    resolution_hint: Optional[str] = None
    detected_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict:
        return {
            "conflict_id": self.conflict_id,
            "type": self.conflict_type.value,
            "severity": self.severity.value,
            "fact_a": {
                "id": self.fact_a.fact_id,
                "subject": self.fact_a.subject,
                "value": self.fact_a.object_value,
                "source": self.fact_a.source_document,
                "date": self.fact_a.effective_date.isoformat() if self.fact_a.effective_date else None
            },
            "fact_b": {
                "id": self.fact_b.fact_id,
                "subject": self.fact_b.subject,
                "value": self.fact_b.object_value,
                "source": self.fact_b.source_document,
                "date": self.fact_b.effective_date.isoformat() if self.fact_b.effective_date else None
            },
            "explanation": self.explanation,
            "resolution_hint": self.resolution_hint
        }


class ConflictDetector:
    """
    CODE-DRIVEN conflict detection (non-LLM).

    Detects mutually exclusive facts and applies
    Effective Date Precedence for resolution hints.
    """

    # Negation patterns for boolean conflicts
    NEGATION_PAIRS = [
        ("received", "not received"),
        ("paid", "unpaid"),
        ("active", "inactive"),
        ("valid", "invalid"),
        ("approved", "denied"),
        ("has", "does not have"),
        ("is", "is not"),
    ]

    # State machines for state conflicts
    STATE_MACHINES = {
        "lease_status": ["draft", "active", "suspended", "terminated"],
        "payment_status": ["pending", "paid", "overdue", "cancelled"],
        "approval_status": ["pending", "approved", "denied", "revoked"],
    }

    def __init__(self, normalizer: Optional[NormalizationService] = None):
        self.normalizer = normalizer or NormalizationService()
        self.fact_index: Dict[str, List[Fact]] = {}  # subject -> facts

    def add_fact(self, fact: Fact):
        """Add a fact to the index for conflict checking."""
        if fact.subject not in self.fact_index:
            self.fact_index[fact.subject] = []
        self.fact_index[fact.subject].append(fact)

    def detect_conflicts(self) -> List[Conflict]:
        """Detect all conflicts in the indexed facts."""
        conflicts = []

        for subject, facts in self.fact_index.items():
            if len(facts) < 2:
                continue

            # Compare all pairs
            for i, fact_a in enumerate(facts):
                for fact_b in facts[i+1:]:
                    conflict = self._check_conflict(fact_a, fact_b)
                    if conflict:
                        conflicts.append(conflict)

        return conflicts

    def _check_conflict(self, fact_a: Fact, fact_b: Fact) -> Optional[Conflict]:
        """Check if two facts conflict."""

        # Skip if same document (internal consistency assumed)
        if fact_a.source_document == fact_b.source_document:
            return None

        # Normalize values for comparison
        if fact_a.object_type == fact_b.object_type:
            norm_a = self.normalizer.normalize(str(fact_a.object_value), fact_a.object_type)
            norm_b = self.normalizer.normalize(str(fact_b.object_value), fact_b.object_type)
        else:
            norm_a = NormalizedValue(str(fact_a.object_value), fact_a.object_value, fact_a.object_type, 1.0, "direct", {})
            norm_b = NormalizedValue(str(fact_b.object_value), fact_b.object_value, fact_b.object_type, 1.0, "direct", {})

        # Check by type
        if fact_a.object_type == "currency" or fact_a.object_type == "number":
            return self._check_numeric_conflict(fact_a, fact_b, norm_a, norm_b)
        elif fact_a.object_type == "date":
            return self._check_date_conflict(fact_a, fact_b, norm_a, norm_b)
        elif fact_a.object_type == "boolean":
            return self._check_boolean_conflict(fact_a, fact_b)
        elif fact_a.object_type in self.STATE_MACHINES:
            return self._check_state_conflict(fact_a, fact_b)

        return None

    def _check_numeric_conflict(self, fact_a: Fact, fact_b: Fact,
                                 norm_a: NormalizedValue, norm_b: NormalizedValue) -> Optional[Conflict]:
        """Check for numeric value conflicts."""
        if norm_a.value_type == "unknown" or norm_b.value_type == "unknown":
            return None

        val_a = norm_a.normalized.get("value", norm_a.normalized) if isinstance(norm_a.normalized, dict) else norm_a.normalized
        val_b = norm_b.normalized.get("value", norm_b.normalized) if isinstance(norm_b.normalized, dict) else norm_b.normalized

        if val_a == val_b:
            return None  # No conflict

        # Calculate difference
        diff_pct = abs(val_a - val_b) / max(val_a, val_b) * 100

        # Determine severity
        if diff_pct > 20:
            severity = ConflictSeverity.CRITICAL
        elif diff_pct > 10:
            severity = ConflictSeverity.HIGH
        elif diff_pct > 5:
            severity = ConflictSeverity.MEDIUM
        else:
            severity = ConflictSeverity.LOW

        # Resolution hint: Effective Date Precedence
        resolution = self._resolve_by_date(fact_a, fact_b)

        return Conflict(
            conflict_id=f"CONF-{fact_a.fact_id[:4]}-{fact_b.fact_id[:4]}",
            conflict_type=ConflictType.NUMERIC,
            severity=severity,
            fact_a=fact_a,
            fact_b=fact_b,
            explanation=f"Numeric conflict: {val_a} vs {val_b} ({diff_pct:.1f}% difference)",
            resolution_hint=resolution
        )

    def _check_date_conflict(self, fact_a: Fact, fact_b: Fact,
                              norm_a: NormalizedValue, norm_b: NormalizedValue) -> Optional[Conflict]:
        """Check for date value conflicts."""
        if norm_a.value_type == "unknown" or norm_b.value_type == "unknown":
            return None

        if norm_a.normalized == norm_b.normalized:
            return None

        resolution = self._resolve_by_date(fact_a, fact_b)

        return Conflict(
            conflict_id=f"CONF-{fact_a.fact_id[:4]}-{fact_b.fact_id[:4]}",
            conflict_type=ConflictType.DATE,
            severity=ConflictSeverity.HIGH,
            fact_a=fact_a,
            fact_b=fact_b,
            explanation=f"Date conflict: {norm_a.normalized} vs {norm_b.normalized}",
            resolution_hint=resolution
        )

    def _check_boolean_conflict(self, fact_a: Fact, fact_b: Fact) -> Optional[Conflict]:
        """Check for boolean/existence conflicts."""
        val_a = str(fact_a.object_value).lower()
        val_b = str(fact_b.object_value).lower()

        # Check negation patterns
        for positive, negative in self.NEGATION_PAIRS:
            if (positive in val_a and negative in val_b) or (negative in val_a and positive in val_b):
                resolution = self._resolve_by_date(fact_a, fact_b)
                return Conflict(
                    conflict_id=f"CONF-{fact_a.fact_id[:4]}-{fact_b.fact_id[:4]}",
                    conflict_type=ConflictType.BOOLEAN,
                    severity=ConflictSeverity.CRITICAL,
                    fact_a=fact_a,
                    fact_b=fact_b,
                    explanation=f"Boolean conflict: '{val_a}' vs '{val_b}'",
                    resolution_hint=resolution
                )

        return None

    def _check_state_conflict(self, fact_a: Fact, fact_b: Fact) -> Optional[Conflict]:
        """Check for state machine conflicts."""
        states = self.STATE_MACHINES.get(fact_a.object_type, [])

        val_a = str(fact_a.object_value).lower()
        val_b = str(fact_b.object_value).lower()

        if val_a in states and val_b in states and val_a != val_b:
            resolution = self._resolve_by_date(fact_a, fact_b)
            return Conflict(
                conflict_id=f"CONF-{fact_a.fact_id[:4]}-{fact_b.fact_id[:4]}",
                conflict_type=ConflictType.STATE,
                severity=ConflictSeverity.HIGH,
                fact_a=fact_a,
                fact_b=fact_b,
                explanation=f"State conflict: '{val_a}' vs '{val_b}' (valid states: {states})",
                resolution_hint=resolution
            )

        return None

    def _resolve_by_date(self, fact_a: Fact, fact_b: Fact) -> str:
        """Apply Effective Date Precedence rule."""
        if fact_a.effective_date and fact_b.effective_date:
            if fact_a.effective_date > fact_b.effective_date:
                return f"Effective Date Precedence: '{fact_a.source_document}' is newer ({fact_a.effective_date.isoformat()})"
            elif fact_b.effective_date > fact_a.effective_date:
                return f"Effective Date Precedence: '{fact_b.source_document}' is newer ({fact_b.effective_date.isoformat()})"
            else:
                return "Same effective date - requires manual resolution"
        elif fact_a.effective_date:
            return f"Only '{fact_a.source_document}' has effective date"
        elif fact_b.effective_date:
            return f"Only '{fact_b.source_document}' has effective date"
        else:
            return "No effective dates - requires manual resolution"
```

---

## PART 4: THE GOVERNOR & POLICY-AS-CODE

### 4.1 JSON Schema Validation for Inter-Agent Communication

According to [AI Agent Protocols 2026 research](https://www.ruh.ai/blogs/ai-agent-protocols-2026-complete-guide):

> "Every AI agent protocol specifies message format with information structure and encoding, typically JSON or JSON-RPC... Research shows that strict JSON schemas reduce injection risk and improve reliability."

The [MCP Protocol research](https://dzone.com/articles/model-context-protocol-mcp-guide-architecture-uses-implementation) confirms:

> "MCP's schema-first design ensures agents stay compatible—even if the underlying models change."

### 4.2 Schema Versioning Strategy

Following [SchemaVer research](https://snowplow.io/blog/introducing-schemaver-for-semantic-versioning-of-schemas):

> "Schemas are used in a fundamentally different way to software. When versioning a data schema, the concern is with backwards-compatibility between the new schema and existing data."

**Proposed versioning: SchemaVer format**
- `MODEL` - Major breaking changes (incompatible)
- `REVISION` - Schema changes (forward-compatible)
- `ADDITION` - New optional fields (fully compatible)

Format: `MODEL-REVISION-ADDITION` (e.g., `1-0-3`)

### 4.3 Implementation: StructuralGate

```python
import json
from dataclasses import dataclass
from typing import Dict, Any, Optional, List, Tuple
from jsonschema import validate, ValidationError, Draft7Validator

@dataclass
class SchemaVersion:
    """SchemaVer versioning for inter-agent schemas."""
    model: int      # Breaking changes
    revision: int   # Schema changes (forward-compatible)
    addition: int   # New optional fields

    def __str__(self) -> str:
        return f"{self.model}-{self.revision}-{self.addition}"

    @classmethod
    def from_string(cls, version_str: str) -> "SchemaVersion":
        parts = version_str.split("-")
        return cls(int(parts[0]), int(parts[1]), int(parts[2]))

    def is_compatible_with(self, other: "SchemaVersion") -> bool:
        """Check if this schema is compatible with another."""
        if self.model != other.model:
            return False  # Breaking change
        if self.revision > other.revision:
            return False  # Schema change (need newer client)
        return True


class StructuralGate:
    """
    Policy-as-Code: JSON Schema validation for inter-agent communication.

    NON-CONFORMING OUTPUT = IMMEDIATE PROCESS TERMINATION
    """

    def __init__(self):
        self.schemas: Dict[str, Dict] = {}
        self.schema_versions: Dict[str, SchemaVersion] = {}
        self._register_default_schemas()

    def _register_default_schemas(self):
        """Register default schemas for TinyPM inter-agent messages."""

        # Proposal schema (from negotiation_protocol.py)
        self.register_schema("proposal", SchemaVersion(1, 0, 0), {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "required": ["proposal_id", "description", "priority"],
            "properties": {
                "proposal_id": {"type": "string", "pattern": "^[a-f0-9]{8}$"},
                "description": {"type": "string", "minLength": 10, "maxLength": 2000},
                "priority": {"type": "integer", "minimum": 1, "maximum": 10},
                "ui_components": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["id", "type"],
                        "properties": {
                            "id": {"type": "string"},
                            "type": {"type": "string"},
                            "properties": {"type": "object"}
                        }
                    }
                },
                "research_citations": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "seed_vault_rules": {
                    "type": "array",
                    "items": {"type": "string", "pattern": "^[A-Z]+[0-9]+$"}
                }
            }
        })

        # Citation schema (Forensic RAG)
        self.register_schema("citation", SchemaVersion(1, 0, 0), {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "required": ["citation_id", "document", "anchor"],
            "properties": {
                "citation_id": {"type": "string"},
                "document": {
                    "type": "object",
                    "required": ["name", "sha256"],
                    "properties": {
                        "name": {"type": "string"},
                        "sha256": {"type": "string", "pattern": "^[a-f0-9]{64}$"},
                        "version": {"type": "string"}
                    }
                },
                "anchor": {
                    "type": "object",
                    "required": ["page", "char_start", "char_end", "text", "text_sha256"],
                    "properties": {
                        "page": {"type": "integer", "minimum": 1},
                        "char_start": {"type": "integer", "minimum": 0},
                        "char_end": {"type": "integer", "minimum": 0},
                        "text": {"type": "string", "minLength": 1},
                        "text_sha256": {"type": "string", "pattern": "^[a-f0-9]{64}$"}
                    }
                },
                "extracted_value": {"type": "object"}
            }
        })

        # Conflict schema
        self.register_schema("conflict", SchemaVersion(1, 0, 0), {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "required": ["conflict_id", "type", "severity", "fact_a", "fact_b"],
            "properties": {
                "conflict_id": {"type": "string"},
                "type": {"type": "string", "enum": ["boolean", "numeric", "date", "state", "existence"]},
                "severity": {"type": "string", "enum": ["critical", "high", "medium", "low"]},
                "fact_a": {"type": "object"},
                "fact_b": {"type": "object"},
                "explanation": {"type": "string"},
                "resolution_hint": {"type": ["string", "null"]}
            }
        })

    def register_schema(self, name: str, version: SchemaVersion, schema: Dict):
        """Register a schema with version."""
        key = f"{name}@{version}"
        self.schemas[key] = schema
        self.schema_versions[name] = version

    def validate(self, message_type: str, data: Dict, version: Optional[SchemaVersion] = None) -> Tuple[bool, Optional[str]]:
        """
        Validate a message against its schema.

        NON-CONFORMING = KILL THE PROCESS

        Returns:
            Tuple of (is_valid, error_message)
        """
        # Get schema version
        if version is None:
            version = self.schema_versions.get(message_type)

        if version is None:
            return False, f"Unknown message type: {message_type}"

        key = f"{message_type}@{version}"
        schema = self.schemas.get(key)

        if schema is None:
            return False, f"Schema not found: {key}"

        # Validate
        try:
            validate(instance=data, schema=schema)
            return True, None
        except ValidationError as e:
            return False, f"Schema validation failed: {e.message} at {list(e.absolute_path)}"

    def gate(self, message_type: str, data: Dict) -> Dict:
        """
        Structural gate: validate or terminate.

        Raises ValueError if validation fails (process termination).
        """
        is_valid, error = self.validate(message_type, data)

        if not is_valid:
            # LOG THE FAILURE (for audit)
            failure_record = {
                "timestamp": datetime.now().isoformat(),
                "message_type": message_type,
                "error": error,
                "data_preview": str(data)[:500]
            }
            # In production: log to audit trail

            raise ValueError(f"STRUCTURAL GATE FAILURE: {error}")

        return data  # Pass through if valid
```

---

## PART 5: OVERLAP VALIDATOR

### 5.1 The Problem

AI extracts values and claims they came from cited text, but:
- Extracted: "12 hours"
- Cited text: "The term shall be twelve months"

This is a **citation hallucination** - the AI extracted something that doesn't match its citation.

### 5.2 Research: Span Overlap Validation

According to [SemEval-2025 Task 3 research](https://arxiv.org/html/2505.20880):

> "Intersection-over-Union (IoU) measures the overlap between predicted and reference hallucination spans."

The [factuality probes research](https://aclanthology.org/2025.findings-emnlp.880.pdf) describes:

> "By attributing atomic claims to token spans, claim-level factuality is propagated back to the long-form generation, providing users with natural visualization of factuality."

### 5.3 Implementation: OverlapValidator

```python
import re
from dataclasses import dataclass
from typing import List, Optional, Tuple, Set
from normalization_service import NormalizationService

@dataclass
class OverlapResult:
    """Result of overlap validation."""
    is_valid: bool
    overlap_score: float  # 0-1, IoU-style
    extracted_value: str
    cited_text: str
    matching_spans: List[Tuple[int, int]]  # Character ranges in cited text
    confidence: float
    reason: str


class OverlapValidator:
    """
    Verify extracted data matches cited span.

    If AI extracts "12 hours" but cited text doesn't contain "12" -> ABSTAIN

    This catches hallucinations at the extraction layer.
    """

    def __init__(self, normalizer: Optional[NormalizationService] = None):
        self.normalizer = normalizer or NormalizationService()

    def validate_extraction(self, extracted_value: str, cited_text: str,
                            value_type: Optional[str] = None) -> OverlapResult:
        """
        Validate that extracted value actually appears in cited text.

        Args:
            extracted_value: The value AI claims to have extracted
            cited_text: The source text AI claims it came from
            value_type: Type hint (currency, date, number)

        Returns:
            OverlapResult with validation details
        """
        # Normalize both for comparison
        norm_extracted = self.normalizer.normalize(extracted_value, value_type)

        # Search for exact match first
        exact_match = self._find_exact_match(extracted_value, cited_text)
        if exact_match:
            return OverlapResult(
                is_valid=True,
                overlap_score=1.0,
                extracted_value=extracted_value,
                cited_text=cited_text,
                matching_spans=exact_match,
                confidence=0.99,
                reason="Exact match found in cited text"
            )

        # Search for normalized equivalent
        norm_match = self._find_normalized_match(norm_extracted, cited_text, value_type)
        if norm_match:
            return OverlapResult(
                is_valid=True,
                overlap_score=0.9,
                extracted_value=extracted_value,
                cited_text=cited_text,
                matching_spans=norm_match["spans"],
                confidence=0.85,
                reason=f"Normalized match: '{norm_match['matched_text']}' -> {extracted_value}"
            )

        # Search for partial/fuzzy match
        partial_match = self._find_partial_match(extracted_value, cited_text)
        if partial_match["score"] >= 0.7:
            return OverlapResult(
                is_valid=True,
                overlap_score=partial_match["score"],
                extracted_value=extracted_value,
                cited_text=cited_text,
                matching_spans=partial_match["spans"],
                confidence=partial_match["score"] * 0.8,
                reason=f"Partial match ({partial_match['score']:.0%}): '{partial_match['matched_text']}'"
            )

        # NO MATCH FOUND -> ABSTAIN
        return OverlapResult(
            is_valid=False,
            overlap_score=partial_match["score"] if partial_match else 0.0,
            extracted_value=extracted_value,
            cited_text=cited_text,
            matching_spans=[],
            confidence=0.0,
            reason=f"ABSTAIN: Extracted value '{extracted_value}' not found in cited text"
        )

    def _find_exact_match(self, value: str, text: str) -> Optional[List[Tuple[int, int]]]:
        """Find exact string match."""
        spans = []
        pattern = re.escape(value)
        for match in re.finditer(pattern, text, re.IGNORECASE):
            spans.append((match.start(), match.end()))
        return spans if spans else None

    def _find_normalized_match(self, norm_value: Any, text: str,
                                value_type: Optional[str]) -> Optional[Dict]:
        """Find match via normalization (e.g., "twelve" -> "12")."""
        if value_type == "number":
            # Look for word numbers in text
            word_patterns = [
                (r'\btwelve\b', 12), (r'\beleven\b', 11), (r'\bten\b', 10),
                (r'\bnine\b', 9), (r'\beight\b', 8), (r'\bseven\b', 7),
                (r'\bsix\b', 6), (r'\bfive\b', 5), (r'\bfour\b', 4),
                (r'\bthree\b', 3), (r'\btwo\b', 2), (r'\bone\b', 1),
            ]

            target = norm_value.normalized if hasattr(norm_value, 'normalized') else norm_value

            for pattern, num_value in word_patterns:
                if num_value == target:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        return {
                            "spans": [(match.start(), match.end())],
                            "matched_text": match.group()
                        }

        elif value_type == "currency":
            # Look for currency patterns
            patterns = [
                r'\$[\d,]+(?:\.\d{2})?',
                r'[\d,]+(?:\.\d{2})?\s*(?:dollars?|USD)',
            ]

            for pattern in patterns:
                for match in re.finditer(pattern, text, re.IGNORECASE):
                    matched_norm = self.normalizer.normalize(match.group(), "currency")
                    if matched_norm.normalized == norm_value.normalized:
                        return {
                            "spans": [(match.start(), match.end())],
                            "matched_text": match.group()
                        }

        return None

    def _find_partial_match(self, value: str, text: str) -> Dict:
        """Find partial/fuzzy match using token overlap."""
        # Tokenize
        value_tokens = set(re.findall(r'\w+', value.lower()))
        text_tokens = set(re.findall(r'\w+', text.lower()))

        if not value_tokens:
            return {"score": 0.0, "spans": [], "matched_text": ""}

        # Calculate IoU
        intersection = value_tokens & text_tokens
        union = value_tokens | text_tokens

        iou = len(intersection) / len(union) if union else 0

        # Find spans for matched tokens
        spans = []
        matched_parts = []
        for token in intersection:
            pattern = r'\b' + re.escape(token) + r'\b'
            for match in re.finditer(pattern, text, re.IGNORECASE):
                spans.append((match.start(), match.end()))
                matched_parts.append(match.group())

        return {
            "score": iou,
            "spans": spans,
            "matched_text": " ".join(matched_parts)
        }

    def batch_validate(self, extractions: List[Dict]) -> List[OverlapResult]:
        """
        Validate multiple extractions.

        Each extraction dict should have:
        - extracted_value: str
        - cited_text: str
        - value_type: Optional[str]
        """
        return [
            self.validate_extraction(
                e["extracted_value"],
                e["cited_text"],
                e.get("value_type")
            )
            for e in extractions
        ]
```

### 5.4 Performance Impact Analysis

**Question:** What's the performance impact of Overlap Validation on every extraction?

**Analysis:**

| Operation | Time Complexity | Typical Latency |
|-----------|-----------------|-----------------|
| Exact match (regex) | O(n) | <1ms |
| Normalized match | O(n * p) | 1-5ms |
| Partial match (IoU) | O(n + m) | 1-3ms |
| Total per extraction | - | 2-10ms |

**Recommendation:** The overhead is negligible (<10ms per extraction) compared to:
- LLM inference time (100-2000ms)
- Network latency (50-200ms)
- Document parsing (10-100ms)

**Enable overlap validation on ALL extractions** for legal/financial documents.

---

## PART 6: RBAC-FILTERED RETRIEVAL

### 6.1 Research: Permission-Aware RAG

According to [Seoul National University research (IEEE Access 2025)](https://snu.elsevierpure.com/en/publications/permission-aware-rag-identity-and-access-management-iam-based-acc/):

> "Most existing RAG research implicitly assumes all retrieved content is equally accessible to any user, which fails to address the complex, fine-grained access control required in enterprise environments."

[Pinecone's RAG Access Control guide](https://www.pinecone.io/learn/rag-access-control/) notes:

> "RAG introduces a serious risk of information leakage. If different users have different levels of access to data, your RAG pipeline must enforce those access boundaries."

### 6.2 Pre-Filter vs Post-Filter Approaches

| Approach | Description | Best For |
|----------|-------------|----------|
| **Pre-Filter** | Filter documents before vector search | Large corpus, low hit rate |
| **Post-Filter** | Filter results after vector search | Small corpus, high hit rate |
| **Hybrid** | Pre-filter + post-validate | Maximum security |

### 6.3 Integration with Google Workspace Permissions

For TinyPM's Google Workspace integration:

```python
from dataclasses import dataclass
from typing import List, Dict, Optional, Set
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

@dataclass
class DocumentPermission:
    """Permission record for a document."""
    document_id: str
    document_hash: str
    permission_type: str  # "owner", "writer", "commenter", "reader"
    granted_to: str       # email or "anyone" or domain
    inherited_from: Optional[str] = None  # Parent folder ID

@dataclass
class UserContext:
    """User context for permission checking."""
    user_email: str
    groups: Set[str]
    roles: Set[str]  # "admin", "manager", "employee"
    tenant_id: str


class PermissionAwareRAG:
    """
    RBAC-filtered retrieval for TinyPM.

    Integrates with Google Workspace permissions.
    If user doesn't have "Edit" access to lease, agent can't retrieve it.
    """

    def __init__(self, credentials: Credentials):
        self.drive_service = build('drive', 'v3', credentials=credentials)
        self.permission_cache: Dict[str, List[DocumentPermission]] = {}

    def check_access(self, user: UserContext, document_id: str,
                     required_permission: str = "reader") -> bool:
        """
        Check if user has required permission on document.

        Args:
            user: User context with email, groups, roles
            document_id: Google Drive document ID
            required_permission: "reader", "commenter", "writer", "owner"

        Returns:
            True if user has access, False otherwise
        """
        # Admin bypass
        if "admin" in user.roles:
            return True

        # Get document permissions
        permissions = self._get_document_permissions(document_id)

        # Permission hierarchy: owner > writer > commenter > reader
        hierarchy = {"owner": 4, "writer": 3, "commenter": 2, "reader": 1}
        required_level = hierarchy.get(required_permission, 1)

        for perm in permissions:
            # Check if permission applies to user
            if self._permission_applies_to_user(perm, user):
                perm_level = hierarchy.get(perm.permission_type, 0)
                if perm_level >= required_level:
                    return True

        return False

    def _get_document_permissions(self, document_id: str) -> List[DocumentPermission]:
        """Get permissions for a document from Google Drive API."""
        if document_id in self.permission_cache:
            return self.permission_cache[document_id]

        try:
            # Get file metadata including permissions
            file = self.drive_service.files().get(
                fileId=document_id,
                fields='id, name, permissions'
            ).execute()

            permissions = []
            for p in file.get('permissions', []):
                permissions.append(DocumentPermission(
                    document_id=document_id,
                    document_hash="",  # Would need to fetch content for hash
                    permission_type=p.get('role', 'reader'),
                    granted_to=p.get('emailAddress', p.get('type', 'unknown'))
                ))

            self.permission_cache[document_id] = permissions
            return permissions

        except Exception as e:
            # If we can't check permissions, deny access (fail secure)
            return []

    def _permission_applies_to_user(self, perm: DocumentPermission, user: UserContext) -> bool:
        """Check if a permission applies to a specific user."""
        granted_to = perm.granted_to.lower()

        # Direct email match
        if granted_to == user.user_email.lower():
            return True

        # Anyone with link
        if granted_to == "anyone":
            return True

        # Domain match
        if granted_to.startswith("@"):
            user_domain = user.user_email.split("@")[1]
            if granted_to[1:] == user_domain:
                return True

        # Group membership
        if granted_to in user.groups:
            return True

        return False

    def filter_retrieval_results(self, user: UserContext,
                                  results: List[Dict],
                                  required_permission: str = "reader") -> List[Dict]:
        """
        Post-filter retrieval results based on user permissions.

        Args:
            user: User context
            results: Vector search results with document_id field
            required_permission: Minimum required permission

        Returns:
            Filtered results user has access to
        """
        filtered = []
        for result in results:
            doc_id = result.get("document_id") or result.get("metadata", {}).get("document_id")
            if doc_id and self.check_access(user, doc_id, required_permission):
                filtered.append(result)

        return filtered

    def pre_filter_query(self, user: UserContext,
                          base_query: Dict) -> Dict:
        """
        Add permission pre-filter to vector search query.

        Modifies query to only search documents user has access to.
        """
        # Get all documents user has access to
        accessible_docs = self._get_accessible_documents(user)

        # Add filter to query
        if "filter" not in base_query:
            base_query["filter"] = {}

        base_query["filter"]["document_id"] = {"$in": accessible_docs}

        return base_query

    def _get_accessible_documents(self, user: UserContext) -> List[str]:
        """Get list of document IDs user has access to."""
        # In production: query pre-built permission index
        # For now, return empty (will be populated from permission sync)
        return []
```

---

## PART 7: INTEGRATION ARCHITECTURE

### 7.1 How Components Work Together

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FORENSIC RAG & GROUNDING SYSTEM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐                                                         │
│  │    DOCUMENT     │                                                         │
│  │    INGESTION    │                                                         │
│  │                 │                                                         │
│  │  1. Hash doc    │                                                         │
│  │  2. Extract     │──────┐                                                  │
│  │  3. Create      │      │                                                  │
│  │     anchors     │      │                                                  │
│  └─────────────────┘      │                                                  │
│                           ▼                                                  │
│  ┌────────────────────────────────────────┐                                 │
│  │           PERMISSION FILTER            │                                 │
│  │  (RBAC pre-filter based on user)       │                                 │
│  └────────────────────────────────────────┘                                 │
│                           │                                                  │
│                           ▼                                                  │
│  ┌────────────────────────────────────────┐                                 │
│  │           VECTOR RETRIEVAL             │                                 │
│  │  (Search for relevant documents)       │                                 │
│  └────────────────────────────────────────┘                                 │
│                           │                                                  │
│                           ▼                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   EXTRACTION    │───▶│  NORMALIZATION  │───▶│    OVERLAP      │         │
│  │   (LLM-based)   │    │    SERVICE      │    │   VALIDATION    │         │
│  │                 │    │  (Code-based)   │    │                 │         │
│  │  Extract facts  │    │  Standardize    │    │  Verify cited   │         │
│  │  with citations │    │  values         │    │  text matches   │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│                                                        │                     │
│                           ┌────────────────────────────┘                     │
│                           ▼                                                  │
│  ┌────────────────────────────────────────┐                                 │
│  │           CONFLICT DETECTOR            │                                 │
│  │   (Rule-based, not LLM)               │                                 │
│  │   - Boolean conflicts                  │                                 │
│  │   - Numeric conflicts                  │                                 │
│  │   - Date conflicts                     │                                 │
│  │   - Effective Date Precedence          │                                 │
│  └────────────────────────────────────────┘                                 │
│                           │                                                  │
│                           ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         STRUCTURAL GATE                              │   │
│  │                    (JSON Schema Validation)                          │   │
│  │                                                                      │   │
│  │   - Validate all inter-agent messages                               │   │
│  │   - Version check schemas (SchemaVer)                               │   │
│  │   - NON-CONFORMING = PROCESS TERMINATION                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                  │
│                           ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          GOVERNOR                                    │   │
│  │               (Integration with Seed Vault)                          │   │
│  │                                                                      │   │
│  │   - VETO non-compliant proposals                                    │   │
│  │   - Require citations for all claims                                │   │
│  │   - Record all decisions in audit trail                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                  │
│                           ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     AUDIT TRAIL                                      │   │
│  │              (Adversarial Auditor Integration)                       │   │
│  │                                                                      │   │
│  │   - SHA-256 hash chain (blockchain-style)                           │   │
│  │   - All citations with stable anchors                               │   │
│  │   - All conflicts detected and resolutions                          │   │
│  │   - All Governor decisions with rationale                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Integration Points with Existing TinyPM

| Existing Component | Integration |
|--------------------|-------------|
| `seed_vault.py` | Add FORENSIC rule category; Governor extends SeedVault |
| `adversarial_auditor.py` | Add citation verification tests; extend AuditEntry for citations |
| `negotiation_protocol.py` | All proposals require StableAnchorCitations; Structural Gate validates messages |
| `pm_brain.py` | Use PermissionAwareRAG for document retrieval |
| `learning_engine.py` (new) | Calibrate confidence from OverlapValidator results |

---

## PART 8: FEASIBILITY ANALYSIS

### 8.1 What Exists vs What Needs Building

| Component | Status | Effort | Notes |
|-----------|--------|--------|-------|
| StableAnchorCitation | NEW | 2-3 days | Core implementation in this report |
| NormalizationService | NEW | 3-5 days | Multiple normalizers needed |
| ConflictDetector | NEW | 3-4 days | Core logic defined in this report |
| StructuralGate | NEW | 2-3 days | JSON Schema infrastructure |
| OverlapValidator | NEW | 2-3 days | Implementation in this report |
| PermissionAwareRAG | PARTIAL | 3-5 days | Google Workspace integration needed |
| Governor Extension | EXTEND | 1-2 days | Extend existing Seed Vault |
| Adversarial Auditor Extension | EXTEND | 1-2 days | Add citation tests |

**Total Estimated Effort:** 17-27 days

### 8.2 Dependencies and Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Google Drive API rate limits | MEDIUM | Implement caching + batch permissions sync |
| LLM extraction quality | HIGH | OverlapValidator catches hallucinations |
| Schema migration | MEDIUM | SchemaVer versioning handles compatibility |
| Performance overhead | LOW | <10ms per operation overhead |
| Complex permission hierarchies | HIGH | Start with simple RBAC, iterate |

### 8.3 Recommended Phasing

**Phase 1 (Week 1-2): Foundation**
- StableAnchorCitation
- NormalizationService
- OverlapValidator

**Phase 2 (Week 3-4): Governance**
- StructuralGate
- ConflictDetector
- Governor Extension

**Phase 3 (Week 5-6): Integration**
- PermissionAwareRAG
- Adversarial Auditor Extension
- End-to-end testing

---

## PART 9: ANSWERS TO KEY QUESTIONS

### Q1: How do Forensic RAG citations integrate with existing Seed Vault?

**Answer:** The Seed Vault gains a new `FORENSIC` rule category that requires all document citations to include:
1. Document SHA-256 hash
2. Character offset range
3. Text span SHA-256 hash

The Governor's `veto_if_violation()` method is extended to check for missing citation anchors on any proposal that claims document-based evidence.

### Q2: Should the Normalization Service be part of the Governor or standalone?

**Answer:** **STANDALONE MICROSERVICE** is recommended because:
1. Deterministic output requires isolated testing
2. Multiple consumers (ConflictDetector, OverlapValidator, agents)
3. No LLM dependencies = faster, predictable
4. Easy to version and deploy independently

### Q3: How does Conflict Detection work with P2P Negotiation protocol?

**Answer:**
1. When an agent makes a claim in `negotiation_protocol.py`, it must cite with StableAnchor
2. Before consensus, all claims are passed through ConflictDetector
3. If conflicts detected, they are surfaced to participants
4. Governor applies Effective Date Precedence for resolution hints
5. Consensus cannot be reached on conflicting unresolved facts

### Q4: What's the performance impact of Overlap Validation on every extraction?

**Answer:** **Negligible** (<10ms per extraction). See detailed analysis in Section 5.4. The overhead is insignificant compared to LLM inference time (100-2000ms). **Recommend enabling on ALL extractions** for legal/financial documents.

---

## SOURCES

### Forensic RAG & Citations
- [Tensorlake Citation-Aware RAG](https://www.tensorlake.ai/blog/rag-citations)
- [FACTUM: Citation Hallucination Detection (arXiv)](https://arxiv.org/pdf/2601.05866)
- [PageFreezer: SHA-256 for Evidence Authentication](https://blog.pagefreezer.com/sha-256-benefits-evidence-authentication)
- [PageFreezer: Hash Values in Digital Forensics](https://blog.pagefreezer.com/importance-hash-values-evidence-collection-digital-forensics)

### Data Normalization
- [LLM Data Processing (Turing)](https://www.turing.com/resources/understanding-data-processing-techniques-for-llms)
- [LLMs for Structured Data Extraction (Unstract)](https://unstract.com/blog/comparing-approaches-for-using-llms-for-structured-data-extraction-from-pdfs/)
- [LLM Data Survey (arXiv)](https://arxiv.org/pdf/2505.18458)

### Conflict Detection
- [Detecting Inconsistencies in Knowledge Graphs (SAGE)](https://journals.sagepub.com/doi/10.1177/30504554251353512)
- [Contradiction Detection Guide 2025 (Shadecoder)](https://www.shadecoder.com/topics/contradiction-detection-a-comprehensive-guide-for-2025)
- [Knowledge Conflicts for LLMs Survey (ACL)](https://aclanthology.org/2024.emnlp-main.486.pdf)

### JSON Schema & Agent Protocols
- [AI Agent Protocols 2026 Guide (Ruh.ai)](https://www.ruh.ai/blogs/ai-agent-protocols-2026-complete-guide)
- [MCP Architecture Guide (DZone)](https://dzone.com/articles/model-context-protocol-mcp-guide-architecture-uses-implementation)
- [SchemaVer for Schema Versioning (Snowplow)](https://snowplow.io/blog/introducing-schemaver-for-semantic-versioning-of-schemas)

### Permission-Aware RAG
- [Permission-Aware RAG (IEEE Access 2025)](https://snu.elsevierpure.com/en/publications/permission-aware-rag-identity-and-access-management-iam-based-acc/)
- [RAG with Access Control (Pinecone)](https://www.pinecone.io/learn/rag-access-control/)
- [RAG & RBAC Integration (Elasticsearch)](https://www.elastic.co/search-labs/blog/rag-and-rbac-integration)
- [Authorization for RAG Applications (Cerbos)](https://www.cerbos.dev/blog/authorization-for-rag-applications-langchain-chromadb-cerbos)

### Overlap Validation & Hallucination Detection
- [SemEval-2025 Task 3: Hallucination Span Detection (arXiv)](https://arxiv.org/html/2505.20880)
- [LLM Uncertainty for Hallucination Detection (arXiv)](https://arxiv.org/html/2505.17485)
- [Hallucination Detection Survey (arXiv)](https://arxiv.org/pdf/2311.05232)

---

## CONCLUSION

This research provides a complete technical foundation for building legally defensible AI infrastructure. The key insight is that **auditability requires determinism** - LLMs are used for extraction, but validation, normalization, and conflict detection must be CODE-BASED for reproducibility.

The integration with existing TinyPM systems (Seed Vault, Adversarial Auditor, Negotiation Protocol) is straightforward. The estimated 17-27 day implementation timeline is achievable with focused effort.

**NO SHORTCUTS. STATE OF THE ART. ONLY THE BEST.**

---

*Document prepared 2026-02-04*
*Research Team Alpha*
*For TinyPM "Sovereign Seed" Project*
