import { createClient } from '@supabase/supabase-js';
import { resolveCycle } from '../src/lib/cycle';
const week='2026-07-13';
const supabase=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
const c=await resolveCycle(supabase as any,week);
const NAMES=['Beadling','Kleber','Holliday','Holiday'];
const inBox=new Map(c.members.map(m=>[m.id,m]));
function tag(m:any){
  if(c.members.find(x=>x.id===m.id)) return 'RECEIVING (box packed)';
  if(c.excluded_on_hold.find(x=>x.id===m.id)) return 'excluded: ON HOLD';
  if(c.excluded_biweekly.find(x=>x.id===m.id)) return 'excluded: biweekly off-week';
  if(c.excluded_out_of_season?.find(x=>x.id===m.id)) return 'excluded: out of season';
  return 'not in cycle';
}
// gather all member rows for the named customers
const all=[...c.members,...c.excluded_on_hold,...c.excluded_biweekly,...(c.excluded_out_of_season||[])];
console.log(`resolveCycle week ${week} — Wed dist ${c.distribution_dates.Wed}`);
console.log(`Totals: receiving ${c.members.length} | on-hold excluded ${c.excluded_on_hold.length} | biweekly-off ${c.excluded_biweekly.length}`);
for(const nm of NAMES){
  const rows=all.filter(m=>(m.contact_name||'').toLowerCase().includes(nm.toLowerCase()));
  for(const m of rows){
    const stop = m.delivery_address ? 'HOME '+m.delivery_address.slice(0,25) : (m.pickup_location?.name||'?');
    console.log(`  ${m.contact_name} — ${m.share_type}/${m.share_size||''} @ ${stop}: ${tag(m)}`);
  }
}
// Highland Park / Bryant + North Park stop box counts this week
for(const stopName of ['Highland Park','North Park','Mt. Lebanon','North Side']){
  const g=[...c.byStop.values()].flat().filter(m=>m.pickup_location?.name===stopName);
  const boxes=g.filter(m=>m.share_type==='summer_veg').length;
  const flowers=g.filter(m=>m.share_type==='flower').length;
  console.log(`  STOP ${stopName}: ${boxes} veg + ${flowers} flower receiving`);
}
