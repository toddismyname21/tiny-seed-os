#!/bin/bash
#═══════════════════════════════════════════════════════════════════════════════
# TINYPM TEAM LAUNCHER
# Start this script to bring the entire agentic team online
#═══════════════════════════════════════════════════════════════════════════════

cd "$(dirname "$0")"

echo "═══════════════════════════════════════════════════════════"
echo "🚀 TINYPM AGENTIC TEAM LAUNCHER"
echo "═══════════════════════════════════════════════════════════"

# Start the team
python3 team_supervisor.py start

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "USEFUL COMMANDS:"
echo "═══════════════════════════════════════════════════════════"
echo "  python3 team_supervisor.py status   - Check team status"
echo "  python3 team_supervisor.py stop     - Stop all agents"
echo "  python3 team_supervisor.py restart  - Restart all agents"
echo "  python3 team_supervisor.py monitor  - Monitor & auto-restart"
echo ""
echo "DASHBOARD: http://localhost:8000"
echo "═══════════════════════════════════════════════════════════"
