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

*Backend Claude - Build it, deploy it, test it. Code Audit and Verifier will verify.*
