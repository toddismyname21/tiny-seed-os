## REGISTRATION INSTRUCTIONS

**Do these steps NOW, in order:**

1. Use the Read tool to read: `/Users/samanthapollack/Documents/TIny_Seed_OS/CLAUDE.md`
2. Use the Read tool to read: `/Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/pm_architect/SYSTEM_MANIFEST.md`
3. Use the Read tool to read your instructions: `/Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/field_operations/INSTRUCTIONS.md`
4. Use the Edit tool to append to your OUTBOX confirming registration

---

# INBOX: Field_Operations Claude
## From: PM_Architect

**Updated:** 2026-01-24
**PRIORITY:** CRITICAL - OWNER DIRECTIVE

---

## 🛠️ TOOLS & DEPLOYMENT - YOU HAVE ACCESS

| Tool | What It Does | Command |
|------|--------------|---------|
| **clasp** | Push code to Google Apps Script | `clasp push` |
| **brew** | Install packages if needed | `brew install <pkg>` |
| **git** | Version control | `git add . && git commit && git push` |
| **MCP Server** | 40+ specialized tools | Use when it's the best choice |

### DEPLOYMENT REQUIREMENTS

When you complete work:
1. **Push to Apps Script (if backend changes):** `clasp push`
2. **Commit to GitHub:** `git add . && git commit -m "message" && git push`
3. **Verify live site:** Check https://toddismyname21.github.io/tiny-seed-os/

**Changes must be LIVE, not just local.**

---

## 🚨 FIELD PLANNER - COMPLETE OVERHAUL TOMORROW

**Owner confirmed:** Field Planner is NOT WORKING. Complete overhaul planned for tomorrow.

---

### 🧠 THE VISION: INTELLIGENT PLANTING ALGORITHM

Owner wants a **SMART** field planner that can:

1. **Select all or a group of plantings** that are planned but not assigned
2. **Automatically assign them** in the BEST possible way
3. **Provide reasoning** for WHY it chose to plant what, where

#### Factors the Algorithm MUST Consider:

| Factor | Why It Matters |
|--------|----------------|
| **Crops currently in ground** | Can't plant where something already is |
| **Companion planting** | Some crops help each other, some hurt |
| **Crop rotation over time** | Don't plant same family in same spot |
| **Planting dates** | Frost dates, succession timing |
| **Harvest dates** | Bed availability, labor planning |
| **Efficiency** | Minimize walking, group similar tasks |
| **Soil health** | Cover crops, nitrogen fixers |
| **Pest/disease pressure** | Break pest cycles with rotation |
| **Market demand** | Plant what sells |

#### What Owner Wants to See:

```
PLANTING RECOMMENDATION:
━━━━━━━━━━━━━━━━━━━━━━━
Tomatoes (Cherokee Purple) → Field 2, Bed 4

REASONING:
• Bed 4 had beans last year (nitrogen boost) ✓
• 30ft from basil planting (companion) ✓
• No nightshades in this section for 3 years ✓
• Harvest timing aligns with farmers market peak ✓
• Drip irrigation already installed ✓

CONFIDENCE: 94%
```

---

### 🔬 DEEP RESEARCH REQUIRED TONIGHT

**You are doing this research IN PARALLEL with Grants_Funding Claude.**

Research these topics and document findings:

#### 1. Crop Rotation Algorithms
- Academic papers on optimal rotation
- USDA rotation guidelines
- Software that does this (FarmOS, Tend, Farmbrite)
- How do they calculate rotation?

#### 2. Companion Planting Logic
- Which crops help each other?
- Which crops hurt each other?
- Distance requirements
- Data sources for companion planting charts

#### 3. Optimization Algorithms
- Constraint satisfaction problems
- Scheduling algorithms (similar to employee scheduling)
- How to score multiple factors
- Machine learning approaches vs rule-based

#### 4. Farm Planning Software Analysis
- What do the best tools do?
- What's missing from existing tools?
- How can we be BETTER?

**DOCUMENT ALL FINDINGS in your OUTBOX. We build tomorrow.**

---

### What Owner Also Wants:
1. **Add Task function** - Use a form like the "Add Flower Task" form as the pattern
2. **Task Database** - Build comprehensive database of farm tasks
3. **Working Field Planner** - Connected to real data

### Your Prep Work Tonight:
1. Audit the current Field Planner - document what's broken
2. Find the "Add Flower Task" form - understand the pattern
3. **DO THE DEEP RESEARCH ABOVE**
4. Document what needs to be built tomorrow

**DO NOT rebuild tonight** - research and prepare. Owner wants to be involved in the overhaul.

---

## 🔴 NEW MISSION: EMPLOYEE SCHEDULING CALENDAR - 2026-01-24
**FROM:** PM_Architect (Phone Session)
**PRIORITY:** HIGH - OPERATIONAL NEED
**DEADLINE:** Tomorrow morning - working calendar for employee hours

---

### OWNER MANDATE (VERBATIM)

> "I also want to get a calendar built for scheduling employee hours."
> "NO SHORTCUTS. STATE OF THE ART. PRODUCTION READY."
> "I WANT IT TO BE SO SMART THAT IT KNOWS WHAT I SHOULD DO BEFORE ME."

---

### YOUR MISSION: Employee Scheduling Calendar

**Goal:** Owner can schedule employee shifts and employees can see their hours.

#### Phase 1: RESEARCH FIRST (30 min)

Before building ANYTHING, research:
1. Best employee scheduling software (When I Work, Deputy, Homebase, 7shifts)
2. Farm-specific scheduling needs (weather-dependent, seasonal)
3. Best calendar UI patterns for shift scheduling
4. Mobile-first scheduling (employees on phones)

**DOCUMENT YOUR FINDINGS.**

#### Phase 2: AUDIT EXISTING

Check what already exists:
1. Is there scheduling code in Apps Script?
2. Is there a SCHEDULES or SHIFTS sheet?
3. Does SmartLaborIntelligence.js have scheduling?
4. What can we USE vs what must we BUILD?

#### Phase 3: BUILD (Based on Research)

Create a scheduling system that:
1. Shows weekly/daily calendar view
2. Owner can add/edit shifts
3. Employees see their assigned shifts
4. Weather-aware (knows when outdoor work is impacted)
5. Integrates with existing employee app

#### RULES

- ❌ DO NOT duplicate existing functionality
- ✅ Check SYSTEM_MANIFEST.md first
- ✅ Research before building
- ✅ Make it mobile-friendly
- ✅ Connect to real employee data

#### IMPORTANT: CHECK THE OS FOLDER FIRST

**BEFORE YOU BUILD ANYTHING** - Check the root project folder and subfolders for existing work:
- Labor/scheduling specs
- SmartLaborIntelligence.js
- Partial implementations
- Employee management code

**DO NOT DUPLICATE WORK THAT ALREADY EXISTS.**

#### DELIVERABLES

Write to your OUTBOX.md:
1. Research summary
2. Audit of existing scheduling code
3. What was built
4. How to use it
5. Any blockers
6. **FLAG anything not working or half-built** - these get repaired tomorrow

#### MORNING REPORT REQUIRED

Your findings will be compiled into an email report to the owner tomorrow morning. Be thorough.

---

## PREVIOUS TASK (Lower Priority)

## OVERNIGHT MISSION (Owner is sleeping - WORK AUTONOMOUSLY)

### PRIMARY ASSIGNMENT: BUILD TASK TEMPLATES FROM ROXBURY FARM MANUAL

Owner wants to build a comprehensive task system associated with plantings. Use the Roxbury Farm Manual as the primary reference.

#### Task 1: Research Task Structure

**Location of resources:**
- Roxbury Farm Manual (search for it in the codebase/docs)
- Publications in the OS folder
- Any farming operation guides available

**Extract task templates for:**
- Greenhouse operations (seeding, watering, hardening off)
- Field prep (bed prep, amendments, tillage)
- Transplanting procedures
- Direct seeding procedures
- Cultivation/weeding cycles
- Pest/disease scouting
- Irrigation management
- Harvest procedures
- Post-harvest handling
- Delivery/market prep

#### Task 2: Create Task Template Library

Create `/claude_sessions/field_operations/TASK_TEMPLATES.md`:

**For each crop category, define standard tasks:**

```
## TOMATOES (Transplanted)

### Pre-Season
- [ ] Order seeds (Week -12)
- [ ] Prepare seed starting mix (Week -10)

### Greenhouse Phase
- [ ] Seed in flats (Week -8) | Est: 30 min/flat
- [ ] Water daily | Est: 10 min/day
- [ ] Pot up to 4" (Week -6) | Est: 45 min/flat
- [ ] Harden off (Week -2) | Est: varies

### Field Phase
- [ ] Prep beds (Week -1) | Est: 2 hrs/100ft
- [ ] Lay plastic mulch | Est: 30 min/100ft
- [ ] Transplant (Week 0) | Est: 1 hr/100ft
- [ ] Stake/trellis (Week +2) | Est: 2 hrs/100ft
- [ ] Prune suckers weekly | Est: 30 min/100ft
- [ ] Scout for pests weekly | Est: 15 min/block

### Harvest Phase
- [ ] First harvest (Week +8) | Est: varies
- [ ] Continued harvest 2-3x/week | Est: varies
```

#### Task 3: Planting-to-Task Linkage

Design how tasks connect to plantings in the system:

**Create `/claude_sessions/field_operations/TASK_SYSTEM_DESIGN.md`:**
- How do tasks link to PLANNING_2026 rows?
- Auto-generate tasks when planting is created?
- Task dependencies (can't harvest before transplant)
- Task scheduling based on planting dates
- Integration with Mobile_Employee Claude's time tracking

#### Task 4: Seasonal Task Calendar

Create `/claude_sessions/field_operations/SEASONAL_TASK_CALENDAR.md`:
- What tasks happen in each month?
- Peak labor periods?
- Critical timing windows?

#### Deliverable: MORNING TASK BRIEF

Create `/claude_sessions/field_operations/MORNING_TASK_BRIEF.md`:
- Summary of task templates created
- Crops covered
- Integration recommendations
- Questions about specific farm practices

---

### SECONDARY ASSIGNMENT (If blocked on primary)

If you can't find the Roxbury Manual or hit permissions:

**Generic Vegetable Farm Task Library**
- Research standard vegetable farm operations
- Create generic task templates from web sources
- Focus on crops likely grown at Tiny Seed
- Document sources

---

### DATA FROM DON_KNOWLEDGE_BASE

Don_Knowledge_Base Claude extracted 627 sowing records and variety data. This could inform:
- Which crops to prioritize templates for
- Timing specific to this farm
- Varieties and their requirements

Check their OUTBOX for details.

---

### CHECK-IN PROTOCOL

Write to your OUTBOX when:
1. Roxbury Manual located and reviewed
2. Initial task templates created
3. Task system design drafted
4. Morning brief ready

**PM_Architect will check your OUTBOX.**

---

## ADDITIONAL URGENT ASSIGNMENT: FLOWER OPERATIONS

**Added:** 2026-01-16 (Owner just requested before sleeping)

### FLOWER TASK LOG STRUCTURE

Owner wants flower tasks tracked with these fields:
- **Estimated Time**
- **Supplies Needed**
- **Planning Notes**
- **Who?** (assigned to)
- **Done?** (checkbox)
- **Process Notes**
- **Actual Time**

### FLOWER FARMING RESOURCES

**CRITICAL:** Scour this folder for flower-specific content:
`/Users/samanthapollack/Documents/TIny_Seed_OS/FLOWER FARMING/`

**Key files to analyze:**
1. `Forcing Tulip Bulbs _ A Comprehensive Tutorial.html` - TULIP FORCING HOW-TO
2. `Cool_Flowers_Field_Grower_s_Report_Guide_021425.pdf` - Overwintering data
3. `TGW Cool Flowers Field Grower's Report (Sorted by Flower).pdf`
4. `Choosing Flower Crops to Overwinter _ Guide to Overwintering Flowers.html`
5. `Succession-Planting Chart for Flowers _ Johnny's Selected Seeds.html`
6. `Year-Round Flower Production Strategy _ Johnny's Selected Seeds.html`
7. `Flower-module-list-of-flowers-and-spacing.pdf` - Spacing data
8. `Specialty_Cut_Flower_Production_and_Handling2.pdf` - Production guide

### SPECIFIC HOW-TOs NEEDED

Create detailed step-by-step guides for:

**1. SPLITTING DAHLIAS**
Create `/claude_sessions/field_operations/HOW_TO_SPLIT_DAHLIAS.md`:
- When to split (timing in season)
- Tools and supplies needed
- Step-by-step process
- Storage after splitting
- Estimated time per tuber
- Common mistakes to avoid

**2. FORCING TULIPS**
Create `/claude_sessions/field_operations/HOW_TO_FORCE_TULIPS.md`:
- Bulb selection and sourcing
- Cooling requirements (weeks, temperature)
- Planting process
- Growing conditions
- Harvest timing
- Estimated timeline from bulb to bloom

**3. OVERWINTERING FLOWERS**
Create `/claude_sessions/field_operations/OVERWINTERING_GUIDE.md`:
- Which flowers to overwinter in PA (Zone 6)
- Critical fall seeding dates
- Protection methods (low tunnels, row cover)
- Spring management
- Expected bloom times

### CRITICAL SEEDING DATES

Create `/claude_sessions/field_operations/FLOWER_CRITICAL_DATES.md`:

**Fall Seeding (for overwintering):**
| Flower | Seed Date | Notes |
|--------|-----------|-------|
| Snapdragons | Aug 15-Sep 1 | Need cold period |
| Sweet Peas | Oct 1-15 | Direct seed |
| etc. | | |

**Early Spring (get in ground first):**
| Flower | Start Indoors | Transplant | Direct Seed |
|--------|---------------|------------|-------------|
| Ranunculus | | | Feb corms |
| Lisianthus | Dec-Jan | May | |
| etc. | | | |

### FLOWER TASK TEMPLATES

Following the same format as vegetable tasks, create flower-specific templates:

```
## DAHLIAS

### Pre-Season (Feb-Mar)
- [ ] Check stored tubers | Est: 30 min | Supplies: none
- [ ] Split tubers | Est: 2-3 min/tuber | Supplies: clean knife, labels
- [ ] Pot up divisions | Est: 5 min/tuber | Supplies: 4" pots, potting mix

### Field Prep (Apr-May)
- [ ] Prep dahlia beds | Est: 2 hrs/100ft | Supplies: amendments
- [ ] Install stakes/supports | Est: 1 hr/100ft | Supplies: stakes, twine

### Growing Season
- [ ] Transplant (after last frost) | Est: 45 min/50 plants
- [ ] Pinch for branching | Est: 15 min/row
- [ ] Disbud for larger blooms | Est: varies
- [ ] Scout for pests | Est: 10 min/block

### Harvest Season
- [ ] Daily harvest | Est: varies by production
- [ ] Post-harvest processing | Est: 20 min/bucket

### End of Season (Oct-Nov)
- [ ] Dig tubers after frost | Est: 1 hr/50 plants
- [ ] Wash and dry | Est: 30 min/50 tubers
- [ ] Label and store | Est: 15 min/50 tubers
```

### DELIVERABLES FOR MORNING

Create `/claude_sessions/field_operations/FLOWER_MORNING_BRIEF.md`:
- Summary of flower research completed
- How-to guides created
- Critical dates extracted
- Flower task templates
- Questions for owner about their flower operation

---

## PM_ARCHITECT NOTE

Research agent is currently scanning the FLOWER FARMING folder. Check for:
`/claude_sessions/field_operations/FLOWER_RESEARCH.md`

This may have additional extracted data to incorporate.

**Loren is the Flower Manager** - these templates should support her team.

---

*Field Operations Claude - Build the task backbone for the whole system*

---

## IMPORTANT: READ UNIVERSAL_ACCESS.md
You have full MCP server access and can deploy code via `clasp push`.
See: `/Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/UNIVERSAL_ACCESS.md`
