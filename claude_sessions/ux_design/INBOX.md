# INBOX: UX_Design Claude
## From: PM_Architect

**Created:** 2026-01-15
**URGENT UPDATE:** 2026-01-16 - OVERNIGHT DIRECTIVE

---

## OVERNIGHT MISSION (Owner is sleeping - WORK AUTONOMOUSLY)

### PRIMARY ASSIGNMENT: UNIFIED ADMIN DASHBOARD + STATE-OF-THE-ART MOBILE

Owner wants the entire system to feel cohesive. Right now we have many separate HTML files. We need ONE unified frontend for administration.

#### Part 1: Admin Dashboard Audit

**Current Files to Evaluate:**
- `index.html` - Main dashboard
- `master_dashboard_FIXED.html`
- `planning.html`
- `calendar.html`
- `greenhouse.html`
- `gantt_FINAL.html`
- `seed_inventory_PRODUCTION.html`
- `succession.html`
- `bed_assignment_COMPLETE.html`
- `soil-tests.html`
- `sowing-sheets.html`
- `labels.html`
- `mobile.html`
- `employee.html`
- `field_app_mobile.html`
- `login.html`

Create `/claude_sessions/ux_design/ADMIN_AUDIT.md`:
- List ALL admin-facing pages
- Identify overlapping functionality
- Note inconsistent UI patterns
- Propose unified navigation structure

#### Part 2: Unified Admin Design

Create `/claude_sessions/ux_design/UNIFIED_ADMIN_DESIGN.md`:

**Design a cohesive admin experience:**
- Single entry point (dashboard)
- Consistent navigation sidebar
- Unified color scheme and typography
- Common component library
- Responsive design (desktop + tablet)

Include:
- Wireframes (ASCII or description)
- Navigation hierarchy
- Component specifications
- Interaction patterns

#### Part 3: State-of-the-Art Mobile App Vision

Create `/claude_sessions/ux_design/MOBILE_APP_VISION.md`:

**Research the latest and greatest in mobile app design:**
- 2025-2026 mobile UI trends
- Best farm/agriculture apps for inspiration
- iOS and Android design guidelines
- Progressive Web App vs Native considerations

**Design a premium mobile experience:**
- Employee task management
- Field data collection
- Photo capture and annotation
- Offline-first architecture
- Big, touch-friendly buttons
- Time logging UX
- "Costing Mode" for tracking labor per planting

Make it feel like a $50K custom app, not a web page.

#### Deliverable: MORNING DESIGN BRIEF

Create `/claude_sessions/ux_design/MORNING_DESIGN_BRIEF.md`:
- Executive summary of recommendations
- Top 3 priority improvements
- Quick wins vs major overhauls
- Visual mockup descriptions

---

### SECONDARY ASSIGNMENT (If blocked on primary)

If you can't access files or hit permissions:

**Component Library Design**
- Design a standard button system (sizes, colors, states)
- Design form input standards
- Design card/panel layouts
- Design notification/alert patterns
- Document everything in a style guide

---

### CHECK-IN PROTOCOL

Write to your OUTBOX when:
1. Audit complete
2. Admin design drafted
3. Mobile vision documented
4. Morning brief ready

**PM_Architect will check your OUTBOX.**

---

## NOTES

Previous work: Fixed 4 touch targets in employee.html. Good attention to detail.

Now apply that same rigor to the entire system.

---

## ADDITIONAL ASSIGNMENT: FLOWER OPERATIONS PAGE

**Added:** 2026-01-16 (Owner just requested)

### BUILD A DEDICATED FLOWER PAGE

Tiny Seed Farm grows flowers too (managed by Loren, Flower Manager). We need a dedicated flower operations page in the OS.

#### Page: `flowers.html`

**Features to include:**

1. **Flower Task Log**
   - Table with columns:
     - Task Name
     - Estimated Time
     - Supplies Needed
     - Planning Notes
     - Assigned To (Who?)
     - Done? (checkbox)
     - Process Notes
     - Actual Time
   - Filter by: flower type, status, date range, assignee

2. **Critical Dates Calendar**
   - Visual calendar showing:
     - Fall seeding dates (overwintering)
     - Early spring seeding dates
     - Transplant windows
     - Harvest periods
   - Color-coded by flower type

3. **How-To Library**
   - Expandable cards for:
     - Splitting Dahlias
     - Forcing Tulips
     - Overwintering Flowers
   - Step-by-step with images
   - Supply checklists

4. **Flower Crop Planning**
   - Similar to vegetable planning but flower-specific
   - Varieties, quantities, succession timing
   - Link to seed orders

5. **Flower Inventory**
   - Dahlia tuber inventory
   - Bulb inventory (tulips, ranunculus, etc.)
   - Seeds in stock

#### Design Considerations

- **Flower team uses this daily** - needs to be fast and intuitive
- Match overall OS aesthetic
- Mobile-friendly for field use
- Big buttons for checking off tasks

#### Create

Create `/claude_sessions/ux_design/FLOWER_PAGE_DESIGN.md`:
- Wireframe/mockup of flower page
- Component specifications
- Data model (what sheets does it need?)
- Navigation placement

---

*UX_Design Claude - Think holistically. Design for the future.*
