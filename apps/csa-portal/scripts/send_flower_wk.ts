import { createClient } from '@supabase/supabase-js';
import { resolveCycle } from '../src/lib/cycle';
const week='2026-07-13';
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
console.log(`Week B flower recipients (${week}): ${flower.length} shares / ${recips.length} sendable`);
if(recips.length>60){console.log('ABORT >60');process.exit(1);}
if(recips.length===0){console.log('ABORT 0');process.exit(1);}
const subject="🌸 What's in your Tiny Seed Fleurs bouquet this week";
const text=`Hi there,

The field is in high summer, and this week's bouquet is full of it — bright and cheerful, cut fresh just for you. 🌸

This week's bouquet includes: sunflowers, snapdragons, statice, and strawflower — and our Large shares get an extra sunflower plus green mist ammi.

A quick note: your flowers went out a little later than usual this week. We're a bit understaffed right now, and this heat makes everything on the farm slower and harder — thank you so much for your patience and for sticking with us. It genuinely means a lot.

Some good news, though: we now have a refrigerated van, so your flowers ride in air conditioning the whole way and stay cool and fresh right up until they reach you.

A few notes to keep your blooms happy:

• Give them a fresh start: when your bouquet arrives, trim the stems and place them in a clean vase with fresh water. Keep them out of direct sunlight and away from heat.

• Make them last: after a couple of days, give the stems another trim and change the water — it really prolongs the beauty.

• Home deliveries: if you won't be home to receive your flowers, please set out a jar or vase with fresh water in the shade, and we'll tuck your bouquet right in.

Enjoy your blooms, and thank you again for being part of Tiny Seed Fleurs. 💐

Tiny Seed Fleurs`;
let ok=0,fail=0;
for(const r of recips){
  const rr=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL,to:[r.email],subject,text,reply_to:['tinyseedfleurs@gmail.com'],bcc:['todd@tinyseedfarmpgh.com']})});
  if(rr.ok)ok++;else{fail++;console.log('FAIL',r.email,rr.status);}
}
console.log(`\nSENT ✓ ${ok} | FAILED ${fail} | from ${process.env.RESEND_FROM_EMAIL} reply_to tinyseedfleurs@gmail.com`);
