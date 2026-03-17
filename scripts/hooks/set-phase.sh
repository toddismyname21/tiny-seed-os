#!/bin/bash
# set-phase.sh
# Utility script to update the current work phase
# Usage: ./scripts/hooks/set-phase.sh <phase>
# Phases: research, plan, build, verify, deploy, ready

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PHASE_FILE="$PROJECT_ROOT/.claude/rules/current-phase.md"

PHASE=$(echo "$1" | tr '[:upper:]' '[:lower:]')

if [ -z "$PHASE" ]; then
  echo "Usage: $0 <phase>"
  echo "Phases: research, plan, build, verify, deploy, ready"
  exit 1
fi

case "$PHASE" in
  research)
    cat > "$PHASE_FILE" <<'PHASEEOF'
# Current Work Phase: RESEARCH

Do NOT edit implementation files (.html, .js, .css, MERGED TOTAL.js).
Do NOT use Edit, Write, or MultiEdit tools on code files.
Research only: Read files, search code, fetch web resources, analyze.
Present findings and wait for plan approval before proceeding.
PHASEEOF
    echo "Phase set to RESEARCH"
    ;;
  plan)
    cat > "$PHASE_FILE" <<'PHASEEOF'
# Current Work Phase: PLAN

Do NOT edit implementation files (.html, .js, .css, MERGED TOTAL.js).
Present a detailed implementation plan with:
- Exact files to modify
- Exact functions to create/change
- Acceptance criteria for each change
Wait for explicit user approval before proceeding to BUILD phase.
PHASEEOF
    echo "Phase set to PLAN"
    ;;
  build)
    cat > "$PHASE_FILE" <<'PHASEEOF'
# Current Work Phase: BUILD

Execute the approved plan. Do NOT add features not in the plan.
Do NOT skip CHANGE_LOG.md updates.
After implementation, transition to VERIFY phase.
PHASEEOF
    echo "Phase set to BUILD"
    ;;
  verify)
    cat > "$PHASE_FILE" <<'PHASEEOF'
# Current Work Phase: VERIFY

Do NOT edit any implementation files. Read-only verification.
Run verifier agent and integration-watcher agent.
Report all findings. Do NOT fix issues directly -- report them for the next BUILD cycle.
PHASEEOF
    echo "Phase set to VERIFY"
    ;;
  deploy)
    cat > "$PHASE_FILE" <<'PHASEEOF'
# Current Work Phase: DEPLOY

Deploy approved and verified changes only.
Required steps: git add, git commit, git push, clasp push, clasp deploy -i <deployment_id>
Update CHANGE_LOG.md. Verify live deployment with curl.
PHASEEOF
    echo "Phase set to DEPLOY"
    ;;
  ready)
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
    echo "Phase set to READY"
    ;;
  *)
    echo "ERROR: Unknown phase '$PHASE'"
    echo "Valid phases: research, plan, build, verify, deploy, ready"
    exit 1
    ;;
esac

exit 0
