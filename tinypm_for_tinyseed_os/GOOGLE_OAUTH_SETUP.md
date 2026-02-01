# Google OAuth Setup Guide for TinyPM

This guide walks you through setting up Google OAuth credentials so TinyPM can access your Google Calendar and Gmail.

**Time Required:** 10-15 minutes

**What You'll Get:**
- One-click authorization for Calendar + Gmail
- Automatic token refresh (no re-authorization needed)
- Secure scope restrictions (TinyPM can NEVER access Google Sheets/Drive)

---

## Table of Contents

1. [Create a Google Cloud Project](#step-1-create-a-google-cloud-project)
2. [Enable Required APIs](#step-2-enable-required-apis)
3. [Configure OAuth Consent Screen](#step-3-configure-oauth-consent-screen)
4. [Create OAuth 2.0 Credentials](#step-4-create-oauth-20-credentials)
5. [Add Credentials to TinyPM](#step-5-add-credentials-to-tinypm)
6. [Test Your Setup](#step-6-test-your-setup)
7. [Production Deployment](#step-7-production-deployment)
8. [Security Notes](#security-notes)
9. [Troubleshooting](#troubleshooting)

---

## Step 1: Create a Google Cloud Project

1. Go to the **Google Cloud Console**: https://console.cloud.google.com

2. Click the project dropdown at the top of the page (next to "Google Cloud")

3. Click **"New Project"** in the top-right of the popup

4. Enter project details:
   - **Project name:** `TinyPM` (or your preferred name)
   - **Organization:** Leave as default or select your organization
   - **Location:** Leave as default

5. Click **"Create"**

6. Wait for the project to be created (a few seconds), then select it from the project dropdown

> **Screenshot location:** Top-left corner, next to "Google Cloud" logo

---

## Step 2: Enable Required APIs

TinyPM needs access to two Google APIs:
- **Gmail API** - For reading and sending emails
- **Google Calendar API** - For reading and creating calendar events

### Enable Gmail API:

1. Go to: https://console.cloud.google.com/apis/library/gmail.googleapis.com

2. Make sure your TinyPM project is selected in the dropdown

3. Click **"Enable"**

4. Wait for it to enable (takes a few seconds)

### Enable Google Calendar API:

1. Go to: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com

2. Make sure your TinyPM project is selected

3. Click **"Enable"**

> **Quick link:** You can also search for these APIs by going to "APIs & Services" > "Library" in the left sidebar

---

## Step 3: Configure OAuth Consent Screen

Before creating credentials, you must configure how the consent screen appears to users.

1. Go to: https://console.cloud.google.com/apis/credentials/consent

2. Select **"External"** user type (unless you have a Google Workspace organization)
   - External = Any Google account can authorize
   - Internal = Only your organization's accounts

3. Click **"Create"**

4. Fill in the **App Information**:
   - **App name:** `TinyPM`
   - **User support email:** Your email address
   - **App logo:** (Optional) Upload a logo if desired

5. **App domain** (optional):
   - Leave blank for development
   - For production, add your domain

6. **Developer contact information:**
   - Enter your email address

7. Click **"Save and Continue"**

### Add Scopes:

1. Click **"Add or Remove Scopes"**

2. In the filter box, search for and select these scopes:

   **Gmail Scopes:**
   - `https://www.googleapis.com/auth/gmail.readonly` - Read emails
   - `https://www.googleapis.com/auth/gmail.send` - Send emails
   - `https://www.googleapis.com/auth/gmail.modify` - Modify emails (labels, mark read)

   **Calendar Scopes:**
   - `https://www.googleapis.com/auth/calendar.readonly` - Read calendar
   - `https://www.googleapis.com/auth/calendar.events` - Create/modify events

   **User Info Scopes:**
   - `openid` - OpenID Connect
   - `email` - User's email address
   - `profile` - User's basic profile

3. Click **"Update"**

4. Click **"Save and Continue"**

### Test Users (for development):

1. Click **"Add Users"**

2. Enter your Google email address

3. Click **"Add"**

4. Click **"Save and Continue"**

5. Review the summary and click **"Back to Dashboard"**

> **Important:** While in "Testing" mode, only emails you add as test users can authorize the app. Once you verify your app with Google, anyone can use it.

---

## Step 4: Create OAuth 2.0 Credentials

Now create the actual credentials that TinyPM will use.

1. Go to: https://console.cloud.google.com/apis/credentials

2. Click **"+ Create Credentials"** at the top

3. Select **"OAuth client ID"**

4. For **Application type**, select **"Web application"**

5. Enter a **Name:** `TinyPM Web Client`

6. **Authorized JavaScript origins** (for browser requests):
   ```
   http://localhost:8000
   ```

   For production, also add:
   ```
   https://your-production-domain.com
   ```

7. **Authorized redirect URIs** (CRITICAL - must match exactly):

   For development:
   ```
   http://localhost:8000/oauth/callback
   ```

   For production, also add:
   ```
   https://your-production-domain.com/oauth/callback
   ```

8. Click **"Create"**

9. A popup will show your credentials:
   - **Client ID:** Something like `123456789-abc123def456.apps.googleusercontent.com`
   - **Client Secret:** Something like `GOCSPX-xxxxxxxxxxxxxxxxxxxxx`

10. **SAVE THESE VALUES** - Click "Download JSON" to save a backup

> **Important:** The redirect URI must match EXACTLY what TinyPM uses, including the protocol (http/https), port, and path.

---

## Step 5: Add Credentials to TinyPM

1. Navigate to your TinyPM directory:
   ```bash
   cd /path/to/tinypm
   ```

2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit the `.env` file and add your credentials:
   ```bash
   # Google OAuth credentials
   GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here

   # Development redirect URI
   GOOGLE_REDIRECT_URI=http://localhost:8000/oauth/callback
   ```

4. Save the file

> **Security:** Never commit your `.env` file to git. The `.gitignore` file should already exclude it.

---

## Step 6: Test Your Setup

1. Start the TinyPM server:
   ```bash
   python3 web_server.py
   ```

2. Check OAuth status:
   ```bash
   # In a new terminal
   curl http://localhost:8000/api/oauth/status
   ```

   You should see:
   ```json
   {
     "configured": true,
     "client_id_set": true,
     "client_secret_set": true,
     "redirect_uri": "http://localhost:8000/oauth/callback"
   }
   ```

3. Test the OAuth flow:
   ```bash
   python3 google_oauth.py auth-url
   ```

   This will print an authorization URL. Open it in your browser.

4. Sign in with your Google account and approve the permissions

5. After approval, you'll be redirected to the callback URL with an authorization code

---

## Step 7: Production Deployment

When deploying TinyPM to production (e.g., Railway, Render, Heroku):

1. **Update Google Cloud Console:**
   - Add your production domain to "Authorized JavaScript origins"
   - Add your production callback URL to "Authorized redirect URIs"

   Example:
   ```
   https://tinypm.railway.app
   https://tinypm.railway.app/oauth/callback
   ```

2. **Update environment variables** on your hosting platform:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-secret
   GOOGLE_REDIRECT_URI=https://your-domain.com/oauth/callback
   PRODUCTION_DOMAIN=https://your-domain.com
   ```

3. **Publish your app** (optional but recommended):
   - Go to OAuth consent screen
   - Click "Publish App"
   - This removes the 100-user limit and "unverified app" warning
   - Note: Google may require verification for sensitive scopes

---

## Security Notes

### Scope Restrictions

TinyPM has **hard security boundaries** that prevent it from ever accessing:
- Google Sheets
- Google Drive
- Google Docs

Even if someone tries to modify the code to request these scopes, the OAuth manager will **reject the tokens** and fail the authorization.

This is by design to keep TinyPM completely separate from Tiny Seed OS, which uses Google Sheets as its database.

### Token Storage

- Tokens are stored securely in Supabase (if configured) or locally
- Access tokens expire after ~1 hour and are automatically refreshed
- Refresh tokens are long-lived but can be revoked at any time

### Best Practices

1. **Never share your Client Secret** - treat it like a password
2. **Use HTTPS in production** - OAuth requires secure connections
3. **Limit test users** during development
4. **Monitor API usage** in Google Cloud Console
5. **Revoke tokens** if you suspect unauthorized access:
   ```bash
   python3 google_oauth.py disconnect <user_id>
   ```

---

## Troubleshooting

### "OAuth not configured" error

**Cause:** Environment variables not set correctly

**Fix:**
1. Check that `.env` file exists in the tinypm directory
2. Verify the variable names are exact: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
3. Restart the web server after editing `.env`

### "redirect_uri_mismatch" error

**Cause:** The redirect URI in your code doesn't match Google Cloud Console

**Fix:**
1. Check the EXACT URI in the error message
2. Add that exact URI to Google Cloud Console > Credentials > Your OAuth Client
3. Include protocol (http/https), port, and path

### "Access blocked: This app's request is invalid"

**Cause:** OAuth consent screen not configured properly

**Fix:**
1. Go to OAuth consent screen settings
2. Make sure app is in "Testing" mode with your email as test user
3. Or publish the app for production use

### "invalid_grant" error during token exchange

**Cause:** Authorization code expired or already used

**Fix:**
1. Authorization codes are single-use and expire quickly
2. Get a new authorization URL and try again
3. Complete the flow within a few minutes

### "insufficient_scope" error

**Cause:** Required scopes not enabled

**Fix:**
1. Go to OAuth consent screen > Scopes
2. Add all required Gmail and Calendar scopes
3. Re-authorize to get new tokens with correct scopes

### Tokens not persisting

**Cause:** Supabase not configured or local storage issue

**Fix:**
1. Check Supabase credentials in `.env`
2. Verify the `user_oauth_tokens` table exists
3. Check file permissions for local token storage

---

## Quick Reference

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | OAuth client ID | `123456-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | `GOCSPX-xxxxx` |
| `GOOGLE_REDIRECT_URI` | Callback URL | `http://localhost:8000/oauth/callback` |

### Useful Commands

```bash
# Check OAuth configuration status
python3 google_oauth.py

# Generate authorization URL
python3 google_oauth.py auth-url

# Exchange code for tokens
python3 google_oauth.py exchange <code> <user_id>

# Check user's OAuth status
python3 google_oauth.py status <user_id>

# Disconnect Google (revoke tokens)
python3 google_oauth.py disconnect <user_id>

# Check OAuth status via API
curl http://localhost:8000/api/oauth/status
```

### Important URLs

- Google Cloud Console: https://console.cloud.google.com
- API Library: https://console.cloud.google.com/apis/library
- Credentials: https://console.cloud.google.com/apis/credentials
- OAuth Consent: https://console.cloud.google.com/apis/credentials/consent

---

## Need Help?

If you're stuck:
1. Double-check each step in this guide
2. Verify redirect URIs match EXACTLY
3. Check the browser console and server logs for error details
4. Make sure you're using a test user account during development
