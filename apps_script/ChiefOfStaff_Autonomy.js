/**
 * ========================================
 * CHIEF OF STAFF - TRUE AUTONOMY SYSTEM
 * ========================================
 *
 * STATE-OF-THE-ART graduated autonomy based on risk
 * The system learns what it can do without asking
 *
 * Autonomy Levels:
 * L0 - HUMAN_ONLY: Human does it (financial decisions)
 * L1 - SUGGEST: AI suggests, human approves (email responses)
 * L2 - AUTO_REVIEW: AI does it, human monitors (routine acks)
 * L3 - AUTO_NOTIFY: AI does it, human can review (auto-scheduling)
 * L4 - FULL_AUTO: Full autonomy (spam filtering, routing)
 *
 * Trust System:
 * - Actions build trust score over time
 * - Successful actions increase autonomy
 * - Rejected actions decrease autonomy
 * - Learning from patterns
 *
 * @author Claude PM_Architect
 * @version 1.0.0
 * @date 2026-01-21
 */

// ==========================================
// AUTONOMY LEVEL DEFINITIONS
// ==========================================

const AUTONOMY_LEVELS = {
  L0: {
    level: 0,
    name: 'HUMAN_ONLY',
    description: 'Human performs the action',
    autoExecute: false,
    requiresApproval: true,
    notifyOnAction: true
  },
  L1: {
    level: 1,
    name: 'SUGGEST',
    description: 'AI suggests, human approves before execution',
    autoExecute: false,
    requiresApproval: true,
    notifyOnAction: true
  },
  L2: {
    level: 2,
    name: 'AUTO_REVIEW',
    description: 'AI executes, human reviews within window',
    autoExecute: true,
    requiresApproval: false,
    notifyOnAction: true,
    reviewWindow: 30 // minutes to undo
  },
  L3: {
    level: 3,
    name: 'AUTO_NOTIFY',
    description: 'AI executes, human notified after',
    autoExecute: true,
    requiresApproval: false,
    notifyOnAction: true
  },
  L4: {
    level: 4,
    name: 'FULL_AUTO',
    description: 'Full autonomy, no notification needed',
    autoExecute: true,
    requiresApproval: false,
    notifyOnAction: false
  }
};

// ==========================================
// DEFAULT ACTION PERMISSIONS
// ==========================================

const DEFAULT_ACTION_PERMISSIONS = {
  // Email Actions
  email_classify: { defaultLevel: 'L4', category: 'email', risk: 'low' },
  email_label: { defaultLevel: 'L4', category: 'email', risk: 'low' },
  email_archive: { defaultLevel: 'L3', category: 'email', risk: 'low' },
  email_draft: { defaultLevel: 'L1', category: 'email', risk: 'medium' },
  email_send: { defaultLevel: 'L1', category: 'email', risk: 'high' },
  email_send_ack: { defaultLevel: 'L2', category: 'email', risk: 'low' },
  email_forward: { defaultLevel: 'L1', category: 'email', risk: 'medium' },
  email_delete: { defaultLevel: 'L0', category: 'email', risk: 'high' },

  // Calendar Actions
  calendar_read: { defaultLevel: 'L4', category: 'calendar', risk: 'low' },
  calendar_create_focus: { defaultLevel: 'L3', category: 'calendar', risk: 'low' },
  calendar_create_meeting: { defaultLevel: 'L1', category: 'calendar', risk: 'medium' },
  calendar_reschedule: { defaultLevel: 'L1', category: 'calendar', risk: 'medium' },
  calendar_delete: { defaultLevel: 'L0', category: 'calendar', risk: 'high' },

  // Customer Actions
  customer_read: { defaultLevel: 'L4', category: 'customer', risk: 'low' },
  customer_update_notes: { defaultLevel: 'L3', category: 'customer', risk: 'low' },
  customer_update_contact: { defaultLevel: 'L1', category: 'customer', risk: 'medium' },
  customer_send_message: { defaultLevel: 'L1', category: 'customer', risk: 'high' },

  // Financial Actions
  finance_read: { defaultLevel: 'L4', category: 'finance', risk: 'low' },
  finance_flag_overdue: { defaultLevel: 'L3', category: 'finance', risk: 'low' },
  finance_create_invoice: { defaultLevel: 'L1', category: 'finance', risk: 'high' },
  finance_send_reminder: { defaultLevel: 'L1', category: 'finance', risk: 'medium' },
  finance_process_payment: { defaultLevel: 'L0', category: 'finance', risk: 'critical' },

  // File Actions
  file_read: { defaultLevel: 'L4', category: 'file', risk: 'low' },
  file_categorize: { defaultLevel: 'L3', category: 'file', risk: 'low' },
  file_move: { defaultLevel: 'L2', category: 'file', risk: 'medium' },
  file_delete: { defaultLevel: 'L0', category: 'file', risk: 'high' },

  // System Actions
  system_alert: { defaultLevel: 'L4', category: 'system', risk: 'low' },
  system_report: { defaultLevel: 'L4', category: 'system', risk: 'low' },
  system_configure: { defaultLevel: 'L0', category: 'system', risk: 'high' }
};

// ==========================================
// INITIALIZATION
// ==========================================

/**
 * Initialize Autonomy System
 */
function initializeAutonomySystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create permissions sheet
  let permsSheet = ss.getSheetByName('COS_AUTONOMY_PERMISSIONS');
  if (!permsSheet) {
    permsSheet = ss.insertSheet('COS_AUTONOMY_PERMISSIONS');
    permsSheet.appendRow([
      'action', 'category', 'current_level', 'default_level', 'risk',
      'trust_score', 'approvals', 'rejections', 'auto_executions',
      'last_used', 'updated_at'
    ]);
    permsSheet.getRange(1, 1, 1, 11).setFontWeight('bold');

    // Populate defaults
    for (const [action, config] of Object.entries(DEFAULT_ACTION_PERMISSIONS)) {
      permsSheet.appendRow([
        action,
        config.category,
        config.defaultLevel,
        config.defaultLevel,
        config.risk,
        50, // Starting trust score (0-100)
        0, 0, 0, // approvals, rejections, auto_executions
        '',
        new Date().toISOString()
      ]);
    }
  }

  // Create trust history sheet
  let trustSheet = ss.getSheetByName('COS_TRUST_HISTORY');
  if (!trustSheet) {
    trustSheet = ss.insertSheet('COS_TRUST_HISTORY');
    trustSheet.appendRow([
      'timestamp', 'action', 'execution_type', 'outcome',
      'trust_change', 'new_trust_score', 'details'
    ]);
    trustSheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  }

  // Create autonomy log sheet
  let logSheet = ss.getSheetByName('COS_AUTONOMY_LOG');
  if (!logSheet) {
    logSheet = ss.insertSheet('COS_AUTONOMY_LOG');
    logSheet.appendRow([
      'timestamp', 'action', 'level', 'auto_executed', 'approved',
      'rejected', 'undone', 'subject', 'details'
    ]);
    logSheet.getRange(1, 1, 1, 9).setFontWeight('bold');
  }

  return {
    success: true,
    message: 'Autonomy System initialized',
    sheets: ['COS_AUTONOMY_PERMISSIONS', 'COS_TRUST_HISTORY', 'COS_AUTONOMY_LOG']
  };
}

// ==========================================
// PERMISSION CHECKING
// ==========================================

/**
 * Check if an action can be auto-executed
 *
 * @param {string} action - Action type
 * @param {Object} context - Action context
 * @returns {Object} Permission result
 */
function checkActionPermission(action, context = {}) {
  const permission = getActionPermission(action);

  if (!permission) {
    return {
      allowed: false,
      autoExecute: false,
      error: `Unknown action: ${action}`
    };
  }

  const level = AUTONOMY_LEVELS[permission.current_level];

  // Check for context-based overrides
  const contextOverride = checkContextOverrides(action, context, permission);
  if (contextOverride.override) {
    return contextOverride;
  }

  // Check trust score for auto-execution
  const trustScore = permission.trust_score || 50;
  const trustThreshold = getTrustThreshold(permission.risk);

  const canAutoExecute = level.autoExecute && trustScore >= trustThreshold;

  return {
    allowed: true,
    autoExecute: canAutoExecute,
    requiresApproval: level.requiresApproval,
    notifyOnAction: level.notifyOnAction,
    level: permission.current_level,
    levelName: level.name,
    trustScore: trustScore,
    trustThreshold: trustThreshold,
    risk: permission.risk,
    reviewWindow: level.reviewWindow || null
  };
}

/**
 * Get action permission from sheet
 */
function getActionPermission(action) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COS_AUTONOMY_PERMISSIONS');

  if (!sheet) {
    const config = DEFAULT_ACTION_PERMISSIONS[action];
    if (config) {
      return {
        action: action,
        current_level: config.defaultLevel,
        risk: config.risk,
        trust_score: 50
      };
    }
    return null;
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === action) {
      return {
        action: action,
        category: data[i][1],
        current_level: data[i][2],
        default_level: data[i][3],
        risk: data[i][4],
        trust_score: data[i][5],
        approvals: data[i][6],
        rejections: data[i][7],
        auto_executions: data[i][8],
        last_used: data[i][9]
      };
    }
  }

  return null;
}

/**
 * Get trust threshold based on risk level
 */
function getTrustThreshold(risk) {
  const thresholds = {
    low: 30,
    medium: 50,
    high: 75,
    critical: 100 // Never auto-execute
  };
  return thresholds[risk] || 50;
}

/**
 * Check for context-based permission overrides
 */
function checkContextOverrides(action, context, permission) {
  const overrides = [];

  // VIP customer - require extra approval
  if (context.is_vip_customer) {
    overrides.push({
      reason: 'VIP customer requires approval',
      autoExecute: false,
      requiresApproval: true
    });
  }

  // High value transaction
  if (context.amount && context.amount > 500) {
    overrides.push({
      reason: 'High value transaction',
      autoExecute: false,
      requiresApproval: true
    });
  }

  // First interaction with contact
  if (context.is_first_contact) {
    overrides.push({
      reason: 'First interaction with contact',
      autoExecute: false,
      requiresApproval: true
    });
  }

  // Time-sensitive
  if (context.urgent) {
    // Allow auto-execution for urgent items if trust is high
    if (permission.trust_score >= 80) {
      overrides.push({
        reason: 'Urgent item with high trust',
        autoExecute: true,
        requiresApproval: false
      });
    }
  }

  // After hours
  const hour = new Date().getHours();
  if (hour < 7 || hour > 20) {
    if (action.includes('send') || action.includes('create')) {
      overrides.push({
        reason: 'After hours - queue for review',
        autoExecute: false,
        requiresApproval: true
      });
    }
  }

  // Return most restrictive override
  if (overrides.length > 0) {
    const mostRestrictive = overrides.find(o => o.requiresApproval) || overrides[0];
    return {
      override: true,
      ...mostRestrictive,
      allOverrides: overrides
    };
  }

  return { override: false };
}

// ==========================================
// ACTION EXECUTION
// ==========================================

/**
 * Execute an action with autonomy rules
 *
 * @param {string} action - Action type
 * @param {Object} params - Action parameters
 * @param {Object} context - Execution context
 * @returns {Object} Execution result
 */
function executeWithAutonomy(action, params, context = {}) {
  // Check permission
  const permission = checkActionPermission(action, context);

  if (!permission.allowed) {
    return {
      success: false,
      error: permission.error,
      requiresApproval: false
    };
  }

  // Log the action attempt
  const executionId = `EXEC_${Date.now()}`;

  if (permission.autoExecute) {
    // Auto-execute
    try {
      const result = performAction(action, params);

      // Log success
      logAutonomyAction(executionId, action, {
        level: permission.level,
        auto_executed: true,
        success: true,
        result: result
      });

      // Update trust score positively
      updateTrustScore(action, 'auto_success', 2);

      // Schedule review window if applicable
      if (permission.reviewWindow) {
        scheduleReviewReminder(executionId, action, params, permission.reviewWindow);
      }

      return {
        success: true,
        autoExecuted: true,
        executionId: executionId,
        result: result,
        reviewWindow: permission.reviewWindow,
        undoAvailable: permission.reviewWindow > 0
      };

    } catch (error) {
      // Log failure
      logAutonomyAction(executionId, action, {
        level: permission.level,
        auto_executed: true,
        success: false,
        error: error.message
      });

      // Update trust score negatively
      updateTrustScore(action, 'auto_failure', -10);

      return {
        success: false,
        autoExecuted: true,
        error: error.message
      };
    }

  } else {
    // Queue for approval
    const approvalId = queueForApproval(action, params, context, permission);

    logAutonomyAction(executionId, action, {
      level: permission.level,
      auto_executed: false,
      queued_for_approval: true,
      approval_id: approvalId
    });

    return {
      success: true,
      autoExecuted: false,
      requiresApproval: true,
      approvalId: approvalId,
      reason: permission.levelName === 'SUGGEST'
        ? 'Action requires your approval'
        : `Trust score (${permission.trustScore}) below threshold (${permission.trustThreshold})`
    };
  }
}

/**
 * Perform the actual action
 */
function performAction(action, params) {
  // Map action to function
  const actionHandlers = {
    email_classify: () => classifyEmailWithAI(params.threadId),
    email_label: () => GmailApp.getThreadById(params.threadId).addLabel(GmailApp.getUserLabelByName(params.label)),
    email_archive: () => GmailApp.getThreadById(params.threadId).moveToArchive(),
    email_send_ack: () => sendAcknowledgment(params.threadId, params.message),

    calendar_create_focus: () => {
      if (typeof createFocusBlock === 'function') {
        return createFocusBlock(params.start, params.duration, params.type);
      }
      throw new Error('Calendar function not available');
    },

    customer_update_notes: () => {
      if (typeof rememberContact === 'function') {
        return rememberContact({ email: params.email, notes: params.notes });
      }
      throw new Error('Memory function not available');
    },

    file_categorize: () => {
      if (typeof categorizeFile === 'function') {
        return categorizeFile(DriveApp.getFileById(params.fileId));
      }
      throw new Error('File function not available');
    },

    file_move: () => {
      if (typeof organizeFile === 'function') {
        return organizeFile(params.fileId);
      }
      throw new Error('File function not available');
    }
  };

  const handler = actionHandlers[action];
  if (!handler) {
    throw new Error(`No handler for action: ${action}`);
  }

  return handler();
}

function sendAcknowledgment(threadId, message) {
  const thread = GmailApp.getThreadById(threadId);
  const lastMessage = thread.getMessages()[thread.getMessageCount() - 1];

  const ackMessage = message || "Thanks for reaching out! I've received your message and will get back to you shortly.";

  lastMessage.reply(ackMessage);

  return { sent: true, threadId: threadId };
}

// ==========================================
// APPROVAL QUEUE
// ==========================================

/**
 * Queue an action for approval
 */
function queueForApproval(action, params, context, permission) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('EMAIL_ACTIONS');

  if (!sheet) {
    // Use autonomy log as fallback
    sheet = ss.getSheetByName('COS_AUTONOMY_LOG');
  }

  const approvalId = `APR_${Date.now()}`;

  // This integrates with existing approval system
  if (typeof createEmailAction === 'function') {
    return createEmailAction({
      action_type: action,
      params: params,
      context: context,
      permission_level: permission.level,
      trust_score: permission.trustScore,
      risk: permission.risk
    });
  }

  // Fallback: log to sheet
  const logSheet = ss.getSheetByName('COS_AUTONOMY_LOG');
  if (logSheet) {
    logSheet.appendRow([
      new Date().toISOString(),
      action,
      permission.level,
      false, // not auto-executed
      false, // not approved yet
      false, // not rejected
      false, // not undone
      JSON.stringify(params).substring(0, 200),
      JSON.stringify({ context, permission, approvalId })
    ]);
  }

  return approvalId;
}

/**
 * Process approval of a queued action
 */
function approveQueuedAction(approvalId) {
  // Find and execute the action
  const action = findQueuedAction(approvalId);

  if (!action) {
    return { success: false, error: 'Action not found' };
  }

  try {
    const result = performAction(action.type, action.params);

    // Update approval status
    updateApprovalStatus(approvalId, 'approved');

    // Update trust score
    updateTrustScore(action.type, 'approved', 5);

    // Log
    logAutonomyAction(approvalId, action.type, {
      approved: true,
      result: result
    });

    return { success: true, result: result };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Reject a queued action
 */
function rejectQueuedAction(approvalId, reason = '') {
  const action = findQueuedAction(approvalId);

  if (!action) {
    return { success: false, error: 'Action not found' };
  }

  // Update status
  updateApprovalStatus(approvalId, 'rejected');

  // Update trust score
  updateTrustScore(action.type, 'rejected', -15);

  // Log
  logAutonomyAction(approvalId, action.type, {
    rejected: true,
    reason: reason
  });

  return { success: true, message: 'Action rejected' };
}

function findQueuedAction(approvalId) {
  // Integration with existing approval system
  if (typeof getPendingApprovals === 'function') {
    const approvals = getPendingApprovals();
    return approvals.find(a => a.action_id === approvalId);
  }

  return null;
}

function updateApprovalStatus(approvalId, status) {
  // Integration with existing system
  if (status === 'approved' && typeof approveEmailAction === 'function') {
    return approveEmailAction(approvalId);
  }
  if (status === 'rejected' && typeof rejectEmailAction === 'function') {
    return rejectEmailAction(approvalId);
  }
}

// ==========================================
// TRUST SCORE MANAGEMENT
// ==========================================

/**
 * Update trust score for an action
 */
function updateTrustScore(action, event, change) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COS_AUTONOMY_PERMISSIONS');

  if (!sheet) return;

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === action) {
      const currentScore = data[i][5] || 50;
      const newScore = Math.max(0, Math.min(100, currentScore + change));

      // Update score
      sheet.getRange(i + 1, 6).setValue(newScore);

      // Update counts
      if (event === 'approved') {
        sheet.getRange(i + 1, 7).setValue((data[i][6] || 0) + 1);
      } else if (event === 'rejected') {
        sheet.getRange(i + 1, 8).setValue((data[i][7] || 0) + 1);
      } else if (event.includes('auto')) {
        sheet.getRange(i + 1, 9).setValue((data[i][8] || 0) + 1);
      }

      // Update last used
      sheet.getRange(i + 1, 10).setValue(new Date().toISOString());
      sheet.getRange(i + 1, 11).setValue(new Date().toISOString());

      // Log trust change
      logTrustChange(action, event, change, newScore);

      // Check for level upgrade/downgrade
      checkLevelChange(action, newScore, i + 1, sheet, data[i]);

      return { previousScore: currentScore, newScore: newScore };
    }
  }
}

/**
 * Check if autonomy level should change based on trust
 */
function checkLevelChange(action, trustScore, row, sheet, rowData) {
  const currentLevel = rowData[2];
  const defaultLevel = rowData[3];
  const risk = rowData[4];

  // Level change thresholds
  const upgradeThresholds = {
    L1: 70,
    L2: 80,
    L3: 90,
    L4: 95
  };

  const downgradeThresholds = {
    L4: 70,
    L3: 50,
    L2: 30,
    L1: 10
  };

  // Check for upgrade
  const nextLevel = getNextLevel(currentLevel);
  if (nextLevel && upgradeThresholds[nextLevel] && trustScore >= upgradeThresholds[nextLevel]) {
    // Don't upgrade beyond what makes sense for the risk level
    if (canUpgradeWithRisk(nextLevel, risk)) {
      sheet.getRange(row, 3).setValue(nextLevel);

      logTrustChange(action, 'level_upgrade', 0, trustScore, {
        from: currentLevel,
        to: nextLevel
      });
    }
  }

  // Check for downgrade
  if (downgradeThresholds[currentLevel] && trustScore < downgradeThresholds[currentLevel]) {
    const prevLevel = getPreviousLevel(currentLevel);
    if (prevLevel) {
      sheet.getRange(row, 3).setValue(prevLevel);

      logTrustChange(action, 'level_downgrade', 0, trustScore, {
        from: currentLevel,
        to: prevLevel
      });
    }
  }
}

function getNextLevel(level) {
  const progression = ['L0', 'L1', 'L2', 'L3', 'L4'];
  const idx = progression.indexOf(level);
  return idx >= 0 && idx < 4 ? progression[idx + 1] : null;
}

function getPreviousLevel(level) {
  const progression = ['L0', 'L1', 'L2', 'L3', 'L4'];
  const idx = progression.indexOf(level);
  return idx > 0 ? progression[idx - 1] : null;
}

function canUpgradeWithRisk(targetLevel, risk) {
  // High/critical risk actions can't go beyond L2
  if ((risk === 'high' || risk === 'critical') && (targetLevel === 'L3' || targetLevel === 'L4')) {
    return false;
  }
  // Critical risk stays at L0-L1
  if (risk === 'critical' && targetLevel !== 'L0' && targetLevel !== 'L1') {
    return false;
  }
  return true;
}

/**
 * Log trust score changes
 */
function logTrustChange(action, event, change, newScore, details = null) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COS_TRUST_HISTORY');

  if (sheet) {
    sheet.appendRow([
      new Date().toISOString(),
      action,
      event,
      event.includes('success') || event.includes('approved') ? 'positive' : 'negative',
      change,
      newScore,
      details ? JSON.stringify(details) : ''
    ]);
  }
}

// ==========================================
// AUTONOMY LOGGING
// ==========================================

/**
 * Log autonomy action
 */
function logAutonomyAction(executionId, action, details) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COS_AUTONOMY_LOG');

  if (sheet) {
    sheet.appendRow([
      new Date().toISOString(),
      action,
      details.level || '',
      details.auto_executed || false,
      details.approved || false,
      details.rejected || false,
      details.undone || false,
      details.subject || '',
      JSON.stringify(details).substring(0, 500)
    ]);
  }
}

// ==========================================
// UNDO SYSTEM
// ==========================================

/**
 * Schedule a review reminder for undoable actions
 */
function scheduleReviewReminder(executionId, action, params, reviewWindowMinutes) {
  // Store undo information in cache
  const cache = CacheService.getScriptCache();
  cache.put(`undo_${executionId}`, JSON.stringify({
    action: action,
    params: params,
    executed_at: new Date().toISOString(),
    undo_until: new Date(Date.now() + reviewWindowMinutes * 60 * 1000).toISOString()
  }), reviewWindowMinutes * 60);
}

/**
 * Undo an auto-executed action
 */
function undoAction(executionId) {
  const cache = CacheService.getScriptCache();
  const undoData = cache.get(`undo_${executionId}`);

  if (!undoData) {
    return { success: false, error: 'Action cannot be undone (expired or not found)' };
  }

  const data = JSON.parse(undoData);

  // Check if still within window
  if (new Date() > new Date(data.undo_until)) {
    return { success: false, error: 'Undo window has expired' };
  }

  // Perform undo
  try {
    const undoResult = performUndo(data.action, data.params);

    // Update trust score
    updateTrustScore(data.action, 'undone', -5);

    // Log
    logAutonomyAction(executionId, data.action, {
      undone: true,
      original_execution: data.executed_at
    });

    // Remove from cache
    cache.remove(`undo_${executionId}`);

    return { success: true, result: undoResult };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Perform undo for specific actions
 */
function performUndo(action, params) {
  const undoHandlers = {
    email_archive: () => {
      const thread = GmailApp.getThreadById(params.threadId);
      thread.moveToInbox();
      return { unarchived: true };
    },

    email_label: () => {
      const thread = GmailApp.getThreadById(params.threadId);
      const label = GmailApp.getUserLabelByName(params.label);
      if (label) thread.removeLabel(label);
      return { label_removed: true };
    },

    calendar_create_focus: () => {
      if (params.eventId) {
        CalendarApp.getEventById(params.eventId).deleteEvent();
        return { event_deleted: true };
      }
      throw new Error('No event ID to delete');
    }
  };

  const handler = undoHandlers[action];
  if (!handler) {
    throw new Error(`No undo handler for action: ${action}`);
  }

  return handler();
}

// ==========================================
// PERMISSION MANAGEMENT
// ==========================================

/**
 * Set autonomy level for an action
 */
function setAutonomyLevel(action, level) {
  if (!AUTONOMY_LEVELS[level]) {
    return { success: false, error: 'Invalid autonomy level' };
  }

  const permission = getActionPermission(action);
  if (!permission) {
    return { success: false, error: 'Unknown action' };
  }

  // Check if level is appropriate for risk
  if (!canUpgradeWithRisk(level, permission.risk)) {
    return {
      success: false,
      error: `Level ${level} not allowed for ${permission.risk} risk actions`
    };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COS_AUTONOMY_PERMISSIONS');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === action) {
      sheet.getRange(i + 1, 3).setValue(level);
      sheet.getRange(i + 1, 11).setValue(new Date().toISOString());
      return { success: true, action: action, newLevel: level };
    }
  }

  return { success: false, error: 'Action not found in permissions' };
}

/**
 * Get current autonomy status
 */
function getAutonomyStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COS_AUTONOMY_PERMISSIONS');

  if (!sheet) {
    return { initialized: false };
  }

  const data = sheet.getDataRange().getValues();
  const actions = [];
  const byLevel = { L0: 0, L1: 0, L2: 0, L3: 0, L4: 0 };
  const byCategory = {};

  for (let i = 1; i < data.length; i++) {
    const action = {
      action: data[i][0],
      category: data[i][1],
      level: data[i][2],
      risk: data[i][4],
      trustScore: data[i][5],
      approvals: data[i][6],
      rejections: data[i][7],
      autoExecutions: data[i][8]
    };

    actions.push(action);
    byLevel[action.level] = (byLevel[action.level] || 0) + 1;
    byCategory[action.category] = byCategory[action.category] || { count: 0, avgTrust: 0, trustSum: 0 };
    byCategory[action.category].count++;
    byCategory[action.category].trustSum += action.trustScore;
  }

  // Calculate averages
  for (const cat of Object.keys(byCategory)) {
    byCategory[cat].avgTrust = Math.round(byCategory[cat].trustSum / byCategory[cat].count);
  }

  return {
    initialized: true,
    totalActions: actions.length,
    byLevel: byLevel,
    byCategory: byCategory,
    highTrustActions: actions.filter(a => a.trustScore >= 80).length,
    lowTrustActions: actions.filter(a => a.trustScore < 30).length,
    actions: actions
  };
}

// ==========================================
// API ENDPOINTS
// ==========================================

/**
 * Execute action with autonomy via API
 */
function executeAutonomousAction(action, params, context) {
  return executeWithAutonomy(action, params, context || {});
}

/**
 * Check permission via API
 */
function checkPermission(action, context) {
  return checkActionPermission(action, context || {});
}

/**
 * Update autonomy level via API
 */
function updateAutonomyLevel(action, level) {
  return setAutonomyLevel(action, level);
}

/**
 * Undo action via API
 */
function undoAutonomousAction(executionId) {
  return undoAction(executionId);
}

/**
 * Get status via API
 */
function getAutonomySystemStatus() {
  return getAutonomyStatus();
}
