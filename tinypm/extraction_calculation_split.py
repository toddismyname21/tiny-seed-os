#!/usr/bin/env python3
"""
================================================================================
EXTRACTION/CALCULATION SPLIT - Phase 3 of Project "Sovereign Seed"
================================================================================

Core Principle: AI should NEVER do math.
- AI extracts parameters with source citations
- Pure code calculates results with 100% reproducibility

Why This Architecture:
Without the split:
- AI might calculate "12 * $100 = $1,100" (hallucination)
- Results are non-reproducible (different runs = different answers)
- No audit trail of calculation logic
- Can't verify AI's math

With the split:
- AI ONLY extracts structured parameters with source citations
- Pure Python functions do ALL calculations
- Results are 100% reproducible and auditable
- Calculation logic is version-controlled

Pipeline Flow:
1. EXTRACT - AI extracts parameters from documents (with citations)
2. VALIDATE - OverlapValidator verifies citations match source
3. CALCULATE - Pure functions compute results deterministically

Created: 2026-02-04
Author: PM_Architect Claude
================================================================================
"""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, date, timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, Union
from uuid import uuid4
import asyncio
import logging

# ================================================================================
# LOGGING
# ================================================================================

APP_DIR = Path(__file__).parent
ETC_LOG_FILE = APP_DIR / ".etc_pipeline.log"

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


def log(msg: str, level: str = "INFO"):
    """Log with timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [ETC-Pipeline] [{level}] {msg}"
    print(line)
    try:
        with open(ETC_LOG_FILE, "a") as f:
            f.write(line + "\n")
    except:
        pass


# ================================================================================
# ENUMS
# ================================================================================

class ExtractionMethod(str, Enum):
    """How a value was extracted."""
    REGEX = "regex"
    NLP = "nlp"
    LLM = "llm"
    MANUAL = "manual"
    DERIVED = "derived"


class ValueType(str, Enum):
    """Supported value types for extraction."""
    CURRENCY = "currency"
    DATE = "date"
    NUMBER = "number"
    DURATION = "duration"
    BOOLEAN = "boolean"
    PERCENTAGE = "percentage"
    TEXT = "text"


class CalculationStatus(str, Enum):
    """Status of a calculation."""
    SUCCESS = "success"
    MISSING_PARAMS = "missing_params"
    INVALID_INPUT = "invalid_input"
    CALCULATION_ERROR = "calculation_error"
    CONTRACT_NOT_FOUND = "contract_not_found"


class ValidationStatus(str, Enum):
    """Result of validation."""
    VALID = "valid"
    PARTIAL = "partial"
    INVALID = "invalid"
    HALLUCINATION = "hallucination"


# ================================================================================
# DATA CLASSES - SOURCE CITATIONS
# ================================================================================

@dataclass
class SourceCitation:
    """
    Proves where an extracted value came from.

    Every AI extraction MUST have a citation linking back to the source
    document with character-precise offsets.
    """
    anchor_id: str                  # Stable anchor reference
    document_id: str                # Source document
    text_span: str                  # The actual cited text
    start_offset: int               # Character start position
    end_offset: int                 # Character end position
    extraction_method: str          # 'regex', 'nlp', 'llm', 'manual'
    span_hash: str = ""             # SHA-256 of text_span

    def __post_init__(self):
        if not self.span_hash and self.text_span:
            self.span_hash = hashlib.sha256(self.text_span.encode('utf-8')).hexdigest()

    def to_dict(self) -> Dict:
        return {
            "anchor_id": self.anchor_id,
            "document_id": self.document_id,
            "text_span": self.text_span,
            "start_offset": self.start_offset,
            "end_offset": self.end_offset,
            "extraction_method": self.extraction_method,
            "span_hash": self.span_hash
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'SourceCitation':
        return cls(
            anchor_id=data.get("anchor_id", ""),
            document_id=data.get("document_id", ""),
            text_span=data.get("text_span", ""),
            start_offset=data.get("start_offset", 0),
            end_offset=data.get("end_offset", 0),
            extraction_method=data.get("extraction_method", "llm"),
            span_hash=data.get("span_hash", "")
        )


# ================================================================================
# DATA CLASSES - EXTRACTED PARAMETERS
# ================================================================================

@dataclass
class ExtractedParameter:
    """
    A parameter extracted by AI with full provenance.

    Every extracted value tracks:
    - Raw text as it appeared
    - Normalized value (via NormalizationService)
    - Confidence score
    - Source citations proving where it came from
    """
    name: str                                   # Parameter name
    raw_value: str                              # Original text
    normalized_value: Any                       # Normalized by NormalizationService
    value_type: str                             # 'currency', 'date', 'number', etc.
    confidence: float                           # 0.0-1.0
    citations: List[SourceCitation]             # Proof of source
    extracted_at: datetime = field(default_factory=datetime.now)
    extractor_version: str = "1.0.0"
    validation_status: str = ""                 # Set after validation
    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict:
        normalized = self.normalized_value
        if isinstance(normalized, Decimal):
            normalized = str(normalized)
        elif isinstance(normalized, datetime):
            normalized = normalized.isoformat()
        elif isinstance(normalized, date):
            normalized = normalized.isoformat()

        return {
            "name": self.name,
            "raw_value": self.raw_value,
            "normalized_value": normalized,
            "value_type": self.value_type,
            "confidence": self.confidence,
            "citations": [c.to_dict() for c in self.citations],
            "extracted_at": self.extracted_at.isoformat(),
            "extractor_version": self.extractor_version,
            "validation_status": self.validation_status,
            "warnings": self.warnings
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'ExtractedParameter':
        citations = [SourceCitation.from_dict(c) for c in data.get("citations", [])]
        extracted_at = data.get("extracted_at")
        if isinstance(extracted_at, str):
            extracted_at = datetime.fromisoformat(extracted_at)
        else:
            extracted_at = datetime.now()

        return cls(
            name=data["name"],
            raw_value=data["raw_value"],
            normalized_value=data["normalized_value"],
            value_type=data["value_type"],
            confidence=data.get("confidence", 0.0),
            citations=citations,
            extracted_at=extracted_at,
            extractor_version=data.get("extractor_version", "1.0.0"),
            validation_status=data.get("validation_status", ""),
            warnings=data.get("warnings", [])
        )


@dataclass
class ExtractionResult:
    """
    Complete result of AI extraction from a document.

    Contains all extracted parameters with their citations,
    plus metadata for audit trail.
    """
    id: str
    parameters: Dict[str, ExtractedParameter]
    input_hash: str                             # SHA-256 of inputs for replay
    model_id: str                               # Which AI model extracted
    extraction_time_ms: int                     # Performance tracking
    warnings: List[str] = field(default_factory=list)
    extracted_at: datetime = field(default_factory=datetime.now)
    document_ids: List[str] = field(default_factory=list)
    schema_version: str = "1.0.0"

    def get_param(self, name: str) -> Optional[Any]:
        """Get normalized value of a parameter."""
        if name in self.parameters:
            return self.parameters[name].normalized_value
        return None

    def get_param_object(self, name: str) -> Optional[ExtractedParameter]:
        """Get full parameter object including citations."""
        return self.parameters.get(name)

    def has_all_params(self, required: List[str]) -> bool:
        """Check if all required parameters were extracted."""
        return all(p in self.parameters for p in required)

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "parameters": {k: v.to_dict() for k, v in self.parameters.items()},
            "input_hash": self.input_hash,
            "model_id": self.model_id,
            "extraction_time_ms": self.extraction_time_ms,
            "warnings": self.warnings,
            "extracted_at": self.extracted_at.isoformat(),
            "document_ids": self.document_ids,
            "schema_version": self.schema_version
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'ExtractionResult':
        parameters = {
            k: ExtractedParameter.from_dict(v)
            for k, v in data.get("parameters", {}).items()
        }
        extracted_at = data.get("extracted_at")
        if isinstance(extracted_at, str):
            extracted_at = datetime.fromisoformat(extracted_at)
        else:
            extracted_at = datetime.now()

        return cls(
            id=data["id"],
            parameters=parameters,
            input_hash=data.get("input_hash", ""),
            model_id=data.get("model_id", ""),
            extraction_time_ms=data.get("extraction_time_ms", 0),
            warnings=data.get("warnings", []),
            extracted_at=extracted_at,
            document_ids=data.get("document_ids", []),
            schema_version=data.get("schema_version", "1.0.0")
        )


# ================================================================================
# DATA CLASSES - CALCULATION CONTRACTS
# ================================================================================

@dataclass
class CalculationContract:
    """
    Defines inputs and outputs for a calculation.

    A contract is a versioned specification that ensures:
    - Required parameters are provided
    - Output type is consistent
    - Formula is documented
    """
    contract_id: str
    version: str
    required_params: List[str]
    optional_params: List[str]
    output_type: str                            # 'currency', 'number', 'percentage', etc.
    calculator_function: str                    # Name of pure function
    description: str
    formula_template: str = ""                  # Human-readable formula
    created_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict:
        return {
            "contract_id": self.contract_id,
            "version": self.version,
            "required_params": self.required_params,
            "optional_params": self.optional_params,
            "output_type": self.output_type,
            "calculator_function": self.calculator_function,
            "description": self.description,
            "formula_template": self.formula_template,
            "created_at": self.created_at.isoformat()
        }


@dataclass
class CalculationResult:
    """
    Result of a deterministic calculation.

    Includes full audit trail with:
    - Input hash (for reproducibility)
    - Output hash (for verification)
    - Formula used (for transparency)
    """
    contract_id: str
    contract_version: str
    input_hash: str                             # SHA-256 of all inputs
    output: Any                                 # The calculated value
    output_hash: str                            # SHA-256 of output for verification
    calculated_at: datetime
    calculator_version: str
    formula_used: str                           # Human-readable formula
    status: str = "success"
    error_message: str = ""
    inputs_snapshot: Dict[str, Any] = field(default_factory=dict)

    def verify(self) -> bool:
        """Verify the output hash matches the calculated output."""
        computed = hashlib.sha256(str(self.output).encode()).hexdigest()
        return computed == self.output_hash

    def to_dict(self) -> Dict:
        output = self.output
        if isinstance(output, Decimal):
            output = str(output)
        elif isinstance(output, datetime):
            output = output.isoformat()
        elif isinstance(output, date):
            output = output.isoformat()

        return {
            "contract_id": self.contract_id,
            "contract_version": self.contract_version,
            "input_hash": self.input_hash,
            "output": output,
            "output_hash": self.output_hash,
            "calculated_at": self.calculated_at.isoformat(),
            "calculator_version": self.calculator_version,
            "formula_used": self.formula_used,
            "status": self.status,
            "error_message": self.error_message,
            "inputs_snapshot": self.inputs_snapshot
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'CalculationResult':
        calculated_at = data.get("calculated_at")
        if isinstance(calculated_at, str):
            calculated_at = datetime.fromisoformat(calculated_at)
        else:
            calculated_at = datetime.now()

        return cls(
            contract_id=data["contract_id"],
            contract_version=data["contract_version"],
            input_hash=data["input_hash"],
            output=data["output"],
            output_hash=data["output_hash"],
            calculated_at=calculated_at,
            calculator_version=data["calculator_version"],
            formula_used=data["formula_used"],
            status=data.get("status", "success"),
            error_message=data.get("error_message", ""),
            inputs_snapshot=data.get("inputs_snapshot", {})
        )


# ================================================================================
# EXTRACTION LAYER
# ================================================================================

class ExtractionLayer:
    """
    Layer for AI-based parameter extraction.

    This layer coordinates:
    - Document retrieval via StableAnchorService
    - Value normalization via NormalizationService
    - Citation validation via OverlapValidator
    """

    def __init__(
        self,
        anchor_service: Optional[Any] = None,
        normalizer: Optional[Any] = None,
        validator: Optional[Any] = None
    ):
        self.anchors = anchor_service
        self.normalizer = normalizer
        self.validator = validator
        self.extractor_version = "1.0.0"
        self._extraction_log: List[Dict] = []

    async def extract(
        self,
        document_id: str,
        schema: Dict[str, str],
        context: Optional[dict] = None
    ) -> ExtractionResult:
        """
        Extract parameters from a document.

        Args:
            document_id: Document to extract from
            schema: Dict of param_name -> expected_type
            context: Additional context for extraction

        Returns:
            ExtractionResult with all parameters and citations
        """
        start_time = time.time()
        extraction_id = str(uuid4())[:12]
        parameters: Dict[str, ExtractedParameter] = {}
        warnings: List[str] = []

        # Get document content
        doc_text = None
        if self.anchors:
            try:
                from stable_anchors import get_document_store
                store = get_document_store()
                doc_text = store.get_document_text(document_id)
            except:
                warnings.append(f"Could not retrieve document {document_id}")

        if doc_text is None:
            doc_text = context.get("document_text", "") if context else ""

        # Compute input hash for reproducibility
        input_data = f"{document_id}|{json.dumps(schema, sort_keys=True)}|{doc_text[:1000]}"
        input_hash = hashlib.sha256(input_data.encode()).hexdigest()

        # Extract each parameter based on schema
        for param_name, param_type in schema.items():
            try:
                extracted = self._extract_single_param(
                    param_name, param_type, doc_text, document_id, context
                )
                if extracted:
                    parameters[param_name] = extracted
                else:
                    warnings.append(f"Could not extract parameter: {param_name}")
            except Exception as e:
                warnings.append(f"Error extracting {param_name}: {str(e)}")

        extraction_time = int((time.time() - start_time) * 1000)

        result = ExtractionResult(
            id=extraction_id,
            parameters=parameters,
            input_hash=input_hash,
            model_id="extraction_layer_v1",
            extraction_time_ms=extraction_time,
            warnings=warnings,
            document_ids=[document_id]
        )

        # Log extraction
        self._extraction_log.append({
            "extraction_id": extraction_id,
            "document_id": document_id,
            "schema": schema,
            "params_extracted": len(parameters),
            "warnings": warnings,
            "time_ms": extraction_time,
            "timestamp": datetime.now().isoformat()
        })

        log(f"Extracted {len(parameters)} params from {document_id} in {extraction_time}ms")
        return result

    def _extract_single_param(
        self,
        param_name: str,
        param_type: str,
        doc_text: str,
        document_id: str,
        context: Optional[dict]
    ) -> Optional[ExtractedParameter]:
        """
        Extract a single parameter from document text.

        Uses regex patterns for deterministic extraction where possible,
        falls back to context hints for complex extractions.
        """
        import re

        raw_value = ""
        normalized_value = None
        citations = []
        extraction_method = ExtractionMethod.REGEX.value

        # Check if value is provided in context
        if context and param_name in context:
            raw_value = str(context[param_name])
            extraction_method = ExtractionMethod.MANUAL.value

        # Currency extraction
        elif param_type == ValueType.CURRENCY.value:
            patterns = [
                (r'\$[\d,]+(?:\.\d{2})?', 'currency_dollar'),
                (r'[\d,]+(?:\.\d{2})?\s*(?:dollars?|USD)', 'currency_written'),
            ]
            for pattern, _ in patterns:
                match = re.search(pattern, doc_text, re.IGNORECASE)
                if match:
                    raw_value = match.group()
                    citation = self._create_citation(
                        doc_text, match.start(), match.end(), document_id
                    )
                    citations.append(citation)
                    break

        # Number extraction
        elif param_type == ValueType.NUMBER.value:
            pattern = r'\b\d+(?:,\d{3})*(?:\.\d+)?\b'
            match = re.search(pattern, doc_text)
            if match:
                raw_value = match.group()
                citation = self._create_citation(
                    doc_text, match.start(), match.end(), document_id
                )
                citations.append(citation)

        # Date extraction
        elif param_type == ValueType.DATE.value:
            patterns = [
                r'\d{4}-\d{1,2}-\d{1,2}',
                r'\d{1,2}/\d{1,2}/\d{2,4}',
                r'(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}',
            ]
            for pattern in patterns:
                match = re.search(pattern, doc_text, re.IGNORECASE)
                if match:
                    raw_value = match.group()
                    citation = self._create_citation(
                        doc_text, match.start(), match.end(), document_id
                    )
                    citations.append(citation)
                    break

        # Duration extraction
        elif param_type == ValueType.DURATION.value:
            pattern = r'\d+\s*(?:months?|years?|weeks?|days?|hours?)'
            match = re.search(pattern, doc_text, re.IGNORECASE)
            if match:
                raw_value = match.group()
                citation = self._create_citation(
                    doc_text, match.start(), match.end(), document_id
                )
                citations.append(citation)

        # Boolean extraction
        elif param_type == ValueType.BOOLEAN.value:
            if context and param_name in context:
                raw_value = str(context[param_name])
            else:
                # Look for boolean indicators
                bool_patterns = {
                    True: ['yes', 'confirmed', 'approved', 'paid', 'complete'],
                    False: ['no', 'denied', 'rejected', 'unpaid', 'incomplete']
                }
                for val, patterns in bool_patterns.items():
                    for p in patterns:
                        if re.search(rf'\b{p}\b', doc_text, re.IGNORECASE):
                            raw_value = str(val)
                            break
                    if raw_value:
                        break

        # Text extraction (use context or first sentence)
        elif param_type == ValueType.TEXT.value:
            if context and param_name in context:
                raw_value = str(context[param_name])
            else:
                # Take first significant text block
                match = re.search(r'[A-Z][^.!?]*[.!?]', doc_text)
                if match:
                    raw_value = match.group()
                    citation = self._create_citation(
                        doc_text, match.start(), match.end(), document_id
                    )
                    citations.append(citation)

        if not raw_value:
            return None

        # Normalize the value
        if self.normalizer:
            try:
                normalized = self.normalizer.normalize(raw_value, hint=param_type)
                if normalized:
                    normalized_value = normalized.normalized
            except:
                normalized_value = raw_value
        else:
            normalized_value = raw_value

        return ExtractedParameter(
            name=param_name,
            raw_value=raw_value,
            normalized_value=normalized_value,
            value_type=param_type,
            confidence=0.85 if citations else 0.60,
            citations=citations,
            extractor_version=self.extractor_version
        )

    def _create_citation(
        self,
        doc_text: str,
        start: int,
        end: int,
        document_id: str
    ) -> SourceCitation:
        """Create a source citation for an extraction."""
        text_span = doc_text[start:end]
        anchor_id = hashlib.sha256(
            f"{document_id}:{start}:{end}:{text_span}".encode()
        ).hexdigest()[:12]

        return SourceCitation(
            anchor_id=anchor_id,
            document_id=document_id,
            text_span=text_span,
            start_offset=start,
            end_offset=end,
            extraction_method=ExtractionMethod.REGEX.value
        )

    def validate_extraction(self, result: ExtractionResult) -> List[str]:
        """
        Validate all extractions using OverlapValidator.

        Returns list of warnings/errors.
        """
        warnings = []

        if not self.validator:
            return ["No validator configured"]

        for name, param in result.parameters.items():
            for citation in param.citations:
                try:
                    overlap_result = self.validator.validate(
                        param.raw_value,
                        citation.text_span,
                        param.value_type
                    )
                    if overlap_result.status.value == "hallucination":
                        warnings.append(
                            f"HALLUCINATION DETECTED: {name} value '{param.raw_value}' "
                            f"contradicts citation '{citation.text_span[:50]}...'"
                        )
                        param.validation_status = ValidationStatus.HALLUCINATION.value
                    elif overlap_result.iou_score < 0.8:
                        warnings.append(
                            f"Low overlap for {name}: IoU={overlap_result.iou_score:.2f}"
                        )
                        param.validation_status = ValidationStatus.PARTIAL.value
                    else:
                        param.validation_status = ValidationStatus.VALID.value
                except Exception as e:
                    warnings.append(f"Validation error for {name}: {str(e)}")

        return warnings


# ================================================================================
# CALCULATION LAYER
# ================================================================================

class CalculationLayer:
    """
    Layer for deterministic calculations.

    All calculations are:
    - Pure functions (no side effects)
    - Fully reproducible (same inputs = same outputs)
    - Hash-verified (output can be verified against hash)
    - Auditable (full formula trail)
    """

    def __init__(self):
        self.contracts: Dict[str, CalculationContract] = {}
        self.calculators: Dict[str, Callable] = {}
        self.calculator_version = "1.0.0"
        self._calculation_log: List[Dict] = []
        self._register_default_calculators()

    def register_calculator(
        self,
        contract: CalculationContract,
        func: Callable
    ) -> None:
        """Register a calculation contract and its function."""
        self.contracts[contract.contract_id] = contract
        self.calculators[contract.contract_id] = func
        log(f"Registered calculator: {contract.contract_id} v{contract.version}")

    def calculate(
        self,
        contract_id: str,
        extraction: ExtractionResult
    ) -> CalculationResult:
        """
        Run a calculation using extracted parameters.

        Args:
            contract_id: Which calculation to run
            extraction: The extraction result with parameters

        Returns:
            CalculationResult with output and full audit trail
        """
        start_time = time.time()

        # Get contract
        contract = self.contracts.get(contract_id)
        if not contract:
            return CalculationResult(
                contract_id=contract_id,
                contract_version="unknown",
                input_hash="",
                output=None,
                output_hash="",
                calculated_at=datetime.now(),
                calculator_version=self.calculator_version,
                formula_used="",
                status=CalculationStatus.CONTRACT_NOT_FOUND.value,
                error_message=f"Unknown contract: {contract_id}"
            )

        # Validate required params
        missing_params = []
        for param in contract.required_params:
            if param not in extraction.parameters:
                missing_params.append(param)

        if missing_params:
            return CalculationResult(
                contract_id=contract_id,
                contract_version=contract.version,
                input_hash="",
                output=None,
                output_hash="",
                calculated_at=datetime.now(),
                calculator_version=self.calculator_version,
                formula_used="",
                status=CalculationStatus.MISSING_PARAMS.value,
                error_message=f"Missing required parameters: {', '.join(missing_params)}"
            )

        # Build input dict with normalized values
        inputs: Dict[str, Any] = {}
        for name, param in extraction.parameters.items():
            value = param.normalized_value
            # Convert string numbers to appropriate types
            if param.value_type == ValueType.CURRENCY.value:
                try:
                    value = Decimal(str(value).replace(',', '').replace('$', ''))
                except:
                    pass
            elif param.value_type == ValueType.NUMBER.value:
                try:
                    value = int(value) if '.' not in str(value) else float(value)
                except:
                    pass
            inputs[name] = value

        # Calculate input hash for reproducibility
        input_str = json.dumps(inputs, sort_keys=True, default=str)
        input_hash = hashlib.sha256(input_str.encode()).hexdigest()

        # Run calculator
        try:
            calculator = self.calculators[contract_id]
            # Filter to only include params the calculator expects
            calc_params = {
                k: v for k, v in inputs.items()
                if k in contract.required_params or k in contract.optional_params
            }
            output = calculator(**calc_params)
        except Exception as e:
            return CalculationResult(
                contract_id=contract_id,
                contract_version=contract.version,
                input_hash=input_hash,
                output=None,
                output_hash="",
                calculated_at=datetime.now(),
                calculator_version=self.calculator_version,
                formula_used="",
                status=CalculationStatus.CALCULATION_ERROR.value,
                error_message=str(e),
                inputs_snapshot=inputs
            )

        # Calculate output hash
        output_str = str(output)
        output_hash = hashlib.sha256(output_str.encode()).hexdigest()

        # Generate formula description
        formula_used = self._get_formula_description(contract_id, inputs)

        calc_time_ms = int((time.time() - start_time) * 1000)

        result = CalculationResult(
            contract_id=contract_id,
            contract_version=contract.version,
            input_hash=input_hash,
            output=output,
            output_hash=output_hash,
            calculated_at=datetime.now(),
            calculator_version=self.calculator_version,
            formula_used=formula_used,
            status=CalculationStatus.SUCCESS.value,
            inputs_snapshot=inputs
        )

        # Log calculation
        self._calculation_log.append({
            "contract_id": contract_id,
            "input_hash": input_hash,
            "output_hash": output_hash,
            "time_ms": calc_time_ms,
            "status": "success",
            "timestamp": datetime.now().isoformat()
        })

        log(f"Calculated {contract_id}: {output} (hash: {output_hash[:8]})")
        return result

    def calculate_direct(
        self,
        contract_id: str,
        inputs: Dict[str, Any]
    ) -> CalculationResult:
        """
        Run a calculation with direct inputs (no extraction).

        Useful for testing and simple cases.
        """
        # Create a mock extraction result
        parameters = {}
        for name, value in inputs.items():
            # Infer type
            value_type = ValueType.NUMBER.value
            if isinstance(value, Decimal) or (isinstance(value, str) and '$' in str(value)):
                value_type = ValueType.CURRENCY.value
            elif isinstance(value, bool):
                value_type = ValueType.BOOLEAN.value
            elif isinstance(value, datetime):
                value_type = ValueType.DATE.value

            parameters[name] = ExtractedParameter(
                name=name,
                raw_value=str(value),
                normalized_value=value,
                value_type=value_type,
                confidence=1.0,
                citations=[]
            )

        extraction = ExtractionResult(
            id="direct_" + str(uuid4())[:8],
            parameters=parameters,
            input_hash="",
            model_id="direct_input",
            extraction_time_ms=0
        )

        return self.calculate(contract_id, extraction)

    def _get_formula_description(
        self,
        contract_id: str,
        inputs: Dict[str, Any]
    ) -> str:
        """Generate human-readable formula description."""
        contract = self.contracts.get(contract_id)
        if not contract or not contract.formula_template:
            return f"{contract_id}({', '.join(f'{k}={v}' for k, v in inputs.items())})"

        formula = contract.formula_template
        for key, value in inputs.items():
            formula = formula.replace(f"{{{key}}}", str(value))
        return formula

    def _register_default_calculators(self):
        """Register built-in calculators for common use cases."""

        # ========================================
        # RENT CALCULATION
        # ========================================
        self.register_calculator(
            CalculationContract(
                contract_id="rent_total",
                version="1.0.0",
                required_params=["monthly_rent", "months"],
                optional_params=["deposit"],
                output_type=ValueType.CURRENCY.value,
                calculator_function="calc_rent_total",
                description="Calculate total rent for lease period",
                formula_template="({monthly_rent} * {months}) + {deposit}"
            ),
            self._calc_rent_total
        )

        # ========================================
        # TASK PRIORITY SCORING
        # ========================================
        self.register_calculator(
            CalculationContract(
                contract_id="task_priority",
                version="1.0.0",
                required_params=["urgency", "importance", "effort"],
                optional_params=["deadline_days", "dependencies"],
                output_type=ValueType.NUMBER.value,
                calculator_function="calc_task_priority",
                description="Calculate task priority score (Eisenhower matrix + effort)",
                formula_template="(urgency * 0.4) + (importance * 0.4) + ((10 - effort) * 0.2)"
            ),
            self._calc_task_priority
        )

        # ========================================
        # LATE PENALTY CALCULATION
        # ========================================
        self.register_calculator(
            CalculationContract(
                contract_id="late_penalty",
                version="1.0.0",
                required_params=["daily_rate", "days_late"],
                optional_params=["max_penalty"],
                output_type=ValueType.CURRENCY.value,
                calculator_function="calc_late_penalty",
                description="Calculate late payment penalty",
                formula_template="min({daily_rate} * {days_late}, {max_penalty})"
            ),
            self._calc_late_penalty
        )

        # ========================================
        # HARVEST YIELD CALCULATION
        # ========================================
        self.register_calculator(
            CalculationContract(
                contract_id="harvest_yield",
                version="1.0.0",
                required_params=["area_acres", "yield_per_acre"],
                optional_params=["loss_percentage"],
                output_type=ValueType.NUMBER.value,
                calculator_function="calc_harvest_yield",
                description="Calculate expected harvest yield",
                formula_template="{area_acres} * {yield_per_acre} * (1 - {loss_percentage}/100)"
            ),
            self._calc_harvest_yield
        )

        # ========================================
        # LABOR COST CALCULATION
        # ========================================
        self.register_calculator(
            CalculationContract(
                contract_id="labor_cost",
                version="1.0.0",
                required_params=["hours", "hourly_rate", "workers"],
                optional_params=["overtime_hours", "overtime_multiplier"],
                output_type=ValueType.CURRENCY.value,
                calculator_function="calc_labor_cost",
                description="Calculate total labor cost",
                formula_template="({hours} * {hourly_rate} * {workers}) + ({overtime_hours} * {hourly_rate} * {overtime_multiplier})"
            ),
            self._calc_labor_cost
        )

        # ========================================
        # ROI CALCULATION
        # ========================================
        self.register_calculator(
            CalculationContract(
                contract_id="roi_calculation",
                version="1.0.0",
                required_params=["revenue", "cost"],
                optional_params=[],
                output_type=ValueType.PERCENTAGE.value,
                calculator_function="calc_roi",
                description="Calculate return on investment",
                formula_template="({revenue} - {cost}) / {cost} * 100"
            ),
            self._calc_roi
        )

        # ========================================
        # COMPOUND INTEREST
        # ========================================
        self.register_calculator(
            CalculationContract(
                contract_id="compound_interest",
                version="1.0.0",
                required_params=["principal", "rate", "periods"],
                optional_params=["compounds_per_period"],
                output_type=ValueType.CURRENCY.value,
                calculator_function="calc_compound_interest",
                description="Calculate compound interest",
                formula_template="{principal} * (1 + {rate}/{compounds_per_period})^({periods} * {compounds_per_period})"
            ),
            self._calc_compound_interest
        )

        # ========================================
        # BREAK-EVEN ANALYSIS
        # ========================================
        self.register_calculator(
            CalculationContract(
                contract_id="break_even",
                version="1.0.0",
                required_params=["fixed_costs", "price_per_unit", "variable_cost_per_unit"],
                optional_params=[],
                output_type=ValueType.NUMBER.value,
                calculator_function="calc_break_even",
                description="Calculate break-even quantity",
                formula_template="{fixed_costs} / ({price_per_unit} - {variable_cost_per_unit})"
            ),
            self._calc_break_even
        )

    # ========================================
    # PURE CALCULATION FUNCTIONS
    # All functions below are pure - no side effects, fully deterministic
    # ========================================

    @staticmethod
    def _calc_rent_total(
        monthly_rent: Union[Decimal, float, int],
        months: int,
        deposit: Union[Decimal, float, int] = Decimal("0")
    ) -> Decimal:
        """Pure function: rent calculation."""
        rent = Decimal(str(monthly_rent))
        dep = Decimal(str(deposit))
        return (rent * int(months)) + dep

    @staticmethod
    def _calc_task_priority(
        urgency: int,
        importance: int,
        effort: int,
        deadline_days: Optional[int] = None,
        dependencies: int = 0
    ) -> float:
        """
        Pure function: Eisenhower matrix + effort weighting.

        Score range: 0-10 (can exceed 10 with multipliers)
        """
        # Base score from Eisenhower factors
        base_score = (
            (float(urgency) * 0.4) +
            (float(importance) * 0.4) +
            ((10 - float(effort)) * 0.2)
        )

        # Deadline urgency boost
        if deadline_days is not None and deadline_days <= 3:
            base_score *= 1.5

        # Blocking multiplier (dependencies waiting on this task)
        if dependencies > 0:
            base_score *= (1 + (float(dependencies) * 0.1))

        return min(10.0, round(base_score, 2))

    @staticmethod
    def _calc_late_penalty(
        daily_rate: Union[Decimal, float, int],
        days_late: int,
        max_penalty: Union[Decimal, float, int] = None
    ) -> Decimal:
        """Pure function: late penalty calculation."""
        rate = Decimal(str(daily_rate))
        penalty = rate * int(days_late)

        if max_penalty is not None:
            max_p = Decimal(str(max_penalty))
            penalty = min(penalty, max_p)

        return penalty.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    @staticmethod
    def _calc_harvest_yield(
        area_acres: Union[float, int],
        yield_per_acre: Union[float, int],
        loss_percentage: Union[float, int] = 0
    ) -> float:
        """Pure function: harvest yield calculation."""
        gross_yield = float(area_acres) * float(yield_per_acre)
        loss_factor = 1 - (float(loss_percentage) / 100)
        return round(gross_yield * loss_factor, 2)

    @staticmethod
    def _calc_labor_cost(
        hours: Union[float, int],
        hourly_rate: Union[Decimal, float, int],
        workers: int,
        overtime_hours: Union[float, int] = 0,
        overtime_multiplier: float = 1.5
    ) -> Decimal:
        """Pure function: labor cost calculation."""
        rate = Decimal(str(hourly_rate))
        regular = rate * Decimal(str(hours)) * Decimal(str(workers))
        overtime = rate * Decimal(str(overtime_hours)) * Decimal(str(overtime_multiplier))
        return (regular + overtime).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    @staticmethod
    def _calc_roi(
        revenue: Union[Decimal, float, int],
        cost: Union[Decimal, float, int]
    ) -> float:
        """Pure function: ROI calculation."""
        rev = Decimal(str(revenue))
        cst = Decimal(str(cost))
        if cst == 0:
            return 0.0
        roi = ((rev - cst) / cst) * 100
        return round(float(roi), 2)

    @staticmethod
    def _calc_compound_interest(
        principal: Union[Decimal, float, int],
        rate: float,
        periods: int,
        compounds_per_period: int = 12
    ) -> Decimal:
        """Pure function: compound interest calculation."""
        p = Decimal(str(principal))
        r = Decimal(str(rate))
        n = Decimal(str(compounds_per_period))
        t = Decimal(str(periods))

        # A = P(1 + r/n)^(nt)
        base = 1 + (r / n)
        exponent = n * t
        # Use float for power, then convert back
        amount = p * Decimal(str(float(base) ** float(exponent)))
        return amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    @staticmethod
    def _calc_break_even(
        fixed_costs: Union[Decimal, float, int],
        price_per_unit: Union[Decimal, float, int],
        variable_cost_per_unit: Union[Decimal, float, int]
    ) -> int:
        """Pure function: break-even quantity calculation."""
        fc = Decimal(str(fixed_costs))
        price = Decimal(str(price_per_unit))
        vc = Decimal(str(variable_cost_per_unit))

        contribution_margin = price - vc
        if contribution_margin <= 0:
            return -1  # No break-even possible

        break_even = fc / contribution_margin
        return int(break_even.quantize(Decimal('1'), rounding=ROUND_HALF_UP))

    def get_available_contracts(self) -> List[Dict]:
        """Get list of all registered calculation contracts."""
        return [c.to_dict() for c in self.contracts.values()]

    def get_calculation_history(self, limit: int = 50) -> List[Dict]:
        """Get recent calculation history."""
        return self._calculation_log[-limit:]


# ================================================================================
# ETC PIPELINE - Extract-Transform-Calculate
# ================================================================================

class ETCPipeline:
    """
    Extract-Transform-Calculate Pipeline.

    The full forensic pipeline that:
    1. Extracts parameters from documents (AI)
    2. Validates extractions (OverlapValidator)
    3. Calculates results (Pure code)
    4. Returns with full audit trail
    """

    def __init__(
        self,
        extraction: ExtractionLayer,
        calculation: CalculationLayer
    ):
        self.extraction = extraction
        self.calculation = calculation
        self.pipeline_log: List[Dict] = []
        self.version = "1.0.0"

    async def run(
        self,
        document_id: str,
        extraction_schema: Dict[str, str],
        calculation_contract: str,
        context: Optional[dict] = None
    ) -> Dict:
        """
        Run the full ETC pipeline.

        1. Extract parameters from document (AI)
        2. Validate extractions (Overlap Validator)
        3. Calculate result (Pure code)
        4. Return with full audit trail
        """
        start_time = time.time()
        pipeline_id = str(uuid4())[:12]

        # Step 1: Extract
        extraction_result = await self.extraction.extract(
            document_id, extraction_schema, context
        )

        # Step 2: Validate
        validation_warnings = self.extraction.validate_extraction(extraction_result)

        # Step 3: Calculate
        calc_result = self.calculation.calculate(
            calculation_contract, extraction_result
        )

        # Build audit trail
        pipeline_time_ms = int((time.time() - start_time) * 1000)

        audit_entry = {
            'pipeline_id': pipeline_id,
            'document_id': document_id,
            'extraction_id': extraction_result.id,
            'extraction_hash': extraction_result.input_hash,
            'calculation_contract': calculation_contract,
            'calculation_hash': calc_result.input_hash,
            'output_hash': calc_result.output_hash,
            'validation_warnings': validation_warnings,
            'pipeline_time_ms': pipeline_time_ms,
            'timestamp': datetime.now().isoformat()
        }

        self.pipeline_log.append(audit_entry)

        log(
            f"ETC Pipeline complete: {calculation_contract} "
            f"({len(extraction_result.parameters)} params, {pipeline_time_ms}ms)"
        )

        return {
            'pipeline_id': pipeline_id,
            'extraction': extraction_result.to_dict(),
            'validation_warnings': validation_warnings,
            'calculation': calc_result.to_dict(),
            'audit_trail': audit_entry,
            'success': calc_result.status == CalculationStatus.SUCCESS.value
        }

    def run_sync(
        self,
        document_id: str,
        extraction_schema: Dict[str, str],
        calculation_contract: str,
        context: Optional[dict] = None
    ) -> Dict:
        """Synchronous version of run() for non-async contexts."""
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(
                self.run(document_id, extraction_schema, calculation_contract, context)
            )
        finally:
            loop.close()

    def get_audit_trail(self, limit: int = 50) -> List[Dict]:
        """Get recent pipeline audit trail."""
        return self.pipeline_log[-limit:]

    def verify_pipeline_result(self, result: Dict) -> Dict:
        """
        Verify a pipeline result is valid.

        Checks:
        - Extraction hash matches inputs
        - Calculation output hash matches output
        - No hallucinations detected
        """
        verification = {
            'pipeline_id': result.get('pipeline_id', 'unknown'),
            'verified': True,
            'checks': []
        }

        # Check calculation result has valid hash
        if 'calculation' in result:
            calc = result['calculation']
            calc_result = CalculationResult.from_dict(calc)
            hash_valid = calc_result.verify()
            verification['checks'].append({
                'check': 'output_hash_valid',
                'passed': hash_valid,
                'details': f"Hash: {calc.get('output_hash', 'none')[:16]}..."
            })
            if not hash_valid:
                verification['verified'] = False

        # Check for validation warnings
        warnings = result.get('validation_warnings', [])
        hallucinations = [w for w in warnings if 'HALLUCINATION' in w]
        verification['checks'].append({
            'check': 'no_hallucinations',
            'passed': len(hallucinations) == 0,
            'details': f"{len(hallucinations)} hallucinations detected"
        })
        if hallucinations:
            verification['verified'] = False
            verification['hallucinations'] = hallucinations

        # Check success status
        success = result.get('success', False)
        verification['checks'].append({
            'check': 'calculation_success',
            'passed': success,
            'details': result.get('calculation', {}).get('error_message', 'OK')
        })
        if not success:
            verification['verified'] = False

        return verification


# ================================================================================
# SINGLETON ACCESS
# ================================================================================

_extraction_layer: Optional[ExtractionLayer] = None
_calculation_layer: Optional[CalculationLayer] = None
_pipeline: Optional[ETCPipeline] = None


def get_extraction_layer() -> ExtractionLayer:
    """Get or create the singleton extraction layer."""
    global _extraction_layer
    if _extraction_layer is None:
        try:
            from stable_anchors import get_anchor_service
            from normalization_service import get_normalization_service
            from overlap_validator import OverlapValidator

            _extraction_layer = ExtractionLayer(
                anchor_service=get_anchor_service(),
                normalizer=get_normalization_service(),
                validator=OverlapValidator()
            )
        except ImportError:
            _extraction_layer = ExtractionLayer()
    return _extraction_layer


def get_calculation_layer() -> CalculationLayer:
    """Get or create the singleton calculation layer."""
    global _calculation_layer
    if _calculation_layer is None:
        _calculation_layer = CalculationLayer()
    return _calculation_layer


def get_etc_pipeline() -> ETCPipeline:
    """Get or create the singleton ETC pipeline."""
    global _pipeline
    if _pipeline is None:
        _pipeline = ETCPipeline(
            get_extraction_layer(),
            get_calculation_layer()
        )
    return _pipeline


# ================================================================================
# CONVENIENCE FUNCTIONS
# ================================================================================

def calculate_direct(contract_id: str, inputs: Dict[str, Any]) -> CalculationResult:
    """
    Quick calculation without extraction.

    Example:
        result = calculate_direct("rent_total", {
            "monthly_rent": 1200,
            "months": 12,
            "deposit": 2400
        })
        print(result.output)  # 16800
    """
    return get_calculation_layer().calculate_direct(contract_id, inputs)


async def run_pipeline(
    document_id: str,
    schema: Dict[str, str],
    contract: str,
    context: Optional[dict] = None
) -> Dict:
    """
    Run the full ETC pipeline.

    Example:
        result = await run_pipeline(
            "lease_123",
            {"monthly_rent": "currency", "months": "number"},
            "rent_total"
        )
    """
    return await get_etc_pipeline().run(document_id, schema, contract, context)


def run_pipeline_sync(
    document_id: str,
    schema: Dict[str, str],
    contract: str,
    context: Optional[dict] = None
) -> Dict:
    """Synchronous version of run_pipeline."""
    return get_etc_pipeline().run_sync(document_id, schema, contract, context)


# ================================================================================
# CLI FOR TESTING
# ================================================================================

def main():
    """CLI interface for ETC Pipeline."""
    import argparse

    parser = argparse.ArgumentParser(description="Extraction/Calculation Split Pipeline")
    parser.add_argument("--test", action="store_true", help="Run test suite")
    parser.add_argument("--contracts", action="store_true", help="List available contracts")
    parser.add_argument("--calculate", type=str, help="Run a calculation (contract_id)")
    parser.add_argument("--inputs", type=str, help="JSON inputs for calculation")
    args = parser.parse_args()

    if args.contracts:
        print("\n=== AVAILABLE CALCULATION CONTRACTS ===\n")
        calc_layer = get_calculation_layer()
        for contract in calc_layer.get_available_contracts():
            print(f"Contract: {contract['contract_id']} v{contract['version']}")
            print(f"  Description: {contract['description']}")
            print(f"  Required: {', '.join(contract['required_params'])}")
            print(f"  Optional: {', '.join(contract['optional_params']) or 'none'}")
            print(f"  Formula: {contract['formula_template']}")
            print()

    elif args.calculate and args.inputs:
        try:
            inputs = json.loads(args.inputs)
            result = calculate_direct(args.calculate, inputs)
            print(f"\n=== CALCULATION RESULT ===")
            print(f"Contract: {result.contract_id}")
            print(f"Output: {result.output}")
            print(f"Formula: {result.formula_used}")
            print(f"Hash: {result.output_hash[:16]}...")
            print(f"Verified: {result.verify()}")
        except Exception as e:
            print(f"Error: {e}")

    elif args.test:
        print("\n" + "=" * 70)
        print("EXTRACTION/CALCULATION SPLIT - Test Suite")
        print("=" * 70)

        calc_layer = get_calculation_layer()
        passed = 0
        failed = 0

        # Test cases
        test_cases = [
            # (contract_id, inputs, expected_output, description)
            ("rent_total", {"monthly_rent": 1200, "months": 12, "deposit": 2400}, Decimal("16800"), "Basic rent calculation"),
            ("rent_total", {"monthly_rent": "1500", "months": 6}, Decimal("9000"), "Rent without deposit"),
            ("task_priority", {"urgency": 8, "importance": 9, "effort": 3}, 8.2, "High priority task"),
            ("task_priority", {"urgency": 3, "importance": 3, "effort": 8, "deadline_days": 2}, 4.2, "Deadline boost"),
            ("late_penalty", {"daily_rate": 25, "days_late": 10}, Decimal("250.00"), "Late penalty"),
            ("late_penalty", {"daily_rate": 25, "days_late": 100, "max_penalty": 500}, Decimal("500.00"), "Capped penalty"),
            ("harvest_yield", {"area_acres": 10, "yield_per_acre": 500}, 5000.0, "Basic yield"),
            ("harvest_yield", {"area_acres": 10, "yield_per_acre": 500, "loss_percentage": 10}, 4500.0, "Yield with loss"),
            ("labor_cost", {"hours": 40, "hourly_rate": 15, "workers": 3}, Decimal("1800.00"), "Basic labor"),
            ("roi_calculation", {"revenue": 15000, "cost": 10000}, 50.0, "50% ROI"),
            ("break_even", {"fixed_costs": 10000, "price_per_unit": 25, "variable_cost_per_unit": 15}, 1000, "Break-even analysis"),
        ]

        print("\nRunning calculation tests...\n")
        print("-" * 70)

        for contract_id, inputs, expected, description in test_cases:
            result = calc_layer.calculate_direct(contract_id, inputs)

            actual = result.output
            # Handle Decimal comparison
            if isinstance(expected, Decimal) and isinstance(actual, Decimal):
                match = actual == expected
            elif isinstance(expected, float):
                match = abs(float(actual) - expected) < 0.01
            else:
                match = actual == expected

            status = "PASS" if match else "FAIL"

            if match:
                passed += 1
            else:
                failed += 1

            print(f"[{status}] {description}")
            print(f"       Contract: {contract_id}")
            print(f"       Expected: {expected}, Got: {actual}")
            if not match:
                print(f"       Formula: {result.formula_used}")
            print()

        # Test hash verification
        print("-" * 70)
        print("\nHash Verification Tests...\n")

        result = calc_layer.calculate_direct("rent_total", {"monthly_rent": 1000, "months": 12})
        verified = result.verify()
        print(f"[{'PASS' if verified else 'FAIL'}] Hash verification: {verified}")
        print(f"       Output: {result.output}")
        print(f"       Hash: {result.output_hash}")

        # Test determinism
        print("\nDeterminism Tests...\n")

        result1 = calc_layer.calculate_direct("rent_total", {"monthly_rent": 1200, "months": 12})
        result2 = calc_layer.calculate_direct("rent_total", {"monthly_rent": 1200, "months": 12})

        deterministic = (
            result1.output == result2.output and
            result1.output_hash == result2.output_hash
        )
        print(f"[{'PASS' if deterministic else 'FAIL'}] Same inputs = same outputs")
        print(f"       Run 1: {result1.output} (hash: {result1.output_hash[:16]}...)")
        print(f"       Run 2: {result2.output} (hash: {result2.output_hash[:16]}...)")

        if deterministic:
            passed += 1
        else:
            failed += 1

        print("\n" + "-" * 70)
        print(f"\nResults: {passed} passed, {failed} failed")
        print("=" * 70)

        return 0 if failed == 0 else 1

    else:
        parser.print_help()


if __name__ == "__main__":
    import sys
    sys.exit(main() or 0)
