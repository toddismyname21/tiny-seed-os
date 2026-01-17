# Data Import Guide
## Don's Knowledge Base → Tiny Seed OS Integration

**Created:** 2026-01-17
**Status:** READY FOR IMPORT

---

## Extracted Data Files

All files located in `/don_docs/extracted/`

| File | Records | Description | Target Claude |
|------|---------|-------------|---------------|
| `greenhouse_sowing_records.csv` | 627 | Complete 2024 greenhouse sowings | Field_Operations |
| `seed_orders.csv` | 187 | Seed inventory with suppliers | Inventory_Traceability |
| `variety_database.csv` | 210 | Timing profiles by variety | Field_Operations |
| `crop_timing_reference.csv` | 117 | Days in greenhouse by crop type | Field_Operations |
| `field_planting_records.csv` | 35 | Field transplant/direct seed records | Field_Operations |
| `field_actions.csv` | 6 | Field operations (cultivation, etc.) | Field_Operations |
| `supplier_summary.csv` | 5 | Supplier statistics | Inventory_Traceability |

---

## File 1: greenhouse_sowing_records.csv

### Schema
```
Sow Date           - Date seed was sown in greenhouse
Category           - Vegetables, Flowers, Herbs
Crop               - General crop name
Crop Type          - Specific crop type (e.g., "Lettuce: Salad Mix")
Variety            - Variety name
Days In Greenhouse - Days from sow to transplant
Transplant Date    - Actual or planned transplant date
# Of Flats         - Number of flats sown
Flat Type          - Container type (128 cell, paper pot, etc.)
Seeds Per Cell     - Seeding rate
Number Of Transplants - Total transplants from this sowing
```

### Key Insights for Field_Operations
- **58 succession sowings** of Salanova lettuce mix (24 days in GH)
- **15 succession sowings** of Space spinach (15 days in GH)
- Contains complete timing data for smart succession planning
- Flat type affects transplant count (128 cell vs paper pot)

### Import Mapping → PLANNING_2026
```
Sow Date           → Plan_GH_Sow
Crop Type          → Crop
Variety            → Variety
Transplant Date    → Plan_Transplant
Days In Greenhouse → (use for DTM validation)
```

---

## File 2: seed_orders.csv

### Schema
```
Order_Number    - Supplier order number
Seed_Company    - Johnny's, Fedco, High Mowing, Welter
Variety         - Variety name
Crop            - Crop description
Size            - Package size
Quantity        - Number ordered
Organic         - ☑ if organic, blank if not
At_Kretschmanns - Flag if used at Kretschmann location
```

### Key Insights for Inventory_Traceability
- **164 varieties** from Johnny's (primary supplier)
- **63 organic varieties** ordered
- Order numbers allow lookup for reordering

### Import Mapping → SEED_INVENTORY
```
Variety        → Variety_Name
Seed_Company   → Supplier
Organic        → Organic_Status
Size           → Package_Size
```

---

## File 3: variety_database.csv

### Schema
```
Crop Type      - Specific crop type
Variety        - Variety name
Avg_Days_GH    - Average days in greenhouse
Min_Days       - Minimum observed
Max_Days       - Maximum observed
Sowings        - Number of times sown (succession indicator)
Seeds_Per_Cell - Seeding rate
Flat_Type      - Container type
```

### Critical for Smart Succession Planting
This is the **GOLD DATA** for the intelligent succession algorithm.

**Top Succession Crops (sow weekly/bi-weekly):**
| Variety | Sowings | Avg Days GH |
|---------|---------|-------------|
| SALANOVA (TINY SEED MIX) | 58 | 24 |
| Space (Spinach) | 15 | 15 |
| Newham (Little Gem) | 14 | 28 |
| Muir (Summer Crisp) | 14 | 31 |
| Cherokee (Summer Crisp) | 14 | 28 |

---

## File 4: crop_timing_reference.csv

### Use Case
Quick lookup of average days in greenhouse by crop type.
Use for initial planning when specific variety not yet selected.

### Sample Data
```
Peppers (Hot):    110 days
Peppers (Bell):   85 days
Celery:           70 days
Basil:            45 days
Lettuce:          24-31 days
Spinach:          15 days
```

---

## Import Instructions

### For Field_Operations Claude

1. **Load variety_database.csv into VARIETIES lookup sheet**
   - This powers the smart DTM calculations
   - Use Avg_Days_GH for default greenhouse duration

2. **Reference greenhouse_sowing_records.csv for patterns**
   - When user adds crop, suggest timing based on historical data
   - "Last year you sowed Salanova every 7-10 days starting Jan 8"

3. **Use crop_timing_reference.csv for quick estimates**
   - When variety not specified, use crop type average

### For Inventory_Traceability Claude

1. **Import seed_orders.csv to seed inventory**
   - Pre-populate variety names
   - Set supplier defaults
   - Flag organic status

2. **Use supplier_summary.csv for reorder suggestions**
   - Johnny's is primary (164 varieties)
   - Cross-reference with what's in ground

---

## Data Quality Notes

1. **Dates are clean** - Excel date format, converted properly
2. **Some NaN values** in optional columns - handle gracefully
3. **Variety names may differ slightly** from current system - fuzzy match recommended
4. **Organic field** uses checkbox symbol (☑) - normalize to Y/N

---

## Validation Queries

After import, verify:
```sql
-- Should return 627
SELECT COUNT(*) FROM greenhouse_sowings;

-- Should return 187
SELECT COUNT(*) FROM seed_orders;

-- Should return ~58 for top succession crop
SELECT COUNT(*) FROM greenhouse_sowings
WHERE variety LIKE '%SALANOVA%';
```

---

*Data extracted from Don's 40 years of records*
*Ready for system integration*
