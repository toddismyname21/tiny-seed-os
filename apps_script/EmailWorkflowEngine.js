// ═══════════════════════════════════════════════════════════════════════════
// EMAIL CHIEF-OF-STAFF: WORKFLOW ENGINE
// Agent A: Inbox & Workflow Processing
// Created: 2026-01-20
// ═══════════════════════════════════════════════════════════════════════════

// Sheet names
const EMAIL_INBOX_STATE_SHEET = 'EMAIL_INBOX_STATE';
const EMAIL_ACTIONS_SHEET = 'EMAIL_ACTIONS';
const EMAIL_FOLLOWUPS_SHEET = 'EMAIL_FOLLOWUPS';
const CHIEF_OF_STAFF_AUDIT_SHEET = 'CHIEF_OF_STAFF_AUDIT';

// Headers for each sheet
const EMAIL_INBOX_STATE_HEADERS = [
  'Thread_ID', 'Message_ID', 'Subject', 'From', 'From_Name', 'To',
  'Received_At', 'Category', 'Priority', 'Status', 'Assigned_To',
  'Due_Date', 'Follow_Up_Date', 'Related_Customer_ID', 'Related_Vendor_ID',
  'Related_Order_ID', 'Tags', 'AI_Summary', 'AI_Suggested_Action',
  'AI_Confidence', 'Workflow_State', 'Created_At', 'Updated_At',
  'Resolved_At', 'Resolution_Notes'
];

const EMAIL_ACTIONS_HEADERS = [
  'Action_ID', 'Thread_ID', 'Action_Type', 'Action_Status', 'Suggested_By',
  'Suggested_At', 'Draft_Content', 'Approval_Required', 'Approved_By',
  'Approved_At', 'Executed_At', 'Execution_Result', 'Expiry_Time', 'Notes'
];

const EMAIL_FOLLOWUPS_HEADERS = [
  'Followup_ID', 'Thread_ID', 'Type', 'Due_Date', 'Reminder_Count',
  'Max_Reminders', 'Escalate_To', 'Status', 'Created_At',
  'Last_Reminder_At', 'Completed_At'
];

const CHIEF_OF_STAFF_AUDIT_HEADERS = [
  'Audit_ID', 'Timestamp', 'Agent', 'Action', 'Thread_ID', 'Action_ID',
  'User_ID', 'Input', 'Output', 'Confidence', 'Human_Override',
  'Override_Reason', 'IP_Address', 'Session_ID'
];

// Categories and priorities
const EMAIL_CATEGORIES = ['CUSTOMER', 'VENDOR', 'INTERNAL', 'MARKETING', 'PERSONAL'];
const EMAIL_PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const EMAIL_STATUSES = ['NEW', 'TRIAGED', 'AWAITING_RESPONSE', 'AWAITING_THEM', 'AWAITING_REVIEW', 'RESOLVED', 'ARCHIVED'];
const ACTION_TYPES = ['REPLY', 'FORWARD', 'CREATE_TASK', 'CREATE_EVENT', 'UPDATE_CRM', 'SEND_INVOICE'];
const ACTION_STATUSES = ['PENDING_APPROVAL', 'APPROVED', 'EXECUTED', 'REJECTED', 'EXPIRED'];

// ═══════════════════════════════════════════════════════════════════════════
// SHEET INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize all Chief-of-Staff sheets
 */
function initializeChiefOfStaffSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const results = {};

  // Create EMAIL_INBOX_STATE
  results.inboxState = createSheetWithHeaders(ss, EMAIL_INBOX_STATE_SHEET, EMAIL_INBOX_STATE_HEADERS, '#1976D2');

  // Create EMAIL_ACTIONS
  results.actions = createSheetWithHeaders(ss, EMAIL_ACTIONS_SHEET, EMAIL_ACTIONS_HEADERS, '#FF9800');

  // Create EMAIL_FOLLOWUPS
  results.followups = createSheetWithHeaders(ss, EMAIL_FOLLOWUPS_SHEET, EMAIL_FOLLOWUPS_HEADERS, '#9C27B0');

  // Create CHIEF_OF_STAFF_AUDIT
  results.audit = createSheetWithHeaders(ss, CHIEF_OF_STAFF_AUDIT_SHEET, CHIEF_OF_STAFF_AUDIT_HEADERS, '#607D8B');

  return {
    success: true,
    message: 'Chief-of-Staff sheets initialized',
    results
  };
}

/**
 * Helper to create sheet with headers and styling
 */
function createSheetWithHeaders(ss, sheetName, headers, headerColor) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground(headerColor)
      .setFontColor('#FFFFFF')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
    return { created: true, sheetName };
  }
  return { created: false, sheetName, message: 'Sheet already exists' };
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE EMAIL PROCESSING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Process a single email thread with full body access
 * @param {string} threadId - Gmail thread ID
 */
function processEmailThread(threadId) {
  if (!threadId) {
    return { success: false, error: 'Thread ID required' };
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const stateSheet = ss.getSheetByName(EMAIL_INBOX_STATE_SHEET);

    if (!stateSheet) {
      initializeChiefOfStaffSheets();
    }

    // Get the Gmail thread
    const thread = GmailApp.getThreadById(threadId);
    if (!thread) {
      return { success: false, error: 'Thread not found' };
    }

    const messages = thread.getMessages();
    const latestMessage = messages[messages.length - 1];

    // Extract full email data
    const emailData = {
      threadId: threadId,
      messageId: latestMessage.getId(),
      subject: thread.getFirstMessageSubject(),
      from: latestMessage.getFrom(),
      fromName: extractName(latestMessage.getFrom()),
      to: latestMessage.getTo(),
      receivedAt: latestMessage.getDate().toISOString(),
      body: latestMessage.getPlainBody(),
      htmlBody: latestMessage.getBody(),
      messageCount: messages.length,
      labels: thread.getLabels().map(l => l.getName()),
      isUnread: thread.isUnread(),
      hasAttachments: latestMessage.getAttachments().length > 0
    };

    // Classify with Claude AI
    const classification = classifyEmailWithAI(emailData);

    // Check if thread already exists
    const existingRow = findThreadRow(stateSheet, threadId);

    const now = new Date().toISOString();
    const rowData = [
      threadId,
      emailData.messageId,
      emailData.subject,
      emailData.from,
      emailData.fromName,
      emailData.to,
      emailData.receivedAt,
      classification.category,
      classification.priority,
      'NEW',
      '', // Assigned_To
      classification.dueDate || '',
      '', // Follow_Up_Date
      classification.customerId || '',
      classification.vendorId || '',
      classification.orderId || '',
      JSON.stringify(classification.tags || []),
      classification.summary,
      classification.suggestedAction,
      classification.confidence,
      JSON.stringify({ status: 'NEW', history: [{ status: 'NEW', at: now }] }),
      now,
      now,
      '',
      ''
    ];

    if (existingRow) {
      // Update existing row
      const sheet = ss.getSheetByName(EMAIL_INBOX_STATE_SHEET);
      sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      // Insert new row
      const sheet = ss.getSheetByName(EMAIL_INBOX_STATE_SHEET);
      sheet.appendRow(rowData);
    }

    // Create suggested action if applicable
    if (classification.suggestedAction && classification.confidence >= 0.7) {
      suggestActionForEmail(threadId, classification);
    }

    // Log to audit
    logChiefOfStaffAudit({
      agent: 'A',
      action: 'PROCESS_EMAIL',
      threadId: threadId,
      input: { subject: emailData.subject, from: emailData.from },
      output: classification,
      confidence: classification.confidence
    });

    return {
      success: true,
      data: {
        threadId,
        subject: emailData.subject,
        category: classification.category,
        priority: classification.priority,
        summary: classification.summary,
        suggestedAction: classification.suggestedAction,
        confidence: classification.confidence
      }
    };
  } catch (error) {
    Logger.log('Error processing email thread: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Triage all new/unprocessed emails
 */
function triageInbox() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let stateSheet = ss.getSheetByName(EMAIL_INBOX_STATE_SHEET);

    if (!stateSheet) {
      initializeChiefOfStaffSheets();
      stateSheet = ss.getSheetByName(EMAIL_INBOX_STATE_SHEET);
    }

    // Get processed thread IDs
    const processedThreads = new Set();
    if (stateSheet.getLastRow() > 1) {
      const threadIds = stateSheet.getRange(2, 1, stateSheet.getLastRow() - 1, 1).getValues();
      threadIds.forEach(row => processedThreads.add(row[0]));
    }

    // Get inbox threads
    const threads = GmailApp.getInboxThreads(0, 100);
    const results = {
      processed: 0,
      skipped: 0,
      errors: 0,
      details: []
    };

    for (const thread of threads) {
      const threadId = thread.getId();

      if (processedThreads.has(threadId)) {
        // Check if there are new messages
        const messages = thread.getMessages();
        // If already processed, skip
        results.skipped++;
        continue;
      }

      try {
        const result = processEmailThread(threadId);
        if (result.success) {
          results.processed++;
          results.details.push({
            threadId,
            subject: result.data.subject,
            category: result.data.category,
            priority: result.data.priority
          });
        } else {
          results.errors++;
        }
      } catch (e) {
        results.errors++;
        Logger.log('Error processing thread ' + threadId + ': ' + e.toString());
      }
    }

    // Log to audit
    logChiefOfStaffAudit({
      agent: 'A',
      action: 'TRIAGE_INBOX',
      input: { threadCount: threads.length },
      output: results
    });

    return {
      success: true,
      data: results,
      message: `Processed ${results.processed} new emails, skipped ${results.skipped}, errors: ${results.errors}`
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Classify email using Claude AI
 */
function classifyEmailWithAI(emailData) {
  const apiKey = CLAUDE_CONFIG.API_KEY;

  if (!apiKey || apiKey === 'YOUR_ANTHROPIC_API_KEY_HERE') {
    // Fallback to rule-based classification
    return classifyEmailWithRules(emailData);
  }

  try {
    const prompt = `Analyze this email and classify it for a small organic farm business.

EMAIL:
From: ${emailData.from}
Subject: ${emailData.subject}
Body: ${emailData.body ? emailData.body.substring(0, 2000) : '(No body)'}

Respond with ONLY valid JSON (no markdown):
{
  "category": "CUSTOMER" | "VENDOR" | "INTERNAL" | "MARKETING" | "PERSONAL",
  "priority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "summary": "2-3 sentence summary",
  "suggestedAction": "What should be done next",
  "actionType": "REPLY" | "CREATE_TASK" | "CREATE_EVENT" | "UPDATE_CRM" | "NONE",
  "confidence": 0.0-1.0,
  "tags": ["tag1", "tag2"],
  "extractedData": {
    "customerName": "if detected",
    "orderNumber": "if mentioned",
    "deadline": "if mentioned"
  }
}

Priority Rules:
- CRITICAL: Payment issues, urgent deadlines <24h, legal matters
- HIGH: Customer complaints, vendor confirmations, time-sensitive <48h
- MEDIUM: General inquiries, routine orders
- LOW: Marketing, newsletters, FYI only`;

    const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      }),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());

    if (result.content && result.content[0] && result.content[0].text) {
      const parsed = JSON.parse(result.content[0].text);
      return {
        category: parsed.category || 'PERSONAL',
        priority: parsed.priority || 'MEDIUM',
        summary: parsed.summary || emailData.subject,
        suggestedAction: parsed.suggestedAction || '',
        actionType: parsed.actionType || 'NONE',
        confidence: parsed.confidence || 0.5,
        tags: parsed.tags || [],
        customerId: null,
        vendorId: null,
        orderId: parsed.extractedData?.orderNumber || null,
        dueDate: parsed.extractedData?.deadline || null
      };
    }
  } catch (error) {
    Logger.log('AI classification error: ' + error.toString());
  }

  // Fallback to rules
  return classifyEmailWithRules(emailData);
}

/**
 * Rule-based classification fallback
 */
function classifyEmailWithRules(emailData) {
  const from = emailData.from.toLowerCase();
  const subject = emailData.subject.toLowerCase();
  const body = (emailData.body || '').toLowerCase();
  const combined = from + ' ' + subject + ' ' + body;

  let category = 'PERSONAL';
  let priority = 'MEDIUM';
  const tags = [];

  // Category detection
  if (combined.includes('order') || combined.includes('csa') || combined.includes('delivery') ||
      combined.includes('pickup') || combined.includes('member')) {
    category = 'CUSTOMER';
    tags.push('customer');
  } else if (combined.includes('invoice') || combined.includes('seed') || combined.includes('supply') ||
             combined.includes('johnny') || combined.includes('fedex') || combined.includes('usps')) {
    category = 'VENDOR';
    tags.push('vendor');
  } else if (from.includes('tinyseed') || from.includes('tiny seed')) {
    category = 'INTERNAL';
  } else if (combined.includes('unsubscribe') || combined.includes('newsletter') ||
             combined.includes('promotion')) {
    category = 'MARKETING';
  }

  // Priority detection
  if (combined.includes('urgent') || combined.includes('asap') || combined.includes('immediately') ||
      combined.includes('critical')) {
    priority = 'CRITICAL';
    tags.push('urgent');
  } else if (combined.includes('important') || combined.includes('deadline') ||
             combined.includes('payment') || combined.includes('overdue')) {
    priority = 'HIGH';
  } else if (category === 'MARKETING') {
    priority = 'LOW';
  }

  // Extract order number
  const orderMatch = combined.match(/order\s*#?\s*(\d+)/i);
  const orderId = orderMatch ? orderMatch[1] : null;

  return {
    category,
    priority,
    summary: `${category} email from ${emailData.fromName || emailData.from}`,
    suggestedAction: category === 'CUSTOMER' ? 'Review and respond to customer' :
                     category === 'VENDOR' ? 'Review vendor communication' : '',
    actionType: (category === 'CUSTOMER' || category === 'VENDOR') ? 'REPLY' : 'NONE',
    confidence: 0.6,
    tags,
    customerId: null,
    vendorId: null,
    orderId,
    dueDate: null
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW STATE MACHINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Transition email to new state
 */
function transitionEmailState(threadId, newStatus, metadata = {}) {
  if (!threadId || !newStatus) {
    return { success: false, error: 'threadId and newStatus required' };
  }

  if (!EMAIL_STATUSES.includes(newStatus)) {
    return { success: false, error: 'Invalid status: ' + newStatus };
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(EMAIL_INBOX_STATE_SHEET);

    const row = findThreadRow(sheet, threadId);
    if (!row) {
      return { success: false, error: 'Thread not found' };
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusCol = headers.indexOf('Status') + 1;
    const workflowCol = headers.indexOf('Workflow_State') + 1;
    const updatedCol = headers.indexOf('Updated_At') + 1;
    const resolvedCol = headers.indexOf('Resolved_At') + 1;
    const resolutionCol = headers.indexOf('Resolution_Notes') + 1;

    const currentStatus = sheet.getRange(row, statusCol).getValue();

    // Validate transition
    const validTransitions = {
      'NEW': ['TRIAGED', 'ARCHIVED'],
      'TRIAGED': ['AWAITING_RESPONSE', 'AWAITING_REVIEW', 'RESOLVED', 'ARCHIVED'],
      'AWAITING_REVIEW': ['TRIAGED', 'AWAITING_RESPONSE', 'RESOLVED', 'ARCHIVED'],
      'AWAITING_RESPONSE': ['AWAITING_THEM', 'RESOLVED', 'ARCHIVED'],
      'AWAITING_THEM': ['AWAITING_RESPONSE', 'RESOLVED', 'ARCHIVED'],
      'RESOLVED': ['ARCHIVED'],
      'ARCHIVED': []
    };

    if (validTransitions[currentStatus] && !validTransitions[currentStatus].includes(newStatus)) {
      return {
        success: false,
        error: `Invalid transition from ${currentStatus} to ${newStatus}`
      };
    }

    // Update workflow state
    let workflowState = {};
    try {
      workflowState = JSON.parse(sheet.getRange(row, workflowCol).getValue() || '{}');
    } catch (e) {
      workflowState = {};
    }

    workflowState.status = newStatus;
    workflowState.history = workflowState.history || [];
    workflowState.history.push({
      from: currentStatus,
      to: newStatus,
      at: new Date().toISOString(),
      metadata
    });

    const now = new Date().toISOString();

    // Update cells
    sheet.getRange(row, statusCol).setValue(newStatus);
    sheet.getRange(row, workflowCol).setValue(JSON.stringify(workflowState));
    sheet.getRange(row, updatedCol).setValue(now);

    if (newStatus === 'RESOLVED') {
      sheet.getRange(row, resolvedCol).setValue(now);
      if (metadata.notes) {
        sheet.getRange(row, resolutionCol).setValue(metadata.notes);
      }
    }

    // Log to audit
    logChiefOfStaffAudit({
      agent: 'A',
      action: 'TRANSITION_STATE',
      threadId,
      input: { from: currentStatus, to: newStatus, metadata },
      output: { success: true }
    });

    return {
      success: true,
      data: {
        threadId,
        previousStatus: currentStatus,
        newStatus,
        updatedAt: now
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get emails by status
 */
function getEmailsByStatus(params = {}) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(EMAIL_INBOX_STATE_SHEET);

    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const statusFilter = params.status ? params.status.split(',') : null;
    const categoryFilter = params.category ? params.category.split(',') : null;
    const priorityFilter = params.priority ? params.priority.split(',') : null;
    const limit = parseInt(params.limit) || 50;
    const offset = parseInt(params.offset) || 0;

    const statusCol = headers.indexOf('Status');
    const categoryCol = headers.indexOf('Category');
    const priorityCol = headers.indexOf('Priority');

    const results = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      if (statusFilter && !statusFilter.includes(row[statusCol])) continue;
      if (categoryFilter && !categoryFilter.includes(row[categoryCol])) continue;
      if (priorityFilter && !priorityFilter.includes(row[priorityCol])) continue;

      const email = {};
      headers.forEach((h, idx) => {
        email[h.toLowerCase().replace(/_/g, '')] = row[idx];
      });

      results.push(email);
    }

    // Sort by priority then date
    const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
    results.sort((a, b) => {
      const pDiff = (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
      if (pDiff !== 0) return pDiff;
      return new Date(b.receivedat) - new Date(a.receivedat);
    });

    const paginated = results.slice(offset, offset + limit);

    return {
      success: true,
      data: paginated,
      count: results.length,
      limit,
      offset
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Resolve an email thread
 */
function resolveEmail(threadId, notes = '') {
  return transitionEmailState(threadId, 'RESOLVED', { notes });
}

/**
 * Assign email to user
 */
function assignEmail(threadId, assignTo) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(EMAIL_INBOX_STATE_SHEET);

    const row = findThreadRow(sheet, threadId);
    if (!row) {
      return { success: false, error: 'Thread not found' };
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const assignCol = headers.indexOf('Assigned_To') + 1;
    const updatedCol = headers.indexOf('Updated_At') + 1;

    sheet.getRange(row, assignCol).setValue(assignTo);
    sheet.getRange(row, updatedCol).setValue(new Date().toISOString());

    logChiefOfStaffAudit({
      agent: 'A',
      action: 'ASSIGN_EMAIL',
      threadId,
      input: { assignTo },
      output: { success: true }
    });

    return { success: true, data: { threadId, assignedTo: assignTo } };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION QUEUE (APPROVAL SYSTEM)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Suggest an action for approval
 */
function suggestActionForEmail(threadId, classification) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(EMAIL_ACTIONS_SHEET);

    if (!sheet) {
      initializeChiefOfStaffSheets();
      sheet = ss.getSheetByName(EMAIL_ACTIONS_SHEET);
    }

    const actionId = 'ACT-' + Utilities.getUuid().substring(0, 8);
    const now = new Date();
    const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const rowData = [
      actionId,
      threadId,
      classification.actionType || 'REPLY',
      'PENDING_APPROVAL',
      'AGENT_A',
      now.toISOString(),
      classification.suggestedAction || '',
      true, // Approval required
      '', // Approved_By
      '', // Approved_At
      '', // Executed_At
      '', // Execution_Result
      expiry.toISOString(),
      ''  // Notes
    ];

    sheet.appendRow(rowData);

    return {
      success: true,
      data: {
        actionId,
        threadId,
        actionType: classification.actionType,
        expiresAt: expiry.toISOString()
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get pending approvals
 */
function getPendingApprovals() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(EMAIL_ACTIONS_SHEET);

    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const statusCol = headers.indexOf('Action_Status');
    const expiryCol = headers.indexOf('Expiry_Time');
    const now = new Date();

    const results = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      if (row[statusCol] !== 'PENDING_APPROVAL') continue;

      // Check if expired
      const expiry = new Date(row[expiryCol]);
      if (expiry < now) {
        // Mark as expired
        sheet.getRange(i + 1, statusCol + 1).setValue('EXPIRED');
        continue;
      }

      const action = {};
      headers.forEach((h, idx) => {
        action[h.toLowerCase().replace(/_/g, '')] = row[idx];
      });
      action.timeRemaining = Math.round((expiry - now) / 1000 / 60) + ' minutes';

      results.push(action);
    }

    return {
      success: true,
      data: results,
      count: results.length
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Approve an action
 */
function approveEmailAction(actionId, approvedBy) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(EMAIL_ACTIONS_SHEET);

    const row = findActionRow(sheet, actionId);
    if (!row) {
      return { success: false, error: 'Action not found' };
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusCol = headers.indexOf('Action_Status') + 1;
    const approvedByCol = headers.indexOf('Approved_By') + 1;
    const approvedAtCol = headers.indexOf('Approved_At') + 1;

    const currentStatus = sheet.getRange(row, statusCol).getValue();
    if (currentStatus !== 'PENDING_APPROVAL') {
      return { success: false, error: 'Action is not pending approval' };
    }

    const now = new Date().toISOString();

    sheet.getRange(row, statusCol).setValue('APPROVED');
    sheet.getRange(row, approvedByCol).setValue(approvedBy || 'USER');
    sheet.getRange(row, approvedAtCol).setValue(now);

    // Get thread ID and execute action
    const threadIdCol = headers.indexOf('Thread_ID') + 1;
    const threadId = sheet.getRange(row, threadIdCol).getValue();

    // Update email status to AWAITING_RESPONSE
    transitionEmailState(threadId, 'AWAITING_RESPONSE', { action: actionId });

    logChiefOfStaffAudit({
      agent: 'A',
      action: 'APPROVE_ACTION',
      actionId,
      threadId,
      input: { approvedBy },
      output: { success: true }
    });

    return {
      success: true,
      data: {
        actionId,
        status: 'APPROVED',
        approvedBy: approvedBy || 'USER',
        approvedAt: now
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Reject an action
 */
function rejectEmailAction(actionId, reason = '') {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(EMAIL_ACTIONS_SHEET);

    const row = findActionRow(sheet, actionId);
    if (!row) {
      return { success: false, error: 'Action not found' };
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const statusCol = headers.indexOf('Action_Status') + 1;
    const notesCol = headers.indexOf('Notes') + 1;

    sheet.getRange(row, statusCol).setValue('REJECTED');
    sheet.getRange(row, notesCol).setValue(reason);

    logChiefOfStaffAudit({
      agent: 'A',
      action: 'REJECT_ACTION',
      actionId,
      input: { reason },
      output: { success: true },
      humanOverride: true,
      overrideReason: reason
    });

    return {
      success: true,
      data: { actionId, status: 'REJECTED', reason }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FOLLOW-UP SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create follow-up reminder
 */
function createFollowUp(threadId, options = {}) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(EMAIL_FOLLOWUPS_SHEET);

    if (!sheet) {
      initializeChiefOfStaffSheets();
      sheet = ss.getSheetByName(EMAIL_FOLLOWUPS_SHEET);
    }

    const followupId = 'FU-' + Utilities.getUuid().substring(0, 8);
    const now = new Date();
    const dueDate = options.dueDate ? new Date(options.dueDate) :
                    new Date(now.getTime() + (options.daysFromNow || 2) * 24 * 60 * 60 * 1000);

    const rowData = [
      followupId,
      threadId,
      options.type || 'REMINDER',
      dueDate.toISOString(),
      0, // Reminder_Count
      options.maxReminders || 3,
      options.escalateTo || 'Owner',
      'ACTIVE',
      now.toISOString(),
      '', // Last_Reminder_At
      ''  // Completed_At
    ];

    sheet.appendRow(rowData);

    // Update email with follow-up date
    const stateSheet = ss.getSheetByName(EMAIL_INBOX_STATE_SHEET);
    const row = findThreadRow(stateSheet, threadId);
    if (row) {
      const headers = stateSheet.getRange(1, 1, 1, stateSheet.getLastColumn()).getValues()[0];
      const followUpCol = headers.indexOf('Follow_Up_Date') + 1;
      stateSheet.getRange(row, followUpCol).setValue(dueDate.toISOString());
    }

    return {
      success: true,
      data: {
        followupId,
        threadId,
        dueDate: dueDate.toISOString(),
        type: options.type || 'REMINDER'
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get overdue follow-ups
 */
function getOverdueFollowups() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(EMAIL_FOLLOWUPS_SHEET);

    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const statusCol = headers.indexOf('Status');
    const dueDateCol = headers.indexOf('Due_Date');
    const now = new Date();

    const results = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      if (row[statusCol] !== 'ACTIVE') continue;

      const dueDate = new Date(row[dueDateCol]);
      if (dueDate > now) continue;

      const followup = {};
      headers.forEach((h, idx) => {
        followup[h.toLowerCase().replace(/_/g, '')] = row[idx];
      });
      followup.overdueby = Math.round((now - dueDate) / 1000 / 60 / 60) + ' hours';

      results.push(followup);
    }

    return {
      success: true,
      data: results,
      count: results.length
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Check and process overdue follow-ups (runs via trigger)
 */
function checkOverdueFollowupsAndNotify() {
  const overdue = getOverdueFollowups();

  if (!overdue.success || overdue.count === 0) {
    return { success: true, message: 'No overdue follow-ups' };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(EMAIL_FOLLOWUPS_SHEET);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const reminderCountCol = headers.indexOf('Reminder_Count') + 1;
  const maxRemindersCol = headers.indexOf('Max_Reminders') + 1;
  const lastReminderCol = headers.indexOf('Last_Reminder_At') + 1;
  const statusCol = headers.indexOf('Status') + 1;
  const now = new Date().toISOString();

  for (const followup of overdue.data) {
    const row = findFollowupRow(sheet, followup.followupid);
    if (!row) continue;

    const currentCount = sheet.getRange(row, reminderCountCol).getValue();
    const maxReminders = sheet.getRange(row, maxRemindersCol).getValue();

    if (currentCount >= maxReminders) {
      // Escalate
      sheet.getRange(row, statusCol).setValue('ESCALATED');

      logChiefOfStaffAudit({
        agent: 'A',
        action: 'ESCALATE_FOLLOWUP',
        threadId: followup.threadid,
        input: { followupId: followup.followupid, reason: 'Max reminders reached' }
      });
    } else {
      // Increment reminder
      sheet.getRange(row, reminderCountCol).setValue(currentCount + 1);
      sheet.getRange(row, lastReminderCol).setValue(now);

      logChiefOfStaffAudit({
        agent: 'A',
        action: 'SEND_REMINDER',
        threadId: followup.threadid,
        input: { followupId: followup.followupid, reminderNumber: currentCount + 1 }
      });
    }
  }

  return {
    success: true,
    message: `Processed ${overdue.count} overdue follow-ups`
  };
}

/**
 * Get emails awaiting external response
 */
function getAwaitingResponse() {
  return getEmailsByStatus({ status: 'AWAITING_THEM' });
}

// ═══════════════════════════════════════════════════════════════════════════
// DAILY BRIEF
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate daily brief
 */
function getDailyBrief() {
  try {
    const newEmails = getEmailsByStatus({ status: 'NEW,TRIAGED' });
    const pending = getPendingApprovals();
    const overdue = getOverdueFollowups();
    const awaiting = getAwaitingResponse();

    const criticalEmails = (newEmails.data || []).filter(e => e.priority === 'CRITICAL');
    const highEmails = (newEmails.data || []).filter(e => e.priority === 'HIGH');

    return {
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        summary: {
          totalNew: newEmails.count || 0,
          critical: criticalEmails.length,
          high: highEmails.length,
          pendingApprovals: pending.count || 0,
          overdueFollowups: overdue.count || 0,
          awaitingResponse: awaiting.count || 0
        },
        priorities: [
          ...criticalEmails.slice(0, 5).map(e => ({
            priority: 'CRITICAL',
            subject: e.subject,
            from: e.fromname || e.from,
            threadId: e.threadid,
            summary: e.aisummary
          })),
          ...highEmails.slice(0, 5).map(e => ({
            priority: 'HIGH',
            subject: e.subject,
            from: e.fromname || e.from,
            threadId: e.threadid,
            summary: e.aisummary
          }))
        ],
        actions: (pending.data || []).slice(0, 5),
        overdue: (overdue.data || []).slice(0, 5)
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT LOGGING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Log to Chief-of-Staff audit trail
 */
function logChiefOfStaffAudit(entry) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(CHIEF_OF_STAFF_AUDIT_SHEET);

    if (!sheet) {
      initializeChiefOfStaffSheets();
      sheet = ss.getSheetByName(CHIEF_OF_STAFF_AUDIT_SHEET);
    }

    const auditRow = [
      'AUD-' + Utilities.getUuid().substring(0, 8),
      new Date().toISOString(),
      entry.agent || 'UNKNOWN',
      entry.action || '',
      entry.threadId || '',
      entry.actionId || '',
      entry.userId || '',
      JSON.stringify(entry.input || {}),
      JSON.stringify(entry.output || {}),
      entry.confidence || null,
      entry.humanOverride || false,
      entry.overrideReason || '',
      entry.ipAddress || '',
      entry.sessionId || ''
    ];

    sheet.appendRow(auditRow);
    return { success: true };
  } catch (error) {
    Logger.log('Audit log error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Get audit log
 */
function getChiefOfStaffAuditLog(params = {}) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CHIEF_OF_STAFF_AUDIT_SHEET);

    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: true, data: [], count: 0 };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const limit = parseInt(params.limit) || 100;
    const agent = params.agent;
    const threadId = params.threadId;

    const agentCol = headers.indexOf('Agent');
    const threadCol = headers.indexOf('Thread_ID');

    const results = [];
    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];

      if (agent && row[agentCol] !== agent) continue;
      if (threadId && row[threadCol] !== threadId) continue;

      const entry = {};
      headers.forEach((h, idx) => {
        entry[h.toLowerCase().replace(/_/g, '')] = row[idx];
      });

      results.push(entry);

      if (results.length >= limit) break;
    }

    return {
      success: true,
      data: results,
      count: results.length
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract name from email address
 */
function extractName(fromString) {
  // "John Doe <john@example.com>" -> "John Doe"
  const match = fromString.match(/^([^<]+)/);
  if (match) {
    return match[1].trim().replace(/"/g, '');
  }
  // "john@example.com" -> "john"
  const emailMatch = fromString.match(/([^@]+)@/);
  return emailMatch ? emailMatch[1] : fromString;
}

/**
 * Find row by thread ID
 */
function findThreadRow(sheet, threadId) {
  if (!sheet || sheet.getLastRow() <= 1) return null;
  const threadIds = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < threadIds.length; i++) {
    if (threadIds[i][0] === threadId) return i + 2;
  }
  return null;
}

/**
 * Find row by action ID
 */
function findActionRow(sheet, actionId) {
  if (!sheet || sheet.getLastRow() <= 1) return null;
  const actionIds = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < actionIds.length; i++) {
    if (actionIds[i][0] === actionId) return i + 2;
  }
  return null;
}

/**
 * Find row by followup ID
 */
function findFollowupRow(sheet, followupId) {
  if (!sheet || sheet.getLastRow() <= 1) return null;
  const followupIds = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < followupIds.length; i++) {
    if (followupIds[i][0] === followupId) return i + 2;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIGGERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Setup Chief-of-Staff triggers
 */
function setupChiefOfStaffTriggers() {
  // Remove existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  const chiefTriggers = ['triageInbox', 'checkOverdueFollowupsAndNotify', 'expireOldActions'];

  for (const trigger of triggers) {
    if (chiefTriggers.includes(trigger.getHandlerFunction())) {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // Triage inbox every 5 minutes
  ScriptApp.newTrigger('triageInbox')
    .timeBased()
    .everyMinutes(5)
    .create();

  // Check follow-ups every hour
  ScriptApp.newTrigger('checkOverdueFollowupsAndNotify')
    .timeBased()
    .everyHours(1)
    .create();

  // Expire old actions every hour
  ScriptApp.newTrigger('expireOldActions')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('✅ Chief-of-Staff triggers created');

  return {
    success: true,
    message: 'Chief-of-Staff triggers created: triageInbox (5min), checkFollowups (1hr), expireActions (1hr)'
  };
}

/**
 * Expire old pending actions
 */
function expireOldActions() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(EMAIL_ACTIONS_SHEET);

    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: true, message: 'No actions to check' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const statusCol = headers.indexOf('Action_Status');
    const expiryCol = headers.indexOf('Expiry_Time');
    const now = new Date();

    let expired = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i][statusCol] !== 'PENDING_APPROVAL') continue;

      const expiry = new Date(data[i][expiryCol]);
      if (expiry < now) {
        sheet.getRange(i + 1, statusCol + 1).setValue('EXPIRED');
        expired++;
      }
    }

    return {
      success: true,
      message: `Expired ${expired} actions`
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Test the Email Workflow Engine
 */
function testEmailWorkflowEngine() {
  Logger.log('=== TESTING EMAIL WORKFLOW ENGINE ===');

  // 1. Initialize sheets
  Logger.log('1. Initializing sheets...');
  const init = initializeChiefOfStaffSheets();
  Logger.log('   Init result: ' + JSON.stringify(init));

  // 2. Triage inbox
  Logger.log('2. Triaging inbox...');
  const triage = triageInbox();
  Logger.log('   Triage result: ' + triage.message);

  // 3. Get emails by status
  Logger.log('3. Getting NEW emails...');
  const newEmails = getEmailsByStatus({ status: 'NEW' });
  Logger.log('   Found ' + newEmails.count + ' new emails');

  // 4. Get pending approvals
  Logger.log('4. Getting pending approvals...');
  const approvals = getPendingApprovals();
  Logger.log('   Found ' + approvals.count + ' pending approvals');

  // 5. Get daily brief
  Logger.log('5. Generating daily brief...');
  const brief = getDailyBrief();
  Logger.log('   Brief: ' + JSON.stringify(brief.data?.summary));

  Logger.log('=== TESTS COMPLETE ===');

  return {
    success: true,
    results: {
      init: init.message,
      triage: triage.message,
      newEmails: newEmails.count,
      approvals: approvals.count,
      brief: brief.data?.summary
    }
  };
}
