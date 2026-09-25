/** Read an Amazon product page: title, price, rating, review count, availability. */
import { chromium } from 'playwright';
const b=await chromium.launch({headless:true});
const ctx=await b.newContext({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',viewport:{width:1400,height:1200}});
for (const asin of process.argv.slice(2)) {
  const p=await ctx.newPage();
  try{
    await p.goto('https://www.amazon.com/dp/'+asin,{waitUntil:'domcontentloaded',timeout:45000});
    await p.waitForTimeout(3500);
    const d=await p.evaluate(()=>({
      title:(document.querySelector('#productTitle')?.innerText||'').trim(),
      price:(document.querySelector('.a-price .a-offscreen')?.textContent||'').trim(),
      rating:(document.querySelector('#acrPopover')?.getAttribute('title')||document.querySelector('[data-hook="rating-out-of-text"]')?.innerText||'').trim(),
      count:(document.querySelector('#acrCustomerReviewText')?.innerText||'').trim(),
      avail:(document.querySelector('#availability')?.innerText||'').trim(),
      brand:(document.querySelector('#bylineInfo')?.innerText||'').trim(),
    }));
    console.log(`\n=== ${asin}`);
    console.log(`  ${d.title.slice(0,110)}`);
    console.log(`  ${d.price}  |  ${d.rating}  |  ${d.count}  |  ${d.avail}`);
    console.log(`  ${d.brand}`);
  }catch(e){console.log(`\n=== ${asin}  ERROR ${e.message.slice(0,90)}`);}
  await p.close();
}
await b.close();
