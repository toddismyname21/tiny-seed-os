/**
 * ============================================================================
 * OPENTELEMETRY-STYLE AGENT TRACING
 * ============================================================================
 *
 * Provides distributed tracing for agent observability using OpenTelemetry-
 * compatible trace format. Tracks agent decisions, tool calls, confidence
 * scores, and outcomes.
 *
 * Usage:
 *   const tracing = require('./agent_tracing');
 *   const spanId = tracing.startSpan('processTask', 'Backend_Claude', 'TASK-001');
 *   tracing.logEvent(spanId, 'decision_made', { decision: 'approve', confidence: 95 });
 *   tracing.endSpan(spanId, 'OK', { result: 'success' });
 *
 * CLI Usage:
 *   node scripts/agent_tracing.js view <taskId>
 *   node scripts/agent_tracing.js export <taskId> --format=json
 *   node scripts/agent_tracing.js list
 *   node scripts/agent_tracing.js clear [--older-than=7d]
 *
 * Created: 2026-02-12
 * Part of: Agentic Performance Improvement Plan
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

// File paths
const TINYPM_DIR = path.join(__dirname, '..', 'tinypm');
const TRACES_DIR = path.join(TINYPM_DIR, '.traces');

// Ensure traces directory exists
if (!fs.existsSync(TRACES_DIR)) {
  fs.mkdirSync(TRACES_DIR, { recursive: true });
}

// In-memory span cache for active spans
const activeSpans = new Map();

// Valid span statuses (OpenTelemetry-compatible)
const SPAN_STATUS = {
  UNSET: 'UNSET',
  OK: 'OK',
  ERROR: 'ERROR',
  ABSTAINED: 'ABSTAINED'  // Custom status for agent abstention
};

// Valid event types for logging
const EVENT_TYPES = [
  'decision_made',
  'tool_call_started',
  'tool_call_completed',
  'tool_call_failed',
  'confidence_score',
  'verification_check',
  'escalation',
  'approval_requested',
  'approval_received',
  'state_transition',
  'error',
  'warning',
  'info',
  'governor_event'
];

/**
 * Generate a UUID v4
 * @returns {string} UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a shorter span ID (16 hex characters like OpenTelemetry)
 * @returns {string} Span ID
 */
function generateSpanId() {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Get the trace file path for a task
 * @param {string} taskId - Task identifier
 * @returns {string} Full file path
 */
function getTraceFilePath(taskId) {
  const sanitizedId = taskId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(TRACES_DIR, `${sanitizedId}.trace.json`);
}

/**
 * Read a trace file
 * @param {string} taskId - Task identifier
 * @returns {object|null} Trace data or null if not found
 */
function readTraceFile(taskId) {
  const filePath = getTraceFilePath(taskId);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`Error reading trace file for ${taskId}:`, error.message);
  }
  return null;
}

/**
 * Write a trace file
 * @param {string} taskId - Task identifier
 * @param {object} trace - Trace data
 * @returns {boolean} Success status
 */
function writeTraceFile(taskId, trace) {
  const filePath = getTraceFilePath(taskId);
  try {
    fs.writeFileSync(filePath, JSON.stringify(trace, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing trace file for ${taskId}:`, error.message);
    return false;
  }
}

/**
 * Get or create a trace for a task
 * @param {string} taskId - Task identifier
 * @returns {object} Trace object
 */
function getOrCreateTrace(taskId) {
  let trace = readTraceFile(taskId);
  if (!trace) {
    trace = {
      traceId: generateUUID(),
      taskId: taskId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      spans: [],
      metadata: {}
    };
    writeTraceFile(taskId, trace);
  }
  return trace;
}

/**
 * Start a new span for an operation
 *
 * @param {string} operationName - Name of the operation being traced
 * @param {string} agentId - Agent performing the operation
 * @param {string} taskId - Task identifier (creates/updates trace file)
 * @param {object} options - Optional span configuration
 * @param {string} options.parentSpanId - Parent span ID for nested spans
 * @param {object} options.attributes - Initial attributes
 * @returns {string} Span ID
 *
 * @example
 * const spanId = startSpan('validateInput', 'Backend_Claude', 'TASK-001');
 */
function startSpan(operationName, agentId, taskId, options = {}) {
  const spanId = generateSpanId();
  const startTime = new Date().toISOString();

  // Get or create the trace
  const trace = getOrCreateTrace(taskId);

  // Create the span object
  const span = {
    spanId: spanId,
    traceId: trace.traceId,
    operationName: operationName,
    agentId: agentId,
    taskId: taskId,
    parentSpanId: options.parentSpanId || null,
    startTime: startTime,
    endTime: null,
    durationMs: null,
    status: SPAN_STATUS.UNSET,
    statusMessage: null,
    events: [],
    attributes: options.attributes || {},
    output: null
  };

  // Add to active spans cache
  activeSpans.set(spanId, {
    span: span,
    taskId: taskId
  });

  // Add to trace file
  trace.spans.push(span);
  trace.updatedAt = startTime;
  writeTraceFile(taskId, trace);

  return spanId;
}

/**
 * End a span and record its completion status
 *
 * @param {string} spanId - Span ID to end
 * @param {string} status - Span status (OK, ERROR, ABSTAINED)
 * @param {object} output - Output data from the operation
 * @returns {object} Result with success status and span details
 *
 * @example
 * endSpan(spanId, 'OK', { result: 'validation passed', confidence: 98 });
 * endSpan(spanId, 'ERROR', { error: 'Validation failed', reason: 'Missing field' });
 * endSpan(spanId, 'ABSTAINED', { reason: 'Low confidence', confidence: 45 });
 */
function endSpan(spanId, status, output = {}) {
  const result = {
    success: false,
    spanId: spanId,
    status: null,
    durationMs: null,
    error: null
  };

  // Validate status
  if (!Object.values(SPAN_STATUS).includes(status)) {
    result.error = `Invalid status: ${status}. Valid: ${Object.values(SPAN_STATUS).join(', ')}`;
    return result;
  }

  // Get active span from cache
  const activeSpan = activeSpans.get(spanId);
  if (!activeSpan) {
    // Try to find in trace files (span may have been created in previous process)
    const traceFiles = fs.readdirSync(TRACES_DIR).filter(f => f.endsWith('.trace.json'));
    for (const file of traceFiles) {
      const trace = JSON.parse(fs.readFileSync(path.join(TRACES_DIR, file), 'utf-8'));
      const spanIndex = trace.spans.findIndex(s => s.spanId === spanId);
      if (spanIndex !== -1) {
        const endTime = new Date().toISOString();
        const startTime = new Date(trace.spans[spanIndex].startTime);
        const duration = new Date(endTime) - startTime;

        trace.spans[spanIndex].endTime = endTime;
        trace.spans[spanIndex].durationMs = duration;
        trace.spans[spanIndex].status = status;
        trace.spans[spanIndex].output = output;
        trace.spans[spanIndex].statusMessage = output.message || output.error || null;
        trace.updatedAt = endTime;

        writeTraceFile(trace.taskId, trace);

        result.success = true;
        result.status = status;
        result.durationMs = duration;
        return result;
      }
    }
    result.error = `Span not found: ${spanId}`;
    return result;
  }

  const { span, taskId } = activeSpan;
  const endTime = new Date().toISOString();
  const startTime = new Date(span.startTime);
  const duration = new Date(endTime) - startTime;

  // Update span
  span.endTime = endTime;
  span.durationMs = duration;
  span.status = status;
  span.output = output;
  span.statusMessage = output.message || output.error || null;

  // Update trace file
  const trace = readTraceFile(taskId);
  if (trace) {
    const spanIndex = trace.spans.findIndex(s => s.spanId === spanId);
    if (spanIndex !== -1) {
      trace.spans[spanIndex] = span;
      trace.updatedAt = endTime;
      writeTraceFile(taskId, trace);
    }
  }

  // Remove from active spans
  activeSpans.delete(spanId);

  result.success = true;
  result.status = status;
  result.durationMs = duration;

  return result;
}

/**
 * Log an event within a span
 *
 * @param {string} spanId - Span ID to log event to
 * @param {string} eventName - Name of the event
 * @param {object} data - Event data
 * @returns {object} Result with success status and event details
 *
 * @example
 * logEvent(spanId, 'decision_made', { decision: 'approve', confidence: 95 });
 * logEvent(spanId, 'tool_call_started', { tool: 'validateProof', args: {...} });
 */
function logEvent(spanId, eventName, data = {}) {
  const result = {
    success: false,
    spanId: spanId,
    eventId: null,
    error: null
  };

  // Validate event name
  if (!EVENT_TYPES.includes(eventName)) {
    console.warn(`Warning: Unknown event type '${eventName}'. Valid types: ${EVENT_TYPES.join(', ')}`);
  }

  const eventId = generateUUID().slice(0, 8);
  const timestamp = new Date().toISOString();

  const event = {
    eventId: eventId,
    name: eventName,
    timestamp: timestamp,
    data: data
  };

  // Try active spans cache first
  const activeSpan = activeSpans.get(spanId);
  if (activeSpan) {
    activeSpan.span.events.push(event);

    // Update trace file
    const trace = readTraceFile(activeSpan.taskId);
    if (trace) {
      const spanIndex = trace.spans.findIndex(s => s.spanId === spanId);
      if (spanIndex !== -1) {
        trace.spans[spanIndex].events.push(event);
        trace.updatedAt = timestamp;
        writeTraceFile(activeSpan.taskId, trace);
      }
    }

    result.success = true;
    result.eventId = eventId;
    return result;
  }

  // Search trace files for the span
  const traceFiles = fs.readdirSync(TRACES_DIR).filter(f => f.endsWith('.trace.json'));
  for (const file of traceFiles) {
    const trace = JSON.parse(fs.readFileSync(path.join(TRACES_DIR, file), 'utf-8'));
    const spanIndex = trace.spans.findIndex(s => s.spanId === spanId);
    if (spanIndex !== -1) {
      trace.spans[spanIndex].events.push(event);
      trace.updatedAt = timestamp;
      writeTraceFile(trace.taskId, trace);

      result.success = true;
      result.eventId = eventId;
      return result;
    }
  }

  result.error = `Span not found: ${spanId}`;
  return result;
}

/**
 * Get a complete trace for a task
 *
 * @param {string} taskId - Task identifier
 * @returns {object|null} Trace object or null if not found
 *
 * @example
 * const trace = getTrace('TASK-001');
 * console.log(`Trace has ${trace.spans.length} spans`);
 */
function getTrace(taskId) {
  return readTraceFile(taskId);
}

/**
 * Export traces in different formats
 *
 * @param {string} format - Export format ('json' or 'human')
 * @param {object} options - Export options
 * @param {string} options.taskId - Export single task (if not specified, exports all)
 * @param {number} options.days - Only traces from last N days
 * @returns {string} Formatted trace output
 *
 * @example
 * const json = exportTraces('json', { taskId: 'TASK-001' });
 * const readable = exportTraces('human', { days: 7 });
 */
function exportTraces(format = 'json', options = {}) {
  const { taskId, days = 30 } = options;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  let traces = [];

  if (taskId) {
    // Export single task
    const trace = readTraceFile(taskId);
    if (trace) {
      traces.push(trace);
    }
  } else {
    // Export all traces within date range
    const traceFiles = fs.readdirSync(TRACES_DIR).filter(f => f.endsWith('.trace.json'));
    for (const file of traceFiles) {
      try {
        const trace = JSON.parse(fs.readFileSync(path.join(TRACES_DIR, file), 'utf-8'));
        const traceDate = new Date(trace.updatedAt || trace.createdAt);
        if (traceDate >= cutoffDate) {
          traces.push(trace);
        }
      } catch (e) {
        console.error(`Error reading trace file ${file}:`, e.message);
      }
    }
  }

  if (format === 'json') {
    return JSON.stringify(traces, null, 2);
  }

  // Human-readable format
  let output = [];
  output.push('=' .repeat(80));
  output.push('AGENT TRACING REPORT');
  output.push('=' .repeat(80));
  output.push(`Generated: ${new Date().toISOString()}`);
  output.push(`Traces: ${traces.length}`);
  output.push('');

  for (const trace of traces) {
    output.push('-'.repeat(80));
    output.push(`TRACE: ${trace.traceId}`);
    output.push(`Task ID: ${trace.taskId}`);
    output.push(`Created: ${trace.createdAt}`);
    output.push(`Updated: ${trace.updatedAt}`);
    output.push(`Spans: ${trace.spans.length}`);
    output.push('');

    for (const span of trace.spans) {
      const statusIcon = {
        'OK': '[OK]',
        'ERROR': '[ERROR]',
        'ABSTAINED': '[ABSTAINED]',
        'UNSET': '[...]'
      }[span.status] || '[?]';

      output.push(`  ${statusIcon} ${span.operationName}`);
      output.push(`      Agent: ${span.agentId}`);
      output.push(`      Span ID: ${span.spanId}`);
      output.push(`      Start: ${span.startTime}`);
      if (span.endTime) {
        output.push(`      End: ${span.endTime} (${span.durationMs}ms)`);
      }
      if (span.parentSpanId) {
        output.push(`      Parent: ${span.parentSpanId}`);
      }

      // Show events
      if (span.events.length > 0) {
        output.push(`      Events (${span.events.length}):`);
        for (const event of span.events) {
          output.push(`        - ${event.name} @ ${event.timestamp}`);
          if (event.data && Object.keys(event.data).length > 0) {
            const dataStr = JSON.stringify(event.data);
            const truncated = dataStr.length > 60 ? dataStr.substring(0, 60) + '...' : dataStr;
            output.push(`          ${truncated}`);
          }
        }
      }

      // Show attributes
      if (Object.keys(span.attributes).length > 0) {
        output.push(`      Attributes: ${JSON.stringify(span.attributes)}`);
      }

      // Show output
      if (span.output && Object.keys(span.output).length > 0) {
        const outputStr = JSON.stringify(span.output);
        const truncated = outputStr.length > 100 ? outputStr.substring(0, 100) + '...' : outputStr;
        output.push(`      Output: ${truncated}`);
      }

      output.push('');
    }
  }

  output.push('=' .repeat(80));
  output.push('END OF REPORT');
  output.push('=' .repeat(80));

  return output.join('\n');
}

/**
 * List all traces with summary
 *
 * @param {object} options - Filter options
 * @param {number} options.days - Only traces from last N days
 * @param {number} options.limit - Maximum number to return
 * @returns {array} Array of trace summaries
 */
function listTraces(options = {}) {
  const { days = 30, limit = 100 } = options;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const summaries = [];
  const traceFiles = fs.readdirSync(TRACES_DIR).filter(f => f.endsWith('.trace.json'));

  for (const file of traceFiles) {
    try {
      const trace = JSON.parse(fs.readFileSync(path.join(TRACES_DIR, file), 'utf-8'));
      const traceDate = new Date(trace.updatedAt || trace.createdAt);
      if (traceDate >= cutoffDate) {
        // Count span statuses
        const statusCounts = { OK: 0, ERROR: 0, ABSTAINED: 0, UNSET: 0 };
        for (const span of trace.spans) {
          statusCounts[span.status] = (statusCounts[span.status] || 0) + 1;
        }

        summaries.push({
          taskId: trace.taskId,
          traceId: trace.traceId,
          createdAt: trace.createdAt,
          updatedAt: trace.updatedAt,
          spanCount: trace.spans.length,
          statusCounts: statusCounts,
          agents: [...new Set(trace.spans.map(s => s.agentId))]
        });
      }
    } catch (e) {
      console.error(`Error reading trace file ${file}:`, e.message);
    }
  }

  // Sort by updated time descending
  summaries.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return summaries.slice(0, limit);
}

/**
 * Clear old traces
 *
 * @param {object} options - Clear options
 * @param {number} options.olderThanDays - Delete traces older than N days
 * @returns {object} Result with count of deleted traces
 */
function clearTraces(options = {}) {
  const { olderThanDays = 30 } = options;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const traceFiles = fs.readdirSync(TRACES_DIR).filter(f => f.endsWith('.trace.json'));
  let deletedCount = 0;

  for (const file of traceFiles) {
    const filePath = path.join(TRACES_DIR, file);
    try {
      const trace = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const traceDate = new Date(trace.updatedAt || trace.createdAt);
      if (traceDate < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    } catch (e) {
      console.error(`Error processing trace file ${file}:`, e.message);
    }
  }

  return {
    success: true,
    deletedCount: deletedCount,
    cutoffDate: cutoffDate.toISOString()
  };
}

/**
 * Add a span attribute
 *
 * @param {string} spanId - Span ID to add attribute to
 * @param {string} key - Attribute key
 * @param {*} value - Attribute value
 * @returns {boolean} Success status
 */
function setSpanAttribute(spanId, key, value) {
  const activeSpan = activeSpans.get(spanId);
  if (activeSpan) {
    activeSpan.span.attributes[key] = value;

    // Update trace file
    const trace = readTraceFile(activeSpan.taskId);
    if (trace) {
      const spanIndex = trace.spans.findIndex(s => s.spanId === spanId);
      if (spanIndex !== -1) {
        trace.spans[spanIndex].attributes[key] = value;
        trace.updatedAt = new Date().toISOString();
        writeTraceFile(activeSpan.taskId, trace);
        return true;
      }
    }
  }
  return false;
}

/**
 * Link a trace to a governor event
 *
 * @param {string} spanId - Span ID
 * @param {string} governorEventId - Event ID from governor_helpers
 * @returns {boolean} Success status
 */
function linkToGovernorEvent(spanId, governorEventId) {
  return setSpanAttribute(spanId, 'governorEventId', governorEventId);
}

/**
 * Create a child span (for nested operations)
 *
 * @param {string} parentSpanId - Parent span ID
 * @param {string} operationName - Name of the child operation
 * @param {string} agentId - Agent performing the operation
 * @returns {string} Child span ID
 */
function createChildSpan(parentSpanId, operationName, agentId) {
  // Find parent span to get taskId
  const activeParent = activeSpans.get(parentSpanId);
  if (activeParent) {
    return startSpan(operationName, agentId, activeParent.taskId, {
      parentSpanId: parentSpanId
    });
  }

  // Search trace files
  const traceFiles = fs.readdirSync(TRACES_DIR).filter(f => f.endsWith('.trace.json'));
  for (const file of traceFiles) {
    const trace = JSON.parse(fs.readFileSync(path.join(TRACES_DIR, file), 'utf-8'));
    const parentSpan = trace.spans.find(s => s.spanId === parentSpanId);
    if (parentSpan) {
      return startSpan(operationName, agentId, trace.taskId, {
        parentSpanId: parentSpanId
      });
    }
  }

  console.error(`Parent span not found: ${parentSpanId}`);
  return null;
}

// Export functions for use in other scripts
module.exports = {
  // Core tracing functions
  startSpan,
  endSpan,
  logEvent,
  getTrace,
  exportTraces,
  // Helper functions
  listTraces,
  clearTraces,
  setSpanAttribute,
  linkToGovernorEvent,
  createChildSpan,
  // Constants
  SPAN_STATUS,
  EVENT_TYPES,
  // Directory path (for integration)
  TRACES_DIR
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'view': {
      // node scripts/agent_tracing.js view <taskId>
      const taskId = args[1];
      if (!taskId) {
        console.error('Error: Task ID required');
        console.log('Usage: node scripts/agent_tracing.js view <taskId>');
        process.exit(1);
      }
      const trace = getTrace(taskId);
      if (trace) {
        console.log(exportTraces('human', { taskId }));
      } else {
        console.error(`No trace found for task: ${taskId}`);
        process.exit(1);
      }
      break;
    }

    case 'export': {
      // node scripts/agent_tracing.js export <taskId> --format=json
      const taskId = args[1];
      let format = 'json';

      // Parse flags
      for (let i = 2; i < args.length; i++) {
        if (args[i].startsWith('--format=')) {
          format = args[i].split('=')[1];
        }
      }

      if (!taskId) {
        console.error('Error: Task ID required');
        console.log('Usage: node scripts/agent_tracing.js export <taskId> [--format=json|human]');
        process.exit(1);
      }

      console.log(exportTraces(format, { taskId }));
      break;
    }

    case 'export-all': {
      // node scripts/agent_tracing.js export-all --format=json --days=7
      let format = 'json';
      let days = 30;

      for (let i = 1; i < args.length; i++) {
        if (args[i].startsWith('--format=')) {
          format = args[i].split('=')[1];
        } else if (args[i].startsWith('--days=')) {
          days = parseInt(args[i].split('=')[1], 10);
        }
      }

      console.log(exportTraces(format, { days }));
      break;
    }

    case 'list': {
      // node scripts/agent_tracing.js list [--days=7] [--limit=50]
      let days = 30;
      let limit = 100;

      for (let i = 1; i < args.length; i++) {
        if (args[i].startsWith('--days=')) {
          days = parseInt(args[i].split('=')[1], 10);
        } else if (args[i].startsWith('--limit=')) {
          limit = parseInt(args[i].split('=')[1], 10);
        }
      }

      const traces = listTraces({ days, limit });
      console.log(`Found ${traces.length} traces (last ${days} days):\n`);

      for (const t of traces) {
        const okSpans = t.statusCounts.OK || 0;
        const errorSpans = t.statusCounts.ERROR || 0;
        const status = errorSpans > 0 ? '[ERRORS]' : '[OK]';
        console.log(`${status} ${t.taskId}`);
        console.log(`    Trace: ${t.traceId}`);
        console.log(`    Spans: ${t.spanCount} (OK: ${okSpans}, ERR: ${errorSpans})`);
        console.log(`    Agents: ${t.agents.join(', ')}`);
        console.log(`    Updated: ${t.updatedAt}`);
        console.log('');
      }
      break;
    }

    case 'clear': {
      // node scripts/agent_tracing.js clear [--older-than=30d]
      let olderThanDays = 30;

      for (let i = 1; i < args.length; i++) {
        if (args[i].startsWith('--older-than=')) {
          const value = args[i].split('=')[1];
          olderThanDays = parseInt(value.replace('d', ''), 10);
        }
      }

      const result = clearTraces({ olderThanDays });
      console.log(`Deleted ${result.deletedCount} traces older than ${olderThanDays} days`);
      break;
    }

    case 'start': {
      // node scripts/agent_tracing.js start <operationName> <agentId> <taskId>
      const [, operationName, agentId, taskId] = args;
      if (!operationName || !agentId || !taskId) {
        console.error('Error: operationName, agentId, and taskId required');
        console.log('Usage: node scripts/agent_tracing.js start <operationName> <agentId> <taskId>');
        process.exit(1);
      }
      const spanId = startSpan(operationName, agentId, taskId);
      console.log(JSON.stringify({ spanId, taskId, operationName, agentId }));
      break;
    }

    case 'end': {
      // node scripts/agent_tracing.js end <spanId> <status> [output_json]
      const [, spanId, status, outputJson] = args;
      if (!spanId || !status) {
        console.error('Error: spanId and status required');
        console.log('Usage: node scripts/agent_tracing.js end <spanId> <status> [output_json]');
        process.exit(1);
      }
      const output = outputJson ? JSON.parse(outputJson) : {};
      const result = endSpan(spanId, status, output);
      console.log(JSON.stringify(result));
      break;
    }

    case 'log-event': {
      // node scripts/agent_tracing.js log-event <spanId> <eventName> [data_json]
      const [, spanId, eventName, dataJson] = args;
      if (!spanId || !eventName) {
        console.error('Error: spanId and eventName required');
        console.log('Usage: node scripts/agent_tracing.js log-event <spanId> <eventName> [data_json]');
        process.exit(1);
      }
      const data = dataJson ? JSON.parse(dataJson) : {};
      const result = logEvent(spanId, eventName, data);
      console.log(JSON.stringify(result));
      break;
    }

    default:
      console.log(`
OpenTelemetry-Style Agent Tracing CLI

Usage:
  node scripts/agent_tracing.js <command> [options]

============================================================================
VIEW & EXPORT COMMANDS
============================================================================

  view <taskId>
    View trace for a specific task in human-readable format
    Example: node scripts/agent_tracing.js view TASK-001

  export <taskId> [--format=json|human]
    Export trace for a specific task
    Example: node scripts/agent_tracing.js export TASK-001 --format=json

  export-all [--format=json|human] [--days=30]
    Export all traces within date range
    Example: node scripts/agent_tracing.js export-all --format=human --days=7

  list [--days=30] [--limit=100]
    List all traces with summary
    Example: node scripts/agent_tracing.js list --days=7

============================================================================
TRACING COMMANDS (for programmatic use)
============================================================================

  start <operationName> <agentId> <taskId>
    Start a new span and return the span ID
    Example: node scripts/agent_tracing.js start validateInput Backend_Claude TASK-001

  end <spanId> <status> [output_json]
    End a span with status (OK, ERROR, ABSTAINED)
    Example: node scripts/agent_tracing.js end abc123def456 OK '{"result":"success"}'

  log-event <spanId> <eventName> [data_json]
    Log an event within a span
    Example: node scripts/agent_tracing.js log-event abc123def456 decision_made '{"confidence":95}'

============================================================================
MAINTENANCE COMMANDS
============================================================================

  clear [--older-than=30d]
    Clear old traces
    Example: node scripts/agent_tracing.js clear --older-than=7d

============================================================================
SPAN STATUS VALUES
============================================================================

  OK        - Operation completed successfully
  ERROR     - Operation failed
  ABSTAINED - Agent abstained from action (low confidence, etc.)
  UNSET     - Span still in progress

============================================================================
EVENT TYPES
============================================================================

  decision_made, tool_call_started, tool_call_completed, tool_call_failed,
  confidence_score, verification_check, escalation, approval_requested,
  approval_received, state_transition, error, warning, info, governor_event

============================================================================
INTEGRATION WITH GOVERNOR
============================================================================

Use linkToGovernorEvent(spanId, governorEventId) to link traces to governor events.

Example workflow:
  1. const spanId = tracing.startSpan('processTask', 'Backend_Claude', 'TASK-001');
  2. tracing.logEvent(spanId, 'decision_made', { decision: 'approve', confidence: 95 });
  3. const govResult = governor.logGovernorEvent('Backend_Claude', 'task_completed', 'success', {...});
  4. tracing.linkToGovernorEvent(spanId, govResult.eventId);
  5. tracing.endSpan(spanId, 'OK', { result: 'success' });

      `);
  }
}
