#!/bin/bash
# =============================================================================
# PM PRE-FLIGHT CHECK
# =============================================================================
# Run before major PM actions to enforce rules
# Loads .pm_rules.json and validates against action type
#
# Usage: ./scripts/pm-preflight.sh <action> [target]
#   action: create, deploy, delete, modify
#   target: filename or target description
#
# Exit codes:
#   0 = All checks passed
#   1 = Warnings - review before proceeding
#   2 = Blocked - do not proceed
# =============================================================================

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and base directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

# Arguments
ACTION="${1:-check}"
TARGET="${2:-}"

# Rules file location
RULES_FILE="$BASE_DIR/.pm_rules.json"

echo ""
echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}   PM PRE-FLIGHT CHECK${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""
echo -e "Action: ${YELLOW}${ACTION}${NC}"
echo -e "Target: ${YELLOW}${TARGET:-'(none specified)'}${NC}"
echo -e "Time:   $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Check for rules file
if [ ! -f "$RULES_FILE" ]; then
    echo -e "${RED}ERROR: Rules file not found at $RULES_FILE${NC}"
    echo "Create .pm_rules.json in the project root."
    exit 2
fi

echo -e "${GREEN}Rules file loaded: $RULES_FILE${NC}"
echo ""

# Counters
WARNINGS=0
CRITICAL=0

# =============================================================================
# ACTION-SPECIFIC CHECKS
# =============================================================================

case "$ACTION" in
    "create")
        echo -e "${BLUE}[CREATE CHECK]${NC} Checking for duplicate files..."

        if [ -n "$TARGET" ]; then
            # Extract keywords from target
            KEYWORDS=$(echo "$TARGET" | sed 's/[._-]/ /g' | sed 's/\.[^.]*$//')

            echo "  Searching for files matching: $KEYWORDS"

            # Search for similar files
            cd "$BASE_DIR"
            for keyword in $KEYWORDS; do
                if [ ${#keyword} -gt 2 ]; then
                    SIMILAR=$(find . -type f \( -name "*${keyword}*" \) 2>/dev/null | grep -v node_modules | grep -v ".git" | head -5)
                    if [ -n "$SIMILAR" ]; then
                        echo -e "  ${YELLOW}Similar files found for '$keyword':${NC}"
                        echo "$SIMILAR" | while read -r line; do echo "    - $line"; done
                        ((WARNINGS++))
                    fi
                fi
            done

            if [ $WARNINGS -eq 0 ]; then
                echo -e "  ${GREEN}PASS: No similar files found${NC}"
            fi
        else
            echo -e "  ${YELLOW}WARNING: No target specified - cannot check for duplicates${NC}"
            ((WARNINGS++))
        fi

        # Check SYSTEM_MANIFEST.md
        echo ""
        echo -e "${BLUE}[MANIFEST CHECK]${NC} Verifying SYSTEM_MANIFEST.md..."
        MANIFEST="$BASE_DIR/claude_sessions/pm_architect/SYSTEM_MANIFEST.md"
        if [ -f "$MANIFEST" ]; then
            echo -e "  ${GREEN}PASS: SYSTEM_MANIFEST.md exists${NC}"
            echo -e "  ${YELLOW}REMINDER: Update manifest after creating new file${NC}"
        else
            echo -e "  ${RED}WARNING: SYSTEM_MANIFEST.md not found${NC}"
            ((WARNINGS++))
        fi
        ;;

    "deploy")
        echo -e "${BLUE}[DEPLOY CHECK]${NC} Checking deployment readiness..."

        # Check CHANGE_LOG.md was updated
        cd "$BASE_DIR"

        # Check for uncommitted changes
        if git diff-index --quiet HEAD -- 2>/dev/null; then
            echo -e "  ${GREEN}PASS: No uncommitted changes${NC}"
        else
            echo -e "  ${YELLOW}WARNING: Uncommitted changes exist${NC}"
            ((WARNINGS++))
        fi

        # Check if CHANGE_LOG was modified recently
        CHANGELOG_MOD=$(git log --oneline -1 --since="1 hour ago" -- CHANGE_LOG.md 2>/dev/null | wc -l | tr -d ' ')
        if [ "$CHANGELOG_MOD" -gt 0 ]; then
            echo -e "  ${GREEN}PASS: CHANGE_LOG.md updated recently${NC}"
        else
            echo -e "  ${YELLOW}WARNING: CHANGE_LOG.md not updated in last hour${NC}"
            echo -e "  ${YELLOW}         Make sure to document your changes${NC}"
            ((WARNINGS++))
        fi

        # Run API validation if available
        if [ -f "$SCRIPT_DIR/validate-api-urls.sh" ]; then
            echo ""
            echo -e "${BLUE}[API CHECK]${NC} Validating API URLs..."
            if "$SCRIPT_DIR/validate-api-urls.sh" > /dev/null 2>&1; then
                echo -e "  ${GREEN}PASS: API URLs validated${NC}"
            else
                echo -e "  ${RED}CRITICAL: API URL validation failed${NC}"
                ((CRITICAL++))
            fi
        fi
        ;;

    "delete")
        echo -e "${RED}[DELETE CHECK]${NC} Destructive action detected..."
        echo ""
        echo -e "  ${RED}WARNING: DELETE actions require user confirmation${NC}"
        echo ""

        if [ -n "$TARGET" ]; then
            # Check if file exists
            if [ -f "$BASE_DIR/$TARGET" ]; then
                echo -e "  Target exists: ${YELLOW}$TARGET${NC}"

                # Check git history
                cd "$BASE_DIR"
                GIT_LOG=$(git log --oneline -3 -- "$TARGET" 2>/dev/null || echo "")
                if [ -n "$GIT_LOG" ]; then
                    echo -e "  ${BLUE}Recent history:${NC}"
                    echo "$GIT_LOG" | while read -r line; do echo "    $line"; done
                fi
            else
                echo -e "  ${YELLOW}Target does not exist: $TARGET${NC}"
            fi
        fi

        echo ""
        echo -e "  ${RED}BLOCKED: Confirm deletion with user before proceeding${NC}"
        ((CRITICAL++))
        ;;

    "modify")
        echo -e "${BLUE}[MODIFY CHECK]${NC} Checking modification readiness..."

        if [ -n "$TARGET" ]; then
            FULL_PATH="$BASE_DIR/$TARGET"

            if [ -f "$FULL_PATH" ]; then
                echo -e "  ${GREEN}PASS: File exists${NC}"

                # Check recent modifications
                cd "$BASE_DIR"
                RECENT=$(git log --oneline -1 --since="1 hour ago" -- "$TARGET" 2>/dev/null | wc -l | tr -d ' ')
                if [ "$RECENT" -gt 0 ]; then
                    echo -e "  ${YELLOW}WARNING: File was modified in the last hour${NC}"
                    ((WARNINGS++))
                fi
            else
                echo -e "  ${RED}CRITICAL: File does not exist: $TARGET${NC}"
                ((CRITICAL++))
            fi
        fi
        ;;

    "check"|*)
        echo -e "${BLUE}[RULES CHECK]${NC} Displaying active PM rules..."
        echo ""

        # Parse and display rules from JSON
        echo -e "${RED}CRITICAL RULES:${NC}"
        cat "$RULES_FILE" | grep -A3 '"id":' | head -20
        echo ""
        ;;
esac

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}   PRE-FLIGHT SUMMARY${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""

if [ $CRITICAL -gt 0 ]; then
    echo -e "${RED}CRITICAL ISSUES: $CRITICAL${NC}"
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}WARNINGS: $WARNINGS${NC}"
fi

echo ""

if [ $CRITICAL -gt 0 ]; then
    echo -e "${RED}============================================${NC}"
    echo -e "${RED}  BLOCKED - DO NOT PROCEED${NC}"
    echo -e "${RED}============================================${NC}"
    echo ""
    exit 2
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}============================================${NC}"
    echo -e "${YELLOW}  PROCEED WITH CAUTION${NC}"
    echo -e "${YELLOW}============================================${NC}"
    echo ""
    exit 1
else
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  ALL CHECKS PASSED${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    exit 0
fi
