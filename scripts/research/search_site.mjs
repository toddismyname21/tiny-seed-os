/** Drive a real browser: open a site, type into its search box, read results.
 *  Usage: node search_site.mjs <url> <query> [selector] */
import { chromium } from 'playwright';
const [url, query, sel] = process.argv.slice(2);
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  viewport: { width: 1400, height: 1200 },
})).newPage();
try {
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await p.waitForTimeout(2000);
  const box = sel ? p.locator(sel).first()
    : p.locator('input[type=search], input[name=q], input[placeholder*="earch"], input[id*="earch"]').first();
  await box.click({ timeout: 15000 });
  await box.fill(query);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(6000);
  console.log('URL NOW:', p.url());
  const t = await p.evaluate(() => document.body.innerText);
  console.log('---8<---');
  console.log(t.replace(/\n{3,}/g, '\n\n').slice(0, 4000));
} catch (e) { console.log('ERROR', e.message.slice(0, 200)); }
await b.close();
