/**
 * receiving_emails.mts — print the emails of members ACTUALLY RECEIVING a
 * veg box in a given cycle week, one per line. THE audience oracle for any
 * box-content email campaign.
 *
 * WHY (2026-10-07 incident): send_member_campaign.py targeted "active
 * summer_veg members" for a "this week's box" email — 43 of 132 recipients
 * (biweekly off-week / completed shares) had NO box coming. Same failure
 * class as 2026-09-02 (23 wrong "no box" emails). The fix both times:
 * resolveCycle is the ONLY rostering oracle. This helper exposes it to the
 * campaign script so box-content sends are FORCED through it.
 *
 * Usage: npx tsx scripts/receiving_emails.mts 2026-10-05 [share_types,csv]
 *        (week may be any date — snapped to its Monday; default shares:
 *         summer_veg,spring_veg,fall_veg)
 */
import { createClient } from '@supabase/supabase-js';
import { resolveCycle, mondayOfWeek } from '../src/lib/cycle';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env the same way the python scripts do (no dotenv dependency).
const envPath = resolve(import.meta.dirname ?? '.', '../.env');
for (const ln of readFileSync(envPath, 'utf8').split('\n')) {
  const t = ln.trim();
  if (!t || t.startsWith('#') || !t.includes('=')) continue;
  const [k, ...rest] = t.split('=');
  const v = rest.join('=').trim().replace(/^["']|["']$/g, '');
  if (!(k.trim() in process.env)) process.env[k.trim()] = v;
}

const weekArg = process.argv[2];
if (!weekArg || !/^\d{4}-\d{2}-\d{2}$/.test(weekArg)) {
  console.error('usage: npx tsx scripts/receiving_emails.mts YYYY-MM-DD [share_types,csv]');
  process.exit(2);
}
const shares = (process.argv[3] ?? 'summer_veg,spring_veg,fall_veg').split(',').map((s) => s.trim());

const sb = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const cycle = await resolveCycle(sb as never, mondayOfWeek(weekArg));
const emails = new Set<string>();
for (const m of cycle.members as Array<{ on_this_week: boolean; share_type: string; email: string | null }>) {
  if (m.on_this_week && shares.includes(m.share_type) && m.email) {
    emails.add(m.email.trim().toLowerCase());
  }
}
process.stdout.write([...emails].sort().join('\n') + '\n');
