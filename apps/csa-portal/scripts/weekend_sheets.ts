import { createClient } from '@supabase/supabase-js';
import { resolveCycle } from '../src/lib/cycle';
import { writeFileSync } from 'node:fs';
const week='2026-07-06';
const supabase=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
const c=await resolveCycle(supabase as any,week);
const sat=c.byDistributionDay.get('Sat')??[];
const sun=c.byDistributionDay.get('Sun')??[];
const weekend=[...sat,...sun];
const weekendIds=new Set(weekend.map(m=>m.id));

// flex orders for weekend members
const {data:flexRows}=await supabase.from('flex_orders')
  .select('member_id, qty, flex_inventory:flex_inventory ( name )')
  .eq('cycle_code','WEEKLY').eq('week_starting',week).in('status',['pending','locked','fulfilled']);
const flexByMember=new Map<string,{name:string;qty:number}[]>();
const flexOrderedIds=new Set<string>();
for(const f of (flexRows??[]) as any[]){
  if(!weekendIds.has(f.member_id)) continue;
  flexOrderedIds.add(f.member_id);
  const nm=f.flex_inventory?.name??'Unknown';
  if(/CSA Share/i.test(nm)) continue;
  if(!flexByMember.has(f.member_id)) flexByMember.set(f.member_id,[]);
  flexByMember.get(f.member_id)!.push({name:nm,qty:f.qty});
}

// ---------- HARVEST ----------
const boxCrops=new Map<string,{crop:string;unit:string;qty:number}>();
let boxSmall=0,boxLarge=0;
for(const m of weekend){
  if(m.share_type!=='summer_veg') continue;
  const comp=c.boxCompositionByMember.get(m.id); if(!comp) continue;
  if(m.size_bucket==='large') boxLarge++; else boxSmall++;
  for(const l of comp.items){const k=`${l.crop}|${l.unit}`;const e=boxCrops.get(k);if(e)e.qty+=l.qty;else boxCrops.set(k,{crop:l.crop,unit:l.unit,qty:l.qty});}
}
const flexCrops=new Map<string,number>();
for(const [mid,items] of flexByMember) for(const it of items) flexCrops.set(it.name,(flexCrops.get(it.name)??0)+it.qty);
const addons:Record<string,number>={mushroom:0,bread:0,cheese:0,coffee:0,eggs:0};
for(const m of weekend) if(m.share_type==='add_on' && addons[m.addon_type]!==undefined) addons[m.addon_type]++;
let flLarge=0,flStd=0;
for(const m of weekend) if(m.share_type==='flower'){ if((m.share_size||'').toLowerCase()==='full') flLarge++; else flStd++; }

// ---------- PACK (per stop, per customer) ----------
const PRIO:Record<string,number>={summer_veg:1,spring_veg:2,flower:3,flex:4,add_on:5};
type Row={name:string;box:string|null;flower:string|null;addons:string[];flex:{name:string;qty:number}[];allergies:string[];owes:boolean};
const stops=new Map<string,{host:string|null;rows:Map<string,Row>}>();
for(const m of weekend){
  // flex members only count if they ordered
  if(m.share_type==='flex' && !flexOrderedIds.has(m.id)) continue;
  const stopName=m.pickup_location?.name??'NO PICKUP';
  if(!stops.has(stopName)) stops.set(stopName,{host:m.pickup_location?.host_name??null,rows:new Map()});
  const g=stops.get(stopName)!;
  if(!g.rows.has(m.customer_id)) g.rows.set(m.customer_id,{name:m.contact_name,box:null,flower:null,addons:[],flex:[],allergies:[],owes:false});
  const r=g.rows.get(m.customer_id)!;
  if(m.share_type==='summer_veg') r.box=`${m.size_bucket==='large'?'Large':'Small'} veg`;
  else if(m.share_type==='spring_veg') r.box=r.box??'Spring veg';
  else if(m.share_type==='flower') r.flower=(m.share_size||'').toLowerCase()==='full'?'Large bouquet':'Bouquet';
  if(m.share_type==='add_on' && m.addon_type!=='unknown') r.addons.push(m.addon_type);
  const fx=flexByMember.get(m.id); if(fx) r.flex.push(...fx);
  if(m.allergies?.length) r.allergies.push(...m.allergies);
  if((m.payment_status||'').toLowerCase()!=='paid' && m.payment_status) r.owes=true;
}
const packStops=[...stops.entries()].map(([name,v])=>({
  name, host:v.host,
  rows:[...v.rows.values()].sort((a,b)=>a.name.localeCompare(b.name))
})).sort((a,b)=>a.name.localeCompare(b.name));

const out={
  week, generated:new Date().toISOString(),
  distribution:{Sat:c.distribution_dates.Sat,Sun:c.distribution_dates.Sun},
  harvest:{
    boxSmall,boxLarge,boxTotal:boxSmall+boxLarge,
    boxCrops:[...boxCrops.values()].sort((a,b)=>b.qty-a.qty),
    flexCrops:[...flexCrops.entries()].map(([name,qty])=>({name,qty})).sort((a,b)=>b.qty-a.qty),
    addons, flowers:{large:flLarge,standard:flStd,total:flLarge+flStd},
  },
  pack:packStops,
};
writeFileSync('/tmp/weekend_data.json',JSON.stringify(out,null,2));
console.log(`Weekend stops: ${packStops.map(s=>s.name+'('+s.rows.length+')').join(', ')}`);
console.log(`Veg boxes: ${boxSmall} small + ${boxLarge} large = ${boxSmall+boxLarge} | Flowers: ${flLarge+flStd} | Add-ons:`,addons);
console.log(`Box crops: ${boxCrops.size} | Flex item lines: ${flexCrops.size}`);
console.log('-> /tmp/weekend_data.json');
