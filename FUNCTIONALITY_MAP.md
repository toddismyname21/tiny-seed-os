# FUNCTIONALITY MAP — Tiny Seed Farm OS
**Created:** 2026-03-01 | **Purpose:** What you have, what to use, what to ignore

---

## YOUR DAILY WORKFLOW (Starting This Week)

### Morning (Owner)
1. **Hub** (`index.html`) — Morning brief, weather, today's tasks, alerts
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
12. **Wholesale Portal** (`web_app/wholesale.html`) — Chef ordering
13. **CSA Portal** (`web_app/csa.html`) — Member management, box customization

### Weekly
14. **Schedule** (`web_app/schedule.html`) — Set next week's shifts, time-off requests
15. **Financial Dashboard** (`web_app/financial-dashboard.html`) — Cash flow, P&L, debts
16. **Chief of Staff** (`web_app/chief-of-staff.html`) — Email triage, admin tasks

---

## WHAT YOU HAVE — Active & Working

### Core Operations (USE DAILY)
| Page | URL | What It Does |
|------|-----|-------------|
| Hub/Dashboard | `index.html` | Morning brief, AI task priority, weather, quick actions |
| Employee App | `employee.html` | Clock in/out, tasks, harvest logging, GPS, messaging |
| Manager Dashboard | `web_app/manager-dashboard.html` | Assign tasks, monitor crew, labor alerts |
| Task Assignment | `web_app/task-assignment.html` | Create tasks, assign to employees, batch ops |
| Schedule | `web_app/schedule.html` | Weekly shifts, time-off, crew availability |
| Labels | `labels.html` | Print tray labels, pot tags, seed labels |
| Login | `login.html` | PIN-based auth for all users |

### Growing & Production (USE FOR PLANTING SEASON)
| Page | URL | What It Does |
|------|-----|-------------|
| Greenhouse Dashboard | `web_app/greenhouse-dashboard.html` | Today's tasks, tray inventory, growth tracking, sales |
| Planning | `planning.html` | Crop succession wizard, bed assignments, rotation |
| Succession | `succession.html` | Guided succession planting with date recommendations |
| Calendar | `calendar.html` | Full farm calendar: planting, tasks, harvest |
| Field Planner | `web_app/field-planner.html` | Visual bed layout, crop placement |
| Seed Inventory | `seed_inventory_PRODUCTION.html` | QR-based seed lot tracking, germination rates |
| Flowers | `flowers.html` | Variety management, bulb inventory, planting calendar |

### Sales & Customers (USE FOR SALES SEASON)
| Page | URL | What It Does |
|------|-----|-------------|
| Sales Dashboard | `web_app/sales.html` | Order management, customer tracking, reports |
| Wholesale Portal | `web_app/wholesale.html` | Chef ordering with product catalog, standing orders |
| CSA Portal | `web_app/csa.html` | Box customization, member management, pickups |
| Chef Mobile Order | `web_app/chef-order.html` | Mobile-friendly ordering for chefs |
| Seedling Presale | `web_app/seedling-presale-2026.html` | Customer-facing presale store |
| Seedling Admin | `web_app/seedling-admin.html` | Manage presale orders, fulfillment |

### Finance & Admin
| Page | URL | What It Does |
|------|-----|-------------|
| Financial Dashboard | `web_app/financial-dashboard.html` | P&L, cash flow, debts, investments, bank accounts |
| Chief of Staff | `web_app/chief-of-staff.html` | Email triage, task management, proactive alerts |
| Admin Panel | `web_app/admin.html` | User management, feature flags, email campaigns |
| Driver App | `web_app/driver.html` | Route tracking, GPS, delivery proof, SMS |
| Garage/Fleet | `web_app/garage.html` | Equipment inventory, parts, service schedules |

---

## WHAT'S BUILT BUT YOU'RE NOT USING

These are **fully built systems** sitting idle. Consider whether to adopt or archive.

| System | Page | What It Does | Recommendation |
|--------|------|-------------|----------------|
| **Soil Tests** | `soil-tests.html` (13,623 lines) | 13-tab mega platform: soil/tissue testing, amendment calculator, IPM, fertigation, organic compliance | **USE THIS** — invaluable for growing season |
| **Satellite Monitoring** | `web_app/satellite-map.html` | NDVI field health analysis from satellite imagery | Use when field crops are growing |
| **Marketing Command Center** | `web_app/marketing-command-center.html` (42k lines) | Full social media suite: content calendar, AI content, GBP, SEO, email campaigns | **Powerful but complex** — pick 1-2 features to start |
| **Food Safety** | `food-safety.html` | Compliance forms, food safety task tracking | Use when audits approach |
| **Inventory Capture** | `inventory_capture.html` | General inventory entry interface | Use for supply tracking |

---

## WHAT'S HALF-BUILT — Decide: Finish or Archive

| System | Page | State | My Recommendation |
|--------|------|-------|-------------------|
| Farmers Market POS | `web_app/market-sales.html` | Limited UI | **Archive** unless you do farmers markets |
| Farmers Market Mgmt | `web_app/farmers-market.html` | Partial | **Archive** unless needed |
| Seedling Wholesale (B2B) | `web_app/seedling-wholesale-2026.html` | Minimal | **Finish** if you sell wholesale seedlings |
| QuickBooks Dashboard | `web_app/quickbooks-dashboard.html` | Stub | **Archive** — use financial-dashboard instead |
| Wealth Builder | `web_app/wealth-builder.html` | Stub | **Archive** — not core to farm operations |
| Smart Predictions | `web_app/smart-predictions.html` | Stub | **Archive** — ML predictions without enough data |
| Farm Operations | `farm-operations.html` | Partial | **Archive** — use manager-dashboard instead |
| Sowing Sheets | `sowing-sheets.html` | Partial | Use planning.html instead |
| Accounting | `web_app/accounting.html` | Limited | **Finish** if you need receipt/grant tracking |
| SEO Dashboard | `web_app/seo_dashboard.html` | Partial | Use marketing-command-center instead |
| Smart Learning DTM | `smart_learning_DTM.html` | Minimal | **Archive** — needs more data to be useful |

---

## WHAT SHOULD BE ARCHIVED — Orphaned Pages

These pages have NO navigation links. Nobody can find them without the direct URL.

| Page | Purpose | Action |
|------|---------|--------|
| `web_app/chef-register.html` | Chef sign-up | Link from wholesale portal or remove |
| `web_app/chef-approve.html` | Chef approval | Link from admin panel or remove |
| `web_app/csa-unified-finder.html` | CSA search | Merge into csa.html or remove |
| `web_app/csa-location-widget.html` | Pickup location | Merge into csa.html or remove |
| `web_app/log-commitment.html` | SMS commitment | Remove — unused |
| `web_app/employee-register.html` | Employee sign-up | Remove — employee.html handles this |
| `web_app/employee-approve.html` | Employee approval | Link from admin panel |
| `web_app/ai-assistant.html` | Claude AI chat | Remove — chief-of-staff has AI built in |
| `web_app/claude-chat.html` | Duplicate AI chat | Remove |
| `web_app/command-center.html` | Unknown | Remove |
| `web_app/quick-content.html` | Content creation | Remove — marketing-command-center has this |
| `web_app/book-import.html` | Data import | Remove — one-time utility |
| `web_app/remote-dashboard.html` | Unknown | Remove |
| `track.html` | GPS tracking | Remove — employee.html has GPS |
| `seed_track.html` | Seed tracking | Remove — seed_inventory_PRODUCTION has this |
| `web_app/social-intelligence.html` | Social analytics | Merge into marketing-command-center |
| `web_app/customer.html` | Generic ordering | Use wholesale or CSA portal instead |
| `web_app/delivery-zone-checker.html` | Zone validation | Low priority — keep if delivering |
| `web_app/neighbor.html` | Public page | Keep if used for marketing |

---

## BACKEND CAPABILITIES WITH NO FRONTEND

These are complete backend systems with API endpoints but no user-facing page:

| System | Backend | What It Could Do | Priority |
|--------|---------|------------------|----------|
| Harvest Planner | Complete API | Plan harvests by demand, predict dates with GDD | **HIGH** — would help planting |
| Advanced Chief of Staff | 11 modules built | Voice commands, memory, autonomy, predictions, calendar AI | LOW — current email triage is enough |
| Seasonal Patterns | 8 API actions | Seasonal insights and recommendations | MEDIUM — useful for planning |
| Alpaca Investing | 20+ actions | Stock/crypto trading | NONE — not farm-related |

---

## EMPLOYEE WORKFLOW — Ready for Staff

The employee system is **architecturally complete**. Here's the full lifecycle:

### Setup (Do Once)
1. **Admin** → `web_app/employee-management.html` → "Invite Employee"
2. Employee gets **magic link** via email/SMS (7-day expiry)
3. Employee opens link → creates **PIN** + fills emergency contact
4. **Admin approves** in `web_app/employee-approve.html` → sets role

### Daily Use
5. Employee opens `employee.html` on phone → logs in with PIN
6. Sees **daily work order** (weather-aware, priority-ordered)
7. **Clocks in** → GPS logged, geofence checked
8. Works through tasks → timer tracks each task → marks complete
9. **Clocks out** → hours auto-calculated

### Manager Oversight
10. `web_app/manager-dashboard.html` → see all employees, tasks, alerts
11. `web_app/task-assignment.html` → create/assign tasks, SMS notification
12. `web_app/schedule.html` → weekly shifts, time-off requests

### Reporting
- Timesheets auto-generated (bi-weekly pay periods)
- Efficiency tracking (estimated vs actual time)
- QuickBooks-ready export

### What to Test Before Staff Arrives
- [ ] Send a test invite to yourself
- [ ] Complete the registration flow
- [ ] Log in with PIN
- [ ] Assign yourself a task from manager dashboard
- [ ] Clock in and out
- [ ] Check timesheet view
- [ ] Verify SMS notifications work (if Twilio configured)
- [ ] Set farm geofence coordinates (if using GPS check-in)

---

## SYSTEM STATS

| Metric | Value |
|--------|-------|
| Total pages | 51 |
| Fully built | 23 (45%) |
| Partially built | 16 (31%) |
| Orphaned/unused | 12+ (24%) |
| Backend functions | ~2,795 |
| API endpoints | ~600+ |
| Database sheets | 216 |
| External integrations | 18 |
| Backend size | 148,589 lines |
| Frontend size | 276,022 lines |
