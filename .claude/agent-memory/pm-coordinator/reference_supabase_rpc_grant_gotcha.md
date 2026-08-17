---
name: supabase-rpc-grant-gotcha
description: How to correctly lock a Supabase SECURITY DEFINER RPC/function to service_role-only (or admin-only) — the anon/authenticated default-grant trap that REVOKE FROM PUBLIC does NOT fix.
metadata:
  type: reference
---

When adding a SECURITY DEFINER RPC/function to the CSA-portal Supabase DB and you want it callable ONLY by the service-role client (i.e. an admin API route that uses `supabaseAdmin` after `requireAdmin`):

**`REVOKE EXECUTE ... FROM PUBLIC` alone is NOT enough.** Supabase ships an `ALTER DEFAULT PRIVILEGES` that grants EXECUTE on every new public function to **anon AND authenticated explicitly** (not via PUBLIC). So after a bare `CREATE FUNCTION` + `REVOKE FROM PUBLIC`, `pg_proc.proacl` still shows `anon=X` and `authenticated=X` → any logged-in CSA member (or even anon) can call the RPC directly through PostgREST, bypassing the route's `requireAdmin`. This is a privilege-escalation hole (same class as the 0053 IDOR fixes).

**Correct pattern for a service_role-only function** (verified 2026-07-02 on migration 0065):
```sql
REVOKE ALL ON FUNCTION public.fn(args...) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn(args...) TO service_role;
```
Then VERIFY empirically — don't trust the SQL ran:
```sql
SELECT proname, array_to_string(proacl, E'\n') FROM pg_proc WHERE proname='fn';
-- must show ONLY: postgres=X/... and service_role=X/...  (no anon, no authenticated)
```

**Why:** I hardened 0065 with `REVOKE FROM PUBLIC` first, re-checked the ACL, and anon/authenticated were STILL present. Only `REVOKE ... FROM anon, authenticated` by name removed them.

**Apply migrations** via `set -a && source .env.csa && set +a && python3 scripts/migrate-csa/run_migration.py <file.sql>` (Supabase Management API, PAT in .env.csa). It runs arbitrary SQL and returns the final SELECT's rows — end every migration with a verify SELECT so the apply is provably persisted. Related: [[csa-portal-prod-deploy]].

**Note on RLS TABLE gates for a limited role:** an app-layer role check (e.g. switching an endpoint to `requireCrew`) is necessary but NOT sufficient when the endpoint writes via the cookie-aware RLS client — the table's RLS still evaluates and will silently drop the write. Add an ADDITIVE permissive policy keyed to a new SECURITY DEFINER helper (e.g. `is_ops_caller()` = admin/staff/crew) on ONLY the intended tables; never widen `is_admin_caller()` (it guards all member/PII tables). Pattern used for the 'crew' role on packhouse_handoff/packhouse_open_items/cooler_pallets (migration 0068).
