import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({
  userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  viewport:{width:1500,height:1400}})).newPage();
await p.goto('https://www.partstree.com/models/cv14-14107-kohler-command-pro-engine-made-for-simplicity-14hp/',{waitUntil:'domcontentloaded',timeout:45000});
await p.waitForTimeout(3000);
const links = await p.evaluate(()=>[...document.querySelectorAll('a')]
  .map(a=>({t:(a.innerText||'').trim(),h:a.href}))
  .filter(x=>/fuel|air intake/i.test(x.t)));
for (const l of links.slice(0,4)) console.log('LINK:', l.t, '->', l.h);
const fuel = links.find(l=>/fuel/i.test(l.t));
if (fuel) {
  await p.goto(fuel.h,{waitUntil:'domcontentloaded',timeout:45000});
  await p.waitForTimeout(4000);
  console.log('\n=== FUEL SYSTEM PAGE:', p.url(), '\n');
  const t = await p.evaluate(()=>document.body.innerText);
  const lines = t.split('\n').map(s=>s.trim()).filter(Boolean);
  const start = lines.findIndex(s=>/^#|Ref|Part Number|Qty/i.test(s));
  console.log(lines.slice(Math.max(0,start-3), start+120).join('\n'));
}
await b.close();
