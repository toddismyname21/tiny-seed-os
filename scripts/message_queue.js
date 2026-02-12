#!/usr/bin/env node

/**
 * A2A-Lite Message Queue
 *
 * Structured agent-to-agent communication protocol for TinyPM multi-agent system.
 * Provides file-based message queuing with JSON storage and markdown sync.
 *
 * Usage:
 *   node message_queue.js send <from> <to> <type> '<payload_json>'
 *   node message_queue.js receive <agentId>
 *   node message_queue.js acknowledge <messageId>
 *   node message_queue.js thread <contextId>
 *   node message_queue.js status <messageId>
 *   node message_queue.js list [--pending|--all]
 *
 * @module message_queue
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const BASE_PATH = path.join(__dirname, '..', 'tinypm');
const MESSAGE_QUEUE_DIR = path.join(BASE_PATH, '.message_queue');
const CLAUDE_SESSIONS_DIR = path.join(__dirname, '..', 'claude_sessions');
const SCHEMA_PATH = path.join(__dirname, '..', 'config', 'a2a_message_schema.json');

// Valid agents from schema
const VALID_AGENTS = [
  'PM_Architect',
  'Backend_Claude',
  'Desktop_Claude',
  'Mobile_Claude',
  'UX_Design_Claude',
  'Sales_Claude',
  'Security_Claude',
  'Coordination_Claude',
  'Field_Operations_Claude',
  'Financial_Claude',
  'Grants_Claude',
  'Inventory_Claude',
  'Social_Media_Claude',
  'Human_User',
  'BROADCAST'
];

// Message types
const MESSAGE_TYPES = ['request', 'response', 'notification', 'handoff'];

// Priority levels
const PRIORITY_LEVELS = ['low', 'medium', 'high', 'critical'];

// Status values
const STATUS_VALUES = ['pending', 'acknowledged', 'completed', 'abstained', 'failed'];

/**
 * Generate a UUID v4
 * @returns {string} UUID string
 */
function generateUUID() {
  return crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

/**
 * Ensure message queue directory exists
 */
function ensureDirectories() {
  if (!fs.existsSync(MESSAGE_QUEUE_DIR)) {
    fs.mkdirSync(MESSAGE_QUEUE_DIR, { recursive: true });
  }
}

/**
 * Get the file path for a context thread
 * @param {string} contextId - The context identifier
 * @returns {string} File path
 */
function getContextFilePath(contextId) {
  const sanitized = contextId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(MESSAGE_QUEUE_DIR, `${sanitized}.json`);
}

/**
 * Load messages for a context
 * @param {string} contextId - The context identifier
 * @returns {Array} Array of messages
 */
function loadContext(contextId) {
  const filePath = getContextFilePath(contextId);
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error(`Error loading context ${contextId}:`, e.message);
      return [];
    }
  }
  return [];
}

/**
 * Save messages for a context
 * @param {string} contextId - The context identifier
 * @param {Array} messages - Array of messages
 */
function saveContext(contextId, messages) {
  ensureDirectories();
  const filePath = getContextFilePath(contextId);
  fs.writeFileSync(filePath, JSON.stringify(messages, null, 2), 'utf8');
}

/**
 * Get all context files
 * @returns {Array} Array of context file paths
 */
function getAllContextFiles() {
  ensureDirectories();
  return fs.readdirSync(MESSAGE_QUEUE_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(MESSAGE_QUEUE_DIR, f));
}

/**
 * Load all messages from all contexts
 * @returns {Array} All messages
 */
function loadAllMessages() {
  const allMessages = [];
  for (const file of getAllContextFiles()) {
    try {
      const data = fs.readFileSync(file, 'utf8');
      const messages = JSON.parse(data);
      allMessages.push(...messages);
    } catch (e) {
      console.error(`Error loading ${file}:`, e.message);
    }
  }
  return allMessages;
}

/**
 * Find a message by ID across all contexts
 * @param {string} messageId - The message ID
 * @returns {Object|null} Message and context info
 */
function findMessageById(messageId) {
  for (const file of getAllContextFiles()) {
    try {
      const data = fs.readFileSync(file, 'utf8');
      const messages = JSON.parse(data);
      const message = messages.find(m => m.messageId === messageId);
      if (message) {
        return { message, contextId: message.contextId, messages };
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

/**
 * Map agent ID to session folder name
 * @param {string} agentId - Agent identifier
 * @returns {string} Session folder name
 */
function agentToSessionFolder(agentId) {
  const mapping = {
    'PM_Architect': 'pm_architect',
    'Backend_Claude': 'backend',
    'Desktop_Claude': 'desktop_web',
    'Mobile_Claude': 'mobile_app',
    'UX_Design_Claude': 'ux_design',
    'Sales_Claude': 'sales_crm',
    'Security_Claude': 'security',
    'Coordination_Claude': 'coordination',
    'Field_Operations_Claude': 'field_operations',
    'Financial_Claude': 'financial',
    'Grants_Claude': 'grants_funding',
    'Inventory_Claude': 'inventory_traceability',
    'Social_Media_Claude': 'social_media'
  };
  return mapping[agentId] || agentId.toLowerCase().replace('_claude', '');
}

/**
 * Sync message to INBOX markdown file
 * @param {string} agentId - Target agent
 * @param {Object} message - Message object
 */
function syncToInbox(agentId, message) {
  if (agentId === 'BROADCAST') {
    // Send to all agents
    VALID_AGENTS.filter(a => a !== 'BROADCAST' && a !== 'Human_User' && a !== message.from)
      .forEach(a => syncToInbox(a, message));
    return;
  }

  const sessionFolder = agentToSessionFolder(agentId);
  const inboxPath = path.join(CLAUDE_SESSIONS_DIR, sessionFolder, 'INBOX.md');
  const jsonLogPath = path.join(CLAUDE_SESSIONS_DIR, sessionFolder, 'INBOX_LOG.json');

  // Ensure folder exists
  const folderPath = path.join(CLAUDE_SESSIONS_DIR, sessionFolder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  // Update markdown INBOX
  const mdEntry = formatMessageAsMarkdown(message);
  let existingMd = '';
  if (fs.existsSync(inboxPath)) {
    existingMd = fs.readFileSync(inboxPath, 'utf8');
  } else {
    existingMd = `# INBOX: ${agentId}\n\n`;
  }

  // Append new message
  const updatedMd = existingMd + '\n---\n\n' + mdEntry;
  fs.writeFileSync(inboxPath, updatedMd, 'utf8');

  // Update JSON log
  let jsonLog = [];
  if (fs.existsSync(jsonLogPath)) {
    try {
      jsonLog = JSON.parse(fs.readFileSync(jsonLogPath, 'utf8'));
    } catch (e) {
      jsonLog = [];
    }
  }
  jsonLog.push(message);
  fs.writeFileSync(jsonLogPath, JSON.stringify(jsonLog, null, 2), 'utf8');
}

/**
 * Format message as markdown
 * @param {Object} message - Message object
 * @returns {string} Markdown formatted message
 */
function formatMessageAsMarkdown(message) {
  const priorityEmoji = {
    'low': '',
    'medium': '',
    'high': '[HIGH]',
    'critical': '[CRITICAL]'
  };

  const typeEmoji = {
    'request': 'REQUEST',
    'response': 'RESPONSE',
    'notification': 'NOTIFICATION',
    'handoff': 'HANDOFF'
  };

  let md = `## From: ${message.from}\n`;
  md += `**Date:** ${new Date(message.timestamp).toISOString().split('T')[0]}\n`;
  md += `**Type:** ${typeEmoji[message.type] || message.type}\n`;
  md += `**Priority:** ${priorityEmoji[message.priority] || ''} ${message.priority.toUpperCase()}\n`;
  md += `**Message ID:** \`${message.messageId}\`\n`;
  md += `**Context:** \`${message.contextId}\`\n`;

  if (message.taskId) {
    md += `**Task:** \`${message.taskId}\`\n`;
  }

  md += '\n';

  if (message.payload.subject) {
    md += `### ${message.payload.subject}\n\n`;
  }

  if (message.payload.body) {
    md += message.payload.body + '\n\n';
  }

  if (message.payload.action) {
    md += `**Requested Action:** ${message.payload.action}\n\n`;
  }

  if (message.confidence !== undefined) {
    md += `**Confidence:** ${(message.confidence * 100).toFixed(0)}%\n`;
  }

  if (message.payload.metadata && Object.keys(message.payload.metadata).length > 0) {
    md += '\n**Metadata:**\n```json\n' + JSON.stringify(message.payload.metadata, null, 2) + '\n```\n';
  }

  return md;
}

/**
 * Send a message from one agent to another
 * @param {string} from - Sender agent ID
 * @param {string} to - Recipient agent ID
 * @param {string} type - Message type
 * @param {Object} payload - Message payload
 * @param {Object} options - Additional options
 * @returns {Object} Created message
 */
function sendMessage(from, to, type, payload, options = {}) {
  // Validate inputs
  if (!VALID_AGENTS.includes(from)) {
    throw new Error(`Invalid sender agent: ${from}. Valid agents: ${VALID_AGENTS.join(', ')}`);
  }
  if (!VALID_AGENTS.includes(to)) {
    throw new Error(`Invalid recipient agent: ${to}. Valid agents: ${VALID_AGENTS.join(', ')}`);
  }
  if (!MESSAGE_TYPES.includes(type)) {
    throw new Error(`Invalid message type: ${type}. Valid types: ${MESSAGE_TYPES.join(', ')}`);
  }

  const message = {
    messageId: generateUUID(),
    timestamp: new Date().toISOString(),
    from,
    to,
    type,
    contextId: options.contextId || `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    taskId: options.taskId || null,
    priority: options.priority || 'medium',
    payload: typeof payload === 'string' ? JSON.parse(payload) : payload,
    confidence: options.confidence !== undefined ? options.confidence : 0.9,
    status: 'pending',
    parentMessageId: options.parentMessageId || null,
    retryCount: 0
  };

  if (options.expiresAt) {
    message.expiresAt = options.expiresAt;
  }

  // Save to context
  const messages = loadContext(message.contextId);
  messages.push(message);
  saveContext(message.contextId, messages);

  // Sync to INBOX
  syncToInbox(to, message);

  return message;
}

/**
 * Receive pending messages for an agent
 * @param {string} agentId - Agent ID
 * @param {Object} options - Filter options
 * @returns {Array} Pending messages
 */
function receiveMessages(agentId, options = {}) {
  if (!VALID_AGENTS.includes(agentId) && agentId !== 'BROADCAST') {
    throw new Error(`Invalid agent: ${agentId}`);
  }

  const allMessages = loadAllMessages();

  let filtered = allMessages.filter(m =>
    (m.to === agentId || m.to === 'BROADCAST') &&
    (options.includeAll || m.status === 'pending')
  );

  // Apply additional filters
  if (options.type) {
    filtered = filtered.filter(m => m.type === options.type);
  }
  if (options.priority) {
    filtered = filtered.filter(m => m.priority === options.priority);
  }
  if (options.from) {
    filtered = filtered.filter(m => m.from === options.from);
  }

  // Sort by priority (critical > high > medium > low) then by timestamp
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  filtered.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return new Date(a.timestamp) - new Date(b.timestamp);
  });

  return filtered;
}

/**
 * Acknowledge a message
 * @param {string} messageId - Message ID
 * @returns {Object} Updated message
 */
function acknowledgeMessage(messageId) {
  const result = findMessageById(messageId);
  if (!result) {
    throw new Error(`Message not found: ${messageId}`);
  }

  const { message, contextId, messages } = result;
  message.status = 'acknowledged';
  message.acknowledgedAt = new Date().toISOString();

  saveContext(contextId, messages);
  return message;
}

/**
 * Update message status
 * @param {string} messageId - Message ID
 * @param {string} status - New status
 * @param {Object} resultData - Optional result data
 * @returns {Object} Updated message
 */
function updateMessageStatus(messageId, status, resultData = null) {
  if (!STATUS_VALUES.includes(status)) {
    throw new Error(`Invalid status: ${status}. Valid: ${STATUS_VALUES.join(', ')}`);
  }

  const result = findMessageById(messageId);
  if (!result) {
    throw new Error(`Message not found: ${messageId}`);
  }

  const { message, contextId, messages } = result;
  message.status = status;
  message.updatedAt = new Date().toISOString();

  if (resultData) {
    message.payload.result = resultData;
  }

  saveContext(contextId, messages);
  return message;
}

/**
 * Get conversation thread by context ID
 * @param {string} contextId - Context identifier
 * @returns {Array} Messages in thread
 */
function getConversationThread(contextId) {
  const messages = loadContext(contextId);
  // Sort by timestamp
  messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return messages;
}

/**
 * Get message status
 * @param {string} messageId - Message ID
 * @returns {Object} Message with status
 */
function getMessageStatus(messageId) {
  const result = findMessageById(messageId);
  if (!result) {
    throw new Error(`Message not found: ${messageId}`);
  }
  return result.message;
}

/**
 * List all contexts with message counts
 * @returns {Array} Context summaries
 */
function listContexts() {
  const contexts = [];
  for (const file of getAllContextFiles()) {
    try {
      const data = fs.readFileSync(file, 'utf8');
      const messages = JSON.parse(data);
      if (messages.length > 0) {
        const contextId = messages[0].contextId;
        contexts.push({
          contextId,
          messageCount: messages.length,
          pendingCount: messages.filter(m => m.status === 'pending').length,
          latestTimestamp: messages[messages.length - 1].timestamp,
          participants: [...new Set(messages.flatMap(m => [m.from, m.to]))]
        });
      }
    } catch (e) {
      continue;
    }
  }
  return contexts.sort((a, b) => new Date(b.latestTimestamp) - new Date(a.latestTimestamp));
}

/**
 * Create a response to an existing message
 * @param {string} originalMessageId - ID of message to respond to
 * @param {string} responderAgentId - Responding agent
 * @param {Object} responsePayload - Response payload
 * @param {Object} options - Additional options
 * @returns {Object} Response message
 */
function respondToMessage(originalMessageId, responderAgentId, responsePayload, options = {}) {
  const result = findMessageById(originalMessageId);
  if (!result) {
    throw new Error(`Original message not found: ${originalMessageId}`);
  }

  const original = result.message;

  // Mark original as acknowledged if still pending
  if (original.status === 'pending') {
    acknowledgeMessage(originalMessageId);
  }

  // Create response
  return sendMessage(
    responderAgentId,
    original.from,
    'response',
    responsePayload,
    {
      contextId: original.contextId,
      taskId: original.taskId,
      parentMessageId: originalMessageId,
      priority: options.priority || original.priority,
      confidence: options.confidence
    }
  );
}

/**
 * Create a handoff to another agent
 * @param {string} fromAgent - Source agent
 * @param {string} toAgent - Target agent
 * @param {Object} handoffPayload - Handoff details
 * @param {Object} options - Additional options
 * @returns {Object} Handoff message
 */
function createHandoff(fromAgent, toAgent, handoffPayload, options = {}) {
  return sendMessage(
    fromAgent,
    toAgent,
    'handoff',
    handoffPayload,
    {
      contextId: options.contextId,
      taskId: options.taskId,
      priority: options.priority || 'high',
      confidence: options.confidence
    }
  );
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'send': {
        const [, from, to, type, payloadJson] = args;
        if (!from || !to || !type || !payloadJson) {
          console.error('Usage: node message_queue.js send <from> <to> <type> \'<payload_json>\'');
          console.error('  Optional env vars: CONTEXT_ID, TASK_ID, PRIORITY, CONFIDENCE');
          process.exit(1);
        }
        const options = {
          contextId: process.env.CONTEXT_ID,
          taskId: process.env.TASK_ID,
          priority: process.env.PRIORITY,
          confidence: process.env.CONFIDENCE ? parseFloat(process.env.CONFIDENCE) : undefined
        };
        const message = sendMessage(from, to, type, payloadJson, options);
        console.log(JSON.stringify(message, null, 2));
        break;
      }

      case 'receive': {
        const agentId = args[1];
        if (!agentId) {
          console.error('Usage: node message_queue.js receive <agentId> [--all]');
          process.exit(1);
        }
        const options = { includeAll: args.includes('--all') };
        const messages = receiveMessages(agentId, options);
        console.log(JSON.stringify(messages, null, 2));
        break;
      }

      case 'acknowledge':
      case 'ack': {
        const messageId = args[1];
        if (!messageId) {
          console.error('Usage: node message_queue.js acknowledge <messageId>');
          process.exit(1);
        }
        const message = acknowledgeMessage(messageId);
        console.log(JSON.stringify(message, null, 2));
        break;
      }

      case 'complete': {
        const [, messageId, resultJson] = args;
        if (!messageId) {
          console.error('Usage: node message_queue.js complete <messageId> [result_json]');
          process.exit(1);
        }
        const resultData = resultJson ? JSON.parse(resultJson) : null;
        const message = updateMessageStatus(messageId, 'completed', resultData);
        console.log(JSON.stringify(message, null, 2));
        break;
      }

      case 'fail': {
        const [, messageId, errorJson] = args;
        if (!messageId) {
          console.error('Usage: node message_queue.js fail <messageId> [error_json]');
          process.exit(1);
        }
        const errorData = errorJson ? JSON.parse(errorJson) : null;
        const message = updateMessageStatus(messageId, 'failed', errorData);
        console.log(JSON.stringify(message, null, 2));
        break;
      }

      case 'thread': {
        const contextId = args[1];
        if (!contextId) {
          console.error('Usage: node message_queue.js thread <contextId>');
          process.exit(1);
        }
        const messages = getConversationThread(contextId);
        console.log(JSON.stringify(messages, null, 2));
        break;
      }

      case 'status': {
        const messageId = args[1];
        if (!messageId) {
          console.error('Usage: node message_queue.js status <messageId>');
          process.exit(1);
        }
        const message = getMessageStatus(messageId);
        console.log(JSON.stringify(message, null, 2));
        break;
      }

      case 'list': {
        const contexts = listContexts();
        console.log(JSON.stringify(contexts, null, 2));
        break;
      }

      case 'respond': {
        const [, originalId, responder, payloadJson] = args;
        if (!originalId || !responder || !payloadJson) {
          console.error('Usage: node message_queue.js respond <originalMessageId> <responderAgent> \'<payload_json>\'');
          process.exit(1);
        }
        const message = respondToMessage(originalId, responder, JSON.parse(payloadJson));
        console.log(JSON.stringify(message, null, 2));
        break;
      }

      case 'handoff': {
        const [, from, to, payloadJson] = args;
        if (!from || !to || !payloadJson) {
          console.error('Usage: node message_queue.js handoff <from> <to> \'<payload_json>\'');
          process.exit(1);
        }
        const options = {
          contextId: process.env.CONTEXT_ID,
          taskId: process.env.TASK_ID,
          priority: process.env.PRIORITY
        };
        const message = createHandoff(from, to, JSON.parse(payloadJson), options);
        console.log(JSON.stringify(message, null, 2));
        break;
      }

      case 'help':
      default:
        console.log(`
A2A-Lite Message Queue

Commands:
  send <from> <to> <type> '<payload_json>'
    Send a message from one agent to another
    Types: request, response, notification, handoff
    Env vars: CONTEXT_ID, TASK_ID, PRIORITY, CONFIDENCE

  receive <agentId> [--all]
    Get pending messages for an agent (--all includes non-pending)

  acknowledge <messageId>
    Mark a message as acknowledged

  complete <messageId> [result_json]
    Mark a message as completed with optional result data

  fail <messageId> [error_json]
    Mark a message as failed with optional error data

  thread <contextId>
    Get all messages in a conversation thread

  status <messageId>
    Get the status of a specific message

  list
    List all conversation contexts with summaries

  respond <originalMessageId> <responderAgent> '<payload_json>'
    Create a response to an existing message

  handoff <from> <to> '<payload_json>'
    Create a handoff message to transfer work

Valid Agents:
  ${VALID_AGENTS.join(', ')}

Examples:
  # Send a request
  node message_queue.js send PM_Architect Backend_Claude request '{"subject":"Review API","body":"Please review auth endpoints"}'

  # Check pending messages
  node message_queue.js receive Backend_Claude

  # Acknowledge receipt
  node message_queue.js ack 550e8400-e29b-41d4-a716-446655440000

  # Complete with result
  node message_queue.js complete 550e8400-e29b-41d4-a716-446655440000 '{"status":"done","notes":"All clear"}'
`);
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

// Export functions for programmatic use
module.exports = {
  sendMessage,
  receiveMessages,
  acknowledgeMessage,
  updateMessageStatus,
  getConversationThread,
  getMessageStatus,
  listContexts,
  respondToMessage,
  createHandoff,
  VALID_AGENTS,
  MESSAGE_TYPES,
  PRIORITY_LEVELS,
  STATUS_VALUES
};
