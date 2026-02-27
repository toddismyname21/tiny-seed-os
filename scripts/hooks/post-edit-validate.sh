#!/bin/bash
# Post-edit validation: runs checks after Edit/Write/MultiEdit on files
# Hook type: command (PostToolUse on Edit|Write|MultiEdit)
# Input: JSON on stdin with tool_input.file_path field

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WARNINGS=""

# Check 1: For HTML files, run element reference validation
if echo "$FILE_PATH" | grep -qiE '\.html$'; then
  if [ -x "$SCRIPT_DIR/validate-element-refs.sh" ]; then
    RESULT=$("$SCRIPT_DIR/validate-element-refs.sh" "$FILE_PATH" 2>&1)
    if [ $? -ne 0 ]; then
      WARNINGS="${WARNINGS}Element ref check: ${RESULT}\n"
    fi
  fi
fi

# Check 2: For any file, check for hardcoded API URLs (should use api-config.js)
if grep -qE 'https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec' "$FILE_PATH" 2>/dev/null; then
  # Exclude api-config.js itself and CLAUDE.md (documentation)
  BASENAME=$(basename "$FILE_PATH")
  if [ "$BASENAME" != "api-config.js" ] && [ "$BASENAME" != "CLAUDE.md" ] && [ "$BASENAME" != "CLAUDE_MD_REFERENCE.md" ]; then
    COUNT=$(grep -c 'https://script\.google\.com/macros/s/' "$FILE_PATH" 2>/dev/null)
    WARNINGS="${WARNINGS}Found ${COUNT} hardcoded API URL(s) in ${BASENAME}. Use api-config.js instead.\n"
  fi
fi

if [ -n "$WARNINGS" ]; then
  echo -e "Post-edit warnings:\n${WARNINGS}"
  exit 0  # Warn but don't block
fi

exit 0
