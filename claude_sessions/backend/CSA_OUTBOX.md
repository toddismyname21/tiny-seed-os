# OUTBOX: Backend Claude - CSA Auto-Onboarding System
## Status: COMPLETE - Ready for Deploy

**Updated:** 2026-01-18

---

## COMPLETED TASKS

### Shopify Webhook Auto-Onboarding System

| Function | Purpose | Line (approx) |
|----------|---------|---------------|
| `handleShopifyWebhook(payload)` | Main webhook handler for orders/create | ~13155 |
| `isCSAProduct(itemName)` | Detects CSA products in order | ~13265 |
| `csaMemberExists(email, shareType)` | Prevents duplicate imports | ~13275 |
| `findOrCreateCustomer(data)` | Finds or creates customer record | ~13290 |
| `extractStopLocation(order)` | Parses pickup location from order | ~13310 |
| `createCSAMemberFromShopify(data)` | Creates CSA member with all fields | ~13365 |
| `sendCSAWelcomeEmail(data)` | Sends welcome email with magic link | ~13440 |
| `generateCSAWelcomeEmailHtml(data, magicLink)` | Beautiful HTML email template | ~13475 |
| `logWebhookEvent(type, orderId, email)` | Logs webhook for debugging | ~13590 |
| `logCSAEmailSent(memberId, emailType, recipientEmail)` | Logs emails sent | ~13610 |
| `resendCSAWelcomeEmail(memberId)` | Manually resend welcome email | ~13630 |

### Vacation Hold System

| Function | Purpose | Line (approx) |
|----------|---------|---------------|
| `scheduleVacationHold(data)` | Schedule vacation hold for a week | ~13770 |
| `cancelVacationHold(data)` | Cancel scheduled vacation hold | ~13845 |
| `getVacationHolds(params)` | Get all vacation holds for member | ~13905 |

---

## NEW API ENDPOINTS

### POST Endpoints (doPost)
```javascript
// Shopify webhook
{ action: 'shopifyWebhook', order: {...} }

// Resend welcome email
{ action: 'resendCSAWelcome', memberId: 'CSA-xxx' }

// Vacation holds
{ action: 'scheduleVacationHold', memberId: 'CSA-xxx', weekDate: '2026-02-15' }
{ action: 'cancelVacationHold', memberId: 'CSA-xxx', weekDate: '2026-02-15' }
```

### GET Endpoints (doGet)
```
?action=getVacationHolds&memberId=CSA-xxx
```

---

## WELCOME EMAIL FEATURES

The new CSA welcome email includes:
- Beautiful green gradient header with farm logo
- Share details table (type, frequency, pickup day, location, season dates)
- Prominent "Access Your Member Portal" button
- List of portal features
- Professional styling with responsive design
- Magic link expires in 7 days (vs 15 min for regular login)

---

## SHEETS CREATED (Auto)

| Sheet | Purpose |
|-------|---------|
| `Webhook_Log` | Logs all incoming Shopify webhooks |
| `CSA_Email_Log` | Logs all CSA emails sent |

---

## SHOPIFY WEBHOOK SETUP

To enable auto-onboarding, owner needs to configure webhook in Shopify:

1. Go to Shopify Admin > Settings > Notifications > Webhooks
2. Click "Create webhook"
3. Event: `orders/create`
4. Format: JSON
5. URL: `https://script.google.com/macros/s/AKfycbzvrDVCBUIKO6v-3PDqRX87B94uMYULzuBO6e-G8wMPZBj-egyR2ftgAGrEPU8Z5ZJY/exec`
6. API version: Latest stable

The webhook handler automatically:
- Detects CSA products in the order
- Creates customer if not exists
- Creates CSA membership with proper codes
- Sends welcome email with magic link
- Logs everything for debugging

---

## DATA FLOW

```
SHOPIFY PURCHASE
       |
       v
POST { action: 'shopifyWebhook', order: {...} }
       |
       v
handleShopifyWebhook()
   |
   +---> isCSAProduct() for each line item
   +---> csaMemberExists() - check duplicates
   +---> findOrCreateCustomer() -> SALES_Customers
   +---> createCSAMemberFromShopify() -> CSA_Members
   +---> sendCSAWelcomeEmail() -> Magic link + email
   +---> logWebhookEvent() -> Webhook_Log
```

---

## TESTING INSTRUCTIONS

### Test Webhook Manually
```javascript
// In Apps Script console, run:
function testWebhook() {
  const testOrder = {
    id: 'TEST-123',
    email: 'test@example.com',
    customer: {
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      phone: '412-555-1234'
    },
    shipping_address: {
      address1: '123 Test St',
      city: 'Pittsburgh'
    },
    line_items: [{
      title: '2026 Small Summer CSA Share (BIWEEKLY)',
      quantity: 1,
      price: '350.00'
    }],
    tags: 'Mt. Lebanon (CSA CUSTOMER PORCH)'
  };

  const result = handleShopifyWebhook(testOrder);
  Logger.log(result);
}
```

### Test Welcome Email
```javascript
// Resend welcome email to existing member:
function testEmail() {
  const result = resendCSAWelcomeEmail('CSA-xxx-xxx');
  Logger.log(result);
}
```

---

## FOR UX CLAUDE

The following endpoints are ready for the CSA portal:

**Authentication:**
- `sendCustomerMagicLink` (POST) - already existed
- `verifyCustomerToken` (GET) - already existed

**Vacation Holds:**
- `getVacationHolds` (GET) - new
- `scheduleVacationHold` (POST) - new
- `cancelVacationHold` (POST) - new

---

## ISSUES / NOTES

1. Welcome email magic links expire in 7 days (longer than standard 15 min login links)
2. Webhook logs to `Webhook_Log` sheet for debugging
3. Duplicate detection uses email + share_type combination
4. createCSAMemberFromShopify includes veg_code and floral_code based on share type

---

## DEPLOYMENT REQUIRED

After owner reviews, deploy new version:
1. Open Apps Script
2. Deploy > Manage deployments > Edit
3. Select "New version"
4. Deploy

---

*Backend Claude - CSA Auto-Onboarding System Complete*
