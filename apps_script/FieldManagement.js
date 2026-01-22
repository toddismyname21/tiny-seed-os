/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TINY SEED FARM - FIELD MANAGEMENT MODULE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Complete field management system with support for:
 * - Simple mode: Width × Length → auto-calculate beds
 * - GPS mode: Walk perimeter → polygon boundary → auto-calculate beds
 * - Override capability for non-standard configurations
 * - Contour/curved field support with variable bed lengths
 *
 * Schema Extensions:
 * - REF_Fields: Calc_Beds, Bed_Override, Override_Reason, Shape_Type, GPS_Polygon
 * - REF_Beds: Calc_Length, Length_Override
 *
 * Created: 2026-01-22
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const FIELD_CONFIG = {
  DEFAULT_BED_WIDTH: 45,      // inches
  DEFAULT_PATH_WIDTH: 12,     // inches
  BED_UNIT_INCHES: 57,        // bed + path = 45 + 12
  CONTOUR_THRESHOLD: 0.10,    // 10% length variation = contour field
  GPS_POLL_INTERVAL: 2000,    // ms between GPS captures when walking
  MIN_POLYGON_POINTS: 3,
  EARTH_RADIUS_FT: 20902231   // feet
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA SETUP - Ensures new columns exist
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ensures the extended schema exists on REF_Fields and REF_Beds
 * Run this once to add new columns
 */
function ensureFieldSchemaExtensions() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // REF_Fields extended columns (after existing M column)
  const fieldsSheet = ss.getSheetByName('REF_Fields');
  if (fieldsSheet) {
    const headers = fieldsSheet.getRange(1, 1, 1, 20).getValues()[0];
    const existingCols = headers.filter(h => h !== '').length;

    // New columns to add at positions N, O, P, Q, R
    const newHeaders = ['Calc_Beds', 'Bed_Override', 'Override_Reason', 'Shape_Type', 'GPS_Polygon'];
    const startCol = 14; // Column N

    for (let i = 0; i < newHeaders.length; i++) {
      const colIdx = startCol + i;
      if (!headers[colIdx - 1] || headers[colIdx - 1] !== newHeaders[i]) {
        fieldsSheet.getRange(1, colIdx).setValue(newHeaders[i]);
      }
    }
  }

  // REF_Beds extended columns (after existing F column)
  const bedsSheet = ss.getSheetByName('REF_Beds');
  if (bedsSheet) {
    const headers = bedsSheet.getRange(1, 1, 1, 10).getValues()[0];

    // New columns at G, H
    const newHeaders = ['Calc_Length', 'Length_Override'];
    const startCol = 7; // Column G

    for (let i = 0; i < newHeaders.length; i++) {
      const colIdx = startCol + i;
      if (!headers[colIdx - 1] || headers[colIdx - 1] !== newHeaders[i]) {
        bedsSheet.getRange(1, colIdx).setValue(newHeaders[i]);
      }
    }
  }

  return { success: true, message: 'Schema extensions applied' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD & LISTING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all fields with comprehensive stats for the dashboard
 */
function getFieldsDashboard(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const fieldsSheet = ss.getSheetByName('REF_Fields');
  const bedsSheet = ss.getSheetByName('REF_Beds');

  if (!fieldsSheet) {
    return { success: false, error: 'REF_Fields sheet not found' };
  }

  const fieldData = fieldsSheet.getDataRange().getValues();
  const bedData = bedsSheet ? bedsSheet.getDataRange().getValues() : [];

  // Build bed statistics per field
  const bedStats = {};
  for (let i = 1; i < bedData.length; i++) {
    const parentField = bedData[i][1]; // Column B
    if (!bedStats[parentField]) {
      bedStats[parentField] = {
        count: 0,
        available: 0,
        planted: 0,
        totalLength: 0,
        lengths: []
      };
    }
    bedStats[parentField].count++;
    bedStats[parentField].totalLength += Number(bedData[i][3]) || 0;
    bedStats[parentField].lengths.push(Number(bedData[i][3]) || 0);

    const status = String(bedData[i][4]).toLowerCase();
    if (status === 'available' || status === '') {
      bedStats[parentField].available++;
    } else {
      bedStats[parentField].planted++;
    }
  }

  // Build field list with stats
  const fields = [];
  for (let i = 1; i < fieldData.length; i++) {
    const row = fieldData[i];
    const fieldName = row[1]; // Column B
    const stats = bedStats[fieldName] || { count: 0, available: 0, planted: 0, totalLength: 0, lengths: [] };

    // Determine field type
    let fieldType = '';
    if (row[9] === true) fieldType = 'Veg';
    else if (row[10] === true) fieldType = 'Floral';
    else if (row[11] === true) fieldType = 'Perennial';
    else if (row[12] === true) fieldType = 'Cover';

    // Calculate length variance for contour detection
    let isContour = false;
    let lengthVariance = 0;
    if (stats.lengths.length > 1) {
      const avgLength = stats.totalLength / stats.lengths.length;
      const maxDiff = Math.max(...stats.lengths.map(l => Math.abs(l - avgLength)));
      lengthVariance = avgLength > 0 ? maxDiff / avgLength : 0;
      isContour = lengthVariance > FIELD_CONFIG.CONTOUR_THRESHOLD;
    }

    fields.push({
      fieldId: row[0],
      name: fieldName,
      acreage: row[2],
      length: row[3],
      width: row[4],
      pathWidth: row[5] || FIELD_CONFIG.DEFAULT_PATH_WIDTH,
      bedWidth: row[6] || FIELD_CONFIG.DEFAULT_BED_WIDTH,
      numberOfBeds: row[7],
      notes: row[8],
      type: fieldType,
      isVeg: row[9] === true,
      isFloral: row[10] === true,
      isPerennial: row[11] === true,
      isCover: row[12] === true,

      // Extended columns
      calcBeds: row[13] || null,
      bedOverride: row[14] === true,
      overrideReason: row[15] || '',
      shapeType: row[16] || 'RECTANGLE',
      gpsPolygon: row[17] ? JSON.parse(row[17]) : null,

      // Computed stats
      bedCount: stats.count,
      availableBeds: stats.available,
      plantedBeds: stats.planted,
      utilizationPct: stats.count > 0 ? Math.round((stats.planted / stats.count) * 100) : 0,
      totalBedFeet: stats.totalLength,
      isContour: isContour,
      lengthVariance: Math.round(lengthVariance * 100)
    });
  }

  // Summary stats
  const summary = {
    totalFields: fields.length,
    totalBeds: fields.reduce((sum, f) => sum + f.bedCount, 0),
    totalAcres: fields.reduce((sum, f) => sum + (f.acreage || 0), 0).toFixed(2),
    availableBeds: fields.reduce((sum, f) => sum + f.availableBeds, 0),
    plantedBeds: fields.reduce((sum, f) => sum + f.plantedBeds, 0),
    contourFields: fields.filter(f => f.isContour).length,
    byType: {
      veg: fields.filter(f => f.type === 'Veg').length,
      floral: fields.filter(f => f.type === 'Floral').length,
      perennial: fields.filter(f => f.type === 'Perennial').length,
      cover: fields.filter(f => f.type === 'Cover').length
    }
  };

  return {
    success: true,
    fields: fields,
    summary: summary,
    config: FIELD_CONFIG
  };
}

/**
 * Get single field details with all beds
 */
function getFieldDetails(params) {
  const fieldName = params.fieldName || params.name;
  if (!fieldName) {
    return { success: false, error: 'Field name required' };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const fieldsSheet = ss.getSheetByName('REF_Fields');
  const bedsSheet = ss.getSheetByName('REF_Beds');

  // Find field
  const fieldData = fieldsSheet.getDataRange().getValues();
  let field = null;
  let fieldRow = -1;

  for (let i = 1; i < fieldData.length; i++) {
    if (fieldData[i][1] === fieldName) {
      fieldRow = i + 1;
      field = fieldData[i];
      break;
    }
  }

  if (!field) {
    return { success: false, error: 'Field not found: ' + fieldName };
  }

  // Get beds for this field
  const bedData = bedsSheet.getDataRange().getValues();
  const beds = [];

  for (let i = 1; i < bedData.length; i++) {
    if (bedData[i][1] === fieldName) {
      beds.push({
        bedId: bedData[i][0],
        parentField: bedData[i][1],
        index: bedData[i][2],
        length: bedData[i][3],
        status: bedData[i][4],
        type: bedData[i][5],
        calcLength: bedData[i][6] || null,
        lengthOverride: bedData[i][7] === true
      });
    }
  }

  // Determine field type
  let fieldType = '';
  if (field[9] === true) fieldType = 'Veg';
  else if (field[10] === true) fieldType = 'Floral';
  else if (field[11] === true) fieldType = 'Perennial';
  else if (field[12] === true) fieldType = 'Cover';

  return {
    success: true,
    field: {
      fieldId: field[0],
      name: field[1],
      acreage: field[2],
      length: field[3],
      width: field[4],
      pathWidth: field[5],
      bedWidth: field[6],
      numberOfBeds: field[7],
      notes: field[8],
      type: fieldType,
      isVeg: field[9] === true,
      isFloral: field[10] === true,
      isPerennial: field[11] === true,
      isCover: field[12] === true,
      calcBeds: field[13],
      bedOverride: field[14] === true,
      overrideReason: field[15],
      shapeType: field[16] || 'RECTANGLE',
      gpsPolygon: field[17] ? JSON.parse(field[17]) : null
    },
    beds: beds,
    row: fieldRow
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIELD CREATION & MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new field
 * Supports both simple (width×length) and GPS (polygon) modes
 */
function createField(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const fieldsSheet = ss.getSheetByName('REF_Fields');

  if (!fieldsSheet) {
    return { success: false, error: 'REF_Fields sheet not found' };
  }

  // Validate required fields
  const name = params.name;
  if (!name) {
    return { success: false, error: 'Field name is required' };
  }

  // Check for duplicate names
  const existingFields = fieldsSheet.getDataRange().getValues();
  for (let i = 1; i < existingFields.length; i++) {
    if (existingFields[i][1] === name) {
      return { success: false, error: 'Field with this name already exists' };
    }
  }

  // Generate Field ID
  const fieldId = generateFieldId(fieldsSheet);

  // Extract parameters
  const length = parseFloat(params.length) || 0;
  const width = parseFloat(params.width) || 0;
  const pathWidth = parseFloat(params.pathWidth) || FIELD_CONFIG.DEFAULT_PATH_WIDTH;
  const bedWidth = parseFloat(params.bedWidth) || FIELD_CONFIG.DEFAULT_BED_WIDTH;
  const notes = params.notes || '';
  const fieldType = params.type || 'Veg';

  // Calculate acreage
  let acreage = 0;
  if (length > 0 && width > 0) {
    acreage = Number(((length * width) / 43560).toFixed(2));
  }

  // Calculate beds from dimensions OR polygon
  let calcBeds = 0;
  let shapeType = 'RECTANGLE';
  let gpsPolygon = null;
  let bedLengths = [];

  if (params.gpsPolygon && Array.isArray(params.gpsPolygon)) {
    // GPS mode - calculate from polygon
    shapeType = 'POLYGON';
    gpsPolygon = params.gpsPolygon;

    const polyCalc = calculateBedsFromPolygonInternal(gpsPolygon, bedWidth, pathWidth, length);
    calcBeds = polyCalc.bedCount;
    bedLengths = polyCalc.bedLengths;

    // Update acreage from polygon area
    if (polyCalc.areaFt > 0) {
      acreage = Number((polyCalc.areaFt / 43560).toFixed(2));
    }

    // Check if it's a contour field
    if (polyCalc.isContour) {
      shapeType = 'CONTOUR';
    }
  } else if (width > 0 && bedWidth > 0) {
    // Simple mode - calculate from width
    const bedUnitInches = pathWidth + bedWidth;
    calcBeds = Math.floor((width * 12) / bedUnitInches);

    // All beds have same length in simple mode
    for (let i = 0; i < calcBeds; i++) {
      bedLengths.push(length);
    }
  }

  // Allow override
  let numberOfBeds = calcBeds;
  let bedOverride = false;
  let overrideReason = '';

  if (params.overrideBeds && parseInt(params.overrideBeds) !== calcBeds) {
    numberOfBeds = parseInt(params.overrideBeds);
    bedOverride = true;
    overrideReason = params.overrideReason || 'Manual override';
  }

  // Build row data
  // Columns: A-M (existing) + N-R (new)
  // A:FieldID, B:Name, C:Acreage, D:Length, E:Width, F:PathWidth, G:BedWidth, H:NumBeds
  // I:Notes, J:Veg, K:Floral, L:Perennial, M:Cover
  // N:CalcBeds, O:BedOverride, P:OverrideReason, Q:ShapeType, R:GPS_Polygon

  const newRow = [
    fieldId,
    name,
    acreage,
    length,
    width,
    pathWidth,
    bedWidth,
    numberOfBeds,
    notes,
    fieldType === 'Veg',
    fieldType === 'Floral',
    fieldType === 'Perennial',
    fieldType === 'Cover',
    calcBeds,
    bedOverride,
    overrideReason,
    shapeType,
    gpsPolygon ? JSON.stringify(gpsPolygon) : ''
  ];

  // Append to sheet
  fieldsSheet.appendRow(newRow);

  // Generate beds
  const bedsResult = generateBedsForField(ss, name, numberOfBeds, length, fieldType, bedLengths);

  return {
    success: true,
    fieldId: fieldId,
    name: name,
    acreage: acreage,
    numberOfBeds: numberOfBeds,
    calcBeds: calcBeds,
    bedOverride: bedOverride,
    shapeType: shapeType,
    bedsCreated: bedsResult.count,
    message: `Field "${name}" created with ${numberOfBeds} beds`
  };
}

/**
 * Update an existing field
 */
function updateField(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const fieldsSheet = ss.getSheetByName('REF_Fields');

  const fieldName = params.name || params.fieldName;
  if (!fieldName) {
    return { success: false, error: 'Field name required' };
  }

  // Find field row
  const data = fieldsSheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === fieldName) {
      rowIndex = i + 1; // Sheet row (1-indexed)
      break;
    }
  }

  if (rowIndex === -1) {
    return { success: false, error: 'Field not found: ' + fieldName };
  }

  // Get current values
  const currentRow = data[rowIndex - 1];

  // Update fields that were provided
  const updates = {};

  if (params.length !== undefined) {
    updates.length = parseFloat(params.length);
    fieldsSheet.getRange(rowIndex, 4).setValue(updates.length);
  }

  if (params.width !== undefined) {
    updates.width = parseFloat(params.width);
    fieldsSheet.getRange(rowIndex, 5).setValue(updates.width);
  }

  if (params.pathWidth !== undefined) {
    updates.pathWidth = parseFloat(params.pathWidth);
    fieldsSheet.getRange(rowIndex, 6).setValue(updates.pathWidth);
  }

  if (params.bedWidth !== undefined) {
    updates.bedWidth = parseFloat(params.bedWidth);
    fieldsSheet.getRange(rowIndex, 7).setValue(updates.bedWidth);
  }

  if (params.notes !== undefined) {
    fieldsSheet.getRange(rowIndex, 9).setValue(params.notes);
  }

  if (params.type !== undefined) {
    const isVeg = params.type === 'Veg';
    const isFloral = params.type === 'Floral';
    const isPerennial = params.type === 'Perennial';
    const isCover = params.type === 'Cover';

    fieldsSheet.getRange(rowIndex, 10).setValue(isVeg);
    fieldsSheet.getRange(rowIndex, 11).setValue(isFloral);
    fieldsSheet.getRange(rowIndex, 12).setValue(isPerennial);
    fieldsSheet.getRange(rowIndex, 13).setValue(isCover);
  }

  // Handle bed override
  if (params.overrideBeds !== undefined) {
    const newBedCount = parseInt(params.overrideBeds);
    fieldsSheet.getRange(rowIndex, 8).setValue(newBedCount);
    fieldsSheet.getRange(rowIndex, 15).setValue(true); // Bed_Override
    fieldsSheet.getRange(rowIndex, 16).setValue(params.overrideReason || 'Manual override');
  }

  // Handle GPS polygon update
  if (params.gpsPolygon !== undefined) {
    const polygon = params.gpsPolygon;
    fieldsSheet.getRange(rowIndex, 18).setValue(polygon ? JSON.stringify(polygon) : '');
    fieldsSheet.getRange(rowIndex, 17).setValue(polygon ? 'POLYGON' : 'RECTANGLE');
  }

  // Recalculate acreage and beds if dimensions changed
  const length = updates.length !== undefined ? updates.length : currentRow[3];
  const width = updates.width !== undefined ? updates.width : currentRow[4];
  const pathWidth = updates.pathWidth !== undefined ? updates.pathWidth : currentRow[5];
  const bedWidth = updates.bedWidth !== undefined ? updates.bedWidth : currentRow[6];

  if (length > 0 && width > 0) {
    const acreage = Number(((length * width) / 43560).toFixed(2));
    fieldsSheet.getRange(rowIndex, 3).setValue(acreage);
  }

  if (width > 0 && bedWidth > 0) {
    const bedUnit = (pathWidth || 12) + bedWidth;
    const calcBeds = Math.floor((width * 12) / bedUnit);
    fieldsSheet.getRange(rowIndex, 14).setValue(calcBeds); // Calc_Beds

    // If not overridden, update actual bed count
    const isOverridden = fieldsSheet.getRange(rowIndex, 15).getValue() === true;
    if (!isOverridden && params.overrideBeds === undefined) {
      fieldsSheet.getRange(rowIndex, 8).setValue(calcBeds);
    }
  }

  // Regenerate beds if requested
  if (params.regenerateBeds === true) {
    regenerateFieldBeds({ fieldName: fieldName });
  }

  return {
    success: true,
    fieldName: fieldName,
    updates: updates,
    message: `Field "${fieldName}" updated successfully`
  };
}

/**
 * Delete a field and its beds
 */
function deleteField(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const fieldsSheet = ss.getSheetByName('REF_Fields');
  const bedsSheet = ss.getSheetByName('REF_Beds');

  const fieldName = params.name || params.fieldName;
  if (!fieldName) {
    return { success: false, error: 'Field name required' };
  }

  // Find field row
  const fieldData = fieldsSheet.getDataRange().getValues();
  let fieldRowIndex = -1;

  for (let i = 1; i < fieldData.length; i++) {
    if (fieldData[i][1] === fieldName) {
      fieldRowIndex = i + 1;
      break;
    }
  }

  if (fieldRowIndex === -1) {
    return { success: false, error: 'Field not found: ' + fieldName };
  }

  // Delete beds for this field
  let bedsDeleted = 0;
  if (bedsSheet) {
    const bedData = bedsSheet.getDataRange().getValues();
    const rowsToDelete = [];

    for (let i = bedData.length - 1; i >= 1; i--) {
      if (bedData[i][1] === fieldName) {
        rowsToDelete.push(i + 1);
        bedsDeleted++;
      }
    }

    // Delete in reverse order to avoid row shifting issues
    for (const row of rowsToDelete) {
      bedsSheet.deleteRow(row);
    }
  }

  // Delete field row
  fieldsSheet.deleteRow(fieldRowIndex);

  return {
    success: true,
    fieldName: fieldName,
    bedsDeleted: bedsDeleted,
    message: `Field "${fieldName}" and ${bedsDeleted} beds deleted`
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BED GENERATION & MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate beds for a field (internal helper)
 */
function generateBedsForField(ss, fieldName, bedCount, defaultLength, fieldType, bedLengths) {
  const bedsSheet = ss.getSheetByName('REF_Beds');
  if (!bedsSheet) {
    return { success: false, error: 'REF_Beds sheet not found' };
  }

  const newBeds = [];

  for (let i = 1; i <= bedCount; i++) {
    const bedIndex = i < 10 ? '0' + i : String(i);
    const bedId = fieldName + '-' + bedIndex;
    const length = bedLengths && bedLengths[i - 1] ? bedLengths[i - 1] : defaultLength;
    const calcLength = bedLengths && bedLengths[i - 1] ? bedLengths[i - 1] : null;

    newBeds.push([
      bedId,           // Bed ID
      fieldName,       // Parent Field
      i,               // Index
      length,          // Length
      'Available',     // Status
      fieldType,       // Type
      calcLength,      // Calc_Length (new column)
      false            // Length_Override (new column)
    ]);
  }

  if (newBeds.length > 0) {
    const startRow = bedsSheet.getLastRow() + 1;
    bedsSheet.getRange(startRow, 1, newBeds.length, newBeds[0].length).setValues(newBeds);
  }

  return { success: true, count: newBeds.length };
}

/**
 * Regenerate beds for a field (after field changes)
 */
function regenerateFieldBeds(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const fieldName = params.fieldName || params.name;

  if (!fieldName) {
    return { success: false, error: 'Field name required' };
  }

  // Get field details
  const fieldDetails = getFieldDetails({ fieldName: fieldName });
  if (!fieldDetails.success) {
    return fieldDetails;
  }

  const field = fieldDetails.field;
  const existingBeds = fieldDetails.beds;
  const bedsSheet = ss.getSheetByName('REF_Beds');

  // Remember existing bed data (length overrides, status)
  const bedMemory = {};
  for (const bed of existingBeds) {
    bedMemory[bed.bedId] = {
      length: bed.length,
      status: bed.status,
      lengthOverride: bed.lengthOverride
    };
  }

  // Calculate new bed lengths if GPS polygon
  let bedLengths = [];
  if (field.gpsPolygon) {
    const polyCalc = calculateBedsFromPolygonInternal(
      field.gpsPolygon,
      field.bedWidth,
      field.pathWidth,
      field.length
    );
    bedLengths = polyCalc.bedLengths;
  }

  // Delete existing beds for this field
  const bedData = bedsSheet.getDataRange().getValues();
  for (let i = bedData.length - 1; i >= 1; i--) {
    if (bedData[i][1] === fieldName) {
      bedsSheet.deleteRow(i + 1);
    }
  }

  // Generate new beds
  const newBeds = [];
  const bedCount = field.numberOfBeds;

  for (let i = 1; i <= bedCount; i++) {
    const bedIndex = i < 10 ? '0' + i : String(i);
    const bedId = fieldName + '-' + bedIndex;

    // Get length - prefer memory, then calculated, then default
    let length = field.length;
    let calcLength = bedLengths[i - 1] || null;
    let lengthOverride = false;
    let status = 'Available';

    if (bedMemory[bedId]) {
      // Preserve existing data
      if (bedMemory[bedId].lengthOverride) {
        length = bedMemory[bedId].length;
        lengthOverride = true;
      } else if (calcLength) {
        length = calcLength;
      }
      status = bedMemory[bedId].status || 'Available';
    } else if (calcLength) {
      length = calcLength;
    }

    newBeds.push([
      bedId,
      fieldName,
      i,
      length,
      status,
      field.type,
      calcLength,
      lengthOverride
    ]);
  }

  if (newBeds.length > 0) {
    const startRow = bedsSheet.getLastRow() + 1;
    bedsSheet.getRange(startRow, 1, newBeds.length, newBeds[0].length).setValues(newBeds);
  }

  return {
    success: true,
    fieldName: fieldName,
    bedsGenerated: newBeds.length,
    message: `Regenerated ${newBeds.length} beds for "${fieldName}"`
  };
}

/**
 * Update individual bed properties
 */
function updateBed(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const bedsSheet = ss.getSheetByName('REF_Beds');

  const bedId = params.bedId;
  if (!bedId) {
    return { success: false, error: 'Bed ID required' };
  }

  // Find bed row
  const data = bedsSheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === bedId) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return { success: false, error: 'Bed not found: ' + bedId };
  }

  // Update provided fields
  if (params.length !== undefined) {
    bedsSheet.getRange(rowIndex, 4).setValue(parseFloat(params.length));
    bedsSheet.getRange(rowIndex, 8).setValue(true); // Length_Override
  }

  if (params.status !== undefined) {
    bedsSheet.getRange(rowIndex, 5).setValue(params.status);
  }

  return {
    success: true,
    bedId: bedId,
    message: `Bed "${bedId}" updated`
  };
}

/**
 * Bulk update bed lengths for contour fields
 */
function updateBedLengths(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const bedsSheet = ss.getSheetByName('REF_Beds');

  const fieldName = params.fieldName;
  const lengths = params.lengths; // Array of {bedId, length}

  if (!fieldName || !lengths || !Array.isArray(lengths)) {
    return { success: false, error: 'Field name and lengths array required' };
  }

  const data = bedsSheet.getDataRange().getValues();
  let updated = 0;

  for (const item of lengths) {
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === item.bedId) {
        bedsSheet.getRange(i + 1, 4).setValue(parseFloat(item.length));
        bedsSheet.getRange(i + 1, 8).setValue(true); // Length_Override
        updated++;
        break;
      }
    }
  }

  return {
    success: true,
    fieldName: fieldName,
    bedsUpdated: updated,
    message: `Updated lengths for ${updated} beds`
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GPS POLYGON CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate beds from GPS polygon (API endpoint)
 */
function calculateBedsFromPolygon(params) {
  const polygon = params.polygon || params.gpsPolygon;
  const bedWidth = parseFloat(params.bedWidth) || FIELD_CONFIG.DEFAULT_BED_WIDTH;
  const pathWidth = parseFloat(params.pathWidth) || FIELD_CONFIG.DEFAULT_PATH_WIDTH;
  const orientation = params.orientation || 'auto'; // 'auto', 'ns', 'ew', degrees

  if (!polygon || !Array.isArray(polygon) || polygon.length < FIELD_CONFIG.MIN_POLYGON_POINTS) {
    return { success: false, error: 'Valid polygon with at least 3 points required' };
  }

  const result = calculateBedsFromPolygonInternal(polygon, bedWidth, pathWidth, 0, orientation);

  return {
    success: true,
    ...result
  };
}

/**
 * Internal polygon to bed calculation
 */
function calculateBedsFromPolygonInternal(polygon, bedWidth, pathWidth, defaultLength, orientation) {
  // Step 1: Convert GPS coordinates to local feet (relative to centroid)
  const localPoints = gpsToLocalFeet(polygon);

  // Step 2: Calculate polygon area
  const areaFt = calculatePolygonArea(localPoints);

  // Step 3: Find optimal bed orientation
  let rotationAngle = 0;
  if (orientation === 'auto') {
    rotationAngle = findOptimalOrientation(localPoints);
  } else if (orientation === 'ns') {
    rotationAngle = 0;
  } else if (orientation === 'ew') {
    rotationAngle = 90;
  } else {
    rotationAngle = parseFloat(orientation) || 0;
  }

  // Step 4: Rotate polygon to align with bed orientation
  const rotatedPoints = rotatePolygon(localPoints, -rotationAngle);

  // Step 5: Calculate bounding box
  const bbox = getBoundingBox(rotatedPoints);

  // Step 6: Calculate bed spacing in feet
  const bedUnitFt = (bedWidth + pathWidth) / 12;

  // Step 7: Scan across polygon width to calculate beds
  const beds = [];
  let y = bbox.minY + bedUnitFt / 2;
  let bedIndex = 1;

  while (y < bbox.maxY) {
    // Find intersections of horizontal line with polygon
    const intersections = findPolygonIntersections(rotatedPoints, y);

    if (intersections.length >= 2) {
      // Sort intersections by X
      intersections.sort((a, b) => a - b);

      // Calculate bed length (distance between first and last intersection)
      const bedLength = intersections[intersections.length - 1] - intersections[0];

      if (bedLength > 0) {
        beds.push({
          index: bedIndex,
          length: Math.round(bedLength * 10) / 10, // Round to 1 decimal
          yPosition: y,
          xStart: intersections[0],
          xEnd: intersections[intersections.length - 1]
        });
        bedIndex++;
      }
    }

    y += bedUnitFt;
  }

  // Step 8: Determine if it's a contour field
  let isContour = false;
  let lengthVariance = 0;

  if (beds.length > 1) {
    const lengths = beds.map(b => b.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const maxDiff = Math.max(...lengths.map(l => Math.abs(l - avgLength)));
    lengthVariance = avgLength > 0 ? maxDiff / avgLength : 0;
    isContour = lengthVariance > FIELD_CONFIG.CONTOUR_THRESHOLD;
  }

  return {
    bedCount: beds.length,
    bedLengths: beds.map(b => b.length),
    beds: beds,
    areaFt: areaFt,
    areaAcres: Number((areaFt / 43560).toFixed(2)),
    rotationAngle: rotationAngle,
    isContour: isContour,
    lengthVariance: Math.round(lengthVariance * 100),
    boundingBox: bbox
  };
}

/**
 * Preview bed layout (for visualization)
 */
function previewBedLayout(params) {
  const fieldName = params.fieldName;
  const polygon = params.polygon;
  const bedWidth = parseFloat(params.bedWidth) || FIELD_CONFIG.DEFAULT_BED_WIDTH;
  const pathWidth = parseFloat(params.pathWidth) || FIELD_CONFIG.DEFAULT_PATH_WIDTH;

  let polyData;

  if (polygon) {
    polyData = calculateBedsFromPolygonInternal(polygon, bedWidth, pathWidth, 0);
  } else if (fieldName) {
    // Get existing field polygon
    const fieldDetails = getFieldDetails({ fieldName: fieldName });
    if (fieldDetails.success && fieldDetails.field.gpsPolygon) {
      polyData = calculateBedsFromPolygonInternal(
        fieldDetails.field.gpsPolygon,
        bedWidth,
        pathWidth,
        0
      );
    }
  }

  if (!polyData) {
    return { success: false, error: 'No polygon data available' };
  }

  // Convert bed layout to visualization format
  const visualization = {
    beds: polyData.beds.map(bed => ({
      index: bed.index,
      length: bed.length,
      centerY: bed.yPosition,
      startX: bed.xStart,
      endX: bed.xEnd,
      width: bedWidth / 12 // Convert to feet
    })),
    boundingBox: polyData.boundingBox,
    rotationAngle: polyData.rotationAngle,
    isContour: polyData.isContour
  };

  return {
    success: true,
    visualization: visualization,
    summary: {
      totalBeds: polyData.bedCount,
      areaAcres: polyData.areaAcres,
      lengthVariance: polyData.lengthVariance + '%'
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GPS COORDINATE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert GPS coordinates to local feet (relative to centroid)
 */
function gpsToLocalFeet(polygon) {
  // Calculate centroid
  let sumLat = 0, sumLng = 0;
  for (const point of polygon) {
    sumLat += point.lat;
    sumLng += point.lng;
  }
  const centroid = {
    lat: sumLat / polygon.length,
    lng: sumLng / polygon.length
  };

  // Convert to feet relative to centroid
  const points = [];
  for (const point of polygon) {
    const x = haversineDistanceFt(centroid.lat, centroid.lng, centroid.lat, point.lng);
    const y = haversineDistanceFt(centroid.lat, centroid.lng, point.lat, centroid.lng);

    // Apply sign based on direction from centroid
    points.push({
      x: point.lng > centroid.lng ? x : -x,
      y: point.lat > centroid.lat ? y : -y
    });
  }

  return points;
}

/**
 * Haversine distance in feet between two GPS coordinates
 */
function haversineDistanceFt(lat1, lon1, lat2, lon2) {
  const R = FIELD_CONFIG.EARTH_RADIUS_FT;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

/**
 * Calculate polygon area using shoelace formula
 */
function calculatePolygonArea(points) {
  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area / 2);
}

/**
 * Find optimal orientation for beds (perpendicular to longest edge)
 */
function findOptimalOrientation(points) {
  let maxLength = 0;
  let optimalAngle = 0;

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const dx = points[j].x - points[i].x;
    const dy = points[j].y - points[i].y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length > maxLength) {
      maxLength = length;
      // Beds run perpendicular to longest edge
      optimalAngle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    }
  }

  return optimalAngle;
}

/**
 * Rotate polygon points around origin
 */
function rotatePolygon(points, angleDegrees) {
  const angleRad = angleDegrees * Math.PI / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  return points.map(p => ({
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos
  }));
}

/**
 * Get bounding box of polygon
 */
function getBoundingBox(points) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Find where a horizontal line intersects the polygon
 */
function findPolygonIntersections(points, y) {
  const intersections = [];
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const p1 = points[i];
    const p2 = points[j];

    // Check if the horizontal line crosses this edge
    if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
      // Calculate X intersection
      const t = (y - p1.y) / (p2.y - p1.y);
      const x = p1.x + t * (p2.x - p1.x);
      intersections.push(x);
    }
  }

  return intersections;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate unique field ID
 */
function generateFieldId(sheet) {
  const data = sheet.getDataRange().getValues();
  let maxId = 0;

  for (let i = 1; i < data.length; i++) {
    const id = parseInt(String(data[i][0]).replace(/\D/g, '')) || 0;
    maxId = Math.max(maxId, id);
  }

  return 'F' + String(maxId + 1).padStart(3, '0');
}

/**
 * Serve the Field Management Dashboard HTML
 */
function getFieldManagementDashboard() {
  return HtmlService.createTemplateFromFile('FieldManagementDashboard')
    .evaluate()
    .setTitle('Field Management Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Serve the Mobile GPS Capture HTML
 */
function getFieldMobileCapture() {
  return HtmlService.createTemplateFromFile('FieldMobileCapture')
    .evaluate()
    .setTitle('GPS Field Capture')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ROUTING HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Field Management API Routes (add to doGet in MERGED TOTAL.js)
 *
 * case 'getFieldsDashboard':
 *   return jsonResponse(getFieldsDashboard(e.parameter));
 * case 'getFieldDetails':
 *   return jsonResponse(getFieldDetails(e.parameter));
 * case 'createField':
 *   return jsonResponse(createField(e.parameter));
 * case 'updateField':
 *   return jsonResponse(updateField(e.parameter));
 * case 'deleteField':
 *   return jsonResponse(deleteField(e.parameter));
 * case 'calculateBedsFromPolygon':
 *   return jsonResponse(calculateBedsFromPolygon(e.parameter));
 * case 'previewBedLayout':
 *   return jsonResponse(previewBedLayout(e.parameter));
 * case 'regenerateFieldBeds':
 *   return jsonResponse(regenerateFieldBeds(e.parameter));
 * case 'updateBed':
 *   return jsonResponse(updateBed(e.parameter));
 * case 'updateBedLengths':
 *   return jsonResponse(updateBedLengths(e.parameter));
 * case 'ensureFieldSchemaExtensions':
 *   return jsonResponse(ensureFieldSchemaExtensions());
 * case 'getFieldManagementUI':
 *   return getFieldManagementDashboard();
 * case 'getFieldMobileUI':
 *   return getFieldMobileCapture();
 */
