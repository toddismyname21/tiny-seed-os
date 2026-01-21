/**
 * ========================================
 * CHIEF OF STAFF - FILE ORGANIZATION AGENT
 * ========================================
 *
 * STATE-OF-THE-ART AI-powered document management
 * Based on: M-Files, Sparkle, Box AI patterns
 *
 * Capabilities:
 * - Auto-organize files by CONTENT, not just folders
 * - Extract text from PDFs, invoices, receipts
 * - Link documents to relevant emails
 * - Natural language document search
 * - Receipt/invoice auto-extraction
 * - Smart categorization and tagging
 *
 * @author Claude PM_Architect
 * @version 1.0.0
 * @date 2026-01-21
 */

// ==========================================
// FILE CATEGORY DEFINITIONS
// ==========================================

const FILE_CATEGORIES = {
  INVOICE: {
    name: 'Invoices',
    folder: 'Invoices',
    patterns: ['invoice', 'inv #', 'bill to', 'amount due', 'payment due'],
    extract: ['invoice_number', 'vendor', 'amount', 'due_date'],
    retention: 7 * 365, // 7 years
    icon: '📄'
  },
  RECEIPT: {
    name: 'Receipts',
    folder: 'Receipts',
    patterns: ['receipt', 'thank you for your purchase', 'order confirmation', 'payment received'],
    extract: ['vendor', 'amount', 'date', 'items'],
    retention: 7 * 365,
    icon: '🧾'
  },
  CONTRACT: {
    name: 'Contracts',
    folder: 'Contracts',
    patterns: ['agreement', 'contract', 'terms and conditions', 'hereby agree', 'party of the first'],
    extract: ['parties', 'effective_date', 'term', 'value'],
    retention: 10 * 365,
    icon: '📝'
  },
  SEED_ORDER: {
    name: 'Seed Orders',
    folder: 'Seed Orders',
    patterns: ['seed', 'variety', 'germination', 'lot number', 'planting', 'johnny'],
    extract: ['vendor', 'varieties', 'quantities', 'order_date'],
    retention: 3 * 365,
    icon: '🌱'
  },
  CERTIFICATION: {
    name: 'Certifications',
    folder: 'Certifications',
    patterns: ['certified', 'organic', 'usda', 'certification', 'license', 'permit'],
    extract: ['type', 'issuer', 'expiry_date', 'id_number'],
    retention: 10 * 365,
    icon: '✅'
  },
  CUSTOMER_DOC: {
    name: 'Customer Documents',
    folder: 'Customer Documents',
    patterns: ['csa', 'membership', 'customer', 'subscriber', 'share'],
    extract: ['customer_name', 'document_type', 'date'],
    retention: 3 * 365,
    icon: '👤'
  },
  TAX_DOC: {
    name: 'Tax Documents',
    folder: 'Tax Documents',
    patterns: ['1099', 'w-9', 'tax', 'irs', 'schedule f', 'ein'],
    extract: ['tax_year', 'document_type', 'amount'],
    retention: 7 * 365,
    icon: '📊'
  },
  INSURANCE: {
    name: 'Insurance',
    folder: 'Insurance',
    patterns: ['insurance', 'policy', 'coverage', 'premium', 'liability', 'claim'],
    extract: ['policy_number', 'provider', 'coverage_type', 'expiry'],
    retention: 10 * 365,
    icon: '🛡️'
  },
  PHOTO: {
    name: 'Farm Photos',
    folder: 'Farm Photos',
    patterns: [], // Detected by MIME type
    extract: ['date_taken', 'location'],
    retention: -1, // Keep forever
    icon: '📷'
  },
  OTHER: {
    name: 'Other Documents',
    folder: 'Other',
    patterns: [],
    extract: [],
    retention: 3 * 365,
    icon: '📁'
  }
};

// ==========================================
// INITIALIZATION
// ==========================================

/**
 * Initialize file organization system
 * Creates folder structure in Google Drive
 */
function initializeFileOrganization() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create tracking sheet
  let sheet = ss.getSheetByName('COS_FILE_INDEX');
  if (!sheet) {
    sheet = ss.insertSheet('COS_FILE_INDEX');
    sheet.appendRow([
      'file_id', 'file_name', 'category', 'folder_path', 'extracted_data',
      'source', 'linked_emails', 'tags', 'created_date', 'indexed_date',
      'size_bytes', 'mime_type', 'confidence', 'needs_review'
    ]);
    sheet.getRange(1, 1, 1, 14).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // Create extraction log sheet
  let extractLog = ss.getSheetByName('COS_FILE_EXTRACTIONS');
  if (!extractLog) {
    extractLog = ss.insertSheet('COS_FILE_EXTRACTIONS');
    extractLog.appendRow([
      'timestamp', 'file_id', 'category', 'field', 'value', 'confidence', 'source'
    ]);
    extractLog.getRange(1, 1, 1, 7).setFontWeight('bold');
  }

  // Create folder structure in Drive
  const rootFolder = getOrCreateFolder('Chief of Staff Files');

  for (const [key, cat] of Object.entries(FILE_CATEGORIES)) {
    getOrCreateFolder(cat.folder, rootFolder);
  }

  // Create special folders
  getOrCreateFolder('Email Attachments', rootFolder);
  getOrCreateFolder('Pending Review', rootFolder);

  return {
    success: true,
    message: 'File organization system initialized',
    rootFolderId: rootFolder.getId()
  };
}

/**
 * Get or create a folder
 */
function getOrCreateFolder(name, parent = null) {
  const parentFolder = parent || DriveApp.getRootFolder();
  const folders = parentFolder.getFoldersByName(name);

  if (folders.hasNext()) {
    return folders.next();
  }

  return parentFolder.createFolder(name);
}

// ==========================================
// FILE CATEGORIZATION
// ==========================================

/**
 * Categorize a file using AI and pattern matching
 *
 * @param {File} file - Google Drive file
 * @returns {Object} Category information
 */
function categorizeFile(file) {
  const mimeType = file.getMimeType();
  const fileName = file.getName().toLowerCase();

  // Quick categorization for images
  if (mimeType.startsWith('image/')) {
    return {
      category: 'PHOTO',
      confidence: 0.95,
      method: 'mime_type'
    };
  }

  // Get text content for analysis
  let textContent = '';

  if (mimeType === 'application/pdf') {
    textContent = extractPDFText(file);
  } else if (mimeType.includes('document') || mimeType.includes('text')) {
    textContent = extractDocumentText(file);
  } else if (mimeType.includes('spreadsheet')) {
    textContent = extractSpreadsheetText(file);
  }

  // Pattern matching
  const patternMatch = matchCategoryPatterns(fileName + ' ' + textContent);

  if (patternMatch.confidence > 0.7) {
    return {
      category: patternMatch.category,
      confidence: patternMatch.confidence,
      method: 'pattern_match',
      matchedPatterns: patternMatch.patterns
    };
  }

  // AI categorization for uncertain files
  if (textContent.length > 50) {
    return categorizeWithAI(file, textContent);
  }

  return {
    category: 'OTHER',
    confidence: 0.5,
    method: 'default'
  };
}

/**
 * Pattern-based category matching
 */
function matchCategoryPatterns(text) {
  const lowerText = text.toLowerCase();
  const scores = {};
  const matchedPatterns = {};

  for (const [catKey, cat] of Object.entries(FILE_CATEGORIES)) {
    scores[catKey] = 0;
    matchedPatterns[catKey] = [];

    for (const pattern of cat.patterns) {
      if (lowerText.includes(pattern.toLowerCase())) {
        scores[catKey]++;
        matchedPatterns[catKey].push(pattern);
      }
    }
  }

  // Find best match
  let bestCategory = 'OTHER';
  let bestScore = 0;

  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }

  // Calculate confidence based on pattern matches
  const confidence = Math.min(0.95, 0.5 + (bestScore * 0.15));

  return {
    category: bestCategory,
    confidence: confidence,
    patterns: matchedPatterns[bestCategory]
  };
}

/**
 * AI-powered categorization for complex documents
 */
function categorizeWithAI(file, textContent) {
  const categories = Object.entries(FILE_CATEGORIES)
    .map(([key, cat]) => `${key}: ${cat.name}`)
    .join('\n');

  const prompt = `Categorize this document into ONE of these categories:

${categories}

Document name: ${file.getName()}
Document content (first 2000 chars):
${textContent.substring(0, 2000)}

Return ONLY a JSON object:
{"category": "CATEGORY_KEY", "confidence": 0.0-1.0, "reasoning": "brief explanation"}`;

  try {
    const response = callClaudeForFiles(prompt);
    const result = JSON.parse(response);

    return {
      category: result.category || 'OTHER',
      confidence: result.confidence || 0.7,
      method: 'ai',
      reasoning: result.reasoning
    };
  } catch (error) {
    console.error('AI categorization error:', error);
    return {
      category: 'OTHER',
      confidence: 0.5,
      method: 'error_fallback'
    };
  }
}

// ==========================================
// DATA EXTRACTION
// ==========================================

/**
 * Extract structured data from a categorized file
 */
function extractFileData(file, category) {
  const catConfig = FILE_CATEGORIES[category];
  if (!catConfig || !catConfig.extract || catConfig.extract.length === 0) {
    return { extracted: false };
  }

  const mimeType = file.getMimeType();
  let textContent = '';

  // Get text content
  if (mimeType === 'application/pdf') {
    textContent = extractPDFText(file);
  } else if (mimeType.includes('document') || mimeType.includes('text')) {
    textContent = extractDocumentText(file);
  }

  if (textContent.length < 20) {
    return { extracted: false, reason: 'insufficient_text' };
  }

  // Use AI to extract fields
  const fieldsToExtract = catConfig.extract;

  const prompt = `Extract the following information from this ${catConfig.name} document:

Fields to extract: ${fieldsToExtract.join(', ')}

Document content:
${textContent.substring(0, 3000)}

Return ONLY a JSON object with the extracted fields. Use null for fields not found.
Example: {"invoice_number": "INV-123", "amount": 150.00, "vendor": "Acme Corp"}`;

  try {
    const response = callClaudeForFiles(prompt);
    const extracted = JSON.parse(response);

    // Log extractions
    logExtraction(file.getId(), category, extracted);

    return {
      extracted: true,
      data: extracted,
      fields: fieldsToExtract
    };
  } catch (error) {
    console.error('Extraction error:', error);
    return {
      extracted: false,
      error: error.message
    };
  }
}

/**
 * Extract text from PDF
 */
function extractPDFText(file) {
  try {
    // Use Drive's OCR capability
    const blob = file.getBlob();
    const resource = {
      title: file.getName() + '_ocr',
      mimeType: 'application/vnd.google-apps.document'
    };

    // Convert PDF to Google Doc (includes OCR)
    const docFile = Drive.Files.copy(resource, file.getId(), {
      ocr: true,
      ocrLanguage: 'en'
    });

    // Get text from the doc
    const doc = DocumentApp.openById(docFile.id);
    const text = doc.getBody().getText();

    // Clean up the temporary doc
    Drive.Files.remove(docFile.id);

    return text;
  } catch (error) {
    console.error('PDF extraction error:', error);

    // Fallback: try to get any existing text
    try {
      const blob = file.getBlob();
      return blob.getDataAsString().substring(0, 5000);
    } catch (e) {
      return '';
    }
  }
}

/**
 * Extract text from document
 */
function extractDocumentText(file) {
  try {
    const mimeType = file.getMimeType();

    if (mimeType === 'application/vnd.google-apps.document') {
      const doc = DocumentApp.openById(file.getId());
      return doc.getBody().getText();
    }

    // For other document types, try converting
    const blob = file.getBlob();
    return blob.getDataAsString().substring(0, 10000);
  } catch (error) {
    console.error('Document extraction error:', error);
    return '';
  }
}

/**
 * Extract text from spreadsheet
 */
function extractSpreadsheetText(file) {
  try {
    const ss = SpreadsheetApp.openById(file.getId());
    const sheets = ss.getSheets();

    let text = '';
    for (const sheet of sheets.slice(0, 3)) { // First 3 sheets
      const data = sheet.getDataRange().getValues();
      for (const row of data.slice(0, 50)) { // First 50 rows
        text += row.join(' ') + '\n';
      }
    }

    return text.substring(0, 5000);
  } catch (error) {
    console.error('Spreadsheet extraction error:', error);
    return '';
  }
}

/**
 * Log extraction to sheet
 */
function logExtraction(fileId, category, extracted) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COS_FILE_EXTRACTIONS');

  if (!sheet) return;

  const timestamp = new Date().toISOString();

  for (const [field, value] of Object.entries(extracted)) {
    if (value !== null) {
      sheet.appendRow([
        timestamp,
        fileId,
        category,
        field,
        String(value),
        0.8, // Default confidence
        'ai_extraction'
      ]);
    }
  }
}

// ==========================================
// FILE ORGANIZATION
// ==========================================

/**
 * Organize a file: categorize, extract, and file
 */
function organizeFile(fileId) {
  const file = DriveApp.getFileById(fileId);

  // Step 1: Categorize
  const categorization = categorizeFile(file);

  // Step 2: Extract data
  const extraction = extractFileData(file, categorization.category);

  // Step 3: Move to appropriate folder
  const catConfig = FILE_CATEGORIES[categorization.category];
  const rootFolder = getOrCreateFolder('Chief of Staff Files');
  const targetFolder = getOrCreateFolder(catConfig.folder, rootFolder);

  // Move file
  const currentParents = file.getParents();
  while (currentParents.hasNext()) {
    currentParents.next().removeFile(file);
  }
  targetFolder.addFile(file);

  // Step 4: Generate tags
  const tags = generateFileTags(file, categorization, extraction);

  // Step 5: Index the file
  indexFile(file, categorization, extraction, tags);

  return {
    success: true,
    fileId: fileId,
    fileName: file.getName(),
    category: categorization.category,
    categoryName: catConfig.name,
    confidence: categorization.confidence,
    extraction: extraction,
    tags: tags,
    location: targetFolder.getName()
  };
}

/**
 * Generate smart tags for a file
 */
function generateFileTags(file, categorization, extraction) {
  const tags = [];

  // Category tag
  tags.push(categorization.category.toLowerCase());

  // Year tag
  const created = file.getDateCreated();
  tags.push(`year:${created.getFullYear()}`);

  // Month tag
  const month = created.toLocaleString('default', { month: 'short' }).toLowerCase();
  tags.push(`month:${month}`);

  // Extract-based tags
  if (extraction.extracted && extraction.data) {
    if (extraction.data.vendor) {
      tags.push(`vendor:${extraction.data.vendor.toLowerCase().replace(/\s+/g, '_')}`);
    }
    if (extraction.data.amount && extraction.data.amount > 1000) {
      tags.push('high_value');
    }
    if (extraction.data.customer_name) {
      tags.push(`customer:${extraction.data.customer_name.toLowerCase().replace(/\s+/g, '_')}`);
    }
  }

  return tags;
}

/**
 * Index file in tracking sheet
 */
function indexFile(file, categorization, extraction, tags) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COS_FILE_INDEX');

  if (!sheet) return;

  // Check if already indexed
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === file.getId()) {
      // Update existing row
      const row = i + 1;
      sheet.getRange(row, 3).setValue(categorization.category);
      sheet.getRange(row, 5).setValue(JSON.stringify(extraction.data || {}));
      sheet.getRange(row, 8).setValue(tags.join(', '));
      sheet.getRange(row, 10).setValue(new Date().toISOString());
      sheet.getRange(row, 13).setValue(categorization.confidence);
      return;
    }
  }

  // Add new row
  sheet.appendRow([
    file.getId(),
    file.getName(),
    categorization.category,
    file.getParents().hasNext() ? file.getParents().next().getName() : 'root',
    JSON.stringify(extraction.data || {}),
    'drive', // source
    '', // linked_emails
    tags.join(', '),
    file.getDateCreated().toISOString(),
    new Date().toISOString(),
    file.getSize(),
    file.getMimeType(),
    categorization.confidence,
    categorization.confidence < 0.7 ? 'yes' : 'no'
  ]);
}

// ==========================================
// EMAIL ATTACHMENT PROCESSING
// ==========================================

/**
 * Process and organize email attachments
 */
function processEmailAttachments(threadId) {
  const thread = GmailApp.getThreadById(threadId);
  const messages = thread.getMessages();
  const results = [];

  const rootFolder = getOrCreateFolder('Chief of Staff Files');
  const attachFolder = getOrCreateFolder('Email Attachments', rootFolder);

  for (const message of messages) {
    const attachments = message.getAttachments();

    for (const attachment of attachments) {
      // Skip small images (likely signatures)
      if (attachment.getSize() < 10000 &&
          attachment.getContentType().startsWith('image/')) {
        continue;
      }

      // Save to Drive
      const file = attachFolder.createFile(attachment);

      // Add metadata
      file.setDescription(
        `Source: Email from ${message.getFrom()}\n` +
        `Subject: ${message.getSubject()}\n` +
        `Date: ${message.getDate().toISOString()}\n` +
        `Thread ID: ${threadId}`
      );

      // Organize the file
      const organized = organizeFile(file.getId());

      // Link to email
      linkFileToEmail(file.getId(), threadId);

      results.push(organized);
    }
  }

  return {
    threadId: threadId,
    attachmentsProcessed: results.length,
    files: results
  };
}

/**
 * Link a file to an email thread
 */
function linkFileToEmail(fileId, threadId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COS_FILE_INDEX');

  if (!sheet) return;

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === fileId) {
      const row = i + 1;
      const existingLinks = data[i][6] || '';
      const links = existingLinks ? existingLinks.split(',').map(l => l.trim()) : [];

      if (!links.includes(threadId)) {
        links.push(threadId);
        sheet.getRange(row, 7).setValue(links.join(', '));
      }
      return;
    }
  }
}

// ==========================================
// NATURAL LANGUAGE SEARCH
// ==========================================

/**
 * Search files using natural language
 */
function searchFilesNaturalLanguage(query) {
  // Parse natural language query with AI
  const parsePrompt = `Parse this file search query into structured filters:

Query: "${query}"

Return JSON with these optional fields:
- category: file category (INVOICE, RECEIPT, CONTRACT, etc.)
- vendor: vendor/company name
- date_range: {start: "YYYY-MM-DD", end: "YYYY-MM-DD"}
- amount_range: {min: number, max: number}
- keywords: array of search keywords
- tags: array of tags to match

Example: {"category": "INVOICE", "vendor": "Johnny Seeds", "keywords": ["tomato"]}`;

  let filters;
  try {
    const response = callClaudeForFiles(parsePrompt);
    filters = JSON.parse(response);
  } catch (error) {
    // Fallback to keyword search
    filters = { keywords: query.split(' ') };
  }

  // Search the index
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COS_FILE_INDEX');

  if (!sheet) {
    return { results: [], message: 'File index not initialized' };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const results = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const file = {
      id: row[0],
      name: row[1],
      category: row[2],
      folder: row[3],
      extracted: row[4] ? JSON.parse(row[4]) : {},
      tags: (row[7] || '').split(',').map(t => t.trim()),
      created: row[8],
      mimeType: row[11]
    };

    // Apply filters
    let matches = true;

    if (filters.category && file.category !== filters.category) {
      matches = false;
    }

    if (filters.vendor && file.extracted.vendor) {
      if (!file.extracted.vendor.toLowerCase().includes(filters.vendor.toLowerCase())) {
        matches = false;
      }
    }

    if (filters.keywords && filters.keywords.length > 0) {
      const searchText = (file.name + ' ' + JSON.stringify(file.extracted) + ' ' + file.tags.join(' ')).toLowerCase();
      for (const keyword of filters.keywords) {
        if (!searchText.includes(keyword.toLowerCase())) {
          matches = false;
          break;
        }
      }
    }

    if (filters.tags && filters.tags.length > 0) {
      for (const tag of filters.tags) {
        if (!file.tags.includes(tag)) {
          matches = false;
          break;
        }
      }
    }

    if (matches) {
      results.push(file);
    }
  }

  return {
    query: query,
    filters: filters,
    results: results,
    count: results.length
  };
}

// ==========================================
// BATCH ORGANIZATION
// ==========================================

/**
 * Organize all files in a folder
 */
function organizeFolder(folderId, recursive = false) {
  const folder = DriveApp.getFolderById(folderId);
  const results = [];

  // Process files in folder
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();

    try {
      const result = organizeFile(file.getId());
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        fileId: file.getId(),
        fileName: file.getName(),
        error: error.message
      });
    }
  }

  // Process subfolders if recursive
  if (recursive) {
    const subfolders = folder.getFolders();
    while (subfolders.hasNext()) {
      const subfolder = subfolders.next();

      // Skip our organized folders
      if (subfolder.getName() === 'Chief of Staff Files') continue;

      const subResults = organizeFolder(subfolder.getId(), true);
      results.push(...subResults.results);
    }
  }

  return {
    folder: folder.getName(),
    processed: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results: results
  };
}

/**
 * Scan inbox for attachments and organize
 */
function scanInboxAttachments(days = 7) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const query = `has:attachment after:${Utilities.formatDate(cutoff, 'GMT', 'yyyy/MM/dd')}`;

  const threads = GmailApp.search(query, 0, 50);
  const results = [];

  for (const thread of threads) {
    try {
      const result = processEmailAttachments(thread.getId());
      if (result.attachmentsProcessed > 0) {
        results.push(result);
      }
    } catch (error) {
      results.push({
        threadId: thread.getId(),
        error: error.message
      });
    }
  }

  return {
    threadsScanned: threads.length,
    withAttachments: results.length,
    results: results
  };
}

// ==========================================
// FILE RECOMMENDATIONS
// ==========================================

/**
 * Get file recommendations based on context
 */
function getFileRecommendations(context) {
  const recommendations = [];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COS_FILE_INDEX');

  if (!sheet) return recommendations;

  const data = sheet.getDataRange().getValues();

  // Build context keywords
  const contextKeywords = [];
  if (context.email_from) contextKeywords.push(context.email_from.split('@')[0].toLowerCase());
  if (context.email_subject) contextKeywords.push(...context.email_subject.toLowerCase().split(' '));
  if (context.customer_name) contextKeywords.push(context.customer_name.toLowerCase());

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const file = {
      id: row[0],
      name: row[1],
      category: row[2],
      extracted: row[4] ? JSON.parse(row[4]) : {},
      tags: (row[7] || '').split(',').map(t => t.trim())
    };

    // Score relevance
    let score = 0;
    const searchText = (file.name + ' ' + JSON.stringify(file.extracted)).toLowerCase();

    for (const keyword of contextKeywords) {
      if (keyword.length > 2 && searchText.includes(keyword)) {
        score += 1;
      }
    }

    if (score > 0) {
      recommendations.push({
        ...file,
        relevanceScore: score,
        url: `https://drive.google.com/file/d/${file.id}/view`
      });
    }
  }

  // Sort by relevance and return top 5
  return recommendations
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5);
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Call Claude for file operations
 */
function callClaudeForFiles(prompt) {
  if (typeof askClaudeEmail === 'function') {
    return askClaudeEmail(prompt, 'haiku');
  }

  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  if (!apiKey) throw new Error('Claude API key not configured');

  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const result = JSON.parse(response.getContentText());
  return result.content[0].text;
}

/**
 * Get file organization statistics
 */
function getFileOrganizationStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COS_FILE_INDEX');

  if (!sheet) {
    return { initialized: false };
  }

  const data = sheet.getDataRange().getValues();

  const stats = {
    totalFiles: data.length - 1,
    byCategory: {},
    needsReview: 0,
    totalSize: 0,
    recentlyAdded: 0
  };

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (let i = 1; i < data.length; i++) {
    const category = data[i][2] || 'OTHER';
    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

    if (data[i][13] === 'yes') stats.needsReview++;
    stats.totalSize += data[i][10] || 0;

    const indexed = new Date(data[i][9]);
    if (indexed > oneWeekAgo) stats.recentlyAdded++;
  }

  stats.totalSizeMB = (stats.totalSize / (1024 * 1024)).toFixed(2);

  return stats;
}

// ==========================================
// API ENDPOINTS
// ==========================================

/**
 * Initialize file system via API
 */
function initFileSystem() {
  return initializeFileOrganization();
}

/**
 * Organize single file via API
 */
function organizeFileById(fileId) {
  return organizeFile(fileId);
}

/**
 * Search files via API
 */
function searchFiles(query) {
  return searchFilesNaturalLanguage(query);
}

/**
 * Get file stats via API
 */
function getFileStats() {
  return getFileOrganizationStats();
}
