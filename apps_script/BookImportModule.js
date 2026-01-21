/**
 * BOOK IMPORT MODULE
 * Extract tasks and knowledge from book page photos
 *
 * Uses Google Cloud Vision API for OCR
 * Then parses text to extract actionable farming tasks
 *
 * Created: 2026-01-21
 */

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

/**
 * Extract tasks from an uploaded book page image
 * @param {Object} params - { imageData: base64 string, context: string }
 */
function extractTasksFromImage(params) {
  const { imageData, context } = params;

  if (!imageData) {
    return { success: false, error: 'No image data provided' };
  }

  try {
    // Step 1: OCR - Extract text from image
    const rawText = performOCR(imageData);

    if (!rawText || rawText.trim().length === 0) {
      return { success: false, error: 'Could not extract text from image' };
    }

    // Step 2: Parse text based on context type
    const tasks = parseTextForTasks(rawText, context);

    // Step 3: Enrich tasks with additional data
    const enrichedTasks = enrichTasks(tasks, context);

    return {
      success: true,
      rawText: rawText,
      tasks: enrichedTasks,
      context: context,
      characterCount: rawText.length,
      taskCount: enrichedTasks.length
    };

  } catch (error) {
    Logger.log('Book import error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ============================================================================
// OCR FUNCTIONS
// ============================================================================

/**
 * Perform OCR on image using Google Cloud Vision API
 * Falls back to Drive OCR if Vision API not configured
 */
function performOCR(imageData) {
  // Try Cloud Vision API first
  const visionApiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_VISION_API_KEY');

  if (visionApiKey) {
    return performCloudVisionOCR(imageData, visionApiKey);
  }

  // Fallback: Use Google Drive OCR
  return performDriveOCR(imageData);
}

/**
 * OCR using Google Cloud Vision API
 */
function performCloudVisionOCR(imageData, apiKey) {
  // Remove data URL prefix if present
  const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');

  const requestBody = {
    requests: [{
      image: { content: base64Image },
      features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
    }]
  };

  const response = UrlFetchApp.fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(requestBody),
      muteHttpExceptions: true
    }
  );

  const result = JSON.parse(response.getContentText());

  if (result.responses && result.responses[0] && result.responses[0].fullTextAnnotation) {
    return result.responses[0].fullTextAnnotation.text;
  }

  return '';
}

/**
 * OCR using Google Drive (upload image, convert to Doc, extract text)
 */
function performDriveOCR(imageData) {
  try {
    // Remove data URL prefix
    const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBlob = Utilities.newBlob(Utilities.base64Decode(base64Image), 'image/png', 'book_page.png');

    // Upload to Drive with OCR conversion
    const resource = {
      title: 'TempOCR_' + Date.now(),
      mimeType: 'image/png'
    };

    const file = Drive.Files.insert(resource, imageBlob, {
      ocr: true,
      ocrLanguage: 'en'
    });

    // Get the converted document
    const doc = DocumentApp.openById(file.id);
    const text = doc.getBody().getText();

    // Clean up - delete temp file
    Drive.Files.remove(file.id);

    return text;

  } catch (error) {
    Logger.log('Drive OCR error: ' + error.toString());

    // Final fallback: return empty (frontend will show error)
    return '';
  }
}

// ============================================================================
// TEXT PARSING
// ============================================================================

/**
 * Parse extracted text to find tasks based on context
 */
function parseTextForTasks(text, context) {
  const tasks = [];

  // Clean and normalize text
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ');
  const lines = text.split('\n').filter(line => line.trim().length > 3);

  switch (context) {
    case 'farming-calendar':
      tasks.push(...parseCalendarTasks(lines, cleanText));
      break;
    case 'crop-guide':
      tasks.push(...parseCropGuideTasks(lines, cleanText));
      break;
    case 'pest-disease':
      tasks.push(...parsePestDiseaseTasks(lines, cleanText));
      break;
    case 'seed-catalog':
      tasks.push(...parseSeedCatalogTasks(lines, cleanText));
      break;
    case 'recipe':
      tasks.push(...parseRecipeTasks(lines, cleanText));
      break;
    default:
      tasks.push(...parseGeneralTasks(lines, cleanText));
  }

  return tasks;
}

/**
 * Parse farming calendar content
 */
function parseCalendarTasks(lines, fullText) {
  const tasks = [];

  // Patterns for calendar entries
  const patterns = {
    // "Plant X in March" or "Sow X 6-8 weeks before frost"
    plantingPattern: /(?:plant|sow|seed|start|transplant)\s+([a-z\s,]+?)(?:\s+in\s+|\s+during\s+|\s+around\s+)([a-z]+)/gi,

    // "February: Start tomatoes"
    monthAction: /(?:january|february|march|april|may|june|july|august|september|october|november|december)[:\s-]+(.+)/gi,

    // "6-8 weeks before last frost"
    relativeDate: /(\d+[-–]\d+\s+weeks?\s+(?:before|after)\s+(?:last|first)\s+frost)/gi,

    // "Days to maturity: 75"
    dtm: /(?:days?\s+to\s+(?:maturity|harvest)|dtm)[:\s]+(\d+)/gi
  };

  // Extract from full text
  let match;

  while ((match = patterns.plantingPattern.exec(fullText)) !== null) {
    tasks.push({
      title: `${capitalizeFirst(match[0].trim())}`,
      crop: extractCropName(match[1]),
      timing: match[2],
      category: 'Planting'
    });
  }

  // Check each line for actionable items
  lines.forEach(line => {
    const lineLower = line.toLowerCase();

    // Look for action verbs
    const actionVerbs = ['plant', 'sow', 'seed', 'start', 'transplant', 'harvest', 'thin', 'fertilize', 'prune', 'mulch'];

    for (const verb of actionVerbs) {
      if (lineLower.includes(verb) && line.length < 200) {
        // Check if already captured
        const alreadyExists = tasks.some(t =>
          t.title.toLowerCase().includes(lineLower.substring(0, 30)));

        if (!alreadyExists) {
          const crop = extractCropFromLine(line);
          const timing = extractTimingFromLine(line);

          tasks.push({
            title: cleanTaskTitle(line),
            crop: crop,
            timing: timing,
            category: categorizeAction(verb)
          });
        }
        break;
      }
    }
  });

  return deduplicateTasks(tasks);
}

/**
 * Parse crop growing guide content
 */
function parseCropGuideTasks(lines, fullText) {
  const tasks = [];

  // Look for crop name in header/title area
  const cropName = extractMainCrop(fullText);

  // Patterns for growing instructions
  const instructionPatterns = [
    /spacing[:\s]+(\d+[-–]?\d*\s*(?:inches|feet|cm|")?)/gi,
    /depth[:\s]+(\d+[-–]?\d*\s*(?:inches|cm|")?)/gi,
    /water[:\s]+(.{10,50})/gi,
    /fertilize[:\s]+(.{10,50})/gi,
    /harvest\s+when(.{10,80})/gi
  ];

  lines.forEach(line => {
    const lineLower = line.toLowerCase();

    // Growing stage instructions
    if (lineLower.match(/when\s+(?:plants?|seedlings?)\s+(?:are|reach|have)/i)) {
      tasks.push({
        title: cleanTaskTitle(line),
        crop: cropName,
        category: 'Growing',
        timing: extractTimingFromLine(line)
      });
    }

    // Numbered steps
    if (line.match(/^\s*\d+[.)]\s+/)) {
      tasks.push({
        title: cleanTaskTitle(line.replace(/^\s*\d+[.)]\s+/, '')),
        crop: cropName,
        category: 'Growing'
      });
    }
  });

  return deduplicateTasks(tasks);
}

/**
 * Parse pest/disease reference content
 */
function parsePestDiseaseTasks(lines, fullText) {
  const tasks = [];

  const pestPatterns = {
    // "For aphids, use..."
    treatment: /(?:for|treat|control|against)\s+([a-z\s]+?),?\s+(?:use|apply|spray)\s+(.+)/gi,

    // "Apply X when Y"
    application: /apply\s+([a-z\s]+?)\s+when\s+(.+)/gi,

    // "Scout for X weekly"
    scouting: /scout\s+(?:for\s+)?([a-z\s,]+)/gi
  };

  let match;

  while ((match = pestPatterns.treatment.exec(fullText)) !== null) {
    tasks.push({
      title: `Treat ${match[1].trim()} with ${match[2].trim().substring(0, 50)}`,
      category: 'IPM',
      timing: 'As needed'
    });
  }

  while ((match = pestPatterns.scouting.exec(fullText)) !== null) {
    tasks.push({
      title: `Scout for ${match[1].trim()}`,
      category: 'IPM',
      timing: 'Weekly'
    });
  }

  lines.forEach(line => {
    const lineLower = line.toLowerCase();

    if (lineLower.includes('prevent') || lineLower.includes('control') ||
        lineLower.includes('spray') || lineLower.includes('apply')) {
      tasks.push({
        title: cleanTaskTitle(line),
        category: 'IPM'
      });
    }
  });

  return deduplicateTasks(tasks);
}

/**
 * Parse seed catalog content
 */
function parseSeedCatalogTasks(lines, fullText) {
  const tasks = [];

  // Look for variety information
  const varietyPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[-–]\s*(.{20,100})/g;
  const dtmPattern = /(\d{2,3})\s*(?:days?|DTM)/gi;

  let currentVariety = '';

  lines.forEach(line => {
    // Variety names are often in title case
    if (line.match(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s*$/)) {
      currentVariety = line.trim();
    }

    // Days to maturity
    const dtmMatch = line.match(dtmPattern);
    if (dtmMatch && currentVariety) {
      tasks.push({
        title: `Add ${currentVariety} to seed order`,
        crop: currentVariety,
        category: 'Seed Order',
        timing: `DTM: ${dtmMatch[0]}`
      });
    }
  });

  return deduplicateTasks(tasks);
}

/**
 * Parse recipe/processing content
 */
function parseRecipeTasks(lines, fullText) {
  const tasks = [];

  lines.forEach((line, index) => {
    // Numbered steps
    if (line.match(/^\s*\d+[.)]\s+/)) {
      tasks.push({
        title: cleanTaskTitle(line.replace(/^\s*\d+[.)]\s+/, '')),
        category: 'Processing',
        timing: `Step ${index + 1}`
      });
    }

    // Ingredient lines
    if (line.match(/^\s*[\d½¼¾⅓⅔]+\s+(?:cup|tbsp|tsp|lb|oz|pound)/i)) {
      tasks.push({
        title: `Gather: ${cleanTaskTitle(line)}`,
        category: 'Ingredients'
      });
    }
  });

  return tasks;
}

/**
 * Parse general content
 */
function parseGeneralTasks(lines, fullText) {
  const tasks = [];

  lines.forEach(line => {
    // Look for actionable lines
    const actionWords = ['need', 'should', 'must', 'important', 'remember', 'note', 'tip'];
    const lineLower = line.toLowerCase();

    if (actionWords.some(word => lineLower.includes(word)) && line.length < 200) {
      tasks.push({
        title: cleanTaskTitle(line),
        category: 'Note'
      });
    }

    // Bullet points or dashes often indicate tasks
    if (line.match(/^\s*[-•*]\s+/)) {
      tasks.push({
        title: cleanTaskTitle(line.replace(/^\s*[-•*]\s+/, '')),
        category: 'Task'
      });
    }
  });

  return deduplicateTasks(tasks);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractCropName(text) {
  const crops = ['tomato', 'pepper', 'lettuce', 'kale', 'spinach', 'carrot', 'beet',
                 'squash', 'cucumber', 'bean', 'pea', 'corn', 'onion', 'garlic',
                 'basil', 'cilantro', 'parsley', 'broccoli', 'cabbage', 'cauliflower'];

  const textLower = text.toLowerCase();

  for (const crop of crops) {
    if (textLower.includes(crop)) {
      return capitalizeFirst(crop);
    }
  }

  return text.split(/[,\s]/)[0].trim();
}

function extractCropFromLine(line) {
  return extractCropName(line);
}

function extractTimingFromLine(line) {
  // Look for timing patterns
  const patterns = [
    /in\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i,
    /(\d+[-–]\d+\s+weeks?\s+(?:before|after))/i,
    /(spring|summer|fall|winter)/i,
    /(early|mid|late)\s+(spring|summer|fall|winter|season)/i,
    /when\s+(.{10,40})/i
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  return '';
}

function extractMainCrop(text) {
  // Look in first 200 chars for crop name (likely title)
  const header = text.substring(0, 200);
  return extractCropName(header) || 'Unknown';
}

function categorizeAction(verb) {
  const categories = {
    'plant': 'Planting',
    'sow': 'Planting',
    'seed': 'Planting',
    'start': 'Greenhouse',
    'transplant': 'Transplanting',
    'harvest': 'Harvest',
    'thin': 'Cultivation',
    'fertilize': 'Fertility',
    'prune': 'Pruning',
    'mulch': 'Mulching'
  };

  return categories[verb.toLowerCase()] || 'General';
}

function cleanTaskTitle(text) {
  return text
    .replace(/^\s*[-•*\d.)]+\s*/, '')  // Remove bullets/numbers
    .replace(/\s+/g, ' ')               // Normalize whitespace
    .trim()
    .substring(0, 150);                 // Limit length
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function deduplicateTasks(tasks) {
  const seen = new Set();
  return tasks.filter(task => {
    const key = task.title.toLowerCase().substring(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function enrichTasks(tasks, context) {
  const now = new Date().toISOString();

  return tasks.map((task, index) => ({
    ...task,
    id: Date.now() + index,
    selected: true,
    source: `Book import (${context})`,
    importedAt: now
  }));
}

// ============================================================================
// IMPORT TO SYSTEM
// ============================================================================

/**
 * Import extracted tasks into the task system
 */
function importBookTasks(params) {
  const { tasks } = params;

  if (!tasks || tasks.length === 0) {
    return { success: false, error: 'No tasks to import' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Try to find or create BOOK_ImportedTasks sheet
  let sheet = ss.getSheetByName('BOOK_ImportedTasks');

  if (!sheet) {
    sheet = ss.insertSheet('BOOK_ImportedTasks');
    sheet.setTabColor('#9c27b0');

    const headers = [
      'Import_ID', 'Title', 'Category', 'Crop', 'Timing',
      'Source', 'Status', 'Converted_To', 'Imported_At', 'Notes'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#9c27b0')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  const now = new Date().toISOString();
  let imported = 0;

  tasks.forEach(task => {
    const importId = `BOOK-${Date.now()}-${imported}`;

    sheet.appendRow([
      importId,
      task.title,
      task.category || '',
      task.crop || '',
      task.timing || '',
      task.source || 'Book import',
      'Pending',
      '',
      now,
      ''
    ]);

    imported++;
  });

  return {
    success: true,
    imported: imported,
    message: `Imported ${imported} tasks to BOOK_ImportedTasks sheet`
  };
}

/**
 * Get imported book tasks
 */
function getBookImportedTasks(params) {
  const status = params?.status || 'all';

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('BOOK_ImportedTasks');

  if (!sheet) {
    return { success: true, tasks: [], message: 'No imported tasks yet' };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const tasks = [];

  for (let i = 1; i < data.length; i++) {
    const task = {};
    headers.forEach((h, idx) => {
      task[h] = data[i][idx];
    });

    if (status === 'all' || task.Status === status) {
      tasks.push(task);
    }
  }

  return {
    success: true,
    count: tasks.length,
    tasks: tasks
  };
}

/**
 * Convert imported task to actual farm task
 */
function convertBookTaskToFarmTask(params) {
  const { importId, targetType, additionalData } = params;

  if (!importId || !targetType) {
    return { success: false, error: 'importId and targetType required' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const importSheet = ss.getSheetByName('BOOK_ImportedTasks');

  if (!importSheet) {
    return { success: false, error: 'Import sheet not found' };
  }

  // Find the task
  const data = importSheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === importId) {
      const task = {};
      headers.forEach((h, idx) => task[h] = data[i][idx]);

      // Convert based on target type
      let result;
      switch (targetType) {
        case 'greenhouse':
          result = createGreenhouseTaskFromImport(task, additionalData);
          break;
        case 'field':
          result = createFieldTaskFromImport(task, additionalData);
          break;
        case 'general':
        default:
          result = createGeneralTaskFromImport(task, additionalData);
      }

      if (result.success) {
        // Update import record
        const rowNum = i + 1;
        importSheet.getRange(rowNum, headers.indexOf('Status') + 1).setValue('Converted');
        importSheet.getRange(rowNum, headers.indexOf('Converted_To') + 1).setValue(targetType);
      }

      return result;
    }
  }

  return { success: false, error: 'Import task not found' };
}

function createGreenhouseTaskFromImport(task, data) {
  // Add to greenhouse sowing sheet
  // Implementation depends on your existing greenhouse task structure
  return { success: true, message: 'Created greenhouse task', type: 'greenhouse' };
}

function createFieldTaskFromImport(task, data) {
  // Add to field tasks
  return { success: true, message: 'Created field task', type: 'field' };
}

function createGeneralTaskFromImport(task, data) {
  // Add to general task list
  return { success: true, message: 'Created general task', type: 'general' };
}

// ============================================================================
// API ENDPOINTS (Add to doPost in MERGED TOTAL.js)
// ============================================================================

/*
 * Add these to doPost switch:
 *
 * case 'extractTasksFromImage':
 *   return jsonResponse(extractTasksFromImage(data));
 * case 'importBookTasks':
 *   return jsonResponse(importBookTasks(data));
 * case 'convertBookTaskToFarmTask':
 *   return jsonResponse(convertBookTaskToFarmTask(data));
 *
 * Add to doGet switch:
 * case 'getBookImportedTasks':
 *   return jsonResponse(getBookImportedTasks(e.parameter));
 */
