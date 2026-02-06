# PROACTIVE_AI_SPEC.md
## Proactive Intelligence Engine for Tiny Seed Farm OS
### The Brain That Knows What To Do Before You Do

**Version:** 1.0
**Date:** 2026-02-04
**Author:** PM_Architect/Backend_Claude
**Mission:** "I want to do its bidding because it is what is best for Tiny Seed Farm." - Owner Vision

---

## EXECUTIVE SUMMARY

The Proactive Intelligence Engine is the BRAIN of Tiny Seed Farm OS. Unlike reactive systems that wait for user commands, this system:

- **Anticipates** needs before they're expressed
- **Recommends** actionable steps with clear reasoning
- **Learns** from patterns and feedback
- **Drives** the farm toward success proactively

This document specifies the architecture, data sources, intelligence types, and implementation plan for a proactive AI system that transforms Tiny Seed Farm from a tool the owner uses into a partner that guides farm operations.

---

## PART 1: RESEARCH FINDINGS

### 1.1 Predictive Task Systems

#### How Superhuman Predicts What You'll Do Next

Based on research from [Superhuman's AI implementation](https://blog.superhuman.com/ai-powered-task-management/):

- **Pattern Recognition:** The system watches how users work and learns which messages truly matter
- **Natural Language Processing:** Understands meaning, tone, and context - not just keywords
- **Predictive Analysis:** Highlights important messages because it learned to predict what users care about
- **Auto Draft:** Automatically writes follow-up emails without prompting by analyzing thread context
- **Behavioral Learning:** Studies behavior patterns and improves at identifying items needing immediate attention

**Key Metrics:** 85% of users opt-in to AI features; users engage with AI features 25+ times/week

#### Smart Compose and Anticipatory Features

Gmail and Superhuman use:
- Historical writing pattern analysis
- Context from current conversation
- Sender/recipient relationship data
- Time-of-day patterns
- Previous response patterns

**Application to Tiny Seed:** Our system can predict:
- Which crops need attention based on growth stage + weather
- Which customers are likely to order based on history
- Which tasks the owner will want to do based on day/time patterns
- What the farm needs before the owner realizes it

### 1.2 Proactive Notification Systems

#### When Should AI Interrupt vs. Stay Quiet?

Research from [IBM on Alert Fatigue](https://www.ibm.com/think/insights/alert-fatigue-reduction-with-ai-agents) and [incident.io's 2025 Guide](https://incident.io/blog/2025-guide-to-preventing-alert-fatigue-for-modern-on-call-teams):

**The Problem:**
- Excessive notifications cause 10% of users to turn off apps
- After an interruption, it takes 23 minutes to regain focus
- Response rates drop 52% with 10+ notifications/hour
- AI-powered filtering can reduce noise by 90%

**Best Practices for Tiny Seed:**

| Priority Level | Interruption Type | Examples |
|----------------|-------------------|----------|
| CRITICAL | Immediate push/SMS | Frost warning tonight, order window closing in 1 hour, equipment failure |
| HIGH | Dashboard highlight + daily digest | Tomorrow's harvest list ready, low inventory item, customer hasn't ordered in 30+ days |
| MEDIUM | Daily brief only | Crop approaching harvest window, seasonal pattern suggestion |
| LOW | Weekly digest | Market trend insight, efficiency optimization suggestion |

**Smart Batching Rules:**
1. **Time-based batching:** Group non-critical alerts into morning brief (6 AM) and evening summary (5 PM)
2. **Context-aware delivery:** Don't send harvest alerts at 10 PM; don't send financial alerts during peak harvest
3. **Snooze intelligence:** If owner dismisses similar alerts 3x, auto-reduce that alert type
4. **Escalation ladder:** MEDIUM becomes HIGH if ignored for 24 hours

### 1.3 Farm Management AI Decision Support

Research from [Farmonaut](https://farmonaut.com/precision-farming/fms-agriculture-2025-transform-your-farm-with-smart-systems) and [StartUs Insights](https://www.startus-insights.com/innovators-guide/ai-in-agriculture-strategic-guide/):

**What Data Drives Recommendations:**
- Historical crop yield data
- Satellite imagery (NDVI, NDMI)
- Weather patterns (current + forecast)
- Soil conditions
- Growing Degree Days (GDD)
- Market prices and demand
- Labor availability
- Equipment status

**AI-Driven Decision Points:**
| Decision Area | Data Sources | Recommendation Type |
|---------------|--------------|---------------------|
| Harvest Timing | GDD, weather forecast, crop maturity | "Harvest lettuce tomorrow - rain coming Thursday" |
| Planting Windows | Soil temp, frost dates, succession plan | "Plant carrot succession #4 this week" |
| Irrigation | Soil moisture, forecast, NDMI | "Skip irrigation - 1.5" rain expected" |
| Pest Management | NDVI anomalies, weather, crop stage | "Scout field 3 - satellite shows stress pattern" |
| Labor Scheduling | Task deadlines, weather, crop urgency | "Need 3 crew members Monday for critical harvest" |

### 1.4 Goal-Oriented AI Systems

Research from [Tability](https://www.tability.io) and [OKR AI tools](https://www.okrstool.com/blog/ai-powered-okr-tool):

**Working Backward from Goals:**

For Tiny Seed Farm, the system should:

1. **Start with Season Goals:**
   - Revenue target: $X
   - New wholesale accounts: Y
   - CSA member retention: Z%

2. **Decompose to Monthly Milestones:**
   - January: $X/12 revenue, onboard Z wholesale accounts
   - Weekly targets derived from monthly

3. **Generate Daily Actions:**
   - "To hit January revenue, you need 3 more wholesale orders this week"
   - "CSA renewal rate is 85% - contact these 5 at-risk members today"

4. **Provide Progress Feedback:**
   - "You're 15% ahead of revenue goal this month"
   - "At current pace, you'll miss CSA retention target by 8%"

---

## PART 2: INTELLIGENCE TYPES

### 2.1 Weather Intelligence

**Data Sources:**
- Weather API (current + 7-day forecast)
- Historical weather patterns
- GDD calculations
- Frost date tracking

**Proactive Triggers:**

| Condition | Priority | Action Card |
|-----------|----------|-------------|
| Frost warning (temp < 36F overnight) | CRITICAL | "Frost tonight: Harvest tender crops or cover with row cover by 6 PM" |
| 3+ days of rain forecast | HIGH | "Rain coming: Complete all urgent outdoor work today" |
| Heat wave (90F+) | HIGH | "Heat advisory: Start harvest at 5 AM, stop by noon, extra water for crew" |
| Perfect planting weather | MEDIUM | "Ideal conditions: Great day for transplanting" |
| GDD milestone reached | MEDIUM | "Tomatoes reached 1000 GDD - check for first harvest" |

**Learning System:**
- Track which weather alerts owner acted on vs. dismissed
- Adjust temperature thresholds based on actual crop damage events
- Learn micro-climate patterns specific to farm location

### 2.2 Calendar Intelligence

**Data Sources:**
- Google Calendar events
- Order window schedule (hardcoded business rules)
- Market days
- Delivery schedule
- Historical patterns

**Proactive Triggers:**

| Condition | Priority | Action Card |
|-----------|----------|-------------|
| Order window closing in 2 hours | CRITICAL | "Friday order window closes at 6 AM - review pending orders" |
| Market day tomorrow | HIGH | "Lawrenceville Market tomorrow: Harvest list ready?" |
| Big harvest day (Mon/Thu) | HIGH | "Big harvest day: Crew assignments confirmed?" |
| Delivery day (Tue/Fri) | HIGH | "Delivery day: Route optimized, invoices sent?" |
| CSA renewal deadline approaching | MEDIUM | "CSA season ends in 2 weeks - renewal campaign?" |
| Slow week predicted | LOW | "Light week ahead: Good time for maintenance tasks" |

**Learning System:**
- Track how early owner prefers reminders (1 day? 2 hours?)
- Learn which events owner actually attends vs. cancels
- Identify recurring patterns (always late on Monday harvest prep?)

### 2.3 Inventory Intelligence

**Data Sources:**
- Product inventory (INVENTORY sheet)
- Harvest forecasts
- Sales velocity
- Reorder points
- Seed inventory

**Proactive Triggers:**

| Condition | Priority | Action Card |
|-----------|----------|-------------|
| Stock = 0 | CRITICAL | "OUT OF STOCK: Cherry Tomatoes - update availability" |
| Stock < reorder point | HIGH | "Low stock: Arugula (5 lbs remaining, 20 lb/week velocity)" |
| Harvest ready but not harvested | HIGH | "Overripe risk: Lettuce in Field 3 - harvest today" |
| Seed inventory low for next planting | MEDIUM | "Order seeds: Carrot seeds needed for succession #5" |
| Predicted stockout in 3 days | MEDIUM | "Forecast: Kale stockout by Friday without harvest" |

**Learning System:**
- Adjust reorder points based on actual sales velocity
- Learn seasonal demand patterns by product
- Track which products have highest stockout cost (customer complaints)

### 2.4 Financial Intelligence

**Data Sources:**
- Revenue tracking (orders, invoices)
- Expense tracking
- Cash flow projections
- Budget vs. actual
- Customer payment history

**Proactive Triggers:**

| Condition | Priority | Action Card |
|-----------|----------|-------------|
| Invoice overdue 30+ days | HIGH | "Overdue: $500 from Restaurant XYZ (45 days)" |
| Cash flow negative in 7 days | HIGH | "Cash alert: Projected negative balance by Thursday" |
| Revenue 20%+ below weekly target | MEDIUM | "Revenue gap: $800 behind this week's target" |
| Unusual expense detected | MEDIUM | "Expense spike: Supplies 40% above normal this month" |
| Profitable week/month | LOW | "Win: Best revenue week this season!" |

**Learning System:**
- Track seasonal revenue patterns
- Learn which customers pay slowly
- Identify expense anomalies vs. expected variations

### 2.5 Customer Intelligence

**Data Sources:**
- Order history (WHOLESALE_ORDERS)
- CSA member data
- Communication history (emails, SMS)
- Customer profiles
- Churn risk scoring

**Proactive Triggers:**

| Condition | Priority | Action Card |
|-----------|----------|-------------|
| High-value customer inactive 14+ days | HIGH | "Re-engage: Chef Marco hasn't ordered in 14 days" |
| Churn risk > 70% | HIGH | "At-risk CSA member: Sarah hasn't picked up 2 weeks" |
| Customer birthday/anniversary | MEDIUM | "Personal touch: Restaurant ABC's 1-year anniversary" |
| Upsell opportunity | MEDIUM | "Upsell: Restaurant XYZ orders lettuce, never tried arugula" |
| New customer onboarding incomplete | MEDIUM | "Follow-up: New wholesale account needs welcome call" |

**Learning System:**
- Track which re-engagement actions work
- Learn customer communication preferences
- Build customer lifetime value predictions

### 2.6 Production Intelligence

**Data Sources:**
- PLANNING_2026 (planting plan)
- PLANTINGS (active plantings)
- Field status (SATELLITE_FIELDS)
- NDVI readings (SATELLITE_READINGS)
- Task completion data

**Proactive Triggers:**

| Condition | Priority | Action Card |
|-----------|----------|-------------|
| Planting deadline in 3 days | HIGH | "Planting window: Succession #4 carrots must be sown by Friday" |
| NDVI anomaly detected | HIGH | "Field issue: Satellite shows stress in Beds 5-7, scout today" |
| Harvest window optimal | MEDIUM | "Harvest ready: Beets in Field 2 at peak quality" |
| Succession gap detected | MEDIUM | "Gap alert: No lettuce harvest projected for week of 3/15" |
| Cover crop window opening | LOW | "Cover crop: Field 4 ready for cover crop seeding" |

**Learning System:**
- Refine DTM predictions based on actual harvest dates
- Learn which fields have consistent problems
- Track task completion accuracy

---

## PART 3: ACTION CARD SPECIFICATION

### 3.1 Action Card Structure

Every proactive insight generates an "Action Card" with this structure:

```javascript
{
  // Identity
  id: 'weather-frost-2026-02-04',           // Unique ID for tracking
  generatedAt: '2026-02-04T06:00:00Z',      // When insight was created

  // Classification
  priority: 'CRITICAL',                      // CRITICAL, HIGH, MEDIUM, LOW
  category: 'Weather',                       // Weather, Calendar, Inventory, Finance, Customer, Production

  // Display
  icon: '🥶',                                // Visual indicator
  title: 'Frost Warning Tonight',            // Short headline (max 50 chars)

  // Content
  action: 'Harvest tender crops or cover with row cover',  // What to do
  reason: 'Temperature expected to drop to 32°F at 3am',   // Why now
  deadline: 'Before 6pm today',              // When it must be done

  // Context
  affectedItems: ['Lettuce Field 3', 'Tomatoes Greenhouse'],  // What's at risk
  potentialImpact: '$500 crop loss if unharvested',           // Cost of inaction
  dataSource: 'Weather API + Crop Inventory',                 // How we know
  confidence: 0.92,                          // AI confidence score (0-1)

  // Automation
  automatable: false,                        // Can AI execute this?
  autoAction: null,                          // Function to call if automatable
  autoParams: {},                            // Parameters for auto action
  requiresApproval: true,                    // Does automation need owner OK?

  // Tracking
  status: 'ACTIVE',                          // ACTIVE, DISMISSED, COMPLETED, EXPIRED
  dismissedAt: null,
  dismissReason: null,
  completedAt: null,
  feedbackScore: null,                       // Was this useful? (1-5)
  actionTaken: null                          // What owner actually did
}
```

### 3.2 Priority Levels

| Priority | Color | Sound | Delivery | Auto-Escalation |
|----------|-------|-------|----------|-----------------|
| CRITICAL | Red | Immediate push | SMS + Dashboard flash | Escalates to phone call after 1 hour |
| HIGH | Orange | Push notification | Dashboard prominent + daily brief | Escalates to CRITICAL after 4 hours |
| MEDIUM | Yellow | Silent | Dashboard + daily brief | Escalates to HIGH after 24 hours |
| LOW | Blue | Silent | Weekly digest only | Never escalates |

### 3.3 Category Icons

| Category | Icon | Color |
|----------|------|-------|
| Weather | 🌤️ ❄️ 🌧️ 🔥 | Blue/Purple |
| Calendar | 📅 ⏰ | Purple |
| Inventory | 📦 🌱 | Orange |
| Finance | 💰 📊 | Green |
| Customer | 👤 🤝 | Teal |
| Production | 🌾 🚜 | Brown |

---

## PART 4: LEARNING SYSTEM

### 4.1 Feedback Loop

The system learns from every interaction:

1. **Implicit Feedback:**
   - Did owner view the insight?
   - How quickly did they act?
   - Did they dismiss it?
   - What did they do instead?

2. **Explicit Feedback:**
   - "Was this useful?" (thumbs up/down)
   - "What should have been different?"
   - "Don't show me this type again"

3. **Outcome Tracking:**
   - Did the predicted event occur?
   - Was the recommendation followed?
   - What was the actual outcome?

### 4.2 Learning Dimensions

| Dimension | What We Learn | Application |
|-----------|---------------|-------------|
| Timing Preferences | Owner prefers reminders 2 hours before, not 24 hours | Adjust reminder timing |
| Priority Calibration | Owner ignores "HIGH" inventory alerts for tomatoes | Lower priority for tomatoes |
| Action Patterns | Owner always harvests before forecast rain | Predict this action |
| Category Preferences | Owner highly values customer insights, dismisses financial | Weight categories |
| Communication Style | Owner prefers brief alerts on mobile, detailed on desktop | Adapt message length |

### 4.3 Pattern Detection

The system identifies patterns like:
- "Every Monday, owner checks inventory first thing"
- "Owner always forgets Thursday harvest prep"
- "Revenue drops 20% every August - vacation pattern?"
- "Chef Marco always orders on Tuesdays"

These patterns become predictions:
- "Monday 6 AM: Prepare inventory summary"
- "Wednesday 5 PM: Remind about Thursday harvest"
- "August: Suggest vacation autoresponder for orders"
- "Tuesday: Expect Chef Marco's order"

---

## PART 5: DATA SOURCES

### 5.1 Internal Data Sources

| Source | Sheet/API | Update Frequency | Key Data |
|--------|-----------|------------------|----------|
| Weather | Weather API cache | Every 3 hours | Forecast, GDD, frost dates |
| Calendar | Google Calendar | Real-time | Events, deadlines |
| Orders | WHOLESALE_ORDERS | Real-time | Customer orders, revenue |
| Inventory | INVENTORY / Products | Real-time | Stock levels, availability |
| Plantings | PLANNING_2026 | Daily | Planting schedule, DTM |
| Satellite | SATELLITE_READINGS | Daily | NDVI, field health |
| Tasks | UNIFIED_TASKS | Real-time | Task status, completion |
| Customers | CUSTOMERS | Real-time | Profiles, history |
| Finance | Financial sheets | Daily | Revenue, expenses, cash flow |

### 5.2 External Data Sources (Future)

| Source | API | Data Provided |
|--------|-----|---------------|
| Weather | OpenWeatherMap / Tomorrow.io | 7-day forecast, hourly precision |
| Market Prices | USDA Market News | Commodity prices, demand signals |
| Satellite | Agromonitoring | NDVI, soil moisture, crop health |
| Calendar | Google Calendar API | Events, availability |

---

## PART 6: IMPLEMENTATION ARCHITECTURE

### 6.1 System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROACTIVE INTELLIGENCE ENGINE                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Weather   │  │  Calendar   │  │  Inventory  │             │
│  │   Scanner   │  │   Scanner   │  │   Scanner   │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐             │
│  │  Financial  │  │  Customer   │  │ Production  │             │
│  │   Scanner   │  │   Scanner   │  │   Scanner   │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          ▼                                      │
│                ┌─────────────────┐                              │
│                │  INSIGHT ENGINE │                              │
│                │   (Aggregator)  │                              │
│                └────────┬────────┘                              │
│                         │                                       │
│         ┌───────────────┼───────────────┐                       │
│         ▼               ▼               ▼                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │  Priority   │ │   Dedup &   │ │  Learning   │               │
│  │   Scorer    │ │   Batching  │ │   Engine    │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│                         │                                       │
│                         ▼                                       │
│                ┌─────────────────┐                              │
│                │  ACTION CARDS   │                              │
│                │    (Output)     │                              │
│                └────────┬────────┘                              │
│                         │                                       │
│         ┌───────────────┼───────────────┐                       │
│         ▼               ▼               ▼                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │  Dashboard  │ │    SMS /    │ │   Daily     │               │
│  │   Widget    │ │ Telegram    │ │   Brief     │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Scanning Schedule

| Scanner | Frequency | Trigger |
|---------|-----------|---------|
| Weather | Every 3 hours | Time-based trigger |
| Calendar | Every 15 minutes | Time-based trigger |
| Inventory | Real-time + hourly | Order events + timer |
| Financial | Daily 6 AM | Time-based trigger |
| Customer | Daily 6 AM + order events | Hybrid trigger |
| Production | Daily 5 AM | Time-based trigger |

### 6.3 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `generateProactiveInsights` | GET | Get all current insights |
| `getInsightsByPriority` | GET | Filter insights by priority |
| `getInsightsByCategory` | GET | Filter insights by category |
| `dismissInsight` | POST | Mark insight as dismissed |
| `completeInsight` | POST | Mark insight as completed |
| `rateInsight` | POST | Provide feedback on insight |
| `executeInsightAction` | POST | Trigger automatable action |
| `getInsightHistory` | GET | View past insights |
| `getInsightMetrics` | GET | Analytics on insight system |
| `runInsightScan` | POST | Force a proactive scan |

---

## PART 7: INTEGRATION WITH CHIEF OF STAFF

### 7.1 Dashboard Integration

The Chief of Staff Dashboard should:

1. **On Load:**
   - Call `generateProactiveInsights()`
   - Display top 5 insights as action cards
   - Show count of CRITICAL/HIGH items prominently

2. **Real-time Updates:**
   - Poll for new insights every 60 seconds
   - Flash animation for new CRITICAL items
   - Sound alert for CRITICAL (if enabled)

3. **User Interactions:**
   - One-click dismiss with reason capture
   - One-click complete with outcome capture
   - Expand for full details
   - Quick feedback (thumbs up/down)

4. **Automatable Actions:**
   - Show "Execute" button for automatable insights
   - Confirmation dialog for high-impact actions
   - Progress indicator during execution

### 7.2 Morning Brief Integration

The Morning Brief should include:

1. **Priority Section:**
   - All CRITICAL items at top
   - Count of HIGH/MEDIUM/LOW items

2. **Category Sections:**
   - Weather outlook with recommendations
   - Today's calendar with prep tasks
   - Inventory alerts
   - Customer follow-ups needed
   - Production tasks with priorities

3. **Goal Progress:**
   - Weekly/monthly revenue vs. target
   - Key metrics trending up/down

---

## PART 8: FUTURE ENHANCEMENTS

### 8.1 Phase 2: Advanced AI

- **Natural Language Insights:** "Hey Todd, I noticed the forecast changed - might want to move tomorrow's transplanting to Wednesday"
- **Conversational Follow-up:** "Should I also notify the crew about the schedule change?"
- **Multi-step Reasoning:** Chain multiple insights into action plans

### 8.2 Phase 3: Full Automation

- **Auto-execute Low-risk Actions:** Automatically send standard customer reminders
- **Approval Workflows:** "I drafted this email to Chef Marco about his missing order. Send?"
- **Autonomous Scheduling:** Automatically reschedule tasks based on weather

### 8.3 Phase 4: Predictive Modeling

- **Yield Prediction:** ML model trained on farm's historical data
- **Demand Forecasting:** Predict customer orders before they happen
- **Labor Optimization:** Predict staffing needs 2 weeks out

---

## APPENDIX A: EXISTING PROACTIVE FUNCTIONS IN MERGED TOTAL.js

The following proactive functions already exist and should be leveraged:

| Function | Location | Purpose |
|----------|----------|---------|
| `runProactiveScanning()` | Line ~10868 | Main proactive scan orchestrator |
| `generateProactiveAlerts()` | Line ~89488 | Creates alerts from multiple sources |
| `getActiveAlerts()` | Endpoint | Retrieve current alerts |
| `dismissAlert()` | Endpoint | Dismiss an alert |
| `createProactiveAlert()` | Line ~11174 | Create a new alert |
| `getProactiveRecommendations()` | Line ~72860 | Get routing/delivery recommendations |
| `checkCustomersAtRisk()` | Function | Find churn-risk customers |
| `checkOverdueItems()` | Function | Find overdue tasks |

**These existing functions form the foundation.** The new Proactive Intelligence Engine should:
1. Call these existing functions
2. Aggregate their outputs
3. Apply the Action Card structure
4. Add the learning system
5. Integrate with the Chief of Staff Dashboard

---

## APPENDIX B: RESEARCH SOURCES

- [Superhuman AI Email Management](https://blog.superhuman.com/ai-powered-task-management/)
- [IBM Alert Fatigue Reduction](https://www.ibm.com/think/insights/alert-fatigue-reduction-with-ai-agents)
- [incident.io 2025 Alert Fatigue Guide](https://incident.io/blog/2025-guide-to-preventing-alert-fatigue-for-modern-on-call-teams)
- [Farmonaut Farm Management Systems](https://farmonaut.com/precision-farming/fms-agriculture-2025-transform-your-farm-with-smart-systems)
- [StartUs Insights AI in Agriculture](https://www.startus-insights.com/innovators-guide/ai-in-agriculture-strategic-guide/)
- [Celoxis AI Project Management](https://www.celoxis.com/article/ai-transforming-project-management)
- [Tability OKR Platform](https://www.tability.io)
- [Business Standard Year-End 2025 AI Report](https://www.business-standard.com/technology/tech-news/year-ender-2025-ai-assistants-rise-alexa-siri-google-assistant-chatgpt-meta-gemini-125122200324_1.html)

---

**Document Status:** COMPLETE
**Next Step:** Implement `generateProactiveInsights()` and supporting functions in MERGED TOTAL.js
