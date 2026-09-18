/** Corrects the fall_veg rows the sync stamped with SUMMER season dates.
 *  Source of truth: SEASON_SCHEDULE.fall_veg (Oct 14 x 6 weeks, set by Todd
 *  2026-09-17). Pass --apply to write; default is a dry run. */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { getSchedule, lastDelivery } from '../src/lib/season.ts';
for (const l of readFileSync('.env','utf8').split('\n')) { const m=/^([A-Z0-9_]+)=(.*)$/.exec(l.trim()); if(m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g,''); }
const apply = process.argv.includes('--apply');
const who = (r: any) => `${r.customer?.contact_name ?? '?'} <${r.customer?.email ?? 'no email'}>`;
const sched = getSchedule('fall_veg');
if (!sched) throw new Error('no fall_veg schedule');
const START = sched.firstDelivery, END = lastDelivery(sched);
const sb = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { data, error } = await sb.from('members')
  .select('id, share_type, cadence, season, start_date, end_date, total_weeks, weeks_remaining, customer:customers ( email, contact_name )')
  .eq('share_type','fall_veg');
if (error) throw error;
console.log(`fall_veg rows: ${data?.length ?? 0}   target: ${START} → ${END}\n`);
let n = 0;
for (const r of (data ?? []) as any[]) {
  const weeks = r.cadence === 'biweekly' ? Math.ceil(sched.totalWeeks / 2) : sched.totalWeeks;
  const needs = r.start_date !== START || r.end_date !== END || r.total_weeks !== weeks || r.season !== 'Fall';
  if (!needs) { console.log(`  OK   ${who(r)}`); continue; }
  n++;
  console.log(`  FIX  ${who(r)}`);
  console.log(`         season      ${r.season} -> Fall`);
  console.log(`         start_date  ${r.start_date} -> ${START}`);
  console.log(`         end_date    ${r.end_date} -> ${END}`);
  console.log(`         total_weeks ${r.total_weeks} -> ${weeks}  (cadence=${r.cadence})`);
  if (apply) {
    const { error: e } = await sb.from('members')
      .update({ season: 'Fall', start_date: START, end_date: END, total_weeks: weeks })
      .eq('id', r.id);
    if (e) throw e;
  }
}
console.log(`\n${n} row(s) ${apply ? 'UPDATED' : 'would change (dry run)'}`);
