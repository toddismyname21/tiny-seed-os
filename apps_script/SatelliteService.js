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

    return {
      success: true,
      fieldId: fieldId,
      latestNDVI: latestNDVI,
      readingsAnalyzed: readings.length,
      problemsFound: problems.length,
      problems: problems,
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

    default:
      return {
        success: false,
        error: `Unknown satellite action: ${action}`
      };
  }
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
//     return jsonResponse(handleSatelliteAPI(action, e.parameter, null));
//
// In doPost switch:
//   case 'createSatellitePolygon':
//   case 'setAgromonitoringApiKey':
//     return jsonResponse(handleSatelliteAPI(action, e.parameter, data));
