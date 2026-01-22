# INBOX: Backend Claude
## From: PM_Architect

**Updated:** 2026-01-22
**PRIORITY:** CRITICAL - CHEF ORDERING SYSTEM - END OF DAY DEADLINE

---

## MISSION: SMART INVENTORY + FIELD PLAN INTEGRATION

**Owner Directive:** "I WANT IT TO BE SO SMART THAT IT KNOWS WHAT I SHOULD DO BEFORE ME."

Build the backend that connects field plans to chef ordering with REAL-TIME availability.

---

## TASK 1: Real-Time Availability Engine

Create `/apps_script/SmartAvailability.js`:

### Data Sources to Connect:
- `PLANNING_2026` - What's planted, where, when
- `REF_Beds` - Bed status and current crops
- `REF_Crops` - DTM, harvest windows, yields
- `HARVEST_LOG` - What's been harvested (reduces availability)
- `WHOLESALE_ORDERS` - What's already committed

### Functions to Build:

```javascript
/**
 * Get real-time availability for all products
 * Considers: planted, growing, ready, harvested, committed
 */
function getRealtimeAvailability() {
  // Returns: { product, available_now, available_this_week, available_next_week, forecast_4_weeks }
}

/**
 * Get availability forecast for a specific product
 * Uses DTM + planting dates + weather adjustments
 */
function getProductForecast(productId, weeksAhead) {
  // Returns: [{ week, projected_quantity, confidence }]
}

/**
 * Check if an order can be fulfilled
 * Considers standing orders, existing commitments
 */
function canFulfillOrder(items) {
  // Returns: { canFulfill: true/false, shortages: [], alternatives: [] }
}

/**
 * Smart allocation when demand exceeds supply
 * Priority: Standing orders > Loyalty tier > First-come
 */
function allocateAvailability(product, totalAvailable, orders) {
  // Returns allocation per order
}

/**
 * What should the farmer do today?
 * AI-driven recommendations based on inventory state
 */
function getSmartRecommendations() {
  // Returns: ["Harvest tomatoes - 3 chefs waiting", "Plant lettuce - demand spike in 2 weeks"]
}
```

---

## TASK 2: Chef Data Model

Ensure `WHOLESALE_CUSTOMERS` sheet has:

```
| Customer_ID | Company_Name | Contact_Name | Email | Phone |
| Address | City | State | Zip |
| Customer_Type | Price_Tier | Payment_Terms |
| Preferred_Contact | SMS_Opted_In | Email_Opted_In |
| First_Order_Date | Last_Order_Date | Total_Orders | Lifetime_Value |
| Favorite_Products | Order_History_JSON |
| Notes | Tags | Status |
```

---

## TASK 3: Communication Engine

Create `/apps_script/ChefCommunications.js`:

```javascript
/**
 * Send weekly availability to all opted-in chefs
 */
function sendWeeklyAvailabilityBlast() {
  // SMS: Short list of what's fresh
  // Email: Full availability with photos
}

/**
 * Notify chef of shortage on their standing order
 */
function notifyStandingOrderShortage(customerId, product, reason, alternatives) {
  // SMS + Email with substitution options
}

/**
 * Send "just harvested" alerts for premium products
 */
function sendFreshHarvestAlert(product, quantity) {
  // To chefs who have ordered this before
}

/**
 * Personalized recommendations based on order history
 */
function sendPersonalizedRecommendations(customerId) {
  // "Based on your orders, you might like..."
}
```

---

## TASK 4: API Endpoints

Add to `MERGED TOTAL.js`:

```javascript
// Availability
case 'getRealtimeAvailability':
case 'getProductForecast':
case 'getWeeklyAvailability':      // Formatted for chefs

// Chef Management
case 'getChefProfile':
case 'updateChefPreferences':
case 'getChefOrderHistory':
case 'getChefRecommendations':

// Smart Features
case 'getSmartRecommendations':    // For farmer dashboard
case 'canFulfillOrder':
case 'getFreshHarvests':           // Just picked today
```

---

## TASK 5: Triggers

```javascript
// Daily at 6 AM - Calculate today's availability
ScriptApp.newTrigger('calculateDailyAvailability').timeBased().atHour(6).everyDays(1).create();

// Monday at 7 AM - Send weekly availability to chefs
ScriptApp.newTrigger('sendWeeklyAvailabilityBlast').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).create();

// Every 15 min - Check for harvest logs that update availability
ScriptApp.newTrigger('syncHarvestToAvailability').timeBased().everyMinutes(15).create();
```

---

## DEPLOYMENT

```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS/apps_script
clasp push
clasp deploy -i "AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc" -d "Smart Availability Engine"
```

---

## SUCCESS CRITERIA

The system should be able to answer:
- "What can I sell to chefs THIS WEEK?" → Instant answer
- "Chef X wants 20 lb tomatoes, can we do it?" → Yes/No + alternatives
- "What should I harvest today?" → Priority list based on orders
- "When will lettuce be ready?" → Forecast with confidence

---

## REPORT TO OUTBOX.md WHEN:
1. SmartAvailability.js created
2. ChefCommunications.js created
3. API endpoints added
4. Triggers configured
5. Tested with real planning data

**DEADLINE: TODAY**

---

## PREVIOUS TASKS (Lower Priority)

### Code Cleanup (completed before this)
- Remove duplicate getMorningBrief functions
- Optimize getPlanning endpoint
- Fix dashboard revenue display

---

*See UNIVERSAL_ACCESS.md for deployment instructions*
