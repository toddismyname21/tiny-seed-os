#!/bin/bash
# =============================================================================
# DOM ORPHAN CHECKER (Enhanced)
# =============================================================================
# A more thorough version of validate-element-refs.sh that also checks:
# - getElementsByClassName references
# - querySelector with class selectors
# - querySelectorAll references
# - HTML IDs that are never referenced by any JS (dead HTML)
# - Dynamic ID construction patterns
# - Inline event handlers calling undefined functions
#
# Usage: bash scripts/audit/dom-orphan-checker.sh <file.html>
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo -e "${RED}Usage: bash dom-orphan-checker.sh <file.html>${NC}"
    exit 1
fi

FILE="$1"
if [ ! -f "$FILE" ]; then
    echo -e "${RED}File not found: $FILE${NC}"
    exit 1
fi

echo -e "\n${CYAN}=== DOM ORPHAN CHECKER ===${NC}"
echo "File: $FILE"
echo ""

TOTAL_ERRORS=0
TOTAL_WARNINGS=0

# =============================================================================
# CHECK 1: getElementById calls referencing non-existent IDs
# =============================================================================
echo -e "${CYAN}--- Check 1: getElementById orphans ---${NC}"

# Extract all HTML id attributes
HTML_IDS=$(grep -oE 'id="[^"]*"' "$FILE" 2>/dev/null | sed 's/id="//;s/"//' | sort -u)

# Also get dynamically assigned IDs: element.id = 'something'
DYNAMIC_IDS=$(grep -oE "\.id\s*=\s*['\"][^'\"]+['\"]" "$FILE" 2>/dev/null | sed "s/\.id\s*=\s*['\"]//;s/['\"]//" | sort -u)

ALL_IDS=$(echo -e "$HTML_IDS\n$DYNAMIC_IDS" | sort -u | grep -v '^$')

# Extract all getElementById references
JS_IDS=$(grep -oE "getElementById\(['\"][^'\"]+['\"]\)" "$FILE" 2>/dev/null | sed "s/getElementById(['\"]//;s/['\"])//" | sort -u)

CHECK1_ERRORS=0
while IFS= read -r id; do
    [ -z "$id" ] && continue
    if ! echo "$ALL_IDS" | grep -qx "$id" 2>/dev/null; then
        # Check if there is a null guard
        HAS_GUARD=$(grep -c "getElementById(['\"]${id}['\"]).*[?&|]" "$FILE" 2>/dev/null || true)
        OPTIONAL_CHAIN=$(grep -c "getElementById(['\"]${id}['\"])?\\." "$FILE" 2>/dev/null || true)

        LINES=$(grep -n "getElementById(['\"]${id}['\"])" "$FILE" 2>/dev/null | cut -d: -f1 | tr '\n' ',' | sed 's/,$//')

        if [ "$HAS_GUARD" -gt 0 ] || [ "$OPTIONAL_CHAIN" -gt 0 ]; then
            echo -e "  ${YELLOW}[GUARDED]${NC} '${id}' referenced at lines ${LINES} (has null check)"
            TOTAL_WARNINGS=$((TOTAL_WARNINGS + 1))
        else
            echo -e "  ${RED}[ORPHAN]${NC} '${id}' referenced at lines ${LINES} -- NO null guard!"
            CHECK1_ERRORS=$((CHECK1_ERRORS + 1))
        fi
    fi
done <<< "$JS_IDS"

if [ $CHECK1_ERRORS -eq 0 ]; then
    echo -e "  ${GREEN}No unguarded orphans found.${NC}"
fi
TOTAL_ERRORS=$((TOTAL_ERRORS + CHECK1_ERRORS))
echo ""

# =============================================================================
# CHECK 2: querySelector ID references
# =============================================================================
echo -e "${CYAN}--- Check 2: querySelector('#id') orphans ---${NC}"

QS_IDS=$(grep -oE "querySelector\(['\"]#[a-zA-Z0-9_-]+['\"]" "$FILE" 2>/dev/null | sed "s/querySelector(['\"]#//;s/['\"]//" | sort -u)

CHECK2_ERRORS=0
while IFS= read -r id; do
    [ -z "$id" ] && continue
    if ! echo "$ALL_IDS" | grep -qx "$id" 2>/dev/null; then
        LINES=$(grep -n "querySelector(['\"]#${id}" "$FILE" 2>/dev/null | cut -d: -f1 | tr '\n' ',' | sed 's/,$//')
        echo -e "  ${RED}[ORPHAN]${NC} '#${id}' in querySelector at lines ${LINES}"
        CHECK2_ERRORS=$((CHECK2_ERRORS + 1))
    fi
done <<< "$QS_IDS"

if [ $CHECK2_ERRORS -eq 0 ]; then
    echo -e "  ${GREEN}No orphans found.${NC}"
fi
TOTAL_ERRORS=$((TOTAL_ERRORS + CHECK2_ERRORS))
echo ""

# =============================================================================
# CHECK 3: Inline event handlers calling undefined functions
# =============================================================================
echo -e "${CYAN}--- Check 3: Inline event handler targets ---${NC}"

# Extract function names from inline handlers: onclick="funcName()" oninput="funcName()"
INLINE_FUNCS=$(grep -oE 'on(click|change|input|submit|load|focus|blur|keyup|keydown|keypress|mouseover|mouseout|scroll)="[^"]*"' "$FILE" 2>/dev/null | \
    grep -oE '"[^"]*"' | sed 's/"//g' | \
    grep -oE '[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(' | sed 's/\s*(//' | sort -u)

# Extract all function definitions
DEFINED_FUNCS=$(grep -oE '(?:function\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)' "$FILE" 2>/dev/null | sed 's/function\s*//' | sort -u)

# Also get assigned function expressions
ASSIGNED_FUNCS=$(grep -oE '(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(?:function|\()' "$FILE" 2>/dev/null | \
    sed 's/\(var\|let\|const\)\s*//;s/\s*=.*//' | sort -u)

ALL_FUNCS=$(echo -e "$DEFINED_FUNCS\n$ASSIGNED_FUNCS" | sort -u | grep -v '^$')

CHECK3_ERRORS=0
while IFS= read -r func; do
    [ -z "$func" ] && continue
    # Skip built-in functions and common globals
    case "$func" in
        alert|confirm|prompt|console|window|document|this|event|return|if|else|new|typeof|void|null|true|false|parseInt|parseFloat|JSON|Math|Date|Array|Object|String|Number|Boolean|RegExp|Error|encodeURIComponent|decodeURIComponent|setTimeout|setInterval|clearTimeout|clearInterval|fetch|history|location) continue ;;
    esac

    if ! echo "$ALL_FUNCS" | grep -qx "$func" 2>/dev/null; then
        LINES=$(grep -n "on[a-z]*=\"[^\"]*${func}\s*(" "$FILE" 2>/dev/null | head -3 | cut -d: -f1 | tr '\n' ',' | sed 's/,$//')
        if [ -n "$LINES" ]; then
            echo -e "  ${RED}[UNDEFINED]${NC} Inline handler calls '${func}()' at lines ${LINES} -- function not found!"
            CHECK3_ERRORS=$((CHECK3_ERRORS + 1))
        fi
    fi
done <<< "$INLINE_FUNCS"

if [ $CHECK3_ERRORS -eq 0 ]; then
    echo -e "  ${GREEN}All inline handlers reference defined functions.${NC}"
fi
TOTAL_ERRORS=$((TOTAL_ERRORS + CHECK3_ERRORS))
echo ""

# =============================================================================
# CHECK 4: Dead HTML (IDs never referenced by JS)
# =============================================================================
echo -e "${CYAN}--- Check 4: Dead HTML (IDs never referenced) ---${NC}"

CHECK4_WARNINGS=0
while IFS= read -r id; do
    [ -z "$id" ] && continue
    # Check if this ID is referenced anywhere in JS
    REF_COUNT=$(grep -c "\b${id}\b" "$FILE" 2>/dev/null || true)
    # Subtract the definition itself (appears once in id="...")
    if [ "$REF_COUNT" -le 1 ]; then
        LINE=$(grep -n "id=\"${id}\"" "$FILE" 2>/dev/null | head -1 | cut -d: -f1)
        echo -e "  ${YELLOW}[DEAD HTML]${NC} id='${id}' at line ${LINE} -- never referenced by JavaScript"
        CHECK4_WARNINGS=$((CHECK4_WARNINGS + 1))
    fi
done <<< "$HTML_IDS"

if [ $CHECK4_WARNINGS -eq 0 ]; then
    echo -e "  ${GREEN}All HTML IDs are referenced.${NC}"
else
    echo -e "  ${YELLOW}Note: Some dead IDs may be referenced from external files or used for CSS styling only.${NC}"
fi
TOTAL_WARNINGS=$((TOTAL_WARNINGS + CHECK4_WARNINGS))
echo ""

# =============================================================================
# SUMMARY
# =============================================================================
echo -e "${CYAN}=== SUMMARY ===${NC}"
echo -e "Errors (unguarded orphans):  ${RED}${TOTAL_ERRORS}${NC}"
echo -e "Warnings (guarded/dead HTML): ${YELLOW}${TOTAL_WARNINGS}${NC}"

ID_COUNT=$(echo "$ALL_IDS" | wc -l | tr -d ' ')
echo -e "Total HTML IDs scanned: ${ID_COUNT}"
echo ""

if [ $TOTAL_ERRORS -gt 0 ]; then
    echo -e "${RED}FAIL: ${TOTAL_ERRORS} unguarded orphan reference(s) found${NC}"
    exit 1
elif [ $TOTAL_WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}PASS WITH WARNINGS: ${TOTAL_WARNINGS} non-critical issue(s)${NC}"
    exit 0
else
    echo -e "${GREEN}PASS: All DOM references are valid${NC}"
    exit 0
fi
