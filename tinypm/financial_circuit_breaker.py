#!/usr/bin/env python3
"""
TinyPM Financial Circuit Breaker - Phase 2: Sovereign Seed
===========================================================================

DETERMINISTIC GATE that prevents high-impact actions without human approval.

The Circuit Breaker calculates the monetary impact of any proposed action and
KILLS auto-execute capability when impact exceeds thresholds:

Thresholds:
- < $500: Auto-execute allowed
- $500 - $2,000: One-click approval
- $2,000 - $5,000: Pre-prepare (user reviews before execution)
- > $5,000: INFORM level only, human always required

CRITICAL: This is a KILL SWITCH, not a suggestion system. When the circuit
breaker trips, auto-execute is disabled DETERMINISTICALLY.

Integration:
- Works with anticipatory_engine.py to wrap actions
- Provides /api/impact/* endpoints via web_server.py
- Full audit trail for forensic dashboard

Created: 2026-02-04
Author: PM_Architect Claude
Part of: Project "Sovereign Seed" Phase 2
"""

from __future__ import annotations

import json
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

# ===========================================================================
# CONFIGURATION
# ===========================================================================

APP_DIR = Path(__file__).parent
ASSESSMENTS_FILE = APP_DIR / ".circuit_breaker_assessments.json"
AUDIT_LOG_FILE = APP_DIR / ".circuit_breaker_audit.json"
CONFIG_FILE = APP_DIR / ".circuit_breaker_config.json"

# Default thresholds (in dollars) - configurable per user
DEFAULT_THRESHOLDS = {
    'auto_execute': Decimal("500"),    # Below this: auto-execute OK
    'one_click': Decimal("2000"),      # Below this: one-click OK
    'pre_prepare': Decimal("5000"),    # Below this: pre-prepare OK
    'human_required': Decimal("5000")  # Above this: human always required
}

# Trust level hierarchy (lowest to highest autonomy)
TRUST_HIERARCHY = ['inform', 'suggest', 'pre_prepare', 'one_click', 'auto_execute']


# ===========================================================================
# ENUMS
# ===========================================================================

class ImpactCategory(str, Enum):
    """Categories of financial impact."""
    DIRECT_COST = "direct_cost"        # Immediate money out
    REVENUE_RISK = "revenue_risk"      # Potential lost revenue
    PENALTY_RISK = "penalty_risk"      # Contractual penalties
    OPPORTUNITY_COST = "opportunity"   # Missed opportunities
    REPUTATION = "reputation"          # Brand/relationship damage (monetized)
    RESOURCE_COST = "resource_cost"    # Time/labor converted to dollars
    COMMITMENT = "commitment"          # Future obligations


class ActionType(str, Enum):
    """Types of actions that can be assessed."""
    SEND_EMAIL = "send_email"
    CREATE_TASK = "create_task"
    RESCHEDULE_TASK = "reschedule_task"
    APPROVE_EXPENSE = "approve_expense"
    COMMIT_RESOURCE = "commit_resource"
    MODIFY_CONTRACT = "modify_contract"
    CANCEL_ORDER = "cancel_order"
    MAKE_PROMISE = "make_promise"
    BOOK_CALENDAR = "book_calendar"
    SEND_SMS = "send_sms"
    PLACE_ORDER = "place_order"
    ASSIGN_WORK = "assign_work"


class CircuitBreakerState(str, Enum):
    """State of the circuit breaker."""
    CLOSED = "closed"       # Normal operation
    OPEN = "open"           # Tripped - blocking high-impact actions
    HALF_OPEN = "half_open" # Testing if safe to resume


# ===========================================================================
# DATA CLASSES
# ===========================================================================

@dataclass
class ImpactAssessment:
    """
    Result of financial impact calculation.

    This is the core output of the circuit breaker - a complete assessment
    of the financial risk of a proposed action.
    """
    assessment_id: str
    action_id: str
    action_type: ActionType
    total_impact: Decimal
    breakdown: Dict[ImpactCategory, Decimal]
    confidence: float  # 0.0 - 1.0 confidence in assessment
    reasoning: List[str]  # Human-readable explanation
    assessed_at: datetime

    # Circuit breaker decision (DETERMINISTIC)
    auto_execute_allowed: bool
    max_trust_level: str  # 'auto_execute', 'one_click', 'pre_prepare', 'suggest', 'inform'
    human_required: bool

    # Metadata
    context_hash: str  # Hash of input context for audit
    version: str = "1.0"

    def to_dict(self) -> Dict:
        return {
            'assessment_id': self.assessment_id,
            'action_id': self.action_id,
            'action_type': self.action_type.value if isinstance(self.action_type, ActionType) else self.action_type,
            'total_impact': str(self.total_impact),
            'breakdown': {k.value if isinstance(k, ImpactCategory) else k: str(v)
                          for k, v in self.breakdown.items()},
            'confidence': self.confidence,
            'reasoning': self.reasoning,
            'assessed_at': self.assessed_at.isoformat(),
            'auto_execute_allowed': self.auto_execute_allowed,
            'max_trust_level': self.max_trust_level,
            'human_required': self.human_required,
            'context_hash': self.context_hash,
            'version': self.version
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'ImpactAssessment':
        return cls(
            assessment_id=data['assessment_id'],
            action_id=data['action_id'],
            action_type=ActionType(data['action_type']) if data['action_type'] in [e.value for e in ActionType] else data['action_type'],
            total_impact=Decimal(data['total_impact']),
            breakdown={ImpactCategory(k) if k in [e.value for e in ImpactCategory] else k: Decimal(v)
                       for k, v in data.get('breakdown', {}).items()},
            confidence=data.get('confidence', 0.5),
            reasoning=data.get('reasoning', []),
            assessed_at=datetime.fromisoformat(data['assessed_at']),
            auto_execute_allowed=data['auto_execute_allowed'],
            max_trust_level=data['max_trust_level'],
            human_required=data['human_required'],
            context_hash=data.get('context_hash', ''),
            version=data.get('version', '1.0')
        )


@dataclass
class ImpactRule:
    """Rule for calculating impact of specific action types."""
    action_type: ActionType
    category: ImpactCategory
    calculator_name: str  # Name of calculation function
    weight: float = 1.0   # Multiplier for this impact type
    enabled: bool = True
    description: str = ""


@dataclass
class AuditEntry:
    """Audit log entry for circuit breaker decisions."""
    entry_id: str
    timestamp: datetime
    action_type: str
    action_id: str
    assessment_id: str
    total_impact: str
    decision: str  # 'allowed', 'blocked', 'downgraded'
    original_trust: str
    final_trust: str
    context_summary: str

    def to_dict(self) -> Dict:
        return {
            'entry_id': self.entry_id,
            'timestamp': self.timestamp.isoformat(),
            'action_type': self.action_type,
            'action_id': self.action_id,
            'assessment_id': self.assessment_id,
            'total_impact': self.total_impact,
            'decision': self.decision,
            'original_trust': self.original_trust,
            'final_trust': self.final_trust,
            'context_summary': self.context_summary
        }


# ===========================================================================
# DATA PERSISTENCE
# ===========================================================================

def load_assessments() -> List[ImpactAssessment]:
    """Load recent assessments from disk."""
    if ASSESSMENTS_FILE.exists():
        try:
            data = json.loads(ASSESSMENTS_FILE.read_text())
            return [ImpactAssessment.from_dict(a) for a in data.get('assessments', [])]
        except Exception as e:
            print(f"[CircuitBreaker] Error loading assessments: {e}")
    return []


def save_assessments(assessments: List[ImpactAssessment]) -> None:
    """Save assessments to disk (keep last 1000)."""
    try:
        # Keep only recent assessments
        recent = assessments[-1000:] if len(assessments) > 1000 else assessments
        data = {
            'updated_at': datetime.now().isoformat(),
            'count': len(recent),
            'assessments': [a.to_dict() for a in recent]
        }
        ASSESSMENTS_FILE.write_text(json.dumps(data, indent=2))
    except Exception as e:
        print(f"[CircuitBreaker] Error saving assessments: {e}")


def append_audit_log(entry: AuditEntry) -> None:
    """Append to the audit log."""
    try:
        if AUDIT_LOG_FILE.exists():
            data = json.loads(AUDIT_LOG_FILE.read_text())
        else:
            data = {'entries': []}

        data['entries'].append(entry.to_dict())
        # Keep last 5000 entries
        data['entries'] = data['entries'][-5000:]
        data['updated_at'] = datetime.now().isoformat()

        AUDIT_LOG_FILE.write_text(json.dumps(data, indent=2))
    except Exception as e:
        print(f"[CircuitBreaker] Error appending to audit log: {e}")


def load_config() -> Dict:
    """Load circuit breaker configuration."""
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text())
        except Exception:
            pass
    return {
        'thresholds': {k: str(v) for k, v in DEFAULT_THRESHOLDS.items()},
        'enabled': True,
        'strict_mode': False  # If True, always require human for unknowns
    }


def save_config(config: Dict) -> None:
    """Save circuit breaker configuration."""
    config['updated_at'] = datetime.now().isoformat()
    CONFIG_FILE.write_text(json.dumps(config, indent=2))


# ===========================================================================
# IMPACT CALCULATORS
# ===========================================================================

class ImpactCalculators:
    """
    Library of DETERMINISTIC impact calculation functions.

    Each calculator takes a context dict and returns a Decimal dollar amount.
    These are pure functions with no side effects.
    """

    @staticmethod
    def calc_email_commitment_cost(context: Dict) -> Decimal:
        """
        Calculate cost of commitments in an email.

        Scans email content for:
        - Price mentions ("I'll do it for $X")
        - Quantity commitments ("I'll send 10 units")
        - Discount offers
        - Time commitments with monetary implications
        """
        body = context.get('body', '') or context.get('email_body', '') or ''
        subject = context.get('subject', '') or ''
        combined = f"{subject} {body}".lower()

        total = Decimal("0")

        # Pattern 1: Explicit dollar amounts
        # Matches: $1,000, $500.00, $1000, $50
        dollar_patterns = [
            r'\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)',  # $1,234.56
            r'\$\s*(\d+(?:\.\d{2})?)',                   # $1234.56
            r'(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*dollars',  # 1,234 dollars
        ]

        for pattern in dollar_patterns:
            matches = re.findall(pattern, combined)
            for match in matches:
                try:
                    amount = Decimal(match.replace(',', ''))
                    total += amount
                except InvalidOperation:
                    pass

        # Pattern 2: Commitment language multiplier
        commitment_phrases = [
            'i will', "i'll", 'we will', "we'll", 'i promise',
            'i commit', 'guaranteed', 'definitely'
        ]
        has_commitment = any(phrase in combined for phrase in commitment_phrases)

        if has_commitment and total > 0:
            # Increase confidence weight when commitment language is present
            total *= Decimal("1.2")

        # Pattern 3: Discount offers (potential revenue loss)
        discount_pattern = r'(\d+)\s*%\s*(?:off|discount)'
        discount_matches = re.findall(discount_pattern, combined)
        if discount_matches:
            # Assume average order value of $200 for discount calculation
            avg_order = Decimal("200")
            for discount in discount_matches:
                try:
                    pct = Decimal(discount) / Decimal("100")
                    total += avg_order * pct
                except InvalidOperation:
                    pass

        return total

    @staticmethod
    def calc_email_reputation_risk(context: Dict) -> Decimal:
        """
        Calculate reputation risk from email content.

        High-stakes email types:
        - Complaints
        - Negotiations
        - Formal communications
        - Customer escalations
        """
        body = context.get('body', '') or context.get('email_body', '') or ''
        recipient = context.get('to', '') or context.get('recipient', '') or ''
        subject = context.get('subject', '') or ''
        combined = f"{subject} {body}".lower()

        risk = Decimal("0")

        # VIP recipients
        vip_domains = ['gov', 'edu', 'org']
        vip_patterns = ['ceo', 'president', 'director', 'manager', 'chef']

        is_vip = any(domain in recipient.lower() for domain in vip_domains)
        is_vip = is_vip or any(pattern in recipient.lower() or pattern in combined
                               for pattern in vip_patterns)

        if is_vip:
            risk += Decimal("100")

        # High-stakes content
        high_stakes_phrases = [
            'complaint', 'disappointed', 'unhappy', 'refund', 'cancel',
            'legal', 'attorney', 'lawsuit', 'contract', 'agreement',
            'final', 'last chance', 'urgent'
        ]

        for phrase in high_stakes_phrases:
            if phrase in combined:
                risk += Decimal("50")

        # Customer value multiplier
        customer_value = context.get('customer_lifetime_value', 0)
        if customer_value:
            try:
                clv = Decimal(str(customer_value))
                # Risk is proportional to customer value
                risk += clv * Decimal("0.05")  # 5% of CLV
            except InvalidOperation:
                pass

        return min(risk, Decimal("1000"))  # Cap at $1000

    @staticmethod
    def calc_deadline_penalty(context: Dict) -> Decimal:
        """
        Calculate penalty risk from missing a deadline.

        Uses:
        - Contract terms (if known)
        - Days of delay
        - Order/customer value
        """
        penalty = Decimal("0")

        # Explicit penalty rate
        penalty_rate = context.get('penalty_rate', 0)
        if penalty_rate:
            try:
                penalty = Decimal(str(penalty_rate))
            except InvalidOperation:
                pass

        # Parse penalty from text
        penalty_text = context.get('contract_penalty', '') or ''
        if penalty_text:
            # Match patterns like "$500/day" or "$100 per day"
            rate_patterns = [
                r'\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*/?\s*day',
                r'\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*per\s*day',
            ]
            for pattern in rate_patterns:
                match = re.search(pattern, penalty_text.lower())
                if match:
                    try:
                        daily_rate = Decimal(match.group(1).replace(',', ''))
                        # Calculate days late
                        original_due = context.get('original_due')
                        new_due = context.get('new_due')
                        if original_due and new_due:
                            try:
                                orig = datetime.fromisoformat(str(original_due).replace('Z', '+00:00'))
                                new = datetime.fromisoformat(str(new_due).replace('Z', '+00:00'))
                                days_late = (new - orig).days
                                if days_late > 0:
                                    penalty = daily_rate * Decimal(str(days_late))
                            except (ValueError, TypeError):
                                # Default to 5 days if can't parse
                                penalty = daily_rate * Decimal("5")
                    except InvalidOperation:
                        pass

        return penalty

    @staticmethod
    def calc_revenue_delay_risk(context: Dict) -> Decimal:
        """
        Calculate revenue at risk from delays.

        Uses:
        - Order value
        - Customer retention probability
        - Seasonal factors
        """
        risk = Decimal("0")

        # Order value at risk
        order_value = context.get('order_value', 0) or context.get('value', 0)
        if order_value:
            try:
                value = Decimal(str(order_value))
                # 30% risk of losing order on significant delay
                risk += value * Decimal("0.30")
            except InvalidOperation:
                pass

        # Customer churn risk
        customer_value = context.get('customer_value', 0) or context.get('customer_lifetime_value', 0)
        if customer_value:
            try:
                clv = Decimal(str(customer_value))
                # 10% churn risk on delay
                risk += clv * Decimal("0.10")
            except InvalidOperation:
                pass

        # Seasonal urgency (farm context)
        if context.get('is_seasonal', False) or context.get('seasonal', False):
            risk *= Decimal("1.5")  # 50% increase for seasonal items

        return risk

    @staticmethod
    def calc_expense_amount(context: Dict) -> Decimal:
        """Direct expense calculation."""
        amount = context.get('amount', 0) or context.get('expense_amount', 0)
        try:
            return Decimal(str(amount))
        except (InvalidOperation, TypeError):
            return Decimal("0")

    @staticmethod
    def calc_resource_commitment(context: Dict) -> Decimal:
        """
        Calculate resource commitment cost.

        Converts time/labor into dollar amounts.
        """
        cost = Decimal("0")

        # Hours committed
        hours = context.get('hours', 0) or context.get('estimated_hours', 0)
        hourly_rate = Decimal(str(context.get('hourly_rate', 25)))  # Default $25/hr

        if hours:
            try:
                cost += Decimal(str(hours)) * hourly_rate
            except InvalidOperation:
                pass

        # Materials/supplies
        materials = context.get('materials_cost', 0) or context.get('supplies', 0)
        if materials:
            try:
                cost += Decimal(str(materials))
            except InvalidOperation:
                pass

        return cost

    @staticmethod
    def calc_cancellation_cost(context: Dict) -> Decimal:
        """Calculate cost of cancellation."""
        cost = Decimal("0")

        # Cancellation fee
        fee = context.get('cancellation_fee', 0)
        if fee:
            try:
                cost += Decimal(str(fee))
            except InvalidOperation:
                pass

        # Restocking fee (percentage)
        order_value = context.get('order_value', 0)
        restock_pct = context.get('restocking_pct', 15)  # Default 15%
        if order_value:
            try:
                cost += Decimal(str(order_value)) * Decimal(str(restock_pct)) / Decimal("100")
            except InvalidOperation:
                pass

        # Lost deposit
        deposit = context.get('deposit', 0) or context.get('deposit_amount', 0)
        if deposit:
            try:
                cost += Decimal(str(deposit))
            except InvalidOperation:
                pass

        return cost

    @staticmethod
    def calc_promise_value(context: Dict) -> Decimal:
        """
        Calculate value of a promise being made.

        Promises create future obligations.
        """
        value = Decimal("0")

        # Explicit promise value
        promise_value = context.get('promise_value', 0)
        if promise_value:
            try:
                value += Decimal(str(promise_value))
            except InvalidOperation:
                pass

        # Quantity promised
        quantity = context.get('quantity', 0)
        unit_price = context.get('unit_price', 0) or context.get('price_per_unit', 10)
        if quantity and unit_price:
            try:
                value += Decimal(str(quantity)) * Decimal(str(unit_price))
            except InvalidOperation:
                pass

        # Time commitment converted to cost
        days_committed = context.get('days', 0) or context.get('days_committed', 0)
        daily_cost = Decimal(str(context.get('daily_rate', 200)))  # Default $200/day
        if days_committed:
            try:
                value += Decimal(str(days_committed)) * daily_cost
            except InvalidOperation:
                pass

        return value


# ===========================================================================
# FINANCIAL CIRCUIT BREAKER
# ===========================================================================

class FinancialCircuitBreaker:
    """
    Calculates financial impact and gates actions accordingly.

    This is the DETERMINISTIC KILL SWITCH for high-impact actions.
    When it trips, auto-execute is disabled. No exceptions.
    """

    def __init__(self, user_id: str = "default"):
        self.user_id = user_id
        self.assessments: List[ImpactAssessment] = []
        self.state = CircuitBreakerState.CLOSED

        # Load configuration
        config = load_config()
        self.enabled = config.get('enabled', True)
        self.strict_mode = config.get('strict_mode', False)

        # Set thresholds from config
        thresholds = config.get('thresholds', {})
        self.threshold_auto_execute = Decimal(thresholds.get('auto_execute', str(DEFAULT_THRESHOLDS['auto_execute'])))
        self.threshold_one_click = Decimal(thresholds.get('one_click', str(DEFAULT_THRESHOLDS['one_click'])))
        self.threshold_human_required = Decimal(thresholds.get('human_required', str(DEFAULT_THRESHOLDS['human_required'])))

        # Initialize rules
        self.rules = self._build_default_rules()

        # Calculator registry
        self.calculators = {
            'calc_email_commitment_cost': ImpactCalculators.calc_email_commitment_cost,
            'calc_email_reputation_risk': ImpactCalculators.calc_email_reputation_risk,
            'calc_deadline_penalty': ImpactCalculators.calc_deadline_penalty,
            'calc_revenue_delay_risk': ImpactCalculators.calc_revenue_delay_risk,
            'calc_expense_amount': ImpactCalculators.calc_expense_amount,
            'calc_resource_commitment': ImpactCalculators.calc_resource_commitment,
            'calc_cancellation_cost': ImpactCalculators.calc_cancellation_cost,
            'calc_promise_value': ImpactCalculators.calc_promise_value,
        }

        # Load recent assessments for reference
        self.assessments = load_assessments()

    def _build_default_rules(self) -> Dict[ActionType, List[ImpactRule]]:
        """Define default impact calculation rules for each action type."""
        return {
            ActionType.SEND_EMAIL: [
                ImpactRule(ActionType.SEND_EMAIL, ImpactCategory.COMMITMENT,
                          'calc_email_commitment_cost', 1.0, True,
                          "Monetary commitments made in email"),
                ImpactRule(ActionType.SEND_EMAIL, ImpactCategory.REPUTATION,
                          'calc_email_reputation_risk', 1.0, True,
                          "Reputation risk from email content"),
            ],
            ActionType.RESCHEDULE_TASK: [
                ImpactRule(ActionType.RESCHEDULE_TASK, ImpactCategory.PENALTY_RISK,
                          'calc_deadline_penalty', 1.5, True,
                          "Contractual penalty for late delivery"),
                ImpactRule(ActionType.RESCHEDULE_TASK, ImpactCategory.REVENUE_RISK,
                          'calc_revenue_delay_risk', 1.0, True,
                          "Revenue at risk from delay"),
            ],
            ActionType.APPROVE_EXPENSE: [
                ImpactRule(ActionType.APPROVE_EXPENSE, ImpactCategory.DIRECT_COST,
                          'calc_expense_amount', 1.0, True,
                          "Direct expense amount"),
            ],
            ActionType.COMMIT_RESOURCE: [
                ImpactRule(ActionType.COMMIT_RESOURCE, ImpactCategory.RESOURCE_COST,
                          'calc_resource_commitment', 1.0, True,
                          "Labor and material costs"),
            ],
            ActionType.CANCEL_ORDER: [
                ImpactRule(ActionType.CANCEL_ORDER, ImpactCategory.DIRECT_COST,
                          'calc_cancellation_cost', 1.0, True,
                          "Cancellation fees and lost deposits"),
                ImpactRule(ActionType.CANCEL_ORDER, ImpactCategory.REPUTATION,
                          'calc_email_reputation_risk', 0.5, True,
                          "Reputation impact of cancellation"),
            ],
            ActionType.MAKE_PROMISE: [
                ImpactRule(ActionType.MAKE_PROMISE, ImpactCategory.COMMITMENT,
                          'calc_promise_value', 1.0, True,
                          "Value of promise being made"),
            ],
            ActionType.CREATE_TASK: [
                ImpactRule(ActionType.CREATE_TASK, ImpactCategory.RESOURCE_COST,
                          'calc_resource_commitment', 0.5, True,
                          "Estimated resource cost"),
            ],
            ActionType.PLACE_ORDER: [
                ImpactRule(ActionType.PLACE_ORDER, ImpactCategory.DIRECT_COST,
                          'calc_expense_amount', 1.0, True,
                          "Order total"),
            ],
            ActionType.ASSIGN_WORK: [
                ImpactRule(ActionType.ASSIGN_WORK, ImpactCategory.RESOURCE_COST,
                          'calc_resource_commitment', 1.0, True,
                          "Labor cost of assignment"),
            ],
        }

    def _compute_context_hash(self, context: Dict) -> str:
        """Compute a hash of the context for audit purposes."""
        import hashlib
        context_str = json.dumps(context, sort_keys=True, default=str)
        return hashlib.sha256(context_str.encode()).hexdigest()[:16]

    def assess_impact(self, action_type: ActionType | str,
                      context: dict) -> ImpactAssessment:
        """
        Calculate the financial impact of a proposed action.

        This is the CORE function of the circuit breaker.

        Args:
            action_type: Type of action being assessed
            context: Dictionary containing:
                - action_details: What specifically is being done
                - affected_entities: Tasks, contracts, customers affected
                - timing: When the action would occur
                - reversibility: Can it be undone?
                - Any type-specific fields (amount, recipient, etc.)

        Returns:
            ImpactAssessment with total impact and trust level decision
        """
        # Normalize action type
        if isinstance(action_type, str):
            try:
                action_type = ActionType(action_type)
            except ValueError:
                action_type = ActionType.CREATE_TASK  # Default to low-risk

        # Initialize assessment
        assessment_id = str(uuid.uuid4())
        action_id = context.get('action_id', str(uuid.uuid4()))
        breakdown: Dict[ImpactCategory, Decimal] = {}
        reasoning: List[str] = []
        confidence = 0.8  # Default confidence

        # Get rules for this action type
        rules = self.rules.get(action_type, [])

        # Calculate impact for each rule
        for rule in rules:
            if not rule.enabled:
                continue

            calculator = self.calculators.get(rule.calculator_name)
            if not calculator:
                reasoning.append(f"Warning: Calculator {rule.calculator_name} not found")
                continue

            try:
                impact = calculator(context)
                weighted_impact = impact * Decimal(str(rule.weight))

                # Accumulate by category
                if rule.category in breakdown:
                    breakdown[rule.category] += weighted_impact
                else:
                    breakdown[rule.category] = weighted_impact

                if weighted_impact > 0:
                    reasoning.append(f"{rule.description}: ${weighted_impact:.2f}")

            except Exception as e:
                reasoning.append(f"Calculator error ({rule.calculator_name}): {str(e)}")
                confidence *= 0.9  # Reduce confidence on errors

        # Calculate total impact
        total_impact = sum(breakdown.values())

        # Apply uncertainty multiplier if low confidence
        if confidence < 0.6:
            total_impact *= Decimal("1.5")  # Conservative estimate
            reasoning.append("Low confidence - applied 1.5x safety multiplier")

        # Determine trust level (DETERMINISTIC)
        max_trust_level = self._determine_trust_level(total_impact)
        human_required = total_impact >= self.threshold_human_required
        auto_execute_allowed = total_impact < self.threshold_auto_execute

        # Create assessment
        assessment = ImpactAssessment(
            assessment_id=assessment_id,
            action_id=action_id,
            action_type=action_type,
            total_impact=total_impact,
            breakdown=breakdown,
            confidence=confidence,
            reasoning=reasoning if reasoning else ["No significant financial impact detected"],
            assessed_at=datetime.now(),
            auto_execute_allowed=auto_execute_allowed,
            max_trust_level=max_trust_level,
            human_required=human_required,
            context_hash=self._compute_context_hash(context)
        )

        # Store assessment
        self.assessments.append(assessment)
        save_assessments(self.assessments)

        return assessment

    def _determine_trust_level(self, impact: Decimal) -> str:
        """
        Determine maximum trust level based on impact.

        THIS IS DETERMINISTIC. No fuzzy logic.

        Impact < $500: 'auto_execute'
        Impact $500-$2000: 'one_click'
        Impact $2000-$5000: 'pre_prepare'
        Impact > $5000: 'inform' (human required)
        """
        if impact < self.threshold_auto_execute:
            return 'auto_execute'
        elif impact < self.threshold_one_click:
            return 'one_click'
        elif impact < self.threshold_human_required:
            return 'pre_prepare'
        else:
            return 'inform'

    def gate_action(self, action_type: ActionType | str,
                    context: dict,
                    requested_trust_level: str) -> Tuple[bool, ImpactAssessment]:
        """
        Gate an action through the circuit breaker.

        This is the KILL SWITCH. If impact exceeds threshold for requested
        trust level, the action is BLOCKED.

        Args:
            action_type: Type of action
            context: Action context
            requested_trust_level: Trust level being requested

        Returns:
            (allowed, assessment)
            - allowed: Whether the action can proceed at requested trust level
            - assessment: Full impact assessment
        """
        if not self.enabled:
            # Circuit breaker disabled - allow everything but still assess
            assessment = self.assess_impact(action_type, context)
            self._audit_decision(assessment, requested_trust_level, 'allowed',
                               "Circuit breaker disabled")
            return (True, assessment)

        # Perform assessment
        assessment = self.assess_impact(action_type, context)

        # Check if requested trust level is allowed
        max_index = TRUST_HIERARCHY.index(assessment.max_trust_level)
        requested_index = TRUST_HIERARCHY.index(requested_trust_level)

        allowed = requested_index <= max_index

        # Audit the decision
        if allowed:
            decision = 'allowed'
            summary = f"Impact ${assessment.total_impact:.2f} allows {requested_trust_level}"
        else:
            decision = 'blocked'
            summary = f"Impact ${assessment.total_impact:.2f} blocks {requested_trust_level}, max is {assessment.max_trust_level}"

        self._audit_decision(assessment, requested_trust_level, decision, summary)

        return (allowed, assessment)

    def wrap_action(self, action: Dict) -> Dict:
        """
        Wrap an action with circuit breaker assessment.

        This is the integration point with anticipatory_engine.py.
        May downgrade trust level or add human_required flag.

        Args:
            action: Action dict with at minimum:
                - action_type: Type of action
                - trust_level: Current trust level
                - context: Action context

        Returns:
            Modified action dict with circuit breaker decision
        """
        action_type = action.get('action_type', 'create_task')
        trust_level = action.get('trust_level', 'suggest')
        context = action.get('context', action.get('payload', {}))

        # Assess impact
        assessment = self.assess_impact(action_type, context)

        # Apply circuit breaker decision
        original_trust = trust_level

        if assessment.human_required:
            action['trust_level'] = 'inform'
            action['requires_human'] = True
            action['circuit_breaker_note'] = f"Impact ${assessment.total_impact:.2f} requires human approval"
            action['circuit_breaker_assessment'] = assessment.to_dict()
            self._audit_decision(assessment, original_trust, 'blocked',
                               f"Human required for ${assessment.total_impact:.2f} impact")
        elif assessment.max_trust_level != trust_level:
            # Check if we need to downgrade
            max_idx = TRUST_HIERARCHY.index(assessment.max_trust_level)
            current_idx = TRUST_HIERARCHY.index(trust_level)

            if current_idx > max_idx:
                action['trust_level'] = assessment.max_trust_level
                action['circuit_breaker_note'] = (
                    f"Downgraded from {original_trust} to {assessment.max_trust_level} "
                    f"due to ${assessment.total_impact:.2f} impact"
                )
                action['circuit_breaker_assessment'] = assessment.to_dict()
                self._audit_decision(assessment, original_trust, 'downgraded',
                                   f"Trust downgraded to {assessment.max_trust_level}")
            else:
                action['circuit_breaker_assessment'] = assessment.to_dict()
                self._audit_decision(assessment, original_trust, 'allowed',
                                   f"Impact ${assessment.total_impact:.2f} within limits")
        else:
            action['circuit_breaker_assessment'] = assessment.to_dict()
            self._audit_decision(assessment, original_trust, 'allowed',
                               f"Impact ${assessment.total_impact:.2f} within limits")

        return action

    def _audit_decision(self, assessment: ImpactAssessment,
                        requested_trust: str, decision: str, summary: str) -> None:
        """Record decision to audit log."""
        entry = AuditEntry(
            entry_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            action_type=assessment.action_type.value if isinstance(assessment.action_type, ActionType) else str(assessment.action_type),
            action_id=assessment.action_id,
            assessment_id=assessment.assessment_id,
            total_impact=str(assessment.total_impact),
            decision=decision,
            original_trust=requested_trust,
            final_trust=assessment.max_trust_level,
            context_summary=summary
        )
        append_audit_log(entry)

    def get_stats(self) -> Dict:
        """Get circuit breaker statistics for dashboard."""
        recent_assessments = self.assessments[-100:]  # Last 100

        if not recent_assessments:
            return {
                'total_assessments': 0,
                'avg_impact': '0.00',
                'blocked_count': 0,
                'downgraded_count': 0,
                'auto_executed_count': 0,
                'state': self.state.value,
                'thresholds': {
                    'auto_execute': str(self.threshold_auto_execute),
                    'one_click': str(self.threshold_one_click),
                    'human_required': str(self.threshold_human_required)
                }
            }

        # Calculate statistics
        total_impact = sum(a.total_impact for a in recent_assessments)
        avg_impact = total_impact / len(recent_assessments)

        blocked = sum(1 for a in recent_assessments if a.human_required)
        auto_exec = sum(1 for a in recent_assessments if a.auto_execute_allowed)
        downgraded = sum(1 for a in recent_assessments
                        if not a.auto_execute_allowed and not a.human_required)

        # Impact distribution
        distribution = {
            'low': sum(1 for a in recent_assessments if a.total_impact < self.threshold_auto_execute),
            'medium': sum(1 for a in recent_assessments
                         if self.threshold_auto_execute <= a.total_impact < self.threshold_one_click),
            'high': sum(1 for a in recent_assessments
                       if self.threshold_one_click <= a.total_impact < self.threshold_human_required),
            'critical': sum(1 for a in recent_assessments
                          if a.total_impact >= self.threshold_human_required)
        }

        # By action type
        by_type: Dict[str, int] = {}
        for a in recent_assessments:
            type_str = a.action_type.value if isinstance(a.action_type, ActionType) else str(a.action_type)
            by_type[type_str] = by_type.get(type_str, 0) + 1

        return {
            'total_assessments': len(recent_assessments),
            'avg_impact': f"{avg_impact:.2f}",
            'blocked_count': blocked,
            'downgraded_count': downgraded,
            'auto_executed_count': auto_exec,
            'state': self.state.value,
            'distribution': distribution,
            'by_action_type': by_type,
            'thresholds': {
                'auto_execute': str(self.threshold_auto_execute),
                'one_click': str(self.threshold_one_click),
                'human_required': str(self.threshold_human_required)
            }
        }

    def get_recent_assessments(self, limit: int = 20) -> List[Dict]:
        """Get recent assessments for UI."""
        recent = self.assessments[-limit:]
        return [a.to_dict() for a in reversed(recent)]

    def update_thresholds(self, thresholds: Dict[str, str]) -> None:
        """Update threshold configuration."""
        if 'auto_execute' in thresholds:
            self.threshold_auto_execute = Decimal(thresholds['auto_execute'])
        if 'one_click' in thresholds:
            self.threshold_one_click = Decimal(thresholds['one_click'])
        if 'human_required' in thresholds:
            self.threshold_human_required = Decimal(thresholds['human_required'])

        # Save to config
        config = load_config()
        config['thresholds'] = {
            'auto_execute': str(self.threshold_auto_execute),
            'one_click': str(self.threshold_one_click),
            'human_required': str(self.threshold_human_required)
        }
        save_config(config)


# ===========================================================================
# CIRCUIT BREAKER INTEGRATION
# ===========================================================================

class CircuitBreakerIntegration:
    """
    Integrates circuit breaker with anticipatory_engine.py

    This class provides the bridge between the circuit breaker and
    the anticipatory action system.
    """

    def __init__(self, circuit_breaker: FinancialCircuitBreaker,
                 anticipatory_engine: Optional[Any] = None):
        self.breaker = circuit_breaker
        self.engine = anticipatory_engine

    def wrap_anticipated_action(self, action: Dict) -> Dict:
        """
        Wrap an anticipated action with circuit breaker check.

        This is called before any anticipated action is executed.
        """
        return self.breaker.wrap_action(action)

    def assess_before_execution(self, action_type: str, context: Dict,
                                 requested_trust: str = 'auto_execute') -> Tuple[bool, ImpactAssessment]:
        """
        Assess an action before execution.

        Returns (can_proceed, assessment)
        """
        return self.breaker.gate_action(action_type, context, requested_trust)


# ===========================================================================
# GLOBAL INSTANCE
# ===========================================================================

_circuit_breaker: Optional[FinancialCircuitBreaker] = None


def get_circuit_breaker(user_id: str = "default") -> FinancialCircuitBreaker:
    """Get or create the FinancialCircuitBreaker instance."""
    global _circuit_breaker
    if _circuit_breaker is None or _circuit_breaker.user_id != user_id:
        _circuit_breaker = FinancialCircuitBreaker(user_id)
    return _circuit_breaker


def assess_impact(action_type: str, context: Dict) -> ImpactAssessment:
    """Convenience function to assess impact."""
    return get_circuit_breaker().assess_impact(action_type, context)


def gate_action(action_type: str, context: Dict,
                requested_trust: str = 'auto_execute') -> Tuple[bool, ImpactAssessment]:
    """Convenience function to gate an action."""
    return get_circuit_breaker().gate_action(action_type, context, requested_trust)


# ===========================================================================
# CLI INTERFACE
# ===========================================================================

def main():
    """CLI interface for Financial Circuit Breaker."""
    import argparse

    parser = argparse.ArgumentParser(description="TinyPM Financial Circuit Breaker")
    parser.add_argument("command", nargs="?", default="status",
                       choices=["status", "test", "stats", "audit", "config"],
                       help="Command to run")
    parser.add_argument("--action", type=str, help="Action type for test")
    parser.add_argument("--amount", type=float, help="Amount for test")

    args = parser.parse_args()
    breaker = get_circuit_breaker()

    if args.command == "status":
        print("\n" + "=" * 60)
        print("Financial Circuit Breaker - Status")
        print("=" * 60)
        print(f"State: {breaker.state.value}")
        print(f"Enabled: {breaker.enabled}")
        print(f"\nThresholds:")
        print(f"  Auto-execute: < ${breaker.threshold_auto_execute}")
        print(f"  One-click: < ${breaker.threshold_one_click}")
        print(f"  Human required: >= ${breaker.threshold_human_required}")
        print(f"\nRecent assessments: {len(breaker.assessments)}")

    elif args.command == "test":
        action_type = args.action or "send_email"
        amount = args.amount or 1000

        print(f"\nTesting {action_type} with amount ${amount}...")

        context = {
            'amount': amount,
            'body': f"I'll do it for ${amount}",
            'subject': 'Quote'
        }

        allowed, assessment = breaker.gate_action(action_type, context, 'auto_execute')

        print(f"\nAssessment:")
        print(f"  Total impact: ${assessment.total_impact:.2f}")
        print(f"  Max trust level: {assessment.max_trust_level}")
        print(f"  Auto-execute allowed: {assessment.auto_execute_allowed}")
        print(f"  Human required: {assessment.human_required}")
        print(f"\nReasoning:")
        for r in assessment.reasoning:
            print(f"  - {r}")
        print(f"\nGate result: {'ALLOWED' if allowed else 'BLOCKED'}")

    elif args.command == "stats":
        stats = breaker.get_stats()
        print("\n" + "=" * 60)
        print("Circuit Breaker Statistics")
        print("=" * 60)
        print(json.dumps(stats, indent=2))

    elif args.command == "audit":
        if AUDIT_LOG_FILE.exists():
            data = json.loads(AUDIT_LOG_FILE.read_text())
            entries = data.get('entries', [])[-10:]
            print("\n" + "=" * 60)
            print("Recent Audit Log Entries")
            print("=" * 60)
            for entry in entries:
                print(f"\n[{entry['timestamp'][:19]}] {entry['decision'].upper()}")
                print(f"  Action: {entry['action_type']}")
                print(f"  Impact: ${entry['total_impact']}")
                print(f"  Trust: {entry['original_trust']} -> {entry['final_trust']}")
        else:
            print("No audit log found")

    elif args.command == "config":
        config = load_config()
        print("\n" + "=" * 60)
        print("Circuit Breaker Configuration")
        print("=" * 60)
        print(json.dumps(config, indent=2))


if __name__ == "__main__":
    main()
