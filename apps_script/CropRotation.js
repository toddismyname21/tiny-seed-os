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
  'Sora Radish': { min: 25, max: 30, harvestWindow: 14, multiHarvest: false },
  'French Breakfast': { min: 25, max: 30, harvestWindow: 14, multiHarvest: false },
  'Rover Radish': { min: 25, max: 30, harvestWindow: 14, multiHarvest: false },
  'Arugula': { min: 25, max: 30, harvestWindow: 14, multiHarvest: true },
  'Baby Greens': { min: 21, max: 35, harvestWindow: 14, multiHarvest: true },
  'Spinach': { min: 30, max: 50, harvestWindow: 20, multiHarvest: true },
  'Yuma Spinach': { min: 25, max: 30, harvestWindow: 14, multiHarvest: true },
  'Pawnee Spinach': { min: 25, max: 30, harvestWindow: 14, multiHarvest: true },
  'Lettuce': { min: 30, max: 60, harvestWindow: 30, multiHarvest: true },
  'Mesclun': { min: 21, max: 35, harvestWindow: 14, multiHarvest: true },
  'Something Fresh Mix': { min: 25, max: 30, harvestWindow: 14, multiHarvest: true },
  'Mustard Greens': { min: 25, max: 45, harvestWindow: 20, multiHarvest: true },
  'Mizuna': { min: 21, max: 40, harvestWindow: 19, multiHarvest: true },
  'Tat Soi': { min: 25, max: 45, harvestWindow: 20, multiHarvest: true },
  'Cilantro': { min: 21, max: 45, harvestWindow: 24, multiHarvest: true },
  'Dill': { min: 25, max: 50, harvestWindow: 25, multiHarvest: true },
  'Petite Kale Mix': { min: 25, max: 30, harvestWindow: 14, multiHarvest: true },

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
  'Brassicaceae': ['Broccoli', 'Cabbage', 'Cauliflower', 'Kale', 'Petite Kale Mix', 'Brussels Sprouts', 'Collards', 'Kohlrabi', 'Radish', 'Sora Radish', 'French Breakfast', 'Rover Radish', 'Turnips', 'Arugula', 'Bok Choy', 'Mustard Greens', 'Mizuna', 'Tat Soi'],
  'Cucurbitaceae': ['Cucumber', 'Zucchini', 'Summer Squash', 'Winter Squash', 'Butternut Squash', 'Pumpkins', 'Melons', 'Watermelon'],
  'Fabaceae': ['Bush Beans', 'Snap Beans', 'Pole Beans', 'Peas', 'Snow Peas', 'Snap Peas'],
  'Alliaceae': ['Onions', 'Garlic', 'Leeks', 'Shallots', 'Scallions', 'Chives'],
  'Apiaceae': ['Carrots', 'Celery', 'Parsnips', 'Parsley', 'Fennel', 'Dill', 'Cilantro'],
  'Amaranthaceae': ['Beets', 'Spinach', 'Yuma Spinach', 'Pawnee Spinach', 'Swiss Chard'],
  'Asteraceae': ['Lettuce', 'Endive', 'Radicchio', 'Sunflowers', 'Artichokes', 'Something Fresh Mix', 'Mesclun'],
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
 * SEASONAL DTM ADJUSTMENT SYSTEM
 * Crops take longer to mature in cooler seasons (early spring, late fall)
 * This system adjusts DTM based on planting date
 */

/**
 * Season definitions with date ranges (month-day format)
 * Based on Zelienople, PA climate (Zone 6a)
 */
const SEASON_BOUNDARIES = {
  'EarlySpring': { start: '03-01', end: '04-30', label: 'Early Spring (Mar-Apr)' },
  'LateSpring':  { start: '05-01', end: '05-31', label: 'Late Spring (May)' },
  'Summer':      { start: '06-01', end: '08-15', label: 'Summer (Jun-Aug 15)' },
  'LateSummer':  { start: '08-16', end: '09-15', label: 'Late Summer (Aug 16-Sep 15)' },
  'Fall':        { start: '09-16', end: '10-31', label: 'Fall (Sep 16-Oct)' },
  'LateFall':    { start: '11-01', end: '11-30', label: 'Late Fall (Nov)' }
};

/**
 * Default DTM multipliers by season
 * Crops take longer when days are shorter and temps are cooler
 * Summer = baseline (1.0), other seasons add time
 */
const SEASONAL_DTM_MULTIPLIERS = {
  'EarlySpring': 1.35,  // 35% longer - cold soil, short days
  'LateSpring':  1.15,  // 15% longer - warming up
  'Summer':      1.0,   // Baseline - optimal growing conditions
  'LateSummer':  1.1,   // 10% longer - days shortening
  'Fall':        1.25,  // 25% longer - cooling temps
  'LateFall':    1.5    // 50% longer - cold, short days
};

/**
 * Determine which season a date falls into
 * @param {Date|string} date - The planting date
 * @returns {string} Season name (EarlySpring, LateSpring, Summer, etc.)
 */
function getSeasonFromDate(date) {
  if (!date) return 'Summer'; // Default to summer if no date

  var d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 'Summer';

  var month = d.getMonth() + 1; // 0-indexed
  var day = d.getDate();
  var mmdd = String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');

  for (var season in SEASON_BOUNDARIES) {
    var bounds = SEASON_BOUNDARIES[season];
    if (mmdd >= bounds.start && mmdd <= bounds.end) {
      return season;
    }
  }

  // Winter months default to EarlySpring multiplier (slowest growth)
  return 'EarlySpring';
}

/**
 * Get seasonally-adjusted field days for a crop
 *
 * PRIORITY ORDER (best to fallback):
 * 1. LEARNED DATA - Real harvest data from DTM_LEARNING sheet (most accurate)
 * 2. CROP PROFILE - DTM_Spring/Summer/Fall from CROPS sheet (configured)
 * 3. DEFAULT MULTIPLIER - Guessed seasonal factors (fallback only)
 *
 * @param {string} cropName - Name of the crop
 * @param {Date|string} plantingDate - When the crop will be planted in the field
 * @returns {Object} Adjusted field days { min, max, harvestWindow, multiHarvest, season, multiplier, adjusted, source }
 */
function getSeasonalFieldDays(cropName, plantingDate) {
  // Get base field days from constants
  var baseFieldDays = getDefaultFieldDays(cropName);
  var season = getSeasonFromDate(plantingDate);
  var multiplier = SEASONAL_DTM_MULTIPLIERS[season] || 1.0;

  // PRIORITY 1: Check for LEARNED DATA from actual harvests
  var learnedData = getLearnedDTMForCrop(cropName, season);
  if (learnedData && learnedData.samples >= 3) {
    // Use learned data if we have at least 3 samples for reliability
    return {
      min: learnedData.min,
      max: learnedData.max,
      harvestWindow: baseFieldDays.harvestWindow,
      multiHarvest: baseFieldDays.multiHarvest,
      season: season,
      seasonLabel: SEASON_BOUNDARIES[season] ? SEASON_BOUNDARIES[season].label : season,
      multiplier: 1.0,
      adjusted: true,
      source: 'learned_data',
      samples: learnedData.samples,
      avgDTM: learnedData.avgDTM
    };
  }

  // PRIORITY 2: Try crop-specific seasonal DTM from CROPS sheet
  var cropSeasonalDTM = getCropSeasonalDTM(cropName);
  if (cropSeasonalDTM) {
    var seasonalDTM = null;
    if ((season === 'EarlySpring' || season === 'LateSpring') && cropSeasonalDTM.spring) {
      seasonalDTM = cropSeasonalDTM.spring;
    } else if ((season === 'Summer' || season === 'LateSummer') && cropSeasonalDTM.summer) {
      seasonalDTM = cropSeasonalDTM.summer;
    } else if ((season === 'Fall' || season === 'LateFall') && cropSeasonalDTM.fall) {
      seasonalDTM = cropSeasonalDTM.fall;
    }

    if (seasonalDTM) {
      return {
        min: Math.round(seasonalDTM * 0.85),
        max: Math.round(seasonalDTM * 1.15),
        harvestWindow: baseFieldDays.harvestWindow,
        multiHarvest: baseFieldDays.multiHarvest,
        season: season,
        seasonLabel: SEASON_BOUNDARIES[season] ? SEASON_BOUNDARIES[season].label : season,
        multiplier: 1.0,
        adjusted: true,
        source: 'crop_profile'
      };
    }
  }

  // PRIORITY 3: Apply default seasonal multiplier (guessed - least reliable)
  return {
    min: Math.round(baseFieldDays.min * multiplier),
    max: Math.round(baseFieldDays.max * multiplier),
    harvestWindow: baseFieldDays.harvestWindow,
    multiHarvest: baseFieldDays.multiHarvest,
    season: season,
    seasonLabel: SEASON_BOUNDARIES[season] ? SEASON_BOUNDARIES[season].label : season,
    multiplier: multiplier,
    adjusted: multiplier !== 1.0,
    source: 'default_multiplier'
  };
}

/**
 * Get learned DTM data for a specific crop and season from DTM_LEARNING sheet
 * This is the internal function used by getSeasonalFieldDays
 *
 * @param {string} cropName - Name of the crop
 * @param {string} season - Season to filter by
 * @returns {Object|null} { avgDTM, min, max, samples } or null if not enough data
 */
function getLearnedDTMForCrop(cropName, season) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var dtmSheet = ss.getSheetByName('DTM_LEARNING');

    if (!dtmSheet || dtmSheet.getLastRow() < 2) {
      return null;
    }

    var data = dtmSheet.getDataRange().getValues();
    var headers = data[0];

    var cropCol = headers.indexOf('Crop');
    var actualDTMCol = headers.indexOf('Actual_DTM');
    var seasonCol = headers.indexOf('Season');

    if (cropCol === -1 || actualDTMCol === -1) return null;

    var normalizedCrop = String(cropName).toLowerCase().trim();
    var dtmValues = [];

    for (var i = 1; i < data.length; i++) {
      var rowCrop = String(data[i][cropCol]).toLowerCase().trim();
      var rowSeason = String(data[i][seasonCol]).trim();
      var rowDTM = Number(data[i][actualDTMCol]);

      if (rowCrop === normalizedCrop && rowSeason === season && rowDTM > 0) {
        dtmValues.push(rowDTM);
      }
    }

    if (dtmValues.length === 0) return null;

    var avgDTM = Math.round(dtmValues.reduce(function(a, b) { return a + b; }, 0) / dtmValues.length);
    var minDTM = Math.min.apply(null, dtmValues);
    var maxDTM = Math.max.apply(null, dtmValues);

    return {
      avgDTM: avgDTM,
      min: minDTM,
      max: maxDTM,
      samples: dtmValues.length
    };

  } catch (e) {
    Logger.log('Error getting learned DTM: ' + e);
    return null;
  }
}

/**
 * Get crop-specific seasonal DTM from CROPS sheet
 * @param {string} cropName - Name of the crop
 * @returns {Object|null} { spring, summer, fall, average } or null if not found
 */
function getCropSeasonalDTM(cropName) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('CROPS');
    if (!sheet) return null;

    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    var cropCol = headers.indexOf('Crop_Name');
    var springCol = headers.indexOf('DTM_Spring');
    var summerCol = headers.indexOf('DTM_Summer');
    var fallCol = headers.indexOf('DTM_Fall');
    var avgCol = headers.indexOf('DTM_Average');

    if (cropCol === -1) return null;

    var normalizedCrop = String(cropName).toLowerCase().trim();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][cropCol]).toLowerCase().trim() === normalizedCrop) {
        return {
          spring: springCol >= 0 ? Number(data[i][springCol]) || null : null,
          summer: summerCol >= 0 ? Number(data[i][summerCol]) || null : null,
          fall: fallCol >= 0 ? Number(data[i][fallCol]) || null : null,
          average: avgCol >= 0 ? Number(data[i][avgCol]) || null : null
        };
      }
    }
    return null;
  } catch (e) {
    Logger.log('Error getting crop seasonal DTM: ' + e);
    return null;
  }
}

/**
 * API endpoint: Get seasonal DTM information for a crop and date
 */
function getSeasonalDTMInfo(params) {
  try {
    var crop = params.crop || params.cropName;
    var date = params.date || params.plantingDate || new Date();

    if (!crop) {
      return { success: false, error: 'Crop name required' };
    }

    var fieldDays = getSeasonalFieldDays(crop, date);
    var season = getSeasonFromDate(date);

    return {
      success: true,
      crop: crop,
      date: date instanceof Date ? date.toISOString().split('T')[0] : date,
      season: season,
      seasonLabel: SEASON_BOUNDARIES[season] ? SEASON_BOUNDARIES[season].label : season,
      multiplier: fieldDays.multiplier,
      adjusted: fieldDays.adjusted,
      source: fieldDays.source,
      fieldDays: {
        min: fieldDays.min,
        max: fieldDays.max,
        harvestWindow: fieldDays.harvestWindow,
        multiHarvest: fieldDays.multiHarvest
      },
      allSeasons: Object.keys(SEASONAL_DTM_MULTIPLIERS).map(function(s) {
        return {
          season: s,
          label: SEASON_BOUNDARIES[s] ? SEASON_BOUNDARIES[s].label : s,
          multiplier: SEASONAL_DTM_MULTIPLIERS[s]
        };
      })
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

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

// =============================================================================
// FIELD PLAN ADVISOR - Analyze, Suggest, and Apply Changes
// =============================================================================

/**
 * Analyze the current field plan and generate optimization suggestions
 * Returns suggestions that can be reviewed and approved
 */
function analyzeFieldPlan(params) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var planSheet = ss.getSheetByName('PLANNING_2026');
  var bedSheet = ss.getSheetByName('REF_Beds');

  if (!planSheet) {
    return { success: false, error: 'PLANNING_2026 sheet not found' };
  }

  var suggestions = [];
  var suggestionId = 1;

  // Get current plantings
  var planData = planSheet.getDataRange().getValues();
  var planHeaders = planData[0];

  var statusCol = planHeaders.indexOf('STATUS');
  var batchCol = planHeaders.indexOf('Batch_ID');
  var cropCol = planHeaders.indexOf('Crop');
  var varietyCol = planHeaders.indexOf('Variety');
  var bedCol = planHeaders.indexOf('Target_Bed_ID');
  var transplantCol = planHeaders.indexOf('Transplant_Date');
  var fieldSowCol = planHeaders.indexOf('Field_Sow_Date');
  var firstHarvestCol = planHeaders.indexOf('First_Harvest');
  var lastHarvestCol = planHeaders.indexOf('Last_Harvest');
  var methodCol = planHeaders.indexOf('Method');

  // Build planting list
  var plantings = [];
  for (var i = 1; i < planData.length; i++) {
    var row = planData[i];
    var status = row[statusCol];
    var crop = row[cropCol];

    if (!crop || status === 'Completed' || status === 'Cancelled') continue;

    var fieldDays = getDefaultFieldDays(crop);
    var family = getCropFamily(crop);
    var fieldStart = row[transplantCol] || row[fieldSowCol];

    plantings.push({
      rowIndex: i + 1,
      batchId: row[batchCol],
      crop: crop,
      variety: row[varietyCol],
      method: row[methodCol],
      bedId: row[bedCol],
      fieldStart: fieldStart,
      firstHarvest: row[firstHarvestCol],
      lastHarvest: row[lastHarvestCol],
      fieldDays: fieldDays.max,
      fieldTimeGroup: getFieldTimeGroup(fieldDays.max).group,
      family: family,
      status: status
    });
  }

  // Get bed information
  var beds = {};
  if (bedSheet && bedSheet.getLastRow() > 1) {
    var bedData = bedSheet.getDataRange().getValues();
    for (var i = 1; i < bedData.length; i++) {
      beds[bedData[i][0]] = {
        id: bedData[i][0],
        field: bedData[i][1],
        length: Number(bedData[i][3]) || 100,
        status: bedData[i][4]
      };
    }
  }

  // ========== ANALYSIS 1: Rotation Conflicts ==========
  var bedPlantings = {};
  for (var i = 0; i < plantings.length; i++) {
    var p = plantings[i];
    if (!p.bedId) continue;
    if (!bedPlantings[p.bedId]) bedPlantings[p.bedId] = [];
    bedPlantings[p.bedId].push(p);
  }

  for (var bedId in bedPlantings) {
    var bedHistory = getBedHistory(bedId, 4);
    var currentPlantings = bedPlantings[bedId];

    for (var i = 0; i < currentPlantings.length; i++) {
      var planting = currentPlantings[i];
      var rotationCheck = canPlantInBed(planting.crop, bedId);

      if (!rotationCheck.canPlant) {
        // Find a better bed
        var betterBed = findBetterBedForCrop(planting, beds, bedPlantings, plantings);

        if (betterBed) {
          suggestions.push({
            id: 'SUG-' + (suggestionId++),
            type: 'ROTATION_CONFLICT',
            priority: 'HIGH',
            batchId: planting.batchId,
            crop: planting.crop,
            currentBed: bedId,
            suggestedBed: betterBed.bedId,
            reason: rotationCheck.conflicts[0].message,
            action: 'MOVE_TO_BED',
            description: 'Move ' + planting.crop + ' from ' + bedId + ' to ' + betterBed.bedId + ' - ' + rotationCheck.conflicts[0].message,
            benefit: 'Prevents disease buildup and improves soil health',
            rowIndex: planting.rowIndex
          });
        }
      }
    }
  }

  // ========== ANALYSIS 2: Field Time Optimization ==========
  // Group plantings by field time and look for consolidation opportunities
  var groupedByTime = { 'Quick': [], 'Short': [], 'Medium': [], 'Long': [], 'VeryLong': [] };
  for (var i = 0; i < plantings.length; i++) {
    var p = plantings[i];
    if (groupedByTime[p.fieldTimeGroup]) {
      groupedByTime[p.fieldTimeGroup].push(p);
    }
  }

  // Look for crops in same time group that could be in adjacent beds
  for (var groupName in groupedByTime) {
    var group = groupedByTime[groupName];
    if (group.length < 2) continue;

    // Check if crops in same time group are scattered across different fields
    var fieldDistribution = {};
    for (var i = 0; i < group.length; i++) {
      var p = group[i];
      if (!p.bedId) continue;
      var bed = beds[p.bedId];
      var fieldName = bed ? bed.field : 'Unknown';
      if (!fieldDistribution[fieldName]) fieldDistribution[fieldName] = [];
      fieldDistribution[fieldName].push(p);
    }

    var fieldCount = Object.keys(fieldDistribution).length;
    if (fieldCount > 1 && group.length >= 3) {
      // Find the field with most plantings of this time group
      var bestField = null;
      var maxCount = 0;
      for (var field in fieldDistribution) {
        if (fieldDistribution[field].length > maxCount) {
          maxCount = fieldDistribution[field].length;
          bestField = field;
        }
      }

      // Suggest moving scattered plantings to the main field
      for (var field in fieldDistribution) {
        if (field === bestField) continue;
        var scattered = fieldDistribution[field];
        for (var i = 0; i < scattered.length; i++) {
          var p = scattered[i];
          var targetBed = findAvailableBedInField(bestField, p, beds, bedPlantings, plantings);

          if (targetBed) {
            suggestions.push({
              id: 'SUG-' + (suggestionId++),
              type: 'CONSOLIDATE_FIELD_TIME',
              priority: 'MEDIUM',
              batchId: p.batchId,
              crop: p.crop,
              currentBed: p.bedId,
              suggestedBed: targetBed.bedId,
              reason: 'Group ' + groupName + ' crops (' + FIELD_TIME_GROUPS[groupName].label + ') together for efficient bed prep',
              action: 'MOVE_TO_BED',
              description: 'Move ' + p.crop + ' to ' + targetBed.bedId + ' to consolidate ' + groupName + ' turnover crops in ' + bestField,
              benefit: 'Enables single bed prep pass for multiple crops with similar harvest times',
              rowIndex: p.rowIndex
            });
          }
        }
      }
    }
  }

  // ========== ANALYSIS 3: Beneficial Rotation Opportunities ==========
  // Look for beds where current crop could benefit from following a nitrogen fixer
  for (var bedId in bedPlantings) {
    var history = getBedHistory(bedId, 2);
    var currentPlantings = bedPlantings[bedId];

    // Check if bed had legumes recently
    var hadLegumes = false;
    for (var i = 0; i < history.length; i++) {
      if (history[i].family === 'Fabaceae') {
        hadLegumes = true;
        break;
      }
    }

    if (hadLegumes) {
      // Check if current plantings are heavy feeders that could benefit
      for (var i = 0; i < currentPlantings.length; i++) {
        var p = currentPlantings[i];
        if (p.family === 'Solanaceae' || p.family === 'Brassicaceae' || p.family === 'Cucurbitaceae') {
          // This is good! No suggestion needed, but we could note it
        }
      }
    } else {
      // Check if heavy feeders are planted without prior nitrogen fixers
      for (var i = 0; i < currentPlantings.length; i++) {
        var p = currentPlantings[i];
        if (p.family === 'Solanaceae' || p.family === 'Brassicaceae' || p.family === 'Cucurbitaceae') {
          // Find a bed that had legumes
          var betterBed = findBedWithPriorLegumes(p, beds, bedPlantings, plantings);
          if (betterBed && betterBed.bedId !== bedId) {
            suggestions.push({
              id: 'SUG-' + (suggestionId++),
              type: 'BENEFICIAL_ROTATION',
              priority: 'LOW',
              batchId: p.batchId,
              crop: p.crop,
              currentBed: bedId,
              suggestedBed: betterBed.bedId,
              reason: p.crop + ' is a heavy feeder that benefits from nitrogen-rich soil',
              action: 'MOVE_TO_BED',
              description: 'Move ' + p.crop + ' to ' + betterBed.bedId + ' which had legumes in ' + betterBed.legumeYear + ' - natural nitrogen boost',
              benefit: 'Heavy feeders thrive after nitrogen-fixing crops, reducing fertilizer needs',
              rowIndex: p.rowIndex
            });
          }
        }
      }
    }
  }

  // ========== ANALYSIS 4: Harvest Window Alignment ==========
  // Look for crops with similar harvest dates that could be grouped
  var harvestWindows = {};
  for (var i = 0; i < plantings.length; i++) {
    var p = plantings[i];
    if (!p.lastHarvest) continue;

    var harvestDate = new Date(p.lastHarvest);
    var weekKey = getWeekKey(harvestDate);

    if (!harvestWindows[weekKey]) harvestWindows[weekKey] = [];
    harvestWindows[weekKey].push(p);
  }

  // Find weeks with multiple harvests in different fields
  for (var weekKey in harvestWindows) {
    var weekPlantings = harvestWindows[weekKey];
    if (weekPlantings.length < 2) continue;

    var fieldDistribution = {};
    for (var i = 0; i < weekPlantings.length; i++) {
      var p = weekPlantings[i];
      if (!p.bedId) continue;
      var bed = beds[p.bedId];
      var fieldName = bed ? bed.field : 'Unknown';
      if (!fieldDistribution[fieldName]) fieldDistribution[fieldName] = [];
      fieldDistribution[fieldName].push(p);
    }

    if (Object.keys(fieldDistribution).length > 1) {
      // Could suggest consolidating, but keep it low priority
      // (This is already partially covered by field time grouping)
    }
  }

  // ========== ANALYSIS 5: Unassigned Bed Suggestions ==========
  for (var i = 0; i < plantings.length; i++) {
    var p = plantings[i];
    if (p.bedId) continue; // Already has a bed

    var bestBed = findBestBedForUnassigned(p, beds, bedPlantings, plantings);
    if (bestBed) {
      suggestions.push({
        id: 'SUG-' + (suggestionId++),
        type: 'ASSIGN_BED',
        priority: 'HIGH',
        batchId: p.batchId,
        crop: p.crop,
        currentBed: null,
        suggestedBed: bestBed.bedId,
        reason: 'Planting needs bed assignment',
        action: 'ASSIGN_BED',
        description: 'Assign ' + p.crop + ' to ' + bestBed.bedId + ' - best rotation match (score: ' + bestBed.score + ')',
        benefit: 'Optimal bed selection based on rotation history and field time grouping',
        rowIndex: p.rowIndex
      });
    }
  }

  // Sort suggestions by priority
  var priorityOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
  suggestions.sort(function(a, b) {
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Store suggestions in sheet for tracking
  saveSuggestionsToSheet(ss, suggestions);

  return {
    success: true,
    totalPlantings: plantings.length,
    suggestionsCount: suggestions.length,
    suggestions: suggestions,
    summary: {
      rotationConflicts: suggestions.filter(function(s) { return s.type === 'ROTATION_CONFLICT'; }).length,
      consolidation: suggestions.filter(function(s) { return s.type === 'CONSOLIDATE_FIELD_TIME'; }).length,
      beneficialRotation: suggestions.filter(function(s) { return s.type === 'BENEFICIAL_ROTATION'; }).length,
      bedAssignments: suggestions.filter(function(s) { return s.type === 'ASSIGN_BED'; }).length
    }
  };
}

/**
 * Helper: Find a better bed for a crop with rotation conflicts
 */
function findBetterBedForCrop(planting, beds, bedPlantings, allPlantings) {
  var bestBed = null;
  var bestScore = -999;

  for (var bedId in beds) {
    var bed = beds[bedId];
    if (bed.status === 'Inactive' || bed.status === 'Reserved') continue;
    if (bedId === planting.bedId) continue;

    var rotationCheck = canPlantInBed(planting.crop, bedId);
    if (!rotationCheck.canPlant) continue;

    var score = 50; // Base score for compatible bed

    // Bonus for beneficial rotation
    if (rotationCheck.warnings.length === 0) score += 20;

    // Check if bed has other crops in same time group (good for consolidation)
    var bedCrops = bedPlantings[bedId] || [];
    for (var i = 0; i < bedCrops.length; i++) {
      if (bedCrops[i].fieldTimeGroup === planting.fieldTimeGroup) {
        score += 10;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestBed = { bedId: bedId, score: score };
    }
  }

  return bestBed;
}

/**
 * Helper: Find available bed in a specific field
 */
function findAvailableBedInField(targetField, planting, beds, bedPlantings, allPlantings) {
  for (var bedId in beds) {
    var bed = beds[bedId];
    if (bed.field !== targetField) continue;
    if (bed.status === 'Inactive' || bed.status === 'Reserved') continue;
    if (bedId === planting.bedId) continue;

    var rotationCheck = canPlantInBed(planting.crop, bedId);
    if (rotationCheck.canPlant) {
      return { bedId: bedId };
    }
  }
  return null;
}

/**
 * Helper: Find a bed that had legumes recently
 */
function findBedWithPriorLegumes(planting, beds, bedPlantings, allPlantings) {
  for (var bedId in beds) {
    var bed = beds[bedId];
    if (bed.status === 'Inactive' || bed.status === 'Reserved') continue;
    if (bedId === planting.bedId) continue;

    var history = getBedHistory(bedId, 2);
    for (var i = 0; i < history.length; i++) {
      if (history[i].family === 'Fabaceae') {
        var rotationCheck = canPlantInBed(planting.crop, bedId);
        if (rotationCheck.canPlant) {
          return { bedId: bedId, legumeYear: history[i].year };
        }
      }
    }
  }
  return null;
}

/**
 * Helper: Find best bed for unassigned planting
 */
function findBestBedForUnassigned(planting, beds, bedPlantings, allPlantings) {
  var bestBed = null;
  var bestScore = -999;

  for (var bedId in beds) {
    var bed = beds[bedId];
    if (bed.status === 'Inactive' || bed.status === 'Reserved') continue;

    var rotationCheck = canPlantInBed(planting.crop, bedId);
    var score = 0;

    if (rotationCheck.canPlant) {
      score += 50;
      if (rotationCheck.warnings.length === 0) score += 20;

      // Bonus for matching field time group
      var bedCrops = bedPlantings[bedId] || [];
      for (var i = 0; i < bedCrops.length; i++) {
        if (bedCrops[i].fieldTimeGroup === planting.fieldTimeGroup) {
          score += 15;
        }
      }
    } else {
      score -= 100; // Penalize rotation conflicts
    }

    if (score > bestScore) {
      bestScore = score;
      bestBed = { bedId: bedId, score: score };
    }
  }

  return bestBed;
}

/**
 * Helper: Get week key for grouping by harvest date
 */
function getWeekKey(date) {
  var d = new Date(date);
  var year = d.getFullYear();
  var week = Math.ceil((d - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
  return year + '-W' + week;
}

/**
 * Save suggestions to a tracking sheet
 */
function saveSuggestionsToSheet(ss, suggestions) {
  var sheet = ss.getSheetByName('FIELD_PLAN_SUGGESTIONS');

  if (!sheet) {
    sheet = ss.insertSheet('FIELD_PLAN_SUGGESTIONS');
    sheet.appendRow([
      'Suggestion_ID', 'Status', 'Type', 'Priority', 'Batch_ID', 'Crop',
      'Current_Bed', 'Suggested_Bed', 'Description', 'Benefit', 'Created', 'Resolved'
    ]);
    sheet.getRange(1, 1, 1, 12).setFontWeight('bold').setBackground('#4a86e8').setFontColor('white');
  }

  // Clear old pending suggestions
  var existingData = sheet.getDataRange().getValues();
  var rowsToDelete = [];
  for (var i = existingData.length - 1; i >= 1; i--) {
    if (existingData[i][1] === 'PENDING') {
      rowsToDelete.push(i + 1);
    }
  }
  for (var i = 0; i < rowsToDelete.length; i++) {
    sheet.deleteRow(rowsToDelete[i]);
  }

  // Add new suggestions
  var now = new Date().toISOString();
  for (var i = 0; i < suggestions.length; i++) {
    var s = suggestions[i];
    sheet.appendRow([
      s.id, 'PENDING', s.type, s.priority, s.batchId, s.crop,
      s.currentBed || '', s.suggestedBed || '', s.description, s.benefit, now, ''
    ]);
  }

  // Color code by priority
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  for (var i = 1; i < values.length; i++) {
    var priority = values[i][3];
    var color = priority === 'HIGH' ? '#f4cccc' : priority === 'MEDIUM' ? '#fff2cc' : '#d9ead3';
    sheet.getRange(i + 1, 1, 1, 12).setBackground(color);
  }
}

/**
 * Get pending suggestions
 */
function getFieldPlanSuggestions(params) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('FIELD_PLAN_SUGGESTIONS');

  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, suggestions: [], message: 'No suggestions found. Run analyzeFieldPlan() first.' };
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var suggestions = [];

  var statusFilter = params && params.status ? params.status : 'PENDING';

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (statusFilter && row[1] !== statusFilter) continue;

    suggestions.push({
      id: row[0],
      status: row[1],
      type: row[2],
      priority: row[3],
      batchId: row[4],
      crop: row[5],
      currentBed: row[6],
      suggestedBed: row[7],
      description: row[8],
      benefit: row[9],
      created: row[10],
      resolved: row[11],
      rowIndex: i + 1
    });
  }

  return {
    success: true,
    suggestions: suggestions,
    count: suggestions.length
  };
}

/**
 * Approve and apply a single suggestion
 */
function approveSuggestion(params) {
  var suggestionId = params.suggestionId;

  if (!suggestionId) {
    return { success: false, error: 'suggestionId required' };
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var suggestSheet = ss.getSheetByName('FIELD_PLAN_SUGGESTIONS');
  var planSheet = ss.getSheetByName('PLANNING_2026');

  if (!suggestSheet || !planSheet) {
    return { success: false, error: 'Required sheets not found' };
  }

  // Find the suggestion
  var suggestData = suggestSheet.getDataRange().getValues();
  var suggestionRow = -1;
  var suggestion = null;

  for (var i = 1; i < suggestData.length; i++) {
    if (suggestData[i][0] === suggestionId) {
      suggestionRow = i + 1;
      suggestion = {
        id: suggestData[i][0],
        status: suggestData[i][1],
        type: suggestData[i][2],
        batchId: suggestData[i][4],
        crop: suggestData[i][5],
        currentBed: suggestData[i][6],
        suggestedBed: suggestData[i][7]
      };
      break;
    }
  }

  if (!suggestion) {
    return { success: false, error: 'Suggestion not found: ' + suggestionId };
  }

  if (suggestion.status !== 'PENDING') {
    return { success: false, error: 'Suggestion already processed: ' + suggestion.status };
  }

  // Find the planting row by batch ID
  var planData = planSheet.getDataRange().getValues();
  var planHeaders = planData[0];
  var batchCol = planHeaders.indexOf('Batch_ID');
  var bedCol = planHeaders.indexOf('Target_Bed_ID');

  var plantingRow = -1;
  for (var i = 1; i < planData.length; i++) {
    if (planData[i][batchCol] === suggestion.batchId) {
      plantingRow = i + 1;
      break;
    }
  }

  if (plantingRow === -1) {
    // Mark suggestion as failed
    suggestSheet.getRange(suggestionRow, 2).setValue('FAILED');
    suggestSheet.getRange(suggestionRow, 12).setValue(new Date().toISOString());
    return { success: false, error: 'Planting not found: ' + suggestion.batchId };
  }

  // Apply the change
  if (suggestion.type === 'MOVE_TO_BED' || suggestion.type === 'ASSIGN_BED' ||
      suggestion.type === 'ROTATION_CONFLICT' || suggestion.type === 'CONSOLIDATE_FIELD_TIME' ||
      suggestion.type === 'BENEFICIAL_ROTATION') {
    planSheet.getRange(plantingRow, bedCol + 1).setValue(suggestion.suggestedBed);
  }

  // Update suggestion status
  suggestSheet.getRange(suggestionRow, 2).setValue('APPROVED');
  suggestSheet.getRange(suggestionRow, 12).setValue(new Date().toISOString());

  return {
    success: true,
    message: 'Applied suggestion: ' + suggestion.id,
    change: {
      batchId: suggestion.batchId,
      crop: suggestion.crop,
      fromBed: suggestion.currentBed,
      toBed: suggestion.suggestedBed
    }
  };
}

/**
 * Reject a suggestion
 */
function rejectSuggestion(params) {
  var suggestionId = params.suggestionId;
  var reason = params.reason || '';

  if (!suggestionId) {
    return { success: false, error: 'suggestionId required' };
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('FIELD_PLAN_SUGGESTIONS');

  if (!sheet) {
    return { success: false, error: 'Suggestions sheet not found' };
  }

  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === suggestionId) {
      sheet.getRange(i + 1, 2).setValue('REJECTED');
      sheet.getRange(i + 1, 12).setValue(new Date().toISOString());
      if (reason) {
        var currentBenefit = sheet.getRange(i + 1, 10).getValue();
        sheet.getRange(i + 1, 10).setValue(currentBenefit + ' [REJECTED: ' + reason + ']');
      }
      return { success: true, message: 'Rejected suggestion: ' + suggestionId };
    }
  }

  return { success: false, error: 'Suggestion not found: ' + suggestionId };
}

/**
 * Approve all pending suggestions
 */
function approveAllSuggestions(params) {
  var typeFilter = params && params.type ? params.type : null;
  var priorityFilter = params && params.priority ? params.priority : null;

  var pending = getFieldPlanSuggestions({ status: 'PENDING' });

  if (!pending.success) {
    return pending;
  }

  var results = {
    success: true,
    approved: [],
    failed: [],
    skipped: []
  };

  for (var i = 0; i < pending.suggestions.length; i++) {
    var s = pending.suggestions[i];

    // Apply filters
    if (typeFilter && s.type !== typeFilter) {
      results.skipped.push(s.id);
      continue;
    }
    if (priorityFilter && s.priority !== priorityFilter) {
      results.skipped.push(s.id);
      continue;
    }

    var result = approveSuggestion({ suggestionId: s.id });
    if (result.success) {
      results.approved.push(s.id);
    } else {
      results.failed.push({ id: s.id, error: result.error });
    }
  }

  results.summary = {
    total: pending.suggestions.length,
    approved: results.approved.length,
    failed: results.failed.length,
    skipped: results.skipped.length
  };

  return results;
}

// =============================================================================
// UNASSIGNED PLANTING ANALYZER & SUCCESSION PLANNING
// =============================================================================

/**
 * Analyze unassigned plantings and group them by field time
 * Calculates total space needed and suggests optimal field configurations
 */
function analyzeUnassignedPlantings(params) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var planSheet = ss.getSheetByName('PLANNING_2026');
  var profileSheet = ss.getSheetByName('REF_CropProfiles');
  var bedSheet = ss.getSheetByName('REF_Beds');

  if (!planSheet) {
    return { success: false, error: 'PLANNING_2026 sheet not found' };
  }

  // Get planning data
  var planData = planSheet.getDataRange().getValues();
  var planHeaders = planData[0];

  var statusCol = planHeaders.indexOf('STATUS');
  var batchCol = planHeaders.indexOf('Batch_ID');
  var cropCol = planHeaders.indexOf('Crop');
  var varietyCol = planHeaders.indexOf('Variety');
  var bedCol = planHeaders.indexOf('Target_Bed_ID');
  var transplantCol = planHeaders.indexOf('Transplant_Date');
  var fieldSowCol = planHeaders.indexOf('Field_Sow_Date');
  var firstHarvestCol = planHeaders.indexOf('First_Harvest');
  var lastHarvestCol = planHeaders.indexOf('Last_Harvest');
  var methodCol = planHeaders.indexOf('Method');
  var feetCol = planHeaders.indexOf('Bed_Feet');

  // Build unassigned plantings list
  var unassigned = [];
  var assigned = [];

  for (var i = 1; i < planData.length; i++) {
    var row = planData[i];
    var status = row[statusCol];
    var crop = row[cropCol];
    var bedId = row[bedCol];

    if (!crop || status === 'Completed' || status === 'Cancelled') continue;

    var fieldDays = getDefaultFieldDays(crop);
    var family = getCropFamily(crop);
    var fieldStart = row[transplantCol] || row[fieldSowCol];
    var fieldTimeGroup = getFieldTimeGroup(fieldDays.max);

    var planting = {
      rowIndex: i + 1,
      batchId: row[batchCol],
      crop: crop,
      variety: row[varietyCol],
      method: row[methodCol],
      bedId: bedId,
      bedFeet: Number(row[feetCol]) || 50,
      fieldStart: fieldStart,
      firstHarvest: row[firstHarvestCol],
      lastHarvest: row[lastHarvestCol],
      fieldDaysMin: fieldDays.min,
      fieldDaysMax: fieldDays.max,
      fieldTimeGroup: fieldTimeGroup.group,
      fieldTimeLabel: fieldTimeGroup.label,
      family: family,
      status: status
    };

    if (!bedId || bedId === '' || bedId === 'TBD' || bedId === 'Unassigned') {
      unassigned.push(planting);
    } else {
      assigned.push(planting);
    }
  }

  // Group unassigned by field time
  var groupedByTime = {
    'Quick': { plantings: [], totalFeet: 0, crops: {} },
    'Short': { plantings: [], totalFeet: 0, crops: {} },
    'Medium': { plantings: [], totalFeet: 0, crops: {} },
    'Long': { plantings: [], totalFeet: 0, crops: {} },
    'VeryLong': { plantings: [], totalFeet: 0, crops: {} }
  };

  for (var i = 0; i < unassigned.length; i++) {
    var p = unassigned[i];
    var group = groupedByTime[p.fieldTimeGroup];
    if (group) {
      group.plantings.push(p);
      group.totalFeet += p.bedFeet;
      if (!group.crops[p.crop]) {
        group.crops[p.crop] = { count: 0, totalFeet: 0, family: p.family };
      }
      group.crops[p.crop].count++;
      group.crops[p.crop].totalFeet += p.bedFeet;
    }
  }

  // Get bed information for space calculations
  var beds = {};
  var totalAvailableFeet = 0;
  var availableBedsByField = {};

  if (bedSheet && bedSheet.getLastRow() > 1) {
    var bedData = bedSheet.getDataRange().getValues();
    var bedHeaders = bedData[0];
    var bedIdCol = bedHeaders.indexOf('Bed_ID') !== -1 ? bedHeaders.indexOf('Bed_ID') : 0;
    var bedFieldCol = bedHeaders.indexOf('Field') !== -1 ? bedHeaders.indexOf('Field') : 1;
    var bedLengthCol = bedHeaders.indexOf('Length_Feet') !== -1 ? bedHeaders.indexOf('Length_Feet') : 3;
    var bedStatusCol = bedHeaders.indexOf('Status') !== -1 ? bedHeaders.indexOf('Status') : 4;

    for (var i = 1; i < bedData.length; i++) {
      var bedId = bedData[i][bedIdCol];
      var field = bedData[i][bedFieldCol];
      var length = Number(bedData[i][bedLengthCol]) || 100;
      var bedStatus = bedData[i][bedStatusCol];

      if (bedStatus === 'Inactive' || bedStatus === 'Reserved') continue;

      beds[bedId] = {
        id: bedId,
        field: field,
        length: length,
        status: bedStatus
      };

      if (!availableBedsByField[field]) {
        availableBedsByField[field] = { beds: [], totalFeet: 0 };
      }
      availableBedsByField[field].beds.push(beds[bedId]);
      availableBedsByField[field].totalFeet += length;
      totalAvailableFeet += length;
    }
  }

  // Calculate field size suggestions
  var fieldSizeSuggestions = [];
  var totalUnassignedFeet = 0;

  for (var groupName in groupedByTime) {
    var group = groupedByTime[groupName];
    if (group.plantings.length === 0) continue;

    totalUnassignedFeet += group.totalFeet;

    // Calculate how many beds needed
    var avgBedLength = 100; // Assume 100ft beds
    var bedsNeeded = Math.ceil(group.totalFeet / avgBedLength);

    fieldSizeSuggestions.push({
      fieldTimeGroup: groupName,
      label: FIELD_TIME_GROUPS[groupName].label,
      plantingCount: group.plantings.length,
      totalFeetNeeded: group.totalFeet,
      bedsNeeded: bedsNeeded,
      suggestedFieldSize: group.totalFeet + ' linear feet (' + bedsNeeded + ' beds @ 100ft)',
      crops: group.crops
    });
  }

  // Find gaps where successions could fit
  var successionOpportunities = findSuccessionGaps({
    assigned: assigned,
    unassigned: unassigned,
    beds: beds
  });

  return {
    success: true,
    summary: {
      totalUnassigned: unassigned.length,
      totalAssigned: assigned.length,
      totalUnassignedFeet: totalUnassignedFeet,
      totalAvailableFeet: totalAvailableFeet,
      spaceDeficit: totalUnassignedFeet > totalAvailableFeet ? totalUnassignedFeet - totalAvailableFeet : 0
    },
    groupedByFieldTime: groupedByTime,
    fieldSizeSuggestions: fieldSizeSuggestions,
    successionOpportunities: successionOpportunities,
    availableBedsByField: availableBedsByField
  };
}

/**
 * Find gaps in existing bed schedules where successions could fit
 */
function findSuccessionGaps(params) {
  var assigned = params.assigned || [];
  var unassigned = params.unassigned || [];
  var beds = params.beds || {};

  // Build bed occupancy timeline
  var bedOccupancy = {};

  for (var i = 0; i < assigned.length; i++) {
    var p = assigned[i];
    if (!p.bedId || !p.fieldStart) continue;

    if (!bedOccupancy[p.bedId]) {
      bedOccupancy[p.bedId] = {
        bed: beds[p.bedId] || { id: p.bedId, length: 100 },
        occupiedPeriods: [],
        gaps: []
      };
    }

    var startDate = new Date(p.fieldStart);
    var endDate = p.lastHarvest ? new Date(p.lastHarvest) : new Date(startDate.getTime() + p.fieldDaysMax * 24 * 60 * 60 * 1000);

    bedOccupancy[p.bedId].occupiedPeriods.push({
      crop: p.crop,
      batchId: p.batchId,
      family: p.family,
      start: startDate,
      end: endDate,
      fieldTimeGroup: p.fieldTimeGroup
    });
  }

  // Calculate gaps for each bed
  var opportunities = [];
  var seasonStart = new Date('2026-03-01');
  var seasonEnd = new Date('2026-11-15');

  for (var bedId in bedOccupancy) {
    var bed = bedOccupancy[bedId];
    var periods = bed.occupiedPeriods;

    // Sort by start date
    periods.sort(function(a, b) { return a.start - b.start; });

    // Find gaps
    var lastEnd = seasonStart;

    for (var i = 0; i < periods.length; i++) {
      var period = periods[i];

      // Gap before this period?
      if (period.start > lastEnd) {
        var gapDays = Math.floor((period.start - lastEnd) / (24 * 60 * 60 * 1000));

        if (gapDays >= 21) { // Minimum 21 days for even quick crops
          bed.gaps.push({
            start: lastEnd,
            end: period.start,
            days: gapDays,
            afterCrop: i > 0 ? periods[i-1].crop : null,
            beforeCrop: period.crop,
            afterFamily: i > 0 ? periods[i-1].family : null,
            beforeFamily: period.family
          });
        }
      }

      if (period.end > lastEnd) {
        lastEnd = period.end;
      }
    }

    // Gap after last period until end of season?
    if (lastEnd < seasonEnd) {
      var gapDays = Math.floor((seasonEnd - lastEnd) / (24 * 60 * 60 * 1000));
      if (gapDays >= 21) {
        bed.gaps.push({
          start: lastEnd,
          end: seasonEnd,
          days: gapDays,
          afterCrop: periods.length > 0 ? periods[periods.length - 1].crop : null,
          beforeCrop: null,
          afterFamily: periods.length > 0 ? periods[periods.length - 1].family : null,
          beforeFamily: null
        });
      }
    }

    // Match unassigned plantings to gaps
    for (var g = 0; g < bed.gaps.length; g++) {
      var gap = bed.gaps[g];
      var fittingPlantings = [];

      for (var u = 0; u < unassigned.length; u++) {
        var up = unassigned[u];

        // Does this planting fit in the gap?
        if (up.fieldDaysMax <= gap.days) {
          // Check rotation compatibility
          var rotationOk = true;
          if (gap.afterFamily && gap.afterFamily === up.family) {
            rotationOk = false;
          }

          if (rotationOk) {
            fittingPlantings.push({
              batchId: up.batchId,
              crop: up.crop,
              variety: up.variety,
              fieldDays: up.fieldDaysMax,
              bedFeet: up.bedFeet,
              fieldTimeGroup: up.fieldTimeGroup,
              rotationScore: gap.afterFamily ? (ROTATION_COMPATIBILITY[gap.afterFamily] ? ROTATION_COMPATIBILITY[gap.afterFamily][up.family] || 1 : 1) : 1
            });
          }
        }
      }

      if (fittingPlantings.length > 0) {
        // Sort by rotation score (beneficial first)
        fittingPlantings.sort(function(a, b) { return b.rotationScore - a.rotationScore; });

        opportunities.push({
          bedId: bedId,
          field: bed.bed.field,
          bedLength: bed.bed.length,
          gapStart: gap.start.toISOString().split('T')[0],
          gapEnd: gap.end.toISOString().split('T')[0],
          gapDays: gap.days,
          afterCrop: gap.afterCrop,
          fittingPlantings: fittingPlantings.slice(0, 5), // Top 5 options
          recommendation: fittingPlantings[0] ? 'Best fit: ' + fittingPlantings[0].crop + ' (' + fittingPlantings[0].fieldDays + ' days)' : 'No suitable crops found'
        });
      }
    }
  }

  // Sort opportunities by gap size (largest first)
  opportunities.sort(function(a, b) { return b.gapDays - a.gapDays; });

  return {
    totalGapsFound: opportunities.length,
    opportunities: opportunities
  };
}

/**
 * Generate comprehensive field plan report
 * This is the main function to generate a full planning analysis
 */
function generateFieldPlanReport(params) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Get all analyses
  var unassignedAnalysis = analyzeUnassignedPlantings({});
  var fieldPlanAnalysis = analyzeFieldPlan({});

  if (!unassignedAnalysis.success || !fieldPlanAnalysis.success) {
    return {
      success: false,
      error: 'Failed to generate analyses',
      unassignedError: unassignedAnalysis.error,
      fieldPlanError: fieldPlanAnalysis.error
    };
  }

  // Build the report
  var report = {
    generatedAt: new Date().toISOString(),
    success: true,

    // Executive Summary
    executiveSummary: {
      totalPlantings: fieldPlanAnalysis.totalPlantings,
      unassignedPlantings: unassignedAnalysis.summary.totalUnassigned,
      assignedPlantings: unassignedAnalysis.summary.totalAssigned,
      percentAssigned: Math.round((unassignedAnalysis.summary.totalAssigned / fieldPlanAnalysis.totalPlantings) * 100) + '%',
      totalSpaceNeeded: unassignedAnalysis.summary.totalUnassignedFeet + ' feet',
      totalSpaceAvailable: unassignedAnalysis.summary.totalAvailableFeet + ' feet',
      spaceDeficit: unassignedAnalysis.summary.spaceDeficit > 0 ?
        unassignedAnalysis.summary.spaceDeficit + ' feet shortage' : 'No shortage - space available',
      suggestionsGenerated: fieldPlanAnalysis.suggestionsCount,
      criticalIssues: fieldPlanAnalysis.summary.rotationConflicts
    },

    // Unassigned Plantings by Field Time Group
    unassignedByFieldTime: [],

    // Field Size Recommendations
    fieldSizeRecommendations: unassignedAnalysis.fieldSizeSuggestions,

    // Succession Opportunities
    successionOpportunities: unassignedAnalysis.successionOpportunities,

    // Optimization Suggestions
    optimizationSuggestions: {
      high: fieldPlanAnalysis.suggestions.filter(function(s) { return s.priority === 'HIGH'; }),
      medium: fieldPlanAnalysis.suggestions.filter(function(s) { return s.priority === 'MEDIUM'; }),
      low: fieldPlanAnalysis.suggestions.filter(function(s) { return s.priority === 'LOW'; })
    },

    // Detailed Groupings
    detailedGroupings: unassignedAnalysis.groupedByFieldTime
  };

  // Format unassigned by field time for easy reading
  for (var groupName in unassignedAnalysis.groupedByFieldTime) {
    var group = unassignedAnalysis.groupedByFieldTime[groupName];
    if (group.plantings.length > 0) {
      var cropList = [];
      for (var crop in group.crops) {
        cropList.push(crop + ' (' + group.crops[crop].count + ' plantings, ' + group.crops[crop].totalFeet + ' ft)');
      }

      report.unassignedByFieldTime.push({
        group: groupName,
        label: FIELD_TIME_GROUPS[groupName].label,
        color: FIELD_TIME_GROUPS[groupName].color,
        plantingCount: group.plantings.length,
        totalFeet: group.totalFeet,
        crops: cropList
      });
    }
  }

  // Generate text summary for quick reading
  report.textSummary = generateTextSummary(report);

  // Save report to sheet
  saveReportToSheet(ss, report);

  return report;
}

/**
 * Generate human-readable text summary
 */
function generateTextSummary(report) {
  var lines = [];

  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('FIELD PLAN REPORT - Generated ' + new Date().toLocaleDateString());
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('');

  // Executive Summary
  lines.push('OVERVIEW');
  lines.push('────────');
  lines.push('• Total plantings: ' + report.executiveSummary.totalPlantings);
  lines.push('• Assigned to beds: ' + report.executiveSummary.assignedPlantings + ' (' + report.executiveSummary.percentAssigned + ')');
  lines.push('• Unassigned: ' + report.executiveSummary.unassignedPlantings);
  lines.push('• Space needed for unassigned: ' + report.executiveSummary.totalSpaceNeeded);
  lines.push('• Available bed space: ' + report.executiveSummary.totalSpaceAvailable);
  lines.push('• ' + report.executiveSummary.spaceDeficit);
  lines.push('');

  // Issues
  if (report.executiveSummary.criticalIssues > 0) {
    lines.push('⚠️  CRITICAL: ' + report.executiveSummary.criticalIssues + ' rotation conflicts detected!');
    lines.push('');
  }

  // Unassigned by Field Time
  if (report.unassignedByFieldTime.length > 0) {
    lines.push('UNASSIGNED PLANTINGS BY FIELD TIME');
    lines.push('───────────────────────────────────');

    for (var i = 0; i < report.unassignedByFieldTime.length; i++) {
      var group = report.unassignedByFieldTime[i];
      lines.push('');
      lines.push(group.label.toUpperCase());
      lines.push('  Plantings: ' + group.plantingCount + ' | Total feet: ' + group.totalFeet);
      lines.push('  Crops: ' + group.crops.join(', '));
    }
    lines.push('');
  }

  // Field Size Recommendations
  if (report.fieldSizeRecommendations.length > 0) {
    lines.push('FIELD SIZE RECOMMENDATIONS');
    lines.push('──────────────────────────');

    for (var i = 0; i < report.fieldSizeRecommendations.length; i++) {
      var rec = report.fieldSizeRecommendations[i];
      lines.push('• ' + rec.label + ': ' + rec.suggestedFieldSize);
    }
    lines.push('');
  }

  // Succession Opportunities
  if (report.successionOpportunities.totalGapsFound > 0) {
    lines.push('SUCCESSION OPPORTUNITIES');
    lines.push('────────────────────────');
    lines.push(report.successionOpportunities.totalGapsFound + ' bed gaps found for succession planting:');
    lines.push('');

    var opps = report.successionOpportunities.opportunities.slice(0, 10); // Top 10
    for (var i = 0; i < opps.length; i++) {
      var opp = opps[i];
      lines.push('• Bed ' + opp.bedId + ': ' + opp.gapDays + ' day gap (' + opp.gapStart + ' to ' + opp.gapEnd + ')');
      lines.push('  ' + opp.recommendation);
      if (opp.afterCrop) {
        lines.push('  (After: ' + opp.afterCrop + ')');
      }
    }
    lines.push('');
  }

  // High Priority Suggestions
  if (report.optimizationSuggestions.high.length > 0) {
    lines.push('HIGH PRIORITY ACTIONS NEEDED');
    lines.push('────────────────────────────');

    for (var i = 0; i < Math.min(5, report.optimizationSuggestions.high.length); i++) {
      var sug = report.optimizationSuggestions.high[i];
      lines.push('• [' + sug.id + '] ' + sug.description);
    }

    if (report.optimizationSuggestions.high.length > 5) {
      lines.push('  ... and ' + (report.optimizationSuggestions.high.length - 5) + ' more');
    }
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('Run approveSuggestion() or approveAllSuggestions() to apply changes');
  lines.push('═══════════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Save report to a sheet for reference
 */
function saveReportToSheet(ss, report) {
  var sheet = ss.getSheetByName('FIELD_PLAN_REPORT');

  if (!sheet) {
    sheet = ss.insertSheet('FIELD_PLAN_REPORT');
  }

  // Clear and write report
  sheet.clear();

  // Header
  sheet.getRange('A1').setValue('FIELD PLAN REPORT').setFontSize(14).setFontWeight('bold');
  sheet.getRange('A2').setValue('Generated: ' + report.generatedAt);

  // Executive Summary
  sheet.getRange('A4').setValue('EXECUTIVE SUMMARY').setFontWeight('bold').setBackground('#4a86e8').setFontColor('white');
  sheet.getRange('A5').setValue('Total Plantings');
  sheet.getRange('B5').setValue(report.executiveSummary.totalPlantings);
  sheet.getRange('A6').setValue('Assigned');
  sheet.getRange('B6').setValue(report.executiveSummary.assignedPlantings);
  sheet.getRange('A7').setValue('Unassigned');
  sheet.getRange('B7').setValue(report.executiveSummary.unassignedPlantings);
  sheet.getRange('A8').setValue('Space Needed');
  sheet.getRange('B8').setValue(report.executiveSummary.totalSpaceNeeded);
  sheet.getRange('A9').setValue('Space Available');
  sheet.getRange('B9').setValue(report.executiveSummary.totalSpaceAvailable);
  sheet.getRange('A10').setValue('Rotation Conflicts');
  sheet.getRange('B10').setValue(report.executiveSummary.criticalIssues);
  sheet.getRange('A11').setValue('Suggestions');
  sheet.getRange('B11').setValue(report.executiveSummary.suggestionsGenerated);

  // Unassigned by Field Time
  var row = 13;
  sheet.getRange('A' + row).setValue('UNASSIGNED BY FIELD TIME').setFontWeight('bold').setBackground('#4a86e8').setFontColor('white');
  sheet.getRange('A' + (row+1) + ':E' + (row+1)).setValues([['Group', 'Plantings', 'Total Feet', 'Crops', '']]);
  sheet.getRange('A' + (row+1) + ':E' + (row+1)).setFontWeight('bold');
  row += 2;

  for (var i = 0; i < report.unassignedByFieldTime.length; i++) {
    var group = report.unassignedByFieldTime[i];
    sheet.getRange('A' + row + ':E' + row).setValues([[
      group.label,
      group.plantingCount,
      group.totalFeet,
      group.crops.join(', '),
      ''
    ]]);
    sheet.getRange('A' + row).setBackground(group.color);
    row++;
  }

  // Succession Opportunities
  row += 2;
  sheet.getRange('A' + row).setValue('SUCCESSION OPPORTUNITIES').setFontWeight('bold').setBackground('#4a86e8').setFontColor('white');
  sheet.getRange('A' + (row+1) + ':E' + (row+1)).setValues([['Bed', 'Gap Days', 'Start', 'End', 'Recommendation']]);
  sheet.getRange('A' + (row+1) + ':E' + (row+1)).setFontWeight('bold');
  row += 2;

  var opps = report.successionOpportunities.opportunities.slice(0, 20);
  for (var i = 0; i < opps.length; i++) {
    var opp = opps[i];
    sheet.getRange('A' + row + ':E' + row).setValues([[
      opp.bedId,
      opp.gapDays,
      opp.gapStart,
      opp.gapEnd,
      opp.recommendation
    ]]);
    row++;
  }

  // Autosize columns
  sheet.autoResizeColumns(1, 5);
}

/**
 * Get optimal bed assignments for all unassigned plantings
 * Returns a complete assignment plan that can be reviewed and approved
 */
function getOptimalBedAssignments(params) {
  var analysis = analyzeUnassignedPlantings({});

  if (!analysis.success) {
    return analysis;
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var bedSheet = ss.getSheetByName('REF_Beds');
  var planSheet = ss.getSheetByName('PLANNING_2026');

  // Get all beds
  var beds = {};
  var bedsByField = {};

  if (bedSheet && bedSheet.getLastRow() > 1) {
    var bedData = bedSheet.getDataRange().getValues();
    for (var i = 1; i < bedData.length; i++) {
      var bedId = bedData[i][0];
      var field = bedData[i][1];
      var length = Number(bedData[i][3]) || 100;
      var status = bedData[i][4];

      if (status === 'Inactive' || status === 'Reserved') continue;

      beds[bedId] = { id: bedId, field: field, length: length, assigned: [] };

      if (!bedsByField[field]) bedsByField[field] = [];
      bedsByField[field].push(beds[bedId]);
    }
  }

  // Get current bed assignments
  var planData = planSheet.getDataRange().getValues();
  var planHeaders = planData[0];
  var bedCol = planHeaders.indexOf('Target_Bed_ID');
  var cropCol = planHeaders.indexOf('Crop');
  var lastHarvestCol = planHeaders.indexOf('Last_Harvest');

  for (var i = 1; i < planData.length; i++) {
    var bedId = planData[i][bedCol];
    if (bedId && beds[bedId]) {
      beds[bedId].assigned.push({
        crop: planData[i][cropCol],
        lastHarvest: planData[i][lastHarvestCol]
      });
    }
  }

  // Create assignment plan by field time group
  var assignmentPlan = [];
  var assignmentsByGroup = {};

  for (var groupName in analysis.groupedByFieldTime) {
    var group = analysis.groupedByFieldTime[groupName];
    if (group.plantings.length === 0) continue;

    assignmentsByGroup[groupName] = [];

    // Sort plantings by feet needed (largest first for better packing)
    var sortedPlantings = group.plantings.sort(function(a, b) {
      return b.bedFeet - a.bedFeet;
    });

    for (var i = 0; i < sortedPlantings.length; i++) {
      var planting = sortedPlantings[i];

      // Find best bed for this planting
      var bestBed = null;
      var bestScore = -999;

      for (var bedId in beds) {
        var bed = beds[bedId];
        var rotationCheck = canPlantInBed(planting.crop, bedId);

        var score = 0;
        if (rotationCheck.canPlant) {
          score += 50;

          // Prefer beds with same field time group crops
          for (var j = 0; j < bed.assigned.length; j++) {
            var assignedCrop = bed.assigned[j];
            var assignedFieldDays = getDefaultFieldDays(assignedCrop.crop);
            var assignedGroup = getFieldTimeGroup(assignedFieldDays.max);
            if (assignedGroup.group === groupName) {
              score += 20;
            }
          }

          // Prefer beds that aren't fully packed
          if (bed.assigned.length < 3) {
            score += 10;
          }
        } else {
          score -= 100;
        }

        if (score > bestScore) {
          bestScore = score;
          bestBed = { bedId: bedId, score: score };
        }
      }

      var assignment = {
        batchId: planting.batchId,
        crop: planting.crop,
        variety: planting.variety,
        bedFeet: planting.bedFeet,
        fieldTimeGroup: groupName,
        suggestedBed: bestBed ? bestBed.bedId : null,
        score: bestBed ? bestBed.score : 0,
        status: bestBed && bestBed.score >= 50 ? 'GOOD_FIT' : bestBed && bestBed.score > 0 ? 'ACCEPTABLE' : 'NO_GOOD_OPTION'
      };

      assignmentsByGroup[groupName].push(assignment);
      assignmentPlan.push(assignment);

      // Track assignment in bed
      if (bestBed && beds[bestBed.bedId]) {
        beds[bestBed.bedId].assigned.push({
          crop: planting.crop,
          batchId: planting.batchId
        });
      }
    }
  }

  return {
    success: true,
    totalAssignments: assignmentPlan.length,
    assignmentsByGroup: assignmentsByGroup,
    assignmentPlan: assignmentPlan,
    summary: {
      goodFit: assignmentPlan.filter(function(a) { return a.status === 'GOOD_FIT'; }).length,
      acceptable: assignmentPlan.filter(function(a) { return a.status === 'ACCEPTABLE'; }).length,
      noGoodOption: assignmentPlan.filter(function(a) { return a.status === 'NO_GOOD_OPTION'; }).length
    }
  };
}

/**
 * Apply optimal bed assignments
 */
function applyOptimalAssignments(params) {
  var plan = getOptimalBedAssignments({});

  if (!plan.success) {
    return plan;
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var planSheet = ss.getSheetByName('PLANNING_2026');
  var planData = planSheet.getDataRange().getValues();
  var planHeaders = planData[0];

  var batchCol = planHeaders.indexOf('Batch_ID');
  var bedCol = planHeaders.indexOf('Target_Bed_ID');

  var applied = 0;
  var skipped = 0;

  for (var i = 0; i < plan.assignmentPlan.length; i++) {
    var assignment = plan.assignmentPlan[i];

    if (!assignment.suggestedBed || assignment.status === 'NO_GOOD_OPTION') {
      skipped++;
      continue;
    }

    // Find the planting row
    for (var j = 1; j < planData.length; j++) {
      if (planData[j][batchCol] === assignment.batchId) {
        planSheet.getRange(j + 1, bedCol + 1).setValue(assignment.suggestedBed);
        applied++;
        break;
      }
    }
  }

  return {
    success: true,
    message: 'Applied ' + applied + ' bed assignments, skipped ' + skipped,
    applied: applied,
    skipped: skipped
  };
}

/**
 * Test the Field Plan Advisor
 */
function testFieldPlanAdvisor() {
  Logger.log('=== Testing Field Plan Advisor ===');

  // Run analysis
  var analysis = analyzeFieldPlan({});
  Logger.log('Analysis result: ' + JSON.stringify(analysis.summary));
  Logger.log('Total suggestions: ' + analysis.suggestionsCount);

  if (analysis.suggestions.length > 0) {
    Logger.log('First suggestion: ' + JSON.stringify(analysis.suggestions[0]));
  }

  // Get pending suggestions
  var pending = getFieldPlanSuggestions({ status: 'PENDING' });
  Logger.log('Pending suggestions: ' + pending.count);

  Logger.log('=== Field Plan Advisor Test Complete ===');
}

/**
 * Test unassigned planting analysis
 */
function testUnassignedAnalysis() {
  Logger.log('=== Testing Unassigned Planting Analysis ===');

  var result = analyzeUnassignedPlantings({});
  Logger.log('Summary: ' + JSON.stringify(result.summary));
  Logger.log('Field size suggestions: ' + JSON.stringify(result.fieldSizeSuggestions));
  Logger.log('Succession opportunities: ' + result.successionOpportunities.totalGapsFound);

  Logger.log('=== Test Complete ===');
}

// =============================================================================
// ASSIGN PLANTINGS TO SPECIFIC FIELD
// =============================================================================

/**
 * Assign selected plantings to a specific field
 * Works around existing plantings and optimizes bed assignments
 *
 * @param {Object} params
 * @param {string[]} params.batchIds - Array of batch IDs to assign
 * @param {string} params.targetField - Field name to assign to
 * @param {boolean} params.apply - If true, apply changes. If false, just preview
 * @returns {Object} Assignment results with preview or applied changes
 */
function assignPlantingsToField(params) {
  var batchIds = params.batchIds;
  var targetField = params.targetField;
  var applyChanges = params.apply === true || params.apply === 'true';

  if (!batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
    // Try parsing as JSON string
    if (typeof params.batchIds === 'string') {
      try {
        batchIds = JSON.parse(params.batchIds);
      } catch (e) {
        return { success: false, error: 'batchIds must be an array of batch IDs' };
      }
    } else {
      return { success: false, error: 'batchIds must be an array of batch IDs' };
    }
  }

  if (!targetField) {
    return { success: false, error: 'targetField is required' };
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var planSheet = ss.getSheetByName('PLANNING_2026');
  var bedSheet = ss.getSheetByName('REF_Beds');

  if (!planSheet || !bedSheet) {
    return { success: false, error: 'Required sheets not found' };
  }

  // Get beds in target field
  var bedData = bedSheet.getDataRange().getValues();
  var bedHeaders = bedData[0];
  var bedIdCol = bedHeaders.indexOf('Bed_ID') !== -1 ? bedHeaders.indexOf('Bed_ID') : 0;
  var bedFieldCol = bedHeaders.indexOf('Field') !== -1 ? bedHeaders.indexOf('Field') : 1;
  var bedLengthCol = bedHeaders.indexOf('Length_Feet') !== -1 ? bedHeaders.indexOf('Length_Feet') : 3;
  var bedStatusCol = bedHeaders.indexOf('Status') !== -1 ? bedHeaders.indexOf('Status') : 4;

  var fieldBeds = [];
  for (var i = 1; i < bedData.length; i++) {
    var field = bedData[i][bedFieldCol];
    var status = bedData[i][bedStatusCol];

    if (field === targetField && status !== 'Inactive' && status !== 'Reserved') {
      fieldBeds.push({
        bedId: bedData[i][bedIdCol],
        field: field,
        length: Number(bedData[i][bedLengthCol]) || 100,
        occupiedPeriods: [],
        availableGaps: []
      });
    }
  }

  if (fieldBeds.length === 0) {
    return { success: false, error: 'No available beds found in field: ' + targetField };
  }

  // Get planning data
  var planData = planSheet.getDataRange().getValues();
  var planHeaders = planData[0];

  var statusCol = planHeaders.indexOf('STATUS');
  var batchCol = planHeaders.indexOf('Batch_ID');
  var cropCol = planHeaders.indexOf('Crop');
  var varietyCol = planHeaders.indexOf('Variety');
  var bedCol = planHeaders.indexOf('Target_Bed_ID');
  var transplantCol = planHeaders.indexOf('Transplant_Date');
  var fieldSowCol = planHeaders.indexOf('Field_Sow_Date');
  var firstHarvestCol = planHeaders.indexOf('First_Harvest');
  var lastHarvestCol = planHeaders.indexOf('Last_Harvest');
  var feetCol = planHeaders.indexOf('Bed_Feet');

  // Build bed occupancy from existing plantings
  for (var i = 1; i < planData.length; i++) {
    var row = planData[i];
    var existingBedId = row[bedCol];
    var status = row[statusCol];

    if (!existingBedId || status === 'Completed' || status === 'Cancelled') continue;

    // Find if this bed is in our target field
    for (var b = 0; b < fieldBeds.length; b++) {
      if (fieldBeds[b].bedId === existingBedId) {
        var fieldStart = row[transplantCol] || row[fieldSowCol];
        var lastHarvest = row[lastHarvestCol];

        if (fieldStart) {
          var startDate = new Date(fieldStart);
          var endDate = lastHarvest ? new Date(lastHarvest) : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000);

          fieldBeds[b].occupiedPeriods.push({
            batchId: row[batchCol],
            crop: row[cropCol],
            start: startDate,
            end: endDate,
            family: getCropFamily(row[cropCol])
          });
        }
        break;
      }
    }
  }

  // Get plantings to assign
  var plantingsToAssign = [];
  var plantingRows = {}; // Map batchId to row index

  for (var i = 1; i < planData.length; i++) {
    var row = planData[i];
    var batchId = row[batchCol];

    if (batchIds.indexOf(batchId) !== -1) {
      var fieldDays = getDefaultFieldDays(row[cropCol]);
      var fieldStart = row[transplantCol] || row[fieldSowCol];

      plantingsToAssign.push({
        batchId: batchId,
        crop: row[cropCol],
        variety: row[varietyCol],
        bedFeet: Number(row[feetCol]) || 50,
        fieldStart: fieldStart ? new Date(fieldStart) : null,
        lastHarvest: row[lastHarvestCol] ? new Date(row[lastHarvestCol]) : null,
        fieldDaysMin: fieldDays.min,
        fieldDaysMax: fieldDays.max,
        fieldTimeGroup: getFieldTimeGroup(fieldDays.max).group,
        family: getCropFamily(row[cropCol]),
        currentBed: row[bedCol]
      });

      plantingRows[batchId] = i + 1; // 1-indexed row
    }
  }

  if (plantingsToAssign.length === 0) {
    return { success: false, error: 'No matching plantings found for provided batch IDs' };
  }

  // Sort plantings by field time group and then by start date
  var groupOrder = { 'Quick': 0, 'Short': 1, 'Medium': 2, 'Long': 3, 'VeryLong': 4 };
  plantingsToAssign.sort(function(a, b) {
    var groupDiff = (groupOrder[a.fieldTimeGroup] || 5) - (groupOrder[b.fieldTimeGroup] || 5);
    if (groupDiff !== 0) return groupDiff;
    if (a.fieldStart && b.fieldStart) return a.fieldStart - b.fieldStart;
    return 0;
  });

  // Calculate gaps in each bed
  var seasonStart = new Date('2026-03-01');
  var seasonEnd = new Date('2026-11-15');

  for (var b = 0; b < fieldBeds.length; b++) {
    var bed = fieldBeds[b];
    var periods = bed.occupiedPeriods.sort(function(a, b) { return a.start - b.start; });

    var lastEnd = seasonStart;

    for (var p = 0; p < periods.length; p++) {
      if (periods[p].start > lastEnd) {
        bed.availableGaps.push({
          start: new Date(lastEnd),
          end: new Date(periods[p].start),
          days: Math.floor((periods[p].start - lastEnd) / (24 * 60 * 60 * 1000)),
          afterFamily: p > 0 ? periods[p-1].family : null
        });
      }
      if (periods[p].end > lastEnd) {
        lastEnd = new Date(periods[p].end);
      }
    }

    // Gap after last period
    if (lastEnd < seasonEnd) {
      bed.availableGaps.push({
        start: new Date(lastEnd),
        end: seasonEnd,
        days: Math.floor((seasonEnd - lastEnd) / (24 * 60 * 60 * 1000)),
        afterFamily: periods.length > 0 ? periods[periods.length - 1].family : null
      });
    }

    // If no periods, whole season is available
    if (periods.length === 0) {
      bed.availableGaps = [{
        start: seasonStart,
        end: seasonEnd,
        days: Math.floor((seasonEnd - seasonStart) / (24 * 60 * 60 * 1000)),
        afterFamily: null
      }];
    }
  }

  // Assign plantings to beds
  var assignments = [];
  var unassignable = [];

  for (var i = 0; i < plantingsToAssign.length; i++) {
    var planting = plantingsToAssign[i];
    var bestBed = null;
    var bestScore = -999;
    var bestGapIndex = -1;

    for (var b = 0; b < fieldBeds.length; b++) {
      var bed = fieldBeds[b];

      // Check rotation compatibility with bed history
      var rotationCheck = canPlantInBed(planting.crop, bed.bedId);
      if (!rotationCheck.canPlant) continue;

      // Find best gap in this bed
      for (var g = 0; g < bed.availableGaps.length; g++) {
        var gap = bed.availableGaps[g];

        // Skip if gap is too small
        if (gap.days < planting.fieldDaysMin) continue;

        // Check if planting fits in this time window
        if (planting.fieldStart) {
          if (planting.fieldStart < gap.start || planting.fieldStart > gap.end) continue;
        }

        var score = 50; // Base score for fitting

        // Bonus for rotation compatibility
        if (gap.afterFamily) {
          var compat = ROTATION_COMPATIBILITY[gap.afterFamily] ?
            ROTATION_COMPATIBILITY[gap.afterFamily][planting.family] || 1 : 1;
          score += compat * 10;
        }

        // Bonus for same field time group as other crops in bed
        for (var p = 0; p < bed.occupiedPeriods.length; p++) {
          var occupiedCrop = bed.occupiedPeriods[p].crop;
          var occupiedFieldDays = getDefaultFieldDays(occupiedCrop);
          var occupiedGroup = getFieldTimeGroup(occupiedFieldDays.max).group;
          if (occupiedGroup === planting.fieldTimeGroup) {
            score += 15;
            break;
          }
        }

        // Slight penalty for beds that are already very full
        if (bed.occupiedPeriods.length >= 3) {
          score -= 10;
        }

        if (score > bestScore) {
          bestScore = score;
          bestBed = bed;
          bestGapIndex = g;
        }
      }
    }

    if (bestBed && bestGapIndex >= 0) {
      var assignment = {
        batchId: planting.batchId,
        crop: planting.crop,
        variety: planting.variety,
        fieldTimeGroup: planting.fieldTimeGroup,
        fromBed: planting.currentBed || 'Unassigned',
        toBed: bestBed.bedId,
        score: bestScore,
        rowIndex: plantingRows[planting.batchId]
      };

      assignments.push(assignment);

      // Update bed occupancy for subsequent assignments
      var plantingEnd = planting.lastHarvest ||
        (planting.fieldStart ? new Date(planting.fieldStart.getTime() + planting.fieldDaysMax * 24 * 60 * 60 * 1000) :
         new Date(bestBed.availableGaps[bestGapIndex].start.getTime() + planting.fieldDaysMax * 24 * 60 * 60 * 1000));

      bestBed.occupiedPeriods.push({
        batchId: planting.batchId,
        crop: planting.crop,
        start: planting.fieldStart || bestBed.availableGaps[bestGapIndex].start,
        end: plantingEnd,
        family: planting.family
      });

      // Recalculate gaps for this bed
      recalculateBedGaps(bestBed, seasonStart, seasonEnd);

    } else {
      unassignable.push({
        batchId: planting.batchId,
        crop: planting.crop,
        reason: 'No suitable bed/gap found in ' + targetField
      });
    }
  }

  // Apply changes if requested
  if (applyChanges && assignments.length > 0) {
    for (var i = 0; i < assignments.length; i++) {
      var a = assignments[i];
      planSheet.getRange(a.rowIndex, bedCol + 1).setValue(a.toBed);
    }
  }

  // Group assignments by field time for summary
  var assignmentsByGroup = {};
  for (var i = 0; i < assignments.length; i++) {
    var group = assignments[i].fieldTimeGroup;
    if (!assignmentsByGroup[group]) assignmentsByGroup[group] = [];
    assignmentsByGroup[group].push(assignments[i]);
  }

  return {
    success: true,
    applied: applyChanges,
    targetField: targetField,
    bedsInField: fieldBeds.length,
    totalRequested: batchIds.length,
    totalAssigned: assignments.length,
    totalUnassignable: unassignable.length,
    assignments: assignments,
    assignmentsByGroup: assignmentsByGroup,
    unassignable: unassignable,
    message: applyChanges ?
      'Applied ' + assignments.length + ' bed assignments to ' + targetField :
      'Preview: ' + assignments.length + ' plantings can be assigned to ' + targetField + '. Call with apply=true to save.'
  };
}

/**
 * Helper: Recalculate available gaps for a bed after adding a planting
 */
function recalculateBedGaps(bed, seasonStart, seasonEnd) {
  var periods = bed.occupiedPeriods.sort(function(a, b) { return a.start - b.start; });
  bed.availableGaps = [];

  var lastEnd = seasonStart;

  for (var p = 0; p < periods.length; p++) {
    if (periods[p].start > lastEnd) {
      bed.availableGaps.push({
        start: new Date(lastEnd),
        end: new Date(periods[p].start),
        days: Math.floor((periods[p].start - lastEnd) / (24 * 60 * 60 * 1000)),
        afterFamily: p > 0 ? periods[p-1].family : null
      });
    }
    if (periods[p].end > lastEnd) {
      lastEnd = new Date(periods[p].end);
    }
  }

  if (lastEnd < seasonEnd) {
    bed.availableGaps.push({
      start: new Date(lastEnd),
      end: seasonEnd,
      days: Math.floor((seasonEnd - lastEnd) / (24 * 60 * 60 * 1000)),
      afterFamily: periods.length > 0 ? periods[periods.length - 1].family : null
    });
  }
}

/**
 * Get list of available fields
 */
function getAvailableFields(params) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var bedSheet = ss.getSheetByName('REF_Beds');
  var planSheet = ss.getSheetByName('PLANNING_2026');

  if (!bedSheet) {
    return { success: false, error: 'REF_Beds sheet not found' };
  }

  var bedData = bedSheet.getDataRange().getValues();
  var bedHeaders = bedData[0];
  var bedIdCol = bedHeaders.indexOf('Bed_ID') !== -1 ? bedHeaders.indexOf('Bed_ID') : 0;
  var bedFieldCol = bedHeaders.indexOf('Field') !== -1 ? bedHeaders.indexOf('Field') : 1;
  var bedLengthCol = bedHeaders.indexOf('Length_Feet') !== -1 ? bedHeaders.indexOf('Length_Feet') : 3;
  var bedStatusCol = bedHeaders.indexOf('Status') !== -1 ? bedHeaders.indexOf('Status') : 4;

  var fields = {};

  for (var i = 1; i < bedData.length; i++) {
    var field = bedData[i][bedFieldCol];
    var status = bedData[i][bedStatusCol];
    var length = Number(bedData[i][bedLengthCol]) || 100;

    if (!field) continue;

    if (!fields[field]) {
      fields[field] = {
        name: field,
        totalBeds: 0,
        activeBeds: 0,
        totalFeet: 0,
        activeFeet: 0,
        currentPlantings: 0
      };
    }

    fields[field].totalBeds++;
    fields[field].totalFeet += length;

    if (status !== 'Inactive' && status !== 'Reserved') {
      fields[field].activeBeds++;
      fields[field].activeFeet += length;
    }
  }

  // Count current plantings per field
  if (planSheet && planSheet.getLastRow() > 1) {
    var planData = planSheet.getDataRange().getValues();
    var planHeaders = planData[0];
    var bedCol = planHeaders.indexOf('Target_Bed_ID');
    var statusCol = planHeaders.indexOf('STATUS');

    for (var i = 1; i < planData.length; i++) {
      var bedId = planData[i][bedCol];
      var status = planData[i][statusCol];

      if (!bedId || status === 'Completed' || status === 'Cancelled') continue;

      // Find which field this bed is in
      for (var j = 1; j < bedData.length; j++) {
        if (bedData[j][bedIdCol] === bedId) {
          var field = bedData[j][bedFieldCol];
          if (fields[field]) {
            fields[field].currentPlantings++;
          }
          break;
        }
      }
    }
  }

  var fieldList = [];
  for (var fieldName in fields) {
    fieldList.push(fields[fieldName]);
  }

  // Sort by name
  fieldList.sort(function(a, b) { return a.name.localeCompare(b.name); });

  return {
    success: true,
    fields: fieldList,
    totalFields: fieldList.length
  };
}

/**
 * Test full report generation
 */
function testFieldPlanReport() {
  Logger.log('=== Generating Field Plan Report ===');

  var report = generateFieldPlanReport({});
  Logger.log(report.textSummary);

  Logger.log('=== Report Complete ===');
}
