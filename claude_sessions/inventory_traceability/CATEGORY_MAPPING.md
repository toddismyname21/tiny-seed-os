# Inventory to Accounting Category Mapping
## Farm Asset Classification Guide

**Created:** 2026-01-16
**Purpose:** Map physical inventory to proper accounting categories

---

## Quick Reference Table

| Inventory Category | Accounting Category | Account Type | Depreciation |
|-------------------|---------------------|--------------|--------------|
| Equipment (>$2500) | Fixed Assets:Equipment | Asset | Yes - 5-7 years |
| Equipment (<$2500) | Expenses:Small Equipment | Expense | No |
| Tools | Expenses:Tools & Supplies | Expense | No |
| Seeds & Transplants | Inventory:Seeds | Asset (COGS) | No |
| Irrigation Supplies | Inventory:Supplies | Asset (COGS) | No |
| Pest Control | Inventory:Pest Control | Asset (COGS) | No |
| Soil Amendments | Inventory:Amendments | Asset (COGS) | No |
| Packaging Materials | Inventory:Packaging | Asset (COGS) | No |
| Safety Equipment | Expenses:Safety | Expense | No |
| Office Supplies | Expenses:Office | Expense | No |
| Vehicles | Fixed Assets:Vehicles | Asset | Yes - 5 years |
| Buildings/Structures | Fixed Assets:Buildings | Asset | Yes - 15-39 years |

---

## Detailed Category Mapping

### 1. EQUIPMENT

**Definition:** Machinery and large tools used in farm operations

| Item Type | Value Threshold | Accounting Treatment |
|-----------|-----------------|---------------------|
| Tractors | Any | Fixed Assets:Equipment (Depreciate 7 years) |
| Tillers | >$2500 | Fixed Assets:Equipment (Depreciate 5 years) |
| Tillers | <$2500 | Expenses:Small Equipment |
| Mowers | >$2500 | Fixed Assets:Equipment |
| Sprayers | >$2500 | Fixed Assets:Equipment |
| Walk-behind equipment | >$2500 | Fixed Assets:Equipment |
| Power tools | Any | Expenses:Tools & Supplies |

**Examples:**
- BCS Tiller ($4,000) → Fixed Assets:Equipment
- Backpack Sprayer ($150) → Expenses:Small Equipment
- Paperpot Transplanter ($800) → Expenses:Small Equipment

---

### 2. TOOLS

**Definition:** Hand tools and small equipment

| Item Type | Accounting Category |
|-----------|---------------------|
| Hand tools (shovels, hoes, rakes) | Expenses:Tools & Supplies |
| Harvest knives/scissors | Expenses:Tools & Supplies |
| Measuring tools | Expenses:Tools & Supplies |
| Seeding tools | Expenses:Tools & Supplies |

**Note:** All tools are typically expensed immediately (not depreciated)

---

### 3. SEEDS & TRANSPLANTS

**Definition:** Planting materials held for production

| Item Type | Accounting Category | COGS Category |
|-----------|---------------------|---------------|
| Seeds (packets, bulk) | Inventory:Seeds | Cost of Goods Sold:Seeds |
| Transplants (purchased) | Inventory:Transplants | COGS:Transplants |
| Seed potatoes, garlic | Inventory:Seeds | COGS:Seeds |
| Cover crop seed | Expenses:Cover Crops | (Not COGS) |

**Important:** Seeds used for production are COGS. Cover crop seed is an expense.

---

### 4. IRRIGATION

**Definition:** Water delivery equipment and supplies

| Item Type | Value | Accounting Category |
|-----------|-------|---------------------|
| Drip tape (rolls) | Any | Inventory:Supplies |
| Fittings, connectors | Any | Inventory:Supplies |
| Hoses | Any | Inventory:Supplies |
| Irrigation pump | >$2500 | Fixed Assets:Equipment |
| Irrigation pump | <$2500 | Expenses:Equipment |
| Timers, controllers | Any | Expenses:Equipment |

---

### 5. PEST & DISEASE CONTROL

**Definition:** Inputs for pest/disease management

| Item Type | Accounting Category |
|-----------|---------------------|
| Organic sprays (Bt, neem, etc.) | Inventory:Pest Control |
| Row cover | Inventory:Supplies |
| Insect netting | Inventory:Supplies |
| Traps, barriers | Expenses:Pest Control |
| Sprayers (handheld) | Expenses:Tools & Supplies |

---

### 6. SOIL AMENDMENTS

**Definition:** Materials added to soil for fertility

| Item Type | Accounting Category | COGS? |
|-----------|---------------------|-------|
| Compost (purchased) | Inventory:Amendments | Yes |
| Fertilizers (organic) | Inventory:Amendments | Yes |
| Lime, gypsum | Inventory:Amendments | Yes |
| Potting mix | Inventory:Amendments | Yes |
| Mulch | Expenses:Mulch | No (capital improvement) |

---

### 7. PACKAGING MATERIALS

**Definition:** Materials for harvest and sales

| Item Type | Accounting Category |
|-----------|---------------------|
| CSA boxes | Inventory:Packaging |
| Produce bags | Inventory:Packaging |
| Rubber bands, twist ties | Inventory:Packaging |
| Labels, stickers | Inventory:Packaging |
| Clamshells, containers | Inventory:Packaging |

---

### 8. SAFETY EQUIPMENT

**Definition:** Personal protective equipment and safety gear

| Item Type | Accounting Category |
|-----------|---------------------|
| Gloves | Expenses:Safety |
| Eye protection | Expenses:Safety |
| Hearing protection | Expenses:Safety |
| First aid supplies | Expenses:Safety |
| Fire extinguishers | Expenses:Safety |
| Sun protection | Expenses:Safety |

---

### 9. VEHICLES

**Definition:** Farm vehicles and trailers

| Item Type | Accounting Category | Depreciation |
|-----------|---------------------|--------------|
| Pickup trucks | Fixed Assets:Vehicles | 5 years |
| ATVs/UTVs | Fixed Assets:Vehicles | 5 years |
| Trailers | Fixed Assets:Vehicles | 5 years |
| Delivery van | Fixed Assets:Vehicles | 5 years |

**Note:** Vehicles used partially for personal use require mileage/use tracking.

---

### 10. INFRASTRUCTURE

**Definition:** Buildings and permanent structures

| Item Type | Accounting Category | Depreciation |
|-----------|---------------------|--------------|
| Greenhouses | Fixed Assets:Buildings | 15 years |
| High tunnels | Fixed Assets:Buildings | 10 years |
| Tool sheds | Fixed Assets:Buildings | 15 years |
| Cooler/cold storage | Fixed Assets:Equipment | 7 years |
| Fencing | Land Improvements | 15 years |
| Irrigation infrastructure | Land Improvements | 15 years |

---

## Depreciation Quick Guide

| Asset Type | IRS Life | Common Method |
|------------|----------|---------------|
| Farm equipment | 5-7 years | MACRS |
| Vehicles | 5 years | MACRS |
| Buildings | 15-39 years | Straight-line |
| Land improvements | 15 years | Straight-line |

**Section 179:** Can expense up to $1,160,000 (2024) of equipment in year purchased.

**Bonus Depreciation:** 60% (2024), decreasing annually.

---

## COGS vs Expense Decision Tree

```
Is it used directly in production?
├── YES → Is it consumed/sold with product?
│         ├── YES → COGS (Seeds, packaging, amendments)
│         └── NO → Is value >$2500 and life >1 year?
│                  ├── YES → Fixed Asset (Depreciate)
│                  └── NO → Expense
└── NO → Expense (Office, safety, etc.)
```

---

## Auto-Mapping Rules for App

When user selects category, auto-assign accounting category:

```javascript
const categoryMapping = {
  'Equipment': (value) => value > 2500 ? 'Fixed Assets:Equipment' : 'Expenses:Small Equipment',
  'Tools': 'Expenses:Tools & Supplies',
  'Seeds & Transplants': 'Inventory:Seeds',
  'Irrigation': (value) => value > 2500 ? 'Fixed Assets:Equipment' : 'Inventory:Supplies',
  'Pest Control': 'Inventory:Pest Control',
  'Soil Amendments': 'Inventory:Amendments',
  'Packaging': 'Inventory:Packaging',
  'Safety': 'Expenses:Safety',
  'Office': 'Expenses:Office',
  'Vehicles': 'Fixed Assets:Vehicles',
  'Infrastructure': 'Fixed Assets:Buildings'
};
```

---

## Export Format for Accountant

When exporting inventory for accounting:

| Field | Purpose |
|-------|---------|
| Item_Name | Description |
| Quantity | Count |
| Est_Value | Cost basis |
| Accounting_Category | GL Account |
| Purchase_Date | For depreciation |
| Condition | Impairment check |

---

*Category mapping complete. Use this to auto-classify inventory items.*
