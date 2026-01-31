# GARAGE / MAINTENANCE / FLEET - Existing Code Analysis
## Research Agent 2: Tiny Seed OS Codebase Review

**Generated:** 2026-01-30
**Source Files Analyzed:**
- `/apps_script/MERGED TOTAL.js` (50,000+ lines)
- `/web_app/api-config.js`
- `/web_app/employee-management.html`
- `/employee.html` (main employee mobile app)

---

## EXECUTIVE SUMMARY

The Tiny Seed OS has a **comprehensive but fragmented** garage/fleet/equipment management system:

1. **Fleet Management System** - Fully implemented backend with partial mobile UI
2. **Farm Inventory System** - Equipment tracking with AI-powered intelligence
3. **Equipment Food Safety Pipeline** - FSMA compliance integration
4. **User Permissions** - Garage_Mode and Tractor_Mode toggles exist

**Critical Finding:** The mobile app (`employee.html`) has a working "Tractor Mode" with fleet tracking, but it requires the `Tractor_Mode` permission to be enabled for users.

---

## 1. GOOGLE SHEETS USED

### Fleet Management Sheets
| Sheet Name | Purpose | Headers |
|------------|---------|---------|
| `FLEET_Assets` | Master equipment list | Asset_ID, Asset_Name, Asset_Type, Make, Model, Year, Serial_Number, Fuel_Type, Current_Hours, Current_Miles, Service_Interval_Hours, Last_Service_Hours, Hours_Until_Service, Purchase_Date, Purchase_Price, Depreciation_Per_Hour, Status, Location, Notes, Photo_URL |
| `FLEET_UsageLog` | Equipment usage tracking | Usage_ID, Asset_ID, Asset_Name, Date, Task_ID, Task_Type, Field, Bed_IDs, Operator_ID, Operator_Name, Start_Hours, End_Hours, Hours_Used, Fuel_Gallons, Fuel_Cost, Total_Cost, Notes |
| `FLEET_FuelLog` | Fuel purchase tracking | Fuel_ID, Date, Asset_ID, Asset_Name, Gallons, Price_Per_Gallon, Total_Cost, Vendor, Receipt_Photo, Filled_By, Notes |
| `FLEET_Maintenance` | Maintenance records | Maint_ID, Date, Asset_ID, Asset_Name, Maint_Type, Description, Parts_Used, Parts_Cost, Labor_Hours, Labor_Cost, Total_Cost, Performed_By, Next_Service_Hours, Photo_URL, Notes |

### Farm Inventory Sheets
| Sheet Name | Purpose | Headers |
|------------|---------|---------|
| `FARM_INVENTORY` | General equipment/tools | Item_ID, Photo_URL, Item_Name, Category, Sub_Category, Quantity, Condition, Location, Est_Value, Serial_Model, Purchase_Date, Notes, Captured_Date, Captured_By, GPS_Lat, GPS_Lon, Last_Updated, Active, Hours_Used |
| `FARM_MAINTENANCE_LOG` | General maintenance log | Log_ID, Item_ID, Date, Maintenance_Type, Description, Cost, Performed_By, Hours_At_Service, Next_Due, Notes |
| `FARM_RECOMMENDATIONS` | AI-generated recommendations | Recommendation_ID, Generated_Date, Priority, Category, Item_ID, Title, Details, Action_Required, Due_Date, Est_Cost, Status, Acknowledged_Date, Completed_Date |
| `FUEL_LOG` | General fuel log | Log_ID, Date, Asset_ID, Asset_Name, Gallons, Cost_Per_Gallon, Total_Cost, Odometer, Employee_ID, Notes, Created_At |

### Other Related Sheets
| Sheet Name | Purpose |
|------------|---------|
| `IRRIGATION_MAINTENANCE` | Irrigation-specific maintenance |
| `USERS` | Contains Tractor_Mode, Garage_Mode, Inventory_Mode columns |

---

## 2. API ENDPOINTS (Apps Script)

### GET Endpoints (Read Operations)
| Action | Function | Description |
|--------|----------|-------------|
| `getFleetAssets` | `getFleetAssets(params)` | Get all fleet assets with optional filters |
| `getFleetAssetById` | `getFleetAssetById(params)` | Get single asset with usage history |
| `getFleetUsageLog` | `getFleetUsageLog(params)` | Get usage log entries |
| `getFleetFuelLog` | `getFleetFuelLog(params)` | Get fuel log entries |
| `getFleetMaintenanceLog` | `getFleetMaintenanceLog(params)` | Get maintenance log entries |
| `getFleetCostReport` | `getFleetCostReport(params)` | Get cost rollup report |
| `getFleetDashboard` | `getFleetDashboard(params)` | Get fleet dashboard summary |
| `getMaintenanceDue` | `getMaintenanceDue(params)` | Get assets approaching service |
| `getEquipmentHealth` | `getEquipmentHealth()` | Get equipment health dashboard |
| `getEquipmentIntelligence` | `getEquipmentIntelligence(params)` | Advanced Weibull/FMEA analysis |
| `getMaintenanceSchedule` | `getMaintenanceSchedule(params)` | Get maintenance schedule |
| `getFarmInventory` | `getFarmInventory(params)` | Get farm inventory items |
| `getFarmInventoryItem` | `getFarmInventoryItem(params)` | Get single inventory item |
| `getFarmInventoryStats` | `getFarmInventoryStats()` | Get inventory statistics |
| `getIrrigationMaintenance` | `getIrrigationMaintenance(params)` | Get irrigation maintenance |
| `getEquipmentFoodSafetyStatus` | `getEquipmentFoodSafetyStatus()` | Food safety compliance status |
| `getFoodSafetyEquipmentStatus` | `getFoodSafetyEquipmentStatus()` | Critical equipment health |

### POST Endpoints (Write Operations)
| Action | Function | Description |
|--------|----------|-------------|
| `createFleetAsset` | `createFleetAsset(data)` | Create new fleet asset |
| `updateFleetAsset` | `updateFleetAsset(data)` | Update fleet asset |
| `logFleetUsage` | `logFleetUsage(data)` | Log equipment usage |
| `logFleetFuel` | `logFleetFuel(data)` | Log fuel purchase |
| `logFleetMaintenance` | `logFleetMaintenance(data)` | Log maintenance |
| `addFarmInventoryItem` | `addFarmInventoryItem(data)` | Add inventory item |
| `logMaintenance` | `logFarmMaintenance(data)` | Log general maintenance |
| `logIrrigationMaintenance` | `logIrrigationMaintenance(params)` | Log irrigation maintenance |
| `runEquipmentFoodSafetyPipeline` | `runEquipmentFoodSafetyPipeline(params)` | Run food safety analysis |

---

## 3. MOBILE APP IMPLEMENTATION (employee.html)

### Tractor Mode Features (Lines 7383-15738)
The employee mobile app has a comprehensive "Tractor Mode" with:

**UI Components:**
- Fleet grid showing all tractors with status cards
- Start/Stop tractor session dialogs
- Fuel logging tab
- Hours tracking
- Maintenance logging form

**JavaScript Functions:**
```javascript
// Fleet State Management
const FleetState = {
    tractors: [],
    utilities: [],
    runningAssets: {},
    needsToBuy: []
};

// Core Functions
loadFleetData()           // Fetch fleet assets from API
renderFleetGrid()         // Display tractor cards
startTractor(assetId)     // Start usage session
stopTractor(assetId)      // End usage session
confirmStartTractor()     // Submit start with operator/task
confirmStopTractor()      // Submit stop with end hours
submitGarageMaintenance() // Log maintenance record
populateFleetSelects()    // Fill dropdowns with assets
```

**Conditional Navigation:**
The tractor mode appears when user has `Tractor_Mode: true` permission:
```javascript
if (mode === 'tractor') {
    document.getElementById('tractorNav').style.display = 'block';
    loadFleetData();
}
```

### Equipment Cleaning Form (Lines 9617-9694)
USDA NOP compliance form with:
- Equipment selection dropdown
- Cleaning reason
- Sanitization method
- Photo upload
- Operator name

---

## 4. WEB API CLIENT (api-config.js)

The `SalesAPI` class includes fleet management methods:

```javascript
// FLEET MANAGEMENT (Lines 284-328)
async getFleetAssets(filters = {})
async getFleetAssetById(assetId)
async createFleetAsset(assetData)
async updateFleetAsset(assetId, updates)
async logFleetUsage(usageData)
async getFleetUsageLog(filters = {})
async logFleetFuel(fuelData)
async logFleetMaintenance(maintData)
async getMaintenanceDue(threshold = 25)
async getFleetDashboard()
async getFleetCostReport(filters = {})
```

---

## 5. USER PERMISSION SYSTEM

### Mode Columns in USERS Sheet
| Column | Purpose |
|--------|---------|
| `Tractor_Mode` | Access to fleet tracking, tractor start/stop |
| `Garage_Mode` | Access to garage/maintenance features |
| `Inventory_Mode` | Access to farm inventory |
| `Costing_Mode` | Access to cost tracking |

### Permission Check (employee.html Line 13832)
```javascript
if (mode === 'tractor') return AppState.permissions.tractor;
```

### Setting Permissions (MERGED TOTAL.js Lines 16834-16836)
```javascript
setCol('Tractor_Mode', data.tractorMode === 'true' || data.tractorMode === true);
setCol('Garage_Mode', data.garageMode === 'true' || data.garageMode === true);
setCol('Inventory_Mode', data.inventoryMode === 'true' || data.inventoryMode === true);
```

---

## 6. ADVANCED FEATURES

### Equipment Intelligence Engine (Lines 27418-28928)
State-of-the-art predictive analytics:

1. **Weibull Reliability Analysis**
   - Calculates failure probability based on usage hours
   - Uses industry-standard parameters by category

2. **FMEA (Failure Mode Effects Analysis)**
   - Risk Priority Number (RPN) calculation
   - Severity x Occurrence x Detection scoring

3. **Weather-Adjusted Health**
   - Fetches historical weather from Open-Meteo
   - Adjusts health scores for freeze-thaw cycles, humidity

4. **Claude Vision Photo Analysis**
   - Analyzes equipment photos for condition
   - Returns: condition score, rust level, visible issues

### Equipment -> Food Safety Pipeline (Lines 73841-74300)
Automatic food safety alerts for critical equipment:

**Critical Equipment Categories:**
- Refrigeration (walk-in cooler, freezer)
- Wash Station (sanitizer, rinse)
- Water System (irrigation, pumps)
- Harvest Equipment (knives, totes)
- Packing Equipment (scales, labels)

**Alert Thresholds:**
- Weibull failure probability > 15%
- FMEA RPN > 125
- Health score < 60%
- Condition = Poor or Needs Repair

---

## 7. WHAT'S CONNECTED VS DISCONNECTED

### Fully Connected
| Feature | Backend | Mobile UI | Admin UI |
|---------|---------|-----------|----------|
| Fleet Assets CRUD | Yes | Yes (Tractor Mode) | No |
| Usage Logging | Yes | Yes | No |
| Fuel Logging | Yes | Yes | No |
| Equipment Inventory | Yes | No | No |
| Maintenance Schedule | Yes | No | No |

### Backend Only (No UI)
- Equipment Intelligence (getEquipmentIntelligence)
- Food Safety Pipeline (runEquipmentFoodSafetyPipeline)
- Weibull/FMEA Analysis
- Photo Condition Analysis
- Predictive Recommendations
- Farm Inventory System

### Admin Features Needed
- Fleet dashboard (viewFleetDashboard exists in menu)
- Equipment health overview
- Maintenance scheduling
- Fuel cost reports

---

## 8. INITIALIZATION FUNCTION

To create all fleet sheets, run:
```javascript
initializeSalesAndFleetModule()
// Located at Line 29126
// Creates: FLEET_Assets, FLEET_UsageLog, FLEET_FuelLog, FLEET_Maintenance
```

---

## 9. INTEGRATION WITH OTHER SYSTEMS

### Morning Brief Integration (Lines 78273-78511)
Equipment health is part of the unified morning brief:
```javascript
// Section 1: Food Safety Equipment Status
// Section 2: Critical Equipment Alerts
// Section 3: Maintenance Due (7-day lookahead)
// Section 4: Equipment Health Summary
```

### Financial Dashboard Integration
Equipment value tracked in:
- Balance Sheet (equipmentValue, vehiclesValue)
- Asset Schedule
- Equipment Wishlist feature

---

## 10. GAPS AND OPPORTUNITIES

### Missing UI Components
1. **Desktop Equipment Dashboard** - Backend exists but no admin interface
2. **Maintenance Calendar View** - Data exists but no calendar UI
3. **Equipment Photo Gallery** - Photo URLs stored but not displayed
4. **Cost Analysis Charts** - Cost data collected but not visualized

### Mobile App Improvements Needed
1. **Garage Mode** - Permission exists but no distinct mode in mobile app
2. **Inventory Mode** - Permission exists but no distinct mode
3. **Maintenance Reminders** - Backend generates but mobile doesn't show
4. **Equipment Condition Updates** - Can't update condition from mobile

### Backend Improvements Needed
1. **Scheduled Maintenance Triggers** - No time-based reminders yet
2. **Low Fuel Alerts** - Could track tank levels
3. **Hours-Based Service Notifications** - Logic exists but no push

---

## 11. RELATED CONSTANTS AND ENUMS

### Inventory Categories
```javascript
const FARM_INVENTORY_CATEGORIES = [
  'Equipment', 'Tools', 'Seeds & Transplants', 'Irrigation', 'Pest Control',
  'Soil Amendments', 'Packaging', 'Safety', 'Office', 'Infrastructure', 'Vehicles', 'Other'
];
```

### Inventory Locations
```javascript
const FARM_INVENTORY_LOCATIONS = [
  'Tool Shed', 'Greenhouse 1', 'Greenhouse 2', 'Greenhouse 3', 'Equipment Barn',
  'Field Storage', 'Packhouse', 'Office', 'Walk-in Cooler', 'Barn',
  'Personal Vehicle', 'Other'
];
```

### Equipment Lifespans (Years)
```javascript
const EQUIPMENT_LIFESPANS = {
  'Equipment': 10,
  'Tools': 7,
  'Irrigation': 8,
  'Vehicles': 12,
  'Infrastructure': 20,
  'Safety': 5,
  'Packaging': 2,
  'Other': 5
};
```

---

## 12. FILES MODIFIED FOR GARAGE FEATURES

| File | Lines | Features |
|------|-------|----------|
| MERGED TOTAL.js | 27042-28928 | Farm Inventory, Equipment Intelligence |
| MERGED TOTAL.js | 29115-29287 | Fleet Sheet Initialization |
| MERGED TOTAL.js | 37048-37539 | Fleet Management API |
| MERGED TOTAL.js | 73841-74300 | Equipment Food Safety Pipeline |
| MERGED TOTAL.js | 78273-78511 | Morning Brief Integration |
| employee.html | 7383-7543 | Fleet Tab CSS |
| employee.html | 10055-10093 | Fleet Tab HTML |
| employee.html | 15016-15738 | Fleet JavaScript Functions |
| employee.html | 10226-10358 | Garage Panel (More tab) |
| api-config.js | 284-328 | Fleet API Client Methods |
| employee-management.html | 880, 1156-1157, 1219-1232 | Garage Mode Toggle |

---

## 13. RECOMMENDATIONS FOR NEW DEVELOPMENT

1. **Do NOT rebuild fleet management** - It's already comprehensive
2. **Enable existing permissions** - Tractor_Mode and Garage_Mode are ready
3. **Build admin dashboard** - Use existing API endpoints
4. **Connect mobile to equipment intelligence** - Show AI insights
5. **Add maintenance reminder notifications** - Backend data exists
6. **Create equipment inventory scanning** - Add to mobile app

---

*End of Research Report*
