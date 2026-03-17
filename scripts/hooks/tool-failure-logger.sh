#!/bin/bash
# tool-failure-logger.sh
# Hook: PostToolUseFailure
# Logs tool failures for debugging, alerts on patterns
# Exit 0 = advisory only, never blocks

LOG_FILE="/tmp/tinyseed_tool_failures.log"

# Read failure info from stdin
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name', d.get('tool', '')))" 2>/dev/null)
ERROR_MSG=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error', d.get('tool_error', d.get('error_message', 'unknown error'))))" 2>/dev/null)

# Fallback if tool name empty
if [ -z "$TOOL_NAME" ]; then
  TOOL_NAME="unknown"
fi

# Timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Append to log
echo "[$TIMESTAMP] $TOOL_NAME: $ERROR_MSG" >> "$LOG_FILE"

# Count recent failures for this tool (last 10 minutes)
TEN_MIN_AGO=$(date -u -v-10M +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "10 minutes ago" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null)

if [ -n "$TEN_MIN_AGO" ] && [ -f "$LOG_FILE" ]; then
  RECENT_COUNT=$(awk -v tool="$TOOL_NAME" -v cutoff="$TEN_MIN_AGO" '
    $0 ~ tool {
      # Extract timestamp between brackets
      match($0, /\[([^\]]+)\]/, ts)
      if (ts[1] >= cutoff) count++
    }
    END { print count+0 }
  ' "$LOG_FILE" 2>/dev/null)

  # If 3+ failures in 10 minutes, inject warning
  if [ "$RECENT_COUNT" -ge 3 ]; then
    WARNING="WARNING: ${TOOL_NAME} has failed ${RECENT_COUNT} times in the last 10 minutes. Consider: checking connectivity, trying a different approach, or asking the user for help."
    ESCAPED=$(echo "$WARNING" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 2>/dev/null)

    cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUseFailure",
    "additionalContext": ${ESCAPED}
  }
}
EOF
  fi
fi

exit 0
