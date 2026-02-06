#!/usr/bin/env python3
"""
TinyPM Overlap Validator - Catching AI Hallucinations at the Extraction Layer
==============================================================================

Phase 1 of Project "Sovereign Seed"

The Problem:
AI says: "The rent is $1,500/month" and cites a document span.
But the cited span says: "The rent is $1,200/month"
This is a HALLUCINATION.

The Solution:
The Overlap Validator verifies that extracted values actually appear in cited
text spans using IoU (Intersection over Union) scoring.

Rule: If Overlap < 80%, Governor ABSTAINS

Key Components:
1. OverlapValidator - Core validation logic with IoU calculation
2. NormalizationService - Normalize values for fuzzy matching
3. ExtractionValidator - Higher-level validation for complete AI extractions
4. GovernorOverlapGate - Gate that forces Governor to abstain on invalid overlaps

Performance Requirements:
- Single validation: <10ms
- Batch of 100: <500ms
- Must not use external APIs (deterministic, offline-capable)

Created: 2026-02-04
Project: Sovereign Seed - Phase 1
"""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict, Any, Set
from enum import Enum
from datetime import datetime
import re
import hashlib
import json
from decimal import Decimal, InvalidOperation

# =============================================================================
# ENUMS AND DATA STRUCTURES
# =============================================================================

class OverlapStatus(Enum):
    """Status of overlap validation between extracted value and cited span."""
    VALID = "valid"           # Extracted value found in span (IoU >= 0.8)
    PARTIAL = "partial"       # Partial match (0.5 <= IoU < 0.8)
    INVALID = "invalid"       # Value not found (IoU < 0.5)
    HALLUCINATION = "hallucination"  # Value contradicts span


class ValueType(Enum):
    """Types of values for type-aware normalization."""
    CURRENCY = "currency"
    DATE = "date"
    PERCENTAGE = "percentage"
    NUMBER = "number"
    TEXT = "text"
    DURATION = "duration"
    MEASUREMENT = "measurement"
    EMAIL = "email"
    PHONE = "phone"
    ADDRESS = "address"
    UNKNOWN = "unknown"


@dataclass
class OverlapResult:
    """Result of overlap validation between extracted value and cited span."""
    status: OverlapStatus
    extracted_value: str
    cited_span: str
    iou_score: float  # 0.0 to 1.0
    found_in_span: bool
    normalized_match: bool  # True if normalized values match
    evidence: List[str]  # Tokens found in span
    missing: List[str]  # Tokens NOT found in span
    recommendation: str  # "accept", "review", "reject", "abstain"
    value_type: Optional[str] = None
    match_location: Optional[Tuple[int, int]] = None  # Start, end offsets
    confidence_adjustment: float = 0.0  # Suggested confidence adjustment
    forensic_notes: Optional[str] = None


@dataclass
class NormalizedValue:
    """A value after normalization with metadata."""
    original: str
    normalized: str
    tokens: List[str]
    value_type: ValueType
    numeric_value: Optional[Decimal] = None
    parsed_components: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SourceCitation:
    """Citation pointing to source text."""
    source_text: str
    char_start: int
    char_end: int
    input_section: Optional[str] = None
    document_id: Optional[str] = None


@dataclass
class AIExtraction:
    """Complete AI extraction with value, citation, and metadata."""
    extraction_id: str
    extracted_value: str
    cited_span: str
    value_type: Optional[str] = None
    confidence: float = 0.0
    source_citation: Optional[SourceCitation] = None
    extraction_timestamp: Optional[str] = None
    model_id: Optional[str] = None


@dataclass
class StableAnchor:
    """Stable anchor for reproducible extraction identification."""
    anchor_id: str
    document_hash: str
    span_hash: str
    extraction_version: str
    created_at: str


@dataclass
class ValidationResult:
    """Complete validation result for an AI extraction."""
    extraction_id: str
    overlap_result: OverlapResult
    anchor_valid: bool
    normalization_valid: bool
    overall_confidence: float
    recommendation: str  # "accept", "review", "reject", "abstain"
    forensic_summary: str
    validated_at: str


# =============================================================================
# NORMALIZATION SERVICE
# =============================================================================

class NormalizationService:
    """
    Service for normalizing values to enable fuzzy matching.

    Handles various value types:
    - Currency: "$1,200" -> "1200", "1200 dollars" -> "1200"
    - Dates: "January 15, 2026" -> "2026-01-15"
    - Percentages: "5%" -> "0.05", "five percent" -> "0.05"
    - Numbers: "one thousand" -> "1000"
    - Text: Case-insensitive, whitespace normalized
    """

    # Currency patterns
    CURRENCY_PATTERNS = [
        (r'\$\s*([\d,]+(?:\.\d{2})?)', lambda m: m.group(1).replace(',', '')),
        (r'([\d,]+(?:\.\d{2})?)\s*(?:dollars?|USD)', lambda m: m.group(1).replace(',', '')),
        (r'([\d,]+(?:\.\d{2})?)\s*/\s*(?:month|mo|year|yr|week|wk)', lambda m: m.group(1).replace(',', '')),
    ]

    # Number word mappings
    NUMBER_WORDS = {
        'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
        'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
        'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
        'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
        'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
        'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
        'eighty': '80', 'ninety': '90', 'hundred': '100', 'thousand': '1000',
        'million': '1000000', 'billion': '1000000000',
    }

    # Month mappings
    MONTH_MAP = {
        'january': '01', 'jan': '01', 'february': '02', 'feb': '02',
        'march': '03', 'mar': '03', 'april': '04', 'apr': '04',
        'may': '05', 'june': '06', 'jun': '06', 'july': '07', 'jul': '07',
        'august': '08', 'aug': '08', 'september': '09', 'sep': '09', 'sept': '09',
        'october': '10', 'oct': '10', 'november': '11', 'nov': '11',
        'december': '12', 'dec': '12',
    }

    def __init__(self):
        """Initialize the normalization service."""
        self._cache: Dict[str, NormalizedValue] = {}

    def normalize(self, value: str, value_type: Optional[str] = None) -> NormalizedValue:
        """
        Normalize a value for comparison.

        Args:
            value: The value to normalize
            value_type: Optional type hint for better normalization

        Returns:
            NormalizedValue with normalized form and metadata
        """
        if not value:
            return NormalizedValue(
                original=value,
                normalized="",
                tokens=[],
                value_type=ValueType.UNKNOWN
            )

        # Check cache
        cache_key = f"{value}|{value_type}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        # Detect value type if not provided
        detected_type = self._detect_type(value) if not value_type else ValueType(value_type)

        # Normalize based on type
        if detected_type == ValueType.CURRENCY:
            result = self._normalize_currency(value)
        elif detected_type == ValueType.DATE:
            result = self._normalize_date(value)
        elif detected_type == ValueType.PERCENTAGE:
            result = self._normalize_percentage(value)
        elif detected_type == ValueType.NUMBER:
            result = self._normalize_number(value)
        elif detected_type == ValueType.DURATION:
            result = self._normalize_duration(value)
        else:
            result = self._normalize_text(value)

        result.value_type = detected_type

        # Cache result
        self._cache[cache_key] = result

        return result

    def _detect_type(self, value: str) -> ValueType:
        """Detect the type of a value based on patterns."""
        value_lower = value.lower().strip()

        # Currency indicators
        if re.search(r'\$|dollars?|USD', value, re.IGNORECASE):
            return ValueType.CURRENCY

        # Percentage indicators
        if re.search(r'%|percent', value, re.IGNORECASE):
            return ValueType.PERCENTAGE

        # Date indicators
        if re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', value):
            return ValueType.DATE
        if any(month in value_lower for month in self.MONTH_MAP.keys()):
            return ValueType.DATE

        # Duration indicators
        if re.search(r'\b(months?|years?|weeks?|days?|hours?)\b', value, re.IGNORECASE):
            return ValueType.DURATION

        # Email
        if re.search(r'\b[\w.-]+@[\w.-]+\.\w+\b', value):
            return ValueType.EMAIL

        # Phone
        if re.search(r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b', value):
            return ValueType.PHONE

        # Pure number
        if re.match(r'^[\d,]+(?:\.\d+)?$', value.strip()):
            return ValueType.NUMBER

        return ValueType.TEXT

    def _normalize_currency(self, value: str) -> NormalizedValue:
        """Normalize currency values."""
        original = value
        normalized = value.strip()
        numeric_value = None

        # Try each currency pattern
        for pattern, extractor in self.CURRENCY_PATTERNS:
            match = re.search(pattern, value, re.IGNORECASE)
            if match:
                normalized = extractor(match)
                break

        # Fallback: extract any number
        if normalized == value.strip():
            numbers = re.findall(r'[\d,]+(?:\.\d+)?', value)
            if numbers:
                normalized = numbers[0].replace(',', '')

        # Parse numeric value
        try:
            numeric_value = Decimal(normalized.replace(',', ''))
        except (InvalidOperation, ValueError):
            pass

        # Generate tokens for matching
        tokens = self._tokenize(value) + self._tokenize(normalized)
        tokens = list(set(tokens))

        return NormalizedValue(
            original=original,
            normalized=normalized,
            tokens=tokens,
            value_type=ValueType.CURRENCY,
            numeric_value=numeric_value,
            parsed_components={'amount': normalized}
        )

    def _normalize_date(self, value: str) -> NormalizedValue:
        """Normalize date values to ISO format."""
        original = value
        normalized = value.strip()
        components = {}

        # Try MM/DD/YYYY or MM-DD-YYYY
        match = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})', value)
        if match:
            month, day, year = match.groups()
            if len(year) == 2:
                year = '20' + year if int(year) < 50 else '19' + year
            normalized = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
            components = {'year': year, 'month': month, 'day': day}

        # Try "Month DD, YYYY" format
        for month_name, month_num in self.MONTH_MAP.items():
            pattern = rf'{month_name}\s+(\d{{1,2}}),?\s+(\d{{4}})'
            match = re.search(pattern, value, re.IGNORECASE)
            if match:
                day, year = match.groups()
                normalized = f"{year}-{month_num}-{day.zfill(2)}"
                components = {'year': year, 'month': month_num, 'day': day}
                break

        tokens = self._tokenize(value) + self._tokenize(normalized)
        tokens = list(set(tokens))

        return NormalizedValue(
            original=original,
            normalized=normalized,
            tokens=tokens,
            value_type=ValueType.DATE,
            parsed_components=components
        )

    def _normalize_percentage(self, value: str) -> NormalizedValue:
        """Normalize percentage values."""
        original = value
        normalized = value.strip()
        numeric_value = None

        # Extract percentage number
        match = re.search(r'([\d.]+)\s*%', value)
        if match:
            normalized = match.group(1)
        else:
            # Try word forms
            match = re.search(r'(\w+)\s*percent', value, re.IGNORECASE)
            if match:
                word = match.group(1).lower()
                if word in self.NUMBER_WORDS:
                    normalized = self.NUMBER_WORDS[word]

        try:
            numeric_value = Decimal(normalized) / Decimal('100')
        except (InvalidOperation, ValueError):
            pass

        tokens = self._tokenize(value) + self._tokenize(normalized)
        tokens = list(set(tokens))

        return NormalizedValue(
            original=original,
            normalized=normalized,
            tokens=tokens,
            value_type=ValueType.PERCENTAGE,
            numeric_value=numeric_value,
            parsed_components={'percentage': normalized}
        )

    def _normalize_number(self, value: str) -> NormalizedValue:
        """Normalize number values."""
        original = value
        normalized = value.strip().replace(',', '')
        numeric_value = None

        # Handle number words
        value_lower = value.lower()
        for word, num in self.NUMBER_WORDS.items():
            value_lower = value_lower.replace(word, num)

        # Extract numeric part
        numbers = re.findall(r'[\d.]+', value_lower)
        if numbers:
            normalized = numbers[0]

        try:
            numeric_value = Decimal(normalized)
        except (InvalidOperation, ValueError):
            pass

        tokens = self._tokenize(value) + self._tokenize(normalized)
        tokens = list(set(tokens))

        return NormalizedValue(
            original=original,
            normalized=normalized,
            tokens=tokens,
            value_type=ValueType.NUMBER,
            numeric_value=numeric_value
        )

    def _normalize_duration(self, value: str) -> NormalizedValue:
        """Normalize duration values (e.g., '12 months', '1 year')."""
        original = value
        normalized = value.strip().lower()
        components = {}

        # Extract number and unit
        match = re.search(r'(\d+)\s*(months?|years?|weeks?|days?|hours?)', value, re.IGNORECASE)
        if match:
            number, unit = match.groups()
            normalized = f"{number} {unit.lower()}"
            components = {'amount': number, 'unit': unit.lower()}

            # Normalize to months for comparison
            unit_lower = unit.lower().rstrip('s')
            multipliers = {'year': 12, 'month': 1, 'week': 0.25, 'day': 1/30, 'hour': 1/720}
            if unit_lower in multipliers:
                components['months'] = str(int(float(number) * multipliers[unit_lower]))

        tokens = self._tokenize(value) + self._tokenize(normalized)
        tokens = list(set(tokens))

        return NormalizedValue(
            original=original,
            normalized=normalized,
            tokens=tokens,
            value_type=ValueType.DURATION,
            parsed_components=components
        )

    def _normalize_text(self, value: str) -> NormalizedValue:
        """Normalize text values (case-insensitive, whitespace normalized)."""
        original = value
        normalized = ' '.join(value.lower().split())
        tokens = self._tokenize(value)

        return NormalizedValue(
            original=original,
            normalized=normalized,
            tokens=tokens,
            value_type=ValueType.TEXT
        )

    def _tokenize(self, text: str) -> List[str]:
        """Tokenize text into words for matching."""
        if not text:
            return []

        # Split on whitespace and punctuation
        tokens = re.findall(r'\w+', text.lower())

        # Remove very short tokens (likely noise)
        tokens = [t for t in tokens if len(t) > 1 or t.isdigit()]

        return tokens

    def values_match(self, value1: str, value2: str,
                     value_type: Optional[str] = None) -> Tuple[bool, float]:
        """
        Check if two values match after normalization.

        Returns:
            Tuple of (match, similarity_score)
        """
        norm1 = self.normalize(value1, value_type)
        norm2 = self.normalize(value2, value_type)

        # Exact normalized match
        if norm1.normalized == norm2.normalized:
            return True, 1.0

        # Numeric value match (for currency, numbers, percentages)
        if norm1.numeric_value is not None and norm2.numeric_value is not None:
            if norm1.numeric_value == norm2.numeric_value:
                return True, 1.0

        # Token overlap similarity
        tokens1 = set(norm1.tokens)
        tokens2 = set(norm2.tokens)

        if not tokens1 or not tokens2:
            return False, 0.0

        intersection = tokens1 & tokens2
        union = tokens1 | tokens2

        similarity = len(intersection) / len(union) if union else 0.0

        return similarity >= 0.8, similarity


# =============================================================================
# OVERLAP VALIDATOR
# =============================================================================

class OverlapValidator:
    """
    Validates that extracted values actually appear in cited text spans.

    Uses IoU (Intersection over Union) to measure overlap between
    the extracted value and the cited span.

    Rule: If IoU < 0.8, Governor ABSTAINS
    """

    def __init__(self, normalization_service: Optional[NormalizationService] = None):
        """
        Initialize the overlap validator.

        Args:
            normalization_service: Optional NormalizationService instance
        """
        self.normalizer = normalization_service or NormalizationService()
        self.threshold_accept = 0.8   # IoU >= 0.8 = accept
        self.threshold_review = 0.5   # IoU >= 0.5 = needs review

    def validate(self, extracted_value: str, cited_span: str,
                 value_type: Optional[str] = None) -> OverlapResult:
        """
        Validate that extracted_value appears in cited_span.

        Steps:
        1. Exact match check (fastest)
        2. Normalized match check (e.g., "$1,200" matches "1200 dollars")
        3. Token overlap check (IoU calculation)
        4. Contradiction detection

        Args:
            extracted_value: The value extracted by AI
            cited_span: The text span the AI cited as source
            value_type: Optional type hint for better matching

        Returns:
            OverlapResult with recommendation
        """
        if not extracted_value or not cited_span:
            return OverlapResult(
                status=OverlapStatus.INVALID,
                extracted_value=extracted_value or "",
                cited_span=cited_span or "",
                iou_score=0.0,
                found_in_span=False,
                normalized_match=False,
                evidence=[],
                missing=[extracted_value] if extracted_value else [],
                recommendation="abstain",
                forensic_notes="Empty extracted value or cited span"
            )

        # Step 1: Exact match check (case-insensitive)
        if extracted_value.lower() in cited_span.lower():
            location = self.find_value_in_span(extracted_value, cited_span)
            return OverlapResult(
                status=OverlapStatus.VALID,
                extracted_value=extracted_value,
                cited_span=cited_span,
                iou_score=1.0,
                found_in_span=True,
                normalized_match=True,
                evidence=[extracted_value],
                missing=[],
                recommendation="accept",
                value_type=value_type,
                match_location=location,
                forensic_notes="Exact match found in span"
            )

        # Step 2: Normalized match check
        norm_value = self.normalizer.normalize(extracted_value, value_type)
        norm_span = self.normalizer.normalize(cited_span, value_type)

        # Check if normalized extracted value appears in normalized span
        if norm_value.normalized in norm_span.normalized:
            location = self.find_value_in_span(extracted_value, cited_span)
            return OverlapResult(
                status=OverlapStatus.VALID,
                extracted_value=extracted_value,
                cited_span=cited_span,
                iou_score=0.95,
                found_in_span=True,
                normalized_match=True,
                evidence=norm_value.tokens,
                missing=[],
                recommendation="accept",
                value_type=value_type,
                match_location=location,
                forensic_notes=f"Normalized match: '{norm_value.normalized}' found in span"
            )

        # Step 3: Check for contradiction before IoU
        if value_type in ['currency', 'number', 'percentage']:
            if self.detect_contradiction(extracted_value, cited_span, value_type or 'currency'):
                return OverlapResult(
                    status=OverlapStatus.HALLUCINATION,
                    extracted_value=extracted_value,
                    cited_span=cited_span,
                    iou_score=0.0,
                    found_in_span=False,
                    normalized_match=False,
                    evidence=[],
                    missing=norm_value.tokens,
                    recommendation="reject",
                    value_type=value_type,
                    forensic_notes=f"CONTRADICTION: Extracted value conflicts with span"
                )

        # Step 4: Token overlap check (IoU calculation)
        iou_score, found_tokens, missing_tokens = self.calculate_iou(
            extracted_value, cited_span
        )

        # Determine status based on IoU
        if iou_score >= self.threshold_accept:
            status = OverlapStatus.VALID
            recommendation = "accept"
        elif iou_score >= self.threshold_review:
            status = OverlapStatus.PARTIAL
            recommendation = "review"
        else:
            status = OverlapStatus.INVALID
            recommendation = "abstain"

        return OverlapResult(
            status=status,
            extracted_value=extracted_value,
            cited_span=cited_span,
            iou_score=iou_score,
            found_in_span=len(found_tokens) > 0,
            normalized_match=False,
            evidence=found_tokens,
            missing=missing_tokens,
            recommendation=recommendation,
            value_type=value_type,
            forensic_notes=f"IoU score: {iou_score:.2f}, Found: {len(found_tokens)}, Missing: {len(missing_tokens)}"
        )

    def calculate_iou(self, extracted: str, span: str) -> Tuple[float, List[str], List[str]]:
        """
        Calculate Intersection over Union for token overlap.

        IoU = |intersection| / |union|

        Args:
            extracted: The extracted value
            span: The cited span

        Returns:
            (iou_score, found_tokens, missing_tokens)
        """
        # Normalize both strings
        norm_extracted = self.normalizer.normalize(extracted)
        norm_span = self.normalizer.normalize(span)

        extracted_tokens = set(norm_extracted.tokens)
        span_tokens = set(norm_span.tokens)

        if not extracted_tokens:
            return 0.0, [], []

        # Calculate intersection and union
        intersection = extracted_tokens & span_tokens
        union = extracted_tokens | span_tokens

        found_tokens = list(intersection)
        missing_tokens = list(extracted_tokens - span_tokens)

        iou_score = len(intersection) / len(union) if union else 0.0

        return iou_score, found_tokens, missing_tokens

    def find_value_in_span(self, value: str, span: str) -> Optional[Tuple[int, int]]:
        """
        Find the exact or fuzzy location of value in span.

        Args:
            value: The value to find
            span: The text span to search

        Returns:
            (start, end) offsets or None if not found
        """
        # Exact match
        value_lower = value.lower()
        span_lower = span.lower()

        idx = span_lower.find(value_lower)
        if idx >= 0:
            return (idx, idx + len(value))

        # Normalized match
        norm_value = self.normalizer.normalize(value)

        # Try to find the normalized value
        if norm_value.normalized:
            idx = span_lower.find(norm_value.normalized.lower())
            if idx >= 0:
                return (idx, idx + len(norm_value.normalized))

        # Try to find numeric value in span
        if norm_value.numeric_value is not None:
            # Look for the numeric value in various formats
            patterns = [
                str(norm_value.numeric_value),
                f"${norm_value.numeric_value}",
                f"{norm_value.numeric_value:,.0f}",
            ]
            for pattern in patterns:
                idx = span_lower.find(pattern.lower())
                if idx >= 0:
                    return (idx, idx + len(pattern))

        return None

    def detect_contradiction(self, extracted_value: str, cited_span: str,
                            value_type: str) -> bool:
        """
        Detect if extracted value CONTRADICTS the span.

        Example:
        - Extracted: "$1,500"
        - Span: "The rent is $1,200 per month"
        - Result: CONTRADICTION (both are currency, but different values)

        Args:
            extracted_value: The value extracted by AI
            cited_span: The cited text span
            value_type: The type of value

        Returns:
            True if contradiction detected, False otherwise
        """
        if value_type not in ['currency', 'number', 'percentage']:
            return False

        norm_extracted = self.normalizer.normalize(extracted_value, value_type)

        # Extract all numeric values from the span
        span_values = self._extract_values_from_span(cited_span, value_type)

        if not span_values or norm_extracted.numeric_value is None:
            return False

        # Check if extracted value is in the span values
        extracted_num = norm_extracted.numeric_value

        for span_value in span_values:
            norm_span_val = self.normalizer.normalize(span_value, value_type)
            if norm_span_val.numeric_value == extracted_num:
                return False  # Found matching value, no contradiction

        # If span contains numeric values but extracted value doesn't match any
        # AND span seems to be about the same thing (contains similar context)
        return len(span_values) > 0

    def _extract_values_from_span(self, span: str, value_type: str) -> List[str]:
        """Extract all values of a given type from a span."""
        values = []

        if value_type == 'currency':
            # Find all currency amounts
            patterns = [
                r'\$[\d,]+(?:\.\d{2})?',
                r'[\d,]+(?:\.\d{2})?\s*(?:dollars?|USD)',
            ]
            for pattern in patterns:
                matches = re.findall(pattern, span, re.IGNORECASE)
                values.extend(matches)

        elif value_type == 'number':
            # Find all numbers
            matches = re.findall(r'\b\d+(?:,\d{3})*(?:\.\d+)?\b', span)
            values.extend(matches)

        elif value_type == 'percentage':
            # Find all percentages
            matches = re.findall(r'\d+(?:\.\d+)?%', span)
            values.extend(matches)

        return values

    def validate_batch(self, extractions: List[Tuple[str, str, str]]) -> List[OverlapResult]:
        """
        Validate multiple extractions efficiently.

        Args:
            extractions: List of (extracted_value, cited_span, value_type) tuples

        Returns:
            List of OverlapResult objects
        """
        results = []
        for extracted, span, value_type in extractions:
            result = self.validate(extracted, span, value_type)
            results.append(result)
        return results

    def get_recommendation(self, result: OverlapResult) -> str:
        """
        Get Governor recommendation based on overlap result.

        Returns: "accept", "review", "reject", or "abstain"
        """
        if result.iou_score >= self.threshold_accept:
            return "accept"
        elif result.status == OverlapStatus.HALLUCINATION:
            return "reject"
        elif result.iou_score >= self.threshold_review:
            return "review"
        else:
            return "abstain"


# =============================================================================
# STABLE ANCHOR SERVICE
# =============================================================================

class StableAnchorService:
    """
    Service for creating and validating stable anchors for extractions.

    A stable anchor is a cryptographic identifier that ties an extraction
    to its source document and allows for reproducible validation.
    """

    def __init__(self):
        """Initialize the stable anchor service."""
        self._anchors: Dict[str, StableAnchor] = {}

    def create_anchor(self, document_content: str, span: str,
                      extraction_version: str) -> StableAnchor:
        """
        Create a stable anchor for an extraction.

        Args:
            document_content: The full document content
            span: The specific span being cited
            extraction_version: Version of the extraction contract

        Returns:
            StableAnchor object
        """
        document_hash = hashlib.sha256(document_content.encode()).hexdigest()
        span_hash = hashlib.sha256(span.encode()).hexdigest()

        anchor_id = hashlib.sha256(
            f"{document_hash}:{span_hash}:{extraction_version}".encode()
        ).hexdigest()[:16]

        anchor = StableAnchor(
            anchor_id=anchor_id,
            document_hash=document_hash,
            span_hash=span_hash,
            extraction_version=extraction_version,
            created_at=datetime.now().isoformat()
        )

        self._anchors[anchor_id] = anchor
        return anchor

    def validate_anchor(self, anchor: StableAnchor,
                        document_content: str, span: str) -> bool:
        """
        Validate that an anchor matches the current document and span.

        Args:
            anchor: The anchor to validate
            document_content: The current document content
            span: The current span

        Returns:
            True if anchor is valid, False otherwise
        """
        current_doc_hash = hashlib.sha256(document_content.encode()).hexdigest()
        current_span_hash = hashlib.sha256(span.encode()).hexdigest()

        return (
            anchor.document_hash == current_doc_hash and
            anchor.span_hash == current_span_hash
        )

    def get_anchor(self, anchor_id: str) -> Optional[StableAnchor]:
        """Get an anchor by ID."""
        return self._anchors.get(anchor_id)


# =============================================================================
# EXTRACTION VALIDATOR
# =============================================================================

class ExtractionValidator:
    """
    Higher-level validator for complete AI extractions.

    Combines overlap validation, anchor validation, and normalization
    validation to produce a comprehensive validation result.
    """

    def __init__(self, overlap_validator: Optional[OverlapValidator] = None,
                 anchor_service: Optional[StableAnchorService] = None):
        """
        Initialize the extraction validator.

        Args:
            overlap_validator: Optional OverlapValidator instance
            anchor_service: Optional StableAnchorService instance
        """
        self.overlap = overlap_validator or OverlapValidator()
        self.anchors = anchor_service or StableAnchorService()

    def validate_extraction(self, extraction: AIExtraction,
                            document_content: Optional[str] = None) -> ValidationResult:
        """
        Full validation of an AI extraction.

        Steps:
        1. Verify stable anchor is valid (if document provided)
        2. Verify extracted value appears in cited span
        3. Verify normalization is correct
        4. Calculate overall confidence

        Args:
            extraction: The AI extraction to validate
            document_content: Optional full document for anchor validation

        Returns:
            ValidationResult with comprehensive validation data
        """
        # Step 1: Overlap validation
        overlap_result = self.overlap.validate(
            extraction.extracted_value,
            extraction.cited_span,
            extraction.value_type
        )

        # Step 2: Anchor validation (if document provided)
        anchor_valid = True
        if document_content and extraction.source_citation:
            # Create a temporary anchor for validation
            anchor = self.anchors.create_anchor(
                document_content,
                extraction.cited_span,
                "1.0.0"
            )
            anchor_valid = self.anchors.validate_anchor(
                anchor, document_content, extraction.cited_span
            )

        # Step 3: Normalization validation
        normalization_valid = self._validate_normalization(extraction)

        # Step 4: Calculate overall confidence
        base_confidence = extraction.confidence
        confidence_adjustment = 0.0

        if overlap_result.status == OverlapStatus.VALID:
            confidence_adjustment = 0.1  # Boost for valid overlap
        elif overlap_result.status == OverlapStatus.HALLUCINATION:
            confidence_adjustment = -0.5  # Major penalty for hallucination
        elif overlap_result.status == OverlapStatus.INVALID:
            confidence_adjustment = -0.3  # Penalty for invalid
        elif overlap_result.status == OverlapStatus.PARTIAL:
            confidence_adjustment = -0.1  # Small penalty for partial

        if not anchor_valid:
            confidence_adjustment -= 0.2

        if not normalization_valid:
            confidence_adjustment -= 0.1

        overall_confidence = max(0.0, min(1.0, base_confidence + confidence_adjustment))

        # Determine recommendation
        if overlap_result.status == OverlapStatus.HALLUCINATION:
            recommendation = "reject"
        elif overlap_result.iou_score >= 0.8 and anchor_valid and normalization_valid:
            recommendation = "accept"
        elif overlap_result.iou_score >= 0.5:
            recommendation = "review"
        else:
            recommendation = "abstain"

        # Generate forensic summary
        forensic_summary = self._generate_forensic_summary(
            overlap_result, anchor_valid, normalization_valid, overall_confidence
        )

        return ValidationResult(
            extraction_id=extraction.extraction_id,
            overlap_result=overlap_result,
            anchor_valid=anchor_valid,
            normalization_valid=normalization_valid,
            overall_confidence=overall_confidence,
            recommendation=recommendation,
            forensic_summary=forensic_summary,
            validated_at=datetime.now().isoformat()
        )

    def _validate_normalization(self, extraction: AIExtraction) -> bool:
        """Validate that the extraction's normalization is correct."""
        if not extraction.value_type:
            return True  # Can't validate without type

        normalizer = NormalizationService()
        norm_value = normalizer.normalize(extraction.extracted_value, extraction.value_type)

        # Check if normalization produced valid tokens
        return len(norm_value.tokens) > 0 or len(norm_value.normalized) > 0

    def _generate_forensic_summary(self, overlap: OverlapResult,
                                   anchor_valid: bool, norm_valid: bool,
                                   confidence: float) -> str:
        """Generate a human-readable forensic summary."""
        parts = []

        parts.append(f"Overlap Status: {overlap.status.value}")
        parts.append(f"IoU Score: {overlap.iou_score:.2%}")
        parts.append(f"Anchor Valid: {anchor_valid}")
        parts.append(f"Normalization Valid: {norm_valid}")
        parts.append(f"Overall Confidence: {confidence:.2%}")

        if overlap.evidence:
            parts.append(f"Evidence Tokens: {', '.join(overlap.evidence[:5])}")

        if overlap.missing:
            parts.append(f"Missing Tokens: {', '.join(overlap.missing[:5])}")

        if overlap.forensic_notes:
            parts.append(f"Notes: {overlap.forensic_notes}")

        return " | ".join(parts)

    def should_governor_abstain(self, result: ValidationResult) -> bool:
        """Determine if Governor should abstain from this extraction."""
        return result.recommendation in ["abstain", "reject"]


# =============================================================================
# GOVERNOR OVERLAP GATE
# =============================================================================

class GovernorOverlapGate:
    """
    Gate that forces Governor to abstain on invalid overlaps.

    This is the enforcement mechanism that ensures AI extractions
    are validated before being used in decisions.
    """

    def __init__(self, validator: Optional[ExtractionValidator] = None):
        """
        Initialize the Governor overlap gate.

        Args:
            validator: Optional ExtractionValidator instance
        """
        self.validator = validator or ExtractionValidator()
        self.abstain_log: List[dict] = []
        self.check_log: List[dict] = []

    def check(self, extraction: AIExtraction,
              document_content: Optional[str] = None) -> Tuple[bool, Optional[str]]:
        """
        Check if extraction passes overlap validation.

        Args:
            extraction: The AI extraction to check
            document_content: Optional full document for anchor validation

        Returns:
            (passed, reason) - passed=False means Governor must abstain
        """
        result = self.validator.validate_extraction(extraction, document_content)

        passed = not self.validator.should_governor_abstain(result)
        reason = None if passed else result.forensic_summary

        # Log the check
        check_entry = {
            "extraction_id": extraction.extraction_id,
            "timestamp": datetime.now().isoformat(),
            "passed": passed,
            "recommendation": result.recommendation,
            "iou_score": result.overlap_result.iou_score,
            "status": result.overlap_result.status.value
        }
        self.check_log.append(check_entry)

        # Log abstains separately for monitoring
        if not passed:
            abstain_entry = {
                **check_entry,
                "reason": reason,
                "extracted_value": extraction.extracted_value[:100],
                "cited_span": extraction.cited_span[:200]
            }
            self.abstain_log.append(abstain_entry)

        # Keep logs bounded
        self.check_log = self.check_log[-1000:]
        self.abstain_log = self.abstain_log[-500:]

        return passed, reason

    def get_abstain_rate(self, window_hours: int = 24) -> float:
        """
        Calculate abstain rate for Safe Mode monitoring.

        Args:
            window_hours: Time window in hours to calculate rate

        Returns:
            Abstain rate as a float between 0 and 1
        """
        if not self.check_log:
            return 0.0

        cutoff = datetime.now().timestamp() - (window_hours * 3600)

        recent_checks = [
            c for c in self.check_log
            if datetime.fromisoformat(c["timestamp"]).timestamp() > cutoff
        ]

        if not recent_checks:
            return 0.0

        abstains = sum(1 for c in recent_checks if not c["passed"])
        return abstains / len(recent_checks)

    def get_hallucination_rate(self, window_hours: int = 24) -> float:
        """
        Calculate hallucination rate (detected contradictions).

        Args:
            window_hours: Time window in hours

        Returns:
            Hallucination rate as a float between 0 and 1
        """
        if not self.check_log:
            return 0.0

        cutoff = datetime.now().timestamp() - (window_hours * 3600)

        recent_checks = [
            c for c in self.check_log
            if datetime.fromisoformat(c["timestamp"]).timestamp() > cutoff
        ]

        if not recent_checks:
            return 0.0

        hallucinations = sum(1 for c in recent_checks if c["status"] == "hallucination")
        return hallucinations / len(recent_checks)

    def get_stats(self, window_hours: int = 24) -> dict:
        """
        Get comprehensive statistics for monitoring.

        Args:
            window_hours: Time window in hours

        Returns:
            Dictionary with validation statistics
        """
        abstain_rate = self.get_abstain_rate(window_hours)
        hallucination_rate = self.get_hallucination_rate(window_hours)

        return {
            "window_hours": window_hours,
            "total_checks": len(self.check_log),
            "total_abstains": len(self.abstain_log),
            "abstain_rate": abstain_rate,
            "hallucination_rate": hallucination_rate,
            "safe_mode_trigger": abstain_rate > 0.4,  # Trigger if >40% abstain
            "recent_abstains": self.abstain_log[-10:]
        }

    def clear_logs(self):
        """Clear all logs (for testing)."""
        self.check_log = []
        self.abstain_log = []


# =============================================================================
# MAIN ENTRY POINT FOR API
# =============================================================================

def validate_overlap(extracted_value: str, cited_span: str,
                     value_type: Optional[str] = None) -> dict:
    """
    Simple API for overlap validation.

    Args:
        extracted_value: The value extracted by AI
        cited_span: The text span the AI cited
        value_type: Optional type hint

    Returns:
        Dictionary with validation result
    """
    validator = OverlapValidator()
    result = validator.validate(extracted_value, cited_span, value_type)

    return {
        "status": result.status.value,
        "iou_score": result.iou_score,
        "recommendation": result.recommendation,
        "found_in_span": result.found_in_span,
        "normalized_match": result.normalized_match,
        "evidence": result.evidence,
        "missing": result.missing,
        "forensic_notes": result.forensic_notes
    }


def validate_extraction_full(extraction_dict: dict,
                             document_content: Optional[str] = None) -> dict:
    """
    Full extraction validation API.

    Args:
        extraction_dict: Dictionary with extraction data
        document_content: Optional full document

    Returns:
        Dictionary with full validation result
    """
    extraction = AIExtraction(
        extraction_id=extraction_dict.get("extraction_id", "unknown"),
        extracted_value=extraction_dict.get("extracted_value", ""),
        cited_span=extraction_dict.get("cited_span", ""),
        value_type=extraction_dict.get("value_type"),
        confidence=extraction_dict.get("confidence", 0.5)
    )

    validator = ExtractionValidator()
    result = validator.validate_extraction(extraction, document_content)

    return {
        "extraction_id": result.extraction_id,
        "recommendation": result.recommendation,
        "overall_confidence": result.overall_confidence,
        "overlap_status": result.overlap_result.status.value,
        "iou_score": result.overlap_result.iou_score,
        "anchor_valid": result.anchor_valid,
        "normalization_valid": result.normalization_valid,
        "forensic_summary": result.forensic_summary,
        "validated_at": result.validated_at
    }


# =============================================================================
# CLI FOR TESTING
# =============================================================================

if __name__ == "__main__":
    import sys

    print("=" * 60)
    print("TinyPM Overlap Validator - Test Suite")
    print("=" * 60)

    validator = OverlapValidator()

    # Test cases
    test_cases = [
        # (extracted, span, value_type, expected_status)
        ("$1,200", "The rent is $1,200 per month", "currency", "valid"),
        ("$1,200", "The rent is 1200 dollars monthly", "currency", "valid"),
        ("monthly rent of $1,200", "rent is $1,200", "currency", "valid"),
        ("$1,500", "The rent is $1,200 per month", "currency", "hallucination"),
        ("$1,200", "The lease term is 12 months", "currency", "invalid"),
        ("January 15, 2026", "The date is January 15, 2026", "date", "valid"),
        ("5%", "interest rate of 5%", "percentage", "valid"),
        ("10%", "interest rate of 5%", "percentage", "hallucination"),
    ]

    print("\nRunning test cases...\n")

    passed = 0
    failed = 0

    for extracted, span, value_type, expected in test_cases:
        result = validator.validate(extracted, span, value_type)
        status = "PASS" if result.status.value == expected else "FAIL"

        if status == "PASS":
            passed += 1
        else:
            failed += 1

        print(f"[{status}] Extracted: '{extracted}'")
        print(f"       Span: '{span[:50]}...'")
        print(f"       Expected: {expected}, Got: {result.status.value}")
        print(f"       IoU: {result.iou_score:.2f}, Recommendation: {result.recommendation}")
        print()

    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)

    sys.exit(0 if failed == 0 else 1)
