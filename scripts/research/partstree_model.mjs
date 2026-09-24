import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({
  userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  viewport:{width:1400,height:1200}})).newPage();
await p.goto('https://www.partstree.com/search?search=CV14S-14107&tab=models',{waitUntil:'domcontentloaded',timeout:45000});
await p.waitForTimeout(3000);
const links = await p.evaluate(() =>
  [...document.querySelectorAll('a')].map(a=>({t:(a.innerText||'').trim().slice(0,90), h:a.href}))
    .filter(x=>/CV14/i.test(x.t) || /cv14/i.test(x.h)));
console.log('MODEL LINKS:'); links.slice(0,6).forEach(l=>console.log('  ', l.t, '\n     ', l.h));
if (links.length) {
  await p.goto(links[0].h,{waitUntil:'domcontentloaded',timeout:45000});
  await p.waitForTimeout(3500);
  console.log('\nMODEL PAGE:', p.url());
  const t = await p.evaluate(()=>document.body.innerText);
  console.log(t.replace(/\n{3,}/g,'\n\n').slice(0,2500));
}
await b.close();
