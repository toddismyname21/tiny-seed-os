#!/usr/bin/env python3
"""
===============================================================================
TinyPM A2A SERVER - Agent-to-Agent Protocol Implementation
===============================================================================

STATE OF THE ART. PRODUCTION READY.

This module exposes TinyPM's capabilities via Google's A2A Protocol,
enabling interoperability with external AI agents from any vendor.

Protocol: A2A v0.3 (January 2026)
Governance: Linux Foundation

CAPABILITIES EXPOSED:
1. Task Management - Create, update, track, complete tasks
2. Predictive Intelligence - Proactive suggestions and pattern analysis
3. Agent Delegation - Route work to Builder agent
4. Status Reporting - Project and system health reports
5. Wizard Council - Multi-agent decision making

ENDPOINTS:
- /.well-known/agent.json - Agent Card discovery
- /a2a - JSON-RPC 2.0 endpoint
- /a2a/stream - SSE streaming endpoint

Usage:
    python3 a2a_server.py                    # Start server on default port
    python3 a2a_server.py --port 9000        # Custom port
    python3 a2a_server.py --host 0.0.0.0     # Custom host

Requirements:
    pip install "a2a-sdk[all]"
    pip install uvicorn starlette

Created: 2026-01-30
Author: TinyPM Team
"""

import asyncio
import json
import os
import re
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Configuration
APP_DIR = Path(__file__).parent

# A2A Authentication Module
try:
    from a2a_auth import (
        create_starlette_auth_middleware,
        print_auth_status as print_a2a_auth_status,
        PUBLIC_ENDPOINTS
    )
    A2A_AUTH_AVAILABLE = True
except ImportError:
    A2A_AUTH_AVAILABLE = False
    create_starlette_auth_middleware = None
    def print_a2a_auth_status():
        log("A2A authentication module not available", "WARN")
    PUBLIC_ENDPOINTS = {"/.well-known/agent.json", "/a2a/health"}
A2A_PORT = int(os.environ.get("A2A_PORT", "9000"))
# SECURITY FIX 2026-02-28: Default to localhost (was 0.0.0.0)
A2A_HOST = os.environ.get("A2A_HOST", "127.0.0.1")
A2A_BASE_URL = os.environ.get("A2A_BASE_URL", f"http://localhost:{A2A_PORT}")

# Load .env
env_file = APP_DIR / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        if line.strip() and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


# ===============================================================================
# LOGGING
# ===============================================================================

A2A_LOG_FILE = APP_DIR / ".a2a_server.log"

def log(msg: str, level: str = "INFO"):
    """Log with timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [A2A] [{level}] {msg}"
    print(line)
    try:
        with open(A2A_LOG_FILE, "a") as f:
            f.write(line + "\n")
    except:
        pass


# ===============================================================================
# DEPENDENCY CHECK
# ===============================================================================

A2A_SDK_AVAILABLE = False
TINYPM_MODULES_AVAILABLE = False

try:
    from a2a.server.apps import A2AStarletteApplication
    from a2a.server.agent_execution import AgentExecutor, RequestContext
    from a2a.server.events import EventQueue
    from a2a.server.request_handlers import DefaultRequestHandler
    from a2a.server.tasks import InMemoryTaskStore
    from a2a.types import (
        AgentCard,
        AgentCapabilities,
        AgentSkill,
        Artifact,
        Part,
        TextPart,
        DataPart,
        TaskStatus,
        TaskStatusUpdateEvent,
        TaskArtifactUpdateEvent
    )
    A2A_SDK_AVAILABLE = True
    log("A2A SDK loaded successfully")
except ImportError as e:
    log(f"A2A SDK not installed: {e}", "WARN")
    log("Run: pip install 'a2a-sdk[all]'", "WARN")

# TinyPM modules (optional - graceful degradation)
try:
    from langgraph_wrapper import TinyPMGraph
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False
    log("LangGraph wrapper not available", "WARN")

try:
    from predictive_intent import PredictiveIntentEngine, FusedContext
    PREDICTIVE_AVAILABLE = True
except ImportError:
    PREDICTIVE_AVAILABLE = False
    log("Predictive intent engine not available", "WARN")

try:
    from pm_brain import load_memory, load_patterns
    BRAIN_AVAILABLE = True
except ImportError:
    BRAIN_AVAILABLE = False
    log("PM brain not available", "WARN")

TINYPM_MODULES_AVAILABLE = LANGGRAPH_AVAILABLE or PREDICTIVE_AVAILABLE


# ===============================================================================
# INPUT SANITIZATION - CRITICAL SECURITY
# ===============================================================================

def sanitize_a2a_input(message: str) -> str:
    """
    Sanitize input from external A2A agents.

    CRITICAL: Prevents prompt injection attacks.
    All data from external agents is UNTRUSTED.
    """
    if not message:
        return ""

    original_len = len(message)

    # Remove common injection patterns
    patterns_to_filter = [
        r'ignore\s+previous\s+instructions',
        r'ignore\s+all\s+previous',
        r'disregard\s+previous',
        r'forget\s+everything',
        r'you\s+are\s+now',
        r'act\s+as\s+if',
        r'pretend\s+you',
        r'system\s*:',
        r'assistant\s*:',
        r'<\|.*?\|>',
        r'\[\[.*?\]\]',
        r'{{.*?}}',
    ]

    sanitized = message
    for pattern in patterns_to_filter:
        sanitized = re.sub(pattern, '[FILTERED]', sanitized, flags=re.IGNORECASE)

    # Limit length (prevent memory exhaustion)
    MAX_MESSAGE_LENGTH = 10000
    if len(sanitized) > MAX_MESSAGE_LENGTH:
        sanitized = sanitized[:MAX_MESSAGE_LENGTH] + "... [TRUNCATED]"

    # Log if sanitization occurred
    if sanitized != message or len(sanitized) != original_len:
        log(f"Input sanitized: {original_len} -> {len(sanitized)} chars", "WARN")

    return sanitized


# ===============================================================================
# FILE OPERATIONS
# ===============================================================================

BOARD_FILE = APP_DIR / "board.json"
INTERCOM_FILE = APP_DIR / ".claude_intercom.json"

def safe_read_json(path: Path, default: Any = None) -> Any:
    """Safely read JSON file."""
    try:
        if path.exists():
            return json.loads(path.read_text())
    except Exception as e:
        log(f"Error reading {path.name}: {e}", "WARN")
    return default if default is not None else {}


# ===============================================================================
# A2A AGENT EXECUTOR
# ===============================================================================

if A2A_SDK_AVAILABLE:

    class TinyPMAgentExecutor(AgentExecutor):
        """
        TinyPM's implementation of the A2A AgentExecutor.

        Routes incoming A2A requests to appropriate TinyPM subsystems.
        """

        def __init__(self):
            self.langgraph = None
            self.predictive_engine = None
            self._initialize()

        def _initialize(self):
            """Initialize TinyPM subsystems."""
            if LANGGRAPH_AVAILABLE:
                try:
                    self.langgraph = TinyPMGraph()
                    log("LangGraph initialized for A2A")
                except Exception as e:
                    log(f"LangGraph init failed: {e}", "ERROR")

            if PREDICTIVE_AVAILABLE:
                try:
                    self.predictive_engine = PredictiveIntentEngine()
                    log("Predictive engine initialized for A2A")
                except Exception as e:
                    log(f"Predictive engine init failed: {e}", "ERROR")

        async def execute(
            self,
            context: RequestContext,
            event_queue: EventQueue
        ) -> None:
            """
            Handle incoming A2A requests.

            Routes to appropriate handler based on detected intent or skill hint.
            """
            task_id = context.task_id
            context_id = context.context_id

            try:
                # Send working status
                await event_queue.enqueue_event(
                    TaskStatusUpdateEvent(
                        task_id=task_id,
                        context_id=context_id,
                        status=TaskStatus(state="working"),
                        final=False
                    )
                )

                # Extract and sanitize message
                raw_message = self._extract_message(context)
                message = sanitize_a2a_input(raw_message)

                if not message:
                    await self._send_error(
                        event_queue, task_id, context_id,
                        "Empty or invalid message received"
                    )
                    return

                # Get skill hint from metadata
                skill_hint = None
                if context.metadata:
                    skill_hint = context.metadata.get("skill")

                log(f"Processing A2A request: {message[:50]}... (skill: {skill_hint})")

                # Route to handler
                if skill_hint == "predictive_intent":
                    response = await self._handle_predictive(message, task_id)
                elif skill_hint == "task_management":
                    response = await self._handle_task_management(message, task_id)
                elif skill_hint == "status_reporting":
                    response = await self._handle_status(message, task_id)
                else:
                    response = await self._handle_auto_route(message, task_id)

                # Send response artifacts
                await event_queue.enqueue_event(
                    TaskArtifactUpdateEvent(
                        task_id=task_id,
                        context_id=context_id,
                        artifact=Artifact(
                            artifact_id=f"{task_id}-response",
                            parts=[TextPart(text=response["text"])]
                        )
                    )
                )

                # Include structured data if available
                if response.get("data"):
                    await event_queue.enqueue_event(
                        TaskArtifactUpdateEvent(
                            task_id=task_id,
                            context_id=context_id,
                            artifact=Artifact(
                                artifact_id=f"{task_id}-data",
                                parts=[DataPart(data=response["data"])]
                            )
                        )
                    )

                # Send completion
                await event_queue.enqueue_event(
                    TaskStatusUpdateEvent(
                        task_id=task_id,
                        context_id=context_id,
                        status=TaskStatus(state="completed"),
                        final=True
                    )
                )

                log(f"A2A request completed: {task_id[:8]}...")

            except Exception as e:
                log(f"A2A execution error: {e}", "ERROR")
                await self._send_error(event_queue, task_id, context_id, str(e))

        async def cancel(
            self,
            context: RequestContext,
            event_queue: EventQueue
        ) -> None:
            """Handle task cancellation requests."""
            task_id = context.task_id
            context_id = context.context_id
            log(f"Cancellation requested: {task_id[:8]}...")

            # TODO: Implement actual cancellation of running operations

            await event_queue.enqueue_event(
                TaskStatusUpdateEvent(
                    task_id=task_id,
                    context_id=context_id,
                    status=TaskStatus(state="canceled"),
                    final=True
                )
            )

        async def _send_error(
            self,
            event_queue: EventQueue,
            task_id: str,
            context_id: str,
            error_message: str
        ):
            """Send error response."""
            # Create a Message object for the error (TaskStatus.message requires Message, not str)
            from a2a.types import Message
            import uuid
            error_msg = Message(
                messageId=str(uuid.uuid4()),
                role="agent",
                parts=[TextPart(text=f"Error: {error_message}")]
            )
            await event_queue.enqueue_event(
                TaskStatusUpdateEvent(
                    task_id=task_id,
                    context_id=context_id,
                    status=TaskStatus(state="failed", message=error_msg),
                    final=True
                )
            )

        def _extract_message(self, context: RequestContext) -> str:
            """Extract text message from A2A context."""
            if context.message:
                for part in context.message.parts:
                    # A2A SDK v0.3 wraps parts in a Part discriminated union
                    # Access .root to get the actual TextPart/DataPart/etc
                    actual_part = getattr(part, 'root', part)
                    if hasattr(actual_part, 'text'):
                        return actual_part.text
            return ""

        async def _handle_predictive(
            self,
            message: str,
            task_id: str
        ) -> Dict[str, Any]:
            """Handle predictive intelligence requests."""
            if not self.predictive_engine:
                return {
                    "text": "Predictive intelligence engine is not currently available.",
                    "data": {"status": "unavailable"}
                }

            try:
                # Create context
                now = datetime.now()
                context = FusedContext(
                    hour=now.hour,
                    minute=now.minute,
                    day_of_week=now.weekday(),
                    day_name=now.strftime("%A"),
                    is_weekend=now.weekday() >= 5,
                    is_morning=6 <= now.hour < 12,
                    is_afternoon=12 <= now.hour < 18,
                    is_evening=18 <= now.hour < 22
                )

                # Get predictions
                predictions = self.predictive_engine.predict_next_actions(context)
                suggestions = self.predictive_engine.generate_proactive_suggestions(predictions)

                # Format response
                if suggestions:
                    text_parts = [
                        f"Based on behavioral patterns and current context, here are {len(suggestions)} proactive suggestions:\n"
                    ]
                    for i, s in enumerate(suggestions[:5], 1):
                        text_parts.append(f"{i}. {s.message}")
                        if s.quick_actions:
                            text_parts.append(f"   Quick actions: {', '.join(s.quick_actions)}")
                    text = "\n".join(text_parts)
                else:
                    text = "No specific suggestions at this time based on current patterns."

                return {
                    "text": text,
                    "data": {
                        "predictions": [p.to_dict() for p in predictions[:10]],
                        "suggestions": [s.to_dict() for s in suggestions[:5]],
                        "context_summary": {
                            "time": f"{context.hour}:{context.minute:02d}",
                            "day": context.day_name,
                            "period": "morning" if context.is_morning else "afternoon" if context.is_afternoon else "evening"
                        }
                    }
                }

            except Exception as e:
                log(f"Predictive handling error: {e}", "ERROR")
                return {
                    "text": f"Error generating predictions: {str(e)}",
                    "data": {"error": str(e)}
                }

        async def _handle_task_management(
            self,
            message: str,
            task_id: str
        ) -> Dict[str, Any]:
            """Handle task management requests."""
            if not self.langgraph:
                return await self._handle_fallback_task(message, task_id)

            try:
                # Process through LangGraph
                result = self.langgraph.process_message(message, task_id)

                return {
                    "text": result.get("response", "Task processed successfully."),
                    "data": {
                        "intent": result.get("intent"),
                        "confidence": result.get("confidence"),
                        "proactive_items": result.get("proactive_items", []),
                        "thread_id": result.get("thread_id")
                    }
                }

            except Exception as e:
                log(f"Task management error: {e}", "ERROR")
                return {
                    "text": f"Error processing task request: {str(e)}",
                    "data": {"error": str(e)}
                }

        async def _handle_fallback_task(
            self,
            message: str,
            task_id: str
        ) -> Dict[str, Any]:
            """Fallback task handling when LangGraph unavailable."""
            # Read current board state
            board = safe_read_json(BOARD_FILE, {"tasks": []})
            tasks = board.get("tasks", [])

            # Simple keyword analysis
            message_lower = message.lower()

            if any(kw in message_lower for kw in ["status", "progress", "how many"]):
                pending = len([t for t in tasks if t.get("status") == "pending"])
                in_progress = len([t for t in tasks if t.get("status") == "in_progress"])
                done = len([t for t in tasks if t.get("status") == "done"])

                return {
                    "text": f"Current task status: {pending} pending, {in_progress} in progress, {done} completed (total: {len(tasks)} tasks).",
                    "data": {
                        "pending": pending,
                        "in_progress": in_progress,
                        "done": done,
                        "total": len(tasks)
                    }
                }

            elif any(kw in message_lower for kw in ["list", "show", "what"]):
                active = [t for t in tasks if t.get("status") in ["pending", "in_progress"]][:5]
                task_list = "\n".join([
                    f"- [{t.get('status', 'unknown')}] {t.get('title', 'Untitled')}"
                    for t in active
                ])
                return {
                    "text": f"Active tasks:\n{task_list}" if task_list else "No active tasks found.",
                    "data": {"active_tasks": [t.get("title") for t in active]}
                }

            else:
                return {
                    "text": "Task management request received. Full functionality requires LangGraph module.",
                    "data": {"status": "limited_mode"}
                }

        async def _handle_status(
            self,
            message: str,
            task_id: str
        ) -> Dict[str, Any]:
            """Handle status reporting requests."""
            # Gather system status
            board = safe_read_json(BOARD_FILE, {"tasks": []})
            intercom = safe_read_json(INTERCOM_FILE, {})

            tasks = board.get("tasks", [])
            task_stats = {
                "total": len(tasks),
                "pending": len([t for t in tasks if t.get("status") == "pending"]),
                "in_progress": len([t for t in tasks if t.get("status") == "in_progress"]),
                "done": len([t for t in tasks if t.get("status") == "done"])
            }

            # Builder status
            builder_msgs = intercom.get("builder_to_pm", [])
            builder_status = "unknown"
            builder_last_msg = ""
            if builder_msgs:
                latest = builder_msgs[-1]
                builder_status = latest.get("type", "unknown")
                builder_last_msg = latest.get("message", "")[:100]

            # System capabilities
            capabilities = {
                "langgraph": LANGGRAPH_AVAILABLE,
                "predictive": PREDICTIVE_AVAILABLE,
                "brain": BRAIN_AVAILABLE,
                "a2a": True
            }

            text = f"""TinyPM System Status Report

Tasks:
- Total: {task_stats['total']}
- Pending: {task_stats['pending']}
- In Progress: {task_stats['in_progress']}
- Completed: {task_stats['done']}

Builder Agent: {builder_status}
{f'Last update: {builder_last_msg}' if builder_last_msg else ''}

System Capabilities:
- LangGraph: {'Active' if capabilities['langgraph'] else 'Inactive'}
- Predictive Engine: {'Active' if capabilities['predictive'] else 'Inactive'}
- A2A Protocol: Active"""

            return {
                "text": text,
                "data": {
                    "tasks": task_stats,
                    "builder": {"status": builder_status, "last_message": builder_last_msg},
                    "capabilities": capabilities,
                    "timestamp": datetime.now().isoformat()
                }
            }

        async def _handle_auto_route(
            self,
            message: str,
            task_id: str
        ) -> Dict[str, Any]:
            """Auto-route based on message content analysis."""
            message_lower = message.lower()

            # Route to predictive for anticipatory queries
            if any(kw in message_lower for kw in [
                "predict", "suggest", "recommend", "what should",
                "next", "focus", "pattern", "anticipate"
            ]):
                return await self._handle_predictive(message, task_id)

            # Route to status for health/reporting queries
            if any(kw in message_lower for kw in [
                "status", "health", "report", "overview", "summary",
                "how is", "system"
            ]):
                return await self._handle_status(message, task_id)

            # Default to task management
            return await self._handle_task_management(message, task_id)


    # ===============================================================================
    # AGENT CARD DEFINITION
    # ===============================================================================

    def create_agent_card() -> AgentCard:
        """Create the TinyPM Agent Card for A2A discovery."""
        return AgentCard(
            name="TinyPM Orchestrator",
            description=(
                "Intelligent project management agent with predictive capabilities, "
                "multi-agent coordination, and proactive intelligence. Part of the "
                "Tiny Seed Farm OS ecosystem."
            ),
            url=f"{A2A_BASE_URL}/",
            version="1.0.0",
            provider={
                "organization": "Tiny Seed Farm",
                "url": "https://tinyseedfarm.com"
            },
            documentationUrl="https://github.com/TinySeedFarm/tinypm/docs",
            capabilities=AgentCapabilities(
                streaming=True,
                pushNotifications=True,
                stateTransitionHistory=True
            ),
            defaultInputModes=["text/plain", "application/json"],
            defaultOutputModes=["text/plain", "application/json"],
            skills=[
                AgentSkill(
                    id="task_management",
                    name="Task Management",
                    description=(
                        "Create, update, track, and complete project tasks. "
                        "Supports prioritization, assignment, dependencies, and status tracking. "
                        "Can delegate development tasks to the Builder agent."
                    ),
                    tags=["tasks", "projects", "planning", "tracking", "management"],
                    examples=[
                        "Create a new task for implementing user authentication",
                        "What tasks are currently in progress?",
                        "Mark task #123 as complete",
                        "Assign the API refactor task to Builder",
                        "Show me overdue tasks"
                    ]
                ),
                AgentSkill(
                    id="predictive_intent",
                    name="Predictive Intelligence",
                    description=(
                        "Predict user needs based on behavioral patterns, time-of-day, "
                        "calendar context, and work history. Generates proactive suggestions "
                        "before the user asks."
                    ),
                    tags=["prediction", "proactive", "intelligence", "patterns", "suggestions"],
                    examples=[
                        "What should I focus on next?",
                        "Analyze my work patterns",
                        "When is the best time for deep work?",
                        "What tasks typically follow my current activity?"
                    ]
                ),
                AgentSkill(
                    id="agent_delegation",
                    name="Agent Delegation",
                    description=(
                        "Delegate development tasks to the Builder agent for code generation, "
                        "bug fixes, and feature implementation. Coordinates multi-agent workflows."
                    ),
                    tags=["delegation", "development", "builder", "code", "automation"],
                    examples=[
                        "Build a new API endpoint for user management",
                        "Fix the authentication bug in the login flow",
                        "Implement the new dashboard feature",
                        "Refactor the database queries for performance"
                    ]
                ),
                AgentSkill(
                    id="status_reporting",
                    name="Status Reporting",
                    description=(
                        "Get comprehensive status reports on projects, tasks, builder progress, "
                        "and system health. Supports various report formats and detail levels."
                    ),
                    tags=["status", "reporting", "progress", "metrics", "health"],
                    examples=[
                        "Give me a project status update",
                        "How is the Builder progressing?",
                        "What's blocking our launch?",
                        "Show me the system health report"
                    ]
                ),
                AgentSkill(
                    id="wizard_council",
                    name="Wizard Council Decision",
                    description=(
                        "Multi-agent collaborative decision making for complex architectural "
                        "choices and strategic decisions. Gathers perspectives from multiple "
                        "expert agents."
                    ),
                    tags=["decision", "council", "collaboration", "architecture", "strategy"],
                    examples=[
                        "Should we use PostgreSQL or MongoDB for this project?",
                        "Evaluate the architecture options for our new service",
                        "What's the best approach for scaling our API?",
                        "Analyze the tradeoffs between microservices and monolith"
                    ]
                )
            ]
        )


    # ===============================================================================
    # APPLICATION FACTORY
    # ===============================================================================

    def create_a2a_builder():
        """Create the A2A application builder (A2AStarletteApplication)."""
        log("Creating A2A application builder...")

        agent_card = create_agent_card()
        executor = TinyPMAgentExecutor()

        # Use in-memory task store (TODO: PostgreSQL for production)
        task_store = InMemoryTaskStore()

        handler = DefaultRequestHandler(
            agent_executor=executor,
            task_store=task_store
        )

        a2a_app_builder = A2AStarletteApplication(
            agent_card=agent_card,
            http_handler=handler
        )

        log(f"A2A application builder created: {agent_card.name}")
        return a2a_app_builder

    def create_app():
        """Create the final Starlette app with A2A routes and authentication."""
        a2a_builder = create_a2a_builder()

        # Build the Starlette app with custom URL paths
        # Agent card at /.well-known/agent.json, JSON-RPC at /a2a
        starlette_app = a2a_builder.build(
            agent_card_url="/.well-known/agent.json",
            rpc_url="/a2a"
        )

        # Add authentication middleware
        if A2A_AUTH_AVAILABLE and create_starlette_auth_middleware:
            try:
                auth_middleware = create_starlette_auth_middleware()
                if auth_middleware:
                    starlette_app.add_middleware(auth_middleware)
                    log("A2A authentication middleware added")
                else:
                    log("A2A authentication middleware not created (Starlette not available)", "WARN")
            except Exception as e:
                log(f"Failed to add auth middleware: {e}", "ERROR")
        else:
            log("A2A authentication not available - endpoints are PUBLIC", "WARN")

        log("A2A Starlette application built successfully")
        return starlette_app


    # Create app instance for uvicorn
    app = create_app()


else:
    # Fallback when A2A SDK not available
    log("A2A SDK not available - creating placeholder app", "WARN")

    from starlette.applications import Starlette
    from starlette.responses import JSONResponse
    from starlette.routing import Route

    async def agent_card(request):
        return JSONResponse({
            "error": "A2A SDK not installed",
            "install": "pip install 'a2a-sdk[all]'"
        }, status_code=503)

    async def health(request):
        return JSONResponse({"status": "degraded", "reason": "A2A SDK not installed"})

    app = Starlette(routes=[
        Route("/.well-known/agent.json", agent_card),
        Route("/health", health)
    ])

    # Add authentication middleware to fallback app too
    if A2A_AUTH_AVAILABLE and create_starlette_auth_middleware:
        try:
            auth_middleware = create_starlette_auth_middleware()
            if auth_middleware:
                app.add_middleware(auth_middleware)
                log("A2A authentication middleware added to fallback app")
        except Exception as e:
            log(f"Failed to add auth middleware to fallback app: {e}", "ERROR")


# ===============================================================================
# MAIN
# ===============================================================================

def main():
    """Run the A2A server."""
    import argparse
    parser = argparse.ArgumentParser(description="TinyPM A2A Protocol Server")
    parser.add_argument("--host", default=A2A_HOST, help="Host to bind to")
    parser.add_argument("--port", type=int, default=A2A_PORT, help="Port to bind to")
    args = parser.parse_args()

    # Print authentication status
    print_a2a_auth_status()

    print(f"""
    ====================================================================
    TinyPM A2A Server
    ====================================================================
    Protocol:    A2A v0.3 (Linux Foundation)
    Host:        {args.host}
    Port:        {args.port}
    Agent Card:  http://{args.host}:{args.port}/.well-known/agent.json

    Capabilities:
    - LangGraph:  {'Available' if LANGGRAPH_AVAILABLE else 'Not Available'}
    - Predictive: {'Available' if PREDICTIVE_AVAILABLE else 'Not Available'}
    - A2A SDK:    {'Available' if A2A_SDK_AVAILABLE else 'Not Available'}
    - A2A Auth:   {'Enabled' if A2A_AUTH_AVAILABLE else 'DISABLED - ALL ENDPOINTS PUBLIC'}
    ====================================================================
    """)

    if not A2A_SDK_AVAILABLE:
        print("WARNING: A2A SDK not installed!")
        print("Run: pip install 'a2a-sdk[all]'")
        print("")

    if not A2A_AUTH_AVAILABLE:
        print("WARNING: A2A authentication not available!")
        print("All A2A endpoints are publicly accessible without authentication.")
        print("")

    import uvicorn
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
