# Tiny Seed OS - Operators Manual

**Version:** 1.2
**Last Updated:** 2026-01-23
**Maintained By:** PM Claude

---

## OVERVIEW

This manual documents ALL functions in the Tiny Seed OS web application and Employee mobile app. It is updated as features are added or modified.

---

## TABLE OF CONTENTS

1. [System Access](#system-access)
2. [Desktop Onboarding](#desktop-onboarding) ⭐ NEW
3. [Main Dashboard (index.html)](#main-dashboard)
4. [Employee App (employee.html)](#employee-app)
5. [Financial Command Center](#financial-command-center)
6. [Farm Operations](#farm-operations)
7. [**Farm Intelligence System**](#farm-intelligence-system)
   - [Morning Brief Generator](#morning-brief-generator)
   - [Smart Succession Planner](#smart-succession-planner)
   - [Food Safety Intelligence](#food-safety-intelligence)
   - [PHI Deadline Tracker](#phi-deadline-tracker)
8. [Sales & CRM](#sales-crm)
9. [Accounting Hub](#accounting-hub)
10. [Admin Functions](#admin-functions)
11. [API Reference](#api-reference)

---

## SYSTEM ACCESS

### URLs

| Application | URL |
|-------------|-----|
| **Main OS** | https://toddismyname21.github.io/tiny-seed-os/web_app/admin.html |
| **Employee App** | https://toddismyname21.github.io/tiny-seed-os/employee.html |
| **API Endpoint** | https://script.google.com/macros/s/AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc/exec |

### Login

- **Admin/Owner:** Email + password via Google OAuth
- **Employees:** 4-digit PIN

---

## DESKTOP ONBOARDING

Get Tiny Seed OS on your desktop for one-click access.

### Method 1: Desktop Shortcut (Recommended)

**For the Live Web App:**

1. **Open Safari or Chrome** and go to the Main OS URL:
   ```
   https://toddismyname21.github.io/tiny-seed-os/web_app/admin.html
   ```

2. **Create Desktop Shortcut:**
   - **Safari:** Click File → Share → Add to Dock, OR drag the URL from the address bar to your Desktop
   - **Chrome:** Click ⋮ (three dots) → "Cast, save and share" → "Create shortcut" → Check "Open as window" → Click Create

3. **Rename the shortcut** to "Tiny Seed OS" by right-clicking → Rename

### Method 2: Desktop Alias (Local Development)

For developers working with the local codebase:

1. **Open Finder** and navigate to:
   ```
   /Users/[your-username]/Documents/TIny_Seed_OS/web_app/
   ```

2. **Find `index.html`** (or `admin.html` for the full admin dashboard)

3. **Create an alias:**
   - Hold **Option + Command** keys
   - Drag the file to your Desktop
   - This creates an alias (shortcut) that always points to the original

4. **Rename the alias** to "Tiny Seed OS" by clicking once, waiting, then clicking the name

### Method 3: Dock Icon (Quick Access)

1. **Open the OS in your browser** using the URL above

2. **Keep it in the Dock:**
   - **Safari:** File → Add to Dock
   - **Chrome:** Right-click the Chrome icon in Dock → "Tiny Seed OS" will appear in recent sites

### Keyboard Shortcut (Power Users)

Add a global keyboard shortcut to open Tiny Seed OS:

1. **Open System Settings** → Keyboard → Keyboard Shortcuts
2. Click **App Shortcuts** → Click **+**
3. Set:
   - Application: Safari (or Chrome)
   - Menu Title: (leave blank - use Automator instead)
4. Alternatively, create an **Automator Quick Action** that opens the URL

### Verify Installation

After setup, your Desktop should show:
```
🌱 Tiny Seed OS  (shortcut/alias icon)
```

Double-click to launch directly into the Farm Operating System.

---

## MAIN DASHBOARD

**File:** `web_app/index.html`

### Features

| Feature | Description | Status |
|---------|-------------|--------|
| Morning Brief | AI-generated daily summary | WORKING |
| Quick Stats | Revenue, tasks, weather | WORKING |
| Navigation | Links to all modules | WORKING |

---

## EMPLOYEE APP

**File:** `employee.html`

### PIN Login
- 4-digit PIN authentication
- Role-based access (Employee, Field Lead, Manager, Admin)
- Language toggle (English/Spanish)

### Modules

#### 1. My Tasks
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| View Tasks | See assigned tasks for today | `?action=getEmployeeTasks` |
| Complete Task | Mark task done with notes | `?action=completeTask` |
| Team Tasks | View shared team tasks | `?action=getTeamTasks` |

#### 2. Time Clock
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| Clock In | Start shift with GPS | `?action=clockIn` |
| Clock Out | End shift | `?action=clockOut` |
| View Hours | See weekly hours | `?action=getTimeEntries` |

#### 3. Deliveries (Driver Mode)
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| View Route | Today's delivery stops | `?action=getDeliveryRoute` |
| Navigate | Open in Maps app | N/A (native) |
| Call Customer | Direct dial | N/A (native) |
| Text Customer | Direct SMS | N/A (native) |
| Complete Stop | Mark delivered with photo/signature | `?action=completeDeliveryStop` |

#### 4. Inventory Count
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| Crop Count | Count produce on hand | `?action=submitInventoryCount` |
| Supply Count | Count farm materials | `?action=submitSupplyCount` |
| Scan Barcode | Quick item lookup | `?action=lookupItem` |

#### 5. Report Hazard
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| Report Issue | Log safety hazard with photo | `?action=reportHazard` |
| View Hazards | See open hazards | `?action=getHazards` |

---

## FINANCIAL COMMAND CENTER

**File:** `web_app/financial-dashboard.html`

### Tabs

#### 1. Overview
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| Net Worth | Total assets - liabilities | `?action=getPlaidAccounts` |
| Cash Flow | Income vs expenses chart | `?action=getPlaidTransactions` |
| Accounts | Connected bank accounts | `?action=getPlaidAccounts` |

#### 2. Debt Destroyer
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| Debt List | All debts with balances | `?action=getPlaidAccounts` (filter: credit) |
| Payoff Strategy | Avalanche/Snowball calculator | Local calculation |
| Payment Tracker | Track extra payments | `?action=logDebtPayment` |

#### 3. Wealth Builder
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| Investments | Portfolio overview | `?action=getPlaidAccounts` (filter: investment) |
| Savings Goals | Track savings targets | `?action=getSavingsGoals` |
| Roundups | Automatic savings | `?action=getRoundups` |

#### 4. Transactions
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| View All | Recent transactions | `?action=getPlaidTransactions` |
| Categorize | Assign categories | `?action=categorizeTransaction` |
| Search | Find transactions | `?action=searchTransactions` |

### Plaid Integration
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| Connect Account | Link bank via Plaid | `?action=createPlaidLinkToken` |
| Refresh Balances | Update account data | `?action=refreshPlaidBalances` |
| View Items | See connected institutions | `?action=getPlaidItems` |

---

## FARM OPERATIONS

### Planning (planning.html)
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| Crop Plan | Annual planting schedule | `?action=getPlanningData` |
| Succession | Succession planting dates | `?action=getSuccessionPlan` |
| Bed Map | Field/bed assignments | `?action=getBedAssignments` |

### Greenhouse (greenhouse.html)
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| Seeding Schedule | What to seed when | `?action=getSeedingSchedule` |
| Germination Track | Monitor germination | `?action=getGerminationData` |
| Transplant List | Ready for transplant | `?action=getTransplantReady` |

### Seed Inventory (seed_inventory_PRODUCTION.html)
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| Seed List | All seeds in inventory | `?action=getSeeds` |
| Add Seed | Log new seed purchase | `?action=addSeed` |
| Use Seed | Deduct from inventory | `?action=useSeed` |

### Labels (labels.html)
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| Print Labels | Generate plant labels | `?action=generateLabels` |
| Label Templates | Manage templates | `?action=getLabelTemplates` |

---

## FARM INTELLIGENCE SYSTEM

> **"I WANT IT TO KNOW WHAT I SHOULD DO BEFORE ME"**

The Farm Intelligence System is Tiny Seed OS's brain - a collection of modules that aggregate weather, crop science, and food safety data to provide proactive recommendations. Built with 40+ years of farming knowledge from Don Kretschmann encoded into algorithms.

**Total:** ~1,800 lines of production intelligence code

| Module | File | Lines | Purpose |
|--------|------|-------|---------|
| Morning Brief | MorningBriefGenerator.js | ~400 | Daily intelligence briefing |
| Smart Succession | SmartSuccessionPlanner.js | ~450 | GDD-based planning |
| Food Safety | FoodSafetyIntelligence.js | ~500 | PHI/REI, contamination risk |
| PHI Tracker | PHIDeadlineTracker.js | ~450 | Spray compliance automation |

---

### MORNING BRIEF GENERATOR

**File:** `apps_script/MorningBriefGenerator.js`

The unified intelligence interface that tells you what to do before you ask.

#### Overview

The Morning Brief aggregates all farm intelligence into a single daily briefing:
- Weather forecast with spray windows and frost alerts
- Critical alerts prioritized by severity
- Today's tasks adjusted for weather conditions
- PHI deadlines approaching
- Harvest readiness based on GDD accumulation
- Disease risk based on current conditions

#### Key Functions

| Function | Description | API Endpoint |
|----------|-------------|--------------|
| `getMorningBrief()` | Complete daily intelligence briefing | `?action=getMorningBrief` |
| `getWeatherBrief()` | Weather with spray windows, frost/heat alerts | `?action=getWeatherBrief` |
| `getCriticalAlerts()` | All urgent items sorted by severity | `?action=getAlerts` |
| `getTodaysPriorities()` | Weather-adjusted task prioritization | `?action=getPriorities` |
| `getHarvestForecast()` | GDD-based harvest predictions | `?action=getHarvestForecast` |
| `getDiseaseRiskBrief()` | Weather-triggered disease alerts | `?action=getDiseaseRisk` |
| `getPHIDeadlines()` | Food safety compliance tracking | `?action=getPHIDeadlines` |

#### Morning Brief Response Structure

```json
{
  "generated": "2026-01-22T06:00:00Z",
  "greeting": "Good morning",
  "weather": {
    "today": { "high": 72, "low": 45, "gdd": 8.5, "conditions": "Mild, Dry" },
    "sprayWindows": [{ "date": "2026-01-22", "quality": "EXCELLENT" }],
    "frostRisk": [],
    "heatStress": []
  },
  "alerts": [
    { "type": "PHI_DEADLINE", "severity": "HIGH", "message": "...", "action": "..." }
  ],
  "priorities": [
    { "priority": 1, "category": "HARVEST", "task": "Harvest lettuce", "urgency": "TODAY" }
  ],
  "harvestForecast": [
    { "crop": "Lettuce", "percentComplete": 95, "estimatedHarvestDays": 2 }
  ],
  "topActions": [
    { "rank": 1, "action": "Harvest lettuce", "reason": "GDD target reached" }
  ]
}
```

#### Weather Intelligence

The system pulls from Open-Meteo API (free, no key required):
- 7-day forecast with high/low temps
- Precipitation probability and amounts
- GDD (Growing Degree Day) calculations
- Spray window identification (dry days with calm winds)
- Frost alerts when low ≤ 36°F
- Heat stress alerts when high ≥ 90°F

#### Configuration

```javascript
const MORNING_BRIEF_CONFIG = {
  farmLat: 40.3,          // Farm latitude
  farmLon: -80.0,         // Farm longitude
  forecastDays: 14,       // Days to forecast
  phiAlertDays: 7,        // PHI deadline alert window
  frostAlertTemp: 36,     // Frost alert threshold
  heatStressTemp: 90      // Heat stress threshold
};
```

#### Integration Points

- **Mobile App:** Display morning brief on employee dashboard
- **Email Alerts:** Send critical alerts via email trigger
- **Planning Tools:** Feed harvest forecast to succession planner

---

### SMART SUCCESSION PLANNER

**File:** `apps_script/SmartSuccessionPlanner.js`

GDD-based succession planning that back-calculates planting dates from target harvest dates.

#### How It Works

Traditional succession planning uses calendar days (e.g., "plant every 2 weeks"). This fails because:
- A cool spring delays maturity
- A hot summer accelerates maturity
- Calendar dates don't reflect actual growing conditions

**Smart Succession uses Growing Degree Days (GDD):**
1. You specify a target harvest date
2. System looks up GDD required for that variety
3. Weather API provides forecast and historical data
4. Algorithm back-calculates the exact sow date
5. Result: Continuous harvest regardless of weather variation

#### Key Functions

| Function | Description | API Endpoint |
|----------|-------------|--------------|
| `generateSmartSuccessionPlan()` | Generate planting schedule | `?action=generateSmartSuccessionPlan` |
| `calculatePlantDateFromHarvestSSP()` | Back-calculate sow date | Internal |
| `getDiseaseRiskAssessment()` | Weather-based disease prediction | `?action=getDiseaseRisk` |
| `getAllCropDiseaseRisks()` | Disease dashboard for all crops | `?action=getAllCropDiseaseRisks` |

#### Variety Database

27 crop varieties with timing data from Don's 40 years of records:

| Variety | GDD to Harvest | Base Temp | Days in Greenhouse |
|---------|----------------|-----------|-------------------|
| Salanova | 700 | 40°F | 24 |
| Romaine | 750 | 40°F | 24 |
| Spinach | 600 | 35°F | 21 |
| Kale | 650 | 40°F | 28 |
| Tomato (Cherry) | 1400 | 50°F | 42 |
| Tomato (Slicing) | 1600 | 50°F | 42 |
| Pepper | 1500 | 55°F | 56 |
| Cucumber | 1100 | 50°F | 21 |
| Zucchini | 900 | 50°F | 21 |
| Basil | 700 | 50°F | 21 |
| Cilantro | 500 | 40°F | 14 |
| Beet | 700 | 40°F | 0 (direct seed) |
| Carrot | 900 | 40°F | 0 (direct seed) |

#### Example Usage

```javascript
// Generate succession plan for continuous lettuce harvest
const plan = generateSmartSuccessionPlan({
  crop: 'Salanova',
  targetHarvestStart: '2026-06-01',
  targetHarvestEnd: '2026-09-30',
  weeklyDemand: 50,  // heads per week
  latitude: 40.3,
  longitude: -80.0
});

// Returns array of sow dates with quantities
[
  { sowDate: '2026-04-15', quantity: 60, harvestWindow: '2026-06-01 to 2026-06-08' },
  { sowDate: '2026-04-22', quantity: 60, harvestWindow: '2026-06-08 to 2026-06-15' },
  // ...
]
```

#### Disease Risk Prediction

The module includes weather-based disease prediction for 6 major diseases:

| Disease | Risk Conditions | Affected Crops |
|---------|-----------------|----------------|
| Downy Mildew | Humidity >85%, Temp 60-75°F | Lettuce, Spinach, Cucurbits |
| Late Blight | Humidity >90%, Temp 55-72°F | Tomatoes, Potatoes |
| Botrytis | Rain + Cool temps | Strawberries, Lettuce |
| Powdery Mildew | Dry, Warm (70-85°F) | Squash, Cucumbers |
| Anthracnose | Warm + Wet | Beans, Peppers |
| Bacterial Leaf Spot | Warm + Humid | Tomatoes, Peppers |

---

### FOOD SAFETY INTELLIGENCE

**File:** `apps_script/FoodSafetyIntelligence.js`

Expert food safety guidance embedded in all recommendations. FSMA Produce Safety Rule compliance built-in.

#### Overview

Food safety isn't optional - it's federal law (FSMA Produce Safety Rule, 21 CFR Part 112). This module ensures:
- PHI (Pre-Harvest Interval) compliance for all sprays
- REI (Restricted Entry Interval) worker safety
- Contamination risk monitoring
- Harvest food safety checklists
- Audit-ready documentation

#### OMRI Spray Database

10 organic-approved sprays with complete safety data:

| Spray | Type | PHI (days) | REI (hours) | Notes |
|-------|------|------------|-------------|-------|
| Bt (Bacillus thuringiensis) | Insecticide | 0 | 4 | Apply evening, UV degrades |
| Spinosad | Insecticide | 1 | 4 | **TOXIC TO BEES** |
| Pyrethrin | Insecticide | 0 | 12 | Broad spectrum |
| Neem Oil | Insecticide | 0 | 4 | No application >90°F |
| Copper (Kocide 3000-O) | Fungicide | 0 | 48 | Can accumulate in soil |
| Sulfur | Fungicide | 0 | 24 | No application >85°F |
| Potassium Bicarbonate | Fungicide | 0 | 4 | Safe for pollinators |
| Insecticidal Soap | Insecticide | 0 | 0 | Contact only |
| Bacillus subtilis (Serenade) | Fungicide | 0 | 4 | Preventive only |
| Bacillus amyloliquefaciens | Fungicide | 0 | 4 | Good for leafy greens |

#### Key Functions

| Function | Description | API Endpoint |
|----------|-------------|--------------|
| `getSprayGuidance()` | PHI/REI compliance check for spray | `?action=getSprayGuidance` |
| `getContaminationRiskAssessment()` | Weather-based contamination risk | `?action=getContaminationRisk` |
| `getHarvestFoodSafetyGuidance()` | Harvest checklists by crop type | `?action=getHarvestGuidance` |
| `getSmartPlanWithFoodSafety()` | Succession plan with PHI deadlines | `?action=getSmartPlanWithFoodSafety` |

#### Contamination Risk Assessment

Monitors for FSMA-defined contamination risks:

| Risk Factor | Trigger | Severity | FSMA Requirement |
|-------------|---------|----------|------------------|
| Flooding | >4" rain in 7 days | CRITICAL | Wait 9 days before harvest |
| Wildlife | Seasonal (spring/fall) | MEDIUM | Inspect fields before harvest |
| Temperature Abuse | >41°F in cooler | HIGH | Document, test product |
| Equipment | Contaminated tools | MEDIUM | Sanitize before use |

#### Harvest Food Safety Guidance

Crop-specific checklists for:
- **Pre-Harvest:** Field inspection, worker hygiene, equipment sanitation
- **During Harvest:** Handling practices, container sanitation, temperature control
- **Post-Harvest:** Washing, cooling, storage, traceability

#### Example: Spray Guidance Request

```javascript
const guidance = getSprayGuidance({
  spray: 'Spinosad',
  crop: 'Lettuce',
  harvestDate: '2026-06-15',
  applicationDate: '2026-06-10'
});

// Response:
{
  "canApply": false,
  "reason": "PHI violation - harvest date is only 5 days after application",
  "phi": 1,
  "rei": 4,
  "warnings": [
    { "type": "BEE_TOXICITY", "message": "Apply in evening when bees not foraging" }
  ],
  "recommendation": "Wait until 2026-06-14 to harvest, or use Bt instead (0-day PHI)"
}
```

---

### PHI DEADLINE TRACKER

**File:** `apps_script/PHIDeadlineTracker.js`

Dedicated food safety compliance automation for spray tracking.

#### Overview

Every spray application creates a PHI deadline. Miss it, and you either:
- Harvest non-compliant produce (illegal)
- Delay harvest (lost revenue)

This module tracks every spray and alerts you proactively.

#### Key Functions

| Function | Description | API Endpoint |
|----------|-------------|--------------|
| `logSprayApplication()` | Log spray with auto PHI calculation | `?action=logSpray` |
| `getActivePHIDeadlines()` | All active deadlines sorted by urgency | `?action=getDeadlines` |
| `canHarvestCrop()` | Instant harvest clearance check | `?action=canHarvest` |
| `generateDailyPHIAlerts()` | Notification text for email/SMS | `?action=getDailyAlerts` |
| `generateSprayComplianceReport()` | Audit-ready documentation | `?action=getComplianceReport` |

#### Spray Logging

```javascript
const result = logSprayApplication({
  spray: 'Copper Hydroxide',
  crop: 'Tomatoes',
  field: 'Field A, Bed 3',
  rate: '2 tbsp/gallon',
  notes: 'Preventive for early blight'
});

// Response:
{
  "success": true,
  "record": {
    "spray": "Copper Hydroxide",
    "crop": "Tomatoes",
    "applicationDate": "2026-06-10",
    "phi": 0,
    "phiDeadline": "2026-06-10",
    "rei": 48,
    "reiEnd": "2026-06-12 08:00"
  },
  "warnings": [],
  "message": "Spray logged. Workers may re-enter after 2026-06-12 08:00."
}
```

#### Harvest Clearance Check

Before any harvest, check clearance:

```javascript
const check = canHarvestCrop('Tomatoes', 'Field A, Bed 3');

// If clear:
{ "canHarvest": true, "status": "CLEARED", "message": "Tomatoes is CLEARED for harvest." }

// If blocked:
{
  "canHarvest": false,
  "status": "BLOCKED",
  "message": "CANNOT harvest Tomatoes until PHI deadline passes.",
  "nextHarvestDate": "2026-06-12",
  "daysUntilHarvest": 2
}
```

#### Daily Alert Email

Automatic email at 6 AM with:
- CRITICAL alerts (deadline tomorrow)
- HIGH priority alerts (2-3 days)
- Crops cleared for harvest today

```
PHI DEADLINE REPORT - 2026-06-10

🚨 CRITICAL (Tomorrow):
  • Tomatoes (Field A) - Copper Hydroxide

⚠️ HIGH PRIORITY (2-3 days):
  • Peppers - harvest after 2026-06-12

✅ CLEARED FOR HARVEST:
  • Lettuce (Greenhouse 1)
```

#### Compliance Report

Generate audit-ready reports for organic certification or FSMA inspection:

```javascript
const report = generateSprayComplianceReport('2026-01-01', '2026-06-30');

// Returns:
{
  "reportPeriod": { "start": "2026-01-01", "end": "2026-06-30" },
  "summary": {
    "totalApplications": 45,
    "organicApplications": 45,
    "organicPercentage": 100
  },
  "applications": [...],
  "certificationStatement": "All 45 organic spray applications were OMRI-listed and PHI deadlines were observed."
}
```

#### SprayLog Sheet Structure

The module creates/uses a SprayLog sheet:

| Column | Description |
|--------|-------------|
| ID | Unique spray application ID |
| Spray | Product applied |
| Crop | Target crop |
| Field | Location (field/bed) |
| Rate | Application rate |
| ApplicationDate | Date applied |
| ApplicationTime | Time applied |
| PHI | Pre-harvest interval (days) |
| PHIDeadline | Earliest harvest date |
| REI | Re-entry interval (hours) |
| REIEnd | When workers can re-enter |
| Organic | OMRI listed (true/false) |
| Notes | Application notes |
| Status | ACTIVE, COMPLETED, VOIDED |

---

## SALES & CRM

### Customer Management (web_app/customer.html)
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| Customer List | All customers | `?action=getCustomers` |
| Add Customer | New customer record | `?action=addCustomer` |
| Customer Detail | View/edit customer | `?action=getCustomer` |

### Sales (web_app/sales.html)
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| New Order | Create order | `?action=createOrder` |
| Order List | View all orders | `?action=getOrders` |
| Invoice | Generate invoice | `?action=generateInvoice` |

### Driver App (web_app/driver.html)
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| Route View | Today's deliveries | `?action=getDriverRoute` |
| Complete Delivery | Mark stop complete | `?action=completeStop` |

---

## ACCOUNTING HUB

**File:** `web_app/accounting.html`

### Receipts
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| Upload Receipt | Photo capture/upload | `?action=uploadReceiptImage` |
| Manual Entry | Enter receipt details | `?action=saveReceipt` |
| Receipt List | View all receipts | `?action=getReceipts` |
| Verify Receipt | Mark as verified | `?action=verifyReceipt` |

### Reports
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| P&L Statement | Profit/Loss report | `?action=generateProfitLossStatement` |
| Schedule F | IRS farm tax report | `?action=generateScheduleFReport` |

### Accountant Docs
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| Import Emails | Pull from accountant | `?action=importAccountantEmails` |
| View Docs | See imported documents | `?action=getAccountantDocs` |

### Grants
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| Grant List | Track all grants | `?action=getGrants` |
| Link Expenses | Connect receipts to grants | `?action=linkReceiptToGrant` |

---

## ADMIN FUNCTIONS

**File:** `web_app/admin.html`

### User Management
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| User List | All system users | `?action=getUsers` |
| Add User | Create new user | `?action=createUser` |
| Edit Permissions | Modify access | `?action=updateUserPermissions` |
| Reset PIN | Reset employee PIN | `?action=resetUserPIN` |

### System
| Function | Description | API Endpoint |
|----------|-------------|--------------|
| Health Check | System status | `?action=healthCheck` |
| Audit Log | View all actions | `?action=getAuditLog` |
| Active Sessions | Current logins | `?action=getActiveSessions` |

---

## API REFERENCE

### Base URL
```
https://script.google.com/macros/s/AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp/exec
```

### Key Endpoints (v362)

#### Universal Sheet Access
| Endpoint | Purpose |
|----------|---------|
| `?action=listSheets` | List all 201 sheets in the spreadsheet |
| `?action=getSheetData&sheetName=NAME` | Read any sheet by name |
| `?action=getSheetData&sheetName=NAME&limit=50&offset=0` | Paginated access |

#### Field Management
| Endpoint | Purpose |
|----------|---------|
| `?action=addField` | Add new field with auto-generated beds |

**addField Parameters:**
- `fieldId` - Unique field ID (e.g., Z1, CL)
- `name` - Field name (optional)
- `length` - Length in feet
- `width` - Width in feet
- `type` - Veg, Floral, or Perennial
- `bedWidth` - Bed width in inches (default 30)
- `pathWidth` - Path width in inches (default 18)
- `numBeds` - Manual override for bed count (optional)

### Request Format
```
GET: ?action=functionName&param1=value1&param2=value2
POST: Body as JSON, action in query string
```

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description"
}
```

---

## GOOGLE SHEETS

### Core Sheets
| Sheet | Purpose |
|-------|---------|
| USERS | User accounts and permissions |
| SESSIONS | Active login sessions |
| PLANNING_2026 | Crop planning data (474 rows) |
| CUSTOMERS | Customer records |
| ORDERS | Sales orders |

### Field & Bed Sheets
| Sheet | Purpose |
|-------|---------|
| REF_Fields | All field definitions (24+ fields) |
| REF_Beds | All bed definitions (212 beds) |
| REF_Crops | Crop reference data |

### Financial Sheets
| Sheet | Purpose |
|-------|---------|
| PLAID_ITEMS | Connected bank institutions |
| PLAID_ACCOUNTS | Bank account details |
| PLAID_TRANSACTIONS | Transaction history |

### Accounting Sheets
| Sheet | Purpose |
|-------|---------|
| ACC_RECEIPTS | Receipt records |
| ACC_CATEGORIES | Expense categories |
| ACC_GRANTS | Grant tracking |

---

## CHANGELOG

| Date | Change | Updated By |
|------|--------|------------|
| 2026-01-23 | Added universal sheet access (getSheetData, listSheets) - 201 sheets accessible | PM_Architect |
| 2026-01-23 | Added addField endpoint with manual bed count override | PM_Architect |
| 2026-01-23 | Added fields Z1 (70x450 Veg, 17 beds) and CL (120x20 Floral, 5 beds) | PM_Architect |
| 2026-01-23 | Updated API base URL to v362 deployment | PM_Architect |
| 2026-01-23 | Added REF_Fields and REF_Beds sheet documentation | PM_Architect |
| 2026-01-22 | Added Desktop Onboarding section with step-by-step shortcut instructions for macOS | Desktop Web Claude |
| 2026-01-22 | Added Farm Intelligence System (~1,800 lines): Morning Brief Generator, Smart Succession Planner, Food Safety Intelligence, PHI Deadline Tracker | Don_Knowledge_Base Claude |
| 2026-01-21 | Initial manual created | PM Claude |

---

## MAINTENANCE

This manual should be updated whenever:
- New features are added
- Existing functions change
- API endpoints are modified
- New pages are created

**Update Process:**
1. Document the change in CHANGELOG
2. Update relevant section
3. Verify API endpoints are accurate
4. Update version number

---

*Tiny Seed OS - State of the Art Farm Management*
