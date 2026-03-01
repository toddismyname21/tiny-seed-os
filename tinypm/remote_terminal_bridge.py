#!/usr/bin/env python3
"""
TinyPM Remote Terminal Bridge
=============================
The killer feature that lets users chat with Claude Code from ANYWHERE.

As long as a terminal session is running, users can connect remotely via
WebSocket and interact with Claude Code in real-time.

Architecture:
    Browser (Anywhere)
        |
        v WebSocket (wss://...)
    +---------------------------+
    |  Remote Terminal Bridge   |
    |  - Auth validation        |
    |  - Message routing        |
    |  - Session management     |
    +-------------+-------------+
                  |
                  v stdin/stdout pipe
    +---------------------------+
    |    Claude Code CLI        |
    |  - Full context           |
    |  - Real commands          |
    |  - Persistent session     |
    +---------------------------+

Usage:
    python remote_terminal_bridge.py start      # Start the bridge server
    python remote_terminal_bridge.py stop       # Stop the bridge
    python remote_terminal_bridge.py status     # Check status
    python remote_terminal_bridge.py token      # Generate access token
    python remote_terminal_bridge.py connect    # Test connection

Author: TinyPM Team
Created: 2026-01-30
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import pty
import secrets
import select
import signal
import subprocess
import sys
import termios
import time
import tty
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional

# Check for websockets availability
try:
    import websockets
    from websockets.server import serve as ws_serve
    from websockets.exceptions import ConnectionClosed
    WEBSOCKETS_AVAILABLE = True
except ImportError:
    WEBSOCKETS_AVAILABLE = False
    print("WARNING: websockets not installed. Run: pip install websockets")

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

APP_DIR = Path(__file__).parent
ENV_FILE = APP_DIR / ".env"
STATE_FILE = APP_DIR / ".remote_bridge_state.json"
TOKEN_FILE = APP_DIR / ".remote_bridge_tokens.json"
PID_FILE = APP_DIR / ".remote_bridge.pid"
LOG_FILE = APP_DIR / ".remote_bridge.log"

DEFAULT_PORT = 8765
# SECURITY FIX 2026-02-28: Default to localhost (was 0.0.0.0)
DEFAULT_HOST = "127.0.0.1"
MAX_CONNECTIONS = 5
HEARTBEAT_INTERVAL = 30  # seconds
TOKEN_EXPIRY_HOURS = 24 * 7  # 1 week
MAX_MESSAGE_SIZE = 1024 * 1024  # 1MB
RATE_LIMIT_MESSAGES = 60  # per minute
RATE_LIMIT_WINDOW = 60  # seconds

# Claude Code binary location
CLAUDE_BIN = Path.home() / ".local" / "bin" / "claude"
if not CLAUDE_BIN.exists():
    # Try other common locations
    for alt_path in ["/usr/local/bin/claude", "/opt/homebrew/bin/claude"]:
        if Path(alt_path).exists():
            CLAUDE_BIN = Path(alt_path)
            break


def load_env() -> dict[str, str]:
    """Load environment variables from .env file."""
    env_vars = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                env_vars[key.strip()] = val.strip().strip('"').strip("'")
    return env_vars


def log(msg: str, level: str = "INFO"):
    """Log message to file and optionally stdout."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] [{level}] {msg}\n"

    # Append to log file
    with open(LOG_FILE, "a") as f:
        f.write(log_entry)

    # Also print if running interactively
    if sys.stdout.isatty():
        print(f"[{level}] {msg}")


# ═══════════════════════════════════════════════════════════════════════════════
# MESSAGE PROTOCOL
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Message:
    """Standard message format for WebSocket communication."""
    type: str  # message, command, status, output, error, heartbeat, auth
    content: str
    session_id: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    metadata: dict = field(default_factory=dict)

    def to_json(self) -> str:
        return json.dumps({
            "type": self.type,
            "content": self.content,
            "session_id": self.session_id,
            "timestamp": self.timestamp,
            "metadata": self.metadata
        })

    @classmethod
    def from_json(cls, data: str) -> "Message":
        try:
            parsed = json.loads(data)
            return cls(
                type=parsed.get("type", "message"),
                content=parsed.get("content", ""),
                session_id=parsed.get("session_id"),
                timestamp=parsed.get("timestamp", datetime.now().isoformat()),
                metadata=parsed.get("metadata", {})
            )
        except json.JSONDecodeError:
            return cls(type="message", content=data)


# ═══════════════════════════════════════════════════════════════════════════════
# AUTHENTICATION
# ═══════════════════════════════════════════════════════════════════════════════

class TokenManager:
    """Manage access tokens for remote connections."""

    def __init__(self):
        self.tokens: dict[str, dict] = {}
        self._load_tokens()

    def _load_tokens(self):
        """Load tokens from file."""
        if TOKEN_FILE.exists():
            try:
                self.tokens = json.loads(TOKEN_FILE.read_text())
                # Clean expired tokens
                self._cleanup_expired()
            except json.JSONDecodeError:
                self.tokens = {}

    def _save_tokens(self):
        """Save tokens to file."""
        TOKEN_FILE.write_text(json.dumps(self.tokens, indent=2))
        # Secure the file
        os.chmod(TOKEN_FILE, 0o600)

    def _cleanup_expired(self):
        """Remove expired tokens."""
        now = datetime.now()
        expired = [
            t for t, data in self.tokens.items()
            if datetime.fromisoformat(data["expires"]) < now
        ]
        for t in expired:
            del self.tokens[t]
        if expired:
            self._save_tokens()

    def generate_token(self, name: str = "default", hours: int = TOKEN_EXPIRY_HOURS) -> str:
        """Generate a new access token."""
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        self.tokens[token_hash] = {
            "name": name,
            "created": datetime.now().isoformat(),
            "expires": (datetime.now() + timedelta(hours=hours)).isoformat(),
            "last_used": None,
            "use_count": 0
        }
        self._save_tokens()

        log(f"Generated new token '{name}' (expires in {hours}h)")
        return token

    def validate_token(self, token: str) -> tuple[bool, str]:
        """Validate an access token. Returns (is_valid, message)."""
        if not token:
            return False, "No token provided"

        token_hash = hashlib.sha256(token.encode()).hexdigest()

        if token_hash not in self.tokens:
            log(f"Invalid token attempt", "WARN")
            return False, "Invalid token"

        token_data = self.tokens[token_hash]
        expires = datetime.fromisoformat(token_data["expires"])

        if datetime.now() > expires:
            del self.tokens[token_hash]
            self._save_tokens()
            return False, "Token expired"

        # Update usage stats
        token_data["last_used"] = datetime.now().isoformat()
        token_data["use_count"] += 1
        self._save_tokens()

        return True, f"Valid ({token_data['name']})"

    def list_tokens(self) -> list[dict]:
        """List all tokens (without the actual token values)."""
        self._cleanup_expired()
        return [
            {
                "hash_prefix": h[:8] + "...",
                "name": data["name"],
                "created": data["created"],
                "expires": data["expires"],
                "last_used": data["last_used"],
                "use_count": data["use_count"]
            }
            for h, data in self.tokens.items()
        ]

    def revoke_all(self):
        """Revoke all tokens."""
        count = len(self.tokens)
        self.tokens = {}
        self._save_tokens()
        log(f"Revoked {count} tokens")
        return count


# ═══════════════════════════════════════════════════════════════════════════════
# RATE LIMITING
# ═══════════════════════════════════════════════════════════════════════════════

class RateLimiter:
    """Simple rate limiter for connections."""

    def __init__(self, max_requests: int = RATE_LIMIT_MESSAGES, window: int = RATE_LIMIT_WINDOW):
        self.max_requests = max_requests
        self.window = window
        self.requests: dict[str, list[float]] = {}

    def is_allowed(self, client_id: str) -> bool:
        """Check if a request is allowed for this client."""
        now = time.time()

        if client_id not in self.requests:
            self.requests[client_id] = []

        # Remove old requests outside window
        self.requests[client_id] = [
            t for t in self.requests[client_id]
            if now - t < self.window
        ]

        if len(self.requests[client_id]) >= self.max_requests:
            return False

        self.requests[client_id].append(now)
        return True


# ═══════════════════════════════════════════════════════════════════════════════
# CLAUDE CODE SESSION MANAGER
# ═══════════════════════════════════════════════════════════════════════════════

class ClaudeSession:
    """Manages a Claude Code CLI session with PTY for full terminal emulation."""

    def __init__(self, session_id: str, working_dir: Optional[Path] = None):
        self.session_id = session_id
        self.working_dir = working_dir or APP_DIR.parent
        self.process: Optional[subprocess.Popen] = None
        self.master_fd: Optional[int] = None
        self.slave_fd: Optional[int] = None
        self.created_at = datetime.now()
        self.last_activity = datetime.now()
        self.output_buffer: list[str] = []
        self.is_running = False
        self._output_task: Optional[asyncio.Task] = None
        self._output_callback: Optional[callable] = None

    async def start(self, output_callback: callable = None) -> bool:
        """Start a Claude Code session with PTY."""
        if self.is_running:
            return True

        self._output_callback = output_callback

        try:
            # Create pseudo-terminal
            self.master_fd, self.slave_fd = pty.openpty()

            # Make master non-blocking
            import fcntl
            flags = fcntl.fcntl(self.master_fd, fcntl.F_GETFL)
            fcntl.fcntl(self.master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

            # Start Claude Code
            claude_cmd = str(CLAUDE_BIN)
            if not Path(claude_cmd).exists():
                # Fallback to PATH
                claude_cmd = "claude"

            self.process = subprocess.Popen(
                [claude_cmd],
                stdin=self.slave_fd,
                stdout=self.slave_fd,
                stderr=self.slave_fd,
                cwd=str(self.working_dir),
                env={**os.environ, "TERM": "xterm-256color"},
                preexec_fn=os.setsid
            )

            self.is_running = True
            self.last_activity = datetime.now()

            # Start output reading task
            self._output_task = asyncio.create_task(self._read_output())

            log(f"Started Claude session {self.session_id}")
            return True

        except FileNotFoundError:
            log(f"Claude CLI not found at {CLAUDE_BIN}", "ERROR")
            return False
        except Exception as e:
            log(f"Failed to start Claude session: {e}", "ERROR")
            return False

    async def _read_output(self):
        """Continuously read output from Claude and send to callback."""
        while self.is_running and self.master_fd is not None:
            try:
                # Use select to check if data is available
                r, _, _ = select.select([self.master_fd], [], [], 0.1)
                if r:
                    try:
                        data = os.read(self.master_fd, 4096)
                        if data:
                            output = data.decode('utf-8', errors='replace')
                            self.output_buffer.append(output)
                            self.last_activity = datetime.now()

                            if self._output_callback:
                                await self._output_callback(output)
                    except OSError:
                        break

                # Check if process is still running
                if self.process and self.process.poll() is not None:
                    self.is_running = False
                    break

            except Exception as e:
                log(f"Output read error: {e}", "ERROR")
                await asyncio.sleep(0.1)

    async def send_input(self, text: str) -> bool:
        """Send input to Claude session."""
        if not self.is_running or self.master_fd is None:
            return False

        try:
            os.write(self.master_fd, (text + "\n").encode())
            self.last_activity = datetime.now()
            return True
        except Exception as e:
            log(f"Failed to send input: {e}", "ERROR")
            return False

    async def stop(self):
        """Stop the Claude session."""
        self.is_running = False

        if self._output_task:
            self._output_task.cancel()
            try:
                await self._output_task
            except asyncio.CancelledError:
                pass

        if self.process:
            try:
                os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
                self.process.wait(timeout=5)
            except Exception:
                try:
                    os.killpg(os.getpgid(self.process.pid), signal.SIGKILL)
                except Exception:
                    pass

        if self.master_fd is not None:
            try:
                os.close(self.master_fd)
            except Exception:
                pass

        if self.slave_fd is not None:
            try:
                os.close(self.slave_fd)
            except Exception:
                pass

        log(f"Stopped Claude session {self.session_id}")


class SessionManager:
    """Manages multiple Claude Code sessions."""

    def __init__(self, max_sessions: int = MAX_CONNECTIONS):
        self.sessions: dict[str, ClaudeSession] = {}
        self.max_sessions = max_sessions

    def create_session(self, working_dir: Optional[Path] = None) -> str:
        """Create a new session and return its ID."""
        if len(self.sessions) >= self.max_sessions:
            # Close oldest inactive session
            oldest = min(
                self.sessions.values(),
                key=lambda s: s.last_activity
            )
            asyncio.create_task(oldest.stop())
            del self.sessions[oldest.session_id]

        session_id = secrets.token_hex(8)
        self.sessions[session_id] = ClaudeSession(session_id, working_dir)
        return session_id

    def get_session(self, session_id: str) -> Optional[ClaudeSession]:
        """Get a session by ID."""
        return self.sessions.get(session_id)

    async def stop_session(self, session_id: str):
        """Stop and remove a session."""
        if session_id in self.sessions:
            await self.sessions[session_id].stop()
            del self.sessions[session_id]

    async def stop_all(self):
        """Stop all sessions."""
        for session_id in list(self.sessions.keys()):
            await self.stop_session(session_id)

    def list_sessions(self) -> list[dict]:
        """List all active sessions."""
        return [
            {
                "session_id": s.session_id,
                "created_at": s.created_at.isoformat(),
                "last_activity": s.last_activity.isoformat(),
                "is_running": s.is_running,
                "working_dir": str(s.working_dir)
            }
            for s in self.sessions.values()
        ]


# ═══════════════════════════════════════════════════════════════════════════════
# WEBSOCKET SERVER
# ═══════════════════════════════════════════════════════════════════════════════

class RemoteTerminalBridge:
    """Main WebSocket server for remote Claude Code access."""

    def __init__(self, host: str = DEFAULT_HOST, port: int = DEFAULT_PORT):
        self.host = host
        self.port = port
        self.token_manager = TokenManager()
        self.session_manager = SessionManager()
        self.rate_limiter = RateLimiter()
        self.connected_clients: dict[str, Any] = {}
        self.server = None
        self._running = False

        # IP whitelist (empty = allow all)
        env = load_env()
        whitelist = env.get("REMOTE_BRIDGE_IP_WHITELIST", "")
        self.ip_whitelist = [ip.strip() for ip in whitelist.split(",") if ip.strip()]

    async def handle_client(self, websocket):
        """Handle a single WebSocket client connection."""
        client_id = secrets.token_hex(8)
        client_ip = websocket.remote_address[0] if websocket.remote_address else "unknown"

        log(f"New connection from {client_ip} (client: {client_id})")

        # IP whitelist check
        if self.ip_whitelist and client_ip not in self.ip_whitelist:
            log(f"Rejected connection from non-whitelisted IP: {client_ip}", "WARN")
            await websocket.close(4003, "IP not whitelisted")
            return

        authenticated = False
        session_id = None

        try:
            # Wait for authentication (first message must be auth)
            auth_msg = await asyncio.wait_for(websocket.recv(), timeout=30)
            auth = Message.from_json(auth_msg)

            if auth.type != "auth":
                await websocket.send(Message(
                    type="error",
                    content="First message must be authentication"
                ).to_json())
                await websocket.close(4001, "Authentication required")
                return

            # Validate token
            token = auth.content
            is_valid, msg = self.token_manager.validate_token(token)

            if not is_valid:
                await websocket.send(Message(
                    type="error",
                    content=f"Authentication failed: {msg}"
                ).to_json())
                await websocket.close(4001, "Invalid token")
                return

            authenticated = True
            log(f"Client {client_id} authenticated: {msg}")

            # Create or resume session
            session_id = auth.session_id
            if session_id and self.session_manager.get_session(session_id):
                session = self.session_manager.get_session(session_id)
            else:
                session_id = self.session_manager.create_session()
                session = self.session_manager.get_session(session_id)

            # Store client
            self.connected_clients[client_id] = {
                "websocket": websocket,
                "session_id": session_id,
                "ip": client_ip,
                "connected_at": datetime.now().isoformat()
            }

            # Send success + session info
            await websocket.send(Message(
                type="status",
                content="Connected to Remote Terminal Bridge",
                session_id=session_id,
                metadata={
                    "server_version": "1.0.0",
                    "max_message_size": MAX_MESSAGE_SIZE,
                    "heartbeat_interval": HEARTBEAT_INTERVAL
                }
            ).to_json())

            # Start Claude session with output callback
            async def output_callback(output: str):
                try:
                    await websocket.send(Message(
                        type="output",
                        content=output,
                        session_id=session_id
                    ).to_json())
                except Exception:
                    pass

            if not session.is_running:
                started = await session.start(output_callback)
                if started:
                    await websocket.send(Message(
                        type="status",
                        content="Claude Code session started",
                        session_id=session_id
                    ).to_json())
                else:
                    await websocket.send(Message(
                        type="error",
                        content="Failed to start Claude Code session. Is Claude CLI installed?",
                        session_id=session_id
                    ).to_json())

            # Start heartbeat task
            heartbeat_task = asyncio.create_task(self._heartbeat(websocket))

            # Message loop
            async for raw_msg in websocket:
                # Rate limiting
                if not self.rate_limiter.is_allowed(client_id):
                    await websocket.send(Message(
                        type="error",
                        content="Rate limit exceeded. Please slow down."
                    ).to_json())
                    continue

                # Parse message
                msg = Message.from_json(raw_msg)

                if msg.type == "heartbeat":
                    await websocket.send(Message(type="heartbeat", content="pong").to_json())

                elif msg.type == "message":
                    # Send to Claude session
                    if session and session.is_running:
                        success = await session.send_input(msg.content)
                        if not success:
                            await websocket.send(Message(
                                type="error",
                                content="Failed to send input to Claude session",
                                session_id=session_id
                            ).to_json())
                    else:
                        await websocket.send(Message(
                            type="error",
                            content="Claude session not running",
                            session_id=session_id
                        ).to_json())

                elif msg.type == "command":
                    # Handle special commands
                    await self._handle_command(websocket, msg, session)

                elif msg.type == "status":
                    # Return session status
                    await websocket.send(Message(
                        type="status",
                        content="Session active" if session and session.is_running else "Session inactive",
                        session_id=session_id,
                        metadata={
                            "sessions": self.session_manager.list_sessions(),
                            "connected_clients": len(self.connected_clients)
                        }
                    ).to_json())

            heartbeat_task.cancel()

        except asyncio.TimeoutError:
            log(f"Client {client_id} timed out during authentication", "WARN")
            await websocket.close(4001, "Authentication timeout")
        except ConnectionClosed:
            log(f"Client {client_id} disconnected")
        except Exception as e:
            log(f"Error handling client {client_id}: {e}", "ERROR")
        finally:
            if client_id in self.connected_clients:
                del self.connected_clients[client_id]
            log(f"Client {client_id} cleanup complete")

    async def _heartbeat(self, websocket):
        """Send periodic heartbeats to keep connection alive."""
        while True:
            try:
                await asyncio.sleep(HEARTBEAT_INTERVAL)
                await websocket.send(Message(type="heartbeat", content="ping").to_json())
            except Exception:
                break

    async def _handle_command(self, websocket, msg: Message, session: Optional[ClaudeSession]):
        """Handle special commands."""
        cmd = msg.content.lower().strip()

        if cmd == "restart":
            if session:
                await session.stop()
                async def output_callback(output: str):
                    try:
                        await websocket.send(Message(
                            type="output",
                            content=output,
                            session_id=session.session_id
                        ).to_json())
                    except Exception:
                        pass
                await session.start(output_callback)
                await websocket.send(Message(
                    type="status",
                    content="Session restarted",
                    session_id=session.session_id
                ).to_json())

        elif cmd == "clear":
            if session:
                session.output_buffer.clear()
                await websocket.send(Message(
                    type="status",
                    content="Buffer cleared",
                    session_id=session.session_id
                ).to_json())

        elif cmd == "history":
            if session:
                await websocket.send(Message(
                    type="output",
                    content="\n".join(session.output_buffer[-100:]),
                    session_id=session.session_id,
                    metadata={"is_history": True}
                ).to_json())

        elif cmd == "sessions":
            await websocket.send(Message(
                type="status",
                content="Active sessions",
                metadata={"sessions": self.session_manager.list_sessions()}
            ).to_json())

        elif cmd.startswith("resize"):
            # Handle terminal resize: resize 80x24
            try:
                parts = cmd.split()
                if len(parts) == 2:
                    cols, rows = map(int, parts[1].split("x"))
                    # Could implement terminal resize here if needed
                    await websocket.send(Message(
                        type="status",
                        content=f"Terminal size: {cols}x{rows}"
                    ).to_json())
            except Exception:
                pass

        else:
            await websocket.send(Message(
                type="error",
                content=f"Unknown command: {cmd}"
            ).to_json())

    async def start(self):
        """Start the WebSocket server."""
        if not WEBSOCKETS_AVAILABLE:
            log("Cannot start server: websockets library not installed", "ERROR")
            return False

        self._running = True

        # Save PID
        PID_FILE.write_text(str(os.getpid()))

        log(f"Starting Remote Terminal Bridge on ws://{self.host}:{self.port}")

        try:
            self.server = await ws_serve(
                self.handle_client,
                self.host,
                self.port,
                max_size=MAX_MESSAGE_SIZE,
                ping_interval=HEARTBEAT_INTERVAL,
                ping_timeout=HEARTBEAT_INTERVAL * 2
            )

            # Save state
            STATE_FILE.write_text(json.dumps({
                "status": "running",
                "host": self.host,
                "port": self.port,
                "started_at": datetime.now().isoformat(),
                "pid": os.getpid()
            }, indent=2))

            log(f"Server started successfully")

            # Keep running
            await self.server.wait_closed()

        except Exception as e:
            log(f"Server error: {e}", "ERROR")
            return False
        finally:
            self._running = False
            await self.session_manager.stop_all()
            if PID_FILE.exists():
                PID_FILE.unlink()
            if STATE_FILE.exists():
                state = json.loads(STATE_FILE.read_text())
                state["status"] = "stopped"
                state["stopped_at"] = datetime.now().isoformat()
                STATE_FILE.write_text(json.dumps(state, indent=2))

        return True

    async def stop(self):
        """Stop the server."""
        log("Stopping server...")
        self._running = False

        # Close all clients
        for client_id, data in list(self.connected_clients.items()):
            try:
                await data["websocket"].close(1001, "Server shutting down")
            except Exception:
                pass

        # Stop all sessions
        await self.session_manager.stop_all()

        # Close server
        if self.server:
            self.server.close()
            await self.server.wait_closed()


# ═══════════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════

def cmd_start(args):
    """Start the bridge server."""
    env = load_env()
    host = args.host or env.get("REMOTE_BRIDGE_HOST", DEFAULT_HOST)
    port = args.port or int(env.get("REMOTE_BRIDGE_PORT", DEFAULT_PORT))

    # Check if already running
    if PID_FILE.exists():
        pid = int(PID_FILE.read_text())
        try:
            os.kill(pid, 0)
            print(f"Server already running (PID {pid})")
            return
        except OSError:
            PID_FILE.unlink()

    print(f"Starting Remote Terminal Bridge on ws://{host}:{port}")
    print("Press Ctrl+C to stop")
    print()

    bridge = RemoteTerminalBridge(host, port)

    # Ensure at least one token exists
    tokens = bridge.token_manager.list_tokens()
    if not tokens:
        token = bridge.token_manager.generate_token("auto-generated")
        print(f"Generated access token: {token}")
        print("Save this token - it won't be shown again!")
        print()

    try:
        asyncio.run(bridge.start())
    except KeyboardInterrupt:
        print("\nShutting down...")
        asyncio.run(bridge.stop())


def cmd_stop(args):
    """Stop the bridge server."""
    if not PID_FILE.exists():
        print("Server not running")
        return

    pid = int(PID_FILE.read_text())
    try:
        os.kill(pid, signal.SIGTERM)
        print(f"Sent stop signal to PID {pid}")

        # Wait for shutdown
        for _ in range(10):
            time.sleep(0.5)
            try:
                os.kill(pid, 0)
            except OSError:
                print("Server stopped")
                return

        print("Server did not stop gracefully, sending SIGKILL")
        os.kill(pid, signal.SIGKILL)

    except OSError:
        print("Server not running (stale PID file)")
        PID_FILE.unlink()


def cmd_status(args):
    """Check server status."""
    if STATE_FILE.exists():
        state = json.loads(STATE_FILE.read_text())
        print(f"Status: {state.get('status', 'unknown')}")
        print(f"Host: {state.get('host', 'N/A')}")
        print(f"Port: {state.get('port', 'N/A')}")
        print(f"Started: {state.get('started_at', 'N/A')}")
        print(f"PID: {state.get('pid', 'N/A')}")

        # Check if actually running
        if PID_FILE.exists():
            pid = int(PID_FILE.read_text())
            try:
                os.kill(pid, 0)
                print("\nProcess is running")
            except OSError:
                print("\nProcess is NOT running (stale state)")
    else:
        print("Server has not been started")

    # Show tokens
    tm = TokenManager()
    tokens = tm.list_tokens()
    if tokens:
        print(f"\nActive tokens: {len(tokens)}")
        for t in tokens:
            print(f"  - {t['name']} ({t['hash_prefix']}) - used {t['use_count']}x")


def cmd_token(args):
    """Generate or manage tokens."""
    tm = TokenManager()

    if args.action == "new" or args.action is None:
        name = args.name or f"token-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        hours = args.hours or TOKEN_EXPIRY_HOURS
        token = tm.generate_token(name, hours)
        print(f"Generated new token: {token}")
        print(f"Name: {name}")
        print(f"Expires: {hours} hours")
        print()
        print("Use this token to authenticate WebSocket connections.")
        print("Save it securely - it cannot be retrieved later!")

    elif args.action == "list":
        tokens = tm.list_tokens()
        if not tokens:
            print("No tokens")
        else:
            print(f"Tokens ({len(tokens)}):")
            for t in tokens:
                print(f"  - {t['name']} ({t['hash_prefix']})")
                print(f"    Created: {t['created']}")
                print(f"    Expires: {t['expires']}")
                print(f"    Used: {t['use_count']} times")
                if t['last_used']:
                    print(f"    Last used: {t['last_used']}")
                print()

    elif args.action == "revoke":
        count = tm.revoke_all()
        print(f"Revoked {count} tokens")


def cmd_connect(args):
    """Test connection to the server."""
    if not WEBSOCKETS_AVAILABLE:
        print("Cannot connect: websockets library not installed")
        print("Run: pip install websockets")
        return

    env = load_env()
    host = args.host or env.get("REMOTE_BRIDGE_HOST", "localhost")
    port = args.port or int(env.get("REMOTE_BRIDGE_PORT", DEFAULT_PORT))
    token = args.token

    if not token:
        print("Token required. Generate one with: python remote_terminal_bridge.py token new")
        return

    async def test_connection():
        uri = f"ws://{host}:{port}"
        print(f"Connecting to {uri}...")

        try:
            async with websockets.connect(uri) as ws:
                # Authenticate
                await ws.send(Message(type="auth", content=token).to_json())

                # Wait for response
                response = await asyncio.wait_for(ws.recv(), timeout=10)
                msg = Message.from_json(response)

                if msg.type == "status":
                    print(f"Connected! Session: {msg.session_id}")
                    print(f"Server version: {msg.metadata.get('server_version', 'unknown')}")

                    # Interactive mode
                    if args.interactive:
                        print("\nEntering interactive mode. Type 'quit' to exit.")
                        print("=" * 50)

                        async def receive_messages():
                            async for raw in ws:
                                m = Message.from_json(raw)
                                if m.type == "output":
                                    print(m.content, end="", flush=True)
                                elif m.type == "status":
                                    print(f"\n[STATUS] {m.content}")
                                elif m.type == "error":
                                    print(f"\n[ERROR] {m.content}")

                        receive_task = asyncio.create_task(receive_messages())

                        try:
                            while True:
                                user_input = await asyncio.get_event_loop().run_in_executor(
                                    None, input
                                )
                                if user_input.lower() == "quit":
                                    break
                                await ws.send(Message(
                                    type="message",
                                    content=user_input,
                                    session_id=msg.session_id
                                ).to_json())
                        except EOFError:
                            pass
                        finally:
                            receive_task.cancel()
                    else:
                        print("Connection test successful!")
                else:
                    print(f"Error: {msg.content}")

        except ConnectionRefusedError:
            print(f"Connection refused. Is the server running?")
        except asyncio.TimeoutError:
            print("Connection timed out")
        except Exception as e:
            print(f"Connection error: {e}")

    asyncio.run(test_connection())


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="TinyPM Remote Terminal Bridge - Chat with Claude Code from anywhere",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s start                    Start the bridge server
  %(prog)s start --port 9000        Start on custom port
  %(prog)s stop                     Stop the server
  %(prog)s status                   Check server status
  %(prog)s token new --name "web"   Generate new access token
  %(prog)s token list               List all tokens
  %(prog)s connect --token ABC123   Test connection
  %(prog)s connect -t ABC123 -i     Interactive test session
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="Command")

    # Start command
    start_parser = subparsers.add_parser("start", help="Start the bridge server")
    start_parser.add_argument("--host", type=str, help=f"Host to bind (default: {DEFAULT_HOST})")
    start_parser.add_argument("--port", "-p", type=int, help=f"Port to bind (default: {DEFAULT_PORT})")

    # Stop command
    stop_parser = subparsers.add_parser("stop", help="Stop the bridge server")

    # Status command
    status_parser = subparsers.add_parser("status", help="Check server status")

    # Token command
    token_parser = subparsers.add_parser("token", help="Manage access tokens")
    token_parser.add_argument("action", nargs="?", choices=["new", "list", "revoke"],
                             default="new", help="Token action")
    token_parser.add_argument("--name", "-n", type=str, help="Token name")
    token_parser.add_argument("--hours", type=int, help=f"Token expiry hours (default: {TOKEN_EXPIRY_HOURS})")

    # Connect command
    connect_parser = subparsers.add_parser("connect", help="Test connection to server")
    connect_parser.add_argument("--host", type=str, help="Server host (default: localhost)")
    connect_parser.add_argument("--port", "-p", type=int, help=f"Server port (default: {DEFAULT_PORT})")
    connect_parser.add_argument("--token", "-t", type=str, help="Access token")
    connect_parser.add_argument("--interactive", "-i", action="store_true", help="Interactive mode")

    args = parser.parse_args()

    if args.command == "start":
        cmd_start(args)
    elif args.command == "stop":
        cmd_stop(args)
    elif args.command == "status":
        cmd_status(args)
    elif args.command == "token":
        cmd_token(args)
    elif args.command == "connect":
        cmd_connect(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
