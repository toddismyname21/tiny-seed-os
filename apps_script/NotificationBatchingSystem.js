/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NOTIFICATION BATCHING SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Intelligent notification batching for Tiny Seed Farm OS
 * Phase 5 of the State-of-the-Art Task Management System
 *
 * PRIORITY LEVELS:
 * - IMMEDIATE: Send now (frost warning, critical at-risk tasks)
 * - HIGH: Within 15 minutes (task assignments, deadlines today)
 * - MEDIUM: Batched hourly (status updates, completions)
 * - LOW: Daily digest (seasonal reminders, benchmarks)
 *
 * Created: 2026-02-03 by Backend_Claude
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const NOTIFICATION_CONFIG = {
  SHEET_NAME: 'NotificationQueue',
  PREFERENCES_SHEET: 'NotificationPreferences',
  LOG_SHEET: 'NotificationLog',

  // Processing intervals (in minutes)
  HIGH_PRIORITY_INTERVAL: 15,
  MEDIUM_PRIORITY_INTERVAL: 60,

  // Daily digest time (24-hour format)
  DIGEST_HOUR: 18, // 6 PM

  // Default quiet hours (10 PM - 6 AM)
  DEFAULT_QUIET_START: 22,
  DEFAULT_QUIET_END: 6,

  // Max notifications per batch
  MAX_BATCH_SIZE: 20,

  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY_MINUTES: 5
};

const NOTIFICATION_PRIORITIES = {
  IMMEDIATE: 'IMMEDIATE',  // Send now - frost, critical issues
  HIGH: 'HIGH',            // Within 15 minutes - assignments, deadlines
  MEDIUM: 'MEDIUM',        // Hourly batching - status updates
  LOW: 'LOW'               // Daily digest - reminders, benchmarks
};

const NOTIFICATION_TYPES = {
  // Critical/Immediate
  FROST_WARNING: 'FROST_WARNING',
  CRITICAL_AT_RISK: 'CRITICAL_AT_RISK',
  SYSTEM_ALERT: 'SYSTEM_ALERT',

  // High Priority
  TASK_ASSIGNMENT: 'TASK_ASSIGNMENT',
  DEADLINE_TODAY: 'DEADLINE_TODAY',
  TASK_BLOCKED: 'TASK_BLOCKED',
  APPROVAL_NEEDED: 'APPROVAL_NEEDED',

  // Medium Priority
  TASK_COMPLETED: 'TASK_COMPLETED',
  STATUS_UPDATE: 'STATUS_UPDATE',
  ORDER_UPDATE: 'ORDER_UPDATE',

  // Low Priority
  SEASONAL_REMINDER: 'SEASONAL_REMINDER',
  BENCHMARK_REPORT: 'BENCHMARK_REPORT',
  WEEKLY_SUMMARY: 'WEEKLY_SUMMARY',
  PROACTIVE_SUGGESTION: 'PROACTIVE_SUGGESTION'
};

const NOTIFICATION_CHANNELS = {
  SMS: 'SMS',
  EMAIL: 'EMAIL',
  PUSH: 'PUSH',        // For future PWA implementation
  TELEGRAM: 'TELEGRAM'
};

const NOTIFICATION_HEADERS = [
  'Notification_ID',
  'Type',
  'Priority',
  'Recipient_ID',
  'Recipient_Name',
  'Recipient_Phone',
  'Recipient_Email',
  'Channel',
  'Subject',
  'Message',
  'Data',
  'Created_At',
  'Scheduled_For',
  'Sent_At',
  'Status',
  'Retry_Count',
  'Error_Message',
  'Batch_ID'
];

const PREFERENCES_HEADERS = [
  'User_ID',
  'User_Name',
  'Email',
  'Phone',
  'SMS_Enabled',
  'Email_Enabled',
  'Push_Enabled',
  'Telegram_Enabled',
  'Telegram_Chat_ID',
  'Quiet_Hours_Start',
  'Quiet_Hours_End',
  'Digest_Time',
  'Immediate_Override',
  'Updated_At'
];

// ═══════════════════════════════════════════════════════════════════════════
// SHEET INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize all notification-related sheets
 */
function initializeNotificationSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const results = {};

  // Create NotificationQueue sheet
  results.queue = createNotificationSheet(ss, NOTIFICATION_CONFIG.SHEET_NAME, NOTIFICATION_HEADERS, '#ef4444');

  // Create NotificationPreferences sheet
  results.preferences = createNotificationSheet(ss, NOTIFICATION_CONFIG.PREFERENCES_SHEET, PREFERENCES_HEADERS, '#3b82f6');

  // Create NotificationLog sheet (for history)
  const logHeaders = [...NOTIFICATION_HEADERS, 'Processed_At'];
  results.log = createNotificationSheet(ss, NOTIFICATION_CONFIG.LOG_SHEET, logHeaders, '#6b7280');

  return {
    success: true,
    message: 'Notification sheets initialized',
    results: results
  };
}

/**
 * Helper to create a sheet with headers
 */
function createNotificationSheet(ss, sheetName, headers, headerColor) {
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground(headerColor)
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);

    // Set column widths
    sheet.setColumnWidth(1, 180); // ID
    sheet.setColumnWidth(10, 300); // Message

    return { created: true, sheetName: sheetName };
  }

  return { created: false, sheetName: sheetName, exists: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// QUEUE NOTIFICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Queue a notification for later processing
 * @param {string} priority - IMMEDIATE, HIGH, MEDIUM, LOW
 * @param {string} type - Notification type from NOTIFICATION_TYPES
 * @param {string} recipientId - User ID to notify
 * @param {string} message - Notification message
 * @param {Object} data - Additional data (optional)
 * @returns {Object} Result with notification ID
 */
function queueNotification(priority, type, recipientId, message, data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(NOTIFICATION_CONFIG.SHEET_NAME);

    if (!sheet) {
      initializeNotificationSheets();
      sheet = ss.getSheetByName(NOTIFICATION_CONFIG.SHEET_NAME);
    }

    // Generate notification ID
    const notificationId = 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

    // Get recipient info
    const recipient = getRecipientInfo(recipientId);
    if (!recipient.success) {
      return { success: false, error: 'Recipient not found: ' + recipientId };
    }

    // Get user preferences
    const prefs = getNotificationPreferences(recipientId);

    // Determine channel based on priority and preferences
    const channel = determineNotificationChannel(priority, type, prefs);

    // Calculate scheduled time
    const scheduledFor = calculateScheduledTime(priority, prefs);

    // Check if immediate - send right away
    if (priority === NOTIFICATION_PRIORITIES.IMMEDIATE) {
      const sendResult = sendImmediateNotification(type, recipient, message, channel, data);

      // Log it
      logNotification({
        notificationId: notificationId,
        type: type,
        priority: priority,
        recipient: recipient,
        channel: channel,
        message: message,
        data: data,
        status: sendResult.success ? 'SENT' : 'FAILED',
        sentAt: new Date().toISOString(),
        error: sendResult.error || null
      });

      return {
        success: sendResult.success,
        notificationId: notificationId,
        sentImmediately: true,
        channel: channel,
        error: sendResult.error
      };
    }

    // Queue for later processing
    const subject = generateSubject(type, data);
    const row = [
      notificationId,
      type,
      priority,
      recipientId,
      recipient.name,
      recipient.phone,
      recipient.email,
      channel,
      subject,
      message,
      JSON.stringify(data || {}),
      new Date().toISOString(),
      scheduledFor,
      '', // Sent_At
      'PENDING',
      0,  // Retry_Count
      '', // Error_Message
      ''  // Batch_ID
    ];

    sheet.appendRow(row);

    return {
      success: true,
      notificationId: notificationId,
      queued: true,
      scheduledFor: scheduledFor,
      channel: channel,
      priority: priority
    };

  } catch (error) {
    Logger.log('queueNotification error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Get recipient information from USERS sheet
 */
function getRecipientInfo(userId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('USERS') || ss.getSheetByName('EMPLOYEES');

    if (!sheet) {
      return { success: false, error: 'USERS sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const idCol = headers.indexOf('User_ID') !== -1 ? headers.indexOf('User_ID') : headers.indexOf('Employee_ID');
    const nameCol = headers.indexOf('Name') !== -1 ? headers.indexOf('Name') : headers.indexOf('First_Name');
    const phoneCol = headers.indexOf('Phone');
    const emailCol = headers.indexOf('Email');

    for (let i = 1; i < data.length; i++) {
      if (data[i][idCol] === userId) {
        return {
          success: true,
          userId: userId,
          name: data[i][nameCol] || 'User',
          phone: data[i][phoneCol] || '',
          email: data[i][emailCol] || ''
        };
      }
    }

    return { success: false, error: 'User not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Determine the best notification channel based on priority and user preferences
 */
function determineNotificationChannel(priority, type, prefs) {
  // Critical notifications always try SMS first
  if (priority === NOTIFICATION_PRIORITIES.IMMEDIATE) {
    if (prefs.smsEnabled && prefs.phone) {
      return NOTIFICATION_CHANNELS.SMS;
    }
    if (prefs.telegramEnabled && prefs.telegramChatId) {
      return NOTIFICATION_CHANNELS.TELEGRAM;
    }
    return NOTIFICATION_CHANNELS.EMAIL;
  }

  // High priority - prefer SMS during work hours
  if (priority === NOTIFICATION_PRIORITIES.HIGH) {
    const hour = new Date().getHours();
    if (hour >= 7 && hour <= 20 && prefs.smsEnabled && prefs.phone) {
      return NOTIFICATION_CHANNELS.SMS;
    }
    return NOTIFICATION_CHANNELS.EMAIL;
  }

  // Medium and Low priority - email for batching
  return NOTIFICATION_CHANNELS.EMAIL;
}

/**
 * Calculate when notification should be sent
 */
function calculateScheduledTime(priority, prefs) {
  const now = new Date();

  switch (priority) {
    case NOTIFICATION_PRIORITIES.IMMEDIATE:
      return now.toISOString();

    case NOTIFICATION_PRIORITIES.HIGH:
      // Next 15-minute interval
      const highMinutes = Math.ceil(now.getMinutes() / 15) * 15;
      const highTime = new Date(now);
      highTime.setMinutes(highMinutes, 0, 0);
      if (highTime <= now) {
        highTime.setMinutes(highTime.getMinutes() + 15);
      }
      return highTime.toISOString();

    case NOTIFICATION_PRIORITIES.MEDIUM:
      // Next hour
      const mediumTime = new Date(now);
      mediumTime.setMinutes(0, 0, 0);
      mediumTime.setHours(mediumTime.getHours() + 1);
      return mediumTime.toISOString();

    case NOTIFICATION_PRIORITIES.LOW:
      // Next digest time (default 6 PM)
      const digestHour = prefs.digestTime || NOTIFICATION_CONFIG.DIGEST_HOUR;
      const lowTime = new Date(now);
      lowTime.setHours(digestHour, 0, 0, 0);
      if (lowTime <= now) {
        lowTime.setDate(lowTime.getDate() + 1);
      }
      return lowTime.toISOString();

    default:
      return now.toISOString();
  }
}

/**
 * Generate subject line based on notification type
 */
function generateSubject(type, data) {
  const subjects = {
    [NOTIFICATION_TYPES.FROST_WARNING]: 'FROST WARNING - Protect Crops',
    [NOTIFICATION_TYPES.CRITICAL_AT_RISK]: 'CRITICAL: Task At Risk',
    [NOTIFICATION_TYPES.SYSTEM_ALERT]: 'System Alert',
    [NOTIFICATION_TYPES.TASK_ASSIGNMENT]: 'New Task Assigned',
    [NOTIFICATION_TYPES.DEADLINE_TODAY]: 'Deadline Today',
    [NOTIFICATION_TYPES.TASK_BLOCKED]: 'Task Blocked',
    [NOTIFICATION_TYPES.APPROVAL_NEEDED]: 'Approval Required',
    [NOTIFICATION_TYPES.TASK_COMPLETED]: 'Task Completed',
    [NOTIFICATION_TYPES.STATUS_UPDATE]: 'Status Update',
    [NOTIFICATION_TYPES.ORDER_UPDATE]: 'Order Update',
    [NOTIFICATION_TYPES.SEASONAL_REMINDER]: 'Seasonal Reminder',
    [NOTIFICATION_TYPES.BENCHMARK_REPORT]: 'Benchmark Report',
    [NOTIFICATION_TYPES.WEEKLY_SUMMARY]: 'Weekly Summary',
    [NOTIFICATION_TYPES.PROACTIVE_SUGGESTION]: 'Suggestion'
  };

  let subject = subjects[type] || 'Tiny Seed Farm Notification';

  // Add context from data if available
  if (data && data.taskTitle) {
    subject += ': ' + data.taskTitle.substring(0, 30);
  }

  return subject;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEND IMMEDIATE NOTIFICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send a notification immediately, bypassing the queue
 * Used for critical alerts like frost warnings
 */
function sendImmediateNotification(type, recipient, message, channel, data) {
  try {
    const subject = generateSubject(type, data);

    switch (channel) {
      case NOTIFICATION_CHANNELS.SMS:
        return sendNotificationSMS(recipient.phone, message);

      case NOTIFICATION_CHANNELS.TELEGRAM:
        return sendNotificationTelegram(recipient.telegramChatId, message);

      case NOTIFICATION_CHANNELS.EMAIL:
      default:
        return sendNotificationEmail(recipient.email, subject, message, type, data);
    }
  } catch (error) {
    Logger.log('sendImmediateNotification error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Send SMS notification
 */
function sendNotificationSMS(phone, message) {
  if (!phone) {
    return { success: false, error: 'No phone number provided' };
  }

  // Use existing sendSMS function
  const result = sendSMS({ to: phone, message: '[Tiny Seed Farm] ' + message });
  return result;
}

/**
 * Send Telegram notification
 */
function sendNotificationTelegram(chatId, message) {
  if (!chatId) {
    return { success: false, error: 'No Telegram chat ID' };
  }

  try {
    const result = sendTelegramMessage(chatId, message);
    return { success: result, channel: 'TELEGRAM' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Send Email notification
 */
function sendNotificationEmail(email, subject, message, type, data) {
  if (!email) {
    return { success: false, error: 'No email address provided' };
  }

  try {
    // Build HTML email
    const htmlBody = buildNotificationEmailHTML(subject, message, type, data);

    GmailApp.sendEmail(email, subject, message, {
      htmlBody: htmlBody,
      name: 'Tiny Seed Farm'
    });

    return { success: true, channel: 'EMAIL' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Build HTML email body for notification
 */
function buildNotificationEmailHTML(subject, message, type, data) {
  // Determine color based on type
  let color = '#22c55e'; // Green default
  if (type.includes('CRITICAL') || type.includes('FROST') || type.includes('ALERT')) {
    color = '#ef4444'; // Red
  } else if (type.includes('DEADLINE') || type.includes('BLOCKED') || type.includes('APPROVAL')) {
    color = '#f59e0b'; // Orange
  } else if (type.includes('TASK')) {
    color = '#3b82f6'; // Blue
  }

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">${subject}</h2>
      </div>
      <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">${message}</p>
        ${data && data.actionUrl ? `
          <div style="margin-top: 20px;">
            <a href="${data.actionUrl}" style="display: inline-block; background: ${color}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Take Action
            </a>
          </div>
        ` : ''}
      </div>
      <div style="background: #374151; color: #9ca3af; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px;">
        <p style="margin: 0;">Tiny Seed Farm Notification System</p>
        <p style="margin: 5px 0 0 0;">Manage your notification preferences in the app settings.</p>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROCESS NOTIFICATION QUEUE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Process pending notifications in the queue
 * Called by time-triggered processor
 */
function processNotificationQueue() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(NOTIFICATION_CONFIG.SHEET_NAME);

    if (!sheet) {
      Logger.log('NotificationQueue sheet not found');
      return { success: false, error: 'Sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, message: 'No notifications to process', processed: 0 };
    }

    const headers = data[0];
    const now = new Date();
    const batchId = 'BATCH-' + Date.now();

    let processed = 0;
    let sent = 0;
    let failed = 0;
    const toRemove = [];

    // Process HIGH priority (every 15 min)
    const highBatch = [];
    // Process MEDIUM priority (every hour)
    const mediumBatch = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[headers.indexOf('Status')];
      const priority = row[headers.indexOf('Priority')];
      const scheduledFor = new Date(row[headers.indexOf('Scheduled_For')]);
      const retryCount = row[headers.indexOf('Retry_Count')] || 0;

      // Skip already sent or failed
      if (status === 'SENT' || status === 'FAILED' || retryCount >= NOTIFICATION_CONFIG.MAX_RETRIES) {
        if (status === 'SENT') {
          toRemove.push(i);
        }
        continue;
      }

      // Check if it's time to process
      if (scheduledFor > now) {
        continue;
      }

      // Group by priority for batching
      if (priority === NOTIFICATION_PRIORITIES.HIGH) {
        highBatch.push({ row: row, rowIndex: i, headers: headers });
      } else if (priority === NOTIFICATION_PRIORITIES.MEDIUM) {
        mediumBatch.push({ row: row, rowIndex: i, headers: headers });
      }
    }

    // Process HIGH priority individually
    for (const item of highBatch) {
      const result = processNotificationRow(sheet, item.row, item.rowIndex, item.headers, batchId);
      processed++;
      if (result.success) {
        sent++;
        toRemove.push(item.rowIndex);
      } else {
        failed++;
      }
    }

    // Process MEDIUM priority as batch email if multiple for same recipient
    const mediumByRecipient = groupByRecipient(mediumBatch, headers);
    for (const recipientId in mediumByRecipient) {
      const notifications = mediumByRecipient[recipientId];
      if (notifications.length > 1) {
        // Send as batch
        const result = sendBatchNotification(sheet, notifications, headers, batchId);
        processed += notifications.length;
        if (result.success) {
          sent += notifications.length;
          notifications.forEach(n => toRemove.push(n.rowIndex));
        } else {
          failed += notifications.length;
        }
      } else {
        // Send individually
        const item = notifications[0];
        const result = processNotificationRow(sheet, item.row, item.rowIndex, item.headers, batchId);
        processed++;
        if (result.success) {
          sent++;
          toRemove.push(item.rowIndex);
        } else {
          failed++;
        }
      }
    }

    // Move processed rows to log and remove from queue
    moveToLogAndCleanup(ss, sheet, toRemove, data, headers);

    return {
      success: true,
      batchId: batchId,
      processed: processed,
      sent: sent,
      failed: failed,
      timestamp: now.toISOString()
    };

  } catch (error) {
    Logger.log('processNotificationQueue error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Process a single notification row
 */
function processNotificationRow(sheet, row, rowIndex, headers, batchId) {
  try {
    const recipient = {
      name: row[headers.indexOf('Recipient_Name')],
      phone: row[headers.indexOf('Recipient_Phone')],
      email: row[headers.indexOf('Recipient_Email')]
    };

    const channel = row[headers.indexOf('Channel')];
    const message = row[headers.indexOf('Message')];
    const subject = row[headers.indexOf('Subject')];
    const type = row[headers.indexOf('Type')];
    const dataStr = row[headers.indexOf('Data')];
    const data = dataStr ? JSON.parse(dataStr) : {};

    let result;
    switch (channel) {
      case NOTIFICATION_CHANNELS.SMS:
        result = sendNotificationSMS(recipient.phone, message);
        break;
      case NOTIFICATION_CHANNELS.TELEGRAM:
        result = sendNotificationTelegram(data.telegramChatId, message);
        break;
      case NOTIFICATION_CHANNELS.EMAIL:
      default:
        result = sendNotificationEmail(recipient.email, subject, message, type, data);
        break;
    }

    // Update row
    const statusCol = headers.indexOf('Status') + 1;
    const sentAtCol = headers.indexOf('Sent_At') + 1;
    const batchIdCol = headers.indexOf('Batch_ID') + 1;
    const errorCol = headers.indexOf('Error_Message') + 1;
    const retryCol = headers.indexOf('Retry_Count') + 1;

    if (result.success) {
      sheet.getRange(rowIndex + 1, statusCol).setValue('SENT');
      sheet.getRange(rowIndex + 1, sentAtCol).setValue(new Date().toISOString());
      sheet.getRange(rowIndex + 1, batchIdCol).setValue(batchId);
    } else {
      const currentRetry = row[headers.indexOf('Retry_Count')] || 0;
      sheet.getRange(rowIndex + 1, retryCol).setValue(currentRetry + 1);
      sheet.getRange(rowIndex + 1, errorCol).setValue(result.error || 'Unknown error');

      if (currentRetry + 1 >= NOTIFICATION_CONFIG.MAX_RETRIES) {
        sheet.getRange(rowIndex + 1, statusCol).setValue('FAILED');
      }
    }

    return result;

  } catch (error) {
    Logger.log('processNotificationRow error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Group notifications by recipient for batching
 */
function groupByRecipient(notifications, headers) {
  const groups = {};
  const recipientIdCol = headers.indexOf('Recipient_ID');

  for (const notif of notifications) {
    const recipientId = notif.row[recipientIdCol];
    if (!groups[recipientId]) {
      groups[recipientId] = [];
    }
    groups[recipientId].push(notif);
  }

  return groups;
}

/**
 * Send batched notifications as single email
 */
function sendBatchNotification(sheet, notifications, headers, batchId) {
  try {
    if (notifications.length === 0) {
      return { success: true, skipped: true };
    }

    const firstNotif = notifications[0].row;
    const recipientEmail = firstNotif[headers.indexOf('Recipient_Email')];
    const recipientName = firstNotif[headers.indexOf('Recipient_Name')];

    if (!recipientEmail) {
      return { success: false, error: 'No email for batch' };
    }

    // Build batch email content
    const items = notifications.map(n => {
      const row = n.row;
      return {
        subject: row[headers.indexOf('Subject')],
        message: row[headers.indexOf('Message')],
        type: row[headers.indexOf('Type')],
        priority: row[headers.indexOf('Priority')]
      };
    });

    const subject = `Tiny Seed Farm: ${items.length} Updates`;
    const htmlBody = buildBatchEmailHTML(recipientName, items);

    GmailApp.sendEmail(recipientEmail, subject, 'You have ' + items.length + ' notifications.', {
      htmlBody: htmlBody,
      name: 'Tiny Seed Farm'
    });

    // Update all rows
    const now = new Date().toISOString();
    for (const notif of notifications) {
      const statusCol = headers.indexOf('Status') + 1;
      const sentAtCol = headers.indexOf('Sent_At') + 1;
      const batchIdCol = headers.indexOf('Batch_ID') + 1;

      sheet.getRange(notif.rowIndex + 1, statusCol).setValue('SENT');
      sheet.getRange(notif.rowIndex + 1, sentAtCol).setValue(now);
      sheet.getRange(notif.rowIndex + 1, batchIdCol).setValue(batchId);
    }

    return { success: true, batchedCount: notifications.length };

  } catch (error) {
    Logger.log('sendBatchNotification error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Build HTML for batched email
 */
function buildBatchEmailHTML(recipientName, items) {
  const itemsHtml = items.map(item => {
    let color = '#22c55e';
    if (item.priority === 'HIGH') color = '#f59e0b';
    if (item.type.includes('CRITICAL')) color = '#ef4444';

    return `
      <div style="border-left: 4px solid ${color}; padding: 12px 16px; margin: 12px 0; background: #f9fafb;">
        <div style="font-weight: 600; color: #374151;">${item.subject}</div>
        <div style="color: #6b7280; margin-top: 4px;">${item.message}</div>
      </div>
    `;
  }).join('');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #22c55e; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Farm Updates</h2>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">Hi ${recipientName}, you have ${items.length} notifications</p>
      </div>
      <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        ${itemsHtml}
      </div>
      <div style="background: #374151; color: #9ca3af; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px;">
        <p style="margin: 0;">Tiny Seed Farm Notification System</p>
      </div>
    </div>
  `;
}

/**
 * Move processed notifications to log and cleanup queue
 */
function moveToLogAndCleanup(ss, queueSheet, rowsToRemove, data, headers) {
  if (rowsToRemove.length === 0) return;

  const logSheet = ss.getSheetByName(NOTIFICATION_CONFIG.LOG_SHEET);
  if (!logSheet) return;

  // Sort in descending order to delete from bottom up
  rowsToRemove.sort((a, b) => b - a);

  for (const rowIndex of rowsToRemove) {
    // Copy to log
    const rowData = [...data[rowIndex], new Date().toISOString()];
    logSheet.appendRow(rowData);

    // Delete from queue
    queueSheet.deleteRow(rowIndex + 1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DAILY DIGEST
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate and send daily digest for a user
 * @param {string} userId - User ID to generate digest for
 */
function generateDailyDigest(userId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(NOTIFICATION_CONFIG.SHEET_NAME);

    if (!sheet) {
      return { success: false, error: 'NotificationQueue sheet not found' };
    }

    // Get user info
    const recipient = getRecipientInfo(userId);
    if (!recipient.success) {
      return { success: false, error: 'User not found' };
    }

    // Get LOW priority notifications for this user
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const recipientIdCol = headers.indexOf('Recipient_ID');
    const priorityCol = headers.indexOf('Priority');
    const statusCol = headers.indexOf('Status');

    const digestItems = [];
    const rowsToMark = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[recipientIdCol] === userId &&
          row[priorityCol] === NOTIFICATION_PRIORITIES.LOW &&
          row[statusCol] === 'PENDING') {
        digestItems.push({
          rowIndex: i,
          subject: row[headers.indexOf('Subject')],
          message: row[headers.indexOf('Message')],
          type: row[headers.indexOf('Type')],
          createdAt: row[headers.indexOf('Created_At')]
        });
        rowsToMark.push(i);
      }
    }

    if (digestItems.length === 0) {
      return { success: true, message: 'No digest items for user', itemCount: 0 };
    }

    // Get additional context for digest
    const context = buildDigestContext(userId);

    // Build and send digest
    const digestHtml = buildDailyDigestHTML(recipient.name, digestItems, context);
    const subject = `Tiny Seed Farm Daily Digest - ${new Date().toLocaleDateString()}`;

    GmailApp.sendEmail(recipient.email, subject, 'Your daily digest is ready.', {
      htmlBody: digestHtml,
      name: 'Tiny Seed Farm'
    });

    // Mark notifications as sent
    const statusColNum = statusCol + 1;
    const sentAtCol = headers.indexOf('Sent_At') + 1;
    const batchIdCol = headers.indexOf('Batch_ID') + 1;
    const batchId = 'DIGEST-' + Date.now();
    const now = new Date().toISOString();

    for (const rowIndex of rowsToMark) {
      sheet.getRange(rowIndex + 1, statusColNum).setValue('SENT');
      sheet.getRange(rowIndex + 1, sentAtCol).setValue(now);
      sheet.getRange(rowIndex + 1, batchIdCol).setValue(batchId);
    }

    // Log the digest
    logNotification({
      notificationId: batchId,
      type: 'DAILY_DIGEST',
      priority: NOTIFICATION_PRIORITIES.LOW,
      recipient: recipient,
      channel: NOTIFICATION_CHANNELS.EMAIL,
      message: `Daily digest with ${digestItems.length} items`,
      status: 'SENT',
      sentAt: now
    });

    return {
      success: true,
      userId: userId,
      itemCount: digestItems.length,
      batchId: batchId,
      sentAt: now
    };

  } catch (error) {
    Logger.log('generateDailyDigest error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Build context information for daily digest
 */
function buildDigestContext(userId) {
  const context = {
    weather: null,
    tasksCompleted: 0,
    tasksPending: 0
  };

  try {
    // Try to get weather info
    if (typeof getWeatherForecast === 'function') {
      context.weather = getWeatherForecast(1);
    }

    // Try to get task stats
    if (typeof getEmployeeTasks === 'function') {
      const tasks = getEmployeeTasks({ assigneeId: userId });
      if (tasks && tasks.tasks) {
        context.tasksPending = tasks.tasks.filter(t => t.status !== 'DONE').length;
        context.tasksCompleted = tasks.tasks.filter(t => t.status === 'DONE' &&
          new Date(t.completedAt) > new Date(Date.now() - 24*60*60*1000)).length;
      }
    }
  } catch (e) {
    Logger.log('buildDigestContext error: ' + e.toString());
  }

  return context;
}

/**
 * Build HTML for daily digest email
 */
function buildDailyDigestHTML(userName, items, context) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Group items by type
  const grouped = {
    reminders: items.filter(i => i.type.includes('REMINDER')),
    suggestions: items.filter(i => i.type.includes('SUGGESTION') || i.type.includes('PROACTIVE')),
    reports: items.filter(i => i.type.includes('REPORT') || i.type.includes('BENCHMARK')),
    other: items.filter(i => !i.type.includes('REMINDER') && !i.type.includes('SUGGESTION') &&
                              !i.type.includes('PROACTIVE') && !i.type.includes('REPORT') &&
                              !i.type.includes('BENCHMARK'))
  };

  const buildSection = (title, icon, sectionItems) => {
    if (sectionItems.length === 0) return '';
    return `
      <div style="margin-bottom: 24px;">
        <h3 style="color: #374151; margin: 0 0 12px 0; font-size: 16px;">
          ${icon} ${title}
        </h3>
        ${sectionItems.map(item => `
          <div style="background: #f9fafb; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
            <div style="font-weight: 600; color: #374151;">${item.subject}</div>
            <div style="color: #6b7280; margin-top: 4px; font-size: 14px;">${item.message}</div>
          </div>
        `).join('')}
      </div>
    `;
  };

  const statsHtml = context.tasksCompleted > 0 || context.tasksPending > 0 ? `
    <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="color: #166534; margin: 0 0 8px 0;">Your Stats</h3>
      <p style="color: #166534; margin: 0;">
        Tasks completed today: <strong>${context.tasksCompleted}</strong> |
        Pending: <strong>${context.tasksPending}</strong>
      </p>
    </div>
  ` : '';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #22c55e 0%, #15803d 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Daily Digest</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9;">${dateStr}</p>
        <p style="margin: 4px 0 0 0; opacity: 0.9;">Hi ${userName}!</p>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
        ${statsHtml}
        ${buildSection('Seasonal Reminders', '📅', grouped.reminders)}
        ${buildSection('Suggestions', '💡', grouped.suggestions)}
        ${buildSection('Reports & Benchmarks', '📊', grouped.reports)}
        ${buildSection('Other Updates', '📋', grouped.other)}
      </div>
      <div style="background: #374151; color: #9ca3af; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px;">
        <p style="margin: 0;">Tiny Seed Farm Notification System</p>
        <p style="margin: 5px 0 0 0;">Manage preferences in your app settings.</p>
      </div>
    </div>
  `;
}

/**
 * Process all daily digests for users who have pending LOW priority notifications
 */
function processAllDailyDigests() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(NOTIFICATION_CONFIG.SHEET_NAME);

    if (!sheet) {
      return { success: false, error: 'Sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const recipientIdCol = headers.indexOf('Recipient_ID');
    const priorityCol = headers.indexOf('Priority');
    const statusCol = headers.indexOf('Status');

    // Get unique users with pending LOW priority notifications
    const usersWithDigests = new Set();
    for (let i = 1; i < data.length; i++) {
      if (data[i][priorityCol] === NOTIFICATION_PRIORITIES.LOW &&
          data[i][statusCol] === 'PENDING') {
        usersWithDigests.add(data[i][recipientIdCol]);
      }
    }

    const results = [];
    for (const userId of usersWithDigests) {
      const result = generateDailyDigest(userId);
      results.push({ userId: userId, ...result });
    }

    return {
      success: true,
      digestsProcessed: results.length,
      results: results
    };

  } catch (error) {
    Logger.log('processAllDailyDigests error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// USER PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get notification preferences for a user
 * @param {string} userId - User ID
 * @returns {Object} User preferences
 */
function getNotificationPreferences(userId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(NOTIFICATION_CONFIG.PREFERENCES_SHEET);

    // Default preferences
    const defaults = {
      userId: userId,
      smsEnabled: true,
      emailEnabled: true,
      pushEnabled: false,
      telegramEnabled: false,
      telegramChatId: null,
      quietHoursStart: NOTIFICATION_CONFIG.DEFAULT_QUIET_START,
      quietHoursEnd: NOTIFICATION_CONFIG.DEFAULT_QUIET_END,
      digestTime: NOTIFICATION_CONFIG.DIGEST_HOUR,
      immediateOverride: true, // Always send IMMEDIATE regardless of quiet hours
      phone: '',
      email: ''
    };

    if (!sheet) {
      // Get contact info from USERS if preferences sheet doesn't exist
      const recipient = getRecipientInfo(userId);
      if (recipient.success) {
        defaults.phone = recipient.phone;
        defaults.email = recipient.email;
      }
      return defaults;
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const userIdCol = headers.indexOf('User_ID');

    for (let i = 1; i < data.length; i++) {
      if (data[i][userIdCol] === userId) {
        return {
          userId: userId,
          userName: data[i][headers.indexOf('User_Name')] || '',
          email: data[i][headers.indexOf('Email')] || '',
          phone: data[i][headers.indexOf('Phone')] || '',
          smsEnabled: data[i][headers.indexOf('SMS_Enabled')] !== false,
          emailEnabled: data[i][headers.indexOf('Email_Enabled')] !== false,
          pushEnabled: data[i][headers.indexOf('Push_Enabled')] === true,
          telegramEnabled: data[i][headers.indexOf('Telegram_Enabled')] === true,
          telegramChatId: data[i][headers.indexOf('Telegram_Chat_ID')] || null,
          quietHoursStart: data[i][headers.indexOf('Quiet_Hours_Start')] || defaults.quietHoursStart,
          quietHoursEnd: data[i][headers.indexOf('Quiet_Hours_End')] || defaults.quietHoursEnd,
          digestTime: data[i][headers.indexOf('Digest_Time')] || defaults.digestTime,
          immediateOverride: data[i][headers.indexOf('Immediate_Override')] !== false
        };
      }
    }

    // User not in preferences sheet, get defaults with contact info
    const recipient = getRecipientInfo(userId);
    if (recipient.success) {
      defaults.phone = recipient.phone;
      defaults.email = recipient.email;
    }
    return defaults;

  } catch (error) {
    Logger.log('getNotificationPreferences error: ' + error.toString());
    return {
      userId: userId,
      smsEnabled: true,
      emailEnabled: true,
      pushEnabled: false,
      telegramEnabled: false,
      quietHoursStart: 22,
      quietHoursEnd: 6,
      digestTime: 18,
      immediateOverride: true
    };
  }
}

/**
 * Update notification preferences for a user
 * @param {string} userId - User ID
 * @param {Object} preferences - Preferences to update
 */
function updateNotificationPreferences(userId, preferences) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(NOTIFICATION_CONFIG.PREFERENCES_SHEET);

    if (!sheet) {
      initializeNotificationSheets();
      sheet = ss.getSheetByName(NOTIFICATION_CONFIG.PREFERENCES_SHEET);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const userIdCol = headers.indexOf('User_ID');

    // Find existing row
    let existingRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][userIdCol] === userId) {
        existingRow = i + 1; // 1-indexed
        break;
      }
    }

    // Get user info
    const recipient = getRecipientInfo(userId);

    const row = [
      userId,
      preferences.userName || recipient.name || '',
      preferences.email || recipient.email || '',
      preferences.phone || recipient.phone || '',
      preferences.smsEnabled !== false,
      preferences.emailEnabled !== false,
      preferences.pushEnabled === true,
      preferences.telegramEnabled === true,
      preferences.telegramChatId || '',
      preferences.quietHoursStart || NOTIFICATION_CONFIG.DEFAULT_QUIET_START,
      preferences.quietHoursEnd || NOTIFICATION_CONFIG.DEFAULT_QUIET_END,
      preferences.digestTime || NOTIFICATION_CONFIG.DIGEST_HOUR,
      preferences.immediateOverride !== false,
      new Date().toISOString()
    ];

    if (existingRow > 0) {
      // Update existing row
      sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
    } else {
      // Add new row
      sheet.appendRow(row);
    }

    return {
      success: true,
      userId: userId,
      message: 'Preferences updated'
    };

  } catch (error) {
    Logger.log('updateNotificationPreferences error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Log a notification event
 */
function logNotification(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(NOTIFICATION_CONFIG.LOG_SHEET);

    if (!sheet) {
      initializeNotificationSheets();
      sheet = ss.getSheetByName(NOTIFICATION_CONFIG.LOG_SHEET);
    }

    sheet.appendRow([
      data.notificationId,
      data.type,
      data.priority,
      data.recipient.userId || '',
      data.recipient.name || '',
      data.recipient.phone || '',
      data.recipient.email || '',
      data.channel,
      data.subject || '',
      data.message,
      JSON.stringify(data.data || {}),
      data.createdAt || new Date().toISOString(),
      data.scheduledFor || '',
      data.sentAt || '',
      data.status,
      data.retryCount || 0,
      data.error || '',
      data.batchId || '',
      new Date().toISOString()
    ]);

    return { success: true };
  } catch (error) {
    Logger.log('logNotification error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIGGER SETUP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Set up time-based triggers for notification processing
 */
function setupNotificationTriggers() {
  // Remove existing notification triggers
  const triggers = ScriptApp.getProjectTriggers();
  const notifHandlers = [
    'processNotificationQueue',
    'processAllDailyDigests',
    'processHighPriorityNotifications'
  ];

  for (const trigger of triggers) {
    if (notifHandlers.includes(trigger.getHandlerFunction())) {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // Process queue every 15 minutes (catches HIGH and MEDIUM)
  ScriptApp.newTrigger('processNotificationQueue')
    .timeBased()
    .everyMinutes(15)
    .create();

  // Process daily digests at 6 PM
  ScriptApp.newTrigger('processAllDailyDigests')
    .timeBased()
    .atHour(NOTIFICATION_CONFIG.DIGEST_HOUR)
    .everyDays(1)
    .inTimezone('America/New_York')
    .create();

  Logger.log('Notification triggers configured');

  return {
    success: true,
    triggers: [
      'processNotificationQueue (every 15 min)',
      'processAllDailyDigests (daily at 6 PM)'
    ]
  };
}

/**
 * Remove all notification triggers
 */
function removeNotificationTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;

  for (const trigger of triggers) {
    const funcName = trigger.getHandlerFunction();
    if (funcName.includes('Notification') || funcName.includes('notification') || funcName.includes('Digest')) {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  }

  return { success: true, removed: removed };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Quick function to send a frost warning
 */
function sendFrostWarning(recipientId, temperature, date) {
  return queueNotification(
    NOTIFICATION_PRIORITIES.IMMEDIATE,
    NOTIFICATION_TYPES.FROST_WARNING,
    recipientId,
    `FROST WARNING: ${temperature}F expected ${date}. Protect tender crops immediately!`,
    { temperature: temperature, date: date, actionRequired: true }
  );
}

/**
 * Quick function to notify task assignment
 */
function notifyTaskAssignment(recipientId, taskTitle, dueDate, assignedBy) {
  return queueNotification(
    NOTIFICATION_PRIORITIES.HIGH,
    NOTIFICATION_TYPES.TASK_ASSIGNMENT,
    recipientId,
    `New task assigned: "${taskTitle}" - Due: ${dueDate}`,
    { taskTitle: taskTitle, dueDate: dueDate, assignedBy: assignedBy }
  );
}

/**
 * Quick function to notify task completion
 */
function notifyTaskCompleted(recipientId, taskTitle, completedBy) {
  return queueNotification(
    NOTIFICATION_PRIORITIES.MEDIUM,
    NOTIFICATION_TYPES.TASK_COMPLETED,
    recipientId,
    `Task completed: "${taskTitle}" by ${completedBy}`,
    { taskTitle: taskTitle, completedBy: completedBy }
  );
}

/**
 * Quick function to send seasonal reminder
 */
function sendSeasonalReminder(recipientId, reminder) {
  return queueNotification(
    NOTIFICATION_PRIORITIES.LOW,
    NOTIFICATION_TYPES.SEASONAL_REMINDER,
    recipientId,
    reminder,
    { type: 'seasonal' }
  );
}

/**
 * Quick function to notify critical at-risk task
 */
function notifyCriticalAtRisk(recipientId, taskTitle, reason) {
  return queueNotification(
    NOTIFICATION_PRIORITIES.IMMEDIATE,
    NOTIFICATION_TYPES.CRITICAL_AT_RISK,
    recipientId,
    `CRITICAL: Task "${taskTitle}" is at risk! ${reason}`,
    { taskTitle: taskTitle, reason: reason, actionRequired: true }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// API ENDPOINT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Handle queueNotification API call
 */
function handleQueueNotification(params) {
  return queueNotification(
    params.priority || NOTIFICATION_PRIORITIES.MEDIUM,
    params.type || NOTIFICATION_TYPES.STATUS_UPDATE,
    params.recipientId,
    params.message,
    params.data ? (typeof params.data === 'string' ? JSON.parse(params.data) : params.data) : {}
  );
}

/**
 * Handle getNotificationPreferences API call
 */
function handleGetNotificationPreferences(params) {
  return getNotificationPreferences(params.userId);
}

/**
 * Handle updateNotificationPreferences API call
 */
function handleUpdateNotificationPreferences(params) {
  const preferences = params.preferences ?
    (typeof params.preferences === 'string' ? JSON.parse(params.preferences) : params.preferences) :
    params;
  return updateNotificationPreferences(params.userId, preferences);
}

/**
 * Get notification queue status
 */
function getNotificationQueueStatus() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(NOTIFICATION_CONFIG.SHEET_NAME);

    if (!sheet) {
      return { success: true, queueEmpty: true, counts: {} };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const priorityCol = headers.indexOf('Priority');
    const statusCol = headers.indexOf('Status');

    const counts = {
      IMMEDIATE: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      PENDING: 0,
      SENT: 0,
      FAILED: 0
    };

    for (let i = 1; i < data.length; i++) {
      const priority = data[i][priorityCol];
      const status = data[i][statusCol];

      if (counts[priority] !== undefined) counts[priority]++;
      if (counts[status] !== undefined) counts[status]++;
    }

    return {
      success: true,
      totalQueued: data.length - 1,
      counts: counts
    };

  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
