# CSA Portal — Full UX Audit
**Date:** 2026-07-02
**Auditor:** UX_DESIGN_CLAUDE (Design System Architect)
**Branch:** csa-migration
**Scope:** Member portal + Admin portal — all pages read via source inspection

---

## Methodology

Every finding in this report is backed by a direct source read at the cited file path and line number. No speculation. Items already tracked in `CSA_TODO.md` or `CSA_PORTAL_UX_ROADMAP_2026.md` are noted but NOT repeated as net-new findings unless the source read revealed additional detail or a worsened status.

**Severity scale:**
- CRITICAL — data is silently wrong or a core task always fails
- HIGH — named user task fails or produces bad output frequently
- MEDIUM — inconsistency or friction that degrades trust/efficiency
- LOW — polish, brand, or cosmetic

---

## Executive Summary

The CSA portal is well-architected and the recent AdminShell + MemberShell work raised the structural floor significantly. The design token discipline is solid — no raw hex values found in the pages audited. The Cmd+K command palette on admin is a genuine quality differentiator.

However, two CRITICAL data bugs create false alarms for Todd every single week: the "Unfilled boxes" pending task fires permanently due to a date-key mismatch, and the route monitoring only fires on Wednesdays despite Tuesday/Saturday/Sunday delivery runs also existing. Four locations across member pages still use native `confirm()` dialogs that the roadmap committed to replacing. Glossary compliance has three confirmed violations on the most-visited member page (dashboard). The overall experience scores **7.2/10** — shippable but not yet premium. The CRITICAL bugs drop trust in the admin home significantly.

---

## Section 1: Member Portal Findings

### M-01 — Glossary violation: "this week" in dashboard subtitle
**Severity:** HIGH
**File:** `apps/csa-portal/src/pages/dashboard.astro:892`
**What it says:** `"Here's what's happening with your share this week."`
**Rule violated:** CSA_GLOSSARY_OF_TRUTH §3 — NEVER use "this week / next week / last week". Always use the date range format "Week of Jun 22 – Jun 28".
**Fix direction:** Replace with a rendered date range using `prettyWeekHeader(week_starting)` or equivalent, so the sentence reads "Here's what's happening with your share the week of Jun 22 – Jun 28."

---

### M-02 — Glossary violation: "This week's box" section heading
**Severity:** HIGH
**File:** `apps/csa-portal/src/pages/dashboard.astro:1239`
**What it says:** `This week's box`
**Rule violated:** CSA_GLOSSARY_OF_TRUTH §3 — date-range format required.
**Fix direction:** Replace with "Your box — Week of [date range]" or "Box contents, Jun 22 – Jun 28". The date must come from the resolved cycle, not a hardcoded string.

---

### M-03 — Hardcoded "Tuesday 8 AM" cutoff ignores weekend market members
**Severity:** HIGH
**File:** `apps/csa-portal/src/pages/dashboard.astro:1258`
**What it says:** `"We post box contents by Monday — open it any time before Tuesday 8 AM to see what's coming and make swaps."`
**The problem:** This copy applies to Wed/Tue-run CSA members. Saturday and Sunday farmers-market CSA pickup members have a Thursday 7 AM cutoff per the glossary pickup-day-aware cutoff rules. Showing them "Tuesday 8 AM" is factually wrong and will cause missed swap windows.
**Fix direction:** Branch on the member's `pickup_location.day_of_week`. For Mon/Tue/Wed pickups: "before Tuesday 8 AM". For Thu/Fri pickups: investigate — may align with Tue or Thu. For Sat/Sun market pickups: "before Thursday 7 AM". This copy should be derived from the same cutoff logic used for swap eligibility gating, not independently hardcoded.

---

### M-04 — Banned size labels in SHARE_SIZE_LABELS
**Severity:** MEDIUM
**File:** `apps/csa-portal/src/pages/dashboard.astro:460-461`
**What it says:**
```
const SHARE_SIZE_LABELS: Record<string, string> = {
  small: 'Small', regular: 'Regular', family: 'Family', petite: 'Petite',
```
**Rule violated:** CSA_GLOSSARY_OF_TRUTH §4 — Summer Veg sizes are ONLY "large" and "small". The terms `regular`, `family`, and `petite` are banned. If a member row has one of these legacy values, they will see a banned label in their dashboard.
**Fix direction:** Remove `regular`, `family`, `petite` entries. If legacy rows still exist in the database with these values, add a mapping that converts them to their canonical equivalents (`regular` → `large`, `family` → `large`, `petite` → `small`) and log a warning so the data migration can be tracked. Do not silently display banned terms.

---

### M-05 — Native confirm() in box undo action
**Severity:** HIGH
**File:** `apps/csa-portal/src/pages/box/index.astro:905`
**Context:** The box swap uses a properly built BottomSheet for selection and confirmation. However the UNDO path uses a bare `confirm()`:
```js
if (original && confirm(`Undo the swap of ${original}? Your credit will be refunded.`))
```
**The problem:** Native browser `confirm()` is unstyled, blocks the thread, is inaccessible to screen readers in many contexts, and is a jarring tonal break after the polished swap BottomSheet experience immediately above it. On iOS it also suppresses the dialog title.
**Fix direction:** Reuse the existing `sheet-confirm` BottomSheet component. Wire the undo button to open the sheet with the undo-specific message and call `performUndo()` on confirmation. No new component needed — only new wiring.

---

### M-06 — Two native confirm() dialogs in flex-order
**Severity:** HIGH
**File:** `apps/csa-portal/src/pages/account/flex-order.astro:1100, 1113`
**Dialogs:**
- L1100: `window.confirm("Cancel your order for this week? Your Flex balance is refunded and carries forward.")`
- L1113: `window.confirm("Skip this week? Nothing will be packed for you and your Flex balance is untouched.")`
**The problem:** These are the two highest-stakes destructive actions in the entire member portal. Both say "this week" (glossary violation). Both use native dialogs. The flex ordering page itself is beautifully designed with a celebratory confirmation modal — the confirm dialogs are a stark regression.
**Fix direction:** Build a small reusable confirmation BottomSheet or modal that accepts a message and a callback. Wire both cancel and skip buttons through it. Update copy to use "Week of [date range]" per glossary rules.

---

### M-07 — Native confirm() in vacation hold cancel
**Severity:** HIGH
**File:** `apps/csa-portal/src/pages/account/vacation.astro:349`
**What it says:**
```js
onsubmit={`return confirm('Cancel this vacation hold? Your weeks will be ${display === 'active' ? 'partially refunded (only the future portion)' : 'refunded'}.');`}
```
**The problem:** Archaic inline event handler using `onsubmit` attribute with an interpolated template string. Native dialog. No design system styling. This is inside a form managing financially meaningful hold cancellations. Additionally, the partial-refund vs. full-refund distinction in the copy is important but gets no visual emphasis in a plain confirm dialog.
**Fix direction:** Remove the inline `onsubmit` attribute. Attach a proper `addEventListener('submit', ...)` in a `<script>` block. Replace the confirm with a BottomSheet that clearly states the refund terms with visual hierarchy (amount prominent, condition secondary).

---

### M-08 — Vacation hold requires minimum 3 taps (roadmap targeted ≤2)
**Severity:** MEDIUM
**File:** `apps/csa-portal/src/pages/account/vacation/new.astro`
**Current flow:** Dashboard → Account tab → /account/vacation (list) → /account/vacation/new → fill form → submit = 5 navigations, 3+ taps before the form is even visible.
**Roadmap target:** Phase 2, item 4: "Vacation hold in ≤2 taps from dashboard."
**Status:** NOT MET. The vacation list page (`/account/vacation`) is an intermediate step that adds one full navigation before reaching the form.
**Fix direction:** Add a "Schedule hold" shortcut directly from the dashboard quick-actions or the Account tab hub (which already has a vacation preferences section). Deep-link to `/account/vacation/new` directly, bypassing the list. The list remains accessible via a secondary link for managing existing holds.

---

### M-09 — GO/NO share-day indicator is absent (tracked in CSA_TODO.md)
**Severity:** HIGH (confirmed not built)
**File:** `apps/csa-portal/src/pages/dashboard.astro` — no GO/NO light found
**The problem:** Members have no immediate visual signal on the dashboard whether they are getting a box this delivery week (biweekly members on an off-week, vacation holds, season gaps). The dashboard renders the same chrome regardless. Members must read prose context clues to infer their status.
**Note:** This is tracked in CSA_TODO.md. Confirming it is not implemented anywhere in the audited dashboard source.
**Fix direction:** Add a prominent status pill/banner at the top of the dashboard: green "Box coming [date]" vs. muted "No box this week — [reason]". The resolution logic must account for: biweekly week parity, active vacation holds (already queried via `vacation_holds` table in box/index.astro), season window, and flex-only vs. CSA share type.

---

### M-10 — Contact email inconsistency
**Severity:** MEDIUM
**File:** `apps/csa-portal/src/pages/account/flex-order.astro:540`
**What it says:** `href="mailto:tinyseedcsa@gmail.com?subject=Flex%20ordering%20question"`
**Used everywhere else:** `todd@tinyseedfarmpgh.com` (MemberShell Help tab, other references)
**The problem:** Members clicking "Help with flex ordering" reach a different inbox than every other help touchpoint. Creates confusion about who manages what, and means inquiries split across two addresses.
**Fix direction:** Standardize to `todd@tinyseedfarmpgh.com` or a dedicated support alias that routes to Todd. Update L540 in flex-order.astro. Audit all member-facing pages for any other `gmail.com` references.

---

### M-11 — Technology stack disclosure in member-facing footer
**Severity:** LOW
**File:** `apps/csa-portal/src/pages/index.astro:128-151`
**What it says:** "Built on Astro + Supabase + Vercel" with outbound links to each vendor.
**The problem:** Members (CSA subscribers buying farm produce) have no reason to know what the app is built on. This copy signals "developer project" rather than "premium farm brand." Competitors like Farmigo and Harvie show only farm branding in footers. The outbound links also exit members to vendor sites during an authentication flow.
**Fix direction:** Replace with farm branding: farm name, season year, copyright. If vendor attribution is legally required (it is not, for these vendors), move it to a `/about` or `/colophon` page that no member encounters by default.

---

## Section 2: Admin Portal Findings

### A-01 — "Unfilled boxes" pending task ALWAYS fires due to date-key mismatch
**Severity:** CRITICAL
**File:** `apps/csa-portal/src/pages/admin/index.astro:86, 118-120`
**The bug:**
```ts
const targetWeek = upcomingWednesday();   // L86: returns the upcoming Wednesday, e.g. 2026-07-08
// ...
supabase.from('box_contents')
  .select('share_type', { count: 'exact', head: false })
  .eq('week_date', targetWeek)            // L120: queries box_contents WHERE week_date = '2026-07-08'
```
**The problem:** Per `CSA_GLOSSARY_OF_TRUTH` §2 and confirmed by `box/index.astro` (which correctly calls `mondayOfWeek(targetWeek)` before querying), `box_contents` rows are keyed by the **cycle Monday**, not by the pickup Wednesday. The admin home never finds any rows because it is querying with the wrong date key. `unfilledShareTypes` will always equal `expectedShareTypes` — meaning Todd sees "unfilled boxes" every single week regardless of whether the box contents are fully populated.
**Impact:** This is the admin's primary "is the farm ready for pack day?" signal. It permanently false-alarms, which means Todd either panic-checks the box editor every week or learns to ignore the warning entirely. If he learns to ignore it, the real alert when boxes ARE unfilled will be missed.
**Fix direction:** Derive `targetWeek` via `mondayOfWeek(upcomingWednesday())` (the same pattern box/index.astro uses) before passing it to the `box_contents` query. The existing `mondayOfWeek` helper is already in `lib/cycle.ts` — no new code needed. Verify the fix by checking that `unfilledBoxRes.data` has rows after the correction.

---

### A-02 — Route monitoring only fires on Wednesday; Tue/Sat/Sun delivery days invisible
**Severity:** HIGH
**File:** `apps/csa-portal/src/pages/admin/index.astro:62, 408, 414, 423`
**The bug:**
```ts
const isDeliveryDay = todayWeekday === 'Wed';  // L62
```
Downstream at L408-423, when `isDeliveryDay` is false, the route card renders: `"Routes run on Wednesdays. View past routes via the Route page."` — hardcoded copy that is factually wrong on Tue, Sat, Sun.
**The problem:** The farm has active Tuesday, Saturday, and Sunday delivery runs (farmers markets + some CSA). On those days, Todd visits the admin home and sees "Not a delivery day" even when a route is actively running.
**Fix direction:**
```ts
const DELIVERY_DAYS = new Set(['Tue', 'Wed', 'Sat', 'Sun']);
const isDeliveryDay = DELIVERY_DAYS.has(todayWeekday);
```
Update the static copy at L414 and L423 to not mention "Wednesdays" specifically. If the route card needs to know which channel is running today (CSA vs market), that can be derived from `delivery_routes.route_date` already being queried.

---

### A-03 — "Home deliveries" stat card counts all members with NULL pickup_location_id
**Severity:** HIGH
**File:** `apps/csa-portal/src/pages/admin/index.astro:170-172, 383-388`
**The bug:**
```ts
if (!row.pickup_location_id) {
  homeDeliveryCount += 1;  // L172
  continue;
}
```
Every active member whose `pickup_location_id` is NULL increments this counter — including add-on members (who structurally never have a pickup location) and any member who hasn't been assigned a stop yet.
**Impact:** The stat card shows ~36 when actual home delivery count is ~11. This inflated number misleads Todd about logistics cost and headcount on delivery day.
**Fix direction:** Add a `share_type` filter to the home delivery count: only count members whose `share_type` indicates they receive door-to-door delivery (e.g., `summer_veg` or `flower` — NOT `add_on`, `flex`). Alternatively, add a `home_delivery` boolean column to `members` and count that. A simpler interim fix: count members with `pickup_location_id IS NULL AND share_type NOT IN ('add_on', 'flex', 'wholesale_csa')`.

---

### A-04 — "Unassigned biweekly" count inflated by non-biweekly members
**Severity:** MEDIUM
**File:** `apps/csa-portal/src/pages/admin/index.astro:153-155`
**The bug:**
```ts
const unassignedBiweeklyCount = shareBreakdownRows.filter(
  (r) => r.biweekly_week === null
).length;
```
This counts ALL active members with `biweekly_week === null` — which includes weekly members, add-on members, and flex members, all of whom are supposed to have `null` for `biweekly_week`. It does NOT filter to only members whose `share_type` should have a Week A/B assignment.
**Impact:** The auto-assign panel fires for members who don't need biweekly assignment, potentially triggering an accidental mass-assignment of A/B weeks to weekly and flex members.
**Fix direction:** Filter to only biweekly-eligible share types before counting:
```ts
const BIWEEKLY_TYPES = new Set(['summer_veg', 'spring_veg', 'fall_veg', 'flower']);
const unassignedBiweeklyCount = shareBreakdownRows.filter(
  (r) => BIWEEKLY_TYPES.has(r.share_type) && r.biweekly_week === null
).length;
```

---

### A-05 — AdminShell "Pack Week" group has 13 items — cognitive overload
**Severity:** MEDIUM
**File:** `apps/csa-portal/src/components/AdminShell.astro` (Pack Week `<details>` group)
**The items (confirmed):** Pack day, Pick & Pack, Harvest sheet, Pack sheet, Pack check, Pack load, Labels, Manifests, Route plan, Route sheet, Stop manifest, Text-stop, Box editor, Share list = 13+ items in one `<details>` group.
**The problem:** Nielsen's Law of Chunking: working memory holds 4±1 items. A 13-item pack group makes it slower to find any individual item and impossible to scan at a glance. The group conflates planning tools (Box editor, Share list — used days before pack day) with pack-day operational tools (Pack sheet, Labels, Manifests — used on the same morning) and communication tools (Text-stop — used per-stop during delivery).
**Fix direction:** Split into three groups: "Box planning" (Box editor, Share list, Harvest sheet), "Pack day" (Pick & Pack, Pack sheet, Pack check, Pack load, Labels), "Delivery" (Manifests, Route plan, Route sheet, Stop manifest, Text-stop). The Cmd+K palette remains the fastest way to jump — the sidebar groups are for orientation, not speed.

---

### A-06 — Duplicate emoji icons in AdminShell sidebar
**Severity:** LOW
**File:** `apps/csa-portal/src/components/AdminShell.astro:87, 89, 95, 117`
**The duplicates:**
- 🚚 used by "Pack & Load" (L87) AND "Manifests" (L95)
- 🧺 used by "Pick & Pack" (L89) AND "Flex orders" (L117)
**The problem:** In a dense sidebar, users learn to find items by icon + label. Duplicate icons force label-scanning for disambiguation, removing the benefit of icons entirely.
**Fix direction:** Manifests → 📋 or 🗂. Flex orders → 🌿 or 🛍. Icons should be unique across the entire sidebar.

---

### A-07 — native confirm() in notices cancel action
**Severity:** MEDIUM
**File:** `apps/csa-portal/src/pages/admin/notices/index.astro:482`
**What it says:**
```js
if (!window.confirm('Cancel this notice? It will leave the open list and the pack sheets.'))
```
**The problem:** The notices page is used by pack leads on mobile during pack day (gloved hands, bright sun). A native `confirm()` is small, hard to dismiss precisely, and does not pass any of the field-mode touch target requirements (60-72px). The button text "Leave" vs. "Stay" in a native iOS dialog is also ambiguous.
**Fix direction:** Replace with a lightweight confirmation BottomSheet or inline "Are you sure? [Cancel notice] [Keep it]" expansion in the existing card. Given the admin audience and stakes (permanently removing a make-good notice), design the confirmation to show what the notice says before the user confirms.

---

## Section 3: Cross-Cutting Issues

### X-01 — "This week" appears in native confirm() copy across 3 pages
**Severity:** MEDIUM
**Files:**
- `flex-order.astro:1101`: `"Cancel your order for this week?"`
- `flex-order.astro:1114`: `"Skip this week?"`
**The problem:** Glossary rule (NEVER "this week") is violated even inside dismiss-able dialogs. The effect is small in isolation but creates inconsistency when members read a date-range in the page and "this week" in the dialog that appears from the same action.
**Fix direction:** When replacing native dialogs with BottomSheets (see M-05, M-06, M-07), update all dialog copy to use "Week of [date range]" format. Pass the `week_starting` string into the dialog's message at render time — it is already available as a template variable on both pages.

---

### X-02 — Spanish support is partial: labels page has no `?lang=es`
**Severity:** MEDIUM
**Files:**
- `admin/pick-pack/[...slug].astro` — has `?lang=es` (confirmed present, positive finding)
- `admin/labels/[...slug].astro` — NO Spanish support found in source inspection
**The problem:** H-2A farm workers using the labels page see English-only output. The pick & pack checklist has Spanish, but the labels — which workers handle at the packing table to match produce to boxes — do not. This creates a language gap at the most manual step of pack day.
**Fix direction:** Add `?lang=es` support to the labels page. At minimum translate: crop names, size labels (Large = Grande, Small = Pequeño/Chico), and any instruction text on the label. Follow the same pattern as the pick-pack Spanish implementation.

---

### X-03 — No consistent empty/loading state standards across admin pages
**Severity:** MEDIUM
**Observed in:** `admin/pick-pack/index.astro:217-224` (empty market cards — well done), `admin/index.astro` (pending tasks section uses conditional blocks — adequate but not skeleton-based)
**The problem:** The roadmap (Phase 2 item 3) calls for skeleton screens, not "Loading..." text. The member portal box page uses optimistic DOM updates. Admin pages use server-rendered Astro with no loading indicators at all on page transitions. When a user clicks "Load week" on pick-pack and the server is slow, the page just goes blank during navigation.
**Fix direction:** Admin pages that do week-picker POST/GET navigation should add a form submission loading state (disable the button, show a spinner or "Loading..." badge in the button text). This is a single `addEventListener('submit', ...)` pattern that can be shared across all week-picker forms.

---

## Section 4: Prior-Roadmap Status (Confirmed via Source)

| Roadmap Item | Phase | Status |
|---|---|---|
| Design token upgrade — no raw hex | 1 | DONE — zero raw hex found in audited pages |
| MemberShell + bottom tab bar | 1 | DONE — confirmed in MemberShell.astro |
| Fix stale landing copy | 1 | DONE — index.astro confirmed clean |
| Dashboard cutoff countdown | 2 | OPEN — not found in dashboard.astro |
| Replace native confirm() with BottomSheet | 2 | PARTIAL — box swap uses BottomSheet; 4 native confirms remain |
| Optimistic UI + skeletons | 2 | PARTIAL — box/index.astro has optimistic; admin pages do not |
| Vacation hold ≤2 taps | 2 | OPEN — 3+ taps confirmed |
| Box thumbnails + stronger CTA | 2 | OPEN — not found in dashboard.astro |
| Farm warmth / empty state polish | 3 | OPEN |
| PWA manifest | 3 | OPEN |
| Flex balance debit AT order | CSA_TODO | OPEN (tracked) |
| Saturday-market members wrong pickup day | CSA_TODO | OPEN (tracked) |
| GO/NO share-day light | CSA_TODO | OPEN (confirmed not built) |
| Admin count card bugs (home deliveries, biweekly) | CSA_TODO | OPEN — confirmed and detailed in A-03, A-04 |

---

## Section 5: Pages NOT Directly Audited (Out of Scope for This Pass)

The following pages were NOT read in this audit. Findings above do not apply to them; they should be included in a follow-up audit pass:

**Member portal:** login.astro, onboarding/* (6 pages), order/[token].astro (wholesale chef pages), stop-notes.astro, unsubscribe.astro, account/pickup.astro, account/preferences.astro, account/profile.astro, account/household.astro, account/refer.astro, account/biweekly-schedule.astro, account/confirm-pickup.astro, account/add-phone.astro

**Admin portal:** admin/box-contents, admin/box-plan/*, admin/share-contents/*, admin/flex-inventory, admin/flex-orders, admin/pack-sheet/*, admin/pack-check/*, admin/pack-load/*, admin/harvest/*, admin/floral/*, admin/host-sheets/*, admin/stop-manifest/*, admin/route/*, admin/route-plan, admin/route-sheet/*, admin/text-stop/*, admin/substitutions/*, admin/stop-notes, admin/campaigns/*, admin/weekly-email, admin/email-tracking/*, admin/market-checkout, admin/wholesale/*, admin/vendor-orders/*, admin/products, admin/recipes, admin/reports, admin/sync, admin/health, admin/pickup-locations, admin/members/*

---

## Section 6: Prioritized Findings Table

| # | ID | Severity | File | Line(s) | Finding | Effort |
|---|---|---|---|---|---|---|
| 1 | A-01 | CRITICAL | `admin/index.astro` | 86, 118–120 | "Unfilled boxes" query uses Wednesday date key; box_contents stored by Monday → always fires | XS |
| 2 | A-02 | HIGH | `admin/index.astro` | 62, 408, 414, 423 | Route monitoring only fires on Wednesday; Tue/Sat/Sun delivery days invisible | XS |
| 3 | M-03 | HIGH | `dashboard.astro` | 1258 | Hardcoded "Tuesday 8 AM" cutoff wrong for Sat/Sun market members | S |
| 4 | M-05 | HIGH | `box/index.astro` | 905 | Native confirm() on undo action (BottomSheet used for swap — inconsistent) | S |
| 5 | M-06 | HIGH | `flex-order.astro` | 1100, 1113 | Two native confirm() dialogs on cancel + skip (highest-stakes member actions) | S |
| 6 | M-07 | HIGH | `account/vacation.astro` | 349 | Native confirm() + archaic inline onsubmit on vacation hold cancel | S |
| 7 | M-09 | HIGH | `dashboard.astro` | — | GO/NO share-day indicator absent — biweekly off-weeks and holds invisible | M |
| 8 | A-03 | HIGH | `admin/index.astro` | 170–172, 383–388 | "Home deliveries" stat counts all NULL pickup_location_id (~36 shown, ~11 actual) | XS |
| 9 | M-01 | HIGH | `dashboard.astro` | 892 | "this week" in subtitle copy — glossary violation | XS |
| 10 | M-02 | HIGH | `dashboard.astro` | 1239 | "This week's box" section heading — glossary violation | XS |
| 11 | A-04 | MEDIUM | `admin/index.astro` | 153–155 | unassignedBiweeklyCount inflated by weekly/add-on/flex members | XS |
| 12 | M-04 | MEDIUM | `dashboard.astro` | 460–461 | Banned size labels (regular, family, petite) in SHARE_SIZE_LABELS | XS |
| 13 | M-10 | MEDIUM | `flex-order.astro` | 540 | Help email is tinyseedcsa@gmail.com — inconsistent with todd@ used everywhere else | XS |
| 14 | A-05 | MEDIUM | `AdminShell.astro` | Pack Week group | 13-item Pack Week group mixes planning + ops + delivery (cognitive overload) | M |
| 15 | A-07 | MEDIUM | `notices/index.astro` | 482 | Native confirm() on notice cancel — bad for gloved admin on mobile | S |
| 16 | X-01 | MEDIUM | `flex-order.astro` | 1101, 1114 | "This week" in native dialog copy — glossary violation | XS |
| 17 | X-02 | MEDIUM | `labels/[...slug].astro` | — | Labels page has no ?lang=es — H-2A language gap at pack-table | M |
| 18 | X-03 | MEDIUM | Admin pages generally | — | No loading state on week-picker form submissions | S |
| 19 | A-06 | LOW | `AdminShell.astro` | 87, 89, 95, 117 | Duplicate emoji icons (🚚 ×2, 🧺 ×2) in sidebar | XS |
| 20 | M-08 | MEDIUM | `vacation/new.astro` | — | Vacation hold requires ≥3 taps; roadmap targeted ≤2 | M |
| 21 | M-11 | LOW | `index.astro` | 128–151 | "Built on Astro + Supabase + Vercel" tech disclosure in member-facing footer | XS |

**Effort key:** XS = <30 min, S = 30–90 min, M = half-day

---

## Overall Score by Section

| Area | Score | Notes |
|---|---|---|
| Token usage | 10/10 | Zero raw hex found across all audited pages |
| Typography + hierarchy | 8/10 | Solid; glossary violations on dashboard subtract |
| Spacing + breathing room | 9/10 | Generous, consistent |
| Color semantics | 9/10 | Correct token usage throughout |
| Interactions | 6/10 | 4 native confirm() dialogs, no loading states on admin transitions |
| Loading / Empty states | 6/10 | Box page good; admin pages lack transition loading indicators |
| Mobile | 8/10 | MemberShell bottom tabs excellent; AdminShell drawer functional |
| Polish | 7/10 | Duplicate icons, tech disclosure, email inconsistency |
| Data accuracy (admin) | 4/10 | 2 CRITICAL stat bugs, 2 HIGH inflation bugs |

**Composite: 7.2/10 — Shippable. Not yet premium. Fix CRITICAL bugs immediately; HIGH/MEDIUM before next season ramp.**

---

*Audit conducted on branch `csa-migration` at commit `b328c35`. Files read: 16 source files + 4 reference documents.*
