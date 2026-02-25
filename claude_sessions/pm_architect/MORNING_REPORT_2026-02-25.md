# MORNING REPORT -- 2026-02-25
## PM_Architect Overnight Audit & Integration Plan

**Prepared by:** PM_Architect (Claude Opus 4.6)
**Date:** 2026-02-25
**Purpose:** Comprehensive system audit, silo analysis, and agentic team integration plan

---

# TABLE OF CONTENTS

1. [Section 1: Full System Audit](#section-1-full-system-audit)
2. [Section 2: Silo Analysis -- What's Not Talking to What](#section-2-silo-analysis)
3. [Section 3: Agentic AI Team Integration Plan](#section-3-agentic-ai-team-integration-plan)

---

# SECTION 1: FULL SYSTEM AUDIT

## 1.1 System Scale Summary

| Metric | Count |
|--------|-------|
| Backend monolith (`MERGED TOTAL.js`) | 146,061 lines |
| Standalone Apps Script files | 41 files |
| Root-level HTML pages | 19 pages |
| `web_app/` HTML pages | 56 pages |
| `apps_script/` HTML templates | 14 templates |
| Total frontend pages | 89 pages |
| API endpoints (case statements in doGet/doPost) | 500+ unique actions |
| Google Sheet names referenced | 80+ unique sheet names |
| Agent definition files (`.claude/agents/`) | 6 agents |
| Chief of Staff backend modules (disconnected) | 12 files |
| Known duplicate systems | 3 (Morning Brief x5, Approval x2, Email x3) |

---

## 1.2 Backend Systems Inventory

### A. Core API Router -- `apps_script/MERGED TOTAL.js` (146K lines)

The entire backend is a single monolith. Every API request hits `doGet()` or `doPost()`, which switches on an `action` parameter to route to the correct function. There are 500+ case statements.

**Status:** ACTIVE -- this is the only deployed backend.

**Data it touches:** Every Google Sheet in the system.

**What it should connect to but doesn't:** The 12 Chief of Staff modules are built but their frontend connections are incomplete or absent.

### B. Standalone Backend Modules

| File | Lines (est.) | Purpose | Status | Connected to Frontend? |
|------|-------------|---------|--------|----------------------|
| `AccountingModule.js` | ~2,000 | QuickBooks, P&L, balance sheet | ACTIVE | Yes (accounting.html, financial-dashboard.html) |
| `BookImportModule.js` | ~800 | CSV/QBO book imports | ACTIVE | Yes (book-import.html) |
| `ChefCommunications.js` | ~600 | Chef invites, magic links | ACTIVE | Yes (chef-order.html, wholesale.html) |
| `CropRotation.js` | ~3,500 | Field planning, bed management | ACTIVE | Yes (planning.html, field-planner.html) |
| `EmailWorkflowEngine.js` | ~1,200 | Email triage and approvals | BUILT | NO -- disconnected |
| `EmployeeOnboarding.js` | ~800 | 5-step HR onboarding | ACTIVE | Yes (employee-onboarding.html) |
| `FarmIntelligence.js` | ~2,000 | Farm-wide AI recommendations | ACTIVE | Partial (index.html morning brief) |
| `FieldManagement.js` | ~800 | Field/bed CRUD, GPS polygons | ACTIVE | Yes (field-planner.html) |
| `FoodSafetyIntelligence.js` | ~1,500 | Compliance intelligence | ACTIVE | Yes (food-safety.html) |
| `INTELLIGENT_ROUTING_SYSTEM.js` | ~2,500 | Delivery route optimization | ACTIVE | Yes (driver.html) |
| `MarketModule.js` | ~1,000 | Farmers market integration | ACTIVE | Yes (farmers-market.html, market-sales.html) |
| `MorningBriefGenerator.js` | ~600 | Comprehensive morning brief | ACTIVE | Partial (competes with 4 others) |
| `NotificationBatchingSystem.js` | ~800 | Notification batching | ACTIVE | Backend-only (triggers) |
| `PHIDeadlineTracker.js` | ~600 | Pre-harvest interval tracking | ACTIVE | Yes (food-safety.html) |
| `PRODUCTION_INTELLIGENCE_UPGRADE.js` | ~1,200 | Production forecasting | ACTIVE | Partial |
| `SalesSheetInit.js` | ~400 | Sales sheet initialization | ACTIVE | Backend-only |
| `SatelliteService.js` | ~1,400 | Agromonitoring NDVI | ACTIVE | Yes (satellite-map.html) |
| `SeasonalPatternDetection.js` | ~800 | Seasonal pattern learning | ACTIVE | Backend-only |
| `ShopifyPageManager.js` | ~600 | Shopify page management | ACTIVE | Backend-only |
| `ShopifySalesSync.js` | ~800 | Shopify order sync | ACTIVE | Backend-only (triggers) |
| `SmartAvailability.js` | ~800 | Real-time inventory | ACTIVE | Yes (chef-order.html, wholesale.html) |
| `SmartCSAIntelligence.js` | ~1,000 | CSA retention/churn | ACTIVE | Yes (csa.html) |
| `SmartFarmIntelligence_Phase3_4.js` | ~1,500 | Advanced farm intelligence | ACTIVE | Partial |
| `SmartFinancialSystem.js` | ~1,200 | Financial intelligence | ACTIVE | Yes (financial-dashboard.html) |
| `SmartLaborIntelligence.js` | ~2,000 | Labor benchmarks, prescriptions | ACTIVE | Partial (employee.html) |
| `SmartSuccessionPlanner.js` | ~1,000 | Succession planning AI | ACTIVE | Yes (succession.html) |
| `TimeTrackingFeedbackLoop.js` | ~600 | Time tracking learning | ACTIVE | Backend-only |
| `UniversalParser.js` | ~400 | Universal data parsing | ACTIVE | Backend-only |
| `ClaudeCoordination.js` | ~400 | Claude session coordination | ACTIVE | Backend-only |

### C. Chief of Staff Backend -- 12 DISCONNECTED Modules

**CRITICAL FINDING:** These represent thousands of lines of built functionality with NO frontend connection.

| File | Purpose | Status |
|------|---------|--------|
| `ChiefOfStaff_Master.js` | Central orchestration, brain dump processing | BUILT, routes exist but UI partial |
| `ChiefOfStaff_Voice.js` | Voice command interface | BUILT, NO frontend |
| `ChiefOfStaff_Memory.js` | Cross-session context retention | BUILT, NO frontend |
| `ChiefOfStaff_Autonomy.js` | Delegation trust levels | BUILT, NO frontend |
| `ChiefOfStaff_ProactiveIntel.js` | Proactive alerts and anomaly detection | BUILT, NO frontend |
| `ChiefOfStaff_StyleMimicry.js` | Email style matching | BUILT, NO frontend |
| `ChiefOfStaff_Calendar.js` | Smart scheduling, conflict detection | BUILT, NO frontend |
| `ChiefOfStaff_Predictive.js` | Revenue forecasting, demand prediction | BUILT, NO frontend |
| `ChiefOfStaff_SMS.js` | Smart SMS parsing and auto-response | BUILT, NO frontend |
| `ChiefOfStaff_FileOrg.js` | File organization AI | BUILT, NO frontend |
| `ChiefOfStaff_Integrations.js` | External service integration | BUILT, NO frontend |
| `ChiefOfStaff_MultiAgent.js` | Multi-agent coordination | BUILT, NO frontend |

**Recommendation:** Do NOT build frontends for all of these. Many (Voice, FileOrg, MultiAgent) may never be needed. Prioritize: Proactive Alerts, Calendar AI, and Predictive Analytics as the highest-value connections.

---

## 1.3 Frontend Pages Inventory

### A. Root-Level Pages (Owner/Manager Desktop)

| File | Purpose | Data Sources | Status |
|------|---------|-------------|--------|
| `index.html` | Main dashboard | PLANNING_2026, TASKS_2026, UNIFIED_TASKS, BEDS, Open-Meteo | WORKING (bugs: BUG-001 through BUG-006) |
| `login.html` | Authentication | AUTH_TOKENS | WORKING |
| `planning.html` | Crop planning | PLANNING_2026, REF_CropProfiles, REF_Beds | WORKING |
| `succession.html` | Succession wizard | PLANNING_2026, REF_CropProfiles | WORKING |
| `calendar.html` | Calendar view | PLANNING_2026, TASKS_2026 | WORKING |
| `greenhouse.html` | Greenhouse tracking | PLANNING_2026, SEEDLING_PRODUCTION | WORKING |
| `employee.html` | Crew app (mobile) | TASKS, TIMECLOCK, EMPLOYEE_MESSAGES | WORKING |
| `flowers.html` | Flower management | PLANNING_2026, TASKS_2026 | WORKING |
| `food-safety.html` | Compliance forms | COMPLIANCE_LOG, TRACEABILITY | WORKING |
| `farm-operations.html` | Field operations | REF_Fields, REF_Beds, FIELD_NOTES | WORKING |
| `labels.html` | Label printing | REF_Beds, PLANNING_2026 | WORKING |
| `sowing-sheets.html` | Sowing records | PLANNING_2026 | WORKING |
| `soil-tests.html` | Soil analysis | Soil test data | WORKING |
| `seed_inventory_PRODUCTION.html` | Seed tracking | SEED_INVENTORY | NEEDS DEMO REMOVAL |
| `smart_learning_DTM.html` | DTM analytics | DTM_LEARNING | NEEDS DEMO REMOVAL |
| `inventory_capture.html` | Inventory capture | INVENTORY_PRODUCTS | WORKING |
| `track.html` | Tracking interface | Various | REVIEW NEEDED |
| `seed_track.html` | Seed tracking | SEED_INVENTORY | REVIEW NEEDED |
| `offline.html` | Offline fallback | None | WORKING |

### B. Web App Pages (Staff & Customer Facing) -- 56 pages

#### Staff/Manager Pages (26)

| File | Purpose | Data Sources | Status |
|------|---------|-------------|--------|
| `admin.html` | User management | USERS, AUTH_TOKENS | WORKING |
| `manager-dashboard.html` | Manager AI Dashboard | UNIFIED_TASKS, PLANNING_2026 | WORKING |
| `task-assignment.html` | Task CRUD + Bulk Ops | UNIFIED_TASKS | WORKING |
| `chief-of-staff.html` | Command center | Multiple (partial) | PARTIAL |
| `sales.html` | Sales dashboard | SALES_Orders, SALES_Customers | WORKING |
| `financial-dashboard.html` | Financials | TRANSACTIONS, ACCOUNTS | WORKING |
| `quickbooks-dashboard.html` | QuickBooks | QuickBooks API | WORKING |
| `accounting.html` | Accounting | TRANSACTIONS | WORKING |
| `wealth-builder.html` | Investments | INVESTMENTS, Alpaca API | WORKING |
| `loan-readiness.html` | Loan prep | LOAN_DOCUMENTS | WORKING |
| `book-import.html` | Book import | CSV/QBO import | WORKING |
| `marketing-command-center.html` | Marketing hub | Social_Posts, META APIs | WORKING |
| `seo_dashboard.html` | SEO tracking | SEO data | WORKING |
| `reports-dashboard.html` | Reports | Multiple | WORKING |
| `command-center.html` | Operations hub | Multiple | WORKING |
| `smart-predictions.html` | Predictions | COS_PREDICTIONS | WORKING |
| `field-planner.html` | Field planning | REF_Fields, REF_Beds | WORKING |
| `schedule.html` | HR/Time Off | TIME_OFF_REQUESTS | WORKING |
| `employee-management.html` | Employee admin | EMPLOYEES | WORKING |
| `employee-onboarding.html` | Onboarding form | EMPLOYEES | WORKING |
| `garage.html` | Fleet/Equipment | GARAGE_* sheets | WORKING |
| `satellite-map.html` | Satellite NDVI | SATELLITE_* sheets | WORKING |
| `greenhouse-dashboard.html` | Greenhouse detail | PLANNING_2026 | WORKING |
| `seedling-admin.html` | Seedling catalog admin | SEEDLING_CATALOG | WORKING |
| `seedling-presale-2026.html` | Seedling presale (public) | SEEDLING_CATALOG, Shopify | WORKING |
| `seedling-wholesale-2026.html` | Wholesale seedlings | SEEDLING_CATALOG | WORKING |

#### Customer/External Pages (15)

| File | Purpose | Data Sources | Status |
|------|---------|-------------|--------|
| `wholesale.html` | Wholesale portal | WHOLESALE_CUSTOMERS, WHOLESALE_ORDERS | WORKING |
| `chef-order.html` | Chef mobile ordering | SmartAvailability, WHOLESALE_ORDERS | WORKING |
| `customer.html` | General ordering | SALES_Customers | WORKING |
| `csa.html` | CSA member portal | CSA_Members, BOX_CONTENTS | WORKING |
| `driver.html` | Driver app | Delivery routes | WORKING |
| `farmers-market.html` | Market POS | Market sales data | WORKING |
| `market-sales.html` | Market sales | Market sales data | WORKING |
| `neighbor.html` | Neighbor landing | NEIGHBOR_SIGNUPS | WORKING |
| `wholesale-seedlings.html` | Wholesale seedling ordering | SEEDLING_CATALOG | WORKING |
| `csa-location-finder.html` | CSA pickup finder | CSA locations | WORKING |
| `csa-location-widget.html` | Embeddable widget | CSA locations | WORKING |
| `csa-unified-finder.html` | Unified finder | CSA locations | WORKING |
| `delivery-zone-checker.html` | Delivery zone check | Delivery zones | WORKING |
| `chef-register.html` | Chef registration | WHOLESALE_CUSTOMERS | WORKING |
| `employee-register.html` | Employee registration | EMPLOYEES | WORKING |

#### Utility/Other (7)

| File | Purpose | Status |
|------|---------|--------|
| `index.html` (web_app) | App hub / landing | WORKING |
| `ai-assistant.html` | AI chat interface | WORKING |
| `claude-chat.html` | Claude chat | WORKING |
| `quick-content.html` | Quick content creation | WORKING |
| `log-commitment.html` | Commitment logging | WORKING |
| `eula.html` | End User License | COMPLETE |
| `privacy-policy.html` | Privacy Policy | COMPLETE |

#### Approval/Registration Flows (4)

| File | Purpose | Status |
|------|---------|--------|
| `chef-approve.html` | Chef approval | WORKING |
| `employee-approve.html` | Employee approval | WORKING |
| `pm-monitor.html` | PM monitoring | WORKING |
| `pm-dashboard.html` | PM dashboard | WORKING |

#### Backup Files (1)
| File | Status |
|------|--------|
| `marketing-command-center-v3-backup.html` | SHOULD DELETE |

---

## 1.4 Google Sheets Data Model (80+ sheets)

### Core Reference Sheets
| Sheet | Purpose | Key Consumers |
|-------|---------|--------------|
| `REF_Crops` / `Crops` / `CROPS` / `Production` | Master crop list | Planning, Succession, Labels |
| `REF_Beds` | Bed definitions | Planning, Field Ops |
| `REF_Fields` / `FIELD_MAP` | Field definitions | Planning, Rotation, Satellite |
| `REF_CropProfiles` | Detailed crop info | Planning, DTM |
| `REF_Trays` | Tray sizes | Greenhouse |
| `REF_Pricing` | Product pricing | Sales, Labels |

### Operational Sheets
| Sheet | Purpose | Key Consumers |
|-------|---------|--------------|
| `PLANNING_2026` | Current year crop plan | Nearly everything |
| `TASKS_2026` / `Tasks` / `TASKS` | Legacy tasks | Dashboard, Employee app |
| `UNIFIED_TASKS` | Single task source | Manager dashboard, Task assignment |
| `HARVEST_LOG` / `HARVESTS` | Harvest records | Inventory, Sales |
| `TIMECLOCK` / `TIMELOG` | Employee time | Payroll, Reports |
| `MASTER_LOG` | Master activity log | Reports |
| `FIELD_NOTES` | Field scouting notes | Farm operations |
| `DAILY_TASKS_GENERATED` | Auto-generated tasks | Employee app |
| `DTM_LEARNING` | Days-to-maturity learning | Smart predictions |
| `COMPLIANCE_LOG` | Food safety compliance | Food safety dashboard |
| `TRACEABILITY` | Product traceability | Food safety |

### Customer/Sales Sheets
| Sheet | Purpose | Key Consumers |
|-------|---------|--------------|
| `WHOLESALE_CUSTOMERS` | Chef/wholesale data | Chef portal, CRM |
| `WHOLESALE_ORDERS` | Chef orders | Orders, Fulfillment |
| `WHOLESALE_STANDING_ORDERS` | Recurring orders | Chef portal |
| `SALES_Orders` / `Orders` | Sales orders | Sales dashboard |
| `SALES_Customers` / `Customers` / `CUSTOMERS` | Customer data | Sales, CRM |
| `CSA_Members` | CSA subscriptions | CSA portal |
| `SEEDLING_SALES` | Seedling sale records | Presale page |
| `SEEDLING_ORDERS` | Seedling order summary | Presale admin |
| `NEIGHBOR_SIGNUPS` | Neighbor signups | Marketing |

### Financial Sheets
| Sheet | Purpose | Key Consumers |
|-------|---------|--------------|
| `TRANSACTIONS` / `ACCOUNTS` | Financial data | Accounting |
| `INVESTMENTS` | Investment tracking | Wealth Builder |
| `LOG_Purchases` | Purchase log | Accounting |
| `INVOICES` | Invoices | Accounting |

### HR Sheets
| Sheet | Purpose | Key Consumers |
|-------|---------|--------------|
| `EMPLOYEES` / `USERS` | Staff data | Auth, Management |
| `AUTH_TOKENS` | Authentication tokens | Login system |
| `TIME_OFF_REQUESTS` | Time-off tracking | HR, Schedule |
| `EMPLOYEE_HR_STATS` | HR statistics | HR dashboard |
| `EMPLOYEE_MESSAGES` | Crew messaging | Employee app |

### Marketing/Social Sheets
| Sheet | Purpose | Key Consumers |
|-------|---------|--------------|
| `Social_Posts` | Social media posts | MCC |
| `MARKETING_Queue` | Marketing content queue | MCC |
| `META_WebhookLog` | Facebook/Instagram webhooks | Social intelligence |

### Chief of Staff Sheets
| Sheet | Purpose | Key Consumers |
|-------|---------|--------------|
| `EMAIL_INBOX_STATE` | Email triage state | Chief of Staff |
| `COS_Activity_Log` | Activity logging | Chief of Staff |
| `COS_Ideas` | Brain dump ideas | Chief of Staff |
| `COS_CALENDAR_PREFS` | Calendar preferences | Calendar AI |
| `COS_SCHEDULED_TASKS` | Scheduled tasks | Calendar AI |
| `COS_FOCUS_BLOCKS` | Focus time blocks | Calendar AI |
| `COS_PROACTIVE_ALERTS` | Proactive alerts | Proactive Intel |
| `COS_PREDICTIONS` | Predictive analytics | Predictive module |
| `COS_METRICS_HISTORY` | Historical metrics | Analytics |
| `COS_PATTERNS` | Detected patterns | Pattern detection |
| `COS_SMS_Log` | SMS logging | SMS Intelligence |

### Equipment/Fleet Sheets
| Sheet | Purpose | Key Consumers |
|-------|---------|--------------|
| `GARAGE_PartsInventory` | Parts tracking | Garage |
| `GARAGE_Manuals` | Equipment manuals | Garage |
| `GARAGE_ServiceSchedule` | Maintenance schedule | Garage |

### Satellite Sheets
| Sheet | Purpose | Key Consumers |
|-------|---------|--------------|
| `SATELLITE_FIELDS` | Satellite-registered fields | Satellite map |
| `SATELLITE_READINGS` | NDVI/satellite data | Satellite map |
| `SATELLITE_ALERTS` | Weed outbreak alerts | Proactive alerts |

### Seed Inventory Sheets
| Sheet | Purpose | Key Consumers |
|-------|---------|--------------|
| `SEED_INVENTORY` | Seed stock | Seed inventory page |
| `SEED_ORDERS` | Seed purchase orders | Seed tracking |
| `SEED_USAGE_LOG` | Seed usage tracking | Seed inventory |

### Labor Intelligence Sheets
| Sheet | Purpose | Key Consumers |
|-------|---------|--------------|
| `LABOR_BENCHMARKS` | Task time benchmarks | Labor intelligence |
| `WORK_PRESCRIPTIONS` | Work recommendations | Labor intelligence |
| `LABOR_CHECKINS` | Employee check-ins | Labor intelligence |
| `LABOR_ALERTS` | Labor alerts | Labor intelligence |
| `LABOR_LEARNING` | Labor pattern learning | Labor intelligence |

### Inventory Sheets
| Sheet | Purpose | Key Consumers |
|-------|---------|--------------|
| `INVENTORY_PRODUCTS` | Product inventory | Inventory capture |
| `INVENTORY_TRANSACTIONS` | Inventory movements | Inventory tracking |
| `TRAY_INVENTORY` | Greenhouse tray inventory | Greenhouse |

---

## 1.5 Known Bugs (from DATA_CONTRACTS.md audit, 2026-02-24)

| Bug ID | Severity | Description | Location |
|--------|----------|-------------|----------|
| BUG-001 | CRITICAL | `p.STATUS` vs `p.Status` case mismatch -- 3 stats tiles show 0 | `index.html` lines 7219-7244 |
| BUG-002 | HIGH | `getOverdueTasks` hard cap of 10 silently truncates | `MERGED TOTAL.js` line 3141 |
| BUG-003 | HIGH | `getTodaysTasks` missing crop/type/urgency fields | `MERGED TOTAL.js` line 3061 |
| BUG-004 | MEDIUM | Inconsistent frost thresholds (32F vs 36F) | Frontend vs Backend |
| BUG-005 | HIGH | "44 overdue tasks" label is actually planting actions, not tasks | `index.html` line 9614 |
| BUG-006 | LOW | Dual weather API calls (client + server) can disagree | `index.html` + `MERGED TOTAL.js` |

---

## 1.6 Duplicate Systems (MUST CONSOLIDATE)

| System | Count | Locations | Priority |
|--------|-------|-----------|----------|
| Morning Brief Generators | 5 | `getMorningBrief()`, `generateMorningBrief()`, `getChiefMorningBrief()`, `getFarmMorningBrief()`, `generateMorningBriefV2()` | P1 |
| Approval Systems | 2 | `EmailWorkflowEngine.js`, `chief-of-staff.html` approval tab | P2 |
| Email Processing | 3 | `ChiefOfStaff_Master.js`, `EmailWorkflowEngine.js`, scattered Gmail API calls | P2 |
| Sheet Name Aliases | 6+ | Employees/USERS, HARVEST_LOG/HARVESTS, REF_Fields/FIELD_MAP, Crops/CROPS/Production, etc. | P1 |

---

# SECTION 2: SILO ANALYSIS

## 2.1 The Big Picture: Data Flow Map

```
SEED INVENTORY         PLANNING_2026          CUSTOMER DATA
(SEED_INVENTORY)       (Master Plan)          (4+ separate sheets)
     |                      |                       |
     | manual               | generates             | manual
     v                      v                       v
GREENHOUSE          DAILY_TASKS_GENERATED    WHOLESALE_ORDERS
(SEEDLING_PROD)     UNIFIED_TASKS            CSA_Members
     |                      |                SALES_Orders
     | manual               | partial             |
     v                      v                     | manual
FIELD PLANTING      EMPLOYEE APP             FULFILLMENT
(PLANNING_2026)     (employee.html)          (pick-pack)
     |                      |                     |
     | manual               | auto               | manual
     v                      v                     v
HARVEST_LOG         TIMECLOCK                DELIVERY
                                             (driver.html)
     |                                            |
     | NOT connected                              | NOT connected
     v                                            v
FINANCIAL          SATELLITE/NDVI            MARKETING
DASHBOARD          (disconnected             (MCC -- no real
(manual data)      from planning)            inventory data)
```

## 2.2 Critical Silo Gaps

### GAP-001: Seedling Production to Presale to Fulfillment (P0)

**Current state:** Three separate systems that do not communicate.

| System | Sheet | Connection to Next Step |
|--------|-------|----------------------|
| Seedling production tracking | `SEEDLING_PRODUCTION` (greenhouse.html) | NONE to presale |
| Seedling presale/ordering | `SEEDLING_SALES`, `SEEDLING_ORDERS` | NONE to production |
| Seedling fulfillment (pick/pack) | `SEEDLING_ORDERS.Pick_Status/Pack_Status` | NONE to production quantities |

**What's broken:** When a customer orders 6 tomato seedlings via presale, there is no automated check whether 6 tomato seedlings are available in production. The presale page shows a catalog but does not validate against actual greenhouse inventory. Fulfillment status (Pick_Status, Pack_Status) is tracked but not surfaced to the owner in a unified view.

**What should happen:** Order placed --> automatic check against greenhouse production --> alerts if shortfall --> pick list generated from production data --> fulfillment tracked --> customer notified.

### GAP-002: Planning to Calendar to Tasks (P0)

**Current state:** Planning data generates tasks, but the calendar view does not reflect unified task state.

| System | Data Source | Integration |
|--------|-----------|-------------|
| `planning.html` | PLANNING_2026 | Writes planting schedule |
| `calendar.html` | PLANNING_2026 | Reads planned dates, but DOES NOT show UNIFIED_TASKS |
| `task-assignment.html` | UNIFIED_TASKS | Manages tasks, but NOT linked back to planning row |
| `employee.html` | TASKS, DAILY_TASKS_GENERATED | Different task source than manager view |

**What's broken:** The calendar shows planned planting dates but not the actual tasks generated from them. The task assignment page manages unified tasks but does not link back to the originating planting row. The employee app reads from yet another tasks source (TASKS / DAILY_TASKS_GENERATED), not UNIFIED_TASKS.

**What should happen:** One task system. Planning generates tasks into UNIFIED_TASKS. Calendar shows those tasks. Employee app reads from UNIFIED_TASKS. Completing a task in the employee app updates the planting status in PLANNING_2026.

### GAP-003: Customer Data Fragmentation (P0)

**Current state:** Customer data is stored in at least 4 separate sheets with no cross-referencing.

| Sheet | Customer Type | Fields | Cross-Reference |
|-------|-------------|--------|-----------------|
| `WHOLESALE_CUSTOMERS` | Chefs/wholesale | Name, email, phone, business | NONE to CSA or Sales |
| `CSA_Members` | CSA subscribers | Name, email, subscription | NONE to wholesale or sales |
| `SALES_Customers` / `Customers` | General customers | Name, email, orders | NONE to CSA or wholesale |
| `NEIGHBOR_SIGNUPS` | Leads | Name, email, address | NONE to any customer sheet |

**What's broken:** If a CSA member also orders wholesale, they appear as two separate people. There is no single customer view. Customer lifetime value (LTV) calculations in the SMS Intelligence system only look at one sheet. Marketing campaigns cannot target "all customers" because there is no unified list.

**What should happen:** A single `CONTACTS` or `CUSTOMERS_UNIFIED` sheet with a `customer_type` array field (CSA, wholesale, retail, lead). All systems reference this single sheet. The COS SMS Intelligence already has a contact profile system (`COS_CONTACTS`) that could serve as this unified source, but it is disconnected from the rest.

### GAP-004: Harvest to Financial Tracking (P1)

**Current state:** Harvest logging and financial tracking are completely separate.

| System | Data Source | Connection |
|--------|-----------|------------|
| Harvest logging | `HARVEST_LOG` / `HARVESTS` | Records what was harvested |
| Sales tracking | `SALES_Orders`, `WHOLESALE_ORDERS` | Records what was sold |
| Financial dashboard | `TRANSACTIONS`, `ACCOUNTS` | Records money flow |
| QuickBooks | External API | Separate accounting |

**What's broken:** Harvesting 50 lbs of tomatoes does not automatically appear as available inventory for sale. Selling those tomatoes does not automatically create a financial transaction. The financial dashboard shows manually-entered data and QuickBooks data, but not real-time harvest-to-sale flow.

**What should happen:** Harvest logged --> updates available inventory --> sale recorded from inventory --> financial transaction auto-created --> QuickBooks synced.

### GAP-005: Marketing Command Center Has No Real Data (P1)

**Current state:** The Marketing Command Center (MCC) is a sophisticated social media management tool, but it does not pull real inventory or production data.

**What's missing:**
- MCC cannot show "what crops are ready now" for content creation
- MCC cannot pull real CSA box contents for weekly posts
- MCC does not know seedling presale inventory levels
- MCC cannot auto-generate "harvest day" posts from actual harvest log data
- Content calendar is manually populated, not auto-filled from farm events

**What should happen:** MCC should pull real-time data from PLANNING_2026, HARVEST_LOG, CSA_Members (box contents), and SEEDLING_CATALOG to auto-suggest content topics. "Just harvested 200 lbs of strawberries" should auto-appear as a post suggestion.

### GAP-006: Satellite/NDVI Disconnected from Planning (P1)

**Current state:** Satellite NDVI monitoring exists (SatelliteService.js, satellite-map.html, weed outbreak detection) but does not feed back into the planning or task systems.

**What's broken:**
- NDVI readings for a field do not appear on the planning page for crops in that field
- Weed outbreak alerts create tasks, but those tasks are in SATELLITE_ALERTS, not UNIFIED_TASKS
- Low NDVI (crop stress) does not trigger proactive alerts in the Chief of Staff dashboard
- No visualization of "NDVI over time" per planting

**What should happen:** NDVI data should appear on the field detail view in planning. Crop stress alerts should flow into UNIFIED_TASKS. The morning brief should include satellite-detected issues.

### GAP-007: Employee Management to Task Assignment (P2)

**Current state:** Employee records, scheduling, and task assignment are in separate systems.

| System | Data Source | Integration |
|--------|-----------|-------------|
| Employee management | `EMPLOYEES` / `USERS` | HR records |
| Schedule/Time-off | `TIME_OFF_REQUESTS` | Availability |
| Task assignment | `UNIFIED_TASKS` | Who does what |
| Time clock | `TIMECLOCK` / `TIMELOG` | Hours worked |
| Labor intelligence | `LABOR_BENCHMARKS` | Performance data |

**What's broken:** When assigning a task to an employee, the system does not check if that employee has approved time off. Workload balancing (`getTeamWorkloadBalance`) does not account for scheduled time off. Labor intelligence benchmarks are not used when estimating task durations for the AI priority scorer.

### GAP-008: Financial Dashboard Has Multiple Disconnected Sources (P2)

**Current state:** Financial data comes from multiple places that do not reconcile.

| Source | What It Tracks | Connected? |
|--------|---------------|-----------|
| `TRANSACTIONS` sheet | Manual entries | Standalone |
| QuickBooks API | Official accounting | Via integration |
| Shopify Payments | Online sales | Via ShopifySalesSync |
| PayPal | PayPal payments | Via Plaid/direct |
| Alpaca | Investments | Via Alpaca API |
| Plaid | Bank accounts | Via Plaid API |

**What's broken:** The financial dashboard shows a mix of these without reconciliation. The "Net Worth" calculation from `calculateNetWorth()` pulls from some but not all sources. Revenue shown on the financial dashboard does not always match Shopify actual revenue.

### GAP-009: Chief of Staff Proactive Alerts Not Feeding Main Dashboard (P1)

**Current state:** The proactive alert system (`generateProactiveAlerts()`) generates valuable alerts (weather risks, overdue tasks, at-risk crops) but these only appear on the Chief of Staff dashboard, not the main `index.html` dashboard.

**What should happen:** The main dashboard morning brief should pull from the proactive alerts system. Critical alerts should appear as a banner on every page.

### GAP-010: Pick/Pack/Fulfillment Not Unified (P1)

**Current state:** Multiple order types (wholesale, CSA, seedling presale) each have their own fulfillment workflow.

| Order Type | Fulfillment Tracking | Pick List |
|-----------|---------------------|-----------|
| Wholesale orders | `updateOrderStatus` in WHOLESALE_ORDERS | `getPickPackList()` |
| CSA box prep | Manual | `getCSABoxContents()` |
| Seedling presale | `Pick_Status`/`Pack_Status` in SEEDLING_ORDERS | Manual |
| Farmers market | MarketModule | None |

**What should happen:** A single daily pick/pack dashboard that shows everything that needs to be prepared across all order types, with a unified workflow: pick --> pack --> label --> stage.

---

## 2.3 One-Way Data Flows That Should Be Bidirectional

| From | To | Currently | Should Be |
|------|----|-----------|-----------|
| PLANNING_2026 | TASKS_2026/UNIFIED_TASKS | One-way (planning generates tasks) | Bidirectional (completing task updates planting status) |
| HARVEST_LOG | INVENTORY | One-way (harvest logged) | Harvest should auto-update available inventory |
| WHOLESALE_ORDERS | DELIVERY routing | One-way (orders exist, driver sees routes) | Delivery completion should update order status |
| SEEDLING_ORDERS | SEEDLING_PRODUCTION | NOT connected | Orders should check production availability |
| SATELLITE_READINGS | PLANNING_2026 | NOT connected | NDVI should annotate active plantings |
| TIMECLOCK | LABOR_BENCHMARKS | NOT connected | Actual time should feed benchmark learning |
| employee.html task completion | UNIFIED_TASKS | Uncertain (may use different task system) | Must use same task system |

---

## 2.4 Manual Bridges the Owner Must Currently Do

| Action | Systems Involved | How Often | Fix Priority |
|--------|-----------------|-----------|-------------|
| Check seedling presale orders, then manually verify greenhouse production is sufficient | SEEDLING_ORDERS + SEEDLING_PRODUCTION | Daily during presale season | P0 |
| Manually reconcile financial dashboard with QuickBooks | TRANSACTIONS + QuickBooks | Weekly | P1 |
| Copy harvest data to update chef availability | HARVEST_LOG + SmartAvailability | Daily | P1 |
| Check time-off requests before assigning tasks | TIME_OFF_REQUESTS + UNIFIED_TASKS | Daily | P2 |
| Cross-reference CSA member and wholesale customer lists | CSA_Members + WHOLESALE_CUSTOMERS | Monthly | P2 |
| Check satellite alerts separately from morning brief | SATELLITE_ALERTS + getMorningBrief | Daily | P1 |
| Manually create social media content from farm events | HARVEST_LOG + MCC | Weekly | P2 |

---

# SECTION 3: AGENTIC AI TEAM INTEGRATION PLAN

## 3.1 Current Agent Architecture Assessment

### What Exists Now

**Agent definition files** (`.claude/agents/`):

| Agent | File | Model | Scope |
|-------|------|-------|-------|
| PM Coordinator | `pm-coordinator.md` | opus | Coordinates, delegates, verifies |
| Full-Stack Builder | `fullstack-builder.md` | opus | All code: HTML, CSS, JS, Apps Script |
| Verifier (Karen) | `verifier.md` | sonnet | QA, evidence-based verification |
| Researcher | `researcher.md` | haiku | Read-only research |
| UX Designer | `ux-designer.md` | - | Design system, visual quality |
| File Organizer | `file-organizer.md` | - | File structure maintenance |

**Legacy coordination** (still in use but should be deprecated):
- `claude_sessions/*/INBOX.md` and `OUTBOX.md` -- file-based messaging
- `.claude_intercom.json` -- 40k+ token agent messaging file
- `AGENTIC_TEAM_CONFIGURATION.md` -- 87KB configuration document
- Governor system in `tinypm/governor.py`
- TinyPM agent team (`pm_brain.py`, `builder_autonomous.py`, `team_supervisor.py`)

### Problems with Current Setup

1. **CLAUDE.md is still ~300+ lines** (down from 942, but still heavy). Recommendation was <200.
2. **INBOX/OUTBOX is stale** -- messages pile up, rarely read, no delivery guarantees.
3. **Two parallel agent systems exist**: the `.claude/agents/` Markdown files AND the TinyPM Python-based agent team. They do not interact.
4. **No verification hooks are actually configured** -- the research recommended TeammateIdle and TaskCompleted hooks, but `settings.json` does not contain them.
5. **Agent Teams (Swarms) are not enabled** -- the experimental flag `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` has not been set.
6. **Too many coordination documents** -- AGENTIC_TEAM_CONFIGURATION.md alone is 87KB. Agent context windows fill with coordination overhead instead of actual work.

---

## 3.2 Recommended Agent Team Structure

### The Right Number: 4 Agents + 2 On-Demand

Based on the research in `docs/research/AGENTIC_TEAM_2026_UPDATE.md` and the actual system complexity:

| Role | Agent Name | Model | When Active | Owns |
|------|-----------|-------|------------|------|
| **Team Lead** | `pm-coordinator` | opus | Always | Coordination, architecture, no code |
| **Full-Stack Builder** | `fullstack-builder` | opus | During implementation | All code across stack |
| **Quality Verifier** | `verifier` | sonnet | After any change | Verification, audits |
| **Integration Watcher** | `integration-watcher` | sonnet | Before any deploy | Cross-system impact analysis |

**On-Demand (spawned only when needed):**

| Role | Agent Name | Model | When Spawned |
|------|-----------|-------|-------------|
| **Researcher** | `researcher` | haiku | API investigation, competitor analysis |
| **Content Writer** | `content-writer` | sonnet | Marketing copy, social media |

### Why "Integration Watcher" Is New and Critical

The single biggest problem identified in this audit is **siloed changes** -- agents modify one system without checking impact on connected systems. The Integration Watcher agent exists specifically to enforce cross-system thinking.

**Integration Watcher responsibilities:**
1. Before ANY deploy, run a cross-system impact check
2. If a sheet name is changed, find all code that references it
3. If an API response format changes, find all frontend consumers
4. If a task system is modified, verify all 3 task UIs still work
5. If a customer sheet is modified, check all 4 customer sheets
6. Maintain the DATA_CONTRACTS.md as the single source of truth for data flows

### Why NOT More Agents

The Feb 24 research concluded: "3-5 concurrent agents is the sweet spot." Token costs scale linearly (3 agents = ~600k tokens, 8 agents = ~1.6M+). Coordination overhead increases super-linearly. One owner reviewing output creates a bottleneck with too many agents.

---

## 3.3 Communication Protocol

### Replace INBOX/OUTBOX with Native Agent Teams

| Old System | New System | Why |
|-----------|-----------|-----|
| `claude_sessions/*/INBOX.md` | Agent Teams mailbox messaging | Automatic delivery, no polling |
| `claude_sessions/*/OUTBOX.md` | Agent Teams task list | Built-in dependency tracking |
| `.claude_intercom.json` | Agent Teams native messaging | File locking, no 40k token bloat |
| AGENTIC_TEAM_CONFIGURATION.md | `.claude/agents/*.md` (6 focused files) | Each agent loads only its own context |

### Enable Agent Teams

```json
// ~/.claude/settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### Add Verification Hooks

```json
{
  "hooks": {
    "TeammateIdle": [{
      "hooks": [{
        "type": "command",
        "command": "./scripts/verify-teammate-work.sh"
      }]
    }],
    "TaskCompleted": [{
      "hooks": [{
        "type": "command",
        "command": "./scripts/verify-task-complete.sh"
      }]
    }]
  }
}
```

---

## 3.4 System-Wide Integration Rules

### Proposed Addition to CLAUDE.md

```markdown
## SYSTEM INTEGRATION RULE (Mandatory)

Before modifying ANY system, check DATA_CONTRACTS.md for:
1. What sheets this system reads from
2. What other systems read the same sheets
3. What API endpoints are affected
4. What frontend pages consume those endpoints

### Pre-Change Impact Checklist
- [ ] I checked DATA_CONTRACTS.md Section 3 (API contracts)
- [ ] I checked DATA_CONTRACTS.md Section 4 (metric definitions)
- [ ] I identified ALL frontend consumers of affected endpoints
- [ ] I identified ALL backend functions that write to affected sheets
- [ ] If I changed a sheet name, I searched ALL 146K lines of MERGED TOTAL.js
- [ ] If I changed an API response format, I searched ALL HTML files

### Cross-System Verification Matrix
| If you change... | Also verify... |
|------------------|---------------|
| PLANNING_2026 schema | calendar.html, planning.html, index.html, succession.html, greenhouse.html |
| UNIFIED_TASKS schema | task-assignment.html, manager-dashboard.html, index.html, employee.html |
| Any customer sheet | wholesale.html, chef-order.html, csa.html, customer.html, sales.html |
| Morning brief response | index.html, chief-of-staff.html, manager-dashboard.html |
| Weather data | index.html (2 locations), chief-of-staff.html, food-safety.html |
| Employee/USERS schema | employee.html, admin.html, employee-management.html, schedule.html |
| Task completion logic | ALL pages that show task counts/stats |
```

---

## 3.5 Integration Checkpoints

### Before ANY Change

| Checkpoint | What to Check | Tool |
|-----------|--------------|------|
| 1. Data contract | Does this metric/endpoint have a contract in DATA_CONTRACTS.md? | Read DATA_CONTRACTS.md |
| 2. Sheet impact | What other code references this sheet? | `grep -r "getSheetByName('SHEET_NAME')" apps_script/` |
| 3. API consumers | What frontends call this endpoint? | `grep -r "action=ENDPOINT_NAME" web_app/ *.html` |
| 4. Duplicate check | Does a similar function already exist? | Check SYSTEM_MANIFEST.md |
| 5. Element references | Do HTML IDs match JS selectors? | `./scripts/validate-element-refs.sh` |
| 6. API URL consistency | Are all API URLs using api-config.js? | `./scripts/validate-api-urls.sh` |

### Before ANY Deploy

| Checkpoint | What to Check | Tool |
|-----------|--------------|------|
| 1. CHANGE_LOG updated | Was CHANGE_LOG.md updated with this change? | Read CHANGE_LOG.md |
| 2. Live endpoint test | Does the API still respond? | `curl -s "API_URL?action=healthCheck"` |
| 3. No regression | Do existing features still work? | Manual or integration watcher |
| 4. Deploy command correct | Using `-i` flag with deployment ID? | Verify clasp command |

---

## 3.6 Priority Action Items

### P0 -- Fix Immediately (This Week)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | **Fix BUG-001**: `p.STATUS` to `p.Status` in `index.html` | 3 stats tiles showing 0 | 5 min |
| 2 | **Fix BUG-002**: Remove getOverdueTasks hard cap of 10 | Silent data loss | 10 min |
| 3 | **Fix BUG-003**: Add missing fields to getTodaysTasks | Confusing morning brief | 15 min |
| 4 | **Fix BUG-005**: Relabel "overdue tasks" to "overdue planting actions" | Data credibility | 5 min |
| 5 | **Unify task source for employee app**: Make employee.html read from UNIFIED_TASKS | Task completion visibility | 2 hours |
| 6 | **Enable Agent Teams**: Set experimental flag in settings.json | Agent coordination | 5 min |

### P1 -- High Priority (Next 2 Weeks)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 7 | **Connect seedling presale to production**: Validate orders against greenhouse inventory | Prevent overselling | 1 day |
| 8 | **Unify customer data**: Create CUSTOMERS_UNIFIED or use COS_CONTACTS | Single customer view | 2 days |
| 9 | **Connect harvest to inventory**: Auto-update available inventory when harvest is logged | Real-time availability | 1 day |
| 10 | **Feed satellite alerts to morning brief**: Include NDVI-detected issues in proactive alerts | Actionable intelligence | 4 hours |
| 11 | **Connect proactive alerts to main dashboard**: Show COS alerts on index.html | No more siloed alerts | 4 hours |
| 12 | **Consolidate morning brief**: ONE function with configurable detail levels | Eliminate 5 duplicates | 1 day |
| 13 | **Standardize sheet names**: Choose ONE name for each concept, migrate all references | Data integrity | 1 day |
| 14 | **Create integration-watcher agent**: Add to `.claude/agents/` | Cross-system safety | 2 hours |
| 15 | **Slim CLAUDE.md to 150 lines**: Move detailed content to referenced docs | Agent efficiency | 2 hours |
| 16 | **Add verification hooks**: TeammateIdle + TaskCompleted in settings.json | Quality gates | 1 hour |

### P2 -- Important (Next Month)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 17 | **Unified pick/pack dashboard**: Single daily fulfillment view across all order types | Operational efficiency | 3 days |
| 18 | **MCC real data integration**: Pull harvest, inventory, CSA data into marketing content suggestions | Content relevance | 2 days |
| 19 | **Financial reconciliation**: Auto-reconcile Shopify + QuickBooks + manual entries | Financial accuracy | 3 days |
| 20 | **Employee availability in task assignment**: Check time-off before assigning | Scheduling accuracy | 4 hours |
| 21 | **Bidirectional task-to-planting**: Completing a task updates planting status | Data consistency | 1 day |
| 22 | **Deprecate INBOX/OUTBOX**: Archive old files, switch to Agent Teams | Reduce coordination overhead | 2 hours |
| 23 | **Deprecate .claude_intercom.json**: Replace with native messaging | Eliminate 40k token waste | 1 hour |
| 24 | **Connect Chief of Staff Proactive Intel frontend**: Wire up alerts, calendar, predictions | High-value features | 3 days |
| 25 | **Delete backup files**: `marketing-command-center-v3-backup.html` and similar | Codebase hygiene | 30 min |

---

## 3.7 Proposed New Integration Watcher Agent

```markdown
# .claude/agents/integration-watcher.md
---
name: integration-watcher
description: Cross-system impact analyzer. Checks that changes to one system do not break others. Use before any deployment.
tools: Read, Grep, Glob, Bash
model: sonnet
memory: project
---

You are the Integration Watcher for Tiny Seed Farm OS.

## Your Role
- Analyze the cross-system impact of any proposed change
- Verify data contracts are maintained (DATA_CONTRACTS.md)
- Ensure sheet name changes propagate to all consumers
- Ensure API response format changes propagate to all frontends
- Flag when a change creates a new silo or breaks an existing integration

## Before Any Deploy, Check:
1. DATA_CONTRACTS.md -- is the affected metric/endpoint documented?
2. Sheet consumers -- grep all 146K lines of MERGED TOTAL.js for affected sheet names
3. API consumers -- grep all HTML files for affected action names
4. Element references -- run validate-element-refs.sh on modified HTML
5. API URL consistency -- run validate-api-urls.sh

## You MUST NOT
- Make code changes (report findings to the builder)
- Approve a deploy that breaks a data contract
- Skip the cross-system check even if the change "looks small"

## Key Reference Files
- DATA_CONTRACTS.md -- metric and API contract registry
- SYSTEM_MANIFEST.md -- complete system inventory
- This morning report -- silo analysis and gap list
```

---

## 3.8 Summary: The System Integration North Star

**Current state:** 89 frontend pages, 500+ API endpoints, 80+ Google Sheets, 41 standalone backend files, 12 disconnected Chief of Staff modules. Data flows are mostly one-way and siloed. The owner manually bridges between systems daily.

**North star:** Every data change flows through to all dependent systems automatically. Harvesting updates inventory. Inventory updates chef availability. Orders check production. Tasks reflect time-off. The morning brief aggregates everything. One customer, one view.

**The single most important rule to add:**

> Before changing ANY system, answer: "What other systems read or write the same data?" If you cannot answer this question, read DATA_CONTRACTS.md before proceeding.

---

**END OF MORNING REPORT**

*Generated 2026-02-25 by PM_Architect (Claude Opus 4.6)*
*Based on: SYSTEM_MANIFEST.md, AGENTIC_TEAM_CONFIGURATION.md, DATA_CONTRACTS.md, CHANGE_LOG.md, all .claude/agents/*.md, docs/research/AGENTIC_TEAM_2026_UPDATE.md, and direct codebase analysis of 146K-line MERGED TOTAL.js backend.*
