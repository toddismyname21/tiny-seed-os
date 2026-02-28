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

BAD_URLS=$(git diff --cached --name-only | grep -v "api-config.js" | grep -v "CLAUDE.md" | grep -v "validate-api-urls" | grep -v "pre-commit-hook" | grep -v "AUDIT_PROTOCOL" | xargs grep -l "script.google.com/macros/s/AKfycb" 2>/dev/null | while read file; do
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
# CHECK 9: HARDCODED SECRETS DETECTION (Gate 1 — Audit Protocol)
# =============================================================================
# Catches API keys, tokens, passwords outside approved locations (api-config.js)

STAGED_CODE_SEC=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(html|js)$' | grep -vE "(api-config\.js|CLAUDE\.md|CHANGE_LOG|\.md$)" || true)

if [ -n "$STAGED_CODE_SEC" ]; then
    echo ""
    echo "Checking for hardcoded secrets..."

    SECRETS_FOUND=""
    for file in $STAGED_CODE_SEC; do
        if [ -f "$file" ]; then
            # Google Maps API keys (AIzaSy pattern)
            MAPS_KEYS=$(grep -nE 'AIzaSy[A-Za-z0-9_-]{30,}' "$file" 2>/dev/null || true)
            if [ -n "$MAPS_KEYS" ]; then
                SECRETS_FOUND="${SECRETS_FOUND}  ${file}: Google Maps API key found inline\n${MAPS_KEYS}\n"
            fi

            # Generic hardcoded key/token/password/secret patterns (in assignments, not comments)
            GENERIC_SECRETS=$(grep -nE "(apiKey|api_key|apiSecret|api_secret|secretKey|secret_key)\s*[:=]\s*['\"][A-Za-z0-9]{16,}" "$file" 2>/dev/null | grep -v "^\s*//" | grep -v "localStorage" | grep -v "getItem" || true)
            if [ -n "$GENERIC_SECRETS" ]; then
                SECRETS_FOUND="${SECRETS_FOUND}  ${file}: Possible hardcoded secret\n${GENERIC_SECRETS}\n"
            fi
        fi
    done

    if [ -n "$SECRETS_FOUND" ]; then
        echo ""
        echo "❌ COMMIT BLOCKED: Hardcoded secrets detected!"
        echo ""
        echo -e "$SECRETS_FOUND"
        echo ""
        echo "FIX: Move secrets to api-config.js or use environment variables."
        echo "     Google Maps keys should use TINY_SEED_API.GOOGLE_MAPS_KEY"
        exit 1
    else
        echo "✅ No hardcoded secrets found"
    fi
fi

# =============================================================================
# CHECK 10: DANGEROUS DOM INJECTION (Gate 1 — Audit Protocol)
# =============================================================================
# Warns about innerHTML with dynamic data — does NOT block (too many existing)

if [ -n "$STAGED_CODE_SEC" ]; then
    echo ""
    echo "Checking for dangerous DOM injection patterns..."

    INNERHTML_COUNT=0
    INNERHTML_FILES=""
    for file in $STAGED_CODE_SEC; do
        if [ -f "$file" ]; then
            # Count innerHTML assignments with variables (not pure string literals)
            COUNT=$(git diff --cached -- "$file" | grep -c '^\+.*\.innerHTML\s*=' 2>/dev/null || echo "0")
            if [ "$COUNT" -gt 0 ]; then
                INNERHTML_COUNT=$((INNERHTML_COUNT + COUNT))
                INNERHTML_FILES="${INNERHTML_FILES}  ${file}: ${COUNT} innerHTML assignment(s)\n"
            fi
        fi
    done

    if [ "$INNERHTML_COUNT" -gt 0 ]; then
        echo "⚠️  WARNING: ${INNERHTML_COUNT} new innerHTML assignment(s) in staged changes:"
        echo -e "$INNERHTML_FILES"
        echo "   Prefer .textContent for text, or sanitize HTML input."
        echo "   See docs/system/AUDIT_PROTOCOL.md for security requirements."
    else
        echo "✅ No new innerHTML assignments in staged changes"
    fi
fi

# =============================================================================
# CHECK 11: BANNED JAVASCRIPT PATTERNS (Gate 1 — Audit Protocol)
# =============================================================================
# Blocks: eval(), new Function(), setTimeout(string)
# Warns: document.write() outside print contexts

if [ -n "$STAGED_CODE_SEC" ]; then
    echo ""
    echo "Checking for banned JavaScript patterns..."

    BANNED_FOUND=""
    for file in $STAGED_CODE_SEC; do
        if [ -f "$file" ]; then
            # Check only ADDED lines in the diff (not existing code)
            ADDED_LINES=$(git diff --cached -- "$file" | grep '^+' | grep -v '^+++' || true)

            # eval() — BLOCKS
            EVAL_HITS=$(echo "$ADDED_LINES" | grep -c '[^a-zA-Z]eval(' 2>/dev/null || echo "0")
            if [ "$EVAL_HITS" -gt 0 ]; then
                BANNED_FOUND="${BANNED_FOUND}  ❌ ${file}: eval() detected (${EVAL_HITS} occurrence(s)) — BLOCKED\n"
            fi

            # new Function() — BLOCKS
            FUNC_HITS=$(echo "$ADDED_LINES" | grep -c 'new Function(' 2>/dev/null || echo "0")
            if [ "$FUNC_HITS" -gt 0 ]; then
                BANNED_FOUND="${BANNED_FOUND}  ❌ ${file}: new Function() detected (${FUNC_HITS} occurrence(s)) — BLOCKED\n"
            fi

            # setTimeout with string argument — BLOCKS
            # Match setTimeout('string' or setTimeout("string" but not setTimeout(function or setTimeout(()
            TIMEOUT_HITS=$(echo "$ADDED_LINES" | grep -cE "setTimeout\s*\(\s*['\"]" 2>/dev/null || echo "0")
            if [ "$TIMEOUT_HITS" -gt 0 ]; then
                BANNED_FOUND="${BANNED_FOUND}  ❌ ${file}: setTimeout(string) detected (${TIMEOUT_HITS} occurrence(s)) — BLOCKED\n"
            fi
        fi
    done

    if [ -n "$BANNED_FOUND" ]; then
        echo ""
        echo "❌ COMMIT BLOCKED: Banned JavaScript patterns detected!"
        echo ""
        echo -e "$BANNED_FOUND"
        echo ""
        echo "eval(), new Function(), and setTimeout(string) are banned."
        echo "See docs/system/AUDIT_PROTOCOL.md"
        exit 1
    else
        echo "✅ No banned JavaScript patterns found"
    fi

    # document.write — WARN only (used legitimately in print contexts)
    DOC_WRITE_WARN=""
    for file in $STAGED_CODE_SEC; do
        if [ -f "$file" ]; then
            ADDED_LINES=$(git diff --cached -- "$file" | grep '^+' | grep -v '^+++' || true)
            DW_HITS=$(echo "$ADDED_LINES" | grep -c 'document\.write(' 2>/dev/null || echo "0")
            if [ "$DW_HITS" -gt 0 ]; then
                DOC_WRITE_WARN="${DOC_WRITE_WARN}  ${file}: ${DW_HITS} document.write() call(s)\n"
            fi
        fi
    done

    if [ -n "$DOC_WRITE_WARN" ]; then
        echo "⚠️  WARNING: document.write() found in staged changes:"
        echo -e "$DOC_WRITE_WARN"
        echo "   Only acceptable inside print preview windows. Review carefully."
    fi
fi

# =============================================================================
# CHECK 12: SRI HASH VERIFICATION (Gate 1 — Audit Protocol)
# =============================================================================
# Warns about CDN scripts/styles missing integrity attribute

STAGED_HTML_SRI=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.html$' || true)

if [ -n "$STAGED_HTML_SRI" ]; then
    echo ""
    echo "Checking SRI hashes on external resources..."

    SRI_MISSING=0
    SRI_DETAILS=""
    for file in $STAGED_HTML_SRI; do
        if [ -f "$file" ]; then
            # Find <script src="https://"> without integrity=
            # Exclude: Google Fonts (no SRI), Google Maps API (no SRI), Google APIs (no SRI)
            MISSING=$(grep -nE '<script\s+[^>]*src="https://' "$file" 2>/dev/null | grep -v 'integrity=' | grep -v 'fonts.googleapis' | grep -v 'maps.googleapis' | grep -v 'apis.google.com' || true)
            if [ -n "$MISSING" ]; then
                COUNT=$(echo "$MISSING" | wc -l | tr -d ' ')
                SRI_MISSING=$((SRI_MISSING + COUNT))
                SRI_DETAILS="${SRI_DETAILS}  ${file}: ${COUNT} external script(s) without SRI\n"
            fi

            # Find <link href="https://"> without integrity=
            MISSING_CSS=$(grep -nE '<link\s+[^>]*href="https://' "$file" 2>/dev/null | grep -v 'integrity=' | grep -v 'fonts.googleapis' || true)
            if [ -n "$MISSING_CSS" ]; then
                COUNT=$(echo "$MISSING_CSS" | wc -l | tr -d ' ')
                SRI_MISSING=$((SRI_MISSING + COUNT))
                SRI_DETAILS="${SRI_DETAILS}  ${file}: ${COUNT} external stylesheet(s) without SRI\n"
            fi
        fi
    done

    if [ "$SRI_MISSING" -gt 0 ]; then
        echo "⚠️  WARNING: ${SRI_MISSING} external resource(s) missing SRI hashes:"
        echo -e "$SRI_DETAILS"
        echo "   Add integrity=\"sha384-...\" to CDN <script> and <link> tags."
        echo "   Generate hashes at: https://www.srihash.org/"
    else
        echo "✅ External resources SRI check passed"
    fi
fi

# =============================================================================
# CHECK 13: CSP META TAG CHECK (Gate 1 — Audit Protocol)
# =============================================================================
# Informs about missing Content-Security-Policy — does NOT block

if [ -n "$STAGED_HTML_SRI" ]; then
    echo ""
    echo "Checking for CSP meta tags..."

    CSP_MISSING=""
    for file in $STAGED_HTML_SRI; do
        if [ -f "$file" ]; then
            HAS_CSP=$(grep -c 'Content-Security-Policy' "$file" 2>/dev/null || echo "0")
            if [ "$HAS_CSP" -eq 0 ]; then
                CSP_MISSING="${CSP_MISSING}  ${file}\n"
            fi
        fi
    done

    if [ -n "$CSP_MISSING" ]; then
        echo "ℹ️  INFO: HTML file(s) without CSP meta tag:"
        echo -e "$CSP_MISSING"
        echo "   Consider adding: <meta http-equiv=\"Content-Security-Policy\" content=\"...\">"
    else
        echo "✅ CSP meta tags present"
    fi
fi

# =============================================================================
# ALL CHECKS PASSED
# =============================================================================
echo ""
echo "=============================================="
echo "✅ All pre-commit checks passed (13 checks)"
echo "=============================================="
exit 0
