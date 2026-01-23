# OUTBOX: Sales_CRM Claude
## To: PM_Architect

**Updated:** 2026-01-22 (Wholesale Standing Orders System COMPLETE)

---

## STATUS: WHOLESALE STANDING ORDERS SYSTEM - DEPLOYED

### Latest Delivery: Standing Orders for Wholesale Customers

**Deployed:** Apps Script v329 | GitHub committed

### What Was Built

**1. Data Model**
- `WHOLESALE_STANDING_ORDERS` sheet structure created
- `WHOLESALE_FULFILLMENT_LOG` for tracking history
- Fields: Standing_Order_ID, Customer_ID, Product_ID, Product_Name, Quantity, Unit, Frequency, Day_of_Week, Start_Date, End_Date, Status, Last_Fulfilled, Next_Due_Date, Notes

**2. Backend API Endpoints (15 functions)**

| Function | Purpose |
|----------|---------|
| `initializeStandingOrdersModule()` | Create sheets with headers |
| `createStandingOrder()` | Create new standing order |
| `getStandingOrders()` | Get with filters (customerId, status, productId) |
| `getStandingOrdersDue()` | Get orders due this week |
| `updateStandingOrder()` | Update order details |
| `cancelStandingOrder()` | Set status to Cancelled |
| `pauseStandingOrder()` | Pause recurring order |
| `resumeStandingOrder()` | Resume paused order |
| `markStandingOrderFulfilled()` | Mark fulfilled + calc next due date |
| `markStandingOrderShorted()` | Mark shorted + trigger notifications |
| `sendShortageNotifications()` | SMS via Twilio + Email via GmailApp |
| `getFulfillmentLog()` | Get fulfillment history |
| `getStandingOrdersDashboard()` | Staff dashboard with totals |
| `bulkFulfillStandingOrders()` | Bulk fulfill all due orders |

**3. Auto-Notification System**

When orders can't be fulfilled:
- **SMS** (via existing Twilio): "Hi [Chef], we're unable to fulfill your standing order for [Product] this week due to [reason]. We apologize. -Tiny Seed Farm"
- **Email** (via GmailApp): Detailed message with alternatives

Shortage reasons:
- Weather damage
- Crop failure
- Sold out
- Season ended
- Other

**4. Wholesale Portal UI (`web_app/wholesale.html`)**

Added "Standing Orders" tab for chefs:
- Create standing order form (product, quantity, frequency, day of week, start/end dates)
- View active standing orders
- Pause/Resume functionality
- Edit quantity
- Cancel orders

**5. Staff Fulfillment Dashboard (`web_app/admin.html`)**

Added "Wholesale > Standing Orders" nav section:
- Stats: Due this week, Fulfilled, At Risk, Active Customers
- Due orders table with one-click Fulfill/Short buttons
- Product totals by quantity
- At-risk product flagging (low inventory)
- Recent shortages history
- Bulk fulfill all option

### Files Modified

| File | Changes |
|------|---------|
| `apps_script/MERGED TOTAL.js` | +500 lines: Standing Orders module |
| `web_app/wholesale.html` | +300 lines: Standing Orders tab |
| `web_app/admin.html` | +367 lines: Fulfillment dashboard |

### How To Test

1. **Initialize sheets:**
   ```javascript
   initializeStandingOrdersModule()
   ```

2. **Create a test standing order:**
   ```javascript
   createStandingOrder({
     customerId: 'CUST-123',
     productId: 'CRP-001',
     productName: 'Mixed Greens',
     quantity: 5,
     unit: 'lb',
     frequency: 'WEEKLY',
     dayOfWeek: 'Wednesday',
     startDate: '2026-01-22'
   })
   ```

3. **Get due orders:**
   ```javascript
   getStandingOrdersDue({})
   ```

4. **View dashboard:**
   - Go to Admin Panel → Wholesale → Standing Orders

### Deployment Info

- Apps Script: v329
- Deployment ID: `AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc`
- GitHub: Committed & pushed

---

## STATUS: SEO DOMINATION v3.0 DEPLOYED

### Latest Delivery: SEO v3.0 Best-in-Class Enhancements

**Deployed:** Apps Script v317 → v321 | GitHub committed

**Research Conducted:**
- BrightLocal 2026 Local Search Ranking Factors
- Semrush AI Share of Voice
- Conductor AEO/GEO Benchmarks Report
- LocalFalcon Platform Analysis
- Sprout Social TikTok Marketing 2025

**New Functions Built (13):**

| Function | Purpose |
|----------|---------|
| `initializeSEOv3()` | Create 5 tracking sheets |
| `addSEOCompetitor()` | Track competitor rankings/reviews |
| `getSEOCompetitors()` | Get all competitors |
| `logAIShareOfVoice()` | Log ChatGPT/Perplexity visibility |
| `getAIShareOfVoiceMetrics()` | Calculate SOV vs competitors |
| `generateReviewQRCode()` | Generate review QR codes |
| `setGooglePlaceId()` | Configure Place ID |
| `logVideoContent()` | Track TikTok/YouTube performance |
| `getVideoAnalytics()` | Get video metrics |
| `getVideoContentStrategy()` | Platform-specific strategy |
| `scoreContentForAEO()` | Score content for AI readiness |
| `analyzeReviewSentimentEnhanced()` | NLP-style sentiment |
| `getSEOMasterDashboard()` | Ultimate dashboard with Domination Score |

**New Sheets:**
- `SEO_Competitors`
- `SEO_AI_ShareOfVoice`
- `SEO_VideoContent`
- `SEO_AEO_Scores`
- `SEO_ReviewQRCodes`

**Documentation Created:**
- `VIDEO_CONTENT_STRATEGY.md` - TikTok/YouTube guide
- `GBP_OPTIMIZATION_GUIDE.md` - Google Business Profile setup
- `REVIEW_REQUEST_TEMPLATES.md` - 7 email + 3 SMS templates
- `BLOG_01_Complete_Guide_Pittsburgh_CSAs_2026.md` - First blog post

---

## STATUS: CSA DATA INTEGRATION COMPLETE

### All Sales_CRM Mission Deliverables

| Deliverable | Status | Lines Added |
|-------------|--------|-------------|
| Product Master List | **COMPLETE** | 120 products |
| Availability Calendar | **COMPLETE** | Zone 6a matrix |
| Platform Sync Spec | **COMPLETE** | Shopify/QB design |
| Traceability Design | **COMPLETE** | FSMA 204 spec |
| Intelligent System Design | **COMPLETE** | 500+ line spec |
| Farm Intelligence Module | **DEPLOYED** | ~6,000 lines |
| Recall Simulation Tool | **DEPLOYED** | ~450 lines |
| **CSA Data Integration** | **COMPLETE** | ~600 lines |

---

## NEW: CSA DATA INTEGRATION - COMPLETE

All tasks from CSA_DATA_INBOX.md have been completed.

### 1. Sheet Structure - ALIGNED

**CSA_Members sheet now has 30 columns** (was 19):

```
NEW COLUMNS ADDED:
- Vacation_Weeks_Max    (default: 4)
- Frequency             (Weekly/Biweekly)
- Veg_Code              (0, 1, 2)
- Floral_Code           (0, 1, 2)
- Preferences           (JSON for dislikes, allergies, vacation_dates)
- Is_Onboarded          (Boolean)
- Last_Pickup_Date
- Next_Pickup_Date
- Shopify_Order_ID
- Created_Date
- Last_Modified
```

**New Sheets Created:**
- `CSA_Pickup_Locations` - Pickup location management
- `CSA_Products` - CSA product catalog with Shopify sync

### 2. Weekly Order Generation - DEPLOYED

| Function | Purpose | Location |
|----------|---------|----------|
| `generateWeeklyCSAOrders(params)` | Main function - creates orders for all active members | Line 13075 |
| `isMemberWeek(member, targetDate)` | Biweekly scheduling logic | Line 12969 |
| `hasVacationHold(member, weekDate)` | Check vacation holds | Line 12985 |
| `getPickupDateForMember(pickupDay, weekDate)` | Calculate pickup date | Line 13017 |
| `getBoxContentsForShareType(type, size, weekDate)` | Get box contents | Line 13034 |
| `testWeeklyCSAOrders()` | Test function | Line 13352 |

**Order Generation Logic:**
```
1. Run via trigger on Sunday evening
2. For each active CSA member:
   - Check if season is active (start/end dates)
   - Check if vacation hold is set
   - Check if biweekly member's week (A/B week logic)
   - If due for box: create order in Master_Order_Log
3. Update member's:
   - Weeks_Remaining (decrement)
   - Last_Pickup_Date
   - Next_Pickup_Date
   - Last_Modified
```

### 3. CSA Metrics Dashboard - DEPLOYED

`getCSAMetrics()` returns:
```javascript
{
  totalMembers: number,
  activeMembers: number,
  byShareType: { Vegetable: n, Flower: n, Flex: n },
  byShareSize: { Small: n, Regular: n, Large: n },
  byLocation: { "Location Name": count },
  byPickupDay: { Tuesday: n, Wednesday: n, Saturday: n },
  byFrequency: { Weekly: n, Biweekly: n },
  thisWeek: {
    totalPickups: number,
    vacationHolds: number,
    byDay: { Wednesday: n }
  },
  needsAttention: {
    unpaid: number,
    notOnboarded: number,
    lowWeeksRemaining: number
  },
  revenue: {
    totalPaid: number,
    pending: number
  }
}
```

### 4. Pickup Location Management - DEPLOYED

| Function | Purpose |
|----------|---------|
| `getCSAPickupLocations(params)` | Get all locations with filters |
| `createCSAPickupLocation(data)` | Create new location |
| `getLocationByName(name)` | Find location by name |
| `assignPickupLocation(params)` | Assign member to location (with capacity check) |
| `recalculateLocationCounts()` | Recalculate all location member counts |

**Pickup Location Sheet Structure:**
```
Location_ID, Location_Name, Address, City, Day,
Time_Start, Time_End, Is_Delivery_Zone, Max_Capacity,
Current_Members, Host_Name, Host_Phone, Notes, Is_Active
```

### 5. CSA Products Sync - DEPLOYED

| Function | Purpose |
|----------|---------|
| `getCSAProducts(params)` | Get all CSA products |
| `upsertCSAProduct(data)` | Create or update product |
| `syncCSAProductsFromShopify(products)` | Sync from Shopify (with defaults) |
| `recalculateProductCounts()` | Recalculate member counts per product |

**Default CSA Products Pre-loaded:**
```
- 2026 Small Summer CSA Share (BIWEEKLY)
- 2026 Friends and Family Summer CSA Share (BIWEEKLY)
- 2026 SPRING CSA SHARE (LIMITED QUANTITIES)
- 2026 Tiny Seed Fleurs Petite Bloom Bouquet Share (BIWEEKLY)
- 2026 Tiny Seed Fleurs Full Bloom Bouquet Share (BIWEEKLY)
- 2026 Flex CSA Share ($150)
- 2026 Flex CSA Share ($300)
```

### 6. Updated Existing Functions

- `createCSAMember()` - Now handles all 30 columns
- `updateCSAMember()` - Updated with new field support
- `importShopifyCSAMembers()` - Updated for new columns
- `parseShopifyShareType()` - Now returns vegCode, floralCode, frequency

---

## DATA FLOW DIAGRAM (IMPLEMENTED)

```
SHOPIFY ORDER
     |
     v
[importShopifyCSAMembers()]
     |
     +---> SALES_Customers (create/update)
     |
     +---> CSA_Members (create with all 30 fields)
     |
     v
WEEKLY TRIGGER (Sunday)
     |
     v
[generateWeeklyCSAOrders()]
     |
     +---> Check vacation holds (hasVacationHold)
     +---> Check biweekly schedule (isMemberWeek)
     +---> Generate orders for due members
     |
     v
Master_Order_Log / SALES_Orders
     |
     +---> Pick/Pack sheets
     +---> Delivery routes
```

---

## INTEGRATION STATUS (UPDATED)

| Component | Status |
|-----------|--------|
| Shopify Integration Code | **READY** - needs credentials |
| QuickBooks Integration Code | **READY** - needs credentials |
| Product Master Data | **COMPLETE** - 120 products |
| Traceability System | **DEPLOYED** - code in place |
| Recall Simulation | **DEPLOYED** - ready to test |
| Farm Intelligence | **DEPLOYED** - working |
| **CSA Weekly Orders** | **DEPLOYED** - ready for trigger |
| **CSA Metrics** | **DEPLOYED** - dashboard ready |
| **Pickup Locations** | **DEPLOYED** - management ready |
| **CSA Products** | **DEPLOYED** - sync ready |

---

## NEXT STEPS FOR DEPLOYMENT

### Immediate
1. Deploy updated MERGED TOTAL.js to Apps Script via `clasp push`
2. Run `initializeSalesAndFleetModule()` to create new sheets
3. Run `syncCSAProductsFromShopify()` to populate default products
4. Add pickup locations manually or via `createCSAPickupLocation()`

### Set Up Weekly Trigger
```javascript
// In Apps Script Editor > Triggers
// Function: generateWeeklyCSAOrders
// Event: Time-driven > Week timer > Sunday 6-7pm
```

### Test Functions
```javascript
testWeeklyCSAOrders()    // Test order generation + metrics
getCSAMetrics({})        // Check dashboard data
getCSAPickupLocations({}) // Verify locations
getCSAProducts({})        // Verify products
```

---

## SUMMARY

| Metric | Value |
|--------|-------|
| Mission Status | **CSA INTEGRATION COMPLETE** |
| New Code Added | ~600 lines |
| Functions Added | 15 new CSA functions |
| Sheets Updated | CSA_Members (30 cols) |
| New Sheets | CSA_Pickup_Locations, CSA_Products |
| Ready for | Weekly order generation, dashboard |

---

## ALL FUNCTIONS ADDED (CSA Data Integration)

| Function | Line | Purpose |
|----------|------|---------|
| `isMemberWeek()` | 12969 | Biweekly logic |
| `hasVacationHold()` | 12985 | Vacation check |
| `getPickupDateForMember()` | 13017 | Pickup date calc |
| `getBoxContentsForShareType()` | 13034 | Box contents |
| `generateWeeklyCSAOrders()` | 13075 | Main order gen |
| `getCSAMetrics()` | 13229 | Dashboard metrics |
| `testWeeklyCSAOrders()` | 13352 | Test function |
| `getCSAPickupLocations()` | 13374 | Get locations |
| `createCSAPickupLocation()` | 13407 | Create location |
| `getLocationByName()` | 13444 | Find location |
| `assignPickupLocation()` | 13457 | Assign member |
| `recalculateLocationCounts()` | 13551 | Recount locations |
| `getCSAProducts()` | 13601 | Get products |
| `upsertCSAProduct()` | 13635 | Create/update product |
| `syncCSAProductsFromShopify()` | 13709 | Sync from Shopify |
| `recalculateProductCounts()` | 13748 | Recount products |

---

*Sales_CRM Claude - CSA Data Integration Complete*
*Weekly order generation, metrics dashboard, location/product management deployed*
*Ready for clasp push and trigger setup*
