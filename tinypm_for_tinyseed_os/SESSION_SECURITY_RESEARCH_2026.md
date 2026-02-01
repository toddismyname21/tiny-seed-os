# Session Management & Token Security Research
## Production-Ready Implementation for TinyPM

**Research Date:** January 30, 2026
**Status:** Complete Research with Code Examples
**Audience:** Backend & Frontend Teams

---

## Executive Summary

TinyPM currently uses **Supabase Auth with automatic token refresh**, which is a **production-solid approach**. This research validates the current architecture and provides enhancement recommendations for:

1. **Token storage security** (current vs. optimal)
2. **Silent refresh implementation** to eliminate login friction
3. **Cross-device session handling**
4. **Security headers configuration**
5. **Production token lifetimes**

**Bottom Line:** TinyPM's Supabase integration is secure, but needs explicit session persistence configuration for "don't re-login every 5 minutes" experience.

---

## 1. JWT vs. Session Cookies: Comparative Analysis

### Current TinyPM Architecture
```
User Login → Supabase Issues JWT + Refresh Token → Stored in Browser → Auto-refresh on expiry
```

### Recommendation: Hybrid Approach (Best Practice 2026)

**Trend from research:** Most production apps in 2026 use **JWT inside httpOnly cookies** rather than pure localStorage.

#### Why This Matters for TinyPM

| Aspect | Pure localStorage | httpOnly Cookies | TinyPM Current |
|--------|-------------------|------------------|-----------------|
| **XSS Vulnerable** | Yes - JS can steal | No - JS can't read | Low risk (Supabase handles) |
| **CSRF Vulnerable** | No - needs explicit attach | Yes - auto-sent | N/A (stateless) |
| **Works Cross-Domain** | Yes | Limited (SameSite) | Yes (API calls) |
| **Session Persistence** | Browser close = logout | Survives close | Depends on storage config |
| **Production Status** | Not recommended | Recommended | Good baseline |

#### TinyPM Recommendation
```
Access Token (Short-lived, 1 hour):
  → Store in memory OR httpOnly cookie
  → Auto-refresh 5 min before expiry

Refresh Token (Long-lived, 7-30 days):
  → Store in httpOnly cookie with Secure + SameSite=Lax
  → Only sent to your domain
  → Can rotate on each use
```

**Code Example:**
```javascript
// CURRENT: TinyPM stores in memory (Supabase default)
// Good: Survives page refresh (Supabase persists to localStorage securely)
// Better: Explicit cookie configuration

// Supabase auth config (auth.js)
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,      // Auto-refresh on expiry ✓
        persistSession: true,         // Persist across browser close ✓
        detectSessionInUrl: true,     // Handle OAuth callbacks ✓
        flowType: 'pkce',            // Most secure for browsers ✓

        // ENHANCE: Add explicit storage strategy
        storage: {
            getItem: (key) => {
                // Could use httpOnly cookies via API
                return localStorage.getItem(key);
            },
            setItem: (key, value) => {
                localStorage.setItem(key, value);
            },
            removeItem: (key) => {
                localStorage.removeItem(key);
            }
        }
    }
});
```

---

## 2. Token Refresh Strategies: Production Implementation

### Supabase Auto-Refresh (Current - EXCELLENT)

**How it works in TinyPM:**
```javascript
// From auth.js - Already Implemented!
this._client.auth.onAuthStateChange((event, session) => {
    // Fires when:
    // 1. Token auto-refreshes
    // 2. User signs in
    // 3. User signs out
    this._session = session;
    this._user = session?.user || null;
});
```

Supabase automatically:
1. Checks token expiry every few seconds
2. Refreshes 5 minutes before expiry
3. Updates stored tokens
4. Notifies listeners of state change

### Research Findings on Refresh Strategies

#### 1. **Silent Refresh** (Current - TinyPM already has this!)
```
When: Token expiring soon
How: Background refresh without user interaction
Result: User never sees login screen
Benefit: Seamless experience
Risk: If refresh fails, user suddenly unauthenticated
```

**TinyPM Implementation Status:** ✓ ENABLED via Supabase

#### 2. **Refresh Token Rotation** (Recommended for high-security)
```
Old Approach:
  1. Client sends refresh token
  2. Server issues new access token
  3. Old refresh token still valid (vulnerable to theft)

New Approach (2026):
  1. Client sends refresh token
  2. Server issues new access + new refresh tokens
  3. Old refresh token REVOKED immediately
  4. If old token used again = system detects token theft
```

**TinyPM Enhancement:** Add rotation to oauth_manager.py
```python
# oauth_manager.py - Add to refresh_access_token()

def refresh_access_token(self, refresh_token: str) -> Dict:
    """Refresh token with rotation for enhanced security."""

    # Get current valid token
    token_data = self._load_tokens(user_id)

    if token_data['refresh_token'] != refresh_token:
        # SECURITY ALERT: Old refresh token used!
        # This indicates possible token theft
        logger.warning(f"Token reuse detected for {user_id}")
        self.revoke_tokens(user_id)  # Revoke everything
        raise OAuthBoundaryError("Token theft detected")

    # Exchange refresh token
    new_tokens = self._call_google_api(refresh_token)

    # Rotation: New refresh token issued
    # Old one implicitly invalid (stored in DB as old)
    self.save_tokens_to_supabase(user_id, new_tokens)

    return new_tokens
```

**Status in TinyPM:** oauth_manager.py has foundation, needs rotation enhancement.

#### 3. **Sliding Sessions** (For longer user sessions)
```
Traditional: 1-hour session, user must re-login at 60 min mark
Sliding: Every API call extends session by another hour

Good for: Long-lived applications (TinyPM fits!)
Risk: Session never expires if user stays active
Solution: Set absolute max (e.g., 7 days regardless)
```

---

## 3. Storage Options: Security Analysis for TinyPM

### Current TinyPM Setup: Supabase Default Storage

Supabase uses browser storage adapter (localStorage by default):

```javascript
// Supabase flow:
// 1. Gets JWT from server
// 2. Stores in localStorage (encrypted by browser)
// 3. On page load: restores from localStorage
// 4. Includes in Authorization header automatically
```

### Comparison Matrix

| Storage | XSS Risk | CSRF Risk | Cross-Tab | Performance | Browser Close |
|---------|----------|----------|-----------|-------------|---------------|
| **localStorage** | HIGH - JS can steal | NONE | ✓ Shared | Fast | ✗ Persists (maybe bad) |
| **sessionStorage** | HIGH - JS can steal | NONE | ✗ Isolated | Fast | ✗ Clears |
| **httpOnly Cookie** | NONE - JS blocked | HIGH - auto-sent | ✓ Shared | Slight overhead | Configurable |
| **Memory only** | HIGH - JS access | NONE | ✗ Lost on refresh | Fastest | ✗ Always clears |
| **Service Worker** | MEDIUM | NONE | ✓ Shared | Overhead | ✓ Persistent |

### TinyPM Recommendation

**Hybrid Storage Strategy:**
```javascript
// Store tokens with protection layers

class SecureSessionManager {
    constructor() {
        this.memoryStore = {};           // Primary: in-memory
        this.accessToken = null;          // Never persist access token
        this.refreshTokenKey = 'tinypm_refresh_token';
    }

    /**
     * Store tokens securely
     * Access token: memory only (can't be stolen by XSS when lost on refresh)
     * Refresh token: httpOnly cookie (if available) + fallback to localStorage
     */
    storeTokens(accessToken, refreshToken) {
        // Access token: memory only
        this.accessToken = accessToken;

        // Refresh token: use API to set httpOnly cookie
        // Fallback: localStorage with warning
        this._setRefreshTokenCookie(refreshToken);
    }

    /**
     * Retrieve access token for API calls
     * No API call needed = instant (unlike server sessions)
     */
    getAccessToken() {
        return this.accessToken;
    }

    /**
     * Set refresh token as httpOnly cookie via backend
     */
    async _setRefreshTokenCookie(token) {
        // Option 1: Backend sets cookie for you
        await fetch('/api/auth/set-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ refreshToken: token })
        });

        // Option 2: Fallback to secure localStorage
        localStorage.setItem(
            this.refreshTokenKey,
            JSON.stringify({
                token,
                timestamp: Date.now(),
                // Optionally encrypt with password
                encrypted: this._encryptToken(token)
            })
        );
    }

    _encryptToken(token) {
        // Simple obfuscation (not cryptographic)
        // Real implementation: use TweetNaCl.js or tweetnacl-sealed-boxes
        return btoa(token);  // Base64 encode
    }
}
```

---

## 4. Token Lifetime Standards: Production Benchmarks

### What Major Platforms Use (2026)

Research shows production systems use:

| Platform | Access Token | Refresh Token | Notes |
|----------|--------------|---------------|-------|
| **Google** | 1 hour | 6 months (with reuse detection) | Refresh after 6mo inactivity |
| **Azure AD B2C** | 1 hour | 7-90 days (configurable) | Default 14 days |
| **LinkedIn** | 60 days | 1 year (programmatic) | OAuth2 simplified flow |
| **Auth0** | 24 hours | 30 days | Refresh token rotation enabled |
| **Okta** | 1 hour | 7 days (rotation per use) | Reuse detection built-in |

### TinyPM Recommendation

For a **project management app** used by small farm operations:

```javascript
// Recommended lifetimes for TinyPM

const TOKEN_CONFIG = {
    // Short-lived access token
    // Reason: Minimize window if token is stolen
    accessTokenLifetime: 60 * 60,        // 1 hour

    // Medium-lived refresh token
    // Reason: User doesn't want to re-login constantly
    // but need security boundary
    refreshTokenLifetime: 7 * 24 * 60 * 60,  // 7 days

    // Absolute session max
    // Reason: Even sliding sessions need a hard limit
    maxSessionAge: 30 * 24 * 60 * 60,   // 30 days

    // Inactivity timeout
    // Reason: Auto-logout for security
    inactivityTimeout: 7 * 24 * 60 * 60, // 7 days (can be long for farm ops)
};
```

**Implementation in TinyPM/Supabase:**

```javascript
// Supabase allows configuration via API
// In your backend (supabase_sync.py or API endpoint):

const adminAuthClient = supabase.auth.admin;

// Set session timeout policy
await adminAuthClient.updateUserById(userId, {
    // Supabase uses JWT exp claim
    // Configure in Project Settings → Auth → JWT expiration
    app_metadata: {
        token_lifetime: 3600,        // 1 hour access token
        refresh_lifetime: 604800,    // 7 days refresh token
    }
});
```

---

## 5. Security Headers: Required Configuration for Production

### Critical Headers for TinyPM

TinyPM needs these headers when running in production:

```
# .env configuration for production
CORS_ALLOWED_ORIGINS=https://tinypm.example.com
SESSION_COOKIE_SECURE=true          # HTTPS only
SESSION_COOKIE_HTTPONLY=true        # No JS access
SESSION_COOKIE_SAMESITE=Lax         # CSRF protection
```

### Required Headers in Responses

```javascript
// In Flask/FastAPI backend (web_server.py)

@app.after_request
def add_security_headers(response):
    """Add security headers to all responses."""

    # 1. CORS Configuration (for API calls from web_app)
    response.headers['Access-Control-Allow-Origin'] = os.getenv('CORS_ORIGIN', 'http://localhost:3000')
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'

    # 2. Cookie Security (if using cookies for sessions)
    response.headers['Set-Cookie'] = '; '.join([
        f"sessionid={token}",
        "HttpOnly",              # Can't be stolen by JS
        "Secure",                # HTTPS only
        "SameSite=Lax",         # CSRF protection (Lax: ok for navigation)
        f"Max-Age={7*24*60*60}"  # 7 days
    ])

    # 3. Content Security Policy (XSS protection)
    response.headers['Content-Security-Policy'] = '; '.join([
        "default-src 'self'",
        "script-src 'self' https://cdn.jsdelivr.net https://accounts.google.com",
        "style-src 'self' 'unsafe-inline'",  # Needed for inline styles
        "img-src 'self' https:",
        "connect-src 'self' https://bznidonyuztfplqzkmks.supabase.co https://oauth2.googleapis.com",
        "frame-src https://accounts.google.com",  # OAuth flow
    ])

    # 4. Additional Security Headers
    response.headers['X-Content-Type-Options'] = 'nosniff'          # Prevent MIME type sniffing
    response.headers['X-Frame-Options'] = 'DENY'                    # Clickjacking protection
    response.headers['X-XSS-Protection'] = '1; mode=block'          # Legacy XSS filter
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'  # Force HTTPS for 1 year
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

    return response
```

### CORS Specific Configuration

**Problem:** TinyPM frontend calls backend APIs - needs CORS

```javascript
// For CORS with credentials (auth tokens):

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
};

// Frontend fetch call
const response = await fetch('https://api.tinypm.com/api/tasks', {
    method: 'GET',
    headers,
    credentials: 'include'  // CRITICAL: includes cookies
});

// Backend MUST respond with:
// Access-Control-Allow-Credentials: true
// Access-Control-Allow-Origin: https://tinypm.example.com (NOT wildcard)
```

**Why this matters:** If backend says `Access-Control-Allow-Origin: *` and credentials sent = browser blocks it (security feature).

### SameSite Cookie Attribute

```
SameSite=Strict:
  ✓ Most secure
  ✗ Cookie never sent cross-site (breaks OAuth redirects)

SameSite=Lax: (Recommended for TinyPM)
  ✓ Cookie sent on top-level navigations
  ✓ Cookie NOT sent on cross-site forms/images
  ✓ Works with OAuth flows

SameSite=None:
  ✓ Cookie sent everywhere
  ✗ Requires Secure flag + HTTPS
  ✗ Requires explicit opt-in
  ✗ More vulnerable to CSRF
```

**TinyPM Choice:** `SameSite=Lax` - supports OAuth while protecting against CSRF.

---

## 6. How Supabase Auth Handles Sessions: Architecture Deep Dive

### Supabase Token Flow (What TinyPM Uses)

```
User Login:
├─ 1. Submit email/password to Supabase
├─ 2. Supabase validates, generates JWT
├─ 3. JWT includes:
│  ├─ sub (user ID)
│  ├─ exp (expiration time)
│  ├─ aud (audience/app identifier)
│  └─ custom claims (permissions, metadata)
├─ 4. Also issues separate refresh_token
└─ 5. Returns both to client

Client stores (in TinyPM currently):
├─ access_token → localStorage/memory
└─ refresh_token → localStorage/sessionStorage

Auto-refresh (Supabase background):
├─ Every 3 seconds: check token expiry
├─ If expiring in next 60 seconds:
│  ├─ Send refresh_token to Supabase
│  ├─ Get new access_token
│  └─ Update stored tokens
└─ User never sees interruption ✓
```

### Supabase Session Configuration (TinyPM's setup)

```javascript
// From TinyPM's auth.js - Line 40-46
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,        // ✓ Auto-refresh on expiry
        persistSession: true,          // ✓ Survive page refresh
        detectSessionInUrl: true,      // ✓ OAuth callback handling
        flowType: 'pkce'               // ✓ Secure for web (RFC 7636)
    }
});
```

**What each setting does:**

| Setting | Purpose | TinyPM Status |
|---------|---------|---|
| `autoRefreshToken` | Refresh tokens automatically before expiry | ✓ ENABLED |
| `persistSession` | Save session to storage for next page load | ✓ ENABLED |
| `detectSessionInUrl` | Handle OAuth redirect with `#access_token=...` | ✓ ENABLED |
| `flowType: 'pkce'` | Use PKCE (most secure for SPAs) | ✓ ENABLED |

**Current Status:** TinyPM is configured CORRECTLY for production.

---

## 7. Cross-Device Session Handling: Research & Solution

### The Problem
```
User logs in on phone → Uses app all day
User opens laptop → Has to re-login
```

### Solutions in Order of Implementation Complexity

#### Option 1: **Session Linking** (Recommended for TinyPM)
```javascript
// When user signs in on new device:

class CrossDeviceAuth {
    async signInWithDeviceLink() {
        // 1. User signs in normally
        const { user, session } = await tinypmAuth.signIn(email, password);

        // 2. Store device fingerprint
        const deviceId = this._generateDeviceId();
        const { profile } = await tinypmAuth.getProfile();

        // 3. Save to user_profiles.trusted_devices
        await tinypmAuth.updateProfile({
            trusted_devices: [
                ...profile.trusted_devices || [],
                {
                    id: deviceId,
                    name: navigator.userAgent.substring(0, 50),
                    lastUsed: new Date(),
                    browser: this._detectBrowser()
                }
            ]
        });

        return { user, session };
    }

    _generateDeviceId() {
        // Combination of:
        return `${navigator.platform}|${navigator.language}|${screen.width}x${screen.height}`;
    }

    _detectBrowser() {
        const ua = navigator.userAgent;
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Firefox')) return 'Firefox';
        return 'Unknown';
    }
}
```

#### Option 2: **Shared Refresh Token Storage**
```
⚠ Not recommended - security risk if compromised
Shared auth token between devices = all devices compromised
Better to require fresh login on new device with device confirmation
```

#### Option 3: **Session Sync Service** (Enterprise)
```
For farms with multiple users sharing tablets:
- Central session store (Redis/database)
- User can see "active sessions" list
- Can revoke specific device sessions
- Implemented in user_profiles dashboard
```

**TinyPM Recommendation:** Start with Option 1 (device linking), add Option 3 later if needed.

---

## 8. Validation: Code Examples for Secure Session Handling

### Example 1: Check Token Freshness

```javascript
// In auth-guard.js or session manager

class SessionValidator {
    /**
     * Check if current token is about to expire
     * (5 minute warning)
     */
    isTokenExpiring() {
        const session = tinypmAuth.getSession();
        if (!session) return true;

        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = expiresAt - now;

        // Token expires in less than 5 minutes
        return expiresIn < 300;
    }

    /**
     * Force refresh token right now
     * Useful for sensitive operations
     */
    async refreshTokenNow() {
        const session = tinypmAuth.getSession();
        if (!session) throw new Error('Not authenticated');

        // Call Supabase directly
        const { data, error } = await tinypmAuth.getClient()
            .auth.refreshSession();

        if (error) {
            console.error('Token refresh failed:', error);
            throw error;
        }

        return data.session;
    }

    /**
     * Validate token on every API call
     * (Optional, Supabase handles this automatically)
     */
    async validateBeforeApiCall() {
        if (this.isTokenExpiring()) {
            try {
                await this.refreshTokenNow();
            } catch (e) {
                // Token refresh failed - user needs to re-login
                await tinypmAuth.signOut();
                window.location.href = '/auth';
                return false;
            }
        }
        return true;
    }
}
```

### Example 2: Logout on All Devices

```javascript
// For security-sensitive scenarios
// (Password change, detected breach, etc.)

class SessionManagement {
    /**
     * Logout user on ALL devices
     * Implemented via Supabase's "sign out other sessions"
     */
    async signOutAllDevices() {
        const user = tinypmAuth.getCurrentUser();
        if (!user) throw new Error('Not authenticated');

        // Supabase method: sign out all sessions except current
        // (Revokes all refresh tokens for this user)
        const { error } = await tinypmAuth.getClient()
            .auth.signOut({ scope: 'others' });

        if (error) {
            console.error('Failed to sign out other devices:', error);
            throw error;
        }

        // Then sign out current device
        await tinypmAuth.signOut();
    }

    /**
     * List active sessions (requires database query)
     */
    async getActiveSessions() {
        const user = tinypmAuth.getCurrentUser();
        if (!user) return [];

        const { data, error } = await tinypmAuth.getClient()
            .from('user_sessions')
            .select('*')
            .eq('user_id', user.id)
            .gt('expires_at', new Date().toISOString());

        if (error) {
            console.error('Failed to load sessions:', error);
            return [];
        }

        return data;
    }

    /**
     * Revoke specific session (device)
     */
    async revokeSession(sessionId) {
        const { error } = await tinypmAuth.getClient()
            .from('user_sessions')
            .delete()
            .eq('id', sessionId)
            .eq('user_id', tinypmAuth.getCurrentUser().id);

        if (error) throw error;
    }
}
```

### Example 3: Detect Session Hijacking

```javascript
// Monitor for suspicious session activity

class SessionSecurityMonitor {
    constructor() {
        this.lastLocation = null;
        this.lastUserAgent = null;
    }

    /**
     * Initialize session monitoring
     */
    init() {
        // Check location on every page load
        this.checkLocationChange();

        // Monitor user agent changes (browser/device change)
        this.checkUserAgentChange();

        // Listen for auth state changes
        tinypmAuth.onAuthStateChange((event, session) => {
            if (event === 'SESSION_UPDATED') {
                this.validateSessionIntegrity(session);
            }
        });
    }

    /**
     * Detect IP address changes
     * (Backend should track this)
     */
    async checkLocationChange() {
        const { ip } = await this._getClientIp();

        if (this.lastLocation && ip !== this.lastLocation) {
            console.warn('⚠️ IP address changed - possible hijacking');
            this._triggerSecurityAlert('IP_CHANGED', ip);
        }

        this.lastLocation = ip;
    }

    /**
     * Detect browser/device changes
     * (Client-side check)
     */
    checkUserAgentChange() {
        const currentUA = navigator.userAgent;

        if (this.lastUserAgent && currentUA !== this.lastUserAgent) {
            console.warn('⚠️ User agent changed - possible device change');
            this._triggerSecurityAlert('DEVICE_CHANGED', currentUA);
        }

        this.lastUserAgent = currentUA;
    }

    /**
     * Validate session integrity
     * Called after token refresh
     */
    async validateSessionIntegrity(session) {
        // Check that user ID hasn't changed
        const user = tinypmAuth.getCurrentUser();
        if (session.user?.id !== user?.id) {
            console.error('🚨 SECURITY ALERT: Session user ID changed!');
            await this._handleSecurityBreach();
        }

        // Check token structure
        try {
            const decoded = this._decodeJWT(session.access_token);
            if (!decoded.sub || !decoded.aud) {
                throw new Error('Invalid JWT structure');
            }
        } catch (e) {
            console.error('🚨 SECURITY ALERT: Invalid token detected');
            await this._handleSecurityBreach();
        }
    }

    async _triggerSecurityAlert(type, data) {
        // Log to backend for security team review
        await fetch('/api/auth/security-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                alertType: type,
                timestamp: new Date(),
                data
            })
        });
    }

    async _handleSecurityBreach() {
        // Sign out all devices
        await SessionManagement.signOutAllDevices();
        // Notify user
        alert('Security breach detected. Please log in again.');
    }

    async _getClientIp() {
        // Backend endpoint that returns client IP
        const response = await fetch('/api/auth/client-ip');
        return response.json();
    }

    _decodeJWT(token) {
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Invalid JWT');
        const payload = JSON.parse(atob(parts[1]));
        return payload;
    }
}
```

---

## 9. Implementation Checklist for TinyPM

### Immediate (Already Done)
- [x] Supabase Auth with auto-refresh enabled
- [x] OAuth2 + email/password authentication
- [x] Session persistence across page reloads
- [x] Auth guard for route protection
- [x] Token in Authorization header for API calls

### Short-term (1-2 weeks)
- [ ] Add CORS headers to `web_server.py`
- [ ] Add CSP security headers
- [ ] Configure `SameSite=Lax` for any cookies set
- [ ] Document security headers in `.env.example`
- [ ] Add `SESSION_MAX_AGE` configuration (30 days)
- [ ] Implement token validation before sensitive operations

### Medium-term (1 month)
- [ ] Add refresh token rotation to `oauth_manager.py`
- [ ] Implement device linking system (user_profiles.trusted_devices)
- [ ] Create session revocation endpoint (`/api/auth/revoke-session`)
- [ ] Add session monitoring and suspicious activity detection
- [ ] Implement cross-device logout (`signOut({ scope: 'others' })`)

### Long-term (2-3 months)
- [ ] Add IP-based session binding
- [ ] Implement geolocation-based alerts
- [ ] Build session management dashboard for users
- [ ] Add FIDO2 security key support
- [ ] Implement step-up authentication for sensitive operations

---

## 10. Supabase-Specific Recommendations

### Configuration in `tinypm` Environment

```bash
# .env file for TinyPM

# Supabase (already set)
SUPABASE_URL=https://bznidonyuztfplqzkmks.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Session Configuration
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=Lax
SESSION_MAX_AGE=2592000        # 30 days in seconds

# Token Lifetimes (via Supabase Dashboard)
# Configure in: Project → Settings → Auth → JWT expiration
# Access Token: 3600 (1 hour)
# Refresh Token: 604800 (7 days)
# Absolute Session: 2592000 (30 days)

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://tinypm.example.com

# Security
REQUIRE_EMAIL_CONFIRMATION=true
AUTO_CONFIRM_EMAIL_SIGNUPS=false  # Require email verification
```

### Supabase Project Settings

**Path:** Dashboard → Project Settings → Auth → User Management

1. **Email Provider:** ✓ Enabled
2. **Email Verification:** Enabled (require confirmation)
3. **Auto-Confirm:** Disabled (users must verify)
4. **Redirect URLs:** Add your app URLs
5. **JWT Expiration:** Set to 1 hour (3600 seconds)
6. **Refresh Token Rotation:** Consider enabling

### Row-Level Security (RLS) for Sessions

```sql
-- In Supabase SQL Editor
-- Only allow users to read/modify their own sessions

CREATE POLICY "Users can view their own sessions"
ON user_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can revoke their own sessions"
ON user_sessions FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Only auth can create sessions"
ON user_sessions FOR INSERT
WITH CHECK (false);  -- Let Supabase auth handle this
```

---

## 11. Comparison: TinyPM vs. Industry Standards

### Session Duration Behavior

| Scenario | TinyPM Current | Industry Standard | TinyPM Recommended |
|----------|---|---|---|
| User logs in | Instant ✓ | Instant | Same |
| User closes tab | Session persists ✓ | Varies | Keep persistent |
| Token expires | Auto-refresh ✓ | Manual re-login typically | Keep auto-refresh |
| User closes browser | Session persists (localStorage) | Session expires | Add max age (30 days) |
| User inactive 7 days | Still logged in | Timeout varies (6-30 hrs) | Add inactivity check |
| API call without token | Error | Error | Error ✓ |

### Security Maturity Model

**Level 1 (Current TinyPM):** ✓✓✓✓ (Good)
- Auto-refresh tokens
- Persistent sessions
- OAuth support
- API token handling

**Level 2 (Recommended):** ✓✓✓✓✓
- Level 1 +
- Security headers
- Device tracking
- Session revocation
- Token rotation

**Level 3 (Enterprise):** ✓✓✓✓✓✓
- Level 2 +
- Geo-blocking
- Risk-based auth
- MFA/2FA
- Security key support

**TinyPM Target:** Between Level 2-3 (farm operations security requirements).

---

## 12. Conclusion & Recommendations

### Current State Assessment
TinyPM's authentication using **Supabase with auto-refresh enabled is production-solid**. The implementation correctly uses:
- JWT-based tokens (not session cookies)
- Automatic refresh before expiry
- OAuth 2.0 with PKCE flow
- Persistent sessions across browser restarts

### Top 3 Priorities

1. **Add Security Headers** (1 day work)
   - Impact: Prevents multiple attack vectors
   - Effort: Add 5 headers to `web_server.py`
   - Risk: None - only improves security

2. **Configure Session Timeouts** (2 day work)
   - Impact: Prevents indefinite sessions
   - Effort: Add `SESSION_MAX_AGE` + inactivity check
   - Risk: Users might get logged out (acceptable)

3. **Add Device Tracking** (3-5 day work)
   - Impact: Users can see/revoke active sessions
   - Effort: Add `trusted_devices` column to profiles
   - Risk: Low - data is just for user visibility

### Implementation Priority

**Week 1:** Security headers + session config
**Week 2-3:** Device linking + session management
**Week 4+:** Advanced features (geo-blocking, risk-based auth)

---

## References & Sources

All research sourced from:

1. **JWT vs. Cookies Security:** [Session Cookies vs JWT Tokens - MojoAuth](https://mojoauth.com/ciam-qna/session-cookies-vs-jwt-tokens-security/)
2. **JWT Modern Implementation:** [JWT vs Cookies in 2026 - Medium](https://medium.com/@msbytedev/jwt-vs-cookies-in-2026-1008f7c24334/)
3. **Supabase Auth Sessions:** [Supabase User Sessions Documentation](https://supabase.com/docs/guides/auth/sessions)
4. **Token Refresh Best Practices:** [Refresh Token Rotation Guide - Descope](https://www.descope.com/blog/post/refresh-token-rotation)
5. **OAuth 2.0 Token Lifetimes:** [OAuth 2.0 Refresh Tokens - Okta Developer](https://developer.okta.com/docs/guides/refresh-tokens/main/)
6. **Storage Security:** [LocalStorage vs HttpOnly Cookies - Wisp CMS](https://www.wisp.blog/blog/understanding-token-storage-local-storage-vs-httponly-cookies)
7. **CORS & SameSite:** [CORS, CSRF, SameSite - Liran Tal](https://lirantal.com/blog/cors-samesite-csrf-3-dimensions-cookie-authentication)
8. **Security Headers:** [Set-Cookie HTTP Reference - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)
9. **CSP Implementation:** [Content Security Policy - Clutch Events](https://www.clutchevents.co/resources/hardening-oauth-tokens-in-api-security-token-expiry-rotation-and-revocation-best-practices)

---

**Document Version:** 1.0
**Last Updated:** January 30, 2026
**Status:** Research Complete - Ready for Implementation Planning
