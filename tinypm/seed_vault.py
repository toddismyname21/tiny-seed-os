#!/usr/bin/env python3
"""
===============================================================================
SEED VAULT - Canonical Knowledge Model for TinyPM
===============================================================================

THE SEED VAULT IS LAW. NO AGENT CAN IMPROVISE.

This is the canonical knowledge enforcer that ensures all agents follow
established rules extracted from research. Any proposal that violates the
Seed Vault is automatically KILLED by the Governor.

Core Principle: Hierarchical Peer Negotiation Pattern
- Agents may negotiate WITHIN the bounds of canonical rules
- Agents may NOT violate canonical rules under ANY circumstances
- The Governor has absolute veto power over non-compliant proposals

Architecture:
    ┌─────────────────────────────────────────────────────────────────┐
    │                        SEED VAULT                                │
    │   The Single Source of Truth for All Agent Behavior             │
    ├─────────────────────────────────────────────────────────────────┤
    │                                                                  │
    │   CANONICAL RULES                                               │
    │   ├── UI_PATTERNS (must use / must not use)                     │
    │   ├── PERFORMANCE_REQUIREMENTS (response times, etc.)           │
    │   ├── ACCESSIBILITY_REQUIREMENTS (WCAG compliance)              │
    │   ├── FARM_SPECIFIC_REQUIREMENTS (domain rules)                 │
    │   ├── ENGAGEMENT_PATTERNS (ethical gamification)                │
    │   └── ANTI_PATTERNS (forbidden approaches)                      │
    │                                                                  │
    │   GOVERNOR                                                       │
    │   ├── check_compliance(proposal) -> ComplianceResult            │
    │   ├── veto_if_violation(proposal) -> bool (True = KILLED)       │
    │   └── log_violation(agent, proposal, rule)                      │
    │                                                                  │
    └─────────────────────────────────────────────────────────────────┘

Sources (Research Integrated):
- PROACTIVE_AI_RESEARCH_2026.md
- TINYPM_UX_RESEARCH_2026.md
- TINYPM_ENGAGEMENT_PSYCHOLOGY_2026.md
- COMPETITOR_ANALYSIS_2026.md
- MULTI_AGENT_RESEARCH_REPORT.md
- TINYPM_ARCHITECTURE_BLUEPRINT_2026.md

Usage:
    from seed_vault import get_seed_vault, ComplianceResult

    vault = get_seed_vault()

    # Check if a proposal is compliant
    result = vault.check_compliance(proposal)
    if not result.is_compliant:
        print(f"VIOLATION: {result.violated_rules}")

    # Veto a violating proposal (kills the process)
    killed = vault.veto_if_violation(proposal)
    if killed:
        # Process was terminated
        pass
"""

import json
import hashlib
import threading
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, Callable
from enum import Enum
import re


# ===============================================================================
# CONFIGURATION
# ===============================================================================

APP_DIR = Path(__file__).parent
SEED_VAULT_RULES_FILE = APP_DIR / "SEED_VAULT_RULES.json"
VIOLATION_LOG_FILE = APP_DIR / ".seed_vault_violations.json"
RESEARCH_DIR = APP_DIR  # Research files are in same directory


# ===============================================================================
# DATA STRUCTURES
# ===============================================================================

class RuleCategory(Enum):
    """Categories of canonical rules."""
    UI_PATTERN = "ui_pattern"
    UI_ANTI_PATTERN = "ui_anti_pattern"
    PERFORMANCE = "performance"
    ACCESSIBILITY = "accessibility"
    FARM_SPECIFIC = "farm_specific"
    ENGAGEMENT = "engagement"
    PROACTIVE_AI = "proactive_ai"
    AUTONOMY = "autonomy"
    MEMORY = "memory"
    MULTI_AGENT = "multi_agent"


class RuleSeverity(Enum):
    """Severity levels for rule violations."""
    CRITICAL = "critical"      # Instant kill - NEVER violate
    HIGH = "high"              # Veto unless explicitly overridden
    MEDIUM = "medium"          # Warning, requires justification
    LOW = "low"                # Advisory, log but allow


class ComplianceStatus(Enum):
    """Result of compliance check."""
    COMPLIANT = "compliant"
    VIOLATION = "violation"
    WARNING = "warning"
    NEEDS_REVIEW = "needs_review"


@dataclass
class CanonicalRule:
    """A single canonical rule that MUST be followed."""
    id: str
    category: str
    severity: str
    title: str
    description: str
    must_do: List[str] = field(default_factory=list)      # REQUIRED actions
    must_not_do: List[str] = field(default_factory=list)  # FORBIDDEN actions
    examples_good: List[str] = field(default_factory=list)
    examples_bad: List[str] = field(default_factory=list)
    source: str = ""  # Research document source
    keywords: List[str] = field(default_factory=list)     # Detection keywords
    validation_regex: List[str] = field(default_factory=list)  # Patterns to check

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> 'CanonicalRule':
        return cls(**data)


@dataclass
class Proposal:
    """A proposal from an agent that needs compliance checking."""
    agent_id: str
    proposal_type: str  # "ui_component", "feature", "response", "action"
    content: Dict[str, Any]
    context: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = ""

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()


@dataclass
class ComplianceResult:
    """Result of checking a proposal against the Seed Vault."""
    is_compliant: bool
    status: str
    violated_rules: List[Dict] = field(default_factory=list)
    warnings: List[Dict] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)
    confidence: float = 1.0
    checked_at: str = ""

    def __post_init__(self):
        if not self.checked_at:
            self.checked_at = datetime.now().isoformat()


@dataclass
class ViolationLog:
    """Record of a rule violation."""
    violation_id: str
    agent_id: str
    rule_id: str
    rule_title: str
    proposal_summary: str
    severity: str
    action_taken: str  # "killed", "warned", "logged"
    timestamp: str


# ===============================================================================
# CANONICAL RULES DATABASE
# ===============================================================================

def _build_canonical_rules() -> Dict[str, CanonicalRule]:
    """
    Build the canonical rules database from research.

    These rules are ABSOLUTE and extracted from:
    - PROACTIVE_AI_RESEARCH_2026.md
    - TINYPM_UX_RESEARCH_2026.md
    - TINYPM_ENGAGEMENT_PSYCHOLOGY_2026.md
    - COMPETITOR_ANALYSIS_2026.md
    - MULTI_AGENT_RESEARCH_REPORT.md
    """
    rules = {}

    # =========================================================================
    # UI PATTERNS - MUST USE
    # =========================================================================

    rules["UI001"] = CanonicalRule(
        id="UI001",
        category=RuleCategory.UI_PATTERN.value,
        severity=RuleSeverity.CRITICAL.value,
        title="Command Palette Required",
        description="ALL power user interfaces MUST include a Command Palette accessible via Cmd/Ctrl+K",
        must_do=[
            "Implement Command Palette as universal entry point",
            "Bind to Cmd+K (Mac) and Ctrl+K (Windows/Linux)",
            "Support fuzzy search in Command Palette",
            "Show keyboard shortcuts on hover (2 second delay)"
        ],
        must_not_do=[
            "Use dropdown menus as primary navigation for power users",
            "Hide critical actions behind multiple menu levels",
            "Require mouse for common actions"
        ],
        examples_good=["Linear's command palette", "Superhuman's keyboard-first design"],
        examples_bad=["Multi-level dropdown menus", "Mouse-only interfaces"],
        source="TINYPM_UX_RESEARCH_2026.md - Section 1: Core Features",
        keywords=["command palette", "keyboard", "cmd+k", "navigation"]
    )

    rules["UI002"] = CanonicalRule(
        id="UI002",
        category=RuleCategory.UI_PATTERN.value,
        severity=RuleSeverity.HIGH.value,
        title="Keyboard-First Design",
        description="Implement keyboard shortcuts for all common actions with Linear-style hints",
        must_do=[
            "Single-key shortcuts for common actions (C for create, E for edit)",
            "Vim-style navigation (j/k for up/down)",
            "Show shortcuts on hover with 2 second delay",
            "Support Cmd+K command palette"
        ],
        must_not_do=[
            "Require Shift/Ctrl for common actions",
            "Hide shortcuts from users",
            "Conflict with browser shortcuts"
        ],
        source="TINYPM_UX_RESEARCH_2026.md - Keyboard-First vs Mouse-First Design",
        keywords=["keyboard", "shortcuts", "vim", "navigation"]
    )

    rules["UI003"] = CanonicalRule(
        id="UI003",
        category=RuleCategory.UI_PATTERN.value,
        severity=RuleSeverity.CRITICAL.value,
        title="Dark Mode Required",
        description="Dark mode is table stakes and MUST be implemented properly",
        must_do=[
            "Use muted greys (#121212 or darker), NOT pure black (#000000)",
            "Increase font weight slightly in dark mode for readability",
            "Ensure 4.5:1 contrast ratio minimum (WCAG AA)",
            "Respect system preference as default with manual override",
            "Test ALL UI elements in both modes before shipping"
        ],
        must_not_do=[
            "Use pure black (#000000) backgrounds",
            "Use stark white text on dark backgrounds",
            "Ship dark mode without contrast testing"
        ],
        examples_good=["Deep charcoal backgrounds (#0A0A0F)", "Cloud white text (#F8F7F4)"],
        examples_bad=["Pure black (#000000)", "Stark white (#FFFFFF) on black"],
        source="TINYPM_UX_RESEARCH_2026.md - Section 3: Visual Design Trends",
        keywords=["dark mode", "theme", "colors", "contrast"]
    )

    rules["UI004"] = CanonicalRule(
        id="UI004",
        category=RuleCategory.UI_PATTERN.value,
        severity=RuleSeverity.HIGH.value,
        title="Progressive Complexity",
        description="Start simple, reveal power features as users advance",
        must_do=[
            "Show simple interface by default",
            "Reveal advanced features based on user experience level",
            "Guide users to power features progressively",
            "Never overwhelm new users with options"
        ],
        must_not_do=[
            "Show all features at once",
            "Require configuration before first use",
            "Present blank canvas (Notion anti-pattern)"
        ],
        source="TINYPM_UX_RESEARCH_2026.md - Differentiation Opportunities",
        keywords=["progressive", "complexity", "onboarding", "features"]
    )

    # =========================================================================
    # UI ANTI-PATTERNS - MUST NOT USE
    # =========================================================================

    rules["ANTI001"] = CanonicalRule(
        id="ANTI001",
        category=RuleCategory.UI_ANTI_PATTERN.value,
        severity=RuleSeverity.CRITICAL.value,
        title="No Blank Canvas Problem",
        description="NEVER present users with a blank canvas requiring system building",
        must_do=[
            "Provide intelligent defaults",
            "Include pre-built project templates",
            "Offer suggested workflows",
            "Show 'This is how successful teams do it' prompts"
        ],
        must_not_do=[
            "Present blank canvas (Notion anti-pattern)",
            "Require building PM system from scratch",
            "Force extensive upfront configuration"
        ],
        examples_bad=["Notion's blank page approach", "Requiring weeks to be useful"],
        source="COMPETITOR_ANALYSIS_2026.md - What Notion Does Poorly",
        keywords=["blank canvas", "configuration", "setup", "templates"]
    )

    rules["ANTI002"] = CanonicalRule(
        id="ANTI002",
        category=RuleCategory.UI_ANTI_PATTERN.value,
        severity=RuleSeverity.HIGH.value,
        title="No Vanity Gamification",
        description="Gamification must be tied to real value, not vanity metrics",
        must_do=[
            "Tie achievements to genuine progress",
            "Connect points to real outcomes",
            "Make badges meaningful",
            "Track 'productive days' not just 'opens'"
        ],
        must_not_do=[
            "Award badges for trivial actions ('Opened app 100 times')",
            "Create points disconnected from value",
            "Use too-easy achievements that feel meaningless",
            "Use too-hard achievements that cause users to give up"
        ],
        source="TINYPM_ENGAGEMENT_PSYCHOLOGY_2026.md - Section 6: Emotional Connection",
        keywords=["gamification", "badges", "achievements", "points"]
    )

    rules["ANTI003"] = CanonicalRule(
        id="ANTI003",
        category=RuleCategory.UI_ANTI_PATTERN.value,
        severity=RuleSeverity.CRITICAL.value,
        title="No Guilt-Based Notifications",
        description="Use positive framing, not anxiety-inducing guilt trips",
        must_do=[
            "Use positive framing: 'You've maintained momentum for 12 days'",
            "Offer streak shields for weekends/vacations",
            "Celebrate progress without punishing breaks"
        ],
        must_not_do=[
            "Use guilt messaging: 'Don't break your streak!'",
            "Punish users for taking breaks",
            "Create anxiety about missing streaks"
        ],
        source="TINYPM_ENGAGEMENT_PSYCHOLOGY_2026.md - Section 1: Habit Loops",
        keywords=["notifications", "streak", "guilt", "anxiety"]
    )

    # =========================================================================
    # PERFORMANCE REQUIREMENTS
    # =========================================================================

    rules["PERF001"] = CanonicalRule(
        id="PERF001",
        category=RuleCategory.PERFORMANCE.value,
        severity=RuleSeverity.CRITICAL.value,
        title="Sub-100ms Response Time",
        description="Every interaction MUST feel instant with sub-100ms response",
        must_do=[
            "Response time < 100ms for all UI interactions",
            "Use optimistic updates for perceived speed",
            "Pre-load likely next actions",
            "Implement skeleton loading states"
        ],
        must_not_do=[
            "Allow loading times > 300ms (feels sluggish)",
            "Block UI during API calls",
            "Show spinners for common actions"
        ],
        source="TINYPM_ENGAGEMENT_PSYCHOLOGY_2026.md - Section 2: Dopamine-Driven Design",
        keywords=["performance", "speed", "response time", "latency"]
    )

    rules["PERF002"] = CanonicalRule(
        id="PERF002",
        category=RuleCategory.PERFORMANCE.value,
        severity=RuleSeverity.HIGH.value,
        title="Animation Duration Limits",
        description="Animations must be between 300-500ms for responsiveness",
        must_do=[
            "Keep animations between 300-500ms",
            "Use satisfying 'snap' effects for task completion",
            "Scale celebration to achievement magnitude",
            "Ensure animations serve clarity OR delight"
        ],
        must_not_do=[
            "Use animations > 500ms (feels slow)",
            "Use animations < 200ms (feels jarring)",
            "Add gimmicky animations for trivial actions"
        ],
        source="TINYPM_UX_RESEARCH_2026.md - Micro-Interactions That Delight",
        keywords=["animation", "duration", "transition", "micro-interaction"]
    )

    # =========================================================================
    # PROACTIVE AI REQUIREMENTS
    # =========================================================================

    rules["PROACT001"] = CanonicalRule(
        id="PROACT001",
        category=RuleCategory.PROACTIVE_AI.value,
        severity=RuleSeverity.CRITICAL.value,
        title="Task Boundary Intervention Timing",
        description="Proactive suggestions MUST be timed at task boundaries (52% engagement)",
        must_do=[
            "Intervene at task boundaries (post-commit, task completion)",
            "Detect natural breaks in user workflow",
            "Wait for 2-5 minute idle periods",
            "Check for task completion signals before suggesting"
        ],
        must_not_do=[
            "Interrupt during deep work (38% engagement, 62% dismissed)",
            "Suggest during rapid activity",
            "Interrupt within first 2 minutes of activity"
        ],
        source="PROACTIVE_AI_RESEARCH_2026.md - Part 2: Avoiding Alert Fatigue",
        keywords=["timing", "task boundary", "intervention", "suggestion"]
    )

    rules["PROACT002"] = CanonicalRule(
        id="PROACT002",
        category=RuleCategory.PROACTIVE_AI.value,
        severity=RuleSeverity.CRITICAL.value,
        title="Confidence Threshold Requirements",
        description="Suggestions MUST respect confidence thresholds for autonomy levels",
        must_do=[
            ">95% confidence: Auto-execute, notify after (LEVEL_AUTO)",
            "85-95% confidence: Present for one-click approval (LEVEL_APPROVE)",
            "70-85% confidence: Ask specific clarifying question (LEVEL_CLARIFY)",
            "50-70% confidence: Collaborative mode (LEVEL_COLLABORATE)",
            "<50% confidence: Don't suggest, or caveat heavily (LEVEL_CAVEAT)"
        ],
        must_not_do=[
            "Auto-execute with <95% confidence",
            "Show suggestions with <50% confidence without heavy caveats",
            "Display false confidence (overconfident on uncertain items)"
        ],
        source="PROACTIVE_AI_RESEARCH_2026.md - Part 5: Confidence Levels",
        keywords=["confidence", "threshold", "autonomy", "approval"]
    )

    rules["PROACT003"] = CanonicalRule(
        id="PROACT003",
        category=RuleCategory.PROACTIVE_AI.value,
        severity=RuleSeverity.HIGH.value,
        title="Alert Consolidation Required",
        description="Multiple alerts MUST be consolidated into digestible bundles",
        must_do=[
            "Bundle related suggestions into coherent packages",
            "Use narrative format: 'Morning Focus: 3 priority items'",
            "Prioritize by impact, not volume",
            "Target 3-8 suggestions per day maximum"
        ],
        must_not_do=[
            "Show 5+ separate task reminders",
            "Create notification fatigue",
            "Alert for each individual item separately"
        ],
        source="PROACTIVE_AI_RESEARCH_2026.md - Part 2.2.3: The Consolidation Principle",
        keywords=["alerts", "consolidation", "notifications", "bundle"]
    )

    rules["PROACT004"] = CanonicalRule(
        id="PROACT004",
        category=RuleCategory.PROACTIVE_AI.value,
        severity=RuleSeverity.HIGH.value,
        title="Calendar-Aware Timing",
        description="NEVER interrupt during meetings or within 5 minutes of meeting start",
        must_do=[
            "Check calendar before suggesting",
            "Respect 'focus time' calendar blocks",
            "Prefer task boundary + calendar gap combinations"
        ],
        must_not_do=[
            "Interrupt during meetings",
            "Suggest within 5 minutes of meeting start",
            "Ignore calendar context when timing suggestions"
        ],
        source="PROACTIVE_AI_RESEARCH_2026.md - TimingIntelligence class",
        keywords=["calendar", "meeting", "focus time", "timing"]
    )

    # =========================================================================
    # AUTONOMY REQUIREMENTS
    # =========================================================================

    rules["AUTO001"] = CanonicalRule(
        id="AUTO001",
        category=RuleCategory.AUTONOMY.value,
        severity=RuleSeverity.CRITICAL.value,
        title="Five-Level Autonomy Framework",
        description="Agent autonomy MUST follow the five-level framework",
        must_do=[
            "Level 5: Auto-execute routine, low-risk, >95% confidence",
            "Level 4: One-click approval for moderate risk, >85% confidence",
            "Level 3: Ask specific question for 70-85% confidence",
            "Level 2: Collaborative mode for 50-70% confidence",
            "Level 1: Human operator for <50% confidence or high-risk"
        ],
        must_not_do=[
            "Auto-execute high-risk actions",
            "Skip human approval for financial transactions",
            "Make irreversible changes without confirmation"
        ],
        source="TINYPM_ARCHITECTURE_BLUEPRINT_2026.md - Part 4: Autonomy System",
        keywords=["autonomy", "level", "approval", "risk"]
    )

    rules["AUTO002"] = CanonicalRule(
        id="AUTO002",
        category=RuleCategory.AUTONOMY.value,
        severity=RuleSeverity.CRITICAL.value,
        title="Human-in-the-Loop for Sensitive Actions",
        description="Sensitive actions MUST have human approval before execution",
        must_do=[
            "Pause for human approval on delete operations",
            "Require confirmation for financial transactions",
            "Get explicit approval for external communications",
            "Log all autonomous decisions for audit"
        ],
        must_not_do=[
            "Delete data without human confirmation",
            "Send external emails without review",
            "Execute financial transactions autonomously"
        ],
        source="SOTA_MULTI_AGENT_RESEARCH_2026.md - Section 7: Guardrails",
        keywords=["sensitive", "approval", "human", "confirmation"]
    )

    # =========================================================================
    # ENGAGEMENT PATTERNS
    # =========================================================================

    rules["ENGAGE001"] = CanonicalRule(
        id="ENGAGE001",
        category=RuleCategory.ENGAGEMENT.value,
        severity=RuleSeverity.HIGH.value,
        title="Ethical Streak System",
        description="Streaks MUST include ethical safeguards",
        must_do=[
            "Track 'productive days' not just 'opens'",
            "Offer streak freeze for weekends/vacations",
            "Include grace periods",
            "Use positive framing for streak messages"
        ],
        must_not_do=[
            "Punish users for taking breaks",
            "Use guilt-inducing streak messaging",
            "Create anxiety about missing streaks"
        ],
        source="TINYPM_ENGAGEMENT_PSYCHOLOGY_2026.md - Section 1: Habit Loops",
        keywords=["streak", "ethics", "freeze", "grace"]
    )

    rules["ENGAGE002"] = CanonicalRule(
        id="ENGAGE002",
        category=RuleCategory.ENGAGEMENT.value,
        severity=RuleSeverity.HIGH.value,
        title="Team Velocity Over Individual Rankings",
        description="Show team trends, not individual comparisons",
        must_do=[
            "Celebrate collective achievements",
            "Show 'We completed 50 tasks' not 'John 30, Mary 20'",
            "Focus on team velocity trends",
            "Enable peer kudos/recognition"
        ],
        must_not_do=[
            "Create public individual rankings",
            "Shame-based accountability",
            "Competition that damages collaboration"
        ],
        source="TINYPM_ENGAGEMENT_PSYCHOLOGY_2026.md - Section 5: Social Dynamics",
        keywords=["team", "velocity", "ranking", "collaboration"]
    )

    rules["ENGAGE003"] = CanonicalRule(
        id="ENGAGE003",
        category=RuleCategory.ENGAGEMENT.value,
        severity=RuleSeverity.MEDIUM.value,
        title="Progress Visualization with Endowed Progress",
        description="Never start progress bars at 0% - show existing work",
        must_do=[
            "Start progress visualization showing existing work",
            "Show what's accomplished, not just what remains",
            "Use goal gradient effect near completion",
            "Create visual acceleration as goals approach"
        ],
        must_not_do=[
            "Start progress bars at 0%",
            "Only show remaining work",
            "Miss opportunity to show endowed progress"
        ],
        source="TINYPM_ENGAGEMENT_PSYCHOLOGY_2026.md - Section 2: Progress Visualization",
        keywords=["progress", "endowed", "visualization", "gradient"]
    )

    # =========================================================================
    # FARM-SPECIFIC REQUIREMENTS
    # =========================================================================

    rules["FARM001"] = CanonicalRule(
        id="FARM001",
        category=RuleCategory.FARM_SPECIFIC.value,
        severity=RuleSeverity.HIGH.value,
        title="Weather-Aware Operations",
        description="Farm operations MUST integrate weather signals",
        must_do=[
            "Check weather forecast for outdoor tasks",
            "Alert for planting/harvest windows",
            "Consider weather in deadline calculations",
            "Include weather context in morning briefs"
        ],
        must_not_do=[
            "Schedule outdoor work without weather check",
            "Ignore weather alerts",
            "Miss frost/freeze warnings"
        ],
        source="PROACTIVE_AI_RESEARCH_2026.md - External Signal Monitor",
        keywords=["weather", "farm", "planting", "harvest"]
    )

    rules["FARM002"] = CanonicalRule(
        id="FARM002",
        category=RuleCategory.FARM_SPECIFIC.value,
        severity=RuleSeverity.HIGH.value,
        title="Seasonal Pattern Awareness",
        description="System MUST understand and adapt to seasonal farm patterns",
        must_do=[
            "Recognize planting vs harvest seasons",
            "Adjust workload expectations by season",
            "Understand CSA delivery cycles",
            "Track seasonal revenue patterns"
        ],
        must_not_do=[
            "Ignore seasonal variations",
            "Apply same patterns to all seasons",
            "Miss critical seasonal deadlines"
        ],
        source="PROACTIVE_AI_RESEARCH_2026.md - Tier 2 Context Signals",
        keywords=["seasonal", "planting", "harvest", "CSA"]
    )

    # =========================================================================
    # MEMORY REQUIREMENTS
    # =========================================================================

    rules["MEM001"] = CanonicalRule(
        id="MEM001",
        category=RuleCategory.MEMORY.value,
        severity=RuleSeverity.HIGH.value,
        title="Style Learning Required",
        description="System MUST learn and apply user's communication style",
        must_do=[
            "Learn formality level from user messages",
            "Detect greeting/closing patterns",
            "Track punctuation and emoji usage",
            "Apply learned style to AI drafts"
        ],
        must_not_do=[
            "Use generic tone for all users",
            "Ignore user communication preferences",
            "Override learned style without reason"
        ],
        source="PROACTIVE_AI_RESEARCH_2026.md - StyleLearner class",
        keywords=["style", "learning", "tone", "formality"]
    )

    rules["MEM002"] = CanonicalRule(
        id="MEM002",
        category=RuleCategory.MEMORY.value,
        severity=RuleSeverity.HIGH.value,
        title="Cross-Session Memory",
        description="Learned context MUST persist across sessions",
        must_do=[
            "Store entity memories (people, projects)",
            "Persist learned preferences",
            "Track tool effectiveness across sessions",
            "Maintain conversation context for handoffs"
        ],
        must_not_do=[
            "Start fresh each session",
            "Lose learned preferences",
            "Duplicate work due to memory loss"
        ],
        source="MULTI_AGENT_RESEARCH_REPORT.md - Part 3.1.1: Shared Memory Layer",
        keywords=["memory", "persistence", "session", "learning"]
    )

    # =========================================================================
    # ACCESSIBILITY REQUIREMENTS
    # =========================================================================

    rules["A11Y001"] = CanonicalRule(
        id="A11Y001",
        category=RuleCategory.ACCESSIBILITY.value,
        severity=RuleSeverity.CRITICAL.value,
        title="WCAG AA Contrast Compliance",
        description="All text MUST meet WCAG AA contrast requirements",
        must_do=[
            "Ensure 4.5:1 contrast ratio for normal text",
            "Ensure 3:1 contrast ratio for large text",
            "Test contrast in both light and dark modes",
            "Use contrast checking tools before shipping"
        ],
        must_not_do=[
            "Ship text with less than 4.5:1 contrast",
            "Use low-contrast placeholder text",
            "Ignore contrast in dark mode"
        ],
        source="TINYPM_UX_RESEARCH_2026.md - Dark Mode Guidelines",
        keywords=["contrast", "WCAG", "accessibility", "color"]
    )

    rules["A11Y002"] = CanonicalRule(
        id="A11Y002",
        category=RuleCategory.ACCESSIBILITY.value,
        severity=RuleSeverity.HIGH.value,
        title="Keyboard Accessibility",
        description="All functionality MUST be accessible via keyboard",
        must_do=[
            "Ensure all interactive elements are keyboard accessible",
            "Provide visible focus indicators",
            "Support tab navigation in logical order",
            "Allow keyboard shortcuts for common actions"
        ],
        must_not_do=[
            "Create mouse-only interactions",
            "Hide focus indicators",
            "Trap keyboard focus"
        ],
        source="TINYPM_UX_RESEARCH_2026.md - Keyboard-First Design",
        keywords=["keyboard", "accessibility", "focus", "tab"]
    )

    # =========================================================================
    # MULTI-AGENT REQUIREMENTS
    # =========================================================================

    rules["AGENT001"] = CanonicalRule(
        id="AGENT001",
        category=RuleCategory.MULTI_AGENT.value,
        severity=RuleSeverity.HIGH.value,
        title="Agent Coordination Protocol",
        description="Agents MUST coordinate through established protocols",
        must_do=[
            "Use message passing through designated channels",
            "Respect file locking for concurrent access",
            "Send heartbeats at regular intervals",
            "Handle handoffs with context transfer"
        ],
        must_not_do=[
            "Bypass coordination protocols",
            "Ignore file locks",
            "Fail silently without notification"
        ],
        source="MULTI_AGENT_RESEARCH_REPORT.md - Part 1: Current Architecture",
        keywords=["coordination", "protocol", "heartbeat", "handoff"]
    )

    rules["AGENT002"] = CanonicalRule(
        id="AGENT002",
        category=RuleCategory.MULTI_AGENT.value,
        severity=RuleSeverity.CRITICAL.value,
        title="Self-Healing Session Recovery",
        description="System MUST auto-recover from agent failures",
        must_do=[
            "Detect stale sessions (>15 min no heartbeat)",
            "Auto-release file locks on stale detection",
            "Reassign claimed tasks to queue",
            "Generate handoff summary for next session"
        ],
        must_not_do=[
            "Leave orphaned work",
            "Require manual intervention for recovery",
            "Lose session context on failure"
        ],
        source="MULTI_AGENT_RESEARCH_REPORT.md - Part 3.1.2: Self-Healing",
        keywords=["self-healing", "recovery", "stale", "heartbeat"]
    )

    return rules


# ===============================================================================
# SEED VAULT - THE CANONICAL KNOWLEDGE ENFORCER
# ===============================================================================

class SeedVault:
    """
    Canonical Knowledge Model - NO IMPROVISATION ALLOWED.

    The Seed Vault is the single source of truth for all agent behavior.
    Any proposal that violates canonical rules is automatically vetoed.

    Core Principle: Hierarchical Peer Negotiation
    - Agents may negotiate WITHIN the bounds of canonical rules
    - Agents may NOT violate canonical rules
    - The Governor has absolute veto power
    """

    def __init__(self):
        self.rules: Dict[str, CanonicalRule] = {}
        self.violations: List[ViolationLog] = []
        self._lock = threading.RLock()
        self._callbacks: Dict[str, List[Callable]] = {
            "on_violation": [],
            "on_veto": [],
            "on_warning": []
        }
        self._load_rules()
        self._load_violations()

    def _load_rules(self):
        """Load canonical rules from file or build defaults."""
        if SEED_VAULT_RULES_FILE.exists():
            try:
                data = json.loads(SEED_VAULT_RULES_FILE.read_text())
                for rule_id, rule_data in data.get("rules", {}).items():
                    self.rules[rule_id] = CanonicalRule.from_dict(rule_data)
                return
            except (json.JSONDecodeError, KeyError):
                pass

        # Build and save default rules
        self.rules = _build_canonical_rules()
        self._save_rules()

    def _save_rules(self):
        """Save rules to file."""
        data = {
            "rules": {k: v.to_dict() for k, v in self.rules.items()},
            "version": "1.0.0",
            "last_updated": datetime.now().isoformat(),
            "rule_count": len(self.rules),
            "sources": [
                "PROACTIVE_AI_RESEARCH_2026.md",
                "TINYPM_UX_RESEARCH_2026.md",
                "TINYPM_ENGAGEMENT_PSYCHOLOGY_2026.md",
                "COMPETITOR_ANALYSIS_2026.md",
                "MULTI_AGENT_RESEARCH_REPORT.md",
                "TINYPM_ARCHITECTURE_BLUEPRINT_2026.md"
            ]
        }
        try:
            SEED_VAULT_RULES_FILE.write_text(json.dumps(data, indent=2))
        except IOError:
            pass

    def _load_violations(self):
        """Load violation history."""
        if VIOLATION_LOG_FILE.exists():
            try:
                data = json.loads(VIOLATION_LOG_FILE.read_text())
                self.violations = [
                    ViolationLog(**v) for v in data.get("violations", [])[-1000:]
                ]
            except (json.JSONDecodeError, KeyError):
                pass

    def _save_violations(self):
        """Save violation history."""
        data = {
            "violations": [asdict(v) for v in self.violations[-1000:]],
            "last_updated": datetime.now().isoformat()
        }
        try:
            VIOLATION_LOG_FILE.write_text(json.dumps(data, indent=2))
        except IOError:
            pass

    def register_callback(self, event: str, callback: Callable):
        """Register callback for events (on_violation, on_veto, on_warning)."""
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
    # CORE COMPLIANCE CHECKING
    # =========================================================================

    def check_compliance(self, proposal: Proposal) -> ComplianceResult:
        """
        Check if a proposal complies with canonical rules.

        This is the core function that validates any agent proposal
        against the Seed Vault's canonical rules.

        Args:
            proposal: The proposal to check

        Returns:
            ComplianceResult with violation details if any
        """
        with self._lock:
            violated_rules = []
            warnings = []
            suggestions = []

            # Convert proposal content to searchable text
            proposal_text = self._proposal_to_text(proposal)

            for rule_id, rule in self.rules.items():
                violation = self._check_rule(rule, proposal, proposal_text)

                if violation:
                    if rule.severity == RuleSeverity.CRITICAL.value:
                        violated_rules.append({
                            "rule_id": rule_id,
                            "title": rule.title,
                            "severity": rule.severity,
                            "description": rule.description,
                            "violation_detail": violation
                        })
                    elif rule.severity == RuleSeverity.HIGH.value:
                        violated_rules.append({
                            "rule_id": rule_id,
                            "title": rule.title,
                            "severity": rule.severity,
                            "description": rule.description,
                            "violation_detail": violation
                        })
                    elif rule.severity == RuleSeverity.MEDIUM.value:
                        warnings.append({
                            "rule_id": rule_id,
                            "title": rule.title,
                            "severity": rule.severity,
                            "detail": violation
                        })
                    else:  # LOW
                        suggestions.append(f"[{rule_id}] Consider: {rule.title}")

            # Determine overall status
            is_compliant = len(violated_rules) == 0
            if not is_compliant:
                status = ComplianceStatus.VIOLATION.value
            elif warnings:
                status = ComplianceStatus.WARNING.value
            else:
                status = ComplianceStatus.COMPLIANT.value

            # Calculate confidence
            total_rules = len(self.rules)
            passed_rules = total_rules - len(violated_rules) - len(warnings)
            confidence = passed_rules / total_rules if total_rules > 0 else 1.0

            result = ComplianceResult(
                is_compliant=is_compliant,
                status=status,
                violated_rules=violated_rules,
                warnings=warnings,
                suggestions=suggestions,
                confidence=confidence
            )

            # Emit events
            if not is_compliant:
                self._emit("on_violation", proposal, result)
            elif warnings:
                self._emit("on_warning", proposal, result)

            return result

    def _proposal_to_text(self, proposal: Proposal) -> str:
        """Convert proposal to searchable text."""
        parts = [
            proposal.proposal_type,
            json.dumps(proposal.content, default=str),
            json.dumps(proposal.context, default=str)
        ]
        return " ".join(parts).lower()

    def _check_rule(
        self,
        rule: CanonicalRule,
        proposal: Proposal,
        proposal_text: str
    ) -> Optional[str]:
        """
        Check if a single rule is violated by the proposal.

        Returns violation detail string if violated, None if compliant.
        """
        # Check keywords for relevance
        if not self._rule_applies(rule, proposal_text):
            return None

        # Check must_not_do violations
        for forbidden in rule.must_not_do:
            forbidden_lower = forbidden.lower()
            # Check for keyword matches
            forbidden_keywords = self._extract_keywords(forbidden_lower)
            matches = sum(1 for kw in forbidden_keywords if kw in proposal_text)
            if matches >= len(forbidden_keywords) * 0.7:  # 70% keyword match
                return f"Violates 'must not do': {forbidden}"

        # Check validation regex patterns
        for pattern in rule.validation_regex:
            try:
                if re.search(pattern, proposal_text, re.IGNORECASE):
                    return f"Matches forbidden pattern: {pattern}"
            except re.error:
                pass

        # Check for missing must_do requirements (only for relevant rules)
        content = proposal.content
        if isinstance(content, dict):
            # Check specific must_do requirements based on proposal type
            if proposal.proposal_type == "ui_component":
                for required in rule.must_do:
                    required_lower = required.lower()
                    if "command palette" in required_lower:
                        if "keyboard" in proposal_text and "palette" not in proposal_text:
                            return f"Missing required feature: {required}"
                    if "dark mode" in required_lower:
                        if "theme" in proposal_text and "dark" not in proposal_text:
                            return f"Missing required feature: {required}"

        return None

    def _rule_applies(self, rule: CanonicalRule, proposal_text: str) -> bool:
        """Check if a rule is relevant to this proposal."""
        # Rule applies if any keyword matches
        for keyword in rule.keywords:
            if keyword.lower() in proposal_text:
                return True
        return False

    def _extract_keywords(self, text: str) -> List[str]:
        """Extract significant keywords from text."""
        # Remove common words and extract meaningful terms
        stop_words = {
            "the", "a", "an", "is", "are", "was", "were", "be", "been",
            "being", "have", "has", "had", "do", "does", "did", "will",
            "would", "could", "should", "may", "might", "must", "can",
            "for", "to", "from", "with", "by", "at", "in", "on", "of"
        }
        words = re.findall(r'\b\w+\b', text.lower())
        return [w for w in words if w not in stop_words and len(w) > 2]

    # =========================================================================
    # GOVERNOR - VETO POWER
    # =========================================================================

    def veto_if_violation(self, proposal: Proposal) -> bool:
        """
        Veto a proposal if it violates canonical rules.

        This is the Governor's absolute veto power. If a CRITICAL
        or HIGH severity rule is violated, the proposal is KILLED.

        Args:
            proposal: The proposal to check and potentially veto

        Returns:
            True if proposal was killed (vetoed), False if allowed
        """
        result = self.check_compliance(proposal)

        if not result.is_compliant:
            # Check if any CRITICAL or HIGH violations
            critical_violations = [
                v for v in result.violated_rules
                if v["severity"] in [RuleSeverity.CRITICAL.value, RuleSeverity.HIGH.value]
            ]

            if critical_violations:
                # VETO - Kill the process
                self.log_violation(
                    agent=proposal.agent_id,
                    proposal=proposal,
                    violations=critical_violations,
                    action_taken="killed"
                )
                self._emit("on_veto", proposal, result)
                return True  # Killed

        return False  # Allowed

    def log_violation(
        self,
        agent: str,
        proposal: Proposal,
        violations: List[Dict],
        action_taken: str = "logged"
    ):
        """
        Log a violation for audit and learning.

        Args:
            agent: Agent ID that caused violation
            proposal: The violating proposal
            violations: List of violated rules
            action_taken: What action was taken (killed, warned, logged)
        """
        for violation in violations:
            violation_log = ViolationLog(
                violation_id=hashlib.md5(
                    f"{agent}{violation['rule_id']}{datetime.now().isoformat()}".encode()
                ).hexdigest()[:12],
                agent_id=agent,
                rule_id=violation["rule_id"],
                rule_title=violation["title"],
                proposal_summary=json.dumps(proposal.content, default=str)[:200],
                severity=violation["severity"],
                action_taken=action_taken,
                timestamp=datetime.now().isoformat()
            )
            self.violations.append(violation_log)

        self._save_violations()

    # =========================================================================
    # RULE QUERY METHODS
    # =========================================================================

    def query_rule(
        self,
        category: RuleCategory = None,
        keyword: str = None
    ) -> List[CanonicalRule]:
        """
        Query rules by category or keyword.

        Args:
            category: Filter by rule category
            keyword: Search in rule content

        Returns:
            List of matching rules
        """
        with self._lock:
            results = []
            for rule in self.rules.values():
                if category and rule.category != category.value:
                    continue
                if keyword:
                    keyword_lower = keyword.lower()
                    matches = (
                        keyword_lower in rule.title.lower() or
                        keyword_lower in rule.description.lower() or
                        any(keyword_lower in kw for kw in rule.keywords)
                    )
                    if not matches:
                        continue
                results.append(rule)
            return results

    def get_canonical_pattern(self, pattern_type: str) -> Optional[CanonicalRule]:
        """
        Get the canonical pattern for a specific type.

        Args:
            pattern_type: Type of pattern (e.g., "command_palette", "dark_mode")

        Returns:
            The canonical rule for that pattern, or None
        """
        # Map pattern types to rule IDs
        pattern_map = {
            "command_palette": "UI001",
            "keyboard": "UI002",
            "dark_mode": "UI003",
            "progressive_complexity": "UI004",
            "response_time": "PERF001",
            "animation": "PERF002",
            "task_boundary": "PROACT001",
            "confidence": "PROACT002",
            "alerts": "PROACT003",
            "autonomy": "AUTO001",
            "streak": "ENGAGE001",
            "team_velocity": "ENGAGE002",
            "contrast": "A11Y001",
            "accessibility": "A11Y002"
        }

        rule_id = pattern_map.get(pattern_type.lower())
        if rule_id:
            return self.rules.get(rule_id)
        return None

    def get_anti_patterns(self) -> List[CanonicalRule]:
        """Get all anti-patterns (forbidden approaches)."""
        return self.query_rule(category=RuleCategory.UI_ANTI_PATTERN)

    # =========================================================================
    # STATISTICS AND REPORTING
    # =========================================================================

    def get_stats(self) -> Dict[str, Any]:
        """Get Seed Vault statistics."""
        with self._lock:
            violations_by_severity = {}
            violations_by_agent = {}
            violations_by_rule = {}

            for v in self.violations:
                violations_by_severity[v.severity] = violations_by_severity.get(v.severity, 0) + 1
                violations_by_agent[v.agent_id] = violations_by_agent.get(v.agent_id, 0) + 1
                violations_by_rule[v.rule_id] = violations_by_rule.get(v.rule_id, 0) + 1

            rules_by_category = {}
            for rule in self.rules.values():
                rules_by_category[rule.category] = rules_by_category.get(rule.category, 0) + 1

            return {
                "total_rules": len(self.rules),
                "rules_by_category": rules_by_category,
                "total_violations": len(self.violations),
                "violations_by_severity": violations_by_severity,
                "violations_by_agent": violations_by_agent,
                "top_violated_rules": sorted(
                    violations_by_rule.items(),
                    key=lambda x: x[1],
                    reverse=True
                )[:10],
                "recent_violations": [
                    asdict(v) for v in self.violations[-10:]
                ]
            }

    def export_rules_json(self) -> str:
        """Export all rules as JSON for external consumption."""
        return json.dumps({
            "rules": {k: v.to_dict() for k, v in self.rules.items()},
            "exported_at": datetime.now().isoformat()
        }, indent=2)


# ===============================================================================
# GLOBAL INSTANCE
# ===============================================================================

_seed_vault: Optional[SeedVault] = None


def get_seed_vault() -> SeedVault:
    """Get the global SeedVault instance (singleton)."""
    global _seed_vault
    if _seed_vault is None:
        _seed_vault = SeedVault()
    return _seed_vault


# ===============================================================================
# CONVENIENCE FUNCTIONS
# ===============================================================================

def check_compliance(proposal: Proposal) -> ComplianceResult:
    """Check proposal compliance (convenience function)."""
    return get_seed_vault().check_compliance(proposal)


def veto_if_violation(proposal: Proposal) -> bool:
    """Veto if violation (convenience function)."""
    return get_seed_vault().veto_if_violation(proposal)


def get_canonical_pattern(pattern_type: str) -> Optional[CanonicalRule]:
    """Get canonical pattern (convenience function)."""
    return get_seed_vault().get_canonical_pattern(pattern_type)


def log_violation(agent: str, proposal: Proposal, violations: List[Dict], action: str = "logged"):
    """Log violation (convenience function)."""
    get_seed_vault().log_violation(agent, proposal, violations, action)


# ===============================================================================
# CLI INTERFACE
# ===============================================================================

def main():
    """CLI interface for Seed Vault."""
    import argparse

    parser = argparse.ArgumentParser(description="Seed Vault - Canonical Knowledge Model")
    parser.add_argument("--stats", action="store_true", help="Show vault statistics")
    parser.add_argument("--rules", action="store_true", help="List all rules")
    parser.add_argument("--export", action="store_true", help="Export rules as JSON")
    parser.add_argument("--category", type=str, help="Filter rules by category")
    parser.add_argument("--search", type=str, help="Search rules by keyword")
    args = parser.parse_args()

    vault = get_seed_vault()

    if args.stats:
        stats = vault.get_stats()
        print("\n=== SEED VAULT STATISTICS ===")
        print(f"Total Rules: {stats['total_rules']}")
        print(f"\nRules by Category:")
        for cat, count in stats['rules_by_category'].items():
            print(f"  {cat}: {count}")
        print(f"\nTotal Violations: {stats['total_violations']}")
        if stats['violations_by_severity']:
            print(f"\nViolations by Severity:")
            for sev, count in stats['violations_by_severity'].items():
                print(f"  {sev}: {count}")
        if stats['top_violated_rules']:
            print(f"\nTop Violated Rules:")
            for rule_id, count in stats['top_violated_rules'][:5]:
                print(f"  {rule_id}: {count}")

    elif args.rules:
        category = RuleCategory(args.category) if args.category else None
        rules = vault.query_rule(category=category, keyword=args.search)
        print(f"\n=== CANONICAL RULES ({len(rules)} found) ===\n")
        for rule in rules:
            print(f"[{rule.id}] {rule.title}")
            print(f"  Category: {rule.category}")
            print(f"  Severity: {rule.severity}")
            print(f"  Description: {rule.description[:100]}...")
            print()

    elif args.export:
        print(vault.export_rules_json())

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
