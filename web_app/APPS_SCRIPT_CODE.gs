/**
 * TINY SEED OS - GOOGLE APPS SCRIPT API
 * =====================================
 * Copy this entire file into your Google Apps Script editor
 * (Extensions > Apps Script in your Google Sheet)
 *
 * After pasting, click Deploy > New Deployment > Web App
 * - Execute as: Me
 * - Who has access: Anyone
 *
 * Copy the deployment URL and update it in all HTML files
 */

// ========================================
// CONFIGURATION - UPDATE THESE VALUES
// ========================================

const CONFIG = {
  // Your Production Database Sheet ID
  PRODUCTION_SHEET_ID: '128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc',

  // Your Sales Database Sheet ID
  SALES_SHEET_ID: '1S7FNi11NItqeaWol_e6TUehQ9JwFFf0pgPj6G0DlYf4',

  // Tab Names in your Production Sheet
  TABS: {
    PLANNING: 'PLANNING_2026',
    MASTER_LOG: 'MASTER_LOG',
    CROP_PROFILES: 'REF_CropProfiles',  // Actual tab name in sheet
    DAILY_TASKS: 'DAILY_TASKS_GENERATED',
    BEDS: 'BEDS',
    WEATHER: 'WEATHER_LOG',
    INVENTORY: 'INVENTORY'
  }
};

// ========================================
// MAIN ROUTER - Handles all API requests
// ========================================

function doGet(e) {
  const action = e.parameter.action || 'testConnection';

  // Set CORS headers for cross-origin requests
  const output = handleAction(action, e.parameter);

  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const action = e.parameter.action || '';
  let postData = {};

  try {
    postData = JSON.parse(e.postData.contents);
  } catch (err) {
    // No post data or invalid JSON
  }

  const output = handleAction(action, {...e.parameter, ...postData});

  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleAction(action, params) {
  try {
    switch (action) {
      // Connection Test
      case 'testConnection':
        return testConnection();

      // Plantings / Planning
      case 'getPlantings':
        return getPlantings(params);
      case 'getSeedings':
        return getSeedings(params);
      case 'savePlanting':
        return savePlanting(params);
      case 'saveSüccession':
        return saveSuccession(params);
      case 'updatePlanting':
        return updatePlanting(params);

      // Crop Profiles
      case 'getCropProfiles':
        return getCropProfiles();
      case 'getCropProfile':
        return getCropProfile(params.cropName);
      case 'updateCropProfile':
        return updateCropProfile(params);
      case 'createCropProfile':
        return createCropProfile(params);

      // Beds
      case 'getBeds':
        return getBeds(params);
      case 'getBedAvailability':
        return getBedAvailability(params);

      // Tasks
      case 'getTasks':
        return getTasks(params);
      case 'generateTasks':
        return generateTasks();
      case 'completeTask':
        return completeTask(params);

      // Harvest
      case 'logHarvest':
        return logHarvest(params);
      case 'getHarvests':
        return getHarvests(params);

      // Inventory
      case 'getInventory':
        return getInventory();
      case 'updateInventory':
        return updateInventory(params);

      // Weather
      case 'getWeather':
        return getWeather();
      case 'logWeather':
        return logWeather(params);

      // Dashboard Stats
      case 'getDashboardStats':
        return getDashboardStats();

      // Sowing Task Sheets
      case 'getGreenhouseSowingTasks':
        return getGreenhouseSowingTasks(params);
      case 'updateTaskCompletion':
        return updateTaskCompletion(params);

      default:
        return {
          success: false,
          error: `Unknown action: ${action}`,
          availableActions: [
            'testConnection', 'getPlantings', 'getSeedings', 'savePlanting',
            'getCropProfiles', 'getCropProfile', 'updateCropProfile',
            'getBeds', 'getTasks', 'generateTasks', 'logHarvest',
            'getInventory', 'getWeather', 'getDashboardStats',
            'getGreenhouseSowingTasks', 'updateTaskCompletion'
          ]
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// ========================================
// CONNECTION TEST
// ========================================

function testConnection() {
  const ss = SpreadsheetApp.openById(CONFIG.PRODUCTION_SHEET_ID);
  return {
    success: true,
    message: 'Apps Script is working!',
    timestamp: new Date().toISOString(),
    sheetId: CONFIG.PRODUCTION_SHEET_ID,
    sheetName: ss.getName()
  };
}

// ========================================
// PLANTINGS / PLANNING
// ========================================

function getPlantings(params) {
  const ss = SpreadsheetApp.openById(CONFIG.PRODUCTION_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TABS.PLANNING);

  if (!sheet) {
    return { success: false, error: `Sheet ${CONFIG.TABS.PLANNING} not found` };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const plantings = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Skip empty rows

    const planting = {};
    headers.forEach((header, index) => {
      planting[header] = row[index];
    });

    // Add computed status based on dates
    planting.status = computePlantingStatus(planting);

    plantings.push(planting);
  }

  // Apply filters if provided
  let filtered = plantings;

  if (params.crop) {
    filtered = filtered.filter(p => p.Crop === params.crop || p.crop === params.crop);
  }

  if (params.field) {
    filtered = filtered.filter(p => (p.Field || p.field || '').startsWith(params.field));
  }

  if (params.status) {
    filtered = filtered.filter(p => p.status === params.status);
  }

  return {
    success: true,
    data: filtered,
    count: filtered.length,
    timestamp: new Date().toISOString()
  };
}

function getSeedings(params) {
  const plantings = getPlantings({});

  if (!plantings.success) return plantings;

  let seedings = plantings.data.filter(p => {
    const seedDate = new Date(p.SeedDate || p.seedDate || p['Seed Date']);
    const today = new Date();
    const twoWeeksOut = new Date(today);
    twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);

    return seedDate >= today && seedDate <= twoWeeksOut;
  });

  // Filter by date range if provided
  if (params.startDate) {
    const start = new Date(params.startDate);
    seedings = seedings.filter(p => new Date(p.SeedDate || p.seedDate || p['Seed Date']) >= start);
  }

  if (params.endDate) {
    const end = new Date(params.endDate);
    seedings = seedings.filter(p => new Date(p.SeedDate || p.seedDate || p['Seed Date']) <= end);
  }

  // Format for labels
  const formatted = seedings.map(s => ({
    id: s.ID || s.id || generatePlantingId(s),
    crop: s.Crop || s.crop,
    variety: s.Variety || s.variety || '',
    seedDate: formatDate(s.SeedDate || s.seedDate || s['Seed Date']),
    transplantDate: formatDate(s.TransplantDate || s.transplantDate || s['Transplant Date']),
    trays: parseInt(s.Trays || s.trays || 1),
    cellsPerTray: parseInt(s.CellsPerTray || s.cellsPerTray || s['Cells Per Tray'] || 72),
    status: s.status || 'Scheduled'
  }));

  return {
    success: true,
    data: formatted,
    count: formatted.length
  };
}

function savePlanting(params) {
  const ss = SpreadsheetApp.openById(CONFIG.PRODUCTION_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TABS.PLANNING);

  const newRow = [
    params.id || generatePlantingId(params),
    params.crop,
    params.variety,
    params.seedDate,
    params.transplantDate,
    params.bed,
    params.bedFeet,
    params.trays || '',
    params.cellsPerTray || '',
    'Scheduled',
    new Date().toISOString(),
    params.notes || ''
  ];

  sheet.appendRow(newRow);

  return {
    success: true,
    message: 'Planting saved successfully',
    id: newRow[0]
  };
}

function saveSuccession(params) {
  const ss = SpreadsheetApp.openById(CONFIG.PRODUCTION_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TABS.PLANNING);

  const plantings = params.plantings || [];
  const results = [];

  plantings.forEach((p, index) => {
    const id = `${new Date().getFullYear().toString().slice(-2)}-${params.crop.substring(0,3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`;

    const newRow = [
      id,
      params.crop,
      params.variety || '',
      p.seedDate,
      p.harvestDate,
      p.bed,
      p.bedFeet,
      '',
      '',
      'Scheduled',
      new Date().toISOString(),
      `Succession ${index + 1}`
    ];

    sheet.appendRow(newRow);
    results.push(id);
  });

  return {
    success: true,
    message: `${results.length} plantings created`,
    ids: results
  };
}

function updatePlanting(params) {
  const ss = SpreadsheetApp.openById(CONFIG.PRODUCTION_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TABS.PLANNING);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Find the Batch_ID column index (should be column 1, but search to be safe)
  const batchIdColIndex = headers.indexOf('Batch_ID');
  const searchColIndex = batchIdColIndex >= 0 ? batchIdColIndex : 1; // Default to column 1 if not found

  const searchId = params.id || params.Batch_ID;

  for (let i = 1; i < data.length; i++) {
    if (data[i][searchColIndex] === searchId) {
      // Update the row with new values
      let updatedFields = [];
      Object.keys(params).forEach(key => {
        const colIndex = headers.indexOf(key);
        if (colIndex > -1 && key !== 'id' && key !== 'action') {
          sheet.getRange(i + 1, colIndex + 1).setValue(params[key]);
          updatedFields.push(key);
        }
      });

      return {
        success: true,
        message: 'Planting updated',
        updatedFields: updatedFields,
        rowIndex: i + 1
      };
    }
  }

  return {
    success: false,
    error: 'Planting not found',
    searchId: searchId,
    searchColumn: headers[searchColIndex]
  };
}

// ========================================
// CROP PROFILES
// ========================================

function getCropProfiles() {
  const ss = SpreadsheetApp.openById(CONFIG.PRODUCTION_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TABS.CROP_PROFILES);

  if (!sheet) {
    // Return demo data if sheet doesn't exist
    return {
      success: true,
      data: getDemoCropProfiles()
    };
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

function getCropProfile(cropName) {
  const profiles = getCropProfiles();
  const profile = profiles.data.find(p =>
    p.Crop === cropName || p.crop === cropName || p.Name === cropName
  );

  return {
    success: !!profile,
    data: profile || null
  };
}

/**
 * Updates a crop profile in REF_CropProfiles
 * Used by Quick Plant Wizard when user modifies grow settings
 */
function updateCropProfile(params) {
  const ss = SpreadsheetApp.openById(CONFIG.PRODUCTION_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TABS.CROP_PROFILES);

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
      // If variety specified, must match. Otherwise, take first crop match
      if (variety && rowVariety === variety) {
        targetRow = i + 1; // +1 for 1-indexed sheet rows
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

/**
 * Creates a new crop profile in REF_CropProfiles
 * Used by Quick Plant Wizard when adding new crops or varieties
 */
function createCropProfile(params) {
  const ss = SpreadsheetApp.openById(CONFIG.PRODUCTION_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TABS.CROP_PROFILES);

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

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Build the new row data based on headers
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

  // Append the new row
  sheet.appendRow(newRow);

  return {
    success: true,
    message: `Created profile for ${cropName}${variety ? ' - ' + variety : ''}`,
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

function getDemoCropProfiles() {
  return [
    { crop: 'Tomatoes', dtm: 75, spacing: 24, rowSpacing: 36, yieldPerFoot: 2 },
    { crop: 'Lettuce', dtm: 45, spacing: 8, rowSpacing: 12, yieldPerFoot: 0.5 },
    { crop: 'Peppers', dtm: 70, spacing: 18, rowSpacing: 24, yieldPerFoot: 1.5 },
    { crop: 'Basil', dtm: 28, spacing: 6, rowSpacing: 12, yieldPerFoot: 0.25 },
    { crop: 'Carrots', dtm: 70, spacing: 2, rowSpacing: 12, yieldPerFoot: 1 },
    { crop: 'Kale', dtm: 55, spacing: 12, rowSpacing: 18, yieldPerFoot: 0.5 },
    { crop: 'Spinach', dtm: 40, spacing: 4, rowSpacing: 12, yieldPerFoot: 0.3 },
    { crop: 'Cucumbers', dtm: 55, spacing: 12, rowSpacing: 48, yieldPerFoot: 3 }
  ];
}

// ========================================
// BEDS
// ========================================

function getBeds(params) {
  const ss = SpreadsheetApp.openById(CONFIG.PRODUCTION_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TABS.BEDS);

  if (!sheet) {
    // Return generated beds if sheet doesn't exist
    return {
      success: true,
      data: generateDemoBeds(params.field)
    };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const beds = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    const bed = {};
    headers.forEach((header, index) => {
      bed[header] = row[index];
    });
    beds.push(bed);
  }

  // Filter by field if provided
  if (params.field) {
    return {
      success: true,
      data: beds.filter(b => (b.Field || b.field || b.ID || '').startsWith(params.field))
    };
  }

  return { success: true, data: beds };
}

function getBedAvailability(params) {
  const beds = getBeds(params);
  const plantings = getPlantings({});

  if (!beds.success || !plantings.success) {
    return { success: false, error: 'Could not load data' };
  }

  const today = new Date();
  const checkDate = params.date ? new Date(params.date) : today;

  // Mark beds as occupied based on active plantings
  const availability = beds.data.map(bed => {
    const bedId = bed.ID || bed.id || bed.Name;
    const occupyingPlanting = plantings.data.find(p => {
      const plantingBed = p.Bed || p.bed;
      const seedDate = new Date(p.SeedDate || p.seedDate || p['Seed Date']);
      const harvestDate = new Date(p.HarvestDate || p.harvestDate || p['Harvest Date']);

      return plantingBed === bedId && seedDate <= checkDate && harvestDate >= checkDate;
    });

    return {
      ...bed,
      id: bedId,
      occupied: !!occupyingPlanting,
      currentCrop: occupyingPlanting ? (occupyingPlanting.Crop || occupyingPlanting.crop) : null
    };
  });

  return {
    success: true,
    data: availability,
    availableCount: availability.filter(b => !b.occupied).length,
    occupiedCount: availability.filter(b => b.occupied).length
  };
}

function generateDemoBeds(field) {
  const fields = field ? [field] : ['A', 'B', 'C'];
  const beds = [];

  fields.forEach(f => {
    for (let i = 1; i <= 30; i++) {
      beds.push({
        id: `${f}-${String(i).padStart(2, '0')}`,
        field: f,
        number: i,
        length: 100,
        width: 4,
        occupied: Math.random() > 0.7
      });
    }
  });

  return beds;
}

// ========================================
// TASKS
// ========================================

function getTasks(params) {
  const ss = SpreadsheetApp.openById(CONFIG.PRODUCTION_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TABS.DAILY_TASKS);

  if (!sheet) {
    return {
      success: true,
      data: generateDemoTasks()
    };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const tasks = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    const task = {};
    headers.forEach((header, index) => {
      task[header] = row[index];
    });
    tasks.push(task);
  }

  return { success: true, data: tasks };
}

function generateTasks() {
  const plantings = getPlantings({});
  const tasks = [];
  const today = new Date();
  const weekOut = new Date(today);
  weekOut.setDate(weekOut.getDate() + 7);

  if (!plantings.success) {
    return { success: false, error: 'Could not load plantings' };
  }

  plantings.data.forEach(p => {
    const seedDate = new Date(p.SeedDate || p.seedDate || p['Seed Date']);
    const transplantDate = new Date(p.TransplantDate || p.transplantDate || p['Transplant Date']);
    const harvestDate = new Date(p.HarvestDate || p.harvestDate || p['Harvest Date']);

    // Seeding tasks
    if (seedDate >= today && seedDate <= weekOut) {
      tasks.push({
        type: 'Seeding',
        crop: p.Crop || p.crop,
        variety: p.Variety || p.variety,
        date: formatDate(seedDate),
        bed: p.Bed || p.bed,
        priority: 'High'
      });
    }

    // Transplant tasks
    if (transplantDate >= today && transplantDate <= weekOut) {
      tasks.push({
        type: 'Transplant',
        crop: p.Crop || p.crop,
        variety: p.Variety || p.variety,
        date: formatDate(transplantDate),
        bed: p.Bed || p.bed,
        priority: 'High'
      });
    }

    // Harvest tasks
    if (harvestDate >= today && harvestDate <= weekOut) {
      tasks.push({
        type: 'Harvest',
        crop: p.Crop || p.crop,
        variety: p.Variety || p.variety,
        date: formatDate(harvestDate),
        bed: p.Bed || p.bed,
        priority: 'High'
      });
    }
  });

  return {
    success: true,
    data: tasks,
    count: tasks.length,
    generated: new Date().toISOString()
  };
}

function generateDemoTasks() {
  return [
    { type: 'Seeding', crop: 'Lettuce', variety: 'Parris Island', date: formatDate(new Date()), bed: 'GH-01', priority: 'High', completed: false },
    { type: 'Transplant', crop: 'Tomatoes', variety: 'Cherry Bomb', date: formatDate(new Date()), bed: 'A-12', priority: 'High', completed: false },
    { type: 'Harvest', crop: 'Spinach', variety: 'Bloomsdale', date: formatDate(new Date()), bed: 'B-05', priority: 'Medium', completed: false },
    { type: 'Irrigation', crop: 'All', date: formatDate(new Date()), priority: 'Medium', completed: false },
    { type: 'Weeding', crop: 'Carrots', bed: 'C-08', date: formatDate(new Date()), priority: 'Low', completed: false }
  ];
}

function completeTask(params) {
  // In production, this would update the task in the sheet
  return {
    success: true,
    message: `Task ${params.id} marked as complete`
  };
}

// ========================================
// HARVEST
// ========================================

function logHarvest(params) {
  const ss = SpreadsheetApp.openById(CONFIG.PRODUCTION_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TABS.MASTER_LOG);

  const newRow = [
    new Date().toISOString(),
    'Harvest',
    params.crop,
    params.variety || '',
    params.bed,
    params.quantity,
    params.unit || 'lbs',
    params.quality || 'A',
    params.notes || '',
    params.harvestedBy || ''
  ];

  sheet.appendRow(newRow);

  return {
    success: true,
    message: 'Harvest logged successfully',
    timestamp: newRow[0]
  };
}

function getHarvests(params) {
  const ss = SpreadsheetApp.openById(CONFIG.PRODUCTION_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TABS.MASTER_LOG);

  if (!sheet) {
    return { success: true, data: [] };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const harvests = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[1] === 'Harvest') {
      const harvest = {};
      headers.forEach((header, index) => {
        harvest[header] = row[index];
      });
      harvests.push(harvest);
    }
  }

  return { success: true, data: harvests };
}

// ========================================
// INVENTORY
// ========================================

function getInventory() {
  const ss = SpreadsheetApp.openById(CONFIG.PRODUCTION_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TABS.INVENTORY);

  if (!sheet) {
    return {
      success: true,
      data: getDemoInventory()
    };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const inventory = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index];
    });
    inventory.push(item);
  }

  return { success: true, data: inventory };
}

function getDemoInventory() {
  return [
    { crop: 'Tomatoes', variety: 'Cherry Bomb', quantity: 45, unit: 'lbs', harvestDate: formatDate(new Date()) },
    { crop: 'Lettuce', variety: 'Parris Island', quantity: 120, unit: 'heads', harvestDate: formatDate(new Date()) },
    { crop: 'Basil', variety: 'Genovese', quantity: 30, unit: 'bunches', harvestDate: formatDate(new Date()) }
  ];
}

function updateInventory(params) {
  // In production, this would update inventory in the sheet
  return {
    success: true,
    message: 'Inventory updated'
  };
}

// ========================================
// WEATHER
// ========================================

function getWeather() {
  // This uses the existing Open-Meteo integration
  try {
    const response = UrlFetchApp.fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=40.44&longitude=-79.99&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=America/New_York'
    );
    const data = JSON.parse(response.getContentText());

    return {
      success: true,
      data: {
        current: data.current,
        daily: data.daily
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function logWeather(params) {
  const ss = SpreadsheetApp.openById(CONFIG.PRODUCTION_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TABS.WEATHER);

  if (sheet) {
    sheet.appendRow([
      new Date().toISOString(),
      params.high,
      params.low,
      params.precipitation,
      params.conditions,
      params.notes || ''
    ]);
  }

  return { success: true, message: 'Weather logged' };
}

// ========================================
// DASHBOARD STATS
// ========================================

function getDashboardStats() {
  const plantings = getPlantings({});
  const tasks = getTasks({});

  const stats = {
    activePlantings: 0,
    harvestReady: 0,
    upcomingTasks: 0,
    totalBedFeet: 0
  };

  if (plantings.success) {
    stats.activePlantings = plantings.data.filter(p =>
      p.status === 'growing' || p.status === 'Growing' || p.status === 'Active'
    ).length;

    stats.harvestReady = plantings.data.filter(p =>
      p.status === 'harvest' || p.status === 'Harvest Ready'
    ).length;

    stats.totalBedFeet = plantings.data.reduce((sum, p) =>
      sum + (parseInt(p.BedFeet || p.bedFeet || p['Bed Feet'] || 0)), 0
    );
  }

  if (tasks.success) {
    stats.upcomingTasks = tasks.data.filter(t => !t.completed).length;
  }

  return {
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  };
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function computePlantingStatus(planting) {
  const today = new Date();
  const seedDate = new Date(planting.SeedDate || planting.seedDate || planting['Seed Date']);
  const harvestDate = new Date(planting.HarvestDate || planting.harvestDate || planting['Harvest Date']);
  const harvestEndDate = new Date(harvestDate);
  harvestEndDate.setDate(harvestEndDate.getDate() + 14); // 2 week harvest window

  if (today < seedDate) return 'seeding';
  if (today > harvestEndDate) return 'completed';
  if (today >= harvestDate) return 'harvest';
  return 'growing';
}

function generatePlantingId(planting) {
  const year = new Date().getFullYear().toString().slice(-2);
  const crop = (planting.Crop || planting.crop || 'XXX').substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${year}-${crop}-${random}`;
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// ========================================
// SOWING TASK SHEETS
// ========================================

function getGreenhouseSowingTasks(params) {
  const ss = SpreadsheetApp.openById(CONFIG.PRODUCTION_SHEET_ID);
  const planningSheet = ss.getSheetByName(CONFIG.TABS.PLANNING);

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
    firstHarvest: headers.indexOf('First_Harvest'),
    lastHarvest: headers.indexOf('Last_Harvest'),
    notes: headers.indexOf('Notes'),
    category: headers.indexOf('Category'),
    completed: headers.indexOf('SowingComplete'),
    completedBy: headers.indexOf('CompletedBy'),
    completedAt: headers.indexOf('CompletedAt')
  };

  // Parse date range
  const startDate = params.startDate ? new Date(params.startDate) : new Date();
  const endDate = params.endDate ? new Date(params.endDate) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const categoryFilter = params.category || 'all';

  // Try to get crop profiles for germination info
  let profileMap = {};
  try {
    const profilesSheet = ss.getSheetByName(CONFIG.TABS.CROP_PROFILES);
    if (profilesSheet) {
      const profilesData = profilesSheet.getDataRange().getValues();
      const profileHeaders = profilesData[0];
      const cropNameCol = profileHeaders.indexOf('Crop_Name') >= 0 ? profileHeaders.indexOf('Crop_Name') : profileHeaders.indexOf('Crop');
      const categoryCol = profileHeaders.indexOf('Primary_Category') >= 0 ? profileHeaders.indexOf('Primary_Category') : profileHeaders.indexOf('Category');
      const germTempCol = profileHeaders.indexOf('Germ_Temp_F');
      const germInstrCol = profileHeaders.indexOf('Germination_Instructions');
      const cellCountCol = profileHeaders.indexOf('Tray_Cell_Count');

      for (let i = 1; i < profilesData.length; i++) {
        const row = profilesData[i];
        const cropName = row[cropNameCol];
        if (cropName) {
          profileMap[cropName] = {
            category: row[categoryCol] || 'Veg',
            germTemp: germTempCol >= 0 ? row[germTempCol] : '',
            germInstructions: germInstrCol >= 0 ? row[germInstrCol] : '',
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
  const seedsByVariety = {};

  for (let i = 1; i < planningData.length; i++) {
    const row = planningData[i];

    // Get planting method to determine which date column to use
    const plantingMethod = cols.plantingMethod >= 0 ? row[cols.plantingMethod] : 'Transplant';
    const isDirectSeed = plantingMethod === 'Direct Seed';

    // Get the appropriate sow date based on method
    let sowDateRaw;
    if (isDirectSeed) {
      // For direct seed, use Plan_Field_Sow
      sowDateRaw = cols.fieldSow >= 0 ? row[cols.fieldSow] : null;
    } else {
      // For transplant, use Plan_GH_Sow
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

    // Calculate seeds needed - use plants needed or trays * 128
    const cellsPerTray = profile.defaultCells || 128;
    const seedsNeeded = plantsNeeded > 0 ? Math.ceil(plantsNeeded * 1.05) : Math.ceil(trays * cellsPerTray * 1.05);

    // Check if already completed (has actual sow date filled in)
    const isCompleted = isDirectSeed
      ? (cols.actFieldSow >= 0 && row[cols.actFieldSow])
      : (cols.actGhSow >= 0 && row[cols.actGhSow]);

    tasks.push({
      batchId: cols.batchId >= 0 ? row[cols.batchId] : `ROW-${i}`,
      crop: crop,
      variety: variety,
      category: category,
      plantingMethod: plantingMethod,
      sowDate: formatDate(sowDate),
      ghSowDate: isDirectSeed ? '' : formatDate(sowDate),
      fieldSowDate: isDirectSeed ? formatDate(sowDate) : '',
      transplantDate: cols.transplant >= 0 ? formatDate(row[cols.transplant]) : '',
      trays: trays,
      cellsPerTray: cellsPerTray,
      plantsNeeded: plantsNeeded,
      feetUsed: feetUsed,
      seedsNeeded: seedsNeeded,
      bed: cols.bed >= 0 ? row[cols.bed] : '',
      germTemp: profile.germTemp || '',
      germInstructions: profile.germInstructions || '',
      notes: cols.notes >= 0 ? row[cols.notes] : '',
      completed: isCompleted || (cols.completed >= 0 ? (row[cols.completed] === true || row[cols.completed] === 'TRUE') : false),
      completedBy: cols.completedBy >= 0 ? row[cols.completedBy] : null,
      completedAt: cols.completedAt >= 0 ? row[cols.completedAt] : null
    });

    // Aggregate statistics - only count trays for transplants
    if (!isDirectSeed && trays > 0) {
      const sizeKey = String(cellsPerTray);
      traysBySize[sizeKey] = (traysBySize[sizeKey] || 0) + trays;
    }

    const varietyKey = `${crop}|${variety}`;
    seedsByVariety[varietyKey] = (seedsByVariety[varietyKey] || 0) + seedsNeeded;
  }

  // Sort tasks by date, then crop
  tasks.sort((a, b) => {
    const dateCompare = new Date(a.sowDate) - new Date(b.sowDate);
    if (dateCompare !== 0) return dateCompare;
    return a.crop.localeCompare(b.crop);
  });

  // Format seeds needed summary
  const seedsNeeded = Object.entries(seedsByVariety).map(([key, seeds]) => {
    const [crop, variety] = key.split('|');
    return { crop, variety, seeds };
  }).sort((a, b) => b.seeds - a.seeds);

  // Calculate total trays
  const totalTrays = Object.values(traysBySize).reduce((a, b) => a + b, 0);

  return {
    success: true,
    data: {
      tasks: tasks,
      summary: {
        totalTrays: totalTrays,
        traysBySize: traysBySize,
        seedsNeeded: seedsNeeded,
        uniqueCrops: new Set(tasks.map(t => t.crop)).size,
        dateRange: {
          start: formatDate(startDate),
          end: formatDate(endDate)
        }
      }
    },
    timestamp: new Date().toISOString()
  };
}

function updateTaskCompletion(params) {
  const ss = SpreadsheetApp.openById(CONFIG.PRODUCTION_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TABS.PLANNING);

  if (!sheet) {
    return { success: false, error: 'Planning sheet not found' };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Find column indices - matching actual PLANNING_2026 columns
  const batchIdCol = headers.indexOf('Batch_ID');
  const plantingMethodCol = headers.indexOf('Planting_Method');
  const actGhSowCol = headers.indexOf('Act_GH_Sow');
  const actFieldSowCol = headers.indexOf('Act_Field_Sow');
  const statusCol = headers.indexOf('STATUS');

  if (batchIdCol < 0) {
    return { success: false, error: 'Batch_ID column not found' };
  }

  const searchId = params.batchId || params.id;
  const completed = params.completed === 'true' || params.completed === true;
  const today = new Date();

  for (let i = 1; i < data.length; i++) {
    if (data[i][batchIdCol] === searchId) {
      // Determine if this is direct seed or transplant
      const plantingMethod = plantingMethodCol >= 0 ? data[i][plantingMethodCol] : 'Transplant';
      const isDirectSeed = plantingMethod === 'Direct Seed';

      if (completed) {
        // Mark as sown by setting the actual sow date to today
        if (isDirectSeed && actFieldSowCol >= 0) {
          sheet.getRange(i + 1, actFieldSowCol + 1).setValue(today);
        } else if (!isDirectSeed && actGhSowCol >= 0) {
          sheet.getRange(i + 1, actGhSowCol + 1).setValue(today);
        }

        // Update status to "Sown" or "In Progress"
        if (statusCol >= 0) {
          sheet.getRange(i + 1, statusCol + 1).setValue(isDirectSeed ? 'Sown' : 'In GH');
        }
      } else {
        // Unchecking - clear the actual sow date
        if (isDirectSeed && actFieldSowCol >= 0) {
          sheet.getRange(i + 1, actFieldSowCol + 1).setValue('');
        } else if (!isDirectSeed && actGhSowCol >= 0) {
          sheet.getRange(i + 1, actGhSowCol + 1).setValue('');
        }

        // Reset status to Planned
        if (statusCol >= 0) {
          sheet.getRange(i + 1, statusCol + 1).setValue('Planned');
        }
      }

      return {
        success: true,
        message: `Task ${searchId} marked as ${completed ? 'sown' : 'not sown'}`,
        actualDate: completed ? formatDate(today) : null
      };
    }
  }

  return {
    success: false,
    error: 'Task not found',
    searchId: searchId
  };
}

// ========================================
// TEST FUNCTION - Run this to verify setup
// ========================================

function testSetup() {
  Logger.log('Testing Tiny Seed OS API...');

  // Test connection
  const connTest = testConnection();
  Logger.log('Connection Test: ' + JSON.stringify(connTest));

  // Test plantings
  const plantingsTest = getPlantings({});
  Logger.log('Plantings Count: ' + plantingsTest.count);

  // Test crop profiles
  const cropsTest = getCropProfiles();
  Logger.log('Crop Profiles Count: ' + cropsTest.data.length);

  // Test dashboard stats
  const statsTest = getDashboardStats();
  Logger.log('Dashboard Stats: ' + JSON.stringify(statsTest.data));

  Logger.log('All tests completed!');
}
