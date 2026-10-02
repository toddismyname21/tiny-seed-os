import { chromium } from 'playwright';
const q=process.argv[2];
const b=await chromium.launch({headless:true});
const p=await (await b.newContext({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',viewport:{width:1400,height:1200}})).newPage();
await p.goto('https://www.youtube.com/results?search_query='+encodeURIComponent(q),{waitUntil:'domcontentloaded',timeout:45000});
await p.waitForTimeout(5000);
const vids=await p.evaluate(()=>[...document.querySelectorAll('a#video-title, a#video-title-link')].slice(0,10).map(a=>({
  t:(a.getAttribute('title')||a.innerText||'').trim(),
  h:a.href,
  ch:(a.closest('ytd-video-renderer')?.querySelector('ytd-channel-name a')?.innerText||'').trim(),
  meta:(a.closest('ytd-video-renderer')?.querySelector('#metadata-line')?.innerText||'').replace(/\n/g,' ').trim()
})));
for(const v of vids){ if(!v.t) continue; console.log(`• ${v.t.slice(0,95)}`); console.log(`   ${v.ch}  |  ${v.meta}`); console.log(`   ${v.h.split('&')[0]}`);}
await b.close();
