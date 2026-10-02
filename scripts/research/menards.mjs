import { chromium } from 'playwright';
const q=process.argv[2];
const b=await chromium.launch({channel:'chrome',headless:false,args:['--disable-blink-features=AutomationControlled']});
const ctx=await b.newContext({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',viewport:{width:1512,height:900},locale:'en-US'});
await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>undefined});window.chrome={runtime:{}};});
const p=await ctx.newPage();
await p.goto('https://www.menards.com/main/search.html?search='+encodeURIComponent(q),{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForTimeout(6000);
const rows=await p.evaluate(()=>{
  const out=[];
  document.querySelectorAll('[class*="search-result"], li, article').forEach(el=>{
    const t=el.querySelector('[class*="title"], [class*="name"], h2, h3')?.innerText?.trim();
    const pr=(el.innerText.match(/\$[\d,]+\.\d\d/)||[])[0];
    if(t && pr && t.length<120) out.push({t:t.replace(/\s+/g,' '), pr});
  });
  const seen=new Set();
  return out.filter(x=>!seen.has(x.t)&&seen.add(x.t)).slice(0,8);
});
for(const r of rows) console.log(`  ${r.pr.padStart(9)}  ${r.t.slice(0,86)}`);
await b.close();
