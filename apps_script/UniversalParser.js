// ===============================================================================
// UNIVERSAL DOCUMENT PARSER MODULE
// Production-Ready File Parser for Tiny Seed Farm
// ===============================================================================
//
// Purpose: Parse uploaded documents (CSV, Excel, PDF) with intelligent data
// extraction and AI-powered categorization of sales data.
//
// Features:
// - Universal file type detection
// - Intelligent CSV parsing with column name normalization
// - AI-powered product categorization using Claude
// - Support for Shopify, QuickBooks, and POS exports
// - Automatic data storage to PARSED_SALES_DATA sheet
// - Comprehensive error logging
//
// @author Backend_Claude
// @created 2026-02-07
// ===============================================================================

// ===============================================================================
// CONFIGURATION
// ===============================================================================

const PARSER_SPREADSHEET_ID = '128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc';

// Sheet names for parser
const PARSER_SHEETS = {
  PARSED_SALES_DATA: 'PARSED_SALES_DATA',
  PARSE_LOGS: 'PARSE_LOGS',
  PARSE_ERRORS: 'PARSE_ERRORS',
  CATEGORY_CACHE: 'PARSER_CategoryCache'
};

// Headers for parser sheets
const PARSER_SHEET_HEADERS = {
  PARSED_SALES_DATA: [
    'Record_ID', 'Date', 'Year', 'Category', 'Subcategory', 'ProductName',
    'Revenue', 'Quantity', 'Source', 'OriginalRow', 'ParsedAt', 'SourceFile'
  ],
  PARSE_LOGS: [
    'Log_ID', 'Timestamp', 'FileName', 'FileType', 'FileSize', 'Status',
    'RecordsProcessed', 'RecordsSuccess', 'RecordsError', 'Duration_ms', 'Notes'
  ],
  PARSE_ERRORS: [
    'Error_ID', 'Timestamp', 'FileName', 'RowNumber', 'ErrorType', 'ErrorMessage',
    'RawData', 'Resolved', 'ResolvedAt', 'ResolvedBy', 'Resolution'
  ],
  CATEGORY_CACHE: [
    'ProductName', 'Category', 'Subcategory', 'ConfidenceScore', 'CachedAt', 'Source'
  ]
};

// Tiny Seed Farm product categories
const TINY_SEED_CATEGORIES = {
  CSA_VEGETABLE: {
    name: 'CSA_VEGETABLE',
    displayName: 'CSA Vegetable Shares',
    keywords: ['csa', 'summer csa', 'spring csa', 'fall csa', 'winter csa', 'thanksgiving',
               'vegetable share', 'veg share', 'produce share', 'farm share', 'veggie box',
               'tiny seed farm summer', 'tiny seed farm spring', 'tiny seed farm fall',
               'flex weekly', 'weekly share', 'biweekly share'],
    subcategories: ['Summer CSA', 'Spring CSA', 'Fall CSA', 'Thanksgiving', 'Winter CSA', 'Flex CSA']
  },
  FLOWER_SUBSCRIPTION: {
    name: 'FLOWER_SUBSCRIPTION',
    displayName: 'Flower Subscriptions',
    keywords: ['fleurs', 'flower', 'bloom', 'dahlia', 'bouquet', 'floral',
               'full bloom', 'petite bloom', 'standard weekly', 'flower subscription',
               'tiny seed fleurs', 'weekly flowers', 'flower share'],
    subcategories: ['Full Bloom', 'Petite Bloom', 'Standard Weekly', 'Dahlia Season', 'Wedding Flowers']
  },
  PARTNER_ADDON: {
    name: 'PARTNER_ADDON',
    displayName: 'Partner Add-ons',
    keywords: ['mushroom', 'bread', 'cheese', 'coffee', 'goat rodeo', 'redhawk',
               'local bread', 'add-on', 'addon', 'egg', 'honey', 'pasta', 'jam'],
    subcategories: ['Mushrooms', 'Bread', 'Cheese', 'Coffee', 'Eggs', 'Honey', 'Other Add-ons']
  },
  FARMERS_MARKET: {
    name: 'FARMERS_MARKET',
    displayName: "Farmers' Market Sales",
    keywords: ['pos', 'market', 'farmers market', "farmer's market", 'cash sale',
               'market sale', 'lawrenceville', 'bloomfield', 'sewickley', 'squirrel hill',
               'highland park', 'mt lebanon'],
    subcategories: ['Lawrenceville Market', 'Bloomfield Market', 'Sewickley Market',
                    'Squirrel Hill Market', 'Highland Park Market', 'Other Markets']
  },
  WHOLESALE: {
    name: 'WHOLESALE',
    displayName: 'Wholesale Sales',
    keywords: ['wholesale', 'restaurant', 'chef', 'bulk', 'invoice', 'net 30',
               'commercial', 'business', 'case', 'pallet'],
    subcategories: ['Restaurant', 'Grocery', 'Distributor', 'Institutional']
  },
  DIRECT_SALES: {
    name: 'DIRECT_SALES',
    displayName: 'Direct Sales',
    keywords: ['farm stand', 'online order', 'direct', 'pickup', 'delivery',
               'web order', 'shopify', 'ecommerce'],
    subcategories: ['Farm Stand', 'Online Orders', 'Farm Pickup', 'Home Delivery']
  },
  UNCATEGORIZED: {
    name: 'UNCATEGORIZED',
    displayName: 'Uncategorized',
    keywords: [],
    subcategories: ['Needs Review']
  }
};

// Column name mappings for different sources
const COLUMN_MAPPINGS = {
  // Shopify Sales Export
  shopify_sales: {
    detect: ['product title', 'total sales', 'quantity ordered'],
    mappings: {
      'product title': 'productName',
      'product': 'productName',
      'total sales': 'revenue',
      'net sales': 'revenue',
      'gross sales': 'revenue',
      'quantity ordered': 'quantity',
      'quantity': 'quantity',
      'sold': 'quantity',
      'year': 'year',
      'date': 'date',
      'order date': 'date'
    },
    source: 'Shopify'
  },
  // QuickBooks Export
  quickbooks: {
    detect: ['type', 'num', 'name', 'amount'],
    mappings: {
      'date': 'date',
      'txn date': 'date',
      'type': 'transactionType',
      'num': 'referenceNumber',
      'name': 'productName',
      'memo': 'description',
      'amount': 'revenue',
      'credit': 'revenue',
      'debit': 'expense'
    },
    source: 'QuickBooks'
  },
  // Shopify POS Export
  shopify_pos: {
    detect: ['order', 'created at', 'total', 'source'],
    mappings: {
      'order': 'orderId',
      'created at': 'date',
      'total': 'revenue',
      'source': 'salesChannel',
      'line item name': 'productName',
      'line item quantity': 'quantity',
      'line item price': 'unitPrice'
    },
    source: 'Shopify POS'
  },
  // Generic/Default
  generic: {
    detect: [],
    mappings: {
      'name': 'productName',
      'product': 'productName',
      'item': 'productName',
      'description': 'productName',
      'amount': 'revenue',
      'total': 'revenue',
      'price': 'revenue',
      'sales': 'revenue',
      'qty': 'quantity',
      'quantity': 'quantity',
      'count': 'quantity',
      'date': 'date',
      'year': 'year'
    },
    source: 'Generic'
  }
};

// ===============================================================================
// INITIALIZATION
// ===============================================================================

/**
 * Initialize all parser sheets
 * @returns {Object} Result with created sheets
 */
function initializeParserSheets() {
  const results = { success: true, created: [], skipped: [], errors: [] };

  try {
    const ss = SpreadsheetApp.openById(PARSER_SPREADSHEET_ID);

    for (const [key, sheetName] of Object.entries(PARSER_SHEETS)) {
      try {
        const headers = PARSER_SHEET_HEADERS[key];
        if (!headers) continue;

        let sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
          sheet = ss.insertSheet(sheetName);
          sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
          sheet.getRange(1, 1, 1, headers.length)
            .setBackground('#1e40af')
            .setFontColor('#ffffff')
            .setFontWeight('bold');
          sheet.setFrozenRows(1);
          sheet.setTabColor('#1e40af');
          results.created.push(sheetName);
        } else {
          results.skipped.push(sheetName);
        }
      } catch (sheetError) {
        results.errors.push({ sheet: sheetName, error: sheetError.toString() });
      }
    }

    Logger.log('[UniversalParser] Initialization complete: ' + JSON.stringify(results));
    return results;

  } catch (error) {
    Logger.log('[UniversalParser] Initialization error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ===============================================================================
// MAIN ENTRY POINT: parseUniversalDocument
// ===============================================================================

/**
 * Main entry point - parses ANY uploaded file
 * @param {Object} params - { fileContent: base64, fileName: string, mimeType: string }
 * @returns {Object} { success: boolean, data: ParsedData, errors: [] }
 */
function parseUniversalDocument(params) {
  const startTime = Date.now();
  const logId = 'LOG-' + Date.now();

  const result = {
    success: true,
    data: {
      records: [],
      summary: {},
      fileInfo: {}
    },
    errors: [],
    warnings: [],
    logId: logId
  };

  try {
    // Validate input
    if (!params) {
      throw new Error('No parameters provided');
    }

    const fileContent = params.fileContent;
    const fileName = params.fileName || 'unknown';
    const mimeType = params.mimeType || '';

    if (!fileContent) {
      throw new Error('No file content provided');
    }

    // Detect file type
    const fileType = detectFileType(fileContent, fileName, mimeType);
    result.data.fileInfo = {
      fileName: fileName,
      mimeType: mimeType,
      detectedType: fileType.type,
      encoding: fileType.encoding,
      size: fileContent.length
    };

    Logger.log('[UniversalParser] Processing file: ' + fileName + ' (Type: ' + fileType.type + ')');

    // Decode and parse based on file type
    let rawData = [];

    switch (fileType.type) {
      case 'csv':
        rawData = parseCSVContent(fileContent, fileType.encoding, fileType.delimiter);
        break;

      case 'excel':
        rawData = parseExcelContent(fileContent);
        break;

      case 'pdf':
        rawData = parsePDFContent(fileContent);
        break;

      default:
        // Try as CSV first (most common)
        try {
          rawData = parseCSVContent(fileContent, 'utf-8', ',');
        } catch (csvError) {
          throw new Error('Unable to parse file type: ' + fileType.type);
        }
    }

    if (rawData.length === 0) {
      throw new Error('No data found in file');
    }

    // Detect source format and normalize columns
    const normalizedData = normalizeData(rawData);
    result.data.sourceFormat = normalizedData.sourceFormat;
    result.data.columnMapping = normalizedData.columnMapping;

    // Process each row
    for (let i = 0; i < normalizedData.records.length; i++) {
      try {
        const record = normalizedData.records[i];
        result.data.records.push(record);
      } catch (rowError) {
        result.errors.push({
          row: i + 1,
          error: rowError.toString(),
          rawData: JSON.stringify(normalizedData.records[i])
        });
      }
    }

    // Calculate summary
    result.data.summary = {
      totalRecords: result.data.records.length,
      successfulRecords: result.data.records.length - result.errors.length,
      errorRecords: result.errors.length,
      dateRange: getDateRange(result.data.records),
      totalRevenue: result.data.records.reduce((sum, r) => sum + (parseFloat(r.revenue) || 0), 0)
    };

    // Log the parse attempt
    logParseAttempt({
      logId: logId,
      fileName: fileName,
      fileType: fileType.type,
      fileSize: fileContent.length,
      status: result.errors.length === 0 ? 'SUCCESS' : 'PARTIAL',
      recordsProcessed: result.data.records.length,
      recordsSuccess: result.data.records.length - result.errors.length,
      recordsError: result.errors.length,
      duration: Date.now() - startTime,
      notes: result.warnings.join('; ')
    });

    Logger.log('[UniversalParser] Parsed ' + result.data.records.length + ' records in ' + (Date.now() - startTime) + 'ms');

  } catch (error) {
    result.success = false;
    result.errors.push({
      type: 'FATAL',
      message: error.toString()
    });

    // Log the failed parse
    logParseAttempt({
      logId: logId,
      fileName: params?.fileName || 'unknown',
      fileType: 'unknown',
      fileSize: params?.fileContent?.length || 0,
      status: 'FAILED',
      recordsProcessed: 0,
      recordsSuccess: 0,
      recordsError: 1,
      duration: Date.now() - startTime,
      notes: error.toString()
    });

    // Store error for review
    logParseError({
      fileName: params?.fileName || 'unknown',
      rowNumber: 0,
      errorType: 'FATAL',
      errorMessage: error.toString(),
      rawData: ''
    });

    Logger.log('[UniversalParser] Parse failed: ' + error.toString());
  }

  return result;
}

// ===============================================================================
// FILE TYPE DETECTION
// ===============================================================================

/**
 * Detect file type from content, name, and MIME type
 * @param {string} content - Base64 encoded content
 * @param {string} fileName - Original file name
 * @param {string} mimeType - MIME type if provided
 * @returns {Object} { type, encoding, delimiter }
 */
function detectFileType(content, fileName, mimeType) {
  const result = {
    type: 'unknown',
    encoding: 'utf-8',
    delimiter: ','
  };

  // Check MIME type first
  if (mimeType) {
    if (mimeType.includes('csv') || mimeType.includes('comma-separated')) {
      result.type = 'csv';
    } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet') ||
               mimeType.includes('xlsx') || mimeType.includes('xls')) {
      result.type = 'excel';
    } else if (mimeType.includes('pdf')) {
      result.type = 'pdf';
    } else if (mimeType.includes('text/plain') || mimeType.includes('text/tab-separated')) {
      result.type = 'csv';
      result.delimiter = '\t';
    }
  }

  // Check file extension
  if (result.type === 'unknown' && fileName) {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'csv':
        result.type = 'csv';
        break;
      case 'tsv':
        result.type = 'csv';
        result.delimiter = '\t';
        break;
      case 'xlsx':
      case 'xls':
        result.type = 'excel';
        break;
      case 'pdf':
        result.type = 'pdf';
        break;
      case 'txt':
        result.type = 'csv';
        break;
    }
  }

  // Check content signature (magic bytes)
  if (result.type === 'unknown' && content) {
    try {
      const decoded = Utilities.base64Decode(content.substring(0, 100));
      const bytes = decoded.slice(0, 8);

      // PDF signature: %PDF
      if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
        result.type = 'pdf';
      }
      // Excel XLSX (ZIP format): PK
      else if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
        result.type = 'excel';
      }
      // Excel XLS (OLE): D0 CF 11 E0
      else if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) {
        result.type = 'excel';
      }
      // Default to CSV for text content
      else {
        result.type = 'csv';
      }
    } catch (e) {
      result.type = 'csv'; // Default to CSV
    }
  }

  // Detect encoding and delimiter for CSV
  if (result.type === 'csv') {
    try {
      const decoded = Utilities.base64Decode(content);
      const text = Utilities.newBlob(decoded).getDataAsString('UTF-8');

      // Check for BOM
      if (text.charCodeAt(0) === 0xFEFF) {
        result.encoding = 'utf-8-bom';
      }

      // Detect delimiter by counting occurrences in first line
      const firstLine = text.split('\n')[0];
      const commaCount = (firstLine.match(/,/g) || []).length;
      const tabCount = (firstLine.match(/\t/g) || []).length;
      const semicolonCount = (firstLine.match(/;/g) || []).length;

      if (tabCount > commaCount && tabCount > semicolonCount) {
        result.delimiter = '\t';
      } else if (semicolonCount > commaCount) {
        result.delimiter = ';';
      }

      // Check for Latin-1 encoding indicators
      if (text.includes('') || text.includes('')) {
        result.encoding = 'iso-8859-1';
      }

    } catch (e) {
      // Keep defaults
    }
  }

  return result;
}

// ===============================================================================
// CSV PARSING
// ===============================================================================

/**
 * Parse CSV content into array of objects
 * @param {string} base64Content - Base64 encoded CSV content
 * @param {string} encoding - Character encoding
 * @param {string} delimiter - Column delimiter
 * @returns {Array} Array of row objects
 */
function parseCSVContent(base64Content, encoding, delimiter) {
  try {
    // Decode base64
    const decoded = Utilities.base64Decode(base64Content);

    // Try different encodings
    let text;
    try {
      text = Utilities.newBlob(decoded).getDataAsString(encoding === 'iso-8859-1' ? 'ISO-8859-1' : 'UTF-8');
    } catch (e) {
      // Fallback to UTF-8
      text = Utilities.newBlob(decoded).getDataAsString('UTF-8');
    }

    // Remove BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.substring(1);
    }

    // Parse CSV with proper quote handling
    const rows = parseCSVText(text, delimiter);

    if (rows.length === 0) {
      return [];
    }

    // First row is headers
    const headers = rows[0].map(h => h.toLowerCase().trim());

    // Convert to array of objects
    const results = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.every(cell => cell === '')) continue; // Skip empty rows

      const obj = { _rowIndex: i };
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = row[j] || '';
      }
      results.push(obj);
    }

    return results;

  } catch (error) {
    Logger.log('[UniversalParser] CSV parse error: ' + error.toString());
    throw new Error('CSV parse error: ' + error.message);
  }
}

/**
 * Parse CSV text with proper handling of quoted fields
 * @param {string} text - CSV text content
 * @param {string} delimiter - Column delimiter
 * @returns {Array} 2D array of values
 */
function parseCSVText(text, delimiter) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++;
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === delimiter) {
        // End of field
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        // End of row
        currentRow.push(currentField.trim());
        if (currentRow.some(cell => cell !== '')) { // Skip completely empty rows
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        if (char === '\r') i++; // Skip \n in \r\n
      } else if (char === '\r') {
        // End of row (old Mac format)
        currentRow.push(currentField.trim());
        if (currentRow.some(cell => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  // Don't forget the last field/row
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(cell => cell !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// ===============================================================================
// EXCEL PARSING
// ===============================================================================

/**
 * Parse Excel content (XLSX)
 * Note: Limited support in Apps Script - may need to use Drive API
 * @param {string} base64Content - Base64 encoded Excel content
 * @returns {Array} Array of row objects
 */
function parseExcelContent(base64Content) {
  try {
    // Create a blob from the base64 content
    const decoded = Utilities.base64Decode(base64Content);
    const blob = Utilities.newBlob(decoded, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'upload.xlsx');

    // Upload to Drive temporarily
    const file = DriveApp.createFile(blob);
    const fileId = file.getId();

    try {
      // Convert to Google Sheet
      const resource = {
        title: 'temp_excel_import_' + Date.now(),
        mimeType: MimeType.GOOGLE_SHEETS,
        parents: [{id: 'root'}]
      };

      // Use Drive API to convert
      const convertedFile = Drive.Files.copy(resource, fileId, {convert: true});
      const tempSS = SpreadsheetApp.openById(convertedFile.id);
      const sheet = tempSS.getSheets()[0];

      // Read data
      const data = sheet.getDataRange().getValues();

      // Clean up temp files
      DriveApp.getFileById(convertedFile.id).setTrashed(true);
      file.setTrashed(true);

      if (data.length === 0) return [];

      // Convert to objects
      const headers = data[0].map(h => String(h).toLowerCase().trim());
      const results = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row.every(cell => cell === '' || cell === null)) continue;

        const obj = { _rowIndex: i };
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = row[j] !== null && row[j] !== undefined ? String(row[j]) : '';
        }
        results.push(obj);
      }

      return results;

    } catch (conversionError) {
      // Clean up original file on error
      file.setTrashed(true);
      throw conversionError;
    }

  } catch (error) {
    Logger.log('[UniversalParser] Excel parse error: ' + error.toString());
    throw new Error('Excel parse error: ' + error.message + '. Note: Excel support requires Drive API.');
  }
}

// ===============================================================================
// PDF PARSING
// ===============================================================================

/**
 * Parse PDF content
 * Note: Limited support - extracts text using Drive OCR
 * @param {string} base64Content - Base64 encoded PDF content
 * @returns {Array} Array of extracted text lines
 */
function parsePDFContent(base64Content) {
  try {
    // Create a blob from the base64 content
    const decoded = Utilities.base64Decode(base64Content);
    const blob = Utilities.newBlob(decoded, 'application/pdf', 'upload.pdf');

    // Upload to Drive with OCR enabled
    const file = DriveApp.createFile(blob);
    const fileId = file.getId();

    try {
      // Convert to Google Doc (OCR)
      const resource = {
        title: 'temp_pdf_import_' + Date.now(),
        mimeType: MimeType.GOOGLE_DOCS,
        parents: [{id: 'root'}]
      };

      const convertedFile = Drive.Files.copy(resource, fileId, {
        convert: true,
        ocr: true
      });

      const doc = DocumentApp.openById(convertedFile.id);
      const text = doc.getBody().getText();

      // Clean up temp files
      DriveApp.getFileById(convertedFile.id).setTrashed(true);
      file.setTrashed(true);

      // Try to parse as table-like structure
      const lines = text.split('\n').filter(line => line.trim() !== '');

      // If it looks like tabular data, try to parse it
      if (lines.length > 1) {
        // Attempt to detect columns from the first line
        const possibleDelimiters = ['\t', '  ', '|'];
        let delimiter = null;

        for (const d of possibleDelimiters) {
          if (lines[0].includes(d)) {
            delimiter = d;
            break;
          }
        }

        if (delimiter) {
          const headers = lines[0].split(delimiter).map(h => h.toLowerCase().trim());
          const results = [];

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(delimiter);
            if (values.every(v => v.trim() === '')) continue;

            const obj = { _rowIndex: i };
            for (let j = 0; j < headers.length && j < values.length; j++) {
              obj[headers[j]] = values[j].trim();
            }
            results.push(obj);
          }

          return results;
        }
      }

      // Return as simple text records if not tabular
      return lines.map((line, i) => ({
        _rowIndex: i,
        text: line,
        productName: line
      }));

    } catch (conversionError) {
      file.setTrashed(true);
      throw conversionError;
    }

  } catch (error) {
    Logger.log('[UniversalParser] PDF parse error: ' + error.toString());
    throw new Error('PDF parse error: ' + error.message + '. Note: PDF support requires Drive API and OCR.');
  }
}

// ===============================================================================
// DATA NORMALIZATION
// ===============================================================================

/**
 * Normalize data from different sources into standard format
 * @param {Array} rawData - Array of row objects with original column names
 * @returns {Object} { records, sourceFormat, columnMapping }
 */
function normalizeData(rawData) {
  if (!rawData || rawData.length === 0) {
    return { records: [], sourceFormat: 'unknown', columnMapping: {} };
  }

  // Get column names from first record
  const firstRecord = rawData[0];
  const columns = Object.keys(firstRecord).filter(k => k !== '_rowIndex');

  // Detect source format
  let sourceFormat = 'generic';
  let mappings = COLUMN_MAPPINGS.generic.mappings;

  for (const [format, config] of Object.entries(COLUMN_MAPPINGS)) {
    if (format === 'generic') continue;

    const detectionColumns = config.detect.map(c => c.toLowerCase());
    const matchCount = detectionColumns.filter(dc =>
      columns.some(c => c.includes(dc))
    ).length;

    if (matchCount >= Math.ceil(detectionColumns.length * 0.5)) {
      sourceFormat = format;
      mappings = { ...COLUMN_MAPPINGS.generic.mappings, ...config.mappings };
      break;
    }
  }

  Logger.log('[UniversalParser] Detected source format: ' + sourceFormat);

  // Build column mapping
  const columnMapping = {};
  for (const col of columns) {
    const normalizedCol = col.toLowerCase().trim();
    for (const [pattern, target] of Object.entries(mappings)) {
      if (normalizedCol.includes(pattern) || normalizedCol === pattern) {
        columnMapping[col] = target;
        break;
      }
    }
  }

  // Normalize each record
  const records = rawData.map(row => {
    const normalized = {
      _originalRow: row._rowIndex,
      productName: '',
      revenue: 0,
      quantity: 0,
      date: '',
      year: '',
      category: '',
      subcategory: '',
      source: COLUMN_MAPPINGS[sourceFormat]?.source || 'Unknown'
    };

    for (const [originalCol, targetField] of Object.entries(columnMapping)) {
      const value = row[originalCol];
      if (value !== undefined && value !== null && value !== '') {
        switch (targetField) {
          case 'productName':
            normalized.productName = String(value).trim();
            break;
          case 'revenue':
            normalized.revenue = parseNumeric(value);
            break;
          case 'quantity':
            normalized.quantity = parseNumeric(value);
            break;
          case 'date':
            normalized.date = parseDateValue(value);
            break;
          case 'year':
            normalized.year = extractYear(value);
            break;
        }
      }
    }

    // Extract year from date if not set
    if (!normalized.year && normalized.date) {
      normalized.year = extractYear(normalized.date);
    }

    // Extract year from product name if still not set
    if (!normalized.year && normalized.productName) {
      const yearMatch = normalized.productName.match(/20\d{2}/);
      if (yearMatch) {
        normalized.year = yearMatch[0];
      }
    }

    return normalized;
  });

  return {
    records: records,
    sourceFormat: sourceFormat,
    columnMapping: columnMapping
  };
}

/**
 * Parse numeric value from various formats
 * @param {any} value - Value to parse
 * @returns {number} Parsed number
 */
function parseNumeric(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  const str = String(value)
    .replace(/[$,]/g, '')  // Remove currency symbols and commas
    .replace(/[()]/g, '')  // Remove parentheses
    .trim();

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse date value from various formats
 * @param {any} value - Value to parse
 * @returns {string} ISO date string or empty
 */
function parseDateValue(value) {
  if (!value) return '';

  try {
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }

    const str = String(value).trim();

    // Try various date formats
    // ISO format: 2024-01-15
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.substring(0, 10);
    }

    // US format: 01/15/2024 or 1/15/24
    const usMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (usMatch) {
      const month = usMatch[1].padStart(2, '0');
      const day = usMatch[2].padStart(2, '0');
      let year = usMatch[3];
      if (year.length === 2) {
        year = (parseInt(year) > 50 ? '19' : '20') + year;
      }
      return `${year}-${month}-${day}`;
    }

    // Try native parsing
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

  } catch (e) {
    // Return empty on parse failure
  }

  return '';
}

/**
 * Extract year from a value
 * @param {any} value - Value containing year
 * @returns {string} Year string
 */
function extractYear(value) {
  if (!value) return '';

  const str = String(value);

  // Look for 4-digit year
  const match = str.match(/20\d{2}/);
  if (match) {
    return match[0];
  }

  // Try as date
  const date = parseDateValue(value);
  if (date) {
    return date.substring(0, 4);
  }

  return '';
}

/**
 * Get date range from records
 * @param {Array} records - Normalized records
 * @returns {Object} { earliest, latest }
 */
function getDateRange(records) {
  const dates = records
    .map(r => r.date)
    .filter(d => d)
    .sort();

  return {
    earliest: dates[0] || null,
    latest: dates[dates.length - 1] || null
  };
}

// ===============================================================================
// AI-POWERED CATEGORIZATION
// ===============================================================================

/**
 * Categorize sales data using AI
 * @param {Object} params - { rawData: [], year: string }
 * @returns {Object} { success: boolean, categorizedData: [], stats: {} }
 */
function categorizeSalesData(params) {
  const startTime = Date.now();

  const result = {
    success: true,
    categorizedData: [],
    stats: {
      total: 0,
      categorized: 0,
      uncategorized: 0,
      byCategory: {}
    },
    errors: []
  };

  try {
    const rawData = params.rawData || [];
    const year = params.year || new Date().getFullYear().toString();

    if (rawData.length === 0) {
      throw new Error('No data provided for categorization');
    }

    // Load category cache
    const cache = loadCategoryCache();

    // Prepare products for batch categorization
    const uncachedProducts = [];
    const productIndexMap = {};

    for (let i = 0; i < rawData.length; i++) {
      const record = rawData[i];
      const productName = record.productName || '';

      // Check cache first
      const cached = cache[productName.toLowerCase()];
      if (cached) {
        result.categorizedData.push({
          ...record,
          category: cached.category,
          subcategory: cached.subcategory,
          categorySource: 'cache'
        });
      } else if (productName) {
        // Try rule-based categorization first
        const ruleResult = categorizeByRules(productName);
        if (ruleResult.category !== 'UNCATEGORIZED') {
          result.categorizedData.push({
            ...record,
            category: ruleResult.category,
            subcategory: ruleResult.subcategory,
            categorySource: 'rules'
          });
          // Cache the result
          cacheCategory(productName, ruleResult.category, ruleResult.subcategory, 0.9, 'rules');
        } else {
          // Need AI categorization
          uncachedProducts.push(productName);
          productIndexMap[productName] = i;
          result.categorizedData.push({
            ...record,
            category: 'PENDING',
            subcategory: '',
            categorySource: 'pending'
          });
        }
      } else {
        result.categorizedData.push({
          ...record,
          category: 'UNCATEGORIZED',
          subcategory: 'No Product Name',
          categorySource: 'empty'
        });
      }
    }

    // Batch categorize with AI
    if (uncachedProducts.length > 0) {
      Logger.log('[UniversalParser] Categorizing ' + uncachedProducts.length + ' products with AI');

      // Batch into groups of 20 for API efficiency
      const batchSize = 20;
      for (let i = 0; i < uncachedProducts.length; i += batchSize) {
        const batch = uncachedProducts.slice(i, i + batchSize);

        try {
          const aiResults = categorizeWithAI(batch, year);

          // Update results with AI categorization
          for (const [product, categorization] of Object.entries(aiResults)) {
            const originalIndex = productIndexMap[product];
            if (originalIndex !== undefined) {
              const idx = result.categorizedData.findIndex(r =>
                r.productName === product && r.category === 'PENDING'
              );
              if (idx >= 0) {
                result.categorizedData[idx].category = categorization.category;
                result.categorizedData[idx].subcategory = categorization.subcategory;
                result.categorizedData[idx].categorySource = 'ai';
              }
            }

            // Cache the AI result
            cacheCategory(product, categorization.category, categorization.subcategory,
                         categorization.confidence || 0.8, 'ai');
          }
        } catch (batchError) {
          Logger.log('[UniversalParser] AI batch error: ' + batchError.toString());
          // Mark batch as uncategorized
          for (const product of batch) {
            const idx = result.categorizedData.findIndex(r =>
              r.productName === product && r.category === 'PENDING'
            );
            if (idx >= 0) {
              result.categorizedData[idx].category = 'UNCATEGORIZED';
              result.categorizedData[idx].subcategory = 'AI Error';
              result.categorizedData[idx].categorySource = 'error';
            }
          }
          result.errors.push({ batch: i, error: batchError.toString() });
        }
      }
    }

    // Calculate stats
    result.stats.total = result.categorizedData.length;
    for (const record of result.categorizedData) {
      const cat = record.category || 'UNCATEGORIZED';
      if (cat === 'UNCATEGORIZED' || cat === 'PENDING') {
        result.stats.uncategorized++;
      } else {
        result.stats.categorized++;
      }
      result.stats.byCategory[cat] = (result.stats.byCategory[cat] || 0) + 1;
    }

    Logger.log('[UniversalParser] Categorization complete in ' + (Date.now() - startTime) + 'ms');

  } catch (error) {
    result.success = false;
    result.errors.push({ type: 'FATAL', message: error.toString() });
    Logger.log('[UniversalParser] Categorization error: ' + error.toString());
  }

  return result;
}

/**
 * Categorize product by keyword rules
 * @param {string} productName - Product name to categorize
 * @returns {Object} { category, subcategory }
 */
function categorizeByRules(productName) {
  const lowerName = productName.toLowerCase();

  for (const [categoryKey, categoryConfig] of Object.entries(TINY_SEED_CATEGORIES)) {
    for (const keyword of categoryConfig.keywords) {
      if (lowerName.includes(keyword)) {
        // Try to determine subcategory
        let subcategory = categoryConfig.subcategories[0] || '';
        for (const sub of categoryConfig.subcategories) {
          if (lowerName.includes(sub.toLowerCase())) {
            subcategory = sub;
            break;
          }
        }
        return { category: categoryKey, subcategory: subcategory };
      }
    }
  }

  return { category: 'UNCATEGORIZED', subcategory: 'Needs Review' };
}

/**
 * Categorize products using Claude AI
 * @param {Array} products - Array of product names
 * @param {string} year - Year for context
 * @returns {Object} Map of product name to categorization
 */
function categorizeWithAI(products, year) {
  const categoryList = Object.entries(TINY_SEED_CATEGORIES)
    .filter(([key]) => key !== 'UNCATEGORIZED')
    .map(([key, config]) => `${key}: ${config.displayName} (${config.subcategories.join(', ')})`)
    .join('\n');

  const prompt = `You are categorizing sales products for Tiny Seed Farm, a small organic farm in Pennsylvania.

CATEGORIES:
${categoryList}

IMPORTANT CONTEXT:
- CSA shares can have various names like "2024 Tiny Seed Farm Summer CSA", "2026 Summer CSA Share - Flex Weekly", "Spring Veggie Share", etc. These are ALL CSA_VEGETABLE.
- Flower subscriptions include "Tiny Seed Fleurs Full Bloom Weekly", "Petite Bloom Subscription", "Dahlia Season Share", etc. These are ALL FLOWER_SUBSCRIPTION.
- Partner add-ons are local products bundled with CSA: mushrooms, bread, cheese (Goat Rodeo), coffee (Redhawk), etc.
- Farmers' Market sales come from POS or have location names like "Lawrenceville Market Sale"
- Wholesale sales are to restaurants or in bulk quantities

For each product below, respond with ONLY a JSON object. No explanation or other text.
Format: { "productName": { "category": "CATEGORY_KEY", "subcategory": "Subcategory Name", "confidence": 0.0-1.0 } }

PRODUCTS TO CATEGORIZE:
${products.map((p, i) => `${i + 1}. ${p}`).join('\n')}

RESPOND WITH VALID JSON ONLY:`;

  try {
    const response = callClaudeForParser(prompt);

    // Parse the JSON response
    let cleanResponse = response.trim();

    // Remove markdown code blocks if present
    if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    const parsed = JSON.parse(cleanResponse);

    // Validate and normalize the response
    const result = {};
    for (const product of products) {
      const productResult = parsed[product];
      if (productResult && productResult.category) {
        result[product] = {
          category: productResult.category,
          subcategory: productResult.subcategory || '',
          confidence: productResult.confidence || 0.8
        };
      } else {
        // Try to find by partial match
        let found = false;
        for (const [key, value] of Object.entries(parsed)) {
          if (key.toLowerCase().includes(product.toLowerCase().substring(0, 20)) ||
              product.toLowerCase().includes(key.toLowerCase().substring(0, 20))) {
            result[product] = {
              category: value.category,
              subcategory: value.subcategory || '',
              confidence: value.confidence || 0.7
            };
            found = true;
            break;
          }
        }
        if (!found) {
          result[product] = { category: 'UNCATEGORIZED', subcategory: 'AI Parse Error', confidence: 0 };
        }
      }
    }

    return result;

  } catch (error) {
    Logger.log('[UniversalParser] AI categorization error: ' + error.toString());
    // Return uncategorized for all
    const result = {};
    for (const product of products) {
      result[product] = { category: 'UNCATEGORIZED', subcategory: 'AI Error', confidence: 0 };
    }
    return result;
  }
}

/**
 * Call Claude API for parser operations
 * @param {string} prompt - Prompt to send
 * @returns {string} Claude's response text
 */
function callClaudeForParser(prompt) {
  // Check for existing Claude API function
  if (typeof callClaudeAPI === 'function') {
    try {
      return callClaudeAPI(prompt, 'haiku');
    } catch (e) {
      // Fall through to direct call
    }
  }

  // Direct API call
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY') ||
                 PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');

  if (!apiKey) {
    throw new Error('Claude API key not configured');
  }

  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    }),
    muteHttpExceptions: true
  });

  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();

  if (responseCode !== 200) {
    throw new Error('Claude API error: ' + responseCode + ' - ' + responseText);
  }

  const result = JSON.parse(responseText);
  return result.content[0].text;
}

// ===============================================================================
// CATEGORY CACHE MANAGEMENT
// ===============================================================================

/**
 * Load category cache from sheet
 * @returns {Object} Cache map of product name to categorization
 */
function loadCategoryCache() {
  try {
    const ss = SpreadsheetApp.openById(PARSER_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PARSER_SHEETS.CATEGORY_CACHE);

    if (!sheet) return {};

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return {};

    const cache = {};
    for (let i = 1; i < data.length; i++) {
      const [productName, category, subcategory, confidence, cachedAt, source] = data[i];
      if (productName) {
        cache[productName.toLowerCase()] = {
          category: category,
          subcategory: subcategory,
          confidence: confidence,
          cachedAt: cachedAt,
          source: source
        };
      }
    }

    return cache;

  } catch (error) {
    Logger.log('[UniversalParser] Cache load error: ' + error.toString());
    return {};
  }
}

/**
 * Cache a categorization result
 * @param {string} productName - Product name
 * @param {string} category - Category key
 * @param {string} subcategory - Subcategory name
 * @param {number} confidence - Confidence score
 * @param {string} source - Categorization source (rules, ai, manual)
 */
function cacheCategory(productName, category, subcategory, confidence, source) {
  try {
    const ss = SpreadsheetApp.openById(PARSER_SPREADSHEET_ID);
    let sheet = ss.getSheetByName(PARSER_SHEETS.CATEGORY_CACHE);

    if (!sheet) {
      // Create sheet if it doesn't exist
      sheet = ss.insertSheet(PARSER_SHEETS.CATEGORY_CACHE);
      sheet.getRange(1, 1, 1, PARSER_SHEET_HEADERS.CATEGORY_CACHE.length)
        .setValues([PARSER_SHEET_HEADERS.CATEGORY_CACHE]);
      sheet.getRange(1, 1, 1, PARSER_SHEET_HEADERS.CATEGORY_CACHE.length)
        .setBackground('#1e40af')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    // Check if product already exists in cache
    const data = sheet.getDataRange().getValues();
    let foundRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toLowerCase() === productName.toLowerCase()) {
        foundRow = i + 1;
        break;
      }
    }

    const rowData = [
      productName,
      category,
      subcategory,
      confidence,
      new Date().toISOString(),
      source
    ];

    if (foundRow > 0) {
      // Update existing row
      sheet.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      // Append new row
      sheet.appendRow(rowData);
    }

  } catch (error) {
    Logger.log('[UniversalParser] Cache write error: ' + error.toString());
  }
}

// ===============================================================================
// SALES DATA SUMMARY
// ===============================================================================

/**
 * Get aggregated sales summary by category
 * @param {Object} params - { year: string, startDate: string, endDate: string }
 * @returns {Object} { success, summary, details }
 */
function getSalesDataSummary(params) {
  const result = {
    success: true,
    summary: {
      totalRevenue: 0,
      totalRecords: 0,
      byCategory: {},
      byYear: {},
      byMonth: {}
    },
    details: []
  };

  try {
    const year = params?.year || '';
    const startDate = params?.startDate || '';
    const endDate = params?.endDate || '';

    const ss = SpreadsheetApp.openById(PARSER_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PARSER_SHEETS.PARSED_SALES_DATA);

    if (!sheet) {
      return { success: true, summary: result.summary, details: [], message: 'No parsed data yet' };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, summary: result.summary, details: [], message: 'No records found' };
    }

    const headers = data[0];
    const dateCol = headers.indexOf('Date');
    const yearCol = headers.indexOf('Year');
    const categoryCol = headers.indexOf('Category');
    const subcategoryCol = headers.indexOf('Subcategory');
    const productCol = headers.indexOf('ProductName');
    const revenueCol = headers.indexOf('Revenue');
    const quantityCol = headers.indexOf('Quantity');
    const sourceCol = headers.indexOf('Source');

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowYear = String(row[yearCol] || '');
      const rowDate = row[dateCol] || '';

      // Apply filters
      if (year && rowYear !== year) continue;
      if (startDate && rowDate < startDate) continue;
      if (endDate && rowDate > endDate) continue;

      const category = row[categoryCol] || 'UNCATEGORIZED';
      const revenue = parseFloat(row[revenueCol]) || 0;
      const quantity = parseFloat(row[quantityCol]) || 0;

      // Update totals
      result.summary.totalRevenue += revenue;
      result.summary.totalRecords++;

      // By category
      if (!result.summary.byCategory[category]) {
        result.summary.byCategory[category] = {
          revenue: 0,
          count: 0,
          quantity: 0,
          subcategories: {}
        };
      }
      result.summary.byCategory[category].revenue += revenue;
      result.summary.byCategory[category].count++;
      result.summary.byCategory[category].quantity += quantity;

      // By subcategory
      const subcategory = row[subcategoryCol] || 'Other';
      if (!result.summary.byCategory[category].subcategories[subcategory]) {
        result.summary.byCategory[category].subcategories[subcategory] = {
          revenue: 0,
          count: 0
        };
      }
      result.summary.byCategory[category].subcategories[subcategory].revenue += revenue;
      result.summary.byCategory[category].subcategories[subcategory].count++;

      // By year
      if (rowYear) {
        if (!result.summary.byYear[rowYear]) {
          result.summary.byYear[rowYear] = { revenue: 0, count: 0 };
        }
        result.summary.byYear[rowYear].revenue += revenue;
        result.summary.byYear[rowYear].count++;
      }

      // By month
      if (rowDate) {
        const monthKey = String(rowDate).substring(0, 7); // YYYY-MM
        if (monthKey && monthKey.length === 7) {
          if (!result.summary.byMonth[monthKey]) {
            result.summary.byMonth[monthKey] = { revenue: 0, count: 0 };
          }
          result.summary.byMonth[monthKey].revenue += revenue;
          result.summary.byMonth[monthKey].count++;
        }
      }
    }

    // Add category display names
    for (const [catKey, catData] of Object.entries(result.summary.byCategory)) {
      catData.displayName = TINY_SEED_CATEGORIES[catKey]?.displayName || catKey;
    }

  } catch (error) {
    result.success = false;
    result.error = error.toString();
    Logger.log('[UniversalParser] Summary error: ' + error.toString());
  }

  return result;
}

/**
 * Get parsed sales data with pagination
 * @param {Object} params - { year, category, page, pageSize, sortBy, sortDir }
 * @returns {Object} { success, data, pagination }
 */
function getParsedSalesData(params) {
  const result = {
    success: true,
    data: [],
    pagination: {
      page: 1,
      pageSize: 100,
      totalRecords: 0,
      totalPages: 0
    }
  };

  try {
    const year = params?.year || '';
    const category = params?.category || '';
    const page = parseInt(params?.page) || 1;
    const pageSize = Math.min(parseInt(params?.pageSize) || 100, 500);
    const sortBy = params?.sortBy || 'Date';
    const sortDir = (params?.sortDir || 'desc').toLowerCase();

    const ss = SpreadsheetApp.openById(PARSER_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PARSER_SHEETS.PARSED_SALES_DATA);

    if (!sheet) {
      return result;
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return result;
    }

    const headers = data[0];
    const yearCol = headers.indexOf('Year');
    const categoryCol = headers.indexOf('Category');

    // Filter data
    let filtered = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      if (year && String(row[yearCol]) !== year) continue;
      if (category && row[categoryCol] !== category) continue;

      const record = {};
      for (let j = 0; j < headers.length; j++) {
        record[headers[j]] = row[j];
      }
      filtered.push(record);
    }

    // Sort
    const sortColIdx = headers.indexOf(sortBy);
    if (sortColIdx >= 0) {
      filtered.sort((a, b) => {
        const aVal = a[sortBy] || '';
        const bVal = b[sortBy] || '';
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortDir === 'asc' ? comparison : -comparison;
      });
    }

    // Paginate
    result.pagination.totalRecords = filtered.length;
    result.pagination.totalPages = Math.ceil(filtered.length / pageSize);
    result.pagination.page = Math.min(page, result.pagination.totalPages || 1);
    result.pagination.pageSize = pageSize;

    const startIdx = (result.pagination.page - 1) * pageSize;
    result.data = filtered.slice(startIdx, startIdx + pageSize);

  } catch (error) {
    result.success = false;
    result.error = error.toString();
    Logger.log('[UniversalParser] Get data error: ' + error.toString());
  }

  return result;
}

// ===============================================================================
// DATA STORAGE
// ===============================================================================

/**
 * Store parsed and categorized data to sheet
 * @param {Object} params - { data: [], sourceFile: string, overwrite: boolean }
 * @returns {Object} { success, recordsStored, errors }
 */
function storeParsedSalesData(params) {
  const result = {
    success: true,
    recordsStored: 0,
    recordsSkipped: 0,
    errors: []
  };

  try {
    const data = params.data || [];
    const sourceFile = params.sourceFile || 'Unknown';
    const overwrite = params.overwrite === true;

    if (data.length === 0) {
      return { success: true, recordsStored: 0, message: 'No data to store' };
    }

    const ss = SpreadsheetApp.openById(PARSER_SPREADSHEET_ID);
    let sheet = ss.getSheetByName(PARSER_SHEETS.PARSED_SALES_DATA);

    // Create sheet if needed
    if (!sheet) {
      sheet = ss.insertSheet(PARSER_SHEETS.PARSED_SALES_DATA);
      sheet.getRange(1, 1, 1, PARSER_SHEET_HEADERS.PARSED_SALES_DATA.length)
        .setValues([PARSER_SHEET_HEADERS.PARSED_SALES_DATA]);
      sheet.getRange(1, 1, 1, PARSER_SHEET_HEADERS.PARSED_SALES_DATA.length)
        .setBackground('#1e40af')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
      sheet.setTabColor('#1e40af');
    }

    // Clear existing data if overwrite
    if (overwrite && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }

    // Prepare rows
    const now = new Date().toISOString();
    const rows = [];

    for (let i = 0; i < data.length; i++) {
      const record = data[i];

      // Skip records with no product name or revenue
      if (!record.productName && !record.revenue) {
        result.recordsSkipped++;
        continue;
      }

      const recordId = 'REC-' + Date.now() + '-' + i;

      rows.push([
        recordId,                               // Record_ID
        record.date || '',                      // Date
        record.year || '',                      // Year
        record.category || 'UNCATEGORIZED',     // Category
        record.subcategory || '',               // Subcategory
        record.productName || '',               // ProductName
        parseFloat(record.revenue) || 0,        // Revenue
        parseFloat(record.quantity) || 0,       // Quantity
        record.source || '',                    // Source
        record._originalRow || '',              // OriginalRow
        now,                                    // ParsedAt
        sourceFile                              // SourceFile
      ]);
    }

    // Batch append
    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
      result.recordsStored = rows.length;
    }

    Logger.log('[UniversalParser] Stored ' + result.recordsStored + ' records');

  } catch (error) {
    result.success = false;
    result.errors.push(error.toString());
    Logger.log('[UniversalParser] Store error: ' + error.toString());
  }

  return result;
}

// ===============================================================================
// LOGGING
// ===============================================================================

/**
 * Log a parse attempt
 * @param {Object} logData - Log data object
 */
function logParseAttempt(logData) {
  try {
    const ss = SpreadsheetApp.openById(PARSER_SPREADSHEET_ID);
    let sheet = ss.getSheetByName(PARSER_SHEETS.PARSE_LOGS);

    if (!sheet) {
      sheet = ss.insertSheet(PARSER_SHEETS.PARSE_LOGS);
      sheet.getRange(1, 1, 1, PARSER_SHEET_HEADERS.PARSE_LOGS.length)
        .setValues([PARSER_SHEET_HEADERS.PARSE_LOGS]);
      sheet.getRange(1, 1, 1, PARSER_SHEET_HEADERS.PARSE_LOGS.length)
        .setBackground('#059669')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      logData.logId,
      new Date().toISOString(),
      logData.fileName,
      logData.fileType,
      logData.fileSize,
      logData.status,
      logData.recordsProcessed,
      logData.recordsSuccess,
      logData.recordsError,
      logData.duration,
      logData.notes
    ]);

  } catch (error) {
    Logger.log('[UniversalParser] Log write error: ' + error.toString());
  }
}

/**
 * Log a parse error for review
 * @param {Object} errorData - Error data object
 */
function logParseError(errorData) {
  try {
    const ss = SpreadsheetApp.openById(PARSER_SPREADSHEET_ID);
    let sheet = ss.getSheetByName(PARSER_SHEETS.PARSE_ERRORS);

    if (!sheet) {
      sheet = ss.insertSheet(PARSER_SHEETS.PARSE_ERRORS);
      sheet.getRange(1, 1, 1, PARSER_SHEET_HEADERS.PARSE_ERRORS.length)
        .setValues([PARSER_SHEET_HEADERS.PARSE_ERRORS]);
      sheet.getRange(1, 1, 1, PARSER_SHEET_HEADERS.PARSE_ERRORS.length)
        .setBackground('#dc2626')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    const errorId = 'ERR-' + Date.now();

    sheet.appendRow([
      errorId,
      new Date().toISOString(),
      errorData.fileName,
      errorData.rowNumber,
      errorData.errorType,
      errorData.errorMessage,
      String(errorData.rawData).substring(0, 1000), // Limit raw data size
      false,  // Resolved
      '',     // ResolvedAt
      '',     // ResolvedBy
      ''      // Resolution
    ]);

  } catch (error) {
    Logger.log('[UniversalParser] Error log write failed: ' + error.toString());
  }
}

/**
 * Get parse errors for review
 * @param {Object} params - { resolved: boolean, limit: number }
 * @returns {Object} { success, errors }
 */
function getParseErrors(params) {
  try {
    const showResolved = params?.resolved === true;
    const limit = parseInt(params?.limit) || 100;

    const ss = SpreadsheetApp.openById(PARSER_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PARSER_SHEETS.PARSE_ERRORS);

    if (!sheet) {
      return { success: true, errors: [], message: 'No errors logged yet' };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, errors: [] };
    }

    const headers = data[0];
    const resolvedCol = headers.indexOf('Resolved');

    const errors = [];
    for (let i = data.length - 1; i > 0 && errors.length < limit; i--) {
      const row = data[i];
      const isResolved = row[resolvedCol] === true || row[resolvedCol] === 'TRUE';

      if (!showResolved && isResolved) continue;

      const error = {};
      for (let j = 0; j < headers.length; j++) {
        error[headers[j]] = row[j];
      }
      errors.push(error);
    }

    return { success: true, errors: errors };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Mark an error as resolved
 * @param {Object} params - { errorId: string, resolvedBy: string, resolution: string }
 * @returns {Object} { success }
 */
function resolveParseError(params) {
  try {
    const errorId = params.errorId;
    const resolvedBy = params.resolvedBy || 'System';
    const resolution = params.resolution || 'Resolved';

    if (!errorId) {
      throw new Error('Error ID required');
    }

    const ss = SpreadsheetApp.openById(PARSER_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PARSER_SHEETS.PARSE_ERRORS);

    if (!sheet) {
      throw new Error('Error log sheet not found');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const errorIdCol = headers.indexOf('Error_ID');
    const resolvedCol = headers.indexOf('Resolved');
    const resolvedAtCol = headers.indexOf('ResolvedAt');
    const resolvedByCol = headers.indexOf('ResolvedBy');
    const resolutionCol = headers.indexOf('Resolution');

    for (let i = 1; i < data.length; i++) {
      if (data[i][errorIdCol] === errorId) {
        const rowNum = i + 1;
        sheet.getRange(rowNum, resolvedCol + 1).setValue(true);
        sheet.getRange(rowNum, resolvedAtCol + 1).setValue(new Date().toISOString());
        sheet.getRange(rowNum, resolvedByCol + 1).setValue(resolvedBy);
        sheet.getRange(rowNum, resolutionCol + 1).setValue(resolution);
        return { success: true, message: 'Error resolved' };
      }
    }

    throw new Error('Error ID not found: ' + errorId);

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ===============================================================================
// UTILITY FUNCTIONS
// ===============================================================================

/**
 * Get parser status and statistics
 * @returns {Object} Status information
 */
function getParserStatus() {
  try {
    const ss = SpreadsheetApp.openById(PARSER_SPREADSHEET_ID);
    const status = {
      success: true,
      sheets: {},
      categories: Object.keys(TINY_SEED_CATEGORIES).length,
      columnMappings: Object.keys(COLUMN_MAPPINGS).length
    };

    for (const [key, sheetName] of Object.entries(PARSER_SHEETS)) {
      const sheet = ss.getSheetByName(sheetName);
      status.sheets[sheetName] = {
        exists: !!sheet,
        rowCount: sheet ? Math.max(0, sheet.getLastRow() - 1) : 0
      };
    }

    return status;

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Clear all parsed data (use with caution)
 * @param {Object} params - { confirm: boolean }
 * @returns {Object} Result
 */
function clearParsedData(params) {
  if (params?.confirm !== true) {
    return {
      success: false,
      error: 'Must pass confirm=true to clear data. This will DELETE ALL PARSED DATA!'
    };
  }

  try {
    const ss = SpreadsheetApp.openById(PARSER_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PARSER_SHEETS.PARSED_SALES_DATA);

    if (sheet && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }

    return { success: true, message: 'Parsed data cleared' };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ===============================================================================
// TESTING FUNCTIONS
// ===============================================================================

/**
 * Test the parser with sample data
 */
function testUniversalParser() {
  // Initialize sheets first
  initializeParserSheets();

  // Create sample CSV data
  const sampleCSV = `Product title,Total sales,Quantity ordered,Year
2024 Tiny Seed Farm Summer CSA,15000,50,2024
2025 Tiny Seed Fleurs Full Bloom Weekly,4500,30,2025
Mushroom Add-on,1200,40,2024
POS Market Sale - Lawrenceville,250,0,2024
Wholesale - Restaurant Order,1500,1,2024`;

  const base64Content = Utilities.base64Encode(sampleCSV);

  // Test parsing
  const parseResult = parseUniversalDocument({
    fileContent: base64Content,
    fileName: 'test_sales.csv',
    mimeType: 'text/csv'
  });

  Logger.log('Parse result: ' + JSON.stringify(parseResult));

  // Test categorization
  if (parseResult.success && parseResult.data.records.length > 0) {
    const catResult = categorizeSalesData({
      rawData: parseResult.data.records,
      year: '2024'
    });
    Logger.log('Categorization result: ' + JSON.stringify(catResult));

    // Test storage
    if (catResult.success) {
      const storeResult = storeParsedSalesData({
        data: catResult.categorizedData,
        sourceFile: 'test_sales.csv',
        overwrite: true
      });
      Logger.log('Store result: ' + JSON.stringify(storeResult));
    }

    // Test summary
    const summaryResult = getSalesDataSummary({ year: '2024' });
    Logger.log('Summary result: ' + JSON.stringify(summaryResult));
  }

  return {
    parseResult: parseResult,
    status: getParserStatus()
  };
}
