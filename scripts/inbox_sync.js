#!/usr/bin/env node

/**
 * INBOX/OUTBOX Sync Utility
 *
 * Maintains dual-format agent communication:
 * - Human-readable markdown (INBOX.md, OUTBOX.md)
 * - Machine-parseable JSON logs (INBOX_LOG.json, OUTBOX_LOG.json)
 *
 * Usage:
 *   node inbox_sync.js init <agentId>           # Initialize INBOX/OUTBOX for agent
 *   node inbox_sync.js add <agentId> <message>  # Add message to agent's INBOX
 *   node inbox_sync.js outbox <agentId> <entry> # Add entry to agent's OUTBOX
 *   node inbox_sync.js sync <agentId>           # Sync markdown to JSON
 *   node inbox_sync.js list                     # List all agent sessions
 *
 * @module inbox_sync
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

const CLAUDE_SESSIONS_DIR = path.join(__dirname, '..', 'claude_sessions');

// Agent ID to folder mapping
const AGENT_FOLDERS = {
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
  'Social_Media_Claude': 'social_media',
  'Mobile_Employee_Claude': 'mobile_employee',
  'Accounting_Claude': 'accounting_compliance',
  'Don_Knowledge_Claude': 'don_knowledge_base',
  'Food_Safety_Claude': 'food_safety',
  'Route_Delivery_Claude': 'route_delivery',
  'Email_Chief_Claude': 'email_chief_of_staff',
  'Business_Foundation_Claude': 'business_foundation'
};

/**
 * Get session folder path for an agent
 * @param {string} agentId - Agent identifier
 * @returns {string} Folder path
 */
function getAgentFolder(agentId) {
  const folder = AGENT_FOLDERS[agentId] || agentId.toLowerCase().replace(/_claude$/i, '').replace(/_/g, '_');
  return path.join(CLAUDE_SESSIONS_DIR, folder);
}

/**
 * Initialize INBOX/OUTBOX for an agent
 * @param {string} agentId - Agent identifier
 */
function initAgent(agentId) {
  const folderPath = getAgentFolder(agentId);

  // Create folder if needed
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`Created session folder: ${folderPath}`);
  }

  const inboxMdPath = path.join(folderPath, 'INBOX.md');
  const inboxJsonPath = path.join(folderPath, 'INBOX_LOG.json');
  const outboxMdPath = path.join(folderPath, 'OUTBOX.md');
  const outboxJsonPath = path.join(folderPath, 'OUTBOX_LOG.json');

  // Initialize INBOX.md
  if (!fs.existsSync(inboxMdPath)) {
    const inboxTemplate = `# INBOX: ${agentId}

Welcome to your agent inbox. Messages from other agents and the PM will appear here.

## Format

Messages follow the A2A-Lite protocol. Each message includes:
- **From:** Sender agent
- **Date:** Message date
- **Type:** request | response | notification | handoff
- **Priority:** low | medium | high | critical
- **Message ID:** UUID for tracking
- **Context:** Conversation thread ID

---

`;
    fs.writeFileSync(inboxMdPath, inboxTemplate, 'utf8');
    console.log(`Created: ${inboxMdPath}`);
  }

  // Initialize INBOX_LOG.json
  if (!fs.existsSync(inboxJsonPath)) {
    fs.writeFileSync(inboxJsonPath, '[]', 'utf8');
    console.log(`Created: ${inboxJsonPath}`);
  }

  // Initialize OUTBOX.md
  if (!fs.existsSync(outboxMdPath)) {
    const outboxTemplate = `# OUTBOX: ${agentId}

## Session Started: ${new Date().toISOString().split('T')[0]}

### Current Status: READY

---

## Progress Log

Use this file to document your work progress, completed tasks, and messages sent to other agents.

### Format

For each piece of work:
1. Log the task/request received
2. Document steps taken
3. Record the outcome
4. Note any messages sent to other agents

---

`;
    fs.writeFileSync(outboxMdPath, outboxTemplate, 'utf8');
    console.log(`Created: ${outboxMdPath}`);
  }

  // Initialize OUTBOX_LOG.json
  if (!fs.existsSync(outboxJsonPath)) {
    const initialLog = {
      agentId,
      sessionStarted: new Date().toISOString(),
      entries: []
    };
    fs.writeFileSync(outboxJsonPath, JSON.stringify(initialLog, null, 2), 'utf8');
    console.log(`Created: ${outboxJsonPath}`);
  }

  console.log(`Agent ${agentId} initialized at ${folderPath}`);
}

/**
 * Add a message entry to INBOX
 * @param {string} agentId - Target agent
 * @param {Object} messageData - Message data
 */
function addToInbox(agentId, messageData) {
  const folderPath = getAgentFolder(agentId);
  const inboxMdPath = path.join(folderPath, 'INBOX.md');
  const inboxJsonPath = path.join(folderPath, 'INBOX_LOG.json');

  // Ensure agent is initialized
  if (!fs.existsSync(inboxMdPath)) {
    initAgent(agentId);
  }

  // Parse message data
  const message = typeof messageData === 'string' ? JSON.parse(messageData) : messageData;

  // Add to JSON log
  let jsonLog = [];
  try {
    jsonLog = JSON.parse(fs.readFileSync(inboxJsonPath, 'utf8'));
  } catch (e) {
    jsonLog = [];
  }

  const entry = {
    ...message,
    receivedAt: new Date().toISOString()
  };
  jsonLog.push(entry);
  fs.writeFileSync(inboxJsonPath, JSON.stringify(jsonLog, null, 2), 'utf8');

  // Add to markdown
  const mdEntry = formatInboxEntry(message);
  const existingMd = fs.readFileSync(inboxMdPath, 'utf8');
  fs.writeFileSync(inboxMdPath, existingMd + '\n---\n\n' + mdEntry, 'utf8');

  console.log(`Added message to ${agentId} INBOX`);
  return entry;
}

/**
 * Format an inbox entry as markdown
 * @param {Object} message - Message object
 * @returns {string} Markdown formatted entry
 */
function formatInboxEntry(message) {
  const date = message.timestamp ? new Date(message.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  let md = `## From: ${message.from || 'Unknown'}\n`;
  md += `**Date:** ${date}\n`;
  md += `**Type:** ${(message.type || 'message').toUpperCase()}\n`;
  md += `**Priority:** ${(message.priority || 'medium').toUpperCase()}\n`;

  if (message.messageId) {
    md += `**Message ID:** \`${message.messageId}\`\n`;
  }
  if (message.contextId) {
    md += `**Context:** \`${message.contextId}\`\n`;
  }
  if (message.taskId) {
    md += `**Task:** \`${message.taskId}\`\n`;
  }

  md += '\n';

  if (message.payload) {
    if (message.payload.subject) {
      md += `### ${message.payload.subject}\n\n`;
    }
    if (message.payload.body) {
      md += message.payload.body + '\n\n';
    }
    if (message.payload.action) {
      md += `**Requested Action:** ${message.payload.action}\n\n`;
    }
  } else if (message.subject) {
    md += `### ${message.subject}\n\n`;
    if (message.body) {
      md += message.body + '\n\n';
    }
  }

  if (message.confidence !== undefined) {
    md += `**Confidence:** ${(message.confidence * 100).toFixed(0)}%\n`;
  }

  return md;
}

/**
 * Add an entry to OUTBOX
 * @param {string} agentId - Agent ID
 * @param {Object} entryData - Entry data
 */
function addToOutbox(agentId, entryData) {
  const folderPath = getAgentFolder(agentId);
  const outboxMdPath = path.join(folderPath, 'OUTBOX.md');
  const outboxJsonPath = path.join(folderPath, 'OUTBOX_LOG.json');

  // Ensure agent is initialized
  if (!fs.existsSync(outboxMdPath)) {
    initAgent(agentId);
  }

  // Parse entry data
  const entry = typeof entryData === 'string' ? JSON.parse(entryData) : entryData;

  // Add to JSON log
  let jsonLog;
  try {
    jsonLog = JSON.parse(fs.readFileSync(outboxJsonPath, 'utf8'));
  } catch (e) {
    jsonLog = { agentId, entries: [] };
  }

  const logEntry = {
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString()
  };
  jsonLog.entries.push(logEntry);
  fs.writeFileSync(outboxJsonPath, JSON.stringify(jsonLog, null, 2), 'utf8');

  // Add to markdown
  const mdEntry = formatOutboxEntry(entry);
  const existingMd = fs.readFileSync(outboxMdPath, 'utf8');
  fs.writeFileSync(outboxMdPath, existingMd + '\n' + mdEntry, 'utf8');

  console.log(`Added entry to ${agentId} OUTBOX`);
  return logEntry;
}

/**
 * Format an outbox entry as markdown
 * @param {Object} entry - Entry object
 * @returns {string} Markdown formatted entry
 */
function formatOutboxEntry(entry) {
  const date = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : new Date().toLocaleString();

  let md = `### ${entry.title || entry.type || 'Update'}\n`;
  md += `**Time:** ${date}\n`;

  if (entry.status) {
    md += `**Status:** ${entry.status}\n`;
  }

  md += '\n';

  if (entry.description || entry.body) {
    md += (entry.description || entry.body) + '\n';
  }

  if (entry.sentTo) {
    md += `\n**Sent to:** ${Array.isArray(entry.sentTo) ? entry.sentTo.join(', ') : entry.sentTo}\n`;
  }

  if (entry.messageId) {
    md += `**Message ID:** \`${entry.messageId}\`\n`;
  }

  md += '\n';

  return md;
}

/**
 * Sync existing markdown to JSON (parse and extract)
 * @param {string} agentId - Agent ID
 */
function syncToJson(agentId) {
  const folderPath = getAgentFolder(agentId);
  const inboxMdPath = path.join(folderPath, 'INBOX.md');
  const inboxJsonPath = path.join(folderPath, 'INBOX_LOG.json');

  if (!fs.existsSync(inboxMdPath)) {
    console.log(`No INBOX.md found for ${agentId}`);
    return;
  }

  const mdContent = fs.readFileSync(inboxMdPath, 'utf8');

  // Parse markdown sections
  const sections = mdContent.split(/\n---\n/).filter(s => s.trim());
  const entries = [];

  for (const section of sections) {
    if (section.includes('## From:')) {
      const entry = parseMarkdownSection(section);
      if (entry.from) {
        entries.push(entry);
      }
    }
  }

  // Merge with existing JSON (avoid duplicates)
  let existingJson = [];
  try {
    existingJson = JSON.parse(fs.readFileSync(inboxJsonPath, 'utf8'));
  } catch (e) {
    existingJson = [];
  }

  const existingIds = new Set(existingJson.map(e => e.messageId).filter(Boolean));

  for (const entry of entries) {
    if (!entry.messageId || !existingIds.has(entry.messageId)) {
      existingJson.push(entry);
    }
  }

  fs.writeFileSync(inboxJsonPath, JSON.stringify(existingJson, null, 2), 'utf8');
  console.log(`Synced ${entries.length} entries for ${agentId}`);
}

/**
 * Parse a markdown section into structured data
 * @param {string} section - Markdown section
 * @returns {Object} Parsed entry
 */
function parseMarkdownSection(section) {
  const entry = {};

  // Extract From
  const fromMatch = section.match(/## From:\s*(.+)/);
  if (fromMatch) entry.from = fromMatch[1].trim();

  // Extract Date
  const dateMatch = section.match(/\*\*Date:\*\*\s*(.+)/);
  if (dateMatch) entry.date = dateMatch[1].trim();

  // Extract Type
  const typeMatch = section.match(/\*\*Type:\*\*\s*(.+)/);
  if (typeMatch) entry.type = typeMatch[1].trim().toLowerCase();

  // Extract Priority
  const priorityMatch = section.match(/\*\*Priority:\*\*\s*\[?([^\]]+)\]?\s*(\w+)?/);
  if (priorityMatch) {
    entry.priority = (priorityMatch[2] || priorityMatch[1]).trim().toLowerCase();
  }

  // Extract Message ID
  const messageIdMatch = section.match(/\*\*Message ID:\*\*\s*`([^`]+)`/);
  if (messageIdMatch) entry.messageId = messageIdMatch[1];

  // Extract Context
  const contextMatch = section.match(/\*\*Context:\*\*\s*`([^`]+)`/);
  if (contextMatch) entry.contextId = contextMatch[1];

  // Extract Task
  const taskMatch = section.match(/\*\*Task:\*\*\s*`([^`]+)`/);
  if (taskMatch) entry.taskId = taskMatch[1];

  // Extract Subject (### heading)
  const subjectMatch = section.match(/###\s+(.+)/);
  if (subjectMatch) {
    entry.payload = entry.payload || {};
    entry.payload.subject = subjectMatch[1].trim();
  }

  // Extract Confidence
  const confMatch = section.match(/\*\*Confidence:\*\*\s*(\d+)%/);
  if (confMatch) entry.confidence = parseInt(confMatch[1]) / 100;

  return entry;
}

/**
 * List all agent sessions
 */
function listAgents() {
  if (!fs.existsSync(CLAUDE_SESSIONS_DIR)) {
    console.log('No claude_sessions directory found');
    return [];
  }

  const folders = fs.readdirSync(CLAUDE_SESSIONS_DIR)
    .filter(f => fs.statSync(path.join(CLAUDE_SESSIONS_DIR, f)).isDirectory());

  const agents = [];

  for (const folder of folders) {
    const folderPath = path.join(CLAUDE_SESSIONS_DIR, folder);
    const hasInbox = fs.existsSync(path.join(folderPath, 'INBOX.md'));
    const hasOutbox = fs.existsSync(path.join(folderPath, 'OUTBOX.md'));
    const hasJsonLog = fs.existsSync(path.join(folderPath, 'INBOX_LOG.json'));

    let inboxCount = 0;
    if (hasJsonLog) {
      try {
        const log = JSON.parse(fs.readFileSync(path.join(folderPath, 'INBOX_LOG.json'), 'utf8'));
        inboxCount = Array.isArray(log) ? log.length : 0;
      } catch (e) {
        inboxCount = 0;
      }
    }

    agents.push({
      folder,
      hasInbox,
      hasOutbox,
      hasJsonLog,
      inboxCount
    });
  }

  return agents;
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'init': {
        const agentId = args[1];
        if (!agentId) {
          console.error('Usage: node inbox_sync.js init <agentId>');
          process.exit(1);
        }
        initAgent(agentId);
        break;
      }

      case 'add': {
        const [, agentId, messageJson] = args;
        if (!agentId || !messageJson) {
          console.error('Usage: node inbox_sync.js add <agentId> \'<message_json>\'');
          process.exit(1);
        }
        addToInbox(agentId, messageJson);
        break;
      }

      case 'outbox': {
        const [, agentId, entryJson] = args;
        if (!agentId || !entryJson) {
          console.error('Usage: node inbox_sync.js outbox <agentId> \'<entry_json>\'');
          process.exit(1);
        }
        addToOutbox(agentId, entryJson);
        break;
      }

      case 'sync': {
        const agentId = args[1];
        if (!agentId) {
          console.error('Usage: node inbox_sync.js sync <agentId>');
          process.exit(1);
        }
        syncToJson(agentId);
        break;
      }

      case 'list': {
        const agents = listAgents();
        console.log('\nAgent Sessions:');
        console.log('---------------');
        for (const agent of agents) {
          const status = [
            agent.hasInbox ? 'INBOX' : '',
            agent.hasOutbox ? 'OUTBOX' : '',
            agent.hasJsonLog ? `JSON(${agent.inboxCount})` : ''
          ].filter(Boolean).join(' | ');
          console.log(`  ${agent.folder.padEnd(25)} ${status}`);
        }
        console.log('');
        break;
      }

      case 'help':
      default:
        console.log(`
INBOX/OUTBOX Sync Utility

Commands:
  init <agentId>              Initialize INBOX/OUTBOX for an agent
  add <agentId> '<json>'      Add a message to agent's INBOX (JSON format)
  outbox <agentId> '<json>'   Add an entry to agent's OUTBOX (JSON format)
  sync <agentId>              Sync existing markdown to JSON format
  list                        List all agent sessions and their status

Agent IDs:
  PM_Architect, Backend_Claude, Desktop_Claude, Mobile_Claude,
  UX_Design_Claude, Sales_Claude, Security_Claude, Coordination_Claude,
  Field_Operations_Claude, Financial_Claude, Grants_Claude,
  Inventory_Claude, Social_Media_Claude, etc.

Examples:
  # Initialize a new agent
  node inbox_sync.js init Backend_Claude

  # Add a message to an inbox
  node inbox_sync.js add Backend_Claude '{"from":"PM_Architect","subject":"Review API","priority":"high"}'

  # Log work in outbox
  node inbox_sync.js outbox Backend_Claude '{"title":"API Review Complete","status":"done"}'

  # Sync existing markdown to JSON
  node inbox_sync.js sync Backend_Claude

  # List all agents
  node inbox_sync.js list
`);
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

module.exports = {
  initAgent,
  addToInbox,
  addToOutbox,
  syncToJson,
  listAgents,
  getAgentFolder,
  AGENT_FOLDERS
};
