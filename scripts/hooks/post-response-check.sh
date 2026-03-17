#!/bin/bash
# post-response-check.sh
# Hook: Stop
# Runs lightweight checks after every Claude response
# Exit 0 = advisory only, never blocks
# MUST be fast — no network calls, no heavy processing

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PHASE_FILE="$PROJECT_ROOT/.claude/rules/current-phase.md"

# Read stdin (hook input)
INPUT=$(cat)

WARNINGS=""

# Check 1: Uncommitted changes without CHANGE_LOG update
GIT_STATUS=$(cd "$PROJECT_ROOT" && git status --short 2>/dev/null)

if [ -n "$GIT_STATUS" ]; then
  # Check if implementation files are modified
  HAS_IMPL=$(echo "$GIT_STATUS" | grep -E '\.(html|js|css)' | grep -v 'CHANGE_LOG' | head -1)
  HAS_CHANGELOG=$(echo "$GIT_STATUS" | grep 'CHANGE_LOG.md')

  if [ -n "$HAS_IMPL" ] && [ -z "$HAS_CHANGELOG" ]; then
    WARNINGS="${WARNINGS}REMINDER: You have modified implementation files but haven't updated CHANGE_LOG.md yet.\n"
  fi
fi

# Check 2: BUILD phase with changed files — remind to transition to VERIFY
if [ -f "$PHASE_FILE" ]; then
  PHASE=$(head -1 "$PHASE_FILE" | sed 's/.*Phase: //' | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')
  if [ "$PHASE" = "build" ]; then
    DIFF_FILES=$(cd "$PROJECT_ROOT" && git diff --name-only 2>/dev/null)
    if [ -n "$DIFF_FILES" ]; then
      WARNINGS="${WARNINGS}PHASE REMINDER: You are in BUILD phase with uncommitted changes. Consider transitioning to VERIFY phase when implementation is complete.\n"
    fi
  fi
fi

# Output warnings as injected context if any
if [ -n "$WARNINGS" ]; then
  ESCAPED=$(echo -e "$WARNINGS" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 2>/dev/null)

  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "Stop",
    "additionalContext": ${ESCAPED}
  }
}
EOF
fi

exit 0
