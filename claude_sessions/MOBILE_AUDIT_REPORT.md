# MOBILE APP AUDIT REPORT
**Generated**: 2026-01-22
**Audited by**: MOBILE_CLAUDE

---

## SUMMARY

| Metric | Count |
|--------|-------|
| Total Files Audited | 1 (employee.html - the other 2 files don't exist) |
| Total API Calls Found | 76 unique fetch() calls |
| **Working** | ~60 (routed in MERGED TOTAL.js) |
| **BROKEN** | ~16 (SmartLabor + Fleet issues) |

### FILES STATUS
- `/Users/samanthapollack/Documents/TIny_Seed_OS/employee.html` - EXISTS (877KB, comprehensive mobile app)
- `/Users/samanthapollack/Documents/TIny_Seed_OS/mobile.html` - **DOES NOT EXIST**
- `/Users/samanthapollack/Documents/TIny_Seed_OS/field_app_mobile.html` - **DOES NOT EXIST**

**Note**: It appears `employee.html` IS the unified mobile/field app. The other files were likely consolidated into it.

---

## CRITICAL ISSUES (Fix Immediately)

### 1. SMART LABOR INTELLIGENCE MODULE NOT MERGED
**Severity**: CRITICAL
**Impact**: Work Orders, Check-ins, Efficiency Tracking ALL BROKEN

The file `/Users/samanthapollack/Documents/TIny_Seed_OS/apps_script/SmartLaborIntelligence.js` (1,483 lines) contains essential functions but they are **NOT included in MERGED TOTAL.js**.

**Broken API calls in employee.html**:
| Line | API Action | Status |
|------|-----------|--------|
| 13445 | `getMyWorkOrder` | BROKEN - function exists in SmartLaborIntelligence.js but NOT in MERGED TOTAL.js |
| 13751 | `getEmployeeEfficiencyTrend` | BROKEN - same issue |
| 13792 | `getEmployeeMessages` | BROKEN - same issue |
| 13804 | `markMessageRead` | BROKEN - same issue |
| (various) | `checkInTask` | BROKEN - function not merged |
| (various) | `checkOutTask` | BROKEN - function not merged |

**The routing EXISTS in MERGED TOTAL.js (lines 2212-2245)** but uses `typeof` checks that return "Not available" because the functions don't exist:
```javascript
case 'getMyWorkOrder':
  return jsonResponse(typeof getMyWorkOrder === 'function' ? getMyWorkOrder(...) : { error: 'Not available' });
```

**FIX REQUIRED**: Append SmartLaborIntelligence.js content to MERGED TOTAL.js or run clasp push to merge it.

---

### 2. FLEET API USES DIFFERENT DEPLOYMENT URL
**Severity**: HIGH
**Impact**: Tractor mode may be disconnected from main system

```javascript
// Line 15015 in employee.html
const FLEET_API_URL = 'https://script.google.com/macros/s/AKfycbxkBTDNjrQJJS4ioZpqd2BC1LNLPVUsmAoYAlh2I4apIuoi3MmBoEb4E54kVYNhEd0RBA/exec';
```

This is a DIFFERENT URL from the main API:
```javascript
// Line 12011 in employee.html
API_URL: 'https://script.google.com/macros/s/AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc/exec'
```

**Questions to verify**:
- Is FLEET_API_URL a separate deployment or deprecated?
- Should fleet functions be consolidated into main API?

---

## BY FILE

### employee.html (877KB, 22,500+ lines)
**Location**: `/Users/samanthapollack/Documents/TIny_Seed_OS/employee.html`

#### API Configuration
- **Main API URL**: `https://script.google.com/macros/s/AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc/exec`
- **Fleet API URL**: `https://script.google.com/macros/s/AKfycbxkBTDNjrQJJS4ioZpqd2BC1LNLPVUsmAoYAlh2I4apIuoi3MmBoEb4E54kVYNhEd0RBA/exec`

#### WORKING API Calls (60+)
These actions are properly routed in MERGED TOTAL.js:

| Action | Backend Function | Status |
|--------|------------------|--------|
| `authenticateEmployee` | Line 22858 | WORKING |
| `registerEmployee` | Line 23021 | WORKING |
| `getPendingRegistrations` | Line 23135 | WORKING |
| `approveRegistration` | Line 23171 | WORKING |
| `rejectRegistration` | Line 23273 | WORKING |
| `clockIn` | Line 23393 | WORKING |
| `clockOut` | Line 23446 | WORKING |
| `getMorningBrief` | Line 57538 (getMorningBriefFast) | WORKING |
| `getEmployeeTasks` | Line 23871 | WORKING |
| `getDeliveryRoute` | Line 20128 (getDeliveryRoutes) | WORKING |
| `completeDelivery` | Line 20403 | WORKING |
| `updateDeliveryStopStatus` | Line 20899 | WORKING |
| `getTimesheet` | Line 23516 | WORKING |
| `syncToQuickBooks` | Line 23633 | WORKING |
| `chatWithChiefOfStaff` | Line 103 | WORKING |
| `getPickListForToday` | Line 25824 | WORKING |
| `completeSharedTask` | Line 24068 | WORKING |
| `completeSubtask` | Line 24166 | WORKING |
| `getRequiredInspections` | Line 54390 | WORKING |
| `getGroundhogDens` | Line 26144 | WORKING |
| `getDamageReports` | Line 26255 | WORKING |
| `getActiveHazards` | Line 24555 | WORKING |
| `getCrewMessages` | Line 24693 | WORKING |
| `getPlanningData` | Line 4801 | WORKING |
| `getFields` | Line 25724 | WORKING |
| `getHarvests` | Line 7288 | WORKING |
| `getFuelLog` | Line 13047 | WORKING |
| `updateEmployeeLanguage` | Line 25786 | WORKING |
| `getDeliveryCount` | Line 23784 | WORKING |

#### BROKEN API Calls (16)
These are called from employee.html but functions don't exist in MERGED TOTAL.js:

| Action | Called From Line | Issue |
|--------|------------------|-------|
| `getMyWorkOrder` | 13445 | NOT IN MERGED TOTAL - returns "Not available" |
| `getEmployeeEfficiencyTrend` | 13751 | NOT IN MERGED TOTAL - returns "Not available" |
| `getEmployeeMessages` | 13792 | NOT IN MERGED TOTAL - returns "Not available" |
| `markMessageRead` | 13804 | NOT IN MERGED TOTAL - returns "Not available" |
| `checkInTask` | Various | NOT IN MERGED TOTAL - returns "Not available" |
| `checkOutTask` | Various | NOT IN MERGED TOTAL - returns "Not available" |
| Fleet POST operations | 15181, 15256, 15574, 15618, 15666 | Uses separate FLEET_API_URL |

---

## SMART LABOR STATUS

### SmartLaborIntelligence.js Analysis

**File Location**: `/Users/samanthapollack/Documents/TIny_Seed_OS/apps_script/SmartLaborIntelligence.js`
**Size**: 43,401 bytes, 1,483 lines
**Last Modified**: 2026-01-22 23:12

**Functions Defined in SmartLaborIntelligence.js** (NOT in MERGED TOTAL.js):
1. `initializeSmartLaborSheets()` - Creates LABOR_BENCHMARKS, WORK_PRESCRIPTIONS, LABOR_CHECKINS, LABOR_ALERTS, LABOR_LEARNING sheets
2. `getBenchmark()` - Get speed standards for task types
3. `setBenchmark()` - Set custom benchmarks
4. `getAllBenchmarks()` - Admin view of all benchmarks
5. `updateBenchmark()` - Modify existing benchmark
6. `generateDailyPrescription()` - AI work order generation
7. `getMyWorkOrder()` - Employee-facing daily prescription
8. `checkInTask()` - Start task with time estimate
9. `checkOutTask()` - Complete task, calculate efficiency
10. `getActiveCheckins()` - Get current active tasks
11. `createLaborAlert()` - Create efficiency alerts
12. `getLaborAlerts()` - Get active alerts
13. `acknowledgeLaborAlert()` - Mark alert handled
14. `sendEmployeeMessage()` - Send message to employee
15. `getEmployeeMessages()` - Get unread messages
16. `markMessageRead()` - Mark message as read
17. `getEmployeeEfficiencyTrend()` - Get performance history
18. `getBenchmarkAccuracy()` - Analyze benchmark quality
19. `getLaborIntelligenceDashboard()` - Full dashboard data
20. `getLaborMorningBrief()` - Employee morning brief with work order

### Routing Status
The doGet switch cases EXIST in MERGED TOTAL.js (lines 2196-2245) but they use `typeof` guards:
```javascript
case 'getMyWorkOrder':
  return jsonResponse(typeof getMyWorkOrder === 'function' ? getMyWorkOrder(...) : { error: 'Not available' });
```

Since the functions aren't actually defined in MERGED TOTAL.js, they return `{ error: 'Not available' }`.

### Work Order Feature Status: BROKEN
- Daily prescriptions: NOT WORKING (function not merged)
- Check-in/check-out: NOT WORKING (function not merged)
- Efficiency tracking: NOT WORKING (function not merged)
- Employee messages: NOT WORKING (function not merged)

---

## RECOMMENDED FIXES

### FIX 1: Merge SmartLaborIntelligence.js into MERGED TOTAL.js (CRITICAL)

**Option A - Manual Merge**:
Append the entire contents of SmartLaborIntelligence.js to MERGED TOTAL.js, then redeploy.

**Option B - Clasp Push**:
If using clasp, ensure SmartLaborIntelligence.js is in the apps_script directory and run:
```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS/apps_script
clasp push
```

Then create a new deployment version in Apps Script console.

### FIX 2: Consolidate Fleet API (RECOMMENDED)

The Fleet functions should be added to the main API instead of a separate deployment:
1. Add fleet handlers to doGet/doPost in MERGED TOTAL.js
2. Update employee.html to use CONFIG.API_URL instead of FLEET_API_URL
3. Remove the separate Fleet deployment

### FIX 3: Verify API Deployment Version

Ensure the latest MERGED TOTAL.js is deployed:
1. Go to Apps Script console
2. Deploy > Manage deployments
3. Create new version
4. Update API URL in employee.html if needed

### FIX 4: Test After Fixes

After merging, test these endpoints:
```
GET ?action=initializeSmartLabor
GET ?action=getMyWorkOrder&employeeId=EMP-001
GET ?action=getEmployeeEfficiencyTrend&employeeId=EMP-001&days=7
GET ?action=getEmployeeMessages&employeeId=EMP-001
```

---

## APPENDIX: All API Calls in employee.html

### Using CONFIG.API_URL (Main API)
| Line | Method | Action |
|------|--------|--------|
| 12556 | POST | Generic POST |
| 12565 | GET | Generic GET |
| 12887 | GET | authenticateEmployee |
| 13000 | POST | registerEmployee |
| 13037 | GET | getPendingRegistrations |
| 13101 | POST | approveRegistration |
| 13135 | POST | rejectRegistration |
| 13294 | GET | (various params) |
| 13358 | GET | getMorningBrief |
| 13445 | GET | getMyWorkOrder |
| 13558 | GET | (various params) |
| 13650 | GET | (various params) |
| 13751 | GET | getEmployeeEfficiencyTrend |
| 13792 | GET | getEmployeeMessages |
| 13804 | GET | markMessageRead |
| 13946 | GET | clockIn |
| 13966 | GET | clockOut |
| 14225 | GET | getDeliveryRoute |
| 14384 | POST | completeDelivery |
| 14436 | POST | updateDeliveryStopStatus |
| 14601 | POST | (various) |
| 14722 | POST | (various) |
| 14955 | POST | (various) |
| 15357 | POST | (various) |
| 15422 | GET | getFuelLog |
| 16247 | GET | (various params) |
| 16335 | GET | (various params) |
| 16513 | GET | updateEmployeeLanguage |
| 16561 | GET | (various params) |
| 16736 | GET | (various params) |
| 16892 | GET | (various params) |
| 17117 | GET | (various params) |
| 17705 | GET | (various params) |
| 17747 | POST | completeSharedTask |
| 17801 | POST | completeSubtask |
| 17936 | GET | (various params) |
| 18085 | GET | getEmployeeTasks |
| 18095 | GET | getPlanningData |
| 18105 | GET | getFields |
| 18180 | GET | getHarvests |
| 19010 | GET | getRequiredInspections |
| 19269 | GET | (various params) |
| 19312 | GET | (various params) |
| 19335 | GET | getGroundhogDens |
| 19388 | GET | (various params) |
| 19410 | GET | getDamageReports |
| 19533 | GET | getPickListForToday |
| 19615 | GET | (various params) |
| 19694 | GET | (various params) |
| 19815 | POST | (various) |
| 19855 | GET | (various params) |
| 20008 | GET | (various params) |
| 20052 | GET | (various params) |
| 20121 | GET | getActiveHazards |
| 20164 | GET | (various params) |
| 20262 | GET | (various params) |
| 20378 | GET | (various params) |
| 20425 | GET | getCrewMessages |
| 20465 | GET | (various params) |
| 20663 | GET | getDeliveryRoute |
| 20743 | GET | getDeliveryCount |
| 20944 | POST | (various) |
| 21028 | POST | (various) |
| 21174 | POST | completeDelivery |
| 21243 | GET | getTimesheet |
| 21420 | POST | syncToQuickBooks |
| 22162 | GET | chatWithChiefOfStaff |
| 22475 | GET | chatWithChiefOfStaff |

### Using FLEET_API_URL (Separate Fleet Deployment)
| Line | Method | Purpose |
|------|--------|---------|
| 15029 | GET | Load fleet data |
| 15181 | POST | usage_start |
| 15256 | POST | usage_end |
| 15574 | POST | fuel_log |
| 15618 | POST | breakdown_report |
| 15666 | POST | maintenance_log |

---

## CONCLUSION

**The mobile employee app (employee.html) is 80% functional.** The main issues are:

1. **SmartLaborIntelligence.js is not merged** - This breaks the new work order/check-in features that were recently developed
2. **Fleet API uses separate deployment** - This may cause sync issues

**Priority Actions**:
1. MERGE SmartLaborIntelligence.js into MERGED TOTAL.js immediately
2. Redeploy the Apps Script web app
3. Test the Smart Labor features
4. Consider consolidating Fleet API into main deployment

---

*Report generated by MOBILE_CLAUDE*
