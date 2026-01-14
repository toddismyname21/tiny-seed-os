/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TINY SEED OS - COMPLETE SYSTEM WITH WORKING API
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * THIS VERSION HAS ALL ENDPOINTS PROPERLY CONNECTED
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open: https://docs.google.com/spreadsheets/d/128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc/edit
 * 2. Extensions → Apps Script
 * 3. SELECT ALL existing code (Ctrl+A)
 * 4. DELETE it
 * 5. PASTE this entire file
 * 6. Save (Ctrl+S)
 * 7. Deploy → Manage deployments → Edit → "New version" → Deploy
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═════════════════════════════════════════════════════════════════════════

const SPREADSHEET_ID = '128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc';

const FARM_CONFIG = {
  LAT: 40.7956,
  LONG: -80.1384,
  TIMEZONE: "America/New_York",
  SPRING_FROST: "05/20",
  FALL_FROST: "10/10"
};

// ═══════════════════════════════════════════════════════════════════════════
// WEB API LAYER - ALL ENDPOINTS PROPERLY WIRED
// ═══════════════════════════════════════════════════════════════════════════

function doGet(e) {
  // Safety check for parameters
  if (!e || !e.parameter || !e.parameter.action) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: "Tiny Seed OS API is running!",
        usage: "Add ?action=testConnection to test the API",
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const action = e.parameter.action;
  
  try {
    switch(action) {
      // ============ CRITICAL ENDPOINTS FOR HTML TOOLS ============
      case 'testConnection':
        return testConnection();
      
  case 'updateTaskCompletion':
    return jsonResponse(updateTaskCompletion(e.parameter));
      case 'getPlanningData':
        return getPlanningData();
      case 'getDashboardStats':
        return getDashboardStats();
      case 'getGreenhouseSeedings':
        return getGreenhouseSeedings();
      case 'getSeedInventory':
        return getSeedInventory();
      case 'getFieldTasks':
        return getFieldTasks();
      case 'getDTMLearningData':
        return getDTMLearningData();
  case 'getGreenhouseSowingTasks':
    return jsonResponse(getGreenhouseSowingTasks(e.parameter));

      
      // ============ LEGACY ENDPOINTS ============
      case 'getPlanning':
        return getPlanning();
      case 'getPlanningById':
        return getPlanningById(e.parameter.id);
                case 'updatePlanting':
          return updatePlanting(e.parameter);
      case 'deletePlanting':
          return deletePlantingById(e.parameter.id);
      case 'getCrops':
        return getCrops();
        case 'getCropProfiles':
    return jsonResponse(getCropProfiles());
      case 'getCropByName':
        return getCropByName(e.parameter.crop, e.parameter.variety);
      case 'getBeds':
        return getBeds();
      case 'getBedsByField':
        return getBedsByField(e.parameter.field);
      case 'getTasks':
        return getTasks(e.parameter.date);
      case 'getTasksByDate':
        return getTasksByDateRange(e.parameter.start, e.parameter.end);
      case 'getHarvests':
        return getHarvests();
      case 'getHarvestsByDate':
        return getHarvestsByDateRange(e.parameter.start, e.parameter.end);
      case 'getWeather':
        return getWeatherData();
      case 'getCSAMembers':
        return getCSAMembers();
      case 'getFinancials':
        return getFinancials();
          case 'getCropProfile':
    return getCropProfile(params.cropName);
    case 'getCropProfile':
    return jsonResponse(getCropProfile(e.parameter.cropName));
  case 'updateCropProfile':
    return jsonResponse(updateCropProfile(e.parameter));
  case 'createCropProfile':
    return jsonResponse(createCropProfile(e.parameter));

      // ============ SOIL-TESTS.HTML ENDPOINTS ============
      case 'getComplianceRecords':
        return jsonResponse(getComplianceRecords(e.parameter));
      case 'getIPMSchedules':
        return jsonResponse(getIPMSchedules(e.parameter));
      case 'getFertigationData':
        return jsonResponse(getFertigationData(e.parameter));
      case 'getFoliarApplications':
        return jsonResponse(getFoliarApplications(e.parameter));
      case 'getSoilAmendments':
        return jsonResponse(getSoilAmendments(e.parameter));
      case 'getSoilTests':
        return jsonResponse(getSoilTests(e.parameter));

      // ============ INVENTORY SYSTEM GET ENDPOINTS ============
      case 'getInventoryProducts':
        return jsonResponse(getInventoryProducts(e.parameter));
      case 'getProductById':
        return jsonResponse(getProductById(e.parameter));
      case 'getLowStockProducts':
        return jsonResponse(getLowStockProducts());
      case 'getTransactionHistory':
        return jsonResponse(getTransactionHistory(e.parameter));
      case 'getProductsForDropdown':
        return jsonResponse(getProductsForDropdown(e.parameter));

      // ============ PLANTING WIZARD ENDPOINTS ============
      case 'savePlanting':
        return jsonResponse(savePlantingFromWeb(e.parameter));
      case 'getWizardDataWeb':
        return jsonResponse(getWizardDataWeb());

      // ============ TRAY INVENTORY ENDPOINTS ============
      case 'getTrayInventory':
        return jsonResponse(getTrayInventory());
      case 'saveTrayInventory':
        return jsonResponse(saveTrayInventory(e.parameter));

      // ============ SALES MODULE - CUSTOMER FACING ============
      case 'authenticateCustomer':
        return jsonResponse(authenticateCustomer(e.parameter));
      case 'verifyCustomerToken':
        return jsonResponse(verifyCustomerToken(e.parameter));
      case 'getWholesaleProducts':
        return jsonResponse(getWholesaleProducts(e.parameter));
      case 'getCSAProducts':
        return jsonResponse(getCSAProducts(e.parameter));
      case 'getCSABoxContents':
        return jsonResponse(getCSABoxContents(e.parameter));
      case 'getCustomerOrders':
        return jsonResponse(getCustomerOrders(e.parameter));
      case 'getCustomerProfile':
        return jsonResponse(getCustomerProfile(e.parameter));

      // ============ SALES MODULE - MANAGER FACING ============
      case 'getSalesOrders':
        return jsonResponse(getSalesOrders(e.parameter));
      case 'getOrderById':
        return jsonResponse(getOrderById(e.parameter));
      case 'getSalesCustomers':
        return jsonResponse(getSalesCustomers(e.parameter));
      case 'getCustomerById':
        return jsonResponse(getCustomerById(e.parameter));
      case 'getSalesCSAMembers':
        return jsonResponse(getSalesCSAMembers(e.parameter));
      case 'getSalesDashboard':
        return jsonResponse(getSalesDashboard(e.parameter));
      case 'getPickPackList':
        return jsonResponse(getPickPackList(e.parameter));
      case 'getSMSCampaigns':
        return jsonResponse(getSMSCampaigns(e.parameter));
      case 'getSalesReports':
        return jsonResponse(getSalesReports(e.parameter));

      // ============ DELIVERY & DRIVER ============
      case 'getDeliveryRoutes':
        return jsonResponse(getDeliveryRoutes(e.parameter));
      case 'getDriverRoute':
        return jsonResponse(getDriverRoute(e.parameter));
      case 'authenticateDriver':
        return jsonResponse(authenticateDriver(e.parameter));
      case 'getDeliveryDrivers':
        return jsonResponse(getDeliveryDrivers(e.parameter));

      // ============ FLEET MANAGEMENT ============
      case 'getFleetAssets':
        return jsonResponse(getFleetAssets(e.parameter));
      case 'getFleetAssetById':
        return jsonResponse(getFleetAssetById(e.parameter));
      case 'getFleetUsageLog':
        return jsonResponse(getFleetUsageLog(e.parameter));
      case 'getFleetFuelLog':
        return jsonResponse(getFleetFuelLog(e.parameter));
      case 'getFleetMaintenanceLog':
        return jsonResponse(getFleetMaintenanceLog(e.parameter));
      case 'getFleetCostReport':
        return jsonResponse(getFleetCostReport(e.parameter));
      case 'getMaintenanceDue':
        return jsonResponse(getMaintenanceDue(e.parameter));
      case 'getFleetDashboard':
        return jsonResponse(getFleetDashboard(e.parameter));

      // ============ LABEL GENERATION ============
      case 'getMarketSignItems':
        return jsonResponse(getMarketSignItems(e.parameter));
      case 'getOrdersForLabels':
        return jsonResponse(getOrdersForLabels(e.parameter));
      case 'getSalesCycles':
        return jsonResponse(getSalesCycles(e.parameter));
      case 'closeSalesCycle':
        return jsonResponse(closeSalesCycle(e.parameter));
      case 'initializeMarketItems':
        return jsonResponse(initializeMarketItemsSheet());

      default:
        return jsonResponse({error: 'Unknown action: ' + action}, 400);
    }
  } catch (error) {
    return jsonResponse({
      error: error.toString(),
      stack: error.stack,
      action: action
    }, 500);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    switch(action) {
      // ============ CRITICAL POST ENDPOINTS ============
      case 'saveSuccessionPlan':
        return saveSuccessionPlan(data.plan);
      case 'completeTask':
        return completeTask(data.taskId, data.completedBy, data.notes);
      
      // ============ LEGACY POST ENDPOINTS ============
      case 'addPlanting':
        return addPlanting(data.planting);
      case 'updatePlanting':
        return updatePlanting(data.planting);
      case 'deletePlanting':
        return deletePlanting(data.id);
      case 'bulkAddPlantings':
        return bulkAddPlantings(data.plantings);
      case 'addTask':
        return addTask(data.task);
      case 'recordHarvest':
        return recordHarvest(data.harvest);

      // ============ SOIL-TESTS.HTML POST ENDPOINTS ============
      case 'saveComplianceRecord':
        return jsonResponse(saveComplianceRecord(data));
      case 'saveIPMSchedule':
        return jsonResponse(saveIPMSchedule(data));
      case 'updateIPMSprayStatus':
        return jsonResponse(updateIPMSprayStatus(data));
      case 'saveFertigationData':
        return jsonResponse(saveFertigationData(data));
      case 'saveFoliarApplication':
        return jsonResponse(saveFoliarApplication(data));
      case 'saveSoilAmendment':
        return jsonResponse(saveSoilAmendment(data));
      case 'saveSoilTest':
        return jsonResponse(saveSoilTest(data));
      case 'bulkSyncSoilData':
        return jsonResponse(bulkSyncSoilData(data));

      // ============ INVENTORY SYSTEM POST ENDPOINTS ============
      case 'saveProduct':
        return jsonResponse(saveProduct(data));
      case 'recordTransaction':
        return jsonResponse(recordTransaction(data));
      case 'adjustInventory':
        return jsonResponse(adjustInventory(data));
      case 'uploadProductPhoto':
        return jsonResponse(uploadProductPhoto(data));
      case 'deductInventoryOnApplication':
        return jsonResponse(deductInventoryOnApplication(data));

      // ============ SALES MODULE - CUSTOMER ACTIONS ============
      case 'sendCustomerMagicLink':
        return jsonResponse(sendCustomerMagicLink(data));
      case 'submitWholesaleOrder':
        return jsonResponse(submitWholesaleOrder(data));
      case 'submitCSAOrder':
        return jsonResponse(submitCSAOrder(data));
      case 'customizeCSABox':
        return jsonResponse(customizeCSABox(data));
      case 'updateCustomerProfile':
        return jsonResponse(updateCustomerProfile(data));

      // ============ SALES MODULE - MANAGER ACTIONS ============
      case 'createSalesOrder':
        return jsonResponse(createSalesOrder(data));
      case 'updateSalesOrder':
        return jsonResponse(updateSalesOrder(data));
      case 'cancelSalesOrder':
        return jsonResponse(cancelSalesOrder(data));
      case 'createSalesCustomer':
        return jsonResponse(createSalesCustomer(data));
      case 'updateSalesCustomer':
        return jsonResponse(updateSalesCustomer(data));
      case 'createCSAMember':
        return jsonResponse(createCSAMember(data));
      case 'updateCSAMember':
        return jsonResponse(updateCSAMember(data));
      case 'completePickPackItem':
        return jsonResponse(completePickPackItem(data));
      case 'createSMSCampaign':
        return jsonResponse(createSMSCampaign(data));
      case 'sendSMSCampaign':
        return jsonResponse(sendSMSCampaign(data));

      // ============ DELIVERY & DRIVER ACTIONS ============
      case 'createDeliveryRoute':
        return jsonResponse(createDeliveryRoute(data));
      case 'assignDeliveryRoute':
        return jsonResponse(assignDeliveryRoute(data));
      case 'recordDeliveryProof':
        return jsonResponse(recordDeliveryProof(data));
      case 'reportDeliveryIssue':
        return jsonResponse(reportDeliveryIssue(data));
      case 'updateDeliveryETA':
        return jsonResponse(updateDeliveryETA(data));

      // ============ FLEET MANAGEMENT ACTIONS ============
      case 'createFleetAsset':
        return jsonResponse(createFleetAsset(data));
      case 'updateFleetAsset':
        return jsonResponse(updateFleetAsset(data));
      case 'logFleetUsage':
        return jsonResponse(logFleetUsage(data));
      case 'logFleetFuel':
        return jsonResponse(logFleetFuel(data));
      case 'logFleetMaintenance':
        return jsonResponse(logFleetMaintenance(data));
      case 'linkUsageToTask':
        return jsonResponse(linkUsageToTask(data));

      default:
        return jsonResponse({error: 'Unknown action: ' + action}, 400);
    }
  } catch (error) {
    return jsonResponse({
      error: error.toString(),
      stack: error.stack
    }, 500);
  }
}

function testConnection() {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Apps Script is working!',
    timestamp: new Date().toISOString(),
    sheetId: SpreadsheetApp.getActiveSpreadsheet().getId()
  })).setMimeType(ContentService.MimeType.JSON);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════════════════
// CRITICAL ENDPOINT IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════

function getPlanningData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('PLANNING_2026');
    
    if (!sheet) {
      return jsonResponse({
        success: false,
        error: 'PLANNING_2026 sheet not found'
      });
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return jsonResponse({
        success: true,
        data: [],
        message: 'No planning data found'
      });
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const plantings = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        let value = row[index];
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        }
        obj[header] = value;
      });
      return obj;
    }).filter(p => p.Crop);
    
    return jsonResponse({
      success: true,
      data: plantings,
      count: plantings.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

// ============================================
// PLANTING WIZARD WEB FUNCTIONS
// ============================================

/**
 * Save a planting from the web app (succession.html)
 * Accepts URL parameters and creates a row in PLANNING_2026
 */
function savePlantingFromWeb(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('PLANNING_2026');

    if (!sheet) {
      return { success: false, error: 'PLANNING_2026 sheet not found' };
    }

    // Get headers to build row in correct order
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Map URL parameters to header columns
    const paramMapping = {
      'STATUS': params.STATUS || 'Planned',
      'Batch_ID': params.Batch_ID || generateBatchId(params.Crop),
      'Crop': params.Crop || '',
      'Variety': params.Variety || 'Standard',
      'Planting_Method': params.Planting_Method || 'Transplant',
      'Target_Bed_ID': params.Target_Bed_ID || 'Unassigned',
      'Feet_Used': params.Feet_Used || 0,
      'Plants_Needed': params.Plants_Needed || 0,
      'Trays_Needed': params.Trays_Needed || 0,
      'Tray_Cell_Count': params.Tray_Cell_Count || 72,
      'Paperpot_Spacing': params.Paperpot_Spacing || '',
      'Plan_GH_Sow': params.Plan_GH_Sow || '',
      'Actual_GH_Sow': '',
      'Plan_Field_Sow': params.Plan_Field_Sow || '',
      'Actual_Field_Sow': '',
      'Plan_Transplant': params.Plan_Transplant || '',
      'Actual_Transplant': '',
      'First_Harvest': params.First_Harvest || '',
      'Last_Harvest': '',
      'Notes': params.Notes || ''
    };

    // Build row array matching header order
    const row = headers.map(header => {
      // Check for exact match first
      if (paramMapping.hasOwnProperty(header)) {
        return paramMapping[header];
      }
      // Check for case-insensitive match
      const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [key, value] of Object.entries(paramMapping)) {
        if (key.toLowerCase().replace(/[^a-z0-9]/g, '') === lowerHeader) {
          return value;
        }
      }
      return '';
    });

    // Append the row
    sheet.appendRow(row);

    // Try to deduct seeds from inventory
    let seedDeduction = null;
    try {
      seedDeduction = deductSeedsForPlanting({
        crop: paramMapping['Crop'],
        variety: paramMapping['Variety'],
        plantsNeeded: Number(paramMapping['Plants_Needed']) || 0,
        batchId: paramMapping['Batch_ID'],
        method: paramMapping['Planting_Method']
      });
    } catch (seedError) {
      // Non-fatal - planting still saved even if seed deduction fails
      Logger.log('Seed deduction error: ' + seedError.toString());
    }

    return {
      success: true,
      message: 'Planting saved successfully',
      batchId: paramMapping['Batch_ID'],
      crop: paramMapping['Crop'],
      variety: paramMapping['Variety'],
      seedDeduction: seedDeduction
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Deduct seeds from inventory for a planting
 * Looks for matching seed in INVENTORY_PRODUCTS, calculates need, deducts stock
 */
function deductSeedsForPlanting(plantingData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const invSheet = ss.getSheetByName('INVENTORY_PRODUCTS');
  const transSheet = ss.getSheetByName('INVENTORY_TRANSACTIONS');

  if (!invSheet) {
    return { deducted: false, reason: 'No inventory sheet' };
  }

  // Find matching seed product
  const invData = invSheet.getDataRange().getValues();
  const invHeaders = invData[0];

  let seedRow = -1;
  let seedData = null;

  for (let i = 1; i < invData.length; i++) {
    const row = {};
    invHeaders.forEach((h, j) => row[h] = invData[i][j]);

    // Only check SEED category
    if (String(row['Category']).toUpperCase() !== 'SEED') continue;

    const productName = String(row['Product_Name'] || '').toLowerCase();
    const cropName = String(plantingData.crop || '').toLowerCase();
    const variety = String(plantingData.variety || '').toLowerCase();

    // Match by crop name and optionally variety
    if (productName.includes(cropName)) {
      // Prefer exact variety match
      if (variety && productName.includes(variety)) {
        seedRow = i + 1;
        seedData = row;
        break;
      }
      // Fall back to first crop match
      if (!seedData) {
        seedRow = i + 1;
        seedData = row;
      }
    }
  }

  if (!seedData) {
    return { deducted: false, reason: 'No matching seed found in inventory' };
  }

  // Calculate seeds needed
  // Overseed by 10% for transplants, 20% for direct seed
  const overseedFactor = plantingData.method === 'Direct Seed' ? 1.2 : 1.1;
  const germRate = Number(seedData['Germination_Rate']) || 85;
  const seedsPerPack = Number(seedData['Seeds_Per_Pack']) || 1;

  const plantsNeeded = Number(plantingData.plantsNeeded) || 0;
  const seedsNeeded = Math.ceil((plantsNeeded * overseedFactor) / (germRate / 100));
  const packsNeeded = Math.ceil(seedsNeeded / seedsPerPack);

  // Check current stock
  const currentQty = Number(seedData['Current_Qty']) || 0;
  if (currentQty <= 0) {
    return {
      deducted: false,
      reason: 'Out of stock',
      seedProduct: seedData['Product_Name'],
      needed: packsNeeded
    };
  }

  // Deduct from inventory
  const qtyToDeduct = Math.min(packsNeeded, currentQty);
  const newQty = currentQty - qtyToDeduct;

  // Update inventory sheet
  const qtyColIndex = invHeaders.indexOf('Current_Qty') + 1;
  const updatedColIndex = invHeaders.indexOf('UpdatedAt') + 1;
  if (qtyColIndex > 0) {
    invSheet.getRange(seedRow, qtyColIndex).setValue(newQty);
  }
  if (updatedColIndex > 0) {
    invSheet.getRange(seedRow, updatedColIndex).setValue(new Date().toISOString());
  }

  // Record transaction
  if (transSheet) {
    const transHeaders = transSheet.getRange(1, 1, 1, transSheet.getLastColumn()).getValues()[0];
    const transRow = transHeaders.map(h => {
      switch(h) {
        case 'Transaction_ID': return 'TXN-' + Date.now();
        case 'Date': return new Date().toISOString().split('T')[0];
        case 'Product_ID': return seedData['Product_ID'] || '';
        case 'Product_Name': return seedData['Product_Name'] || '';
        case 'Transaction_Type': return 'APPLICATION';
        case 'Qty': return -qtyToDeduct;
        case 'Unit': return seedData['Unit'] || 'pack';
        case 'Batch_ID': return plantingData.batchId || '';
        case 'Field': return '';
        case 'Applied_By': return 'Planting Wizard';
        case 'Notes': return `Seeding for ${plantingData.crop} - ${plantsNeeded} plants`;
        case 'CreatedAt': return new Date().toISOString();
        default: return '';
      }
    });
    transSheet.appendRow(transRow);
  }

  return {
    deducted: true,
    seedProduct: seedData['Product_Name'],
    seedsNeeded: seedsNeeded,
    packsDeducted: qtyToDeduct,
    remainingStock: newQty,
    lowStock: newQty < (Number(seedData['Reorder_Point']) || 5)
  };
}

/**
 * Generate a batch ID for a planting
 */
function generateBatchId(cropName) {
  const year = new Date().getFullYear().toString().slice(-2);
  const cropCode = (cropName || 'XXX').substring(0, 3).toUpperCase();
  const uniqueId = Math.floor(Math.random() * 9000) + 1000;
  return `${year}-${cropCode}-${uniqueId}`;
}

/**
 * Get wizard data for web app (replaces getWizardData for modal)
 * Returns beds, crop profiles, and bookings for the planting wizard
 */
function getWizardDataWeb() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const bedSheet = ss.getSheetByName('REF_Beds');
    const profileSheet = ss.getSheetByName('REF_CropProfiles');
    const planSheet = ss.getSheetByName('PLANNING_2026');

    // Get beds
    let beds = [];
    if (bedSheet && bedSheet.getLastRow() > 1) {
      const bData = bedSheet.getDataRange().getValues();
      const bHeaders = bData[0];
      beds = bData.slice(1).map(row => {
        const obj = {};
        bHeaders.forEach((h, i) => obj[h] = row[i]);
        return obj;
      }).filter(b => b['Bed ID']);
    }

    // Get bookings (existing plantings)
    let bookings = [];
    if (planSheet && planSheet.getLastRow() > 1) {
      const pData = planSheet.getDataRange().getValues();
      const pHeaders = pData[0];

      for (let i = 1; i < pData.length; i++) {
        const row = {};
        pHeaders.forEach((h, j) => row[h] = pData[i][j]);

        const bedId = String(row['Target_Bed_ID'] || row['Bed_ID'] || '');
        const feet = Number(row['Feet_Used'] || row['Feet'] || 0);
        const method = String(row['Planting_Method'] || '').toLowerCase();

        let start = method.includes('direct')
          ? row['Plan_Field_Sow'] || row['Actual_Field_Sow']
          : row['Plan_Transplant'] || row['Actual_Transplant'] || row['Plan_GH_Sow'];
        let end = row['Last_Harvest'] || row['First_Harvest'];

        if (start instanceof Date && (!end || !(end instanceof Date))) {
          end = new Date(start);
          end.setDate(start.getDate() + 60);
        }

        if (bedId && start instanceof Date && end instanceof Date) {
          bookings.push({
            bedId: bedId,
            feet: feet,
            start: start.getTime(),
            end: end.getTime(),
            crop: row['Crop'] || '',
            status: row['STATUS'] || ''
          });
        }
      }
    }

    // Get crop profiles
    let cropProfiles = [];
    let vegCrops = [];
    let floralCrops = [];
    let cropMap = {};

    if (profileSheet && profileSheet.getLastRow() > 1) {
      const cpData = profileSheet.getDataRange().getValues();
      const cpHeaders = cpData[0];

      for (let i = 1; i < cpData.length; i++) {
        const row = {};
        cpHeaders.forEach((h, j) => row[h] = cpData[i][j]);

        const cropName = String(row['Crop_Name'] || '').trim();
        const category = String(row['Category'] || row['Primary_Category'] || '');
        const variety = String(row['Variety'] || row['Variety_Default'] || '').trim();

        if (!cropName) continue;

        // Determine method
        let method = 'Transplant';
        const rawMethod = String(row['Calc_Method'] || row['Direct_or_Transplant'] || '');
        if (rawMethod.toLowerCase().includes('direct')) method = 'Direct Seed';
        else if (rawMethod.toLowerCase().includes('paper')) method = 'Paperpot';

        // Build crop map for quick lookup
        if (!cropMap[cropName]) {
          cropMap[cropName] = {
            varieties: [],
            method: method,
            rows: row['Rows_Per_Bed'] || 1,
            spacing: row['In_Row_Spacing_In'] || 12,
            tray: row['Tray_Cell_Count'] || 72,
            nursery: method === 'Direct Seed' ? 0 : (row['Nursery_Days'] || 28),
            dtm: row['DTM_Average'] || 50
          };

          if (category.toLowerCase().includes('floral') || category.toLowerCase().includes('flower')) {
            floralCrops.push(cropName);
          } else {
            vegCrops.push(cropName);
          }
        }

        if (variety && !cropMap[cropName].varieties.includes(variety)) {
          cropMap[cropName].varieties.push(variety);
        }

        cropProfiles.push({
          cropName: cropName,
          variety: variety,
          category: category,
          method: method,
          rows: row['Rows_Per_Bed'] || 1,
          spacing: row['In_Row_Spacing_In'] || 12,
          traySize: row['Tray_Cell_Count'] || 72,
          nurseryDays: method === 'Direct Seed' ? 0 : (row['Nursery_Days'] || 28),
          dtm: row['DTM_Average'] || 50
        });
      }
    }

    return {
      success: true,
      beds: beds,
      bookings: bookings,
      cropProfiles: cropProfiles,
      veg: [...new Set(vegCrops)].sort(),
      floral: [...new Set(floralCrops)].sort(),
      map: cropMap
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ============ TRAY INVENTORY FUNCTIONS ============

/**
 * Get tray inventory data
 * Returns total stock and reorder points for each tray size
 */
function getTrayInventory() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('TRAY_INVENTORY');

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet('TRAY_INVENTORY');
      sheet.appendRow(['Size', 'Total', 'ReorderPoint', 'LastUpdated']);
      // Add default data
      const defaults = [
        ['50', 20, 5],
        ['72', 50, 10],
        ['98', 30, 10],
        ['128', 40, 10],
        ['200', 20, 5],
        ['264', 15, 5]
      ];
      defaults.forEach(row => {
        sheet.appendRow([...row, new Date()]);
      });
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const result = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      result.push({
        size: String(row[0]),
        total: Number(row[1]) || 0,
        reorderPoint: Number(row[2]) || 10,
        lastUpdated: row[3]
      });
    }

    return {
      success: true,
      data: result
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Save tray inventory data
 * Updates or adds a tray size entry
 */
function saveTrayInventory(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('TRAY_INVENTORY');

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet('TRAY_INVENTORY');
      sheet.appendRow(['Size', 'Total', 'ReorderPoint', 'LastUpdated']);
    }

    const size = String(params.size);
    const total = Number(params.total) || 0;
    const reorderPoint = Number(params.reorderPoint) || 10;

    const data = sheet.getDataRange().getValues();
    let found = false;

    // Find and update existing row
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === size) {
        sheet.getRange(i + 1, 2).setValue(total);
        sheet.getRange(i + 1, 3).setValue(reorderPoint);
        sheet.getRange(i + 1, 4).setValue(new Date());
        found = true;
        break;
      }
    }

    // Add new row if not found
    if (!found) {
      sheet.appendRow([size, total, reorderPoint, new Date()]);
    }

    return {
      success: true,
      message: `Tray inventory updated for ${size}-cell`
    };

  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

function getDashboardStats() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const planSheet = ss.getSheetByName('PLANNING_2026');
    
    if (!planSheet) {
      return jsonResponse({
        success: false,
        error: 'PLANNING_2026 sheet not found'
      });
    }
    
    const data = planSheet.getDataRange().getValues();
    
    let activePlantings = 0;
    let fieldsUsed = new Set();
    let totalRevenue = 0;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[0];
      const bedId = row[5];
      const revenue = Number(row[15]) || 0;
      
      if (status === 'PLANTED' || status === 'HARVESTING') {
        activePlantings++;
      }
      
      if (bedId) {
        const field = String(bedId).split('-')[0];
        if (field) fieldsUsed.add(field);
      }
      
      totalRevenue += revenue;
    }
    
    let tasksDue = 0;
    const taskSheet = ss.getSheetByName('DAILY_TASKS_GENERATED');
    if (taskSheet) {
      const taskData = taskSheet.getDataRange().getValues();
      const today = new Date();
      
      for (let i = 1; i < taskData.length; i++) {
        const dueDate = taskData[i][0];
        if (dueDate instanceof Date && dueDate <= today) {
          tasksDue++;
        }
      }
    }
    
    return jsonResponse({
      success: true,
      stats: {
        activePlantings: activePlantings,
        fieldsInUse: fieldsUsed.size,
        tasksDue: tasksDue,
        projectedRevenue: Math.round(totalRevenue)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

function getGreenhouseSeedings() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const planSheet = ss.getSheetByName('PLANNING_2026');
    const profileSheet = ss.getSheetByName('REF_CropProfiles');
    
    if (!planSheet) {
      return jsonResponse({
        success: false,
        error: 'PLANNING_2026 sheet not found'
      });
    }
    
    const data = planSheet.getDataRange().getValues();
    
    let cropProfiles = {};
    if (profileSheet) {
      const profData = profileSheet.getDataRange().getValues();
      for (let i = 1; i < profData.length; i++) {
        const crop = profData[i][0];
        if (crop) {
          cropProfiles[crop] = {
            nurseryDays: Number(profData[i][22]) || 28,
            traySize: Number(profData[i][15]) || 128
          };
        }
      }
    }
    
    const seedings = [];
    const today = new Date();
    const futureLimit = new Date();
    futureLimit.setDate(today.getDate() + 60);
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const method = String(row[4]).toLowerCase();
      
      if (method.includes('transplant') || method.includes('paper')) {
        const crop = row[2];
        const variety = row[3];
        const batchId = row[1];
        const ghSowDate = row[9];
        const transplantDate = row[12];
        const traysNeeded = Number(row[8]) || 1;
        
        if (ghSowDate instanceof Date && ghSowDate <= futureLimit) {
          const profile = cropProfiles[crop] || { nurseryDays: 28, traySize: 128 };
          
          seedings.push({
            crop: crop,
            variety: variety,
            seedDate: ghSowDate.toISOString().split('T')[0],
            transplantDate: transplantDate instanceof Date ? 
              transplantDate.toISOString().split('T')[0] : '',
            traysNeeded: traysNeeded,
            cellsPerTray: profile.traySize,
            batchNumber: batchId || `BATCH-${i}`,
            nurseryDays: profile.nurseryDays
          });
        }
      }
    }
    
    return jsonResponse({
      success: true,
      data: seedings,
      count: seedings.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

function getSeedInventory() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let invSheet = ss.getSheetByName('SEED_INVENTORY');
    
    if (!invSheet) {
      return jsonResponse({
        success: true,
        data: [],
        message: 'No seed inventory sheet found - using demo data'
      });
    }
    
    const data = invSheet.getDataRange().getValues();
    if (data.length < 2) {
      return jsonResponse({
        success: true,
        data: [],
        message: 'Seed inventory is empty'
      });
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const inventory = rows.map((row, index) => {
      const obj = { id: index + 1 };
      headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    }).filter(item => item.Crop || item.crop);
    
    return jsonResponse({
      success: true,
      data: inventory,
      count: inventory.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

function getFieldTasks() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const taskSheet = ss.getSheetByName('DAILY_TASKS_GENERATED');
    
    if (!taskSheet) {
      return jsonResponse({
        success: true,
        data: [],
        message: 'No task sheet found - run "Update Daily Tasks" from menu'
      });
    }
    
    const data = taskSheet.getDataRange().getValues();
    if (data.length < 2) {
      return jsonResponse({
        success: true,
        data: [],
        message: 'No tasks generated yet'
      });
    }
    
    const rows = data.slice(1);
    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);
    
    const tasks = rows.map((row, index) => {
      const dueDate = row[0];
      
      if (dueDate instanceof Date && dueDate <= weekFromNow) {
        return {
          id: `TASK-${index + 1}`,
          dueDate: dueDate.toISOString().split('T')[0],
          taskType: row[1],
          description: row[2],
          crop: row[3],
          batchId: row[4],
          priority: dueDate <= today ? 'high' : 'medium'
        };
      }
      return null;
    }).filter(Boolean);
    
    return jsonResponse({
      success: true,
      data: tasks,
      count: tasks.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

function getDTMLearningData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let dtmSheet = ss.getSheetByName('DTM_LEARNING');
    
    if (!dtmSheet) {
      return jsonResponse({
        success: true,
        data: [],
        message: 'No DTM learning data yet - sheet will be created when you record harvests'
      });
    }
    
    const data = dtmSheet.getDataRange().getValues();
    if (data.length < 2) {
      return jsonResponse({
        success: true,
        data: [],
        message: 'No DTM records yet'
      });
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const dtmData = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    return jsonResponse({
      success: true,
      data: dtmData,
      count: dtmData.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

function saveSuccessionPlan(plan) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const planSheet = ss.getSheetByName('PLANNING_2026');
    
    if (!planSheet) {
      return jsonResponse({
        success: false,
        error: 'PLANNING_2026 sheet not found'
      });
    }
    
    if (!plan || !Array.isArray(plan) || plan.length === 0) {
      return jsonResponse({
        success: false,
        error: 'No plan data provided'
      });
    }
    
    let added = 0;
    
    for (let i = 0; i < plan.length; i++) {
      const p = plan[i];
      const batchId = `26-${p.crop.substring(0,3).toUpperCase()}-${Math.floor(Math.random() * 9999)}`;
      const ghSow = p.ghSow ? new Date(p.ghSow) : '';
      const fieldSow = p.fieldSow ? new Date(p.fieldSow) : '';
      const transplant = p.transplant ? new Date(p.transplant) : '';
      const harvest = p.harvest ? new Date(p.harvest) : '';
      
      planSheet.appendRow([
        'Planned', batchId, p.crop, p.variety, p.method, '',
        0, 0, 0, ghSow, '', fieldSow, '', transplant, '',
        harvest, '', '', '', `Auto-generated succession ${i+1}/${plan.length}`
      ]);
      
      added++;
    }
    
    return jsonResponse({
      success: true,
      message: `Saved ${added} plantings to PLANNING_2026`,
      count: added,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

function completeTask(taskId, completedBy, notes) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName('MASTER_LOG');
    
    if (!logSheet) {
      return jsonResponse({
        success: false,
        error: 'MASTER_LOG sheet not found'
      });
    }
    
    logSheet.appendRow([
      new Date(), 'Completed', 'Task Completed', '', '', '', '', '',
      notes || 'Via mobile app', completedBy || 'Mobile User',
      '', taskId || '', '', ''
    ]);
    
    return jsonResponse({
      success: true,
      message: 'Task completed and logged',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY ENDPOINTS (Stub implementations)
// ═══════════════════════════════════════════════════════════════════════════

function getPlanning() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('PLANNING_2026');
  if (!sheet) return jsonResponse({error: 'PLANNING_2026 not found'}, 404);
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const plantings = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => { obj[header] = row[index]; });
    return obj;
  }).filter(row => row.Crop);
  
  return jsonResponse({success: true, count: plantings.length, plantings: plantings});
}

function getCrops() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('REF_CropProfiles');
  if (!sheet) return jsonResponse({error: 'REF_CropProfiles not found'}, 404);
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const crops = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => { obj[header] = row[index]; });
    return obj;
  }).filter(row => row.Crop_Name);
  
  return jsonResponse({success: true, count: crops.length, crops: crops});
}

function getBeds() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('REF_Beds');
  if (!sheet) return jsonResponse({error: 'REF_Beds not found'}, 404);
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const beds = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => { obj[header] = row[index]; });
    return obj;
  }).filter(row => row['Bed ID']);
  
  return jsonResponse({success: true, count: beds.length, beds: beds});
}

function addPlanting(planting) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('PLANNING_2026');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(header => planting[header] || '');
  if (!planting.Batch_ID) row[headers.indexOf('Batch_ID')] = '26-' + new Date().getTime();
  sheet.appendRow(row);
  return jsonResponse({success: true, message: 'Planting added'});
}

// Stubs
function getPlanningById(id) { return jsonResponse({success: false, message: 'Not implemented'}); }
function getCropByName(crop, variety) { return jsonResponse({success: false, message: 'Not implemented'}); }
function getBedsByField(field) { return jsonResponse({success: false, message: 'Not implemented'}); }
function getTasks(date) { return jsonResponse({success: false, message: 'Not implemented'}); }
function getTasksByDateRange(start, end) { return jsonResponse({success: false, message: 'Not implemented'}); }
function getHarvests() { return jsonResponse({success: false, message: 'Not implemented'}); }
function getHarvestsByDateRange(start, end) { return jsonResponse({success: false, message: 'Not implemented'}); }
function getWeatherData() { return jsonResponse({success: false, message: 'Not implemented'}); }
function getCSAMembers() { return jsonResponse({success: false, message: 'Not implemented'}); }
function getFinancials() { return jsonResponse({success: false, message: 'Not implemented'}); }
  function updatePlanting(params) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('PLANNING_2026');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Find the Batch_ID column
    const batchIdColIndex = headers.indexOf('Batch_ID');
    const searchColIndex = batchIdColIndex >= 0 ? batchIdColIndex : 1;
    const searchId = params.id || params.Batch_ID;

    for (let i = 1; i < data.length; i++) {
      if (data[i][searchColIndex] === searchId) {
        Object.keys(params).forEach(key => {
          const colIndex = headers.indexOf(key);
          if (colIndex > -1 && key !== 'id' && key !== 'action') {
            sheet.getRange(i + 1, colIndex + 1).setValue(params[key]);
          }
        });
        return jsonResponse({success: true, message: 'Planting updated'});
      }
    }
    return jsonResponse({success: false, error: 'Planting not found'});
  }


function deletePlanting(id) { return jsonResponse({success: false, message: 'Not implemented'}); }

/**
 * Delete a planting by Batch_ID (for GET requests)
 */
function deletePlantingById(batchId) {
  try {
    if (!batchId) {
      return jsonResponse({ success: false, error: 'No batch ID provided' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('PLANNING_2026');

    if (!sheet) {
      return jsonResponse({ success: false, error: 'PLANNING_2026 sheet not found' });
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const batchIdCol = headers.indexOf('Batch_ID');

    if (batchIdCol === -1) {
      return jsonResponse({ success: false, error: 'Batch_ID column not found' });
    }

    // Find the row with matching Batch_ID
    let rowToDelete = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][batchIdCol]) === String(batchId)) {
        rowToDelete = i + 1; // +1 because sheet rows are 1-indexed
        break;
      }
    }

    if (rowToDelete === -1) {
      return jsonResponse({ success: false, error: `Planting ${batchId} not found` });
    }

    // Delete the row
    sheet.deleteRow(rowToDelete);

    return jsonResponse({
      success: true,
      message: `Planting ${batchId} deleted successfully`,
      deletedId: batchId
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}
function bulkAddPlantings(plantings) { return jsonResponse({success: false, message: 'Not implemented'}); }
function addTask(task) { return jsonResponse({success: false, message: 'Not implemented'}); }
function recordHarvest(harvest) { return jsonResponse({success: false, message: 'Not implemented'}); }

// ═══════════════════════════════════════════════════════════════════════════
// YOUR EXISTING MENU & PRODUCTION FUNCTIONS CONTINUE BELOW
// (All your existing code stays exactly as is)
// ═══════════════════════════════════════════════════════════════════════════







// ══════════════════════════════════════════════════════════════════════════════
// PART 1: MENU & CORE ADMINISTRATION
// ══════════════════════════════════════════════════════════════════════════════

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🚜 Tiny Seed Admin')
    .addItem('👋 START: Get Session Agenda', 'startSession')
    .addItem('🛑 END: Log Session', 'logSession')
    .addItem('📘 MANUAL: Update Project Log', 'updateProjectLog')
    .addSeparator()
    .addItem('➕ New Planting Wizard', 'openNewPlantingDialog')
    .addItem('👯 Duplicate & Move Plantings', 'openBatchDuplicateDialog') 
    .addItem('🥬 Add New Crop Profile', 'openNewCropDialog') 
    .addItem('🗑️ Delete Selected Rows', 'deleteSelectedPlantings')
    .addItem('⚡ DIRECT IMPORT (No Pop-up)', 'quickImportStaging')
    .addSeparator()
    .addItem('🔄 Force Recalculate Row', 'forceRecalculateSelectedRow')
    .addItem('🔄 Force Sync Field Data', 'generateFieldTabs')
    .addItem('📊 REPORT: Generate Visual Field Map', 'generateVisualMap')
    .addItem('🧮 CALC: Run Bed Math', 'runBedCalculations')
    .addSeparator()
    .addItem('📅 TASKS: Update Daily Tasks', 'generateDailyTasks')
    .addItem('🚀 ACTION: Register Planting', 'registerSelectedPlanting')
    .addItem('📝 ACTION: Register Harvest', 'registerHarvest')
    .addSeparator()
    .addItem('📧 EMAIL: Crop Production Report', 'generateAndEmailReport')
    .addItem('💲 FINANCE: Generate Price Projections', 'generatePriceProjections')
    .addItem('📊 REPORT: Bed Status Map', 'generateFieldStatusReport') 
    .addItem('📄 REPORT: Generate Audit View', 'generateAuditPDF')
    .addItem('🖨️ PRINT: Bed QR Codes', 'generateQRSheet')
    .addSeparator()
    .addItem('🔧 SETUP: Update Database Tables', 'setupAllTables')
    .addItem('🌡️ WEATHER: Log Daily Weather', 'logDailyWeather')
    .addItem('❄️ SAFETY: Run Frost Check', 'runFrostSafetyCheck')
    .addItem('🔧 VENDOR: Enrich Vendor Database', 'fixAndEnrichVendors')
    .addToUi();
}

function updateProjectLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const manualSheet = ss.getSheetByName("SYS_UserManual");
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt("Project Log", "Notes for this session:", ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() == ui.Button.OK) {
    let notes = response.getResponseText() || "Auto-Log: System Update Installed.";
    manualSheet.appendRow([new Date(), "5.0", "Web API Added", "Deploy and test HTML tools", notes]);
    manualSheet.autoResizeColumns(1, 5);
    ui.alert("✅ Log Updated.");
  }
}

function deleteSelectedPlantings() { 
  SpreadsheetApp.getUi().alert("Select rows in PLANNING_2026 and delete manually."); 
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 2: DATABASE SETUP & INITIALIZATION
// ══════════════════════════════════════════════════════════════════════════════

function setupAllTables() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  createTabIfNotExists(ss, "SYS_UserManual", 
    ["Date", "Version", "Action_Taken", "Next_Steps_Goals", "Notes"], "#4a86e8");

  createTabIfNotExists(ss, "REF_CropProfiles", [
    "Crop_Name", "Primary_Category", "Family", "Scientific_Name", "Color_Hex", "Variety_Default",
    "Harvest_Unit", "Price_Wholesale", "Price_Retail", "Yield_Lbs_Per_Ft",
    "Calc_Method", "Rec_Direct", "Rec_Transplant", "Rows_Per_Bed", "In_Row_Spacing_In", "Tray_Cell_Count", "Seeder_Config", "Safety_Buffer_%",
    "DTM_Spring", "DTM_Summer", "DTM_Fall", "DTM_Average", 
    "Nursery_Days", "Days_To_Pot_Up", "Days_To_Harden_Off",
    "Germination_Days", "Germ_Temp_F", "Cold_Stratify?", "Germination_Instructions",
    "Hardiness_Zone", "Rotation_Group", "Common_Pests", "Common_Diseases", "Storage_Reqs",
    "Temp_Day_Optimum", "Temp_Night_Optimum", "Soil_Temp_Optimum", "Light_Req", "Water_Req", "pH_Min", "pH_Max", 
    "Grower_Notes"
  ], "#fce5cd");

  createTabIfNotExists(ss, "PLANNING_2026", [
    "STATUS", "Batch_ID", "Crop", "Variety", "Method", 
    "Target_Bed_ID", "Feet_Used", "Plants_Needed", "Trays_Needed",
    "GH_Sow_Date", "Field_Sow_Date", "Transplant_Date", "First_Harvest", 
    "Last_Harvest", "Yield_Lbs", "Revenue", "Notes", "Work_Order"
  ], "#f4cccc");

  createTabIfNotExists(ss, "REF_Fields", 
    ["Field ID", "Field Name", "Acreage", "Length (Ft)", "Width (Ft)", "Path Width (in)", "Bed Width (in)", "Number of Beds", "Notes", "Veg", "Floral", "Perennial", "Cover"], "#cfe2f3");
  createTabIfNotExists(ss, "REF_Beds", 
    ["Bed ID", "Parent Field", "Index", "Length", "Status", "Type"], "#d9ead3");
  createTabIfNotExists(ss, "REF_Pricing", 
    ["Crop_Name", "Harvest_Unit", "Avg_Price_2026", "Proj_2027", "Proj_2028", "Proj_2029", "Proj_2030", "Notes"], "#fff2cc");

  createTabIfNotExists(ss, "MASTER_LOG", 
    ["Date", "Status", "Activity", "Location", "Crop", "Variety", "Qty", "Unit", "Notes", "Staff", "Photos", "Lot#", "Method", "Cleaned?"], "#ffffff");
  createTabIfNotExists(ss, "LOG_Purchases", 
    ["Date", "Vendor", "Order#", "Item", "SKU", "Category", "Qty", "Unit", "Lot#", "Status"], "#fff2cc");
  createTabIfNotExists(ss, "LOG_Weather", 
    ["Date", "Max_Temp_F", "Min_Temp_F", "Precip_Inch", "Growing_Degree_Days", "Notes"], "#a4c2f4");

  createTabIfNotExists(ss, "IMPORT_Staging", ["PASTE_DATA_HERE"], "#e6b8af");
  createTabIfNotExists(ss, "SYS_VendorMaps", ["Vendor", "HeadRow", "Col_Date", "Col_Order", "Col_SKU", "Col_Item", "Col_Qty", "Col_Unit", "Def_Cat"], "#d9d2e9");
  createTabIfNotExists(ss, "REF_Varieties", ["Variety_ID", "Crop", "Variety", "Vendor", "Organic?", "DTM", "Unit", "Link"], "#e06666");
  createTabIfNotExists(ss, "REF_Assets", ["Asset_ID", "Category", "Item_Name", "Location", "Qty", "Unit", "Reorder", "QR"], "#d9d2e9");
  createTabIfNotExists(ss, "REF_Vendors", ["Vendor_Name", "Website_URL", "Account_Number", "Contact_Name", "Contact_Email", "Notes"], "#ead1dc");
  createTabIfNotExists(ss, "REF_TaskTemplates", ["Crop", "Task_Name", "Days_Offset", "Anchor_Point", "Task_Type", "Equipment_Needed", "Notes"], "#fff2cc");

  createTabIfNotExists(ss, "REF_Trays", [
    "Tray_Name", "Cell_Count", "Cells_Per_Flat", "Flat_Dimensions", "Material", "Inventory_Qty"
  ], "#d9d2e9");

  let settingsSheet = createTabIfNotExists(ss, "REF_Settings", ["Setting", "Value", "Notes"], "#b6d7a8");
  if (settingsSheet.getLastRow() < 2) {
    settingsSheet.getRange(2, 1, 4, 3).setValues([
      ["Spring Frost Date", "5/20/2026", "Zelienople, PA"],
      ["Fall Frost Date", "10/10/2026", "Zelienople, PA"],
      ["Farm Latitude", "40.7956", "Geo"],
      ["Farm Longitude", "-80.1384", "Geo"]
    ]);
  }

  const traySheet = ss.getSheetByName("REF_Trays");
  const profileSheet = ss.getSheetByName("REF_CropProfiles");
  if (traySheet && profileSheet && traySheet.getLastRow() > 1) {
    try {
      const trays = traySheet.getRange(2, 1, traySheet.getLastRow()-1, 1);
      const rule = SpreadsheetApp.newDataValidation().requireValueInRange(trays).build();
      profileSheet.getRange("P2:P1000").setDataValidation(rule);
    } catch(e) { console.log("Validation error: " + e); }
  }
}

function createTabIfNotExists(ss, tabName, headers, color) {
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight("bold");
    headerRange.setBackground(color);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 3: EMAIL REPORTING ENGINE
// ══════════════════════════════════════════════════════════════════════════════

function generateAndEmailReport() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  
  var sheet = ss.getSheetByName("PLANNING_2026"); 
  if (!sheet) {
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getName().toUpperCase().indexOf("PLANNING") > -1) {
        sheet = sheets[i];
        break;
      }
    }
  }
  
  if (!sheet) {
    ui.alert("Error: Could not find a 'PLANNING_2026' tab!");
    return;
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  var colMap = {};
  headers.forEach(function(header, index) {
    colMap[header.toString().trim()] = index;
  });

  function getDate(row, colName) {
    if (colMap[colName] === undefined) return null;
    var val = row[colMap[colName]];
    return (val instanceof Date) ? val : null;
  }

  function getVal(row, colName) {
    if (colMap[colName] === undefined) return "";
    return row[colMap[colName]];
  }

  function formatDate(date) {
    if (!date) return "TBD";
    return (date.getMonth() + 1) + '/' + date.getDate();
  }

  var cropData = {};
  var unassignedBeds = [];
  var comingUp = { week1: [], week2: [], month: [] };
  
  var today = new Date();
  var nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  var weekAfter = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  var nextMonth = new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000);

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var crop = getVal(row, 'Crop');
    if (!crop) continue;

    var variety = getVal(row, 'Variety');
    var bedId = getVal(row, 'Target_Bed_ID');
    
    var sowDate = getDate(row, 'Plan_Field_Sow');
    if (!sowDate) sowDate = getDate(row, 'Plan_Transplant');
    if (!sowDate) sowDate = getDate(row, 'Plan_GH_Sow');
    if (!sowDate) sowDate = getDate(row, 'Field_Sow_Date'); 
    
    var harvestStart = getDate(row, 'First_Harvest');
    var harvestEnd = getDate(row, 'Last_Harvest');

    var entry = {
      rowLine: i + 1,
      variety: variety,
      bed: bedId,
      sowDate: sowDate,
      harvestStart: harvestStart,
      harvestEnd: harvestEnd
    };

    if (!cropData[crop]) cropData[crop] = [];
    cropData[crop].push(entry);

    if (!bedId || bedId.toString().toLowerCase().includes("unassigned") || bedId.toString().toLowerCase().includes("noy yet") || bedId == "") {
      unassignedBeds.push(`${crop} (${variety}) - Seed: ${formatDate(sowDate)}`);
    }

    if (entry.sowDate) {
      var task = `🌱 <b>SOW:</b> ${crop} (${entry.variety}) on ${formatDate(entry.sowDate)}`;
      if (entry.sowDate >= today && entry.sowDate <= nextWeek) comingUp.week1.push(task);
      else if (entry.sowDate > nextWeek && entry.sowDate <= weekAfter) comingUp.week2.push(task);
      else if (entry.sowDate > weekAfter && entry.sowDate <= nextMonth) comingUp.month.push(task);
    }
    
    if (entry.harvestStart) {
      var task = `🔪 <b>HARVEST START:</b> ${crop} (${entry.variety}) on ${formatDate(entry.harvestStart)}`;
      if (entry.harvestStart >= today && entry.harvestStart <= nextWeek) comingUp.week1.push(task);
      else if (entry.harvestStart > nextWeek && entry.harvestStart <= weekAfter) comingUp.week2.push(task);
      else if (entry.harvestStart > weekAfter && entry.harvestStart <= nextMonth) comingUp.month.push(task);
    }
  }

  var htmlBody = "<h2 style='color:#2e7d32;'>🚜 2026 Farm Production Report</h2>";
  htmlBody += "<p>Generated on: " + formatDate(today) + "</p><hr>";

  htmlBody += "<h3 style='background-color:#e8f5e9; padding:5px;'>📊 Crop Consistency</h3>";
  
  var crops = Object.keys(cropData).sort();
  
  crops.forEach(function(c) {
    var batches = cropData[c];
    batches.sort(function(a, b) {
      if (!a.harvestStart) return 1;
      if (!b.harvestStart) return -1;
      return a.harvestStart - b.harvestStart;
    });

    htmlBody += `<h4>${c.toUpperCase()}</h4><ul>`;
    var lastEnd = null;
    
    batches.forEach(function(b) {
      var seedStr = formatDate(b.sowDate);
      var availStr = "<span style='color:gray;'>Dates not set</span>";
      
      if (b.harvestStart) {
        var end = b.harvestEnd ? b.harvestEnd : new Date(b.harvestStart.getTime() + 14*24*60*60*1000);
        availStr = `<b>Available:</b> ${formatDate(b.harvestStart)} - ${formatDate(b.harvestEnd || end)}`;
        
        if (lastEnd) {
          var diffTime = b.harvestStart - lastEnd;
          var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 5) { 
            htmlBody += `<li style="color:red; font-weight:bold;">⚠️ GAP: No production for ${diffDays} days (${formatDate(lastEnd)} to ${formatDate(b.harvestStart)})</li>`;
          }
        }
        lastEnd = end;
      }
      htmlBody += `<li>${b.variety}: Seeded ${seedStr} | ${availStr}</li>`;
    });
    htmlBody += "</ul>";
  });

  htmlBody += "<hr><h3 style='background-color:#fff3e0; padding:5px;'>📅 Coming Up</h3>";
  
  htmlBody += "<h4>This Week (Next 7 Days)</h4><ul>";
  if (comingUp.week1.length == 0) htmlBody += "<li>No major tasks.</li>";
  comingUp.week1.forEach(function(item){ htmlBody += `<li>${item}</li>`; });
  htmlBody += "</ul>";

  htmlBody += "<h4>Next Week (Days 8-14)</h4><ul>";
  if (comingUp.week2.length == 0) htmlBody += "<li>No major tasks.</li>";
  comingUp.week2.forEach(function(item){ htmlBody += `<li>${item}</li>`; });
  htmlBody += "</ul>";

  htmlBody += "<h4>Looking Ahead (Next 30 Days)</h4><ul>";
  if (comingUp.month.length == 0) htmlBody += "<li>No major tasks.</li>";
  comingUp.month.forEach(function(item){ htmlBody += `<li>${item}</li>`; });
  htmlBody += "</ul>";

  htmlBody += "<hr><h3 style='background-color:#ffebee; padding:5px;'>🚫 Unassigned Beds</h3>";
  if (unassignedBeds.length > 0) {
    htmlBody += "<ul>";
    unassignedBeds.forEach(function(u) { htmlBody += `<li>${u}</li>`; });
    htmlBody += "</ul>";
  } else {
    htmlBody += "<p>All batches have assigned beds!</p>";
  }

  var emailResponse = ui.prompt(
    '📧 Email Report', 
    'Enter the email address to send this report to:', 
    ui.ButtonSet.OK_CANCEL
  );

  if (emailResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  var email = emailResponse.getResponseText();

  if (!email || email.trim() === "") {
    ui.alert("❌ No email entered. Report cancelled.");
    return;
  }

  try {
    MailApp.sendEmail({
      to: email,
      subject: "🚜 Farm Production Report - " + formatDate(today),
      htmlBody: htmlBody
    });
    ui.alert('✅ Report sent to ' + email);
  } catch (e) {
    ui.alert("❌ Error sending email: " + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 4: FIELD SYNC & BED GENERATION
// ══════════════════════════════════════════════════════════════════════════════

function generateFieldTabs(runMath) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  if (runMath === true && typeof recalculateAllFieldMath === 'function') {
    try { recalculateAllFieldMath(); } catch (e) { console.log("Math Error: " + e) }
  }

  const srcSheet = ss.getSheetByName('REF_Fields');
  const bedSheet = ss.getSheetByName('REF_Beds');
  if (!srcSheet || !bedSheet) return;

  let bedMemory = {};
  const currentBedData = bedSheet.getDataRange().getValues();
  for (let i = 1; i < currentBedData.length; i++) {
    let id = String(currentBedData[i][0]);
    if (id) {
      bedMemory[id] = {
        length: currentBedData[i][3],
        status: currentBedData[i][4],
        type: currentBedData[i][5]
      };
    }
  }

  const data = srcSheet.getDataRange().getValues();
  
  let vegFields = [['Field Name', 'Notes', 'Acreage']];
  let floral = [['Field Name', 'Notes', 'Acreage']];
  let cover = [['Field Name', 'Notes', 'Acreage']];
  let perennial = [['Field Name', 'Notes', 'Acreage']];
  let newBedList = []; 
  
  for (let i = 1; i < data.length; i++) {
    const r = data[i]; 
    let fieldName = r[1];
    let defaultLength = r[3];
    let bedCount = r[7];

    let type = "";
    if (r[9] === true) type = "Veg";
    else if (r[10] === true) type = "Floral";
    else if (r[11] === true) type = "Perennial";
    else if (r[12] === true) type = "Cover";
    
    if (r[9] === true) vegFields.push([r[1], r[8], r[2]]);
    if (r[10] === true) floral.push([r[1], r[8], r[2]]);
    if (r[11] === true) perennial.push([r[1], r[8], r[2]]);
    if (r[12] === true) cover.push([r[1], r[8], r[2]]);
    
    if (bedCount > 0 && type !== "") {
      for (let b = 1; b <= bedCount; b++) {
        let n = b < 10 ? "0" + b : b;
        let bedId = fieldName + "-" + n;
        
        let finalLength = defaultLength;
        let finalStatus = 'Available';
        
        if (bedMemory[bedId]) {
          finalLength = bedMemory[bedId].length;
          finalStatus = bedMemory[bedId].status;
        }

        newBedList.push([bedId, fieldName, b, finalLength, finalStatus, type]);
      }
    }
  }

  const oldTotal = currentBedData.length - 1;
  const newTotal = newBedList.length;

  if (oldTotal !== newTotal) {
    let response = ui.alert(
      'Confirm Bed Update', 
      `This will change your total bed count from ${oldTotal} to ${newTotal}.\n\n` +
      `Existing bed lengths and statuses will be PRESERVED.\n` +
      `Do you want to proceed?`,
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) {
      ui.alert('Update Canceled.');
      return;
    }
  }

  updateTab(ss, 'REF_Fields_Veg', [], vegFields);
  updateTab(ss, 'REF_Fields_Floral', [], floral);
  updateTab(ss, 'REF_Fields_Perennial', [], perennial);
  updateTab(ss, 'REF_Fields_Cover', [], cover);
  
  updateTab(ss, 'REF_Beds', [['Bed ID', 'Parent Field', 'Index', 'Length', 'Status', 'Type']], newBedList);
  
  try {
    paintVisualMapDirectly(ss, newBedList);
    applyUniversalStyles(ss);
    applyFieldColors();
    applyBedDropdown(ss);
  } catch (e) {
    console.log("Visuals Error: " + e);
  }
  
  ss.toast("Field data synced successfully.", "Done");
}

function paintVisualMapDirectly(ss, bedList) {
  const sheet = ss.getSheetByName('VISUAL_FieldMap');
  if (!sheet || sheet.getLastRow() < 2) return;
  const colorMap = { "Veg": "#d9ead3", "Floral": "#d9d2e9", "Perennial": "#cfe2f3", "Cover": "#fff2cc" };
  const bedColors = {};
  bedList.forEach(row => { bedColors[row[0]] = colorMap[row[5]] || "#ffffff"; });
  const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1);
  const ids = range.getValues().flat();
  const bgColors = ids.map(id => [ bedColors[id] || "#ffffff" ]);
  range.setBackgrounds(bgColors);
}

function applyUniversalStyles(ss) {
  const colors = { veg: "#d9ead3", floral: "#d9d2e9", perennial: "#cfe2f3", cover: "#fff2cc" };
  const planSheet = ss.getSheetByName('PLANNING_2026');
  if (planSheet) {
    let existingRules = planSheet.getConditionalFormatRules(); 
    const range = planSheet.getRange("F2:F2000");
    const newRules = [
      createRule(range, '=VLOOKUP($F2, INDIRECT("REF_Beds!A:F"), 6, 0)="Veg"', colors.veg),
      createRule(range, '=VLOOKUP($F2, INDIRECT("REF_Beds!A:F"), 6, 0)="Floral"', colors.floral),
      createRule(range, '=VLOOKUP($F2, INDIRECT("REF_Beds!A:F"), 6, 0)="Perennial"', colors.perennial),
      createRule(range, '=VLOOKUP($F2, INDIRECT("REF_Beds!A:F"), 6, 0)="Cover"', colors.cover)
    ];
    planSheet.setConditionalFormatRules(existingRules.concat(newRules));
  }
}

function createRule(range, formula, color) {
  return SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(formula).setBackground(color).setRanges([range]).build();
}

function updateTab(ss, name, headers, data) {
  let s = ss.getSheetByName(name);
  if (!s) s = ss.insertSheet(name);
  s.clearContents(); s.clearFormats(); 
  let out = headers.concat(data);
  if (out.length) s.getRange(1, 1, out.length, out[0].length).setValues(out);
}

function applyFieldColors() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('REF_Fields');
  if (!sheet) return;
  sheet.clearConditionalFormatRules();
  const range = sheet.getRange("A2:M1000");
  const rules = [
    createRule(range, '=$J2=TRUE', "#d9ead3"), createRule(range, '=$K2=TRUE', "#d9d2e9"), 
    createRule(range, '=$L2=TRUE', "#cfe2f3"), createRule(range, '=$M2=TRUE', "#fff2cc")  
  ];
  sheet.setConditionalFormatRules(rules);
}

function applyBedDropdown(ss) {
  const plan = ss.getSheetByName('PLANNING_2026');
  const beds = ss.getSheetByName('REF_Beds');
  if (plan && beds) {
    const rule = SpreadsheetApp.newDataValidation().requireValueInRange(beds.getRange('A2:A')).setAllowInvalid(true).build();
    plan.getRange('F2:F').setDataValidation(rule);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 5: OPERATIONS & REPORTS
// ══════════════════════════════════════════════════════════════════════════════

function generateDailyTasks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const planSheet = ss.getSheetByName("PLANNING_2026");
  const profileSheet = ss.getSheetByName("REF_CropProfiles");
  const taskSheet = ss.getSheetByName("DAILY_TASKS_GENERATED") || ss.insertSheet("DAILY_TASKS_GENERATED");
  
  const planData = planSheet.getRange(2, 1, planSheet.getLastRow()-1, 14).getValues();
  const profileData = profileSheet.getDataRange().getValues();
  let profiles = {};
  if (profileData.length > 1) {
    const headers = profileData[0];
    for (let i = 1; i < profileData.length; i++) {
      let name = profileData[i][0];
      if (name) profiles[name] = { potUp: profileData[i][9], harden: profileData[i][10], germ: profileData[i][11] };
    }
  }

  let tasks = [];
  for (let p = 0; p < planData.length; p++) {
    let crop = planData[p][2]; let batchID = planData[p][1];
    let sowDate = planData[p][9]; let transplantDate = planData[p][10]; let harvestDate = planData[p][11];
    
    if (!crop || !batchID) continue;
    
    if (sowDate instanceof Date) tasks.push([sowDate, "Seeding", "Sow Seeds", crop, batchID]);
    if (transplantDate instanceof Date) tasks.push([transplantDate, "Planting", "Transplant", crop, batchID]);
    if (harvestDate instanceof Date) tasks.push([harvestDate, "Harvest", "Harvest", crop, batchID]);

    if (profiles[crop] && sowDate instanceof Date) {
      let pro = profiles[crop];
      if (pro.germ > 0) { let d = new Date(sowDate); d.setDate(d.getDate() + Number(pro.germ)); tasks.push([d, "Nursery", "Check Germination", crop, batchID]); }
      if (pro.potUp > 0) { let d = new Date(sowDate); d.setDate(d.getDate() + Number(pro.potUp)); tasks.push([d, "Nursery", "Pot Up", crop, batchID]); }
      if (pro.harden > 0) { let d = new Date(sowDate); d.setDate(d.getDate() + Number(pro.harden)); tasks.push([d, "Nursery", "Harden Off", crop, batchID]); }
    }
  }
  
  taskSheet.getRange(2, 1, taskSheet.getLastRow(), 5).clearContent();
  taskSheet.getRange(1, 1, 1, 5).setValues([["Due_Date", "Task_Type", "Description", "Crop", "Batch_ID"]]);
  if (tasks.length > 0) {
    tasks.sort((a, b) => a[0] - b[0]);
    taskSheet.getRange(2, 1, tasks.length, 5).setValues(tasks);
  }
  SpreadsheetApp.getUi().alert(`✅ Generated ${tasks.length} tasks.`);
}

function generateAuditPDF() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var auditSheet = ss.getSheetByName("AUDIT_SUBMISSION_VIEW");
  if (auditSheet) ss.deleteSheet(auditSheet);
  auditSheet = ss.insertSheet("AUDIT_SUBMISSION_VIEW");
  auditSheet.getRange("A1").setValue("OFFICIAL ORGANIC AUDIT RECORD - 2026").setFontSize(20).setFontWeight("bold");
  const masterSheet = ss.getSheetByName("MASTER_LOG");
  const masterData = masterSheet.getDataRange().getValues();
  auditSheet.getRange("A3").setValue("SECTION 1: FIELD ACTIVITY LOG").setFontWeight("bold");
  if (masterData.length > 0) auditSheet.getRange(4, 1, masterData.length, masterData[0].length).setValues(masterData);
  const nextRow = 4 + masterData.length + 2;
  const logSheet = ss.getSheetByName("LOG_Purchases");
  const logData = logSheet.getDataRange().getValues();
  auditSheet.getRange(nextRow, 1).setValue("SECTION 2: INPUTS & SEEDS PURCHASED").setFontWeight("bold");
  if (logData.length > 0) auditSheet.getRange(nextRow + 1, 1, logData.length, logData[0].length).setValues(logData);
  SpreadsheetApp.getUi().alert("✅ Audit View Created.");
}

function generateFieldStatusReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reportSheet = ss.getSheetByName("REPORT_FieldStatus") || ss.insertSheet("REPORT_FieldStatus");
  const bedSheet = ss.getSheetByName("REF_Beds");
  const planSheet = ss.getSheetByName("PLANNING_2026");
  const beds = bedSheet.getRange(2, 1, bedSheet.getLastRow()-1, 1).getValues().flat();
  const plan = planSheet.getRange(2, 1, planSheet.getLastRow()-1, 14).getValues();
  let output = [];
  for (let b=0; b<beds.length; b++) {
    let bedID = beds[b];
    let match = plan.find(r => r[5] === bedID && (r[0] === "PLANTED" || r[0] === "HARVESTING"));
    if (match) {
      let days = Math.floor((new Date() - new Date(match[9])) / (86400000));
      output.push([bedID, match[0], match[2], match[1], days]);
    } else { output.push([bedID, "🟢 AVAILABLE", "-", "-", "-"]); }
  }
  reportSheet.getRange(2, 1, reportSheet.getLastRow(), 5).clearContent();
  if (output.length) reportSheet.getRange(2, 1, output.length, 5).setValues(output);
  SpreadsheetApp.getUi().alert("✅ Report Updated.");
}

function generatePriceProjections() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName("REF_Pricing");
  if(!s || s.getLastRow() < 2) return;
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt("Inflation %").getResponseText();
  const rate = 1 + (Number(r)/100);
  const data = s.getRange(2, 1, s.getLastRow() - 1, 8).getValues();
  for(let i=0; i<data.length; i++) {
     if(data[i][2]) {
       data[i][3] = data[i][2] * Math.pow(rate,1); data[i][4] = data[i][2] * Math.pow(rate,2);
       data[i][5] = data[i][2] * Math.pow(rate,3); data[i][6] = data[i][2] * Math.pow(rate,4);
     }
  }
  s.getRange(2,1,data.length,8).setValues(data);
  ui.alert("✅ Updated.");
}

function generateQRSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheetByName("PRINT_QR_CODES") || ss.insertSheet("PRINT_QR_CODES");
  const beds = ss.getSheetByName("REF_Beds").getDataRange().getValues();
  let out = [];
  for(let i=1; i<beds.length; i++) out.push([beds[i][0], '=IMAGE("https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl='+encodeURIComponent(beds[i][0])+'")']);
  s.getRange(2,1,out.length,2).setValues(out);
  SpreadsheetApp.getUi().alert("✅ Generated.");
}

function registerSelectedPlanting() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const plan = ss.getSheetByName("PLANNING_2026");
  const log = ss.getSheetByName("MASTER_LOG");
  const rIdx = plan.getActiveCell().getRow();
  if (rIdx < 2) return;
  const row = plan.getRange(rIdx, 1, 1, 14).getValues()[0];
  if (!row[5]) { SpreadsheetApp.getUi().alert("No Bed Selected"); return; }
  log.appendRow([new Date(), "Pending", "Planting", row[5], row[2], row[3], "", "", row[12], "", "", row[1], row[4], ""]);
  plan.getRange(rIdx, 1).setValue("PLANTED");
  SpreadsheetApp.getUi().alert(`✅ Planted in ${row[5]}`);
}

function registerHarvest() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const plan = ss.getSheetByName("PLANNING_2026");
  const log = ss.getSheetByName("MASTER_LOG");
  const ui = SpreadsheetApp.getUi();
  const rIdx = plan.getActiveCell().getRow();
  if (rIdx < 2) return;
  const row = plan.getRange(rIdx, 1, 1, 14).getValues()[0];
  const qty = ui.prompt("Harvest Qty?").getResponseText();
  log.appendRow([new Date(), "Completed", "Harvest", row[5], row[2], row[3], qty, "lbs", "Harvest", "", "", row[1], "Manual", "Yes"]);
  plan.getRange(rIdx, 1).setValue("HARVESTING");
  ui.alert("✅ Logged.");
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 6: CALCULATORS
// ══════════════════════════════════════════════════════════════════════════════

function runBedCalculations() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const planSheet = ss.getSheetByName("PLANNING_2026");
  const profileSheet = ss.getSheetByName("REF_CropProfiles");
  const traySheet = ss.getSheetByName("REF_Trays");
  
  if (!planSheet || !profileSheet) { SpreadsheetApp.getUi().alert("❌ Missing Tabs."); return; }

  let trayMap = {};
  if (traySheet) {
    const tData = traySheet.getDataRange().getValues();
    for (let i = 1; i < tData.length; i++) {
      trayMap[tData[i][0]] = tData[i][1];
    }
  }

  const pData = profileSheet.getDataRange().getValues();
  let profiles = {};
  for (let i = 1; i < pData.length; i++) {
    let key = String(pData[i][0]).trim() + " - " + String(pData[i][3]).trim();
    let trayVal = pData[i][6];
    let cellCount = trayMap[trayVal] || Number(trayVal) || 72;
    
    profiles[key] = {
      rows: Number(pData[i][4]) || 1,
      spacing: Number(pData[i][5]) || 12,
      tray: cellCount,
      buffer: Number(pData[i][7]) || 0
    };
  }

  const range = planSheet.getDataRange();
  const data = range.getValues();
  let updates = 0;
  
  for (let i = 1; i < data.length; i++) {
    let crop = String(data[i][2]).trim();
    let variety = String(data[i][3]).trim();
    let feetUsed = data[i][6];
    
    if (crop && feetUsed > 0) {
      let key = crop + " - " + variety;
      let dna = profiles[key];
      
      if (dna) {
        let plants = Math.ceil((feetUsed * 12 / dna.spacing) * dna.rows);
        let plantsWithBuffer = plants * (1 + dna.buffer);
        let trays = Math.ceil(plantsWithBuffer / dna.tray);
        
        data[i][7] = plants;
        data[i][8] = trays;
        updates++;
      }
    }
  }
  
  if (updates > 0) {
    planSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    SpreadsheetApp.getUi().alert(`✅ Calculated for ${updates} rows.`);
  } else {
    SpreadsheetApp.getUi().alert("⚠️ No updates. Check Feet Used and Profile Matches.");
  }
}

function calculateFieldAcreage(sheet, row) {
  const len = sheet.getRange(row, 4).getValue();
  const wid = sheet.getRange(row, 5).getValue();
  if (len && wid) {
    const ac = (len * wid) / 43560;
    sheet.getRange(row, 3).setValue(Number(ac.toFixed(2))); 
  }
}

function calculateBedCount(sheet, row) {
  const wid = sheet.getRange(row, 5).getValue(); 
  const path = sheet.getRange(row, 6).getValue(); 
  const bedW = sheet.getRange(row, 7).getValue(); 
  
  if (wid && bedW) { 
    const totalW_in = (path || 0) + bedW;
    if (totalW_in > 0) {
      const beds = Math.floor((wid * 12) / totalW_in);
      sheet.getRange(row, 8).setValue(beds);
    }
  }
}

function recalculateAllFieldMath() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('REF_Fields');
  if (!sheet) return;
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  const range = sheet.getRange(2, 1, lastRow - 1, 8);
  const data = range.getValues();
  let updated = false;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const len = row[3];
    const wid = row[4];
    const path = row[5];
    const bedW = row[6];
    
    if (len && wid) {
       let rawAc = (len * wid) / 43560;
       data[i][2] = Number(rawAc.toFixed(2));
       updated = true;
    }
    
    if (wid && bedW) {
       const totalW = (path || 0) + bedW;
       if (totalW > 0) {
          data[i][7] = Math.floor((wid * 12) / totalW);
          updated = true;
       }
    }
  }
  
  if (updated) {
    range.setValues(data);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 7: EDIT TRIGGERS & DATE SYNC
// ══════════════════════════════════════════════════════════════════════════════

function onEdit(e) {
  if (!e || !e.range) return;
  
  const sheet = e.range.getSheet();
  const name = sheet.getName();
  const row = e.range.getRow();
  const col = e.range.getColumn();
  const val = e.value;

  if (row < 2) return; 

  if (name === "PLANNING_2026") {
    if ([10, 12, 14, 16].includes(col)) {
      syncPlanningDates(sheet, row, col, val);
    }
  }

  if (name === 'REF_Fields') {
    if (col >= 4 && col <= 7) {
      if (typeof calculateFieldAcreage === 'function') calculateFieldAcreage(sheet, row);
      
      const currentBeds = sheet.getRange(row, 8).getValue();
      let didCalc = false;

      if ((currentBeds === "" || currentBeds === 0) && typeof calculateBedCount === 'function') {
         calculateBedCount(sheet, row);
         didCalc = true;
      }
      
      if (typeof generateFieldTabs === 'function') generateFieldTabs(didCalc); 
    }

    if (col === 8) {
      if (typeof generateFieldTabs === 'function') generateFieldTabs(false); 
    }
    
    if (col >= 10 && col <= 13) {
      if (typeof generateFieldTabs === 'function') generateFieldTabs(false);
    }
  }
}

function syncPlanningDates(sheet, row, col, newVal) {
  if (!newVal) return; 
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const profileSheet = ss.getSheetByName("REF_CropProfiles");
  
  const rowData = sheet.getRange(row, 3, 1, 3).getValues()[0];
  const crop = String(rowData[0]).trim().toLowerCase();
  const variety = String(rowData[1]).trim().toLowerCase();
  const method = String(rowData[2]).toLowerCase();

  const pData = profileSheet.getDataRange().getValues();
  let nurseryDays = 28; 
  let dtm = 50;         

  for (let i = 1; i < pData.length; i++) {
    let pCrop = String(pData[i][0]).trim().toLowerCase();
    let pVar = String(pData[i][5]).trim().toLowerCase();
    
    if (pCrop === crop && pVar === variety) {
      nurseryDays = Number(pData[i][22]) || 28; 
      dtm = Number(pData[i][42]) || 50;         
      break;
    } else if (pCrop === crop && !pVar) {
      nurseryDays = Number(pData[i][22]) || 28;
      dtm = Number(pData[i][42]) || 50;
    }
  }

  const anchorDate = new Date(newVal); 
  let newSow, newTransplant, newHarvest;

  if (method.includes('transplant') || method.includes('paper')) {
    if (col === 10) {
      newSow = anchorDate;
      newTransplant = new Date(anchorDate); newTransplant.setDate(anchorDate.getDate() + nurseryDays);
      newHarvest = new Date(newTransplant); newHarvest.setDate(newTransplant.getDate() + dtm);
      sheet.getRange(row, 14).setValue(newTransplant); 
      sheet.getRange(row, 16).setValue(newHarvest);    
    } else if (col === 14) {
      newTransplant = anchorDate;
      newSow = new Date(anchorDate); newSow.setDate(anchorDate.getDate() - nurseryDays);
      newHarvest = new Date(anchorDate); newHarvest.setDate(anchorDate.getDate() + dtm);
      sheet.getRange(row, 10).setValue(newSow);      
      sheet.getRange(row, 16).setValue(newHarvest);   
    } else if (col === 16) {
      newHarvest = anchorDate;
      newTransplant = new Date(anchorDate); newTransplant.setDate(anchorDate.getDate() - dtm);
      newSow = new Date(newTransplant); newSow.setDate(newTransplant.getDate() - nurseryDays);
      sheet.getRange(row, 10).setValue(newSow);
      sheet.getRange(row, 14).setValue(newTransplant);
    }
  } else {
    if (col === 12) {
      newSow = anchorDate;
      newHarvest = new Date(anchorDate); newHarvest.setDate(anchorDate.getDate() + dtm);
      sheet.getRange(row, 16).setValue(newHarvest);
    } else if (col === 16) {
      newHarvest = anchorDate;
      newSow = new Date(anchorDate); newSow.setDate(anchorDate.getDate() - dtm);
      sheet.getRange(row, 12).setValue(newSow);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 8: WIZARD SYSTEM (BACKEND)
// ══════════════════════════════════════════════════════════════════════════════

function openNewPlantingDialog() {
  const html = HtmlService.createHtmlOutputFromFile('Wizard_Form').setWidth(500).setHeight(750).setTitle('🌱 Smart Planting Wizard');
  SpreadsheetApp.getUi().showModalDialog(html, 'Planting Wizard');
}

function openBatchDuplicateDialog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  if (sheet.getName() !== "PLANNING_2026") {
    SpreadsheetApp.getUi().alert("Please select rows in PLANNING_2026 first.");
    return;
  }
  const html = HtmlService.createHtmlOutputFromFile('Form_Duplicate').setWidth(350).setHeight(450).setTitle('👯 Duplicate Plantings');
  SpreadsheetApp.getUi().showModalDialog(html, 'Duplicate & Move');
}

function forceRecalculateSelectedRow() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = sheet.getActiveRange().getRow();
  if (sheet.getName() === "Greenhouse 2026" && row > 1) {
    const batchId = sheet.getRange(row, 2).getValue();
    if (typeof recalculateGreenhouseRow === 'function' && batchId) {
       recalculateGreenhouseRow(sheet, row, batchId);
    } else {
       SpreadsheetApp.getUi().alert("Feature requires legacy Greenhouse helpers.");
    }
  }
}

function getDuplicateInitData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const planSheet = ss.getSheetByName("PLANNING_2026");
  const bedSheet = ss.getSheetByName("REF_Beds");
  const profileSheet = ss.getSheetByName("REF_CropProfiles");
  
  let beds = [];
  if (bedSheet) {
    const bValues = bedSheet.getDataRange().getValues();
    for (let i = 1; i < bValues.length; i++) {
      let id = bValues[i][0];
      let len = Number(bValues[i][3]) || 100;
      if(id) beds.push({ id: id, length: len });
    }
  }

  let bookings = [];
  if (planSheet) {
    const pValues = planSheet.getDataRange().getValues();
    for (let i = 1; i < pValues.length; i++) {
       let bedId = String(pValues[i][5]);
       let start = String(pValues[i][4]).toLowerCase().includes('transplant') ? pValues[i][13] : pValues[i][11];
       let end = pValues[i][16];
       
       if (start instanceof Date && (!end || !(end instanceof Date))) {
          let e = new Date(start); e.setDate(start.getDate() + 45); end = e;
       }
       if (bedId && start instanceof Date && end instanceof Date) {
         bookings.push({ bedId: bedId, start: start.getTime(), end: end.getTime(), feet: Number(pValues[i][6])||0 });
       }
    }
  }

  let profileDefaults = {};
  if (profileSheet) {
    const pData = profileSheet.getDataRange().getValues();
    for (let i = 1; i < pData.length; i++) {
      let crop = String(pData[i][0]).toLowerCase().trim();
      let variety = String(pData[i][5]).toLowerCase().trim();
      let key = crop + "|" + variety;
      
      profileDefaults[key] = {
        rows: Number(pData[i][13]) || 1,
        spacing: Number(pData[i][14]) || 12
      };
      if (!profileDefaults[crop]) {
        profileDefaults[crop] = { rows: Number(pData[i][13])||1, spacing: Number(pData[i][14])||12 };
      }
    }
  }

  let selectedCrops = [];
  try {
    const selectionList = ss.getSelection().getActiveRangeList();
    if (selectionList) {
      selectionList.getRanges().forEach(range => {
        const startRow = range.getRow();
        const data = planSheet.getRange(startRow, 1, range.getNumRows(), 7).getValues();
        data.forEach((r, i) => {
          if (r[0] !== "Status" && r[2]) {
            let c = String(r[2]).toLowerCase().trim();
            let v = String(r[3]).toLowerCase().trim();
            
            let defs = profileDefaults[c + "|" + v] || profileDefaults[c] || { rows: 1, spacing: 12 };

            selectedCrops.push({
              rowIndex: startRow + i,
              crop: r[2],
              variety: r[3],
              currentFeet: Number(r[6]) || 0,
              defRows: defs.rows,
              defSpace: defs.spacing
            });
          }
        });
      });
    }
  } catch(e) {}

  return { beds: beds, bookings: bookings, selectedCrops: selectedCrops };
}

function processAllocatedDuplication(form) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const planSheet = ss.getSheetByName("PLANNING_2026");
  const profileSheet = ss.getSheetByName("REF_CropProfiles");
  const bedSheet = ss.getSheetByName("REF_Beds");

  let bedLengths = {};
  if (bedSheet) {
    const bData = bedSheet.getDataRange().getValues();
    for (let i = 1; i < bData.length; i++) {
      if (bData[i][0]) bedLengths[bData[i][0]] = Number(bData[i][3]) || 100;
    }
  }

  const pData = profileSheet.getDataRange().getValues();
  let cropMap = {};
  for(let i=1; i<pData.length; i++) {
     let key = String(pData[i][0]).toLowerCase().trim() + "|" + 
               String(pData[i][5]).toLowerCase().trim() + "|" + 
               (String(pData[i][43]).toLowerCase().includes("direct") ? "direct" : "transplant");
     cropMap[key] = { rowIndex: i + 1 }; 
  }

  let successCount = 0;

  form.bedIds.forEach(targetBedId => {
      form.allocations.forEach(item => {
        const rowValues = planSheet.getRange(item.rowIndex, 1, 1, 20).getValues()[0];

        let crop = String(rowValues[2]).trim();
        let variety = String(rowValues[3]).trim();
        let method = String(rowValues[4]).trim();
        let notes = rowValues[19];
        let mode = method.toLowerCase().includes("direct") ? "direct" : "transplant";

        let rowsPerBed = item.newRows || 1; 
        let spacing = item.newSpace || 12;
        let finalFeet = form.fillMode ? (bedLengths[targetBedId] || 100) : item.feet;

        let traySize = 72, nursery = 28, dtm = 50;
        if (mode === "direct") nursery = 0;

        let key = crop.toLowerCase() + "|" + variety.toLowerCase() + "|" + mode;
        if (cropMap[key]) {
            let pRow = cropMap[key].rowIndex;
            let vals = profileSheet.getRange(pRow, 1, 1, 45).getValues()[0];
            dtm = vals[42] || 50; 
            nursery = vals[22] || (mode === "direct" ? 0 : 28);
            traySize = vals[15] || 72;
        }

        const plants = Math.ceil((finalFeet * 12 / spacing) * rowsPerBed);
        let bedTrays = 0;
        if (mode === "transplant") bedTrays = Math.ceil((plants * 1.1) / traySize);

        let anchorDate = new Date(form.date);
        let planGHSow, planFieldSow, planTransplant, planFirstHarvest;
        
        if (form.type === 'harvest') {
            planFirstHarvest = new Date(anchorDate);
            let fieldDate = new Date(anchorDate); fieldDate.setDate(anchorDate.getDate() - dtm);
            if (mode === "transplant") {
              planTransplant = fieldDate;
              let sowDate = new Date(planTransplant); sowDate.setDate(planTransplant.getDate() - nursery);
              planGHSow = sowDate;
            } else { planFieldSow = fieldDate; }
        } else if (form.type === 'transplant') {
            let fieldDate = new Date(anchorDate);
            if (mode === "transplant") {
              planTransplant = fieldDate;
              let sowDate = new Date(planTransplant); sowDate.setDate(planTransplant.getDate() - nursery);
              planGHSow = sowDate;
            } else { planFieldSow = fieldDate; }
            let harvDate = new Date(fieldDate); harvDate.setDate(fieldDate.getDate() + dtm);
            planFirstHarvest = harvDate;
        } else if (form.type === 'gh_sow') {
            planGHSow = new Date(anchorDate);
            let transDate = new Date(planGHSow); transDate.setDate(planGHSow.getDate() + nursery);
            planTransplant = transDate;
            let harvDate = new Date(planTransplant); harvDate.setDate(planTransplant.getDate() + dtm);
            planFirstHarvest = harvDate;
        }

        let batchId = "26-" + crop.substring(0,3).toUpperCase() + "-" + Math.floor(Math.random() * 9999);

        planSheet.appendRow([
            "Planned", batchId, crop, variety, method, targetBedId,
            finalFeet, plants, bedTrays, 
            planGHSow || "", "", planFieldSow || "", "", planTransplant || "", "", 
            planFirstHarvest, "", "", "", notes
        ]);
        successCount++;
      });
  });

  return `✅ Planted ${successCount} entries (Density Adjusted).`;
}

function getWizardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const bedSheet = ss.getSheetByName("REF_Beds");
  const profileSheet = ss.getSheetByName("REF_CropProfiles");
  const planSheet = ss.getSheetByName("PLANNING_2026");
  
  let beds = [];
  if (bedSheet) {
    const bData = bedSheet.getRange(2, 1, bedSheet.getLastRow()-1, 4).getValues(); 
    beds = bData.map(r => ({ id: r[0], length: Number(r[3]) })).filter(b => b.id !== "");
  }

  let bookings = [];
  if (planSheet && planSheet.getLastRow() > 1) {
    const pData = planSheet.getRange(2, 1, planSheet.getLastRow()-1, 16).getValues(); 
    for (let i = 0; i < pData.length; i++) {
      let bid = String(pData[i][5]);
      let feet = Number(pData[i][6]) || 0;
      let method = String(pData[i][4]).toLowerCase();
      let start = (method.includes('transplant') || method.includes('paper')) ? pData[i][13] : pData[i][11];
      let end = pData[i][15]; 
      
      if (start instanceof Date && (!end || !(end instanceof Date))) {
          let estimatedEnd = new Date(start);
          estimatedEnd.setDate(start.getDate() + 45); 
          end = estimatedEnd;
      }

      if (bid && start instanceof Date && end instanceof Date) {
        bookings.push({ bedId: bid, feet: feet, start: start.getTime(), end: end.getTime() });
      }
    }
  }

  let vegCrops = [], floralCrops = [], cropMap = {}; 
  if (profileSheet) {
    const pData = profileSheet.getDataRange().getValues();
    for (let i = 1; i < pData.length; i++) {
      let name = String(pData[i][0]).trim(); 
      let category = pData[i][1];            
      let variety = String(pData[i][5]).trim();
      let rawMethod = String(pData[i][43]);
      let cleanMethod = "Transplant";
      if (rawMethod.toLowerCase().includes("direct")) cleanMethod = "Direct Seed";
      else if (rawMethod.toLowerCase().includes("paper")) cleanMethod = "Paperpot";
      
      if (!cropMap[name]) {
        cropMap[name] = {
          varieties: [],
          rows: pData[i][13] || 1, spacing: pData[i][14] || 12, tray: pData[i][15] || 72,   
          nursery: (cleanMethod === "Direct Seed") ? 0 : (pData[i][22] || 28),
          method: cleanMethod, dtm: pData[i][42] || 50     
        };
        if (String(category).toLowerCase().includes("floral")) floralCrops.push(name); else vegCrops.push(name);
      }
      if (variety && !cropMap[name].varieties.includes(variety)) cropMap[name].varieties.push(variety);
    }
  }
  return { beds: beds, bookings: bookings, veg: [...new Set(vegCrops)].sort(), floral: [...new Set(floralCrops)].sort(), map: cropMap };
}

function submitPlanting(form) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const planSheet = ss.getSheetByName("PLANNING_2026");
  const profileSheet = ss.getSheetByName("REF_CropProfiles");

  const batchId = "26-" + form.crop.substring(0,3).toUpperCase() + "-" + Math.floor(Math.random() * 9999);
  const totalFeet = Number(form.feet) || 0;
  const bedIds = form.bedIds; 
  const rowsPerBed = Number(form.rowsPerBed) || 1;
  const spacing = Number(form.spacing) || 12;
  const traySize = Number(form.traySize) || 72;
  const nurseryDays = Number(form.nurseryDays) || 0;
  const dtm = Number(form.dtm) || 50;
  const notes = form.notes || "";
  const crop = String(form.crop).trim();
  const variety = String(form.variety).trim();
  const method = String(form.method).trim();
  const mode = method.toLowerCase().includes("direct") ? "direct" : "transplant";

  let anchorDate = new Date(form.anchorDate);
  let planGHSow, planFieldSow, planTransplant, planFirstHarvest;
  
  if (form.anchorType === 'harvest') {
    planFirstHarvest = new Date(anchorDate);
    let fieldDate = new Date(anchorDate); fieldDate.setDate(anchorDate.getDate() - dtm);
    if (mode === "transplant") {
      planTransplant = fieldDate;
      let sowDate = new Date(planTransplant); sowDate.setDate(planTransplant.getDate() - nurseryDays);
      planGHSow = sowDate;
    } else { planFieldSow = fieldDate; }
  } else if (form.anchorType === 'transplant') {
    let fieldDate = new Date(anchorDate);
    if (mode === "transplant") {
      planTransplant = fieldDate;
      let sowDate = new Date(planTransplant); sowDate.setDate(planTransplant.getDate() - nurseryDays);
      planGHSow = sowDate;
    } else { planFieldSow = fieldDate; }
    let harvDate = new Date(fieldDate); harvDate.setDate(fieldDate.getDate() + dtm);
    planFirstHarvest = harvDate;
  } else if (form.anchorType === 'gh_sow') {
    planGHSow = new Date(anchorDate);
    let transDate = new Date(planGHSow); transDate.setDate(planGHSow.getDate() + nurseryDays);
    planTransplant = transDate;
    let harvDate = new Date(planTransplant); harvDate.setDate(planTransplant.getDate() + dtm);
    planFirstHarvest = harvDate;
  }

  const feetPerBed = Math.floor(totalFeet / bedIds.length); 
  bedIds.forEach(bedId => {
    const bedPlants = Math.ceil((feetPerBed * 12 / spacing) * rowsPerBed);
    let bedTrays = 0;
    if (mode === "transplant") bedTrays = Math.ceil((bedPlants * 1.1) / traySize);
    
    planSheet.appendRow([
      (bedId === "Unassigned") ? "Backlog" : "Planned",
      batchId, crop, variety, method, bedId,
      feetPerBed, bedPlants, bedTrays, 
      planGHSow || "", "", planFieldSow || "", "", planTransplant || "", "", 
      planFirstHarvest, "", "", "", notes
    ]);
  });

  const pData = profileSheet.getDataRange().getValues();
  let rowIndex = -1;
  let parentRowData = null;

  for (let i = 1; i < pData.length; i++) {
    let pCrop = String(pData[i][0]).toLowerCase().trim();
    let pVar = String(pData[i][5]).toLowerCase().trim();
    let pMethod = String(pData[i][43]).toLowerCase(); 
    let pMode = pMethod.includes("direct") ? "direct" : "transplant";

    if (pCrop === crop.toLowerCase() && !parentRowData) {
       parentRowData = pData[i].slice();
    }

    if (pCrop === crop.toLowerCase() && pVar === variety.toLowerCase() && pMode === mode) {
      rowIndex = i + 1;
      break;
    }
  }

  const recDirect = (mode === "direct") ? "Yes" : "No";
  const recTrans = (mode === "transplant") ? "Yes" : "No";

  if (rowIndex < 0) {
    if (parentRowData) {
      parentRowData[5] = variety;
      profileSheet.appendRow(parentRowData);
    } else {
      profileSheet.appendRow([crop]); 
    }
    rowIndex = profileSheet.getLastRow();
  }

  profileSheet.getRange(rowIndex, 1).setValue(crop);
  profileSheet.getRange(rowIndex, 2).setValue("Veg");
  profileSheet.getRange(rowIndex, 6).setValue(variety);
  
  profileSheet.getRange(rowIndex, 12).setValue(recDirect);  
  profileSheet.getRange(rowIndex, 13).setValue(recTrans);   
  profileSheet.getRange(rowIndex, 14).setValue(rowsPerBed); 
  profileSheet.getRange(rowIndex, 15).setValue(spacing);    
  profileSheet.getRange(rowIndex, 16).setValue(traySize);   
  
  profileSheet.getRange(rowIndex, 22).setValue(dtm);         
  profileSheet.getRange(rowIndex, 23).setValue(nurseryDays); 
  profileSheet.getRange(rowIndex, 43).setValue(dtm);         
  profileSheet.getRange(rowIndex, 44).setValue(method);      
  
  return `✅ Scheduled ${crop} & Saved Profile.`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 9: CROP PROFILE WIZARD
// ══════════════════════════════════════════════════════════════════════════════

function openNewCropDialog() {
  const html = HtmlService.createHtmlOutputFromFile('Form_NewCrop')
      .setWidth(450)
      .setHeight(750);
  SpreadsheetApp.getUi().showModalDialog(html, '🥬 Smart Crop Wizard');
}

function getCropTemplate(cropName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('REF_CropProfiles');
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  const matchRow = data.find(r => String(r[0]).trim().toLowerCase() === String(cropName).trim().toLowerCase());

  if (!matchRow) return null;

  return {
    Crop_Name: matchRow[0],
    Primary_Category: matchRow[1],
    Family: matchRow[2],
    Scientific_Name: matchRow[3],
    Color_Hex: matchRow[4],
    Variety_Default: matchRow[5],
    Harvest_Unit: matchRow[6],
    Price_Wholesale: matchRow[7],
    Price_Retail: matchRow[8],
    Yield_Lbs_Per_Ft: matchRow[9],
    Calc_Method: matchRow[10],
    Rec_Direct: matchRow[11],
    Rec_Transplant: matchRow[12],
    Rows_Per_Bed: matchRow[13],
    In_Row_Spacing_In: matchRow[14],
    Tray_Cell_Count: matchRow[15],
    Seeder_Config: matchRow[16],
    Safety_Buffer: matchRow[17],
    DTM_Spring: matchRow[18],
    DTM_Summer: matchRow[19],
    DTM_Fall: matchRow[20],
    DTM_Average: matchRow[21],
    Nursery_Days: matchRow[22],
    Days_To_Pot_Up: matchRow[23],
    Days_To_Harden_Off: matchRow[24],
    Germination_Days: matchRow[25],
    Germ_Temp_F: matchRow[26],
    Cold_Stratify: matchRow[27],
    Germination_Instructions: matchRow[28],
    Hardiness_Zone: matchRow[29],
    Rotation_Group: matchRow[30],
    Common_Pests: matchRow[31],
    Common_Diseases: matchRow[32],
    Storage_Reqs: matchRow[33],
    Temp_Day_Optimum: matchRow[34],
    Temp_Night_Optimum: matchRow[35],
    Soil_Temp_Optimum: matchRow[36],
    Light_Req: matchRow[37],
    Water_Req: matchRow[38],
    pH_Min: matchRow[39],
    pH_Max: matchRow[40],
    Grower_Notes: matchRow[41]
  };
}

function saveNewCropProfile(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('REF_CropProfiles');
  
  if (!sheet) throw new Error("REF_CropProfiles sheet not found!");

  const newRow = [
    data.Crop_Name, data.Primary_Category, data.Family, data.Scientific_Name, data.Color_Hex || "#999999", data.Variety_Default,
    data.Harvest_Unit, data.Price_Wholesale, data.Price_Retail, data.Yield_Lbs_Per_Ft,
    data.Calc_Method, data.Rec_Direct, data.Rec_Transplant, data.Rows_Per_Bed || 1, data.In_Row_Spacing_In || 12, data.Tray_Cell_Count || 72, data.Seeder_Config, data.Safety_Buffer || 0.10,
    data.DTM_Spring, data.DTM_Summer, data.DTM_Fall, data.DTM_Average, data.Nursery_Days, data.Days_To_Pot_Up, data.Days_To_Harden_Off,
    data.Germination_Days, data.Germ_Temp_F, data.Cold_Stratify, data.Germination_Instructions,
    data.Hardiness_Zone, data.Rotation_Group, data.Common_Pests, data.Common_Diseases, data.Storage_Reqs, data.Temp_Day_Optimum, data.Temp_Night_Optimum, data.Soil_Temp_Optimum, data.Light_Req, data.Water_Req, data.pH_Min, data.pH_Max,
    data.Grower_Notes
  ];

  sheet.appendRow(newRow);
  sheet.getRange(2, 1, sheet.getLastRow()-1, sheet.getLastColumn()).sort(1);
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 10: IMPORT SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

function openImportDialog() {
  const html = HtmlService.createHtmlOutputFromFile('Form_ImportStaging')
      .setWidth(500).setHeight(650);
  SpreadsheetApp.getUi().showModalDialog(html, '📦 Universal Import Tool');
}

function quickImportStaging() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stage = ss.getSheetByName('IMPORT_Staging');
  const ui = SpreadsheetApp.getUi();

  if (!stage || stage.getLastRow() < 2) {
    ui.alert("⚠️ Staging is empty.");
    return;
  }

  const headers = stage.getRange(1, 1, 1, stage.getLastColumn()).getValues()[0].map(h => String(h).toLowerCase().trim());

  let map = {};
  let type = "UNKNOWN";

  const CROP_MAP = {
    "crop": "Crop_Name", "name": "Crop_Name", 
    "variety": "Variety_Default", "var": "Variety_Default",
    "family": "Family",
    "category": "Primary_Category",
    "dtm": "DTM_Average", "days": "DTM_Average",
    "spacing": "In_Row_Spacing_In", "space": "In_Row_Spacing_In", "dist": "In_Row_Spacing_In",
    "rows": "Rows_Per_Bed",
    "tray": "Tray_Cell_Count", "cell": "Tray_Cell_Count",
    "yield": "Yield_Lbs_Per_Ft",
    "note": "Grower_Notes"
  };

  const ORDER_MAP = {
    "date": "Date",
    "vendor": "Vendor", "source": "Vendor",
    "order": "Order#", "invoice": "Order#",
    "item": "Item", "product": "Item", "desc": "Item",
    "sku": "SKU", "part": "SKU",
    "qty": "Qty", "quantity": "Qty", "amount": "Qty",
    "unit": "Unit", "size": "Unit",
    "cost": "Cost", "price": "Cost"
  };

  if (headers.some(h => h.includes("crop") || h.includes("spacing") || h.includes("dtm") || h.includes("family"))) {
    type = "CROPS";
    headers.forEach((h, i) => {
      for (let key in CROP_MAP) {
        if (h.includes(key)) map[i] = CROP_MAP[key];
      }
    });
  } 
  else if (headers.some(h => h.includes("sku") || h.includes("order") || h.includes("qty") || h.includes("price"))) {
    type = "ORDERS";
    headers.forEach((h, i) => {
      for (let key in ORDER_MAP) {
        if (h.includes(key)) map[i] = ORDER_MAP[key];
      }
    });
  }

  if (type === "UNKNOWN") {
    ui.alert("❌ Could not detect if this is Crops or Orders.\nPlease ensure headers include 'Crop' or 'SKU'.");
    return;
  }

  const confirm = ui.alert(`Detected: ${type}`, `I found ${Object.keys(map).length} matching columns.\nProceed with import?`, ui.ButtonSet.YES_NO);
  
  if (confirm == ui.Button.YES) {
    let count = 0;
    if (type === "CROPS") count = runCropImport(stage, ss.getSheetByName('REF_CropProfiles'), map);
    else count = runOrderImport(stage, ss.getSheetByName('LOG_Purchases'), map);
    
    ui.alert(`✅ Success! Imported ${count} rows.`);
  }
}

function analyzeStaging() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('IMPORT_Staging');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].filter(String);
  const hString = headers.join(" ").toLowerCase();
  
  let likely = "UNKNOWN";
  if (hString.includes("spacing") || hString.includes("dtm") || hString.includes("family")) likely = "CROPS";
  else if (hString.includes("sku") || hString.includes("qty") || hString.includes("price")) likely = "ORDERS";
  
  return { headers: headers, likelyType: likely };
}

function executeUniversalImport(type, map) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const stage = ss.getSheetByName('IMPORT_Staging');
  if (type === "CROPS") return runCropImport(stage, ss.getSheetByName('REF_CropProfiles'), map);
  else return runOrderImport(stage, ss.getSheetByName('LOG_Purchases'), map);
}

function runCropImport(source, target, map) {
  const rawData = source.getDataRange().getValues();
  rawData.shift(); 
  
  const schema = [
    "Crop_Name", "Primary_Category", "Family", "Scientific_Name", "Color_Hex", "Variety_Default",
    "Harvest_Unit", "Price_Wholesale", "Price_Retail", "Yield_Lbs_Per_Ft",
    "Calc_Method", "Rec_Direct", "Rec_Transplant", "Rows_Per_Bed", "In_Row_Spacing_In", "Tray_Cell_Count", "Seeder_Config", "Safety_Buffer_%",
    "DTM_Spring", "DTM_Summer", "DTM_Fall", "DTM_Average", 
    "Nursery_Days", "Days_To_Pot_Up", "Days_To_Harden_Off",
    "Germination_Days", "Germ_Temp_F", "Cold_Stratify?", "Germination_Instructions",
    "Hardiness_Zone", "Rotation_Group", "Common_Pests", "Common_Diseases", "Storage_Reqs",
    "Temp_Day_Optimum", "Temp_Night_Optimum", "Soil_Temp_Optimum", "Light_Req", "Water_Req", "pH_Min", "pH_Max", "Grower_Notes"
  ];
  
  const output = [];
  for(let row of rawData) {
    let obj = mapRowToObj(row, map);
    if(!obj["Crop_Name"]) continue;
    
    let outRow = schema.map(f => {
      let val = obj[f] || "";
      if (f.includes("Spacing") || f.includes("Days") || f.includes("Rows") || f.includes("DTM")) val = cleanNumber(val);
      return val;
    });
    output.push(outRow);
  }
  
  if(output.length) {
    target.getRange(target.getLastRow()+1, 1, output.length, output[0].length).setValues(output);
    target.getRange(2, 1, target.getLastRow()-1, target.getLastColumn()).sort(1);
  }
  return output.length;
}

function runOrderImport(source, target, map) {
  const rawData = source.getDataRange().getValues();
  rawData.shift(); 
  const output = [];
  const today = new Date();
  
  for(let row of rawData) {
    let obj = mapRowToObj(row, map);
    if(!obj["Item"]) continue; 
    
    const newRow = [
      obj["Date"] || today, obj["Vendor"] || "Import", obj["Order#"] || "",
      obj["Item"], obj["SKU"] || "", obj["Category"] || "Seeds",
      cleanNumber(obj["Qty"]), obj["Unit"] || "", "", obj["Status"] || "Ordered"
    ];
    output.push(newRow);
  }
  if(output.length) target.getRange(target.getLastRow()+1, 1, output.length, 10).setValues(output);
  return output.length;
}

function mapRowToObj(row, map) {
  let obj = {};
  for(let colIndex in map) {
    obj[map[colIndex]] = row[colIndex];
  }
  return obj;
}

function cleanNumber(val) {
  if(!val) return 0;
  if(typeof val === 'number') return val;
  let num = String(val).match(/\d+(\.\d+)?/);
  return num ? Number(num[0]) : 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 11: VISUAL FIELD MAP (GANTT CHART)
// ══════════════════════════════════════════════════════════════════════════════

function generateVisualMap() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const planSheet = ss.getSheetByName("PLANNING_2026");
  const bedSheet = ss.getSheetByName("REF_Beds");
  const profileSheet = ss.getSheetByName("REF_CropProfiles");
  
  if (!planSheet || !bedSheet || !profileSheet) { SpreadsheetApp.getUi().alert("❌ Missing Tabs."); return; }

  let mapSheet = ss.getSheetByName("VISUAL_FieldMap");
  if (mapSheet) ss.deleteSheet(mapSheet);
  mapSheet = ss.insertSheet("VISUAL_FieldMap");
  mapSheet.setTabColor("#6aa84f");

  const year = 2026;
  let headers = ["Bed ID"];
  let startDate = new Date(year, 0, 1);
  let endDate = new Date(year, 11, 31);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    headers.push(new Date(d)); 
  }
  
  mapSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  mapSheet.getRange(1, 2, 1, headers.length - 1).setNumberFormat("M/d");
  mapSheet.setFrozenRows(1);
  mapSheet.setFrozenColumns(1);
  mapSheet.setColumnWidths(2, headers.length - 1, 20);

  const bedData = bedSheet.getRange(2, 1, bedSheet.getLastRow()-1, 1).getValues();
  let bedRowMap = {}; 
  let bedRows = [];
  
  for (let i = 0; i < bedData.length; i++) {
    let bedID = bedData[i][0];
    if (bedID) {
      bedRows.push([bedID]);
      bedRowMap[bedID] = i + 2; 
    }
  }
  mapSheet.getRange(2, 1, bedRows.length, 1).setValues(bedRows);

  const profData = profileSheet.getDataRange().getValues();
  let cropMeta = {};
  
  for (let i = 1; i < profData.length; i++) {
    let name = String(profData[i][0]).toLowerCase().trim();
    cropMeta[name] = {
      color: profData[i][4] || "#cccccc",
      dtm: profData[i][42] || 60
    };
  }

  const planData = planSheet.getDataRange().getValues();
  
  for (let i = 1; i < planData.length; i++) {
    let row = planData[i];
    let crop = row[2];
    let method = String(row[4]).toLowerCase();
    let bedID = row[5];
    
    let fieldStart;
    if (method.includes("transplant") || method.includes("paperpot")) {
      fieldStart = row[13];
    } else {
      fieldStart = row[11];
    }

    if (bedID && fieldStart instanceof Date && bedRowMap[bedID]) {
      let meta = cropMeta[String(crop).toLowerCase().trim()] || {color: "#999999", dtm: 60};
      
      let fieldEnd = row[15];
      if (!(fieldEnd instanceof Date)) {
        fieldEnd = new Date(fieldStart.getTime() + (meta.dtm * 86400000));
      }

      let dayDiff = Math.ceil((fieldStart - startDate) / (1000 * 60 * 60 * 24));
      let duration = Math.ceil((fieldEnd - fieldStart) / (1000 * 60 * 60 * 24));
      
      let colIndex = dayDiff + 2;
      
      if (colIndex >= 2 && duration > 0 && (colIndex + duration) < headers.length) {
        let r = bedRowMap[bedID];
        try {
          let range = mapSheet.getRange(r, colIndex, 1, duration);
          range.setBackground(meta.color);
          
          if (duration > 5) {
            mapSheet.getRange(r, colIndex).setValue(crop).setFontSize(8);
          }
        } catch (e) { console.log("Paint error: " + e); }
      }
    }
  }
  
  SpreadsheetApp.getUi().alert("✅ Visual Field Map Generated.");
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 12: SESSION MANAGER
// ══════════════════════════════════════════════════════════════════════════════

function logSession() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const manualSheet = ss.getSheetByName("SYS_UserManual");
  
  if (!manualSheet) { SpreadsheetApp.getUi().alert("❌ Missing SYS_UserManual"); return; }

  const today = new Date();
  const lastRow = manualSheet.getLastRow() + 1;
  
  manualSheet.getRange(lastRow, 1).setValue(today).setNumberFormat("M/d/yyyy");
  
  const targetCell = manualSheet.getRange(lastRow, 2);
  manualSheet.setActiveRange(targetCell);
  
  SpreadsheetApp.getUi().alert("✅ Log Row Ready.\n\nPaste the AI summary into Cell B" + lastRow);
}

function startSession() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const manualSheet = ss.getSheetByName("SYS_UserManual");
  
  if (!manualSheet || manualSheet.getLastRow() < 2) return;

  const lastRow = manualSheet.getLastRow();
  const nextSteps = manualSheet.getRange(lastRow, 4).getValue();
  const version = manualSheet.getRange(lastRow, 2).getValue();

  const msg = `🚜 WELCOME BACK (v${version})\n\n🎯 CURRENT AGENDA:\n${nextSteps}\n\n(Paste this agenda into the AI Chat to begin)`;
  
  SpreadsheetApp.getUi().alert(msg);
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 13: WEATHER & FROST SAFETY
// ══════════════════════════════════════════════════════════════════════════════

function logDailyWeather() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName("LOG_Weather");
  if (!logSheet) {
    logSheet = ss.insertSheet("LOG_Weather");
    logSheet.appendRow(["Date", "Max_Temp_F", "Min_Temp_F", "Precip_Inch", "Growing_Degree_Days", "Notes"]);
    logSheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#a4c2f4");
  }
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dateStr = Utilities.formatDate(yesterday, "GMT", "yyyy-MM-dd");
  
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${FARM_CONFIG.LAT}&longitude=${FARM_CONFIG.LONG}&start_date=${dateStr}&end_date=${dateStr}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=${encodeURIComponent(FARM_CONFIG.TIMEZONE)}`;
  
  try {
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    if (data.daily) {
      const maxT = data.daily.temperature_2m_max[0];
      const minT = data.daily.temperature_2m_min[0];
      const precip = data.daily.precipitation_sum[0];
      const gdd = Math.max(0, ((maxT + minT) / 2) - 50);
      logSheet.appendRow([yesterday, maxT, minT, precip, gdd.toFixed(1), "Auto-Logged"]);
      console.log(`Weather logged for ${dateStr}`);
    }
  } catch (e) {
    console.error("Weather Fetch Failed: " + e.toString());
  }
}

function updateTrayDropdowns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const traySheet = ss.getSheetByName("REF_Trays");
  const profileSheet = ss.getSheetByName("REF_CropProfiles");
  
  if (traySheet && profileSheet) {
    const trays = traySheet.getRange(2, 1, traySheet.getLastRow()-1, 1).getValues();
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(trays.flat().map(String), true).build();
    profileSheet.getRange("P2:P1000").setDataValidation(rule);
    
    try {
      SpreadsheetApp.getUi().alert("✅ Tray Dropdown Updated (Using Names).");
    } catch (e) {
      console.log("Tray Dropdown Updated (Background Mode).");
    }
  }
}

function runFrostSafetyCheck() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const planSheet = ss.getSheetByName("PLANNING_2026");
  const profileSheet = ss.getSheetByName("REF_CropProfiles");
  const settingsSheet = ss.getSheetByName("REF_Settings");
  
  if (!planSheet || !profileSheet || !settingsSheet) return;

  const settings = settingsSheet.getRange("B2:B3").getValues();
  const springFrost = new Date(settings[0][0]);
  const fallFrost = new Date(settings[1][0]);
  
  if (isNaN(springFrost.getTime()) || isNaN(fallFrost.getTime())) {
    logOrAlert("❌ Error: Check Frost Dates in REF_Settings.");
    return;
  }

  const profData = profileSheet.getDataRange().getValues();
  let hardiness = {};
  for (let i = 1; i < profData.length; i++) {
    let name = profData[i][0];
    let hardy = String(profData[i][15]).toLowerCase().trim();
    hardiness[name] = (hardy === "yes");
  }

  const range = planSheet.getDataRange();
  const data = range.getValues();
  let risks = [];
  
  for (let i = 1; i < data.length; i++) {
    let crop = data[i][2];
    let bed = data[i][5];
    let date = (data[i][10] instanceof Date) ? data[i][10] : data[i][9];
    
    if (crop && date instanceof Date) {
      let isHardy = hardiness[crop];
      
      if (!isHardy && date < springFrost) {
        risks.push(`⚠️ SPRING RISK: ${crop} in ${bed} on ${Utilities.formatDate(date, "GMT", "MM/dd")} (Before ${Utilities.formatDate(springFrost, "GMT", "MM/dd")})`);
        planSheet.getRange(i+1, 1).setBackground("#ea9999");
      }
      
      if (!isHardy && date > springFrost) {
        let daysToFrost = Math.ceil((fallFrost - date) / (1000 * 60 * 60 * 24));
        if (daysToFrost < 50) { 
           risks.push(`⚠️ FALL RISK: ${crop} in ${bed}. Only ${daysToFrost} days left before frost.`);
           planSheet.getRange(i+1, 1).setBackground("#ea9999");
        }
      }
    }
  }

  if (risks.length > 0) {
    logOrAlert(`🚨 FROST WARNINGS FOUND:\n\n${risks.join("\n").substring(0, 1000)}... (Check Red Cells in Plan)`);
  } else {
    logOrAlert("✅ Safe: No frost risks detected.");
  }
}

function logOrAlert(msg) {
  try {
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    console.log(msg);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 14: VENDOR ENRICHMENT
// ══════════════════════════════════════════════════════════════════════════════

function fixAndEnrichVendors() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('REF_Vendors');
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert("❌ REF_Vendors sheet is missing.");
    return;
  }

  const headers = ["Vendor_Name", "Website_URL", "Phone", "Email", "Account_Number", "Notes"];
  if (sheet.getLastRow() < 1 || sheet.getRange(1,1).getValue() !== "Vendor_Name") {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, 6).setValues([headers]).setFontWeight("bold").setBackground("#ead1dc");
  }

  const directory = [
    {
      name: "Johnny's Selected Seeds",
      url: "https://www.johnnyseeds.com",
      phone: "1-877-564-6697",
      email: "service@johnnyseeds.com",
      note: "Primary Seed Supplier"
    },
    {
      name: "High Mowing Organic Seeds",
      url: "https://www.highmowingseeds.com",
      phone: "802-472-6174",
      email: "questions@highmowingseeds.com",
      note: "Organic/Non-GMO"
    },
    {
      name: "Fedco Seeds",
      url: "https://www.fedcoseeds.com",
      phone: "207-426-9900",
      email: "questions@fedcoseeds.com",
      note: "Co-op, Seasonal Shipping"
    },
    {
      name: "Baker Creek Heirloom Seeds",
      url: "https://www.rareseeds.com",
      phone: "417-924-8917",
      email: "seeds@rareseeds.com",
      note: "Heirlooms"
    },
    {
      name: "Osborne Quality Seeds",
      url: "https://www.osborneseed.com",
      phone: "360-424-7333",
      email: "info@osborneseed.com",
      note: "Bulk/Commercial"
    },
    {
      name: "Paperpot Co.",
      url: "https://paperpot.co",
      phone: "N/A",
      email: "hello@paperpot.co",
      note: "Transplanters & Trays"
    },
    {
      name: "Farmer's Friend",
      url: "https://www.farmersfriend.com",
      phone: "931-583-0397",
      email: "support@farmersfriend.com",
      note: "Tools & Tunnels"
    }
  ];

  const lastRow = sheet.getLastRow();
  const existingRange = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 6) : null;
  const existingValues = existingRange ? existingRange.getValues() : [];
  
  let updates = 0;
  let added = 0;

  directory.forEach(vendor => {
    let matchIndex = -1;

    for (let i = 0; i < existingValues.length; i++) {
      let rowName = String(existingValues[i][0]).toLowerCase();
      let dirName = vendor.name.toLowerCase();
      if (rowName.includes(dirName) || dirName.includes(rowName)) {
        matchIndex = i;
        break;
      }
    }

    if (matchIndex > -1) {
      let rowNum = matchIndex + 2;
      if (!existingValues[matchIndex][1]) sheet.getRange(rowNum, 2).setValue(vendor.url);
      if (!existingValues[matchIndex][2]) sheet.getRange(rowNum, 3).setValue(vendor.phone);
      if (!existingValues[matchIndex][3]) sheet.getRange(rowNum, 4).setValue(vendor.email);
      sheet.getRange(rowNum, 1).setValue(vendor.name);
      updates++;
    } else {
      sheet.appendRow([vendor.name, vendor.url, vendor.phone, vendor.email, "", vendor.note]);
      added++;
    }
  });

  sheet.autoResizeColumns(1, 6);
  SpreadsheetApp.getUi().alert(`✅ Vendor Database Updated:\n- Enriched ${updates} existing vendors\n- Added ${added} new vendors`);
}

// ══════════════════════════════════════════════════════════════════════════════
// PART 15: UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function findMyData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('REF_CropProfiles');
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("❌ The sheet is empty (except for headers).");
    return;
  }
  
  const data = sheet.getRange(lastRow, 1, 1, 1).getValue();
  const totalRows = sheet.getMaxRows();
  
  SpreadsheetApp.getUi().alert(
    `🔍 REPORT:\n` +
    `- Total Data Rows Found: ${lastRow}\n` +
    `- Total Sheet Rows: ${totalRows}\n` +
    `- The very last crop in the list is: "${data}"\n\n` +
    `If this isn't what you imported, your data might be sorted alphabetically (check the middle of the list!) or pasted way down at row ${lastRow}.`
  );
}

function createDirectSeedingTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = "Direct Seeding";
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  } else {
    sheet.clear();
  }

  const formula = `=QUERY(PLANNING_2026!A:T, "SELECT L, C, D, F, G, B, T WHERE lower(E) CONTAINS 'direct' AND A <> 'Status' ORDER BY L LABEL L 'Sow Date', C 'Crop', D 'Variety', F 'Target Bed', G 'Feet', B 'Batch ID', T 'Notes'", 1)`;
  sheet.getRange("A1").setFormula(formula);

  sheet.setFrozenRows(1);
  sheet.getRange("A:A").setNumberFormat("M/d/yyyy");
  
  const headerRange = sheet.getRange("A1:G1");
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#d9ead3");
  headerRange.setHorizontalAlignment("center");
  
  sheet.autoResizeColumns(1, 7);
}
 // ========================================
  // SOWING TASK SHEETS
  // ========================================

  function getGreenhouseSowingTasks(params) {
    // Hardcoded for your spreadsheet
    const SHEET_ID = '128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc';
    const PLANNING_TAB = 'PLANNING_2026';
    const PROFILES_TAB = 'REF_CropProfiles';

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const planningSheet = ss.getSheetByName(PLANNING_TAB);

    if (!planningSheet) {
      return { success: false, error: 'Planning sheet not found' };
    }

    // Get planning data
    const planningData = planningSheet.getDataRange().getValues();
    const headers = planningData[0];

    // Find column indices - matching actual PLANNING_2026 columns
    const cols = {
      status: headers.indexOf('STATUS'),
      batchId: headers.indexOf('Batch_ID'),
      crop: headers.indexOf('Crop'),
      variety: headers.indexOf('Variety'),
      plantingMethod: headers.indexOf('Planting_Method'),
      ghSow: headers.indexOf('Plan_GH_Sow'),
      actGhSow: headers.indexOf('Act_GH_Sow'),
      fieldSow: headers.indexOf('Plan_Field_Sow'),
      actFieldSow: headers.indexOf('Act_Field_Sow'),
      transplant: headers.indexOf('Plan_Transplant'),
      actTransplant: headers.indexOf('Act_Transplant'),
      trays: headers.indexOf('Trays_Needed'),
      plantsNeeded: headers.indexOf('Plants_Needed'),
      bed: headers.indexOf('Target_Bed_ID'),
      feetUsed: headers.indexOf('Feet_Used'),
      notes: headers.indexOf('Notes'),
      category: headers.indexOf('Category')
    };

    // Parse date range
    const startDate = params.startDate ? new Date(params.startDate) : new Date();
    const endDate = params.endDate ? new Date(params.endDate) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const categoryFilter = params.category || 'all';

    // Try to get crop profiles for germination info
    let profileMap = {};
    try {
      const profilesSheet = ss.getSheetByName(PROFILES_TAB);
      if (profilesSheet) {
        const profilesData = profilesSheet.getDataRange().getValues();
        const profileHeaders = profilesData[0];
        const cropNameCol = profileHeaders.indexOf('Crop_Name') >= 0 ? profileHeaders.indexOf('Crop_Name') : profileHeaders.indexOf('Crop');
        const categoryCol = profileHeaders.indexOf('Primary_Category') >= 0 ? profileHeaders.indexOf('Primary_Category') : profileHeaders.indexOf('Category');
        const germTempCol = profileHeaders.indexOf('Germ_Temp_F');
        const cellCountCol = profileHeaders.indexOf('Tray_Cell_Count');

        for (let i = 1; i < profilesData.length; i++) {
          const row = profilesData[i];
          const cropName = row[cropNameCol];
          if (cropName) {
            profileMap[cropName] = {
              category: row[categoryCol] || 'Veg',
              germTemp: germTempCol >= 0 ? row[germTempCol] : '',
              defaultCells: cellCountCol >= 0 ? row[cellCountCol] : 128
            };
          }
        }
      }
    } catch (e) {
      // Continue without profiles
    }

    // Process tasks
    const tasks = [];
    const traysBySize = {};

    for (let i = 1; i < planningData.length; i++) {
      const row = planningData[i];

      // Get planting method
      const plantingMethod = cols.plantingMethod >= 0 ? row[cols.plantingMethod] : 'Transplant';
      const isDirectSeed = plantingMethod === 'Direct Seed';

      // Get the appropriate sow date
      let sowDateRaw;
      if (isDirectSeed) {
        sowDateRaw = cols.fieldSow >= 0 ? row[cols.fieldSow] : null;
      } else {
        sowDateRaw = cols.ghSow >= 0 ? row[cols.ghSow] : null;
      }

      if (!sowDateRaw) continue;

      const sowDate = new Date(sowDateRaw);
      if (isNaN(sowDate.getTime())) continue;

      // Date filter
      if (sowDate < startDate || sowDate > endDate) continue;

      const crop = cols.crop >= 0 ? row[cols.crop] : '';
      const profile = profileMap[crop] || {};
      const category = (cols.category >= 0 && row[cols.category]) ? row[cols.category] : (profile.category || 'Veg');

      // Category filter
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'veg-herb' && category === 'Floral') continue;
        if (categoryFilter === 'floral' && category !== 'Floral') continue;
      }

      const variety = cols.variety >= 0 ? row[cols.variety] : '';
      const trays = cols.trays >= 0 ? (parseInt(row[cols.trays]) || 0) : 0;
      const plantsNeeded = cols.plantsNeeded >= 0 ? (parseInt(row[cols.plantsNeeded]) || 0) : 0;
      const feetUsed = cols.feetUsed >= 0 ? (parseInt(row[cols.feetUsed]) || 0) : 0;

      const cellsPerTray = profile.defaultCells || 128;
      const seedsNeeded = plantsNeeded > 0 ? Math.ceil(plantsNeeded * 1.05) : Math.ceil(trays * cellsPerTray * 1.05);

      // Check if already completed
      const isCompleted = isDirectSeed
        ? (cols.actFieldSow >= 0 && row[cols.actFieldSow])
        : (cols.actGhSow >= 0 && row[cols.actGhSow]);

      tasks.push({
        batchId: cols.batchId >= 0 ? row[cols.batchId] : 'ROW-' + i,
        crop: crop,
        variety: variety,
        category: category,
        plantingMethod: plantingMethod,
        sowDate: formatDateSimple(sowDate),
        trays: trays,
        cellsPerTray: cellsPerTray,
        plantsNeeded: plantsNeeded,
        feetUsed: feetUsed,
        seedsNeeded: seedsNeeded,
        bed: cols.bed >= 0 ? row[cols.bed] : '',
        germTemp: profile.germTemp || '',
        notes: cols.notes >= 0 ? row[cols.notes] : '',
        completed: !!isCompleted,
        rowIndex: i + 1
      });

      // Track trays by size
      const size = cellsPerTray + '-cell';
      traysBySize[size] = (traysBySize[size] || 0) + trays;
    }

    // Sort by date
    tasks.sort((a, b) => new Date(a.sowDate) - new Date(b.sowDate));

    return {
      success: true,
      tasks: tasks,
      summary: {
        totalTasks: tasks.length,
        totalTrays: tasks.reduce((sum, t) => sum + t.trays, 0),
        traysBySize: traysBySize,
        dateRange: {
          start: formatDateSimple(startDate),
          end: formatDateSimple(endDate)
        }
      }
    };
  }

  function updateTaskCompletion(params) {
    const SHEET_ID = '128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc';
    const PLANNING_TAB = 'PLANNING_2026';

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(PLANNING_TAB);

    if (!sheet) {
      return { success: false, error: 'Planning sheet not found' };
    }

    const batchId = params.batchId;
    const completed = params.completed === 'true' || params.completed === true;
    const completedBy = params.completedBy || '';

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const batchIdCol = headers.indexOf('Batch_ID');
    const statusCol = headers.indexOf('STATUS');
    const plantingMethodCol = headers.indexOf('Planting_Method');
    const actGhSowCol = headers.indexOf('Act_GH_Sow');
    const actFieldSowCol = headers.indexOf('Act_Field_Sow');

    // Find the row
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][batchIdCol] === batchId) {
        rowIndex = i + 1; // 1-indexed for sheet
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, error: 'Batch not found: ' + batchId };
    }

    const plantingMethod = data[rowIndex - 1][plantingMethodCol];
    const isDirectSeed = plantingMethod === 'Direct Seed';
    const today = new Date();
    const todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');

    if (completed) {
      // Set actual sow date
      if (isDirectSeed && actFieldSowCol >= 0) {
        sheet.getRange(rowIndex, actFieldSowCol + 1).setValue(todayStr);
      } else if (!isDirectSeed && actGhSowCol >= 0) {
        sheet.getRange(rowIndex, actGhSowCol + 1).setValue(todayStr);
      }
      // Update status
      if (statusCol >= 0) {
        sheet.getRange(rowIndex, statusCol + 1).setValue('Sown');
      }
    } else {
      // Clear actual sow date
      if (isDirectSeed && actFieldSowCol >= 0) {
        sheet.getRange(rowIndex, actFieldSowCol + 1).setValue('');
      } else if (!isDirectSeed && actGhSowCol >= 0) {
        sheet.getRange(rowIndex, actGhSowCol + 1).setValue('');
      }
      // Reset status
      if (statusCol >= 0) {
        sheet.getRange(rowIndex, statusCol + 1).setValue('Planned');
      }
    }

    return {
      success: true,
      message: completed ? 'Task marked complete' : 'Task marked incomplete',
      batchId: batchId
    };
  }

  // Helper function for date formatting
  function formatDateSimple(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }
    function testSowingTasks() {
    const result = getGreenhouseSowingTasks({
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      category: 'all'
    });
    Logger.log(JSON.stringify(result, null, 2));
    return result;
  }
 /**
   * Updates a crop profile in REF_CropProfiles
   * Used by Quick Plant Wizard when user modifies grow settings
   */
  function updateCropProfile(params) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('REF_CropProfiles');

    if (!sheet) {
      return {
        success: false,
        error: 'REF_CropProfiles sheet not found'
      };
    }

    const cropName = params.cropName;
    const variety = params.variety || '';

    if (!cropName) {
      return {
        success: false,
        error: 'cropName is required'
      };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Find column indices for updatable fields
    const colIndices = {
      Crop: headers.indexOf('Crop'),
      Variety: headers.indexOf('Variety'),
      DTM: headers.indexOf('DTM'),
      Spacing: headers.indexOf('Spacing'),
      Rows_Per_Bed: headers.indexOf('Rows_Per_Bed'),
      Tray_Cell_Count: headers.indexOf('Tray_Cell_Count'),
      Nursery_Days: headers.indexOf('Nursery_Days'),
      Planting_Method: headers.indexOf('Planting_Method')
    };

    // Find the row matching crop (and variety if provided)
    let targetRow = -1;
    for (let i = 1; i < data.length; i++) {
      const rowCrop = data[i][colIndices.Crop];
      const rowVariety = colIndices.Variety >= 0 ? data[i][colIndices.Variety] : '';

      if (rowCrop === cropName) {
        if (variety && rowVariety === variety) {
          targetRow = i + 1;
          break;
        } else if (!variety) {
          targetRow = i + 1;
          break;
        }
      }
    }

    if (targetRow === -1) {
      return {
        success: false,
        error: `Crop profile not found for: ${cropName}${variety ? ' - ' + variety : ''}`
      };
    }

    // Update only provided fields
    const updates = [];

    if (params.dtm !== undefined && colIndices.DTM >= 0) {
      sheet.getRange(targetRow, colIndices.DTM + 1).setValue(params.dtm);
      updates.push('DTM');
    }
    if (params.spacing !== undefined && colIndices.Spacing >= 0) {
      sheet.getRange(targetRow, colIndices.Spacing + 1).setValue(params.spacing);
      updates.push('Spacing');
    }
    if (params.rowsPerBed !== undefined && colIndices.Rows_Per_Bed >= 0) {
      sheet.getRange(targetRow, colIndices.Rows_Per_Bed + 1).setValue(params.rowsPerBed);
      updates.push('Rows_Per_Bed');
    }
    if (params.trayCellCount !== undefined && colIndices.Tray_Cell_Count >= 0) {
      sheet.getRange(targetRow, colIndices.Tray_Cell_Count + 1).setValue(params.trayCellCount);
      updates.push('Tray_Cell_Count');
    }
    if (params.nurseryDays !== undefined && colIndices.Nursery_Days >= 0) {
      sheet.getRange(targetRow, colIndices.Nursery_Days + 1).setValue(params.nurseryDays);
      updates.push('Nursery_Days');
    }
    if (params.plantingMethod !== undefined && colIndices.Planting_Method >= 0) {
      sheet.getRange(targetRow, colIndices.Planting_Method + 1).setValue(params.plantingMethod);
      updates.push('Planting_Method');
    }

    return {
      success: true,
      message: `Updated ${cropName} profile`,
      updatedFields: updates
    };
  }
function createCropProfile(params) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('REF_CropProfiles');

    if (!sheet) {
      return { success: false, error: 'REF_CropProfiles sheet not found' };
    }

    const cropName = params.cropName;
    const variety = params.variety || '';

    if (!cropName) {
      return { success: false, error: 'cropName is required' };
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    const newRow = headers.map(header => {
      switch (header) {
        case 'Crop': return cropName;
        case 'Variety': return variety;
        case 'Primary_Category': return params.category || 'Veg';
        case 'DTM': return params.dtm || 45;
        case 'Spacing': return params.spacing || 8;
        case 'Rows_Per_Bed': return params.rowsPerBed || 4;
        case 'Tray_Cell_Count': return params.trayCellCount || 128;
        case 'Nursery_Days': return params.nurseryDays || 28;
        case 'Planting_Method': return params.plantingMethod || 'Transplant';
        default: return '';
      }
    });

    sheet.appendRow(newRow);

    return {
      success: true,
      message: 'Created profile for ' + cropName + (variety ? ' - ' + variety : ''),
      profile: {
        Crop: cropName,
        Variety: variety,
        Primary_Category: params.category || 'Veg',
        DTM: params.dtm || 45,
        Spacing: params.spacing || 8,
        Rows_Per_Bed: params.rowsPerBed || 4,
        Tray_Cell_Count: params.trayCellCount || 128,
        Nursery_Days: params.nurseryDays || 28,
        Planting_Method: params.plantingMethod || 'Transplant'
      }
    };
  }
function getCropProfiles() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('REF_CropProfiles');

    if (!sheet) {
      return { success: false, error: 'REF_CropProfiles sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const profiles = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;

      const profile = {};
      headers.forEach((header, index) => {
        profile[header] = row[index];
      });
      profiles.push(profile);
    }

    return {
      success: true,
      data: profiles,
      count: profiles.length
    };
  }

// ═══════════════════════════════════════════════════════════════════════════
// SOIL-TESTS.HTML BACKEND FUNCTIONS
// Complete backend for soil testing, amendments, IPM, fertigation, and compliance
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get or create a sheet by name with proper headers
 */
function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }

  return sheet;
}

/**
 * Generate unique ID for records
 */
function generateId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLIANCE RECORDS - Critical for Organic Certification
// ═══════════════════════════════════════════════════════════════════════════

const COMPLIANCE_HEADERS = ['ID', 'Date', 'Type', 'Product', 'Field', 'Bed', 'Rate', 'Method', 'AppliedBy', 'Notes', 'Weather', 'REI', 'PHI', 'CreatedAt', 'Synced'];

function getComplianceRecords(params) {
  try {
    const sheet = getOrCreateSheet('SOIL_COMPLIANCE_LOG', COMPLIANCE_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return { success: true, data: [], count: 0 };
    }

    const headers = data[0];
    const records = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;

      const record = {};
      headers.forEach((header, index) => {
        let value = row[index];
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        }
        record[header] = value;
      });
      records.push(record);
    }

    // Filter by date range if provided
    let filtered = records;
    if (params && params.startDate) {
      filtered = filtered.filter(r => r.Date >= params.startDate);
    }
    if (params && params.endDate) {
      filtered = filtered.filter(r => r.Date <= params.endDate);
    }

    return {
      success: true,
      data: filtered,
      count: filtered.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveComplianceRecord(data) {
  try {
    const sheet = getOrCreateSheet('SOIL_COMPLIANCE_LOG', COMPLIANCE_HEADERS);

    const id = data.id || generateId('COMP');
    const now = new Date().toISOString();

    const row = [
      id,
      data.date || new Date().toISOString().split('T')[0],
      data.type || '',
      data.product || '',
      data.field || '',
      data.bed || '',
      data.rate || '',
      data.method || '',
      data.appliedBy || '',
      data.notes || '',
      data.weather || '',
      data.rei || '',
      data.phi || '',
      now,
      'true'
    ];

    sheet.appendRow(row);

    return {
      success: true,
      id: id,
      message: 'Compliance record saved',
      timestamp: now
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// IPM SPRAY SCHEDULES - Mandatory Flea Beetle & Leaf Miner Programs
// ═══════════════════════════════════════════════════════════════════════════

const IPM_HEADERS = ['ID', 'CropName', 'SowingDate', 'Protocol', 'ScheduleJSON', 'Status', 'CompletedSprays', 'CreatedAt', 'UpdatedAt'];

function getIPMSchedules(params) {
  try {
    const sheet = getOrCreateSheet('IPM_SPRAY_SCHEDULES', IPM_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return { success: true, data: [], count: 0 };
    }

    const headers = data[0];
    const schedules = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;

      const schedule = {};
      headers.forEach((header, index) => {
        let value = row[index];
        if (header === 'ScheduleJSON' || header === 'CompletedSprays') {
          try { value = JSON.parse(value); } catch(e) { value = []; }
        }
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        }
        schedule[header] = value;
      });
      schedules.push(schedule);
    }

    // Filter by status if provided
    let filtered = schedules;
    if (params && params.status) {
      filtered = filtered.filter(s => s.Status === params.status);
    }

    return {
      success: true,
      data: filtered,
      count: filtered.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveIPMSchedule(data) {
  try {
    const sheet = getOrCreateSheet('IPM_SPRAY_SCHEDULES', IPM_HEADERS);

    const id = data.id || generateId('IPM');
    const now = new Date().toISOString();

    const row = [
      id,
      data.cropName || '',
      data.sowingDate || '',
      data.protocolName || data.protocol || '',
      JSON.stringify(data.schedule || []),
      data.status || 'active',
      JSON.stringify(data.completedSprays || []),
      now,
      now
    ];

    sheet.appendRow(row);

    return {
      success: true,
      id: id,
      message: 'IPM schedule saved',
      timestamp: now
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateIPMSprayStatus(data) {
  try {
    const sheet = getOrCreateSheet('IPM_SPRAY_SCHEDULES', IPM_HEADERS);
    const allData = sheet.getDataRange().getValues();

    // Find the row with matching ID
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] === data.scheduleId) {
        // Update completed sprays
        let completedSprays = [];
        try { completedSprays = JSON.parse(allData[i][6] || '[]'); } catch(e) {}

        completedSprays.push({
          sprayDay: data.sprayDay,
          completedDate: data.completedDate || new Date().toISOString().split('T')[0],
          notes: data.notes || ''
        });

        // Update the row
        sheet.getRange(i + 1, 7).setValue(JSON.stringify(completedSprays));
        sheet.getRange(i + 1, 9).setValue(new Date().toISOString());

        // Check if all sprays completed
        let schedule = [];
        try { schedule = JSON.parse(allData[i][4] || '[]'); } catch(e) {}
        if (completedSprays.length >= schedule.length) {
          sheet.getRange(i + 1, 6).setValue('completed');
        }

        return {
          success: true,
          message: 'Spray status updated',
          completedSprays: completedSprays
        };
      }
    }

    return { success: false, error: 'Schedule not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FERTIGATION DATA - Schedules and Application Logs
// ═══════════════════════════════════════════════════════════════════════════

const FERTIGATION_HEADERS = ['ID', 'Type', 'CropKey', 'Field', 'Greenhouse', 'DataJSON', 'Status', 'CreatedAt', 'UpdatedAt'];

function getFertigationData(params) {
  try {
    const sheet = getOrCreateSheet('FERTIGATION_DATA', FERTIGATION_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return { success: true, data: { schedules: [], logs: [] }, count: 0 };
    }

    const headers = data[0];
    const schedules = [];
    const logs = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;

      const record = {};
      headers.forEach((header, index) => {
        let value = row[index];
        if (header === 'DataJSON') {
          try { value = JSON.parse(value); } catch(e) { value = {}; }
        }
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        }
        record[header] = value;
      });

      if (record.Type === 'schedule') {
        schedules.push(record);
      } else {
        logs.push(record);
      }
    }

    return {
      success: true,
      data: { schedules, logs },
      count: schedules.length + logs.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveFertigationData(data) {
  try {
    const sheet = getOrCreateSheet('FERTIGATION_DATA', FERTIGATION_HEADERS);

    const id = data.id || generateId('FERT');
    const now = new Date().toISOString();

    const row = [
      id,
      data.type || 'log',
      data.cropKey || '',
      data.field || '',
      data.greenhouse || '',
      JSON.stringify(data.data || data),
      data.status || 'active',
      now,
      now
    ];

    sheet.appendRow(row);

    return {
      success: true,
      id: id,
      message: 'Fertigation data saved',
      timestamp: now
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FOLIAR APPLICATIONS - Spray Logs for AEA Program
// ═══════════════════════════════════════════════════════════════════════════

const FOLIAR_HEADERS = ['ID', 'Date', 'Recipe', 'Field', 'Beds', 'Products', 'Rates', 'Weather', 'AppliedBy', 'Notes', 'TankSize', 'Coverage', 'CreatedAt'];

function getFoliarApplications(params) {
  try {
    const sheet = getOrCreateSheet('FOLIAR_APPLICATIONS', FOLIAR_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return { success: true, data: [], count: 0 };
    }

    const headers = data[0];
    const applications = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;

      const app = {};
      headers.forEach((header, index) => {
        let value = row[index];
        if (header === 'Products' || header === 'Rates' || header === 'Beds') {
          try { value = JSON.parse(value); } catch(e) {}
        }
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        }
        app[header] = value;
      });
      applications.push(app);
    }

    return {
      success: true,
      data: applications,
      count: applications.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveFoliarApplication(data) {
  try {
    const sheet = getOrCreateSheet('FOLIAR_APPLICATIONS', FOLIAR_HEADERS);

    const id = data.id || generateId('FOL');
    const now = new Date().toISOString();

    const row = [
      id,
      data.date || new Date().toISOString().split('T')[0],
      data.recipe || '',
      data.field || '',
      JSON.stringify(data.beds || []),
      JSON.stringify(data.products || []),
      JSON.stringify(data.rates || []),
      data.weather || '',
      data.appliedBy || '',
      data.notes || '',
      data.tankSize || '',
      data.coverage || '',
      now
    ];

    sheet.appendRow(row);

    return {
      success: true,
      id: id,
      message: 'Foliar application logged',
      timestamp: now
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SOIL AMENDMENTS - Planned and Applied Amendments
// ═══════════════════════════════════════════════════════════════════════════

const AMENDMENT_HEADERS = ['ID', 'Date', 'Field', 'Zone', 'Products', 'Rates', 'Status', 'PlannedDate', 'AppliedDate', 'AppliedBy', 'Notes', 'Source', 'CreatedAt'];

function getSoilAmendments(params) {
  try {
    const sheet = getOrCreateSheet('SOIL_AMENDMENTS', AMENDMENT_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return { success: true, data: [], count: 0 };
    }

    const headers = data[0];
    const amendments = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;

      const amendment = {};
      headers.forEach((header, index) => {
        let value = row[index];
        if (header === 'Products' || header === 'Rates') {
          try { value = JSON.parse(value); } catch(e) {}
        }
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        }
        amendment[header] = value;
      });
      amendments.push(amendment);
    }

    // Filter by status if provided
    let filtered = amendments;
    if (params && params.status) {
      filtered = filtered.filter(a => a.Status === params.status);
    }
    if (params && params.field) {
      filtered = filtered.filter(a => a.Field === params.field);
    }

    return {
      success: true,
      data: filtered,
      count: filtered.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveSoilAmendment(data) {
  try {
    const sheet = getOrCreateSheet('SOIL_AMENDMENTS', AMENDMENT_HEADERS);

    const id = data.id || generateId('AMD');
    const now = new Date().toISOString();

    const row = [
      id,
      data.date || new Date().toISOString().split('T')[0],
      data.field || '',
      data.zone || '',
      JSON.stringify(data.products || []),
      JSON.stringify(data.rates || []),
      data.status || 'planned',
      data.plannedDate || '',
      data.appliedDate || '',
      data.appliedBy || '',
      data.notes || '',
      data.source || 'manual',
      now
    ];

    sheet.appendRow(row);

    return {
      success: true,
      id: id,
      message: 'Soil amendment saved',
      timestamp: now
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SOIL TESTS - Test Results Storage
// ═══════════════════════════════════════════════════════════════════════════

const SOIL_TEST_HEADERS = ['ID', 'Date', 'Field', 'Zone', 'Lab', 'TestType', 'ResultsJSON', 'Notes', 'RecommendationsJSON', 'CreatedAt'];

function getSoilTests(params) {
  try {
    const sheet = getOrCreateSheet('SOIL_TESTS', SOIL_TEST_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      return { success: true, data: [], count: 0 };
    }

    const headers = data[0];
    const tests = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;

      const test = {};
      headers.forEach((header, index) => {
        let value = row[index];
        if (header === 'ResultsJSON' || header === 'RecommendationsJSON') {
          try { value = JSON.parse(value); } catch(e) { value = {}; }
        }
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        }
        test[header] = value;
      });
      tests.push(test);
    }

    return {
      success: true,
      data: tests,
      count: tests.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function saveSoilTest(data) {
  try {
    const sheet = getOrCreateSheet('SOIL_TESTS', SOIL_TEST_HEADERS);

    const id = data.id || generateId('SOIL');
    const now = new Date().toISOString();

    const row = [
      id,
      data.date || new Date().toISOString().split('T')[0],
      data.field || '',
      data.zone || '',
      data.lab || '',
      data.testType || '',
      JSON.stringify(data.results || {}),
      data.notes || '',
      JSON.stringify(data.recommendations || {}),
      now
    ];

    sheet.appendRow(row);

    return {
      success: true,
      id: id,
      message: 'Soil test saved',
      timestamp: now
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BULK SYNC - Sync all localStorage data to Sheets
// ═══════════════════════════════════════════════════════════════════════════

function bulkSyncSoilData(data) {
  try {
    const results = {
      compliance: 0,
      ipm: 0,
      fertigation: 0,
      foliar: 0,
      amendments: 0,
      errors: []
    };

    // Sync compliance records
    if (data.complianceRecords && data.complianceRecords.length > 0) {
      data.complianceRecords.forEach(record => {
        try {
          saveComplianceRecord(record);
          results.compliance++;
        } catch (e) {
          results.errors.push('Compliance: ' + e.toString());
        }
      });
    }

    // Sync IPM schedules
    if (data.ipmSchedules && data.ipmSchedules.length > 0) {
      data.ipmSchedules.forEach(schedule => {
        try {
          saveIPMSchedule(schedule);
          results.ipm++;
        } catch (e) {
          results.errors.push('IPM: ' + e.toString());
        }
      });
    }

    // Sync fertigation data
    if (data.fertigationData && data.fertigationData.length > 0) {
      data.fertigationData.forEach(fert => {
        try {
          saveFertigationData(fert);
          results.fertigation++;
        } catch (e) {
          results.errors.push('Fertigation: ' + e.toString());
        }
      });
    }

    // Sync foliar applications
    if (data.foliarApplications && data.foliarApplications.length > 0) {
      data.foliarApplications.forEach(app => {
        try {
          saveFoliarApplication(app);
          results.foliar++;
        } catch (e) {
          results.errors.push('Foliar: ' + e.toString());
        }
      });
    }

    // Sync soil amendments
    if (data.soilAmendments && data.soilAmendments.length > 0) {
      data.soilAmendments.forEach(amendment => {
        try {
          saveSoilAmendment(amendment);
          results.amendments++;
        } catch (e) {
          results.errors.push('Amendment: ' + e.toString());
        }
      });
    }

    return {
      success: true,
      results: results,
      totalSynced: results.compliance + results.ipm + results.fertigation + results.foliar + results.amendments,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INVENTORY MANAGEMENT SYSTEM
// Complete inventory tracking with seed-to-sale traceability
// ═══════════════════════════════════════════════════════════════════════════

const INVENTORY_PRODUCTS_HEADERS = [
  'Product_ID', 'Category', 'Product_Name', 'Manufacturer', 'OMRI_Status',
  'Unit', 'Unit_Size', 'Cost_Per_Unit', 'Reorder_Point', 'Current_Qty',
  'Location', 'Lot_Number', 'Expiration', 'Seeds_Per_Pack', 'Germination_Rate',
  'Photo_URL', 'Active', 'Notes', 'CreatedAt', 'UpdatedAt'
];

const INVENTORY_TRANSACTIONS_HEADERS = [
  'Transaction_ID', 'Date', 'Product_ID', 'Product_Name', 'Transaction_Type',
  'Qty', 'Unit', 'Batch_ID', 'Field', 'Location', 'Applied_By',
  'Photo_URL', 'Notes', 'CreatedAt'
];

// Product categories
const PRODUCT_CATEGORIES = ['SEED', 'AMENDMENT', 'FERTILIZER', 'PESTICIDE', 'BIOLOGICAL', 'SUPPLY'];

// Storage locations
const STORAGE_LOCATIONS = ['Barn', 'Greenhouse', 'High Tunnel', 'Field Shed', 'Other'];

/**
 * Get all inventory products with optional filtering
 */
function getInventoryProducts(params) {
  try {
    const sheet = getOrCreateSheet('INVENTORY_PRODUCTS', INVENTORY_PRODUCTS_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, data: [], count: 0 };
    }

    const headers = data[0];
    let products = data.slice(1).map(row => {
      const product = {};
      headers.forEach((header, i) => {
        product[header] = row[i];
      });
      return product;
    }).filter(p => p.Product_ID); // Filter out empty rows

    // Filter by category if specified
    if (params && params.category && params.category !== 'all') {
      products = products.filter(p => p.Category === params.category);
    }

    // Filter by active status
    if (params && params.activeOnly === 'true') {
      products = products.filter(p => p.Active === true || p.Active === 'true' || p.Active === 'TRUE');
    }

    // Filter by location
    if (params && params.location) {
      products = products.filter(p => p.Location === params.location);
    }

    return {
      success: true,
      data: products,
      count: products.length,
      categories: PRODUCT_CATEGORIES,
      locations: STORAGE_LOCATIONS
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get a single product by ID
 */
function getProductById(params) {
  try {
    const sheet = getOrCreateSheet('INVENTORY_PRODUCTS', INVENTORY_PRODUCTS_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1 || !params.id) {
      return { success: false, error: 'Product not found' };
    }

    const headers = data[0];
    const productIdCol = headers.indexOf('Product_ID');

    for (let i = 1; i < data.length; i++) {
      if (data[i][productIdCol] === params.id) {
        const product = {};
        headers.forEach((header, j) => {
          product[header] = data[i][j];
        });
        return { success: true, data: product };
      }
    }

    return { success: false, error: 'Product not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get products below their reorder point
 */
function getLowStockProducts() {
  try {
    const sheet = getOrCreateSheet('INVENTORY_PRODUCTS', INVENTORY_PRODUCTS_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, data: [], count: 0 };
    }

    const headers = data[0];
    const lowStock = [];

    data.slice(1).forEach(row => {
      const product = {};
      headers.forEach((header, i) => {
        product[header] = row[i];
      });

      // Check if current qty is below reorder point
      const currentQty = parseFloat(product.Current_Qty) || 0;
      const reorderPoint = parseFloat(product.Reorder_Point) || 0;
      const isActive = product.Active === true || product.Active === 'true' || product.Active === 'TRUE';

      if (product.Product_ID && isActive && currentQty <= reorderPoint) {
        product.deficit = reorderPoint - currentQty;
        lowStock.push(product);
      }
    });

    // Sort by deficit (most urgent first)
    lowStock.sort((a, b) => b.deficit - a.deficit);

    return {
      success: true,
      data: lowStock,
      count: lowStock.length
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get transaction history with optional filtering
 */
function getTransactionHistory(params) {
  try {
    const sheet = getOrCreateSheet('INVENTORY_TRANSACTIONS', INVENTORY_TRANSACTIONS_HEADERS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, data: [], count: 0 };
    }

    const headers = data[0];
    let transactions = data.slice(1).map(row => {
      const txn = {};
      headers.forEach((header, i) => {
        txn[header] = row[i];
      });
      return txn;
    }).filter(t => t.Transaction_ID);

    // Filter by product ID
    if (params && params.productId) {
      transactions = transactions.filter(t => t.Product_ID === params.productId);
    }

    // Filter by batch ID
    if (params && params.batchId) {
      transactions = transactions.filter(t => t.Batch_ID === params.batchId);
    }

    // Filter by transaction type
    if (params && params.type) {
      transactions = transactions.filter(t => t.Transaction_Type === params.type);
    }

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    return {
      success: true,
      data: transactions,
      count: transactions.length
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Save a new product or update existing
 */
function saveProduct(data) {
  try {
    const sheet = getOrCreateSheet('INVENTORY_PRODUCTS', INVENTORY_PRODUCTS_HEADERS);
    const now = new Date().toISOString();

    // Check if updating existing product
    if (data.Product_ID) {
      const allData = sheet.getDataRange().getValues();
      const headers = allData[0];
      const productIdCol = headers.indexOf('Product_ID');

      for (let i = 1; i < allData.length; i++) {
        if (allData[i][productIdCol] === data.Product_ID) {
          // Update existing row
          const updatedAt = headers.indexOf('UpdatedAt');
          const row = headers.map(header => {
            if (header === 'UpdatedAt') return now;
            return data[header] !== undefined ? data[header] : allData[i][headers.indexOf(header)];
          });
          sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);

          return {
            success: true,
            id: data.Product_ID,
            message: 'Product updated',
            timestamp: now
          };
        }
      }
    }

    // Create new product
    const productId = generateId('PROD');
    const row = INVENTORY_PRODUCTS_HEADERS.map(header => {
      if (header === 'Product_ID') return productId;
      if (header === 'CreatedAt') return now;
      if (header === 'UpdatedAt') return now;
      if (header === 'Active') return data.Active !== undefined ? data.Active : true;
      if (header === 'Current_Qty') return parseFloat(data.Current_Qty) || 0;
      if (header === 'Reorder_Point') return parseFloat(data.Reorder_Point) || 0;
      if (header === 'Cost_Per_Unit') return parseFloat(data.Cost_Per_Unit) || 0;
      return data[header] || '';
    });

    sheet.appendRow(row);

    return {
      success: true,
      id: productId,
      message: 'Product created',
      timestamp: now
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Record an inventory transaction (purchase, application, adjustment, waste, transfer)
 */
function recordTransaction(data) {
  try {
    const txnSheet = getOrCreateSheet('INVENTORY_TRANSACTIONS', INVENTORY_TRANSACTIONS_HEADERS);
    const prodSheet = getOrCreateSheet('INVENTORY_PRODUCTS', INVENTORY_PRODUCTS_HEADERS);
    const now = new Date().toISOString();

    const transactionId = generateId('TXN');

    // Get product info
    const prodData = prodSheet.getDataRange().getValues();
    const prodHeaders = prodData[0];
    const productIdCol = prodHeaders.indexOf('Product_ID');
    const productNameCol = prodHeaders.indexOf('Product_Name');
    const currentQtyCol = prodHeaders.indexOf('Current_Qty');
    const updatedAtCol = prodHeaders.indexOf('UpdatedAt');

    let productName = data.productName || '';
    let productRow = -1;

    // Find the product and get its name
    for (let i = 1; i < prodData.length; i++) {
      if (prodData[i][productIdCol] === data.productId) {
        productName = prodData[i][productNameCol];
        productRow = i + 1; // 1-indexed for sheet
        break;
      }
    }

    // Create transaction record
    const txnRow = INVENTORY_TRANSACTIONS_HEADERS.map(header => {
      if (header === 'Transaction_ID') return transactionId;
      if (header === 'Date') return data.date || now.split('T')[0];
      if (header === 'Product_ID') return data.productId || '';
      if (header === 'Product_Name') return productName;
      if (header === 'Transaction_Type') return data.type || 'ADJUSTMENT';
      if (header === 'Qty') return parseFloat(data.qty) || 0;
      if (header === 'Unit') return data.unit || '';
      if (header === 'Batch_ID') return data.batchId || '';
      if (header === 'Field') return data.field || '';
      if (header === 'Location') return data.location || '';
      if (header === 'Applied_By') return data.appliedBy || '';
      if (header === 'Photo_URL') return data.photoUrl || '';
      if (header === 'Notes') return data.notes || '';
      if (header === 'CreatedAt') return now;
      return '';
    });

    txnSheet.appendRow(txnRow);

    // Update product quantity if product exists
    if (productRow > 0) {
      const currentQty = parseFloat(prodData[productRow - 1][currentQtyCol]) || 0;
      const qtyChange = parseFloat(data.qty) || 0;
      const newQty = currentQty + qtyChange;

      prodSheet.getRange(productRow, currentQtyCol + 1).setValue(newQty);
      prodSheet.getRange(productRow, updatedAtCol + 1).setValue(now);

      // Check if below reorder point
      const reorderCol = prodHeaders.indexOf('Reorder_Point');
      const reorderPoint = parseFloat(prodData[productRow - 1][reorderCol]) || 0;

      return {
        success: true,
        id: transactionId,
        productId: data.productId,
        previousQty: currentQty,
        newQty: newQty,
        belowReorderPoint: newQty <= reorderPoint,
        timestamp: now
      };
    }

    return {
      success: true,
      id: transactionId,
      message: 'Transaction recorded (product not found for qty update)',
      timestamp: now
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Manually adjust inventory quantity
 */
function adjustInventory(data) {
  return recordTransaction({
    productId: data.productId,
    type: 'ADJUSTMENT',
    qty: data.qty,
    notes: data.reason || 'Manual adjustment',
    appliedBy: data.adjustedBy || ''
  });
}

/**
 * Upload a photo to Google Drive and return the URL
 */
function uploadProductPhoto(data) {
  try {
    // Get or create the photos folder
    const folderName = 'TinySeed_Product_Photos';
    let folder;

    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }

    // Decode base64 image data
    const imageData = Utilities.base64Decode(data.base64);
    const blob = Utilities.newBlob(imageData, 'image/jpeg', data.fileName || 'product_' + Date.now() + '.jpg');

    // Create file in folder
    const file = folder.createFile(blob);

    // Set sharing to anyone with link can view
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      url: file.getUrl(),
      fileId: file.getId(),
      fileName: file.getName()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get products formatted for dropdown menus
 */
function getProductsForDropdown(params) {
  try {
    const result = getInventoryProducts({ activeOnly: 'true', category: params ? params.category : null });

    if (!result.success) {
      return result;
    }

    const options = result.data.map(p => ({
      value: p.Product_ID,
      label: p.Product_Name,
      category: p.Category,
      omriStatus: p.OMRI_Status,
      unit: p.Unit,
      currentQty: p.Current_Qty,
      manufacturer: p.Manufacturer,
      location: p.Location
    }));

    return {
      success: true,
      data: options,
      count: options.length
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Deduct inventory when an application is recorded
 * Links the deduction to a specific planting batch
 */
function deductInventoryOnApplication(data) {
  return recordTransaction({
    productId: data.productId,
    type: 'APPLICATION',
    qty: -Math.abs(parseFloat(data.qty) || 0), // Ensure negative
    unit: data.unit,
    batchId: data.batchId,
    field: data.field,
    appliedBy: data.appliedBy,
    notes: data.notes || 'Applied to planting ' + data.batchId
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SALES & FLEET MODULE - IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// SHEET NAMES CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SALES_SHEETS = {
  CUSTOMERS: 'SALES_Customers',
  ORDERS: 'SALES_Orders',
  ORDER_ITEMS: 'SALES_OrderItems',
  CSA_MEMBERS: 'CSA_Members',
  CSA_BOX_CONTENTS: 'CSA_BoxContents',
  DELIVERIES: 'SALES_Deliveries',
  DELIVERY_STOPS: 'SALES_DeliveryStops',
  DRIVERS: 'SALES_Drivers',
  PICK_PACK: 'SALES_PickPack',
  SMS_CAMPAIGNS: 'SALES_SMSCampaigns',
  MAGIC_LINKS: 'SALES_MagicLinks',
  DELIVERY_PROOFS: 'SALES_DeliveryProofs',
  SALES_CYCLES: 'SALES_Cycles',
  MARKET_ITEMS: 'SALES_MarketItems'
};

const FLEET_SHEETS = {
  ASSETS: 'FLEET_Assets',
  USAGE_LOG: 'FLEET_UsageLog',
  FUEL_LOG: 'FLEET_FuelLog',
  MAINTENANCE: 'FLEET_Maintenance'
};

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION - Run this once to create all sheets
// ═══════════════════════════════════════════════════════════════════════════

function initializeSalesAndFleetModule() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ─────────────────────────────────────────────────────────────────────────
  // SALES SHEETS
  // ─────────────────────────────────────────────────────────────────────────

  createSheetIfNotExists(ss, SALES_SHEETS.CUSTOMERS, [
    'Customer_ID', 'Customer_Type', 'Company_Name', 'Contact_Name', 'Email', 'Phone',
    'Address', 'City', 'State', 'Zip', 'Delivery_Instructions',
    'Payment_Terms', 'Price_Tier', 'Is_Active', 'Created_At', 'Last_Order_Date',
    'Total_Orders', 'Total_Spent', 'Notes'
  ], '#3b82f6');

  createSheetIfNotExists(ss, SALES_SHEETS.ORDERS, [
    'Order_ID', 'Order_Date', 'Customer_ID', 'Customer_Name', 'Customer_Type',
    'Delivery_Date', 'Delivery_Window', 'Delivery_Address', 'Status',
    'Subtotal', 'Tax', 'Delivery_Fee', 'Total', 'Payment_Status',
    'Payment_Method', 'Notes', 'Source', 'Created_By', 'Created_At', 'Updated_At'
  ], '#22c55e');

  createSheetIfNotExists(ss, SALES_SHEETS.ORDER_ITEMS, [
    'Item_ID', 'Order_ID', 'Crop_ID', 'Product_Name', 'Variety',
    'Quantity', 'Unit', 'Unit_Price', 'Line_Total', 'Notes'
  ], '#22c55e');

  createSheetIfNotExists(ss, SALES_SHEETS.CSA_MEMBERS, [
    'Member_ID', 'Customer_ID', 'Share_Type', 'Share_Size', 'Season',
    'Start_Date', 'End_Date', 'Total_Weeks', 'Weeks_Remaining',
    'Pickup_Day', 'Pickup_Location', 'Delivery_Address',
    'Customization_Allowed', 'Swap_Credits', 'Vacation_Weeks_Used',
    'Status', 'Payment_Status', 'Amount_Paid', 'Notes'
  ], '#8b5cf6');

  createSheetIfNotExists(ss, SALES_SHEETS.CSA_BOX_CONTENTS, [
    'Box_ID', 'Week_Date', 'Share_Type', 'Crop_ID', 'Product_Name',
    'Variety', 'Quantity', 'Unit', 'Is_Swappable', 'Swap_Options', 'Notes'
  ], '#8b5cf6');

  createSheetIfNotExists(ss, SALES_SHEETS.DELIVERIES, [
    'Route_ID', 'Route_Name', 'Delivery_Date', 'Driver_ID', 'Driver_Name',
    'Status', 'Total_Stops', 'Completed_Stops', 'Est_Miles', 'Est_Duration',
    'Actual_Start', 'Actual_End', 'Notes'
  ], '#f59e0b');

  createSheetIfNotExists(ss, SALES_SHEETS.DELIVERY_STOPS, [
    'Stop_ID', 'Route_ID', 'Stop_Order', 'Order_ID', 'Customer_Name',
    'Address', 'Phone', 'Delivery_Window', 'ETA', 'Status',
    'Arrived_At', 'Completed_At', 'Photo_URL', 'Signature_URL',
    'GPS_Lat', 'GPS_Lng', 'Issue_Type', 'Issue_Notes'
  ], '#f59e0b');

  createSheetIfNotExists(ss, SALES_SHEETS.DRIVERS, [
    'Driver_ID', 'Name', 'PIN', 'Phone', 'Email', 'Vehicle',
    'License_Plate', 'Is_Active', 'Today_Deliveries', 'Week_Deliveries',
    'Total_Deliveries', 'Last_Login'
  ], '#ef4444');

  createSheetIfNotExists(ss, SALES_SHEETS.PICK_PACK, [
    'Pick_ID', 'Delivery_Date', 'Order_ID', 'Customer_Name', 'Customer_Type',
    'Crop_ID', 'Product_Name', 'Quantity', 'Unit', 'Location',
    'Status', 'Picked_By', 'Picked_At', 'Notes'
  ], '#06b6d4');

  createSheetIfNotExists(ss, SALES_SHEETS.SMS_CAMPAIGNS, [
    'Campaign_ID', 'Name', 'Message', 'Audience', 'Audience_Filter',
    'Total_Recipients', 'Sent_Count', 'Status', 'Scheduled_At',
    'Sent_At', 'Created_By', 'Created_At'
  ], '#ec4899');

  createSheetIfNotExists(ss, SALES_SHEETS.MAGIC_LINKS, [
    'Token', 'Customer_ID', 'Email', 'Customer_Type', 'Created_At',
    'Expires_At', 'Used', 'Used_At'
  ], '#64748b');

  createSheetIfNotExists(ss, SALES_SHEETS.DELIVERY_PROOFS, [
    'Proof_ID', 'Stop_ID', 'Order_ID', 'Timestamp', 'Driver_ID',
    'Photo_URL', 'Signature_URL', 'GPS_Lat', 'GPS_Lng', 'Notes'
  ], '#64748b');

  // ─────────────────────────────────────────────────────────────────────────
  // FLEET SHEETS
  // ─────────────────────────────────────────────────────────────────────────

  createSheetIfNotExists(ss, FLEET_SHEETS.ASSETS, [
    'Asset_ID', 'Asset_Name', 'Asset_Type', 'Make', 'Model', 'Year',
    'Serial_Number', 'Fuel_Type', 'Current_Hours', 'Current_Miles',
    'Service_Interval_Hours', 'Last_Service_Hours', 'Hours_Until_Service',
    'Purchase_Date', 'Purchase_Price', 'Depreciation_Per_Hour',
    'Status', 'Location', 'Notes', 'Photo_URL'
  ], '#475569');

  createSheetIfNotExists(ss, FLEET_SHEETS.USAGE_LOG, [
    'Usage_ID', 'Asset_ID', 'Asset_Name', 'Date', 'Task_ID', 'Task_Type',
    'Field', 'Bed_IDs', 'Operator_ID', 'Operator_Name',
    'Start_Hours', 'End_Hours', 'Hours_Used',
    'Fuel_Gallons', 'Fuel_Cost', 'Total_Cost', 'Notes'
  ], '#475569');

  createSheetIfNotExists(ss, FLEET_SHEETS.FUEL_LOG, [
    'Fuel_ID', 'Date', 'Asset_ID', 'Asset_Name', 'Gallons', 'Price_Per_Gallon',
    'Total_Cost', 'Vendor', 'Receipt_Photo', 'Filled_By', 'Notes'
  ], '#f97316');

  createSheetIfNotExists(ss, FLEET_SHEETS.MAINTENANCE, [
    'Maint_ID', 'Date', 'Asset_ID', 'Asset_Name', 'Maint_Type',
    'Description', 'Parts_Used', 'Parts_Cost', 'Labor_Hours', 'Labor_Cost',
    'Total_Cost', 'Performed_By', 'Next_Service_Hours', 'Photo_URL', 'Notes'
  ], '#dc2626');

  // Try to show UI alert if in spreadsheet context, otherwise just log
  try {
    const ui = SpreadsheetApp.getUi();
    ui.alert('Sales & Fleet Module Initialized',
      'All sheets have been created successfully!\n\n' +
      'Sales Sheets: ' + Object.keys(SALES_SHEETS).length + '\n' +
      'Fleet Sheets: ' + Object.keys(FLEET_SHEETS).length,
      ui.ButtonSet.OK);
  } catch (e) {
    Logger.log('Sales & Fleet Module Initialized - ' +
      Object.keys(SALES_SHEETS).length + ' sales sheets, ' +
      Object.keys(FLEET_SHEETS).length + ' fleet sheets created.');
  }

  return {
    success: true,
    message: 'Sales & Fleet Module Initialized',
    salesSheets: Object.keys(SALES_SHEETS).length,
    fleetSheets: Object.keys(FLEET_SHEETS).length
  };
}

function createSheetIfNotExists(ss, name, headers, color) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setBackground(color)
      .setFontColor('white')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
    Logger.log('Created sheet: ' + name);
  }
  return sheet;
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER AUTHENTICATION (Magic Link)
// ═══════════════════════════════════════════════════════════════════════════

function sendCustomerMagicLink(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const customerSheet = ss.getSheetByName(SALES_SHEETS.CUSTOMERS);
    const linkSheet = ss.getSheetByName(SALES_SHEETS.MAGIC_LINKS);

    if (!customerSheet || !linkSheet) {
      return { success: false, error: 'Required sheets not found. Run initializeSalesAndFleetModule() first.' };
    }

    // Find customer by email
    const customerData = customerSheet.getDataRange().getValues();
    const headers = customerData[0];
    const emailCol = headers.indexOf('Email');
    const idCol = headers.indexOf('Customer_ID');
    const typeCol = headers.indexOf('Customer_Type');
    const nameCol = headers.indexOf('Contact_Name');

    let customer = null;
    for (let i = 1; i < customerData.length; i++) {
      if (customerData[i][emailCol] === data.email) {
        customer = {
          id: customerData[i][idCol],
          email: customerData[i][emailCol],
          name: customerData[i][nameCol],
          type: customerData[i][typeCol]
        };
        break;
      }
    }

    if (!customer) {
      return { success: false, error: 'Email not found. Please contact us to set up your account.' };
    }

    // Generate token
    const token = Utilities.getUuid();
    const now = new Date();
    const expires = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

    // Store token
    linkSheet.appendRow([
      token, customer.id, customer.email, customer.type,
      now.toISOString(), expires.toISOString(), false, ''
    ]);

    // Determine portal URL based on customer type
    const portalPath = customer.type === 'CSA' ? 'csa.html' : 'wholesale.html';
    const loginUrl = `${data.baseUrl || ''}${portalPath}?token=${token}&email=${encodeURIComponent(customer.email)}`;

    // Send email
    try {
      MailApp.sendEmail({
        to: customer.email,
        subject: 'Your Tiny Seed Farm Login Link',
        htmlBody: generateMagicLinkEmail(customer.name, loginUrl, customer.type)
      });
    } catch (emailErr) {
      Logger.log('Email error: ' + emailErr.toString());
      // Return token anyway for testing
    }

    return { success: true, message: 'Magic link sent', customerType: customer.type };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function generateMagicLinkEmail(name, url, customerType) {
  const portalName = customerType === 'CSA' ? 'CSA Member Portal' : 'Wholesale Portal';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #22c55e; margin: 0;">Tiny Seed Farm</h1>
        <p style="color: #666; margin: 5px 0;">${portalName}</p>
      </div>
      <p>Hi ${name},</p>
      <p>Click the button below to log in to your account:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${url}" style="display: inline-block; padding: 14px 32px; background: #22c55e; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Log In to ${portalName}
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">This link expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="color: #999; font-size: 12px; text-align: center;">Tiny Seed Farm - "Sort of Cool"</p>
    </div>
  `;
}

function authenticateCustomer(params) {
  return verifyCustomerToken(params);
}

function verifyCustomerToken(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const linkSheet = ss.getSheetByName(SALES_SHEETS.MAGIC_LINKS);
    const customerSheet = ss.getSheetByName(SALES_SHEETS.CUSTOMERS);

    if (!linkSheet || !customerSheet) {
      return { success: false, error: 'Required sheets not found' };
    }

    const linkData = linkSheet.getDataRange().getValues();
    const now = new Date();

    for (let i = 1; i < linkData.length; i++) {
      if (linkData[i][0] === params.token && linkData[i][2] === params.email) {
        // Check if used
        if (linkData[i][6]) {
          return { success: false, error: 'This link has already been used' };
        }

        // Check expiry
        const expires = new Date(linkData[i][5]);
        if (now > expires) {
          return { success: false, error: 'This link has expired' };
        }

        // Mark as used
        linkSheet.getRange(i + 1, 7).setValue(true);
        linkSheet.getRange(i + 1, 8).setValue(now.toISOString());

        // Get full customer details
        const customerId = linkData[i][1];
        const customerType = linkData[i][3];
        const customer = getCustomerById({ customerId: customerId });

        if (!customer.success) {
          return { success: false, error: 'Customer not found' };
        }

        // Check if CSA member
        let csaMembership = null;
        if (customerType === 'CSA') {
          const csaResult = getCSAMembers({ customerId: customerId });
          if (csaResult.success && csaResult.members.length > 0) {
            csaMembership = csaResult.members[0];
          }
        }

        return {
          success: true,
          customer: customer.customer,
          customerType: customerType,
          csaMembership: csaMembership
        };
      }
    }

    return { success: false, error: 'Invalid token' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SALES CUSTOMERS API
// ═══════════════════════════════════════════════════════════════════════════

function getSalesCustomers(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.CUSTOMERS);

    if (!sheet) {
      return { success: false, error: 'Customers sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let customers = [];

    for (let i = 1; i < data.length; i++) {
      let customer = {};
      headers.forEach((h, j) => customer[h] = data[i][j]);

      // Apply filters
      if (params.type && customer.Customer_Type !== params.type) continue;
      if (params.isActive === 'true' && !customer.Is_Active) continue;
      if (params.search) {
        const search = params.search.toLowerCase();
        const searchFields = [customer.Company_Name, customer.Contact_Name, customer.Email].join(' ').toLowerCase();
        if (!searchFields.includes(search)) continue;
      }

      customers.push(customer);
    }

    return { success: true, customers: customers };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getCustomerById(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.CUSTOMERS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === params.customerId) {
        let customer = {};
        headers.forEach((h, j) => customer[h] = data[i][j]);
        return { success: true, customer: customer };
      }
    }

    return { success: false, error: 'Customer not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getCustomerProfile(params) {
  return getCustomerById(params);
}

function createSalesCustomer(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.CUSTOMERS);

    // Check for duplicate email
    const existing = sheet.getDataRange().getValues();
    for (let i = 1; i < existing.length; i++) {
      if (existing[i][4] === data.email) { // Email column
        return { success: false, error: 'Customer with this email already exists' };
      }
    }

    const customerId = 'CUS-' + Date.now();
    const now = new Date().toISOString();

    sheet.appendRow([
      customerId,
      data.customerType || 'Retail',
      data.companyName || '',
      data.contactName,
      data.email,
      data.phone || '',
      data.address || '',
      data.city || '',
      data.state || '',
      data.zip || '',
      data.deliveryInstructions || '',
      data.paymentTerms || 'Due on delivery',
      data.priceTier || 'Standard',
      true, // Is_Active
      now,
      '', // Last_Order_Date
      0, // Total_Orders
      0, // Total_Spent
      data.notes || ''
    ]);

    return { success: true, customerId: customerId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateSalesCustomer(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.CUSTOMERS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.customerId) {
        // Update provided fields
        headers.forEach((h, j) => {
          const key = h.replace(/_/g, '').toLowerCase();
          const dataKey = Object.keys(data).find(k => k.toLowerCase() === key);
          if (dataKey && data[dataKey] !== undefined) {
            sheet.getRange(i + 1, j + 1).setValue(data[dataKey]);
          }
        });
        return { success: true, message: 'Customer updated' };
      }
    }

    return { success: false, error: 'Customer not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateCustomerProfile(data) {
  return updateSalesCustomer(data);
}

// ═══════════════════════════════════════════════════════════════════════════
// SALES ORDERS API
// ═══════════════════════════════════════════════════════════════════════════

function getSalesOrders(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.ORDERS);

    if (!sheet) {
      return { success: false, error: 'Orders sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let orders = [];

    for (let i = 1; i < data.length; i++) {
      let order = {};
      headers.forEach((h, j) => order[h] = data[i][j]);

      // Apply filters
      if (params.status && order.Status !== params.status) continue;
      if (params.customerId && order.Customer_ID !== params.customerId) continue;
      if (params.customerType && order.Customer_Type !== params.customerType) continue;
      if (params.deliveryDate && formatDateStringSales(order.Delivery_Date) !== params.deliveryDate) continue;

      // Get order items
      order.items = getOrderItems(order.Order_ID);
      orders.push(order);
    }

    // Sort by date descending
    orders.sort((a, b) => new Date(b.Order_Date) - new Date(a.Order_Date));

    // Apply limit
    if (params.limit) {
      orders = orders.slice(0, parseInt(params.limit));
    }

    return { success: true, orders: orders };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getOrderById(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.ORDERS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === params.orderId) {
        let order = {};
        headers.forEach((h, j) => order[h] = data[i][j]);
        order.items = getOrderItems(params.orderId);
        return { success: true, order: order };
      }
    }

    return { success: false, error: 'Order not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getCustomerOrders(params) {
  return getSalesOrders({ customerId: params.customerId, limit: params.limit || 50 });
}

function getOrderItems(orderId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SALES_SHEETS.ORDER_ITEMS);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const items = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === orderId) { // Order_ID column
      let item = {};
      headers.forEach((h, j) => item[h] = data[i][j]);
      items.push(item);
    }
  }

  return items;
}

function createSalesOrder(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const orderSheet = ss.getSheetByName(SALES_SHEETS.ORDERS);
    const itemSheet = ss.getSheetByName(SALES_SHEETS.ORDER_ITEMS);

    const orderId = 'ORD-' + Date.now();
    const now = new Date().toISOString();

    // Calculate totals
    let subtotal = 0;
    (data.items || []).forEach(item => {
      subtotal += (item.quantity * item.unitPrice);
    });
    const tax = subtotal * (data.taxRate || 0);
    const deliveryFee = data.deliveryFee || 0;
    const total = subtotal + tax + deliveryFee;

    // Add order
    orderSheet.appendRow([
      orderId,
      now,
      data.customerId,
      data.customerName,
      data.customerType || 'Retail',
      data.deliveryDate,
      data.deliveryWindow || '',
      data.deliveryAddress || '',
      'Pending',
      subtotal,
      tax,
      deliveryFee,
      total,
      'Unpaid',
      data.paymentMethod || '',
      data.notes || '',
      data.source || 'Web',
      data.createdBy || 'System',
      now,
      now
    ]);

    // Add order items
    (data.items || []).forEach(item => {
      const itemId = 'ITM-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
      itemSheet.appendRow([
        itemId,
        orderId,
        item.cropId || '',
        item.productName,
        item.variety || '',
        item.quantity,
        item.unit,
        item.unitPrice,
        item.quantity * item.unitPrice,
        item.notes || ''
      ]);
    });

    // Generate pick list
    generatePickListForOrder(orderId, data);

    // Update customer stats
    updateCustomerOrderStats(data.customerId, total);

    return { success: true, orderId: orderId, total: total };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function submitWholesaleOrder(data) {
  return createSalesOrder({ ...data, customerType: 'Wholesale', source: 'Wholesale Portal' });
}

function submitCSAOrder(data) {
  return createSalesOrder({ ...data, customerType: 'CSA', source: 'CSA Portal' });
}

function updateSalesOrder(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.ORDERS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.orderId) {
        // Update status
        if (data.status) {
          const statusCol = headers.indexOf('Status');
          sheet.getRange(i + 1, statusCol + 1).setValue(data.status);
        }
        // Update payment status
        if (data.paymentStatus) {
          const payCol = headers.indexOf('Payment_Status');
          sheet.getRange(i + 1, payCol + 1).setValue(data.paymentStatus);
        }
        // Update notes
        if (data.notes) {
          const notesCol = headers.indexOf('Notes');
          sheet.getRange(i + 1, notesCol + 1).setValue(data.notes);
        }
        // Update timestamp
        const updatedCol = headers.indexOf('Updated_At');
        sheet.getRange(i + 1, updatedCol + 1).setValue(new Date().toISOString());

        return { success: true, message: 'Order updated' };
      }
    }

    return { success: false, error: 'Order not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function cancelSalesOrder(data) {
  return updateSalesOrder({ orderId: data.orderId, status: 'Cancelled' });
}

function updateCustomerOrderStats(customerId, orderTotal) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.CUSTOMERS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];

    const idCol = headers.indexOf('Customer_ID');
    const lastOrderCol = headers.indexOf('Last_Order_Date');
    const totalOrdersCol = headers.indexOf('Total_Orders');
    const totalSpentCol = headers.indexOf('Total_Spent');

    for (let i = 1; i < values.length; i++) {
      if (values[i][idCol] === customerId) {
        sheet.getRange(i + 1, lastOrderCol + 1).setValue(new Date().toISOString());
        sheet.getRange(i + 1, totalOrdersCol + 1).setValue((values[i][totalOrdersCol] || 0) + 1);
        sheet.getRange(i + 1, totalSpentCol + 1).setValue((values[i][totalSpentCol] || 0) + orderTotal);
        break;
      }
    }
  } catch (error) {
    Logger.log('Error updating customer stats: ' + error.toString());
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTS API (Uses REF_Crops for unified dropdowns)
// ═══════════════════════════════════════════════════════════════════════════

function getWholesaleProducts(params) {
  return getProductsFromCrops('Wholesale', params);
}

function getCSAProducts(params) {
  return getProductsFromCrops('CSA', params);
}

function getProductsFromCrops(priceType, params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('REF_Crops');

    if (!sheet) {
      return { success: false, error: 'REF_Crops sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let products = [];

    // Find column indices
    const cropIdCol = headers.indexOf('Crop_ID');
    const nameCol = headers.indexOf('Crop_Name') !== -1 ? headers.indexOf('Crop_Name') : headers.indexOf('Item_Name');
    const varietyCol = headers.indexOf('Variety');
    const categoryCol = headers.indexOf('Category');
    const unitCol = headers.indexOf('Sales_Unit') !== -1 ? headers.indexOf('Sales_Unit') : headers.indexOf('Unit');
    const wholesalePriceCol = headers.indexOf('Wholesale_Price');
    const retailPriceCol = headers.indexOf('Retail_Price');
    const csaPriceCol = headers.indexOf('CSA_Price') !== -1 ? headers.indexOf('CSA_Price') : wholesalePriceCol;
    const statusCol = headers.indexOf('Status');
    const imageCol = headers.indexOf('Image_URL');

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Skip inactive
      if (statusCol !== -1 && row[statusCol] === 'Inactive') continue;

      // Determine price based on type
      let price = 0;
      if (priceType === 'Wholesale' && wholesalePriceCol !== -1) {
        price = row[wholesalePriceCol];
      } else if (priceType === 'CSA' && csaPriceCol !== -1) {
        price = row[csaPriceCol];
      } else if (retailPriceCol !== -1) {
        price = row[retailPriceCol];
      }

      products.push({
        cropId: cropIdCol !== -1 ? row[cropIdCol] : 'CROP-' + i,
        name: nameCol !== -1 ? row[nameCol] : '',
        variety: varietyCol !== -1 ? row[varietyCol] : '',
        category: categoryCol !== -1 ? row[categoryCol] : '',
        unit: unitCol !== -1 ? row[unitCol] : 'each',
        price: price,
        image: imageCol !== -1 ? row[imageCol] : ''
      });
    }

    // Apply category filter
    if (params && params.category) {
      products = products.filter(p => p.category === params.category);
    }

    return { success: true, products: products };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CSA MEMBERS API
// ═══════════════════════════════════════════════════════════════════════════

function getCSAMembers(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.CSA_MEMBERS);

    if (!sheet) {
      return { success: false, error: 'CSA Members sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let members = [];

    for (let i = 1; i < data.length; i++) {
      let member = {};
      headers.forEach((h, j) => member[h] = data[i][j]);

      // Apply filters
      if (params.customerId && member.Customer_ID !== params.customerId) continue;
      if (params.memberId && member.Member_ID !== params.memberId) continue;
      if (params.status && member.Status !== params.status) continue;
      if (params.season && member.Season !== params.season) continue;

      members.push(member);
    }

    return { success: true, members: members };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getSalesCSAMembers(params) {
  return getCSAMembers(params || {});
}

function createCSAMember(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.CSA_MEMBERS);

    const memberId = 'CSA-' + Date.now();

    sheet.appendRow([
      memberId,
      data.customerId,
      data.shareType || 'Vegetable',
      data.shareSize || 'Regular',
      data.season || new Date().getFullYear().toString(),
      data.startDate,
      data.endDate,
      data.totalWeeks || 20,
      data.totalWeeks || 20, // Weeks remaining starts at total
      data.pickupDay || '',
      data.pickupLocation || '',
      data.deliveryAddress || '',
      data.customizationAllowed !== false,
      data.swapCredits || 3,
      0, // Vacation weeks used
      'Active',
      data.paymentStatus || 'Unpaid',
      data.amountPaid || 0,
      data.notes || ''
    ]);

    return { success: true, memberId: memberId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateCSAMember(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.CSA_MEMBERS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.memberId) {
        // Update provided fields
        if (data.status) {
          const col = headers.indexOf('Status');
          sheet.getRange(i + 1, col + 1).setValue(data.status);
        }
        if (data.weeksRemaining !== undefined) {
          const col = headers.indexOf('Weeks_Remaining');
          sheet.getRange(i + 1, col + 1).setValue(data.weeksRemaining);
        }
        if (data.swapCredits !== undefined) {
          const col = headers.indexOf('Swap_Credits');
          sheet.getRange(i + 1, col + 1).setValue(data.swapCredits);
        }
        if (data.paymentStatus) {
          const col = headers.indexOf('Payment_Status');
          sheet.getRange(i + 1, col + 1).setValue(data.paymentStatus);
        }

        return { success: true, message: 'CSA membership updated' };
      }
    }

    return { success: false, error: 'Member not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getCSABoxContents(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.CSA_BOX_CONTENTS);

    if (!sheet) {
      return { success: false, error: 'CSA Box Contents sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let items = [];

    const weekDate = params.weekDate || getCurrentWeekDateSales();

    for (let i = 1; i < data.length; i++) {
      let item = {};
      headers.forEach((h, j) => item[h] = data[i][j]);

      // Filter by week and share type
      if (formatDateStringSales(item.Week_Date) !== weekDate) continue;
      if (params.shareType && item.Share_Type !== params.shareType) continue;

      items.push(item);
    }

    return { success: true, weekDate: weekDate, items: items };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function customizeCSABox(data) {
  try {
    // Verify member has swap credits
    const memberResult = getCSAMembers({ memberId: data.memberId });
    if (!memberResult.success || memberResult.members.length === 0) {
      return { success: false, error: 'Member not found' };
    }

    const member = memberResult.members[0];
    const swapsNeeded = (data.swaps || []).length;

    if (member.Swap_Credits < swapsNeeded) {
      return { success: false, error: 'Not enough swap credits. You have ' + member.Swap_Credits + ' remaining.' };
    }

    // Record the customization (in production, would create/modify order)
    Logger.log('CSA Box customization: ' + JSON.stringify({
      memberId: data.memberId,
      weekDate: data.weekDate,
      swaps: data.swaps
    }));

    // Deduct swap credits
    updateCSAMember({
      memberId: data.memberId,
      swapCredits: member.Swap_Credits - swapsNeeded
    });

    return { success: true, message: 'Box customized successfully', creditsRemaining: member.Swap_Credits - swapsNeeded };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PICK & PACK API
// ═══════════════════════════════════════════════════════════════════════════

function getPickPackList(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.PICK_PACK);

    if (!sheet) {
      return { success: false, error: 'Pick Pack sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let items = [];

    for (let i = 1; i < data.length; i++) {
      let item = {};
      headers.forEach((h, j) => item[h] = data[i][j]);

      // Apply filters
      if (params.date && formatDateStringSales(item.Delivery_Date) !== params.date) continue;
      if (params.status && item.Status !== params.status) continue;
      if (params.customerType && item.Customer_Type !== params.customerType) continue;

      items.push(item);
    }

    return { success: true, items: items };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function generatePickListForOrder(orderId, orderData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.PICK_PACK);

    (orderData.items || []).forEach(item => {
      const pickId = 'PCK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
      sheet.appendRow([
        pickId,
        orderData.deliveryDate,
        orderId,
        orderData.customerName,
        orderData.customerType || 'Retail',
        item.cropId || '',
        item.productName,
        item.quantity,
        item.unit,
        item.location || '',
        'Pending',
        '', // Picked_By
        '', // Picked_At
        item.notes || ''
      ]);
    });

    return { success: true };
  } catch (error) {
    Logger.log('Error generating pick list: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function completePickPackItem(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.PICK_PACK);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.pickId) {
        const statusCol = headers.indexOf('Status');
        const pickedByCol = headers.indexOf('Picked_By');
        const pickedAtCol = headers.indexOf('Picked_At');
        const notesCol = headers.indexOf('Notes');

        sheet.getRange(i + 1, statusCol + 1).setValue('Picked');
        sheet.getRange(i + 1, pickedByCol + 1).setValue(data.pickedBy);
        sheet.getRange(i + 1, pickedAtCol + 1).setValue(new Date().toISOString());
        if (data.notes) sheet.getRange(i + 1, notesCol + 1).setValue(data.notes);

        return { success: true, message: 'Item marked as picked' };
      }
    }

    return { success: false, error: 'Pick item not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DELIVERY & DRIVER API
// ═══════════════════════════════════════════════════════════════════════════

function getDeliveryRoutes(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.DELIVERIES);

    if (!sheet) {
      return { success: false, error: 'Deliveries sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let routes = [];

    for (let i = 1; i < data.length; i++) {
      let route = {};
      headers.forEach((h, j) => route[h] = data[i][j]);

      // Apply filters
      if (params.date && formatDateStringSales(route.Delivery_Date) !== params.date) continue;
      if (params.driverId && route.Driver_ID !== params.driverId) continue;
      if (params.status && route.Status !== params.status) continue;

      // Get stops
      route.stops = getRouteStops(route.Route_ID);
      routes.push(route);
    }

    return { success: true, routes: routes };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getRouteStops(routeId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SALES_SHEETS.DELIVERY_STOPS);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const stops = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === routeId) { // Route_ID column
      let stop = {};
      headers.forEach((h, j) => stop[h] = data[i][j]);
      stop.items = getOrderItems(stop.Order_ID);
      stops.push(stop);
    }
  }

  stops.sort((a, b) => a.Stop_Order - b.Stop_Order);
  return stops;
}

function getDriverRoute(params) {
  try {
    // Authenticate driver first
    const driverResult = authenticateDriver(params);
    if (!driverResult.success) {
      return driverResult;
    }

    // Get today's route
    const today = formatDateStringSales(new Date());
    const routes = getDeliveryRoutes({ driverId: driverResult.driver.Driver_ID, date: today });

    if (routes.success && routes.routes.length > 0) {
      return { success: true, route: routes.routes[0], driver: driverResult.driver };
    }

    return { success: true, route: null, driver: driverResult.driver, message: 'No route assigned for today' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getDeliveryDrivers(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.DRIVERS);

    if (!sheet) {
      return { success: false, error: 'Drivers sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let drivers = [];

    for (let i = 1; i < data.length; i++) {
      let driver = {};
      headers.forEach((h, j) => {
        if (h !== 'PIN') driver[h] = data[i][j]; // Don't expose PIN
      });

      if (params.activeOnly && !driver.Is_Active) continue;

      drivers.push(driver);
    }

    return { success: true, drivers: drivers };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function authenticateDriver(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.DRIVERS);

    if (!sheet) {
      return { success: false, error: 'Drivers sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const pinCol = headers.indexOf('PIN');

    for (let i = 1; i < data.length; i++) {
      if (data[i][pinCol] === params.pin) {
        let driver = {};
        headers.forEach((h, j) => {
          if (h !== 'PIN') driver[h] = data[i][j];
        });

        // Update last login
        const loginCol = headers.indexOf('Last_Login');
        sheet.getRange(i + 1, loginCol + 1).setValue(new Date().toISOString());

        return { success: true, driver: driver };
      }
    }

    return { success: false, error: 'Invalid PIN' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function createDeliveryRoute(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const routeSheet = ss.getSheetByName(SALES_SHEETS.DELIVERIES);
    const stopsSheet = ss.getSheetByName(SALES_SHEETS.DELIVERY_STOPS);

    const routeId = 'RTE-' + Date.now();

    // Create route
    routeSheet.appendRow([
      routeId,
      data.routeName || 'Route ' + data.deliveryDate,
      data.deliveryDate,
      data.driverId || '',
      data.driverName || '',
      'Pending',
      (data.stops || []).length,
      0, // Completed stops
      data.estMiles || 0,
      data.estDuration || '',
      '', // Actual start
      '', // Actual end
      data.notes || ''
    ]);

    // Create stops
    (data.stops || []).forEach((stop, index) => {
      const stopId = 'STP-' + Date.now() + '-' + index;
      stopsSheet.appendRow([
        stopId,
        routeId,
        index + 1,
        stop.orderId,
        stop.customerName,
        stop.address,
        stop.phone || '',
        stop.deliveryWindow || '',
        stop.eta || '',
        'Pending',
        '', '', '', '', '', '', '', ''
      ]);
    });

    return { success: true, routeId: routeId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function assignDeliveryRoute(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.DELIVERIES);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.routeId) {
        const driverIdCol = headers.indexOf('Driver_ID');
        const driverNameCol = headers.indexOf('Driver_Name');

        sheet.getRange(i + 1, driverIdCol + 1).setValue(data.driverId);
        sheet.getRange(i + 1, driverNameCol + 1).setValue(data.driverName);

        return { success: true, message: 'Driver assigned to route' };
      }
    }

    return { success: false, error: 'Route not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function recordDeliveryProof(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const proofSheet = ss.getSheetByName(SALES_SHEETS.DELIVERY_PROOFS);
    const stopsSheet = ss.getSheetByName(SALES_SHEETS.DELIVERY_STOPS);

    const proofId = 'PRF-' + Date.now();
    const now = new Date().toISOString();

    // Save photos to Drive
    let photoUrl = '';
    let signatureUrl = '';

    if (data.photo) {
      photoUrl = savePhotoToDriveSales(data.photo, 'delivery_' + proofId);
    }
    if (data.signature) {
      signatureUrl = savePhotoToDriveSales(data.signature, 'signature_' + proofId);
    }

    // Record proof
    proofSheet.appendRow([
      proofId,
      data.stopId,
      data.orderId,
      now,
      data.driverId,
      photoUrl,
      signatureUrl,
      data.gpsLat || '',
      data.gpsLng || '',
      data.notes || ''
    ]);

    // Update stop status
    updateDeliveryStopStatus(stopsSheet, data.stopId, 'Delivered', now, photoUrl, signatureUrl, data.gpsLat, data.gpsLng);

    // Update order status
    updateSalesOrder({ orderId: data.orderId, status: 'Delivered' });

    // Update route progress
    if (data.routeId) {
      updateRouteProgress(data.routeId);
    }

    return { success: true, proofId: proofId, photoUrl: photoUrl };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function reportDeliveryIssue(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const stopsSheet = ss.getSheetByName(SALES_SHEETS.DELIVERY_STOPS);

    const now = new Date().toISOString();

    // Save photo if provided
    let photoUrl = '';
    if (data.photo) {
      photoUrl = savePhotoToDriveSales(data.photo, 'issue_' + data.stopId);
    }

    // Update stop with issue
    const values = stopsSheet.getDataRange().getValues();
    const headers = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.stopId) {
        stopsSheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue('Issue');
        stopsSheet.getRange(i + 1, headers.indexOf('Completed_At') + 1).setValue(now);
        stopsSheet.getRange(i + 1, headers.indexOf('Issue_Type') + 1).setValue(data.issueType);
        stopsSheet.getRange(i + 1, headers.indexOf('Issue_Notes') + 1).setValue(data.notes || '');
        if (photoUrl) {
          stopsSheet.getRange(i + 1, headers.indexOf('Photo_URL') + 1).setValue(photoUrl);
        }
        break;
      }
    }

    // Update order status
    const orderStatus = data.issueType === 'not_home' ? 'Delivery Attempted' : 'Issue - ' + data.issueType;
    updateSalesOrder({ orderId: data.orderId, status: orderStatus });

    // Update route progress
    if (data.routeId) {
      updateRouteProgress(data.routeId);
    }

    return { success: true, message: 'Issue reported' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateDeliveryETA(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.DELIVERY_STOPS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.stopId) {
        const etaCol = headers.indexOf('ETA');
        sheet.getRange(i + 1, etaCol + 1).setValue(data.eta);
        return { success: true, message: 'ETA updated' };
      }
    }

    return { success: false, error: 'Stop not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateDeliveryStopStatus(sheet, stopId, status, timestamp, photoUrl, signatureUrl, lat, lng) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === stopId) {
      sheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue(status);
      sheet.getRange(i + 1, headers.indexOf('Completed_At') + 1).setValue(timestamp);
      if (photoUrl) sheet.getRange(i + 1, headers.indexOf('Photo_URL') + 1).setValue(photoUrl);
      if (signatureUrl) sheet.getRange(i + 1, headers.indexOf('Signature_URL') + 1).setValue(signatureUrl);
      if (lat) sheet.getRange(i + 1, headers.indexOf('GPS_Lat') + 1).setValue(lat);
      if (lng) sheet.getRange(i + 1, headers.indexOf('GPS_Lng') + 1).setValue(lng);
      break;
    }
  }
}

function updateRouteProgress(routeId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const routeSheet = ss.getSheetByName(SALES_SHEETS.DELIVERIES);
  const stopsSheet = ss.getSheetByName(SALES_SHEETS.DELIVERY_STOPS);

  // Count completed stops
  const stopsData = stopsSheet.getDataRange().getValues();
  let completed = 0;
  let total = 0;

  for (let i = 1; i < stopsData.length; i++) {
    if (stopsData[i][1] === routeId) {
      total++;
      if (stopsData[i][9] === 'Delivered' || stopsData[i][9] === 'Issue') {
        completed++;
      }
    }
  }

  // Update route
  const routeData = routeSheet.getDataRange().getValues();
  const headers = routeData[0];

  for (let i = 1; i < routeData.length; i++) {
    if (routeData[i][0] === routeId) {
      routeSheet.getRange(i + 1, headers.indexOf('Completed_Stops') + 1).setValue(completed);

      if (completed === total && total > 0) {
        routeSheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue('Completed');
        routeSheet.getRange(i + 1, headers.indexOf('Actual_End') + 1).setValue(new Date().toISOString());
      }
      break;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FLEET MANAGEMENT API
// ═══════════════════════════════════════════════════════════════════════════

function getFleetAssets(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FLEET_SHEETS.ASSETS);

    if (!sheet) {
      return { success: false, error: 'Fleet Assets sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let assets = [];

    for (let i = 1; i < data.length; i++) {
      let asset = {};
      headers.forEach((h, j) => asset[h] = data[i][j]);

      // Apply filters
      if (params.type && asset.Asset_Type !== params.type) continue;
      if (params.status && asset.Status !== params.status) continue;

      // Calculate hours until service
      if (asset.Service_Interval_Hours && asset.Last_Service_Hours) {
        asset.Hours_Until_Service = (asset.Last_Service_Hours + asset.Service_Interval_Hours) - asset.Current_Hours;
      }

      assets.push(asset);
    }

    return { success: true, assets: assets };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getFleetAssetById(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FLEET_SHEETS.ASSETS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === params.assetId) {
        let asset = {};
        headers.forEach((h, j) => asset[h] = data[i][j]);

        // Get usage history
        asset.recentUsage = getFleetUsageLog({ assetId: params.assetId, limit: 10 }).usage || [];

        return { success: true, asset: asset };
      }
    }

    return { success: false, error: 'Asset not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function createFleetAsset(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FLEET_SHEETS.ASSETS);

    const assetId = data.assetType.substring(0, 4).toUpperCase() + '-' + Date.now().toString().slice(-6);

    sheet.appendRow([
      assetId,
      data.assetName,
      data.assetType,
      data.make || '',
      data.model || '',
      data.year || '',
      data.serialNumber || '',
      data.fuelType || 'Diesel',
      data.currentHours || 0,
      data.currentMiles || 0,
      data.serviceIntervalHours || 250,
      data.currentHours || 0, // Last service at current hours
      data.serviceIntervalHours || 250, // Hours until service
      data.purchaseDate || '',
      data.purchasePrice || 0,
      data.depreciationPerHour || 0,
      'Active',
      data.location || '',
      data.notes || '',
      data.photoUrl || ''
    ]);

    return { success: true, assetId: assetId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function updateFleetAsset(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FLEET_SHEETS.ASSETS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.assetId) {
        // Update current hours
        if (data.currentHours !== undefined) {
          sheet.getRange(i + 1, headers.indexOf('Current_Hours') + 1).setValue(data.currentHours);

          // Recalculate hours until service
          const lastService = values[i][headers.indexOf('Last_Service_Hours')];
          const interval = values[i][headers.indexOf('Service_Interval_Hours')];
          const hoursUntil = (lastService + interval) - data.currentHours;
          sheet.getRange(i + 1, headers.indexOf('Hours_Until_Service') + 1).setValue(hoursUntil);
        }

        // Update status
        if (data.status) {
          sheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue(data.status);
        }

        return { success: true, message: 'Asset updated' };
      }
    }

    return { success: false, error: 'Asset not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getFleetUsageLog(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FLEET_SHEETS.USAGE_LOG);

    if (!sheet) {
      return { success: false, error: 'Fleet Usage Log sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let usage = [];

    for (let i = 1; i < data.length; i++) {
      let entry = {};
      headers.forEach((h, j) => entry[h] = data[i][j]);

      // Apply filters
      if (params.assetId && entry.Asset_ID !== params.assetId) continue;
      if (params.taskId && entry.Task_ID !== params.taskId) continue;
      if (params.date && formatDateStringSales(entry.Date) !== params.date) continue;

      usage.push(entry);
    }

    // Sort by date descending
    usage.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    // Apply limit
    if (params.limit) {
      usage = usage.slice(0, parseInt(params.limit));
    }

    return { success: true, usage: usage };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function logFleetUsage(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FLEET_SHEETS.USAGE_LOG);

    const usageId = 'USE-' + Date.now();
    const hoursUsed = (data.endHours || 0) - (data.startHours || 0);

    // Get asset info
    const assetResult = getFleetAssetById({ assetId: data.assetId });
    const assetName = assetResult.success ? assetResult.asset.Asset_Name : '';
    const depreciationPerHour = assetResult.success ? (assetResult.asset.Depreciation_Per_Hour || 0) : 0;

    // Calculate costs
    const fuelCost = (data.fuelGallons || 0) * (data.fuelPricePerGallon || 4.00);
    const depreciationCost = hoursUsed * depreciationPerHour;
    const totalCost = fuelCost + depreciationCost;

    sheet.appendRow([
      usageId,
      data.assetId,
      assetName,
      data.date || new Date().toISOString(),
      data.taskId || '',
      data.taskType || '',
      data.field || '',
      data.bedIds || '',
      data.operatorId || '',
      data.operatorName || '',
      data.startHours || 0,
      data.endHours || 0,
      hoursUsed,
      data.fuelGallons || 0,
      fuelCost,
      totalCost,
      data.notes || ''
    ]);

    // Update asset current hours
    if (data.endHours) {
      updateFleetAsset({ assetId: data.assetId, currentHours: data.endHours });
    }

    return { success: true, usageId: usageId, hoursUsed: hoursUsed, totalCost: totalCost };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function linkUsageToTask(data) {
  // Link fleet usage to a field task for cost rollup
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const usageSheet = ss.getSheetByName(FLEET_SHEETS.USAGE_LOG);

    // Update usage record with task ID
    const values = usageSheet.getDataRange().getValues();
    const headers = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.usageId) {
        usageSheet.getRange(i + 1, headers.indexOf('Task_ID') + 1).setValue(data.taskId);
        return { success: true, message: 'Usage linked to task' };
      }
    }

    return { success: false, error: 'Usage record not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getFleetFuelLog(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FLEET_SHEETS.FUEL_LOG);

    if (!sheet) {
      return { success: false, error: 'Fleet Fuel Log sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let entries = [];

    for (let i = 1; i < data.length; i++) {
      let entry = {};
      headers.forEach((h, j) => entry[h] = data[i][j]);

      // Apply filters
      if (params.assetId && entry.Asset_ID !== params.assetId) continue;

      entries.push(entry);
    }

    // Sort by date descending
    entries.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    return { success: true, fuelLog: entries };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function logFleetFuel(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FLEET_SHEETS.FUEL_LOG);

    const fuelId = 'FUEL-' + Date.now();
    const totalCost = (data.gallons || 0) * (data.pricePerGallon || 0);

    // Get asset name
    const assetResult = getFleetAssetById({ assetId: data.assetId });
    const assetName = assetResult.success ? assetResult.asset.Asset_Name : '';

    sheet.appendRow([
      fuelId,
      data.date || new Date().toISOString(),
      data.assetId,
      assetName,
      data.gallons || 0,
      data.pricePerGallon || 0,
      totalCost,
      data.vendor || '',
      data.receiptPhoto || '',
      data.filledBy || '',
      data.notes || ''
    ]);

    return { success: true, fuelId: fuelId, totalCost: totalCost };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getFleetMaintenanceLog(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FLEET_SHEETS.MAINTENANCE);

    if (!sheet) {
      return { success: false, error: 'Fleet Maintenance sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let entries = [];

    for (let i = 1; i < data.length; i++) {
      let entry = {};
      headers.forEach((h, j) => entry[h] = data[i][j]);

      // Apply filters
      if (params.assetId && entry.Asset_ID !== params.assetId) continue;

      entries.push(entry);
    }

    // Sort by date descending
    entries.sort((a, b) => new Date(b.Date) - new Date(a.Date));

    return { success: true, maintenance: entries };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function logFleetMaintenance(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(FLEET_SHEETS.MAINTENANCE);
    const assetSheet = ss.getSheetByName(FLEET_SHEETS.ASSETS);

    const maintId = 'MAINT-' + Date.now();
    const totalCost = (data.partsCost || 0) + (data.laborCost || 0);

    // Get asset info
    const assetResult = getFleetAssetById({ assetId: data.assetId });
    const assetName = assetResult.success ? assetResult.asset.Asset_Name : '';
    const currentHours = assetResult.success ? assetResult.asset.Current_Hours : 0;

    sheet.appendRow([
      maintId,
      data.date || new Date().toISOString(),
      data.assetId,
      assetName,
      data.maintType || 'Service',
      data.description || '',
      data.partsUsed || '',
      data.partsCost || 0,
      data.laborHours || 0,
      data.laborCost || 0,
      totalCost,
      data.performedBy || '',
      data.nextServiceHours || '',
      data.photoUrl || '',
      data.notes || ''
    ]);

    // Update asset's last service hours
    const assetValues = assetSheet.getDataRange().getValues();
    const assetHeaders = assetValues[0];

    for (let i = 1; i < assetValues.length; i++) {
      if (assetValues[i][0] === data.assetId) {
        assetSheet.getRange(i + 1, assetHeaders.indexOf('Last_Service_Hours') + 1).setValue(currentHours);

        // Recalculate hours until service
        const interval = assetValues[i][assetHeaders.indexOf('Service_Interval_Hours')];
        assetSheet.getRange(i + 1, assetHeaders.indexOf('Hours_Until_Service') + 1).setValue(interval);
        break;
      }
    }

    return { success: true, maintId: maintId, totalCost: totalCost };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getMaintenanceDue(params) {
  try {
    const assets = getFleetAssets({}).assets || [];

    const threshold = params.threshold || 25; // Hours
    const due = assets.filter(a => {
      return a.Hours_Until_Service !== undefined && a.Hours_Until_Service <= threshold;
    });

    return { success: true, assetsDue: due };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getFleetCostReport(params) {
  try {
    const usage = getFleetUsageLog(params).usage || [];
    const fuel = getFleetFuelLog(params).fuelLog || [];
    const maintenance = getFleetMaintenanceLog(params).maintenance || [];

    // Calculate totals
    const usageCost = usage.reduce((sum, u) => sum + (u.Total_Cost || 0), 0);
    const fuelCost = fuel.reduce((sum, f) => sum + (f.Total_Cost || 0), 0);
    const maintCost = maintenance.reduce((sum, m) => sum + (m.Total_Cost || 0), 0);
    const totalHours = usage.reduce((sum, u) => sum + (u.Hours_Used || 0), 0);
    const totalFuelGallons = fuel.reduce((sum, f) => sum + (f.Gallons || 0), 0);

    return {
      success: true,
      report: {
        totalCost: usageCost + fuelCost + maintCost,
        usageCost: usageCost,
        fuelCost: fuelCost,
        maintenanceCost: maintCost,
        totalHours: totalHours,
        totalFuelGallons: totalFuelGallons,
        costPerHour: totalHours > 0 ? (usageCost + fuelCost + maintCost) / totalHours : 0
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getFleetDashboard(params) {
  try {
    const assets = getFleetAssets({}).assets || [];
    const maintenanceDue = getMaintenanceDue({ threshold: 25 }).assetsDue || [];
    const costReport = getFleetCostReport(params).report || {};

    return {
      success: true,
      dashboard: {
        totalAssets: assets.length,
        activeAssets: assets.filter(a => a.Status === 'Active').length,
        maintenanceDueCount: maintenanceDue.length,
        maintenanceDueAssets: maintenanceDue,
        costSummary: costReport
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD & REPORTS
// ═══════════════════════════════════════════════════════════════════════════

function getSalesDashboard(params) {
  try {
    const orders = getSalesOrders({}).orders || [];
    const customers = getSalesCustomers({}).customers || [];

    const today = formatDateStringSales(new Date());
    const weekAgo = formatDateStringSales(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    // Calculate metrics
    const todayOrders = orders.filter(o => formatDateStringSales(o.Order_Date) === today);
    const weekOrders = orders.filter(o => formatDateStringSales(o.Order_Date) >= weekAgo);
    const pendingOrders = orders.filter(o => o.Status === 'Pending');

    const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.Total) || 0), 0);
    const weekRevenue = weekOrders.reduce((sum, o) => sum + (Number(o.Total) || 0), 0);

    // Get delivery stats
    const routes = getDeliveryRoutes({ date: today }).routes || [];
    const todayDeliveries = routes.reduce((sum, r) => sum + (r.Total_Stops || 0), 0);
    const completedDeliveries = routes.reduce((sum, r) => sum + (r.Completed_Stops || 0), 0);

    // Alerts
    const alerts = [];
    if (pendingOrders.length > 0) {
      alerts.push({ type: 'warning', message: pendingOrders.length + ' orders pending processing' });
    }

    const maintenanceDue = getMaintenanceDue({ threshold: 25 }).assetsDue || [];
    if (maintenanceDue.length > 0) {
      alerts.push({ type: 'info', message: maintenanceDue.length + ' equipment needing service soon' });
    }

    return {
      success: true,
      stats: {
        todayOrders: todayOrders.length,
        todayRevenue: todayRevenue,
        weekOrders: weekOrders.length,
        weekRevenue: weekRevenue,
        pendingOrders: pendingOrders.length,
        totalCustomers: customers.length,
        wholesaleCustomers: customers.filter(c => c.Customer_Type === 'Wholesale').length,
        csaMembers: customers.filter(c => c.Customer_Type === 'CSA').length,
        todayDeliveries: todayDeliveries,
        completedDeliveries: completedDeliveries
      },
      recentOrders: orders.slice(0, 10),
      alerts: alerts
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getSalesReports(params) {
  try {
    const orders = getSalesOrders({}).orders || [];

    // Filter by date range
    let filtered = orders;
    if (params.startDate) {
      filtered = filtered.filter(o => formatDateStringSales(o.Order_Date) >= params.startDate);
    }
    if (params.endDate) {
      filtered = filtered.filter(o => formatDateStringSales(o.Order_Date) <= params.endDate);
    }

    // Calculate totals
    const totalRevenue = filtered.reduce((sum, o) => sum + (Number(o.Total) || 0), 0);
    const totalOrders = filtered.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Group by customer type
    const byCustomerType = {};
    filtered.forEach(o => {
      const type = o.Customer_Type || 'Other';
      if (!byCustomerType[type]) {
        byCustomerType[type] = { count: 0, revenue: 0 };
      }
      byCustomerType[type].count++;
      byCustomerType[type].revenue += Number(o.Total) || 0;
    });

    // Group by date
    const byDate = {};
    filtered.forEach(o => {
      const date = formatDateStringSales(o.Order_Date);
      if (!byDate[date]) {
        byDate[date] = { count: 0, revenue: 0 };
      }
      byDate[date].count++;
      byDate[date].revenue += Number(o.Total) || 0;
    });

    return {
      success: true,
      summary: { totalRevenue, totalOrders, avgOrderValue },
      byCustomerType: byCustomerType,
      byDate: Object.entries(byDate).map(([date, data]) => ({ date, ...data })).sort((a, b) => a.date.localeCompare(b.date))
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SMS CAMPAIGNS
// ═══════════════════════════════════════════════════════════════════════════

function getSMSCampaigns(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.SMS_CAMPAIGNS);

    if (!sheet) {
      return { success: false, error: 'SMS Campaigns sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let campaigns = [];

    for (let i = 1; i < data.length; i++) {
      let campaign = {};
      headers.forEach((h, j) => campaign[h] = data[i][j]);

      if (params.status && campaign.Status !== params.status) continue;

      campaigns.push(campaign);
    }

    campaigns.sort((a, b) => new Date(b.Created_At) - new Date(a.Created_At));

    return { success: true, campaigns: campaigns };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function createSMSCampaign(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.SMS_CAMPAIGNS);

    const campaignId = 'SMS-' + Date.now();
    const now = new Date().toISOString();

    // Count recipients
    const recipientCount = getAudienceCount(data.audience, data.audienceFilter);

    sheet.appendRow([
      campaignId,
      data.name,
      data.message,
      data.audience,
      data.audienceFilter || '',
      recipientCount,
      0, // Sent count
      data.scheduledAt ? 'Scheduled' : 'Draft',
      data.scheduledAt || '',
      '',
      data.createdBy || 'System',
      now
    ]);

    return { success: true, campaignId: campaignId, recipientCount: recipientCount };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function sendSMSCampaign(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SALES_SHEETS.SMS_CAMPAIGNS);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.campaignId) {
        const audience = values[i][headers.indexOf('Audience')];
        const audienceFilter = values[i][headers.indexOf('Audience_Filter')];
        const message = values[i][headers.indexOf('Message')];

        // Get recipients
        const recipients = getAudienceRecipients(audience, audienceFilter);

        // In production, integrate with Twilio here
        let sentCount = 0;
        recipients.forEach(r => {
          // UrlFetchApp.fetch(TWILIO_URL, {...})
          Logger.log('Would send SMS to: ' + r.phone + ' - ' + message);
          sentCount++;
        });

        // Update campaign
        sheet.getRange(i + 1, headers.indexOf('Sent_Count') + 1).setValue(sentCount);
        sheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue('Sent');
        sheet.getRange(i + 1, headers.indexOf('Sent_At') + 1).setValue(new Date().toISOString());

        return { success: true, sentCount: sentCount };
      }
    }

    return { success: false, error: 'Campaign not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getAudienceCount(audience, filter) {
  const customers = getSalesCustomers({}).customers || [];
  return filterAudience(customers, audience, filter).length;
}

function getAudienceRecipients(audience, filter) {
  const customers = getSalesCustomers({}).customers || [];
  return filterAudience(customers, audience, filter).map(c => ({
    phone: c.Phone,
    name: c.Contact_Name
  }));
}

function filterAudience(customers, audience, filter) {
  let filtered = customers.filter(c => c.Phone && c.Is_Active);

  switch (audience) {
    case 'wholesale':
      filtered = filtered.filter(c => c.Customer_Type === 'Wholesale');
      break;
    case 'csa':
      filtered = filtered.filter(c => c.Customer_Type === 'CSA');
      break;
    case 'retail':
      filtered = filtered.filter(c => c.Customer_Type === 'Retail');
      break;
    // 'all' returns all active customers with phone
  }

  return filtered;
}

// ═══════════════════════════════════════════════════════════════════════════
// SALES MODULE UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function formatDateStringSales(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

function getCurrentWeekDateSales() {
  const now = new Date();
  // Get Monday of current week
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return formatDateStringSales(monday);
}

function savePhotoToDriveSales(base64Data, filename) {
  try {
    let folder;
    const folders = DriveApp.getFoldersByName('TinySeed_Photos');
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder('TinySeed_Photos');
    }

    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data.split(',')[1]),
      'image/jpeg',
      filename + '.jpg'
    );

    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return file.getUrl();
  } catch (error) {
    Logger.log('Error saving photo: ' + error.toString());
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MENU EXTENSION - Add to onOpen()
// ═══════════════════════════════════════════════════════════════════════════

/*
  Add this submenu to the existing onOpen() function:

  .addSubMenu(ui.createMenu('Sales & Fleet')
    .addItem('Initialize Sales & Fleet Module', 'initializeSalesAndFleetModule')
    .addSeparator()
    .addItem('View Sales Dashboard', 'viewSalesDashboard')
    .addItem('View Fleet Dashboard', 'viewFleetDashboard'))
*/

function viewSalesDashboard() {
  const dashboard = getSalesDashboard({});
  const ui = SpreadsheetApp.getUi();

  if (dashboard.success) {
    const stats = dashboard.stats;
    ui.alert('Sales Dashboard',
      'Today\'s Orders: ' + stats.todayOrders + '\n' +
      'Today\'s Revenue: $' + stats.todayRevenue.toFixed(2) + '\n' +
      'Pending Orders: ' + stats.pendingOrders + '\n' +
      'Total Customers: ' + stats.totalCustomers + '\n' +
      'Deliveries Today: ' + stats.completedDeliveries + '/' + stats.todayDeliveries,
      ui.ButtonSet.OK);
  } else {
    ui.alert('Error', dashboard.error, ui.ButtonSet.OK);
  }
}

function viewFleetDashboard() {
  const dashboard = getFleetDashboard({});
  const ui = SpreadsheetApp.getUi();

  if (dashboard.success) {
    const d = dashboard.dashboard;
    ui.alert('Fleet Dashboard',
      'Total Assets: ' + d.totalAssets + '\n' +
      'Active Assets: ' + d.activeAssets + '\n' +
      'Maintenance Due: ' + d.maintenanceDueCount + '\n' +
      'Total Cost (Period): $' + (d.costSummary.totalCost || 0).toFixed(2),
      ui.ButtonSet.OK);
  } else {
    ui.alert('Error', dashboard.error, ui.ButtonSet.OK);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LABEL GENERATION & SALES CYCLES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get market sign items for a given date
 * These are products available at the farmer's market with prices
 */
function getMarketSignItems(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // First try dedicated market items sheet
    let sheet = ss.getSheetByName(SALES_SHEETS.MARKET_ITEMS);

    if (sheet) {
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      let items = [];

      for (let i = 1; i < data.length; i++) {
        let item = {};
        headers.forEach((h, j) => item[h] = data[i][j]);

        // Filter active items only (market items show current prices, not date-specific)
        if (item.Is_Active === false) continue;

        items.push({
          id: item.Item_ID || i,
          name: item.Item_Name || item.Product_Name || '',
          variety: item.Variety || '',
          price: Number(item.Price) || 0,
          unit: item.Unit || '/each'
        });
      }

      return { success: true, items: items };
    }

    // Fallback: Get items from inventory/products with market prices
    const invSheet = ss.getSheetByName('INV_Products');
    if (invSheet) {
      const data = invSheet.getDataRange().getValues();
      const headers = data[0];
      let items = [];

      for (let i = 1; i < data.length; i++) {
        let product = {};
        headers.forEach((h, j) => product[h] = data[i][j]);

        // Only include items with retail/market prices
        if (product.Retail_Price && Number(product.Retail_Price) > 0) {
          items.push({
            id: product.Product_ID || i,
            name: product.Product_Name || '',
            variety: product.Variety || '',
            price: Number(product.Retail_Price) || 0,
            unit: product.Unit ? '/' + product.Unit : '/each'
          });
        }
      }

      return { success: true, items: items };
    }

    // If no sheet found, return empty with instructions
    return {
      success: true,
      items: [],
      message: 'No market items sheet found. Create SALES_MarketItems sheet or add items manually.'
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get orders formatted for label printing
 * Groups orders by customer type (CSA vs Wholesale)
 */
function getOrdersForLabels(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersSheet = ss.getSheetByName(SALES_SHEETS.ORDERS);
    const itemsSheet = ss.getSheetByName(SALES_SHEETS.ORDER_ITEMS);

    if (!ordersSheet) {
      return { success: false, error: 'Orders sheet not found' };
    }

    // Get all orders
    const ordersData = ordersSheet.getDataRange().getValues();
    const ordersHeaders = ordersData[0];

    // Get all order items
    let orderItemsMap = {};
    if (itemsSheet) {
      const itemsData = itemsSheet.getDataRange().getValues();
      const itemsHeaders = itemsData[0];

      for (let i = 1; i < itemsData.length; i++) {
        let item = {};
        itemsHeaders.forEach((h, j) => item[h] = itemsData[i][j]);

        const orderId = item.Order_ID;
        if (!orderItemsMap[orderId]) {
          orderItemsMap[orderId] = [];
        }
        orderItemsMap[orderId].push({
          productName: item.Product_Name || item.Crop || '',
          variety: item.Variety || '',
          quantity: item.Quantity || 1,
          unit: item.Unit || 'each'
        });
      }
    }

    // Process orders
    let csaOrders = [];
    let wholesaleOrders = [];

    for (let i = 1; i < ordersData.length; i++) {
      let order = {};
      ordersHeaders.forEach((h, j) => order[h] = ordersData[i][j]);

      // Filter by delivery date if provided
      if (params.date) {
        const orderDate = formatDateStringSales(order.Delivery_Date);
        if (orderDate !== params.date) continue;
      }

      // Skip cancelled/completed orders for label printing
      if (order.Status === 'Cancelled' || order.Status === 'Delivered') continue;

      const orderLabel = {
        orderId: order.Order_ID,
        customerName: order.Customer_Name || 'Unknown',
        customerType: order.Customer_Type || 'Retail',
        deliveryDate: order.Delivery_Date,
        items: orderItemsMap[order.Order_ID] || []
      };

      // Categorize by customer type
      if (order.Customer_Type === 'CSA') {
        csaOrders.push(orderLabel);
      } else if (order.Customer_Type === 'Wholesale') {
        wholesaleOrders.push(orderLabel);
      }
    }

    // Sort by customer name
    csaOrders.sort((a, b) => a.customerName.localeCompare(b.customerName));
    wholesaleOrders.sort((a, b) => a.customerName.localeCompare(b.customerName));

    return {
      success: true,
      csaOrders: csaOrders,
      wholesaleOrders: wholesaleOrders,
      totalCSA: csaOrders.length,
      totalWholesale: wholesaleOrders.length
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get sales cycles (Monday/Thursday harvest schedules)
 */
function getSalesCycles(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SALES_SHEETS.SALES_CYCLES);

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(SALES_SHEETS.SALES_CYCLES);
      sheet.setTabColor('#9333ea');
      sheet.appendRow([
        'Cycle_ID', 'Cycle_Name', 'Harvest_Day', 'Order_Cutoff_Day',
        'Order_Cutoff_Time', 'Status', 'Week_Of', 'Total_Orders',
        'Total_Revenue', 'Created_At', 'Closed_At'
      ]);
      sheet.getRange(1, 1, 1, 11).setFontWeight('bold').setBackground('#9333ea').setFontColor('#ffffff');

      // Add default Monday/Thursday cycles
      const now = new Date();
      sheet.appendRow([
        'CYCLE-MON', 'Monday Harvest', 'Monday', 'Sunday', '6:00 PM',
        'Active', getWeekOf(now), 0, 0, now.toISOString(), ''
      ]);
      sheet.appendRow([
        'CYCLE-THU', 'Thursday Harvest', 'Thursday', 'Wednesday', '6:00 PM',
        'Active', getWeekOf(now), 0, 0, now.toISOString(), ''
      ]);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let cycles = [];

    for (let i = 1; i < data.length; i++) {
      let cycle = {};
      headers.forEach((h, j) => cycle[h] = data[i][j]);

      if (params.status && cycle.Status !== params.status) continue;

      cycles.push(cycle);
    }

    return { success: true, cycles: cycles };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Close a sales cycle - generates pick/pack lists and prepares for harvest
 */
function closeSalesCycle(params) {
  try {
    const cycleId = params.cycleId;
    if (!cycleId) {
      return { success: false, error: 'Cycle ID required' };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const cycleSheet = ss.getSheetByName(SALES_SHEETS.SALES_CYCLES);

    if (!cycleSheet) {
      return { success: false, error: 'Sales cycles sheet not found' };
    }

    // Find and update the cycle
    const cycleData = cycleSheet.getDataRange().getValues();
    const headers = cycleData[0];
    let cycleRow = -1;
    let cycle = {};

    for (let i = 1; i < cycleData.length; i++) {
      if (cycleData[i][0] === cycleId) {
        cycleRow = i + 1;
        headers.forEach((h, j) => cycle[h] = cycleData[i][j]);
        break;
      }
    }

    if (cycleRow === -1) {
      return { success: false, error: 'Cycle not found' };
    }

    // Get all pending orders for this cycle's delivery day
    const ordersResult = getOrdersForLabels({ date: params.deliveryDate });
    if (!ordersResult.success) {
      return ordersResult;
    }

    const totalOrders = ordersResult.totalCSA + ordersResult.totalWholesale;

    // Update cycle status
    const statusCol = headers.indexOf('Status') + 1;
    const closedAtCol = headers.indexOf('Closed_At') + 1;
    const totalOrdersCol = headers.indexOf('Total_Orders') + 1;

    cycleSheet.getRange(cycleRow, statusCol).setValue('Closed');
    cycleSheet.getRange(cycleRow, closedAtCol).setValue(new Date().toISOString());
    cycleSheet.getRange(cycleRow, totalOrdersCol).setValue(totalOrders);

    // Generate consolidated pick list
    const pickPackResult = generateConsolidatedPickList(params.deliveryDate);

    return {
      success: true,
      message: 'Sales cycle closed successfully',
      cycleId: cycleId,
      totalOrders: totalOrders,
      csaOrders: ordersResult.totalCSA,
      wholesaleOrders: ordersResult.totalWholesale,
      pickListGenerated: pickPackResult.success
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Generate consolidated pick list for a delivery date
 */
function generateConsolidatedPickList(deliveryDate) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ordersResult = getOrdersForLabels({ date: deliveryDate });

    if (!ordersResult.success) {
      return ordersResult;
    }

    // Combine all orders
    const allOrders = [...ordersResult.csaOrders, ...ordersResult.wholesaleOrders];

    // Aggregate items across all orders
    const itemTotals = {};

    allOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const key = `${item.productName}|${item.variety}|${item.unit}`;
        if (!itemTotals[key]) {
          itemTotals[key] = {
            productName: item.productName,
            variety: item.variety,
            unit: item.unit,
            totalQuantity: 0,
            orderCount: 0
          };
        }
        itemTotals[key].totalQuantity += Number(item.quantity) || 0;
        itemTotals[key].orderCount++;
      });
    });

    // Create or update pick list sheet
    let pickSheet = ss.getSheetByName(SALES_SHEETS.PICK_PACK);

    // Add consolidated summary items
    Object.values(itemTotals).forEach(item => {
      const pickId = 'PCK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
      pickSheet.appendRow([
        pickId,
        deliveryDate,
        'CONSOLIDATED',
        'All Orders',
        'Mixed',
        '',
        item.productName + (item.variety ? ' - ' + item.variety : ''),
        item.totalQuantity,
        item.unit,
        '',
        'Pending',
        '',
        '',
        `Total from ${item.orderCount} orders`
      ]);
    });

    return {
      success: true,
      itemCount: Object.keys(itemTotals).length,
      totalQuantity: Object.values(itemTotals).reduce((sum, i) => sum + i.totalQuantity, 0)
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Helper: Get week identifier for a date
 */
function getWeekOf(date) {
  const d = new Date(date);
  const dayNum = d.getDay();
  const startOfWeek = new Date(d);
  startOfWeek.setDate(d.getDate() - dayNum);
  return startOfWeek.toISOString().split('T')[0];
}

/**
 * Initialize the market items sheet with headers
 */
function initializeMarketItemsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SALES_SHEETS.MARKET_ITEMS);

  if (!sheet) {
    sheet = ss.insertSheet(SALES_SHEETS.MARKET_ITEMS);
    sheet.setTabColor('#f59e0b');
    sheet.appendRow([
      'Item_ID', 'Date', 'Item_Name', 'Variety', 'Price', 'Unit',
      'Category', 'Is_Active', 'Display_Order', 'Notes'
    ]);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#f59e0b').setFontColor('#000000');

    // Add sample items
    const today = new Date().toISOString().split('T')[0];
    const sampleItems = [
      ['MKT-001', today, 'Tomatoes', 'Cherokee Purple', 5.00, '/lb', 'Vegetables', true, 1, ''],
      ['MKT-002', today, 'Lettuce', 'Butterhead', 4.00, '/head', 'Greens', true, 2, ''],
      ['MKT-003', today, 'Kale', 'Lacinato', 4.00, '/bunch', 'Greens', true, 3, ''],
      ['MKT-004', today, 'Carrots', 'Nantes', 3.00, '/bunch', 'Vegetables', true, 4, ''],
      ['MKT-005', today, 'Peppers', 'Mixed Bell', 6.00, '/lb', 'Vegetables', true, 5, ''],
      ['MKT-006', today, 'Zucchini', 'Black Beauty', 3.00, '/lb', 'Vegetables', true, 6, ''],
      ['MKT-007', today, 'Cucumbers', 'Marketmore', 2.00, '/each', 'Vegetables', true, 7, ''],
      ['MKT-008', today, 'Basil', 'Genovese', 4.00, '/bunch', 'Herbs', true, 8, '']
    ];

    sampleItems.forEach(item => sheet.appendRow(item));

    // Format
    sheet.autoResizeColumns(1, 10);
  }

  return { success: true, message: 'Market items sheet initialized' };
}

