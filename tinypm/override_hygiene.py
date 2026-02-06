#!/usr/bin/env python3
"""
===============================================================================
OVERRIDE HYGIENE SYSTEM - Phase 4: Sovereign Seed
===============================================================================

TIERED PREFERENCE MANAGEMENT that prevents canonical knowledge corruption.

The Override Hygiene System maintains a strict separation between:
- CANONICAL RULES (Seed Vault) - Immutable, organization-wide
- USER PREFERENCES - Personal, can override display but not logic
- LEARNED PATTERNS - AI-discovered, lowest priority

CRITICAL PRINCIPLE: Overrides can NEVER modify canonical rules.

Hierarchy:
    TIER 1: CANONICAL (Seed Vault)
    |-- Immutable organization rules
    |-- Can only be changed via explicit human review
    |-- Source: Research, compliance, governance

    TIER 2: USER PREFERENCES
    |-- Personal preferences per user
    |-- Can override Tier 3 (Learned)
    |-- CANNOT override Tier 1 (Canonical)

    TIER 3: LEARNED PATTERNS
    |-- AI-discovered patterns
    |-- Lowest priority
    |-- Auto-expire unless promoted

Promotion Flow:
    Learned -> (request) -> Pending Review -> (human approval) -> Canonical

    NO AUTOMATIC PROMOTION. EVER.

Integration:
- Works with seed_vault.py for canonical rules
- Provides /api/overrides/* endpoints via web_server.py
- Full audit trail for forensic dashboard

Created: 2026-02-04
Author: PM_Architect Claude
Part of: Project "Sovereign Seed" Phase 4
"""

from __future__ import annotations

import hashlib
import json
import threading
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

# ===========================================================================
# CONFIGURATION
# ===========================================================================

APP_DIR = Path(__file__).parent
OVERRIDES_FILE = APP_DIR / ".override_hygiene_data.json"
AUDIT_LOG_FILE = APP_DIR / ".override_hygiene_audit.json"
DRIFT_LOG_FILE = APP_DIR / ".override_hygiene_drift.json"

# Default expiration for learned patterns (30 days)
DEFAULT_LEARNED_EXPIRATION_DAYS = 30

# Threshold for drift detection (access count)
DRIFT_THRESHOLD_FREQUENCY = 100
HIGH_DRIFT_THRESHOLD = 500


# ===========================================================================
# ENUMS
# ===========================================================================

class RuleTier(str, Enum):
    """Tier hierarchy for rules. Higher tier = higher priority."""
    CANONICAL = "canonical"     # Tier 1: Seed Vault - immutable
    PREFERENCE = "preference"   # Tier 2: User preferences - personal
    LEARNED = "learned"         # Tier 3: AI patterns - lowest priority

    @property
    def priority(self) -> int:
        """Higher number = higher priority."""
        return {"canonical": 3, "preference": 2, "learned": 1}.get(self.value, 0)


class OverrideStatus(str, Enum):
    """Status of an override."""
    ACTIVE = "active"                       # Currently in effect
    PENDING_PROMOTION = "pending_promotion" # Awaiting human review
    PROMOTED = "promoted"                   # Successfully promoted to canonical
    REJECTED = "rejected"                   # Promotion rejected
    EXPIRED = "expired"                     # Past expiration date
    REVOKED = "revoked"                     # Manually revoked


class DriftImpact(str, Enum):
    """Impact level of detected drift."""
    LOW = "low"           # Minor concern
    MEDIUM = "medium"     # Should investigate
    HIGH = "high"         # Critical - action needed


class AuditAction(str, Enum):
    """Actions logged in audit trail."""
    RULE_CREATED = "rule_created"
    RULE_UPDATED = "rule_updated"
    OVERRIDE_SET = "override_set"
    OVERRIDE_REVOKED = "override_revoked"
    PROMOTION_REQUESTED = "promotion_requested"
    PROMOTION_APPROVED = "promotion_approved"
    PROMOTION_REJECTED = "promotion_rejected"
    DRIFT_DETECTED = "drift_detected"
    EFFECTIVE_VALUE_ACCESSED = "effective_value_accessed"
    CANONICAL_OVERRIDE_BLOCKED = "canonical_override_blocked"


# ===========================================================================
# DATA STRUCTURES
# ===========================================================================

@dataclass
class Rule:
    """A rule at any tier in the hierarchy."""
    id: str
    key: str                    # e.g., "task.default_priority"
    value: Any
    tier: str                   # RuleTier value
    source: str                 # Where this came from
    created_at: str
    created_by: str
    description: str = ""
    expires_at: Optional[str] = None
    confidence: float = 1.0     # For learned patterns
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Rule':
        return cls(**data)

    def is_expired(self) -> bool:
        """Check if this rule has expired."""
        if self.expires_at is None:
            return False
        try:
            expires = datetime.fromisoformat(self.expires_at)
            return datetime.now() > expires
        except (ValueError, TypeError):
            return False


@dataclass
class Override:
    """An override that modifies behavior at a specific tier."""
    id: str
    rule_key: str               # Key being overridden
    original_value: Any         # Value before override (may be None)
    override_value: Any         # New value
    tier: str                   # Tier of this override (preference or learned)
    target_tier: str            # Tier being overridden (must be lower priority)
    reason: str                 # Why this override exists
    status: str                 # OverrideStatus value
    created_at: str
    created_by: str
    expires_at: Optional[str] = None
    access_count: int = 0       # For drift detection
    last_accessed: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Override':
        return cls(**data)

    def is_active(self) -> bool:
        """Check if this override is currently active."""
        if self.status != OverrideStatus.ACTIVE.value:
            return False
        if self.expires_at:
            try:
                expires = datetime.fromisoformat(self.expires_at)
                if datetime.now() > expires:
                    return False
            except (ValueError, TypeError):
                pass
        return True


@dataclass
class PromotionRequest:
    """Request to promote an override/pattern to canonical status."""
    id: str
    override_id: Optional[str]  # May be None for direct promotion requests
    rule_key: str
    proposed_value: Any
    requested_by: str
    requested_at: str
    justification: str
    evidence: List[str]         # Links/references to supporting evidence
    status: str                 # 'pending', 'approved', 'rejected'
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    review_notes: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PromotionRequest':
        return cls(**data)


@dataclass
class PreferenceDrift:
    """Detected drift where preferences are acting like rules."""
    id: str
    rule_key: str
    expected_tier: str          # What tier it should probably be
    actual_tier: str            # What tier it currently is
    frequency: int              # How often this override is applied
    impact: str                 # DriftImpact value
    detected_at: str
    recommendation: str
    users_affected: List[str] = field(default_factory=list)
    resolved: bool = False
    resolved_at: Optional[str] = None
    resolution_action: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PreferenceDrift':
        return cls(**data)


@dataclass
class AuditEntry:
    """Audit log entry for override hygiene actions."""
    id: str
    action: str                 # AuditAction value
    actor: str                  # Who performed the action
    timestamp: str
    rule_key: str
    details: Dict[str, Any]
    before_state: Optional[Dict[str, Any]] = None
    after_state: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ===========================================================================
# EXCEPTIONS
# ===========================================================================

class CannotOverrideCanonicalError(Exception):
    """Raised when attempting to override a canonical rule."""
    def __init__(self, rule_key: str, message: str = None):
        self.rule_key = rule_key
        self.message = message or f"Cannot override canonical rule '{rule_key}'. Request promotion if you believe this should change."
        super().__init__(self.message)


class InvalidTierOverrideError(Exception):
    """Raised when attempting to override a higher-priority tier."""
    def __init__(self, override_tier: str, target_tier: str):
        self.override_tier = override_tier
        self.target_tier = target_tier
        super().__init__(
            f"Cannot use tier '{override_tier}' to override tier '{target_tier}'. "
            f"Overrides can only target lower-priority tiers."
        )


class OverrideNotFoundError(Exception):
    """Raised when an override cannot be found."""
    pass


class PromotionRequestNotFoundError(Exception):
    """Raised when a promotion request cannot be found."""
    pass


# ===========================================================================
# OVERRIDE MANAGER - Core Engine
# ===========================================================================

class OverrideManager:
    """
    Manages the three-tier rule hierarchy with strict override hygiene.

    CRITICAL INVARIANT: Canonical rules can NEVER be overridden by lower tiers.
    Preferences can override learned patterns but nothing else.

    Hierarchy: Canonical > Preference > Learned > Default
    """

    def __init__(self, seed_vault: 'SeedVault' = None):
        """
        Initialize the Override Manager.

        Args:
            seed_vault: Optional SeedVault instance for canonical rules.
                       If None, will use lazy import from seed_vault module.
        """
        self._seed_vault = seed_vault
        self._lock = threading.RLock()

        # Storage
        self.preferences: Dict[str, Rule] = {}      # key: "user_id:rule_key"
        self.learned: Dict[str, Rule] = {}          # key: rule_key
        self.overrides: Dict[str, Override] = {}    # key: override_id
        self.promotions: Dict[str, PromotionRequest] = {}  # key: request_id
        self.audit_log: List[AuditEntry] = []

        # Access tracking for drift detection
        self.access_counts: Dict[str, int] = {}     # key: "rule_key:tier"

        # Callbacks
        self._callbacks: Dict[str, List[Callable]] = {
            "on_override_set": [],
            "on_override_blocked": [],
            "on_promotion_requested": [],
            "on_promotion_resolved": [],
            "on_drift_detected": [],
        }

        # Load persisted data
        self._load_data()

    @property
    def seed_vault(self) -> 'SeedVault':
        """Lazy-load seed vault if not provided."""
        if self._seed_vault is None:
            try:
                from seed_vault import get_seed_vault
                self._seed_vault = get_seed_vault()
            except ImportError:
                # Create a minimal stub if seed_vault not available
                self._seed_vault = _MinimalSeedVault()
        return self._seed_vault

    # =========================================================================
    # PERSISTENCE
    # =========================================================================

    def _load_data(self):
        """Load persisted data from files."""
        if OVERRIDES_FILE.exists():
            try:
                data = json.loads(OVERRIDES_FILE.read_text())

                # Load preferences
                for key, rule_data in data.get("preferences", {}).items():
                    self.preferences[key] = Rule.from_dict(rule_data)

                # Load learned
                for key, rule_data in data.get("learned", {}).items():
                    self.learned[key] = Rule.from_dict(rule_data)

                # Load overrides
                for key, override_data in data.get("overrides", {}).items():
                    self.overrides[key] = Override.from_dict(override_data)

                # Load promotions
                for key, promo_data in data.get("promotions", {}).items():
                    self.promotions[key] = PromotionRequest.from_dict(promo_data)

                # Load access counts
                self.access_counts = data.get("access_counts", {})

            except (json.JSONDecodeError, KeyError, TypeError):
                pass

        # Load audit log separately (can grow large)
        if AUDIT_LOG_FILE.exists():
            try:
                data = json.loads(AUDIT_LOG_FILE.read_text())
                self.audit_log = [
                    AuditEntry(**entry) for entry in data.get("entries", [])[-1000:]
                ]
            except (json.JSONDecodeError, KeyError, TypeError):
                pass

    def _save_data(self):
        """Persist data to files."""
        data = {
            "preferences": {k: v.to_dict() for k, v in self.preferences.items()},
            "learned": {k: v.to_dict() for k, v in self.learned.items()},
            "overrides": {k: v.to_dict() for k, v in self.overrides.items()},
            "promotions": {k: v.to_dict() for k, v in self.promotions.items()},
            "access_counts": self.access_counts,
            "last_updated": datetime.now().isoformat(),
            "version": "1.0.0"
        }
        try:
            OVERRIDES_FILE.write_text(json.dumps(data, indent=2, default=str))
        except IOError:
            pass

    def _save_audit(self):
        """Persist audit log to file."""
        data = {
            "entries": [e.to_dict() for e in self.audit_log[-1000:]],
            "last_updated": datetime.now().isoformat()
        }
        try:
            AUDIT_LOG_FILE.write_text(json.dumps(data, indent=2, default=str))
        except IOError:
            pass

    def _log_audit(
        self,
        action: AuditAction,
        actor: str,
        rule_key: str,
        details: Dict[str, Any],
        before_state: Dict[str, Any] = None,
        after_state: Dict[str, Any] = None
    ):
        """Add an entry to the audit log."""
        entry = AuditEntry(
            id=self._generate_id(),
            action=action.value,
            actor=actor,
            timestamp=datetime.now().isoformat(),
            rule_key=rule_key,
            details=details,
            before_state=before_state,
            after_state=after_state
        )
        self.audit_log.append(entry)
        self._save_audit()

    # =========================================================================
    # CALLBACKS
    # =========================================================================

    def register_callback(self, event: str, callback: Callable):
        """Register a callback for an event."""
        if event in self._callbacks:
            self._callbacks[event].append(callback)

    def _emit(self, event: str, *args, **kwargs):
        """Emit event to registered callbacks."""
        for callback in self._callbacks.get(event, []):
            try:
                callback(*args, **kwargs)
            except Exception:
                pass

    # =========================================================================
    # ID GENERATION
    # =========================================================================

    def _generate_id(self) -> str:
        """Generate a unique ID."""
        return hashlib.md5(
            f"{datetime.now().isoformat()}{id(self)}".encode()
        ).hexdigest()[:12]

    # =========================================================================
    # CORE RULE RESOLUTION
    # =========================================================================

    def get_effective_rule(
        self,
        key: str,
        user_id: str = None
    ) -> Tuple[Any, Optional[RuleTier], Optional[str]]:
        """
        Get the effective value for a rule key.

        Resolution order (highest to lowest priority):
        1. Canonical (Seed Vault) - immutable, organization-wide
        2. User Preference - personal to the user
        3. Learned Pattern - AI-discovered
        4. Default (None)

        Args:
            key: The rule key to look up (e.g., "task.default_priority")
            user_id: Optional user ID for preference lookup

        Returns:
            Tuple of (value, tier, source) where tier and source are None if no rule found
        """
        with self._lock:
            # Track access for drift detection

            # 1. Check canonical first (highest priority)
            canonical = self._get_canonical_rule(key)
            if canonical is not None:
                self._record_access(key, RuleTier.CANONICAL)
                return (canonical.value, RuleTier.CANONICAL, canonical.source)

            # 2. Check user preference
            if user_id:
                pref_key = f"{user_id}:{key}"
                if pref_key in self.preferences:
                    pref = self.preferences[pref_key]
                    if not pref.is_expired():
                        self._record_access(key, RuleTier.PREFERENCE)
                        return (pref.value, RuleTier.PREFERENCE, pref.source)

            # 3. Check learned patterns
            if key in self.learned:
                learned = self.learned[key]
                if not learned.is_expired():
                    self._record_access(key, RuleTier.LEARNED)
                    return (learned.value, RuleTier.LEARNED, learned.source)

            # 4. No rule found
            return (None, None, None)

    def _get_canonical_rule(self, key: str) -> Optional[Rule]:
        """Get canonical rule from Seed Vault."""
        try:
            # Try to get from seed vault
            vault = self.seed_vault

            # Check if vault has the rule
            if hasattr(vault, 'rules') and key in vault.rules:
                rule = vault.rules[key]
                return Rule(
                    id=rule.id if hasattr(rule, 'id') else key,
                    key=key,
                    value=rule.value if hasattr(rule, 'value') else rule,
                    tier=RuleTier.CANONICAL.value,
                    source=rule.source if hasattr(rule, 'source') else "seed_vault",
                    created_at=rule.created_at if hasattr(rule, 'created_at') else datetime.now().isoformat(),
                    created_by="seed_vault"
                )

            # Try get_rule method
            if hasattr(vault, 'get_rule'):
                result = vault.get_rule(key)
                if result is not None:
                    return Rule(
                        id=key,
                        key=key,
                        value=result if not hasattr(result, 'value') else result.value,
                        tier=RuleTier.CANONICAL.value,
                        source="seed_vault",
                        created_at=datetime.now().isoformat(),
                        created_by="seed_vault"
                    )
        except Exception:
            pass

        return None

    def _record_access(self, key: str, tier: RuleTier):
        """Record access for drift detection."""
        access_key = f"{key}:{tier.value}"
        self.access_counts[access_key] = self.access_counts.get(access_key, 0) + 1

    # =========================================================================
    # PREFERENCE MANAGEMENT
    # =========================================================================

    def set_preference(
        self,
        key: str,
        value: Any,
        user_id: str,
        reason: str = None,
        expires_in_days: int = None
    ) -> Override:
        """
        Set a user preference.

        CANNOT override canonical rules - will raise CannotOverrideCanonicalError.

        Args:
            key: Rule key to set preference for
            value: The preference value
            user_id: User ID this preference belongs to
            reason: Optional reason for the preference
            expires_in_days: Optional expiration in days

        Returns:
            Override record

        Raises:
            CannotOverrideCanonicalError: If attempting to override canonical rule
        """
        with self._lock:
            # CHECK: Is this trying to override a canonical rule?
            canonical = self._get_canonical_rule(key)
            if canonical is not None:
                # BLOCK - Cannot override canonical
                self._log_audit(
                    AuditAction.CANONICAL_OVERRIDE_BLOCKED,
                    user_id,
                    key,
                    {
                        "attempted_value": value,
                        "canonical_value": canonical.value,
                        "reason": reason
                    }
                )
                self._emit("on_override_blocked", key, user_id, canonical)
                raise CannotOverrideCanonicalError(key)

            # Get current value for audit
            current_value, current_tier, _ = self.get_effective_rule(key, user_id)

            # Calculate expiration
            expires_at = None
            if expires_in_days:
                expires_at = (datetime.now() + timedelta(days=expires_in_days)).isoformat()

            # Create the preference rule
            pref_key = f"{user_id}:{key}"
            rule = Rule(
                id=self._generate_id(),
                key=key,
                value=value,
                tier=RuleTier.PREFERENCE.value,
                source=f"user:{user_id}",
                created_at=datetime.now().isoformat(),
                created_by=user_id,
                description=reason or "User preference",
                expires_at=expires_at
            )
            self.preferences[pref_key] = rule

            # Create override record
            override = Override(
                id=self._generate_id(),
                rule_key=key,
                original_value=current_value,
                override_value=value,
                tier=RuleTier.PREFERENCE.value,
                target_tier=RuleTier.LEARNED.value if current_tier == RuleTier.LEARNED else "default",
                reason=reason or "User preference",
                status=OverrideStatus.ACTIVE.value,
                created_at=datetime.now().isoformat(),
                created_by=user_id,
                expires_at=expires_at,
                metadata={"user_id": user_id}
            )
            self.overrides[override.id] = override

            # Audit log
            self._log_audit(
                AuditAction.OVERRIDE_SET,
                user_id,
                key,
                {"reason": reason, "expires_at": expires_at},
                before_state={"value": current_value, "tier": current_tier.value if current_tier else None},
                after_state={"value": value, "tier": RuleTier.PREFERENCE.value}
            )

            # Persist and emit
            self._save_data()
            self._emit("on_override_set", override)

            return override

    def remove_preference(self, key: str, user_id: str) -> bool:
        """
        Remove a user preference.

        Args:
            key: Rule key to remove preference for
            user_id: User ID

        Returns:
            True if removed, False if not found
        """
        with self._lock:
            pref_key = f"{user_id}:{key}"
            if pref_key in self.preferences:
                old_rule = self.preferences.pop(pref_key)

                # Mark related overrides as revoked
                for override in self.overrides.values():
                    if (override.rule_key == key and
                        override.metadata.get("user_id") == user_id and
                        override.status == OverrideStatus.ACTIVE.value):
                        override.status = OverrideStatus.REVOKED.value

                self._log_audit(
                    AuditAction.OVERRIDE_REVOKED,
                    user_id,
                    key,
                    {"removed_value": old_rule.value}
                )

                self._save_data()
                return True
            return False

    def get_user_preferences(self, user_id: str) -> List[Rule]:
        """Get all preferences for a user."""
        with self._lock:
            prefix = f"{user_id}:"
            return [
                rule for key, rule in self.preferences.items()
                if key.startswith(prefix) and not rule.is_expired()
            ]

    # =========================================================================
    # LEARNED PATTERN MANAGEMENT
    # =========================================================================

    def add_learned_pattern(
        self,
        key: str,
        value: Any,
        confidence: float,
        source: str,
        description: str = None,
        expires_in_days: int = None
    ) -> Rule:
        """
        Add a learned pattern from AI.

        Lowest priority - overridden by preferences and canonical.
        Auto-expires unless promoted.

        Args:
            key: Rule key
            value: Learned value
            confidence: Confidence score (0.0 to 1.0)
            source: Source of the pattern (e.g., "ai_learning:task_completion_analysis")
            description: Optional description
            expires_in_days: Optional expiration (defaults to 30 days)

        Returns:
            The created Rule
        """
        with self._lock:
            # Calculate expiration (defaults to 30 days)
            expires_days = expires_in_days or DEFAULT_LEARNED_EXPIRATION_DAYS
            expires_at = (datetime.now() + timedelta(days=expires_days)).isoformat()

            rule = Rule(
                id=self._generate_id(),
                key=key,
                value=value,
                tier=RuleTier.LEARNED.value,
                source=source,
                created_at=datetime.now().isoformat(),
                created_by="ai_learning",
                description=description or f"Learned pattern with {confidence:.0%} confidence",
                expires_at=expires_at,
                confidence=confidence,
                metadata={"confidence": confidence, "source_system": source}
            )
            self.learned[key] = rule

            self._log_audit(
                AuditAction.RULE_CREATED,
                "ai_learning",
                key,
                {
                    "tier": RuleTier.LEARNED.value,
                    "confidence": confidence,
                    "expires_at": expires_at
                }
            )

            self._save_data()
            return rule

    def update_learned_pattern(
        self,
        key: str,
        value: Any = None,
        confidence: float = None
    ) -> Optional[Rule]:
        """Update an existing learned pattern."""
        with self._lock:
            if key not in self.learned:
                return None

            rule = self.learned[key]

            if value is not None:
                rule.value = value
            if confidence is not None:
                rule.confidence = confidence
                rule.metadata["confidence"] = confidence

            self._save_data()
            return rule

    def remove_learned_pattern(self, key: str) -> bool:
        """Remove a learned pattern."""
        with self._lock:
            if key in self.learned:
                self.learned.pop(key)
                self._save_data()
                return True
            return False

    def get_learned_patterns(
        self,
        min_confidence: float = 0.0,
        include_expired: bool = False
    ) -> List[Rule]:
        """Get learned patterns filtered by confidence."""
        with self._lock:
            patterns = []
            for rule in self.learned.values():
                if rule.confidence >= min_confidence:
                    if include_expired or not rule.is_expired():
                        patterns.append(rule)
            return sorted(patterns, key=lambda r: r.confidence, reverse=True)

    # =========================================================================
    # PROMOTION SYSTEM
    # =========================================================================

    def request_promotion(
        self,
        override_id: str,
        user_id: str,
        justification: str,
        evidence: List[str] = None
    ) -> PromotionRequest:
        """
        Request promotion of an override to canonical.

        REQUIRES HUMAN REVIEW before approval. No automatic promotion.

        Args:
            override_id: ID of the override to promote
            user_id: User requesting promotion
            justification: Why this should be canonical
            evidence: Links/references supporting the request

        Returns:
            PromotionRequest record

        Raises:
            OverrideNotFoundError: If override not found
        """
        with self._lock:
            override = self.overrides.get(override_id)
            if not override:
                raise OverrideNotFoundError(f"Override not found: {override_id}")

            request = PromotionRequest(
                id=self._generate_id(),
                override_id=override_id,
                rule_key=override.rule_key,
                proposed_value=override.override_value,
                requested_by=user_id,
                requested_at=datetime.now().isoformat(),
                justification=justification,
                evidence=evidence or [],
                status="pending"
            )
            self.promotions[request.id] = request

            # Mark override as pending promotion
            override.status = OverrideStatus.PENDING_PROMOTION.value

            self._log_audit(
                AuditAction.PROMOTION_REQUESTED,
                user_id,
                override.rule_key,
                {
                    "override_id": override_id,
                    "justification": justification,
                    "evidence_count": len(evidence or [])
                }
            )

            self._save_data()
            self._emit("on_promotion_requested", request)

            return request

    def request_direct_promotion(
        self,
        key: str,
        value: Any,
        user_id: str,
        justification: str,
        evidence: List[str] = None
    ) -> PromotionRequest:
        """
        Request direct promotion of a value to canonical (without existing override).

        Args:
            key: Rule key to promote
            value: Proposed canonical value
            user_id: User requesting promotion
            justification: Why this should be canonical
            evidence: Supporting evidence

        Returns:
            PromotionRequest record
        """
        with self._lock:
            request = PromotionRequest(
                id=self._generate_id(),
                override_id=None,
                rule_key=key,
                proposed_value=value,
                requested_by=user_id,
                requested_at=datetime.now().isoformat(),
                justification=justification,
                evidence=evidence or [],
                status="pending"
            )
            self.promotions[request.id] = request

            self._log_audit(
                AuditAction.PROMOTION_REQUESTED,
                user_id,
                key,
                {
                    "direct_promotion": True,
                    "justification": justification
                }
            )

            self._save_data()
            self._emit("on_promotion_requested", request)

            return request

    def review_promotion(
        self,
        request_id: str,
        reviewer_id: str,
        approved: bool,
        notes: str = None
    ) -> PromotionRequest:
        """
        Review a promotion request.

        If approved, the value becomes a canonical rule via Seed Vault.

        Args:
            request_id: ID of the promotion request
            reviewer_id: ID of the reviewer (must have permission)
            approved: Whether to approve the promotion
            notes: Optional review notes

        Returns:
            Updated PromotionRequest

        Raises:
            PromotionRequestNotFoundError: If request not found
        """
        with self._lock:
            request = self.promotions.get(request_id)
            if not request:
                raise PromotionRequestNotFoundError(f"Request not found: {request_id}")

            # Update request
            request.reviewed_by = reviewer_id
            request.reviewed_at = datetime.now().isoformat()
            request.review_notes = notes

            if approved:
                request.status = "approved"

                # Update override status if exists
                if request.override_id and request.override_id in self.overrides:
                    self.overrides[request.override_id].status = OverrideStatus.PROMOTED.value

                # Add to Seed Vault (if it supports adding rules)
                self._promote_to_canonical(
                    key=request.rule_key,
                    value=request.proposed_value,
                    source=f"promoted:{request_id}",
                    promoted_by=reviewer_id
                )

                self._log_audit(
                    AuditAction.PROMOTION_APPROVED,
                    reviewer_id,
                    request.rule_key,
                    {
                        "request_id": request_id,
                        "promoted_value": request.proposed_value,
                        "notes": notes
                    }
                )
            else:
                request.status = "rejected"

                # Update override status if exists
                if request.override_id and request.override_id in self.overrides:
                    self.overrides[request.override_id].status = OverrideStatus.REJECTED.value

                self._log_audit(
                    AuditAction.PROMOTION_REJECTED,
                    reviewer_id,
                    request.rule_key,
                    {
                        "request_id": request_id,
                        "notes": notes
                    }
                )

            self._save_data()
            self._emit("on_promotion_resolved", request, approved)

            return request

    def _promote_to_canonical(
        self,
        key: str,
        value: Any,
        source: str,
        promoted_by: str
    ):
        """
        Promote a value to canonical via Seed Vault.

        Note: This requires Seed Vault to support adding rules dynamically.
        If not supported, the promotion is logged but manual action required.
        """
        try:
            vault = self.seed_vault

            # Try to add rule if vault supports it
            if hasattr(vault, 'add_rule'):
                vault.add_rule(
                    key=key,
                    value=value,
                    source=source,
                    added_by=promoted_by
                )
            elif hasattr(vault, 'rules'):
                # Direct assignment if supported
                from seed_vault import CanonicalRule
                vault.rules[key] = CanonicalRule(
                    id=key,
                    category="promoted",
                    severity="high",
                    title=f"Promoted: {key}",
                    description=f"Promoted from override by {promoted_by}",
                    must_do=[],
                    must_not_do=[]
                )
        except Exception:
            # If vault doesn't support dynamic rules, log for manual action
            pass

    def get_pending_promotions(self) -> List[PromotionRequest]:
        """Get all pending promotion requests."""
        with self._lock:
            return [
                request for request in self.promotions.values()
                if request.status == "pending"
            ]

    # =========================================================================
    # OVERRIDE QUERIES
    # =========================================================================

    def get_override(self, override_id: str) -> Optional[Override]:
        """Get an override by ID."""
        return self.overrides.get(override_id)

    def get_overrides_for_key(self, key: str) -> List[Override]:
        """Get all overrides for a specific rule key."""
        with self._lock:
            return [
                override for override in self.overrides.values()
                if override.rule_key == key
            ]

    def get_active_overrides(self) -> List[Override]:
        """Get all active overrides."""
        with self._lock:
            return [
                override for override in self.overrides.values()
                if override.is_active()
            ]

    # =========================================================================
    # RULE BROWSER / HIERARCHY VIEW
    # =========================================================================

    def get_hierarchy_view(
        self,
        user_id: str = None,
        filter_key: str = None
    ) -> Dict[str, Any]:
        """
        Get a hierarchical view of all rules.

        Returns a structured view showing:
        - Canonical rules (Tier 1)
        - User preferences (Tier 2)
        - Learned patterns (Tier 3)

        Args:
            user_id: Optional user ID for preference filtering
            filter_key: Optional key prefix to filter by

        Returns:
            Dict with hierarchy structure
        """
        with self._lock:
            hierarchy = {
                "canonical": [],
                "preferences": [],
                "learned": [],
                "summary": {
                    "total_canonical": 0,
                    "total_preferences": 0,
                    "total_learned": 0,
                    "active_overrides": 0,
                    "pending_promotions": 0
                }
            }

            # Get canonical rules from vault
            try:
                vault = self.seed_vault
                if hasattr(vault, 'rules'):
                    for rule_id, rule in vault.rules.items():
                        if filter_key and not rule_id.startswith(filter_key):
                            continue
                        hierarchy["canonical"].append({
                            "id": rule_id,
                            "key": rule_id,
                            "title": rule.title if hasattr(rule, 'title') else rule_id,
                            "description": rule.description if hasattr(rule, 'description') else "",
                            "tier": RuleTier.CANONICAL.value,
                            "immutable": True
                        })
            except Exception:
                pass

            # Get preferences
            for pref_key, rule in self.preferences.items():
                if filter_key and not rule.key.startswith(filter_key):
                    continue
                if user_id and not pref_key.startswith(f"{user_id}:"):
                    continue
                if not rule.is_expired():
                    hierarchy["preferences"].append({
                        "id": rule.id,
                        "key": rule.key,
                        "value": rule.value,
                        "tier": RuleTier.PREFERENCE.value,
                        "source": rule.source,
                        "expires_at": rule.expires_at,
                        "user_id": pref_key.split(":")[0] if ":" in pref_key else None
                    })

            # Get learned patterns
            for key, rule in self.learned.items():
                if filter_key and not key.startswith(filter_key):
                    continue
                if not rule.is_expired():
                    hierarchy["learned"].append({
                        "id": rule.id,
                        "key": rule.key,
                        "value": rule.value,
                        "tier": RuleTier.LEARNED.value,
                        "confidence": rule.confidence,
                        "source": rule.source,
                        "expires_at": rule.expires_at
                    })

            # Summary counts
            hierarchy["summary"]["total_canonical"] = len(hierarchy["canonical"])
            hierarchy["summary"]["total_preferences"] = len(hierarchy["preferences"])
            hierarchy["summary"]["total_learned"] = len(hierarchy["learned"])
            hierarchy["summary"]["active_overrides"] = len(self.get_active_overrides())
            hierarchy["summary"]["pending_promotions"] = len(self.get_pending_promotions())

            return hierarchy

    def explain_rule(self, key: str, user_id: str = None) -> Dict[str, Any]:
        """
        Explain why a rule has its current value.

        Shows the resolution path and what's being overridden.

        Args:
            key: Rule key to explain
            user_id: Optional user ID for preference consideration

        Returns:
            Explanation dict with resolution details
        """
        with self._lock:
            value, tier, source = self.get_effective_rule(key, user_id)

            explanation = {
                "key": key,
                "effective_value": value,
                "effective_tier": tier.value if tier else None,
                "source": source,
                "resolution_path": [],
                "overridden_values": [],
                "can_be_overridden": tier != RuleTier.CANONICAL if tier else True,
                "promotion_available": tier == RuleTier.PREFERENCE or tier == RuleTier.LEARNED
            }

            # Build resolution path
            canonical = self._get_canonical_rule(key)
            if canonical:
                explanation["resolution_path"].append({
                    "tier": RuleTier.CANONICAL.value,
                    "value": canonical.value,
                    "source": canonical.source,
                    "status": "applied" if tier == RuleTier.CANONICAL else "checked"
                })

            if user_id:
                pref_key = f"{user_id}:{key}"
                if pref_key in self.preferences:
                    pref = self.preferences[pref_key]
                    status = "applied" if tier == RuleTier.PREFERENCE else ("overridden" if canonical else "checked")
                    explanation["resolution_path"].append({
                        "tier": RuleTier.PREFERENCE.value,
                        "value": pref.value,
                        "source": pref.source,
                        "status": status
                    })
                    if canonical:
                        explanation["overridden_values"].append({
                            "tier": RuleTier.PREFERENCE.value,
                            "value": pref.value,
                            "overridden_by": RuleTier.CANONICAL.value
                        })

            if key in self.learned:
                learned = self.learned[key]
                status = "applied" if tier == RuleTier.LEARNED else "overridden"
                explanation["resolution_path"].append({
                    "tier": RuleTier.LEARNED.value,
                    "value": learned.value,
                    "source": learned.source,
                    "confidence": learned.confidence,
                    "status": status
                })
                if tier != RuleTier.LEARNED and not learned.is_expired():
                    overridden_by = tier.value if tier else "preference"
                    explanation["overridden_values"].append({
                        "tier": RuleTier.LEARNED.value,
                        "value": learned.value,
                        "overridden_by": overridden_by
                    })

            return explanation

    # =========================================================================
    # STATISTICS
    # =========================================================================

    def get_stats(self) -> Dict[str, Any]:
        """Get override hygiene statistics."""
        with self._lock:
            active_overrides = self.get_active_overrides()
            pending_promotions = self.get_pending_promotions()

            # Count by tier
            tier_counts = {
                RuleTier.CANONICAL.value: 0,
                RuleTier.PREFERENCE.value: len(self.preferences),
                RuleTier.LEARNED.value: len(self.learned)
            }

            try:
                vault = self.seed_vault
                if hasattr(vault, 'rules'):
                    tier_counts[RuleTier.CANONICAL.value] = len(vault.rules)
            except Exception:
                pass

            # Override status counts
            status_counts = {}
            for override in self.overrides.values():
                status_counts[override.status] = status_counts.get(override.status, 0) + 1

            # Promotion stats
            promotion_stats = {"pending": 0, "approved": 0, "rejected": 0}
            for promo in self.promotions.values():
                promotion_stats[promo.status] = promotion_stats.get(promo.status, 0) + 1

            return {
                "tier_counts": tier_counts,
                "total_rules": sum(tier_counts.values()),
                "active_overrides": len(active_overrides),
                "override_status_counts": status_counts,
                "promotion_stats": promotion_stats,
                "pending_promotions": len(pending_promotions),
                "audit_entries": len(self.audit_log),
                "access_tracking_keys": len(self.access_counts),
                "last_updated": datetime.now().isoformat()
            }

    def get_audit_log(
        self,
        limit: int = 100,
        action_filter: str = None,
        user_filter: str = None
    ) -> List[Dict[str, Any]]:
        """Get audit log entries."""
        with self._lock:
            entries = self.audit_log.copy()

            if action_filter:
                entries = [e for e in entries if e.action == action_filter]

            if user_filter:
                entries = [e for e in entries if e.actor == user_filter]

            # Return most recent first
            entries = sorted(entries, key=lambda e: e.timestamp, reverse=True)
            return [e.to_dict() for e in entries[:limit]]


# ===========================================================================
# PREFERENCE DRIFT DETECTOR
# ===========================================================================

class PreferenceDriftDetector:
    """
    Detects when preferences are accidentally acting like rules.

    Signs of drift:
    - Preference accessed more than canonical would be
    - Learned pattern never overridden (should be preference)
    - Same preference across many users (should be canonical)
    """

    def __init__(self, override_manager: OverrideManager):
        self.manager = override_manager
        self.detected_drifts: Dict[str, PreferenceDrift] = {}

        # Load persisted drifts
        self._load_drifts()

    def _load_drifts(self):
        """Load persisted drift detections."""
        if DRIFT_LOG_FILE.exists():
            try:
                data = json.loads(DRIFT_LOG_FILE.read_text())
                for drift_id, drift_data in data.get("drifts", {}).items():
                    self.detected_drifts[drift_id] = PreferenceDrift.from_dict(drift_data)
            except (json.JSONDecodeError, KeyError):
                pass

    def _save_drifts(self):
        """Save drift detections."""
        data = {
            "drifts": {k: v.to_dict() for k, v in self.detected_drifts.items()},
            "last_updated": datetime.now().isoformat()
        }
        try:
            DRIFT_LOG_FILE.write_text(json.dumps(data, indent=2))
        except IOError:
            pass

    def detect_drift(self) -> List[PreferenceDrift]:
        """
        Detect preference drift patterns.

        Checks for:
        1. Preferences accessed very frequently (should be canonical?)
        2. Learned patterns that are always used (should be preferences?)
        3. Same preference value across multiple users (should be canonical?)

        Returns:
            List of detected drift patterns
        """
        drifts = []
        now = datetime.now().isoformat()

        with self.manager._lock:
            # Check 1: High-frequency preferences
            for pref_key, rule in self.manager.preferences.items():
                access_key = f"{rule.key}:{RuleTier.PREFERENCE.value}"
                frequency = self.manager.access_counts.get(access_key, 0)

                if frequency > DRIFT_THRESHOLD_FREQUENCY:
                    impact = DriftImpact.HIGH if frequency > HIGH_DRIFT_THRESHOLD else DriftImpact.MEDIUM

                    drift = PreferenceDrift(
                        id=hashlib.md5(f"pref_freq:{rule.key}:{now}".encode()).hexdigest()[:12],
                        rule_key=rule.key,
                        expected_tier=RuleTier.CANONICAL.value,
                        actual_tier=RuleTier.PREFERENCE.value,
                        frequency=frequency,
                        impact=impact.value,
                        detected_at=now,
                        recommendation="Consider promoting to canonical rule due to high usage"
                    )

                    if drift.id not in self.detected_drifts:
                        drifts.append(drift)
                        self.detected_drifts[drift.id] = drift

            # Check 2: Same preference across many users
            preference_values: Dict[str, Dict[Any, List[str]]] = {}
            for pref_key, rule in self.manager.preferences.items():
                if ":" in pref_key:
                    user_id = pref_key.split(":")[0]
                    key = rule.key

                    if key not in preference_values:
                        preference_values[key] = {}

                    value_str = str(rule.value)
                    if value_str not in preference_values[key]:
                        preference_values[key][value_str] = []
                    preference_values[key][value_str].append(user_id)

            for key, value_users in preference_values.items():
                for value_str, users in value_users.items():
                    if len(users) >= 3:  # Same value across 3+ users
                        drift = PreferenceDrift(
                            id=hashlib.md5(f"multi_user:{key}:{value_str}:{now}".encode()).hexdigest()[:12],
                            rule_key=key,
                            expected_tier=RuleTier.CANONICAL.value,
                            actual_tier=RuleTier.PREFERENCE.value,
                            frequency=len(users),
                            impact=DriftImpact.MEDIUM.value,
                            detected_at=now,
                            recommendation=f"Same preference '{value_str}' set by {len(users)} users - consider canonical",
                            users_affected=users
                        )

                        if drift.id not in self.detected_drifts:
                            drifts.append(drift)
                            self.detected_drifts[drift.id] = drift

            # Check 3: Learned patterns with high confidence that are never overridden
            for key, rule in self.manager.learned.items():
                if rule.confidence >= 0.9:  # High confidence
                    access_key = f"{key}:{RuleTier.LEARNED.value}"
                    frequency = self.manager.access_counts.get(access_key, 0)

                    if frequency > DRIFT_THRESHOLD_FREQUENCY:
                        drift = PreferenceDrift(
                            id=hashlib.md5(f"learned_stable:{key}:{now}".encode()).hexdigest()[:12],
                            rule_key=key,
                            expected_tier=RuleTier.PREFERENCE.value,
                            actual_tier=RuleTier.LEARNED.value,
                            frequency=frequency,
                            impact=DriftImpact.LOW.value,
                            detected_at=now,
                            recommendation=f"Stable learned pattern ({rule.confidence:.0%} confidence) - consider elevating to preference"
                        )

                        if drift.id not in self.detected_drifts:
                            drifts.append(drift)
                            self.detected_drifts[drift.id] = drift

        # Log and emit
        if drifts:
            self._save_drifts()
            self.manager._emit("on_drift_detected", drifts)

            for drift in drifts:
                self.manager._log_audit(
                    AuditAction.DRIFT_DETECTED,
                    "drift_detector",
                    drift.rule_key,
                    {
                        "drift_id": drift.id,
                        "expected_tier": drift.expected_tier,
                        "actual_tier": drift.actual_tier,
                        "impact": drift.impact,
                        "recommendation": drift.recommendation
                    }
                )

        return drifts

    def get_unresolved_drifts(self) -> List[PreferenceDrift]:
        """Get all unresolved drift detections."""
        return [d for d in self.detected_drifts.values() if not d.resolved]

    def resolve_drift(
        self,
        drift_id: str,
        action: str,
        resolved_by: str
    ) -> Optional[PreferenceDrift]:
        """
        Mark a drift as resolved.

        Args:
            drift_id: ID of the drift to resolve
            action: Action taken (e.g., "promoted", "ignored", "investigated")
            resolved_by: Who resolved it

        Returns:
            Updated drift or None if not found
        """
        if drift_id in self.detected_drifts:
            drift = self.detected_drifts[drift_id]
            drift.resolved = True
            drift.resolved_at = datetime.now().isoformat()
            drift.resolution_action = action
            self._save_drifts()
            return drift
        return None

    def get_drift_stats(self) -> Dict[str, Any]:
        """Get drift detection statistics."""
        total = len(self.detected_drifts)
        unresolved = len(self.get_unresolved_drifts())

        by_impact = {DriftImpact.LOW.value: 0, DriftImpact.MEDIUM.value: 0, DriftImpact.HIGH.value: 0}
        for drift in self.detected_drifts.values():
            by_impact[drift.impact] = by_impact.get(drift.impact, 0) + 1

        return {
            "total_detected": total,
            "unresolved": unresolved,
            "resolved": total - unresolved,
            "by_impact": by_impact,
            "last_scan": datetime.now().isoformat()
        }


# ===========================================================================
# MINIMAL SEED VAULT STUB
# ===========================================================================

class _MinimalSeedVault:
    """Minimal stub for when seed_vault module is not available."""

    def __init__(self):
        self.rules = {}

    def get_rule(self, key: str) -> Optional[Any]:
        return self.rules.get(key)

    def add_rule(self, key: str, value: Any, source: str, added_by: str):
        self.rules[key] = type('Rule', (), {
            'id': key,
            'value': value,
            'source': source,
            'created_at': datetime.now().isoformat()
        })()


# ===========================================================================
# SINGLETON INSTANCE
# ===========================================================================

_override_manager: Optional[OverrideManager] = None
_drift_detector: Optional[PreferenceDriftDetector] = None


def get_override_manager() -> OverrideManager:
    """Get the global OverrideManager instance (singleton)."""
    global _override_manager
    if _override_manager is None:
        _override_manager = OverrideManager()
    return _override_manager


def get_drift_detector() -> PreferenceDriftDetector:
    """Get the global PreferenceDriftDetector instance (singleton)."""
    global _drift_detector
    if _drift_detector is None:
        _drift_detector = PreferenceDriftDetector(get_override_manager())
    return _drift_detector


# ===========================================================================
# CONVENIENCE FUNCTIONS
# ===========================================================================

def get_effective_rule(key: str, user_id: str = None) -> Tuple[Any, Optional[RuleTier], Optional[str]]:
    """Get effective rule value (convenience function)."""
    return get_override_manager().get_effective_rule(key, user_id)


def set_preference(key: str, value: Any, user_id: str, reason: str = None) -> Override:
    """Set user preference (convenience function)."""
    return get_override_manager().set_preference(key, value, user_id, reason)


def add_learned_pattern(key: str, value: Any, confidence: float, source: str) -> Rule:
    """Add learned pattern (convenience function)."""
    return get_override_manager().add_learned_pattern(key, value, confidence, source)


def request_promotion(override_id: str, user_id: str, justification: str, evidence: List[str] = None) -> PromotionRequest:
    """Request promotion (convenience function)."""
    return get_override_manager().request_promotion(override_id, user_id, justification, evidence)


def detect_drift() -> List[PreferenceDrift]:
    """Detect preference drift (convenience function)."""
    return get_drift_detector().detect_drift()


# ===========================================================================
# CLI INTERFACE
# ===========================================================================

def main():
    """CLI interface for Override Hygiene System."""
    import argparse

    parser = argparse.ArgumentParser(description="Override Hygiene System - Phase 4 Sovereign Seed")
    parser.add_argument("--stats", action="store_true", help="Show system statistics")
    parser.add_argument("--hierarchy", action="store_true", help="Show rule hierarchy")
    parser.add_argument("--drifts", action="store_true", help="Detect and show preference drifts")
    parser.add_argument("--audit", type=int, nargs="?", const=20, help="Show audit log (default: 20 entries)")
    parser.add_argument("--explain", type=str, help="Explain a rule key")
    parser.add_argument("--user", type=str, help="User ID for preference filtering")
    args = parser.parse_args()

    manager = get_override_manager()

    if args.stats:
        stats = manager.get_stats()
        print("\n=== OVERRIDE HYGIENE STATISTICS ===")
        print(f"Total Rules: {stats['total_rules']}")
        print(f"\nTier Counts:")
        for tier, count in stats['tier_counts'].items():
            print(f"  {tier}: {count}")
        print(f"\nActive Overrides: {stats['active_overrides']}")
        print(f"Pending Promotions: {stats['pending_promotions']}")
        print(f"Audit Entries: {stats['audit_entries']}")

    elif args.hierarchy:
        hierarchy = manager.get_hierarchy_view(user_id=args.user)
        print("\n=== RULE HIERARCHY ===\n")

        print("TIER 1: CANONICAL (Seed Vault)")
        for rule in hierarchy['canonical'][:10]:
            print(f"  - {rule['key']}")

        print(f"\nTIER 2: USER PREFERENCES ({len(hierarchy['preferences'])} total)")
        for rule in hierarchy['preferences'][:10]:
            print(f"  - {rule['key']} = {rule['value']}")

        print(f"\nTIER 3: LEARNED PATTERNS ({len(hierarchy['learned'])} total)")
        for rule in hierarchy['learned'][:10]:
            print(f"  - {rule['key']} = {rule['value']} ({rule['confidence']:.0%} confidence)")

    elif args.drifts:
        detector = get_drift_detector()
        drifts = detector.detect_drift()
        print(f"\n=== PREFERENCE DRIFT DETECTION ===")
        print(f"Detected {len(drifts)} new drift patterns\n")

        unresolved = detector.get_unresolved_drifts()
        print(f"Total Unresolved: {len(unresolved)}")
        for drift in unresolved[:10]:
            print(f"\n[{drift.impact.upper()}] {drift.rule_key}")
            print(f"  Expected: {drift.expected_tier}, Actual: {drift.actual_tier}")
            print(f"  Frequency: {drift.frequency}")
            print(f"  Recommendation: {drift.recommendation}")

    elif args.audit is not None:
        entries = manager.get_audit_log(limit=args.audit)
        print(f"\n=== AUDIT LOG (last {args.audit} entries) ===\n")
        for entry in entries:
            print(f"[{entry['timestamp'][:19]}] {entry['action']}")
            print(f"  Actor: {entry['actor']}, Key: {entry['rule_key']}")

    elif args.explain:
        explanation = manager.explain_rule(args.explain, args.user)
        print(f"\n=== RULE EXPLANATION: {args.explain} ===\n")
        print(f"Effective Value: {explanation['effective_value']}")
        print(f"Effective Tier: {explanation['effective_tier']}")
        print(f"Source: {explanation['source']}")
        print(f"\nResolution Path:")
        for step in explanation['resolution_path']:
            print(f"  [{step['tier']}] {step['value']} - {step['status']}")
        if explanation['overridden_values']:
            print(f"\nOverridden Values:")
            for ov in explanation['overridden_values']:
                print(f"  [{ov['tier']}] {ov['value']} (by {ov['overridden_by']})")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
