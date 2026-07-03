# CSA Gap Research — Tiny Seed Farm (2026-07-02)

**Researcher:** RESEARCH_CLAUDE · Builds on `CSA_INDUSTRY_RESEARCH.md`, `CSA_IMPROVEMENT_ROADMAP.md`, `CSA_PORTAL_UX_ROADMAP_2026.md`

## Executive Summary
- Portal is ahead of all commercial CSA platforms on **ops tooling** (pack-day, pick-pack, route, labels, wholesale, flex) but lags on the **member-retention communication layer** — the exact layer that drives 70–85% vs 50–60% renewal.
- Harvie's 2024 closure settled the AI-customization question: migration went to Local Line (no AI). Preference-filtered swaps without ML are now the standard; we already have the schema.
- Three highest-value gaps: (1) connected SMS reminders, (2) renewal/early-bird automation with Shopify deep-link, (3) win-back flow for lapsed members. All medium-effort, payment-agnostic.
- Recipe integration is a market-wide gap nobody has filled; our recipe library + crop-matching already exist in admin — the gap is a member-facing browse page.

## Retention Research (published evidence)
- **Customization paradox (2024 PMC peer-reviewed):** box customization has *no statistically significant effect* on retention. Validates dropping Harvie-style ML. What matters: convenience, quality, farm-member interaction.
- **Communication tier:** consistent weekly email + early renewal → 70–85% retention; without → 50–60%. Single biggest documented lever (15–25pp).
- **Recipe emails** drive the highest click rate of any weekly-email element; clickers renew more.
- **SMS for agriculture:** 18–28% response; time-sensitive SMS = 5x email engagement; email+SMS = +10% rev @30d, +21% @60–90d.
- **Skip/pause:** 27% cite inability to pause as top cancel reason; surfacing pause in cancel flow saves 35–50%.
- **Win-back:** lapsed members 5–7x cheaper to reactivate; 30–90 day window; 4-email sequence → 14.7% reactivation.
- **Early-bird renewal:** farms sell out next season in 5 days via 30/14/7/0-day sequences with prior-year pricing lock.
- **NPS:** highest-signal churn predictor; closing loop with detractors <48h prevents 60–70% of those churns.

## Gap List (ranked by value/effort)
| # | Gap | Value | Effort | Have? |
|---|-----|-------|--------|-------|
| 1 | SMS pickup/cutoff reminders (connect Twilio) | HIGH | M | schema yes, never connected |
| 2 | Renewal campaign automation + Shopify deep-link | HIGH | M | campaign system yes, no renewal logic |
| 3 | Win-back flow for lapsed members | HIGH | M | churn report yes, no outreach |
| 4 | Waitlist form (no auth) | HIGH acq | S | none |
| 5 | In-portal renewal banner (weeks_remaining ≤4) | MED-HIGH | S | none |
| 6 | Post-pickup micro-survey | MED | S | none |
| 7 | Member recipe browse page | MED | M | admin lib exists, not surfaced |
| 8 | Member pickup history / season summary | MED | S-M | pickup_attendance exists |
| 9 | Gift share flow (Shopify link) | MED | M | referral page exists |
| 10 | Admin retention/cohort dashboard | MED | M-L | basic churn report only |
| 11 | PWA / add-to-home-screen | MED-LOW | M | none (roadmap Phase 3) |
| 12 | Preference rating UI (5-scale/crop) | LOW | L | dislikes/allergies only |

## Anti-Recommendations (do NOT copy)
1. **Harvie-style ML customization** — peer-reviewed: no retention effect; Harvie dead.
2. **Native mobile app** — unjustifiable maintenance for 2-person team; PWA = 90% of benefit.
3. **Mailchimp/3rd-party email** — duplicates our working campaign system.
4. **SNAP/EBT** — wrong phase, high regulatory complexity.
5. **Multi-producer food hub** — wrong business model (single farm).
6. **A-la-carte replacing CSA** — trains members to skip; flex store-credit is the right middle ground.
7. **Cancellation friction / dark patterns** — short-term saves, long-term reputation damage.
8. **Aggressive push cadence** — highest-churn mobile pattern; max 1/week when PWA push exists.

_Full sources archived in the 2026-07-02 research session; see conversation record._
