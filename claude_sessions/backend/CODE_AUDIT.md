# CODE AUDIT: MERGED TOTAL.js
## Backend Claude - Overnight Audit
**Date:** 2026-01-16

---

## EXECUTIVE SUMMARY

| Metric | Count |
|--------|-------|
| Total Functions | ~420 |
| Total Endpoints | ~230 |
| Sheet References | ~180+ |
| **Issues Found** | **23** |

---

## HIGH PRIORITY ISSUES

### 1. DUPLICATE SWITCH CASES (Will cause runtime errors)

| Case | Line 1 | Line 2 | Impact |
|------|--------|--------|--------|
| `getCropProfile` | 153 | 155 | Second case unreachable |
| `clockIn` | 253 | 291 | Duplicate in same switch |
| `clockOut` | 255 | 293 | Duplicate in same switch |
| `publishSocialPost` | 613 | 729 | POST duplicated in GET/POST |
| `exchangePlaidPublicToken` | 531 | 899 | GET and POST both handle |
| `updateFollowerCounts` | 604 | 741 | GET and POST both handle |
| `importAccountantEmails` | 687 | 943 | GET and POST both handle |

**FIX:** Remove duplicate cases or consolidate logic.

---

### 2. DUPLICATE FUNCTIONS

| Function | Line 1 | Line 2 | Notes |
|----------|--------|--------|-------|
| `storeAyrshareApiKey()` | 6363 | 17518 | Identical function defined twice |

**FIX:** Remove one of the duplicates (line 17518).

---

### 3. HARDCODED API KEYS/SECRETS (SECURITY RISK)

| Item | Line | Value | Risk |
|------|------|-------|------|
| Twilio AUTH_TOKEN | 41 | `7ae4c1d1315687baa807af2babfb83fd` | HIGH - exposed |
| Google Maps API_KEY | 50 | `AIzaSyDkAfsMpi7Arqb43gBAitN0WEUs4V13N8Y` | MEDIUM - exposed |
| Ayrshare API_KEY | 6364 | `1068DEEC-7FAB4064-BBA8F6C7-74CD7A3F` | HIGH - hardcoded |

**FIX:** Move ALL keys to PropertiesService:
```javascript
// GOOD
PropertiesService.getScriptProperties().getProperty('TWILIO_AUTH_TOKEN')

// BAD
AUTH_TOKEN: '7ae4c1d1315687baa807af2babfb83fd'
```

---

### 4. NOT IMPLEMENTED STUBS (Dead Code)

| Function | Line | Notes |
|----------|------|-------|
| `getPlanningById()` | 3117 | Returns "Not implemented" |
| `getCropByName()` | 3118 | Returns "Not implemented" |
| `getBedsByField()` | 3119 | Returns "Not implemented" |
| `getTasks()` | 3120 | Returns "Not implemented" |
| `getTasksByDateRange()` | 3121 | Returns "Not implemented" |
| `getWeatherData()` | 3180 | Returns "Not implemented" |
| `getFinancials()` | 3181 | Returns "Not implemented" |
| `deletePlanting()` | 3208 | Returns "Not implemented" |
| `bulkAddPlantings()` | 3263 | Returns "Not implemented" |
| `addTask()` | 3264 | Returns "Not implemented" |

**FIX:** Either implement these or remove from switch statements to avoid confusion.

---

## MEDIUM PRIORITY ISSUES

### 5. INCONSISTENT RESPONSE PATTERNS

Some endpoints use `jsonResponse()`, others use direct `ContentService`:

```javascript
// Pattern 1 (Good)
return jsonResponse(getData());

// Pattern 2 (Inconsistent)
return ContentService.createTextOutput(JSON.stringify(result))
  .setMimeType(ContentService.MimeType.JSON);

// Pattern 3 (Legacy)
return getPlanning();  // No wrapper at all
```

**Affected functions:** ~40+ legacy endpoints

---

### 6. DUPLICATE SHEET REFERENCES (Different names for same concept?)

| Concept | Sheet Name 1 | Sheet Name 2 |
|---------|--------------|--------------|
| Harvests | `HARVEST_LOG` | `HARVESTS` |
| Employees | `EMPLOYEES` | `USERS` |
| Crops | `REF_CropProfiles` | `REF_Crops` |

**Lines with fallbacks:**
- Line 13517: `ss.getSheetByName('EMPLOYEES') || ss.getSheetByName('USERS')`
- Line 14244: `ss.getSheetByName('HARVESTS') || ss.getSheetByName('HARVEST_LOG')`
- Line 12463: `ss.getSheetByName('REF_Fields') || ss.getSheetByName('FIELD_MAP')`

---

### 7. MISSING ERROR HANDLING

Several functions don't wrap in try/catch:
- `getPlanning()` - line 3058
- `getCrops()` - line 3074
- `getBeds()` - line 3090
- `addPlanting()` - line 3106

---

## LOW PRIORITY ISSUES

### 8. UNUSED/LEGACY FUNCTIONS

| Function | Line | Notes |
|----------|------|-------|
| `findMyData()` | 5653 | Debug function with UI alerts |
| `testSowingTasks()` | 5866 | Test function |
| `testFinancialModule()` | 16868 | Test function |
| `testPlaidConnection()` | 17482 | Test function |
| `testMarketingModule()` | 18446 | Test function |
| `testShopifyConnection()` | 19324 | Test function |
| `testQuickBooksConnection()` | 19333 | Test function |

**Recommendation:** Move test functions to separate test file or mark clearly.

---

### 9. COMMENTED CODE BLOCKS

None found - codebase is clean of commented code.

---

### 10. INCONSISTENT NAMING

| Pattern | Examples |
|---------|----------|
| camelCase | `getPlanning`, `savePlanting` |
| snake_case in data | `Batch_ID`, `User_ID` |
| Mixed | `PLANNING_2026`, `REF_CropProfiles` |

---

## OAUTH/AUTH STATUS

### Current Integrations

| Service | Status | Notes |
|---------|--------|-------|
| Twilio SMS | CONFIGURED | Auth token exposed in code |
| Google Maps | CONFIGURED | API key exposed in code |
| Ayrshare | CONFIGURED | API key should be in Properties |
| Plaid | CONFIGURED | Uses PropertiesService (good) |
| Shopify | PLACEHOLDER | `YOUR_SHOPIFY_ACCESS_TOKEN` |
| QuickBooks | CONFIGURED | Uses OAuth2 library |

---

## RECOMMENDED FIXES BY PRIORITY

### Immediate (P0)
1. Remove duplicate switch cases (lines 153, 291, 293, 729, 741)
2. Remove duplicate `storeAyrshareApiKey` at line 17518
3. Move hardcoded API keys to PropertiesService

### This Week (P1)
4. Add try/catch to legacy functions
5. Standardize response patterns (use `jsonResponse()` everywhere)
6. Implement or remove "Not implemented" stubs

### Later (P2)
7. Consolidate sheet name variations
8. Move test functions to separate file
9. Document all endpoints

---

## LINES TO MODIFY

```
DELETE LINE 155: case 'getCropProfile':  (duplicate)
DELETE LINES 291-294: duplicate clockIn/clockOut
DELETE LINE 729-740: duplicate publishSocialPost block
DELETE LINE 741: duplicate updateFollowerCounts
DELETE LINES 17518-17527: duplicate storeAyrshareApiKey function
```

---

*Code Audit Complete - Backend Claude*
