# FLOWER OPERATIONS PAGE SPECIFICATION
## Tiny Seed OS - Flower Module

**Created:** 2026-01-16
**Status:** IMPLEMENTED
**File:** `flowers.html`
**Owner Request:** "We need the OS to work for our flower growing operation too"
**Flower Manager:** Loren

---

## PAGE OVERVIEW

`flowers.html` - A dedicated page for all flower farming operations, mirroring the functionality of vegetable operations but tailored to cut flower production.

---

## CORE FEATURES

### 1. FLOWER TASK LOG

**Purpose:** Track all flower-related tasks with time estimates and actuals for costing analysis.

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| Task Name | Text | What needs to be done |
| Flower/Crop | Dropdown | Which flower this relates to |
| Estimated Time | Duration | How long should it take |
| Supplies Needed | Text/Tags | Materials required |
| Planning Notes | Text | Pre-task notes |
| Assigned To | Dropdown | Team member |
| Done | Checkbox | Completion status |
| Process Notes | Text | Post-task learnings |
| Actual Time | Duration | How long it actually took |
| Date | Date | When task was completed |

**Views:**
- List view (filterable)
- Calendar view
- Kanban (To Do / In Progress / Done)

### 2. CRITICAL DATES CALENDAR

**Purpose:** Never miss time-sensitive flower operations.

**Categories:**
- **Fall Seeding (Overwintering):** Aug-Oct seeding for spring bloom
- **Early Spring:** Jan-Mar for getting jump on season
- **Succession Planting:** Ongoing through season
- **Harvest Windows:** When flowers are in production

**Color Coding:**
- Red: Critical deadlines (miss = lose crop)
- Orange: Important (timing affects quality)
- Green: Flexible windows
- Blue: Harvest periods

### 3. HOW-TO LIBRARY

**Required Guides:**

#### Splitting Dahlias
- When to split (late winter/early spring)
- Tools: Sharp knife, labels, rooting hormone (optional)
- Step-by-step with photos
- Storage requirements
- Time estimate: 2-3 min per tuber

#### Forcing Tulips
- Bulb selection and pre-cooling
- Cooling requirements: 12-16 weeks at 35-48°F
- Planting in crates/beds
- Growing conditions
- Harvest timing
- Timeline: Order bulbs (Aug) → Cool (Oct-Jan) → Force (Jan-Feb) → Bloom (Feb-Mar)

#### Overwintering Flowers
- Suitable crops for Zone 6 PA
- Fall seeding dates
- Protection methods (low tunnels, row cover)
- Spring management
- Expected bloom times

### 4. FLOWER CROP PLANNING

**Similar to vegetable planning with flower-specific fields:**
- Variety
- Supplier
- Quantity (# plants or linear feet)
- Start date
- Transplant date
- First harvest date
- Succession schedule
- Bed assignment
- Notes

### 5. FLOWER INVENTORY

**Track:**
- Dahlia tubers (variety, quantity, storage location)
- Bulbs (tulips, ranunculus, anemones, etc.)
- Seeds in stock
- Supplies (netting, stakes, flower food, etc.)

---

## DATA MODEL

### New Sheets Required

**FLOWER_TASKS**
```
| TaskID | TaskName | Flower | EstTime | Supplies | PlanningNotes | AssignedTo | Done | ProcessNotes | ActualTime | Date | CreatedBy | CreatedAt |
```

**FLOWER_PLANNING_2026**
```
| ID | Flower | Variety | Supplier | Quantity | Unit | StartDate | TransplantDate | FirstHarvest | Successions | BedAssignment | Notes |
```

**FLOWER_INVENTORY**
```
| ID | ItemType | Name | Variety | Quantity | Unit | Location | DateUpdated | Notes |
```

**FLOWER_CRITICAL_DATES**
```
| ID | Flower | TaskType | DateStart | DateEnd | Priority | Notes |
```

---

## UI COMPONENTS

### Navigation
- Add "Flowers" to main nav (between Planning and Greenhouse?)
- Icon suggestion: 🌸 or flower icon

### Tab Structure
```
[Dashboard] [Tasks] [Calendar] [Planning] [Inventory] [How-Tos]
```

### Dashboard Widgets
- Today's Tasks (for flower team)
- Upcoming Critical Dates
- Flowers in Harvest
- Inventory Alerts (low stock)

---

## MOBILE CONSIDERATIONS

- Flower team works in field/greenhouse
- Task completion needs BIG checkboxes
- Time logging should be easy (start/stop timer?)
- Photo capture for documentation
- Offline capability for remote areas

---

## INTEGRATION POINTS

- **Employee App:** Flower tasks show up for assigned team members
- **Costing Mode:** Track labor per flower crop for profitability analysis
- **Seed Inventory:** Link to main seed inventory system
- **Harvest Tracking:** Link flower harvests to sales/orders

---

## PRIORITY FLOWERS

Based on typical PA flower farm operations:

**High Priority (create templates first):**
1. Dahlias (major crop, complex lifecycle)
2. Tulips (forced bulbs)
3. Sunflowers (succession planted)
4. Zinnias (succession planted)
5. Snapdragons (overwintered + succession)
6. Ranunculus (corms)
7. Lisianthus (long lead time)

**Medium Priority:**
- Sweet peas
- Larkspur
- Stock
- Celosia
- Cosmos
- Anemones

---

## IMPLEMENTATION PLAN

1. **Phase 1:** Basic task log with the 7 fields owner specified
2. **Phase 2:** Critical dates calendar
3. **Phase 3:** How-To library (dahlia + tulip guides)
4. **Phase 4:** Flower planning integration
5. **Phase 5:** Full inventory system

---

## ASSIGNED TO

- **Field_Operations Claude:** Flower task templates, how-to guides, critical dates
- **UX_Design Claude:** Page design, wireframes, component specs
- **Backend Claude:** API endpoints for flower operations

---

*This spec will evolve as research is completed from the FLOWER FARMING folder.*
