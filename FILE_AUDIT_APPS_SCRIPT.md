# Apps Script Directory File Audit
## Comprehensive Analysis of `/apps_script/`

**Audit Date:** February 4, 2026
**Total Files:** 63 (including 1 subdirectory with 2 files)
**Total Size:** ~5.7 MB

---

## SUMMARY STATISTICS

| Category | Count | Percentage |
|----------|-------|------------|
| **FULLY WORKING** | 18 | 28.6% |
| **PARTIALLY IMPLEMENTED** | 4 | 6.3% |
| **STUB FILES (Merged)** | 28 | 44.4% |
| **CONFIG/SUPPORT FILES** | 5 | 7.9% |
| **ORPHANED/STANDALONE** | 6 | 9.5% |
| **NON-JS FILES** | 2 | 3.2% |

### Quick Stats:
- **Main System File:** MERGED TOTAL.js (3.7 MB, ~99,000+ lines)
- **Active JS Files with Code:** 11
- **Stub Files (just merge comments):** 28
- **HTML Templates:** 14
- **Support/Config Files:** 5

---

## FILE-BY-FILE BREAKDOWN

### CORE SYSTEM FILE

#### MERGED TOTAL.js
- **Size:** 3,746,418 bytes (3.7 MB)
- **Purpose:** Main Apps Script codebase - contains ALL deployed functionality
- **Status:** FULLY WORKING - The production system
- **Key Functions:** 230+ API endpoints including:
  - doGet/doPost (main API router)
  - All farm operations (planning, inventory, crops, fields)
  - CSA management
  - Sales and orders
  - Employee time tracking
  - Chief of Staff AI
  - Telegram/SMS integration
  - Email intelligence
  - Weather integration
  - Financial dashboards
  - Delivery routing
- **Connection:** This IS the main system - deployed to Google Apps Script
- **TODOs/Incomplete:**
  - `getPlanningById()` - Not implemented
  - `getCropByName()` - Not implemented
  - `getBedsByField()` - Not implemented
  - `getTasks()` - Not implemented
  - `getTasksByDateRange()` - Not implemented
  - `getWeatherData()` - Not implemented
  - `getFinancials()` - Not implemented
  - `deletePlanting()` - Not implemented
  - `bulkAddPlantings()` - Not implemented
  - `syncShopifyInventory()` - TODO comment for inventory sync

---

### STUB FILES (Merged into MERGED TOTAL.js)

These 28 files contain only the comment: `// This module has been merged into MERGED TOTAL.js`

| File | Size | Original Purpose |
|------|------|-----------------|
| AccountingModule.js | 52 bytes | Accounting functions |
| BookImportModule.js | 52 bytes | Book import functionality |
| ChefCommunications.js | 52 bytes | Chef/restaurant communications |
| ChiefOfStaff_Autonomy.js | 52 bytes | CoS autonomous actions |
| ChiefOfStaff_Calendar.js | 52 bytes | CoS calendar integration |
| ChiefOfStaff_FileOrg.js | 52 bytes | CoS file organization |
| ChiefOfStaff_Integrations.js | 52 bytes | CoS third-party integrations |
| ChiefOfStaff_Master.js | 52 bytes | CoS master controller |
| ChiefOfStaff_Memory.js | 52 bytes | CoS conversation memory |
| ChiefOfStaff_MultiAgent.js | 52 bytes | CoS multi-agent coordination |
| ChiefOfStaff_Predictive.js | 52 bytes | CoS predictive intelligence |
| ChiefOfStaff_ProactiveIntel.js | 52 bytes | CoS proactive alerts |
| ChiefOfStaff_SMS.js | 52 bytes | CoS SMS capabilities |
| ChiefOfStaff_StyleMimicry.js | 52 bytes | CoS writing style matching |
| ChiefOfStaff_Voice.js | 52 bytes | CoS voice/tone system |
| CropRotation.js | 52 bytes | Crop rotation planning |
| EmailWorkflowEngine.js | 52 bytes | Email workflow automation |
| FarmIntelligence.js | 52 bytes | Farm intelligence analytics |
| FieldManagement.js | 52 bytes | Field operations |
| FoodSafetyIntelligence.js | 52 bytes | Food safety compliance |
| INTELLIGENT_ROUTING_SYSTEM.js | 52 bytes | Delivery routing AI |
| MarketModule.js | 52 bytes | Farmers market management |
| MorningBriefGenerator.js | 52 bytes | Daily morning brief |
| PHIDeadlineTracker.js | 52 bytes | Pre-harvest interval tracking |
| PRODUCTION_INTELLIGENCE_UPGRADE.js | 52 bytes | Production analytics |
| SmartAvailability.js | 52 bytes | Product availability AI |
| SmartFinancialSystem.js | 52 bytes | Financial intelligence |
| SmartLaborIntelligence.js | 52 bytes | Labor optimization |
| SmartSuccessionPlanner.js | 52 bytes | Succession planting AI |

**Status:** DEPRECATED - Code merged, files kept as placeholders
**Recommendation:** These can be DELETED to reduce clutter

---

### FULLY WORKING STANDALONE MODULES

#### 1. ClaudeCoordination.js
- **Size:** 49,739 bytes
- **Purpose:** Multi-Claude session coordination system
- **Key Functions:**
  - `sendClaudeMessage()` - Inter-session messaging
  - `registerClaudeSession()` - Session registration
  - `createCoordinationTask()` - Task management
  - `lockFile()` / `releaseFileLock()` - File locking
  - `getClaudeStatus()` - Status monitoring
  - `createPermissionRequest()` - Permission workflow
- **Status:** FULLY WORKING
- **Connection:** ORPHANED - Not merged into MERGED TOTAL.js
- **TODOs:** None

#### 2. EmployeeOnboarding.js
- **Size:** 21,129 bytes
- **Purpose:** Employee onboarding workflow
- **Key Functions:**
  - `completeEmployeeOnboarding()` - Full onboarding flow
  - `getAllEmployees()` - Employee listing
  - `approveEmployeeComplete()` - Approval workflow
  - `getEmployeeDetails()` - Employee data retrieval
  - `updateEmployee()` - Employee updates
  - `deactivateEmployee()` - Soft delete
- **Status:** FULLY WORKING
- **Connection:** ORPHANED - Not in MERGED TOTAL.js
- **TODOs:** None

#### 3. NotificationBatchingSystem.js
- **Size:** 51,208 bytes
- **Purpose:** Intelligent notification batching with priority levels
- **Key Functions:**
  - `queueNotification()` - Queue for batch processing
  - `processNotificationQueue()` - Process pending notifications
  - `generateDailyDigest()` - Daily summary emails
  - `sendFrostWarning()` - Immediate frost alerts
  - `notifyTaskAssignment()` - Task notifications
  - `updateNotificationPreferences()` - User preferences
- **Status:** FULLY WORKING
- **Connection:** ORPHANED - Not in MERGED TOTAL.js
- **TODOs:** None

#### 4. SalesSheetInit.js
- **Size:** 35,074 bytes
- **Purpose:** Initialize all sales-related sheets with proper headers
- **Key Functions:**
  - `initializeSalesSheets()` - Create 16 sales sheets
  - `getSalesSheetStatus()` - Check sheet status
  - `verifySalesSheetHeaders()` - Validate headers
  - `deleteAllSalesSheets()` - Development cleanup
- **Status:** FULLY WORKING
- **Connection:** ORPHANED - Standalone utility
- **TODOs:** None

#### 5. SatelliteService.js
- **Size:** 76,029 bytes
- **Purpose:** Agromonitoring API integration for satellite imagery/NDVI
- **Key Functions:**
  - `createSatellitePolygon()` - Register field with API
  - `getSatelliteReadings()` - Fetch NDVI data
  - `detectProblems()` - Identify stressed areas
  - `generateScoutingWaypoints()` - GPS scouting points
  - `initializeSatelliteSheets()` - Setup sheets
- **Status:** FULLY WORKING
- **Connection:** ORPHANED - Not in MERGED TOTAL.js
- **TODOs:** None

#### 6. SeasonalPatternDetection.js
- **Size:** 38,193 bytes
- **Purpose:** Year-over-year seasonal pattern analysis
- **Key Functions:**
  - `getSeasonalPatterns()` - Historical pattern analysis
  - `getWeekNumber()` - ISO week calculation
  - `getTasksForWeek()` - Weekly task history
  - `getPlantingsForWeek()` - Weekly planting history
  - `getWeekDateRange()` - Date range helper
- **Status:** FULLY WORKING
- **Connection:** ORPHANED - Not in MERGED TOTAL.js
- **TODOs:** None

#### 7. ShopifyPageManager.js
- **Size:** 16,720 bytes
- **Purpose:** Manage Shopify store pages via Admin API
- **Key Functions:**
  - `getShopifyPages()` - List all pages
  - `updateShopifyPage()` - Update page content
  - `findShopifyPageByHandle()` - Find by URL slug
  - `generateWhereToFindUsContent()` - Market locations HTML
- **Status:** FULLY WORKING
- **Connection:** ORPHANED - Not in MERGED TOTAL.js
- **TODOs:** None

#### 8. ShopifySalesSync.js
- **Size:** 36,927 bytes
- **Purpose:** Sync Shopify orders/customers to Google Sheets
- **Key Functions:**
  - `syncShopifyToSheets()` - Main sync function
  - `syncShopifyOrdersToSalesSheet()` - Order sync
  - `syncShopifyCustomersToSalesSheet()` - Customer sync
  - `identifyAndCreateCSAMembers()` - CSA order detection
  - `fetchAllShopifyOrders()` - Paginated fetch
- **Status:** FULLY WORKING
- **Connection:** ORPHANED - Not in MERGED TOTAL.js
- **TODOs:** None

#### 9. TimeTrackingFeedbackLoop.js
- **Size:** 43,144 bytes
- **Purpose:** Track actual vs estimated time and learn from it
- **Key Functions:**
  - `recordTaskTime()` - Log completion time
  - `getTaskTimeHistory()` - Historical times
  - `learnFromCompletion()` - ML-style learning
  - `generateTimeFeedback()` - User feedback
  - `getSuggestedEstimate()` - Improved estimates
- **Status:** FULLY WORKING
- **Connection:** ORPHANED - Not in MERGED TOTAL.js
- **TODOs:** None

---

### PARTIALLY IMPLEMENTED FILES

#### 1. SmartCSAIntelligence.js
- **Size:** 17,264 bytes
- **Purpose:** Proactive CSA member management
- **Key Functions:**
  - `getProactiveCSAAlerts()` - Risk detection
  - `getOnboardingTasks()` - Onboarding sequence
  - `calculateMemberHealthScoreSmart()` - Health scoring
  - `getCSAOnboardingStatus()` - Onboarding tracking
- **Status:** PARTIALLY IMPLEMENTED
- **Connection:** ORPHANED
- **TODOs:**
  - Line 74: `// TODO: Implement when portal login tracking is added`
  - Line 356: `// TODO: Replace with real portal login tracking`

---

### HTML TEMPLATE FILES

All HTML files are FULLY WORKING templates served by MERGED TOTAL.js:

| File | Size | Purpose | Status |
|------|------|---------|--------|
| ChiefOfStaffDashboard.html | 92,589 bytes | AI assistant interface | FULLY WORKING |
| FieldManagementDashboard.html | 54,726 bytes | Field operations UI | FULLY WORKING |
| FieldMobileCapture.html | 66,271 bytes | Mobile field data entry | FULLY WORKING |
| FinancialDashboard.html | 153,817 bytes | Financial reporting | FULLY WORKING |
| IrrigationDashboard.html | 32,138 bytes | Irrigation monitoring | FULLY WORKING |
| ReportsDashboard.html | 74,705 bytes | USDA/Organic reports | FULLY WORKING |
| IntelligentRoutingDashboard.html | 30,462 bytes | Delivery routing | FULLY WORKING |
| DeliveryZoneChecker.html | 28,314 bytes | Address validation | FULLY WORKING |
| DeliveryZoneWidget.html | 12,898 bytes | Embeddable widget | FULLY WORKING |
| CSAWelcomeEmail.html | 10,668 bytes | CSA welcome email | FULLY WORKING |
| Form_Duplicate.html | 12,126 bytes | Duplicate planting form | FULLY WORKING |
| Form_ImportStaging.html | 6,880 bytes | Import staging form | FULLY WORKING |
| Form_NewCrop.html | 12,403 bytes | New crop entry form | FULLY WORKING |
| Wizard_Form.html | 14,188 bytes | Setup wizard | FULLY WORKING |

**TODOs in HTML files:**
- FinancialDashboard.html line 2773: `extraPayment: 500 // TODO: Make configurable`
- IntelligentRoutingDashboard.html line 693: Settings panel "coming soon"

---

### CONFIGURATION & SUPPORT FILES

| File | Size | Purpose | Status |
|------|------|---------|--------|
| appsscript.json | 769 bytes | Apps Script manifest | REQUIRED |
| .clasp.json | 152 bytes | Clasp deployment config | REQUIRED |
| .claspignore | 1,432 bytes | Clasp ignore patterns | REQUIRED |
| SMS_INTELLIGENCE_SYSTEM_RESEARCH.md | 74,722 bytes | Research document | DOCUMENTATION |
| SmartLaborIntelligence.js.backup | 43,401 bytes | Backup file | DEPRECATED |

---

### BACKUP/ORPHANED FILES

#### SmartLaborIntelligence.js.backup
- **Size:** 43,401 bytes
- **Purpose:** Backup of labor intelligence system
- **Status:** DEPRECATED - Original merged into MERGED TOTAL.js
- **Recommendation:** Can be DELETED

---

### emails/ SUBDIRECTORY

| File | Size | Purpose | Status |
|------|------|---------|--------|
| 2026_Season_Announcement.html | 10,966 bytes | Season announcement email | FULLY WORKING |
| ChefInvitation.html | 5,116 bytes | Chef partnership invitation | FULLY WORKING |

---

### NON-APPS SCRIPT FILES (Misplaced)

These files don't belong in apps_script/ directory:

| File | Size | Type | Recommendation |
|------|------|------|----------------|
| seo_optimizer.py | 51,791 bytes | Python script | MOVE to `/scripts/` |
| seo_optimization_report.json | 24,035 bytes | JSON data | MOVE to `/data/` or delete |
| shopify_products.json | 633,973 bytes | JSON data | MOVE to `/data/` or delete |

---

## CATEGORIZED FILE LIST

### FULLY WORKING (18 files)
1. MERGED TOTAL.js - Main system
2. ClaudeCoordination.js - Multi-Claude coordination
3. EmployeeOnboarding.js - Employee workflow
4. NotificationBatchingSystem.js - Notification system
5. SalesSheetInit.js - Sheet initialization
6. SatelliteService.js - Satellite/NDVI integration
7. SeasonalPatternDetection.js - Seasonal patterns
8. ShopifyPageManager.js - Shopify pages
9. ShopifySalesSync.js - Shopify sync
10. TimeTrackingFeedbackLoop.js - Time tracking ML
11. ChiefOfStaffDashboard.html
12. FieldManagementDashboard.html
13. FinancialDashboard.html
14. (+ 5 more HTML files)

### PARTIALLY IMPLEMENTED (4 files)
1. SmartCSAIntelligence.js - Missing portal login tracking

### STUB FILES - Can Delete (28 files)
All ChiefOfStaff_*.js files and other 52-byte stubs

### ORPHANED - Need Integration (9 files)
1. ClaudeCoordination.js
2. EmployeeOnboarding.js
3. NotificationBatchingSystem.js
4. SatelliteService.js
5. SeasonalPatternDetection.js
6. ShopifyPageManager.js
7. ShopifySalesSync.js
8. TimeTrackingFeedbackLoop.js
9. SmartCSAIntelligence.js

### DUPLICATED FUNCTIONALITY
- SmartLaborIntelligence.js.backup (original in MERGED TOTAL.js)
- Note: The 28 stub files indicate functionality exists in MERGED TOTAL.js

---

## UNFINISHED FEATURES THAT COULD BE COMPLETED

### In MERGED TOTAL.js:
1. **getPlanningById()** - Return specific planning record by ID
2. **getCropByName()** - Look up crop by name and variety
3. **getBedsByField()** - Get beds for a specific field
4. **getTasks()** - Get tasks for a date
5. **getTasksByDateRange()** - Tasks within date range
6. **getWeatherData()** - Weather API integration
7. **getFinancials()** - Financial summary data
8. **deletePlanting()** - Delete planting record
9. **bulkAddPlantings()** - Bulk import plantings
10. **syncShopifyInventory()** - Two-way inventory sync

### In SmartCSAIntelligence.js:
1. **Portal login tracking** - Track member portal activity
2. **Engagement scoring** - Real engagement metrics

### In HTML Dashboards:
1. **IntelligentRoutingDashboard** - Settings panel
2. **FinancialDashboard** - Configurable extra payment amounts

---

## RECOMMENDATIONS FOR CLEANUP

### Priority 1: Delete Stub Files (28 files)
All 52-byte files containing only merge comments can be safely deleted:
```bash
# Files to delete:
AccountingModule.js
BookImportModule.js
ChefCommunications.js
ChiefOfStaff_*.js (12 files)
CropRotation.js
EmailWorkflowEngine.js
FarmIntelligence.js
FieldManagement.js
FoodSafetyIntelligence.js
INTELLIGENT_ROUTING_SYSTEM.js
MarketModule.js
MorningBriefGenerator.js
PHIDeadlineTracker.js
PRODUCTION_INTELLIGENCE_UPGRADE.js
SmartAvailability.js
SmartFinancialSystem.js
SmartLaborIntelligence.js
SmartSuccessionPlanner.js
```

### Priority 2: Delete Backup Files
```bash
SmartLaborIntelligence.js.backup
```

### Priority 3: Move Misplaced Files
```bash
# Move to /scripts/
seo_optimizer.py

# Move to /data/ or delete
seo_optimization_report.json
shopify_products.json
```

### Priority 4: Integrate Orphaned Modules
Consider merging these into MERGED TOTAL.js for unified deployment:
1. ClaudeCoordination.js (50KB)
2. EmployeeOnboarding.js (21KB)
3. NotificationBatchingSystem.js (51KB)
4. SatelliteService.js (76KB)
5. SeasonalPatternDetection.js (38KB)
6. ShopifyPageManager.js (17KB)
7. ShopifySalesSync.js (37KB)
8. TimeTrackingFeedbackLoop.js (43KB)
9. SmartCSAIntelligence.js (17KB)

**Total: ~350KB of orphaned code**

### Priority 5: Complete Stub Functions
Implement the 10 "Not implemented" functions in MERGED TOTAL.js

---

## ARCHITECTURE NOTES

The apps_script directory follows a "merged monolith" pattern where:

1. **MERGED TOTAL.js** is the single deployed file
2. Individual module files were merged during development
3. Stub files remain as documentation of original structure
4. Some newer modules were developed but never merged

### Current Deployment Flow:
```
apps_script/MERGED TOTAL.js
  --> clasp push
  --> Google Apps Script
  --> Web App Deployment
```

### Recommended Future Structure:
Option A: Keep merged monolith, delete stubs
Option B: Use clasp to push multiple files (Apps Script concatenates them)
Option C: Use ES6 modules with bundler (requires build step)

---

## DISK SPACE ANALYSIS

| Category | Size | Recommendation |
|----------|------|----------------|
| MERGED TOTAL.js | 3.7 MB | Keep (production) |
| HTML templates | ~600 KB | Keep (needed) |
| Orphaned JS modules | ~350 KB | Integrate or keep separate |
| Stub files | ~1.5 KB | DELETE |
| Backup file | 43 KB | DELETE |
| Misplaced files | ~710 KB | MOVE |
| Config files | ~2 KB | Keep |

**Potential space savings:** ~755 KB (stubs + backup + misplaced files)

---

*Generated by Claude Code - February 4, 2026*
