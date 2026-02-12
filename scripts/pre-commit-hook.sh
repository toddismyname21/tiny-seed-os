#!/bin/bash
# =============================================================================
# PRE-COMMIT HOOK - Prevents common mistakes before they reach the repo
# =============================================================================
# Enhanced with pre-flight checks for the Agentic Performance Improvement Plan
# Last Updated: 2026-02-12
# =============================================================================

set -e

echo "Running pre-commit validations..."
echo ""

# Get the repo root directory
REPO_ROOT=$(git rev-parse --show-toplevel)

# =============================================================================
# CHECK 1: API URL Validation
# =============================================================================
CORRECT_ID="AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm"

BAD_URLS=$(git diff --cached --name-only | grep -v "api-config.js" | grep -v "CLAUDE.md" | grep -v "validate-api-urls" | xargs grep -l "script.google.com/macros/s/AKfycb" 2>/dev/null | while read file; do
    grep -n "script.google.com/macros/s/AKfycb" "$file" | grep -v "$CORRECT_ID"
done || true)

if [ -n "$BAD_URLS" ]; then
    echo "❌ COMMIT BLOCKED: Found hardcoded API URLs that don't match the correct deployment!"
    echo ""
    echo "Correct deployment ID: $CORRECT_ID"
    echo ""
    echo "Files with wrong URLs:"
    echo "$BAD_URLS"
    echo ""
    echo "FIX: Use api-config.js instead of hardcoding, or update to correct URL"
    exit 1
fi

echo "✅ API URL check passed"

# =============================================================================
# CHECK 2: Orphaned Element Reference Validation
# =============================================================================
# Prevents: Removing HTML but leaving JavaScript that references it

STAGED_HTML=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.html$' || true)

if [ -n "$STAGED_HTML" ]; then
    echo ""
    echo "Checking HTML files for orphaned element references..."

    for file in $STAGED_HTML; do
        if [ -f "$file" ]; then
            if ! "$REPO_ROOT/scripts/validate-element-refs.sh" "$file"; then
                echo ""
                echo "❌ COMMIT BLOCKED: Fix orphaned element references before committing."
                echo ""
                echo "When you remove HTML elements, you MUST also update/remove the"
                echo "JavaScript code that references them (getElementById, querySelector, etc.)"
                exit 1
            fi
        fi
    done

    echo "✅ Element reference check passed"
fi

# =============================================================================
# CHECK 3: Pre-Flight Check for NEW Files
# =============================================================================
# Ensures new files don't duplicate existing systems

STAGED_NEW=$(git diff --cached --name-only --diff-filter=A || true)

if [ -n "$STAGED_NEW" ]; then
    echo ""
    echo "Running pre-flight checks on new files..."

    PRE_FLIGHT_SCRIPT="$REPO_ROOT/scripts/pre-flight-check.sh"

    if [ -x "$PRE_FLIGHT_SCRIPT" ]; then
        for file in $STAGED_NEW; do
            echo "  Checking: $file"

            # Run pre-flight check (capture exit code, don't exit on failure)
            set +e
            "$PRE_FLIGHT_SCRIPT" "$file" "create" 2>/dev/null
            EXIT_CODE=$?
            set -e

            if [ $EXIT_CODE -eq 2 ]; then
                echo ""
                echo "❌ COMMIT BLOCKED: Pre-flight check found critical issues with: $file"
                echo ""
                echo "Run './scripts/pre-flight-check.sh $file create' for details."
                echo ""
                echo "If you believe this is a false positive, get PM_Architect approval"
                echo "and document the justification in your commit message."
                exit 1
            elif [ $EXIT_CODE -eq 1 ]; then
                echo "  ⚠️  Warnings found for: $file (proceeding with caution)"
            fi
        done

        echo "✅ Pre-flight checks passed"
    else
        echo "⚠️  Pre-flight script not found or not executable - skipping check"
    fi
fi

# =============================================================================
# CHECK 4: Duplicate Detection for HTML/Dashboard Files
# =============================================================================
# Specifically prevent duplicate dashboard creation

STAGED_DASHBOARDS=$(git diff --cached --name-only --diff-filter=A | grep -i "dashboard" || true)

if [ -n "$STAGED_DASHBOARDS" ]; then
    echo ""
    echo "⚠️  WARNING: New dashboard file(s) detected!"
    echo ""
    echo "New dashboards being committed:"
    echo "$STAGED_DASHBOARDS"
    echo ""
    echo "Existing dashboards (13+):"
    echo "  - web_app/seo_dashboard.html"
    echo "  - apps_script/ChiefOfStaffDashboard.html"
    echo "  - web_app/financial-dashboard.html"
    echo "  - apps_script/FieldManagementDashboard.html"
    echo "  - And more (see CLAUDE.md Step 4B)"
    echo ""
    echo "If this is intentional, ensure it's documented in SYSTEM_MANIFEST.md"
fi

# =============================================================================
# CHECK 5: Demo/Sample Data Detection
# =============================================================================
# Prevent sample/demo data fallbacks in production code

STAGED_CODE=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|html)$' || true)

if [ -n "$STAGED_CODE" ]; then
    echo ""
    echo "Checking for demo/sample data fallbacks..."

    DEMO_DATA_FOUND=""
    for file in $STAGED_CODE; do
        if [ -f "$file" ]; then
            # Check for common demo data patterns (excluding test files and documentation)
            if echo "$file" | grep -qvE "(test|spec|mock|\.md)"; then
                MATCHES=$(grep -nE "(sampleData|demoData|mockData|fakeData)\s*=" "$file" 2>/dev/null || true)
                if [ -n "$MATCHES" ]; then
                    DEMO_DATA_FOUND="$DEMO_DATA_FOUND$file:\n$MATCHES\n"
                fi
            fi
        fi
    done

    if [ -n "$DEMO_DATA_FOUND" ]; then
        echo "⚠️  WARNING: Possible demo/sample data detected:"
        echo -e "$DEMO_DATA_FOUND"
        echo ""
        echo "Per CLAUDE.md: NEVER add demo/sample data fallbacks - show errors instead"
        echo "If this is a test file or intentional, you may proceed."
    else
        echo "✅ No demo data fallbacks found"
    fi
fi

# =============================================================================
# CHECK 6: CHANGE_LOG.md Reminder
# =============================================================================
# Remind about CHANGE_LOG updates

CHANGE_LOG_UPDATED=$(git diff --cached --name-only | grep -E "CHANGE_LOG\.md" || true)

if [ -z "$CHANGE_LOG_UPDATED" ]; then
    echo ""
    echo "⚠️  REMINDER: CHANGE_LOG.md was not updated in this commit."
    echo "   Per CLAUDE.md, all changes should be logged. Consider updating it."
fi

# =============================================================================
# CHECK 7: VERIFICATION EVIDENCE REQUIRED (Added 2026-02-12)
# =============================================================================
# An agent CANNOT verify its own work. This check enforces Builder → Verifier flow.
# Significant code changes REQUIRE verification evidence.

STAGED_SIGNIFICANT=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|html)$' | grep -vE "(test|spec|config)" || true)
VERIFICATION_FILE="$REPO_ROOT/VERIFICATION_EVIDENCE.md"

if [ -n "$STAGED_SIGNIFICANT" ]; then
    # Count lines changed in significant files
    LINES_CHANGED=$(git diff --cached --stat -- $STAGED_SIGNIFICANT 2>/dev/null | tail -1 | grep -oE '[0-9]+' | head -1 || echo "0")

    # If more than 50 lines changed, require verification
    if [ "$LINES_CHANGED" -gt 50 ]; then
        echo ""
        echo "Checking for verification evidence (significant changes detected: $LINES_CHANGED lines)..."

        # Check if VERIFICATION_EVIDENCE.md exists and is being committed
        VERIFICATION_STAGED=$(git diff --cached --name-only | grep -E "VERIFICATION_EVIDENCE\.md" || true)

        if [ -z "$VERIFICATION_STAGED" ]; then
            if [ ! -f "$VERIFICATION_FILE" ]; then
                echo ""
                echo "❌ COMMIT BLOCKED: Verification evidence required for significant changes!"
                echo ""
                echo "You are changing $LINES_CHANGED lines across these files:"
                echo "$STAGED_SIGNIFICANT"
                echo ""
                echo "An agent CANNOT verify its own work. Before committing:"
                echo ""
                echo "1. Create VERIFICATION_EVIDENCE.md with:"
                echo "   - What was built/changed"
                echo "   - Test command and output"
                echo "   - Verifier confirmation (or 'SELF-VERIFIED: [justification]')"
                echo ""
                echo "2. Add it to your commit:"
                echo "   git add VERIFICATION_EVIDENCE.md"
                echo ""
                echo "For small fixes (<50 lines) or emergencies, use --no-verify with justification."
                exit 1
            fi
        fi

        # Verify the evidence file has required content
        if [ -f "$VERIFICATION_FILE" ]; then
            EVIDENCE_HAS_TEST=$(grep -iE "(test|verified|evidence|output|result)" "$VERIFICATION_FILE" || true)
            if [ -z "$EVIDENCE_HAS_TEST" ]; then
                echo ""
                echo "⚠️  WARNING: VERIFICATION_EVIDENCE.md exists but may be incomplete."
                echo "   Ensure it contains actual test output or verification steps."
            else
                echo "✅ Verification evidence found"
            fi
        fi
    else
        echo ""
        echo "✅ Changes under 50 lines - verification optional (but recommended)"
    fi
fi

# =============================================================================
# ALL CHECKS PASSED
# =============================================================================
echo ""
echo "=============================================="
echo "✅ All pre-commit checks passed"
echo "=============================================="
exit 0
