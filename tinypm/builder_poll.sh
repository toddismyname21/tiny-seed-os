#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Builder Poll — Watch for tasks from PM Claude
# Usage: ./builder_poll.sh
# Polls every 3 seconds, shows new tasks as they arrive
# Sends heartbeat every 60 seconds to indicate active status
# ═══════════════════════════════════════════════════════════

INTERCOM_FILE="/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.claude_intercom.json"
HEARTBEAT_FILE="/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.builder_heartbeat.json"
LAST_SEEN=0
HEARTBEAT_INTERVAL=60
POLL_INTERVAL=3
LAST_HEARTBEAT=0
CURRENT_TASK=""

# Send heartbeat function
send_heartbeat() {
  local now=$(date +%s)
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # Write heartbeat file
  cat > "$HEARTBEAT_FILE" << EOF
{
  "status": "active",
  "last_heartbeat": "$timestamp",
  "current_task": "$CURRENT_TASK",
  "uptime_seconds": $((now - START_TIME)),
  "polls_count": $POLL_COUNT
}
EOF

  # Also log to intercom as a builder message (type: heartbeat)
  python3 -c "
import json
from datetime import datetime

with open('$INTERCOM_FILE', 'r') as f:
    data = json.load(f)

# Add heartbeat to builder_to_pm
hb = {
    'id': data.get('next_id', 1),
    'type': 'heartbeat',
    'message': 'Builder active',
    'status': 'active',
    'current_task': '$CURRENT_TASK' or None,
    'uptime_seconds': $((now - START_TIME)),
    'timestamp': datetime.now().isoformat(),
    'read': False
}
data['builder_to_pm'].append(hb)
data['next_id'] = hb['id'] + 1

with open('$INTERCOM_FILE', 'w') as f:
    json.dump(data, f, indent=2)
" 2>/dev/null

  echo "  💓 Heartbeat sent ($timestamp)"
}

START_TIME=$(date +%s)
POLL_COUNT=0

echo "═══════════════════════════════════════════════════"
echo "  BUILDER — Waiting for tasks from PM"
echo "  Polling every ${POLL_INTERVAL}s | Heartbeat every ${HEARTBEAT_INTERVAL}s"
echo "  Reply with: ./builder_to_pm.sh \"done\" \"message\""
echo "═══════════════════════════════════════════════════"
echo ""

# Initial heartbeat
send_heartbeat

while true; do
  POLL_COUNT=$((POLL_COUNT + 1))

  # Check if heartbeat is due
  NOW=$(date +%s)
  if [ $((NOW - LAST_HEARTBEAT)) -ge $HEARTBEAT_INTERVAL ]; then
    send_heartbeat
    LAST_HEARTBEAT=$NOW
  fi
  if [ -f "$INTERCOM_FILE" ]; then
    NEW_TASKS=$(python3 -c "
import json
with open('$INTERCOM_FILE') as f:
    data = json.load(f)

last_seen = $LAST_SEEN
new_msgs = [m for m in data.get('pm_to_builder', []) if m['id'] > last_seen and not m.get('read', False)]

for m in new_msgs:
    priority_icon = '🔴' if m.get('priority') == 'critical' else '🟡' if m.get('priority') == 'high' else '⚪'
    print(f'''
╔══════════════════════════════════════════════════╗
║  {priority_icon} INCOMING FROM PM — {m['type'].upper()}
╚══════════════════════════════════════════════════╝
  [{m['timestamp'][:19]}] #{m['id']}: {m['message']}
  → Reply: ./builder_to_pm.sh \"done\" \"your response\"
''')

if new_msgs:
    print(max(m['id'] for m in new_msgs))
else:
    print($LAST_SEEN)
" 2>/dev/null)

    # Extract the last line as the new LAST_SEEN value
    LAST_SEEN=$(echo "$NEW_TASKS" | tail -1)
    # Print everything except the last line (macOS compatible)
    LINES=$(echo "$NEW_TASKS" | wc -l | tr -d ' ')
    if [ "$LINES" -gt 1 ]; then
      echo "$NEW_TASKS" | head -n $((LINES - 1))
    fi
  fi
  sleep $POLL_INTERVAL
done
