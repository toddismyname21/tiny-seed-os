#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Agent Wait Answer — Poll until the owner answers a question
# Usage: ./agent_wait_answer.sh <question_id> [timeout_seconds]
# Returns the answer text on stdout (for piping into agent context)
# ═══════════════════════════════════════════════════════════

QID="${1:-}"
TIMEOUT="${2:-300}"  # Default 5 min timeout
ANSWER_FILE="/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.agent_answer_${QID}.json"

if [ -z "$QID" ]; then
  echo "Usage: ./agent_wait_answer.sh <question_id> [timeout_seconds]"
  exit 1
fi

echo "Waiting for answer to question #${QID} (timeout: ${TIMEOUT}s)..." >&2

ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
  if [ -f "$ANSWER_FILE" ]; then
    ANSWER=$(python3 -c "import json; d=json.load(open('$ANSWER_FILE')); print(d['answer'])")
    echo "$ANSWER"
    echo "✓ Got answer after ${ELAPSED}s" >&2
    exit 0
  fi
  sleep 3
  ELAPSED=$((ELAPSED + 3))
done

echo "✗ Timed out after ${TIMEOUT}s — no answer received" >&2
exit 1
