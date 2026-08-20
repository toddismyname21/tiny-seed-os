#!/bin/bash
# shared-kernel-lock.sh
# Hook: PreToolUse on Edit|Write|MultiEdit
# Exit 0 = allow, Exit 2 = block
#
# WHY THIS EXISTS
# Todd runs several dedicated Claude Code terminals (CSA, Wholesale, Grants) in
# git worktrees. Worktrees hard-isolate most files, but a handful are shared by
# every domain and cannot be isolated. Two terminals editing those at the same
# time produce silent, conflicting writes. `.claude/rules/active-locks.md` was
# the convention for claiming them; this hook turns that convention into
# enforcement so nobody has to REMEMBER to claim.
#
# TERMINAL IDENTITY
# Uses $TSF_TERMINAL if set (e.g. `export TSF_TERMINAL=csa` in that terminal).
# FALLBACK: the git branch of the current worktree (`git rev-parse
# --abbrev-ref HEAD`), which is unique per worktree in this setup. If both are
# unavailable (detached HEAD, no git) identity becomes "unknown" — the lock can
# still be claimed under the literal name "unknown", it just isn't distinct.
#
# WHERE THE LOCK FILE LIVES
# Always the MAIN checkout's .claude/rules/active-locks.md, resolved from any
# worktree via `git rev-parse --git-common-dir`. NOTE: .claude/ is gitignored,
# so a fresh `git worktree add` will not contain .claude/settings.local.json
# and this hook will not be REGISTERED there at all. Symlink each worktree's
# .claude -> the main repo's .claude for the enforcement to apply.
#
# FAIL-OPEN POLICY
# If active-locks.md is missing or unreadable this hook exits 0 with a stderr
# warning. A broken hook must never brick Todd's ability to work at 6am.
#
# Block messages go to stderr: for PreToolUse, exit 2 feeds stderr back to the
# model so it can act on the instruction. Advisory notes also go to stderr.

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# The lock file must be ONE file shared by every worktree, otherwise each
# terminal reads its own copy and mutual exclusion is meaningless.
# `git rev-parse --git-common-dir` returns the MAIN repo's .git from inside any
# linked worktree, so <common-dir>/.. is always the main checkout.
LOCKS_ROOT="$PROJECT_ROOT"
COMMON_DIR=$(git -C "$PROJECT_ROOT" rev-parse --git-common-dir 2>/dev/null)
if [ -n "$COMMON_DIR" ]; then
  case "$COMMON_DIR" in
    /*) : ;;
    *) COMMON_DIR="$PROJECT_ROOT/$COMMON_DIR" ;;
  esac
  MAIN_ROOT=$(cd "$COMMON_DIR/.." 2>/dev/null && pwd)
  [ -n "$MAIN_ROOT" ] && LOCKS_ROOT="$MAIN_ROOT"
fi
LOCKS_FILE="$LOCKS_ROOT/.claude/rules/active-locks.md"

# Read the tool input from stdin
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)

# No file path (e.g. NotebookEdit, malformed payload) — allow
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH")

# ---------------------------------------------------------------------------
# match_kernel: echoes the lock KEY for a shared-kernel path, or returns 1.
# Accepts absolute or repo-relative paths.
# The migrations kernel is the ROOT supabase/migrations/ only — the per-app
# dirs (apps/grant-portal/supabase/migrations) are worktree-isolated.
# ---------------------------------------------------------------------------
match_kernel() {
  case "$1" in
    apps/csa-portal/src/lib/database.types.ts|*/apps/csa-portal/src/lib/database.types.ts)
      echo "database.types.ts"; return 0 ;;
    apps/csa-portal/src/lib/quickbooks.ts|*/apps/csa-portal/src/lib/quickbooks.ts)
      echo "quickbooks.ts"; return 0 ;;
    apps/csa-portal/src/components/AdminShell.astro|*/apps/csa-portal/src/components/AdminShell.astro)
      echo "AdminShell.astro"; return 0 ;;
  esac

  case "$1" in
    apps/*|*/apps/*)
      : ;;  # app-scoped migrations are NOT shared kernel
    supabase/migrations/*|*/supabase/migrations/*)
      echo "supabase/migrations"; return 0 ;;
  esac

  return 1
}

# ---------------------------------------------------------------------------
# migration_naming_advisory: ADVISORY ONLY, never blocks.
# New files under supabase/migrations/ should use the Supabase CLI timestamp
# form. The historical 0001-0092 sequence is frozen; two terminals both
# reaching for the next integer collide silently.
# ---------------------------------------------------------------------------
migration_naming_advisory() {
  # Root supabase/migrations only — apps/*/supabase/migrations are separate,
  # single-domain databases whose own sequences are fine.
  case "$FILE_PATH" in
    apps/*|*/apps/*) return 0 ;;
  esac
  case "$FILE_PATH" in
    supabase/migrations/*.sql|*/supabase/migrations/*.sql) : ;;
    *) return 0 ;;
  esac

  # Only advise on NEW files — editing an existing 00NN_ migration is fine.
  if [ -f "$FILE_PATH" ]; then
    return 0
  fi

  if echo "$BASENAME" | grep -qE '^[0-9]{4}_'; then
    echo "NOTE (advisory, not blocking): '${BASENAME}' uses the old sequential NNNN_ form." >&2
    echo "  New migrations should be YYYYMMDDHHMMSS_description.sql — concurrent terminals" >&2
    echo "  both reach for the next integer and collide silently; timestamps don't." >&2
    echo "  Generate one with: supabase migration new description" >&2
    echo "  See supabase/migrations/README.md. Proceed anyway if you have a reason to." >&2
  fi
  return 0
}

migration_naming_advisory

KEY=$(match_kernel "$FILE_PATH")
if [ -z "$KEY" ]; then
  # Not shared kernel — the overwhelmingly common case. Get out of the way.
  exit 0
fi

# --- Resolve terminal identity -------------------------------------------
TERMINAL="$TSF_TERMINAL"
if [ -z "$TERMINAL" ]; then
  TERMINAL=$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null)
fi
if [ -z "$TERMINAL" ] || [ "$TERMINAL" = "HEAD" ]; then
  TERMINAL="unknown"
fi

# --- Fail open if the lock file is unusable -------------------------------
if [ ! -f "$LOCKS_FILE" ] || [ ! -r "$LOCKS_FILE" ]; then
  echo "WARNING: shared-kernel-lock could not read ${LOCKS_FILE}." >&2
  echo "  Failing OPEN — '${KEY}' is shared-kernel, but the lock file is missing" >&2
  echo "  or unreadable so no claim can be verified." >&2
  echo "  Coordinate manually before editing, and restore the lock file." >&2
  exit 0
fi

# A claim is a line of the form:
#   - LOCK: <key> | <terminal> | <date> | <description>
# Fields 1 and 2 are matched EXACTLY, not as substrings — a description that
# happens to contain another terminal's name must not satisfy that terminal's
# lock, and the doc's <angle-bracket> template must never match a real key.
MINE=$(awk -F'|' -v key="$KEY" -v term="$TERMINAL" '
  /^[[:space:]]*-[[:space:]]*LOCK:/ {
    k = $1
    sub(/^[[:space:]]*-[[:space:]]*LOCK:[[:space:]]*/, "", k)
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", k)
    t = $2
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", t)
    if (k == key && t == term) print
  }' "$LOCKS_FILE" 2>/dev/null)

if [ -n "$MINE" ]; then
  echo "shared-kernel lock held by '${TERMINAL}' for ${KEY} — remove your '- LOCK:' line from .claude/rules/active-locks.md when you're done."
  exit 0
fi

# No valid claim of ours. Is anyone else holding it, or is a claim malformed?
# Deliberately loose here: we would rather over-report a possible holder than
# hand the lock to a second terminal.
THEIRS=$(grep -E '^[[:space:]]*-[[:space:]]*LOCK:' "$LOCKS_FILE" 2>/dev/null | grep -F "$KEY")

{
  echo "BLOCKED: '${FILE_PATH}' is a SHARED-KERNEL file (${KEY})."
  echo ""
  echo "Shared-kernel files are the handful that every domain terminal (CSA,"
  echo "Wholesale, Grants) touches. Git worktrees isolate everything else, but"
  echo "not these — two terminals writing them at once produces silent,"
  echo "conflicting edits. So they must be claimed before editing."
  echo ""
  echo "Your terminal identity: ${TERMINAL}"
  if [ -z "$TSF_TERMINAL" ]; then
    echo "  (derived from the git branch; set TSF_TERMINAL for a clearer name)"
  fi
  if [ -n "$THEIRS" ]; then
    echo ""
    echo "AN EXISTING CLAIM ALREADY NAMES THIS LOCK:"
    echo "$THEIRS" | sed 's/^/  /'
    echo ""
    echo "Either another terminal holds it, or a claim line is malformed"
    echo "(the format is: - LOCK: <key> | <terminal> | <date> | <description>,"
    echo "and fields 1 and 2 must match exactly)."
    echo ""
    echo "Do NOT take a lock another terminal holds. Wait for it to release, or"
    echo "ask Todd — if the lock is stale, Todd removes the line himself."
  else
    echo ""
    echo "TO CLAIM IT, add this exact line to the 'Active claims' section of"
    echo ".claude/rules/active-locks.md, then retry the edit:"
    echo ""
    echo "- LOCK: ${KEY} | ${TERMINAL} | $(date '+%Y-%m-%d %H:%M') | <what you are changing>"
    echo ""
    echo "WHEN YOU ARE DONE: delete that line. A lock left behind blocks every"
    echo "other terminal until someone notices."
  fi
} >&2

exit 2
