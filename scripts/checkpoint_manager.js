/**
 * ============================================================================
 * DURABLE CHECKPOINTING SYSTEM
 * ============================================================================
 *
 * Provides durable state persistence for agent tasks, enabling recovery
 * from interruptions and resumption of incomplete work.
 *
 * Usage:
 *   const checkpoint = require('./checkpoint_manager');
 *   checkpoint.createCheckpoint('TASK-001', 'Backend_Claude', state, 1);
 *   const latest = checkpoint.getLatestCheckpoint('TASK-001');
 *   checkpoint.resumeFromCheckpoint('TASK-001');
 *
 * CLI:
 *   node scripts/checkpoint_manager.js list <taskId>
 *   node scripts/checkpoint_manager.js resume <taskId>
 *   node scripts/checkpoint_manager.js delete <taskId> [stepNumber]
 *   node scripts/checkpoint_manager.js cleanup [days]
 *
 * Created: 2026-02-12
 * Part of: Agentic Performance Improvement Plan
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

// Import governor helpers for logging state transitions
let governor;
try {
  governor = require('./governor_helpers');
} catch (e) {
  // Governor may not be available in all contexts
  governor = null;
}

// Constants
const TINYPM_DIR = path.join(__dirname, '..', 'tinypm');
const CHECKPOINTS_DIR = path.join(TINYPM_DIR, '.agent_checkpoints');
const CHECKPOINT_INDEX_FILE = path.join(CHECKPOINTS_DIR, '_index.json');

// Ensure checkpoint directory exists
if (!fs.existsSync(CHECKPOINTS_DIR)) {
  fs.mkdirSync(CHECKPOINTS_DIR, { recursive: true });
}

/**
 * Generate a unique checkpoint ID
 * @returns {string} Unique identifier
 */
function generateCheckpointId() {
  return `CP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get the file path for a task's checkpoints
 * @param {string} taskId - Task identifier
 * @returns {string} File path
 */
function getTaskCheckpointFile(taskId) {
  const safeTaskId = taskId.replace(/[^a-zA-Z0-9-_]/g, '_');
  return path.join(CHECKPOINTS_DIR, `${safeTaskId}.json`);
}

/**
 * Read a JSON file safely
 * @param {string} filePath - Path to the JSON file
 * @returns {object|null} Parsed JSON or null
 */
function readJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }
  return null;
}

/**
 * Write a JSON file safely
 * @param {string} filePath - Path to the JSON file
 * @param {object} data - Data to write
 * @returns {boolean} Success status
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
 * Update the checkpoint index
 * @param {string} taskId - Task identifier
 * @param {object} metadata - Checkpoint metadata
 */
function updateIndex(taskId, metadata) {
  let index = readJsonFile(CHECKPOINT_INDEX_FILE) || {
    version: '1.0',
    created: new Date().toISOString(),
    tasks: {}
  };

  index.tasks[taskId] = {
    ...metadata,
    lastUpdated: new Date().toISOString()
  };

  index.lastUpdated = new Date().toISOString();
  writeJsonFile(CHECKPOINT_INDEX_FILE, index);
}

/**
 * Create a checkpoint for a task
 *
 * @param {string} taskId - Unique task identifier
 * @param {string} agentId - Agent creating the checkpoint
 * @param {object} state - Current state to checkpoint
 * @param {number} stepNumber - Step number in the task execution
 * @returns {object} Result with success status and checkpoint ID
 *
 * @example
 * const result = createCheckpoint('TASK-001', 'Backend_Claude', {
 *   title: 'Fix API endpoint',
 *   status: 'in_progress',
 *   completedSteps: ['research', 'implement'],
 *   pendingSteps: ['test', 'deploy']
 * }, 2);
 */
function createCheckpoint(taskId, agentId, state, stepNumber) {
  const result = {
    success: false,
    checkpointId: null,
    timestamp: null,
    error: null
  };

  // Validate inputs
  if (!taskId || typeof taskId !== 'string') {
    result.error = 'Invalid taskId: must be a non-empty string';
    return result;
  }
  if (!agentId || typeof agentId !== 'string') {
    result.error = 'Invalid agentId: must be a non-empty string';
    return result;
  }
  if (typeof stepNumber !== 'number' || stepNumber < 0) {
    result.error = 'Invalid stepNumber: must be a non-negative number';
    return result;
  }

  const checkpointId = generateCheckpointId();
  const timestamp = new Date().toISOString();

  // Build checkpoint object
  const checkpoint = {
    checkpointId: checkpointId,
    taskId: taskId,
    agentId: agentId,
    stepNumber: stepNumber,
    timestamp: timestamp,
    currentState: {
      title: state.title || '',
      status: state.status || 'unknown',
      priority: state.priority || 'medium',
      description: state.description || '',
      ...state
    },
    completedSteps: state.completedSteps || [],
    pendingSteps: state.pendingSteps || [],
    context: {
      relevantFiles: state.relevantFiles || [],
      variables: state.variables || {},
      workingDirectory: state.workingDirectory || process.cwd(),
      ...state.context
    },
    lastOutput: state.lastOutput || null,
    metadata: {
      createdAt: timestamp,
      nodeVersion: process.version,
      platform: process.platform
    }
  };

  // Read existing checkpoints for this task
  const filePath = getTaskCheckpointFile(taskId);
  let taskCheckpoints = readJsonFile(filePath) || {
    taskId: taskId,
    created: timestamp,
    checkpoints: []
  };

  // Add new checkpoint
  taskCheckpoints.checkpoints.push(checkpoint);
  taskCheckpoints.lastCheckpoint = checkpointId;
  taskCheckpoints.lastUpdated = timestamp;
  taskCheckpoints.latestStepNumber = stepNumber;

  // Save
  const saved = writeJsonFile(filePath, taskCheckpoints);
  if (!saved) {
    result.error = 'Failed to save checkpoint file';
    return result;
  }

  // Update index
  updateIndex(taskId, {
    agentId: agentId,
    latestCheckpoint: checkpointId,
    latestStepNumber: stepNumber,
    status: state.status || 'unknown',
    checkpointCount: taskCheckpoints.checkpoints.length
  });

  // Log to governor if available
  if (governor && governor.logGovernorEvent) {
    governor.logGovernorEvent(agentId, 'task_started', 'success', {
      taskId: taskId,
      checkpointId: checkpointId,
      stepNumber: stepNumber,
      action: 'checkpoint_created'
    });
  }

  result.success = true;
  result.checkpointId = checkpointId;
  result.timestamp = timestamp;

  return result;
}

/**
 * Load checkpoint data for a task
 *
 * @param {string} taskId - Task identifier
 * @returns {object|null} Checkpoint data or null if not found
 *
 * @example
 * const data = loadCheckpoint('TASK-001');
 * console.log(data.checkpoints.length);
 */
function loadCheckpoint(taskId) {
  const filePath = getTaskCheckpointFile(taskId);
  return readJsonFile(filePath);
}

/**
 * List all checkpoints for a task
 *
 * @param {string} taskId - Task identifier
 * @returns {array} Array of checkpoint summaries
 *
 * @example
 * const checkpoints = listCheckpoints('TASK-001');
 * checkpoints.forEach(cp => console.log(cp.stepNumber, cp.timestamp));
 */
function listCheckpoints(taskId) {
  const data = loadCheckpoint(taskId);
  if (!data || !data.checkpoints) {
    return [];
  }

  return data.checkpoints.map(cp => ({
    checkpointId: cp.checkpointId,
    stepNumber: cp.stepNumber,
    timestamp: cp.timestamp,
    agentId: cp.agentId,
    status: cp.currentState?.status || 'unknown',
    completedStepsCount: cp.completedSteps?.length || 0,
    pendingStepsCount: cp.pendingSteps?.length || 0
  }));
}

/**
 * Delete a specific checkpoint or all checkpoints for a task
 *
 * @param {string} taskId - Task identifier
 * @param {number} [stepNumber] - Optional specific step to delete (deletes all if omitted)
 * @returns {object} Result with success status
 *
 * @example
 * deleteCheckpoint('TASK-001', 2);  // Delete step 2 only
 * deleteCheckpoint('TASK-001');      // Delete all checkpoints for task
 */
function deleteCheckpoint(taskId, stepNumber = null) {
  const result = {
    success: false,
    deleted: 0,
    error: null
  };

  const filePath = getTaskCheckpointFile(taskId);
  const data = loadCheckpoint(taskId);

  if (!data) {
    result.error = `No checkpoints found for task: ${taskId}`;
    return result;
  }

  if (stepNumber === null) {
    // Delete all checkpoints for this task
    try {
      fs.unlinkSync(filePath);
      result.success = true;
      result.deleted = data.checkpoints?.length || 0;

      // Update index
      let index = readJsonFile(CHECKPOINT_INDEX_FILE);
      if (index && index.tasks) {
        delete index.tasks[taskId];
        writeJsonFile(CHECKPOINT_INDEX_FILE, index);
      }
    } catch (error) {
      result.error = `Failed to delete checkpoint file: ${error.message}`;
    }
  } else {
    // Delete specific step
    const originalCount = data.checkpoints?.length || 0;
    data.checkpoints = data.checkpoints.filter(cp => cp.stepNumber !== stepNumber);
    const newCount = data.checkpoints.length;

    if (newCount === originalCount) {
      result.error = `No checkpoint found for step ${stepNumber}`;
      return result;
    }

    // Update last checkpoint info
    if (data.checkpoints.length > 0) {
      const latest = data.checkpoints[data.checkpoints.length - 1];
      data.lastCheckpoint = latest.checkpointId;
      data.latestStepNumber = latest.stepNumber;
    } else {
      data.lastCheckpoint = null;
      data.latestStepNumber = 0;
    }

    data.lastUpdated = new Date().toISOString();
    writeJsonFile(filePath, data);

    result.success = true;
    result.deleted = originalCount - newCount;

    // Update index
    updateIndex(taskId, {
      latestStepNumber: data.latestStepNumber,
      checkpointCount: data.checkpoints.length
    });
  }

  return result;
}

/**
 * Get the latest checkpoint for a task
 *
 * @param {string} taskId - Task identifier
 * @returns {object|null} Latest checkpoint or null if none exist
 *
 * @example
 * const latest = getLatestCheckpoint('TASK-001');
 * if (latest) {
 *   console.log(`Resuming from step ${latest.stepNumber}`);
 * }
 */
function getLatestCheckpoint(taskId) {
  const data = loadCheckpoint(taskId);
  if (!data || !data.checkpoints || data.checkpoints.length === 0) {
    return null;
  }

  // Return the most recent checkpoint
  return data.checkpoints[data.checkpoints.length - 1];
}

/**
 * Resume from the latest checkpoint for a task
 *
 * @param {string} taskId - Task identifier
 * @returns {object} Resume information with state and next steps
 *
 * @example
 * const resume = resumeFromCheckpoint('TASK-001');
 * if (resume.canResume) {
 *   console.log('Pending steps:', resume.pendingSteps);
 * }
 */
function resumeFromCheckpoint(taskId) {
  const result = {
    canResume: false,
    taskId: taskId,
    checkpoint: null,
    resumeFromStep: null,
    pendingSteps: [],
    completedSteps: [],
    context: {},
    lastOutput: null,
    recommendation: null
  };

  const latest = getLatestCheckpoint(taskId);
  if (!latest) {
    result.recommendation = 'No checkpoints found. Start task from beginning.';
    return result;
  }

  result.canResume = true;
  result.checkpoint = latest;
  result.resumeFromStep = latest.stepNumber + 1;
  result.pendingSteps = latest.pendingSteps || [];
  result.completedSteps = latest.completedSteps || [];
  result.context = latest.context || {};
  result.lastOutput = latest.lastOutput;
  result.currentState = latest.currentState;

  // Generate recommendation
  if (result.pendingSteps.length > 0) {
    result.recommendation = `Resume from step ${result.resumeFromStep}. Next pending step: ${result.pendingSteps[0]}`;
  } else {
    result.recommendation = `Task was at step ${latest.stepNumber}. Review currentState to determine next action.`;
  }

  // Log resume event to governor
  if (governor && governor.logGovernorEvent) {
    governor.logGovernorEvent(latest.agentId || 'unknown', 'task_started', 'success', {
      taskId: taskId,
      checkpointId: latest.checkpointId,
      stepNumber: latest.stepNumber,
      action: 'checkpoint_resumed'
    });
  }

  return result;
}

/**
 * List all tasks with incomplete checkpoints
 *
 * @returns {array} Array of task summaries with checkpoint info
 *
 * @example
 * const incomplete = listIncompleteTasks();
 * incomplete.forEach(task => {
 *   if (task.status === 'in_progress') {
 *     resumeFromCheckpoint(task.taskId);
 *   }
 * });
 */
function listIncompleteTasks() {
  const index = readJsonFile(CHECKPOINT_INDEX_FILE);
  if (!index || !index.tasks) {
    return [];
  }

  const incompleteTasks = [];
  for (const [taskId, metadata] of Object.entries(index.tasks)) {
    // Check if task is not in a terminal state
    const status = metadata.status || 'unknown';
    if (!['completed', 'done', 'cancelled', 'DONE'].includes(status)) {
      incompleteTasks.push({
        taskId: taskId,
        agentId: metadata.agentId,
        status: status,
        latestStepNumber: metadata.latestStepNumber,
        checkpointCount: metadata.checkpointCount,
        lastUpdated: metadata.lastUpdated
      });
    }
  }

  // Sort by last updated (most recent first)
  incompleteTasks.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

  return incompleteTasks;
}

/**
 * Check for incomplete tasks on startup (integration helper)
 *
 * @returns {object} Startup check results
 *
 * @example
 * const startup = checkIncompleteOnStartup();
 * if (startup.hasIncompleteTasks) {
 *   console.log('Found incomplete tasks:', startup.tasks);
 * }
 */
function checkIncompleteOnStartup() {
  const incompleteTasks = listIncompleteTasks();

  return {
    hasIncompleteTasks: incompleteTasks.length > 0,
    taskCount: incompleteTasks.length,
    tasks: incompleteTasks,
    recommendation: incompleteTasks.length > 0
      ? `Found ${incompleteTasks.length} incomplete task(s). Consider resuming or cleaning up.`
      : 'No incomplete tasks found.'
  };
}

/**
 * Cleanup old checkpoints
 *
 * @param {number} [daysOld=7] - Delete checkpoints older than this many days
 * @returns {object} Cleanup results
 *
 * @example
 * const cleanup = cleanupOldCheckpoints(14);  // Delete checkpoints older than 14 days
 */
function cleanupOldCheckpoints(daysOld = 7) {
  const result = {
    success: true,
    tasksProcessed: 0,
    checkpointsDeleted: 0,
    errors: []
  };

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const index = readJsonFile(CHECKPOINT_INDEX_FILE);
  if (!index || !index.tasks) {
    return result;
  }

  for (const [taskId, metadata] of Object.entries(index.tasks)) {
    // Only process completed tasks
    const status = metadata.status || 'unknown';
    if (['completed', 'done', 'DONE'].includes(status)) {
      const lastUpdated = new Date(metadata.lastUpdated);
      if (lastUpdated < cutoffDate) {
        const deleteResult = deleteCheckpoint(taskId);
        if (deleteResult.success) {
          result.checkpointsDeleted += deleteResult.deleted;
          result.tasksProcessed++;
        } else {
          result.errors.push({
            taskId: taskId,
            error: deleteResult.error
          });
        }
      }
    }
  }

  if (result.errors.length > 0) {
    result.success = false;
  }

  return result;
}

/**
 * Auto-checkpoint helper for state transitions
 * Designed to be called after each state change in governor_helpers
 *
 * @param {string} taskId - Task identifier
 * @param {string} agentId - Agent making the transition
 * @param {string} previousState - State before transition
 * @param {string} newState - State after transition
 * @param {object} [additionalContext] - Extra context to include
 * @returns {object} Checkpoint result
 */
function autoCheckpointOnTransition(taskId, agentId, previousState, newState, additionalContext = {}) {
  // Get existing checkpoints to determine step number
  const existingCheckpoints = listCheckpoints(taskId);
  const stepNumber = existingCheckpoints.length + 1;

  // Build state object
  const state = {
    title: additionalContext.title || taskId,
    status: newState,
    previousState: previousState,
    description: additionalContext.description || `State transition: ${previousState} -> ${newState}`,
    completedSteps: additionalContext.completedSteps || [],
    pendingSteps: additionalContext.pendingSteps || [],
    relevantFiles: additionalContext.relevantFiles || [],
    variables: additionalContext.variables || {},
    context: additionalContext.context || {},
    lastOutput: additionalContext.lastOutput || null,
    transitionTimestamp: new Date().toISOString()
  };

  return createCheckpoint(taskId, agentId, state, stepNumber);
}

// Export functions
module.exports = {
  // Core functions
  createCheckpoint,
  loadCheckpoint,
  listCheckpoints,
  deleteCheckpoint,
  getLatestCheckpoint,
  resumeFromCheckpoint,

  // Utility functions
  listIncompleteTasks,
  checkIncompleteOnStartup,
  cleanupOldCheckpoints,

  // Integration helpers
  autoCheckpointOnTransition,

  // Constants
  CHECKPOINTS_DIR
};

// CLI Support
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'list':
      // node checkpoint_manager.js list <taskId>
      const listTaskId = args[1];
      if (!listTaskId) {
        // List all tasks with checkpoints
        const incomplete = listIncompleteTasks();
        if (incomplete.length === 0) {
          console.log('No active checkpoints found.');
        } else {
          console.log('Active Tasks with Checkpoints:');
          console.log('='.repeat(60));
          incomplete.forEach(task => {
            console.log(`Task: ${task.taskId}`);
            console.log(`  Agent: ${task.agentId}`);
            console.log(`  Status: ${task.status}`);
            console.log(`  Steps: ${task.latestStepNumber}`);
            console.log(`  Checkpoints: ${task.checkpointCount}`);
            console.log(`  Last Updated: ${task.lastUpdated}`);
            console.log('-'.repeat(60));
          });
        }
      } else {
        // List checkpoints for specific task
        const checkpoints = listCheckpoints(listTaskId);
        if (checkpoints.length === 0) {
          console.log(`No checkpoints found for task: ${listTaskId}`);
        } else {
          console.log(`Checkpoints for task: ${listTaskId}`);
          console.log('='.repeat(60));
          checkpoints.forEach(cp => {
            console.log(`Step ${cp.stepNumber}: ${cp.checkpointId}`);
            console.log(`  Agent: ${cp.agentId}`);
            console.log(`  Status: ${cp.status}`);
            console.log(`  Timestamp: ${cp.timestamp}`);
            console.log(`  Completed: ${cp.completedStepsCount}, Pending: ${cp.pendingStepsCount}`);
            console.log('-'.repeat(60));
          });
        }
      }
      break;

    case 'resume':
      // node checkpoint_manager.js resume <taskId>
      const resumeTaskId = args[1];
      if (!resumeTaskId) {
        console.error('Error: taskId is required');
        console.log('Usage: node checkpoint_manager.js resume <taskId>');
        process.exit(1);
      }
      const resumeResult = resumeFromCheckpoint(resumeTaskId);
      console.log(JSON.stringify(resumeResult, null, 2));
      break;

    case 'delete':
      // node checkpoint_manager.js delete <taskId> [stepNumber]
      const deleteTaskId = args[1];
      const deleteStep = args[2] ? parseInt(args[2], 10) : null;
      if (!deleteTaskId) {
        console.error('Error: taskId is required');
        console.log('Usage: node checkpoint_manager.js delete <taskId> [stepNumber]');
        process.exit(1);
      }
      const deleteResult = deleteCheckpoint(deleteTaskId, deleteStep);
      console.log(JSON.stringify(deleteResult, null, 2));
      break;

    case 'cleanup':
      // node checkpoint_manager.js cleanup [days]
      const days = args[1] ? parseInt(args[1], 10) : 7;
      const cleanupResult = cleanupOldCheckpoints(days);
      console.log(JSON.stringify(cleanupResult, null, 2));
      break;

    case 'startup-check':
      // node checkpoint_manager.js startup-check
      const startupResult = checkIncompleteOnStartup();
      console.log(JSON.stringify(startupResult, null, 2));
      break;

    case 'create':
      // node checkpoint_manager.js create <taskId> <agentId> <stepNumber> <stateJson>
      const createTaskId = args[1];
      const createAgentId = args[2];
      const createStep = args[3] ? parseInt(args[3], 10) : 1;
      const createStateJson = args[4];
      if (!createTaskId || !createAgentId) {
        console.error('Error: taskId and agentId are required');
        console.log('Usage: node checkpoint_manager.js create <taskId> <agentId> <stepNumber> <stateJson>');
        process.exit(1);
      }
      const createState = createStateJson ? JSON.parse(createStateJson) : { status: 'in_progress' };
      const createResult = createCheckpoint(createTaskId, createAgentId, createState, createStep);
      console.log(JSON.stringify(createResult, null, 2));
      break;

    case 'get-latest':
      // node checkpoint_manager.js get-latest <taskId>
      const latestTaskId = args[1];
      if (!latestTaskId) {
        console.error('Error: taskId is required');
        console.log('Usage: node checkpoint_manager.js get-latest <taskId>');
        process.exit(1);
      }
      const latest = getLatestCheckpoint(latestTaskId);
      if (latest) {
        console.log(JSON.stringify(latest, null, 2));
      } else {
        console.log(`No checkpoints found for task: ${latestTaskId}`);
      }
      break;

    default:
      console.log(`
Durable Checkpointing System - CLI Interface

Usage:
  node checkpoint_manager.js <command> [options]

Commands:

  list [taskId]
    List all tasks with checkpoints, or list checkpoints for a specific task
    Examples:
      node checkpoint_manager.js list
      node checkpoint_manager.js list TASK-001

  resume <taskId>
    Get resume information for a task from its latest checkpoint
    Example: node checkpoint_manager.js resume TASK-001

  delete <taskId> [stepNumber]
    Delete checkpoints for a task (all if no step specified)
    Examples:
      node checkpoint_manager.js delete TASK-001        # Delete all
      node checkpoint_manager.js delete TASK-001 2      # Delete step 2 only

  cleanup [days]
    Remove checkpoints for completed tasks older than N days (default: 7)
    Example: node checkpoint_manager.js cleanup 14

  startup-check
    Check for incomplete tasks on startup
    Example: node checkpoint_manager.js startup-check

  create <taskId> <agentId> <stepNumber> [stateJson]
    Create a new checkpoint
    Example: node checkpoint_manager.js create TASK-001 Backend_Claude 1 '{"status":"in_progress"}'

  get-latest <taskId>
    Get the most recent checkpoint for a task
    Example: node checkpoint_manager.js get-latest TASK-001

Checkpoint State Format:
  {
    "taskId": "TASK-001",
    "agentId": "Backend_Claude",
    "stepNumber": 1,
    "timestamp": "2026-02-12T...",
    "currentState": { "title": "...", "status": "...", "priority": "..." },
    "completedSteps": ["step1", "step2"],
    "pendingSteps": ["step3", "step4"],
    "context": { "relevantFiles": [...], "variables": {...} },
    "lastOutput": "..."
  }

Integration with Governor:
  - Checkpoints are automatically logged to governor audit trail
  - Use autoCheckpointOnTransition() for state machine integration
`);
  }
}
