#!/usr/bin/env python3
"""
===============================================================================
P2P NEGOTIATION PROTOCOL - Agent-to-Agent Consensus System
===============================================================================

STATE OF THE ART Peer-to-Peer Negotiation Protocol for TinyPM's multi-agent system.

Based on:
- Google A2A Protocol (January 2026)
- AAAI 2026 Multi-Agent Collaboration Research
- Swarm Intelligence Patterns

The Pattern: Architects vs Alchemists

Instead of a PM telling agents what to do, agents NEGOTIATE:
1. **Architects (UX Agents)**: Propose UI layouts based on research
2. **Alchemists (Functionality Agents)**: Receive proposals and "Bid" on them
   - Calculate technical cost
   - Calculate performance impact
   - Calculate complexity score
3. **Consensus**: They negotiate until agreement, BEFORE code is written

Example Negotiation Flow:
    ARCHITECT: "I propose a real-time updating dashboard with 100 data points"
    ALCHEMIST: "BID: Cost=HIGH, Latency=500ms, Complexity=8/10. COUNTER: Progressive Disclosure"
    ARCHITECT: "ACCEPT: Progressive Disclosure with lazy loading"
    GOVERNOR: "CONSENSUS REACHED. Recording decision."

Features:
- Structured negotiation messages with thread tracking
- Bid/Counter-bid cycles with technical cost analysis
- Timeout-based escalation to Governor
- 100% auditable consensus recording with SHA-256 hashes
- Seed Vault rule validation for all proposals

Usage:
    from negotiation_protocol import (
        NegotiationChannel,
        Proposal,
        Bid,
        create_architect_proposal,
        create_alchemist_bid
    )

    # Create a negotiation channel
    channel = NegotiationChannel(
        architect=ux_agent,
        alchemist=backend_agent,
        governor=pm_orchestrator
    )

    # Architect proposes
    proposal = create_architect_proposal(
        description="Real-time dashboard with 100 data points",
        ui_components=[Component("dashboard", "DashboardView")],
        research_citations=["Nielsen Norman Group 2026", "UX Design Principles"]
    )
    await channel.propose(proposal)

    # Alchemist bids
    bid = create_alchemist_bid(
        technical_cost=CostLevel.HIGH,
        latency_impact_ms=500,
        complexity_score=8.0,
        counter_proposal=Proposal(description="Progressive Disclosure pattern")
    )
    await channel.bid(bid)

    # Reach consensus
    consensus = await channel.reach_consensus()

Created: 2026-02-04
Author: TinyPM Team
Based on: SOTA Multi-Agent Research 2026
===============================================================================
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum, auto
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Union
from uuid import uuid4

# ===============================================================================
# CONFIGURATION
# ===============================================================================

APP_DIR = Path(__file__).parent
NEGOTIATION_LOG_FILE = APP_DIR / ".negotiation_protocol.log"
NEGOTIATION_HISTORY_FILE = APP_DIR / ".negotiation_history.json"
CONSENSUS_ARCHIVE_FILE = APP_DIR / ".consensus_archive.json"
SEED_VAULT_FILE = APP_DIR / "seed_vault.json"

# Negotiation settings
MAX_NEGOTIATION_ROUNDS = 5
NEGOTIATION_TIMEOUT_SECONDS = 300  # 5 minutes
ESCALATION_AFTER_ROUNDS = 3

# Load environment
_env_file = APP_DIR / ".env"
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, val = line.split("=", 1)
            os.environ.setdefault(key.strip(), val.strip())


# ===============================================================================
# LOGGING
# ===============================================================================

def log(msg: str, level: str = "INFO"):
    """Log with timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [NegotiationProtocol] [{level}] {msg}"
    print(line)
    try:
        with open(NEGOTIATION_LOG_FILE, "a") as f:
            f.write(line + "\n")
    except:
        pass


# ===============================================================================
# ENUMS
# ===============================================================================

class MessageType(Enum):
    """Types of negotiation messages."""
    PROPOSE = "propose"
    BID = "bid"
    COUNTER = "counter"
    ACCEPT = "accept"
    REJECT = "reject"
    ESCALATE = "escalate"
    CLARIFY = "clarify"
    WITHDRAW = "withdraw"


class CostLevel(Enum):
    """Technical cost levels for implementation."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    PROHIBITIVE = "prohibitive"

    @property
    def numeric_value(self) -> float:
        """Get numeric value for cost comparison."""
        return {"low": 0.25, "medium": 0.5, "high": 0.75, "prohibitive": 1.0}[self.value]


class NegotiationStatus(Enum):
    """Status of a negotiation channel."""
    OPEN = "open"
    AWAITING_BID = "awaiting_bid"
    AWAITING_RESPONSE = "awaiting_response"
    CONSENSUS_REACHED = "consensus_reached"
    ESCALATED = "escalated"
    REJECTED = "rejected"
    TIMED_OUT = "timed_out"
    CLOSED = "closed"


class AgentRole(Enum):
    """Roles in the negotiation process."""
    ARCHITECT = "architect"  # UX/Design agents - propose features
    ALCHEMIST = "alchemist"  # Backend/Tech agents - bid on feasibility
    GOVERNOR = "governor"    # PM/Orchestrator - final arbiter


class RiskLevel(Enum):
    """Risk levels for proposals."""
    MINIMAL = "minimal"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


# ===============================================================================
# DATA CLASSES: CORE COMPONENTS
# ===============================================================================

@dataclass
class Constraint:
    """A constraint that must be satisfied in a proposal."""
    name: str
    description: str
    type: str  # "performance", "security", "ux", "technical", "business"
    threshold: Optional[Any] = None
    hard_constraint: bool = True  # If True, violation means rejection
    seed_vault_ref: Optional[str] = None  # Reference to Seed Vault rule

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "description": self.description,
            "type": self.type,
            "threshold": self.threshold,
            "hard_constraint": self.hard_constraint,
            "seed_vault_ref": self.seed_vault_ref
        }


@dataclass
class Component:
    """A UI component in a proposal."""
    id: str
    type: str
    properties: Dict[str, Any] = field(default_factory=dict)
    children: List["Component"] = field(default_factory=list)
    estimated_complexity: float = 5.0  # 1-10 scale

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "type": self.type,
            "properties": self.properties,
            "children": [c.to_dict() for c in self.children],
            "estimated_complexity": self.estimated_complexity
        }


@dataclass
class ImpactEstimate:
    """Estimated impact of a proposal."""
    user_value: float  # 1-10 scale
    development_effort: float  # 1-10 scale
    maintenance_overhead: float  # 1-10 scale
    risk_level: RiskLevel = RiskLevel.MODERATE
    confidence: float = 0.7  # 0-1 confidence in this estimate

    def to_dict(self) -> Dict:
        return {
            "user_value": self.user_value,
            "development_effort": self.development_effort,
            "maintenance_overhead": self.maintenance_overhead,
            "risk_level": self.risk_level.value,
            "confidence": self.confidence
        }


@dataclass
class Proposal:
    """
    A proposed change from an Architect agent.

    Contains all the information needed for an Alchemist to assess feasibility.
    """
    description: str
    proposal_id: str = field(default_factory=lambda: str(uuid4())[:8])
    ui_components: List[Component] = field(default_factory=list)
    research_citations: List[str] = field(default_factory=list)
    estimated_impact: Optional[ImpactEstimate] = None
    constraints: List[Constraint] = field(default_factory=list)
    seed_vault_rules: List[str] = field(default_factory=list)  # Rules this must comply with
    priority: int = 5  # 1-10 scale
    deadline: Optional[datetime] = None
    alternatives: List["Proposal"] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict:
        return {
            "proposal_id": self.proposal_id,
            "description": self.description,
            "ui_components": [c.to_dict() for c in self.ui_components],
            "research_citations": self.research_citations,
            "estimated_impact": self.estimated_impact.to_dict() if self.estimated_impact else None,
            "constraints": [c.to_dict() for c in self.constraints],
            "seed_vault_rules": self.seed_vault_rules,
            "priority": self.priority,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "alternatives": [a.to_dict() for a in self.alternatives],
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat()
        }

    def compute_hash(self) -> str:
        """Compute SHA-256 hash of proposal for audit trail."""
        content = json.dumps(self.to_dict(), sort_keys=True, default=str)
        return hashlib.sha256(content.encode()).hexdigest()


@dataclass
class ResourceRequirements:
    """Resource requirements for implementing a bid."""
    cpu_estimate: str = "low"  # low, medium, high
    memory_mb: int = 0
    storage_mb: int = 0
    api_calls_per_minute: int = 0
    external_services: List[str] = field(default_factory=list)
    estimated_dev_hours: float = 0.0

    def to_dict(self) -> Dict:
        return {
            "cpu_estimate": self.cpu_estimate,
            "memory_mb": self.memory_mb,
            "storage_mb": self.storage_mb,
            "api_calls_per_minute": self.api_calls_per_minute,
            "external_services": self.external_services,
            "estimated_dev_hours": self.estimated_dev_hours
        }


@dataclass
class Bid:
    """
    A bid/cost analysis from an Alchemist agent.

    Provides technical assessment and optionally a counter-proposal.
    """
    bid_id: str = field(default_factory=lambda: str(uuid4())[:8])
    technical_cost: CostLevel = CostLevel.MEDIUM
    latency_impact_ms: int = 0
    complexity_score: float = 5.0  # 1-10 scale
    resource_requirements: ResourceRequirements = field(default_factory=ResourceRequirements)
    counter_proposal: Optional[Proposal] = None
    justification: str = ""
    risks: List[str] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)
    feasibility_score: float = 0.7  # 0-1, probability of success
    estimated_delivery_days: int = 0
    created_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict:
        return {
            "bid_id": self.bid_id,
            "technical_cost": self.technical_cost.value,
            "latency_impact_ms": self.latency_impact_ms,
            "complexity_score": self.complexity_score,
            "resource_requirements": self.resource_requirements.to_dict(),
            "counter_proposal": self.counter_proposal.to_dict() if self.counter_proposal else None,
            "justification": self.justification,
            "risks": self.risks,
            "dependencies": self.dependencies,
            "feasibility_score": self.feasibility_score,
            "estimated_delivery_days": self.estimated_delivery_days,
            "created_at": self.created_at.isoformat()
        }

    def compute_hash(self) -> str:
        """Compute SHA-256 hash of bid for audit trail."""
        content = json.dumps(self.to_dict(), sort_keys=True, default=str)
        return hashlib.sha256(content.encode()).hexdigest()

    @property
    def overall_score(self) -> float:
        """
        Calculate overall bid score (higher = more favorable).

        Factors in cost, complexity, latency, and feasibility.
        """
        cost_penalty = self.technical_cost.numeric_value * 30
        complexity_penalty = (self.complexity_score / 10) * 25
        latency_penalty = min(self.latency_impact_ms / 100, 25)
        feasibility_bonus = self.feasibility_score * 30

        return max(0, 100 - cost_penalty - complexity_penalty - latency_penalty + feasibility_bonus)


@dataclass
class Concession:
    """A concession made during negotiation."""
    party: str  # Who made the concession
    original_position: str
    new_position: str
    reason: str
    round_number: int
    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict:
        return {
            "party": self.party,
            "original_position": self.original_position,
            "new_position": self.new_position,
            "reason": self.reason,
            "round_number": self.round_number,
            "timestamp": self.timestamp.isoformat()
        }


@dataclass
class GovernorDecision:
    """Decision made by the Governor when escalated."""
    decision_id: str = field(default_factory=lambda: str(uuid4())[:8])
    thread_id: str = ""
    decision: str = ""  # "approve", "reject", "modify"
    rationale: str = ""
    modified_proposal: Optional[Proposal] = None
    binding: bool = True
    conditions: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict:
        return {
            "decision_id": self.decision_id,
            "thread_id": self.thread_id,
            "decision": self.decision,
            "rationale": self.rationale,
            "modified_proposal": self.modified_proposal.to_dict() if self.modified_proposal else None,
            "binding": self.binding,
            "conditions": self.conditions,
            "timestamp": self.timestamp.isoformat()
        }


@dataclass
class Consensus:
    """Record of agreed-upon decision."""
    consensus_id: str = field(default_factory=lambda: str(uuid4())[:8])
    thread_id: str = ""
    participants: List[str] = field(default_factory=list)
    original_proposal: Optional[Proposal] = None
    final_agreement: Optional[Proposal] = None
    accepted_bid: Optional[Bid] = None
    concessions: List[Concession] = field(default_factory=list)
    total_rounds: int = 0
    negotiation_duration_seconds: float = 0.0
    seed_vault_validated: bool = False
    audit_hash: str = ""  # SHA-256 hash of entire consensus record
    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict:
        return {
            "consensus_id": self.consensus_id,
            "thread_id": self.thread_id,
            "participants": self.participants,
            "original_proposal": self.original_proposal.to_dict() if self.original_proposal else None,
            "final_agreement": self.final_agreement.to_dict() if self.final_agreement else None,
            "accepted_bid": self.accepted_bid.to_dict() if self.accepted_bid else None,
            "concessions": [c.to_dict() for c in self.concessions],
            "total_rounds": self.total_rounds,
            "negotiation_duration_seconds": self.negotiation_duration_seconds,
            "seed_vault_validated": self.seed_vault_validated,
            "audit_hash": self.audit_hash,
            "timestamp": self.timestamp.isoformat()
        }

    def compute_audit_hash(self) -> str:
        """Compute SHA-256 hash for 100% auditability."""
        data = self.to_dict()
        data.pop("audit_hash", None)  # Exclude the hash field itself
        content = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(content.encode()).hexdigest()

    def finalize(self) -> "Consensus":
        """Finalize the consensus record with audit hash."""
        self.audit_hash = self.compute_audit_hash()
        return self


# ===============================================================================
# NEGOTIATION MESSAGE
# ===============================================================================

@dataclass
class NegotiationMessage:
    """Structured message for agent-to-agent communication."""
    message_id: str = field(default_factory=lambda: str(uuid4())[:12])
    type: MessageType = MessageType.PROPOSE
    sender: str = ""
    sender_role: AgentRole = AgentRole.ARCHITECT
    recipient: str = ""
    content: Dict[str, Any] = field(default_factory=dict)
    proposal: Optional[Proposal] = None
    bid: Optional[Bid] = None
    constraints: List[Constraint] = field(default_factory=list)
    references_message_id: Optional[str] = None  # For replies
    thread_id: str = ""
    round_number: int = 1
    seed_vault_rules_cited: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict:
        return {
            "message_id": self.message_id,
            "type": self.type.value,
            "sender": self.sender,
            "sender_role": self.sender_role.value,
            "recipient": self.recipient,
            "content": self.content,
            "proposal": self.proposal.to_dict() if self.proposal else None,
            "bid": self.bid.to_dict() if self.bid else None,
            "constraints": [c.to_dict() for c in self.constraints],
            "references_message_id": self.references_message_id,
            "thread_id": self.thread_id,
            "round_number": self.round_number,
            "seed_vault_rules_cited": self.seed_vault_rules_cited,
            "timestamp": self.timestamp.isoformat()
        }

    def compute_hash(self) -> str:
        """Compute hash for message integrity."""
        content = json.dumps(self.to_dict(), sort_keys=True, default=str)
        return hashlib.sha256(content.encode()).hexdigest()


# ===============================================================================
# AGENT INTERFACE
# ===============================================================================

@dataclass
class Agent:
    """Represents an agent participating in negotiations."""
    agent_id: str
    name: str
    role: AgentRole
    capabilities: List[str] = field(default_factory=list)
    constraints: List[Constraint] = field(default_factory=list)
    handler: Optional[Callable] = None  # Async handler for messages

    def to_dict(self) -> Dict:
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "role": self.role.value,
            "capabilities": self.capabilities,
            "constraints": [c.to_dict() for c in self.constraints]
        }


# ===============================================================================
# SEED VAULT VALIDATOR
# ===============================================================================

class SeedVaultValidator:
    """
    Validates proposals against Seed Vault rules.

    The Seed Vault contains immutable rules that all proposals must satisfy.
    Governor can veto any consensus that violates these rules.
    """

    def __init__(self, seed_vault_path: Path = SEED_VAULT_FILE):
        self.seed_vault_path = seed_vault_path
        self.rules = self._load_rules()

    def _load_rules(self) -> Dict[str, Any]:
        """Load Seed Vault rules from file."""
        if self.seed_vault_path.exists():
            try:
                return json.loads(self.seed_vault_path.read_text())
            except Exception as e:
                log(f"Error loading Seed Vault: {e}", "WARN")
        return self._get_default_rules()

    def _get_default_rules(self) -> Dict[str, Any]:
        """Default Seed Vault rules."""
        return {
            "version": "1.0.0",
            "rules": {
                "performance": {
                    "max_latency_ms": 2000,
                    "max_complexity_score": 8.0,
                    "min_feasibility_score": 0.5
                },
                "security": {
                    "require_auth_for_mutations": True,
                    "no_sensitive_data_in_logs": True,
                    "rate_limiting_required": True
                },
                "ux": {
                    "max_click_depth": 3,
                    "require_loading_states": True,
                    "require_error_handling": True
                },
                "architecture": {
                    "no_circular_dependencies": True,
                    "require_api_versioning": True,
                    "max_coupling_score": 7.0
                },
                "compliance": {
                    "require_audit_trail": True,
                    "require_data_retention_policy": True
                }
            },
            "immutable": True
        }

    def validate_proposal(self, proposal: Proposal) -> tuple[bool, List[str]]:
        """
        Validate a proposal against Seed Vault rules.

        Returns:
            Tuple of (is_valid, list_of_violations)
        """
        violations = []
        rules = self.rules.get("rules", {})

        # Check performance rules
        perf_rules = rules.get("performance", {})
        if proposal.estimated_impact:
            if proposal.estimated_impact.development_effort > perf_rules.get("max_complexity_score", 10):
                violations.append(
                    f"Complexity {proposal.estimated_impact.development_effort} exceeds max "
                    f"{perf_rules.get('max_complexity_score', 10)}"
                )

        # Check constraints
        for constraint in proposal.constraints:
            if constraint.seed_vault_ref:
                rule_path = constraint.seed_vault_ref.split(".")
                rule_value = rules
                for key in rule_path:
                    rule_value = rule_value.get(key, {}) if isinstance(rule_value, dict) else None
                    if rule_value is None:
                        violations.append(f"Unknown Seed Vault rule: {constraint.seed_vault_ref}")
                        break

        return len(violations) == 0, violations

    def validate_bid(self, bid: Bid) -> tuple[bool, List[str]]:
        """
        Validate a bid against Seed Vault rules.

        Returns:
            Tuple of (is_valid, list_of_violations)
        """
        violations = []
        rules = self.rules.get("rules", {})
        perf_rules = rules.get("performance", {})

        # Check latency
        max_latency = perf_rules.get("max_latency_ms", 2000)
        if bid.latency_impact_ms > max_latency:
            violations.append(
                f"Latency {bid.latency_impact_ms}ms exceeds max {max_latency}ms"
            )

        # Check complexity
        max_complexity = perf_rules.get("max_complexity_score", 8.0)
        if bid.complexity_score > max_complexity:
            violations.append(
                f"Complexity {bid.complexity_score} exceeds max {max_complexity}"
            )

        # Check feasibility
        min_feasibility = perf_rules.get("min_feasibility_score", 0.5)
        if bid.feasibility_score < min_feasibility:
            violations.append(
                f"Feasibility {bid.feasibility_score} below min {min_feasibility}"
            )

        # Check if cost is prohibitive
        if bid.technical_cost == CostLevel.PROHIBITIVE:
            violations.append("Technical cost is PROHIBITIVE - requires special approval")

        return len(violations) == 0, violations

    def validate_consensus(self, consensus: Consensus) -> tuple[bool, List[str]]:
        """
        Validate a consensus record before finalization.

        Governor can veto any consensus that violates Seed Vault rules.
        """
        violations = []

        # Validate final agreement if present
        if consensus.final_agreement:
            is_valid, proposal_violations = self.validate_proposal(consensus.final_agreement)
            violations.extend(proposal_violations)

        # Validate accepted bid if present
        if consensus.accepted_bid:
            is_valid, bid_violations = self.validate_bid(consensus.accepted_bid)
            violations.extend(bid_violations)

        # Mark as validated
        if len(violations) == 0:
            consensus.seed_vault_validated = True

        return len(violations) == 0, violations


# ===============================================================================
# NEGOTIATION CHANNEL
# ===============================================================================

class NegotiationChannel:
    """
    P2P negotiation channel between Architect and Alchemist agents.

    Manages the full negotiation lifecycle with consensus recording.
    """

    def __init__(
        self,
        architect: Agent,
        alchemist: Agent,
        governor: Optional[Agent] = None,
        seed_validator: Optional[SeedVaultValidator] = None,
        max_rounds: int = MAX_NEGOTIATION_ROUNDS,
        timeout_seconds: float = NEGOTIATION_TIMEOUT_SECONDS
    ):
        self.thread_id = str(uuid4())
        self.architect = architect
        self.alchemist = alchemist
        self.governor = governor
        self.seed_validator = seed_validator or SeedVaultValidator()

        self.max_rounds = max_rounds
        self.timeout_seconds = timeout_seconds
        self.escalation_threshold = ESCALATION_AFTER_ROUNDS

        self.messages: List[NegotiationMessage] = []
        self.concessions: List[Concession] = []
        self.status = NegotiationStatus.OPEN
        self.current_round = 0

        self.current_proposal: Optional[Proposal] = None
        self.current_bid: Optional[Bid] = None
        self.original_proposal: Optional[Proposal] = None

        self.started_at = datetime.now()
        self._consensus: Optional[Consensus] = None
        self._governor_decision: Optional[GovernorDecision] = None

        # Event callbacks
        self._on_message: Optional[Callable] = None
        self._on_consensus: Optional[Callable] = None
        self._on_escalation: Optional[Callable] = None

        log(f"Created negotiation channel {self.thread_id[:8]} between "
            f"{architect.name} (Architect) and {alchemist.name} (Alchemist)")

    # =========================================================================
    # PROPERTIES
    # =========================================================================

    @property
    def is_open(self) -> bool:
        return self.status == NegotiationStatus.OPEN

    @property
    def is_concluded(self) -> bool:
        return self.status in [
            NegotiationStatus.CONSENSUS_REACHED,
            NegotiationStatus.REJECTED,
            NegotiationStatus.TIMED_OUT,
            NegotiationStatus.CLOSED
        ]

    @property
    def elapsed_seconds(self) -> float:
        return (datetime.now() - self.started_at).total_seconds()

    # =========================================================================
    # MESSAGE SENDING
    # =========================================================================

    async def propose(self, proposal: Proposal) -> NegotiationMessage:
        """
        Architect proposes a feature/change.

        This initiates the negotiation or continues it with a counter-proposal.
        """
        if self.status == NegotiationStatus.CLOSED:
            raise ValueError("Cannot propose on a closed channel")

        # Validate proposal against Seed Vault
        is_valid, violations = self.seed_validator.validate_proposal(proposal)
        if not is_valid:
            log(f"Proposal validation failed: {violations}", "WARN")
            # Don't reject outright, but note the violations
            proposal.metadata["seed_vault_violations"] = violations

        self.current_round += 1
        self.current_proposal = proposal

        if self.original_proposal is None:
            self.original_proposal = proposal

        message = NegotiationMessage(
            type=MessageType.PROPOSE,
            sender=self.architect.agent_id,
            sender_role=AgentRole.ARCHITECT,
            recipient=self.alchemist.agent_id,
            content={
                "action": "propose",
                "summary": proposal.description[:200]
            },
            proposal=proposal,
            constraints=proposal.constraints,
            thread_id=self.thread_id,
            round_number=self.current_round,
            seed_vault_rules_cited=proposal.seed_vault_rules
        )

        self.messages.append(message)
        self.status = NegotiationStatus.AWAITING_BID

        await self._notify_message(message)

        log(f"[Round {self.current_round}] {self.architect.name} proposed: "
            f"{proposal.description[:50]}...")

        return message

    async def bid(self, bid: Bid) -> NegotiationMessage:
        """
        Alchemist submits a bid in response to a proposal.

        The bid includes cost analysis and optionally a counter-proposal.
        """
        if self.status != NegotiationStatus.AWAITING_BID:
            raise ValueError(f"Cannot bid in status {self.status}")

        # Validate bid against Seed Vault
        is_valid, violations = self.seed_validator.validate_bid(bid)
        if not is_valid:
            log(f"Bid validation warnings: {violations}", "WARN")

        self.current_bid = bid

        # Determine if this is a counter-proposal
        msg_type = MessageType.BID
        if bid.counter_proposal:
            msg_type = MessageType.COUNTER

        message = NegotiationMessage(
            type=msg_type,
            sender=self.alchemist.agent_id,
            sender_role=AgentRole.ALCHEMIST,
            recipient=self.architect.agent_id,
            content={
                "action": "bid",
                "cost": bid.technical_cost.value,
                "latency_ms": bid.latency_impact_ms,
                "complexity": bid.complexity_score,
                "feasibility": bid.feasibility_score,
                "has_counter": bid.counter_proposal is not None
            },
            bid=bid,
            references_message_id=self.messages[-1].message_id if self.messages else None,
            thread_id=self.thread_id,
            round_number=self.current_round
        )

        self.messages.append(message)
        self.status = NegotiationStatus.AWAITING_RESPONSE

        await self._notify_message(message)

        log(f"[Round {self.current_round}] {self.alchemist.name} bid: "
            f"Cost={bid.technical_cost.value}, Latency={bid.latency_impact_ms}ms, "
            f"Complexity={bid.complexity_score}/10")

        # Check if we need to escalate
        if self.current_round >= self.escalation_threshold and not self.is_concluded:
            log(f"Reached escalation threshold at round {self.current_round}")

        return message

    async def counter(self, counter_proposal: Proposal) -> NegotiationMessage:
        """
        Submit a counter-proposal (can be from either party).

        Records the concession for audit trail.
        """
        if self.is_concluded:
            raise ValueError("Cannot counter on a concluded negotiation")

        # Determine sender based on last message
        last_msg = self.messages[-1] if self.messages else None
        if last_msg and last_msg.sender_role == AgentRole.ARCHITECT:
            sender = self.alchemist
            sender_role = AgentRole.ALCHEMIST
            recipient = self.architect.agent_id
        else:
            sender = self.architect
            sender_role = AgentRole.ARCHITECT
            recipient = self.alchemist.agent_id

        # Record concession
        if self.current_proposal:
            concession = Concession(
                party=sender.name,
                original_position=self.current_proposal.description[:100],
                new_position=counter_proposal.description[:100],
                reason="Counter-proposal submitted",
                round_number=self.current_round
            )
            self.concessions.append(concession)

        self.current_round += 1
        self.current_proposal = counter_proposal

        message = NegotiationMessage(
            type=MessageType.COUNTER,
            sender=sender.agent_id,
            sender_role=sender_role,
            recipient=recipient,
            content={
                "action": "counter",
                "summary": counter_proposal.description[:200]
            },
            proposal=counter_proposal,
            references_message_id=last_msg.message_id if last_msg else None,
            thread_id=self.thread_id,
            round_number=self.current_round
        )

        self.messages.append(message)
        self.status = NegotiationStatus.AWAITING_RESPONSE

        await self._notify_message(message)

        log(f"[Round {self.current_round}] {sender.name} countered: "
            f"{counter_proposal.description[:50]}...")

        # Check for max rounds
        if self.current_round >= self.max_rounds:
            log(f"Max rounds reached ({self.max_rounds}). Escalating to Governor.")
            await self.escalate_to_governor()

        return message

    async def accept(self, message_id: Optional[str] = None) -> Consensus:
        """
        Accept the current proposal/bid and reach consensus.

        Returns the finalized Consensus record.
        """
        if self.is_concluded:
            raise ValueError("Negotiation already concluded")

        # Record the acceptance
        last_msg = self.messages[-1] if self.messages else None
        sender = self.architect if last_msg and last_msg.sender_role == AgentRole.ALCHEMIST else self.alchemist
        recipient_id = last_msg.sender if last_msg else ""

        accept_msg = NegotiationMessage(
            type=MessageType.ACCEPT,
            sender=sender.agent_id,
            sender_role=sender.role,
            recipient=recipient_id,
            content={
                "action": "accept",
                "accepted_message_id": message_id or (last_msg.message_id if last_msg else None)
            },
            references_message_id=message_id or (last_msg.message_id if last_msg else None),
            thread_id=self.thread_id,
            round_number=self.current_round
        )

        self.messages.append(accept_msg)

        # Create and validate consensus
        consensus = await self.reach_consensus()

        log(f"[Round {self.current_round}] {sender.name} ACCEPTED. Consensus reached!")

        return consensus

    async def reject(self, message_id: str, reason: str) -> NegotiationMessage:
        """
        Reject a proposal/bid with a reason.

        This does not end the negotiation unless max rounds are reached.
        """
        last_msg = self.messages[-1] if self.messages else None
        sender = self.architect if last_msg and last_msg.sender_role == AgentRole.ALCHEMIST else self.alchemist

        reject_msg = NegotiationMessage(
            type=MessageType.REJECT,
            sender=sender.agent_id,
            sender_role=sender.role,
            recipient=last_msg.sender if last_msg else "",
            content={
                "action": "reject",
                "rejected_message_id": message_id,
                "reason": reason
            },
            references_message_id=message_id,
            thread_id=self.thread_id,
            round_number=self.current_round
        )

        self.messages.append(reject_msg)
        self.status = NegotiationStatus.AWAITING_RESPONSE

        await self._notify_message(reject_msg)

        log(f"[Round {self.current_round}] {sender.name} REJECTED: {reason[:50]}...")

        # Check if negotiation should end
        if self.current_round >= self.max_rounds:
            self.status = NegotiationStatus.REJECTED
            log("Negotiation ended in rejection (max rounds reached)")

        return reject_msg

    async def escalate_to_governor(self) -> GovernorDecision:
        """
        Escalate the negotiation to the Governor for a binding decision.

        Called automatically when max rounds are reached or can be invoked manually.
        """
        if not self.governor:
            raise ValueError("No Governor configured for this channel")

        escalate_msg = NegotiationMessage(
            type=MessageType.ESCALATE,
            sender=self.architect.agent_id,  # Either party can escalate
            sender_role=AgentRole.ARCHITECT,
            recipient=self.governor.agent_id,
            content={
                "action": "escalate",
                "reason": "Unable to reach consensus",
                "rounds_attempted": self.current_round,
                "messages_count": len(self.messages)
            },
            thread_id=self.thread_id,
            round_number=self.current_round
        )

        self.messages.append(escalate_msg)
        self.status = NegotiationStatus.ESCALATED

        await self._notify_escalation(escalate_msg)

        # Governor makes decision
        decision = await self._governor_decide()
        self._governor_decision = decision

        log(f"Governor decision: {decision.decision} - {decision.rationale[:50]}...")

        # Apply decision
        if decision.decision == "approve":
            await self.reach_consensus()
        elif decision.decision == "modify" and decision.modified_proposal:
            self.current_proposal = decision.modified_proposal
            await self.reach_consensus()
        else:
            self.status = NegotiationStatus.REJECTED

        return decision

    # =========================================================================
    # CONSENSUS
    # =========================================================================

    async def reach_consensus(self) -> Consensus:
        """
        Finalize the negotiation and create a Consensus record.

        Validates against Seed Vault rules before finalizing.
        """
        consensus = Consensus(
            thread_id=self.thread_id,
            participants=[self.architect.agent_id, self.alchemist.agent_id],
            original_proposal=self.original_proposal,
            final_agreement=self.current_proposal,
            accepted_bid=self.current_bid,
            concessions=self.concessions,
            total_rounds=self.current_round,
            negotiation_duration_seconds=self.elapsed_seconds
        )

        if self.governor:
            consensus.participants.append(self.governor.agent_id)

        # Validate consensus against Seed Vault
        is_valid, violations = self.seed_validator.validate_consensus(consensus)
        if not is_valid:
            log(f"Consensus has Seed Vault violations: {violations}", "WARN")
            # Governor veto if violations exist
            if self.governor and violations:
                log("Governor vetoing consensus due to Seed Vault violations")
                self.status = NegotiationStatus.REJECTED
                raise ValueError(f"Governor veto: Seed Vault violations - {violations}")

        # Finalize with audit hash
        consensus.finalize()
        self._consensus = consensus
        self.status = NegotiationStatus.CONSENSUS_REACHED

        # Persist consensus
        await self._persist_consensus(consensus)

        await self._notify_consensus(consensus)

        log(f"CONSENSUS REACHED: {consensus.consensus_id} | "
            f"Rounds: {consensus.total_rounds} | "
            f"Duration: {consensus.negotiation_duration_seconds:.1f}s | "
            f"Hash: {consensus.audit_hash[:16]}...")

        return consensus

    # =========================================================================
    # HELPERS
    # =========================================================================

    def get_transcript(self) -> List[NegotiationMessage]:
        """Get the full negotiation transcript."""
        return self.messages.copy()

    def get_transcript_summary(self) -> str:
        """Get a human-readable summary of the negotiation."""
        lines = [
            f"=== Negotiation Thread {self.thread_id[:8]} ===",
            f"Participants: {self.architect.name} vs {self.alchemist.name}",
            f"Status: {self.status.value}",
            f"Rounds: {self.current_round}",
            f"Duration: {self.elapsed_seconds:.1f}s",
            "",
            "--- Messages ---"
        ]

        for msg in self.messages:
            lines.append(
                f"[{msg.round_number}] {msg.sender_role.value.upper()}: "
                f"{msg.type.value} - {msg.content.get('summary', msg.content.get('action', ''))[:60]}"
            )

        if self._consensus:
            lines.extend([
                "",
                "--- Consensus ---",
                f"ID: {self._consensus.consensus_id}",
                f"Hash: {self._consensus.audit_hash}",
                f"Validated: {self._consensus.seed_vault_validated}"
            ])

        return "\n".join(lines)

    def timeout_check(self) -> bool:
        """Check if negotiation has timed out. Returns True if timed out."""
        if self.elapsed_seconds > self.timeout_seconds:
            self.status = NegotiationStatus.TIMED_OUT
            log(f"Negotiation timed out after {self.elapsed_seconds:.1f}s")
            return True
        return False

    def to_dict(self) -> Dict:
        """Serialize channel state for persistence."""
        return {
            "thread_id": self.thread_id,
            "architect": self.architect.to_dict(),
            "alchemist": self.alchemist.to_dict(),
            "governor": self.governor.to_dict() if self.governor else None,
            "status": self.status.value,
            "current_round": self.current_round,
            "current_proposal": self.current_proposal.to_dict() if self.current_proposal else None,
            "current_bid": self.current_bid.to_dict() if self.current_bid else None,
            "original_proposal": self.original_proposal.to_dict() if self.original_proposal else None,
            "messages": [m.to_dict() for m in self.messages],
            "concessions": [c.to_dict() for c in self.concessions],
            "consensus": self._consensus.to_dict() if self._consensus else None,
            "started_at": self.started_at.isoformat(),
            "elapsed_seconds": self.elapsed_seconds
        }

    # =========================================================================
    # EVENT HANDLERS
    # =========================================================================

    def on_message(self, callback: Callable):
        """Register callback for message events."""
        self._on_message = callback

    def on_consensus(self, callback: Callable):
        """Register callback for consensus events."""
        self._on_consensus = callback

    def on_escalation(self, callback: Callable):
        """Register callback for escalation events."""
        self._on_escalation = callback

    async def _notify_message(self, message: NegotiationMessage):
        """Notify listeners of new message."""
        if self._on_message:
            try:
                if asyncio.iscoroutinefunction(self._on_message):
                    await self._on_message(message)
                else:
                    self._on_message(message)
            except Exception as e:
                log(f"Error in message callback: {e}", "ERROR")

    async def _notify_consensus(self, consensus: Consensus):
        """Notify listeners of consensus reached."""
        if self._on_consensus:
            try:
                if asyncio.iscoroutinefunction(self._on_consensus):
                    await self._on_consensus(consensus)
                else:
                    self._on_consensus(consensus)
            except Exception as e:
                log(f"Error in consensus callback: {e}", "ERROR")

    async def _notify_escalation(self, message: NegotiationMessage):
        """Notify listeners of escalation."""
        if self._on_escalation:
            try:
                if asyncio.iscoroutinefunction(self._on_escalation):
                    await self._on_escalation(message)
                else:
                    self._on_escalation(message)
            except Exception as e:
                log(f"Error in escalation callback: {e}", "ERROR")

    async def _governor_decide(self) -> GovernorDecision:
        """
        Governor makes a binding decision on the escalated negotiation.

        This is a simplified implementation - in practice this would involve
        the Governor agent analyzing all messages and making an informed decision.
        """
        # Analyze the negotiation
        architect_positions = [m for m in self.messages if m.sender_role == AgentRole.ARCHITECT]
        alchemist_positions = [m for m in self.messages if m.sender_role == AgentRole.ALCHEMIST]

        # Simple decision logic - prefer feasible solutions
        if self.current_bid and self.current_bid.feasibility_score >= 0.7:
            decision = "approve"
            rationale = f"Alchemist's bid is feasible ({self.current_bid.feasibility_score:.0%}) and acceptable"
        elif self.current_bid and self.current_bid.counter_proposal:
            decision = "modify"
            rationale = "Adopting Alchemist's counter-proposal as a compromise"
        else:
            decision = "reject"
            rationale = "Unable to find acceptable compromise"

        return GovernorDecision(
            thread_id=self.thread_id,
            decision=decision,
            rationale=rationale,
            modified_proposal=self.current_bid.counter_proposal if self.current_bid else None,
            conditions=["Implementation must be reviewed after completion"]
        )

    async def _persist_consensus(self, consensus: Consensus):
        """Persist consensus to archive for auditability."""
        try:
            archive = []
            if CONSENSUS_ARCHIVE_FILE.exists():
                archive = json.loads(CONSENSUS_ARCHIVE_FILE.read_text())

            archive.append(consensus.to_dict())
            CONSENSUS_ARCHIVE_FILE.write_text(json.dumps(archive, indent=2, default=str))
        except Exception as e:
            log(f"Error persisting consensus: {e}", "ERROR")


# ===============================================================================
# FACTORY FUNCTIONS
# ===============================================================================

def create_architect_proposal(
    description: str,
    ui_components: Optional[List[Component]] = None,
    research_citations: Optional[List[str]] = None,
    constraints: Optional[List[Constraint]] = None,
    priority: int = 5,
    estimated_impact: Optional[ImpactEstimate] = None
) -> Proposal:
    """
    Factory function to create an Architect's proposal.

    Args:
        description: Description of the proposed feature/change
        ui_components: List of UI components involved
        research_citations: References to research/design principles
        constraints: Requirements that must be satisfied
        priority: 1-10 scale importance
        estimated_impact: Estimated user/business impact

    Returns:
        A well-formed Proposal ready for negotiation
    """
    return Proposal(
        description=description,
        ui_components=ui_components or [],
        research_citations=research_citations or [],
        constraints=constraints or [],
        priority=priority,
        estimated_impact=estimated_impact or ImpactEstimate(
            user_value=5.0,
            development_effort=5.0,
            maintenance_overhead=3.0
        )
    )


def create_alchemist_bid(
    technical_cost: CostLevel,
    latency_impact_ms: int,
    complexity_score: float,
    justification: str,
    counter_proposal: Optional[Proposal] = None,
    risks: Optional[List[str]] = None,
    dependencies: Optional[List[str]] = None,
    feasibility_score: float = 0.7,
    estimated_delivery_days: int = 5
) -> Bid:
    """
    Factory function to create an Alchemist's bid.

    Args:
        technical_cost: LOW, MEDIUM, HIGH, or PROHIBITIVE
        latency_impact_ms: Expected latency in milliseconds
        complexity_score: 1-10 scale complexity
        justification: Reasoning for the assessment
        counter_proposal: Optional alternative proposal
        risks: List of identified risks
        dependencies: External dependencies required
        feasibility_score: 0-1 probability of success
        estimated_delivery_days: Days to implement

    Returns:
        A well-formed Bid ready for negotiation
    """
    return Bid(
        technical_cost=technical_cost,
        latency_impact_ms=latency_impact_ms,
        complexity_score=complexity_score,
        justification=justification,
        counter_proposal=counter_proposal,
        risks=risks or [],
        dependencies=dependencies or [],
        feasibility_score=feasibility_score,
        estimated_delivery_days=estimated_delivery_days
    )


def create_agent(
    name: str,
    role: AgentRole,
    capabilities: Optional[List[str]] = None
) -> Agent:
    """
    Factory function to create an Agent for negotiation.

    Args:
        name: Human-readable agent name
        role: ARCHITECT, ALCHEMIST, or GOVERNOR
        capabilities: List of agent capabilities

    Returns:
        An Agent ready to participate in negotiations
    """
    return Agent(
        agent_id=str(uuid4())[:8],
        name=name,
        role=role,
        capabilities=capabilities or []
    )


# ===============================================================================
# NEGOTIATION MANAGER (MULTI-CHANNEL)
# ===============================================================================

class NegotiationManager:
    """
    Manages multiple negotiation channels.

    Provides:
    - Channel lifecycle management
    - Cross-channel coordination
    - History and analytics
    - WebSocket event streaming
    """

    def __init__(self):
        self.channels: Dict[str, NegotiationChannel] = {}
        self._event_handlers: List[Callable] = []

    def create_channel(
        self,
        architect: Agent,
        alchemist: Agent,
        governor: Optional[Agent] = None
    ) -> NegotiationChannel:
        """Create a new negotiation channel."""
        channel = NegotiationChannel(
            architect=architect,
            alchemist=alchemist,
            governor=governor
        )

        # Register event handlers
        channel.on_message(self._handle_channel_message)
        channel.on_consensus(self._handle_channel_consensus)
        channel.on_escalation(self._handle_channel_escalation)

        self.channels[channel.thread_id] = channel
        return channel

    def get_channel(self, thread_id: str) -> Optional[NegotiationChannel]:
        """Get a channel by thread ID."""
        return self.channels.get(thread_id)

    def get_active_channels(self) -> List[NegotiationChannel]:
        """Get all active (non-concluded) channels."""
        return [c for c in self.channels.values() if not c.is_concluded]

    def get_all_channels(self) -> List[NegotiationChannel]:
        """Get all channels."""
        return list(self.channels.values())

    def close_channel(self, thread_id: str):
        """Close and archive a channel."""
        channel = self.channels.get(thread_id)
        if channel:
            channel.status = NegotiationStatus.CLOSED
            log(f"Closed channel {thread_id[:8]}")

    def on_event(self, handler: Callable):
        """Register a global event handler for all channels."""
        self._event_handlers.append(handler)

    async def _broadcast_event(self, event_type: str, data: Dict):
        """Broadcast event to all registered handlers."""
        for handler in self._event_handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(event_type, data)
                else:
                    handler(event_type, data)
            except Exception as e:
                log(f"Error in event handler: {e}", "ERROR")

    async def _handle_channel_message(self, message: NegotiationMessage):
        """Handle message event from a channel."""
        await self._broadcast_event("message", message.to_dict())

    async def _handle_channel_consensus(self, consensus: Consensus):
        """Handle consensus event from a channel."""
        await self._broadcast_event("consensus", consensus.to_dict())

    async def _handle_channel_escalation(self, message: NegotiationMessage):
        """Handle escalation event from a channel."""
        await self._broadcast_event("escalation", message.to_dict())

    def get_statistics(self) -> Dict:
        """Get negotiation statistics."""
        total = len(self.channels)
        if total == 0:
            return {"total": 0}

        consensus_reached = sum(
            1 for c in self.channels.values()
            if c.status == NegotiationStatus.CONSENSUS_REACHED
        )
        escalated = sum(
            1 for c in self.channels.values()
            if c.status == NegotiationStatus.ESCALATED
        )
        rejected = sum(
            1 for c in self.channels.values()
            if c.status == NegotiationStatus.REJECTED
        )
        active = sum(
            1 for c in self.channels.values()
            if not c.is_concluded
        )

        avg_rounds = sum(c.current_round for c in self.channels.values()) / total
        avg_duration = sum(c.elapsed_seconds for c in self.channels.values()) / total

        return {
            "total": total,
            "active": active,
            "consensus_reached": consensus_reached,
            "escalated": escalated,
            "rejected": rejected,
            "average_rounds": round(avg_rounds, 1),
            "average_duration_seconds": round(avg_duration, 1),
            "consensus_rate": round(consensus_reached / total * 100, 1) if total > 0 else 0
        }

    def to_dict(self) -> Dict:
        """Serialize manager state."""
        return {
            "channels": {k: v.to_dict() for k, v in self.channels.items()},
            "statistics": self.get_statistics()
        }


# ===============================================================================
# GLOBAL MANAGER INSTANCE
# ===============================================================================

_negotiation_manager: Optional[NegotiationManager] = None


def get_negotiation_manager() -> NegotiationManager:
    """Get the global negotiation manager."""
    global _negotiation_manager
    if _negotiation_manager is None:
        _negotiation_manager = NegotiationManager()
    return _negotiation_manager


# ===============================================================================
# CLI
# ===============================================================================

async def demo_negotiation():
    """Run a demo negotiation for testing."""
    log("=" * 60)
    log("P2P NEGOTIATION PROTOCOL DEMO")
    log("=" * 60)

    # Create agents
    ux_agent = create_agent("UX Designer", AgentRole.ARCHITECT, ["ui-design", "user-research"])
    backend_agent = create_agent("Backend Dev", AgentRole.ALCHEMIST, ["api", "database", "performance"])
    pm_agent = create_agent("PM Orchestrator", AgentRole.GOVERNOR, ["decision-making", "coordination"])

    # Create channel
    manager = get_negotiation_manager()
    channel = manager.create_channel(ux_agent, backend_agent, pm_agent)

    print(f"\nChannel created: {channel.thread_id[:8]}")
    print(f"Architect: {ux_agent.name}")
    print(f"Alchemist: {backend_agent.name}")
    print(f"Governor: {pm_agent.name}")

    # Round 1: Architect proposes
    print("\n--- Round 1: Proposal ---")
    proposal = create_architect_proposal(
        description="Real-time updating dashboard with 100 data points refreshing every second",
        ui_components=[
            Component("dashboard", "DashboardView", {"refresh_interval": 1000}),
            Component("chart", "LineChart", {"data_points": 100})
        ],
        research_citations=[
            "Nielsen Norman Group: Dashboard Design Best Practices 2026",
            "Google Material Design 3.0 Guidelines"
        ],
        priority=8,
        estimated_impact=ImpactEstimate(user_value=9.0, development_effort=7.0, maintenance_overhead=5.0)
    )
    await channel.propose(proposal)

    # Round 1: Alchemist bids
    print("\n--- Round 1: Bid ---")
    bid = create_alchemist_bid(
        technical_cost=CostLevel.HIGH,
        latency_impact_ms=500,
        complexity_score=8.0,
        justification="Real-time updates every second with 100 data points will cause significant server load",
        risks=["Database connection pool exhaustion", "Browser memory issues"],
        dependencies=["WebSocket infrastructure", "Redis caching"],
        feasibility_score=0.6,
        estimated_delivery_days=10,
        counter_proposal=create_architect_proposal(
            description="Progressive Disclosure pattern: Show 10 data points initially, expand on demand. "
                       "Update every 5 seconds instead of 1 second.",
            ui_components=[
                Component("dashboard", "DashboardView", {"refresh_interval": 5000}),
                Component("chart", "LazyLineChart", {"initial_points": 10, "max_points": 100})
            ],
            priority=8,
            estimated_impact=ImpactEstimate(user_value=8.5, development_effort=5.0, maintenance_overhead=3.0)
        )
    )
    await channel.bid(bid)

    # Round 2: Architect accepts counter
    print("\n--- Round 2: Accept ---")
    consensus = await channel.accept()

    # Print results
    print("\n" + "=" * 60)
    print("NEGOTIATION COMPLETE")
    print("=" * 60)
    print(channel.get_transcript_summary())
    print("\n--- Statistics ---")
    print(json.dumps(manager.get_statistics(), indent=2))


def main():
    """CLI entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="P2P Negotiation Protocol")
    parser.add_argument("--demo", action="store_true", help="Run demo negotiation")
    parser.add_argument("--stats", action="store_true", help="Show negotiation statistics")
    args = parser.parse_args()

    if args.demo:
        asyncio.run(demo_negotiation())
    elif args.stats:
        manager = get_negotiation_manager()
        print(json.dumps(manager.get_statistics(), indent=2))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
