---
name: csa-portal-feature-backlog
description: CSA portal feature ideas Todd wants (2026-05-24) beyond the UX roadmap — Instagram photo feed, per-location member chat, weekly box+recipe email. Feasibility + decisions each needs.
metadata:
  type: project
---

**Flower CSA starts LATER than the June-10 veg CSA (Todd 2026-05-24).** Flower start date is PENDING — Todd is waiting to hear from **Loren** (the flower-side contact; a real person, NOT a CSA member — earlier "no Loren shares" confirmed). Actions taken: 20 flower-ONLY customers (flower share, no veg/flex) REMOVED from the `2026-summer-csa` Shopify segment so they DON'T get the "starts June 10" holding email. Segment now = 156 veg/flex members. TODO once Loren confirms the flower date: add `flower` to `src/lib/season.ts` SEASON_SCHEDULE (firstDelivery = flower date) + send the flower-only members a flower-specific update + re-segment them. Related: [[csa-portal-ux-initiative]] (season.ts), [[csa-staff-comms]] (segments).

---

Feature ideas Todd raised 2026-05-24 (alongside approving UX Roadmap Phase 1). All feasible; none built yet.

**1. Live Instagram photo feed** — Todd wants ALL 3 accounts (@tinyseedfarm 17841403850522716, @tinyseedfleurs 17841435193515791, @tinyseedfungi 17841464175329542).
- ⚠️ BLOCKED 2026-05-24: the saved tokens are DEAD (tested → error 190 "session invalidated / password changed"). Cannot refresh programmatically. Needs a FRESH long-lived token per account via Meta OAuth login (Meta app "Tiny Seed Farm OS FINAL", IG App ID 1829369821799880) — requires Todd's IG/FB login (~10 min, PM to walk him through). When building: ALSO add auto-refresh so tokens don't silently die again. Parked until the token step. Fits farm-warmth ([[csa-portal-ux-initiative]]).

**2. Per-pickup-location member chat / message board.**
- Spec written: `docs/specs/CSA_BY_STOP_CHAT_SPEC.md`. The per-stop RLS idiom + Supabase Realtime already exist (delivery tracking) → technically ~1-2 days; the real cost is permanent MODERATION on a 2-person farm + liability (Section 230 shields member posts, not the farm's own).
- **DECISION 2026-05-24: Todd chose the phased recommendation ("go with the recs") — build read-only "Stop Notes" (Phase 0, staff/host-authored, near-zero moderation) FIRST; open member posting (Phase 1) only if appetite is proven.** Schema is built so Phase 1 (open posting) drops in with ZERO schema change — only the RLS INSERT policy differs. Stop Notes Phase 0 built/building on csa-migration (migration 0029, `current_member_location_ids()` helper, member read-only view + AdminShell staff posting).

**3. Weekly CSA email — box contents + recipe section.**
- Feasible: the transactional-email groundwork is done (Resend SMTP + DMARC). This is the original "Day 11" weekly email.
- Dependencies: box must be planned weekly (box_contents populated); a SEND trigger (cron via Resend/pg_cron).
- RECIPE APPROACH — APPROVED by Todd 2026-05-24: a tagged recipe LIBRARY built over time. Admin can add a recipe two ways: (a) "from the internet" = paste URL + title + tag which crops it features (email links out), or (b) "from us" = write your own (title + steps) + tag crops. The weekly email reads that week's box_contents → finds recipes whose crop tags overlap → includes 1-3 (auto mix of links + farm-written). Build = recipes table + `/admin/recipes` CRUD + the weekly email that matches. MUST respect `member_preferences.newsletter_opt_in` (CAN-SPAM) + include a tokenized unsubscribe link. Send volume (~200 opted-in) vs Resend free 100/day → batch the send (Todd chose stagger, not Resend Pro). Distinct from ruled-out AI box-customization [[csa-no-ai-moat]].

**Suggested sequence (Todd to confirm):** IG feed (fast) → weekly email+recipes (high value) → per-location chat (after design pass). Related: [[csa-portal-ux-initiative]], [[csa-flex-store-credit]].
