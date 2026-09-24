/** Amazon search -> title / price / rating rows. Usage: node amazon_search.mjs "<query>" */
import { chromium } from 'playwright';
const q = process.argv[2];
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({
  userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
  viewport:{width:1500,height:1400}})).newPage();
await p.goto('https://www.amazon.com/s?k='+encodeURIComponent(q), {waitUntil:'domcontentloaded',timeout:45000});
await p.waitForTimeout(4000);
const rows = await p.evaluate(() =>
  [...document.querySelectorAll('[data-component-type="s-search-result"]')].slice(0,12).map(el=>{
    const t = el.querySelector('h2')?.innerText?.trim() || '';
    const price = el.querySelector('.a-price .a-offscreen')?.textContent || '';
    const rating = el.querySelector('[aria-label*="out of 5"]')?.getAttribute('aria-label') || '';
    const n = el.querySelector('[data-csa-c-content-id*="reviews"], .s-underline-text')?.textContent || '';
    const a = el.querySelector('a.a-link-normal[href*="/dp/"]')?.href || '';
    return {t, price, rating, n, a: a.split('?')[0]};
  }));
console.log(`QUERY: ${q}\nresults: ${rows.length}\n`);
for (const r of rows) {
  if (!r.t) continue;
  console.log(`• ${r.t.slice(0,120)}`);
  console.log(`   ${r.price || '(no price)'}   ${r.rating}  ${r.n}`);
  console.log(`   ${r.a}`);
}
await b.close();
