#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Agent Ask — Post a question to the TinyPM dashboard for the owner
# Usage: ./agent_ask.sh "Agent Name" "TASK-ID" "Your question here"
# Optional: ./agent_ask.sh "Agent Name" "TASK-ID" "Your question" "context info" "opt1,opt2,opt3"
# ═══════════════════════════════════════════════════════════

PORT="${TINYPM_PORT:-8000}"
AGENT_NAME="${1:-Unknown Agent}"
TASK_ID="${2:-}"
QUESTION="${3:-}"
CONTEXT="${4:-}"
OPTIONS="${5:-}"

if [ -z "$QUESTION" ]; then
  echo "Usage: ./agent_ask.sh \"Agent Name\" \"TASK-ID\" \"Your question\""
  echo "  Optional: ./agent_ask.sh \"Agent Name\" \"TASK-ID\" \"Question\" \"Context\" \"opt1,opt2,opt3\""
  exit 1
fi

# Build JSON payload
if [ -n "$OPTIONS" ]; then
  # Convert comma-separated options to JSON array
  OPTIONS_JSON=$(python3 -c "import json,sys; print(json.dumps(sys.argv[1].split(',')))" "$OPTIONS")
else
  OPTIONS_JSON="[]"
fi

PAYLOAD=$(python3 -c "
import json, sys
print(json.dumps({
    'agent': sys.argv[1],
    'task_id': sys.argv[2],
    'question': sys.argv[3],
    'context': sys.argv[4],
    'options': json.loads(sys.argv[5])
}))
" "$AGENT_NAME" "$TASK_ID" "$QUESTION" "$CONTEXT" "$OPTIONS_JSON")

RESULT=$(curl -s -X POST "http://localhost:${PORT}/api/agent/question" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

QID=$(echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('question_id','?'))" 2>/dev/null)

if echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); exit(0 if d.get('ok') else 1)" 2>/dev/null; then
  echo "✓ Question #${QID} posted to dashboard"
  echo "  Agent: $AGENT_NAME"
  echo "  Question: $QUESTION"
  echo ""
  echo "To wait for the answer:"
  echo "  ./agent_wait_answer.sh $QID"
else
  echo "✗ Failed to post question"
  echo "  Response: $RESULT"
  exit 1
fi
