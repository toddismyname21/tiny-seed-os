/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TINY SEED OS - ACCOUNTING & COMPLIANCE MODULE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Owner: Accounting_Compliance Claude
 * Created: 2026-01-16
 *
 * Features:
 * - Gmail integration for accountant emails (DGPerry)
 * - Receipt management with OCR
 * - Expense categorization (Schedule F aligned)
 * - Loan readiness document generation
 * - Audit trail logging
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const ACCOUNTING_CONFIG = {
  // DGPerry accountant email addresses
  ACCOUNTANT_EMAILS: [
    'mbockart@dgperry.com',
    'Billing@dgperry.com',
    'afalzarano@bodineperry.com',
    'noreply@safesendreturns.com',
    'mreiland@dgperry.com',
    'glevine@dgperry.com'
  ],

  // Google Drive folder IDs (will be created/configured on first run)
  DRIVE_FOLDERS: {
    RECEIPTS_ROOT: null,  // Will store folder ID after creation
    ACCOUNTANT_DOCS: null
  },

  // Receipt folder naming
  RECEIPT_FOLDER_NAME: 'Farm Receipts',
  ACCOUNTANT_FOLDER_NAME: 'Accountant Documents',

  // OCR Configuration
  ENABLE_OCR: true,

  // Organic certifier
  CERTIFIER: 'OEFFA Ohio'
};

// ═══════════════════════════════════════════════════════════════════════════
// SHEET DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

const ACCOUNTING_SHEETS = {
  RECEIPTS: 'RECEIPTS',
  CATEGORIES: 'EXPENSE_CATEGORIES',
  COMPANY_CARDS: 'COMPANY_CARDS',
  REIMBURSEMENTS: 'REIMBURSEMENTS',
  ACCOUNTANT_DOCS: 'ACCOUNTANT_DOCS',
  ACCOUNTANT_EMAILS: 'ACCOUNTANT_EMAILS',
  VENDOR_CATEGORIES: 'VENDOR_CATEGORIES',
  GRANTS: 'GRANTS',
  GRANT_EXPENDITURES: 'GRANT_EXPENDITURES',
  FIXED_ASSETS: 'FIXED_ASSETS',
  AUDIT_TRAIL: 'AUDIT_TRAIL',
  ACCOUNTANT_TASKS: 'ACCOUNTANT_TASKS'
};

// Headers for each sheet
const RECEIPT_HEADERS = [
  'Receipt_ID', 'Date', 'Vendor', 'Amount', 'Tax_Amount',
  'Category_ID', 'Category_Name', 'Payment_Method', 'Card_Type',
  'Reimbursement_Status', 'Reimbursement_Date', 'Drive_File_ID', 'Drive_URL',
  'OCR_Raw_Text', 'Submitted_By', 'Submitted_Date', 'Verified', 'Verified_By',
  'Notes', 'Enterprise', 'Tax_Year', 'Organic_Certified', 'Grant_ID'
];

const CATEGORY_HEADERS = [
  'Category_ID', 'Category_Name', 'Type', 'Schedule_F_Line',
  'Description', 'Is_Active', 'Sort_Order'
];

const COMPANY_CARD_HEADERS = [
  'Card_ID', 'Card_Name', 'Last_Four', 'Card_Type',
  'Assigned_To', 'Monthly_Limit', 'Status'
];

const REIMBURSEMENT_HEADERS = [
  'Reimbursement_ID', 'Employee_ID', 'Employee_Name', 'Receipt_ID',
  'Amount', 'Submitted_Date', 'Approved_By', 'Approved_Date',
  'Paid_Date', 'Payment_Method', 'Check_Number', 'Status'
];

const ACCOUNTANT_DOC_HEADERS = [
  'Doc_ID', 'Document_Name', 'Document_Type', 'Received_Date',
  'From_Email', 'From_Name', 'Drive_File_ID', 'Drive_URL',
  'Status', 'Action_Required', 'Due_Date', 'Completed_Date',
  'Notes', 'Email_Thread_ID', 'Email_Message_ID'
];

const ACCOUNTANT_EMAIL_HEADERS = [
  'Email_ID', 'Thread_ID', 'Message_ID', 'From_Email', 'From_Name',
  'Subject', 'Date', 'Snippet', 'Has_Attachments', 'Attachment_Count',
  'Attachments_Saved', 'Status', 'Imported_At', 'Notes'
];

const VENDOR_CATEGORY_HEADERS = [
  'Vendor_Pattern', 'Category_ID', 'Category_Name',
  'Confidence', 'Times_Used', 'Last_Updated'
];

const GRANT_HEADERS = [
  'Grant_ID', 'Grant_Name', 'Funding_Agency', 'Award_Amount',
  'Start_Date', 'End_Date', 'Reporting_Frequency', 'Next_Report_Due',
  'Status', 'Contact_Name', 'Contact_Email', 'Notes', 'Drive_Folder_ID'
];

const GRANT_EXPENDITURE_HEADERS = [
  'Expenditure_ID', 'Grant_ID', 'Receipt_ID', 'Amount',
  'Category', 'Date', 'Description', 'Approved_By', 'Notes'
];

const FIXED_ASSET_HEADERS = [
  'Asset_ID', 'Asset_Name', 'Category', 'Purchase_Date', 'Purchase_Price',
  'Useful_Life_Years', 'Depreciation_Method', 'Current_Value',
  'Accumulated_Depreciation', 'Location', 'Status', 'Serial_Number', 'Notes'
];

const AUDIT_TRAIL_HEADERS = [
  'Log_ID', 'Timestamp', 'User_ID', 'User_Name', 'Action_Type',
  'Entity_Type', 'Entity_ID', 'Old_Value', 'New_Value', 'IP_Address', 'Notes'
];

const ACCOUNTANT_TASK_HEADERS = [
  'Task_ID', 'Title', 'Description', 'Category', 'Priority', 'Status',
  'Source_Type', 'Source_ID', 'Source_Date', 'Due_Date', 'Assigned_To',
  'Created_At', 'Updated_At', 'Completed_At', 'Completed_By', 'Notes',
  'Recurring', 'Recurrence_Pattern'
];

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize all accounting sheets and Drive folders
 */
function initializeAccountingModule() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Create all accounting sheets
  createAccountingSheet(ss, ACCOUNTING_SHEETS.RECEIPTS, RECEIPT_HEADERS, '#10b981');
  createAccountingSheet(ss, ACCOUNTING_SHEETS.CATEGORIES, CATEGORY_HEADERS, '#3b82f6');
  createAccountingSheet(ss, ACCOUNTING_SHEETS.COMPANY_CARDS, COMPANY_CARD_HEADERS, '#f59e0b');
  createAccountingSheet(ss, ACCOUNTING_SHEETS.REIMBURSEMENTS, REIMBURSEMENT_HEADERS, '#ef4444');
  createAccountingSheet(ss, ACCOUNTING_SHEETS.ACCOUNTANT_DOCS, ACCOUNTANT_DOC_HEADERS, '#8b5cf6');
  createAccountingSheet(ss, ACCOUNTING_SHEETS.ACCOUNTANT_EMAILS, ACCOUNTANT_EMAIL_HEADERS, '#8b5cf6');
  createAccountingSheet(ss, ACCOUNTING_SHEETS.VENDOR_CATEGORIES, VENDOR_CATEGORY_HEADERS, '#6366f1');
  createAccountingSheet(ss, ACCOUNTING_SHEETS.GRANTS, GRANT_HEADERS, '#22c55e');
  createAccountingSheet(ss, ACCOUNTING_SHEETS.GRANT_EXPENDITURES, GRANT_EXPENDITURE_HEADERS, '#22c55e');
  createAccountingSheet(ss, ACCOUNTING_SHEETS.FIXED_ASSETS, FIXED_ASSET_HEADERS, '#64748b');
  createAccountingSheet(ss, ACCOUNTING_SHEETS.AUDIT_TRAIL, AUDIT_TRAIL_HEADERS, '#475569');
  createAccountingSheet(ss, ACCOUNTING_SHEETS.ACCOUNTANT_TASKS, ACCOUNTANT_TASK_HEADERS, '#dc2626');

  // Initialize expense categories if empty
  initializeExpenseCategories();

  // Create Drive folder structure
  createDriveFolderStructure();

  return {
    success: true,
    message: 'Accounting module initialized successfully',
    sheets: Object.values(ACCOUNTING_SHEETS)
  };
}

/**
 * Create an accounting sheet with color coding
 */
function createAccountingSheet(ss, name, headers, color) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setBackground(color)
      .setFontColor('white')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
    Logger.log('Created accounting sheet: ' + name);
  }
  return sheet;
}

/**
 * Initialize default expense categories based on Schedule F
 */
function initializeExpenseCategories() {
  const sheet = getOrCreateSheet(ACCOUNTING_SHEETS.CATEGORIES, CATEGORY_HEADERS);
  const existing = sheet.getDataRange().getValues();

  // Only populate if empty (just headers)
  if (existing.length > 1) {
    return { success: true, message: 'Categories already initialized' };
  }

  // Income categories
  const incomeCategories = [
    ['INC-001', 'Sales of Produce', 'Income', 'Line 1a', 'Fresh vegetables, herbs', true, 1],
    ['INC-002', 'Sales of Flowers', 'Income', 'Line 1a', 'Cut flowers, bouquets, arrangements', true, 2],
    ['INC-003', 'Sales of Plants', 'Income', 'Line 1a', 'Transplants, seedlings sold', true, 3],
    ['INC-004', 'CSA Revenue', 'Income', 'Line 1a', 'Community Supported Agriculture shares', true, 4],
    ['INC-005', 'Farmers Market Sales', 'Income', 'Line 1a', 'Direct-to-consumer market sales', true, 5],
    ['INC-006', 'Wholesale Revenue', 'Income', 'Line 1a', 'Restaurant, grocery, florist sales', true, 6],
    ['INC-007', 'Agritourism Income', 'Income', 'Line 8', 'Farm tours, workshops, events', true, 7],
    ['INC-008', 'Agricultural Program Payments', 'Income', 'Line 4a', 'USDA, FSA, state program payments', true, 8],
    ['INC-009', 'Crop Insurance Proceeds', 'Income', 'Line 6', 'Federal crop insurance payments', true, 9],
    ['INC-010', 'Grant Income', 'Income', 'Line 8', 'Research grants, conservation grants', true, 10],
    ['INC-011', 'Custom Services', 'Income', 'Line 8', 'Services performed for others', true, 11],
    ['INC-012', 'Rental Income', 'Income', 'Line 8', 'Equipment or land rental', true, 12]
  ];

  // Expense categories
  const expenseCategories = [
    ['EXP-001', 'Seeds & Transplants', 'Expense', 'Line 22', 'Seed purchases, plug trays', true, 101],
    ['EXP-002', 'Soil Amendments', 'Expense', 'Line 22', 'Compost, fertilizer, lime, minerals', true, 102],
    ['EXP-003', 'Pest & Disease Control', 'Expense', 'Line 6', 'Organic pesticides, row cover, netting', true, 103],
    ['EXP-004', 'Irrigation Supplies', 'Expense', 'Line 22', 'Drip tape, emitters, fittings', true, 104],
    ['EXP-005', 'Tools - Hand', 'Expense', 'Line 22', 'Hoes, rakes, harvest knives', true, 105],
    ['EXP-006', 'Tools - Power', 'Expense', 'Line 12/14', 'Tillers, mowers (depreciate if >$2500)', true, 106],
    ['EXP-007', 'Equipment - Major', 'Expense', 'Line 14', 'Tractors, implements (depreciation)', true, 107],
    ['EXP-008', 'Fuel & Oil', 'Expense', 'Line 10', 'Gas, diesel, equipment oil', true, 108],
    ['EXP-009', 'Vehicle Expenses', 'Expense', 'Line 10', 'Farm truck, mileage, maintenance', true, 109],
    ['EXP-010', 'Labor - Wages', 'Expense', 'Line 22', 'Employee wages', true, 110],
    ['EXP-011', 'Labor - Contract', 'Expense', 'Line 8', '1099 contractors', true, 111],
    ['EXP-012', 'Labor - Payroll Tax', 'Expense', 'Line 22', 'Employer FICA, FUTA', true, 112],
    ['EXP-013', 'Packaging & Supplies', 'Expense', 'Line 22', 'Boxes, bags, rubber bands, labels', true, 113],
    ['EXP-014', 'Cooler Supplies', 'Expense', 'Line 22', 'Ice, cooler maintenance', true, 114],
    ['EXP-015', 'Marketing & Advertising', 'Expense', 'Line 22', 'Website, signage, ads', true, 115],
    ['EXP-016', 'Market Fees', 'Expense', 'Line 22', 'Farmers market booth fees', true, 116],
    ['EXP-017', 'Delivery - Vehicle', 'Expense', 'Line 10', 'Delivery truck expenses', true, 117],
    ['EXP-018', 'Delivery - Fuel', 'Expense', 'Line 10', 'Delivery fuel costs', true, 118],
    ['EXP-019', 'Land Rent', 'Expense', 'Line 20a', 'Leased farmland', true, 119],
    ['EXP-020', 'Building Rent', 'Expense', 'Line 20b', 'Leased buildings/storage', true, 120],
    ['EXP-021', 'Property Taxes', 'Expense', 'Line 22', 'Farm property taxes', true, 121],
    ['EXP-022', 'Utilities - Electric', 'Expense', 'Line 25', 'Electric for irrigation, cooler', true, 122],
    ['EXP-023', 'Utilities - Water', 'Expense', 'Line 25', 'Water bills', true, 123],
    ['EXP-024', 'Utilities - Propane/Heat', 'Expense', 'Line 25', 'Greenhouse heating', true, 124],
    ['EXP-025', 'Insurance - Liability', 'Expense', 'Line 15', 'Farm liability insurance', true, 125],
    ['EXP-026', 'Insurance - Crop', 'Expense', 'Line 15', 'Federal crop insurance premiums', true, 126],
    ['EXP-027', 'Insurance - Workers Comp', 'Expense', 'Line 15', 'Employee coverage', true, 127],
    ['EXP-028', 'Insurance - Vehicle', 'Expense', 'Line 15', 'Farm vehicle insurance', true, 128],
    ['EXP-029', 'Professional Services', 'Expense', 'Line 22', 'Accountant, lawyer fees', true, 129],
    ['EXP-030', 'Certifications', 'Expense', 'Line 22', 'Organic, GAP, food safety', true, 130],
    ['EXP-031', 'Licenses & Permits', 'Expense', 'Line 22', 'Business licenses, ag permits', true, 131],
    ['EXP-032', 'Repairs - Buildings', 'Expense', 'Line 16', 'Greenhouse, barn repairs', true, 132],
    ['EXP-033', 'Repairs - Equipment', 'Expense', 'Line 16', 'Tractor, implement repairs', true, 133],
    ['EXP-034', 'Repairs - Vehicles', 'Expense', 'Line 16', 'Farm vehicle repairs', true, 134],
    ['EXP-035', 'Office Supplies', 'Expense', 'Line 22', 'Paper, printer ink, etc.', true, 135],
    ['EXP-036', 'Software & Subscriptions', 'Expense', 'Line 22', 'Farm software, apps', true, 136],
    ['EXP-037', 'Education & Training', 'Expense', 'Line 22', 'Conferences, workshops, books', true, 137],
    ['EXP-038', 'Bank Fees & Interest', 'Expense', 'Line 11/18', 'Loan interest, bank charges', true, 138],
    ['EXP-039', 'Conservation Expenses', 'Expense', 'Line 7', 'Approved conservation practices', true, 139],
    ['EXP-040', 'Depreciation', 'Expense', 'Line 14', 'Calculated depreciation', true, 140],
    ['EXP-041', 'Greenhouse Supplies', 'Expense', 'Line 22', 'Pots, trays, heating mats', true, 141],
    ['EXP-042', 'Cover Crop Seed', 'Expense', 'Line 22', 'Winter rye, clover, etc.', true, 142],
    ['EXP-043', 'Plastic Mulch & Landscape Fabric', 'Expense', 'Line 22', 'Weed control materials', true, 143],
    ['EXP-044', 'Season Extension', 'Expense', 'Line 22', 'Row cover, caterpillar tunnels', true, 144],
    ['EXP-045', 'Flower-Specific Supplies', 'Expense', 'Line 22', 'Floral foam, ribbon, vases', true, 145]
  ];

  // Combine and add to sheet
  const allCategories = [...incomeCategories, ...expenseCategories];
  sheet.getRange(2, 1, allCategories.length, allCategories[0].length).setValues(allCategories);

  return { success: true, message: 'Initialized ' + allCategories.length + ' categories' };
}

/**
 * Create Google Drive folder structure for receipts and documents
 */
function createDriveFolderStructure() {
  const rootFolder = DriveApp.getRootFolder();

  // Create or get Farm Receipts folder
  let receiptsFolder = getOrCreateFolder(rootFolder, ACCOUNTING_CONFIG.RECEIPT_FOLDER_NAME);
  ACCOUNTING_CONFIG.DRIVE_FOLDERS.RECEIPTS_ROOT = receiptsFolder.getId();

  // Create year folders
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  years.forEach(year => {
    const yearFolder = getOrCreateFolder(receiptsFolder, year.toString());

    // Create month folders
    const months = [
      '01-January', '02-February', '03-March', '04-April',
      '05-May', '06-June', '07-July', '08-August',
      '09-September', '10-October', '11-November', '12-December'
    ];

    months.forEach(month => {
      getOrCreateFolder(yearFolder, month);
    });
  });

  // Create Accountant Documents folder
  let accountantFolder = getOrCreateFolder(rootFolder, ACCOUNTING_CONFIG.ACCOUNTANT_FOLDER_NAME);
  ACCOUNTING_CONFIG.DRIVE_FOLDERS.ACCOUNTANT_DOCS = accountantFolder.getId();

  // Create subfolders
  getOrCreateFolder(accountantFolder, 'Incoming');
  getOrCreateFolder(accountantFolder, 'Outgoing');
  getOrCreateFolder(accountantFolder, 'Tax Returns');
  getOrCreateFolder(accountantFolder, 'Financial Statements');

  return {
    success: true,
    receiptsFolder: receiptsFolder.getId(),
    accountantFolder: accountantFolder.getId()
  };
}

/**
 * Get or create a folder within a parent folder
 */
function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

// ═══════════════════════════════════════════════════════════════════════════
// GMAIL INTEGRATION - ACCOUNTANT EMAILS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Import all emails from accountant (DGPerry) addresses
 * Can be run manually or on a time trigger
 * Note: Web app calls have 6-minute limit, so we process in batches
 */
function importAccountantEmails(params) {
  params = params || {};
  const maxResults = Math.min(parseInt(params.maxResults) || 10, 20); // Cap at 20 for web calls
  const onlyNew = params.onlyNew !== false; // Default to only new emails
  const startTime = new Date().getTime();
  const maxRunTime = 5 * 60 * 1000; // 5 minutes (leave buffer before 6-min timeout)

  const results = {
    success: true,
    emailsFound: 0,
    emailsImported: 0,
    attachmentsSaved: 0,
    errors: [],
    timedOut: false
  };

  // Build search query for all accountant emails
  const emailQueries = ACCOUNTING_CONFIG.ACCOUNTANT_EMAILS.map(email => 'from:' + email);
  const searchQuery = '(' + emailQueries.join(' OR ') + ')';

  // Get already imported message IDs to avoid duplicates
  const importedIds = getImportedEmailIds();

  // Search Gmail
  const threads = GmailApp.search(searchQuery, 0, maxResults);
  results.emailsFound = threads.length;

  for (let t = 0; t < threads.length; t++) {
    // Check if we're running out of time
    if (new Date().getTime() - startTime > maxRunTime) {
      results.timedOut = true;
      results.message = 'Stopped early to avoid timeout. Run again to continue.';
      break;
    }

    const thread = threads[t];
    const messages = thread.getMessages();

    for (let m = 0; m < messages.length; m++) {
      const message = messages[m];
      const messageId = message.getId();

      // Skip if already imported
      if (onlyNew && importedIds.includes(messageId)) {
        continue;
      }

      try {
        // Import the email
        const importResult = importSingleEmail(message, thread);
        if (importResult.success) {
          results.emailsImported++;
          results.attachmentsSaved += importResult.attachmentsSaved;
        }
      } catch (e) {
        results.errors.push({
          messageId: messageId,
          error: e.toString()
        });
      }
    }
  }

  return results;
}

/**
 * Import a single email message
 */
function importSingleEmail(message, thread) {
  const sheet = getOrCreateSheet(ACCOUNTING_SHEETS.ACCOUNTANT_EMAILS, ACCOUNTANT_EMAIL_HEADERS);
  const now = new Date().toISOString();

  const messageId = message.getId();
  const threadId = thread.getId();
  const fromEmail = extractEmail(message.getFrom());
  const fromName = extractName(message.getFrom());
  const subject = message.getSubject();
  const date = message.getDate().toISOString();
  const snippet = message.getPlainBody().substring(0, 500);
  const attachments = message.getAttachments();

  // Save attachments to Drive
  let attachmentsSaved = 0;
  const savedAttachments = [];

  if (attachments.length > 0) {
    attachments.forEach(attachment => {
      try {
        const savedFile = saveAttachmentToDrive(attachment, fromEmail, message.getDate());
        if (savedFile) {
          savedAttachments.push({
            name: attachment.getName(),
            fileId: savedFile.getId(),
            url: savedFile.getUrl()
          });
          attachmentsSaved++;

          // Also create ACCOUNTANT_DOCS entry for the attachment
          createAccountantDocEntry(attachment, savedFile, message);
        }
      } catch (e) {
        Logger.log('Error saving attachment: ' + e.toString());
      }
    });
  }

  // Check for SafeSend links (secure document delivery)
  const safeSendLinks = extractSafeSendLinks(message.getBody());
  if (safeSendLinks.length > 0) {
    // Log SafeSend links for manual retrieval (they require authentication)
    safeSendLinks.forEach(link => {
      createAccountantDocEntry({
        getName: () => 'SafeSend Document - ' + subject,
        getContentType: () => 'link/safesend'
      }, {
        getId: () => link,
        getUrl: () => link
      }, message);
    });
  }

  // Generate email ID
  const emailId = 'EMAIL-' + Utilities.formatDate(new Date(), 'America/New_York', 'yyyyMMdd-HHmmss') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

  // Save to sheet
  const row = [
    emailId,
    threadId,
    messageId,
    fromEmail,
    fromName,
    subject,
    date,
    snippet.replace(/\n/g, ' '),
    attachments.length > 0,
    attachments.length,
    attachmentsSaved,
    'Imported',
    now,
    JSON.stringify(savedAttachments)
  ];

  sheet.appendRow(row);

  // Log to audit trail
  logAuditEvent('Import', 'AccountantEmail', emailId, null, {
    from: fromEmail,
    subject: subject,
    attachments: attachmentsSaved
  });

  return {
    success: true,
    emailId: emailId,
    attachmentsSaved: attachmentsSaved
  };
}

/**
 * Get list of already imported email message IDs
 */
function getImportedEmailIds() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ACCOUNTING_SHEETS.ACCOUNTANT_EMAILS);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const messageIdCol = data[0].indexOf('Message_ID');
  if (messageIdCol === -1) return [];

  return data.slice(1).map(row => row[messageIdCol]).filter(id => id);
}

/**
 * Save attachment to Google Drive
 */
function saveAttachmentToDrive(attachment, fromEmail, emailDate) {
  // Get the Accountant Documents/Incoming folder
  const rootFolder = DriveApp.getRootFolder();
  const accountantFolder = getOrCreateFolder(rootFolder, ACCOUNTING_CONFIG.ACCOUNTANT_FOLDER_NAME);
  const incomingFolder = getOrCreateFolder(accountantFolder, 'Incoming');

  // Create year/month subfolder
  const year = emailDate.getFullYear().toString();
  const month = Utilities.formatDate(emailDate, 'America/New_York', 'MM-MMMM');
  const yearFolder = getOrCreateFolder(incomingFolder, year);
  const monthFolder = getOrCreateFolder(yearFolder, month);

  // Create the file
  const fileName = Utilities.formatDate(emailDate, 'America/New_York', 'yyyy-MM-dd') + '_' + attachment.getName();
  const blob = attachment.copyBlob();
  const file = monthFolder.createFile(blob.setName(fileName));

  return file;
}

/**
 * Create an entry in ACCOUNTANT_DOCS for a saved document
 */
function createAccountantDocEntry(attachment, savedFile, message) {
  const sheet = getOrCreateSheet(ACCOUNTING_SHEETS.ACCOUNTANT_DOCS, ACCOUNTANT_DOC_HEADERS);
  const now = new Date().toISOString();

  const docId = 'ADOC-' + Utilities.formatDate(new Date(), 'America/New_York', 'yyyyMMdd-HHmmss') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

  // Determine document type from file extension or content type
  const fileName = attachment.getName();
  const contentType = attachment.getContentType();
  let docType = 'Other';

  if (fileName.toLowerCase().includes('tax') || fileName.toLowerCase().includes('1099') || fileName.toLowerCase().includes('w-2')) {
    docType = 'Tax Document';
  } else if (contentType === 'application/pdf') {
    docType = 'PDF';
  } else if (contentType.includes('spreadsheet') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    docType = 'Spreadsheet';
  } else if (contentType.includes('word') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    docType = 'Word Document';
  } else if (contentType === 'link/safesend') {
    docType = 'SafeSend Link';
  }

  const row = [
    docId,
    fileName,
    docType,
    message.getDate().toISOString().split('T')[0],
    extractEmail(message.getFrom()),
    extractName(message.getFrom()),
    savedFile.getId(),
    savedFile.getUrl(),
    'Pending Review',
    '', // Action required - to be filled by owner
    '', // Due date
    '', // Completed date
    message.getSubject(),
    message.getThread().getId(),
    message.getId()
  ];

  sheet.appendRow(row);

  return docId;
}

/**
 * Extract SafeSend links from email body
 */
function extractSafeSendLinks(htmlBody) {
  const links = [];
  const regex = /https?:\/\/[^\s"'<>]*safesend[^\s"'<>]*/gi;
  const matches = htmlBody.match(regex);

  if (matches) {
    matches.forEach(match => {
      if (!links.includes(match)) {
        links.push(match);
      }
    });
  }

  return links;
}

/**
 * Extract email address from "Name <email>" format
 */
function extractEmail(fromString) {
  const match = fromString.match(/<([^>]+)>/);
  return match ? match[1] : fromString;
}

/**
 * Extract name from "Name <email>" format
 */
function extractName(fromString) {
  const match = fromString.match(/^([^<]+)/);
  return match ? match[1].trim() : '';
}

/**
 * Analyze accountant email patterns
 * Returns insights about document types, formats, and communication patterns
 */
function analyzeAccountantEmailPatterns() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ACCOUNTING_SHEETS.ACCOUNTANT_EMAILS);
  if (!sheet) return { success: false, error: 'No emails imported yet' };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, error: 'No emails to analyze' };

  const headers = data[0];
  const emails = data.slice(1);

  // Analysis results
  const analysis = {
    totalEmails: emails.length,
    byFromEmail: {},
    byMonth: {},
    documentTypes: {},
    subjectPatterns: [],
    attachmentStats: {
      totalWithAttachments: 0,
      totalAttachments: 0,
      avgAttachmentsPerEmail: 0
    },
    commonSubjectWords: {},
    dateRange: {
      earliest: null,
      latest: null
    }
  };

  const fromEmailCol = headers.indexOf('From_Email');
  const dateCol = headers.indexOf('Date');
  const subjectCol = headers.indexOf('Subject');
  const hasAttachCol = headers.indexOf('Has_Attachments');
  const attachCountCol = headers.indexOf('Attachment_Count');

  emails.forEach(row => {
    // By sender
    const fromEmail = row[fromEmailCol];
    analysis.byFromEmail[fromEmail] = (analysis.byFromEmail[fromEmail] || 0) + 1;

    // By month
    const date = new Date(row[dateCol]);
    const monthKey = Utilities.formatDate(date, 'America/New_York', 'yyyy-MM');
    analysis.byMonth[monthKey] = (analysis.byMonth[monthKey] || 0) + 1;

    // Date range
    if (!analysis.dateRange.earliest || date < new Date(analysis.dateRange.earliest)) {
      analysis.dateRange.earliest = date.toISOString();
    }
    if (!analysis.dateRange.latest || date > new Date(analysis.dateRange.latest)) {
      analysis.dateRange.latest = date.toISOString();
    }

    // Attachment stats
    if (row[hasAttachCol]) {
      analysis.attachmentStats.totalWithAttachments++;
      analysis.attachmentStats.totalAttachments += parseInt(row[attachCountCol]) || 0;
    }

    // Subject word analysis
    const subject = row[subjectCol] || '';
    const words = subject.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (word.length > 3) {
        analysis.commonSubjectWords[word] = (analysis.commonSubjectWords[word] || 0) + 1;
      }
    });
  });

  // Calculate averages
  if (analysis.attachmentStats.totalWithAttachments > 0) {
    analysis.attachmentStats.avgAttachmentsPerEmail =
      (analysis.attachmentStats.totalAttachments / analysis.attachmentStats.totalWithAttachments).toFixed(2);
  }

  // Sort common words
  analysis.topSubjectWords = Object.entries(analysis.commonSubjectWords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));

  delete analysis.commonSubjectWords; // Remove raw data

  return { success: true, analysis: analysis };
}

/**
 * Set up automatic email import trigger (runs daily)
 */
function setupEmailImportTrigger() {
  // Remove existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'importAccountantEmails') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new daily trigger
  ScriptApp.newTrigger('importAccountantEmails')
    .timeBased()
    .everyDays(1)
    .atHour(6) // Run at 6 AM
    .create();

  return { success: true, message: 'Daily email import scheduled for 6 AM' };
}

// ═══════════════════════════════════════════════════════════════════════════
// RECEIPT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Save a new receipt
 */
function saveReceipt(data) {
  const sheet = getOrCreateSheet(ACCOUNTING_SHEETS.RECEIPTS, RECEIPT_HEADERS);
  const now = new Date().toISOString();

  // Generate receipt ID
  const receiptId = 'RCP-' + Utilities.formatDate(new Date(), 'America/New_York', 'yyyyMMdd') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

  // Determine category name from ID if not provided
  let categoryName = data.categoryName || '';
  if (data.categoryId && !categoryName) {
    const categories = getExpenseCategories();
    const category = categories.data.find(c => c.categoryId === data.categoryId);
    if (category) categoryName = category.categoryName;
  }

  // Determine tax year
  const receiptDate = new Date(data.date || now);
  const taxYear = receiptDate.getFullYear();

  const row = [
    receiptId,
    data.date || now.split('T')[0],
    data.vendor || '',
    parseFloat(data.amount) || 0,
    parseFloat(data.taxAmount) || 0,
    data.categoryId || '',
    categoryName,
    data.paymentMethod || 'Credit Card',
    data.cardType || 'Company',
    data.cardType === 'Personal' ? 'Pending' : 'N/A',
    '', // Reimbursement date
    data.driveFileId || '',
    data.driveUrl || '',
    data.ocrText || '',
    data.submittedBy || '',
    now,
    false, // Not verified yet
    '', // Verified by
    data.notes || '',
    data.enterprise || '',
    taxYear,
    data.organicCertified || false,
    data.grantId || ''
  ];

  sheet.appendRow(row);

  // Auto-learn vendor category
  if (data.vendor && data.categoryId) {
    learnVendorCategory(data.vendor, data.categoryId, categoryName);
  }

  // Log to audit trail
  logAuditEvent('Create', 'Receipt', receiptId, null, {
    vendor: data.vendor,
    amount: data.amount,
    category: categoryName
  });

  return {
    success: true,
    receiptId: receiptId,
    message: 'Receipt saved successfully'
  };
}

/**
 * Upload receipt image and save
 */
function uploadReceiptImage(data) {
  // data.imageData should be base64 encoded
  // data.fileName is the original filename
  // data.mimeType is the file type (image/jpeg, image/png, etc.)

  if (!data.imageData) {
    return { success: false, error: 'No image data provided' };
  }

  // Decode base64 and create blob
  const decoded = Utilities.base64Decode(data.imageData);
  const blob = Utilities.newBlob(decoded, data.mimeType || 'image/jpeg', data.fileName || 'receipt.jpg');

  // Get the receipts folder for current month
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = Utilities.formatDate(now, 'America/New_York', 'MM-MMMM');

  const rootFolder = DriveApp.getRootFolder();
  const receiptsRoot = getOrCreateFolder(rootFolder, ACCOUNTING_CONFIG.RECEIPT_FOLDER_NAME);
  const yearFolder = getOrCreateFolder(receiptsRoot, year);
  const monthFolder = getOrCreateFolder(yearFolder, month);

  // Create unique filename
  const timestamp = Utilities.formatDate(now, 'America/New_York', 'yyyyMMdd-HHmmss');
  const uniqueName = 'receipt_' + timestamp + '_' + (data.fileName || 'image.jpg');

  // Save to Drive
  const file = monthFolder.createFile(blob.setName(uniqueName));

  // Perform OCR if enabled
  let ocrResult = null;
  if (ACCOUNTING_CONFIG.ENABLE_OCR) {
    ocrResult = performOCR(file.getId());
  }

  // Auto-suggest category based on OCR
  let suggestedCategory = null;
  if (ocrResult && ocrResult.vendor) {
    suggestedCategory = suggestCategory(ocrResult.vendor);
  }

  // Save receipt record
  const receiptData = {
    date: ocrResult?.date || data.date || now.toISOString().split('T')[0],
    vendor: ocrResult?.vendor || data.vendor || '',
    amount: ocrResult?.amount || data.amount || 0,
    taxAmount: ocrResult?.taxAmount || data.taxAmount || 0,
    categoryId: suggestedCategory?.categoryId || data.categoryId || '',
    categoryName: suggestedCategory?.categoryName || data.categoryName || '',
    paymentMethod: data.paymentMethod || 'Credit Card',
    cardType: data.cardType || 'Company',
    driveFileId: file.getId(),
    driveUrl: file.getUrl(),
    ocrText: ocrResult?.rawText || '',
    submittedBy: data.submittedBy || '',
    notes: data.notes || '',
    enterprise: data.enterprise || '',
    organicCertified: data.organicCertified || false,
    grantId: data.grantId || ''
  };

  const saveResult = saveReceipt(receiptData);

  return {
    success: true,
    receiptId: saveResult.receiptId,
    fileId: file.getId(),
    fileUrl: file.getUrl(),
    ocrResult: ocrResult,
    suggestedCategory: suggestedCategory,
    message: 'Receipt uploaded and saved'
  };
}

/**
 * Perform OCR on an image using Google Cloud Vision
 * Note: Requires Cloud Vision API to be enabled in Google Cloud Console
 */
function performOCR(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();
    const base64Image = Utilities.base64Encode(blob.getBytes());

    // Use Google Cloud Vision API
    // Note: This requires the Cloud Vision API to be enabled
    const apiUrl = 'https://vision.googleapis.com/v1/images:annotate';
    const apiKey = PropertiesService.getScriptProperties().getProperty('GOOGLE_CLOUD_VISION_API_KEY');

    if (!apiKey) {
      // Fallback: Use basic text extraction without Cloud Vision
      return extractTextBasic(blob);
    }

    const payload = {
      requests: [{
        image: { content: base64Image },
        features: [{ type: 'TEXT_DETECTION' }]
      }]
    };

    const response = UrlFetchApp.fetch(apiUrl + '?key=' + apiKey, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());

    if (result.responses && result.responses[0] && result.responses[0].textAnnotations) {
      const rawText = result.responses[0].textAnnotations[0].description;
      return parseReceiptText(rawText);
    }

    return { success: false, error: 'No text found in image' };

  } catch (e) {
    Logger.log('OCR Error: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Basic text extraction fallback (limited OCR using Google Docs)
 */
function extractTextBasic(blob) {
  try {
    // Use Google Docs OCR capability
    const resource = {
      title: 'temp_ocr_' + new Date().getTime(),
      mimeType: blob.getContentType()
    };

    const options = {
      ocr: true,
      ocrLanguage: 'en'
    };

    // This is a workaround using Google Docs
    const docFile = Drive.Files.insert(resource, blob, options);
    const doc = DocumentApp.openById(docFile.id);
    const text = doc.getBody().getText();

    // Clean up temp file
    DriveApp.getFileById(docFile.id).setTrashed(true);

    return parseReceiptText(text);

  } catch (e) {
    Logger.log('Basic OCR Error: ' + e.toString());
    return { success: false, error: e.toString(), rawText: '' };
  }
}

/**
 * Parse OCR text to extract receipt data
 */
function parseReceiptText(rawText) {
  const result = {
    success: true,
    rawText: rawText,
    vendor: null,
    date: null,
    amount: null,
    taxAmount: null
  };

  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);

  // Vendor is usually the first non-empty line
  if (lines.length > 0) {
    result.vendor = lines[0];
  }

  // Look for date patterns
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\d{1,2}-\d{1,2}-\d{2,4})/,
    /(\d{4}-\d{2}-\d{2})/,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i
  ];

  for (const pattern of datePatterns) {
    const match = rawText.match(pattern);
    if (match) {
      result.date = match[1];
      break;
    }
  }

  // Look for total amount
  const totalPatterns = [
    /TOTAL[:\s]+\$?([\d,]+\.?\d*)/i,
    /AMOUNT[:\s]+\$?([\d,]+\.?\d*)/i,
    /GRAND\s*TOTAL[:\s]+\$?([\d,]+\.?\d*)/i,
    /BALANCE\s*DUE[:\s]+\$?([\d,]+\.?\d*)/i
  ];

  for (const pattern of totalPatterns) {
    const match = rawText.match(pattern);
    if (match) {
      result.amount = parseFloat(match[1].replace(',', ''));
      break;
    }
  }

  // Look for tax amount
  const taxPatterns = [
    /TAX[:\s]+\$?([\d,]+\.?\d*)/i,
    /SALES\s*TAX[:\s]+\$?([\d,]+\.?\d*)/i
  ];

  for (const pattern of taxPatterns) {
    const match = rawText.match(pattern);
    if (match) {
      result.taxAmount = parseFloat(match[1].replace(',', ''));
      break;
    }
  }

  return result;
}

/**
 * Get all receipts with filtering
 */
function getReceipts(params) {
  params = params || {};
  const sheet = getOrCreateSheet(ACCOUNTING_SHEETS.RECEIPTS, RECEIPT_HEADERS);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: true, data: [], count: 0 };
  }

  const headers = data[0];
  let receipts = data.slice(1).map(row => {
    const receipt = {};
    headers.forEach((header, i) => {
      receipt[header] = row[i];
    });
    return receipt;
  });

  // Apply filters
  if (params.startDate) {
    const startDate = new Date(params.startDate);
    receipts = receipts.filter(r => new Date(r.Date) >= startDate);
  }

  if (params.endDate) {
    const endDate = new Date(params.endDate);
    receipts = receipts.filter(r => new Date(r.Date) <= endDate);
  }

  if (params.categoryId) {
    receipts = receipts.filter(r => r.Category_ID === params.categoryId);
  }

  if (params.vendor) {
    const vendorLower = params.vendor.toLowerCase();
    receipts = receipts.filter(r => r.Vendor.toLowerCase().includes(vendorLower));
  }

  if (params.verified !== undefined) {
    receipts = receipts.filter(r => r.Verified === (params.verified === 'true' || params.verified === true));
  }

  if (params.taxYear) {
    receipts = receipts.filter(r => r.Tax_Year == params.taxYear);
  }

  if (params.enterprise) {
    receipts = receipts.filter(r => r.Enterprise === params.enterprise);
  }

  // Sort by date descending
  receipts.sort((a, b) => new Date(b.Date) - new Date(a.Date));

  return {
    success: true,
    data: receipts,
    count: receipts.length
  };
}

/**
 * Verify a receipt (mark as reviewed by owner/manager)
 */
function verifyReceipt(data) {
  const sheet = getOrCreateSheet(ACCOUNTING_SHEETS.RECEIPTS, RECEIPT_HEADERS);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];

  const receiptIdCol = headers.indexOf('Receipt_ID');
  const verifiedCol = headers.indexOf('Verified');
  const verifiedByCol = headers.indexOf('Verified_By');

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][receiptIdCol] === data.receiptId) {
      sheet.getRange(i + 1, verifiedCol + 1).setValue(true);
      sheet.getRange(i + 1, verifiedByCol + 1).setValue(data.verifiedBy || 'Owner');

      logAuditEvent('Update', 'Receipt', data.receiptId, { verified: false }, { verified: true, verifiedBy: data.verifiedBy });

      return { success: true, message: 'Receipt verified' };
    }
  }

  return { success: false, error: 'Receipt not found' };
}

// ═══════════════════════════════════════════════════════════════════════════
// VENDOR CATEGORY LEARNING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Learn/update vendor to category mapping
 */
function learnVendorCategory(vendor, categoryId, categoryName) {
  const sheet = getOrCreateSheet(ACCOUNTING_SHEETS.VENDOR_CATEGORIES, VENDOR_CATEGORY_HEADERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const vendorPattern = vendor.toLowerCase().trim();
  const patternCol = headers.indexOf('Vendor_Pattern');

  // Check if pattern already exists
  for (let i = 1; i < data.length; i++) {
    if (data[i][patternCol] === vendorPattern) {
      // Update existing entry
      const timesUsedCol = headers.indexOf('Times_Used');
      const lastUpdatedCol = headers.indexOf('Last_Updated');
      const confidenceCol = headers.indexOf('Confidence');

      const timesUsed = (parseInt(data[i][timesUsedCol]) || 0) + 1;
      const newConfidence = Math.min(0.99, 0.7 + (timesUsed * 0.05));

      sheet.getRange(i + 1, timesUsedCol + 1).setValue(timesUsed);
      sheet.getRange(i + 1, confidenceCol + 1).setValue(newConfidence);
      sheet.getRange(i + 1, lastUpdatedCol + 1).setValue(new Date().toISOString());

      return { success: true, action: 'updated' };
    }
  }

  // Add new entry
  const row = [
    vendorPattern,
    categoryId,
    categoryName,
    0.7, // Initial confidence
    1,   // Times used
    new Date().toISOString()
  ];

  sheet.appendRow(row);
  return { success: true, action: 'created' };
}

/**
 * Suggest category based on vendor name
 */
function suggestCategory(vendor) {
  if (!vendor) return null;

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ACCOUNTING_SHEETS.VENDOR_CATEGORIES);
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return null;

  const headers = data[0];
  const vendorLower = vendor.toLowerCase().trim();

  const patternCol = headers.indexOf('Vendor_Pattern');
  const categoryIdCol = headers.indexOf('Category_ID');
  const categoryNameCol = headers.indexOf('Category_Name');
  const confidenceCol = headers.indexOf('Confidence');

  // Look for exact or partial match
  let bestMatch = null;
  let bestScore = 0;

  for (let i = 1; i < data.length; i++) {
    const pattern = data[i][patternCol];

    if (vendorLower === pattern) {
      // Exact match
      return {
        categoryId: data[i][categoryIdCol],
        categoryName: data[i][categoryNameCol],
        confidence: data[i][confidenceCol],
        matchType: 'exact'
      };
    }

    if (vendorLower.includes(pattern) || pattern.includes(vendorLower)) {
      // Partial match - calculate score
      const score = pattern.length / Math.max(vendorLower.length, pattern.length);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          categoryId: data[i][categoryIdCol],
          categoryName: data[i][categoryNameCol],
          confidence: data[i][confidenceCol] * score,
          matchType: 'partial'
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Get expense categories
 */
function getExpenseCategories(params) {
  params = params || {};
  const sheet = getOrCreateSheet(ACCOUNTING_SHEETS.CATEGORIES, CATEGORY_HEADERS);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: true, data: [], count: 0 };
  }

  const headers = data[0];
  let categories = data.slice(1).map(row => {
    return {
      categoryId: row[headers.indexOf('Category_ID')],
      categoryName: row[headers.indexOf('Category_Name')],
      type: row[headers.indexOf('Type')],
      scheduleFLine: row[headers.indexOf('Schedule_F_Line')],
      description: row[headers.indexOf('Description')],
      isActive: row[headers.indexOf('Is_Active')],
      sortOrder: row[headers.indexOf('Sort_Order')]
    };
  });

  // Filter by type if requested
  if (params.type) {
    categories = categories.filter(c => c.type === params.type);
  }

  // Only active
  if (params.activeOnly !== false) {
    categories = categories.filter(c => c.isActive);
  }

  // Sort
  categories.sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    success: true,
    data: categories,
    count: categories.length
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT TRAIL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Log an event to the audit trail
 */
function logAuditEvent(actionType, entityType, entityId, oldValue, newValue, userId, notes) {
  const sheet = getOrCreateSheet(ACCOUNTING_SHEETS.AUDIT_TRAIL, AUDIT_TRAIL_HEADERS);

  const logId = 'LOG-' + Utilities.formatDate(new Date(), 'America/New_York', 'yyyyMMddHHmmss') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

  const row = [
    logId,
    new Date().toISOString(),
    userId || 'System',
    '', // User name - can be filled if available
    actionType,
    entityType,
    entityId,
    oldValue ? JSON.stringify(oldValue) : '',
    newValue ? JSON.stringify(newValue) : '',
    '', // IP address - not available in Apps Script
    notes || ''
  ];

  sheet.appendRow(row);
  return logId;
}

/**
 * Get audit trail with filtering
 */
function getAuditTrail(params) {
  params = params || {};
  const sheet = getOrCreateSheet(ACCOUNTING_SHEETS.AUDIT_TRAIL, AUDIT_TRAIL_HEADERS);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: true, data: [], count: 0 };
  }

  const headers = data[0];
  let logs = data.slice(1).map(row => {
    const log = {};
    headers.forEach((header, i) => {
      log[header] = row[i];
    });
    return log;
  });

  // Apply filters
  if (params.entityType) {
    logs = logs.filter(l => l.Entity_Type === params.entityType);
  }

  if (params.entityId) {
    logs = logs.filter(l => l.Entity_ID === params.entityId);
  }

  if (params.actionType) {
    logs = logs.filter(l => l.Action_Type === params.actionType);
  }

  if (params.startDate) {
    const startDate = new Date(params.startDate);
    logs = logs.filter(l => new Date(l.Timestamp) >= startDate);
  }

  // Sort by timestamp descending
  logs.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));

  // Limit results
  const limit = parseInt(params.limit) || 100;
  logs = logs.slice(0, limit);

  return {
    success: true,
    data: logs,
    count: logs.length
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FINANCIAL REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate Profit & Loss Statement
 */
function generateProfitLossStatement(params) {
  params = params || {};
  const startDate = params.startDate ? new Date(params.startDate) : new Date(new Date().getFullYear(), 0, 1);
  const endDate = params.endDate ? new Date(params.endDate) : new Date();

  // Get all receipts in date range
  const receipts = getReceipts({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  }).data;

  // Get categories
  const categories = getExpenseCategories().data;

  // Group by category
  const income = {};
  const expenses = {};

  categories.forEach(cat => {
    if (cat.type === 'Income') {
      income[cat.categoryId] = { name: cat.categoryName, scheduleFLine: cat.scheduleFLine, total: 0 };
    } else {
      expenses[cat.categoryId] = { name: cat.categoryName, scheduleFLine: cat.scheduleFLine, total: 0 };
    }
  });

  // Sum receipts by category
  receipts.forEach(receipt => {
    const catId = receipt.Category_ID;
    const amount = parseFloat(receipt.Amount) || 0;

    if (income[catId]) {
      income[catId].total += amount;
    } else if (expenses[catId]) {
      expenses[catId].total += amount;
    }
  });

  // Calculate totals
  const totalIncome = Object.values(income).reduce((sum, cat) => sum + cat.total, 0);
  const totalExpenses = Object.values(expenses).reduce((sum, cat) => sum + cat.total, 0);
  const netProfit = totalIncome - totalExpenses;

  return {
    success: true,
    report: {
      title: 'Profit & Loss Statement',
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      },
      income: Object.entries(income)
        .filter(([id, cat]) => cat.total > 0)
        .map(([id, cat]) => ({ categoryId: id, ...cat })),
      expenses: Object.entries(expenses)
        .filter(([id, cat]) => cat.total > 0)
        .map(([id, cat]) => ({ categoryId: id, ...cat })),
      summary: {
        totalIncome: totalIncome,
        totalExpenses: totalExpenses,
        netProfit: netProfit,
        profitMargin: totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(2) + '%' : '0%'
      },
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Generate expense report by Schedule F line
 */
function generateScheduleFReport(params) {
  params = params || {};
  const taxYear = params.taxYear || new Date().getFullYear();

  // Get all receipts for the tax year
  const receipts = getReceipts({ taxYear: taxYear }).data;
  const categories = getExpenseCategories().data;

  // Group by Schedule F line
  const lineItems = {};

  categories.forEach(cat => {
    const line = cat.scheduleFLine;
    if (!lineItems[line]) {
      lineItems[line] = {
        line: line,
        categories: [],
        total: 0
      };
    }
    lineItems[line].categories.push(cat.categoryId);
  });

  // Sum by line
  receipts.forEach(receipt => {
    const cat = categories.find(c => c.categoryId === receipt.Category_ID);
    if (cat) {
      const line = cat.scheduleFLine;
      if (lineItems[line]) {
        lineItems[line].total += parseFloat(receipt.Amount) || 0;
      }
    }
  });

  return {
    success: true,
    report: {
      title: 'Schedule F Summary',
      taxYear: taxYear,
      lines: Object.values(lineItems).filter(l => l.total > 0).sort((a, b) => {
        // Sort by line number
        const aNum = parseInt(a.line.replace(/\D/g, '')) || 99;
        const bNum = parseInt(b.line.replace(/\D/g, '')) || 99;
        return aNum - bNum;
      }),
      generatedAt: new Date().toISOString()
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// GRANT TRACKING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Add or update a grant
 */
function saveGrant(data) {
  const sheet = getOrCreateSheet(ACCOUNTING_SHEETS.GRANTS, GRANT_HEADERS);
  const now = new Date().toISOString();

  // Generate grant ID if new
  const grantId = data.grantId || 'GRANT-' + Utilities.formatDate(new Date(), 'America/New_York', 'yyyyMMdd') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

  // Check if updating existing
  if (data.grantId) {
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const grantIdCol = headers.indexOf('Grant_ID');

    for (let i = 1; i < allData.length; i++) {
      if (allData[i][grantIdCol] === data.grantId) {
        // Update existing row
        const row = [
          data.grantId,
          data.grantName || allData[i][1],
          data.fundingAgency || allData[i][2],
          parseFloat(data.awardAmount) || allData[i][3],
          data.startDate || allData[i][4],
          data.endDate || allData[i][5],
          data.reportingFrequency || allData[i][6],
          data.nextReportDue || allData[i][7],
          data.status || allData[i][8],
          data.contactName || allData[i][9],
          data.contactEmail || allData[i][10],
          data.notes || allData[i][11],
          data.driveFolderId || allData[i][12]
        ];

        sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);

        logAuditEvent('Update', 'Grant', data.grantId, null, data);

        return { success: true, grantId: data.grantId, message: 'Grant updated' };
      }
    }
  }

  // Create new grant
  const row = [
    grantId,
    data.grantName || '',
    data.fundingAgency || '',
    parseFloat(data.awardAmount) || 0,
    data.startDate || '',
    data.endDate || '',
    data.reportingFrequency || 'Quarterly',
    data.nextReportDue || '',
    data.status || 'Active',
    data.contactName || '',
    data.contactEmail || '',
    data.notes || '',
    data.driveFolderId || ''
  ];

  sheet.appendRow(row);

  logAuditEvent('Create', 'Grant', grantId, null, data);

  return { success: true, grantId: grantId, message: 'Grant created' };
}

/**
 * Get grants with filtering
 */
function getGrants(params) {
  params = params || {};
  const sheet = getOrCreateSheet(ACCOUNTING_SHEETS.GRANTS, GRANT_HEADERS);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: true, data: [], count: 0 };
  }

  const headers = data[0];
  let grants = data.slice(1).map(row => {
    const grant = {};
    headers.forEach((header, i) => {
      grant[header] = row[i];
    });
    return grant;
  });

  // Filter by status
  if (params.status) {
    grants = grants.filter(g => g.Status === params.status);
  }

  return {
    success: true,
    data: grants,
    count: grants.length
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ADDITIONAL GETTER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get accountant emails with filtering
 */
function getAccountantEmails(params) {
  params = params || {};
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ACCOUNTING_SHEETS.ACCOUNTANT_EMAILS);

  if (!sheet) {
    return { success: true, data: [], count: 0, message: 'Sheet not initialized. Run initializeAccountingModule first.' };
  }

  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: true, data: [], count: 0 };
  }

  const headers = data[0];
  let emails = data.slice(1).map(row => {
    const email = {};
    headers.forEach((header, i) => {
      email[header] = row[i];
    });
    return email;
  });

  // Apply filters
  if (params.fromEmail) {
    emails = emails.filter(e => e.From_Email === params.fromEmail);
  }

  if (params.startDate) {
    const startDate = new Date(params.startDate);
    emails = emails.filter(e => new Date(e.Date) >= startDate);
  }

  // Sort by date descending
  emails.sort((a, b) => new Date(b.Date) - new Date(a.Date));

  // Limit results
  const limit = parseInt(params.limit) || 100;
  emails = emails.slice(0, limit);

  return {
    success: true,
    data: emails,
    count: emails.length
  };
}

/**
 * Get accountant documents with filtering
 */
function getAccountantDocs(params) {
  params = params || {};
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ACCOUNTING_SHEETS.ACCOUNTANT_DOCS);

  if (!sheet) {
    return { success: true, data: [], count: 0, message: 'Sheet not initialized. Run initializeAccountingModule first.' };
  }

  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: true, data: [], count: 0 };
  }

  const headers = data[0];
  let docs = data.slice(1).map(row => {
    const doc = {};
    headers.forEach((header, i) => {
      doc[header] = row[i];
    });
    return doc;
  });

  // Filter by status
  if (params.status) {
    docs = docs.filter(d => d.Status === params.status);
  }

  if (params.docType) {
    docs = docs.filter(d => d.Document_Type === params.docType);
  }

  // Sort by date descending
  docs.sort((a, b) => new Date(b.Received_Date) - new Date(a.Received_Date));

  return {
    success: true,
    data: docs,
    count: docs.length
  };
}

/**
 * Get vendor-to-category mappings
 */
function getVendorCategories(params) {
  params = params || {};
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ACCOUNTING_SHEETS.VENDOR_CATEGORIES);

  if (!sheet) {
    return { success: true, data: [], count: 0, message: 'Sheet not initialized.' };
  }

  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: true, data: [], count: 0 };
  }

  const headers = data[0];
  let mappings = data.slice(1).map(row => {
    const mapping = {};
    headers.forEach((header, i) => {
      mapping[header] = row[i];
    });
    return mapping;
  });

  // Sort by times used descending
  mappings.sort((a, b) => (b.Times_Used || 0) - (a.Times_Used || 0));

  return {
    success: true,
    data: mappings,
    count: mappings.length
  };
}

/**
 * Add a new expense category
 */
function addExpenseCategory(data) {
  if (!data.categoryName) {
    return { success: false, error: 'Category name is required' };
  }

  const sheet = getOrCreateSheet(ACCOUNTING_SHEETS.CATEGORIES, CATEGORY_HEADERS);

  // Generate category ID
  const type = data.type || 'Expense';
  const prefix = type === 'Income' ? 'INC' : 'EXP';

  // Find next available number
  const existing = sheet.getDataRange().getValues();
  let maxNum = 0;
  existing.slice(1).forEach(row => {
    const id = row[0] || '';
    if (id.startsWith(prefix + '-')) {
      const num = parseInt(id.replace(prefix + '-', ''));
      if (num > maxNum) maxNum = num;
    }
  });

  const categoryId = prefix + '-' + String(maxNum + 1).padStart(3, '0');

  const row = [
    categoryId,
    data.categoryName,
    type,
    data.scheduleFLine || 'Line 22',
    data.description || '',
    true,
    maxNum + 1
  ];

  sheet.appendRow(row);

  logAuditEvent('Create', 'Category', categoryId, null, data);

  return {
    success: true,
    categoryId: categoryId,
    message: 'Category created'
  };
}

/**
 * Update an existing receipt
 */
function updateReceipt(data) {
  if (!data.receiptId) {
    return { success: false, error: 'Receipt ID is required' };
  }

  const sheet = getOrCreateSheet(ACCOUNTING_SHEETS.RECEIPTS, RECEIPT_HEADERS);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const receiptIdCol = headers.indexOf('Receipt_ID');

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][receiptIdCol] === data.receiptId) {
      const oldData = {};
      headers.forEach((h, idx) => oldData[h] = allData[i][idx]);

      // Update fields that are provided
      Object.keys(data).forEach(key => {
        const colIndex = headers.indexOf(key);
        if (colIndex >= 0 && key !== 'receiptId') {
          sheet.getRange(i + 1, colIndex + 1).setValue(data[key]);
        }
      });

      logAuditEvent('Update', 'Receipt', data.receiptId, oldData, data);

      return { success: true, message: 'Receipt updated' };
    }
  }

  return { success: false, error: 'Receipt not found' };
}

/**
 * Delete a receipt
 */
function deleteReceipt(data) {
  if (!data.receiptId) {
    return { success: false, error: 'Receipt ID is required' };
  }

  const sheet = getOrCreateSheet(ACCOUNTING_SHEETS.RECEIPTS, RECEIPT_HEADERS);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const receiptIdCol = headers.indexOf('Receipt_ID');

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][receiptIdCol] === data.receiptId) {
      const oldData = {};
      headers.forEach((h, idx) => oldData[h] = allData[i][idx]);

      sheet.deleteRow(i + 1);

      logAuditEvent('Delete', 'Receipt', data.receiptId, oldData, null);

      return { success: true, message: 'Receipt deleted' };
    }
  }

  return { success: false, error: 'Receipt not found' };
}

/**
 * Link a receipt to a grant for expenditure tracking
 */
function linkReceiptToGrant(data) {
  if (!data.receiptId || !data.grantId) {
    return { success: false, error: 'Receipt ID and Grant ID are required' };
  }

  // Update the receipt with grant ID
  const updateResult = updateReceipt({ receiptId: data.receiptId, Grant_ID: data.grantId });
  if (!updateResult.success) {
    return updateResult;
  }

  // Get receipt details
  const receipts = getReceipts({ receiptId: data.receiptId }).data;
  if (receipts.length === 0) {
    return { success: false, error: 'Receipt not found after update' };
  }
  const receipt = receipts[0];

  // Create grant expenditure record
  const expSheet = getOrCreateSheet(ACCOUNTING_SHEETS.GRANT_EXPENDITURES, GRANT_EXPENDITURE_HEADERS);

  const expenditureId = 'GEXP-' + Utilities.formatDate(new Date(), 'America/New_York', 'yyyyMMdd-HHmmss') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

  const row = [
    expenditureId,
    data.grantId,
    data.receiptId,
    receipt.Amount || data.amount || 0,
    receipt.Category_Name || '',
    receipt.Date || new Date().toISOString(),
    data.description || receipt.Notes || '',
    data.approvedBy || '',
    data.notes || ''
  ];

  expSheet.appendRow(row);

  logAuditEvent('Create', 'GrantExpenditure', expenditureId, null, { receiptId: data.receiptId, grantId: data.grantId });

  return {
    success: true,
    expenditureId: expenditureId,
    message: 'Receipt linked to grant'
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// LOAN READINESS REPORTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate Balance Sheet for loan applications
 * Required by: Farm Credit, FSA, USDA
 */
function generateBalanceSheet(params) {
  params = params || {};
  const asOfDate = params.asOfDate ? new Date(params.asOfDate) : new Date();

  // Get fixed assets from FIXED_ASSETS sheet
  const assetsSheet = getOrCreateSheet(ACCOUNTING_SHEETS.FIXED_ASSETS, FIXED_ASSET_HEADERS);
  const assetsData = assetsSheet.getDataRange().getValues();

  // Current Assets (would come from other sources - Plaid, inventory, etc.)
  const currentAssets = {
    cash: parseFloat(params.cashOnHand) || 0,
    accountsReceivable: parseFloat(params.accountsReceivable) || 0,
    inventory: parseFloat(params.inventory) || 0,
    prepaidExpenses: parseFloat(params.prepaidExpenses) || 0,
    growingCrops: parseFloat(params.growingCrops) || 0
  };

  // Fixed Assets from sheet
  const fixedAssets = [];
  if (assetsData.length > 1) {
    const headers = assetsData[0];
    assetsData.slice(1).forEach(row => {
      if (row[headers.indexOf('Status')] === 'Active') {
        fixedAssets.push({
          name: row[headers.indexOf('Asset_Name')],
          category: row[headers.indexOf('Category')],
          purchasePrice: parseFloat(row[headers.indexOf('Purchase_Price')]) || 0,
          currentValue: parseFloat(row[headers.indexOf('Current_Value')]) || 0,
          accumulatedDepreciation: parseFloat(row[headers.indexOf('Accumulated_Depreciation')]) || 0
        });
      }
    });
  }

  // Calculate totals
  const totalCurrentAssets = Object.values(currentAssets).reduce((a, b) => a + b, 0);
  const totalFixedAssets = fixedAssets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalAssets = totalCurrentAssets + totalFixedAssets;

  // Liabilities (would integrate with debt tracking)
  const currentLiabilities = {
    accountsPayable: parseFloat(params.accountsPayable) || 0,
    shortTermDebt: parseFloat(params.shortTermDebt) || 0,
    accruedExpenses: parseFloat(params.accruedExpenses) || 0
  };

  const longTermLiabilities = {
    mortgages: parseFloat(params.mortgages) || 0,
    equipmentLoans: parseFloat(params.equipmentLoans) || 0,
    otherLongTermDebt: parseFloat(params.otherLongTermDebt) || 0
  };

  const totalCurrentLiabilities = Object.values(currentLiabilities).reduce((a, b) => a + b, 0);
  const totalLongTermLiabilities = Object.values(longTermLiabilities).reduce((a, b) => a + b, 0);
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

  // Owner's Equity
  const ownersEquity = totalAssets - totalLiabilities;

  // Key Ratios for lenders
  const currentRatio = totalCurrentLiabilities > 0 ? totalCurrentAssets / totalCurrentLiabilities : 0;
  const debtToAssetRatio = totalAssets > 0 ? totalLiabilities / totalAssets : 0;
  const workingCapital = totalCurrentAssets - totalCurrentLiabilities;

  return {
    success: true,
    report: {
      title: 'Balance Sheet',
      asOfDate: asOfDate.toISOString().split('T')[0],
      farmName: 'Tiny Seed Farm LLC',
      ein: '81-5299411',

      assets: {
        current: currentAssets,
        totalCurrent: totalCurrentAssets,
        fixed: fixedAssets,
        totalFixed: totalFixedAssets,
        totalAssets: totalAssets
      },

      liabilities: {
        current: currentLiabilities,
        totalCurrent: totalCurrentLiabilities,
        longTerm: longTermLiabilities,
        totalLongTerm: totalLongTermLiabilities,
        totalLiabilities: totalLiabilities
      },

      ownersEquity: ownersEquity,

      ratios: {
        currentRatio: currentRatio.toFixed(2),
        debtToAssetRatio: (debtToAssetRatio * 100).toFixed(1) + '%',
        workingCapital: workingCapital
      },

      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Generate Cash Flow Statement / Projection
 * Required by: Farm Credit, FSA, USDA
 */
function generateCashFlowStatement(params) {
  params = params || {};
  const startDate = params.startDate ? new Date(params.startDate) : new Date(new Date().getFullYear(), 0, 1);
  const endDate = params.endDate ? new Date(params.endDate) : new Date();
  const projectionMonths = parseInt(params.projectionMonths) || 12;

  // Get receipts for operating activities
  const receipts = getReceipts({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  }).data;

  // Get categories
  const categories = getExpenseCategories().data;

  // Calculate operating cash flows from actual data
  let operatingInflows = 0;
  let operatingOutflows = 0;

  receipts.forEach(receipt => {
    const cat = categories.find(c => c.categoryId === receipt.Category_ID);
    const amount = parseFloat(receipt.Amount) || 0;

    if (cat && cat.type === 'Income') {
      operatingInflows += amount;
    } else {
      operatingOutflows += amount;
    }
  });

  // Monthly breakdown
  const monthlyData = {};
  receipts.forEach(receipt => {
    const date = new Date(receipt.Date);
    const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { inflows: 0, outflows: 0 };
    }

    const cat = categories.find(c => c.categoryId === receipt.Category_ID);
    const amount = parseFloat(receipt.Amount) || 0;

    if (cat && cat.type === 'Income') {
      monthlyData[monthKey].inflows += amount;
    } else {
      monthlyData[monthKey].outflows += amount;
    }
  });

  // Calculate averages for projection
  const monthCount = Object.keys(monthlyData).length || 1;
  const avgMonthlyInflow = operatingInflows / monthCount;
  const avgMonthlyOutflow = operatingOutflows / monthCount;

  // Generate projection
  const projection = [];
  let runningBalance = parseFloat(params.beginningCash) || 0;

  for (let i = 0; i < projectionMonths; i++) {
    const projDate = new Date();
    projDate.setMonth(projDate.getMonth() + i);
    const monthName = projDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });

    // Apply seasonal factors for farm (rough estimates)
    let seasonalFactor = 1.0;
    const month = projDate.getMonth();
    if (month >= 5 && month <= 9) { // Jun-Oct peak season
      seasonalFactor = 1.5;
    } else if (month >= 0 && month <= 2) { // Jan-Mar slow
      seasonalFactor = 0.5;
    }

    const projectedInflow = avgMonthlyInflow * seasonalFactor;
    const projectedOutflow = avgMonthlyOutflow;
    const netCashFlow = projectedInflow - projectedOutflow;
    runningBalance += netCashFlow;

    projection.push({
      month: monthName,
      inflows: Math.round(projectedInflow),
      outflows: Math.round(projectedOutflow),
      netCashFlow: Math.round(netCashFlow),
      endingBalance: Math.round(runningBalance)
    });
  }

  return {
    success: true,
    report: {
      title: 'Cash Flow Statement',
      farmName: 'Tiny Seed Farm LLC',
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      },

      operatingActivities: {
        cashFromSales: operatingInflows,
        cashPaidForExpenses: operatingOutflows,
        netOperatingCashFlow: operatingInflows - operatingOutflows
      },

      investingActivities: {
        purchaseOfEquipment: parseFloat(params.equipmentPurchases) || 0,
        saleOfAssets: parseFloat(params.assetSales) || 0,
        netInvestingCashFlow: (parseFloat(params.assetSales) || 0) - (parseFloat(params.equipmentPurchases) || 0)
      },

      financingActivities: {
        loanProceeds: parseFloat(params.loanProceeds) || 0,
        loanPayments: parseFloat(params.loanPayments) || 0,
        ownerContributions: parseFloat(params.ownerContributions) || 0,
        ownerDraws: parseFloat(params.ownerDraws) || 0,
        netFinancingCashFlow: (parseFloat(params.loanProceeds) || 0) - (parseFloat(params.loanPayments) || 0) +
                              (parseFloat(params.ownerContributions) || 0) - (parseFloat(params.ownerDraws) || 0)
      },

      monthlyBreakdown: Object.entries(monthlyData).map(([month, data]) => ({
        month: month,
        ...data,
        netCashFlow: data.inflows - data.outflows
      })),

      projection: projection,

      summary: {
        beginningCash: parseFloat(params.beginningCash) || 0,
        totalInflows: operatingInflows,
        totalOutflows: operatingOutflows,
        netChange: operatingInflows - operatingOutflows,
        endingCash: (parseFloat(params.beginningCash) || 0) + (operatingInflows - operatingOutflows)
      },

      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Generate complete Loan Application Package
 * Bundles all required documents for Farm Credit / FSA / USDA
 */
function generateLoanPackage(params) {
  params = params || {};
  const loanType = params.loanType || 'FSA'; // FSA, FarmCredit, USDA
  const taxYear = params.taxYear || new Date().getFullYear() - 1;

  // Generate all required reports
  const balanceSheet = generateBalanceSheet(params);
  const cashFlow = generateCashFlowStatement(params);
  const profitLoss = generateProfitLossStatement({
    startDate: new Date(taxYear, 0, 1).toISOString(),
    endDate: new Date(taxYear, 11, 31).toISOString()
  });
  const scheduleF = generateScheduleFReport({ taxYear: taxYear });

  // Farm information
  const farmInfo = {
    legalName: 'Tiny Seed Farm LLC',
    ein: '81-5299411',
    entityType: 'Limited Liability Company',
    stateOfFormation: 'Pennsylvania',
    formationDate: '2017-02-07',
    address: '257 Zeigler Road, Rochester, PA 15074',
    county: 'Beaver County',
    owner: 'Todd R Wilson',
    organicCertifier: 'OEFFA Ohio',
    certifiedAcreage: 5.6
  };

  // Loan-specific requirements
  const loanRequirements = {
    FSA: {
      name: 'Farm Service Agency',
      requiredDocs: [
        'Balance Sheet',
        'Income Statement (P&L)',
        'Cash Flow Projection',
        '3 Years Tax Returns (Schedule F)',
        'Farm Business Plan',
        'Proof of Farm Experience (3+ years)',
        'Legal Documents (LLC formation)'
      ],
      notes: [
        'Must demonstrate inability to obtain credit elsewhere',
        'No delinquency on federal debt',
        'Complete FSA-2001 Application Form'
      ]
    },
    FarmCredit: {
      name: 'Farm Credit',
      requiredDocs: [
        'Balance Sheet',
        'Income Statement',
        'Cash Flow Projection',
        '3 Years Tax Returns',
        'Credit Report Authorization',
        'Proof of Collateral'
      ],
      notes: [
        'Minimum credit score: 640-680',
        'Send updated financial statements annually',
        'Include household expenses in cash flow'
      ]
    },
    USDA: {
      name: 'USDA Programs',
      requiredDocs: [
        'Balance Sheet',
        'Income Statement',
        'Cash Flow Statement',
        'Tax Returns',
        'Conservation Plan (if applicable)',
        'Organic Certification (if applicable)'
      ],
      notes: [
        'Check specific program requirements',
        'May require environmental review',
        'Organic certification can help qualification'
      ]
    }
  };

  const selectedLoan = loanRequirements[loanType] || loanRequirements.FSA;

  return {
    success: true,
    package: {
      title: `Loan Application Package - ${selectedLoan.name}`,
      generatedAt: new Date().toISOString(),
      loanType: loanType,

      farmInfo: farmInfo,

      requirements: selectedLoan,

      documents: {
        balanceSheet: balanceSheet.report,
        profitLoss: profitLoss.report,
        cashFlow: cashFlow.report,
        scheduleF: scheduleF.report
      },

      checklist: selectedLoan.requiredDocs.map(doc => ({
        document: doc,
        status: doc.includes('Balance') || doc.includes('Income') || doc.includes('Cash Flow') || doc.includes('Schedule F')
          ? 'Generated'
          : 'Manual Required'
      })),

      nextSteps: [
        'Review all generated documents for accuracy',
        'Gather 3 years of tax returns',
        'Complete farm business plan',
        'Contact local ' + selectedLoan.name + ' office',
        'Schedule appointment with loan officer'
      ]
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTERPRISE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate Enterprise Analysis Report - P&L by crop/product line
 * Shows profitability of each enterprise (e.g., Tomatoes, Salad Mix, Flowers)
 */
function generateEnterpriseAnalysis(params) {
  params = params || {};
  const startDate = params.startDate ? new Date(params.startDate) : new Date(new Date().getFullYear(), 0, 1);
  const endDate = params.endDate ? new Date(params.endDate) : new Date();

  // Get all receipts with enterprise tags
  const receipts = getReceipts({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  }).data;

  // Get categories
  const categories = getExpenseCategories().data;

  // Group by enterprise
  const enterprises = {};
  const unallocated = { income: 0, expenses: 0, receipts: [] };

  receipts.forEach(receipt => {
    const enterprise = receipt.Enterprise || 'Unallocated';
    const cat = categories.find(c => c.categoryId === receipt.Category_ID);
    const amount = parseFloat(receipt.Amount) || 0;
    const isIncome = cat && cat.type === 'Income';

    if (enterprise === 'Unallocated' || !enterprise) {
      if (isIncome) {
        unallocated.income += amount;
      } else {
        unallocated.expenses += amount;
      }
      unallocated.receipts.push({
        id: receipt.Receipt_ID,
        date: receipt.Date,
        vendor: receipt.Vendor,
        amount: amount,
        category: receipt.Category_Name,
        type: isIncome ? 'Income' : 'Expense'
      });
    } else {
      if (!enterprises[enterprise]) {
        enterprises[enterprise] = {
          name: enterprise,
          income: 0,
          expenses: 0,
          categories: {},
          receipts: []
        };
      }

      if (isIncome) {
        enterprises[enterprise].income += amount;
      } else {
        enterprises[enterprise].expenses += amount;
      }

      // Track by category
      const catName = receipt.Category_Name || 'Other';
      if (!enterprises[enterprise].categories[catName]) {
        enterprises[enterprise].categories[catName] = 0;
      }
      enterprises[enterprise].categories[catName] += amount;

      enterprises[enterprise].receipts.push({
        id: receipt.Receipt_ID,
        date: receipt.Date,
        vendor: receipt.Vendor,
        amount: amount,
        category: catName,
        type: isIncome ? 'Income' : 'Expense'
      });
    }
  });

  // Calculate profitability for each enterprise
  const enterpriseList = Object.values(enterprises).map(e => ({
    name: e.name,
    totalIncome: e.income,
    totalExpenses: e.expenses,
    netProfit: e.income - e.expenses,
    profitMargin: e.income > 0 ? ((e.income - e.expenses) / e.income * 100).toFixed(1) + '%' : 'N/A',
    expenseBreakdown: Object.entries(e.categories)
      .filter(([cat, amt]) => amt > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => ({ category: cat, amount: amt })),
    receiptCount: e.receipts.length
  }));

  // Sort by net profit
  enterpriseList.sort((a, b) => b.netProfit - a.netProfit);

  // Calculate totals
  const totalIncome = enterpriseList.reduce((sum, e) => sum + e.totalIncome, 0) + unallocated.income;
  const totalExpenses = enterpriseList.reduce((sum, e) => sum + e.totalExpenses, 0) + unallocated.expenses;
  const totalNetProfit = totalIncome - totalExpenses;

  return {
    success: true,
    report: {
      title: 'Enterprise Analysis Report',
      farmName: 'Tiny Seed Farm LLC',
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      },

      enterprises: enterpriseList,

      unallocated: {
        income: unallocated.income,
        expenses: unallocated.expenses,
        netProfit: unallocated.income - unallocated.expenses,
        receiptCount: unallocated.receipts.length,
        note: 'These receipts have no enterprise tag. Consider allocating them for better tracking.'
      },

      summary: {
        totalEnterprises: enterpriseList.length,
        totalIncome: totalIncome,
        totalExpenses: totalExpenses,
        totalNetProfit: totalNetProfit,
        overallMargin: totalIncome > 0 ? ((totalNetProfit / totalIncome) * 100).toFixed(1) + '%' : 'N/A',
        mostProfitable: enterpriseList.length > 0 ? enterpriseList[0].name : 'None',
        leastProfitable: enterpriseList.length > 0 ? enterpriseList[enterpriseList.length - 1].name : 'None'
      },

      recommendations: generateEnterpriseRecommendations(enterpriseList, unallocated),

      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Generate recommendations based on enterprise analysis
 */
function generateEnterpriseRecommendations(enterprises, unallocated) {
  const recommendations = [];

  // Check for unallocated expenses
  if (unallocated.expenses > 0) {
    recommendations.push({
      type: 'data_quality',
      priority: 'HIGH',
      message: `$${unallocated.expenses.toFixed(2)} in expenses are not allocated to any enterprise. Tag receipts with enterprise names for better analysis.`
    });
  }

  // Check for unprofitable enterprises
  const unprofitable = enterprises.filter(e => e.netProfit < 0);
  unprofitable.forEach(e => {
    recommendations.push({
      type: 'profitability',
      priority: 'HIGH',
      message: `${e.name} is showing a loss of $${Math.abs(e.netProfit).toFixed(2)}. Review expenses or consider pricing adjustments.`
    });
  });

  // Check for low margin enterprises
  const lowMargin = enterprises.filter(e => {
    const margin = e.totalIncome > 0 ? (e.netProfit / e.totalIncome) * 100 : 0;
    return margin > 0 && margin < 20;
  });
  lowMargin.forEach(e => {
    recommendations.push({
      type: 'profitability',
      priority: 'MEDIUM',
      message: `${e.name} has a low profit margin of ${e.profitMargin}. Consider ways to reduce costs or increase prices.`
    });
  });

  // Suggest enterprise tracking if none exist
  if (enterprises.length === 0 && (unallocated.income > 0 || unallocated.expenses > 0)) {
    recommendations.push({
      type: 'data_quality',
      priority: 'HIGH',
      message: 'No enterprises are being tracked. Add enterprise tags to receipts (e.g., "Tomatoes", "Flowers", "CSA") to analyze profitability by product line.'
    });
  }

  // Suggest diversification if one enterprise dominates
  if (enterprises.length > 0) {
    const totalIncome = enterprises.reduce((sum, e) => sum + e.totalIncome, 0);
    const topEnterprise = enterprises[0];
    if (topEnterprise.totalIncome / totalIncome > 0.7) {
      recommendations.push({
        type: 'diversification',
        priority: 'LOW',
        message: `${topEnterprise.name} accounts for over 70% of income. Consider diversifying to reduce risk.`
      });
    }
  }

  return recommendations;
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNTANT TASK MANAGEMENT - Accountability System
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse imported emails and extract action items as tasks
 */
function parseEmailsForTasks() {
  const emails = getAccountantEmails({ limit: 200 }).data;
  const existingTasks = getAccountantTasks({}).data;
  const existingSourceIds = existingTasks.map(t => t.Source_ID);

  const tasksCreated = [];
  const now = new Date().toISOString();

  // Define task extraction rules
  const taskRules = [
    {
      pattern: /bank feed|quickbooks|reconnect/i,
      category: 'QUICKBOOKS',
      title: 'Reconnect QuickBooks Bank Feed',
      description: 'Reconnect PNC bank accounts to QuickBooks bank feed',
      priority: 'HIGH'
    },
    {
      pattern: /complete your.*organizer|tax organizer/i,
      category: 'TAX_PREP',
      title: 'Complete 2024 Tax Organizer',
      description: 'Complete the tax organizer for 2024 tax return preparation',
      priority: 'HIGH'
    },
    {
      pattern: /sign your.*documents|review and sign/i,
      category: 'DOCUMENTS',
      title: 'Sign Tax Documents',
      description: 'Review and sign required tax documents',
      priority: 'HIGH'
    },
    {
      pattern: /open invoices|invoice.*for/i,
      category: 'BILLING',
      title: 'Pay DGPerry Invoice',
      description: 'Review and pay open invoice from DGPerry',
      priority: 'MEDIUM'
    },
    {
      pattern: /tax return forms|sign.*tax return/i,
      category: 'TAX_FILING',
      title: 'Sign Tax Return Forms',
      description: 'Review and sign completed tax return forms',
      priority: 'HIGH'
    },
    {
      pattern: /extremely important|urgent|action required/i,
      category: 'URGENT',
      title: 'Urgent: Review Required',
      description: 'Review urgent communication from accountant',
      priority: 'CRITICAL'
    },
    {
      pattern: /year.?end items/i,
      category: 'YEAR_END',
      title: 'Provide Year-End Items',
      description: 'Provide requested year-end documentation',
      priority: 'HIGH'
    }
  ];

  // Process each email
  emails.forEach(email => {
    const subject = email.Subject || '';
    const snippet = email.Snippet || '';
    const messageId = email.Message_ID;
    const emailDate = email.Date;

    // Skip if already processed
    if (existingSourceIds.includes(messageId)) {
      return;
    }

    // Check against rules
    for (const rule of taskRules) {
      if (rule.pattern.test(subject) || rule.pattern.test(snippet)) {
        // Create task
        const taskId = 'TASK-' + Utilities.formatDate(new Date(), 'America/New_York', 'yyyyMMdd-HHmmss') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

        const task = {
          Task_ID: taskId,
          Title: rule.title + (email.From_Name ? ` (from ${email.From_Name})` : ''),
          Description: rule.description + '\n\nEmail: ' + subject,
          Category: rule.category,
          Priority: rule.priority,
          Status: 'PENDING',
          Source_Type: 'EMAIL',
          Source_ID: messageId,
          Source_Date: emailDate,
          Due_Date: calculateDueDate(rule.priority, emailDate),
          Assigned_To: 'Owner',
          Created_At: now,
          Updated_At: now,
          Completed_At: '',
          Completed_By: '',
          Notes: 'Auto-extracted from email',
          Recurring: false,
          Recurrence_Pattern: ''
        };

        // Save task
        const sheet = getOrCreateSheet(ACCOUNTING_SHEETS.ACCOUNTANT_TASKS, ACCOUNTANT_TASK_HEADERS);
        sheet.appendRow(Object.values(task));

        tasksCreated.push(task);
        existingSourceIds.push(messageId); // Prevent duplicates in same run
        break; // Only one task per email
      }
    }
  });

  return {
    success: true,
    tasksCreated: tasksCreated.length,
    tasks: tasksCreated
  };
}

/**
 * Calculate due date based on priority
 */
function calculateDueDate(priority, sourceDate) {
  const date = sourceDate ? new Date(sourceDate) : new Date();
  const now = new Date();

  // Use current date if source date is in the past
  const baseDate = date > now ? date : now;

  switch (priority) {
    case 'CRITICAL':
      baseDate.setDate(baseDate.getDate() + 1); // 1 day
      break;
    case 'HIGH':
      baseDate.setDate(baseDate.getDate() + 7); // 1 week
      break;
    case 'MEDIUM':
      baseDate.setDate(baseDate.getDate() + 14); // 2 weeks
      break;
    case 'LOW':
      baseDate.setDate(baseDate.getDate() + 30); // 1 month
      break;
    default:
      baseDate.setDate(baseDate.getDate() + 7);
  }

  return baseDate.toISOString().split('T')[0];
}

/**
 * Get accountant tasks with filtering
 */
function getAccountantTasks(params) {
  params = params || {};
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ACCOUNTING_SHEETS.ACCOUNTANT_TASKS);

  if (!sheet) {
    return { success: true, data: [], count: 0, message: 'Run parseEmailsForTasks first to create tasks.' };
  }

  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: true, data: [], count: 0 };
  }

  const headers = data[0];
  let tasks = data.slice(1).map(row => {
    const task = {};
    headers.forEach((header, i) => {
      task[header] = row[i];
    });
    return task;
  }).filter(t => t.Task_ID); // Filter out empty rows

  // Apply filters
  if (params.status) {
    tasks = tasks.filter(t => t.Status === params.status);
  }

  if (params.category) {
    tasks = tasks.filter(t => t.Category === params.category);
  }

  if (params.priority) {
    tasks = tasks.filter(t => t.Priority === params.priority);
  }

  // Sort by priority then due date
  const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
  tasks.sort((a, b) => {
    const pA = priorityOrder[a.Priority] || 4;
    const pB = priorityOrder[b.Priority] || 4;
    if (pA !== pB) return pA - pB;
    return new Date(a.Due_Date) - new Date(b.Due_Date);
  });

  return {
    success: true,
    data: tasks,
    count: tasks.length
  };
}

/**
 * Update task status
 */
function updateAccountantTask(data) {
  if (!data.taskId) {
    return { success: false, error: 'Task ID is required' };
  }

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ACCOUNTING_SHEETS.ACCOUNTANT_TASKS);
  if (!sheet) {
    return { success: false, error: 'Tasks sheet not found' };
  }

  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const taskIdCol = headers.indexOf('Task_ID');

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][taskIdCol] === data.taskId) {
      const now = new Date().toISOString();

      // Update status
      if (data.status) {
        const statusCol = headers.indexOf('Status');
        sheet.getRange(i + 1, statusCol + 1).setValue(data.status);

        // If completing, set completed fields
        if (data.status === 'COMPLETED') {
          const completedAtCol = headers.indexOf('Completed_At');
          const completedByCol = headers.indexOf('Completed_By');
          sheet.getRange(i + 1, completedAtCol + 1).setValue(now);
          sheet.getRange(i + 1, completedByCol + 1).setValue(data.completedBy || 'Owner');
        }
      }

      // Update other fields
      if (data.notes) {
        const notesCol = headers.indexOf('Notes');
        sheet.getRange(i + 1, notesCol + 1).setValue(data.notes);
      }

      if (data.dueDate) {
        const dueCol = headers.indexOf('Due_Date');
        sheet.getRange(i + 1, dueCol + 1).setValue(data.dueDate);
      }

      // Update timestamp
      const updatedCol = headers.indexOf('Updated_At');
      sheet.getRange(i + 1, updatedCol + 1).setValue(now);

      logAuditEvent('Update', 'AccountantTask', data.taskId, null, data);

      return { success: true, message: 'Task updated' };
    }
  }

  return { success: false, error: 'Task not found' };
}

/**
 * Add a manual task
 */
function addAccountantTask(data) {
  if (!data.title) {
    return { success: false, error: 'Title is required' };
  }

  const sheet = getOrCreateSheet(ACCOUNTING_SHEETS.ACCOUNTANT_TASKS, ACCOUNTANT_TASK_HEADERS);
  const now = new Date().toISOString();

  const taskId = 'TASK-' + Utilities.formatDate(new Date(), 'America/New_York', 'yyyyMMdd-HHmmss') + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

  const task = {
    Task_ID: taskId,
    Title: data.title,
    Description: data.description || '',
    Category: data.category || 'MANUAL',
    Priority: data.priority || 'MEDIUM',
    Status: 'PENDING',
    Source_Type: 'MANUAL',
    Source_ID: '',
    Source_Date: now,
    Due_Date: data.dueDate || calculateDueDate(data.priority || 'MEDIUM', now),
    Assigned_To: data.assignedTo || 'Owner',
    Created_At: now,
    Updated_At: now,
    Completed_At: '',
    Completed_By: '',
    Notes: data.notes || '',
    Recurring: data.recurring || false,
    Recurrence_Pattern: data.recurrencePattern || ''
  };

  sheet.appendRow(Object.values(task));

  logAuditEvent('Create', 'AccountantTask', taskId, null, task);

  return {
    success: true,
    taskId: taskId,
    task: task
  };
}

/**
 * Get task dashboard - summary of all tasks
 */
function getTasksDashboard() {
  const tasks = getAccountantTasks({}).data;

  // Count by status
  const byStatus = {
    PENDING: tasks.filter(t => t.Status === 'PENDING').length,
    IN_PROGRESS: tasks.filter(t => t.Status === 'IN_PROGRESS').length,
    COMPLETED: tasks.filter(t => t.Status === 'COMPLETED').length,
    BLOCKED: tasks.filter(t => t.Status === 'BLOCKED').length
  };

  // Count by priority
  const byPriority = {
    CRITICAL: tasks.filter(t => t.Priority === 'CRITICAL' && t.Status !== 'COMPLETED').length,
    HIGH: tasks.filter(t => t.Priority === 'HIGH' && t.Status !== 'COMPLETED').length,
    MEDIUM: tasks.filter(t => t.Priority === 'MEDIUM' && t.Status !== 'COMPLETED').length,
    LOW: tasks.filter(t => t.Priority === 'LOW' && t.Status !== 'COMPLETED').length
  };

  // Count by category
  const byCategory = {};
  tasks.filter(t => t.Status !== 'COMPLETED').forEach(t => {
    byCategory[t.Category] = (byCategory[t.Category] || 0) + 1;
  });

  // Overdue tasks
  const today = new Date().toISOString().split('T')[0];
  const overdue = tasks.filter(t => t.Status !== 'COMPLETED' && t.Due_Date && t.Due_Date < today);

  // Due this week
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];
  const dueThisWeek = tasks.filter(t => t.Status !== 'COMPLETED' && t.Due_Date && t.Due_Date >= today && t.Due_Date <= nextWeekStr);

  // Top pending tasks (sorted by priority)
  const pendingTasks = tasks
    .filter(t => t.Status === 'PENDING' || t.Status === 'IN_PROGRESS')
    .slice(0, 10);

  return {
    success: true,
    dashboard: {
      summary: {
        totalTasks: tasks.length,
        activeTasks: tasks.filter(t => t.Status !== 'COMPLETED').length,
        completedTasks: byStatus.COMPLETED,
        overdueCount: overdue.length,
        dueThisWeek: dueThisWeek.length
      },
      byStatus: byStatus,
      byPriority: byPriority,
      byCategory: byCategory,
      overdueTasks: overdue.map(t => ({
        taskId: t.Task_ID,
        title: t.Title,
        priority: t.Priority,
        dueDate: t.Due_Date,
        daysOverdue: Math.floor((new Date() - new Date(t.Due_Date)) / (1000 * 60 * 60 * 24))
      })),
      upcomingTasks: dueThisWeek.map(t => ({
        taskId: t.Task_ID,
        title: t.Title,
        priority: t.Priority,
        dueDate: t.Due_Date
      })),
      topPendingTasks: pendingTasks.map(t => ({
        taskId: t.Task_ID,
        title: t.Title,
        category: t.Category,
        priority: t.Priority,
        status: t.Status,
        dueDate: t.Due_Date,
        description: t.Description
      })),
      generatedAt: new Date().toISOString()
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// API ENDPOINTS - Add these to the main doGet/doPost switch statements
// ═══════════════════════════════════════════════════════════════════════════

/*
 * ADD THESE CASES TO doGet() in MERGED TOTAL.js:
 *
 * // ============ ACCOUNTING MODULE - GET ENDPOINTS ============
 * case 'initializeAccountingModule':
 *   return jsonResponse(initializeAccountingModule());
 * case 'getReceipts':
 *   return jsonResponse(getReceipts(e.parameter));
 * case 'getExpenseCategories':
 *   return jsonResponse(getExpenseCategories(e.parameter));
 * case 'getAccountantEmails':
 *   return jsonResponse(getAccountantEmails(e.parameter));
 * case 'getAccountantDocs':
 *   return jsonResponse(getAccountantDocs(e.parameter));
 * case 'analyzeAccountantEmailPatterns':
 *   return jsonResponse(analyzeAccountantEmailPatterns());
 * case 'getGrants':
 *   return jsonResponse(getGrants(e.parameter));
 * case 'getAuditTrailAccounting':
 *   return jsonResponse(getAuditTrail(e.parameter));
 * case 'generateProfitLossStatement':
 *   return jsonResponse(generateProfitLossStatement(e.parameter));
 * case 'generateScheduleFReport':
 *   return jsonResponse(generateScheduleFReport(e.parameter));
 * case 'suggestCategory':
 *   return jsonResponse(suggestCategory(e.parameter.vendor));
 *
 *
 * ADD THESE CASES TO doPost() in MERGED TOTAL.js:
 *
 * // ============ ACCOUNTING MODULE - POST ENDPOINTS ============
 * case 'saveReceipt':
 *   return jsonResponse(saveReceipt(data));
 * case 'uploadReceiptImage':
 *   return jsonResponse(uploadReceiptImage(data));
 * case 'verifyReceipt':
 *   return jsonResponse(verifyReceipt(data));
 * case 'importAccountantEmails':
 *   return jsonResponse(importAccountantEmails(data));
 * case 'setupEmailImportTrigger':
 *   return jsonResponse(setupEmailImportTrigger());
 * case 'saveGrant':
 *   return jsonResponse(saveGrant(data));
 *
 */
