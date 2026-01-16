# COSTING MODE SPECIFICATION
## Tiny Seed OS - Labor Cost Tracking System

**Created:** 2026-01-16
**Author:** Mobile_Employee Claude
**Status:** DRAFT - Ready for PM Review

---

## OVERVIEW

Costing Mode enables detailed labor tracking from seed to sale for selected plantings, allowing the farm to calculate true production costs per crop.

**Owner's Vision:** "Administrator can let the crew know that any task associated with a planting from seed to sell is documented."

---

## HOW IT WORKS

### Admin Flow
1. Admin opens planting details (in planning.html or succession.html)
2. Toggles "Enable Costing Mode" for that Batch_ID
3. System flags planting in database: `Costing_Mode = TRUE`
4. All employees see "Cost Tracked" indicator on related tasks

### Employee Flow
1. Employee opens task list
2. Tasks with costing mode show special badge: `[$]` or clock icon
3. When starting task, optional "Start Timer" button appears
4. On completion, time is logged automatically
5. Employee sees: "Time logged: 23 min - Thanks!"

---

## DATA MODEL

### New Sheet: TIMELOG

| Column | Type | Description |
|--------|------|-------------|
| Log_ID | String | Auto-generated unique ID |
| Batch_ID | String | Links to planting (foreign key) |
| Employee_ID | String | Who did the work |
| Employee_Name | String | For easy reading |
| Task_Type | String | seeding, transplant, weed, harvest, pack, deliver |
| Start_Time | DateTime | When work started |
| End_Time | DateTime | When work ended |
| Duration_Min | Number | Calculated: (End - Start) in minutes |
| Location | String | Field ID, GH, Pack House, etc. |
| Notes | String | Optional employee notes |
| Costing_Mode | Boolean | TRUE if tracked for cost analysis |
| Created_At | DateTime | Log creation timestamp |

### Modified Sheet: Planning (add columns)

| New Column | Type | Description |
|------------|------|-------------|
| Costing_Mode | Boolean | TRUE = track all labor |
| Total_Labor_Min | Number | Sum of all TIMELOG entries |
| Labor_Cost | Currency | Total_Labor_Min * avg hourly rate |

### Employee Sheet (reference)

| Column | Used For |
|--------|----------|
| Employee_ID | Link to TIMELOG |
| Hourly_Rate | Calculate labor cost |
| Role | Determine rate tier |

---

## TASK TYPES FOR COSTING

Each maps to a lifecycle stage:

| Task_Type | Stage | Description |
|-----------|-------|-------------|
| seeding | GH Sow | Time to seed trays |
| transplant | Transplant | Time to transplant to field |
| weed | Cultivation | Weeding/cultivation time |
| harvest | First Harvest | Time to harvest crop |
| pack | Post-Harvest | Washing, packing, labeling |
| deliver | Delivery | Delivery time (driver) |
| scout | Maintenance | Scouting/pest monitoring |
| irrigate | Maintenance | Irrigation management |

---

## UI DESIGN

### Admin: Enable Costing Mode

```
┌─────────────────────────────────────────────┐
│ Batch: TOM-2026-001                         │
│ Crop: Tomato - Cherokee Purple              │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ [$] COSTING MODE                    │    │
│  │                                     │    │
│  │ Track all labor for this planting   │    │
│  │                                     │    │
│  │    ┌──────────┐  ┌──────────┐      │    │
│  │    │   OFF    │  │ ▶ ON ◀  │      │    │
│  │    └──────────┘  └──────────┘      │    │
│  │                                     │    │
│  │ When ON: All tasks log time        │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

### Employee: Task with Costing Mode

```
┌─────────────────────────────────────────────┐
│                                             │
│  [$] COST TRACKED                           │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │  🍅 Transplant Tomatoes             │    │
│  │  Cherokee Purple - 120 plants       │    │
│  │  → Field M-05, Bed 3               │    │
│  │                                     │    │
│  │  ┌─────────────────────────────┐   │    │
│  │  │                             │   │    │
│  │  │    ⏱️ START TIMER           │   │    │
│  │  │    (Optional)               │   │    │
│  │  │                             │   │    │
│  │  └─────────────────────────────┘   │    │
│  │                                     │    │
│  │  ╔═══════════════════════════════╗ │    │
│  │  ║                               ║ │    │
│  │  ║     ✓ MARK COMPLETE          ║ │    │
│  │  ║                               ║ │    │
│  │  ╚═══════════════════════════════╝ │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

### Employee: Timer Running

```
┌─────────────────────────────────────────────┐
│                                             │
│  [$] TRACKING TIME                          │
│                                             │
│           ┌───────────────┐                 │
│           │   00:23:45    │                 │
│           │   elapsed     │                 │
│           └───────────────┘                 │
│                                             │
│  🍅 Transplant Tomatoes                     │
│  Cherokee Purple - Field M-05              │
│                                             │
│  ╔═════════════════════════════════════╗    │
│  ║                                     ║    │
│  ║      ✓ DONE - STOP TIMER           ║    │
│  ║                                     ║    │
│  ╚═════════════════════════════════════╝    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  ⏸️ Pause   │   ✖️ Cancel Timer     │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

### Completion Confirmation

```
┌─────────────────────────────────────────────┐
│                                             │
│              ✓ TASK COMPLETE                │
│                                             │
│         Time logged: 23 minutes             │
│         Employee: Maria G.                  │
│         Batch: TOM-2026-001                │
│                                             │
│              Thanks! 🌱                      │
│                                             │
│         [Continue to Next Task]             │
│                                             │
└─────────────────────────────────────────────┘
```

---

## ADMIN REPORTS

### Report 1: Planting Labor Summary

```
BATCH: TOM-2026-001 - Cherokee Purple
══════════════════════════════════════

Stage         Time      Cost
─────────────────────────────
Seeding       0:45      $11.25
Transplant    2:30      $37.50
Weeding       4:15      $63.75
Harvest       3:00      $45.00
Packing       1:30      $22.50
Delivery      0:30      $7.50
─────────────────────────────
TOTAL        12:30     $187.50

Yield: 200 lbs
Cost/lb: $0.94 labor
```

### Report 2: Employee Time by Day

```
DATE: 2026-01-15
EMPLOYEE: Maria Garcia
══════════════════════════════════════

Task                    Time
─────────────────────────────
Transplant Tomatoes     0:45
Seed Lettuce Trays      0:30
Harvest Kale            1:15
Weed Carrot Beds        2:00
─────────────────────────────
TOTAL                   4:30

Clocked: 8:00 AM - 4:30 PM
Break: 0:30
Logged vs Clocked: 4:30 / 8:00
```

### Report 3: Crop Cost Comparison

```
COST PER UNIT BY CROP (2026 Season)
══════════════════════════════════════

Crop            Labor/Unit  Rank
─────────────────────────────
Lettuce         $0.45/head   1
Tomatoes        $0.94/lb     2
Peppers         $1.20/lb     3
Carrots         $0.35/lb     4
Microgreens     $2.50/tray   5

* Lower = more efficient
```

---

## API ENDPOINTS

### Log Time Entry

```javascript
// POST to Google Apps Script
{
  action: 'logTime',
  batchId: 'TOM-2026-001',
  employeeId: 'EMP-003',
  taskType: 'transplant',
  startTime: '2026-01-15T10:00:00',
  endTime: '2026-01-15T10:45:00',
  location: 'M-05',
  notes: 'Completed 120 plants'
}
```

### Enable Costing Mode

```javascript
// POST to Google Apps Script
{
  action: 'setCostingMode',
  batchId: 'TOM-2026-001',
  enabled: true
}
```

### Get Planting Labor Summary

```javascript
// GET from Google Apps Script
{
  action: 'getLaborSummary',
  batchId: 'TOM-2026-001'
}

// Response
{
  success: true,
  data: {
    batchId: 'TOM-2026-001',
    crop: 'Tomato',
    variety: 'Cherokee Purple',
    totalMinutes: 750,
    totalCost: 187.50,
    byStage: {
      seeding: { minutes: 45, cost: 11.25 },
      transplant: { minutes: 150, cost: 37.50 },
      // ...
    }
  }
}
```

---

## IMPLEMENTATION PHASES

### Phase 1: Basic Time Logging (MVP)
- Add TIMELOG sheet
- Log time on task completion (auto-calculated)
- Simple duration: completion time - (completion time - 30 min default)
- No timer UI yet

### Phase 2: Manual Timer
- Add Start Timer button
- Track actual elapsed time
- Pause/resume capability

### Phase 3: Costing Mode Toggle
- Add Costing_Mode column to Planning
- Admin UI to enable/disable
- Badge on employee task cards

### Phase 4: Reports
- Labor summary by planting
- Employee time reports
- Cost comparison dashboard

---

## QUESTIONS FOR PM

1. Default task duration if no timer used? (suggest 30 min)
2. Should ALL tasks log time, or only costing-enabled batches?
3. Where should labor reports live? (New page or existing?)
4. Hourly rate: single rate or per-role rates?

---

## RELATED FILES

- `/employee.html` - Task completion UI
- `/mobile.html` - Alternative task interface
- `/planning.html` - Admin costing toggle
- `/apps_script/` - Backend API functions

---

*Mobile_Employee Claude - Costing Mode Spec v1.0*
