#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
TINYPM TEAM SUPERVISOR - Keeps the Agentic Team Running
═══════════════════════════════════════════════════════════════════════════════

This supervisor ensures all agents stay alive and healthy:
- PM Brain (coordinator)
- Builder (executor)
- Web Server (dashboard)

Usage:
    python3 team_supervisor.py start     # Start all agents
    python3 team_supervisor.py stop      # Stop all agents
    python3 team_supervisor.py status    # Show agent status
    python3 team_supervisor.py restart   # Restart all agents
"""

import json
import os
import signal
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

# Configuration
TINYPM_DIR = Path(__file__).parent
PID_FILE = TINYPM_DIR / ".team_supervisor.pid"
STATUS_FILE = TINYPM_DIR / ".team_status.json"
LOG_FILE = TINYPM_DIR / ".team_supervisor.log"

# Agent definitions
AGENTS = {
    "pm_brain": {
        "script": "pm_brain.py",
        "args": ["--daemon"],
        "description": "PM Brain - Coordinator & Intelligence",
        "pid_file": ".pm_brain.pid",
        "required": True
    },
    "builder": {
        "script": "builder_autonomous.py",
        "args": [],
        "description": "Builder - Autonomous Task Executor",
        "pid_file": ".builder.pid",
        "required": True
    },
    "web_server": {
        "script": "web_server.py",
        "args": [],
        "description": "Web Server - Dashboard & API",
        "pid_file": ".web_server.pid",
        "required": True
    }
}

def log(msg: str, level: str = "INFO"):
    """Log with timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [{level}] {msg}"
    print(line)
    try:
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except:
        pass

def is_process_running(pid: int) -> bool:
    """Check if a process is running."""
    try:
        os.kill(pid, 0)
        return True
    except (OSError, ProcessLookupError):
        return False

def get_agent_pid(agent_name: str):
    """Get PID from agent's pid file."""
    pid_file = TINYPM_DIR / AGENTS[agent_name]["pid_file"]
    if pid_file.exists():
        try:
            pid = int(pid_file.read_text().strip())
            if is_process_running(pid):
                return pid
        except:
            pass
    return None

def find_process_by_script(script_name: str):
    """Find process by script name using ps."""
    try:
        result = subprocess.run(
            ["pgrep", "-f", script_name],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            pids = result.stdout.strip().split('\n')
            if pids and pids[0]:
                return int(pids[0])
    except:
        pass
    return None

def start_agent(agent_name: str) -> bool:
    """Start a single agent."""
    agent = AGENTS[agent_name]
    script_path = TINYPM_DIR / agent["script"]

    if not script_path.exists():
        log(f"Script not found: {script_path}", "ERROR")
        return False

    # Check if already running
    pid = get_agent_pid(agent_name) or find_process_by_script(agent["script"])
    if pid:
        log(f"{agent_name} already running (PID: {pid})")
        return True

    log(f"Starting {agent_name}: {agent['description']}")

    try:
        # Start the process
        cmd = ["python3", str(script_path)] + agent["args"]
        process = subprocess.Popen(
            cmd,
            cwd=str(TINYPM_DIR),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True
        )

        # Save PID
        pid_file = TINYPM_DIR / agent["pid_file"]
        pid_file.write_text(str(process.pid))

        # Give it a moment to start
        time.sleep(1)

        if is_process_running(process.pid):
            log(f"✅ {agent_name} started (PID: {process.pid})")
            return True
        else:
            log(f"❌ {agent_name} failed to start", "ERROR")
            return False

    except Exception as e:
        log(f"Failed to start {agent_name}: {e}", "ERROR")
        return False

def stop_agent(agent_name: str) -> bool:
    """Stop a single agent."""
    agent = AGENTS[agent_name]

    # Try pid file first, then process search
    pid = get_agent_pid(agent_name) or find_process_by_script(agent["script"])

    if not pid:
        log(f"{agent_name} not running")
        return True

    log(f"Stopping {agent_name} (PID: {pid})")

    try:
        os.kill(pid, signal.SIGTERM)

        # Wait for graceful shutdown
        for _ in range(10):
            if not is_process_running(pid):
                break
            time.sleep(0.5)

        # Force kill if still running
        if is_process_running(pid):
            os.kill(pid, signal.SIGKILL)
            time.sleep(0.5)

        # Clean up pid file
        pid_file = TINYPM_DIR / agent["pid_file"]
        if pid_file.exists():
            pid_file.unlink()

        log(f"✅ {agent_name} stopped")
        return True

    except Exception as e:
        log(f"Failed to stop {agent_name}: {e}", "ERROR")
        return False

def get_status() -> dict:
    """Get status of all agents."""
    status = {
        "timestamp": datetime.now().isoformat(),
        "agents": {}
    }

    for name, agent in AGENTS.items():
        pid = get_agent_pid(name) or find_process_by_script(agent["script"])
        status["agents"][name] = {
            "description": agent["description"],
            "running": pid is not None,
            "pid": pid
        }

    return status

def print_status():
    """Print formatted status."""
    status = get_status()

    print("\n" + "═" * 60)
    print("TINYPM AGENTIC TEAM STATUS")
    print("═" * 60)
    print(f"Timestamp: {status['timestamp']}")
    print("-" * 60)

    all_running = True
    for name, info in status["agents"].items():
        icon = "🟢" if info["running"] else "🔴"
        pid_str = f"PID: {info['pid']}" if info["pid"] else "NOT RUNNING"
        print(f"{icon} {name:15} | {info['description']:35} | {pid_str}")
        if not info["running"]:
            all_running = False

    print("-" * 60)
    if all_running:
        print("✅ ALL AGENTS ONLINE - Team is functioning!")
    else:
        print("⚠️  SOME AGENTS OFFLINE - Run 'python3 team_supervisor.py start'")
    print("═" * 60 + "\n")

    return all_running

def start_all():
    """Start all agents."""
    log("=" * 60)
    log("STARTING TINYPM AGENTIC TEAM")
    log("=" * 60)

    success = True
    for name in AGENTS:
        if not start_agent(name):
            success = False

    time.sleep(2)  # Let everything settle
    print_status()

    return success

def stop_all():
    """Stop all agents."""
    log("=" * 60)
    log("STOPPING TINYPM AGENTIC TEAM")
    log("=" * 60)

    for name in AGENTS:
        stop_agent(name)

    print_status()

def restart_all():
    """Restart all agents."""
    stop_all()
    time.sleep(2)
    start_all()

def monitor():
    """Monitor and restart crashed agents (run in foreground)."""
    log("=" * 60)
    log("MONITORING TINYPM AGENTIC TEAM")
    log("Press Ctrl+C to stop")
    log("=" * 60)

    try:
        while True:
            status = get_status()

            for name, info in status["agents"].items():
                if not info["running"] and AGENTS[name]["required"]:
                    log(f"⚠️ {name} died - restarting...", "WARN")
                    start_agent(name)

            time.sleep(30)  # Check every 30 seconds

    except KeyboardInterrupt:
        log("\nMonitoring stopped")

def main():
    os.chdir(TINYPM_DIR)

    if len(sys.argv) < 2:
        print("""
TinyPM Team Supervisor
━━━━━━━━━━━━━━━━━━━━━━
Usage:
    python3 team_supervisor.py start    - Start all agents
    python3 team_supervisor.py stop     - Stop all agents
    python3 team_supervisor.py restart  - Restart all agents
    python3 team_supervisor.py status   - Show agent status
    python3 team_supervisor.py monitor  - Monitor & auto-restart (foreground)
""")
        return

    command = sys.argv[1].lower()

    if command == "start":
        start_all()
    elif command == "stop":
        stop_all()
    elif command == "restart":
        restart_all()
    elif command == "status":
        print_status()
    elif command == "monitor":
        start_all()
        monitor()
    else:
        print(f"Unknown command: {command}")

if __name__ == "__main__":
    main()
