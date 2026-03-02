#!/bin/bash
# teammate-idle-check.sh
# Hook: TeammateIdle — runs when an agent team teammate is about to go idle
# Exit 0 = allow idle, Exit 2 = keep working (stderr becomes feedback)

INPUT=$(cat)
TEAMMATE=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('teammate_name',''))" 2>/dev/null)
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Builders and organizers must update CHANGE_LOG.md after making changes
if [ "$TEAMMATE" = "fullstack-builder" ] || [ "$TEAMMATE" = "file-organizer" ]; then
  MODIFIED=$(cd "$PROJECT_ROOT" && git diff --name-only 2>/dev/null)
  if [ -n "$MODIFIED" ]; then
    if ! echo "$MODIFIED" | grep -q "CHANGE_LOG.md"; then
      echo "You have modified files but did not update CHANGE_LOG.md. Update it before stopping." >&2
      exit 2
    fi
  fi
fi

exit 0
