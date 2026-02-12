/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HUMAN-ON-THE-LOOP PAUSE & RESUME SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements Human-on-the-Loop (HOTL) capability for the Governor system.
 * Allows tasks to be paused when human intervention is required and resumed
 * with human input injected at the exact pause point.
 *
 * Pause Triggers:
 *   - HIGH/CRITICAL risk task reached execution point
 *   - Agent confidence < 85% (STATUS_ABSTAIN)
 *   - Circuit breaker tripped
 *   - Explicit human review required
 *   - Governor policy violation
 *
 * Usage:
 *   const pr = require('./pause_resume');
 *   await pr.pauseTask('TASK-001', 'confidence_low', { requiredAction: 'Review AI decision' });
 *   const paused = pr.getPausedTasks();
 *   await pr.resumeTask('TASK-001', { approved: true, notes: 'Looks good' });
 *
 * CLI:
 *   node scripts/pause_resume.js list
 *   node scripts/pause_resume.js resume TASK-001 --input='{"approved":true}'
 *   node scripts/pause_resume.js notify TASK-001 high "Context message"
 *   node scripts/pause_resume.js status TASK-001
 *
 * Created: 2026-02-12
 * Part of: Human-on-the-Loop Governance System
 * ═══════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION & PATHS
// ═══════════════════════════════════════════════════════════════════════════

const TINYPM_DIR = path.join(__dirname, '..', 'tinypm');
const PAUSED_TASKS_DIR = path.join(TINYPM_DIR, '.paused_tasks');
const HUMAN_REQUIRED_DIR = path.join(TINYPM_DIR, '.human_required');
const PAUSE_INDEX_FILE = path.join(TINYPM_DIR, '.pause_index.json');

// Import governor helpers for logging
let governor;
try {
  governor = require('./governor_helpers');
} catch (e) {
  // Fallback if governor_helpers not available
  governor = {
    logGovernorEvent: () => ({ success: true }),
    incrementMetric: () => ({ success: true }),
    VALID_AGENTS: ['PM_Architect', 'Backend_Claude', 'Desktop_Claude', 'Verifier_Claude']
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PAUSE TRIGGER TYPES
// ═══════════════════════════════════════════════════════════════════════════

const PAUSE_TRIGGERS = {
  HIGH_RISK: 'high_risk',              // HIGH/CRITICAL risk task
  CONFIDENCE_LOW: 'confidence_low',     // Agent confidence < 85%
  CIRCUIT_BREAKER: 'circuit_breaker',   // Circuit breaker tripped
  HUMAN_REVIEW: 'human_review',         // Explicit review required
  POLICY_VIOLATION: 'policy_violation', // Governor policy violation
  APPROVAL_REQUIRED: 'approval_required', // Action needs approval
  DATA_SENSITIVE: 'data_sensitive',     // Sensitive data operation
  EXTERNAL_SYSTEM: 'external_system',   // External API/system involved
  FINANCIAL: 'financial',               // Financial transaction
  DEPLOYMENT: 'deployment'              // Production deployment
};

// Urgency levels for human notification
const URGENCY_LEVELS = {
  LOW: 'low',           // Can wait for daily review
  MEDIUM: 'medium',     // Should be addressed within hours
  HIGH: 'high',         // Needs attention ASAP
  CRITICAL: 'critical'  // Immediate attention required
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ensure directories exist
 */
function ensureDirectories() {
  [PAUSED_TASKS_DIR, HUMAN_REQUIRED_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Generate a unique ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Read JSON file safely
 */
function readJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }
  return null;
}

/**
 * Write JSON file safely
 */
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Get pause index (tracks all paused tasks)
 */
function getPauseIndex() {
  let index = readJsonFile(PAUSE_INDEX_FILE);
  if (!index) {
    index = {
      version: '1.0',
      created: new Date().toISOString(),
      paused_tasks: {},
      statistics: {
        total_paused: 0,
        total_resumed: 0,
        total_expired: 0
      }
    };
  }
  return index;
}

/**
 * Save pause index
 */
function savePauseIndex(index) {
  index.last_updated = new Date().toISOString();
  return writeJsonFile(PAUSE_INDEX_FILE, index);
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE PAUSE/RESUME FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pause a task and serialize its full context for later resumption
 *
 * @param {string} taskId - Task identifier
 * @param {string} reason - Pause trigger type (from PAUSE_TRIGGERS)
 * @param {object} options - Pause options
 * @param {string} options.requiredAction - What human action is needed
 * @param {string} options.agent - Agent that triggered the pause
 * @param {object} options.context - Full task context to serialize
 * @param {string} options.urgency - Urgency level for notification
 * @param {number} options.confidence - Agent's confidence level (0-100)
 * @param {string} options.policyViolated - Which policy was violated (if applicable)
 * @param {object} options.executionState - Current execution state to restore
 * @returns {object} Result with success status and pause details
 *
 * @example
 * pauseTask('TASK-001', 'confidence_low', {
 *   requiredAction: 'Review the AI-generated content before publishing',
 *   agent: 'Backend_Claude',
 *   confidence: 72,
 *   context: { action: 'publish', target: 'shopify' },
 *   urgency: 'high'
 * });
 */
function pauseTask(taskId, reason, options = {}) {
  ensureDirectories();

  const result = {
    success: false,
    pauseId: null,
    taskId: taskId,
    error: null
  };

  // Validate inputs
  if (!taskId) {
    result.error = 'Task ID is required';
    return result;
  }

  if (!Object.values(PAUSE_TRIGGERS).includes(reason)) {
    console.warn(`Unknown pause reason: ${reason}. Valid reasons: ${Object.values(PAUSE_TRIGGERS).join(', ')}`);
  }

  // Check if task is already paused
  const index = getPauseIndex();
  if (index.paused_tasks[taskId]) {
    result.error = `Task ${taskId} is already paused`;
    return result;
  }

  // Create pause record
  const pauseId = `PAUSE-${taskId}-${generateId()}`;
  const timestamp = new Date().toISOString();
  const urgency = options.urgency || URGENCY_LEVELS.MEDIUM;

  const pauseRecord = {
    pauseId: pauseId,
    taskId: taskId,
    reason: reason,
    requiredAction: options.requiredAction || 'Human review required',
    agent: options.agent || 'unknown',
    confidence: options.confidence || null,
    policyViolated: options.policyViolated || null,
    urgency: urgency,
    pausedAt: timestamp,
    resumedAt: null,
    status: 'paused',

    // Full context serialization for resumption
    context: {
      taskContext: options.context || {},
      executionState: options.executionState || {},
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        cwd: process.cwd()
      },
      metadata: options.metadata || {}
    },

    // Human input storage (filled on resume)
    humanInput: null,
    humanReviewedBy: null,
    humanReviewedAt: null,

    // Resume tracking
    resumeAttempts: 0,
    lastResumeAttempt: null
  };

  // Write pause record to file
  const pauseFilePath = path.join(PAUSED_TASKS_DIR, `${taskId}.json`);
  if (!writeJsonFile(pauseFilePath, pauseRecord)) {
    result.error = 'Failed to write pause record';
    return result;
  }

  // Update index
  index.paused_tasks[taskId] = {
    pauseId: pauseId,
    reason: reason,
    urgency: urgency,
    pausedAt: timestamp,
    agent: options.agent || 'unknown'
  };
  index.statistics.total_paused++;

  if (!savePauseIndex(index)) {
    result.error = 'Failed to update pause index';
    return result;
  }

  // Log to governor audit
  governor.logGovernorEvent(options.agent || 'PM_Architect', 'task_paused', 'pending', {
    taskId: taskId,
    pauseId: pauseId,
    reason: reason,
    requiredAction: options.requiredAction,
    confidence: options.confidence,
    urgency: urgency
  });

  // Create notification if urgency is high or critical
  if (urgency === URGENCY_LEVELS.HIGH || urgency === URGENCY_LEVELS.CRITICAL) {
    notifyHumanRequired(taskId, urgency, {
      reason: reason,
      requiredAction: options.requiredAction,
      agent: options.agent,
      confidence: options.confidence
    });
  }

  result.success = true;
  result.pauseId = pauseId;
  result.timestamp = timestamp;
  result.urgency = urgency;

  return result;
}

/**
 * Resume a paused task with human input
 *
 * @param {string} taskId - Task identifier
 * @param {object} humanInput - Human's input/decision
 * @param {object} options - Resume options
 * @param {string} options.reviewedBy - Human reviewer identifier
 * @param {boolean} options.validateInput - Whether to validate human input
 * @returns {object} Result with success status and restored context
 *
 * @example
 * resumeTask('TASK-001', {
 *   approved: true,
 *   notes: 'Content reviewed and approved',
 *   modifications: { title: 'Updated Title' }
 * }, { reviewedBy: 'todd@tinyseedfarmpgh.com' });
 */
function resumeTask(taskId, humanInput, options = {}) {
  ensureDirectories();

  const result = {
    success: false,
    taskId: taskId,
    restoredContext: null,
    error: null
  };

  // Validate inputs
  if (!taskId) {
    result.error = 'Task ID is required';
    return result;
  }

  // Load pause record
  const pauseFilePath = path.join(PAUSED_TASKS_DIR, `${taskId}.json`);
  const pauseRecord = readJsonFile(pauseFilePath);

  if (!pauseRecord) {
    result.error = `No pause record found for task ${taskId}`;
    return result;
  }

  if (pauseRecord.status !== 'paused') {
    result.error = `Task ${taskId} is not in paused state (current: ${pauseRecord.status})`;
    return result;
  }

  // Validate human input if required
  if (options.validateInput) {
    const validation = validateHumanInput(humanInput, pauseRecord);
    if (!validation.valid) {
      result.error = `Invalid human input: ${validation.errors.join(', ')}`;
      pauseRecord.resumeAttempts++;
      pauseRecord.lastResumeAttempt = new Date().toISOString();
      writeJsonFile(pauseFilePath, pauseRecord);
      return result;
    }
  }

  // Update pause record with resume info
  const timestamp = new Date().toISOString();
  pauseRecord.status = 'resumed';
  pauseRecord.resumedAt = timestamp;
  pauseRecord.humanInput = humanInput;
  pauseRecord.humanReviewedBy = options.reviewedBy || 'human';
  pauseRecord.humanReviewedAt = timestamp;
  pauseRecord.resumeAttempts++;
  pauseRecord.lastResumeAttempt = timestamp;

  // Save updated pause record
  if (!writeJsonFile(pauseFilePath, pauseRecord)) {
    result.error = 'Failed to update pause record';
    return result;
  }

  // Update index
  const index = getPauseIndex();
  if (index.paused_tasks[taskId]) {
    delete index.paused_tasks[taskId];
    index.statistics.total_resumed++;
    savePauseIndex(index);
  }

  // Remove from human_required if exists
  const notificationPath = path.join(HUMAN_REQUIRED_DIR, `${taskId}.json`);
  if (fs.existsSync(notificationPath)) {
    fs.unlinkSync(notificationPath);
  }

  // Log to governor audit
  governor.logGovernorEvent(pauseRecord.agent, 'task_resumed', 'success', {
    taskId: taskId,
    pauseId: pauseRecord.pauseId,
    humanInput: humanInput,
    reviewedBy: options.reviewedBy,
    pauseDuration: calculateDuration(pauseRecord.pausedAt, timestamp)
  });

  // Prepare restored context with human input injected
  result.success = true;
  result.restoredContext = {
    ...pauseRecord.context,
    humanInput: humanInput,
    resumeMetadata: {
      pauseId: pauseRecord.pauseId,
      pausedAt: pauseRecord.pausedAt,
      resumedAt: timestamp,
      pauseReason: pauseRecord.reason,
      reviewedBy: options.reviewedBy
    }
  };

  return result;
}

/**
 * Get all currently paused tasks
 *
 * @param {object} options - Filter options
 * @param {string} options.urgency - Filter by urgency level
 * @param {string} options.agent - Filter by agent
 * @param {string} options.reason - Filter by pause reason
 * @returns {array} Array of paused task summaries
 */
function getPausedTasks(options = {}) {
  ensureDirectories();

  const index = getPauseIndex();
  const pausedTasks = [];

  for (const [taskId, summary] of Object.entries(index.paused_tasks)) {
    // Apply filters
    if (options.urgency && summary.urgency !== options.urgency) continue;
    if (options.agent && summary.agent !== options.agent) continue;
    if (options.reason && summary.reason !== options.reason) continue;

    // Load full pause record for additional details
    const pauseFilePath = path.join(PAUSED_TASKS_DIR, `${taskId}.json`);
    const pauseRecord = readJsonFile(pauseFilePath);

    pausedTasks.push({
      taskId: taskId,
      pauseId: summary.pauseId,
      reason: summary.reason,
      urgency: summary.urgency,
      agent: summary.agent,
      pausedAt: summary.pausedAt,
      requiredAction: pauseRecord ? pauseRecord.requiredAction : 'Unknown',
      confidence: pauseRecord ? pauseRecord.confidence : null,
      waitingDuration: calculateDuration(summary.pausedAt, new Date().toISOString())
    });
  }

  // Sort by urgency (critical first) then by time (oldest first)
  const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  pausedTasks.sort((a, b) => {
    const urgencyDiff = (urgencyOrder[a.urgency] || 4) - (urgencyOrder[b.urgency] || 4);
    if (urgencyDiff !== 0) return urgencyDiff;
    return new Date(a.pausedAt) - new Date(b.pausedAt);
  });

  return pausedTasks;
}

/**
 * Get detailed pause state for a specific task
 *
 * @param {string} taskId - Task identifier
 * @returns {object} Full pause record or null if not found
 */
function getTaskPauseState(taskId) {
  ensureDirectories();

  const pauseFilePath = path.join(PAUSED_TASKS_DIR, `${taskId}.json`);
  const pauseRecord = readJsonFile(pauseFilePath);

  if (!pauseRecord) {
    return null;
  }

  // Add computed fields
  if (pauseRecord.status === 'paused') {
    pauseRecord.waitingDuration = calculateDuration(
      pauseRecord.pausedAt,
      new Date().toISOString()
    );
  } else if (pauseRecord.status === 'resumed') {
    pauseRecord.totalPauseDuration = calculateDuration(
      pauseRecord.pausedAt,
      pauseRecord.resumedAt
    );
  }

  return pauseRecord;
}

/**
 * Create notification for human-required task
 *
 * @param {string} taskId - Task identifier
 * @param {string} urgency - Urgency level
 * @param {object} context - Additional context for the notification
 * @returns {object} Result with success status
 */
function notifyHumanRequired(taskId, urgency, context = {}) {
  ensureDirectories();

  const result = {
    success: false,
    notificationId: null,
    error: null
  };

  const notificationId = `NOTIFY-${taskId}-${generateId()}`;
  const timestamp = new Date().toISOString();

  const notification = {
    notificationId: notificationId,
    taskId: taskId,
    urgency: urgency,
    createdAt: timestamp,
    acknowledged: false,
    acknowledgedAt: null,
    acknowledgedBy: null,
    context: {
      reason: context.reason || 'Human review required',
      requiredAction: context.requiredAction || 'Please review',
      agent: context.agent || 'unknown',
      confidence: context.confidence || null,
      additionalInfo: context.additionalInfo || null
    }
  };

  const notificationPath = path.join(HUMAN_REQUIRED_DIR, `${taskId}.json`);
  if (!writeJsonFile(notificationPath, notification)) {
    result.error = 'Failed to create notification';
    return result;
  }

  // Log notification creation
  governor.logGovernorEvent(context.agent || 'PM_Architect', 'human_notification_created', 'pending', {
    taskId: taskId,
    notificationId: notificationId,
    urgency: urgency,
    reason: context.reason
  });

  result.success = true;
  result.notificationId = notificationId;

  return result;
}

/**
 * Get summary of all tasks awaiting human input
 *
 * @returns {object} Summary with counts by urgency and list of notifications
 */
function getHumanRequiredSummary() {
  ensureDirectories();

  const notifications = [];
  const files = fs.readdirSync(HUMAN_REQUIRED_DIR);

  for (const file of files) {
    if (file.endsWith('.json')) {
      const notificationPath = path.join(HUMAN_REQUIRED_DIR, file);
      const notification = readJsonFile(notificationPath);
      if (notification && !notification.acknowledged) {
        notifications.push(notification);
      }
    }
  }

  // Count by urgency
  const byUrgency = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  notifications.forEach(n => {
    if (byUrgency.hasOwnProperty(n.urgency)) {
      byUrgency[n.urgency]++;
    }
  });

  // Sort by urgency
  const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  notifications.sort((a, b) => {
    return (urgencyOrder[a.urgency] || 4) - (urgencyOrder[b.urgency] || 4);
  });

  return {
    totalPending: notifications.length,
    byUrgency: byUrgency,
    needsImmediateAttention: byUrgency.critical > 0,
    notifications: notifications
  };
}

/**
 * Acknowledge a human-required notification
 *
 * @param {string} taskId - Task identifier
 * @param {string} acknowledgedBy - Who acknowledged it
 * @returns {object} Result with success status
 */
function acknowledgeNotification(taskId, acknowledgedBy) {
  const notificationPath = path.join(HUMAN_REQUIRED_DIR, `${taskId}.json`);
  const notification = readJsonFile(notificationPath);

  if (!notification) {
    return { success: false, error: 'Notification not found' };
  }

  notification.acknowledged = true;
  notification.acknowledgedAt = new Date().toISOString();
  notification.acknowledgedBy = acknowledgedBy;

  if (!writeJsonFile(notificationPath, notification)) {
    return { success: false, error: 'Failed to update notification' };
  }

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate human input against pause record requirements
 */
function validateHumanInput(input, pauseRecord) {
  const errors = [];

  // Basic validation - must have some input
  if (!input || typeof input !== 'object') {
    errors.push('Human input must be an object');
    return { valid: false, errors };
  }

  // Check for approval/rejection if reason was approval_required
  if (pauseRecord.reason === PAUSE_TRIGGERS.APPROVAL_REQUIRED) {
    if (input.approved === undefined) {
      errors.push('Approval decision (approved: true/false) is required');
    }
  }

  // Check for notes on rejection
  if (input.approved === false && !input.notes && !input.reason) {
    errors.push('Notes or reason required when rejecting');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Calculate duration between two ISO timestamps
 */
function calculateDuration(startISO, endISO) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const diffMs = end - start;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Core functions
  pauseTask,
  resumeTask,
  getPausedTasks,
  getTaskPauseState,

  // Notification functions
  notifyHumanRequired,
  getHumanRequiredSummary,
  acknowledgeNotification,

  // Constants
  PAUSE_TRIGGERS,
  URGENCY_LEVELS,

  // Paths (for external tools)
  PAUSED_TASKS_DIR,
  HUMAN_REQUIRED_DIR,
  PAUSE_INDEX_FILE
};

// ═══════════════════════════════════════════════════════════════════════════
// CLI INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'list': {
      // node scripts/pause_resume.js list [--urgency high] [--agent Backend_Claude]
      const options = {};
      for (let i = 1; i < args.length; i += 2) {
        const key = args[i].replace('--', '');
        options[key] = args[i + 1];
      }

      const paused = getPausedTasks(options);

      if (paused.length === 0) {
        console.log('\n No paused tasks.\n');
      } else {
        console.log(`\n PAUSED TASKS (${paused.length} total)\n`);
        console.log('─'.repeat(80));

        paused.forEach((task, i) => {
          const urgencyIcon = {
            critical: '!!!',
            high: '!! ',
            medium: '!  ',
            low: '   '
          }[task.urgency] || '   ';

          console.log(`${urgencyIcon} [${task.taskId}] ${task.reason}`);
          console.log(`    Agent: ${task.agent} | Urgency: ${task.urgency.toUpperCase()}`);
          console.log(`    Action: ${task.requiredAction}`);
          console.log(`    Waiting: ${task.waitingDuration}`);
          if (task.confidence !== null) {
            console.log(`    Confidence: ${task.confidence}%`);
          }
          console.log('');
        });
      }
      break;
    }

    case 'resume': {
      // node scripts/pause_resume.js resume TASK-001 --input='{"approved":true}'
      const taskId = args[1];
      let humanInput = {};

      for (let i = 2; i < args.length; i++) {
        if (args[i].startsWith('--input=')) {
          try {
            humanInput = JSON.parse(args[i].replace('--input=', ''));
          } catch (e) {
            console.error('Error: Invalid JSON input');
            process.exit(1);
          }
        }
      }

      if (!taskId) {
        console.error('Error: Task ID required');
        console.log('Usage: node scripts/pause_resume.js resume <taskId> --input=\'{"approved":true}\'');
        process.exit(1);
      }

      const result = resumeTask(taskId, humanInput, { validateInput: true });
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'status': {
      // node scripts/pause_resume.js status TASK-001
      const taskId = args[1];

      if (!taskId) {
        console.error('Error: Task ID required');
        process.exit(1);
      }

      const state = getTaskPauseState(taskId);
      if (state) {
        console.log(JSON.stringify(state, null, 2));
      } else {
        console.log(`No pause record found for task: ${taskId}`);
      }
      break;
    }

    case 'notify': {
      // node scripts/pause_resume.js notify TASK-001 high "Context message"
      const taskId = args[1];
      const urgency = args[2] || 'medium';
      const message = args[3] || 'Human review required';

      if (!taskId) {
        console.error('Error: Task ID required');
        process.exit(1);
      }

      const result = notifyHumanRequired(taskId, urgency, {
        requiredAction: message
      });
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'summary': {
      // node scripts/pause_resume.js summary
      const summary = getHumanRequiredSummary();

      console.log('\n HUMAN ATTENTION REQUIRED SUMMARY\n');
      console.log('─'.repeat(50));
      console.log(`Total Pending: ${summary.totalPending}`);
      console.log(`  Critical: ${summary.byUrgency.critical}`);
      console.log(`  High:     ${summary.byUrgency.high}`);
      console.log(`  Medium:   ${summary.byUrgency.medium}`);
      console.log(`  Low:      ${summary.byUrgency.low}`);

      if (summary.needsImmediateAttention) {
        console.log('\n!!! CRITICAL ITEMS NEED IMMEDIATE ATTENTION !!!');
      }

      if (summary.notifications.length > 0) {
        console.log('\nPending Notifications:');
        summary.notifications.forEach(n => {
          console.log(`  [${n.urgency.toUpperCase()}] ${n.taskId}: ${n.context.requiredAction}`);
        });
      }
      console.log('');
      break;
    }

    case 'acknowledge': {
      // node scripts/pause_resume.js acknowledge TASK-001 reviewer@email.com
      const taskId = args[1];
      const acknowledgedBy = args[2] || 'human';

      if (!taskId) {
        console.error('Error: Task ID required');
        process.exit(1);
      }

      const result = acknowledgeNotification(taskId, acknowledgedBy);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'pause': {
      // node scripts/pause_resume.js pause TASK-001 high_risk --action="Review before deploy" --agent=Backend_Claude
      const taskId = args[1];
      const reason = args[2] || 'human_review';
      const options = {};

      for (let i = 3; i < args.length; i++) {
        if (args[i].startsWith('--action=')) {
          options.requiredAction = args[i].replace('--action=', '');
        } else if (args[i].startsWith('--agent=')) {
          options.agent = args[i].replace('--agent=', '');
        } else if (args[i].startsWith('--urgency=')) {
          options.urgency = args[i].replace('--urgency=', '');
        } else if (args[i].startsWith('--confidence=')) {
          options.confidence = parseInt(args[i].replace('--confidence=', ''), 10);
        }
      }

      if (!taskId) {
        console.error('Error: Task ID required');
        console.log('Usage: node scripts/pause_resume.js pause <taskId> <reason> [options]');
        process.exit(1);
      }

      const result = pauseTask(taskId, reason, options);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    default:
      console.log(`
Human-on-the-Loop Pause & Resume System CLI

Usage:
  node scripts/pause_resume.js <command> [options]

═══════════════════════════════════════════════════════════════════════════
COMMANDS
═══════════════════════════════════════════════════════════════════════════

  list [--urgency <level>] [--agent <name>] [--reason <type>]
    List all paused tasks
    Example: node scripts/pause_resume.js list
    Example: node scripts/pause_resume.js list --urgency high

  pause <taskId> <reason> [options]
    Pause a task for human review
    Reasons: high_risk, confidence_low, circuit_breaker, human_review,
             policy_violation, approval_required, data_sensitive,
             external_system, financial, deployment
    Options:
      --action="Description of required action"
      --agent=Backend_Claude
      --urgency=high (low, medium, high, critical)
      --confidence=72 (0-100)
    Example: node scripts/pause_resume.js pause TASK-001 high_risk --action="Review deploy" --urgency=high

  resume <taskId> --input='<json>'
    Resume a paused task with human input
    Example: node scripts/pause_resume.js resume TASK-001 --input='{"approved":true,"notes":"Looks good"}'

  status <taskId>
    Get detailed pause state for a task
    Example: node scripts/pause_resume.js status TASK-001

  notify <taskId> <urgency> "<message>"
    Create human-required notification
    Example: node scripts/pause_resume.js notify TASK-001 critical "Immediate review needed"

  summary
    Get summary of all tasks awaiting human input
    Example: node scripts/pause_resume.js summary

  acknowledge <taskId> [reviewer]
    Acknowledge a notification
    Example: node scripts/pause_resume.js acknowledge TASK-001 todd@email.com

═══════════════════════════════════════════════════════════════════════════
PAUSE TRIGGERS
═══════════════════════════════════════════════════════════════════════════

  high_risk         - HIGH/CRITICAL risk task reached execution point
  confidence_low    - Agent confidence < 85% (STATUS_ABSTAIN)
  circuit_breaker   - Circuit breaker tripped
  human_review      - Explicit human review required
  policy_violation  - Governor policy violation
  approval_required - Action needs approval
  data_sensitive    - Sensitive data operation
  external_system   - External API/system involved
  financial         - Financial transaction
  deployment        - Production deployment

═══════════════════════════════════════════════════════════════════════════
URGENCY LEVELS
═══════════════════════════════════════════════════════════════════════════

  low      - Can wait for daily review
  medium   - Should be addressed within hours
  high     - Needs attention ASAP
  critical - Immediate attention required (triggers notification)

═══════════════════════════════════════════════════════════════════════════
INTEGRATION
═══════════════════════════════════════════════════════════════════════════

Programmatic usage:
  const pr = require('./scripts/pause_resume');

  // Pause a task
  const pauseResult = pr.pauseTask('TASK-001', 'high_risk', {
    requiredAction: 'Review before deploying to production',
    agent: 'Backend_Claude',
    confidence: 72,
    urgency: 'high',
    context: { deployTarget: 'shopify', changes: [...] }
  });

  // Resume with human input
  const resumeResult = pr.resumeTask('TASK-001', {
    approved: true,
    notes: 'Reviewed and approved'
  });

  // Get all paused tasks
  const paused = pr.getPausedTasks({ urgency: 'critical' });
      `);
  }
}
