const { chromium } = require('playwright');
const readline = require('readline');

let browser, context, page;

async function init() {
  console.log('🚀 Starting Browser Agent...');

  // Launch browser with persistent context (keeps you logged in)
  browser = await chromium.launchPersistentContext('./user_data', {
    headless: false,  // Visible browser
    viewport: { width: 1280, height: 900 }
  });

  page = browser.pages()[0] || await browser.newPage();
  console.log('✅ Browser ready. You can log into Facebook/Meta now.');
  console.log('📋 Commands: goto <url> | click <selector> | type <text> | read | screenshot | eval <js>');
  console.log('');

  startCommandLoop();
}

function startCommandLoop() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'BROWSER> '
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    try {
      const result = await executeCommand(input);
      if (result) console.log(result);
    } catch (err) {
      console.log('❌ Error:', err.message);
    }

    rl.prompt();
  });

  rl.on('close', async () => {
    console.log('\n👋 Closing browser...');
    await browser.close();
    process.exit(0);
  });
}

async function executeCommand(input) {
  const [cmd, ...args] = input.split(' ');
  const arg = args.join(' ');

  switch (cmd.toLowerCase()) {
    case 'goto':
    case 'go':
      await page.goto(arg, { waitUntil: 'domcontentloaded', timeout: 30000 });
      return `✅ Navigated to: ${page.url()}`;

    case 'click':
      await page.click(arg, { timeout: 10000 });
      await page.waitForTimeout(1000);
      return `✅ Clicked: ${arg}`;

    case 'clicktext':
      await page.getByText(arg, { exact: false }).first().click({ timeout: 10000 });
      await page.waitForTimeout(1000);
      return `✅ Clicked text: ${arg}`;

    case 'type':
    case 'fill':
      const [selector, ...textParts] = arg.split(' ');
      const text = textParts.join(' ');
      await page.fill(selector, text);
      return `✅ Typed in ${selector}`;

    case 'read':
    case 'text':
      const content = await page.evaluate(() => {
        // Get main content, excluding scripts/styles
        const body = document.body.cloneNode(true);
        body.querySelectorAll('script, style, noscript').forEach(el => el.remove());
        return body.innerText.substring(0, 5000);
      });
      return `📄 Page content:\n${content}`;

    case 'buttons':
      const buttons = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button, [role="button"], a[href]')];
        return btns.slice(0, 30).map(b => ({
          text: b.innerText.trim().substring(0, 50),
          tag: b.tagName,
          id: b.id || '',
          class: b.className?.substring?.(0, 30) || ''
        }));
      });
      return `🔘 Buttons/Links found:\n${JSON.stringify(buttons, null, 2)}`;

    case 'inputs':
      const inputs = await page.evaluate(() => {
        const els = [...document.querySelectorAll('input, select, textarea, [contenteditable]')];
        return els.slice(0, 20).map(e => ({
          tag: e.tagName,
          type: e.type || '',
          name: e.name || '',
          id: e.id || '',
          placeholder: e.placeholder || ''
        }));
      });
      return `📝 Input fields:\n${JSON.stringify(inputs, null, 2)}`;

    case 'screenshot':
    case 'ss':
      const ssPath = `./screenshot_${Date.now()}.png`;
      await page.screenshot({ path: ssPath, fullPage: false });
      return `📸 Screenshot saved: ${ssPath}`;

    case 'url':
      return `🔗 Current URL: ${page.url()}`;

    case 'title':
      return `📌 Page title: ${await page.title()}`;

    case 'wait':
      await page.waitForTimeout(parseInt(arg) || 2000);
      return `⏳ Waited ${arg || 2000}ms`;

    case 'eval':
    case 'js':
      const result = await page.evaluate(arg);
      return `📦 Result: ${JSON.stringify(result)}`;

    case 'select':
      const [selSelector, selValue] = arg.split(' ');
      await page.selectOption(selSelector, selValue);
      return `✅ Selected ${selValue} in ${selSelector}`;

    case 'checkbox':
      const [cbSelector, cbAction] = arg.split(' ');
      if (cbAction === 'check') {
        await page.check(cbSelector);
      } else {
        await page.uncheck(cbSelector);
      }
      return `✅ Checkbox ${cbAction}: ${cbSelector}`;

    case 'help':
      return `
📋 Available Commands:
  goto <url>         - Navigate to URL
  click <selector>   - Click element by CSS selector
  clicktext <text>   - Click element containing text
  type <sel> <text>  - Type text into input field
  read               - Read page text content
  buttons            - List all buttons and links
  inputs             - List all input fields
  screenshot         - Take screenshot
  url                - Show current URL
  title              - Show page title
  wait <ms>          - Wait milliseconds
  eval <js>          - Execute JavaScript
  help               - Show this help
      `;

    default:
      return `❓ Unknown command: ${cmd}. Type 'help' for commands.`;
  }
}

init().catch(console.error);
