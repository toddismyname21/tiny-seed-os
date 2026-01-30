#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Builder → PM — Report back to the PM Claude
# Usage: ./builder_to_pm.sh "done" "Login page complete with OAuth"
# Usage: ./builder_to_pm.sh "question" "Should I use JWT or session tokens?"
# Usage: ./builder_to_pm.sh "blocked" "Need API credentials for Stripe"
# ═══════════════════════════════════════════════════════════

INTERCOM_FILE="/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.claude_intercom.json"
TYPE="${1:-update}"
MESSAGE="$2"
TASK_REF="${3:-}"

if [ -z "$MESSAGE" ]; then
  echo "Usage: ./builder_to_pm.sh <type> \"message\" [task_ref]"
  echo "  Types: done, update, question, blocked, error"
  exit 1
fi

python3 -c "
import json, sys
from datetime import datetime

intercom_file = '$INTERCOM_FILE'
msg_type = sys.argv[1]
message = sys.argv[2]
task_ref = sys.argv[3] if len(sys.argv) > 3 else ''

try:
    with open(intercom_file) as f:
        data = json.load(f)
except:
    data = {'pm_to_builder': [], 'builder_to_pm': [], 'next_id': 1}

msg_id = data['next_id']
data['builder_to_pm'].append({
    'id': msg_id,
    'type': msg_type,
    'message': message,
    'task_ref': task_ref,
    'timestamp': datetime.now().isoformat(),
    'read': False
})
data['next_id'] = msg_id + 1

with open(intercom_file, 'w') as f:
    json.dump(data, f, indent=2)

print(f'✓ Sent to PM (#{msg_id}): [{msg_type.upper()}] {message[:60]}...' if len(message) > 60 else f'✓ Sent to PM (#{msg_id}): [{msg_type.upper()}] {message}')
" "$TYPE" "$MESSAGE" "$TASK_REF"

# RULE: When task is done, automatically start polling for next task
if [ "$TYPE" = "done" ]; then
  echo ""
  echo "════════════════════════════════════════════════════════"
  echo "  Task complete. Now polling for next task from PM..."
  echo "  (Ctrl+C to stop polling)"
  echo "════════════════════════════════════════════════════════"
  echo ""
  exec ./builder_poll.sh
fi
