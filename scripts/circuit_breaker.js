/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CIRCUIT BREAKER FOR TINY SEED OS AGENT SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements failure-based and behavioral circuit breakers to prevent
 * cascading failures in the agent system.
 *
 * Circuit Breaker States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failing, rejecting all requests
 * - HALF_OPEN: Testing if service recovered with limited requests
 *
 * Triggers that trip the breaker:
 * 1. 5 consecutive failures
 * 2. 50% error rate in last 10 tasks
 * 3. Repeated same action 3+ times consecutively
 * 4. Resource exhaustion (token limit)
 *
 * Recovery:
 * - Automatic reset after cooldown period (configurable)
 * - Manual reset via CLI
 * - HALF_OPEN state allows single test request
 *
 * Usage:
 *   const { checkCircuitBreaker, tripCircuitBreaker, resetCircuitBreaker } = require('./circuit_breaker');
 *   const status = checkCircuitBreaker('Backend_Claude');
 *   if (!status.canProceed) {
 *     console.log('Circuit is open:', status.message);
 *   }
 *
 * CLI Usage:
 *   node scripts/circuit_breaker.js status Backend_Claude
 *   node scripts/circuit_breaker.js reset Backend_Claude
 *   node scripts/circuit_breaker.js trip Backend_Claude --reason="manual"
 *
 * Created: 2026-02-12
 * Part of: Failure Prevention Implementation Plan
 * ═══════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

// File paths
const TINYPM_DIR = path.join(__dirname, '..', 'tinypm');
const BREAKER_STATE_FILE = path.join(TINYPM_DIR, '.circuit_breaker_state.json');
const GOVERNOR_HELPERS = path.join(__dirname, 'governor_helpers.js');

// Load governor helpers if available (for logging)
let governorHelpers = null;
try {
  governorHelpers = require(GOVERNOR_HELPERS);
} catch (e) {
  console.warn('Warning: Governor helpers not available for circuit breaker logging');
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Circuit breaker states
 */
const CircuitState = {
  CLOSED: 'CLOSED',      // Normal operation
  OPEN: 'OPEN',          // Failing, rejecting requests
  HALF_OPEN: 'HALF_OPEN' // Testing if service recovered
};

/**
 * Configuration thresholds
 * These can be overridden per-agent if needed
 */
const DEFAULT_THRESHOLDS = {
  failure_threshold: 5,           // Consecutive failures before opening circuit
  recovery_timeout_ms: 60000,     // 1 minute before testing recovery
  half_open_success_threshold: 3, // Successes needed to close from half-open
  max_iterations: 30,             // LangChain-style iteration limit
  max_execution_time_ms: 120000,  // 2 minute timeout
  repeated_action_limit: 3,       // Same action limit before trip
  error_rate_threshold: 0.5,      // 50% error rate
  error_rate_window: 10,          // Last N tasks to check for error rate
  token_limit_warning: 80000,     // Token usage warning threshold
  token_limit_trip: 100000        // Token usage trip threshold
};

/**
 * Valid agent names (aligned with governor_helpers.js)
 */
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

// ═══════════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Read circuit breaker state from file
 * @returns {object} Current state for all agents
 */
function readState() {
  try {
    if (fs.existsSync(BREAKER_STATE_FILE)) {
      const content = fs.readFileSync(BREAKER_STATE_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error reading circuit breaker state:', error.message);
  }

  // Return default state structure
  return {
    version: '1.0',
    created: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    agents: {}
  };
}

/**
 * Write circuit breaker state to file
 * @param {object} state - State to save
 * @returns {boolean} Success status
 */
function writeState(state) {
  try {
    state.last_updated = new Date().toISOString();
    fs.writeFileSync(BREAKER_STATE_FILE, JSON.stringify(state, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing circuit breaker state:', error.message);
    return false;
  }
}

/**
 * Get or initialize agent state
 * @param {object} state - Full state object
 * @param {string} agentId - Agent identifier
 * @returns {object} Agent-specific state
 */
function getAgentState(state, agentId) {
  if (!state.agents[agentId]) {
    state.agents[agentId] = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      tripReason: null,
      actionHistory: [],
      recentResults: [],
      tokenUsage: 0,
      thresholds: { ...DEFAULT_THRESHOLDS }
    };
  }
  return state.agents[agentId];
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE CIRCUIT BREAKER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if an agent's circuit breaker allows proceeding
 *
 * @param {string} agentId - Agent identifier
 * @returns {object} Status with canProceed flag, state, and message
 *
 * @example
 * const status = checkCircuitBreaker('Backend_Claude');
 * if (!status.canProceed) {
 *   console.log('Cannot proceed:', status.message);
 * }
 */
function checkCircuitBreaker(agentId) {
  const state = readState();
  const agentState = getAgentState(state, agentId);

  const result = {
    canProceed: false,
    state: agentState.state,
    agentId: agentId,
    message: '',
    details: {}
  };

  // CLOSED state - normal operation
  if (agentState.state === CircuitState.CLOSED) {
    result.canProceed = true;
    result.message = 'Circuit CLOSED - proceed normally';
    result.details = {
      failureCount: agentState.failureCount,
      threshold: agentState.thresholds.failure_threshold
    };
    return result;
  }

  // OPEN state - check if recovery timeout has elapsed
  if (agentState.state === CircuitState.OPEN) {
    const now = Date.now();
    const lastFailure = agentState.lastFailureTime ? new Date(agentState.lastFailureTime).getTime() : now;
    const elapsed = now - lastFailure;
    const recoveryTimeout = agentState.thresholds.recovery_timeout_ms;

    if (elapsed >= recoveryTimeout) {
      // Transition to HALF_OPEN
      agentState.state = CircuitState.HALF_OPEN;
      agentState.successCount = 0;
      writeState(state);

      logCircuitEvent(agentId, 'circuit_half_open', 'pending', {
        previousState: CircuitState.OPEN,
        elapsed: elapsed,
        reason: 'Recovery timeout elapsed'
      });

      result.canProceed = true;
      result.state = CircuitState.HALF_OPEN;
      result.message = 'Circuit HALF_OPEN - testing recovery with single request';
      result.details = {
        testingRecovery: true,
        successesNeeded: agentState.thresholds.half_open_success_threshold
      };
      return result;
    }

    // Still in recovery timeout
    const remainingMs = recoveryTimeout - elapsed;
    const remainingSec = Math.ceil(remainingMs / 1000);

    result.canProceed = false;
    result.message = `Circuit OPEN - wait ${remainingSec}s for recovery test`;
    result.details = {
      tripReason: agentState.tripReason,
      waitTimeSeconds: remainingSec,
      lastFailureTime: agentState.lastFailureTime
    };
    return result;
  }

  // HALF_OPEN state - allow single test request
  if (agentState.state === CircuitState.HALF_OPEN) {
    result.canProceed = true;
    result.message = 'Circuit HALF_OPEN - test request allowed';
    result.details = {
      currentSuccesses: agentState.successCount,
      successesNeeded: agentState.thresholds.half_open_success_threshold
    };
    return result;
  }

  // Unknown state
  result.canProceed = false;
  result.message = `Unknown circuit state: ${agentState.state}`;
  return result;
}

/**
 * Trip the circuit breaker for an agent
 *
 * @param {string} agentId - Agent identifier
 * @param {string} reason - Reason for tripping
 * @param {object} details - Additional details
 * @returns {object} Result with success status
 *
 * @example
 * tripCircuitBreaker('Backend_Claude', 'consecutive_failures', { count: 5 });
 */
function tripCircuitBreaker(agentId, reason, details = {}) {
  const state = readState();
  const agentState = getAgentState(state, agentId);

  const previousState = agentState.state;

  // Trip the breaker
  agentState.state = CircuitState.OPEN;
  agentState.lastFailureTime = new Date().toISOString();
  agentState.tripReason = reason;
  agentState.successCount = 0;

  writeState(state);

  // Log the event
  logCircuitEvent(agentId, 'circuit_breaker_tripped', 'failure', {
    previousState: previousState,
    reason: reason,
    ...details
  });

  console.log(`[CircuitBreaker] ${agentId}: Circuit OPEN - ${reason}`);

  return {
    success: true,
    agentId: agentId,
    previousState: previousState,
    newState: CircuitState.OPEN,
    reason: reason,
    recoveryTimeoutMs: agentState.thresholds.recovery_timeout_ms
  };
}

/**
 * Reset the circuit breaker for an agent (manual recovery)
 *
 * @param {string} agentId - Agent identifier
 * @param {string} resetBy - Who/what initiated the reset
 * @returns {object} Result with success status
 *
 * @example
 * resetCircuitBreaker('Backend_Claude', 'human_operator');
 */
function resetCircuitBreaker(agentId, resetBy = 'manual') {
  const state = readState();
  const agentState = getAgentState(state, agentId);

  const previousState = agentState.state;

  // Reset everything
  agentState.state = CircuitState.CLOSED;
  agentState.failureCount = 0;
  agentState.successCount = 0;
  agentState.lastFailureTime = null;
  agentState.tripReason = null;
  agentState.actionHistory = [];
  agentState.recentResults = [];
  agentState.tokenUsage = 0;

  writeState(state);

  // Log the event
  logCircuitEvent(agentId, 'circuit_breaker_reset', 'success', {
    previousState: previousState,
    resetBy: resetBy
  });

  console.log(`[CircuitBreaker] ${agentId}: Circuit RESET to CLOSED by ${resetBy}`);

  return {
    success: true,
    agentId: agentId,
    previousState: previousState,
    newState: CircuitState.CLOSED,
    resetBy: resetBy,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get the current circuit breaker state for an agent
 *
 * @param {string} agentId - Agent identifier
 * @returns {object} Current state details
 */
function getCircuitBreakerState(agentId) {
  const state = readState();
  const agentState = getAgentState(state, agentId);

  // Calculate error rate
  const errorRate = calculateErrorRate(agentState);

  // Check time remaining if OPEN
  let timeRemaining = null;
  if (agentState.state === CircuitState.OPEN && agentState.lastFailureTime) {
    const now = Date.now();
    const lastFailure = new Date(agentState.lastFailureTime).getTime();
    const elapsed = now - lastFailure;
    const remaining = agentState.thresholds.recovery_timeout_ms - elapsed;
    timeRemaining = remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }

  return {
    agentId: agentId,
    state: agentState.state,
    failureCount: agentState.failureCount,
    successCount: agentState.successCount,
    lastFailureTime: agentState.lastFailureTime,
    lastSuccessTime: agentState.lastSuccessTime,
    tripReason: agentState.tripReason,
    errorRate: errorRate,
    recentResultsCount: agentState.recentResults.length,
    actionHistoryCount: agentState.actionHistory.length,
    tokenUsage: agentState.tokenUsage,
    timeRemainingSeconds: timeRemaining,
    thresholds: agentState.thresholds
  };
}

/**
 * Record a successful operation for an agent
 *
 * @param {string} agentId - Agent identifier
 * @param {object} details - Operation details
 * @returns {object} Updated state
 */
function recordSuccess(agentId, details = {}) {
  const state = readState();
  const agentState = getAgentState(state, agentId);

  const now = new Date().toISOString();

  // Record success
  agentState.recentResults.push({
    success: true,
    timestamp: now,
    details: details
  });

  // Keep only recent results
  cleanRecentResults(agentState);

  agentState.lastSuccessTime = now;

  // Handle state transitions
  if (agentState.state === CircuitState.HALF_OPEN) {
    agentState.successCount++;

    if (agentState.successCount >= agentState.thresholds.half_open_success_threshold) {
      // Recovery successful - close circuit
      agentState.state = CircuitState.CLOSED;
      agentState.failureCount = 0;
      agentState.successCount = 0;
      agentState.tripReason = null;

      logCircuitEvent(agentId, 'circuit_breaker_recovered', 'success', {
        previousState: CircuitState.HALF_OPEN,
        successesAchieved: agentState.thresholds.half_open_success_threshold
      });

      console.log(`[CircuitBreaker] ${agentId}: Circuit CLOSED - recovery successful`);
    }
  } else if (agentState.state === CircuitState.CLOSED) {
    // Reset failure count on success in closed state
    agentState.failureCount = 0;
  }

  writeState(state);

  return {
    success: true,
    agentId: agentId,
    state: agentState.state,
    successCount: agentState.successCount,
    failureCount: agentState.failureCount
  };
}

/**
 * Record a failed operation for an agent
 *
 * @param {string} agentId - Agent identifier
 * @param {string} errorType - Type of error
 * @param {object} details - Error details
 * @returns {object} Updated state with potential trip
 */
function recordFailure(agentId, errorType = 'unknown', details = {}) {
  const state = readState();
  const agentState = getAgentState(state, agentId);

  const now = new Date().toISOString();

  // Record failure
  agentState.recentResults.push({
    success: false,
    timestamp: now,
    errorType: errorType,
    details: details
  });

  // Keep only recent results
  cleanRecentResults(agentState);

  agentState.failureCount++;
  agentState.lastFailureTime = now;

  const result = {
    agentId: agentId,
    failureCount: agentState.failureCount,
    errorType: errorType,
    tripped: false,
    tripReason: null
  };

  // Check for trip conditions
  if (agentState.state === CircuitState.HALF_OPEN) {
    // Failed during recovery test - trip back to open
    agentState.state = CircuitState.OPEN;
    agentState.successCount = 0;
    result.tripped = true;
    result.tripReason = 'recovery_test_failed';

    logCircuitEvent(agentId, 'circuit_breaker_tripped', 'failure', {
      reason: 'recovery_test_failed',
      errorType: errorType
    });

    console.log(`[CircuitBreaker] ${agentId}: Circuit OPEN - recovery test failed`);
  } else if (agentState.state === CircuitState.CLOSED) {
    // Check consecutive failure threshold
    if (agentState.failureCount >= agentState.thresholds.failure_threshold) {
      agentState.state = CircuitState.OPEN;
      agentState.tripReason = 'consecutive_failures';
      result.tripped = true;
      result.tripReason = 'consecutive_failures';

      logCircuitEvent(agentId, 'circuit_breaker_tripped', 'failure', {
        reason: 'consecutive_failures',
        failureCount: agentState.failureCount,
        threshold: agentState.thresholds.failure_threshold
      });

      console.log(`[CircuitBreaker] ${agentId}: Circuit OPEN - ${agentState.failureCount} consecutive failures`);
    }

    // Check error rate threshold
    const errorRate = calculateErrorRate(agentState);
    if (errorRate > agentState.thresholds.error_rate_threshold &&
        agentState.recentResults.length >= agentState.thresholds.error_rate_window) {
      agentState.state = CircuitState.OPEN;
      agentState.tripReason = 'error_rate_exceeded';
      result.tripped = true;
      result.tripReason = 'error_rate_exceeded';
      result.errorRate = errorRate;

      logCircuitEvent(agentId, 'circuit_breaker_tripped', 'failure', {
        reason: 'error_rate_exceeded',
        errorRate: errorRate,
        threshold: agentState.thresholds.error_rate_threshold
      });

      console.log(`[CircuitBreaker] ${agentId}: Circuit OPEN - error rate ${(errorRate * 100).toFixed(1)}%`);
    }
  }

  result.state = agentState.state;
  writeState(state);

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// BEHAVIORAL CIRCUIT BREAKER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check for behavioral patterns that should trip the breaker
 *
 * @param {string} agentId - Agent identifier
 * @param {object} action - Action being attempted
 * @returns {object} Result with blocked flag and reason
 *
 * @example
 * const check = checkBehavioralPattern('Backend_Claude', { type: 'file_modify', path: '/apps_script/test.js' });
 * if (check.blocked) {
 *   console.log('Blocked:', check.reason);
 * }
 */
function checkBehavioralPattern(agentId, action) {
  const state = readState();
  const agentState = getAgentState(state, agentId);

  const actionString = JSON.stringify(action);
  const now = new Date().toISOString();

  // Add to action history
  agentState.actionHistory.push({
    action: actionString,
    timestamp: now
  });

  // Keep only last 10 actions
  if (agentState.actionHistory.length > 10) {
    agentState.actionHistory = agentState.actionHistory.slice(-10);
  }

  const result = {
    blocked: false,
    reason: null,
    pattern: null
  };

  // Check for repeated same action
  const limit = agentState.thresholds.repeated_action_limit;
  if (agentState.actionHistory.length >= limit) {
    const lastN = agentState.actionHistory.slice(-limit);
    const allSame = lastN.every(a => a.action === lastN[0].action);

    if (allSame) {
      // Trip the breaker
      agentState.state = CircuitState.OPEN;
      agentState.lastFailureTime = now;
      agentState.tripReason = 'repeated_same_action';

      result.blocked = true;
      result.reason = `Repeated same action ${limit} times consecutively`;
      result.pattern = 'REPEATED_SAME_ACTION';

      logCircuitEvent(agentId, 'circuit_breaker_tripped', 'failure', {
        reason: 'repeated_same_action',
        pattern: 'REPEATED_SAME_ACTION',
        actionCount: limit
      });

      console.log(`[CircuitBreaker] ${agentId}: Circuit OPEN - repeated same action ${limit} times`);
    }
  }

  writeState(state);
  return result;
}

/**
 * Record token usage and check for resource exhaustion
 *
 * @param {string} agentId - Agent identifier
 * @param {number} tokens - Token count used
 * @returns {object} Result with warning/trip status
 */
function recordTokenUsage(agentId, tokens) {
  const state = readState();
  const agentState = getAgentState(state, agentId);

  agentState.tokenUsage = (agentState.tokenUsage || 0) + tokens;

  const result = {
    agentId: agentId,
    totalTokens: agentState.tokenUsage,
    warning: false,
    tripped: false
  };

  // Check warning threshold
  if (agentState.tokenUsage >= agentState.thresholds.token_limit_warning &&
      agentState.tokenUsage < agentState.thresholds.token_limit_trip) {
    result.warning = true;
    result.message = `Token usage at ${agentState.tokenUsage} - approaching limit`;

    logCircuitEvent(agentId, 'token_usage_warning', 'pending', {
      tokenUsage: agentState.tokenUsage,
      warningThreshold: agentState.thresholds.token_limit_warning
    });
  }

  // Check trip threshold
  if (agentState.tokenUsage >= agentState.thresholds.token_limit_trip) {
    agentState.state = CircuitState.OPEN;
    agentState.lastFailureTime = new Date().toISOString();
    agentState.tripReason = 'token_limit_exceeded';

    result.tripped = true;
    result.message = `Token limit exceeded: ${agentState.tokenUsage} tokens`;

    logCircuitEvent(agentId, 'circuit_breaker_tripped', 'failure', {
      reason: 'token_limit_exceeded',
      tokenUsage: agentState.tokenUsage,
      limit: agentState.thresholds.token_limit_trip
    });

    console.log(`[CircuitBreaker] ${agentId}: Circuit OPEN - token limit exceeded (${agentState.tokenUsage})`);
  }

  writeState(state);
  return result;
}

/**
 * Reset token usage counter (typically at session start)
 *
 * @param {string} agentId - Agent identifier
 * @returns {object} Result
 */
function resetTokenUsage(agentId) {
  const state = readState();
  const agentState = getAgentState(state, agentId);

  const previousUsage = agentState.tokenUsage;
  agentState.tokenUsage = 0;

  writeState(state);

  return {
    success: true,
    agentId: agentId,
    previousUsage: previousUsage,
    newUsage: 0
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate error rate from recent results
 * @param {object} agentState - Agent state object
 * @returns {number} Error rate (0-1)
 */
function calculateErrorRate(agentState) {
  const results = agentState.recentResults || [];
  if (results.length === 0) return 0;

  const failures = results.filter(r => !r.success).length;
  return failures / results.length;
}

/**
 * Clean old results from the window
 * @param {object} agentState - Agent state object
 */
function cleanRecentResults(agentState) {
  // Keep only last N results
  const window = agentState.thresholds.error_rate_window || 10;
  if (agentState.recentResults.length > window) {
    agentState.recentResults = agentState.recentResults.slice(-window);
  }
}

/**
 * Log a circuit breaker event to the governor system
 * @param {string} agentId - Agent identifier
 * @param {string} action - Action type
 * @param {string} outcome - Outcome
 * @param {object} details - Additional details
 */
function logCircuitEvent(agentId, action, outcome, details = {}) {
  if (governorHelpers && governorHelpers.logGovernorEvent) {
    try {
      governorHelpers.logGovernorEvent(agentId, action, outcome, {
        source: 'circuit_breaker',
        ...details
      });
    } catch (e) {
      console.warn('Failed to log circuit event to governor:', e.message);
    }
  }
}

/**
 * Get status of all agents
 * @returns {object} Summary of all circuit breakers
 */
function getAllCircuitBreakerStatus() {
  const state = readState();

  const summary = {
    timestamp: new Date().toISOString(),
    totalAgents: Object.keys(state.agents).length,
    openCircuits: 0,
    halfOpenCircuits: 0,
    closedCircuits: 0,
    agents: {}
  };

  for (const agentId of Object.keys(state.agents)) {
    const agentState = state.agents[agentId];
    summary.agents[agentId] = {
      state: agentState.state,
      failureCount: agentState.failureCount,
      tripReason: agentState.tripReason
    };

    if (agentState.state === CircuitState.OPEN) summary.openCircuits++;
    else if (agentState.state === CircuitState.HALF_OPEN) summary.halfOpenCircuits++;
    else summary.closedCircuits++;
  }

  return summary;
}

/**
 * Reset all circuit breakers (emergency function)
 * @param {string} resetBy - Who initiated the reset
 * @returns {object} Result
 */
function resetAllCircuitBreakers(resetBy = 'emergency') {
  const state = readState();
  const previousStates = {};

  for (const agentId of Object.keys(state.agents)) {
    previousStates[agentId] = state.agents[agentId].state;

    state.agents[agentId] = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      tripReason: null,
      actionHistory: [],
      recentResults: [],
      tokenUsage: 0,
      thresholds: { ...DEFAULT_THRESHOLDS }
    };
  }

  writeState(state);

  logCircuitEvent('PM_Architect', 'circuit_breaker_reset_all', 'success', {
    resetBy: resetBy,
    previousStates: previousStates
  });

  console.log(`[CircuitBreaker] All circuits RESET by ${resetBy}`);

  return {
    success: true,
    resetBy: resetBy,
    agentsReset: Object.keys(previousStates),
    previousStates: previousStates,
    timestamp: new Date().toISOString()
  };
}

/**
 * Configure thresholds for a specific agent
 * @param {string} agentId - Agent identifier
 * @param {object} thresholds - New threshold values
 * @returns {object} Result
 */
function configureThresholds(agentId, thresholds) {
  const state = readState();
  const agentState = getAgentState(state, agentId);

  const previousThresholds = { ...agentState.thresholds };

  // Merge new thresholds
  agentState.thresholds = {
    ...agentState.thresholds,
    ...thresholds
  };

  writeState(state);

  return {
    success: true,
    agentId: agentId,
    previousThresholds: previousThresholds,
    newThresholds: agentState.thresholds
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Core functions
  checkCircuitBreaker,
  tripCircuitBreaker,
  resetCircuitBreaker,
  getCircuitBreakerState,
  recordSuccess,
  recordFailure,

  // Behavioral functions
  checkBehavioralPattern,
  recordTokenUsage,
  resetTokenUsage,

  // Management functions
  getAllCircuitBreakerStatus,
  resetAllCircuitBreakers,
  configureThresholds,

  // Constants
  CircuitState,
  DEFAULT_THRESHOLDS,
  VALID_AGENTS
};

// ═══════════════════════════════════════════════════════════════════════════
// CLI INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const agentId = args[1];

  // Parse flags
  const flags = {};
  for (let i = 2; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const [key, value] = args[i].substring(2).split('=');
      flags[key] = value || true;
    }
  }

  switch (command) {
    case 'status':
      if (agentId) {
        console.log(JSON.stringify(getCircuitBreakerState(agentId), null, 2));
      } else {
        console.log(JSON.stringify(getAllCircuitBreakerStatus(), null, 2));
      }
      break;

    case 'check':
      if (!agentId) {
        console.error('Error: Agent ID required');
        process.exit(1);
      }
      console.log(JSON.stringify(checkCircuitBreaker(agentId), null, 2));
      break;

    case 'reset':
      if (agentId === 'all' || agentId === '--all') {
        console.log(JSON.stringify(resetAllCircuitBreakers(flags.by || 'cli'), null, 2));
      } else if (agentId) {
        console.log(JSON.stringify(resetCircuitBreaker(agentId, flags.by || 'cli'), null, 2));
      } else {
        console.error('Error: Agent ID required (or use "all" to reset all)');
        process.exit(1);
      }
      break;

    case 'trip':
      if (!agentId) {
        console.error('Error: Agent ID required');
        process.exit(1);
      }
      const reason = flags.reason || 'manual';
      console.log(JSON.stringify(tripCircuitBreaker(agentId, reason), null, 2));
      break;

    case 'test-failure':
      if (!agentId) {
        console.error('Error: Agent ID required');
        process.exit(1);
      }
      console.log(JSON.stringify(recordFailure(agentId, flags.type || 'test'), null, 2));
      break;

    case 'test-success':
      if (!agentId) {
        console.error('Error: Agent ID required');
        process.exit(1);
      }
      console.log(JSON.stringify(recordSuccess(agentId), null, 2));
      break;

    case 'configure':
      if (!agentId) {
        console.error('Error: Agent ID required');
        process.exit(1);
      }
      const newThresholds = {};
      for (const [key, value] of Object.entries(flags)) {
        if (key !== 'reason' && key !== 'by') {
          newThresholds[key] = parseInt(value, 10) || value;
        }
      }
      console.log(JSON.stringify(configureThresholds(agentId, newThresholds), null, 2));
      break;

    default:
      console.log(`
Circuit Breaker CLI for Tiny Seed OS

Usage:
  node circuit_breaker.js <command> [agent_id] [options]

Commands:
  status [agent_id]      Show status (single agent or all if no ID)
  check <agent_id>       Check if agent can proceed
  reset <agent_id>       Reset circuit breaker for agent (or "all" for all)
  trip <agent_id>        Manually trip the circuit breaker
  test-failure <id>      Record a test failure
  test-success <id>      Record a test success
  configure <id>         Configure thresholds

Options:
  --reason=<reason>      Reason for trip (default: "manual")
  --by=<who>             Who/what initiated reset (default: "cli")
  --type=<type>          Error type for test-failure

Threshold Options (for configure):
  --failure_threshold=N           Consecutive failures before trip (default: 5)
  --recovery_timeout_ms=N         Recovery timeout in ms (default: 60000)
  --half_open_success_threshold=N Successes needed in HALF_OPEN (default: 3)
  --repeated_action_limit=N       Same action limit (default: 3)
  --error_rate_threshold=N        Error rate threshold 0-1 (default: 0.5)

Examples:
  node circuit_breaker.js status Backend_Claude
  node circuit_breaker.js check Backend_Claude
  node circuit_breaker.js trip Backend_Claude --reason="exceeded_token_limit"
  node circuit_breaker.js reset Backend_Claude --by="human_operator"
  node circuit_breaker.js reset all
  node circuit_breaker.js configure Backend_Claude --failure_threshold=3

Circuit States:
  CLOSED    - Normal operation
  OPEN      - Failing, rejecting requests until recovery timeout
  HALF_OPEN - Testing recovery with limited requests
      `);
  }
}
