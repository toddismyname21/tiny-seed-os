# Supabase Migration Plan — Scrapping Google Apps Script

**Decision (Todd, 2026-09-10):** Migrate the backend off Google Apps Script to Supabase.
Reason: Apps Script is too slow.
**Status:** PLANNING. Apps Script feature work should FREEZE except critical fixes.

---

## 1. Honest assessment: what's actually wrong (and what isn't)

### Genuinely wrong with the current backend (verified in this repo)

| Problem | Evidence |
|---|---|
| **Cold starts 10–15 s** on every idle hit | `api-config.js` sets a 30 s timeout + 3 retries specifically "Apps Script cold starts can take 10-15s". Crew stands in the field waiting. |
| **Sheets is not a database** | 216 sheets; most handlers do `getDataRange().getValues()` — full-table scan per request; `LockService` serializes ALL writes; 6-min execution cap; quota ceilings. Gets slower every season as rows grow. |
| **148,589-line single file, ~600 actions, one dispatcher** | `MERGED TOTAL.js`. No tests, no types, all-or-nothing deploys, and a deploy footgun so bad it's a standing rule ("NEVER run bare clasp deploy"). |
| **Weak auth** | PIN + token in localStorage, no row-level security, `action` whitelist as the main gate. |
| **Fragile ops** | LOG_Weather auto-logger silently dead since 2026-04-05; 5 duplicate morning-brief generators; hardcoded API keys (P0). |

### NOT wrong — do not lose in the rewrite

- **The business logic.** Succession math, GDD predictions, CSA cycles, routing,
  pick/pack, priority scoring, compliance workflows — years of decisions encoded in
  those 2,795 functions. The *runtime* is slow; the *logic* is the farm. **Port it,
  don't reinvent it.**
- **The data contracts.** 40+ frontend pages depend on exact response shapes
  (`DATA_CONTRACTS.md`, Cross-System Verification Matrix in CLAUDE.md).
- **Things Apps Script does for free** that need explicit replacements:
  time-driven triggers (→ `pg_cron` / Supabase scheduled Edge Functions),
  native Gmail/Calendar/Drive access (→ Google APIs with OAuth from Edge Functions
  or the Railway service), Sheets-as-UI habits (→ transition sync, below).

## 2. The head start we already have

1. **Supabase is already in production.** `apps/csa-portal` (Astro): ~28 tables
   (`customers`, `members`, `pickup_locations`, `box_*`, `delivery_*`, `vendors`,
   `flex_*`, `referrals`, `shopify_*_sync`, `audit_log`…), typed
   `database.types.ts`, tests, admin RPCs (`is_admin_caller`), Shopify sync state.
   The migration **extends this project** — one Postgres for the whole farm.
2. **`api-config.js` is the single choke point.** Every page reads `MAIN_API` from
   one file. That's the seam.
3. **Railway node service already exists** (`NEW_API`) for anything that doesn't fit
   an Edge Function (long-running jobs, websockets).

## 3. Strategy: strangler with an action-compatible gateway (NOT big-bang)

A big-bang rewrite of 600 endpoints + 276k lines of frontend is the failure mode.
Instead:

**Build ONE Supabase Edge Function (`/functions/v1/api`) that speaks the exact same
contract as Apps Script** — `?action=X&params` GET, `{action, ...}` POST, same JSON
response shapes. Internally it routes per action:

- migrated action → Postgres query / RPC
- not-yet-migrated action → HTTP proxy to the old Apps Script URL (transparent)

Then:
- Frontend migration = **one line change in `api-config.js`** (`MAIN_API` → the
  gateway URL). All 40+ pages keep working day one; every action starts fast the
  moment it's ported server-side. Zero frontend churn, no page-by-page rewrites.
- Retire the proxy path action-by-action. Progress is measurable: "412/600 actions
  native."
- Auth: gateway accepts the existing PIN/token flow initially; move to Supabase Auth
  + RLS per module as it's ported.

## 4. Phases

### Phase 0 — this/next week (no code risk)
- [ ] Freeze new Apps Script features (critical fixes only).
- [ ] **Measure real usage:** log/count which of the ~600 actions are actually called
      (Apps Script logs or gateway proxy logs). Expect ~20% of actions = ~80% of traffic.
- [ ] Export all 216 sheets to CSV (schema archaeology + backup).
- [ ] Stand up the gateway Edge Function in the existing Supabase project in
      pure-proxy mode; point a test page at it; verify parity.

### Phase 1 — hot paths (target: weeks, not months)
Port the actions where slowness hurts daily, with their tables:
- [ ] Auth (`authenticateEmployee`, sessions) → `users` table + RLS
- [ ] **employee.html paths**: timeclock, task queue, harvest logging, scouting
      (`timeclock`, `unified_tasks`, `harvest_log`, `scouting_reports`)
- [ ] Reference data: `crops`, `beds`, `fields`, `crop_profiles` (read-heavy, cache-friendly)
- [ ] index.html morning-brief read path (consolidate the 5 generators into ONE — the
      migration is the moment to kill the duplicates, not port them)
- [ ] Cutover per module: freeze sheet → import CSV → flip gateway route → verify.

### Phase 2 — sales & operations
- [ ] Wholesale/chef orders, standing orders, pick/pack, delivery routing —
      **join up with the CSA portal's existing tables** (`customers`, `vendors`,
      `delivery_routes`, `delivery_stops` already exist — extend, don't duplicate).
- [ ] Inventory systems (consolidate the 11 inventory sheets into a sane schema).
- [ ] Planning/succession (`PLANNING_2026` → `plantings` with real relations).

### Phase 3 — long tail + integrations
- [ ] Marketing, finance, satellite, IPM modules as prioritized by Phase-0 usage data.
- [ ] Each external integration (Twilio, Shopify [sync already exists in Supabase],
      Plaid, QuickBooks, Ayrshare, Anthropic…) → Edge Function or Railway job;
      secrets to Supabase Vault / env — **this kills the P0 hardcoded-key issue.**
- [ ] Scheduled jobs → `pg_cron` + scheduled Edge Functions (replaces Apps Script
      triggers — and unlike LOG_Weather, they're monitorable).

### Transition comforts & decommission
- [ ] Optional nightly Postgres→Google Sheets export for modules mid-transition, so
      spreadsheet views keep working until admin UIs cover them.
- [ ] Apps Script goes read-only when the last route is native; archive after 90 days.
- [ ] `SYSTEM_INVENTORY.md` updated at every phase gate.

## 5. Risks / rules

1. **Port behavior, not bugs:** every migrated action needs a parity check against the
   old response (golden-file tests from real captures) — the Cross-System Matrix in
   CLAUDE.md tells you which pages to verify.
2. **Consolidate on the way through** (morning briefs ×5, inventories ×11) but only
   with a parity shim so frontends don't break.
3. **Don't migrate dead code:** anything with zero calls in Phase-0 measurement gets
   archived, not ported. Expect this to be a LOT of the 600.
4. **RLS before exposure:** the anon key ships to browsers; no table goes
   frontend-accessible without RLS policies (CSA portal already models this).
5. **One Postgres:** resist a second Supabase project. Farm ops + CSA share
   customers, orders, deliveries.

## 6. Success metrics

- p50 API response < 300 ms (vs multi-second + 10–15 s cold starts today)
- Zero all-or-nothing deploys; per-function deploys with types + tests
- Actions native vs proxied counter → 100%
- 216 sheets → target well under 60 tables
