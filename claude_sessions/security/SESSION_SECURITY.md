# Session Security Review
## Tiny Seed OS Session Management Analysis
## Date: 2026-01-17

---

## Current Implementation

### Session Storage

| Attribute | Value | Location |
|-----------|-------|----------|
| Storage Method | localStorage | Browser |
| Session Key | `tinyseed_session` | auth-guard.js:32 |
| Expiry | 24 hours | auth-guard.js:35 |
| Format | JSON object | Serialized |

### Session Data Structure

```javascript
{
    userId: "USR-001",
    username: "todd",
    fullName: "Todd",
    role: "Admin",
    email: "",
    timestamp: 1705468800000  // Login time
}
```

### Current Session Flow

```
1. User enters PIN on login.html
2. Frontend calls authenticateUser(username, pin)
3. Backend verifies against USERS sheet
4. On success, frontend stores session in localStorage
5. auth-guard.js checks localStorage on each page load
6. After 24 hours, session expires (client-side check)
```

---

## Security Analysis

### Strengths

| Feature | Benefit |
|---------|---------|
| 24-hour expiry | Limits exposure window |
| Role-based access | Granular permissions |
| Auto-logout | Clears session on expiry |
| No password storage | PINs not stored client-side |

### Weaknesses

| Issue | Risk | Impact |
|-------|------|--------|
| Client-side only | HIGH | Sessions can be forged |
| No server validation | HIGH | Backend trusts client |
| No logout tracking | MEDIUM | Can't revoke sessions |
| No concurrent limits | LOW | Multiple device access |
| localStorage persistent | MEDIUM | Survives browser close |

---

## Session Timeout Analysis

### Current: 24 Hours

```javascript
SESSION_EXPIRY: 24 * 60 * 60 * 1000  // 86,400,000 ms
```

### Recommendation by Role

| Role | Recommended Timeout | Reason |
|------|---------------------|--------|
| Admin | 4 hours | Highest privilege |
| Manager | 8 hours | Workday length |
| Field_Lead | 12 hours | Extended field work |
| Employee | 12 hours | Extended field work |
| Driver | 8 hours | Delivery routes |
| Customer | 30 days | Convenience |

### Inactivity Timeout

Currently not implemented. Recommend:

```javascript
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

let lastActivity = Date.now();

document.addEventListener('click', () => {
    lastActivity = Date.now();
});

setInterval(() => {
    if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        AuthGuard.clearSession();
        window.location.href = 'login.html?reason=inactivity';
    }
}, 60000); // Check every minute
```

---

## Token Rotation

### Current State

**NOT IMPLEMENTED** - Session token (timestamp) never changes.

### Recommended Implementation

```javascript
// Rotate session token every hour
function rotateSession() {
    const session = AuthGuard.getSession();
    if (!session) return;

    const oneHour = 60 * 60 * 1000;
    if (Date.now() - session.lastRotation > oneHour) {
        session.token = generateToken();
        session.lastRotation = Date.now();
        localStorage.setItem(AUTH_CONFIG.SESSION_KEY, JSON.stringify(session));
    }
}

function generateToken() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
```

---

## Concurrent Session Handling

### Current State

**NO LIMITS** - User can have unlimited sessions across devices.

### Options

| Option | Implementation | Trade-off |
|--------|---------------|-----------|
| Single session | New login invalidates previous | Inconvenient but secure |
| Device limit (3) | Track device fingerprints | Balanced approach |
| Unlimited | Current state | Convenient but risky |

### Recommendation

For a farm operation, allow 3 concurrent sessions:
- Office computer
- Personal phone
- Tablet in field

```javascript
// Server-side session tracking
function createSession(userId) {
    const sessions = getActiveSessions(userId);
    if (sessions.length >= 3) {
        // Invalidate oldest session
        invalidateSession(sessions[0].token);
    }
    // Create new session
}
```

---

## Logout Behavior

### Current Implementation

```javascript
clearSession() {
    localStorage.removeItem(AUTH_CONFIG.SESSION_KEY);
    localStorage.removeItem('driver_session');
    localStorage.removeItem('customer_session');
}
```

### Issues

1. **No server notification** - Backend doesn't know about logout
2. **No audit logging** - Logout events not recorded
3. **Shared device risk** - Previous user's data may remain cached

### Recommended Improvements

```javascript
async function logout() {
    const session = AuthGuard.getSession();

    // Notify server (audit logging)
    await fetch(`${API_URL}?action=logoutUser&token=${session.token}`);

    // Clear all local data
    localStorage.clear();
    sessionStorage.clear();

    // Clear any cached data
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    // Redirect to login
    window.location.href = 'login.html?reason=logout';
}
```

---

## Password/PIN Change Handling

### Current State

**SESSIONS NOT INVALIDATED** - Changing PIN doesn't affect existing sessions.

### Risk

If a PIN is compromised and changed:
- Attacker still has valid session until expiry
- Up to 24 hours of unauthorized access

### Recommended Fix

```javascript
// When PIN is changed
function changePin(userId, newPin) {
    // Update PIN in USERS sheet
    updateUserPin(userId, newPin);

    // Invalidate all sessions for this user
    invalidateAllUserSessions(userId);

    // Force re-login
    return { success: true, message: 'PIN changed. Please log in again.' };
}

function invalidateAllUserSessions(userId) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ACTIVE_SESSIONS');
    // Find and delete all rows for this user
}
```

---

## Multi-Device Session Management

### Current State

No tracking of which devices have sessions.

### Recommended: Device Fingerprinting

```javascript
function getDeviceFingerprint() {
    return {
        userAgent: navigator.userAgent,
        screen: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language
    };
}

// Store with session
{
    userId: "USR-001",
    device: getDeviceFingerprint(),
    createdAt: Date.now(),
    lastActivity: Date.now()
}
```

### Session Management UI

```html
<!-- Show active sessions to user -->
<div class="active-sessions">
    <h3>Active Sessions</h3>
    <ul>
        <li>Chrome on MacOS - Office (current)</li>
        <li>Safari on iPhone - 2 hours ago</li>
        <li>Chrome on Android - Yesterday</li>
    </ul>
    <button onclick="logoutOtherDevices()">Log out other devices</button>
</div>
```

---

## Secure Session Storage

### Current: localStorage

| Pros | Cons |
|------|------|
| Persistent | XSS vulnerable |
| Simple | Shared across tabs |
| 5MB+ capacity | No expiry mechanism |

### Alternative: sessionStorage

| Pros | Cons |
|------|------|
| Tab-isolated | Not persistent |
| Auto-clears | Inconvenient for users |
| XSS vulnerable | Same origin policy |

### Alternative: HttpOnly Cookies

| Pros | Cons |
|------|------|
| XSS protected | Requires server support |
| Automatic expiry | Apps Script limitation |
| Standard approach | More complex |

### Recommendation

Keep localStorage but add:
1. Token rotation
2. Server-side validation
3. Inactivity timeout

---

## Implementation Recommendations

### Phase 1: Quick Wins

| Change | Effort | Impact |
|--------|--------|--------|
| Add inactivity timeout | LOW | HIGH |
| Log logout events | LOW | MEDIUM |
| Clear cache on logout | LOW | MEDIUM |

### Phase 2: Server-Side Sessions

| Change | Effort | Impact |
|--------|--------|--------|
| Create ACTIVE_SESSIONS sheet | MEDIUM | HIGH |
| Server-side token validation | MEDIUM | HIGH |
| Invalidate on PIN change | MEDIUM | HIGH |

### Phase 3: Advanced

| Change | Effort | Impact |
|--------|--------|--------|
| Role-based timeout | MEDIUM | MEDIUM |
| Device fingerprinting | MEDIUM | MEDIUM |
| Concurrent session limits | HIGH | MEDIUM |

---

## Summary

| Aspect | Current | Recommended |
|--------|---------|-------------|
| Storage | localStorage | Keep + add server validation |
| Timeout | 24 hours | Role-based (4-12 hours) |
| Inactivity | None | 30 minutes |
| Rotation | None | Hourly |
| Concurrent | Unlimited | 3 devices |
| PIN change | No invalidation | Invalidate all |
| Logout | Client only | + server notification |

---

*Review completed by Security Claude*
*2026-01-17*
