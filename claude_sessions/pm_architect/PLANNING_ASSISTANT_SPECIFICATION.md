# Planning Assistant AI - Production Specification
## Tiny Seed Farm OS
### Version 1.0 - January 23, 2026

---

## EXECUTIVE SUMMARY

This specification defines a **state-of-the-art, production-grade Planning Assistant** that transforms Tiny Seed Farm OS from a record-keeping system into an **intelligent, proactive farm management partner**. The assistant will be "so smart that it knows what you should do before you do."

**Key Principle:** Leverage existing infrastructure. The system already has 12 Chief of Staff AI modules built but NOT connected. This specification focuses on connecting and unifying existing capabilities rather than rebuilding from scratch.

---

## DESIGN PHILOSOPHY

1. **Proactive, Not Reactive** - Surface recommendations before being asked
2. **Conversational, Not Complicated** - Natural language like "Move Tomato Plantings to JS6"
3. **Safe, Not Sorry** - Preview all changes, require confirmation for destructive actions
4. **Smart, Not Stubborn** - Learn from patterns, adapt to the farm's reality
5. **Connected, Not Siloed** - Unify existing AI modules into one intelligent interface

---

## ARCHITECTURE OVERVIEW

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PLANNING ASSISTANT                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │   Chat UI    │    │  Proactive   │    │    Notification          │  │
│  │  (Floating   │◄──►│   Engine     │◄──►│    System                │  │
│  │   Bubble)    │    │              │    │                          │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────────────────────┘  │
│         │                   │                                           │
│         ▼                   ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    ORCHESTRATOR LAYER                             │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐  │  │
│  │  │ Intent  │  │ Context │  │  State  │  │ Preview │  │ Action │  │  │
│  │  │ Parser  │  │ Builder │  │ Machine │  │ Builder │  │Executor│  │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                   │                                     │
│                                   ▼                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              EXISTING CHIEF OF STAFF MODULES                      │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │  │
│  │  │   Memory   │  │ Proactive  │  │ Predictive │  │ Succession │  │  │
│  │  │   System   │  │   Intel    │  │  Analytics │  │  Planner   │  │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │  │
│  │  │    Crop    │  │   Field    │  │  Calendar  │  │   Email    │  │  │
│  │  │  Rotation  │  │ Management │  │     AI     │  │   Triage   │  │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                   │                                     │
│                                   ▼                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        DATA LAYER                                 │  │
│  │   PLANNING_2026  │  REF_Beds  │  REF_CropProfiles  │  HARVEST_LOG │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1: CONVERSATIONAL CHAT INTERFACE

### 1.1 Floating Chat Bubble

**Location:** Bottom-right corner on planning.html AND calendar.html

**Design Specs:**
- Position: `fixed`, bottom: 20px, right: 20px
- Collapsed: 60x60px circular button with assistant icon
- Expanded: 400px wide x 600px tall chat window
- Animation: Smooth 0.3s expand/collapse transition
- Z-index: 10000 (above all other elements)

**HTML Structure:**
```html
<div class="planning-assistant">
    <button class="assistant-toggle" onclick="togglePlanningAssistant()">
        <i class="fas fa-robot"></i>
        <span class="notification-badge" id="assistantBadge">3</span>
    </button>

    <div class="assistant-panel" id="assistantPanel">
        <div class="assistant-header">
            <div class="assistant-title">
                <i class="fas fa-seedling"></i>
                Planning Assistant
            </div>
            <button class="assistant-close" onclick="togglePlanningAssistant()">×</button>
        </div>

        <div class="assistant-suggestions" id="assistantSuggestions">
            <!-- Proactive suggestions appear here -->
        </div>

        <div class="assistant-messages" id="assistantMessages">
            <!-- Conversation history -->
        </div>

        <div class="assistant-input-area">
            <input type="text" id="assistantInput"
                   placeholder="Try: 'Move Tomato plantings to JS6'"
                   onkeypress="if(event.key==='Enter') sendAssistantMessage()">
            <button onclick="sendAssistantMessage()">
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>
    </div>
</div>
```

### 1.2 Natural Language Commands

**Supported Command Categories:**

| Category | Example Commands |
|----------|------------------|
| **Move/Reassign** | "Move Tomato plantings to JS6" |
| | "Reassign bed F3L-05 to Lettuce" |
| | "Put the Arugula succession in the field by the barn" |
| **Query** | "What beds are available in May?" |
| | "When should I plant Basil for June harvest?" |
| | "Show me unassigned plantings" |
| **Create** | "Add a new Lettuce succession starting April 15" |
| | "Create 3 successions of Carrots, 2 weeks apart" |
| **Modify** | "Change the transplant date to May 1" |
| | "Update bed feet to 75 for Tomato batch 26-TOM-0012" |
| **Delete** | "Remove the last Spinach succession" |
| | "Cancel planting 26-SPN-0045" |

### 1.3 Intent Recognition

**Using Claude API for Structured Output:**

```javascript
async function parseIntent(userMessage, conversationContext) {
    const systemPrompt = `You are the Tiny Seed Farm Planning Assistant.
    Parse the user's message and extract:
    1. intent: one of [move, query, create, modify, delete, help, clarify]
    2. entities: {crop, variety, field, bed, date, quantity, batchId}
    3. confidence: 0-1 score
    4. clarification_needed: list of missing required fields

    Farm context:
    - Fields: ${fields.join(', ')}
    - Current crops: ${crops.join(', ')}
    - Date range: 2026 growing season

    Return JSON only.`;

    const response = await callClaudeAPI(systemPrompt, userMessage);
    return JSON.parse(response);
}
```

**Entity Schema:**
```javascript
{
    crop: "Tomato",              // Crop type
    variety: "Cherokee Purple",  // Specific variety
    field: "JS6",               // Target field
    bed: "JS6-05",              // Specific bed
    date: "2026-05-15",         // Target date
    dateType: "transplant",     // Type of date (sow, transplant, harvest)
    quantity: 3,                // Number (successions, trays, etc.)
    batchId: "26-TOM-0012",     // Specific batch reference
    duration: "2 weeks"         // Time interval
}
```

---

## PHASE 2: CONFIRMATION & PREVIEW SYSTEM

### 2.1 Preview Pattern

**Before executing any change, show diff-based preview:**

```
┌─────────────────────────────────────────────────┐
│ 📋 Preview: Move Tomato Plantings to JS6         │
├─────────────────────────────────────────────────┤
│                                                  │
│ BEFORE                    AFTER                  │
│ ────────                  ─────                  │
│ Field: F3L-05      ───►   Field: JS6-08         │
│ Bed Feet: 50              Bed Feet: 50          │
│ Transplant: May 3         Transplant: May 3     │
│                                                  │
│ ⚠️ NOTE: JS6-08 has 75 ft available             │
│    (25 ft will remain after this planting)      │
│                                                  │
│ Affected Batches:                                │
│ • 26-TOM-0012 (Cherokee Purple)                 │
│ • 26-TOM-0013 (Cherokee Purple)                 │
│                                                  │
├─────────────────────────────────────────────────┤
│       [Cancel]              [✓ Confirm Move]    │
└─────────────────────────────────────────────────┘
```

### 2.2 State Machine

```
    ┌──────────┐
    │   IDLE   │ ◄───────────────────┐
    └────┬─────┘                     │
         │ user message              │
         ▼                           │
    ┌──────────┐                     │
    │ PARSING  │                     │
    └────┬─────┘                     │
         │ intent parsed             │ cancel/timeout
         ▼                           │
    ┌──────────┐  need info    ┌────────────┐
    │ PLANNING │──────────────►│ CLARIFYING │
    └────┬─────┘               └─────┬──────┘
         │ plan ready                │ info received
         ▼                           │
    ┌────────────┐◄──────────────────┘
    │ CONFIRMING │
    └────┬───────┘
         │ confirmed
         ▼
    ┌────────────┐
    │ EXECUTING  │
    └────┬───────┘
         │ success
         ▼
    ┌──────────┐
    │ COMPLETE │───────────────────►┘
    └──────────┘
```

### 2.3 Clarification Flow

When information is missing:

```
USER: "Move Tomatoes to the field by the barn"

ASSISTANT: I found 5 Tomato plantings. Which field did you mean?

           🏠 JS1 (closest to barn) - 8 beds available
           🌾 JS4 (east field) - 4 beds available
           🌻 JS6 (south field) - 12 beds available

           [JS1]  [JS4]  [JS6]  [Show all fields]
```

---

## PHASE 3: PROACTIVE INTELLIGENCE

### 3.1 Suggestion Types

| Priority | Type | Example | Trigger |
|----------|------|---------|---------|
| 🔴 Critical | Missed Window | "Tomato planting window closes in 3 days" | < 5 days to optimal date |
| 🟠 Urgent | Incomplete Data | "5 plantings missing bed feet - need by April 1" | 10 days before action |
| 🟡 Important | Optimization | "Field JS6 beds 8-12 are empty in May" | Gap detection |
| 🟢 Suggestion | Pattern-based | "Last year Basil performed best in IL field" | Historical analysis |

### 3.2 Proactive Engine (Background)

```javascript
// Run every hour or on data change
async function runProactiveAnalysis() {
    const suggestions = [];

    // 1. Check planting windows
    const windowAlerts = await checkPlantingWindows();
    suggestions.push(...windowAlerts);

    // 2. Check incomplete plantings
    const incompleteAlerts = await checkIncompletePlantings(10); // 10-day warning
    suggestions.push(...incompleteAlerts);

    // 3. Check harvest gaps
    const gapAlerts = await detectHarvestGaps();
    suggestions.push(...gapAlerts);

    // 4. Check bed conflicts
    const conflictAlerts = await detectBedConflicts();
    suggestions.push(...conflictAlerts);

    // 5. Generate optimization suggestions
    const optimizations = await generateOptimizations();
    suggestions.push(...optimizations);

    // Sort by priority and store
    suggestions.sort((a, b) => a.priority - b.priority);
    await storeSuggestions(suggestions);

    // Update badge count
    updateAssistantBadge(suggestions.filter(s => !s.dismissed).length);
}
```

### 3.3 Anomaly Detection Algorithms

**Harvest Gap Detection:**
```javascript
function detectHarvestGaps(plantings, minGapDays = 7) {
    // Build harvest timeline
    const harvestWeeks = {};
    plantings.forEach(p => {
        const weekNum = getWeekNumber(p.firstHarvest);
        harvestWeeks[weekNum] = (harvestWeeks[weekNum] || 0) + 1;
    });

    // Find gaps
    const gaps = [];
    for (let week = seasonStart; week <= seasonEnd; week++) {
        if (!harvestWeeks[week]) {
            gaps.push({
                type: 'harvest_gap',
                priority: 2, // Important
                week: week,
                message: `No harvests planned for week ${week} (${weekToDate(week)})`
            });
        }
    }
    return gaps;
}
```

**Bed Conflict Detection:**
```javascript
function detectBedConflicts(plantings) {
    const bedTimelines = {};
    const conflicts = [];

    plantings.forEach(p => {
        const key = p.bed;
        if (!bedTimelines[key]) bedTimelines[key] = [];
        bedTimelines[key].push({
            start: new Date(p.fieldStartDate),
            end: new Date(p.lastHarvest),
            planting: p
        });
    });

    // Check overlaps
    Object.entries(bedTimelines).forEach(([bed, intervals]) => {
        intervals.sort((a, b) => a.start - b.start);
        for (let i = 0; i < intervals.length - 1; i++) {
            if (intervals[i].end > intervals[i+1].start) {
                conflicts.push({
                    type: 'bed_conflict',
                    priority: 1, // Critical
                    bed: bed,
                    planting1: intervals[i].planting.id,
                    planting2: intervals[i+1].planting.id,
                    message: `Bed ${bed} double-booked: ${intervals[i].planting.crop} overlaps ${intervals[i+1].planting.crop}`
                });
            }
        }
    });

    return conflicts;
}
```

---

## PHASE 4: SMART PLANNING ALGORITHMS

### 4.1 Succession Planner (Existing: SmartSuccessionPlanner.js)

**Connect to assistant:**
```javascript
async function handleSuccessionQuery(userMessage) {
    // "When should I plant Basil for June harvest?"
    const { crop, harvestDate } = parseSuccessionQuery(userMessage);

    const plan = await generateSmartSuccessionPlan({
        crop: crop,
        targetHarvestStart: harvestDate,
        targetHarvestEnd: addDays(harvestDate, 14),
        overlapFactor: 0.7
    });

    return formatSuccessionPlan(plan);
}
```

### 4.2 Bed Assignment Optimizer

```javascript
function suggestBestBed(planting, availableBeds) {
    const scores = availableBeds.map(bed => {
        let score = 100;

        // Rotation compatibility (uses CropRotation.js)
        const rotationScore = checkRotationCompatibility(
            planting.crop,
            bed.lastCropFamily,
            bed.yearsEmpty
        );
        score += rotationScore * 20;

        // Bed length fit
        const lengthFit = bed.length >= planting.bedFeet ? 10 : -50;
        score += lengthFit;

        // Proximity to similar crops (cluster plantings)
        const proximityScore = scoreProximity(planting.crop, bed, allPlantings);
        score += proximityScore * 5;

        // Field suitability
        const fieldScore = scoreFieldForCrop(planting.crop, bed.field);
        score += fieldScore * 10;

        return { bed, score };
    });

    return scores.sort((a, b) => b.score - a.score)[0].bed;
}
```

### 4.3 Rotation Rules (Existing: CropRotation.js)

**Integration:**
```javascript
// Already implemented - just need to connect to assistant
const rotationResult = checkRotationCompatibility(
    proposedCrop,    // e.g., "Tomato"
    previousCrop,    // e.g., "Peppers"
    yearsEmpty       // e.g., 1
);

// Returns: { compatible: false, score: -1, reason: "Solanaceae requires 4 years" }
```

---

## PHASE 5: ACCESS CONTROL

### 5.1 Role-Based Permissions

| Role | Can Query | Can Preview | Can Execute | Can Configure |
|------|-----------|-------------|-------------|---------------|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ✅ | ❌ |
| Chief of Staff | ✅ | ✅ | ✅ | ❌ |
| Field Lead | ✅ | ✅ | ❌ | ❌ |
| Employee | ✅ | ❌ | ❌ | ❌ |

### 5.2 Audit Trail

Every action logged:
```javascript
{
    timestamp: "2026-01-23T14:30:00Z",
    user: "samantha@tinyseedfarm.com",
    action: "move_planting",
    target: "26-TOM-0012",
    before: { bed: "F3L-05" },
    after: { bed: "JS6-08" },
    confirmed: true,
    aiAssisted: true
}
```

---

## IMPLEMENTATION ROADMAP

### Sprint 1 (Week 1-2): Foundation
- [ ] Create floating chat bubble UI component
- [ ] Implement basic intent parsing with Claude API
- [ ] Build message display and input handling
- [ ] Connect to existing `chatWithChiefOfStaff` endpoint

### Sprint 2 (Week 3-4): Core Commands
- [ ] Implement MOVE command with preview
- [ ] Implement QUERY commands (available beds, planting dates)
- [ ] Add confirmation flow with diff display
- [ ] Connect to SmartSuccessionPlanner.js

### Sprint 3 (Week 5-6): Proactive Intelligence
- [ ] Build proactive analysis engine
- [ ] Implement harvest gap detection
- [ ] Implement bed conflict detection
- [ ] Add suggestion notifications to chat bubble

### Sprint 4 (Week 7-8): Polish & Integration
- [ ] Connect remaining Chief of Staff modules
- [ ] Add keyboard shortcuts
- [ ] Mobile responsiveness
- [ ] Performance optimization (caching)

---

## API ENDPOINTS TO CREATE

| Endpoint | Purpose |
|----------|---------|
| `chatWithPlanningAssistant` | Main conversational endpoint |
| `getProactiveSuggestions` | Get current suggestions for user |
| `dismissSuggestion` | Mark suggestion as dismissed |
| `executePlanningAction` | Execute confirmed action |
| `previewPlanningAction` | Generate preview without executing |

---

## SUCCESS METRICS

| Metric | Target |
|--------|--------|
| Response time | < 3 seconds for queries |
| Action accuracy | > 95% correct interpretation |
| Suggestion relevance | > 80% action rate (not dismissed) |
| User satisfaction | "Makes planning easier" in feedback |
| Time saved | 50% reduction in planning time |

---

## TECHNOLOGY STACK

- **Frontend:** Vanilla JS + CSS (matches existing codebase)
- **AI:** Claude Sonnet 4 via Anthropic API (already configured)
- **Backend:** Google Apps Script (existing)
- **Data:** Google Sheets (existing)
- **Caching:** CacheService (existing SmartCache)

---

## EXISTING CODE TO LEVERAGE

| Module | File | Use For |
|--------|------|---------|
| Chief of Staff Chat | MERGED TOTAL.js:103 | Conversation endpoint |
| Memory System | ChiefOfStaff_Memory.js | User preferences, context |
| Proactive Intel | ChiefOfStaff_ProactiveIntel.js | Anomaly detection |
| Predictive | ChiefOfStaff_Predictive.js | Forecasting |
| Succession Planner | SmartSuccessionPlanner.js | Date calculations |
| Crop Rotation | CropRotation.js | Rotation rules, field groups |
| Field Management | FieldManagement.js | Bed CRUD operations |

---

## APPENDIX: RESEARCH REFERENCES

1. `PLANNING_ASSISTANT_RESEARCH_1_ARCHITECTURES.md` - AI patterns
2. `PLANNING_ASSISTANT_RESEARCH_2_PROACTIVE.md` - Proactive intelligence
3. `PLANNING_ASSISTANT_RESEARCH_3_UI.md` - Conversational UI
4. `PLANNING_ASSISTANT_RESEARCH_4_ALGORITHMS.md` - Farm algorithms
5. `PLANNING_INFRASTRUCTURE_AUDIT.md` - Existing system analysis

---

*PM_Architect Claude - January 23, 2026*
*State-of-the-art. Production-grade. No shortcuts.*
