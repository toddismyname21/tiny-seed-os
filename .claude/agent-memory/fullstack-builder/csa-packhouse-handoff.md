---
name: csa-packhouse-handoff
description: End-of-day pack-house shift handoff feature — tables, RLS/grant convention, carry-forward model, resolveCycle-safe pattern, native accordion.
metadata:
  type: project
---

Pack-house END-OF-DAY HANDOFF feature (migration 0066, built 2026-07-03). Spec: `docs/research/PACKHOUSE_HANDOFF_RESEARCH_2026.md`. Pack crew works Mon/Tue/Thu; FIELD crew takes the pack house Fri for weekend markets — fill at end of day, read at start of next.

**Why:** "the person working the pack house one day doesn't know what happened yesterday." Highest-risk transition is Tue-pack → Thu-field (2-day gap + crew change), so unresolved items carry forward across ALL prior days.

**How to apply / key facts:**
- Two tables: `packhouse_handoff` (one row per shift, UNIQUE(log_date, crew_type) → save endpoint upserts on that key) and `packhouse_open_items` (OPEN while `resolved_at IS NULL`; `created_date` defaults to `America/New_York` today, NEVER UTC; digest ages them, escalates at 3+ days).
- Carry-forward is INSERT-only in the fill form (Block F "add items"); items are RESOLVED on the read-side digest via `/api/admin/handoff/resolve-item`, never re-edited in the form → prevents edit-dupes.
- Pages: `/admin/handoff` (read digest + landing), `/admin/handoff/new` (7-block fill). APIs under `/api/admin/handoff/{save,resolve-item,ack}.ts`.
- TABLE grant convention (verified): NO explicit GRANT in table migrations (0043/0054/0061) — Supabase default privileges + RLS `is_admin_caller()` FOR ALL policy ARE the gate. This DIFFERS from FUNCTION migrations (0065) which MUST REVOKE-from-PUBLIC/anon/authenticated then GRANT service_role. See [[csa-wholesale-manual-order]].
- `is_admin_caller()` (migration 0017) returns TRUE for BOTH `admin` AND `staff` roles — pack crew (staff) passes.
- `database.types.ts` is hand-maintained: EVERY new table needs an entry there or `supabase.from('newtable')` throws new astro-check errors. Adding your own tables is part of the feature even when a task's "only touch" list omits it.
- ET-today helper for pages: `todayET` from `lib/delivery` (the admin-page convention; also in account.ts). `currentDeliveryWeek()`/`mondayOfWeek()`/`prettyShortDate` from `lib/cycle`. cycle.ts's own `todayET` is private/unexported.
- `resolveCycle()` CAN THROW (schema errors) — when calling it just for a pre-fill hint (e.g. CSA box-count target), wrap in try/catch and fall back to blank; never block a form on it.
- Progressive disclosure uses native `<details name="handoff-block">` (exclusive accordion in modern browsers, degrades to independently-openable with zero JS). Voice-to-text = Web Speech API, mic buttons hidden unless the API exists.
- Bilingual EN/ES via `?lang=es` with inline STRINGS objects (mirrors pick-pack's `parseLang`; this feature owns its copy rather than a shared lib).
