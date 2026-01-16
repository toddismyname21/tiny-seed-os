# PLATFORM SYNC SPECIFICATION
## Tiny Seed Farm - Multi-Channel Product Management

**Created:** 2026-01-16
**Platforms:** Shopify, QuickBooks, Farm System (Google Sheets)

---

## OVERVIEW

### System Architecture

```
                    ┌─────────────────┐
                    │  MASTER DATA    │
                    │ (Google Sheets) │
                    │  REF_CropProfiles│
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ SHOPIFY  │  │QUICKBOOKS│  │  FARM    │
        │ Products │  │  Items   │  │ Portals  │
        └──────────┘  └──────────┘  └──────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                    ┌────────▼────────┐
                    │  INTEGRATION    │
                    │    LOG          │
                    └─────────────────┘
```

### Single Source of Truth
**REF_CropProfiles** in Google Sheets is the master product database.
All platforms sync FROM this source.

---

## DATA MAPPING

### Master Data → Shopify

| REF_CropProfiles | Shopify Product | Notes |
|------------------|-----------------|-------|
| Crop_Name | product.title | Main product name |
| Primary_Category | product.product_type | Category for filtering |
| Variety_Default | variant.title | Default variety |
| Harvest_Unit | - | Used for variant options |
| Price_Retail | variant.price | Retail price |
| - | variant.sku | Generated: [CROP-3]-[VAR-3]-[UNIT-2] |
| - | variant.inventory_quantity | From inventory system |
| Color_Hex | - | Could use for product tags |

### Master Data → QuickBooks

| REF_CropProfiles | QuickBooks Item | Notes |
|------------------|-----------------|-------|
| Crop_Name | Item.Name | Format: [Category]-[Product] |
| Primary_Category | Item.Type | Service or Inventory |
| Price_Retail | SalesPrice | Default price |
| Price_Wholesale | - | Stored in description or custom field |
| Harvest_Unit | Item.Description | Unit info |

### Master Data → Farm Portals

| REF_CropProfiles | customer.html/wholesale.html | Notes |
|------------------|------------------------------|-------|
| Crop_ID | product.id | Internal ID |
| Crop_Name | product.name | Display name |
| Primary_Category | product.category | For filtering |
| Harvest_Unit | product.unit | Unit display |
| Price_Retail | product.price (retail) | Customer portal |
| Price_Wholesale | product.price (wholesale) | Wholesale portal |

---

## SHOPIFY PRODUCT STRUCTURE

### Product Template
```json
{
  "product": {
    "title": "Tomatoes, Heirloom",
    "body_html": "<p>Fresh heirloom tomatoes from Tiny Seed Farm</p>",
    "vendor": "Tiny Seed Farm",
    "product_type": "Vegetables",
    "tags": ["organic", "local", "summer", "fruiting"],
    "status": "active",
    "variants": [
      {
        "title": "Per Pound",
        "price": "6.00",
        "sku": "TOM-HEIR-LB",
        "inventory_management": "shopify",
        "inventory_quantity": 50,
        "weight": 1,
        "weight_unit": "lb"
      }
    ]
  }
}
```

### Collection Structure
| Collection | Products | Handle |
|------------|----------|--------|
| Vegetables | All veg products | vegetables |
| Herbs | All herb products | herbs |
| Flowers | All flower products | flowers |
| CSA Shares | CSA subscriptions | csa-shares |
| Bundles | Bundle products | bundles |
| This Week | Currently available | this-week |

---

## QUICKBOOKS ITEM STRUCTURE

### Item Template
```json
{
  "Item": {
    "Name": "Tomatoes-Heirloom",
    "Type": "Service",
    "Description": "Heirloom tomatoes, sold by the pound",
    "UnitPrice": 6.00,
    "IncomeAccountRef": {
      "value": "1",
      "name": "Sales of Product Income"
    },
    "Taxable": true,
    "Active": true
  }
}
```

### Account Mapping
| Product Category | QB Income Account |
|------------------|-------------------|
| Vegetables | Produce Sales |
| Herbs | Produce Sales |
| Flowers | Flower Sales |
| CSA Shares | CSA Revenue |
| Bundles | Produce Sales |

---

## SYNC WORKFLOWS

### 1. New Product Workflow

```
1. Add to REF_CropProfiles (master)
        │
2. Run syncProductsToShopify()
        │
3. Run syncProductsToQuickBooks()
        │
4. Product appears in all platforms
```

**API Endpoints:**
- `?action=syncProductsToShopify`
- `?action=syncProductsToQuickBooks`

### 2. Price Change Workflow

```
1. Update Price_Retail/Price_Wholesale in REF_CropProfiles
        │
2. Run updateShopifyPrices()
        │
3. Run updateQuickBooksPrices()
        │
4. Prices updated everywhere
```

**API Endpoints:**
- `?action=updateShopifyPrices`
- `?action=updateQuickBooksPrices`

### 3. Inventory Sync Workflow

```
Farm Harvest
        │
LOG_Inventory updated
        │
Run syncInventoryToShopify()
        │
Shopify stock updated
```

**Frequency:** Daily or after each harvest entry

### 4. Order → Invoice Workflow

```
Shopify Order Received
        │ (webhook or manual sync)
SHOPIFY_Orders sheet
        │
syncShopifyOrderToQuickBooks()
        │
QuickBooks Invoice Created
        │
QB_Invoices sheet (tracking)
```

**API Endpoints:**
- Webhook: `?action=shopifyWebhook&topic=orders/create`
- Manual: `?action=syncShopifyOrderToQuickBooks&shopifyOrderId=xxx`

---

## SYNC FREQUENCY

| Sync Type | Frequency | Trigger |
|-----------|-----------|---------|
| Product catalog | Weekly | Manual or scheduled |
| Prices | On change | Manual trigger |
| Inventory | Daily | After harvest entry |
| New orders | Real-time | Webhook |
| Invoices | Per order | Automatic or manual |
| Customers | Weekly | Manual or scheduled |

---

## CONFLICT RESOLUTION

### Price Conflicts
**Rule:** REF_CropProfiles is always correct
- If Shopify price differs → update Shopify
- If QB price differs → update QB

### Inventory Conflicts
**Rule:** Farm system (LOG_Inventory) is always correct
- Shopify quantity syncs FROM farm system
- Never sync Shopify → Farm (one-way sync)

### Product Name Conflicts
**Rule:** REF_CropProfiles is master
- Use consistent naming: "Crop_Name, Variety"
- SKU is the unique identifier across platforms

---

## ERROR HANDLING

### Sync Failures
1. Log to INTEGRATION_Log sheet
2. Set product status to "Sync Error"
3. Alert in admin dashboard
4. Retry on next sync cycle

### Missing Mappings
1. Product in Shopify but not in master → Flag for review
2. Product in master but not in Shopify → Auto-create
3. Customer in order but not in QB → Auto-create customer

---

## SEASONAL PRODUCT MANAGEMENT

### Season Start
```javascript
// Enable products for season
function enableSeasonalProducts(season) {
  const products = getProductsBySeason(season);
  products.forEach(p => {
    updateShopifyProductStatus(p.shopify_id, 'active');
  });
}
```

### Season End
```javascript
// Disable out-of-season products
function disableSeasonalProducts(season) {
  const products = getProductsBySeason(season);
  products.forEach(p => {
    updateShopifyProductStatus(p.shopify_id, 'draft');
    // Set inventory to 0
    updateShopifyInventory(p.variant_id, 0);
  });
}
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Master Data Setup
- [ ] Finalize REF_CropProfiles with all products
- [ ] Add SKU column
- [ ] Add Shopify_Product_ID column
- [ ] Add QB_Item_ID column

### Phase 2: Shopify Sync
- [ ] Configure Shopify credentials
- [ ] Create collections structure
- [ ] Initial product sync
- [ ] Test inventory updates
- [ ] Set up webhooks

### Phase 3: QuickBooks Sync
- [ ] Configure QB credentials
- [ ] Create income accounts
- [ ] Initial item sync
- [ ] Test invoice creation
- [ ] Link customers

### Phase 4: Automation
- [ ] Schedule daily inventory sync
- [ ] Enable order webhooks
- [ ] Set up seasonal triggers
- [ ] Create admin dashboard view

---

## MONITORING

### Key Metrics
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Sync success rate | >99% | <95% |
| Sync latency | <5 min | >15 min |
| Inventory accuracy | >98% | <95% |
| Price sync accuracy | 100% | Any mismatch |

### Log Review
- Daily: Check INTEGRATION_Log for errors
- Weekly: Audit product counts across platforms
- Monthly: Full reconciliation

---

## QUESTIONS FOR OWNER

1. Do you want real-time order sync or batch (daily)?
2. Should out-of-stock items be hidden or shown as "sold out"?
3. Do you want price changes to require approval before sync?
4. Any products that should NOT sync to certain platforms?

---

*PLATFORM_SYNC_SPEC.md - Sales_CRM Claude*
