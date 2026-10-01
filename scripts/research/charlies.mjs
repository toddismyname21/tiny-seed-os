import { chromium } from 'playwright';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',viewport:{width:1400,height:1200}})).newPage();
await p.goto('https://charliesmachineandsupply.com/catalog/tripleWash.shtml',{waitUntil:'domcontentloaded',timeout:45000});
await p.waitForTimeout(2000);
const want=/double.wash|veg dryer|iso dryer|air knife|pack table|scale|poly.jaw|band sealer|form fill|swirl|water filtration|soak tank|single washer/i;
const links=await p.evaluate(()=>[...document.querySelectorAll('a')].map(a=>({t:(a.innerText||'').trim(),h:a.href})));
const seen=new Set();
for(const l of links){ if(want.test(l.t) && !seen.has(l.h)){ seen.add(l.h); console.log(`${l.t}\n   ${l.h}`);} }
await b.close();
