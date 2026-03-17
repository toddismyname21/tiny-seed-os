#!/bin/bash
# subagent-start-context.sh
# Hook: SubagentStart
# Injects critical project context into every subagent so they don't start cold

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PHASE_FILE="$PROJECT_ROOT/.claude/rules/current-phase.md"
LOCKS_FILE="$PROJECT_ROOT/.claude/rules/active-locks.md"

# Read stdin (hook input)
INPUT=$(cat)

# Build concise context (under 40 lines)
CONTEXT="=== TINY SEED OS — SUBAGENT CONTEXT ===

DEPLOYMENT (NON-NEGOTIABLE):
- Deployment ID: AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm
- NEVER run bare 'clasp deploy' — ALWAYS use: clasp deploy -i <deployment_id> -d \"description\"
- API URL: https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec
- GitHub Pages: https://toddismyname21.github.io/tiny-seed-os/
- Google Sheet: 128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc

RULES:
- POST requests to Apps Script use Content-Type: text/plain (not application/json) to avoid CORS
- Update CHANGE_LOG.md after ANY code changes
- Check DATA_CONTRACTS.md before modifying any system that other systems depend on
- If changing a sheet schema, verify ALL frontend consumers
- If changing an API response, verify ALL frontend callers
- Verify before claiming done — provide evidence
"

# Append current phase
if [ -f "$PHASE_FILE" ]; then
  PHASE=$(head -1 "$PHASE_FILE" | sed 's/.*Phase: //' | tr -d '[:space:]')
  CONTEXT="${CONTEXT}
CURRENT PHASE: ${PHASE}
"
  # If not READY, include phase rules
  if [ "$PHASE" != "READY" ]; then
    PHASE_RULES=$(tail -n +3 "$PHASE_FILE")
    CONTEXT="${CONTEXT}${PHASE_RULES}
"
  fi
fi

# Append active locks (only if any exist)
if [ -f "$LOCKS_FILE" ]; then
  if ! grep -q "No files currently locked" "$LOCKS_FILE"; then
    CONTEXT="${CONTEXT}
ACTIVE FILE LOCKS:
$(cat "$LOCKS_FILE")
"
  fi
fi

ESCAPED_CONTEXT=$(echo -e "$CONTEXT" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 2>/dev/null)

cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SubagentStart",
    "additionalContext": ${ESCAPED_CONTEXT}
  }
}
EOF

exit 0
