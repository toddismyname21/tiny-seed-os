#!/bin/bash
# ═══════════════════════════════════════════════════════════
# PM → Builder — Send a task or message to the Builder Claude
# Usage: ./pm_to_builder.sh "task" "Build the login page with OAuth"
# Usage: ./pm_to_builder.sh "message" "How's progress on the feature?"
# ═══════════════════════════════════════════════════════════

INTERCOM_FILE="/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.claude_intercom.json"
TYPE="${1:-task}"
MESSAGE="$2"
PRIORITY="${3:-normal}"

if [ -z "$MESSAGE" ]; then
  echo "Usage: ./pm_to_builder.sh <type> \"message\" [priority]"
  echo "  Types: task, message, urgent, question"
  echo "  Priority: normal, high, critical"
  exit 1
fi

python3 -c "
import json, sys
from datetime import datetime

intercom_file = '$INTERCOM_FILE'
msg_type = sys.argv[1]
message = sys.argv[2]
priority = sys.argv[3]

try:
    with open(intercom_file) as f:
        data = json.load(f)
except:
    data = {'pm_to_builder': [], 'builder_to_pm': [], 'next_id': 1}

msg_id = data['next_id']
data['pm_to_builder'].append({
    'id': msg_id,
    'type': msg_type,
    'message': message,
    'priority': priority,
    'timestamp': datetime.now().isoformat(),
    'status': 'pending',
    'read': False
})
data['next_id'] = msg_id + 1

with open(intercom_file, 'w') as f:
    json.dump(data, f, indent=2)

print(f'✓ Sent to Builder (#{msg_id}): [{msg_type.upper()}] {message[:60]}...' if len(message) > 60 else f'✓ Sent to Builder (#{msg_id}): [{msg_type.upper()}] {message}')
" "$TYPE" "$MESSAGE" "$PRIORITY"
