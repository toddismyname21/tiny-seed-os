# Spec — Pack Crew MONDAY Checklist (v1)

**Author:** PM_ARCHITECT · 2026-08-18 · **Scope: MONDAY ONLY.**
Source of truth for content: `apps/csa-portal/PACK_CREW_CHECKLISTS.md` (Monday = FINAL,
Todd-approved 2026-08-15). Tue/Wed/Thu are DRAFTS and are **explicitly out of scope** —
do not build them, do not stub them, do not add a day switcher.

## Why

Todd's pack crew has been missing responsibilities. The Monday list is the fix, and it
must be a live check-off surface in the portal (Todd's call 2026-08-17: "I want this
institutionalized in the csa portal"), NOT a printed PDF — the point is real-time
follow-through visibility and knowing WHO did what.

## Non-negotiable constraints

1. **DO NOT create a parallel progress system.** `pick_pack_progress` (0069, extended
   by 0083) already provides live check-off, `worked_by`, `note`, `needed_qty`,
   realtime, and `is_ops_caller` RLS. Extend it. This mirrors exactly what 0083 did
   for packhouse.
2. **DO NOT add a new nav tab.** Todd, 2026-07-06: "Building another page may not be
   the best idea. The workflow is already confusing and there are a ton of tabs."
   For CREW this REPLACES their landing page; for admin/staff it joins the existing
   ops group in `AdminShell` alongside handoff / cooler / pick-pack.
3. **Bilingual EN/ES is mandatory**, same `?lang=es` pattern as pick-pack. Two of the
   intended users are H-2A Spanish speakers.
4. **Gloved-hand mobile**: every touch target ≥ 44px, no native `confirm()`/`alert()`,
   `ts-*` design tokens, `AdminShell`.
5. Crew write from phones — the write path must go through the cookie-aware RLS client.

## 1 · Migration `0092_crew_day_checklist.sql`

Widen ONE constraint, following the exact 0083 pattern (the 0069 inline CHECK is
auto-named `pick_pack_progress_section_check`):

```
ALTER TABLE pick_pack_progress DROP CONSTRAINT IF EXISTS pick_pack_progress_section_check;
-- re-add guarded, now including 'crew_day'
CHECK (section IN ('harvest','csa','wholesale','market','packhouse','crew_day'))
```

- `scope_day` is NOT widened. Monday only; `'mon'` already exists.
- No new columns. `status`, `note`, `needed_qty`, `worked_by` all already exist.
- End with a verify SELECT proving the constraint now allows `'crew_day'`, same as 0083.
- Idempotent.

**Row identity:** `(week_date = that week's Monday, section='crew_day', scope_day='mon',
market_id = the all-zero SENTINEL, line_key = the task key)`. That is the existing
UNIQUE key — nothing new.

## 2 · `src/lib/crew-day.ts` (new)

A versioned constant, in the same spirit as `CREW_SECTIONS` in `lib/pick-pack.ts`.

```ts
export type CrewDayGroup = 'morning' | 'lunch' | 'afternoon' | 'closedown';
export interface CrewTask {
  key: string;          // STABLE. Never renumber — it is the DB line_key.
  en: string;
  es: string;
  group: CrewDayGroup;
  flaggable?: boolean;  // shows the "missing item" control (task mon.lunch.tell_ben)
}
export const MONDAY_TASKS: readonly CrewTask[];
```

Content — verbatim from `PACK_CREW_CHECKLISTS.md`, keys as given:

| key | group | EN |
|---|---|---|
| `mon.am.harvie` | morning | Harvie order — FULLY packed |
| `mon.am.market_wagon` | morning | Market Wagon order — FULLY packed |
| `mon.am.food_bank` | morning | Tuesday food bank order (when there is one) — FULLY packed |
| `mon.lunch.tell_ben` | lunch | Missing ANY item for a Monday-pack order? Tell Ben AT LUNCH so it gets harvested in time — not discovered at 4pm |
| `mon.pm.wholesale` | afternoon | Pack as much of the wholesale orders as possible |
| `mon.pm.market_pallet` | afternoon | Market pallet built & ready for Lawrenceville Market |
| `mon.pm.lville_csa` | afternoon | Lawrenceville Market CSA boxes packed |
| `mon.eod.cooler_map` | closedown | Cooler map accurate — cooler contents match the map, period |
| `mon.eod.ben_checkin` | closedown | Check in with Ben → tomorrow morning's harvest list is accurate before leaving |
| `mon.eod.tables` | closedown | Stainless tables wiped down |
| `mon.eod.scales` | closedown | Scales stored with their own power cords |
| `mon.eod.compost` | closedown | Compost out |
| `mon.eod.packhouse` | closedown | Packhouse = cleanest area on the farm: floors swept/squeegeed, trash out, dirty bins washed & stacked, drains clear, nothing left on work surfaces |

`mon.lunch.tell_ben` has `flaggable: true`.

Spanish: write real, plain farm Spanish — NOT machine-literal. Follow
`PACKHOUSE_HANDOFF_RESEARCH_2026.md` §5.2 (consensus translation, not direct).
Group headings need ES too.

**Ordering:** morning → lunch → afternoon → closedown. The order is the workflow.

## 3 · Endpoint — extend `src/pages/api/admin/pick-pack/mark.ts`

Do NOT write a new endpoint. Extend the existing one, which already has
`isSameOriginPost` + `requireCrew` + the targeted-upsert contract:

- `section` zod enum gains `'crew_day'`.
- `crew_day` behaves like `packhouse` for the **targeted partial-update contract**:
  `status`, `needed_qty` and `note` are each independently settable, and an omitted
  field must NOT be clobbered. A note-only save keeps the check; a check keeps the flag.
- Legal `crew_day` statuses: `'todo' | 'done'`. Reject `harvesting`/`packed` for this
  section with the same per-section validation style already there.
- `status` is OPTIONAL for `crew_day` (flag-only / note-only saves), same as packhouse.
- `actual_qty` is meaningless here — reject or ignore consistently with how the file
  already treats it for non-harvest sections.
- Update the file's header doc comment. It is the contract; keep it accurate.

## 4 · Page — `/admin/checklist`

- New route `src/pages/admin/checklist/index.astro`.
- Add `'/admin/checklist'` to `CREW_ALLOWED_PREFIXES` in `src/middleware.ts` and set
  `CREW_HOME = '/admin/checklist'`. **Verify no redirect loop** — `CREW_HOME` must
  itself be inside the allowlist (the file already warns about this).
- Renders the Monday list grouped by the 4 groups, headings in the active language.
- **Only meaningful on Monday.** On other days still render (crew may finish late /
  Todd may look on Sunday) but show a clear, calm banner naming the Monday it is
  writing to. Do not silently write to the wrong week.
- Week = `currentDeliveryWeek()` (already Monday-of-week). Do not invent date maths.
- Each row: big checkbox (≥44px), task text, and when done a quiet
  "✓ <name> · <time ET>" from `worked_by` / `updated_at`.
- Progress meter at top: "N of 13 done" + `aria-label`, matching the pick-pack pattern.
- Optimistic update + revert on failure + retry, mirroring the existing pick-pack
  controller. Realtime subscribe so two people packing see each other's checks.
- `?lang=es` toggle, same mechanism as pick-pack.

### The lunch escalation — the highest-value element

`mon.lunch.tell_ben` is not a normal checkbox. It is the mechanism that turns a 4pm
disaster into a lunchtime fix, so build it as a real control:

- A "⚠️ Flag a missing item" button on that row.
- Opens an inline (NOT native) form: item text + optional quantity.
- Saves to that row's `note` (item) and `needed_qty` (qty) via the extended endpoint.
- Once flagged, the row shows the flag prominently in amber and stays visible —
  checking the box does NOT hide it.
- Multiple items: append into `note` with a newline; do not overwrite a previous flag.
- Flag count is surfaced in the page header ("⚠️ 2 items flagged for Ben").

v1 is **portal-only** — no SMS. Twilio's A2P campaign has never worked reliably and a
notification that silently fails is worse than none. Ben is `staff` and can open the page.

## 5 · Out of scope for v1 — do not build

- Tuesday / Wednesday / Thursday lists (drafts, awaiting Todd).
- Friday (field crew — no list exists).
- Any admin UI for editing task text (it lives in `crew-day.ts`; a text change is a
  2-line PR).
- Crew invites (Todd: after it's built).
- Text/push notification to Ben.

## Acceptance criteria — evidence required, not assertions

1. `npm run build` completes with 0 errors.
2. `npx astro check` shows **zero NEW** errors against the current baseline. State the
   baseline count you measured and the count after.
3. Migration 0092 applied, and the verify SELECT output pasted showing `'crew_day'`
   is allowed.
4. A crew_day row round-trips: check → uncheck → note-only save → confirm the check
   state survived the note save (this is the targeted-upsert contract; prove it).
5. Middleware: prove a `crew` user reaching `/admin/checklist` is NOT redirected, and
   that `/admin/members` still bounces them.
6. Both languages render — paste the ES group headings and 3 ES task strings.
7. `CHANGE_LOG.md` updated.
8. Do NOT deploy. PM verifies and coordinates the deploy.
