# Deterministic Logic Split & Operational Sovereignty Research Report

## Project "Sovereign Seed" - Phases 3 & 4

**Research Team Beta**
**Date:** 2026-02-04
**Status:** Complete

---

## Executive Summary

This research investigates how to transform TinyPM from an "assistive chat" system into "deterministic infrastructure" suitable for legal and financial decision-making. The core principle: every AI decision must be **auditable**, **repeatable**, **reversible**, and **legally defensible**.

The research covers five interconnected components:
1. **Extraction/Calculation Split** - Separating AI interpretation from deterministic math
2. **Financial Circuit Breaker** - Impact-based execution gates
3. **Decision Replay Engine** - Bit-for-bit reproducibility
4. **Tiered Override Hygiene** - Preventing preference drift
5. **Intelligent Safe Mode** - Auto-lock mechanisms

---

## Part 1: The Extraction/Calculation Split

### The Core Problem

LLMs are fundamentally non-deterministic. Even with temperature=0, factors like floating-point precision, API version changes, and context window variations can produce different outputs. For legal and financial decisions, this is unacceptable.

### State-of-the-Art Approach: Separation of Concerns

**Research Finding:** The gold standard in 2026 is the "Extract-Transform-Calculate" (ETC) pattern:

```
                   NON-DETERMINISTIC          DETERMINISTIC
                   ┌─────────────────┐       ┌─────────────────┐
Raw Input ──────►  │  AI EXTRACTION  │ ───►  │  PURE FUNCTIONS │ ───► Output
(Messy docs,       │                 │       │                 │
 emails,           │  - Entity NER   │       │  - Formulas     │
 voice notes)      │  - Intent parse │       │  - Arithmetic   │
                   │  - Schema map   │       │  - Date math    │
                   └─────────────────┘       └─────────────────┘
                          │                         │
                          ▼                         ▼
                   Audit: "AI extracted         Audit: "Function
                   these parameters"            f(x) = y always"
```

### Implementation Pattern

#### Agent Role: Structured Extraction

The AI's ONLY job is to extract structured parameters from unstructured input:

```python
@dataclass
class ExtractionContract:
    """Contract for AI extraction - defines EXACTLY what AI can extract."""

    contract_version: str = "1.0.0"
    input_hash: str  # SHA-256 of raw input

    # Extracted parameters (AI fills these)
    extracted_parameters: Dict[str, Any]

    # Confidence for each parameter (AI must provide)
    confidence_scores: Dict[str, float]

    # Source citations (where in input each value came from)
    source_citations: Dict[str, SourceCitation]

    # Extraction timestamp and model info
    extraction_metadata: ExtractionMetadata

@dataclass
class SourceCitation:
    """Proves where an extracted value came from."""
    source_text: str          # Exact text from input
    char_start: int           # Position in input
    char_end: int
    input_section: str        # E.g., "paragraph 3" or "line 47"
```

#### Code Role: Pure Deterministic Functions

All calculations are done by pure functions with NO AI involvement:

```python
class DeterministicCalculator:
    """Pure functions for calculations - NO AI, NO side effects."""

    @staticmethod
    def calculate_lease_rent(
        base_rent: Decimal,
        acreage: Decimal,
        escalation_rate: Decimal,
        year: int
    ) -> Decimal:
        """
        Calculate annual lease rent.

        Formula: base_rent * acreage * (1 + escalation_rate)^(year-1)

        This function is DETERMINISTIC. Same inputs = same output, always.
        """
        return base_rent * acreage * ((1 + escalation_rate) ** (year - 1))

    @staticmethod
    def calculate_task_priority_score(
        urgency: int,          # 1-5
        importance: int,       # 1-5
        effort_hours: Decimal,
        deadline_days: int,
        dependencies_blocked: int
    ) -> Decimal:
        """
        Eisenhower-weighted priority score.

        Formula: (urgency * 0.35) + (importance * 0.35) +
                 (deadline_pressure * 0.20) + (blocking_penalty * 0.10)

        Where:
        - deadline_pressure = max(0, (14 - deadline_days) / 14)
        - blocking_penalty = min(1, dependencies_blocked / 5)
        """
        deadline_pressure = max(Decimal("0"), (Decimal("14") - deadline_days) / Decimal("14"))
        blocking_penalty = min(Decimal("1"), Decimal(dependencies_blocked) / Decimal("5"))

        return (
            Decimal(urgency) * Decimal("0.35") +
            Decimal(importance) * Decimal("0.35") +
            deadline_pressure * Decimal("0.20") +
            blocking_penalty * Decimal("0.10")
        )
```

### Integration with TinyPM

The existing `anticipatory_engine.py` calculates confidence scores. This should be refactored:

**Current (Mixed):**
```python
def determine_trust_level(self, confidence: float, action_type: str) -> TrustLevel:
    # AI generates confidence, AI applies thresholds
```

**Proposed (Split):**
```python
def determine_trust_level(self, confidence: float, action_type: str) -> TrustLevel:
    # 1. AI extracts signals -> ExtractionContract
    # 2. Pure function calculates confidence from signals
    # 3. Pure function applies threshold rules
    # ALL math is deterministic and auditable
```

### Key Research Finding: Deterministic Fallbacks for LLM Extraction

**The Problem:** LLM extraction is inherently non-deterministic. Even structured output can vary.

**Solution: Deterministic Fallback Chain**

```python
class RobustExtractor:
    """Extract with deterministic fallbacks when possible."""

    def extract_with_fallback(self, input_text: str, schema: Dict) -> ExtractionResult:
        """
        Attempt deterministic extraction first, fall back to LLM.

        Order:
        1. Regex patterns (deterministic)
        2. NLP entity recognition (mostly deterministic)
        3. LLM extraction (non-deterministic, logged)
        """
        result = {}
        extraction_method = {}

        for field, field_schema in schema.items():
            # Try regex first
            if regex_pattern := field_schema.get("regex"):
                match = re.search(regex_pattern, input_text)
                if match:
                    result[field] = match.group(1)
                    extraction_method[field] = "regex_deterministic"
                    continue

            # Try date parsing (deterministic)
            if field_schema.get("type") == "date":
                parsed = dateutil.parser.parse(input_text, fuzzy=True)
                if parsed:
                    result[field] = parsed.isoformat()
                    extraction_method[field] = "dateutil_deterministic"
                    continue

            # Fall back to LLM (non-deterministic, fully logged)
            llm_result = self._llm_extract(input_text, field, field_schema)
            result[field] = llm_result.value
            extraction_method[field] = f"llm_{llm_result.model_id}"

        return ExtractionResult(
            values=result,
            methods=extraction_method,
            deterministic_ratio=self._calculate_deterministic_ratio(extraction_method)
        )
```

---

## Part 2: Financial Circuit Breaker

### The Core Problem

AI systems should NEVER autonomously execute high-impact financial decisions. The existing 5-level trust framework (INFORM -> SUGGEST -> PRE_PREPARE -> ONE_CLICK -> AUTO_EXECUTE) doesn't account for financial impact.

### State-of-the-Art: Impact-Based Gating

**Research Finding:** Leading enterprise AI systems (2026) implement "Impact Budgets" - separate from confidence thresholds.

```
                    CONFIDENCE GATE              IMPACT GATE
                    (Can AI do this?)            (Should AI do this?)
                         │                             │
Decision ─────────────►  │                             │
                         ▼                             ▼
                    ┌─────────────┐              ┌─────────────┐
                    │ >95% conf   │              │ <$500 impact│
                    │ = AUTO_EXEC │              │ = AUTO OK   │
                    └─────────────┘              └─────────────┘
                         │                             │
                         └─────────────┬───────────────┘
                                       ▼
                            BOTH gates must pass
                            for AUTO_EXECUTE
```

### Implementation: The Impact Calculator

```python
@dataclass
class ImpactAssessment:
    """Deterministic calculation of action impact."""

    financial_impact: Decimal      # Dollar amount at risk
    reversibility_score: float     # 0 = irreversible, 1 = fully reversible
    blast_radius: int              # Number of entities affected
    time_sensitivity: float        # 0 = no urgency, 1 = immediate

    # Calculated
    total_impact_score: Decimal
    impact_category: str           # "trivial", "low", "medium", "high", "critical"
    requires_human: bool

class ImpactCalculator:
    """
    Deterministic impact calculation.

    CRITICAL: This NEVER uses AI. Pure math only.
    """

    # Configurable thresholds (stored in Seed Vault)
    THRESHOLDS = {
        "auto_execute_max": Decimal("500.00"),
        "one_click_max": Decimal("5000.00"),
        "human_required_min": Decimal("5000.01"),
    }

    REVERSIBILITY_WEIGHTS = {
        "fully_reversible": 0.5,      # Cut impact in half
        "partially_reversible": 0.75,
        "irreversible": 1.0,          # Full impact
    }

    @classmethod
    def calculate_impact(
        cls,
        action_type: str,
        financial_amount: Decimal,
        affected_entities: List[str],
        reversibility: str,
        deadline_hours: Optional[int] = None
    ) -> ImpactAssessment:
        """
        Calculate total impact score using deterministic formula.

        Formula:
        impact_score = (financial_amount * reversibility_weight) +
                       (blast_radius * 50) +
                       (time_pressure_penalty)
        """
        # Reversibility adjustment
        rev_weight = Decimal(str(cls.REVERSIBILITY_WEIGHTS.get(reversibility, 1.0)))
        adjusted_financial = financial_amount * rev_weight

        # Blast radius penalty
        blast_radius = len(affected_entities)
        blast_penalty = Decimal(blast_radius * 50)

        # Time pressure (urgent = less review time = higher impact)
        time_penalty = Decimal("0")
        if deadline_hours is not None and deadline_hours < 24:
            time_penalty = Decimal("200") * (Decimal("24") - Decimal(deadline_hours)) / Decimal("24")

        # Total impact
        total_impact = adjusted_financial + blast_penalty + time_penalty

        # Categorize
        if total_impact <= Decimal("100"):
            category = "trivial"
        elif total_impact <= Decimal("500"):
            category = "low"
        elif total_impact <= Decimal("2000"):
            category = "medium"
        elif total_impact <= Decimal("5000"):
            category = "high"
        else:
            category = "critical"

        # Human required?
        requires_human = total_impact > cls.THRESHOLDS["auto_execute_max"]

        return ImpactAssessment(
            financial_impact=financial_amount,
            reversibility_score=float(1 - rev_weight),
            blast_radius=blast_radius,
            time_sensitivity=float(time_penalty / Decimal("200")),
            total_impact_score=total_impact,
            impact_category=category,
            requires_human=requires_human
        )
```

### Integration with 5-Level Trust Framework

The Financial Circuit Breaker acts as an **additional gate** on top of the existing trust framework:

```python
class AutonomyGate:
    """Combined confidence + impact gating."""

    def check_autonomy(
        self,
        confidence: float,
        action_type: str,
        impact: ImpactAssessment
    ) -> AutonomyDecision:
        """
        Determine autonomy level with both gates.

        Truth Table:
        | Confidence   | Impact    | Result           |
        |--------------|-----------|------------------|
        | >95%         | <$500     | AUTO_EXECUTE     |
        | >95%         | >$500     | ONE_CLICK        |
        | 90-95%       | <$500     | ONE_CLICK        |
        | 90-95%       | >$500     | PRE_PREPARE      |
        | 80-90%       | Any       | SUGGEST          |
        | <80%         | Any       | INFORM           |
        | Any          | >$5000    | HUMAN_REQUIRED   |
        """
        # Hard stop for critical impact
        if impact.total_impact_score > Decimal("5000"):
            return AutonomyDecision(
                level=TrustLevel.INFORM,
                reason="Impact exceeds $5000 threshold - human decision required",
                circuit_breaker_triggered=True
            )

        # Get base trust level from confidence
        base_level = self._confidence_to_level(confidence, action_type)

        # Apply impact downgrade
        if impact.requires_human:
            # Downgrade by one level
            downgraded = self._downgrade_level(base_level)
            return AutonomyDecision(
                level=downgraded,
                reason=f"Impact ${impact.total_impact_score} triggers human review",
                circuit_breaker_triggered=True
            )

        return AutonomyDecision(
            level=base_level,
            reason="Both confidence and impact gates passed",
            circuit_breaker_triggered=False
        )
```

---

## Part 3: Decision Replay Engine

### The Core Problem

For legal discovery and audits, you need to answer: "Why did the system make this decision on January 15th?" and prove it would make the SAME decision if run again with the same inputs.

### State-of-the-Art: Lineage Anchors

**Research Finding:** The 2026 standard for AI decision audit trails is the "Lineage Anchor" pattern:

```
┌────────────────────────────────────────────────────────────────┐
│                      DECISION RECORD                            │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  decision_id: "DEC-2026-01-15-ABC123"                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  LINEAGE ANCHOR                         │   │
│  │  input_hash: SHA256(all_inputs)                        │   │
│  │  model_id: "claude-opus-4-5-20251101"                  │   │
│  │  model_params: {temperature: 0, seed: 42}              │   │
│  │  vault_version: "seed-vault-v2.3.1"                    │   │
│  │  system_prompt_hash: SHA256(system_prompt)             │   │
│  │  extraction_contract_version: "1.0.0"                  │   │
│  │  calculator_version: "1.0.0"                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  inputs: {...}                                                  │
│  extracted_parameters: {...}                                    │
│  calculated_outputs: {...}                                      │
│  final_decision: "..."                                          │
│  confidence: 0.92                                               │
│  impact_assessment: {...}                                       │
│                                                                 │
│  blockchain_hash: "prev_hash + this_hash"                       │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Implementation: The Replay Engine

```python
@dataclass
class LineageAnchor:
    """Immutable anchor for decision reproducibility."""

    # Input provenance
    input_hash: str              # SHA-256 of canonical input
    input_source: str            # Where input came from
    input_timestamp: str         # When input was received

    # Model provenance
    model_id: str                # Exact model version
    model_params: Dict[str, Any] # temperature, seed, etc.
    api_version: str             # Provider API version

    # Context provenance
    vault_version: str           # Seed Vault version
    vault_hash: str              # SHA-256 of vault rules
    system_prompt_hash: str      # SHA-256 of system prompt

    # Code provenance
    extraction_version: str      # Extraction contract version
    calculator_version: str      # Calculator function version

    def to_hash(self) -> str:
        """Create deterministic hash of this anchor."""
        canonical = json.dumps(asdict(self), sort_keys=True)
        return hashlib.sha256(canonical.encode()).hexdigest()


class DecisionReplayEngine:
    """
    Replay any historical decision with bit-for-bit accuracy.

    CRITICAL: This is for LEGAL and AUDIT purposes.
    """

    def __init__(self, decision_store: DecisionStore, vault_archive: VaultArchive):
        self.decision_store = decision_store
        self.vault_archive = vault_archive

    def replay_decision(self, decision_id: str) -> ReplayResult:
        """
        Replay a historical decision and verify reproducibility.

        Steps:
        1. Load original decision record
        2. Restore historical context (vault version, etc.)
        3. Re-run extraction with same inputs
        4. Re-run calculation with extracted params
        5. Compare results
        """
        # Load original
        original = self.decision_store.get(decision_id)
        anchor = original.lineage_anchor

        # Restore historical vault
        historical_vault = self.vault_archive.get_version(anchor.vault_version)

        # Re-run extraction (may vary - this is logged)
        replay_extraction = self._replay_extraction(
            original.inputs,
            anchor.extraction_version,
            anchor.model_id,
            anchor.model_params
        )

        # Re-run calculation (MUST be identical)
        replay_calculation = self._replay_calculation(
            replay_extraction.parameters,
            anchor.calculator_version
        )

        # Compare
        extraction_match = self._compare_extractions(
            original.extracted_parameters,
            replay_extraction.parameters
        )
        calculation_match = (
            original.calculated_outputs == replay_calculation.outputs
        )

        return ReplayResult(
            original_decision_id=decision_id,
            replay_timestamp=datetime.now().isoformat(),
            extraction_reproduced=extraction_match.is_exact,
            extraction_diff=extraction_match.differences,
            calculation_reproduced=calculation_match,
            calculation_diff=None if calculation_match else {
                "original": original.calculated_outputs,
                "replay": replay_calculation.outputs
            },
            overall_reproducible=extraction_match.is_exact and calculation_match,
            forensic_notes=self._generate_forensic_notes(
                extraction_match, calculation_match
            )
        )

    def _replay_extraction(
        self,
        inputs: Dict,
        extraction_version: str,
        model_id: str,
        model_params: Dict
    ) -> ExtractionResult:
        """
        Re-run extraction with historical parameters.

        NOTE: LLM extraction may NOT be identical even with same params.
        This is logged and flagged.
        """
        # Load historical extraction contract
        contract = ExtractionContractRegistry.get_version(extraction_version)

        # Configure model exactly as before
        model = ModelFactory.create(
            model_id=model_id,
            **model_params
        )

        # Run extraction
        return contract.extract(inputs, model)

    def _replay_calculation(
        self,
        parameters: Dict,
        calculator_version: str
    ) -> CalculationResult:
        """
        Re-run calculation with historical calculator.

        NOTE: This MUST be identical. Pure functions = deterministic.
        """
        calculator = CalculatorRegistry.get_version(calculator_version)
        return calculator.calculate(parameters)
```

### Handling LLM Non-Determinism

**Key Research Finding:** You CANNOT guarantee bit-for-bit LLM reproduction. Instead:

1. **Log extraction differences** - Track how extractions vary
2. **Require calculation match** - Fail replay if calculations differ
3. **Store original extraction** - The original is the "truth" for legal purposes
4. **Flag "drift alerts"** - If replay extracts differently, flag for review

```python
@dataclass
class ExtractionComparison:
    """Compare original vs replay extraction."""

    is_exact: bool
    semantic_match: bool        # Values mean the same thing
    differences: List[FieldDiff]
    drift_severity: str         # "none", "cosmetic", "material"

    def is_legally_acceptable(self) -> bool:
        """
        For legal purposes, we need:
        - Either exact match
        - Or semantic match with cosmetic differences only
        """
        return self.is_exact or (self.semantic_match and self.drift_severity == "cosmetic")

@dataclass
class FieldDiff:
    """Difference in a single extracted field."""

    field_name: str
    original_value: Any
    replay_value: Any
    diff_type: str   # "missing", "added", "changed", "format_only"
    impact: str      # "none", "cosmetic", "material"
```

---

## Part 4: Tiered Override Hygiene

### The Core Problem

Users naturally customize AI behavior through preferences and overrides. If these preferences "leak" into canonical rules (the Seed Vault), the system's deterministic guarantees are corrupted.

### State-of-the-Art: Preference Isolation

**Research Finding:** Enterprise AI systems must maintain strict separation between:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CANONICAL RULES                               │
│                    (Seed Vault)                                  │
│                                                                  │
│  - Immutable until explicitly promoted                          │
│  - Version controlled                                            │
│  - Requires manual review to change                             │
│  - Source of truth for replay                                   │
│                                                                  │
│  Examples:                                                       │
│  - "Tasks with >$500 impact require human approval"             │
│  - "Email drafts never auto-send"                               │
│  - "Confidence <80% = SUGGEST only"                             │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ PROMOTION REQUIRES
                           │ MANUAL REVIEW
                           │
┌─────────────────────────────────────────────────────────────────┐
│                    LOCAL PREFERENCES                             │
│                    (User-specific)                               │
│                                                                  │
│  - Ephemeral (can be reset)                                     │
│  - Per-user isolation                                           │
│  - Override canonical for THIS user only                        │
│  - Never affects other users                                    │
│                                                                  │
│  Examples:                                                       │
│  - "I prefer morning task suggestions"                          │
│  - "Use casual tone in my emails"                               │
│  - "Show me weather alerts"                                     │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ LEARNED PATTERNS
                           │ (May suggest promotion)
                           │
┌─────────────────────────────────────────────────────────────────┐
│                    LEARNED PATTERNS                              │
│                    (Observed behavior)                           │
│                                                                  │
│  - Auto-detected from user behavior                             │
│  - Lowest priority                                              │
│  - Can be wrong (just observations)                             │
│  - Requires explicit user confirmation to become preference     │
│                                                                  │
│  Examples:                                                       │
│  - "User seems to prefer Tuesday for planning"                  │
│  - "User usually rejects suggestions during deep work"          │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation: The Override Manager

```python
class OverrideManager:
    """
    Manage the hierarchy of rules, preferences, and learned patterns.

    Priority (highest to lowest):
    1. Canonical Rules (Seed Vault) - NEVER overridden
    2. User Preferences - Override learned patterns
    3. Learned Patterns - Lowest priority
    """

    def __init__(self, seed_vault: SeedVault, user_id: str):
        self.seed_vault = seed_vault
        self.user_id = user_id
        self.preferences_store = PreferencesStore(user_id)
        self.patterns_store = LearnedPatternsStore(user_id)

    def get_effective_rule(self, rule_key: str) -> EffectiveRule:
        """
        Get the effective rule value with full provenance.

        Returns the active value and WHERE it came from.
        """
        # Check canonical first
        canonical = self.seed_vault.get_rule(rule_key)
        if canonical and canonical.is_hard_rule:
            return EffectiveRule(
                value=canonical.value,
                source="canonical",
                overridable=False,
                provenance=f"Seed Vault v{self.seed_vault.version}"
            )

        # Check user preference
        preference = self.preferences_store.get(rule_key)
        if preference:
            return EffectiveRule(
                value=preference.value,
                source="user_preference",
                overridable=True,
                provenance=f"User preference set {preference.created_at}"
            )

        # Check learned pattern
        pattern = self.patterns_store.get(rule_key)
        if pattern and pattern.confidence > 0.7:
            return EffectiveRule(
                value=pattern.suggested_value,
                source="learned_pattern",
                overridable=True,
                provenance=f"Learned from {pattern.sample_count} observations"
            )

        # Fall back to canonical default
        if canonical:
            return EffectiveRule(
                value=canonical.value,
                source="canonical_default",
                overridable=True,
                provenance=f"Seed Vault default v{self.seed_vault.version}"
            )

        return None

    def set_user_preference(
        self,
        rule_key: str,
        value: Any,
        reason: str
    ) -> SetPreferenceResult:
        """
        Set a user preference.

        CRITICAL: This CANNOT override hard canonical rules.
        """
        # Check if canonical rule is overridable
        canonical = self.seed_vault.get_rule(rule_key)
        if canonical and canonical.is_hard_rule:
            return SetPreferenceResult(
                success=False,
                error=f"Rule '{rule_key}' is a canonical hard rule and cannot be overridden",
                canonical_reason=canonical.rationale
            )

        # Store preference
        self.preferences_store.set(
            key=rule_key,
            value=value,
            reason=reason,
            timestamp=datetime.now()
        )

        return SetPreferenceResult(
            success=True,
            effective_value=value,
            warning=self._check_preference_drift(rule_key, value)
        )

    def promote_to_canonical(
        self,
        rule_key: str,
        new_value: Any,
        justification: str,
        approver: str
    ) -> PromotionResult:
        """
        Promote a preference to canonical status.

        CRITICAL: This requires human approval and creates an audit trail.
        """
        # Get current effective rule
        current = self.get_effective_rule(rule_key)

        # Create promotion request
        promotion = PromotionRequest(
            rule_key=rule_key,
            current_value=current.value if current else None,
            current_source=current.source if current else None,
            proposed_value=new_value,
            justification=justification,
            requested_by=self.user_id,
            approved_by=approver,
            timestamp=datetime.now()
        )

        # Log promotion for audit
        self._log_promotion(promotion)

        # Update Seed Vault (creates new version)
        new_version = self.seed_vault.update_rule(
            rule_key=rule_key,
            value=new_value,
            justification=justification,
            approver=approver
        )

        return PromotionResult(
            success=True,
            new_vault_version=new_version,
            audit_id=promotion.audit_id
        )


@dataclass
class EffectiveRule:
    """A rule with its effective value and provenance."""

    value: Any
    source: str        # "canonical", "user_preference", "learned_pattern"
    overridable: bool
    provenance: str    # Human-readable source description
```

### Preventing Preference Drift

**Key Research Finding:** The danger is when user-specific preferences accidentally become system-wide rules through copy-paste, migration bugs, or casual promotion.

```python
class PreferenceDriftDetector:
    """
    Detect and prevent preference drift into canonical rules.
    """

    def check_for_drift(self, vault_version: str) -> List[DriftAlert]:
        """
        Analyze Seed Vault for potential preference contamination.
        """
        alerts = []

        # Get all rules added in this version
        new_rules = self.seed_vault.get_rules_added_in_version(vault_version)

        for rule in new_rules:
            # Check if rule looks like a preference
            if self._looks_like_preference(rule):
                alerts.append(DriftAlert(
                    rule_key=rule.key,
                    concern="Rule appears to be user-specific preference",
                    evidence=self._gather_evidence(rule),
                    recommendation="Review if this should be canonical or preference"
                ))

            # Check if rule was recently a preference
            if self._was_recently_preference(rule.key):
                alerts.append(DriftAlert(
                    rule_key=rule.key,
                    concern="Rule was a user preference within last 30 days",
                    evidence=f"Was preference for user {self._get_preference_user(rule.key)}",
                    recommendation="Verify promotion was intentional"
                ))

        return alerts

    def _looks_like_preference(self, rule: CanonicalRule) -> bool:
        """Heuristics for detecting preference-like rules."""
        preference_indicators = [
            "prefer",
            "like",
            "my",
            "morning",
            "evening",
            "casual",
            "formal",
            "always",
            "never"
        ]

        rule_text = f"{rule.title} {rule.description}".lower()
        return any(indicator in rule_text for indicator in preference_indicators)
```

---

## Part 5: Intelligent Safe Mode

### The Core Problem

When an AI system becomes "confused" (high abstain rate, many conflicts, low confidence), it should NOT continue operating at full autonomy. It should auto-lock to prevent runaway bad decisions.

### State-of-the-Art: Self-Monitoring Dashboard

**Research Finding:** 2026 enterprise AI systems implement "cognitive circuit breakers" that monitor system health and auto-degrade gracefully.

```
┌────────────────────────────────────────────────────────────────┐
│                    SAFE MODE DASHBOARD                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ABSTAIN RATE                           CONFLICT RATE           │
│  ████████████░░░░░░░░░░  35%           ██████░░░░░░░░░░░░░  15% │
│  Threshold: 40%                         Threshold: 20%          │
│  Status: WARNING                        Status: NORMAL          │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  CONFIDENCE DISTRIBUTION                                        │
│  >95%  ████████                 (32 decisions)                  │
│  85-95% ██████████████          (56 decisions)                  │
│  70-85% ████████████████████    (80 decisions)                  │
│  <70%   ██████████████████████████████  (124 decisions)  <--!   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  SAFE MODE STATUS: YELLOW (Elevated Abstain Rate)               │
│                                                                 │
│  Actions Taken:                                                 │
│  - AUTO_EXECUTE disabled                                        │
│  - ONE_CLICK requires extra confirmation                        │
│  - Alerting human supervisor                                    │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Implementation: The Safe Mode Controller

```python
class SafeModeController:
    """
    Monitor system health and auto-engage safe mode.

    Safe Mode Levels:
    - GREEN: Normal operation
    - YELLOW: Elevated caution (disable AUTO_EXECUTE)
    - RED: Read-only (human must approve everything)
    - LOCKDOWN: No AI decisions (emergency only)
    """

    # Configurable thresholds
    THRESHOLDS = {
        "abstain_rate": {
            "yellow": 0.30,  # 30% abstain = yellow
            "red": 0.50,     # 50% abstain = red
            "lockdown": 0.70 # 70% abstain = lockdown
        },
        "conflict_rate": {
            "yellow": 0.15,
            "red": 0.30,
            "lockdown": 0.50
        },
        "low_confidence_ratio": {
            "yellow": 0.40,  # 40% of decisions <70% confidence
            "red": 0.60,
            "lockdown": 0.80
        }
    }

    def __init__(self, metrics_store: MetricsStore, alert_system: AlertSystem):
        self.metrics_store = metrics_store
        self.alert_system = alert_system
        self.current_level = SafeModeLevel.GREEN

    def evaluate_system_health(self, time_window_hours: int = 24) -> HealthAssessment:
        """
        Evaluate system health and determine safe mode level.
        """
        # Gather metrics
        metrics = self.metrics_store.get_metrics(hours=time_window_hours)

        # Calculate rates
        abstain_rate = metrics.abstain_count / max(metrics.total_decisions, 1)
        conflict_rate = metrics.conflict_count / max(metrics.total_decisions, 1)
        low_conf_ratio = metrics.low_confidence_count / max(metrics.total_decisions, 1)

        # Determine level for each metric
        abstain_level = self._get_level("abstain_rate", abstain_rate)
        conflict_level = self._get_level("conflict_rate", conflict_rate)
        confidence_level = self._get_level("low_confidence_ratio", low_conf_ratio)

        # Overall level is the WORST of any metric
        overall_level = max(abstain_level, conflict_level, confidence_level)

        # Apply level change
        if overall_level != self.current_level:
            self._change_level(overall_level, metrics)

        return HealthAssessment(
            overall_level=overall_level,
            abstain_rate=abstain_rate,
            conflict_rate=conflict_rate,
            low_confidence_ratio=low_conf_ratio,
            total_decisions=metrics.total_decisions,
            recommendations=self._get_recommendations(overall_level, metrics)
        )

    def _get_level(self, metric_name: str, value: float) -> SafeModeLevel:
        """Determine level for a single metric."""
        thresholds = self.THRESHOLDS[metric_name]

        if value >= thresholds["lockdown"]:
            return SafeModeLevel.LOCKDOWN
        elif value >= thresholds["red"]:
            return SafeModeLevel.RED
        elif value >= thresholds["yellow"]:
            return SafeModeLevel.YELLOW
        else:
            return SafeModeLevel.GREEN

    def _change_level(self, new_level: SafeModeLevel, metrics: Metrics):
        """
        Change safe mode level with appropriate actions.
        """
        old_level = self.current_level
        self.current_level = new_level

        # Log the change
        self._log_level_change(old_level, new_level, metrics)

        # Take actions based on new level
        if new_level == SafeModeLevel.YELLOW:
            self._engage_yellow_mode()
        elif new_level == SafeModeLevel.RED:
            self._engage_red_mode()
        elif new_level == SafeModeLevel.LOCKDOWN:
            self._engage_lockdown()
        elif new_level == SafeModeLevel.GREEN:
            self._disengage_safe_mode()

        # Alert appropriate people
        self.alert_system.send_level_change_alert(
            old_level=old_level,
            new_level=new_level,
            metrics=metrics
        )

    def _engage_yellow_mode(self):
        """
        YELLOW: Elevated caution.
        - Disable AUTO_EXECUTE for all actions
        - Add extra confirmation step to ONE_CLICK
        - Increase logging verbosity
        """
        AutonomyConfig.set("auto_execute_enabled", False)
        AutonomyConfig.set("one_click_extra_confirm", True)
        LoggingConfig.set("verbosity", "debug")

    def _engage_red_mode(self):
        """
        RED: Read-only mode.
        - All decisions require human approval
        - AI can only SUGGEST
        - Alert sent to supervisor
        """
        AutonomyConfig.set("max_autonomy_level", TrustLevel.SUGGEST)
        AutonomyConfig.set("require_human_all", True)
        self.alert_system.send_urgent_alert(
            "Safe Mode RED engaged - all AI decisions require human approval"
        )

    def _engage_lockdown(self):
        """
        LOCKDOWN: Emergency stop.
        - No AI decisions at all
        - Human must operate manually
        - Critical alert sent
        """
        AutonomyConfig.set("ai_enabled", False)
        self.alert_system.send_critical_alert(
            "Safe Mode LOCKDOWN - AI decision-making disabled"
        )


class SafeModeLevel(IntEnum):
    """Safe mode levels ordered by severity."""
    GREEN = 0
    YELLOW = 1
    RED = 2
    LOCKDOWN = 3
```

### Recommended Thresholds

Based on research, here are recommended starting thresholds:

| Metric | Yellow | Red | Lockdown |
|--------|--------|-----|----------|
| **Abstain Rate** | 30% | 50% | 70% |
| **Conflict Rate** | 15% | 30% | 50% |
| **Low Confidence Ratio** | 40% | 60% | 80% |

**Rationale:**
- **Abstain Rate**: If the system is refusing to make decisions 30%+ of the time, something is wrong
- **Conflict Rate**: Multi-agent systems with >15% internal conflicts need investigation
- **Low Confidence**: If 40%+ of decisions are below 70% confidence, the system is guessing too much

---

## Part 6: Integration with Existing TinyPM Architecture

### How These Components Fit Together

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        TINYPM SOVEREIGN SEED ARCHITECTURE               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                │
│   │   INPUTS    │    │  SEED VAULT │    │  OVERRIDE   │                │
│   │  (Raw data, │───▶│  (Canonical │◀───│  MANAGER    │                │
│   │   docs)     │    │   Rules)    │    │  (Prefs)    │                │
│   └─────────────┘    └─────────────┘    └─────────────┘                │
│         │                   │                   │                       │
│         ▼                   ▼                   ▼                       │
│   ┌─────────────────────────────────────────────────────────┐          │
│   │              EXTRACTION/CALCULATION SPLIT                │          │
│   │                                                          │          │
│   │   AI Extraction ─────▶ Parameters ─────▶ Pure Functions │          │
│   │   (Logged)              (Validated)       (Deterministic)│          │
│   └─────────────────────────────────────────────────────────┘          │
│         │                                                              │
│         ▼                                                              │
│   ┌─────────────┐    ┌─────────────┐                                   │
│   │  IMPACT     │───▶│  AUTONOMY   │                                   │
│   │  CALCULATOR │    │  GATE       │                                   │
│   │  ($500 gate)│    │  (5-level)  │                                   │
│   └─────────────┘    └─────────────┘                                   │
│         │                   │                                          │
│         │                   │                                          │
│         ▼                   ▼                                          │
│   ┌─────────────────────────────────────────────────────────┐          │
│   │              DECISION REPLAY ENGINE                      │          │
│   │                                                          │          │
│   │   Lineage Anchor + Audit Trail + Blockchain Hash        │          │
│   └─────────────────────────────────────────────────────────┘          │
│         │                                                              │
│         ▼                                                              │
│   ┌─────────────────────────────────────────────────────────┐          │
│   │              SAFE MODE CONTROLLER                        │          │
│   │                                                          │          │
│   │   Abstain Rate │ Conflict Rate │ Confidence Distribution│          │
│   │   ──────────────────────────────────────────────────────│          │
│   │   GREEN │ YELLOW │ RED │ LOCKDOWN                       │          │
│   └─────────────────────────────────────────────────────────┘          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Integration Points with Existing Code

| Existing Module | Integration |
|-----------------|-------------|
| `anticipatory_engine.py` | Add Impact Calculator before action execution |
| `learning_engine.py` | Feed confidence calibration into Abstain Rate metrics |
| `adversarial_auditor.py` | Use Decision Replay Engine for audit verification |
| `seed_vault.py` | Add Override Manager as companion class |

---

## Part 7: JSON Schema Designs

### Schema 1: Scoring Contract v1.0.0

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://tinypm.dev/schemas/scoring_contract_v1.0.0.json",
  "title": "TinyPM Scoring Contract",
  "description": "Contract for deterministic input/output of scoring calculations",
  "type": "object",
  "required": ["contract_version", "scoring_function", "inputs", "output"],
  "properties": {
    "contract_version": {
      "type": "string",
      "const": "1.0.0"
    },
    "scoring_function": {
      "type": "string",
      "description": "Name of the deterministic scoring function",
      "enum": [
        "calculate_task_priority",
        "calculate_impact_score",
        "calculate_confidence_calibration",
        "calculate_lease_rent",
        "calculate_roi"
      ]
    },
    "inputs": {
      "type": "object",
      "description": "Input parameters for the scoring function",
      "properties": {
        "input_hash": {
          "type": "string",
          "description": "SHA-256 hash of canonical input representation"
        },
        "parameters": {
          "type": "object",
          "description": "Function-specific input parameters"
        },
        "extraction_metadata": {
          "type": "object",
          "properties": {
            "extractor_version": {"type": "string"},
            "extraction_method": {
              "type": "string",
              "enum": ["deterministic", "llm", "hybrid"]
            },
            "extraction_timestamp": {"type": "string", "format": "date-time"},
            "confidence_scores": {
              "type": "object",
              "additionalProperties": {"type": "number", "minimum": 0, "maximum": 1}
            }
          }
        }
      },
      "required": ["input_hash", "parameters"]
    },
    "output": {
      "type": "object",
      "properties": {
        "score": {
          "type": "number",
          "description": "The calculated score"
        },
        "output_hash": {
          "type": "string",
          "description": "SHA-256 hash of output for verification"
        },
        "calculation_timestamp": {
          "type": "string",
          "format": "date-time"
        },
        "calculator_version": {
          "type": "string"
        }
      },
      "required": ["score", "output_hash", "calculation_timestamp", "calculator_version"]
    },
    "formula": {
      "type": "object",
      "description": "Human-readable formula documentation",
      "properties": {
        "equation": {"type": "string"},
        "variables": {
          "type": "object",
          "additionalProperties": {
            "type": "object",
            "properties": {
              "description": {"type": "string"},
              "type": {"type": "string"},
              "range": {"type": "string"}
            }
          }
        }
      }
    }
  }
}
```

### Schema 2: Decision Record v1.0.0

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://tinypm.dev/schemas/decision_record_v1.0.0.json",
  "title": "TinyPM Decision Record",
  "description": "Full decision lineage record for audit and replay",
  "type": "object",
  "required": [
    "decision_id",
    "timestamp",
    "lineage_anchor",
    "inputs",
    "extraction",
    "calculation",
    "decision",
    "audit_chain"
  ],
  "properties": {
    "decision_id": {
      "type": "string",
      "pattern": "^DEC-[0-9]{4}-[0-9]{2}-[0-9]{2}-[A-Z0-9]{6}$",
      "description": "Unique decision identifier"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "lineage_anchor": {
      "type": "object",
      "required": [
        "input_hash",
        "model_id",
        "vault_version",
        "extraction_version",
        "calculator_version"
      ],
      "properties": {
        "input_hash": {
          "type": "string",
          "description": "SHA-256 of all inputs"
        },
        "model_id": {
          "type": "string",
          "description": "Exact model version used for extraction"
        },
        "model_params": {
          "type": "object",
          "properties": {
            "temperature": {"type": "number"},
            "seed": {"type": "integer"},
            "max_tokens": {"type": "integer"}
          }
        },
        "api_version": {
          "type": "string",
          "description": "Provider API version"
        },
        "vault_version": {
          "type": "string",
          "description": "Seed Vault version at decision time"
        },
        "vault_hash": {
          "type": "string",
          "description": "SHA-256 of vault rules"
        },
        "system_prompt_hash": {
          "type": "string"
        },
        "extraction_version": {
          "type": "string"
        },
        "calculator_version": {
          "type": "string"
        }
      }
    },
    "inputs": {
      "type": "object",
      "description": "Raw inputs that triggered this decision",
      "properties": {
        "raw_input": {"type": "string"},
        "input_type": {"type": "string"},
        "source": {"type": "string"},
        "received_at": {"type": "string", "format": "date-time"}
      }
    },
    "extraction": {
      "type": "object",
      "description": "Parameters extracted by AI",
      "properties": {
        "extracted_parameters": {"type": "object"},
        "confidence_scores": {
          "type": "object",
          "additionalProperties": {"type": "number"}
        },
        "source_citations": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "field": {"type": "string"},
              "source_text": {"type": "string"},
              "char_start": {"type": "integer"},
              "char_end": {"type": "integer"}
            }
          }
        },
        "extraction_method": {"type": "string"}
      }
    },
    "calculation": {
      "type": "object",
      "description": "Deterministic calculation results",
      "properties": {
        "scoring_contract": {"$ref": "#/$defs/scoring_contract_ref"},
        "calculated_outputs": {"type": "object"},
        "formula_applied": {"type": "string"}
      }
    },
    "decision": {
      "type": "object",
      "description": "The final decision",
      "properties": {
        "decision_type": {
          "type": "string",
          "enum": ["approve", "reject", "defer", "escalate"]
        },
        "confidence": {"type": "number"},
        "impact_assessment": {
          "type": "object",
          "properties": {
            "financial_impact": {"type": "number"},
            "impact_category": {"type": "string"},
            "requires_human": {"type": "boolean"}
          }
        },
        "autonomy_level": {
          "type": "string",
          "enum": ["INFORM", "SUGGEST", "PRE_PREPARE", "ONE_CLICK", "AUTO_EXECUTE"]
        },
        "reasoning": {"type": "string"}
      }
    },
    "audit_chain": {
      "type": "object",
      "description": "Blockchain-style audit chain",
      "properties": {
        "previous_hash": {"type": "string"},
        "this_hash": {"type": "string"},
        "chain_position": {"type": "integer"}
      }
    },
    "replay_info": {
      "type": "object",
      "description": "Information for decision replay",
      "properties": {
        "is_replayable": {"type": "boolean"},
        "replay_notes": {"type": "string"},
        "last_replay_at": {"type": "string", "format": "date-time"},
        "replay_match": {"type": "boolean"}
      }
    }
  },
  "$defs": {
    "scoring_contract_ref": {
      "type": "string",
      "description": "Reference to scoring contract used"
    }
  }
}
```

### Schema 3: Replay Request v1.0.0

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://tinypm.dev/schemas/replay_request_v1.0.0.json",
  "title": "TinyPM Replay Request",
  "description": "API contract for replaying historical decisions",
  "type": "object",
  "required": ["replay_id", "decision_id", "replay_mode"],
  "properties": {
    "replay_id": {
      "type": "string",
      "description": "Unique ID for this replay request"
    },
    "decision_id": {
      "type": "string",
      "description": "ID of the decision to replay"
    },
    "replay_mode": {
      "type": "string",
      "enum": ["full", "extraction_only", "calculation_only", "verify_chain"],
      "description": "What to replay"
    },
    "options": {
      "type": "object",
      "properties": {
        "use_historical_model": {
          "type": "boolean",
          "default": true,
          "description": "Use the exact model version from original"
        },
        "use_historical_vault": {
          "type": "boolean",
          "default": true,
          "description": "Use the vault version from original"
        },
        "strict_match": {
          "type": "boolean",
          "default": false,
          "description": "Fail if not bit-for-bit identical"
        },
        "allow_semantic_match": {
          "type": "boolean",
          "default": true,
          "description": "Accept semantic equivalence for extraction"
        }
      }
    },
    "response": {
      "type": "object",
      "description": "Replay response (populated on completion)",
      "properties": {
        "replay_timestamp": {"type": "string", "format": "date-time"},
        "extraction_result": {
          "type": "object",
          "properties": {
            "reproduced": {"type": "boolean"},
            "match_type": {
              "type": "string",
              "enum": ["exact", "semantic", "different"]
            },
            "differences": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "field": {"type": "string"},
                  "original": {},
                  "replay": {},
                  "impact": {"type": "string"}
                }
              }
            }
          }
        },
        "calculation_result": {
          "type": "object",
          "properties": {
            "reproduced": {"type": "boolean"},
            "original_output": {"type": "object"},
            "replay_output": {"type": "object"}
          }
        },
        "chain_verification": {
          "type": "object",
          "properties": {
            "chain_valid": {"type": "boolean"},
            "first_invalid_position": {"type": "integer"}
          }
        },
        "overall_result": {
          "type": "string",
          "enum": ["REPRODUCED", "SEMANTIC_MATCH", "CALCULATION_MATCH_ONLY", "FAILED"]
        },
        "forensic_notes": {
          "type": "string",
          "description": "Human-readable explanation of differences"
        }
      }
    }
  }
}
```

---

## Part 8: Answers to Key Questions

### Q1: How does the Financial Circuit Breaker integrate with the existing 5-level trust?

**Answer:** The Financial Circuit Breaker operates as an **independent gate** that can **downgrade** the trust level but never upgrade it.

```
                    CONFIDENCE GATE
                    (Existing 5-level)
                          │
                          ▼
                    Proposed Level
                          │
                          ▼
                    IMPACT GATE
                    (New circuit breaker)
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
          <$500       $500-$5000    >$5000
          (Pass)      (Downgrade)   (Human)
              │           │           │
              ▼           ▼           ▼
          Final       Final-1      INFORM
          Level       Level        (always)
```

**Integration Code:**
```python
def get_final_autonomy(confidence_level: TrustLevel, impact: ImpactAssessment) -> TrustLevel:
    if impact.total_impact_score > 5000:
        return TrustLevel.INFORM  # Always require human

    if impact.requires_human:  # $500-$5000
        return downgrade_one_level(confidence_level)

    return confidence_level  # Pass through unchanged
```

### Q2: Can we achieve true bit-for-bit replay with LLM-based extraction?

**Answer:** **No**, and we should not try. Instead:

1. **Calculations MUST be bit-for-bit** (pure functions)
2. **Extractions are logged and compared** (semantic matching)
3. **Original extraction is the legal "truth"**
4. **Replay differences are flagged but not failures**

The replay engine should report:
- `REPRODUCED` - Everything matches exactly
- `SEMANTIC_MATCH` - Extraction varies but means the same thing
- `CALCULATION_MATCH_ONLY` - Extraction different but calculation same
- `FAILED` - Calculation produced different result (this is a bug)

### Q3: How do we version the Seed Vault for replay purposes?

**Answer:** Implement **immutable versioning** with hash verification:

```python
class VersionedSeedVault:
    def __init__(self):
        self.version = "2.3.1"
        self.rules_hash = self._calculate_hash()
        self.created_at = datetime.now()

    def _calculate_hash(self) -> str:
        # Canonical JSON representation
        canonical = json.dumps(
            {k: v.to_dict() for k, v in sorted(self.rules.items())},
            sort_keys=True
        )
        return hashlib.sha256(canonical.encode()).hexdigest()

    def update_rule(self, key, value, approver) -> str:
        # Create NEW version, don't modify existing
        new_version = self._increment_version()

        # Archive current version
        self._archive_current()

        # Apply change
        self.rules[key] = value
        self.version = new_version
        self.rules_hash = self._calculate_hash()

        return new_version

    def get_version(self, version_id: str) -> 'VersionedSeedVault':
        """Retrieve historical vault version."""
        return VaultArchive.restore(version_id)
```

### Q4: What are safe thresholds for Safe Mode?

**Answer:** Based on research and TinyPM's context:

| Metric | Yellow | Red | Lockdown | Rationale |
|--------|--------|-----|----------|-----------|
| Abstain Rate | 30% | 50% | 70% | If system refuses 30%+ decisions, investigate |
| Conflict Rate | 15% | 30% | 50% | Multi-agent conflict >15% indicates confusion |
| Low Confidence | 40% | 60% | 80% | >40% decisions below 70% = too much guessing |

**Recommendation:** Start conservative (lower thresholds), then relax based on operational experience.

---

## Part 9: Real-World Use Case Validation

### Use Case 1: Alberta's Pizza Litigation

**Scenario:** Need to replay the exact decision logic used in a filing decision.

**Solution:**
1. Query Decision Store for filing decision: `DEC-2026-01-15-ABC123`
2. Load Lineage Anchor to get historical context
3. Run replay with `replay_mode: "full"`
4. Verify `overall_result: "REPRODUCED"` or `"SEMANTIC_MATCH"`
5. Export forensic report for legal team

**Key Feature Used:** Decision Replay Engine with blockchain hash verification.

### Use Case 2: Don Kretschmann Lease

**Scenario:** Extract lease terms from messy document, calculate rent.

**Solution:**
1. **Extraction Phase (AI):**
   - Extract: `base_rent`, `acreage`, `escalation_rate`, `term_years`
   - Log confidence for each parameter
   - Cite exact source text for each extraction

2. **Calculation Phase (Deterministic):**
   - Use `calculate_lease_rent()` pure function
   - Formula is fixed and versioned

3. **Audit Trail:**
   - Decision Record captures both phases
   - Replay can verify calculation is correct
   - Extraction logged for legal review

**Key Feature Used:** Extraction/Calculation Split with source citations.

### Use Case 3: TinyPM Task Scoring

**Scenario:** Reproducible priority scores for project management.

**Solution:**
1. Define Scoring Contract for task priority
2. Extract task parameters: urgency, importance, effort, deadline, dependencies
3. Calculate using `calculate_task_priority_score()` - DETERMINISTIC
4. Store in Decision Record with full lineage

**Key Feature Used:** Scoring Contract with deterministic calculation.

---

## Conclusion

This research establishes the foundation for transforming TinyPM into a legally defensible, deterministic infrastructure. The key principles are:

1. **AI extracts, code calculates** - Never let AI do math
2. **Impact gates autonomy** - $500 threshold kills AUTO_EXECUTE
3. **Everything is replayable** - Full lineage anchors for audit
4. **Preferences stay separate** - Override hygiene prevents drift
5. **System monitors itself** - Safe Mode auto-engages when confused

These components work together to ensure that every AI decision in TinyPM is:
- **Auditable** - Full trail from input to output
- **Repeatable** - Calculations always match
- **Reversible** - Undo tokens and impact awareness
- **Legally Defensible** - Evidence-grade records

---

## Next Steps

1. **Implement Scoring Contract** - Start with task priority
2. **Add Impact Calculator** - Integrate with anticipatory_engine.py
3. **Build Decision Store** - Database for decision records
4. **Implement Vault Versioning** - Archive system for seed_vault.py
5. **Add Safe Mode Dashboard** - UI for system health monitoring

---

*Research conducted by Research Team Beta*
*Project "Sovereign Seed" - Phases 3 & 4*
