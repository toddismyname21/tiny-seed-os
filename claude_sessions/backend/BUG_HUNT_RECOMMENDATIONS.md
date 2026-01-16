# OVERNIGHT BUG HUNT REPORT
## 10 Recommendations for Code Health
**Date:** 2026-01-16
**Status:** COMPLETE

---

## CRITICAL (Fix Immediately)

### 1. HARDCODED API CREDENTIALS (Security Risk)

**Severity:** CRITICAL
**Impact:** Credentials exposed in source code - anyone with access can extract them

| Service | Location | Credential |
|---------|----------|------------|
| Twilio | Line 40-41 | ACCOUNT_SID, AUTH_TOKEN |
| Google Maps | Line 50 | API_KEY |
| Plaid | Line 17508-17509 | CLIENT_ID, SECRET |
| Ayrshare | Line 6404 | API_KEY (in setup function) |

**Recommendation:** Move ALL credentials to `PropertiesService.getScriptProperties()`:
```javascript
// Instead of:
const TWILIO_CONFIG = {
  AUTH_TOKEN: '7ae4c1d1315687baa807af2babfb83fd'  // EXPOSED!
};

// Use:
const TWILIO_CONFIG = {
  get AUTH_TOKEN() {
    return PropertiesService.getScriptProperties().getProperty('TWILIO_AUTH_TOKEN');
  }
};
```

**One-time setup functions needed:**
- `storeTwilioCredentials()`
- `storeGoogleMapsKey()`
- `storePlaidCredentials()`

---

### 2. INCONSISTENT RESPONSE WRAPPER

**Severity:** HIGH
**Impact:** Some endpoints return raw data, others use `jsonResponse()` - causes client parsing issues

**Found 25+ endpoints without jsonResponse wrapper:**
```
Line 105: return getPlanningData();           // NO wrapper
Line 107: return getDashboardStats();         // NO wrapper
Line 109: return getGreenhouseSeedings();     // NO wrapper
Line 113: return getFieldTasks();             // NO wrapper
Line 115: return getDTMLearningData();        // NO wrapper
... and 20+ more
```

**Recommendation:** Wrap ALL switch case returns:
```javascript
// Change from:
case 'getPlanningData':
  return getPlanningData();

// To:
case 'getPlanningData':
  return jsonResponse(getPlanningData());
```

---

### 3. "NOT IMPLEMENTED" STUB FUNCTIONS

**Severity:** MEDIUM
**Impact:** 10 endpoints are wired but return errors - confuses API consumers

| Function | Line |
|----------|------|
| `getPlanningById()` | 3157 |
| `getCropByName()` | 3158 |
| `getBedsByField()` | 3159 |
| `getTasks()` | 3160 |
| `getTasksByDateRange()` | 3161 |
| `getWeatherData()` | 3220 |
| `getFinancials()` | 3221 |
| `deletePlanting()` | 3248 |
| `bulkAddPlantings()` | 3303 |
| `addTask()` | 3304 |

**Recommendation:** Either implement these or remove from switch statements to avoid confusion.

---

## HIGH PRIORITY (Fix This Week)

### 4. SHEET NAMING INCONSISTENCY

**Severity:** MEDIUM
**Impact:** Code may fail silently if wrong sheet name is used

| Concept | Name 1 | Name 2 | Lines Using Both |
|---------|--------|--------|------------------|
| Harvests | `HARVEST_LOG` | `HARVESTS` | 3165, 3472, 14849 |
| Users | `EMPLOYEES` | `USERS` | 14122 |
| Crops | `REF_CropProfiles` | `REF_Crops` | 9065, 19514 |

**Current workaround (Line 14849):**
```javascript
const harvestSheet = ss.getSheetByName('HARVESTS') || ss.getSheetByName('HARVEST_LOG');
```

**Recommendation:** Standardize sheet names and update all references. Create constants:
```javascript
const SHEET_NAMES = {
  HARVESTS: 'HARVEST_LOG',
  USERS: 'USERS',
  CROP_PROFILES: 'REF_CropProfiles'
};
```

---

### 5. HARDCODED YEAR (PLANNING_2026)

**Severity:** MEDIUM
**Impact:** When 2027 arrives, 50+ code locations will need updating

**Found 50+ references to 'PLANNING_2026'**

**Recommendation:** Create a dynamic year constant:
```javascript
const CURRENT_PLANNING_YEAR = new Date().getFullYear();
const PLANNING_SHEET = `PLANNING_${CURRENT_PLANNING_YEAR}`;
```

Or use a configuration sheet to store the active planning year.

---

### 6. MIXED VAR/CONST/LET DECLARATIONS

**Severity:** LOW
**Impact:** Inconsistent code style, potential scoping issues with `var`

**Found ~30 legacy `var` declarations** (mostly in lines 3800-3910)

**Recommendation:** Refactor all `var` to `const` or `let`:
```javascript
// Change from:
var ss = SpreadsheetApp.getActiveSpreadsheet();
var sheet = ss.getSheetByName("PLANNING_2026");

// To:
const ss = SpreadsheetApp.getActiveSpreadsheet();
const sheet = ss.getSheetByName("PLANNING_2026");
```

---

## MEDIUM PRIORITY (Good Cleanup)

### 7. parseInt WITHOUT RADIX

**Severity:** LOW
**Impact:** Potential octal interpretation bugs (e.g., `parseInt('08')` returns 0 in old JS)

**Found 20+ instances of parseInt without radix:**
```javascript
parseInt(e.parameter.instagram)  // Should be parseInt(..., 10)
```

**Recommendation:** Always specify radix 10:
```javascript
parseInt(value, 10)
```

---

### 8. TEST FUNCTIONS IN PRODUCTION CODE

**Severity:** LOW
**Impact:** Clutters production code, could accidentally be called

**Found 7 test functions:**
- `testConnection()` - Line 1009 (this one is intentional)
- `testSowingTasks()` - Line 5989
- `testFinancialModule()` - Line 17473
- `testPlaidConnection()` - Line 18087
- `testMarketingModule()` - Line 19149
- `testShopifyConnection()` - Line 20027
- `testQuickBooksConnection()` - Line 20036

**Recommendation:** Move test functions to a separate `Tests.gs` file.

---

### 9. SILENT RETURNS (No Error Feedback)

**Severity:** LOW
**Impact:** Functions fail silently without logging or returning errors

**Found 30+ bare `return;` statements:**
```javascript
if (!sheet) return;          // Line 4008 - fails silently
if (!srcSheet || !bedSheet) return;  // No error message
```

**Recommendation:** Return meaningful error objects:
```javascript
// Change from:
if (!sheet) return;

// To:
if (!sheet) return { success: false, error: 'Sheet not found' };
```

---

### 10. REDUNDANT SHEET_ID DEFINITIONS

**Severity:** LOW
**Impact:** Same value defined in multiple places - maintenance burden

**Global constant:**
```javascript
const SPREADSHEET_ID = '128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc';  // Line 24
```

**Local redefinitions (same value):**
```javascript
const SHEET_ID = '128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc';  // Line 5745
const SHEET_ID = '128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc';  // Line 5907
```

**Recommendation:** Use the global `SPREADSHEET_ID` everywhere instead of local redefinitions.

---

## SUMMARY

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| CRITICAL | Hardcoded credentials | Medium | Security breach risk |
| HIGH | Inconsistent jsonResponse | Low | API reliability |
| HIGH | Stub functions | Low | API clarity |
| MEDIUM | Sheet naming | Medium | Code reliability |
| MEDIUM | Hardcoded year | Low | Future maintenance |
| MEDIUM | var/const/let | Low | Code quality |
| LOW | parseInt radix | Low | Edge case bugs |
| LOW | Test functions | Low | Code organization |
| LOW | Silent returns | Medium | Debugging difficulty |
| LOW | Redundant SHEET_ID | Low | Maintenance |

---

## QUICK WINS (Can Fix Today)

1. **Create credential storage functions** - Move hardcoded keys to PropertiesService
2. **Add jsonResponse wrapper** - 25 case statements need wrapping
3. **Remove redundant SHEET_ID** - Use global SPREADSHEET_ID

---

*Bug Hunt Complete - Backend Claude*
*Ready for owner review*
