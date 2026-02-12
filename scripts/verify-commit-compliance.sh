#!/bin/bash
# POST-COMMIT COMPLIANCE CHECK
# This runs AFTER commit and flags non-compliant commits

COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --format="%B")
FILES_CHANGED=$(git diff-tree --no-commit-id --name-only -r HEAD)

# Get lines changed (insertions + deletions) - handle first commit case
if git rev-parse HEAD~1 >/dev/null 2>&1; then
  STAT_LINE=$(git diff HEAD~1 --stat | tail -1)
  # Extract insertions and deletions from "X files changed, Y insertions(+), Z deletions(-)"
  INSERTIONS=$(echo "$STAT_LINE" | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo 0)
  DELETIONS=$(echo "$STAT_LINE" | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo 0)
  INSERTIONS=${INSERTIONS:-0}
  DELETIONS=${DELETIONS:-0}
  LINES_CHANGED=$((INSERTIONS + DELETIONS))
else
  LINES_CHANGED=0
fi

# Default to 0 if empty
LINES_CHANGED=${LINES_CHANGED:-0}

# Check if this was a significant commit (>50 lines)
if [ "$LINES_CHANGED" -gt 50 ]; then
  # Check for verification evidence
  if ! echo "$FILES_CHANGED" | grep -q "VERIFICATION_EVIDENCE.md"; then
    echo ""
    echo "========================================================================"
    echo "  COMPLIANCE WARNING: Commit $COMMIT_HASH"
    echo "========================================================================"
    echo "  - Lines changed: $LINES_CHANGED (threshold: 50)"
    echo "  - Missing: VERIFICATION_EVIDENCE.md"
    echo "  - Files changed:"
    echo "$FILES_CHANGED" | sed 's/^/      /'
    echo "========================================================================"

    # Ensure compliance log directory exists
    mkdir -p "$(git rev-parse --git-dir)"

    # Log to compliance file
    echo "$(date -Iseconds) | $COMMIT_HASH | NO_VERIFICATION | $LINES_CHANGED lines | $(echo $FILES_CHANGED | tr '\n' ' ')" >> "$(git rev-parse --git-dir)/compliance_log.txt"

    # If --no-verify was used or bypass keywords found, flag it
    if echo "$COMMIT_MSG" | grep -qi "no.verify\|bypass\|emergency\|skip.hook"; then
      echo ""
      echo "  ESCALATION REQUIRED: Bypass keywords detected in commit message."
      echo "  This commit requires human review."
      echo ""
      echo "$(date -Iseconds) | $COMMIT_HASH | BYPASS_USED | ESCALATE" >> "$(git rev-parse --git-dir)/compliance_log.txt"
    fi
  else
    echo ""
    echo "  COMPLIANCE OK: Commit includes verification evidence."
    echo ""
  fi
else
  echo ""
  echo "  COMPLIANCE OK: Commit has $LINES_CHANGED lines (under 50 threshold)."
  echo ""
fi
