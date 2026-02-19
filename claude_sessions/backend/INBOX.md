# INBOX: Backend Claude
## MARCHING ORDERS - 2026-02-15

**From:** PM_Architect
**Priority:** CRITICAL
**File:** `apps_script/MERGED TOTAL.js`

---

## MANDATORY PIPELINE - READ THIS FIRST

**NOTHING is "done" until it passes Code Audit + Verifier.**

### Your workflow for EVERY change:
1. Make the fix/feature in MERGED TOTAL.js
2. Deploy: `clasp push && clasp deploy -i AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm -d "Description"`
3. Write what you did to your OUTBOX.md with function names and line numbers
4. Code Audit Claude will review your changes
5. Verifier Claude will test your endpoints with curl
6. If either flags issues → you fix → redeploy → repeat
7. Only after BOTH say PASS is it done

---

## PRIORITY 1: TOKEN CONVERSION (URGENT - 60-day expiry)

Social Media Claude prepared the complete code. Read `claude_sessions/social_media/OUTBOX.md` under "TOKEN CONVERSION PLAN" section.

### Add these functions to MERGED TOTAL.js:

**1. `exchangeForPermanentPageTokens()`**
- Exchanges short-lived user token for permanent Page Access Tokens
- Full code is in Social Media Claude's OUTBOX
- Wire to router: `case 'exchangeForPermanentPageTokens': return exchangeForPermanentPageTokens();`

**2. `checkTokenHealth()`**
- Weekly health check testing all 3 account tokens
- Emails todd@tinyseedfarmpgh.com on failure
- Full code in Social Media Claude's OUTBOX
- Wire to router: `case 'checkTokenHealth': return checkTokenHealth();`

**3. `refreshAllIGAATokens()`**
- Fallback for tokens not yet converted
- Full code in Social Media Claude's OUTBOX
- Wire to router: `case 'refreshAllIGAATokens': return refreshAllIGAATokens();`

### Deploy and test:
```bash
clasp push
clasp deploy -i AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm -d "Token conversion + health check + IGAA refresh"
```

### Verify:
```
curl "API_URL?action=checkTokenHealth"
```
Should return JSON with each account's token status.

---

## PRIORITY 2: VERIFY + FIX API ENDPOINTS FOR CREATE SUB-TABS

Desktop Claude is about to deep-dive 3 CREATE sub-tabs (AI Content Studio, CSA Box Visual, Repurpose). They need working backend endpoints.

**Check if these endpoints exist and work. If missing, implement them:**

### AI Content Studio endpoints:
| Action | Purpose | Test |
|--------|---------|------|
| `generateAIContent` | Generate social media content from prompt + platform + tone + count | `curl "API_URL?action=generateAIContent"` with POST body |
| `getContentTemplates` | Return caption templates by category | `curl "API_URL?action=getContentTemplates"` |
| `analyzePhoto` | AI analysis of uploaded photo for caption generation | POST with image data |
| `generateABVariants` | Generate A/B test caption variants | POST with caption + tone |

### CSA Box Visual endpoints:
| Action | Purpose | Test |
|--------|---------|------|
| `generateCSABoxVisual` | If AI-powered visual generation is needed | Check if this is frontend-only (fabric.js) or needs backend |
| `getCSABoxContents` | Get current week's CSA box contents | `curl "API_URL?action=getCSABoxContents"` |

### Repurpose endpoints:
| Action | Purpose | Test |
|--------|---------|------|
| `repurposeBlogToSocial` | Parse blog URL/content → generate platform-specific posts | POST with URL or content |
| `repurposeSocialToBlog` | Analyze high-performing posts → generate blog ideas | POST with post IDs |
| `getHighPerformingPosts` | Fetch top-performing posts from Instagram | GET |

**For each endpoint:**
1. Check if it exists in the router
2. Check if the function is a real implementation or a stub
3. If stub → implement using OpenAI/Claude API for AI operations
4. If missing → create and wire to router
5. Test with curl and document response format

---

## PRIORITY 3: CSRF TOKEN SYSTEM

Add server-side CSRF protection:

1. **`generateCSRFToken()`** - Generate a random token, store in CacheService with 1-hour expiry
2. **`validateCSRFToken(token)`** - Validate incoming token against CacheService
3. **Add to doPost()** - All state-changing POST requests must include valid CSRF token
4. **New endpoint** - `?action=getCSRFToken` returns a fresh token for the frontend

This pairs with Desktop Claude adding the token to frontend fetch calls.

---

## OUTBOX REQUIREMENTS

When you finish each priority, write to your OUTBOX:
```markdown
## PRIORITY X COMPLETE - [Date]

### Endpoints Added/Fixed
| Endpoint | Status | Test Result |
|----------|--------|-------------|
| exchangeForPermanentPageTokens | DEPLOYED | curl returns {success: true} |
| ... | ... | ... |

### Deployment
Version: vXXX @YYY

### Awaiting Code Audit + Verifier Review
```

---

---

## PRIORITY 4: SEED INVENTORY BACKEND UPGRADES (From PM_Architect - 2026-02-18)

**Context:** Owner received seed orders and is setting up seed-to-sale traceability. The seed inventory backend is mostly built but missing receipt/certificate photo storage. Desktop Claude is wiring the frontend in parallel.

**File:** `apps_script/MERGED TOTAL.js`

---

### Fix 4A: ADD RECEIPT & CERTIFICATE PHOTO FIELDS TO SEED INVENTORY (CRITICAL)

**Problem:** The `SEED_INVENTORY` sheet has no columns for storing receipt photos or organic certificate photos. The owner needs to photograph purchase receipts and organic certs for audit trail.

**Current schema** (line ~26416, `SEED_INVENTORY_HEADERS`):
```
Seed_Lot_ID, QR_Code_URL, Crop, Variety, Supplier, Supplier_Lot,
Quantity_Original, Quantity_Remaining, Unit, Germination_Rate,
Germ_Test_Date, Pack_Date, Expiration_Date, Organic_Certified,
Certifier, Seed_Treatment, Purchase_Date, Purchase_Price,
Storage_Location, Notes, Status, Created_At, Last_Used
```

**Fix:**
1. Add 2 new columns to `SEED_INVENTORY_HEADERS`:
   - `Receipt_Photo_URL` — URL to purchase receipt image in Google Drive
   - `Organic_Cert_Photo_URL` — URL to organic certificate image in Google Drive
2. Update `addSeedLot()` (line ~26477) to accept and store these two new fields:
   - `data.receiptPhotoUrl` → `Receipt_Photo_URL` column
   - `data.organicCertPhotoUrl` → `Organic_Cert_Photo_URL` column
3. Update `getSeedInventory()` and `getSeedByQR()` to return these fields in responses

**Important:** Use the same Google Drive upload pattern as `uploadFarmInventoryPhoto()` (line ~34663). Create a subfolder called "Seed_Receipts" in the farm Drive.

---

### Fix 4B: ADD RECEIPT PHOTO UPLOAD ENDPOINT (CRITICAL)

**Problem:** No dedicated endpoint for uploading seed receipt/cert photos.

**Fix:**
1. Create `uploadSeedPhoto(data)` function that:
   - Accepts `data.photo` (base64), `data.seedLotId`, `data.photoType` ('receipt' or 'organic_cert')
   - Uploads to Google Drive folder "Seed_Receipts/{seedLotId}/"
   - Returns the Drive file URL with sharing enabled
   - Updates the appropriate column (`Receipt_Photo_URL` or `Organic_Cert_Photo_URL`) on the matching seed lot row
2. Route it in POST router: `case 'uploadSeedPhoto': return jsonResponse(uploadSeedPhoto(data));`

**Reuse pattern from:** `uploadFarmInventoryPhoto()` at line ~34663 — same Drive folder creation, blob conversion, sharing permissions.

---

### Fix 4C: ENSURE analyzeSeedPacket IS ROUTED (VERIFY)

**Problem:** Desktop Claude will be calling `analyzeSeedPacket` from the inventory capture UI. Verify it's properly routed.

**Verify:**
1. `analyzeSeedPacket` exists in POST router (should be around line ~17557)
2. The function at line ~36360 accepts `data.image` (base64) and returns parsed seed data
3. Test with a simple curl to confirm it responds

If NOT routed, add: `case 'analyzeSeedPacket': return jsonResponse(analyzeSeedPacket(data));`

---

## OUTBOX REQUIREMENTS FOR PRIORITY 4

```markdown
## PRIORITY 4 COMPLETE: Seed Inventory Backend - [Date]

### Changes Made
| Fix | Function | Line | What Changed |
|-----|----------|------|-------------|
| 4A: Schema update | SEED_INVENTORY_HEADERS | ~26416 | Added Receipt_Photo_URL, Organic_Cert_Photo_URL |
| 4A: addSeedLot | addSeedLot() | ~26477 | Stores receipt and cert photo URLs |
| 4B: Upload endpoint | uploadSeedPhoto() | ~NEW | Upload receipt/cert photo to Drive |
| 4C: Route verify | POST router | ~17557 | Confirmed analyzeSeedPacket routed |

### Deployment
Version: vXXX @YYY

### Awaiting Code Audit + Verifier Review
```

---

## PRIORITY 5: EMPLOYEE APP BACKEND AUDIT (From PM_Architect - 2026-02-18)

**Owner is actively testing the employee app and finding bugs.** We need a full audit of the backend endpoints that support the employee app.

**File:** `apps_script/MERGED TOTAL.js`
**Frontend:** `employee.html`

---

### What to Audit

The owner is reporting:
1. Clock-in works but clock-out sometimes fails or doesn't register
2. Inventory mode access was blocked (frontend fix applied, but backend needs verification)

### 5A: Clock-In / Clock-Out Endpoints

Verify these endpoints exist and work correctly:

| Endpoint | Action | What to Check |
|----------|--------|---------------|
| `clockIn` | GET | Accepts employeeId, lat, lng, mode. Returns {success: true}. Writes to timesheet. |
| `clockOut` | GET | Accepts employeeId, lat, lng, mode. Returns {success: true, hoursWorked: X}. Updates timesheet row. |
| `authenticateEmployee` | GET | Accepts pin. Returns {success, employee, isClockedIn, clockInTime}. |

**Critical checks:**
- Does `authenticateEmployee` correctly return `isClockedIn` status? (Check if it reads the timesheet to determine current clock state)
- Does `clockOut` handle the case where there's no matching clock-in row?
- Are there any error conditions where the API returns a non-JSON response?

### 5B: Employee Permission Columns

Verify the employee data schema includes these columns:
- `Role` (should support: Admin, Owner, Manager, Employee)
- `Inventory_Mode` (TRUE/FALSE)
- `Tractor_Mode` (TRUE/FALSE)
- `Garage_Mode` (TRUE/FALSE)
- `Costing_Mode` (TRUE/FALSE)

**Check:** Does the `authenticateEmployee` endpoint return ALL of these fields in the employee object?

### 5C: Seed Inventory Endpoints (Verify Working)

Confirm these endpoints still work after Priority 4 deployment:
- `analyzeSeedPacket` - POST, accepts image base64, returns parsed seed data
- `addSeedLot` - POST, accepts seed data, returns {success, seedLotId}
- `uploadSeedPhoto` - POST, accepts base64 + seedLotId + photoType
- `getSeedByQR` - GET, accepts id parameter

### 5D: General Employee API Health

Spot-check these common employee endpoints:
- `getMyWorkOrder` - returns tasks for employee
- `getMorningBrief` - returns brief data
- `submitInventoryCount` - accepts count data

---

### Output Format

Write results to your OUTBOX.md:
```markdown
## PRIORITY 5: EMPLOYEE APP BACKEND AUDIT
**Date:** 2026-02-18
**Status:** COMPLETE

### 5A: Clock-In/Out
| Endpoint | Status | Notes |
|----------|--------|-------|

### 5B: Permissions Schema
[Findings]

### 5C: Seed Endpoints
[Findings]

### 5D: General Health
[Findings]

### Issues Found
[List any bugs, missing endpoints, or data issues]
```

---

---

## PRIORITY 6: COMPLETE EMPLOYEE APP BACKEND AUDIT (From PM_Architect - 2026-02-18)

**CRITICAL — Owner says this is the LAST ATTEMPT. The app did NOT work at the farm.**

**File:** `apps_script/MERGED TOTAL.js`

**Context:** The owner uses the employee app (employee.html) on their phone at the farm. Clock-in/out, inventory mode, seed inventory — all must work flawlessly. PM_Architect has made multiple fixes, but we need a COMPREHENSIVE backend audit to ensure every endpoint the employee app calls actually works correctly.

**Recent backend deployments:** @639 (AI prompt fix), @640 (updateSeedLot), @641 (Seeds_Per_Packet + aliases)

---

### 6A: AUTHENTICATION & CLOCK ENDPOINTS (CRITICAL)

These are the most-used endpoints. They MUST work perfectly.

| Endpoint | Method | Parameters | What to Verify |
|----------|--------|-----------|---------------|
| `authenticateEmployee` | GET | `pin` | 1. Returns `{success, employee, isClockedIn, clockInTime}`. 2. `employee` object includes ALL permission fields: `Role`, `Inventory_Mode`, `Tractor_Mode`, `Garage_Mode`, `Costing_Mode`. 3. `isClockedIn` is ACCURATE (reads timesheet for open clock-in row). 4. Works for Admin/Owner/Manager roles. |
| `clockIn` | GET | `employeeId, lat, lng, mode` | 1. Creates new row in timesheet. 2. Returns `{success: true}`. 3. Handles case where employee is ALREADY clocked in (should fail gracefully, not create duplicate). |
| `clockOut` | GET | `employeeId, lat, lng, mode` | 1. Finds matching open clock-in row. 2. Updates with clock-out time. 3. Returns `{success: true, hoursWorked: X}`. 4. Handles case where NO open clock-in exists (should fail gracefully). 5. Does NOT crash or return non-JSON on error. |

**Known bug from owner:** Clock-out sometimes fails or doesn't register. FIND OUT WHY.

### 6B: SEED INVENTORY ENDPOINTS (CRITICAL)

All of these were recently added/modified. Verify they work end-to-end.

| Endpoint | Method | Action | What to Verify |
|----------|--------|--------|---------------|
| `analyzeSeedPacket` | POST | `analyzeSeedPacket` | 1. Accepts `data.image` (base64). 2. Sends to Claude Vision API. 3. Returns parsed seed data including `seedsPerPacket`. 4. M notation works (5M = 5000). 5. Is routed in POST router. |
| `addSeedLot` | POST | `addSeedLot` | 1. Accepts seed data with BOTH camelCase (`crop`, `variety`) AND PascalCase (`Crop`, `Variety`). 2. Stores `Seeds_Per_Packet` field. 3. Stores `Receipt_Photo_URL` and `Organic_Cert_Photo_URL`. 4. Returns `{success: true, seedLotId: ...}`. |
| `addSeedToInventory` | POST | `addSeedToInventory` | 1. This is an ALIAS for `addSeedLot`. 2. Verify it's in the POST router. 3. Same behavior as addSeedLot. |
| `updateSeedLot` | POST | `updateSeedLot` | 1. Accepts `data.seedLotId` + any subset of fields. 2. Finds matching row by Seed_Lot_ID. 3. Updates only provided fields. 4. Returns `{success: true}`. 5. Is routed in POST router. |
| `uploadSeedPhoto` | POST | `uploadSeedPhoto` | 1. Accepts `data.photo` (base64), `data.seedLotId`, `data.photoType` ('receipt' or 'organic_cert'). 2. Uploads to Google Drive. 3. Returns Drive URL. 4. Updates the seed lot row with the URL. 5. Is routed in POST router. |
| `getSeedInventory` | GET | `getSeedInventory` | 1. Returns all seed lots. 2. Includes `Seeds_Per_Packet`, `Receipt_Photo_URL`, `Organic_Cert_Photo_URL` in response. |
| `getSeedByQR` | GET | `getSeedByQR` | 1. Accepts `id` parameter. 2. Returns single seed lot data. 3. Includes all fields. |

### 6C: SEED INVENTORY SCHEMA VERIFICATION

Check `SEED_INVENTORY_HEADERS` (around line ~26418):

Expected columns (in order):
```
Seed_Lot_ID, QR_Code_URL, Crop, Variety, Supplier, Supplier_Lot,
Quantity_Original, Quantity_Remaining, Unit, Seeds_Per_Packet,
Germination_Rate, Germ_Test_Date, Pack_Date, Expiration_Date,
Organic_Certified, Certifier, Seed_Treatment, Purchase_Date,
Purchase_Price, Storage_Location, Notes, Status, Created_At,
Last_Used, Receipt_Photo_URL, Organic_Cert_Photo_URL
```

Verify:
1. `Seeds_Per_Packet` is present (was added in @641)
2. `Receipt_Photo_URL` is present
3. `Organic_Cert_Photo_URL` is present
4. `addSeedLot()` writes to ALL columns in correct order
5. Column positions in `addSeedLot()` match the header order

### 6D: INVENTORY COUNT ENDPOINTS

| Endpoint | Method | What to Verify |
|----------|--------|---------------|
| `getInventoryItems` | GET | Returns inventory items for counting. Check if this exists or if it's named differently. |
| `submitInventoryCount` | POST | Accepts count data. Verify it exists and is routed. |
| `getMyWorkOrder` | GET | Returns tasks for employee. Verify exists. |
| `getMorningBrief` | GET | Returns brief data. Verify exists. |

### 6E: EMPLOYEE DATA SCHEMA

Check the employee data source (likely EMPLOYEE_DATA sheet or similar):

1. Does each employee record have ALL these fields?
   - `Name`, `PIN`, `Role` (Admin/Owner/Manager/Employee)
   - `Inventory_Mode` (TRUE/FALSE)
   - `Tractor_Mode` (TRUE/FALSE)
   - `Garage_Mode` (TRUE/FALSE)
   - `Costing_Mode` (TRUE/FALSE)
2. Does `authenticateEmployee` return ALL of these in the employee object?
3. Are boolean fields returned as actual booleans or as strings ("TRUE"/"FALSE")?

### 6F: ERROR HANDLING AUDIT

For EVERY endpoint above:
1. Does it have try/catch?
2. Does it return proper JSON on error? `{success: false, error: "message"}`
3. Does it NEVER return raw HTML error pages?
4. Does it NEVER expose internal error details to the client?

---

### Output Format

Write results to your OUTBOX.md:
```markdown
## PRIORITY 6: COMPLETE EMPLOYEE APP BACKEND AUDIT - [Date]
**Status:** COMPLETE
**Deployments tested:** @641

### 6A: Auth & Clock Endpoints
| Endpoint | Routed | Function Exists | Error Handling | Status |
|----------|--------|----------------|---------------|--------|

### 6B: Seed Endpoints
| Endpoint | Routed | Function Exists | Error Handling | Status |
|----------|--------|----------------|---------------|--------|

### 6C: Schema
[SEED_INVENTORY_HEADERS verification]

### 6D: Inventory Endpoints
| Endpoint | Routed | Function Exists | Status |
|----------|--------|----------------|--------|

### 6E: Employee Schema
[Findings]

### 6F: Error Handling
[Findings]

### CRITICAL ISSUES FOUND
[Numbered list with line numbers — these MUST be fixed]

### FIXES APPLIED
[If you fix anything, document it here with line numbers]

### Deployment
[If you deploy fixes, document version here]
```

---

*Backend Claude - Build it, deploy it, test it. Code Audit and Verifier will verify.*
