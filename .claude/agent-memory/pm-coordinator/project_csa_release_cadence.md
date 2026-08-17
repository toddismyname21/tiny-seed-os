---
name: csa-release-cadence
description: CSA flex + traditional box item lists release on Fridays; Week 1 of summer 2026 = Week A = Wed June 10 (labeling, not logic, fix)
metadata:
  type: project
---

**UPDATED 2026-06-08 (supersedes the Friday note below):** The flex ordering window **OPENS Thursday and CLOSES Tuesday 7:00 AM** for that week's Wednesday delivery. **Week 1 is a one-time exception: flex cutoff Tuesday June 9, 6:00 PM** (page launching late). (Earlier "release Fridays" superseded.)

**Pickup-time semantics (Todd 2026-06-08):** At regular stops, the listed time = **when the share ARRIVES**; members get a **TEXT when it arrives**. EXCEPTION — **farmers' markets** (South Side, Bloomfield, Sewickley, Lawrenceville): shares are **available during market hours**.

**South Side Market is a pickup option for EVERYONE** (not just Allison Park): 2120 Jane St, Pittsburgh 15203, Sundays 10–2, May–Sept (already a `pickup_locations` row; must be selectable in member picker).

**Oakmont CSA location CHANGED** to Pittsburgh Taco Boys (319 Maryland Ave, Oakmont PA 15139, 412-407-3884) — DONE 2026-06-08.

**ALL pickup time windows CLEARED 2026-06-08 (Todd: "don't have times unless you can confirm the hours").** Every `pickup_locations.time_start/time_end` set to NULL — delivery stops, markets, AND farm pickup. None were confirmed accurate (Highland Park showed an inaccurate "4–6:30"). With null windows, `formatPickupTimeRange` returns '' and the display falls to text-on-arrival copy. **Caveat:** markets now also show "text on arrival" (slightly wrong) until real hours are loaded. **DONE 2026-06-08:** all 15 active stops configured with member-facing `pickup_instructions` + windows. Member-facing `pickup_instructions` column (migration 0040) displays on confirm-pickup/pickup/dashboard; host name+phone shown via `HostNote.astro` with a "respect your host / pick up in your window" note (host_phone shown except Squirrel Hill where Pete wants it private → members routed to Todd 717-725-5177). Most Wed stops = text-on-arrival porch/garage drops; some have a close time in the instructions (Highland Park/Bryant St Market 8pm, Oakmont/Taco Boys 7:30, North Side/Mayfly 8pm no-multi-day-holds). Real windows set on: Rochester farm (Wed 11-8, bottom of barn), Lawrenceville (Tue 3-7), Bloomfield/Sewickley markets (Sat 9-1), South Side (Sun 10-2). Deactivated dupes: St. Paul's, Bloomfield(Wed), Sewickley(CSA). TO CONFIRM: Lawrenceville address (115 41st St Bay 41), North Park host phone (Heather 412-370-1815). Lots of customer phone records are placeholder (farm's own # 717-725-5177) — cleanup pass needed for the text-on-arrival promise to work.

**Allison Park consolidation DONE 2026-06-08:** St. Paul's UMC retired; all Allison Park members (St. Paul's + 21 unassigned-TBD) moved to **Simon's Farm Stand** (4312 Middle Rd, Wed 4:00–6:30). If Simon's doesn't work, members may request home delivery or pick another stop. Script: `scripts/allison_park_to_simons.py`.

---
(historical) Flex portal items AND traditional CSA item lists were originally to release on **Fridays** (Todd 2026-06-07) — superseded by the Thursday-open/Tuesday-close cadence above.

**Week labeling — DO NOT map A/B to a calendar-month position (Todd corrected me 2026-06-08):** Week A/B is pure **every-other-week parity anchored to the first delivery**, NOT "1st & 3rd vs 2nd & 4th Wednesday of the month." Week 1 = **Week A = Wed June 10, 2026**, which is the *2nd* Wednesday of June. Across the season Week A lands on the 2nd, 4th, 2nd, 4th, 1st, 3rd, 1st, 3rd, 5th Wednesday — it drifts because **months have 4 OR 5 Wednesdays**, so no fixed month-position label is ever correct. Code is right: `cycle.ts` anchors Mon 2026-06-08 = parity 0 = Week A → 6/10=A, 6/17=B, 6/24=A… (proven: `cycle.test.ts` + `schedule.test.ts`, 25/25, and a manual date dump 2026-06-08). Live member copy already says "**every other Wednesday**" (account hub + `biweekly-schedule.astro`) — the only remaining "1st & 3rd" strings are comments noting the old copy was deleted.

**Why:** I had been describing Week A as "1st & 3rd Wednesdays" in comms/summaries — flatly wrong and confusing to members. The whole point of A/B is alternating weeks from season start, immune to how many Wednesdays a month has.

**How to apply:** (1) NEVER say "1st & 3rd" / "2nd & 4th Wednesday." Say "**every other Wednesday**" and, when specifics are needed, give the **actual dates** (Week A: Jun 10, 24, Jul 8…; Week B: Jun 17, Jul 1, Jul 15…). (2) Label the cycle week explicitly as **"Week A"/"Week B"** + real dates — never "first/second Wednesday of the month." (3) Flex/box release + comms cadence = Thursday-open / Tuesday-7am-close (see top of file). Related: [[project_csa_operations_admin]], [[project_csa_flex_store_credit]], [[project_weekly_schedule]].
