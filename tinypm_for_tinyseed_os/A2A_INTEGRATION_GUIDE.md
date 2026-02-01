# Google A2A Protocol Integration Guide for TinyPM
## Complete Technical Specification for State-of-the-Art Multi-Agent Communication

**Version:** 1.0.0
**Date:** 2026-01-30
**Protocol Version:** A2A v0.3 (Latest as of January 2026)
**Status:** Production Implementation Guide

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [A2A Protocol Fundamentals](#2-a2a-protocol-fundamentals)
3. [Agent Cards - The Discovery Mechanism](#3-agent-cards---the-discovery-mechanism)
4. [Technical Implementation](#4-technical-implementation)
5. [TinyPM Integration Architecture](#5-tinypm-integration-architecture)
6. [Security Model](#6-security-model)
7. [Code Examples](#7-code-examples)
8. [Implementation Checklist](#8-implementation-checklist)
9. [Testing Strategy](#9-testing-strategy)
10. [References](#10-references)

---

## 1. Executive Summary

### What is A2A?

The **Agent2Agent (A2A) Protocol** is an open communication standard developed by Google and now governed by the Linux Foundation. It enables AI agents built on different frameworks to:

- **Discover** each other's capabilities
- **Negotiate** interaction modalities (text, forms, media)
- **Collaborate** securely on long-running tasks
- **Operate** without exposing internal state, memory, or tools

### Why A2A for TinyPM?

TinyPM already has a sophisticated multi-agent architecture:
- **PM Orchestrator** - Coordination hub
- **Builder Claude** - Development agent
- **Predictive Intent Engine** - Anticipatory intelligence
- **Wizard Council** - Multi-agent decision making
- **Wild Claims Czar** - Verification agent

Adding A2A compatibility transforms TinyPM from a closed system into an **interoperable platform** that can:
1. Accept tasks from external agents (other PM systems, enterprise tools)
2. Delegate specialized work to external A2A agents
3. Participate in multi-vendor agent ecosystems
4. Integrate with Salesforce, ServiceNow, Workday agents

### Key Protocol Facts

| Aspect | Detail |
|--------|--------|
| **Transport** | HTTP/HTTPS, gRPC |
| **Message Format** | JSON-RPC 2.0 |
| **Streaming** | Server-Sent Events (SSE) |
| **Discovery** | Agent Cards at `/.well-known/agent.json` |
| **Auth Support** | OAuth 2.0, API Key, mTLS, OpenID Connect |
| **Task States** | working, completed, failed, canceled, rejected, input_required, auth_required |
| **Governance** | Linux Foundation (donated by Google) |
| **Partners** | 150+ organizations including Salesforce, SAP, Microsoft, LangChain |

---

## 2. A2A Protocol Fundamentals

### Core Design Principles

1. **HTTP + JSON-RPC Foundation** - Built on existing standards for easy integration
2. **Async First** - Designed for long-running and human-in-the-loop tasks
3. **Modality Agnostic** - Supports text, files, structured data
4. **Opaque Execution** - Agents collaborate without exposing internals
5. **Enterprise Ready** - Full security and authorization scoping

### Protocol Operations

A2A defines **11 primary operations**:

#### Message Operations
| Operation | Description |
|-----------|-------------|
| `a2a.SendMessage` | Initiate agent interaction, returns Task or Message |
| `a2a.SendStreamingMessage` | Message with real-time progress via SSE |

#### Task Operations
| Operation | Description |
|-----------|-------------|
| `a2a.GetTask` | Retrieve task state and artifacts |
| `a2a.ListTasks` | Discover tasks with filtering and pagination |
| `a2a.CancelTask` | Request task cancellation |
| `a2a.SubscribeToTask` | Establish streaming updates for existing task |

#### Push Notification Operations
| Operation | Description |
|-----------|-------------|
| `a2a.CreatePushNotificationConfig` | Register webhook for async updates |
| `a2a.GetPushNotificationConfig` | Retrieve webhook configuration |
| `a2a.ListPushNotificationConfigs` | List all webhook configurations |
| `a2a.DeletePushNotificationConfig` | Remove webhook registration |

#### Discovery Operations
| Operation | Description |
|-----------|-------------|
| `a2a.GetExtendedAgentCard` | Retrieve authenticated agent metadata |

### Task Lifecycle States

```
                    +------------+
                    |   START    |
                    +-----+------+
                          |
                    +-----v------+
               +--->|  working   |<---+
               |    +-----+------+    |
               |          |           |
               |    +-----v------+    |
               |    |input_required+--+
               |    +-----+------+
               |          |
        +------+----+ +---v--------+ +------------+
        | canceled  | | completed  | |  failed    |
        +-----------+ +------------+ +------------+

                    +------------+
                    |  rejected  |  (task not accepted)
                    +------------+

                    +------------+
                    |auth_required| (needs credentials)
                    +------------+
```

### Data Model

#### Task Object
```json
{
  "id": "task_abc123",
  "contextId": "ctx_xyz789",
  "status": {
    "state": "working",
    "timestamp": "2026-01-30T10:30:00Z"
  },
  "artifacts": [],
  "history": []
}
```

#### Message Object
```json
{
  "role": "user",
  "parts": [
    {
      "kind": "text",
      "text": "Create a task for implementing OAuth"
    }
  ],
  "timestamp": "2026-01-30T10:30:00Z"
}
```

#### Part Types
- **TextPart** - Plain text content
- **FilePart** - File reference with URI and media type
- **DataPart** - Structured JSON data

---

## 3. Agent Cards - The Discovery Mechanism

### What is an Agent Card?

An Agent Card is a **JSON metadata document** published by an A2A Server describing:
- Identity and capabilities
- Service endpoint URL
- Authentication requirements
- Available skills
- Supported input/output modes

### Standard Location

```
https://{agent-server-domain}/.well-known/agent.json
```

### Agent Card Schema

```json
{
  "name": "TinyPM Orchestrator",
  "description": "Intelligent project management agent with predictive capabilities",
  "version": "1.0.0",
  "url": "https://tinypm.example.com/a2a",
  "provider": {
    "organization": "Tiny Seed Farm",
    "url": "https://tinyseedfarm.com"
  },
  "documentationUrl": "https://docs.tinypm.example.com/a2a",
  "capabilities": {
    "streaming": true,
    "pushNotifications": true,
    "stateTransitionHistory": true,
    "extendedAgentCard": true
  },
  "securitySchemes": {
    "oauth2": {
      "type": "oauth2",
      "flows": {
        "authorizationCode": {
          "authorizationUrl": "https://auth.tinypm.example.com/authorize",
          "tokenUrl": "https://auth.tinypm.example.com/token",
          "scopes": {
            "tasks:read": "Read task information",
            "tasks:write": "Create and modify tasks",
            "agents:delegate": "Delegate to internal agents"
          }
        }
      }
    },
    "apiKey": {
      "type": "apiKey",
      "in": "header",
      "name": "X-TinyPM-API-Key"
    }
  },
  "security": ["oauth2", "apiKey"],
  "defaultInputModes": ["text/plain", "application/json"],
  "defaultOutputModes": ["text/plain", "application/json"],
  "skills": [
    {
      "id": "task_management",
      "name": "Task Management",
      "description": "Create, update, track, and complete project tasks",
      "tags": ["tasks", "projects", "planning"],
      "examples": [
        "Create a new task for implementing user authentication",
        "What tasks are currently in progress?",
        "Mark task #123 as complete"
      ],
      "inputModes": ["text/plain"],
      "outputModes": ["text/plain", "application/json"]
    },
    {
      "id": "predictive_intent",
      "name": "Predictive Intelligence",
      "description": "Predict user needs and suggest proactive actions",
      "tags": ["prediction", "proactive", "intelligence"],
      "examples": [
        "What should I focus on next?",
        "Analyze my work patterns"
      ]
    },
    {
      "id": "agent_delegation",
      "name": "Agent Delegation",
      "description": "Delegate development tasks to Builder agent",
      "tags": ["delegation", "development", "builder"],
      "examples": [
        "Build a new API endpoint for user management",
        "Fix the bug in the login flow"
      ]
    },
    {
      "id": "wizard_council",
      "name": "Wizard Council Decision",
      "description": "Multi-agent collaborative decision making for complex choices",
      "tags": ["decision", "council", "collaboration"],
      "examples": [
        "Should we use PostgreSQL or MongoDB for this project?",
        "Evaluate the architecture options for our new service"
      ]
    }
  ],
  "extensions": {
    "tinypm.predictive": {
      "version": "2026.1",
      "features": ["pattern_mining", "context_fusion", "proactive_suggestions"]
    }
  }
}
```

### Extended Agent Cards

For authenticated clients, return additional capabilities:

```json
{
  "...(base card)...": "...",
  "skills": [
    "...(public skills)...",
    {
      "id": "internal_metrics",
      "name": "Internal Metrics Access",
      "description": "Access detailed system metrics and analytics",
      "tags": ["metrics", "internal", "admin"],
      "requiresAuth": true
    }
  ],
  "extensions": {
    "tinypm.admin": {
      "configEndpoint": "/a2a/admin/config",
      "metricsEndpoint": "/a2a/admin/metrics"
    }
  }
}
```

---

## 4. Technical Implementation

### Required Dependencies

```bash
# Official A2A Python SDK
pip install a2a-sdk

# With all extras (recommended)
pip install "a2a-sdk[all]"

# Alternative: Pydantic's FastA2A
pip install fasta2a

# For LangGraph integration
pip install langgraph langchain-core
```

### Core SDK Components

#### AgentExecutor (Abstract Base Class)

Every A2A agent must implement an `AgentExecutor`:

```python
from a2a.server.agent_execution import AgentExecutor
from a2a.server.request_context import RequestContext
from a2a.server.events import EventQueue

class TinyPMAgentExecutor(AgentExecutor):
    """
    TinyPM's implementation of the A2A AgentExecutor.

    This is the core logic for processing A2A requests.
    """

    async def execute(
        self,
        context: RequestContext,
        event_queue: EventQueue
    ) -> None:
        """
        Handle incoming A2A requests.

        Args:
            context: Contains the request message, task info, context
            event_queue: Queue for sending events back to client
        """
        # Extract user message
        message = context.get_user_message()
        task_id = context.task_id

        # Route to appropriate TinyPM handler
        response = await self._process_request(message, task_id)

        # Send response via event queue
        await event_queue.enqueue_event(
            TaskStatusUpdateEvent(
                task_id=task_id,
                status=TaskStatus(state="completed"),
                final=True
            )
        )
        await event_queue.enqueue_event(
            TaskArtifactUpdateEvent(
                task_id=task_id,
                artifact=Artifact(parts=[TextPart(text=response)])
            )
        )

    async def cancel(
        self,
        context: RequestContext,
        event_queue: EventQueue
    ) -> None:
        """Handle task cancellation requests."""
        task_id = context.task_id
        # Clean up any running operations
        await self._cancel_task(task_id)
        await event_queue.enqueue_event(
            TaskStatusUpdateEvent(
                task_id=task_id,
                status=TaskStatus(state="canceled"),
                final=True
            )
        )
```

#### Server Setup

```python
from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCard, AgentCapabilities, AgentSkill

# Define Agent Card
agent_card = AgentCard(
    name="TinyPM Orchestrator",
    description="Intelligent PM agent with predictive capabilities",
    url="http://localhost:9000/",
    version="1.0.0",
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
            description="Create and manage project tasks",
            tags=["tasks", "projects"]
        ),
        AgentSkill(
            id="predictive_intent",
            name="Predictive Intelligence",
            description="Predict user needs proactively",
            tags=["prediction", "ai"]
        )
    ]
)

# Create executor
executor = TinyPMAgentExecutor()

# Create request handler
handler = DefaultRequestHandler(
    agent_executor=executor,
    task_store=InMemoryTaskStore()  # Use PostgreSQL in production
)

# Create A2A application
app = A2AStarletteApplication(
    agent_card=agent_card,
    http_handler=handler
)

# Run with uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)
```

### Client Implementation

```python
from a2a.client import A2AClient

class TinyPMExternalClient:
    """Client for calling external A2A agents from TinyPM."""

    def __init__(self, agent_url: str):
        self.client = A2AClient(agent_url)
        self.agent_card = None

    async def discover(self) -> AgentCard:
        """Fetch and cache the agent's capabilities."""
        self.agent_card = await self.client.get_agent_card()
        return self.agent_card

    async def send_message(
        self,
        message: str,
        context_id: str = None,
        task_id: str = None
    ):
        """Send a message to the external agent."""
        response = await self.client.send_message(
            message=message,
            context_id=context_id,
            task_id=task_id
        )
        return response

    async def send_streaming_message(
        self,
        message: str,
        on_event: callable
    ):
        """Send message with streaming response."""
        async for event in self.client.send_streaming_message(message):
            await on_event(event)

    async def get_task(self, task_id: str):
        """Get task status and artifacts."""
        return await self.client.get_task(task_id)

    async def cancel_task(self, task_id: str):
        """Request task cancellation."""
        return await self.client.cancel_task(task_id)
```

---

## 5. TinyPM Integration Architecture

### High-Level Architecture

```
                                    EXTERNAL A2A ECOSYSTEM
                           +----------------------------------------+
                           |  Salesforce   ServiceNow    Workday    |
                           |     Agent        Agent        Agent    |
                           +-------+-------------+------------+-----+
                                   |             |            |
                                   v             v            v
+------------------------------------------------------------------------------+
|                              A2A GATEWAY LAYER                               |
|  +------------------------------------------------------------------------+  |
|  |  Agent Card Endpoint        JSON-RPC Handler        SSE Streamer      |  |
|  |  /.well-known/agent.json    /a2a/rpc               /a2a/stream        |  |
|  +------------------------------------------------------------------------+  |
+------------------------------------------------------------------------------+
                                        |
                                        v
+------------------------------------------------------------------------------+
|                              TINYPM A2A ROUTER                               |
|  +------------------------------------------------------------------------+  |
|  |  Auth Validator    Skill Router    Rate Limiter    Metrics Collector  |  |
|  +------------------------------------------------------------------------+  |
+------------------------------------------------------------------------------+
                                        |
              +-------------------------+-------------------------+
              |                         |                         |
              v                         v                         v
+--------------------+    +--------------------+    +--------------------+
|  PM Orchestrator   |    | Predictive Intent  |    |   Wizard Council   |
|  Agent Executor    |    |   Agent Executor   |    |   Agent Executor   |
+--------------------+    +--------------------+    +--------------------+
              |                         |                         |
              v                         v                         v
+------------------------------------------------------------------------------+
|                           EXISTING TINYPM CORE                               |
|  +------------------------------------------------------------------------+  |
|  |  LangGraph Wrapper    Memory System    Calendar/Email    Task Board   |  |
|  +------------------------------------------------------------------------+  |
+------------------------------------------------------------------------------+
```

### Component Integration

#### 1. A2A Gateway Layer

New file: `tinypm/a2a_gateway.py`

Responsibilities:
- Serve Agent Card at well-known URL
- Handle JSON-RPC message routing
- Manage SSE streaming connections
- Validate incoming requests

#### 2. TinyPM A2A Router

New file: `tinypm/a2a_router.py`

Responsibilities:
- Authenticate A2A requests (OAuth/API Key)
- Route to appropriate skill executor
- Enforce rate limits
- Collect metrics for monitoring

#### 3. Agent Executors

Enhanced existing files:

| File | New Responsibility |
|------|-------------------|
| `pm_orchestrator.py` | Expose orchestration via A2A executor |
| `predictive_intent.py` | Expose predictions via A2A executor |
| `langgraph_wrapper.py` | A2A-compatible graph execution |
| `wild_claims_czar.py` | A2A interface for fact verification |

### Database Schema Changes

Add to `supabase_schema.sql`:

```sql
-- A2A Task Tracking
CREATE TABLE a2a_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_task_id TEXT UNIQUE NOT NULL,
    context_id TEXT,
    client_agent_url TEXT,
    skill_id TEXT NOT NULL,
    status TEXT DEFAULT 'working',
    input_message JSONB,
    artifacts JSONB DEFAULT '[]',
    history JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT
);

-- A2A Push Notification Configs
CREATE TABLE a2a_push_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT NOT NULL,
    webhook_url TEXT NOT NULL,
    auth_token TEXT,
    events TEXT[] DEFAULT ARRAY['status_update', 'artifact', 'completion'],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    FOREIGN KEY (task_id) REFERENCES a2a_tasks(external_task_id)
);

-- A2A Client Registry (known external agents)
CREATE TABLE a2a_known_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_url TEXT UNIQUE NOT NULL,
    agent_name TEXT,
    agent_card JSONB,
    trust_level TEXT DEFAULT 'untrusted',  -- untrusted, verified, trusted
    last_contacted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- A2A Request Logs (for debugging and metrics)
CREATE TABLE a2a_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT,
    method TEXT NOT NULL,
    request_body JSONB,
    response_body JSONB,
    status_code INT,
    duration_ms INT,
    client_ip TEXT,
    client_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_a2a_tasks_status ON a2a_tasks(status);
CREATE INDEX idx_a2a_tasks_context ON a2a_tasks(context_id);
CREATE INDEX idx_a2a_push_task ON a2a_push_configs(task_id);
CREATE INDEX idx_a2a_logs_task ON a2a_request_logs(task_id);
CREATE INDEX idx_a2a_logs_created ON a2a_request_logs(created_at);
```

---

## 6. Security Model

### Authentication Methods

TinyPM A2A will support multiple auth schemes:

#### 1. OAuth 2.0 (Recommended for external agents)

```python
# Security scheme in Agent Card
"securitySchemes": {
    "oauth2": {
        "type": "oauth2",
        "flows": {
            "clientCredentials": {
                "tokenUrl": "https://tinypm.example.com/oauth/token",
                "scopes": {
                    "a2a:read": "Read task status",
                    "a2a:write": "Create and modify tasks",
                    "a2a:admin": "Administrative operations"
                }
            }
        }
    }
}
```

#### 2. API Key (For trusted internal services)

```python
"securitySchemes": {
    "apiKey": {
        "type": "apiKey",
        "in": "header",
        "name": "X-TinyPM-API-Key"
    }
}
```

#### 3. mTLS (For enterprise deployments)

```python
"securitySchemes": {
    "mtls": {
        "type": "mutualTLS"
    }
}
```

### Trust Levels

| Level | Description | Capabilities |
|-------|-------------|--------------|
| `untrusted` | Unknown external agent | Read-only, rate limited |
| `verified` | Verified but not trusted | Standard operations |
| `trusted` | Known partner agent | Full access, delegation |

### Security Best Practices

1. **Never embed secrets in Agent Cards** - Use out-of-band credential exchange
2. **Sign Agent Cards with JWS** - Verify authenticity
3. **Use short-lived tokens** - OAuth tokens expire in minutes
4. **Treat all external input as untrusted** - Sanitize before passing to LLMs
5. **Rate limit by client** - Prevent abuse
6. **Log all A2A interactions** - Audit trail

### Input Sanitization

```python
async def sanitize_a2a_input(message: str, context: dict) -> str:
    """
    Sanitize input from external A2A agents before processing.

    CRITICAL: Prevents prompt injection attacks.
    """
    # Remove any instruction-like patterns
    sanitized = re.sub(
        r'(ignore previous instructions|system:|<\|.*?\|>)',
        '[FILTERED]',
        message,
        flags=re.IGNORECASE
    )

    # Limit length
    sanitized = sanitized[:10000]

    # Log suspicious patterns
    if sanitized != message:
        log(f"A2A input sanitized: {len(message)} -> {len(sanitized)} chars", "WARN")

    return sanitized
```

---

## 7. Code Examples

### Complete A2A Server Implementation

```python
#!/usr/bin/env python3
"""
tinypm/a2a_server.py - TinyPM A2A Protocol Server

This module exposes TinyPM's capabilities via the A2A protocol,
allowing external agents to interact with our system.
"""

import asyncio
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# A2A SDK imports
from a2a.server.apps import A2AStarletteApplication
from a2a.server.agent_execution import AgentExecutor
from a2a.server.request_context import RequestContext
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

# TinyPM imports
from pm_orchestrator import PMOrchestrator, ProjectContext
from predictive_intent import PredictiveIntentEngine, FusedContext
from langgraph_wrapper import TinyPMGraph

# Configuration
APP_DIR = Path(__file__).parent
A2A_PORT = int(os.environ.get("A2A_PORT", "9000"))
A2A_HOST = os.environ.get("A2A_HOST", "0.0.0.0")


class TinyPMAgentExecutor(AgentExecutor):
    """
    Main A2A executor for TinyPM.

    Routes incoming A2A requests to the appropriate TinyPM subsystem.
    """

    def __init__(self):
        self.orchestrator = None
        self.predictive_engine = None
        self.langgraph = None
        self._initialize()

    def _initialize(self):
        """Initialize TinyPM subsystems."""
        try:
            self.orchestrator = PMOrchestrator()
            print("[A2A] PM Orchestrator initialized")
        except Exception as e:
            print(f"[A2A] PM Orchestrator unavailable: {e}")

        try:
            self.predictive_engine = PredictiveIntentEngine()
            print("[A2A] Predictive Intent Engine initialized")
        except Exception as e:
            print(f"[A2A] Predictive Intent Engine unavailable: {e}")

        try:
            self.langgraph = TinyPMGraph()
            print("[A2A] LangGraph initialized")
        except Exception as e:
            print(f"[A2A] LangGraph unavailable: {e}")

    async def execute(
        self,
        context: RequestContext,
        event_queue: EventQueue
    ) -> None:
        """
        Handle incoming A2A requests.

        Routes to appropriate handler based on detected intent or explicit skill.
        """
        task_id = context.task_id

        try:
            # Send working status
            await event_queue.enqueue_event(
                TaskStatusUpdateEvent(
                    task_id=task_id,
                    status=TaskStatus(state="working"),
                    final=False
                )
            )

            # Extract message
            message = self._extract_message(context)
            skill_hint = context.metadata.get("skill") if context.metadata else None

            # Route to handler
            if skill_hint == "predictive_intent":
                response = await self._handle_predictive(message, event_queue, task_id)
            elif skill_hint == "task_management":
                response = await self._handle_task_management(message, event_queue, task_id)
            else:
                # Auto-route based on content
                response = await self._handle_auto_route(message, event_queue, task_id)

            # Send completion
            await event_queue.enqueue_event(
                TaskArtifactUpdateEvent(
                    task_id=task_id,
                    artifact=Artifact(parts=[TextPart(text=response["text"])])
                )
            )

            # Include structured data if available
            if "data" in response:
                await event_queue.enqueue_event(
                    TaskArtifactUpdateEvent(
                        task_id=task_id,
                        artifact=Artifact(parts=[DataPart(data=response["data"])])
                    )
                )

            await event_queue.enqueue_event(
                TaskStatusUpdateEvent(
                    task_id=task_id,
                    status=TaskStatus(state="completed"),
                    final=True
                )
            )

        except Exception as e:
            await event_queue.enqueue_event(
                TaskStatusUpdateEvent(
                    task_id=task_id,
                    status=TaskStatus(
                        state="failed",
                        message=str(e)
                    ),
                    final=True
                )
            )

    async def cancel(
        self,
        context: RequestContext,
        event_queue: EventQueue
    ) -> None:
        """Handle task cancellation."""
        task_id = context.task_id
        # TODO: Implement actual cancellation logic
        await event_queue.enqueue_event(
            TaskStatusUpdateEvent(
                task_id=task_id,
                status=TaskStatus(state="canceled"),
                final=True
            )
        )

    def _extract_message(self, context: RequestContext) -> str:
        """Extract text message from context."""
        if context.message:
            for part in context.message.parts:
                if hasattr(part, 'text'):
                    return part.text
        return ""

    async def _handle_predictive(
        self,
        message: str,
        event_queue: EventQueue,
        task_id: str
    ) -> Dict[str, Any]:
        """Handle predictive intelligence requests."""
        if not self.predictive_engine:
            return {"text": "Predictive engine not available"}

        # Get predictions
        context = FusedContext(
            hour=datetime.now().hour,
            minute=datetime.now().minute,
            day_of_week=datetime.now().weekday(),
            day_name=datetime.now().strftime("%A"),
            is_weekend=datetime.now().weekday() >= 5,
            is_morning=6 <= datetime.now().hour < 12,
            is_afternoon=12 <= datetime.now().hour < 18,
            is_evening=18 <= datetime.now().hour < 22
        )

        predictions = self.predictive_engine.predict_next_actions(context)
        suggestions = self.predictive_engine.generate_proactive_suggestions(predictions)

        return {
            "text": f"Generated {len(suggestions)} proactive suggestions based on current context.",
            "data": {
                "predictions": [p.to_dict() for p in predictions],
                "suggestions": [s.to_dict() for s in suggestions]
            }
        }

    async def _handle_task_management(
        self,
        message: str,
        event_queue: EventQueue,
        task_id: str
    ) -> Dict[str, Any]:
        """Handle task management requests."""
        if not self.langgraph:
            return {"text": "Task management not available"}

        # Process through LangGraph
        result = self.langgraph.process_message(message, task_id)

        return {
            "text": result.get("response", "Task processed"),
            "data": {
                "intent": result.get("intent"),
                "confidence": result.get("confidence"),
                "proactive_items": result.get("proactive_items", [])
            }
        }

    async def _handle_auto_route(
        self,
        message: str,
        event_queue: EventQueue,
        task_id: str
    ) -> Dict[str, Any]:
        """Auto-route based on message content."""
        message_lower = message.lower()

        # Simple keyword routing
        if any(kw in message_lower for kw in ["predict", "suggest", "what should", "next"]):
            return await self._handle_predictive(message, event_queue, task_id)
        else:
            return await self._handle_task_management(message, event_queue, task_id)


def create_agent_card() -> AgentCard:
    """Create the TinyPM Agent Card."""
    return AgentCard(
        name="TinyPM Orchestrator",
        description="Intelligent project management agent with predictive capabilities, "
                   "multi-agent coordination, and proactive intelligence.",
        url=f"http://{A2A_HOST}:{A2A_PORT}/",
        version="1.0.0",
        provider={
            "organization": "Tiny Seed Farm",
            "url": "https://tinyseedfarm.com"
        },
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
                description="Create, update, track, and complete project tasks. "
                           "Supports prioritization, assignment, and status tracking.",
                tags=["tasks", "projects", "planning", "tracking"],
                examples=[
                    "Create a task for implementing user authentication",
                    "What tasks are currently in progress?",
                    "Mark task #123 as complete",
                    "Assign the API refactor task to Builder"
                ]
            ),
            AgentSkill(
                id="predictive_intent",
                name="Predictive Intelligence",
                description="Predict user needs based on behavioral patterns, context, "
                           "and calendar/email state. Generates proactive suggestions.",
                tags=["prediction", "proactive", "intelligence", "patterns"],
                examples=[
                    "What should I focus on next?",
                    "Analyze my work patterns",
                    "When is the best time for deep work?"
                ]
            ),
            AgentSkill(
                id="agent_delegation",
                name="Agent Delegation",
                description="Delegate development tasks to the Builder agent. "
                           "Handles code generation, bug fixes, and feature implementation.",
                tags=["delegation", "development", "builder", "code"],
                examples=[
                    "Build a new API endpoint for user management",
                    "Fix the authentication bug in the login flow",
                    "Implement the new dashboard feature"
                ]
            ),
            AgentSkill(
                id="status_reporting",
                name="Status Reporting",
                description="Get comprehensive status reports on projects, tasks, "
                           "builder progress, and system health.",
                tags=["status", "reporting", "progress", "metrics"],
                examples=[
                    "Give me a project status update",
                    "How is the Builder progressing?",
                    "What's blocking our launch?"
                ]
            )
        ]
    )


def create_app() -> A2AStarletteApplication:
    """Create the A2A Starlette application."""
    agent_card = create_agent_card()
    executor = TinyPMAgentExecutor()

    handler = DefaultRequestHandler(
        agent_executor=executor,
        task_store=InMemoryTaskStore()  # TODO: Use PostgreSQL for production
    )

    app = A2AStarletteApplication(
        agent_card=agent_card,
        http_handler=handler
    )

    return app


# Create app instance for uvicorn
app = create_app()


if __name__ == "__main__":
    import uvicorn

    print(f"""
    ╔══════════════════════════════════════════════════════════════╗
    ║           TinyPM A2A Server - Starting                       ║
    ╠══════════════════════════════════════════════════════════════╣
    ║  Protocol: A2A v0.3                                          ║
    ║  Host: {A2A_HOST}                                               ║
    ║  Port: {A2A_PORT}                                                 ║
    ║  Agent Card: http://{A2A_HOST}:{A2A_PORT}/.well-known/agent.json     ║
    ╚══════════════════════════════════════════════════════════════╝
    """)

    uvicorn.run(app, host=A2A_HOST, port=A2A_PORT)
```

### A2A Client for External Agents

```python
#!/usr/bin/env python3
"""
tinypm/a2a_client.py - TinyPM A2A Client

Client for calling external A2A-compatible agents from TinyPM.
"""

import asyncio
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

# A2A SDK
from a2a.client import A2AClient
from a2a.types import AgentCard


@dataclass
class ExternalAgentResult:
    """Result from an external agent call."""
    success: bool
    text: str
    data: Optional[Dict] = None
    task_id: Optional[str] = None
    error: Optional[str] = None


class TinyPMExternalAgentClient:
    """
    Client for calling external A2A agents from TinyPM.

    Example usage:
        client = TinyPMExternalAgentClient("https://salesforce-agent.example.com")
        await client.discover()
        result = await client.send("Create a new lead for Acme Corp")
    """

    def __init__(self, agent_url: str, api_key: str = None, oauth_token: str = None):
        self.agent_url = agent_url
        self.api_key = api_key
        self.oauth_token = oauth_token
        self.client = None
        self.agent_card = None

    async def discover(self) -> AgentCard:
        """
        Discover the external agent's capabilities.

        Fetches and caches the Agent Card.
        """
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        elif self.oauth_token:
            headers["Authorization"] = f"Bearer {self.oauth_token}"

        self.client = A2AClient(self.agent_url, headers=headers)
        self.agent_card = await self.client.get_agent_card()

        print(f"[A2A Client] Discovered agent: {self.agent_card.name}")
        print(f"[A2A Client] Skills: {[s.name for s in self.agent_card.skills]}")

        return self.agent_card

    def has_skill(self, skill_id: str) -> bool:
        """Check if agent has a specific skill."""
        if not self.agent_card:
            return False
        return any(s.id == skill_id for s in self.agent_card.skills)

    async def send(
        self,
        message: str,
        skill: str = None,
        context_id: str = None,
        task_id: str = None,
        timeout: float = 30.0
    ) -> ExternalAgentResult:
        """
        Send a message to the external agent.

        Args:
            message: The message to send
            skill: Optional skill hint
            context_id: Optional conversation context ID
            task_id: Optional existing task ID for follow-up
            timeout: Request timeout in seconds

        Returns:
            ExternalAgentResult with response
        """
        if not self.client:
            await self.discover()

        try:
            metadata = {"skill": skill} if skill else None

            response = await asyncio.wait_for(
                self.client.send_message(
                    message=message,
                    context_id=context_id,
                    task_id=task_id,
                    metadata=metadata
                ),
                timeout=timeout
            )

            # Extract response content
            text = ""
            data = None

            if response.artifacts:
                for artifact in response.artifacts:
                    for part in artifact.parts:
                        if hasattr(part, 'text'):
                            text += part.text
                        if hasattr(part, 'data'):
                            data = part.data

            return ExternalAgentResult(
                success=response.status.state == "completed",
                text=text,
                data=data,
                task_id=response.id
            )

        except asyncio.TimeoutError:
            return ExternalAgentResult(
                success=False,
                text="",
                error=f"Request timed out after {timeout}s"
            )
        except Exception as e:
            return ExternalAgentResult(
                success=False,
                text="",
                error=str(e)
            )

    async def send_streaming(
        self,
        message: str,
        on_update: callable,
        skill: str = None
    ):
        """
        Send a message with streaming response.

        Args:
            message: The message to send
            on_update: Callback for each streaming update
            skill: Optional skill hint
        """
        if not self.client:
            await self.discover()

        metadata = {"skill": skill} if skill else None

        async for event in self.client.send_streaming_message(
            message=message,
            metadata=metadata
        ):
            await on_update(event)


# Registry of known A2A agents
class A2AAgentRegistry:
    """Registry of known and trusted A2A agents."""

    def __init__(self):
        self.agents: Dict[str, Dict[str, Any]] = {}

    def register(
        self,
        name: str,
        url: str,
        api_key: str = None,
        trust_level: str = "untrusted"
    ):
        """Register a known agent."""
        self.agents[name] = {
            "url": url,
            "api_key": api_key,
            "trust_level": trust_level,
            "client": None
        }

    async def get_client(self, name: str) -> TinyPMExternalAgentClient:
        """Get or create client for a registered agent."""
        if name not in self.agents:
            raise ValueError(f"Agent '{name}' not registered")

        agent = self.agents[name]
        if not agent["client"]:
            agent["client"] = TinyPMExternalAgentClient(
                agent_url=agent["url"],
                api_key=agent["api_key"]
            )
            await agent["client"].discover()

        return agent["client"]

    def list_agents(self) -> List[str]:
        """List all registered agents."""
        return list(self.agents.keys())


# Global registry instance
_registry = A2AAgentRegistry()

def get_agent_registry() -> A2AAgentRegistry:
    """Get the global agent registry."""
    return _registry
```

### Integration with PM Orchestrator

Add to `pm_orchestrator.py`:

```python
# In PMOrchestrator class

async def delegate_to_a2a_agent(
    self,
    agent_name: str,
    message: str,
    skill: str = None
) -> Dict[str, Any]:
    """
    Delegate a task to an external A2A agent.

    Args:
        agent_name: Name of registered agent
        message: Task description
        skill: Optional skill to target

    Returns:
        Result from external agent
    """
    from a2a_client import get_agent_registry

    registry = get_agent_registry()

    try:
        client = await registry.get_client(agent_name)
        result = await client.send(message, skill=skill)

        log(f"A2A delegation to {agent_name}: {'success' if result.success else 'failed'}")

        return {
            "success": result.success,
            "response": result.text,
            "data": result.data,
            "task_id": result.task_id,
            "error": result.error
        }

    except Exception as e:
        log(f"A2A delegation error: {e}", "ERROR")
        return {
            "success": False,
            "error": str(e)
        }
```

---

## 8. Implementation Checklist

### Phase 1: Foundation (Week 1)

- [ ] Install A2A SDK: `pip install "a2a-sdk[all]"`
- [ ] Create `tinypm/a2a_server.py` with basic executor
- [ ] Create Agent Card for TinyPM
- [ ] Add `/.well-known/agent.json` endpoint
- [ ] Test with a2a-inspector tool
- [ ] Add A2A database tables to Supabase

### Phase 2: Core Integration (Week 2)

- [ ] Create `TinyPMAgentExecutor` class
- [ ] Integrate PM Orchestrator with A2A
- [ ] Integrate Predictive Intent Engine with A2A
- [ ] Add streaming support (SSE)
- [ ] Implement task state tracking

### Phase 3: Security (Week 3)

- [ ] Implement API Key authentication
- [ ] Add OAuth 2.0 support (optional)
- [ ] Create input sanitization layer
- [ ] Add rate limiting
- [ ] Implement request logging

### Phase 4: Client Capabilities (Week 4)

- [ ] Create `tinypm/a2a_client.py`
- [ ] Implement A2A agent registry
- [ ] Add delegation capabilities to orchestrator
- [ ] Test external agent communication
- [ ] Document known agent configurations

### Phase 5: Advanced Features (Week 5)

- [ ] Implement push notifications
- [ ] Add multi-turn conversation support
- [ ] Implement extended Agent Card
- [ ] Add metrics collection
- [ ] Create A2A health dashboard

### Phase 6: Production Hardening (Week 6)

- [ ] Switch from InMemoryTaskStore to PostgreSQL
- [ ] Add comprehensive error handling
- [ ] Implement circuit breaker for external agents
- [ ] Add retry logic with exponential backoff
- [ ] Performance testing and optimization
- [ ] Documentation completion

---

## 9. Testing Strategy

### Unit Tests

```python
# test_a2a_server.py
import pytest
from a2a_server import TinyPMAgentExecutor, create_agent_card

@pytest.mark.asyncio
async def test_executor_task_management():
    executor = TinyPMAgentExecutor()
    # Mock context and event queue
    context = MockRequestContext(message="Create a task for testing")
    event_queue = MockEventQueue()

    await executor.execute(context, event_queue)

    assert event_queue.has_event("TaskStatusUpdateEvent")
    assert event_queue.last_status == "completed"

def test_agent_card_valid():
    card = create_agent_card()

    assert card.name == "TinyPM Orchestrator"
    assert len(card.skills) >= 3
    assert card.capabilities.streaming == True
```

### Integration Tests

```python
# test_a2a_integration.py
import pytest
import httpx

A2A_URL = "http://localhost:9000"

@pytest.mark.asyncio
async def test_agent_card_endpoint():
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{A2A_URL}/.well-known/agent.json")
        assert response.status_code == 200

        card = response.json()
        assert "name" in card
        assert "skills" in card

@pytest.mark.asyncio
async def test_send_message():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{A2A_URL}/rpc",
            json={
                "jsonrpc": "2.0",
                "method": "a2a.SendMessage",
                "params": {
                    "message": {
                        "role": "user",
                        "parts": [{"kind": "text", "text": "What tasks are pending?"}]
                    }
                },
                "id": 1
            }
        )
        assert response.status_code == 200
        result = response.json()
        assert "result" in result or "error" in result
```

### Validation with a2a-inspector

```bash
# Install inspector
pip install a2a-inspector

# Validate agent
a2a-inspector validate http://localhost:9000

# Interactive testing
a2a-inspector test http://localhost:9000
```

---

## 10. References

### Official Resources

- [A2A Protocol Specification](https://a2a-protocol.org/latest/specification/)
- [A2A Python SDK](https://github.com/a2aproject/a2a-python)
- [A2A Samples Repository](https://github.com/a2aproject/a2a-samples)
- [Google Developers Blog - A2A Announcement](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)

### SDK Documentation

- [A2A Python SDK API Reference](https://a2a-protocol.org/latest/sdk/python/api/)
- [FastA2A by Pydantic](https://ai.pydantic.dev/a2a/)
- [Google ADK A2A Integration](https://google.github.io/adk-docs/a2a/quickstart-exposing/)

### Integration Guides

- [LangGraph + A2A Tutorial](https://a2aprotocol.ai/blog/a2a-langraph-tutorial-20250513)
- [LangChain Agent Server A2A](https://docs.langchain.com/langsmith/server-a2a)
- [Microsoft Azure A2A Support](https://www.microsoft.com/en-us/microsoft-cloud/blog/2025/05/07/empowering-multi-agent-apps-with-the-open-agent2agent-a2a-protocol/)

### Production Guidance

- [InfoWorld: Preparing for MCP and A2A in Production](https://www.infoworld.com/article/4046484/beyond-ai-protocols-preparing-for-mcp-and-a2a-in-production.html)
- [IBM: What Is Agent2Agent Protocol?](https://www.ibm.com/think/topics/agent2agent-protocol)

---

## Appendix A: Complexity Estimates

| Component | Complexity | Effort | Dependencies |
|-----------|------------|--------|--------------|
| Agent Card Definition | Low | 2 hours | None |
| Basic A2A Server | Medium | 1 day | a2a-sdk |
| PM Orchestrator Integration | Medium | 2 days | pm_orchestrator.py |
| Predictive Intent A2A | Medium | 1 day | predictive_intent.py |
| Authentication Layer | High | 2-3 days | OAuth library |
| A2A Client | Medium | 1 day | a2a-sdk |
| Database Schema | Low | 2 hours | Supabase |
| Push Notifications | High | 2 days | Webhook infrastructure |
| Rate Limiting | Medium | 1 day | Redis (optional) |
| Full Test Suite | Medium | 2 days | pytest |
| **Total Estimate** | | **2-3 weeks** | |

---

**Document End**

*This guide provides everything needed to make TinyPM A2A-compatible and achieve true state-of-the-art multi-agent interoperability.*
