#!/bin/bash
# =============================================================================
# UNUSED CSS FINDER
# =============================================================================
# Extracts CSS selectors from <style> blocks in HTML files and checks whether
# they have corresponding targets in the HTML or JS.
#
# Detects:
# - CSS classes with no matching HTML elements or JS references
# - CSS IDs with no matching HTML elements
# - Duplicate CSS rules (same selector defined multiple times)
# - CSS @keyframes that are never referenced
#
# Usage: bash scripts/audit/unused-css-finder.sh <file.html>
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo -e "${RED}Usage: bash unused-css-finder.sh <file.html>${NC}"
    exit 1
fi

FILE="$1"
if [ ! -f "$FILE" ]; then
    echo -e "${RED}File not found: $FILE${NC}"
    exit 1
fi

echo -e "\n${CYAN}=== UNUSED CSS FINDER ===${NC}"
echo "File: $FILE"
echo ""

WARNINGS=0

# =============================================================================
# Extract CSS class selectors from <style> blocks
# =============================================================================
echo -e "${CYAN}--- Check 1: Unused CSS classes ---${NC}"

# Extract content between <style> tags
STYLE_CONTENT=$(sed -n '/<style/,/<\/style>/p' "$FILE" | grep -v '<style' | grep -v '</style>')

# Extract class selectors (.classname)
CSS_CLASSES=$(echo "$STYLE_CONTENT" | grep -oE '\.[a-zA-Z_-][a-zA-Z0-9_-]*' | sed 's/^\.//' | sort -u)

UNUSED_CLASSES=0
TOTAL_CLASSES=$(echo "$CSS_CLASSES" | grep -v '^$' | wc -l | tr -d ' ')

while IFS= read -r class; do
    [ -z "$class" ] && continue

    # Check if this class is used in HTML (class="..." attributes)
    HTML_REF=$(grep -c "class=\"[^\"]*\b${class}\b" "$FILE" 2>/dev/null || true)

    # Check if this class is used in JS (classList.add, querySelector, etc.)
    JS_REF=$(grep -c "\b${class}\b" "$FILE" 2>/dev/null || true)

    # Subtract the CSS definition occurrences (in <style> block)
    CSS_DEF_COUNT=$(echo "$STYLE_CONTENT" | grep -c "\\.${class}" 2>/dev/null || true)

    # Net references = total occurrences - CSS definitions
    NET_REFS=$((JS_REF - CSS_DEF_COUNT))

    if [ "$HTML_REF" -eq 0 ] && [ "$NET_REFS" -le 0 ]; then
        # Find the line number of the CSS rule
        CSS_LINE=$(grep -n "\\.${class}" "$FILE" 2>/dev/null | head -1 | cut -d: -f1)
        echo -e "  ${YELLOW}[UNUSED]${NC} .${class} (CSS at line ${CSS_LINE}) - no HTML or JS reference found"
        UNUSED_CLASSES=$((UNUSED_CLASSES + 1))
    fi
done <<< "$CSS_CLASSES"

if [ $UNUSED_CLASSES -eq 0 ]; then
    echo -e "  ${GREEN}All CSS classes are referenced.${NC}"
else
    echo -e "  ${YELLOW}${UNUSED_CLASSES} of ${TOTAL_CLASSES} CSS classes appear unused.${NC}"
    echo -e "  ${YELLOW}Note: Some may be used dynamically via JS string construction.${NC}"
fi
WARNINGS=$((WARNINGS + UNUSED_CLASSES))
echo ""

# =============================================================================
# Check 2: Duplicate CSS selectors
# =============================================================================
echo -e "${CYAN}--- Check 2: Duplicate CSS selectors ---${NC}"

# Extract all selectors (line before { in style blocks)
# This is a simplified approach - extract lines that look like selectors
SELECTORS=$(echo "$STYLE_CONTENT" | grep -E '^\s*[.#@a-zA-Z]' | grep -v '{' | grep -v '}' | sed 's/^\s*//' | sed 's/\s*$//')

# Also get selectors from lines with { on same line
INLINE_SELECTORS=$(echo "$STYLE_CONTENT" | grep '{' | sed 's/{.*//' | sed 's/^\s*//' | sed 's/\s*$//' | grep -v '^\s*$' | grep -v '@')

ALL_SELECTORS=$(echo -e "$SELECTORS\n$INLINE_SELECTORS" | sort | grep -v '^$')

# Find duplicates
DUP_SELECTORS=$(echo "$ALL_SELECTORS" | sort | uniq -d)
DUP_COUNT=$(echo "$DUP_SELECTORS" | grep -v '^$' | wc -l | tr -d ' ')

if [ "$DUP_COUNT" -gt 0 ]; then
    echo -e "  ${YELLOW}Duplicate CSS selectors found: ${DUP_COUNT}${NC}"
    while IFS= read -r sel; do
        [ -z "$sel" ] && continue
        # Find line numbers
        LINES=$(grep -n "${sel}" "$FILE" 2>/dev/null | head -5 | cut -d: -f1 | tr '\n' ',' | sed 's/,$//')
        echo -e "  ${YELLOW}[DUPLICATE]${NC} '${sel}' appears at lines: ${LINES}"
    done <<< "$DUP_SELECTORS"
    WARNINGS=$((WARNINGS + DUP_COUNT))
else
    echo -e "  ${GREEN}No duplicate selectors found.${NC}"
fi
echo ""

# =============================================================================
# Check 3: Unused @keyframes
# =============================================================================
echo -e "${CYAN}--- Check 3: Unused @keyframes animations ---${NC}"

KEYFRAMES=$(echo "$STYLE_CONTENT" | grep -oE '@keyframes\s+[a-zA-Z_-][a-zA-Z0-9_-]*' | sed 's/@keyframes\s*//' | sort -u)
UNUSED_KF=0
TOTAL_KF=$(echo "$KEYFRAMES" | grep -v '^$' | wc -l | tr -d ' ')

while IFS= read -r kf; do
    [ -z "$kf" ] && continue

    # Check if this animation name is referenced (animation: or animation-name:)
    REF_COUNT=$(grep -c "\b${kf}\b" "$FILE" 2>/dev/null || true)
    # Subtract the @keyframes definition itself
    NET=$((REF_COUNT - 1))

    if [ $NET -le 0 ]; then
        KF_LINE=$(grep -n "@keyframes\s*${kf}" "$FILE" 2>/dev/null | head -1 | cut -d: -f1)
        echo -e "  ${YELLOW}[UNUSED]${NC} @keyframes ${kf} (line ${KF_LINE}) - never referenced in animation properties"
        UNUSED_KF=$((UNUSED_KF + 1))
    fi
done <<< "$KEYFRAMES"

if [ $UNUSED_KF -eq 0 ]; then
    echo -e "  ${GREEN}All @keyframes are referenced.${NC}"
fi
WARNINGS=$((WARNINGS + UNUSED_KF))
echo ""

# =============================================================================
# Check 4: CSS custom properties (variables) defined but never used
# =============================================================================
echo -e "${CYAN}--- Check 4: Unused CSS custom properties ---${NC}"

CSS_VARS=$(echo "$STYLE_CONTENT" | grep -oE '--[a-zA-Z_-][a-zA-Z0-9_-]*\s*:' | sed 's/\s*://' | sort -u)
UNUSED_VARS=0

while IFS= read -r varname; do
    [ -z "$varname" ] && continue

    # Count references via var(--name)
    USAGE_COUNT=$(grep -c "var(${varname}" "$FILE" 2>/dev/null || true)

    if [ $USAGE_COUNT -eq 0 ]; then
        VAR_LINE=$(grep -n "${varname}\s*:" "$FILE" 2>/dev/null | head -1 | cut -d: -f1)
        echo -e "  ${YELLOW}[UNUSED]${NC} ${varname} (line ${VAR_LINE}) - defined but never used with var()"
        UNUSED_VARS=$((UNUSED_VARS + 1))
    fi
done <<< "$CSS_VARS"

if [ $UNUSED_VARS -eq 0 ]; then
    echo -e "  ${GREEN}All CSS custom properties are used.${NC}"
fi
WARNINGS=$((WARNINGS + UNUSED_VARS))
echo ""

# =============================================================================
# SUMMARY
# =============================================================================
echo -e "${CYAN}=== SUMMARY ===${NC}"
echo "CSS classes checked: $TOTAL_CLASSES"
echo "Unused classes: $UNUSED_CLASSES"
echo "Duplicate selectors: $DUP_COUNT"
echo "Unused @keyframes: $UNUSED_KF"
echo "Unused custom properties: $UNUSED_VARS"
echo "Total warnings: $WARNINGS"
echo ""

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}PASS WITH WARNINGS: ${WARNINGS} unused CSS element(s) found${NC}"
    exit 1
else
    echo -e "${GREEN}PASS: All CSS appears to be used${NC}"
    exit 0
fi
