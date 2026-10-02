import { chromium } from 'playwright';
const [url, filter] = process.argv.slice(2);
const b = await chromium.launch({ channel:'chrome', headless:false,
  args:['--disable-blink-features=AutomationControlled'] });
const ctx = await b.newContext({ userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36', viewport:{width:1512,height:900}});
await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>undefined});});
const p = await ctx.newPage();
try{
  await p.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await p.waitForTimeout(6000);
  const out = await p.evaluate(()=>[...document.querySelectorAll('a')].map(a=>a.href+' :: '+(a.innerText||'').replace(/\s+/g,' ').trim()));
  const seen=new Set();
  for(const l of out){ if(filter && !new RegExp(filter,'i').test(l)) continue; if(seen.has(l))continue; seen.add(l); console.log(l.slice(0,180)); }
}catch(e){console.log('ERROR',e.message.slice(0,150));}
await b.close();
