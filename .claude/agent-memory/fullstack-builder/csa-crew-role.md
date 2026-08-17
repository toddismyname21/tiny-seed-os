---
name: csa-crew-role
description: The limited 'crew' pack/field role — least-privilege gating, is_ops_caller additive RLS, and the RLS gotcha that blocks crew on 13 allowlisted pages.
metadata:
  type: project
---

Limited `crew` role (migration 0068) lets pack/field crew (incl. Spanish-speaking H-2A) log in and use ONLY handoff + cooler tools.

**Why:** Todd, 2026-07-03 — crew need phone access to pack-house ops, never member PII/financials/campaigns/exports.

**How to apply / key architecture:**
- Two role helpers in `src/lib/admin.ts`: `resolveAdminRole`/`requireAdmin` stay admin+staff ONLY (so every non-crew `/api/admin/*` route blocks crew unchanged). `resolveOpsRole`/`requireCrew` = admin/staff/crew, used ONLY by middleware + the handoff/cooler endpoints.
- Middleware `CREW_ALLOWED_PREFIXES` (15 page prefixes) + `CREW_HOME=/admin/handoff`. Crew on any non-allowlisted `/admin` PAGE → 303 to CREW_HOME; `/api/admin/*` is NOT redirected (endpoints self-gate with JSON 403).
- `is_admin_caller()` (0017) gates all member/PII tables and MUST stay admin/staff-only — never add crew to it. Crew write access to handoff/cooler came from a NEW additive `is_ops_caller()` (admin/staff/crew) + `*_ops` FOR ALL policies on ONLY packhouse_handoff, packhouse_open_items, cooler_pallets (all ZERO-PII). Additive, never weakening.
- customers.role had an UNNAMED inline CHECK auto-named `customers_role_check` (from 0017) — extending it needs a guarded DROP+ADD migration. Crew rows are `customer_type='employee', role='crew'` (customers requires contact_name + customer_type NOT NULL).

**GOTCHA (deliberately NOT fixed — needs a reviewed decision):** the other ~13 crew-allowlisted pages (pick-pack, labels, harvest, stop-manifest, host-sheets, share-contents, etc.) load member data via the cookie-aware RLS client and rely on admin RLS bypass. Crew is NOT `is_admin_caller`, so those pages render EMPTY for crew. Only handoff + cooler are fully crew-functional (their tables have the is_ops_caller policy + no PII). Making the rest work for crew requires service-role in those loaders OR a scoped ops-read grant — NOT a broad crew RLS grant on customers/members (would leak PII). See [[csa-packhouse-handoff]], [[csa-admin-trust-dashboard]].
