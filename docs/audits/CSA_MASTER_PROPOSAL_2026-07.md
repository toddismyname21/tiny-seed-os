# CSA Portal — Master Improvement Proposal (2026-07-02)

Synthesizes four audits: [UX](CSA_UX_AUDIT_2026-07.md) · [Code](CSA_CODE_AUDIT_2026-07.md) · [Functionality](CSA_FUNCTIONALITY_AUDIT_2026-07.md) · [Gap Research](CSA_GAP_RESEARCH_2026-07.md)

## Headline
The portal's **ops tooling beats every commercial CSA platform**. Two problem areas:
1. **Admin home shows wrong numbers** — every count card / task badge on `/admin` is miscomputed. Todd is flying on bad instruments.
2. **No retention communication layer** — the single biggest documented ROI lever (15–25pp renewal) is entirely missing.

No CRITICAL security holes. Real security work = a 15-min dependency upgrade + one XSS escape.

---

## PHASE 0 — Correctness & Security (do first, ~1 day, low risk)
These are bugs/vulns with known one-line fixes. No design decisions needed.

| # | Fix | File | Source |
|---|-----|------|--------|
| 0.1 | Dependency upgrade chain (kills 3 HIGH CVEs + 1 MED) | `apps/csa-portal` `npm install astro@latest @astrojs/vercel@latest` | Code H1/H2/H3/M3 |
| 0.2 | Escape `r.s.name/address/detail` in route planner innerHTML (stored XSS) | `admin/route-plan/index.astro:289` | Code H4 |
| 0.3 | Webhook: skip apply when `RESEND_WEBHOOK_SECRET` unset; verify secret set in Vercel | `api/admin/campaigns/webhook.ts:90` | Code H5 |
| 0.4 | "Unfilled boxes" task queries wrong key (Wed vs Monday) — always fires | `admin/index.astro:86,118` | UX #1 |
| 0.5 | Route monitoring hardcoded to Wednesday — blind Tue/Sat/Sun | `admin/index.astro:62` | UX #2 |
| 0.6 | Home-deliveries card counts ~36, actual ~11 (NULL pickup_location incl. add-ons) | `admin/index.astro:168` | UX #4 / Func #1 |
| 0.7 | "Unassigned Week A/B" card counts all `biweekly_week IS NULL` | `admin/index.astro:153` | Func #1 |
| 0.8 | Regenerate `database.types.ts` (13 `astro check` errors, schema drift) | build | Func #3 |
| 0.9 | Remove `SOCIAL_CREDENTIALS.md` from git + gitignore | repo | Func #4 |
| 0.10 | CSV formula-injection prefix | `api/admin/reports/[name].csv.ts:50` | Code M1 |
| 0.11 | Route auto-create seeds off-week biweekly home-delivery stops (use resolveCycle) | `api/admin/route/index.ts:202` | Func #2 |

## PHASE 1 — UX Polish (quick wins, ~1–2 days)
| # | Fix | Source |
|---|-----|--------|
| 1.1 | Replace 4 native `confirm()` dialogs with BottomSheet (box undo, flex cancel/skip, vacation cancel) | UX #5 |
| 1.2 | Fix 2 "this week" glossary violations on dashboard (use date range) | UX #7 |
| 1.3 | Per-pickup-day cutoff on empty box state (Sat/Sun members have Thu 7AM, not Tue 8AM) | UX #3 |
| 1.4 | GO/NO share-day indicator on dashboard (off-week / vacation members) | UX #6 |
| 1.5 | Remove banned size labels (`regular`/`family`/`petite`) from map | UX #8 |
| 1.6 | Spanish (`?lang=es`) on labels page for H-2A workers | UX #9 |
| 1.7 | Split 13-item "Pack Week" admin nav into Box Planning / Pack Day / Delivery | UX #10 |
| 1.8 | Delete orphaned `/admin/box-plan` (superseded — `weekly_box_plan` now dead) | Func trap (a) |

## PHASE 2 — Retention Layer (highest business ROI, phased build)
Each is payment-agnostic (Shopify stays), no AI. Build in this order:

| Order | Feature | Effort | Why |
|-------|---------|--------|-----|
| 2.1 | **In-portal renewal banner** (weeks_remaining ≤4 → Shopify link) | S | Smallest effort, captures intent at peak |
| 2.2 | **Waitlist form** (`/waitlist`, no auth → Supabase table + admin view) | S | Urgency for renewal, warm pool for cancellations |
| 2.3 | **Post-pickup micro-survey** (token link in weekly email → 1–5 + text) | S | Catches bad-box churn <48h |
| 2.4 | **Renewal campaign automation** (templates + season-end trigger + Shopify deep-link) | M | 15–25pp retention lever; farms sell out in 5 days |
| 2.5 | **Win-back flow** (lapsed segment + 3–4 email sequence, Todd-triggered) | M | 5–7x cheaper than acquisition, 14.7% reactivation |
| 2.6 | **SMS reminders** (connect Twilio, opt-in already collected, pack-day trigger) | M | 5x engagement vs email; reduces silent-churn missed pickups. NOTE: Twilio "never worked" — needs setup session |
| 2.7 | **Member recipe browse page** (`/account/recipes`, surface existing admin lib) | M | Highest-click email element; reduces "what is kohlrabi" support |
| 2.8 | **Member pickup history / season summary** ("14/16 boxes" Wrapped-style) | S-M | Emotional investment → renewal |

## Explicitly OUT (validated against constraints)
ML box customization · native app · Mailchimp · SNAP/EBT · multi-producer · a-la-carte · cancel friction.

## Recommended Decision for Todd
- **Approve Phase 0 immediately** — pure bug/security fixes, no product judgment needed.
- **Approve Phase 1** — polish, low risk.
- **Phase 2 — pick the order.** My recommendation: 2.1 → 2.2 → 2.3 (three small wins this month) then 2.4 renewal automation before season-end, since that's time-sensitive to the selling window.
