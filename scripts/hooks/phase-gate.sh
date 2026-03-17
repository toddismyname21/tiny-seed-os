#!/bin/bash
# phase-gate.sh
# Hook: PreToolUse on Edit|Write|MultiEdit
# Blocks file edits during research/plan/verify phases
# Exit 0 = allow, Exit 2 = block

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PHASE_FILE="$PROJECT_ROOT/.claude/rules/current-phase.md"

# Read the tool input from stdin
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)

# If no file path, allow
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# If phase file doesn't exist, allow
if [ ! -f "$PHASE_FILE" ]; then
  exit 0
fi

# Extract current phase from first line (format: "# Current Work Phase: XXXX")
PHASE=$(head -1 "$PHASE_FILE" | sed 's/.*Phase: //' | tr '[:lower:]' '[:upper:]' | tr -d '[:space:]')

# BUILD, DEPLOY, READY — allow all edits
case "$PHASE" in
  BUILD|DEPLOY|READY)
    exit 0
    ;;
esac

# RESEARCH, PLAN, VERIFY — block implementation files only
case "$PHASE" in
  RESEARCH|PLAN|VERIFY)
    # Check if this is an implementation file
    IS_IMPL=false
    BASENAME=$(basename "$FILE_PATH")

    if echo "$FILE_PATH" | grep -qiE '\.(html|css)$'; then
      IS_IMPL=true
    elif echo "$BASENAME" | grep -qiE '^MERGED TOTAL\.js$'; then
      IS_IMPL=true
    elif echo "$FILE_PATH" | grep -qiE '\.js$'; then
      # Allow config/meta JS files
      if ! echo "$BASENAME" | grep -qiE '(CLAUDE|config|package|tsconfig|settings)'; then
        IS_IMPL=true
      fi
    fi

    if [ "$IS_IMPL" = true ]; then
      PHASE_RULES=$(tail -n +3 "$PHASE_FILE")
      echo "BLOCKED: Cannot edit implementation files during ${PHASE} phase."
      echo "File: ${FILE_PATH}"
      echo "Current phase rules:"
      echo "$PHASE_RULES"
      exit 2
    fi

    # Non-implementation files (.md, .json, .sh, rules, memory) — always allowed
    exit 0
    ;;
esac

# Unknown phase — allow (fail open)
exit 0
