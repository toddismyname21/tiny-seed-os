#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
MODEL ROUTER INTEGRATION - Bridge between web_server.py and model_router.py
═══════════════════════════════════════════════════════════════════════════════

This module provides a unified interface for making LLM calls that:
1. Classifies the task type from the user's message
2. Routes to the optimal model based on January 2026 benchmarks
3. Tracks usage and calculates cost savings
4. Falls back gracefully if routing fails

Usage:
    from model_router_integration import routed_chat, get_model_stats

    # Instead of direct Anthropic call:
    response = routed_chat(message, history, system_prompt)

    # Get statistics:
    stats = get_model_stats()

Cost Savings Calculation:
    - Baseline: All calls use claude-sonnet-4 ($3/$15 per 1M tokens)
    - With routing: Simple chats use gpt-5-nano ($0.05/$0.40 per 1M tokens)
    - Expected savings: 26-70% based on task distribution
"""

import json
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple

# Import the model router
from model_router import (
    get_router,
    get_classifier,
    classify_and_route_with_confidence,
    get_model_info,
    get_usage_stats,
    TaskType,
    MODELS,
)

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

APP_DIR = Path(__file__).parent
INTEGRATION_STATE_FILE = APP_DIR / ".model_router_integration.json"
COST_LOG_FILE = APP_DIR / ".model_cost_savings.json"

# Baseline model for cost comparison (what we'd use without routing)
BASELINE_MODEL = "claude-sonnet-4-20250514"
BASELINE_INPUT_PRICE = 3.00  # per 1M tokens
BASELINE_OUTPUT_PRICE = 15.00  # per 1M tokens

# Model mapping: Our router model IDs -> Anthropic API model names
# Currently, we only have Anthropic available, so we map all recommendations
# to the closest Anthropic model
MODEL_MAP = {
    # Premium tier
    "claude-opus-4.5": "claude-sonnet-4-20250514",  # Would use Opus if available
    "gpt-5.2": "claude-sonnet-4-20250514",  # Cross-provider not available
    "o3": "claude-sonnet-4-20250514",
    "gemini-3-pro": "claude-sonnet-4-20250514",

    # Standard tier - these we can actually route to different models
    "claude-sonnet-4.5": "claude-sonnet-4-20250514",
    "claude-haiku-4.5": "claude-haiku-3-20240307",  # Use Haiku for speed
    "o3-mini": "claude-haiku-3-20240307",
    "gpt-5-mini": "claude-haiku-3-20240307",
    "deepseek-v3.2": "claude-haiku-3-20240307",

    # Budget tier - route to Haiku for cost savings
    "gemini-3-flash": "claude-haiku-3-20240307",
    "gemini-3-flash-lite": "claude-haiku-3-20240307",
    "gpt-5-nano": "claude-haiku-3-20240307",
}

# Anthropic model pricing (actual prices)
ANTHROPIC_PRICES = {
    "claude-sonnet-4-20250514": {"input": 3.00, "output": 15.00},
    "claude-haiku-3-20240307": {"input": 0.25, "output": 1.25},
}


# ═══════════════════════════════════════════════════════════════════════════════
# COST TRACKING
# ═══════════════════════════════════════════════════════════════════════════════

class CostTracker:
    """Track costs and calculate savings from model routing."""

    def __init__(self):
        self.records: List[Dict] = []
        self._load()

    def _load(self):
        """Load cost records from disk."""
        if COST_LOG_FILE.exists():
            try:
                data = json.loads(COST_LOG_FILE.read_text())
                self.records = data.get("records", [])
                # Keep only last 30 days
                cutoff = (datetime.now() - timedelta(days=30)).isoformat()
                self.records = [r for r in self.records if r.get("timestamp", "") > cutoff]
            except Exception:
                self.records = []

    def _save(self):
        """Save cost records to disk."""
        COST_LOG_FILE.write_text(json.dumps({
            "records": self.records[-10000:],
            "updated_at": datetime.now().isoformat()
        }, indent=2))

    def record(
        self,
        task_type: str,
        recommended_model: str,
        actual_model: str,
        input_tokens: int,
        output_tokens: int,
        latency_ms: int,
        success: bool
    ):
        """Record a call with cost comparison."""
        # Calculate actual cost
        prices = ANTHROPIC_PRICES.get(actual_model, {"input": 3.0, "output": 15.0})
        actual_cost = (input_tokens / 1_000_000) * prices["input"] + \
                     (output_tokens / 1_000_000) * prices["output"]

        # Calculate baseline cost (if we used Sonnet for everything)
        baseline_cost = (input_tokens / 1_000_000) * BASELINE_INPUT_PRICE + \
                       (output_tokens / 1_000_000) * BASELINE_OUTPUT_PRICE

        # Calculate savings
        savings = baseline_cost - actual_cost
        savings_pct = (savings / baseline_cost * 100) if baseline_cost > 0 else 0

        record = {
            "timestamp": datetime.now().isoformat(),
            "task_type": task_type,
            "recommended_model": recommended_model,
            "actual_model": actual_model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "latency_ms": latency_ms,
            "success": success,
            "actual_cost_usd": round(actual_cost, 6),
            "baseline_cost_usd": round(baseline_cost, 6),
            "savings_usd": round(savings, 6),
            "savings_pct": round(savings_pct, 2),
        }

        self.records.append(record)
        self._save()

        return record

    def get_stats(self, days: int = 7) -> Dict[str, Any]:
        """Get comprehensive statistics."""
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        recent = [r for r in self.records if r.get("timestamp", "") > cutoff]

        if not recent:
            return {
                "period_days": days,
                "total_calls": 0,
                "total_actual_cost": 0.0,
                "total_baseline_cost": 0.0,
                "total_savings": 0.0,
                "savings_percentage": 0.0,
                "by_task_type": {},
                "by_model": {},
            }

        total_actual = sum(r.get("actual_cost_usd", 0) for r in recent)
        total_baseline = sum(r.get("baseline_cost_usd", 0) for r in recent)
        total_savings = sum(r.get("savings_usd", 0) for r in recent)

        # Stats by task type
        by_task = {}
        for r in recent:
            task = r.get("task_type", "unknown")
            if task not in by_task:
                by_task[task] = {"calls": 0, "savings": 0.0, "cost": 0.0}
            by_task[task]["calls"] += 1
            by_task[task]["savings"] += r.get("savings_usd", 0)
            by_task[task]["cost"] += r.get("actual_cost_usd", 0)

        # Stats by model
        by_model = {}
        for r in recent:
            model = r.get("actual_model", "unknown")
            if model not in by_model:
                by_model[model] = {"calls": 0, "cost": 0.0, "avg_latency": 0, "total_latency": 0}
            by_model[model]["calls"] += 1
            by_model[model]["cost"] += r.get("actual_cost_usd", 0)
            by_model[model]["total_latency"] += r.get("latency_ms", 0)

        # Calculate averages
        for model, data in by_model.items():
            if data["calls"] > 0:
                data["avg_latency"] = data["total_latency"] // data["calls"]
            del data["total_latency"]

        return {
            "period_days": days,
            "total_calls": len(recent),
            "total_actual_cost": round(total_actual, 4),
            "total_baseline_cost": round(total_baseline, 4),
            "total_savings": round(total_savings, 4),
            "savings_percentage": round(
                (total_savings / total_baseline * 100) if total_baseline > 0 else 0,
                1
            ),
            "by_task_type": by_task,
            "by_model": by_model,
        }

    def get_today_stats(self) -> Dict[str, Any]:
        """Get today's statistics."""
        today = datetime.now().strftime("%Y-%m-%d")
        today_records = [r for r in self.records if r.get("timestamp", "").startswith(today)]

        total_actual = sum(r.get("actual_cost_usd", 0) for r in today_records)
        total_baseline = sum(r.get("baseline_cost_usd", 0) for r in today_records)
        total_savings = sum(r.get("savings_usd", 0) for r in today_records)

        return {
            "date": today,
            "calls": len(today_records),
            "actual_cost": round(total_actual, 4),
            "baseline_cost": round(total_baseline, 4),
            "savings": round(total_savings, 4),
            "savings_percentage": round(
                (total_savings / total_baseline * 100) if total_baseline > 0 else 0,
                1
            ),
        }


# Global tracker instance
_cost_tracker: Optional[CostTracker] = None

def get_cost_tracker() -> CostTracker:
    """Get or create the global CostTracker instance."""
    global _cost_tracker
    if _cost_tracker is None:
        _cost_tracker = CostTracker()
    return _cost_tracker


# ═══════════════════════════════════════════════════════════════════════════════
# ROUTED CHAT FUNCTION
# ═══════════════════════════════════════════════════════════════════════════════

def routed_chat(
    client,  # Anthropic client
    message: str,
    history: List[Dict] = None,
    system_prompt: str = "",
    max_tokens: int = 1000,
    tools: List[Dict] = None,
    force_model: str = None,
) -> Tuple[Any, Dict[str, Any]]:
    """
    Make a routed chat call using the model router.

    Args:
        client: Anthropic client instance
        message: User's message
        history: Conversation history (list of {"role": str, "content": str})
        system_prompt: System prompt
        max_tokens: Maximum tokens in response
        tools: Optional tools for tool_use
        force_model: Override routing and use this model

    Returns:
        Tuple of (response, routing_info)
        - response: The Anthropic API response object
        - routing_info: Dict with routing details and cost info
    """
    history = history or []

    # Get routing recommendation
    routing_result = classify_and_route_with_confidence(message)
    task_type = routing_result["task_type"]
    recommended_model = routing_result["model"]
    confidence = routing_result["confidence"]
    complexity = routing_result["complexity"]

    # Map to actual Anthropic model
    if force_model:
        actual_model = force_model
    else:
        actual_model = MODEL_MAP.get(recommended_model, "claude-sonnet-4-20250514")

    # Build messages
    messages = []
    for h in history[-8:]:
        role = h.get("role", "user")
        content = h.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    # Make the API call
    start_time = time.time()

    try:
        call_kwargs = {
            "model": actual_model,
            "max_tokens": max_tokens,
            "messages": messages,
        }

        if system_prompt:
            call_kwargs["system"] = system_prompt

        if tools:
            call_kwargs["tools"] = tools

        response = client.messages.create(**call_kwargs)

        latency_ms = int((time.time() - start_time) * 1000)

        # Extract token counts from response
        input_tokens = response.usage.input_tokens if hasattr(response, 'usage') else 0
        output_tokens = response.usage.output_tokens if hasattr(response, 'usage') else 0

        # Record usage
        tracker = get_cost_tracker()
        cost_record = tracker.record(
            task_type=task_type,
            recommended_model=recommended_model,
            actual_model=actual_model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=latency_ms,
            success=True
        )

        # Also record in model router's usage tracker
        router = get_router()
        router.record_usage(
            model_id=recommended_model,
            task_type=task_type,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=latency_ms,
            success=True
        )

        routing_info = {
            "task_type": task_type,
            "confidence": confidence,
            "complexity": complexity,
            "recommended_model": recommended_model,
            "actual_model": actual_model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "latency_ms": latency_ms,
            "cost_usd": cost_record["actual_cost_usd"],
            "savings_usd": cost_record["savings_usd"],
            "savings_pct": cost_record["savings_pct"],
        }

        return response, routing_info

    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)

        # Record failed attempt
        tracker = get_cost_tracker()
        tracker.record(
            task_type=task_type,
            recommended_model=recommended_model,
            actual_model=actual_model,
            input_tokens=0,
            output_tokens=0,
            latency_ms=latency_ms,
            success=False
        )

        raise


def routed_simple_call(
    client,
    prompt: str,
    max_tokens: int = 1000,
    force_model: str = None,
) -> Tuple[str, Dict[str, Any]]:
    """
    Simple single-prompt call with routing.

    Args:
        client: Anthropic client instance
        prompt: The prompt/message
        max_tokens: Maximum tokens
        force_model: Override routing

    Returns:
        Tuple of (response_text, routing_info)
    """
    response, routing_info = routed_chat(
        client=client,
        message=prompt,
        max_tokens=max_tokens,
        force_model=force_model
    )

    text = response.content[0].text if response.content else ""
    return text, routing_info


# ═══════════════════════════════════════════════════════════════════════════════
# STATS API
# ═══════════════════════════════════════════════════════════════════════════════

def get_model_stats(days: int = 7) -> Dict[str, Any]:
    """
    Get comprehensive model usage and cost savings statistics.

    Returns dict with:
        - today: Today's stats
        - period: Stats for the specified period
        - router_stats: Stats from the model router
        - task_distribution: How tasks are distributed
        - model_usage: Which models are being used
        - cost_breakdown: Detailed cost info
        - recommendations: Suggestions for optimization
    """
    tracker = get_cost_tracker()
    router = get_router()

    today_stats = tracker.get_today_stats()
    period_stats = tracker.get_stats(days)
    router_stats = router.get_usage_stats(days)

    # Calculate task distribution
    task_dist = period_stats.get("by_task_type", {})
    total_calls = period_stats.get("total_calls", 1)
    task_distribution = {
        task: {
            "count": data["calls"],
            "percentage": round(data["calls"] / total_calls * 100, 1) if total_calls > 0 else 0,
            "savings": round(data["savings"], 4)
        }
        for task, data in task_dist.items()
    }

    # Generate recommendations
    recommendations = []

    if period_stats["savings_percentage"] < 20:
        recommendations.append(
            "Low savings rate. Consider adding more simple chat endpoints to capture quick queries."
        )

    if period_stats["savings_percentage"] > 50:
        recommendations.append(
            "Excellent savings! The model router is working well for your task mix."
        )

    # Check for high-cost task types
    for task, data in task_dist.items():
        if data["calls"] > 5 and task in [TaskType.SIMPLE_CHAT.value, TaskType.QUICK_STATUS.value]:
            if data.get("savings", 0) < 0.001 * data["calls"]:
                recommendations.append(
                    f"Task type '{task}' could save more if routed to cheaper models."
                )

    return {
        "today": today_stats,
        "period": period_stats,
        "router_stats": router_stats,
        "task_distribution": task_distribution,
        "model_usage": period_stats.get("by_model", {}),
        "recommendations": recommendations,
        "generated_at": datetime.now().isoformat(),
    }


def get_quick_stats() -> Dict[str, Any]:
    """Get a quick summary for dashboard display."""
    tracker = get_cost_tracker()
    today = tracker.get_today_stats()
    week = tracker.get_stats(7)

    return {
        "today_calls": today["calls"],
        "today_savings": today["savings"],
        "today_savings_pct": today["savings_percentage"],
        "week_calls": week["total_calls"],
        "week_savings": week["total_savings"],
        "week_savings_pct": week["savings_percentage"],
        "router_active": True,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    """CLI for testing and viewing stats."""
    import argparse

    parser = argparse.ArgumentParser(description="Model Router Integration")
    parser.add_argument("--stats", action="store_true", help="Show usage statistics")
    parser.add_argument("--today", action="store_true", help="Show today's stats")
    parser.add_argument("--test", type=str, help="Test routing for a message")
    parser.add_argument("--days", type=int, default=7, help="Days for stats period")

    args = parser.parse_args()

    if args.stats:
        stats = get_model_stats(args.days)
        print("=" * 60)
        print("Model Router Integration Statistics")
        print("=" * 60)
        print(f"\nPeriod: Last {args.days} days")
        print(f"Total Calls: {stats['period']['total_calls']}")
        print(f"Actual Cost: ${stats['period']['total_actual_cost']:.4f}")
        print(f"Baseline Cost: ${stats['period']['total_baseline_cost']:.4f}")
        print(f"Savings: ${stats['period']['total_savings']:.4f} ({stats['period']['savings_percentage']:.1f}%)")

        print("\nBy Task Type:")
        for task, data in stats['task_distribution'].items():
            print(f"  {task}: {data['count']} calls ({data['percentage']:.1f}%), saved ${data['savings']:.4f}")

        print("\nBy Model:")
        for model, data in stats['model_usage'].items():
            print(f"  {model}: {data['calls']} calls, ${data['cost']:.4f}, {data['avg_latency']}ms avg")

        if stats['recommendations']:
            print("\nRecommendations:")
            for rec in stats['recommendations']:
                print(f"  - {rec}")

    elif args.today:
        today = get_cost_tracker().get_today_stats()
        print("=" * 40)
        print("Today's Model Router Stats")
        print("=" * 40)
        print(f"Date: {today['date']}")
        print(f"Calls: {today['calls']}")
        print(f"Actual Cost: ${today['actual_cost']:.4f}")
        print(f"Baseline Cost: ${today['baseline_cost']:.4f}")
        print(f"Savings: ${today['savings']:.4f} ({today['savings_percentage']:.1f}%)")

    elif args.test:
        result = classify_and_route_with_confidence(args.test)
        print("=" * 50)
        print("Routing Test Result")
        print("=" * 50)
        print(f"Message: {args.test[:60]}...")
        print(f"Task Type: {result['task_type']}")
        print(f"Confidence: {result['confidence']:.0%}")
        print(f"Complexity: {result['complexity']}")
        print(f"Recommended Model: {result['model']}")
        print(f"Actual Model: {MODEL_MAP.get(result['model'], 'claude-sonnet-4-20250514')}")

        # Show potential savings
        rec_info = get_model_info(result['model'])
        if rec_info:
            print(f"\nRecommended Model Info:")
            print(f"  Provider: {rec_info['provider']}")
            print(f"  Tier: {rec_info['quality_tier']}")
            print(f"  Pricing: ${rec_info['input_price']}/${rec_info['output_price']} per 1M tokens")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
