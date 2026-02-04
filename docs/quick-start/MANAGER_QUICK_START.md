# MANAGER QUICK START GUIDE
## Tiny Seed Farm - Operations Guide

**Updated:** 2026-02-03

> For comprehensive documentation, see **docs/MANAGER_GUIDE.md**

---

## Your Role

You manage farm operations: planning, scheduling, sales, and team coordination.

---

## YOUR APPS

### Primary Dashboard (NEW)
| App | URL | Purpose |
|-----|-----|---------|
| **Manager Dashboard** | `web_app/manager-dashboard.html` | AI task queue, team workload, proactive alerts |
| Master Dashboard | `index.html` | Overview of everything |
| Task Assignment | `web_app/task-assignment.html` | Create and assign tasks |

### Planning & Operations
| App | URL | Purpose |
|-----|-----|---------|
| Planning View | `planning.html` | Create/edit crop plans |
| Succession Planner | `succession.html` | Quick batch creation |
| Bed Assignment | `bed_assignment_COMPLETE.html` | Allocate field beds |
| Greenhouse | `greenhouse.html` | Seedling tracking |
| Gantt Chart | `gantt_FINAL.html` | Timeline visualization |

### Sales & Customers
| App | URL | Purpose |
|-----|-----|---------|
| Sales Dashboard | `web_app/sales.html` | Orders and revenue |
| Marketing | `web_app/marketing-command-center.html` | Campaigns |

### Tools
| App | URL | Purpose |
|-----|-----|---------|
| Seed Inventory | `seed_inventory_PRODUCTION.html` | Track seeds |
| Soil Tests | `soil-tests.html` | Soil analysis |
| Labels | `labels.html` | Print labels |

---

## WHAT YOU CAN'T ACCESS

These are Admin-only:
- Financial Dashboard (bank accounts)
- Wealth Builder (investments)
- Admin Panel (user management)

---

## DAILY WORKFLOW

### Morning
1. Check **Master Dashboard** for overview
2. Review **Sales Dashboard** for today's orders
3. Check **Greenhouse** for transplant-ready seedlings
4. Verify Field Lead has task sheets

### During Day
5. Monitor progress via dashboard
6. Handle order issues
7. Adjust plans as needed
8. Coordinate with Field Leads

### Weekly
9. Plan next week's successions
10. Review sales performance
11. Update crop plans
12. Team meetings

---

## KEY TASKS

### Creating New Plantings

**Method 1: Succession Planner (Multiple)**
1. Open `succession.html`
2. Pick crop and variety
3. Set start date
4. Set # of successions and spacing
5. Preview and create

**Method 2: Planning View (Single)**
1. Open `planning.html`
2. Click **Add Planting**
3. Fill in all details
4. Save

### Editing Plantings
1. Open `planning.html`
2. Click on the row to edit
3. Change values inline or use side panel
4. Changes auto-save

### Assigning Beds
1. Open `bed_assignment_COMPLETE.html`
2. Select unassigned plantings
3. View recommendations
4. Assign to beds
5. Save assignments

### Managing Orders
1. Open `web_app/sales.html`
2. View pending orders
3. Update status as processed
4. Handle customer issues

---

## TEAM COORDINATION

### What Field Leads Need From You
- Clear crop plans in the system
- Task sheets generated
- Quick answers to questions
- Timely plan updates

### What You Need From Field Leads
- Tasks completed on time
- Accurate harvest logs
- Issue reports
- End-of-day status

---

## REPORTING

### Key Metrics to Track
- Plantings on schedule
- Harvest yields vs. projected
- Order fulfillment rate
- Customer satisfaction

### Where to Find Data
- Master Dashboard: Overview stats
- Sales Dashboard: Revenue details
- Planning View: Crop status

---

## ESCALATION

When to involve Admin (Todd):
- Major planning changes
- Customer complaints
- System issues
- Financial questions
- User access problems

---

## NEW: AI TASK MANAGEMENT

### Priority Badges
Tasks now show AI-calculated priority scores:
- **Red (80-100)**: Do NOW
- **Orange (50-79)**: Do today
- **Yellow (30-49)**: Important
- **Green (0-29)**: Flexible

### At-Risk Warnings
Yellow warning badges indicate problems:
- **TIME**: Not enough hours available
- **WEATHER**: Conditions will prevent work
- **OVERRIPE**: Harvest immediately
- **BLOCKED**: Waiting on dependencies

### Team Workload
Monitor team capacity in Manager Dashboard:
- Green = Available
- Yellow = Heavy load
- Red = Overloaded (needs rebalancing)

### Bulk Operations
Select multiple tasks and:
- Complete All
- Assign All
- Cancel All

---

*For complete documentation, see docs/MANAGER_GUIDE.md*

*You keep the farm running smoothly!*
