/**
 * CSA harvest numbers, split by harvest day the way the farm actually picks:
 *   MONDAY harvest  -> serves Tue + Wed pickups
 *   THURSDAY harvest -> serves Sat pickups
 * Box side comes from resolveCycle (applies swaps). Flex a-la-carte is attributed
 * to each ordering member's pickup day so Saturday flex lands in Thursday, not Monday.
 * Run: SUPABASE_URL=.. SUPABASE_SERVICE_ROLE_KEY=.. npx tsx scripts/harvest_numbers.ts 2026-06-22
 */
import { createClient } from '@supabase/supabase-js';
import { resolveCycle, type CycleMember } from '../src/lib/cycle';

const week = process.argv[2] ?? '2026-06-22';
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } });
const c = await resolveCycle(supabase as any, week);

const tue = c.byDistributionDay.get('Tue') ?? [];
const wed = c.byDistributionDay.get('Wed') ?? [];
const sat = c.byDistributionDay.get('Sat') ?? [];

// member_id -> which harvest this member's stuff belongs to
const memberDay = new Map<string, 'mon' | 'thu'>();
for (const m of [...tue, ...wed]) memberDay.set(m.id, 'mon');
for (const m of sat) memberDay.set(m.id, 'thu');

// ---- BOX side (resolver composition, already day-correct) ----
function boxAgg(members: CycleMember[]) {
  const map = new Map<string, { crop: string; unit: string; qty: number }>();
  let boxes = 0;
  for (const m of members) {
    if (m.share_type !== 'summer_veg') continue;
    const comp = c.boxCompositionByMember.get(m.id);
    if (!comp) continue;
    boxes++;
    for (const l of comp.items) {
      const k = `${l.crop}|${l.unit}`;
      const e = map.get(k);
      if (e) e.qty += l.qty; else map.set(k, { crop: l.crop, unit: l.unit, qty: l.qty });
    }
  }
  return { boxes, map };
}

// ---- FLEX side (query orders, attribute to the ordering member's day) ----
const { data: flex } = await supabase
  .from('flex_orders')
  .select('member_id, qty, flex_inventory:flex_inventory ( name )')
  .eq('cycle_code', 'WEEKLY').eq('week_starting', week)
  .in('status', ['pending', 'locked', 'fulfilled']);
const flexByDay: Record<'mon'|'thu', Map<string, number>> = { mon: new Map(), thu: new Map() };
let flexUnattributed = 0;
for (const f of (flex ?? []) as any[]) {
  const name = f.flex_inventory?.name ?? 'Unknown';
  if (/CSA Share/i.test(name)) continue; // base share, not a crop line
  const day = memberDay.get(f.member_id);
  if (!day) { flexUnattributed += f.qty; continue; }
  flexByDay[day].set(name, (flexByDay[day].get(name) ?? 0) + f.qty);
}

function show(label: string, members: CycleMember[], day: 'mon'|'thu') {
  const { boxes, map } = boxAgg(members);
  console.log(`\n=== ${label} — ${boxes} boxes ===`);
  console.log('BOX:');
  for (const r of [...map.values()].sort((a,b)=>b.qty-a.qty)) console.log(`  ${r.qty}\t${r.unit}\t${r.crop}`);
  console.log('FLEX a-la-carte (this day only):');
  const fx = [...flexByDay[day].entries()].sort((a,b)=>b[1]-a[1]);
  if (!fx.length) console.log('  (none)');
  for (const [n,q] of fx) console.log(`  ${q}\t${n}`);
}
show('MONDAY HARVEST (Tue + Wed)', [...tue, ...wed], 'mon');
show('THURSDAY HARVEST (Sat)', sat, 'thu');
if (flexUnattributed) console.log(`\n(note: ${flexUnattributed} flex units from members not in this cycle's pickup map)`);
