// =============================================================================
// CROP ROTATION & FIELD TIME GROUPING SYSTEM
// =============================================================================
// Organizes plantings by time in field for efficient bed turnover and
// ensures proper crop rotation to prevent disease and optimize soil health

/**
 * Default field time data for common crops (days in ground)
 * Based on university extension research
 */
const CROP_FIELD_DAYS = {
  // Quick turnover (under 45 days)
  'Radish': { min: 21, max: 35, harvestWindow: 14, multiHarvest: false },
  'Arugula': { min: 20, max: 45, harvestWindow: 25, multiHarvest: true },
  'Baby Greens': { min: 21, max: 35, harvestWindow: 14, multiHarvest: true },
  'Spinach': { min: 30, max: 50, harvestWindow: 20, multiHarvest: true },
  'Lettuce': { min: 30, max: 60, harvestWindow: 30, multiHarvest: true },
  'Mesclun': { min: 21, max: 35, harvestWindow: 14, multiHarvest: true },
  'Mustard Greens': { min: 25, max: 45, harvestWindow: 20, multiHarvest: true },
  'Mizuna': { min: 21, max: 40, harvestWindow: 19, multiHarvest: true },
  'Tat Soi': { min: 25, max: 45, harvestWindow: 20, multiHarvest: true },
  'Cilantro': { min: 21, max: 45, harvestWindow: 24, multiHarvest: true },
  'Dill': { min: 25, max: 50, harvestWindow: 25, multiHarvest: true },

  // Medium (45-75 days)
  'Bush Beans': { min: 50, max: 75, harvestWindow: 21, multiHarvest: true },
  'Snap Beans': { min: 50, max: 75, harvestWindow: 21, multiHarvest: true },
  'Pole Beans': { min: 55, max: 100, harvestWindow: 45, multiHarvest: true },
  'Cucumber': { min: 50, max: 90, harvestWindow: 40, multiHarvest: true },
  'Zucchini': { min: 45, max: 75, harvestWindow: 30, multiHarvest: true },
  'Summer Squash': { min: 45, max: 75, harvestWindow: 30, multiHarvest: true },
  'Beets': { min: 55, max: 70, harvestWindow: 15, multiHarvest: false },
  'Carrots': { min: 70, max: 90, harvestWindow: 20, multiHarvest: false },
  'Kohlrabi': { min: 50, max: 65, harvestWindow: 15, multiHarvest: false },
  'Turnips': { min: 45, max: 60, harvestWindow: 15, multiHarvest: false },
  'Bok Choy': { min: 40, max: 55, harvestWindow: 15, multiHarvest: false },
  'Fennel': { min: 60, max: 80, harvestWindow: 20, multiHarvest: false },

  // Long season (75-120 days)
  'Tomatoes': { min: 60, max: 140, harvestWindow: 80, multiHarvest: true },
  'Cherry Tomatoes': { min: 50, max: 140, harvestWindow: 90, multiHarvest: true },
  'Peppers': { min: 60, max: 140, harvestWindow: 80, multiHarvest: true },
  'Sweet Peppers': { min: 60, max: 140, harvestWindow: 80, multiHarvest: true },
  'Hot Peppers': { min: 65, max: 140, harvestWindow: 75, multiHarvest: true },
  'Eggplant': { min: 65, max: 130, harvestWindow: 65, multiHarvest: true },
  'Broccoli': { min: 55, max: 85, harvestWindow: 30, multiHarvest: true },
  'Cabbage': { min: 50, max: 85, harvestWindow: 35, multiHarvest: false },
  'Cauliflower': { min: 50, max: 80, harvestWindow: 30, multiHarvest: false },
  'Kale': { min: 55, max: 120, harvestWindow: 65, multiHarvest: true },
  'Collards': { min: 55, max: 120, harvestWindow: 65, multiHarvest: true },
  'Swiss Chard': { min: 50, max: 120, harvestWindow: 70, multiHarvest: true },
  'Celery': { min: 85, max: 120, harvestWindow: 35, multiHarvest: false },
  'Parsley': { min: 60, max: 120, harvestWindow: 60, multiHarvest: true },

  // Very long season (120+ days)
  'Winter Squash': { min: 95, max: 120, harvestWindow: 25, multiHarvest: false },
  'Butternut Squash': { min: 100, max: 115, harvestWindow: 15, multiHarvest: false },
  'Pumpkins': { min: 100, max: 120, harvestWindow: 20, multiHarvest: false },
  'Sweet Potatoes': { min: 90, max: 150, harvestWindow: 30, multiHarvest: false },
  'Leeks': { min: 100, max: 170, harvestWindow: 70, multiHarvest: true },
  'Brussels Sprouts': { min: 90, max: 120, harvestWindow: 30, multiHarvest: true },
  'Parsnips': { min: 100, max: 130, harvestWindow: 30, multiHarvest: false },
  'Onions': { min: 90, max: 120, harvestWindow: 30, multiHarvest: false },
  'Garlic': { min: 240, max: 270, harvestWindow: 14, multiHarvest: false },
  'Shallots': { min: 90, max: 120, harvestWindow: 14, multiHarvest: false }
};

/**
 * Crop family definitions for rotation planning
 */
const CROP_FAMILIES = {
  'Solanaceae': ['Tomatoes', 'Cherry Tomatoes', 'Peppers', 'Sweet Peppers', 'Hot Peppers', 'Eggplant', 'Potatoes', 'Tomatillos'],
  'Brassicaceae': ['Broccoli', 'Cabbage', 'Cauliflower', 'Kale', 'Brussels Sprouts', 'Collards', 'Kohlrabi', 'Radish', 'Turnips', 'Arugula', 'Bok Choy', 'Mustard Greens', 'Mizuna', 'Tat Soi'],
  'Cucurbitaceae': ['Cucumber', 'Zucchini', 'Summer Squash', 'Winter Squash', 'Butternut Squash', 'Pumpkins', 'Melons', 'Watermelon'],
  'Fabaceae': ['Bush Beans', 'Snap Beans', 'Pole Beans', 'Peas', 'Snow Peas', 'Snap Peas'],
  'Alliaceae': ['Onions', 'Garlic', 'Leeks', 'Shallots', 'Scallions', 'Chives'],
  'Apiaceae': ['Carrots', 'Celery', 'Parsnips', 'Parsley', 'Fennel', 'Dill', 'Cilantro'],
  'Amaranthaceae': ['Beets', 'Spinach', 'Swiss Chard'],
  'Asteraceae': ['Lettuce', 'Endive', 'Radicchio', 'Sunflowers', 'Artichokes'],
  'Poaceae': ['Corn', 'Sweet Corn']
};

/**
 * Minimum years before same family should return to a bed
 */
const ROTATION_YEARS = {
  'Solanaceae': 4,
  'Brassicaceae': 5,
  'Cucurbitaceae': 4,
  'Fabaceae': 3,
  'Alliaceae': 4,
  'Apiaceae': 3,
  'Amaranthaceae': 3,
  'Asteraceae': 2,
  'Poaceae': 2
};

/**
 * Rotation compatibility matrix
 * 2 = Highly beneficial (plant this AFTER previous), 1 = Neutral, 0 = Avoid, -1 = Strongly avoid
 */
const ROTATION_COMPATIBILITY = {
  'Solanaceae':    { 'Solanaceae': -1, 'Brassicaceae': 1, 'Cucurbitaceae': 1, 'Fabaceae': 2, 'Alliaceae': 1, 'Apiaceae': 1, 'Amaranthaceae': 1, 'Asteraceae': 1, 'Poaceae': 1 },
  'Brassicaceae':  { 'Solanaceae': 1, 'Brassicaceae': -1, 'Cucurbitaceae': 1, 'Fabaceae': 2, 'Alliaceae': 1, 'Apiaceae': 1, 'Amaranthaceae': 1, 'Asteraceae': 1, 'Poaceae': 1 },
  'Cucurbitaceae': { 'Solanaceae': 1, 'Brassicaceae': 1, 'Cucurbitaceae': -1, 'Fabaceae': 2, 'Alliaceae': 1, 'Apiaceae': 1, 'Amaranthaceae': 1, 'Asteraceae': 1, 'Poaceae': 1 },
  'Fabaceae':      { 'Solanaceae': 1, 'Brassicaceae': 1, 'Cucurbitaceae': 1, 'Fabaceae': -1, 'Alliaceae': 0, 'Apiaceae': 1, 'Amaranthaceae': 1, 'Asteraceae': 1, 'Poaceae': 1 },
  'Alliaceae':     { 'Solanaceae': 1, 'Brassicaceae': 2, 'Cucurbitaceae': 1, 'Fabaceae': 0, 'Alliaceae': -1, 'Apiaceae': 1, 'Amaranthaceae': 1, 'Asteraceae': 1, 'Poaceae': 1 },
  'Apiaceae':      { 'Solanaceae': 2, 'Brassicaceae': 2, 'Cucurbitaceae': 1, 'Fabaceae': 1, 'Alliaceae': 1, 'Apiaceae': -1, 'Amaranthaceae': 1, 'Asteraceae': 1, 'Poaceae': 1 },
  'Amaranthaceae': { 'Solanaceae': 1, 'Brassicaceae': 1, 'Cucurbitaceae': 1, 'Fabaceae': 2, 'Alliaceae': 1, 'Apiaceae': 1, 'Amaranthaceae': -1, 'Asteraceae': 1, 'Poaceae': 1 },
  'Asteraceae':    { 'Solanaceae': 1, 'Brassicaceae': 1, 'Cucurbitaceae': 1, 'Fabaceae': 1, 'Alliaceae': 1, 'Apiaceae': 1, 'Amaranthaceae': 1, 'Asteraceae': -1, 'Poaceae': 1 },
  'Poaceae':       { 'Solanaceae': 1, 'Brassicaceae': 2, 'Cucurbitaceae': 1, 'Fabaceae': 2, 'Alliaceae': 1, 'Apiaceae': 1, 'Amaranthaceae': 1, 'Asteraceae': 1, 'Poaceae': -1 }
};

/**
 * Field time groups for organizing similar-duration crops
 */
const FIELD_TIME_GROUPS = {
  'Quick':    { min: 0, max: 45, label: 'Quick Turnover (< 45 days)', color: '#4ade80' },
  'Short':    { min: 45, max: 75, label: 'Short Season (45-75 days)', color: '#60a5fa' },
  'Medium':   { min: 75, max: 100, label: 'Medium Season (75-100 days)', color: '#f59e0b' },
  'Long':     { min: 100, max: 130, label: 'Long Season (100-130 days)', color: '#ef4444' },
  'VeryLong': { min: 130, max: 999, label: 'Very Long Season (130+ days)', color: '#8b5cf6' }
};

/**
 * Get the crop family for a given crop name
 */
function getCropFamily(cropName) {
  var normalizedCrop = String(cropName).trim();
  for (var family in CROP_FAMILIES) {
    var crops = CROP_FAMILIES[family];
    for (var i = 0; i < crops.length; i++) {
      if (crops[i].toLowerCase() === normalizedCrop.toLowerCase()) {
        return family;
      }
    }
  }
  return 'Unknown';
}

/**
 * Get field time group for a given number of days
 */
function getFieldTimeGroup(days) {
  for (var groupName in FIELD_TIME_GROUPS) {
    var config = FIELD_TIME_GROUPS[groupName];
    if (days >= config.min && days < config.max) {
      return { group: groupName, min: config.min, max: config.max, label: config.label, color: config.color };
    }
  }
  return { group: 'Unknown', label: 'Unknown', color: '#6b7280' };
}

/**
 * Get default field days data for a crop
 */
function getDefaultFieldDays(cropName) {
  var normalizedCrop = String(cropName).trim();

  // Try exact match first
  if (CROP_FIELD_DAYS[normalizedCrop]) {
    return CROP_FIELD_DAYS[normalizedCrop];
  }

  // Try case-insensitive match
  for (var crop in CROP_FIELD_DAYS) {
    if (crop.toLowerCase() === normalizedCrop.toLowerCase()) {
      return CROP_FIELD_DAYS[crop];
    }
  }

  // Return default values if not found
  return { min: 60, max: 90, harvestWindow: 30, multiHarvest: false };
}

/**
 * Check rotation compatibility between two crops
 * Returns: { compatible: boolean, score: number, reason: string }
 */
function checkRotationCompatibility(previousCrop, nextCrop) {
  var prevFamily = getCropFamily(previousCrop);
  var nextFamily = getCropFamily(nextCrop);

  if (prevFamily === 'Unknown' || nextFamily === 'Unknown') {
    return { compatible: true, score: 1, reason: 'Unknown crop family - no restriction' };
  }

  var score = ROTATION_COMPATIBILITY[prevFamily] ? (ROTATION_COMPATIBILITY[prevFamily][nextFamily] || 1) : 1;

  if (score === -1) {
    return {
      compatible: false,
      score: -1,
      reason: 'Same family (' + prevFamily + ') - wait ' + ROTATION_YEARS[prevFamily] + ' years'
    };
  } else if (score === 0) {
    return {
      compatible: false,
      score: 0,
      reason: prevFamily + ' should not follow ' + nextFamily + ' - inhibits growth'
    };
  } else if (score === 2) {
    return {
      compatible: true,
      score: 2,
      reason: 'Excellent! ' + nextFamily + ' benefits from following ' + prevFamily
    };
  } else {
    return {
      compatible: true,
      score: 1,
      reason: 'Neutral - acceptable rotation'
    };
  }
}

/**
 * Get bed history for rotation checking
 */
function getBedHistory(bedId, years) {
  years = years || 4;
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var history = [];

  // Check current year and previous years
  var currentYear = new Date().getFullYear();
  for (var year = currentYear; year >= currentYear - years; year--) {
    var sheetName = 'PLANNING_' + year;
    var sheet = ss.getSheetByName(sheetName);
    if (sheet && sheet.getLastRow() > 1) {
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var bedCol = headers.indexOf('Target_Bed_ID');
      var cropCol = headers.indexOf('Crop');
      var transplantCol = headers.indexOf('Transplant_Date');
      var lastHarvestCol = headers.indexOf('Last_Harvest');

      for (var i = 1; i < data.length; i++) {
        if (String(data[i][bedCol]).indexOf(bedId) !== -1) {
          history.push({
            year: year,
            crop: data[i][cropCol],
            family: getCropFamily(data[i][cropCol]),
            transplantDate: data[i][transplantCol],
            lastHarvest: data[i][lastHarvestCol]
          });
        }
      }
    }
  }

  return history.sort(function(a, b) {
    return new Date(b.transplantDate) - new Date(a.transplantDate);
  });
}

/**
 * Check if a crop can be planted in a specific bed based on rotation history
 */
function canPlantInBed(cropName, bedId) {
  var history = getBedHistory(bedId, 4);
  var cropFamily = getCropFamily(cropName);
  var minYears = ROTATION_YEARS[cropFamily] || 2;

  var warnings = [];
  var conflicts = [];

  for (var i = 0; i < history.length; i++) {
    var entry = history[i];
    if (entry.family === cropFamily) {
      var yearsSince = new Date().getFullYear() - entry.year;
      if (yearsSince < minYears) {
        conflicts.push({
          crop: entry.crop,
          year: entry.year,
          yearsSince: yearsSince,
          required: minYears,
          message: cropFamily + ' was planted ' + yearsSince + ' year(s) ago (' + entry.crop + ' in ' + entry.year + '). Wait ' + (minYears - yearsSince) + ' more year(s).'
        });
      }
    }

    // Check compatibility with most recent crop
    if (history.length > 0 && entry === history[0]) {
      var compatibility = checkRotationCompatibility(entry.crop, cropName);
      if (!compatibility.compatible) {
        warnings.push(compatibility.reason);
      }
    }
  }

  return {
    canPlant: conflicts.length === 0,
    conflicts: conflicts,
    warnings: warnings,
    history: history
  };
}

/**
 * Group plantings by field time for efficient bed prep
 * Returns plantings organized by how long they'll occupy the field
 */
function groupPlantingsByFieldTime(params) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var planSheet = ss.getSheetByName('PLANNING_2026');
  var profileSheet = ss.getSheetByName('REF_CropProfiles');

  if (!planSheet) {
    return { success: false, error: 'PLANNING_2026 sheet not found' };
  }

  // Get crop profiles for field days data
  var profiles = {};
  if (profileSheet && profileSheet.getLastRow() > 1) {
    var profData = profileSheet.getDataRange().getValues();
    var profHeaders = profData[0];
    var cropCol = profHeaders.indexOf('Crop_Name');
    var fieldMinCol = profHeaders.indexOf('Field_Days_Min');
    var fieldMaxCol = profHeaders.indexOf('Field_Days_Max');
    var familyCol = profHeaders.indexOf('Family');

    for (var i = 1; i < profData.length; i++) {
      var cropName = profData[i][cropCol];
      if (cropName) {
        // Use profile data if available, otherwise use defaults
        var fieldMin = profData[i][fieldMinCol] || getDefaultFieldDays(cropName).min;
        var fieldMax = profData[i][fieldMaxCol] || getDefaultFieldDays(cropName).max;
        profiles[cropName] = {
          fieldDaysMin: fieldMin,
          fieldDaysMax: fieldMax,
          family: profData[i][familyCol] || getCropFamily(cropName)
        };
      }
    }
  }

  // Get planning data
  var planData = planSheet.getDataRange().getValues();
  var planHeaders = planData[0];
  var statusCol = planHeaders.indexOf('STATUS');
  var cropCol = planHeaders.indexOf('Crop');
  var varietyCol = planHeaders.indexOf('Variety');
  var bedCol = planHeaders.indexOf('Target_Bed_ID');
  var transplantCol = planHeaders.indexOf('Transplant_Date');
  var fieldSowCol = planHeaders.indexOf('Field_Sow_Date');
  var firstHarvestCol = planHeaders.indexOf('First_Harvest');
  var lastHarvestCol = planHeaders.indexOf('Last_Harvest');
  var methodCol = planHeaders.indexOf('Method');
  var batchCol = planHeaders.indexOf('Batch_ID');

  // Group plantings
  var groups = {
    'Quick': [],
    'Short': [],
    'Medium': [],
    'Long': [],
    'VeryLong': []
  };

  var ungrouped = [];

  for (var i = 1; i < planData.length; i++) {
    var row = planData[i];
    var crop = row[cropCol];
    var status = row[statusCol];

    if (!crop || status === 'Completed' || status === 'Cancelled') continue;

    // Calculate field days
    var profile = profiles[crop] || {};
    var defaults = getDefaultFieldDays(crop);
    var fieldDays = profile.fieldDaysMax || defaults.max;
    var family = profile.family || getCropFamily(crop);

    // Determine field start date
    var fieldStart = row[transplantCol] || row[fieldSowCol];
    var firstHarvest = row[firstHarvestCol];
    var lastHarvest = row[lastHarvestCol];

    var planting = {
      rowIndex: i + 1,
      batchId: row[batchCol],
      crop: crop,
      variety: row[varietyCol],
      method: row[methodCol],
      bedId: row[bedCol],
      fieldStart: fieldStart,
      firstHarvest: firstHarvest,
      lastHarvest: lastHarvest,
      fieldDays: fieldDays,
      family: family,
      status: status
    };

    // Assign to group
    var groupInfo = getFieldTimeGroup(fieldDays);
    if (groupInfo.group !== 'Unknown' && groups[groupInfo.group]) {
      groups[groupInfo.group].push(planting);
    } else {
      ungrouped.push(planting);
    }
  }

  // Sort each group by field start date
  for (var groupName in groups) {
    groups[groupName].sort(function(a, b) {
      var dateA = a.fieldStart ? new Date(a.fieldStart) : new Date('2099-12-31');
      var dateB = b.fieldStart ? new Date(b.fieldStart) : new Date('2099-12-31');
      return dateA - dateB;
    });
  }

  // Calculate bed availability windows
  var bedWindows = calculateBedAvailabilityWindows(groups);

  return {
    success: true,
    groups: groups,
    ungrouped: ungrouped,
    bedWindows: bedWindows,
    groupDefinitions: FIELD_TIME_GROUPS,
    summary: {
      quick: groups['Quick'].length,
      short: groups['Short'].length,
      medium: groups['Medium'].length,
      long: groups['Long'].length,
      veryLong: groups['VeryLong'].length,
      total: groups['Quick'].length + groups['Short'].length + groups['Medium'].length + groups['Long'].length + groups['VeryLong'].length
    }
  };
}

/**
 * Calculate when beds will become available based on last harvest dates
 */
function calculateBedAvailabilityWindows(groups) {
  var bedAvailability = {};

  for (var groupName in groups) {
    var plantings = groups[groupName];
    for (var i = 0; i < plantings.length; i++) {
      var planting = plantings[i];
      if (!planting.bedId) continue;

      var bedId = planting.bedId;
      var lastHarvest = planting.lastHarvest ? new Date(planting.lastHarvest) : null;

      if (!bedAvailability[bedId]) {
        bedAvailability[bedId] = {
          plantings: [],
          availableAfter: null,
          currentCrop: null,
          currentFamily: null
        };
      }

      bedAvailability[bedId].plantings.push(planting);

      if (lastHarvest && (!bedAvailability[bedId].availableAfter || lastHarvest > bedAvailability[bedId].availableAfter)) {
        bedAvailability[bedId].availableAfter = lastHarvest;
        bedAvailability[bedId].currentCrop = planting.crop;
        bedAvailability[bedId].currentFamily = planting.family;
      }
    }
  }

  return bedAvailability;
}

/**
 * Suggest optimal bed assignments for a new planting based on rotation
 */
function suggestBedForCrop(params) {
  var cropName = params.cropName;
  var targetDate = params.targetDate ? new Date(params.targetDate) : new Date();
  var requiredFeet = Number(params.feet) || 50;

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var bedSheet = ss.getSheetByName('REF_Beds');

  if (!bedSheet) {
    return { success: false, error: 'REF_Beds sheet not found' };
  }

  var cropFamily = getCropFamily(cropName);
  var bedData = bedSheet.getDataRange().getValues();
  var suggestions = [];

  for (var i = 1; i < bedData.length; i++) {
    var bedId = bedData[i][0];
    var bedLength = Number(bedData[i][3]) || 100;
    var status = bedData[i][4];

    if (status === 'Inactive' || status === 'Reserved') continue;

    // Check rotation compatibility
    var rotationCheck = canPlantInBed(cropName, bedId);

    // Get bed availability
    var groupsResult = groupPlantingsByFieldTime({});
    var bedWindows = groupsResult.bedWindows || {};
    var bedInfo = bedWindows[bedId] || { availableAfter: null };

    var available = !bedInfo.availableAfter || new Date(bedInfo.availableAfter) <= targetDate;

    // Calculate score
    var score = 100;
    if (!rotationCheck.canPlant) score -= 50;
    if (rotationCheck.warnings.length > 0) score -= 20;
    if (!available) score -= 30;
    if (bedLength < requiredFeet) score -= 20;

    // Bonus for beneficial rotation
    if (bedInfo.currentCrop) {
      var compatibility = checkRotationCompatibility(bedInfo.currentCrop, cropName);
      if (compatibility.score === 2) score += 20;
    }

    suggestions.push({
      bedId: bedId,
      length: bedLength,
      score: score,
      available: available,
      availableAfter: bedInfo.availableAfter,
      rotationCheck: rotationCheck,
      currentCrop: bedInfo.currentCrop,
      recommendation: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Acceptable' : 'Not Recommended'
    });
  }

  // Sort by score descending
  suggestions.sort(function(a, b) { return b.score - a.score; });

  return {
    success: true,
    crop: cropName,
    family: cropFamily,
    targetDate: targetDate.toISOString().split('T')[0],
    suggestions: suggestions.slice(0, 10) // Top 10
  };
}

/**
 * Update crop profiles with field days data from defaults
 */
function populateFieldDaysData() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('REF_CropProfiles');

  if (!sheet) {
    return { success: false, error: 'REF_CropProfiles sheet not found' };
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var cropCol = headers.indexOf('Crop_Name');
  var familyCol = headers.indexOf('Family');
  var fieldMinCol = headers.indexOf('Field_Days_Min');
  var fieldMaxCol = headers.indexOf('Field_Days_Max');
  var harvestWindowCol = headers.indexOf('Harvest_Window_Days');
  var multiHarvestCol = headers.indexOf('Multi_Harvest');

  // If columns don't exist, we need to add them
  if (fieldMinCol === -1 || fieldMaxCol === -1) {
    return { success: false, error: 'Field_Days columns not found. Run setupAllTables() first to add new columns.' };
  }

  var updated = 0;

  for (var i = 1; i < data.length; i++) {
    var cropName = data[i][cropCol];
    if (!cropName) continue;

    var defaults = getDefaultFieldDays(cropName);
    var family = getCropFamily(cropName);

    // Only update if empty
    if (!data[i][fieldMinCol]) {
      sheet.getRange(i + 1, fieldMinCol + 1).setValue(defaults.min);
      updated++;
    }
    if (!data[i][fieldMaxCol]) {
      sheet.getRange(i + 1, fieldMaxCol + 1).setValue(defaults.max);
    }
    if (harvestWindowCol !== -1 && !data[i][harvestWindowCol]) {
      sheet.getRange(i + 1, harvestWindowCol + 1).setValue(defaults.harvestWindow);
    }
    if (multiHarvestCol !== -1 && !data[i][multiHarvestCol]) {
      sheet.getRange(i + 1, multiHarvestCol + 1).setValue(defaults.multiHarvest ? 'Yes' : 'No');
    }
    // Update family if empty
    if (!data[i][familyCol]) {
      sheet.getRange(i + 1, familyCol + 1).setValue(family);
    }
  }

  return { success: true, message: 'Updated field days data for ' + updated + ' crops' };
}

/**
 * Get rotation recommendations for planning
 */
function getRotationRecommendations(params) {
  var bedId = params.bedId;

  if (!bedId) {
    return { success: false, error: 'bedId required' };
  }

  var history = getBedHistory(bedId, 4);
  var recommendations = [];

  // Get last planted family
  var lastFamily = history.length > 0 ? history[0].family : null;

  // Calculate which families can be planted
  var familyStatus = {};
  for (var family in CROP_FAMILIES) {
    var lastPlanting = null;
    for (var i = 0; i < history.length; i++) {
      if (history[i].family === family) {
        lastPlanting = history[i];
        break;
      }
    }
    var minYears = ROTATION_YEARS[family] || 2;

    var yearsWait = 0;
    var canPlant = true;

    if (lastPlanting) {
      var yearsSince = new Date().getFullYear() - lastPlanting.year;
      if (yearsSince < minYears) {
        canPlant = false;
        yearsWait = minYears - yearsSince;
      }
    }

    // Check compatibility with last crop
    var compatibility = 1;
    if (lastFamily) {
      compatibility = ROTATION_COMPATIBILITY[lastFamily] ? (ROTATION_COMPATIBILITY[lastFamily][family] || 1) : 1;
    }

    familyStatus[family] = {
      canPlant: canPlant,
      yearsWait: yearsWait,
      lastPlanted: lastPlanting ? lastPlanting.year : null,
      compatibilityScore: compatibility,
      recommendation: compatibility === 2 ? 'Highly Recommended' :
                      compatibility === 1 && canPlant ? 'Good' :
                      compatibility === 0 ? 'Avoid' :
                      !canPlant ? 'Wait ' + yearsWait + ' year(s)' : 'OK'
    };

    if (canPlant && compatibility >= 1) {
      recommendations.push({
        family: family,
        crops: CROP_FAMILIES[family],
        score: compatibility,
        reason: compatibility === 2 ?
          family + ' benefits from following ' + lastFamily :
          'Good rotation option'
      });
    }
  }

  // Sort recommendations by score
  recommendations.sort(function(a, b) { return b.score - a.score; });

  return {
    success: true,
    bedId: bedId,
    history: history,
    familyStatus: familyStatus,
    recommendations: recommendations,
    lastCrop: history.length > 0 ? history[0].crop : null,
    lastFamily: lastFamily
  };
}

/**
 * API endpoint for field time grouping
 */
function getFieldTimeGroups(params) {
  return groupPlantingsByFieldTime(params);
}

/**
 * Test crop rotation system
 */
function testCropRotationSystem() {
  Logger.log('=== Testing Crop Rotation System ===');

  // Test family lookup
  Logger.log('Tomatoes family: ' + getCropFamily('Tomatoes')); // Should be Solanaceae
  Logger.log('Lettuce family: ' + getCropFamily('Lettuce')); // Should be Asteraceae

  // Test rotation compatibility
  var compat1 = checkRotationCompatibility('Tomatoes', 'Bush Beans');
  Logger.log('Tomatoes -> Bush Beans: ' + JSON.stringify(compat1)); // Should be beneficial

  var compat2 = checkRotationCompatibility('Tomatoes', 'Peppers');
  Logger.log('Tomatoes -> Peppers: ' + JSON.stringify(compat2)); // Should be avoid (same family)

  // Test field time grouping
  Logger.log('Lettuce field days: ' + JSON.stringify(getDefaultFieldDays('Lettuce')));
  Logger.log('Tomatoes field days: ' + JSON.stringify(getDefaultFieldDays('Tomatoes')));

  // Test field time group
  Logger.log('30 days group: ' + JSON.stringify(getFieldTimeGroup(30))); // Quick
  Logger.log('80 days group: ' + JSON.stringify(getFieldTimeGroup(80))); // Medium
  Logger.log('140 days group: ' + JSON.stringify(getFieldTimeGroup(140))); // VeryLong

  // Test grouping plantings
  var grouped = groupPlantingsByFieldTime({});
  Logger.log('Field Time Groups Summary: ' + JSON.stringify(grouped.summary));

  Logger.log('=== Crop Rotation Tests Complete ===');
}
