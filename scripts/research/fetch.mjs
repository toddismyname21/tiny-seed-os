import { chromium } from 'playwright';
const url = process.argv[2];
const waitFor = process.argv[3] || 'load';
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  viewport: { width: 1400, height: 1000 },
});
const p = await ctx.newPage();
try {
  const r = await p.goto(url, { waitUntil: waitFor, timeout: 45000 });
  await p.waitForTimeout(2500);
  const text = await p.evaluate(() => document.body.innerText);
  console.log('HTTP', r ? r.status() : '?', '|', (await p.title()));
  console.log('---8<---');
  console.log(text.replace(/\n{3,}/g, '\n\n').slice(0, 6000));
} catch (e) {
  console.log('ERROR', e.message.slice(0, 200));
}
await b.close();
