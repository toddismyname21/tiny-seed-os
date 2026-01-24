/**
 * ========================================
 * CLAUDE COORDINATION SYSTEM
 * ========================================
 *
 * STATE-OF-THE-ART multi-session coordination
 * Enables Claude CLI instances to communicate,
 * coordinate tasks, and avoid duplicate work.
 *
 * Based on research: MCP Agent Mail, CrewAI, AutoGen,
 * INBOX/OUTBOX pattern, hierarchical orchestration
 *
 * Features:
 * 1. Message passing between Claude sessions
 * 2. Task claiming and coordination
 * 3. File reservation to prevent conflicts
 * 4. Proactive notifications to owner
 * 5. Real-time activity tracking
 * 6. Intelligent task prioritization
 * 7. SMS alerts for field communication
 *
 * @author Claude PM_Architect
 * @version 1.0.0
 * @date 2026-01-22
 */

// ==========================================
// CONSTANTS & CONFIGURATION
// ==========================================

const COORDINATION_SHEETS = {
  MESSAGES: 'CLAUDE_MESSAGES',
  SESSIONS: 'CLAUDE_SESSIONS',
  TASKS: 'CLAUDE_TASKS',
  FILE_LOCKS: 'CLAUDE_FILE_LOCKS',
  ACTIVITY: 'CLAUDE_ACTIVITY',
  ALERTS: 'CLAUDE_ALERTS'
};

const CLAUDE_ROLES = {
  pm_architect: {
    name: 'PM_Architect',
    role: 'Project Manager & System Architect',
    priority: 1,
    canBroadcast: true,
    canAssignTasks: true,
    description: 'Coordinates all Claude sessions, maintains system knowledge'
  },
  backend: {
    name: 'Backend_Claude',
    role: 'Apps Script & API Developer',
    priority: 2,
    canBroadcast: false,
    canAssignTasks: false,
    description: 'Writes backend code, NEVER creates HTML'
  },
  desktop: {
    name: 'Desktop_Claude',
    role: 'Desktop HTML Developer',
    priority: 2,
    canBroadcast: false,
    canAssignTasks: false,
    description: 'Creates desktop HTML interfaces'
  },
  mobile: {
    name: 'Mobile_Claude',
    role: 'Mobile & PWA Developer',
    priority: 2,
    canBroadcast: false,
    canAssignTasks: false,
    description: 'Creates mobile-optimized HTML, PWA features'
  },
  ux_design: {
    name: 'UX_Design_Claude',
    role: 'Design System Specialist',
    priority: 2,
    canBroadcast: false,
    canAssignTasks: false,
    description: 'UI consistency, design patterns'
  },
  sales: {
    name: 'Sales_Claude',
    role: 'Sales & CRM Specialist',
    priority: 3,
    canBroadcast: false,
    canAssignTasks: false,
    description: 'Sales dashboards, customer management'
  },
  security: {
    name: 'Security_Claude',
    role: 'Security & Permissions',
    priority: 2,
    canBroadcast: false,
    canAssignTasks: false,
    description: 'Authentication, authorization'
  },
  social_media: {
    name: 'Social_Media_Claude',
    role: 'Marketing & Communications',
    priority: 3,
    canBroadcast: false,
    canAssignTasks: false,
    description: 'Social media, marketing campaigns'
  },
  field_ops: {
    name: 'Field_Ops_Claude',
    role: 'Field Operations Specialist',
    priority: 2,
    canBroadcast: false,
    canAssignTasks: false,
    description: 'Farm operations, scheduling, greenhouse'
  },
  inventory: {
    name: 'Inventory_Claude',
    role: 'Inventory & Traceability',
    priority: 2,
    canBroadcast: false,
    canAssignTasks: false,
    description: 'Seed inventory, lot tracking'
  }
};

const MESSAGE_TYPES = {
  DIRECT: 'direct',           // 1:1 message
  BROADCAST: 'broadcast',     // To all sessions
  TASK_ASSIGNMENT: 'task',    // Task assignment
  STATUS_UPDATE: 'status',    // Progress update
  ALERT: 'alert',            // Urgent notification
  HANDOFF: 'handoff',        // Session handoff
  REQUEST: 'request',        // Request for help
  RESPONSE: 'response'       // Response to request
};

const TASK_STATUS = {
  PENDING: 'pending',
  CLAIMED: 'claimed',
  IN_PROGRESS: 'in_progress',
  BLOCKED: 'blocked',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

const PRIORITY_WEIGHTS = {
  urgency: 0.3,      // Time sensitivity
  impact: 0.25,      // Business impact
  dependencies: 0.2, // Blocking other work
  effort: 0.15,      // Estimated effort (inverse)
  age: 0.1           // How long task has waited
};

// ==========================================
// SHEET INITIALIZATION
// ==========================================

/**
 * Initialize all coordination sheets
 */
function initializeCoordinationSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // CLAUDE_MESSAGES
  let sheet = ss.getSheetByName(COORDINATION_SHEETS.MESSAGES);
  if (!sheet) {
    sheet = ss.insertSheet(COORDINATION_SHEETS.MESSAGES);
    sheet.appendRow([
      'id', 'timestamp', 'from_role', 'to_role', 'type',
      'subject', 'body', 'priority', 'thread_id',
      'read', 'acknowledged', 'metadata'
    ]);
    sheet.getRange(1, 1, 1, 12).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // CLAUDE_SESSIONS
  sheet = ss.getSheetByName(COORDINATION_SHEETS.SESSIONS);
  if (!sheet) {
    sheet = ss.insertSheet(COORDINATION_SHEETS.SESSIONS);
    sheet.appendRow([
      'session_id', 'role', 'started_at', 'last_active',
      'status', 'current_task', 'context_summary', 'heartbeat'
    ]);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // CLAUDE_TASKS
  sheet = ss.getSheetByName(COORDINATION_SHEETS.TASKS);
  if (!sheet) {
    sheet = ss.insertSheet(COORDINATION_SHEETS.TASKS);
    sheet.appendRow([
      'task_id', 'created_at', 'created_by', 'assigned_to',
      'title', 'description', 'priority_score', 'status',
      'claimed_at', 'completed_at', 'dependencies', 'blocked_by',
      'files_involved', 'progress_notes', 'metadata'
    ]);
    sheet.getRange(1, 1, 1, 15).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // CLAUDE_FILE_LOCKS
  sheet = ss.getSheetByName(COORDINATION_SHEETS.FILE_LOCKS);
  if (!sheet) {
    sheet = ss.insertSheet(COORDINATION_SHEETS.FILE_LOCKS);
    sheet.appendRow([
      'file_path', 'locked_by', 'locked_at', 'expires_at',
      'reason', 'task_id'
    ]);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // CLAUDE_ACTIVITY
  sheet = ss.getSheetByName(COORDINATION_SHEETS.ACTIVITY);
  if (!sheet) {
    sheet = ss.insertSheet(COORDINATION_SHEETS.ACTIVITY);
    sheet.appendRow([
      'id', 'timestamp', 'role', 'action', 'details', 'task_id'
    ]);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // CLAUDE_ALERTS
  sheet = ss.getSheetByName(COORDINATION_SHEETS.ALERTS);
  if (!sheet) {
    sheet = ss.insertSheet(COORDINATION_SHEETS.ALERTS);
    sheet.appendRow([
      'id', 'timestamp', 'type', 'priority', 'title',
      'message', 'source_role', 'sent_sms', 'acknowledged'
    ]);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return { success: true, message: 'Coordination sheets initialized' };
}

// ==========================================
// MESSAGE SYSTEM
// ==========================================

/**
 * Send a message from one Claude to another
 *
 * @param {string} fromRole - Sending Claude role
 * @param {string} toRole - Receiving Claude role (or 'all' for broadcast)
 * @param {string} subject - Message subject
 * @param {string} body - Message content
 * @param {Object} options - Additional options
 * @returns {Object} Result with message ID
 */
function sendClaudeMessage(fromRole, toRole, subject, body, options = {}) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(COORDINATION_SHEETS.MESSAGES);

  if (!sheet) {
    initializeCoordinationSheets();
  }

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();

  const messageType = toRole === 'all' ? MESSAGE_TYPES.BROADCAST :
                      options.type || MESSAGE_TYPES.DIRECT;

  const priority = options.priority || 'normal';
  const threadId = options.threadId || messageId;

  const row = [
    messageId,
    timestamp,
    fromRole,
    toRole,
    messageType,
    subject,
    body,
    priority,
    threadId,
    false, // read
    false, // acknowledged
    JSON.stringify(options.metadata || {})
  ];

  sheet.appendRow(row);

  // Log activity
  logCoordinationActivity(fromRole, 'send_message', {
    to: toRole,
    subject: subject,
    type: messageType
  });

  // Send SMS alert if high priority
  if (priority === 'urgent' || priority === 'critical') {
    createCoordinationAlert(
      fromRole,
      priority,
      `Message from ${fromRole}`,
      `${subject}: ${body.substring(0, 100)}...`,
      true // Send SMS
    );
  }

  return {
    success: true,
    messageId: messageId,
    threadId: threadId,
    timestamp: timestamp
  };
}

/**
 * Get messages for a specific Claude role
 *
 * @param {string} role - Claude role to get messages for
 * @param {Object} options - Filter options
 * @returns {Array} Messages
 */
function getClaudeMessages(role, options = {}) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(COORDINATION_SHEETS.MESSAGES);

  if (!sheet) {
    return { success: false, error: 'Messages sheet not found' };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const messages = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const toRole = row[3];
    const read = row[9];
    const messageType = row[4];

    // Check if message is for this role
    const isRecipient = toRole === role ||
                        toRole === 'all' ||
                        messageType === MESSAGE_TYPES.BROADCAST;

    if (!isRecipient) continue;

    // Apply filters
    if (options.unreadOnly && read) continue;
    if (options.since) {
      const msgTime = new Date(row[1]);
      const sinceTime = new Date(options.since);
      if (msgTime < sinceTime) continue;
    }
    if (options.type && row[4] !== options.type) continue;
    if (options.priority && row[7] !== options.priority) continue;

    messages.push({
      id: row[0],
      timestamp: row[1],
      from: row[2],
      to: row[3],
      type: row[4],
      subject: row[5],
      body: row[6],
      priority: row[7],
      threadId: row[8],
      read: row[9],
      acknowledged: row[10],
      metadata: JSON.parse(row[11] || '{}')
    });
  }

  // Sort by timestamp descending (newest first)
  messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Apply limit
  if (options.limit) {
    return messages.slice(0, options.limit);
  }

  return messages;
}

/**
 * Mark message as read
 */
function markMessageRead(messageId, role) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(COORDINATION_SHEETS.MESSAGES);

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === messageId) {
      sheet.getRange(i + 1, 10).setValue(true);
      logCoordinationActivity(role, 'read_message', { messageId });
      return { success: true };
    }
  }

  return { success: false, error: 'Message not found' };
}

/**
 * Acknowledge a message (confirm receipt and understanding)
 */
function acknowledgeMessage(messageId, role, response = null) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(COORDINATION_SHEETS.MESSAGES);

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === messageId) {
      sheet.getRange(i + 1, 10).setValue(true); // read
      sheet.getRange(i + 1, 11).setValue(true); // acknowledged

      // If there's a response, send it as a reply
      if (response) {
        const originalMsg = data[i];
        sendClaudeMessage(
          role,
          originalMsg[2], // Reply to sender
          `RE: ${originalMsg[5]}`,
          response,
          {
            type: MESSAGE_TYPES.RESPONSE,
            threadId: originalMsg[8]
          }
        );
      }

      logCoordinationActivity(role, 'acknowledge_message', {
        messageId,
        hasResponse: !!response
      });

      return { success: true };
    }
  }

  return { success: false, error: 'Message not found' };
}

// ==========================================
// SESSION MANAGEMENT
// ==========================================

/**
 * Register a new Claude session
 *
 * @param {string} role - Claude role
 * @param {string} contextSummary - What this session is working on
 * @returns {Object} Session registration result
 */
function registerClaudeSession(role, contextSummary = '') {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(COORDINATION_SHEETS.SESSIONS);

  if (!sheet) {
    initializeCoordinationSheets();
    sheet = ss.getSheetByName(COORDINATION_SHEETS.SESSIONS);
  }

  const sessionId = `session_${role}_${Date.now()}`;
  const timestamp = new Date().toISOString();

  // Check if there's already an active session for this role
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === role && data[i][4] === 'active') {
      // Mark old session as replaced
      sheet.getRange(i + 1, 5).setValue('replaced');
    }
  }

  // Add new session
  sheet.appendRow([
    sessionId,
    role,
    timestamp,
    timestamp,
    'active',
    '',
    contextSummary,
    timestamp
  ]);

  // Check for unread messages
  const unreadMessages = getClaudeMessages(role, { unreadOnly: true });

  // Log activity
  logCoordinationActivity(role, 'session_start', {
    sessionId,
    unreadMessages: unreadMessages.length
  });

  // Notify PM_Architect of new session (if not PM_Architect itself)
  if (role !== 'pm_architect') {
    sendClaudeMessage(
      role,
      'pm_architect',
      `Session Started: ${CLAUDE_ROLES[role]?.name || role}`,
      `New ${role} session started.\nContext: ${contextSummary || 'Not provided'}\nSession ID: ${sessionId}`,
      { type: MESSAGE_TYPES.STATUS_UPDATE }
    );
  }

  return {
    success: true,
    sessionId: sessionId,
    role: role,
    unreadMessages: unreadMessages.length,
    messages: unreadMessages.slice(0, 10) // Return first 10 unread
  };
}

/**
 * Update session heartbeat (call periodically to show session is active)
 */
function updateSessionHeartbeat(sessionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(COORDINATION_SHEETS.SESSIONS);

  if (!sheet) return { success: false, error: 'Sessions sheet not found' };

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === sessionId) {
      const now = new Date().toISOString();
      sheet.getRange(i + 1, 4).setValue(now); // last_active
      sheet.getRange(i + 1, 8).setValue(now); // heartbeat
      return { success: true };
    }
  }

  return { success: false, error: 'Session not found' };
}

/**
 * End a Claude session
 */
function endClaudeSession(sessionId, summary = '') {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(COORDINATION_SHEETS.SESSIONS);

  if (!sheet) return { success: false, error: 'Sessions sheet not found' };

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === sessionId) {
      const role = data[i][1];
      sheet.getRange(i + 1, 5).setValue('ended');
      sheet.getRange(i + 1, 7).setValue(summary);

      // Release any file locks held by this session
      releaseAllFileLocks(sessionId);

      logCoordinationActivity(role, 'session_end', { sessionId, summary });

      return { success: true };
    }
  }

  return { success: false, error: 'Session not found' };
}

/**
 * Get active Claude sessions
 */
function getActiveSessions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(COORDINATION_SHEETS.SESSIONS);

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const sessions = [];
  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    const status = data[i][4];
    const lastActive = new Date(data[i][3]);

    // Consider session stale if no heartbeat in 30 minutes
    const staleThreshold = 30 * 60 * 1000;
    const isStale = (now - lastActive) > staleThreshold;

    if (status === 'active') {
      sessions.push({
        sessionId: data[i][0],
        role: data[i][1],
        startedAt: data[i][2],
        lastActive: data[i][3],
        status: isStale ? 'stale' : 'active',
        currentTask: data[i][5],
        contextSummary: data[i][6]
      });
    }
  }

  return sessions;
}

// ==========================================
// TASK COORDINATION
// ==========================================

/**
 * Create a new task
 *
 * @param {string} createdBy - Role creating the task
 * @param {string} title - Task title
 * @param {string} description - Task description
 * @param {Object} options - Task options
 * @returns {Object} Created task
 */
function createCoordinationTask(createdBy, title, description, options = {}) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(COORDINATION_SHEETS.TASKS);

  if (!sheet) {
    initializeCoordinationSheets();
    sheet = ss.getSheetByName(COORDINATION_SHEETS.TASKS);
  }

  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const timestamp = new Date().toISOString();

  // Calculate priority score
  const priorityScore = calculateTaskPriority({
    urgency: options.urgency || 3,
    impact: options.impact || 3,
    dependencies: options.blockingCount || 0,
    effort: options.estimatedEffort || 3,
    age: 0
  });

  const row = [
    taskId,
    timestamp,
    createdBy,
    options.assignTo || '',
    title,
    description,
    priorityScore,
    TASK_STATUS.PENDING,
    '', // claimed_at
    '', // completed_at
    JSON.stringify(options.dependencies || []),
    '', // blocked_by
    JSON.stringify(options.files || []),
    '', // progress_notes
    JSON.stringify(options.metadata || {})
  ];

  sheet.appendRow(row);

  logCoordinationActivity(createdBy, 'create_task', { taskId, title });

  // If assigned, notify the assignee
  if (options.assignTo) {
    sendClaudeMessage(
      createdBy,
      options.assignTo,
      `New Task Assigned: ${title}`,
      `You have been assigned a new task:\n\n${description}\n\nTask ID: ${taskId}`,
      {
        type: MESSAGE_TYPES.TASK_ASSIGNMENT,
        priority: options.urgent ? 'urgent' : 'normal',
        metadata: { taskId }
      }
    );
  }

  return {
    success: true,
    taskId: taskId,
    priorityScore: priorityScore
  };
}

/**
 * Calculate task priority using weighted scoring
 */
function calculateTaskPriority(factors) {
  // RICE-inspired scoring with farm-specific weights
  let score = 0;

  // Urgency (1-5)
  score += (factors.urgency / 5) * PRIORITY_WEIGHTS.urgency * 100;

  // Impact (1-5)
  score += (factors.impact / 5) * PRIORITY_WEIGHTS.impact * 100;

  // Dependencies (0-10, more blocking = higher priority)
  score += Math.min(factors.dependencies / 10, 1) * PRIORITY_WEIGHTS.dependencies * 100;

  // Effort (1-5, lower effort = higher priority for quick wins)
  score += ((5 - factors.effort) / 5) * PRIORITY_WEIGHTS.effort * 100;

  // Age in hours (older = slightly higher priority)
  const ageHours = factors.age || 0;
  score += Math.min(ageHours / 48, 1) * PRIORITY_WEIGHTS.age * 100;

  return Math.round(score);
}

/**
 * Claim a task
 */
function claimTask(taskId, role, sessionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(COORDINATION_SHEETS.TASKS);

  if (!sheet) return { success: false, error: 'Tasks sheet not found' };

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === taskId) {
      const status = data[i][7];
      const assignedTo = data[i][3];

      // Check if task can be claimed
      if (status !== TASK_STATUS.PENDING) {
        return {
          success: false,
          error: `Task already ${status} by ${data[i][3]}`
        };
      }

      // Check if assigned to someone else
      if (assignedTo && assignedTo !== role) {
        return {
          success: false,
          error: `Task assigned to ${assignedTo}, not ${role}`
        };
      }

      // Claim the task
      const now = new Date().toISOString();
      sheet.getRange(i + 1, 4).setValue(role); // assigned_to
      sheet.getRange(i + 1, 8).setValue(TASK_STATUS.CLAIMED);
      sheet.getRange(i + 1, 9).setValue(now); // claimed_at

      // Lock any files associated with the task
      const files = JSON.parse(data[i][12] || '[]');
      for (const file of files) {
        lockFile(file, sessionId, `Working on task ${taskId}`);
      }

      logCoordinationActivity(role, 'claim_task', { taskId });

      // Broadcast to other sessions
      sendClaudeMessage(
        role,
        'all',
        `Task Claimed: ${data[i][4]}`,
        `${CLAUDE_ROLES[role]?.name || role} has claimed task: ${data[i][4]}\nTask ID: ${taskId}`,
        { type: MESSAGE_TYPES.STATUS_UPDATE }
      );

      return {
        success: true,
        task: {
          id: taskId,
          title: data[i][4],
          description: data[i][5],
          files: files
        }
      };
    }
  }

  return { success: false, error: 'Task not found' };
}

/**
 * Update task progress
 */
function updateTaskProgress(taskId, role, note, newStatus = null) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(COORDINATION_SHEETS.TASKS);

  if (!sheet) return { success: false, error: 'Tasks sheet not found' };

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === taskId) {
      // Update status if provided
      if (newStatus) {
        sheet.getRange(i + 1, 8).setValue(newStatus);

        if (newStatus === TASK_STATUS.COMPLETED) {
          sheet.getRange(i + 1, 10).setValue(new Date().toISOString());
        }
      }

      // Append progress note
      const existingNotes = data[i][13] || '';
      const timestamp = new Date().toLocaleString();
      const newNote = `[${timestamp}] ${role}: ${note}`;
      sheet.getRange(i + 1, 14).setValue(
        existingNotes ? `${existingNotes}\n${newNote}` : newNote
      );

      logCoordinationActivity(role, 'update_task', { taskId, status: newStatus });

      return { success: true };
    }
  }

  return { success: false, error: 'Task not found' };
}

/**
 * Get available tasks for a role
 */
function getAvailableTasks(role, options = {}) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(COORDINATION_SHEETS.TASKS);

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const tasks = [];

  for (let i = 1; i < data.length; i++) {
    const status = data[i][7];
    const assignedTo = data[i][3];

    // Check if task is available
    const isPending = status === TASK_STATUS.PENDING;
    const isAssignedToMe = assignedTo === role || assignedTo === '';
    const isMyInProgress = status === TASK_STATUS.CLAIMED && assignedTo === role;

    if (options.myTasksOnly) {
      if (assignedTo !== role) continue;
    } else {
      if (!isPending && !isMyInProgress) continue;
      if (isPending && assignedTo && assignedTo !== role) continue;
    }

    tasks.push({
      id: data[i][0],
      createdAt: data[i][1],
      createdBy: data[i][2],
      assignedTo: data[i][3],
      title: data[i][4],
      description: data[i][5],
      priorityScore: data[i][6],
      status: data[i][7],
      files: JSON.parse(data[i][12] || '[]'),
      progressNotes: data[i][13]
    });
  }

  // Sort by priority score descending
  tasks.sort((a, b) => b.priorityScore - a.priorityScore);

  return tasks;
}

// ==========================================
// FILE LOCKING
// ==========================================

/**
 * Lock a file to prevent conflicts
 */
function lockFile(filePath, sessionId, reason) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(COORDINATION_SHEETS.FILE_LOCKS);

  if (!sheet) {
    initializeCoordinationSheets();
    sheet = ss.getSheetByName(COORDINATION_SHEETS.FILE_LOCKS);
  }

  // Check if already locked
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === filePath) {
      const lockedBy = data[i][1];
      const expiresAt = new Date(data[i][3]);

      // Check if lock is expired
      if (expiresAt < new Date()) {
        // Lock expired, we can take it
        sheet.deleteRow(i + 1);
        break;
      }

      if (lockedBy !== sessionId) {
        return {
          success: false,
          error: `File locked by ${lockedBy}`,
          lockedBy: lockedBy,
          expiresAt: data[i][3]
        };
      }

      // Same session, extend lock
      const newExpiry = new Date(Date.now() + 30 * 60 * 1000);
      sheet.getRange(i + 1, 4).setValue(newExpiry.toISOString());
      return { success: true, extended: true };
    }
  }

  // Create new lock (30 minute expiry)
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

  sheet.appendRow([
    filePath,
    sessionId,
    now.toISOString(),
    expiresAt.toISOString(),
    reason,
    ''
  ]);

  return { success: true, expiresAt: expiresAt.toISOString() };
}

/**
 * Release a file lock
 */
function releaseFileLock(filePath, sessionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(COORDINATION_SHEETS.FILE_LOCKS);

  if (!sheet) return { success: false, error: 'File locks sheet not found' };

  const data = sheet.getDataRange().getValues();

  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === filePath && data[i][1] === sessionId) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { success: false, error: 'Lock not found' };
}

/**
 * Release all locks held by a session
 */
function releaseAllFileLocks(sessionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(COORDINATION_SHEETS.FILE_LOCKS);

  if (!sheet) return;

  const data = sheet.getDataRange().getValues();

  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][1] === sessionId) {
      sheet.deleteRow(i + 1);
    }
  }
}

/**
 * Check if file is available
 */
function checkFileAvailability(filePath) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(COORDINATION_SHEETS.FILE_LOCKS);

  if (!sheet) return { available: true };

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === filePath) {
      const expiresAt = new Date(data[i][3]);

      if (expiresAt > new Date()) {
        return {
          available: false,
          lockedBy: data[i][1],
          reason: data[i][4],
          expiresAt: data[i][3]
        };
      }
    }
  }

  return { available: true };
}

// ==========================================
// ALERTS & NOTIFICATIONS
// ==========================================

/**
 * Create an alert for the owner
 */
function createCoordinationAlert(sourceRole, priority, title, message, sendSms = false) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(COORDINATION_SHEETS.ALERTS);

  if (!sheet) {
    initializeCoordinationSheets();
    sheet = ss.getSheetByName(COORDINATION_SHEETS.ALERTS);
  }

  const alertId = `alert_${Date.now()}`;
  const timestamp = new Date().toISOString();

  sheet.appendRow([
    alertId,
    timestamp,
    priority === 'critical' ? 'CRITICAL' :
    priority === 'urgent' ? 'URGENT' : 'INFO',
    priority,
    title,
    message,
    sourceRole,
    false, // sent_sms
    false  // acknowledged
  ]);

  // Send SMS if requested and Twilio is configured
  if (sendSms) {
    const smsSent = sendTwilioSMS(
      `[${priority.toUpperCase()}] ${title}: ${message.substring(0, 120)}`
    );

    if (smsSent) {
      const data = sheet.getDataRange().getValues();
      for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][0] === alertId) {
          sheet.getRange(i + 1, 8).setValue(true);
          break;
        }
      }
    }
  }

  return { success: true, alertId };
}

/**
 * Get active alerts
 */
function getCoordinationAlerts(unacknowledgedOnly = true) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(COORDINATION_SHEETS.ALERTS);

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const alerts = [];

  for (let i = 1; i < data.length; i++) {
    const acknowledged = data[i][8];

    if (unacknowledgedOnly && acknowledged) continue;

    alerts.push({
      id: data[i][0],
      timestamp: data[i][1],
      type: data[i][2],
      priority: data[i][3],
      title: data[i][4],
      message: data[i][5],
      sourceRole: data[i][6],
      sentSms: data[i][7],
      acknowledged: data[i][8]
    });
  }

  return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Acknowledge an alert
 */
function acknowledgeAlert(alertId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(COORDINATION_SHEETS.ALERTS);

  if (!sheet) return { success: false, error: 'Alerts sheet not found' };

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === alertId) {
      sheet.getRange(i + 1, 9).setValue(true);
      return { success: true };
    }
  }

  return { success: false, error: 'Alert not found' };
}

// ==========================================
// SMS INTEGRATION (TWILIO)
// ==========================================

/**
 * Send SMS via Twilio
 */
function sendTwilioSMS(message) {
  const props = PropertiesService.getScriptProperties();
  const accountSid = props.getProperty('TWILIO_ACCOUNT_SID');
  const authToken = props.getProperty('TWILIO_AUTH_TOKEN');
  const fromNumber = props.getProperty('TWILIO_PHONE_NUMBER');
  const toNumber = props.getProperty('OWNER_PHONE_NUMBER');

  if (!accountSid || !authToken || !fromNumber || !toNumber) {
    console.log('Twilio not configured - SMS not sent');
    return false;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        'Authorization': 'Basic ' + Utilities.base64Encode(accountSid + ':' + authToken)
      },
      payload: {
        'From': fromNumber,
        'To': toNumber,
        'Body': message
      },
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());

    if (response.getResponseCode() === 201) {
      console.log('SMS sent successfully: ' + result.sid);
      return true;
    } else {
      console.error('SMS failed: ' + result.message);
      return false;
    }
  } catch (error) {
    console.error('SMS error: ' + error.message);
    return false;
  }
}

/**
 * Test Twilio configuration
 */
function testTwilioSMS() {
  return sendTwilioSMS('Test message from Tiny Seed Farm Claude Coordination System');
}

/**
 * Configure Twilio credentials for Claude Coordination System
 */
function configureCoordinationTwilio(params) {
  const props = PropertiesService.getScriptProperties();
  let configured = [];

  if (params.accountSid) {
    props.setProperty('TWILIO_ACCOUNT_SID', params.accountSid);
    configured.push('TWILIO_ACCOUNT_SID');
  }

  if (params.authToken) {
    props.setProperty('TWILIO_AUTH_TOKEN', params.authToken);
    configured.push('TWILIO_AUTH_TOKEN');
  }

  if (params.phoneNumber) {
    // Normalize phone number format
    const phone = params.phoneNumber.replace(/\D/g, '');
    const formatted = phone.length === 10 ? '+1' + phone : (phone.startsWith('1') ? '+' + phone : '+' + phone);
    props.setProperty('TWILIO_PHONE_NUMBER', formatted);
    configured.push('TWILIO_PHONE_NUMBER');
  }

  if (params.ownerPhone) {
    // Normalize owner phone number format
    const phone = params.ownerPhone.replace(/\D/g, '');
    const formatted = phone.length === 10 ? '+1' + phone : (phone.startsWith('1') ? '+' + phone : '+' + phone);
    props.setProperty('OWNER_PHONE_NUMBER', formatted);
    // Also set OWNER_PHONE for compatibility with other modules
    props.setProperty('OWNER_PHONE', formatted);
    configured.push('OWNER_PHONE_NUMBER');
  }

  logCoordinationActivity('system', 'twilio_configured', { configured });

  return {
    success: true,
    message: 'Twilio configuration updated',
    configured: configured
  };
}

/**
 * Get Twilio configuration status (without exposing secrets)
 */
function getTwilioStatus() {
  const props = PropertiesService.getScriptProperties();

  const accountSid = props.getProperty('TWILIO_ACCOUNT_SID');
  const authToken = props.getProperty('TWILIO_AUTH_TOKEN');
  const phoneNumber = props.getProperty('TWILIO_PHONE_NUMBER');
  const ownerPhone = props.getProperty('OWNER_PHONE_NUMBER');

  return {
    success: true,
    configured: {
      accountSid: !!accountSid,
      authToken: !!authToken,
      phoneNumber: !!phoneNumber,
      ownerPhone: !!ownerPhone
    },
    maskedValues: {
      accountSid: accountSid ? accountSid.substring(0, 8) + '...' : null,
      phoneNumber: phoneNumber ? phoneNumber.replace(/(\+\d{1})(\d{3})(\d{3})(\d{4})/, '$1 ($2) ***-$4') : null,
      ownerPhone: ownerPhone ? ownerPhone.replace(/(\+\d{1})(\d{3})(\d{3})(\d{4})/, '$1 ($2) ***-$4') : null
    },
    ready: !!(accountSid && authToken && phoneNumber && ownerPhone),
    message: (accountSid && authToken && phoneNumber && ownerPhone)
      ? 'Twilio fully configured and ready'
      : 'Missing: ' + [
          !accountSid && 'Account SID',
          !authToken && 'Auth Token',
          !phoneNumber && 'Phone Number',
          !ownerPhone && 'Owner Phone'
        ].filter(Boolean).join(', ')
  };
}

// ==========================================
// ACTIVITY LOGGING
// ==========================================

/**
 * Log coordination activity
 */
function logCoordinationActivity(role, action, details, taskId = null) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(COORDINATION_SHEETS.ACTIVITY);

  if (!sheet) {
    initializeCoordinationSheets();
    sheet = ss.getSheetByName(COORDINATION_SHEETS.ACTIVITY);
  }

  const activityId = `act_${Date.now()}`;

  sheet.appendRow([
    activityId,
    new Date().toISOString(),
    role,
    action,
    JSON.stringify(details),
    taskId || ''
  ]);
}

/**
 * Get recent activity
 */
function getRecentActivity(limit = 50, roleFilter = null) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(COORDINATION_SHEETS.ACTIVITY);

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const activities = [];

  for (let i = Math.max(1, data.length - limit * 2); i < data.length; i++) {
    if (roleFilter && data[i][2] !== roleFilter) continue;

    activities.push({
      id: data[i][0],
      timestamp: data[i][1],
      role: data[i][2],
      action: data[i][3],
      details: JSON.parse(data[i][4] || '{}'),
      taskId: data[i][5]
    });
  }

  return activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

// ==========================================
// PROACTIVE INTELLIGENCE
// ==========================================

/**
 * Get system overview for a Claude session
 */
function getCoordinationOverview(role) {
  const overview = {
    timestamp: new Date().toISOString(),
    role: role,
    roleInfo: CLAUDE_ROLES[role] || { name: role, description: 'Unknown role' }
  };

  // Get unread messages
  overview.unreadMessages = getClaudeMessages(role, { unreadOnly: true });
  overview.unreadCount = overview.unreadMessages.length;

  // Get available tasks
  overview.availableTasks = getAvailableTasks(role);
  overview.myTasks = getAvailableTasks(role, { myTasksOnly: true });

  // Get active sessions
  overview.activeSessions = getActiveSessions();

  // Get recent alerts
  overview.alerts = getCoordinationAlerts(true);

  // Get recent activity
  overview.recentActivity = getRecentActivity(20);

  // Recommendations
  overview.recommendations = generateRecommendations(overview);

  return overview;
}

/**
 * Generate smart recommendations
 */
function generateRecommendations(overview) {
  const recommendations = [];

  // Urgent unread messages
  const urgentMessages = overview.unreadMessages.filter(m =>
    m.priority === 'urgent' || m.priority === 'critical'
  );
  if (urgentMessages.length > 0) {
    recommendations.push({
      priority: 'high',
      action: 'read_urgent_messages',
      description: `You have ${urgentMessages.length} urgent message(s) to read`,
      count: urgentMessages.length
    });
  }

  // High priority unclaimed tasks
  const highPriorityTasks = overview.availableTasks.filter(t =>
    t.priorityScore > 60 && t.status === 'pending'
  );
  if (highPriorityTasks.length > 0) {
    recommendations.push({
      priority: 'medium',
      action: 'claim_high_priority_task',
      description: `${highPriorityTasks.length} high-priority task(s) available to claim`,
      tasks: highPriorityTasks.slice(0, 3)
    });
  }

  // Stale sessions
  const staleSessions = overview.activeSessions.filter(s => s.status === 'stale');
  if (staleSessions.length > 0) {
    recommendations.push({
      priority: 'low',
      action: 'check_stale_sessions',
      description: `${staleSessions.length} session(s) appear stale - may need handoff`,
      sessions: staleSessions
    });
  }

  // In-progress tasks that might need attention
  const myInProgress = overview.myTasks.filter(t => t.status === 'claimed');
  if (myInProgress.length > 0) {
    recommendations.push({
      priority: 'info',
      action: 'continue_tasks',
      description: `You have ${myInProgress.length} task(s) in progress`,
      tasks: myInProgress
    });
  }

  return recommendations;
}

/**
 * Morning brief for coordination
 */
function getCoordinationMorningBrief() {
  const brief = {
    timestamp: new Date().toISOString(),
    title: 'Claude Coordination Morning Brief'
  };

  // System health
  const sessions = getActiveSessions();
  brief.systemHealth = {
    activeSessions: sessions.length,
    staleSessions: sessions.filter(s => s.status === 'stale').length
  };

  // Task overview
  const allTasks = getAvailableTasks('pm_architect'); // PM sees all
  brief.taskOverview = {
    totalPending: allTasks.filter(t => t.status === 'pending').length,
    totalInProgress: allTasks.filter(t => t.status === 'claimed').length,
    highPriority: allTasks.filter(t => t.priorityScore > 60).length
  };

  // Recent completions (last 24 hours)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentActivity = getRecentActivity(100);
  brief.completedYesterday = recentActivity.filter(a =>
    a.action === 'complete_task' && a.timestamp > yesterday
  ).length;

  // Unacknowledged alerts
  brief.activeAlerts = getCoordinationAlerts(true).length;

  // Key recommendations
  brief.recommendations = [];

  if (brief.systemHealth.staleSessions > 0) {
    brief.recommendations.push(
      `${brief.systemHealth.staleSessions} Claude session(s) are stale - check if they crashed`
    );
  }

  if (brief.taskOverview.highPriority > 3) {
    brief.recommendations.push(
      `${brief.taskOverview.highPriority} high-priority tasks need attention`
    );
  }

  if (brief.activeAlerts > 0) {
    brief.recommendations.push(
      `${brief.activeAlerts} alert(s) need acknowledgement`
    );
  }

  return brief;
}

// ==========================================
// CLAUDE COMMAND CENTER - Remote Control Functions
// ==========================================

/**
 * Get overall Claude status for the command center
 */
function getClaudeStatus() {
  const sessionsResult = getActiveSessions();
  const sessions = Array.isArray(sessionsResult) ? sessionsResult : (sessionsResult.sessions || []);
  const activeSessions = sessions.filter(s => s.status === 'active' || s.status === 'stale');

  if (activeSessions.length === 0) {
    return {
      success: true,
      status: 'offline',
      message: 'No active Claude sessions',
      sessions: []
    };
  }

  // Find what Claude is currently working on
  const currentTask = activeSessions[0]?.currentTask || 'Ready for commands';

  return {
    success: true,
    status: activeSessions.some(s => s.currentTask) ? 'working' : 'active',
    currentTask: currentTask,
    sessions: activeSessions.map(s => ({
      role: s.role,
      status: s.status,
      currentTask: s.currentTask,
      lastActive: s.lastActive
    })),
    message: `${activeSessions.length} active session(s)`
  };
}

/**
 * Get pending permission requests
 */
function getPendingPermissions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('CLAUDE_PERMISSIONS');

  if (!sheet) {
    // Create the permissions sheet
    sheet = ss.insertSheet('CLAUDE_PERMISSIONS');
    sheet.appendRow(['ID', 'Timestamp', 'Type', 'Title', 'Description', 'RequestedBy', 'Status', 'RespondedAt', 'Response']);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  const data = sheet.getDataRange().getValues();
  const permissions = [];

  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    permissions.push({
      id: data[i][0],
      timestamp: data[i][1],
      type: data[i][2],
      title: data[i][3],
      description: data[i][4],
      requestedBy: data[i][5],
      status: data[i][6] || 'pending',
      respondedAt: data[i][7],
      response: data[i][8]
    });
  }

  // Sort by timestamp descending, pending first
  permissions.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  return {
    success: true,
    permissions: permissions.slice(0, 50),
    pendingCount: permissions.filter(p => p.status === 'pending').length
  };
}

/**
 * Create a permission request (called by Claude when it needs approval)
 */
function createPermissionRequest(type, title, description, requestedBy) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('CLAUDE_PERMISSIONS');

  if (!sheet) {
    sheet = ss.insertSheet('CLAUDE_PERMISSIONS');
    sheet.appendRow(['ID', 'Timestamp', 'Type', 'Title', 'Description', 'RequestedBy', 'Status', 'RespondedAt', 'Response']);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  const permId = 'perm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

  sheet.appendRow([
    permId,
    new Date().toISOString(),
    type || 'ACTION',
    title,
    description,
    requestedBy || 'CLAUDE_CODE',
    'pending',
    '',
    ''
  ]);

  // Send SMS alert for permission request
  createCoordinationAlert(
    requestedBy || 'CLAUDE_CODE',
    'urgent',
    'Permission Request: ' + title,
    description.substring(0, 100),
    true
  );

  return {
    success: true,
    permissionId: permId,
    message: 'Permission request created'
  };
}

/**
 * Respond to a permission request
 */
function respondToPermission(permissionId, approved) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('CLAUDE_PERMISSIONS');

  if (!sheet) {
    return { success: false, error: 'Permissions sheet not found' };
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === permissionId) {
      sheet.getRange(i + 1, 7).setValue(approved ? 'approved' : 'denied');
      sheet.getRange(i + 1, 8).setValue(new Date().toISOString());
      sheet.getRange(i + 1, 9).setValue(approved ? 'Approved by owner' : 'Denied by owner');

      logCoordinationActivity('OWNER', 'permission_response', {
        permissionId: permissionId,
        approved: approved,
        title: data[i][3]
      });

      return {
        success: true,
        message: `Permission ${approved ? 'approved' : 'denied'}`
      };
    }
  }

  return { success: false, error: 'Permission not found' };
}

/**
 * Check if a permission has been granted (for Claude to poll)
 */
function checkPermissionStatus(permissionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('CLAUDE_PERMISSIONS');

  if (!sheet) {
    return { success: false, status: 'not_found' };
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === permissionId) {
      return {
        success: true,
        status: data[i][6] || 'pending',
        respondedAt: data[i][7],
        response: data[i][8]
      };
    }
  }

  return { success: false, status: 'not_found' };
}

// ==========================================
// API ROUTING
// ==========================================

/**
 * Handle coordination API requests
 */
function handleCoordinationAPI(action, params) {
  switch (action) {
    // Messages
    case 'sendMessage':
      return sendClaudeMessage(
        params.from, params.to, params.subject, params.body, params.options
      );
    case 'getMessages':
      return getClaudeMessages(params.role, params.options);
    case 'markRead':
      return markMessageRead(params.messageId, params.role);
    case 'acknowledgeMessage':
      return acknowledgeMessage(params.messageId, params.role, params.response);

    // Sessions
    case 'registerSession':
      return registerClaudeSession(params.role, params.context);
    case 'heartbeat':
      return updateSessionHeartbeat(params.sessionId);
    case 'endSession':
      return endClaudeSession(params.sessionId, params.summary);
    case 'getActiveSessions':
      return getActiveSessions();

    // Tasks
    case 'createTask':
      return createCoordinationTask(
        params.createdBy, params.title, params.description, params.options
      );
    case 'claimTask':
      return claimTask(params.taskId, params.role, params.sessionId);
    case 'updateTask':
      return updateTaskProgress(params.taskId, params.role, params.note, params.status);
    case 'getTasks':
      return getAvailableTasks(params.role, params.options);

    // File locks
    case 'lockFile':
      return lockFile(params.filePath, params.sessionId, params.reason);
    case 'releaseFile':
      return releaseFileLock(params.filePath, params.sessionId);
    case 'checkFile':
      return checkFileAvailability(params.filePath);

    // Alerts
    case 'createAlert':
      return createCoordinationAlert(
        params.sourceRole, params.priority, params.title, params.message, params.sendSms
      );
    case 'getAlerts':
      return getCoordinationAlerts(params.unacknowledgedOnly);
    case 'acknowledgeAlert':
      return acknowledgeAlert(params.alertId);

    // Overview
    case 'getOverview':
      return getCoordinationOverview(params.role);
    case 'getMorningBrief':
      return getCoordinationMorningBrief();
    case 'getActivity':
      return getRecentActivity(params.limit, params.roleFilter);

    // SMS
    case 'sendSMS':
      return { success: sendTwilioSMS(params.message) };
    case 'testSMS':
      return { success: testTwilioSMS() };
    case 'configureTwilio':
      return configureCoordinationTwilio(params);
    case 'getTwilioStatus':
      return getTwilioStatus();

    // Init
    case 'initialize':
      return initializeCoordinationSheets();

    default:
      return { success: false, error: `Unknown coordination action: ${action}` };
  }
}
