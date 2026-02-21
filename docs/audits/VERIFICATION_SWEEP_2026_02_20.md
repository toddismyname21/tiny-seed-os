# Verification Sweep Report - 2026-02-20

**Auditor:** PM_Architect (Claude Opus 4.6)
**Scope:** Frontend HTML/JS validation, Backend endpoint coverage, UX accessibility, QuickBooks wholesale invoice automation assessment
**Method:** Offline code analysis (no live endpoint testing)
**Date:** 2026-02-20

---

## Executive Summary

- **16 key pages** analyzed for frontend integrity
- **~85 API actions** traced from frontend to backend
- **1 broken link** found (claude-coordination.html does not exist)
- **2 pages** missing `api-config.js` import entirely (wealth-builder.html, csa-unified-finder.html)
- **1 page** has duplicate `api-config.js` import (index.html)
- **Wholesale invoice automation already partially exists** in the backend -- triggered on both order submission and delivery proof

---

## Part A: Frontend HTML/JS Validation

### 1. API Configuration Usage

Every page should import `api-config.js` and use `TINY_SEED_API.MAIN_API` instead of hardcoded URLs.

| Page | Imports api-config.js | Uses TINY_SEED_API | Hardcoded URL Fallback | Status |
|------|----------------------|-------------------|----------------------|--------|
| index.html | YES (x2 - DUPLICATE) | YES | NO | WARN - duplicate import |
| chef-order.html | YES | YES (via TinySeedAPI class) | NO | PASS |
| wholesale.html | YES | YES | NO | PASS |
| employee-management.html | YES | YES | YES (fallback) | PASS |
| accounting.html | YES | YES | NO | PASS |
| financial-dashboard.html | YES | YES | YES (fallback) | PASS |
| loan-readiness.html | YES | YES | YES (fallback) | PASS |
| quickbooks-dashboard.html | YES | YES | YES (fallback) | PASS |
| sales.html | YES (late, line 3822) | YES (via SalesAPI class) | NO | PASS |
| customer.html | YES | YES | NO | PASS |
| marketing-command-center.html | YES | YES | NO | PASS |
| driver.html | YES (x2) | YES | YES (fallback) | PASS |
| garage.html | YES (x2) | YES | NO | PASS |
| food-safety.html | YES (x2) | YES | YES (fallback) | PASS |
| farmers-market.html | YES | STATUS_ABSTAIN (uses SalesAPI class) | NO | PASS |
| **wealth-builder.html** | **NO** | **NO** | **UNKNOWN** | **FAIL** |
| **csa-unified-finder.html** | **NO** | **NO** | **YES - hardcoded only** | **FAIL** |
| seo_dashboard.html | YES | YES | NO | PASS |
| pm-dashboard.html | YES (x2) | YES | YES (fallback) | PASS |

**Issues Found:**
1. **wealth-builder.html** -- Does NOT import api-config.js at all. Needs investigation.
2. **csa-unified-finder.html** -- Does NOT import api-config.js. Uses a hardcoded API URL directly.
3. **index.html** -- Imports api-config.js TWICE (lines 7 and 1153). Harmless but sloppy.

### 2. Broken Links (Pages Referenced But Missing)

| Source Page | Link Target | Exists? | Status |
|-------------|-------------|---------|--------|
| index.html | claude-coordination.html | **NO** | **BROKEN** |
| index.html | ../employee.html | YES (root) | PASS |
| index.html | ../planning.html | YES (root) | PASS |
| index.html | ../greenhouse.html | YES (root) | PASS |
| index.html | ../soil-tests.html | YES (root) | PASS |
| index.html | ../seed_inventory_PRODUCTION.html | YES (root) | PASS |
| driver.html | manifest-driver.json | YES | PASS |
| driver.html | ../icons/driver-192.png | YES | PASS |
| chef-order.html | chef-manifest.json | YES | PASS |
| farmers-market.html | ../manifest.json | YES (root) | PASS |

**Critical:** `claude-coordination.html` is linked from the index page under "Working Features" with a prominent purple border but **does not exist**. Users clicking this link will get a 404.

### 3. Broken Script/CSS Imports

All local JS and CSS file imports were verified:

| File | Exists? |
|------|---------|
| web_app/api-config.js | YES |
| web_app/auth-guard.js | YES |
| web_app/tiny-seed-design-system.css | YES |
| web_app/correction-modal.css | YES |
| web_app/lender-crm.css | YES |
| web_app/brain-integration.js | YES |
| web_app/config.js | YES |

External CDN imports (fonts.googleapis.com, cdnjs.cloudflare.com, cdn.jsdelivr.net, unpkg.com) were not verified offline but are standard CDNs.

### 4. Duplicate api-config.js Import

| Page | Import Count | Lines |
|------|-------------|-------|
| index.html | 2 | 7, 1153 |
| driver.html | 2 | 10, 1906 |
| food-safety.html | 2 | 12, 1520 |
| garage.html | 2 | 7, 1839 |
| log-commitment.html | 2 | 11, 550 |
| employee-onboarding.html | 2 | 9, 870 |
| chef-approve.html | 2 | 7, 421 |
| pm-dashboard.html | 2 | 7, 1153 |

These duplicates are functionally harmless (the second load is a no-op since the script is already parsed) but indicate messy code structure.

### 5. Design System CSS Adoption

Only **8 out of ~50 HTML pages** include `tiny-seed-design-system.css`:
- index.html (via inline only, no link)
- chef-order.html
- employee-management.html
- accounting.html
- financial-dashboard.html
- quickbooks-dashboard.html
- loan-readiness.html
- csa.html

**Most pages define their own CSS from scratch.** This creates inconsistency and maintenance burden.

---

## Part B: Backend Endpoint Coverage Matrix

### Chef Order (chef-order.html)

| Frontend Action | Backend Handler | Status |
|----------------|----------------|--------|
| sendChefMagicLink | case 'sendChefMagicLink' (line 14929) | CONNECTED |
| verifyChefToken | case 'verifyChefToken' (lines 14926, 15411) | CONNECTED |
| getRealtimeAvailability | case 'getRealtimeAvailability' (line 14889) | CONNECTED |
| getProductForecast | case 'getProductForecast' (line 14891) | CONNECTED |
| saveProductNotification | STATUS_ABSTAIN (POST handler) | NEEDS VERIFICATION |
| getChefOrderHistory | case 'getChefOrderHistory' (line 14916) | CONNECTED |
| getStandingOrders | case 'getStandingOrders' (line 15058) | CONNECTED |
| submitWholesaleOrder | POST handler (line ~39034) | CONNECTED |
| updateChefPreferences | case 'updateChefPreferences' (line 17827) | CONNECTED |

### Index (index.html)

| Frontend Action | Backend Handler | Status |
|----------------|----------------|--------|
| testConnection | case 'testConnection' exists | CONNECTED |
| getCoordinationOverview | STATUS_ABSTAIN | NEEDS VERIFICATION |
| getSalesOrders | case 'getSalesOrders' exists | CONNECTED |
| getEmployeeTasks | case 'getEmployeeTasks' exists | CONNECTED |
| getCropProfiles | STATUS_ABSTAIN | NEEDS VERIFICATION |
| getSeedInventory | STATUS_ABSTAIN | NEEDS VERIFICATION |
| inviteEmployee | case 'inviteEmployee' exists | CONNECTED |
| inviteChef | case 'inviteChef' exists | CONNECTED |

### Employee Management (employee-management.html)

| Frontend Action | Backend Handler | Status |
|----------------|----------------|--------|
| getAllEmployees | case 'getAllEmployees' (line 15355) | CONNECTED |
| getPendingEmployees | case 'getPendingEmployees' (line 15395) | CONNECTED |
| approveEmployee | case 'approveEmployee' (line 15397) | CONNECTED |
| rejectEmployee | case 'rejectEmployee' (line 15399) | CONNECTED |
| sendEmployeeMagicLink | case 'sendEmployeeMagicLink' (line 17921) | CONNECTED |
| updateEmployeeAdmin | case 'updateEmployeeAdmin' (line 15407) | CONNECTED |
| inviteEmployee | case 'inviteEmployee' exists | CONNECTED |

### Customer Portal (customer.html)

| Frontend Action | Backend Handler | Status |
|----------------|----------------|--------|
| lookupCustomerByEmail | case 'lookupCustomerByEmail' (line 15185) | CONNECTED |
| sendMagicLink | case 'sendMagicLink' (line 16790+) | CONNECTED |
| getRetailProducts | case 'getRetailProducts' (line 16790) | CONNECTED |
| createSalesOrder | POST handler exists | CONNECTED |

### QuickBooks Dashboard (quickbooks-dashboard.html)

| Frontend Action | Backend Handler | Status |
|----------------|----------------|--------|
| getQuickBooksConnectionStatus | case (line 16161) | CONNECTED |
| getQuickBooksAuthUrl | case (line 16058) | CONNECTED |
| getQuickBooksDashboard | case (line 16159) | CONNECTED |
| saveQuickBooksCredentials | case (lines 16806, 18493) | CONNECTED (duplicate handler!) |

### Garage (garage.html)

| Frontend Action | Backend Handler | Status |
|----------------|----------------|--------|
| getFleetAssets | case (line 15229) | CONNECTED |
| getGarageParts | case (line 15249) | CONNECTED |
| getGarageManuals | case (line 15257) | CONNECTED |
| createFleetAsset | case (line 17855) | CONNECTED |
| createGaragePart | case (line 17869) | CONNECTED |
| createGarageManual | case (line 17875) | CONNECTED |
| logFleetMaintenance | case (line 17863) | CONNECTED |
| logFleetFuel | case (line 17861) | CONNECTED |
| adjustPartInventory | case (line 17873) | CONNECTED |

### Food Safety (food-safety.html)

| Frontend Action | Backend Handler | Status |
|----------------|----------------|--------|
| getUnifiedComplianceDashboard | case (line 15329) | CONNECTED |
| getComplianceLeaderboard | case (line 15331) | CONNECTED |
| logComplianceEntry | case (lines 16802, 18489) | CONNECTED (duplicate handler!) |

### Driver (driver.html)

| Frontend Action | Backend Handler | Status |
|----------------|----------------|--------|
| clockIn | case exists | CONNECTED |
| clockOut | case exists | CONNECTED |
| startDeliveryTracking | STATUS_ABSTAIN | NEEDS VERIFICATION |
| updateDriverLocation | STATUS_ABSTAIN | NEEDS VERIFICATION |
| stopDeliveryTracking | STATUS_ABSTAIN | NEEDS VERIFICATION |
| sendSMS | case exists | CONNECTED |
| sendRouteStartNotifications | STATUS_ABSTAIN | NEEDS VERIFICATION |
| sendDeliveredNotification | STATUS_ABSTAIN | NEEDS VERIFICATION |
| recordDeliveryProof | case (line 17845) | CONNECTED |

### Sales Dashboard (sales.html)

| Frontend Action | Backend Handler | Status |
|----------------|----------------|--------|
| updateOrderStatus | POST handler | CONNECTED |
| deleteOrder | POST handler | CONNECTED |
| sendBulkSMS | POST handler | CONNECTED |
| sendBulkEmail | POST handler | CONNECTED |
| sendCSAConfirmationReminder | case exists | CONNECTED |
| updateCustomer | case exists | CONNECTED |
| updateInventoryItem | POST handler | CONNECTED |
| adjustInventoryStock | POST handler | CONNECTED |
| deleteCustomer | case exists | CONNECTED |
| setCSAVacationHold | POST handler | CONNECTED |
| sendWeeklyAvailabilityBlast | POST handler | CONNECTED |
| syncInventoryFromHarvest | POST handler | CONNECTED |
| generateWeeklyCSABoxes | POST handler | CONNECTED |

### Duplicate Backend Handlers Found

| Action | Locations in MERGED TOTAL.js | Risk |
|--------|------------------------------|------|
| saveQuickBooksCredentials | Lines 16806 AND 18493 | LOW - same response |
| logComplianceEntry | Lines 16802 AND 18489 | LOW - same function |
| verifyChefToken | Lines 14926 AND 15411 | LOW - same function |
| getAllEmployees | Lines 15355 AND 15403 | LOW - same function |

These duplicates suggest copy-paste issues in the large MERGED TOTAL.js file. Only the first match executes (due to switch/case fall-through), so the second is dead code.

---

## Part C: UX Accessibility Review

### Basic Accessibility Checklist

| Page | lang="en" | meta viewport | Design System CSS | focus-visible | prefers-reduced-motion |
|------|-----------|---------------|-------------------|---------------|----------------------|
| index.html | YES | YES | NO | NO | NO |
| chef-order.html | YES | YES | YES | YES | YES |
| wholesale.html | YES | YES | NO | NO | NO |
| employee-management.html | YES | YES | YES | YES | NO |
| accounting.html | YES | YES | YES | YES | NO |
| financial-dashboard.html | YES | YES | YES | YES | NO |
| loan-readiness.html | YES | YES | YES | YES | NO |
| quickbooks-dashboard.html | YES | YES | YES | YES | NO |
| sales.html | YES | YES | NO | NO | NO |
| customer.html | YES | YES | NO | NO | NO |
| marketing-command-center.html | YES | YES | NO | NO | NO |
| driver.html | YES | YES | NO | NO | NO |
| garage.html | YES | YES | NO | NO | NO |
| food-safety.html | YES | YES | NO | YES | NO |
| farmers-market.html | YES | YES | NO | NO | NO |

### Key Findings:

1. **All pages have `lang="en"`** -- PASS
2. **All pages have `<meta viewport>`** -- PASS
3. **Only chef-order.html respects `prefers-reduced-motion`** -- All other pages lack this media query
4. **Only 8/16 key pages have WCAG 2.2 `:focus-visible`** -- Half the pages lack keyboard focus indicators
5. **Form labels** -- Most pages use `<label>` elements correctly. chef-order.html uses `.form-label` class with proper association.
6. **Image alt attributes** -- Most pages use emoji-based icons rather than `<img>` tags, so alt text is not applicable in most cases. STATUS_ABSTAIN for pages with actual images.
7. **Color contrast** -- Dark themes (#0f172a background + #94a3b8 secondary text) provide approximately 4.6:1 contrast ratio against the dark background. Primary text (#f8fafc on #0f172a) provides excellent contrast (~15:1). **Secondary text colors may fail WCAG AAA but pass AA.**

### Critical Accessibility Gaps:

| Issue | Pages Affected | Severity |
|-------|---------------|----------|
| No `:focus-visible` styles | 8 pages | HIGH - keyboard users cannot see focus |
| No `prefers-reduced-motion` | 15 pages | MEDIUM - users with vestibular disorders |
| No skip-to-content link | ALL pages | MEDIUM - screen reader navigation |
| Missing ARIA landmarks | Most pages | MEDIUM - screen reader navigation |

---

## Part D: QuickBooks Wholesale Invoice Automation Assessment

### What the User Wants
"Wholesale invoices to send out automatically on delivery through QuickBooks."

### What Already Exists

**The core automation is ALREADY BUILT in the backend.** Here is the evidence:

#### 1. Automatic Invoice on Order Submission
In `MERGED TOTAL.js` around line 39034, the `submitWholesaleOrder` handler includes:
```javascript
// PRIORITY 1.1: CONNECT INVOICE GENERATION
invoiceResult = createInvoiceFromOrder(orderId, 'Wholesale');
```
When a wholesale order is submitted, it **automatically** attempts to create a QuickBooks invoice.

#### 2. Automatic Invoice on Delivery Confirmation
In `MERGED TOTAL.js` around line 45432:
```javascript
// WHOLESALE CUSTOMERS: Automatically trigger QuickBooks invoice
if (customerType && customerType.toLowerCase() === 'wholesale' && orderId) {
    invoiceResult = createInvoiceFromOrder(orderId, 'Wholesale');
}
```
When a delivery is marked complete, it **automatically** creates a QuickBooks invoice for wholesale customers.

#### 3. createInvoiceFromOrder Function
Defined at line 77768, this function:
- Takes an orderId and orderType
- Looks up the order details
- Creates a QuickBooks invoice via the API
- Returns success/failure status

#### 4. createQuickBooksInvoice Function
Defined at line 77708, this is the low-level QuickBooks API call that:
- Takes invoice data (customer, line items, due date, terms)
- Calls the QuickBooks Online API
- Creates the invoice in QuickBooks

#### 5. QuickBooks Dashboard
The `quickbooks-dashboard.html` page provides:
- Connection status checking
- Setup wizard for OAuth credentials
- Dashboard showing open invoices, bills, P&L
- A/R and A/P aging reports

### What MIGHT Be Missing (Needs Live Verification)

| Component | Status | Notes |
|-----------|--------|-------|
| QuickBooks OAuth connection | STATUS_ABSTAIN | Must verify QB is actually connected with valid tokens |
| Invoice creation on delivery | CODE EXISTS | The code is in place; needs live test to verify it fires |
| Delivery confirmation by driver | CODE EXISTS | driver.html has `recordDeliveryProof` action |
| QB customer sync | CODE EXISTS | `syncQuickBooksCustomers` endpoint exists |
| Invoice email sending | STATUS_ABSTAIN | QB may handle this natively, but needs verification |
| Error handling / retry | PARTIAL | Catches errors but no automatic retry mechanism |

### Architecture Flow (As Built)

```
Driver marks delivery complete (driver.html)
    -> recordDeliveryProof (API)
    -> If wholesale customer:
        -> createInvoiceFromOrder(orderId, 'Wholesale')
            -> createQuickBooksInvoice(invoiceData)
                -> QuickBooks Online API
    -> Send SMS confirmation to customer
```

### Gaps to Address

1. **QuickBooks OAuth Tokens**: The connection must be active. If tokens expire, invoices silently fail. Need a token refresh mechanism check.

2. **No Invoice Email Trigger**: The code creates the invoice in QB, but it is unclear if QB automatically emails it. A separate `sendInvoice` QB API call may be needed.

3. **No Retry/Queue**: If QB API is down at delivery time, the invoice is lost. A queue-based approach would be more resilient.

4. **No Dashboard Visibility**: The driver and farm manager have no way to see if the invoice was actually created. A "delivery + invoice" confirmation step in the sales dashboard would help.

5. **Duplicate Invoice Prevention**: If both the order submission AND delivery confirmation trigger invoice creation, a wholesale order could get **two invoices**. There should be a check for existing invoices.

### Recommended Next Steps

| Priority | Task | Effort |
|----------|------|--------|
| P0 | Verify QuickBooks OAuth connection is active | 5 min (live test) |
| P0 | Test end-to-end: submit wholesale order -> check QB for invoice | 10 min (live test) |
| P1 | Add duplicate invoice check before creation | 30 min |
| P1 | Add invoice status to delivery confirmation response | 30 min |
| P2 | Add QB auto-send invoice after creation | 1 hour |
| P2 | Add failed invoice queue with retry | 2 hours |
| P3 | Show invoice status in sales dashboard | 2 hours |

---

## Part E: Priority Fixes List

### CRITICAL (Must Fix)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | **Broken link: claude-coordination.html does not exist** | web_app/index.html (line 715) | Either create the page or remove the link |
| 2 | **csa-unified-finder.html uses hardcoded API URL with NO api-config.js** | web_app/csa-unified-finder.html | Add `<script src="api-config.js"></script>` and use TINY_SEED_API.MAIN_API |
| 3 | **wealth-builder.html does not import api-config.js** | web_app/wealth-builder.html | Add api-config.js import; verify if it makes API calls |

### HIGH (Should Fix Soon)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 4 | Duplicate api-config.js imports (8 pages) | Multiple | Remove second import from each page |
| 5 | No `:focus-visible` on 8 key pages | index.html, wholesale.html, sales.html, customer.html, marketing-command-center.html, driver.html, garage.html, farmers-market.html | Add focus-visible CSS rule |
| 6 | Duplicate backend handlers (saveQuickBooksCredentials, logComplianceEntry, verifyChefToken) | apps_script/MERGED TOTAL.js | Remove duplicate case statements |
| 7 | Potential duplicate QuickBooks invoices for wholesale orders (created on both order submission AND delivery) | apps_script/MERGED TOTAL.js | Add check for existing invoice before creating |

### MEDIUM (Nice to Have)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 8 | Only 8/50 pages use design system CSS | Multiple | Adopt tiny-seed-design-system.css across all pages |
| 9 | No `prefers-reduced-motion` on 15/16 key pages | Multiple | Add media query to disable animations |
| 10 | No skip-to-content links | ALL pages | Add `<a href="#main" class="sr-only">Skip to content</a>` |
| 11 | Hardcoded URL fallbacks in 15+ pages | Multiple | Remove fallbacks, rely on api-config.js import |

---

## Part F: What MUST Be Verified Live Tomorrow

These items cannot be confirmed through code analysis alone:

| # | Verification | How to Test |
|---|-------------|-------------|
| 1 | QuickBooks OAuth connection active | Visit quickbooks-dashboard.html, check connection banner |
| 2 | Invoice auto-creation on wholesale order | Submit test wholesale order, check QB for invoice |
| 3 | Invoice auto-creation on delivery proof | Record delivery proof via driver app, check QB |
| 4 | API endpoints responding | Visit index.html, click "Test Main API" button |
| 5 | Auth guard working | Visit employee-management.html without login |
| 6 | Chef magic link emails sending | Test from chef-order.html login screen |
| 7 | Plaid bank connection active | Visit accounting.html, check transaction import |
| 8 | SMS sending working | Test from sales.html bulk SMS feature |
| 9 | All pages loading on GitHub Pages | Visit each key page URL on live site |
| 10 | Broken link user experience | Click "Claude Coordination" on index.html |

---

## Appendix: Files Analyzed

### HTML Pages (16 key + 35 others)
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/index.html`
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/chef-order.html`
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/wholesale.html`
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/employee-management.html`
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/accounting.html`
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/financial-dashboard.html`
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/loan-readiness.html`
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/quickbooks-dashboard.html`
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/sales.html`
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/customer.html`
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/marketing-command-center.html`
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/driver.html`
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/garage.html`
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/food-safety.html`
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/farmers-market.html`
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/csa-unified-finder.html`

### Backend
- `/Users/samanthapollack/Documents/TIny_Seed_OS/apps_script/MERGED TOTAL.js` (~130,000+ lines)

### Config
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/api-config.js`
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/auth-guard.js`
- `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/tiny-seed-design-system.css`
