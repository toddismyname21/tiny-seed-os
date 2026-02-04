# MANAGER GUIDE
## Complete Guide to Managing Farm Operations with Tiny Seed OS

**Last Updated:** 2026-02-03
**For:** Managers and Admin users

---

## Table of Contents

1. [Manager Dashboard Overview](#manager-dashboard-overview)
2. [AI Priority Queue](#ai-priority-queue)
3. [Team Workload Management](#team-workload-management)
4. [Proactive Alerts](#proactive-alerts)
5. [Field Status Monitoring](#field-status-monitoring)
6. [Bulk Operations](#bulk-operations)
7. [Task Assignment](#task-assignment)
8. [Daily Workflow](#daily-workflow)
9. [Weekly Planning](#weekly-planning)
10. [Best Practices](#best-practices)
11. [FAQ](#faq)

---

# MANAGER DASHBOARD OVERVIEW

## Accessing the Dashboard

Navigate to: `web_app/manager-dashboard.html`

The Manager Dashboard is your command center for all farm operations. It provides:
- Real-time visibility into all tasks
- AI-powered prioritization
- Team workload visualization
- Proactive alerts and warnings
- Quick action capabilities

## Dashboard Layout

```
+------------------------------------------------------------------+
|  Weather | TINY SEED FARM - Manager Dashboard        | User Menu |
+------------------------------------------------------------------+
|                                                                   |
| [ Today: 12 ]  [ At Risk: 3 ]  [ Team: 75% ]  [ + Create Task ]  |
|                                                                   |
+------------------------------------------------------------------+
|                                      |                            |
|   SMART PRIORITY QUEUE               |   PROACTIVE ALERTS         |
|   (AI-sorted task list)              |   (Predicted issues)       |
|                                      |                            |
|   - Critical tasks at top            |   - Weather warnings       |
|   - Color-coded urgency              |   - Seasonal reminders     |
|   - At-risk warnings                 |   - Market prep alerts     |
|   - Quick actions                    |                            |
|                                      +----------------------------+
|                                      |                            |
|                                      |   TEAM WORKLOAD            |
|                                      |   (Capacity bars)          |
|                                      |                            |
|                                      |   Maria  [======--] 80%    |
|                                      |   Jose   [========] 95%    |
|                                      |   Sarah  [====----] 50%    |
|                                      |                            |
|                                      +----------------------------+
|                                      |                            |
|                                      |   FIELD STATUS             |
|                                      |   (Area overview)          |
|                                      |                            |
+--------------------------------------+----------------------------+
```

## Stats Bar

The top stats bar shows quick metrics:

| Stat | Description | Click Action |
|------|-------------|--------------|
| **Today's Tasks** | Total count and progress | Filter to today only |
| **At Risk** | Tasks needing attention | Filter to at-risk only |
| **Team Capacity** | Overall availability | Open workload panel |

---

# AI PRIORITY QUEUE

## Understanding AI Scores

Every task receives a score from 0-100 based on seven factors:

### Scoring Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Deadline Urgency | 25% | How soon is it due? |
| Weather Fit | 20% | Can we do this today given weather? |
| Dependency Chain | 15% | What's blocked waiting on this? |
| Revenue Impact | 15% | Financial importance |
| Manual Priority | 15% | Your explicit priority setting |
| Workload Balance | 10% | Is the assignee overloaded? |
| GDD Bonus | Variable | Growing Degree Days for harvests |

### Score Breakdown Example

**Task: Harvest Roma Tomatoes**

| Factor | Calculation | Points |
|--------|-------------|--------|
| Deadline | Due today | 22.5 |
| Weather | Perfect conditions | 18 |
| Dependencies | CSA boxes waiting | 13.5 |
| Revenue | High value ($500+) | 15 |
| Manual | Set to High | 11.25 |
| Workload | Assignee at 70% | 0 |
| GDD Bonus | 95% maturity | +8 |
| **TOTAL** | | **88.25** |

### Priority Tiers

| Color | Score | Action Required |
|-------|-------|-----------------|
| Red (Critical) | 80-100 | Immediate action required |
| Orange (High) | 50-79 | Do today |
| Yellow (Medium) | 30-49 | This week |
| Green (Low) | 0-29 | When possible |

## Reading Task Cards

Each task card displays:

```
+--------------------------------------------------+
| [94] Harvest Cherokee Purple Tomatoes    [!TIME] |
|                                                   |
| Location: Field 2, Bed 4-8                        |
| Due: Today 2:00 PM      |  Maria  | Est: 2 hrs   |
+--------------------------------------------------+
```

- **Score badge** (94): AI priority score with color
- **Title**: What needs to be done
- **Warning badge** [!TIME]: At-risk indicator with reason
- **Location**: Where the work happens
- **Due**: When it needs to be done
- **Assignee**: Who's responsible
- **Estimate**: Expected duration

## At-Risk Indicators

Yellow warning badges indicate problems:

| Badge | Risk Type | What It Means |
|-------|-----------|---------------|
| `[!TIME]` | Time | Not enough hours to complete |
| `[!WEATHER]` | Weather | Conditions will prevent work |
| `[!OVERRIPE]` | Ripeness | Crop needs immediate harvest |
| `[!OVERDUE]` | Overdue | Past due date |
| `[!BLOCKED]` | Dependency | Waiting on other tasks |

## Queue Actions

### Single Task Actions

Click a task card to open the action menu:
- **Complete**: Mark as done
- **Assign**: Change assignee
- **Edit**: Modify details
- **Snooze**: Delay to later
- **Cancel**: Remove task

### Filtering the Queue

Use filter tabs above the queue:
- **All**: Show everything
- **Critical**: Score 80+ only
- **At Risk**: Tasks with warnings
- **Unassigned**: Needs assignment
- **By Type**: Filter by task category

---

# TEAM WORKLOAD MANAGEMENT

## Workload Panel

The Team Workload panel shows each worker's current capacity:

```
+----------------------------------+
| TEAM WORKLOAD                     |
|                                   |
| Maria  [================----] 80% |
| Jose   [====================] 95% | <- OVERLOAD
| Sarah  [============--------] 60% |
| Carlos [======--------------] 30% |
|                                   |
| [Rebalance]      [View Details]   |
+----------------------------------+
```

## Capacity Colors

| Color | Percentage | Status |
|-------|------------|--------|
| Green | 0-70% | Available |
| Yellow | 70-90% | Heavy but ok |
| Red | 90%+ | Overloaded |

## Calculating Capacity

Capacity = (Assigned task hours) / (Available working hours)

Example:
- Maria has 8 hours available today
- She's assigned 6.4 hours of tasks
- Capacity = 6.4/8 = 80%

## Rebalancing Work

### Automatic Rebalance

1. Click **Rebalance** button
2. AI analyzes current assignments
3. Review suggested moves:
   ```
   Suggested Rebalancing:
   - Move "Weed Row 4" from Jose to Carlos
   - Move "Spray East Field" from Jose to Sarah
   This reduces Jose from 95% to 75%
   ```
4. Click **Apply All** or adjust individually
5. Confirm changes

### Manual Reassignment

1. Click on an overloaded worker's name
2. See their complete task list
3. Check tasks you want to move
4. Click **Reassign Selected**
5. Choose new assignee from dropdown
6. Confirm

## Workload Detail View

Click a worker's name to see:
- All assigned tasks
- Time breakdown by task type
- Historical capacity (last 7 days)
- Skills and certifications
- Availability notes

---

# PROACTIVE ALERTS

## Alert Panel

The Proactive Alerts panel shows AI-predicted issues:

```
+------------------------------------------+
| PROACTIVE ALERTS                          |
|                                           |
| [!] Frost tonight - 32F expected          |
|     Protect sensitive crops by 4 PM       |
|     [ Create Task ] [ Dismiss ]           |
|                                           |
| [*] Spray window 6-10 AM tomorrow         |
|     Perfect conditions for fungicide      |
|     [ Schedule ] [ Remind Later ]         |
|                                           |
| [i] CSA boxes due for pickup Saturday     |
|     Start harvest Thursday                |
|     [ View Plan ] [ Got It ]              |
+------------------------------------------+
```

## Alert Categories

| Icon | Category | Urgency |
|------|----------|---------|
| `[!]` | WARNING | High - act now |
| `[*]` | OPPORTUNITY | Time-sensitive benefit |
| `[i]` | SEASONAL | Routine reminder |
| `[>]` | MARKET | Sales deadline |
| `[?]` | ANOMALY | Something unusual |

## Alert Sources

The AI generates alerts from:

### Weather-Based
- Frost/freeze warnings
- Rain preventing work
- Spray windows (low wind, no rain)
- Heat stress conditions

### Planning-Based
- Transplants ready for field
- Harvest windows approaching
- Succession planting due
- Seed ordering time

### Historical Patterns
- "Last year around this time you..."
- Seasonal maintenance reminders
- Equipment service intervals

### Market/Sales
- CSA box preparation
- Farmers market harvests
- Wholesale order deadlines
- Delivery schedule conflicts

## Alert Actions

| Action | Result |
|--------|--------|
| **Create Task** | Opens task form pre-filled |
| **Schedule** | Add to calendar |
| **Dismiss** | Remove permanently |
| **Remind Later** | Snooze for selected time |
| **View Details** | See full information |

## Alert Settings

Access via Settings gear icon:

```
Alert Preferences:
- [ ] Show weather warnings
- [ ] Show opportunities
- [ ] Show seasonal reminders
- [ ] Show market prep

Delivery:
- [ ] Push notifications
- [ ] SMS for critical only
- Quiet hours: 8 PM - 6 AM
```

---

# FIELD STATUS MONITORING

## Field Overview Panel

```
+----------------------------------+
| FIELD STATUS                      |
|                                   |
| North Field    [====] Active      |
| South Field    [==--] Partial     |
| Greenhouse #1  [----] Blocked     |
| Orchard        [====] Active      |
|                                   |
| [View Map]           [Manage]     |
+----------------------------------+
```

## Status Indicators

| Status | Meaning |
|--------|---------|
| **Active** | Work currently happening |
| **Partial** | Some areas active, some idle |
| **Idle** | No current activity |
| **Blocked** | Cannot work (weather, supplies, etc.) |
| **Scheduled** | Work planned but not started |

## Field Details

Click any field to see:

### Current State
- Active plantings list
- Tasks in progress
- Worker assignments
- Conditions (soil moisture, etc.)

### Upcoming Work
- Scheduled tasks this week
- Plantings approaching harvest
- Maintenance due

### History
- Recent harvests
- Yield by crop
- Labor hours spent

## Map View

Click **View Map** for visual field layout:
- Color-coded by status
- Click areas for details
- See worker locations (if GPS enabled)
- Overlay options (crops, tasks, irrigation)

---

# BULK OPERATIONS

## Entering Bulk Mode

1. Click the **checkbox icon** in the task list header
2. Checkboxes appear on all task cards
3. Select multiple tasks
4. Use bulk action buttons

## Bulk Actions

### Complete All
Mark all selected tasks as done:
1. Select tasks to complete
2. Click **Complete All**
3. Optional: Add completion notes
4. Confirm

### Assign All
Assign all selected to one person:
1. Select tasks
2. Click **Assign All**
3. Choose assignee from dropdown
4. Confirm

### Cancel All
Remove all selected tasks:
1. Select tasks
2. Click **Cancel All**
3. Confirm (tasks are soft-deleted, can be recovered)

## Bulk Selection Tips

### Quick Select Methods
- Click checkbox to toggle one
- Shift+click to select range
- **Select All Visible** button
- **Select Critical** button
- **Select Unassigned** button

### Filtered Bulk Operations
1. First filter the list (e.g., by type or assignee)
2. Enter bulk mode
3. Select all visible
4. Apply action
This lets you bulk-complete "all weeding tasks" or "all Maria's tasks"

---

# TASK ASSIGNMENT

## Task Assignment Page

Navigate to: `web_app/task-assignment.html`

This is a dedicated page for creating and managing tasks.

## Creating a Task

### Quick Create

1. Click **+ Create Task** button
2. Fill in the form:
   - **Title**: Clear, action-oriented name
   - **Description**: Detailed instructions
   - **Type**: Select category (harvest, transplant, etc.)
   - **Location**: Field/bed assignment
   - **Due Date/Time**: When it needs to be done
   - **Assignee**: Who will do it
   - **Priority**: Manual priority (affects AI score)
   - **Estimated Time**: How long it should take

3. Click **Save**

### Priority Options

| Priority | When to Use |
|----------|-------------|
| Critical | Drop everything, do now |
| High | Must be done today |
| Medium | Important but flexible |
| Low | When time allows |

### Task Types

| Type | Examples |
|------|----------|
| Sow | Greenhouse seeding |
| Transplant | Moving to field |
| Harvest | Picking crops |
| Spray | Pesticide/fertilizer application |
| Irrigate | Watering operations |
| Weed | Cultivation |
| Scout | Pest/disease monitoring |
| Maintenance | Equipment, infrastructure |
| Admin | Paperwork, planning |
| Delivery | Route, drop-off |

## Quick Assign

For rapid assignment:
1. Select employee from Quick Assign bar
2. Drag tasks to them
3. Or click task and select assignee

## Editing Tasks

1. Click task card
2. Modify fields
3. Changes save automatically
4. History tracked in task log

---

# DAILY WORKFLOW

## Morning Routine (7:00 AM)

### 1. Check Dashboard (5 min)
- Open Manager Dashboard
- Review critical tasks
- Check at-risk warnings
- Note weather conditions

### 2. Review Alerts (3 min)
- Process proactive alerts
- Create any needed tasks
- Dismiss handled items

### 3. Check Team Workload (2 min)
- Verify balanced assignments
- Rebalance if needed
- Note who's in/out

### 4. Brief Field Leads (5 min)
- Communicate priorities
- Highlight at-risk items
- Confirm understanding

## Midday Check-In (12:00 PM)

### 1. Progress Review (3 min)
- Check completion rates
- Identify falling behind
- Adjust as needed

### 2. Handle Issues (as needed)
- Respond to reported problems
- Reassign stuck tasks
- Update priorities

## End of Day (4:00 PM)

### 1. Status Check (5 min)
- Review what's done
- Note what's incomplete
- Update carryover tasks

### 2. Tomorrow Preview (5 min)
- Check tomorrow's queue
- Verify assignments
- Note early alerts

### 3. Close Out (2 min)
- Dismiss resolved alerts
- Update any notes
- Log off

---

# WEEKLY PLANNING

## Monday Morning

### Review Last Week
1. Check completion rates
2. Review harvest yields
3. Note any patterns

### Plan This Week
1. Review upcoming deadlines
2. Check weather forecast
3. Identify key priorities
4. Ensure adequate staffing

## Friday Afternoon

### Prepare Next Week
1. Run succession planner for new batches
2. Update bed assignments
3. Schedule recurring tasks
4. Review market/CSA needs

---

# BEST PRACTICES

## Task Management

### Do
- Create specific, actionable tasks
- Include location details
- Set realistic time estimates
- Assign based on skills
- Use manual priority appropriately

### Don't
- Create vague tasks ("Work on field")
- Overload workers consistently
- Ignore at-risk warnings
- Skip time estimates

## Team Management

### Do
- Balance workloads regularly
- Communicate priorities clearly
- Respond to issues quickly
- Trust AI recommendations as a starting point

### Don't
- Let anyone stay over 90% capacity
- Ignore rebalance suggestions
- Micro-manage every task
- Override AI without good reason

## Alert Management

### Do
- Review alerts daily
- Create tasks from actionable alerts
- Dismiss when resolved
- Adjust alert preferences to reduce noise

### Don't
- Ignore alerts repeatedly
- Let alerts pile up
- Create duplicate tasks from alerts
- Disable all alerts

---

# FAQ

## Priority & Scoring

**Q: Why does a task have high score but I set it to Low priority?**
A: The AI considers 7 factors. Deadline, weather, or dependencies may override your manual setting. Review the score breakdown.

**Q: Can I override the AI priority?**
A: Yes. Set manual priority to Critical. But consider why the AI ranked it differently.

**Q: How often do scores update?**
A: Continuously. As weather changes, deadlines approach, or dependencies complete, scores adjust automatically.

## Team Workload

**Q: What if everyone is overloaded?**
A: You have more work than capacity. Options:
1. Delay lower-priority tasks
2. Cancel non-essential work
3. Get additional help
4. Accept some tasks won't complete

**Q: Why does rebalance suggest moving a task from someone at 60% to someone at 70%?**
A: It may consider skills, location, or task type matching. Review the reasoning.

## Alerts

**Q: I keep getting the same alert after dismissing it.**
A: Some alerts regenerate if conditions persist. The underlying issue needs resolution.

**Q: Can I get alerts via text message?**
A: Yes. Go to Settings > Notifications > SMS Alerts. Only Critical alerts are sent by default.

## Technical Issues

**Q: Dashboard is loading slowly.**
A: Try refreshing. If persistent, check internet connection. Report to Admin if ongoing.

**Q: Priority scores aren't showing.**
A: The AI system may be calculating. Wait 30 seconds and refresh. If still missing, contact Admin.

**Q: I can't reassign tasks.**
A: Verify you have Manager or Admin role. Check that the worker you're assigning to is active.

---

*For additional help, see the full USER_MANUAL.md or contact Admin.*
