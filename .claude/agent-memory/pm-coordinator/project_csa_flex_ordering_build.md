---
name: csa-flex-ordering-build
description: Flex ordering build — admin form + member ordering page + South Side pickup; tables live; Tue 8am cutoff; cap balance now, card-overage is priority Phase 2
metadata:
  type: project
---

Building flex ordering for the CSA portal (spec: `docs/specs/FLEX_ORDERING_BUILD_SPEC.md`). Flex-share members (`members.share_type='flex'`) order from a curated weekly list, debited from **Shopify store credit**; traditional CSA gets a fixed box (no extras/swaps wks 1–2).

**Verified live (2026-06-08):** `flex_inventory` + `flex_orders` tables EXIST in prod (despite no migration file found at `supabase/migrations` — that dir doesn't exist at the portal path; schema lives elsewhere). Fulfillment already reads `flex_orders` (stop-manifest, labels, harvest, pack-sheet) — don't break those.

**Locked decisions (Todd):**
- Order cutoff = **Tuesday 8:00 AM** ET for that week's Wed delivery.
- **Phase 1: cap orders at flex balance** (block over-balance). **Phase 2 = HIGH PRIORITY: card-overage charge in Shopify (never block sale)** — it's the foundation for the future "Add Funds" flow. Do not treat as optional/later.
- South Side Market = new pickup choice for everyone (2120 Jane St, Pittsburgh 15203, Sun 10–2, May–Sept).
- **AUTO-SUBMIT at cutoff** (Todd 2026-06-08, overrides earlier explicit-submit) + pre-filled default order; "member must submit an order" reconciled as: default auto-submits if they don't act. Safe b/c Phase 1 spends prepaid balance not card. Confirm pending.
- **CSA share IS a flex item:** Small $35 / Family $45, "always an option" (recurring weekly). Box wk1 — Small: salad turnips, bok choy, 2 lettuce, cilantro, radishes, herb seedling; Family adds potatoes, dill, swiss chard.
- **20 Week-1 flex items LOADED to prod** (`flex_inventory`, week_starting 2026-06-08) via `apps/csa-portal/scripts/load_flex_inventory_week1.py` (idempotent). Coming-soon HELD: Bok Choy, Broccolini, Fennel, Radicchio, Petite Kale Mix, Something Fresh Mix. Photos to be added by Todd via admin form.

**Why:** First Wed delivery is June 10 (Week A). Flex members need a working order page; Todd loads items via the new admin form himself (name/category/unit/price/qty/photo/desc → `flex_inventory`).

**STATUS 2026-06-08: Phase 1 BUILT + DEPLOYED to prod (`tiny-seed-csa` / csa.tinyseedfarm.com).** Admin form `/admin/flex-inventory` (Todd already using it — added Spinach live), member page `/account/flex-order` (flex-gated, default Small Share pre-fill, explicit submit, live countdown, coming-soon teasers, sold-out + over-balance guards, onboarding, a11y), South Side selectable. Migrations 0036/0037 applied (coming_soon/is_featured cols, place_flex_order RPC, flex-images bucket). Gate found ONE issue: cutoff hardcoded Tue 8am — **fix in flight** (Week1 close Tue 6pm; standing Thu-open/Tue-7am-close). Builder also fixed `.vercel/project.json` (was pointing at dead `csa-portal` project). 28 flex items live for wk 2026-06-08. **NEXT: Phase 2 card-overage (HIGH PRIORITY).**

**2026-06-08 follow-ups (building):** (1) Flex ordering page was UNDISCOVERABLE — entry was a buried card on `/account/index.astro` + NOT in nav; building a top-of-dashboard CTA + MemberShell nav item for flex members (also: hub flex card linked to wallet `/account/flex` not ordering `/account/flex-order` — disambiguate). (2) **FORCE valid cell phone at sign-in** (Todd directive) — middleware gate redirects members w/ empty/invalid `customers.phone` to a required add-phone interstitial before any portal access; admins exempt; needed because arrival texts require a number. Test member set up: freetodd21@gmail.com = active flex share, role=member, $200 Shopify credit — use for flex walkthrough (magic link via Supabase admin generate_link → /account/flex-order). test@test.com also given a flex share.

**2026-06-08 P0 saga (RESOLVED, verified live by PM):** "No submit button" had TWO causes: (A) the submit `<Fragment slot="overlays">` was passed inside a `{cond && (…)}` expression → `MemberShell`'s `Astro.slots.has('overlays')` returned false → form dropped (fix: pass slot unconditionally); (B) the NEW bottom nav (`fixed bottom-0 z-40`) covered the submit bar (`fixed bottom-0 z-20`) → fix: submit bar `bottom: var(--member-bottombar-h)` + z-30, `actionBarSpace` prop on MemberShell. Also fixed: week selection `upcomingMonday()`→`currentOrderWeek()` (couldn't order on Tue/deadline day); rich red closed/before-open state w/ next-window times + mailto:tinyseedcsa@gmail.com; order cancel.
**Forced gates now LIVE (Todd directive):** phone → pickup-ack → portal. Phone gate (lib/phone.ts, /account/add-phone). Pickup-ack gate (migration 0039 `customers.pickup_acknowledged_at`, /account/confirm-pickup). Both in middleware, admins exempt, fail-soft. Verified live: no-phone→add-phone, phone-no-ack→confirm-pickup, both-set→flex-order w/ visible submit.
**KEY LESSON:** two builders claimed "submit renders" (endpoint test) but it was covered by the nav — endpoint tests are NOT enough. See [[reference_member_page_verification]] for how PM independently authenticates as a member and fetches live pages.

**How to apply:** Build order = admin form → member page → South Side → verify gate. ALWAYS independently verify member-facing UI on the LIVE authenticated page, not just endpoints/builder claims. PM specs, fullstack-builder implements (don't hand-write portal UI), verifier gates. Research basis: [[project_csa_flex_store_credit]] + `docs/research/CSA_FLEX_PRODUCT_UX_2026.md`. Deploy via correct Vercel project ([[reference_csa_portal_prod_deploy]]). Related: [[project_csa_release_cadence]], pickup-ack toggle + Allison Park→Simon's consolidation + 89-member portal-access outreach are sibling CSA tasks this session.
