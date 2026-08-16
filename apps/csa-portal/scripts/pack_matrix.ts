import { createClient } from '@supabase/supabase-js';
import { resolveCycle } from '../src/lib/cycle';
import { writeFileSync } from 'node:fs';
const week='2026-07-20';
const supabase=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
const MW_ACCOUNT='05c833a7-e0b8-4e25-943a-d50c11e7a991';

// normalize an item name -> canonical crop key + clean display
function norm(n:string){
  let s=n.toLowerCase().trim();
  s=s.replace(/organic\s+|local\s+|fresh\s+|tiny seed fleurs\s+/g,'').replace(/\(.*?\)/g,'');
  s=s.replace(/\b(bunch|head|duo|bulb|w\/ tops|w\/tops|medley|mix)\b/g,'');
  s=s.replace(/\d+\s?oz.*$/g,'').replace(/-\s*$/,'');
  s=s.replace(/\bbaby\b/g,'').replace(/\s+/g,' ').trim();
  // crop groupings
  if(/rosemar/.test(s)) return 'rosemary';
  if(/romaine/.test(s)) return 'romaine';
  if(/king spring/.test(s)) return 'king spring mix';
  if(/something fresh/.test(s)) return 'something fresh mix';
  if(/summer squash|zucchini|costata|romanesco|patty pan|zephyr/.test(s)) return 'summer squash';
  if(/cucumber/.test(s)) return 'cucumbers';
  if(/dino kale|lacinato/.test(s)) return 'dino kale';
  if(/curly kale/.test(s)) return 'curly kale';
  if(/ruby kale/.test(s)) return 'ruby kale';
  if(/beet/.test(s)&&!/golden/.test(s)) return 'beets';
  if(/broccolini/.test(s)) return 'broccolini';
  if(/parsley/.test(s)) return 'parsley';
  if(/dill/.test(s)) return 'dill';
  if(/fennel/.test(s)) return 'fennel';
  if(/kohlrabi/.test(s)) return 'kohlrabi';
  if(/radicchio/.test(s)) return 'radicchio';
  if(/escarole/.test(s)) return 'escarole';
  if(/cabbage/.test(s)) return 'cabbage';
  if(/arugula/.test(s)) return s.includes('wild')?'wild arugula':'arugula';
  return s;
}
const rows=new Map<string,{disp:string;CSA:number;Flex:number;Market:number;MW:number;WS:number}>();
function add(key:string,disp:string,col:'CSA'|'Flex'|'Market'|'MW'|'WS',qty:number){
  const k=norm(key); if(!rows.has(k)) rows.set(k,{disp,CSA:0,Flex:0,Market:0,MW:0,WS:0});
  rows.get(k)![col]+=qty;
}
const title=(s:string)=>s.replace(/\b\w/g,c=>c.toUpperCase());

// CSA box demand
const c=await resolveCycle(supabase as any,week);
for(const m of c.members){ if(m.share_type!=='summer_veg') continue; const comp=c.boxCompositionByMember.get(m.id); if(!comp) continue; for(const l of comp.items) add(l.crop,l.crop,'CSA',l.qty); }
// Flex
const {data:flex}=await supabase.from('flex_orders').select('qty, flex_inventory:flex_inventory(name)').eq('cycle_code','WEEKLY').eq('week_starting',week).in('status',['pending','locked','fulfilled']);
for(const f of (flex??[]) as any[]){const nm=f.flex_inventory?.name||''; if(/CSA Share/i.test(nm)||!nm) continue; add(nm,nm,'Flex',f.qty);}
// Market table
const {data:mo}=await supabase.from('market_offerings').select('name,planned_qty').eq('week_starting',week).eq('is_active',true);
for(const m of (mo??[]) as any[]){ if(m.name&&m.planned_qty) add(m.name,m.name,'Market',m.planned_qty); }
// Wholesale (incl Market Wagon) delivering this week
const {data:wo}=await supabase.from('wholesale_orders').select('id,account_id,delivery_date,status').gte('delivery_date','2026-07-20').lte('delivery_date','2026-07-26').neq('status','cancelled');
const oids=(wo??[]).map((o:any)=>o.id); const mwOids=new Set((wo??[]).filter((o:any)=>o.account_id===MW_ACCOUNT).map((o:any)=>o.id));
if(oids.length){
  const {data:wi}=await supabase.from('wholesale_order_items').select('order_id,product_name,qty').in('order_id',oids);
  for(const it of (wi??[]) as any[]){ add(it.product_name,it.product_name,mwOids.has(it.order_id)?'MW':'WS',it.qty); }
}
const out=[...rows.values()].map(r=>({item:title(r.disp),CSA:r.CSA,Flex:r.Flex,Market:r.Market,MW:r.MW,WS:r.WS,TOTAL:r.CSA+r.Flex+r.Market+r.MW+r.WS}))
  .filter(r=>r.TOTAL>0 && !/generated on|procurementexpress|page \\d of/i.test(r.item)).sort((a,b)=>a.item.localeCompare(b.item));
writeFileSync('/tmp/pack_matrix.json',JSON.stringify(out,null,2));
console.log(`matrix rows: ${out.length}`);
console.log(out.map(r=>`${r.item}: CSA${r.CSA} Flex${r.Flex} Mkt${r.Market} MW${r.MW} WS${r.WS} = ${r.TOTAL}`).join('\n'));
