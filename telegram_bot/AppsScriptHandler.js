/**
 * Google Apps Script Handler for Telegram Bot Integration
 *
 * Add this code to your existing Google Apps Script deployment
 * to handle Telegram bot messages and responses.
 *
 * This handles the following actions:
 * - sendClaudeMessage: Receives messages from Telegram, stores for Claude
 * - getClaudeResponses: Returns pending responses for Telegram
 */

// Sheet names for message queue
const TELEGRAM_INBOX_SHEET = 'TelegramInbox';
const TELEGRAM_OUTBOX_SHEET = 'TelegramOutbox';

/**
 * Handle Telegram-related API actions
 * Add this to your existing doGet() function's switch statement
 */
function handleTelegramAction(action, params) {
  switch (action) {
    case 'sendClaudeMessage':
      return handleSendClaudeMessage(params);
    case 'getClaudeResponses':
      return handleGetClaudeResponses(params);
    default:
      return { success: false, error: 'Unknown Telegram action' };
  }
}

/**
 * Receive a message from Telegram and queue it for Claude
 */
function handleSendClaudeMessage(params) {
  try {
    const message = params.message;
    const chatId = params.chatId;
    const source = params.source || 'telegram';
    const timestamp = params.timestamp || new Date().toISOString();

    if (!message) {
      return { success: false, error: 'No message provided' };
    }

    // Get or create inbox sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(TELEGRAM_INBOX_SHEET);

    if (!sheet) {
      sheet = ss.insertSheet(TELEGRAM_INBOX_SHEET);
      sheet.appendRow(['ID', 'Timestamp', 'ChatID', 'Source', 'Message', 'Status', 'ProcessedAt']);
    }

    // Generate unique ID
    const id = Utilities.getUuid();

    // Add message to inbox
    sheet.appendRow([
      id,
      timestamp,
      chatId,
      source,
      message,
      'pending',
      ''
    ]);

    // Also write to the main INBOX file if it exists
    try {
      const inboxFile = DriveApp.getFilesByName('INBOX.md');
      if (inboxFile.hasNext()) {
        const file = inboxFile.next();
        const content = file.getBlob().getDataAsString();
        const newEntry = `\n\n## Telegram Message - ${timestamp}\nFrom: Chat ${chatId}\nSource: ${source}\n\n${message}\n`;
        file.setContent(content + newEntry);
      }
    } catch (e) {
      // Continue even if INBOX.md update fails
      console.log('Could not update INBOX.md:', e.message);
    }

    return {
      success: true,
      id: id,
      message: 'Message queued for Claude'
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get pending responses for Telegram
 */
function handleGetClaudeResponses(params) {
  try {
    const source = params.source || 'telegram';
    const since = params.since ? parseInt(params.since) : 0;

    // Get outbox sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(TELEGRAM_OUTBOX_SHEET);

    if (!sheet) {
      // Create outbox sheet if it doesn't exist
      sheet = ss.insertSheet(TELEGRAM_OUTBOX_SHEET);
      sheet.appendRow(['ID', 'Timestamp', 'ChatID', 'Source', 'Message', 'Sent']);
      return { success: true, responses: [] };
    }

    const data = sheet.getDataRange().getValues();
    const responses = [];

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const id = row[0];
      const timestamp = row[1];
      const rowSource = row[3];
      const message = row[4];
      const sent = row[5];

      // Check if this response should be sent
      if (rowSource === source && !sent) {
        const rowTimestamp = new Date(timestamp).getTime();
        if (rowTimestamp > since) {
          responses.push({
            id: id,
            timestamp: rowTimestamp,
            message: message
          });

          // Mark as sent
          sheet.getRange(i + 1, 6).setValue(new Date().toISOString());
        }
      }
    }

    return {
      success: true,
      responses: responses
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      responses: []
    };
  }
}

/**
 * Send a response to Telegram (call this from Claude or other processes)
 *
 * @param {string} message - The response message
 * @param {string} chatId - The Telegram chat ID to send to
 * @param {string} source - Source identifier (default: 'telegram')
 */
function sendTelegramResponse(message, chatId, source) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TELEGRAM_OUTBOX_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(TELEGRAM_OUTBOX_SHEET);
    sheet.appendRow(['ID', 'Timestamp', 'ChatID', 'Source', 'Message', 'Sent']);
  }

  const id = Utilities.getUuid();

  sheet.appendRow([
    id,
    new Date().toISOString(),
    chatId || '',
    source || 'telegram',
    message,
    '' // Not sent yet
  ]);

  return id;
}

/**
 * Process pending Telegram messages (run via trigger or manually)
 * This function reads the inbox and generates responses
 */
function processTelegramInbox() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const inboxSheet = ss.getSheetByName(TELEGRAM_INBOX_SHEET);

  if (!inboxSheet) {
    return { processed: 0 };
  }

  const data = inboxSheet.getDataRange().getValues();
  let processed = 0;

  // Skip header
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[5];

    if (status === 'pending') {
      const id = row[0];
      const chatId = row[2];
      const message = row[4];

      // Mark as processing
      inboxSheet.getRange(i + 1, 6).setValue('processing');

      // Here you would integrate with your Claude processing system
      // For now, we'll add a placeholder response
      const response = `Message received: "${message.substring(0, 50)}..."\n\nThis will be processed by Claude.`;

      // Send response
      sendTelegramResponse(response, chatId, 'telegram');

      // Mark as processed
      inboxSheet.getRange(i + 1, 6).setValue('processed');
      inboxSheet.getRange(i + 1, 7).setValue(new Date().toISOString());

      processed++;
    }
  }

  return { processed: processed };
}

/**
 * Example: Add to your existing doGet function
 *
 * function doGet(e) {
 *   const action = e.parameter.action;
 *
 *   // Handle Telegram actions
 *   if (action === 'sendClaudeMessage' || action === 'getClaudeResponses') {
 *     const result = handleTelegramAction(action, e.parameter);
 *     return ContentService.createTextOutput(JSON.stringify(result))
 *       .setMimeType(ContentService.MimeType.JSON);
 *   }
 *
 *   // ... your other action handlers
 * }
 */
