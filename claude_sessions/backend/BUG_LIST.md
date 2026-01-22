# BUG LIST
## Tiny Seed Farm OS - January 22, 2026

---

## BUGS FIXED

### BUG-001: getWeather Function Undefined
- **Severity:** CRITICAL
- **Component:** API / Weather
- **File:** MERGED TOTAL.js
- **Description:** `getWeatherFast` called `getWeather(params)` but function didn't exist
- **Fix:** Created `getWeather(params)` function (lines 6313-6398)
- **Status:** FIXED (v170 @288)

### BUG-002: getCrops Returns Empty Object
- **Severity:** CRITICAL
- **Component:** API / Caching
- **File:** MERGED TOTAL.js
- **Description:** `getCropsFast` cached `jsonResponse()` which serializes to `{}`
- **Fix:** Created `getCropsData()` function, updated `getCropsFast` to use it
- **Status:** FIXED (v171 @290)

### BUG-003: getBeds Returns Empty Object
- **Severity:** CRITICAL
- **Component:** API / Caching
- **File:** MERGED TOTAL.js
- **Description:** Same as BUG-002, `jsonResponse()` can't be cached
- **Fix:** Created `getBedsData()` function
- **Status:** FIXED (v171 @290)

### BUG-004: getDashboardStats Returns Empty Object
- **Severity:** CRITICAL
- **Component:** API / Caching
- **File:** MERGED TOTAL.js
- **Description:** Same as BUG-002
- **Fix:** Created `getDashboardStatsData()` function
- **Status:** FIXED (v171 @290)

### BUG-005: getPlanningData Returns Empty Object
- **Severity:** HIGH
- **Component:** API / Caching
- **File:** MERGED TOTAL.js
- **Description:** Same as BUG-002
- **Fix:** Created `getPlanningDataInternal()` function
- **Status:** FIXED (v171 @290)

### BUG-006: Stale Cache After Code Fix
- **Severity:** MEDIUM
- **Component:** Caching
- **File:** MERGED TOTAL.js
- **Description:** Google CacheService holds stale data after code deployment
- **Fix:** Added `clearCaches` endpoint to manually clear
- **Status:** FIXED (v172 @291)

### BUG-008: Duplicate getMorningBrief Functions
- **Severity:** MEDIUM
- **Component:** Code Quality
- **File:** MERGED TOTAL.js, MorningBriefGenerator.js
- **Description:** 3 different `getMorningBrief` implementations causing confusion
- **Fix:** Removed 2 duplicates from MERGED TOTAL.js, kept canonical version in MorningBriefGenerator.js
- **Status:** FIXED (v173 @292)

### BUG-009: Duplicate Case Statements in Router
- **Severity:** LOW
- **Component:** Code Quality
- **File:** MERGED TOTAL.js
- **Description:** 17+ duplicate case statements in doGet/doPost switches
- **Fix:** Removed all true duplicates:
  - getMorningBrief, getSmartDashboard - removed duplicates
  - clockIn/clockOut - renamed driver versions to driverClockIn/driverClockOut
  - getHarvestPredictions, schedulePost, shopifyWebhook - removed duplicates
  - getScheduledPosts, getNeighborSignups - removed duplicates
  - getBills, generateBalanceSheet, generateLoanPackage - removed duplicates
  - getDailyBriefing - renamed social version to getSocialBriefing
- **Status:** FIXED (v174 @319)

### BUG-010: getPlanning Very Slow (20+ seconds)
- **Severity:** MEDIUM
- **Component:** Performance
- **File:** MERGED TOTAL.js
- **Description:** Endpoint took 20+ seconds to respond
- **Fix:** Added `getPlanningFast` with SmartCache, added to fastEndpoints router
- **Result:** Now ~5.6 seconds (72% faster)
- **Status:** FIXED (v173 @292)

### BUG-012: Dashboard Revenue Shows Astronomical Number
- **Severity:** MEDIUM
- **Component:** Data Calculation
- **File:** MERGED TOTAL.js (getDashboardStatsData)
- **Description:** projectedRevenue showed 3,383,753,925,600,000
- **Cause:** Column 15 contained Date objects being converted to milliseconds
- **Fix:** Now searches for revenue column by header name, added sanity check (< $1M per row)
- **Status:** FIXED (v173 @292)

### BUG-013: getBillItems Function Doesn't Exist
- **Severity:** MEDIUM
- **Component:** API / Code Quality
- **File:** MERGED TOTAL.js
- **Description:** Duplicate `case 'getBills'` called non-existent `getBillItems()` function
- **Fix:** Removed duplicate case, kept the one calling `getBills(e.parameter)`
- **Status:** FIXED (v174 @319)

### BUG-014: shopifyWebhook Passing Wrong Parameter
- **Severity:** MEDIUM
- **Component:** API / Integration
- **File:** MERGED TOTAL.js
- **Description:** Duplicate `case 'shopifyWebhook'` passed `e` instead of `data`
- **Fix:** Removed duplicate case (kept the one passing `data`)
- **Status:** FIXED (v174 @319)

---

## OPEN BUGS

### BUG-007: HEAD Deployment Returns 500 Errors
- **Severity:** HIGH
- **Component:** Infrastructure
- **File:** N/A (Google infrastructure)
- **Description:** HEAD deployment (@HEAD) returns "Error code INTERNAL"
- **Workaround:** Use versioned deployments (@319, etc.)
- **Status:** OPEN - Cannot fix (Google issue)

### BUG-011: Missing Endpoints
- **Severity:** LOW
- **Component:** API
- **File:** MERGED TOTAL.js (doGet router)
- **Description:** Several expected endpoints not implemented
- **Missing:**
  - verifySystemComplete
  - getPlants
  - getCustomers
  - getInventory
  - login (GET - should be POST)
- **Status:** OPEN

---

## BUG STATISTICS

| Status | Count |
|--------|-------|
| FIXED | 12 |
| OPEN | 2 |
| TOTAL | 14 |

| Severity | Fixed | Open |
|----------|-------|------|
| CRITICAL | 4 | 0 |
| HIGH | 1 | 1 |
| MEDIUM | 7 | 0 |
| LOW | 0 | 1 |

---

## DEPLOYMENT SUMMARY

| Version | Deployment | Bugs Fixed |
|---------|------------|------------|
| v170 | @288 | BUG-001 |
| v171 | @290 | BUG-002, BUG-003, BUG-004, BUG-005 |
| v172 | @291 | BUG-006 |
| v173 | @292 | BUG-008, BUG-010, BUG-012 |
| v174 | @319 | BUG-009, BUG-013, BUG-014 |

---

*Updated: January 22, 2026*
*Backend Claude - Bug Tracking*
*12 bugs fixed, 2 remaining (1 unfixable)*
