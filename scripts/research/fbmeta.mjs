import { chromium } from 'playwright';
const b=await chromium.launch({channel:'chrome',headless:false,args:['--disable-blink-features=AutomationControlled']});
const ctx=await b.newContext({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',viewport:{width:1512,height:900}});
await ctx.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>undefined});});
const p=await ctx.newPage();
await p.goto(process.argv[2],{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForTimeout(4000);
const m=await p.evaluate(()=>{
  const g=n=>document.querySelector(`meta[property="${n}"],meta[name="${n}"]`)?.content||'';
  const body=document.body.innerText;
  const price=(body.match(/\$[\d,]+/)||[])[0]||'';
  return {title:g('og:title'), desc:g('og:description'), img:g('og:image'), price};
});
console.log('og:title      ', m.title);
console.log('og:description', m.desc);
console.log('price seen    ', m.price || '(none visible without login)');
await b.close();
