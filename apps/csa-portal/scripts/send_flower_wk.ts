import { createClient } from '@supabase/supabase-js';
import { resolveCycle } from '../src/lib/cycle';
const week='2026-08-17';
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
const subject="🌻 This week's bouquet — sunflowers, zinnias, and the first dahlias of the season";
const text=`Hi flower friends,

First, an apology to our weekly members — you didn't get a bouquet email from me last week. It's the height of the season and it honestly just slipped past me. Sorry about that!

This week's bouquets are peak summer: sunflowers, marigolds, amaranth, zinnias, and cosmos.

Full shares also get dara, lisianthus, and — drumroll — the first dahlias of the season!

We've had a lot of rain, and the fields are showing it: lots of flowers, lots of veggies... and yes, lots of weeds. We're doing what we can out there. Truthfully, this is what we work all winter for.

Enjoy your flowers,
Loren
Tiny Seed Fleurs`;
let ok=0,fail=0;
for(const r of recips){
  const rr=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:FROM,to:[r.email],subject,text,reply_to:['tinyseedfleurs@gmail.com'],bcc:['todd@tinyseedfarmpgh.com']})});
  if(rr.ok)ok++;else{fail++;console.log('FAIL',r.email,rr.status);}
}
console.log(`\nSENT ✓ ${ok} | FAILED ${fail} | from ${FROM} reply_to tinyseedfleurs@gmail.com`);
