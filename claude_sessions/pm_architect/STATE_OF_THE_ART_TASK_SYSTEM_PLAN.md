# STATE OF THE ART TASK MANAGEMENT SYSTEM
## Master Implementation Plan for Tiny Seed Farm OS
## Created: 2026-02-02 by PM_Architect Claude

---

# OWNER'S MANDATE

> "I WANT IT TO BE SO SMART THAT IT KNOWS WHAT I SHOULD DO BEFORE ME. I WANT TO DO ITS BIDDING BECAUSE IT IS WHAT IS BEST FOR TINY SEED FARM."

> "NO SHORTCUTS. STATE OF THE ART. PRODUCTION READY."

---

# EXECUTIVE SUMMARY

This plan synthesizes research from 4 specialized teams analyzing 25+ task management systems (Asana, Monday.com, Motion, Reclaim.ai, Croptracker, Tend, Farmbrite) to create the definitive task management architecture for Tiny Seed Farm OS.

**Current State:** 4 fragmented task systems with inconsistent data models
**Target State:** Unified, predictive, AI-powered task system that "knows before you"

---

# PART 1: THE UNIFIED TASK DATA MODEL

## 1.1 Core Fields (From Best-in-Class Systems)

```
UNIFIED_TASKS Sheet Schema:
────────────────────────────────────────────────────────────────

IDENTITY
├── Task_ID           (UUID - e.g., "TSK-1738505600000")
├── Title             (String - "Harvest Roma Tomatoes")
├── Description       (Text - detailed instructions)
└── Task_Type         (Enum: sow, transplant, harvest, spray, irrigate, weed, scout, maintenance, admin, delivery)

SOURCE LINKING
├── Batch_ID          (FK to PLANNING_2026 - links to planting)
├── Field_ID          (FK to REF_Fields)
├── Bed_ID            (FK to REF_Beds)
├── Crop_ID           (FK to REF_Crops)
└── Source            (Enum: manual, auto_planning, auto_weather, recurring)

ASSIGNMENT
├── Assignee_ID       (FK to USERS - single person responsible)
├── Assignee_Name     (Denormalized for display)
├── Assigned_By       (FK to USERS)
├── Assigned_At       (Timestamp)
├── Team_ID           (FK to TEAMS - for crew tasks)
└── Role_Required     (Enum: any, crew, lead, manager)

SCHEDULING
├── Due_Date          (Date)
├── Due_Time          (Time - optional)
├── Scheduled_Start   (Timestamp - when to begin)
├── Scheduled_End     (Timestamp - expected completion)
├── Flexibility       (Enum: must_today, this_week, flexible)
└── Weather_Dependent (Boolean)

PRIORITY (AI-Enhanced)
├── Priority_Manual   (Enum: critical, high, medium, low)
├── Priority_Score    (Float 0-100 - AI calculated)
├── At_Risk           (Boolean - AI detected risk)
├── At_Risk_Reason    (String - why it's at risk)
└── Optimal_Window    (JSON - best time to do this)

STATUS
├── Status            (Enum - see workflow below)
├── Started_At        (Timestamp)
├── Completed_At      (Timestamp)
├── Completed_By      (FK to USERS)
└── Blocked_Reason    (String - if blocked)

TIME TRACKING
├── Estimated_Minutes (Integer)
├── Actual_Minutes    (Integer)
├── Efficiency_Pct    (Float - actual/estimated)
└── Labor_Cost        (Decimal - calculated)

DEPENDENCIES
├── Blocked_By        (Array[Task_ID] - must complete first)
├── Blocks            (Array[Task_ID] - waiting on this)
└── Dependency_Type   (Enum: hard, soft, time_based)

RECURRING
├── Is_Recurring      (Boolean)
├── Recurrence_Rule   (JSON - RRULE format)
├── Parent_Task_ID    (FK - template task)
└── Instance_Date     (Date - specific occurrence)

NOTIFICATIONS
├── SMS_Sent          (Boolean)
├── SMS_Sent_At       (Timestamp)
├── Reminder_Sent     (Boolean)
├── Acknowledged      (Boolean)
└── Acknowledged_At   (Timestamp)

METADATA
├── Created_At        (Timestamp)
├── Updated_At        (Timestamp)
├── Created_By        (FK to USERS)
├── Tags              (Array[String])
├── Notes             (Text)
└── Attachments       (Array[URL])
```

## 1.2 Unified Status Workflow

```
                    ┌──────────────┐
                    │   BACKLOG    │ (Not yet scheduled)
                    └──────┬───────┘
                           │ (Date assigned)
                           ▼
                    ┌──────────────┐
          ┌────────│  SCHEDULED   │────────┐
          │        └──────┬───────┘        │
          │               │                │
          ▼               ▼                ▼
   ┌─────────────┐ ┌─────────────┐  ┌─────────────┐
   │WEATHER_HOLD │ │ IN_PROGRESS │  │  CANCELLED  │
   └──────┬──────┘ └──────┬──────┘  └─────────────┘
          │               │
          │        ┌──────┴──────┐
          │        │             │
          │        ▼             ▼
          │ ┌─────────────┐ ┌─────────────┐
          │ │   BLOCKED   │ │  WAITING_   │
          │ └──────┬──────┘ │  SUPPLIES   │
          │        │        └──────┬──────┘
          │        └───────┬───────┘
          │                │
          └────────────────┤
                           ▼
                    ┌──────────────┐
                    │    REVIEW    │ (Optional QA step)
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │     DONE     │
                    └──────────────┘

Status Definitions:
- BACKLOG: Identified but not scheduled
- SCHEDULED: Has date, waiting to start
- IN_PROGRESS: Actively being worked
- WEATHER_HOLD: Weather preventing work (auto-set)
- BLOCKED: Waiting on dependency
- WAITING_SUPPLIES: Missing materials
- REVIEW: Needs verification/QA
- DONE: Completed
- CANCELLED: No longer needed
```

---

# PART 2: AI PRIORITY SCORING ALGORITHM

## 2.1 Multi-Factor Priority Calculation

```javascript
function calculateAIPriority(task, context) {
  let score = 0;
  const weights = {
    deadline: 0.25,      // 25% - urgency
    weather: 0.20,       // 20% - can we do it today?
    dependency: 0.15,    // 15% - what's blocked?
    revenue: 0.15,       // 15% - financial impact
    manual: 0.15,        // 15% - owner's priority
    workload: 0.10       // 10% - balance
  };

  // DEADLINE URGENCY
  const daysUntilDue = getDaysUntil(task.Due_Date);
  if (daysUntilDue < 0) score += weights.deadline * 100;      // Overdue
  else if (daysUntilDue === 0) score += weights.deadline * 90; // Today
  else if (daysUntilDue === 1) score += weights.deadline * 70; // Tomorrow
  else if (daysUntilDue <= 3) score += weights.deadline * 50;  // This week
  else score += weights.deadline * 20;

  // WEATHER FIT (Farm-specific!)
  if (task.Weather_Dependent) {
    const weatherScore = getWeatherFitScore(task, context.forecast);
    score += weights.weather * weatherScore;
    // Bonus for rare good weather windows
    if (weatherScore > 80 && context.forecast.rareWindow) {
      score += 15; // "Do it now while you can!"
    }
  } else {
    score += weights.weather * 50; // Neutral
  }

  // DEPENDENCY CHAIN
  const blockedTasks = task.Blocks || [];
  score += weights.dependency * Math.min(blockedTasks.length * 20, 100);

  // REVENUE IMPACT
  if (task.Task_Type === 'harvest') {
    const cropValue = getCropMarketValue(task.Crop_ID);
    score += weights.revenue * (cropValue > 500 ? 100 : cropValue / 5);
  }

  // MANUAL PRIORITY
  const manualScore = {critical: 100, high: 75, medium: 50, low: 25};
  score += weights.manual * (manualScore[task.Priority_Manual] || 50);

  // WORKLOAD BALANCE (don't overload anyone)
  const assigneeLoad = getEmployeeWorkload(task.Assignee_ID, task.Due_Date);
  if (assigneeLoad > 0.9) score -= 10; // Over capacity - maybe reassign

  return Math.min(100, Math.max(0, Math.round(score)));
}
```

## 2.2 At-Risk Detection

```javascript
function detectAtRisk(task) {
  const risks = [];

  // Time risk
  if (task.Estimated_Minutes && task.Scheduled_Start) {
    const availableMinutes = getAvailableTime(task.Assignee_ID, task.Due_Date);
    if (task.Estimated_Minutes > availableMinutes) {
      risks.push({
        type: 'TIME',
        message: `Need ${task.Estimated_Minutes}min, only ${availableMinutes}min available`,
        severity: 'HIGH'
      });
    }
  }

  // Weather risk
  if (task.Weather_Dependent) {
    const forecast = getWeatherForecast(task.Due_Date);
    if (forecast.precip > 0.5 || forecast.wind > 20) {
      risks.push({
        type: 'WEATHER',
        message: `Weather may prevent: ${forecast.condition}`,
        severity: forecast.precip > 1 ? 'HIGH' : 'MEDIUM'
      });
    }
  }

  // Dependency risk
  const blockers = task.Blocked_By || [];
  const incompleteBlockers = blockers.filter(id => !isTaskComplete(id));
  if (incompleteBlockers.length > 0) {
    risks.push({
      type: 'DEPENDENCY',
      message: `Blocked by ${incompleteBlockers.length} incomplete tasks`,
      severity: 'HIGH'
    });
  }

  // GDD risk (harvest timing)
  if (task.Task_Type === 'harvest' && task.Batch_ID) {
    const gddPct = getGDDPercent(task.Batch_ID);
    if (gddPct > 95) {
      risks.push({
        type: 'OVERRIPE',
        message: `Crop at ${gddPct}% maturity - harvest soon or lose quality`,
        severity: 'CRITICAL'
      });
    }
  }

  return {
    atRisk: risks.length > 0,
    risks: risks,
    highestSeverity: risks.length > 0 ?
      risks.sort((a,b) => severityRank(b) - severityRank(a))[0].severity : null
  };
}
```

---

# PART 3: PROACTIVE TASK GENERATION

## 3.1 "Know Before You" Triggers

```javascript
function generateProactiveTasks() {
  const tasks = [];

  // 1. PLANNING-BASED (from PLANNING_2026)
  const upcomingPlantings = getPlantingsInNextDays(14);
  upcomingPlantings.forEach(planting => {
    if (planting.Plan_GH_Sow && !planting.Act_GH_Sow) {
      if (isWithinDays(planting.Plan_GH_Sow, 7)) {
        tasks.push(createTaskFromPlanting(planting, 'ghSow'));
      }
    }
    // Similar for transplant, harvest...
  });

  // 2. WEATHER-TRIGGERED
  const forecast = getWeatherForecast(7);

  // Spray window detection
  const sprayWindow = findSprayWindow(forecast);
  if (sprayWindow && hasPendingSprayNeed()) {
    tasks.push({
      type: 'OPPORTUNITY',
      title: 'Spray Window Available',
      description: `Optimal spray conditions ${sprayWindow.start} - ${sprayWindow.end}`,
      priority: 'HIGH',
      autoSchedule: true
    });
  }

  // Frost protection
  const frostNight = forecast.find(d => d.minTemp < 35);
  if (frostNight) {
    tasks.push({
      type: 'WARNING',
      title: 'Frost Protection Needed',
      description: `${frostNight.minTemp}°F expected ${frostNight.date}`,
      priority: 'CRITICAL',
      dueDate: frostNight.date,
      dueTime: '16:00' // Give time to prepare
    });
  }

  // 3. HISTORICAL PATTERN MATCHING
  const thisTimeLastYear = getHistoricalTasks(new Date(), -365);
  thisTimeLastYear.forEach(hist => {
    if (!hasEquivalentTask(hist)) {
      tasks.push({
        type: 'SEASONAL_REMINDER',
        title: `Seasonal: ${hist.title}`,
        description: `Last year you did "${hist.title}" around this date`,
        priority: 'MEDIUM',
        suggestedDate: addDays(hist.date, 365)
      });
    }
  });

  // 4. EQUIPMENT MAINTENANCE
  const equipmentDue = getEquipmentNearingService();
  equipmentDue.forEach(equip => {
    tasks.push({
      type: 'MAINTENANCE',
      title: `Service Due: ${equip.name}`,
      description: `${equip.hoursSinceService}hrs since last service (interval: ${equip.serviceInterval}hrs)`,
      priority: equip.overdue ? 'HIGH' : 'MEDIUM'
    });
  });

  // 5. CSA/MARKET TRIGGERS
  const upcomingMarkets = getUpcomingMarkets(7);
  upcomingMarkets.forEach(market => {
    if (!hasHarvestTaskForMarket(market)) {
      tasks.push({
        type: 'MARKET_PREP',
        title: `Harvest for ${market.name}`,
        description: `Market on ${market.date} - harvest day before`,
        priority: 'HIGH',
        dueDate: addDays(market.date, -1)
      });
    }
  });

  return prioritizeAndDedupe(tasks);
}
```

## 3.2 Proactive Alert Categories

| Category | Icon | Examples | Delivery |
|----------|------|----------|----------|
| **OPPORTUNITY** | 🌟 | Spray window, Perfect harvest weather | Push + Dashboard |
| **WARNING** | ⚠️ | Frost coming, Crop overripe, Equipment failing | Push + SMS |
| **ANOMALY** | 🔍 | CSA member missed pickup, Unusual fuel consumption | Dashboard |
| **SEASONAL** | 📅 | Time to order seeds, Same task as last year | Daily digest |
| **MARKET** | 🛒 | Farmers market prep, CSA deadline | Push |

---

# PART 4: MANAGER DASHBOARD SPECIFICATION

## 4.1 Layout (F-Pattern Reading)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🌤 72°F | ⚠️ Rain Thu    TINY SEED FARM - Manager Dashboard    👤 Todd ▼  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│
│  │ TODAY'S     │  │ 🔴 AT RISK  │  │ TEAM        │  │ PROACTIVE ALERTS    ││
│  │ TASKS       │  │             │  │ CAPACITY    │  │                     ││
│  │    12       │  │    3        │  │   75%       │  │ 🌟 Spray window 6AM ││
│  │ ████████░░  │  │ Need attn!  │  │ ████████░░░ │  │ ⚠️ Frost tonight    ││
│  └─────────────┘  └─────────────┘  └─────────────┘  │ 📅 Order seeds      ││
│                                                      └─────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ SMART PRIORITY QUEUE (AI Sorted)                        [View All]      ││
│  │ ─────────────────────────────────────────────────────────────────────── ││
│  │ 🔴 95 │ Harvest Cherokee Purple │ GDD 98% - pick TODAY │ Maria │ Field 2││
│  │ 🔴 88 │ Frost Protection Setup  │ 32°F tonight         │ Jose  │ All    ││
│  │ 🟡 72 │ Transplant Peppers      │ Due tomorrow         │ Sarah │ GH #1  ││
│  │ 🟡 65 │ Spray Tomatoes          │ Window closes 10AM   │ [Assign]│ North ││
│  │ 🟢 45 │ Weed Row 4              │ Flexible             │ Carlos│ South  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌──────────────────────────────────────┐  ┌──────────────────────────────┐│
│  │ TEAM WORKLOAD                        │  │ FIELD STATUS                 ││
│  │                                       │  │                              ││
│  │ Maria  ████████████████████░░░░░ 80% │  │ North Tomatoes 🟢 Active     ││
│  │ Jose   ████████████████████████░ 95% │  │ South Peppers  🟡 Partial    ││
│  │ Sarah  ████████████░░░░░░░░░░░░░ 50% │  │ Greenhouse #1  🔴 Blocked    ││
│  │ Carlos ██████░░░░░░░░░░░░░░░░░░░ 30% │  │ Orchard        🟢 Active     ││
│  │                                       │  │                              ││
│  │         [Rebalance] [View Details]   │  │ [View Map]    [Manage]       ││
│  └──────────────────────────────────────┘  └──────────────────────────────┘│
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ QUICK ACTIONS                                                           ││
│  │                                                                          ││
│  │ [+ Create Task]  [Assign Work]  [Message Team]  [Weather Check]         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## 4.2 Key Features

### Smart Priority Queue
- AI-sorted by Priority_Score
- Color-coded urgency (🔴 >80, 🟡 50-80, 🟢 <50)
- Shows WHY it's prioritized (reason column)
- One-click assign for unassigned tasks

### Team Workload Panel
- Capacity bars with color coding
- Click to see task breakdown
- "Rebalance" button suggests reassignments
- Shows who's available for more work

### Proactive Alerts Panel
- Categories: Opportunity, Warning, Seasonal
- Dismissable with "Got it" or "Snooze"
- Actionable - click to create task
- Limited to 5 most important

### Field Status Map
- Visual grid of fields
- Status: Active (work happening), Idle, Blocked
- Click to see field detail + assigned tasks

---

# PART 5: IMPLEMENTATION ROADMAP

## Phase 1: Foundation (Week 1-2)
**Goal:** Unified task system, no more fragmentation

### Tasks:
1. Create `UNIFIED_TASKS` sheet with full schema
2. Migrate data from TASK_ASSIGNMENTS, EMPLOYEE_TASKS, TIMELOG
3. Create unified API endpoints:
   - `createTask()`
   - `getTasks(filters)`
   - `updateTask()`
   - `deleteTask()`
   - `assignTask()`
4. Update `task-assignment.html` to use new API
5. Update `index.html` Today's Work to use unified system
6. Connect TIMELOG to unified tasks (time tracking on completion)

### Deliverables:
- [ ] UNIFIED_TASKS sheet created
- [ ] 6 API endpoints working
- [ ] task-assignment.html updated
- [ ] index.html Today's Work updated
- [ ] Data migration script
- [ ] CHANGE_LOG.md updated

## Phase 2: Manager Dashboard (Week 3-4)
**Goal:** Full visibility and control for managers

### Tasks:
1. Create `web_app/manager-dashboard.html`
2. Implement Smart Priority Queue widget
3. Implement Team Workload visualization
4. Implement Field Status panel
5. Add bulk task assignment
6. Add task creation modal
7. Connect to existing employee APIs

### Deliverables:
- [ ] manager-dashboard.html created
- [ ] Priority queue with AI sorting
- [ ] Team workload bars
- [ ] Bulk assignment working
- [ ] Mobile responsive

## Phase 3: AI Intelligence (Week 5-6)
**Goal:** "Knows before you"

### Tasks:
1. Implement `calculateAIPriority()` algorithm
2. Implement `detectAtRisk()` function
3. Connect to existing `SmartLaborIntelligence.js`
4. Connect to existing `FarmIntelligence.js`
5. Implement `generateProactiveTasks()` from:
   - PLANNING_2026 (planting schedule)
   - Weather API
   - Historical patterns
   - Equipment maintenance
6. Add proactive alerts to dashboard

### Deliverables:
- [ ] AI priority scoring live
- [ ] At-risk detection working
- [ ] Proactive task generation
- [ ] SmartLaborIntelligence connected
- [ ] FarmIntelligence connected

## Phase 4: Unification (Week 7-8)
**Goal:** Same experience everywhere

### Tasks:
1. Update `employee.html` with unified system
2. Update `flowers.html` with unified system
3. Update `food-safety.html` with unified system
4. Update `web_app/chief-of-staff.html` with unified system
5. Add "Create Task" button to all relevant pages
6. Ensure consistent UI/UX across all interfaces

### Deliverables:
- [ ] All 6 task-related files updated
- [ ] Consistent task creation UX
- [ ] Consistent task completion UX
- [ ] Consistent bulk operations

## Phase 5: Notifications & Learning (Week 9-10)
**Goal:** Smart notifications, system learns

### Tasks:
1. Implement notification batching (IMMEDIATE/HIGH/MEDIUM/LOW)
2. Add SMS for critical tasks
3. Implement time tracking feedback loop
4. Track estimated vs actual time
5. Implement task completion learning
6. Add seasonal pattern detection

### Deliverables:
- [ ] Notification batching working
- [ ] SMS integration complete
- [ ] Time tracking on all completions
- [ ] Learning loop storing data

## Phase 6: Polish & Advanced (Week 11-12)
**Goal:** State of the art, production ready

### Tasks:
1. Mobile PWA optimization
2. Offline task management
3. Voice/NLP task creation (if time)
4. Performance optimization
5. Documentation
6. User training materials

### Deliverables:
- [ ] PWA working offline
- [ ] Performance benchmarks met
- [ ] USER_MANUAL updated
- [ ] SYSTEM_MANIFEST updated
- [ ] Production deployment

---

# PART 6: EXISTING CODE TO CONNECT (NOT DUPLICATE)

## Already Built - Just Need Frontend Connection

| Module | Location | Functions to Use |
|--------|----------|------------------|
| SmartLaborIntelligence.js | apps_script/ | `getNextPriorityTask()`, `optimizeTaskSequence()` |
| FarmIntelligence.js | apps_script/ | Weather-aware recommendations |
| ChiefOfStaff_Predictive.js | apps_script/ | Revenue forecasting, demand prediction |
| getPredictiveTasks() | MERGED TOTAL.js:71954 | GDD-based task generation |
| assignTaskToEmployee() | MERGED TOTAL.js:42389 | Task assignment + SMS |
| getEmployeeTasks() | MERGED TOTAL.js:41428 | Task retrieval |

## DO NOT CREATE NEW - Use These Instead

- Morning Brief: Use existing `getMorningBrief()` - 4 versions exist, don't add 5th
- Approval System: Use existing `EmailWorkflowEngine.js`
- SMS: Use existing `sendSMS()` function

---

# PART 7: BACKEND STRATEGY

## Current: Apps Script
**Pros:** Already built, free, Sheet integration
**Cons:** 6-minute timeout, no websockets

## Recommendation: Hybrid Approach

Keep Apps Script for:
- Sheet operations (planning, crop data)
- Existing endpoints that work

Add Supabase for:
- Real-time task updates (websockets)
- Complex queries
- Better performance

### Migration Path:
1. Phase 1-4: Continue with Apps Script
2. Phase 5-6: Evaluate Supabase for real-time features
3. Future: Gradual migration of high-frequency operations

---

# PART 8: SUCCESS METRICS

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Task Completion Rate** | >85% | Completed / Assigned per week |
| **Prediction Accuracy** | >70% | Auto-generated tasks completed |
| **Time Estimate Accuracy** | <20% deviation | |estimated - actual| / actual |
| **At-Risk Detection** | >80% | Risks identified before deadline miss |
| **User Adoption** | 100% | All staff using unified system |
| **Manager Satisfaction** | >4/5 | Survey rating |

---

# APPROVAL REQUEST

This plan delivers:
1. ✅ Unified task system (no more fragmentation)
2. ✅ Manager Dashboard with full visibility
3. ✅ AI-powered prioritization
4. ✅ Proactive task generation ("knows before you")
5. ✅ Consistent experience across all interfaces
6. ✅ Learning system that improves over time

**Estimated Timeline:** 12 weeks
**Team Structure:**
- Team 1 & 2: Task Management System (Phases 1, 4, 5)
- Team 3: Manager Dashboard (Phases 2, 3)

**Ready for Builder phase upon approval.**

---

*Plan created by PM_Architect Claude*
*Research by: 4 specialized RESEARCHER agents*
*Date: 2026-02-02*
