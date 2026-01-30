#!/bin/bash
# ═══════════════════════════════════════════════════════════
# PM Reply — Send a response back to the user via TinyPM
# Usage: ./pm_reply.sh "Your response message here"
# ═══════════════════════════════════════════════════════════

CHAT_FILE="/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.pm_chat.json"
MESSAGE="$1"

if [ -z "$MESSAGE" ]; then
  echo "Usage: ./pm_reply.sh \"Your message\""
  exit 1
fi

python3 -c "
import json, sys
from datetime import datetime

chat_file = '$CHAT_FILE'
message = sys.argv[1]

try:
    with open(chat_file) as f:
        chat = json.load(f)
except:
    chat = {'messages': [], 'next_id': 1}

msg_id = chat['next_id']
chat['messages'].append({
    'id': msg_id,
    'from': 'pm',
    'message': message,
    'timestamp': datetime.now().isoformat(),
    'read_by_user': False
})
chat['next_id'] = msg_id + 1

with open(chat_file, 'w') as f:
    json.dump(chat, f, indent=2)

print(f'Reply sent (msg #{msg_id})')
" "$MESSAGE"
