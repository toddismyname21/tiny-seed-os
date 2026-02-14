#!/bin/bash
# =============================================================================
# PM CONTEXT SNAPSHOT
# =============================================================================
# Creates a context file for PM sessions to load at startup
# Includes recent activity, active rules, and system state
#
# Usage: ./scripts/pm-context-snapshot.sh [output_path]
#
# Default output: /tmp/PM_CONTEXT.md
# =============================================================================

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and base directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

# Output location
OUTPUT="${1:-/tmp/PM_CONTEXT.md}"

echo -e "${BLUE}Creating PM Context Snapshot...${NC}"
echo ""

# Change to base directory
cd "$BASE_DIR"

# =============================================================================
# BUILD CONTEXT FILE
# =============================================================================

cat > "$OUTPUT" << 'HEADER'
# PM Context Snapshot

This file is auto-generated to provide session context for PM operations.
Load this at the start of every PM session.

---

HEADER

# Add generation timestamp
echo "**Generated:** $(date '+%Y-%m-%d %H:%M:%S')" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# =============================================================================
# RECENT GIT ACTIVITY
# =============================================================================

echo "---" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo "## Recent Git Activity" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo '```' >> "$OUTPUT"
git log --oneline -15 2>/dev/null >> "$OUTPUT" || echo "No git history available" >> "$OUTPUT"
echo '```' >> "$OUTPUT"
echo "" >> "$OUTPUT"

# =============================================================================
# CURRENT BRANCH STATUS
# =============================================================================

echo "## Current Branch Status" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo '```' >> "$OUTPUT"
git status -s 2>/dev/null >> "$OUTPUT" || echo "No git status available" >> "$OUTPUT"
echo '```' >> "$OUTPUT"
echo "" >> "$OUTPUT"

# =============================================================================
# RECENT CHANGE_LOG ENTRIES
# =============================================================================

echo "---" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo "## Recent CHANGE_LOG Entries" >> "$OUTPUT"
echo "" >> "$OUTPUT"

if [ -f "$BASE_DIR/CHANGE_LOG.md" ]; then
    # Get recent entries (first 80 lines after the format section)
    tail -n +40 "$BASE_DIR/CHANGE_LOG.md" | head -80 >> "$OUTPUT"
else
    echo "CHANGE_LOG.md not found" >> "$OUTPUT"
fi
echo "" >> "$OUTPUT"

# =============================================================================
# ACTIVE PM RULES
# =============================================================================

echo "---" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo "## Active PM Rules" >> "$OUTPUT"
echo "" >> "$OUTPUT"

RULES_FILE="$BASE_DIR/.pm_rules.json"
if [ -f "$RULES_FILE" ]; then
    echo '```json' >> "$OUTPUT"
    cat "$RULES_FILE" >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
else
    echo "No .pm_rules.json found - rules not loaded" >> "$OUTPUT"
fi
echo "" >> "$OUTPUT"

# =============================================================================
# SYSTEM STATUS SUMMARY
# =============================================================================

echo "---" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo "## System Status Summary" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# Count key files
HTML_COUNT=$(find "$BASE_DIR" -name "*.html" -type f 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
JS_COUNT=$(find "$BASE_DIR" -name "*.js" -type f 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
MD_COUNT=$(find "$BASE_DIR" -name "*.md" -type f 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')

echo "| Metric | Value |" >> "$OUTPUT"
echo "|--------|-------|" >> "$OUTPUT"
echo "| HTML Files | $HTML_COUNT |" >> "$OUTPUT"
echo "| JS Files | $JS_COUNT |" >> "$OUTPUT"
echo "| MD Files | $MD_COUNT |" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# =============================================================================
# KEY REMINDERS
# =============================================================================

echo "---" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo "## Key Reminders" >> "$OUTPUT"
echo "" >> "$OUTPUT"
cat >> "$OUTPUT" << 'REMINDERS'
1. **NO_DUPLICATE_FILES** - Always search before creating
2. **READ_BEFORE_EDIT** - Must read a file before editing it
3. **NO_HALLUCINATION** - Never make up information
4. **VERIFY_BEFORE_DONE** - Provide evidence, not claims
5. **CHECK_MANIFEST** - Read SYSTEM_MANIFEST.md before building
6. **UPDATE_CHANGELOG** - Log all changes to CHANGE_LOG.md

### Before Creating Files
```bash
./scripts/pm-preflight.sh create <filename>
```

### Before Deploying
```bash
./scripts/pm-preflight.sh deploy
```

### Before Deleting
```bash
./scripts/pm-preflight.sh delete <filename>
```

REMINDERS

# =============================================================================
# QUICK LINKS
# =============================================================================

echo "---" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo "## Quick Reference Files" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo "| File | Purpose |" >> "$OUTPUT"
echo "|------|---------|" >> "$OUTPUT"
echo "| CLAUDE.md | Mandatory rules |" >> "$OUTPUT"
echo "| .pm_rules.json | PM rule definitions |" >> "$OUTPUT"
echo "| CHANGE_LOG.md | Change tracking |" >> "$OUTPUT"
echo "| claude_sessions/pm_architect/SYSTEM_MANIFEST.md | System inventory |" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# =============================================================================
# DONE
# =============================================================================

echo "---" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo "*End of PM Context Snapshot*" >> "$OUTPUT"

echo -e "${GREEN}Context snapshot saved to: $OUTPUT${NC}"
echo ""
echo "Contents:"
echo "  - Recent git activity (15 commits)"
echo "  - Current branch status"
echo "  - Recent CHANGE_LOG entries"
echo "  - Active PM rules from .pm_rules.json"
echo "  - System status summary"
echo "  - Key reminders and quick links"
echo ""
echo "Load this file at the start of PM sessions for context continuity."
