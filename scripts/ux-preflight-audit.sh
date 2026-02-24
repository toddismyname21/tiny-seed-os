#!/bin/bash
# ============================================================
# DYNAMIC UX Preflight Audit Script
#
# Reads rules from config/ux_audit_rules.json — add new rules
# there, and this script automatically picks them up.
#
# Usage:
#   ./scripts/ux-preflight-audit.sh <file.html>     — audit one file
#   ./scripts/ux-preflight-audit.sh --all            — audit all HTML
#   ./scripts/ux-preflight-audit.sh --validate       — validate rules JSON
#   ./scripts/ux-preflight-audit.sh --add-rule       — interactively add a rule
#   ./scripts/ux-preflight-audit.sh --stats          — show rule statistics
#   ./scripts/ux-preflight-audit.sh --thresholds     — show all thresholds
#
# The rule engine lives in: config/ux_audit_rules.json
# Checklist reference:      docs/UX_PREFLIGHT_CHECKLIST.md
# ============================================================

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RULES_FILE="$PROJECT_ROOT/config/ux_audit_rules.json"

PASS=0
WARN=0
FAIL=0
CHECKS=0
MANUAL_CHECKS=0

pass() {
    PASS=$((PASS + 1))
    CHECKS=$((CHECKS + 1))
    echo -e "  ${GREEN}PASS${NC} [$1] $2"
}

warn() {
    WARN=$((WARN + 1))
    CHECKS=$((CHECKS + 1))
    echo -e "  ${YELLOW}WARN${NC} [$1] $2"
}

fail() {
    FAIL=$((FAIL + 1))
    CHECKS=$((CHECKS + 1))
    echo -e "  ${RED}FAIL${NC} [$1] $2"
}

info() {
    echo -e "  ${CYAN}INFO${NC} $1"
}

manual() {
    MANUAL_CHECKS=$((MANUAL_CHECKS + 1))
    echo -e "  ${MAGENTA}MANUAL${NC} [$1] $2"
    echo -e "         ${DIM}→ $3${NC}"
}

# ============================================================
# Check for rules file
# ============================================================

if [ ! -f "$RULES_FILE" ]; then
    echo -e "${RED}Rules file not found: $RULES_FILE${NC}"
    echo "Create it with the UX audit rules engine."
    exit 1
fi

# Check for jq (needed for JSON parsing)
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}jq not found — using fallback grep-based checks${NC}"
    echo "Install jq for full dynamic rule engine: brew install jq"
    USE_JQ=false
else
    USE_JQ=true
fi

# ============================================================
# Special modes
# ============================================================

if [ "${1:-}" = "--validate" ]; then
    echo -e "${BOLD}Validating UX audit rules...${NC}"
    if $USE_JQ; then
        RULE_COUNT=$(jq '.rules | length' "$RULES_FILE")
        ACTIVE_COUNT=$(jq '[.rules[] | select(.active == true)] | length' "$RULES_FILE")
        CAT_COUNT=$(jq '.categories | keys | length' "$RULES_FILE")
        THRESHOLD_COUNT=$(jq '.thresholds | keys | length' "$RULES_FILE")

        echo -e "  Rules: $RULE_COUNT total, $ACTIVE_COUNT active"
        echo -e "  Categories: $CAT_COUNT"
        echo -e "  Thresholds: $THRESHOLD_COUNT"

        # Validate each rule has required fields
        INVALID=$(jq '[.rules[] | select(.id == null or .category == null or .severity == null or .check_type == null)] | length' "$RULES_FILE")
        if [ "$INVALID" -gt 0 ]; then
            echo -e "  ${RED}$INVALID rules missing required fields (id, category, severity, check_type)${NC}"
            exit 1
        fi

        echo -e "  ${GREEN}All rules valid${NC}"

        # Show version info
        VERSION=$(jq -r '._meta.version' "$RULES_FILE")
        UPDATED=$(jq -r '._meta.last_updated' "$RULES_FILE")
        echo -e "  Version: $VERSION (updated: $UPDATED)"
    else
        echo "Install jq for rule validation"
    fi
    exit 0
fi

if [ "${1:-}" = "--stats" ]; then
    echo -e "${BOLD}UX Audit Rule Statistics${NC}"
    echo ""
    if $USE_JQ; then
        VERSION=$(jq -r '._meta.version' "$RULES_FILE")
        UPDATED=$(jq -r '._meta.last_updated' "$RULES_FILE")
        echo -e "  Version: ${CYAN}$VERSION${NC}  Updated: ${CYAN}$UPDATED${NC}"
        echo ""

        TOTAL=$(jq '.rules | length' "$RULES_FILE")
        ACTIVE=$(jq '[.rules[] | select(.active == true)] | length' "$RULES_FILE")
        AUTO=$(jq '[.rules[] | select(.active == true and .check_type == "automated")] | length' "$RULES_FILE")
        MANUAL_R=$(jq '[.rules[] | select(.active == true and .check_type == "manual")] | length' "$RULES_FILE")

        echo -e "  Total rules: $TOTAL ($ACTIVE active, $((TOTAL - ACTIVE)) inactive)"
        echo -e "  Automated: $AUTO  Manual: $MANUAL_R"
        echo ""

        echo -e "  ${BOLD}By Category:${NC}"
        jq -r '.rules | group_by(.category) | .[] | "    \(.[0].category): \(length) rules"' "$RULES_FILE"
        echo ""

        echo -e "  ${BOLD}By Severity:${NC}"
        CRIT=$(jq '[.rules[] | select(.severity == "critical")] | length' "$RULES_FILE")
        HIGH=$(jq '[.rules[] | select(.severity == "high")] | length' "$RULES_FILE")
        MED=$(jq '[.rules[] | select(.severity == "medium")] | length' "$RULES_FILE")
        LOW=$(jq '[.rules[] | select(.severity == "low")] | length' "$RULES_FILE")
        echo -e "    ${RED}Critical: $CRIT${NC}  ${YELLOW}High: $HIGH${NC}  Medium: $MED  ${DIM}Low: $LOW${NC}"
        echo ""

        echo -e "  ${BOLD}Evolution Log:${NC}"
        jq -r '.evolution_log[] | "    \(.date): \(.action) — \(.description) (\(.rules_added // 0) rules)"' "$RULES_FILE"
    else
        echo "Install jq for stats"
    fi
    exit 0
fi

if [ "${1:-}" = "--thresholds" ]; then
    echo -e "${BOLD}UX Audit Thresholds${NC}"
    echo ""
    if $USE_JQ; then
        jq -r '.thresholds | to_entries[] | select(.key != "_comment") | "  \(.key): \(.value)"' "$RULES_FILE"
    else
        echo "Install jq for threshold display"
    fi
    exit 0
fi

if [ "${1:-}" = "--add-rule" ]; then
    echo -e "${BOLD}Add New UX Audit Rule${NC}"
    echo ""
    echo "To add a rule, append to the 'rules' array in:"
    echo "  $RULES_FILE"
    echo ""
    echo "Required fields:"
    echo "  id:          Unique ID (e.g., 'CL-006', 'DS-006')"
    echo "  category:    One of: cognitive_load, design_system, progressive_disclosure,"
    echo "               touch_targets, performance, mobile, accessibility, content,"
    echo "               dual_context, gamification, character"
    echo "  severity:    critical | high | medium | low"
    echo "  check_type:  automated | manual"
    echo "  name:        Short descriptive name"
    echo "  description: Full description of what to check"
    echo "  active:      true | false"
    echo "  added:       Date in YYYY-MM-DD format"
    echo ""
    echo "For automated checks, also include:"
    echo "  pattern:     Regex to search for in file content"
    echo "  negate:      true if pattern should NOT be found"
    echo "  threshold:   Numeric threshold for count-based checks"
    echo ""
    echo "For manual checks, also include:"
    echo "  manual_check: Instructions for the human/agent reviewer"
    echo ""
    echo "After adding, run: $0 --validate"
    exit 0
fi

# ============================================================
# Load thresholds from rules file
# ============================================================

if $USE_JQ; then
    TOUCH_MIN=$(jq '.thresholds.touch_target_min_px' "$RULES_FILE")
    TAB_MAX=$(jq '.thresholds.tab_max' "$RULES_FILE")
    NAV_MAX=$(jq '.thresholds.nav_items_desktop_max' "$RULES_FILE")
    HEX_MAX=$(jq '.thresholds.css_bundle_max_kb // 50' "$RULES_FILE")
    PRIMARY_GREEN=$(jq -r '.thresholds.primary_green_hex' "$RULES_FILE")
    INPUT_FONT_MIN=$(jq '.thresholds.input_font_min_px' "$RULES_FILE")
else
    TOUCH_MIN=44
    TAB_MAX=5
    NAV_MAX=7
    PRIMARY_GREEN="#22c55e"
    INPUT_FONT_MIN=16
fi

# ============================================================
# Determine files to audit
# ============================================================

FILES=()

if [ "${1:-}" = "--all" ]; then
    while IFS= read -r f; do
        FILES+=("$f")
    done < <(find "$PROJECT_ROOT" -name "*.html" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/tinypm.egg-info/*" | sort)
elif [ -n "${1:-}" ]; then
    if [ -f "$1" ]; then
        FILES+=("$1")
    elif [ -f "$PROJECT_ROOT/$1" ]; then
        FILES+=("$PROJECT_ROOT/$1")
    else
        echo -e "${RED}File not found: $1${NC}"
        exit 1
    fi
else
    echo -e "${BOLD}Dynamic UX Preflight Audit${NC}"
    if $USE_JQ; then
        RULE_COUNT=$(jq '[.rules[] | select(.active == true)] | length' "$RULES_FILE")
        VERSION=$(jq -r '._meta.version' "$RULES_FILE")
        echo -e "  Rules engine v$VERSION — $RULE_COUNT active rules"
    fi
    echo ""
    echo "Usage:"
    echo "  $0 <file.html>     Audit one file"
    echo "  $0 --all            Audit all HTML files"
    echo "  $0 --validate       Validate rules JSON"
    echo "  $0 --stats          Show rule statistics"
    echo "  $0 --thresholds     Show all threshold values"
    echo "  $0 --add-rule       How to add a new rule"
    echo ""
    echo "Rules file: config/ux_audit_rules.json"
    echo "Checklist:  docs/UX_PREFLIGHT_CHECKLIST.md"
    exit 0
fi

# ============================================================
# Header
# ============================================================

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  Dynamic UX Preflight Audit${NC}"
if $USE_JQ; then
    RULE_COUNT=$(jq '[.rules[] | select(.active == true)] | length' "$RULES_FILE")
    AUTO_COUNT=$(jq '[.rules[] | select(.active == true and .check_type == "automated")] | length' "$RULES_FILE")
    MANUAL_COUNT=$(jq '[.rules[] | select(.active == true and .check_type == "manual")] | length' "$RULES_FILE")
    VERSION=$(jq -r '._meta.version' "$RULES_FILE")
    echo -e "  ${DIM}v$VERSION — $RULE_COUNT rules ($AUTO_COUNT automated, $MANUAL_COUNT manual)${NC}"
fi
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ============================================================
# Audit each file
# ============================================================

TOTAL_PASS=0
TOTAL_WARN=0
TOTAL_FAIL=0
TOTAL_CHECKS=0
TOTAL_MANUAL=0

for FILE in "${FILES[@]}"; do
    PASS=0
    WARN=0
    FAIL=0
    CHECKS=0
    MANUAL_CHECKS=0

    BASENAME=$(basename "$FILE")
    RELPATH="${FILE#$PROJECT_ROOT/}"
    IS_APPS_SCRIPT=false
    if echo "$RELPATH" | grep -q "apps_script/"; then
        IS_APPS_SCRIPT=true
    fi

    echo ""
    echo -e "${BOLD}━━━ Auditing: ${CYAN}$RELPATH${NC} ${BOLD}━━━${NC}"
    echo ""

    CONTENT=$(cat "$FILE" 2>/dev/null || echo "")

    if [ -z "$CONTENT" ]; then
        fail "CORE" "File is empty or unreadable"
        continue
    fi

    # Pre-extract style content for multiple checks
    STYLE_CONTENT=$(echo "$CONTENT" | sed -n '/<style/,/<\/style>/p' 2>/dev/null || echo "")

    # ==== AUTOMATED RULES FROM JSON ====

    if $USE_JQ; then
        # Get all active automated rules
        AUTOMATED_RULES=$(jq -c '[.rules[] | select(.active == true and .check_type == "automated")]' "$RULES_FILE")
        RULE_IDS=$(echo "$AUTOMATED_RULES" | jq -r '.[].id')

        CURRENT_CAT=""

        while IFS= read -r RULE_ID; do
            [ -z "$RULE_ID" ] && continue

            RULE=$(echo "$AUTOMATED_RULES" | jq -c ".[] | select(.id == \"$RULE_ID\")")
            RULE_NAME=$(echo "$RULE" | jq -r '.name')
            RULE_DESC=$(echo "$RULE" | jq -r '.description')
            RULE_CAT=$(echo "$RULE" | jq -r '.category')
            RULE_SEV=$(echo "$RULE" | jq -r '.severity')
            RULE_PATTERN=$(echo "$RULE" | jq -r '.pattern // empty')
            RULE_NEGATE=$(echo "$RULE" | jq -r '.negate // false')
            RULE_MIN_COUNT=$(echo "$RULE" | jq -r '.min_count // empty')
            RULE_LOGIC=$(echo "$RULE" | jq -r '.check_logic // empty')
            RULE_THRESHOLD=$(echo "$RULE" | jq -r '.threshold // empty')

            # Print category header when it changes
            if [ "$RULE_CAT" != "$CURRENT_CAT" ]; then
                CURRENT_CAT="$RULE_CAT"
                CAT_NAME=$(jq -r ".categories.\"$RULE_CAT\".name // \"$RULE_CAT\"" "$RULES_FILE")
                echo -e "${BOLD}[$CAT_NAME]${NC}"
            fi

            # Determine severity-appropriate action
            SEVERITY_ACTION="warn"
            if [ "$RULE_SEV" = "critical" ]; then
                SEVERITY_ACTION="fail"
            fi

            # ---- Pattern-based checks ----
            if [ -n "$RULE_PATTERN" ]; then
                # Determine what to search
                SEARCH_CONTENT="$CONTENT"

                MATCH_COUNT=$(echo "$SEARCH_CONTENT" | grep -ciE "$RULE_PATTERN" 2>/dev/null || true)
                MATCH_COUNT=$(echo "$MATCH_COUNT" | tr -d '[:space:]' | grep -oE '^[0-9]+' || echo "0")
                [ -z "$MATCH_COUNT" ] && MATCH_COUNT=0

                if [ "$RULE_NEGATE" = "true" ]; then
                    # Pattern should NOT be found
                    if [ "$MATCH_COUNT" -gt 0 ]; then
                        $SEVERITY_ACTION "$RULE_ID" "$RULE_NAME ($MATCH_COUNT matches found)"
                    else
                        pass "$RULE_ID" "$RULE_NAME"
                    fi
                elif [ -n "$RULE_MIN_COUNT" ]; then
                    # Pattern should be found at least N times
                    if [ "$MATCH_COUNT" -ge "$RULE_MIN_COUNT" ]; then
                        pass "$RULE_ID" "$RULE_NAME ($MATCH_COUNT found)"
                    else
                        $SEVERITY_ACTION "$RULE_ID" "$RULE_NAME (found $MATCH_COUNT, need $RULE_MIN_COUNT+)"
                    fi
                else
                    # Pattern should be found (presence check)
                    if [ "$MATCH_COUNT" -gt 0 ]; then
                        pass "$RULE_ID" "$RULE_NAME"
                    else
                        # Skip some checks for Apps Script files
                        if $IS_APPS_SCRIPT && [[ "$RULE_ID" =~ ^(DS-001|DS-004|MB-001|MB-004)$ ]]; then
                            info "[$RULE_ID] Skipped for Apps Script file"
                        else
                            $SEVERITY_ACTION "$RULE_ID" "$RULE_NAME"
                        fi
                    fi
                fi
            fi

            # ---- Logic-based checks ----
            if [ -n "$RULE_LOGIC" ]; then
                case "$RULE_LOGIC" in
                    "check_min_heights")
                        SMALL=$(echo "$STYLE_CONTENT" | grep -cP "(button|btn|input|select|textarea).*height:\s*(([0-9]|[12][0-9]|3[0-9]|4[0-3])px)" 2>/dev/null || true)
                        SMALL=$(echo "$SMALL" | tr -d '[:space:]' | grep -oE '^[0-9]+' || echo "0")
                        [ -z "$SMALL" ] && SMALL=0
                        if [ "$SMALL" -gt 0 ]; then
                            fail "$RULE_ID" "$RULE_NAME ($SMALL undersized elements)"
                        else
                            pass "$RULE_ID" "$RULE_NAME"
                        fi
                        ;;
                    "check_input_font_size")
                        SMALL_FONT=$(echo "$STYLE_CONTENT" | grep -cP "(input|select|textarea).*font-size:\s*(1[0-5]|[0-9])px" 2>/dev/null || true)
                        SMALL_FONT=$(echo "$SMALL_FONT" | tr -d '[:space:]' | grep -oE '^[0-9]+' || echo "0")
                        [ -z "$SMALL_FONT" ] && SMALL_FONT=0
                        if [ "$SMALL_FONT" -gt 0 ]; then
                            fail "$RULE_ID" "$RULE_NAME ($SMALL_FONT undersized)"
                        else
                            pass "$RULE_ID" "$RULE_NAME"
                        fi
                        ;;
                    "check_hex_outside_root")
                        STYLE_NO_ROOT=$(echo "$STYLE_CONTENT" | sed '/:root/,/}/d' 2>/dev/null || echo "")
                        RAW_COUNT=$(echo "$STYLE_NO_ROOT" | grep -oP '#[0-9a-fA-F]{3,8}' 2>/dev/null | wc -l || true)
                        RAW_COUNT=$(echo "$RAW_COUNT" | tr -d '[:space:]' | grep -oE '^[0-9]+' || echo "0")
                        [ -z "$RAW_COUNT" ] && RAW_COUNT=0
                        THRESHOLD=${RULE_THRESHOLD:-20}
                        if [ "$RAW_COUNT" -gt "$THRESHOLD" ]; then
                            fail "$RULE_ID" "$RULE_NAME ($RAW_COUNT raw hex, max $THRESHOLD)"
                        elif [ "$RAW_COUNT" -gt 5 ]; then
                            warn "$RULE_ID" "$RULE_NAME ($RAW_COUNT raw hex outside :root)"
                        else
                            pass "$RULE_ID" "$RULE_NAME ($RAW_COUNT raw hex)"
                        fi
                        ;;
                    "check_img_alt")
                        IMG_TOTAL=$(echo "$CONTENT" | grep -c "<img " 2>/dev/null || true)
                        IMG_TOTAL=$(echo "$IMG_TOTAL" | tr -d '[:space:]' | grep -oE '^[0-9]+' || echo "0")
                        [ -z "$IMG_TOTAL" ] && IMG_TOTAL=0
                        IMG_WITH_ALT=$(echo "$CONTENT" | grep -c '<img [^>]*alt=' 2>/dev/null || true)
                        IMG_WITH_ALT=$(echo "$IMG_WITH_ALT" | tr -d '[:space:]' | grep -oE '^[0-9]+' || echo "0")
                        [ -z "$IMG_WITH_ALT" ] && IMG_WITH_ALT=0
                        if [ "$IMG_TOTAL" -gt 0 ]; then
                            if [ "$IMG_WITH_ALT" -eq "$IMG_TOTAL" ]; then
                                pass "$RULE_ID" "$RULE_NAME ($IMG_TOTAL/$IMG_TOTAL)"
                            else
                                warn "$RULE_ID" "$RULE_NAME ($IMG_WITH_ALT/$IMG_TOTAL have alt)"
                            fi
                        else
                            info "[$RULE_ID] No images found"
                        fi
                        ;;
                esac
            fi

        done <<< "$RULE_IDS"

        # ==== MANUAL RULES (display as reminders) ====
        echo ""
        echo -e "${BOLD}[Manual Checks — Review These]${NC}"

        MANUAL_RULES=$(jq -c '[.rules[] | select(.active == true and .check_type == "manual")]' "$RULES_FILE")
        MANUAL_IDS=$(echo "$MANUAL_RULES" | jq -r '.[].id')

        while IFS= read -r MID; do
            [ -z "$MID" ] && continue
            MRULE=$(echo "$MANUAL_RULES" | jq -c ".[] | select(.id == \"$MID\")")
            MNAME=$(echo "$MRULE" | jq -r '.name')
            MCHECK=$(echo "$MRULE" | jq -r '.manual_check // .description')
            MSEV=$(echo "$MRULE" | jq -r '.severity')
            manual "$MID" "$MNAME ($MSEV)" "$MCHECK"
        done <<< "$MANUAL_IDS"

    else
        # ========================================
        # FALLBACK: No jq — run hardcoded checks
        # ========================================

        echo -e "${BOLD}[Design System]${NC}"
        if echo "$CONTENT" | grep -qi "tiny-seed-design-system\|design-system\.css"; then
            pass "DS-001" "Design system CSS linked"
        else
            if $IS_APPS_SCRIPT; then
                warn "DS-001" "Design system CSS not linked (Apps Script)"
            else
                fail "DS-001" "Design system CSS NOT linked"
            fi
        fi

        echo -e "${BOLD}[API Configuration]${NC}"
        HARDCODED=$(echo "$CONTENT" | grep -c "script\.google\.com/macros/s/AKfycb" 2>/dev/null || echo "0")
        if [ "$HARDCODED" -gt 0 ]; then
            fail "API-001" "Hardcoded API URL found ($HARDCODED)"
        else
            pass "API-001" "No hardcoded API URLs"
        fi

        echo -e "${BOLD}[Color Tokens]${NC}"
        BAD_GREENS=$(echo "$STYLE_CONTENT" | grep -ci "#4A7C43\|#2d5a27\|#1e3d1a\|#3a8f35" 2>/dev/null || echo "0")
        if [ "$BAD_GREENS" -gt 0 ]; then
            fail "DS-002" "Non-standard green ($BAD_GREENS)"
        else
            pass "DS-002" "Primary green OK"
        fi

        echo -e "${BOLD}[Touch Targets]${NC}"
        if echo "$STYLE_CONTENT" | grep -q ":active"; then
            pass "TT-002" "Active state feedback"
        else
            warn "TT-002" "No :active feedback"
        fi

        echo -e "${BOLD}[Mobile]${NC}"
        if echo "$CONTENT" | grep -q 'name="viewport"'; then
            pass "MB-001" "Viewport meta present"
        else
            if ! $IS_APPS_SCRIPT; then
                fail "MB-001" "Missing viewport meta"
            fi
        fi

        echo -e "${BOLD}[Accessibility]${NC}"
        ARIA=$(echo "$CONTENT" | grep -c "aria-label" 2>/dev/null || echo "0")
        if [ "$ARIA" -gt 0 ]; then
            pass "AC-001" "ARIA labels present ($ARIA)"
        else
            warn "AC-001" "No ARIA labels"
        fi
    fi

    # --------------------------------------------------------
    # Summary for this file
    # --------------------------------------------------------
    echo ""
    echo -e "  ${BOLD}Results:${NC} ${GREEN}$PASS passed${NC}  ${YELLOW}$WARN warnings${NC}  ${RED}$FAIL failed${NC}  ${MAGENTA}$MANUAL_CHECKS manual${NC}  (${CHECKS} automated checks)"

    TOTAL_PASS=$((TOTAL_PASS + PASS))
    TOTAL_WARN=$((TOTAL_WARN + WARN))
    TOTAL_FAIL=$((TOTAL_FAIL + FAIL))
    TOTAL_CHECKS=$((TOTAL_CHECKS + CHECKS))
    TOTAL_MANUAL=$((TOTAL_MANUAL + MANUAL_CHECKS))
done

# ============================================================
# Overall Summary
# ============================================================

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  AUDIT SUMMARY${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Files audited:     ${#FILES[@]}"
echo -e "  Automated checks:  $TOTAL_CHECKS"
echo -e "  Manual reviews:    $TOTAL_MANUAL"
echo -e "  ${GREEN}Passed:  $TOTAL_PASS${NC}"
echo -e "  ${YELLOW}Warnings: $TOTAL_WARN${NC}"
echo -e "  ${RED}Failed:  $TOTAL_FAIL${NC}"
echo ""

if [ "$TOTAL_FAIL" -gt 0 ]; then
    echo -e "${RED}${BOLD}  AUDIT FAILED${NC} — Fix $TOTAL_FAIL critical issue(s)"
    echo -e "  ${DIM}Rules: config/ux_audit_rules.json${NC}"
    echo -e "  ${DIM}Docs:  docs/UX_PREFLIGHT_CHECKLIST.md${NC}"
    exit 1
elif [ "$TOTAL_WARN" -gt 5 ]; then
    echo -e "${YELLOW}${BOLD}  AUDIT WARNING${NC} — $TOTAL_WARN items to review"
    echo -e "  ${DIM}Rules: config/ux_audit_rules.json${NC}"
    exit 0
else
    echo -e "${GREEN}${BOLD}  AUDIT PASSED${NC}"
    exit 0
fi
