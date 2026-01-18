# INBOX: Backend Claude - CSA Auto-Onboarding System
## From: PM_Architect
## Priority: P1 - CRITICAL

**Created:** 2026-01-18
**Deadline:** URGENT - Owner wants this state-of-the-art and production-ready

---

## MISSION STATEMENT

Build a **state-of-the-art** CSA member onboarding system that:
1. Automatically processes Shopify CSA purchases
2. Creates customer records with intelligent parsing
3. Sends welcome emails with magic link login to CSA portal
4. Keeps all systems in sync (Shopify, CSA_Members sheet, Customers sheet)

**Owner's exact words:** "I WANT IT TO BE SO SMART THAT IT KNOWS WHAT I SHOULD DO BEFORE ME. I WANT TO DO ITS BIDDING BECAUSE IT IS WHAT IS BEST FOR TINY SEED FARM."

---

## EXISTING CODE REFERENCE

The owner has existing code that MUST be integrated/enhanced, not replaced:

### User's Existing Functions (From Their Google Sheet)
```javascript
// These patterns should be preserved/enhanced:
- autoProcessShopifyData() - parses Shopify orders
- Customer_Bridge IDX with 40+ fields including share codes, dates, vacation holds
- pushSmartCSAToLog() - generates weekly CSA orders from Customer_Bridge
- syncInventoryToShopify() - auto-tagging, product creation/update
```

### Already in MERGED TOTAL.js
- `importShopifyCSAMembers(csvData)` - line 12534
- `parseShopifyShareType(itemName)` - line 12758
- `parsePickupLocation(stopLocation)` - line 12797
- `createCustomerFromShopify(data)` - line 12732
- `getSeasonDates(shareType, season)` - line 12826

---

## TASK 1: Shopify Webhook Handler

Create a webhook endpoint that Shopify calls when a CSA product is purchased.

### Endpoint Spec
```javascript
// POST to doPost with:
{
  action: 'shopifyWebhook',
  topic: 'orders/create',
  shop: 'tiny-seed-farmers-market.myshopify.com',
  payload: { /* Shopify order object */ }
}
```

### Implementation Requirements
1. Verify webhook signature (HMAC-SHA256) using stored secret
2. Extract customer and line items from order
3. For each CSA product purchased:
   - Parse share type using enhanced `parseShopifyShareType()`
   - Create/update customer in SALES_Customers sheet
   - Create CSA membership in CSA_Members sheet
   - Generate magic link token
   - Queue welcome email with portal access
4. Return 200 OK immediately (Shopify requires fast response)
5. Log all webhook events for debugging

### Shopify API Credentials (ALREADY IN SYSTEM)
```javascript
SHOPIFY_DOMAIN = 'tiny-seed-farmers-market.myshopify.com'
SHOPIFY_ACCESS_TOKEN = '[REDACTED - See SOCIAL_CREDENTIALS.md]'
```

---

## TASK 2: Enhanced Share Type Parsing

The existing parser is basic. Enhance it to handle the full Tiny Seed product catalog:

### Products to Parse (From Shopify Export)
```
2026 Tiny Seed Fleurs Petite Bloom Bouquet Share (BIWEEKLY)
2026 SPRING CSA SHARE (LIMITED QUANTITIES)
2026 Flex CSA Share
2026 Tiny Seed Fleurs Full Bloom Bouquet Share (BIWEEKLY)
2026 Small Summer CSA Share (BIWEEKLY)
2026 Friends and Family Summer CSA Share (BIWEEKLY)
```

### Enhanced Parser Output
```javascript
{
  type: 'Flower' | 'Vegetable' | 'Flex',
  size: 'Petite' | 'Small' | 'Regular' | 'Large' | 'Family',
  season: 'Spring' | 'Summer' | 'Fall' | 'Year-Round',
  frequency: 'Weekly' | 'Biweekly',
  year: 2026,
  vegCode: 0 | 1 | 2,  // From Customer_Bridge: 0=none, 1=small, 2=large
  floralCode: 0 | 1 | 2,  // From Customer_Bridge: 0=none, 1=petite, 2=full
  estimatedValue: number,
  startDate: Date,
  endDate: Date,
  totalWeeks: number
}
```

### Share Code Logic (From Owner's Customer_Bridge)
```
Veg Codes: 0 = No veg, 1 = Small/Regular, 2 = Large/Family
Floral Codes: 0 = No flowers, 1 = Petite Bloom, 2 = Full Bloom
```

---

## TASK 3: Magic Link Authentication System

### Current State
- Basic magic link functions exist in api-config.js (frontend)
- Backend needs proper token generation, storage, and verification

### Implementation
```javascript
// Generate magic link
function generateCSAMagicLink(email, memberId) {
  const token = Utilities.getUuid(); // or crypto random
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24); // 24-hour expiry

  // Store in Magic_Links sheet or Properties
  storeMagicLink(token, email, memberId, expiry);

  // Return full URL
  const portalUrl = 'https://toddismyname21.github.io/tiny-seed-os/web_app/csa.html';
  return portalUrl + '?token=' + token + '&email=' + encodeURIComponent(email);
}

// Verify magic link
function verifyCSAMagicLink(token, email) {
  const linkData = getMagicLink(token);
  if (!linkData) return { success: false, error: 'Invalid link' };
  if (linkData.email !== email) return { success: false, error: 'Email mismatch' };
  if (new Date() > linkData.expiry) return { success: false, error: 'Link expired' };

  // Mark as used
  markMagicLinkUsed(token);

  // Return customer + membership data
  return {
    success: true,
    customer: getCustomerByEmail(email),
    csaMembership: getCSAMembershipByEmail(email)
  };
}
```

### API Endpoints Needed
```javascript
// In doPost:
case 'sendCSAMagicLink':
  return sendCSAMagicLink(data.email);

case 'verifyCSAMagicLink':
  return verifyCSAMagicLink(data.token, data.email);

// In doGet:
case 'getCSAPortalSession':
  return getCSAPortalSession(params);
```

---

## TASK 4: Welcome Email System

### Email Template
```
Subject: Welcome to Tiny Seed Farm CSA! Your Portal Access

Hi [FIRST_NAME],

Thank you for joining Tiny Seed Farm CSA for the [SEASON] [YEAR] season!

YOUR SHARE DETAILS:
- Share Type: [SHARE_TYPE] [SHARE_SIZE]
- Pickup: [PICKUP_DAY] at [PICKUP_LOCATION]
- Season: [START_DATE] to [END_DATE]
- Deliveries: [TOTAL_WEEKS] [FREQUENCY] boxes

ACCESS YOUR MEMBER PORTAL:
[MAGIC_LINK_BUTTON]

In your portal you can:
- View this week's box contents
- Customize your box (swap items you don't want)
- Schedule vacation holds
- See your pickup history
- Update your preferences

Questions? Reply to this email or call us at [PHONE].

See you at pickup!
- The Tiny Seed Team
```

### Implementation
```javascript
function sendCSAWelcomeEmail(memberId) {
  const member = getCSAMemberById(memberId);
  const customer = getCustomerById(member.customerId);
  const magicLink = generateCSAMagicLink(customer.email, memberId);

  const template = HtmlService.createTemplateFromFile('CSAWelcomeEmail');
  template.customer = customer;
  template.member = member;
  template.magicLink = magicLink;

  const htmlBody = template.evaluate().getContent();

  MailApp.sendEmail({
    to: customer.email,
    subject: 'Welcome to Tiny Seed Farm CSA! Your Portal Access',
    htmlBody: htmlBody,
    replyTo: 'tinyseedfarm@gmail.com'
  });

  // Log the email
  logCSAEmail(memberId, 'welcome', new Date());
}
```

---

## TASK 5: Shopify Product Cleanup

Owner wants to delete all Shopify products EXCEPT 2026 CSA products.

### Implementation
```javascript
function cleanShopifyProducts(dryRun = true) {
  const products = getAllShopifyProducts();
  const toDelete = [];
  const toKeep = [];

  for (const product of products) {
    const title = product.title.toLowerCase();

    // Keep 2026 CSA products
    if (title.includes('2026') &&
        (title.includes('csa') || title.includes('share') || title.includes('fleurs'))) {
      toKeep.push(product);
    } else {
      toDelete.push(product);
    }
  }

  if (dryRun) {
    return {
      toDelete: toDelete.map(p => ({ id: p.id, title: p.title })),
      toKeep: toKeep.map(p => ({ id: p.id, title: p.title })),
      message: 'DRY RUN - No products deleted'
    };
  }

  // Actually delete
  for (const product of toDelete) {
    deleteShopifyProduct(product.id);
    Utilities.sleep(500); // Rate limit
  }

  return { deleted: toDelete.length, kept: toKeep.length };
}
```

---

## TASK 6: Auto-Onboarding Flow

When Shopify webhook fires for CSA purchase:

```
1. WEBHOOK RECEIVED
   |
   v
2. PARSE ORDER
   - Extract customer info
   - Extract line items
   - Identify CSA products
   |
   v
3. FOR EACH CSA PRODUCT:
   |
   v
4. CREATE/UPDATE CUSTOMER
   - Check if email exists
   - Create or update record
   - Generate Customer_ID
   |
   v
5. CREATE CSA MEMBERSHIP
   - Parse share type
   - Calculate season dates
   - Set swap credits
   - Generate Member_ID
   |
   v
6. GENERATE MAGIC LINK
   - Create secure token
   - Store with expiry
   - Build portal URL
   |
   v
7. SEND WELCOME EMAIL
   - Use template
   - Include magic link
   - Log email sent
   |
   v
8. LOG EVERYTHING
   - Webhook log
   - Email log
   - Error log (if any)
```

---

## DELIVERABLES

1. **Code Changes to MERGED TOTAL.js:**
   - [ ] `handleShopifyWebhook(payload)` function
   - [ ] Enhanced `parseShopifyShareType()` with veg/floral codes
   - [ ] `generateCSAMagicLink(email, memberId)` function
   - [ ] `verifyCSAMagicLink(token, email)` function
   - [ ] `sendCSAWelcomeEmail(memberId)` function
   - [ ] `cleanShopifyProducts(dryRun)` function
   - [ ] doPost handler for `shopifyWebhook`
   - [ ] doPost handler for `sendCSAMagicLink`
   - [ ] doPost handler for `verifyCSAMagicLink`

2. **New HTML Template:**
   - [ ] `CSAWelcomeEmail.html` - Welcome email template

3. **New Sheet (if needed):**
   - [ ] `Magic_Links` sheet or use Script Properties

4. **Documentation:**
   - [ ] Update OUTBOX.md with all changes
   - [ ] Webhook setup instructions for Shopify

---

## CRITICAL REQUIREMENTS

1. **NO SHORTCUTS** - This must be production-ready
2. **Follow existing patterns** - Check how other functions work in MERGED TOTAL.js
3. **Error handling** - Every function needs try/catch with logging
4. **Rate limiting** - Shopify API has limits, respect them
5. **Idempotency** - Webhooks can fire multiple times, handle duplicates
6. **Security** - Validate webhook signatures, expire magic links

---

## COORDINATION

- Read COORDINATION_RULES.md before making changes
- Update your OUTBOX.md when done
- Test all endpoints before declaring complete
- UX Claude will need the magic link endpoints for the portal

---

*Backend Claude - Build the auto-onboarding system that makes Tiny Seed's CSA management effortless*
