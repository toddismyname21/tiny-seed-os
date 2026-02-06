# Tiny Seed OS - Comprehensive UX Audit Report

**Audit Date:** February 4, 2026
**Auditor:** Claude Code (UX Audit)
**Files Reviewed:**
- `/web_app/csa.html` - CSA Member Portal
- `/web_app/sales.html` - Sales Dashboard
- `/index.html` - Main Farm Management Dashboard
- `/employee.html` - Employee Field App

---

## Executive Summary

### Overall UX Health: **GOOD** (7.5/10)

The Tiny Seed OS frontend applications demonstrate professional-grade design with consistent styling, proper mobile meta tags, and robust API integration. However, several areas require attention:

| Category | Status | Score |
|----------|--------|-------|
| Load Without Errors | **PASS** | 9/10 |
| Button-Function Connections | **NEEDS WORK** | 6/10 |
| Orphaned JS References | **PASS** | 8/10 |
| Mobile Responsiveness | **GOOD** | 8/10 |
| Placeholder Functions | **NEEDS WORK** | 5/10 |
| API Connection | **PASS** | 9/10 |

### Critical Findings Summary
1. **16 placeholder functions** that only show toast messages instead of implementing actual functionality
2. **3 files** lack comprehensive mobile breakpoints for smaller screens
3. **Sales dashboard** missing API_URL variable definition (relies on SalesAPI class)
4. **Index.html** has hardcoded API URL instead of using api-config.js

---

## Page-by-Page Breakdown

---

### 1. CSA Member Portal (`/web_app/csa.html`)

#### Loading Status: **PASS**
- Proper DOCTYPE and HTML5 structure
- Viewport meta tag configured correctly: `width=device-width, initial-scale=1.0, user-scalable=no`
- PWA meta tags present (apple-mobile-web-app-capable, theme-color)
- External resources load from reliable CDNs (Google Fonts, Font Awesome, cdnjs)

#### Button-Function Connections

| Button/Action | Function | Status |
|---------------|----------|--------|
| Send Magic Link | `sendMagicLink()` | CONNECTED |
| Send SMS Code | `sendSMSCode()` | CONNECTED |
| Verify SMS Code | `verifySMSCode()` | CONNECTED |
| Switch Login Method | `switchLoginMethod()` | CONNECTED |
| Onboarding Steps | `nextOnboardingStep()`, `prevOnboardingStep()` | CONNECTED |
| Show Vacation Holds | `showVacationHolds()` | CONNECTED |
| Purchase Flex Funds | `purchaseFlexFunds()` | CONNECTED |
| Toggle Flex History | `toggleFlexHistory()` | CONNECTED |
| Open Swap Modal | `openSwapModal()` | CONNECTED |
| Confirm Swap | `confirmSwap()` | CONNECTED |
| **Contact Farm** | `contactFarm()` | **PLACEHOLDER** |
| **View All Updates** | `viewAllUpdates()` | **PLACEHOLDER** |
| **Show Dislikes Settings** | `showDislikesSettings()` | **PLACEHOLDER** |

#### Orphaned JavaScript References: **NONE DETECTED**

#### Mobile Responsiveness
- **Breakpoints Defined:**
  - `@media (max-width: 480px)` - Small mobile
  - `@media (min-width: 768px)` - Tablet and up
- **Issues:**
  - Only 2 media query breakpoints; missing intermediate tablet size (768px-1024px)
  - No specific landscape orientation handling

#### Placeholder Functions Found (3):
```javascript
function showDislikesSettings() {
    showToast('Opening item preferences...', 'info');
}

function contactFarm() {
    showToast('Opening contact form...', 'info');
}

function viewAllUpdates() {
    showToast('Opening farm updates...', 'info');
}
```

#### API Connection: **CORRECT**
- Uses `api-config.js` import
- Properly falls back: `window.TINY_SEED_API?.MAIN_API || hardcoded_url`
- All API calls use the unified `API_URL` variable

---

### 2. Sales Dashboard (`/web_app/sales.html`)

#### Loading Status: **PASS**
- Proper DOCTYPE and HTML5 structure
- Viewport meta tag present
- Auth guard included with Manager role requirement

#### Button-Function Connections

| Button/Action | Function | Status |
|---------------|----------|--------|
| Sync From Shopify | `syncFromShopify()` | CONNECTED |
| Refresh Data | `refreshData()` | CONNECTED |
| Open New Order Modal | `openNewOrderModal()` | CONNECTED |
| Open New Customer Modal | `openNewCustomerModal()` | CONNECTED |
| Save Customer | `saveCustomer()` | CONNECTED |
| Save Order | `saveOrder()` | CONNECTED |
| View Customer | `viewCustomer()` | CONNECTED |
| Send Bulk SMS | `sendBulkSMS()` | CONNECTED |
| Send Bulk Email | `sendBulkEmail()` | CONNECTED |
| **Export Orders** | `exportOrders()` | **PLACEHOLDER** |
| **Export Customers** | `exportCustomers()` | **PLACEHOLDER** |
| **Sync From Harvest** | `syncFromHarvest()` | **PLACEHOLDER** |
| **Open Add Inventory Modal** | `openAddInventoryModal()` | **PLACEHOLDER** |
| **Generate Weekly Boxes** | `generateWeeklyBoxes()` | **PLACEHOLDER** |
| **Send Availability List** | `sendAvailabilityList()` | **PLACEHOLDER** |
| **Print Packing Labels** | `printPackingLabels()` | **PLACEHOLDER** |
| **Open New Campaign Modal** | `openNewCampaignModal()` | **PLACEHOLDER** |
| **View Member** | `viewMember()` | **PLACEHOLDER** |
| **Set Vacation Hold** | `setVacationHold()` | **PLACEHOLDER** |
| **Edit Member** | `editMember()` | **PLACEHOLDER** |
| **Send Price List** | `sendPriceList()` | **PLACEHOLDER** |
| **Edit Inventory** | `editInventory()` | **PLACEHOLDER** |
| **Adjust Stock** | `adjustStock()` | **PLACEHOLDER** |

#### Orphaned JavaScript References: **NONE DETECTED**

#### Mobile Responsiveness
- **Breakpoints Defined:**
  - `@media (max-width: 1200px)` - Large screens
  - `@media (max-width: 768px)` - Tablet/Mobile
- **Issues:**
  - Sidebar is fixed at 260px; on small mobile screens (<480px), content may be cramped
  - No breakpoint for very small screens
  - Desktop-first design with limited mobile optimization

#### Placeholder Functions Found (13):
```javascript
function viewMember(id) { showToast(`Viewing member ${id}`, 'info'); }
function setVacationHold(id) { showToast(`Setting vacation hold for ${id}`, 'info'); }
function editMember(id) { showToast(`Editing member ${id}`, 'info'); }
function sendPriceList(id) { showToast(`Sending price list to ${id}`, 'info'); }
function exportOrders() { showToast('Exporting orders...', 'info'); }
function exportCustomers() { showToast('Exporting customers...', 'info'); }
function syncFromHarvest() { showToast('Syncing from harvest log...', 'info'); }
function openAddInventoryModal() { showToast('Opening add inventory modal', 'info'); }
function generateWeeklyBoxes() { showToast('Generating weekly CSA boxes...', 'info'); }
function sendAvailabilityList() { showToast('Sending availability list...', 'info'); }
function printPackingLabels() { showToast('Printing packing labels...', 'info'); }
function openNewCampaignModal() { showToast('Opening campaign builder...', 'info'); }
function editInventory(id) { showToast(`Editing inventory ${id}`, 'info'); }
function adjustStock(id) { showToast(`Adjusting stock for ${id}`, 'info'); }
```

#### API Connection: **CORRECT**
- Uses `api-config.js` which provides `SalesAPI` class
- `const api = new SalesAPI();` initialized at page load
- API_URL not directly defined (uses class methods instead)

---

### 3. Main Dashboard (`/index.html`)

#### Loading Status: **PASS**
- Proper DOCTYPE and HTML5 structure
- Performance optimizations present (preconnect, font optimization)
- Auth guard included with Employee role requirement

#### Button-Function Connections

| Button/Action | Function | Status |
|---------------|----------|--------|
| Logout | `logout()` | CONNECTED |
| Open Settings | `openSettings()` | CONNECTED |
| Refresh Data | `refreshData()` | CONNECTED |
| Toggle Forecast | `toggleForecast()` | CONNECTED |
| Open Quick Plant | `openQuickPlant()` | CONNECTED |
| Open Smart Add | `openSmartAdd()` | CONNECTED |
| Open Command Palette | `openCommandPalette()` | CONNECTED |
| Complete Selected Tasks | `completeSelectedTasks()` | CONNECTED |
| Delete Selected Tasks | `deleteSelectedTasks()` | CONNECTED |
| Open Bulk Delegate Modal | `openBulkDelegateModal()` | CONNECTED |
| Undo Last Completion | `undoLastCompletion()` | CONNECTED |
| Toggle Select All | `toggleSelectAll()` | CONNECTED |
| Open Invite Employee | `openInviteEmployee()` | CONNECTED |
| Open Invite Chef | `openInviteChef()` | CONNECTED |

#### Orphaned JavaScript References: **NONE DETECTED**

#### Mobile Responsiveness
- **Breakpoints Defined:**
  - `@media (max-width: 1200px)` - Hides sidebar
  - `@media (max-width: 768px)` - Multiple adjustments
  - `@media (max-width: 480px)` - Small mobile specific
  - `@media (max-width: 1024px)` - Tablet adjustments
- **Assessment:** Good coverage across device sizes

#### Placeholder Functions Found: **NONE**
All buttons connected to fully implemented functions.

#### API Connection: **ISSUE DETECTED**
- **HARDCODED API URL** instead of using api-config.js:
```javascript
const API_URL = 'https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec';
```
- Should import `web_app/api-config.js` and use `TINY_SEED_API.MAIN_API`
- This creates maintenance issues if the API URL needs to change

---

### 4. Employee Field App (`/employee.html`)

#### Loading Status: **PASS**
- Proper DOCTYPE and HTML5 structure
- PWA-optimized with manifest.json, apple-touch-icon, service worker support
- Safe area insets handled for notched devices
- Touch-friendly CSS design system implemented

#### Button-Function Connections

| Button/Action | Function | Status |
|---------------|----------|--------|
| PIN Entry | `enterPin()` | CONNECTED |
| Delete PIN | `deletePin()` | CONNECTED |
| Show Registration | `showRegistration()` | CONNECTED |
| Submit Registration | `submitRegistration()` | CONNECTED |
| Toggle Clock | `toggleClock()` | CONNECTED |
| Switch Tab | `switchTab()` | CONNECTED |
| Set Work Mode | `setWorkMode()` | CONNECTED |
| Pause Active Timer | `pauseActiveTimer()` | CONNECTED |
| Complete Active Timer | `completeActiveTimer()` | CONNECTED |
| Submit Harvest | `submitHarvest()` | CONNECTED |
| Submit Scout Report | `submitScoutReport()` | CONNECTED |
| Capture Photo | `capturePhoto()` | CONNECTED |
| Start Voice | `startVoice()` | CONNECTED |
| Navigate To | `navigateTo()` | CONNECTED |
| Complete Delivery Stop | `completeDeliveryStop()` | CONNECTED |

#### Orphaned JavaScript References: **NONE DETECTED**

#### Mobile Responsiveness
- **Breakpoints Defined:**
  - `@media (max-width: 480px)` - Full-screen modals on mobile
- **Assessment:**
  - Designed mobile-first with excellent touch target sizing (48px minimum)
  - Safe area support for notched phones
  - Only one explicit breakpoint, but mobile-first approach compensates

#### Placeholder Functions Found: **NONE**
All buttons connected to fully implemented functions.

#### API Connection: **CORRECT**
- Uses `web_app/api-config.js` import
- CONFIG object properly references: `(typeof TINY_SEED_API !== 'undefined') ? TINY_SEED_API.MAIN_API : fallback_url`
- Fallback to hardcoded URL if api-config.js fails to load

---

## Broken Features List

### High Priority (Core Functionality Missing)

| File | Feature | Button | Issue |
|------|---------|--------|-------|
| sales.html | Export Orders | "Export" button | Only shows toast, no actual export |
| sales.html | Export Customers | "Export" button | Only shows toast, no actual export |
| sales.html | Add Inventory | "Add Inventory" button | Only shows toast, no modal or form |
| sales.html | Generate Weekly Boxes | Button in CSA section | Only shows toast, no action |
| csa.html | Contact Farm | Quick action button | Only shows toast, no form or action |
| csa.html | View All Updates | "See All" button | Only shows toast, no navigation |

### Medium Priority (Administrative Features)

| File | Feature | Button | Issue |
|------|---------|--------|-------|
| sales.html | View Member Details | Row action | Only shows toast |
| sales.html | Edit Member | Row action | Only shows toast |
| sales.html | Set Vacation Hold | Row action | Only shows toast |
| sales.html | Edit Inventory | Row action | Only shows toast |
| sales.html | Adjust Stock | Row action | Only shows toast |
| sales.html | New Campaign | Button | Only shows toast |
| sales.html | Print Packing Labels | Button | Only shows toast |
| sales.html | Send Availability List | Button | Only shows toast |
| sales.html | Sync From Harvest | Button | Only shows toast |
| sales.html | Send Price List | Row action | Only shows toast |
| csa.html | Dislikes Settings | Settings link | Only shows toast |

---

## Mobile Responsiveness Issues

### Critical Issues

| File | Issue | Impact | Recommendation |
|------|-------|--------|----------------|
| sales.html | Fixed sidebar (260px) on small screens | Content area extremely cramped on phones | Add collapsible sidebar for mobile or use bottom navigation |
| sales.html | No breakpoint below 768px | Poor experience on small phones | Add `@media (max-width: 480px)` rules |
| index.html | Complex sidebar persists on mobile | Usability issues on tablets | Sidebar collapses at 1200px but could use hamburger menu |

### Moderate Issues

| File | Issue | Impact | Recommendation |
|------|-------|--------|----------------|
| csa.html | Limited breakpoints (only 480px and 768px) | Missing tablet-specific optimizations | Add 1024px breakpoint for landscape tablets |
| sales.html | Tables not horizontally scrollable | Data truncation on mobile | Add `overflow-x: auto` to table containers |
| index.html | Weather popup may overflow on small screens | Content cutoff | Add max-width and scroll for forecast popup |

### Good Practices Already Implemented

1. **employee.html**: Excellent mobile-first design with:
   - 48px minimum touch targets
   - Safe area insets for notched phones
   - Full-screen modals on mobile
   - Touch-friendly gestures

2. **csa.html**: Good mobile support with:
   - Bottom navigation (fixed)
   - Pull-to-refresh functionality
   - Swipe-enabled carousels
   - PWA meta tags

---

## Recommended Fixes with Priority

### Priority 1: Critical (Implement This Week)

| # | Issue | File | Fix | Effort |
|---|-------|------|-----|--------|
| 1 | Hardcoded API URL | index.html | Replace hardcoded URL with `<script src="web_app/api-config.js">` and use `TINY_SEED_API.MAIN_API` | 30 min |
| 2 | Contact Farm placeholder | csa.html | Implement contact form modal or link to email/phone | 2 hours |
| 3 | Export Orders/Customers | sales.html | Implement CSV download functionality | 4 hours |
| 4 | Sales mobile sidebar | sales.html | Add hamburger menu toggle for mobile | 3 hours |

### Priority 2: High (Implement This Month)

| # | Issue | File | Fix | Effort |
|---|-------|------|-----|--------|
| 5 | Add Inventory modal | sales.html | Create modal with form for adding inventory items | 4 hours |
| 6 | View/Edit Member | sales.html | Create member detail modal with edit capability | 6 hours |
| 7 | View All Updates | csa.html | Implement updates feed page or modal | 3 hours |
| 8 | Dislikes Settings | csa.html | Create preferences modal for item dislikes | 3 hours |
| 9 | Small screen breakpoints | sales.html | Add `@media (max-width: 480px)` responsive rules | 2 hours |

### Priority 3: Medium (Plan for Next Quarter)

| # | Issue | File | Fix | Effort |
|---|-------|------|-----|--------|
| 10 | Generate Weekly Boxes | sales.html | Implement box generation workflow | 8 hours |
| 11 | Print Packing Labels | sales.html | Implement PDF label generation | 6 hours |
| 12 | Campaign Builder | sales.html | Create SMS campaign creation modal | 8 hours |
| 13 | Sync From Harvest | sales.html | Implement harvest log sync | 4 hours |
| 14 | Adjust Stock | sales.html | Create stock adjustment modal | 3 hours |

### Priority 4: Low (Nice to Have)

| # | Issue | File | Fix | Effort |
|---|-------|------|-----|--------|
| 15 | Send Availability List | sales.html | Implement email/SMS send for availability | 4 hours |
| 16 | Send Price List | sales.html | Implement price list email feature | 3 hours |
| 17 | Set Vacation Hold | sales.html | Create vacation hold modal for managers | 3 hours |
| 18 | Landscape orientation | csa.html | Add landscape-specific styles | 2 hours |

---

## API Connection Summary

| File | Method | Status | Notes |
|------|--------|--------|-------|
| csa.html | api-config.js import | **CORRECT** | Uses `TINY_SEED_API.MAIN_API` with fallback |
| sales.html | api-config.js import | **CORRECT** | Uses `SalesAPI` class from config |
| index.html | Hardcoded URL | **ISSUE** | Should use api-config.js |
| employee.html | api-config.js import | **CORRECT** | Uses CONFIG.API_URL with fallback |

**Recommendation:** Update index.html to use the centralized api-config.js to maintain consistency and ease future API URL changes.

---

## Testing Checklist

Before deploying fixes, verify:

- [ ] All pages load without JavaScript errors (check console)
- [ ] Login/authentication flows work on all portals
- [ ] API calls return expected data (check Network tab)
- [ ] Forms validate input before submission
- [ ] Mobile navigation is accessible on all pages
- [ ] Touch targets are at least 44x44px on mobile
- [ ] Text is readable without zooming on mobile
- [ ] Modals can be dismissed on all screen sizes
- [ ] Pull-to-refresh works on PWA pages (csa.html, employee.html)

---

## Appendix: File Statistics

| File | Lines of Code | Functions | CSS Rules | Media Queries |
|------|---------------|-----------|-----------|---------------|
| csa.html | ~5,700 | 95 | ~300 | 2 |
| sales.html | ~4,900 | 89 | ~250 | 2 |
| index.html | ~10,000+ | 150+ | ~400 | 5 |
| employee.html | ~22,000+ | 180+ | ~500 | 1 |

---

**Report Generated:** February 4, 2026
**Next Recommended Audit:** March 2026 (after Priority 1-2 fixes implemented)
