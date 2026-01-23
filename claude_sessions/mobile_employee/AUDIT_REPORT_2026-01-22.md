# Mobile System Audit Report
## Date: 2026-01-22
## Auditor: Mobile_Employee Claude

---

## EXECUTIVE SUMMARY

**CRITICAL FINDING:** 3 out of 4 mobile files had HARDCODED OLD API URLs pointing to an expired deployment. This has been **FIXED**.

| File | Status Before | Status After |
|------|---------------|--------------|
| employee.html | BROKEN - old API | **FIXED** |
| web_app/driver.html | BROKEN - old API | **FIXED** |
| web_app/customer.html | WORKING | WORKING |
| inventory_capture.html | BROKEN - old API | **FIXED** |

---

## CONTEXT

The API URL was pointing to an **EXPIRED** deployment:
```
OLD (broken): AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc
```

The **CORRECT** deployment URL (from api-config.js):
```
NEW (working): AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp
```

---

## FILE-BY-FILE AUDIT

### 1. employee.html (Root)

**File:** `/employee.html`
**Size:** 877KB
**Role:** Main mobile employee app - Work Orders, Time Clock, Tasks, Compliance Logging

**ISSUES FOUND:**
| Line | Issue | Fix Applied |
|------|-------|-------------|
| HEAD | Missing api-config.js | Added `<script src="web_app/api-config.js"></script>` |
| 12011 | Hardcoded CONFIG.API_URL | Updated to use `TINY_SEED_API.MAIN_API` with fallback |
| 15015 | Hardcoded FLEET_API_URL | Updated to use `TINY_SEED_API.MAIN_API` with fallback |

**PWA STATUS:**
- Manifest: `manifest.json` (exists)
- Service Worker: `/sw.js` (registered at line 11884)
- Icons: Partial (some referenced icons missing)

**STATUS: FIXED**

---

### 2. web_app/driver.html

**File:** `/web_app/driver.html`
**Size:** 192KB
**Role:** Driver delivery app - Routes, Proof of Delivery, Real-time Tracking

**ISSUES FOUND:**
| Line | Issue | Fix Applied |
|------|-------|-------------|
| HEAD | Missing api-config.js | Added `<script src="api-config.js"></script>` |
| 3123 | Hardcoded TRACKING_API_URL | Updated to use `TINY_SEED_API.MAIN_API` with fallback |

**PWA STATUS:**
- Manifest: `manifest-driver.json` (exists)
- Service Worker: `../sw.js` (registered at line 5328)

**STATUS: FIXED**

---

### 3. web_app/customer.html

**File:** `/web_app/customer.html`
**Size:** 82KB
**Role:** Customer portal - Magic link auth, Orders, Profile

**ISSUES FOUND:**
| Line | Issue |
|------|-------|
| 1698 | Already uses `<script src="api-config.js"></script>` |

**STATUS: ALREADY CORRECT** - No changes needed

---

### 4. inventory_capture.html (Root)

**File:** `/inventory_capture.html`
**Size:** 73KB
**Role:** Farm inventory capture with photo/GPS

**ISSUES FOUND:**
| Line | Issue | Fix Applied |
|------|-------|-------------|
| HEAD | Missing api-config.js | Added `<script src="web_app/api-config.js"></script>` |
| 1492 | Hardcoded API_URL | Updated to use `TINY_SEED_API.MAIN_API` with fallback |

**STATUS: FIXED**

---

## MISSING FILES (Mentioned in INBOX but don't exist)

| File | Status |
|------|--------|
| mobile.html | NOT FOUND - Possibly renamed or removed |
| field_app_mobile.html | NOT FOUND - Possibly renamed or removed |

---

## PWA FUNCTIONALITY CHECK

### Manifests
| File | Manifest | Status |
|------|----------|--------|
| employee.html | manifest.json | EXISTS |
| driver.html | manifest-driver.json | EXISTS |
| customer.html | N/A | No PWA |
| inventory_capture.html | N/A | No PWA |

### Service Worker
| Component | Path | Status |
|-----------|------|--------|
| Main SW | /sw.js | EXISTS (6.8KB) |

### Icons
| Icon | Status |
|------|--------|
| icon.svg | EXISTS |
| employee-192.png | EXISTS |
| employee-512.png | EXISTS |
| driver-192.png | EXISTS |
| driver-512.png | EXISTS |
| icon-72.png through icon-512.png | MISSING (referenced in manifest) |

**RECOMMENDATION:** Generate missing PWA icons or update manifest to use existing icons.

---

## CHANGES MADE

### 1. employee.html
```diff
+ <script src="web_app/api-config.js"></script>

- API_URL: 'https://script.google.com/macros/s/AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc/exec',
+ API_URL: (typeof TINY_SEED_API !== 'undefined') ? TINY_SEED_API.MAIN_API : 'https://script.google.com/macros/s/AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp/exec',

- const FLEET_API_URL = 'https://script.google.com/macros/s/AKfycbxkBTDNjrQJJS4ioZpqd2BC1LNLPVUsmAoYAlh2I4apIuoi3MmBoEb4E54kVYNhEd0RBA/exec';
+ const FLEET_API_URL = (typeof TINY_SEED_API !== 'undefined') ? TINY_SEED_API.MAIN_API : 'https://script.google.com/macros/s/AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp/exec';
```

### 2. web_app/driver.html
```diff
+ <script src="api-config.js"></script>

- const TRACKING_API_URL = 'https://script.google.com/macros/s/AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc/exec';
+ const TRACKING_API_URL = (typeof TINY_SEED_API !== 'undefined') ? TINY_SEED_API.MAIN_API : 'https://script.google.com/macros/s/AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp/exec';
```

### 3. inventory_capture.html
```diff
+ <script src="web_app/api-config.js"></script>

- const API_URL = 'https://script.google.com/macros/s/AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc/exec';
+ const API_URL = (typeof TINY_SEED_API !== 'undefined') ? TINY_SEED_API.MAIN_API : 'https://script.google.com/macros/s/AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp/exec';
```

---

## TESTING CHECKLIST

### Browser Console Tests
```javascript
// Test API connection
const api = new TinySeedAPI();
api.testConnection().then(console.log).catch(console.error);

// Test employee authentication
const empApi = new EmployeeAPI();
empApi.authenticate('1234').then(console.log);

// Test driver authentication
const driverApi = new DriverAPI();
driverApi.authenticate('1234').then(console.log);
```

### Manual Tests
- [ ] employee.html: Open, login with PIN, verify tasks load
- [ ] driver.html: Open, login with PIN, verify route loads
- [ ] customer.html: Open, test magic link flow
- [ ] inventory_capture.html: Open, test photo capture and submission

---

## REMAINING ISSUES

### P1 - Should Fix
1. **Missing PWA Icons:** Manifest references icon-72.png through icon-512.png but only icon.svg exists
2. **Hardcoded Google Maps API Key:** Line 19 in employee.html has a visible API key

### P2 - Nice to Have
1. **Unified Service Worker:** Consider sharing sw.js across all mobile apps
2. **Offline Mode Testing:** Verify IndexedDB sync works correctly

---

## CONCLUSION

**All critical API URL issues have been FIXED.**

The mobile apps should now connect to the correct API deployment. Testing is recommended to verify:
1. Employee PIN login works
2. Work orders load from API
3. Time clock functions (clock in/out)
4. Compliance forms submit properly

---

*Mobile_Employee Claude - Audit Complete*
*2026-01-22*
