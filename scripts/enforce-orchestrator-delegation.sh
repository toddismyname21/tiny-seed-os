#!/bin/bash
# =============================================================================
# ORCHESTRATOR DELEGATION ENFORCEMENT
# =============================================================================
# This hook runs BEFORE any Bash/Edit/Write tool execution.
# When in delegate mode, it blocks direct execution and instructs delegation.
# =============================================================================

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Log the attempt
LOG_FILE="/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.orchestrator_enforcement.log"
echo "[$TIMESTAMP] Tool attempted: $TOOL_NAME | Session: $SESSION_ID" >> "$LOG_FILE"

# Block execution tools in delegate mode
EXECUTION_TOOLS="Bash Edit Write MultiEdit NotebookEdit"

for blocked in $EXECUTION_TOOLS; do
  if [ "$TOOL_NAME" = "$blocked" ]; then
    # Log the block
    echo "[$TIMESTAMP] BLOCKED: $TOOL_NAME - delegation required" >> "$LOG_FILE"

    # Return JSON decision to deny
    cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "🚫 ORCHESTRATOR DELEGATION REQUIRED: You are operating as PM_Architect. You CANNOT execute ${TOOL_NAME} directly. Use the Task tool to delegate this work to the appropriate specialist agent:\n\n• Backend_Claude - for apps_script/*.js files\n• Desktop_Claude - for web_app/*.html and root HTML files\n• Mobile_Claude - for employee.html, mobile apps\n• Security_Claude - for auth and security\n\nThis enforcement is mandatory and cannot be bypassed."
  }
}
EOF
    exit 0
  fi
done

# Allow other tools (Read, Grep, Glob, Task, etc.)
exit 0
