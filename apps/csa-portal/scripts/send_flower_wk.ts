import { createClient } from '@supabase/supabase-js';
import { resolveCycle } from '../src/lib/cycle';
const week='2026-08-24';
const supabase=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
const c=await resolveCycle(supabase as any,week);
const flower=c.members.filter(m=>m.share_type==='flower');
const byCust=new Map<string,string>();
for(const m of flower) if(!byCust.has(m.customer_id)) byCust.set(m.customer_id,m.contact_name);
const ids=[...byCust.keys()];
const emails=new Map<string,string>();
for(let i=0;i<ids.length;i+=100){const {data}=await supabase.from('customers').select('id,email').in('id',ids.slice(i,i+100));for(const r of (data??[]) as any[]) if(r.email) emails.set(r.id,r.email);}
const TEST=/(freetodd21|fakeemail|test@test|\.invalid$)/i;
const recips=[...byCust.entries()].map(([id,n])=>({name:n,email:emails.get(id)||''})).filter(r=>r.email&&!TEST.test(r.email));
console.log(`Flower recipients (${week}): ${flower.length} shares / ${recips.length} sendable`);
recips.forEach(r=>console.log(`  - ${r.name} <${r.email}>`));
if(recips.length>60){console.log('ABORT >60');process.exit(1);}
if(recips.length===0){console.log('ABORT 0');process.exit(1);}
if(process.env.DRY_RUN){console.log('\nDRY RUN — no emails sent.');process.exit(0);}
const FROM='Tiny Seed Fleurs <csa@tinyseedfarm.com>';
const subject="\u{1F49D} Your flowers this week \u2014 coral fountain amaranth, celosia and dahlias";
const text=`Hi flower friends,

A quick apology to our every-other-week members: I was busy and forgot to send an email with the bouquet details a couple of weeks ago. Sorry about that.

WHAT'S IN THE BUNCH

Same cast as last week, dressed differently \u2014 we've shifted the palette, so even if you had one recently, this won't feel like a repeat.

Every share, petite and full:

  Amaranth 'Coral Fountain' \u2014 our favourite thing in the field right now. It spills and drips over the edge of the vase instead of standing to attention, and it's what gives this week's bunch its drama.

  Celosia, two kinds \u2014 'Shimmer Plume' for the soft feathery texture, and 'Crested Rose' for the dense velvety heads. They play off each other nicely.

  Marigolds \u2014 the staple of this stretch of the season. Nothing says late August quite like them.

  Rudbeckia, dahlias and zinnias to carry the colour.

Full shares also get:

  Cosmos, and Ammi 'Green Mist'.

LOOKING AFTER THEM

A few of these \u2014 the amaranth and celosia especially \u2014 will cloud the water faster than a usual bunch. Change the water every other day and give the stems a fresh angled cut each time. Do that and you'll get the better part of a week out of them. Dahlias drink hard the first day, so don't be surprised if the vase is low by tomorrow morning.

Thanks for supporting the flower field!

Loren
Tiny Seed Fleurs`;

let ok=0,fail=0;
for(const r of recips){
  const rr=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:FROM,to:[r.email],subject,text,reply_to:['tinyseedfleurs@gmail.com'],bcc:['todd@tinyseedfarmpgh.com']})});
  if(rr.ok)ok++;else{fail++;console.log('FAIL',r.email,rr.status);}
}
console.log(`\nSENT ✓ ${ok} | FAILED ${fail} | from ${FROM} reply_to tinyseedfleurs@gmail.com`);
