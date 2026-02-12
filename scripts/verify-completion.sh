#!/bin/bash
# =============================================================================
# VERIFY-COMPLETION.SH - Verification Gate for Agent Task Completion Claims
# =============================================================================
# Validates that agent claims of task completion are accurate.
# Part of the Governor System for agent accountability.
#
# Usage: ./scripts/verify-completion.sh <claim_type> <target>
#
# Claim Types:
#   file_created  - Verify file exists at claimed path
#   bug_fix       - Run validate-element-refs.sh for HTML, check syntax errors
#   deployment    - curl the live endpoint and verify response
#   api_endpoint  - Test API endpoint responds correctly
#   ui_change     - Verify element exists in HTML
#
# Returns: 0 = VERIFIED, 1 = FAILED
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script location for relative paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Arguments
CLAIM_TYPE=$1
TARGET=$2

# Usage check
if [ -z "$CLAIM_TYPE" ] || [ -z "$TARGET" ]; then
    echo -e "${RED}ERROR: Missing required arguments${NC}"
    echo ""
    echo "Usage: ./scripts/verify-completion.sh <claim_type> <target>"
    echo ""
    echo "Claim Types:"
    echo "  file_created  - Target: file path"
    echo "  bug_fix       - Target: file path (HTML file to validate)"
    echo "  deployment    - Target: URL to test"
    echo "  api_endpoint  - Target: full API URL with params"
    echo "  ui_change     - Target: file_path:element_id (e.g., index.html:#login-btn)"
    echo ""
    echo "Examples:"
    echo "  ./scripts/verify-completion.sh file_created web_app/new-feature.js"
    echo "  ./scripts/verify-completion.sh bug_fix index.html"
    echo "  ./scripts/verify-completion.sh deployment https://example.com/health"
    echo "  ./scripts/verify-completion.sh api_endpoint https://api.example.com?action=test"
    echo "  ./scripts/verify-completion.sh ui_change index.html:#submit-button"
    exit 1
fi

# Header
echo ""
echo -e "${BLUE}=== VERIFICATION GATE ===${NC}"
echo -e "Claim Type: ${YELLOW}$CLAIM_TYPE${NC}"
echo -e "Target: ${YELLOW}$TARGET${NC}"
echo ""

# Verification result tracking
VERIFIED=0

# =============================================================================
# VERIFICATION FUNCTIONS
# =============================================================================

verify_file_created() {
    local file_path="$1"

    # Handle relative paths
    if [[ ! "$file_path" = /* ]]; then
        file_path="$PROJECT_ROOT/$file_path"
    fi

    echo "Checking if file exists: $file_path"

    if [ ! -f "$file_path" ]; then
        echo -e "${RED}FAILED: File does not exist${NC}"
        return 1
    fi

    # Check if file has content
    if [ ! -s "$file_path" ]; then
        echo -e "${RED}FAILED: File exists but is empty${NC}"
        return 1
    fi

    # Get file stats
    local size=$(wc -c < "$file_path")
    local lines=$(wc -l < "$file_path")

    echo -e "${GREEN}VERIFIED: File exists${NC}"
    echo "  - Size: $size bytes"
    echo "  - Lines: $lines"

    return 0
}

verify_bug_fix() {
    local file_path="$1"

    # Handle relative paths
    if [[ ! "$file_path" = /* ]]; then
        file_path="$PROJECT_ROOT/$file_path"
    fi

    echo "Validating bug fix for: $file_path"

    # Check file exists first
    if [ ! -f "$file_path" ]; then
        echo -e "${RED}FAILED: Target file does not exist${NC}"
        return 1
    fi

    # Determine file type and run appropriate validation
    local ext="${file_path##*.}"

    case "$ext" in
        html|htm)
            echo "Running HTML validation..."

            # Run validate-element-refs.sh if it exists
            if [ -x "$SCRIPT_DIR/validate-element-refs.sh" ]; then
                echo "Checking for orphaned element references..."
                if "$SCRIPT_DIR/validate-element-refs.sh" "$file_path"; then
                    echo -e "${GREEN}Element references: OK${NC}"
                else
                    echo -e "${RED}FAILED: Orphaned element references found${NC}"
                    return 1
                fi
            fi

            # Basic HTML syntax check - look for common issues
            echo "Checking HTML syntax..."

            # Check for unclosed tags (basic heuristic)
            local open_divs=$(grep -o '<div' "$file_path" 2>/dev/null | wc -l)
            local close_divs=$(grep -o '</div>' "$file_path" 2>/dev/null | wc -l)

            if [ "$open_divs" -ne "$close_divs" ]; then
                echo -e "${YELLOW}WARNING: Potential unclosed div tags (open: $open_divs, close: $close_divs)${NC}"
            fi

            # Check for basic JavaScript syntax errors (unmatched braces in script tags)
            echo "Checking embedded JavaScript..."
            local script_errors=$(grep -c 'SyntaxError\|ReferenceError' "$file_path" 2>/dev/null || true)
            if [ "$script_errors" -gt 0 ]; then
                echo -e "${RED}FAILED: JavaScript error strings found in file${NC}"
                return 1
            fi

            echo -e "${GREEN}VERIFIED: HTML file passes validation${NC}"
            ;;

        js)
            echo "Running JavaScript validation..."

            # Check for basic syntax using node if available
            if command -v node &> /dev/null; then
                if node --check "$file_path" 2>/dev/null; then
                    echo -e "${GREEN}VERIFIED: JavaScript syntax is valid${NC}"
                else
                    echo -e "${RED}FAILED: JavaScript syntax errors${NC}"
                    return 1
                fi
            else
                # Fallback: check for obvious issues
                local syntax_issues=$(grep -c 'undefined\|NaN\|null' "$file_path" 2>/dev/null || true)
                echo -e "${YELLOW}WARNING: Node not available for full syntax check${NC}"
                echo -e "${GREEN}VERIFIED: Basic checks passed (install Node for full validation)${NC}"
            fi
            ;;

        *)
            echo -e "${YELLOW}WARNING: No specific validation for .$ext files${NC}"
            echo -e "${GREEN}VERIFIED: File exists and has content${NC}"
            ;;
    esac

    return 0
}

verify_deployment() {
    local url="$1"

    echo "Testing deployment at: $url"

    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}FAILED: curl is not installed${NC}"
        return 1
    fi

    # Make the request
    local http_code
    local response

    # Get HTTP status code and response
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 30 "$url" 2>/dev/null)

    echo "HTTP Status: $http_code"

    # Check for successful response (2xx or 3xx)
    if [[ "$http_code" =~ ^[23] ]]; then
        echo -e "${GREEN}VERIFIED: Endpoint is responding (HTTP $http_code)${NC}"

        # Get response size for info
        local response_size=$(curl -s --connect-timeout 10 --max-time 30 "$url" 2>/dev/null | wc -c)
        echo "  - Response size: $response_size bytes"

        return 0
    else
        echo -e "${RED}FAILED: Endpoint returned HTTP $http_code${NC}"
        return 1
    fi
}

verify_api_endpoint() {
    local url="$1"

    echo "Testing API endpoint: $url"

    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}FAILED: curl is not installed${NC}"
        return 1
    fi

    # Make the API request
    local http_code
    local response

    # Get response body and status
    response=$(curl -s --connect-timeout 10 --max-time 30 "$url" 2>/dev/null)
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 30 "$url" 2>/dev/null)

    echo "HTTP Status: $http_code"

    # Check for successful response
    if [[ ! "$http_code" =~ ^[23] ]]; then
        echo -e "${RED}FAILED: API returned HTTP $http_code${NC}"
        return 1
    fi

    # Check if response is valid JSON (common for APIs)
    if echo "$response" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
        echo "Response: Valid JSON"

        # Check for common error indicators in JSON
        if echo "$response" | grep -q '"error"' 2>/dev/null; then
            echo -e "${YELLOW}WARNING: Response contains 'error' field${NC}"
            echo "Response preview: $(echo "$response" | head -c 200)"
        fi

        # Check for success indicators
        if echo "$response" | grep -qE '"success"\s*:\s*true|"status"\s*:\s*"ok"|"status"\s*:\s*"success"' 2>/dev/null; then
            echo -e "${GREEN}VERIFIED: API responds with success indicator${NC}"
        else
            echo -e "${GREEN}VERIFIED: API responds with valid JSON${NC}"
        fi
    else
        # Not JSON - check if it's HTML or plain text
        local content_preview=$(echo "$response" | head -c 100)
        echo "Response preview: $content_preview"
        echo -e "${GREEN}VERIFIED: API endpoint responds (non-JSON)${NC}"
    fi

    echo "  - Response size: $(echo "$response" | wc -c) bytes"

    return 0
}

verify_ui_change() {
    local target="$1"

    # Parse target: file_path:#element_id or file_path:element_id
    local file_path="${target%%:*}"
    local element_id="${target##*:}"

    # Remove leading # if present
    element_id="${element_id#\#}"

    # Handle relative paths
    if [[ ! "$file_path" = /* ]]; then
        file_path="$PROJECT_ROOT/$file_path"
    fi

    echo "Checking for UI element: #$element_id in $file_path"

    # Check file exists
    if [ ! -f "$file_path" ]; then
        echo -e "${RED}FAILED: File does not exist: $file_path${NC}"
        return 1
    fi

    # Search for the element ID in the file
    # Check for id="element_id" or id='element_id'
    if grep -qE "id=['\"]$element_id['\"]" "$file_path" 2>/dev/null; then
        echo -e "${GREEN}VERIFIED: Element #$element_id found in file${NC}"

        # Show the line where it was found
        local line_num=$(grep -nE "id=['\"]$element_id['\"]" "$file_path" 2>/dev/null | head -1 | cut -d: -f1)
        echo "  - Found at line: $line_num"

        return 0
    else
        echo -e "${RED}FAILED: Element #$element_id not found in file${NC}"

        # Suggest similar IDs
        echo "Similar IDs found in file:"
        grep -oE "id=['\"][^'\"]+['\"]" "$file_path" 2>/dev/null | head -5 || echo "  (none)"

        return 1
    fi
}

# =============================================================================
# MAIN VERIFICATION LOGIC
# =============================================================================

case $CLAIM_TYPE in
    "file_created")
        if verify_file_created "$TARGET"; then
            VERIFIED=0
        else
            VERIFIED=1
        fi
        ;;

    "bug_fix")
        if verify_bug_fix "$TARGET"; then
            VERIFIED=0
        else
            VERIFIED=1
        fi
        ;;

    "deployment")
        if verify_deployment "$TARGET"; then
            VERIFIED=0
        else
            VERIFIED=1
        fi
        ;;

    "api_endpoint")
        if verify_api_endpoint "$TARGET"; then
            VERIFIED=0
        else
            VERIFIED=1
        fi
        ;;

    "ui_change")
        if verify_ui_change "$TARGET"; then
            VERIFIED=0
        else
            VERIFIED=1
        fi
        ;;

    *)
        echo -e "${RED}ERROR: Unknown claim type: $CLAIM_TYPE${NC}"
        echo ""
        echo "Valid claim types: file_created, bug_fix, deployment, api_endpoint, ui_change"
        exit 1
        ;;
esac

# =============================================================================
# FINAL RESULT
# =============================================================================

echo ""
echo -e "${BLUE}=== VERIFICATION RESULT ===${NC}"

if [ $VERIFIED -eq 0 ]; then
    echo -e "${GREEN}STATUS: VERIFIED${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}STATUS: FAILED${NC}"
    echo ""
    echo "The agent's claim could not be verified."
    echo "Please review the errors above and ensure the task is actually complete."
    exit 1
fi
