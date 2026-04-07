#!/bin/bash
# =============================================================================
# PRE-FLIGHT CHECK SCRIPT FOR TINY SEED OS
# =============================================================================
# Run BEFORE any file creation or major modification
# This script is MANDATORY - agents MUST pass these checks before changes
#
# Usage: ./scripts/pre-flight-check.sh <filename> <action>
#   action: create, modify, delete
#
# Exit codes:
#   0 = All checks passed
#   1 = Warnings found - review before proceeding
#   2 = Critical errors - do not proceed
# =============================================================================

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Get script directory and base directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

# Arguments
FILE_NAME="$1"
ACTION="${2:-create}"  # Default to 'create' if not specified
AGENT="${3:-unknown}"  # Optional agent name

# Counters
ERRORS=0
WARNINGS=0
CRITICAL=0

echo ""
echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}   TINY SEED OS - PRE-FLIGHT CHECK${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""
echo -e "File:   ${YELLOW}${FILE_NAME}${NC}"
echo -e "Action: ${YELLOW}${ACTION}${NC}"
echo -e "Agent:  ${YELLOW}${AGENT}${NC}"
echo -e "Time:   $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Validate input
if [ -z "$FILE_NAME" ]; then
    echo -e "${RED}ERROR: No filename provided${NC}"
    echo ""
    echo "Usage: ./scripts/pre-flight-check.sh <filename> [action] [agent]"
    echo "  action: create, modify, delete (default: create)"
    echo "  agent:  Backend_Claude, Desktop_Claude, etc."
    echo ""
    echo "Examples:"
    echo "  ./scripts/pre-flight-check.sh web_app/new-feature.html create Desktop_Claude"
    echo "  ./scripts/pre-flight-check.sh apps_script/NewModule.js modify Backend_Claude"
    exit 2
fi

# =============================================================================
# CHECK 0: CIRCUIT BREAKER CHECK
# =============================================================================
echo -e "${BLUE}[CHECK 0]${NC} Circuit Breaker Status..."

if [ -n "$AGENT" ] && [ "$AGENT" != "unknown" ]; then
    # Get circuit breaker status and flatten JSON to single line for easier parsing
    BREAKER_STATUS=$(node "$SCRIPT_DIR/circuit_breaker.js" check "$AGENT" 2>/dev/null | tr '\n' ' ' | tr -s ' ' || echo '{"canProceed":true}')
    CAN_PROCEED=$(echo "$BREAKER_STATUS" | grep -o '"canProceed": *[^,}]*' | sed 's/"canProceed": *//' | tr -d ' ')

    if [ "$CAN_PROCEED" = "false" ]; then
        # Extract message and details from flattened JSON
        BREAKER_MESSAGE=$(echo "$BREAKER_STATUS" | sed 's/.*"message": *"//' | sed 's/".*//')
        BREAKER_REASON=$(echo "$BREAKER_STATUS" | sed 's/.*"tripReason": *"//' | sed 's/".*//')
        WAIT_TIME=$(echo "$BREAKER_STATUS" | sed 's/.*"waitTimeSeconds": *//' | sed 's/[,}].*//' | tr -d ' ')

        echo -e "  ${RED}CRITICAL: Circuit breaker is OPEN for $AGENT${NC}"
        if [ -n "$BREAKER_MESSAGE" ]; then
            echo -e "  ${RED}$BREAKER_MESSAGE${NC}"
        fi
        if [ -n "$BREAKER_REASON" ]; then
            echo -e "  ${RED}Trip reason: $BREAKER_REASON${NC}"
        fi
        if [ -n "$WAIT_TIME" ] && [ "$WAIT_TIME" != "null" ]; then
            echo -e "  ${RED}Wait time: ${WAIT_TIME}s before retry${NC}"
        fi
        echo -e "  ${RED}Agent must wait for recovery timeout or human intervention${NC}"
        echo -e "  ${YELLOW}To reset: node scripts/circuit_breaker.js reset $AGENT${NC}"
        ((CRITICAL++))
    else
        BREAKER_STATE=$(echo "$BREAKER_STATUS" | sed 's/.*"state": *"//' | sed 's/".*//')
        if [ "$BREAKER_STATE" = "HALF_OPEN" ]; then
            echo -e "  ${YELLOW}INFO: Circuit is HALF_OPEN - testing recovery${NC}"
        else
            echo -e "  ${GREEN}PASS: Circuit breaker state: $BREAKER_STATE${NC}"
        fi
    fi
else
    echo -e "  ${YELLOW}SKIP: No agent specified${NC}"
fi

echo ""

# =============================================================================
# CHECK 1: DUPLICATE DETECTION (for new files)
# =============================================================================
echo -e "${BLUE}[CHECK 1]${NC} Duplicate Detection..."

if [ "$ACTION" = "create" ]; then
    # Extract basename and create search pattern
    BASENAME=$(basename "$FILE_NAME")

    # Whitelist standard files that every project/subdir legitimately has
    WHITELISTED_NAMES="INBOX.md OUTBOX.md INSTRUCTIONS.md .gitignore .env.example .env.sample"
    IS_WHITELISTED=false
    for WL in $WHITELISTED_NAMES; do
        if [ "$BASENAME" = "$WL" ]; then
            IS_WHITELISTED=true
            break
        fi
    done
    if [ "$IS_WHITELISTED" = true ]; then
        echo -e "  ${GREEN}SKIP: '$BASENAME' is a standard terminal coordination file${NC}"
    else
        # Remove extension and split on common delimiters
        SEARCH_TERM=$(echo "$BASENAME" | sed 's/\.[^.]*$//' | sed 's/[._-]/ /g')

        # Search for similar files
        echo "  Searching for similar files matching: $SEARCH_TERM"

        # Use find to search for similar files (exclude node_modules, .git, vendor dirs)
        SIMILAR=$(cd "$BASE_DIR" && find . -type d \( -name node_modules -o -name .git -o -name .cache -o -name dist -o -name build \) -prune -o -type f \( -name "*.html" -o -name "*.js" -o -name "*.md" \) -print 2>/dev/null | xargs -I {} sh -c 'echo "$1" | grep -i "'"$SEARCH_TERM"'"' _ {} 2>/dev/null | head -10 || true)

        # Also check for exact basename matches (exclude the file itself, node_modules, .git)
        EXACT_MATCH=$(cd "$BASE_DIR" && find . -type d \( -name node_modules -o -name .git -o -name .cache -o -name dist -o -name build \) -prune -o -iname "*${BASENAME}*" -type f -print 2>/dev/null | grep -v "^\./${FILE_NAME}$" | head -5 || true)

        if [ -n "$EXACT_MATCH" ]; then
            echo -e "  ${RED}CRITICAL: Exact or near-exact match found:${NC}"
            echo "$EXACT_MATCH" | while read -r line; do echo "    - $line"; done
            ((CRITICAL++))
        elif [ -n "$SIMILAR" ]; then
            echo -e "  ${YELLOW}WARNING: Similar files found - verify these don't duplicate your intent:${NC}"
            echo "$SIMILAR" | while read -r line; do echo "    - $line"; done
            ((WARNINGS++))
        else
            echo -e "  ${GREEN}PASS: No similar files found${NC}"
        fi
    fi
else
    echo -e "  ${GREEN}SKIP: Not a create action${NC}"
fi

# =============================================================================
# CHECK 2: SYSTEM_MANIFEST.md CHECK
# =============================================================================
echo ""
echo -e "${BLUE}[CHECK 2]${NC} SYSTEM_MANIFEST.md Check..."

MANIFEST_PATH="$BASE_DIR/claude_sessions/pm_architect/SYSTEM_MANIFEST.md"

if [ -f "$MANIFEST_PATH" ]; then
    # Check if file is documented in manifest
    if grep -qi "$(basename "$FILE_NAME")" "$MANIFEST_PATH" 2>/dev/null; then
        echo -e "  ${GREEN}PASS: File documented in SYSTEM_MANIFEST.md${NC}"
    else
        if [ "$ACTION" = "create" ]; then
            echo -e "  ${YELLOW}WARNING: File not in SYSTEM_MANIFEST.md - ADD IT AFTER CREATION${NC}"
            ((WARNINGS++))
        elif [ "$ACTION" = "modify" ]; then
            echo -e "  ${YELLOW}INFO: Consider updating SYSTEM_MANIFEST.md if role changes${NC}"
        fi
    fi
else
    echo -e "  ${YELLOW}WARNING: SYSTEM_MANIFEST.md not found at expected location${NC}"
    ((WARNINGS++))
fi

# =============================================================================
# CHECK 3: ROLE BOUNDARY CHECK
# =============================================================================
echo ""
echo -e "${BLUE}[CHECK 3]${NC} Role Boundary Check..."

# Define role boundaries
check_role_boundary() {
    local file="$1"
    local agent="$2"

    case "$agent" in
        "Backend_Claude")
            if [[ "$file" == apps_script/*.js ]] || [[ "$file" == */apps_script/*.js ]]; then
                echo "PASS"
            else
                echo "FAIL:Backend_Claude can only modify /apps_script/*.js files"
            fi
            ;;
        "Desktop_Claude")
            if [[ "$file" == *.html ]] || [[ "$file" == web_app/* ]]; then
                echo "PASS"
            else
                echo "FAIL:Desktop_Claude can only modify root .html and web_app/ files"
            fi
            ;;
        "Mobile_Claude")
            if [[ "$file" == *employee*.html ]] || [[ "$file" == *pwa* ]] || [[ "$file" == *mobile* ]]; then
                echo "PASS"
            else
                echo "FAIL:Mobile_Claude can only modify employee.html and PWA files"
            fi
            ;;
        "UX_Design_Claude")
            if [[ "$file" == *.css ]] || [[ "$file" == *design* ]] || [[ "$file" == *style* ]]; then
                echo "PASS"
            else
                echo "FAIL:UX_Design_Claude can only modify CSS and design files"
            fi
            ;;
        "Security_Claude")
            if [[ "$file" == *auth* ]] || [[ "$file" == *security* ]] || [[ "$file" == *permission* ]]; then
                echo "PASS"
            else
                echo "FAIL:Security_Claude can only modify auth and security files"
            fi
            ;;
        "PM_Architect")
            if [[ "$file" == *.md ]] || [[ "$file" == *claude_sessions* ]]; then
                echo "PASS"
            else
                echo "WARN:PM_Architect should primarily modify documentation files"
            fi
            ;;
        *)
            echo "UNKNOWN:Agent role not recognized"
            ;;
    esac
}

if [ "$AGENT" != "unknown" ]; then
    ROLE_CHECK=$(check_role_boundary "$FILE_NAME" "$AGENT")
    ROLE_STATUS=$(echo "$ROLE_CHECK" | cut -d':' -f1)
    ROLE_MSG=$(echo "$ROLE_CHECK" | cut -d':' -f2-)

    case "$ROLE_STATUS" in
        "PASS")
            echo -e "  ${GREEN}PASS: File is within ${AGENT}'s scope${NC}"
            ;;
        "FAIL")
            echo -e "  ${RED}CRITICAL: Role boundary violation - ${ROLE_MSG}${NC}"
            ((CRITICAL++))
            ;;
        "WARN")
            echo -e "  ${YELLOW}WARNING: ${ROLE_MSG}${NC}"
            ((WARNINGS++))
            ;;
        "UNKNOWN")
            echo -e "  ${YELLOW}WARNING: Unknown agent role - cannot verify boundaries${NC}"
            ((WARNINGS++))
            ;;
    esac
else
    echo -e "  ${YELLOW}SKIP: No agent specified - cannot verify role boundaries${NC}"
fi

# =============================================================================
# CHECK 4: RECENT CHANGES CHECK
# =============================================================================
echo ""
echo -e "${BLUE}[CHECK 4]${NC} Recent Changes to this file..."

FULL_PATH="$BASE_DIR/$FILE_NAME"

if [ -f "$FULL_PATH" ]; then
    cd "$BASE_DIR"
    GIT_LOG=$(git log --oneline -5 -- "$FILE_NAME" 2>/dev/null || echo "")

    if [ -n "$GIT_LOG" ]; then
        echo -e "  ${MAGENTA}Recent commits:${NC}"
        echo "$GIT_LOG" | while read -r line; do echo "    $line"; done

        # Check if file was modified in last 24 hours
        RECENT_CHANGES=$(git log --since="24 hours ago" --oneline -- "$FILE_NAME" 2>/dev/null | wc -l | tr -d ' ')
        if [ "$RECENT_CHANGES" -gt 0 ]; then
            echo -e "  ${YELLOW}WARNING: File was modified $RECENT_CHANGES time(s) in the last 24 hours${NC}"
            ((WARNINGS++))
        fi
    else
        echo -e "  ${GREEN}No git history for this file${NC}"
    fi
else
    if [ "$ACTION" = "create" ]; then
        echo -e "  ${GREEN}INFO: New file - no history exists${NC}"
    else
        echo -e "  ${RED}CRITICAL: File does not exist but action is '$ACTION'${NC}"
        ((CRITICAL++))
    fi
fi

# =============================================================================
# CHECK 5: HIGH-RISK PATTERN CHECK
# =============================================================================
echo ""
echo -e "${BLUE}[CHECK 5]${NC} High-Risk Pattern Check..."

HIGH_RISK_PATTERNS=("shopify" "production" "deploy" "delete" "auth" "credential" "password" "api-key" "secret" "financial" "payment")
FOUND_RISKS=""

LOWER_FILE=$(echo "$FILE_NAME" | tr '[:upper:]' '[:lower:]')

for pattern in "${HIGH_RISK_PATTERNS[@]}"; do
    if echo "$LOWER_FILE" | grep -qi "$pattern"; then
        FOUND_RISKS="$FOUND_RISKS $pattern"
    fi
done

if [ -n "$FOUND_RISKS" ]; then
    echo -e "  ${YELLOW}WARNING: High-risk patterns detected:${FOUND_RISKS}${NC}"
    echo -e "  ${YELLOW}         This change may require additional approval${NC}"
    ((WARNINGS++))
else
    echo -e "  ${GREEN}PASS: No high-risk patterns detected${NC}"
fi

# =============================================================================
# CHECK 6: KNOWN DUPLICATE SYSTEMS CHECK
# =============================================================================
echo ""
echo -e "${BLUE}[CHECK 6]${NC} Known Duplicate Systems Check..."

LOWER_FILE=$(echo "$FILE_NAME" | tr '[:upper:]' '[:lower:]')
DUPLICATE_SYSTEM=""

# Check for known duplicate patterns
# NOTE: backend/ directory is the Railway/Node.js layer — exempt from Apps Script duplicate rules
FILE_PATH="$1"
IS_BACKEND_FILE=false
if echo "$FILE_PATH" | grep -q "^backend/"; then
    IS_BACKEND_FILE=true
fi

if [ "$IS_BACKEND_FILE" = "false" ]; then
    if echo "$LOWER_FILE" | grep -qi "morning.*brief\|brief.*morning"; then
        DUPLICATE_SYSTEM="Morning Brief (4 versions already exist - DO NOT CREATE ANOTHER)"
    fi

    if echo "$LOWER_FILE" | grep -qi "approval\|approve"; then
        DUPLICATE_SYSTEM="Approval System (2 versions already exist - DO NOT CREATE ANOTHER)"
    fi

    if echo "$LOWER_FILE" | grep -qi "email.*process\|process.*email"; then
        DUPLICATE_SYSTEM="Email Processing (3 versions already exist - DO NOT CREATE ANOTHER)"
    fi
else
    echo -e "  ${GREEN}PASS: backend/ file — Railway/Node.js layer, exempt from Apps Script duplicate rules${NC}"
fi

if echo "$LOWER_FILE" | grep -qi "dashboard" && [ "$ACTION" = "create" ]; then
    echo -e "  ${YELLOW}WARNING: Dashboard creation detected. Verify this doesn't duplicate:${NC}"
    echo "    - SEO Dashboard (web_app/seo_dashboard.html)"
    echo "    - Chief of Staff (apps_script/ChiefOfStaffDashboard.html)"
    echo "    - Financial Dashboard (web_app/financial-dashboard.html)"
    echo "    - Field Management (apps_script/FieldManagementDashboard.html)"
    echo "    - And 9+ others (see CLAUDE.md Step 4B)"
    ((WARNINGS++))
fi

if [ -n "$DUPLICATE_SYSTEM" ]; then
    echo -e "  ${RED}CRITICAL: $DUPLICATE_SYSTEM${NC}"
    ((CRITICAL++))
else
    echo -e "  ${GREEN}PASS: Not a known duplicate system${NC}"
fi

# =============================================================================
# CHECK 7: TASK RISK CLASSIFICATION
# =============================================================================
echo ""
echo -e "${BLUE}[CHECK 7]${NC} Task Risk Classification..."

# Check if node and governor_helpers.js are available
GOVERNOR_HELPERS="$SCRIPT_DIR/governor_helpers.js"

if [ -f "$GOVERNOR_HELPERS" ] && command -v node &> /dev/null; then
    # Classify file risk using the governor system
    RISK_RESULT=$(node "$GOVERNOR_HELPERS" classify-file-risk "$FILE_NAME" "$ACTION" 2>/dev/null)

    if [ -z "$RISK_RESULT" ]; then
        RISK_RESULT='{"level":"LOW","error":"Could not classify"}'
    fi

    # Extract risk level (handle multiline JSON by collapsing to single line)
    RISK_RESULT_FLAT=$(echo "$RISK_RESULT" | tr -d '\n' | tr -s ' ')
    RISK_LEVEL=$(echo "$RISK_RESULT_FLAT" | sed 's/.*"level"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
    RISK_DESCRIPTION=$(echo "$RISK_RESULT_FLAT" | sed 's/.*"description"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' | head -c 100)
    MIN_TRUST=$(echo "$RISK_RESULT_FLAT" | sed 's/.*"minimumTrustLevel"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/')
    REQUIRES_APPROVAL=$(echo "$RISK_RESULT_FLAT" | sed 's/.*"requiresHumanApproval"[[:space:]]*:[[:space:]]*\([a-z]*\).*/\1/')
    REQUIRES_EXPLICIT=$(echo "$RISK_RESULT_FLAT" | sed 's/.*"requiresExplicitCommand"[[:space:]]*:[[:space:]]*\([a-z]*\).*/\1/')

    # Display risk level with appropriate color
    case "$RISK_LEVEL" in
        "LOW")
            echo -e "  Risk Level: ${GREEN}LOW${NC}"
            echo -e "  ${GREEN}Can proceed autonomously at Trust >= $MIN_TRUST%${NC}"
            ;;
        "MEDIUM")
            echo -e "  Risk Level: ${YELLOW}MEDIUM${NC}"
            echo -e "  ${YELLOW}Requires verification at Trust >= $MIN_TRUST%${NC}"
            ((WARNINGS++))
            ;;
        "HIGH")
            echo -e "  Risk Level: ${RED}HIGH${NC}"
            echo -e "  ${RED}REQUIRES HUMAN APPROVAL${NC}"
            echo -e "  Description: $RISK_DESCRIPTION"
            if [ "$REQUIRES_APPROVAL" = "true" ]; then
                echo -e "  ${RED}CRITICAL: HIGH risk tasks cannot proceed without explicit human approval${NC}"
                echo -e "  ${RED}Request approval from PM_Architect or Owner before proceeding${NC}"
                ((CRITICAL++))
            fi
            ;;
        "CRITICAL")
            echo -e "  Risk Level: ${RED}CRITICAL${NC}"
            echo -e "  ${RED}REQUIRES EXPLICIT HUMAN COMMAND${NC}"
            echo -e "  Description: $RISK_DESCRIPTION"
            echo -e "  ${RED}CRITICAL: This operation cannot proceed without EXPLICIT human instruction${NC}"
            echo -e "  ${RED}The human must directly command this action - DO NOT PROCEED AUTONOMOUSLY${NC}"
            ((CRITICAL++))
            ;;
        *)
            echo -e "  ${YELLOW}WARNING: Could not determine risk level${NC}"
            ((WARNINGS++))
            ;;
    esac

    # Show matched patterns if any
    MATCHED_PATTERNS=$(echo "$RISK_RESULT" | grep -o '"matchedPatterns":\[[^]]*\]' | sed 's/"matchedPatterns":\[//;s/\]//;s/"//g')
    if [ -n "$MATCHED_PATTERNS" ] && [ "$MATCHED_PATTERNS" != "" ]; then
        echo -e "  Matched patterns: $MATCHED_PATTERNS"
    fi
else
    echo -e "  ${YELLOW}SKIP: Risk classification not available (governor_helpers.js not found)${NC}"
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}   PRE-FLIGHT SUMMARY${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""

TOTAL_ISSUES=$((CRITICAL + WARNINGS))

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
    echo -e "${RED}Critical issues must be resolved before proceeding.${NC}"
    echo "If you believe this is incorrect, get PM_Architect approval."
    echo ""
    exit 2
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}============================================${NC}"
    echo -e "${YELLOW}  PROCEED WITH CAUTION${NC}"
    echo -e "${YELLOW}============================================${NC}"
    echo ""
    echo -e "${YELLOW}Review warnings above before proceeding.${NC}"
    echo "Document your justification in CHANGE_LOG.md."
    echo ""
    exit 1
else
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  ALL CHECKS PASSED${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo "You may proceed with the $ACTION operation."
    echo ""
    exit 0
fi
