
// ── 2026-08-27 outgoing fact gate ────────────────────────────────────────────
// Mirrors scripts/verify_facts.py against the same config/verified_facts.json.
// A gate on one door is worthless when the building has five: a wrong phone
// number reached 68 emails because the sender that carried it had no check.
import { readFileSync } from 'node:fs';
function verifyFacts(text: string, subject = ''): string[] {
  const facts = JSON.parse(readFileSync(new URL('../../../config/verified_facts.json', import.meta.url), 'utf8'));
  const norm = (t: string) => t.replace(/\D/g, '').slice(-10);
  const farm = new Set(Object.keys(facts.farm_contact_phones ?? {}).map(norm));
  const third = new Map(Object.entries(facts.third_party_phones ?? {}).map(([k, v]) => [norm(k), v as string]));
  const domains: string[] = (facts.domains ?? []).map((d: string) => d.toLowerCase());
  const body = `${subject}\n${text}`;
  const out: string[] = [];
  for (const m of body.matchAll(/\b(?:\+?1[-. ])?\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/g)) {
    const d = norm(m[0]);
    if (farm.has(d)) continue;
    out.push(third.has(d)
      ? `PHONE '${m[0]}' belongs to ${third.get(d)} — NOT the farm. Todd's number is 717-725-5177.`
      : `PHONE '${m[0]}' is not in verified_facts.json`);
  }
  for (const m of body.matchAll(/https?:\/\/([A-Za-z0-9.-]+)/g)) {
    const h = m[1].toLowerCase();
    if (!domains.some((d) => h === d || h.endsWith('.' + d))) out.push(`LINK host '${h}' is not in verified_facts.json`);
  }
  return out;
}

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

const _problems=verifyFacts(text,subject);
if(_problems.length){
  console.error('\nBLOCKED — unverified fact(s) in this send:');
  for(const p of _problems) console.error('   • '+p);
  console.error('\nRead it from a primary source and add it to config/verified_facts.json.\n');
  process.exit(2);
}
let ok=0,fail=0;
for(const r of recips){
  const rr=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:FROM,to:[r.email],subject,text,reply_to:['tinyseedfleurs@gmail.com'],bcc:['todd@tinyseedfarmpgh.com']})});
  if(rr.ok)ok++;else{fail++;console.log('FAIL',r.email,rr.status);}
}
console.log(`\nSENT ✓ ${ok} | FAILED ${fail} | from ${FROM} reply_to tinyseedfleurs@gmail.com`);
