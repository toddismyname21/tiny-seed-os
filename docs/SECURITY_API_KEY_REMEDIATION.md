# SECURITY: API Key Exposure Remediation

**Date:** 2026-02-12
**Severity:** HIGH
**Status:** REMEDIATION IN PROGRESS

---

## Executive Summary

Google Maps API keys were found hardcoded in multiple HTML files across the repository. This document outlines the affected files, required remediation steps, keys that must be rotated, and prevention measures.

---

## Exposed API Keys - MUST BE ROTATED IMMEDIATELY

### Key 1: Primary Google Maps API Key
- **Key:** `AIzaSyDkAfsMpi7Arqb43gBAitN0WEUs4V13N8Y`
- **Type:** Google Maps JavaScript API
- **Commit:** 53cb0bd (and others)
- **Status:** EXPOSED - MUST ROTATE

### Key 2: Secondary Google Maps API Key
- **Key:** `AIzaSyAEjb_a8VxoFb1aqEKZLdRW3NTaQKijWZ0`
- **Type:** Google Maps JavaScript API (with geometry/drawing libraries)
- **Status:** EXPOSED - MUST ROTATE

---

## Affected Files

### Files with Key 1 (`AIzaSyDkAfsMpi7Arqb43gBAitN0WEUs4V13N8Y`)

| File | Line | Usage |
|------|------|-------|
| `/Users/samanthapollack/Documents/TIny_Seed_OS/track.html` | 10 | Maps JS API script tag |
| `/Users/samanthapollack/Documents/TIny_Seed_OS/employee.html` | 21 | Maps JS API script tag |
| `/Users/samanthapollack/Documents/TIny_Seed_OS/farm-operations.html` | 9 | Maps JS API script tag (with callback) |
| `/Users/samanthapollack/Documents/TIny_Seed_OS/apps_script/MERGED TOTAL.js` | 30547 | Script Properties setter |
| `/Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/backend/CODE_AUDIT.md` | 51 | Documentation (audit log) |

### Files with Key 2 (`AIzaSyAEjb_a8VxoFb1aqEKZLdRW3NTaQKijWZ0`)

| File | Line | Usage |
|------|------|-------|
| `/Users/samanthapollack/Documents/TIny_Seed_OS/apps_script/FieldMobileCapture.html` | 848 | Maps JS API with geometry |
| `/Users/samanthapollack/Documents/TIny_Seed_OS/apps_script/FieldManagementDashboard.html` | 8 | Maps JS API with drawing/geometry |
| `/Users/samanthapollack/Documents/TIny_Seed_OS/apps_script/IrrigationDashboard.html` | 8 | Maps JS API with geometry |

---

## Remediation Steps

### Step 1: Rotate the Exposed Keys (URGENT)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Find both exposed API keys
3. **DO NOT DELETE** - Create new keys first
4. Create two new API keys with proper restrictions:

**New Key 1 (Frontend Web):**
- Application restrictions: HTTP referrers
- Allowed referrers:
  - `tinyseedfarmpgh.com/*`
  - `*.tinyseedfarmpgh.com/*`
  - `toddismyname21.github.io/*`
  - `localhost:*` (for development)
- API restrictions: Maps JavaScript API only

**New Key 2 (Apps Script):**
- Application restrictions: None (Apps Script doesn't support referrer restrictions)
- API restrictions: Maps JavaScript API, Geocoding API
- Consider: IP restrictions if Apps Script runs on known IPs

5. Update the new keys in all locations
6. Delete the old exposed keys

### Step 2: Update HTML Files

For each affected HTML file, replace the hardcoded key with the centralized config:

**Before (INSECURE):**
```html
<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDkAfsMpi7Arqb43gBAitN0WEUs4V13N8Y" async defer></script>
```

**After (SECURE):**
```html
<script src="web_app/config.js"></script>
<script src="web_app/api-config.js"></script>
<script>
  // Load Google Maps dynamically with key from config
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${TINY_SEED_API.GOOGLE_MAPS_API_KEY}&callback=initMap`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
</script>
```

### Step 3: Update Apps Script Files

For Apps Script HTML files served via `google.script.run`:

1. Store the API key in Script Properties (already done, but rotate the value)
2. Pass the key to the HTML template at serve time
3. Use `<?= googleMapsApiKey ?>` template syntax

**Example Apps Script Pattern:**
```javascript
// In Code.gs or similar
function getGoogleMapsApiKey() {
  return PropertiesService.getScriptProperties().getProperty('GOOGLE_MAPS_API_KEY');
}

// In HTML serving function
function serveFieldMobileCapture() {
  const template = HtmlService.createTemplateFromFile('FieldMobileCapture');
  template.googleMapsApiKey = getGoogleMapsApiKey();
  return template.evaluate();
}
```

### Step 4: Create Local Config

1. Copy `web_app/config.template.js` to `web_app/config.js`
2. Add your new API key to `config.js`
3. `config.js` is gitignored and will never be committed

### Step 5: Update Git History (Optional but Recommended)

Since the keys are in git history, they should be considered permanently compromised. Options:

**Option A (Recommended):** Rotate keys and add restrictions
- Easiest approach
- Keys in history are useless after rotation

**Option B (Thorough):** Use BFG Repo-Cleaner to remove from history
```bash
# Backup first!
git clone --mirror git@github.com:user/repo.git backup

# Remove sensitive data
bfg --replace-text passwords.txt repo.git

# Clean up
cd repo.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

---

## Sensitive Strings That Should Be Rotated

### Critical (Exposed in Repository)

| Type | Value (First 12 chars) | Location | Action |
|------|------------------------|----------|--------|
| Google Maps API Key | `AIzaSyDkAfsM...` | Multiple HTML files | ROTATE IMMEDIATELY |
| Google Maps API Key | `AIzaSyAEjb_a...` | Apps Script HTML | ROTATE IMMEDIATELY |

### Potentially At Risk (Check Script Properties)

| Type | Storage Location | Action |
|------|------------------|--------|
| `GOOGLE_MAPS_API_KEY` | Apps Script Properties | Verify and rotate |
| `TWILIO_ACCOUNT_SID` | Apps Script Properties | Verify not exposed |
| `TWILIO_AUTH_TOKEN` | Apps Script Properties | Verify not exposed |
| `ANTHROPIC_API_KEY` | Apps Script Properties | Verify not exposed |
| `OPENAI_API_KEY` | Apps Script Properties | Verify not exposed |
| `AGROMONITORING_API_KEY` | Apps Script Properties | Verify not exposed |
| `SHOPIFY_ACCESS_TOKEN` | Apps Script Properties | Verify not exposed |

### Review These Files for Additional Secrets

- `/Users/samanthapollack/Documents/TIny_Seed_OS/apps_script/MERGED TOTAL.js` (line 30547 contains key setter)
- Any files in `apps_script/` directory
- Any `*.env` files (should be gitignored)

---

## Prevention Recommendations

### 1. Pre-commit Hook for Secret Detection

Add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash

# Check for Google API keys
if git diff --cached --name-only | xargs grep -l "AIzaSy" 2>/dev/null; then
    echo "ERROR: Potential Google API key detected!"
    echo "Use config.js (gitignored) instead of hardcoding keys."
    exit 1
fi

# Check for other common secret patterns
PATTERNS=(
    "sk-[a-zA-Z0-9]{20,}"  # OpenAI
    "sk-ant-[a-zA-Z0-9]+"  # Anthropic
    "shpat_[a-zA-Z0-9]+"   # Shopify
    "AC[a-f0-9]{32}"       # Twilio SID
)

for pattern in "${PATTERNS[@]}"; do
    if git diff --cached --name-only | xargs grep -lE "$pattern" 2>/dev/null; then
        echo "ERROR: Potential secret detected matching pattern: $pattern"
        exit 1
    fi
done

exit 0
```

### 2. Use Environment Variables for Local Development

Create `.env` file (gitignored):
```
GOOGLE_MAPS_API_KEY=your_key_here
```

### 3. API Key Restrictions in Google Cloud Console

Always set:
- HTTP referrer restrictions for browser keys
- API restrictions to limit which APIs the key can call
- Quotas to limit usage and detect abuse

### 4. Regular Security Audits

Run this grep pattern monthly to check for exposed keys:
```bash
grep -rE "AIzaSy[A-Za-z0-9_-]{33}" --include="*.html" --include="*.js" .
grep -rE "sk-[a-zA-Z0-9]{20,}" --include="*.html" --include="*.js" .
```

### 5. Use Secrets Manager for Production

Consider:
- Google Cloud Secret Manager
- HashiCorp Vault
- AWS Secrets Manager

---

## Verification Checklist

After completing remediation:

- [ ] New Google Maps API keys created with restrictions
- [ ] Old keys deleted from Google Cloud Console
- [ ] All HTML files updated to use centralized config
- [ ] `web_app/config.js` created locally (not committed)
- [ ] `.gitignore` updated to exclude `config.js`
- [ ] Pre-commit hook installed
- [ ] Apps Script Properties updated with new keys
- [ ] Test all maps functionality works with new keys
- [ ] Security scan confirms no remaining exposed keys

---

## Contact

For questions about this remediation:
- **Owner:** Todd Wilson (todd@tinyseedfarmpgh.com)
- **Created by:** Security_Claude (2026-02-12)

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-02-12 | Security_Claude | Initial assessment and remediation plan |
