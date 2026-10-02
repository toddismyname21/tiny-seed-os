import { chromium } from 'playwright';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',viewport:{width:1400,height:1400}})).newPage();
await p.goto('https://www.amazon.com/dp/'+process.argv[2],{waitUntil:'domcontentloaded',timeout:45000});
await p.waitForTimeout(4000);
const d=await p.evaluate(()=>({
  bullets:[...document.querySelectorAll('#feature-bullets li, #productFactsDesktopExpander li')].map(x=>x.innerText.trim()).filter(Boolean),
  desc:(document.querySelector('#productDescription')?.innerText||'').trim().slice(0,1200)
}));
console.log('FEATURE BULLETS:');
d.bullets.slice(0,12).forEach(x=>console.log('  • '+x.replace(/\s+/g,' ').slice(0,220)));
if(d.desc){console.log('\nDESCRIPTION:\n  '+d.desc.replace(/\s+/g,' ').slice(0,900));}
await b.close();
