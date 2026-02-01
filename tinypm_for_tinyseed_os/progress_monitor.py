#!/usr/bin/env python3
#!/usr/bin/env python3
"""
TinyPM Progress Monitor
═══════════════════════════════════════════════════════════════
Runs alongside the web server. Watches agent output files and
automatically updates task progress in board.json.

Usage:
    python3 progress_monitor.py          # Run continuously
    python3 progress_monitor.py --status # Show current status
    python3 progress_monitor.py --once   # Update once and exit
"""
import argparse
import json
import os
import time
from pathlib import Path

APP_DIR = Path(__file__).parent
BOARD_FILE = APP_DIR / "board.json"

# Agent output directory (where Claude Code writes background task output)
AGENT_OUTPUT_DIR = Path("/private/tmp/claude/-Users-samanthapollack-Documents-TIny-Seed-OS/tasks")

# Map agent IDs to task IDs (updated by the orchestrator)
AGENT_MAP_FILE = APP_DIR / ".agent_map.json"

POLL_INTERVAL = 5  # seconds


def load_board():
    if BOARD_FILE.exists():
        with open(BOARD_FILE) as f:
            return json.load(f)
    return {"version": "1.0", "project": "Tiny Seed Farm OS", "tasks": [], "next_id": 1}


def save_board(board):
    with open(BOARD_FILE, "w") as f:
        json.dump(board, f, indent=2)


def load_agent_map():
    if AGENT_MAP_FILE.exists():
        with open(AGENT_MAP_FILE) as f:
            return json.load(f)
    return {}


def estimate_progress(output_file: Path) -> tuple:
    """Estimate progress from agent output file size and content."""
    if not output_file.exists():
        return 0, "Waiting to start..."

    try:
        content = output_file.read_text(errors="replace")
    except:
        return 5, "Starting up..."

    size = len(content)
    lines = content.count("\n")

    # Check for completion signals
    lower = content.lower()
    if "completed" in lower[-500:] or "done" in lower[-500:] or "finished" in lower[-500:]:
        return 95, "Finishing up..."
    if "error" in lower[-200:] and "fix" not in lower[-200:]:
        return -1, "Hit an error"

    # Look for action keywords to estimate phase
    has_read = "Read(" in content or "reading" in lower
    has_edit = "Edit(" in content or "Write(" in content
    has_search = "Grep(" in content or "Glob(" in content

    # Estimate based on output volume and actions
    if size < 1000:
        pct = 5
        label = "Initializing..."
    elif size < 5000:
        pct = 15
        label = "Reading files..."
    elif size < 15000:
        pct = 30
        label = "Analyzing codebase..."
    elif size < 30000:
        pct = 45
        label = "Planning changes..."
    elif size < 50000:
        pct = 60
        label = "Writing code..."
    elif size < 80000:
        pct = 75
        label = "Implementing changes..."
    elif size < 120000:
        pct = 85
        label = "Testing & verifying..."
    else:
        pct = 90
        label = "Wrapping up..."

    # Refine with action detection
    if has_edit and pct < 60:
        pct = max(pct, 55)
        label = "Writing code..."
    if has_read and not has_edit and pct > 40:
        pct = min(pct, 40)
        label = "Still reading & analyzing..."

    return pct, label


def check_agent_done(output_file: Path) -> bool:
    """Check if agent output file indicates completion."""
    if not output_file.exists():
        return False
    try:
        # Check if file hasn't been modified in 30+ seconds (agent likely done)
        mtime = output_file.stat().st_mtime
        if time.time() - mtime > 30:
            content = output_file.read_text(errors="replace")
            # If substantial output and stale, likely done
            if len(content) > 5000:
                return True
    except:
        pass
    return False


def update_progress():
    """Main progress update loop."""
    agent_map = load_agent_map()
    if not agent_map:
        return

    board = load_board()
    changed = False

    for agent_id, task_id in agent_map.items():
        output_file = AGENT_OUTPUT_DIR / f"{agent_id}.output"

        # Find the task
        task = None
        for t in board.get("tasks", []):
            if t.get("id") == task_id:
                task = t
                break

        if not task or task.get("status") != "in_progress":
            continue

        pct, label = estimate_progress(output_file)
        if pct < 0:
            # Error state
            task["progress"] = task.get("progress", 0)
            task["progress_label"] = label
            changed = True
            continue

        # Only update if progress increased
        current = task.get("progress", 0)
        if pct > current:
            task["progress"] = pct
            task["progress_label"] = label
            changed = True

        # Check if done
        if check_agent_done(output_file) and pct >= 85:
            task["progress"] = 100
            task["progress_label"] = "Complete"
            task["status"] = "done"
            changed = True

    if changed:
        save_board(board)


def run_monitor():
    """Run the progress monitor continuously."""
    print("[Progress Monitor] Starting...")
    print(f"[Progress Monitor] Watching: {AGENT_OUTPUT_DIR}")
    print(f"[Progress Monitor] Agent map: {AGENT_MAP_FILE}")
    print(f"[Progress Monitor] Board file: {BOARD_FILE}")
    print(f"[Progress Monitor] Poll interval: {POLL_INTERVAL}s")
    print("-" * 60)

    while True:
        try:
            update_progress()
        except Exception as e:
            print(f"[Progress Monitor] Error: {e}")
        time.sleep(POLL_INTERVAL)


def show_status():
    """Show current status of agents and tasks."""
    board = load_board()
    agent_map = load_agent_map()

    in_progress = [t for t in board.get("tasks", []) if t.get("status") == "in_progress"]
    pending = [t for t in board.get("tasks", []) if t.get("status") == "pending"]
    done = [t for t in board.get("tasks", []) if t.get("status") == "done"]

    print(f"""
TinyPM Progress Monitor Status
═══════════════════════════════════════════════════════════════
  Board file:          {BOARD_FILE}
  Agent output dir:    {AGENT_OUTPUT_DIR}
  Agent map file:      {AGENT_MAP_FILE}
  Poll interval:       {POLL_INTERVAL}s

Tasks Summary:
  Pending:             {len(pending)}
  In Progress:         {len(in_progress)}
  Done:                {len(done)}
  Total:               {len(board.get("tasks", []))}

Active Agent Mapping:
""")

    if agent_map:
        for agent_id, task_id in agent_map.items():
            output_file = AGENT_OUTPUT_DIR / f"{agent_id}.output"
            pct, label = estimate_progress(output_file)
            exists = output_file.exists()
            size = output_file.stat().st_size if exists else 0
            print(f"  Agent {agent_id[:8]}... -> Task {task_id}")
            print(f"    Output: {'EXISTS' if exists else 'MISSING'} ({size} bytes)")
            print(f"    Progress: {pct}% - {label}")
    else:
        print("  No agents currently mapped to tasks.")

    print()

    if in_progress:
        print("In-Progress Tasks:")
        for t in in_progress:
            progress = t.get("progress", 0)
            label = t.get("progress_label", "")
            print(f"  [{t['id']}] {t['title'][:40]}...")
            print(f"    Progress: {progress}% - {label}")
            if t.get("assigned_agent"):
                print(f"    Agent: {t['assigned_agent']}")
    print()


def update_once():
    """Run one update cycle and exit."""
    print("[Progress Monitor] Running single update...")

    agent_map = load_agent_map()
    if not agent_map:
        print("[Progress Monitor] No agents mapped. Nothing to update.")
        return

    board = load_board()
    changes_made = False

    for agent_id, task_id in agent_map.items():
        output_file = AGENT_OUTPUT_DIR / f"{agent_id}.output"

        for task in board.get("tasks", []):
            if task.get("id") == task_id and task.get("status") == "in_progress":
                pct, label = estimate_progress(output_file)
                old_pct = task.get("progress", 0)

                if pct != old_pct:
                    task["progress"] = pct
                    task["progress_label"] = label
                    changes_made = True
                    print(f"  [{task_id}] {old_pct}% -> {pct}% ({label})")

                if check_agent_done(output_file) and pct >= 85:
                    task["progress"] = 100
                    task["progress_label"] = "Complete"
                    task["status"] = "done"
                    changes_made = True
                    print(f"  [{task_id}] COMPLETED!")

    if changes_made:
        save_board(board)
        print("[Progress Monitor] Board updated.")
    else:
        print("[Progress Monitor] No changes detected.")


def main():
    """Main entry point with CLI argument parsing."""
    global POLL_INTERVAL

    parser = argparse.ArgumentParser(
        description="TinyPM Progress Monitor - Track agent task progress",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python progress_monitor.py              # Run continuously
  python progress_monitor.py --status     # Show current status
  python progress_monitor.py --once       # Update once and exit
  python progress_monitor.py --interval 3 # Poll every 3 seconds

The Progress Monitor watches Claude agent output files and automatically
updates task progress in board.json based on output size and content.
"""
    )
    parser.add_argument("--status", action="store_true",
                       help="Show current status and exit")
    parser.add_argument("--once", action="store_true",
                       help="Run one update cycle and exit")
    parser.add_argument("--interval", type=int, default=POLL_INTERVAL,
                       help=f"Poll interval in seconds (default: {POLL_INTERVAL})")

    args = parser.parse_args()

    if args.status:
        show_status()
        return

    if args.once:
        update_once()
        return

    POLL_INTERVAL = args.interval

    run_monitor()


if __name__ == "__main__":
    main()
