# FARM JOURNAL — Tiny Seed Farm

A running log of significant farm events — weather, damage, disease/pest outbreaks,
equipment failures, decisions, and what we learned — so problems become lessons
instead of repeats.

## How to use this journal

- **One entry per event**, newest first. Copy the template below.
- Log the event **the day it happens** (or as soon as known). Add the "What we learned /
  changed" section later if needed — but come back and fill it in.
- Severity: `LOW` (note for the record) · `MED` (cost time or money) · `HIGH` (crop/field
  damage, safety, major loss).
- Cross-link: photos in Drive, related docs in `docs/`, scouting reports, weather data
  (`web_app/rain-history.html` charts daily rainfall for the farm).
- Categories: `WEATHER`, `EROSION`, `PEST`, `DISEASE`, `EQUIPMENT`, `IRRIGATION`,
  `CROP-LOSS`, `SAFETY`, `DECISION`, `OTHER`.

### Entry template

```markdown
## YYYY-MM-DD — Short title  [CATEGORY · SEVERITY]
**What happened:**
**Conditions:** (weather, soil state, what was in the field)
**Impact:** (fields/beds affected, estimated loss, time cost)
**Immediate response:**
**What we learned / changed:**
**Links:** (photos, docs, related entries)
```

---

## 2026-09-10 — Erosion response actions started  [EROSION · MED]
**What happened:** Began emergency response to the Sep 3 erosion event (see entry below).
**Immediate response:** Action plan created at `docs/EROSION_ACTION_PLAN_2026-09.md`
(emergency cover cropping, rill/gully repair, wattles, NRCS/Conservation District
contacts, REAP cost-share, Ag E&S plan compliance). Rainfall history page added at
`web_app/rain-history.html` to track precipitation against field operations.
**What we learned / changed:** Adopting the standing rule — never leave tilled ground
bare going into forecast rain; till only what gets planted or covered within days.
2027 plan: contour strip tillage + bed-by-bed cover cropping (details in the action plan).
**Links:** `docs/EROSION_ACTION_PLAN_2026-09.md`

## 2026-09-03 — Severe erosion on sloped fields after extreme rain  [EROSION · HIGH]
**What happened:** Evening thunderstorms dropped ~2–2.5″ of rain in under an hour
across the Pittsburgh region; flash-flood warnings covered eight SW-PA counties
including Beaver. Runoff cut rills and gullies through recently tilled sloped fields
and washed topsoil downslope.
**Conditions:** Fields freshly tilled and largely bare. Ground already saturated —
August 2026 was Pittsburgh's wettest August on record (7.62″ at PIT, +4.10″ above
normal), so the storm hit soil with no remaining absorption capacity.
**Impact:** Rill/gully erosion and topsoil loss on sloped tilled ground (extent to be
mapped and photographed — see action plan step 1).
**Immediate response:** See `docs/EROSION_ACTION_PLAN_2026-09.md` — triage walk +
photos, emergency cereal rye/oats seeding before next rain, straw mulch on repairs,
wattles on contour, calls to Beaver County Conservation District (724-378-1701) and
NRCS (724-482-5297).
**What we learned / changed:** Bare tilled slopes + saturated ground + convective
storm = guaranteed erosion. The tillage system, not the storm, is the controllable
variable.
**Links:** rainfall chart `web_app/rain-history.html`; sources in the action plan.

## 2026-04-05 — Weather auto-logger stopped (system)  [EQUIPMENT · LOW]
**What happened:** The daily weather auto-logger writing to the `LOG_Weather` sheet
(Date / Max_Temp_F / Min_Temp_F / Precip_Inch / GDD, "Auto-Logged") recorded its last
row on 2026-04-05. Discovered 2026-09-10 while pulling rain history for the erosion
event — no farm-logged precipitation data exists for the record-wet August.
**Impact:** 5-month gap in the farm's local weather record.
**Immediate response:** Logged as a known issue in `SYSTEM_INVENTORY.md`. Fix is to
re-enable the Apps Script time-driven trigger for the weather logging function
(requires Apps Script editor access — check Triggers for a failed/removed trigger).
**Links:** `SYSTEM_INVENTORY.md` → Known Issues.
