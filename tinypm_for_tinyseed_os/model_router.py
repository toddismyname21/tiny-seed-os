#!/usr/bin/env python3
"""
===============================================================================
MODEL ROUTER - Intelligent Multi-Model Orchestration for TinyPM
===============================================================================

Based on January 2026 SOTA research on model routing strategies.

Key Principles:
- Route each task to the BEST model for that task type
- Use cascading to minimize costs while maintaining quality
- Track usage and costs for optimization
- Implement fallback chains for reliability

References:
- IDC 2026: "70% of top AI enterprises use multi-model architectures"
- Research shows cascading reduces costs 26-70% while maintaining accuracy

Usage:
    from model_router import get_best_model, ModelRouter

    # Simple usage
    model = get_best_model("code_generation", context={"complexity": "high"})

    # Advanced usage with router instance
    router = ModelRouter()
    response = router.route_request(task_type="code_review", prompt=code)
"""

import json
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, List, Tuple, Any
from dataclasses import dataclass, field
from enum import Enum

# ===============================================================================
# CONFIGURATION
# ===============================================================================

APP_DIR = Path(__file__).parent
ROUTER_STATE_FILE = APP_DIR / ".model_router_state.json"
USAGE_LOG_FILE = APP_DIR / ".model_usage_log.json"


class TaskType(Enum):
    """Standardized task types for routing decisions."""
    SIMPLE_CHAT = "simple_chat"
    COMPLEX_CHAT = "complex_chat"
    CODE_GENERATION = "code_generation"
    CODE_REVIEW = "code_review"
    DEBUGGING = "debugging"
    RESEARCH = "research"
    ANALYSIS = "analysis"
    QUICK_STATUS = "quick_status"
    DOCUMENT_ANALYSIS = "document_analysis"
    VISION = "vision"
    AGENTIC_TASK = "agentic_task"
    EMAIL_DRAFT = "email_draft"
    SUMMARIZATION = "summarization"
    MEMORY_QUERY = "memory_query"
    PLANNING = "planning"
    # New January 2026 Task Types
    COMPLEX_REASONING = "complex_reasoning"  # ARC-AGI style puzzles, novel problems
    MATH_SCIENCE = "math_science"            # AIME-level math, scientific computation
    CREATIVE_WRITING = "creative_writing"    # Stories, marketing copy, creative content
    LONG_DOCUMENT = "long_document"          # 100k+ token documents
    COMPUTER_USE = "computer_use"            # Browser automation, GUI interaction
    VERIFICATION = "verification"            # Double-checking other model outputs
    CLASSIFICATION = "classification"        # Quick categorization tasks


@dataclass
class ModelConfig:
    """Configuration for a single model."""
    id: str
    provider: str
    input_price: float  # per 1M tokens
    output_price: float  # per 1M tokens
    context_window: int
    strengths: List[str]
    latency_class: str  # "fast", "medium", "slow"
    quality_tier: int  # 1=best, 2=good, 3=budget
    supports_vision: bool = False
    supports_tools: bool = True


# ===============================================================================
# MODEL REGISTRY - January 2026 SOTA
# ===============================================================================

MODELS = {
    # =========================================================================
    # PREMIUM TIER (Quality = 1) - Frontier Models
    # =========================================================================
    "claude-opus-4.5": ModelConfig(
        id="claude-opus-4.5",
        provider="anthropic",
        input_price=5.00,
        output_price=25.00,
        context_window=200000,
        strengths=["code_generation", "code_review", "research", "complex_reasoning", "swe_bench"],
        latency_class="slow",
        quality_tier=1,
        supports_vision=True,
    ),
    "gpt-5.2": ModelConfig(
        id="gpt-5.2",
        provider="openai",
        input_price=1.25,
        output_price=10.00,
        context_window=128000,
        strengths=["abstract_reasoning", "planning", "math", "analysis", "math_science", "aime"],
        latency_class="medium",
        quality_tier=1,
        supports_vision=True,
    ),
    "o3": ModelConfig(
        id="o3",
        provider="openai",
        input_price=10.00,  # High cost for extended thinking
        output_price=40.00,
        context_window=200000,
        strengths=["complex_reasoning", "arc_agi", "novel_problems", "math_olympiad", "abstract_reasoning"],
        latency_class="slow",  # Extended thinking takes time
        quality_tier=1,
        supports_vision=True,
    ),
    "gemini-3-pro": ModelConfig(
        id="gemini-3-pro",
        provider="google",
        input_price=3.00,
        output_price=15.00,
        context_window=1000000,
        strengths=["multimodal", "document_analysis", "long_context", "creative_writing", "storytelling"],
        latency_class="medium",
        quality_tier=1,
        supports_vision=True,
    ),

    # =========================================================================
    # STANDARD TIER (Quality = 2) - Balanced Performance/Cost
    # =========================================================================
    "claude-sonnet-4.5": ModelConfig(
        id="claude-sonnet-4.5",
        provider="anthropic",
        input_price=3.00,
        output_price=15.00,
        context_window=200000,
        strengths=["balanced", "code", "analysis", "verification", "quality_check"],
        latency_class="medium",
        quality_tier=2,
        supports_vision=True,
    ),
    "claude-haiku-4.5": ModelConfig(
        id="claude-haiku-4.5",
        provider="anthropic",
        input_price=1.00,
        output_price=5.00,
        context_window=200000,
        strengths=["agentic_task", "tool_use", "fast_chat", "email_draft", "computer_use", "osworld"],
        latency_class="fast",
        quality_tier=2,
        supports_vision=True,
        supports_tools=True,
    ),
    "o3-mini": ModelConfig(
        id="o3-mini",
        provider="openai",
        input_price=1.10,
        output_price=4.40,
        context_window=200000,
        strengths=["reasoning", "math", "logic_puzzles", "fast_reasoning", "budget_reasoning"],
        latency_class="medium",
        quality_tier=2,
        supports_vision=False,
    ),
    "gpt-5-mini": ModelConfig(
        id="gpt-5-mini",
        provider="openai",
        input_price=0.25,
        output_price=2.00,
        context_window=128000,
        strengths=["general_chat", "high_volume", "summarization"],
        latency_class="fast",
        quality_tier=2,
    ),
    "deepseek-v3.2": ModelConfig(
        id="deepseek-v3.2",
        provider="deepseek",
        input_price=0.14,  # Ultra competitive pricing
        output_price=0.28,
        context_window=128000,
        strengths=["code_generation", "math", "reasoning", "budget_powerhouse", "cost_effective"],
        latency_class="medium",
        quality_tier=2,
        supports_vision=False,
    ),

    # =========================================================================
    # BUDGET TIER (Quality = 3) - High Volume / Low Cost
    # =========================================================================
    "gemini-3-flash": ModelConfig(
        id="gemini-3-flash",
        provider="google",
        input_price=0.08,
        output_price=0.40,
        context_window=1000000,
        strengths=["memory_query", "document_analysis", "throughput", "long_context", "long_document"],
        latency_class="fast",
        quality_tier=3,
        supports_vision=True,
    ),
    "gemini-3-flash-lite": ModelConfig(
        id="gemini-3-flash-lite",
        provider="google",
        input_price=0.02,  # Ultra cheap - ideal for classification
        output_price=0.10,
        context_window=500000,
        strengths=["classification", "routing", "simple_classification", "ultra_budget", "high_throughput"],
        latency_class="fast",
        quality_tier=3,
        supports_vision=False,
    ),
    "gpt-5-nano": ModelConfig(
        id="gpt-5-nano",
        provider="openai",
        input_price=0.05,
        output_price=0.40,
        context_window=64000,
        strengths=["simple_chat", "quick_status", "classification", "routing"],
        latency_class="fast",
        quality_tier=3,
    ),
}


# ===============================================================================
# TASK-TO-MODEL ROUTING TABLE
# ===============================================================================

# Primary model recommendations by task type
# Based on January 2026 benchmark research:
# - Code generation → Claude Opus 4.5 (80.9% SWE-bench)
# - Math/Science → GPT-5.2 (100% AIME 2025)
# - Agents/Tool Use → Claude Haiku 4.5 (50.7% OSWorld)
# - Long docs → Gemini 3 Flash (1M context, $0.08/1M)
# - Complex reasoning → o3 (88% ARC-AGI)
TASK_ROUTES: Dict[str, str] = {
    # Original task types
    TaskType.SIMPLE_CHAT.value: "gpt-5-nano",
    TaskType.COMPLEX_CHAT.value: "claude-haiku-4.5",
    TaskType.CODE_GENERATION.value: "claude-opus-4.5",      # 80.9% SWE-bench verified
    TaskType.CODE_REVIEW.value: "claude-opus-4.5",
    TaskType.DEBUGGING.value: "claude-opus-4.5",
    TaskType.RESEARCH.value: "claude-opus-4.5",
    TaskType.ANALYSIS.value: "gpt-5.2",
    TaskType.QUICK_STATUS.value: "gpt-5-nano",
    TaskType.DOCUMENT_ANALYSIS.value: "gemini-3-flash",
    TaskType.VISION.value: "gemini-3-pro",
    TaskType.AGENTIC_TASK.value: "claude-haiku-4.5",        # 50.7% OSWorld leader
    TaskType.EMAIL_DRAFT.value: "claude-haiku-4.5",
    TaskType.SUMMARIZATION.value: "gpt-5-mini",
    TaskType.MEMORY_QUERY.value: "gemini-3-flash",
    TaskType.PLANNING.value: "gpt-5.2",
    # New January 2026 task types
    TaskType.COMPLEX_REASONING.value: "o3",                  # 88% ARC-AGI champion
    TaskType.MATH_SCIENCE.value: "gpt-5.2",                  # 100% AIME 2025
    TaskType.CREATIVE_WRITING.value: "gemini-3-pro",         # Best storytelling
    TaskType.LONG_DOCUMENT.value: "gemini-3-flash",          # 1M context, $0.08/1M
    TaskType.COMPUTER_USE.value: "claude-haiku-4.5",         # OSWorld leader
    TaskType.VERIFICATION.value: "claude-sonnet-4.5",        # Quality verification
    TaskType.CLASSIFICATION.value: "gemini-3-flash-lite",    # $0.02/1M ultra cheap
}

# Fallback chains when primary model fails
FALLBACK_CHAINS: Dict[str, List[str]] = {
    "claude-opus-4.5": ["claude-sonnet-4.5", "claude-haiku-4.5", "gpt-5.2"],
    "claude-sonnet-4.5": ["claude-haiku-4.5", "gpt-5-mini", "deepseek-v3.2"],
    "claude-haiku-4.5": ["gpt-5-mini", "deepseek-v3.2", "gpt-5-nano"],
    "gpt-5.2": ["o3-mini", "claude-opus-4.5", "gpt-5-mini"],
    "gpt-5-mini": ["gpt-5-nano", "claude-haiku-4.5", "deepseek-v3.2"],
    "gpt-5-nano": ["gpt-5-mini", "gemini-3-flash", "gemini-3-flash-lite"],
    "gemini-3-pro": ["gemini-3-flash", "claude-opus-4.5"],
    "gemini-3-flash": ["gemini-3-flash-lite", "gpt-5-nano", "gpt-5-mini"],
    "gemini-3-flash-lite": ["gpt-5-nano", "gemini-3-flash"],
    "o3": ["o3-mini", "gpt-5.2", "claude-opus-4.5"],
    "o3-mini": ["gpt-5-mini", "deepseek-v3.2", "claude-haiku-4.5"],
    "deepseek-v3.2": ["gpt-5-mini", "claude-haiku-4.5", "gpt-5-nano"],
}

# Cascade chain for quality escalation (cheapest to best)
CASCADE_CHAIN: List[str] = [
    "gemini-3-flash-lite",
    "gpt-5-nano",
    "gemini-3-flash",
    "gpt-5-mini",
    "deepseek-v3.2",
    "claude-haiku-4.5",
    "o3-mini",
    "claude-sonnet-4.5",
    "gpt-5.2",
    "claude-opus-4.5",
    "o3",
]

# ===============================================================================
# VERIFICATION CASCADE - For high-stakes tasks, verify with a different model
# ===============================================================================

# When a cheaper model produces output, use this model to verify
VERIFICATION_PAIRS: Dict[str, str] = {
    "gpt-5-nano": "claude-haiku-4.5",
    "gemini-3-flash": "claude-haiku-4.5",
    "gemini-3-flash-lite": "claude-haiku-4.5",
    "gpt-5-mini": "claude-haiku-4.5",
    "deepseek-v3.2": "claude-haiku-4.5",
    "claude-haiku-4.5": "claude-sonnet-4.5",
    "o3-mini": "claude-sonnet-4.5",
    "claude-sonnet-4.5": "claude-opus-4.5",
    "gpt-5.2": "claude-opus-4.5",
    "gemini-3-pro": "claude-opus-4.5",
    "claude-opus-4.5": "o3",  # Ultimate verification
    "o3": None,  # No higher verifier available
}

# ===============================================================================
# BUDGET ALTERNATIVES - When costs are constrained, use these replacements
# ===============================================================================

BUDGET_ALTERNATIVES: Dict[str, str] = {
    # Premium → Standard alternatives
    "claude-opus-4.5": "claude-sonnet-4.5",
    "o3": "o3-mini",
    "gpt-5.2": "o3-mini",
    "gemini-3-pro": "gemini-3-flash",
    # Standard → Budget alternatives
    "claude-sonnet-4.5": "claude-haiku-4.5",
    "claude-haiku-4.5": "deepseek-v3.2",
    "o3-mini": "deepseek-v3.2",
    "gpt-5-mini": "gpt-5-nano",
    "deepseek-v3.2": "gemini-3-flash",
    # Budget → Ultra-budget alternatives
    "gemini-3-flash": "gemini-3-flash-lite",
    "gpt-5-nano": "gemini-3-flash-lite",
}

# ===============================================================================
# ENSEMBLE CONFIGURATION - For high-stakes decisions
# ===============================================================================

# Task types that benefit from ensemble verification
HIGH_STAKES_TASKS: List[str] = [
    TaskType.CODE_GENERATION.value,
    TaskType.COMPLEX_REASONING.value,
    TaskType.MATH_SCIENCE.value,
    TaskType.VERIFICATION.value,
    TaskType.PLANNING.value,
]

# Ensemble strategies by task type
ENSEMBLE_STRATEGIES: Dict[str, List[str]] = {
    # For code: Claude Opus primary, GPT-5.2 verification
    TaskType.CODE_GENERATION.value: ["claude-opus-4.5", "gpt-5.2"],
    # For reasoning: o3 primary, Claude Opus verification
    TaskType.COMPLEX_REASONING.value: ["o3", "claude-opus-4.5"],
    # For math: GPT-5.2 primary, o3-mini verification
    TaskType.MATH_SCIENCE.value: ["gpt-5.2", "o3-mini"],
    # For verification: always use two different models
    TaskType.VERIFICATION.value: ["claude-sonnet-4.5", "gpt-5-mini"],
}


# ===============================================================================
# ROUTING CONFIGURATION
# ===============================================================================

@dataclass
class RoutingConfig:
    """Configuration for the model router."""
    # Cost limits (USD)
    daily_budget: float = 10.0
    per_request_max: float = 0.50
    premium_budget: float = 5.0  # Daily budget for premium models
    reasoning_budget: float = 3.0  # Budget for o3/extended thinking

    # Quality thresholds
    cascade_trigger_confidence: float = 0.7  # Below this, try next model
    min_acceptable_confidence: float = 0.5  # Below this, always escalate
    verification_threshold: float = 0.85  # High-stakes verification threshold
    ensemble_agreement_threshold: float = 0.8  # Models must agree this much

    # Caching
    enable_response_cache: bool = True
    cache_ttl_seconds: int = 3600  # 1 hour

    # Latency preferences
    max_latency_ms: int = 30000  # 30 seconds default
    prefer_fast_models: bool = False  # Set True for real-time apps
    extended_thinking_timeout_ms: int = 120000  # 2 min for o3

    # Feature flags
    enable_cascading: bool = True
    enable_ensemble: bool = False
    enable_verification: bool = True  # Enable verification cascade
    enable_speculative: bool = False
    enable_budget_fallback: bool = True  # Auto-downgrade when over budget

    # Task detection
    enable_auto_classification: bool = True
    classification_model: str = "gemini-3-flash-lite"  # Ultra cheap classifier


DEFAULT_CONFIG = RoutingConfig()


# ===============================================================================
# USAGE TRACKING
# ===============================================================================

@dataclass
class UsageRecord:
    """Record of a single model usage."""
    timestamp: str
    model_id: str
    task_type: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    latency_ms: int
    success: bool
    cascaded: bool = False
    cascade_depth: int = 0


class UsageTracker:
    """Tracks model usage and costs."""

    def __init__(self):
        self.records: List[Dict] = []
        self._load()

    def _load(self):
        """Load usage records from disk."""
        if USAGE_LOG_FILE.exists():
            try:
                data = json.loads(USAGE_LOG_FILE.read_text())
                self.records = data.get("records", [])
                # Keep only last 30 days
                cutoff = (datetime.now() - timedelta(days=30)).isoformat()
                self.records = [r for r in self.records if r.get("timestamp", "") > cutoff]
            except Exception:
                self.records = []

    def _save(self):
        """Save usage records to disk."""
        USAGE_LOG_FILE.write_text(json.dumps({
            "records": self.records[-10000:],  # Keep last 10k records
            "updated_at": datetime.now().isoformat()
        }, indent=2))

    def record(self, record: UsageRecord):
        """Record a usage event."""
        self.records.append({
            "timestamp": record.timestamp,
            "model_id": record.model_id,
            "task_type": record.task_type,
            "input_tokens": record.input_tokens,
            "output_tokens": record.output_tokens,
            "cost_usd": record.cost_usd,
            "latency_ms": record.latency_ms,
            "success": record.success,
            "cascaded": record.cascaded,
            "cascade_depth": record.cascade_depth,
        })
        self._save()

    def get_daily_cost(self) -> float:
        """Get total cost for today."""
        today = datetime.now().strftime("%Y-%m-%d")
        return sum(
            r.get("cost_usd", 0)
            for r in self.records
            if r.get("timestamp", "").startswith(today)
        )

    def get_daily_premium_cost(self) -> float:
        """Get premium model cost for today."""
        today = datetime.now().strftime("%Y-%m-%d")
        premium_models = {"claude-opus-4.5", "gpt-5.2", "gemini-3-pro"}
        return sum(
            r.get("cost_usd", 0)
            for r in self.records
            if r.get("timestamp", "").startswith(today)
            and r.get("model_id") in premium_models
        )

    def get_model_stats(self, days: int = 7) -> Dict[str, Any]:
        """Get usage statistics by model."""
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        recent = [r for r in self.records if r.get("timestamp", "") > cutoff]

        stats = {}
        for record in recent:
            model = record.get("model_id", "unknown")
            if model not in stats:
                stats[model] = {
                    "requests": 0,
                    "cost_usd": 0.0,
                    "avg_latency_ms": 0,
                    "success_rate": 0.0,
                    "total_latency": 0,
                    "successes": 0,
                }
            stats[model]["requests"] += 1
            stats[model]["cost_usd"] += record.get("cost_usd", 0)
            stats[model]["total_latency"] += record.get("latency_ms", 0)
            if record.get("success"):
                stats[model]["successes"] += 1

        for model, data in stats.items():
            if data["requests"] > 0:
                data["avg_latency_ms"] = data["total_latency"] // data["requests"]
                data["success_rate"] = data["successes"] / data["requests"]
            del data["total_latency"]
            del data["successes"]

        return stats


# ===============================================================================
# MODEL ROUTER
# ===============================================================================

class ModelRouter:
    """
    Intelligent model router for TinyPM.

    Implements:
    - Task-based routing to optimal models
    - Cost-aware cascading
    - Fallback chains for reliability
    - Usage tracking and budgeting
    """

    def __init__(self, config: RoutingConfig = None):
        """Initialize the model router."""
        self.config = config or DEFAULT_CONFIG
        self.usage_tracker = UsageTracker()
        self._response_cache: Dict[str, Tuple[str, float]] = {}  # cache_key -> (response, timestamp)

    def get_best_model(
        self,
        task_type: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Get the best model for a given task type.

        Args:
            task_type: Type of task (from TaskType enum values)
            context: Optional context dict with:
                - complexity: "low", "medium", "high"
                - urgency: "low", "normal", "high"
                - requires_vision: bool
                - max_tokens: int
                - budget_constrained: bool

        Returns:
            Model ID string (e.g., "claude-opus-4.5")
        """
        context = context or {}

        # Start with default route for task type
        primary_model = TASK_ROUTES.get(task_type, "claude-haiku-4.5")

        # Check budget constraints
        if context.get("budget_constrained"):
            primary_model = self._downgrade_for_budget(primary_model)

        # Check daily budget limits
        daily_cost = self.usage_tracker.get_daily_cost()
        if daily_cost >= self.config.daily_budget:
            primary_model = self._get_cheapest_model()

        premium_cost = self.usage_tracker.get_daily_premium_cost()
        model_config = MODELS.get(primary_model)
        if model_config and model_config.quality_tier == 1:
            if premium_cost >= self.config.premium_budget:
                primary_model = self._downgrade_from_premium(primary_model)

        # Adjust for complexity
        complexity = context.get("complexity", "medium")
        if complexity == "high" and model_config and model_config.quality_tier > 1:
            primary_model = self._upgrade_for_complexity(primary_model)
        elif complexity == "low" and model_config and model_config.quality_tier < 3:
            primary_model = self._downgrade_for_simplicity(primary_model)

        # Check for vision requirement
        if context.get("requires_vision"):
            if model_config and not model_config.supports_vision:
                primary_model = self._get_vision_model()

        # Check latency requirements
        urgency = context.get("urgency", "normal")
        if urgency == "high" or self.config.prefer_fast_models:
            if model_config and model_config.latency_class == "slow":
                primary_model = self._get_faster_alternative(primary_model)

        # Validate model exists
        if primary_model not in MODELS:
            primary_model = "claude-haiku-4.5"

        return primary_model

    def get_fallback_chain(self, primary_model: str) -> List[str]:
        """Get the fallback chain for a model."""
        return FALLBACK_CHAINS.get(primary_model, ["claude-haiku-4.5"])

    def get_cascade_chain(self) -> List[str]:
        """Get the cascade chain for quality escalation."""
        return CASCADE_CHAIN.copy()

    def calculate_cost(
        self,
        model_id: str,
        input_tokens: int,
        output_tokens: int
    ) -> float:
        """Calculate cost for a model call."""
        model = MODELS.get(model_id)
        if not model:
            return 0.0

        input_cost = (input_tokens / 1_000_000) * model.input_price
        output_cost = (output_tokens / 1_000_000) * model.output_price
        return round(input_cost + output_cost, 6)

    def record_usage(
        self,
        model_id: str,
        task_type: str,
        input_tokens: int,
        output_tokens: int,
        latency_ms: int,
        success: bool,
        cascaded: bool = False,
        cascade_depth: int = 0
    ):
        """Record a model usage for tracking."""
        cost = self.calculate_cost(model_id, input_tokens, output_tokens)

        record = UsageRecord(
            timestamp=datetime.now().isoformat(),
            model_id=model_id,
            task_type=task_type,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost,
            latency_ms=latency_ms,
            success=success,
            cascaded=cascaded,
            cascade_depth=cascade_depth,
        )
        self.usage_tracker.record(record)

    def get_usage_stats(self, days: int = 7) -> Dict[str, Any]:
        """Get usage statistics."""
        return {
            "daily_cost": self.usage_tracker.get_daily_cost(),
            "daily_premium_cost": self.usage_tracker.get_daily_premium_cost(),
            "model_stats": self.usage_tracker.get_model_stats(days),
            "budget_remaining": max(0, self.config.daily_budget - self.usage_tracker.get_daily_cost()),
            "premium_remaining": max(0, self.config.premium_budget - self.usage_tracker.get_daily_premium_cost()),
        }

    def should_cascade(self, confidence: float) -> bool:
        """Determine if response quality requires cascading to a better model."""
        if not self.config.enable_cascading:
            return False
        return confidence < self.config.cascade_trigger_confidence

    def get_next_cascade_model(self, current_model: str) -> Optional[str]:
        """Get the next model in the cascade chain."""
        try:
            current_index = CASCADE_CHAIN.index(current_model)
            if current_index < len(CASCADE_CHAIN) - 1:
                return CASCADE_CHAIN[current_index + 1]
        except ValueError:
            pass
        return None

    # =========================================================================
    # VERIFICATION CASCADE - January 2026 SOTA
    # =========================================================================

    def should_use_ensemble(self, task_type: str, context: Optional[Dict[str, Any]] = None) -> bool:
        """
        Determine if a task should use ensemble verification.

        High-stakes tasks benefit from multiple model verification.

        Args:
            task_type: The classified task type
            context: Optional context with:
                - high_stakes: bool - Force ensemble for critical tasks
                - confidence_required: float - Minimum confidence needed
                - financial: bool - Financial decisions always high stakes

        Returns:
            True if ensemble verification should be used
        """
        if not self.config.enable_ensemble:
            return False

        context = context or {}

        # Explicit high-stakes flag
        if context.get("high_stakes"):
            return True

        # Financial tasks always high stakes
        if context.get("financial"):
            return True

        # Check if task type is inherently high-stakes
        if task_type in HIGH_STAKES_TASKS:
            # For high-stakes tasks, use ensemble if complexity is high
            return context.get("complexity", "medium") == "high"

        return False

    def get_verification_model(self, primary_model: str) -> Optional[str]:
        """
        Get the verification model for a primary model.

        Used in verification cascade where a different model
        double-checks the primary model's output.

        Args:
            primary_model: The model that produced the initial output

        Returns:
            Model ID for verification, or None if no verifier available
        """
        if not self.config.enable_verification:
            return None

        return VERIFICATION_PAIRS.get(primary_model)

    def get_ensemble_models(self, task_type: str) -> List[str]:
        """
        Get the ensemble model set for a task type.

        Returns models optimized for cross-validation on specific task types.

        Args:
            task_type: The classified task type

        Returns:
            List of model IDs to use for ensemble (usually 2-3 models)
        """
        if task_type in ENSEMBLE_STRATEGIES:
            return ENSEMBLE_STRATEGIES[task_type].copy()

        # Default ensemble: primary route model + its verifier
        primary = TASK_ROUTES.get(task_type, "claude-haiku-4.5")
        verifier = VERIFICATION_PAIRS.get(primary)

        if verifier:
            return [primary, verifier]
        return [primary]

    def get_budget_alternative(self, model_id: str) -> str:
        """
        Get a cheaper alternative to a model.

        Used when budget constraints require downgrading.

        Args:
            model_id: The original model ID

        Returns:
            A cheaper alternative model ID
        """
        return BUDGET_ALTERNATIVES.get(model_id, model_id)

    def should_verify(self, task_type: str, confidence: float) -> bool:
        """
        Determine if output should be verified by another model.

        Args:
            task_type: The task type
            confidence: Confidence score of primary output (0-1)

        Returns:
            True if verification is recommended
        """
        if not self.config.enable_verification:
            return False

        # High-stakes tasks with low confidence always verify
        if task_type in HIGH_STAKES_TASKS:
            return confidence < self.config.verification_threshold

        # Other tasks verify only if below cascade trigger
        return confidence < self.config.cascade_trigger_confidence

    def estimate_request_cost(
        self,
        model_id: str,
        estimated_input_tokens: int,
        estimated_output_tokens: int,
        include_verification: bool = False
    ) -> float:
        """
        Estimate the cost of a request before making it.

        Useful for budget-aware routing decisions.

        Args:
            model_id: Model to use
            estimated_input_tokens: Estimated input token count
            estimated_output_tokens: Estimated output token count
            include_verification: Include verification model cost

        Returns:
            Estimated cost in USD
        """
        primary_cost = self.calculate_cost(model_id, estimated_input_tokens, estimated_output_tokens)

        if include_verification:
            verifier = self.get_verification_model(model_id)
            if verifier:
                # Verification typically uses same input + primary output as input
                verify_input = estimated_input_tokens + estimated_output_tokens
                verify_output = estimated_output_tokens // 2  # Shorter verification response
                primary_cost += self.calculate_cost(verifier, verify_input, verify_output)

        return primary_cost

    def get_optimal_model_for_budget(
        self,
        task_type: str,
        max_cost: float,
        estimated_tokens: int = 2000
    ) -> str:
        """
        Get the best model that fits within a budget.

        Args:
            task_type: The task type
            max_cost: Maximum cost in USD
            estimated_tokens: Estimated total tokens (input + output)

        Returns:
            Best model ID within budget
        """
        # Start with ideal model
        ideal_model = TASK_ROUTES.get(task_type, "claude-haiku-4.5")

        # Estimate cost (assume 70% input, 30% output)
        input_tokens = int(estimated_tokens * 0.7)
        output_tokens = int(estimated_tokens * 0.3)

        # Keep downgrading until we fit in budget
        current_model = ideal_model
        while True:
            cost = self.calculate_cost(current_model, input_tokens, output_tokens)
            if cost <= max_cost:
                return current_model

            # Try budget alternative
            alternative = self.get_budget_alternative(current_model)
            if alternative == current_model:
                # No cheaper alternative, return cheapest
                return "gemini-3-flash-lite"
            current_model = alternative

        return "gemini-3-flash-lite"

    # =========================================================================
    # PRIVATE HELPERS
    # =========================================================================

    def _downgrade_for_budget(self, model_id: str) -> str:
        """Downgrade to a cheaper model when budget constrained."""
        model = MODELS.get(model_id)
        if not model:
            return "gpt-5-nano"

        if model.quality_tier == 1:
            return "claude-haiku-4.5"
        elif model.quality_tier == 2:
            return "gpt-5-nano"
        return model_id

    def _downgrade_from_premium(self, model_id: str) -> str:
        """Downgrade from premium tier to standard tier."""
        downgrades = {
            "claude-opus-4.5": "claude-sonnet-4.5",
            "gpt-5.2": "gpt-5-mini",
            "gemini-3-pro": "gemini-3-flash",
        }
        return downgrades.get(model_id, "claude-haiku-4.5")

    def _upgrade_for_complexity(self, model_id: str) -> str:
        """Upgrade to a more capable model for complex tasks."""
        model = MODELS.get(model_id)
        if not model:
            return "claude-opus-4.5"

        if model.quality_tier == 3:
            return "claude-haiku-4.5"
        elif model.quality_tier == 2:
            return "claude-opus-4.5"
        return model_id

    def _downgrade_for_simplicity(self, model_id: str) -> str:
        """Downgrade to a cheaper model for simple tasks."""
        model = MODELS.get(model_id)
        if not model:
            return "gpt-5-nano"

        if model.quality_tier == 1:
            return "claude-haiku-4.5"
        elif model.quality_tier == 2:
            return "gpt-5-nano"
        return model_id

    def _get_cheapest_model(self) -> str:
        """Get the cheapest available model."""
        return "gpt-5-nano"

    def _get_vision_model(self) -> str:
        """Get a model that supports vision."""
        return "gemini-3-pro"

    def _get_faster_alternative(self, model_id: str) -> str:
        """Get a faster alternative to a slow model."""
        fast_alternatives = {
            "claude-opus-4.5": "claude-haiku-4.5",
            "gpt-5.2": "gpt-5-mini",
            "gemini-3-pro": "gemini-3-flash",
        }
        return fast_alternatives.get(model_id, model_id)


# ===============================================================================
# TASK CLASSIFIER
# ===============================================================================

@dataclass
class ClassificationResult:
    """Result of task classification with confidence scoring."""
    task_type: str
    confidence: float  # 0.0 to 1.0
    complexity: str    # "low", "medium", "high"
    alternative_types: List[Tuple[str, float]] = field(default_factory=list)  # Other possible types


class TaskClassifier:
    """
    Classify user requests into task types for routing.

    Uses keyword matching and pattern detection for fast classification.
    Includes confidence scoring for January 2026 SOTA routing.
    Can optionally use a small LLM for ambiguous cases.
    """

    # Keyword patterns for each task type (expanded for January 2026)
    PATTERNS = {
        TaskType.CODE_GENERATION.value: [
            "write code", "implement", "create function", "build", "code for",
            "generate code", "programming", "write a script", "create a class",
            "add feature", "new function", "write python", "write javascript",
            "typescript", "golang", "rust code", "api endpoint", "backend",
        ],
        TaskType.CODE_REVIEW.value: [
            "review code", "code review", "check this code", "review my",
            "improve this code", "optimize code", "refactor", "clean up code",
            "best practices", "code quality", "lint", "style guide",
        ],
        TaskType.DEBUGGING.value: [
            "debug", "fix bug", "error", "not working", "broken", "issue with",
            "why doesn't", "fails", "exception", "crash", "problem with code",
            "stack trace", "traceback", "undefined", "null pointer",
        ],
        TaskType.RESEARCH.value: [
            "research", "find out", "investigate", "look into", "explore",
            "deep dive", "comprehensive", "thorough analysis", "study",
            "state of the art", "sota", "benchmark", "compare options",
        ],
        TaskType.ANALYSIS.value: [
            "analyze", "analysis", "evaluate", "assess", "compare", "contrast",
            "pros and cons", "trade-offs", "implications", "metrics",
        ],
        TaskType.PLANNING.value: [
            "plan", "roadmap", "strategy", "approach", "how should we",
            "steps to", "design", "architect", "outline", "milestones",
        ],
        TaskType.QUICK_STATUS.value: [
            "status", "update", "progress", "where are we", "how's it going",
            "quick check", "brief update", "tldr",
        ],
        TaskType.EMAIL_DRAFT.value: [
            "email", "draft", "write to", "respond to", "message to",
            "compose", "letter", "send to", "reply", "followup",
        ],
        TaskType.SUMMARIZATION.value: [
            "summarize", "summary", "tldr", "brief", "condense", "shorten",
            "key points", "main takeaways", "highlights", "executive summary",
        ],
        TaskType.DOCUMENT_ANALYSIS.value: [
            "document", "pdf", "file", "attachment", "uploaded", "this file",
            "extract from", "parse", "read this", "analyze this document",
        ],
        TaskType.VISION.value: [
            "image", "picture", "photo", "screenshot", "diagram", "visual",
            "look at this", "what's in this", "describe this image", "ocr",
        ],
        TaskType.AGENTIC_TASK.value: [
            "do this for me", "take action", "execute", "run", "perform",
            "automate", "handle this", "take care of", "complete this task",
        ],
        TaskType.MEMORY_QUERY.value: [
            "remember", "recall", "what did we", "previously", "earlier",
            "last time", "history", "past conversation", "we discussed",
        ],
        # New January 2026 task types
        TaskType.COMPLEX_REASONING.value: [
            "puzzle", "logic", "reasoning", "deduce", "infer", "figure out",
            "arc-agi", "novel problem", "abstract", "pattern recognition",
            "sequence", "solve this", "brain teaser", "riddle",
        ],
        TaskType.MATH_SCIENCE.value: [
            "calculate", "math", "equation", "formula", "physics", "chemistry",
            "proof", "theorem", "integral", "derivative", "statistics",
            "scientific", "aime", "olympiad", "computation", "numerical",
        ],
        TaskType.CREATIVE_WRITING.value: [
            "story", "creative", "fiction", "narrative", "poem", "poetry",
            "novel", "character", "plot", "dialogue", "marketing copy",
            "slogan", "tagline", "blog post", "article", "content",
        ],
        TaskType.LONG_DOCUMENT.value: [
            "long document", "book", "thesis", "report", "paper",
            "100 pages", "entire document", "full text", "complete analysis",
            "comprehensive review", "all chapters",
        ],
        TaskType.COMPUTER_USE.value: [
            "browser", "click", "type", "navigate", "website", "automation",
            "gui", "interface", "screen", "mouse", "keyboard", "web scraping",
            "form fill", "login", "download",
        ],
        TaskType.VERIFICATION.value: [
            "verify", "check", "validate", "confirm", "double check",
            "is this correct", "fact check", "review output", "quality check",
        ],
        TaskType.CLASSIFICATION.value: [
            "classify", "categorize", "tag", "label", "sort", "bucket",
            "which category", "type of", "kind of",
        ],
    }

    def classify(self, text: str) -> str:
        """
        Classify a user request into a task type.

        Args:
            text: The user's request text

        Returns:
            Task type string (from TaskType enum values)
        """
        result = self.classify_with_confidence(text)
        return result.task_type

    def classify_with_confidence(self, text: str) -> ClassificationResult:
        """
        Classify a user request with confidence scoring.

        January 2026 SOTA: Returns confidence score for routing decisions.
        Low confidence may trigger LLM-based classification or ensemble.

        Args:
            text: The user's request text

        Returns:
            ClassificationResult with task_type, confidence, and alternatives
        """
        text_lower = text.lower()

        # Score each task type based on keyword matches
        scores = {}
        for task_type, patterns in self.PATTERNS.items():
            score = sum(1 for pattern in patterns if pattern in text_lower)
            if score > 0:
                # Weight by number of patterns to normalize
                normalized_score = score / len(patterns)
                scores[task_type] = (score, normalized_score)

        if scores:
            # Sort by raw score, then by normalized
            sorted_scores = sorted(
                scores.items(),
                key=lambda x: (x[1][0], x[1][1]),
                reverse=True
            )

            best_match = sorted_scores[0]
            best_type = best_match[0]
            best_raw_score = best_match[1][0]
            best_normalized = best_match[1][1]

            # Calculate confidence based on:
            # 1. Raw match count (more matches = more confident)
            # 2. Gap to second best (bigger gap = more confident)
            # 3. Normalized score (higher = more confident)
            base_confidence = min(0.5 + (best_raw_score * 0.1), 0.9)

            if len(sorted_scores) > 1:
                second_raw = sorted_scores[1][1][0]
                gap = best_raw_score - second_raw
                if gap >= 2:
                    base_confidence = min(base_confidence + 0.1, 0.95)
                elif gap == 0:
                    base_confidence = max(base_confidence - 0.15, 0.4)

            # Build alternatives list
            alternatives = [
                (item[0], min(0.3 + item[1][1], 0.8))
                for item in sorted_scores[1:4]
            ]

            complexity = self.get_complexity(text)

            return ClassificationResult(
                task_type=best_type,
                confidence=round(base_confidence, 2),
                complexity=complexity,
                alternative_types=alternatives,
            )

        # No keyword matches - fall back to heuristics
        complexity = self.get_complexity(text)

        # Check for questions (simple vs complex)
        if "?" in text:
            if len(text) < 100 and not any(
                word in text_lower
                for word in ["explain", "why", "how does", "what is the difference"]
            ):
                return ClassificationResult(
                    task_type=TaskType.SIMPLE_CHAT.value,
                    confidence=0.6,
                    complexity=complexity,
                )
            return ClassificationResult(
                task_type=TaskType.COMPLEX_CHAT.value,
                confidence=0.55,
                complexity=complexity,
            )

        # Default based on length
        if len(text) < 50:
            return ClassificationResult(
                task_type=TaskType.SIMPLE_CHAT.value,
                confidence=0.5,
                complexity=complexity,
            )

        return ClassificationResult(
            task_type=TaskType.COMPLEX_CHAT.value,
            confidence=0.45,
            complexity=complexity,
        )

    def get_complexity(self, text: str) -> str:
        """
        Estimate task complexity.

        Returns:
            "low", "medium", or "high"
        """
        text_lower = text.lower()

        # High complexity indicators
        high_indicators = [
            "complex", "complicated", "difficult", "thorough", "comprehensive",
            "detailed", "all aspects", "deep", "advanced", "sophisticated",
            "enterprise", "production", "scalable", "architecture",
            "system design", "distributed", "concurrent", "optimization",
        ]

        # Low complexity indicators
        low_indicators = [
            "simple", "quick", "brief", "easy", "basic", "straightforward",
            "just", "only", "small", "minor", "tiny", "hello", "hi",
        ]

        high_score = sum(1 for ind in high_indicators if ind in text_lower)
        low_score = sum(1 for ind in low_indicators if ind in text_lower)

        # Also consider length
        if len(text) > 500:
            high_score += 2
        elif len(text) > 200:
            high_score += 1
        elif len(text) < 50:
            low_score += 1
        elif len(text) < 20:
            low_score += 2

        # Code blocks suggest higher complexity
        if "```" in text or "def " in text or "function " in text:
            high_score += 1

        if high_score > low_score + 1:
            return "high"
        elif low_score > high_score + 1:
            return "low"
        return "medium"


# ===============================================================================
# CONVENIENCE FUNCTIONS
# ===============================================================================

# Global router instance
_router: Optional[ModelRouter] = None
_classifier: Optional[TaskClassifier] = None


def get_router() -> ModelRouter:
    """Get or create the global ModelRouter instance."""
    global _router
    if _router is None:
        _router = ModelRouter()
    return _router


def get_classifier() -> TaskClassifier:
    """Get or create the global TaskClassifier instance."""
    global _classifier
    if _classifier is None:
        _classifier = TaskClassifier()
    return _classifier


def get_best_model(
    task_type: str,
    context: Optional[Dict[str, Any]] = None
) -> str:
    """
    Get the best model for a task type.

    This is the main entry point for model selection.

    Args:
        task_type: Type of task (e.g., "code_generation", "simple_chat")
        context: Optional context dict (see ModelRouter.get_best_model)

    Returns:
        Model ID string (e.g., "claude-opus-4.5")

    Example:
        model = get_best_model("code_review", {"complexity": "high"})
        # Returns: "claude-opus-4.5"

        model = get_best_model("quick_status")
        # Returns: "gpt-5-nano"
    """
    return get_router().get_best_model(task_type, context)


def classify_and_route(text: str) -> Tuple[str, str]:
    """
    Classify a request and get the best model in one call.

    Args:
        text: User's request text

    Returns:
        Tuple of (task_type, model_id)

    Example:
        task_type, model = classify_and_route("Write a Python function to sort a list")
        # Returns: ("code_generation", "claude-opus-4.5")
    """
    classifier = get_classifier()
    task_type = classifier.classify(text)
    complexity = classifier.get_complexity(text)

    context = {"complexity": complexity}
    model = get_best_model(task_type, context)

    return task_type, model


def classify_and_route_with_confidence(text: str) -> Dict[str, Any]:
    """
    Classify a request with full confidence scoring and routing info.

    January 2026 SOTA: Returns detailed classification for smart routing.

    Args:
        text: User's request text

    Returns:
        Dict with:
            - task_type: Primary classified task type
            - model: Recommended model ID
            - confidence: Classification confidence (0-1)
            - complexity: Estimated complexity
            - alternatives: Alternative task types with confidence
            - verification_model: Model for verification (if applicable)
            - should_verify: Whether verification is recommended
            - ensemble_models: Models for ensemble (if enabled)

    Example:
        result = classify_and_route_with_confidence(
            "Solve this complex math olympiad problem..."
        )
        # Returns:
        # {
        #     "task_type": "math_science",
        #     "model": "gpt-5.2",
        #     "confidence": 0.85,
        #     "complexity": "high",
        #     "alternatives": [("complex_reasoning", 0.7)],
        #     "verification_model": "claude-opus-4.5",
        #     "should_verify": True,
        #     "ensemble_models": ["gpt-5.2", "o3-mini"]
        # }
    """
    classifier = get_classifier()
    router = get_router()

    result = classifier.classify_with_confidence(text)

    context = {"complexity": result.complexity}
    model = router.get_best_model(result.task_type, context)

    verification_model = router.get_verification_model(model)
    should_verify = router.should_verify(result.task_type, result.confidence)
    should_ensemble = router.should_use_ensemble(result.task_type, context)
    ensemble_models = router.get_ensemble_models(result.task_type) if should_ensemble else []

    return {
        "task_type": result.task_type,
        "model": model,
        "confidence": result.confidence,
        "complexity": result.complexity,
        "alternatives": result.alternative_types,
        "verification_model": verification_model,
        "should_verify": should_verify,
        "should_ensemble": should_ensemble,
        "ensemble_models": ensemble_models,
    }


def get_verification_model(model_id: str) -> Optional[str]:
    """Get the verification model for a primary model."""
    return get_router().get_verification_model(model_id)


def get_budget_alternative(model_id: str) -> str:
    """Get a cheaper alternative to a model."""
    return get_router().get_budget_alternative(model_id)


def should_use_ensemble(task_type: str, context: Optional[Dict[str, Any]] = None) -> bool:
    """Check if ensemble verification should be used for a task."""
    return get_router().should_use_ensemble(task_type, context)


def get_ensemble_models(task_type: str) -> List[str]:
    """Get the ensemble model set for a task type."""
    return get_router().get_ensemble_models(task_type)


def get_model_info(model_id: str) -> Optional[Dict[str, Any]]:
    """
    Get information about a model.

    Args:
        model_id: Model ID string

    Returns:
        Dict with model configuration or None if not found
    """
    model = MODELS.get(model_id)
    if not model:
        return None

    return {
        "id": model.id,
        "provider": model.provider,
        "input_price": model.input_price,
        "output_price": model.output_price,
        "context_window": model.context_window,
        "strengths": model.strengths,
        "latency_class": model.latency_class,
        "quality_tier": model.quality_tier,
        "supports_vision": model.supports_vision,
        "supports_tools": model.supports_tools,
    }


def get_usage_stats(days: int = 7) -> Dict[str, Any]:
    """Get usage statistics for the router."""
    return get_router().get_usage_stats(days)


def list_available_models() -> List[str]:
    """List all available model IDs."""
    return list(MODELS.keys())


def list_task_types() -> List[str]:
    """List all supported task types."""
    return [t.value for t in TaskType]


# ===============================================================================
# CLI INTERFACE
# ===============================================================================

def main():
    """CLI interface for the model router."""
    import argparse

    parser = argparse.ArgumentParser(
        description="TinyPM Model Router - January 2026 SOTA Edition",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python model_router.py --route code_generation
  python model_router.py --classify "Write a Python sorting algorithm"
  python model_router.py --classify-full "Solve this math olympiad problem"
  python model_router.py --verify claude-haiku-4.5
  python model_router.py --ensemble code_generation
  python model_router.py --models
  python model_router.py --benchmark

Optimal Routing (January 2026 Research):
  - Code generation   -> Claude Opus 4.5 (80.9% SWE-bench)
  - Math/Science      -> GPT-5.2 (100% AIME 2025)
  - Agents/Tool Use   -> Claude Haiku 4.5 (50.7% OSWorld)
  - Long documents    -> Gemini 3 Flash (1M context, $0.08/1M)
  - Complex reasoning -> o3 (88% ARC-AGI)
"""
    )
    parser.add_argument("--route", type=str, help="Get model for task type")
    parser.add_argument("--classify", type=str, help="Classify text and get model")
    parser.add_argument("--classify-full", type=str, dest="classify_full",
                        help="Classify with full confidence and routing info")
    parser.add_argument("--stats", action="store_true", help="Show usage statistics")
    parser.add_argument("--models", action="store_true", help="List available models")
    parser.add_argument("--tasks", action="store_true", help="List task types")
    parser.add_argument("--info", type=str, help="Get info about a model")
    parser.add_argument("--verify", type=str, help="Get verification model for a model")
    parser.add_argument("--budget-alt", type=str, dest="budget_alt",
                        help="Get budget alternative for a model")
    parser.add_argument("--ensemble", type=str, help="Get ensemble models for task type")
    parser.add_argument("--benchmark", action="store_true",
                        help="Show benchmark reference for all models")

    args = parser.parse_args()

    if args.route:
        model = get_best_model(args.route)
        print(f"Task: {args.route}")
        print(f"Model: {model}")
        info = get_model_info(model)
        if info:
            print(f"Provider: {info['provider']}")
            print(f"Tier: {info['quality_tier']}")
            print(f"Pricing: ${info['input_price']}/{info['output_price']} per 1M tokens")

        # Show verification cascade
        verify = get_verification_model(model)
        if verify:
            print(f"Verification Model: {verify}")

    elif args.classify:
        task_type, model = classify_and_route(args.classify)
        print(f"Text: {args.classify[:50]}...")
        print(f"Task Type: {task_type}")
        print(f"Model: {model}")

    elif args.classify_full:
        result = classify_and_route_with_confidence(args.classify_full)
        print(f"Text: {args.classify_full[:60]}...")
        print("-" * 50)
        print(f"Task Type: {result['task_type']}")
        print(f"Confidence: {result['confidence']:.0%}")
        print(f"Complexity: {result['complexity']}")
        print(f"Model: {result['model']}")
        if result['alternatives']:
            print(f"Alternative Types: {result['alternatives']}")
        if result['verification_model']:
            print(f"Verification Model: {result['verification_model']}")
        print(f"Should Verify: {result['should_verify']}")
        if result['should_ensemble']:
            print(f"Ensemble Models: {result['ensemble_models']}")

    elif args.stats:
        stats = get_usage_stats()
        print("=" * 50)
        print("Model Router Usage Statistics")
        print("=" * 50)
        print(f"Daily Cost: ${stats['daily_cost']:.4f}")
        print(f"Daily Premium Cost: ${stats['daily_premium_cost']:.4f}")
        print(f"Budget Remaining: ${stats['budget_remaining']:.4f}")
        print(f"Premium Remaining: ${stats['premium_remaining']:.4f}")
        print("\nModel Stats (7 days):")
        for model_id, model_stats in stats['model_stats'].items():
            print(f"  {model_id}:")
            print(f"    Requests: {model_stats['requests']}")
            print(f"    Cost: ${model_stats['cost_usd']:.4f}")
            print(f"    Avg Latency: {model_stats['avg_latency_ms']}ms")
            print(f"    Success Rate: {model_stats['success_rate']:.1%}")

    elif args.models:
        print("Available Models (January 2026 SOTA):")
        print("=" * 70)

        # Group by tier
        tiers = {1: "PREMIUM", 2: "STANDARD", 3: "BUDGET"}
        for tier in [1, 2, 3]:
            tier_models = {k: v for k, v in MODELS.items() if v.quality_tier == tier}
            if tier_models:
                print(f"\n{tiers[tier]} TIER:")
                print("-" * 70)
                for model_id, config in tier_models.items():
                    print(f"  {model_id}")
                    print(f"    Provider: {config.provider}")
                    print(f"    Latency: {config.latency_class}")
                    print(f"    Pricing: ${config.input_price}/${config.output_price} per 1M tokens")
                    print(f"    Context: {config.context_window:,} tokens")
                    print(f"    Vision: {'Yes' if config.supports_vision else 'No'}")
                    print()

    elif args.tasks:
        print("Supported Task Types (January 2026):")
        print("=" * 60)
        for task_type in TaskType:
            model = TASK_ROUTES.get(task_type.value, "unknown")
            print(f"  {task_type.value:25} -> {model}")

    elif args.info:
        info = get_model_info(args.info)
        if info:
            print(f"Model: {info['id']}")
            print(f"Provider: {info['provider']}")
            print(f"Quality Tier: {info['quality_tier']}")
            print(f"Latency Class: {info['latency_class']}")
            print(f"Context Window: {info['context_window']:,} tokens")
            print(f"Input Price: ${info['input_price']} per 1M tokens")
            print(f"Output Price: ${info['output_price']} per 1M tokens")
            print(f"Vision: {info['supports_vision']}")
            print(f"Tools: {info['supports_tools']}")
            print(f"Strengths: {', '.join(info['strengths'])}")

            # Show verification and budget info
            verify = VERIFICATION_PAIRS.get(args.info)
            budget = BUDGET_ALTERNATIVES.get(args.info)
            if verify:
                print(f"Verification Model: {verify}")
            if budget and budget != args.info:
                print(f"Budget Alternative: {budget}")
        else:
            print(f"Model not found: {args.info}")

    elif args.verify:
        verify = get_verification_model(args.verify)
        if verify:
            print(f"Primary Model: {args.verify}")
            print(f"Verification Model: {verify}")
            verify_info = get_model_info(verify)
            if verify_info:
                print(f"Verifier Provider: {verify_info['provider']}")
                print(f"Verifier Pricing: ${verify_info['input_price']}/{verify_info['output_price']} per 1M")
        else:
            print(f"No verification model configured for: {args.verify}")

    elif args.budget_alt:
        alt = get_budget_alternative(args.budget_alt)
        print(f"Original Model: {args.budget_alt}")
        print(f"Budget Alternative: {alt}")
        if alt != args.budget_alt:
            orig_info = get_model_info(args.budget_alt)
            alt_info = get_model_info(alt)
            if orig_info and alt_info:
                savings = (1 - (alt_info['input_price'] / orig_info['input_price'])) * 100
                print(f"Cost Savings: ~{savings:.0f}%")

    elif args.ensemble:
        models = get_ensemble_models(args.ensemble)
        print(f"Task Type: {args.ensemble}")
        print(f"Ensemble Models: {models}")
        total_input_cost = sum(get_model_info(m)['input_price'] for m in models if get_model_info(m))
        print(f"Combined Input Cost: ${total_input_cost:.2f} per 1M tokens")

    elif args.benchmark:
        print("=" * 70)
        print("January 2026 Model Benchmark Reference")
        print("=" * 70)
        print()
        print("CODING BENCHMARKS:")
        print("  SWE-bench Verified:")
        print("    - Claude Opus 4.5: 80.9% (LEADER)")
        print("    - GPT-5.2: ~75%")
        print("    - DeepSeek V3.2: ~65%")
        print()
        print("REASONING BENCHMARKS:")
        print("  ARC-AGI:")
        print("    - o3: 88% (LEADER)")
        print("    - Claude Opus 4.5: ~75%")
        print("    - o3-mini: ~70%")
        print()
        print("MATH BENCHMARKS:")
        print("  AIME 2025:")
        print("    - GPT-5.2: 100% (LEADER)")
        print("    - o3: ~95%")
        print("    - Claude Opus 4.5: ~90%")
        print()
        print("AGENT BENCHMARKS:")
        print("  OSWorld:")
        print("    - Claude Haiku 4.5: 50.7% (LEADER)")
        print("    - GPT-5-mini: ~35%")
        print()
        print("COST EFFICIENCY:")
        print("  Budget Champions:")
        print("    - Gemini 3 Flash Lite: $0.02/$0.10 per 1M (classification)")
        print("    - Gemini 3 Flash: $0.08/$0.40 per 1M (long docs)")
        print("    - DeepSeek V3.2: $0.14/$0.28 per 1M (balanced)")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
