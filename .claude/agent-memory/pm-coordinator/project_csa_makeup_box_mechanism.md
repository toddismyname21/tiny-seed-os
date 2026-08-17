---
name: csa-makeup-box-mechanism
description: How to add/move a CSA box onto a specific week's pack sheets so it PERSISTS in the resolver, and how to prove it
metadata:
  type: project
---

To put a member on a specific week's pack sheets (stop-manifest / pack-check / labels), you must change the DATA the resolver reads — `resolveCycle` in `src/lib/cycle.ts` is the single source of truth for who gets a box. Editing nothing else (no UI, no manual list) will persist; the pack sheets are 100% derived from `resolveCycle`.

**Why:** Todd's hard rule — "I shouldn't be able to tell you to do something, you say it's done, and it doesn't persist in the system." A make-good that isn't in the resolver is invisible to the crew and the box never gets packed. (Origin: Diane White make-up, 2026-06-18.)

**How a box lands on an off-parity / extra week — the "move-in":**
- A `vacation_holds` row with `disposition='move'` + `move_to_week=<MONDAY/week_starting of target week>` makes the resolver **move the member IN** to that target week (even on a biweekly off-parity week), tagged `moved_in:true`. The member is EXCLUDED from any week their `[start_date,end_date]` overlaps.
- `move_to_week` stores the **Monday (week_starting)**, NOT the Wednesday delivery date (resolver compares it to its `week_starting` key with no math). E.g. Wed Jun 24 2026 → `move_to_week='2026-06-22'`.

**OPS make-up of an ALREADY-MISSED (past) box — do NOT use the RPC:**
`schedule_vacation_hold` (the member self-serve path) is wrong for this because it (1) rejects a past origin week (`start_date_in_past`, it requires `p_start_date >= CURRENT_DATE`) and (2) CHARGES a vacation week (`vacation_weeks_used += _vacation_member_weeks_in_range`). A make-up must not consume the member's box budget. Instead **INSERT the `vacation_holds` row directly** (service role): `disposition='move'`, `move_to_week`=target Monday, `start_date/end_date` = the MISSED past week, `status='scheduled'`, and **do not touch `members.vacation_weeks_used`**. Set start/end so they overlap ONLY the missed week and NOT any future week the member should still receive — that keeps it ADDITIVE (a make-up), not a reschedule. (Diane: hold 2026-06-15..06-21 → move_to_week 2026-06-22; she still got her normal Jul 1 Week-B box.)

**Verification (mandatory, the real resolver — not a guess):** write a temp `*.ts` INSIDE `apps/csa-portal/` (so node_modules + relative `./src/lib/cycle.ts` resolve), build your own `createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` from `.env` (DON'T import `src/lib/supabase.ts` — it uses `astro:env` and only runs in the Astro runtime), `await resolveCycle(sb, '<targetMonday>')`, and assert the member is in `cycle.members` with `moved_in=true` at the right `byStop` key. Also run it for the member's NORMAL future week to prove the box wasn't rescheduled away. Run with `npx tsx`, wrap in `async function main(){...}` (no top-level await — tsx emits cjs), then delete the temp file. Related: [[addon-dedup-by-type]], builder memory `csa-vacation-disposition`.

**Gap:** there is no admin UI for an ops make-up/extra box — it's a manual direct insert today. Candidate to build (admin "add make-up box for member on week X").
