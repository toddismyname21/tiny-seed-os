/**
 * Tiny Seed Farm - FULLY INTEGRATED Telegram Bot
 *
 * This bot:
 * 1. Responds instantly using Chief of Staff AI
 * 2. Logs ALL messages to the coordination system (so Claude Code PM sees them)
 * 3. Polls for responses from Claude Code PM and forwards them
 * 4. Supports direct /pm commands to route to Claude Code
 *
 * STATE OF THE ART - Full multi-agent coordination
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');
const { writeToInbox, SESSION_MAP } = require('./claude-trigger');

const CONFIG = {
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  ownerChatId: process.env.OWNER_CHAT_ID,
  apiUrl: process.env.API_URL || 'https://script.google.com/macros/s/AKfycbwS36-nKIb1cc6l7AQmnM24Ynx_yluuN-_ZMZr5VRGK7ZpqqemMvXGArvzKS3TlHYCb/exec',
  pollInterval: 10000 // Check for PM responses every 10 seconds
};

if (!CONFIG.botToken || !CONFIG.ownerChatId) {
  console.error('Missing TELEGRAM_BOT_TOKEN or OWNER_CHAT_ID');
  process.exit(1);
}

const bot = new TelegramBot(CONFIG.botToken, { polling: true });
let lastPMMessageId = null;
let lastPMMessageTime = Date.now();

console.log('🌱 Tiny Seed Farm AI Bot - FULLY INTEGRATED');
console.log(`Owner: ${CONFIG.ownerChatId}`);
console.log(`API: ${CONFIG.apiUrl}`);

function isOwner(chatId) {
  return chatId.toString() === CONFIG.ownerChatId.toString();
}

/**
 * Log message to coordination system (so Claude Code PM sees it)
 */
async function logToCoordination(from, to, subject, body, type = 'direct', priority = 'normal') {
  try {
    const params = new URLSearchParams({
      action: 'sendClaudeMessage',
      from, to, subject, body, type, priority
    });
    await fetch(`${CONFIG.apiUrl}?${params.toString()}`);
    return true;
  } catch (e) {
    console.error('Log error:', e.message);
    return false;
  }
}

/**
 * Get FAST response from Chief of Staff AI (uses Haiku for speed)
 */
async function askChiefOfStaff(question) {
  try {
    const params = new URLSearchParams({
      action: 'chatFast',  // FAST endpoint - uses Haiku, minimal context
      message: question
    });
    const response = await fetch(`${CONFIG.apiUrl}?${params.toString()}`);
    const data = await response.json();
    return data.success && data.message ? data.message : 'Could not process request.';
  } catch (e) {
    console.error('AI error:', e.message);
    return `Error: ${e.message}`;
  }
}

/**
 * Get FULL intelligent response (uses Sonnet with ALL context)
 * This is the "PM-level" response - slower but smarter
 */
async function askFullChiefOfStaff(question) {
  try {
    const params = new URLSearchParams({
      action: 'chatWithChiefOfStaff',  // FULL endpoint - Sonnet, all context
      message: question
    });
    const response = await fetch(`${CONFIG.apiUrl}?${params.toString()}`, {
      timeout: 120000  // 2 minute timeout for full response
    });
    const data = await response.json();
    return data.success && data.message ? data.message : 'Could not process request.';
  } catch (e) {
    console.error('Full AI error:', e.message);
    return `Error: ${e.message}`;
  }
}

/**
 * Poll for messages from Claude Code PM
 */
async function pollForPMResponses() {
  try {
    const params = new URLSearchParams({
      action: 'getClaudeMessages',
      role: 'OWNER',
      limit: '5'
    });
    const response = await fetch(`${CONFIG.apiUrl}?${params.toString()}`);
    const messages = await response.json();

    if (Array.isArray(messages)) {
      for (const msg of messages) {
        // Only forward messages from CLAUDE_CODE (the PM)
        if (msg.from === 'CLAUDE_CODE' && msg.id !== lastPMMessageId) {
          const msgTime = new Date(msg.timestamp).getTime();
          if (msgTime > lastPMMessageTime) {
            lastPMMessageId = msg.id;
            lastPMMessageTime = msgTime;

            // Forward to owner via Telegram
            const text = `📋 *From PM (Claude Code):*\n\n${msg.body || msg.subject}`;
            try {
              await bot.sendMessage(CONFIG.ownerChatId, text, { parse_mode: 'Markdown' });
            } catch (e) {
              await bot.sendMessage(CONFIG.ownerChatId, text.replace(/\*/g, ''));
            }
            console.log(`[PM] Forwarded: ${(msg.body || '').substring(0, 50)}...`);
          }
        }
      }
    }
  } catch (e) {
    // Silent fail for polling
  }
}

// Start polling for PM responses
setInterval(pollForPMResponses, CONFIG.pollInterval);
console.log(`Polling for PM responses every ${CONFIG.pollInterval/1000}s`);

// Handle incoming messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';

  if (!isOwner(chatId)) {
    await bot.sendMessage(chatId, `Unauthorized. Your ID: ${chatId}`);
    return;
  }

  if (!text.trim()) return;

  console.log(`[IN] ${text.substring(0, 50)}...`);

  // Handle commands
  if (text.startsWith('/')) {
    await handleCommand(chatId, text);
    return;
  }

  // Show typing
  await bot.sendChatAction(chatId, 'typing');

  // 1. Log to coordination system (so PM sees it)
  await logToCoordination('OWNER', 'CLAUDE_CODE', 'Telegram', text, 'direct', 'normal');

  // 2. Get instant response from Chief of Staff AI
  const response = await askChiefOfStaff(text);

  // 3. Log the response too
  await logToCoordination('CHIEF_OF_STAFF', 'OWNER', 'Response', response, 'response', 'normal');

  // 4. Send to user
  try {
    await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
  } catch (e) {
    await bot.sendMessage(chatId, response);
  }

  console.log(`[OUT] ${response.substring(0, 50)}...`);
});

// Handle commands
async function handleCommand(chatId, text) {
  const parts = text.split(' ');
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  await bot.sendChatAction(chatId, 'typing');

  switch (cmd) {
    case '/start':
      await bot.sendMessage(chatId,
        '🌱 *Tiny Seed Farm AI - FULL INTEGRATION*\n\n' +
        'I respond instantly AND sync with Claude Code PM!\n\n' +
        '*Commands:*\n' +
        '/pm [message] - Send directly to Claude Code PM\n' +
        '/status - Farm status\n' +
        '/tasks - Today\'s tasks\n' +
        '/weather - Weather forecast\n' +
        '/brief - Morning brief\n' +
        '/help - All commands\n\n' +
        'Or just type anything!',
        { parse_mode: 'Markdown' }
      );
      break;

    case '/help':
      await bot.sendMessage(chatId,
        '*Commands:*\n\n' +
        '🤖 *Claude Control:*\n' +
        '/trigger [name] - Wake a Claude session\n' +
        '/triggerall - Wake ALL Claudes\n' +
        '/claudes - List all Claude sessions\n\n' +
        '📋 *PM Commands:*\n' +
        '/pm [msg] - Direct to Claude Code PM\n' +
        '/checkpm - Check for PM messages\n\n' +
        '🌾 *Farm Commands:*\n' +
        '/status - Farm overview\n' +
        '/tasks - Tasks needing attention\n' +
        '/weather - Weather forecast\n' +
        '/brief - Morning briefing\n' +
        '/sales - Sales summary\n' +
        '/harvest - Harvest schedule\n' +
        '/emails - Email summary\n\n' +
        'Or just type any question!',
        { parse_mode: 'Markdown' }
      );
      break;

    case '/pm':
      if (!args) {
        await bot.sendMessage(chatId, 'Usage: /pm [your message to Claude Code PM]');
        return;
      }
      // Log the request
      await logToCoordination('OWNER', 'CLAUDE_CODE', 'DIRECT PM REQUEST', args, 'direct', 'high');

      // Get FULL intelligent response in real-time (Sonnet with all context)
      await bot.sendMessage(chatId, '🧠 _Thinking with full context..._', { parse_mode: 'Markdown' });
      const pmResponse = await askFullChiefOfStaff(args);

      // Log the response
      await logToCoordination('CHIEF_OF_STAFF', 'OWNER', 'PM Response', pmResponse, 'response', 'high');

      // Send to user
      await sendResponse(chatId, `📋 *Full Analysis:*\n\n${pmResponse}`);
      break;

    case '/checkpm':
      await pollForPMResponses();
      await bot.sendMessage(chatId, 'Checked for PM messages.');
      break;

    case '/status':
      const status = await askChiefOfStaff('Give me a comprehensive farm status update including weather, tasks, and any alerts');
      await sendResponse(chatId, status);
      break;

    case '/tasks':
      const tasks = await askChiefOfStaff('What are all the tasks that need my attention today? Prioritize them.');
      await sendResponse(chatId, tasks);
      break;

    case '/weather':
      const weather = await askChiefOfStaff('What is the detailed weather forecast and how does it affect farming operations?');
      await sendResponse(chatId, weather);
      break;

    case '/brief':
      const brief = await askChiefOfStaff('Give me a comprehensive morning brief covering weather, tasks, sales, emails, and anything urgent');
      await sendResponse(chatId, brief);
      break;

    case '/sales':
      const sales = await askChiefOfStaff('Give me a detailed sales summary including recent orders, revenue, and trends');
      await sendResponse(chatId, sales);
      break;

    case '/harvest':
      const harvest = await askChiefOfStaff('What is the harvest schedule for this week? What crops are ready?');
      await sendResponse(chatId, harvest);
      break;

    case '/emails':
      const emails = await askChiefOfStaff('Summarize my important emails. What needs a response?');
      await sendResponse(chatId, emails);
      break;

    case '/trigger':
      if (!args) {
        await bot.sendMessage(chatId,
          '*Usage:* /trigger [session]\n\n' +
          '*Sessions:* backend, ux, field, financial, sales, inventory, grants, email, security, social, mobile, accounting, business, don\n\n' +
          'Example: /trigger backend',
          { parse_mode: 'Markdown' }
        );
        return;
      }
      const sessionName = args.toLowerCase().trim();
      if (!SESSION_MAP[sessionName]) {
        await bot.sendMessage(chatId, `Unknown session: ${sessionName}\n\nUse /claudes to see all sessions`);
        return;
      }
      const triggerSuccess = writeToInbox(sessionName, 'Owner requested via Telegram: Check your INBOX and process pending tasks.');
      if (triggerSuccess) {
        await bot.sendMessage(chatId, `✅ Triggered *${sessionName}* Claude\n\nMessage written to INBOX. When computer Claudes are running, they will process it.`, { parse_mode: 'Markdown' });
        await logToCoordination('OWNER', SESSION_MAP[sessionName].toUpperCase(), 'TRIGGER', `Check INBOX - triggered via Telegram`, 'direct', 'high');
      } else {
        await bot.sendMessage(chatId, `❌ Failed to trigger ${sessionName}`);
      }
      break;

    case '/triggerall':
      await bot.sendMessage(chatId, '🚀 Triggering ALL Claude sessions...');
      let triggered = 0;
      for (const [short, full] of Object.entries(SESSION_MAP)) {
        if (short !== 'pm') {
          if (writeToInbox(short, 'Owner requested via Telegram: Check your INBOX and process pending tasks.')) {
            triggered++;
          }
        }
      }
      await bot.sendMessage(chatId, `✅ Triggered ${triggered} Claude sessions\n\nMessages written to INBOXes. When computer Claudes are running, they will process them.`);
      await logToCoordination('OWNER', 'ALL_CLAUDES', 'TRIGGER ALL', `Triggered ${triggered} sessions via Telegram`, 'broadcast', 'high');
      break;

    case '/claudes':
      let sessionList = '*Claude Sessions:*\n\n';
      for (const [short, full] of Object.entries(SESSION_MAP)) {
        sessionList += `• \`${short}\` → ${full}\n`;
      }
      sessionList += '\nUse /trigger [name] to wake one';
      await bot.sendMessage(chatId, sessionList, { parse_mode: 'Markdown' });
      break;

    default:
      if (args) {
        const response = await askChiefOfStaff(args);
        await sendResponse(chatId, response);
      } else {
        await bot.sendMessage(chatId, 'Unknown command. Type /help');
      }
  }
}

async function sendResponse(chatId, text) {
  try {
    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (e) {
    await bot.sendMessage(chatId, text);
  }
}

// Startup
bot.sendMessage(CONFIG.ownerChatId,
  '🌱 *Tiny Seed Bot - FULLY INTEGRATED*\n\n' +
  '✅ Instant AI responses\n' +
  '✅ Synced with Claude Code PM\n' +
  '✅ All messages logged to coordination system\n\n' +
  'Type /help for commands or just ask anything!',
  { parse_mode: 'Markdown' }
).then(() => {
  console.log('✅ Bot ready and fully integrated!');
}).catch(e => {
  console.log('Startup message error:', e.message);
});

console.log('Bot running. Ctrl+C to stop.');
