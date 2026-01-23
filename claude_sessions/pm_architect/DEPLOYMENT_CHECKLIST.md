# DEPLOYMENT CHECKLIST
## MANDATORY Before Any Session Ends

**Created:** 2026-01-23
**Reason:** Live site broke because changes weren't pushed to GitHub

---

## BEFORE ENDING ANY SESSION

### 1. Check Git Status
```bash
git status
```

**If there are modified files:**
- COMMIT THEM
- PUSH THEM
- The live site uses GitHub Pages - unpushed changes = broken site

### 2. Verify API URL Consistency

Run this audit:
```bash
# Check all HTML files have correct deployment ID
grep -rln "AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc" *.html web_app/*.html
```

**Expected result:** NO OUTPUT (no files with old URL)

If any files found: FIX THEM IMMEDIATELY

### 3. Test Live Site

After pushing:
```bash
curl -sL "https://script.google.com/macros/s/AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp/exec?action=healthCheck"
```

**Expected:** `{"success":true,"status":"healthy"...}`

---

## CURRENT CORRECT API DEPLOYMENT

```
ID: AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp

Full URL: https://script.google.com/macros/s/AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp/exec
```

---

## CRITICAL RULES

1. **ALWAYS push after making changes** - Local changes don't help the live site
2. **ALWAYS test live site after deployment** - Don't assume it worked
3. **NEVER leave uncommitted HTML files** - They will cause site failures
4. **The api-config.js is the source of truth** - But 21 HTML files have hardcoded URLs too

---

## FILES WITH HARDCODED API URLs

These files bypass api-config.js and must be manually updated:

**Root Level:**
- employee.html
- flowers.html
- index.html
- inventory_capture.html
- labels.html
- login.html
- seed_inventory_PRODUCTION.html
- smart_learning_DTM.html
- soil-tests.html
- track.html

**web_app Folder:**
- ai-assistant.html
- command-center.html
- csa.html
- delivery-zone-checker.html
- driver.html
- financial-dashboard.html
- food-safety.html
- labels.html
- log-commitment.html
- quickbooks-dashboard.html
- smart-predictions.html

---

## WHAT HAPPENED TODAY (2026-01-23)

1. API URL was updated in local files
2. Changes were NOT pushed to GitHub
3. Live site continued using old URL
4. Site broke with CORS errors
5. User discovered issue
6. Emergency push fixed it

**Lesson:** ALWAYS PUSH YOUR CHANGES

---

## QUICK FIX COMMANDS

If live site is broken:

```bash
# Check for uncommitted changes
git status

# Add all HTML files
git add *.html web_app/*.html

# Commit
git commit -m "Emergency sync - fix live site"

# Push
git push origin main

# Verify
curl -sL "https://script.google.com/macros/s/AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp/exec?action=healthCheck"
```

---

*PM_Architect - This checklist is MANDATORY*
