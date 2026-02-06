#!/bin/bash
# =============================================================================
# ORPHANED ELEMENT REFERENCE VALIDATOR
# =============================================================================
# Prevents commits that reference HTML elements that don't exist.
# This catches the bug where HTML is removed but JavaScript still references it.
#
# Usage: ./scripts/validate-element-refs.sh [file.html]
#        If no file specified, checks all HTML files in project root
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get files to check
if [ -n "$1" ]; then
    FILES="$1"
else
    FILES=$(find . -maxdepth 2 -name "*.html" -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null)
fi

TOTAL_ERRORS=0

for FILE in $FILES; do
    if [ ! -f "$FILE" ]; then
        continue
    fi

    # Extract all id="..." attributes from HTML (handles both single and double quotes)
    # Using a more robust pattern that handles any valid ID characters
    HTML_IDS=$(grep -oE 'id="[^"]+"|id='"'"'[^'"'"']+'"'" "$FILE" 2>/dev/null | \
        sed -E 's/id="([^"]+)"/\1/g; s/id='"'"'([^'"'"']+)'"'"'/\1/g' | sort -u)

    # Also extract dynamically created IDs (e.g., element.id = 'myId')
    DYNAMIC_IDS=$(grep -oE "\.id *= *['\"][^'\"]+['\"]" "$FILE" 2>/dev/null | \
        sed -E "s/\.id *= *['\"]([^'\"]+)['\"]/\1/g" | sort -u)

    # Combine static and dynamic IDs
    HTML_IDS=$(echo -e "$HTML_IDS\n$DYNAMIC_IDS" | sort -u | grep -v '^$' || true)

    # Extract all getElementById('...') and getElementById("...") references
    JS_IDS_GET=$(grep -oE "getElementById\\(['\"][^'\"]+['\"]\\)" "$FILE" 2>/dev/null | \
        sed -E "s/getElementById\\(['\"]([^'\"]+)['\"]\\)/\\1/g" | sort -u)

    # Extract all querySelector('#...') references
    # Only extract the ID part (stop at space, dot, bracket, or other CSS selector chars)
    JS_IDS_QUERY=$(grep -oE "querySelector\\(['\"]#[^'\"]+['\"]\\)" "$FILE" 2>/dev/null | \
        sed -E "s/querySelector\\(['\"]#([^'\" .\\[>:]+).*['\"]\\)/\\1/g" | sort -u)

    # Combine all JS element references
    JS_IDS=$(echo -e "$JS_IDS_GET\n$JS_IDS_QUERY" | sort -u | grep -v '^$' || true)

    # Find orphaned references (IDs in JS but not in HTML)
    ORPHANED=""
    FILE_ERRORS=0

    while IFS= read -r id; do
        if [ -n "$id" ]; then
            # Check if this ID exists in HTML
            if ! echo "$HTML_IDS" | grep -qx "$id" 2>/dev/null; then
                # Check if the reference has a null check (safe pattern)
                # Pattern: "if (el)" or "el &&" after getElementById
                HAS_NULL_CHECK=$(grep -E "getElementById\(['\"]$id['\"]\)|querySelector\(['\"]#$id['\"]\)" "$FILE" 2>/dev/null | grep -E "if *\(.*\)|&& *[a-zA-Z]" | wc -l)
                if [ "$HAS_NULL_CHECK" -gt 0 ]; then
                    # Has null check - safe, skip this reference
                    continue
                fi

                # Get line numbers where this orphan is referenced
                LINES=$(grep -n "getElementById(['\"]$id['\"])\|querySelector(['\"]#$id['\"])" "$FILE" 2>/dev/null | cut -d: -f1 | tr '\n' ',' | sed 's/,$//')
                ORPHANED="$ORPHANED\n  ${YELLOW}$id${NC} (lines: $LINES)"
                FILE_ERRORS=$((FILE_ERRORS + 1))
            fi
        fi
    done <<< "$JS_IDS"

    if [ $FILE_ERRORS -gt 0 ]; then
        echo -e "${RED}ERROR:${NC} $FILE has $FILE_ERRORS orphaned reference(s):"
        echo -e "$ORPHANED"
        echo ""
        TOTAL_ERRORS=$((TOTAL_ERRORS + FILE_ERRORS))
    fi
done

if [ $TOTAL_ERRORS -gt 0 ]; then
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}COMMIT BLOCKED: $TOTAL_ERRORS orphaned element reference(s) found${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "These element IDs are referenced in JavaScript but do not exist in HTML."
    echo "Either:"
    echo "  1. Restore the missing HTML elements, OR"
    echo "  2. Remove/update the JavaScript code that references them"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ All JavaScript element references are valid${NC}"
exit 0
