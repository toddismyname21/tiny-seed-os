# TINY SEED OS - MASTER ARCHITECTURE DOCUMENT
## Central Brain for Cohesive App Development

**Last Updated:** 2026-01-15
**Status:** Active Development
**Owner:** Architecture/Integration Lead

---

## EXECUTIVE SUMMARY

This document serves as the **single source of truth** for integrating all Tiny Seed OS components into a cohesive, production-ready application. It tracks what exists, what's broken, what's missing, and the path forward.

---

## PART 1: CURRENT STATE AUDIT

### 1.1 API URL Status: CONSOLIDATED

**CURRENT API URL (Single Source of Truth):**
```
https://script.google.com/macros/s/AKfycbx8syGK5Bm60fypNO0yE60BYtTFJXxviaEtgrqENmF5GStB58UCEA4Shu_IF9r6kjf5/exec
```

**Status:** All 30 HTML files updated to use correct URL (2026-01-15)

**Reference Files:**
- `API_CONFIG.md` - Quick reference for all Claude sessions
- `web_app/api-config.js` - JavaScript single source of truth

**When API URL Changes:**
1. Update `web_app/api-config.js`
2. Update `API_CONFIG.md`
3. Notify all Claude sessions

### 1.2 Authentication Status by File

#### Files WITH Authentication (8 files)
| File | Auth Method | Session Key |
|------|-------------|-------------|
| login.html | Username + PIN | tinyseed_session |
| index.html | Session check | tinyseed_session |
| employee.html | PIN auth | tinyseed_session |
| web_app/driver.html | Driver PIN | driver_session |
| web_app/customer.html | Magic link | customer_session |
| web_app/wholesale.html | Magic link | customer_session |
| web_app/csa.html | Magic link | customer_session |
| soil-tests.html | Session check | tinyseed_session |

#### Files WITHOUT Authentication (OPEN - 25+ files)
These are **completely accessible** to anyone with the URL:
- api_diagnostic.html
- bed_assignment_COMPLETE.html
- calendar.html
- field_app_mobile.html
- gantt_CROP_VIEW_FINAL.html
- gantt_FINAL.html
- greenhouse.html
- greenhouse_labels_PRODUCTION (1).html
- labels.html
- master_dashboard_FIXED.html
- mobile.html
- planning.html
- seed_inventory_PRODUCTION.html
- smart_learning_DTM.html
- sowing-sheets.html
- succession.html
- visual_calendar_PRODUCTION (1).html
- web_app/labels.html
- web_app/sales.html
- web_app/field-planner.html
- web_app/marketing-command-center.html
- web_app/financial-dashboard.html
- web_app/wealth-builder.html
- farm-operations.html
- track.html

### 1.3 Demo Data Fallback Status

Files currently falling back to **hardcoded demo data** when API fails:

| File | Demo Data Type | Impact |
|------|----------------|--------|
| master_dashboard_FIXED.html | Dashboard stats | Shows fake numbers |
| greenhouse_labels_PRODUCTION.html | Seeding data | Can't print real labels |
| bed_assignment_COMPLETE.html | Planning data | Can't assign real beds |
| smart_learning_DTM.html | Learning data | No real DTM tracking |
| visual_calendar_PRODUCTION.html | Calendar data | Shows fake plantings |
| gantt_FINAL.html | Planning data | Shows fake timeline |
| gantt_CROP_VIEW_FINAL.html | Planning data | Shows fake crops |
| sowing-sheets.html | Sowing data | Can't track real sowings |
| seed_inventory_PRODUCTION.html | Seed data | Shows fake inventory |
| web_app/labels.html | Market items | Sample products only |

### 1.4 Role System (Existing in Backend)

From `MERGED TOTAL.js` line 825:

```javascript
const USER_ROLES = {
  'Admin': { level: 5, access: ['all'] },
  'Manager': { level: 4, access: ['planning', 'reports', 'employees', 'sales'] },
  'Field_Lead': { level: 3, access: ['planning', 'tasks', 'harvest'] },
  'Driver': { level: 2, access: ['delivery', 'routes'] },
  'Employee': { level: 1, access: ['tasks', 'timeclock', 'harvest'] }
};
```

**Problem:** These roles exist in the backend but are NOT enforced in the frontend.

---

## PART 2: TARGET ARCHITECTURE

### 2.1 Unified App Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                        TINY SEED OS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    AUTH LAYER                             │   │
│  │  • Single login.html entry point                          │   │
│  │  • Session validation on every page load                  │   │
│  │  • Role-based access control                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────┬────────────┴────────────┬──────────────────┐  │
│  │              │                         │                   │  │
│  ▼              ▼                         ▼                   ▼  │
│ ADMIN         MANAGER                  FIELD               EXTERNAL│
│ PORTAL        PORTAL                   PORTAL              PORTALS │
│ (Owner)       (Operations)             (Crew)              (Public)│
│                                                                    │
│ • Full access • Planning              • Tasks             • Customer│
│ • Financial   • Reports               • Harvest             ordering│
│ • Settings    • Sales mgmt            • Time clock        • CSA box │
│               • Scheduling            • Mobile app        • Driver  │
│                                                             app     │
└────────────────────────────────────────────────────────────────────┘
```

### 2.2 Permission Tiers (FINALIZED 2026-01-15)

| Tier | Role | Access | Special Features |
|------|------|--------|------------------|
| **1. ADMIN** | Owner | Everything including financials, time clock, settings | Can bypass geofence for time clock (work from home) |
| **2. MANAGER** | Operations | Planning (full), sales, reports, scheduling | **NO access to financials** |
| **3. FIELD_LEAD** | Field Lead | View plans (read-only), tasks, harvest, greenhouse, sowing | Cannot modify crop plans |
| **4. EMPLOYEE** | Crew | Time clock, assigned tasks, harvest, greenhouse seeding, scouting | Basic field operations |
| **5. DRIVER** | Delivery | Routes, proof of delivery | **Can toggle to Employee Mode** for farm tasks |
| **6. CUSTOMER** | External | Ordering portals, account management | customer.html, csa.html, wholesale.html |

#### Special: Driver/Employee Hybrid Mode
Drivers who also do farm work can toggle between modes in the app:
- **Driver Mode**: See delivery routes, record proof of delivery
- **Employee Mode**: Access time clock, tasks, harvest logging

Implemented in `auth-guard.js` via `AuthGuard.toggleMode()`

### 2.3 Sensitive Data Protection

**Data that must be protected (Admin only):**
- Financial dashboard (bank accounts, investments, debt)
- Twilio API credentials
- Google API keys
- Employee PINs and wages
- Profit margins and pricing formulas

**Data that must be protected (Manager+):**
- Customer contact information
- Sales totals and revenue
- Cost data

**Data that can be visible to all staff:**
- Crop schedules
- Task assignments
- Harvest records
- Bed assignments

---

## PART 3: IMPLEMENTATION PLAN

### Phase 1: Foundation (CRITICAL - Do First)

#### 1.1 Consolidate API URLs
- [ ] Determine the CORRECT current API deployment URL
- [ ] Update ALL HTML files to use single `api-config.js`
- [ ] Remove hardcoded API_URL from individual files
- [ ] Test connectivity

#### 1.2 Implement Auth Guard
- [ ] Create `auth-guard.js` - shared authentication module
- [ ] Add session check to ALL protected pages
- [ ] Redirect unauthorized users to login.html
- [ ] Pass role info to pages for conditional rendering

#### 1.3 Clean Up File Structure
- [ ] Remove duplicate/legacy files (files with version suffixes like "_PRODUCTION (1)")
- [ ] Establish naming convention
- [ ] Organize into logical folders

### Phase 2: Permission Enforcement

#### 2.1 Frontend Permission Checks
- [ ] Add role-based menu visibility
- [ ] Hide/show features based on user role
- [ ] Disable unauthorized actions in UI

#### 2.2 Backend Permission Checks
- [ ] Add session token validation to API
- [ ] Check role before returning sensitive data
- [ ] Log access attempts

### Phase 3: Mobile App Architecture

#### 3.1 Mobile-First Design
- [ ] Identify mobile-use pages (employee, driver, field)
- [ ] Ensure responsive design
- [ ] Add PWA manifest for "Add to Home Screen"
- [ ] Implement offline support with sync

#### 3.2 Desktop Dashboard
- [ ] Design master dashboard layout
- [ ] Implement tabbed/sidebar navigation
- [ ] Add quick-action widgets

### Phase 4: Data Connectivity

#### 4.1 Replace Demo Data
- [ ] Verify each page can fetch real data from API
- [ ] Remove demo data fallbacks (or make them dev-only)
- [ ] Add proper error handling

#### 4.2 CRUD Operations
- [ ] Verify Create works for all entities
- [ ] Verify Update works for all entities
- [ ] Verify Delete works with proper permissions
- [ ] Add confirmation dialogs for destructive actions

---

## PART 4: FILE INVENTORY

### Root HTML Files (Production)
| File | Purpose | Auth Required | Mobile Ready | Status |
|------|---------|---------------|--------------|--------|
| index.html | Main dashboard | Yes | No | Needs auth |
| login.html | Authentication | No | Yes | Working |
| employee.html | Crew app | Yes | Yes | Working |
| greenhouse.html | Greenhouse tracking | Yes | Partial | Needs auth |
| labels.html | Label printing | Yes | No | Needs auth |
| planning.html | Crop planning | Yes | No | Needs auth |
| succession.html | Succession wizard | Yes | No | Needs auth |
| soil-tests.html | Soil analysis | Yes | No | Has auth |
| sowing-sheets.html | Sowing records | Yes | No | Needs auth |
| calendar.html | Calendar view | Yes | No | Needs auth |
| mobile.html | Mobile dashboard | Yes | Yes | Needs auth |
| bed_assignment_COMPLETE.html | Bed assignment | Yes | No | Needs auth |
| field_app_mobile.html | Field kiosk | Yes | Yes | Needs auth |
| seed_inventory_PRODUCTION.html | Seed tracking | Yes | No | Needs auth |
| smart_learning_DTM.html | DTM analytics | Yes | No | Needs auth |
| gantt_FINAL.html | Gantt timeline | Yes | No | Needs auth |
| gantt_CROP_VIEW_FINAL.html | Crop Gantt | Yes | No | Needs auth |
| visual_calendar_PRODUCTION.html | Visual calendar | Yes | No | Needs auth |
| greenhouse_labels_PRODUCTION.html | GH labels | Yes | No | Needs auth |

### Web App Folder (Production)
| File | Purpose | Auth Required | User Type | Status |
|------|---------|---------------|-----------|--------|
| index.html | App hub | No | All | Info page |
| sales.html | Sales dashboard | Manager+ | Staff | Needs auth |
| customer.html | Customer ordering | Customer | Customer | Has auth |
| driver.html | Delivery app | Driver | Driver | Has auth |
| csa.html | CSA portal | Customer | CSA Member | Has auth |
| wholesale.html | Wholesale portal | Customer | Wholesale | Has auth |
| labels.html | Market labels | Manager+ | Staff | Needs auth |
| financial-dashboard.html | Financials | Admin | Owner only | Needs auth |
| wealth-builder.html | Investment | Admin | Owner only | Needs auth |
| marketing-command-center.html | Marketing | Manager+ | Staff | Needs auth |
| field-planner.html | Field planning | Manager+ | Staff | Needs auth |

### Files to Deprecate/Merge
| File | Reason | Action |
|------|--------|--------|
| master_dashboard_FIXED.html | Duplicate of index.html | Merge/delete |
| succession_planner_CONNECTED.html | Duplicate | Delete |
| farm-operations.html | Unclear purpose | Review |
| track.html | Uses different API | Review |
| api_diagnostic.html | Dev tool | Keep for debug only |

---

## PART 5: SHARED COMPONENTS (To Create)

### auth-guard.js
```javascript
// Check session on page load
// Redirect to login if no valid session
// Provide getUserRole() function
// Provide hasPermission(action) function
```

### api-config.js (Update)
- Single source of truth for API URL
- Export all API classes
- Handle offline detection

### nav-component.js
- Shared navigation component
- Role-based menu items
- Mobile hamburger menu

### styles-shared.css
- Common styling variables
- Dark theme
- Responsive breakpoints

---

## PART 6: QUESTIONS FOR OTHER CLAUDE SESSIONS

If you're working with other Claude instances, you may need this info:

### For Apps Script/Backend Claude:
1. What is the CURRENT deployed API URL that's working?
2. Is session token validation implemented in the backend?
3. Are all 50+ endpoints live and tested?

### For Frontend/UI Claude:
1. Should we use a framework (React/Vue) or stay vanilla JS?
2. What's the mobile-first priority list?
3. Any specific UI/UX requirements?

### For Financial Module Claude:
1. Is Plaid actually connected or still mock?
2. Is Alpaca connected or still mock?
3. What data is real vs demo in wealth-builder?

---

## PART 7: NEXT ACTIONS (Prioritized)

### IMMEDIATE (This Session)
1. ~~**Find the correct API URL**~~ DONE - Consolidated to single URL
2. ~~**Create auth-guard.js**~~ DONE - Created `web_app/auth-guard.js`
3. ~~**Update api-config.js**~~ DONE - Single source of truth established
4. ~~**Update all HTML files**~~ DONE - 30 files updated with correct URL

### SHORT TERM (Next Priority)
5. **Add auth-guard.js to all unprotected pages** - IN PROGRESS
6. Implement role-based conditional rendering
7. Test all API endpoints are working

### MEDIUM TERM (This Month)
7. PWA setup for mobile install
8. Offline sync implementation
9. Remove all demo data fallbacks
10. Full end-to-end testing

---

## PART 8: ADMIN PANEL STATUS (web_app/admin.html)

**Created:** 2026-01-15
**Location:** `web_app/admin.html`
**Access:** Admin role only (enforced by auth-guard.js)

### Features - WORKING

| Feature | Status | Notes |
|---------|--------|-------|
| View All Users | WORKING | Lists users from USERS sheet |
| System Status Check | WORKING | Tests API connectivity |
| Permission Matrix | WORKING | Visual display of role permissions |
| Role Documentation | WORKING | Shows all roles and their access |

### BUG FOUND - Requires Backend Fix

| Feature | Issue | Fix Required |
|---------|-------|--------------|
| Add New User | `createUser` function exists but NOT wired to switch statement | Add `case 'createUser': return jsonResponse(createUser(data));` to doPost |

### Features - NEEDS BACKEND

| Feature | Required API | Sheet Needed |
|---------|--------------|--------------|
| Edit User | `updateUser` | USERS (exists) |
| Deactivate User | `deactivateUser` | USERS (exists) |
| Reset User PIN | `resetUserPin` | USERS (exists) |
| Active Sessions | `getActiveSessions` | SESSIONS (new) |
| Force Logout | `forceLogout` | SESSIONS (new) |
| Audit Log | `getAuditLog` | AUDIT_LOG (new) |
| Log Admin Action | `logAdminAction` | AUDIT_LOG (new) |

### Backend Implementation Guide

**For Apps Script team - add these to MERGED TOTAL.js:**

```javascript
// 1. updateUser - Edit user details
case 'updateUser':
  return jsonResponse(updateUser(e.parameter));

// 2. deactivateUser - Disable user account
case 'deactivateUser':
  return jsonResponse(deactivateUser(e.parameter));

// 3. resetUserPin - Generate new PIN
case 'resetUserPin':
  return jsonResponse(resetUserPin(e.parameter));

// 4. getActiveSessions - List logged-in users (requires SESSIONS sheet)
case 'getActiveSessions':
  return jsonResponse(getActiveSessions());

// 5. forceLogout - Invalidate a session
case 'forceLogout':
  return jsonResponse(forceLogout(e.parameter));

// 6. getAuditLog - Get activity history (requires AUDIT_LOG sheet)
case 'getAuditLog':
  return jsonResponse(getAuditLog(e.parameter));

// 7. logAdminAction - Record admin activity
case 'logAdminAction':
  return jsonResponse(logAdminAction(e.parameter));
```

**New Sheets Required:**

1. **SESSIONS** - Track active logins
   - Columns: Session_ID, User_ID, Token, Login_Time, Last_Activity, IP_Address, Device

2. **AUDIT_LOG** - Track admin actions
   - Columns: Log_ID, Timestamp, User_ID, Action, Target_Type, Target_ID, Details, IP_Address

---

## PART 9: USER DOCUMENTATION

### Overview

Comprehensive user documentation has been created for all user roles, covering both desktop and mobile usage.

### Master Documentation
| Document | Location | Purpose |
|----------|----------|---------|
| USER_MANUAL.md | `/USER_MANUAL.md` | Complete reference manual for all roles |

### Quick Start Guides (Printable)
| Guide | Location | Target User |
|-------|----------|-------------|
| Admin Quick Start | `/docs/quick-start/ADMIN_QUICK_START.md` | System administrators |
| Manager Quick Start | `/docs/quick-start/MANAGER_QUICK_START.md` | Farm managers |
| Field Lead Quick Start | `/docs/quick-start/FIELD_LEAD_QUICK_START.md` | Field supervisors |
| Employee Quick Start | `/docs/quick-start/EMPLOYEE_QUICK_START.md` | Farm crew members |
| Driver Quick Start | `/docs/quick-start/DRIVER_QUICK_START.md` | Delivery drivers |
| Customer Quick Start | `/docs/quick-start/CUSTOMER_QUICK_START.md` | External customers |

### Documentation Features
- Role-specific access information (what they CAN and CANNOT do)
- Daily workflow checklists
- App URLs and navigation
- Troubleshooting guides
- Escalation procedures
- Mobile app instructions (add to home screen)

### Keeping Documentation Updated
When adding new features:
1. Update USER_MANUAL.md with full details
2. Update relevant quick-start guide(s)
3. Note the change in this architecture doc

---

## CHANGELOG

| Date | Change | By |
|------|--------|-----|
| 2026-01-15 | Created comprehensive user documentation (USER_MANUAL.md + 6 quick-start guides) | Claude (Architect) |
| 2026-01-15 | Built production-ready Admin Panel (web_app/admin.html) | Claude (Architect) |
| 2026-01-15 | Finalized permission tiers with user input | Claude (Architect) |
| 2026-01-15 | Consolidated all 30 HTML files to single API URL | Claude (Architect) |
| 2026-01-15 | Created auth-guard.js for unified authentication | Claude (Architect) |
| 2026-01-15 | Created API_CONFIG.md reference file | Claude (Architect) |
| 2026-01-15 | Initial audit and architecture document created | Claude (Architect) |

---

*This document should be updated as the project evolves. It serves as the central reference for all development efforts.*
