# Permission Model Audit
## Tiny Seed OS Security Assessment
## Date: 2026-01-17

---

## Executive Summary

The Tiny Seed OS uses a **client-side session management** system with role-based access control. Authentication is handled via PIN verification against a Google Sheets USERS table, with session data stored in browser localStorage.

**Critical Finding:** Backend API endpoints have **NO authentication checks** - they trust the client completely. This is a significant security gap.

---

## 1. Role Hierarchy

### Defined Roles (auth-guard.js lines 42-49)

| Role | Level | Description |
|------|-------|-------------|
| Admin | 5 | Full system access, financials, bypass geofence |
| Manager | 4 | Planning, reports, employees, sales, inventory |
| Field_Lead | 3 | View plans, tasks, harvest, greenhouse, sowing |
| Driver | 2 | Delivery routes, can switch to Employee mode |
| Employee | 1 | Timeclock, tasks, harvest, greenhouse seeding |
| Customer | 0 | Ordering, account management |

### Role Comparison Logic

```javascript
// Higher level = more access
hasMinimumRole(requiredRole) {
    return userRoleLevel >= requiredRoleLevel;
}
```

---

## 2. Permission Matrix

### Page Access (from auth-guard.js and my secured pages)

| Page | Required Role | Secured? |
|------|---------------|----------|
| **Admin Only** | | |
| financial-dashboard.html | Admin | YES |
| wealth-builder.html | Admin | YES |
| **Manager+** | | |
| sales.html | Manager | YES |
| marketing-command-center.html | Manager | YES |
| field-planner.html | Manager | YES |
| planning.html | Manager | YES |
| succession.html | Manager | YES |
| bed_assignment_COMPLETE.html | Manager | YES |
| seed_inventory_PRODUCTION.html | Manager | YES |
| labels.html (root) | Manager | YES |
| **Field_Lead+** | | |
| greenhouse.html | Field_Lead | YES |
| sowing-sheets.html | Field_Lead | YES |
| field_app_mobile.html | Field_Lead | YES |
| greenhouse_labels_PRODUCTION (1).html | Field_Lead | YES |
| gantt_FINAL.html | Field_Lead | YES |
| gantt_CROP_VIEW_FINAL.html | Field_Lead | YES |
| **Employee+** | | |
| index.html | Employee | YES |
| master_dashboard_FIXED.html | Employee | YES |
| calendar.html | Employee | YES |
| visual_calendar_PRODUCTION (1).html | Employee | YES |
| mobile.html | Employee | YES |
| smart_learning_DTM.html | Employee | YES |
| web_app/labels.html | Employee | YES |
| farm-operations.html | Employee | YES |
| track.html | Employee | YES |
| **Public** | | |
| login.html | None | N/A |
| api_diagnostic.html | None | N/A |

---

## 3. Feature Permissions

### Admin-Only Features

| Permission | Description |
|------------|-------------|
| `all` | Full access to everything |
| `financials` | Bank accounts, investments, debt tracking |
| `timeclock` | Owner tracks hours |
| `bypass_geofence` | Clock in from anywhere |

### Manager Features

| Permission | Description |
|------------|-------------|
| `planning` | View and modify crop plans |
| `reports` | All reports |
| `employees` | Manage staff |
| `sales` | Sales dashboard |
| `inventory` | Inventory management |
| `scheduling` | Task scheduling |

### Field_Lead Features

| Permission | Description |
|------------|-------------|
| `planning_view` | View plans only (cannot modify) |
| `tasks` | Execute and manage tasks |
| `harvest` | Log harvests |
| `greenhouse` | Greenhouse operations |
| `sowing` | Sowing operations |

### Employee Features

| Permission | Description |
|------------|-------------|
| `timeclock` | Clock in/out |
| `tasks` | View and complete assigned tasks |
| `harvest` | Log harvests |
| `greenhouse_seeding` | Greenhouse seeding work |
| `scouting` | Field scouting/pest reports |

### Driver Features

| Permission | Description |
|------------|-------------|
| `delivery` | Delivery routes |
| `routes` | Route management |
| `employee_mode` | Can switch to Employee mode |

### Customer Features

| Permission | Description |
|------------|-------------|
| `ordering` | Place orders |
| `account` | Manage their account |

---

## 4. Session Management

### Session Storage

- **Location:** Browser localStorage
- **Key:** `tinyseed_session`
- **Expiry:** 24 hours (AUTH_CONFIG.SESSION_EXPIRY)

### Session Data Structure

```javascript
{
    userId: "USR-001",
    username: "todd",
    fullName: "Todd",
    role: "Admin",
    timestamp: 1705468800000
}
```

### Session Validation

- Client-side only (auth-guard.js)
- Backend `validateSession()` does minimal validation
- **Gap:** No server-side session store

---

## 5. Security Gaps Identified

### CRITICAL: No Backend Authentication

**Location:** `apps_script/MERGED TOTAL.js` lines 79-898

**Issue:** All API endpoints execute without authentication checks. Any request with the correct action parameter will execute.

```javascript
// Example: getUsers() has NO auth check
case 'getUsers':
    return jsonResponse(getUsers(e.parameter));
```

**Impact:** Anyone with the API URL can:
- Retrieve all user data
- Modify inventory
- Log harvests
- Access financial data

**Recommendation:** Add authentication check to every sensitive endpoint.

---

### HIGH: Client-Side Trust Model

**Issue:** Session validation relies entirely on client-side JavaScript. A malicious actor can:
1. Manually set localStorage with fake session
2. Bypass auth-guard.js by disabling JavaScript
3. Call API endpoints directly

**Recommendation:** Implement server-side session validation for sensitive operations.

---

### MEDIUM: No Rate Limiting

**Issue:** API endpoints have no rate limiting or abuse protection.

**Impact:** Vulnerable to:
- Brute force attacks
- Data scraping
- Denial of service

**Recommendation:** Implement rate limiting via Google Apps Script quotas or custom logic.

---

### MEDIUM: PIN-Based Authentication

**Issue:** Authentication uses 4-digit PINs stored in Google Sheets.

**Security concerns:**
- PINs are short (10,000 combinations)
- No lockout after failed attempts
- PINs visible to anyone with sheet access

**Recommendation:**
- Increase PIN length or use passwords
- Add failed attempt lockout
- Move to Google OAuth or token-based auth

---

### LOW: Session Not Invalidated on Password Change

**Issue:** When a user's PIN is changed, existing sessions remain valid.

**Recommendation:** Implement session invalidation on credential change.

---

## 6. Geofence Bypass

### Implementation

Only Admin role can bypass geofence for time clock (auth-guard.js line 97):

```javascript
GEOFENCE_BYPASS_ROLES: ['Admin']
```

### Purpose

Allows owner to clock in from home office or while traveling.

### Security Consideration

Consider adding Manager to bypass list for flexibility, or implementing location logging without enforcement.

---

## 7. Dual-Mode Users

### Implementation

Driver role can switch to Employee mode (auth-guard.js lines 100-101):

```javascript
DUAL_MODE_ROLES: ['Driver']
```

### Behavior

When in Employee mode, Driver gets Employee permissions in addition to Driver permissions.

### Security Consideration

This is appropriate - Drivers may need to log hours or perform farm tasks.

---

## 8. Recommendations Summary

| Priority | Issue | Fix |
|----------|-------|-----|
| CRITICAL | No backend auth | Add auth checks to all sensitive endpoints |
| HIGH | Client-side trust | Implement server-side session validation |
| MEDIUM | No rate limiting | Add request throttling |
| MEDIUM | Weak PINs | Increase complexity, add lockout |
| LOW | Session persistence | Invalidate on credential change |

---

## 9. Files Reviewed

- `/web_app/auth-guard.js` - Frontend authentication
- `/apps_script/MERGED TOTAL.js` - Backend API endpoints
- All 25 secured HTML pages

---

*Audit completed by Security Claude*
*2026-01-17*
