# GARAGE/MAINTENANCE GOOGLE SHEET - RESEARCH REPORT

**Research Agent:** Agent 1 - Existing System Analysis
**Date:** 2026-01-30
**Sheet URL:** https://docs.google.com/spreadsheets/d/1rexPw8Bk3Lh4qX9wLsr9UJOS8WZ3ZSGO7P-0vuuH4Pc/edit?gid=780845315#gid=780845315

---

## EXECUTIVE SUMMARY

The existing Garage/Maintenance Google Sheet is **minimally populated** with only 4 usage entries. However, the Tiny Seed OS codebase already contains a **sophisticated Fleet Management system** in the Apps Script backend that is largely UNDERUTILIZED. The gap is not in functionality but in data population and user interface accessibility.

---

## 1. EXISTING GOOGLE SHEET ANALYSIS

### Sheet Tabs Identified
Based on the CSV export (gid=780845315), the accessible sheet contains:

| Column | Purpose |
|--------|---------|
| Start | Start timestamp of usage session |
| ID | Equipment identifier (e.g., "Kubota-3130", "MF-596") |
| Operator | Person using equipment |
| Task | What the equipment was used for (EMPTY in all records) |
| Start Reading | Hour meter/odometer start (EMPTY) |
| End Reading | Hour meter/odometer end (EMPTY) |
| Total | Total hours/miles used (EMPTY) |
| Status | Session status (COMPLETED) |
| End Time | End timestamp |

### Current Data (Only 4 Records)
| Date | Equipment ID | Operator | Status |
|------|-------------|----------|--------|
| 12/28/2025 15:13:01 | Kubota-3130 | Todd | COMPLETED |
| 12/28/2025 15:13:02 | Kubota-3130 | Todd | COMPLETED |
| 12/28/2025 15:13:02 | Kubota-3130 | Todd | COMPLETED |
| 12/28/2025 15:27:10 | MF-596 | Todd | COMPLETED |

### Equipment Identified in Sheet
1. **Kubota-3130** - Compact tractor
2. **MF-596** - Massey Ferguson tractor

### Critical Gaps in Current Sheet
- **Task column empty** - No tracking of what equipment was used for
- **Hour meter readings empty** - Cannot track engine hours
- **No maintenance records** - Just usage logging
- **No fuel tracking**
- **No parts inventory**
- **No maintenance schedules**
- **No service history**
- **No manual links**

---

## 2. APPS SCRIPT BACKEND - ALREADY BUILT (UNDERUTILIZED)

The Tiny Seed OS codebase contains a **complete Fleet Management system** that is not being fully used. Here's what already exists:

### FLEET_SHEETS Structure (Already in MERGED TOTAL.js)
```javascript
const FLEET_SHEETS = {
  ASSETS: 'FLEET_Assets',
  USAGE_LOG: 'FLEET_UsageLog',
  FUEL_LOG: 'FLEET_FuelLog',
  MAINTENANCE: 'FLEET_Maintenance'
};
```

### FLEET_Assets Sheet Headers (Existing)
| Column | Description |
|--------|-------------|
| Asset_ID | Unique identifier |
| Asset_Name | Human-readable name |
| Asset_Type | Tractor, Vehicle, Equipment |
| Make | Manufacturer |
| Model | Model number |
| Year | Year of manufacture |
| Serial_Number | For warranty/identification |
| Fuel_Type | Diesel, Gas, Electric |
| Current_Hours | Current hour meter |
| Current_Miles | Current odometer |
| Service_Interval_Hours | Hours between services |
| Last_Service_Hours | Hours at last service |
| Hours_Until_Service | Calculated field |
| Purchase_Date | Acquisition date |
| Purchase_Price | For depreciation |
| Depreciation_Per_Hour | Cost tracking |
| Status | Active, Inactive, Repair |
| Location | Where stored |
| Notes | Additional info |
| Photo_URL | Equipment photo |

### FLEET_UsageLog Sheet Headers (Existing)
| Column | Description |
|--------|-------------|
| Usage_ID | Unique log entry |
| Asset_ID | Links to asset |
| Asset_Name | For readability |
| Date | When used |
| Task_ID | Links to field task |
| Task_Type | What work done |
| Field | Which field |
| Bed_IDs | Which beds |
| Operator_ID | Who operated |
| Operator_Name | For readability |
| Start_Hours | Hour meter start |
| End_Hours | Hour meter end |
| Hours_Used | Calculated |
| Fuel_Gallons | Fuel consumed |
| Fuel_Cost | Fuel expense |
| Total_Cost | Full cost tracking |
| Notes | Additional info |

### FLEET_FuelLog Sheet Headers (Existing)
| Column | Description |
|--------|-------------|
| Fuel_ID | Unique entry |
| Date | Fill date |
| Asset_ID | Which equipment |
| Asset_Name | For readability |
| Gallons | Amount added |
| Price_Per_Gallon | Current price |
| Total_Cost | Total expense |
| Vendor | Where purchased |
| Receipt_Photo | Documentation |
| Filled_By | Who added fuel |
| Notes | Additional info |

### FLEET_Maintenance Sheet Headers (Existing)
| Column | Description |
|--------|-------------|
| Maint_ID | Unique entry |
| Date | Service date |
| Asset_ID | Which equipment |
| Asset_Name | For readability |
| Maint_Type | Oil change, repair, etc. |
| Description | What was done |
| Parts_Used | Parts consumed |
| Parts_Cost | Parts expense |
| Labor_Hours | Time spent |
| Labor_Cost | Labor expense |
| Total_Cost | Full cost |
| Performed_By | Who did work |
| Next_Service_Hours | When next due |
| Photo_URL | Documentation |
| Notes | Additional info |

### API Endpoints Already Available
The following endpoints exist in the backend:

**GET Operations:**
- `getFleetAssets` - List all equipment
- `getFleetAssetById` - Single asset details
- `getFleetUsageLog` - Usage history
- `getFleetFuelLog` - Fuel records
- `getFleetMaintenanceLog` - Service history
- `getFleetCostReport` - Cost analysis
- `getMaintenanceDue` - Upcoming service alerts
- `getFleetDashboard` - Overview metrics

**POST Operations:**
- `createFleetAsset` - Add new equipment
- `updateFleetAsset` - Modify equipment
- `logFleetUsage` - Record usage session
- `logFleetFuel` - Record fuel purchase
- `logFleetMaintenance` - Record service
- `linkUsageToTask` - Connect to field operations

---

## 3. EXISTING EQUIPMENT LIST (owner_uploads/equipment list.xlsx)

A separate equipment wishlist was found with farm equipment planning:

| Equipment | Category | Status |
|-----------|----------|--------|
| Ortomec Multi-Seed | SEEDING | Wishlist |
| FORIGO G-25 Rock Burier | BED PREP | Wishlist |
| Rain-Flo 1670 water wheel transplanter | TRANSPLANTING | Wishlist |
| Harvester 2000 | HARVEST | Option 1 |
| Terrateck Baby Leaf Harvester | HARVEST | Option 2 |
| 1 1/4 Bushel Orange Basket (50x) | POST-HARVEST | Owned |
| Stainless Steel Tank (2x) | POST-HARVEST | Owned |
| Green harvest tote (50x) | POST-HARVEST | Owned |
| SS Table with Shelf (4x) | POST-HARVEST | Owned |
| SS Rolling Shelves (4x) | POST-HARVEST | Owned |
| Walk-in cooler | POST-HARVEST | Wishlist |

---

## 4. USER PERMISSIONS (Already Configured)

The system has user-level access control for garage features:

```javascript
// From USERS sheet configuration
- Tractor_Mode: Boolean - Can operate tractors
- Garage_Mode: Boolean - Can access garage/maintenance features
- Inventory_Mode: Boolean - Can manage parts inventory
- Costing_Mode: Boolean - Can view cost data
```

Employee certifications tracked:
- `Cert_Tractor` - Tractor certification
- `Cert_Forklift` - Forklift certification
- `Cert_Drivers` - Driver's license
- `Cert_CDL` - Commercial driver's license

---

## 5. GAP ANALYSIS - What's Missing for a Thorough System

### A. Equipment Categories Not Yet Tracked
The user wants to track but no dedicated system exists for:

| Category | Current Status | Recommendation |
|----------|---------------|----------------|
| Tractor fleet | Partially in sheet | Use FLEET_Assets |
| Delivery vehicles | Not tracked | Add to FLEET_Assets |
| Farm truck | Not tracked | Add to FLEET_Assets |
| Lawnmowers | Not tracked | Add to FLEET_Assets |
| Cultivating equipment | Not tracked | Add to FLEET_Assets |
| Parts inventory | No sheet exists | Need NEW sheet |
| Operating manuals | Not tracked | Need manual links |
| Maintenance manuals | Not tracked | Need manual links |

### B. Missing Functionality
1. **Parts Inventory System** - No sheet exists for:
   - Spare parts tracking
   - Reorder levels
   - Part numbers
   - Suppliers
   - Compatibility (which parts fit which equipment)

2. **Manual Management** - No system for:
   - Operating manual PDFs/links
   - Maintenance manual PDFs/links
   - Quick reference guides
   - Troubleshooting guides

3. **Scheduled Maintenance Reminders** - Backend exists but not connected:
   - Oil change schedules
   - Filter replacement
   - Grease points
   - Annual inspections
   - Warranty tracking

4. **Cost Tracking Integration** - Partially built:
   - Per-task cost attribution works
   - Budget tracking incomplete
   - ROI analysis missing

### C. User Interface Gap
- No dedicated Garage/Equipment HTML page exists
- Mobile interface for logging usage in field is missing
- Dashboard for fleet overview not built

---

## 6. RECOMMENDED NEW SHEETS/FEATURES

### Proposed: GARAGE_PartsInventory
```
| Column | Description |
|--------|-------------|
| Part_ID | Unique identifier |
| Part_Number | Manufacturer part # |
| Description | Part name |
| Category | Oil, Filter, Belt, Blade, etc. |
| Fits_Equipment | Which assets use this |
| Quantity_On_Hand | Current stock |
| Reorder_Level | When to reorder |
| Reorder_Qty | How many to order |
| Unit_Cost | Price per unit |
| Supplier | Where to buy |
| Supplier_Part_Number | Their SKU |
| Location | Where stored |
| Last_Ordered | Date |
| Notes | Additional info |
```

### Proposed: GARAGE_Manuals
```
| Column | Description |
|--------|-------------|
| Manual_ID | Unique identifier |
| Asset_ID | Links to equipment |
| Manual_Type | Operating, Maintenance, Parts |
| Title | Manual name |
| File_URL | Google Drive link |
| File_Type | PDF, Video, Web link |
| Language | English, Spanish |
| Version | Edition/year |
| Notes | Key info |
```

### Proposed: GARAGE_ServiceSchedule
```
| Column | Description |
|--------|-------------|
| Schedule_ID | Unique identifier |
| Asset_ID | Links to equipment |
| Service_Type | Oil, Filter, Grease, etc. |
| Interval_Type | Hours, Miles, Months |
| Interval_Value | Number |
| Last_Service_Date | When done |
| Last_Service_Reading | Hour/mile at service |
| Next_Due_Date | Calculated |
| Next_Due_Reading | Calculated |
| Reminder_Days_Before | Alert timing |
| Notes | Special instructions |
```

---

## 7. IMMEDIATE RECOMMENDATIONS

### Priority 1: Data Population
1. Add all current equipment to FLEET_Assets sheet:
   - Kubota-3130 (already referenced)
   - MF-596 (already referenced)
   - All delivery vehicles
   - Farm trucks
   - Lawnmowers
   - Cultivating equipment

2. Record hour meter readings for all equipment
3. Enter service history from memory/records

### Priority 2: Create Missing Sheets
1. GARAGE_PartsInventory
2. GARAGE_Manuals
3. GARAGE_ServiceSchedule

### Priority 3: Build User Interface
1. Create garage.html dashboard
2. Mobile-friendly usage logging
3. QR codes on equipment for quick entry

### Priority 4: Connect Existing APIs
The backend is built - need frontend to:
- Display equipment list
- Log usage easily
- Show maintenance due alerts
- Track fuel consumption

---

## 8. FILES REFERENCED IN THIS ANALYSIS

| File Path | Content |
|-----------|---------|
| `/apps_script/MERGED TOTAL.js` | Fleet Management API (lines 29105-29270, 37044-37425) |
| `/apps_script/EmployeeOnboarding.js` | User permissions for garage mode |
| `/owner_uploads/equipment list.xlsx` | Equipment wishlist/planning |
| Google Sheet gid=780845315 | Current usage log (4 entries) |

---

## 9. CONCLUSION

The user is correct that the current system "isn't thorough enough." The irony is that a comprehensive fleet management system ALREADY EXISTS in the codebase but is largely unused. The Google Sheet only has a basic usage log with mostly empty fields.

**The solution is NOT to rebuild the system but to:**
1. Populate the existing sheets with actual equipment data
2. Create the 3 missing sheets (Parts, Manuals, Service Schedule)
3. Build a user-friendly HTML interface
4. Train users on the mobile logging features

The backend infrastructure is professional-grade. The data entry and user interface are the bottlenecks.

---

*Report generated by Research Agent 1*
*Tiny Seed OS - Claude Sessions*
