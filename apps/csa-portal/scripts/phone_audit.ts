/** Phone audit for a week's share recipients — validates route + text-a-stop numbers.
 *  Run: SUPABASE_URL=.. SUPABASE_SERVICE_ROLE_KEY=.. npx tsx scripts/phone_audit.ts 2026-07-06 */
import { createClient } from '@supabase/supabase-js';
import { resolveCycle } from '../src/lib/cycle';
const week = process.argv[2] ?? '2026-07-06';
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } });
const c = await resolveCycle(supabase as any, week);

// flex members WITH an order this week (only they get a share)
const { data: flex } = await supabase.from('flex_orders')
  .select('member_id').eq('cycle_code','WEEKLY').eq('week_starting',week).in('status',['pending','locked','fulfilled']);
const flexOrdered = new Set((flex ?? []).map((f:any)=>f.member_id));

// customers receiving a share this week (box/flower/spring/add_on always; flex only if ordered)
const recip = c.members.filter(m => m.share_type==='flex' ? flexOrdered.has(m.id) : true);

// fetch phones
const custIds = [...new Set(recip.map(m=>m.customer_id))];
const phones = new Map<string,string|null>();
for (let i=0;i<custIds.length;i+=100){
  const { data } = await supabase.from('customers').select('id,phone,contact_name').in('id',custIds.slice(i,i+100));
  for (const r of (data??[]) as any[]) phones.set(r.id, r.phone);
}
function normalize(p:string|null){ if(!p) return null; const d=(''+p).replace(/\D/g,''); if(d.length===11&&d[0]==='1')return d.slice(1); if(d.length===10)return d; return null; }

// group by stop, one row per customer
type Row={name:string;phone:string|null;norm:string|null;home:boolean};
const byStop=new Map<string,Map<string,Row>>();
for(const m of recip){
  const stop = m.delivery_address ? 'HOME DELIVERY' : (m.pickup_location?.name ?? 'NO PICKUP SET');
  if(!byStop.has(stop)) byStop.set(stop,new Map());
  const g=byStop.get(stop)!;
  if(g.has(m.customer_id)) continue;
  const raw=phones.get(m.customer_id) ?? null;
  g.set(m.customer_id,{name:m.contact_name,phone:raw,norm:normalize(raw),home:!!m.delivery_address});
}
// duplicate-number detection (shared/placeholder)
const numCount=new Map<string,number>();
for(const g of byStop.values()) for(const r of g.values()) if(r.norm) numCount.set(r.norm,(numCount.get(r.norm)??0)+1);

let total=0, missing=0, invalid=0, dup=0;
const dist=c.distribution_dates;
console.log(`\nPHONE AUDIT — week ${week}  (Tue ${dist.Tue} / Wed ${dist.Wed} / Sat ${dist.Sat})`);
console.log('='.repeat(64));
const stops=[...byStop.keys()].sort();
for(const stop of stops){
  const g=byStop.get(stop)!;
  console.log(`\n### ${stop}  (${g.size} recipients)`);
  for(const r of [...g.values()].sort((a,b)=>a.name.localeCompare(b.name))){
    total++;
    let flag='OK ';
    if(!r.norm && !r.phone){flag='❌ MISSING';missing++;}
    else if(!r.norm){flag='⚠ INVALID';invalid++;}
    else if((numCount.get(r.norm)??0)>1){flag='⚠ SHARED#';dup++;}
    const shown = r.norm ? `(${r.norm.slice(0,3)}) ${r.norm.slice(3,6)}-${r.norm.slice(6)}` : (r.phone||'—');
    if(flag!=='OK ') console.log(`   ${flag}  ${r.name}  ${shown}`);
  }
  const okc=[...g.values()].filter(r=>r.norm && (numCount.get(r.norm)??0)===1).length;
  console.log(`   ✓ ${okc}/${g.size} have a valid unique phone`);
}
console.log('\n'+'='.repeat(64));
console.log(`TOTALS: ${total} recipients | ❌ missing ${missing} | ⚠ invalid ${invalid} | ⚠ shared-number ${dup}`);
