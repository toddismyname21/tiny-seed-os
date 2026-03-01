#!/usr/bin/env python3
"""
PM DIRECT LINE WATCHER
======================
Watches for user messages from the dashboard and responds using Claude CLI.
This gives PM full terminal capabilities (file editing, task execution).

Like Builder watches the intercom, PM watches the direct line.
"""

import argparse
import json
import subprocess
import time
import os
from datetime import datetime
from pathlib import Path

# Configuration
TINYPM_DIR = Path("/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm")
PM_CHAT_FILE = TINYPM_DIR / ".pm_chat.json"
INTERCOM_FILE = TINYPM_DIR / ".claude_intercom.json"
LOG_FILE = TINYPM_DIR / ".pm_direct_line.log"
STATE_FILE = TINYPM_DIR / ".pm_direct_line_state.json"
CLAUDE_CLI = "/Users/samanthapollack/.local/bin/claude"

POLL_INTERVAL = 5  # seconds between checks

def log(message: str, level: str = "INFO"):
    """Log with timestamp."""
    timestamp = datetime.now().isoformat()
    line = f"[{timestamp}] [{level}] {message}"
    print(line)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")

def load_state() -> dict:
    """Load PM state."""
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except:
            pass
    return {"last_message_id": 0, "messages_handled": 0}

def save_state(state: dict):
    """Save PM state."""
    STATE_FILE.write_text(json.dumps(state, indent=2))

def load_chat() -> dict:
    """Load PM chat data."""
    if PM_CHAT_FILE.exists():
        try:
            return json.loads(PM_CHAT_FILE.read_text())
        except:
            pass
    return {"messages": [], "next_id": 1}

def save_chat(data: dict):
    """Save PM chat data."""
    PM_CHAT_FILE.write_text(json.dumps(data, indent=2))

def load_intercom() -> dict:
    """Load intercom data for delegating to Builder."""
    if INTERCOM_FILE.exists():
        try:
            return json.loads(INTERCOM_FILE.read_text())
        except:
            pass
    return {"pm_to_builder": [], "builder_to_pm": [], "next_id": 1}

def save_intercom(data: dict):
    """Save intercom data."""
    INTERCOM_FILE.write_text(json.dumps(data, indent=2))

def get_pending_messages(chat: dict, last_id: int) -> list:
    """Get user messages that haven't been handled yet."""
    pending = []
    for msg in chat.get("messages", []):
        if msg.get("from") == "user" and msg.get("id", 0) > last_id:
            if not msg.get("handled_by_pm_cli", False):
                pending.append(msg)
    return sorted(pending, key=lambda x: x.get("id", 0))

def delegate_to_builder(task_message: str, priority: str = "normal") -> int:
    """Send a task to Builder via intercom."""
    intercom = load_intercom()

    task = {
        "id": intercom.get("next_id", 1),
        "type": "task",
        "message": task_message,
        "priority": priority,
        "timestamp": datetime.now().isoformat(),
        "status": "pending",
        "read": False
    }

    intercom["pm_to_builder"].append(task)
    intercom["next_id"] = task["id"] + 1
    save_intercom(intercom)

    log(f"Delegated task #{task['id']} to Builder: {task_message[:50]}...")
    return task["id"]

def respond_to_message(user_msg: dict) -> str:
    """Generate a response to user message using Claude CLI."""
    msg_id = user_msg.get("id", 0)
    message = user_msg.get("message", "")

    log(f"Responding to message #{msg_id}: {message[:60]}...")

    # Build context for Claude
    # Read recent messages for context
    chat = load_chat()
    recent = chat.get("messages", [])[-10:]
    context = "\n".join([
        f"{'USER' if m.get('from') == 'user' else 'PM'}: {m.get('message', '')}"
        for m in recent
    ])

    # Build the prompt
    prompt = f"""You are the PM Claude for TinyPM - a smart project management system.
You have FULL TERMINAL CAPABILITIES - you can read/edit files, run commands, delegate tasks.

RECENT CONVERSATION:
{context}

CURRENT USER MESSAGE (ID #{msg_id}):
{message}

WORKING DIRECTORY: {TINYPM_DIR}

YOUR CAPABILITIES:
1. Edit files directly (web_dashboard.html, web_server.py, etc.)
2. Delegate coding tasks to Builder via the intercom system
3. Research information
4. Analyze project state

INSTRUCTIONS:
- Respond naturally to the user
- If they ask for something to be built/fixed, either do it yourself or delegate to Builder
- Be concise but helpful
- Use markdown formatting

To delegate to Builder, say: DELEGATE TO BUILDER: [task description]
"""

    try:
        result = subprocess.run(
            # SECURITY FIX 2026-02-28: Removed --dangerously-skip-permissions
            [CLAUDE_CLI, "-p", prompt],
            capture_output=True,
            text=True,
            timeout=180,  # 3 minute timeout
            cwd=str(TINYPM_DIR),
            env={**os.environ, "PATH": f"/Users/samanthapollack/.local/bin:{os.environ.get('PATH', '')}"}
        )

        response = result.stdout.strip()

        if result.returncode == 0:
            log(f"Generated response for #{msg_id}")

            # Check if response includes delegation
            if "DELEGATE TO BUILDER:" in response:
                # Extract the task
                parts = response.split("DELEGATE TO BUILDER:")
                if len(parts) > 1:
                    task = parts[1].strip().split("\n")[0]
                    delegate_to_builder(task, "high")

            return response
        else:
            log(f"Error generating response: {result.stderr}", "ERROR")
            return f"Sorry, I had trouble processing that. Error: {result.stderr[:100]}"

    except subprocess.TimeoutExpired:
        log(f"Timeout generating response for #{msg_id}", "ERROR")
        return "Sorry, that took too long to process. Try a simpler request."
    except Exception as e:
        log(f"Exception: {e}", "ERROR")
        return f"Error: {e}"

def add_pm_response(chat: dict, response: str) -> int:
    """Add PM response to chat."""
    msg = {
        "id": chat.get("next_id", 1),
        "from": "pm",
        "message": response,
        "timestamp": datetime.now().isoformat(),
        "read_by_user": False,
        "auto_generated": True,
        "generator": "pm_direct_line"
    }

    chat["messages"].append(msg)
    chat["next_id"] = msg["id"] + 1

    return msg["id"]

def run_watcher():
    """Main PM direct line watcher loop."""
    log("=" * 60)
    log("PM DIRECT LINE WATCHER STARTING")
    log("=" * 60)
    log(f"Poll interval: {POLL_INTERVAL}s")
    log(f"Chat file: {PM_CHAT_FILE}")
    log("PM will respond to dashboard messages using Claude CLI")
    log("=" * 60)

    state = load_state()

    while True:
        try:
            # Load chat
            chat = load_chat()

            # Get pending user messages
            pending = get_pending_messages(chat, state.get("last_message_id", 0))

            if pending:
                # Process oldest pending message
                user_msg = pending[0]
                msg_id = user_msg.get("id", 0)

                log(f"Processing message #{msg_id}...")

                # Generate response
                response = respond_to_message(user_msg)

                # Add response to chat
                response_id = add_pm_response(chat, response)

                # Mark original message as handled
                for m in chat.get("messages", []):
                    if m.get("id") == msg_id:
                        m["handled_by_pm_cli"] = True
                        break

                save_chat(chat)

                # Update state
                state["last_message_id"] = msg_id
                state["messages_handled"] = state.get("messages_handled", 0) + 1
                save_state(state)

                log(f"Sent response #{response_id} for message #{msg_id}")
                log(f"Total messages handled: {state['messages_handled']}")

        except Exception as e:
            log(f"Main loop error: {e}", "ERROR")

        time.sleep(POLL_INTERVAL)


def show_status():
    """Display current status of the direct line watcher."""
    state = load_state()
    chat = load_chat()

    pending = get_pending_messages(chat, state.get("last_message_id", 0))
    total_messages = len(chat.get("messages", []))

    print(f"""
PM Direct Line Status
=====================
  Last message ID:     #{state.get('last_message_id', 0)}
  Messages handled:    {state.get('messages_handled', 0)}
  Pending messages:    {len(pending)}
  Total in chat:       {total_messages}
  Chat file:           {PM_CHAT_FILE}
  State file:          {STATE_FILE}
  Log file:            {LOG_FILE}
  Claude CLI:          {CLAUDE_CLI}
  Poll interval:       {POLL_INTERVAL}s
""")


def process_once():
    """Process pending messages once and exit."""
    state = load_state()
    chat = load_chat()
    pending = get_pending_messages(chat, state.get("last_message_id", 0))

    if not pending:
        print("No pending messages.")
        return

    print(f"Processing {len(pending)} pending message(s)...")

    for user_msg in pending:
        msg_id = user_msg.get("id", 0)
        log(f"Processing message #{msg_id}...")

        response = respond_to_message(user_msg)
        response_id = add_pm_response(chat, response)

        for m in chat.get("messages", []):
            if m.get("id") == msg_id:
                m["handled_by_pm_cli"] = True
                break

        save_chat(chat)

        state["last_message_id"] = msg_id
        state["messages_handled"] = state.get("messages_handled", 0) + 1
        save_state(state)

        print(f"Responded to message #{msg_id} with response #{response_id}")


def main():
    """Main entry point with CLI argument parsing."""
    global POLL_INTERVAL

    parser = argparse.ArgumentParser(
        description="PM Direct Line - Watch and respond to dashboard messages using Claude CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python pm_direct_line.py              # Run watcher continuously
  python pm_direct_line.py --status     # Show current status
  python pm_direct_line.py --once       # Process pending and exit
  python pm_direct_line.py --help       # Show this help

The PM Direct Line watches for user messages from the dashboard and
responds using the Claude CLI, giving PM full terminal capabilities
(file editing, task execution, code changes).
"""
    )
    parser.add_argument("--status", action="store_true",
                       help="Show current status and exit")
    parser.add_argument("--once", action="store_true",
                       help="Process pending messages once and exit")
    parser.add_argument("--interval", type=int, default=POLL_INTERVAL,
                       help=f"Poll interval in seconds (default: {POLL_INTERVAL})")

    args = parser.parse_args()

    if args.status:
        show_status()
        return

    if args.once:
        process_once()
        return

    # Update poll interval if specified
    POLL_INTERVAL = args.interval

    run_watcher()


if __name__ == "__main__":
    main()
