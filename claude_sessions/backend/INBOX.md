# INBOX: Backend Claude
## From: PM_Architect

**Updated:** 2026-01-22
**PRIORITY:** HIGH - EMPLOYEE INVITE SYSTEM

---

## 🚨 CRITICAL: MERGE + FIX + REDEPLOY - 2026-01-22 EVENING

**From:** PM_Architect
**Priority:** CRITICAL - SYSTEM BROKEN
**Deadline:** IMMEDIATE

### PROBLEM
Full system audit completed. Found CRITICAL issues preventing system from working.

### TASK 1: MERGE SmartLaborIntelligence.js (BLOCKING)

The file `apps_script/SmartLaborIntelligence.js` (1,483 lines) was created but **NEVER MERGED** into MERGED TOTAL.js.

**These functions exist in SmartLaborIntelligence.js but are NOT deployed:**
- `initializeSmartLaborSheets()`
- `getBenchmark()` / `setBenchmark()`
- `generateDailyPrescription()`
- `getMyWorkOrder()`
- `checkInTask()` / `checkOutTask()`
- `getLaborAlerts()`
- `getEmployeeEfficiencyTrend()`
- `getLaborIntelligenceDashboard()`
- `getEmployeeMessages()` / `markMessageRead()`

**FIX:** Copy all functions from SmartLaborIntelligence.js into MERGED TOTAL.js (before the doGet function).

### TASK 2: FIX 13 BROKEN ENDPOINTS

Desktop audit found these broken API calls:

| File | Broken Call | Fix |
|------|-------------|-----|
| customer.html | `getRetailProducts` | Add route OR change to `getWholesaleProducts` |
| customer.html | `sendMagicLink` | Change call to `sendCustomerMagicLink` |
| csa.html | `getRecentSocialPosts` | Add route to backend |
| csa.html | `submitCSADispute` | Add route to backend |
| food-safety.html | `logComplianceEntry` (x4) | Use specific compliance functions |
| index.html | `getProductCatalog` | Change to `getWholesaleProducts` |
| index.html | `getCustomers` | Change to `getSalesCustomers` |
| marketing-command-center.html | `postToAppFeed` | Add route or remove feature |
| quickbooks-dashboard.html | `saveQuickBooksCredentials` | Add route to backend |
| admin.html | `configureClaudeAPI` | Add route to backend |

**FIX:** Add missing routes to MERGED TOTAL.js doGet switch statement.

### TASK 3: REDEPLOY

After merging and fixing:
```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS/apps_script
PATH="/opt/homebrew/bin:$PATH" clasp push
PATH="/opt/homebrew/bin:$PATH" clasp deploy -i "AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp" -d "v202: Merge SmartLabor + Fix broken endpoints"
```

### TASK 4: UPDATE DOCUMENTATION

After deployment, update:
- `claude_sessions/backend/OUTBOX.md` with completion status
- `claude_sessions/SYSTEM_STATUS.md` (create if needed) with live system state

### AUDIT REPORTS FOR REFERENCE
- Desktop: `claude_sessions/DESKTOP_AUDIT_REPORT.md`
- Mobile: `claude_sessions/MOBILE_AUDIT_REPORT.md`

**THIS IS BLOCKING THE ENTIRE SYSTEM. FIX IMMEDIATELY.**

---

## 🆕 NEW FEATURE: CHIEF OF STAFF COMMUNICATIONS - 2026-01-22

**From:** PM_Architect + Owner
**Priority:** HIGH
**Spec:** `claude_sessions/CHIEF_OF_STAFF_COMMUNICATIONS_SPEC.md`

### OWNER REQUEST
"I want to be able to tell the chief of staff to text someone or email someone, and it does it. I can give an overview of what I want to say and it calls, texts, or emails them. I want to be able to have alerts go out to the team for lunch or all hands tasks etc."

### YOUR TASK: BUILD BACKEND MODULE

Create `apps_script/ChiefOfStaffCommunications.js` with:

1. **getTeamContacts()** - Get all employees with phone/email
2. **draftMessage(params)** - AI-assisted message drafting
3. **sendSMS(params)** - Send SMS via Twilio
4. **sendOwnerEmail(params)** - Send email via Gmail
5. **sendTeamAlert(params)** - Broadcast to all team members
6. **getCommunicationHistory(limit)** - Get outbound message log

### API ROUTES TO ADD

```javascript
case 'getTeamContacts':
case 'draftMessage':
case 'sendSMS':
case 'sendOwnerEmail':
case 'sendTeamAlert':
case 'getCommunicationHistory':
```

### FULL SPEC
Read: `claude_sessions/CHIEF_OF_STAFF_COMMUNICATIONS_SPEC.md`

---



## NEW TASK: Employee Invitation System

**Owner Request:** Add invite functionality for employees AND wholesale customers from the dashboard.

### Employee Invite API Endpoints

Add to `MERGED TOTAL.js`:

```javascript
case 'inviteEmployee':
  // Creates employee account + sends magic link
  // Params: { name, email, phone, role, permissions }
  return jsonResponse(inviteEmployee(data));

case 'sendEmployeeMagicLink':
  // Resend login link to existing employee
  return jsonResponse(sendEmployeeMagicLink(e.parameter.employeeId));

case 'verifyEmployeeToken':
  // Validate magic link token for employee login
  return jsonResponse(verifyEmployeeToken(e.parameter.token));
```

### Employee Invitation Email Content

The email should include:
1. Welcome message with farm branding
2. Magic link to activate account
3. **Desktop Instructions:**
   - "To add a desktop shortcut: Right-click on your desktop → New → Shortcut → Enter URL: https://toddismyname21.github.io/tiny-seed-os/employee.html"
4. **Mobile Instructions:**
   - iPhone: "Open Safari → Go to [URL] → Tap Share → Add to Home Screen"
   - Android: "Open Chrome → Go to [URL] → Tap menu (⋮) → Add to Home Screen"

### Employee Data Model

Ensure `REF_Employees` or `EMPLOYEES` sheet has:
```
| Employee_ID | Name | Email | Phone | Role | PIN |
| Magic_Token | Token_Expires | Status | Permissions |
| Hire_Date | Emergency_Contact | Notes |
```

### Deployment

After building:
```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS/apps_script
clasp push
clasp deploy -i "AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc" -d "Employee invite system"
```

---

## PREVIOUS MISSION: SMART INVENTORY + FIELD PLAN INTEGRATION

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

## TASK 6: Chef Invitation System (FROM SALES CLAUDE)

Sales Claude is busy. YOU handle chef invitations.

### Invitation API Endpoints:
```javascript
case 'inviteChef':
  // Creates account + sends magic link
case 'sendChefMagicLink':
  // Sends login email to existing chef
case 'verifyChefToken':
  // Validates magic link token
case 'bulkInviteChefs':
  // Invite multiple chefs at once
```

### Invitation Email:
Create `/apps_script/emails/ChefInvitation.html`:
```
Subject: You're Invited - Order Fresh from Tiny Seed Farm

Hi [Chef Name],

You've been invited to order fresh, organic produce directly from Tiny Seed Farm.

🌱 See what's fresh this week
📱 Order from your phone in seconds
🚚 Reliable delivery to your kitchen

[BUTTON: Start Ordering →]
```

### SMS Invitation (Twilio):
"Hi [Name]! Order fresh produce from Tiny Seed Farm: [link] -Todd"

### Chef Data Sheet:
Ensure `WHOLESALE_CUSTOMERS` sheet exists with columns:
Customer_ID, Company_Name, Contact_Name, Email, Phone, Address, City, State, Zip, Magic_Token, Token_Expires, SMS_Opted_In, Email_Opted_In, Status

---

## PREVIOUS TASKS (Lower Priority)

### Code Cleanup (completed before this)
- Remove duplicate getMorningBrief functions
- Optimize getPlanning endpoint
- Fix dashboard revenue display

---

*See UNIVERSAL_ACCESS.md for deployment instructions*
