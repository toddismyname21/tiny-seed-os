#!/usr/bin/env python3
"""
TinyPM Life Organizer Startup Script
═══════════════════════════════════════════════════════════════════════════════

CLI to start the Life Organizer background worker alongside or separately
from the web server.

Usage:
    # Start Life Organizer in foreground (blocks terminal)
    python3 start_life_organizer.py

    # Start as daemon (runs in background)
    python3 start_life_organizer.py --daemon

    # Start with web server
    python3 start_life_organizer.py --with-web

    # Check status
    python3 start_life_organizer.py status

    # Stop daemon
    python3 start_life_organizer.py stop

    # Trigger a specific job manually
    python3 start_life_organizer.py trigger --job email_check

Created: 2026-01-30
Author: Team 5 Builder (Claude)
"""

import argparse
import json
import os
import signal
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

APP_DIR = Path(__file__).parent
PID_FILE = APP_DIR / ".life_organizer.pid"
LOG_FILE = APP_DIR / ".life_organizer.log"
STATE_FILE = APP_DIR / ".life_organizer_state.json"

# ═══════════════════════════════════════════════════════════════════════════════
# BANNER
# ═══════════════════════════════════════════════════════════════════════════════

BANNER = """
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║    ████████╗██╗███╗   ██╗██╗   ██╗██████╗ ███╗   ███╗                        ║
║    ╚══██╔══╝██║████╗  ██║╚██╗ ██╔╝██╔══██╗████╗ ████║                        ║
║       ██║   ██║██╔██╗ ██║ ╚████╔╝ ██████╔╝██╔████╔██║                        ║
║       ██║   ██║██║╚██╗██║  ╚██╔╝  ██╔═══╝ ██║╚██╔╝██║                        ║
║       ██║   ██║██║ ╚████║   ██║   ██║     ██║ ╚═╝ ██║                        ║
║       ╚═╝   ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚═╝     ╚═╝     ╚═╝                        ║
║                                                                              ║
║              LIFE ORGANIZER - Always-On Proactive Engine                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""


# ═══════════════════════════════════════════════════════════════════════════════
# PID MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

def read_pid() -> int | None:
    """Read the PID from the PID file."""
    if PID_FILE.exists():
        try:
            return int(PID_FILE.read_text().strip())
        except:
            pass
    return None


def write_pid(pid: int) -> None:
    """Write the PID to the PID file."""
    PID_FILE.write_text(str(pid))


def clear_pid() -> None:
    """Clear the PID file."""
    if PID_FILE.exists():
        PID_FILE.unlink()


def is_running() -> bool:
    """Check if the Life Organizer is currently running."""
    pid = read_pid()
    if pid is None:
        return False

    try:
        # Check if process exists
        os.kill(pid, 0)
        return True
    except OSError:
        # Process doesn't exist, clean up stale PID file
        clear_pid()
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# COMMANDS
# ═══════════════════════════════════════════════════════════════════════════════

def cmd_start(args):
    """Start the Life Organizer."""
    print(BANNER)

    # Check if already running
    if is_running():
        print("[ERROR] Life Organizer is already running!")
        print(f"        PID: {read_pid()}")
        print("        Use 'stop' to stop it first.")
        return 1

    # Check for APScheduler
    try:
        import apscheduler
        print(f"[OK] APScheduler version: {apscheduler.__version__}")
    except ImportError:
        print("[ERROR] APScheduler not installed!")
        print("        Run: pip install apscheduler")
        return 1

    # Import Life Organizer
    try:
        from life_organizer import get_life_organizer
    except ImportError as e:
        print(f"[ERROR] Could not import Life Organizer: {e}")
        return 1

    # Create and start organizer
    organizer = get_life_organizer()

    if args.daemon:
        # Fork to background
        print("[INFO] Starting as daemon...")

        # Double fork to detach from terminal
        pid = os.fork()
        if pid > 0:
            # Parent process
            time.sleep(1)  # Give child time to start
            if is_running():
                print(f"[OK] Life Organizer started in background (PID: {read_pid()})")
            else:
                print("[ERROR] Life Organizer failed to start")
                return 1
            return 0

        # First child
        os.setsid()
        pid = os.fork()
        if pid > 0:
            os._exit(0)

        # Second child (daemon)
        # Redirect standard file descriptors
        sys.stdout.flush()
        sys.stderr.flush()

        # Write PID file
        write_pid(os.getpid())

        # Open log file for output
        with open(LOG_FILE, 'a') as log_file:
            sys.stdout = log_file
            sys.stderr = log_file

            # Start the organizer
            if organizer.start():
                print(f"\n[{datetime.now().isoformat()}] Life Organizer daemon started")

                # Run forever
                try:
                    while True:
                        time.sleep(60)
                except KeyboardInterrupt:
                    pass
                finally:
                    organizer.stop()
                    clear_pid()
                    print(f"[{datetime.now().isoformat()}] Life Organizer daemon stopped")
            else:
                print(f"[{datetime.now().isoformat()}] Failed to start Life Organizer")
                clear_pid()
                os._exit(1)

    else:
        # Run in foreground
        print("\n[INFO] Starting Life Organizer in foreground...")
        print("       Press Ctrl+C to stop.\n")

        # Write PID file
        write_pid(os.getpid())

        if organizer.start():
            print("[OK] Life Organizer is running!")
            print("\nScheduled jobs:")
            for job in organizer.scheduler.get_jobs():
                next_run = job.next_run_time.strftime("%Y-%m-%d %H:%M:%S") if job.next_run_time else "N/A"
                print(f"  - {job.name}: next run at {next_run}")

            print(f"\nLog file: {LOG_FILE}")
            print("\nWaiting for jobs... (Ctrl+C to stop)\n")

            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                print("\n\n[INFO] Shutting down...")
        else:
            print("[ERROR] Failed to start Life Organizer")
            clear_pid()
            return 1

        organizer.stop()
        clear_pid()
        print("[OK] Life Organizer stopped.")

    return 0


def cmd_stop(args):
    """Stop the Life Organizer."""
    print("[INFO] Stopping Life Organizer...")

    pid = read_pid()
    if pid is None:
        print("[INFO] Life Organizer is not running (no PID file)")
        return 0

    if not is_running():
        print("[INFO] Life Organizer is not running")
        clear_pid()
        return 0

    try:
        # Send SIGTERM
        os.kill(pid, signal.SIGTERM)
        print(f"[OK] Sent SIGTERM to PID {pid}")

        # Wait for process to exit
        for _ in range(10):
            time.sleep(0.5)
            try:
                os.kill(pid, 0)
            except OSError:
                # Process has exited
                clear_pid()
                print("[OK] Life Organizer stopped")
                return 0

        # Force kill if still running
        print("[WARN] Process didn't exit, sending SIGKILL...")
        os.kill(pid, signal.SIGKILL)
        time.sleep(1)
        clear_pid()
        print("[OK] Life Organizer killed")

    except OSError as e:
        print(f"[ERROR] Could not stop process: {e}")
        return 1

    return 0


def cmd_status(args):
    """Show Life Organizer status."""
    print("\n" + "=" * 60)
    print("Life Organizer Status")
    print("=" * 60)

    if is_running():
        pid = read_pid()
        print(f"\nStatus: RUNNING (PID: {pid})")
    else:
        print("\nStatus: STOPPED")

    # Load state
    if STATE_FILE.exists():
        try:
            state = json.loads(STATE_FILE.read_text())
            print(f"\nLast started: {state.get('started_at', 'N/A')}")
            print(f"Jobs run: {state.get('jobs_run', 0)}")
            print(f"Errors: {state.get('errors', 0)}")
            print(f"Nudges generated: {state.get('nudges_generated', 0)}")

            print("\nLast checks:")
            print(f"  - Email: {state.get('last_email_check', 'Never')}")
            print(f"  - Calendar: {state.get('last_calendar_check', 'Never')}")
            print(f"  - Relationships: {state.get('last_relationship_check', 'Never')}")
            print(f"  - Morning brief: {state.get('last_morning_brief', 'Never')}")

        except Exception as e:
            print(f"\n[WARN] Could not load state: {e}")

    # Check log file
    if LOG_FILE.exists():
        size_kb = LOG_FILE.stat().st_size / 1024
        print(f"\nLog file: {LOG_FILE}")
        print(f"Log size: {size_kb:.1f} KB")

        # Show last few lines
        try:
            lines = LOG_FILE.read_text().strip().split('\n')[-5:]
            if lines:
                print("\nRecent log entries:")
                for line in lines:
                    print(f"  {line}")
        except:
            pass

    print()
    return 0


def cmd_trigger(args):
    """Manually trigger a job."""
    if not args.job:
        print("[ERROR] --job is required")
        print("Available jobs: email_check, calendar_check, relationship_check, morning_brief, goal_check")
        return 1

    try:
        from life_organizer import get_life_organizer
        organizer = get_life_organizer()

        print(f"[INFO] Triggering job: {args.job}")

        # Run the job directly (don't need scheduler to be running)
        job_map = {
            "email_check": organizer.check_emails,
            "calendar_check": organizer.check_calendar,
            "relationship_check": organizer.check_relationships,
            "morning_brief": organizer.generate_morning_brief,
            "goal_check": organizer.check_goals
        }

        if args.job not in job_map:
            print(f"[ERROR] Unknown job: {args.job}")
            print("Available jobs: " + ", ".join(job_map.keys()))
            return 1

        result = job_map[args.job]()
        print(f"[OK] Job completed: {json.dumps(result, indent=2, default=str)}")
        return 0

    except Exception as e:
        print(f"[ERROR] Job failed: {e}")
        return 1


def cmd_logs(args):
    """Show log file."""
    if not LOG_FILE.exists():
        print("[INFO] No log file found")
        return 0

    lines = args.lines or 50
    try:
        all_lines = LOG_FILE.read_text().strip().split('\n')
        to_show = all_lines[-lines:]
        for line in to_show:
            print(line)
    except Exception as e:
        print(f"[ERROR] Could not read log: {e}")
        return 1

    return 0


def cmd_with_web(args):
    """Start Life Organizer alongside web server."""
    print(BANNER)

    # Check if already running
    if is_running():
        print("[WARN] Life Organizer is already running!")
        print("       Continuing with web server only...")
    else:
        print("[INFO] Starting Life Organizer...")
        try:
            from life_organizer import get_life_organizer
            organizer = get_life_organizer()
            if organizer.start():
                write_pid(os.getpid())
                print("[OK] Life Organizer started")
            else:
                print("[WARN] Failed to start Life Organizer")
        except Exception as e:
            print(f"[WARN] Could not start Life Organizer: {e}")

    # Start web server
    print("\n[INFO] Starting web server...")
    try:
        from web_server import run_server
        run_server(port=args.port or 8000)
    except ImportError:
        print("[INFO] Running web_server.py directly...")
        # SECURITY FIX 2026-02-28: Use subprocess.run instead of os.system
        import subprocess
        subprocess.run(["python3", str(APP_DIR / "web_server.py"), "--port", str(args.port or 8000)])

    # Cleanup
    if is_running():
        organizer.stop()
    clear_pid()


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="TinyPM Life Organizer - Always-On Proactive Engine",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                     Start in foreground
  %(prog)s --daemon            Start as background daemon
  %(prog)s status              Check status
  %(prog)s stop                Stop the daemon
  %(prog)s trigger --job email_check   Manually trigger a job
  %(prog)s logs                Show recent log entries
        """
    )

    parser.add_argument("command", nargs="?", default="start",
                       choices=["start", "stop", "status", "trigger", "logs"],
                       help="Command to run (default: start)")

    parser.add_argument("--daemon", "-d", action="store_true",
                       help="Run as background daemon")

    parser.add_argument("--with-web", "-w", action="store_true",
                       help="Start with web server")

    parser.add_argument("--job", type=str,
                       help="Job ID for trigger command")

    parser.add_argument("--port", type=int, default=8000,
                       help="Port for web server (default: 8000)")

    parser.add_argument("--lines", "-n", type=int, default=50,
                       help="Number of log lines to show (default: 50)")

    args = parser.parse_args()

    # Handle --with-web flag
    if args.with_web:
        return cmd_with_web(args)

    # Dispatch command
    commands = {
        "start": cmd_start,
        "stop": cmd_stop,
        "status": cmd_status,
        "trigger": cmd_trigger,
        "logs": cmd_logs
    }

    if args.command in commands:
        return commands[args.command](args)
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main() or 0)
