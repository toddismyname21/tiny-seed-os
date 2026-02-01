#!/usr/bin/env python3
"""
===============================================================================
TinyPM Multi-Server Launcher
===============================================================================

Starts both:
1. Web Dashboard Server (port 8000) - Main UI and REST API
2. A2A Protocol Server (port 9000) - Agent-to-Agent interoperability

Usage:
    python3 start_servers.py                    # Start both servers
    python3 start_servers.py --web-only         # Start only web server
    python3 start_servers.py --a2a-only         # Start only A2A server
    python3 start_servers.py --web-port 8080    # Custom web port
    python3 start_servers.py --a2a-port 9001    # Custom A2A port

Created: 2026-01-31
"""

import argparse
import os
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path

APP_DIR = Path(__file__).parent
VENV_PYTHON = APP_DIR / ".mcp_venv" / "bin" / "python3"

# Use venv python if available, otherwise system python
PYTHON = str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable


def start_web_server(port: int):
    """Start the web dashboard server."""
    print(f"[Launcher] Starting Web Server on port {port}...")
    return subprocess.Popen(
        [PYTHON, str(APP_DIR / "web_server.py"), "--port", str(port)],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        cwd=str(APP_DIR)
    )


def start_a2a_server(port: int):
    """Start the A2A protocol server."""
    print(f"[Launcher] Starting A2A Server on port {port}...")
    return subprocess.Popen(
        [PYTHON, str(APP_DIR / "a2a_server.py"), "--port", str(port)],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        cwd=str(APP_DIR)
    )


def stream_output(process, name):
    """Stream process output to console."""
    for line in iter(process.stdout.readline, b''):
        try:
            text = line.decode('utf-8', errors='replace').rstrip()
            if text:
                print(f"[{name}] {text}")
        except:
            pass


def main():
    parser = argparse.ArgumentParser(description="TinyPM Multi-Server Launcher")
    parser.add_argument("--web-port", type=int, default=8000, help="Web server port")
    parser.add_argument("--a2a-port", type=int, default=9000, help="A2A server port")
    parser.add_argument("--web-only", action="store_true", help="Start only web server")
    parser.add_argument("--a2a-only", action="store_true", help="Start only A2A server")
    args = parser.parse_args()

    processes = []
    threads = []

    print("""
╔═══════════════════════════════════════════════════════════════════════╗
║                    TinyPM Server Launcher                             ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Web Dashboard:  http://localhost:{web_port:<5}                           ║
║  A2A Protocol:   http://localhost:{a2a_port:<5}                           ║
║  Agent Card:     http://localhost:{a2a_port:<5}/.well-known/agent.json    ║
╚═══════════════════════════════════════════════════════════════════════╝
    """.format(web_port=args.web_port, a2a_port=args.a2a_port))

    def cleanup(signum, frame):
        print("\n[Launcher] Shutting down servers...")
        for p in processes:
            try:
                p.terminate()
                p.wait(timeout=5)
            except:
                p.kill()
        print("[Launcher] All servers stopped.")
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    try:
        # Start servers
        if not args.a2a_only:
            web_proc = start_web_server(args.web_port)
            processes.append(web_proc)
            t = threading.Thread(target=stream_output, args=(web_proc, "Web"), daemon=True)
            t.start()
            threads.append(t)

        if not args.web_only:
            a2a_proc = start_a2a_server(args.a2a_port)
            processes.append(a2a_proc)
            t = threading.Thread(target=stream_output, args=(a2a_proc, "A2A"), daemon=True)
            t.start()
            threads.append(t)

        # Wait for servers
        print("[Launcher] Servers starting up...")
        time.sleep(3)
        print("[Launcher] Servers are running. Press Ctrl+C to stop.")

        # Keep running
        while True:
            for p in processes:
                if p.poll() is not None:
                    print(f"[Launcher] A server exited with code {p.returncode}")
            time.sleep(1)

    except KeyboardInterrupt:
        cleanup(None, None)


if __name__ == "__main__":
    main()
