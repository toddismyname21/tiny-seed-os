# TODO — Tiny Seed Farm OS

Working to-do list. Captured 2026-09-10 (erosion response session). Check items off
here, or tell any Claude session to update it.

## 🔴 URGENT — erosion (field work, this window)

- [ ] Walk sloped fields; photograph all rills/gullies/deposition (needed for NRCS
      cost-share + Ag E&S file). Log findings in the Field Notebook.
- [ ] Buy cereal rye (~120–160 lb/ac broadcast for bare ground), oats (90–100 lb/ac
      for early-spring beds), straw (~1.5–2 tons/ac for repairs).
- [ ] Broadcast rye on ALL bare reachable ground **before the next rain** (check
      7-day forecast on `web_app/rain-history.html`). Light rake/cultipack after.
- [ ] Intercept runoff at the top of the slope (diversion furrow or staked
      bales/wattles routed to a grassed outlet).
- [ ] Fill + compact rills/gullies (use deposited soil from slope bottom), seed
      heavy, straw mulch; wattles on contour; check dams in any channel still flowing.
- [ ] Rye seeding window: reliable to ~Oct 10 in western PA (+50% rate if later).

## 📞 CALLS & MONEY — this week

- [ ] **Beaver County Conservation District (724) 378-1701** — site visit + Ag E&S
      plan help (legally required, 25 Pa. Code §102.4, farms tilling ≥5,000 sq ft).
- [ ] **NRCS, Butler field office (724) 482-5297** — EQIP application: Cover Crop
      (340), Grassed Waterway (412), Diversion (362). Ask for a site visit and the
      current funding batch. Confirm where Beaver Co. staff actually sit.
- [ ] **PA REAP tax credits** — 50–90% of BMP costs; FY2026-27 opened Aug 1,
      first-come-first-served. Apply ASAP (district can help; Ag E&S plan writing
      ≈75% creditable).
- [ ] Full plan: `docs/EROSION_ACTION_PLAN_2026-09.md`.

## 🍂 THIS FALL

- [ ] Recheck erosion repairs after every big storm through November (reseed
      washouts, re-stake wattles, clear check dams).
- [ ] Where a gully re-forms: have NRCS design a grassed waterway; seed it this fall.
- [ ] Overseed rye/oats into standing fall crops before rain events so no bed goes
      bare after harvest.
- [ ] 2027 redesign decision (winter planning): contour strip-till + bed-by-bed
      cover crops + tarping — see plan §4. Standing rule already adopted: never till
      more than gets planted/covered within days.

## 🔧 SYSTEM — small fixes & housekeeping

- [ ] Re-enable the `LOG_Weather` daily auto-logger (dead since 2026-04-05):
      Apps Script editor → Triggers → restore the time-driven weather logging
      trigger. (Allowed despite feature freeze — it's a fix.)
- [ ] Merge branch `claude/farm-erosion-rain-analysis-4x2fx3` → main (rain-history
      page, journal, plans, this file). Ask Claude to open the PR, or merge directly.
      Merging puts the rain chart on GitHub Pages.
- [ ] Claude web sessions: environment → Network access → allow
      `api.open-meteo.com`, `archive-api.open-meteo.com`, `script.google.com`,
      `script.googleusercontent.com`, `api.weather.gov` (or "All") so future
      sessions can fetch weather/farm-API data directly.
- [ ] Delete 3 scratch files from Google Drive: `TEMP_rain_fetch_zeigler`, `…2`, `…3`.
- [ ] Add the Field Notebook to phone home screen; share with anyone who should log:
      https://claude.ai/code/artifact/c94b3049-7c6d-4c30-afc5-3be77b8555d3

## ✅ RUNNING AUTOMATICALLY — no action needed

- Field Notebook summaries (Claude Routines, email+push to owner):
  weekly Sun ~7pm ET (first: Sep 13) · monthly on the 1st · year-in-review Jan 2.
  Manage/pause in claude.ai Routines.

## 🧊 BACK BURNER — Supabase migration

Owner decision made; work paused. Apps Script feature work FROZEN (critical fixes
only). When resuming, start at `docs/SUPABASE_MIGRATION_PLAN.md`:
- [ ] Phase 0: measure real action usage; export sheets; gateway Edge Function in
      proxy mode (needs Supabase project access + network access above).
- [ ] Phase 1: auth, timeclock, tasks, harvest (employee.html hot paths).
- [ ] Phase 2: sales/orders/inventory joined to CSA tables.
- [ ] Phase 2.5: Field Notebook → `journal_entries` (import artifact db); morning
      brief reads journal; rain-history annotations from journal; summaries as
      Postgres job; crew logging without claude.ai accounts.
- [ ] Phase 3: long tail + move integration secrets to Vault (kills P0 key issue).
