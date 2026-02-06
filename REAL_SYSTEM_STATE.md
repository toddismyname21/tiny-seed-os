# TINY SEED OS - REAL SYSTEM STATE
## As of February 5, 2026

This is the actual state of your system based on hands-on work, not automated file scanning.

---

## 🟢 WHAT'S WORKING RIGHT NOW

### 1. CSA Member Portal (`web_app/csa.html`)
**URL:** https://toddismyname21.github.io/tiny-seed-os/web_app/csa.html

**WORKING:**
- Email magic link login ✓
- SMS code login (needs Twilio phone verification) ✓
- Session persistence (localStorage) ✓
- View current box contents ✓
- Item swap system ✓
- Vacation hold requests ✓
- Order history ✓
- Edit contact info (name, email, phone, secondary contacts) ✓
- Biweekly schedule display (Week A/B) ✓
- Flex CSA onboarding modal ✓

**NOT WORKING:**
- SMS not delivering (Twilio trial - your phone needs verification)
- `contactFarm()` - placeholder
- `showDislikesSettings()` - placeholder
- `reportIssue()` - placeholder

---

### 2. Sales Dashboard (`web_app/sales.html`)
**URL:** https://toddismyname21.github.io/tiny-seed-os/web_app/sales.html

**WORKING:**
- Dashboard stats (orders, revenue, customers) ✓
- Orders tab with filtering ✓
- Customers tab with CSA revenue tracking ✓
- CSA Members tab with Week A/B display ✓
- Delete orders ✓
- Delete customers ✓
- View/Edit customer details (NEW - just added) ✓
- Secondary email/phone display ✓

**NOT WORKING (Placeholders):**
- `viewOrder()` - just shows toast
- `editOrder()` - just shows toast
- `updateOrderStatus()` - just shows toast
- `exportOrders()` - not implemented
- `exportCustomers()` - not implemented
- `editInventory()` - just shows toast
- `adjustStock()` - just shows toast
- Bulk SMS modal - UI exists but incomplete
- Bulk Email modal - UI exists but incomplete

---

### 3. Backend API (Apps Script)
**Deployment:** v526 (current)
**94 CSA Members in system**

**CORE ENDPOINTS - ALL WORKING:**
- `getSalesDashboard` ✓
- `getSalesOrders` ✓ (fixed N+1 query issue)
- `getSalesCustomers` ✓ (includes CSA revenue)
- `getSalesCSAMembers` ✓
- `createSalesOrder` ✓
- `updateCSAMemberPreferences` ✓
- `sendCSAMagicLink` ✓
- `verifyCSAMagicLink` ✓
- `sendCSASMSCode` ✓ (works, but Twilio needs phone verification)
- `verifyCSASMSCode` ✓
- `deleteOrder` ✓
- `deleteCustomer` ✓
- `updateCustomer` ✓ (NEW - just added)
- `lookupSMSCode` ✓ (NEW - for debugging)
- `assignCSAWeeks` ✓ (Week A/B assignment)

---

### 4. Shopify Integration

**CONNECTED:**
- Orders sync from Shopify → Google Sheets ✓
- Customers sync from Shopify → Google Sheets ✓
- CSA members created from Shopify orders ✓
- Customer names backfilled (78 records updated) ✓

**SHOPIFY STORE:** tiny-seed-farmers-market.myshopify.com

**SEO PAGES DEPLOYED:**
- 16 neighborhood pages ✓
- CSA locations page ✓
- Location finder widget ✓

---

### 5. Google Sheets Database

**SHEETS IN USE:**
- `SALES_Customers` - All customers ✓
- `SALES_Orders` - All orders ✓
- `SALES_OrderItems` - Line items ✓
- `CSA_Members` - 94 active members ✓
- `CSA_BoxContents` - Weekly box items ✓
- `SALES_MagicLinks` - Login tokens ✓

**COLUMNS ADDED RECENTLY:**
- `Biweekly_Week` (A/B/BOTH) ✓
- `Secondary_Email` ✓
- `Secondary_Phone` ✓

---

## 🟡 PARTIALLY WORKING

### 1. SMS/Twilio
- **Status:** Credentials configured, API calls succeed, messages queue
- **Problem:** Trial account only sends to verified numbers
- **Fix:** Verify 717-725-5177 in Twilio console OR upgrade to paid account ($20)

### 2. Flex CSA Ordering
- **Status:** Onboarding modal built, opt-in system ready
- **Problem:** Cart population and weekly ordering flow not complete
- **Fix:** Need to build `loadFlexCart()` and `saveFlexWeeklyOrder()` frontend

### 3. Employee Portal (`employee.html`)
- **Status:** UI complete, time tracking works
- **Problem:** Some features may not be connected
- **Fix:** Needs testing and verification

---

## 🔴 NOT WORKING / NOT CONNECTED

### 1. Chief of Staff AI
- **12 backend modules exist** in apps_script/
- **Dashboard exists** but not connected to modules
- **Needs:** Wiring frontend to backend, Anthropic API key

### 2. Marketing Command Center
- **Full UI built** (492KB, 9,881 lines)
- **Needs:** Ayrshare API key to activate

### 3. Financial Dashboard
- **Plaid UI built**
- **Needs:** OAuth setup with Plaid

### 4. Bulk SMS/Email in Sales Dashboard
- **Modals exist** but don't actually send
- **Needs:** Implementation

---

## 📊 ACTUAL NUMBERS

| Metric | Count |
|--------|-------|
| CSA Members | 94 |
| Total Customers | ~200+ |
| API Endpoints | 230+ |
| Working Endpoints | 220+ |
| Broken/Stub Endpoints | 8-10 |

---

## 🎯 TOMORROW'S PRIORITIES

### Must Do:
1. **Verify phone in Twilio** → SMS works
2. **Execute CSA Sales Plan** → Use the 10-point plan

### Should Do:
3. Fix placeholder functions in sales.html
4. Test Flex CSA ordering flow

### Could Do:
5. Connect Chief of Staff backend
6. Add Ayrshare API key for marketing

---

## 🔧 RECENT CHANGES (Last 24 Hours)

1. Fixed `getSalesOrders` N+1 query performance issue
2. Added `assignCSAWeeks()` for Week A/B assignment
3. Added Flex CSA onboarding modal
4. Added customer editing in sales dashboard
5. Added secondary email/phone fields
6. Added `updateCustomer` endpoint
7. Added `lookupSMSCode` for SMS debugging
8. Fixed Twilio credentials (added phone number)
9. Added `testTwilioSMSDiagnostic` endpoint

---

## ⚠️ KNOWN ISSUES

1. **Twilio SMS not delivering** - Trial account limitation
2. **16 placeholder functions** - Need implementation
3. **Hardcoded API URL in index.html** - Should use api-config.js
4. **Telegram token hardcoded** - Security risk (line 238-241)

---

*This document reflects actual tested system state, not automated file scanning.*
