# Tiny Seed OS — Data Contracts & Metric Registry

> **Version:** 1.0.0
> **Created:** 2026-02-24
> **Owner:** PM_Architect
> **Purpose:** Single source of truth for every metric, data flow, and API contract in the system.
> **Inspired by:** Netflix Upper Metamodel, Airbnb Minerva, Uber D3, Spotify Backstage, Open Data Contract Standard v3

---

## Why This Document Exists

On 2026-02-24, a UX audit scored the dashboard homepage 44/100. The root cause: **the same word ("overdue") was computed four different ways from four different data sources, showing 44 in one widget and 8 in another.** This wasn't a display bug — it was an architectural problem. No document existed that mapped metrics to their sources.

This document is that map. Every number shown on every dashboard traces back to an exact API endpoint, backend function, Google Sheet, and computation formula documented here. When any agent (human or AI) needs to modify a metric, they check here first.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Google Sheets — Source Tables](#2-google-sheets--source-tables)
3. [API Endpoint Contracts](#3-api-endpoint-contracts)
4. [Metric Definitions — The Registry](#4-metric-definitions--the-registry)
5. [Dashboard Data Flow Maps](#5-dashboard-data-flow-maps)
6. [Known Bugs & Data Integrity Issues](#6-known-bugs--data-integrity-issues)
7. [Enum Values — Canonical Status Lists](#7-enum-values--canonical-status-lists)
8. [Property Name Conventions](#8-property-name-conventions)
9. [Weather Data Contract](#9-weather-data-contract)
10. [Validation & Health Check System](#10-validation--health-check-system)
11. [Rules for AI Agents](#11-rules-for-ai-agents)
12. [Change Protocol](#12-change-protocol)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    GOOGLE SHEETS (Data Layer)                     │
│  PLANNING_2026 │ TASKS_2026 │ UNIFIED_TASKS │ CROPS │ BEDS │ ...│
└──────────┬──────────────┬────────────┬──────────────────────────┘
           │              │            │
           ▼              ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│               MERGED TOTAL.js (API Layer)                        │
│  getPlanningData │ getMorningBrief │ getOverdueTasks │ getBeds   │
│  getTaskPriorities │ getTodaysTasks │ getHarvestReadyCrops      │
└──────────┬──────────────┬────────────┬──────────────────────────┘
           │              │            │
           ▼              ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│               FRONTEND (Display Layer)                           │
│  index.html │ calendar.html │ manager-dashboard.html │ ...      │
│  ClientCache │ updateStats() │ loadMorningBrief() │ ...        │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│             EXTERNAL APIs (Weather, Shopify)                     │
│  Open-Meteo (client-side) │ Open-Meteo (server-side)            │
│  Shopify Admin API │ QuickBooks                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principle: One Metric, One Computation, One Source

Every metric displayed to the user MUST be computed by exactly ONE function from exactly ONE data source. If two widgets show the same concept (e.g., "overdue count"), they MUST call the same function or read the same variable — never compute independently.

---

## 2. Google Sheets — Source Tables

### 2.1 PLANNING_2026 (Crop Production Schedule)

| Column | Type | Description |
|--------|------|-------------|
| Status | String | Planting lifecycle status. See [Enum: Planting Status](#71-planting-status) |
| Crop | String | Crop name |
| Variety | String | Variety name |
| Plan_GH_Sow | Date | Planned greenhouse sow date |
| Act_GH_Sow | Date | Actual greenhouse sow date (empty = not done) |
| Plan_Field_Sow | Date | Planned direct seed date |
| Act_Field_Sow | Date | Actual direct seed date |
| Plan_Transplant | Date | Planned transplant date |
| Act_Transplant | Date | Actual transplant date |
| Target_Bed_ID | String | Assigned bed identifier |
| DTM | Integer | Days to maturity |
| Harvest_Start | Date | Expected first harvest |
| Harvest_End | Date | Expected last harvest |

**Property name from API:** Backend sends `Status` (PascalCase from sheet header).
**Frontend must use:** `p.Status` — NOT `p.STATUS`.

### 2.2 TASKS_2026 (Task Management)

| Column | Position | Type | Description |
|--------|----------|------|-------------|
| Task_ID | 0 | String | e.g., TASK-26-DIG-5695-2 |
| Batch_ID | 1 | String | Related batch |
| Crop | 2 | String | Associated crop |
| Task_Name | 3 | String | Human-readable task description |
| Category | 4 | String | Task category |
| Due_Date | 5 | Date | When task is due |
| Duration_Min | 6 | Integer | Estimated minutes |
| Status | 7 | String | See [Enum: Task Status](#72-task-status) |
| Assigned_To | 8 | String | Employee name |
| Bed_ID | 9 | String | Related bed |
| Completed_Date | 10 | Date | When completed |
| Completed_By | 11 | String | Who completed it |
| Notes | 12 | String | Notes |
| Auto_Generated | 13 | Boolean | Whether auto-created |
| Created_At | 14 | DateTime | Creation timestamp |

### 2.3 UNIFIED_TASKS (Unified Task View)

Aggregates tasks from multiple sources. Queried by `getUnifiedTasks()` (line 110958).

| Field | Type | Description |
|-------|------|-------------|
| taskId | String | Unique ID |
| title | String | Task title |
| Due_Date | Date | Due date |
| status | String | Task status |
| source | String | Which system created it |

### 2.4 CROPS / Production (Crop Reference)

Queried by `getHarvestReadyCrops()` (line 3618). Contains crop profiles with harvest windows.

### 2.5 BEDS (Field Beds)

Queried by `getBeds()`. Contains bed IDs, field assignments, dimensions.

### 2.6 SEEDLING_SALES

| Column | Type | Description |
|--------|------|-------------|
| Date | DateTime | Sale timestamp |
| Customer_Name | String | Customer name |
| Plant_Name | String | Seedling name |
| Variety | String | Variety |
| Quantity | Integer | Number ordered |
| Price_Each | Number | Unit price |
| Total | Number | Line total |
| Pickup_Location | String | Where to pick up |
| Pickup_Date | Date | When to pick up |
| Order_ID | String | e.g., SEED-2026-0001 |

### 2.7 SEEDLING_ORDERS (Order Summary)

| Column | Type | Description |
|--------|------|-------------|
| Order_ID | String | SEED-2026-XXXX |
| Date | DateTime | Order timestamp |
| Customer_Name | String | Full name |
| Email | String | Customer email |
| Channel | String | "Presale" or "Wholesale Presale" |
| Total_Items | Integer | Item count |
| Total_Amount | Number | Dollar total |
| Shopify_Draft_Order_ID | String | From Shopify API |
| Invoice_URL | String | Shopify checkout link |
| Invoice_Status | String | Pending / Paid / Cancelled |
| Pick_Status | String | Not Started / In Progress / Complete |
| Pack_Status | String | Same |
| Pickup_Location | String | Selected location |
| Pickup_Date | Date | Selected date |

---

## 3. API Endpoint Contracts

### 3.1 `getMorningBrief`

**Backend function:** `getMorningBrief()` (line 33605) → delegates to `getMorningBriefFast()` (line 98925)

**Response schema:**
```json
{
  "success": true,
  "sections": {
    "tasks": {
      "today": [{ "task": "string", "status": "string", "assigned": "string", "priority": "string" }],
      "overdue": 8,
      "todayCount": 5
    },
    "harvest": {
      "ready": [{ "crop": "string", "bed": "string", "daysReady": 0 }],
      "count": 0
    },
    "weather": {
      "current": { "temp": 45, "description": "Partly cloudy" },
      "forecast": { "high": 52, "low": 34 },
      "alerts": ["string"]
    },
    "alerts": ["string"],
    "tips": ["string"]
  }
}
```

**Internal calls:**
| Call | Sheet | Cap/Limit |
|------|-------|-----------|
| `getTodaysTasks()` (line 3061) | TASKS_2026 | Max 15, returns first 5 via slice |
| `getOverdueTasks()` (line 3112) | TASKS_2026 | **HARD CAP: 10** (line 3141) |
| `getHarvestReadyCrops()` (line 3618) | CROPS | Max 10 |
| `getWeather({})` (line 98984) | Open-Meteo (server-side) | — |

**KNOWN ISSUE:** `getTodaysTasks()` returns `{task, status, assigned, priority}` but does NOT return `crop`, `type`, `urgency`, or `overdue` fields. The frontend expects all of these.

### 3.2 `getPlanningData`

**Backend function:** `getPlanningData()` (line 24216) or `getPlanningDataFast()` (line 98725)

**Response schema:**
```json
{
  "success": true,
  "data": [{
    "Status": "string",
    "Crop": "string",
    "Variety": "string",
    "Plan_GH_Sow": "date-string",
    "Act_GH_Sow": "date-string|empty",
    "Plan_Field_Sow": "date-string",
    "Act_Field_Sow": "date-string|empty",
    "Plan_Transplant": "date-string",
    "Act_Transplant": "date-string|empty",
    "Target_Bed_ID": "string",
    "DTM": "number"
  }]
}
```

**Sheet:** PLANNING_2026

**CRITICAL:** Properties use PascalCase (`Status`, `Crop`, `Variety`), NOT UPPERCASE.

### 3.3 `getOverdueTasks`

**Backend function:** `getOverdueTasks()` (line 3112)

**Sheet:** TASKS_2026 (or `Tasks` or `TASKS`)

**Filter logic:**
1. `due_date < today`
2. Status does NOT contain 'complete', 'done', 'skip', or 'cancel' (case-insensitive)
3. `daysOverdue <= 30`
4. **HARD LIMIT: 10 tasks** (`overdue.length < 10` at line 3141)

**Response:** Array of `{ taskId, task, dueDate, status, daysOverdue, assigned, priority }`

### 3.4 `getTaskPriorities`

**Backend function:** `getUnifiedTasks()` (line 110958)

**Sheet:** UNIFIED_TASKS

**Filter logic:** Tasks where `Due_Date < today`, status not DONE/CANCELLED.

**Response:** Array of unified task objects.

### 3.5 `getBeds`

**Backend function:** `getBeds()`

**Sheet:** BEDS

**Response:** Array of bed objects with `id`, `field`, `dimensions`, etc.

### 3.6 `submitSeedlingOrder`

**Backend function:** `submitSeedlingOrder()` (added 2026-02-24)

**Method:** POST

**Request:**
```json
{
  "action": "submitSeedlingOrder",
  "customerName": "string",
  "email": "string",
  "phone": "string",
  "items": [{ "name": "string", "variety": "string", "quantity": 1, "price": 5.00 }],
  "pickupLocation": "string",
  "pickupDate": "string",
  "notes": "string",
  "channel": "Presale|Wholesale Presale",
  "businessName": "string (wholesale only)"
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "SEED-2026-0001",
  "invoiceUrl": "https://...",
  "shopifyDraftOrderId": "123456",
  "tasksCreated": 3,
  "errors": []
}
```

---

## 4. Metric Definitions — The Registry

Every metric that appears on any dashboard is defined here. This is the ONLY authority on how to compute each value.

### 4.1 Overdue Tasks Count

| Property | Value |
|----------|-------|
| **Metric ID** | `overdue_tasks_count` |
| **Definition** | Number of tasks past their due date that are not completed, done, skipped, or cancelled |
| **Canonical Source** | TASKS_2026 sheet via `getOverdueTasks()` API |
| **Computation** | `rows.filter(r => r.due_date < today && !['complete','done','skip','cancel'].some(s => r.status.toLowerCase().includes(s)) && daysOverdue <= 30).length` |
| **Known Cap** | Backend hard-limits to 10. **FIX NEEDED:** Remove cap or increase to 100. |
| **Where displayed** | Morning Brief overdue stat, Overdue Tasks section badge, Alert banner |
| **RULE** | ALL locations MUST use the same global `overdueTasks[]` array. Alert banner must NOT independently compute from PLANNING_2026. |

### 4.2 Overdue Planting Actions Count

| Property | Value |
|----------|-------|
| **Metric ID** | `overdue_planting_actions` |
| **Definition** | Number of planting actions (GH sow, field sow, transplant) that are past their planned date with no actual date recorded |
| **Canonical Source** | PLANNING_2026 sheet via `getPlanningData()` |
| **Computation** | Count of plantings where: (`Plan_GH_Sow < today && !Act_GH_Sow && Status === 'Planned'`) OR (`Plan_Transplant < today && !Act_Transplant && Status === 'Sown'`) OR (`Plan_Field_Sow < today && !Act_Field_Sow && Status === 'Planned'`) |
| **Where displayed** | Alert banner (currently labeled "overdue tasks" — **MUST be relabeled "overdue planting actions"**) |
| **RULE** | This is a DIFFERENT metric from `overdue_tasks_count`. Must never share the same label. |

### 4.3 Active Plantings Count

| Property | Value |
|----------|-------|
| **Metric ID** | `active_plantings_count` |
| **Definition** | Number of plantings currently in an active lifecycle stage |
| **Canonical Source** | PLANNING_2026 via `getPlanningData()` |
| **Computation** | `plantings.filter(p => ['sown','planted','harvesting','growing','scheduled','seeded','germinating'].includes((p.Status \|\| '').toLowerCase())).length` |
| **CRITICAL BUG** | Frontend uses `p.STATUS` but backend sends `p.Status`. Fix: use `p.Status`. |
| **Where displayed** | Stats tile `#statActive` |

### 4.4 Harvest Ready Count

| Property | Value |
|----------|-------|
| **Metric ID** | `harvest_ready_count` |
| **Definition** | Number of crops within their harvest window |
| **Canonical Source (stats tile)** | PLANNING_2026 — `plantings.filter(p => (p.Status \|\| '').toLowerCase() === 'harvesting').length` |
| **Canonical Source (morning brief)** | CROPS sheet via `getHarvestReadyCrops()` — crops with harvest date within -7 to +3 days of today |
| **CONFLICT** | Two different sources. Must align: use ONE source for both. Recommendation: Use `getHarvestReadyCrops()` for all locations. |
| **Where displayed** | Stats tile `#statHarvest`, Morning Brief harvest section |

### 4.5 Tasks This Week

| Property | Value |
|----------|-------|
| **Metric ID** | `tasks_this_week` |
| **Definition** | Number of planting actions due in the next 7 days that haven't been completed |
| **Canonical Source** | PLANNING_2026 via `getPlanningData()` |
| **Computation** | For each planting, count: (Plan_GH_Sow in next 7d && !Act_GH_Sow) + (Plan_Field_Sow in next 7d && !Act_Field_Sow) + (Plan_Transplant in next 7d && !Act_Transplant) |
| **Where displayed** | Stats tile `#statTasks` |

### 4.6 Bed Utilization Percentage

| Property | Value |
|----------|-------|
| **Metric ID** | `bed_utilization_pct` |
| **Definition** | Percentage of beds currently in use |
| **Canonical Source** | PLANNING_2026 + BEDS |
| **Computation** | `uniqueBeds(plantings where Status in active statuses) / totalBeds * 100` |
| **CRITICAL BUG** | Same `p.STATUS` vs `p.Status` issue. Fix: use `p.Status`. |
| **Where displayed** | Stats tile `#statUtilization` |

### 4.7 Today's Tasks

| Property | Value |
|----------|-------|
| **Metric ID** | `todays_tasks` |
| **Definition** | Tasks due today that are not yet complete |
| **Canonical Source** | TASKS_2026 via `getTodaysTasks()` (line 3061) |
| **Response fields** | `{ task, status, assigned, priority }` |
| **MISSING FIELDS** | Does NOT include: `crop`, `type`, `urgency`, `overdue`. Frontend expects these. **FIX NEEDED.** |
| **Where displayed** | Morning Brief "Top Priorities", Today's Work section |

### 4.8 Weather — Current Temperature

| Property | Value |
|----------|-------|
| **Metric ID** | `weather_current_temp` |
| **Definition** | Current temperature at farm location |
| **Canonical Source** | Open-Meteo API, `current.temperature_2m` |
| **Coordinates** | lat=40.7020, lon=-80.2887 (Rochester, PA area) |
| **Unit** | Fahrenheit |
| **Where displayed** | Weather widget header |

### 4.9 Frost Warning

| Property | Value |
|----------|-------|
| **Metric ID** | `frost_warning` |
| **Definition** | Alert when temperature is at or below freezing |
| **CONFLICT** | Frontend threshold: `<= 32°F` (actual freezing). Backend threshold: `<= 36°F` (generous frost risk). |
| **RULE** | Standardize to `<= 36°F` for frost WARNING (risk), `<= 32°F` for frost ALERT (danger). Use same thresholds everywhere. |
| **Where displayed** | Alert banner, Morning Brief alerts |

---

## 5. Dashboard Data Flow Maps

### 5.1 index.html (Homepage Dashboard) — Complete Flow

```
DOMContentLoaded
├── checkConnection()                          → tests API alive
├── loadAllData()
│   ├── ClientCache.fetch('getPlanningData')   → PLANNING_2026 sheet
│   │   ├── allPlantings = data.data           → stored in global array
│   │   ├── updateStats()                      → reads allPlantings
│   │   │   ├── #statActive (Active Plantings) → p.Status filter ⚠️ BUG: reads p.STATUS
│   │   │   ├── #statTasks (Tasks This Week)   → Plan dates in next 7 days
│   │   │   ├── #statHarvest (Harvest Ready)   → p.Status === 'harvesting' ⚠️ BUG
│   │   │   └── #statUtilization (Bed %)       → unique beds / total beds ⚠️ BUG
│   │   ├── loadTodaysTasks()
│   │   │   ├── getTaskPriorities API          → UNIFIED_TASKS sheet
│   │   │   ├── getOverdueTasks API            → TASKS_2026 sheet (cap 10)
│   │   │   ├── merge + dedup on taskId
│   │   │   ├── overdueTasks = [merged]        → stored in global array
│   │   │   ├── renderOverdueTasks()           → #overdueCountBadge
│   │   │   └── syncBriefOverdueCount()        → overwrites Morning Brief stat
│   │   └── checkTaskWarnings()                → PLANNING_2026 (client-side)
│   │       ├── Plan_GH_Sow overdue?           → adds to warnings
│   │       ├── Plan_Transplant overdue?        → adds to warnings
│   │       └── updateWarningsBar()            → #warningsSummaryText ("44 overdue")
│   └── ClientCache.fetch('getBeds')           → BEDS sheet
│       └── beds = data.data
│
├── loadMorningBrief()
│   ├── getMorningBrief API                    → TASKS_2026 + CROPS + weather
│   │   ├── sections.tasks.today               → Top Priorities (max 5)
│   │   ├── sections.tasks.overdue             → overdue count (from API)
│   │   ├── sections.harvest                   → harvest ready crops
│   │   ├── sections.weather                   → server-side weather
│   │   └── sections.alerts / tips             → frost/rain alerts
│   └── renders into #morningBrief
│
└── requestIdleCallback
    └── loadWeather()                          → Open-Meteo (CLIENT-SIDE, separate call)
        ├── #weatherTemp                       → current.temperature_2m
        ├── #weatherHumidity                   → relative_humidity_2m
        └── checkWeatherWarnings()             → frost if <= 32°F
```

### 5.2 The Overdue Count Problem (Visualized)

```
PLANNING_2026 sheet                    TASKS_2026 sheet
┌──────────────────────┐              ┌──────────────────────┐
│ 500+ planting rows   │              │ ~50 explicit tasks   │
│ with Plan_ dates     │              │ with Due_Date        │
└──────────┬───────────┘              └──────────┬───────────┘
           │                                      │
     checkTaskWarnings()                   getOverdueTasks()
     (client-side filter)                  (server-side, cap 10)
           │                                      │
           ▼                                      ▼
    44 warnings                              8 overdue tasks
           │                                      │
           ▼                                      ▼
    Alert Banner:                          Overdue Section:
    "44 overdue tasks"                     "8 tasks"
    ⚠️ MISLABELED                         ✓ Correct
```

**The fix:** Alert banner should say "44 overdue planting actions" and link to calendar. Overdue section correctly shows task count.

---

## 6. Known Bugs & Data Integrity Issues

### BUG-001: Property Name Case Mismatch (CRITICAL)

| Field | Severity | Status |
|-------|----------|--------|
| **Location** | `index.html` lines 7219-7244 | |
| **Bug** | `p.STATUS` used but backend sends `p.Status` | |
| **Impact** | 0 Active Plantings, 0 Harvest Ready, 0% Bed Utilization | |
| **Fix** | Change `p.STATUS` → `p.Status` in `updateStats()` | |
| **Severity** | CRITICAL — 3 stats tiles show wrong data | |
| **Status** | IDENTIFIED — awaiting fix | |

### BUG-002: getOverdueTasks Hard Cap of 10

| Field | Severity | Status |
|-------|----------|--------|
| **Location** | `MERGED TOTAL.js` line 3141 | |
| **Bug** | `overdue.length < 10` silently truncates results | |
| **Impact** | Even with 50 overdue tasks, only 10 shown | |
| **Fix** | Remove cap or increase to 200, add `totalCount` to response | |
| **Severity** | HIGH — silent data loss | |
| **Status** | IDENTIFIED — awaiting fix | |

### BUG-003: getTodaysTasks Missing Fields

| Field | Severity | Status |
|-------|----------|--------|
| **Location** | `MERGED TOTAL.js` `getTodaysTasks()` (line 3061) | |
| **Bug** | Returns `{task, status, assigned, priority}` only | |
| **Impact** | "Unknown crop" in Top Priorities, all items show "Scheduled" | |
| **Fix** | Add `crop`, `type`, `urgency`, `overdue` to response object | |
| **Severity** | HIGH — confusing display | |
| **Status** | IDENTIFIED — awaiting fix | |

### BUG-004: Inconsistent Frost Thresholds

| Field | Severity | Status |
|-------|----------|--------|
| **Location** | Frontend: `index.html` line 9521, Backend: `MERGED TOTAL.js` line 29131 | |
| **Bug** | Frontend warns at ≤32°F, backend warns at ≤36°F | |
| **Impact** | Conflicting frost alerts between widgets | |
| **Fix** | Standardize: WARNING at ≤36°F, ALERT at ≤32°F, use same levels everywhere | |
| **Severity** | MEDIUM — inconsistent UX | |
| **Status** | IDENTIFIED — awaiting fix | |

### BUG-005: Overdue Label Mismatch

| Field | Severity | Status |
|-------|----------|--------|
| **Location** | `index.html` `updateWarningsBar()` line 9614 | |
| **Bug** | Alert banner says "overdue tasks" but counts from PLANNING_2026 planting actions | |
| **Impact** | 44 (planting actions) displayed next to 8 (actual tasks) — user confusion | |
| **Fix** | Relabel to "overdue planting actions" or unify data source | |
| **Severity** | HIGH — data credibility crisis | |
| **Status** | IDENTIFIED — awaiting fix | |

### BUG-006: Dual Weather API Calls

| Field | Severity | Status |
|-------|----------|--------|
| **Location** | Client: `index.html` line 9357, Server: `MERGED TOTAL.js` line 98984 | |
| **Bug** | Two independent calls to Open-Meteo can return different data | |
| **Impact** | Weather widget may disagree with Morning Brief weather | |
| **Fix** | Use server-side weather from `getMorningBrief` as single source; OR use client-side for all | |
| **Severity** | LOW — usually same data, timing difference | |
| **Status** | IDENTIFIED — awaiting fix | |

---

## 7. Enum Values — Canonical Status Lists

### 7.1 Planting Status (PLANNING_2026.Status)

| Value | Meaning | Active? |
|-------|---------|---------|
| `Planned` | Scheduled but not started | No |
| `Scheduled` | Same as Planned | No |
| `Sown` | Seeds planted (GH or field) | Yes |
| `Seeded` | Same as Sown | Yes |
| `Germinating` | Seeds sprouting | Yes |
| `Growing` | Plant is actively growing | Yes |
| `Planted` | Transplanted to field | Yes |
| `Transplanted` | Same as Planted | Yes |
| `Harvesting` | In harvest window | Yes |
| `Complete` | Season finished | No |
| `Failed` | Crop failed | No |
| `Cancelled` | Cancelled before starting | No |

**Active statuses (for metric computation):** `sown`, `seeded`, `germinating`, `growing`, `planted`, `transplanted`, `harvesting`, `scheduled`

**RULE:** Always compare lowercase: `(p.Status || '').toLowerCase()`

### 7.2 Task Status (TASKS_2026.Status)

| Value | Meaning | Complete? |
|-------|---------|-----------|
| `Pending` | Not started | No |
| `In Progress` | Being worked on | No |
| `Complete` | Finished | Yes |
| `Done` | Same as Complete | Yes |
| `Skipped` | Intentionally skipped | Yes |
| `Cancelled` | Cancelled | Yes |

**Completion check:** `status.toLowerCase().includes('complete') || status.toLowerCase().includes('done') || status.toLowerCase().includes('skip') || status.toLowerCase().includes('cancel')`

### 7.3 Order Status

| Value | Meaning |
|-------|---------|
| `Pending` | Placed, awaiting processing |
| `Confirmed` | Accepted by farm |
| `Packed` | Ready for delivery/pickup |
| `Delivered` | Completed |
| `Cancelled` | Cancelled |

### 7.4 Invoice Status (SEEDLING_ORDERS)

| Value | Meaning |
|-------|---------|
| `Pending` | Invoice sent, not paid |
| `Paid` | Payment received |
| `Cancelled` | Order cancelled |

### 7.5 Pick/Pack Status (SEEDLING_ORDERS)

| Value | Meaning |
|-------|---------|
| `Not Started` | No work done |
| `In Progress` | Being worked on |
| `Complete` | Finished |

---

## 8. Property Name Conventions

### The Golden Rule

**Backend sends PascalCase properties from Google Sheet headers.** Frontend must read them as PascalCase.

| Sheet Column Header | Backend Property | Frontend MUST Use | Frontend MUST NOT Use |
|---------------------|------------------|-------------------|-----------------------|
| Status | `Status` | `p.Status` | `p.STATUS`, `p.status` |
| Crop | `Crop` | `p.Crop` | `p.CROP` |
| Variety | `Variety` | `p.Variety` | `p.VARIETY` |
| Plan_GH_Sow | `Plan_GH_Sow` | `p.Plan_GH_Sow` | `p.PLAN_GH_SOW` |
| Target_Bed_ID | `Target_Bed_ID` | `p.Target_Bed_ID` | `p.TARGET_BED_ID` |
| Due_Date | `Due_Date` or `dueDate` | Check API response | — |

**When in doubt:** Read the API response in browser DevTools and use the exact property name returned.

---

## 9. Weather Data Contract

### 9.1 Single Source Decision

**Decision:** Use client-side Open-Meteo call as the primary weather source for the dashboard. The server-side call in `getMorningBrief` provides the forecast low for frost tips.

### 9.2 API Configuration

```
Endpoint: https://api.open-meteo.com/v1/forecast
Coordinates: lat=40.7020, lon=-80.2887
Parameters:
  current: temperature_2m, relative_humidity_2m, wind_speed_10m, weather_code
  daily: weather_code, temperature_2m_max, temperature_2m_min, precipitation_probability_max
  temperature_unit: fahrenheit
  wind_speed_unit: mph
  timezone: auto
  forecast_days: 5
```

### 9.3 Alert Thresholds (Standardized)

| Condition | Threshold | Alert Level | Label |
|-----------|-----------|-------------|-------|
| Frost WARNING | Temp ≤ 36°F OR Forecast Low ≤ 36°F | Warning (amber) | "Frost risk tonight" |
| Frost ALERT | Current Temp ≤ 32°F | Critical (red) | "FREEZING — protect crops!" |
| Heat WARNING | Temp ≥ 90°F | Warning (amber) | "Heat stress — water extra" |
| Heat ALERT | Temp ≥ 95°F | Critical (red) | "Extreme heat — shade crops" |
| High Wind | Wind ≥ 25 mph | Warning (amber) | "High winds — secure covers" |
| Storm | Weather code 95/96 | Critical (red) | "Thunderstorm warning" |

---

## 10. Validation & Health Check System

### 10.1 Frontend Contract Validation (Planned)

A lightweight `ContractValidator` class will intercept API responses and check them against the schemas defined in this document. Violations are logged to console and optionally reported.

```javascript
// Future: contracts/contract-validator.js
// Validates API responses match expected schemas
// Logs violations but does not block (warn mode first)
```

### 10.2 Backend Data Health Checks (Planned)

An Apps Script time-driven trigger running hourly:
- Checks row counts per sheet (anomaly detection)
- Validates no duplicate IDs
- Checks status values against canonical enums
- Validates data freshness (most recent entry within expected window)
- Alerts via email if checks fail

### 10.3 Metric Consistency Checks (Planned)

A `MetricRegistry` will be the single computation point for all metrics. Every dashboard widget calls `MetricRegistry.compute('metric_name', data)` instead of computing inline.

This prevents the core problem: two widgets computing "overdue" differently.

---

## 11. Rules for AI Agents

### RULE 1: Check This Document Before Modifying Any API Response

If you are changing the response format of ANY API endpoint:
1. Read this document first
2. Check if the endpoint has a contract in Section 3
3. Update the contract FIRST
4. Then update the code
5. Then update all frontend consumers

### RULE 2: One Metric, One Computation

If you need to display a metric, check Section 4 first. If the metric exists, use the defined computation. Do NOT create an alternative computation.

### RULE 3: Use Canonical Property Names

Always reference Section 8 for property names. Never use `p.STATUS` when the backend sends `p.Status`.

### RULE 4: Use Canonical Status Values

Always reference Section 7 for valid status values. Never hardcode a status string without checking the enum.

### RULE 5: Document New Metrics

If you create a new metric that appears on any dashboard, add it to Section 4 with:
- Metric ID
- Definition (plain English)
- Canonical source (which sheet, which API)
- Computation formula
- Where displayed
- Any caps or limits

### RULE 6: Document New Endpoints

If you create a new API endpoint, add it to Section 3 with:
- Backend function name and line number
- Request schema
- Response schema
- Which sheets it reads from
- Any limits or caps

---

## 12. Change Protocol

### When Modifying a Metric:

1. Update the metric definition in Section 4
2. Update any affected endpoint contracts in Section 3
3. Update the code (backend then frontend)
4. Verify all locations that display this metric still work
5. Update CHANGE_LOG.md

### When Adding a New Sheet Column:

1. Add to the relevant table in Section 2
2. If exposed via API, update the endpoint contract in Section 3
3. Update any metric definitions that use this data

### When Renaming a Property:

1. Update Section 8 (Property Name Conventions)
2. Search all frontend files for the old name
3. Update all references
4. Test all affected dashboards

### Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-24 | PM_Architect | Initial creation from deep audit of all data flows |

---

## Appendix A: API Endpoint Index

| Endpoint | Method | Sheet(s) | Description |
|----------|--------|----------|-------------|
| `getMorningBrief` | GET | TASKS_2026, CROPS, Open-Meteo | Morning briefing data |
| `getPlanningData` | GET | PLANNING_2026 | All planting schedule data |
| `getOverdueTasks` | GET | TASKS_2026 | Overdue tasks (cap 10) |
| `getTaskPriorities` | GET | UNIFIED_TASKS | Prioritized task list |
| `getBeds` | GET | BEDS | All bed definitions |
| `getTodaysTasks` | GET | TASKS_2026 | Tasks due today |
| `getHarvestReadyCrops` | GET | CROPS | Crops in harvest window |
| `submitSeedlingOrder` | POST | SEEDLING_SALES, SEEDLING_ORDERS, TASKS_2026, Shopify | Full seedling order workflow |
| `logSeedlingSale` | POST | SEEDLING_SALES | Individual seedling sale |

## Appendix B: Frontend File → API Mapping

| Frontend File | APIs Called | Metrics Displayed |
|---------------|------------|-------------------|
| `index.html` | getPlanningData, getBeds, getMorningBrief, getTaskPriorities, getOverdueTasks, Open-Meteo | overdue_tasks_count, overdue_planting_actions, active_plantings_count, harvest_ready_count, tasks_this_week, bed_utilization_pct, weather_current_temp, frost_warning |
| `calendar.html` | getPlanningData, getBeds | active_plantings_count, tasks_this_week |
| `manager-dashboard.html` | getMorningBrief, getOverdueTasks, getPlanningData | overdue_tasks_count, active_plantings_count |
| `seedling-presale-2026.html` | submitSeedlingOrder | — |
| `seedling-wholesale-2026.html` | submitSeedlingOrder | — |

---

**This document is the single source of truth for all data contracts. Agents: read before building. Humans: reference before questioning numbers.**
