# Goal-to-Action Planning System Specification

**Created:** 2026-02-04
**Author:** PM_Architect/Backend_Claude
**Version:** 1.0

## Mission Statement

> "It knows what I should do before me. I want to do its bidding because it is what is best for Tiny Seed Farm."

This system works BACKWARD from goals to generate the exact tasks needed to achieve farm success.

---

## 1. Research: Goal-Oriented AI Systems

### 1.1 OKR (Objectives and Key Results) Tracking

**What is OKR?**
- Objectives: Qualitative, inspirational goals ("Become the premier local farm supplier")
- Key Results: Quantitative, measurable outcomes ("20 wholesale accounts by Q2")
- Typically cascaded: Company > Team > Individual

**Relevance to Tiny Seed Farm:**
- Farm-level objectives (revenue, sustainability)
- Operation-level key results (CSA members, wholesale accounts)
- Individual tasks derived from key results

### 1.2 AI Task Decomposition

**How AI breaks down goals into tasks:**

1. **Gap Analysis**: Current state vs. target state
2. **Constraint Identification**: Time, resources, seasonality
3. **Task Templating**: Proven patterns for goal types
4. **Prioritization**: Urgency + impact scoring
5. **Dependency Mapping**: What must happen before what

**Example: Revenue Goal Gap**
```
Goal: $100K revenue
Current: $45K
Gap: $55K

AI Analysis:
- Average order value: $200
- Need: 275 additional orders
- Channels: CSA (50%), Wholesale (35%), Markets (15%)
- Tasks generated:
  1. Increase CSA by 15 members (+$15K)
  2. Add 8 wholesale accounts (+$20K)
  3. Attend 4 more farmers markets (+$5K)
  4. Launch online store (+$15K)
```

### 1.3 Backward Planning (Working Backward from Outcomes)

**Principle:** Start with the desired outcome and work backward to identify what actions are needed.

**Farm Application:**
```
End Goal: Harvest 500 lbs lettuce for restaurant X on June 1
<- Need: 500 lbs harvest-ready on June 1
<- Need: 600 plants (accounting for 15% loss) transplanted by May 1
<- Need: Seeds started by April 1
<- Need: Seed order placed by March 15
<- Need: Production plan reviewed by March 1
```

**Implementation:** Each goal generates a chain of prerequisite tasks with calculated dates.

### 1.4 Habit/Routine Optimization Systems

**Key Concepts:**
- **Habit stacking**: Linking new tasks to existing routines
- **Time blocking**: Dedicated time slots for recurring activities
- **Batching**: Grouping similar tasks for efficiency
- **Triggers**: Environmental or time-based task activation

**Farm Application:**
```
Morning routine (6 AM):
1. Check weather forecast
2. Review today's tasks (auto-generated)
3. Walk greenhouse (inspection habit)
4. Check irrigation status

Weekly routine (Monday):
1. Review goal progress
2. Generate weekly task list
3. Schedule wholesale outreach
4. Update production tracker
```

### 1.5 Farm-Specific Goal Tracking Considerations

**Unique Farm Challenges:**
- **Seasonality**: Goals must align with growing seasons
- **Weather dependency**: Tasks may need rescheduling
- **Biological constraints**: Plants don't wait for meetings
- **Market timing**: CSA signups, restaurant contracts have windows
- **Cash flow cycles**: Revenue follows harvest, not effort

**Farm-Optimized Goal Framework:**
```
Revenue goals     -> Sales tasks
Production goals  -> Planting/cultivation tasks
Quality goals     -> Process improvement tasks
Efficiency goals  -> Labor optimization tasks
Growth goals      -> Business development tasks
```

---

## 2. Goal System Design

### 2.1 Goal Types for Tiny Seed Farm

#### Revenue Goals
| Goal Type | Example | Key Metrics |
|-----------|---------|-------------|
| Monthly Revenue | Hit $8K/month | Dollar amount |
| Revenue per Crop | $500/week tomatoes | $/crop |
| Customer Acquisition | 5 new accounts/quarter | Count |
| CSA Members | 50 members by April 1 | Count |

#### Production Goals
| Goal Type | Example | Key Metrics |
|-----------|---------|-------------|
| Bed Feet | 2000 bed feet in production | Linear feet |
| Yield per Crop | 100 lbs/bed tomatoes | Weight/area |
| Succession Planting | Continuous lettuce | Weeks of supply |
| Variety Trials | Test 5 new varieties | Count |

#### Quality Goals
| Goal Type | Example | Key Metrics |
|-----------|---------|-------------|
| Customer Satisfaction | 4.8+ rating | Score |
| Product Quality | <5% rejection | Percentage |
| On-time Delivery | 95% on time | Percentage |
| Order Accuracy | 99% accuracy | Percentage |

#### Efficiency Goals
| Goal Type | Example | Key Metrics |
|-----------|---------|-------------|
| Labor Hours | <10 hours/bed/season | Hours |
| Cost per Unit | $2/lb production cost | $/unit |
| Waste Reduction | <10% post-harvest loss | Percentage |
| Harvest Efficiency | 50 lbs/hour | Weight/time |

#### Growth Goals
| Goal Type | Example | Key Metrics |
|-----------|---------|-------------|
| New Markets | 2 new farmers markets | Count |
| New Products | Add flower CSA | Count |
| Infrastructure | Install 3 hoop houses | Count |
| Team Expansion | Hire 2 seasonal workers | Count |

### 2.2 Goal Data Structure

```javascript
{
  id: 'goal-2026-revenue',
  type: 'revenue',                    // revenue, production, quality, efficiency, growth
  title: 'Hit $100K Annual Revenue',
  description: 'Achieve $100,000 in total farm revenue for 2026',
  target: 100000,
  current: 45000,
  unit: 'USD',
  deadline: '2026-12-31',
  status: 'active',                   // active, achieved, missed, paused

  // Key Results (OKR style)
  keyResults: [
    {
      id: 'kr1',
      title: '20 wholesale accounts',
      target: 20,
      current: 12,
      unit: 'accounts',
      weight: 0.35                    // 35% of goal
    },
    {
      id: 'kr2',
      title: '50 CSA members',
      target: 50,
      current: 35,
      unit: 'members',
      weight: 0.40                    // 40% of goal
    },
    {
      id: 'kr3',
      title: '$500/week farmers markets',
      target: 500,
      current: 380,
      unit: 'USD/week',
      weight: 0.25                    // 25% of goal
    }
  ],

  // AI-generated tasks
  generatedTasks: [],                 // Populated by generateGoalTasks()

  // Metadata
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-04T00:00:00Z',
  createdBy: 'system',
  notes: ''
}
```

### 2.3 AI Task Generation Logic

#### Revenue Gap Tasks
```javascript
if (goal.type === 'revenue' && gap > 0) {
  tasks.push(
    { title: 'Review pricing strategy', category: 'Sales', priority: 'HIGH' },
    { title: 'Contact 5 potential wholesale customers', category: 'Sales', priority: 'HIGH' },
    { title: 'Plan farmers market promotion', category: 'Marketing', priority: 'MEDIUM' },
    { title: 'Email past customers about seasonal offerings', category: 'Marketing', priority: 'MEDIUM' }
  );
}
```

#### CSA Growth Tasks
```javascript
if (goal.title.includes('CSA') && gap > 0) {
  tasks.push(
    { title: 'Post CSA signup on social media', category: 'Marketing', priority: 'HIGH' },
    { title: 'Email past CSA members', category: 'Sales', priority: 'HIGH' },
    { title: 'Partner with local business for CSA promotion', category: 'Marketing', priority: 'MEDIUM' },
    { title: 'Create CSA info packets for distribution', category: 'Marketing', priority: 'MEDIUM' }
  );
}
```

#### Wholesale Growth Tasks
```javascript
if (goal.title.includes('Wholesale') && gap > 0) {
  tasks.push(
    { title: 'Research new restaurant openings', category: 'Sales', priority: 'HIGH' },
    { title: 'Prepare wholesale pitch deck', category: 'Sales', priority: 'MEDIUM' },
    { title: 'Schedule chef meetings', category: 'Sales', priority: 'HIGH' },
    { title: 'Send samples to prospective accounts', category: 'Sales', priority: 'MEDIUM' }
  );
}
```

#### Production Gap Tasks
```javascript
if (goal.type === 'production' && gap > 0) {
  tasks.push(
    { title: 'Review planting schedule', category: 'Production', priority: 'HIGH' },
    { title: 'Calculate additional bed feet needed', category: 'Planning', priority: 'HIGH' },
    { title: 'Order additional seeds/transplants', category: 'Procurement', priority: 'MEDIUM' },
    { title: 'Schedule additional planting dates', category: 'Production', priority: 'MEDIUM' }
  );
}
```

---

## 3. API Endpoints

### GET Endpoints

| Endpoint | Description | Parameters |
|----------|-------------|------------|
| `getFarmGoals` | Get all goals with progress | none |
| `generateGoalTasks` | Generate tasks for a goal | goalId |
| `getGoalsWithTasks` | All goals with their tasks | none |
| `getMorningBriefWithGoals` | Morning brief including goals | none |

### POST Endpoints

| Endpoint | Description | Parameters |
|----------|-------------|------------|
| `updateGoalProgress` | Update current progress | goalId, current |
| `addFarmGoal` | Create new goal | goal data |
| `updateFarmGoal` | Update goal details | goalId, updates |
| `deleteFarmGoal` | Remove a goal | goalId |

---

## 4. Integration Points

### Chief of Staff Dashboard
- Goal progress bars with visual indicators
- AI-generated tasks prominently displayed
- One-click task execution
- Gap analysis visualization

### Morning Brief
- Top 3 goal priorities
- Tasks generated from goal gaps
- Progress updates since yesterday

### Task System
- Tasks tagged with source goal
- Completion updates goal progress
- Priority weighted by goal urgency

---

## 5. FARM_GOALS Sheet Structure

| Column | Type | Description |
|--------|------|-------------|
| Goal_ID | String | Unique identifier |
| Type | Enum | revenue, production, quality, efficiency, growth |
| Title | String | Human-readable goal name |
| Target | Number | Target value |
| Current | Number | Current value |
| Unit | String | USD, count, percentage, etc. |
| Deadline | Date | Goal deadline |
| Status | Enum | active, achieved, missed, paused |
| Key_Results_JSON | JSON | Array of key results |
| Notes | String | Additional notes |
| Created_At | DateTime | Creation timestamp |
| Updated_At | DateTime | Last update timestamp |

---

## 6. Dashboard UI Design (Chief of Staff Integration)

### Goals Section Layout

```
+------------------------------------------------------------------+
|  FARM GOALS                                    [+ Add Goal]       |
+------------------------------------------------------------------+
|                                                                   |
|  $100K Annual Revenue           ████████░░░░░░░░  45%            |
|  Target: $100,000 | Current: $45,000 | Gap: $55,000              |
|  [At Risk] Deadline: Dec 31, 2026                                |
|  > View 4 AI-generated tasks                                      |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  50 CSA Members                 ██████████████░░  70%            |
|  Target: 50 | Current: 35 | Gap: 15                              |
|  [On Track] Deadline: Apr 1, 2026                                |
|  > View 4 AI-generated tasks                                      |
|                                                                   |
+------------------------------------------------------------------+
|                                                                   |
|  20 Wholesale Accounts          ████████████░░░░  60%            |
|  Target: 20 | Current: 12 | Gap: 8                               |
|  [Needs Attention] Deadline: Jun 1, 2026                         |
|  > View 4 AI-generated tasks                                      |
|                                                                   |
+------------------------------------------------------------------+
```

### Expanded Task View

```
+------------------------------------------------------------------+
|  Tasks for: Hit $100K Annual Revenue                              |
|  Gap: $55,000 remaining                                          |
+------------------------------------------------------------------+
|                                                                   |
|  [HIGH] Review pricing strategy                     Due: Mon 2/5  |
|  Need $55,000 more revenue. Review if prices are competitive.    |
|  [ Start Task ]                                                   |
|                                                                   |
|  [HIGH] Contact 5 potential wholesale customers     Due: Wed 2/7  |
|  Reach out to restaurants and grocers in target areas            |
|  [ Start Task ]                                                   |
|                                                                   |
|  [MED]  Plan farmers market promotion               Due: Fri 2/9  |
|  Create special offer to boost market sales                      |
|  [ Start Task ]                                                   |
|                                                                   |
|  [MED]  Email past customers about seasonal offerings Due: Tue 2/6|
|  Re-engage customers who haven't ordered recently                |
|  [ Start Task ]                                                   |
|                                                                   |
+------------------------------------------------------------------+
```

### Color Coding

| Status | Color | Visual |
|--------|-------|--------|
| On Track | Green (#22c55e) | Solid progress bar |
| Needs Attention | Amber (#f59e0b) | Warning indicator |
| At Risk | Red (#ef4444) | Alert indicator |
| Achieved | Blue (#3b82f6) | Checkmark icon |

### CSS Classes (Following Existing Dashboard Patterns)

```css
.goal-card {
  background: var(--card);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 12px;
  border-left: 4px solid var(--accent);
}

.goal-card.at-risk { border-left-color: var(--accent-red); }
.goal-card.needs-attention { border-left-color: var(--accent-amber); }
.goal-card.on-track { border-left-color: var(--accent); }
.goal-card.achieved { border-left-color: var(--accent-blue); }

.goal-progress-bar {
  height: 8px;
  background: var(--border);
  border-radius: 4px;
  overflow: hidden;
}

.goal-progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s ease;
}

.goal-tasks-toggle {
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  margin-top: 8px;
}
```

---

## 7. Implementation Status

### Completed
- [x] Goal system specification
- [x] Data structure design
- [x] API endpoint design
- [x] Task generation logic design
- [x] getFarmGoals() function
- [x] generateGoalTasks() function
- [x] getGoalsWithTasks() function
- [x] updateGoalProgress() function
- [x] getMorningBriefWithGoals() function
- [x] addFarmGoal() function
- [x] getGoalById() function
- [x] FARM_GOALS sheet auto-initialization
- [x] API endpoints registered in doGet()

### To Implement
- [ ] Dashboard UI integration (ChiefOfStaffDashboard.html)
- [ ] Goal progress update UI
- [ ] Task-to-goal completion linking
- [ ] Backward planning engine (Phase 2)

---

## 7. Future Enhancements

### Phase 2: Machine Learning
- Learn which tasks actually close gaps
- Predict goal achievement probability
- Optimize task generation based on outcomes

### Phase 3: Automated Goal Setting
- Suggest goals based on farm performance
- Benchmark against similar farms
- Seasonal goal templates

### Phase 4: Team Goals
- Individual employee goals
- Team performance tracking
- Goal-based compensation

---

*This system transforms the farm from reactive ("what do I need to do today?") to proactive ("what must I do to achieve my goals?").*
