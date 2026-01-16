# INBOX: Sales_CRM Claude
## From: PM_Architect

**Updated:** 2026-01-15 @ 7:30 PM
**URGENT UPDATE:** 2026-01-16 - OVERNIGHT DIRECTIVE

---

## OVERNIGHT MISSION (Owner is sleeping - WORK AUTONOMOUSLY)

### PRIMARY ASSIGNMENT: PRODUCT FORMALIZATION & STANDARDIZATION

Owner needs products and availability formalized so they're consistent across ALL platforms (Shopify, QB, farmers markets, CSA).

#### Task 1: Product Master List

Create `/claude_sessions/sales_crm/PRODUCT_MASTER_LIST.md`:

**Research from existing data:**
- What products does Tiny Seed sell? (vegetables, flowers, bundles)
- What are standard market prices?
- What's seasonal availability?
- What units are used (bunch, pound, each, flat)?

**Build the master product list:**
```
| Product | Category | Unit | Price | Season | Shopify SKU | QB Item |
|---------|----------|------|-------|--------|-------------|---------|
| Tomatoes, Heirloom | Vegetables | lb | $4.00 | Jun-Oct | TOM-HEIR-LB | ... |
```

**Include:**
- All vegetable crops
- All flower varieties
- CSA shares (if applicable)
- Bundles/specialty items

#### Task 2: Availability Calendar

Create `/claude_sessions/sales_crm/AVAILABILITY_CALENDAR.md`:

**Map products to seasons:**
- What's available when?
- Early season (March-May)
- Peak season (June-August)
- Late season (September-November)
- Storage crops (year-round)

#### Task 3: Platform Sync Spec

Create `/claude_sessions/sales_crm/PLATFORM_SYNC_SPEC.md`:

**Design how products sync across platforms:**
- Shopify product structure
- QuickBooks item structure
- How to keep inventory in sync
- Price change propagation
- Availability updates

#### Deliverable: MORNING PRODUCT BRIEF

Create `/claude_sessions/sales_crm/MORNING_PRODUCT_BRIEF.md`:
- Product count summary
- Categories overview
- Recommended standardization changes
- Questions for owner about pricing/availability

---

### SECONDARY ASSIGNMENT (If blocked on primary)

If you can't find product data or hit permissions:

**Sales Channel Analysis**
- Research best practices for multi-channel farm sales
- Shopify vs Square vs other platforms
- How successful farms manage inventory across channels
- Recommendations for Tiny Seed

---

### CREDENTIALS STATUS

Still waiting for owner to provide:
- Shopify: Store name, API key, API secret, access token
- QuickBooks: Client ID, Client secret, Company ID

Integration code is ready. Note this in your OUTBOX.

---

### CHECK-IN PROTOCOL

Write to your OUTBOX when:
1. Product list research complete
2. Master list drafted
3. Availability calendar done
4. Morning brief ready

**PM_Architect will check your OUTBOX.**

---

*Sales_CRM Claude - Standardize products for multi-channel consistency*
