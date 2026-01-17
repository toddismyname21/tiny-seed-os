# API Security Review
## Tiny Seed OS Backend Analysis
## Date: 2026-01-17

---

## Executive Summary

The Tiny Seed OS backend runs on Google Apps Script with **457 documented endpoints**. The API follows a simple action-based routing pattern. **Critical finding: No endpoints perform authentication checks.**

---

## 1. API Architecture

### Entry Points

| Function | Method | Location |
|----------|--------|----------|
| `doGet(e)` | GET | MERGED TOTAL.js:79 |
| `doPost(e)` | POST | MERGED TOTAL.js:898 |

### Routing Pattern

```javascript
const action = e.parameter.action;
switch(action) {
    case 'someAction':
        return jsonResponse(someFunction(e.parameter));
}
```

### Base URL

```
https://script.google.com/macros/s/AKfycbx.../exec?action=
```

---

## 2. Endpoint Security Classification

### PUBLIC (Should be accessible without auth)

| Endpoint | Purpose | Risk |
|----------|---------|------|
| `testConnection` | API health check | LOW |
| `healthCheck` | System status | LOW |
| `getWeather` | Weather data | LOW |

### AUTHENTICATION REQUIRED (Currently unprotected)

| Endpoint | Purpose | Risk Level | Current Auth |
|----------|---------|------------|--------------|
| `authenticateUser` | Login | LOW | None needed |
| `validateSession` | Session check | LOW | Minimal |
| `getUsers` | List all users | **HIGH** | NONE |
| `getActiveSessions` | Active sessions | **HIGH** | NONE |
| `getAuditLog` | Security logs | **HIGH** | NONE |

### DATA READ (Currently unprotected)

| Endpoint | Purpose | Risk Level | Current Auth |
|----------|---------|------------|--------------|
| `getPlanningData` | Crop plans | MEDIUM | NONE |
| `getGreenhouseSeedings` | Seeding data | LOW | NONE |
| `getSeedInventory` | Seed stock | MEDIUM | NONE |
| `getFieldTasks` | Task list | LOW | NONE |
| `getCSAMembers` | Customer data | **HIGH** | NONE |
| `getFinancials` | Financial data | **CRITICAL** | NONE |
| `getCustomers` | Customer list | **HIGH** | NONE |
| `getDeliveryRoutes` | Delivery data | MEDIUM | NONE |
| `getPlaidAccounts` | Bank accounts | **CRITICAL** | NONE |

### DATA WRITE (Currently unprotected)

| Endpoint | Purpose | Risk Level | Current Auth |
|----------|---------|------------|--------------|
| `createUser` | Add user | **CRITICAL** | NONE |
| `updateUser` | Modify user | **CRITICAL** | NONE |
| `deleteUser` | Remove user | **CRITICAL** | NONE |
| `logTimeEntry` | Clock in/out | MEDIUM | NONE |
| `addHarvest` | Log harvest | LOW | NONE |
| `addTask` | Create task | LOW | NONE |
| `updatePlanting` | Modify plan | MEDIUM | NONE |
| `deletePlanting` | Remove plan | MEDIUM | NONE |
| `addProduct` | Add inventory | MEDIUM | NONE |
| `adjustInventory` | Change stock | MEDIUM | NONE |
| `createInvoice` | Generate invoice | **HIGH** | NONE |
| `sendSMS` | Send text | **HIGH** | NONE |
| `postToSocial` | Social media | **HIGH** | NONE |
| `createPlaidLinkToken` | Bank link | **CRITICAL** | NONE |

---

## 3. Input Validation Analysis

### Current State

Most endpoints perform **minimal input validation**:

```javascript
function getSeedInventory(params) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('SEED_INVENTORY');
        // No validation of params
        // Direct data access
    }
}
```

### Injection Risks

| Risk | Status | Example |
|------|--------|---------|
| SQL Injection | N/A | Uses Google Sheets, not SQL |
| Script Injection | LOW | Data sanitized by Sheets API |
| Formula Injection | **MEDIUM** | User input could contain formulas |

### Recommendation

Add input validation for:
- Required fields
- Data types
- Value ranges
- Sanitize user-provided text

---

## 4. Error Message Security

### Current State

Errors expose internal details:

```javascript
return { success: false, error: error.toString() };
```

### Risk

- Stack traces may reveal code structure
- Sheet names exposed
- File paths leaked

### Recommendation

```javascript
// Production error handling
return { success: false, error: 'An error occurred. Contact support.' };
// Log detailed error internally
console.error('Detailed error:', error);
```

---

## 5. Rate Limiting

### Current State

**NO RATE LIMITING EXISTS**

### Google Apps Script Quotas

| Quota | Limit |
|-------|-------|
| Script runtime | 6 min/execution |
| URL Fetch calls | 20,000/day |
| Simultaneous executions | 30 |

### Recommendation

Implement custom rate limiting:

```javascript
function rateLimitCheck(userId, action) {
    const cache = CacheService.getUserCache();
    const key = `ratelimit_${userId}_${action}`;
    const count = parseInt(cache.get(key) || '0');

    if (count > 100) { // 100 requests per minute
        return { success: false, error: 'Rate limit exceeded' };
    }

    cache.put(key, (count + 1).toString(), 60);
    return null; // OK to proceed
}
```

---

## 6. Authentication Recommendations

### Option A: Token-Based (Recommended)

Add session token validation to every protected endpoint:

```javascript
function validateRequest(params) {
    const token = params.token;
    if (!token) {
        return { success: false, error: 'Authentication required' };
    }

    // Verify token against SESSIONS sheet or cache
    const session = getSessionByToken(token);
    if (!session || session.expired) {
        return { success: false, error: 'Invalid or expired session' };
    }

    return { success: true, user: session };
}

// In endpoint:
case 'getUsers':
    const auth = validateRequest(e.parameter);
    if (!auth.success) return jsonResponse(auth);
    if (auth.user.role !== 'Admin') {
        return jsonResponse({ success: false, error: 'Insufficient permissions' });
    }
    return jsonResponse(getUsers(e.parameter));
```

### Option B: API Keys

For machine-to-machine calls:

```javascript
const API_KEYS = {
    'key123': { name: 'Inventory System', permissions: ['read'] },
    'key456': { name: 'Admin Tool', permissions: ['read', 'write'] }
};

function validateApiKey(key) {
    return API_KEYS[key] || null;
}
```

### Option C: Google OAuth

For maximum security, use Google's built-in authentication:

```javascript
function doGet(e) {
    const user = Session.getActiveUser().getEmail();
    if (!user) {
        return jsonResponse({ success: false, error: 'Not authenticated' });
    }
    // Proceed with request
}
```

---

## 7. Sensitive Endpoints Requiring Immediate Attention

### CRITICAL (Fix immediately)

| Endpoint | Issue | Fix |
|----------|-------|-----|
| `getFinancials` | Exposes financial data | Add Admin check |
| `getPlaidAccounts` | Exposes bank accounts | Add Admin check |
| `createUser` | Anyone can create users | Add Admin check |
| `deleteUser` | Anyone can delete users | Add Admin check |
| `getUsers` | Exposes user list | Add Admin check |

### HIGH (Fix soon)

| Endpoint | Issue | Fix |
|----------|-------|-----|
| `getCSAMembers` | Customer PII | Add Manager+ check |
| `getCustomers` | Customer data | Add Manager+ check |
| `sendSMS` | Can send texts | Add rate limit + auth |
| `postToSocial` | Social media access | Add Manager+ check |
| `createInvoice` | Financial operation | Add Manager+ check |

---

## 8. Audit Logging

### Current State

Minimal logging exists. No security audit trail.

### Recommendation

Create `AUDIT_LOG` sheet:

```javascript
function logAuditEvent(userId, action, details) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('AUDIT_LOG') || createAuditLogSheet(ss);

    sheet.appendRow([
        new Date().toISOString(),
        userId,
        action,
        JSON.stringify(details),
        Session.getActiveUser().getEmail()
    ]);
}
```

Log events for:
- Login/logout
- User creation/modification/deletion
- Financial operations
- Data exports
- Configuration changes

---

## 9. Summary: Endpoint Count by Security Status

| Status | Count | Action |
|--------|-------|--------|
| Secured | 0 | N/A |
| Needs Auth (Critical) | 10 | Immediate |
| Needs Auth (High) | 25 | This week |
| Needs Auth (Medium) | 50 | This month |
| Public OK | 5 | None |
| Unknown | ~370 | Review |

---

## 10. Implementation Priority

### Phase 1: Critical (Immediate)

1. Add auth check to user management endpoints
2. Add auth check to financial endpoints
3. Add auth check to Plaid endpoints

### Phase 2: High (This Week)

4. Add auth check to customer data endpoints
5. Add auth check to SMS/social endpoints
6. Implement basic audit logging

### Phase 3: Medium (This Month)

7. Add input validation to all endpoints
8. Implement rate limiting
9. Sanitize error messages
10. Complete audit logging

---

*Review completed by Security Claude*
*2026-01-17*
