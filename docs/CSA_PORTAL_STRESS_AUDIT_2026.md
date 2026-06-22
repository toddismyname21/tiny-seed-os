# CSA Portal — Stress-Test & Resilience Audit (2026-06-19)

Applied the industry stress-testing framework (`docs/research/` companion: load/chaos/SRE/FMEA/property-based/concurrency/data-integrity/OWASP/boundary) to the live CSA portal (Astro + Supabase + Shopify + Vercel). Severity: **P0** money/data loss · **P1** customer-facing/security · **P2/P3** degraded/operational.

## ✅ RESOLVED 2026-06-19 (empirical dig)
- **IDOR on `swap_box_item` / `undo_box_swap`** — were EXECUTE-able by anon+authenticated with no internal guard. **FIXED:** EXECUTE revoked to `service_role` only (these RPCs are not called with a user JWT). Verified grant state.
- **IDOR on `schedule_vacation_hold` / `cancel_vacation_hold` / `change_pickup_location`** — SECURITY DEFINER, authenticated-callable, no internal ownership check → member→member IDOR. **FIXED:** migration `0053_rpc_ownership_guards.sql` adds an `is_admin_caller() OR household-owned (current_customer_id())` guard to each. `anon` revoked. Empirically verified 9/9 (member→own allowed, member→other `forbidden`, admin→other allowed). Member self-service + admin paths still work.
- **Double-debit P0 (#1 below) — DISPROVED empirically.** 6 simultaneous identical flex submits produced a single $3 debit + 1 ledger row; the `place_flex_order` RPC serializes the requests in practice. Severity downgraded from P0-active to theoretical edge case. Still worth the atomic-claim hardening + the reconciliation job below, but it is NOT an active money-loss bug.
- **Data-integrity sweep CLEAN** — 0 orphans/dupes across the checks run.

## 🔴 P0 — fix first
**1. Flex store-credit debit is NOT atomically idempotent (the code added 2026-06-18).** _(DISPROVED under concurrent test 2026-06-19 — see RESOLVED section; keep as hardening, not active bug.)_
`/api/account/flex-order/submit` does: read `priorNet` from `flex_transactions` → compute delta → `debitStoreCredit` (Shopify) → `insert` ledger row. This is **check-then-act**, so two windows exist:
- **Concurrent double-submit** (double-click / retry): both reads see the same `priorNet`, both debit → **double-charge.**
- **Crash/timeout between the Shopify debit and the ledger insert**: money leaves, no ledger row → a retry **re-debits.**
Real-world probability is LOW (same member, same ~2s; order window open for days) but severity is HIGH (real money). Shopify store-credit APIs have **no native idempotency** (documented), so the app-layer guard must be airtight.
**Fix options:** (a) claim an idempotency row in Postgres *before* the Shopify call (`INSERT … ON CONFLICT DO NOTHING`, confirm after); (b) a per-`(member,week)` `pg_advisory_xact_lock` around the reconcile; (c) **and regardless** — the reconciliation job below.

## 🟠 P1
**2. `swap_box_item` / `undo_box_swap` (SECURITY DEFINER) have no internal ownership check** — migration 0015 says "routes are responsible for verifying the caller owns the member." That's fine *only if* the RPC `EXECUTE` grant is not exposed to `authenticated`/`anon`. If it is, any logged-in member could swap another member's box (IDOR). **Action:** confirm `REVOKE EXECUTE … FROM authenticated` on these RPCs, or add an internal `current_customer_id()` ownership guard (the pattern `place_flex_order`/`cancel_flex_order` already use).
**3. `place_wholesale_order` uses a token-auth model** (chef tokens, nullable customer_id) — newer code; verify the token validation + that it can't be replayed/forged.
**4. No automated boundary / DST / concurrency tests.** The cutoff math IS DST-aware and `place_flex_order` caps at balance — but nothing proves it under test. Add: boundary tests at the exact cutoff second + DST transition; a concurrent-submit test asserting single debit (k6 `shared-iterations`); property tests for the ledger invariant.

## 🟡 P2 / P3
**5.** `flex-list-reminder` cron could double-email if Vercel double-fires (P3 — cosmetic).
**6.** Member order/payment-history page still absent (from the platform benchmark) — not resilience, but P1 product gap.

## ✅ Verified CLEAN
- **RLS:** every public table has RLS enabled AND at least one policy (0 exposed, 0 accidentally-locked).
- **Ledger integrity:** 27 debit rows, all `order_id`-tagged, no orphans; reconciles to the backfill.
- **Ownership on the live money RPCs:** `place_flex_order` + `cancel_flex_order` check `current_customer_id()` (household-aware), reject `forbidden`.
- **Cutoff math:** `etWallClockEpochMs` resolves the ET offset dynamically via Intl — DST-correct (EDT/EST).
- **Crons/sync:** `nightly-health` fills-nulls-only; `shopify-orders` sync uses a watermark that advances only on success.
- **Negative balance:** prevented — `debitStoreCredit` throws on insufficient; `place_flex_order` caps at balance.

## ⭐ Top recommendation (highest ROI safety net)
**Add a daily reconciliation job** (FMEA-highest-RPN + Category H): compare each member's Shopify store-credit balance against `(initial − Σdebits + Σrefunds)` from `flex_transactions`; alert on any mismatch. This catches the P0 edge case, any partial-failure drift, and manual adjustments — automatically, before a member ever notices. This is the single best guardrail given how much now flows through store credit.

## Suggested execution order
Phase 1 (before scaling): #1 (atomic debit) + #2 (swap RPC grants) + the reconciliation job.
Phase 2: #3 (wholesale token), #4 (boundary/DST/concurrency tests).
Phase 3: #5, #6.

_Framework + sources: companion research doc 2026-06-19. Method: FMEA-prioritized, OWASP-grounded, applied to the live Supabase/Shopify/Vercel stack._
