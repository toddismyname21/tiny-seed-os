/**
 * Claude Code Trigger Script
 *
 * This script can be called by the Telegram bot (or cron) to:
 * 1. Write a "check your INBOX" prompt to a Claude session's INBOX
 * 2. Trigger Claude Code via CLI (if computer is running)
 *
 * Usage:
 *   node claude-trigger.js backend        # Trigger Backend Claude
 *   node claude-trigger.js all            # Trigger all Claudes
 *   node claude-trigger.js list           # List available sessions
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const PROJECT_ROOT = '/Users/samanthapollack/Documents/TIny_Seed_OS';
const SESSIONS_DIR = path.join(PROJECT_ROOT, 'claude_sessions');

// Map short names to folder names
const SESSION_MAP = {
  'backend': 'backend',
  'ux': 'ux_design',
  'field': 'field_operations',
  'financial': 'financial',
  'sales': 'sales_crm',
  'inventory': 'inventory_traceability',
  'grants': 'grants_funding',
  'email': 'email_chief_of_staff',
  'security': 'security',
  'social': 'social_media',
  'mobile': 'mobile_employee',
  'accounting': 'accounting_compliance',
  'business': 'business_foundation',
  'don': 'don_knowledge_base',
  'pm': 'pm_architect'
};

/**
 * Write a trigger message to a Claude session's INBOX
 */
function writeToInbox(sessionName, message) {
  const folderName = SESSION_MAP[sessionName] || sessionName;
  const inboxPath = path.join(SESSIONS_DIR, folderName, 'INBOX.md');

  if (!fs.existsSync(inboxPath)) {
    console.error(`INBOX not found: ${inboxPath}`);
    return false;
  }

  const timestamp = new Date().toISOString();
  const triggerMessage = `
---

## TRIGGER FROM TELEGRAM - ${timestamp}

${message}

**IMMEDIATE ACTION:** Check your INBOX above and process any pending tasks.

---
`;

  // Append to INBOX
  const currentContent = fs.readFileSync(inboxPath, 'utf8');
  fs.writeFileSync(inboxPath, currentContent + triggerMessage);

  console.log(`✅ Wrote trigger to ${folderName}/INBOX.md`);
  return true;
}

/**
 * Attempt to trigger Claude Code CLI (if available)
 * This requires the computer to be on and Claude Code installed
 */
function triggerClaudeCode(sessionName, prompt) {
  try {
    // Check if claude command exists
    execSync('which claude', { stdio: 'ignore' });

    // Launch claude with the prompt
    // This opens a new terminal/session
    const claudeProcess = spawn('claude', ['-p', prompt], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      detached: true
    });

    claudeProcess.unref();
    console.log(`🚀 Launched Claude Code for ${sessionName}`);
    return true;
  } catch (e) {
    console.log(`ℹ️  Claude CLI not available or computer not running`);
    return false;
  }
}

/**
 * List all available sessions
 */
function listSessions() {
  console.log('\nAvailable Claude Sessions:\n');
  for (const [short, full] of Object.entries(SESSION_MAP)) {
    const inboxPath = path.join(SESSIONS_DIR, full, 'INBOX.md');
    const exists = fs.existsSync(inboxPath) ? '✅' : '❌';
    console.log(`  ${short.padEnd(12)} -> ${full.padEnd(25)} ${exists}`);
  }
  console.log('\nUsage: node claude-trigger.js <session-name> [message]');
  console.log('       node claude-trigger.js all [message]');
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help') {
    listSessions();
    return;
  }

  if (args[0] === 'list') {
    listSessions();
    return;
  }

  const sessionName = args[0].toLowerCase();
  const customMessage = args.slice(1).join(' ') || 'Owner requested via Telegram: Check your INBOX and process pending tasks.';

  if (sessionName === 'all') {
    // Trigger all sessions
    console.log('Triggering ALL Claude sessions...\n');
    for (const [short, full] of Object.entries(SESSION_MAP)) {
      if (short !== 'pm') { // Don't trigger PM, that's the coordinator
        writeToInbox(short, customMessage);
      }
    }
    console.log('\n✅ All sessions triggered');
    return;
  }

  if (!SESSION_MAP[sessionName]) {
    console.error(`Unknown session: ${sessionName}`);
    console.log('Use "list" to see available sessions');
    return;
  }

  // Write to INBOX
  const success = writeToInbox(sessionName, customMessage);

  if (success) {
    // Also try to trigger Claude Code directly
    const prompt = `You are ${SESSION_MAP[sessionName]} Claude. Check your INBOX at claude_sessions/${SESSION_MAP[sessionName]}/INBOX.md and process any pending tasks.`;
    triggerClaudeCode(sessionName, prompt);
  }
}

// Export for use by bot.js
module.exports = {
  writeToInbox,
  triggerClaudeCode,
  listSessions,
  SESSION_MAP
};

// Run if called directly
if (require.main === module) {
  main();
}
