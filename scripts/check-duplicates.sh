#!/bin/bash

# Tiny Seed OS - Duplicate Detection Script
# Run this BEFORE creating any new functions to check for existing similar functionality

echo "=============================================="
echo "  TINY SEED OS - DUPLICATE DETECTION"
echo "=============================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if a search term was provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: ./check-duplicates.sh <function_name_or_keyword>${NC}"
    echo ""
    echo "Examples:"
    echo "  ./check-duplicates.sh getMorningBrief"
    echo "  ./check-duplicates.sh invite"
    echo "  ./check-duplicates.sh approval"
    echo ""
    exit 1
fi

SEARCH_TERM="$1"
BASE_DIR="$(dirname "$0")/.."

echo -e "Searching for: ${YELLOW}${SEARCH_TERM}${NC}"
echo ""

# Search in Apps Script files
echo "=============================================="
echo -e "${GREEN}APPS SCRIPT FILES (/apps_script/*.js)${NC}"
echo "=============================================="
grep -rn --include="*.js" -i "$SEARCH_TERM" "$BASE_DIR/apps_script/" 2>/dev/null | head -50

echo ""

# Search in HTML files
echo "=============================================="
echo -e "${GREEN}HTML FILES (*.html)${NC}"
echo "=============================================="
grep -rn --include="*.html" -i "$SEARCH_TERM" "$BASE_DIR/" 2>/dev/null | grep -v "FLOWER FARMING" | grep -v "Johnny's" | head -50

echo ""

# Search for function definitions specifically
echo "=============================================="
echo -e "${GREEN}FUNCTION DEFINITIONS (function $SEARCH_TERM)${NC}"
echo "=============================================="
grep -rn --include="*.js" -i "function.*$SEARCH_TERM" "$BASE_DIR/apps_script/" 2>/dev/null

echo ""

# Known duplicates warning
echo "=============================================="
echo -e "${RED}KNOWN DUPLICATE SYSTEMS - DO NOT ADD MORE${NC}"
echo "=============================================="
echo ""
echo "1. MORNING BRIEF (4 versions exist):"
echo "   - getMorningBrief() in MERGED TOTAL.js"
echo "   - generateMorningBrief() in MorningBriefGenerator.js"
echo "   - getChiefMorningBrief() in ChiefOfStaff_Master.js"
echo "   - getFarmMorningBrief() in FarmIntelligence.js"
echo ""
echo "2. APPROVAL SYSTEM (2 versions exist):"
echo "   - EmailWorkflowEngine.js"
echo "   - chief-of-staff.html approval tab"
echo ""
echo "3. EMAIL PROCESSING (3 pipelines):"
echo "   - ChiefOfStaff_Master.js"
echo "   - EmailWorkflowEngine.js"
echo "   - Various scattered functions"
echo ""

echo "=============================================="
echo -e "${YELLOW}RECOMMENDATION${NC}"
echo "=============================================="
echo ""
echo "If you found existing similar functionality:"
echo "  1. DO NOT create a new version"
echo "  2. Extend or modify the existing function"
echo "  3. If truly needed, consolidate first"
echo ""
echo "Check SYSTEM_MANIFEST.md for full inventory:"
echo "  claude_sessions/pm_architect/SYSTEM_MANIFEST.md"
echo ""
