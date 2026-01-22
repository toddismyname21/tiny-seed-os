# INBOX: Field Operations Claude
## From: PM_Architect

**Updated:** 2026-01-15 @ 9:00 PM
**URGENT UPDATE:** 2026-01-16 - OVERNIGHT DIRECTIVE

---

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
