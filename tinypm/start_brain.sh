#!/bin/bash
#===============================================================================
# START BRAIN - Launch TinyPM Brain Bridge for Chief of Staff
#===============================================================================
#
# This script starts the Brain Bridge server which connects TinyPM's
# intelligence layer to the Tiny Seed OS Chief of Staff interface.
#
# Usage:
#   ./start_brain.sh              # Start brain server
#   ./start_brain.sh --daemon     # Start in background
#   ./start_brain.sh --status     # Check if running
#   ./start_brain.sh --stop       # Stop daemon
#   ./start_brain.sh --health     # Health check
#
# Created: 2026-02-01
# Author: Build Team 1 - Brain Core Setup
#===============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRAIN_BRIDGE="${SCRIPT_DIR}/brain_bridge.py"
PID_FILE="${SCRIPT_DIR}/.brain_bridge.pid"
LOG_FILE="${SCRIPT_DIR}/.brain_bridge.log"
PORT="${BRAIN_PORT:-8000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f "${SCRIPT_DIR}/.env" ]; then
    set -a
    source "${SCRIPT_DIR}/.env"
    set +a
    echo -e "${GREEN}[Brain] Loaded environment from .env${NC}"
fi

# Function: Check if brain is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Function: Show status
status() {
    echo -e "${BLUE}=== Brain Bridge Status ===${NC}"
    if is_running; then
        local pid=$(cat "$PID_FILE")
        echo -e "${GREEN}Status: Running (PID: $pid)${NC}"
        echo -e "Port: $PORT"
        echo -e "Log: $LOG_FILE"

        # Check health endpoint
        if command -v curl &> /dev/null; then
            echo ""
            echo "Health check:"
            curl -s "http://localhost:${PORT}/api/health" 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "Unable to reach health endpoint"
        fi
    else
        echo -e "${YELLOW}Status: Not running${NC}"
    fi
}

# Function: Start brain in foreground
start_foreground() {
    echo -e "${BLUE}=== Starting Brain Bridge ===${NC}"
    echo -e "Port: $PORT"
    echo ""

    cd "$SCRIPT_DIR"
    python3 "$BRAIN_BRIDGE" --port "$PORT"
}

# Function: Start brain as daemon
start_daemon() {
    if is_running; then
        local pid=$(cat "$PID_FILE")
        echo -e "${YELLOW}Brain Bridge already running (PID: $pid)${NC}"
        return 1
    fi

    echo -e "${BLUE}=== Starting Brain Bridge (daemon mode) ===${NC}"

    cd "$SCRIPT_DIR"
    nohup python3 "$BRAIN_BRIDGE" --port "$PORT" > "$LOG_FILE" 2>&1 &
    local pid=$!
    echo $pid > "$PID_FILE"

    sleep 2

    if is_running; then
        echo -e "${GREEN}Brain Bridge started successfully (PID: $pid)${NC}"
        echo -e "Logs: $LOG_FILE"
        echo -e "Port: $PORT"
    else
        echo -e "${RED}Failed to start Brain Bridge${NC}"
        echo "Check logs: $LOG_FILE"
        return 1
    fi
}

# Function: Stop brain daemon
stop_daemon() {
    if ! is_running; then
        echo -e "${YELLOW}Brain Bridge is not running${NC}"
        return 0
    fi

    local pid=$(cat "$PID_FILE")
    echo -e "${BLUE}Stopping Brain Bridge (PID: $pid)...${NC}"

    kill "$pid" 2>/dev/null || true
    sleep 2

    if ps -p "$pid" > /dev/null 2>&1; then
        echo -e "${YELLOW}Sending SIGKILL...${NC}"
        kill -9 "$pid" 2>/dev/null || true
    fi

    rm -f "$PID_FILE"
    echo -e "${GREEN}Brain Bridge stopped${NC}"
}

# Function: Health check
health_check() {
    echo -e "${BLUE}=== Brain Bridge Health Check ===${NC}"

    cd "$SCRIPT_DIR"
    python3 "$BRAIN_BRIDGE" --health

    echo ""

    if is_running; then
        echo "Server status: Running"
        if command -v curl &> /dev/null; then
            echo ""
            echo "API Health:"
            curl -s "http://localhost:${PORT}/api/health" 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "Unable to reach server"
        fi
    else
        echo "Server status: Not running"
    fi
}

# Function: Show help
show_help() {
    echo "TinyPM Brain Bridge Launcher"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  (no option)    Start brain server in foreground"
    echo "  --daemon       Start brain server in background"
    echo "  --status       Show current status"
    echo "  --stop         Stop background daemon"
    echo "  --health       Run health check"
    echo "  --restart      Restart daemon"
    echo "  --help         Show this help"
    echo ""
    echo "Environment:"
    echo "  BRAIN_PORT     Server port (default: 8000)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Start in foreground"
    echo "  $0 --daemon           # Start in background"
    echo "  BRAIN_PORT=9000 $0    # Use custom port"
}

# Main
case "${1:-}" in
    --daemon)
        start_daemon
        ;;
    --status)
        status
        ;;
    --stop)
        stop_daemon
        ;;
    --health)
        health_check
        ;;
    --restart)
        stop_daemon
        sleep 1
        start_daemon
        ;;
    --help|-h)
        show_help
        ;;
    "")
        start_foreground
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        echo "Use --help for usage information"
        exit 1
        ;;
esac
