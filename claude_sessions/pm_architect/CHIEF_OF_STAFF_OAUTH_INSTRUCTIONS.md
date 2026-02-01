# Chief of Staff OAuth Setup Instructions

**From:** TinyPM PM
**To:** Chief of Staff PM
**Date:** 2026-01-30
**Subject:** Calendar & Email API Access

---

## CONTEXT

TinyPM now has OAuth access to Google Calendar and Gmail. Chief of Staff should have **SEPARATE** OAuth credentials to maintain security boundaries.

## YOUR OAUTH CLIENT

Create a **NEW** OAuth client for Chief of Staff:

### Step 1: Create OAuth Client
1. Go to: https://console.cloud.google.com/apis/credentials
2. Select project: **TinySeed-Farm-OS**
3. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
4. Application type: **Web application**
5. Name: **Chief of Staff**
6. Authorized redirect URIs: Add `http://localhost:8001/auth/callback`
7. Click **CREATE**
8. **COPY AND SAVE** the Client ID and Client Secret immediately

### Step 2: Store Credentials
Save to your environment or config:
```
COS_GOOGLE_CLIENT_ID=<your client id>
COS_GOOGLE_CLIENT_SECRET=<your client secret>
```

### Step 3: Scopes You Can Request
Chief of Staff has FULL access (unlike TinyPM which is restricted):

```python
# Chief of Staff ALLOWED scopes
COS_SCOPES = [
    # Calendar (same as TinyPM)
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',

    # Gmail (same as TinyPM)
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.compose',

    # Sheets (Chief of Staff ONLY - TinyPM cannot use these)
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/spreadsheets.readonly',

    # Drive (Chief of Staff ONLY - TinyPM cannot use these)
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',

    # User info
    'openid',
    'email',
    'profile'
]
```

### Step 4: Token Storage
Use a SEPARATE table or prefix for Chief of Staff tokens:
- Token prefix: `cos_` (Chief of Staff)
- TinyPM uses: `tpm_` (already in use)

This prevents any token collision between systems.

---

## SECURITY BOUNDARIES

| System | Calendar | Gmail | Sheets | Drive |
|--------|----------|-------|--------|-------|
| TinyPM | ✅ | ✅ | ❌ FORBIDDEN | ❌ FORBIDDEN |
| Chief of Staff | ✅ | ✅ | ✅ | ✅ |

TinyPM has **hard-coded blocks** preventing it from ever accessing Sheets/Drive. Chief of Staff has full access to manage the business.

---

## IMPLEMENTATION NOTES

The OAuth flow is the same as TinyPM:
1. Generate authorization URL with your client ID and scopes
2. User authorizes in browser
3. Capture the authorization code from redirect
4. Exchange code for tokens using your client secret
5. Store tokens with `cos_` prefix

Refer to `/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/oauth_manager.py` for implementation patterns.

---

## WHAT TINYPM BUILT

These files are available for reference or adaptation:
- `oauth_manager.py` - OAuth 2.0 flow with security boundaries
- `calendar_integration.py` - Google Calendar API integration
- `email_integration.py` - Gmail API integration
- `oauth_callback_server.py` - Local callback server for OAuth flow

---

**TinyPM PM signing off. Calendar and Email are ready for proactive intelligence.**
