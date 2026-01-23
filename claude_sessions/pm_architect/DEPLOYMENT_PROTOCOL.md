# DEPLOYMENT_PROTOCOL.md - Desktop vs Mobile Deployment Rules
## Project Manager: Claude PM_Architect
## Updated: 2026-01-22

---

# OVERVIEW

This document defines the exact deployment protocols for Desktop Claude and Mobile Claude to ensure changes go to the right places without conflicts.

---

# DEPLOYMENT MATRIX

| Claude | Deploy Method | Target | Files |
|--------|---------------|--------|-------|
| Backend_Claude | `clasp push && deploy` | Apps Script | `/apps_script/*.js` |
| Desktop_Claude | `git push origin main` | GitHub Pages | Root `.html`, `web_app/` admin files |
| Mobile_Claude | `git push origin main` | GitHub Pages | Mobile `.html`, `web_app/` customer files |

---

# BACKEND_CLAUDE DEPLOYMENT

## Files Owned
All files in `/apps_script/`:
```
MERGED TOTAL.js
CropRotation.js
AccountingModule.js
SmartAvailability.js
ChefCommunications.js
FieldManagement.js
ChiefOfStaff_*.js (all Chief of Staff modules)
EmailWorkflowEngine.js
FarmIntelligence.js
MorningBriefGenerator.js
SmartFinancialSystem.js
SmartSuccessionPlanner.js
... and all other .js files
```

## Deployment Command
```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS/apps_script
clasp push
clasp deploy -i "AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc" -d "Description of changes"
```

## Pre-Deployment Checklist
- [ ] Functions tested locally
- [ ] No duplicate switch cases added
- [ ] No hardcoded API keys
- [ ] All new endpoints documented
- [ ] OUTBOX.md updated

## Post-Deployment Verification
```bash
# Test API is responding
curl "https://script.google.com/macros/s/AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc/exec?action=testConnection"
```

---

# DESKTOP_CLAUDE DEPLOYMENT

## Files Owned (Root Level - Desktop Dashboard)
```
index.html                    - Main dashboard
planning.html                 - Crop planning
succession.html               - Succession wizard
calendar.html                 - Calendar view
greenhouse.html               - Greenhouse tracking
labels.html                   - Label printing
sowing-sheets.html            - Sowing records
soil-tests.html               - Soil analysis
farm-operations.html          - Field operations
flowers.html                  - Flower management
food-safety.html              - Compliance forms
seed_inventory_PRODUCTION.html - Seed tracking
smart_learning_DTM.html       - DTM analytics
```

## Files Owned (Web App - Admin/Staff)
```
web_app/chief-of-staff.html        - Command center
web_app/admin.html                 - User management
web_app/sales.html                 - Sales dashboard
web_app/financial-dashboard.html   - Financials
web_app/wealth-builder.html        - Investments
web_app/accounting.html            - Accounting
web_app/quickbooks-dashboard.html  - QuickBooks
web_app/marketing-command-center.html - Marketing
web_app/field-planner.html         - Field planning
web_app/command-center.html        - Operations hub
web_app/social-intelligence.html   - Social analytics
web_app/seo_dashboard.html         - SEO tracking
web_app/smart-predictions.html     - Predictions
web_app/book-import.html           - Book import
web_app/pm-monitor.html            - PM Monitor (SHARED with PM)
```

## Deployment Command
```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS
git add .
git commit -m "Desktop: [Description of changes]"
git push origin main
```

## Pre-Deployment Checklist
- [ ] Tested on desktop browser (1024px+)
- [ ] Uses `api-config.js` for all API calls
- [ ] No demo/sample data fallbacks
- [ ] Proper error handling
- [ ] OUTBOX.md updated

## Design Requirements
- Minimum viewport: 1024px
- Full sidebar navigation
- Multi-column layouts allowed
- Print stylesheets for labels/reports
- Keyboard shortcuts encouraged

---

# MOBILE_CLAUDE DEPLOYMENT

## Files Owned (Root Level - Mobile)
```
employee.html           - Crew app (MOBILE FIRST)
mobile.html             - Mobile dashboard
field_app_mobile.html   - Field kiosk
inventory_capture.html  - Inventory capture (camera)
login.html              - Authentication (SHARED)
```

## Files Owned (Web App - Customer/Mobile)
```
web_app/driver.html          - Driver delivery app
web_app/chef-order.html      - Chef mobile ordering
web_app/customer.html        - Customer ordering
web_app/csa.html             - CSA member portal
web_app/wholesale.html       - Wholesale portal
web_app/farmers-market.html  - Market POS
web_app/market-sales.html    - Market sales
web_app/neighbor.html        - Neighbor landing (PUBLIC)
```

## Files Owned (PWA Manifests)
```
manifest-employee.json       - Employee app manifest
web_app/manifest-driver.json - Driver app manifest
web_app/chef-manifest.json   - Chef ordering manifest
```

## Deployment Command
```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS
git add .
git commit -m "Mobile: [Description of changes]"
git push origin main
```

## Pre-Deployment Checklist
- [ ] Tested on actual mobile device (not just responsive mode)
- [ ] Touch targets are 44px minimum
- [ ] Uses `api-config.js` for all API calls
- [ ] No demo/sample data fallbacks
- [ ] Offline indicators present
- [ ] PWA manifest updated if needed
- [ ] OUTBOX.md updated

## Design Requirements
- Mobile-first: 320px minimum viewport
- Touch targets: 44px minimum
- Bottom navigation for apps
- Swipe gestures where appropriate
- Offline indicators required
- "Add to Home Screen" prompts

---

# SHARED FILES (Require Coordination)

These files are used by both Desktop and Mobile and require PM approval to change:

| File | Owner | Purpose |
|------|-------|---------|
| `web_app/api-config.js` | PM_Architect | API configuration |
| `web_app/auth-guard.js` | Security_Claude | Authentication |
| `login.html` | Mobile_Claude (with Desktop approval) | Entry point |
| `web_app/index.html` | PM_Architect | App hub |

## Process for Shared Files
1. Propose change in your OUTBOX
2. Wait for PM approval
3. Make change with clear commit message
4. Notify all affected Claudes

---

# CONFLICT RESOLUTION

## If Both Claudes Need Same File

1. **STOP** - Do not proceed
2. **Report** to PM_Architect via INBOX
3. **Wait** for assignment decision
4. One Claude makes change, other reviews

## If Git Conflict Occurs

```bash
# DO NOT force push
git pull origin main
# Resolve conflicts manually
git add .
git commit -m "Merge: resolve conflict between Desktop and Mobile"
git push origin main
```

## If Deployment Breaks Production

1. **Identify** which Claude last deployed
2. **Check** their OUTBOX for changes
3. **Rollback** if necessary:
   ```bash
   # For Apps Script
   clasp deploy -i [PREVIOUS_DEPLOYMENT_ID]

   # For GitHub
   git revert HEAD
   git push origin main
   ```
4. **Report** to PM_Architect

---

# DEPLOYMENT SCHEDULE

## Recommended Times
- **Backend deployments**: Early morning (6-8 AM) or late evening (8-10 PM)
- **Frontend deployments**: Any time, but avoid peak usage hours (10 AM - 2 PM)

## Coordination Required
If multiple deployments in same day:
1. Backend deploys FIRST
2. Wait for API verification
3. Then Frontend deploys
4. Full system test

---

# OUTBOX REPORT FORMAT

After EVERY deployment, update your OUTBOX.md with:

```markdown
## Deployment Report - [Date]

### Changes
- [List all files modified]
- [List all functions added/changed]

### API Endpoints (Backend only)
- Added: [endpoint names]
- Modified: [endpoint names]

### Testing
- [ ] Tested locally
- [ ] Tested on production
- [ ] No errors in console

### Known Issues
- [Any issues discovered]

### Next Steps
- [What comes next]
```

---

# ROLLBACK PROCEDURES

## Apps Script Rollback
```bash
# List all deployments
clasp deployments

# Deploy to previous version
clasp deploy -i [OLD_DEPLOYMENT_ID] -d "Rollback to version X"
```

## GitHub Pages Rollback
```bash
# Revert last commit
git revert HEAD --no-edit
git push origin main

# Or revert to specific commit
git revert [COMMIT_HASH] --no-edit
git push origin main
```

---

# EMERGENCY CONTACTS

If something breaks and you can't fix it:

1. Update your OUTBOX with the error
2. Create issue in PM_Architect INBOX
3. Include:
   - What you were trying to do
   - What happened
   - Error messages
   - Steps to reproduce

---

**END OF DEPLOYMENT PROTOCOL**

*All Claudes MUST follow this protocol for every deployment.*
*Updated: 2026-01-22 by PM_Architect Claude*
