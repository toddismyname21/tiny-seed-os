# INBOX: Mobile_Employee Claude
## From: PM_Architect

**Updated:** 2026-01-15 @ 9:30 PM
**URGENT UPDATE:** 2026-01-16 - OVERNIGHT DIRECTIVE

---

## OVERNIGHT MISSION (Owner is sleeping - WORK AUTONOMOUSLY)

### PRIMARY ASSIGNMENT: TASK UI REDESIGN + COSTING MODE

Owner wants BIG improvements to the employee task interface. Focus on usability and time tracking.

#### Part 1: Task List UI Overhaul

**Requirements:**
- **BIG buttons** to check off tasks when done
- Minimum touch target: 48x48px (ideally larger)
- Clear visual feedback on completion
- Easy to use with dirty/gloved hands
- High contrast for outdoor visibility

**Design for `/employee.html` or `/mobile.html`:**
- Task card layout
- Prominent checkbox/complete button
- Task name clearly visible
- Assignment info
- Due date/priority indicator

#### Part 2: Time Logging

**Every task completion should log:**
- Who completed it
- When they started (optional clock-in)
- When they finished
- Duration calculated
- Location (field/greenhouse)

**Create time tracking schema:**
- Where does time data go? (TIMELOG sheet?)
- Fields needed
- How to review time by employee/task/day

#### Part 3: Costing Mode

**Owner's vision:**
"Administrator can let the crew know that any task associated with a planting from seed to sell is documented."

**Design Costing Mode:**
- Admin toggle to enable "costing mode" for a planting
- When enabled, ALL labor on that planting is tracked:
  - Seeding time
  - Transplanting time
  - Cultivation/weeding time
  - Harvest time
  - Pack/wash time
  - Delivery time
- Data feeds into cost analysis

**Create `/claude_sessions/mobile_employee/COSTING_MODE_SPEC.md`:**
- How costing mode works
- Data model
- UI for employees
- Admin controls
- Reports generated

#### Deliverable: MORNING UI MOCKUPS

Create `/claude_sessions/mobile_employee/MORNING_UI_MOCKUPS.md`:
- ASCII/text wireframes of new task UI
- Time logging flow
- Costing mode indicator design
- Before/after comparison

---

### SECONDARY ASSIGNMENT (If blocked on primary)

If you hit permissions or can't edit files:

**Mobile UX Research**
- Research best mobile task management apps
- What makes field worker apps successful
- Offline-first patterns
- Big button UI examples
- Document findings and recommendations

---

### COORDINATION

- **UX_Design Claude** is designing overall mobile vision
- Share your task UI work with them
- They're thinking holistically, you're focused on employee tasks

---

### CHECK-IN PROTOCOL

Write to your OUTBOX when:
1. Task UI design complete
2. Time logging schema done
3. Costing mode spec drafted
4. Morning mockups ready

**PM_Architect will check your OUTBOX.**

---

*Mobile_Employee Claude - Make tasks dead-simple to complete and track*
