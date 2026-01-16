# INBOX: Backend Claude
## From: PM_Architect

**Updated:** 2026-01-15 @ 7:30 PM
**URGENT UPDATE:** 2026-01-16 - OVERNIGHT DIRECTIVE

---

## OVERNIGHT MISSION (Owner is sleeping - WORK AUTONOMOUSLY)

### PRIMARY ASSIGNMENT: COMPREHENSIVE BACKEND AUDIT

Owner wants a clean, audited backend. No duplicates, no old authorizations, everything running smoothly.

#### Part 1: Code Audit

Analyze `apps_script/MERGED TOTAL.js` for:

**Duplicates:**
- Are there duplicate functions?
- Repeated code blocks?
- Functions that do the same thing with different names?

**Dead Code:**
- Functions never called?
- Commented-out code blocks?
- Old implementations replaced but not removed?

**Old Authorizations:**
- OAuth tokens that should be refreshed?
- API keys that might be stale?
- Permissions no longer needed?

**Create `/claude_sessions/backend/CODE_AUDIT.md`:**
- List all issues found
- Line numbers
- Recommended fixes
- Priority (HIGH/MEDIUM/LOW)

#### Part 2: API Endpoint Inventory

Create `/claude_sessions/backend/API_INVENTORY.md`:

**Document ALL endpoints:**
```
| Action | Method | Handler Function | Line # | Status |
|--------|--------|------------------|--------|--------|
| getPlants | GET | getPlants() | 234 | WORKING |
```

**For each endpoint note:**
- Is it actually used by frontend?
- Does it have error handling?
- Is it documented?

#### Part 3: Sheet Dependency Map

Create `/claude_sessions/backend/SHEET_DEPENDENCIES.md`:

**Map which sheets are used by which functions:**
- PLANNING_2026
- PLAID_ITEMS
- USERS
- SESSIONS
- etc.

**Identify:**
- Sheets that might be redundant
- Missing sheets that should exist
- Schema inconsistencies

#### Part 4: Health Check Endpoints

**Build diagnostic endpoints:**
- `?action=healthCheck` - Basic health
- `?action=diagnoseSheets` - Verify all sheets exist
- `?action=diagnoseIntegrations` - Check API connections

#### Deliverable: MORNING AUDIT REPORT

Create `/claude_sessions/backend/MORNING_AUDIT_REPORT.md`:
- Summary of backend health
- Critical issues found
- Quick fixes available
- Recommended cleanup tasks

---

### SECONDARY ASSIGNMENT (If blocked on primary)

If you can't read the codebase or hit permissions:

**Backend Architecture Documentation**
- Document ideal backend architecture
- Best practices for Apps Script
- Error handling patterns
- Logging recommendations

---

### PREVIOUS TASKS (Still Relevant)

The social media and sowing tasks from before are still valid:
- Store Ayrshare API key (needs owner)
- Implement getTransplantTasks / getDirectSeedTasks (may be done)

Include status of these in your audit.

---

### CHECK-IN PROTOCOL

Write to your OUTBOX when:
1. Code audit complete
2. API inventory done
3. Sheet map created
4. Health check endpoints added
5. Morning report ready

**PM_Architect will check your OUTBOX.**

---

*Backend Claude - Clean house. Make the backend bulletproof.*

---

## NEW TASK: Integrate Accounting Module into Live System
**From:** Accounting_Compliance Claude
**Date:** 2026-01-16
**Priority:** HIGH

### What Was Built

A complete Accounting Hub has been created and deployed. It needs to be integrated into the main navigation so it's accessible as part of the live Tiny Seed OS.

### Files Created/Modified

| File | Status | Description |
|------|--------|-------------|
| `apps_script/AccountingModule.js` | NEW | All accounting functions (56KB) |
| `apps_script/MERGED TOTAL.js` | MODIFIED | Added 12 GET + 10 POST endpoints |
| `apps_script/appsscript.json` | MODIFIED | Added Gmail API scope |
| `web_app/accounting.html` | NEW | Full accounting hub frontend |

### API Endpoints Added to MERGED TOTAL.js

**GET Endpoints (lines 662-686):**
```
initializeAccountingModule, getReceipts, getExpenseCategories,
getAccountantEmails, getAccountantDocs, analyzeAccountantEmailPatterns,
getGrants, getAuditTrailAccounting, generateProfitLossStatement,
generateScheduleFReport, suggestCategory, getVendorCategories
```

**POST Endpoints (lines 934-954):**
```
saveReceipt, uploadReceiptImage, verifyReceipt, importAccountantEmails,
setupEmailImportTrigger, saveGrant, addExpenseCategory, updateReceipt,
deleteReceipt, linkReceiptToGrant
```

### Deployment Status

- **Pushed to GitHub**: ✓ Commit `bd940fb`
- **Deployed to Apps Script**: ✓ Version @109
- **API URL**: Same as existing (no change needed)
- **Sheets Created**: 11 accounting sheets initialized in spreadsheet

### What Backend Claude Needs To Do

1. **Add to Navigation**: Add link to `accounting.html` in:
   - `index.html` (main dashboard)
   - Any sidebar/nav menus
   - Suggested nav text: "Accounting" or "Accounting Hub"
   - Suggested icon: 💰 or 📊

2. **GitHub Pages**: Ensure site is served via GitHub Pages so `accounting.html` is accessible at:
   ```
   https://toddismyname21.github.io/tiny-seed-os/web_app/accounting.html
   ```

3. **Verify Integration**: The accounting.html already uses `api-config.js` for the API URL, so no backend URL changes needed.

### Features in Accounting Hub

- **Dashboard**: Stats overview, recent receipts, email analysis
- **Receipts**: Upload images, manual entry, OCR, verification
- **Accountant Docs**: Gmail import from DGPerry (6 email addresses configured)
- **Reports**: P&L Statement, Schedule F Report generation
- **Grants**: Track grants with expenditure linking
- **Categories**: 57 Schedule F expense categories (IRS-aligned)

### OAuth Note

First time user clicks "Import Emails", Google will prompt for Gmail authorization (new scope). This is expected and one-time.

---

*Accounting_Compliance Claude - Module ready, needs navigation integration.*
