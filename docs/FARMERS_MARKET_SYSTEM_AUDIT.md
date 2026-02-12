# Farmers Market System Audit

**Audit Date:** 2026-02-12
**Auditor:** Claude Opus 4.5 (Automated)
**Scope:** Complete front-to-back audit of the Farmers Market management system

---

## Executive Summary

The Tiny Seed Farm OS includes a comprehensive Farmers Market management system consisting of:
- **2 dedicated frontend pages** (farmers-market.html, market-sales.html)
- **1 integrated section** in marketing-command-center.html
- **18+ backend API endpoints** in MERGED TOTAL.js
- **Integration with** Shopify POS, weather forecasting, weekly cycle planning, and marketing

The system is designed for a farm operating at 4 regular farmers markets:
- **Lawrenceville** (Tuesday, 4-7pm)
- **Sewickley** (Saturday, 9am-1pm)
- **Bloomfield** (Saturday, 9am-2pm)
- **Squirrel Hill** (Sunday, 10am-2pm)

---

## 1. System Map

```
FARMERS MARKET SYSTEM ARCHITECTURE
==================================

FRONTEND LAYER
├── web_app/farmers-market.html    [Main Dashboard]
│   ├── Overview tab
│   ├── Upcoming Markets view
│   ├── Harvest Plan section
│   ├── Quick Actions
│   ├── Alerts system
│   └── Recent Performance table
│
├── web_app/market-sales.html      [Mobile POS]
│   ├── Session selector
│   ├── Product grid (touch-optimized)
│   ├── Cart management
│   ├── Payment methods (Cash, Card, Venmo, SNAP)
│   ├── Checkout flow
│   ├── Shopify sync
│   └── Stats bar (sales, transactions, avg)
│
└── web_app/marketing-command-center.html [Campaigns Tab]
    ├── Market Day Quick Schedule
    ├── Auto-schedule market reminders
    └── Social media integration

BACKEND LAYER (apps_script/MERGED TOTAL.js)
├── MARKET MODULE ENDPOINTS
│   ├── initMarketModule
│   ├── createMarketSession
│   ├── getMarketSession
│   ├── getUpcomingMarkets
│   ├── updateMarketSessionStatus
│   ├── getMarketDashboard
│   ├── calculateDemandPrediction
│   ├── getActiveMarketLocations
│   ├── generateMarketHarvestPlan
│   ├── recordMarketSale
│   ├── recordQuickSale
│   ├── getMarketInventoryStatus
│   ├── initiateSettlement
│   ├── completeSettlement
│   ├── getMarketPerformanceAnalytics
│   ├── getMarketMorningBrief
│   ├── syncMarketToPickPack
│   ├── syncShopifyMarketSales
│   └── getShopifyMarketReport
│
├── WEEKLY CYCLE INTEGRATION
│   ├── getWeeklyCycleOverview
│   ├── getWeeklyHarvestPlan
│   ├── getWeeklyPackSchedule
│   ├── getWeeklyDeliverySchedule
│   ├── getAggregatedDemand
│   ├── getSalesChannelSummary
│   ├── generateWeeklyHarvestFromDemand
│   └── getUnifiedSalesDashboard
│
└── SUPPORTING FUNCTIONS
    ├── getMarketSessionsForWeek
    ├── getMarketDashboardStatsWeekly
    ├── buildWeeklySchedule
    ├── getMarketSignItems
    └── getOrdersForLabels

DATA LAYER (Google Sheets)
├── MARKET_SESSIONS         [Session tracking]
├── SALES_MarketSales       [Transaction records]
├── SALES_MarketItems       [Product catalog with prices]
├── INV_Products            [Product inventory]
└── MARKET_LOCATIONS        [Location configuration] (may need creation)
```

---

## 2. Frontend Audit

### 2.1 farmers-market.html (Main Dashboard)

**Location:** `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/farmers-market.html`
**Lines:** 1,274
**Authentication:** Employee role required (auth-guard.js)

#### Features Present:
| Feature | Status | Notes |
|---------|--------|-------|
| Stats Grid | Working | Shows: Upcoming markets, Revenue, Transactions, Sell-through |
| Upcoming Markets List | Working | Weather-integrated, status badges, click to select |
| Weather Integration | Working | Icons, temp display, weather impact rating |
| Morning Brief Alert | Working | Next market notification with recommendations |
| Quick Actions | Working | Sync Shopify, Harvest Plan, Settlement, Analytics |
| Harvest Plan Table | Working | Priority, product, variety, demand, qty, field, GDD, notes |
| Recent Performance | Working | Date, location, predicted vs actual, accuracy, sell-through |
| Alerts Panel | Working | Session creation reminders, weather warnings |
| Sidebar Navigation | Working | Overview, Upcoming, Harvest, Quick Sale, Settlement, Analytics, Demand, Locations |

#### User Flow:
1. Dashboard loads with stats and upcoming markets
2. Morning brief shows next market with weather + recommendations
3. User clicks on upcoming market to select it
4. If no session exists, prompts to create one
5. Harvest plan generates automatically
6. User can sync to pick/pack, print, or start settlement
7. After market, settlement calculates fees and inventory

#### UI/UX Assessment:
- **Strengths:**
  - Dark theme consistent with brand
  - Clear visual hierarchy
  - Weather integration adds decision support
  - Status badges at-a-glance
  - Responsive design (mobile breakpoints)

- **Weaknesses:**
  - Settlement flow uses alert() dialogs instead of proper modal
  - Analytics uses alert() - should be dedicated view
  - No drag-and-drop priority adjustment
  - No offline mode indicator

### 2.2 market-sales.html (Mobile POS)

**Location:** `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/market-sales.html`
**Lines:** 1,135
**Authentication:** Employee role required
**Optimized for:** Touch/mobile use

#### Features Present:
| Feature | Status | Notes |
|---------|--------|-------|
| Session Selector | Working | Shows sessions for next 7 days |
| Product Grid | Working | 20 default products with categories |
| Category Tabs | Working | All, Vegetables, Greens, Root Veg, Herbs, Flowers |
| Cart Management | Working | Add, remove, clear, quantity adjustment |
| Payment Methods | Working | Cash, Card, Venmo, SNAP (EBT) |
| Quantity Modal | Working | Large touch-friendly +/- buttons |
| Checkout | Working | Records sale via API |
| Success Animation | Working | Full-screen confirmation |
| Shopify Sync | Working | Pulls POS orders from market time window |
| Stats Bar | Working | Today's sales, transactions, avg sale |
| Inventory Alerts | Working | Low stock, sold out warnings |

#### Default Product Catalog:
- Tomatoes ($4/lb), Peppers ($3.50/lb), Cucumbers ($2/each), Squash ($3/lb)
- Lettuce ($4/head), Kale ($4/bunch), Spinach ($5/bag), Chard ($4/bunch)
- Carrots ($4/bunch), Beets ($4/bunch), Radishes ($3/bunch), Turnips ($3.50/bunch)
- Basil ($3/bunch), Cilantro ($2.50/bunch), Parsley ($2.50/bunch), Dill ($2.50/bunch)
- Sunflowers ($8/bunch), Zinnias ($8/bunch), Mixed Bouquet ($12/each)
- Eggs ($7/dozen)

#### User Flow:
1. Select market session (or create one)
2. See current stats and inventory alerts
3. Tap products to add to cart
4. Adjust quantity in modal
5. Select payment method
6. Complete sale
7. Green success animation
8. Stats update immediately

#### UI/UX Assessment:
- **Strengths:**
  - Large touch targets (minimum 44px)
  - Visual quantity modal (big numbers)
  - Clear cart summary
  - Payment method selection prominent
  - Success animation provides positive feedback
  - Stats bar shows real-time performance

- **Weaknesses:**
  - Product catalog is hardcoded (should load from API)
  - No barcode/QR scanning support
  - No customer loyalty/rewards integration
  - No split payment support
  - No discount/coupon entry
  - No cash drawer tracking

### 2.3 marketing-command-center.html (Market Day Scheduler)

**Location:** `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/marketing-command-center.html`
**Section:** Campaigns tab, "Market Day Quick Schedule"

#### Features Present:
| Feature | Status | Notes |
|---------|--------|-------|
| Market Selector | Present | Dropdown with 4 markets |
| Auto-Schedule Button | Present | Schedules reminder posts |
| Markets Listed | Static | Sewickley, Lawrenceville, Bloomfield, Bryant Street |

#### Integration Notes:
- Market reminders auto-generate social media posts
- Uses market schedule to time posts appropriately
- Could be connected to farmers-market.html for unified scheduling

---

## 3. Backend Audit

### 3.1 API Endpoints

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `initMarketModule` | Initialize sheets/data | Present |
| `createMarketSession` | Create new market session | Present |
| `getMarketSession` | Get session details | Present |
| `getUpcomingMarkets` | List upcoming markets (14 days) | Present |
| `updateMarketSessionStatus` | Update session status | Present |
| `getMarketDashboard` | Dashboard data + stats | Present |
| `calculateDemandPrediction` | AI demand forecasting | Present |
| `getActiveMarketLocations` | List market locations | Present |
| `generateMarketHarvestPlan` | Create harvest plan for session | Present |
| `recordMarketSale` | Record POS transaction | Present |
| `recordQuickSale` | Quick sale entry | Present |
| `getMarketInventoryStatus` | Inventory + alerts | Present |
| `initiateSettlement` | Start end-of-day settlement | Present |
| `completeSettlement` | Finalize settlement | Present |
| `getMarketPerformanceAnalytics` | Performance metrics | Present |
| `getMarketMorningBrief` | Morning brief data | Present |
| `syncMarketToPickPack` | Sync harvest plan to pick/pack | Present |
| `syncShopifyMarketSales` | Import Shopify POS orders | Present |
| `getShopifyMarketReport` | Shopify market report | Present |

### 3.2 Data Storage (Google Sheets)

| Sheet | Purpose | Columns (Expected) |
|-------|---------|-------------------|
| `MARKET_SESSIONS` | Session tracking | Date, Location, Status, Projected Revenue, Actual Revenue, Sell-through |
| `SALES_MarketSales` | Transaction log | Session_ID, Timestamp, Items, Total, Payment_Method |
| `SALES_MarketItems` | Product catalog | Item_ID, Item_Name, Variety, Price, Unit, Is_Active |
| `MARKET_LOCATIONS` | Location config | Location_ID, Name, Day, Start_Time, End_Time, Address |

### 3.3 Configuration Constants

The system has hardcoded market schedules in MERGED TOTAL.js:

```javascript
FARMERS_MARKETS: {
  TUESDAY: {
    name: 'Lawrenceville',
    location: 'Lawrenceville Farmers Market',
    time: '4:00 PM - 7:00 PM'
  },
  SATURDAY: [
    { name: 'Sewickley', location: 'Sewickley Farmers Market', time: '9:00 AM - 1:00 PM' },
    { name: 'Bloomfield', location: 'Bloomfield Saturday Market', time: '9:00 AM - 2:00 PM' }
  ],
  SUNDAY: {
    name: 'Squirrel Hill',
    location: 'Squirrel Hill Farmers Market',
    time: '10:00 AM - 2:00 PM'
  }
}
```

### 3.4 Integrations

| Integration | Type | Status |
|-------------|------|--------|
| Shopify POS | API sync | Working (syncShopifyMarketSales) |
| Weather API | Forecast | Working (via getUpcomingMarkets) |
| Pick/Pack System | Internal | Working (syncMarketToPickPack) |
| Weekly Cycle | Internal | Working (getWeeklyCycleOverview) |
| Morning Brief | Internal | Working (getMarketMorningBrief) |
| Sales Reports | Internal | Working (getSalesSummaryReport) |

---

## 4. Functionality Audit

### 4.1 Schedule Management

| Feature | Status | Notes |
|---------|--------|-------|
| View upcoming markets | Working | 14-day lookahead |
| Create market sessions | Working | Manual per-market |
| Session status tracking | Working | Planning, Harvesting, Packed, At Market, Complete |
| Recurring schedule | Partial | Hardcoded in JS, not configurable |
| Holiday/exception handling | Missing | No way to mark market cancelled |
| Time zone support | Working | Uses local time |

### 4.2 Inventory Tracking

| Feature | Status | Notes |
|---------|--------|-------|
| Product catalog | Partial | Hardcoded defaults, API for dynamic |
| Quantity tracking | Working | Per-session inventory |
| Low stock alerts | Working | Threshold-based |
| Sold out tracking | Working | Real-time updates |
| Inventory sync to harvest | Working | Via generateMarketHarvestPlan |
| Return tracking | Working | In settlement flow |

### 4.3 Sales Tracking

| Feature | Status | Notes |
|---------|--------|-------|
| POS sales entry | Working | Mobile-optimized |
| Shopify POS sync | Working | Time-window based |
| Payment methods | Working | Cash, Card, Venmo, SNAP |
| Transaction logging | Working | All sales recorded |
| Real-time stats | Working | Updates after each sale |
| Split payments | Missing | Single payment per transaction |

### 4.4 Staff Assignment

| Feature | Status | Notes |
|---------|--------|-------|
| Staff scheduling | Missing | No UI for assigning staff to markets |
| Attendance tracking | Missing | No check-in/check-out |
| Role management | Partial | Auth system exists, not market-specific |

### 4.5 Location Management

| Feature | Status | Notes |
|---------|--------|-------|
| Add/edit locations | Missing | No UI, hardcoded in JS |
| Location details | Partial | Name, day, time in config |
| Address/GPS | Missing | Could add for navigation |
| Market fees | Missing | Not stored per-location |
| Contact info | Missing | Market manager contacts |

### 4.6 Weather Integration

| Feature | Status | Notes |
|---------|--------|-------|
| Forecast display | Working | Hi/Lo temp, conditions |
| Weather icons | Working | Clear, cloudy, rain, snow, etc. |
| Impact rating | Working | Excellent, Good, Fair, Poor |
| Rain probability | Working | Used for alerts |
| Demand adjustment | Present | In harvest plan generation |

### 4.7 Revenue Tracking

| Feature | Status | Notes |
|---------|--------|-------|
| Session revenue | Working | Actual vs predicted |
| Payment method breakdown | Partial | Tracked but not displayed |
| Fee calculation | Working | In settlement (market fee, card processing) |
| Sell-through rate | Working | Items sold / items brought |
| Prediction accuracy | Working | Actual / predicted percentage |
| Year-over-year | Working | In getSalesSummaryReport |

---

## 5. Data Flows

### 5.1 Market Session Lifecycle

```
1. SCHEDULE GENERATION (weekly/automatic)
   └── getUpcomingMarkets() reads from FARMERS_MARKETS config
       └── Generates next 14 days of market dates
       └── Fetches weather for each date
       └── Returns market list with weather + status

2. SESSION CREATION
   └── createMarketSession(locationId, date)
       └── Creates row in MARKET_SESSIONS sheet
       └── Returns sessionId
       └── Triggers generateMarketHarvestPlan()

3. HARVEST PLANNING
   └── generateMarketHarvestPlan(sessionId)
       └── Gets session details
       └── Calculates demand prediction
       └── Gets field inventory
       └── Returns prioritized harvest list

4. AT MARKET (Day of)
   └── recordMarketSale(sessionId, items, paymentMethod)
       └── Logs transaction to SALES_MarketSales
       └── Updates session stats
       └── Returns success
   └── syncShopifyMarketSales(sessionId)
       └── Fetches Shopify POS orders in time window
       └── Matches to session
       └── Imports as transactions

5. SETTLEMENT
   └── initiateSettlement(sessionId)
       └── Calculates gross sales
       └── Calculates fees (market fee, card processing)
       └── Calculates net revenue
       └── Calculates inventory metrics
   └── completeSettlement(sessionId, cashData)
       └── Finalizes session
       └── Updates status to "Complete"
       └── Archives for reporting

6. ANALYTICS
   └── getMarketPerformanceAnalytics(dateRange)
       └── Aggregates session data
       └── Calculates trends
       └── Returns performance metrics
```

### 5.2 Weekly Cycle Integration

The farmers market system integrates with the unified weekly cycle:

```
Weekly Cycle Overview
├── CSA Orders (for week)
├── Wholesale Orders (for week)
└── FARMERS MARKET SESSIONS (for week)
    └── Feeds into:
        ├── getAggregatedDemand() - total harvest needs
        ├── getWeeklyHarvestPlan() - when to harvest what
        └── getWeeklyDeliverySchedule() - market days in schedule
```

---

## 6. Strengths

1. **Comprehensive Dashboard** - Full overview of upcoming markets, weather, stats
2. **Mobile-First POS** - Touch-optimized sales entry for market use
3. **Weather Integration** - Weather impacts displayed and factored into planning
4. **Shopify POS Sync** - Automatic import of sales from Shopify POS
5. **Harvest Planning** - AI-assisted harvest recommendations
6. **Settlement Workflow** - End-of-day reconciliation with fee calculation
7. **Performance Tracking** - Prediction accuracy and sell-through metrics
8. **Weekly Cycle Integration** - Markets feed into unified farm planning
9. **Alert System** - Proactive notifications for session creation and weather
10. **Status Tracking** - Clear workflow from planning to complete

---

## 7. Weaknesses / Missing Functionality

### Critical Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| Location management UI | Cannot add new markets without code changes | HIGH |
| Product catalog from API | Hardcoded products limit flexibility | HIGH |
| Staff assignment | No visibility into who's working each market | MEDIUM |

### Feature Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| Market cancellation handling | No way to mark cancelled due to weather/holiday | HIGH |
| Split payments | Cannot split between cash and card | MEDIUM |
| Customer loyalty | No frequent buyer tracking | MEDIUM |
| Cash drawer tracking | Start/end cash not managed | MEDIUM |
| Barcode scanning | Manual product entry only | LOW |
| Offline mode | Cannot function without internet | MEDIUM |
| Discount/coupon support | No promotional pricing | LOW |
| Market fee configuration | Fees hardcoded, not per-location | MEDIUM |
| Photo documentation | No booth setup photos | LOW |

### UX Improvements Needed

| Issue | Impact | Priority |
|-------|--------|----------|
| Settlement uses alert() dialogs | Poor UX, no formatting | HIGH |
| Analytics uses alert() | Should be dedicated view | HIGH |
| No bulk session creation | Must create each week manually | MEDIUM |
| No print-friendly views | Harvest plan printable but others not | LOW |

---

## 8. Recommendations

### Immediate (Week 1)

1. **Replace alert() dialogs with modals** in farmers-market.html
   - Settlement should show detailed breakdown in styled modal
   - Analytics should be a dedicated section/tab

2. **Create MARKET_LOCATIONS sheet** if not exists
   - Allow runtime configuration of markets
   - Include: name, address, day, hours, fee structure

3. **Load products from API** in market-sales.html
   - Replace hardcoded defaultProducts array
   - Add getMarketProducts endpoint if not exists

### Short-term (Month 1)

4. **Add staff assignment feature**
   - Create MARKET_STAFF_ASSIGNMENTS sheet
   - UI to assign employees to markets
   - Show assigned staff on dashboard

5. **Add market cancellation workflow**
   - Cancel button on upcoming markets
   - Reason tracking (weather, holiday, etc.)
   - Notification system for planned markets

6. **Enhance settlement modal**
   - Full-screen modal with sections
   - Cash reconciliation interface
   - Print receipt option

### Medium-term (Quarter 1)

7. **Add offline mode (PWA)**
   - Cache product catalog
   - Queue sales transactions
   - Sync when connection restored

8. **Add customer loyalty**
   - Track market customers
   - Reward frequent buyers
   - Send market day reminders

9. **Add photo documentation**
   - Booth setup photos
   - Product display photos
   - Attach to session record

---

## 9. Files Reference

| File | Path | Purpose |
|------|------|---------|
| Main Dashboard | `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/farmers-market.html` | Dashboard and planning |
| Mobile POS | `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/market-sales.html` | Point of sale |
| Marketing Center | `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/marketing-command-center.html` | Market day scheduling |
| Backend | `/Users/samanthapollack/Documents/TIny_Seed_OS/apps_script/MERGED TOTAL.js` | All API endpoints |
| API Config | `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/api-config.js` | API URL configuration |
| Auth Guard | `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/auth-guard.js` | Authentication |

---

## 10. Summary

The Farmers Market System is a well-designed, functional module with:
- **18+ API endpoints** covering full market lifecycle
- **2 dedicated frontend pages** (dashboard + mobile POS)
- **Integration** with weather, Shopify, weekly planning
- **Complete workflow** from scheduling to settlement

**Primary gaps** are:
1. Location management UI (markets hardcoded)
2. Staff assignment functionality
3. Market cancellation handling
4. UX improvements (replace alert() dialogs)

The system is **production-ready** for current operations with 4 fixed markets. Enhancements needed primarily for scalability and edge cases.

---

*Audit completed: 2026-02-12*
*Next recommended audit: After location management and staff features added*
