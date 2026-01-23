#!/bin/bash

# Tiny Seed OS - Anti-Pattern Scanner
# Detects code quality issues that violate integration standards

echo "=============================================="
echo "  TINY SEED OS - ANTI-PATTERN SCANNER"
echo "=============================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_DIR="$(dirname "$0")/.."
ISSUES=0

# Scan 1: Demo/Sample data fallbacks
echo -e "${BLUE}[SCAN 1]${NC} Demo/Sample data fallbacks..."
echo "  Files with potential demo data:"
DEMO_FILES=$(grep -rl --include="*.html" -i "demo\|sample.*data\|fallback.*data\|mock.*data" "$BASE_DIR/" 2>/dev/null | grep -v "FLOWER FARMING" | grep -v "node_modules")
if [ -n "$DEMO_FILES" ]; then
    echo "$DEMO_FILES" | while read file; do
        echo -e "  ${RED}⚠ $file${NC}"
        ((ISSUES++))
    done
else
    echo -e "  ${GREEN}✓ None found${NC}"
fi
echo ""

# Scan 2: Hardcoded API URLs (not using api-config.js)
echo -e "${BLUE}[SCAN 2]${NC} Hardcoded API URLs..."
echo "  Files with hardcoded script.google.com URLs:"
HARDCODED=$(grep -rl --include="*.html" "script.google.com/macros" "$BASE_DIR/" 2>/dev/null | grep -v "FLOWER FARMING" | grep -v "api-config.js" | grep -v "CLAUDE")
if [ -n "$HARDCODED" ]; then
    echo "$HARDCODED" | while read file; do
        echo -e "  ${YELLOW}⚠ $file${NC}"
    done
    echo ""
    echo -e "  ${YELLOW}Note: These should use api-config.js instead${NC}"
else
    echo -e "  ${GREEN}✓ All using api-config.js${NC}"
fi
echo ""

# Scan 3: Missing error handling
echo -e "${BLUE}[SCAN 3]${NC} Catch blocks with demo fallbacks..."
CATCH_DEMO=$(grep -rn --include="*.html" -A5 "catch.*{" "$BASE_DIR/" 2>/dev/null | grep -i "demo\|sample\|fallback" | grep -v "FLOWER")
if [ -n "$CATCH_DEMO" ]; then
    echo -e "  ${RED}Found catch blocks falling back to demo data:${NC}"
    echo "$CATCH_DEMO" | head -20
else
    echo -e "  ${GREEN}✓ No demo fallbacks in catch blocks${NC}"
fi
echo ""

# Scan 4: Duplicate function names
echo -e "${BLUE}[SCAN 4]${NC} Potentially duplicate functions..."
echo "  Checking for multiple definitions of same function:"

# Check for getMorningBrief variations
MORNING_COUNT=$(grep -rh --include="*.js" "function.*[Mm]orning[Bb]rief" "$BASE_DIR/apps_script/" 2>/dev/null | wc -l | tr -d ' ')
if [ "$MORNING_COUNT" -gt 1 ]; then
    echo -e "  ${RED}⚠ Morning Brief functions: $MORNING_COUNT (DUPLICATE!)${NC}"
    grep -rn --include="*.js" "function.*[Mm]orning[Bb]rief" "$BASE_DIR/apps_script/" 2>/dev/null
else
    echo -e "  ${GREEN}✓ Morning Brief: OK${NC}"
fi
echo ""

# Scan 5: Files outside role scope
echo -e "${BLUE}[SCAN 5]${NC} Recent modifications..."
echo "  Files modified in last 24 hours:"
find "$BASE_DIR" -type f \( -name "*.js" -o -name "*.html" \) -mtime -1 2>/dev/null | grep -v "node_modules" | grep -v "FLOWER" | head -20
echo ""

# Summary
echo "=============================================="
echo -e "${YELLOW}ANTI-PATTERN SUMMARY${NC}"
echo "=============================================="
echo ""
echo "If you found issues above:"
echo "1. Demo data fallbacks → Replace with proper error handling"
echo "2. Hardcoded URLs → Use api-config.js"
echo "3. Duplicate functions → Consolidate into one"
echo ""
echo "See CLAUDE_INTEGRATION_STANDARDS.md for coding rules."
echo ""
