#!/usr/bin/env python3
"""
===============================================================================
STRUCTURAL GATE - JSON Schema Enforcement Layer for TinyPM
===============================================================================

Phase 2 of Project "Sovereign Seed" - The Structural Gate ensures ALL inter-agent
communication follows versioned JSON schemas. Non-conforming output = IMMEDIATE
PROCESS TERMINATION.

The Problem:
- Agents can return malformed data
- Field names can drift over time
- Type mismatches cause silent failures
- No contract between components

The Solution:
- Every message validated against versioned schema
- Non-conforming = process killed
- Full audit trail of schema violations
- Version compatibility checking

Architecture:
    +-----------------------------------------------------------------+
    |                     STRUCTURAL GATE                              |
    |  "If it doesn't match the schema, it doesn't exist"             |
    +-----------------------------------------------------------------+
    |                                                                  |
    |   SCHEMA REGISTRY                                                |
    |   +-- scoring_contract v1.0.0                                   |
    |   +-- decision_record v1.0.0                                    |
    |   +-- extraction_result v1.0.0                                  |
    |   +-- negotiation_message v1.0.0                                |
    |   +-- task_action v1.0.0                                        |
    |                                                                  |
    |   VALIDATION MODES                                               |
    |   +-- PASS: Valid data, continue                                |
    |   +-- WARN: Log warning, continue                               |
    |   +-- KILL: Raise exception, terminate process                  |
    |                                                                  |
    |   ENFORCEMENT                                                    |
    |   +-- @validate_input(schema_id) decorator                      |
    |   +-- @validate_output(schema_id) decorator                     |
    |   +-- gate() method for inline validation                       |
    |                                                                  |
    +-----------------------------------------------------------------+

Usage:
    from structural_gate import (
        get_structural_gate,
        StructuralGateViolation,
        GateAction,
        validate_input,
        validate_output
    )

    # Manual validation
    gate = get_structural_gate()
    result = gate.validate(data, "scoring_contract", "1.0.0")
    if not result.is_valid:
        print(f"Validation failed: {result.errors}")

    # Gate with action
    passed, validated_data = gate.gate(data, "scoring_contract")

    # Decorator usage
    @validate_input("task_action")
    def process_task(data):
        return do_something(data)

    @validate_output("decision_record")
    def make_decision(context):
        return create_decision(context)

Created: 2026-02-04
Author: TinyPM Team / PM_Architect Claude
Part of: Project Sovereign Seed - Phase 2
===============================================================================
"""

from __future__ import annotations

import functools
import hashlib
import json
import os
import re
import threading
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, TypeVar, Union


# ===============================================================================
# CONFIGURATION
# ===============================================================================

APP_DIR = Path(__file__).parent
SCHEMA_REGISTRY_FILE = APP_DIR / "schemas" / "registry.json"
VALIDATION_LOG_FILE = APP_DIR / ".structural_gate_validation.log"
VIOLATION_ARCHIVE_FILE = APP_DIR / ".structural_gate_violations.json"

# Type variable for generic decorators
T = TypeVar('T')


# ===============================================================================
# LOGGING
# ===============================================================================

def log(msg: str, level: str = "INFO"):
    """Log with timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [StructuralGate] [{level}] {msg}"
    print(line)
    try:
        with open(VALIDATION_LOG_FILE, "a") as f:
            f.write(line + "\n")
    except Exception:
        pass


# ===============================================================================
# SCHEMA VERSION MANAGEMENT
# ===============================================================================

@dataclass
class SchemaVersion:
    """
    Semantic versioning for schemas (MAJOR.MINOR.PATCH).

    Version Semantics:
    - MAJOR: Breaking changes (incompatible with previous)
    - MINOR: Backwards compatible additions
    - PATCH: Backwards compatible fixes

    Compatibility Rules:
    - Same MAJOR = compatible (1.0.0 compatible with 1.9.9)
    - Different MAJOR = incompatible (2.0.0 NOT compatible with 1.x.x)
    """
    major: int
    minor: int
    patch: int

    def __init__(self, version_str: str):
        """Parse version string like '1.2.3' into components."""
        parts = version_str.split('.')
        self.major = int(parts[0])
        self.minor = int(parts[1]) if len(parts) > 1 else 0
        self.patch = int(parts[2]) if len(parts) > 2 else 0

    def __str__(self) -> str:
        return f"{self.major}.{self.minor}.{self.patch}"

    def __repr__(self) -> str:
        return f"SchemaVersion('{self}')"

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, SchemaVersion):
            return False
        return (self.major, self.minor, self.patch) == (other.major, other.minor, other.patch)

    def __lt__(self, other: 'SchemaVersion') -> bool:
        return (self.major, self.minor, self.patch) < (other.major, other.minor, other.patch)

    def __le__(self, other: 'SchemaVersion') -> bool:
        return self == other or self < other

    def __gt__(self, other: 'SchemaVersion') -> bool:
        return not self <= other

    def __ge__(self, other: 'SchemaVersion') -> bool:
        return not self < other

    def __hash__(self) -> int:
        return hash((self.major, self.minor, self.patch))

    def is_compatible_with(self, other: 'SchemaVersion') -> bool:
        """
        Check if this version is compatible with another.

        Compatibility is determined by MAJOR version only:
        - 1.0.0 is compatible with 1.9.9
        - 2.0.0 is NOT compatible with 1.x.x
        """
        return self.major == other.major

    def to_dict(self) -> Dict[str, int]:
        return {"major": self.major, "minor": self.minor, "patch": self.patch}


# ===============================================================================
# GATE ACTION ENUM
# ===============================================================================

class GateAction(Enum):
    """
    Actions to take when validation fails.

    PASS: Log success, continue (for valid data)
    WARN: Log warning, continue anyway (for non-critical validation)
    KILL: Raise StructuralGateViolation, terminate process
    """
    PASS = "pass"
    WARN = "warn"
    KILL = "kill"


# ===============================================================================
# VALIDATION RESULT
# ===============================================================================

@dataclass
class ValidationResult:
    """
    Result of schema validation.

    Contains:
    - Validation status (is_valid)
    - Schema metadata (id, version)
    - Error messages if invalid
    - Warning messages for non-fatal issues
    - Timestamp of validation
    - Whether the process was killed
    """
    is_valid: bool
    schema_id: str
    schema_version: str
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    validated_at: datetime = field(default_factory=datetime.now)
    process_killed: bool = False
    input_hash: str = ""  # SHA-256 of input for audit trail

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "is_valid": self.is_valid,
            "schema_id": self.schema_id,
            "schema_version": self.schema_version,
            "errors": self.errors,
            "warnings": self.warnings,
            "validated_at": self.validated_at.isoformat(),
            "process_killed": self.process_killed,
            "input_hash": self.input_hash
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ValidationResult':
        """Create from dictionary."""
        return cls(
            is_valid=data["is_valid"],
            schema_id=data["schema_id"],
            schema_version=data["schema_version"],
            errors=data.get("errors", []),
            warnings=data.get("warnings", []),
            validated_at=datetime.fromisoformat(data["validated_at"]),
            process_killed=data.get("process_killed", False),
            input_hash=data.get("input_hash", "")
        )


# ===============================================================================
# STRUCTURAL GATE VIOLATION EXCEPTION
# ===============================================================================

class StructuralGateViolation(Exception):
    """
    Exception raised when data fails schema validation and action is KILL.

    This is a CRITICAL exception that should never be caught silently.
    It indicates that a component is producing malformed data that could
    corrupt the system.

    Attributes:
        result: The ValidationResult containing error details
    """

    def __init__(self, result: ValidationResult):
        self.result = result
        error_summary = "; ".join(result.errors[:3])
        if len(result.errors) > 3:
            error_summary += f" (and {len(result.errors) - 3} more)"
        super().__init__(
            f"Schema violation [{result.schema_id}@{result.schema_version}]: {error_summary}"
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for logging/API responses."""
        return {
            "exception": "StructuralGateViolation",
            "message": str(self),
            "result": self.result.to_dict()
        }


# ===============================================================================
# MAIN STRUCTURAL GATE CLASS
# ===============================================================================

class StructuralGate:
    """
    Enforces JSON Schema validation on all inter-agent communication.

    The Structural Gate is the enforcement layer for Project Sovereign Seed.
    Every piece of data that flows between agents MUST be validated against
    a versioned schema. Non-conforming data is KILLED.

    Features:
    - Versioned schema registry
    - Semantic version compatibility checking
    - Configurable failure actions (PASS, WARN, KILL)
    - Full audit trail of all validations
    - Thread-safe operations
    - Lazy schema loading

    Usage:
        gate = StructuralGate()
        gate.load_registry("schemas/registry.json")

        # Validate data
        result = gate.validate(data, "scoring_contract", "1.0.0")

        # Gate with action
        passed, validated = gate.gate(data, "scoring_contract", on_failure=GateAction.KILL)
    """

    def __init__(self, schema_registry_path: Optional[str] = None):
        """
        Initialize StructuralGate.

        Args:
            schema_registry_path: Path to schema registry JSON file.
                                  If None, schemas must be registered manually.
        """
        # Schema storage: schema_id -> {version_str -> schema_dict}
        self.schemas: Dict[str, Dict[str, dict]] = {}

        # Validation log for audit trail
        self.validation_log: List[ValidationResult] = []
        self._log_lock = threading.Lock()

        # Statistics
        self.kill_count = 0
        self.pass_count = 0
        self.warn_count = 0

        # Load registry if provided
        if schema_registry_path:
            self.load_registry(schema_registry_path)

    # -------------------------------------------------------------------------
    # SCHEMA REGISTRATION
    # -------------------------------------------------------------------------

    def register_schema(self, schema_id: str, version: str, schema: dict) -> None:
        """
        Register a new schema version.

        Args:
            schema_id: Unique identifier for the schema (e.g., "scoring_contract")
            version: Semantic version string (e.g., "1.0.0")
            schema: JSON Schema dictionary

        Raises:
            ValueError: If schema is invalid or version format is wrong
        """
        # Validate version format
        try:
            SchemaVersion(version)
        except (ValueError, IndexError) as e:
            raise ValueError(f"Invalid version format '{version}': {e}")

        # Validate schema has required fields
        if not isinstance(schema, dict):
            raise ValueError("Schema must be a dictionary")

        # Initialize schema storage for this ID if needed
        if schema_id not in self.schemas:
            self.schemas[schema_id] = {}

        # Store the schema
        self.schemas[schema_id][version] = schema
        log(f"Registered schema: {schema_id}@{version}")

    def unregister_schema(self, schema_id: str, version: Optional[str] = None) -> bool:
        """
        Unregister a schema or specific version.

        Args:
            schema_id: Schema identifier
            version: If provided, remove only this version. If None, remove all versions.

        Returns:
            True if schema was removed, False if not found
        """
        if schema_id not in self.schemas:
            return False

        if version is None:
            del self.schemas[schema_id]
            log(f"Unregistered all versions of schema: {schema_id}")
            return True

        if version in self.schemas[schema_id]:
            del self.schemas[schema_id][version]
            log(f"Unregistered schema: {schema_id}@{version}")
            if not self.schemas[schema_id]:
                del self.schemas[schema_id]
            return True

        return False

    # -------------------------------------------------------------------------
    # SCHEMA RETRIEVAL
    # -------------------------------------------------------------------------

    def get_schema(self, schema_id: str, version: Optional[str] = None) -> Optional[dict]:
        """
        Get a schema by ID and version.

        Args:
            schema_id: Schema identifier
            version: Specific version. If None, returns latest version.

        Returns:
            Schema dictionary or None if not found
        """
        if schema_id not in self.schemas:
            return None

        if version is None:
            version = self.get_latest_version(schema_id)
            if version is None:
                return None

        return self.schemas[schema_id].get(version)

    def get_latest_version(self, schema_id: str) -> Optional[str]:
        """
        Get the latest version string for a schema.

        Args:
            schema_id: Schema identifier

        Returns:
            Latest version string or None if schema not found
        """
        if schema_id not in self.schemas:
            return None

        versions = list(self.schemas[schema_id].keys())
        if not versions:
            return None

        # Sort by semantic version
        sorted_versions = sorted(versions, key=lambda v: SchemaVersion(v), reverse=True)
        return sorted_versions[0]

    def list_schemas(self) -> Dict[str, List[str]]:
        """
        List all registered schemas and their versions.

        Returns:
            Dictionary mapping schema_id to list of versions
        """
        return {
            schema_id: sorted(versions.keys(), key=lambda v: SchemaVersion(v), reverse=True)
            for schema_id, versions in self.schemas.items()
        }

    # -------------------------------------------------------------------------
    # VALIDATION
    # -------------------------------------------------------------------------

    def validate(self, data: Any, schema_id: str, version: Optional[str] = None) -> ValidationResult:
        """
        Validate data against a schema.

        Args:
            data: The data to validate
            schema_id: Which schema to validate against
            version: Schema version (None = latest)

        Returns:
            ValidationResult with is_valid=False if validation fails
        """
        # Compute input hash for audit trail
        try:
            input_hash = hashlib.sha256(
                json.dumps(data, sort_keys=True, default=str).encode()
            ).hexdigest()
        except Exception:
            input_hash = ""

        # Get schema
        schema = self.get_schema(schema_id, version)
        actual_version = version or self.get_latest_version(schema_id) or "unknown"

        if schema is None:
            result = ValidationResult(
                is_valid=False,
                schema_id=schema_id,
                schema_version=actual_version,
                errors=[f"Schema not found: {schema_id}@{actual_version}"],
                input_hash=input_hash
            )
            self._record_validation(result)
            return result

        # Perform validation
        errors = []
        warnings = []

        try:
            errors = self._validate_against_schema(data, schema, "")
        except Exception as e:
            errors.append(f"Validation error: {str(e)}")

        # Check for deprecated fields (warnings)
        deprecated = schema.get("x-deprecated-fields", [])
        if isinstance(data, dict):
            for field_name in deprecated:
                if field_name in data:
                    warnings.append(f"Deprecated field used: {field_name}")

        is_valid = len(errors) == 0

        result = ValidationResult(
            is_valid=is_valid,
            schema_id=schema_id,
            schema_version=actual_version,
            errors=errors,
            warnings=warnings,
            input_hash=input_hash
        )

        self._record_validation(result)
        return result

    def _validate_against_schema(
        self, data: Any, schema: dict, path: str
    ) -> List[str]:
        """
        Recursively validate data against JSON Schema.

        This is a custom JSON Schema validator that handles the common cases
        without requiring the jsonschema library (keeping dependencies minimal).

        Args:
            data: Data to validate
            schema: JSON Schema dictionary
            path: Current path for error messages

        Returns:
            List of error messages (empty if valid)
        """
        errors = []

        # Handle $ref
        if "$ref" in schema:
            # For now, we don't support $ref resolution
            return errors

        # Handle type
        schema_type = schema.get("type")
        if schema_type:
            if not self._check_type(data, schema_type):
                errors.append(
                    f"{path or 'root'}: Expected type '{schema_type}', "
                    f"got '{type(data).__name__}'"
                )
                return errors  # Type mismatch, skip further checks

        # Handle object type
        if schema_type == "object" or (isinstance(data, dict) and not schema_type):
            errors.extend(self._validate_object(data, schema, path))

        # Handle array type
        elif schema_type == "array" or (isinstance(data, list) and not schema_type):
            errors.extend(self._validate_array(data, schema, path))

        # Handle string constraints
        elif schema_type == "string" and isinstance(data, str):
            errors.extend(self._validate_string(data, schema, path))

        # Handle number constraints
        elif schema_type in ("number", "integer") and isinstance(data, (int, float)):
            errors.extend(self._validate_number(data, schema, path))

        # Handle enum
        if "enum" in schema:
            if data not in schema["enum"]:
                errors.append(
                    f"{path or 'root'}: Value '{data}' not in enum {schema['enum']}"
                )

        # Handle const
        if "const" in schema:
            if data != schema["const"]:
                errors.append(
                    f"{path or 'root'}: Value must be {schema['const']}"
                )

        return errors

    def _check_type(self, data: Any, schema_type: Union[str, List[str]]) -> bool:
        """Check if data matches the schema type."""
        if isinstance(schema_type, list):
            return any(self._check_type(data, t) for t in schema_type)

        type_map = {
            "object": dict,
            "array": list,
            "string": str,
            "number": (int, float),
            "integer": int,
            "boolean": bool,
            "null": type(None)
        }

        expected_type = type_map.get(schema_type)
        if expected_type is None:
            return True  # Unknown type, assume valid

        # Special case: integer should also accept int in "number"
        if schema_type == "number" and isinstance(data, bool):
            return False  # bool is subclass of int, but shouldn't match number

        if schema_type == "integer" and isinstance(data, bool):
            return False

        return isinstance(data, expected_type)

    def _validate_object(self, data: Any, schema: dict, path: str) -> List[str]:
        """Validate object against schema."""
        errors = []

        if not isinstance(data, dict):
            return errors

        # Check required fields
        required = schema.get("required", [])
        for field_name in required:
            if field_name not in data:
                errors.append(f"{path}.{field_name}: Required field missing")

        # Validate properties
        properties = schema.get("properties", {})
        for prop_name, prop_schema in properties.items():
            if prop_name in data:
                prop_path = f"{path}.{prop_name}" if path else prop_name
                errors.extend(
                    self._validate_against_schema(data[prop_name], prop_schema, prop_path)
                )

        # Check additionalProperties
        additional_props = schema.get("additionalProperties")
        if additional_props is False:
            extra_keys = set(data.keys()) - set(properties.keys())
            for key in extra_keys:
                errors.append(f"{path}.{key}: Additional property not allowed")
        elif isinstance(additional_props, dict):
            extra_keys = set(data.keys()) - set(properties.keys())
            for key in extra_keys:
                prop_path = f"{path}.{key}" if path else key
                errors.extend(
                    self._validate_against_schema(data[key], additional_props, prop_path)
                )

        # Check minProperties / maxProperties
        if "minProperties" in schema and len(data) < schema["minProperties"]:
            errors.append(
                f"{path or 'root'}: Object has {len(data)} properties, "
                f"minimum is {schema['minProperties']}"
            )
        if "maxProperties" in schema and len(data) > schema["maxProperties"]:
            errors.append(
                f"{path or 'root'}: Object has {len(data)} properties, "
                f"maximum is {schema['maxProperties']}"
            )

        return errors

    def _validate_array(self, data: Any, schema: dict, path: str) -> List[str]:
        """Validate array against schema."""
        errors = []

        if not isinstance(data, list):
            return errors

        # Check items
        items_schema = schema.get("items")
        if items_schema:
            for i, item in enumerate(data):
                item_path = f"{path}[{i}]"
                errors.extend(
                    self._validate_against_schema(item, items_schema, item_path)
                )

        # Check minItems / maxItems
        if "minItems" in schema and len(data) < schema["minItems"]:
            errors.append(
                f"{path or 'root'}: Array has {len(data)} items, "
                f"minimum is {schema['minItems']}"
            )
        if "maxItems" in schema and len(data) > schema["maxItems"]:
            errors.append(
                f"{path or 'root'}: Array has {len(data)} items, "
                f"maximum is {schema['maxItems']}"
            )

        # Check uniqueItems
        if schema.get("uniqueItems", False):
            seen = set()
            for i, item in enumerate(data):
                try:
                    item_hash = json.dumps(item, sort_keys=True)
                    if item_hash in seen:
                        errors.append(f"{path}[{i}]: Duplicate item found")
                    seen.add(item_hash)
                except (TypeError, ValueError):
                    pass  # Can't hash, skip uniqueness check

        return errors

    def _validate_string(self, data: str, schema: dict, path: str) -> List[str]:
        """Validate string against schema."""
        errors = []

        # Check minLength / maxLength
        if "minLength" in schema and len(data) < schema["minLength"]:
            errors.append(
                f"{path or 'root'}: String length {len(data)} < minimum {schema['minLength']}"
            )
        if "maxLength" in schema and len(data) > schema["maxLength"]:
            errors.append(
                f"{path or 'root'}: String length {len(data)} > maximum {schema['maxLength']}"
            )

        # Check pattern
        pattern = schema.get("pattern")
        if pattern:
            try:
                if not re.match(pattern, data):
                    errors.append(
                        f"{path or 'root'}: String does not match pattern '{pattern}'"
                    )
            except re.error:
                errors.append(f"{path or 'root'}: Invalid regex pattern in schema")

        # Check format (basic formats)
        fmt = schema.get("format")
        if fmt:
            if fmt == "date-time":
                try:
                    datetime.fromisoformat(data.replace('Z', '+00:00'))
                except ValueError:
                    errors.append(f"{path or 'root'}: Invalid date-time format")
            elif fmt == "date":
                try:
                    datetime.strptime(data, "%Y-%m-%d")
                except ValueError:
                    errors.append(f"{path or 'root'}: Invalid date format (expected YYYY-MM-DD)")
            elif fmt == "email":
                if not re.match(r'^[^@]+@[^@]+\.[^@]+$', data):
                    errors.append(f"{path or 'root'}: Invalid email format")
            elif fmt == "uri":
                if not re.match(r'^https?://', data):
                    errors.append(f"{path or 'root'}: Invalid URI format")
            elif fmt == "uuid":
                uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                if not re.match(uuid_pattern, data.lower()):
                    errors.append(f"{path or 'root'}: Invalid UUID format")

        return errors

    def _validate_number(
        self, data: Union[int, float], schema: dict, path: str
    ) -> List[str]:
        """Validate number against schema."""
        errors = []

        # Check minimum / maximum
        if "minimum" in schema:
            if data < schema["minimum"]:
                errors.append(
                    f"{path or 'root'}: Value {data} < minimum {schema['minimum']}"
                )
        if "maximum" in schema:
            if data > schema["maximum"]:
                errors.append(
                    f"{path or 'root'}: Value {data} > maximum {schema['maximum']}"
                )

        # Check exclusiveMinimum / exclusiveMaximum
        if "exclusiveMinimum" in schema:
            if data <= schema["exclusiveMinimum"]:
                errors.append(
                    f"{path or 'root'}: Value {data} <= exclusiveMinimum {schema['exclusiveMinimum']}"
                )
        if "exclusiveMaximum" in schema:
            if data >= schema["exclusiveMaximum"]:
                errors.append(
                    f"{path or 'root'}: Value {data} >= exclusiveMaximum {schema['exclusiveMaximum']}"
                )

        # Check multipleOf
        if "multipleOf" in schema:
            divisor = schema["multipleOf"]
            if data % divisor != 0:
                errors.append(
                    f"{path or 'root'}: Value {data} is not a multiple of {divisor}"
                )

        return errors

    # -------------------------------------------------------------------------
    # GATE (VALIDATE + ACTION)
    # -------------------------------------------------------------------------

    def gate(
        self,
        data: Any,
        schema_id: str,
        version: Optional[str] = None,
        on_failure: GateAction = GateAction.KILL
    ) -> Tuple[bool, Any]:
        """
        Gate data through schema validation.

        This is the primary method for enforcing schema compliance. It validates
        the data and takes action based on the result.

        Args:
            data: The data to validate
            schema_id: Which schema to validate against
            version: Schema version (None = latest)
            on_failure: What to do if validation fails

        Returns:
            (passed, data) - If KILL and failed, raises StructuralGateViolation

        Raises:
            StructuralGateViolation: If validation fails and on_failure is KILL
        """
        result = self.validate(data, schema_id, version)

        if result.is_valid:
            self.pass_count += 1
            return (True, data)

        # Handle failure based on action
        if on_failure == GateAction.PASS:
            log(f"PASS (despite failure): {schema_id} - {result.errors}", "WARN")
            self.pass_count += 1
            return (False, data)

        elif on_failure == GateAction.WARN:
            log(f"WARN: {schema_id} - {result.errors}", "WARN")
            self.warn_count += 1
            return (False, data)

        else:  # GateAction.KILL
            self.kill_count += 1
            result.process_killed = True
            self._archive_violation(result, data)
            log(f"KILL: {schema_id} - {result.errors}", "ERROR")
            raise StructuralGateViolation(result)

    # -------------------------------------------------------------------------
    # VERSION COMPATIBILITY
    # -------------------------------------------------------------------------

    def check_compatibility(self, schema_id: str, v1: str, v2: str) -> bool:
        """
        Check if two schema versions are compatible.

        Compatibility is based on semantic versioning - versions with the same
        MAJOR version are considered compatible.

        Args:
            schema_id: Schema identifier (for context, not currently used)
            v1: First version string
            v2: Second version string

        Returns:
            True if versions are compatible
        """
        try:
            version1 = SchemaVersion(v1)
            version2 = SchemaVersion(v2)
            return version1.is_compatible_with(version2)
        except (ValueError, IndexError):
            return False

    # -------------------------------------------------------------------------
    # REGISTRY PERSISTENCE
    # -------------------------------------------------------------------------

    def load_registry(self, path: str) -> None:
        """
        Load schemas from a registry file.

        Args:
            path: Path to registry JSON file

        Raises:
            FileNotFoundError: If registry file doesn't exist
            json.JSONDecodeError: If registry file is invalid JSON
        """
        registry_path = Path(path)
        if not registry_path.exists():
            log(f"Registry file not found: {path}", "WARN")
            return

        try:
            registry = json.loads(registry_path.read_text())
        except json.JSONDecodeError as e:
            log(f"Invalid JSON in registry: {e}", "ERROR")
            raise

        # Load schemas from registry
        schemas_data = registry.get("schemas", {})
        for schema_id, versions in schemas_data.items():
            for version, schema in versions.items():
                self.register_schema(schema_id, version, schema)

        log(f"Loaded {len(schemas_data)} schemas from registry")

    def save_registry(self, path: str) -> None:
        """
        Save all schemas to a registry file.

        Args:
            path: Path to save registry JSON file
        """
        registry = {
            "registry_version": "1.0.0",
            "updated_at": datetime.now().isoformat(),
            "schemas": self.schemas
        }

        registry_path = Path(path)
        registry_path.parent.mkdir(parents=True, exist_ok=True)
        registry_path.write_text(json.dumps(registry, indent=2))
        log(f"Saved registry to {path}")

    def export_registry(self) -> dict:
        """
        Export all schemas as a registry dictionary.

        Returns:
            Registry dictionary with all schemas
        """
        return {
            "registry_version": "1.0.0",
            "exported_at": datetime.now().isoformat(),
            "schemas": self.schemas,
            "stats": self.get_stats()
        }

    # -------------------------------------------------------------------------
    # STATISTICS AND AUDIT
    # -------------------------------------------------------------------------

    def get_stats(self) -> dict:
        """
        Get validation statistics.

        Returns:
            Dictionary with validation statistics
        """
        total = self.pass_count + self.warn_count + self.kill_count
        return {
            "total_validations": total,
            "pass_count": self.pass_count,
            "warn_count": self.warn_count,
            "kill_count": self.kill_count,
            "pass_rate": self.pass_count / max(1, total),
            "kill_rate": self.kill_count / max(1, total),
            "schemas_registered": len(self.schemas),
            "schema_versions": sum(len(v) for v in self.schemas.values()),
            "recent_validations": len(self.validation_log)
        }

    def get_recent_validations(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get recent validation results.

        Args:
            limit: Maximum number of results to return

        Returns:
            List of validation result dictionaries
        """
        with self._log_lock:
            return [r.to_dict() for r in self.validation_log[-limit:]]

    def get_violations(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get recent validation failures.

        Args:
            limit: Maximum number of results to return

        Returns:
            List of failed validation result dictionaries
        """
        with self._log_lock:
            failures = [r for r in self.validation_log if not r.is_valid]
            return [r.to_dict() for r in failures[-limit:]]

    def _record_validation(self, result: ValidationResult) -> None:
        """Record a validation result in the log."""
        with self._log_lock:
            self.validation_log.append(result)
            # Keep log from growing unbounded
            if len(self.validation_log) > 1000:
                self.validation_log = self.validation_log[-500:]

    def _archive_violation(self, result: ValidationResult, data: Any) -> None:
        """Archive a violation for forensic analysis."""
        try:
            archive: List[dict] = []
            if VIOLATION_ARCHIVE_FILE.exists():
                archive = json.loads(VIOLATION_ARCHIVE_FILE.read_text())

            archive.append({
                "result": result.to_dict(),
                "data_preview": str(data)[:500],  # Limited preview for debugging
                "archived_at": datetime.now().isoformat()
            })

            # Keep only last 100 violations
            archive = archive[-100:]

            VIOLATION_ARCHIVE_FILE.write_text(json.dumps(archive, indent=2))
        except Exception as e:
            log(f"Failed to archive violation: {e}", "ERROR")

    def clear_stats(self) -> None:
        """Reset all statistics and validation log."""
        self.pass_count = 0
        self.warn_count = 0
        self.kill_count = 0
        with self._log_lock:
            self.validation_log = []
        log("Statistics cleared")


# ===============================================================================
# DECORATORS FOR AUTOMATIC VALIDATION
# ===============================================================================

def validate_input(
    schema_id: str,
    version: Optional[str] = None,
    on_failure: GateAction = GateAction.KILL
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator to validate function input against schema.

    Validates the first positional argument or the 'data' keyword argument.

    Usage:
        @validate_input("task_action")
        def process_task(task_data):
            return do_something(task_data)

    Args:
        schema_id: Schema to validate against
        version: Schema version (None = latest)
        on_failure: Action on validation failure

    Returns:
        Decorated function
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            gate = get_structural_gate()

            # Get data to validate (first positional arg or 'data' kwarg)
            data = args[0] if args else kwargs.get('data')

            if data is not None:
                passed, validated = gate.gate(data, schema_id, version, on_failure)

                # Replace with validated data
                if args:
                    return func(validated, *args[1:], **kwargs)
                else:
                    kwargs['data'] = validated
                    return func(*args, **kwargs)

            return func(*args, **kwargs)

        return wrapper
    return decorator


def validate_output(
    schema_id: str,
    version: Optional[str] = None,
    on_failure: GateAction = GateAction.KILL
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator to validate function output against schema.

    Usage:
        @validate_output("decision_record")
        def make_decision(context):
            return create_decision(context)

    Args:
        schema_id: Schema to validate against
        version: Schema version (None = latest)
        on_failure: Action on validation failure

    Returns:
        Decorated function
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)

            if result is not None:
                gate = get_structural_gate()
                passed, validated = gate.gate(result, schema_id, version, on_failure)
                return validated

            return result

        return wrapper
    return decorator


# ===============================================================================
# SINGLETON ACCESS
# ===============================================================================

_gate: Optional[StructuralGate] = None
_gate_lock = threading.Lock()


def get_structural_gate() -> StructuralGate:
    """
    Get the singleton StructuralGate instance.

    This is thread-safe and will create the gate on first access,
    loading the default schema registry if it exists.

    Returns:
        The global StructuralGate instance
    """
    global _gate
    if _gate is None:
        with _gate_lock:
            if _gate is None:
                _gate = StructuralGate()
                # Try to load default registry
                if SCHEMA_REGISTRY_FILE.exists():
                    try:
                        _gate.load_registry(str(SCHEMA_REGISTRY_FILE))
                    except Exception as e:
                        log(f"Failed to load default registry: {e}", "WARN")
    return _gate


def reset_structural_gate() -> None:
    """
    Reset the global StructuralGate instance.

    Useful for testing or when schemas need to be reloaded.
    """
    global _gate
    with _gate_lock:
        _gate = None


# ===============================================================================
# CONVENIENCE FUNCTIONS
# ===============================================================================

def validate(data: Any, schema_id: str, version: Optional[str] = None) -> ValidationResult:
    """
    Convenience function to validate data.

    Args:
        data: Data to validate
        schema_id: Schema identifier
        version: Schema version (None = latest)

    Returns:
        ValidationResult
    """
    return get_structural_gate().validate(data, schema_id, version)


def gate(
    data: Any,
    schema_id: str,
    version: Optional[str] = None,
    on_failure: GateAction = GateAction.KILL
) -> Tuple[bool, Any]:
    """
    Convenience function to gate data.

    Args:
        data: Data to validate
        schema_id: Schema identifier
        version: Schema version (None = latest)
        on_failure: Action on validation failure

    Returns:
        (passed, data)

    Raises:
        StructuralGateViolation: If validation fails and on_failure is KILL
    """
    return get_structural_gate().gate(data, schema_id, version, on_failure)


def register_schema(schema_id: str, version: str, schema: dict) -> None:
    """
    Convenience function to register a schema.

    Args:
        schema_id: Schema identifier
        version: Schema version
        schema: JSON Schema dictionary
    """
    get_structural_gate().register_schema(schema_id, version, schema)


# ===============================================================================
# CLI INTERFACE
# ===============================================================================

def main():
    """CLI interface for StructuralGate."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Structural Gate - JSON Schema Enforcement for TinyPM"
    )
    parser.add_argument("--stats", action="store_true", help="Show validation statistics")
    parser.add_argument("--list", action="store_true", help="List registered schemas")
    parser.add_argument("--violations", action="store_true", help="Show recent violations")
    parser.add_argument("--validate", type=str, help="Validate a JSON file against a schema")
    parser.add_argument("--schema", type=str, help="Schema ID for validation")
    parser.add_argument("--version", type=str, help="Schema version (optional)")

    args = parser.parse_args()

    gate = get_structural_gate()

    if args.stats:
        stats = gate.get_stats()
        print("\nStructural Gate Statistics")
        print("=" * 50)
        for key, value in stats.items():
            if isinstance(value, float):
                print(f"  {key}: {value:.2%}")
            else:
                print(f"  {key}: {value}")
        print()
        return

    if args.list:
        schemas = gate.list_schemas()
        print("\nRegistered Schemas")
        print("=" * 50)
        for schema_id, versions in schemas.items():
            print(f"  {schema_id}: {', '.join(versions)}")
        print()
        return

    if args.violations:
        violations = gate.get_violations(limit=10)
        print("\nRecent Violations")
        print("=" * 50)
        for v in violations:
            print(f"  [{v['schema_id']}@{v['schema_version']}]")
            for error in v.get('errors', [])[:3]:
                print(f"    - {error}")
            print()
        return

    if args.validate:
        if not args.schema:
            print("Error: --schema required for validation")
            return

        try:
            with open(args.validate) as f:
                data = json.load(f)

            result = gate.validate(data, args.schema, args.version)
            print(f"\nValidation Result: {'PASS' if result.is_valid else 'FAIL'}")
            if not result.is_valid:
                for error in result.errors:
                    print(f"  - {error}")
            if result.warnings:
                print("\nWarnings:")
                for warning in result.warnings:
                    print(f"  - {warning}")
        except FileNotFoundError:
            print(f"Error: File not found: {args.validate}")
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON: {e}")


if __name__ == "__main__":
    main()
