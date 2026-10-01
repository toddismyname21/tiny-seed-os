import { chromium } from 'playwright';
const q=process.argv[2];
const b=await chromium.launch({headless:true});
const p=await (await b.newContext({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',viewport:{width:1500,height:1400}})).newPage();
await p.goto('https://www.johnnyseeds.com/search/?q='+encodeURIComponent(q)+'&lang=en_US',{waitUntil:'domcontentloaded',timeout:45000});
await p.waitForTimeout(5000);
const rows=await p.evaluate(()=>[...document.querySelectorAll('.product-tile, .product, [class*="product-tile"]')].slice(0,14).map(el=>({
  t:(el.querySelector('.link, .product-name, a[class*="name"], .pdp-link a')?.innerText||'').trim(),
  pr:(el.querySelector('.price, .sales, [class*="price"]')?.innerText||'').replace(/\s+/g,' ').trim(),
  h:(el.querySelector('a[href*="/p/"], a[href]')?.href||'')})));
for(const r of rows){ if(!r.t) continue; console.log(`• ${r.t.slice(0,80)}\n   ${r.pr.slice(0,60)}\n   ${r.h.split('?')[0]}`);}
await b.close();
