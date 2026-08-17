---
name: csa-ops-admin-phase1
description: CSA Operations Admin Phase 1 — the single-cycle Fulfillment Cycle model, resolveCycle architecture, Avery 5164 dims gotcha, swap_credits backfill semantics.
metadata:
  type: project
---

CSA Operations Admin Phase 1 shipped to `csa-migration` 2026-05-27 (commit 641d6f7).
The whole back-office back end for harvest/pack/distribute keys off ONE central
abstraction; the rules below are what's load-bearing for future Phase 2/3 work.

**One cycle per week (locked decision, 2026-05-27).**
- `cycle_code` is CHECK-limited to `'WEEKLY'` across all 8 new tables. Mon 6 AM
  cutoff covers Tue + Wed + Sat distributions in one cycle.
- **Why:** Todd's locked call — vendor lead time is 1 week, one vendor delivery
  per week, simpler ops. The spec's earlier "Mon" + "Thu" two-cycle model was
  superseded by the §0 "Decisions locked 2026-05-27" header at the top of
  CSA_OPERATIONS_ADMIN_SPEC.md.
- **How to apply:** when relaxing to multi-cycle later, the migration is a
  CHECK relaxation + a new index — no application rewrite needed.

**resolveCycle is the single source of truth.**
- `src/lib/cycle.ts::resolveCycle(supabase, weekStarting)` runs LIVE on every
  page request (no cache). All 7 admin Phase-1 pages call it and slice the
  returned object — they NEVER hit the DB directly for aggregations.
- Returns: `members[]` (active, biweekly-and-hold filtered), `excluded_biweekly[]`,
  `excluded_on_hold[]`, `byStop` Map (incl. sentinel `'home_delivery'` bucket),
  `byDistributionDay` Map (Tue/Wed/Sat — home delivery defaults to Wed),
  `boxCompositionByMember`, `addOnTotals` (per type × weekly/biweekly),
  `flexOrderTotals`, `totalsByStop`, `activeStops` (sorted day → name).
- **Why:** spec §5.1 requires a hold submitted at 5:59 AM Mon to be reflected
  everywhere by 6:30 AM with no jobs to re-run. Live resolution achieves this
  at the data layer.
- **How to apply:** ANY new report page must call `resolveCycle()` and read
  from that object. Do NOT add a second `from('members').select(...)` query
  side-by-side — it breaks the biweekly/hold guarantees.

**Biweekly is a query-level rule, not a display filter (spec §5.2).**
- `isMemberOnThisWeek(member, weekStarting)` is pure / deterministic — parity 0
  (Week A) = aligns with anchor Monday 2026-06-08 (the first CSA Wed of the
  season). Even week-offsets from anchor = Week A; odd = Week B.
- `null biweekly_week` → always TRUE (unassigned members still ship).
- `cycle.test.ts` includes the 16-week sweep proving A and B together cover
  every week exactly once.
- **Why:** the previous Apps Script architecture filtered biweekly at display,
  which silently dropped ~5% accuracy by CSA day. Query-level keeps it perfect.

**swap_credits initialization semantics (spec ambiguity resolved).**
- Spec brief said "weekly large/small ⇒ 6; biweekly small/family ⇒ 3" but per
  migration 0018 EVERY member is biweekly. Implemented the INTENT (size drives
  credits): large bucket → 6, small/unknown bucket → 3, non-summer → 0 (preserved).
- `scripts/migrate-csa/init_swap_credits.py` is idempotent (re-run = 0 updates).
  Live state: 130 summer_veg = 35 × 6 + 95 × 3 = 495 credits total. Non-summer
  legacy credits preserved (76 members at 5).
- **Needs Todd to ratify the size-drives-credits interpretation.**

**Avery 5164 dimensions — the task brief was wrong; standard is right.**
- Brief said "3.33" × 4"" with side margin 0.16" / col gap 0.16" — those don't
  arithmetically fit on 8.5" Letter.
- VERIFIED standard: 4" WIDE × 3.33" TALL, 6 per Letter, top 0.5", side 0.156",
  col gap 0.188", row gap 0". Math: 2×4+2×0.156+0.188 = 8.5" ✓ ; 3×3.33+0.5+0.51
  = 11" ✓.
- `src/pages/admin/labels/[...slug].astro` implements those exact dims in CSS via
  `--label-w: 4in / --label-h: 3.33in` and prints with `@page Letter portrait
  margin 0`.
- **How to apply:** if a tester reports labels mis-aligned on real Avery 5164
  paper, check the print dialog — browser must be Letter / Portrait / Scale 100%.
  Margins None or Default.

**Add-on type / frequency comes from members.notes (Phase 1 caveat).**
- The migrated Shopify product titles ("2026 Mushroom CSA Add-On - Bi-weekly")
  carry both signals. `deriveAddon(notes)` greps for the type + frequency words.
- ~25 of 64 add_on members have generic notes ("Shopify Order #12345") and
  derive as `type='unknown'`, `frequency='unknown'`. These count into the
  `addon.unknown` bucket on the manifest cover.
- **Phase-2 fix:** add structured `addon_type` + `addon_frequency` columns to
  members (or split into a member_addons join table).

**Per-stop manifest flex-balance batching.**
- `getFlexBalance(email)` is a live Shopify GraphQL round-trip. On a single
  per-stop view (~10-20 members) we call it per-member with `MAX_PARALLEL=8`.
  On "print all stops" (~190 members) we still do this — Shopify allows ~50
  req/sec on Admin API, so we're well under the limit.
- **fail-soft per member:** any failure → null balance → row renders "—".
  Never blocks the page.

**Pack-day dashboard redirects straight to the upcoming cycle.**
- `/admin/pack-day` (no week) → 303 redirect to `/admin/pack-day/<upcoming-mon>`.
  Pack day is THE first thing Todd opens; making him pick a week is friction.
- **How to apply:** don't add a week-picker landing for /admin/pack-day —
  /pack-day/<week> handles all interaction.

See also: [[csa-portal-build-gotchas]] (database.types is hand-maintained, every
new table needs a hand-added Row/Insert block), [[pre-flight-check-quirks]]
(save.ts + send.ts now whitelisted in REST_VERB_BASENAMES after this commit).
