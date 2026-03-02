#!/bin/bash
# task-completed-verify.sh
# Hook: TaskCompleted — runs when a task is being marked complete
# Exit 0 = allow completion, Exit 2 = block completion (stderr becomes feedback)

INPUT=$(cat)
TASK_SUBJECT=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('task_subject',''))" 2>/dev/null)
TEAMMATE=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('teammate_name',''))" 2>/dev/null)

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ERRORS=""

# Check recently modified HTML files for orphaned element references
MODIFIED_HTML=$(cd "$PROJECT_ROOT" && git diff --name-only 2>/dev/null | grep -E '\.html$')
if [ -n "$MODIFIED_HTML" ]; then
  for file in $MODIFIED_HTML; do
    if [ -x "$SCRIPT_DIR/validate-element-refs.sh" ] && [ -f "$PROJECT_ROOT/$file" ]; then
      RESULT=$("$SCRIPT_DIR/validate-element-refs.sh" "$PROJECT_ROOT/$file" 2>&1)
      if [ $? -ne 0 ]; then
        ERRORS="${ERRORS}Element ref errors in ${file}: ${RESULT}\n"
      fi
    fi
  done
fi

# Check for hardcoded API URLs in modified CODE files only (not docs)
MODIFIED_CODE=$(cd "$PROJECT_ROOT" && git diff --name-only 2>/dev/null | grep -E '\.(html|js|css|py)$')
if [ -n "$MODIFIED_CODE" ]; then
  for file in $MODIFIED_CODE; do
    BASENAME=$(basename "$file")
    if [ "$BASENAME" != "api-config.js" ] && [ "$BASENAME" != "auth-guard.js" ]; then
      if [ -f "$PROJECT_ROOT/$file" ] && grep -qE 'https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec' "$PROJECT_ROOT/$file" 2>/dev/null; then
        ERRORS="${ERRORS}Hardcoded API URL found in ${file}. Use api-config.js instead.\n"
      fi
    fi
  done
fi

if [ -n "$ERRORS" ]; then
  echo -e "Task '$TASK_SUBJECT' cannot be completed. Fix these issues:\n${ERRORS}" >&2
  exit 2
fi

exit 0
