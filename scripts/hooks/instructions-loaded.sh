#!/bin/bash
# instructions-loaded.sh
# Hook: InstructionsLoaded
# Confirms which rules are active after CLAUDE.md or rules files load
# Advisory only — injects active phase as context

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PHASE_FILE="$PROJECT_ROOT/.claude/rules/current-phase.md"
LOCKS_FILE="$PROJECT_ROOT/.claude/rules/active-locks.md"

# Read stdin (hook input)
INPUT=$(cat)

CONTEXT=""

# Extract current phase
if [ -f "$PHASE_FILE" ]; then
  PHASE=$(head -1 "$PHASE_FILE" | sed 's/.*Phase: //' | tr -d '[:space:]')
  PHASE_BODY=$(cat "$PHASE_FILE")
  CONTEXT="=== ACTIVE PHASE: ${PHASE} ===\n${PHASE_BODY}\n\n"
else
  CONTEXT="=== ACTIVE PHASE: READY (no phase file found) ===\n\n"
fi

# Check for active locks
if [ -f "$LOCKS_FILE" ]; then
  if ! grep -q "No files currently locked" "$LOCKS_FILE"; then
    LOCKS_BODY=$(cat "$LOCKS_FILE")
    CONTEXT="${CONTEXT}=== ACTIVE FILE LOCKS ===\n${LOCKS_BODY}\n\n"
  fi
fi

ESCAPED_CONTEXT=$(echo -e "$CONTEXT" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 2>/dev/null)

cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "InstructionsLoaded",
    "additionalContext": ${ESCAPED_CONTEXT}
  }
}
EOF

exit 0
