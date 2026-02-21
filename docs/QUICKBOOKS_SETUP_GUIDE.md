# QuickBooks Online Integration Setup Guide

**Last Updated:** 2026-02-21
**Status:** SANDBOX (never connected to a real QuickBooks account)
**Prepared for:** Todd Wilson / Tiny Seed Farm

---

## Table of Contents

1. [Current State Summary](#current-state-summary)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Code Changes Required](#code-changes-required)
5. [Testing the Connection](#testing-the-connection)
6. [What the Integration Does Once Connected](#what-the-integration-does-once-connected)
7. [Troubleshooting](#troubleshooting)
8. [Known Issues and Gaps](#known-issues-and-gaps)

---

## Current State Summary

The Tiny Seed OS backend has a **fully built but never activated** QuickBooks Online integration. Here is what exists today:

| Component | Status | Location |
|-----------|--------|----------|
| OAuth2 flow code | Written, not tested with real credentials | `apps_script/MERGED TOTAL.js` lines 77509-77543 |
| QuickBooks API call wrapper | Written | `apps_script/MERGED TOTAL.js` line 77557 |
| Customer sync (QB <-> Sheet) | Written | `apps_script/MERGED TOTAL.js` line 77619 |
| Invoice creation | Written | `apps_script/MERGED TOTAL.js` line 77708 |
| Shopify-to-QB order sync | Written | `apps_script/MERGED TOTAL.js` line 77877 |
| Dashboard (frontend) | Built with setup wizard | `web_app/quickbooks-dashboard.html` |
| Dashboard data endpoint | Written | `apps_script/MERGED TOTAL.js` line 78013 |
| Connection status endpoint | Written | `apps_script/MERGED TOTAL.js` line 77953 |
| Credential saving via dashboard | Working (saves to Script Properties) | `saveQuickBooksCredentials` action |

### Current Configuration Values (all placeholders)

```javascript
const QUICKBOOKS_CONFIG = {
  CLIENT_ID: 'YOUR_QB_CLIENT_ID',           // Placeholder - not set
  CLIENT_SECRET: 'YOUR_QB_CLIENT_SECRET',   // Placeholder - not set
  COMPANY_ID: 'YOUR_QB_COMPANY_ID',         // Placeholder - not set
  ENVIRONMENT: 'sandbox',                   // Points to sandbox API
  SCOPES: 'com.intuit.quickbooks.accounting',
  ENABLED: false                            // Integration is disabled
};
```

### OAuth URLs Currently Configured

```javascript
AUTH:           https://appcenter.intuit.com/connect/oauth2
TOKEN:          https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
API_SANDBOX:    https://sandbox-quickbooks.api.intuit.com/v3/company
API_PRODUCTION: https://quickbooks.api.intuit.com/v3/company
```

The AUTH and TOKEN URLs are the same for sandbox and production. Only the API base URL changes. This is correct and does not need to be modified.

### OAuth2 Library

The code uses the Google Apps Script OAuth2 library (by Eric Koleda):
- Library ID: `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF`
- GitHub: https://github.com/googleworkspace/apps-script-oauth2

**IMPORTANT:** This library is referenced in a code comment but is **NOT declared in `appsscript.json`**. It must be added before OAuth will work. See [Code Changes Required](#code-changes-required).

---

## Prerequisites

### 1. QuickBooks Online Subscription

You need an active QuickBooks Online subscription. Any of these plans will work:
- **Simple Start** ($30/month) - Basic invoicing and expenses
- **Essentials** ($60/month) - Adds bills and multiple users
- **Plus** ($90/month) - Adds inventory and project tracking (recommended for farm)
- **Advanced** ($200/month) - Full featured

The integration uses the Accounting API, which is available on all plans.

### 2. Intuit Developer Account

You need a free Intuit Developer account at https://developer.intuit.com. You can sign in with the same Intuit account you use for QuickBooks Online.

### 3. Access to Apps Script Project

You need to be able to edit the Apps Script project in the Google Apps Script editor:
- Script ID: `1OR_XstYXlvw-vCbE6cO_Cyt22QeowHWgYBKtZbLcu77bJANqSNqENWec`
- Direct link: https://script.google.com/home/projects/1OR_XstYXlvw-vCbE6cO_Cyt22QeowHWgYBKtZbLcu77bJANqSNqENWec/edit

---

## Step-by-Step Setup

### Step 1: Create a QuickBooks App on Intuit Developer Portal

1. Go to https://developer.intuit.com and sign in with your Intuit account (same one used for QuickBooks Online).

2. Click **"Dashboard"** in the top navigation.

3. Click **"Create an app"** (or if you already have a sandbox app, click on it).

4. Select **"QuickBooks Online and Payments"** as the platform.

5. Give the app a name like **"Tiny Seed Farm OS"**.

6. Once the app is created, you will land on the app dashboard.

### Step 2: Get Production Keys

1. In your app dashboard, look for the **"Keys & credentials"** section.

2. You will see two tabs: **"Sandbox"** and **"Production"**.

3. Click on the **"Production"** tab.

4. **IMPORTANT:** If you see a message that says "Get production keys," you will need to:
   - Fill out the production questionnaire (company name, what the app does, etc.)
   - Intuit reviews this (usually approved in minutes for simple accounting integrations)
   - Once approved, your production Client ID and Client Secret will appear

5. Copy the **Client ID** (a long alphanumeric string, approximately 30-50 characters).

6. Copy the **Client Secret** (click "Show" to reveal it, then copy).

7. Store these securely. You will need them in Step 4.

### Step 3: Set the Redirect URI

This is the most critical configuration step. QuickBooks needs to know where to send the user after they authorize.

1. In the same **"Keys & credentials"** section, scroll down to **"Redirect URIs"**.

2. Click **"Add URI"**.

3. Enter this exact URL:

   ```
   https://script.google.com/macros/d/1OR_XstYXlvw-vCbE6cO_Cyt22QeowHWgYBKtZbLcu77bJANqSNqENWec/usercallback
   ```

   **Why this URL and not the web app URL?** The Google Apps Script OAuth2 library uses the `/usercallback` endpoint on the Apps Script project (identified by the script ID), not the deployed web app URL. This is how the OAuth2 library works -- it intercepts the callback at the script level, not at the web app deployment level.

4. Click **"Save"**.

5. **Note about the redirect URI shown in the dashboard setup wizard:** The quickbooks-dashboard.html setup wizard currently shows the deployed web app URL as the redirect URI:
   ```
   https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec
   ```
   This is **incorrect** for the OAuth2 library callback. The correct redirect URI uses `/macros/d/{SCRIPT_ID}/usercallback` as shown above. The dashboard setup wizard should be updated, but for now, use the correct URI above.

### Step 4: Add the OAuth2 Library to the Apps Script Project

This is a required step that has not been done yet.

1. Open the Apps Script editor:
   https://script.google.com/home/projects/1OR_XstYXlvw-vCbE6cO_Cyt22QeowHWgYBKtZbLcu77bJANqSNqENWec/edit

2. Click the **"+"** next to **"Libraries"** in the left sidebar.

3. In the "Script ID" field, paste:
   ```
   1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF
   ```

4. Click **"Look up"**.

5. It should find the **"OAuth2"** library by Google Workspace.

6. Select the latest version (currently version 43 or higher).

7. Leave the identifier as **"OAuth2"** (this is what the code references).

8. Click **"Add"**.

### Step 5: Update the Backend Configuration

There are two approaches to configuring credentials. **Approach A is recommended** because it does not require code changes and keeps secrets out of the codebase.

#### Approach A: Use Script Properties (Recommended)

The code already has a gap here. The `getQuickBooksOAuthService()` function reads from the hardcoded `QUICKBOOKS_CONFIG` constant, but the dashboard setup wizard saves credentials to Script Properties as `QUICKBOOKS_CREDENTIALS`. **A code change is needed** to bridge this gap -- see [Code Changes Required](#code-changes-required) below.

Once the code change is made:

1. Open the QuickBooks Dashboard at:
   `https://toddismyname21.github.io/tiny-seed-os/web_app/quickbooks-dashboard.html`

2. Click **"Setup Credentials"**.

3. Enter your **Company ID** (Realm ID), **Client ID**, and **Client Secret**.

4. Click **"Save Credentials"**.

**Finding your Company ID (Realm ID):**
- Log into QuickBooks Online at https://qbo.intuit.com
- Look at the URL in your browser: `https://qbo.intuit.com/app/homepage?companyId=123456789012345`
- The number after `companyId=` is your Company ID (also called Realm ID)
- It is typically 15 digits

#### Approach B: Hardcode in MERGED TOTAL.js (Quick but not recommended)

Edit `QUICKBOOKS_CONFIG` directly in `apps_script/MERGED TOTAL.js` at line 76308:

```javascript
const QUICKBOOKS_CONFIG = {
  CLIENT_ID: 'ABcD1234EfGh5678IjKl...',     // Your actual Client ID
  CLIENT_SECRET: 'AbCdEfGh1234567890...',     // Your actual Client Secret
  COMPANY_ID: '123456789012345',              // Your Company/Realm ID
  ENVIRONMENT: 'production',                  // CHANGED from 'sandbox'
  SCOPES: 'com.intuit.quickbooks.accounting',
  ENABLED: true                               // CHANGED from false
};
```

Then push with clasp:
```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS/apps_script
clasp push
clasp deploy -i AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm -d "Enable QuickBooks production"
```

**Warning:** This puts secrets in the Git repository. Approach A with Script Properties is safer.

### Step 6: Authorize the Connection

After credentials are configured:

1. Open the QuickBooks Dashboard.

2. You should see a **"Connect QuickBooks"** button.

3. Click it. A new window/tab will open showing the Intuit authorization page.

4. Sign in to your QuickBooks account if prompted.

5. You will see a consent screen showing what the app wants to access ("View and update your QuickBooks company data"). Click **"Connect"**.

6. You will be redirected back and should see a message: **"QuickBooks authorization successful! You can close this tab."**

7. Go back to the QuickBooks Dashboard tab and click **"Refresh"**. The connection banner should now show **"Connected to QuickBooks"**.

### Step 7: Run Initial Data Sync

Once connected, test with these actions:

1. **Test the connection** by refreshing the QuickBooks Dashboard. It should show your real account balances, invoices, and bills.

2. **Sync customers** by calling the API:
   ```
   ?action=syncQuickBooksCustomers
   ```
   This will pull all QuickBooks customers into the `QB_Customers` sheet.

3. **Verify the integration sheets exist** by calling:
   ```
   ?action=setupIntegrationSheets
   ```
   This creates `QB_Customers`, `QB_Invoices`, and related sheets if they do not already exist.

---

## Code Changes Required

### Change 1: Add OAuth2 Library to appsscript.json (BLOCKING)

The OAuth2 library must be declared in `appsscript.json`. Without this, all OAuth calls will fail with `OAuth2 is not defined`.

Edit `/Users/samanthapollack/Documents/TIny_Seed_OS/apps_script/appsscript.json` and add the `libraries` section inside `dependencies`:

```json
{
  "timeZone": "America/New_York",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "Drive",
        "serviceId": "drive",
        "version": "v3"
      }
    ],
    "libraries": [
      {
        "userSymbol": "OAuth2",
        "version": "43",
        "libraryId": "1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF",
        "developmentMode": false
      }
    ]
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.container.ui",
    "https://www.googleapis.com/auth/script.send_mail",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events"
  ]
}
```

**Alternatively,** add the library directly in the Apps Script editor UI (see Step 4 above). The UI method is simpler and does not require a clasp push.

### Change 2: Bridge Saved Credentials to OAuth Service (RECOMMENDED)

The `getQuickBooksOAuthService()` function currently reads from the hardcoded `QUICKBOOKS_CONFIG` object. But the dashboard setup wizard saves credentials to Script Properties as `QUICKBOOKS_CREDENTIALS`. These two systems are disconnected.

The `getQuickBooksOAuthService()` function at line 77509 needs to be updated to check Script Properties first, falling back to the hardcoded config. Here is the recommended change:

**Current code** (line 77509):
```javascript
function getQuickBooksOAuthService() {
  return OAuth2.createService('QuickBooks')
    .setAuthorizationBaseUrl(OAUTH_URLS.QUICKBOOKS.AUTH)
    .setTokenUrl(OAUTH_URLS.QUICKBOOKS.TOKEN)
    .setClientId(QUICKBOOKS_CONFIG.CLIENT_ID)
    .setClientSecret(QUICKBOOKS_CONFIG.CLIENT_SECRET)
    .setCallbackFunction('quickBooksAuthCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setScope(QUICKBOOKS_CONFIG.SCOPES)
    .setParam('response_type', 'code')
    .setTokenHeaders({
      'Authorization': 'Basic ' + Utilities.base64Encode(QUICKBOOKS_CONFIG.CLIENT_ID + ':' + QUICKBOOKS_CONFIG.CLIENT_SECRET)
    });
}
```

**Recommended replacement:**
```javascript
function getQuickBooksOAuthService() {
  // Check for credentials saved via dashboard setup wizard
  var clientId = QUICKBOOKS_CONFIG.CLIENT_ID;
  var clientSecret = QUICKBOOKS_CONFIG.CLIENT_SECRET;

  try {
    var savedCreds = PropertiesService.getScriptProperties().getProperty('QUICKBOOKS_CREDENTIALS');
    if (savedCreds) {
      var parsed = JSON.parse(savedCreds);
      if (parsed.clientId && parsed.clientId !== 'YOUR_QB_CLIENT_ID') {
        clientId = parsed.clientId;
      }
      if (parsed.clientSecret && parsed.clientSecret !== 'YOUR_QB_CLIENT_SECRET') {
        clientSecret = parsed.clientSecret;
      }
    }
  } catch(e) {
    Logger.log('Error reading saved QB credentials: ' + e.toString());
  }

  return OAuth2.createService('QuickBooks')
    .setAuthorizationBaseUrl(OAUTH_URLS.QUICKBOOKS.AUTH)
    .setTokenUrl(OAUTH_URLS.QUICKBOOKS.TOKEN)
    .setClientId(clientId)
    .setClientSecret(clientSecret)
    .setCallbackFunction('quickBooksAuthCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setScope(QUICKBOOKS_CONFIG.SCOPES)
    .setParam('response_type', 'code')
    .setTokenHeaders({
      'Authorization': 'Basic ' + Utilities.base64Encode(clientId + ':' + clientSecret)
    });
}
```

### Change 3: Switch Environment to Production

In `QUICKBOOKS_CONFIG` at line 76308, change:
```javascript
ENVIRONMENT: 'sandbox',  // Change to 'production'
ENABLED: false           // Change to true
```

To:
```javascript
ENVIRONMENT: 'production',
ENABLED: true
```

Or alternatively, add environment detection to the `quickBooksApiCall` function to read from Script Properties.

### Change 4: Fix Redirect URI in Dashboard Setup Wizard (Minor)

In `web_app/quickbooks-dashboard.html` at line 1382, the redirect URI shown to the user is the deployed web app URL. This should be updated to show the correct OAuth2 callback URL:

**Current** (line 1382):
```html
https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec
```

**Should be:**
```html
https://script.google.com/macros/d/1OR_XstYXlvw-vCbE6cO_Cyt22QeowHWgYBKtZbLcu77bJANqSNqENWec/usercallback
```

---

## Testing the Connection

### Test 1: Check Connection Status

Call the API endpoint:
```
https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec?action=getQuickBooksConnectionStatus
```

Expected response when properly configured but not yet authorized:
```json
{
  "success": true,
  "configured": true,
  "connected": false,
  "status": "configured_not_connected",
  "environment": "production",
  "message": "QuickBooks credentials configured but not connected. Please authorize."
}
```

Expected response after OAuth authorization:
```json
{
  "success": true,
  "configured": true,
  "connected": true,
  "hasRealmId": true,
  "realmId": "123456789012345",
  "environment": "production",
  "status": "connected",
  "message": "Connected to QuickBooks"
}
```

### Test 2: Test API Connection

```
?action=testQuickBooksConnection
```

This calls the QuickBooks Company Info endpoint. A successful response will return your company details (name, address, etc.).

### Test 3: Full Dashboard

Open the QuickBooks Dashboard. If the connection is working, you will see:
- Your real bank account balances
- Credit card balances
- Accounts receivable / payable
- Open invoices
- Open bills
- Profit & Loss summary (YTD)

---

## What the Integration Does Once Connected

### Automatic Capabilities

| Feature | Description | Backend Function |
|---------|-------------|------------------|
| Customer Sync | Pull all QuickBooks customers into the `QB_Customers` sheet | `syncQuickBooksCustomers()` |
| Invoice Creation | Create QB invoices from farm orders | `createQuickBooksInvoice()` |
| Shopify-to-QB Sync | Automatically create QB invoices for Shopify orders | `syncShopifyOrderToQuickBooks()` |
| Farm Order-to-QB Sync | Create QB invoices from internal sales orders | `createQBInvoiceFromOrder()` |
| Dashboard Reporting | Real-time financial overview with A/R aging, P&L, balances | `getQuickBooksDashboard()` |
| Connection Monitoring | Check if QB is still authorized | `getQuickBooksConnectionStatus()` |

### Data Flow

```
Shopify Order  -->  SHOPIFY_Orders sheet  -->  QuickBooks Invoice
                                          -->  QB_Invoices sheet

Farm Sales Order  -->  SALES_Orders sheet  -->  QuickBooks Invoice
                                           -->  QB_Invoices sheet

QuickBooks Customers  <--sync-->  QB_Customers sheet
```

### API Endpoints Available

| Endpoint | Method | Description |
|----------|--------|-------------|
| `getQuickBooksConnectionStatus` | GET | Check connection status |
| `getQuickBooksAuthUrl` | GET | Get OAuth authorization URL |
| `testQuickBooksConnection` | GET | Test API connectivity |
| `disconnectQuickBooks` | GET | Reset OAuth tokens |
| `getQuickBooksDashboard` | GET | Full dashboard data |
| `syncQuickBooksCustomers` | GET | Sync customers from QB |
| `saveQuickBooksCredentials` | POST | Save Client ID/Secret |
| `createQuickBooksInvoice` | POST | Create new invoice |

---

## Troubleshooting

### "OAuth2 is not defined"

**Cause:** The OAuth2 library is not added to the Apps Script project.

**Fix:** Add the library in the Apps Script editor. See [Step 4](#step-4-add-the-oauth2-library-to-the-apps-script-project) above.

### "QuickBooks integration is not enabled"

**Cause:** `QUICKBOOKS_CONFIG.ENABLED` is set to `false`.

**Fix:** Change it to `true` in the code, or ensure the credential bridge code (Change 2 above) also sets enabled status.

### "Not authorized with QuickBooks" after clicking Connect

**Cause:** The OAuth redirect URI in the Intuit Developer Portal does not match the one the OAuth2 library uses.

**Fix:** Make sure the redirect URI in the Intuit Developer Portal is exactly:
```
https://script.google.com/macros/d/1OR_XstYXlvw-vCbE6cO_Cyt22QeowHWgYBKtZbLcu77bJANqSNqENWec/usercallback
```

### "Authorization successful" but dashboard still shows disconnected

**Cause:** Token was stored in UserProperties, but the web app is accessed by a different user/session, or tokens expired.

**Fix:**
- Make sure you are signed into the same Google account that owns the Apps Script project
- QuickBooks access tokens expire after 1 hour; refresh tokens expire after 100 days
- The OAuth2 library should auto-refresh, but if the refresh token expired, you need to re-authorize

### "HTTP 401" errors when making API calls

**Cause:** Access token expired and refresh failed.

**Fix:** The code at line 77601 already handles 401 by calling `service.refresh()` and retrying once. If this still fails:
1. Call `?action=disconnectQuickBooks` to reset tokens
2. Re-authorize by clicking "Connect QuickBooks" again

### "HTTP 403" or "Forbidden" from QuickBooks API

**Cause:** The app does not have the required scopes, or the QuickBooks user does not have admin permissions.

**Fix:**
- Verify the app has `com.intuit.quickbooks.accounting` scope enabled in the Intuit Developer Portal
- Make sure the QuickBooks user authorizing is a Company Admin or Primary Admin

### Dashboard shows "--" for all values

**Cause:** Either not connected, or the dashboard endpoint is returning an error silently.

**Fix:** Open browser DevTools (F12), check the Console tab for errors, and check the Network tab for the `getQuickBooksDashboard` API response.

---

## Known Issues and Gaps

### 1. OAuth2 Library Not Declared (BLOCKING)

The OAuth2 library (`1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF`) is referenced in code but not declared in `appsscript.json` under `dependencies.libraries`. Any attempt to call `OAuth2.createService()` will throw `OAuth2 is not defined`. This must be fixed before the integration can work.

### 2. Credential Storage Gap

The dashboard setup wizard saves credentials via the `saveQuickBooksCredentials` POST action to Script Properties as a JSON blob. However, the `getQuickBooksOAuthService()` function reads from the hardcoded `QUICKBOOKS_CONFIG` constant, not from Script Properties. These two systems are disconnected. The recommended code change in [Change 2](#change-2-bridge-saved-credentials-to-oauth-service-recommended) bridges this gap.

### 3. Incorrect Redirect URI in Setup Wizard

The quickbooks-dashboard.html setup wizard (Step 3) tells the user to set the redirect URI to the deployed web app URL (`/macros/s/.../exec`). The correct redirect URI for the Apps Script OAuth2 library is `/macros/d/{SCRIPT_ID}/usercallback`.

### 4. No Token Refresh Monitoring

The code stores tokens in `UserProperties` but does not track token expiry proactively. QuickBooks access tokens expire after 60 minutes; refresh tokens expire after 100 days. If the refresh token expires, the user must re-authorize manually. Consider adding a time-triggered function to refresh tokens proactively.

### 5. ENABLED Flag is Hardcoded

`QUICKBOOKS_CONFIG.ENABLED` is hardcoded to `false`. Even if credentials are saved via the dashboard, the `quickBooksApiCall()` function checks this flag and returns an error if `false`. This should either be changed in code or the API call function should also check Script Properties for saved credentials.

### 6. Single-User Token Storage

Tokens are stored in `UserProperties` (per-user), meaning only the Google account that authorized the app can make API calls. If the Apps Script web app runs as "User deploying" (which it does, per `appsscript.json`), this should work fine since all requests execute as the deployer. But if it were changed to "User accessing the web app," each user would need their own authorization.

### 7. No Webhook Support for Real-Time Sync

The current integration is pull-based (sync on demand). QuickBooks supports webhooks for real-time notifications when invoices are paid, customers are updated, etc. Adding webhook support would make the integration more responsive, but this is an enhancement, not a blocker.

### 8. Rate Limiting

QuickBooks Online API has rate limits:
- **500 requests per minute** per realm (company)
- **10 concurrent requests** per realm
- The code does not currently implement rate limiting or throttling

For a small farm business, you are unlikely to hit these limits, but they should be noted.

---

## Security Considerations

- **Never commit Client ID and Client Secret to Git.** Use Script Properties (Approach A).
- The Client Secret is stored in Google Apps Script Script Properties, which are encrypted at rest and only accessible to project editors.
- OAuth tokens are stored in UserProperties, scoped to the deploying user.
- The web app is set to `ANYONE_ANONYMOUS` access, but the QuickBooks API calls themselves require valid OAuth tokens, so unauthorized users cannot access financial data through the API.
- The QuickBooks Dashboard requires Admin role login via `auth-guard.js`.

---

## Estimated Time to Complete Setup

| Task | Time |
|------|------|
| Create Intuit Developer App + get production keys | 10-15 minutes |
| Add OAuth2 library to Apps Script | 2 minutes |
| Apply code changes (credential bridge, ENABLED flag, environment) | 15-20 minutes |
| Deploy via clasp | 5 minutes |
| Enter credentials in dashboard wizard | 5 minutes |
| Run OAuth authorization flow | 2 minutes |
| Test and verify | 10 minutes |
| **Total** | **~50-60 minutes** |

---

## Quick Reference

| Item | Value |
|------|-------|
| Intuit Developer Portal | https://developer.intuit.com |
| Apps Script Project | https://script.google.com/home/projects/1OR_XstYXlvw-vCbE6cO_Cyt22QeowHWgYBKtZbLcu77bJANqSNqENWec/edit |
| OAuth2 Library ID | `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF` |
| Correct Redirect URI | `https://script.google.com/macros/d/1OR_XstYXlvw-vCbE6cO_Cyt22QeowHWgYBKtZbLcu77bJANqSNqENWec/usercallback` |
| QuickBooks Dashboard | `web_app/quickbooks-dashboard.html` |
| Backend Config Location | `apps_script/MERGED TOTAL.js` line 76308 |
| OAuth Service Function | `apps_script/MERGED TOTAL.js` line 77509 |
| Required Scope | `com.intuit.quickbooks.accounting` |
| API Deployment ID | `AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm` |
