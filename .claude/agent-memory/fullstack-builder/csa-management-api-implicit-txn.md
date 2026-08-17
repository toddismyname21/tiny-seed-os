---
name: csa-management-api-implicit-txn
description: The Supabase Management API SQL runner wraps each submission in one implicit transaction — a trailing ROLLBACK undoes DDL in the same submission.
metadata:
  type: project
---

The Supabase Management API `/database/query` endpoint (used by `scripts/migrate-csa/run_migration.py`) wraps the ENTIRE submitted SQL string in a single implicit transaction.

**Consequence:** if you put `CREATE/ALTER ...` (DDL) and then end the same submission with `ROLLBACK`, the DDL is rolled back too — even if the DDL statements are written "outside" any explicit BEGIN. A verification SELECT placed before the ROLLBACK will still SEE the object (it's visible inside the txn), so the apply looks successful, but the object is GONE after the request completes.
- **Why this matters:** I hit this applying `household_owner()` for CSA household sharing — wrote `CREATE OR REPLACE FUNCTION ...; BEGIN; <test>; ROLLBACK;`, the test passed, but `pg_proc` showed 0 afterward. Re-applied without the trailing ROLLBACK → persisted.
- **How to apply:**
  - To PERSIST DDL: submit it with NO ROLLBACK (end with a plain verification SELECT, or COMMIT-implied by absence of rollback). CREATE OR REPLACE makes re-applying idempotent.
  - For RLS access-control TESTS where you WANT cleanup: `BEGIN; INSERT test rows; <proof SELECT, which the runner returns>; ROLLBACK;` is correct and intended — you prove behavior inside the txn, then the rollback discards the test rows (verified: 0 rows leaked). The runner returns the LAST statement's rows, so end with the proof SELECT.
  - To simulate a JWT for SECURITY DEFINER funcs that read `auth.jwt()`: `SELECT set_config('request.jwt.claims', '{"email":"..."}', true);` then call the function. To force RLS evaluation (the API's default role bypasses RLS): `SET LOCAL ROLE authenticated;` first. See [[csa-portal-build-gotchas]] / [[csa-portal-deploy-conventions]].

**STORAGE policies via the Management API — ownership wall (hit 2026-05-24, delivery-proofs privacy fix).** The `/database/query` runner executes as the `postgres` role. `storage.objects` is owned by `supabase_storage_admin`, and `postgres` is NOT a member of it (`pg_has_role(... 'MEMBER') = false`); `GRANT supabase_storage_admin TO postgres` is rejected ("role memberships are reserved, only superusers can grant them"). So you CANNOT `SET ROLE supabase_storage_admin` to manage storage RLS this way.
- **What works as postgres anyway:** `UPDATE storage.buckets SET public = ...` (the buckets table, not objects) — applies + persists fine. `DROP POLICY [IF EXISTS] ... ON storage.objects` — works. `CREATE POLICY ... ON storage.objects` — ALSO works, but only when submitted as its OWN standalone statement; bundling `DROP` + `CREATE` in one BEGIN/COMMIT submission tripped a transient `42501 must be owner of relation objects` that rolled back the whole submission (incl. the DROP). So: apply storage-policy changes as SEPARATE per-statement submissions (DROP, then CREATE), or run the policy DDL in the Supabase Studio SQL editor (privileged). Verify the official way: `GET api.supabase.com/v1/projects/{ref}/storage/buckets` reports `public`, and `SELECT polname,... FROM pg_policy WHERE polrelid='storage.objects'::regclass` lists policies.
- **delivery-proofs end state (migration 0025):** bucket `public=false`; policies = `delivery_proofs_admin_write` (FOR ALL, is_admin_caller) + `delivery_proofs_member_read` (FOR SELECT, scopes a member to objects whose path `{route_date}/{stop_id}.{ext}` embeds a stop they own). Photos display via short-lived signed URLs minted server-side with supabaseAdmin (service role bypasses storage RLS) AFTER an admin check / RLS-scoped stop read — see `src/lib/delivery-proof.ts signProofUrl()`.
