import { chromium } from 'playwright';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',viewport:{width:1500,height:1400}})).newPage();
await p.goto('https://www.partstree.com/models/cv14-14107-kohler-command-pro-engine-made-for-simplicity-14hp/',{waitUntil:'domcontentloaded',timeout:45000});
await p.waitForTimeout(3000);
const links=await p.evaluate(()=>[...document.querySelectorAll('a')].map(a=>({t:(a.innerText||'').trim(),h:a.href}))
  .filter(x=>/oil pan|ignition|head\/valve/i.test(x.t)));
const seen=new Set();
for(const l of links){
  if(seen.has(l.h))continue; seen.add(l.h);
  await p.goto(l.h,{waitUntil:'domcontentloaded',timeout:40000});
  await p.waitForTimeout(3500);
  const t=await p.evaluate(()=>document.body.innerText);
  const L=t.split('\n').map(s=>s.trim()).filter(Boolean);
  const i=L.findIndex(s=>/ Parts$/.test(s));
  console.log(`\n##### ${l.t}`);
  const seg=L.slice(i>=0?i+1:0,(i>=0?i+1:0)+90);
  for(let k=0;k<seg.length;k++){
    if(/^Kohler /.test(seg[k])){
      const desc=seg.slice(k+1,k+4).join(' | ');
      if(/FILTER|PLUG|OIL|SEAL, VALVE|GASKET, CYL/i.test(desc))
        console.log(`   ${seg[k]}  ::  ${desc.slice(0,110)}`);
    }
  }
}
await b.close();
