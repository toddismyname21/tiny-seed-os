# SEED-TO-SALE TRACEABILITY DESIGN
## Tiny Seed Farm - Industry Standard Traceability System

**Created:** 2026-01-16
**Status:** DESIGN PROPOSAL
**Compliance Target:** FSMA 204 (Food Traceability Rule)

---

## EXECUTIVE SUMMARY

This document proposes a unified traceability system connecting:
- **REF_CropProfiles** (crop master data)
- **Product Master List** (sales SKUs)
- **Lot Tracking** (harvest batches)
- **Sales Orders** (customer transactions)

The goal: trace any product sold back to the specific field, planting date, and seed lot it came from.

---

## INDUSTRY STANDARDS RESEARCH

### FSMA 204 Food Traceability Rule

The FDA's Food Safety Modernization Act Section 204 establishes traceability requirements for produce. While small farms may be exempt, implementing these standards:
- Opens access to wholesale/retail buyers who require compliance
- Protects the farm in case of recalls
- Builds customer trust

**Key Requirements:**
1. **Traceability Lot Code (TLC)** - Unique identifier for each lot
2. **Critical Tracking Events (CTEs)** - Harvest, packing, shipping
3. **Key Data Elements (KDEs)** - Who, what, where, when
4. **24-hour record retrieval** - Must provide records to FDA within 24 hours
5. **2-year retention** - Keep records for 2 years after harvest

### Industry Best Practices

| Practice | Description | Tiny Seed Status |
|----------|-------------|------------------|
| Lot = Same crop, same field, same day | Standard definition | **Supported** (Batch_ID exists) |
| GS1 GTINs for products | Global Trade Item Numbers | **Not yet** (using custom SKUs) |
| QR codes for traceability | Consumer-facing transparency | **Partial** (seed lots have QR) |
| Digital recordkeeping | Electronic vs paper | **Yes** (Google Sheets) |
| Harvest logs with GPS | Location tracking | **Partial** (field/bed, not GPS) |

---

## CURRENT SYSTEM ANALYSIS

### Existing Data Structure

```
REF_CropProfiles (Master Crop Data)
├── Crop_Name, Variety_Default
├── Primary_Category, Family
├── Harvest_Unit
├── Price_Wholesale, Price_Retail
├── Yield_Lbs_Per_Ft
├── DTM values, spacing, etc.
└── [No Crop_ID or Product linking]

PLAN_Plantings (Production Data)
├── Batch_ID (e.g., "CAR-2026-001")
├── Crop, Variety
├── Planting_Method, Target_Bed_ID
├── Sow_Date, Target_Harvest_Date
└── [Links to seed lots via deduction]

INV_Seeds (Seed Inventory)
├── Seed_Lot_ID
├── Crop, Variety
├── Supplier, Purchase_Date
├── QR_Code_URL
└── [Linked to plantings via deductions]

MASTER_LOG (Activity Tracking)
├── Date, Activity, Location
├── Crop, Variety, Qty, Unit
├── Lot#, Staff
└── [Harvest events logged here]

SALES_Orders (Customer Sales)
├── Order_ID, Customer
├── Items (product names, qty, price)
└── [No lot/batch linking currently]
```

### Gap Analysis

| Need | Current State | Gap |
|------|---------------|-----|
| Unique Crop ID | None - uses Crop_Name | **MISSING** |
| Product → Crop linking | None | **MISSING** |
| Seed → Planting linking | **EXISTS** via `deductSeedsForPlanting()` | **DONE** |
| Harvest → Batch linking | Batch_ID exists but not in harvest log | **PARTIAL** |
| Harvest → Lot tracking | No formal harvest lot system | **MISSING** |
| Sale → Lot linking | None | **MISSING** |
| Pack date recording | Exists in employee.html | **EXISTS** |
| Customer recall capability | Cannot trace product to buyer | **MISSING** |

### Existing Seed-to-Planting Link (Already Working!)

Your system already links seeds to plantings via `deductSeedsForPlanting()` in MERGED TOTAL.js:

```javascript
// When a planting is created, seeds are deducted and linked:
seedDeduction = deductSeedsForPlanting({
  crop: 'Tomatoes',
  variety: 'Cherokee Purple',
  plantsNeeded: 200,
  batchId: 'TOM-2026-003',  // ← Planting batch
  method: 'Transplant'
});

// This creates a transaction in INV_Transactions:
// - Seed_Lot_ID: SL-TOM-2025-001
// - Batch_ID: TOM-2026-003  ← Links seed to planting!
// - Transaction_Type: APPLICATION
```

**What we need to add:**
1. Capture `Seed_Lot_ID` in PLAN_Plantings (currently only in transaction log)
2. Pass `Batch_ID` + `Seed_Lot_ID` to harvest logging
3. Pass `Lot_ID` to sales order items

---

## PROPOSED TRACEABILITY ARCHITECTURE

### Core Principle: Single Source of Truth

```
                    ┌─────────────────────────┐
                    │    REF_CropProfiles     │
                    │  (Master Crop Data)     │
                    │  + Crop_ID (NEW)        │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
    ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
    │  REF_Products   │ │ PLAN_       │ │  INV_Seeds      │
    │  (Sales SKUs)   │ │ Plantings   │ │  (Seed Lots)    │
    │  Crop_ID (FK)   │ │ Crop_ID(FK) │ │  Crop_ID (FK)   │
    └────────┬────────┘ └──────┬──────┘ └────────┬────────┘
             │                 │                  │
             │                 ▼                  │
             │        ┌─────────────────┐         │
             │        │  LOG_Harvest    │         │
             │        │  (Harvest Lots) │◄────────┘
             │        │  Lot_ID (TLC)   │
             │        └────────┬────────┘
             │                 │
             ▼                 ▼
    ┌─────────────────────────────────────┐
    │          SALES_Orders               │
    │  Order_ID, Customer_ID              │
    │  Line items with:                   │
    │    - Product_ID (→ REF_Products)    │
    │    - Lot_ID (→ LOG_Harvest)         │
    └─────────────────────────────────────┘
```

---

## NEW DATA STRUCTURES

### 1. REF_CropProfiles (Enhanced)

Add these columns to existing REF_CropProfiles:

| New Column | Type | Description |
|------------|------|-------------|
| **Crop_ID** | String | Unique identifier (e.g., "CROP-001") |
| **Active** | Boolean | Is this crop currently grown? |
| **GTIN** | String | GS1 Global Trade Item Number (optional) |
| **FDA_FTL** | Boolean | On FDA Food Traceability List? |

### 2. REF_Products (NEW Sheet)

Master list of sellable products, linked to crops:

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| **Product_ID** | String | Unique product identifier | "PROD-TOM-SLIC-LB" |
| **Crop_ID** | String | FK → REF_CropProfiles | "CROP-045" |
| **Product_Name** | String | Display name | "Slicing Tomatoes" |
| **SKU_Shopify** | String | Shopify SKU | "TOM-SLIC-LB" |
| **SKU_QB** | String | QuickBooks item name | "Tomatoes-Slicing" |
| **Unit** | String | Sales unit | "lb" |
| **Price_Retail** | Number | Retail price | 4.00 |
| **Price_Wholesale** | Number | Wholesale price | 3.00 |
| **Category** | String | Sales category | "Tomatoes" |
| **Season_Start** | String | When available | "Jun" |
| **Season_End** | String | When ends | "Oct" |
| **Active** | Boolean | Currently for sale? | TRUE |
| **Taxable** | Boolean | Collect sales tax? | TRUE |
| **Track_Inventory** | Boolean | Sync to Shopify inventory? | TRUE |

### 3. LOG_Harvest (NEW or Enhanced)

Track each harvest event with full traceability back to seed:

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| **Lot_ID** | String | Traceability Lot Code (TLC) | "TOM-F3-20260715" |
| **Harvest_Date** | Date | Date harvested | 2026-07-15 |
| **Crop_ID** | String | FK → REF_CropProfiles | "CROP-045" |
| **Batch_ID** | String | FK → PLAN_Plantings | "TOM-2026-003" |
| **Seed_Lot_ID** | String | FK → INV_Seeds (auto from Batch) | "SL-TOM-2025-001" |
| **Field_ID** | String | Field harvested from | "F3" |
| **Bed_IDs** | String | Specific beds | "F3-01, F3-02" |
| **Qty_Harvested** | Number | Amount harvested | 150 |
| **Unit** | String | Unit of measure | "lb" |
| **Harvested_By** | String | Employee(s) | "Maria, Jose" |
| **Time_Start** | Time | Harvest start time | 06:30 |
| **Time_End** | Time | Harvest end time | 09:00 |
| **Pack_Date** | Date | When packed | 2026-07-15 |
| **Pack_Location** | String | Where packed | "Wash Station" |
| **Packed_By** | String | Who packed | "Sarah" |
| **Storage_Location** | String | Where stored | "Cooler A" |
| **Qty_Sold** | Number | Amount sold from lot | 145 |
| **Qty_Waste** | Number | Amount culled/waste | 5 |
| **Status** | String | Lot status | "Active" / "Depleted" |
| **Notes** | String | Any notes | "Beautiful fruit" |

### Complete Traceability Chain

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     SEED-TO-SALE TRACEABILITY                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  INV_Seeds                PLAN_Plantings              LOG_Harvest       │
│  ──────────               ──────────────              ───────────       │
│  Seed_Lot_ID ──────────→  Batch_ID                                      │
│  Supplier                 Seed_Lot_ID ←───(linked)                      │
│  Crop                     Crop                                          │
│  Variety                  Variety                     Lot_ID (TLC)      │
│  Purchase_Date            Sow_Date                    Batch_ID ←────────┤
│  QR_Code_URL              Transplant_Date             Seed_Lot_ID ←─────┤
│                           Target_Bed_ID               Harvest_Date      │
│                           Plants_Needed               Field_ID          │
│                                                       Qty_Harvested     │
│                                                              │          │
│                                                              ▼          │
│                                                       SALES_OrderItems  │
│                                                       ────────────────  │
│                                                       Order_ID          │
│                                                       Product_ID        │
│                                                       Lot_ID ←──────────┤
│                                                       Qty_Sold          │
│                                                              │          │
│                                                              ▼          │
│                                                       SALES_Orders      │
│                                                       ────────────      │
│                                                       Customer_ID       │
│                                                       Order_Date        │
│                                                       Delivery_Date     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

TRACE EXAMPLE:
══════════════
Customer complaint about tomatoes in Order ORD-2026-0892
                    │
                    ▼
Query SALES_OrderItems → Lot_ID = TOM-F3-20260715
                    │
                    ▼
Query LOG_Harvest → Batch_ID = TOM-2026-003, Seed_Lot_ID = SL-TOM-2025-001
                    │
                    ▼
Query PLAN_Plantings → Sow_Date = 2026-03-15, Beds = F3-01,02,03
                    │
                    ▼
Query INV_Seeds → Supplier = Johnny's Seeds, Variety = Cherokee Purple
                    │
                    ▼
FULL TRACE COMPLETE: Seed supplier → Sow date → Field → Harvest → Customer
```

### 4. SALES_OrderItems (Enhanced)

Add lot tracking to order line items:

| Column | Type | Description |
|--------|------|-------------|
| **Order_ID** | String | FK → SALES_Orders |
| **Line_Number** | Number | Line item number |
| **Product_ID** | String | FK → REF_Products |
| **Lot_ID** | String | FK → LOG_Harvest (TLC) |
| **Qty** | Number | Quantity sold |
| **Unit_Price** | Number | Price per unit |
| **Line_Total** | Number | Qty × Unit_Price |

---

## TRACEABILITY LOT CODE (TLC) FORMAT

### Recommended Format

```
[CROP-3]-[FIELD]-[YYYYMMDD]

Examples:
- TOM-F3-20260715 = Tomatoes, Field 3, July 15, 2026
- KAL-GH1-20260401 = Kale, Greenhouse 1, April 1, 2026
- BAS-F1-20260612 = Basil, Field 1, June 12, 2026
```

### Alternative: Julian Date Format (Compact)

```
[CROP-3]-[FIELD]-[YY][JJJ]

Examples:
- TOM-F3-26196 = Tomatoes, Field 3, Day 196 of 2026 (July 15)
- KAL-GH1-26091 = Kale, Greenhouse 1, Day 91 of 2026 (April 1)
```

### For Multiple Harvests Same Day

```
[CROP-3]-[FIELD]-[YYYYMMDD]-[SEQ]

Examples:
- TOM-F3-20260715-A = Morning harvest
- TOM-F3-20260715-B = Afternoon harvest
```

---

## LINKING CROP PROFILES TO PRODUCTS

### The Key Insight

**One Crop = Multiple Products**

Example: Tomatoes (Crop) sells as:
- Slicing Tomatoes (1 lb) - retail
- Cherry Tomato Mix (pint) - retail
- Canning Tomatoes (10 lb) - bulk
- Canning Tomatoes (30 lb) - bulk

### Product-Crop Relationship

```javascript
// REF_Products row example
{
  Product_ID: "PROD-TOM-SLIC-LB",
  Crop_ID: "CROP-045",           // Links to REF_CropProfiles
  Product_Name: "Slicing Tomatoes",
  SKU_Shopify: "TOM-SLIC-LB",
  Unit: "lb",
  Price_Retail: 4.00,
  // ... other fields
}

// When selling, we can now trace:
// Product → Crop Profile → Planting Batch → Seed Lot
```

---

## CRITICAL TRACKING EVENTS (CTEs)

### FSMA 204 Required Events

| CTE | When | Key Data Elements |
|-----|------|-------------------|
| **Harvesting** | Crop is picked | Date, location, crop, qty, who |
| **Cooling** | Product is cooled | Date, time, temperature, location |
| **Initial Packing** | Product is packaged | Date, location, TLC assigned, qty, who |
| **Shipping** | Product leaves farm | Date, destination, carrier, TLC, qty |
| **Receiving** | Customer receives | Date, who received, condition |

### Implementation in Tiny Seed OS

```
MASTER_LOG entries for CTEs:

Activity = "Harvest"
  → Creates LOG_Harvest entry with Lot_ID (TLC)

Activity = "Pack"
  → Updates LOG_Harvest.Pack_Date, Pack_Location, Packed_By

Activity = "Ship" or "Deliver"
  → Creates LOG_Shipment entry linked to Lot_ID and Order_ID
```

---

## RECALL WORKFLOW

### Forward Trace: Lot → Customers

"We found a problem with lot TOM-F3-20260715. Who bought it?"

```sql
-- Pseudocode query
SELECT DISTINCT
  o.Customer_Name, o.Customer_Email, o.Customer_Phone,
  oi.Qty, o.Order_Date
FROM SALES_OrderItems oi
JOIN SALES_Orders o ON oi.Order_ID = o.Order_ID
WHERE oi.Lot_ID = 'TOM-F3-20260715'
```

### Backward Trace: Customer → Source

"Customer complained about tomatoes from order #1234. Where did they come from?"

```sql
-- Pseudocode query
SELECT
  h.Lot_ID, h.Harvest_Date, h.Field_ID, h.Batch_ID,
  p.Seed_Lot_ID, p.Sow_Date
FROM SALES_OrderItems oi
JOIN LOG_Harvest h ON oi.Lot_ID = h.Lot_ID
JOIN PLAN_Plantings p ON h.Batch_ID = p.Batch_ID
WHERE oi.Order_ID = 'ORD-1234'
AND oi.Product_ID LIKE '%TOM%'
```

---

## IMPLEMENTATION PHASES

### Phase 1: Foundation (Required First)

1. **Add Crop_ID to REF_CropProfiles**
   - Generate unique IDs for all existing crops
   - Update all references to use Crop_ID

2. **Create REF_Products sheet**
   - Import from PRODUCT_MASTER_LIST.md
   - Link each product to its Crop_ID
   - Set up Shopify/QB SKU mappings

3. **Create LOG_Harvest sheet**
   - Define TLC format
   - Add harvest logging to employee app

### Phase 2: Sales Integration

4. **Enhance SALES_OrderItems**
   - Add Product_ID and Lot_ID columns
   - Update order creation to capture lot info

5. **Update customer.html / wholesale.html**
   - Select from REF_Products instead of hardcoded
   - Capture lot assignment at packing

### Phase 3: Full Traceability

6. **Build recall/trace functions**
   - Forward trace (lot → customers)
   - Backward trace (customer → source)
   - Report generation

7. **Add QR codes to products**
   - Link to lot information
   - Customer-facing transparency

---

## SYNC WITH EXTERNAL PLATFORMS

### Shopify Product Sync

```javascript
// When syncing to Shopify:
const shopifyProduct = {
  title: product.Product_Name,
  product_type: product.Category,
  variants: [{
    sku: product.SKU_Shopify,
    price: product.Price_Retail,
    inventory_management: product.Track_Inventory ? "shopify" : null
  }],
  metafields: [{
    namespace: "traceability",
    key: "crop_id",
    value: product.Crop_ID,
    type: "single_line_text_field"
  }]
};
```

### QuickBooks Item Sync

```javascript
// When syncing to QuickBooks:
const qbItem = {
  Name: product.SKU_QB,
  Type: "Service", // or "Inventory" if tracking stock
  Description: `${product.Product_Name} - ${product.Unit}`,
  UnitPrice: product.Price_Retail,
  // Custom field for Crop_ID if QB supports it
};
```

---

## QUESTIONS FOR OWNER

1. **Lot Definition**: Is "same crop, same field, same day" the right lot size for you? Or would you prefer smaller (by bed) or larger (by week)?

2. **TLC Format**: Do you prefer readable dates (20260715) or Julian dates (26196)?

3. **Lot Assignment**: When should lots be assigned - at harvest, or at packing?

4. **Customer Transparency**: Do you want customers to be able to scan a QR code and see where their food came from?

5. **FSMA Compliance**: Are any of your wholesale buyers requiring FSMA 204 compliance?

6. **Crop IDs**: Should I auto-generate Crop_IDs for all existing crops in REF_CropProfiles?

---

## REFERENCES

**Regulatory:**
- [FDA FSMA 204 Final Rule](https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-requirements-additional-traceability-records-certain-foods)
- [Cornell GAPs Traceability Decision Tree](https://cals.cornell.edu/national-good-agricultural-practices-program/resources/educational-materials/decision-trees/traceability)
- [UMass Farm Food Safety & Traceability](https://ag.umass.edu/resources/food-safety/for-farmers/farm-food-safety-plans-traceability)

**Software Examples:**
- [Croptracker](https://www.croptracker.com/) - Farm management with traceability
- [Tend](https://www.tend.com/) - Seed to sale tracking
- [Farmbrite](https://www.farmbrite.com/) - Full farm planning
- [SourceTrace](https://sourcetrace.com/farm-traceability/) - GS1 compliant

**Technical:**
- [UVM Produce Tracking Research](https://blog.uvm.edu/cwcallah/produce-tracking-and-traceability/) - Small farm solutions
- [GS1 Standards](https://www.gs1.org/) - Global product identification

---

*TRACEABILITY_DESIGN.md - Sales_CRM Claude*
