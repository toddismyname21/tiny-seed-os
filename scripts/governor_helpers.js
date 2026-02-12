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

// Lazy-load checkpoint manager to avoid circular dependency
let checkpointManager = null;
function getCheckpointManager() {
  if (!checkpointManager) {
    try {
      checkpointManager = require('./checkpoint_manager');
    } catch (e) {
      // Checkpoint manager may not be available yet
      checkpointManager = null;
    }
  }
  return checkpointManager;
}

// File paths
const TINYPM_DIR = path.join(__dirname, '..', 'tinypm');
const CONFIG_DIR = path.join(__dirname, '..', 'config');
const CLAUDE_SESSIONS_DIR = path.join(__dirname, '..', 'claude_sessions');
const VERIFIER_DIR = path.join(CLAUDE_SESSIONS_DIR, 'verifier_claude');
const METRICS_FILE = path.join(TINYPM_DIR, '.governor_metrics.json');
const AUDIT_FILE = path.join(TINYPM_DIR, '.governor_audit.json');
const RISK_CONFIG_FILE = path.join(CONFIG_DIR, 'task_risk_classification.json');
const VERIFICATION_QUEUE_FILE = path.join(VERIFIER_DIR, 'VERIFICATION_QUEUE.json');
const VERIFIER_INBOX_FILE = path.join(VERIFIER_DIR, 'INBOX.md');
const PAUSED_TASKS_FILE = path.join(TINYPM_DIR, '.paused_tasks.json');

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
  'direct_done_attempts_blocked',
  // Abstention metrics (STATUS_ABSTAIN Protocol)
  'abstentions_total',
  'abstentions_low_confidence',
  'abstentions_missing_context',
  'abstentions_ethical_concern',
  'abstentions_escalated',
  // Human-on-the-Loop Pause/Resume metrics
  'tasks_paused',
  'tasks_resumed',
  'human_notifications_created',
  'human_notifications_acknowledged',
  'pause_timeouts_expired',
  'average_pause_duration_seconds',
  // Circuit Breaker metrics
  'circuit_breaker_trips',
  'circuit_breaker_resets',
  'circuit_breaker_recoveries',
  'token_limit_warnings'
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
  'screenshot_comparison_failed',
  // Abstention Actions (STATUS_ABSTAIN Protocol)
  'task_abstained',
  'abstention_escalated',
  'abstention_resolved',
  'confidence_check_failed',
  'confidence_check_passed',
  // Human-on-the-Loop Pause/Resume Actions
  'task_paused',
  'task_resumed',
  'human_notification_created',
  'human_notification_acknowledged',
  'pause_timeout_expired',
  // Circuit Breaker Actions
  'circuit_breaker_tripped',
  'circuit_breaker_reset',
  'circuit_breaker_reset_all',
  'circuit_breaker_recovered',
  'circuit_half_open',
  'token_usage_warning'
];

// Valid outcomes
const VALID_OUTCOMES = [
  'success',
  'failure',
  'pending',
  'escalated',
  'rolled_back',
  'blocked',
  'awaiting_verification',
  'abstained'  // STATUS_ABSTAIN Protocol
];

// Task states for verification gate state machine
// KEY RULE: No direct path from IMPLEMENTED to DONE
// STATUS_ABSTAIN: Agent can abstain when confidence is below threshold
const TASK_STATES = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  IMPLEMENTED: 'IMPLEMENTED',
  AWAITING_VERIFICATION: 'AWAITING_VERIFICATION',
  VERIFIED: 'VERIFIED',
  DONE: 'DONE',
  ABSTAINED: 'ABSTAINED'  // STATUS_ABSTAIN Protocol - agent declined task
};

// STATUS_ABSTAIN constant for protocol identification
const STATUS_ABSTAIN = 'STATUS_ABSTAIN';

// Valid state transitions (state machine enforcement)
// This prevents "declared done but not verified" failures
// STATUS_ABSTAIN: IN_PROGRESS can transition to ABSTAINED when agent lacks confidence
const VALID_STATE_TRANSITIONS = {
  'PENDING': ['IN_PROGRESS', 'ABSTAINED'],     // Can abstain before starting
  'IN_PROGRESS': ['IMPLEMENTED', 'PENDING', 'ABSTAINED'],  // Can abstain during work
  'IMPLEMENTED': ['AWAITING_VERIFICATION'],    // CANNOT go directly to DONE!
  'AWAITING_VERIFICATION': ['VERIFIED', 'IMPLEMENTED'],  // Can be sent back for fixes
  'VERIFIED': ['DONE'],
  'DONE': [],      // Terminal state
  'ABSTAINED': ['PENDING', 'IN_PROGRESS']      // Can be reassigned or resumed
};

// Abstention reason categories
const ABSTENTION_REASONS = {
  LOW_CONFIDENCE: 'low_confidence',           // Confidence below threshold
  MISSING_CONTEXT: 'missing_context',         // Insufficient information
  ETHICAL_CONCERN: 'ethical_concern',         // Potential harm or policy violation
  OUT_OF_SCOPE: 'out_of_scope',               // Task outside agent's capabilities
  CONFLICTING_INSTRUCTIONS: 'conflicting_instructions',  // Contradictory requirements
  REQUIRES_HUMAN: 'requires_human'            // Human judgment required
};

// Default confidence threshold for abstention
const DEFAULT_CONFIDENCE_THRESHOLD = 0.85;

// CONFIDENCE THRESHOLDS - Added per MASTER_AGENTIC_IMPLEMENTATION_PLAN
const CONFIDENCE_THRESHOLDS = {
  PROCEED: 0.85,      // >=85% = proceed autonomously
  ESCALATE: 0.70,     // 70-84% = escalate to human
  ABSTAIN: 0.00       // <70% = STATUS_ABSTAIN
};

/**
 * Evaluate confidence for a task based on context factors
 * @param {Object} taskContext - Context information for the task
 * @param {string} taskContext.taskType - Type of task being evaluated
 * @param {boolean} taskContext.hasRequiredInputs - Whether all required inputs are present
 * @param {string} taskContext.scopeClarity - 'high', 'medium', or 'low'
 * @param {number} taskContext.historicalSuccessRate - Past success rate (0-1)
 * @returns {Object} Confidence evaluation result with status and score
 */
function evaluateConfidence(taskContext) {
  const { taskType, hasRequiredInputs, scopeClarity, historicalSuccessRate } = taskContext;

  let score = 0.5; // Base score

  // Factor 1: Required inputs present
  if (hasRequiredInputs) score += 0.2;

  // Factor 2: Scope clarity
  if (scopeClarity === 'high') score += 0.15;
  else if (scopeClarity === 'medium') score += 0.08;

  // Factor 3: Historical success rate
  if (historicalSuccessRate >= 0.9) score += 0.15;
  else if (historicalSuccessRate >= 0.7) score += 0.1;
  else if (historicalSuccessRate >= 0.5) score += 0.05;

  // Cap at 1.0
  score = Math.min(1.0, score);

  if (score >= CONFIDENCE_THRESHOLDS.PROCEED) {
    return { status: 'PROCEED', confidence: score };
  } else if (score >= CONFIDENCE_THRESHOLDS.ESCALATE) {
    return { status: 'ESCALATE', confidence: score, reason: 'Confidence below 85% threshold' };
  } else {
    return {
      status: 'STATUS_ABSTAIN',
      confidence: score,
      response: "I don't know how to complete this task with sufficient confidence.",
      suggestedAction: 'Request human guidance or more context'
    };
  }
}

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
 * Route a task to Verifier_Claude for verification
 *
 * This function is called automatically when a task transitions to AWAITING_VERIFICATION.
 * It writes to both VERIFICATION_QUEUE.json and INBOX.md to ensure Verifier_Claude
 * receives the verification request.
 *
 * @param {string} taskId - Task identifier
 * @param {string} requestedBy - Agent name requesting verification
 * @param {object} details - Additional details about the verification request
 * @param {string} details.description - Description of what needs verification
 * @param {object} details.evidence - Evidence submitted with the request
 * @param {string} details.priority - Priority level (HIGH, MEDIUM, LOW)
 * @returns {object} Result with success status and request ID
 *
 * @example
 * const result = routeToVerifier('TASK-001', 'Backend_Claude', {
 *   description: 'API endpoint update completed',
 *   evidence: { type: 'test_output', content: 'All tests pass' },
 *   priority: 'HIGH'
 * });
 */
function routeToVerifier(taskId, requestedBy, details = {}) {
  const result = {
    success: false,
    requestId: null,
    queuePosition: null,
    error: null,
    timestamp: null
  };

  const timestamp = new Date().toISOString();

  // Generate request ID
  const requestId = `VER-${taskId}-${Date.now()}-${generateUUID().slice(0, 8)}`;

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: Update VERIFICATION_QUEUE.json
  // ═══════════════════════════════════════════════════════════════════════════

  let queue = readJsonFile(VERIFICATION_QUEUE_FILE);
  if (!queue) {
    // Initialize queue if it doesn't exist
    queue = {
      schema_version: '1.0',
      last_updated: timestamp,
      queue_status: 'ACTIVE',
      requests: [],
      processed: [],
      statistics: {
        total_received: 0,
        total_verified: 0,
        total_rejected: 0,
        total_pending: 0,
        average_verification_time_minutes: 0
      },
      verification_types: {
        file_creation: { count: 0, pass_rate: 0 },
        bug_fix: { count: 0, pass_rate: 0 },
        ui_change: { count: 0, pass_rate: 0 },
        api_change: { count: 0, pass_rate: 0 },
        deployment: { count: 0, pass_rate: 0 }
      }
    };
  }

  // Create the verification request entry
  const verificationRequest = {
    requestId: requestId,
    taskId: taskId,
    requestedAt: timestamp,
    requestedBy: requestedBy,
    description: details.description || `Verification requested for task ${taskId}`,
    evidence: details.evidence || {},
    priority: details.priority || 'MEDIUM',
    status: 'pending',
    verificationType: details.verificationType || 'general',
    acceptanceCriteria: details.acceptanceCriteria || [],
    assignedTo: 'Verifier_Claude',
    verifiedAt: null,
    verifiedBy: null,
    verificationResult: null,
    verificationNotes: null
  };

  // Add to queue
  queue.requests.push(verificationRequest);
  queue.statistics.total_received++;
  queue.statistics.total_pending = queue.requests.filter(r => r.status === 'pending').length;
  queue.last_updated = timestamp;

  // Save queue
  const queueSaved = writeJsonFile(VERIFICATION_QUEUE_FILE, queue);
  if (!queueSaved) {
    result.error = 'Failed to write to VERIFICATION_QUEUE.json';
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: Update INBOX.md
  // ═══════════════════════════════════════════════════════════════════════════

  try {
    // Read current INBOX.md
    let inboxContent = '';
    if (fs.existsSync(VERIFIER_INBOX_FILE)) {
      inboxContent = fs.readFileSync(VERIFIER_INBOX_FILE, 'utf-8');
    }

    // Create the markdown entry for the request
    const inboxEntry = `
### ${requestId}
**From:** ${requestedBy}
**Task ID:** ${taskId}
**Timestamp:** ${timestamp}
**Priority:** ${verificationRequest.priority}
**Claim:** ${verificationRequest.description}

#### Evidence Submitted
- Type: ${details.evidence?.type || 'not_provided'}
- Content: ${details.evidence?.content || 'No evidence submitted yet'}

#### Acceptance Criteria
${(details.acceptanceCriteria || ['Verify task completion']).map(c => `- [ ] ${c}`).join('\n')}

---
`;

    // Find the "Active Verification Requests" section and add the entry
    const activeRequestsMarker = '## Active Verification Requests';
    const noRequestsMarker = '*No pending verification requests.*';

    if (inboxContent.includes(noRequestsMarker)) {
      // Replace "no pending" message with the new request
      inboxContent = inboxContent.replace(noRequestsMarker, inboxEntry);
    } else if (inboxContent.includes(activeRequestsMarker)) {
      // Add after the Active Verification Requests header
      const insertPoint = inboxContent.indexOf(activeRequestsMarker) + activeRequestsMarker.length;
      const beforeInsert = inboxContent.substring(0, insertPoint);
      const afterInsert = inboxContent.substring(insertPoint);
      inboxContent = beforeInsert + '\n' + inboxEntry + afterInsert;
    } else {
      // Fallback: append to end
      inboxContent += '\n' + inboxEntry;
    }

    // Write back to INBOX.md
    fs.writeFileSync(VERIFIER_INBOX_FILE, inboxContent);
  } catch (error) {
    // Non-fatal: Queue update succeeded, INBOX update failed
    console.warn(`Warning: Failed to update INBOX.md: ${error.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: Log the routing event
  // ═══════════════════════════════════════════════════════════════════════════

  logGovernorEvent(requestedBy, 'verification_awaiting_approval', 'pending', {
    taskId: taskId,
    requestId: requestId,
    routedTo: 'Verifier_Claude',
    priority: verificationRequest.priority,
    queuePosition: queue.requests.length
  });

  result.success = true;
  result.requestId = requestId;
  result.queuePosition = queue.requests.length;
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

    // Route to Verifier_Claude
    const routeResult = routeToVerifier(taskId, agent, {
      description: `Task ${taskId} transitioned to AWAITING_VERIFICATION`,
      previousState: currentState
    });
    if (!routeResult.success) {
      console.warn(`Warning: Failed to route task ${taskId} to Verifier_Claude: ${routeResult.error}`);
    }
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

  // Auto-checkpoint on successful state transition
  const cpManager = getCheckpointManager();
  if (cpManager && cpManager.autoCheckpointOnTransition) {
    try {
      const checkpointResult = cpManager.autoCheckpointOnTransition(
        taskId,
        agent,
        currentState,
        newState,
        {
          title: taskId,
          description: `State transition: ${currentState} -> ${newState}`
        }
      );
      result.checkpointId = checkpointResult.checkpointId;
    } catch (e) {
      // Non-fatal: checkpointing is best-effort
      console.warn(`Checkpoint creation failed: ${e.message}`);
    }
  }

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

// ═══════════════════════════════════════════════════════════════════════════
// STATUS_ABSTAIN PROTOCOL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
// These functions implement the STATUS_ABSTAIN protocol for agents to properly
// decline tasks when confidence is below threshold or other conditions apply.
// KEY RULE: Abstaining is better than low-confidence execution
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if confidence level meets threshold for task execution
 *
 * @param {number} confidence - Confidence level (0.0 to 1.0)
 * @param {number} threshold - Minimum required confidence (default 0.85)
 * @returns {object} Result with passes flag and recommendation
 *
 * @example
 * const check = checkConfidenceThreshold(0.72, 0.85);
 * if (!check.passes) {
 *   handleAbstention(agentId, taskId, 'low_confidence');
 * }
 */
function checkConfidenceThreshold(confidence, threshold = DEFAULT_CONFIDENCE_THRESHOLD) {
  const result = {
    passes: false,
    confidence: confidence,
    threshold: threshold,
    deficit: 0,
    recommendation: null
  };

  // Validate input
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
    result.error = 'Confidence must be a number between 0.0 and 1.0';
    result.recommendation = 'ABSTAIN - invalid confidence value';
    return result;
  }

  result.passes = confidence >= threshold;
  result.deficit = result.passes ? 0 : Math.round((threshold - confidence) * 100);

  if (result.passes) {
    result.recommendation = 'PROCEED - confidence meets threshold';
  } else if (confidence >= threshold - 0.15) {
    result.recommendation = 'ABSTAIN_SOFT - confidence close, consider requesting clarification';
  } else if (confidence >= threshold - 0.30) {
    result.recommendation = 'ABSTAIN_HARD - significant confidence gap, escalate to human';
  } else {
    result.recommendation = 'ABSTAIN_CRITICAL - very low confidence, do not attempt';
  }

  return result;
}

/**
 * Handle an agent abstention from a task
 *
 * @param {string} agentId - Agent ID that is abstaining
 * @param {string} taskId - Task ID being abstained from
 * @param {string} reason - Reason category for abstention
 * @param {object} details - Additional details about the abstention
 * @param {number} details.confidence - Agent's confidence level (0.0 to 1.0)
 * @param {string} details.explanation - Human-readable explanation
 * @param {array} details.missingInfo - List of missing information
 * @param {string} details.suggestedAction - What the agent suggests instead
 * @returns {object} Result with success status and abstention record
 *
 * @example
 * const result = handleAbstention('Backend_Claude', 'TASK-001', 'low_confidence', {
 *   confidence: 0.65,
 *   explanation: 'Insufficient context about database schema',
 *   missingInfo: ['table relationships', 'index requirements'],
 *   suggestedAction: 'Request database documentation'
 * });
 */
function handleAbstention(agentId, taskId, reason, details = {}) {
  const result = {
    success: false,
    abstentionId: null,
    timestamp: null,
    escalated: false,
    errors: []
  };

  // Validate agent
  if (!VALID_AGENTS.includes(agentId)) {
    result.errors.push(`Unknown agent: ${agentId}`);
    return result;
  }

  // Validate reason
  if (!reason || !Object.values(ABSTENTION_REASONS).includes(reason)) {
    result.errors.push(`Invalid abstention reason: ${reason}. Valid reasons: ${Object.values(ABSTENTION_REASONS).join(', ')}`);
    return result;
  }

  // Validate taskId
  if (!taskId) {
    result.errors.push('Task ID is required');
    return result;
  }

  // Generate abstention ID
  const abstentionId = `ABSTAIN-${taskId}-${Date.now()}-${generateUUID().slice(0, 8)}`;
  const timestamp = new Date().toISOString();

  // Determine if this should be escalated
  const shouldEscalate = reason === ABSTENTION_REASONS.ETHICAL_CONCERN ||
                         reason === ABSTENTION_REASONS.REQUIRES_HUMAN ||
                         (details.confidence && details.confidence < 0.5);

  // Read metrics file to store abstention
  let metrics = readJsonFile(METRICS_FILE);
  if (!metrics) {
    result.errors.push('Could not read metrics file');
    return result;
  }

  // Initialize abstention storage if not exists
  if (!metrics.abstentions) {
    metrics.abstentions = {
      records: [],
      by_agent: {},
      by_reason: {}
    };
  }

  // Create abstention record
  const abstentionRecord = {
    id: abstentionId,
    taskId: taskId,
    agentId: agentId,
    reason: reason,
    confidence: details.confidence || null,
    explanation: details.explanation || '',
    missingInfo: details.missingInfo || [],
    suggestedAction: details.suggestedAction || '',
    timestamp: timestamp,
    escalated: shouldEscalate,
    resolved: false,
    resolvedBy: null,
    resolvedAt: null
  };

  // Store abstention record
  metrics.abstentions.records.push(abstentionRecord);

  // Track by agent
  if (!metrics.abstentions.by_agent[agentId]) {
    metrics.abstentions.by_agent[agentId] = [];
  }
  metrics.abstentions.by_agent[agentId].push(abstentionId);

  // Track by reason
  if (!metrics.abstentions.by_reason[reason]) {
    metrics.abstentions.by_reason[reason] = 0;
  }
  metrics.abstentions.by_reason[reason]++;

  // Update task state if task_states exists
  if (metrics.task_states && metrics.task_states[taskId]) {
    metrics.task_states[taskId].history.push({
      from: metrics.task_states[taskId].currentState,
      to: TASK_STATES.ABSTAINED,
      agent: agentId,
      timestamp: timestamp,
      reason: reason
    });
    metrics.task_states[taskId].currentState = TASK_STATES.ABSTAINED;
  }

  metrics.last_updated = timestamp;

  // Keep last 500 abstention records to prevent file bloat
  if (metrics.abstentions.records.length > 500) {
    metrics.abstentions.records = metrics.abstentions.records.slice(-500);
  }

  // Save metrics
  const saved = writeJsonFile(METRICS_FILE, metrics);
  if (!saved) {
    result.errors.push('Failed to save abstention to metrics file');
    return result;
  }

  // Log the abstention event
  logGovernorEvent(agentId, 'task_abstained', 'abstained', {
    taskId: taskId,
    abstentionId: abstentionId,
    reason: reason,
    confidence: details.confidence,
    explanation: details.explanation,
    escalated: shouldEscalate
  });

  // Increment appropriate metrics
  incrementMetric('abstentions_total', agentId);

  // Increment reason-specific metric
  const reasonMetricMap = {
    'low_confidence': 'abstentions_low_confidence',
    'missing_context': 'abstentions_missing_context',
    'ethical_concern': 'abstentions_ethical_concern'
  };
  if (reasonMetricMap[reason]) {
    incrementMetric(reasonMetricMap[reason], agentId);
  }

  // Log escalation if needed
  if (shouldEscalate) {
    logGovernorEvent(agentId, 'abstention_escalated', 'escalated', {
      taskId: taskId,
      abstentionId: abstentionId,
      reason: reason,
      confidence: details.confidence,
      message: 'Abstention requires human review'
    });
    incrementMetric('abstentions_escalated', agentId);
  }

  result.success = true;
  result.abstentionId = abstentionId;
  result.timestamp = timestamp;
  result.escalated = shouldEscalate;

  return result;
}

/**
 * Get abstention statistics for an agent
 *
 * @param {string} agentId - Agent ID to get stats for
 * @returns {object} Abstention statistics
 *
 * @example
 * const stats = getAgentAbstentionStats('Backend_Claude');
 * console.log(`Abstention rate: ${stats.abstentionRate}%`);
 */
function getAgentAbstentionStats(agentId) {
  const result = {
    agentId: agentId,
    exists: false,
    totalAbstentions: 0,
    abstentionRate: 0,
    byReason: {},
    recentAbstentions: []
  };

  // Read metrics file
  const metrics = readJsonFile(METRICS_FILE);
  if (!metrics) {
    result.error = 'Could not read metrics file';
    return result;
  }

  // Check if agent has abstention data
  if (!metrics.abstentions || !metrics.abstentions.by_agent[agentId]) {
    result.message = `No abstention data for ${agentId}`;
    return result;
  }

  result.exists = true;
  const agentAbstentionIds = metrics.abstentions.by_agent[agentId];
  result.totalAbstentions = agentAbstentionIds.length;

  // Calculate abstention rate
  const agentMetrics = metrics.by_agent[agentId];
  if (agentMetrics) {
    const totalTasks = (agentMetrics.tasks_completed || 0) +
                       (agentMetrics.tasks_failed || 0) +
                       result.totalAbstentions;
    result.abstentionRate = totalTasks > 0
      ? Math.round((result.totalAbstentions / totalTasks) * 100)
      : 0;
  }

  // Get recent abstentions (last 10)
  const agentRecords = metrics.abstentions.records.filter(r => r.agentId === agentId);
  result.recentAbstentions = agentRecords.slice(-10).reverse();

  // Count by reason
  agentRecords.forEach(record => {
    if (!result.byReason[record.reason]) {
      result.byReason[record.reason] = 0;
    }
    result.byReason[record.reason]++;
  });

  return result;
}

/**
 * Resolve an abstention (mark it as handled)
 *
 * @param {string} resolver - Agent or human resolving the abstention
 * @param {string} abstentionId - Abstention ID to resolve
 * @param {string} resolution - How it was resolved
 * @returns {object} Result with success status
 *
 * @example
 * const result = resolveAbstention('PM_Architect', 'ABSTAIN-TASK-001-123', 'Reassigned to Security_Claude with additional context');
 */
function resolveAbstention(resolver, abstentionId, resolution = '') {
  const result = {
    success: false,
    error: null,
    timestamp: null
  };

  // Read metrics file
  let metrics = readJsonFile(METRICS_FILE);
  if (!metrics) {
    result.error = 'Could not read metrics file';
    return result;
  }

  // Find the abstention
  if (!metrics.abstentions || !metrics.abstentions.records) {
    result.error = 'No abstention records found';
    return result;
  }

  const abstentionIndex = metrics.abstentions.records.findIndex(r => r.id === abstentionId);
  if (abstentionIndex === -1) {
    result.error = `Abstention not found: ${abstentionId}`;
    return result;
  }

  // Update the record
  const timestamp = new Date().toISOString();
  metrics.abstentions.records[abstentionIndex].resolved = true;
  metrics.abstentions.records[abstentionIndex].resolvedBy = resolver;
  metrics.abstentions.records[abstentionIndex].resolvedAt = timestamp;
  metrics.abstentions.records[abstentionIndex].resolution = resolution;
  metrics.last_updated = timestamp;

  // Save metrics
  const saved = writeJsonFile(METRICS_FILE, metrics);
  if (!saved) {
    result.error = 'Failed to save resolution';
    return result;
  }

  // Log the resolution
  const abstention = metrics.abstentions.records[abstentionIndex];
  logGovernorEvent(resolver, 'abstention_resolved', 'success', {
    abstentionId: abstentionId,
    taskId: abstention.taskId,
    originalAgent: abstention.agentId,
    originalReason: abstention.reason,
    resolution: resolution
  });

  result.success = true;
  result.timestamp = timestamp;

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRACING INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════
// Functions to integrate governor events with OpenTelemetry-style tracing
// ═══════════════════════════════════════════════════════════════════════════

// Lazy-load tracing module to avoid circular dependencies
let tracing = null;
function getTracing() {
  if (!tracing) {
    try {
      tracing = require('./agent_tracing');
    } catch (e) {
      console.warn('Tracing module not available:', e.message);
      return null;
    }
  }
  return tracing;
}

/**
 * Log a governor event with automatic tracing
 *
 * This wraps logGovernorEvent to also create trace spans for observability.
 *
 * @param {string} agent - Agent name
 * @param {string} action - Action type
 * @param {string} outcome - Outcome
 * @param {object} details - Event details
 * @param {string} details.taskId - Task ID for tracing (if provided)
 * @returns {object} Result with eventId and optional spanId
 *
 * @example
 * const result = tracedGovernorEvent('Backend_Claude', 'task_completed', 'success', {
 *   taskId: 'TASK-001',
 *   task: 'API update',
 *   confidence: 95
 * });
 */
function tracedGovernorEvent(agent, action, outcome, details = {}) {
  // Log to governor system first
  const govResult = logGovernorEvent(agent, action, outcome, details);

  // If taskId provided, also log to tracing
  const t = getTracing();
  if (t && details.taskId) {
    // Create a span for significant events
    const significantEvents = [
      'task_started', 'task_completed', 'task_failed',
      'verification_gate_initiated', 'verification_gate_passed', 'verification_gate_failed',
      'proof_of_success_submitted', 'proof_of_success_validated'
    ];

    if (significantEvents.includes(action)) {
      const spanId = t.startSpan(`governor.${action}`, agent, details.taskId, {
        attributes: {
          governorEventId: govResult.eventId,
          outcome: outcome
        }
      });

      // Log the event details
      t.logEvent(spanId, 'governor_event', {
        action: action,
        outcome: outcome,
        ...details
      });

      // Map outcome to span status
      const statusMap = {
        'success': 'OK',
        'failure': 'ERROR',
        'pending': 'UNSET',
        'escalated': 'ABSTAINED',
        'rolled_back': 'ERROR',
        'blocked': 'ERROR',
        'awaiting_verification': 'UNSET'
      };

      // End the span immediately for point-in-time events
      t.endSpan(spanId, statusMap[outcome] || 'UNSET', {
        governorEventId: govResult.eventId,
        ...details
      });

      govResult.spanId = spanId;
    }
  }

  return govResult;
}

/**
 * Create a traced operation that automatically logs to both governor and tracing
 *
 * @param {string} operationName - Name of the operation
 * @param {string} agent - Agent name
 * @param {string} taskId - Task ID
 * @param {function} operation - Async function to execute
 * @returns {object} Result with operation output and tracing info
 *
 * @example
 * const result = await tracedOperation('validateInput', 'Backend_Claude', 'TASK-001', async (span) => {
 *   // Log progress
 *   span.logEvent('info', { message: 'Starting validation' });
 *
 *   // Do work
 *   const isValid = validateData(input);
 *
 *   // Return result
 *   return { valid: isValid, confidence: 0.95 };
 * });
 */
async function tracedOperation(operationName, agent, taskId, operation) {
  const t = getTracing();
  const startTime = new Date().toISOString();

  // Log task started to governor
  const startEvent = logGovernorEvent(agent, 'task_started', 'pending', {
    taskId: taskId,
    operation: operationName,
    startTime: startTime
  });

  let spanId = null;
  if (t) {
    spanId = t.startSpan(operationName, agent, taskId, {
      attributes: {
        governorStartEventId: startEvent.eventId
      }
    });
  }

  // Create span helper for operation to use
  const spanHelper = {
    logEvent: (name, data) => {
      if (t && spanId) {
        t.logEvent(spanId, name, data);
      }
    },
    setAttribute: (key, value) => {
      if (t && spanId) {
        t.setSpanAttribute(spanId, key, value);
      }
    },
    spanId: spanId
  };

  try {
    // Execute the operation
    const result = await operation(spanHelper);

    // Determine outcome based on result
    const outcome = result.error ? 'failure' : 'success';
    const confidence = result.confidence;

    // Log completion to governor
    const endEvent = logGovernorEvent(agent, outcome === 'success' ? 'task_completed' : 'task_failed', outcome, {
      taskId: taskId,
      operation: operationName,
      confidence: confidence,
      ...result
    });

    // End the span
    if (t && spanId) {
      t.endSpan(spanId, outcome === 'success' ? 'OK' : 'ERROR', {
        governorEndEventId: endEvent.eventId,
        ...result
      });
    }

    // Increment appropriate metric
    incrementMetric(outcome === 'success' ? 'tasks_completed' : 'tasks_failed', agent);

    return {
      success: outcome === 'success',
      result: result,
      spanId: spanId,
      governorStartEventId: startEvent.eventId,
      governorEndEventId: endEvent.eventId
    };

  } catch (error) {
    // Log failure to governor
    const failEvent = logGovernorEvent(agent, 'task_failed', 'failure', {
      taskId: taskId,
      operation: operationName,
      error: error.message,
      stack: error.stack
    });

    // End span with error
    if (t && spanId) {
      t.logEvent(spanId, 'error', { error: error.message, stack: error.stack });
      t.endSpan(spanId, 'ERROR', { error: error.message });
    }

    // Increment failure metric
    incrementMetric('tasks_failed', agent);

    return {
      success: false,
      error: error.message,
      spanId: spanId,
      governorStartEventId: startEvent.eventId,
      governorEndEventId: failEvent.eventId
    };
  }
}

/**
 * Get combined governor and trace data for a task
 *
 * @param {string} taskId - Task ID
 * @returns {object} Combined observability data
 */
function getTaskObservability(taskId) {
  const result = {
    taskId: taskId,
    verificationStatus: null,
    trace: null,
    recentEvents: [],
    summary: {}
  };

  // Get verification status from governor
  result.verificationStatus = getTaskVerificationStatus(taskId);

  // Get trace if available
  const t = getTracing();
  if (t) {
    result.trace = t.getTrace(taskId);

    if (result.trace) {
      // Calculate summary stats
      const spans = result.trace.spans;
      result.summary = {
        spanCount: spans.length,
        okCount: spans.filter(s => s.status === 'OK').length,
        errorCount: spans.filter(s => s.status === 'ERROR').length,
        abstainedCount: spans.filter(s => s.status === 'ABSTAINED').length,
        totalDurationMs: spans.reduce((sum, s) => sum + (s.durationMs || 0), 0),
        agents: [...new Set(spans.map(s => s.agentId))],
        eventCount: spans.reduce((sum, s) => sum + (s.events ? s.events.length : 0), 0)
      };
    }
  }

  // Get recent governor events for this task
  const allEvents = getRecentEvents({ limit: 100 });
  result.recentEvents = allEvents.filter(e =>
    e.details && e.details.taskId === taskId
  );

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// TASK RISK CLASSIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
// These functions classify tasks by risk level and determine required
// approval levels based on the risk classification configuration.
// ═══════════════════════════════════════════════════════════════════════════

// Risk levels (from lowest to highest)
const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

// Risk level numeric values for comparison
const RISK_LEVEL_VALUES = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

/**
 * Load the risk classification configuration
 * @returns {object|null} Risk configuration or null if not found
 */
function loadRiskConfig() {
  return readJsonFile(RISK_CONFIG_FILE);
}

/**
 * Classify the risk level of a task based on task type and scope
 * @param {string} taskType - Type of task
 * @param {string} scope - Scope of the task
 * @returns {object} Risk classification result
 */
function classifyTaskRisk(taskType, scope = '') {
  const result = {
    taskType: taskType,
    scope: scope,
    level: RISK_LEVELS.LOW,
    levelValue: 1,
    requiresApproval: false,
    requiresVerification: false,
    requiresHumanApproval: false,
    requiresExplicitCommand: false,
    minimumTrustLevel: 25,
    reasons: [],
    matchedPatterns: [],
    scopeModifier: 0
  };

  const config = loadRiskConfig();
  if (!config) {
    result.reasons.push('Risk configuration not found, defaulting to LOW');
    return result;
  }

  const normalizedTaskType = taskType.toLowerCase().trim();
  const normalizedScope = scope.toLowerCase().trim();

  // Check explicit task type mapping
  if (config.taskTypeToRisk && config.taskTypeToRisk[normalizedTaskType]) {
    const mappedLevel = config.taskTypeToRisk[normalizedTaskType];
    result.level = mappedLevel;
    result.levelValue = RISK_LEVEL_VALUES[mappedLevel] || 1;
    result.reasons.push(`Task type '${normalizedTaskType}' maps to ${mappedLevel}`);
    result.matchedPatterns.push(`taskType:${normalizedTaskType}`);
  }

  // Check keyword patterns
  if (config.keywordPatterns) {
    for (const [level, patterns] of Object.entries(config.keywordPatterns)) {
      for (const pattern of patterns) {
        if (normalizedTaskType.includes(pattern.toLowerCase())) {
          const patternLevel = RISK_LEVEL_VALUES[level] || 1;
          if (patternLevel > result.levelValue) {
            result.level = level;
            result.levelValue = patternLevel;
            result.reasons.push(`Keyword '${pattern}' matches ${level} risk pattern`);
            result.matchedPatterns.push(`keyword:${pattern}`);
          }
        }
      }
    }
  }

  // Apply scope modifiers
  if (config.scopeModifiers && normalizedScope) {
    for (const [scopeKey, modifier] of Object.entries(config.scopeModifiers)) {
      if (normalizedScope.includes(scopeKey.toLowerCase())) {
        result.scopeModifier += modifier;
        result.reasons.push(`Scope '${scopeKey}' modifier: ${modifier > 0 ? '+' : ''}${modifier}`);
        result.matchedPatterns.push(`scope:${scopeKey}`);
      }
    }

    if (result.scopeModifier !== 0) {
      const adjustedValue = Math.max(1, Math.min(4, result.levelValue + result.scopeModifier));
      const levelNames = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      const newLevel = levelNames[adjustedValue - 1];
      if (newLevel !== result.level) {
        result.reasons.push(`Risk level adjusted from ${result.level} to ${newLevel} due to scope modifiers`);
        result.level = newLevel;
        result.levelValue = adjustedValue;
      }
    }
  }

  // Get risk level configuration details
  if (config.riskLevels && config.riskLevels[result.level]) {
    const levelConfig = config.riskLevels[result.level];
    result.requiresApproval = levelConfig.requiresApproval || false;
    result.requiresVerification = levelConfig.requiresVerification || false;
    result.requiresHumanApproval = levelConfig.requiresHumanApproval || false;
    result.requiresExplicitCommand = levelConfig.requiresExplicitCommand || false;
    result.minimumTrustLevel = levelConfig.minimumTrustLevel || 25;
    result.description = levelConfig.description || '';
    result.displayName = levelConfig.displayName || result.level;
    result.color = levelConfig.color || '#6c757d';
    result.icon = levelConfig.icon || 'fa-question-circle';
    result.examples = levelConfig.examples || [];
  }

  return result;
}

/**
 * Get the required approval level for a given risk level
 * @param {string} riskLevel - Risk level (LOW, MEDIUM, HIGH, CRITICAL)
 * @returns {object} Approval requirements
 */
function getRequiredApprovalLevel(riskLevel) {
  const result = {
    riskLevel: riskLevel,
    autoApprove: true,
    requiresHumanApproval: false,
    requiresExplicitCommand: false,
    requiresDoubleConfirmation: false,
    approvers: [],
    conditions: [],
    behavior: 'autonomous',
    minTrust: 25,
    description: ''
  };

  const config = loadRiskConfig();
  if (!config) {
    result.error = 'Risk configuration not found';
    return result;
  }

  if (config.approvalWorkflow && config.approvalWorkflow[riskLevel]) {
    const workflow = config.approvalWorkflow[riskLevel];
    result.autoApprove = workflow.autoApprove || false;
    result.conditions = workflow.conditions || [];
    result.approvers = workflow.approvers || [];
    result.requiresDoubleConfirmation = workflow.requiresDoubleConfirmation || false;
    result.requiresHumanApproval = !workflow.autoApprove || workflow.conditions.includes('humanApproval');
    result.requiresExplicitCommand = workflow.conditions.includes('explicitHumanCommand');
  }

  if (config.autonomyLevelMapping && config.autonomyLevelMapping[riskLevel]) {
    const autonomy = config.autonomyLevelMapping[riskLevel];
    result.behavior = autonomy.behavior || 'autonomous';
    result.minTrust = autonomy.minTrust || 25;
    result.description = autonomy.description || '';
  }

  return result;
}

/**
 * Check if a task can proceed based on risk level and trust level
 * @param {string} taskType - Type of task
 * @param {string} scope - Scope
 * @param {number} trustLevel - Current trust level (0-100)
 * @param {boolean} hasHumanApproval - Has human approved
 * @param {boolean} hasExplicitCommand - Has explicit command
 * @returns {object} Result with canProceed flag
 */
function canProceedWithRisk(taskType, scope, trustLevel = 50, hasHumanApproval = false, hasExplicitCommand = false) {
  const result = {
    canProceed: false,
    taskType: taskType,
    scope: scope,
    trustLevel: trustLevel,
    hasHumanApproval: hasHumanApproval,
    hasExplicitCommand: hasExplicitCommand,
    riskClassification: null,
    approvalRequirements: null,
    reason: '',
    recommendation: ''
  };

  const riskClassification = classifyTaskRisk(taskType, scope);
  result.riskClassification = riskClassification;

  const approvalRequirements = getRequiredApprovalLevel(riskClassification.level);
  result.approvalRequirements = approvalRequirements;

  switch (riskClassification.level) {
    case RISK_LEVELS.LOW:
      if (trustLevel >= riskClassification.minimumTrustLevel) {
        result.canProceed = true;
        result.reason = `LOW risk task can proceed autonomously (trust ${trustLevel}% >= ${riskClassification.minimumTrustLevel}%)`;
      } else {
        result.canProceed = false;
        result.reason = `LOW risk requires trust level >= ${riskClassification.minimumTrustLevel}% (current: ${trustLevel}%)`;
        result.recommendation = 'Build trust through successful task completions';
      }
      break;

    case RISK_LEVELS.MEDIUM:
      if (trustLevel >= riskClassification.minimumTrustLevel) {
        result.canProceed = true;
        result.reason = `MEDIUM risk task can proceed with verification (trust ${trustLevel}% >= ${riskClassification.minimumTrustLevel}%)`;
        result.recommendation = 'Ensure verification step is completed before marking done';
      } else {
        result.canProceed = false;
        result.reason = `MEDIUM risk requires trust level >= ${riskClassification.minimumTrustLevel}% (current: ${trustLevel}%)`;
        result.recommendation = 'Build trust or request human approval';
      }
      break;

    case RISK_LEVELS.HIGH:
      if (hasHumanApproval) {
        result.canProceed = true;
        result.reason = 'HIGH risk task approved by human';
      } else {
        result.canProceed = false;
        result.reason = 'HIGH risk tasks ALWAYS require human approval';
        result.recommendation = `Request approval from: ${approvalRequirements.approvers.join(', ') || 'PM_Architect or Owner'}`;
      }
      break;

    case RISK_LEVELS.CRITICAL:
      if (hasExplicitCommand && hasHumanApproval) {
        result.canProceed = true;
        result.reason = 'CRITICAL risk task has explicit human command and approval';
      } else if (hasExplicitCommand && !hasHumanApproval) {
        result.canProceed = false;
        result.reason = 'CRITICAL risk tasks require both explicit command AND approval';
        result.recommendation = 'Await explicit approval confirmation';
      } else {
        result.canProceed = false;
        result.reason = 'CRITICAL risk tasks require EXPLICIT human command';
        result.recommendation = 'Do NOT proceed without explicit human instruction';
      }
      break;

    default:
      result.canProceed = false;
      result.reason = `Unknown risk level: ${riskClassification.level}`;
      result.recommendation = 'Escalate to PM_Architect';
  }

  return result;
}

/**
 * Classify risk from a file path
 * @param {string} filePath - File path or filename
 * @param {string} action - Action (create, modify, delete)
 * @returns {object} Risk classification
 */
function classifyFileRisk(filePath, action = 'modify') {
  const result = {
    filePath: filePath,
    action: action,
    level: RISK_LEVELS.LOW,
    levelValue: 1,
    matchedPatterns: [],
    reasons: []
  };

  const config = loadRiskConfig();
  if (!config || !config.filePatternRisks) {
    result.reasons.push('File pattern risks not configured, defaulting to LOW');
    return classifyTaskRisk(action, '');
  }

  const normalizedPath = filePath.toLowerCase();

  const levelsToCheck = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  for (const level of levelsToCheck) {
    const patterns = config.filePatternRisks[level] || [];
    for (const pattern of patterns) {
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(normalizedPath)) {
          result.level = level;
          result.levelValue = RISK_LEVEL_VALUES[level];
          result.matchedPatterns.push(`${level}:${pattern}`);
          result.reasons.push(`File path matches ${level} risk pattern: ${pattern}`);
          break;
        }
      } catch (e) {
        // Invalid regex, skip
      }
    }
    if (result.matchedPatterns.length > 0) break;
  }

  if (action === 'delete') {
    const newLevel = Math.min(4, result.levelValue + 1);
    const levelNames = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    if (newLevel > result.levelValue) {
      result.reasons.push(`Delete action increases risk from ${result.level} to ${levelNames[newLevel - 1]}`);
      result.level = levelNames[newLevel - 1];
      result.levelValue = newLevel;
    }
  }

  const fullClassification = classifyTaskRisk(`file_${action}`, '');

  if (result.levelValue > (fullClassification.levelValue || 1)) {
    return { ...fullClassification, ...result, level: result.level, levelValue: result.levelValue };
  }

  return { ...fullClassification, filePath: filePath, action: action, matchedPatterns: result.matchedPatterns, fileReasons: result.reasons };
}

/**
 * Get a summary of all risk levels and their requirements
 * @returns {object} Summary of all risk levels
 */
function getRiskLevelsSummary() {
  const config = loadRiskConfig();
  if (!config) return { error: 'Risk configuration not found' };

  const summary = { version: config.version, levels: {} };

  if (config.riskLevels) {
    for (const [level, details] of Object.entries(config.riskLevels)) {
      summary.levels[level] = {
        displayName: details.displayName,
        description: details.description,
        color: details.color,
        minimumTrustLevel: details.minimumTrustLevel,
        requiresApproval: details.requiresApproval,
        requiresHumanApproval: details.requiresHumanApproval,
        requiresExplicitCommand: details.requiresExplicitCommand,
        examples: details.examples
      };
    }
  }

  if (config.autonomyLevelMapping) summary.autonomyMapping = config.autonomyLevelMapping;

  return summary;
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT FOLDER MAPPING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
// These functions map VALID_AGENTS names to their actual folder names in
// claude_sessions/ directory. This allows consistent agent naming while
// supporting different folder naming conventions.
// ═══════════════════════════════════════════════════════════════════════════

const AGENT_FOLDER_MAPPING_FILE = path.join(CONFIG_DIR, 'agent_folder_mapping.json');

/**
 * Load the agent folder mapping configuration
 * @returns {object|null} Agent folder mapping or null if not found
 */
function loadAgentFolderMapping() {
  return readJsonFile(AGENT_FOLDER_MAPPING_FILE);
}

/**
 * Get the folder name for a given agent
 * @param {string} agentName - The VALID_AGENTS name (e.g., 'Backend_Claude')
 * @returns {string} The folder name (e.g., 'backend')
 *
 * @example
 * const folder = getAgentFolderName('Backend_Claude'); // returns 'backend'
 * const folder = getAgentFolderName('PM_Architect');   // returns 'pm_architect'
 */
function getAgentFolderName(agentName) {
  const config = loadAgentFolderMapping();
  if (config && config.mapping && config.mapping[agentName]) {
    return config.mapping[agentName];
  }
  // Fallback: convert agent name to lowercase and replace spaces/special chars
  return agentName.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

/**
 * Get the full path to an agent's session folder
 * @param {string} agentName - The VALID_AGENTS name (e.g., 'Backend_Claude')
 * @returns {string} Full path to the agent's session folder
 *
 * @example
 * const path = getAgentSessionPath('Backend_Claude');
 * // returns '/path/to/TIny_Seed_OS/claude_sessions/backend'
 */
function getAgentSessionPath(agentName) {
  const folderName = getAgentFolderName(agentName);
  return path.join(CLAUDE_SESSIONS_DIR, folderName);
}

/**
 * Get the agent name from a folder name (reverse lookup)
 * @param {string} folderName - The folder name (e.g., 'backend')
 * @returns {string|null} The VALID_AGENTS name or null if not found
 *
 * @example
 * const agent = getAgentNameFromFolder('backend'); // returns 'Backend_Claude'
 */
function getAgentNameFromFolder(folderName) {
  const config = loadAgentFolderMapping();
  if (config && config.reverse_mapping && config.reverse_mapping[folderName]) {
    return config.reverse_mapping[folderName];
  }
  // Check if folderName matches a VALID_AGENT directly
  const normalizedFolder = folderName.toLowerCase();
  for (const agent of VALID_AGENTS) {
    if (agent.toLowerCase().replace(/[^a-z0-9]/g, '_') === normalizedFolder) {
      return agent;
    }
  }
  return null;
}

/**
 * Get paths to an agent's INBOX and OUTBOX files
 * @param {string} agentName - The VALID_AGENTS name
 * @returns {object} Object with inboxPath and outboxPath
 *
 * @example
 * const paths = getAgentInboxOutboxPaths('Backend_Claude');
 * // returns { inboxPath: '...claude_sessions/backend/INBOX.md', outboxPath: '...claude_sessions/backend/OUTBOX.md' }
 */
function getAgentInboxOutboxPaths(agentName) {
  const sessionPath = getAgentSessionPath(agentName);
  return {
    inboxPath: path.join(sessionPath, 'INBOX.md'),
    outboxPath: path.join(sessionPath, 'OUTBOX.md')
  };
}

/**
 * Get all agent folder mappings
 * @returns {object} Complete mapping of all agents to their folders
 */
function getAllAgentFolderMappings() {
  const config = loadAgentFolderMapping();
  if (!config) {
    // Generate default mapping from VALID_AGENTS
    const mapping = {};
    for (const agent of VALID_AGENTS) {
      mapping[agent] = agent.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    return { mapping, source: 'generated_default' };
  }
  return { mapping: config.mapping, reverse_mapping: config.reverse_mapping, source: 'config_file' };
}

// AGENT RESPONSE WRAPPER - MUST be used for all agent responses
// Per MASTER_AGENTIC_IMPLEMENTATION_PLAN: Forces confidence check on every response
function agentResponse(taskId, result, confidenceScore, agentId = 'unknown') {
  const timestamp = new Date().toISOString();

  // Log every response for audit trail
  const responseRecord = {
    taskId,
    agentId,
    confidence: confidenceScore,
    timestamp,
    status: null,
    result: null
  };

  if (confidenceScore < 0.85) {
    responseRecord.status = 'STATUS_ABSTAIN';
    responseRecord.result = {
      message: "I don't have enough confidence to complete this task.",
      partialResult: result,
      needsHumanInput: true,
      confidence: confidenceScore
    };

    // Log abstention
    console.warn(`[ABSTENTION] Agent ${agentId} abstained from ${taskId} (confidence: ${confidenceScore})`);
  } else {
    responseRecord.status = 'COMPLETE';
    responseRecord.result = result;
  }

  return responseRecord;
}

// Wrapper that ENFORCES confidence check - agents MUST use this
function createAgentTask(agentId, taskId, taskFn) {
  return async function(...args) {
    const startTime = Date.now();
    let confidence = 0.5;
    let result = null;

    try {
      // Execute the task
      result = await taskFn(...args);
      confidence = result?.confidence || 0.85; // Default to threshold if not specified
    } catch (error) {
      confidence = 0.0;
      result = { error: error.message };
    }

    const duration = Date.now() - startTime;
    return agentResponse(taskId, { ...result, duration }, confidence, agentId);
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HUMAN-ON-THE-LOOP PAUSE/RESUME SYSTEM
// Tasks can pause for human input and resume later
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all paused tasks from storage
 * @returns {object} Object with tasks array
 */
function getPausedTasks() {
  if (fs.existsSync(PAUSED_TASKS_FILE)) {
    return JSON.parse(fs.readFileSync(PAUSED_TASKS_FILE, 'utf8'));
  }
  return { tasks: [] };
}

/**
 * Save paused tasks to storage
 * @param {object} data - The paused tasks data
 */
function savePausedTasks(data) {
  fs.writeFileSync(PAUSED_TASKS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Pause a task for human input
 * @param {string} taskId - Unique task identifier
 * @param {string} agentId - The agent pausing the task
 * @param {string} reason - Why the task is being paused
 * @param {object} context - Additional context for the human
 * @param {any} partialResult - Any partial work completed (optional)
 * @returns {object} The pause record
 *
 * @example
 * const record = pauseTaskForHuman('TASK-123', 'Backend_Claude', 'Need clarification', {question: 'Which approach?'});
 */
function pauseTaskForHuman(taskId, agentId, reason, context, partialResult = null) {
  const pausedTasks = getPausedTasks();

  const pauseRecord = {
    taskId,
    agentId,
    reason,
    context,
    partialResult,
    pausedAt: new Date().toISOString(),
    status: 'awaiting_human',
    humanResponse: null,
    resumedAt: null
  };

  // Check if already paused
  const existingIndex = pausedTasks.tasks.findIndex(t => t.taskId === taskId);
  if (existingIndex >= 0) {
    pausedTasks.tasks[existingIndex] = pauseRecord;
  } else {
    pausedTasks.tasks.push(pauseRecord);
  }

  savePausedTasks(pausedTasks);

  // Increment metrics
  incrementMetric('tasks_paused', agentId);

  // Log audit event
  logGovernorEvent(agentId, 'task_paused', 'success', {
    taskId,
    reason,
    context
  });

  console.log(`\n[TASK PAUSED] ${taskId}`);
  console.log(`   Agent: ${agentId}`);
  console.log(`   Reason: ${reason}`);
  console.log(`   Context: ${JSON.stringify(context)}`);
  console.log(`\n   To resume, call: resumeTask('${taskId}', humanResponse)`);

  return pauseRecord;
}

/**
 * Resume a paused task with human input
 * @param {string} taskId - The task to resume
 * @param {any} humanResponse - The human's response/decision
 * @returns {object} Result with success status and task data
 *
 * @example
 * const result = resumeTask('TASK-123', {answer: 'Use approach A'});
 */
function resumeTask(taskId, humanResponse) {
  const pausedTasks = getPausedTasks();
  const taskIndex = pausedTasks.tasks.findIndex(t => t.taskId === taskId);

  if (taskIndex < 0) {
    return { success: false, error: `Task ${taskId} not found in paused tasks` };
  }

  const task = pausedTasks.tasks[taskIndex];
  task.humanResponse = humanResponse;
  task.resumedAt = new Date().toISOString();
  task.status = 'resumed';

  savePausedTasks(pausedTasks);

  // Increment metrics
  incrementMetric('tasks_resumed', task.agentId);

  // Log audit event
  logGovernorEvent(task.agentId, 'task_resumed', 'success', {
    taskId,
    pausedAt: task.pausedAt,
    resumedAt: task.resumedAt,
    humanResponse: typeof humanResponse === 'object' ? JSON.stringify(humanResponse) : humanResponse
  });

  console.log(`\n[TASK RESUMED] ${taskId}`);
  console.log(`   Human response received at: ${task.resumedAt}`);

  return {
    success: true,
    task,
    partialResult: task.partialResult,
    humanResponse: humanResponse
  };
}

/**
 * List all paused tasks awaiting human input
 * @returns {Array} Array of paused tasks with status 'awaiting_human'
 *
 * @example
 * const awaiting = listPausedTasks();
 * console.log(`${awaiting.length} tasks waiting for human input`);
 */
function listPausedTasks() {
  const pausedTasks = getPausedTasks();
  return pausedTasks.tasks.filter(t => t.status === 'awaiting_human');
}

/**
 * Check if a specific task is paused
 * @param {string} taskId - The task to check
 * @returns {boolean} True if task is paused and awaiting human input
 *
 * @example
 * if (isTaskPaused('TASK-123')) {
 *   console.log('Task is waiting for human input');
 * }
 */
function isTaskPaused(taskId) {
  const pausedTasks = getPausedTasks();
  const task = pausedTasks.tasks.find(t => t.taskId === taskId);
  return !!(task && task.status === 'awaiting_human');
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
  routeToVerifier,
  // STATUS_ABSTAIN Protocol functions
  checkConfidenceThreshold,
  handleAbstention,
  getAgentAbstentionStats,
  resolveAbstention,
  // Confidence scoring functions (MASTER_AGENTIC_IMPLEMENTATION_PLAN)
  evaluateConfidence,
  // Agent response wrapper functions (MASTER_AGENTIC_IMPLEMENTATION_PLAN)
  agentResponse,
  createAgentTask,
  // Tracing integration functions
  tracedGovernorEvent,
  tracedOperation,
  getTaskObservability,
  // Risk classification functions
  classifyTaskRisk,
  getRequiredApprovalLevel,
  canProceedWithRisk,
  classifyFileRisk,
  getRiskLevelsSummary,
  loadRiskConfig,
  // Agent folder mapping functions
  loadAgentFolderMapping,
  getAgentFolderName,
  getAgentSessionPath,
  getAgentNameFromFolder,
  getAgentInboxOutboxPaths,
  getAllAgentFolderMappings,
  // Human-on-the-Loop Pause/Resume functions
  getPausedTasks,
  savePausedTasks,
  pauseTaskForHuman,
  resumeTask,
  listPausedTasks,
  isTaskPaused,
  // Constants
  VALID_AGENTS,
  VALID_METRICS,
  VALID_ACTIONS,
  VALID_OUTCOMES,
  TASK_STATES,
  VALID_STATE_TRANSITIONS,
  PROOF_TYPES,
  // STATUS_ABSTAIN Constants
  STATUS_ABSTAIN,
  ABSTENTION_REASONS,
  DEFAULT_CONFIDENCE_THRESHOLD,
  // Confidence threshold constants (MASTER_AGENTIC_IMPLEMENTATION_PLAN)
  CONFIDENCE_THRESHOLDS,
  // Risk Classification Constants
  RISK_LEVELS,
  RISK_LEVEL_VALUES
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

    case 'route-to-verifier':
      // node governor_helpers.js route-to-verifier TASK-001 Backend_Claude '{"description":"API update completed","evidence":{"type":"test_output","content":"All tests pass"}}'
      const [, rtvTaskId, rtvAgent, rtvDetailsJson] = args;
      const rtvDetails = rtvDetailsJson ? JSON.parse(rtvDetailsJson) : {};
      console.log(JSON.stringify(routeToVerifier(rtvTaskId, rtvAgent, rtvDetails), null, 2));
      break;

    // ═══════════════════════════════════════════════════════════════════
    // STATUS_ABSTAIN PROTOCOL CLI COMMANDS
    // ═══════════════════════════════════════════════════════════════════

    case 'check-confidence':
      // node governor_helpers.js check-confidence 0.72 0.85
      const [, ccConfidence, ccThreshold] = args;
      const confValue = parseFloat(ccConfidence);
      const threshValue = ccThreshold ? parseFloat(ccThreshold) : DEFAULT_CONFIDENCE_THRESHOLD;
      console.log(JSON.stringify(checkConfidenceThreshold(confValue, threshValue), null, 2));
      break;

    case 'abstain':
      // node governor_helpers.js abstain Backend_Claude TASK-001 low_confidence '{"confidence":0.65,"explanation":"Missing context"}'
      const [, abAgent, abTaskId, abReason, abDetailsJson] = args;
      const abDetails = abDetailsJson ? JSON.parse(abDetailsJson) : {};
      console.log(JSON.stringify(handleAbstention(abAgent, abTaskId, abReason, abDetails), null, 2));
      break;

    case 'abstention-stats':
      // node governor_helpers.js abstention-stats Backend_Claude
      const [, asAgent] = args;
      console.log(JSON.stringify(getAgentAbstentionStats(asAgent), null, 2));
      break;

    case 'resolve-abstention':
      // node governor_helpers.js resolve-abstention PM_Architect ABSTAIN-TASK-001-123 "Reassigned with more context"
      const [, raResolver, raAbstentionId, raResolution] = args;
      console.log(JSON.stringify(resolveAbstention(raResolver, raAbstentionId, raResolution || ''), null, 2));
      break;

    case 'abstention-reasons':
      // node governor_helpers.js abstention-reasons
      console.log('Valid Abstention Reasons:', ABSTENTION_REASONS);
      console.log('\nDefault Confidence Threshold:', DEFAULT_CONFIDENCE_THRESHOLD);
      break;

    // ═══════════════════════════════════════════════════════════════════
    // RISK CLASSIFICATION CLI COMMANDS
    // ═══════════════════════════════════════════════════════════════════

    case 'classify-risk':
      // node governor_helpers.js classify-risk deploy_production production
      const [, crTaskType, crScope] = args;
      console.log(JSON.stringify(classifyTaskRisk(crTaskType, crScope || ''), null, 2));
      break;

    case 'classify-file-risk':
      // node governor_helpers.js classify-file-risk /config/credentials.json modify
      const [, cfrFilePath, cfrAction] = args;
      console.log(JSON.stringify(classifyFileRisk(cfrFilePath, cfrAction || 'modify'), null, 2));
      break;

    case 'can-proceed':
      // node governor_helpers.js can-proceed deploy production 80 false false
      const [, cpTaskType, cpScope, cpTrust, cpApproval, cpExplicit] = args;
      const trustLvl = parseFloat(cpTrust) || 50;
      const hasApproval = cpApproval === 'true';
      const hasExplicit = cpExplicit === 'true';
      console.log(JSON.stringify(canProceedWithRisk(cpTaskType, cpScope || '', trustLvl, hasApproval, hasExplicit), null, 2));
      break;

    case 'approval-level':
      // node governor_helpers.js approval-level HIGH
      const [, alRiskLevel] = args;
      console.log(JSON.stringify(getRequiredApprovalLevel(alRiskLevel), null, 2));
      break;

    case 'risk-levels':
      // node governor_helpers.js risk-levels
      console.log(JSON.stringify(getRiskLevelsSummary(), null, 2));
      break;

    case 'risk-config':
      // node governor_helpers.js risk-config
      const riskConfig = loadRiskConfig();
      if (riskConfig) {
        console.log(JSON.stringify(riskConfig, null, 2));
      } else {
        console.log('Error: Risk configuration not found');
      }
      break;

    // ═══════════════════════════════════════════════════════════════════
    // AGENT FOLDER MAPPING CLI COMMANDS
    // ═══════════════════════════════════════════════════════════════════

    case 'agent-folder':
      // node governor_helpers.js agent-folder Backend_Claude
      const [, afAgent] = args;
      console.log(JSON.stringify({
        agent: afAgent,
        folderName: getAgentFolderName(afAgent),
        fullPath: getAgentSessionPath(afAgent),
        ...getAgentInboxOutboxPaths(afAgent)
      }, null, 2));
      break;

    case 'folder-to-agent':
      // node governor_helpers.js folder-to-agent backend
      const [, ftaFolder] = args;
      const foundAgent = getAgentNameFromFolder(ftaFolder);
      console.log(JSON.stringify({
        folderName: ftaFolder,
        agentName: foundAgent,
        found: foundAgent !== null
      }, null, 2));
      break;

    case 'agent-mappings':
      // node governor_helpers.js agent-mappings
      console.log(JSON.stringify(getAllAgentFolderMappings(), null, 2));
      break;

    case 'agent-inbox':
      // node governor_helpers.js agent-inbox Backend_Claude
      const [, aiAgent] = args;
      const aiPaths = getAgentInboxOutboxPaths(aiAgent);
      console.log(JSON.stringify({
        agent: aiAgent,
        ...aiPaths
      }, null, 2));
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

  route-to-verifier <task_id> <agent> [details_json]
    Route a task to Verifier_Claude for verification
    Automatically called when transitioning to AWAITING_VERIFICATION
    Example: node governor_helpers.js route-to-verifier TASK-001 Backend_Claude '{"description":"API update completed","evidence":{"type":"test_output","content":"All tests pass"}}'

═══════════════════════════════════════════════════════════════════════════
STATUS_ABSTAIN PROTOCOL COMMANDS
═══════════════════════════════════════════════════════════════════════════

  check-confidence <confidence> [threshold]
    Check if confidence meets threshold (default 0.85)
    KEY RULE: Abstaining is better than low-confidence execution
    Example: node governor_helpers.js check-confidence 0.72 0.85

  abstain <agent> <task_id> <reason> [details_json]
    Handle an agent abstention from a task
    Reasons: low_confidence, missing_context, ethical_concern, out_of_scope, conflicting_instructions, requires_human
    Example: node governor_helpers.js abstain Backend_Claude TASK-001 low_confidence '{"confidence":0.65,"explanation":"Missing context"}'

  abstention-stats <agent>
    Get abstention statistics for an agent
    Example: node governor_helpers.js abstention-stats Backend_Claude

  resolve-abstention <resolver> <abstention_id> [resolution]
    Resolve an abstention (mark as handled)
    Example: node governor_helpers.js resolve-abstention PM_Architect ABSTAIN-TASK-001-123 "Reassigned"

  abstention-reasons
    Display valid abstention reasons and default threshold
    Example: node governor_helpers.js abstention-reasons

═══════════════════════════════════════════════════════════════════════════
RISK CLASSIFICATION COMMANDS
═══════════════════════════════════════════════════════════════════════════

  classify-risk <task_type> [scope]
    Classify the risk level of a task
    Example: node governor_helpers.js classify-risk deploy_production production

  classify-file-risk <file_path> [action]
    Classify risk from a file path (action: create, modify, delete)
    Example: node governor_helpers.js classify-file-risk /config/credentials.json modify

  can-proceed <task_type> <scope> <trust_level> <has_approval> <has_explicit>
    Check if a task can proceed based on risk and trust
    Example: node governor_helpers.js can-proceed deploy production 80 false false

  approval-level <risk_level>
    Get approval requirements for a risk level
    Example: node governor_helpers.js approval-level HIGH

  risk-levels
    Display summary of all risk levels and their requirements
    Example: node governor_helpers.js risk-levels

  risk-config
    Display the full risk classification configuration
    Example: node governor_helpers.js risk-config

═══════════════════════════════════════════════════════════════════════════
AGENT FOLDER MAPPING COMMANDS
═══════════════════════════════════════════════════════════════════════════

  agent-folder <agent_name>
    Get the folder path for an agent
    Example: node governor_helpers.js agent-folder Backend_Claude
    Returns: { agent, folderName, fullPath, inboxPath, outboxPath }

  folder-to-agent <folder_name>
    Get the agent name from a folder name (reverse lookup)
    Example: node governor_helpers.js folder-to-agent backend
    Returns: { folderName, agentName, found }

  agent-mappings
    Get all agent-to-folder mappings
    Example: node governor_helpers.js agent-mappings
    Returns: { mapping, reverse_mapping, source }

  agent-inbox <agent_name>
    Get INBOX and OUTBOX paths for an agent
    Example: node governor_helpers.js agent-inbox Backend_Claude
    Returns: { agent, inboxPath, outboxPath }

═══════════════════════════════════════════════════════════════════════════
AGENT FOLDER MAPPING REFERENCE
═══════════════════════════════════════════════════════════════════════════

  PM_Architect     → pm_architect
  Backend_Claude   → backend
  Desktop_Claude   → desktop_web
  Mobile_Claude    → mobile_app
  UX_Design_Claude → ux_design
  Sales_Claude     → sales_crm
  Security_Claude  → security
  Verifier_Claude  → verifier_claude
  Critic_Claude    → critic_claude

═══════════════════════════════════════════════════════════════════════════
RISK LEVEL ROUTING
═══════════════════════════════════════════════════════════════════════════

  LOW      → Can proceed autonomously at Trust >= 25%
  MEDIUM   → Requires verification at Trust >= 50%
  HIGH     → ALWAYS requires human approval
  CRITICAL → ALWAYS requires explicit human command

═══════════════════════════════════════════════════════════════════════════
TASK STATE FLOW (with ABSTAINED state)
═══════════════════════════════════════════════════════════════════════════

  PENDING → IN_PROGRESS → IMPLEMENTED → AWAITING_VERIFICATION → VERIFIED → DONE
     ↓          ↓
  ABSTAINED ← ←←  (Agent can abstain from PENDING or IN_PROGRESS)

  - IMPLEMENTED cannot skip to DONE (must go through verification)
  - AWAITING_VERIFICATION can go back to IMPLEMENTED (if fixes needed)
  - Only VERIFIED can transition to DONE
  - ABSTAINED can return to PENDING (reassign) or IN_PROGRESS (resume)
      `);
  }
}
