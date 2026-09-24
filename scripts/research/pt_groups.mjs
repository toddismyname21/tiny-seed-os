import { chromium } from 'playwright';
const BASE='https://www.partstree.com/models/cv14-14107-kohler-command-pro-engine-made-for-simplicity-14hp/';
const GROUPS=['air-intake-filtration-10-27-15-1','oil-pan-lubrication-3-27-95-3',
              'ignition-electrical-5-27-76-5','exhaust-11-27-101-11','head-valve-breather'];
const b=await chromium.launch({headless:true});
const p=await (await b.newContext({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',viewport:{width:1500,height:1400}})).newPage();
const WANT=/carburet|spark plug|filter|element|precleaner|pre-cleaner|oil filter|hose|fuel|gasket, cyl|plug/i;
for (const g of GROUPS){
  try{
    const r=await p.goto(BASE+g+'/',{waitUntil:'domcontentloaded',timeout:40000});
    if(!r||r.status()!==200){console.log(`\n## ${g}  HTTP ${r?r.status():'?'}`);continue;}
    await p.waitForTimeout(3000);
    const t=await p.evaluate(()=>document.body.innerText);
    const L=t.split('\n').map(s=>s.trim()).filter(Boolean);
    const i=L.findIndex(s=>/Parts$/.test(s));
    console.log(`\n## ${g}`);
    const seg=L.slice(i>=0?i:0, (i>=0?i:0)+160);
    for(let k=0;k<seg.length;k++){
      if(WANT.test(seg[k])){
        console.log('   ', seg.slice(Math.max(0,k-3),k+3).join(' | ').slice(0,190));
      }
    }
  }catch(e){console.log(`\n## ${g}  ERROR ${e.message.slice(0,80)}`);}
}
await b.close();
