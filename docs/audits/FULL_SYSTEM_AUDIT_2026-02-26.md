# FULL SYSTEM AUDIT — Tiny Seed Farm OS
**Date:** February 26, 2026
**Auditor:** PM_Architect (Claude Opus 4.6)
**Scope:** Complete top-to-bottom audit of all systems

---

## EXECUTIVE SUMMARY

| Category | Count |
|----------|-------|
| Total HTML files audited | 53+ |
| Total backend endpoints | ~710 (490 GET + 220 POST) |
| Backend file size | 146,892 lines (`MERGED TOTAL.js`) |
| **CRITICAL issues** | **8** |
| **HIGH issues** | **6** |
| **MEDIUM issues** | **12** |
| **LOW issues** | **7** |

---

## WHAT'S WORKING WELL

These systems are confirmed functional and properly integrated:

| System | Status | Details |
|--------|--------|---------|
| API URL centralization | **53/53 frontend files** use `api-config.js` (3 non-frontend files have wrong URLs — see CRITICAL) |
| Auth guard coverage | **43/53 HTML files** have `auth-guard.js` |
| Design system | **52/53 files** use CSS variables consistently |
| Element references | Validation script passes on all tested files |
| Frontend-backend pairs | **35+ connected pairs** confirmed working |
| Seedling presale CMS | Full 9-tab editor with 100 configurable fields, deployed and live |
| Morning brief system | Working (primary version at line ~14318 in doGet) |
| Task management | UNIFIED_TASKS schema with multi-page consumers |
| Customer systems | Wholesale, CSA, Chef ordering all connected to backend |
| Weather integration | Feeding index.html and chief-of-staff.html correctly |
| Employee management | USERS schema connected to employee.html, admin.html, schedule.html |

---

## CRITICAL ISSUES (Must Fix Immediately)

### C1. seedling-admin.html Missing Auth Guard
- **File:** `web_app/seedling-admin.html`
- **Impact:** Anyone with the URL can access the admin page and modify seedling presale content
- **Fix:** Add `auth-guard.js` and `api-config.js` includes
- **Status:** FIXING NOW

### C2. Wrong API URL in DeliveryZoneWidget.html
- **File:** `apps_script/DeliveryZoneWidget.html`
- **Line:** 191
- **Wrong ID:** `AKfycbyayQD18LoTXiE16bcG90zEMZlGZGtAgNeWco_528QIrZ_3pCgB5tmleR7NglI1q3No`
- **Impact:** All delivery zone API calls fail silently
- **Status:** FIXING NOW

### C3. Wrong API URL in shopify-capital-tracker.js
- **File:** `mcp-server/shopify-capital-tracker.js`
- **Line:** 45
- **Wrong ID:** `AKfycbzQGqay-b2A97ThL33YSnLa4MBdu_48ReQMXV_ndtvfSzoYVhURlZy5cWbXQ2hDPx2d`
- **Impact:** Shopify capital tracking API calls go to wrong deployment
- **Status:** FIXING NOW

### C4. Wrong API URL in shopify-direct-import.js
- **File:** `mcp-server/shopify-direct-import.js`
- **Line:** 40
- **Wrong ID:** Same as C3
- **Impact:** Shopify direct import API calls go to wrong deployment
- **Status:** FIXING NOW

### C5. 6 doGet Endpoints Reference Undefined `data` Variable
- **File:** `apps_script/MERGED TOTAL.js`
- **Impact:** These endpoints CRASH with `ReferenceError` when called via GET
- **Affected endpoints:**

| Line | Case Label | Passes undefined `data` to |
|------|-----------|---------------------------|
| 15103 | `analyzeEquipmentPhoto` | `analyzeEquipmentPhoto(data)` |
| 15246 | `deleteOrder` | `deleteOrder(data)` |
| 15250 | `deleteCustomer` | `deleteCustomer(data)` |
| 15252 | `updateCustomer` | `updateCustomer(data)` |
| 15446 | `completeSharedTask` | `completeSharedTask(data)` |
| 15448 | `completeSubtask` | `completeSubtask(data)` |

- **Root cause:** `data` is only defined in `doPost` via `JSON.parse(e.postData.contents)`. These cases were likely copy-pasted from doPost without updating the variable reference.
- **Fix:** Replace `data` with `e.parameter` (for GET-appropriate endpoints) or move to doPost (for mutation endpoints like delete/update)
- **Status:** FIXING NOW

### C6. eval() in runFunction Endpoint
- **File:** `apps_script/MERGED TOTAL.js`
- **Impact:** Remote code execution vulnerability if `runFunction` endpoint is accessible
- **Fix:** Replace with explicit function dispatch map (or remove if unused)
- **Status:** NEEDS REVIEW — determining if endpoint is used before removing

### C7. CSRF Protection is Bypassable
- **File:** `apps_script/MERGED TOTAL.js`
- **Impact:** CSRF token check skips validation if token is not included in request — defeats the purpose
- **Fix:** Should reject requests without valid CSRF token, not skip the check
- **Status:** DOCUMENTED — requires careful rollout to avoid breaking existing callers

### C8. Google Maps API Key Exposed
- **File:** `web_app/config.js`
- **Impact:** API key is in plaintext in a file that claims to be gitignored but may be tracked
- **Fix:** Verify it's actually gitignored; restrict key via Google Cloud Console
- **Status:** DOCUMENTED

---

## HIGH ISSUES

### H1. 43 Duplicate Case Statements in doGet (Dead Code)
- **File:** `apps_script/MERGED TOTAL.js` (lines 14114-17596)
- **Impact:** 44 case statements that NEVER execute. Developers may assume they work.
- **Notable:** `getAgentMetrics` appears 3 times — line 14431 (works), line 16497 (dead), line 17468 (dead, calls different function entirely)
- **Full list of 43 duplicates:**

| # | Case Label | Works (line) | Dead (line) |
|---|-----------|-------------|-------------|
| 1 | analyzeOwnerStyle | 14391 | 16437 |
| 2 | createEmailDraft | 14148 | 16409 |
| 3 | dismissAlert | 14348 | 16455 |
| 4 | forecastWorkload | 14409 | 16581 |
| 5 | generateDailyPrescription | 16332 | 16888 |
| 6 | generateProactiveInsights | 14536 | 17141 |
| 7 | getActionQueue | 14203 | 14528 |
| 8 | getActiveAlerts | 14346 | 16453 |
| 9 | getActiveCheckins | 16344 | 16892 |
| 10 | getAgentMetrics | 14431 | 16497, 17468 |
| 11 | getAllBenchmarks | 16324 | 16886 |
| 12 | getAllEmployees | 15430 | 15478 |
| 13 | getAutonomyStatus | 14338 | 16622 |
| 14 | getAvailableAgents | 14429 | 16491 |
| 15 | getBenchmark | 16322 | 16884 |
| 16 | getBenchmarkAccuracy | 16362 | 16904 |
| 17 | getEmployeeEfficiencyTrend | 16360 | 16896 |
| 18 | getEmployeeMessages | 16354 | 16900 |
| 19 | getIntegrationStatus | 14445 | 16071 |
| 20 | getLaborAlerts | 16348 | 16894 |
| 21 | getLaborIntelligenceDashboard | 16366 | 16898 |
| 22 | getLaborMorningBrief | 16336 | 16902 |
| 23 | getMarketingCampaigns | 16006 | 17324 |
| 24 | getMyWorkOrder | 16334 | 16890 |
| 25 | getPredictiveReport | 14411 | 16583 |
| 26 | getProactiveSuggestions | 14330 | 16433 |
| 27 | getSocialListeningDashboard | 14635 | 14770 |
| 28 | getStyleProfile | 14387 | 16439 |
| 29 | getStylePrompt | 14389 | 16441 |
| 30 | getTodaySchedule | 14395 | 16555 |
| 31 | getUltimateMorningBrief | 14318 | 16387 |
| 32 | getWeatherRecommendations | 14443 | 16535 |
| 33 | organizeFile | 14421 | 16505 |
| 34 | parseVoiceCommand | 14439 | 16483 |
| 35 | predictCustomerChurn | 14407 | 16575 |
| 36 | predictEmailVolume | 14405 | 16573 |
| 37 | protectFocusTime | 14399 | 16549 |
| 38 | recallContact | 14326 | 16421 |
| 39 | runAgentTask | 14433 | 16493 |
| 40 | setAutonomyLevel | 14342 | 16620 |
| 41 | testTwilioSMS | 16079 | 16812 |
| 42 | verifyChefToken | 15001 | 15486 |
| 43 | voiceCommand | 14437 | 16391 |

- **Root cause:** File was assembled by merging multiple implementation blocks. Duplicates cluster around line 16000+ suggesting a late-stage merge event.
- **Status:** FIXING NOW — removing dead code duplicates

### H2. 14 Frontend-Backend Action Name Mismatches
- **Impact:** API calls fail silently or return unexpected results

| Frontend Action | Frontend File | Backend Closest Match | Severity |
|----------------|--------------|----------------------|----------|
| `bulkAssignTasks` | manager-dashboard.html | **MISSING** | HIGH |
| `bulkCompleteTasks` | manager-dashboard.html | **MISSING** | HIGH |
| `getRecentBlogPosts` | marketing-command-center.html | **MISSING** | HIGH |
| `assignTask` | chief-of-staff.html | `assignTaskToEmployee` | MEDIUM |
| `deleteTask` | chief-of-staff.html | `deleteUnifiedTask` | MEDIUM |
| `getAlgorithmIntelligence` | marketing-command-center.html | `getAlgorithmIntelligenceDashboard` | MEDIUM |
| `getInstagramAnalytics` | marketing-command-center.html | `getInstagramInsights` | MEDIUM |
| `generateSmartCaption` | marketing-command-center.html | No match | MEDIUM |
| `getChiefOfStaffBriefing` | marketing-command-center.html | `getUltimateMorningBrief` | MEDIUM |
| `getTeamWorkload` | manager-dashboard.html | `getTeamWorkloadBalance` | LOW |
| `getFieldReadings` | satellite-map.html | `getSatelliteReadings` | LOW |
| `getFieldsDashboard` | labels.html | `getFields` | LOW |
| `getBedsWithStatus` | labels.html | `getBeds` | LOW |
| `getRecentCompletedTasks` | marketing-command-center.html | `getTaskStats` | LOW |

- **Status:** DOCUMENTED — needs coordinated frontend+backend fix

### H3. 6 Morning Brief Functions (Should Be 1)
- **File:** `apps_script/MERGED TOTAL.js`
- **Impact:** Maintenance nightmare, inconsistent results depending on which is called
- **Status:** DOCUMENTED — consolidation needed

### H4. 249 Sheet Names with Inconsistencies
- **Impact:** Same data stored under different names creates confusion
- **Examples:** 5 names for harvests, 4 for employees, 3 for customers
- **Status:** DOCUMENTED — needs data architecture review

### H5. api-config.js Loaded Twice in 20 Files
- **Impact:** Minor performance hit, potential for race conditions
- **Status:** DOCUMENTED

### H6. Mixed Content-Type Headers
- **Impact:** Some POST calls use `application/json` (triggers CORS preflight), others use correct `text/plain`
- **Status:** DOCUMENTED

---

## MEDIUM ISSUES

### M1. marketing-command-center.html is 42,000+ Lines
- Single HTML file that is nearly impossible to maintain
- Should be broken into modules

### M2. Seedling Page Duplication (4 Files)
- `web_app/seedling-presale-2026.html` (current, active)
- `web_app/seedling-presale.html` (older version)
- `apps_script/SeedlingPresale.html` (Apps Script version)
- `apps_script/SeedlingPresaleFinal.html` (another version)
- Only the first is actively maintained

### M3. CSA Finder Triplication (3 Files)
- Three versions of CSA finder exist across different directories

### M4. Dual Dashboard Architecture
- `apps_script/` dashboards (served by Apps Script)
- `web_app/` dashboards (served by GitHub Pages)
- Some overlap in functionality

### M5. Missing DATA_CONTRACTS.md
- Referenced as mandatory in CLAUDE.md and integration-watcher.md
- File does not exist
- Should document all data contracts between systems

### M6. Orphaned tinypm_for_tinyseed_os/ Directory
- 76+ files that appear to be an older copy of tinypm
- Diverged from active `tinypm/` directory

### M7. 7 Orphaned JavaScript Files
- JS files not referenced by any HTML file

### M8. 12 Chief of Staff Modules with typeof Guards
- May indicate dead code if the guarded functions don't exist

### M9. TinyPM Completely Disconnected from Main System
- By design, but worth noting — no data flows between TinyPM and main Tiny Seed OS

### M10. Duplicate Legal Pages
- Multiple versions of terms/privacy pages

### M11. Font Inconsistency
- Most files use Inter, a few use system fonts or other fonts

### M12. 10 Files Missing Auth Guard
- 10 of 53 HTML files don't include `auth-guard.js`
- Some may be intentionally public (presale page, etc.)

---

## LOW ISSUES

### L1. Large File Sizes
- `MERGED TOTAL.js`: 146,892 lines
- `marketing-command-center.html`: 42,000+ lines
- These make maintenance difficult but don't break functionality

### L2. Commented-Out Code Throughout
- Old code left in comments rather than removed

### L3. Console.log Statements in Production
- Debug logging left in several frontend files

### L4. Inconsistent Error Handling
- Some endpoints return `{error: 'message'}`, others return `{success: false, message: 'message'}`

### L5. No Automated Test Suite
- No test files for the main Apps Script codebase

### L6. Git Untracked Files Growing
- 50+ untracked files/directories in git status

### L7. Version Management
- Approaching Apps Script version limit (200 max), previously hit this limit

---

## FIXES APPLIED IN THIS AUDIT

| Issue | Fix | Files Modified |
|-------|-----|----------------|
| C1 | Added auth-guard.js to seedling-admin.html | `web_app/seedling-admin.html` |
| C2 | Corrected API URL in DeliveryZoneWidget.html | `apps_script/DeliveryZoneWidget.html` |
| C3 | Corrected API URL in shopify-capital-tracker.js | `mcp-server/shopify-capital-tracker.js` |
| C4 | Corrected API URL in shopify-direct-import.js | `mcp-server/shopify-direct-import.js` |
| C5 | Fixed 6 doGet endpoints referencing undefined `data` | `apps_script/MERGED TOTAL.js` |
| H1 | Removed 44 dead duplicate case statements | `apps_script/MERGED TOTAL.js` |

---

## RECOMMENDED PRIORITY ORDER FOR REMAINING FIXES

1. **C6** — Review and secure `runFunction` endpoint (eval vulnerability)
2. **C7** — Strengthen CSRF protection (careful rollout needed)
3. **C8** — Restrict Google Maps API key
4. **H2** — Fix 14 frontend-backend action name mismatches
5. **H3** — Consolidate morning brief functions to 1
6. **M5** — Create DATA_CONTRACTS.md
7. **M2-M4** — Clean up file duplicates
8. **M6** — Remove or archive orphaned tinypm_for_tinyseed_os/

---

## ARCHITECTURE HEALTH SCORE

| Dimension | Score | Notes |
|-----------|-------|-------|
| API Centralization | 9/10 | 53/53 frontend files use api-config.js; 3 non-frontend files fixed |
| Auth Coverage | 8/10 | 43/53 files; seedling-admin fixed; 9 intentionally public |
| Frontend-Backend Sync | 7/10 | 35+ pairs working; 14 mismatches identified |
| Code Hygiene | 4/10 | 44 dead code duplicates removed; 42K monolith remains |
| Data Architecture | 5/10 | 249 sheet names, 5+ naming conventions for same data |
| Security | 5/10 | Auth good, but CSRF bypassable, eval() exists, API key exposed |
| Test Coverage | 1/10 | No automated tests for main codebase |
| Documentation | 7/10 | CLAUDE.md excellent; missing DATA_CONTRACTS.md |

**Overall System Health: 5.75/10**

The system works and serves real users, but technical debt is accumulating. The critical fixes applied today address the most dangerous issues. The recommended priority list above should guide future cleanup work.

---

*Report generated by PM_Architect audit, February 26, 2026*
