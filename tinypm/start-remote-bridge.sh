#!/bin/bash
# TinyPM Remote Terminal Bridge Launcher
# ======================================
# Starts the WebSocket bridge for remote Claude Code access
#
# Usage:
#   ./start-remote-bridge.sh              # Start with defaults
#   ./start-remote-bridge.sh --port 9000  # Custom port
#   ./start-remote-bridge.sh stop         # Stop the bridge
#   ./start-remote-bridge.sh status       # Check status
#   ./start-remote-bridge.sh token        # Generate new token

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "═══════════════════════════════════════════════════════════"
echo "  TinyPM Remote Terminal Bridge"
echo "═══════════════════════════════════════════════════════════"
echo -e "${NC}"

# Check for websockets
if ! python3 -c "import websockets" 2>/dev/null; then
    echo -e "${YELLOW}Installing websockets library...${NC}"
    pip3 install websockets
    echo ""
fi

# Handle commands
case "${1:-start}" in
    stop)
        echo -e "${YELLOW}Stopping bridge...${NC}"
        python3 remote_terminal_bridge.py stop
        ;;
    status)
        python3 remote_terminal_bridge.py status
        ;;
    token)
        shift
        python3 remote_terminal_bridge.py token "$@"
        ;;
    connect)
        shift
        python3 remote_terminal_bridge.py connect "$@"
        ;;
    start|*)
        # Check if already running
        if [ -f ".remote_bridge.pid" ]; then
            PID=$(cat .remote_bridge.pid)
            if kill -0 "$PID" 2>/dev/null; then
                echo -e "${YELLOW}Bridge already running (PID $PID)${NC}"
                echo ""
                python3 remote_terminal_bridge.py status
                exit 0
            fi
        fi

        # Check for existing token
        if [ ! -f ".remote_bridge_tokens.json" ] || [ "$(python3 -c 'import json; print(len(json.load(open(".remote_bridge_tokens.json"))))')" = "0" ] 2>/dev/null; then
            echo -e "${YELLOW}No access tokens found. Generating one...${NC}"
            echo ""
            python3 remote_terminal_bridge.py token new --name "default"
            echo ""
            echo -e "${GREEN}Save the token above - you'll need it to connect!${NC}"
            echo ""
        fi

        echo -e "${GREEN}Starting bridge server...${NC}"
        echo ""
        python3 remote_terminal_bridge.py start "$@"
        ;;
esac
