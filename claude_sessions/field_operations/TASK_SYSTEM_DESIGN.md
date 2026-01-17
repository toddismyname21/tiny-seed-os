# TASK SYSTEM DESIGN
## Tiny Seed Farm OS - Planting-to-Task Integration

**Created:** 2026-01-16
**Author:** Field Operations Claude
**Purpose:** Define how tasks link to plantings in the system

---

## OVERVIEW

This document describes how task management integrates with the PLANNING_2026 sheet and the broader Tiny Seed OS ecosystem.

---

## DATA MODEL

### Current PLANNING_2026 Structure

The PLANNING_2026 Google Sheet contains planting records with these key fields:

```
Planting Record Fields:
- Batch_ID (unique identifier, e.g., "26-TOM-001")
- Crop
- Variety
- Category (Veg, Herb, Floral)
- Plan_GH_Sow (planned greenhouse sow date)
- Act_GH_Sow (actual greenhouse sow date)
- Plan_Transplant (planned transplant date)
- Act_Transplant (actual transplant date)
- Plan_Field_Sow (for direct seed)
- Act_Field_Sow (actual direct seed date)
- Planting_Method (Transplant, Direct Seed)
- Location (field/bed)
- Qty_Trays / Qty_Feet
- Notes
```

### Proposed Task Structure

Each task links back to a planting via `Batch_ID`:

```
Task Record Fields:
- Task_ID (auto-generated)
- Batch_ID (links to PLANNING_2026)
- Task_Type (from template library)
- Task_Name
- Planned_Date
- Actual_Date
- Status (Pending, In Progress, Completed, Skipped)
- Assigned_To
- Est_Time (minutes)
- Actual_Time (minutes)
- Supplies_Needed
- Notes
- Created_Date
- Completed_Date
```

---

## TASK GENERATION LOGIC

### Auto-Generate Tasks When Planting Created

When a new planting is added to PLANNING_2026:

1. **Determine crop type** from Crop and Category fields
2. **Load task template** for that crop from TASK_TEMPLATES
3. **Calculate task dates** based on planting dates:
   - Week 0 = transplant date (or direct seed date)
   - Week -8 = 8 weeks before transplant
   - Week +4 = 4 weeks after transplant

### Example: Tomato Planting Created

```
Input: New tomato planting
- Batch_ID: 26-TOM-015
- Variety: Cherokee Purple
- Plan_Transplant: 2026-05-15
- Plan_GH_Sow: 2026-03-20

Auto-Generated Tasks:
1. "Seed in flats" | Date: Mar 20 | Est: 30 min
2. "Pot up to 4"" | Date: Apr 3 | Est: 45 min
3. "Harden off start" | Date: May 1 | Est: 20 min
4. "Prep beds" | Date: May 8 | Est: 2 hrs
5. "Transplant" | Date: May 15 | Est: 1 hr
6. "Stake/trellis" | Date: May 29 | Est: 2 hrs
7. "First prune" | Date: Jun 5 | Est: 30 min
(+ recurring tasks for weekly pruning, scouting, etc.)
```

---

## TASK DEPENDENCIES

Some tasks must be completed before others can begin:

```
Dependency Chain (Tomatoes):
Seed → Pot Up → Harden Off → Prep Beds → Transplant → Stake

Rules:
- Cannot mark "Transplant" complete until "Prep Beds" complete
- Cannot start "Stake" until "Transplant" complete
- Warning if "Pot Up" not done 6 weeks before transplant
```

### Dependency Types

| Type | Description | Example |
|------|-------------|---------|
| **Hard Dependency** | Must complete first | Prep beds before transplant |
| **Soft Dependency** | Should complete first | Order seeds before seeding |
| **Time Dependency** | Must happen within window | Harden off 1-2 weeks before transplant |

---

## TASK SCHEDULING

### Date Calculation Rules

```javascript
// Example calculation logic
function calculateTaskDate(plantingDate, weekOffset) {
  const date = new Date(plantingDate);
  date.setDate(date.getDate() + (weekOffset * 7));
  return date;
}

// For recurring tasks
function generateRecurringTasks(startDate, endDate, frequencyDays) {
  const tasks = [];
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    tasks.push(new Task(currentDate));
    currentDate.setDate(currentDate.getDate() + frequencyDays);
  }
  return tasks;
}
```

### Weather-Based Adjustments

Some tasks should adjust based on conditions:

| Trigger | Adjustment |
|---------|------------|
| Frost warning | Postpone transplant tasks |
| Rain forecast | Skip irrigation tasks |
| Soil temp <50°F | Delay warm-season planting |

---

## INTEGRATION WITH MOBILE_EMPLOYEE

### Time Tracking Integration

When employee logs time via TIMELOG:
1. Match time entry to active task
2. Update `Actual_Time` on task
3. If task completed, update `Status` and `Completed_Date`
4. Roll up time to Activity-Based Costing

### Task Log Fields (Owner Requested)

```
Field: Description
- Estimated_Time: From template (editable)
- Supplies_Needed: From template (editable)
- Planning_Notes: Manager input
- Assigned_To: Employee name or role
- Done: Checkbox
- Process_Notes: Employee input (how it went)
- Actual_Time: From TIMELOG or manual entry
```

---

## UI REQUIREMENTS

### Task Views

1. **By Planting (Batch_ID)**
   - Show all tasks for a specific planting
   - Timeline view with dependencies

2. **By Date**
   - Daily task list (what's due today)
   - Weekly view (sowing-sheets.html style)

3. **By Person**
   - My tasks today
   - My team's tasks

4. **By Location**
   - All tasks for Field 1
   - Greenhouse tasks only

### Mobile-First Design

Tasks should be checkable from mobile device:
- Large touch targets
- Offline capability
- Quick time entry
- Photo attachment for notes

---

## IMPLEMENTATION PHASES

### Phase 1: Manual Task Creation (Current)
- Use sowing-sheets.html for printable task sheets
- Tasks derived from PLANNING_2026 dates
- No automatic generation yet

### Phase 2: Template Library (This Sprint)
- TASK_TEMPLATES.md as reference
- Manual task creation using templates
- Time estimates included

### Phase 3: Auto-Generation (Future)
- New Apps Script function: `generateTasksForPlanting(batchId)`
- Trigger on new PLANNING_2026 row
- Generate all relevant tasks with dates

### Phase 4: Full Integration (Future)
- Two-way sync with TIMELOG
- Activity-Based Costing rollup
- Mobile app integration

---

## API ENDPOINTS NEEDED

### Existing (Working)
- `getGreenhouseSowingTasks` - DEPLOYED
- `getTransplantTasks` - DEPLOYED
- `getDirectSeedTasks` - DEPLOYED

### Proposed New Endpoints

```javascript
// Generate tasks for a planting
function generatePlantingTasks(batchId, templateName) {
  // Load template
  // Calculate dates from planting
  // Create task records
  // Return task list
}

// Update task status
function updateTaskStatus(taskId, status, actualTime, notes) {
  // Find task
  // Update fields
  // Trigger any dependent task updates
}

// Get tasks by date range
function getTasksByDateRange(startDate, endDate, filters) {
  // Query tasks sheet
  // Apply filters (location, person, status)
  // Return sorted task list
}

// Get tasks by planting
function getTasksByPlanting(batchId) {
  // Filter all tasks for this batch
  // Sort by planned date
  // Include dependency info
}
```

---

## DATA STORAGE OPTIONS

### Option A: Tasks in PLANNING_2026 (Not Recommended)
- Add task columns to existing sheet
- Con: Sheet becomes very wide, hard to manage

### Option B: Separate TASKS_2026 Sheet (Recommended)
- New sheet dedicated to tasks
- Links to PLANNING_2026 via Batch_ID
- Easier to query and manage
- Can have multiple tasks per planting

### Option C: Database (Future)
- Move to proper database for tasks
- Better querying, relationships
- More development effort

**Recommendation:** Start with Option B (separate sheet)

---

## SAMPLE TASKS SHEET STRUCTURE

```
| Task_ID | Batch_ID | Task_Type | Task_Name | Plan_Date | Status | Assigned | Est_Min | Act_Min |
|---------|----------|-----------|-----------|-----------|--------|----------|---------|---------|
| T001 | 26-TOM-001 | GH_SEED | Seed tomatoes | 2026-03-20 | Complete | Sam | 30 | 35 |
| T002 | 26-TOM-001 | POT_UP | Pot up tomatoes | 2026-04-03 | Pending | - | 45 | - |
| T003 | 26-LET-001 | GH_SEED | Seed lettuce | 2026-03-15 | Complete | Todd | 20 | 18 |
```

---

## QUESTIONS FOR OWNER

1. **Task granularity:** How detailed should tasks be? (e.g., "Prune" vs "Prune Row 1", "Prune Row 2")

2. **Recurring tasks:** Should weekly tasks be individual records or a single "recurring" task?

3. **Assignment:** Assign to person or role? What roles exist?

4. **Notifications:** Should system notify when tasks are overdue?

5. **Mobile priority:** Which tasks are most important for mobile access?

---

## NEXT STEPS

1. [ ] Owner approval of this design
2. [ ] Create TASKS_2026 sheet in Google Sheets
3. [ ] Build `generatePlantingTasks` function
4. [ ] Add task generation trigger
5. [ ] Update sowing-sheets.html to read from TASKS sheet
6. [ ] Build mobile task completion interface

---

*Task System Design by Field Operations Claude*
*Ready for PM_Architect and Owner review*
