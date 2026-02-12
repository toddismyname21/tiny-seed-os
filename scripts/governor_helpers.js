/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GOVERNOR HELPER FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Helper functions for the Governor system that tracks agent performance,
 * logs audit events, and manages error budgets.
 *
 * Usage:
 *   const governor = require('./governor_helpers');
 *   governor.logGovernorEvent('Backend_Claude', 'task_completed', 'success', {task: 'API update'});
 *   governor.incrementMetric('tasks_completed', 'Backend_Claude');
 *   const canProceed = governor.checkErrorBudget('Backend_Claude');
 *
 * Created: 2026-02-12
 * Part of: Agentic Performance Improvement Plan
 * ═══════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

// File paths
const TINYPM_DIR = path.join(__dirname, '..', 'tinypm');
const METRICS_FILE = path.join(TINYPM_DIR, '.governor_metrics.json');
const AUDIT_FILE = path.join(TINYPM_DIR, '.governor_audit.json');

// Valid agent names
const VALID_AGENTS = [
  'PM_Architect',
  'Backend_Claude',
  'Desktop_Claude',
  'Mobile_Claude',
  'UX_Design_Claude',
  'Sales_Claude',
  'Security_Claude',
  'Verifier_Claude',
  'Critic_Claude'
];

// Valid metric names
const VALID_METRICS = [
  'tasks_completed',
  'tasks_failed',
  'escalations',
  'approvals_requested',
  'rollbacks_executed',
  'duplicates_prevented',
  'pre_flight_failures',
  // Verification gate metrics
  'verification_gates_required',
  'verification_gates_passed',
  'verification_gates_failed',
  'verification_gates_blocked',
  'proofs_submitted',
  'proofs_validated',
  'proofs_rejected',
  'direct_done_attempts_blocked'
];

// Valid action types for audit logging
const VALID_ACTIONS = [
  'task_started',
  'task_completed',
  'task_failed',
  'escalation',
  'approval_requested',
  'approval_granted',
  'approval_denied',
  'rollback_executed',
  'duplicate_prevented',
  'pre_flight_passed',
  'pre_flight_failed',
  'verification_passed',
  'verification_failed',
  'deployment_executed',
  'session_started',
  'session_ended',
  'error_budget_warning',
  'error_budget_exceeded',
  // Verification Gate Actions
  'verification_gate_required',
  'verification_gate_initiated',
  'verification_gate_passed',
  'verification_gate_failed',
  'verification_gate_blocked',
  'verification_awaiting_approval',
  'proof_of_success_submitted',
  'proof_of_success_validated',
  'proof_of_success_rejected',
  'automated_test_passed',
  'automated_test_failed',
  'screenshot_comparison_passed',
  'screenshot_comparison_failed'
];

// Valid outcomes
const VALID_OUTCOMES = [
  'success',
  'failure',
  'pending',
  'escalated',
  'rolled_back',
  'blocked',
  'awaiting_verification'
];

// Task states for verification gate state machine
// KEY RULE: No direct path from IMPLEMENTED to DONE
const TASK_STATES = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  IMPLEMENTED: 'IMPLEMENTED',
  AWAITING_VERIFICATION: 'AWAITING_VERIFICATION',
  VERIFIED: 'VERIFIED',
  DONE: 'DONE'
};

// Valid state transitions (state machine enforcement)
// This prevents "declared done but not verified" failures
const VALID_STATE_TRANSITIONS = {
  'PENDING': ['IN_PROGRESS'],
  'IN_PROGRESS': ['IMPLEMENTED', 'PENDING'],  // Can go back to pending if blocked
  'IMPLEMENTED': ['AWAITING_VERIFICATION'],   // CANNOT go directly to DONE!
  'AWAITING_VERIFICATION': ['VERIFIED', 'IMPLEMENTED'],  // Can be sent back for fixes
  'VERIFIED': ['DONE'],
  'DONE': []  // Terminal state
};

// Proof types for verification
const PROOF_TYPES = {
  SCREENSHOT: 'screenshot',
  TEST_OUTPUT: 'test_output',
  LOG_SNIPPET: 'log_snippet',
  API_RESPONSE: 'api_response',
  USER_CONFIRMATION: 'user_confirmation',
  AUTOMATED_TEST: 'automated_test'
};

/**
 * Generate a unique ID for audit events
 * @returns {string} UUID-like identifier
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Read a JSON file safely
 * @param {string} filePath - Path to the JSON file
 * @returns {object} Parsed JSON or default structure
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
 * Log an event to the governor audit trail
 *
 * @param {string} agent - Agent name (e.g., 'Backend_Claude')
 * @param {string} action - Action type (e.g., 'task_completed')
 * @param {string} outcome - Outcome (e.g., 'success', 'failure')
 * @param {object} details - Additional details about the event
 * @returns {object} Result with success status and event ID
 *
 * @example
 * logGovernorEvent('Backend_Claude', 'task_completed', 'success', {
 *   task: 'Update API endpoint',
 *   files_modified: ['MERGED TOTAL.js'],
 *   confidence: 95
 * });
 */
function logGovernorEvent(agent, action, outcome, details = {}) {
  // Validate inputs
  if (!VALID_AGENTS.includes(agent)) {
    console.warn(`Warning: Unknown agent '${agent}'. Valid agents: ${VALID_AGENTS.join(', ')}`);
  }
  if (!VALID_ACTIONS.includes(action)) {
    console.warn(`Warning: Unknown action '${action}'. Valid actions: ${VALID_ACTIONS.join(', ')}`);
  }
  if (!VALID_OUTCOMES.includes(outcome)) {
    console.warn(`Warning: Unknown outcome '${outcome}'. Valid outcomes: ${VALID_OUTCOMES.join(', ')}`);
  }

  // Read current audit file
  let audit = readJsonFile(AUDIT_FILE);
  if (!audit) {
    audit = {
      version: '1.0',
      created: new Date().toISOString().split('T')[0],
      events: []
    };
  }

  // Create event entry
  const eventId = generateUUID();
  const event = {
    id: eventId,
    timestamp: new Date().toISOString(),
    agent: agent,
    action: action,
    outcome: outcome,
    details: details,
    rollbackAvailable: details.rollbackAvailable !== false
  };

  // Add event
  audit.events.push(event);

  // Keep last 1000 events to prevent file bloat
  if (audit.events.length > 1000) {
    audit.events = audit.events.slice(-1000);
  }

  // Save
  const success = writeJsonFile(AUDIT_FILE, audit);

  return {
    success: success,
    eventId: eventId,
    timestamp: event.timestamp
  };
}

/**
 * Increment a metric counter for the governor system
 *
 * @param {string} metricName - Name of the metric to increment
 * @param {string} agent - Agent name (optional, for per-agent tracking)
 * @returns {object} Result with success status and new value
 *
 * @example
 * incrementMetric('tasks_completed', 'Backend_Claude');
 * incrementMetric('duplicates_prevented');
 */
function incrementMetric(metricName, agent = null) {
  // Validate metric name
  if (!VALID_METRICS.includes(metricName)) {
    console.warn(`Warning: Unknown metric '${metricName}'. Valid metrics: ${VALID_METRICS.join(', ')}`);
  }

  // Read current metrics
  let metrics = readJsonFile(METRICS_FILE);
  if (!metrics) {
    console.error('Error: Could not read metrics file');
    return { success: false, error: 'Could not read metrics file' };
  }

  // Increment global metric
  if (metrics.metrics[metricName] !== undefined) {
    metrics.metrics[metricName]++;
  } else {
    metrics.metrics[metricName] = 1;
  }

  // Increment agent-specific metric if agent provided
  if (agent) {
    if (!metrics.by_agent[agent]) {
      metrics.by_agent[agent] = {};
    }
    if (metrics.by_agent[agent][metricName] !== undefined) {
      metrics.by_agent[agent][metricName]++;
    } else {
      metrics.by_agent[agent][metricName] = 1;
    }

    // If this is a failure, update error budget
    if (metricName === 'tasks_failed' && metrics.error_budgets[agent]) {
      metrics.error_budgets[agent].used++;

      // Log warning if approaching budget limit
      const budget = metrics.error_budgets[agent];
      if (budget.used >= budget.allowed) {
        logGovernorEvent(agent, 'error_budget_exceeded', 'failure', {
          allowed: budget.allowed,
          used: budget.used,
          period: budget.period
        });
      } else if (budget.used >= budget.allowed * 0.8) {
        logGovernorEvent(agent, 'error_budget_warning', 'pending', {
          allowed: budget.allowed,
          used: budget.used,
          remaining: budget.allowed - budget.used,
          period: budget.period
        });
      }
    }
  }

  // Update timestamp
  metrics.last_updated = new Date().toISOString();

  // Save
  const success = writeJsonFile(METRICS_FILE, metrics);

  return {
    success: success,
    metric: metricName,
    newValue: metrics.metrics[metricName],
    agentValue: agent ? metrics.by_agent[agent][metricName] : null
  };
}

/**
 * Check if an agent can proceed based on their error budget
 *
 * @param {string} agent - Agent name to check
 * @returns {object} Result with canProceed flag and budget details
 *
 * @example
 * const check = checkErrorBudget('Backend_Claude');
 * if (!check.canProceed) {
 *   console.log('Error budget exceeded! Escalate to human.');
 * }
 */
function checkErrorBudget(agent) {
  // Read current metrics
  const metrics = readJsonFile(METRICS_FILE);
  if (!metrics) {
    return { canProceed: true, error: 'Could not read metrics file' };
  }

  const budget = metrics.error_budgets[agent];
  if (!budget) {
    // Agent has no error budget defined, allow by default
    return {
      canProceed: true,
      hasBudget: false,
      message: `No error budget defined for ${agent}`
    };
  }

  const remaining = budget.allowed - budget.used;
  const canProceed = budget.used < budget.allowed;

  return {
    canProceed: canProceed,
    hasBudget: true,
    allowed: budget.allowed,
    used: budget.used,
    remaining: remaining,
    period: budget.period,
    percentUsed: Math.round((budget.used / budget.allowed) * 100),
    message: canProceed
      ? `${agent} has ${remaining} errors remaining in budget`
      : `${agent} has exceeded error budget (${budget.used}/${budget.allowed})`
  };
}

/**
 * Get performance metrics for a specific agent
 *
 * @param {string} agent - Agent name to get metrics for
 * @returns {object} Agent's performance metrics
 *
 * @example
 * const performance = getAgentPerformance('Backend_Claude');
 * console.log(`Success rate: ${performance.successRate}%`);
 */
function getAgentPerformance(agent) {
  // Read current metrics
  const metrics = readJsonFile(METRICS_FILE);
  if (!metrics) {
    return { error: 'Could not read metrics file' };
  }

  const agentMetrics = metrics.by_agent[agent];
  if (!agentMetrics) {
    return {
      agent: agent,
      exists: false,
      message: `No metrics found for ${agent}`
    };
  }

  const completed = agentMetrics.tasks_completed || 0;
  const failed = agentMetrics.tasks_failed || 0;
  const total = completed + failed;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 100;

  const budget = metrics.error_budgets[agent];

  return {
    agent: agent,
    exists: true,
    metrics: agentMetrics,
    summary: {
      tasksCompleted: completed,
      tasksFailed: failed,
      totalTasks: total,
      successRate: successRate,
      escalations: agentMetrics.escalations || 0,
      approvalsRequested: agentMetrics.approvals_requested || 0
    },
    errorBudget: budget ? {
      allowed: budget.allowed,
      used: budget.used,
      remaining: budget.allowed - budget.used,
      period: budget.period
    } : null
  };
}

/**
 * Get recent audit events, optionally filtered by agent or action
 *
 * @param {object} options - Filter options
 * @param {string} options.agent - Filter by agent name
 * @param {string} options.action - Filter by action type
 * @param {number} options.limit - Maximum events to return (default 50)
 * @param {number} options.days - Only events from last N days (default 7)
 * @returns {array} Array of audit events
 *
 * @example
 * const events = getRecentEvents({ agent: 'Backend_Claude', limit: 10 });
 */
function getRecentEvents(options = {}) {
  const { agent, action, limit = 50, days = 7 } = options;

  // Read audit file
  const audit = readJsonFile(AUDIT_FILE);
  if (!audit || !audit.events) {
    return [];
  }

  // Calculate cutoff date
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  // Filter events
  let events = audit.events.filter(event => {
    const eventDate = new Date(event.timestamp);
    if (eventDate < cutoff) return false;
    if (agent && event.agent !== agent) return false;
    if (action && event.action !== action) return false;
    return true;
  });

  // Sort by timestamp descending (most recent first)
  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Limit results
  return events.slice(0, limit);
}

/**
 * Reset error budgets (typically called weekly)
 *
 * @returns {object} Result with success status
 */
function resetErrorBudgets() {
  const metrics = readJsonFile(METRICS_FILE);
  if (!metrics) {
    return { success: false, error: 'Could not read metrics file' };
  }

  // Log the reset
  logGovernorEvent('PM_Architect', 'session_started', 'success', {
    action: 'error_budget_reset',
    previousBudgets: { ...metrics.error_budgets }
  });

  // Reset all budgets
  for (const agent in metrics.error_budgets) {
    metrics.error_budgets[agent].used = 0;
  }

  metrics.last_updated = new Date().toISOString();

  const success = writeJsonFile(METRICS_FILE, metrics);
  return { success: success, message: 'Error budgets reset' };
}

/**
 * Get a summary of all agent performance
 *
 * @returns {object} Summary of all agents' performance
 */
function getAllAgentsSummary() {
  const metrics = readJsonFile(METRICS_FILE);
  if (!metrics) {
    return { error: 'Could not read metrics file' };
  }

  const summary = {
    globalMetrics: metrics.metrics,
    lastUpdated: metrics.last_updated,
    agents: {}
  };

  for (const agent in metrics.by_agent) {
    const agentMetrics = metrics.by_agent[agent];
    const completed = agentMetrics.tasks_completed || 0;
    const failed = agentMetrics.tasks_failed || 0;
    const total = completed + failed;

    summary.agents[agent] = {
      tasksCompleted: completed,
      tasksFailed: failed,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 100,
      errorBudgetStatus: metrics.error_budgets[agent]
        ? `${metrics.error_budgets[agent].used}/${metrics.error_budgets[agent].allowed}`
        : 'N/A'
    };
  }

  return summary;
}

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICATION GATE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
// These functions enforce the verification gate system to prevent
// "declared done but not verified" failures.
// KEY RULE: No direct path from IMPLEMENTED to DONE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if an agent can declare a task as complete
 *
 * @param {string} agent - Agent name attempting to mark task done
 * @param {string} taskId - Task identifier
 * @param {object} evidence - Evidence of completion
 * @param {string} evidence.currentState - Current task state
 * @param {array} evidence.proofs - Array of proof objects submitted
 * @param {boolean} evidence.verifierApproved - Whether Verifier_Claude approved
 * @returns {object} Result with canComplete flag and reasons
 *
 * @example
 * const check = canDeclareComplete('Backend_Claude', 'TASK-001', {
 *   currentState: 'VERIFIED',
 *   proofs: [{ type: 'test_output', passed: true }],
 *   verifierApproved: true
 * });
 * if (!check.canComplete) {
 *   console.log('Cannot complete:', check.reasons);
 * }
 */
function canDeclareComplete(agent, taskId, evidence = {}) {
  const result = {
    canComplete: false,
    reasons: [],
    requirements: [],
    currentState: evidence.currentState || 'UNKNOWN',
    nextRequiredState: null
  };

  // Validate agent
  if (!VALID_AGENTS.includes(agent)) {
    result.reasons.push(`Unknown agent: ${agent}`);
    return result;
  }

  // Check current state
  const currentState = evidence.currentState;
  if (!currentState || !TASK_STATES[currentState]) {
    result.reasons.push('Task state is unknown or invalid');
    result.requirements.push('Task must be in a valid state (PENDING, IN_PROGRESS, IMPLEMENTED, AWAITING_VERIFICATION, VERIFIED, DONE)');
    return result;
  }

  // KEY RULE: Cannot go directly from IMPLEMENTED to DONE
  if (currentState === TASK_STATES.IMPLEMENTED) {
    result.reasons.push('Task is IMPLEMENTED but not yet verified');
    result.requirements.push('Task must go through AWAITING_VERIFICATION before completion');
    result.nextRequiredState = TASK_STATES.AWAITING_VERIFICATION;

    logGovernorEvent(agent, 'verification_gate_blocked', 'blocked', {
      taskId: taskId,
      currentState: currentState,
      attemptedTransition: 'IMPLEMENTED -> DONE (blocked)',
      rule: 'No direct path from IMPLEMENTED to DONE'
    });

    return result;
  }

  // Check if task is in VERIFIED state (the only state that can transition to DONE)
  if (currentState !== TASK_STATES.VERIFIED) {
    result.reasons.push(`Task is in ${currentState} state, not VERIFIED`);
    result.requirements.push('Task must be VERIFIED before marking as DONE');

    // Determine next required state
    const transitions = VALID_STATE_TRANSITIONS[currentState];
    if (transitions && transitions.length > 0) {
      result.nextRequiredState = transitions[0];
    }

    return result;
  }

  // Check for proof of success
  const proofs = evidence.proofs || [];
  if (proofs.length === 0) {
    result.reasons.push('No proof of success submitted');
    result.requirements.push('At least one proof of success is required');
    return result;
  }

  // Check if at least one proof passed
  const hasPassingProof = proofs.some(p => p.passed === true);
  if (!hasPassingProof) {
    result.reasons.push('No passing proof of success found');
    result.requirements.push('At least one proof must have passed validation');
    return result;
  }

  // Check for verifier approval
  if (evidence.verifierApproved !== true) {
    result.reasons.push('Verifier has not approved the task');
    result.requirements.push('Verifier_Claude must approve before completion');
    return result;
  }

  // All checks passed
  result.canComplete = true;
  result.reasons = ['All verification requirements met'];

  logGovernorEvent(agent, 'verification_gate_passed', 'success', {
    taskId: taskId,
    currentState: currentState,
    proofsCount: proofs.length,
    verifierApproved: true
  });

  return result;
}

/**
 * Submit proof of success for a task
 *
 * @param {string} agent - Agent submitting the proof
 * @param {string} taskId - Task identifier
 * @param {object} proof - Proof object
 * @param {string} proof.type - Type of proof (screenshot, test_output, log_snippet, etc.)
 * @param {string} proof.description - Description of what the proof shows
 * @param {string} proof.content - Actual proof content (URL, text, base64, etc.)
 * @param {object} proof.metadata - Additional metadata
 * @returns {object} Result with success status and proof ID
 *
 * @example
 * const result = submitProofOfSuccess('Backend_Claude', 'TASK-001', {
 *   type: 'test_output',
 *   description: 'All unit tests passing',
 *   content: 'PASS: 45 tests, 0 failures',
 *   metadata: { testFramework: 'jest', coverage: '92%' }
 * });
 */
function submitProofOfSuccess(agent, taskId, proof = {}) {
  const result = {
    success: false,
    proofId: null,
    timestamp: null,
    errors: []
  };

  // Validate agent
  if (!VALID_AGENTS.includes(agent)) {
    result.errors.push(`Unknown agent: ${agent}`);
    return result;
  }

  // Validate proof type
  if (!proof.type || !Object.values(PROOF_TYPES).includes(proof.type)) {
    result.errors.push(`Invalid proof type: ${proof.type}. Valid types: ${Object.values(PROOF_TYPES).join(', ')}`);
    return result;
  }

  // Validate required fields
  if (!proof.description) {
    result.errors.push('Proof description is required');
  }
  if (!proof.content) {
    result.errors.push('Proof content is required');
  }
  if (result.errors.length > 0) {
    return result;
  }

  // Generate proof ID
  const proofId = `PROOF-${taskId}-${Date.now()}-${generateUUID().slice(0, 8)}`;
  const timestamp = new Date().toISOString();

  // Read metrics file to store proof
  let metrics = readJsonFile(METRICS_FILE);
  if (!metrics) {
    result.errors.push('Could not read metrics file');
    return result;
  }

  // Initialize proofs storage if not exists
  if (!metrics.verification_proofs) {
    metrics.verification_proofs = {};
  }
  if (!metrics.verification_proofs[taskId]) {
    metrics.verification_proofs[taskId] = [];
  }

  // Create proof record
  const proofRecord = {
    id: proofId,
    taskId: taskId,
    agent: agent,
    type: proof.type,
    description: proof.description,
    content: proof.content,
    metadata: proof.metadata || {},
    timestamp: timestamp,
    validated: false,
    passed: null,
    validatedBy: null,
    validatedAt: null
  };

  // Store proof
  metrics.verification_proofs[taskId].push(proofRecord);
  metrics.last_updated = timestamp;

  // Save metrics
  const saved = writeJsonFile(METRICS_FILE, metrics);
  if (!saved) {
    result.errors.push('Failed to save proof to metrics file');
    return result;
  }

  // Log the event
  logGovernorEvent(agent, 'proof_of_success_submitted', 'pending', {
    taskId: taskId,
    proofId: proofId,
    proofType: proof.type,
    description: proof.description
  });

  result.success = true;
  result.proofId = proofId;
  result.timestamp = timestamp;

  return result;
}

/**
 * Transition a task from one state to another with state machine enforcement
 *
 * @param {string} taskId - Task identifier
 * @param {string} currentState - Current task state
 * @param {string} newState - Desired new state
 * @param {string} agent - Agent requesting the transition
 * @returns {object} Result with success status, new state, and any errors
 *
 * @example
 * const result = transitionTaskState('TASK-001', 'IMPLEMENTED', 'AWAITING_VERIFICATION', 'Backend_Claude');
 * if (!result.success) {
 *   console.log('Invalid transition:', result.error);
 * }
 */
function transitionTaskState(taskId, currentState, newState, agent) {
  const result = {
    success: false,
    previousState: currentState,
    newState: null,
    error: null,
    timestamp: null
  };

  // Validate agent
  if (!VALID_AGENTS.includes(agent)) {
    result.error = `Unknown agent: ${agent}`;
    return result;
  }

  // Validate states
  if (!TASK_STATES[currentState]) {
    result.error = `Invalid current state: ${currentState}`;
    return result;
  }
  if (!TASK_STATES[newState]) {
    result.error = `Invalid new state: ${newState}`;
    return result;
  }

  // Check if transition is valid
  const validTransitions = VALID_STATE_TRANSITIONS[currentState] || [];
  if (!validTransitions.includes(newState)) {
    result.error = `Invalid transition: ${currentState} -> ${newState}. Valid transitions from ${currentState}: ${validTransitions.join(', ') || 'none (terminal state)'}`;

    // Log blocked transition
    logGovernorEvent(agent, 'verification_gate_blocked', 'failure', {
      taskId: taskId,
      currentState: currentState,
      attemptedState: newState,
      validTransitions: validTransitions,
      rule: 'State machine enforcement'
    });

    return result;
  }

  // Special handling for key transitions
  const timestamp = new Date().toISOString();

  if (currentState === TASK_STATES.IMPLEMENTED && newState === TASK_STATES.AWAITING_VERIFICATION) {
    // Task entering verification gate
    logGovernorEvent(agent, 'verification_gate_initiated', 'pending', {
      taskId: taskId,
      previousState: currentState,
      newState: newState
    });
  } else if (currentState === TASK_STATES.AWAITING_VERIFICATION && newState === TASK_STATES.VERIFIED) {
    // Task passed verification
    logGovernorEvent(agent, 'verification_gate_passed', 'success', {
      taskId: taskId,
      previousState: currentState,
      newState: newState
    });
  } else if (currentState === TASK_STATES.AWAITING_VERIFICATION && newState === TASK_STATES.IMPLEMENTED) {
    // Task sent back for fixes
    logGovernorEvent(agent, 'verification_gate_failed', 'failure', {
      taskId: taskId,
      previousState: currentState,
      newState: newState,
      reason: 'Sent back for fixes'
    });
  }

  // Read metrics to store task states
  let metrics = readJsonFile(METRICS_FILE);
  if (!metrics) {
    result.error = 'Could not read metrics file';
    return result;
  }

  // Initialize task states storage if not exists
  if (!metrics.task_states) {
    metrics.task_states = {};
  }

  // Record state transition
  if (!metrics.task_states[taskId]) {
    metrics.task_states[taskId] = {
      currentState: newState,
      history: []
    };
  }

  metrics.task_states[taskId].history.push({
    from: currentState,
    to: newState,
    agent: agent,
    timestamp: timestamp
  });
  metrics.task_states[taskId].currentState = newState;
  metrics.last_updated = timestamp;

  // Save metrics
  const saved = writeJsonFile(METRICS_FILE, metrics);
  if (!saved) {
    result.error = 'Failed to save state transition to metrics file';
    return result;
  }

  result.success = true;
  result.newState = newState;
  result.timestamp = timestamp;

  return result;
}

/**
 * Validate a submitted proof of success
 *
 * @param {string} verifier - Agent performing validation (should be Verifier_Claude)
 * @param {string} taskId - Task identifier
 * @param {string} proofId - Proof identifier to validate
 * @param {boolean} passed - Whether the proof is accepted
 * @param {string} notes - Validation notes
 * @returns {object} Result with success status
 *
 * @example
 * const result = validateProof('Verifier_Claude', 'TASK-001', 'PROOF-TASK-001-123', true, 'Screenshots confirm feature works');
 */
function validateProof(verifier, taskId, proofId, passed, notes = '') {
  const result = {
    success: false,
    error: null,
    timestamp: null
  };

  // Validate verifier (should be Verifier_Claude or PM_Architect)
  if (!['Verifier_Claude', 'PM_Architect', 'Critic_Claude'].includes(verifier)) {
    result.error = `Only Verifier_Claude, PM_Architect, or Critic_Claude can validate proofs. Got: ${verifier}`;
    return result;
  }

  // Read metrics file
  let metrics = readJsonFile(METRICS_FILE);
  if (!metrics) {
    result.error = 'Could not read metrics file';
    return result;
  }

  // Find the proof
  if (!metrics.verification_proofs || !metrics.verification_proofs[taskId]) {
    result.error = `No proofs found for task: ${taskId}`;
    return result;
  }

  const proofIndex = metrics.verification_proofs[taskId].findIndex(p => p.id === proofId);
  if (proofIndex === -1) {
    result.error = `Proof not found: ${proofId}`;
    return result;
  }

  // Update proof validation
  const timestamp = new Date().toISOString();
  metrics.verification_proofs[taskId][proofIndex].validated = true;
  metrics.verification_proofs[taskId][proofIndex].passed = passed;
  metrics.verification_proofs[taskId][proofIndex].validatedBy = verifier;
  metrics.verification_proofs[taskId][proofIndex].validatedAt = timestamp;
  metrics.verification_proofs[taskId][proofIndex].validationNotes = notes;
  metrics.last_updated = timestamp;

  // Save metrics
  const saved = writeJsonFile(METRICS_FILE, metrics);
  if (!saved) {
    result.error = 'Failed to save proof validation';
    return result;
  }

  // Log the event
  const action = passed ? 'proof_of_success_validated' : 'proof_of_success_rejected';
  const outcome = passed ? 'success' : 'failure';
  logGovernorEvent(verifier, action, outcome, {
    taskId: taskId,
    proofId: proofId,
    passed: passed,
    notes: notes
  });

  result.success = true;
  result.timestamp = timestamp;

  return result;
}

/**
 * Get the current state and verification status of a task
 *
 * @param {string} taskId - Task identifier
 * @returns {object} Task state information
 *
 * @example
 * const status = getTaskVerificationStatus('TASK-001');
 * console.log(`State: ${status.currentState}, Proofs: ${status.proofsCount}`);
 */
function getTaskVerificationStatus(taskId) {
  const result = {
    taskId: taskId,
    exists: false,
    currentState: null,
    stateHistory: [],
    proofs: [],
    proofsCount: 0,
    passedProofsCount: 0,
    canTransitionToDone: false,
    nextRequiredAction: null
  };

  // Read metrics file
  const metrics = readJsonFile(METRICS_FILE);
  if (!metrics) {
    result.error = 'Could not read metrics file';
    return result;
  }

  // Get task state
  if (metrics.task_states && metrics.task_states[taskId]) {
    result.exists = true;
    result.currentState = metrics.task_states[taskId].currentState;
    result.stateHistory = metrics.task_states[taskId].history || [];
  }

  // Get proofs
  if (metrics.verification_proofs && metrics.verification_proofs[taskId]) {
    result.proofs = metrics.verification_proofs[taskId];
    result.proofsCount = result.proofs.length;
    result.passedProofsCount = result.proofs.filter(p => p.passed === true).length;
  }

  // Determine if task can transition to DONE
  if (result.currentState === TASK_STATES.VERIFIED && result.passedProofsCount > 0) {
    result.canTransitionToDone = true;
    result.nextRequiredAction = 'Call transitionTaskState to move to DONE';
  } else if (result.currentState === TASK_STATES.AWAITING_VERIFICATION) {
    result.nextRequiredAction = 'Verifier must validate proofs, then transition to VERIFIED';
  } else if (result.currentState === TASK_STATES.IMPLEMENTED) {
    result.nextRequiredAction = 'Submit proof of success and transition to AWAITING_VERIFICATION';
  } else if (!result.currentState) {
    result.nextRequiredAction = 'Initialize task state by transitioning from PENDING';
  }

  return result;
}

// Export functions for use in other scripts
module.exports = {
  // Existing functions
  logGovernorEvent,
  incrementMetric,
  checkErrorBudget,
  getAgentPerformance,
  getRecentEvents,
  resetErrorBudgets,
  getAllAgentsSummary,
  // Verification gate functions
  canDeclareComplete,
  submitProofOfSuccess,
  transitionTaskState,
  validateProof,
  getTaskVerificationStatus,
  // Constants
  VALID_AGENTS,
  VALID_METRICS,
  VALID_ACTIONS,
  VALID_OUTCOMES,
  TASK_STATES,
  VALID_STATE_TRANSITIONS,
  PROOF_TYPES
};

// CLI usage support
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'log':
      // node governor_helpers.js log Backend_Claude task_completed success '{"task":"test"}'
      const [, agent, action, outcome, detailsJson] = args;
      const details = detailsJson ? JSON.parse(detailsJson) : {};
      console.log(logGovernorEvent(agent, action, outcome, details));
      break;

    case 'increment':
      // node governor_helpers.js increment tasks_completed Backend_Claude
      const [, metric, metricAgent] = args;
      console.log(incrementMetric(metric, metricAgent));
      break;

    case 'check-budget':
      // node governor_helpers.js check-budget Backend_Claude
      const [, budgetAgent] = args;
      console.log(checkErrorBudget(budgetAgent));
      break;

    case 'performance':
      // node governor_helpers.js performance Backend_Claude
      const [, perfAgent] = args;
      console.log(JSON.stringify(getAgentPerformance(perfAgent), null, 2));
      break;

    case 'events':
      // node governor_helpers.js events [--agent Backend_Claude] [--limit 10]
      const eventOptions = {};
      for (let i = 1; i < args.length; i += 2) {
        const key = args[i].replace('--', '');
        eventOptions[key] = args[i + 1];
      }
      console.log(JSON.stringify(getRecentEvents(eventOptions), null, 2));
      break;

    case 'summary':
      // node governor_helpers.js summary
      console.log(JSON.stringify(getAllAgentsSummary(), null, 2));
      break;

    case 'reset-budgets':
      // node governor_helpers.js reset-budgets
      console.log(resetErrorBudgets());
      break;

    // ═══════════════════════════════════════════════════════════════════
    // VERIFICATION GATE CLI COMMANDS
    // ═══════════════════════════════════════════════════════════════════

    case 'can-complete':
      // node governor_helpers.js can-complete Backend_Claude TASK-001 '{"currentState":"VERIFIED","proofs":[{"passed":true}],"verifierApproved":true}'
      const [, ccAgent, ccTaskId, ccEvidenceJson] = args;
      const ccEvidence = ccEvidenceJson ? JSON.parse(ccEvidenceJson) : {};
      console.log(JSON.stringify(canDeclareComplete(ccAgent, ccTaskId, ccEvidence), null, 2));
      break;

    case 'submit-proof':
      // node governor_helpers.js submit-proof Backend_Claude TASK-001 '{"type":"test_output","description":"Tests pass","content":"PASS: 10 tests"}'
      const [, spAgent, spTaskId, spProofJson] = args;
      const spProof = spProofJson ? JSON.parse(spProofJson) : {};
      console.log(JSON.stringify(submitProofOfSuccess(spAgent, spTaskId, spProof), null, 2));
      break;

    case 'transition':
      // node governor_helpers.js transition TASK-001 IMPLEMENTED AWAITING_VERIFICATION Backend_Claude
      const [, tTaskId, tCurrentState, tNewState, tAgent] = args;
      console.log(JSON.stringify(transitionTaskState(tTaskId, tCurrentState, tNewState, tAgent), null, 2));
      break;

    case 'validate-proof':
      // node governor_helpers.js validate-proof Verifier_Claude TASK-001 PROOF-123 true "Looks good"
      const [, vpVerifier, vpTaskId, vpProofId, vpPassed, vpNotes] = args;
      const passed = vpPassed === 'true';
      console.log(JSON.stringify(validateProof(vpVerifier, vpTaskId, vpProofId, passed, vpNotes || ''), null, 2));
      break;

    case 'task-status':
      // node governor_helpers.js task-status TASK-001
      const [, tsTaskId] = args;
      console.log(JSON.stringify(getTaskVerificationStatus(tsTaskId), null, 2));
      break;

    case 'states':
      // node governor_helpers.js states
      console.log('Valid Task States:', TASK_STATES);
      console.log('\nValid Transitions:');
      for (const [state, transitions] of Object.entries(VALID_STATE_TRANSITIONS)) {
        console.log(`  ${state} -> ${transitions.length > 0 ? transitions.join(', ') : '(terminal state)'}`);
      }
      break;

    default:
      console.log(`
Governor Helper Functions CLI

Usage:
  node governor_helpers.js <command> [options]

═══════════════════════════════════════════════════════════════════════════
STANDARD COMMANDS
═══════════════════════════════════════════════════════════════════════════

  log <agent> <action> <outcome> [details_json]
    Log an event to the audit trail
    Example: node governor_helpers.js log Backend_Claude task_completed success '{"task":"API update"}'

  increment <metric> [agent]
    Increment a metric counter
    Example: node governor_helpers.js increment tasks_completed Backend_Claude

  check-budget <agent>
    Check if an agent can proceed based on error budget
    Example: node governor_helpers.js check-budget Backend_Claude

  performance <agent>
    Get performance metrics for an agent
    Example: node governor_helpers.js performance Backend_Claude

  events [--agent name] [--action type] [--limit n] [--days n]
    Get recent audit events
    Example: node governor_helpers.js events --agent Backend_Claude --limit 10

  summary
    Get summary of all agents' performance
    Example: node governor_helpers.js summary

  reset-budgets
    Reset all error budgets (typically weekly)
    Example: node governor_helpers.js reset-budgets

═══════════════════════════════════════════════════════════════════════════
VERIFICATION GATE COMMANDS
═══════════════════════════════════════════════════════════════════════════

  can-complete <agent> <task_id> <evidence_json>
    Check if agent can declare a task complete
    KEY RULE: No direct path from IMPLEMENTED to DONE
    Example: node governor_helpers.js can-complete Backend_Claude TASK-001 '{"currentState":"VERIFIED","proofs":[{"passed":true}],"verifierApproved":true}'

  submit-proof <agent> <task_id> <proof_json>
    Submit proof of success for verification
    Proof types: screenshot, test_output, log_snippet, api_response, user_confirmation, automated_test
    Example: node governor_helpers.js submit-proof Backend_Claude TASK-001 '{"type":"test_output","description":"All tests pass","content":"PASS: 10 tests"}'

  transition <task_id> <current_state> <new_state> <agent>
    Transition task state with state machine enforcement
    Valid states: PENDING -> IN_PROGRESS -> IMPLEMENTED -> AWAITING_VERIFICATION -> VERIFIED -> DONE
    Example: node governor_helpers.js transition TASK-001 IMPLEMENTED AWAITING_VERIFICATION Backend_Claude

  validate-proof <verifier> <task_id> <proof_id> <passed> [notes]
    Validate a submitted proof (Verifier_Claude, PM_Architect, or Critic_Claude only)
    Example: node governor_helpers.js validate-proof Verifier_Claude TASK-001 PROOF-123 true "Screenshot confirms fix"

  task-status <task_id>
    Get current state and verification status of a task
    Example: node governor_helpers.js task-status TASK-001

  states
    Display valid task states and transitions
    Example: node governor_helpers.js states

═══════════════════════════════════════════════════════════════════════════
TASK STATE FLOW (KEY RULE: No direct IMPLEMENTED -> DONE)
═══════════════════════════════════════════════════════════════════════════

  PENDING → IN_PROGRESS → IMPLEMENTED → AWAITING_VERIFICATION → VERIFIED → DONE

  - IMPLEMENTED cannot skip to DONE (must go through verification)
  - AWAITING_VERIFICATION can go back to IMPLEMENTED (if fixes needed)
  - Only VERIFIED can transition to DONE
      `);
  }
}
