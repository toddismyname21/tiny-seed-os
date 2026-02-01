# TinyPM MCP Integration - Complete Architecture Guide

**Version:** 1.0.0
**Date:** 2026-01-30
**Author:** PM Architect (Opus 4.5)
**Status:** PRODUCTION READY BLUEPRINT

---

## Executive Summary

The Model Context Protocol (MCP) is Anthropic's open standard for connecting AI applications to external tools and data sources. As of January 2026, MCP has become the de-facto industry standard with 97M+ monthly SDK downloads and adoption by Anthropic, OpenAI, Google, and Microsoft.

TinyPM MUST integrate MCP to:
1. **Expose TinyPM as an MCP Server** - Let Claude Desktop/Code use TinyPM's capabilities
2. **Act as an MCP Client** - Connect to external MCP servers (Playwright, databases, etc.)
3. **Enable Dynamic Tool Discovery** - Allow agents to discover and use tools at runtime

---

## Part 1: MCP Fundamentals

### 1.1 What is MCP?

MCP is an open protocol that enables seamless integration between LLM applications and external data sources and tools. Think of it like USB-C for AI - a universal way to plug capabilities into LLM applications.

**Key Benefits:**
- Single integration point for multiple capabilities
- LLM-independent (works with Claude, GPT, Gemini, etc.)
- Modular, reusable components
- Industry standard (Linux Foundation via Agentic AI Foundation)

### 1.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MCP HOST (AI Application)                    │
│   (Claude Desktop, VS Code, TinyPM)                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ MCP Client 1│  │ MCP Client 2│  │ MCP Client 3│  │MCP Client 4│ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
└─────────┼────────────────┼────────────────┼───────────────┼────────┘
          │                │                │               │
          ▼                ▼                ▼               ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐
│  MCP Server A   │ │MCP Server B │ │MCP Server C │ │  MCP Server D   │
│  (TinyPM)       │ │(Playwright) │ │ (Supabase)  │ │  (Filesystem)   │
│  - Local        │ │  - Local    │ │  - Remote   │ │   - Local       │
└─────────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘
```

### 1.3 Core Primitives

MCP defines three core primitives that servers expose:

| Primitive | Purpose | Example |
|-----------|---------|---------|
| **Tools** | Executable functions | `create_task`, `send_email`, `query_database` |
| **Resources** | Data sources for context | File contents, database records, API responses |
| **Prompts** | Reusable interaction templates | System prompts, few-shot examples |

### 1.4 Protocol Layers

**Data Layer (JSON-RPC 2.0):**
- Lifecycle management (initialize, capabilities, shutdown)
- Tool discovery (`tools/list`) and execution (`tools/call`)
- Resource discovery (`resources/list`) and retrieval (`resources/read`)
- Notifications for real-time updates

**Transport Layer:**
- **Stdio** - For local process communication (best for local MCP servers)
- **Streamable HTTP** - For remote servers (supports OAuth, SSE)

---

## Part 2: TinyPM as MCP Server

### 2.1 TinyPM MCP Server Architecture

TinyPM will expose its capabilities via MCP, allowing Claude Desktop/Code to:
- Manage tasks
- Communicate with agents
- Trigger research
- Access predictive intelligence

```
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
```

### 2.2 Implementation: mcp_server.py

```python
#!/usr/bin/env python3
"""
TinyPM MCP Server - Expose TinyPM capabilities via Model Context Protocol.

This server allows Claude Desktop, VS Code, and other MCP clients to:
- Manage tasks in TinyPM
- Communicate with agents
- Trigger research via Wild Claims Czar
- Access predictive intelligence
- Get proactive suggestions

Usage:
    python3 mcp_server.py                    # Run with stdio transport
    python3 mcp_server.py --http             # Run with HTTP transport
    python3 mcp_server.py --port 3000        # Custom port for HTTP
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# MCP SDK imports
from mcp.server.fastmcp import FastMCP
from mcp.server.fastmcp.server import Context
from pydantic import BaseModel, Field

# TinyPM imports
APP_DIR = Path(__file__).parent
sys.path.insert(0, str(APP_DIR))

from pm_brain import (
    get_confidence_scorer,
    get_timing_intelligence,
    load_memory,
    store_fact,
    retrieve_fact,
    check_proactive_suggestions
)

# ═══════════════════════════════════════════════════════════════════════════════
# SERVER CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

BOARD_FILE = APP_DIR / "board.json"
INTERCOM_FILE = APP_DIR / ".claude_intercom.json"
CLAIMS_DB_FILE = APP_DIR / ".wild_claims_db.json"

# Create the MCP server
mcp = FastMCP(
    name="TinyPM",
    version="1.0.0",
    description="Personal AI Project Manager - Task management, agent coordination, and proactive intelligence"
)

# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def safe_read_json(path: Path, default: Any = None) -> Any:
    """Safely read JSON file."""
    try:
        if path.exists():
            return json.loads(path.read_text())
    except Exception as e:
        return default if default is not None else {}
    return default if default is not None else {}

def safe_write_json(path: Path, data: Any):
    """Safely write JSON file."""
    try:
        path.write_text(json.dumps(data, indent=2, default=str))
        return True
    except Exception:
        return False

# ═══════════════════════════════════════════════════════════════════════════════
# TOOLS: TASK MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
async def task_create(
    title: str,
    description: str = "",
    priority: str = "medium",
    tags: List[str] = None
) -> Dict[str, Any]:
    """
    Create a new task in TinyPM.

    Args:
        title: Task title (required)
        description: Detailed description
        priority: low, medium, high, critical
        tags: List of tags for categorization

    Returns:
        Created task with ID
    """
    board = safe_read_json(BOARD_FILE, {"tasks": [], "next_id": 1})

    task_id = board.get("next_id", 1)
    task = {
        "id": task_id,
        "title": title,
        "description": description,
        "priority": priority,
        "tags": tags or [],
        "status": "pending",
        "created": datetime.now().isoformat(),
        "updated": datetime.now().isoformat()
    }

    board["tasks"].append(task)
    board["next_id"] = task_id + 1

    if safe_write_json(BOARD_FILE, board):
        return {"success": True, "task": task}
    return {"success": False, "error": "Failed to save task"}


@mcp.tool()
async def task_list(
    status: str = None,
    limit: int = 20
) -> Dict[str, Any]:
    """
    List tasks from TinyPM board.

    Args:
        status: Filter by status (pending, in_progress, done)
        limit: Maximum number of tasks to return

    Returns:
        List of tasks matching criteria
    """
    board = safe_read_json(BOARD_FILE, {"tasks": []})
    tasks = board.get("tasks", [])

    if status:
        tasks = [t for t in tasks if t.get("status") == status]

    tasks = tasks[:limit]

    return {
        "total": len(board.get("tasks", [])),
        "filtered": len(tasks),
        "tasks": tasks
    }


@mcp.tool()
async def task_update(
    task_id: int,
    status: str = None,
    title: str = None,
    description: str = None,
    priority: str = None
) -> Dict[str, Any]:
    """
    Update an existing task.

    Args:
        task_id: ID of task to update
        status: New status (pending, in_progress, done)
        title: New title
        description: New description
        priority: New priority

    Returns:
        Updated task
    """
    board = safe_read_json(BOARD_FILE, {"tasks": []})

    for task in board.get("tasks", []):
        if task.get("id") == task_id:
            if status:
                task["status"] = status
            if title:
                task["title"] = title
            if description:
                task["description"] = description
            if priority:
                task["priority"] = priority
            task["updated"] = datetime.now().isoformat()

            if safe_write_json(BOARD_FILE, board):
                return {"success": True, "task": task}
            return {"success": False, "error": "Failed to save"}

    return {"success": False, "error": f"Task {task_id} not found"}


@mcp.tool()
async def task_assign_to_builder(
    task_id: int,
    instructions: str = ""
) -> Dict[str, Any]:
    """
    Assign a task to the Builder agent for autonomous execution.

    Args:
        task_id: ID of task to assign
        instructions: Additional instructions for Builder

    Returns:
        Assignment confirmation
    """
    board = safe_read_json(BOARD_FILE, {"tasks": []})
    task = None

    for t in board.get("tasks", []):
        if t.get("id") == task_id:
            task = t
            break

    if not task:
        return {"success": False, "error": f"Task {task_id} not found"}

    # Add to Builder queue via intercom
    intercom = safe_read_json(INTERCOM_FILE, {"pm_to_builder": []})

    message = {
        "type": "task_assignment",
        "task_id": task_id,
        "task_title": task.get("title", ""),
        "instructions": instructions,
        "timestamp": datetime.now().isoformat(),
        "read": False
    }

    if "pm_to_builder" not in intercom:
        intercom["pm_to_builder"] = []

    intercom["pm_to_builder"].append(message)

    if safe_write_json(INTERCOM_FILE, intercom):
        return {
            "success": True,
            "message": f"Task #{task_id} assigned to Builder",
            "task": task
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

    Args:
        agent: Target agent (builder, researcher, critic)
        message: Message content
        priority: Message priority (low, normal, high, critical)

    Returns:
        Message delivery confirmation
    """
    valid_agents = ["builder", "researcher", "critic", "wild_claims_czar"]
    if agent not in valid_agents:
        return {"success": False, "error": f"Unknown agent. Valid: {valid_agents}"}

    intercom = safe_read_json(INTERCOM_FILE, {})

    channel = f"pm_to_{agent}"
    if channel not in intercom:
        intercom[channel] = []

    msg = {
        "type": "direct_message",
        "message": message,
        "priority": priority,
        "timestamp": datetime.now().isoformat(),
        "read": False
    }

    intercom[channel].append(msg)

    if safe_write_json(INTERCOM_FILE, intercom):
        return {"success": True, "delivered_to": agent}
    return {"success": False, "error": "Failed to deliver message"}


@mcp.tool()
async def agent_get_status() -> Dict[str, Any]:
    """
    Get status of all TinyPM agents.

    Returns:
        Status of each agent (idle, working, waiting, error)
    """
    # Check builder heartbeat
    builder_heartbeat = safe_read_json(APP_DIR / ".builder_heartbeat.json", {})

    # Check intercom for messages
    intercom = safe_read_json(INTERCOM_FILE, {})

    builder_msgs = intercom.get("builder_to_pm", [])
    builder_last = builder_msgs[-1] if builder_msgs else None

    return {
        "builder": {
            "status": "active" if builder_heartbeat.get("alive") else "offline",
            "current_task": builder_heartbeat.get("current_task"),
            "last_message": builder_last.get("message", "")[:100] if builder_last else None
        },
        "researcher": {
            "status": "available",
            "pending_claims": len(safe_read_json(CLAIMS_DB_FILE, {}).get("claims", {}))
        }
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

    Args:
        sources: Specific sources to scan (reddit, arxiv, hackernews, twitter)
                 If None, scans all sources.

    Returns:
        Scan results with discovered claims
    """
    valid_sources = ["reddit", "arxiv", "hackernews", "twitter", "youtube"]
    sources = sources or valid_sources

    # Trigger scan by writing to czar state
    czar_state = safe_read_json(APP_DIR / ".wild_claims_czar_state.json", {})
    czar_state["scan_requested"] = datetime.now().isoformat()
    czar_state["scan_sources"] = sources
    safe_write_json(APP_DIR / ".wild_claims_czar_state.json", czar_state)

    # Return current claims
    claims_db = safe_read_json(CLAIMS_DB_FILE, {"claims": {}})
    recent_claims = []

    for claim_id, claim in claims_db.get("claims", {}).items():
        recent_claims.append({
            "id": claim_id,
            "title": claim.get("title", ""),
            "wildness_score": claim.get("wildness_score", 0),
            "status": claim.get("status", "discovered"),
            "source": claim.get("source_type", "unknown")
        })

    recent_claims.sort(key=lambda x: x["wildness_score"], reverse=True)

    return {
        "scan_triggered": True,
        "sources": sources,
        "recent_claims": recent_claims[:10]
    }


@mcp.tool()
async def research_get_validated_claims(
    min_score: float = 0.7,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Get validated research claims ready for integration.

    Args:
        min_score: Minimum validation score (0-1)
        limit: Maximum claims to return

    Returns:
        Validated claims with integration recommendations
    """
    claims_db = safe_read_json(CLAIMS_DB_FILE, {"claims": {}})

    validated = []
    for claim_id, claim in claims_db.get("claims", {}).items():
        if claim.get("status") == "validated":
            if claim.get("validation_score", 0) >= min_score:
                validated.append({
                    "id": claim_id,
                    "title": claim.get("title", ""),
                    "validation_score": claim.get("validation_score"),
                    "extracted_claims": claim.get("extracted_claims", []),
                    "integration_plan": claim.get("integration_plan")
                })

    validated.sort(key=lambda x: x["validation_score"], reverse=True)

    return {
        "total_validated": len(validated),
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
        context: Additional context to consider

    Returns:
        Predicted intent and suggestions
    """
    confidence_scorer = get_confidence_scorer()
    timing_intel = get_timing_intelligence()

    # Get timing analysis
    is_good_time = timing_intel.is_good_time_to_suggest()
    timing_stats = timing_intel.get_timing_stats()

    # Get proactive suggestions
    suggestions = check_proactive_suggestions()

    # Score suggestions
    scored_suggestions = []
    for suggestion in suggestions:
        confidence = confidence_scorer.score_suggestion("proactive_suggestion")
        action_level = confidence_scorer.get_action_level(confidence)
        scored_suggestions.append({
            "suggestion": suggestion,
            "confidence": confidence,
            "action_level": action_level
        })

    return {
        "is_good_time_to_suggest": is_good_time,
        "suggestions": scored_suggestions,
        "timing_stats": timing_stats
    }


@mcp.tool()
async def get_proactive_brief() -> Dict[str, Any]:
    """
    Get a proactive intelligence brief - what you should know right now.

    Returns comprehensive context including:
    - Tasks needing attention
    - Agent status
    - Calendar context (if connected)
    - Email highlights (if connected)
    - Research discoveries

    Returns:
        Proactive intelligence brief
    """
    brief = {
        "generated_at": datetime.now().isoformat(),
        "tasks": {},
        "agents": {},
        "suggestions": []
    }

    # Tasks summary
    board = safe_read_json(BOARD_FILE, {"tasks": []})
    tasks = board.get("tasks", [])
    brief["tasks"] = {
        "pending": len([t for t in tasks if t.get("status") == "pending"]),
        "in_progress": len([t for t in tasks if t.get("status") == "in_progress"]),
        "high_priority": [t for t in tasks if t.get("priority") == "high" and t.get("status") != "done"][:5]
    }

    # Agent status
    intercom = safe_read_json(INTERCOM_FILE, {})
    builder_msgs = intercom.get("builder_to_pm", [])
    if builder_msgs:
        latest = builder_msgs[-1]
        brief["agents"]["builder_last"] = {
            "type": latest.get("type"),
            "message": latest.get("message", "")[:100]
        }

    # Proactive suggestions
    brief["suggestions"] = check_proactive_suggestions()

    return brief


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

    Args:
        key: Memory key (e.g., "user_preference_timezone")
        value: Value to store

    Returns:
        Confirmation
    """
    store_fact(key, value)
    return {"success": True, "stored": {key: value}}


@mcp.tool()
async def memory_retrieve(
    key: str
) -> Dict[str, Any]:
    """
    Retrieve a fact from TinyPM's memory.

    Args:
        key: Memory key to retrieve

    Returns:
        Stored value or null if not found
    """
    value = retrieve_fact(key)
    return {"key": key, "value": value, "found": value is not None}


@mcp.tool()
async def memory_get_context(
    limit: int = 10
) -> Dict[str, Any]:
    """
    Get recent context from TinyPM's memory.

    Args:
        limit: Number of context items to return

    Returns:
        Recent context items
    """
    memory = load_memory()
    context = memory.get("context", [])[-limit:]
    facts = memory.get("facts", {})

    return {
        "recent_context": context,
        "fact_count": len(facts),
        "memory_updated": memory.get("updated_at")
    }


# ═══════════════════════════════════════════════════════════════════════════════
# RESOURCES
# ═══════════════════════════════════════════════════════════════════════════════

@mcp.resource("board://tasks")
async def get_all_tasks() -> str:
    """Get all tasks from the TinyPM board."""
    board = safe_read_json(BOARD_FILE, {"tasks": []})
    return json.dumps(board.get("tasks", []), indent=2)


@mcp.resource("board://active")
async def get_active_tasks() -> str:
    """Get only active (in_progress) tasks."""
    board = safe_read_json(BOARD_FILE, {"tasks": []})
    active = [t for t in board.get("tasks", []) if t.get("status") == "in_progress"]
    return json.dumps(active, indent=2)


@mcp.resource("memory://facts")
async def get_memory_facts() -> str:
    """Get all stored facts from TinyPM memory."""
    memory = load_memory()
    return json.dumps(memory.get("facts", {}), indent=2)


@mcp.resource("claims://recent")
async def get_recent_claims() -> str:
    """Get recently discovered wild claims."""
    claims_db = safe_read_json(CLAIMS_DB_FILE, {"claims": {}})
    claims_list = list(claims_db.get("claims", {}).values())
    claims_list.sort(key=lambda x: x.get("discovered_at", ""), reverse=True)
    return json.dumps(claims_list[:20], indent=2)


# ═══════════════════════════════════════════════════════════════════════════════
# PROMPTS
# ═══════════════════════════════════════════════════════════════════════════════

@mcp.prompt()
def pm_system_prompt() -> str:
    """System prompt for TinyPM interactions."""
    return """You are the PM (Project Manager) for TinyPM, a personal AI project management system.

Your capabilities:
- Create, update, and manage tasks
- Assign tasks to the Builder agent for autonomous execution
- Trigger research via the Wild Claims Czar
- Access predictive intelligence for proactive suggestions
- Store and retrieve facts from persistent memory

Guidelines:
1. Be PROACTIVE - suggest next actions, anticipate needs
2. Be SPECIFIC - use data from the task board and memory
3. Be CONCISE - keep responses focused and actionable
4. Be INTELLIGENT - learn patterns, remember context

When a user asks about tasks, always check the current board state.
When a complex task needs implementation, suggest assigning it to Builder.
When research is needed, trigger the Wild Claims Czar."""


@mcp.prompt()
def task_planning_prompt(task_description: str) -> str:
    """Prompt template for task planning."""
    return f"""Analyze this task and create an execution plan:

TASK: {task_description}

Please provide:
1. BREAKDOWN: Split into subtasks if complex
2. DEPENDENCIES: What needs to happen first?
3. EFFORT: Estimate (quick/medium/large)
4. RISKS: Potential blockers
5. RECOMMENDATION: Should this go to Builder for autonomous execution?"""


# ═══════════════════════════════════════════════════════════════════════════════
# SERVER ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="TinyPM MCP Server")
    parser.add_argument("--http", action="store_true", help="Use HTTP transport instead of stdio")
    parser.add_argument("--port", type=int, default=3000, help="Port for HTTP transport")
    parser.add_argument("--host", default="localhost", help="Host for HTTP transport")
    args = parser.parse_args()

    if args.http:
        mcp.run(transport="streamable-http", host=args.host, port=args.port)
    else:
        mcp.run(transport="stdio")
```

### 2.3 Claude Desktop Configuration

Add TinyPM to Claude Desktop's MCP configuration:

**Location:** `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "tinypm": {
      "command": "python3",
      "args": ["/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/mcp_server.py"],
      "env": {
        "PYTHONPATH": "/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm"
      }
    }
  }
}
```

### 2.4 VS Code Configuration

For VS Code with Copilot or Continue:

**.vscode/mcp.json:**
```json
{
  "mcpServers": {
    "tinypm": {
      "command": "python3",
      "args": ["${workspaceFolder}/tinypm/mcp_server.py"]
    }
  }
}
```

---

## Part 3: TinyPM as MCP Client

### 3.1 Client Architecture

TinyPM acts as an MCP client to connect to external servers:

```
┌─────────────────────────────────────────────────────────────────────┐
│                      TINYPM MCP CLIENT                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    MCP CLIENT MANAGER                        │   │
│  │  - Connects to multiple MCP servers                          │   │
│  │  - Routes tool calls to appropriate server                   │   │
│  │  - Handles capability discovery                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│              ┌───────────────┼───────────────┐                     │
│              ▼               ▼               ▼                     │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐          │
│  │  Playwright   │  │   Supabase    │  │  Filesystem   │          │
│  │    Client     │  │    Client     │  │    Client     │          │
│  └───────────────┘  └───────────────┘  └───────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Implementation: mcp_client.py

```python
#!/usr/bin/env python3
"""
TinyPM MCP Client - Connect to external MCP servers.

Allows TinyPM to use external tools like:
- Playwright for browser automation
- Supabase for database operations
- Filesystem for file access
- Custom MCP servers
"""

import asyncio
import json
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# MCP SDK imports
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class MCPServerConfig:
    """Configuration for an MCP server connection."""
    name: str
    command: str
    args: List[str]
    env: Optional[Dict[str, str]] = None
    timeout: int = 30


# Default MCP servers TinyPM should connect to
DEFAULT_SERVERS = {
    "playwright": MCPServerConfig(
        name="playwright",
        command="npx",
        args=["@playwright/mcp@latest"],
        timeout=60
    ),
    "filesystem": MCPServerConfig(
        name="filesystem",
        command="npx",
        args=[
            "-y", "@modelcontextprotocol/server-filesystem@latest",
            str(Path.home() / "Documents")  # Allowed directories
        ]
    ),
    "supabase": MCPServerConfig(
        name="supabase",
        command="npx",
        args=["-y", "supabase-mcp"],
        env={
            "SUPABASE_URL": "your-supabase-url",
            "SUPABASE_SERVICE_KEY": "your-service-key"
        }
    )
}


# ═══════════════════════════════════════════════════════════════════════════════
# MCP CLIENT MANAGER
# ═══════════════════════════════════════════════════════════════════════════════

class MCPClientManager:
    """
    Manages connections to multiple MCP servers.

    Features:
    - Connect to multiple servers simultaneously
    - Route tool calls to appropriate server
    - Handle capability discovery
    - Graceful error handling
    """

    def __init__(self):
        self.sessions: Dict[str, ClientSession] = {}
        self.server_tools: Dict[str, List[Dict]] = {}
        self.server_resources: Dict[str, List[Dict]] = {}
        self._connected_servers: List[str] = []

    async def connect_server(self, config: MCPServerConfig) -> bool:
        """
        Connect to an MCP server.

        Args:
            config: Server configuration

        Returns:
            True if connection successful
        """
        try:
            server_params = StdioServerParameters(
                command=config.command,
                args=config.args,
                env=config.env
            )

            # Create connection
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    # Initialize
                    await session.initialize()

                    # Store session
                    self.sessions[config.name] = session
                    self._connected_servers.append(config.name)

                    # Discover capabilities
                    tools = await session.list_tools()
                    self.server_tools[config.name] = [
                        {
                            "name": tool.name,
                            "description": tool.description,
                            "inputSchema": tool.inputSchema
                        }
                        for tool in tools.tools
                    ]

                    resources = await session.list_resources()
                    self.server_resources[config.name] = [
                        {
                            "uri": resource.uri,
                            "name": resource.name,
                            "description": resource.description
                        }
                        for resource in resources.resources
                    ]

                    print(f"[MCP] Connected to {config.name}: {len(self.server_tools[config.name])} tools")
                    return True

        except Exception as e:
            print(f"[MCP] Failed to connect to {config.name}: {e}")
            return False

    async def connect_all(self, servers: Dict[str, MCPServerConfig] = None):
        """Connect to all configured servers."""
        servers = servers or DEFAULT_SERVERS

        for name, config in servers.items():
            await self.connect_server(config)

    def get_all_tools(self) -> List[Dict]:
        """
        Get all tools from all connected servers.

        Returns tool list with server prefix for routing.
        """
        all_tools = []
        for server_name, tools in self.server_tools.items():
            for tool in tools:
                all_tools.append({
                    **tool,
                    "name": f"{server_name}__{tool['name']}",  # Prefix for routing
                    "server": server_name
                })
        return all_tools

    async def call_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any]
    ) -> Tuple[Any, bool]:
        """
        Call a tool on the appropriate server.

        Args:
            tool_name: Tool name (with or without server prefix)
            arguments: Tool arguments

        Returns:
            (result, success)
        """
        # Parse server prefix if present
        if "__" in tool_name:
            server_name, actual_tool = tool_name.split("__", 1)
        else:
            # Find which server has this tool
            server_name = None
            actual_tool = tool_name
            for sname, tools in self.server_tools.items():
                if any(t["name"] == tool_name for t in tools):
                    server_name = sname
                    break

        if not server_name or server_name not in self.sessions:
            return {"error": f"Server not found for tool: {tool_name}"}, False

        try:
            session = self.sessions[server_name]
            result = await session.call_tool(actual_tool, arguments)
            return result, True
        except Exception as e:
            return {"error": str(e)}, False

    async def read_resource(
        self,
        server_name: str,
        uri: str
    ) -> Tuple[Any, bool]:
        """
        Read a resource from a server.

        Args:
            server_name: Server to read from
            uri: Resource URI

        Returns:
            (content, success)
        """
        if server_name not in self.sessions:
            return {"error": f"Server not connected: {server_name}"}, False

        try:
            session = self.sessions[server_name]
            result = await session.read_resource(uri)
            return result, True
        except Exception as e:
            return {"error": str(e)}, False

    def list_connected_servers(self) -> List[str]:
        """Get list of connected server names."""
        return self._connected_servers.copy()


# Global client manager instance
_client_manager: Optional[MCPClientManager] = None


def get_mcp_client() -> MCPClientManager:
    """Get or create the MCP client manager."""
    global _client_manager
    if _client_manager is None:
        _client_manager = MCPClientManager()
    return _client_manager


# ═══════════════════════════════════════════════════════════════════════════════
# CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

async def playwright_navigate(url: str) -> Dict[str, Any]:
    """Navigate Playwright browser to URL."""
    client = get_mcp_client()
    result, success = await client.call_tool("playwright__browser_navigate", {"url": url})
    return result if success else {"error": "Navigation failed"}


async def playwright_screenshot() -> Dict[str, Any]:
    """Take a screenshot of current page."""
    client = get_mcp_client()
    result, success = await client.call_tool("playwright__browser_screenshot", {})
    return result if success else {"error": "Screenshot failed"}


async def supabase_query(table: str, query: str) -> Dict[str, Any]:
    """Execute a Supabase query."""
    client = get_mcp_client()
    result, success = await client.call_tool(
        "supabase__execute_query",
        {"table": table, "query": query}
    )
    return result if success else {"error": "Query failed"}


# ═══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

async def main():
    """Test MCP client connections."""
    client = get_mcp_client()

    print("Connecting to MCP servers...")
    await client.connect_all()

    print(f"\nConnected servers: {client.list_connected_servers()}")

    print("\nAvailable tools:")
    for tool in client.get_all_tools():
        print(f"  - {tool['name']}: {tool.get('description', '')[:60]}...")


if __name__ == "__main__":
    asyncio.run(main())
```

---

## Part 4: MCP Servers TinyPM Should Connect To

### 4.1 Essential MCP Servers

| Server | Purpose | Priority |
|--------|---------|----------|
| **Playwright** | Browser automation for Wild Claims Czar | CRITICAL |
| **Filesystem** | Read/write files in workspace | CRITICAL |
| **Supabase** | Database operations | HIGH |
| **Git** | Version control operations | HIGH |
| **Memory** | Knowledge graph persistence | MEDIUM |
| **Fetch** | Web content fetching | MEDIUM |

### 4.2 Server Configurations

**Playwright MCP (Browser Automation):**
```json
{
  "playwright": {
    "command": "npx",
    "args": ["@playwright/mcp@latest"],
    "env": {
      "PLAYWRIGHT_HEADLESS": "true"
    }
  }
}
```

**Supabase MCP (Database):**
```json
{
  "supabase": {
    "command": "npx",
    "args": ["-y", "supabase-mcp"],
    "env": {
      "SUPABASE_URL": "${SUPABASE_URL}",
      "SUPABASE_SERVICE_KEY": "${SUPABASE_SERVICE_KEY}",
      "SUPABASE_READONLY": "true"
    }
  }
}
```

**Filesystem MCP:**
```json
{
  "filesystem": {
    "command": "npx",
    "args": [
      "-y", "@modelcontextprotocol/server-filesystem@latest",
      "/Users/samanthapollack/Documents/TIny_Seed_OS"
    ]
  }
}
```

**Git MCP:**
```json
{
  "git": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-git@latest"],
    "env": {
      "GIT_REPO_PATH": "/Users/samanthapollack/Documents/TIny_Seed_OS"
    }
  }
}
```

---

## Part 5: Security Model

### 5.1 MCP Security Architecture (June 2025 Spec)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      MCP SECURITY LAYERS                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Layer 1: TRANSPORT SECURITY                                        │
│  - HTTPS for remote servers (mandatory in production)               │
│  - TLS 1.3 minimum                                                  │
│  - Certificate validation                                           │
│                                                                     │
│  Layer 2: AUTHENTICATION (OAuth 2.1)                                │
│  - MCP servers = OAuth Resource Servers                             │
│  - External Authorization Server (Keycloak, Auth0, etc.)            │
│  - Resource Indicators (RFC 8707) prevent token misuse              │
│                                                                     │
│  Layer 3: AUTHORIZATION                                             │
│  - Scoped permissions per tool                                      │
│  - Fine-grained access control                                      │
│  - Role-based tool access                                           │
│                                                                     │
│  Layer 4: INPUT VALIDATION                                          │
│  - Schema validation for all tool inputs                            │
│  - Injection prevention                                             │
│  - Rate limiting                                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 TinyPM Security Implementation

**For Local MCP Server (Stdio Transport):**
```python
# Security handled by filesystem permissions and local user context
# No additional OAuth needed for local tools
```

**For Remote MCP Server (HTTP Transport):**
```python
from mcp.server.auth.settings import AuthSettings
from pydantic import AnyHttpUrl

# OAuth 2.1 configuration
auth_settings = AuthSettings(
    issuer_url=AnyHttpUrl("https://auth.tinypm.app"),
    required_scopes=["tinypm:tasks", "tinypm:agents"],
    resource_server_url=AnyHttpUrl("https://api.tinypm.app")
)

mcp = FastMCP(
    name="TinyPM",
    auth=auth_settings,
    token_verifier=YourTokenVerifier()  # Implement token validation
)
```

### 5.3 Security Best Practices

1. **Never log tokens or credentials**
2. **Use short-lived access tokens** (1 hour max)
3. **Validate audience claims** in tokens
4. **Implement rate limiting** per tool
5. **Use allowlists** for tool parameters
6. **Sandbox file system access** to specific directories
7. **Audit all tool executions**

---

## Part 6: Implementation Roadmap

### Sprint 1: Core MCP Server (Week 1-2)

- [ ] Create `mcp_server.py` with basic tools
- [ ] Implement task management tools
- [ ] Add agent communication tools
- [ ] Test with Claude Desktop
- [ ] Write unit tests

### Sprint 2: MCP Client + External Servers (Week 3-4)

- [ ] Create `mcp_client.py` manager
- [ ] Connect to Playwright MCP
- [ ] Connect to Filesystem MCP
- [ ] Integrate with Wild Claims Czar
- [ ] Test browser automation

### Sprint 3: Advanced Features (Week 5-6)

- [ ] Add predictive intelligence tools
- [ ] Implement memory resources
- [ ] Create prompt templates
- [ ] Add Supabase MCP connection
- [ ] Performance optimization

### Sprint 4: Security + Production (Week 7-8)

- [ ] Implement OAuth 2.1 for HTTP transport
- [ ] Add rate limiting
- [ ] Security audit
- [ ] Documentation
- [ ] Production deployment

---

## Part 7: Testing

### 7.1 MCP Inspector

Test MCP server with the official inspector:

```bash
# Install inspector
npm install -g @modelcontextprotocol/inspector

# Run TinyPM server
python3 mcp_server.py &

# Connect inspector
mcp-inspector
# Navigate to http://localhost:5173
# Connect to your server
```

### 7.2 Unit Tests

```python
# tests/test_mcp_server.py
import pytest
import asyncio
from mcp_server import task_create, task_list, task_update

@pytest.mark.asyncio
async def test_task_create():
    result = await task_create("Test Task", "Description", "high")
    assert result["success"] == True
    assert result["task"]["title"] == "Test Task"

@pytest.mark.asyncio
async def test_task_list():
    result = await task_list(status="pending")
    assert "tasks" in result
    assert "total" in result

@pytest.mark.asyncio
async def test_task_update():
    # Create task first
    created = await task_create("Update Test", "", "low")
    task_id = created["task"]["id"]

    # Update it
    result = await task_update(task_id, status="in_progress")
    assert result["success"] == True
    assert result["task"]["status"] == "in_progress"
```

---

## Part 8: References

### Official Documentation
- [MCP Specification](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP Architecture](https://modelcontextprotocol.io/docs/learn/architecture)
- [Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

### MCP Servers
- [Official Servers Repository](https://github.com/modelcontextprotocol/servers)
- [Playwright MCP](https://github.com/microsoft/playwright-mcp)
- [Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp)

### Security
- [MCP Authorization Guide](https://modelcontextprotocol.io/docs/tutorials/security/authorization)
- [OAuth 2.1 Specification](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-13)
- [RFC 9728 - Protected Resource Metadata](https://datatracker.ietf.org/doc/html/rfc9728)

### Learning Resources
- [Anthropic MCP Course](https://anthropic.skilljar.com/introduction-to-model-context-protocol)
- [DeepLearning.AI MCP Course](https://learn.deeplearning.ai/courses/mcp-build-rich-context-ai-apps-with-anthropic)

---

## Conclusion

MCP integration transforms TinyPM from a standalone application into a **universal AI tool platform**. By exposing TinyPM's capabilities via MCP and connecting to external MCP servers, TinyPM becomes:

1. **Accessible from anywhere** - Claude Desktop, VS Code, any MCP client
2. **Extensible** - Connect to any MCP-compatible tool
3. **Interoperable** - Works with Claude, GPT, Gemini, and future models
4. **Production-ready** - Following industry standards backed by major AI companies

**This is the future of AI tool integration. TinyPM will be ready.**

---

*NO SHORTCUTS. STATE OF THE ART. PRODUCTION READY.*

*Document Version: 1.0.0*
*Last Updated: 2026-01-30*
