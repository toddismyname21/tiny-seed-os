/**
 * A2A-LITE COMMUNICATION PROTOCOL
 * Structured JSON messages between agents
 */

const fs = require('fs');
const path = require('path');

const MESSAGE_QUEUE_DIR = path.join(__dirname, '..', 'tinypm', '.message_queue');

// Ensure directory exists
if (!fs.existsSync(MESSAGE_QUEUE_DIR)) {
  fs.mkdirSync(MESSAGE_QUEUE_DIR, { recursive: true });
}

// Message types
const MESSAGE_TYPES = {
  TASK_HANDOFF: 'task_handoff',
  VERIFICATION_REQUEST: 'verification_request',
  VERIFICATION_RESULT: 'verification_result',
  ESCALATION: 'escalation',
  STATUS_UPDATE: 'status_update'
};

// Send a message to another agent
function sendMessage(fromAgent, toAgent, messageType, payload) {
  const message = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    from: fromAgent,
    to: toAgent,
    type: messageType,
    payload: payload,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };

  const filename = `${message.id}.json`;
  fs.writeFileSync(path.join(MESSAGE_QUEUE_DIR, filename), JSON.stringify(message, null, 2));

  return message.id;
}

// Get pending messages for an agent
function getMessages(agentId, markAsRead = false) {
  const files = fs.readdirSync(MESSAGE_QUEUE_DIR).filter(f => f.endsWith('.json'));
  const messages = [];

  for (const file of files) {
    const content = JSON.parse(fs.readFileSync(path.join(MESSAGE_QUEUE_DIR, file), 'utf8'));
    if (content.to === agentId && content.status === 'pending') {
      messages.push(content);

      if (markAsRead) {
        content.status = 'read';
        content.readAt = new Date().toISOString();
        fs.writeFileSync(path.join(MESSAGE_QUEUE_DIR, file), JSON.stringify(content, null, 2));
      }
    }
  }

  return messages;
}

// Request verification from Verifier_Claude
function requestVerification(fromAgent, taskId, evidence) {
  return sendMessage(fromAgent, 'Verifier_Claude', MESSAGE_TYPES.VERIFICATION_REQUEST, {
    taskId,
    evidence,
    requestedAt: new Date().toISOString()
  });
}

// Send verification result
function sendVerificationResult(taskId, passed, details) {
  return sendMessage('Verifier_Claude', 'PM_Architect', MESSAGE_TYPES.VERIFICATION_RESULT, {
    taskId,
    passed,
    details,
    verifiedAt: new Date().toISOString()
  });
}

// Escalate to human
function escalateToHuman(fromAgent, taskId, reason, context) {
  return sendMessage(fromAgent, 'Human', MESSAGE_TYPES.ESCALATION, {
    taskId,
    reason,
    context,
    urgency: 'high'
  });
}

module.exports = {
  MESSAGE_TYPES,
  sendMessage,
  getMessages,
  requestVerification,
  sendVerificationResult,
  escalateToHuman
};
