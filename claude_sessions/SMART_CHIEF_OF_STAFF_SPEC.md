# SMART CHIEF OF STAFF - MASTER SPEC

## Owner Vision
"I want it to be SO SMART that it knows what I should do before me. I want to do its bidding because it is what is best for Tiny Seed Farm."

---

## CORE CAPABILITIES

### 1. REAL-TIME TEAM AWARENESS
Chief of Staff knows what EVERY employee is doing at ALL times:
- Current task and location
- Time on current task vs expected
- Efficiency (% of benchmark)
- Fatigue level and break status
- Tasks completed vs remaining

### 2. OUTBOUND COMMUNICATIONS
Owner can text/email anyone instantly:
- "Text Maria about tomorrow's 6am start"
- "Tell the team lunch is ready"
- Chief of Staff drafts, owner approves, it sends

### 3. LEARNING SYSTEM
Gets smarter over time:
- Learns actual task durations vs estimates
- Adjusts benchmarks automatically
- Identifies patterns (who's best at what)
- Predicts problems before they happen

### 4. PROACTIVE INTELLIGENCE
Tells owner what to do BEFORE they ask:
- Morning brief with priorities
- Real-time alerts when things go wrong
- Recommendations based on data
- "You should do X because Y"

---

## FEATURE BREAKDOWN

### A. TEAM DASHBOARD (Real-Time)

```
┌──────────────────────────────────────────────────────────────┐
│  👥 TEAM STATUS - Live                          🔄 30s ago   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │ 👤 Maria Santos         │  │ 👤 Jake Thompson        │   │
│  │ 🌿 Harvesting Lettuce   │  │ 🚜 Transplanting        │   │
│  │ 📍 Field 3, Bed 12      │  │ 📍 Greenhouse 2         │   │
│  │ ⏱️ 45 min (est: 40)     │  │ ⏱️ 20 min (est: 30)     │   │
│  │ ⚡ 89% efficiency       │  │ ⚡ 150% efficiency      │   │
│  │ 🔋 Energy: Good         │  │ 🔋 Energy: Good         │   │
│  └─────────────────────────┘  └─────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │ 👤 Ana Rodriguez        │  │ 👤 Tom Wilson           │   │
│  │ ☕ On Break             │  │ ❌ Not Checked In       │   │
│  │ 📍 Barn                 │  │ Expected: 6:00 AM       │   │
│  │ ⏱️ 12 min break         │  │ ⚠️ 30 min late         │   │
│  │ Tasks: 3/5 done         │  │                         │   │
│  │ 🔋 Energy: Low          │  │ [📱 Send Reminder]      │   │
│  └─────────────────────────┘  └─────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### B. COMMUNICATIONS PANEL

```
┌──────────────────────────────────────────────────────────────┐
│  📤 SEND MESSAGE                                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  To: [ Maria Santos ▾ ]  or  [👥 Whole Team]                │
│                                                              │
│  Via: [📱 SMS] [📧 Email] [Both]                            │
│                                                              │
│  What do you want to say?                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Tell Maria we're starting at 6am tomorrow, bring       │ │
│  │ water bottles                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [✨ Draft Message]                                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Hi Maria! Heads up - we're starting at 6am tomorrow.  │ │
│  │ Please bring extra water bottles. See you then! -Todd │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [✏️ Edit]  [✓ Send Now]                                    │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  ⚡ QUICK ALERTS                                             │
│  [🍽️ Lunch]  [🤝 All Hands]  [⛈️ Weather]  [🚜 Equipment]   │
└──────────────────────────────────────────────────────────────┘
```

### C. PROACTIVE INTELLIGENCE

```
┌──────────────────────────────────────────────────────────────┐
│  🧠 CHIEF RECOMMENDS                                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  🔴 CRITICAL                                                 │
│  ├── Rain at 2pm - Move outdoor tasks to morning            │
│  │   [✓ Approve Auto-Reschedule]                            │
│  │                                                           │
│  └── Tom hasn't checked in (30 min late)                    │
│      [📱 Text Tom] [📞 Call] [Ignore]                       │
│                                                              │
│  🟡 ATTENTION                                                │
│  ├── Maria taking longer than expected on lettuce harvest   │
│  │   Suggestion: She may need help or equipment issue       │
│  │                                                           │
│  └── CSA boxes due tomorrow - harvest list not started      │
│      [📋 Generate Harvest List]                             │
│                                                              │
│  🟢 INSIGHTS                                                 │
│  ├── Jake is 50% faster at transplanting than team average  │
│  │   Consider: Assign him complex transplanting tasks       │
│  │                                                           │
│  └── Efficiency up 12% this week vs last week              │
│      Top contributor: New harvest carts reduced travel time │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### D. LEARNING & PREDICTIONS

```
┌──────────────────────────────────────────────────────────────┐
│  📊 LABOR INTELLIGENCE                                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  TASK BENCHMARKS (Auto-Learning)                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Task              │ Benchmark │ Actual Avg │ Confidence ││
│  │───────────────────┼───────────┼────────────┼────────────││
│  │ Harvest Lettuce   │ 3 min/lb  │ 2.8 min/lb │ 95% (n=47) ││
│  │ Transplant Tomato │ 45 min/bed│ 52 min/bed │ 87% (n=23) ││
│  │ Weed Carrots      │ 20 min/bed│ 18 min/bed │ 78% (n=15) ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  PREDICTIONS                                                 │
│  ├── Tomorrow: 6.5 labor hours needed (vs 8 scheduled)      │
│  │   Recommendation: Light day, good for training           │
│  │                                                           │
│  ├── Next Week: Heavy harvest Tue-Thu                       │
│  │   Recommendation: Consider 1 additional worker           │
│  │                                                           │
│  └── Weather Impact: Rain Wed reduces outdoor work by 40%   │
│      Recommendation: Prep indoor tasks, greenhouse work     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## BACKEND MODULES NEEDED

### 1. ChiefOfStaffCommunications.js
See: `CHIEF_OF_STAFF_COMMUNICATIONS_SPEC.md`
- `getTeamContacts()` - Get employee contact list
- `draftMessage(intent, recipient)` - AI-assisted drafting
- `sendSMS(to, message)` - Send via Twilio
- `sendOwnerEmail(to, subject, body)` - Send via Gmail
- `sendTeamAlert(message, channels)` - Broadcast to team
- `getCommunicationHistory()` - Log of sent messages

### 2. SmartLaborIntelligence.js (EXISTS - NEEDS MERGE)
Already built, needs to be merged into MERGED TOTAL.js:
- `getMyWorkOrder(employeeId)` - Employee's daily prescription
- `checkInTask(taskId, employeeId)` - Start task timer
- `checkOutTask(taskId, data)` - Complete task with actuals
- `getLaborIntelligenceDashboard()` - Overview stats
- `getBenchmark(taskType, crop)` - Get time standards
- `getEmployeeEfficiencyTrend(employeeId)` - Performance over time

### 3. TeamAwareness.js (NEW)
Real-time team visibility:
```javascript
// Get live status of all employees
getTeamLiveStatus() → {
  employees: [{
    id, name, status, currentTask, location,
    timeOnTask, expectedTime, efficiency,
    fatigueLevel, tasksCompleted, tasksRemaining
  }],
  summary: { working, onBreak, notCheckedIn, issues }
}

// Get single employee detail
getEmployeeLiveDetail(employeeId) → {
  ...full detail including GPS breadcrumb, task history today
}

// Check for issues
getTeamAlerts() → [{
  type: 'LATE_CHECKIN' | 'OVERTIME' | 'LOW_EFFICIENCY' | 'NEEDS_BREAK',
  employee, message, suggestedAction
}]
```

### 4. ProactiveIntelligence.js (ENHANCE EXISTING)
Know what to do before the owner asks:
```javascript
// Morning brief with priorities
generateMorningPriorities() → [{
  rank, category, priority, reason, deadline,
  suggestedAction, autoApproveAvailable
}]

// Real-time anomaly detection
detectAnomalies() → [{
  type, severity, metric, employee, task,
  expected, actual, deviation, recommendation
}]

// Proactive recommendations
getProactiveRecommendations() → [{
  type: 'WEATHER' | 'WORKLOAD' | 'EFFICIENCY' | 'CUSTOMER',
  title, reason, action, impact, confidence
}]
```

### 5. LearningEngine.js (NEW)
Get smarter over time:
```javascript
// Record actual vs predicted
recordTaskOutcome(taskId, actualMinutes, conditions)

// Auto-adjust benchmarks
updateBenchmarkFromLearning(taskType, crop, newData)

// Track model accuracy
getModelHealth() → {
  accuracy, drift, lastUpdated, sampleSize,
  needsRetraining: boolean
}

// Employee skill profiling
updateEmployeeSkillProfile(employeeId, taskType, performance)

// Weekly learning digest
generateWeeklyLearningDigest() → {
  predictionsEvaluated, accuracyImprovement,
  benchmarksAdjusted, topPerformers, areasForImprovement
}
```

---

## DATA REQUIREMENTS

### Sheets Needed

**TEAM_LIVE_STATUS** (Updated every check-in/out)
```
Employee_ID | Name | Current_Status | Current_Task | Task_Start_Time |
Expected_End | Location | GPS_Lat | GPS_Lng | Efficiency_Today |
Tasks_Done | Tasks_Remaining | Last_Break | Fatigue_Score
```

**TASK_OUTCOMES** (Learning data)
```
Outcome_ID | Task_Type | Crop | Employee_ID | Predicted_Minutes |
Actual_Minutes | Weather_Temp | Weather_Conditions | Time_Of_Day |
Efficiency_Score | Quality_Score | Notes | Created_At
```

**BENCHMARKS** (Auto-learning)
```
Task_Type | Crop | Location | Benchmark_Minutes | Sample_Size |
Confidence | Last_Updated | Auto_Adjusted | Manual_Override
```

**COMMUNICATION_LOG**
```
Message_ID | Timestamp | Type | Recipient | Message | Status |
Sent_By | Channel | Response
```

**LEARNING_EPISODES**
```
Episode_ID | Type | Task_Type | Old_Value | New_Value |
Reason | Sample_Size | Approved | Created_At
```

---

## API ENDPOINTS TO ADD

```javascript
// Team Awareness
case 'getTeamLiveStatus':
case 'getEmployeeLiveDetail':
case 'getTeamAlerts':

// Communications
case 'getTeamContacts':
case 'draftMessage':
case 'sendSMS':
case 'sendOwnerEmail':
case 'sendTeamAlert':
case 'getCommunicationHistory':

// Proactive Intelligence
case 'getMorningPriorities':
case 'detectAnomalies':
case 'getProactiveRecommendations':
case 'acknowledgeRecommendation':
case 'executeRecommendation':

// Learning System
case 'recordTaskOutcome':
case 'getModelHealth':
case 'getWeeklyLearningDigest':
case 'triggerBenchmarkReview':
```

---

## PROACTIVE ALERT TYPES

| Alert Type | Trigger | Action |
|------------|---------|--------|
| `LATE_CHECKIN` | Employee 15+ min past expected start | Text reminder |
| `TASK_OVERTIME` | Task taking 2x expected time | Check for issues |
| `LOW_EFFICIENCY` | Employee <70% of benchmark | Investigate |
| `NEEDS_BREAK` | 2+ hours since last break | Suggest break |
| `WEATHER_CHANGE` | Rain/frost in forecast | Reschedule outdoor |
| `CUSTOMER_URGENT` | High-priority email/order | Surface for action |
| `HARVEST_WINDOW` | Crop at peak ripeness | Prioritize harvest |
| `EQUIPMENT_ISSUE` | Reported or detected | Assign repair |

---

## INTELLIGENCE LEVELS

**LEVEL 1: REACTIVE** (Basic) ❌
- Owner asks "What's Maria doing?" → System looks it up

**LEVEL 2: REAL-TIME** (Current) ⚡
- Dashboard shows what everyone is doing without asking

**LEVEL 3: PREDICTIVE** (Building) 📊
- System predicts problems and needs before they happen

**LEVEL 4: PROACTIVE** (Goal) 🧠
- System TELLS owner what to do
- Owner trusts and follows its recommendations
- System acts autonomously within approved limits

---

## ASSIGNMENT BY CLAUDE

| Claude | Assignment |
|--------|------------|
| **Backend Claude** | Build ChiefOfStaffCommunications.js, TeamAwareness.js, LearningEngine.js, merge SmartLaborIntelligence.js |
| **Desktop Claude** | Update chief-of-staff.html with Team Dashboard, Communications Panel, Proactive Intelligence UI |
| **Mobile Claude** | Ensure employee.html sends real-time status updates, check-in/out works |
| **PM_Architect** | Coordinate, review, test integration |

---

## SUCCESS CRITERIA

1. Owner can see what every employee is doing RIGHT NOW
2. Owner can text/email anyone with 3 clicks
3. Team alerts reach everyone within 30 seconds
4. Predictions are within 20% of actual (improving over time)
5. System proactively surfaces 80%+ of issues before owner notices
6. Benchmarks auto-adjust based on real data
7. Owner trusts system enough to follow its recommendations

---

## THE ULTIMATE TEST

**Owner wakes up, opens Chief of Staff:**

"Good morning, Todd. Here's what needs your attention:

1. 🌡️ Frost warning tonight - I've already scheduled greenhouse protection tasks for the evening crew
2. 📦 CSA boxes due tomorrow - harvest list is ready, crew assigned
3. ⚠️ Maria called in sick - I've redistributed her tasks to Jake and Ana
4. 💰 Chef Giovanni's order is 20% larger than usual - confirming we can fulfill
5. 📈 Team efficiency up 15% this week - new harvest carts are working

Your approval needed:
- [✓] Confirm CSA harvest list
- [✓] Approve overtime for Jake (2 hrs) to cover Maria

No other action required. Have a great day!"

---

*This is what STATE OF THE ART looks like. Make it happen.*
