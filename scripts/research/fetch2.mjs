/** Stealth fetcher — real Chrome, headed, with the obvious bot tells removed.
 *  usage: node scripts/research/fetch2.mjs <url> [waitSelector] */
import { chromium } from 'playwright';
const [url, waitSel] = process.argv.slice(2);
const b = await chromium.launch({
  channel: 'chrome',           // the real Chrome we installed, not bundled Chromium
  headless: false,             // headed — the single biggest tell
  args: ['--disable-blink-features=AutomationControlled','--start-maximized','--no-default-browser-check'],
});
const ctx = await b.newContext({
  userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
  viewport:{width:1512,height:900}, locale:'en-US', timezoneId:'America/New_York',
  extraHTTPHeaders:{'Accept-Language':'en-US,en;q=0.9'},
});
await ctx.addInitScript(() => {
  Object.defineProperty(navigator,'webdriver',{get:()=>undefined});
  Object.defineProperty(navigator,'plugins',{get:()=>[1,2,3,4,5]});
  Object.defineProperty(navigator,'languages',{get:()=>['en-US','en']});
  window.chrome = { runtime:{} };
});
const p = await ctx.newPage();
try{
  const r = await p.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  if (waitSel) { try{ await p.waitForSelector(waitSel,{timeout:20000}); }catch{} }
  await p.waitForTimeout(5000);
  console.log('HTTP', r?r.status():'?', '|', await p.title());
  console.log('---8<---');
  console.log((await p.evaluate(()=>document.body.innerText)).replace(/\n{3,}/g,'\n\n').slice(0,5000));
}catch(e){ console.log('ERROR', e.message.slice(0,160)); }
await b.close();
