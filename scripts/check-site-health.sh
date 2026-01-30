#!/bin/bash

# =============================================================================
# TINY SEED OS - SITE HEALTH CHECK
# Run this to verify the live site is working correctly
# =============================================================================

CORRECT_API="AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm"
SITE_URL="http://app.tinyseedfarm.com"
API_URL="https://script.google.com/macros/s/$CORRECT_API/exec"

echo "🔍 Tiny Seed OS Health Check"
echo "═══════════════════════════════════════════"
echo ""

ERRORS=0

# 1. Check GitHub Pages status
echo "1. Checking GitHub Pages status..."
PAGES_STATUS=$(gh api repos/toddismyname21/tiny-seed-os/pages --jq '.status' 2>/dev/null)
if [ "$PAGES_STATUS" = "built" ]; then
    echo "   ✅ GitHub Pages: $PAGES_STATUS"
else
    echo "   ❌ GitHub Pages: $PAGES_STATUS"
    ERRORS=$((ERRORS + 1))
fi

# 2. Check site loads
echo "2. Checking site loads..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/" 2>/dev/null)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "   ✅ Site HTTP: $HTTP_CODE"
else
    echo "   ❌ Site HTTP: $HTTP_CODE"
    ERRORS=$((ERRORS + 1))
fi

# 3. Check API responds
echo "3. Checking API responds..."
API_RESPONSE=$(curl -sL "$API_URL?action=testConnection" 2>/dev/null)
if echo "$API_RESPONSE" | grep -q '"success":true'; then
    echo "   ✅ API: Responding"
else
    echo "   ❌ API: Not responding correctly"
    ERRORS=$((ERRORS + 1))
fi

# 4. Check live site has correct API URL
echo "4. Checking live site API URL..."
LIVE_API=$(curl -sL "$SITE_URL/index.html" 2>/dev/null | grep -o "AKfycb[a-zA-Z0-9_-]*" | head -1)
if [ "$LIVE_API" = "$CORRECT_API" ]; then
    echo "   ✅ API URL: Correct"
else
    echo "   ❌ API URL: WRONG!"
    echo "      Expected: $CORRECT_API"
    echo "      Found:    $LIVE_API"
    ERRORS=$((ERRORS + 1))
fi

# 5. Check recent Pages builds
echo "5. Checking recent builds..."
LAST_BUILD=$(gh api repos/toddismyname21/tiny-seed-os/pages/builds --jq '.[0].status' 2>/dev/null)
LAST_ERROR=$(gh api repos/toddismyname21/tiny-seed-os/pages/builds --jq '.[0].error.message' 2>/dev/null)
if [ "$LAST_BUILD" = "built" ]; then
    echo "   ✅ Last build: $LAST_BUILD"
else
    echo "   ❌ Last build: $LAST_BUILD"
    [ "$LAST_ERROR" != "null" ] && echo "      Error: $LAST_ERROR"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "═══════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
    echo "✅ ALL CHECKS PASSED - Site is healthy!"
    exit 0
else
    echo "❌ $ERRORS CHECK(S) FAILED - Site has problems!"
    echo ""
    echo "Common fixes:"
    echo "  - Broken submodule: git rm --cached <path>"
    echo "  - Wrong API URL: Run ./scripts/validate-api-urls.sh"
    echo "  - Build failed: Check gh api repos/.../pages/builds"
    exit 1
fi
