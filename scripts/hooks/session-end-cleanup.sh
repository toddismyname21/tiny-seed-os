#!/bin/bash
# session-end-cleanup.sh
# Hook: SessionEnd
# Auto-saves session summary, warns about uncommitted work
# Exit 0 = always allow session end

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PHASE_FILE="$PROJECT_ROOT/.claude/rules/current-phase.md"
SUMMARY_FILE="/tmp/TINYSEED_LAST_SESSION.md"

# Read stdin (hook input)
INPUT=$(cat)

OUTPUT=""

# Check for uncommitted changes
GIT_STATUS=$(cd "$PROJECT_ROOT" && git status --short 2>/dev/null)

if [ -n "$GIT_STATUS" ]; then
  CHANGED_FILES=$(echo "$GIT_STATUS" | awk '{print $2}' | tr '\n' ', ' | sed 's/,$//')
  OUTPUT="WARNING: Session ending with uncommitted changes in: ${CHANGED_FILES}"
  echo "$OUTPUT"
fi

# Get current phase before resetting
CURRENT_PHASE="READY"
if [ -f "$PHASE_FILE" ]; then
  CURRENT_PHASE=$(head -1 "$PHASE_FILE" | sed 's/.*Phase: //' | tr -d '[:space:]')
fi

# Reset phase to READY for next session
cat > "$PHASE_FILE" <<'PHASEEOF'
# Current Work Phase: READY

No active phase constraint. Awaiting task assignment.

When a phase is active, this file will enforce:
- **RESEARCH**: No editing implementation files. Research, read, search only.
- **PLAN**: Present plan for approval. No editing implementation files.
- **BUILD**: Execute approved plan only. No features not in the plan.
- **VERIFY**: Read-only verification. No edits. Run verifier + integration-watcher.
- **DEPLOY**: Deploy approved changes. Update CHANGE_LOG. Push live.
PHASEEOF

# Write session summary
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
RECENT_COMMITS=$(cd "$PROJECT_ROOT" && git log --oneline -5 2>/dev/null)

cat > "$SUMMARY_FILE" <<SUMMARYEOF
# Tiny Seed OS — Last Session Summary

**Date/Time:** ${TIMESTAMP}
**Phase at Session End:** ${CURRENT_PHASE}

## Recent Commits (last 5)
${RECENT_COMMITS:-No commits found}

## Uncommitted Changes
${GIT_STATUS:-None}
SUMMARYEOF

exit 0
