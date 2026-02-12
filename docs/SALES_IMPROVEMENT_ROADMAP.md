# SALES SYSTEM IMPROVEMENT ROADMAP
## Applying Field Mode / Office Mode UX Patterns to the Sales Dashboard

**Created:** 2026-02-12
**Source Documents:**
- SALES_SYSTEM_AUDIT.md (System capabilities)
- MASTER_UX_IMPROVEMENT_PLAN.md (UX patterns)
**Author:** Claude Opus 4.5 (Overnight Task)

---

## EXECUTIVE SUMMARY

This roadmap applies the dual-context design principles (Field Mode vs Office Mode) from the UX Master Plan to the Sales Dashboard system. The Sales Dashboard at `web_app/sales.html` is a comprehensive 11-tab command center managing CSA, Wholesale, Farmers Market, and Shopify sales channels.

**Key Finding:** The current Sales system is optimized for neither Field Mode nor Office Mode. It is a traditional desktop web app that requires significant enhancement to support both contexts effectively.

**Primary Recommendations:**
1. Implement "Sales Saturday" ritual workflow for Office Mode (keyboard-first, batch operations)
2. Create Field Mode quick-stats view for on-the-go sales checks
3. Add real-time sync capabilities to replace manual Shopify button
4. Build actual charts in Reports tab (currently placeholder divs)
5. Integrate all sales channels for unified cross-system insights

---

## CURRENT SALES SYSTEM CAPABILITIES

### Overview
- **File:** `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/sales.html`
- **Size:** ~6,000+ lines (self-contained SPA)
- **Access:** Requires "Manager" role via auth-guard.js
- **Theme:** Dark mode with consistent design patterns

### 11-Tab Structure

| Tab | Purpose | Current Status |
|-----|---------|----------------|
| Dashboard | KPI overview, alerts, recent orders | FUNCTIONAL |
| Orders | Order management with filtering | FUNCTIONAL |
| Customers | Customer CRM with cards | FUNCTIONAL |
| Inventory | Product/crop stock management | FUNCTIONAL |
| CSA Members | Subscription management, Week A/B | FUNCTIONAL |
| Wholesale | B2B customer management | PARTIALLY FUNCTIONAL |
| Weekly Cycle | Harvest-Pack-Deliver planning | FUNCTIONAL |
| Pick & Pack | Fulfillment operations | FUNCTIONAL |
| Farmers Market | Market session management | FUNCTIONAL |
| Campaigns | SMS/Email marketing | FUNCTIONAL |
| Reports | Analytics and reporting | BASIC (no charts) |

### Current Integration Status

| Integration | Status | Gap |
|-------------|--------|-----|
| Shopify | Manual sync button | No real-time webhooks |
| CSA Portal | Shared API | No real-time notifications |
| Wholesale Portal | Shared API | No automated availability |
| Farmers Market | Shared API | Weak POS transaction sync |
| Driver App | Separate | No delivery status updates |

### Current UX Strengths
- Clean dark theme, professional appearance
- Tabbed navigation with logical grouping
- Status badges with color coding
- Toast notifications for feedback
- Responsive design (mobile-friendly)
- Search and filter on most tabs

### Current UX Weaknesses (from Audit)
- No keyboard shortcuts (power users blocked)
- No bulk actions on Orders tab
- Reports tab has placeholder charts (not implemented)
- Limited date navigation in Weekly Cycle
- No print styling for pick lists
- No undo for status changes or deletions

---

## FIELD MODE OPPORTUNITIES

### When Sales Field Mode is Needed

| Scenario | Context | Time Available |
|----------|---------|----------------|
| Quick sales check | At market, between customers | 30 seconds |
| Customer lookup | Phone call while in field | 1 minute |
| Order status | Customer asking about delivery | 30 seconds |
| Goal progress | Mid-day motivation check | 15 seconds |
| Alert response | Urgent notification | 1 minute |

### Field Mode Design Requirements (from UX Master Plan)

1. **Zero-Decision Workflows** - Auto-detect context, pre-fill fields
2. **2-Tap Maximum Rule** - No action requires more than 2 taps
3. **High Contrast** - 18px minimum text, 60px touch targets
4. **Voice Commands** - Hands-free operation

### Proposed Field Mode Quick Stats View

```
+----------------------------------+
|     TODAY: $1,247                |
|     vs last week: +23%           |
+----------------------------------+
|                                  |
|  [=========>        ] 78%        |
|  Daily goal: $1,600              |
|                                  |
+----------------------------------+
|  Market: $534                    |
|  CSA: $450                       |
|  Wholesale: $263                 |
+----------------------------------+
|     [TAP FOR DETAILS]            |
+----------------------------------+
```

### Field Mode Sales Functions Needed

| Function | Current State | Field Mode Solution |
|----------|---------------|---------------------|
| Today's sales | Available via Dashboard tab | One-screen summary, no navigation |
| Goal progress | NOT IMPLEMENTED | Large progress bar, always visible |
| Quick comparison | NOT IMPLEMENTED | Voice: "Compare to last Tuesday" |
| Customer lookup | Available, requires navigation | One-tap search with large results |
| Order status check | Available, requires clicks | Scan order ID or voice query |
| Alert response | Toast notifications | One-tap acknowledge with note |

### Voice Commands for Sales Field Mode

| Command | Action |
|---------|--------|
| "Hey Tiny, how are sales today?" | Spoken summary of daily totals |
| "Compare to last [day]" | Spoken comparison with percentage |
| "What's my goal progress?" | Spoken goal status |
| "Look up [customer name]" | Display customer card large |
| "Order status for [name/ID]" | Display order status |

### Field Mode Implementation Priorities

1. **Create Field Mode toggle** - Auto-detect mobile + time of day
2. **Build Quick Stats widget** - Single-screen daily summary
3. **Implement voice commands** - 5 essential commands above
4. **Enlarge touch targets** - 60px minimum in Field Mode
5. **Add haptic feedback** - Confirm actions physically

---

## OFFICE MODE OPPORTUNITIES

### The "Sales Saturday" Ritual

Following the UX Master Plan pattern of weekly rituals (SEO Sunday, Market Monday, CSA Sunday, Wholesale Wednesday), the Sales Dashboard should support a **"Sales Saturday"** weekly review workflow.

**Sales Saturday Workflow (45 minutes):**

```
Minutes 0-10:  Review week's sales by channel
Minutes 10-20: Analyze product performance
Minutes 20-30: Identify trends and anomalies
Minutes 30-40: Set next week's goals
Minutes 40-45: Generate reports if needed
```

### Office Mode Design Requirements (from UX Master Plan)

1. **Keyboard-First Desktop** - Single-key actions, Vim-style navigation
2. **Rich-Decision Control** - Batch operations, customization
3. **Information Density Options** - Compact vs comfortable views
4. **Flow-Enabling Design** - Minimize distractions, maintain focus

### Proposed Keyboard Shortcuts for Sales

| Key | Action | Current State |
|-----|--------|---------------|
| D | Daily view | NOT IMPLEMENTED |
| W | Weekly view | NOT IMPLEMENTED |
| M | Monthly view | NOT IMPLEMENTED |
| C | Channel breakdown | Requires clicks |
| P | Product analysis | Requires clicks |
| G | Goal settings | NOT IMPLEMENTED |
| R | Generate report | NOT IMPLEMENTED |
| / | Quick search | NOT IMPLEMENTED |
| ? | Show all shortcuts | NOT IMPLEMENTED |
| J/K | Navigate up/down | NOT IMPLEMENTED |
| Cmd+K | Command palette | NOT IMPLEMENTED |
| Tab 1-9 | Switch tabs directly | NOT IMPLEMENTED |
| Enter | Select/confirm | Works on buttons |
| Esc | Cancel/close modal | IMPLEMENTED |

### Batch Operations Needed

| Operation | Current State | Office Mode Solution |
|-----------|---------------|----------------------|
| Bulk order status update | Single order only | Select multiple + status change |
| Export multiple date ranges | Single export only | Multi-select date ranges |
| Compare time periods | NOT AVAILABLE | Side-by-side comparison |
| Bulk categorize transactions | NOT AVAILABLE | Multi-select + assign category |
| Multi-channel report generation | NOT AVAILABLE | Generate combined reports |

### Office Mode Implementation Priorities

1. **Add keyboard shortcut overlay** - Press ? to see all shortcuts
2. **Implement J/K navigation** - Move through tables
3. **Add Cmd+K command palette** - Quick action launcher
4. **Create bulk order actions** - Select multiple, change status
5. **Build actual charts** - Replace placeholder divs with Chart.js
6. **Add goal setting/tracking** - Weekly targets with progress
7. **Implement CSV export** - Currently button exists but non-functional

---

## PRIORITY 1: CRITICAL GAPS

These gaps block core functionality or significantly impact usability.

### 1.1 Real Charts in Reports Tab (CRITICAL)

**Current State:** Placeholder divs with no visualization
**Impact:** Cannot perform Sales Saturday analysis effectively
**UX Principle Violated:** Rich-Decision Control - users need data visualization

**Implementation:**
- Add Chart.js library
- Revenue by Week line chart
- Orders by Channel pie/bar chart
- Top Selling Products bar chart
- Trend comparison charts

**Effort:** 4-6 hours
**Priority:** CRITICAL

### 1.2 Real-Time Shopify Sync (CRITICAL)

**Current State:** Manual "Sync from Shopify" button
**Impact:** Data is always stale, requires manual intervention
**UX Principle Violated:** Zero-Decision Workflows - system should auto-update

**Implementation:**
- Shopify webhook listener in Apps Script
- Automatic sync on order creation/update
- Real-time inventory sync
- WebSocket or Server-Sent Events for dashboard updates

**Effort:** 6-8 hours
**Priority:** CRITICAL

### 1.3 Export Functionality (CRITICAL)

**Current State:** Export button exists but non-functional
**Impact:** Cannot generate reports for business analysis or loan applications
**UX Principle Violated:** Rich-Decision Control - users need data export

**Implementation:**
- CSV export for all data tables
- PDF export for formatted reports
- Date range selection for exports
- Export templates for common reports

**Effort:** 3-4 hours
**Priority:** CRITICAL

### 1.4 Field Mode Toggle (CRITICAL for Mobile)

**Current State:** No Field Mode
**Impact:** Cannot effectively use Sales on mobile in the field
**UX Principle Violated:** Dual-Context Design - no field adaptation

**Implementation:**
- Add "Field Mode" toggle in header
- Auto-detect based on screen size + time of day
- High-contrast color scheme
- Enlarged touch targets (60px)
- Simplified single-screen quick stats

**Effort:** 4-6 hours
**Priority:** CRITICAL

---

## PRIORITY 2: IMPORTANT GAPS

These gaps reduce efficiency and user satisfaction.

### 2.1 Keyboard Shortcuts (IMPORTANT)

**Current State:** No keyboard shortcuts
**Impact:** Power users cannot navigate efficiently during Sales Saturday
**UX Principle Violated:** Keyboard-First Desktop

**Implementation:**
- Implement shortcut handler
- Add ? key overlay
- J/K navigation through tables
- Tab switching via number keys
- Cmd+K command palette

**Effort:** 4-5 hours
**Priority:** IMPORTANT

### 2.2 Bulk Order Operations (IMPORTANT)

**Current State:** Single order actions only
**Impact:** Slow to process multiple orders
**UX Principle Violated:** Batch Operations for efficiency

**Implementation:**
- Checkbox selection on orders
- "Select All" functionality
- Bulk status update
- Bulk assign delivery date
- Bulk delete (with confirmation)

**Effort:** 3-4 hours
**Priority:** IMPORTANT

### 2.3 Goal Setting and Progress Tracking (IMPORTANT)

**Current State:** No goals or progress tracking
**Impact:** No motivation or targets, cannot measure success
**UX Principle Violated:** Progress indicators show momentum

**Implementation:**
- Daily/weekly/monthly goal setting
- Visual progress bars
- Goal achievement celebrations
- Historical goal tracking
- Channel-specific goals

**Effort:** 4-5 hours
**Priority:** IMPORTANT

### 2.4 Customer Communication History (IMPORTANT)

**Current State:** No unified communication log
**Impact:** Cannot see past interactions with customer
**UX Principle Violated:** Rich-Decision Control - need full context

**Implementation:**
- Add communication timeline to customer card
- Log all emails, SMS, calls
- Show recent orders inline
- Link to campaign sends

**Effort:** 5-6 hours
**Priority:** IMPORTANT

### 2.5 Print Stylesheets (IMPORTANT)

**Current State:** No print styling
**Impact:** Pick lists and reports don't print properly
**UX Principle Violated:** Cross-context functionality

**Implementation:**
- Add print CSS for Pick & Pack lists
- Print-optimized order details
- Print-optimized customer cards
- One-click print buttons

**Effort:** 2-3 hours
**Priority:** IMPORTANT

---

## PRIORITY 3: NICE TO HAVE

These gaps are enhancements that improve delight but are not blocking.

### 3.1 Voice Commands (NICE TO HAVE)

**Current State:** No voice support
**Impact:** Cannot use hands-free in field
**UX Principle:** Voice Integration for Field Mode

**Implementation:**
- Web Speech API integration
- "Hey Tiny" wake word
- 5 essential sales commands
- Voice feedback for confirmations

**Effort:** 6-8 hours
**Priority:** NICE TO HAVE

### 3.2 Celebration Animations (NICE TO HAVE)

**Current State:** No celebrations
**Impact:** Missing the "fun" element
**UX Principle:** Work should feel satisfying

**Implementation:**
- Goal achievement animation
- "Best Day Ever" notification
- Milestone badges
- Streak tracking for daily reviews

**Effort:** 3-4 hours
**Priority:** NICE TO HAVE

### 3.3 Invoice PDF Generation (NICE TO HAVE)

**Current State:** No invoice generation
**Impact:** Must create invoices manually
**UX Principle:** Reduce manual work

**Implementation:**
- PDF invoice template
- Auto-populate from order data
- Email attachment capability
- Batch invoice generation

**Effort:** 5-6 hours
**Priority:** NICE TO HAVE

### 3.4 Subscription Analytics Dashboard (NICE TO HAVE)

**Current State:** Basic CSA member count only
**Impact:** Cannot analyze MRR, churn, LTV
**UX Principle:** Rich analytics for planning

**Implementation:**
- Monthly Recurring Revenue calculation
- Churn rate tracking
- Lifetime Value by customer
- Retention visualization

**Effort:** 8-10 hours
**Priority:** NICE TO HAVE

### 3.5 Dark/Light Mode Toggle (NICE TO HAVE)

**Current State:** Forced dark mode
**Impact:** Some users prefer light mode
**UX Principle:** User preference

**Implementation:**
- Light theme CSS
- Theme toggle in header
- Persist preference

**Effort:** 2-3 hours
**Priority:** NICE TO HAVE

---

## IMPLEMENTATION ROADMAP

### Week 1: Foundation (Field Mode + Charts)

| Day | Task | Effort | Impact |
|-----|------|--------|--------|
| 1 | Add Field Mode toggle and detection | 3h | HIGH |
| 1-2 | Create Field Mode quick stats view | 3h | HIGH |
| 2-3 | Integrate Chart.js library | 2h | HIGH |
| 3-4 | Build Revenue by Week chart | 3h | HIGH |
| 4-5 | Build Orders by Channel chart | 2h | MEDIUM |

**Week 1 Deliverable:** Field Mode works, Reports tab has real charts

### Week 2: Keyboard + Export

| Day | Task | Effort | Impact |
|-----|------|--------|--------|
| 1 | Implement shortcut handler | 2h | MEDIUM |
| 1-2 | Add ? shortcut overlay | 2h | MEDIUM |
| 2-3 | Implement J/K navigation | 2h | MEDIUM |
| 3-4 | Build CSV export functionality | 3h | HIGH |
| 4-5 | Add date range selection for exports | 2h | MEDIUM |

**Week 2 Deliverable:** Keyboard-first navigation, working exports

### Week 3: Real-Time Sync + Bulk Actions

| Day | Task | Effort | Impact |
|-----|------|--------|--------|
| 1-2 | Build Shopify webhook handler | 4h | HIGH |
| 2-3 | Implement real-time dashboard updates | 3h | HIGH |
| 3-4 | Add bulk order selection | 2h | MEDIUM |
| 4-5 | Build bulk status update | 2h | MEDIUM |

**Week 3 Deliverable:** Real-time data, bulk operations

### Week 4: Goals + Polish

| Day | Task | Effort | Impact |
|-----|------|--------|--------|
| 1-2 | Build goal setting UI | 3h | MEDIUM |
| 2-3 | Implement progress tracking | 3h | MEDIUM |
| 3 | Add print stylesheets | 2h | MEDIUM |
| 4 | Add Cmd+K command palette | 3h | MEDIUM |
| 5 | Testing and bug fixes | 4h | HIGH |

**Week 4 Deliverable:** Complete Sales Saturday workflow support

### Month 2: Enhancements

- Customer communication history
- Voice command integration
- Celebration animations
- Invoice PDF generation

### Month 3: Advanced

- Subscription analytics
- Cross-system unified dashboard
- Advanced reporting
- Mobile PWA optimization

---

## INTEGRATION WITH OTHER SYSTEMS

### CSA System Connection

**Current State:** Shared API via `api-config.js`, member data flows to Sales

**Integration Points:**
| From CSA | To Sales | Status |
|----------|----------|--------|
| Member signups | CSA Members tab | WORKING |
| Box customizations | Inventory demand | API READY |
| Member messages | Customer timeline | NOT IMPLEMENTED |
| Payment confirmations | Order status | WORKING |

**Improvement Needed:**
- Real-time notification when CSA member makes changes
- Sync member preferences to customer profile
- Link CSA communication to customer history

### Wholesale System Connection

**Current State:** Shared API, orders flow to Sales Orders tab

**Integration Points:**
| From Wholesale | To Sales | Status |
|----------------|----------|--------|
| Chef orders | Orders tab | WORKING |
| Customer registration | Customers tab | WORKING |
| Availability requests | Inventory | NOT AUTOMATED |
| Invoice requests | Reports | NOT IMPLEMENTED |

**Improvement Needed:**
- Automated weekly availability push to chefs
- Price list management with wholesale tiers
- Delivery route integration

### Farmers Market System Connection

**Current State:** Shared API, market sessions display in Sales

**Integration Points:**
| From Farmers Market | To Sales | Status |
|---------------------|----------|--------|
| Market sessions | Weekly Cycle tab | WORKING |
| Projected revenue | Dashboard | WORKING |
| Quick sales | Real-time updates | WEAK |
| Inventory deductions | Stock levels | NOT VERIFIED |

**Improvement Needed:**
- Real-time sync from market-sales.html (POS app)
- Instant inventory updates when items sold
- Market performance analytics

### Financial Dashboard Connection

**Current State:** Separate system, some data overlap

**Integration Points:**
| From Sales | To Financial | Status |
|------------|--------------|--------|
| Revenue totals | P&L reports | MANUAL |
| Channel breakdown | Revenue by source | NOT INTEGRATED |
| Customer payments | Cash flow | NOT INTEGRATED |

**Improvement Needed:**
- Automatic revenue sync to financial dashboard
- Channel-based revenue categorization
- Payment reconciliation

### Driver App Connection

**Current State:** Separate app, no integration

**Integration Points:**
| From Driver | To Sales | Status |
|-------------|----------|--------|
| Delivery confirmation | Order status | NOT IMPLEMENTED |
| Delivery notes | Order details | NOT IMPLEMENTED |
| Route completion | Dashboard alerts | NOT IMPLEMENTED |

**Improvement Needed:**
- Delivery status updates flow to Sales
- Customer notification on delivery
- Route efficiency metrics

---

## CROSS-SYSTEM UNIFIED VIEW (Future Vision)

The UX Master Plan envisions a unified dashboard showing all systems at once.

### Proposed "Command Center" View

```
+--------------------------------------------------+
|  TINY SEED COMMAND CENTER           [Field Mode] |
+--------------------------------------------------+
|                                                  |
|  TODAY'S SUMMARY                                 |
|  ================================================|
|  Total Revenue: $1,847                          |
|  [========>         ] 72% of daily goal         |
|                                                  |
|  BY CHANNEL:                                     |
|  CSA:      $650  (35%)  [=====>    ]            |
|  Market:   $534  (29%)  [====     ]             |
|  Wholesale: $413 (22%)  [===      ]             |
|  Direct:   $250  (14%)  [==       ]             |
|                                                  |
|  ALERTS (3)                                      |
|  - Low stock: Tomatoes (2 remaining)            |
|  - Order deadline: Wholesale in 2 hours         |
|  - CSA member changed box contents              |
|                                                  |
|  QUICK ACTIONS                                   |
|  [New Order] [Check Inventory] [View Alerts]    |
|                                                  |
+--------------------------------------------------+
```

### Integration Architecture (Proposed)

```
                   +------------------+
                   |   Shopify Store  |
                   +--------+---------+
                            |
                     Webhooks (real-time)
                            |
                            v
+-------------+    +------------------+    +----------------+
| farmers-    |    |                  |    |   wholesale    |
| market.html |--->|  Google Sheets   |<---| .html          |
| (Planning)  |    |  (Master Data)   |    |                |
+-------------+    |                  |    +----------------+
                   +--------+---------+
+-------------+             |              +----------------+
| market-     |             |              |   csa.html     |
| sales.html  |<----------->|<------------>|   (Customer)   |
| (POS)       | Server-Sent Events         +----------------+
+-------------+             |
                            v
                   +------------------+
                   |    sales.html    |
                   |  (Command Center)|
                   +--------+---------+
                            |
                            v
                   +------------------+
                   | financial-       |
                   | dashboard.html   |
                   +------------------+
```

---

## SUCCESS METRICS

### Field Mode Success Metrics

| Metric | Current | 3-Month Target | 6-Month Target |
|--------|---------|----------------|----------------|
| Time to check daily sales | Unknown | <15 seconds | <10 seconds |
| Taps for quick stats | N/A (no field mode) | 2 | 1 |
| Voice command usage | 0% | 15% | 30% |
| Field mode adoption | 0% | 40% | 60% |

### Office Mode Success Metrics

| Metric | Current | 3-Month Target | 6-Month Target |
|--------|---------|----------------|----------------|
| Sales Saturday completion | 0% (no workflow) | 50% | 80% |
| Keyboard shortcut usage | 0% | 20% | 40% |
| Time in weekly review | Unknown | 35 min | 45 min |
| Batch operation usage | 0% | 30% | 50% |

### Overall Sales System Metrics

| Metric | Target |
|--------|--------|
| Real-time data freshness | <5 minutes |
| Chart loading time | <2 seconds |
| Export generation time | <5 seconds |
| User satisfaction (NPS) | 50+ |

---

## VERIFICATION CHECKLIST

Use this checklist when implementing each improvement:

### Field Mode Checklist
- [ ] High-contrast color scheme applied
- [ ] Touch targets minimum 60px
- [ ] Maximum 2 taps for primary actions
- [ ] Quick stats view shows all key data
- [ ] Auto-detect context working
- [ ] Mode toggle visible and accessible

### Office Mode Checklist
- [ ] Keyboard shortcuts documented
- [ ] J/K navigation working
- [ ] Command palette (Cmd+K) implemented
- [ ] Batch operations available
- [ ] Charts render correctly
- [ ] Export functionality works
- [ ] Goals and progress visible

### Integration Checklist
- [ ] Real-time Shopify sync working
- [ ] CSA changes reflect in Sales
- [ ] Wholesale orders appear in Orders
- [ ] Market sales update inventory
- [ ] All systems use unified API

---

## CONCLUSION

The Sales Dashboard has a solid foundation with 11 functional tabs and proper API integration. However, it currently serves neither Field Mode nor Office Mode effectively.

**Immediate Priorities (Next 4 Weeks):**
1. Add Field Mode toggle with quick stats view
2. Implement actual charts in Reports tab
3. Enable keyboard shortcuts for power users
4. Add real-time Shopify sync via webhooks
5. Make export functionality work

**The Vision:**
Transform the Sales Dashboard from a traditional web app into a dual-context command center that:
- In the field: Provides instant sales insights in 2 taps
- In the office: Enables deep analysis with keyboard efficiency
- Across systems: Unifies CSA, Wholesale, Market, and Direct sales

By implementing this roadmap, Tiny Seed Farm will have a Sales system that matches the UX excellence defined in the Master Plan.

---

*Roadmap compiled 2026-02-12 by Claude Opus 4.5*
*Based on SALES_SYSTEM_AUDIT.md and MASTER_UX_IMPROVEMENT_PLAN.md*
*For implementation by Desktop_Claude and Sales_Claude agents*
