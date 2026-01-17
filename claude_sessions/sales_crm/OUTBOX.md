# OUTBOX: Sales_CRM Claude
## To: PM_Architect

**Updated:** 2026-01-16 10:00

---

## STATUS: ALL DELIVERABLES COMPLETE + BONUS

### Primary Mission: COMPLETE

| Document | Status | Location |
|----------|--------|----------|
| PRODUCT_MASTER_LIST.md | **COMPLETE** | `/claude_sessions/sales_crm/PRODUCT_MASTER_LIST.md` |
| AVAILABILITY_CALENDAR.md | **COMPLETE** | `/claude_sessions/sales_crm/AVAILABILITY_CALENDAR.md` |
| PLATFORM_SYNC_SPEC.md | **COMPLETE** | `/claude_sessions/sales_crm/PLATFORM_SYNC_SPEC.md` |
| MORNING_PRODUCT_BRIEF.md | **COMPLETE** | `/claude_sessions/sales_crm/MORNING_PRODUCT_BRIEF.md` |
| TRACEABILITY_DESIGN.md | **BONUS** | `/claude_sessions/sales_crm/TRACEABILITY_DESIGN.md` |

---

## PRODUCT CATALOG - FINAL COUNT

Updated with real pricing data from owner's files:

| Category | Count | Retail Range | Wholesale Range |
|----------|-------|--------------|-----------------|
| Tomatoes | 4 | $4 - $65 | - |
| Peppers | 15 | $3 - $25 | $5 - $5.50/lb |
| Salad Greens | 9 | $4 - $10 | $12.50/lb, $63-66/case |
| Bunched Greens | 8 | $4 | $20-30/12ct |
| Head Lettuce | 12 | $3 - $6 | $20-50/12-24ct |
| Brassicas | 9 | $3 - $6 | $1.75 - $5.50/lb |
| Root Vegetables | 12 | $3 - $5 | $2.25 - $3/lb |
| Alliums | 2 | $2 - $4 | - |
| Other Vegetables | 9 | $2 - $5 | $2.25 - $3.25/lb |
| Herbs | 16 | $3 | $11 - $30/unit |
| Mushrooms | 3 | $5 - $6 | $12 - $18/lb |
| Flowers & Floral | 7 | $3 - $35 | $6/8oz |
| CSA Vegetable | 6 + 6 Flex tiers | $150 - $1,000 | - |
| CSA Flowers | 5 | $90 - $400 | - |
| **TOTAL** | **~120** | Products cataloged | |

---

## DATA SOURCES USED

### From Owner
1. **Chef Wholesale List - CHEF LIST.csv** - Wholesale pricing for restaurants
2. **FLEX CSA AVAILABILITY LIST - FLEXLIST.csv** - Retail pricing for Flex CSA

### From Website
3. **tinyseedfarm.com** - 2026 CSA subscription pricing

### From Codebase
4. `apps_script/MERGED TOTAL.js` - REF_CropProfiles schema
5. `web_app/customer.html` - Sample products
6. `calendar.html`, `succession.html` - Crop planning data

---

## CSA PRICING (from tinyseedfarm.com)

### Vegetable Shares
| Share | Weekly | Biweekly |
|-------|--------|----------|
| Small Summer | $540 | $270 |
| Friends & Family | $720 | $360 |
| Spring CSA | $150 (limited) | - |
| Flex CSA | $150 - $1,000 (6 tiers) | - |

### Flower Shares (Tiny Seed Fleurs)
| Share | Weekly | Biweekly |
|-------|--------|----------|
| Full Bloom Bouquet | $400 | $200 |
| Petite Bloom Bouquet | $300 | $150 |
| DIY Bloom Bucket | $90 (season) | - |

---

## 2026 FARMERS MARKETS (CONFIRMED BY OWNER)

| Market | Status |
|--------|--------|
| Lawrenceville | Returning |
| Bloomfield | Returning |
| Sewickley | Returning |
| Squirrel Hill | **NEW** |

*Dropped for 2026: Northside, Forest Hills*

---

## BONUS: TRACEABILITY DESIGN

Owner requested seed-to-sale traceability research. Created comprehensive design:

### Key Findings
- FSMA 204 Food Traceability Rule (effective 2026)
- Industry standard: Traceability Lot Codes (TLC)
- Your system already links seeds → plantings via `deductSeedsForPlanting()`

### Proposed TLC Format
```
[CROP-3]-[FIELD]-[YYYYMMDD]
Example: TOM-F3-20260715
```

### Complete Chain
```
Seed_Lot_ID → Batch_ID → Lot_ID (TLC) → Order_ID
INV_Seeds → PLAN_Plantings → LOG_Harvest → SALES_OrderItems
```

### Gaps Identified
1. No Crop_ID in REF_CropProfiles
2. No REF_Products sheet linking SKUs to crops
3. No LOG_Harvest sheet for TLC assignment
4. No Lot_ID in sales order items

See `TRACEABILITY_DESIGN.md` for full specification.

---

## INTEGRATION STATUS

| Component | Status |
|-----------|--------|
| Shopify Integration Code | **READY** - needs credentials |
| QuickBooks Integration Code | **READY** - needs credentials |
| Product Master Data | **COMPLETE** - 120 products |
| Platform Sync Spec | **COMPLETE** |
| Traceability Design | **COMPLETE** - awaiting approval |
| **Credentials** | **STILL NEEDS OWNER** |

---

## REMAINING QUESTIONS FOR OWNER

### Answered
- ✓ CSA pricing (pulled from website)
- ✓ 2026 farmers markets (4 confirmed)
- ✓ Product pricing (from CSV files)

### Still Need
1. Shopify credentials (store name, API key, access token)
2. QuickBooks credentials (client ID, client secret, company ID)
3. Approval of traceability lot code format
4. Any missing products or price corrections?

---

## NEXT STEPS

Once owner provides credentials:
1. Enable Shopify integration
2. Enable QuickBooks integration
3. Initial product sync to both platforms
4. Implement traceability system (Phase 1)

---

*Sales_CRM Claude - All deliverables complete*
*Awaiting credentials to go live*
