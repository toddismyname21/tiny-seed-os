/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SATELLITE SERVICE - Agromonitoring API Integration for Tiny Seed Farm OS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Satellite imagery and NDVI monitoring for precision agriculture
 * API Provider: Agromonitoring (api.agromonitoring.com)
 *
 * Features:
 * - Field polygon registration with Agromonitoring API
 * - NDVI, NDMI, EVI vegetation index tracking
 * - Historical data analysis
 * - Problem detection (NDVI drops >15%)
 * - GPS scouting waypoint generation
 * - Daily automated data fetching
 *
 * Sheet Dependencies:
 * - SATELLITE_FIELDS: Field polygon mapping
 * - SATELLITE_READINGS: Historical vegetation index data
 * - REF_Fields: Existing field definitions
 *
 * Created: 2026-02-03
 * Author: Backend_Claude
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const SATELLITE_CONFIG = {
  API_BASE_URL: 'https://api.agromonitoring.com/agro/1.0',
  SPREADSHEET_ID: '128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc',
  SHEETS: {
    SATELLITE_FIELDS: 'SATELLITE_FIELDS',
    SATELLITE_READINGS: 'SATELLITE_READINGS',
    REF_FIELDS: 'REF_Fields'
  },
  NDVI_THRESHOLDS: {
    HEALTHY: 0.6,         // >0.6 = healthy vegetation
    MODERATE: 0.4,        // 0.4-0.6 = moderate
    STRESSED: 0.2,        // 0.2-0.4 = stressed
    PROBLEM_DROP: 0.15    // >15% drop triggers alert
  },
  MAX_CLOUD_COVER: 20,    // Maximum acceptable cloud cover percentage
  CACHE_DURATION_HOURS: 6
};

// ═══════════════════════════════════════════════════════════════════════════════
// API KEY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get Agromonitoring API key from Script Properties
 * @returns {string} API key or throws error if not configured
 */
function getAgromonitoringApiKey() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('AGROMONITORING_API_KEY');
  if (!apiKey) {
    throw new Error('AGROMONITORING_API_KEY not configured in Script Properties. Go to Project Settings > Script Properties to add it.');
  }
  return apiKey;
}

/**
 * Set Agromonitoring API key in Script Properties
 * @param {string} apiKey - The API key to store
 */
function setAgromonitoringApiKey(apiKey) {
  PropertiesService.getScriptProperties().setProperty('AGROMONITORING_API_KEY', apiKey);
  return { success: true, message: 'API key stored successfully' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHEET INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize SATELLITE_FIELDS and SATELLITE_READINGS sheets
 * Creates sheets with proper headers if they don't exist
 * @returns {Object} Result with success status and created sheets
 */
function initializeSatelliteSheets() {
  try {
    const ss = SpreadsheetApp.openById(SATELLITE_CONFIG.SPREADSHEET_ID);
    const created = [];

    // SATELLITE_FIELDS schema
    const fieldsHeaders = [
      'Field_ID',           // Links to REF_Fields
      'Field_Name',         // Human-readable name
      'Polygon_ID',         // Agromonitoring polygon ID
      'Coordinates',        // GeoJSON coordinates (JSON string)
      'Area_Hectares',      // Calculated area
      'Last_Sync',          // Last successful sync timestamp
      'Status',             // ACTIVE, PENDING, ERROR
      'Created_At',         // Creation timestamp
      'Updated_At',         // Last update timestamp
      'Notes'               // Additional notes
    ];

    let fieldsSheet = ss.getSheetByName(SATELLITE_CONFIG.SHEETS.SATELLITE_FIELDS);
    if (!fieldsSheet) {
      fieldsSheet = ss.insertSheet(SATELLITE_CONFIG.SHEETS.SATELLITE_FIELDS);
      fieldsSheet.appendRow(fieldsHeaders);
      fieldsSheet.getRange(1, 1, 1, fieldsHeaders.length).setFontWeight('bold');
      fieldsSheet.setFrozenRows(1);
      created.push(SATELLITE_CONFIG.SHEETS.SATELLITE_FIELDS);
    }

    // SATELLITE_READINGS schema
    const readingsHeaders = [
      'Reading_ID',         // Unique reading identifier
      'Field_ID',           // Links to REF_Fields
      'Polygon_ID',         // Agromonitoring polygon ID
      'Date',               // Reading date
      'NDVI_Mean',          // Mean NDVI value
      'NDVI_Min',           // Minimum NDVI
      'NDVI_Max',           // Maximum NDVI
      'NDMI',               // Normalized Difference Moisture Index
      'EVI',                // Enhanced Vegetation Index
      'Cloud_Pct',          // Cloud coverage percentage
      'Image_URL',          // Link to satellite image
      'Data_Source',        // Sentinel-2, Landsat 8, etc.
      'Quality',            // HIGH, GOOD, FAIR
      'Created_At'          // When reading was stored
    ];

    let readingsSheet = ss.getSheetByName(SATELLITE_CONFIG.SHEETS.SATELLITE_READINGS);
    if (!readingsSheet) {
      readingsSheet = ss.insertSheet(SATELLITE_CONFIG.SHEETS.SATELLITE_READINGS);
      readingsSheet.appendRow(readingsHeaders);
      readingsSheet.getRange(1, 1, 1, readingsHeaders.length).setFontWeight('bold');
      readingsSheet.setFrozenRows(1);
      created.push(SATELLITE_CONFIG.SHEETS.SATELLITE_READINGS);
    }

    return {
      success: true,
      message: created.length > 0
        ? `Created sheets: ${created.join(', ')}`
        : 'Satellite sheets already exist',
      sheetsCreated: created
    };

  } catch (error) {
    console.error('Error initializing satellite sheets:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POLYGON MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a satellite polygon in Agromonitoring for a field
 * @param {string} fieldId - Field ID from REF_Fields
 * @param {Array} coordinates - Array of [lng, lat] coordinate pairs forming the polygon
 * @param {string} name - Display name for the polygon
 * @returns {Object} Created polygon data or error
 */
function createSatellitePolygon(fieldId, coordinates, name) {
  try {
    const apiKey = getAgromonitoringApiKey();

    // Validate coordinates format
    if (!Array.isArray(coordinates) || coordinates.length < 4) {
      return {
        success: false,
        error: 'Polygon requires at least 4 coordinate pairs (including closing point)'
      };
    }

    // Ensure polygon is closed (first point = last point)
    const firstPoint = coordinates[0];
    const lastPoint = coordinates[coordinates.length - 1];
    if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
      coordinates.push(firstPoint);
    }

    // Build GeoJSON payload
    const payload = {
      name: name || `Field_${fieldId}`,
      geo_json: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [coordinates] // Note: GeoJSON wraps coords in extra array
        }
      }
    };

    // Call Agromonitoring API
    const url = `${SATELLITE_CONFIG.API_BASE_URL}/polygons?appid=${apiKey}`;
    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseData = JSON.parse(response.getContentText());

    if (responseCode !== 200 && responseCode !== 201) {
      return {
        success: false,
        error: responseData.message || `API error: ${responseCode}`,
        details: responseData
      };
    }

    // Store polygon mapping in SATELLITE_FIELDS
    const ss = SpreadsheetApp.openById(SATELLITE_CONFIG.SPREADSHEET_ID);
    let fieldsSheet = ss.getSheetByName(SATELLITE_CONFIG.SHEETS.SATELLITE_FIELDS);

    if (!fieldsSheet) {
      initializeSatelliteSheets();
      fieldsSheet = ss.getSheetByName(SATELLITE_CONFIG.SHEETS.SATELLITE_FIELDS);
    }

    const now = new Date().toISOString();
    const newRow = [
      fieldId,
      name,
      responseData.id,
      JSON.stringify(coordinates),
      responseData.area ? (responseData.area / 10000).toFixed(2) : '', // Convert m2 to hectares
      now,
      'ACTIVE',
      now,
      now,
      ''
    ];

    fieldsSheet.appendRow(newRow);

    return {
      success: true,
      polygonId: responseData.id,
      fieldId: fieldId,
      name: name,
      area: responseData.area,
      message: `Polygon created successfully for field ${fieldId}`
    };

  } catch (error) {
    console.error('Error creating satellite polygon:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Sync all fields from REF_Fields to Agromonitoring
 * Creates polygons for fields that don't have one yet
 * @returns {Object} Sync results summary
 */
function syncFieldPolygons() {
  try {
    const ss = SpreadsheetApp.openById(SATELLITE_CONFIG.SPREADSHEET_ID);

    // Get existing satellite fields
    let fieldsSheet = ss.getSheetByName(SATELLITE_CONFIG.SHEETS.SATELLITE_FIELDS);
    if (!fieldsSheet) {
      initializeSatelliteSheets();
      fieldsSheet = ss.getSheetByName(SATELLITE_CONFIG.SHEETS.SATELLITE_FIELDS);
    }

    const existingData = fieldsSheet.getDataRange().getValues();
    const existingFieldIds = new Set();
    for (let i = 1; i < existingData.length; i++) {
      if (existingData[i][0]) {
        existingFieldIds.add(existingData[i][0]);
      }
    }

    // Get REF_Fields data
    const refSheet = ss.getSheetByName(SATELLITE_CONFIG.SHEETS.REF_FIELDS);
    if (!refSheet) {
      return {
        success: false,
        error: 'REF_Fields sheet not found'
      };
    }

    const refData = refSheet.getDataRange().getValues();
    const refHeaders = refData[0];
    const fieldIdIdx = refHeaders.indexOf('Field_ID');
    const fieldNameIdx = refHeaders.indexOf('Field_Name');
    const coordsIdx = refHeaders.indexOf('Coordinates') !== -1
      ? refHeaders.indexOf('Coordinates')
      : refHeaders.indexOf('GeoJSON');

    const results = {
      synced: 0,
      skipped: 0,
      errors: [],
      created: []
    };

    // Process each field
    for (let i = 1; i < refData.length; i++) {
      const row = refData[i];
      const fieldId = row[fieldIdIdx] || row[0];
      const fieldName = row[fieldNameIdx] || row[1] || fieldId;

      // Skip if already registered
      if (existingFieldIds.has(fieldId)) {
        results.skipped++;
        continue;
      }

      // Get coordinates
      let coordinates = null;
      if (coordsIdx !== -1 && row[coordsIdx]) {
        try {
          const coordData = typeof row[coordsIdx] === 'string'
            ? JSON.parse(row[coordsIdx])
            : row[coordsIdx];

          // Handle different coordinate formats
          if (Array.isArray(coordData)) {
            coordinates = coordData;
          } else if (coordData.coordinates) {
            coordinates = coordData.coordinates[0] || coordData.coordinates;
          } else if (coordData.geometry && coordData.geometry.coordinates) {
            coordinates = coordData.geometry.coordinates[0];
          }
        } catch (e) {
          results.errors.push({
            fieldId: fieldId,
            error: 'Invalid coordinate format'
          });
          continue;
        }
      }

      if (!coordinates) {
        results.errors.push({
          fieldId: fieldId,
          error: 'No coordinates found'
        });
        continue;
      }

      // Create polygon
      const createResult = createSatellitePolygon(fieldId, coordinates, fieldName);

      if (createResult.success) {
        results.synced++;
        results.created.push({
          fieldId: fieldId,
          polygonId: createResult.polygonId
        });
      } else {
        results.errors.push({
          fieldId: fieldId,
          error: createResult.error
        });
      }

      // Rate limiting: pause between API calls
      Utilities.sleep(500);
    }

    return {
      success: true,
      results: results,
      message: `Synced ${results.synced} fields, skipped ${results.skipped}, errors: ${results.errors.length}`
    };

  } catch (error) {
    console.error('Error syncing field polygons:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get all registered satellite polygons
 * @returns {Object} List of satellite fields
 */
function getSatelliteFields() {
  try {
    const apiKey = getAgromonitoringApiKey();
    const url = `${SATELLITE_CONFIG.API_BASE_URL}/polygons?appid=${apiKey}`;

    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const responseCode = response.getResponseCode();
    const responseData = JSON.parse(response.getContentText());

    if (responseCode !== 200) {
      return {
        success: false,
        error: responseData.message || `API error: ${responseCode}`
      };
    }

    return {
      success: true,
      polygons: responseData,
      count: responseData.length
    };

  } catch (error) {
    console.error('Error getting satellite fields:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NDVI DATA FETCHING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch latest NDVI data for a specific polygon
 * @param {string} polygonId - Agromonitoring polygon ID
 * @returns {Object} Latest NDVI data
 */
function fetchLatestNDVI(polygonId) {
  try {
    const apiKey = getAgromonitoringApiKey();
    const url = `${SATELLITE_CONFIG.API_BASE_URL}/ndvi?polyid=${polygonId}&appid=${apiKey}`;

    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const responseCode = response.getResponseCode();
    const responseData = JSON.parse(response.getContentText());

    if (responseCode !== 200) {
      return {
        success: false,
        error: responseData.message || `API error: ${responseCode}`,
        polygonId: polygonId
      };
    }

    // NDVI data comes as array, get the most recent
    if (!Array.isArray(responseData) || responseData.length === 0) {
      return {
        success: true,
        polygonId: polygonId,
        data: null,
        message: 'No NDVI data available yet'
      };
    }

    // Sort by date descending and get most recent
    const sortedData = responseData.sort((a, b) => b.dt - a.dt);
    const latest = sortedData[0];

    return {
      success: true,
      polygonId: polygonId,
      data: {
        date: new Date(latest.dt * 1000).toISOString().split('T')[0],
        timestamp: latest.dt,
        ndvi: {
          mean: latest.data.mean,
          min: latest.data.min,
          max: latest.data.max,
          std: latest.data.std,
          p25: latest.data.p25,
          p75: latest.data.p75
        },
        cloudCover: latest.cl || 0,
        dataSource: latest.source || 'Sentinel-2'
      }
    };

  } catch (error) {
    console.error('Error fetching latest NDVI:', error);
    return {
      success: false,
      error: error.message,
      polygonId: polygonId
    };
  }
}

/**
 * Fetch NDVI for all registered fields
 * @returns {Object} NDVI data for all fields
 */
function fetchAllFieldsNDVI() {
  try {
    const ss = SpreadsheetApp.openById(SATELLITE_CONFIG.SPREADSHEET_ID);
    const fieldsSheet = ss.getSheetByName(SATELLITE_CONFIG.SHEETS.SATELLITE_FIELDS);

    if (!fieldsSheet) {
      return {
        success: false,
        error: 'SATELLITE_FIELDS sheet not found. Run initializeSatelliteSheets() first.'
      };
    }

    const data = fieldsSheet.getDataRange().getValues();
    const headers = data[0];
    const fieldIdIdx = headers.indexOf('Field_ID');
    const polygonIdIdx = headers.indexOf('Polygon_ID');
    const statusIdx = headers.indexOf('Status');

    const results = {
      fetched: 0,
      errors: 0,
      readings: []
    };

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const fieldId = row[fieldIdIdx];
      const polygonId = row[polygonIdIdx];
      const status = row[statusIdx];

      if (!polygonId || status !== 'ACTIVE') {
        continue;
      }

      const ndviResult = fetchLatestNDVI(polygonId);

      if (ndviResult.success && ndviResult.data) {
        results.fetched++;
        results.readings.push({
          fieldId: fieldId,
          polygonId: polygonId,
          ...ndviResult.data
        });

        // Store reading
        storeReading(
          polygonId,
          ndviResult.data.date,
          ndviResult.data.ndvi.mean,
          null, // NDMI - fetch separately if needed
          null, // EVI - fetch separately if needed
          fieldId,
          ndviResult.data.cloudCover,
          ndviResult.data.ndvi.min,
          ndviResult.data.ndvi.max
        );
      } else if (!ndviResult.success) {
        results.errors++;
      }

      // Rate limiting
      Utilities.sleep(300);
    }

    return {
      success: true,
      results: results,
      message: `Fetched NDVI for ${results.fetched} fields, ${results.errors} errors`
    };

  } catch (error) {
    console.error('Error fetching all fields NDVI:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Fetch historical NDVI data for a polygon
 * @param {string} polygonId - Agromonitoring polygon ID
 * @param {string|Date} startDate - Start date (YYYY-MM-DD or Date object)
 * @param {string|Date} endDate - End date (YYYY-MM-DD or Date object)
 * @returns {Object} Historical NDVI time series
 */
function fetchNDVIHistory(polygonId, startDate, endDate) {
  try {
    const apiKey = getAgromonitoringApiKey();

    // Convert dates to Unix timestamps
    const start = typeof startDate === 'string'
      ? Math.floor(new Date(startDate).getTime() / 1000)
      : Math.floor(startDate.getTime() / 1000);

    const end = typeof endDate === 'string'
      ? Math.floor(new Date(endDate).getTime() / 1000)
      : Math.floor(endDate.getTime() / 1000);

    const url = `${SATELLITE_CONFIG.API_BASE_URL}/ndvi/history?polyid=${polygonId}&start=${start}&end=${end}&appid=${apiKey}`;

    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const responseCode = response.getResponseCode();
    const responseData = JSON.parse(response.getContentText());

    if (responseCode !== 200) {
      return {
        success: false,
        error: responseData.message || `API error: ${responseCode}`
      };
    }

    // Format the time series data
    const timeSeries = responseData.map(entry => ({
      date: new Date(entry.dt * 1000).toISOString().split('T')[0],
      timestamp: entry.dt,
      ndvi: {
        mean: entry.data.mean,
        min: entry.data.min,
        max: entry.data.max
      },
      cloudCover: entry.cl || 0,
      source: entry.source || 'Sentinel-2'
    }));

    // Sort by date ascending
    timeSeries.sort((a, b) => a.timestamp - b.timestamp);

    return {
      success: true,
      polygonId: polygonId,
      startDate: new Date(start * 1000).toISOString().split('T')[0],
      endDate: new Date(end * 1000).toISOString().split('T')[0],
      count: timeSeries.length,
      timeSeries: timeSeries
    };

  } catch (error) {
    console.error('Error fetching NDVI history:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Fetch satellite imagery URLs for a polygon
 * @param {string} polygonId - Agromonitoring polygon ID
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {Object} Available imagery list
 */
function fetchSatelliteImagery(polygonId, startDate, endDate) {
  try {
    const apiKey = getAgromonitoringApiKey();

    const start = typeof startDate === 'string'
      ? Math.floor(new Date(startDate).getTime() / 1000)
      : Math.floor(startDate.getTime() / 1000);

    const end = typeof endDate === 'string'
      ? Math.floor(new Date(endDate).getTime() / 1000)
      : Math.floor(endDate.getTime() / 1000);

    const url = `${SATELLITE_CONFIG.API_BASE_URL}/image/search?polyid=${polygonId}&start=${start}&end=${end}&appid=${apiKey}`;

    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const responseCode = response.getResponseCode();
    const responseData = JSON.parse(response.getContentText());

    if (responseCode !== 200) {
      return {
        success: false,
        error: responseData.message || `API error: ${responseCode}`
      };
    }

    // Filter for low cloud cover and format results
    const imagery = responseData
      .filter(img => (img.cl || 0) <= SATELLITE_CONFIG.MAX_CLOUD_COVER)
      .map(img => ({
        date: new Date(img.dt * 1000).toISOString().split('T')[0],
        timestamp: img.dt,
        cloudCover: img.cl || 0,
        type: img.type,
        images: {
          trueColor: img.image.truecolor,
          falseColor: img.image.falsecolor,
          ndvi: img.image.ndvi,
          evi: img.image.evi
        },
        stats: img.stats
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    return {
      success: true,
      polygonId: polygonId,
      count: imagery.length,
      imagery: imagery
    };

  } catch (error) {
    console.error('Error fetching satellite imagery:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Store a satellite reading in the SATELLITE_READINGS sheet
 * @param {string} polygonId - Agromonitoring polygon ID
 * @param {string} date - Reading date (YYYY-MM-DD)
 * @param {number} ndviMean - Mean NDVI value
 * @param {number} ndmi - NDMI value (optional)
 * @param {number} evi - EVI value (optional)
 * @param {string} fieldId - Field ID (optional, will lookup from polygonId)
 * @param {number} cloudPct - Cloud coverage percentage
 * @param {number} ndviMin - Minimum NDVI
 * @param {number} ndviMax - Maximum NDVI
 * @returns {Object} Result of storage operation
 */
function storeReading(polygonId, date, ndviMean, ndmi, evi, fieldId, cloudPct, ndviMin, ndviMax) {
  try {
    const ss = SpreadsheetApp.openById(SATELLITE_CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SATELLITE_CONFIG.SHEETS.SATELLITE_READINGS);

    if (!sheet) {
      initializeSatelliteSheets();
      sheet = ss.getSheetByName(SATELLITE_CONFIG.SHEETS.SATELLITE_READINGS);
    }

    // If fieldId not provided, lookup from SATELLITE_FIELDS
    if (!fieldId) {
      const fieldsSheet = ss.getSheetByName(SATELLITE_CONFIG.SHEETS.SATELLITE_FIELDS);
      if (fieldsSheet) {
        const fieldsData = fieldsSheet.getDataRange().getValues();
        for (let i = 1; i < fieldsData.length; i++) {
          if (fieldsData[i][2] === polygonId) { // Polygon_ID is column 3 (index 2)
            fieldId = fieldsData[i][0]; // Field_ID is column 1 (index 0)
            break;
          }
        }
      }
    }

    // Check for duplicate reading (same polygon, same date)
    const existingData = sheet.getDataRange().getValues();
    for (let i = 1; i < existingData.length; i++) {
      if (existingData[i][2] === polygonId && existingData[i][3] === date) {
        // Update existing row instead of creating duplicate
        const rowNum = i + 1;
        sheet.getRange(rowNum, 5).setValue(ndviMean); // NDVI_Mean
        sheet.getRange(rowNum, 6).setValue(ndviMin || ''); // NDVI_Min
        sheet.getRange(rowNum, 7).setValue(ndviMax || ''); // NDVI_Max
        sheet.getRange(rowNum, 8).setValue(ndmi || ''); // NDMI
        sheet.getRange(rowNum, 9).setValue(evi || ''); // EVI
        sheet.getRange(rowNum, 10).setValue(cloudPct || 0); // Cloud_Pct

        return {
          success: true,
          updated: true,
          readingId: existingData[i][0],
          message: 'Updated existing reading'
        };
      }
    }

    // Generate reading ID
    const readingId = `SAT_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Determine data quality based on cloud cover
    let quality = 'HIGH';
    if (cloudPct > 10) quality = 'GOOD';
    if (cloudPct > 15) quality = 'FAIR';

    const now = new Date().toISOString();
    const newRow = [
      readingId,
      fieldId || '',
      polygonId,
      date,
      ndviMean || '',
      ndviMin || '',
      ndviMax || '',
      ndmi || '',
      evi || '',
      cloudPct || 0,
      '', // Image_URL - can be added later
      'Sentinel-2', // Data_Source
      quality,
      now
    ];

    sheet.appendRow(newRow);

    return {
      success: true,
      readingId: readingId,
      message: 'Reading stored successfully'
    };

  } catch (error) {
    console.error('Error storing reading:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get stored readings for a field
 * @param {string} fieldId - Field ID
 * @param {number} days - Number of days to look back (default: 30)
 * @returns {Object} List of readings
 */
function getFieldReadings(fieldId, days) {
  try {
    days = days || 30;
    const ss = SpreadsheetApp.openById(SATELLITE_CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SATELLITE_CONFIG.SHEETS.SATELLITE_READINGS);

    if (!sheet) {
      return {
        success: false,
        error: 'SATELLITE_READINGS sheet not found'
      };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const readings = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] === fieldId && row[3] >= cutoffStr) {
        readings.push({
          readingId: row[0],
          fieldId: row[1],
          polygonId: row[2],
          date: row[3],
          ndvi: {
            mean: row[4],
            min: row[5],
            max: row[6]
          },
          ndmi: row[7],
          evi: row[8],
          cloudPct: row[9],
          imageUrl: row[10],
          dataSource: row[11],
          quality: row[12],
          createdAt: row[13]
        });
      }
    }

    // Sort by date descending
    readings.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      success: true,
      fieldId: fieldId,
      days: days,
      count: readings.length,
      readings: readings
    };

  } catch (error) {
    console.error('Error getting field readings:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROBLEM DETECTION & ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect problems in a field based on NDVI drops
 * Triggers alert if NDVI drops more than 15% between readings
 * @param {string} fieldId - Field ID to analyze
 * @returns {Object} Detected problems and alerts
 */
function detectProblems(fieldId) {
  try {
    // Get recent readings (last 30 days)
    const readingsResult = getFieldReadings(fieldId, 30);

    if (!readingsResult.success) {
      return readingsResult;
    }

    const readings = readingsResult.readings;

    if (readings.length < 2) {
      return {
        success: true,
        fieldId: fieldId,
        problems: [],
        message: 'Insufficient data for comparison (need at least 2 readings)'
      };
    }

    const problems = [];
    const threshold = SATELLITE_CONFIG.NDVI_THRESHOLDS.PROBLEM_DROP;

    // Compare consecutive readings
    for (let i = 0; i < readings.length - 1; i++) {
      const current = readings[i];
      const previous = readings[i + 1];

      if (current.ndvi.mean && previous.ndvi.mean) {
        const drop = (previous.ndvi.mean - current.ndvi.mean) / previous.ndvi.mean;

        if (drop >= threshold) {
          const daysDiff = Math.round(
            (new Date(current.date) - new Date(previous.date)) / (1000 * 60 * 60 * 24)
          );

          problems.push({
            type: 'NDVI_DROP',
            severity: drop >= 0.25 ? 'HIGH' : 'MEDIUM',
            currentDate: current.date,
            previousDate: previous.date,
            daysBetween: daysDiff,
            currentNDVI: current.ndvi.mean,
            previousNDVI: previous.ndvi.mean,
            dropPercent: (drop * 100).toFixed(1),
            possibleCauses: getPossibleCauses(drop, daysDiff),
            recommendation: getRecommendation(drop, current.ndvi.mean)
          });
        }
      }
    }

    // Check for consistently low NDVI
    const latestNDVI = readings[0]?.ndvi?.mean;
    if (latestNDVI && latestNDVI < SATELLITE_CONFIG.NDVI_THRESHOLDS.STRESSED) {
      problems.push({
        type: 'LOW_NDVI',
        severity: latestNDVI < SATELLITE_CONFIG.NDVI_THRESHOLDS.STRESSED / 2 ? 'HIGH' : 'MEDIUM',
        date: readings[0].date,
        ndvi: latestNDVI,
        threshold: SATELLITE_CONFIG.NDVI_THRESHOLDS.STRESSED,
        possibleCauses: ['Water stress', 'Nutrient deficiency', 'Early crop stage', 'Disease pressure'],
        recommendation: 'Scout field immediately to assess crop health'
      });
    }

    // Check for tillage/harvest events if we see a large drop (>40%)
    // This integrates with the tillage/harvest detection system
    let tillageHarvestEvent = null;
    for (const problem of problems) {
      if (problem.type === 'NDVI_DROP' && parseFloat(problem.dropPercent) >= 40) {
        // Large drop detected - run tillage/harvest detection
        try {
          tillageHarvestEvent = detectTillageOrHarvest(fieldId);
          if (tillageHarvestEvent && tillageHarvestEvent.detected) {
            // Update the problem with tillage/harvest info
            problem.tillageHarvestDetection = tillageHarvestEvent;
            problem.possibleCauses = [tillageHarvestEvent.type.replace(/_/g, ' ')];
            problem.recommendation = tillageHarvestEvent.recommendation;
          }
        } catch (e) {
          // Tillage/harvest detection not critical - continue with normal detection
          console.log('Tillage/harvest detection skipped: ' + e.message);
        }
        break; // Only check the first large drop
      }
    }

    return {
      success: true,
      fieldId: fieldId,
      latestNDVI: latestNDVI,
      readingsAnalyzed: readings.length,
      problemsFound: problems.length,
      problems: problems,
      tillageHarvestEvent: tillageHarvestEvent,
      status: problems.length > 0 ? 'ALERT' : 'HEALTHY'
    };

  } catch (error) {
    console.error('Error detecting problems:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get possible causes for NDVI drop
 */
function getPossibleCauses(dropPercent, daysBetween) {
  const causes = [];

  if (dropPercent >= 0.4) {
    causes.push('Tillage or harvest activity');
    causes.push('Severe weather event (hail, frost)');
    causes.push('Major pest outbreak');
  } else if (dropPercent >= 0.25) {
    causes.push('Rapid water stress');
    causes.push('Disease outbreak');
    causes.push('Pest damage');
    causes.push('Nutrient deficiency');
  } else {
    causes.push('Mild water stress');
    causes.push('Natural senescence');
    causes.push('Variable cloud conditions');
  }

  if (daysBetween <= 3) {
    causes.push('Sudden weather change');
  }

  return causes;
}

/**
 * Get recommendation based on NDVI situation
 */
function getRecommendation(dropPercent, currentNDVI) {
  if (dropPercent >= 0.4) {
    return 'URGENT: Immediate field inspection required. Document damage for potential insurance claim.';
  } else if (dropPercent >= 0.25 || currentNDVI < 0.3) {
    return 'HIGH PRIORITY: Scout affected areas within 24-48 hours. Check soil moisture and pest pressure.';
  } else if (dropPercent >= 0.15) {
    return 'MODERATE: Schedule scouting this week. Monitor weather conditions and irrigation status.';
  }
  return 'Continue normal monitoring schedule.';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCOUTING WAYPOINT GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate GPS scouting waypoints for areas with low NDVI
 * @param {string} fieldId - Field ID to generate waypoints for
 * @param {number} threshold - NDVI threshold (default: 0.4)
 * @returns {Object} Scouting waypoints with GPS coordinates
 */
function generateScoutingWaypoints(fieldId, threshold) {
  try {
    threshold = threshold || SATELLITE_CONFIG.NDVI_THRESHOLDS.MODERATE;

    const ss = SpreadsheetApp.openById(SATELLITE_CONFIG.SPREADSHEET_ID);

    // Get field polygon coordinates
    const fieldsSheet = ss.getSheetByName(SATELLITE_CONFIG.SHEETS.SATELLITE_FIELDS);
    if (!fieldsSheet) {
      return {
        success: false,
        error: 'SATELLITE_FIELDS sheet not found'
      };
    }

    const fieldsData = fieldsSheet.getDataRange().getValues();
    const headers = fieldsData[0];
    const fieldIdIdx = headers.indexOf('Field_ID');
    const coordsIdx = headers.indexOf('Coordinates');
    const polygonIdIdx = headers.indexOf('Polygon_ID');
    const nameIdx = headers.indexOf('Field_Name');

    let fieldCoordinates = null;
    let polygonId = null;
    let fieldName = '';

    for (let i = 1; i < fieldsData.length; i++) {
      if (fieldsData[i][fieldIdIdx] === fieldId) {
        fieldCoordinates = JSON.parse(fieldsData[i][coordsIdx]);
        polygonId = fieldsData[i][polygonIdIdx];
        fieldName = fieldsData[i][nameIdx];
        break;
      }
    }

    if (!fieldCoordinates || !polygonId) {
      return {
        success: false,
        error: `Field ${fieldId} not found in satellite registry`
      };
    }

    // Get latest NDVI reading
    const readingsResult = getFieldReadings(fieldId, 14);
    if (!readingsResult.success || readingsResult.readings.length === 0) {
      return {
        success: false,
        error: 'No recent satellite readings available'
      };
    }

    const latestReading = readingsResult.readings[0];

    // Calculate field centroid and boundary points
    const waypoints = [];
    let totalLat = 0, totalLng = 0;

    for (const coord of fieldCoordinates) {
      totalLng += coord[0];
      totalLat += coord[1];
    }

    const centroid = {
      lat: totalLat / fieldCoordinates.length,
      lng: totalLng / fieldCoordinates.length
    };

    // Generate strategic scouting points based on NDVI status
    const waypointId = `WP_${Date.now()}`;

    // Main waypoint at centroid
    waypoints.push({
      waypointId: `${waypointId}_1`,
      sequence: 1,
      name: 'Field Center',
      latitude: centroid.lat.toFixed(6),
      longitude: centroid.lng.toFixed(6),
      priority: latestReading.ndvi.mean < threshold ? 'HIGH' : 'NORMAL',
      ndviReading: latestReading.ndvi.mean,
      instructions: 'Check overall crop health at field center',
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${centroid.lat},${centroid.lng}`
    });

    // Add corner waypoints (for large fields)
    if (fieldCoordinates.length >= 4) {
      // Take first 4 corners
      for (let i = 0; i < Math.min(4, fieldCoordinates.length - 1); i++) {
        const coord = fieldCoordinates[i];
        // Calculate point 10% inside from corner
        const adjustedLat = coord[1] + (centroid.lat - coord[1]) * 0.1;
        const adjustedLng = coord[0] + (centroid.lng - coord[0]) * 0.1;

        waypoints.push({
          waypointId: `${waypointId}_${i + 2}`,
          sequence: i + 2,
          name: `Corner ${i + 1}`,
          latitude: adjustedLat.toFixed(6),
          longitude: adjustedLng.toFixed(6),
          priority: 'NORMAL',
          instructions: 'Check edge conditions, drainage, and pest pressure',
          googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${adjustedLat},${adjustedLng}`
        });
      }
    }

    // Generate optimized route URL
    const routeCoords = waypoints.map(w => `${w.latitude},${w.longitude}`).join('/');
    const googleMapsRouteUrl = `https://www.google.com/maps/dir/${routeCoords}`;

    // Estimate scouting time (5 minutes per waypoint + walking)
    const estimatedMinutes = waypoints.length * 5 + (waypoints.length - 1) * 3;

    return {
      success: true,
      fieldId: fieldId,
      fieldName: fieldName,
      polygonId: polygonId,
      scoutingDate: new Date().toISOString().split('T')[0],
      latestNDVI: latestReading.ndvi.mean,
      ndviThreshold: threshold,
      requiresScouting: latestReading.ndvi.mean < threshold,
      totalWaypoints: waypoints.length,
      estimatedTime: `${estimatedMinutes} minutes`,
      waypoints: waypoints,
      routeUrl: googleMapsRouteUrl,
      exportFormats: {
        googleMaps: googleMapsRouteUrl,
        gpxData: generateGPX(fieldName, waypoints)
      }
    };

  } catch (error) {
    console.error('Error generating scouting waypoints:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate GPX file content for waypoints
 */
function generateGPX(fieldName, waypoints) {
  const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TinySeedOS-SatelliteService">
<metadata>
  <name>${fieldName} Scouting Route</name>
  <time>${new Date().toISOString()}</time>
</metadata>
<trk>
  <name>Scouting Route</name>
  <trkseg>`;

  const gpxWaypoints = waypoints.map(w =>
    `    <trkpt lat="${w.latitude}" lon="${w.longitude}">
      <name>${w.name}</name>
      <desc>${w.instructions}</desc>
    </trkpt>`
  ).join('\n');

  const gpxFooter = `
  </trkseg>
</trk>
</gpx>`;

  return gpxHeader + '\n' + gpxWaypoints + gpxFooter;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULED TRIGGER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Daily satellite data fetch function
 * Designed to be called by a time-based trigger
 */
function dailySatelliteFetch() {
  console.log('Starting daily satellite fetch...');

  try {
    // Fetch NDVI for all fields
    const fetchResult = fetchAllFieldsNDVI();

    if (!fetchResult.success) {
      console.error('Daily satellite fetch failed:', fetchResult.error);
      return;
    }

    console.log(`Daily fetch complete: ${fetchResult.results.fetched} fields updated`);

    // Run problem detection for all fields
    const ss = SpreadsheetApp.openById(SATELLITE_CONFIG.SPREADSHEET_ID);
    const fieldsSheet = ss.getSheetByName(SATELLITE_CONFIG.SHEETS.SATELLITE_FIELDS);

    if (fieldsSheet) {
      const data = fieldsSheet.getDataRange().getValues();
      const alerts = [];

      for (let i = 1; i < data.length; i++) {
        const fieldId = data[i][0];
        const status = data[i][6];

        if (fieldId && status === 'ACTIVE') {
          const problems = detectProblems(fieldId);
          if (problems.success && problems.problemsFound > 0) {
            alerts.push({
              fieldId: fieldId,
              problems: problems.problems
            });
          }
        }
      }

      if (alerts.length > 0) {
        console.log(`Alerts detected for ${alerts.length} fields`);
        // Future: Send notifications here
      }
    }

    console.log('Daily satellite fetch complete');

  } catch (error) {
    console.error('Error in daily satellite fetch:', error);
  }
}

/**
 * Setup daily trigger for automatic satellite data fetch
 */
function setupSatelliteTrigger() {
  // Delete existing satellite triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'dailySatelliteFetch') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new trigger at 6 AM daily
  ScriptApp.newTrigger('dailySatelliteFetch')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();

  return {
    success: true,
    message: 'Daily satellite fetch trigger created (6 AM daily)'
  };
}

/**
 * Remove satellite trigger
 */
function removeSatelliteTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;

  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'dailySatelliteFetch') {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });

  return {
    success: true,
    message: `Removed ${removed} satellite trigger(s)`
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINT HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle satellite API requests (to be integrated with main doGet/doPost)
 * @param {string} action - The action to perform
 * @param {Object} params - Request parameters
 * @param {Object} postData - POST body data (for POST requests)
 * @returns {Object} API response
 */
function handleSatelliteAPI(action, params, postData) {
  switch (action) {
    case 'initializeSatelliteSheets':
      return initializeSatelliteSheets();

    case 'syncFieldPolygons':
      return syncFieldPolygons();

    case 'getSatelliteFields':
      return getSatelliteFields();

    case 'createSatellitePolygon':
      return createSatellitePolygon(
        postData.fieldId,
        postData.coordinates,
        postData.name
      );

    case 'fetchLatestNDVI':
      return fetchLatestNDVI(params.polygonId);

    case 'fetchAllFieldsNDVI':
      return fetchAllFieldsNDVI();

    case 'fetchNDVIHistory':
      return fetchNDVIHistory(
        params.polygonId,
        params.startDate,
        params.endDate
      );

    case 'fetchSatelliteImagery':
      return fetchSatelliteImagery(
        params.polygonId,
        params.startDate,
        params.endDate
      );

    case 'getFieldReadings':
      return getFieldReadings(
        params.fieldId,
        params.days ? parseInt(params.days) : 30
      );

    case 'detectProblems':
      return detectProblems(params.fieldId);

    case 'generateScoutingWaypoints':
      return generateScoutingWaypoints(
        params.fieldId,
        params.threshold ? parseFloat(params.threshold) : null
      );

    case 'setupSatelliteTrigger':
      return setupSatelliteTrigger();

    case 'removeSatelliteTrigger':
      return removeSatelliteTrigger();

    case 'setAgromonitoringApiKey':
      return setAgromonitoringApiKey(postData.apiKey);

    // Tillage & Harvest Detection endpoints
    case 'detectTillageOrHarvest':
      return detectTillageOrHarvest(params.fieldId);

    case 'runTillageHarvestScan':
      return runTillageHarvestScan();

    case 'getCropGrowthStage':
      return getCropGrowthStage(params.fieldId);

    case 'checkForStormEvent':
      return checkForStormEvent(
        params.fieldId,
        params.days ? parseInt(params.days) : 5
      );

    case 'setupTillageHarvestTrigger':
      return setupTillageHarvestTrigger();

    case 'removeTillageHarvestTrigger':
      return removeTillageHarvestTrigger();

    default:
      return {
        success: false,
        error: `Unknown satellite action: ${action}`
      };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TILLAGE & HARVEST DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for tillage/harvest detection
 */
const TILLAGE_HARVEST_CONFIG = {
  NDVI_DROP_THRESHOLD: 0.40,  // 40% drop triggers detection
  LOOKBACK_DAYS: 5,           // Compare current to 5 days ago
  HARVEST_GDD_THRESHOLD: 0.90, // 90% of GDD = likely harvest vs tillage
  STORM_SEVERITY_THRESHOLD: 0.6, // Normalized storm severity (0-1)
  SHEETS: {
    TILLAGE_EVENTS: 'TILLAGE_EVENTS',
    SATELLITE_ALERTS: 'SATELLITE_ALERTS'
  }
};

/**
 * Get the latest satellite reading for a field
 * @param {string} fieldId - Field ID
 * @returns {Object|null} Latest reading or null
 */
function getLatestReading(fieldId) {
  try {
    const readings = getFieldReadings(fieldId, 14);
    if (!readings.success || readings.readings.length === 0) {
      return null;
    }
    // Readings are already sorted by date descending
    const latest = readings.readings[0];
    return {
      date: latest.date,
      ndvi: latest.ndvi.mean,
      ndmi: latest.ndmi,
      quality: latest.quality
    };
  } catch (error) {
    console.error('Error getting latest reading:', error);
    return null;
  }
}

/**
 * Get a satellite reading from X days ago
 * @param {string} fieldId - Field ID
 * @param {number} daysAgo - Number of days to look back
 * @returns {Object|null} Reading from daysAgo or closest available
 */
function getReadingDaysAgo(fieldId, daysAgo) {
  try {
    const readings = getFieldReadings(fieldId, daysAgo + 10);
    if (!readings.success || readings.readings.length < 2) {
      return null;
    }

    // Calculate target date
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysAgo);
    const targetStr = targetDate.toISOString().split('T')[0];

    // Find the reading closest to target date (but not newer)
    for (const reading of readings.readings) {
      if (reading.date <= targetStr) {
        return {
          date: reading.date,
          ndvi: reading.ndvi.mean,
          ndmi: reading.ndmi,
          quality: reading.quality
        };
      }
    }

    // If no older reading found, return the oldest we have
    const oldest = readings.readings[readings.readings.length - 1];
    return {
      date: oldest.date,
      ndvi: oldest.ndvi.mean,
      ndmi: oldest.ndmi,
      quality: oldest.quality
    };
  } catch (error) {
    console.error('Error getting reading days ago:', error);
    return null;
  }
}

/**
 * Check for storm/weather events that could explain NDVI drops
 * Uses Open-Meteo historical weather API
 * @param {string} fieldId - Field ID
 * @param {number} days - Number of days to check
 * @returns {Object|null} Weather event info or null if no severe weather
 */
function checkForStormEvent(fieldId, days) {
  try {
    // Get farm coordinates (fallback to Pittsburgh default)
    const lat = typeof FARM_CONFIG !== 'undefined' ? FARM_CONFIG.LAT : 40.4406;
    const lon = typeof FARM_CONFIG !== 'undefined' ? FARM_CONFIG.LONG : -79.9959;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const start = Utilities.formatDate(startDate, 'America/New_York', 'yyyy-MM-dd');
    const end = Utilities.formatDate(endDate, 'America/New_York', 'yyyy-MM-dd');

    // Fetch historical weather from Open-Meteo
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${end}&daily=precipitation_sum,rain_sum,windspeed_10m_max,weathercode&timezone=America/New_York`;

    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const responseCode = response.getResponseCode();

    if (responseCode !== 200) {
      console.log('Weather API error, skipping storm check');
      return null;
    }

    const data = JSON.parse(response.getContentText());

    if (!data.daily || !data.daily.time) {
      return null;
    }

    // Analyze for severe weather events
    const events = [];
    for (let i = 0; i < data.daily.time.length; i++) {
      const date = data.daily.time[i];
      const precip = data.daily.precipitation_sum ? data.daily.precipitation_sum[i] : 0;
      const wind = data.daily.windspeed_10m_max ? data.daily.windspeed_10m_max[i] : 0;
      const weatherCode = data.daily.weathercode ? data.daily.weathercode[i] : 0;

      // Weather codes for severe weather:
      // 95-99: Thunderstorm (95=slight, 96=moderate hail, 99=heavy hail)
      // 85-86: Snow showers
      // 80-82: Rain showers (80=slight, 82=violent)
      // 65-67: Heavy rain

      let severity = 0;
      let eventType = null;

      // Check for hail (most damaging)
      if (weatherCode >= 96 && weatherCode <= 99) {
        severity = 0.9;
        eventType = 'HAIL';
      }
      // Check for thunderstorm
      else if (weatherCode >= 95) {
        severity = 0.7;
        eventType = 'THUNDERSTORM';
      }
      // Check for heavy precipitation (>25mm)
      else if (precip > 25) {
        severity = 0.65;
        eventType = 'HEAVY_RAIN';
      }
      // Check for high winds (>50 km/h)
      else if (wind > 50) {
        severity = 0.6;
        eventType = 'HIGH_WIND';
      }
      // Check for violent rain showers
      else if (weatherCode === 82) {
        severity = 0.6;
        eventType = 'VIOLENT_RAIN';
      }

      if (severity >= TILLAGE_HARVEST_CONFIG.STORM_SEVERITY_THRESHOLD) {
        events.push({
          date: date,
          type: eventType,
          severity: severity,
          precipitation_mm: precip,
          wind_kmh: wind,
          weatherCode: weatherCode
        });
      }
    }

    // Return the most severe event if any
    if (events.length > 0) {
      events.sort((a, b) => b.severity - a.severity);
      return events[0];
    }

    return null;
  } catch (error) {
    console.error('Error checking for storm event:', error);
    return null;
  }
}

/**
 * Get crop growth stage as percentage of GDD to maturity
 * Integrates with PLANNING_2026 and GDD system
 * @param {string} fieldId - Field ID
 * @returns {Object} Growth stage info with percentage
 */
function getCropGrowthStage(fieldId) {
  try {
    const ss = SpreadsheetApp.openById(SATELLITE_CONFIG.SPREADSHEET_ID);

    // First, find what's planted in this field from PLANNING_2026
    const planSheet = ss.getSheetByName('PLANNING_2026');
    if (!planSheet) {
      return { success: false, error: 'PLANNING_2026 not found', percentage: null };
    }

    const planData = planSheet.getDataRange().getValues();
    const headers = planData[0];

    // Find relevant columns
    const bedCol = headers.indexOf('Target_Bed_ID') !== -1 ? headers.indexOf('Target_Bed_ID') : headers.indexOf('Bed_ID');
    const cropCol = headers.indexOf('Crop');
    const batchCol = headers.indexOf('Batch_ID');
    const dtmCol = headers.indexOf('DTM') !== -1 ? headers.indexOf('DTM') : headers.indexOf('DTM_Average');

    // Get planting date columns
    const actTransplantCol = headers.indexOf('Act_Transplant');
    const planTransplantCol = headers.indexOf('Plan_Transplant');
    const actFieldSowCol = headers.indexOf('Act_Field_Sow');
    const planFieldSowCol = headers.indexOf('Plan_Field_Sow');

    // Find active plantings for this field
    let activePlanting = null;
    const today = new Date();

    for (let i = 1; i < planData.length; i++) {
      const row = planData[i];
      const bedId = row[bedCol];

      // Check if this bed/field matches
      if (!bedId || !String(bedId).includes(fieldId.replace('FIELD_', ''))) {
        continue;
      }

      // Get planting date (actual preferred over planned)
      let plantDate = null;
      if (actTransplantCol !== -1 && row[actTransplantCol]) {
        plantDate = new Date(row[actTransplantCol]);
      } else if (planTransplantCol !== -1 && row[planTransplantCol]) {
        plantDate = new Date(row[planTransplantCol]);
      } else if (actFieldSowCol !== -1 && row[actFieldSowCol]) {
        plantDate = new Date(row[actFieldSowCol]);
      } else if (planFieldSowCol !== -1 && row[planFieldSowCol]) {
        plantDate = new Date(row[planFieldSowCol]);
      }

      if (!plantDate || isNaN(plantDate.getTime())) {
        continue;
      }

      // Skip if planting is in the future
      if (plantDate > today) {
        continue;
      }

      // Get DTM (days to maturity)
      const dtm = row[dtmCol] ? parseInt(row[dtmCol]) : 60;

      // Calculate expected harvest date
      const expectedHarvest = new Date(plantDate);
      expectedHarvest.setDate(expectedHarvest.getDate() + dtm);

      // If we're past expected harvest, this might not be active
      const daysPastExpected = Math.floor((today - expectedHarvest) / (1000 * 60 * 60 * 24));
      if (daysPastExpected > 30) {
        continue; // Skip if more than 30 days past expected harvest
      }

      activePlanting = {
        batchId: row[batchCol],
        crop: row[cropCol],
        plantDate: plantDate,
        dtm: dtm,
        expectedHarvest: expectedHarvest
      };
      break;
    }

    if (!activePlanting) {
      return {
        success: true,
        percentage: null,
        message: 'No active planting found for field',
        fieldId: fieldId
      };
    }

    // Calculate growth percentage based on days elapsed vs DTM
    const daysElapsed = Math.floor((today - activePlanting.plantDate) / (1000 * 60 * 60 * 24));
    const percentage = Math.min(1.0, daysElapsed / activePlanting.dtm);

    // Also try to get GDD-based percentage if available
    let gddPercentage = null;
    if (typeof getGDDProgress === 'function') {
      try {
        const gddResult = getGDDProgress({});
        if (gddResult.success && gddResult.data) {
          const batchGDD = gddResult.data.find(b => b.batch_id === activePlanting.batchId);
          if (batchGDD && batchGDD.gdd_percent) {
            gddPercentage = batchGDD.gdd_percent / 100;
          }
        }
      } catch (e) {
        // GDD not available, use DTM-based calculation
      }
    }

    return {
      success: true,
      fieldId: fieldId,
      batchId: activePlanting.batchId,
      crop: activePlanting.crop,
      plantDate: activePlanting.plantDate.toISOString().split('T')[0],
      dtm: activePlanting.dtm,
      daysElapsed: daysElapsed,
      percentage: gddPercentage || percentage,
      gddBased: gddPercentage !== null,
      expectedHarvest: activePlanting.expectedHarvest.toISOString().split('T')[0]
    };

  } catch (error) {
    console.error('Error getting crop growth stage:', error);
    return { success: false, error: error.message, percentage: null };
  }
}

/**
 * Main detection function for tillage or harvest events
 * Triggers when NDVI drops >40% in 5 days
 * @param {string} fieldId - Field ID to check
 * @returns {Object|null} Detection result or null if no event detected
 */
function detectTillageOrHarvest(fieldId) {
  try {
    // Get current and previous readings
    const current = getLatestReading(fieldId);
    const previous = getReadingDaysAgo(fieldId, TILLAGE_HARVEST_CONFIG.LOOKBACK_DAYS);

    if (!current || !previous) {
      return {
        success: true,
        fieldId: fieldId,
        detected: false,
        message: 'Insufficient satellite data for detection',
        current: current,
        previous: previous
      };
    }

    // Skip if previous NDVI is too low (already bare)
    if (previous.ndvi < 0.1) {
      return {
        success: true,
        fieldId: fieldId,
        detected: false,
        message: 'Previous NDVI too low for meaningful comparison',
        currentNDVI: current.ndvi,
        previousNDVI: previous.ndvi
      };
    }

    // Calculate NDVI drop percentage
    const ndviDrop = (previous.ndvi - current.ndvi) / previous.ndvi;

    // Check if drop exceeds threshold
    if (ndviDrop <= TILLAGE_HARVEST_CONFIG.NDVI_DROP_THRESHOLD) {
      return {
        success: true,
        fieldId: fieldId,
        detected: false,
        message: 'No significant NDVI drop detected',
        ndviDropPercent: (ndviDrop * 100).toFixed(1),
        threshold: (TILLAGE_HARVEST_CONFIG.NDVI_DROP_THRESHOLD * 100).toFixed(0),
        currentNDVI: current.ndvi,
        previousNDVI: previous.ndvi,
        currentDate: current.date,
        previousDate: previous.date
      };
    }

    // Significant drop detected - determine cause

    // Step 1: Check for weather event
    const weatherEvent = checkForStormEvent(fieldId, TILLAGE_HARVEST_CONFIG.LOOKBACK_DAYS);
    if (weatherEvent) {
      // Weather damage detected
      const result = {
        success: true,
        fieldId: fieldId,
        detected: true,
        type: 'WEATHER_DAMAGE',
        confidence: weatherEvent.severity > 0.8 ? 'high' : 'medium',
        event: weatherEvent,
        ndviDropPercent: (ndviDrop * 100).toFixed(1),
        currentNDVI: current.ndvi,
        previousNDVI: previous.ndvi,
        currentDate: current.date,
        previousDate: previous.date,
        recommendation: `Weather damage detected (${weatherEvent.type} on ${weatherEvent.date}). Scout field to assess damage extent and consider insurance claim if applicable.`
      };

      // Log as proactive alert
      logTillageHarvestAlert(fieldId, result);

      return result;
    }

    // Step 2: Check crop growth stage
    const cropStage = getCropGrowthStage(fieldId);

    if (cropStage.success && cropStage.percentage !== null) {
      if (cropStage.percentage >= TILLAGE_HARVEST_CONFIG.HARVEST_GDD_THRESHOLD) {
        // Likely harvest - crop is near maturity
        const result = {
          success: true,
          fieldId: fieldId,
          detected: true,
          type: 'HARVEST_DETECTED',
          confidence: cropStage.percentage >= 0.95 ? 'high' : 'medium',
          crop: cropStage.crop,
          batchId: cropStage.batchId,
          growthStage: (cropStage.percentage * 100).toFixed(0) + '%',
          ndviDropPercent: (ndviDrop * 100).toFixed(1),
          currentNDVI: current.ndvi,
          previousNDVI: previous.ndvi,
          currentDate: current.date,
          previousDate: previous.date,
          recommendation: `Harvest activity detected for ${cropStage.crop}. Verify and log harvest in HARVEST_LOG if not already recorded.`
        };

        // Auto-log harvest detection
        logHarvestFromSatellite(fieldId, current.date, cropStage);

        // Log as proactive alert
        logTillageHarvestAlert(fieldId, result);

        return result;
      } else {
        // Crop not mature - likely tillage
        const result = {
          success: true,
          fieldId: fieldId,
          detected: true,
          type: 'TILLAGE_DETECTED',
          confidence: 'medium',
          crop: cropStage.crop,
          growthStage: (cropStage.percentage * 100).toFixed(0) + '%',
          ndviDropPercent: (ndviDrop * 100).toFixed(1),
          currentNDVI: current.ndvi,
          previousNDVI: previous.ndvi,
          currentDate: current.date,
          previousDate: previous.date,
          recommendation: `Tillage activity detected. ${cropStage.crop} was at ${(cropStage.percentage * 100).toFixed(0)}% maturity. Verify field activity and update records.`
        };

        // Log tillage event
        logTillageEvent(fieldId, current.date, cropStage);

        // Log as proactive alert
        logTillageHarvestAlert(fieldId, result);

        return result;
      }
    } else {
      // No planting data - unknown activity
      const result = {
        success: true,
        fieldId: fieldId,
        detected: true,
        type: 'FIELD_ACTIVITY_DETECTED',
        confidence: 'low',
        ndviDropPercent: (ndviDrop * 100).toFixed(1),
        currentNDVI: current.ndvi,
        previousNDVI: previous.ndvi,
        currentDate: current.date,
        previousDate: previous.date,
        recommendation: 'Significant vegetation change detected. No planting records found. Scout field to determine cause (tillage, harvest, or other activity).'
      };

      // Log as proactive alert
      logTillageHarvestAlert(fieldId, result);

      return result;
    }

  } catch (error) {
    console.error('Error detecting tillage/harvest:', error);
    return {
      success: false,
      fieldId: fieldId,
      error: error.message
    };
  }
}

/**
 * Auto-log harvest detection from satellite data
 * @param {string} fieldId - Field ID
 * @param {string} date - Detection date
 * @param {Object} cropStage - Crop stage info
 */
function logHarvestFromSatellite(fieldId, date, cropStage) {
  try {
    const ss = SpreadsheetApp.openById(SATELLITE_CONFIG.SPREADSHEET_ID);
    let harvestSheet = ss.getSheetByName('HARVEST_LOG');

    if (!harvestSheet) {
      // HARVEST_LOG doesn't exist, skip logging
      console.log('HARVEST_LOG sheet not found, skipping auto-log');
      return { success: false, error: 'HARVEST_LOG sheet not found' };
    }

    // Check if this harvest is already logged (within 3 days)
    const data = harvestSheet.getDataRange().getValues();
    const headers = data[0];
    const batchCol = headers.indexOf('Batch_ID');
    const dateCol = headers.indexOf('Timestamp');

    const detectionDate = new Date(date);

    for (let i = 1; i < data.length; i++) {
      if (data[i][batchCol] === cropStage.batchId) {
        const existingDate = new Date(data[i][dateCol]);
        const daysDiff = Math.abs((detectionDate - existingDate) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 3) {
          console.log('Harvest already logged for this batch within 3 days');
          return { success: true, alreadyLogged: true };
        }
      }
    }

    // Use existing harvest logging if available
    if (typeof logHarvestWithDetails === 'function') {
      return logHarvestWithDetails({
        batchId: cropStage.batchId,
        crop: cropStage.crop,
        bedId: fieldId,
        quantity: 0, // Unknown from satellite
        unit: 'lbs',
        quality: 'PENDING_VERIFICATION',
        notes: `Auto-detected via satellite on ${date}. VERIFY: Quantity and quality need manual entry.`
      });
    }

    // Manual logging as fallback
    const harvestId = 'SAT_HRV_' + Date.now();
    const now = new Date().toISOString();

    // Find column count from headers
    const expectedCols = headers.length;

    const newRow = new Array(expectedCols).fill('');
    newRow[0] = harvestId;
    newRow[1] = now;
    if (batchCol !== -1) newRow[batchCol] = cropStage.batchId;
    if (headers.indexOf('Crop') !== -1) newRow[headers.indexOf('Crop')] = cropStage.crop;
    if (headers.indexOf('Notes') !== -1) newRow[headers.indexOf('Notes')] = `Auto-detected via satellite on ${date}. VERIFY quantities.`;

    harvestSheet.appendRow(newRow);

    return { success: true, harvestId: harvestId, source: 'satellite' };

  } catch (error) {
    console.error('Error logging harvest from satellite:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Log tillage event to field history
 * @param {string} fieldId - Field ID
 * @param {string} date - Tillage date
 * @param {Object} cropStage - Crop stage info (if available)
 */
function logTillageEvent(fieldId, date, cropStage) {
  try {
    const ss = SpreadsheetApp.openById(SATELLITE_CONFIG.SPREADSHEET_ID);

    // Get or create TILLAGE_EVENTS sheet
    let tillageSheet = ss.getSheetByName(TILLAGE_HARVEST_CONFIG.SHEETS.TILLAGE_EVENTS);

    if (!tillageSheet) {
      tillageSheet = ss.insertSheet(TILLAGE_HARVEST_CONFIG.SHEETS.TILLAGE_EVENTS);
      tillageSheet.appendRow([
        'Event_ID',
        'Field_ID',
        'Event_Date',
        'Detection_Date',
        'Event_Type',
        'Previous_Crop',
        'Growth_Stage_Pct',
        'NDVI_Before',
        'NDVI_After',
        'Verified',
        'Verified_By',
        'Notes',
        'Source'
      ]);
      tillageSheet.getRange(1, 1, 1, 13).setFontWeight('bold');
      tillageSheet.setFrozenRows(1);
    }

    const eventId = 'TILL_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const now = new Date().toISOString();

    const newRow = [
      eventId,
      fieldId,
      date,
      now,
      'TILLAGE',
      cropStage?.crop || '',
      cropStage?.percentage ? (cropStage.percentage * 100).toFixed(0) : '',
      '', // NDVI before - could add from detection
      '', // NDVI after - could add from detection
      'NO',
      '',
      cropStage?.crop
        ? `Satellite detected tillage. ${cropStage.crop} was at ${(cropStage.percentage * 100).toFixed(0)}% maturity.`
        : 'Satellite detected tillage/field activity.',
      'SATELLITE'
    ];

    tillageSheet.appendRow(newRow);

    return { success: true, eventId: eventId };

  } catch (error) {
    console.error('Error logging tillage event:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Log detection as a proactive alert
 * @param {string} fieldId - Field ID
 * @param {Object} detection - Detection result
 */
function logTillageHarvestAlert(fieldId, detection) {
  try {
    // Use existing proactive alert system if available
    if (typeof createProactiveAlert === 'function') {
      const priorityMap = {
        'WEATHER_DAMAGE': 'HIGH',
        'HARVEST_DETECTED': 'MEDIUM',
        'TILLAGE_DETECTED': 'LOW',
        'FIELD_ACTIVITY_DETECTED': 'MEDIUM'
      };

      return createProactiveAlert({
        type: 'SATELLITE_DETECTION',
        priority: priorityMap[detection.type] || 'MEDIUM',
        title: `${detection.type.replace(/_/g, ' ')}: ${fieldId}`,
        message: detection.recommendation,
        actionSuggested: detection.type === 'HARVEST_DETECTED'
          ? 'Verify harvest in HARVEST_LOG'
          : 'Scout field and update records',
        data: {
          fieldId: fieldId,
          detectionType: detection.type,
          confidence: detection.confidence,
          ndviDrop: detection.ndviDropPercent,
          crop: detection.crop,
          batchId: detection.batchId
        }
      });
    }

    // Fallback: store in SATELLITE_ALERTS
    const ss = SpreadsheetApp.openById(SATELLITE_CONFIG.SPREADSHEET_ID);
    let alertSheet = ss.getSheetByName(TILLAGE_HARVEST_CONFIG.SHEETS.SATELLITE_ALERTS);

    if (!alertSheet) {
      alertSheet = ss.insertSheet(TILLAGE_HARVEST_CONFIG.SHEETS.SATELLITE_ALERTS);
      alertSheet.appendRow([
        'Alert_ID', 'Field_ID', 'Alert_Type', 'Severity',
        'Message', 'Created_At', 'Status', 'Resolved_At', 'Resolved_By'
      ]);
      alertSheet.getRange(1, 1, 1, 9).setFontWeight('bold');
      alertSheet.setFrozenRows(1);
    }

    const alertId = 'SAT_ALERT_' + Date.now();
    alertSheet.appendRow([
      alertId,
      fieldId,
      detection.type,
      detection.confidence === 'high' ? 'HIGH' : 'MEDIUM',
      detection.recommendation,
      new Date().toISOString(),
      'OPEN',
      '',
      ''
    ]);

    return { success: true, alertId: alertId };

  } catch (error) {
    console.error('Error logging alert:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Batch scan all fields for tillage/harvest events
 * @returns {Object} Scan results for all fields
 */
function runTillageHarvestScan() {
  try {
    const ss = SpreadsheetApp.openById(SATELLITE_CONFIG.SPREADSHEET_ID);
    const fieldsSheet = ss.getSheetByName(SATELLITE_CONFIG.SHEETS.SATELLITE_FIELDS);

    if (!fieldsSheet) {
      return {
        success: false,
        error: 'SATELLITE_FIELDS sheet not found. Run initializeSatelliteSheets() first.'
      };
    }

    const data = fieldsSheet.getDataRange().getValues();
    const headers = data[0];
    const fieldIdIdx = headers.indexOf('Field_ID');
    const statusIdx = headers.indexOf('Status');

    const results = {
      scanned: 0,
      detections: [],
      noData: [],
      errors: []
    };

    for (let i = 1; i < data.length; i++) {
      const fieldId = data[i][fieldIdIdx];
      const status = data[i][statusIdx];

      if (!fieldId || status !== 'ACTIVE') {
        continue;
      }

      try {
        const detection = detectTillageOrHarvest(fieldId);
        results.scanned++;

        if (detection.success) {
          if (detection.detected) {
            results.detections.push({
              fieldId: fieldId,
              type: detection.type,
              confidence: detection.confidence,
              ndviDrop: detection.ndviDropPercent,
              recommendation: detection.recommendation
            });
          }
        } else if (detection.message && detection.message.includes('Insufficient')) {
          results.noData.push(fieldId);
        }
      } catch (e) {
        results.errors.push({
          fieldId: fieldId,
          error: e.message
        });
      }

      // Rate limiting
      Utilities.sleep(200);
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        fieldsScanned: results.scanned,
        detectionsFound: results.detections.length,
        insufficientData: results.noData.length,
        errors: results.errors.length
      },
      detections: results.detections,
      fieldsWithNoData: results.noData,
      errors: results.errors
    };

  } catch (error) {
    console.error('Error running tillage/harvest scan:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Schedule daily tillage/harvest scan
 */
function setupTillageHarvestTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runTillageHarvestScan') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new trigger at 7 AM daily (after satellite data fetch at 6 AM)
  ScriptApp.newTrigger('runTillageHarvestScan')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();

  return {
    success: true,
    message: 'Daily tillage/harvest scan trigger created (7 AM daily, after satellite fetch)'
  };
}

/**
 * Remove tillage/harvest scan trigger
 */
function removeTillageHarvestTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;

  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runTillageHarvestScan') {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });

  return {
    success: true,
    message: `Removed ${removed} tillage/harvest scan trigger(s)`
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS FOR INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

// Export functions that need to be called from MERGED TOTAL.js doGet/doPost
// Add these cases to the switch statements in the main API handlers:
//
// In doGet switch:
//   case 'initializeSatelliteSheets':
//   case 'syncFieldPolygons':
//   case 'getSatelliteFields':
//   case 'fetchLatestNDVI':
//   case 'fetchAllFieldsNDVI':
//   case 'fetchNDVIHistory':
//   case 'fetchSatelliteImagery':
//   case 'getFieldReadings':
//   case 'detectProblems':
//   case 'generateScoutingWaypoints':
//   case 'setupSatelliteTrigger':
//   case 'removeSatelliteTrigger':
//   // NEW: Tillage & Harvest Detection endpoints
//   case 'detectTillageOrHarvest':
//   case 'runTillageHarvestScan':
//   case 'getCropGrowthStage':
//   case 'checkForStormEvent':
//   case 'setupTillageHarvestTrigger':
//   case 'removeTillageHarvestTrigger':
//     return jsonResponse(handleSatelliteAPI(action, e.parameter, null));
//
// In doPost switch:
//   case 'createSatellitePolygon':
//   case 'setAgromonitoringApiKey':
//     return jsonResponse(handleSatelliteAPI(action, e.parameter, data));
