const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CMD_FILE = path.join(__dirname, 'command.txt');
const RESULT_FILE = path.join(__dirname, 'result.txt');

let browser, context, page;

async function init() {
  console.log('🚀 Starting Remote Browser Agent...');

  // Clear any old command/result files
  if (fs.existsSync(CMD_FILE)) fs.unlinkSync(CMD_FILE);
  if (fs.existsSync(RESULT_FILE)) fs.unlinkSync(RESULT_FILE);

  // Launch browser with persistent context (keeps you logged in)
  browser = await chromium.launchPersistentContext('./user_data', {
    headless: false,
    viewport: { width: 1280, height: 900 }
  });

  page = browser.pages()[0] || await browser.newPage();

  console.log('✅ Browser ready!');
  console.log('📁 Watching for commands in:', CMD_FILE);
  console.log('📁 Results written to:', RESULT_FILE);
  console.log('');
  console.log('🔐 LOG INTO FACEBOOK NOW if not already logged in.');
  console.log('   Then tell Claude you are ready.');
  console.log('');

  // Watch for command file
  watchCommands();
}

async function watchCommands() {
  while (true) {
    try {
      if (fs.existsSync(CMD_FILE)) {
        const cmd = fs.readFileSync(CMD_FILE, 'utf8').trim();
        fs.unlinkSync(CMD_FILE);  // Delete immediately

        if (cmd) {
          console.log(`⚡ Executing: ${cmd}`);
          const result = await executeCommand(cmd);
          fs.writeFileSync(RESULT_FILE, result);
          console.log(`✅ Done. Result written.`);
        }
      }
    } catch (err) {
      fs.writeFileSync(RESULT_FILE, `❌ Error: ${err.message}`);
    }

    // Poll every 500ms
    await new Promise(r => setTimeout(r, 500));
  }
}

async function executeCommand(input) {
  const [cmd, ...args] = input.split(' ');
  const arg = args.join(' ');

  switch (cmd.toLowerCase()) {
    case 'goto':
    case 'go':
      await page.goto(arg, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      return `✅ Navigated to: ${page.url()}\n\nPage title: ${await page.title()}`;

    case 'click':
      await page.click(arg, { timeout: 10000 });
      await page.waitForTimeout(2000);
      return `✅ Clicked: ${arg}\n\nNow at: ${page.url()}`;

    case 'clicktext':
      await page.getByText(arg, { exact: false }).first().click({ timeout: 10000 });
      await page.waitForTimeout(2000);
      return `✅ Clicked text: "${arg}"\n\nNow at: ${page.url()}`;

    case 'type':
    case 'fill':
      const [selector, ...textParts] = arg.split(' ');
      const text = textParts.join(' ');
      await page.fill(selector, text);
      return `✅ Typed "${text}" into ${selector}`;

    case 'read':
      const content = await page.evaluate(() => {
        const body = document.body.cloneNode(true);
        body.querySelectorAll('script, style, noscript, svg, img').forEach(el => el.remove());
        return body.innerText.substring(0, 8000);
      });
      return `📄 PAGE CONTENT:\n\n${content}`;

    case 'buttons':
      const buttons = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button, [role="button"], a[href], [data-testid]')];
        return btns.slice(0, 40).map(b => {
          const text = b.innerText?.trim().substring(0, 60) || '';
          if (!text) return null;
          return text;
        }).filter(Boolean);
      });
      return `🔘 CLICKABLE ELEMENTS:\n\n${buttons.join('\n')}`;

    case 'dropdowns':
      const dropdowns = await page.evaluate(() => {
        const els = [...document.querySelectorAll('select, [role="listbox"], [role="combobox"], [aria-haspopup="listbox"]')];
        return els.map(e => ({
          id: e.id,
          name: e.name,
          text: e.innerText?.substring(0, 100)
        }));
      });
      return `📋 DROPDOWNS:\n\n${JSON.stringify(dropdowns, null, 2)}`;

    case 'screenshot':
      const ssPath = path.join(__dirname, `screenshot_${Date.now()}.png`);
      await page.screenshot({ path: ssPath, fullPage: false });
      return `📸 Screenshot saved: ${ssPath}`;

    case 'url':
      return `🔗 Current URL: ${page.url()}`;

    case 'title':
      return `📌 Page title: ${await page.title()}`;

    case 'wait':
      await page.waitForTimeout(parseInt(arg) || 2000);
      return `⏳ Waited ${arg || 2000}ms`;

    case 'gettoken':
      // Special command to extract access token from Graph API Explorer
      const token = await page.evaluate(() => {
        const tokenInput = document.querySelector('input[type="text"][value^="EAA"]') ||
                          document.querySelector('textarea[value^="EAA"]') ||
                          document.querySelector('[data-testid="access_token"]');
        if (tokenInput) return tokenInput.value;

        // Try to find in page text
        const pageText = document.body.innerText;
        const match = pageText.match(/EAA[a-zA-Z0-9]+/);
        return match ? match[0] : 'Token not found';
      });
      return `🔑 ACCESS TOKEN:\n\n${token}`;

    case 'checkboxes':
      const cbs = await page.evaluate(() => {
        const checkboxes = [...document.querySelectorAll('input[type="checkbox"], [role="checkbox"]')];
        return checkboxes.slice(0, 30).map(cb => ({
          id: cb.id,
          name: cb.name,
          label: cb.labels?.[0]?.innerText || cb.getAttribute('aria-label') || '',
          checked: cb.checked
        }));
      });
      return `☑️ CHECKBOXES:\n\n${JSON.stringify(cbs, null, 2)}`;

    case 'pressenter':
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
      return `✅ Pressed Enter`;

    case 'scrolldown':
      await page.evaluate(() => window.scrollBy(0, 500));
      return `✅ Scrolled down`;

    default:
      return `❓ Unknown command: ${cmd}`;
  }
}

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down...');
  if (browser) await browser.close();
  process.exit(0);
});

init().catch(console.error);
