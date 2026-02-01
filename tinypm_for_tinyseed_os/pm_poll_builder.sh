#!/bin/bash
# ═══════════════════════════════════════════════════════════
# PM Poll Builder — Watch for reports from Builder Claude
# Usage: ./pm_poll_builder.sh
# ═══════════════════════════════════════════════════════════

INTERCOM_FILE="/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.claude_intercom.json"
LAST_SEEN=0

echo "═══════════════════════════════════════════════════"
echo "  PM — Watching for Builder reports"
echo "  Polling every 3s"
echo "═══════════════════════════════════════════════════"
echo ""

while true; do
  if [ -f "$INTERCOM_FILE" ]; then
    REPORTS=$(python3 -c "
import json
with open('$INTERCOM_FILE') as f:
    data = json.load(f)

last_seen = $LAST_SEEN
new_msgs = [m for m in data.get('builder_to_pm', []) if m['id'] > last_seen and not m.get('read', False)]

for m in new_msgs:
    type_icon = '✅' if m['type'] == 'done' else '❓' if m['type'] == 'question' else '🚫' if m['type'] == 'blocked' else '📝'
    print(f'''
╔══════════════════════════════════════════════════╗
║  {type_icon} BUILDER REPORT — {m['type'].upper()}
╚══════════════════════════════════════════════════╝
  [{m['timestamp'][:19]}] #{m['id']}: {m['message']}
  Task: {m.get('task_ref', 'N/A')}
''')

if new_msgs:
    print(max(m['id'] for m in new_msgs))
else:
    print($LAST_SEEN)
" 2>/dev/null)

    LAST_SEEN=$(echo "$REPORTS" | tail -1)
    echo "$REPORTS" | head -n -1
  fi
  sleep 3
done
