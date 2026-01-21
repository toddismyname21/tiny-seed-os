// ═══════════════════════════════════════════════════════════════════════════
// CHIEF-OF-STAFF: SMS INTEGRATION
// Captures text message commitments and ensures accountability
// Integrates with iOS Shortcuts for automatic forwarding
// Created: 2026-01-21
// ═══════════════════════════════════════════════════════════════════════════

const SMS_LOG_SHEET = 'COS_SMS_Log';
const SMS_COMMITMENTS_SHEET = 'COS_SMS_Commitments';
const SMS_CONTACTS_SHEET = 'COS_SMS_Contacts';

const SMS_LOG_HEADERS = [
  'SMS_ID', 'Direction', 'Contact_Name', 'Phone_Number', 'Message_Text',
  'Received_At', 'Processed_At', 'Has_Commitment', 'Commitment_Extracted',
  'Task_Created', 'AI_Analysis', 'Status'
];

const SMS_COMMITMENTS_HEADERS = [
  'Commitment_ID', 'SMS_ID', 'Contact_Name', 'Phone_Number', 'Commitment_Text',
  'Original_Message', 'Commitment_Type', 'Due_Date', 'Priority', 'Status',
  'Task_ID', 'Reminder_Sent', 'Completed_At', 'Created_At', 'Updated_At'
];

const SMS_CONTACTS_HEADERS = [
  'Contact_ID', 'Phone_Number', 'Contact_Name', 'Contact_Type', 'Company',
  'Email', 'Customer_ID', 'Total_Messages', 'Last_Message_At',
  'Open_Commitments', 'Notes', 'Created_At', 'Updated_At'
];

// Commitment types we look for
const COMMITMENT_PATTERNS = {
  PROMISE_TO_DELIVER: ['I\'ll send', 'I will send', 'I\'ll get you', 'I\'ll bring', 'will drop off', 'I\'ll have'],
  PROMISE_TO_CALL: ['I\'ll call', 'I will call', 'give you a call', 'reach out', 'get back to you'],
  PROMISE_TO_DO: ['I\'ll do', 'I will', 'I\'ll take care', 'I\'ll handle', 'I\'ll make sure', 'will definitely'],
  PROMISE_TIME: ['by tomorrow', 'by Monday', 'by end of', 'this week', 'next week', 'by Friday'],
  PROMISE_PRODUCT: ['save you', 'set aside', 'reserve', 'hold for you', 'put your name on'],
  SCHEDULING: ['let\'s meet', 'how about', 'can we', 'are you free', 'what time works'],
  FOLLOW_UP_NEEDED: ['let me check', 'I\'ll find out', 'get back to you on', 'look into']
};

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

function initializeSMSSystem() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  createSheetWithHeaders(ss, SMS_LOG_SHEET, SMS_LOG_HEADERS, '#00695C');
  createSheetWithHeaders(ss, SMS_COMMITMENTS_SHEET, SMS_COMMITMENTS_HEADERS, '#004D40');
  createSheetWithHeaders(ss, SMS_CONTACTS_SHEET, SMS_CONTACTS_HEADERS, '#00897B');

  return {
    success: true,
    message: 'SMS integration system initialized',
    sheets: [SMS_LOG_SHEET, SMS_COMMITMENTS_SHEET, SMS_CONTACTS_SHEET]
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK ENDPOINT FOR iOS SHORTCUTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Receives SMS data from iOS Shortcuts
 * POST body: { sender, senderName, message, timestamp, direction }
 */
function receiveSMS(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Validate required fields
    if (!data.message) {
      return { success: false, error: 'Message text is required' };
    }

    const smsId = 'SMS-' + Date.now();
    const receivedAt = data.timestamp ? new Date(data.timestamp) : new Date();
    const direction = data.direction || 'INBOUND';
    const senderName = data.senderName || data.sender || 'Unknown';
    const phoneNumber = normalizePhoneNumber(data.sender || '');

    // Analyze message for commitments
    const analysis = analyzeSMSForCommitments(data.message, direction);

    // Log the SMS
    let logSheet = ss.getSheetByName(SMS_LOG_SHEET);
    if (!logSheet) {
      initializeSMSSystem();
      logSheet = ss.getSheetByName(SMS_LOG_SHEET);
    }

    const logRow = SMS_LOG_HEADERS.map(header => {
      switch(header) {
        case 'SMS_ID': return smsId;
        case 'Direction': return direction;
        case 'Contact_Name': return senderName;
        case 'Phone_Number': return phoneNumber;
        case 'Message_Text': return data.message;
        case 'Received_At': return receivedAt.toISOString();
        case 'Processed_At': return new Date().toISOString();
        case 'Has_Commitment': return analysis.hasCommitment ? 'Yes' : 'No';
        case 'Commitment_Extracted': return analysis.commitments.map(c => c.text).join('; ');
        case 'Task_Created': return '';
        case 'AI_Analysis': return JSON.stringify(analysis);
        case 'Status': return 'Processed';
        default: return '';
      }
    });
    logSheet.appendRow(logRow);

    // Update contact record
    updateSMSContact(ss, phoneNumber, senderName, direction);

    // Process any commitments found
    let tasksCreated = [];
    if (analysis.hasCommitment && analysis.commitments.length > 0) {
      tasksCreated = createCommitmentsFromSMS(ss, smsId, senderName, phoneNumber, data.message, analysis);
    }

    // Create proactive alert if needed
    if (analysis.urgency === 'HIGH' || analysis.needsImmediateAction) {
      createProactiveAlert({
        type: 'SMS_URGENT',
        priority: 'HIGH',
        title: `Urgent SMS from ${senderName}`,
        message: data.message.substring(0, 200),
        action: analysis.suggestedAction || 'Review and respond promptly',
        data: { smsId, phoneNumber, analysis }
      });
    }

    return {
      success: true,
      smsId: smsId,
      hasCommitment: analysis.hasCommitment,
      commitmentCount: analysis.commitments.length,
      tasksCreated: tasksCreated.length,
      analysis: analysis
    };

  } catch (error) {
    console.error('Error processing SMS:', error);
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMITMENT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

function analyzeSMSForCommitments(messageText, direction) {
  const analysis = {
    hasCommitment: false,
    commitments: [],
    urgency: 'NORMAL',
    needsImmediateAction: false,
    sentiment: 'NEUTRAL',
    topics: [],
    suggestedAction: null
  };

  const lowerMessage = messageText.toLowerCase();

  // Check for commitment patterns
  for (const [commitmentType, patterns] of Object.entries(COMMITMENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerMessage.includes(pattern.toLowerCase())) {
        analysis.hasCommitment = true;
        analysis.commitments.push({
          type: commitmentType,
          pattern: pattern,
          text: extractCommitmentContext(messageText, pattern),
          dueDate: extractDueDate(messageText)
        });
      }
    }
  }

  // Determine urgency
  const urgentPatterns = ['asap', 'urgent', 'emergency', 'right away', 'immediately', 'today'];
  if (urgentPatterns.some(p => lowerMessage.includes(p))) {
    analysis.urgency = 'HIGH';
    analysis.needsImmediateAction = true;
  }

  // Check for questions requiring response
  if (messageText.includes('?') && direction === 'INBOUND') {
    analysis.needsImmediateAction = true;
    analysis.suggestedAction = 'Customer asked a question - respond soon';
  }

  // Detect topics
  const topicKeywords = {
    'DELIVERY': ['deliver', 'drop off', 'pickup', 'pick up'],
    'ORDER': ['order', 'purchase', 'buy', 'want to get'],
    'CSA': ['csa', 'share', 'subscription', 'weekly'],
    'MARKET': ['market', 'saturday', 'stand', 'booth'],
    'PAYMENT': ['pay', 'venmo', 'cash', 'invoice', 'owe'],
    'PRODUCE': ['tomato', 'lettuce', 'vegetable', 'fruit', 'herb']
  };

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(k => lowerMessage.includes(k))) {
      analysis.topics.push(topic);
    }
  }

  // Determine sentiment
  const positiveWords = ['thanks', 'thank you', 'great', 'awesome', 'perfect', 'love', 'amazing'];
  const negativeWords = ['problem', 'issue', 'wrong', 'bad', 'disappointed', 'unhappy', 'complaint'];

  if (positiveWords.some(w => lowerMessage.includes(w))) {
    analysis.sentiment = 'POSITIVE';
  } else if (negativeWords.some(w => lowerMessage.includes(w))) {
    analysis.sentiment = 'NEGATIVE';
    analysis.urgency = 'HIGH';
    analysis.suggestedAction = 'Customer may have a concern - prioritize response';
  }

  // If outbound and has commitment, we made a promise
  if (direction === 'OUTBOUND' && analysis.hasCommitment) {
    analysis.suggestedAction = 'You made a commitment - ensure follow-through';
  }

  return analysis;
}

function extractCommitmentContext(message, pattern) {
  // Find the sentence containing the pattern
  const sentences = message.split(/[.!?]+/);
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(pattern.toLowerCase())) {
      return sentence.trim();
    }
  }
  return message.substring(0, 100);
}

function extractDueDate(message) {
  const lowerMessage = message.toLowerCase();
  const today = new Date();

  // Pattern matching for dates
  if (lowerMessage.includes('today')) {
    return today.toISOString().split('T')[0];
  }
  if (lowerMessage.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
  if (lowerMessage.includes('this week') || lowerMessage.includes('by friday')) {
    const friday = new Date(today);
    friday.setDate(friday.getDate() + (5 - friday.getDay() + 7) % 7);
    return friday.toISOString().split('T')[0];
  }
  if (lowerMessage.includes('next week') || lowerMessage.includes('by monday')) {
    const nextMonday = new Date(today);
    nextMonday.setDate(nextMonday.getDate() + (8 - nextMonday.getDay()) % 7);
    return nextMonday.toISOString().split('T')[0];
  }

  // Look for day names
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lowerMessage.includes(days[i])) {
      const targetDate = new Date(today);
      const daysUntil = (i - today.getDay() + 7) % 7 || 7;
      targetDate.setDate(targetDate.getDate() + daysUntil);
      return targetDate.toISOString().split('T')[0];
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMITMENT TRACKING
// ═══════════════════════════════════════════════════════════════════════════

function createCommitmentsFromSMS(ss, smsId, contactName, phoneNumber, originalMessage, analysis) {
  const commitmentSheet = ss.getSheetByName(SMS_COMMITMENTS_SHEET);
  const tasksCreated = [];

  for (const commitment of analysis.commitments) {
    const commitmentId = 'SMSC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

    // Determine priority based on urgency and type
    let priority = 'MEDIUM';
    if (analysis.urgency === 'HIGH') priority = 'HIGH';
    if (commitment.type === 'PROMISE_TO_DELIVER' || commitment.type === 'SCHEDULING') priority = 'HIGH';

    const commitmentRow = SMS_COMMITMENTS_HEADERS.map(header => {
      switch(header) {
        case 'Commitment_ID': return commitmentId;
        case 'SMS_ID': return smsId;
        case 'Contact_Name': return contactName;
        case 'Phone_Number': return phoneNumber;
        case 'Commitment_Text': return commitment.text;
        case 'Original_Message': return originalMessage;
        case 'Commitment_Type': return commitment.type;
        case 'Due_Date': return commitment.dueDate || '';
        case 'Priority': return priority;
        case 'Status': return 'OPEN';
        case 'Task_ID': return '';
        case 'Reminder_Sent': return 'No';
        case 'Completed_At': return '';
        case 'Created_At': return new Date().toISOString();
        case 'Updated_At': return new Date().toISOString();
        default: return '';
      }
    });

    commitmentSheet.appendRow(commitmentRow);

    // Also create a proactive alert for high-priority commitments
    if (priority === 'HIGH') {
      createProactiveAlert({
        type: 'SMS_COMMITMENT',
        priority: priority,
        title: `SMS Commitment: ${commitment.type.replace(/_/g, ' ')}`,
        message: commitment.text,
        action: `Follow up with ${contactName}`,
        data: { commitmentId, contactName, phoneNumber, dueDate: commitment.dueDate }
      });
    }

    tasksCreated.push(commitmentId);
  }

  return tasksCreated;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function updateSMSContact(ss, phoneNumber, contactName, direction) {
  if (!phoneNumber) return;

  let contactSheet = ss.getSheetByName(SMS_CONTACTS_SHEET);
  if (!contactSheet) return;

  const data = contactSheet.getDataRange().getValues();
  const headers = data[0];
  const phoneCol = headers.indexOf('Phone_Number');

  // Find existing contact
  let existingRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (normalizePhoneNumber(data[i][phoneCol]) === phoneNumber) {
      existingRow = i + 1;
      break;
    }
  }

  if (existingRow > 0) {
    // Update existing contact
    const totalMsgCol = headers.indexOf('Total_Messages');
    const lastMsgCol = headers.indexOf('Last_Message_At');
    const updatedCol = headers.indexOf('Updated_At');

    const currentTotal = contactSheet.getRange(existingRow, totalMsgCol + 1).getValue() || 0;
    contactSheet.getRange(existingRow, totalMsgCol + 1).setValue(currentTotal + 1);
    contactSheet.getRange(existingRow, lastMsgCol + 1).setValue(new Date().toISOString());
    contactSheet.getRange(existingRow, updatedCol + 1).setValue(new Date().toISOString());

    // Update name if we have a better one
    if (contactName && contactName !== 'Unknown') {
      const nameCol = headers.indexOf('Contact_Name');
      contactSheet.getRange(existingRow, nameCol + 1).setValue(contactName);
    }
  } else {
    // Create new contact
    const contactId = 'SMSCONT-' + Date.now();
    const newRow = SMS_CONTACTS_HEADERS.map(header => {
      switch(header) {
        case 'Contact_ID': return contactId;
        case 'Phone_Number': return phoneNumber;
        case 'Contact_Name': return contactName;
        case 'Contact_Type': return 'Customer';
        case 'Company': return '';
        case 'Email': return '';
        case 'Customer_ID': return '';
        case 'Total_Messages': return 1;
        case 'Last_Message_At': return new Date().toISOString();
        case 'Open_Commitments': return 0;
        case 'Notes': return '';
        case 'Created_At': return new Date().toISOString();
        case 'Updated_At': return new Date().toISOString();
        default: return '';
      }
    });
    contactSheet.appendRow(newRow);
  }
}

function normalizePhoneNumber(phone) {
  if (!phone) return '';
  // Remove all non-numeric characters
  return phone.replace(/\D/g, '').slice(-10);
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD & REPORTING
// ═══════════════════════════════════════════════════════════════════════════

function getSMSDashboard() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Get SMS log stats
    const logSheet = ss.getSheetByName(SMS_LOG_SHEET);
    const commitmentSheet = ss.getSheetByName(SMS_COMMITMENTS_SHEET);

    let totalMessages = 0;
    let messagesWithCommitments = 0;
    let recentMessages = [];

    if (logSheet && logSheet.getLastRow() > 1) {
      const logData = logSheet.getDataRange().getValues();
      const headers = logData[0];
      totalMessages = logData.length - 1;

      // Get recent messages (last 10)
      const startRow = Math.max(1, logData.length - 10);
      for (let i = logData.length - 1; i >= startRow; i--) {
        const row = logData[i];
        recentMessages.push({
          smsId: row[headers.indexOf('SMS_ID')],
          direction: row[headers.indexOf('Direction')],
          contactName: row[headers.indexOf('Contact_Name')],
          message: row[headers.indexOf('Message_Text')],
          receivedAt: row[headers.indexOf('Received_At')],
          hasCommitment: row[headers.indexOf('Has_Commitment')] === 'Yes'
        });
        if (row[headers.indexOf('Has_Commitment')] === 'Yes') {
          messagesWithCommitments++;
        }
      }
    }

    // Get open commitments
    let openCommitments = [];
    let overdueCommitments = [];
    const today = new Date().toISOString().split('T')[0];

    if (commitmentSheet && commitmentSheet.getLastRow() > 1) {
      const commitData = commitmentSheet.getDataRange().getValues();
      const headers = commitData[0];

      for (let i = 1; i < commitData.length; i++) {
        const row = commitData[i];
        if (row[headers.indexOf('Status')] === 'OPEN') {
          const commitment = {
            id: row[headers.indexOf('Commitment_ID')],
            contactName: row[headers.indexOf('Contact_Name')],
            text: row[headers.indexOf('Commitment_Text')],
            type: row[headers.indexOf('Commitment_Type')],
            dueDate: row[headers.indexOf('Due_Date')],
            priority: row[headers.indexOf('Priority')],
            createdAt: row[headers.indexOf('Created_At')]
          };
          openCommitments.push(commitment);

          if (commitment.dueDate && commitment.dueDate < today) {
            overdueCommitments.push(commitment);
          }
        }
      }
    }

    return {
      success: true,
      stats: {
        totalMessages,
        messagesWithCommitments,
        openCommitments: openCommitments.length,
        overdueCommitments: overdueCommitments.length
      },
      recentMessages,
      openCommitments: openCommitments.slice(0, 20),
      overdueCommitments,
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getOpenSMSCommitments(params = {}) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SMS_COMMITMENTS_SHEET);

    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: true, commitments: [] };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const commitments = [];

    const filterStatus = params.status || 'OPEN';
    const filterPriority = params.priority;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[headers.indexOf('Status')];
      const priority = row[headers.indexOf('Priority')];

      if (status !== filterStatus) continue;
      if (filterPriority && priority !== filterPriority) continue;

      commitments.push({
        id: row[headers.indexOf('Commitment_ID')],
        smsId: row[headers.indexOf('SMS_ID')],
        contactName: row[headers.indexOf('Contact_Name')],
        phoneNumber: row[headers.indexOf('Phone_Number')],
        commitmentText: row[headers.indexOf('Commitment_Text')],
        originalMessage: row[headers.indexOf('Original_Message')],
        type: row[headers.indexOf('Commitment_Type')],
        dueDate: row[headers.indexOf('Due_Date')],
        priority: row[headers.indexOf('Priority')],
        status: status,
        createdAt: row[headers.indexOf('Created_At')]
      });
    }

    // Sort by priority then due date
    commitments.sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

    return { success: true, commitments };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function completeSMSCommitment(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SMS_COMMITMENTS_SHEET);

    if (!sheet || !data.commitmentId) {
      return { success: false, error: 'Invalid request' };
    }

    const sheetData = sheet.getDataRange().getValues();
    const headers = sheetData[0];
    const idCol = headers.indexOf('Commitment_ID');

    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][idCol] === data.commitmentId) {
        const statusCol = headers.indexOf('Status');
        const completedCol = headers.indexOf('Completed_At');
        const updatedCol = headers.indexOf('Updated_At');

        sheet.getRange(i + 1, statusCol + 1).setValue('COMPLETED');
        sheet.getRange(i + 1, completedCol + 1).setValue(new Date().toISOString());
        sheet.getRange(i + 1, updatedCol + 1).setValue(new Date().toISOString());

        return { success: true, message: 'Commitment marked as completed' };
      }
    }

    return { success: false, error: 'Commitment not found' };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Create proactive alert (uses existing system)
// ═══════════════════════════════════════════════════════════════════════════

function createProactiveAlert(alertData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(PROACTIVE_ALERTS_SHEET);

    if (!sheet) {
      // Fallback if proactive system not initialized
      console.log('Proactive alert:', JSON.stringify(alertData));
      return;
    }

    const alertId = 'ALERT-' + Date.now();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expire in 7 days

    const alertRow = [
      alertId,
      alertData.type,
      alertData.priority,
      alertData.title,
      alertData.message,
      alertData.action,
      JSON.stringify(alertData.data || {}),
      new Date().toISOString(),
      expiresAt.toISOString(),
      'ACTIVE',
      '', '', '', ''
    ];

    sheet.appendRow(alertRow);

  } catch (error) {
    console.error('Error creating proactive alert:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DAILY COMMITMENT REMINDER
// ═══════════════════════════════════════════════════════════════════════════

function checkSMSCommitmentsDue() {
  try {
    const result = getOpenSMSCommitments({ status: 'OPEN' });
    if (!result.success) return;

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const dueSoon = result.commitments.filter(c =>
      c.dueDate && (c.dueDate <= tomorrowStr)
    );

    if (dueSoon.length > 0) {
      // Create summary alert
      createProactiveAlert({
        type: 'SMS_COMMITMENTS_DUE',
        priority: 'HIGH',
        title: `${dueSoon.length} SMS Commitments Due Soon`,
        message: dueSoon.map(c => `${c.contactName}: ${c.commitmentText.substring(0, 50)}...`).join('\n'),
        action: 'Review and complete these commitments',
        data: { commitmentIds: dueSoon.map(c => c.id) }
      });
    }

    return {
      success: true,
      checked: result.commitments.length,
      dueSoon: dueSoon.length
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
