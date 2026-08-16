import { createClient } from '@supabase/supabase-js';
import { resolveCycle } from '../src/lib/cycle';
import { writeFileSync } from 'node:fs';
const week='2026-07-13';
const supabase=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
const c=await resolveCycle(supabase as any,week);
const ROUTE_A=['north park','simon','oakmont','squirrel hill','highland park','mt. leb'];
const isRouteA=(n?:string|null)=>{const s=(n||'').toLowerCase();return ROUTE_A.some(k=>s.includes(k));};
const recips=c.members.filter(m=>isRouteA(m.pickup_location?.name));
const byCust=new Map<string,string>();
for(const m of recips) if(!byCust.has(m.customer_id)) byCust.set(m.customer_id,m.contact_name);
const ids=[...byCust.keys()];
const emails=new Map<string,string>();
for(let i=0;i<ids.length;i+=100){
  const {data}=await supabase.from('customers').select('id,email').in('id',ids.slice(i,i+100));
  for(const r of (data??[]) as any[]) if(r.email) emails.set(r.id,r.email);
}
const TEST=/(freetodd21|fakeemail|test@test|\.invalid$)/i;
const out=[...byCust.entries()].map(([id,name])=>({name,email:emails.get(id)||''})).filter(r=>r.email&&!TEST.test(r.email));
writeFileSync('/tmp/routeA_recips.json',JSON.stringify(out,null,2));
// stop breakdown
const byStop=new Map<string,number>();
for(const m of recips){const s=m.pickup_location?.name||'?';byStop.set(s,(byStop.get(s)||0)+1);}
console.log('Route A stops receiving this week:',[...byStop.entries()].map(([k,v])=>`${k}:${v}`).join(', '));
console.log('Sendable customers:',out.length);
