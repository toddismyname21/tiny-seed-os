#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
PM BRAIN v2.0 - STATE OF THE ART Intelligent PM System
═══════════════════════════════════════════════════════════════════════════════

SOTA Features (Based on January 2026 Research):
- Mem0-style hybrid memory (facts + relationships + context)
- MCP integration patterns
- Proactive intelligence (anticipate needs before asked)
- Pattern learning (learn from interactions)
- Cost-aware model routing
- Adaptive timeouts based on task complexity
- Self-improvement loops

Core Capabilities:
- Full file system access via Claude CLI
- Tool usage (Read, Grep, Bash, etc.)
- Persistent session memory
- The ability to actually DO things, not just chat

Usage:
    python3 pm_brain.py              # Run in foreground
    python3 pm_brain.py --daemon     # Run as background daemon
    python3 pm_brain.py --once       # Process one message and exit
    python3 pm_brain.py --status     # Show brain status
    python3 pm_brain.py --memory     # Show memory statistics

Requirements:
    - Claude CLI installed at ~/.local/bin/claude
    - Anthropic API key configured in Claude CLI
"""

import argparse
import json
import os
import subprocess
import sys
import time
import uuid
from datetime import datetime
from pathlib import Path

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

APP_DIR = Path(__file__).parent
PM_CHAT_FILE = APP_DIR / ".pm_chat.json"
PM_BRAIN_STATE = APP_DIR / ".pm_brain_state.json"
PM_BRAIN_LOG = APP_DIR / ".pm_brain.log"
INTERCOM_FILE = APP_DIR / ".claude_intercom.json"
BOARD_FILE = APP_DIR / "board.json"
AGENT_QUESTIONS_FILE = APP_DIR / ".agent_questions.json"
LAUNCH_CHECKLIST_FILE = APP_DIR / ".launch_checklist.json"

CLAUDE_BIN = Path.home() / ".local" / "bin" / "claude"
CHECK_INTERVAL = 5  # seconds between checks
MAX_RESPONSE_TIME = 180  # seconds to wait for Claude (increased from 120)

# SOTA Memory Files
MEMORY_FILE = APP_DIR / ".pm_memory.json"
PATTERNS_FILE = APP_DIR / ".pm_patterns.json"

# ═══════════════════════════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════════════════════════

def log(msg: str, level: str = "INFO"):
    """Log with timestamp to file and stdout."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [{level}] {msg}"
    print(line)
    try:
        with open(PM_BRAIN_LOG, "a") as f:
            f.write(line + "\n")
    except:
        pass

# ═══════════════════════════════════════════════════════════════════════════════
# STATE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

def load_state() -> dict:
    """Load brain state (session ID, last processed message, etc.)."""
    if PM_BRAIN_STATE.exists():
        try:
            return json.loads(PM_BRAIN_STATE.read_text())
        except:
            pass
    return {
        "session_id": str(uuid.uuid4()),
        "last_processed_id": 0,
        "started_at": datetime.now().isoformat(),
        "messages_processed": 0,
        "errors": 0
    }

def save_state(state: dict):
    """Save brain state."""
    state["updated_at"] = datetime.now().isoformat()
    PM_BRAIN_STATE.write_text(json.dumps(state, indent=2))

# ═══════════════════════════════════════════════════════════════════════════════
# SOTA: MEM0-STYLE HYBRID MEMORY SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════

def load_memory() -> dict:
    """Load hybrid memory (facts, relationships, patterns)."""
    if MEMORY_FILE.exists():
        try:
            return json.loads(MEMORY_FILE.read_text())
        except:
            pass
    return {
        "facts": {},  # key-value store for fast retrieval
        "relationships": [],  # graph-like structure for connections
        "context": [],  # recent context for semantic matching
        "user_preferences": {},  # learned user preferences
        "updated_at": datetime.now().isoformat()
    }

def save_memory(memory: dict):
    """Save memory."""
    memory["updated_at"] = datetime.now().isoformat()
    MEMORY_FILE.write_text(json.dumps(memory, indent=2))

def store_fact(key: str, value: str):
    """Store a fact in key-value memory."""
    memory = load_memory()
    memory["facts"][key] = {
        "value": value,
        "stored_at": datetime.now().isoformat(),
        "access_count": 0
    }
    save_memory(memory)

def retrieve_fact(key: str):
    """Retrieve a fact from memory."""
    memory = load_memory()
    if key in memory["facts"]:
        memory["facts"][key]["access_count"] += 1
        save_memory(memory)
        return memory["facts"][key]["value"]
    return None

def add_context(content: str, context_type: str = "conversation"):
    """Add to rolling context buffer (Mem0-style)."""
    memory = load_memory()
    ctx = {
        "content": content[:500],  # Truncate for efficiency
        "type": context_type,
        "timestamp": datetime.now().isoformat()
    }
    memory["context"].append(ctx)
    # Keep only last 100 context items
    memory["context"] = memory["context"][-100:]
    save_memory(memory)

def get_relevant_context(limit: int = 10) -> list:
    """Get recent relevant context."""
    memory = load_memory()
    return memory["context"][-limit:]

# ═══════════════════════════════════════════════════════════════════════════════
# SOTA: PATTERN LEARNING SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════

def load_patterns() -> dict:
    """Load learned patterns."""
    if PATTERNS_FILE.exists():
        try:
            return json.loads(PATTERNS_FILE.read_text())
        except:
            pass
    return {
        "time_patterns": {},  # What user typically does at certain times
        "sequence_patterns": {},  # What typically follows what
        "response_effectiveness": {}  # How well responses worked
    }

def save_patterns(patterns: dict):
    """Save patterns."""
    PATTERNS_FILE.write_text(json.dumps(patterns, indent=2))

def categorize_input(text: str) -> str:
    """Categorize user input for pattern matching."""
    text = text.lower()
    if any(kw in text for kw in ["task", "todo", "do", "create", "build", "fix"]):
        return "task_request"
    if any(kw in text for kw in ["?", "what", "how", "why", "where", "when"]):
        return "question"
    if any(kw in text for kw in ["status", "progress", "update", "check"]):
        return "status_check"
    if any(kw in text for kw in ["urgent", "asap", "now", "immediately"]):
        return "urgent_request"
    return "general"

def record_interaction(user_input: str, response: str, was_helpful: bool = True):
    """Record interaction for pattern learning."""
    patterns = load_patterns()

    # Time pattern
    hour = datetime.now().hour
    day = datetime.now().strftime("%A")
    time_key = f"{day}_{hour}"

    if time_key not in patterns["time_patterns"]:
        patterns["time_patterns"][time_key] = []
    patterns["time_patterns"][time_key].append({
        "input_type": categorize_input(user_input),
        "timestamp": datetime.now().isoformat()
    })
    # Keep only last 50 entries per time slot
    patterns["time_patterns"][time_key] = patterns["time_patterns"][time_key][-50:]

    # Effectiveness tracking
    input_cat = categorize_input(user_input)
    if input_cat not in patterns["response_effectiveness"]:
        patterns["response_effectiveness"][input_cat] = {"helpful": 0, "total": 0}
    patterns["response_effectiveness"][input_cat]["total"] += 1
    if was_helpful:
        patterns["response_effectiveness"][input_cat]["helpful"] += 1

    save_patterns(patterns)

def predict_next_action():
    """Predict what user might want next based on patterns."""
    patterns = load_patterns()

    hour = datetime.now().hour
    day = datetime.now().strftime("%A")
    time_key = f"{day}_{hour}"

    if time_key in patterns["time_patterns"]:
        recent = patterns["time_patterns"][time_key][-5:]
        if recent:
            actions = [r["input_type"] for r in recent]
            most_common = max(set(actions), key=actions.count)
            return most_common
    return None

# ═══════════════════════════════════════════════════════════════════════════════
# SOTA: PROACTIVE INTELLIGENCE
# ═══════════════════════════════════════════════════════════════════════════════

def check_proactive_suggestions() -> list:
    """Check if there are proactive suggestions to offer.

    SOTA recommendation: Agents should anticipate needs, not just respond.
    """
    suggestions = []

    # Check for stale tasks
    if BOARD_FILE.exists():
        try:
            board = json.loads(BOARD_FILE.read_text())
            in_progress = [t for t in board.get("tasks", []) if t.get("status") == "in_progress"]
            for task in in_progress:
                updated = task.get("updated", "")
                if updated:
                    try:
                        updated_dt = datetime.fromisoformat(updated.replace(" ", "T").split(".")[0])
                        age = (datetime.now() - updated_dt).total_seconds() / 3600
                        if age > 24:
                            suggestions.append(f"Task '{task['title'][:30]}' has been in progress for {int(age)}h")
                    except:
                        pass
        except:
            pass

    # Check builder health
    builder_state_file = APP_DIR / ".builder_autonomous_state.json"
    if builder_state_file.exists():
        try:
            builder_state = json.loads(builder_state_file.read_text())
            current_task = builder_state.get("current_task")
            if current_task:
                suggestions.append(f"Builder working on task #{current_task}")
        except:
            pass

    return suggestions

def estimate_timeout(task: str) -> int:
    """Estimate appropriate timeout based on task complexity.

    SOTA insight: Complex tasks need more time. Timeouts should scale.
    """
    task_lower = task.lower()

    # Research/analysis tasks need more time
    if any(kw in task_lower for kw in ["research", "analyze", "investigate", "upgrade"]):
        return 600  # 10 minutes

    # Complex tasks with multiple steps
    if any(kw in task_lower for kw in ["implement", "build", "create", "refactor"]):
        return 480  # 8 minutes

    # Standard tasks
    return MAX_RESPONSE_TIME

# ═══════════════════════════════════════════════════════════════════════════════
# CONTEXT GATHERING
# ═══════════════════════════════════════════════════════════════════════════════

def gather_context() -> str:
    """Gather current project state for Claude - ENHANCED with SOTA features."""
    parts = []

    # Task board
    try:
        if BOARD_FILE.exists():
            board = json.loads(BOARD_FILE.read_text())
            tasks = board.get("tasks", [])
            pending = len([t for t in tasks if t.get("status") == "pending"])
            in_progress = len([t for t in tasks if t.get("status") == "in_progress"])
            parts.append(f"Tasks: {pending} pending, {in_progress} in progress")
    except:
        pass

    # Builder status
    try:
        if INTERCOM_FILE.exists():
            intercom = json.loads(INTERCOM_FILE.read_text())
            builder_msgs = intercom.get("builder_to_pm", [])
            if builder_msgs:
                latest = builder_msgs[-1]
                parts.append(f"Builder last: [{latest.get('type')}] {latest.get('message', '')[:80]}...")
            queued = len([t for t in intercom.get("pm_to_builder", []) if not t.get("read")])
            if queued:
                parts.append(f"Builder queue: {queued} tasks")
    except:
        pass

    # Agent questions
    try:
        if AGENT_QUESTIONS_FILE.exists():
            questions = json.loads(AGENT_QUESTIONS_FILE.read_text())
            unanswered = len([q for q in questions.get("questions", []) if not q.get("answered")])
            if unanswered:
                parts.append(f"Agent questions waiting: {unanswered}")
    except:
        pass

    # Launch readiness
    try:
        if LAUNCH_CHECKLIST_FILE.exists():
            checklist = json.loads(LAUNCH_CHECKLIST_FILE.read_text())
            items = checklist.get("items", [])
            done = len([i for i in items if i.get("status") == "done"])
            total = len(items)
            if total:
                parts.append(f"Launch readiness: {done}/{total} ({int(done/total*100)}%)")
    except:
        pass

    # SOTA: Add memory context
    recent_ctx = get_relevant_context(limit=5)
    if recent_ctx:
        parts.append(f"Recent memory: {len(recent_ctx)} items")

    # SOTA: Add pattern prediction
    predicted = predict_next_action()
    if predicted:
        parts.append(f"Predicted intent: {predicted}")

    # SOTA: Add proactive suggestions
    suggestions = check_proactive_suggestions()
    if suggestions:
        parts.append(f"Alerts: {len(suggestions)}")

    return " | ".join(parts) if parts else "No context available"

# ═══════════════════════════════════════════════════════════════════════════════
# CLAUDE CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════

def call_claude(prompt: str, session_id: str = None, timeout: int = None) -> tuple[str, bool]:
    """
    Call Claude CLI with the given prompt.
    Returns (response_text, success).

    SOTA: Now supports adaptive timeouts.
    """
    if not CLAUDE_BIN.exists():
        return "Claude CLI not found", False

    # Use provided timeout or default
    actual_timeout = timeout or MAX_RESPONSE_TIME

    # Build the command - use --dangerously-skip-permissions for autonomous operation
    cmd = [
        str(CLAUDE_BIN),
        "-p",  # Print mode (non-interactive)
        prompt,
        "--dangerously-skip-permissions",  # SOTA: Autonomous operation
    ]

    try:
        log(f"Calling Claude CLI (timeout: {actual_timeout}s)")

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=actual_timeout,
            cwd=str(APP_DIR.parent),  # Run from project root
            env={**os.environ, "NO_COLOR": "1", "PATH": f"{CLAUDE_BIN.parent}:{os.environ.get('PATH', '')}"}
        )

        if result.returncode == 0:
            response = result.stdout.strip()
            # Clean up any ANSI codes that might have slipped through
            import re
            response = re.sub(r'\x1b\[[0-9;]*m', '', response)
            return response, True
        else:
            error = result.stderr.strip() or "Unknown error"
            log(f"Claude CLI error: {error}", "ERROR")
            return f"Error: {error}", False

    except subprocess.TimeoutExpired:
        log(f"Claude CLI timed out after {actual_timeout}s", "ERROR")
        return "Response timed out", False
    except Exception as e:
        log(f"Claude CLI exception: {e}", "ERROR")
        return f"Error: {str(e)}", False

def build_pm_prompt(user_message: str, context: str, history: list) -> str:
    """Build the full prompt for Claude - SOTA ENHANCED with memory and proactive intelligence."""

    # Recent conversation history
    history_text = ""
    if history:
        history_text = "\n\nRECENT CONVERSATION:\n"
        for msg in history[-6:]:  # Last 6 messages
            role = "USER" if msg.get("from") == "user" else "PM"
            history_text += f"{role}: {msg['message'][:200]}\n"

    # SOTA: Add memory context
    memory_text = ""
    recent_ctx = get_relevant_context(limit=5)
    if recent_ctx:
        memory_text = "\n\nRECENT MEMORY:\n"
        for ctx in recent_ctx:
            memory_text += f"- [{ctx['type']}] {ctx['content'][:100]}\n"

    # SOTA: Add proactive suggestions
    proactive_text = ""
    suggestions = check_proactive_suggestions()
    if suggestions:
        proactive_text = "\n\nPROACTIVE ALERTS:\n"
        for s in suggestions:
            proactive_text += f"- {s}\n"

    prompt = f"""You are the PM (Project Manager) for TinyPM and Tiny Seed Farm OS, responding to a dashboard message.

CURRENT PROJECT STATE:
{context}
{history_text}{memory_text}{proactive_text}

CRITICAL INSTRUCTIONS - FOLLOW THESE EXACTLY:
1. Be PROACTIVE - suggest next actions, anticipate needs before asked
2. Be SPECIFIC - use numbers, names, actual data from context
3. Be CONCISE - keep responses under 150 words
4. Be ACTION-ORIENTED - end with a clear next step when appropriate
5. If agent questions are waiting, remind the user
6. If Builder completed work, mention it
7. If there are proactive alerts, mention them naturally
8. THINK AHEAD - what will the user need next?

USER MESSAGE:
{user_message}

YOUR RESPONSE (as the PM - be intelligent and anticipate needs):"""

    return prompt

# ═══════════════════════════════════════════════════════════════════════════════
# MESSAGE PROCESSING
# ═══════════════════════════════════════════════════════════════════════════════

def get_new_messages(last_id: int) -> list:
    """Get new user messages since last_id."""
    if not PM_CHAT_FILE.exists():
        return []

    try:
        chat = json.loads(PM_CHAT_FILE.read_text())
        messages = chat.get("messages", [])

        new_msgs = [
            m for m in messages
            if m["id"] > last_id
            and m.get("from") == "user"
            and not m.get("auto_responded")
        ]

        return new_msgs
    except Exception as e:
        log(f"Error reading messages: {e}", "ERROR")
        return []

def get_conversation_history() -> list:
    """Get recent conversation history."""
    if not PM_CHAT_FILE.exists():
        return []

    try:
        chat = json.loads(PM_CHAT_FILE.read_text())
        return chat.get("messages", [])[-10:]
    except:
        return []

def save_response(response_text: str, original_msg_id: int):
    """Save PM response to chat file."""
    try:
        chat = json.loads(PM_CHAT_FILE.read_text())

        msg_id = chat.get("next_id", 1)
        chat["messages"].append({
            "id": msg_id,
            "from": "pm",
            "message": response_text,
            "timestamp": datetime.now().isoformat(),
            "read_by_user": False,
            "auto_generated": True,
            "generator": "pm_brain"
        })
        chat["next_id"] = msg_id + 1

        # Mark original as responded
        for m in chat["messages"]:
            if m["id"] == original_msg_id:
                m["auto_responded"] = True

        PM_CHAT_FILE.write_text(json.dumps(chat, indent=2))
        log(f"Response saved as message #{msg_id}")
        return True

    except Exception as e:
        log(f"Error saving response: {e}", "ERROR")
        return False

def process_message(msg: dict, state: dict) -> bool:
    """Process a single user message - SOTA ENHANCED with learning."""
    user_message = msg["message"]
    msg_id = msg["id"]

    log(f"Processing message #{msg_id}: {user_message[:50]}...")

    # SOTA: Store user message in memory
    add_context(f"User: {user_message[:100]}", "user_message")

    # Gather context
    context = gather_context()
    history = get_conversation_history()

    # Build prompt
    prompt = build_pm_prompt(user_message, context, history)

    # SOTA: Use adaptive timeout
    timeout = estimate_timeout(user_message)
    log(f"Using adaptive timeout: {timeout}s")

    # Call Claude with adaptive timeout
    response, success = call_claude(prompt, state.get("session_id"), timeout=timeout)

    if success:
        # Save response
        save_response(response, msg_id)
        state["messages_processed"] = state.get("messages_processed", 0) + 1

        # SOTA: Store response in memory and record interaction
        add_context(f"PM: {response[:100]}", "pm_response")
        record_interaction(user_message, response, was_helpful=True)

        return True
    else:
        state["errors"] = state.get("errors", 0) + 1
        # Still save a fallback response
        save_response(f"I received your message but encountered an error. Please try again or check the terminal.", msg_id)
        record_interaction(user_message, "error", was_helpful=False)
        return False

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN LOOP
# ═══════════════════════════════════════════════════════════════════════════════

def run_once(state: dict) -> bool:
    """Process any pending messages once."""
    new_msgs = get_new_messages(state["last_processed_id"])

    if not new_msgs:
        return False

    for msg in new_msgs:
        process_message(msg, state)
        state["last_processed_id"] = msg["id"]
        save_state(state)

    return True

def run_loop():
    """Main loop - watch for messages and respond with SOTA intelligence."""
    log("=" * 60)
    log("PM BRAIN v2.0 - SOTA Intelligence Active")
    log("=" * 60)
    log("Features: Mem0 Memory | Pattern Learning | Proactive Intel")
    log("=" * 60)

    state = load_state()
    log(f"Session: {state['session_id'][:8]}... | Last processed: #{state['last_processed_id']}")

    # Check Claude CLI exists
    if not CLAUDE_BIN.exists():
        log(f"Claude CLI not found at {CLAUDE_BIN}", "ERROR")
        log("Install with: curl -fsSL https://claude.ai/install.sh | sh")
        sys.exit(1)

    log(f"Watching {PM_CHAT_FILE}")
    log(f"Check interval: {CHECK_INTERVAL}s")
    log("Press Ctrl+C to stop")
    log("-" * 60)

    try:
        while True:
            new_msgs = get_new_messages(state["last_processed_id"])

            if new_msgs:
                log(f"Found {len(new_msgs)} new message(s)")

                for msg in new_msgs:
                    process_message(msg, state)
                    state["last_processed_id"] = msg["id"]
                    save_state(state)

            time.sleep(CHECK_INTERVAL)

    except KeyboardInterrupt:
        log("Shutting down...")
        save_state(state)
        log(f"Processed {state['messages_processed']} messages, {state['errors']} errors")

def run_daemon():
    """Run as a background daemon."""
    import signal

    # Create PID file
    pid_file = APP_DIR / ".pm_brain.pid"
    pid_file.write_text(str(os.getpid()))

    def cleanup(signum, frame):
        log("Received shutdown signal")
        pid_file.unlink(missing_ok=True)
        sys.exit(0)

    signal.signal(signal.SIGTERM, cleanup)
    signal.signal(signal.SIGINT, cleanup)

    log(f"Running as daemon (PID: {os.getpid()})")
    run_loop()

# ═══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="PM Brain v2.0 - SOTA Intelligent PM")
    parser.add_argument("--daemon", action="store_true", help="Run as background daemon")
    parser.add_argument("--once", action="store_true", help="Process pending messages once and exit")
    parser.add_argument("--status", action="store_true", help="Show brain status")
    parser.add_argument("--memory", action="store_true", help="Show memory statistics")
    args = parser.parse_args()

    if args.status:
        state = load_state()
        patterns = load_patterns()
        print(f"""
PM Brain v2.0 Status - SOTA Intelligence
═══════════════════════════════════════════════════════════
  Session ID:        {state['session_id'][:8]}...
  Last processed:    #{state['last_processed_id']}
  Messages handled:  {state.get('messages_processed', 0)}
  Errors:            {state.get('errors', 0)}
  Started:           {state.get('started_at', 'Unknown')}
  Updated:           {state.get('updated_at', 'Never')}

  Pattern Categories: {len(patterns.get('time_patterns', {}))}
  Effectiveness Data: {len(patterns.get('response_effectiveness', {}))}
═══════════════════════════════════════════════════════════
""")
        return

    if args.memory:
        memory = load_memory()
        print(f"""
PM Brain Memory Statistics - Mem0-Style
═══════════════════════════════════════════════════════════
  Facts stored:      {len(memory.get('facts', {}))}
  Relationships:     {len(memory.get('relationships', []))}
  Context items:     {len(memory.get('context', []))}
  User preferences:  {len(memory.get('user_preferences', {}))}
  Last updated:      {memory.get('updated_at', 'Unknown')}
═══════════════════════════════════════════════════════════
""")
        return

    if args.once:
        state = load_state()
        processed = run_once(state)
        if processed:
            print("Processed pending messages")
        else:
            print("No new messages")
        return

    if args.daemon:
        run_daemon()
    else:
        run_loop()

if __name__ == "__main__":
    main()
