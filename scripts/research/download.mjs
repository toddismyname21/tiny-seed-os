/** Download a file through real Chrome (for hosts that block curl).
 *  usage: node scripts/research/download.mjs <url> <outPath> */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
const [url, out] = process.argv.slice(2);
const b = await chromium.launch({ channel:'chrome', headless:false,
  args:['--disable-blink-features=AutomationControlled'] });
const ctx = await b.newContext({
  userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
  acceptDownloads:true });
await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>undefined});});
const p = await ctx.newPage();
try{
  const r = await p.request.get(url, { timeout:120000 });
  console.log('HTTP', r.status(), r.headers()['content-type'], r.headers()['content-length']||'');
  if(r.ok()){ writeFileSync(out, await r.body()); console.log('SAVED ->', out); }
  else console.log('FAILED');
}catch(e){ console.log('ERROR', e.message.slice(0,200)); }
await b.close();
