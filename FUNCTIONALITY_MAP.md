# FUNCTIONALITY MAP — Tiny Seed Farm OS
**Created:** 2026-03-01 | **Owner Decisions Recorded:** 2026-03-01

This is the OWNER-APPROVED map of what to use, what to build, and what to archive.

---

## YOUR DAILY WORKFLOW (Starting This Week)

### Morning (Owner)
1. **Hub** (`index.html`) — Morning brief, weather, today's tasks, alerts *(not using yet — start when ready)*
2. **Manager Dashboard** (`web_app/manager-dashboard.html`) — Assign tasks to staff, see who's working
3. **Greenhouse Dashboard** (`web_app/greenhouse-dashboard.html`) — Check seedling status, tray inventory

### Staff Day
4. Staff opens **Employee App** (`employee.html`) on phone — sees daily work order
5. Staff **clocks in** — GPS logged, time tracking starts
6. Staff works through **tasks** — marks complete with notes and time
7. Staff **clocks out** — hours calculated automatically

### Planting
8. **Labels** (`labels.html`) — Print pot tags (1"x4") and field tray labels (4"x1")
9. **Planning** (`planning.html`) — Succession planting schedule
10. **Greenhouse** (`web_app/greenhouse-dashboard.html`) — Tray management, growth tracking

### Sales (as orders come in)
11. **Sales Dashboard** (`web_app/sales.html`) — All orders, pick/pack, reports
12. **Wholesale Portal** (`web_app/wholesale.html`) — Chef ordering (merge chef-order.html into this)
13. **CSA Portal** (`web_app/csa.html`) — Member management, box customization

### Weekly
14. **Schedule** (`web_app/schedule.html`) — Set next week's shifts, time-off requests
15. **Financial Dashboard** (`web_app/financial-dashboard.html`) — Cash flow, P&L, debts
16. **Chief of Staff** (`web_app/chief-of-staff.html`) — Email triage, admin tasks

---

## ACTIVE SYSTEM — Owner-Approved Pages

### CRITICAL — Must Work This Week
| Page | Status | Owner Decision |
|------|--------|----------------|
| Employee App (`employee.html`) | Built | **CRITICAL** — staff starts this week |
| Manager Dashboard (`web_app/manager-dashboard.html`) | Built | **CRITICAL** — managing crew |
| Labels (`labels.html`) | Fixed 2026-03-01 | **CRITICAL** — daily printing for planting |
| Greenhouse Dashboard (`web_app/greenhouse-dashboard.html`) | Built | **CRITICAL** — daily use |
| Planning + Succession (`planning.html`, `succession.html`) | Built | **CRITICAL** — planting season |
| Schedule (`web_app/schedule.html`) | Built | **NEED** — scheduling staff |
| Sales Dashboard (`web_app/sales.html`) | Built | **CRITICAL** — managing orders |
| Wholesale Portal (`web_app/wholesale.html`) | Built | **CRITICAL** — chef ordering |
| CSA Portal (`web_app/csa.html`) | Built | **CRITICAL** — member management |

### USE — Active & Working
| Page | Status | Owner Decision |
|------|--------|----------------|
| Hub/Dashboard (`index.html`) | Built | **Want to use** — not using yet, start when ready |
| Task Assignment (`web_app/task-assignment.html`) | Built | **Not sure** — may merge into manager dashboard |
| Login (`login.html`) | Built | Active |
| Seed Inventory (`seed_inventory_PRODUCTION.html`) | Built | **Yes, using it** |
| Flowers (`flowers.html`) | Built | **Yes, using it** |
| Calendar (`calendar.html`) | Built | **Want to use** — start when ready |
| Field Planner (`web_app/field-planner.html`) | Built | **Want to use** — start when ready |
| Seedling Presale (`web_app/seedling-presale-2026.html`) | Built | **Want to use** — launch presale |
| Seedling Admin (`web_app/seedling-admin.html`) | Built | Goes with presale |
| Financial Dashboard (`web_app/financial-dashboard.html`) | Built | **Want to use** |
| Chief of Staff (`web_app/chief-of-staff.html`) | Built | **Want to use** |
| Admin Panel (`web_app/admin.html`) | Built | **Want to use** |
| Driver App (`web_app/driver.html`) | Built | **Starting soon** — keep for delivery season |
| Delivery Tracking (`track.html`) | Built | **Keep** — customer-facing driver tracking |
| Garage/Fleet (`web_app/garage.html`) | Built | **Yes, need it** |
| Soil Tests (`soil-tests.html`) | Built | **Yes, need it** |
| Satellite Monitoring (`web_app/satellite-map.html`) | Built | **Want to use** |
| Marketing Command Center (`web_app/marketing-command-center.html`) | Built | **Want to use** |
| Inventory Capture (`inventory_capture.html`) | Built | **Yes, use it** |
| Loan Readiness (`web_app/loan-readiness.html`) | Built | **Yes, need it** |
| Food Safety (`food-safety.html`) | Built | **Not yet** — will need eventually |
| SEO Dashboard (`web_app/seo_dashboard.html`) | Partial | **Keep separate** from marketing |

---

## FINISH — Owner Wants These Completed

| Page | Current State | Owner Decision | Priority |
|------|--------------|----------------|----------|
| Farmers Market POS (`web_app/market-sales.html`) | Limited UI | **FINISH** — sells at markets | Medium |
| Farmers Market Mgmt (`web_app/farmers-market.html`) | Partial | **FINISH** — goes with market POS | Medium |
| Seedling Wholesale B2B (`web_app/seedling-wholesale-2026.html`) | Minimal | **FINISH** — sells seedlings wholesale | Medium |
| QuickBooks Integration (`web_app/quickbooks-dashboard.html`) | Stub | **FINISH** — wants QB integration | Low |
| Wealth Builder (`web_app/wealth-builder.html`) | Stub | **FINISH** — mission: build wealth for farm AND employees | Medium |
| Smart Predictions (`web_app/smart-predictions.html`) | Stub | **FINISH** — wants AI predictions | Low |

---

## MERGE — Consolidate Into Existing Pages

| Page | Merge Into | Owner Decision |
|------|-----------|----------------|
| Chef Mobile Order (`web_app/chef-order.html`) | Wholesale Portal | **Merge** — one ordering page is enough |
| Farm Operations (`farm-operations.html`) | Manager Dashboard | **Merge** — manager dash covers field ops |
| Accounting (`web_app/accounting.html`) | Financial Dashboard | **Merge** — combine useful parts |
| Sowing Sheets (`sowing-sheets.html`) | Planning page | **Merge** — planning handles sowing records |
| CSA Finder + Location Widget | CSA Portal | **Merge** — integrate into csa.html |

---

## INTEGRATE — Link From Navigation

| Page | Action | Owner Decision |
|------|--------|----------------|
| Chef Register (`web_app/chef-register.html`) | Link from wholesale portal | **Keep** — chefs need self-signup |
| Chef Approve (`web_app/chef-approve.html`) | Link from admin panel | **Keep** — admin approves chefs |

---

## ARCHIVE — Remove From Active System

| Page | Reason | Notes |
|------|--------|-------|
| `web_app/employee-register.html` | Employee.html handles registration | Owner confirmed |
| `web_app/employee-approve.html` | Employee.html handles approval | Owner confirmed |
| `web_app/ai-assistant.html` | Chief of Staff has AI built in | Owner confirmed |
| `web_app/claude-chat.html` | Duplicate of AI assistant | Owner confirmed |
| `web_app/command-center.html` | Duplicate of chief-of-staff | Confirmed by code review |
| `web_app/quick-content.html` | Duplicate content viewer | Confirmed by code review |
| `web_app/log-commitment.html` | Duplicate of CSA tracking | Confirmed by code review |
| `web_app/book-import.html` | One-time import utility | Confirmed by code review |
| `web_app/neighbor.html` | Duplicate landing page | Owner confirmed |
| `web_app/remote-dashboard.html` | Dev tool — not needed now | Owner: "maybe later" |
| `web_app/delivery-zone-checker.html` | May duplicate Shopify feature | Owner: check Shopify first |
| `seed_track.html` | Seed inventory covers this | Owner confirmed |
| `web_app/customer.html` | Use wholesale/CSA portals instead | Duplicate ordering |
| `smart_learning_DTM.html` | Needs more data | Not useful yet |
| `greenhouse.html` (old) | Redirects to greenhouse-dashboard | Legacy |

---

## BACKEND — No Frontend Yet

| System | Backend Status | Owner Decision |
|--------|---------------|----------------|
| Harvest Planner | Complete API (GDD prediction, demand matching) | Needs UI — **HIGH** priority |
| Seasonal Patterns | 8 API actions | Needs UI — **MEDIUM** priority |
| Advanced Chief of Staff | 11 modules (voice, memory, autonomy, etc.) | Current CoS is enough for now |
| Alpaca Investing | 20+ actions (stock/crypto) | Ties to Wealth Builder mission |

---

## BUILD — AI Seed Procurement Agent (Back Burner)

**Owner decision:** "I want the AI to use all suppliers, get organic at the best prices, and build carts up to the point of sale without placing orders."

### What it does
- AI scans the 3-week sow window (already built: `checkSeedProcurementNeeds`)
- Searches ALL supplier websites for each needed variety
- Prioritizes **organic** varieties
- Compares prices across suppliers
- Builds optimized carts per supplier (fewest orders, best prices, organic preference)
- Presents a review screen: "Here's what I'd order from Johnny's, High Mowing, Fedco..."
- Owner confirms → system places the order (or owner places manually)

### Suppliers to support
- Johnny's Selected Seeds (johnnyseeds.com)
- High Mowing Organic Seeds (highmowingseeds.com)
- Fedco Seeds (fedcoseeds.com)
- Osborne Quality Seeds (osborneseed.com)
- Outsidepride (outsidepride.com)
- (add more as needed)

### Technical approach
- **Browser automation** (Playwright/Puppeteer) to search supplier catalogs
- **Price scraping** per variety per supplier
- **Organic flag detection** from product listings
- **Cart building** via browser automation (add to cart, stop before checkout)
- **Review UI** in greenhouse dashboard or chief of staff

### What's already built
- 3-week window scanning with urgency levels (backend)
- Supplier grouping with website links (frontend)
- Seed lot matching with crop aliases (backend)
- "SEEDS NOT IN INVENTORY" alerts when marking sown (frontend)
- Daily trigger for procurement checks (backend)

### What needs building
- Supplier catalog scraping / price lookup
- Cross-supplier price comparison with organic weighting
- Cart building automation per supplier
- Owner review + confirm UI
- Saved supplier account credentials (secure storage)

---

## EMPLOYEE WORKFLOW — Ready for Staff

### Setup (Do Once)
1. **Admin** → `web_app/employee-management.html` → "Invite Employee"
2. Employee gets **magic link** via email/SMS (7-day expiry)
3. Employee opens link → creates **PIN** + fills emergency contact
4. **Admin approves** → sets role

### Daily Use
5. Employee opens `employee.html` on phone → logs in with PIN
6. Sees **daily work order** (weather-aware, priority-ordered)
7. **Clocks in** → GPS logged
8. Works through tasks → timer tracks each → marks complete
9. **Clocks out** → hours auto-calculated

### Testing Checklist (Before Staff Arrives)
- [ ] Send a test invite to yourself
- [ ] Complete the registration flow
- [ ] Log in with PIN
- [ ] Assign yourself a task from manager dashboard
- [ ] Clock in and out
- [ ] Check timesheet view

---

## PRIORITY ORDER — What to Work On

### This Week (Staff + Planting)
1. Test employee workflow end-to-end
2. Test label printing with real labels
3. Verify manager dashboard shows employees/tasks
4. Verify schedule page works for shift planning

### This Month
5. Link chef register/approve from wholesale + admin
6. Start using hub dashboard, calendar, field planner
7. Start using financial dashboard + chief of staff
8. Finish farmers market POS (if market season starts)

### This Season
9. Finish seedling wholesale B2B
10. Finish wealth builder (farm + employee wealth)
11. Merge chef-order into wholesale portal
12. Merge accounting into financial dashboard
13. Merge sowing sheets into planning
14. Merge farm-operations into manager dashboard
15. Build harvest planner UI
16. Start using marketing command center

### Later
17. Finish QuickBooks integration
18. Finish smart predictions
19. Build seasonal patterns UI
20. Archive all orphaned pages (batch cleanup)

---

## SYSTEM STATS

| Metric | Value |
|--------|-------|
| Total pages | 51 |
| Active (owner-approved) | 28 |
| Finish (owner wants completed) | 6 |
| Merge (consolidate) | 5 |
| Integrate (link from nav) | 2 |
| Archive (remove) | 15 |
