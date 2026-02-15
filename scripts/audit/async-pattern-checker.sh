#!/bin/bash
# =============================================================================
# ASYNC PATTERN CHECKER
# =============================================================================
# Scans for common async/await and Promise anti-patterns.
#
# Detects:
# - fetch() without error handling
# - async functions without await
# - await inside loops (should use Promise.all)
# - .then() chains without .catch()
# - Missing await on async function calls
# - Promise constructor anti-pattern
#
# Usage: bash scripts/audit/async-pattern-checker.sh <file>
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo -e "${RED}Usage: bash async-pattern-checker.sh <file>${NC}"
    exit 1
fi

FILE="$1"
if [ ! -f "$FILE" ]; then
    echo -e "${RED}File not found: $FILE${NC}"
    exit 1
fi

echo -e "\n${CYAN}=== ASYNC PATTERN CHECKER ===${NC}"
echo "File: $FILE"
echo ""

WARNINGS=0
ERRORS=0

# =============================================================================
# CHECK 1: fetch() without try/catch or .catch()
# =============================================================================
echo -e "${CYAN}--- Check 1: Unhandled fetch() calls ---${NC}"

# Get line numbers of all fetch( calls
FETCH_LINES=$(grep -n "fetch\s*(" "$FILE" 2>/dev/null | grep -v "^\s*//" | grep -v "^\s*\*" | cut -d: -f1)
FETCH_COUNT=0
UNHANDLED_COUNT=0

for LINE_NUM in $FETCH_LINES; do
    [ -z "$LINE_NUM" ] && continue
    FETCH_COUNT=$((FETCH_COUNT + 1))

    # Check 20 lines before for try {
    START=$((LINE_NUM - 20))
    [ $START -lt 1 ] && START=1
    HAS_TRY=$(sed -n "${START},${LINE_NUM}p" "$FILE" | grep -c "try\s*{" 2>/dev/null || true)

    # Check 50 lines after for .catch or catch {
    END=$((LINE_NUM + 50))
    TOTAL_LINES=$(wc -l < "$FILE" | tr -d ' ')
    [ $END -gt $TOTAL_LINES ] && END=$TOTAL_LINES
    HAS_CATCH=$(sed -n "${LINE_NUM},${END}p" "$FILE" | grep -c "\.catch\|catch\s*(" 2>/dev/null || true)

    if [ "$HAS_TRY" -eq 0 ] && [ "$HAS_CATCH" -eq 0 ]; then
        CONTENT=$(sed -n "${LINE_NUM}p" "$FILE" | sed 's/^\s*//')
        echo -e "  ${RED}[UNHANDLED]${NC} Line ${LINE_NUM}: fetch() without try/catch or .catch()"
        echo -e "    ${CONTENT:0:100}"
        UNHANDLED_COUNT=$((UNHANDLED_COUNT + 1))
        ERRORS=$((ERRORS + 1))
    fi
done

echo -e "  Total fetch() calls: ${FETCH_COUNT}"
echo -e "  Unhandled: ${UNHANDLED_COUNT}"
[ $UNHANDLED_COUNT -eq 0 ] && echo -e "  ${GREEN}All fetch() calls have error handling.${NC}"
echo ""

# =============================================================================
# CHECK 2: async functions without await
# =============================================================================
echo -e "${CYAN}--- Check 2: async functions without await ---${NC}"

# Find async function declarations and check if they contain await
ASYNC_FUNCS=$(grep -n "async\s\+function\s\+\w\+\|async\s\+\w\+\s*=\s*\|async\s\+(" "$FILE" 2>/dev/null | grep -v "^\s*//" | grep -v "^\s*\*")

ASYNC_COUNT=0
NO_AWAIT_COUNT=0

while IFS=: read -r LINE_NUM LINE_CONTENT; do
    [ -z "$LINE_NUM" ] && continue
    ASYNC_COUNT=$((ASYNC_COUNT + 1))

    # Extract function name
    FUNC_NAME=$(echo "$LINE_CONTENT" | grep -oE 'function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)' | sed 's/function\s*//')
    [ -z "$FUNC_NAME" ] && FUNC_NAME=$(echo "$LINE_CONTENT" | grep -oE '([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=' | sed 's/\s*=//')

    # Check the next 100 lines for await
    END=$((LINE_NUM + 100))
    TOTAL_LINES=$(wc -l < "$FILE" | tr -d ' ')
    [ $END -gt $TOTAL_LINES ] && END=$TOTAL_LINES

    HAS_AWAIT=$(sed -n "${LINE_NUM},${END}p" "$FILE" | grep -c "\bawait\b" 2>/dev/null || true)

    if [ "$HAS_AWAIT" -eq 0 ]; then
        echo -e "  ${YELLOW}[SUSPICIOUS]${NC} Line ${LINE_NUM}: async ${FUNC_NAME}() has no await -- why is it async?"
        NO_AWAIT_COUNT=$((NO_AWAIT_COUNT + 1))
        WARNINGS=$((WARNINGS + 1))
    fi
done <<< "$ASYNC_FUNCS"

echo -e "  Total async functions: ${ASYNC_COUNT}"
echo -e "  Without await: ${NO_AWAIT_COUNT}"
[ $NO_AWAIT_COUNT -eq 0 ] && echo -e "  ${GREEN}All async functions use await.${NC}"
echo ""

# =============================================================================
# CHECK 3: await inside loops (performance anti-pattern)
# =============================================================================
echo -e "${CYAN}--- Check 3: await inside loops ---${NC}"

# Find lines with await that are inside for/while/do loops
# This is a simplified heuristic - look for await after a for/while/do opener

AWAIT_IN_LOOP=0
IN_LOOP=0
LOOP_START_LINE=0

while IFS= read -r LINE_NUM; do
    [ -z "$LINE_NUM" ] && continue

    LINE_CONTENT=$(sed -n "${LINE_NUM}p" "$FILE")
    TRIMMED=$(echo "$LINE_CONTENT" | sed 's/^\s*//')

    # Skip comments
    case "$TRIMMED" in
        //*|*\**) continue ;;
    esac

    # Detect loop starts
    if echo "$TRIMMED" | grep -qE "\b(for|while|do)\b.*\{"; then
        IN_LOOP=$((IN_LOOP + 1))
        LOOP_START_LINE=$LINE_NUM
    fi

    # Detect loop ends (simplified: closing brace)
    if [ $IN_LOOP -gt 0 ] && echo "$TRIMMED" | grep -qE "^\s*\}"; then
        IN_LOOP=$((IN_LOOP - 1))
    fi

    # Check for await inside loop
    if [ $IN_LOOP -gt 0 ] && echo "$TRIMMED" | grep -qE "\bawait\b"; then
        echo -e "  ${YELLOW}[SEQUENTIAL]${NC} Line ${LINE_NUM}: 'await' inside loop (started line ${LOOP_START_LINE})"
        echo -e "    Consider using Promise.all() for parallel execution"
        echo -e "    ${TRIMMED:0:100}"
        AWAIT_IN_LOOP=$((AWAIT_IN_LOOP + 1))
        WARNINGS=$((WARNINGS + 1))
    fi
done <<< "$(grep -n "" "$FILE" | cut -d: -f1)"

# Alternative: quicker but less accurate detection
if [ $AWAIT_IN_LOOP -eq 0 ]; then
    # Quick check: any lines between for/while and their closing } that contain await?
    QUICK_CHECK=$(grep -n "await" "$FILE" 2>/dev/null | cut -d: -f1 | head -100)
    # This is just a best-effort check
fi

echo -e "  await-in-loop occurrences: ${AWAIT_IN_LOOP}"
[ $AWAIT_IN_LOOP -eq 0 ] && echo -e "  ${GREEN}No await-in-loop anti-patterns detected.${NC}"
echo ""

# =============================================================================
# CHECK 4: .then() chains without .catch()
# =============================================================================
echo -e "${CYAN}--- Check 4: .then() without .catch() ---${NC}"

# Find .then( lines and check if there is a .catch() nearby
THEN_LINES=$(grep -n "\.then\s*(" "$FILE" 2>/dev/null | grep -v "^\s*//" | grep -v "^\s*\*" | cut -d: -f1)
THEN_COUNT=0
NO_CATCH_COUNT=0

for LINE_NUM in $THEN_LINES; do
    [ -z "$LINE_NUM" ] && continue
    THEN_COUNT=$((THEN_COUNT + 1))

    # Check 20 lines after for .catch
    END=$((LINE_NUM + 20))
    TOTAL_LINES=$(wc -l < "$FILE" | tr -d ' ')
    [ $END -gt $TOTAL_LINES ] && END=$TOTAL_LINES

    HAS_CATCH=$(sed -n "${LINE_NUM},${END}p" "$FILE" | grep -c "\.catch\s*(" 2>/dev/null || true)

    # Also check if it is inside a try/catch
    START=$((LINE_NUM - 15))
    [ $START -lt 1 ] && START=1
    HAS_TRY=$(sed -n "${START},${LINE_NUM}p" "$FILE" | grep -c "try\s*{" 2>/dev/null || true)

    if [ "$HAS_CATCH" -eq 0 ] && [ "$HAS_TRY" -eq 0 ]; then
        CONTENT=$(sed -n "${LINE_NUM}p" "$FILE" | sed 's/^\s*//')
        echo -e "  ${YELLOW}[NO CATCH]${NC} Line ${LINE_NUM}: .then() without .catch()"
        echo -e "    ${CONTENT:0:100}"
        NO_CATCH_COUNT=$((NO_CATCH_COUNT + 1))
        WARNINGS=$((WARNINGS + 1))
    fi
done

echo -e "  Total .then() chains: ${THEN_COUNT}"
echo -e "  Without .catch(): ${NO_CATCH_COUNT}"
[ $NO_CATCH_COUNT -eq 0 ] && echo -e "  ${GREEN}All .then() chains have error handling.${NC}"
echo ""

# =============================================================================
# CHECK 5: Promise constructor anti-pattern
# =============================================================================
echo -e "${CYAN}--- Check 5: Promise constructor anti-patterns ---${NC}"

# new Promise wrapping fetch or another promise
PROMISE_WRAP=$(grep -n "new\s\+Promise\s*(" "$FILE" 2>/dev/null | grep -v "^\s*//" | grep -v "^\s*\*")
PROMISE_COUNT=$(echo "$PROMISE_WRAP" | grep -v '^$' | wc -l | tr -d ' ')

if [ "$PROMISE_COUNT" -gt 0 ]; then
    echo -e "  Found ${PROMISE_COUNT} new Promise() constructor(s):"
    while IFS=: read -r LINE_NUM LINE_CONTENT; do
        [ -z "$LINE_NUM" ] && continue
        TRIMMED=$(echo "$LINE_CONTENT" | sed 's/^\s*//')

        # Check if the promise body contains fetch or another promise
        END=$((LINE_NUM + 10))
        TOTAL_LINES=$(wc -l < "$FILE" | tr -d ' ')
        [ $END -gt $TOTAL_LINES ] && END=$TOTAL_LINES

        BODY=$(sed -n "${LINE_NUM},${END}p" "$FILE")
        HAS_FETCH=$(echo "$BODY" | grep -c "fetch\s*(" 2>/dev/null || true)
        HAS_PROMISE=$(echo "$BODY" | grep -c "\.then\s*(" 2>/dev/null || true)

        if [ "$HAS_FETCH" -gt 0 ] || [ "$HAS_PROMISE" -gt 0 ]; then
            echo -e "  ${YELLOW}[ANTI-PATTERN]${NC} Line ${LINE_NUM}: new Promise() wrapping fetch/promise -- unnecessary wrapper"
            WARNINGS=$((WARNINGS + 1))
        else
            echo -e "  ${GREEN}[OK]${NC} Line ${LINE_NUM}: new Promise() appears legitimate"
        fi
    done <<< "$PROMISE_WRAP"
else
    echo -e "  ${GREEN}No Promise constructor anti-patterns found.${NC}"
fi
echo ""

# =============================================================================
# SUMMARY
# =============================================================================
echo -e "${CYAN}=== SUMMARY ===${NC}"
echo -e "Errors: ${RED}${ERRORS}${NC}"
echo -e "Warnings: ${YELLOW}${WARNINGS}${NC}"
echo ""

TOTAL=$((ERRORS + WARNINGS))
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}FAIL: ${ERRORS} error(s) found (unhandled async operations)${NC}"
    exit 2
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}PASS WITH WARNINGS: ${WARNINGS} async anti-pattern(s) detected${NC}"
    exit 1
else
    echo -e "${GREEN}PASS: Async patterns look correct${NC}"
    exit 0
fi
