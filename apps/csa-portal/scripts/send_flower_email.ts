import { createClient } from '@supabase/supabase-js';
import { resolveCycle } from '../src/lib/cycle';
const week='2026-07-06';
const supabase=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
const c=await resolveCycle(supabase as any,week);
const flower=c.members.filter(m=>m.share_type==='flower');
// unique customers
const byCust=new Map<string,{name:string}>();
for(const m of flower) if(!byCust.has(m.customer_id)) byCust.set(m.customer_id,{name:m.contact_name});
const ids=[...byCust.keys()];
const emails=new Map<string,string>();
for(let i=0;i<ids.length;i+=100){
  const {data}=await supabase.from('customers').select('id,email').in('id',ids.slice(i,i+100));
  for(const r of (data??[]) as any[]) if(r.email) emails.set(r.id,r.email);
}
const TEST=/(freetodd21|fakeemail|test@test\.com|\.invalid$)/i;
const recips=[...byCust.entries()]
  .map(([id,v])=>({name:v.name,email:emails.get(id)||''}))
  .filter(r=>r.email && !TEST.test(r.email));
console.log(`Flower recipients this week (${week}): ${flower.length} shares / ${byCust.size} customers / ${recips.length} sendable`);
recips.forEach(r=>console.log(`  - ${r.name} <${r.email}>`));
// SAFETY GUARD
if(recips.length>60){ console.log('ABORT: recipient count >60 — looks unscoped, not sending.'); process.exit(1); }
if(recips.length===0){ console.log('ABORT: zero recipients.'); process.exit(1); }

const subject="🌸 What's in your Tiny Seed Fleurs bouquet this week";
const text=`Hi there,

Midsummer is in full swing, and this week's bouquet shows it — a bright, textural mix of papery, delicate, and spiky blooms, all cut fresh from the field just for you. 🌸

This week's bouquet includes: feverfew, strawflower, sweet william, snapdragons, statice, and ammobium — and our Large shares also include dara and larkspur.

A few notes to keep your blooms happy:

• Give them a fresh start: when your bouquet arrives, trim the stems and place them in a clean vase with fresh water. Keep them out of direct sunlight and away from heat.

• Make them last: after a couple of days, give the stems another trim and change the water — it really prolongs the beauty.

• Home deliveries: if you won't be home to receive your flowers, please set out a jar or vase with fresh water in the shade, and we'll tuck your bouquet right in.

Enjoy your blooms! 💐

Tiny Seed Fleurs`;

let ok=0,fail=0;
for(const r of recips){
  const body={from:process.env.RESEND_FROM_EMAIL,to:[r.email],subject,text,
    reply_to:['tinyseedfleurs@gmail.com'],bcc:['todd@tinyseedfarmpgh.com']};
  const rr=await fetch('https://api.resend.com/emails',{method:'POST',
    headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify(body)});
  if(rr.ok){ok++;} else {fail++; console.log(`  FAIL ${r.email}: ${rr.status} ${(await rr.text()).slice(0,80)}`);}
}
console.log(`\nSENT ✓ ${ok} | FAILED ${fail} | from=${process.env.RESEND_FROM_EMAIL} reply_to=tinyseedfleurs@gmail.com`);
