#!/usr/bin/env python3
"""
===============================================================================
     TINYPM MCP SERVER - Model Context Protocol Integration
===============================================================================

Expose TinyPM capabilities via the Model Context Protocol (MCP).

This server allows Claude Desktop, VS Code, and other MCP clients to:
- Manage tasks in TinyPM
- Communicate with agents (Builder, Researcher, etc.)
- Trigger research via Wild Claims Czar
- Access predictive intelligence
- Get proactive suggestions

ARCHITECTURE:
┌─────────────────────────────────────────────────────────────────────┐
│                      TINYPM MCP SERVER                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  TOOLS                           RESOURCES                          │
│  ├── task_create                 ├── board://tasks                  │
│  ├── task_update                 ├── board://active                 │
│  ├── task_list                   ├── memory://facts                 │
│  ├── task_assign_builder         ├── memory://context               │
│  ├── agent_message               ├── claims://recent                │
│  ├── research_trigger            ├── claims://validated             │
│  ├── wild_claims_scan            └── calendar://today               │
│  ├── predictive_intent                                              │
│  └── proactive_suggest           PROMPTS                            │
│                                  ├── pm_system_prompt               │
│                                  ├── task_planning                  │
│                                  └── research_analysis              │
└─────────────────────────────────────────────────────────────────────┘

Usage:
    python3 mcp_server.py                    # Run with stdio transport
    python3 mcp_server.py --http             # Run with HTTP transport
    python3 mcp_server.py --port 3000        # Custom port for HTTP

Configuration for Claude Desktop (~/.config/claude/claude_desktop_config.json):
{
  "mcpServers": {
    "tinypm": {
      "command": "python3",
      "args": ["/path/to/tinypm/mcp_server.py"]
    }
  }
}

Created: 2026-01-30
Author: PM Architect (Opus 4.5)
Protocol: MCP 2025-11-25
===============================================================================
"""

import argparse
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

# ═══════════════════════════════════════════════════════════════════════════════
# SETUP PATHS
# ═══════════════════════════════════════════════════════════════════════════════

APP_DIR = Path(__file__).parent
sys.path.insert(0, str(APP_DIR))

# Try to import MCP SDK
try:
    from mcp.server.fastmcp import FastMCP
    MCP_AVAILABLE = True
except ImportError:
    MCP_AVAILABLE = False
    print("[MCP Server] MCP SDK not installed. Install with: pip install mcp")
    print("[MCP Server] Running in demo mode...")

# Import TinyPM modules
try:
    from pm_brain import (
        get_confidence_scorer,
        get_timing_intelligence,
        load_memory,
        save_memory,
        store_fact,
        retrieve_fact,
        check_proactive_suggestions,
        add_context,
        get_relevant_context
    )
    PM_BRAIN_AVAILABLE = True
except ImportError:
    PM_BRAIN_AVAILABLE = False
    print("[MCP Server] pm_brain not available")

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

BOARD_FILE = APP_DIR / "board.json"
INTERCOM_FILE = APP_DIR / ".claude_intercom.json"
CLAIMS_DB_FILE = APP_DIR / ".wild_claims_db.json"
AGENT_QUESTIONS_FILE = APP_DIR / ".agent_questions.json"
LAUNCH_CHECKLIST_FILE = APP_DIR / ".launch_checklist.json"
BUILDER_HEARTBEAT_FILE = APP_DIR / ".builder_heartbeat.json"
CZAR_STATE_FILE = APP_DIR / ".wild_claims_czar_state.json"

# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def safe_read_json(path: Path, default: Any = None) -> Any:
    """Safely read JSON file."""
    try:
        if path.exists():
            return json.loads(path.read_text())
    except Exception as e:
        print(f"[MCP] Error reading {path.name}: {e}")
    return default if default is not None else {}


def safe_write_json(path: Path, data: Any) -> bool:
    """Safely write JSON file."""
    try:
        path.write_text(json.dumps(data, indent=2, default=str))
        return True
    except Exception as e:
        print(f"[MCP] Error writing {path.name}: {e}")
        return False


def log(msg: str, level: str = "INFO"):
    """Log with timestamp."""
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] [MCP-{level}] {msg}")


# ═══════════════════════════════════════════════════════════════════════════════
# CREATE MCP SERVER
# ═══════════════════════════════════════════════════════════════════════════════

if MCP_AVAILABLE:
    mcp = FastMCP(
        name="TinyPM",
        instructions="Personal AI Project Manager - Task management, agent coordination, and proactive intelligence"
    )
else:
    # Demo mode - create a mock object
    class MockMCP:
        def tool(self):
            def decorator(func):
                return func
            return decorator

        def resource(self, uri):
            def decorator(func):
                return func
            return decorator

        def prompt(self):
            def decorator(func):
                return func
            return decorator

        def run(self, **kwargs):
            print("[MCP] Running in demo mode - MCP SDK not installed")
            print("[MCP] Install with: pip install mcp")

    mcp = MockMCP()


# ═══════════════════════════════════════════════════════════════════════════════
# TOOLS: TASK MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
async def task_create(
    title: str,
    description: str = "",
    priority: str = "medium",
    tags: List[str] = None,
    role: str = "builder"
) -> Dict[str, Any]:
    """
    Create a new task in TinyPM.

    Args:
        title: Task title (required)
        description: Detailed description of the task
        priority: Priority level - low, medium, high, or critical
        tags: List of tags for categorization
        role: Role to assign - builder, researcher, designer, coordinator

    Returns:
        Created task with ID and confirmation
    """
    log(f"Creating task: {title[:50]}...")

    board = safe_read_json(BOARD_FILE, {"tasks": [], "next_id": 1})

    # Generate TPM-style ID
    next_num = board.get("next_id", 1)
    task_id = f"TPM-{next_num:03d}"

    task = {
        "id": task_id,
        "title": title,
        "description": description,
        "priority": priority,
        "role": role,
        "tags": tags or [],
        "status": "pending",
        "context": [],
        "created": datetime.now().strftime("%Y-%m-%d"),
        "updated": datetime.now().strftime("%Y-%m-%d"),
        "created_via": "mcp"
    }

    board["tasks"].append(task)
    board["next_id"] = next_num + 1

    if safe_write_json(BOARD_FILE, board):
        log(f"Task {task_id} created successfully", "SUCCESS")
        return {"success": True, "task": task, "message": f"Task {task_id} created"}
    return {"success": False, "error": "Failed to save task"}


@mcp.tool()
async def task_list(
    status: str = None,
    priority: str = None,
    limit: int = 20
) -> Dict[str, Any]:
    """
    List tasks from TinyPM board.

    Args:
        status: Filter by status - pending, in_progress, done (optional)
        priority: Filter by priority - low, medium, high, critical (optional)
        limit: Maximum number of tasks to return (default 20)

    Returns:
        List of tasks matching criteria with summary statistics
    """
    board = safe_read_json(BOARD_FILE, {"tasks": []})
    tasks = board.get("tasks", [])

    # Apply filters
    if status:
        tasks = [t for t in tasks if t.get("status") == status]
    if priority:
        tasks = [t for t in tasks if t.get("priority") == priority]

    # Calculate summary
    all_tasks = board.get("tasks", [])
    summary = {
        "total": len(all_tasks),
        "pending": len([t for t in all_tasks if t.get("status") == "pending"]),
        "in_progress": len([t for t in all_tasks if t.get("status") == "in_progress"]),
        "done": len([t for t in all_tasks if t.get("status") == "done"])
    }

    tasks = tasks[:limit]

    return {
        "summary": summary,
        "filtered_count": len(tasks),
        "tasks": tasks
    }


@mcp.tool()
async def task_update(
    task_id: str,
    status: str = None,
    title: str = None,
    description: str = None,
    priority: str = None
) -> Dict[str, Any]:
    """
    Update an existing task.

    Args:
        task_id: ID of task to update (e.g., "TPM-001" or numeric ID)
        status: New status - pending, in_progress, done
        title: New title
        description: New description
        priority: New priority - low, medium, high, critical

    Returns:
        Updated task
    """
    log(f"Updating task {task_id}...")

    board = safe_read_json(BOARD_FILE, {"tasks": []})

    # Support both string IDs (TPM-001) and integer IDs
    for task in board.get("tasks", []):
        tid = task.get("id")
        if str(tid) == str(task_id) or tid == task_id:
            if status:
                task["status"] = status
            if title:
                task["title"] = title
            if description:
                task["description"] = description
            if priority:
                task["priority"] = priority
            task["updated"] = datetime.now().strftime("%Y-%m-%d")

            if safe_write_json(BOARD_FILE, board):
                log(f"Task {task_id} updated", "SUCCESS")
                return {"success": True, "task": task}
            return {"success": False, "error": "Failed to save"}

    return {"success": False, "error": f"Task {task_id} not found"}


@mcp.tool()
async def task_delete(task_id: str) -> Dict[str, Any]:
    """
    Delete a task from TinyPM.

    Args:
        task_id: ID of task to delete (e.g., "TPM-001")

    Returns:
        Confirmation of deletion
    """
    log(f"Deleting task {task_id}...")

    board = safe_read_json(BOARD_FILE, {"tasks": []})
    original_count = len(board.get("tasks", []))

    # Support both string and integer ID matching
    board["tasks"] = [
        t for t in board.get("tasks", [])
        if str(t.get("id")) != str(task_id)
    ]

    if len(board["tasks"]) < original_count:
        if safe_write_json(BOARD_FILE, board):
            log(f"Task {task_id} deleted", "SUCCESS")
            return {"success": True, "message": f"Task {task_id} deleted"}
        return {"success": False, "error": "Failed to save"}

    return {"success": False, "error": f"Task {task_id} not found"}


@mcp.tool()
async def task_assign_to_builder(
    task_id: str,
    instructions: str = ""
) -> Dict[str, Any]:
    """
    Assign a task to the Builder agent for autonomous execution.

    The Builder agent will work on the task independently and report back
    when complete or if questions arise.

    Args:
        task_id: ID of task to assign (e.g., "TPM-001")
        instructions: Additional instructions for the Builder

    Returns:
        Assignment confirmation
    """
    log(f"Assigning task {task_id} to Builder...")

    board = safe_read_json(BOARD_FILE, {"tasks": []})
    task = None

    for t in board.get("tasks", []):
        if str(t.get("id")) == str(task_id):
            task = t
            break

    if not task:
        return {"success": False, "error": f"Task {task_id} not found"}

    # Update task status
    task["status"] = "in_progress"
    task["assigned_to"] = "builder"
    task["assigned_at"] = datetime.now().isoformat()
    safe_write_json(BOARD_FILE, board)

    # Add to Builder queue via intercom
    intercom = safe_read_json(INTERCOM_FILE, {})

    message = {
        "type": "task_assignment",
        "task_id": task_id,
        "task_title": task.get("title", ""),
        "task_description": task.get("description", ""),
        "instructions": instructions,
        "priority": task.get("priority", "medium"),
        "timestamp": datetime.now().isoformat(),
        "read": False
    }

    if "pm_to_builder" not in intercom:
        intercom["pm_to_builder"] = []

    intercom["pm_to_builder"].append(message)

    if safe_write_json(INTERCOM_FILE, intercom):
        log(f"Task #{task_id} assigned to Builder", "SUCCESS")
        return {
            "success": True,
            "message": f"Task #{task_id} assigned to Builder",
            "task": task,
            "queue_position": len(intercom["pm_to_builder"])
        }
    return {"success": False, "error": "Failed to write to intercom"}


# ═══════════════════════════════════════════════════════════════════════════════
# TOOLS: AGENT COMMUNICATION
# ═══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
async def agent_send_message(
    agent: str,
    message: str,
    priority: str = "normal"
) -> Dict[str, Any]:
    """
    Send a message to a TinyPM agent.

    Available agents:
    - builder: Autonomous code builder
    - researcher: Research and analysis
    - critic: Code review and quality
    - wild_claims_czar: Cutting-edge research monitoring

    Args:
        agent: Target agent name
        message: Message content
        priority: Message priority - low, normal, high, critical

    Returns:
        Message delivery confirmation
    """
    valid_agents = ["builder", "researcher", "critic", "wild_claims_czar"]
    if agent not in valid_agents:
        return {"success": False, "error": f"Unknown agent. Valid agents: {valid_agents}"}

    log(f"Sending message to {agent}...")

    intercom = safe_read_json(INTERCOM_FILE, {})

    channel = f"pm_to_{agent}"
    if channel not in intercom:
        intercom[channel] = []

    msg = {
        "type": "direct_message",
        "message": message,
        "priority": priority,
        "timestamp": datetime.now().isoformat(),
        "read": False,
        "via": "mcp"
    }

    intercom[channel].append(msg)

    if safe_write_json(INTERCOM_FILE, intercom):
        log(f"Message delivered to {agent}", "SUCCESS")
        return {"success": True, "delivered_to": agent, "priority": priority}
    return {"success": False, "error": "Failed to deliver message"}


@mcp.tool()
async def agent_get_status() -> Dict[str, Any]:
    """
    Get status of all TinyPM agents.

    Returns status for:
    - Builder: Current task, alive status, last message
    - Researcher: Available claims pending
    - Wild Claims Czar: Scan status

    Returns:
        Comprehensive agent status report
    """
    log("Getting agent status...")

    status = {
        "timestamp": datetime.now().isoformat(),
        "agents": {}
    }

    # Builder status
    builder_heartbeat = safe_read_json(BUILDER_HEARTBEAT_FILE, {})
    intercom = safe_read_json(INTERCOM_FILE, {})

    builder_msgs = intercom.get("builder_to_pm", [])
    builder_last = builder_msgs[-1] if builder_msgs else None

    # Check if builder is alive (heartbeat within last 2 minutes)
    builder_alive = False
    if builder_heartbeat.get("timestamp"):
        try:
            last_beat = datetime.fromisoformat(builder_heartbeat["timestamp"])
            builder_alive = (datetime.now() - last_beat).total_seconds() < 120
        except:
            pass

    status["agents"]["builder"] = {
        "status": "active" if builder_alive else "offline",
        "current_task": builder_heartbeat.get("current_task"),
        "tasks_completed": builder_heartbeat.get("tasks_completed", 0),
        "last_message": builder_last.get("message", "")[:100] if builder_last else None,
        "queue_size": len([m for m in intercom.get("pm_to_builder", []) if not m.get("read")])
    }

    # Wild Claims Czar status
    claims_db = safe_read_json(CLAIMS_DB_FILE, {"claims": {}})
    czar_state = safe_read_json(CZAR_STATE_FILE, {})

    status["agents"]["wild_claims_czar"] = {
        "status": "active" if czar_state.get("running") else "idle",
        "total_claims": len(claims_db.get("claims", {})),
        "pending_validation": len([c for c in claims_db.get("claims", {}).values()
                                   if c.get("status") == "discovered"]),
        "validated": len([c for c in claims_db.get("claims", {}).values()
                          if c.get("status") == "validated"]),
        "last_scan": czar_state.get("last_scan")
    }

    # Agent questions
    questions = safe_read_json(AGENT_QUESTIONS_FILE, {"questions": []})
    unanswered = len([q for q in questions.get("questions", []) if not q.get("answered")])
    status["agent_questions_waiting"] = unanswered

    return status


@mcp.tool()
async def agent_get_messages(
    agent: str = None,
    unread_only: bool = True,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Get messages from agents to PM.

    Args:
        agent: Filter by specific agent (optional)
        unread_only: Only return unread messages
        limit: Maximum messages to return

    Returns:
        List of agent messages
    """
    intercom = safe_read_json(INTERCOM_FILE, {})
    messages = []

    channels = [f"{a}_to_pm" for a in ["builder", "researcher", "critic", "wild_claims_czar"]]
    if agent:
        channels = [f"{agent}_to_pm"]

    for channel in channels:
        channel_msgs = intercom.get(channel, [])
        for msg in channel_msgs:
            if unread_only and msg.get("read"):
                continue
            msg["from_agent"] = channel.replace("_to_pm", "")
            messages.append(msg)

    # Sort by timestamp descending
    messages.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    messages = messages[:limit]

    return {
        "count": len(messages),
        "messages": messages
    }


# ═══════════════════════════════════════════════════════════════════════════════
# TOOLS: WILD CLAIMS CZAR / RESEARCH
# ═══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
async def research_scan_sources(
    sources: List[str] = None
) -> Dict[str, Any]:
    """
    Trigger Wild Claims Czar to scan for new research and techniques.

    The Czar scans forums, papers, and social media for cutting-edge
    AI techniques and validates them before recommending integration.

    Args:
        sources: Specific sources to scan (optional)
                 Available: reddit, arxiv, hackernews, twitter, youtube
                 If None, scans all sources.

    Returns:
        Scan trigger confirmation and recent claims
    """
    log("Triggering Wild Claims Czar scan...")

    valid_sources = ["reddit", "arxiv", "hackernews", "twitter", "youtube"]
    sources = sources or valid_sources

    # Validate sources
    invalid = [s for s in sources if s not in valid_sources]
    if invalid:
        return {"success": False, "error": f"Invalid sources: {invalid}. Valid: {valid_sources}"}

    # Trigger scan by writing to czar state
    czar_state = safe_read_json(CZAR_STATE_FILE, {})
    czar_state["scan_requested"] = datetime.now().isoformat()
    czar_state["scan_sources"] = sources
    czar_state["requested_via"] = "mcp"
    safe_write_json(CZAR_STATE_FILE, czar_state)

    # Return current claims
    claims_db = safe_read_json(CLAIMS_DB_FILE, {"claims": {}})
    recent_claims = []

    for claim_id, claim in claims_db.get("claims", {}).items():
        recent_claims.append({
            "id": claim_id,
            "title": claim.get("title", ""),
            "wildness_score": claim.get("wildness_score", 0),
            "status": claim.get("status", "discovered"),
            "source": claim.get("source_type", "unknown"),
            "discovered_at": claim.get("discovered_at")
        })

    recent_claims.sort(key=lambda x: x.get("wildness_score", 0), reverse=True)

    log(f"Scan triggered for {sources}", "SUCCESS")

    return {
        "scan_triggered": True,
        "sources": sources,
        "claims_in_db": len(claims_db.get("claims", {})),
        "recent_claims": recent_claims[:10]
    }


@mcp.tool()
async def research_get_validated_claims(
    min_score: float = 0.7,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Get validated research claims ready for integration.

    These are claims that have been verified by the Wild Claims Czar
    and are recommended for implementation in TinyPM.

    Args:
        min_score: Minimum validation score (0.0-1.0, default 0.7)
        limit: Maximum claims to return

    Returns:
        Validated claims with integration recommendations
    """
    claims_db = safe_read_json(CLAIMS_DB_FILE, {"claims": {}})

    validated = []
    for claim_id, claim in claims_db.get("claims", {}).items():
        if claim.get("status") == "validated":
            validation_score = claim.get("validation_score", 0)
            if validation_score >= min_score:
                validated.append({
                    "id": claim_id,
                    "title": claim.get("title", ""),
                    "source": claim.get("source_type"),
                    "source_url": claim.get("source_url"),
                    "validation_score": validation_score,
                    "wildness_score": claim.get("wildness_score"),
                    "extracted_claims": claim.get("extracted_claims", []),
                    "integration_plan": claim.get("integration_plan"),
                    "discovered_at": claim.get("discovered_at")
                })

    validated.sort(key=lambda x: x.get("validation_score", 0), reverse=True)

    return {
        "total_validated": len(validated),
        "min_score_used": min_score,
        "claims": validated[:limit]
    }


# ═══════════════════════════════════════════════════════════════════════════════
# TOOLS: PREDICTIVE INTELLIGENCE
# ═══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
async def predict_user_intent(
    context: str = ""
) -> Dict[str, Any]:
    """
    Get predicted user intent and proactive suggestions.

    Uses TinyPM's predictive intelligence to anticipate what the user
    might want to do next based on patterns, time of day, and context.

    Args:
        context: Additional context to consider (optional)

    Returns:
        Predicted intent and actionable suggestions
    """
    log("Analyzing predictive intent...")

    result = {
        "timestamp": datetime.now().isoformat(),
        "predictions": [],
        "suggestions": [],
        "timing": {}
    }

    if PM_BRAIN_AVAILABLE:
        confidence_scorer = get_confidence_scorer()
        timing_intel = get_timing_intelligence()

        # Get timing analysis
        result["timing"] = {
            "is_good_time_to_suggest": timing_intel.is_good_time_to_suggest(),
            "in_deep_work": timing_intel.is_in_deep_work(),
            "at_task_boundary": timing_intel.detect_task_boundary(),
            "stats": timing_intel.get_timing_stats()
        }

        # Get proactive suggestions
        suggestions = check_proactive_suggestions()

        for suggestion in suggestions:
            confidence = confidence_scorer.score_suggestion("proactive_suggestion")
            action_level = confidence_scorer.get_action_level(confidence)
            result["suggestions"].append({
                "suggestion": suggestion,
                "confidence": round(confidence, 2),
                "action_level": action_level,
                "action_description": confidence_scorer.get_action_description(action_level)
            })

        # Get confidence stats
        result["confidence_stats"] = confidence_scorer.get_confidence_stats()
    else:
        result["suggestions"] = check_proactive_suggestions() if PM_BRAIN_AVAILABLE else []
        result["note"] = "Full predictive intelligence requires pm_brain module"

    return result


@mcp.tool()
async def get_proactive_brief() -> Dict[str, Any]:
    """
    Get a proactive intelligence brief - what you should know right now.

    This is a comprehensive summary including:
    - Tasks needing attention (stale, high priority)
    - Agent status and pending work
    - Research discoveries
    - Proactive suggestions

    Returns:
        Complete proactive intelligence brief
    """
    log("Generating proactive brief...")

    brief = {
        "generated_at": datetime.now().isoformat(),
        "greeting": _get_time_greeting(),
        "tasks": {},
        "agents": {},
        "research": {},
        "suggestions": [],
        "followups": []
    }

    # Tasks summary
    board = safe_read_json(BOARD_FILE, {"tasks": []})
    tasks = board.get("tasks", [])

    pending = [t for t in tasks if t.get("status") == "pending"]
    in_progress = [t for t in tasks if t.get("status") == "in_progress"]
    high_priority = [t for t in tasks if t.get("priority") in ["high", "critical"]
                     and t.get("status") != "done"]

    # Find stale tasks (in_progress for > 24h)
    stale_tasks = []
    for task in in_progress:
        updated = task.get("updated", task.get("created", ""))
        if updated:
            try:
                updated_dt = datetime.fromisoformat(updated.replace(" ", "T").split(".")[0])
                if (datetime.now() - updated_dt).total_seconds() > 86400:
                    stale_tasks.append(task)
            except:
                pass

    brief["tasks"] = {
        "pending": len(pending),
        "in_progress": len(in_progress),
        "high_priority_count": len(high_priority),
        "high_priority_tasks": high_priority[:5],
        "stale_count": len(stale_tasks),
        "stale_tasks": stale_tasks[:3]
    }

    # Agent status (simplified)
    intercom = safe_read_json(INTERCOM_FILE, {})
    builder_msgs = intercom.get("builder_to_pm", [])
    if builder_msgs:
        latest = builder_msgs[-1]
        brief["agents"]["builder_last"] = {
            "type": latest.get("type"),
            "message": latest.get("message", "")[:100],
            "timestamp": latest.get("timestamp")
        }

    builder_queue = len([m for m in intercom.get("pm_to_builder", []) if not m.get("read")])
    brief["agents"]["builder_queue"] = builder_queue

    # Research status
    claims_db = safe_read_json(CLAIMS_DB_FILE, {"claims": {}})
    validated_claims = [c for c in claims_db.get("claims", {}).values()
                        if c.get("status") == "validated"]
    brief["research"] = {
        "total_claims": len(claims_db.get("claims", {})),
        "validated_count": len(validated_claims),
        "top_validated": sorted(validated_claims,
                               key=lambda x: x.get("validation_score", 0),
                               reverse=True)[:3]
    }

    # Agent questions waiting
    questions = safe_read_json(AGENT_QUESTIONS_FILE, {"questions": []})
    unanswered = [q for q in questions.get("questions", []) if not q.get("answered")]
    if unanswered:
        brief["followups"].append(f"{len(unanswered)} agent question(s) waiting for your answer")

    # Proactive suggestions
    if PM_BRAIN_AVAILABLE:
        brief["suggestions"] = check_proactive_suggestions()

    return brief


def _get_time_greeting() -> str:
    """Get time-appropriate greeting."""
    hour = datetime.now().hour
    if hour < 12:
        return "Good morning"
    elif hour < 17:
        return "Good afternoon"
    else:
        return "Good evening"


# ═══════════════════════════════════════════════════════════════════════════════
# TOOLS: MEMORY MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
async def memory_store(
    key: str,
    value: str
) -> Dict[str, Any]:
    """
    Store a fact in TinyPM's persistent memory.

    Memory persists across sessions and is used by the PM for context.

    Args:
        key: Memory key (e.g., "user_timezone", "preferred_stack")
        value: Value to store

    Returns:
        Confirmation of storage
    """
    log(f"Storing memory: {key}...")

    # Use dedicated MCP memory file to avoid conflicts with pm_brain
    mcp_memory_file = APP_DIR / ".mcp_memory.json"
    memory = safe_read_json(mcp_memory_file, {"facts": {}, "updated_at": None})

    # Ensure facts key exists
    if "facts" not in memory:
        memory["facts"] = {}

    memory["facts"][key] = {
        "value": value,
        "stored_at": datetime.now().isoformat()
    }
    memory["updated_at"] = datetime.now().isoformat()

    if safe_write_json(mcp_memory_file, memory):
        # Also try to store in pm_brain if available
        if PM_BRAIN_AVAILABLE:
            try:
                store_fact(key, value)
            except:
                pass  # Non-critical if pm_brain store fails
        return {"success": True, "stored": {key: value}}
    return {"success": False, "error": "Failed to store"}


@mcp.tool()
async def memory_retrieve(
    key: str
) -> Dict[str, Any]:
    """
    Retrieve a fact from TinyPM's memory.

    Args:
        key: Memory key to retrieve

    Returns:
        Stored value or indication if not found
    """
    # Check MCP memory file first
    mcp_memory_file = APP_DIR / ".mcp_memory.json"
    memory = safe_read_json(mcp_memory_file, {"facts": {}})
    fact = memory.get("facts", {}).get(key)
    if fact:
        return {"key": key, "value": fact.get("value"), "found": True}

    # Fallback to pm_brain if available
    if PM_BRAIN_AVAILABLE:
        try:
            value = retrieve_fact(key)
            if value is not None:
                return {"key": key, "value": value, "found": True}
        except:
            pass

    return {"key": key, "value": None, "found": False}


@mcp.tool()
async def memory_get_context(
    limit: int = 10
) -> Dict[str, Any]:
    """
    Get recent context from TinyPM's memory.

    This includes recent conversation context and stored facts.

    Args:
        limit: Number of context items to return

    Returns:
        Recent context items and fact summary
    """
    if PM_BRAIN_AVAILABLE:
        memory = load_memory()
        context = memory.get("context", [])[-limit:]
        facts = memory.get("facts", {})

        return {
            "recent_context": context,
            "fact_count": len(facts),
            "fact_keys": list(facts.keys())[:20],
            "memory_updated": memory.get("updated_at")
        }
    else:
        memory_file = APP_DIR / ".pm_memory.json"
        memory = safe_read_json(memory_file, {"facts": {}})
        return {
            "recent_context": [],
            "fact_count": len(memory.get("facts", {})),
            "fact_keys": list(memory.get("facts", {}).keys())[:20],
            "note": "Full context requires pm_brain module"
        }


# ═══════════════════════════════════════════════════════════════════════════════
# RESOURCES
# ═══════════════════════════════════════════════════════════════════════════════

@mcp.resource("board://tasks")
async def resource_all_tasks() -> str:
    """Get all tasks from the TinyPM board as JSON."""
    board = safe_read_json(BOARD_FILE, {"tasks": []})
    return json.dumps(board.get("tasks", []), indent=2)


@mcp.resource("board://active")
async def resource_active_tasks() -> str:
    """Get only active (in_progress) tasks as JSON."""
    board = safe_read_json(BOARD_FILE, {"tasks": []})
    active = [t for t in board.get("tasks", []) if t.get("status") == "in_progress"]
    return json.dumps(active, indent=2)


@mcp.resource("board://pending")
async def resource_pending_tasks() -> str:
    """Get pending tasks as JSON."""
    board = safe_read_json(BOARD_FILE, {"tasks": []})
    pending = [t for t in board.get("tasks", []) if t.get("status") == "pending"]
    return json.dumps(pending, indent=2)


@mcp.resource("memory://facts")
async def resource_memory_facts() -> str:
    """Get all stored facts from TinyPM memory."""
    if PM_BRAIN_AVAILABLE:
        memory = load_memory()
        return json.dumps(memory.get("facts", {}), indent=2)
    else:
        memory_file = APP_DIR / ".pm_memory.json"
        memory = safe_read_json(memory_file, {"facts": {}})
        return json.dumps(memory.get("facts", {}), indent=2)


@mcp.resource("claims://recent")
async def resource_recent_claims() -> str:
    """Get recently discovered wild claims."""
    claims_db = safe_read_json(CLAIMS_DB_FILE, {"claims": {}})
    claims_list = list(claims_db.get("claims", {}).values())
    claims_list.sort(key=lambda x: x.get("discovered_at", ""), reverse=True)
    return json.dumps(claims_list[:20], indent=2)


@mcp.resource("claims://validated")
async def resource_validated_claims() -> str:
    """Get validated claims ready for integration."""
    claims_db = safe_read_json(CLAIMS_DB_FILE, {"claims": {}})
    validated = [c for c in claims_db.get("claims", {}).values()
                 if c.get("status") == "validated"]
    validated.sort(key=lambda x: x.get("validation_score", 0), reverse=True)
    return json.dumps(validated, indent=2)


@mcp.resource("intercom://messages")
async def resource_intercom_messages() -> str:
    """Get recent intercom messages between PM and agents."""
    intercom = safe_read_json(INTERCOM_FILE, {})
    return json.dumps(intercom, indent=2)


# ═══════════════════════════════════════════════════════════════════════════════
# PROMPTS
# ═══════════════════════════════════════════════════════════════════════════════

@mcp.prompt()
def pm_system_prompt() -> str:
    """System prompt for TinyPM PM interactions."""
    return """You are the PM (Project Manager) for TinyPM, a personal AI project management system.

Your capabilities via MCP tools:
- task_create, task_update, task_list, task_delete: Full task management
- task_assign_to_builder: Delegate tasks to autonomous Builder agent
- agent_send_message, agent_get_status: Communicate with agents
- research_scan_sources, research_get_validated_claims: Research monitoring
- predict_user_intent, get_proactive_brief: Predictive intelligence
- memory_store, memory_retrieve: Persistent memory

Guidelines:
1. Be PROACTIVE - suggest next actions, anticipate needs before asked
2. Be SPECIFIC - use actual data from tasks, memory, and context
3. Be CONCISE - keep responses focused and actionable
4. Be INTELLIGENT - learn patterns, remember context, think ahead

When a user asks about tasks, check the current board with task_list.
When a complex task needs implementation, suggest task_assign_to_builder.
When research is needed, use research_scan_sources.
Start interactions with get_proactive_brief for full context."""


@mcp.prompt()
def task_planning_prompt(task_description: str) -> str:
    """Generate a task planning prompt."""
    return f"""Analyze this task and create an execution plan:

TASK: {task_description}

Please provide:
1. BREAKDOWN: Split into subtasks if the task is complex
2. DEPENDENCIES: What needs to happen first?
3. EFFORT ESTIMATE: quick (< 1 hour) / medium (1-4 hours) / large (> 4 hours)
4. RISKS: Potential blockers or challenges
5. RECOMMENDATION: Should this be assigned to Builder for autonomous execution?

Use the task_create tool to create any subtasks identified."""


@mcp.prompt()
def research_analysis_prompt(topic: str) -> str:
    """Generate a research analysis prompt."""
    return f"""Research and analyze this topic for TinyPM integration:

TOPIC: {topic}

Please:
1. Use research_scan_sources to trigger a scan if not done recently
2. Check research_get_validated_claims for existing validated research
3. Summarize key findings relevant to TinyPM
4. Recommend specific actions or integrations

Focus on practical, implementable techniques that can improve TinyPM."""


# ═══════════════════════════════════════════════════════════════════════════════
# SERVER ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    """Run the TinyPM MCP Server."""
    parser = argparse.ArgumentParser(
        description="TinyPM MCP Server - Model Context Protocol integration"
    )
    parser.add_argument(
        "--http",
        action="store_true",
        help="Use HTTP transport instead of stdio"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=3000,
        help="Port for HTTP transport (default: 3000)"
    )
    parser.add_argument(
        "--host",
        default="localhost",
        help="Host for HTTP transport (default: localhost)"
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug logging"
    )

    args = parser.parse_args()

    if args.debug:
        log("Debug mode enabled")

    log("=" * 60)
    log("TinyPM MCP Server")
    log("=" * 60)
    log(f"MCP SDK Available: {MCP_AVAILABLE}")
    log(f"PM Brain Available: {PM_BRAIN_AVAILABLE}")
    log(f"Transport: {'HTTP' if args.http else 'stdio'}")
    if args.http:
        log(f"Endpoint: http://{args.host}:{args.port}")
    log("=" * 60)

    if not MCP_AVAILABLE:
        log("MCP SDK not installed!", "ERROR")
        log("Install with: pip install mcp", "ERROR")
        log("Running in demo mode - server will not accept connections", "WARN")
        return

    try:
        if args.http:
            mcp.run(transport="streamable-http", host=args.host, port=args.port)
        else:
            mcp.run(transport="stdio")
    except KeyboardInterrupt:
        log("Server shutting down...")
    except Exception as e:
        log(f"Server error: {e}", "ERROR")
        raise


if __name__ == "__main__":
    main()
