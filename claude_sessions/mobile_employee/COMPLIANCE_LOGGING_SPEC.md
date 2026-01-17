# COMPLIANCE LOGGING MODULE
## Phone-Based Compliance Logging with Offline Mode

**Version:** 1.0
**Created:** 2026-01-17
**Author:** Mobile_Employee Claude
**Mission:** Enable field workers to log compliance data from their phones, even without internet

---

## EXECUTIVE SUMMARY

This module enables farm workers to capture compliance data required for:

1. **USDA NOP (Organic Certification)** - 7 CFR Part 205
2. **FSMA 204 (Food Traceability)** - Compliance date January 2026

All logging works **offline-first** using IndexedDB, syncing when connected.

---

## REGULATORY REQUIREMENTS

### USDA National Organic Program (NOP)

| Requirement | What We Must Log |
|-------------|------------------|
| Field Activity Logs | All cultivation, planting, harvest activities |
| Input Applications | Every spray, fertilizer, amendment with product name, rate, area |
| Seed/Planting Stock | Organic certification of all seeds/transplants |
| Harvest Records | Date, field, crop, quantity, who harvested |
| Buffer Zone Compliance | Distance from conventional fields |
| Equipment Cleaning | When shared equipment is cleaned |

**Retention:** 5 years, readily auditable

### FSMA 204 Food Traceability Rule

| Requirement | What We Must Log |
|-------------|------------------|
| Critical Tracking Events (CTEs) | Harvest, packing, shipping |
| Key Data Elements (KDEs) | Location, dates, quantities, lot codes |
| Traceability Lot Codes (TLCs) | Unique identifier per harvest lot |
| Farm Map | Fields with GPS coordinates |

**Response Time:** FDA can request records within 24 hours

---

## DATA MODEL

### COMPLIANCE_LOG Sheet Schema

```
Column              | Type      | Description                    | Required
--------------------|-----------|--------------------------------|----------
Log_ID              | String    | Unique ID (CL-timestamp-rand)  | Yes
Log_Type            | Enum      | See types below                | Yes
Timestamp           | DateTime  | When logged                    | Yes
Employee_ID         | String    | Who logged it                  | Yes
Employee_Name       | String    | Display name                   | Yes
Field_ID            | String    | Field location                 | Conditional
Batch_ID            | String    | Links to planting              | Conditional
Crop                | String    | Crop name                      | Conditional
Quantity            | Number    | Amount (lbs, units, etc.)      | Conditional
Unit                | String    | Unit of measure                | Conditional
Product_Name        | String    | Input product name             | Conditional
Product_Rate        | String    | Application rate               | Conditional
Product_Certified   | Boolean   | Organic approved?              | Conditional
Lot_Code            | String    | Traceability lot code          | Conditional
GPS_Lat             | Number    | Latitude                       | Yes
GPS_Lng             | Number    | Longitude                      | Yes
Notes               | String    | Additional details             | No
Photo_URL           | String    | Evidence photo                 | No
Synced              | Boolean   | Has been synced to server      | Yes
Created_Offline     | Boolean   | Was created while offline      | Yes
Synced_At           | DateTime  | When synced                    | No
```

### Log Types (Log_Type Enum)

```javascript
const COMPLIANCE_LOG_TYPES = {
  // USDA NOP - Organic
  'INPUT_APPLICATION': 'Input Application (spray, fertilizer, amendment)',
  'SEED_VERIFICATION': 'Seed/Transplant Organic Verification',
  'EQUIPMENT_CLEANING': 'Equipment Cleaning Log',
  'BUFFER_INSPECTION': 'Buffer Zone Inspection',
  'FIELD_ACTIVITY': 'General Field Activity',

  // FSMA 204 - Traceability
  'HARVEST_CTE': 'Harvest - Critical Tracking Event',
  'PACKING_CTE': 'Packing - Critical Tracking Event',
  'SHIPPING_CTE': 'Shipping - Critical Tracking Event',
  'RECEIVING_CTE': 'Receiving - Critical Tracking Event',

  // Combined
  'PEST_OBSERVATION': 'Pest/Disease Observation',
  'IRRIGATION_LOG': 'Irrigation Record',
  'SOIL_AMENDMENT': 'Soil Amendment Application'
};
```

---

## MOBILE UI DESIGN

### Compliance Tab in Employee App

```
┌─────────────────────────────────────────────┐
│  COMPLIANCE LOGGING                         │
│  ════════════════                           │
│                                             │
│  Quick Log Buttons (72px for gloves):       │
│                                             │
│  ┌─────────────┐  ┌─────────────┐          │
│  │    🧴       │  │    🌱       │          │
│  │   INPUT     │  │   SEED      │          │
│  │APPLICATION  │  │  VERIFY     │          │
│  └─────────────┘  └─────────────┘          │
│                                             │
│  ┌─────────────┐  ┌─────────────┐          │
│  │    🥬       │  │    📦       │          │
│  │  HARVEST    │  │   PACK      │          │
│  │    CTE      │  │    CTE      │          │
│  └─────────────┘  └─────────────┘          │
│                                             │
│  ┌─────────────┐  ┌─────────────┐          │
│  │    🚿       │  │    🧹       │          │
│  │ EQUIPMENT   │  │  BUFFER     │          │
│  │   CLEAN     │  │  CHECK      │          │
│  └─────────────┘  └─────────────┘          │
│                                             │
│  ─────────────────────────────────          │
│  📋 Today's Logs: 5                         │
│  ⏳ Pending Sync: 2                         │
│                                             │
└─────────────────────────────────────────────┘
```

### Input Application Form

```
┌─────────────────────────────────────────────┐
│  ← INPUT APPLICATION                        │
├─────────────────────────────────────────────┤
│                                             │
│  Field *                                    │
│  ┌─────────────────────────────────────┐   │
│  │ [Select Field]                   ▼  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Product Name *                             │
│  ┌─────────────────────────────────────┐   │
│  │ PyGanic EC 5.0                      │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Application Rate *                         │
│  ┌─────────────────────────────────────┐   │
│  │ 16 oz/acre                          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Area Treated                               │
│  ┌─────────────────────────────────────┐   │
│  │ 0.5 acres                           │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  OMRI/Organic Certified? *                  │
│  ┌────────────┐  ┌────────────┐            │
│  │   ✓ YES    │  │     NO     │            │
│  └────────────┘  └────────────┘            │
│                                             │
│  📷 Take Photo of Label                     │
│  [Photo preview area]                       │
│                                             │
│  Notes                                      │
│  ┌─────────────────────────────────────┐   │
│  │ Applied for aphid control           │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  📍 GPS: 40.1234, -76.5678 ✓               │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │         [ LOG INPUT ✓ ]             │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

### Harvest CTE Form (FSMA 204)

```
┌─────────────────────────────────────────────┐
│  ← HARVEST LOG (FSMA 204)                   │
├─────────────────────────────────────────────┤
│                                             │
│  ⚠️ TRACEABILITY REQUIRED                   │
│  This creates a Critical Tracking Event     │
│                                             │
│  Crop/Planting *                            │
│  ┌─────────────────────────────────────┐   │
│  │ [Select from active plantings]   ▼  │   │
│  └─────────────────────────────────────┘   │
│  Selected: Lettuce - Salanova, Field A     │
│                                             │
│  Quantity Harvested *                       │
│  ┌──────────────┐  ┌──────────────┐        │
│  │     45       │  │ [lbs]     ▼  │        │
│  └──────────────┘  └──────────────┘        │
│                                             │
│  Lot Code (auto-generated)                  │
│  ┌─────────────────────────────────────┐   │
│  │ TSF-2026-0117-LETA-001              │   │
│  └─────────────────────────────────────┘   │
│  Format: Farm-Year-Date-Crop-Sequence      │
│                                             │
│  Destination *                              │
│  ┌─────────────────────────────────────┐   │
│  │ [Pack House / Cold Storage / Sale]  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  📍 GPS: 40.1234, -76.5678 ✓               │
│  📸 Photo (optional but recommended)        │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │       [ LOG HARVEST ✓ ]             │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## OFFLINE ARCHITECTURE

### IndexedDB Store Addition

```javascript
// Add to OfflineDB.init() upgrade handler
const complianceStore = db.createObjectStore('complianceLogs', {
  keyPath: 'id',
  autoIncrement: true
});
complianceStore.createIndex('logType', 'logType', { unique: false });
complianceStore.createIndex('timestamp', 'timestamp', { unique: false });
complianceStore.createIndex('synced', 'synced', { unique: false });
complianceStore.createIndex('fieldId', 'fieldId', { unique: false });
```

### Offline Logging Flow

```
┌──────────────────────────────────────────────────────┐
│                   USER LOGS DATA                      │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│              CAPTURE GPS COORDINATES                  │
│         (cached if no signal, retry later)           │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│              SAVE TO INDEXEDDB                        │
│         complianceLogs store, synced: false          │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│              QUEUE FOR SYNC                           │
│         pendingOperations store                       │
└───────────────────────┬──────────────────────────────┘
                        │
                        ▼
              ┌─────────┴─────────┐
              │                   │
              ▼                   ▼
       ┌─────────────┐     ┌─────────────┐
       │   ONLINE    │     │   OFFLINE   │
       └──────┬──────┘     └──────┬──────┘
              │                   │
              ▼                   ▼
       ┌─────────────┐     ┌─────────────┐
       │ Sync to     │     │ Show badge: │
       │ Google      │     │ "2 pending" │
       │ Sheets      │     │ Store for   │
       └──────┬──────┘     │ later sync  │
              │            └─────────────┘
              ▼
       ┌─────────────┐
       │ Mark synced │
       │ in IndexedDB│
       └─────────────┘
```

### Sync Queue Entry

```javascript
// When logging compliance data offline
await OfflineDB.queueOperation('logComplianceEntry', {
  logType: 'INPUT_APPLICATION',
  fieldId: 'FIELD_A',
  productName: 'PyGanic EC 5.0',
  productRate: '16 oz/acre',
  areaTreated: 0.5,
  organicCertified: true,
  gpsLat: 40.1234,
  gpsLng: -76.5678,
  notes: 'Applied for aphid control',
  photoBase64: '...', // If photo taken
  timestamp: new Date().toISOString(),
  employeeId: AppState.employee.id,
  employeeName: AppState.employee.name
});
```

---

## APPS SCRIPT BACKEND

### New Endpoint: logComplianceEntry

```javascript
case 'logComplianceEntry':
  return logComplianceEntry(data);

function logComplianceEntry(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Ensure COMPLIANCE_LOG sheet exists
    let sheet = ss.getSheetByName('COMPLIANCE_LOG');
    if (!sheet) {
      sheet = createComplianceLogSheet(ss);
    }

    // Generate unique log ID
    const logId = 'CL-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

    // Generate lot code for harvest CTEs
    let lotCode = data.lotCode || '';
    if (data.logType === 'HARVEST_CTE' && !lotCode) {
      lotCode = generateLotCode(data);
    }

    // Build row
    const row = [
      logId,                          // Log_ID
      data.logType,                   // Log_Type
      new Date(data.timestamp),       // Timestamp
      data.employeeId,                // Employee_ID
      data.employeeName,              // Employee_Name
      data.fieldId || '',             // Field_ID
      data.batchId || '',             // Batch_ID
      data.crop || '',                // Crop
      data.quantity || '',            // Quantity
      data.unit || '',                // Unit
      data.productName || '',         // Product_Name
      data.productRate || '',         // Product_Rate
      data.organicCertified || false, // Product_Certified
      lotCode,                        // Lot_Code
      data.gpsLat || '',              // GPS_Lat
      data.gpsLng || '',              // GPS_Lng
      data.notes || '',               // Notes
      data.photoUrl || '',            // Photo_URL
      true,                           // Synced
      data.createdOffline || false,   // Created_Offline
      new Date()                      // Synced_At
    ];

    sheet.appendRow(row);

    // If this is a harvest CTE, also log to TRACEABILITY sheet
    if (data.logType === 'HARVEST_CTE') {
      logTraceabilityEvent(ss, data, logId, lotCode);
    }

    return jsonResponse({
      success: true,
      logId: logId,
      lotCode: lotCode,
      message: 'Compliance entry logged'
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

function generateLotCode(data) {
  // Format: TSF-YYYY-MMDD-CROP-SEQ
  const date = new Date(data.timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const cropCode = (data.crop || 'UNK').substring(0, 4).toUpperCase();
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');

  return `TSF-${year}-${month}${day}-${cropCode}-${seq}`;
}

function createComplianceLogSheet(ss) {
  const sheet = ss.insertSheet('COMPLIANCE_LOG');

  const headers = [
    'Log_ID', 'Log_Type', 'Timestamp', 'Employee_ID', 'Employee_Name',
    'Field_ID', 'Batch_ID', 'Crop', 'Quantity', 'Unit',
    'Product_Name', 'Product_Rate', 'Product_Certified', 'Lot_Code',
    'GPS_Lat', 'GPS_Lng', 'Notes', 'Photo_URL',
    'Synced', 'Created_Offline', 'Synced_At'
  ];

  sheet.appendRow(headers);

  // Format header
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#2e7d32'); // Green for compliance
  headerRange.setFontColor('#ffffff');

  sheet.setFrozenRows(1);

  return sheet;
}
```

### GET Endpoint: getComplianceLogs

```javascript
case 'getComplianceLogs':
  return getComplianceLogs(e.parameter);

function getComplianceLogs(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('COMPLIANCE_LOG');

    if (!sheet || sheet.getLastRow() < 2) {
      return jsonResponse({ success: true, logs: [], count: 0 });
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    let logs = data.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });

    // Apply filters
    if (params.logType) {
      logs = logs.filter(l => l.Log_Type === params.logType);
    }
    if (params.fieldId) {
      logs = logs.filter(l => l.Field_ID === params.fieldId);
    }
    if (params.startDate) {
      const start = new Date(params.startDate);
      logs = logs.filter(l => new Date(l.Timestamp) >= start);
    }
    if (params.endDate) {
      const end = new Date(params.endDate);
      logs = logs.filter(l => new Date(l.Timestamp) <= end);
    }

    // Sort by timestamp descending
    logs.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));

    return jsonResponse({
      success: true,
      logs: logs,
      count: logs.length
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}
```

---

## LOT CODE SYSTEM (FSMA 204)

### Format: TSF-YYYY-MMDD-CROP-SEQ

| Component | Description | Example |
|-----------|-------------|---------|
| TSF | Farm identifier | TSF |
| YYYY | Year | 2026 |
| MMDD | Month and day | 0117 |
| CROP | 4-letter crop code | LETT |
| SEQ | Daily sequence | 001 |

**Example:** `TSF-2026-0117-LETT-001`

### Traceability Chain

```
HARVEST (CTE)          PACKING (CTE)         SHIPPING (CTE)
TSF-2026-0117-LETT-001 → Same lot code    → Same lot code
      ↓                        ↓                    ↓
   Field A                Pack House          Delivery Route
   45 lbs                 40 lbs packed       Customer: ABC Grocery
   10:30 AM               2:15 PM             4:45 PM
   GPS: 40.12,-76.56      GPS: 40.13,-76.55   GPS: 40.20,-76.45
```

---

## ORGANIC INPUT PRODUCT DATABASE

### Pre-loaded OMRI Products

```javascript
const APPROVED_INPUTS = [
  // Insecticides
  { name: 'PyGanic EC 5.0', category: 'Insecticide', omri: true, rate: '16 oz/acre' },
  { name: 'Entrust SC', category: 'Insecticide', omri: true, rate: '6 oz/acre' },
  { name: 'Bt (Dipel)', category: 'Insecticide', omri: true, rate: '1-2 lbs/acre' },
  { name: 'Neem Oil', category: 'Insecticide/Fungicide', omri: true, rate: '2%' },
  { name: 'Surround WP', category: 'Insect Barrier', omri: true, rate: '25-50 lbs/acre' },

  // Fungicides
  { name: 'Copper Hydroxide', category: 'Fungicide', omri: true, rate: '2-4 lbs/acre' },
  { name: 'Regalia', category: 'Fungicide', omri: true, rate: '2-4 qt/acre' },
  { name: 'Serenade ASO', category: 'Fungicide', omri: true, rate: '2-6 qt/acre' },

  // Fertilizers
  { name: 'Fish Emulsion', category: 'Fertilizer', omri: true, rate: '2-4 gal/acre' },
  { name: 'Kelp Extract', category: 'Fertilizer', omri: true, rate: '1-2 qt/acre' },
  { name: 'Blood Meal', category: 'Fertilizer', omri: true, rate: '200-400 lbs/acre' },
  { name: 'Bone Meal', category: 'Fertilizer', omri: true, rate: '200-400 lbs/acre' },
  { name: 'Compost Tea', category: 'Fertilizer', omri: true, rate: '10-20 gal/acre' },

  // Amendments
  { name: 'Gypsum', category: 'Amendment', omri: true, rate: '500-1000 lbs/acre' },
  { name: 'Lime', category: 'Amendment', omri: true, rate: '1-2 tons/acre' },
  { name: 'Sulfur', category: 'Amendment', omri: true, rate: '100-300 lbs/acre' }
];
```

---

## REPORTING FOR AUDITS

### Organic Certification Audit Report

```
TINY SEED FARM - ORGANIC COMPLIANCE REPORT
Period: January 1 - December 31, 2026

INPUT APPLICATIONS
────────────────────────────────────────────────────
Date       | Field    | Product           | Rate      | OMRI
-----------|----------|-------------------|-----------|-----
01/15/2026 | Field A  | PyGanic EC 5.0    | 16 oz/ac  | ✓
01/22/2026 | Field B  | Bt (Dipel)        | 1.5 lb/ac | ✓
02/03/2026 | GH1      | Fish Emulsion     | 3 gal/ac  | ✓
...

HARVEST LOG
────────────────────────────────────────────────────
Date       | Field    | Crop      | Quantity | Lot Code
-----------|----------|-----------|----------|------------------
01/17/2026 | Field A  | Lettuce   | 45 lbs   | TSF-2026-0117-LETT-001
01/17/2026 | Field B  | Kale      | 30 lbs   | TSF-2026-0117-KALE-001
...

EQUIPMENT CLEANING LOG
────────────────────────────────────────────────────
Date       | Equipment         | Cleaned By | Notes
-----------|-------------------|------------|------------------
01/10/2026 | Tractor           | Maria      | Before organic field use
01/15/2026 | Sprayer           | Carlos     | After PyGanic application
...

BUFFER ZONE INSPECTIONS
────────────────────────────────────────────────────
Date       | Buffer     | Status | Inspector | Notes
-----------|------------|--------|-----------|------------------
01/05/2026 | North Edge | OK     | Maria     | 25ft maintained
02/01/2026 | North Edge | OK     | Carlos    | No drift observed
...
```

### FSMA 204 Traceability Report

```
TINY SEED FARM - FSMA 204 TRACEABILITY REPORT
Lot Code: TSF-2026-0117-LETT-001

CRITICAL TRACKING EVENTS
────────────────────────────────────────────────────
CTE        | Date/Time      | Location         | Qty    | GPS
-----------|----------------|------------------|--------|------------------
Harvest    | 01/17 10:30 AM | Field A          | 45 lbs | 40.1234,-76.5678
Packing    | 01/17 2:15 PM  | Pack House       | 40 lbs | 40.1299,-76.5555
Shipping   | 01/17 4:45 PM  | Delivery Vehicle | 40 lbs | 40.1299,-76.5555

CHAIN OF CUSTODY
────────────────────────────────────────────────────
From           | To              | Date/Time      | Verified By
---------------|-----------------|----------------|------------
Field A        | Pack House      | 01/17 11:00 AM | Maria
Pack House     | ABC Grocery     | 01/17 4:45 PM  | Carlos

PRODUCT DETAILS
────────────────────────────────────────────────────
Crop: Salanova Lettuce
Variety: Green Butter
Batch_ID: 2026-LETA-001
Field: Field A, Beds 1-4
Certifications: USDA Organic
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Core Logging (This Session)
- [ ] Add complianceLogs store to IndexedDB
- [ ] Create Compliance tab in employee.html
- [ ] Implement Input Application form
- [ ] Implement Harvest CTE form
- [ ] Add to offline sync queue

### Phase 2: Backend (Next)
- [ ] Add logComplianceEntry endpoint
- [ ] Add getComplianceLogs endpoint
- [ ] Create COMPLIANCE_LOG sheet
- [ ] Add lot code generation

### Phase 3: Additional Forms
- [ ] Equipment Cleaning form
- [ ] Buffer Zone Inspection form
- [ ] Seed Verification form
- [ ] Packing CTE form
- [ ] Shipping CTE form

### Phase 4: Reporting
- [ ] Organic audit report generator
- [ ] FSMA traceability report
- [ ] Export to PDF for inspectors

---

## SOURCES

1. [USDA NOP Handbook](https://www.ams.usda.gov/rules-regulations/organic/handbook)
2. [USDA Organic Documentation Forms](https://www.ams.usda.gov/sites/default/files/media/NOP-DocumentationFormsIntro.pdf)
3. [NC State Organic Recordkeeping](https://growingsmallfarms.ces.ncsu.edu/growingsmallfarms-orgrecords/)
4. [FDA FSMA 204 Final Rule](https://www.fda.gov/food/food-safety-modernization-act-fsma/fsma-final-rule-requirements-additional-traceability-records-certain-foods)
5. [FDA Food Traceability List](https://www.fda.gov/food/food-safety-modernization-act-fsma/food-traceability-list)
6. [FSMA 204 Compliance Guide](https://www.fooddocs.com/post/fsma-204)

---

*Mobile_Employee Claude - Compliance Logging Spec v1.0*
*2026-01-17*
