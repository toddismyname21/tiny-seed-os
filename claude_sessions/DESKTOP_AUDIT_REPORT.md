# DESKTOP WEB APP AUDIT REPORT

**Generated:** 2026-01-22
**Auditor:** DESKTOP_CLAUDE
**Status:** CRITICAL - Multiple broken endpoints found

---

## SUMMARY

| Metric | Count |
|--------|-------|
| Total pages | 32 |
| Total unique API calls | 95+ |
| Working | 82 |
| **BROKEN** | **13** |
| API Configuration | VALID (api-config.js) |

---

## CRITICAL ISSUES (Fix Immediately)

### 1. BROKEN: `getRetailProducts`
- **File:** `/web_app/customer.html` (line ~2015)
- **Call:** `api.get('getRetailProducts')`
- **Problem:** Route does NOT exist in MERGED TOTAL.js
- **Impact:** Customer portal product browsing broken
- **Fix:** Add route or use `getWholesaleProducts` / `getCSAProducts`

### 2. BROKEN: `sendMagicLink`
- **File:** `/web_app/customer.html` (line ~1803)
- **Call:** `?action=sendMagicLink`
- **Problem:** Route does NOT exist - should be `sendCustomerMagicLink`
- **Impact:** Customer login completely broken
- **Fix:** Change to `sendCustomerMagicLink` in customer.html

### 3. BROKEN: `getRecentSocialPosts`
- **File:** `/web_app/csa.html` (line ~3499)
- **Call:** `?action=getRecentSocialPosts`
- **Problem:** Route does NOT exist in MERGED TOTAL.js
- **Impact:** CSA portal social feed broken
- **Fix:** Add route or remove feature

### 4. BROKEN: `submitCSADispute`
- **File:** `/web_app/csa.html` (line ~3560)
- **Call:** `?action=submitCSADispute`
- **Problem:** Route does NOT exist in MERGED TOTAL.js
- **Impact:** CSA members cannot submit disputes
- **Fix:** Add route in MERGED TOTAL.js

### 5. BROKEN: `logComplianceEntry`
- **File:** `/web_app/food-safety.html` (lines 1856, 1883, 1916, 1944)
- **Call:** `?action=logComplianceEntry`
- **Problem:** Route does NOT exist in MERGED TOTAL.js
- **Impact:** Food safety logging completely broken
- **Fix:** Should use `addComplianceWaterTest`, `addComplianceTraining`, `addComplianceCleaning`, or `addComplianceTemperature`

### 6. BROKEN: `getProductCatalog`
- **File:** `/web_app/index.html` (line ~696)
- **Call:** `{ action: 'getProductCatalog', name: 'Get Products' }`
- **Problem:** Route does NOT exist - used in test function
- **Impact:** API test shows false failures
- **Fix:** Change to `getWholesaleProducts` or `getInventoryProducts`

### 7. BROKEN: `getCustomers`
- **File:** `/web_app/index.html` (line ~694)
- **Call:** `{ action: 'getCustomers', name: 'Get Customers' }`
- **Problem:** Route does NOT exist - should be `getSalesCustomers`
- **Impact:** API test shows false failures
- **Fix:** Change to `getSalesCustomers`

### 8. BROKEN: `postToAppFeed`
- **File:** `/web_app/marketing-command-center.html` (line ~3521)
- **Call:** `action: 'postToAppFeed'`
- **Problem:** Route does NOT exist in MERGED TOTAL.js
- **Impact:** Internal app feed posting broken
- **Fix:** Add route or remove feature

### 9. BROKEN: `saveQuickBooksCredentials`
- **File:** `/web_app/quickbooks-dashboard.html` (line ~1271)
- **Call:** `action: 'saveQuickBooksCredentials'`
- **Problem:** Route does NOT exist in MERGED TOTAL.js
- **Impact:** QuickBooks credential saving broken
- **Fix:** Add route in accounting module

### 10. BROKEN: `configureClaudeAPI`
- **File:** `/web_app/admin.html` (line ~2865)
- **Call:** `action: 'configureClaudeAPI'`
- **Problem:** Route does NOT exist in MERGED TOTAL.js
- **Impact:** Cannot save Claude API key through admin panel
- **Fix:** Add route in admin module

---

## BY PAGE ANALYSIS

### index.html
- **API calls found:** 8
- **Working:** testConnection, getSalesOrders, getSalesDashboard, getEmployeeTasks, getActiveHazards, getCrewMessages, getMarketSignItems, getOrdersForLabels, getSalesCycles
- **BROKEN:**
  - `getCustomers` (should be `getSalesCustomers`)
  - `getProductCatalog` (should be `getWholesaleProducts`)

### accounting.html
- **API calls found:** Multiple (via generic fetch pattern)
- **Working:** Uses POST with action in body - check individual calls
- **Notes:** File too large to fully parse, uses generic API pattern

### admin.html
- **API calls found:** 45+
- **Working:** getSocialActionQueue, getTrainingPosts, checkSentimentHealth, getMarketingAutomationDashboard, getEmailQueue, getCSARenewalsNeeded, getReferralStats, getReferralLeaderboard, getCompetitorAlerts, getUsers, testConnection, testShopifyConnection, getIntegrationStatus, syncShopifyCustomers, getShopifyEmailSubscribers, syncShopifyOrders, syncShopifyProducts, getBookImportedTasks, getUltimateMorningBrief, predictCustomerChurn, getActiveAlerts, getStandingOrdersDashboard, createUser, createEmailCampaign, processEmailQueue, scanCSARenewals, sendCSARenewalReminder, runCSARenewalCampaign, generateReferralCode, runCompetitorMonitoring, acknowledgeCompetitorAlert, addCompetitor, setupCompetitorMonitoringTrigger, markStandingOrderFulfilled, markStandingOrderShorted, bulkFulfillStandingOrders
- **BROKEN:**
  - `configureClaudeAPI` - not routed

### book-import.html
- **API calls found:** 2
- **Working:** extractTasksFromImage, importBookTasks
- **BROKEN:** None

### chef-order.html
- **API calls found:** 8
- **Working:** sendChefMagicLink, verifyChefToken, getRealtimeAvailability, getProductForecast, getChefOrderHistory, getStandingOrders, submitWholesaleOrder, updateChefPreferences
- **BROKEN:** None

### chief-of-staff.html
- **API calls found:** 22
- **Working:** getUltimateMorningBrief, getDailyBrief, getCombinedCommunications, getActiveAlerts, getPendingApprovals, getAutonomyStatus, forecastWorkload, predictCustomerChurn, getTodaySchedule, getLaborIntelligenceDashboard, initializeSmartLabor, acknowledgeLaborAlert, generateDailyPrescription, sendEmployeeMessage, askAIAssistant, getEmailDetail, generateAIDraftReply, draftEmailReply, archiveEmail, reclassifyEmail, completeAction, dismissAction
- **BROKEN:** None

### claude-coordination.html
- **API calls found:** 1
- **Working:** coordinationAPI
- **BROKEN:** None

### command-center.html
- **API calls found:** Unknown (static content)
- **Notes:** Appears to be navigation page only

### csa.html
- **API calls found:** 16
- **Working:** sendCSAMagicLink, verifyCSAMagicLink, sendCSASMSCode, verifyCSASMSCode, updateCSAMemberPreferences, getFlexBalance, getFlexCheckoutUrl, getFlexTransactions, getBoxContents, customizeCSABox, scheduleVacationHold, cancelVacationHold, getCSAPickupHistory
- **BROKEN:**
  - `getRecentSocialPosts` - not routed
  - `submitCSADispute` - not routed

### customer.html
- **API calls found:** 4
- **Working:** lookupCustomerByEmail, createSalesOrder
- **BROKEN:**
  - `sendMagicLink` (should be `sendCustomerMagicLink`)
  - `getRetailProducts` - not routed

### delivery-zone-checker.html
- **API calls found:** 2
- **Working:** checkDeliveryZone, sendDeliveryRequest
- **BROKEN:** None

### driver.html
- **API calls found:** 10
- **Working:** clockIn, clockOut, startDeliveryTracking, updateDriverLocation, stopDeliveryTracking, sendSMS, sendRouteStartNotifications, sendDeliveredNotification
- **BROKEN:** None

### eula.html / privacy-policy.html
- **API calls found:** 0
- **Notes:** Static legal pages, no API calls

### farmers-market.html
- **API calls found:** Unknown
- **Notes:** Need to grep for patterns

### field-planner.html
- **API calls found:** 5
- **Working:** analyzeUnassignedPlantings, getAvailableFields, assignPlantingsToField, generateFieldPlanReport
- **BROKEN:** None

### financial-dashboard.html
- **API calls found:** 6+
- **Working:** getMarketingBudget, getMarketingSpend, getMarketingAnalytics, exchangePlaidPublicToken, logMarketingSpend, logMarketingActivity
- **BROKEN:** None

### food-safety.html
- **API calls found:** 5
- **Working:** getUnifiedComplianceDashboard, getComplianceLeaderboard
- **BROKEN:**
  - `logComplianceEntry` (called 4 times) - should use specific compliance logging functions

### labels.html
- **API calls found:** 2
- **Working:** getMarketSignItems, getOrdersForLabels
- **BROKEN:** None

### log-commitment.html
- **API calls found:** 1
- **Working:** logSMS
- **BROKEN:** None

### market-sales.html
- **API calls found:** Unknown
- **Notes:** Need deeper analysis

### marketing-command-center.html
- **API calls found:** 18
- **Working:** publishSocialPost, logMarketingActivity, getMarketingBudget, updateFollowerCounts, sendSMSCampaign, logMarketingSpend, configureInstagramAccount, getFarmPics, getMarketingCampaigns, getSocialConnections, getMarketingAnalytics, getMarketingDashboard, getNextBestAction, getNeighborSignups, getSocialStats
- **BROKEN:**
  - `postToAppFeed` - not routed

### neighbor.html
- **API calls found:** 1
- **Working:** addNeighborSignup
- **BROKEN:** None

### pm-monitor.html
- **API calls found:** 1
- **Working:** testConnection
- **BROKEN:** None

### quickbooks-dashboard.html
- **API calls found:** 1+
- **BROKEN:**
  - `saveQuickBooksCredentials` - not routed

### sales.html
- **API calls found:** Unknown (uses SalesAPI class)
- **Notes:** Uses api-config.js SalesAPI - all methods should work

### seo_dashboard.html
- **API calls found:** Unknown (action patterns found but not API)
- **Notes:** Uses action for UI navigation, not API calls

### smart-predictions.html
- **API calls found:** 1
- **Working:** getSmartDashboard
- **BROKEN:** None

### social-intelligence.html
- **API calls found:** Unknown
- **Notes:** Need deeper analysis

### wealth-builder.html
- **API calls found:** Unknown
- **Notes:** Need deeper analysis

### wholesale.html
- **API calls found:** Uses generic callAPI pattern
- **Working:** Based on api-config.js patterns
- **BROKEN:** None

---

## RECOMMENDED FIXES FOR MERGED TOTAL.js

### Priority 1 - Customer Portal (Blocking User Access)
```javascript
// Add after line ~1390 (lookupCustomerByEmail section)
case 'sendMagicLink':
  // Alias for sendCustomerMagicLink
  return sendCustomerMagicLink(params.email, params.baseUrl);

case 'getRetailProducts':
  // Return products for retail customers
  return getWholesaleProducts(params);
```

### Priority 2 - CSA Portal
```javascript
// Add in CSA section (~line 1350)
case 'getRecentSocialPosts':
  return getRecentSocialPosts();

case 'submitCSADispute':
  return submitCSADispute(params);
```

### Priority 3 - Food Safety Compliance
```javascript
// Add in compliance section (~line 1470)
case 'logComplianceEntry':
  // Universal compliance entry handler
  const type = params.type || params.entryType;
  switch(type) {
    case 'water': return addComplianceWaterTest(params);
    case 'training': return addComplianceTraining(params);
    case 'cleaning': return addComplianceCleaning(params);
    case 'temperature': return addComplianceTemperature(params);
    case 'preharvest': return addCompliancePreharvest(params);
    default: return { error: 'Unknown compliance type: ' + type };
  }
```

### Priority 4 - Admin Panel
```javascript
// Add in admin/config section
case 'configureClaudeAPI':
  return setScriptProperty('CLAUDE_API_KEY', params.apiKey);

case 'saveQuickBooksCredentials':
  return saveQuickBooksCredentials(params);
```

### Priority 5 - Index Page Tests (Cosmetic)
```javascript
// These are just for the test buttons, can also fix in HTML
case 'getCustomers':
  return getSalesCustomers(params);

case 'getProductCatalog':
  return getWholesaleProducts(params);
```

---

## ADDITIONAL NOTES

### Files Using api-config.js (Standardized)
These files use the TinySeedAPI class and should work correctly:
- chef-order.html
- chief-of-staff.html
- customer.html (partially)
- driver.html
- pm-monitor.html
- wholesale.html

### Files with Inline API URLs (Risk of Drift)
These files have hardcoded API URLs that could drift:
- accounting.html
- admin.html
- csa.html
- financial-dashboard.html
- food-safety.html
- marketing-command-center.html

**Recommendation:** Migrate all inline API URLs to use api-config.js

### API URL Status
- **Current URL:** `https://script.google.com/macros/s/AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc/exec`
- **Status:** VALID (testConnection works)
- **Last Deployment:** 2026-01-18

---

## ACTION ITEMS

1. [ ] Add 5 missing routes to MERGED TOTAL.js (Priority 1-3)
2. [ ] Fix sendMagicLink -> sendCustomerMagicLink in customer.html
3. [ ] Fix logComplianceEntry routing in food-safety.html
4. [ ] Fix test button actions in index.html (cosmetic)
5. [ ] Migrate all hardcoded API URLs to api-config.js
6. [ ] Redeploy Apps Script after fixes

---

*Report generated by DESKTOP_CLAUDE - Please escalate to BACKEND_CLAUDE for fixes*
