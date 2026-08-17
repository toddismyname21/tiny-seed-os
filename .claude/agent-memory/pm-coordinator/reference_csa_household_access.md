---
name: csa-household-access
description: CSA portal household-sharing access-control model — how current_customer_id() resolves, the owner-only helper, and the v1 one-email-one-account rule. Touch with care; it gates who-sees-what.
metadata:
  type: reference
---

Household sharing (built 2026-05-23): a primary CSA member can invite a partner/roommate by email to share full access to their account.

**Access-control model (Supabase RLS) — do NOT break:**
- `account_members` table: {owner_customer_id → customers, member_email citext, status 'active'|'removed', UNIQUE(owner,email)}.
- `current_customer_id()` (used by EVERY member-facing RLS policy) now resolves with COALESCE: (1) own customers row by `auth.jwt()->>'email'` FIRST, else (2) the `owner_customer_id` of an active `account_members` row for that email. So an invited person's session resolves to the OWNER's account → full shared access. Own-account always wins (additive change; existing members unaffected).
- `auth_primary_customer_id()` = DIRECT email→customers match, NO household fallback. Used for OWNER-ONLY checks (only the primary can add/remove household members). Critical: do NOT use current_customer_id() for owner-only checks — an invited member's current_customer_id() equals the owner's id and would wrongly pass.
- account_members RLS: SELECT = owner_customer_id = current_customer_id() (both primary + invited see the list); INSERT/UPDATE/DELETE = owner_customer_id = auth_primary_customer_id() (primary only); + admin bypass via is_admin_caller().

**v1 rules:** inviting an email that's already a primary `customers` member is BLOCKED (one email = one account; prevents dual-identity — though resolution is deterministic anyway since own-account wins). Invited members get full management EXCEPT managing the household list. Invite sends a best-effort (fail-soft) Resend email; the invited person just logs in at /login with their email (magic link auto-creates their auth user; current_customer_id resolves them to the shared account).

**UI:** `/account/household` (primary sees invite/remove; invited sees read-only list). API `/api/account/household` (invite|remove). Verify access control independently (simulate JWT email claims) before any production deploy. Related: [[csa-portal-prod-deploy]].
