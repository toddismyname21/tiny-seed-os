#!/bin/bash
# PM Watch — Check dashboard every 30 seconds and show new messages
CHAT_FILE="/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.pm_chat.json"
LAST_ID=0

echo "═══════════════════════════════════════════════════"
echo "  PM WATCHING DASHBOARD — Checking every 30s"
echo "  Reply with: ./pm_reply.sh \"message\""
echo "═══════════════════════════════════════════════════"

while true; do
  NEW=$(python3 -c "
import json
with open('$CHAT_FILE') as f:
    d = json.load(f)
last = $LAST_ID
new_msgs = [m for m in d['messages'] if m['from'] == 'user' and m['id'] > last]
for m in new_msgs:
    print(f'''
╔══════════════════════════════════════════════════╗
║  📩 DASHBOARD MESSAGE                            ║
╚══════════════════════════════════════════════════╝
  #{m['id']}: {m['message']}
  → ./pm_reply.sh \"your response\"
''')
if new_msgs:
    print('LAST:' + str(max(m['id'] for m in new_msgs)))
else:
    print('LAST:$LAST_ID')
" 2>/dev/null)
  
  LAST_LINE=$(echo "$NEW" | grep "^LAST:" | cut -d: -f2)
  if [ -n "$LAST_LINE" ]; then
    LAST_ID=$LAST_LINE
  fi
  echo "$NEW" | grep -v "^LAST:"
  sleep 30
done
