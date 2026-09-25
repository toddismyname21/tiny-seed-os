/** Brave Search API. Usage: node scripts/research/brave.mjs "<query>" [count]
 *  Reads BRAVE_API_KEY from the gitignored .env at the repo root. */
import { readFileSync } from 'node:fs';
try {
  for (const l of readFileSync(new URL('../../.env', import.meta.url), 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(l.trim());
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no .env yet */ }

const key = (process.env.BRAVE_API_KEY || '').trim();
if (!key) {
  console.error('BRAVE_API_KEY is empty.');
  console.error('Get one at https://api-dashboard.search.brave.com/app/keys');
  console.error('then paste it after BRAVE_API_KEY= in the .env at the repo root.');
  process.exit(1);
}
const q = process.argv[2];
const count = process.argv[3] || '10';
if (!q) { console.error('usage: node scripts/research/brave.mjs "<query>" [count]'); process.exit(1); }

const r = await fetch(
  `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=${count}`,
  { headers: { Accept: 'application/json', 'X-Subscription-Token': key } }
);
if (!r.ok) {
  console.error(`HTTP ${r.status}`, (await r.text()).slice(0, 300));
  process.exit(1);
}
const j = await r.json();
const results = j?.web?.results ?? [];
console.log(`"${q}" — ${results.length} results\n`);
for (const x of results) {
  console.log(`• ${x.title}`);
  console.log(`  ${x.url}`);
  const d = (x.description || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (d) console.log(`  ${d.slice(0, 220)}`);
  console.log();
}
