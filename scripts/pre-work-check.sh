#!/bin/bash

# Tiny Seed OS - Pre-Work Validation Checklist
# Run this BEFORE starting any development work

echo "=============================================="
echo "  TINY SEED OS - PRE-WORK VALIDATION"
echo "=============================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_DIR="$(dirname "$0")/.."
ERRORS=0

# Check 1: CLAUDE.md exists
echo -e "${BLUE}[CHECK 1]${NC} CLAUDE.md exists..."
if [ -f "$BASE_DIR/CLAUDE.md" ]; then
    echo -e "  ${GREEN}✓ PASS${NC}"
else
    echo -e "  ${RED}✗ FAIL - CLAUDE.md not found!${NC}"
    ((ERRORS++))
fi

# Check 2: SYSTEM_MANIFEST.md exists
echo -e "${BLUE}[CHECK 2]${NC} SYSTEM_MANIFEST.md exists..."
if [ -f "$BASE_DIR/claude_sessions/pm_architect/SYSTEM_MANIFEST.md" ]; then
    echo -e "  ${GREEN}✓ PASS${NC}"
else
    echo -e "  ${RED}✗ FAIL - SYSTEM_MANIFEST.md not found!${NC}"
    ((ERRORS++))
fi

# Check 3: CHANGE_LOG.md exists
echo -e "${BLUE}[CHECK 3]${NC} CHANGE_LOG.md exists..."
if [ -f "$BASE_DIR/CHANGE_LOG.md" ]; then
    echo -e "  ${GREEN}✓ PASS${NC}"
else
    echo -e "  ${RED}✗ FAIL - CHANGE_LOG.md not found!${NC}"
    ((ERRORS++))
fi

# Check 4: api-config.js exists
echo -e "${BLUE}[CHECK 4]${NC} api-config.js exists..."
if [ -f "$BASE_DIR/web_app/api-config.js" ]; then
    echo -e "  ${GREEN}✓ PASS${NC}"
else
    echo -e "  ${RED}✗ FAIL - api-config.js not found!${NC}"
    ((ERRORS++))
fi

# Check 5: No uncommitted changes
echo -e "${BLUE}[CHECK 5]${NC} Git status clean..."
cd "$BASE_DIR"
if git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "  ${GREEN}✓ PASS${NC}"
else
    echo -e "  ${YELLOW}⚠ WARNING - Uncommitted changes exist${NC}"
fi

# Check 6: Count known duplicates
echo -e "${BLUE}[CHECK 6]${NC} Checking known duplicate systems..."

MORNING_BRIEF_COUNT=$(grep -r "function.*[Mm]orning[Bb]rief" "$BASE_DIR/apps_script/" 2>/dev/null | wc -l | tr -d ' ')
echo "  Morning Brief functions: $MORNING_BRIEF_COUNT (should be ≤4)"

APPROVAL_COUNT=$(grep -r "function.*[Aa]pprov" "$BASE_DIR/apps_script/" 2>/dev/null | wc -l | tr -d ' ')
echo "  Approval functions: $APPROVAL_COUNT"

echo ""

# Summary
echo "=============================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}PRE-WORK CHECK PASSED${NC}"
    echo ""
    echo "You may proceed with development."
else
    echo -e "${RED}PRE-WORK CHECK FAILED ($ERRORS errors)${NC}"
    echo ""
    echo "Fix the above issues before proceeding."
fi
echo "=============================================="

echo ""
echo -e "${YELLOW}REMINDERS:${NC}"
echo ""
echo "1. READ CLAUDE.md before starting work"
echo "2. CHECK SYSTEM_MANIFEST.md for existing functionality"
echo "3. RUN ./check-duplicates.sh <keyword> before adding functions"
echo "4. UPDATE CHANGE_LOG.md after making changes"
echo "5. STAY WITHIN YOUR ROLE'S SCOPE"
echo ""

echo "=============================================="
echo -e "${BLUE}ROLE BOUNDARIES${NC}"
echo "=============================================="
echo ""
echo "Backend_Claude:  /apps_script/*.js ONLY"
echo "Desktop_Claude:  Root .html, web_app/ admin files"
echo "Mobile_Claude:   Mobile .html, PWA manifests"
echo "UX_Claude:       CSS, design documentation"
echo "Sales_Claude:    Sales-related files only"
echo "Security_Claude: Auth files only"
echo "PM_Architect:    Documentation, coordination"
echo ""

exit $ERRORS
