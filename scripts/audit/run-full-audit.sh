#!/bin/bash
# =============================================================================
# FULL AUDIT SUITE RUNNER
# =============================================================================
# Orchestrates all audit scripts in sequence and produces a summary report.
#
# Usage:
#   bash scripts/audit/run-full-audit.sh <file>           # Audit a specific file
#   bash scripts/audit/run-full-audit.sh                    # Audit all HTML files
#   bash scripts/audit/run-full-audit.sh --quick <file>    # Quick audit (skip slow checks)
#
# Exit codes:
#   0 = All checks passed
#   1 = Warnings found
#   2 = Errors found (blocking)
# =============================================================================

set -o pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Parse arguments
QUICK_MODE=false
TARGET_FILE=""

for arg in "$@"; do
    case "$arg" in
        --quick) QUICK_MODE=true ;;
        *) TARGET_FILE="$arg" ;;
    esac
done

# If no file specified, find all HTML files
if [ -z "$TARGET_FILE" ]; then
    echo -e "${CYAN}No file specified. Finding all HTML files...${NC}"
    FILES=$(find "$PROJECT_ROOT" -maxdepth 2 -name "*.html" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null)
    FILE_COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
    echo "Found ${FILE_COUNT} HTML files"
else
    if [ ! -f "$TARGET_FILE" ]; then
        # Try relative to project root
        if [ -f "$PROJECT_ROOT/$TARGET_FILE" ]; then
            TARGET_FILE="$PROJECT_ROOT/$TARGET_FILE"
        else
            echo -e "${RED}File not found: $TARGET_FILE${NC}"
            exit 1
        fi
    fi
    FILES="$TARGET_FILE"
fi

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║          CODE AUDIT SUITE - FULL SWEEP           ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Mode: $([ "$QUICK_MODE" = true ] && echo 'QUICK' || echo 'FULL')"
echo ""

# Track results
TOTAL_ERRORS=0
TOTAL_WARNINGS=0
TOOL_RESULTS=""

run_tool() {
    local NAME="$1"
    local COMMAND="$2"
    local FILE="$3"

    echo -e "${CYAN}━━━ Running: ${NAME} ━━━${NC}"

    # Create temp file for output
    TEMP_OUTPUT=$(mktemp)

    # Run the command and capture output + exit code
    eval "$COMMAND \"$FILE\"" > "$TEMP_OUTPUT" 2>&1
    EXIT_CODE=$?

    # Show output
    cat "$TEMP_OUTPUT"

    # Classify result
    local STATUS=""
    local STATUS_COLOR=""
    case $EXIT_CODE in
        0) STATUS="PASS"; STATUS_COLOR="${GREEN}" ;;
        1) STATUS="WARNINGS"; STATUS_COLOR="${YELLOW}"; TOTAL_WARNINGS=$((TOTAL_WARNINGS + 1)) ;;
        2) STATUS="FAIL"; STATUS_COLOR="${RED}"; TOTAL_ERRORS=$((TOTAL_ERRORS + 1)) ;;
        *) STATUS="ERROR"; STATUS_COLOR="${RED}"; TOTAL_ERRORS=$((TOTAL_ERRORS + 1)) ;;
    esac

    TOOL_RESULTS="${TOOL_RESULTS}\n  ${STATUS_COLOR}[${STATUS}]${NC} ${NAME}"

    rm -f "$TEMP_OUTPUT"
    echo ""
    return $EXIT_CODE
}

# Process each file
for FILE in $FILES; do
    echo -e "${BOLD}${CYAN}File: $(basename "$FILE")${NC}"
    echo -e "${CYAN}Path: $FILE${NC}"
    echo -e "${CYAN}Size: $(wc -l < "$FILE" | tr -d ' ') lines${NC}"
    echo ""

    # Tool 1: Duplicate Function Detector
    run_tool "Duplicate Function Detector" "node ${SCRIPT_DIR}/duplicate-function-detector.js" "$FILE" || true

    # Tool 2: Dead Code Finder
    run_tool "Dead Code Finder" "node ${SCRIPT_DIR}/dead-code-finder.js" "$FILE" || true

    # Tool 3: DOM Orphan Checker
    run_tool "DOM Orphan Checker" "bash ${SCRIPT_DIR}/dom-orphan-checker.sh" "$FILE" || true

    # Tool 4: Stub Function Detector
    run_tool "Stub Function Detector" "node ${SCRIPT_DIR}/stub-function-detector.js" "$FILE" || true

    # Tool 5: API Contract Validator
    run_tool "API Contract Validator" "node ${SCRIPT_DIR}/api-contract-validator.js" "$FILE" || true

    # Tool 6: Event Listener Auditor
    run_tool "Event Listener Auditor" "node ${SCRIPT_DIR}/event-listener-auditor.js" "$FILE" || true

    if [ "$QUICK_MODE" = false ]; then
        # Tool 7: Unused CSS Finder (slower on large files)
        run_tool "Unused CSS Finder" "bash ${SCRIPT_DIR}/unused-css-finder.sh" "$FILE" || true

        # Tool 8: Async Pattern Checker (slower)
        run_tool "Async Pattern Checker" "bash ${SCRIPT_DIR}/async-pattern-checker.sh" "$FILE" || true

        # Tool 9: Function Call Graph (slow on very large files)
        run_tool "Function Call Graph" "node ${SCRIPT_DIR}/function-call-graph.js" "$FILE" || true
    fi

    # Tool 10: Element Reference Validator (existing script)
    if [ -f "$PROJECT_ROOT/scripts/validate-element-refs.sh" ]; then
        run_tool "Element Reference Validator" "bash ${PROJECT_ROOT}/scripts/validate-element-refs.sh" "$FILE" || true
    fi

    # Tool 11: API URL Validator (existing script)
    if [ -f "$PROJECT_ROOT/scripts/validate-api-urls.sh" ]; then
        run_tool "API URL Validator" "bash ${PROJECT_ROOT}/scripts/validate-api-urls.sh" "$FILE" || true
    fi
done

# =============================================================================
# FINAL SUMMARY
# =============================================================================
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║             AUDIT SUITE RESULTS                  ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Tool Results:${TOOL_RESULTS}"
echo ""
echo -e "Total Errors (blocking):  ${RED}${TOTAL_ERRORS}${NC}"
echo -e "Total Warnings:           ${YELLOW}${TOTAL_WARNINGS}${NC}"
echo ""

if [ $TOTAL_ERRORS -gt 0 ]; then
    echo -e "${RED}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  VERDICT: FAIL -- ${TOTAL_ERRORS} blocking error(s) found       ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════╝${NC}"
    exit 2
elif [ $TOTAL_WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  VERDICT: PASS WITH WARNINGS                     ║${NC}"
    echo -e "${YELLOW}╚══════════════════════════════════════════════════╝${NC}"
    exit 1
else
    echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  VERDICT: PASS -- All checks clean               ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
    exit 0
fi
