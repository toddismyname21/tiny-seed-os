# MORNING PRODUCT BRIEF
## Tiny Seed Farm - Product Standardization Summary

**Date:** 2026-01-16
**Prepared by:** Sales_CRM Claude
**For:** Owner Review

---

## EXECUTIVE SUMMARY

I analyzed the codebase and created a standardized product catalog for multi-channel sales. This document summarizes my findings and recommendations.

---

## PRODUCT COUNT SUMMARY

| Category | Count | Notes |
|----------|-------|-------|
| Vegetables | 15 | Core produce items |
| Herbs | 4 | Culinary herbs |
| Flowers | 4 | Cut flowers for bouquets |
| CSA Shares | 4 | Small, Medium, Large, Family |
| Bundles | 4 | Specialty packs |
| **TOTAL** | **27** | Products ready for standardization |

---

## CATEGORIES OVERVIEW

### Vegetables (15 products)
**Leafy Greens:** Lettuce Mix, Salad Greens, Kale (2 varieties), Arugula, Spinach
**Fruiting:** Tomatoes (2 types), Peppers (2 types), Zucchini
**Root:** Carrots, Beets, Radishes
**Legumes:** Sugar Snap Peas

### Herbs (4 products)
Basil, Cilantro, Parsley, Dill

### Flowers (4 products)
Sunflowers, Zinnias, Dahlias, Cosmos

### CSA Shares (4 sizes)
Small (~$20/wk), Medium (~$35/wk), Large (~$50/wk), Family (~$65/wk)

### Bundles (4 specialty items)
Salsa Pack, Stir Fry Pack, Farmer's Bouquet, Weekly Market Box

---

## PRICE RANGES

| Category | Retail Range | Wholesale Range |
|----------|-------------|-----------------|
| Vegetables | $3.00 - $10.00 | $2.00 - $8.50 |
| Herbs | $3.00 - $4.00 | $2.50 - $3.00 |
| Flowers | $8.00 - $15.00 | $6.00 - $12.00 |
| Bundles | $10.00 - $25.00 | N/A |

---

## RECOMMENDED STANDARDIZATION CHANGES

### 1. SKU System
**Current:** No consistent SKUs
**Recommended:** `[CROP-3]-[VAR-3]-[UNIT-2]`
- Example: `TOM-HEIR-LB` = Tomatoes, Heirloom, Pound

### 2. Unit Standardization
**Current:** Mixed units (bunch, lb, bag, pint)
**Recommended:** Keep variety but document standard quantities
- bunch = 6-8 oz (greens), 1 lb (roots)
- bag = 4-6 oz (clamshell)

### 3. Price Consistency
**Current:** Some price variations between sample data
**Recommended:** Set master prices in REF_CropProfiles
- Retail = base price
- Wholesale = 15-25% discount

### 4. Product Naming
**Current:** Inconsistent (e.g., "Tomatoes" vs "Cherry Tomatoes")
**Recommended:** `[Crop], [Variety/Type]`
- Example: "Tomatoes, Heirloom"

---

## DOCUMENTS CREATED

| Document | Purpose | Status |
|----------|---------|--------|
| [PRODUCT_MASTER_LIST.md](./PRODUCT_MASTER_LIST.md) | Complete product catalog | Ready for review |
| [AVAILABILITY_CALENDAR.md](./AVAILABILITY_CALENDAR.md) | Seasonal availability | Ready for review |
| [PLATFORM_SYNC_SPEC.md](./PLATFORM_SYNC_SPEC.md) | Technical sync design | Ready for review |

---

## QUESTIONS FOR OWNER

### Pricing
1. Are the sample prices I found accurate?
2. What is your target wholesale discount (15%, 20%, 25%)?
3. What are the actual CSA share season prices?

### Products
4. Any products missing from my list?
5. Any products you want to remove for 2026?
6. Do you sell transplants to the public?
7. Any value-added products (dried herbs, preserves)?

### Operations
8. Do you do any winter production?
9. What storage crops do you sell through winter?
10. Do you offer holiday/gift boxes?

### Technical
11. Do you have Shopify credentials ready?
12. Do you have QuickBooks credentials ready?
13. Preferred sync frequency (real-time vs daily)?

---

## IMPLEMENTATION PRIORITY

### Immediate (This Week)
1. Owner reviews product list and prices
2. Owner provides Shopify/QB credentials
3. Finalize CSA share pricing

### Short-term (This Month)
4. Add products to Shopify with consistent SKUs
5. Create QB items for invoicing
6. Set up inventory sync

### Ongoing
7. Seasonal product enable/disable
8. Price adjustments as needed
9. New product additions

---

## NEXT STEPS

When you review this brief:

1. **Approve or edit** the product list
2. **Confirm prices** - especially CSA shares
3. **Provide credentials** for Shopify & QuickBooks
4. **Answer questions** above

Once approved, I can:
- Finalize the master product data
- Enable the Shopify/QB integrations
- Set up automated sync

---

## INTEGRATION STATUS

| Component | Status |
|-----------|--------|
| Shopify integration code | **READY** - needs credentials |
| QuickBooks integration code | **READY** - needs credentials |
| Product master data | **DRAFT** - needs review |
| Sync automation | **DESIGNED** - ready to implement |

---

## FILES TO REVIEW

```
/claude_sessions/sales_crm/
├── MORNING_PRODUCT_BRIEF.md    (this file)
├── PRODUCT_MASTER_LIST.md      (27 products cataloged)
├── AVAILABILITY_CALENDAR.md    (seasonal availability)
├── PLATFORM_SYNC_SPEC.md       (technical design)
└── OUTBOX.md                   (work log)
```

---

*Morning Brief - Ready for Owner Review*
*Sales_CRM Claude*
