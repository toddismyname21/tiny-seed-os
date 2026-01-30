#!/usr/bin/env python3
"""
AUTONOMOUS BUILDER v2.0 - SOTA Enhanced Task Execution
========================================================================
This is the REAL builder that actually does work. It:
1. Polls the intercom for new tasks
2. Uses ADAPTIVE TIMEOUTS based on task complexity
3. Executes tasks using Claude CLI with full permissions
4. Reports completion back to PM
5. Loops forever, doing work automatically

SOTA Features:
- Adaptive timeouts (research tasks get 10+ mins)
- Priority-based execution
- Task complexity analysis

NO HUMAN INTERVENTION REQUIRED.
"""

import json
import subprocess
import time
import os
from datetime import datetime
from pathlib import Path

# Import the Mentor (Critic) module for quality verification
from critic import critic_verify, detect_task_type

# Configuration
TINYPM_DIR = Path("/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm")
INTERCOM_FILE = TINYPM_DIR / ".claude_intercom.json"
LOG_FILE = TINYPM_DIR / ".builder_autonomous.log"
STATE_FILE = TINYPM_DIR / ".builder_autonomous_state.json"
POLL_INTERVAL = 5  # seconds between checks
HEARTBEAT_INTERVAL = 60  # seconds between heartbeats
DEFAULT_TIMEOUT = 300  # 5 minutes default
MAX_TIMEOUT = 900  # 15 minutes max
MAX_CRITIC_RETRIES = 3  # Mentor will verify and retry up to 3 times

def log(message: str, level: str = "INFO"):
    """Log with timestamp."""
    timestamp = datetime.now().isoformat()
    line = f"[{timestamp}] [{level}] {message}"
    print(line)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")

def load_state() -> dict:
    """Load builder state."""
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except:
            pass
    return {"last_task_id": 0, "tasks_completed": 0, "start_time": datetime.now().isoformat()}

def save_state(state: dict):
    """Save builder state."""
    STATE_FILE.write_text(json.dumps(state, indent=2))

def load_intercom() -> dict:
    """Load intercom data."""
    if INTERCOM_FILE.exists():
        try:
            return json.loads(INTERCOM_FILE.read_text())
        except:
            pass
    return {"pm_to_builder": [], "builder_to_pm": [], "next_id": 1}

def save_intercom(data: dict):
    """Save intercom data."""
    INTERCOM_FILE.write_text(json.dumps(data, indent=2))

def get_pending_tasks(intercom: dict, last_id: int) -> list:
    """Get tasks that haven't been processed yet."""
    tasks = []
    for msg in intercom.get("pm_to_builder", []):
        if msg["id"] > last_id and msg.get("type") in ["task", "urgent"]:
            if not msg.get("executed", False):  # Skip already executed
                tasks.append(msg)
    return sorted(tasks, key=lambda x: (
        0 if x.get("priority") == "critical" else
        1 if x.get("priority") == "high" else 2,
        x["id"]
    ))

def estimate_timeout(task_message: str) -> int:
    """SOTA: Estimate appropriate timeout based on task complexity.

    Complex tasks need more time. Timeouts scale with complexity.
    """
    task_lower = task_message.lower()

    # Research/analysis/investigation tasks need maximum time
    if any(kw in task_lower for kw in ["research", "analyze", "investigate", "comprehensive", "full"]):
        return MAX_TIMEOUT  # 15 minutes

    # Major upgrades and implementations need extra time
    if any(kw in task_lower for kw in ["upgrade", "algorithm", "implement", "refactor", "major"]):
        return 600  # 10 minutes

    # Build/create tasks need moderate extra time
    if any(kw in task_lower for kw in ["build", "create", "add", "integrate"]):
        return 480  # 8 minutes

    # Bug fixes and simple tasks use default
    if any(kw in task_lower for kw in ["fix", "bug", "update", "change"]):
        return DEFAULT_TIMEOUT  # 5 minutes

    # Urgent tasks also use default (fast turnaround expected)
    return DEFAULT_TIMEOUT

def execute_single_attempt(task_id: int, message: str, priority: str,
                           timeout: int, feedback: str = "") -> tuple[bool, str]:
    """Execute a single task attempt using Claude CLI."""
    timeout_mins = timeout // 60

    # Build the prompt for Claude (with feedback if retrying)
    feedback_section = ""
    if feedback:
        feedback_section = f"""
[MENTOR FEEDBACK - FIX THIS ISSUE]:
{feedback}

"""

    prompt = f"""You are the Artificer (Builder) Claude for TinyPM. Execute this task NOW.

TASK #{task_id} [{priority.upper()} PRIORITY]:
{message}
{feedback_section}
WORKING DIRECTORY: {TINYPM_DIR}

INSTRUCTIONS:
1. Read any files you need to understand
2. Make the changes requested
3. Be thorough and complete
4. When done, provide a summary of what you did

CRITICAL: Do the work. Don't just describe what you would do - ACTUALLY DO IT.
Modify files, create files, whatever is needed.
"""

    try:
        CLAUDE_CLI = "/Users/samanthapollack/.local/bin/claude"

        result = subprocess.run(
            [CLAUDE_CLI, "-p", prompt, "--dangerously-skip-permissions"],
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=str(TINYPM_DIR),
            env={**os.environ, "PATH": f"/Users/samanthapollack/.local/bin:{os.environ.get('PATH', '')}"}
        )

        output = result.stdout
        if result.returncode == 0:
            return True, output
        else:
            return False, f"Error: {result.stderr}"

    except subprocess.TimeoutExpired:
        return False, f"Task timed out after {timeout_mins} minutes"
    except Exception as e:
        return False, f"Exception: {e}"


def execute_task(task: dict) -> tuple[bool, str]:
    """Execute a task with MENTOR (Critic) verification loop.

    SOTA Enhancement: The Mentor verifies Builder output before reporting "done".
    If verification fails, the task is retried with feedback up to MAX_CRITIC_RETRIES times.
    """
    task_id = task["id"]
    message = task["message"]
    priority = task.get("priority", "normal")

    # SOTA: Calculate adaptive timeout based on task complexity
    timeout = estimate_timeout(message)
    timeout_mins = timeout // 60

    log(f"EXECUTING Task #{task_id} [{priority}] (timeout: {timeout_mins}m): {message[:80]}...")

    # Auto-detect task type for verification
    task_type = detect_task_type(message)
    log(f"Task type detected: {task_type}")

    # Build verification context
    context = {
        "start_time": time.time(),
    }

    # Extract target file from task message if present
    for ext in [".py", ".js", ".html", ".css", ".json"]:
        if ext in message:
            # Try to extract filename
            import re
            match = re.search(r'[\w\-./]+' + re.escape(ext), message)
            if match:
                potential_file = match.group()
                if not potential_file.startswith("/"):
                    potential_file = str(TINYPM_DIR / potential_file)
                context["target_file"] = potential_file
                log(f"Target file identified: {potential_file}")
                break

    # MENTOR VERIFICATION LOOP
    feedback = ""
    iteration = 0
    final_output = ""

    while iteration < MAX_CRITIC_RETRIES:
        iteration += 1
        log(f"[Mentor Loop] Attempt {iteration}/{MAX_CRITIC_RETRIES}")

        # Execute the task
        success, output = execute_single_attempt(
            task_id, message, priority, timeout, feedback
        )
        final_output = output

        if not success:
            # Execution failed - don't verify, just retry
            feedback = output
            log(f"[Mentor] Execution failed: {feedback[:100]}...", "WARN")
            continue

        # MENTOR VERIFICATION
        is_valid, verification_feedback = critic_verify(task_type, output, context)

        if is_valid:
            log(f"[Mentor] ✓ Verified: {verification_feedback}")
            log(f"Task #{task_id} COMPLETED and VERIFIED (attempt {iteration})")
            return True, f"[Verified after {iteration} attempt(s)]\n{output}"
        else:
            feedback = verification_feedback
            log(f"[Mentor] ✗ Verification failed: {feedback}", "WARN")

    # Max retries exceeded
    log(f"Task #{task_id} FAILED after {MAX_CRITIC_RETRIES} attempts", "ERROR")
    return False, f"Max retries exceeded. Last output:\n{final_output}\n\nLast feedback: {feedback}"

def report_to_pm(task_id: int, success: bool, output: str):
    """Report task completion to PM."""
    intercom = load_intercom()

    # Create report message
    msg_type = "done" if success else "error"
    summary = output[:500] if len(output) > 500 else output

    report = {
        "id": intercom.get("next_id", 1),
        "type": msg_type,
        "message": f"Task #{task_id} {'COMPLETE' if success else 'FAILED'}: {summary}",
        "task_ref": str(task_id),
        "timestamp": datetime.now().isoformat(),
        "read": False
    }

    intercom["builder_to_pm"].append(report)
    intercom["next_id"] = report["id"] + 1

    # Mark task as executed
    for task in intercom.get("pm_to_builder", []):
        if task["id"] == task_id:
            task["executed"] = True
            task["execution_time"] = datetime.now().isoformat()
            break

    save_intercom(intercom)
    log(f"Reported task #{task_id} to PM (msg #{report['id']})")

def send_heartbeat(state: dict):
    """Send heartbeat to PM."""
    intercom = load_intercom()

    hb = {
        "id": intercom.get("next_id", 1),
        "type": "heartbeat",
        "message": "Autonomous Builder active",
        "status": "active",
        "current_task": state.get("current_task"),
        "tasks_completed": state.get("tasks_completed", 0),
        "timestamp": datetime.now().isoformat(),
        "read": False
    }

    intercom["builder_to_pm"].append(hb)
    intercom["next_id"] = hb["id"] + 1
    save_intercom(intercom)

def main():
    """Main autonomous builder loop."""
    log("=" * 60)
    log("AUTONOMOUS BUILDER STARTING")
    log("=" * 60)
    log(f"Poll interval: {POLL_INTERVAL}s")
    log(f"Heartbeat interval: {HEARTBEAT_INTERVAL}s")
    log("This builder executes tasks WITHOUT human intervention")
    log("=" * 60)

    state = load_state()
    last_heartbeat = time.time()

    # Send initial heartbeat
    send_heartbeat(state)

    while True:
        try:
            # Check for heartbeat
            now = time.time()
            if now - last_heartbeat >= HEARTBEAT_INTERVAL:
                send_heartbeat(state)
                last_heartbeat = now

            # Load intercom
            intercom = load_intercom()

            # Get pending tasks
            tasks = get_pending_tasks(intercom, state.get("last_task_id", 0))

            if tasks:
                # Execute highest priority task
                task = tasks[0]
                task_id = task["id"]

                state["current_task"] = task_id
                save_state(state)

                # Execute the task
                success, output = execute_task(task)

                # Report back to PM
                report_to_pm(task_id, success, output)

                # Update state
                state["last_task_id"] = task_id
                state["current_task"] = None
                state["tasks_completed"] = state.get("tasks_completed", 0) + 1
                save_state(state)

                log(f"Tasks completed so far: {state['tasks_completed']}")

            else:
                # No tasks, just wait
                pass

        except Exception as e:
            log(f"Main loop error: {e}", "ERROR")

        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
