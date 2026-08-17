---
name: csa-packhouse-live
description: Interactive Pack House view (live packed toggle + needed_qty + notes) reuses pick_pack_progress via a new section='packhouse'; targeted-upsert partial-update contract; print-vs-screen split.
metadata:
  type: project
---

> **SUPERSEDED for the VIEW (2026-07-20):** the `?view=packhouse` page no longer wires this interactive board — it was redesigned into a plain landscape distribution TABLE with pen checkboxes (see [[csa-packhouse-matrix-table]]). The DB table, the `section='packhouse'` machinery, and the `mark.ts`/`state.ts` API below STILL EXIST and are unchanged; the view just stopped rendering `data-pp-line` elements + `#pp-live-config` for packhouse. The 4 other views keep their live board. If re-adding packhouse interactivity, re-wire against this still-present infrastructure.

The Pack House sheet (`/admin/pick-pack/[week]?view=packhouse`) WAS interactive (migration 0083, 2026-07-15). It EXTENDS the existing live check-off table `pick_pack_progress` (0069) rather than a parallel system.

**Why:** Owner wanted the crew to (a) flag a "still need to pick/pull N more" qty (picked short / pulling from inventory), (b) leave a pack-team note, and (c) cross crops off in-app so the **Tuesday pack team picks up where Monday left off** (cross-DAY continuity).

**How to apply — the load-bearing, non-obvious bits:**
- **Distinct `section='packhouse'`** in `pick_pack_progress` (added to the CHECK in 0083). It is a PACK-style line (todo→packed). Keyed on `(week_date, section='packhouse', scope_day, market_id=sentinel, line_key)` where `line_key = pickPackLineKey('row', crop)` — the SAME `slugForKey` canonical keys the view renders, but the distinct section means packhouse progress NEVER collides with the overall `'harvest'` view. Same-week continuity is automatic.
- **Targeted-upsert partial-update contract** in `api/admin/pick-pack/mark.ts`: a packhouse write includes ONLY the field(s) the caller sent (status / needed_qty / note). PostgREST `.upsert(payload, { onConflict })` sets only the payload's columns on conflict (omitted columns preserved; defaulted on fresh insert). This is what lets a note-only save keep the packed status, a pack-toggle keep a flagged need, etc. `status` is OPTIONAL for packhouse but still REQUIRED + legal for every other section. Presence (not value) decides "touch this column" — a `null` needed_qty/note is a deliberate CLEAR (distinguishable from omitted `undefined` via zod `.nullable().optional()`).
- **Print vs screen split:** checked-state does NOT alter print (pen tick box + full list are the always-available paper fallback; the interactive toggle is `screen-only`). But `needed_qty` chips + notes ARE server-rendered into print (real pack data), 11pt floor. Server-renders the chip/note into `[data-pp-needchip]` / `[data-pp-note]` slots so print + first paint are correct with no flash; the browser controller rewrites those same nodes on save/realtime. `:empty { display:none }` cleanly hides them (incl. instant one-tap clear).
- Two `pick_pack_progress` columns added: `needed_qty numeric` (chip when >0), `note text`. No RLS/realtime change needed (0069's `is_ops_caller` policy + `supabase_realtime` publication already cover new columns). See [[csa-crew-role]] for `is_ops_caller` (requireCrew stays on both endpoints — crew phones).
- Client controller (in `[...slug].astro`): `isPackhouse` branch in `renderControl` → `renderPackControls`; `setNeeded`/`setNote` mirror `setStatus` (optimistic + revert + retry); realtime + `/state` reconcile carry `needed_qty`/`note`. Summary gained "N flagged short" + a "Flagged only" filter chip (`.pp-show-flagged` collapses `[data-flagged='0']`).
- 8 EN/ES `live.*` i18n strings added to `PICK_PACK_STRINGS` in `lib/pick-pack.ts` (need/note/flag labels; `needChip` is a `{n}` template).

Related: [[csa-unified-harvest-doc]] (the pack-day doc), [[csa-packhouse-handoff]] (a DIFFERENT feature — end-of-day handoff tables, not the pick-pack view).
