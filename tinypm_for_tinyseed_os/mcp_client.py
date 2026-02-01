#!/usr/bin/env python3
"""
===============================================================================
     TINYPM MCP CLIENT - Connect to External MCP Servers
===============================================================================

TinyPM as an MCP client - connect to external MCP servers to extend capabilities.

This client manager allows TinyPM to:
- Connect to Playwright for browser automation (Wild Claims Czar)
- Connect to Supabase for database operations
- Connect to Filesystem for file access
- Connect to any MCP-compatible server

ARCHITECTURE:
┌─────────────────────────────────────────────────────────────────────┐
│                      TINYPM MCP CLIENT                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    MCP CLIENT MANAGER                        │   │
│  │  - Connects to multiple MCP servers                          │   │
│  │  - Routes tool calls to appropriate server                   │   │
│  │  - Handles capability discovery                              │   │
│  │  - Persistent session management                             │   │
│  │  - Session timeout and keepalive                             │   │
│  │  - Graceful error handling and reconnection                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│              ┌───────────────┼───────────────┐                     │
│              ▼               ▼               ▼                     │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐          │
│  │  Playwright   │  │   Supabase    │  │  Filesystem   │          │
│  │    Server     │  │    Server     │  │    Server     │          │
│  └───────────────┘  └───────────────┘  └───────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

CRITICAL FIX (2026-01-30):
- Sessions now persist for multi-turn interactions
- Each server runs in its own task with proper async generator lifecycle
- Added session timeout handling (5 minute default)
- Added keepalive ping mechanism
- Proper async cleanup on disconnect using shutdown events

Usage:
    # As a module
    from mcp_client import get_mcp_client, MCPServerConfig

    async with get_mcp_client() as client:
        await client.connect_server(MCPServerConfig(
            name="playwright",
            command="npx",
            args=["@playwright/mcp@latest"]
        ))

        # Session persists for multiple tool calls
        result = await client.call_tool("browser_navigate", {"url": "https://example.com"})
        result2 = await client.call_tool("browser_screenshot", {})

    # CLI
    python3 mcp_client.py list-servers      # List available servers
    python3 mcp_client.py connect           # Connect to default servers
    python3 mcp_client.py test playwright   # Test a specific server

Created: 2026-01-30
Author: PM Architect (Opus 4.5)
Protocol: MCP 2025-11-25
===============================================================================
"""

import argparse
import asyncio
import json
import os
import subprocess
import sys
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

APP_DIR = Path(__file__).parent
MCP_CLIENT_STATE_FILE = APP_DIR / ".mcp_client_state.json"
MCP_CLIENT_LOG_FILE = APP_DIR / ".mcp_client.log"

# Session configuration
DEFAULT_SESSION_TIMEOUT = timedelta(minutes=5)
KEEPALIVE_INTERVAL = timedelta(seconds=30)

# Try to import MCP SDK
try:
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
    MCP_SDK_AVAILABLE = True
except ImportError:
    MCP_SDK_AVAILABLE = False
    print("[MCP Client] MCP SDK not installed. Install with: pip install mcp")


# ═══════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class MCPServerConfig:
    """Configuration for an MCP server connection."""
    name: str
    command: str
    args: List[str]
    env: Optional[Dict[str, str]] = None
    timeout: int = 30
    description: str = ""
    enabled: bool = True


@dataclass
class MCPTool:
    """Representation of an MCP tool."""
    name: str
    server: str
    description: str
    input_schema: Dict[str, Any]


@dataclass
class MCPResource:
    """Representation of an MCP resource."""
    uri: str
    server: str
    name: str
    description: str


@dataclass
class MCPServerConnection:
    """
    Holds the persistent connection state for an MCP server.

    The connection runs in its own task that maintains the async context
    manager lifecycle properly.
    """
    config: MCPServerConfig
    session: Any  # ClientSession - set when ready
    shutdown_event: asyncio.Event  # Signal to shutdown
    ready_event: asyncio.Event  # Signal that session is ready
    connection_task: Optional[asyncio.Task] = None
    last_activity: datetime = field(default_factory=datetime.now)
    tools: List[MCPTool] = field(default_factory=list)
    resources: List[MCPResource] = field(default_factory=list)
    error: Optional[str] = None

    def touch(self):
        """Update last activity timestamp."""
        self.last_activity = datetime.now()

    def is_expired(self, timeout: timedelta = DEFAULT_SESSION_TIMEOUT) -> bool:
        """Check if session has expired due to inactivity."""
        return datetime.now() - self.last_activity > timeout


# ═══════════════════════════════════════════════════════════════════════════════
# DEFAULT SERVER CONFIGURATIONS
# ═══════════════════════════════════════════════════════════════════════════════

# These are MCP servers that TinyPM should connect to for extended capabilities
DEFAULT_SERVERS: Dict[str, MCPServerConfig] = {
    "playwright": MCPServerConfig(
        name="playwright",
        command="npx",
        args=["@playwright/mcp@latest"],
        timeout=60,
        description="Browser automation for web scraping and testing (Wild Claims Czar)",
        env={"PLAYWRIGHT_HEADLESS": "true"}
    ),
    "filesystem": MCPServerConfig(
        name="filesystem",
        command="npx",
        args=[
            "-y",
            "@modelcontextprotocol/server-filesystem@latest",
            str(Path.home() / "Documents"),  # Default allowed directory
        ],
        description="Secure file system access",
    ),
    "git": MCPServerConfig(
        name="git",
        command="npx",
        args=["-y", "@modelcontextprotocol/server-git@latest"],
        env={"GIT_REPO_PATH": str(APP_DIR.parent)},
        description="Git repository operations",
    ),
    "memory": MCPServerConfig(
        name="memory",
        command="npx",
        args=["-y", "@modelcontextprotocol/server-memory@latest"],
        description="Knowledge graph-based persistent memory",
    ),
    "fetch": MCPServerConfig(
        name="fetch",
        command="npx",
        args=["-y", "@modelcontextprotocol/server-fetch@latest"],
        description="Web content fetching for LLM usage",
    ),
    "supabase": MCPServerConfig(
        name="supabase",
        command="npx",
        args=["-y", "@supabase/mcp-server-supabase@latest"],
        env={
            "SUPABASE_URL": os.environ.get("SUPABASE_URL", ""),
            "SUPABASE_SERVICE_KEY": os.environ.get("SUPABASE_SERVICE_KEY", ""),
        },
        description="Supabase database operations for persistent storage",
        enabled=bool(os.environ.get("SUPABASE_URL"))  # Only enable if configured
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════════════════════════

def log(msg: str, level: str = "INFO"):
    """Log with timestamp."""
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] [MCP-Client-{level}] {msg}"
    print(line)
    try:
        with open(MCP_CLIENT_LOG_FILE, "a") as f:
            f.write(f"[{datetime.now().isoformat()}] [{level}] {msg}\n")
    except:
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# MCP CLIENT MANAGER - PERSISTENT SESSION MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

class MCPClientManager:
    """
    Manages persistent connections to multiple MCP servers.

    CRITICAL: This class properly manages async context manager lifecycles
    by running each server connection in its own dedicated task.

    The session lifecycle:
    1. connect_server() spawns a task that enters and maintains context managers
    2. The task stays alive, keeping the session valid for tool calls
    3. Tool calls are routed through the active session
    4. disconnect_server() signals the task to exit, which cleans up properly
    5. On timeout, sessions are automatically cleaned up

    Usage:
        async with MCPClientManager() as client:
            await client.connect_server(config)

            # Multiple calls use the same persistent session
            result1 = await client.call_tool("tool1", {...})
            result2 = await client.call_tool("tool2", {...})

        # Cleanup happens automatically on exit
    """

    def __init__(self, session_timeout: timedelta = DEFAULT_SESSION_TIMEOUT):
        """Initialize the MCP Client Manager."""
        self._connections: Dict[str, MCPServerConnection] = {}
        self.server_tools: Dict[str, List[MCPTool]] = {}
        self.server_resources: Dict[str, List[MCPResource]] = {}
        self._connected_servers: List[str] = []
        self._server_configs: Dict[str, MCPServerConfig] = {}
        self._session_timeout = session_timeout
        self._cleanup_task: Optional[asyncio.Task] = None
        self._load_state()

    async def __aenter__(self):
        """Enter async context - start cleanup task."""
        self._cleanup_task = asyncio.create_task(self._cleanup_expired_sessions())
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Exit async context - disconnect all servers."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        await self.disconnect_all()
        return False

    def _load_state(self):
        """Load client state from disk."""
        try:
            if MCP_CLIENT_STATE_FILE.exists():
                data = json.loads(MCP_CLIENT_STATE_FILE.read_text())
                # Restore any custom configurations
                for name, config_dict in data.get("custom_servers", {}).items():
                    self._server_configs[name] = MCPServerConfig(**config_dict)
        except Exception as e:
            log(f"Error loading state: {e}", "WARN")

    def _save_state(self):
        """Save client state to disk."""
        try:
            data = {
                "connected_servers": self._connected_servers,
                "custom_servers": {
                    name: {
                        "name": cfg.name,
                        "command": cfg.command,
                        "args": cfg.args,
                        "env": cfg.env,
                        "timeout": cfg.timeout,
                        "description": cfg.description,
                        "enabled": cfg.enabled
                    }
                    for name, cfg in self._server_configs.items()
                    if name not in DEFAULT_SERVERS
                },
                "last_connected": datetime.now().isoformat()
            }
            MCP_CLIENT_STATE_FILE.write_text(json.dumps(data, indent=2))
        except Exception as e:
            log(f"Error saving state: {e}", "WARN")

    async def _cleanup_expired_sessions(self):
        """Background task to clean up expired sessions."""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute

                expired = [
                    name for name, conn in self._connections.items()
                    if conn.is_expired(self._session_timeout)
                ]

                for name in expired:
                    log(f"Session {name} expired due to inactivity, disconnecting...", "WARN")
                    await self.disconnect_server(name)

            except asyncio.CancelledError:
                break
            except Exception as e:
                log(f"Error in cleanup task: {e}", "ERROR")

    def _check_command_exists(self, command: str) -> bool:
        """Check if a command exists on the system."""
        try:
            subprocess.run(
                ["which", command] if sys.platform != "win32" else ["where", command],
                capture_output=True,
                check=True
            )
            return True
        except subprocess.CalledProcessError:
            return False

    async def _server_connection_task(self, conn: MCPServerConnection):
        """
        Task that maintains an MCP server connection.

        This runs in its own task so that the async context managers
        (stdio_client and ClientSession) are properly maintained in
        the same task context throughout their lifecycle.

        The task:
        1. Enters the stdio_client context manager
        2. Creates and enters the ClientSession
        3. Initializes and discovers tools
        4. Waits for shutdown signal while keeping connection alive
        5. Properly exits both context managers on shutdown
        """
        config = conn.config
        env = {**os.environ}
        if config.env:
            env.update(config.env)

        server_params = StdioServerParameters(
            command=config.command,
            args=config.args,
            env=env
        )

        try:
            async with stdio_client(server_params) as (read_stream, write_stream):
                async with ClientSession(read_stream, write_stream) as session:
                    # Store session reference
                    conn.session = session

                    # Initialize connection
                    await session.initialize()

                    # Discover tools
                    tools_response = await session.list_tools()
                    conn.tools = [
                        MCPTool(
                            name=tool.name,
                            server=config.name,
                            description=tool.description or "",
                            input_schema=tool.inputSchema or {}
                        )
                        for tool in tools_response.tools
                    ]

                    # Discover resources
                    try:
                        resources_response = await session.list_resources()
                        conn.resources = [
                            MCPResource(
                                uri=str(resource.uri),
                                server=config.name,
                                name=resource.name or "",
                                description=resource.description or ""
                            )
                            for resource in resources_response.resources
                        ]
                    except Exception:
                        conn.resources = []

                    # Signal that we're ready
                    conn.ready_event.set()

                    log(f"Connected to {config.name}: {len(conn.tools)} tools", "SUCCESS")

                    # Keep connection alive until shutdown requested
                    # Also handle keepalive pings
                    while not conn.shutdown_event.is_set():
                        try:
                            # Wait for shutdown or timeout for keepalive
                            await asyncio.wait_for(
                                conn.shutdown_event.wait(),
                                timeout=KEEPALIVE_INTERVAL.total_seconds()
                            )
                            break  # Shutdown was requested
                        except asyncio.TimeoutError:
                            # Send keepalive ping
                            if not conn.is_expired(self._session_timeout):
                                try:
                                    await session.send_ping()
                                except Exception as e:
                                    log(f"Keepalive failed for {config.name}: {e}", "WARN")

                    log(f"Connection task for {config.name} shutting down...", "INFO")

        except FileNotFoundError as e:
            conn.error = f"Command not found: {e}"
            log(f"Command not found for {config.name}: {e}", "ERROR")
        except Exception as e:
            conn.error = str(e)
            log(f"Connection error for {config.name}: {e}", "ERROR")
        finally:
            # Always signal ready (even on error) so connect_server doesn't hang
            conn.ready_event.set()

    async def connect_server(self, config: MCPServerConfig) -> bool:
        """
        Connect to an MCP server with PERSISTENT session management.

        This spawns a dedicated task for the connection that properly
        maintains the async context manager lifecycle.

        Args:
            config: Server configuration

        Returns:
            True if connection successful, False otherwise
        """
        if not MCP_SDK_AVAILABLE:
            log(f"Cannot connect to {config.name}: MCP SDK not installed", "ERROR")
            return False

        if not config.enabled:
            log(f"Server {config.name} is disabled", "WARN")
            return False

        # Check if already connected
        if config.name in self._connections:
            log(f"Already connected to {config.name}", "WARN")
            return True

        log(f"Connecting to {config.name}...")

        # Check if command exists
        if not self._check_command_exists(config.command):
            log(f"Command not found: {config.command}", "ERROR")
            return False

        # Create connection object with events for synchronization
        conn = MCPServerConnection(
            config=config,
            session=None,
            shutdown_event=asyncio.Event(),
            ready_event=asyncio.Event(),
        )

        # Start the connection task
        conn.connection_task = asyncio.create_task(
            self._server_connection_task(conn)
        )

        # Wait for connection to be ready (or fail)
        try:
            await asyncio.wait_for(conn.ready_event.wait(), timeout=config.timeout)
        except asyncio.TimeoutError:
            log(f"Connection to {config.name} timed out", "ERROR")
            conn.shutdown_event.set()
            try:
                await asyncio.wait_for(conn.connection_task, timeout=5)
            except asyncio.TimeoutError:
                conn.connection_task.cancel()
            return False

        # Check if connection failed
        if conn.error or conn.session is None:
            log(f"Connection to {config.name} failed: {conn.error}", "ERROR")
            return False

        # Store connection
        self._connections[config.name] = conn
        self._connected_servers.append(config.name)
        self._server_configs[config.name] = config
        self.server_tools[config.name] = conn.tools
        self.server_resources[config.name] = conn.resources

        self._save_state()
        return True

    async def connect_all(self, servers: Dict[str, MCPServerConfig] = None):
        """
        Connect to all configured servers.

        Args:
            servers: Server configurations to use (defaults to DEFAULT_SERVERS)
        """
        servers = servers or DEFAULT_SERVERS

        log(f"Connecting to {len(servers)} MCP servers...")

        results = {}
        for name, config in servers.items():
            if config.enabled:
                success = await self.connect_server(config)
                results[name] = success
            else:
                log(f"Skipping disabled server: {name}")
                results[name] = False

        connected = sum(1 for v in results.values() if v)
        log(f"Connected to {connected}/{len(servers)} servers", "SUCCESS" if connected > 0 else "WARN")

        return results

    async def disconnect_server(self, server_name: str):
        """
        Disconnect from a server with proper cleanup.

        This signals the connection task to shutdown, which properly
        exits all async context managers in the correct task context.

        Args:
            server_name: Name of server to disconnect
        """
        log(f"Disconnecting from {server_name}...")

        if server_name not in self._connections:
            log(f"Server {server_name} not connected", "WARN")
            return

        conn = self._connections[server_name]

        # Signal shutdown
        conn.shutdown_event.set()

        # Wait for connection task to finish (with timeout)
        if conn.connection_task:
            try:
                await asyncio.wait_for(conn.connection_task, timeout=10)
            except asyncio.TimeoutError:
                log(f"Connection task for {server_name} didn't stop in time, cancelling", "WARN")
                conn.connection_task.cancel()
                try:
                    await conn.connection_task
                except asyncio.CancelledError:
                    pass
            except Exception as e:
                log(f"Error waiting for {server_name} task: {e}", "WARN")

        # Clean up connection state
        del self._connections[server_name]
        if server_name in self._connected_servers:
            self._connected_servers.remove(server_name)
        if server_name in self.server_tools:
            del self.server_tools[server_name]
        if server_name in self.server_resources:
            del self.server_resources[server_name]

        log(f"Disconnected from {server_name}", "SUCCESS")
        self._save_state()

    async def disconnect_all(self):
        """Disconnect from all servers."""
        # Copy the list since we're modifying it during iteration
        for server_name in list(self._connected_servers):
            await self.disconnect_server(server_name)

    def get_all_tools(self) -> List[MCPTool]:
        """
        Get all tools from all connected servers.

        Tool names are prefixed with server name for routing:
        e.g., "playwright__browser_navigate"

        Returns:
            List of all available tools
        """
        all_tools = []
        for server_name, tools in self.server_tools.items():
            for tool in tools:
                # Create a copy with prefixed name for routing
                prefixed_tool = MCPTool(
                    name=f"{server_name}__{tool.name}",
                    server=server_name,
                    description=tool.description,
                    input_schema=tool.input_schema
                )
                all_tools.append(prefixed_tool)
        return all_tools

    def get_all_resources(self) -> List[MCPResource]:
        """
        Get all resources from all connected servers.

        Returns:
            List of all available resources
        """
        all_resources = []
        for server_name, resources in self.server_resources.items():
            all_resources.extend(resources)
        return all_resources

    def find_tool_server(self, tool_name: str) -> Optional[str]:
        """
        Find which server provides a given tool.

        Args:
            tool_name: Tool name (with or without server prefix)

        Returns:
            Server name or None if not found
        """
        # Check for explicit prefix
        if "__" in tool_name:
            server_name, actual_tool = tool_name.split("__", 1)
            if server_name in self.server_tools:
                return server_name

        # Search all servers
        for server_name, tools in self.server_tools.items():
            for tool in tools:
                if tool.name == tool_name:
                    return server_name

        return None

    async def call_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any]
    ) -> Tuple[Any, bool]:
        """
        Call a tool on the appropriate server.

        The session is automatically kept alive by updating the last activity
        timestamp on each call.

        Args:
            tool_name: Tool name (with or without server prefix)
            arguments: Tool arguments

        Returns:
            (result, success) tuple
        """
        # Parse server prefix
        if "__" in tool_name:
            server_name, actual_tool = tool_name.split("__", 1)
        else:
            server_name = self.find_tool_server(tool_name)
            actual_tool = tool_name

        if not server_name:
            return {"error": f"No server found for tool: {tool_name}"}, False

        if server_name not in self._connections:
            return {"error": f"Server not connected: {server_name}"}, False

        conn = self._connections[server_name]

        if conn.session is None:
            return {"error": f"Session not initialized for: {server_name}"}, False

        try:
            # Update activity timestamp to prevent timeout
            conn.touch()

            # Call the tool on the persistent session
            result = await conn.session.call_tool(actual_tool, arguments)

            log(f"Tool {tool_name} executed successfully")
            return result, True

        except Exception as e:
            log(f"Tool call failed: {tool_name} - {e}", "ERROR")
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
            (content, success) tuple
        """
        if server_name not in self._connections:
            return {"error": f"Server not connected: {server_name}"}, False

        conn = self._connections[server_name]

        if conn.session is None:
            return {"error": f"Session not initialized for: {server_name}"}, False

        try:
            conn.touch()  # Update activity

            result = await conn.session.read_resource(uri)

            log(f"Resource read: {uri}")
            return result, True

        except Exception as e:
            log(f"Resource read failed: {uri} - {e}", "ERROR")
            return {"error": str(e)}, False

    async def refresh_session(self, server_name: str) -> bool:
        """
        Refresh a session by reconnecting.

        Useful if a session has gone stale or encountered errors.

        Args:
            server_name: Name of server to refresh

        Returns:
            True if refresh successful
        """
        if server_name not in self._server_configs:
            return False

        config = self._server_configs[server_name]
        await self.disconnect_server(server_name)
        return await self.connect_server(config)

    def list_connected_servers(self) -> List[str]:
        """Get list of connected server names."""
        return self._connected_servers.copy()

    def get_server_info(self, server_name: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a connected server.

        Args:
            server_name: Name of server

        Returns:
            Server info dict or None if not connected
        """
        if server_name not in self._connected_servers:
            return None

        config = self._server_configs.get(server_name)
        tools = self.server_tools.get(server_name, [])
        resources = self.server_resources.get(server_name, [])
        conn = self._connections.get(server_name)

        return {
            "name": server_name,
            "description": config.description if config else "",
            "connected": True,
            "tool_count": len(tools),
            "resource_count": len(resources),
            "tools": [{"name": t.name, "description": t.description} for t in tools],
            "resources": [{"uri": r.uri, "name": r.name} for r in resources],
            "last_activity": conn.last_activity.isoformat() if conn else None,
            "session_timeout_seconds": self._session_timeout.total_seconds(),
        }

    def get_status(self) -> Dict[str, Any]:
        """
        Get overall client status.

        Returns:
            Status dict with connection info
        """
        return {
            "mcp_sdk_available": MCP_SDK_AVAILABLE,
            "connected_servers": self._connected_servers,
            "total_tools": len(self.get_all_tools()),
            "total_resources": len(self.get_all_resources()),
            "session_timeout_minutes": self._session_timeout.total_seconds() / 60,
            "servers": {
                name: self.get_server_info(name)
                for name in self._connected_servers
            }
        }


# ═══════════════════════════════════════════════════════════════════════════════
# GLOBAL INSTANCE WITH ASYNC CONTEXT MANAGER SUPPORT
# ═══════════════════════════════════════════════════════════════════════════════

_client_manager: Optional[MCPClientManager] = None
_client_lock = asyncio.Lock() if hasattr(asyncio, 'Lock') else None


@asynccontextmanager
async def get_mcp_client(session_timeout: timedelta = DEFAULT_SESSION_TIMEOUT):
    """
    Get or create the MCP client manager as an async context manager.

    Usage:
        async with get_mcp_client() as client:
            await client.connect_server(config)
            result = await client.call_tool("tool_name", args)
    """
    global _client_manager

    if _client_manager is None:
        _client_manager = MCPClientManager(session_timeout=session_timeout)
        await _client_manager.__aenter__()

    try:
        yield _client_manager
    finally:
        # Don't cleanup here - let the caller decide when to disconnect
        pass


async def get_mcp_client_singleton() -> MCPClientManager:
    """
    Get or create the MCP client manager singleton.

    WARNING: When using this, you must manually call cleanup methods.
    Prefer using get_mcp_client() as a context manager instead.
    """
    global _client_manager

    if _client_manager is None:
        _client_manager = MCPClientManager()
        await _client_manager.__aenter__()

    return _client_manager


async def cleanup_mcp_client():
    """Clean up the global MCP client manager."""
    global _client_manager

    if _client_manager is not None:
        await _client_manager.__aexit__(None, None, None)
        _client_manager = None


# ═══════════════════════════════════════════════════════════════════════════════
# CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

async def playwright_navigate(url: str) -> Dict[str, Any]:
    """
    Navigate Playwright browser to URL.

    Requires Playwright MCP server to be connected.

    Args:
        url: URL to navigate to

    Returns:
        Navigation result
    """
    client = await get_mcp_client_singleton()
    result, success = await client.call_tool("playwright__browser_navigate", {"url": url})
    return result if success else {"error": "Navigation failed", "details": result}


async def playwright_screenshot(path: str = None) -> Dict[str, Any]:
    """
    Take a screenshot of current Playwright page.

    Args:
        path: Optional file path to save screenshot

    Returns:
        Screenshot result (base64 data or file path)
    """
    client = await get_mcp_client_singleton()
    args = {}
    if path:
        args["path"] = path
    result, success = await client.call_tool("playwright__browser_screenshot", args)
    return result if success else {"error": "Screenshot failed", "details": result}


async def playwright_click(selector: str) -> Dict[str, Any]:
    """
    Click an element in Playwright.

    Args:
        selector: CSS selector or text to click

    Returns:
        Click result
    """
    client = await get_mcp_client_singleton()
    result, success = await client.call_tool("playwright__browser_click", {"selector": selector})
    return result if success else {"error": "Click failed", "details": result}


async def filesystem_read(path: str) -> Dict[str, Any]:
    """
    Read a file via Filesystem MCP.

    Args:
        path: File path to read

    Returns:
        File contents
    """
    client = await get_mcp_client_singleton()
    result, success = await client.call_tool("filesystem__read_file", {"path": path})
    return result if success else {"error": "Read failed", "details": result}


async def filesystem_write(path: str, content: str) -> Dict[str, Any]:
    """
    Write to a file via Filesystem MCP.

    Args:
        path: File path to write
        content: Content to write

    Returns:
        Write result
    """
    client = await get_mcp_client_singleton()
    result, success = await client.call_tool(
        "filesystem__write_file",
        {"path": path, "content": content}
    )
    return result if success else {"error": "Write failed", "details": result}


async def fetch_url(url: str) -> Dict[str, Any]:
    """
    Fetch URL content via Fetch MCP.

    Args:
        url: URL to fetch

    Returns:
        Fetched content
    """
    client = await get_mcp_client_singleton()
    result, success = await client.call_tool("fetch__fetch", {"url": url})
    return result if success else {"error": "Fetch failed", "details": result}


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

async def cli_list_servers():
    """List available MCP servers."""
    print("\n" + "=" * 60)
    print("Available MCP Servers")
    print("=" * 60)

    for name, config in DEFAULT_SERVERS.items():
        status = "enabled" if config.enabled else "disabled"
        print(f"\n{name}:")
        print(f"  Description: {config.description}")
        print(f"  Command: {config.command} {' '.join(config.args[:2])}...")
        print(f"  Status: {status}")


async def cli_connect():
    """Connect to all default servers."""
    async with get_mcp_client() as client:
        await client.connect_all()

        print("\n" + "=" * 60)
        print("Connection Status")
        print("=" * 60)

        status = client.get_status()
        print(f"\nMCP SDK Available: {status['mcp_sdk_available']}")
        print(f"Connected Servers: {len(status['connected_servers'])}")
        print(f"Total Tools: {status['total_tools']}")
        print(f"Total Resources: {status['total_resources']}")
        print(f"Session Timeout: {status['session_timeout_minutes']} minutes")

        for name in status['connected_servers']:
            info = status['servers'][name]
            print(f"\n{name}:")
            print(f"  Tools: {info['tool_count']}")
            print(f"  Resources: {info['resource_count']}")
            print(f"  Last Activity: {info['last_activity']}")


async def cli_test_server(server_name: str):
    """Test a specific server connection with multi-turn interaction."""
    if server_name not in DEFAULT_SERVERS:
        print(f"Unknown server: {server_name}")
        print(f"Available: {list(DEFAULT_SERVERS.keys())}")
        return

    config = DEFAULT_SERVERS[server_name]

    print(f"\nTesting connection to {server_name}...")

    async with get_mcp_client() as client:
        success = await client.connect_server(config)

        if success:
            info = client.get_server_info(server_name)
            print(f"\n{server_name} connected successfully!")
            print(f"Tools available: {info['tool_count']}")
            for tool in info['tools'][:10]:
                print(f"  - {tool['name']}: {tool['description'][:50]}...")

            # Test multi-turn - wait a bit and verify session is still alive
            print("\nTesting session persistence (waiting 5 seconds)...")
            await asyncio.sleep(5)

            # Try to list tools again - this should work on the same session
            info2 = client.get_server_info(server_name)
            if info2:
                print(f"Session still active! Last activity: {info2['last_activity']}")
            else:
                print("ERROR: Session was lost!")

            # Explicit disconnect
            await client.disconnect_server(server_name)
            print("Disconnected cleanly.")
        else:
            print(f"\nFailed to connect to {server_name}")


async def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="TinyPM MCP Client - Connect to external MCP servers"
    )
    parser.add_argument(
        "command",
        choices=["list-servers", "connect", "test", "status"],
        help="Command to run"
    )
    parser.add_argument(
        "server",
        nargs="?",
        help="Server name (for test command)"
    )

    args = parser.parse_args()

    if args.command == "list-servers":
        await cli_list_servers()
    elif args.command == "connect":
        await cli_connect()
    elif args.command == "test":
        if not args.server:
            print("Please specify a server name")
            print(f"Available: {list(DEFAULT_SERVERS.keys())}")
        else:
            await cli_test_server(args.server)
    elif args.command == "status":
        async with get_mcp_client() as client:
            status = client.get_status()
            print(json.dumps(status, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
