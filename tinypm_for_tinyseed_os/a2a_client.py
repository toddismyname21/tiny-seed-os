#!/usr/bin/env python3
"""
===============================================================================
TinyPM A2A CLIENT - Agent-to-Agent Protocol Client Implementation
===============================================================================

Client for calling external A2A-compatible agents from TinyPM.

This enables TinyPM to:
1. Discover external agents and their capabilities
2. Delegate specialized tasks to external systems
3. Integrate with enterprise tools (Salesforce, ServiceNow, etc.)
4. Participate in multi-vendor agent ecosystems

Usage:
    from a2a_client import TinyPMExternalAgentClient, get_agent_registry

    # Direct client usage
    client = TinyPMExternalAgentClient("https://external-agent.example.com")
    await client.discover()
    result = await client.send("Process this customer request")

    # Registry-based usage
    registry = get_agent_registry()
    registry.register("salesforce", "https://salesforce-agent.example.com", api_key="...")
    client = await registry.get_client("salesforce")
    result = await client.send("Create a new lead")

Created: 2026-01-30
Author: TinyPM Team
"""

import asyncio
import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional
import hashlib

# Configuration
APP_DIR = Path(__file__).parent
REGISTRY_FILE = APP_DIR / ".a2a_agent_registry.json"

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

A2A_CLIENT_LOG = APP_DIR / ".a2a_client.log"

def log(msg: str, level: str = "INFO"):
    """Log with timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [A2A-Client] [{level}] {msg}"
    print(line)
    try:
        with open(A2A_CLIENT_LOG, "a") as f:
            f.write(line + "\n")
    except:
        pass


# ===============================================================================
# DEPENDENCY CHECK
# ===============================================================================

A2A_SDK_AVAILABLE = False

try:
    from a2a.client import A2AClient
    from a2a.types import AgentCard, Message, Part, TextPart
    A2A_SDK_AVAILABLE = True
    log("A2A SDK client loaded successfully")
except ImportError as e:
    log(f"A2A SDK not installed: {e}", "WARN")
    log("Run: pip install 'a2a-sdk[all]'", "WARN")


# ===============================================================================
# DATA CLASSES
# ===============================================================================

@dataclass
class ExternalAgentResult:
    """Result from an external A2A agent call."""
    success: bool
    text: str
    data: Optional[Dict] = None
    task_id: Optional[str] = None
    context_id: Optional[str] = None
    status: str = "unknown"
    duration_ms: int = 0
    error: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            "success": self.success,
            "text": self.text,
            "data": self.data,
            "task_id": self.task_id,
            "context_id": self.context_id,
            "status": self.status,
            "duration_ms": self.duration_ms,
            "error": self.error
        }


@dataclass
class AgentCapabilityInfo:
    """Cached information about an external agent's capabilities."""
    name: str
    description: str
    skills: List[Dict]
    capabilities: Dict
    last_updated: datetime = field(default_factory=datetime.now)


# ===============================================================================
# A2A CLIENT
# ===============================================================================

class TinyPMExternalAgentClient:
    """
    Client for calling external A2A-compatible agents.

    Provides:
    - Agent discovery via Agent Cards
    - Synchronous message sending
    - Streaming message support
    - Task tracking and management
    - Automatic retry with backoff
    """

    DEFAULT_TIMEOUT = 30.0
    MAX_RETRIES = 3
    RETRY_BACKOFF_BASE = 1.0

    def __init__(
        self,
        agent_url: str,
        api_key: str = None,
        oauth_token: str = None,
        timeout: float = None
    ):
        """
        Initialize A2A client.

        Args:
            agent_url: Base URL of the external A2A agent
            api_key: Optional API key for authentication
            oauth_token: Optional OAuth token for authentication
            timeout: Request timeout in seconds (default 30)
        """
        self.agent_url = agent_url.rstrip("/")
        self.api_key = api_key
        self.oauth_token = oauth_token
        self.timeout = timeout or self.DEFAULT_TIMEOUT

        self._client = None
        self._agent_card = None
        self._capability_info = None

    @property
    def is_discovered(self) -> bool:
        """Check if agent has been discovered."""
        return self._agent_card is not None

    @property
    def agent_name(self) -> str:
        """Get agent name (after discovery)."""
        if self._agent_card:
            return self._agent_card.name
        return "Unknown"

    async def discover(self) -> AgentCapabilityInfo:
        """
        Discover the external agent's capabilities.

        Fetches and caches the Agent Card from /.well-known/agent.json

        Returns:
            AgentCapabilityInfo with parsed capabilities

        Raises:
            ConnectionError: If agent is unreachable
            ValueError: If Agent Card is invalid
        """
        if not A2A_SDK_AVAILABLE:
            raise ImportError("A2A SDK not installed. Run: pip install 'a2a-sdk[all]'")

        log(f"Discovering agent at {self.agent_url}...")

        try:
            # Build headers for authentication
            headers = self._build_auth_headers()

            # Create A2A client
            self._client = A2AClient(self.agent_url, headers=headers)

            # Fetch agent card
            self._agent_card = await self._client.get_agent_card()

            # Parse capabilities
            self._capability_info = AgentCapabilityInfo(
                name=self._agent_card.name,
                description=self._agent_card.description or "",
                skills=[
                    {
                        "id": s.id,
                        "name": s.name,
                        "description": s.description,
                        "tags": s.tags or []
                    }
                    for s in (self._agent_card.skills or [])
                ],
                capabilities={
                    "streaming": getattr(self._agent_card.capabilities, 'streaming', False),
                    "pushNotifications": getattr(self._agent_card.capabilities, 'pushNotifications', False),
                    "stateTransitionHistory": getattr(self._agent_card.capabilities, 'stateTransitionHistory', False)
                }
            )

            log(f"Discovered agent: {self._capability_info.name}")
            log(f"Skills: {[s['name'] for s in self._capability_info.skills]}")

            return self._capability_info

        except Exception as e:
            log(f"Discovery failed: {e}", "ERROR")
            raise ConnectionError(f"Failed to discover agent at {self.agent_url}: {e}")

    def _build_auth_headers(self) -> Dict[str, str]:
        """Build authentication headers."""
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        elif self.oauth_token:
            headers["Authorization"] = f"Bearer {self.oauth_token}"
        return headers

    def has_skill(self, skill_id: str) -> bool:
        """
        Check if agent has a specific skill.

        Args:
            skill_id: The skill ID to check for

        Returns:
            True if agent has the skill
        """
        if not self._capability_info:
            return False
        return any(s["id"] == skill_id for s in self._capability_info.skills)

    def get_skills(self) -> List[Dict]:
        """Get list of agent skills."""
        if not self._capability_info:
            return []
        return self._capability_info.skills

    async def send(
        self,
        message: str,
        skill: str = None,
        context_id: str = None,
        task_id: str = None,
        metadata: Dict = None,
        timeout: float = None
    ) -> ExternalAgentResult:
        """
        Send a message to the external agent.

        Args:
            message: The message to send
            skill: Optional skill hint for routing
            context_id: Optional conversation context ID
            task_id: Optional existing task ID for follow-up
            metadata: Optional metadata to include
            timeout: Request timeout override

        Returns:
            ExternalAgentResult with response
        """
        if not A2A_SDK_AVAILABLE:
            return ExternalAgentResult(
                success=False,
                text="",
                error="A2A SDK not installed"
            )

        # Ensure discovered
        if not self._client:
            await self.discover()

        start_time = datetime.now()
        effective_timeout = timeout or self.timeout

        try:
            # Build request metadata
            request_metadata = metadata or {}
            if skill:
                request_metadata["skill"] = skill

            log(f"Sending to {self.agent_name}: {message[:50]}...")

            # Send with timeout
            response = await asyncio.wait_for(
                self._client.send_message(
                    message=message,
                    context_id=context_id,
                    task_id=task_id,
                    metadata=request_metadata
                ),
                timeout=effective_timeout
            )

            # Calculate duration
            duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)

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

            result = ExternalAgentResult(
                success=response.status.state == "completed",
                text=text,
                data=data,
                task_id=response.id,
                context_id=context_id,
                status=response.status.state,
                duration_ms=duration_ms
            )

            log(f"Response from {self.agent_name}: {result.status} ({duration_ms}ms)")
            return result

        except asyncio.TimeoutError:
            return ExternalAgentResult(
                success=False,
                text="",
                error=f"Request timed out after {effective_timeout}s",
                duration_ms=int(effective_timeout * 1000)
            )
        except Exception as e:
            duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            log(f"Send error: {e}", "ERROR")
            return ExternalAgentResult(
                success=False,
                text="",
                error=str(e),
                duration_ms=duration_ms
            )

    async def send_with_retry(
        self,
        message: str,
        skill: str = None,
        max_retries: int = None,
        **kwargs
    ) -> ExternalAgentResult:
        """
        Send message with automatic retry on failure.

        Uses exponential backoff between retries.
        """
        retries = max_retries or self.MAX_RETRIES
        last_result = None

        for attempt in range(retries):
            result = await self.send(message, skill=skill, **kwargs)

            if result.success:
                return result

            last_result = result

            # Don't retry on certain errors
            if result.error and "timeout" not in result.error.lower():
                if attempt < retries - 1:
                    delay = self.RETRY_BACKOFF_BASE * (2 ** attempt)
                    log(f"Retry {attempt + 1}/{retries} in {delay}s: {result.error}", "WARN")
                    await asyncio.sleep(delay)

        return last_result or ExternalAgentResult(
            success=False,
            text="",
            error="All retries exhausted"
        )

    async def send_streaming(
        self,
        message: str,
        on_event: Callable,
        skill: str = None,
        context_id: str = None
    ):
        """
        Send message with streaming response.

        Args:
            message: The message to send
            on_event: Async callback for each streaming event
            skill: Optional skill hint
            context_id: Optional context ID
        """
        if not A2A_SDK_AVAILABLE:
            await on_event({
                "type": "error",
                "error": "A2A SDK not installed"
            })
            return

        if not self._client:
            await self.discover()

        metadata = {"skill": skill} if skill else None

        try:
            async for event in self._client.send_streaming_message(
                message=message,
                context_id=context_id,
                metadata=metadata
            ):
                await on_event(event)

        except Exception as e:
            log(f"Streaming error: {e}", "ERROR")
            await on_event({
                "type": "error",
                "error": str(e)
            })

    async def get_task(self, task_id: str) -> Dict[str, Any]:
        """Get task status and artifacts."""
        if not self._client:
            await self.discover()

        try:
            task = await self._client.get_task(task_id)
            return {
                "id": task.id,
                "status": task.status.state,
                "artifacts": [
                    {"parts": [{"text": getattr(p, 'text', '')} for p in a.parts]}
                    for a in (task.artifacts or [])
                ]
            }
        except Exception as e:
            log(f"Get task error: {e}", "ERROR")
            return {"error": str(e)}

    async def cancel_task(self, task_id: str) -> bool:
        """Request task cancellation."""
        if not self._client:
            await self.discover()

        try:
            await self._client.cancel_task(task_id)
            return True
        except Exception as e:
            log(f"Cancel task error: {e}", "ERROR")
            return False


# ===============================================================================
# AGENT REGISTRY
# ===============================================================================

class A2AAgentRegistry:
    """
    Registry of known and trusted A2A agents.

    Provides:
    - Agent registration and persistence
    - Trust level management
    - Client caching and reuse
    - Capability-based agent discovery
    """

    TRUST_LEVELS = ["untrusted", "verified", "trusted"]

    def __init__(self):
        self._agents: Dict[str, Dict[str, Any]] = {}
        self._clients: Dict[str, TinyPMExternalAgentClient] = {}
        self._load_registry()

    def _load_registry(self):
        """Load registry from disk."""
        if REGISTRY_FILE.exists():
            try:
                data = json.loads(REGISTRY_FILE.read_text())
                self._agents = data.get("agents", {})
                log(f"Loaded {len(self._agents)} agents from registry")
            except Exception as e:
                log(f"Failed to load registry: {e}", "WARN")

    def _save_registry(self):
        """Save registry to disk."""
        try:
            data = {
                "agents": self._agents,
                "updated_at": datetime.now().isoformat()
            }
            REGISTRY_FILE.write_text(json.dumps(data, indent=2))
        except Exception as e:
            log(f"Failed to save registry: {e}", "WARN")

    def register(
        self,
        name: str,
        url: str,
        api_key: str = None,
        oauth_token: str = None,
        trust_level: str = "untrusted",
        metadata: Dict = None
    ):
        """
        Register a known agent.

        Args:
            name: Unique name for the agent
            url: Agent's A2A endpoint URL
            api_key: Optional API key
            oauth_token: Optional OAuth token
            trust_level: Trust level (untrusted, verified, trusted)
            metadata: Optional additional metadata
        """
        if trust_level not in self.TRUST_LEVELS:
            raise ValueError(f"Invalid trust level: {trust_level}")

        self._agents[name] = {
            "url": url,
            "api_key": api_key,
            "oauth_token": oauth_token,
            "trust_level": trust_level,
            "metadata": metadata or {},
            "registered_at": datetime.now().isoformat()
        }

        # Clear cached client
        if name in self._clients:
            del self._clients[name]

        self._save_registry()
        log(f"Registered agent: {name} ({trust_level})")

    def unregister(self, name: str):
        """Remove an agent from the registry."""
        if name in self._agents:
            del self._agents[name]
            if name in self._clients:
                del self._clients[name]
            self._save_registry()
            log(f"Unregistered agent: {name}")

    def update_trust_level(self, name: str, trust_level: str):
        """Update an agent's trust level."""
        if name not in self._agents:
            raise ValueError(f"Agent not registered: {name}")
        if trust_level not in self.TRUST_LEVELS:
            raise ValueError(f"Invalid trust level: {trust_level}")

        self._agents[name]["trust_level"] = trust_level
        self._save_registry()
        log(f"Updated trust level for {name}: {trust_level}")

    async def get_client(self, name: str) -> TinyPMExternalAgentClient:
        """
        Get or create client for a registered agent.

        Discovers agent if not already cached.

        Args:
            name: Registered agent name

        Returns:
            TinyPMExternalAgentClient ready to use
        """
        if name not in self._agents:
            raise ValueError(f"Agent not registered: {name}")

        if name not in self._clients:
            agent = self._agents[name]
            client = TinyPMExternalAgentClient(
                agent_url=agent["url"],
                api_key=agent.get("api_key"),
                oauth_token=agent.get("oauth_token")
            )
            await client.discover()
            self._clients[name] = client

        return self._clients[name]

    def list_agents(self) -> List[Dict[str, Any]]:
        """List all registered agents."""
        return [
            {
                "name": name,
                "url": agent["url"],
                "trust_level": agent["trust_level"],
                "registered_at": agent.get("registered_at")
            }
            for name, agent in self._agents.items()
        ]

    def get_agent_info(self, name: str) -> Optional[Dict[str, Any]]:
        """Get information about a registered agent."""
        return self._agents.get(name)

    def find_by_skill(self, skill_id: str) -> List[str]:
        """
        Find agents that have a specific skill.

        Note: Requires agents to be discovered first.
        """
        matching = []
        for name, client in self._clients.items():
            if client.has_skill(skill_id):
                matching.append(name)
        return matching

    def find_by_trust_level(self, min_level: str) -> List[str]:
        """Find agents with at least the specified trust level."""
        level_index = self.TRUST_LEVELS.index(min_level)
        return [
            name for name, agent in self._agents.items()
            if self.TRUST_LEVELS.index(agent["trust_level"]) >= level_index
        ]


# ===============================================================================
# GLOBAL REGISTRY
# ===============================================================================

_registry: Optional[A2AAgentRegistry] = None

def get_agent_registry() -> A2AAgentRegistry:
    """Get the global A2A agent registry."""
    global _registry
    if _registry is None:
        _registry = A2AAgentRegistry()
    return _registry


# ===============================================================================
# CONVENIENCE FUNCTIONS
# ===============================================================================

async def call_external_agent(
    agent_name: str,
    message: str,
    skill: str = None,
    **kwargs
) -> ExternalAgentResult:
    """
    Convenience function to call a registered external agent.

    Args:
        agent_name: Name of registered agent
        message: Message to send
        skill: Optional skill hint
        **kwargs: Additional arguments for send()

    Returns:
        ExternalAgentResult
    """
    registry = get_agent_registry()
    client = await registry.get_client(agent_name)
    return await client.send(message, skill=skill, **kwargs)


async def discover_agent(url: str, api_key: str = None) -> AgentCapabilityInfo:
    """
    Convenience function to discover an agent without registering.

    Args:
        url: Agent URL
        api_key: Optional API key

    Returns:
        AgentCapabilityInfo with capabilities
    """
    client = TinyPMExternalAgentClient(url, api_key=api_key)
    return await client.discover()


# ===============================================================================
# CLI
# ===============================================================================

def main():
    """CLI for A2A client operations."""
    import argparse

    parser = argparse.ArgumentParser(description="TinyPM A2A Client")
    subparsers = parser.add_subparsers(dest="command")

    # Discover command
    discover_parser = subparsers.add_parser("discover", help="Discover an agent")
    discover_parser.add_argument("url", help="Agent URL")
    discover_parser.add_argument("--api-key", help="API key")

    # List command
    subparsers.add_parser("list", help="List registered agents")

    # Register command
    register_parser = subparsers.add_parser("register", help="Register an agent")
    register_parser.add_argument("name", help="Agent name")
    register_parser.add_argument("url", help="Agent URL")
    register_parser.add_argument("--api-key", help="API key")
    register_parser.add_argument("--trust", default="untrusted", help="Trust level")

    # Send command
    send_parser = subparsers.add_parser("send", help="Send message to agent")
    send_parser.add_argument("name", help="Registered agent name")
    send_parser.add_argument("message", help="Message to send")
    send_parser.add_argument("--skill", help="Target skill")

    args = parser.parse_args()

    async def run():
        if args.command == "discover":
            info = await discover_agent(args.url, args.api_key)
            print(f"\nAgent: {info.name}")
            print(f"Description: {info.description}")
            print(f"Skills: {[s['name'] for s in info.skills]}")
            print(f"Capabilities: {info.capabilities}")

        elif args.command == "list":
            registry = get_agent_registry()
            agents = registry.list_agents()
            if not agents:
                print("No agents registered")
            else:
                print("\nRegistered Agents:")
                for agent in agents:
                    print(f"  - {agent['name']} ({agent['trust_level']}): {agent['url']}")

        elif args.command == "register":
            registry = get_agent_registry()
            registry.register(
                name=args.name,
                url=args.url,
                api_key=args.api_key,
                trust_level=args.trust
            )
            print(f"Registered: {args.name}")

        elif args.command == "send":
            result = await call_external_agent(
                args.name,
                args.message,
                skill=args.skill
            )
            print(f"\nSuccess: {result.success}")
            print(f"Status: {result.status}")
            print(f"Response:\n{result.text}")
            if result.error:
                print(f"Error: {result.error}")

        else:
            parser.print_help()

    asyncio.run(run())


if __name__ == "__main__":
    main()
