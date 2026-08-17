---
name: Hooks configuration reference
description: Which hooks are registered, which scripts exist, and the 2026-03-17 optimization decisions
type: reference
---

**Registered hooks (13 as of 2026-03-17):**
1. SessionStart → session-start-context.sh (injects .pm_rules, SYSTEM_INVENTORY, CHANGE_LOG)
2. PreToolUse → Bash → pre-tool-guard.sh (blocks bare clasp deploy, rm -rf /, force push)
3. PreToolUse → Edit|Write|MultiEdit → phase-gate.sh (blocks impl file edits during RESEARCH/PLAN/VERIFY phases)
4. PostToolUse → Edit/Write → post-edit-validate.sh (element refs, hardcoded URLs)
5. PostToolUse → Edit/Write → pm-delegation-guard.sh (reminds PM not to edit .html/.js)
6. TeammateIdle → teammate-idle-check.sh (blocks builder from idling without CHANGE_LOG update)
7. TaskCompleted → task-completed-verify.sh (validates element refs, API URLs before task close)
8. PostCompact → post-compact-reinject.sh (re-injects deployment ID, rules after compaction)
9. InstructionsLoaded → instructions-loaded.sh (injects active phase + file locks)
10. SubagentStart → subagent-start-context.sh (injects deployment ID, API URL, phase, rules into subagents)
11. PostToolUseFailure → tool-failure-logger.sh (logs failures, warns on 3+ in 10 min)
12. Stop → post-response-check.sh (checks uncommitted changes without CHANGE_LOG)
13. SessionEnd → session-end-cleanup.sh (warns uncommitted, resets phase to READY, writes session summary)

**Utility scripts (not hooks):**
- set-phase.sh — switches work phase (research/plan/build/verify/deploy/ready)

**Dynamic rule files:**
- `.claude/rules/current-phase.md` — active phase enforcement
- `.claude/rules/active-locks.md` — file lock registry

**Hook scripts directory:** `scripts/hooks/`

**Model assignments (optimized 2026-03-17):**
- pm-coordinator: sonnet (was opus — coordination doesn't need opus-level reasoning)
- fullstack-builder: opus (kept — highest ROI for complex multi-file work)
- researcher: sonnet (was haiku — haiku too weak for research synthesis)
- All others: sonnet

**How to apply:** When adding new hooks, add both the script in `scripts/hooks/` AND register it in `.claude/settings.local.json` under the `hooks` key.
