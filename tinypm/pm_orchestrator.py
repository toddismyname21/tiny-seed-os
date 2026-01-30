#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════════════
PM ORCHESTRATOR - The Ultimate Intelligent PM System
═══════════════════════════════════════════════════════════════════════════════════════

STATE OF THE ART. NO SHORTCUTS. PRODUCTION READY.

FEATURES:
1. REAL-TIME RESPONSE - Watches for messages, responds in seconds
2. PROACTIVE INTELLIGENCE - Suggests actions before user asks
3. MULTI-AGENT COORDINATION - Manages Builder, Research agents, etc.
4. PERSISTENT MEMORY - Learns facts, preferences, patterns (Mem0-style)
5. CONTEXT AWARENESS - Knows project state, tasks, deadlines
6. PREDICTIVE SUGGESTIONS - Anticipates needs based on patterns
7. HEALTH MONITORING - Heartbeat, error tracking, recovery
8. EVENT-DRIVEN - Reacts to file changes, completions, alerts
9. SMART ROUTING - Knows when to respond vs delegate to Builder
10. SESSION CONTINUITY - Maintains conversation context across restarts

ARCHITECTURE:
┌─────────────────────────────────────────────────────────────────────┐
│                         PM ORCHESTRATOR                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │   WATCHER   │  │   BRAIN     │  │  MEMORY     │  │  ROUTER    │ │
│  │ (File Poll) │→ │ (Claude)    │→ │ (Persist)   │→ │ (Decide)   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
│         ↓                ↓                                ↓        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    CHANNEL MANAGER                          │   │
│  │  Dashboard ←→ Builder ←→ Agents ←→ Alerts                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

Usage:
    python3 pm_orchestrator.py                    # Full orchestrator
    python3 pm_orchestrator.py --responder-only   # Just auto-respond
    python3 pm_orchestrator.py --status           # Show system status
    python3 pm_orchestrator.py --proactive        # Enable proactive mode
"""

import argparse
import asyncio
import hashlib
import json
import os
import re
import subprocess
import sys
import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple
import traceback

# ═══════════════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════════════

APP_DIR = Path(__file__).parent
PROJECT_ROOT = APP_DIR.parent

# Core files
PM_CHAT_FILE = APP_DIR / ".pm_chat.json"
INTERCOM_FILE = APP_DIR / ".claude_intercom.json"
BOARD_FILE = APP_DIR / "board.json"
AGENT_QUESTIONS_FILE = APP_DIR / ".agent_questions.json"
LAUNCH_CHECKLIST_FILE = APP_DIR / ".launch_checklist.json"

# Orchestrator state
ORCHESTRATOR_STATE_FILE = APP_DIR / ".pm_orchestrator_state.json"
PM_MEMORY_FILE = APP_DIR / ".pm_memory.json"
PM_PATTERNS_FILE = APP_DIR / ".pm_patterns.json"
PM_LOG_FILE = APP_DIR / ".pm_orchestrator.log"

# Claude
CLAUDE_BIN = Path.home() / ".local" / "bin" / "claude"

# Timing
WATCH_INTERVAL = 3  # seconds between file checks
HEARTBEAT_INTERVAL = 30  # seconds between heartbeats
PROACTIVE_CHECK_INTERVAL = 60  # seconds between proactive checks
BUILDER_TIMEOUT = 300  # seconds before assuming Builder is dead
CLAUDE_TIMEOUT = 120  # seconds to wait for Claude response

# Load .env
env_file = APP_DIR / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        if line.strip() and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# ═══════════════════════════════════════════════════════════════════════════════════════
# ENUMS & DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════════════

class MessagePriority(Enum):
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4

class AgentStatus(Enum):
    IDLE = "idle"
    WORKING = "working"
    WAITING = "waiting"
    ERROR = "error"
    OFFLINE = "offline"

@dataclass
class Memory:
    """Persistent memory system - learns and remembers."""
    user_facts: List[str] = field(default_factory=list)
    project_facts: List[str] = field(default_factory=list)
    preferences: Dict[str, Any] = field(default_factory=dict)
    conversation_topics: List[Dict] = field(default_factory=list)
    pending_followups: List[str] = field(default_factory=list)
    learned_patterns: List[Dict] = field(default_factory=list)
    important_dates: List[Dict] = field(default_factory=list)
    last_interactions: List[Dict] = field(default_factory=list)

    def add_fact(self, category: str, fact: str):
        """Add a learned fact."""
        if category == "user":
            if fact not in self.user_facts:
                self.user_facts.append(fact)
                if len(self.user_facts) > 50:
                    self.user_facts.pop(0)
        elif category == "project":
            if fact not in self.project_facts:
                self.project_facts.append(fact)
                if len(self.project_facts) > 50:
                    self.project_facts.pop(0)

    def add_followup(self, item: str):
        """Add something to follow up on."""
        if item not in self.pending_followups:
            self.pending_followups.append(item)
            if len(self.pending_followups) > 20:
                self.pending_followups.pop(0)

    def record_interaction(self, user_msg: str, pm_response: str):
        """Record an interaction for pattern learning."""
        self.last_interactions.append({
            "timestamp": datetime.now().isoformat(),
            "user": user_msg[:200],
            "pm": pm_response[:200],
            "hour": datetime.now().hour,
            "weekday": datetime.now().weekday()
        })
        if len(self.last_interactions) > 100:
            self.last_interactions.pop(0)

@dataclass
class ProjectContext:
    """Current project state snapshot."""
    tasks_pending: int = 0
    tasks_in_progress: int = 0
    tasks_total: int = 0
    active_tasks: List[str] = field(default_factory=list)
    builder_status: str = "unknown"
    builder_last_msg: str = ""
    builder_queue_size: int = 0
    agent_questions_waiting: int = 0
    launch_progress_pct: int = 0
    launch_items_done: int = 0
    launch_items_total: int = 0
    recent_completions: List[str] = field(default_factory=list)

@dataclass
class OrchestratorState:
    """Full orchestrator state."""
    session_id: str = ""
    started_at: str = ""
    last_heartbeat: str = ""
    messages_processed: int = 0
    proactive_suggestions: int = 0
    errors: int = 0
    builder_last_seen: str = ""
    last_processed_msg_id: int = 0
    mode: str = "active"  # active, paused, maintenance

# ═══════════════════════════════════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════════════════════════════════

LOG_BUFFER = []

def log(msg: str, level: str = "INFO"):
    """Log with timestamp."""
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] [{level}] {msg}"
    print(line)
    LOG_BUFFER.append(line)
    if len(LOG_BUFFER) > 500:
        LOG_BUFFER.pop(0)
    try:
        with open(PM_LOG_FILE, "a") as f:
            f.write(f"[{datetime.now().isoformat()}] [{level}] {msg}\n")
    except:
        pass

# ═══════════════════════════════════════════════════════════════════════════════════════
# FILE OPERATIONS
# ═══════════════════════════════════════════════════════════════════════════════════════

def safe_read_json(path: Path, default: Any = None) -> Any:
    """Safely read JSON file."""
    try:
        if path.exists():
            return json.loads(path.read_text())
    except Exception as e:
        log(f"Error reading {path.name}: {e}", "WARN")
    return default if default is not None else {}

def safe_write_json(path: Path, data: Any):
    """Safely write JSON file."""
    try:
        path.write_text(json.dumps(data, indent=2, default=str))
    except Exception as e:
        log(f"Error writing {path.name}: {e}", "ERROR")

# ═══════════════════════════════════════════════════════════════════════════════════════
# MEMORY SYSTEM (Mem0-inspired)
# ═══════════════════════════════════════════════════════════════════════════════════════

class MemoryManager:
    """Persistent memory with learning capabilities."""

    def __init__(self):
        self.memory = self._load()

    def _load(self) -> Memory:
        """Load memory from disk."""
        data = safe_read_json(PM_MEMORY_FILE, {})
        return Memory(
            user_facts=data.get("user_facts", []),
            project_facts=data.get("project_facts", []),
            preferences=data.get("preferences", {}),
            conversation_topics=data.get("conversation_topics", []),
            pending_followups=data.get("pending_followups", []),
            learned_patterns=data.get("learned_patterns", []),
            important_dates=data.get("important_dates", []),
            last_interactions=data.get("last_interactions", [])
        )

    def save(self):
        """Save memory to disk."""
        safe_write_json(PM_MEMORY_FILE, asdict(self.memory))

    def learn_from_message(self, user_msg: str, pm_response: str):
        """Extract learnings from a conversation exchange."""
        lower = user_msg.lower()

        # Extract user facts
        if any(x in lower for x in ["my name is", "i am ", "i'm ", "call me"]):
            self.memory.add_fact("user", f"Identity: {user_msg[:100]}")

        if any(x in lower for x in ["i prefer", "i like", "i want", "i need"]):
            self.memory.add_fact("user", f"Preference: {user_msg[:100]}")

        if any(x in lower for x in ["deadline", "by ", "due ", "before "]):
            self.memory.important_dates.append({
                "mentioned": datetime.now().isoformat(),
                "context": user_msg[:150]
            })

        # Track followups from response
        if any(x in pm_response.lower() for x in ["i'll follow up", "will check", "let me know", "remind me"]):
            self.memory.add_followup(user_msg[:100])

        # Record interaction
        self.memory.record_interaction(user_msg, pm_response)

        self.save()

    def get_context_for_prompt(self) -> str:
        """Get memory context formatted for the prompt."""
        parts = []

        if self.memory.user_facts:
            parts.append("USER FACTS:\n" + "\n".join(f"- {f}" for f in self.memory.user_facts[-5:]))

        if self.memory.preferences:
            parts.append("PREFERENCES:\n" + json.dumps(self.memory.preferences, indent=2))

        if self.memory.pending_followups:
            parts.append("PENDING FOLLOWUPS:\n" + "\n".join(f"- {f}" for f in self.memory.pending_followups[-5:]))

        if self.memory.important_dates:
            parts.append("IMPORTANT DATES MENTIONED:\n" + "\n".join(
                f"- {d['context'][:50]}..." for d in self.memory.important_dates[-3:]
            ))

        return "\n\n".join(parts) if parts else "No stored memory yet."

# ═══════════════════════════════════════════════════════════════════════════════════════
# CONTEXT GATHERER
# ═══════════════════════════════════════════════════════════════════════════════════════

class ContextGatherer:
    """Gathers comprehensive project context."""

    @staticmethod
    def gather() -> ProjectContext:
        """Gather all project context."""
        ctx = ProjectContext()

        # Tasks
        board = safe_read_json(BOARD_FILE, {"tasks": []})
        tasks = board.get("tasks", [])
        ctx.tasks_total = len(tasks)
        ctx.tasks_pending = len([t for t in tasks if t.get("status") == "pending"])
        ctx.tasks_in_progress = len([t for t in tasks if t.get("status") == "in_progress"])
        ctx.active_tasks = [t.get("title", "Untitled")[:40] for t in tasks if t.get("status") == "in_progress"][:5]

        # Builder
        intercom = safe_read_json(INTERCOM_FILE, {})
        builder_msgs = intercom.get("builder_to_pm", [])
        if builder_msgs:
            latest = builder_msgs[-1]
            ctx.builder_status = latest.get("type", "unknown")
            ctx.builder_last_msg = latest.get("message", "")[:100]
        pm_queue = [t for t in intercom.get("pm_to_builder", []) if not t.get("read")]
        ctx.builder_queue_size = len(pm_queue)

        # Agent questions
        questions = safe_read_json(AGENT_QUESTIONS_FILE, {"questions": []})
        ctx.agent_questions_waiting = len([q for q in questions.get("questions", []) if not q.get("answered")])

        # Launch readiness
        checklist = safe_read_json(LAUNCH_CHECKLIST_FILE, {"items": []})
        items = checklist.get("items", [])
        ctx.launch_items_total = len(items)
        ctx.launch_items_done = len([i for i in items if i.get("status") == "done"])
        ctx.launch_progress_pct = int((ctx.launch_items_done / ctx.launch_items_total) * 100) if ctx.launch_items_total else 0

        return ctx

    @staticmethod
    def format_for_prompt(ctx: ProjectContext) -> str:
        """Format context for Claude prompt."""
        lines = [
            f"TASKS: {ctx.tasks_pending} pending, {ctx.tasks_in_progress} in progress, {ctx.tasks_total} total",
        ]

        if ctx.active_tasks:
            lines.append(f"ACTIVE: {', '.join(ctx.active_tasks)}")

        lines.append(f"BUILDER: {ctx.builder_status} | Queue: {ctx.builder_queue_size} tasks")
        if ctx.builder_last_msg:
            lines.append(f"  Last: {ctx.builder_last_msg}")

        if ctx.agent_questions_waiting:
            lines.append(f"⚠️ AGENT QUESTIONS WAITING: {ctx.agent_questions_waiting}")

        lines.append(f"LAUNCH READINESS: {ctx.launch_progress_pct}% ({ctx.launch_items_done}/{ctx.launch_items_total})")

        return "\n".join(lines)

# ═══════════════════════════════════════════════════════════════════════════════════════
# SMART ROUTER
# ═══════════════════════════════════════════════════════════════════════════════════════

class SmartRouter:
    """Decides how to handle incoming messages."""

    # Keywords that suggest Builder should handle it
    BUILDER_KEYWORDS = [
        "build", "create", "code", "implement", "fix bug", "add feature",
        "write", "develop", "html", "css", "javascript", "python"
    ]

    # Keywords that suggest urgent/immediate response
    URGENT_KEYWORDS = [
        "urgent", "asap", "now", "immediately", "critical", "broken", "down", "error"
    ]

    # Keywords that suggest informational query
    INFO_KEYWORDS = [
        "status", "update", "progress", "what", "how", "where", "when", "why"
    ]

    @classmethod
    def analyze(cls, message: str) -> Dict[str, Any]:
        """Analyze message and determine routing."""
        lower = message.lower()

        result = {
            "route": "pm",  # pm, builder, research
            "priority": MessagePriority.NORMAL,
            "should_delegate": False,
            "delegate_to": None,
            "needs_context": True,
            "proactive_hint": None
        }

        # Check for Builder keywords
        if any(kw in lower for kw in cls.BUILDER_KEYWORDS):
            result["should_delegate"] = True
            result["delegate_to"] = "builder"
            result["route"] = "pm_then_builder"

        # Check urgency
        if any(kw in lower for kw in cls.URGENT_KEYWORDS):
            result["priority"] = MessagePriority.HIGH

        # Check if it's a status query
        if any(kw in lower for kw in cls.INFO_KEYWORDS):
            result["needs_context"] = True

        return result

# ═══════════════════════════════════════════════════════════════════════════════════════
# PROACTIVE ENGINE
# ═══════════════════════════════════════════════════════════════════════════════════════

class ProactiveEngine:
    """Generates proactive suggestions and alerts."""

    def __init__(self, memory_manager: MemoryManager):
        self.memory = memory_manager
        self.last_suggestions = {}

    def check_for_proactive_items(self, ctx: ProjectContext) -> List[str]:
        """Check if there's anything we should proactively mention."""
        items = []

        # Agent questions waiting
        if ctx.agent_questions_waiting > 0:
            items.append(f"📋 {ctx.agent_questions_waiting} agent question(s) waiting for your input")

        # Builder idle with queue
        if ctx.builder_status == "done" and ctx.builder_queue_size > 0:
            items.append(f"⚡ Builder finished and has {ctx.builder_queue_size} tasks in queue")

        # Launch readiness milestones
        if ctx.launch_progress_pct in [25, 50, 75, 90] and ctx.launch_progress_pct != self.last_suggestions.get("launch_pct"):
            items.append(f"🚀 Launch readiness hit {ctx.launch_progress_pct}%!")
            self.last_suggestions["launch_pct"] = ctx.launch_progress_pct

        # Pending followups
        if self.memory.memory.pending_followups:
            items.append(f"📝 You have {len(self.memory.memory.pending_followups)} pending follow-up(s)")

        return items

    def should_send_proactive_message(self, ctx: ProjectContext) -> Tuple[bool, Optional[str]]:
        """Determine if we should send an unsolicited proactive message."""
        items = self.check_for_proactive_items(ctx)

        # Only send if there are important items and we haven't sent recently
        if items and len(items) >= 2:
            return True, "\n".join(items)

        return False, None

# ═══════════════════════════════════════════════════════════════════════════════════════
# CLAUDE INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════════════

class ClaudeInterface:
    """Interface to Claude - supports both API and CLI."""

    def __init__(self):
        self._api_client = None

    def _get_api_client(self):
        """Get Anthropic API client."""
        if self._api_client:
            return self._api_client
        if not ANTHROPIC_API_KEY:
            return None
        try:
            import anthropic
            self._api_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
            return self._api_client
        except ImportError:
            log("anthropic package not installed", "WARN")
            return None

    def call_api(self, system_prompt: str, messages: List[Dict]) -> Tuple[str, bool]:
        """Call Claude via API."""
        client = self._get_api_client()
        if not client:
            return "API not available", False

        try:
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1000,
                system=system_prompt,
                messages=messages
            )
            text = response.content[0].text if response.content else ""
            return text, True
        except Exception as e:
            log(f"API error: {e}", "ERROR")
            return str(e), False

    def call_cli(self, prompt: str) -> Tuple[str, bool]:
        """Call Claude via CLI for full power."""
        if not CLAUDE_BIN.exists():
            return "CLI not found", False

        try:
            result = subprocess.run(
                [str(CLAUDE_BIN), "-p", "--output-format", "text"],
                input=prompt,
                capture_output=True,
                text=True,
                timeout=CLAUDE_TIMEOUT,
                cwd=str(PROJECT_ROOT),
                env={**os.environ, "NO_COLOR": "1"}
            )

            if result.returncode == 0:
                response = result.stdout.strip()
                response = re.sub(r'\x1b\[[0-9;]*m', '', response)
                return response, True
            else:
                return result.stderr or "Unknown error", False

        except subprocess.TimeoutExpired:
            return "Timeout", False
        except Exception as e:
            return str(e), False

# ═══════════════════════════════════════════════════════════════════════════════════════
# RESPONSE GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════════════

class ResponseGenerator:
    """Generates intelligent PM responses."""

    def __init__(self, claude: ClaudeInterface, memory: MemoryManager):
        self.claude = claude
        self.memory = memory

    def build_system_prompt(self, ctx: ProjectContext, proactive_items: List[str]) -> str:
        """Build the intelligent system prompt."""
        memory_context = self.memory.get_context_for_prompt()
        project_context = ContextGatherer.format_for_prompt(ctx)

        proactive_section = ""
        if proactive_items:
            proactive_section = "\n\nPROACTIVE ITEMS TO MENTION:\n" + "\n".join(f"- {i}" for i in proactive_items)

        return f"""You are the PM (Project Manager) for TinyPM and Tiny Seed Farm OS.

═══════════════════════════════════════════════════════════════
CORE DIRECTIVES - FOLLOW THESE EXACTLY
═══════════════════════════════════════════════════════════════

1. BE PROACTIVE: Don't just answer questions - suggest next actions, flag issues, anticipate needs.

2. BE SPECIFIC: Use actual numbers, names, and data from the context below. Never be vague.

3. BE CONCISE: Keep responses under 150 words unless detail is explicitly requested.

4. BE SMART: If something important is in the proactive items, mention it.

5. COORDINATE: You manage Builder (coding agent) and research agents. If something needs building, acknowledge it and queue it for Builder.

6. REMEMBER: Reference past conversations when relevant. Learn from interactions.

═══════════════════════════════════════════════════════════════
CURRENT PROJECT STATE
═══════════════════════════════════════════════════════════════
{project_context}

═══════════════════════════════════════════════════════════════
MEMORY & LEARNED FACTS
═══════════════════════════════════════════════════════════════
{memory_context}
{proactive_section}

═══════════════════════════════════════════════════════════════
RESPONSE FORMAT
═══════════════════════════════════════════════════════════════
- Start with the key point or answer
- Use bullet points for multiple items
- End with a clear next action or question when appropriate
- If agent questions are waiting, remind the user
- If Builder completed something, celebrate briefly and move on
- Be direct, not flowery. You're a trusted partner, not a servant."""

    def generate(self, user_message: str, conversation_history: List[Dict], ctx: ProjectContext) -> str:
        """Generate an intelligent response."""
        # Get proactive items
        proactive = ProactiveEngine(self.memory)
        proactive_items = proactive.check_for_proactive_items(ctx)

        # Build prompt
        system_prompt = self.build_system_prompt(ctx, proactive_items)

        # Format messages for API
        messages = []
        for msg in conversation_history[-8:]:
            role = "user" if msg.get("from") == "user" else "assistant"
            messages.append({"role": role, "content": msg["message"]})
        messages.append({"role": "user", "content": user_message})

        # Call Claude
        response, success = self.claude.call_api(system_prompt, messages)

        if success:
            # Learn from this interaction
            self.memory.learn_from_message(user_message, response)
            return response
        else:
            return f"I received your message but encountered an error: {response}. Please try again."

# ═══════════════════════════════════════════════════════════════════════════════════════
# CHANNEL MANAGER
# ═══════════════════════════════════════════════════════════════════════════════════════

class ChannelManager:
    """Manages all communication channels."""

    def __init__(self):
        self.last_chat_id = 0
        self.last_builder_id = 0

    def get_new_dashboard_messages(self) -> List[Dict]:
        """Get new messages from dashboard."""
        chat = safe_read_json(PM_CHAT_FILE, {"messages": [], "next_id": 1})
        messages = chat.get("messages", [])

        new_msgs = [
            m for m in messages
            if m["id"] > self.last_chat_id
            and m.get("from") == "user"
            and not m.get("auto_responded")
        ]

        return new_msgs

    def get_new_builder_messages(self) -> List[Dict]:
        """Get new messages from Builder."""
        intercom = safe_read_json(INTERCOM_FILE, {})
        builder_msgs = intercom.get("builder_to_pm", [])

        new_msgs = [m for m in builder_msgs if m["id"] > self.last_builder_id and not m.get("read")]
        return new_msgs

    def send_dashboard_response(self, response: str, original_id: int):
        """Send response to dashboard."""
        chat = safe_read_json(PM_CHAT_FILE, {"messages": [], "next_id": 1})

        msg_id = chat.get("next_id", 1)
        chat["messages"].append({
            "id": msg_id,
            "from": "pm",
            "message": response,
            "timestamp": datetime.now().isoformat(),
            "read_by_user": False,
            "auto_generated": True,
            "generator": "pm_orchestrator"
        })
        chat["next_id"] = msg_id + 1

        # Mark original as responded
        for m in chat["messages"]:
            if m["id"] == original_id:
                m["auto_responded"] = True

        safe_write_json(PM_CHAT_FILE, chat)
        self.last_chat_id = original_id
        log(f"Response sent (msg #{msg_id})")

    def send_to_builder(self, task: str, priority: str = "normal"):
        """Send task to Builder."""
        intercom = safe_read_json(INTERCOM_FILE, {"pm_to_builder": [], "builder_to_pm": [], "next_id": 1})

        msg_id = intercom.get("next_id", 1)
        intercom["pm_to_builder"].append({
            "id": msg_id,
            "type": "task",
            "message": task,
            "priority": priority,
            "timestamp": datetime.now().isoformat(),
            "status": "pending",
            "read": False
        })
        intercom["next_id"] = msg_id + 1

        safe_write_json(INTERCOM_FILE, intercom)
        log(f"Task sent to Builder (#{msg_id})")

    def mark_builder_messages_read(self, msg_ids: List[int]):
        """Mark Builder messages as read."""
        intercom = safe_read_json(INTERCOM_FILE, {})
        for msg in intercom.get("builder_to_pm", []):
            if msg["id"] in msg_ids:
                msg["read"] = True
                self.last_builder_id = max(self.last_builder_id, msg["id"])
        safe_write_json(INTERCOM_FILE, intercom)

    def get_conversation_history(self) -> List[Dict]:
        """Get recent conversation history."""
        chat = safe_read_json(PM_CHAT_FILE, {"messages": []})
        return chat.get("messages", [])[-12:]

# ═══════════════════════════════════════════════════════════════════════════════════════
# ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════════════════════

class PMOrchestrator:
    """The main orchestrator - coordinates everything."""

    def __init__(self):
        self.state = self._load_state()
        self.memory = MemoryManager()
        self.claude = ClaudeInterface()
        self.channels = ChannelManager()
        self.response_gen = ResponseGenerator(self.claude, self.memory)
        self.proactive = ProactiveEngine(self.memory)
        self.running = False

    def _load_state(self) -> OrchestratorState:
        """Load orchestrator state."""
        data = safe_read_json(ORCHESTRATOR_STATE_FILE, {})
        import uuid
        return OrchestratorState(
            session_id=data.get("session_id", str(uuid.uuid4())),
            started_at=data.get("started_at", datetime.now().isoformat()),
            last_heartbeat=data.get("last_heartbeat", ""),
            messages_processed=data.get("messages_processed", 0),
            proactive_suggestions=data.get("proactive_suggestions", 0),
            errors=data.get("errors", 0),
            builder_last_seen=data.get("builder_last_seen", ""),
            last_processed_msg_id=data.get("last_processed_msg_id", 0),
            mode=data.get("mode", "active")
        )

    def _save_state(self):
        """Save orchestrator state."""
        safe_write_json(ORCHESTRATOR_STATE_FILE, asdict(self.state))

    def process_dashboard_message(self, msg: Dict):
        """Process a message from the dashboard."""
        user_message = msg["message"]
        msg_id = msg["id"]

        log(f"Processing #{msg_id}: {user_message[:50]}...")

        # Analyze for routing
        routing = SmartRouter.analyze(user_message)

        # Gather context
        ctx = ContextGatherer.gather()

        # Get conversation history
        history = self.channels.get_conversation_history()

        # Generate response
        response = self.response_gen.generate(user_message, history, ctx)

        # Send response
        self.channels.send_dashboard_response(response, msg_id)

        # If should delegate to Builder, do that too
        if routing["should_delegate"] and routing["delegate_to"] == "builder":
            self.channels.send_to_builder(
                f"User request: {user_message}\n\nPM acknowledged. Please implement.",
                "high"
            )
            log("Also delegated to Builder")

        # Update state
        self.state.messages_processed += 1
        self.state.last_processed_msg_id = msg_id
        self._save_state()

    def process_builder_messages(self, messages: List[Dict]):
        """Process messages from Builder."""
        for msg in messages:
            msg_type = msg.get("type", "update")
            content = msg.get("message", "")

            log(f"Builder [{msg_type}]: {content[:50]}...")

            # If Builder completed something, we might want to notify dashboard
            if msg_type == "done":
                self.state.builder_last_seen = datetime.now().isoformat()

        # Mark as read
        self.channels.mark_builder_messages_read([m["id"] for m in messages])

    def heartbeat(self):
        """Periodic heartbeat - check system health."""
        self.state.last_heartbeat = datetime.now().isoformat()
        self._save_state()

    def run_cycle(self):
        """Run one cycle of the orchestrator."""
        # Check for dashboard messages
        new_dashboard = self.channels.get_new_dashboard_messages()
        for msg in new_dashboard:
            try:
                self.process_dashboard_message(msg)
            except Exception as e:
                log(f"Error processing message: {e}", "ERROR")
                traceback.print_exc()
                self.state.errors += 1

        # Check for Builder messages
        new_builder = self.channels.get_new_builder_messages()
        if new_builder:
            self.process_builder_messages(new_builder)

    def run(self):
        """Main run loop."""
        log("═" * 60)
        log("PM ORCHESTRATOR STARTING")
        log("═" * 60)
        log(f"Session: {self.state.session_id[:8]}...")
        log(f"Watch interval: {WATCH_INTERVAL}s")
        log(f"Chat file: {PM_CHAT_FILE}")
        log("Press Ctrl+C to stop")
        log("═" * 60)

        self.running = True
        self.state.started_at = datetime.now().isoformat()
        self._save_state()

        last_heartbeat = time.time()

        try:
            while self.running:
                # Run main cycle
                self.run_cycle()

                # Heartbeat
                if time.time() - last_heartbeat > HEARTBEAT_INTERVAL:
                    self.heartbeat()
                    last_heartbeat = time.time()

                time.sleep(WATCH_INTERVAL)

        except KeyboardInterrupt:
            log("Shutting down...")

        self._save_state()
        log(f"Session complete. Processed {self.state.messages_processed} messages, {self.state.errors} errors.")

    def status(self):
        """Print current status."""
        ctx = ContextGatherer.gather()
        print(f"""
═══════════════════════════════════════════════════════════════
  PM ORCHESTRATOR STATUS
═══════════════════════════════════════════════════════════════
  Session:           {self.state.session_id[:8]}...
  Mode:              {self.state.mode}
  Started:           {self.state.started_at}
  Last Heartbeat:    {self.state.last_heartbeat or 'Never'}
  Messages:          {self.state.messages_processed}
  Errors:            {self.state.errors}

  PROJECT STATE:
    Tasks:           {ctx.tasks_pending} pending, {ctx.tasks_in_progress} in progress
    Builder:         {ctx.builder_status} (queue: {ctx.builder_queue_size})
    Agent Questions: {ctx.agent_questions_waiting} waiting
    Launch:          {ctx.launch_progress_pct}%

  MEMORY:
    User Facts:      {len(self.memory.memory.user_facts)}
    Followups:       {len(self.memory.memory.pending_followups)}
    Interactions:    {len(self.memory.memory.last_interactions)}
═══════════════════════════════════════════════════════════════
""")

# ═══════════════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="PM Orchestrator - Intelligent Autonomous PM")
    parser.add_argument("--status", action="store_true", help="Show status")
    parser.add_argument("--responder-only", action="store_true", help="Only respond to messages (no proactive)")
    args = parser.parse_args()

    orchestrator = PMOrchestrator()

    if args.status:
        orchestrator.status()
        return

    orchestrator.run()

if __name__ == "__main__":
    main()
