#!/bin/bash
# ============================================================================
# TinyPM Brain Server Startup Script
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.brain_server.pid"
LOG_FILE="$SCRIPT_DIR/.brain_server.log"
PORT=8000

cd "$SCRIPT_DIR"

# Load environment
if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

start_foreground() {
    echo "Starting TinyPM Brain Server on port $PORT..."
    python3 brain_bridge.py --port $PORT
}

start_daemon() {
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if ps -p "$OLD_PID" > /dev/null 2>&1; then
            echo "Brain server already running (PID: $OLD_PID)"
            exit 0
        fi
    fi

    echo "Starting TinyPM Brain Server in background..."
    nohup python3 brain_bridge.py --port $PORT > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 2

    if ps -p $(cat "$PID_FILE") > /dev/null 2>&1; then
        echo "Brain server started (PID: $(cat $PID_FILE))"
        echo "Health check: http://localhost:$PORT/api/health"
    else
        echo "Failed to start. Check $LOG_FILE"
        exit 1
    fi
}

stop_server() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "Stopping Brain server (PID: $PID)..."
            kill "$PID"
            rm -f "$PID_FILE"
            echo "Stopped."
        else
            rm -f "$PID_FILE"
        fi
    fi
}

case "${1:-}" in
    daemon|bg) start_daemon ;;
    stop) stop_server ;;
    status) [ -f "$PID_FILE" ] && ps -p $(cat "$PID_FILE") > /dev/null 2>&1 && echo "RUNNING" || echo "STOPPED" ;;
    restart) stop_server; sleep 1; start_daemon ;;
    *) start_foreground ;;
esac
