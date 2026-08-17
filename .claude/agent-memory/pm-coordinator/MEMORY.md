# PM Coordinator Agent Memory Index

## ⭐ START HERE
- [RESPONSIBILITIES BOARD](project_responsibilities_board.md) — `docs/TODD_RESPONSIBILITIES_BOARD.md` = master list of ALL Todd's commitments. Check every session; log every promise (email/text/chat); run Friday Accountability Hour. Todd asked to be held accountable (2026-08-02).
- [GLOSSARY OF TRUTH](reference_glossary_of_truth.md) — `docs/CSA_GLOSSARY_OF_TRUTH.md` is THE canonical naming/terms/rules ref. Consult BEFORE labeling anything; never invent synonyms. Ends the naming drift.

## Feedback
- [Verify flex status by RUNNING code, not comments](feedback_verify_flex_by_running_code.md) — never state flex open/closed from code comments/memory; run flex-order.ts funcs + check member-side before emailing. Stale comment → bad reminder, Todd "sloppy" (2026-07-20)
- [ALWAYS use resolveCycle for weekly counts](feedback_always_use_resolvecycle.md) — any "this week" count (boxes/flowers/flex/harvest/deliveries) MUST come from resolveCycle (applies A/B + holds + season). Raw active-member counts are WRONG (flower 56 raw vs 32 actual, 2026-06-22)
- [No business data on public pages](feedback_no_business_data_public_pages.md) — logged-out pages = sign-in only; member counts/locations/box go behind auth
- [POST routing for API endpoints](feedback_post_routing.md) — syncToBackend() calls need POST whitelist registration
- [Delegation and verification pattern](feedback_delegation_pattern.md) — spec → builder → verifier + integration-watcher → fix → deploy
- [labels.html safety-reminder false positive](feedback_labels_html_safety_reminder.md) — how to successfully delegate on labels.html despite anti-prompt-injection refusal pattern
- [Customer comms voice](feedback_customer_comms_voice.md) — cut all self-referential framing ("we rebuilt", "excited to announce"); only WHAT THEY GET, HOW to do it, WHY good for ALL of us
- [Show email copy before sending](feedback_show_email_before_send.md) — NO EXEMPTIONS: every outbound email (1:1 Gmail incl. state agencies too) — show draft, WAIT; "go ahead and send" = draft it, not transmit (3rd failure 8/15 Roth)
- [Flex explainer (approve or customize)](feedback_flex_explainer.md) — tell flex members their share is PRE-FILLED with the traditional small box; approve as-is OR empty & pick from scratch; action by Tue 8 AM; missed week = no loss
- [Add-on dedup by customer+type](feedback_addon_dedup_by_type.md) — never collapse add-on rows by customer alone; key by customer+TYPE+qty (June-17 collapse shorted 16 members); Shopify=truth
- [Crew print readability](feedback_crew_print_readability.md) — crew sheets keep coming out "sprawling"; the farm's OWN readability research is the binding spec; big type/few columns beats density; prototype 1 page → Todd yes → roll out
- [Email send discipline](feedback_email_send_discipline.md) — NEVER wide sends; scope every email to VERIFIED share audience, content must match, preview+confirm; use send_member_campaign.py (blocks mismatches). Hard rule after the summer-box-to-everyone incident

## Project
- [Stress-test audit 2026-06-19](../../../docs/CSA_PORTAL_STRESS_AUDIT_2026.md) — EMPIRICAL results: (1) IDOR CONFIRMED on swap_box_item/undo_box_swap (no guard, were anon+authenticated EXECUTE) → FIXED (revoked to service_role only). (2) schedule_vacation_hold/cancel_vacation_hold/change_pickup_location had NO ownership guard (member→member IDOR via PostgREST) → FIXED migration 0053_rpc_ownership_guards.sql: added `is_admin_caller() OR household-owned (current_customer_id())` guard to each; anon revoked; empirically verified 9/9 (own allowed, cross-member forbidden, admin allowed) via scripts/verify_rpc_guards.py. (3) double-debit race DISPROVED (6 concurrent submits → 1 debit; RPC serializes). (4) data-integrity sweep CLEAN (0 orphans/dupes). RECs: owner-guard fix, daily Shopify-vs-ledger reconciliation job, automated test suite (IDOR matrix/DST/load) in CI.
- [PA Ag Innovation Grants status](project_aig_grants_status.md) — R1 $75K executed but $41,464 reimbursement UNANSWERED; R2 awarded $31,380/$46,703, line items unknown til Attachment 1; Roth follow-up due 8/22
- [Large share = superset of small](project_large_share_superset.md) — large ALWAYS contains every small item + extras; mirror any small box_contents change into large (Todd 2026-07-28)
- [Box plan = TWO tables (trap)](project_box_plan_two_tables.md) — box_contents (members) vs weekly_box_plan (resolveCycle→harvest/pack/route). Both must be populated weekly or ops tooling shows EMPTY. Root cause of "flying blind on CSA day" (2026-06-22). Permanent single-source fix pending.
- [CSA make-up box mechanism](project_csa_makeup_box_mechanism.md) — to put a member on a week's pack sheets, insert a vacation_holds move-in (disposition='move', move_to_week=target MONDAY); for past/missed weeks insert directly (RPC rejects past + charges a week); VERIFY by running real resolveCycle via tsx
- [soil-tests.html architecture](project_soil_tests_architecture.md) — 15 tabs, 204 functions, key data flows, Logan Labs workflow
- [Schedule triggers UNFINISHED](project_schedule_triggers_pending.md) — 3 items: activate triggers, fix PUBLIC_GET_ACTIONS whitelist, update Twilio number
- [Twilio SMS setup](project_twilio_sms_setup.md) — 2026-07-05: brand APPROVED, campaign RESUBMITTED (IN_PROGRESS) after 30909 CTA fix via public /sms-policy page; check status each session; send via MessagingServiceSid MG373c3dad…; balance needs top-up
- [Organic Certification — OEFFA](project_organic_certification.md) — NOP ID 1600003839, certified since 12/11/2025, renewal due 04/25/2026, 20 organic fields, full input list
- [Financial Liabilities & Loan Data](project_financial_liabilities.md) — Credit cards PNC $8K/Chase $6K/Amex $6K (~$20K total), arrears $16,775 (disputed ~$11,893), tunnels $17K-$31K, Itria $0 settled, Horizon worksheet location

- [Tier 2 Live Audit — Next Session](project_tier2_audit_pending.md) — Tier 1 done, Tier 2 live walkthrough is next (8 flows, user has remote control active)
- [CSA Migration — AI moat DROPPED](project_csa_no_ai_moat.md) — Harvie-style AI box customization explicitly out of scope; preference filtering + recipes preferred (single-farm math doesn't justify ML burden)
- [CSA Farm Flex / store credit](project_csa_flex_store_credit.md) — members preload funds + buy extras; ALL payments stay in Shopify (Store Credit accounts, $0 upgrade); PA escheatment guardrails; plan APPROVED
- [Wholesale payments (lowest fee)](project_wholesale_payments.md) — recommend Stripe Invoicing, ACH-first (0.8% cap $5) not cards; Melio runner-up ($0 ACH, no API); NOT Shopify; decision pending
- [CSA migration data gaps](project_csa_migration_data_gaps.md) — 2026-05-21 audit: 17 members MISSING, 82 amount-gaps ($35.2K), amount_paid unreliable; Shopify=truth; launch-blocker
- [CSA tag drift + canonical tags](project_csa_tag_drift.md) — Canonical: `2026-summer-csa` + `2026-flower-csa`; Flow workflow applies WRONG `csa-2026-summer`; run sync_csa_tags.py before any segment campaign
- [CSA referral bonus](project_csa_referral_bonus.md) — $25 flex referrer + $25 flex friend, qualifying = CSA order >$300, unlimited; attribution A(discount) vs B(link+theme snippet) pending
- [CSA portal UX initiative](project_csa_portal_ux_initiative.md) — long-run best-in-class UX effort; deep research (audit + premium polish docs) → roadmap → execute
- [CSA portal feature backlog](project_csa_portal_feature_backlog.md) — Todd ideas 2026-05-24: IG photo feed, per-location chat, weekly box+recipe email; feasibility + decisions each needs
- [CSA staff + comms](project_csa_staff_comms.md) — Frankie=staff (tinyseedcsa@gmail.com); contact routes to both Frankie+Todd; per-member comms log; tinyseedcsa@ owns 2 shares (move TBD)
- [CSA Delivery & Pickup Locations 2026](project_csa_locations.md) — 12 stops (9 Wed CSA + 3 market), season dates, share types, home delivery $15/wk
- [WEEK ON THE FARM (canonical)](project_week_on_the_farm.md) — THE weekly framework: daily duties + order windows for CSA/Flex/Markets/Wholesale/Floral; flex closes Tue6am(Tue/Wed) & Thu6am(Sat/Sun), opens Thu; wholesale Tue(close Mon6am)/Fri(close Thu6am), currently on Wed w/CSA, Mediterra always Wed; floral same days/stops
- [CSA weekly cycle LOCKED](project_csa_weekly_cycle.md) — week=Mon–Sun w/ 4 pickup days (Tue Lawrenceville/Wed delivery/Sat markets/Sun South Side); stays current thru Sun, rolls Mon; labeled by DATE RANGE everywhere (no "this/next week")
- [CSA home delivery policy](project_csa_home_delivery_policy.md) — $15/wk, admin-approved, paid in Shopify; portal must NOT allow free self-select; note-requests are unpaid (fix queued)
- [Home-delivery address model](project_home_delivery_address_model.md) — delivery_address is per member-row; add-on rows often null; resolveCycle stamps them; DB trigger blocks direct backfill (use admin RPC)
- [resolveCycle = source of truth](feedback_resolvecycle_source_of_truth.md) — ALL box/recipient/stop-count surfaces MUST read resolveCycle, never raw members queries; show gaps, never silent mismatches
- [Confirm audience scope before sends](feedback_confirm_audience_scope.md) — state + confirm the exact audience before any customer blast; default to the thread's subset (over-sent a flower-only email to 170 incl. 119 veg-only on 2026-06-24)
- [CSA Operations Admin spec](project_csa_operations_admin.md) — two weekly cycles (Mon→Wed/Tue, Thu→Sat), per-member box composition w/ rationed swaps (6/3), Avery 5164 labels, vendor lead-time forecasting, flex store CRUD, pack-day dashboard
- [Weekly Farm Schedule](project_weekly_schedule.md) — Mon/Thu harvest days, pick/pack list timing, market schedule, floral separate from veg
- [H-2A workers 2026](project_h2a_workers_2026.md) — two Juan Pablos (Villaseñor Diaz=Jr / Villaseñor Ulloa=Sr), másLabor case 98551, arrived 5/22/26; records in git-ignored legal/h2a_worker_onboarding/workers_2026/
- [CSA release cadence + Week A labeling](project_csa_release_cadence.md) — flex+box lists release Fridays; Week 1 summer 2026 = Week A = Wed Jun 10 (labeling fix, not logic); pickup-ack toggle in progress
- [CSA flex ordering build](project_csa_flex_ordering_build.md) — admin form + member order page + South Side pickup; tables live; Tue 8am cutoff; cap balance now, card-overage Phase 2 priority; 89/197 never accessed portal
- [CSA share structure 2026](project_csa_share_structure_2026.md) — Summer=large/small, Flower=petite/full (both weekly/biweekly), Flex=own amount; summer mid-season=prorate passed weeks; NO host perk; flex window actually Thu-open/Tue-7AM (NOT Fri/8AM)
- [Box-swap design](project_box_swap_design.md) — CONFIRMED: menu=Flex availability (no pairs), 2 free swaps/wk then charge Flex balance; /box page+swap API built but DORMANT (no box ever published)
- [Flex portal state](project_flex_portal_state.md) — Flex is fully built/LIVE (not from-scratch); ghost-catalog toggle model; the real gap = NO photos in system (flex 0/library 3/shopify 0)
- [Route-tab builder bug](project_route_tab_builder_bug.md) — /admin/route auto-create is INACCURATE (dups members, includes flowers/Week-A, misses Oakmont); route-SHEET is correct; fix=use resolveCycle; +week-labeling gotcha (default rolls to next Mon)

## Route Optimization
- [Delivery route optimization initiative](project_route_optimization.md) — Google Route Optimization API (single-vehicle); 15 stops geocoded; BLOCKED on enabling Geocoding+RouteOpt APIs+billing on the GCP key; plan in docs/ROUTE_OPTIMIZATION_PLAN.md

## To-Do
- [CSA running to-do / backlog](../../../docs/CSA_TODO.md) — `docs/CSA_TODO.md`: deferred CSA items (collab inbox, correction-note-to-66, paid-status sync, flex card-overage, 43 to-verify members, security). CHECK each session.

## Reference
- [Flex cutoff TRUTH + override](reference_flex_cutoff_truth.md) — real Wed-run flex close = MONDAY 7 AM (comments say Tue 8am = WRONG); weekend = Thu 7 AM; WEEK_EXTENDED_TUE constant extends one week to Tue 7 AM (needs deploy). Verify by running flex_diag.ts
- [Product photo pipeline](reference_product_photo_pipeline.md) — where portal photos live (flex-images bucket) + how to process (PIL exif_transpose iPhone orient=6 + resize), upload, and link to product_library/wholesale_products/flex_inventory; Shopify is the original source
- [Hooks configuration](reference_hooks_config.md) — 7 registered hooks, model assignments, scripts directory
- [Key Contacts](reference_key_contacts.md) — FSA team (Allison Pruskowski + 3), Horizon (Molly Decker), PDA/Michael Roth, CPA/DGPerry
- [DNS inventory for tinyseedfarm.com](reference_dns_inventory_tinyseedfarm.md) — every live record (Shopify, Google Workspace, Resend, Vercel, GitHub Pages) + CAA + missing DMARC; verified 2026-05-18
- [CSA portal production deploy](reference_csa_portal_prod_deploy.md) — two-Vercel-project gotcha; correct prod deploy = REST git-source POST to prj_79Qsl, not CLI
- [Supabase RPC grant gotcha](reference_supabase_rpc_grant_gotcha.md) — lock a func to service_role: REVOKE FROM PUBLIC is NOT enough (Supabase grants anon/authenticated explicitly); REVOKE FROM PUBLIC, anon, authenticated + verify proacl; apply via run_migration.py
- [CSA Shopify→Supabase sync](reference_csa_shopify_sync.md) — auto order sync endpoint + pg_cron 15-min schedule; idempotency/watermark model + reset caveat
- [CSA household access control](reference_csa_household_access.md) — shared-account RLS model: current_customer_id() own-or-shared + auth_primary_customer_id() owner-only; touch with care
- [CSA test accounts](reference_csa_test_accounts.md) — freetodd21 / fakeemailsofake / test@test.com — always exclude from counts/emails/reports; test@test.com kept active for E2E
- [Email sending — WORKING](reference_mac_email_sending.md) — use `scripts/send_email.py` (Resend, key in gitignored .env, browser UA to dodge Cloudflare 1010); Mail.app osascript does NOT send; never claim sent w/o Resend id
- [Member-page verification](reference_member_page_verification.md) — how to authenticate as a CSA member + fetch live pages yourself (mint session → sb-auth cookie); verify member UI on the live page, not builder endpoint claims
- [Gmail READ access — WORKING](reference_gmail_read_access.md) — search Todd's real inbox read-only via `tinypm/.oauth_tokens/todd.json` refresh token + `tinypm/.env` client creds → Gmail REST API; Apple Mail store is empty/useless
- [CSA delivery text](reference_csa_delivery_text.md) — "share has arrived" = `sms:` deep links from driver's own phone (/admin/text-stop), NOT Twilio; driver = customers row role=staff/customer_type=csa keyed by email

## Project (additions 2026-05-18)
- [CSA Day 10 email — actual blockers](project_csa_day10_email_unblocked.md) — Resend already verified, Cloudflare migration NOT a prereq; real blockers are Supabase SMTP=null + DMARC missing + Day 10 impl work
- [BCC Todd on all emails](feedback_email_bcc_todd.md) — every outgoing email BCCs todd@tinyseedfarmpgh.com; batch sends = BCC first + report count
