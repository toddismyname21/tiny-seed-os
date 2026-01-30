#!/bin/bash

# =============================================================================
# TINY SEED OS - API URL VALIDATOR
# Run this script to check all files for correct API configuration
# =============================================================================

CORRECT_ID="AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔍 Scanning for API URL issues..."
echo "   Correct deployment: $CORRECT_ID"
echo ""

ISSUES=0

# Find all HTML and JS files with Google Apps Script URLs
while IFS= read -r file; do
    # Skip node_modules, .git, and api-config.js itself
    [[ "$file" == *"node_modules"* ]] && continue
    [[ "$file" == *".git"* ]] && continue
    [[ "$file" == *"api-config.js" ]] && continue

    # Check for wrong URLs
    WRONG=$(grep -n "script.google.com/macros/s/AKfycb" "$file" 2>/dev/null | grep -v "$CORRECT_ID")

    if [ -n "$WRONG" ]; then
        echo "❌ WRONG URL in: $file"
        echo "$WRONG" | while read line; do
            echo "   $line"
        done
        echo ""
        ISSUES=$((ISSUES + 1))
    fi
done < <(find "$PROJECT_ROOT" -type f \( -name "*.html" -o -name "*.js" \) 2>/dev/null)

if [ $ISSUES -eq 0 ]; then
    echo "✅ All API URLs are correct!"
else
    echo "═══════════════════════════════════════════"
    echo "❌ Found $ISSUES file(s) with wrong API URLs"
    echo ""
    echo "To fix, either:"
    echo "1. Import api-config.js: <script src=\"web_app/api-config.js\"></script>"
    echo "2. Use: const API_URL = TINY_SEED_API.MAIN_API;"
    echo ""
    echo "Or replace wrong URL with:"
    echo "https://script.google.com/macros/s/$CORRECT_ID/exec"
    exit 1
fi
