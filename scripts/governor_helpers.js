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
  'pre_flight_failures'
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
  'error_budget_exceeded'
];

// Valid outcomes
const VALID_OUTCOMES = [
  'success',
  'failure',
  'pending',
  'escalated',
  'rolled_back'
];

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

// Export functions for use in other scripts
module.exports = {
  logGovernorEvent,
  incrementMetric,
  checkErrorBudget,
  getAgentPerformance,
  getRecentEvents,
  resetErrorBudgets,
  getAllAgentsSummary,
  VALID_AGENTS,
  VALID_METRICS,
  VALID_ACTIONS,
  VALID_OUTCOMES
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

    default:
      console.log(`
Governor Helper Functions CLI

Usage:
  node governor_helpers.js <command> [options]

Commands:
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
      `);
  }
}
