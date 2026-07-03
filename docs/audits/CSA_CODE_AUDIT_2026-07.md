# CSA Portal Code Audit — 2026-07-02

**Scope:** `apps/csa-portal/src/` — API routes, lib, middleware, Astro pages, Supabase migrations, client scripts
**Stack:** Astro 6.3.1 SSR · Supabase · Vercel · TypeScript · TipTap · Resend
**Counts:** 0 CRITICAL · 5 HIGH · 4 MEDIUM · 5 LOW · 25 verified-safe

## Executive Summary
No architectural auth bypass in app code. Trust boundary correctly drawn: RLS server-side, JWT validated via `getUser()` every request, admin role live-checked from DB on every API call, money via server-side-priced SECURITY DEFINER RPCs. 0053 IDOR fixes verified present. Five HIGH items need prompt action (3 dependency CVEs, 1 stored XSS, 1 webhook gap).

## HIGH
- **H1 — Astro 6.3.1 Reflected XSS** (GHSA-8hv8-536x-4wqp, <6.3.3). `package.json:30`. Fix: upgrade Astro.
- **H2 — Astro Host-header SSRF** in prerendered error fetch (GHSA-2pvr-wf23-7pc7, <6.4.6). Fix: upgrade to 6.4.6+.
- **H3 — path-to-regexp ReDoS** every request via `@vercel/routing-utils` (GHSA-9wv6-86v2-598j). Fix: `npm update @astrojs/vercel`.
- **H4 — Stored XSS in admin route planner** — `src/pages/admin/route-plan/index.astro:289–291` interpolates `r.s.name/address/detail` (member-supplied delivery address) into `innerHTML` unescaped. Member sets malicious delivery address → fires in Todd's admin browser. Fix: `escapeHtml()` (already defined on page) around those fields; type `stops` as `RouteStop[]`.
- **H5 — Resend webhook accepts unverified events when `RESEND_WEBHOOK_SECRET` unset** — `api/admin/campaigns/webhook.ts:90–99` falls through to `applyResendEvent()`. Forged POST corrupts campaign metrics. Fix: return 200 but skip apply when secret absent; verify secret IS set in Vercel prod.

## MEDIUM
- **M1 — CSV formula injection** — `api/admin/reports/[name].csv.ts:50–58` escapes commas/quotes but not `= + - @` leading chars. Member `contact_name` = `=HYPERLINK(...)` executes on open. Fix: prefix formula chars.
- **M2 — `set:html` into textarea** — `admin/campaigns/new.astro:350` — `</textarea>` in template body_html breaks out → stored XSS. Fix: textContent assignment.
- **M3 — devalue sparse-array DoS** (GHSA-77vg-94rm-hx3p) — resolved by Astro upgrade.
- **M4 — Wholesale order token in URL, never expires** — `middleware.ts:74`, `order/[token].astro`. Add rotation endpoint + `Referrer-Policy: no-referrer`.

## LOW
- **L1 — Non-constant-time CRON_SECRET compare** — cron/flex-list-reminder.ts, cron/nightly-health.ts, sync/shopify-orders.ts. Use `crypto.timingSafeEqual`.
- **L2 — route-plan injects API error strings into innerHTML** — apply existing `escapeHtml()`.
- **L3 — tmp <0.2.6 path traversal** (build-only). Update.
- **L4 — vite fs.deny bypass (Windows dev only).** No prod action.
- **L5 — No Content-Security-Policy header.** Amplifies XSS; add permissive baseline.

## Code Quality
- Q1 — box-contents/save.ts DELETE+INSERT not atomic (acknowledged); needs RPC.
- Q2 — `any[]` cast on route-plan stops bypasses type safety feeding H4.
- Q3 — Flex debit check-then-act; daily reconciliation job is the safety net.
- Q4 — onboarding flags stored in `preferred_swaps` JSONB (documented debt).
- Q5 — cron routes export GET+POST; remove GET to avoid interactive email triggers.

## Dependency Fix Chain (one operation resolves H1/H2/H3/M3)
```bash
cd apps/csa-portal && npm install astro@latest @astrojs/vercel@latest && npm audit fix
```

## Verified-Safe (do not re-audit)
All `/api/admin/*` call `requireAdmin()`; cron/sync fail-closed; webhook svix-verified when secret set; wholesale token server-revalidated + server-priced; box-swap IDOR fixed (0053, 9/9); cookies httpOnly+secure+sameSite; JWT via `getUser()` not `getSession()`; client prices cosmetic only; CSRF `isSameOriginPost()` everywhere; no eval/Function; service_role server-only; unsubscribe HMAC-gated; box/market-checkout/wholesale-import innerHTML use escapeHtml().
