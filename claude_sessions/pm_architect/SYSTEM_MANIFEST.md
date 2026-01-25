# SYSTEM_MANIFEST.md - Complete Tiny Seed OS Inventory
## Project Manager: Claude PM_Architect
## Updated: 2026-01-22

---

# EXECUTIVE SUMMARY

**Total Components Inventoried:**
- Apps Script Backend Files: 29
- Desktop HTML Files (Root): 17+
- Web App HTML Files: 32
- Claude Session Folders: 15
- Google Sheets: 18+ (estimated)

**Critical Issues Found:**
1. **4 Morning Brief Generators** - Compete, cause confusion
2. **Chief of Staff Backend NOT Connected** - 12+ advanced features built but not in frontend
3. **2 Approval Systems** - Don't sync with each other
4. **Demo Data Fallbacks** - 10+ files show fake data when API fails

---

# PART 1: APPS SCRIPT BACKEND FILES

## A. Core System (Critical)

| File | Purpose | Status | Lines | Notes |
|------|---------|--------|-------|-------|
| `MERGED TOTAL.js` | Central API router | ACTIVE | ~19,000 | Main entry point, 230+ endpoints |
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

**RECOMMENDATION:** Consolidate into ONE morning brief system with configurable detail levels.

## E. Specialty Modules

| File | Purpose | Status | Notes |
|------|---------|--------|-------|
| `MarketModule.js` | Farmers market integration | ACTIVE | Market sales tracking |
| `BookImportModule.js` | Accounting book import | ACTIVE | CSV/QBO imports |
| `PHIDeadlineTracker.js` | Pre-harvest interval tracking | ACTIVE | Food safety compliance |

---

# PART 2: FRONTEND HTML FILES

## A. Root Level (Desktop Dashboard)

| File | Purpose | Auth | Status | Mobile Ready |
|------|---------|------|--------|--------------|
| `index.html` | Main dashboard | Yes | WORKING | No |
| `login.html` | Authentication | No | WORKING | Yes |
| `employee.html` | Crew app | Yes | WORKING | Yes |
| `planning.html` | Crop planning | Yes | WORKING | No |
| `succession.html` | Succession wizard | Yes | WORKING | No |
| `calendar.html` | Calendar view | Yes | WORKING | No |
| `greenhouse.html` | Greenhouse tracking | Yes | WORKING | Partial |
| `labels.html` | Label printing | Yes | WORKING | No |
| `sowing-sheets.html` | Sowing records | Yes | WORKING | No |
| `soil-tests.html` | Soil analysis | Yes | WORKING | No |
| `farm-operations.html` | Field operations | Yes | WORKING | Partial |
| `flowers.html` | Flower management | Yes | WORKING | No |
| `food-safety.html` | Compliance forms | Yes | WORKING | No |
| `seed_inventory_PRODUCTION.html` | Seed tracking | Yes | NEEDS DEMO REMOVAL | No |
| `smart_learning_DTM.html` | DTM analytics | Yes | NEEDS DEMO REMOVAL | No |
| `inventory_capture.html` | Inventory capture | Yes | WORKING | Yes |
| `track.html` | Tracking interface | Yes | REVIEW NEEDED | No |

## B. Web App Folder (Staff & Customer Facing)

### Staff Applications
| File | Purpose | Auth | Status | User Type |
|------|---------|------|--------|-----------|
| `chief-of-staff.html` | Command center | Yes | **INCOMPLETE** | Admin |
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

# PART 3: DUPLICATE SYSTEMS (MUST CONSOLIDATE)

## A. Morning Brief Generators (4 versions)

| System | Location | Features | Keep/Merge |
|--------|----------|----------|------------|
| MERGED TOTAL getMorningBrief | Line ~6200 | Basic tasks, weather | MERGE |
| MorningBriefGenerator.js | Standalone file | Comprehensive brief | **KEEP AS PRIMARY** |
| ChiefOfStaff_Master getChiefMorningBrief | CoS module | Executive summary | MERGE INTO PRIMARY |
| FarmIntelligence getFarmMorningBrief | FI module | Farm insights | MERGE INTO PRIMARY |

**ACTION:** Create unified `generateMorningBrief(options)` with:
- `level: 'executive' | 'detailed' | 'field'`
- `includeWeather: boolean`
- `includeFinancial: boolean`
- `includeChefOrders: boolean`

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
| `TASKS` | Task assignments | Employee app | ACTIVE |

## C. Financial Sheets

| Sheet | Purpose | Used By | Status |
|-------|---------|---------|--------|
| `TRANSACTIONS` | Financial transactions | Accounting | ACTIVE |
| `ACCOUNTS` | Chart of accounts | Accounting | ACTIVE |
| `INVESTMENTS` | Investment tracking | Wealth Builder | ACTIVE |

## D. Sheets with Naming Issues

| Concept | Name 1 | Name 2 | Fallback Code |
|---------|--------|--------|---------------|
| Employees | `EMPLOYEES` | `USERS` | Line 13517 has fallback |
| Harvests | `HARVEST_LOG` | `HARVESTS` | Line 14244 has fallback |
| Fields | `REF_Fields` | `FIELD_MAP` | Line 12463 has fallback |

**ACTION:** Standardize sheet names. Choose one name for each concept.

---

# PART 5: CHIEF OF STAFF - COMPLETE FEATURE INVENTORY

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

# PART 6: CLAUDE SESSION STRUCTURE

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

---

# PART 7: WHAT'S WORKING vs WHAT'S NOT

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

## PARTIALLY WORKING (Needs Attention)

| Component | Issue | Fix Required |
|-----------|-------|--------------|
| Chief of Staff | Backend built, frontend empty | Connect APIs |
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

# PART 8: CONSOLIDATION ROADMAP

## Phase 1: Connect Chief of Staff Frontend to Backend

**Files to Modify:**
- `web_app/chief-of-staff.html`

**APIs to Connect:**
1. Email triage from EmailWorkflowEngine.js
2. Memory from ChiefOfStaff_Memory.js
3. Autonomy settings from ChiefOfStaff_Autonomy.js
4. Proactive alerts from ChiefOfStaff_ProactiveIntel.js
5. Voice commands from ChiefOfStaff_Voice.js

## Phase 2: Consolidate Morning Brief Systems

**Action:** Create single `generateMorningBrief(options)` function
**Delete:** Duplicate functions after consolidation
**Update:** All callers to use new unified function

## Phase 3: Standardize Sheet Names

**Action:** Choose one name per concept
**Update:** All code references
**Add:** Migration script if sheets need renaming

## Phase 4: Remove Demo Data Fallbacks

**Files to Update:**
- seed_inventory_PRODUCTION.html
- smart_learning_DTM.html
- Any file with `Demo mode` or `sample data`

**Replace With:** Proper error handling

## Phase 5: Build PM Monitor Dashboard

**Purpose:** Real-time visibility into all system activity
**Features:**
- Component status (working/broken)
- Recent changes log
- Active Claude sessions
- Error log viewer
- API health check

---

# PART 9: API ENDPOINTS INVENTORY

## Authentication
- `login` - User authentication
- `verifySession` - Session validation
- `logout` - Session termination
- `verifyChefToken` - Magic link validation
- `verifyEmployeeToken` - Employee magic link
- `sendChefMagicLink` - Send chef login link
- `sendEmployeeMagicLink` - Send employee login link

## Planning
- `getPlanning` - Get crop planning data
- `savePlanting` - Create/update planting
- `deletePlanting` - Remove planting
- `getSuccessionPlan` - Get succession schedule

## Inventory
- `getCrops` - Get crop list
- `getBeds` - Get bed list
- `getFields` - Get field list
- `getRealtimeAvailability` - Current inventory levels
- `getProductForecast` - Future availability

## Orders
- `submitWholesaleOrder` - Create chef order
- `getWholesaleOrders` - Get orders list
- `updateOrderStatus` - Change order status
- `getStandingOrders` - Get recurring orders

## Time & Attendance
- `clockIn` - Employee clock in
- `clockOut` - Employee clock out
- `getTimeEntries` - Get time records

## Invitations
- `inviteChef` - Send chef invitation
- `inviteEmployee` - Send employee invitation
- `bulkInviteChefs` - Batch chef invitations
- `getAllChefs` - List all chefs

## Chief of Staff (TO BE CONNECTED)
- `getChiefMemory` - Retrieve stored context
- `saveChiefMemory` - Store context
- `getAutonomySettings` - Get delegation rules
- `updateAutonomySettings` - Change delegation rules
- `processEmail` - Triage incoming email
- `getEmailQueue` - Get pending emails
- `approveEmail` - Approve draft
- `getProactiveAlerts` - Get smart alerts

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
| API Endpoint | https://script.google.com/macros/s/AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp/exec |

## Key IDs

| Item | ID |
|------|---|
| Google Sheet | 128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc |
| Deployment ID (v201) | AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp |

## Deployment Commands

```bash
# Apps Script
cd /Users/samanthapollack/Documents/TIny_Seed_OS/apps_script
PATH="/opt/homebrew/bin:$PATH" clasp push
PATH="/opt/homebrew/bin:$PATH" clasp deploy -i "AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp" -d "Description"

# GitHub Pages (Frontend)
git add .
git commit -m "Description"
git push origin main
```

---

**END OF SYSTEM MANIFEST**

*This document is the single source of truth for Tiny Seed OS system inventory.*
*Last Updated: 2026-01-22 by PM_Architect Claude*
