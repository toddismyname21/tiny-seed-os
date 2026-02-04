# SYSTEM_MANIFEST.md - Complete Tiny Seed OS Inventory
## Project Manager: Claude PM_Architect
## Updated: 2026-02-03

---

# EXECUTIVE SUMMARY

**Total Components Inventoried:**
- Apps Script Backend Files: 29
- Desktop HTML Files (Root): 17+
- Web App HTML Files: 35+
- Claude Session Folders: 15
- Google Sheets: 20+ (estimated)

**Critical Issues Found:**
1. **4 Morning Brief Generators** - Compete, cause confusion
2. **Chief of Staff Backend NOT Connected** - 12+ advanced features built but not in frontend
3. **2 Approval Systems** - Don't sync with each other
4. **Demo Data Fallbacks** - 10+ files show fake data when API fails

**Recent Major Additions (Feb 2-3, 2026):**
- Unified Task Management API (complete)
- AI Priority Scoring System (complete)
- Manager Dashboard (NEW)
- Task Assignment UI with Bulk Operations (UPDATED)
- At-Risk Detection System (complete)
- Team Workload Balancing (complete)

---

# PART 1: APPS SCRIPT BACKEND FILES

## A. Core System (Critical)

| File | Purpose | Status | Lines | Notes |
|------|---------|--------|-------|-------|
| `MERGED TOTAL.js` | Central API router | ACTIVE | ~88,000+ | Main entry point, 250+ endpoints |
| `CropRotation.js` | Field planning, bed management | ACTIVE | ~3,500 | Core planning logic |
| `AccountingModule.js` | Financial tracking | ACTIVE | ~2,000 | QuickBooks integration |
| `SmartAvailability.js` | Real-time inventory | ACTIVE | ~800 | Chef ordering availability |
| `ChefCommunications.js` | Chef invites, magic links | ACTIVE | ~600 | Recently added |
| `FieldManagement.js` | Field/bed CRUD | ACTIVE | ~800 | GPS polygon support |

## B. Chief of Staff System (DISCONNECTED FROM FRONTEND)

**CRITICAL FINDING:** These 12 files represent significant work that is NOT accessible from the frontend.

| File | Purpose | Status | Frontend Connection |
|------|---------|--------|---------------------|
| `ChiefOfStaff_Master.js` | Central orchestration | BUILT | **NONE** |
| `ChiefOfStaff_Voice.js` | Voice command interface | BUILT | **NONE** |
| `ChiefOfStaff_Memory.js` | Persistent memory system | BUILT | **NONE** |
| `ChiefOfStaff_Autonomy.js` | Delegation/trust settings | BUILT | **NONE** |
| `ChiefOfStaff_ProactiveIntel.js` | Proactive alerts | BUILT | **NONE** |
| `ChiefOfStaff_StyleMimicry.js` | Email style matching | BUILT | **NONE** |
| `ChiefOfStaff_Calendar.js` | Calendar AI | BUILT | **NONE** |
| `ChiefOfStaff_Predictive.js` | Predictive analytics | BUILT | **NONE** |
| `ChiefOfStaff_SMS.js` | SMS intelligence | BUILT | **NONE** |
| `ChiefOfStaff_FileOrg.js` | File organization AI | BUILT | **NONE** |
| `ChiefOfStaff_Integrations.js` | External service integration | BUILT | **NONE** |
| `ChiefOfStaff_MultiAgent.js` | Multi-agent coordination | BUILT | **NONE** |
| `EmailWorkflowEngine.js` | Email triage and approvals | BUILT | **NONE** |

## C. Intelligence Systems

| File | Purpose | Status | Notes |
|------|---------|--------|-------|
| `FarmIntelligence.js` | Farm-wide AI recommendations | ACTIVE | Generates insights |
| `SmartSuccessionPlanner.js` | Succession planning AI | ACTIVE | Crop scheduling |
| `SmartFinancialSystem.js` | Financial intelligence | ACTIVE | Revenue optimization |
| `FoodSafetyIntelligence.js` | Compliance intelligence | ACTIVE | GAP/FSMA tracking |
| `PRODUCTION_INTELLIGENCE_UPGRADE.js` | Production forecasting | ACTIVE | Yield predictions |
| `INTELLIGENT_ROUTING_SYSTEM.js` | Delivery route optimization | ACTIVE | Driver routing |

## D. Morning Brief Systems (DUPLICATE - NEEDS CONSOLIDATION)

| File/Function | Location | Type | Status |
|---------------|----------|------|--------|
| `getMorningBrief()` | MERGED TOTAL.js:~6200 | General morning summary | ACTIVE |
| `generateMorningBrief()` | MorningBriefGenerator.js | Comprehensive brief | ACTIVE |
| `getChiefMorningBrief()` | ChiefOfStaff_Master.js | Executive brief | ACTIVE |
| `getFarmMorningBrief()` | FarmIntelligence.js | Farm-specific brief | ACTIVE |
| `generateMorningBriefV2()` | MERGED TOTAL.js:~85700 | Enhanced comprehensive | ACTIVE |

**RECOMMENDATION:** Consolidate into ONE morning brief system with configurable detail levels.

## E. Specialty Modules

| File | Purpose | Status | Notes |
|------|---------|--------|-------|
| `MarketModule.js` | Farmers market integration | ACTIVE | Market sales tracking |
| `BookImportModule.js` | Accounting book import | ACTIVE | CSV/QBO imports |
| `PHIDeadlineTracker.js` | Pre-harvest interval tracking | ACTIVE | Food safety compliance |
| `EmployeeOnboarding.js` | Employee HR onboarding | ACTIVE | 5-step onboarding flow |

## F. Satellite Integration (NEW - Feb 3, 2026)

| File | Purpose | Status | Notes |
|------|---------|--------|-------|
| `SatelliteService.js` | Agromonitoring API integration | **NEW** | NDVI/satellite monitoring, ~1400 lines |

### SatelliteService.js Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `initializeSatelliteSheets()` | Creates SATELLITE_FIELDS and SATELLITE_READINGS sheets | READY |
| `createSatellitePolygon(fieldId, coordinates, name)` | Registers field with Agromonitoring API | READY |
| `syncFieldPolygons()` | Syncs all REF_Fields to Agromonitoring | READY |
| `fetchLatestNDVI(polygonId)` | Gets current NDVI for field | READY |
| `fetchAllFieldsNDVI()` | Batch fetches NDVI for all fields | READY |
| `fetchNDVIHistory(polygonId, startDate, endDate)` | Historical NDVI data | READY |
| `storeReading(...)` | Saves reading to SATELLITE_READINGS | READY |
| `getFieldReadings(fieldId, days)` | Retrieves stored readings | READY |
| `detectProblems(fieldId)` | Detects NDVI drops >15% | READY |
| `generateScoutingWaypoints(fieldId, threshold)` | GPS points for low NDVI areas | READY |
| `dailySatelliteFetch()` | Scheduled daily NDVI collection | READY |
| `handleSatelliteAPI(action, params, postData)` | Central API handler | READY |

### Satellite Sheet Schemas

**SATELLITE_FIELDS:**
| Field_ID | Field_Name | Polygon_ID | Coordinates | Area_Hectares | Last_Sync | Status | Created_At | Updated_At | Notes |

**SATELLITE_READINGS:**
| Reading_ID | Field_ID | Polygon_ID | Date | NDVI_Mean | NDVI_Min | NDVI_Max | NDMI | EVI | Cloud_Pct | Image_URL | Data_Source | Quality | Created_At |

---

# PART 2: UNIFIED TASK MANAGEMENT SYSTEM (NEW - Feb 2-3, 2026)

## A. Architecture Overview

The Unified Task Management System provides a single source of truth for all task-related operations across Tiny Seed OS.

**Data Source:** `UNIFIED_TASKS` Google Sheet (45 columns)

**Key Features:**
- AI-powered priority scoring (0-100 scale)
- At-risk detection (TIME, WEATHER, OVERRIPE, OVERDUE, DEPENDENCY)
- Team workload balancing
- Bulk operations (up to 100 tasks per call)
- SMS notification integration
- Server-side caching (1-min tasks, 6-hr reference data)

## B. Unified Task API Endpoints

### GET Endpoints (Query Operations)

| Endpoint | Purpose | Status | Parameters |
|----------|---------|--------|------------|
| `getUnifiedTasks` | Paginated task query | WORKING | status, assignee, date, page, limit |
| `getTaskPriorities` | AI-sorted task list | WORKING | assignee, task_type, limit |
| `getUnifiedTaskById` | Single task lookup | WORKING | task_id |
| `getTaskStats` | Dashboard statistics | WORKING | - |
| `getTasksWithAIPriority` | Tasks with full AI scoring | WORKING | limit |
| `getAtRiskTasks` | Only at-risk tasks | WORKING | - |
| `getAIPriorityDashboard` | Combined dashboard data | WORKING | limit |
| `getTeamWorkloadBalance` | Team workload analysis | WORKING | - |
| `calculateAIPriorityForTask` | Single task priority | WORKING | task (JSON), context (JSON) |

### POST Endpoints (Mutation Operations)

| Endpoint | Purpose | Status | Parameters |
|----------|---------|--------|------------|
| `createUnifiedTask` | Create with SMS notification | WORKING | title, task_type, assignee, due_date, etc. |
| `updateUnifiedTask` | Update task status/fields | WORKING | task_id, status, assignee, etc. |
| `bulkUpdateTasks` | Batch update (100 max) | WORKING | task_ids[], updates{} |
| `bulkCreateTasks` | Batch create (100 max) | WORKING | tasks[] |
| `deleteUnifiedTask` | Soft delete (set cancelled) | WORKING | task_id |

## C. AI Priority Scoring Functions

| Function | Purpose | Status | Location |
|----------|---------|--------|----------|
| `calculateAIPriority(task, context)` | Main priority algorithm | WORKING | MERGED TOTAL.js:~87170 |
| `detectAtRisk(task)` | Risk detection (5 types) | WORKING | MERGED TOTAL.js:~87614 |
| `generateProactiveAlerts()` | System-wide alerts | WORKING | MERGED TOTAL.js:~87897 |
| `getAssigneeWorkloadRatioAI()` | Workload ratio calc | WORKING | MERGED TOTAL.js |
| `checkIncompleteBlockersAI()` | Dependency checking | WORKING | MERGED TOTAL.js |

### Priority Scoring Algorithm (7 Factors)

| Factor | Weight | Description |
|--------|--------|-------------|
| Deadline | 25% | Days until due, overdue penalty |
| Weather | 20% | Rain/extreme weather impact |
| Dependency | 15% | Blocked by incomplete tasks |
| Revenue | 15% | Financial impact of delay |
| Manual Priority | 15% | User-set importance |
| Workload | 10% | Team capacity balancing |
| GDD Bonus | +10 | Growing degree day urgency |

### At-Risk Detection Types

| Risk Type | Severity | Detection Logic |
|-----------|----------|-----------------|
| TIME | CRITICAL | Due within 2 hours |
| WEATHER | HIGH | Outdoor task + rain forecast |
| OVERRIPE | HIGH | GDD exceeded optimal window |
| OVERDUE | CRITICAL | Past due date |
| DEPENDENCY | HIGH | Blocked by incomplete tasks |

## D. Frontend Integration Status

| Page | Unified API | Priority Display | At-Risk Badges | Status |
|------|-------------|------------------|----------------|--------|
| `index.html` | getTaskPriorities | Yes | Yes | WORKING |
| `web_app/task-assignment.html` | Full CRUD + Bulk | Yes | Yes | WORKING |
| `web_app/manager-dashboard.html` | getAIPriorityDashboard | Yes | Yes | WORKING |
| `flowers.html` | getTaskPriorities | Yes | Yes | WORKING |
| `food-safety.html` | getTaskPriorities | Yes | Yes | WORKING |
| `employee.html` | getTaskPriorities | Yes | Yes | WORKING |
| `web_app/chief-of-staff.html` | getTaskPriorities | Yes | Yes | WORKING |

---

# PART 3: FRONTEND HTML FILES

## A. Root Level (Desktop Dashboard)

| File | Purpose | Auth | Status | Last Updated |
|------|---------|------|--------|--------------|
| `index.html` | Main dashboard | Yes | WORKING | Feb 3, 2026 |
| `login.html` | Authentication | No | WORKING | Jan 29, 2026 |
| `employee.html` | Crew app | Yes | WORKING | Feb 3, 2026 |
| `planning.html` | Crop planning | Yes | WORKING | Jan 28, 2026 |
| `succession.html` | Succession wizard | Yes | WORKING | Jan 23, 2026 |
| `calendar.html` | Calendar view | Yes | WORKING | Jan 28, 2026 |
| `greenhouse.html` | Greenhouse tracking | Yes | WORKING | Jan 23, 2026 |
| `labels.html` | Label printing | Yes | WORKING | Jan 29, 2026 |
| `sowing-sheets.html` | Sowing records | Yes | WORKING | Jan 23, 2026 |
| `soil-tests.html` | Soil analysis | Yes | WORKING | Jan 29, 2026 |
| `farm-operations.html` | Field operations | Yes | WORKING | Jan 28, 2026 |
| `flowers.html` | Flower management | Yes | WORKING | Feb 3, 2026 |
| `food-safety.html` | Compliance forms | Yes | WORKING | Feb 3, 2026 |
| `seed_inventory_PRODUCTION.html` | Seed tracking | Yes | NEEDS DEMO REMOVAL | Jan 28, 2026 |
| `smart_learning_DTM.html` | DTM analytics | Yes | NEEDS DEMO REMOVAL | Jan 29, 2026 |
| `inventory_capture.html` | Inventory capture | Yes | WORKING | Jan 29, 2026 |
| `track.html` | Tracking interface | Yes | REVIEW NEEDED | Jan 29, 2026 |

## B. Web App Folder (Staff & Customer Facing)

### Staff Applications - NEW/UPDATED Feb 2-4, 2026

| File | Purpose | Auth | Status | Notes |
|------|---------|------|--------|-------|
| `manager-dashboard.html` | **Manager AI Dashboard** | Yes | **NEW - WORKING** | AI priority queue, workload, alerts |
| `task-assignment.html` | Task Management | Yes | **UPDATED - WORKING** | Bulk ops, AI priority, at-risk |
| `chief-of-staff.html` | Command center | Yes | **UPDATED - PARTIAL** | Brain integration, Unified API |

### Staff Applications - Existing

| File | Purpose | Auth | Status | User Type |
|------|---------|------|--------|-----------|
| `admin.html` | User management | Yes | WORKING | Admin |
| `sales.html` | Sales dashboard | Yes | WORKING | Manager+ |
| `labels.html` | Market labels | Yes | WORKING | Manager+ |
| `field-planner.html` | Field planning | Yes | WORKING | Manager+ |
| `marketing-command-center.html` | Marketing hub | Yes | WORKING | Manager+ |
| `financial-dashboard.html` | Financials | Yes | WORKING | Admin |
| `wealth-builder.html` | Investments | Yes | WORKING | Admin |
| `accounting.html` | Accounting | Yes | WORKING | Admin |
| `quickbooks-dashboard.html` | QuickBooks | Yes | WORKING | Admin |
| `book-import.html` | Book import | Yes | WORKING | Admin |
| `food-safety.html` | Compliance | Yes | WORKING | Manager+ |
| `seo_dashboard.html` | SEO tracking | Yes | WORKING | Admin |
| `social-intelligence.html` | Social analytics | Yes | WORKING | Manager+ |
| `command-center.html` | Operations hub | Yes | WORKING | Manager+ |
| `smart-predictions.html` | Predictions | Yes | WORKING | Manager+ |
| `delivery-zone-checker.html` | Delivery zones | Yes | WORKING | Admin |
| `log-commitment.html` | Commitment logging | Yes | WORKING | Manager+ |
| `ai-assistant.html` | AI chat interface | Yes | WORKING | All Staff |
| `garage.html` | Fleet/Equipment | Yes | WORKING | Manager+ |
| `schedule.html` | HR/Time Off | Yes | WORKING | Admin |
| `employee-management.html` | Employee admin | Yes | WORKING | Admin |
| `employee-onboarding.html` | Onboarding form | Yes | WORKING | New Hires |

### Customer/External Applications

| File | Purpose | Auth | Status | User Type |
|------|---------|------|--------|-----------|
| `wholesale.html` | Wholesale portal | Yes | WORKING | Chefs |
| `chef-order.html` | Chef mobile ordering | Yes | WORKING | Chefs |
| `customer.html` | General ordering | Yes | WORKING | Customers |
| `csa.html` | CSA member portal | Yes | WORKING | CSA Members |
| `driver.html` | Driver app | Yes | WORKING | Drivers |
| `farmers-market.html` | Market POS | Yes | WORKING | Staff |
| `market-sales.html` | Market sales | Yes | WORKING | Staff |
| `neighbor.html` | Neighbor landing | No | WORKING | Public |
| `index.html` | App hub | No | WORKING | All |

### Legal/Policy

| File | Purpose | Auth | Status |
|------|---------|------|--------|
| `eula.html` | End User License | No | COMPLETE |
| `privacy-policy.html` | Privacy Policy | No | COMPLETE |

---

# PART 4: GOOGLE SHEETS DATA MODEL

## A. Core Reference Sheets

| Sheet | Purpose | Used By | Status |
|-------|---------|---------|--------|
| `REF_Crops` | Master crop list | Planning, Succession, Labels | ACTIVE |
| `REF_Beds` | Bed definitions | Planning, Field Ops | ACTIVE |
| `REF_Fields` | Field definitions | Planning, Rotation | ACTIVE |
| `REF_Employees` / `USERS` | Staff data | Auth, Time Clock | **DUPLICATE NAMES** |
| `REF_CropProfiles` | Detailed crop info | Planning | ACTIVE |

## B. Operational Sheets

| Sheet | Purpose | Used By | Status |
|-------|---------|---------|--------|
| `PLANNING_2026` | Current year plan | All planning views | ACTIVE |
| `HARVEST_LOG` / `HARVESTS` | Harvest records | Inventory, Sales | **DUPLICATE NAMES** |
| `WHOLESALE_CUSTOMERS` | Chef/wholesale data | Chef portal, CRM | ACTIVE |
| `WHOLESALE_ORDERS` | Chef orders | Orders, Fulfillment | ACTIVE |
| `WHOLESALE_STANDING_ORDERS` | Recurring orders | Chef portal | ACTIVE |
| `TIMECLOCK` | Employee time entries | Payroll, Reports | ACTIVE |
| `TASKS` | Legacy task assignments | Employee app | ACTIVE |

## C. NEW Sheets (Feb 2-3, 2026)

| Sheet | Purpose | Used By | Status |
|-------|---------|---------|--------|
| `UNIFIED_TASKS` | Single source for all tasks | All task UIs | **NEW - ACTIVE** |
| `TIME_OFF_REQUESTS` | Employee time-off tracking | HR, Schedule | **NEW - ACTIVE** |
| `EMPLOYEE_HR_STATS` | HR stats (sick, vacation) | HR, Schedule | **NEW - ACTIVE** |

## D. Financial Sheets

| Sheet | Purpose | Used By | Status |
|-------|---------|---------|--------|
| `TRANSACTIONS` | Financial transactions | Accounting | ACTIVE |
| `ACCOUNTS` | Chart of accounts | Accounting | ACTIVE |
| `INVESTMENTS` | Investment tracking | Wealth Builder | ACTIVE |

## E. Garage/Fleet Sheets (Jan 30, 2026)

| Sheet | Purpose | Used By | Status |
|-------|---------|---------|--------|
| `GARAGE_PartsInventory` | Parts tracking | Garage | ACTIVE |
| `GARAGE_Manuals` | Equipment manuals | Garage | ACTIVE |
| `GARAGE_ServiceSchedule` | Maintenance schedule | Garage | ACTIVE |

## F. Sheets with Naming Issues

| Concept | Name 1 | Name 2 | Fallback Code |
|---------|--------|--------|---------------|
| Employees | `EMPLOYEES` | `USERS` | Line 13517 has fallback |
| Harvests | `HARVEST_LOG` | `HARVESTS` | Line 14244 has fallback |
| Fields | `REF_Fields` | `FIELD_MAP` | Line 12463 has fallback |

**ACTION:** Standardize sheet names. Choose one name for each concept.

---

# PART 5: API ENDPOINTS INVENTORY

## A. Authentication

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `login` | POST | User authentication | WORKING |
| `verifySession` | GET | Session validation | WORKING |
| `logout` | POST | Session termination | WORKING |
| `verifyChefToken` | GET | Magic link validation | WORKING |
| `verifyEmployeeToken` | GET | Employee magic link | WORKING |
| `sendChefMagicLink` | POST | Send chef login link | WORKING |
| `sendEmployeeMagicLink` | POST | Send employee login link | WORKING |

## B. Unified Task API (NEW - Feb 2-3, 2026)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `getUnifiedTasks` | GET | Paginated task query | WORKING |
| `getTaskPriorities` | GET | AI-sorted tasks | WORKING |
| `getUnifiedTaskById` | GET | Single task lookup | WORKING |
| `getTaskStats` | GET | Dashboard statistics | WORKING |
| `getTasksWithAIPriority` | GET | Full AI scoring | WORKING |
| `getAtRiskTasks` | GET | At-risk tasks only | WORKING |
| `getAIPriorityDashboard` | GET | Combined dashboard | WORKING |
| `getTeamWorkloadBalance` | GET | Workload analysis | WORKING |
| `calculateAIPriorityForTask` | GET | Single task priority | WORKING |
| `createUnifiedTask` | POST | Create task + SMS | WORKING |
| `updateUnifiedTask` | POST | Update task | WORKING |
| `bulkUpdateTasks` | POST | Batch update (100 max) | WORKING |
| `bulkCreateTasks` | POST | Batch create (100 max) | WORKING |
| `deleteUnifiedTask` | POST | Soft delete | WORKING |

## C. Planning

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `getPlanning` | GET | Get crop planning data | WORKING |
| `savePlanting` | POST | Create/update planting | WORKING |
| `deletePlanting` | POST | Remove planting | WORKING |
| `getSuccessionPlan` | GET | Get succession schedule | WORKING |

## D. Inventory

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `getCrops` | GET | Get crop list | WORKING |
| `getBeds` | GET | Get bed list | WORKING |
| `getFields` | GET | Get field list | WORKING |
| `getRealtimeAvailability` | GET | Current inventory levels | WORKING |
| `getProductForecast` | GET | Future availability | WORKING |

## E. Orders

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `submitWholesaleOrder` | POST | Create chef order | WORKING |
| `getWholesaleOrders` | GET | Get orders list | WORKING |
| `updateOrderStatus` | POST | Change order status | WORKING |
| `getStandingOrders` | GET | Get recurring orders | WORKING |

## F. Time & Attendance

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `clockIn` | POST | Employee clock in | WORKING |
| `clockOut` | POST | Employee clock out | WORKING |
| `getTimeEntries` | GET | Get time records | WORKING |

## G. HR & Scheduling (Jan 29, 2026)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `getTimeOffRequests` | GET | Get time-off requests | WORKING |
| `createTimeOffRequest` | POST | Submit time-off request | WORKING |
| `approveTimeOffRequest` | POST | Approve request | WORKING |
| `denyTimeOffRequest` | POST | Deny request | WORKING |
| `getEmployeeHRStats` | GET | Single employee HR stats | WORKING |
| `getAllEmployeeHRStats` | GET | All employees HR stats | WORKING |
| `recordTardinessIncident` | POST | Record tardiness | WORKING |
| `getHRAlerts` | GET | HR alerts list | WORKING |

## H. Invitations

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `inviteChef` | POST | Send chef invitation | WORKING |
| `inviteEmployee` | POST | Send employee invitation | WORKING |
| `bulkInviteChefs` | POST | Batch chef invitations | WORKING |
| `getAllChefs` | GET | List all chefs | WORKING |

## I. Chief of Staff 2.0 (Jan 30, 2026)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `getNextPriorityTask` | GET | Highest priority task | WORKING |
| `getPendingDecisions` | GET | Decision cards with AI | WORKING |
| `generateMorningBriefV2` | GET | Enhanced morning brief | WORKING |
| `getThisTimeLastYear` | GET | Historical comparison | WORKING |
| `getWeatherAwareScheduling` | GET | Weather-based suggestions | WORKING |
| `calculateFarmPriority` | GET | Priority calculation | WORKING |
| `recordTaskAction` | POST | Log task action | WORKING |
| `getProactiveAlerts` | GET | Proactive alerts | WORKING |

## J. Garage/Fleet (Jan 30, 2026)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `getGarageParts` | GET | List parts | WORKING |
| `getGaragePartById` | GET | Single part | WORKING |
| `createGaragePart` | POST | Add new part | WORKING |
| `updateGaragePart` | POST | Update part | WORKING |
| `adjustPartInventory` | POST | Stock adjustment | WORKING |
| `getPartsLowStock` | GET | Low stock alert | WORKING |
| `getPartsByEquipment` | GET | Parts by asset | WORKING |
| `getGarageManuals` | GET | List manuals | WORKING |
| `getManualsByAsset` | GET | Manuals by equipment | WORKING |
| `createGarageManual` | POST | Add manual | WORKING |
| `searchManuals` | GET | Search manuals | WORKING |
| `getServiceSchedule` | GET | Service schedule | WORKING |
| `getServiceDue` | GET | Due services | WORKING |
| `createServiceSchedule` | POST | Create schedule | WORKING |
| `logServiceCompleted` | POST | Mark service done | WORKING |
| `getServiceHistory` | GET | Service history | WORKING |
| `getGarageDashboard` | GET | Combined dashboard | WORKING |

## K. Chief of Staff (TO BE CONNECTED)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `getChiefMemory` | GET | Retrieve stored context | BUILT, DISCONNECTED |
| `saveChiefMemory` | POST | Store context | BUILT, DISCONNECTED |
| `getAutonomySettings` | GET | Get delegation rules | BUILT, DISCONNECTED |
| `updateAutonomySettings` | POST | Change delegation rules | BUILT, DISCONNECTED |
| `processEmail` | POST | Triage incoming email | BUILT, DISCONNECTED |
| `getEmailQueue` | GET | Get pending emails | BUILT, DISCONNECTED |
| `approveEmail` | POST | Approve draft | BUILT, DISCONNECTED |

---

# PART 6: CHIEF OF STAFF - COMPLETE FEATURE INVENTORY

The Chief of Staff has extensive backend functionality that was NEVER connected to the frontend.

## A. Voice Interface (ChiefOfStaff_Voice.js)
**Status:** BUILT, NOT CONNECTED
- Voice command parsing
- Natural language processing for farm commands
- "Hey Chief" activation phrase
- Task delegation via voice
- Status queries via voice

## B. Memory System (ChiefOfStaff_Memory.js)
**Status:** BUILT, NOT CONNECTED
- Cross-session context retention
- User preference learning
- Decision history tracking
- Pattern recognition from past actions

## C. Autonomy Settings (ChiefOfStaff_Autonomy.js)
**Status:** BUILT, NOT CONNECTED
- Delegation trust levels (1-5)
- Auto-approve thresholds
- Scope of autonomous actions
- Escalation rules

## D. Proactive Intelligence (ChiefOfStaff_ProactiveIntel.js)
**Status:** BUILT, NOT CONNECTED
- Predictive alerts
- Anomaly detection
- Opportunity identification
- Risk warnings

## E. Style Mimicry (ChiefOfStaff_StyleMimicry.js)
**Status:** BUILT, NOT CONNECTED
- Email style learning
- Draft composition matching owner voice
- Signature and formatting matching

## F. Calendar AI (ChiefOfStaff_Calendar.js)
**Status:** BUILT, NOT CONNECTED
- Smart scheduling
- Conflict detection
- Meeting preparation briefs
- Follow-up reminders

## G. Predictive Analytics (ChiefOfStaff_Predictive.js)
**Status:** BUILT, NOT CONNECTED
- Revenue forecasting
- Demand prediction
- Resource planning
- Bottleneck identification

## H. SMS Intelligence (ChiefOfStaff_SMS.js)
**Status:** BUILT, NOT CONNECTED
- Smart SMS parsing
- Auto-response drafting
- Priority classification
- Contact context lookup

## I. File Organization (ChiefOfStaff_FileOrg.js)
**Status:** BUILT, NOT CONNECTED
- Automatic file categorization
- Naming convention enforcement
- Archive management
- Search optimization

## J. External Integrations (ChiefOfStaff_Integrations.js)
**Status:** BUILT, NOT CONNECTED
- Third-party service connections
- Data synchronization
- Webhook management

## K. Multi-Agent Coordination (ChiefOfStaff_MultiAgent.js)
**Status:** BUILT, NOT CONNECTED
- Claude session coordination
- Task distribution
- Progress tracking
- Conflict resolution

---

# PART 7: DUPLICATE SYSTEMS (MUST CONSOLIDATE)

## A. Morning Brief Generators (5 versions)

| System | Location | Features | Keep/Merge |
|--------|----------|----------|------------|
| MERGED TOTAL getMorningBrief | Line ~6200 | Basic tasks, weather | MERGE |
| MorningBriefGenerator.js | Standalone file | Comprehensive brief | **KEEP AS PRIMARY** |
| ChiefOfStaff_Master getChiefMorningBrief | CoS module | Executive summary | MERGE INTO PRIMARY |
| FarmIntelligence getFarmMorningBrief | FI module | Farm insights | MERGE INTO PRIMARY |
| generateMorningBriefV2 | MERGED TOTAL.js | Enhanced with historical | CONSIDER AS NEW PRIMARY |

**ACTION:** Create unified `generateMorningBrief(options)` with:
- `level: 'executive' | 'detailed' | 'field'`
- `includeWeather: boolean`
- `includeFinancial: boolean`
- `includeChefOrders: boolean`
- `includeHistorical: boolean`

## B. Approval Systems (2 versions)

| System | Location | Purpose | Keep/Merge |
|--------|----------|---------|------------|
| EmailWorkflowEngine.js | CoS folder | Email approvals | **KEEP** |
| chief-of-staff.html approval tab | Frontend | Manual approvals | MERGE INTO ABOVE |

**ACTION:** Connect EmailWorkflowEngine.js to chief-of-staff.html frontend.

## C. Email Processing (3 pipelines)

| System | Purpose | Status |
|--------|---------|--------|
| ChiefOfStaff_Master email functions | Email triage | BUILT, DISCONNECTED |
| EmailWorkflowEngine.js | Workflow automation | BUILT, DISCONNECTED |
| Gmail API in various files | Direct Gmail access | SCATTERED |

**ACTION:** Consolidate into single email processing service accessed via API.

---

# PART 8: CLAUDE SESSION STRUCTURE

## Active Session Folders

| Folder | Purpose | INBOX | OUTBOX |
|--------|---------|-------|--------|
| `pm_architect` | Project management | Yes | Yes |
| `backend` | Apps Script development | Yes | Yes |
| `ux_design` | Frontend UI/UX | Yes | Yes |
| `mobile_employee` | Mobile app development | Yes | Yes |
| `sales_crm` | Sales and CRM | Yes | Yes |
| `social_media` | Marketing and social | Yes | Yes |
| `field_operations` | Farm operations | Yes | Yes |
| `financial` | Financial systems | Yes | Yes |
| `food_safety` | Compliance | Yes | Yes |
| `grants_funding` | Grant applications | Yes | Yes |
| `inventory_traceability` | Seed traceability | Yes | Yes |
| `route_delivery` | Delivery routing | Yes | Yes |
| `security` | Security and auth | Yes | Yes |
| `seo` | SEO optimization | Yes | Yes |
| `email_chief_of_staff` | Email AI system | Yes | - |

## Key Documentation Files

| File | Location | Purpose |
|------|----------|---------|
| `CLAUDE_INTEGRATION_STANDARDS.md` | claude_sessions/ | Mandatory development rules |
| `COORDINATION_RULES.md` | claude_sessions/ | Inter-session communication |
| `PHONE_PM_INSTRUCTIONS.md` | claude_sessions/pm_architect/ | Phone PM role for mobile coordination |
| `MASTER_ARCHITECTURE.md` | root | System architecture |
| `PROJECT_STATUS.md` | root | Progress tracking |
| `API_CONFIG.md` | root | API reference |
| `USER_MANUAL.md` | root | User documentation |
| `TASK_MANAGEMENT_RESEARCH_REPORT.md` | claude_sessions/pm_architect/ | Task system research |
| `STATE_OF_THE_ART_TASK_SYSTEM_PLAN.md` | claude_sessions/pm_architect/ | Task implementation plan |
| `MULTI_AGENT_RESEARCH_REPORT.md` | claude_sessions/pm_architect/ | Multi-agent AI research |

---

# PART 9: WHAT'S WORKING vs WHAT'S NOT

## WORKING (Ready for Use)

| Component | Status | Access URL |
|-----------|--------|------------|
| Employee Time Clock | WORKING | employee.html |
| Driver Delivery App | WORKING | web_app/driver.html |
| Chef Ordering (Mobile) | WORKING | web_app/chef-order.html |
| Wholesale Portal | WORKING | web_app/wholesale.html |
| CSA Member Portal | WORKING | web_app/csa.html |
| Crop Planning | WORKING | planning.html |
| Succession Planning | WORKING | succession.html |
| Greenhouse Tracking | WORKING | greenhouse.html |
| Label Printing | WORKING | labels.html |
| Financial Dashboard | WORKING | web_app/financial-dashboard.html |
| Admin Panel | WORKING | web_app/admin.html |
| Sales Dashboard | WORKING | web_app/sales.html |
| **Manager Dashboard** | **NEW - WORKING** | web_app/manager-dashboard.html |
| **Task Assignment** | **UPDATED - WORKING** | web_app/task-assignment.html |
| Garage/Fleet | WORKING | web_app/garage.html |
| HR/Schedule | WORKING | web_app/schedule.html |
| Marketing Command Center | WORKING | web_app/marketing-command-center.html |

## PARTIALLY WORKING (Needs Attention)

| Component | Issue | Fix Required |
|-----------|-------|--------------|
| Chief of Staff | Backend built, frontend partial | Connect remaining APIs |
| Field Operations | Some features incomplete | Finish GPS polygon |
| Smart Learning DTM | Has demo data fallback | Remove fallback |
| Seed Inventory | Has demo data fallback | Remove fallback |

## NOT WORKING (Disconnected/Incomplete)

| Component | Issue | Location |
|-----------|-------|----------|
| Voice Commands | Backend built, no frontend | ChiefOfStaff_Voice.js |
| Memory System | Backend built, no frontend | ChiefOfStaff_Memory.js |
| Autonomy Settings | Backend built, no frontend | ChiefOfStaff_Autonomy.js |
| Email Workflows | Backend built, no frontend | EmailWorkflowEngine.js |
| Proactive Alerts | Backend built, no frontend | ChiefOfStaff_ProactiveIntel.js |

---

# PART 10: QUICK REFERENCE

## URLs

| Purpose | URL |
|---------|-----|
| Main Dashboard | https://app.tinyseedfarm.com/index.html |
| Employee App | https://app.tinyseedfarm.com/employee.html |
| Chef Ordering | https://app.tinyseedfarm.com/web_app/chef-order.html |
| Driver App | https://app.tinyseedfarm.com/web_app/driver.html |
| Chief of Staff | https://app.tinyseedfarm.com/web_app/chief-of-staff.html |
| Manager Dashboard | https://app.tinyseedfarm.com/web_app/manager-dashboard.html |
| Task Assignment | https://app.tinyseedfarm.com/web_app/task-assignment.html |
| API Endpoint | https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec |

## Key IDs

| Item | ID |
|------|---|
| Google Sheet | 128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc |
| Deployment ID | AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm |

## Deployment Commands

```bash
# Apps Script
cd /Users/samanthapollack/Documents/TIny_Seed_OS/apps_script
PATH="/opt/homebrew/bin:$PATH" clasp push
PATH="/opt/homebrew/bin:$PATH" clasp deploy -i "AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm" -d "Description"

# GitHub Pages (Frontend)
git add .
git commit -m "Description"
git push origin main
```

---

# PART 11: ARCHITECTURE DIAGRAMS

## Unified Task API Architecture

```
                    ┌─────────────────────────────────────────┐
                    │           UNIFIED_TASKS Sheet           │
                    │         (Single Source of Truth)        │
                    │            45 columns, cached           │
                    └─────────────────────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
            ┌───────▼───────┐ ┌───────▼───────┐ ┌───────▼───────┐
            │   AI Priority │ │  At-Risk      │ │   Workload    │
            │   Calculator  │ │  Detection    │ │   Balancer    │
            └───────────────┘ └───────────────┘ └───────────────┘
                    │                  │                  │
                    └──────────────────┼──────────────────┘
                                       │
                    ┌──────────────────▼──────────────────┐
                    │         API Layer (MERGED TOTAL.js) │
                    │  getUnifiedTasks, getTaskPriorities │
                    │  createUnifiedTask, bulkUpdateTasks │
                    └─────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
┌───────▼───────┐             ┌───────▼───────┐             ┌───────▼───────┐
│  index.html   │             │   manager-    │             │    task-      │
│  Today's Work │             │   dashboard   │             │  assignment   │
└───────────────┘             └───────────────┘             └───────────────┘
        │                              │                              │
┌───────▼───────┐             ┌───────▼───────┐             ┌───────▼───────┐
│ flowers.html  │             │  chief-of-    │             │   employee    │
│   food-safety │             │  staff.html   │             │    .html      │
└───────────────┘             └───────────────┘             └───────────────┘
```

## Priority Scoring Flow

```
Task Input
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│              calculateAIPriority(task, context)         │
│                                                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐           │
│  │ Deadline  │  │  Weather  │  │ Dependency│           │
│  │   25%     │  │   20%     │  │   15%     │           │
│  └───────────┘  └───────────┘  └───────────┘           │
│                                                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐           │
│  │  Revenue  │  │  Manual   │  │ Workload  │           │
│  │   15%     │  │   15%     │  │   10%     │           │
│  └───────────┘  └───────────┘  └───────────┘           │
│                                                         │
│  + GDD Bonus (+10 if overripe risk)                    │
└─────────────────────────────────────────────────────────┘
    │
    ▼
Priority Score (0-100)
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                 detectAtRisk(task)                      │
│                                                         │
│  TIME (due <2hrs) │ WEATHER │ OVERRIPE │ OVERDUE │ DEP │
└─────────────────────────────────────────────────────────┘
    │
    ▼
Task with priority + at_risk flag + reasons
```

---

**END OF SYSTEM MANIFEST**

*This document is the single source of truth for Tiny Seed OS system inventory.*
*Last Updated: 2026-02-03 by PM_Architect Claude*
