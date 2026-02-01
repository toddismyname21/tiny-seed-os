#!/bin/bash
# ═══════════════════════════════════════════════════════════
# PM Chat Poller — Watches for dashboard messages and shows
# them to the PM orchestrator. Two-way communication.
#
# The PM responds using:  ./pm_reply.sh "message"
# Or the orchestrator writes directly to .pm_chat.json
# ═══════════════════════════════════════════════════════════

CHAT_FILE="/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.pm_chat.json"
POLL_INTERVAL=4
LAST_MSG_ID=0

echo "═══════════════════════════════════════════════════"
echo "  PM CHAT POLLER — Two-way dashboard messaging"
echo "  Polling every ${POLL_INTERVAL}s"
echo "  Reply with: ./pm_reply.sh \"your message\""
echo "═══════════════════════════════════════════════════"

# Get current max ID so we don't replay old messages
if [ -f "$CHAT_FILE" ]; then
  LAST_MSG_ID=$(python3 -c "
import json
try:
    chat = json.load(open('$CHAT_FILE'))
    ids = [m['id'] for m in chat.get('messages', [])]
    print(max(ids) if ids else 0)
except:
    print(0)
" 2>/dev/null)
fi

while true; do
  if [ -f "$CHAT_FILE" ]; then
    # Check for new user messages
    NEW_MSGS=$(python3 -c "
import json, sys
try:
    chat = json.load(open('$CHAT_FILE'))
    last = int(sys.argv[1])
    new_msgs = [m for m in chat.get('messages', []) if m['id'] > last and m.get('from') == 'user']
    if new_msgs:
        for m in new_msgs:
            print(f\"  [{m['timestamp'][:19]}] #{m['id']}: {m['message']}\")
        # Mark as read by PM
        for m in chat['messages']:
            if m['id'] > last and m.get('from') == 'user':
                m['read_by_pm'] = True
        json.dump(chat, open('$CHAT_FILE', 'w'), indent=2)
    # Print max id
    ids = [m['id'] for m in chat.get('messages', [])]
    max_id = max(ids) if ids else 0
    print(f'__MAX_ID__:{max_id}')
except Exception as e:
    print(f'__MAX_ID__:{sys.argv[1]}')
" "$LAST_MSG_ID" 2>/dev/null)

    # Extract max ID from output
    NEW_MAX=$(echo "$NEW_MSGS" | grep '__MAX_ID__' | cut -d: -f2)
    DISPLAY=$(echo "$NEW_MSGS" | grep -v '__MAX_ID__')

    if [ -n "$DISPLAY" ]; then
      echo ""
      echo "╔══════════════════════════════════════════════════╗"
      echo "║  INCOMING MESSAGE FROM DASHBOARD                ║"
      echo "╚══════════════════════════════════════════════════╝"
      echo "$DISPLAY"
      echo "  → Reply: ./pm_reply.sh \"your response\""
      echo ""
    fi

    if [ -n "$NEW_MAX" ]; then
      LAST_MSG_ID=$NEW_MAX
    fi
  fi
  sleep $POLL_INTERVAL
done
