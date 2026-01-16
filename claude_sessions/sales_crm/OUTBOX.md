# OUTBOX: Sales_CRM Claude
## To: PM_Architect

**Updated:** 2026-01-16 06:30

---

## OVERNIGHT MISSION COMPLETE: PRODUCT STANDARDIZATION

Completed all deliverables from the overnight directive.

### Documents Created

| Document | Status | Location |
|----------|--------|----------|
| PRODUCT_MASTER_LIST.md | COMPLETE | `/claude_sessions/sales_crm/PRODUCT_MASTER_LIST.md` |
| AVAILABILITY_CALENDAR.md | COMPLETE | `/claude_sessions/sales_crm/AVAILABILITY_CALENDAR.md` |
| PLATFORM_SYNC_SPEC.md | COMPLETE | `/claude_sessions/sales_crm/PLATFORM_SYNC_SPEC.md` |
| MORNING_PRODUCT_BRIEF.md | COMPLETE | `/claude_sessions/sales_crm/MORNING_PRODUCT_BRIEF.md` |

### Product Catalog Summary

| Category | Count | Price Range |
|----------|-------|-------------|
| Vegetables | 15 | $3.00 - $10.00 |
| Herbs | 4 | $3.00 - $4.00 |
| Flowers | 4 | $8.00 - $15.00 |
| CSA Shares | 4 | TBD (needs owner input) |
| Bundles | 4 | $10.00 - $25.00 |
| **TOTAL** | **27** | Products cataloged |

### Key Deliverables

1. **PRODUCT_MASTER_LIST.md**
   - 27 products with SKUs, units, retail/wholesale prices
   - Standardized SKU format: `[CROP-3]-[VAR-3]-[UNIT-2]`
   - QuickBooks item naming convention
   - Seasonal availability per product

2. **AVAILABILITY_CALENDAR.md**
   - Monthly availability matrix (H/P/L/- notation)
   - Season breakdown (Early/Peak/Late/Storage)
   - Farm location data: Zelienople, PA (Zone 6a)
   - Frost dates: Spring May 20, Fall Oct 10
   - CSA share contents by season

3. **PLATFORM_SYNC_SPEC.md**
   - Data mapping: Master → Shopify → QuickBooks
   - Sync workflows: Products, Prices, Inventory, Orders
   - Conflict resolution rules (REF_CropProfiles is master)
   - Implementation checklist
   - Monitoring metrics

4. **MORNING_PRODUCT_BRIEF.md**
   - Executive summary for owner review
   - 13 questions for owner (pricing, products, operations, technical)
   - Implementation priorities
   - Ready for morning review

### Questions for Owner (from MORNING_PRODUCT_BRIEF.md)

**Pricing:**
1. Are the sample prices accurate?
2. Target wholesale discount (15%, 20%, 25%)?
3. Actual CSA share season prices?

**Products:**
4. Any products missing?
5. Any products to remove for 2026?
6. Do you sell transplants to public?
7. Any value-added products?

**Operations:**
8. Winter production?
9. Storage crops sold through winter?
10. Holiday/gift boxes?

**Technical:**
11. Shopify credentials ready?
12. QuickBooks credentials ready?
13. Preferred sync frequency?

### Data Sources Used

- `web_app/customer.html` - Sample retail products
- `web_app/wholesale.html` - Sample wholesale products
- `apps_script/MERGED TOTAL.js` - REF_CropProfiles schema
- `calendar.html` - Crop varieties and DTM
- `succession.html` - Crop planning data

### Next Steps (After Owner Review)

1. Owner reviews MORNING_PRODUCT_BRIEF.md
2. Owner answers 13 questions
3. Owner provides Shopify/QB credentials
4. Finalize product prices (especially CSA)
5. Enable platform integrations
6. Initial product sync to Shopify/QB

---

## INTEGRATION STATUS UPDATE

Previous Shopify/QuickBooks integration work is complete.

| Component | Status |
|-----------|--------|
| Shopify Integration Code | READY |
| QuickBooks Integration Code | READY |
| Product Master Data | DRAFT - Awaiting review |
| Platform Sync Spec | COMPLETE |
| **Credentials** | **STILL NEEDS OWNER** |

---

## SHOPIFY & QUICKBOOKS INTEGRATION - IMPLEMENTED

I researched and implemented both integrations. Code is ready - just needs credentials.

---

## RESEARCH FINDINGS

### Shopify API
- **Authentication**: OAuth2 or Access Token (for private/custom apps)
- **API Version**: 2024-01
- **Key Endpoints**: `/admin/api/{version}/orders.json`, `/products.json`, `/inventory_levels/set.json`
- **Webhooks**: Support real-time sync for orders/create, orders/updated, products/update
- **Library**: Uses Google Apps Script OAuth2 library (ID: 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF)

### QuickBooks Online API
- **Authentication**: OAuth2 with 60-minute token expiration (auto-refresh)
- **Auth URL**: `https://appcenter.intuit.com/connect/oauth2`
- **Token URL**: `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer`
- **Scope**: `com.intuit.quickbooks.accounting`
- **Key Endpoints**: `/invoice`, `/customer`, `/query`
- **Note**: 2025 changes require Intuit App Partner Program registration

### Sources
- [Google Apps Script OAuth2 Library](https://github.com/googleworkspace/apps-script-oauth2)
- [QuickBooks OAuth2 for Apps Script](https://gist.github.com/goelp/945ee0583e1df9663cc9e17ae5a2b9bb)
- [Shopify API Examples](https://gist.github.com/jalcantarab/903121ac2a1b8879746224bf0feee770)

---

## IMPLEMENTATION COMPLETE

### Files Modified
**`apps_script/MERGED TOTAL.js`** - Added ~950 lines of integration code (lines 17804-18752)

### New Configuration (lines 17821-17840)
```javascript
const SHOPIFY_CONFIG = {
  STORE_NAME: 'YOUR_STORE_NAME',
  API_KEY: 'YOUR_SHOPIFY_API_KEY',
  API_SECRET: 'YOUR_SHOPIFY_API_SECRET',
  ACCESS_TOKEN: 'YOUR_SHOPIFY_ACCESS_TOKEN',
  API_VERSION: '2024-01',
  ENABLED: false  // Set true after config
};

const QUICKBOOKS_CONFIG = {
  CLIENT_ID: 'YOUR_QB_CLIENT_ID',
  CLIENT_SECRET: 'YOUR_QB_CLIENT_SECRET',
  COMPANY_ID: 'YOUR_QB_COMPANY_ID',
  ENVIRONMENT: 'sandbox',  // or 'production'
  ENABLED: false  // Set true after config
};
```

### New Sheets Created (run `setupIntegrationSheets()`)
| Sheet | Purpose |
|-------|---------|
| SHOPIFY_Orders | Synced Shopify orders |
| SHOPIFY_Products | Synced products/variants |
| QB_Customers | QuickBooks customers |
| QB_Invoices | Created invoices |
| INTEGRATION_Log | Activity logging |
| SYS_OAuthTokens | Token storage |

---

## NEW API ENDPOINTS

### GET Endpoints (doGet)
| Endpoint | Function |
|----------|----------|
| `getIntegrationStatus` | Check Shopify/QB connection status |
| `setupIntegrationSheets` | Create required sheets |
| `getShopifyAuthUrl` | Get Shopify OAuth URL |
| `testShopifyConnection` | Test Shopify API |
| `syncShopifyOrders` | Pull orders from Shopify |
| `syncShopifyProducts` | Pull products from Shopify |
| `getShopifyOrder` | Get single order |
| `getQuickBooksAuthUrl` | Get QB OAuth URL |
| `testQuickBooksConnection` | Test QB API |
| `disconnectQuickBooks` | Revoke QB access |
| `syncQuickBooksCustomers` | Pull customers from QB |
| `createInvoiceFromOrder` | Create QB invoice from order |
| `syncShopifyOrderToQuickBooks` | Shopify order → QB invoice |

### POST Endpoints (doPost)
| Endpoint | Function |
|----------|----------|
| `shopifyWebhook` | Handle Shopify webhooks |
| `createQuickBooksInvoice` | Create invoice directly |
| `createQuickBooksCustomer` | Create customer directly |

---

## SHOPIFY FEATURES IMPLEMENTED

### Orders
- `syncShopifyOrders()` - Bulk sync orders from Shopify
- `getShopifyOrder(orderId)` - Get single order
- `updateShopifyOrderFulfillment()` - Mark as fulfilled with tracking
- `handleShopifyOrderWebhook()` - Real-time order sync

### Products & Inventory
- `syncShopifyProducts()` - Bulk sync products
- `updateShopifyInventory()` - Update stock levels
- `syncFarmInventoryToShopify()` - Push farm inventory (placeholder)
- `handleShopifyProductWebhook()` - Real-time product sync

---

## QUICKBOOKS FEATURES IMPLEMENTED

### Customers
- `syncQuickBooksCustomers()` - Bulk sync from QB
- `createQuickBooksCustomer()` - Create new customer
- `findOrCreateQBCustomer()` - Find by email or create

### Invoices
- `createQuickBooksInvoice()` - Create invoice with line items
- `createInvoiceFromOrder()` - Create invoice from SALES_Orders
- `syncShopifyOrderToQuickBooks()` - Shopify order → QB invoice

---

## DATA FLOW (When Configured)

```
SHOPIFY STORE
     ↓ (webhook or sync)
SHOPIFY_Orders sheet
     ↓ (syncShopifyOrderToQuickBooks)
QUICKBOOKS INVOICE
     ↓
QB_Invoices sheet (tracking)
```

```
FARM ORDER (customer.html/wholesale.html)
     ↓
SALES_Orders sheet
     ↓ (createInvoiceFromOrder)
QUICKBOOKS INVOICE
     ↓
QB_Invoices sheet (tracking)
```

---

## SETUP INSTRUCTIONS FOR OWNER

### Step 1: Add OAuth2 Library to Apps Script
1. Open Apps Script editor
2. Libraries → Add
3. Script ID: `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF`
4. Select latest version

### Step 2: Create Shopify Custom App
1. Go to: `https://admin.shopify.com/store/{store}/settings/apps/development`
2. Create new app
3. Configure Admin API scopes:
   - `read_products`, `write_products`
   - `read_orders`, `write_orders`
   - `read_inventory`, `write_inventory`
   - `read_customers`
4. Install app and get Access Token
5. Update `SHOPIFY_CONFIG` in code

### Step 3: Create QuickBooks App
1. Go to: `https://developer.intuit.com/app/developer/qbo/docs/get-started`
2. Create new app
3. Get Client ID and Client Secret
4. Set redirect URI to Apps Script callback URL
5. Update `QUICKBOOKS_CONFIG` in code

### Step 4: Initialize
1. Run `setupIntegrationSheets()` to create sheets
2. Set `ENABLED: true` for each service
3. For QuickBooks: Call `getQuickBooksAuthUrl()` and authorize
4. Test connections with `testShopifyConnection()` and `testQuickBooksConnection()`

### Step 5: Configure Shopify Webhooks (Optional)
1. In Shopify Admin → Settings → Notifications → Webhooks
2. Add webhook for `orders/create` pointing to your Apps Script URL with `?action=shopifyWebhook&topic=orders/create`

---

## WHAT'S LEFT TO DO

| Task | Owner | Notes |
|------|-------|-------|
| Add credentials | Owner | Shopify & QB app credentials |
| Set ENABLED: true | Owner | In config after adding credentials |
| Run OAuth flow | Owner | Click QB auth URL to connect |
| Configure webhooks | Owner | Optional - for real-time sync |
| Test end-to-end | Sales_CRM Claude | After credentials added |

---

## TESTING (After Credentials Added)

```javascript
// Test Shopify
testShopifyConnection()
syncShopifyOrders({ limit: 5 })
syncShopifyProducts()

// Test QuickBooks
testQuickBooksConnection()
syncQuickBooksCustomers()

// Test Integration
syncShopifyOrderToQuickBooks('shopify-order-id')
createInvoiceFromOrder('ORD-xxx', 'Sales')
```

---

## SUMMARY

| Component | Status |
|-----------|--------|
| Shopify OAuth2 | IMPLEMENTED |
| Shopify API calls | IMPLEMENTED |
| Shopify webhooks | IMPLEMENTED |
| QuickBooks OAuth2 | IMPLEMENTED |
| QuickBooks invoices | IMPLEMENTED |
| QuickBooks customers | IMPLEMENTED |
| Shopify → QB sync | IMPLEMENTED |
| Farm Order → QB | IMPLEMENTED |
| Integration sheets | IMPLEMENTED |
| API endpoints | IMPLEMENTED |
| **Credentials** | **NEEDS OWNER** |

**Code is deployed and ready. Just needs Shopify/QuickBooks app credentials from owner.**

---

*Sales_CRM Claude - Implementation Complete*
